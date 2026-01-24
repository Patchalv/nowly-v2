import type { DriveStep } from 'driver.js';

/**
 * Named tour step definitions.
 * Using named constants allows referencing steps without fragile index-based lookups.
 */

const STEP_WELCOME: DriveStep = {
  popover: {
    title: 'Welcome to Nowly! \u{1F44B}',
    description:
      "Manage when you DO tasks, not just when they're DUE.\n\nLet's take a 60-second tour!",
    align: 'center',
  },
};

const STEP_WORKSPACE_SELECTOR: DriveStep = {
  element: '#sidebar-workspace-selector',
  popover: {
    title: '\u{1F3AF} Workspaces',
    description:
      "Switch between Master view (all tasks) or individual workspaces. We created 'Default' to get you started.\n\nTip: Create separate workspaces for Work, Projects, Personal.",
    side: 'right',
    align: 'start',
  },
};

const STEP_TODAY_VIEW: DriveStep = {
  element: '[href="/today"]',
  popover: {
    title: '\u{1F4C5} Today View',
    description:
      'Your daily focus list. Overdue tasks automatically roll forward here.\n\nStart every day here!',
    side: 'right',
    align: 'start',
  },
};

const STEP_DAILY_PLANNER: DriveStep = {
  element: '[href="/daily"]',
  popover: {
    title: '\u{1F4C6} Daily Planner',
    description:
      "Plan your week day-by-day. Schedule tasks for when you'll actually have time to work on them.",
    side: 'right',
    align: 'start',
  },
};

const STEP_WEEKLY_VIEW: DriveStep = {
  element: '[href="/weekly"]',
  popover: {
    title: '\u{1F4CA} Weekly View',
    description:
      'See your entire week at a glance. Perfect for big-picture planning.',
    side: 'right',
    align: 'start',
  },
};

const STEP_ALL_TASKS: DriveStep = {
  element: '[href="/all-tasks"]',
  popover: {
    title: '\u{1F4CB} All Tasks',
    description:
      'Your complete task library - see everything across all dates and workspaces. Perfect for searching and reviewing.',
    side: 'right',
    align: 'start',
  },
};

const STEP_BACKLOG: DriveStep = {
  element: '[href="/backlog"]',
  popover: {
    title: '\u{1F4DD} Backlog = Your Inbox',
    description:
      "Capture tasks WITHOUT scheduling. Schedule them when you're ready to commit to a date.\n\nThis prevents overwhelm!",
    side: 'right',
    align: 'start',
  },
};

const STEP_RECURRING_TASKS: DriveStep = {
  element: '[href="/recurring"]',
  popover: {
    title: '\u{1F504} Recurring Tasks',
    description:
      'Create templates that automatically generate tasks daily, weekly, or monthly.\n\nPerfect for: Daily review, Weekly planning, Monthly reports.',
    side: 'right',
    align: 'start',
  },
};

const STEP_CORE_CONCEPT: DriveStep = {
  popover: {
    title: '\u{1F4A1} The Secret: Scheduled \u2260 Due',
    description:
      "SCHEDULED = When you'll work on it\nDUE = Hard deadline\n\nThis is what makes Nowly different. Plan realistically without stress.\n\nPro tip: You can also set priority levels for tasks!",
    align: 'center',
  },
};

const STEP_QUICK_ADD: DriveStep = {
  element: '#quick-add-task',
  popover: {
    title: '\u26A1 Quick Add',
    description:
      'Type + hit Enter to quickly capture tasks.\n\nTry creating your first task now!',
    side: 'top',
    align: 'center',
  },
};

/**
 * Desktop tour steps (10 total).
 * Covers all main navigation items and the core concept.
 */
export const DESKTOP_TOUR_STEPS: DriveStep[] = [
  STEP_WELCOME,
  STEP_WORKSPACE_SELECTOR,
  STEP_TODAY_VIEW,
  STEP_DAILY_PLANNER,
  STEP_WEEKLY_VIEW,
  STEP_ALL_TASKS,
  STEP_BACKLOG,
  STEP_RECURRING_TASKS,
  STEP_CORE_CONCEPT,
  STEP_QUICK_ADD,
];

/**
 * Mobile tour steps (5 total).
 * Abbreviated version focusing on the most important concepts.
 * Uses named step references for maintainability.
 */
export const MOBILE_TOUR_STEPS: DriveStep[] = [
  STEP_WELCOME,
  STEP_TODAY_VIEW,
  STEP_BACKLOG,
  STEP_CORE_CONCEPT,
  STEP_QUICK_ADD,
];

/**
 * Get the appropriate tour steps based on viewport size.
 */
export function getTourSteps(isMobile: boolean): DriveStep[] {
  return isMobile ? MOBILE_TOUR_STEPS : DESKTOP_TOUR_STEPS;
}
