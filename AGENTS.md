# AGENTS.md — Nowly v2

> This file provides guidance to AI coding agents (Claude Code, Cursor, Antigravity, etc.) when working with this repository.

## Project Overview

**Nowly v2** is a modern task management app built with:

- Next.js 15 (App Router)
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
│   ├── (auth)/             # Auth routes (login, signup)
│   ├── (dashboard)/        # Protected routes
│   └── api/                # API routes (if needed)
├── components/
│   ├── ui/                 # shadcn primitives (do not edit)
│   └── features/           # Feature components (tasks/, sidebar/, etc.)
├── lib/
│   ├── supabase/           # Supabase client (server.ts, client.ts, middleware.ts)
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
