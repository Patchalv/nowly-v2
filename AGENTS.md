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

See [`src/lib/onboarding/README.md`](src/lib/onboarding/README.md) for detailed onboarding documentation.

### 7. Route Protection & Security

**Defense-in-depth architecture:** Route protection uses two layers:

1. **`src/proxy.ts`** — Next.js 16 proxy (middleware) for optimistic redirects
2. **`src/app/(protected)/layout.tsx`** — Server-side auth check as primary security layer

Public, auth-only and protected route prefixes are listed in `src/proxy.ts`.

**When adding new routes:**

- **New protected route**: Add prefix to `protectedPrefixes` array in `proxy.ts`
- **New public route**: Add to `publicRoutes` array in `proxy.ts`
- **Protected routes** must be under `src/app/(protected)/` to inherit the layout auth check

**GDPR compliance:**

- Only send `user.id` to Sentry, never email or other PII
- See Sentry section below for correct pattern

### 8. Error Handling — Sentry Integration

**When to use error handlers:** `handleSupabaseError` for database operations, `handleAuthError` (with `getAuthErrorMessage` for the user-facing message) for authentication — both in `src/lib/errors/`. Never `console.error` and never swallow the error; it won't be tracked in production.

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

- Editing `src/components/ui/` (shadcn primitives — regenerate, don't hand-edit)
- Class components (use functional components with hooks)
- `useEffect` for data fetching (use TanStack Query)
- Direct Supabase calls in components (use hooks)
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

## This repository is worked by an autonomous factory

Some pull requests here are opened by **`beavify`**, a machine account driven by
[dark-factory](https://github.com/Patchalv/dark-factory) — a lights-out system
that turns a written ticket into a pull request ready for review. It runs on a
cron and needs no prompting.

**It never merges anything.** Every change it makes arrives as a pull request a
human has to approve, and it cannot push to `main`, force-push, or delete a
branch. Those are not policies it follows; they are actions its code cannot
express.

### Giving it work

Open an issue and label it `state:ready`. The issue body needs two things or it
is rejected before anything is spent:

1. **A goal in prose** — what to build, not only what to accept.
2. **An `## Acceptance criteria` heading** with at least one criterion under it.

A rejected ticket gets a comment saying exactly what was missing. Fix it and
re-apply `state:ready` to start a fresh run.

Labels are how the factory reports where a run is. Do not hand-edit them to make
something happen — only `state:ready` starts work.

| Label                      | Meaning                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `state:ready`              | Waiting to be picked up. **You set this one**                                                                     |
| `state:in-progress`        | A run is working on it                                                                                            |
| `state:needs-human-input`  | Escalated — it asked a question and is waiting. Answer **in a comment on the issue**; that is where it reads from |
| `state:pr-ready`           | Pull request open, waiting on human review                                                                        |
| `state:rejected-at-intake` | Refused before spending, with reasons in a comment                                                                |
| `state:done`               | Closed                                                                                                            |
| `run:stop`                 | **Kill switch.** Add it to an issue to stop that run                                                              |

Only comments from repository collaborators with push access are read. A comment
from anyone else — including CodeRabbit and the Vercel bot — is seen, marked
read, and never acted on.

### The one rule that is easy to break by accident

**Never commit to a `factory/...` branch.** A human commit on a run's branch
permanently ends the factory's involvement with that run. It is one-way and
there is no hand-back: the run stops working, stays open only to notice the
eventual merge, and no amount of reverting brings it back.

This is deliberate — if you have started editing the work yourself, the factory
racing you is worse than it stopping. But it means "just fixing a typo" on its
branch retires the run. If you want a change, request it in a pull request
review and let the run make it, or take the branch over knowing the factory is
done with it.

### `factory.yml`

At the repository root, read **from `main` only** — never from a working branch,
so an agent blocked by a permission cannot edit the file on its own branch and
grant itself the permission.

Three things about it that are not obvious:

- **`checks:` names Actions job names — the keys under `jobs:` in
  `.github/workflows/ci.yml`, not workflow names, not check names.** Renaming a
  job without updating `factory.yml` in the same commit makes every run fail
  verification while CI looks green. Ours are `lint`, `typecheck` and `build`.
- **`network:` and `grants:` are requests, not grants.** They resolve as an
  intersection with the factory's own configuration, which lives in a repository
  no agent pushes to. Adding a host here alone does nothing except produce a
  warning. The two font hosts are there because `next/font/google` resolves at
  build time and the sandbox otherwise cannot run `npm run build`.
- **`budgets:` can only narrow.** A number above the factory's cap is ignored.

### Working alongside it

- The plan a run intends to follow is posted as a **comment on the issue** before
  implementation starts. That is the cheapest place to redirect it.
- The pull request description carries the **assumptions ledger** — every
  judgement call the run made rather than escalating. Read it; it is usually
  where a disagreement will be.
- A run reviews its own work in an isolated session that sees only the ticket,
  the plan, and the diff. It cannot see the implementer's reasoning, which is the
  point, but it also means a pull request whose justification lives outside the
  diff will read as unjustified.
- CI is the only automated gate, and this repo has no test suite — `lint`,
  `typecheck` and `build` are the whole of it, plus a human approving every pull
  request. A run that adds the first test is a good ticket to write.
- The factory's sandbox has no browser and no Supabase credentials, so it cannot
  run `npm run dev` or check anything visually. A ticket whose acceptance turns
  on how something _looks_ will come back verified by reading the diff. Say what
  the change should be, not only what it should look like.
