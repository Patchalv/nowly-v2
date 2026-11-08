# AGENTS.md — Nowly v2

> This file provides guidance to AI coding agents (Claude Code, Cursor, Antigravity, etc.) when working with this repository.

## Project Overview

**Key architectural decisions:**

- Scheduled date vs due date distinction (Amazing Marvin pattern)
- Master template + generated instances for recurring tasks
- Feature-based folder structure with direct imports (no barrel files)
- Zod schemas as single source of truth for types
- Custom auth forms with Server Actions (not deprecated auth-ui-react)

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
// ✅ CORRECT: Derive types from Zod schemas (see src/schemas/)
export const taskSchema = z.object({ /* ... */ });
export type Task = z.infer<typeof taskSchema>;

// ❌ WRONG: Separate interface definitions
interface Task { ... }
```

### 3. Auth — Always Check the Session on the Server

Auth is Neon Auth (Managed Better Auth). On the server, always check `auth.getSession()` through `getCurrentUser()`, the one place that reads it:

```typescript
// ✅ CORRECT: Server-side session check (src/lib/auth/get-current-user.ts)
import { getCurrentUser } from '@/lib/auth/get-current-user';

const { user, error } = await getCurrentUser();
if (error || !user) redirect('/login');

// ❌ WRONG: Trusting a user ID sent by the client, or skipping the check
// because the proxy already ran (the proxy is only an optimistic redirect)
```

In client components, use the `useCurrentUser()` hook instead.

**Revocation window:** `getSession()` is served from a signed HTTP-only cookie that caches the session for `sessionDataTtl` seconds (set explicitly to 300 in `src/lib/auth/server.ts`). A revoked or signed-out-elsewhere session can stay usable for up to that long. Lowering it shortens the window but sends more requests to Neon Auth. Don't change it without saying so in the PR.

Data access goes through the Neon Data API with the session's JWT, and Postgres RLS (`auth.uid()`) decides which rows a user can touch. The session check guards pages; RLS guards data.

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

See [`src/lib/onboarding/README.md`](src/lib/onboarding/README.md) for detailed onboarding documentation.

### 7. Route Protection & Security

**Defense-in-depth architecture:** Route protection uses two layers:

1. **`src/proxy.ts`** — Next.js 16 proxy running Neon Auth's `auth.middleware()` for optimistic redirects
2. **`src/app/(protected)/layout.tsx`** — Server-side session check as primary security layer

The proxy protects every route by default. The only exceptions are the `publicRoutes` list passed to `auth.middleware()` in `src/proxy.ts`, plus Neon Auth's own default skip routes (`/api/auth` and its `/auth/*` pages) and the `loginUrl`. Each entry matches that path and its slash-delimited subpaths (`'/'` matches only the home page). Signed-out requests to any other route redirect to `/login`. Signed-in users on `/login` or `/signup` are redirected by those pages, not the proxy.

**When adding new routes:**

- **New protected route**: Nothing to add in `proxy.ts`. Put it under `src/app/(protected)/` so it inherits the layout's session check
- **New public route**: Add it to the `publicRoutes` array in `proxy.ts`

**GDPR compliance:**

- Only send `user.id` to Sentry, never email or other PII
- See Sentry section below for correct pattern

### 8. Error Handling — Sentry Integration

**When to use error handlers:** `handleSupabaseError` (in `src/lib/errors/`) for database operations. Never `console.error` and never swallow the error; it won't be tracked in production.

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

| Area                         | File                                                                                                    | When to read                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Database schema              | `docs/DATABASE.md`                                                                                      | Creating/modifying tables, RLS policies, migrations                                                                          |
| Component patterns           | `docs/PATTERNS.md`                                                                                      | Building UI components, state management                                                                                     |
| Architecture decisions       | `docs/ARCHITECTURE.md`                                                                                  | Understanding why decisions were made                                                                                        |
| Neon migration (in progress) | `docs/NEON_MIGRATION_SPEC.md`, `docs/verification/neon-spike.md`, `docs/verification/neon-spike-files/` | Any ticket under the "Move Nowly from Supabase to Neon" issue; any change to auth, data clients or migrations until it lands |

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

- Editing `src/components/ui/` (shadcn primitives — regenerate, don't hand-edit)
- Class components (use functional components with hooks)
- `useEffect` for data fetching (use TanStack Query)
- Direct data-client calls in components (use hooks)
- `any` type (enable strict TypeScript)
- Default parameter values (make all parameters explicit)
- Real-time subscriptions for single-user app (unnecessary overhead)

## Testing Requirements

- New features require tests
- Run `npm run typecheck` before committing
- Test optimistic updates by simulating slow/failed network

## Git Workflow

- Branch naming: `feature/task-card`, `fix/auth-redirect`, `refactor/hooks`
- Commit messages: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Pre-commit hooks (Husky + lint-staged) run automatically; if they fail, fix and commit again
