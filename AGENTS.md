# AGENTS.md — Nowly v2

> This file provides guidance to AI coding agents (Claude Code, Cursor, Antigravity, etc.) when working with this repository.

## Project Overview

**Nowly v2** is a modern task management app built with:

- Next.js 16 (App Router)
- Supabase (PostgreSQL + Auth)
- TypeScript (strict mode)
- shadcn/ui + Tailwind CSS
- TanStack Query + Supabase Cache Helpers (server state)
- Zustand (client UI state)

**Key architectural decisions:**

- Scheduled date vs due date distinction (Amazing Marvin pattern)
- Master template + generated instances for recurring tasks
- Feature-based folder structure with direct imports (no barrel files)
- Zod schemas as single source of truth for types
- Custom auth forms with Server Actions (not deprecated auth-ui-react)

## Quick Reference

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth routes (login, signup, privacy, terms)
│   ├── (protected)/        # Protected routes (requires authentication)
│   └── auth/callback/      # OAuth callback handler
├── proxy.ts                # Route protection middleware (Next.js 16 convention)
├── components/
│   ├── ui/                 # shadcn primitives (do not edit)
│   └── features/           # Feature components (tasks/, sidebar/, etc.)
├── lib/
│   ├── supabase/           # Supabase clients (server.ts, client.ts, middleware.ts)
│   ├── errors/             # Error handlers (Sentry integration)
│   └── utils.ts            # Utility functions
├── schemas/                # Zod schemas (source of truth)
├── types/                  # Generated TypeScript types
├── hooks/                  # Custom React hooks
└── stores/                 # Zustand stores
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server (after build)
npm run typecheck    # TypeScript check (run before commits)
npm run lint         # ESLint
npm run test         # Run tests
npm run format       # Format code with Prettier
npm run format:check # Check code formatting (CI/lint step)
npm run db:types     # Generate Supabase types
```

## Critical Rules

### 1. Imports — No Barrel Files

```typescript
// ✅ CORRECT: Direct imports
import { TaskCard } from '@/components/features/tasks/TaskCard';
import { taskSchema } from '@/schemas/task';

// ❌ WRONG: Barrel imports (causes 75% slower builds)
import { TaskCard } from '@/components/features/tasks';
```

### 2. Types — Zod as Source of Truth

```typescript
// ✅ CORRECT: Derive types from Zod schemas
// schemas/task.ts
export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(100),
  scheduled_date: z.string().date().nullable(),
  due_date: z.string().date().nullable(),
  priority: z.number().int().min(0).max(3),
  is_completed: z.boolean().default(false),
});
export type Task = z.infer<typeof taskSchema>;

// ❌ WRONG: Separate interface definitions
interface Task { ... }
```

### 3. Auth — Always Use getUser(), Never getSession()

```typescript
// ✅ CORRECT: Validates JWT with Supabase Auth server
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect('/login');

// ❌ WRONG: Reads from cookies (can be spoofed)
const {
  data: { session },
} = await supabase.auth.getSession();
```

### 4. Dates — Scheduled vs Due Date

- `scheduled_date`: When user plans to work on task (calendar icon)
- `due_date`: Hard deadline (flag/warning icon, red when overdue)
- Never use due dates for artificial deadlines

### 5. Recurring Tasks — Template + Instances

- `recurring_tasks` table stores master templates with recurrence rules
- `tasks` table stores generated instances with `recurring_task_id` reference
- `is_detached` boolean allows individual instance modifications
- Generate instances on-demand or via daily cron, never infinite future tasks

### 6. Onboarding System — Handle With Care ⚠️

The onboarding system guides new users through the app using Driver.js tours and contextual tooltips. **Changes to navigation elements, sidebar items, or element IDs can break the onboarding flow.**

**Before modifying these files, ASK THE USER:**

```
src/lib/onboarding/tour-steps.ts    # Tour step definitions with element selectors
src/lib/onboarding/tour-config.ts   # Sidebar element selectors list
src/components/app-sidebar.tsx      # Contains element IDs used by tour
src/components/features/tasks/QuickAddTask.tsx  # Has #quick-add-task ID
```

**Critical element IDs used by the tour:**

| Element ID                    | File             | Tour Step  |
| ----------------------------- | ---------------- | ---------- |
| `#sidebar-workspace-selector` | app-sidebar.tsx  | Workspaces |
| `#quick-add-task`             | QuickAddTask.tsx | Quick Add  |
| `[href="/today"]`             | app-sidebar.tsx  | Today View |
| `[href="/backlog"]`           | app-sidebar.tsx  | Backlog    |
| `[href="/recurring"]`         | app-sidebar.tsx  | Recurring  |

**If you need to:**

- **Add a new navigation item**: Consider if it needs a tour step
- **Rename/move a route**: Update the selector in `tour-steps.ts`
- **Remove an element**: Remove or update the corresponding tour step
- **Change an element ID**: Update `SIDEBAR_SELECTORS` in `tour-config.ts`

**Onboarding file structure:**

```
src/
├── lib/onboarding/
│   ├── tour-config.ts      # Driver.js config, sidebar selectors, isMobile()
│   └── tour-steps.ts       # All tour step definitions (desktop + mobile)
├── components/features/onboarding/
│   ├── OnboardingTour.tsx      # Main tour component (auto-starts for new users)
│   ├── ContextualTooltip.tsx   # One-time educational tooltips
│   ├── CelebrationOverlay.tsx  # Fireworks on tour completion
│   └── ReplayTourButton.tsx    # Manual tour replay (dev only)
├── hooks/
│   └── useOnboarding.ts    # Hook for tour state, tooltip dismissal
├── types/
│   └── onboarding.ts       # TooltipType enum, OnboardingState type
└── styles/
    └── onboarding-tour.css # Custom Driver.js styles
```

See [`src/lib/onboarding/README.md`](src/lib/onboarding/README.md) for detailed onboarding documentation.

### 7. Route Protection & Security

**Defense-in-depth architecture:** Route protection uses two layers:

1. **`src/proxy.ts`** — Next.js 16 proxy (middleware) for optimistic redirects
2. **`src/app/(protected)/layout.tsx`** — Server-side auth check as primary security layer

```typescript
// ✅ CORRECT: Protected layout validates JWT server-side
// src/app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

**Route configuration in `src/proxy.ts`:**

| Route Type | Routes                                                                            | Behavior                                      |
| ---------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| Public     | `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/auth/callback`                  | No auth required                              |
| Auth       | `/login`, `/signup`                                                               | Redirect to `/today` if already authenticated |
| Protected  | `/today`, `/daily`, `/weekly`, `/all-tasks`, `/backlog`, `/recurring`, `/account` | Redirect to `/login` if not authenticated     |

**When adding new routes:**

- **New protected route**: Add prefix to `protectedPrefixes` array in `proxy.ts`
- **New public route**: Add to `publicRoutes` array in `proxy.ts`
- **Protected routes** must be under `src/app/(protected)/` to inherit the layout auth check

**GDPR compliance:**

- Only send `user.id` to Sentry, never email or other PII
- See Sentry section below for correct pattern

### 8. Error Handling — Sentry Integration

**When to use error handlers:**

```typescript
// ✅ CORRECT: Use handleSupabaseError for database operations
import { handleSupabaseError } from '@/lib/errors/supabase-error-handler';

const { data, error } = await supabase.from('tasks').select('*');
if (error) {
  handleSupabaseError(error, {
    table: 'tasks',
    operation: 'select',
    userId: user.id,
    source: 'useTasks',
  });
  throw error; // Re-throw for UI error handling
}

// ✅ CORRECT: Use handleAuthError for authentication
import {
  handleAuthError,
  getAuthErrorMessage,
} from '@/lib/errors/auth-error-handler';

const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  handleAuthError(error, {
    operation: 'signIn',
    provider: 'email',
    source: 'LoginForm',
  });
  toast.error(getAuthErrorMessage(error)); // User-friendly message
  return;
}

// ❌ WRONG: Don't use console.error or ignore errors
const { data, error } = await supabase.from('tasks').insert(task);
if (error) console.error(error); // Won't be tracked in production
```

**Add breadcrumbs for user actions:**

```typescript
import * as Sentry from '@sentry/nextjs';

// ✅ CORRECT: Add breadcrumbs before critical operations
async function createTask(taskData: TaskInput) {
  Sentry.addBreadcrumb({
    category: 'task',
    message: 'Creating new task',
    level: 'info',
    data: {
      workspace_id: taskData.workspace_id,
      category_id: taskData.category_id,
      // Don't include PII like task title
    },
  });

  const { data, error } = await supabase.from('tasks').insert(taskData);
  // ... error handling
}

// ✅ CORRECT: Track user interactions
function handleWorkspaceSwitch(workspaceId: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: 'Switched workspace',
    level: 'info',
    data: { workspace_id: workspaceId },
  });
}
```

**Monitor critical operations with transactions:**

```typescript
import * as Sentry from '@sentry/nextjs';

// ✅ CORRECT: Use transactions for complex operations
async function completeRecurringTask(taskId: string) {
  return await Sentry.startSpan(
    {
      op: 'task.complete_recurring',
      name: 'Complete Recurring Task',
      attributes: { task_id: taskId },
    },
    async () => {
      // Mark current instance complete
      const { error: completeError } = await supabase
        .from('tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (completeError) {
        handleSupabaseError(completeError, {
          table: 'tasks',
          operation: 'update',
          source: 'completeRecurringTask',
        });
        throw completeError;
      }

      // Generate next instance
      const { error: generateError } = await generateNextInstance(taskId);
      if (generateError) throw generateError;

      return { success: true };
    }
  );
}
```

**Key principles:**

- **Always** call error handlers (don't just log)
- **Always** provide context (table, operation, source)
- **Never** include sensitive data in breadcrumbs (passwords, tokens, full task content)
- Use breadcrumbs for user actions that might help debug errors
- Use transactions for multi-step operations to measure performance
- Error handlers only send to Sentry in production (safe to use everywhere)

**GDPR compliance — Sentry user context:**

```typescript
// ✅ CORRECT: Only send user ID (GDPR compliant)
Sentry.setUser({ id: user.id });

// ❌ WRONG: Never send email or PII to third-party services
Sentry.setUser({ id: user.id, email: user.email });
```

See [`src/lib/errors/README.md`](src/lib/errors/README.md) for detailed examples.

## Detailed Documentation

Read these files when working on specific areas:

| Area                   | File                   | When to read                                        |
| ---------------------- | ---------------------- | --------------------------------------------------- |
| Database schema        | `docs/DATABASE.md`     | Creating/modifying tables, RLS policies, migrations |
| Component patterns     | `docs/PATTERNS.md`     | Building UI components, state management            |
| Architecture decisions | `docs/ARCHITECTURE.md` | Understanding why decisions were made               |

## Good Examples to Copy

When creating new components, reference these patterns:

- Task card: `src/components/features/tasks/TaskCard.tsx`
- Form with validation: `src/components/features/tasks/TaskForm.tsx`
- Data fetching hook: `src/hooks/useTasks.ts`
- Zustand store: `src/stores/ui-store.ts`
- Search with ILIKE: `src/hooks/useAllTasks.ts` (proper escaping)

## Search Query Patterns

When implementing search with Supabase `ilike()`, always escape SQL wildcards:

```typescript
// ✅ CORRECT: Escape wildcards before passing to ilike
if (searchQuery && searchQuery.length >= 2) {
  const escapedSearch = searchQuery.replace(/[%_\\]/g, '\\$&');
  query = query.ilike('title', `%${escapedSearch}%`);
}

// ❌ WRONG: Unescaped input allows wildcard injection
query = query.ilike('title', `%${searchQuery}%`);
```

This prevents users from using `%` or `_` as wildcards in their search.

## What to Avoid

- Class components (use functional components with hooks)
- `useEffect` for data fetching (use TanStack Query)
- Direct Supabase calls in components (use hooks)
- `any` type (enable strict TypeScript)
- Default parameter values (make all parameters explicit)
- Real-time subscriptions for single-user app (unnecessary overhead)

## Performance Priorities (from Vercel React Best Practices)

1. **CRITICAL: Eliminate async waterfalls** — Parallelize independent fetches
2. **CRITICAL: Reduce bundle size** — Use direct imports, dynamic imports for heavy components
3. **HIGH: Server-side performance** — Prefer Server Components, stream where possible
4. **MEDIUM: Re-render optimization** — Memoize expensive computations, not everything

## Testing Requirements

- New features require tests
- Run `npm run typecheck` before committing
- Test optimistic updates by simulating slow/failed network

## Git Workflow

- Branch naming: `feature/task-card`, `fix/auth-redirect`, `refactor/hooks`
- Commit messages: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- **Pre-commit hooks** (Husky + lint-staged) automatically run:
  - Format staged files with Prettier
  - Lint staged TypeScript files with ESLint (auto-fix)
  - Type-check entire project
- If pre-commit fails, fix issues and commit again
