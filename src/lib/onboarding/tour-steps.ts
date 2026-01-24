import type { DriveStep } from 'driver.js';

/**
 * Desktop tour steps (10 total).
 * Covers all main navigation items and the core concept.
 */
export const DESKTOP_TOUR_STEPS: DriveStep[] = [
  // Step 1: Welcome (center popover, no element)
  {
    popover: {
      title: 'Welcome to Nowly! 👋',
      description:
        "Manage when you DO tasks, not just when they're DUE.\n\nLet's take a 60-second tour!",
      align: 'center',
    },
  },

  // Step 2: Workspace Selector
  {
    element: '#sidebar-workspace-selector',
    popover: {
      title: '🎯 Workspaces',
      description:
        "Switch between Master view (all tasks) or individual workspaces. We created 'Default' to get you started.\n\nTip: Create separate workspaces for Work, Projects, Personal.",
      side: 'right',
      align: 'start',
    },
  },

  // Step 3: Today View
  {
    element: '[href="/today"]',
    popover: {
      title: '📅 Today View',
      description:
        'Your daily focus list. Overdue tasks automatically roll forward here.\n\nStart every day here!',
      side: 'right',
      align: 'start',
    },
  },

  // Step 4: Daily Planner
  {
    element: '[href="/daily"]',
    popover: {
      title: '📆 Daily Planner',
      description:
        "Plan your week day-by-day. Schedule tasks for when you'll actually have time to work on them.",
      side: 'right',
      align: 'start',
    },
  },

  // Step 5: Weekly View
  {
    element: '[href="/weekly"]',
    popover: {
      title: '📊 Weekly View',
      description:
        'See your entire week at a glance. Perfect for big-picture planning.',
      side: 'right',
      align: 'start',
    },
  },

  // Step 6: All Tasks
  {
    element: '[href="/all-tasks"]',
    popover: {
      title: '📋 All Tasks',
      description:
        'Your complete task library - see everything across all dates and workspaces. Perfect for searching and reviewing.',
      side: 'right',
      align: 'start',
    },
  },

  // Step 7: Backlog
  {
    element: '[href="/backlog"]',
    popover: {
      title: '📝 Backlog = Your Inbox',
      description:
        "Capture tasks WITHOUT scheduling. Schedule them when you're ready to commit to a date.\n\nThis prevents overwhelm!",
      side: 'right',
      align: 'start',
    },
  },

  // Step 8: Recurring Tasks
  {
    element: '[href="/recurring"]',
    popover: {
      title: '🔄 Recurring Tasks',
      description:
        'Create templates that automatically generate tasks daily, weekly, or monthly.\n\nPerfect for: Daily review, Weekly planning, Monthly reports.',
      side: 'right',
      align: 'start',
    },
  },

  // Step 9: The Core Concept (center popover, no element)
  {
    popover: {
      title: '💡 The Secret: Scheduled ≠ Due',
      description:
        "SCHEDULED = When you'll work on it\nDUE = Hard deadline\n\nThis is what makes Nowly different. Plan realistically without stress.\n\nPro tip: You can also set priority levels for tasks!",
      align: 'center',
    },
  },

  // Step 10: Quick Add
  {
    element: '#quick-add-task',
    popover: {
      title: '⚡ Quick Add',
      description:
        'Type + hit Enter to quickly capture tasks.\n\nTry creating your first task now!',
      side: 'top',
      align: 'center',
    },
  },
];

/**
 * Mobile tour steps (5 total).
 * Abbreviated version focusing on the most important concepts.
 * Steps: Welcome, Today, Backlog, Core Concept, Quick Add
 */
export const MOBILE_TOUR_STEPS: DriveStep[] = [
  // Step 1: Welcome (same as desktop)
  DESKTOP_TOUR_STEPS[0],

  // Step 2: Today View (desktop step 3)
  DESKTOP_TOUR_STEPS[2],

  // Step 3: Backlog (desktop step 7)
  DESKTOP_TOUR_STEPS[6],

  // Step 4: The Core Concept (desktop step 9)
  DESKTOP_TOUR_STEPS[8],

  // Step 5: Quick Add (desktop step 10)
  DESKTOP_TOUR_STEPS[9],
];

/**
 * Get the appropriate tour steps based on viewport size.
 */
export function getTourSteps(isMobile: boolean): DriveStep[] {
  return isMobile ? MOBILE_TOUR_STEPS : DESKTOP_TOUR_STEPS;
}
