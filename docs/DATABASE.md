# Database Schema — Nowly v2

This document contains the complete database schema and guidelines for Supabase/PostgreSQL.

## Core Tables

### profiles

User profile data synced from Supabase Auth.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### workspaces

User's workspace containers (e.g., "Personal", "Work").

```sql
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Generate next recurring task instance

```sql
CREATE OR REPLACE FUNCTION generate_next_recurring_instance()
RETURNS TRIGGER AS $$
DECLARE
  template recurring_tasks%ROWTYPE;
  next_date DATE;
BEGIN
  -- Only trigger when task is completed
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE AND NEW.recurring_task_id IS NOT NULL THEN
    SELECT * INTO template FROM recurring_tasks WHERE id = NEW.recurring_task_id;
    
    IF template.is_active AND NOT template.is_paused THEN
      -- Calculate next date based on recurrence type
      CASE template.recurrence_type
        WHEN 'interval_from_completion' THEN
          next_date := CURRENT_DATE + template.interval_days;
        WHEN 'fixed_daily' THEN
          next_date := template.next_due_date + template.interval_days;
        -- Add other recurrence type calculations
      END CASE;
      
      -- Check if within end_date bounds
      IF template.end_date IS NULL OR next_date <= template.end_date THEN
        -- Create new task instance
        INSERT INTO tasks (
          user_id, workspace_id, category_id, recurring_task_id,
          title, description, priority, scheduled_date
        ) VALUES (
          template.user_id, template.workspace_id, template.category_id, template.id,
          template.title, template.description, template.priority, next_date
        );
        
        -- Update template's next_due_date
        UPDATE recurring_tasks 
        SET next_due_date = next_date, occurrences_generated = occurrences_generated + 1
        WHERE id = template.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION generate_next_recurring_instance();
```

## Type Generation

Generate TypeScript types from database:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

Then create a helper type file:

```typescript
// src/types/supabase.ts
import type { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Task = Tables<'tasks'>;
export type Workspace = Tables<'workspaces'>;
// etc.
```
