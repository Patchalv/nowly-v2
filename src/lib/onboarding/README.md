# Onboarding System

This directory contains the onboarding tour configuration for Nowly. The onboarding system uses [Driver.js](https://driverjs.com/) to guide new users through the app's features.

## Overview

The onboarding system consists of:

1. **Interactive Tour** — 10-step guided tour (5 steps on mobile) that auto-starts for new users
2. **Contextual Tooltips** — One-time educational tooltips that appear on specific features
3. **Celebration Overlay** — Fireworks animation on tour completion

## File Structure

```
src/
├── lib/onboarding/
│   ├── tour-config.ts      # Driver.js configuration, sidebar selectors
│   ├── tour-steps.ts       # All tour step definitions (desktop + mobile)
│   └── README.md           # This file
├── components/features/onboarding/
│   ├── OnboardingTour.tsx      # Main tour component (auto-starts)
│   ├── ContextualTooltip.tsx   # One-time feature tooltips
│   ├── CelebrationOverlay.tsx  # Fireworks on completion
│   └── ReplayTourButton.tsx    # Manual replay (localhost only)
├── hooks/
│   └── useOnboarding.ts    # Hook for tour state, tooltip dismissal
├── types/
│   └── onboarding.ts       # TooltipType enum, OnboardingState type
└── styles/
    └── onboarding-tour.css # Custom Driver.js styles
```

## Tour Steps

### Desktop Tour (10 steps)

| Step | Element Selector              | Description                    |
| ---- | ----------------------------- | ------------------------------ |
| 1    | (centered)                    | Welcome message                |
| 2    | `#sidebar-workspace-selector` | Workspaces explanation         |
| 3    | `[href="/today"]`             | Today view                     |
| 4    | `[href="/daily"]`             | Daily planner                  |
| 5    | `[href="/weekly"]`            | Weekly view                    |
| 6    | `[href="/all-tasks"]`         | All tasks view                 |
| 7    | `[href="/backlog"]`           | Backlog as inbox               |
| 8    | `[href="/recurring"]`         | Recurring tasks                |
| 9    | (centered)                    | Core concept: Scheduled vs Due |
| 10   | `#quick-add-task`             | Quick add task                 |

### Mobile Tour (5 steps)

Abbreviated version: Welcome → Today → Backlog → Core Concept → Quick Add

## Critical Element Selectors

**These selectors are coupled to UI elements. Changing them breaks the tour.**

| Selector                      | Component File     | Purpose            |
| ----------------------------- | ------------------ | ------------------ |
| `#sidebar-workspace-selector` | `app-sidebar.tsx`  | Workspace dropdown |
| `#quick-add-task`             | `QuickAddTask.tsx` | Quick add input    |
| `[href="/today"]`             | `app-sidebar.tsx`  | Today nav link     |
| `[href="/daily"]`             | `app-sidebar.tsx`  | Daily nav link     |
| `[href="/weekly"]`            | `app-sidebar.tsx`  | Weekly nav link    |
| `[href="/all-tasks"]`         | `app-sidebar.tsx`  | All tasks nav link |
| `[href="/backlog"]`           | `app-sidebar.tsx`  | Backlog nav link   |
| `[href="/recurring"]`         | `app-sidebar.tsx`  | Recurring nav link |

## Contextual Tooltips

One-time tooltips that appear when users interact with specific features:

| TooltipType                 | Trigger                        | Description               |
| --------------------------- | ------------------------------ | ------------------------- |
| `RESCHEDULE_BUTTON`         | First uncompleted task visible | Explains quick reschedule |
| `TASK_COMPLETION_UNDO`      | First task completion          | Shows undo shortcut       |
| `TASK_DIALOG_SCHEDULED_DUE` | Opens task dialog              | Explains date distinction |

## Database Schema

State persists in the `user_onboarding` table:

```sql
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tour_completed BOOLEAN DEFAULT FALSE,
  tour_completed_at TIMESTAMPTZ,
  dismissed_tooltips TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Records are created lazily on first interaction (not on signup).

## Modifying the Tour

### Adding a New Step

1. Define the step in `tour-steps.ts`:

   ```typescript
   const STEP_NEW_FEATURE: DriveStep = {
     element: '#new-feature-id', // CSS selector
     popover: {
       title: 'New Feature',
       description: 'Explanation here',
       side: 'right',
       align: 'start',
     },
   };
   ```

2. Add to `DESKTOP_TOUR_STEPS` array (and `MOBILE_TOUR_STEPS` if relevant)

3. Add the selector to `SIDEBAR_SELECTORS` in `tour-config.ts` if it's a sidebar element

4. Ensure the target element has the matching ID/selector in the component

### Removing a Step

1. Remove from `DESKTOP_TOUR_STEPS` and `MOBILE_TOUR_STEPS` arrays
2. Remove the step constant if no longer used
3. Remove from `SIDEBAR_SELECTORS` if applicable

### Changing an Element ID

1. Update the element's `id` attribute in the component
2. Update the `element` selector in the step definition
3. Update `SIDEBAR_SELECTORS` if it's a sidebar element

## Mobile Sidebar Handling

On mobile, the sidebar is closed by default. The tour automatically:

1. Opens the sidebar before highlighting sidebar elements
2. Closes the sidebar after moving past sidebar steps

This is handled by checking `isSidebarElement()` in `OnboardingTour.tsx`.

## Accessibility

- Tour respects `prefers-reduced-motion` (disables animations)
- Keyboard navigation supported (arrow keys, escape to close)
- Focus management handled by Driver.js
- Celebration overlay uses ARIA `role="status"`

## Testing the Tour

1. **Reset tour state:** Clear the `user_onboarding` record from the database
2. **Manual replay:** On localhost, use the "Replay Tour" button in Account settings
3. **Force new user:** Create a new user account

## Styling

Custom styles in `src/styles/onboarding-tour.css`:

- Popover styling matches shadcn/ui design
- Close button customizations
- Responsive adjustments for mobile
- Reduced motion support

Import order matters — the CSS must be imported after Driver.js defaults.
