# Architecture Decisions — Nowly v2

This document explains **why** key architectural decisions were made. Read this to understand the reasoning, not just the rules.

## ADR-001: Scheduled Date vs Due Date Distinction

### Context

Most task apps conflate "when to work on something" with "when it's due." Users create artificial due dates to remind themselves, then become desensitized to actual deadlines.

### Decision

Implement two distinct date fields:

- `scheduled_date`: When the user plans to work on the task (calendar icon)
- `due_date`: Hard deadline that cannot be missed (flag icon, red when overdue)

### Rationale

- Inspired by Amazing Marvin's four-date system (simplified to two)
- Allows scheduling work without creating false urgency
- Preserves meaning of due dates — they're real deadlines
- Better mental model for users

### Consequences

- UI must clearly differentiate the two dates
- Task cards need two date pickers or smart defaults
- Queries must handle both fields for "what's next" views

---

## ADR-002: Master Template + Generated Instances for Recurring Tasks

### Context

Recurring tasks can be implemented three ways:

1. **Store all future instances** — Simple but creates infinite data
2. **Single task with recurrence flag** — Can't modify individual instances
3. **Template + generated instances** — Most flexible but complex

### Decision

Use the template + instances pattern:

- `recurring_tasks` table stores master templates with recurrence rules
- `tasks` table stores generated instances with `recurring_task_id` reference
- Instances can be "detached" to allow individual modifications

### Rationale

- Avoids storing infinite future tasks
- Allows modifications to single occurrences without affecting the series
- Preserves completion history when template is deleted
- Industry standard approach (Google Calendar, Todoist)

### Consequences

- Need triggers to generate new instances on completion
- Daily cron job for calendar-based recurrence (7-day lookahead)
- Template changes propagate only to uncompleted, non-detached instances

---

## ADR-003: TanStack Query + Supabase Cache Helpers (Not Realtime)

### Context

For data synchronization, we could use:

1. Supabase Realtime subscriptions
2. Manual fetch + cache management
3. TanStack Query with automatic cache invalidation

### Decision

Use TanStack Query with Supabase Cache Helpers. Skip Realtime subscriptions entirely.

### Rationale

- **Single-user app**: No need for multi-user sync
- **Realtime overhead**: WebSocket connections cost resources without benefit
- **Cache Helpers magic**: Automatic cache key generation from query structure
- **Optimistic updates**: Better UX than waiting for server confirmation
- **Stale-while-revalidate**: Fast perceived performance

### Consequences

- No live updates from other devices (acceptable for single-user)
- Must implement optimistic updates for instant feedback
- Mutations must properly invalidate related caches

---

## ADR-004: Zustand for Client UI State (Not Redux/Context)

### Context

Client state includes: sidebar open/collapsed, current view, selected date, theme preference.

### Decision

Use Zustand with persist middleware for UI state. Keep it completely separate from server state (TanStack Query).

### Rationale

- **Minimal boilerplate**: No actions, reducers, providers
- **Persist middleware**: Saves preferences to localStorage automatically
- **TypeScript-first**: Excellent type inference
- **Small bundle**: ~1KB vs Redux's ~10KB
- **Clear separation**: Server state ≠ UI state

### Consequences

- Two mental models: "server state" (TanStack Query) vs "UI state" (Zustand)
- No single source of truth — intentional for separation of concerns

---

## ADR-005: No Barrel Files (Direct Imports Only)

### Context

Barrel files (`index.ts` that re-exports everything) are common but problematic.

### Decision

Use direct imports everywhere. No barrel files except for `ui/` components.

### Rationale

- **75% faster builds**: Atlassian's measured improvement
- **Better tree-shaking**: Bundlers can eliminate unused code
- **Clearer dependencies**: Explicit imports show what's actually used
- **AI agent friendly**: Agents understand direct imports better

### Consequences

- Longer import paths
- More explicit about what's being used
- Refactoring requires updating import paths (IDE handles this)

**Example:**

```typescript
// ✅ CORRECT
import { TaskCard } from '@/components/features/tasks/TaskCard';

// ❌ WRONG
import { TaskCard } from '@/components/features/tasks';
```

---

## ADR-006: Zod Schemas as Single Source of Truth

### Context

Types can be defined as:

1. TypeScript interfaces
2. Generated from database
3. Derived from Zod schemas

### Decision

Use Zod schemas as the primary type source. Derive TypeScript types with `z.infer<>`.

### Rationale

- **Runtime validation**: Zod validates at runtime, not just compile time
- **Form integration**: Works directly with react-hook-form
- **Server action validation**: Validate FormData before database operations
- **Single definition**: Schema = types = validation = documentation

### Consequences

- All types defined in `schemas/` directory
- Database types generated separately, mapped to Zod schemas
- Slight runtime overhead for validation (negligible)

---

## ADR-007: Custom Auth Forms (Not auth-ui-react)

### Context

Supabase offers `@supabase/auth-ui-react` for pre-built auth forms.

### Decision

Build custom auth forms using Server Actions.

### Rationale

- **Deprecated**: auth-ui-react deprecated February 2024
- **App Router compatibility**: Server Actions work correctly with Next.js 15
- **Full control**: Custom styling, error handling, loading states
- **Security**: Server-side validation before Supabase calls

### Critical Security Rule

```typescript
// ✅ CORRECT: Validates JWT with Supabase server
const {
  data: { user },
} = await supabase.auth.getUser();

// ❌ WRONG: Reads from cookies (can be spoofed)
const {
  data: { session },
} = await supabase.auth.getSession();
```

---

## ADR-008: Feature-Based Folder Structure

### Context

Code can be organized by:

1. Type (all components together, all hooks together)
2. Feature (task components with task hooks)
3. Domain (user domain, task domain)

### Decision

Feature-based organization within `components/features/`.

### Rationale

- **Colocation**: Related files live together
- **Scalability**: New features don't bloat existing folders
- **AI agent comprehension**: Clear boundaries help agents understand scope
- **Deletion is easy**: Remove a feature folder to remove the feature

### Structure

```
src/
├── components/
│   ├── ui/              # shadcn primitives (don't edit)
│   └── features/
│       ├── tasks/       # Task feature
│       │   ├── TaskCard.tsx
│       │   ├── TaskForm.tsx
│       │   └── TaskList.tsx
│       └── sidebar/     # Sidebar feature
├── hooks/               # Shared hooks (not feature-specific)
└── stores/              # Zustand stores
```

---

## ADR-009: Position Column for Drag-and-Drop Ordering

### Context

Task order within a list needs to persist across sessions.

### Decision

Use an integer `position` column on tasks and categories.

### Rationale

- **Simple**: Integer comparison is fast
- **Reorderable**: Update positions on drag end
- **Fractional alternative rejected**: Floating point positions get messy over time

### Implementation

```typescript
// On drag end, recalculate all positions
const reorder = (list: Task[], from: number, to: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result.map((task, index) => ({ ...task, position: index }));
};
```

### Consequences

- Reordering updates multiple rows (batch update)
- Optimistic update for instant feedback
- Occasional "compact" operation to reset positions (optional)
