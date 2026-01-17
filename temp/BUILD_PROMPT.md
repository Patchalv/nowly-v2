# Nowly v2 — Autonomous Build Instructions

You are building Nowly v2, a modern task management app. This document contains everything you need to build the complete application autonomously.

## Context Files

Before starting, read these files in order:
1. `AGENTS.md` — Project rules and architecture
2. `docs/DATABASE.md` — Complete database schema
3. `docs/PATTERNS.md` — Code patterns to follow
4. `docs/ARCHITECTURE.md` — Why decisions were made

The user has also provided the original PRD (`Nowly_v2_Task_Management_Design.md`) which contains detailed UX/UI patterns and requirements.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Supabase (PostgreSQL, Auth, RLS)
- shadcn/ui + Tailwind CSS
- TanStack Query + @supabase-cache-helpers/postgrest-react-query
- Zustand (UI state)
- Zod (validation)
- react-hook-form

## Pre-Requisites (User Has Completed)

- [x] Supabase project created (cloud)
- [x] Google OAuth configured in Supabase
- [x] Environment variables ready

---

## Build Phases

Execute these phases in order. After each phase, run verification steps before proceeding.

### Phase 1: Project Initialization

```bash
# Create Next.js project
npx create-next-app@latest nowly-v2 --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd nowly-v2

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query @supabase-cache-helpers/postgrest-react-query
npm install zustand
npm install zod @hookform/resolvers react-hook-form
npm install date-fns
npm install lucide-react

# Install shadcn/ui
npx shadcn@latest init

# Install required shadcn components
npx shadcn@latest add button input label card checkbox badge
npx shadcn@latest add dialog alert-dialog sheet popover
npx shadcn@latest add form calendar select switch
npx shadcn@latest add dropdown-menu command tooltip
npx shadcn@latest add sidebar skeleton sonner
npx shadcn@latest add collapsible separator avatar
```

**Create environment file:**
```bash
# .env.local (user will fill in values)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Verification:**
- [ ] `npm run dev` starts without errors
- [ ] shadcn components installed in `src/components/ui/`

---

### Phase 2: Supabase Client Setup

Create the Supabase client files following the official SSR pattern:

**src/lib/supabase/client.ts** — Browser client
**src/lib/supabase/server.ts** — Server client (cookies)
**src/lib/supabase/middleware.ts** — Middleware helper
**src/middleware.ts** — Route protection

Key requirements:
- Use `@supabase/ssr` createBrowserClient and createServerClient
- Server client must use cookies() from next/headers
- Middleware refreshes session and protects routes

**Protected routes:** Everything under `/(dashboard)/*`
**Public routes:** `/`, `/login`, `/signup`, `/auth/callback`

**Create auth callback route:**
`src/app/auth/callback/route.ts` — Handles OAuth redirect, exchanges code for session

**Verification:**
- [ ] No TypeScript errors
- [ ] Middleware file exists at `src/middleware.ts`

---

### Phase 3: Database Schema

Create Supabase migrations for all tables. The complete schema is in `docs/DATABASE.md`.

**Tables to create (in order due to foreign keys):**
1. `profiles` — User profiles (with trigger for auto-creation)
2. `workspaces` — User workspaces
3. `categories` — Categories within workspaces
4. `recurring_tasks` — Recurring task templates
5. `tasks` — Main tasks table

**For each table, include:**
- Table creation with proper constraints
- Indexes (especially on user_id, scheduled_date)
- RLS policies (wrap auth.uid() in SELECT)
- Updated_at triggers where applicable

**Create migration files in:** `supabase/migrations/`

Naming convention: `YYYYMMDDHHMMSS_description.sql`

**Verification:**
- [ ] All migration files created
- [ ] RLS enabled on all tables
- [ ] Indexes created for common queries

---

### Phase 4: Type Generation & Schemas

**Generate Supabase types:**
Add script to package.json:
```json
"db:types": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.ts"
```

**Create Zod schemas in `src/schemas/`:**
- `task.ts` — Task schema with all fields
- `workspace.ts` — Workspace schema
- `category.ts` — Category schema
- `recurring-task.ts` — Recurring task schema

**Create type helpers in `src/types/supabase.ts`**

**Verification:**
- [ ] All schemas export both schema and inferred type
- [ ] No TypeScript errors

---

### Phase 5: Authentication UI

Create auth pages with Server Actions:

**src/app/(auth)/login/page.tsx**
- Email/password form
- Google OAuth button
- Link to signup
- Error handling with toast

**src/app/(auth)/signup/page.tsx**
- Email/password form
- Google OAuth button
- Link to login
- Success message (check email)

**src/app/(auth)/actions.ts**
- `login()` — Email/password login
- `signup()` — Email/password signup
- `signInWithGoogle()` — OAuth redirect
- `signOut()` — Logout

**Security requirement:** Always use `getUser()` not `getSession()` for auth checks.

**Verification:**
- [ ] Can sign up with email
- [ ] Can log in with email
- [ ] Can log in with Google
- [ ] Protected routes redirect to login
- [ ] Login redirects to dashboard

---

### Phase 6: Core Layout & Navigation

**src/app/(dashboard)/layout.tsx**
- Sidebar + main content layout
- Uses shadcn Sidebar component
- Three states: expanded, collapsed (icons), hidden

**src/components/features/sidebar/AppSidebar.tsx**
- Quick access: Today, Upcoming, Inbox
- Workspaces list (expandable)
- Categories under each workspace
- User menu at bottom

**src/stores/ui-store.ts**
- Sidebar state (open, collapsed)
- Current view
- Selected date
- Persist to localStorage

**Navigation structure:**
```
/(dashboard)
├── /today          — Today's tasks
├── /upcoming       — Week view
├── /inbox          — Unscheduled tasks
└── /workspace/[id] — Workspace view
```

**Verification:**
- [ ] Sidebar renders with all sections
- [ ] Sidebar collapse/expand works
- [ ] Navigation between views works
- [ ] State persists on refresh

---

### Phase 7: Data Fetching Hooks

Create hooks in `src/hooks/`:

**useTasks.ts**
- Fetch tasks by scheduled_date
- Include category relation
- Include subtask count

**useWorkspaces.ts**
- Fetch user's workspaces
- Ordered by position

**useCategories.ts**
- Fetch categories by workspace_id

**Mutation hooks:**
- `useCreateTask.ts`
- `useUpdateTask.ts`
- `useDeleteTask.ts`
- `useToggleTaskComplete.ts` — With optimistic update

**useCreateWorkspace.ts**, **useCreateCategory.ts**

All hooks should use `@supabase-cache-helpers/postgrest-react-query`.

**Verification:**
- [ ] Hooks return proper loading/error states
- [ ] Data fetches correctly
- [ ] Mutations invalidate correct caches

---

### Phase 8: Task Components

**src/components/features/tasks/TaskCard.tsx**
- Progressive disclosure (minimal by default)
- Checkbox with optimistic completion
- Title, due date indicator
- Hover reveals actions
- Color-coded priority

**src/components/features/tasks/TaskForm.tsx**
- Title (required)
- Description (optional)
- Scheduled date picker
- Due date picker (separate from scheduled!)
- Priority selector
- Category selector
- Workspace selector

**src/components/features/tasks/TaskList.tsx**
- Renders list of TaskCards
- Empty state
- Loading skeleton

**src/components/features/tasks/QuickAddTask.tsx**
- Inline task creation
- Just title + Enter to create
- Inherits current view's date

**Verification:**
- [ ] Can create task
- [ ] Can complete task (with undo toast)
- [ ] Can edit task
- [ ] Can delete task
- [ ] Scheduled vs due date are visually distinct

---

### Phase 9: View Pages

**src/app/(dashboard)/today/page.tsx**
- Shows tasks scheduled for today
- Shows overdue tasks (separate section)
- Quick add at bottom

**src/app/(dashboard)/upcoming/page.tsx**
- Week view (7 days)
- Day columns or list grouped by day
- Navigate between weeks

**src/app/(dashboard)/inbox/page.tsx**
- Tasks with no scheduled_date
- Drag to schedule (or click to set date)

**src/app/(dashboard)/workspace/[id]/page.tsx**
- All tasks in workspace
- Filter by category
- Group by status or category

**Verification:**
- [ ] Today shows correct tasks
- [ ] Upcoming shows week correctly
- [ ] Inbox shows unscheduled tasks
- [ ] Workspace shows filtered tasks

---

### Phase 10: Workspace & Category Management

**Workspace creation dialog**
- Name, color picker, icon selector

**Category creation dialog**
- Name, color picker
- Belongs to workspace

**Edit/delete functionality for both**

**Default workspace creation**
- On first login, create "Personal" workspace

**Verification:**
- [ ] Can create workspace
- [ ] Can create category in workspace
- [ ] Can edit/delete both
- [ ] New users get default workspace

---

### Phase 11: Recurring Tasks

**src/components/features/tasks/RecurrenceSelector.tsx**
- Recurrence type selector
- Interval configuration
- Day of week picker (for weekly)
- Day of month picker (for monthly)
- End date (optional)

**Database trigger for instance generation**
- Already defined in DATABASE.md
- Verify trigger works on task completion

**UI for recurring tasks:**
- Indicator on TaskCard showing it's recurring
- Edit series vs edit instance option
- Pause/resume recurrence

**Verification:**
- [ ] Can create recurring task
- [ ] Completing instance creates next one
- [ ] Can modify single instance (detach)
- [ ] Can pause/resume series

---

### Phase 12: Polish & Error Handling

**Loading states:**
- Skeleton loaders for task lists
- Loading spinners for mutations

**Error handling:**
- Error boundaries for sections
- Toast notifications for errors
- Retry mechanisms

**Optimistic updates:**
- Task completion (with undo)
- Task reordering
- Quick edits

**Toast notifications (Sonner):**
- Task completed (with undo)
- Task deleted (with undo)
- Errors with retry

**Verification:**
- [ ] No unhandled errors in console
- [ ] Loading states visible during fetches
- [ ] Errors show helpful messages
- [ ] Undo works for destructive actions

---

### Phase 13: Final Verification

Run complete test flow:

1. **Auth flow:**
   - Sign up new user
   - Verify email (or use Supabase dashboard to confirm)
   - Log in
   - Log out
   - Log in with Google

2. **Task management:**
   - Create workspace
   - Create category
   - Create task for today
   - Complete task
   - Undo completion
   - Create task for tomorrow
   - Check upcoming view
   - Create unscheduled task
   - Check inbox

3. **Recurring tasks:**
   - Create daily recurring task
   - Complete it
   - Verify next instance created

4. **Edge cases:**
   - Refresh page (state persists)
   - Slow network (loading states)
   - Offline behavior (error handling)

---

## Code Quality Checklist

Before considering the build complete:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] No console errors in browser
- [ ] All forms validate with Zod
- [ ] All mutations have error handling
- [ ] Loading states for all async operations
- [ ] Mobile responsive (test at 375px width)

---

## File Structure (Expected Final)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── actions.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── today/page.tsx
│   │   ├── upcoming/page.tsx
│   │   ├── inbox/page.tsx
│   │   └── workspace/[id]/page.tsx
│   ├── auth/callback/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # shadcn (don't edit)
│   └── features/
│       ├── sidebar/
│       │   └── AppSidebar.tsx
│       ├── tasks/
│       │   ├── TaskCard.tsx
│       │   ├── TaskForm.tsx
│       │   ├── TaskList.tsx
│       │   └── QuickAddTask.tsx
│       └── workspace/
│           └── WorkspaceDialog.tsx
├── hooks/
│   ├── useTasks.ts
│   ├── useWorkspaces.ts
│   ├── useCategories.ts
│   └── ... (mutations)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── schemas/
│   ├── task.ts
│   ├── workspace.ts
│   └── category.ts
├── stores/
│   └── ui-store.ts
├── types/
│   ├── database.ts
│   └── supabase.ts
└── middleware.ts
```

---

## Notes for the Agent

1. **Work incrementally** — Complete each phase before moving to the next
2. **Verify as you go** — Run the verification steps after each phase
3. **Follow existing patterns** — Reference `docs/PATTERNS.md` for code examples
4. **Ask if stuck** — If something is unclear, ask the user rather than guessing
5. **Commit often** — Suggest git commits after each major phase

**Critical rules from AGENTS.md:**
- No barrel files (direct imports only)
- Zod schemas are type source of truth
- getUser() not getSession()
- Scheduled date ≠ due date

Good luck! Build something great.
