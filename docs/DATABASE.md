# Database Schema — Nowly v2

This document describes the database schema and the rules for changing it. The database is Postgres on Neon. Auth is Neon Auth (Managed Better Auth), and the app reads and writes data through the Neon Data API, where RLS policies keyed on `auth.uid()` decide which rows each user can reach.

## Migrations

The schema lives in [`neon/migrations/`](../neon/migrations/README.md), applied in filename order. That README explains how to apply them and how the set differs from the old Supabase files. The files in `supabase/migrations/` are historical: they describe the old Supabase project and are never applied again.

**Production changes only through migrations committed to this repo. Never edit production by hand** (no SQL editor fixes, no console tweaks to functions, policies or grants). That is how the Supabase production database drifted from the repo: migration `0014` was never applied, and `update_updated_at` was hand-edited in a way no migration recorded. To change the schema, add a new migration file, apply it to a disposable Neon branch first, then apply the same file to production.

Grants are explicit too. The Data API was enabled without default grants, so `authenticated` gets only what `20240101000015_neon_grants_and_ensure_account.sql` grants (usage on `public`, and select/insert/update/delete on the app tables), and `anonymous` gets nothing. A new table needs its own grant in its migration, or the Data API can't see it.

## Core Tables

The five user foreign keys (`profiles.id`, `workspaces.user_id`, `recurring_tasks.user_id`, `tasks.user_id`, `user_onboarding.user_id`) reference `neon_auth."user"(id)`, the table Neon Auth manages, with `ON DELETE CASCADE`. Categories reach the user through `workspace_id`.

### profiles

User profile data, created by `ensure_account()` from the Neon Auth user.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Account setup: `ensure_account()`

There is no signup trigger. Neon Auth owns `neon_auth."user"`, so the app sets up a new account itself: the protected layout (`src/app/(protected)/layout.tsx`) calls the `ensure_account()` RPC on every visit. It is defined in `neon/migrations/20240101000015_neon_grants_and_ensure_account.sql`.

- `SECURITY DEFINER` with `search_path = public`, no arguments. The caller is always `auth.uid()`; it raises an error if that is null, or if the caller has no `neon_auth."user"` row. Only `authenticated` can execute it.
- It reads the caller's `name`, `email` and `image` from `neon_auth."user"`.
- If a profile already exists it does nothing and returns `FALSE`. Otherwise, in one transaction, it creates the profile, a "Default" workspace (`#6366f1`, 📋, position 0), the Personal, Work and Home categories, a `user_onboarding` row and two sample tasks for today, and returns `TRUE`.
- The profile insert uses `ON CONFLICT DO NOTHING`, so repeated or simultaneous calls create nothing extra.

The old Supabase `handle_new_user()` function and its `on_auth_user_created` trigger on `auth.users` no longer exist.

### workspaces

User's workspace containers (e.g., "Personal", "Work").

**Important:** Users must always have at least one workspace. This constraint should be enforced at the application level (UI/API), not the database level, to allow proper CASCADE deletion when a user is deleted from Neon Auth.

```sql
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspaces_user_id ON public.workspaces(user_id);
```

### categories

Categories within workspaces for organizing tasks.

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_workspace_id ON public.categories(workspace_id);
```

### tasks

Main task table with self-reference for subtasks.

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurring_task_id UUID REFERENCES public.recurring_tasks(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,

  -- Date fields (critical distinction!)
  scheduled_date DATE,          -- When to work on it
  due_date DATE,                -- Hard deadline

  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),
  position INTEGER DEFAULT 0,

  -- For recurring task instances
  is_detached BOOLEAN DEFAULT FALSE,  -- True if modified from template

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_workspace_scheduled ON public.tasks(workspace_id, scheduled_date);
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_recurring ON public.tasks(recurring_task_id);

-- Partial index for incomplete tasks (common query pattern)
CREATE INDEX idx_tasks_incomplete_scheduled
  ON public.tasks(user_id, scheduled_date)
  WHERE is_completed = FALSE;
```

### recurring_tasks

Master templates for recurring task generation.

```sql
CREATE TABLE public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,

  -- Recurrence configuration
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN (
    'interval_from_completion',  -- Every N days from when completed
    'fixed_daily',               -- Every N days from start_date
    'fixed_weekly',              -- Specific days of week
    'fixed_monthly'              -- Specific day of month
  )),

  interval_days INTEGER,          -- For interval/daily types
  days_of_week INTEGER[],         -- [1,3,5] = Mon/Wed/Fri (1=Monday)
  day_of_month INTEGER,           -- 1-31 for monthly

  start_date DATE NOT NULL,
  end_date DATE,                  -- NULL = no end
  next_due_date DATE NOT NULL,    -- When next instance should be created

  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,

  occurrences_generated INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_tasks_user ON public.recurring_tasks(user_id);
CREATE INDEX idx_recurring_tasks_next_due ON public.recurring_tasks(next_due_date)
  WHERE is_active = TRUE AND is_paused = FALSE;
```

## Row Level Security (RLS) Policies

**Always wrap auth.uid() in SELECT for performance:**

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Workspaces: Users can CRUD their own workspaces
CREATE POLICY "Users can manage own workspaces"
  ON public.workspaces FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Categories: Access through workspace ownership
CREATE POLICY "Users can manage categories in own workspaces"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Tasks: Users can CRUD their own tasks
CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Recurring Tasks: Users can CRUD their own recurring tasks
CREATE POLICY "Users can manage own recurring tasks"
  ON public.recurring_tasks FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

## Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Generate next recurring task instance

This trigger automatically generates the next task instance when a recurring task is completed.

**Supported recurrence types:**

| Type                       | Description                          | Key Fields Used                                                    |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `interval_from_completion` | N days after task completion         | `interval_days`                                                    |
| `fixed_daily`              | Every N days from last due date      | `interval_days`                                                    |
| `fixed_weekly`             | Every X weeks on specific weekday(s) | `interval_weeks`, `days_of_week`                                   |
| `fixed_monthly`            | Every X months on day or Nth weekday | `interval_months`, `day_of_month`, `week_of_month`, `days_of_week` |
| `fixed_yearly`             | Same month/day every year            | `month_of_year`, `day_of_month`                                    |

```sql
CREATE OR REPLACE FUNCTION public.generate_next_recurring_instance()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template public.recurring_tasks%ROWTYPE;
  next_date DATE;
  -- Additional variables for weekly/monthly calculations
  target_dow INTEGER;
  week_interval INTEGER;
  month_interval INTEGER;
  target_week INTEGER;
  first_of_month DATE;
  temp_date DATE;
  adjusted_dow INTEGER;
  occurrence_count INTEGER;
BEGIN
  -- Only trigger when task is completed (not when uncompleting)
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.recurring_task_id IS NOT NULL THEN
    SELECT * INTO template FROM public.recurring_tasks WHERE id = NEW.recurring_task_id;

    IF FOUND AND template.is_active AND NOT template.is_paused THEN
      -- Calculate next date based on recurrence type
      CASE template.recurrence_type
        WHEN 'interval_from_completion' THEN
          next_date := CURRENT_DATE + COALESCE(template.interval_days, 1);

        WHEN 'fixed_daily' THEN
          next_date := template.next_due_date + COALESCE(template.interval_days, 1);

        WHEN 'fixed_weekly' THEN
          -- Complex logic to find next occurrence based on days_of_week and interval_weeks
          -- See public.calculate_next_recurrence() in migration
          -- 20240101000013_recurring_catchup.sql for full implementation

        WHEN 'fixed_monthly' THEN
          -- Handles both specific day (e.g., "15th") and Nth weekday (e.g., "2nd Monday")
          -- See public.calculate_next_recurrence() in migration
          -- 20240101000013_recurring_catchup.sql for full implementation

        WHEN 'fixed_yearly' THEN
          next_date := template.next_due_date + INTERVAL '1 year';

        ELSE
          -- IMPORTANT: Always include ELSE to prevent "case not found" error
          next_date := template.next_due_date + COALESCE(template.interval_days, 1);
      END CASE;

      -- Only create if within end_date bounds
      IF next_date IS NOT NULL AND (template.end_date IS NULL OR next_date <= template.end_date) THEN
        INSERT INTO public.tasks (
          user_id, workspace_id, category_id, recurring_task_id,
          title, description, priority, scheduled_date
        ) VALUES (
          template.user_id, template.workspace_id, template.category_id, template.id,
          template.title, template.description, template.priority, next_date
        );

        UPDATE public.recurring_tasks
        SET next_due_date = next_date, occurrences_generated = occurrences_generated + 1
        WHERE id = template.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.generate_next_recurring_instance();
```

> **Note:** The full implementation is in
> `neon/migrations/20240101000013_recurring_catchup.sql`, plus an
> `ELSIF` branch added in `20240101000014_recurring_undo_retraction.sql` for
> the `TRUE -> FALSE` transition (see below). The per-type date math lives in
> the helper `public.calculate_next_recurrence(template, from_date)`; the
> trigger calls it in a loop.

### Catch-up rule for overdue tasks

The trigger does **not** generate one instance per missed period. It advances the
schedule until the next occurrence is strictly after `CURRENT_DATE`, so missed
occurrences are skipped and completing an overdue recurring task always clears it
in a single click.

This matters because the Today view queries `scheduled_date <= today` (see
`useTodayTasks` in `src/hooks/useTasks.ts`). Generating a past-dated instance would
make a completed task reappear immediately. If the loop cannot find a future date
(a malformed template that stops advancing, or one absurdly far overdue), it
generates nothing and emits a `RAISE WARNING` rather than creating a permanently
overdue task.

`interval_from_completion` skips the loop entirely — it is already relative to
`CURRENT_DATE`.

### Retraction on undo

Un-completing a recurring task's instance (`TRUE -> FALSE`) retracts the
instance that its completion generated, so re-completing it afterward
produces exactly one future instance instead of two, and
`occurrences_generated` nets a single increment for the cycle rather than
two.

The generated instance is found structurally, not via a stored link: a
template has exactly one active (uncompleted) instance at a time, and that
instance's `scheduled_date` always equals `recurring_tasks.next_due_date`.
If a row matching that — uncompleted, not `is_detached`, on the current
cursor — can't be found, the undo does nothing: it never deletes or alters
an instance it can't prove is the untouched auto-generated one (in
particular, an `is_detached` instance is never touched). See
`neon/migrations/20240101000014_recurring_undo_retraction.sql`.

## Application-Level Constraints

### Workspace Deletion

Users must always have at least one workspace. This constraint should be enforced in the application layer:

**Frontend validation:**

- Disable the delete button when `workspaceCount === 1`
- Show tooltip: "Cannot delete last workspace"

**Backend validation (Server Actions/API):**

```typescript
// Before deleting workspace
const { count } = await supabase
  .from('workspaces')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);

if (count <= 1) {
  throw new Error('Cannot delete last workspace');
}
```

**Why not a database trigger?**
Database triggers that prevent deletion of the last workspace would block the CASCADE deletion that runs when a user is deleted from `neon_auth."user"`, making it impossible to delete users from Neon Auth.

## Onboarding Tables

### user_onboarding

Tracks onboarding state and dismissed tooltips per user.

```sql
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,

  -- Tour completion
  tour_completed BOOLEAN DEFAULT FALSE,
  tour_completed_at TIMESTAMPTZ,

  -- Dismissed contextual tooltips (array of tooltip type strings)
  dismissed_tooltips TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user
  CONSTRAINT user_onboarding_user_id_unique UNIQUE (user_id)
);

CREATE INDEX idx_user_onboarding_user_id ON public.user_onboarding(user_id);
```

**RLS Policies:**

```sql
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can only access their own onboarding record
CREATE POLICY "Users can manage own onboarding"
  ON public.user_onboarding FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

**Dismissed Tooltips (TooltipType enum):**

| Value                       | Description                             |
| --------------------------- | --------------------------------------- |
| `reschedule_button`         | Quick reschedule button on task items   |
| `task_completion_undo`      | Undo tip shown on first task completion |
| `task_dialog_scheduled_due` | Scheduled vs due date explanation       |

**Note:** `ensure_account()` creates the `user_onboarding` row when it sets up a new account. Accounts imported from Supabase may not have one, so the app still creates the row on first tour interaction when it is missing.

---

## Type Generation

Generate TypeScript types from the database (needs a direct Neon connection string, local only):

```bash
NEON_DATABASE_URL=... npm run db:types
```

This writes `src/types/database.ts`. Don't hand-edit it. Helper row types such as `Task` and `Workspace` live in `src/types/supabase.ts`:

```typescript
import type { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Task = Tables<'tasks'>;
export type Workspace = Tables<'workspaces'>;
// etc.
```
