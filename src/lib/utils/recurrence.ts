import {
  format,
  addDays,
  addMonths,
  addYears,
  setMonth,
  setDate,
} from 'date-fns';
import type { RecurringTask } from '@/schemas/recurring-task';

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Get month name from month number (1-12)
 */
function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || '';
}

/**
 * Converts recurrence configuration to human-readable description
 * Examples:
 * - "2 days after completion"
 * - "Every day"
 * - "Every 3 days"
 * - "Every Monday & Friday"
 * - "5th of each month"
 * - "February 14 every year"
 */
export function formatRecurrencePattern(
  recurringTask: Partial<RecurringTask>
): string {
  const {
    recurrence_type,
    interval_days,
    days_of_week,
    day_of_month,
    month_of_year,
  } = recurringTask;

  switch (recurrence_type) {
    case 'interval_from_completion':
      return `${interval_days} ${interval_days === 1 ? 'day' : 'days'} after completion`;

    case 'fixed_daily':
      return interval_days === 1 ? 'Every day' : `Every ${interval_days} days`;

    case 'fixed_weekly': {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const selectedDays = days_of_week?.map((d) => dayNames[d]).join(' & ');
      return `Every ${selectedDays}`;
    }

    case 'fixed_monthly':
      if (day_of_month === 31) {
        return 'Last day of each month';
      }
      return `${day_of_month}${getOrdinalSuffix(day_of_month!)} of each month`;

    case 'fixed_yearly': {
      if (!month_of_year || !day_of_month) return 'Yearly';
      const monthName = getMonthName(month_of_year);
      return `${monthName} ${day_of_month}${getOrdinalSuffix(day_of_month)} every year`;
    }

    default:
      return 'Custom';
  }
}

/**
 * Formats the date range for recurring task
 * Examples:
 * - "Started Jan 15, 2024"
 * - "Jan 15 - Mar 30, 2024"
 */
export function formatDateRange(
  startDate: string,
  endDate: string | null
): string {
  const start = format(new Date(startDate), 'MMM d, yyyy');

  if (!endDate) {
    return `Started ${start}`;
  }

  const end = format(new Date(endDate), 'MMM d, yyyy');
  return `${start} - ${end}`;
}

/**
 * Find the next occurrence of a specific weekday from a given date
 */
function findNextWeekday(fromDate: Date, daysOfWeek: number[]): Date {
  const currentDay = fromDate.getDay();
  const adjustedCurrentDay = currentDay === 0 ? 6 : currentDay - 1; // Convert to 0=Mon, 6=Sun

  // Sort days to find the next occurrence
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

  // Find next day in current week
  for (const targetDay of sortedDays) {
    if (targetDay > adjustedCurrentDay) {
      const daysToAdd = targetDay - adjustedCurrentDay;
      return addDays(fromDate, daysToAdd);
    }
  }

  // If no day found in current week, go to first day of next week
  const firstDay = sortedDays[0];
  const daysToAdd = 7 - adjustedCurrentDay + firstDay;
  return addDays(fromDate, daysToAdd);
}

/**
 * Calculates the next task date based on recurrence pattern
 * Used when creating first task or after task completion
 */
export function calculateNextTaskDate(
  recurringTask: Partial<RecurringTask>,
  fromDate?: Date
): Date {
  const baseDate = fromDate || new Date(recurringTask.start_date!);
  const {
    recurrence_type,
    interval_days,
    days_of_week,
    day_of_month,
    month_of_year,
  } = recurringTask;

  switch (recurrence_type) {
    case 'interval_from_completion':
    case 'fixed_daily':
      return addDays(baseDate, interval_days || 1);

    case 'fixed_weekly':
      return findNextWeekday(baseDate, days_of_week || []);

    case 'fixed_monthly': {
      let nextMonth = addMonths(baseDate, 1);
      // Handle last day of month
      if (day_of_month === 31) {
        const lastDay = new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth() + 1,
          0
        ).getDate();
        nextMonth = setDate(nextMonth, lastDay);
      } else {
        nextMonth = setDate(nextMonth, day_of_month || 1);
      }
      return nextMonth;
    }

    case 'fixed_yearly': {
      let nextYear = addYears(baseDate, 1);
      if (month_of_year) {
        nextYear = setMonth(nextYear, month_of_year - 1);
      }
      if (day_of_month) {
        nextYear = setDate(nextYear, day_of_month);
      }
      return nextYear;
    }

    default:
      return baseDate;
  }
}

/**
 * Get default recurrence configuration based on type
 */
export function getDefaultRecurrenceConfig(
  recurrenceType: RecurringTask['recurrence_type']
): Partial<RecurringTask> {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  switch (recurrenceType) {
    case 'fixed_daily':
      return {
        recurrence_type: 'fixed_daily',
        interval_days: 1,
        start_date: todayStr,
        next_due_date: todayStr,
      };

    case 'fixed_weekly':
      return {
        recurrence_type: 'fixed_weekly',
        days_of_week: [0], // Monday
        start_date: todayStr,
        next_due_date: todayStr,
      };

    case 'fixed_monthly':
      return {
        recurrence_type: 'fixed_monthly',
        day_of_month: 1,
        start_date: todayStr,
        next_due_date: todayStr,
      };

    case 'fixed_yearly':
      return {
        recurrence_type: 'fixed_yearly',
        month_of_year: today.getMonth() + 1,
        day_of_month: today.getDate(),
        start_date: todayStr,
        next_due_date: todayStr,
      };

    case 'interval_from_completion':
    default:
      return {
        recurrence_type: 'interval_from_completion',
        interval_days: 2,
        start_date: todayStr,
        next_due_date: todayStr,
      };
  }
}
