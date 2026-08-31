import {
  format,
  addDays,
  addMonths,
  addYears,
  addWeeks,
  setMonth,
  setDate,
  startOfDay,
  startOfMonth,
  endOfMonth,
  getDay,
  differenceInCalendarWeeks,
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
 * Get full weekday name from day index (0=Mon, 6=Sun)
 */
function getWeekdayName(dayIndex: number): string {
  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return days[dayIndex] || '';
}

/**
 * Get ordinal word for week of month (-1=last, 1-5=first through fifth)
 */
function getOrdinalWord(week: number): string {
  if (week === -1) return 'last';
  const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
  return ordinals[week] || '';
}

/**
 * Converts recurrence configuration to human-readable description
 * Examples:
 * - "2 days after completion"
 * - "Every day"
 * - "Every 3 days"
 * - "Every Monday & Friday"
 * - "Every 2 weeks on Friday"
 * - "5th of each month"
 * - "15th of every 3 months"
 * - "First Sunday of each month"
 * - "Last Friday of every 2 months"
 * - "February 14 every year"
 */
export function formatRecurrencePattern(
  recurringTask: Partial<RecurringTask>
): string {
  const {
    recurrence_type,
    interval_days,
    interval_weeks,
    interval_months,
    days_of_week,
    day_of_month,
    week_of_month,
    month_of_year,
  } = recurringTask;

  switch (recurrence_type) {
    case 'interval_from_completion':
      return `${interval_days} ${interval_days === 1 ? 'day' : 'days'} after completion`;

    case 'fixed_daily':
      return interval_days === 1 ? 'Every day' : `Every ${interval_days} days`;

    case 'fixed_weekly': {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const selectedDays = (days_of_week ?? [])
        .filter((d) => dayNames[d] !== undefined)
        .map((d) => dayNames[d])
        .join(' & ');
      const weekInterval = interval_weeks || 1;

      // Guard against empty days_of_week
      if (!selectedDays) {
        return weekInterval === 1
          ? 'Every week'
          : `Every ${weekInterval} weeks`;
      }
      if (weekInterval === 1) {
        return `Every ${selectedDays}`;
      }
      return `Every ${weekInterval} weeks on ${selectedDays}`;
    }

    case 'fixed_monthly': {
      const monthInterval = interval_months || 1;
      const monthText =
        monthInterval === 1 ? 'each month' : `every ${monthInterval} months`;

      // Check if using Nth weekday pattern
      if (
        week_of_month !== undefined &&
        week_of_month !== null &&
        days_of_week &&
        days_of_week.length > 0
      ) {
        const weekText = getOrdinalWord(week_of_month);
        const dayText = getWeekdayName(days_of_week[0]);
        return `${weekText.charAt(0).toUpperCase() + weekText.slice(1)} ${dayText} of ${monthText}`;
      }

      // Day of month pattern
      if (day_of_month === 31) {
        return `Last day of ${monthText}`;
      }
      const dayNum = day_of_month ?? 1;
      return `${dayNum}${getOrdinalSuffix(dayNum)} of ${monthText}`;
    }

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
 * Convert JavaScript getDay() (0=Sun, 6=Sat) to our format (0=Mon, 6=Sun)
 */
function convertJsDayToOurFormat(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Find the next occurrence of specific weekday(s) with week interval
 */
function findNextWeekdayWithInterval(
  fromDate: Date,
  daysOfWeek: number[],
  intervalWeeks: number
): Date {
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
  let tempDate = addDays(fromDate, 1); // Start from next day
  const weekInterval = intervalWeeks || 1;

  // For interval > 1, we need to track when we cross week boundaries
  const baseWeekStart = addDays(
    fromDate,
    -convertJsDayToOurFormat(getDay(fromDate))
  );

  for (let i = 0; i < 60; i++) {
    // Safety: max 60 days
    const adjustedDay = convertJsDayToOurFormat(getDay(tempDate));

    if (sortedDays.includes(adjustedDay)) {
      // Check if this is a valid week for the interval
      if (weekInterval === 1) {
        return tempDate;
      }

      const currentWeekStart = addDays(
        tempDate,
        -convertJsDayToOurFormat(getDay(tempDate))
      );
      // Use differenceInCalendarWeeks to avoid DST off-by-one errors
      const weeksPassed = differenceInCalendarWeeks(
        currentWeekStart,
        baseWeekStart,
        { weekStartsOn: 1 } // Monday
      );

      // Use modulo to ensure proper interval (biweekly = weeks 0, 2, 4...)
      if (weeksPassed % weekInterval === 0) {
        return tempDate;
      }
    }

    tempDate = addDays(tempDate, 1);
  }

  // Fallback: just add interval weeks
  return addWeeks(fromDate, weekInterval);
}

/**
 * Find the Nth occurrence of a weekday in a given month
 * @param year - The year
 * @param month - The month (0-indexed like JS Date)
 * @param dayOfWeek - Our format: 0=Mon, 6=Sun
 * @param nth - Which occurrence: 1-5 for 1st-5th, -1 for last
 */
function findNthWeekdayOfMonth(
  year: number,
  month: number,
  dayOfWeek: number,
  nth: number
): Date | null {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = endOfMonth(firstOfMonth);

  if (nth === -1) {
    // Find last occurrence - start from end of month
    let date = lastOfMonth;
    while (date >= firstOfMonth) {
      if (convertJsDayToOurFormat(getDay(date)) === dayOfWeek) {
        return date;
      }
      date = addDays(date, -1);
    }
    return null;
  }

  // Find nth occurrence - start from beginning of month
  let count = 0;
  let date = firstOfMonth;

  while (date <= lastOfMonth) {
    if (convertJsDayToOurFormat(getDay(date)) === dayOfWeek) {
      count++;
      if (count === nth) {
        return date;
      }
    }
    date = addDays(date, 1);
  }

  // If nth doesn't exist (e.g., 5th Monday), return last occurrence
  // Guard against infinite recursion if dayOfWeek is invalid
  if (nth === -1) {
    // Already searching for last - dayOfWeek doesn't exist in this month
    return null;
  }
  return findNthWeekdayOfMonth(year, month, dayOfWeek, -1);
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
    interval_weeks,
    interval_months,
    days_of_week,
    day_of_month,
    week_of_month,
    month_of_year,
  } = recurringTask;

  switch (recurrence_type) {
    case 'interval_from_completion':
    case 'fixed_daily':
      return addDays(baseDate, interval_days || 1);

    case 'fixed_weekly':
      return findNextWeekdayWithInterval(
        baseDate,
        days_of_week || [],
        interval_weeks || 1
      );

    case 'fixed_monthly': {
      const monthInterval = interval_months || 1;
      const targetMonth = addMonths(startOfMonth(baseDate), monthInterval);

      // Check if using Nth weekday pattern
      if (
        week_of_month !== undefined &&
        week_of_month !== null &&
        days_of_week &&
        days_of_week.length > 0
      ) {
        const result = findNthWeekdayOfMonth(
          targetMonth.getFullYear(),
          targetMonth.getMonth(),
          days_of_week[0],
          week_of_month
        );
        return result || targetMonth;
      }

      // Day of month pattern
      if (day_of_month === 31) {
        // Last day of month
        return endOfMonth(targetMonth);
      }
      // Clamp to last day of month to handle short months (e.g., Feb 30 -> Feb 28)
      const targetDay = day_of_month || 1;
      const lastDayOfMonth = endOfMonth(targetMonth).getDate();
      return setDate(targetMonth, Math.min(targetDay, lastDayOfMonth));
    }

    case 'fixed_yearly': {
      let nextYear = addYears(baseDate, 1);
      if (month_of_year) {
        nextYear = setMonth(nextYear, month_of_year - 1);
      }
      if (day_of_month) {
        // Clamp to last day of month to handle short months (e.g., Feb 30 -> Feb 28)
        const lastDay = endOfMonth(nextYear).getDate();
        nextYear = setDate(nextYear, Math.min(day_of_month, lastDay));
      }
      return nextYear;
    }

    default:
      return baseDate;
  }
}

/**
 * Find the next weekday occurrence on or after (inclusive of) a given date,
 * honouring a week interval. Unlike findNextWeekdayWithInterval (which
 * always starts searching the day *after* fromDate, since it advances from
 * a known prior occurrence), this treats fromDate's own week as interval 0
 * so it can return fromDate itself when it already matches the pattern.
 */
function findNextWeekdayOnOrAfterInclusive(
  fromDate: Date,
  daysOfWeek: number[],
  intervalWeeks: number
): Date {
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
  let tempDate = fromDate;
  const weekInterval = intervalWeeks || 1;

  const baseWeekStart = addDays(
    fromDate,
    -convertJsDayToOurFormat(getDay(fromDate))
  );

  for (let i = 0; i < 60; i++) {
    // Safety: max 60 days
    const adjustedDay = convertJsDayToOurFormat(getDay(tempDate));

    if (sortedDays.includes(adjustedDay)) {
      if (weekInterval === 1) {
        return tempDate;
      }

      const currentWeekStart = addDays(
        tempDate,
        -convertJsDayToOurFormat(getDay(tempDate))
      );
      const weeksPassed = differenceInCalendarWeeks(
        currentWeekStart,
        baseWeekStart,
        { weekStartsOn: 1 } // Monday
      );

      if (weeksPassed % weekInterval === 0) {
        return tempDate;
      }
    }

    tempDate = addDays(tempDate, 1);
  }

  // Fallback: just add interval weeks
  return addWeeks(fromDate, weekInterval);
}

/**
 * Find the next monthly occurrence on or after (inclusive of) a given date.
 * Treats fromDate's own month as interval 0, so a month whose target day
 * hasn't happened yet this cycle is considered before jumping a full
 * interval ahead.
 */
function findNextMonthlyOnOrAfterInclusive(
  fromDate: Date,
  dayOfMonth: number | null | undefined,
  weekOfMonth: number | null | undefined,
  daysOfWeek: number[] | null | undefined,
  intervalMonths: number
): Date {
  const monthInterval = intervalMonths || 1;
  const baseMonth = startOfMonth(fromDate);
  const today = startOfDay(fromDate);

  const usesNthWeekday =
    weekOfMonth !== undefined &&
    weekOfMonth !== null &&
    daysOfWeek !== undefined &&
    daysOfWeek !== null &&
    daysOfWeek.length > 0;

  for (let i = 0; i < 60; i += monthInterval) {
    const candidateMonth = addMonths(baseMonth, i);
    let candidateDate: Date | null;

    if (usesNthWeekday) {
      candidateDate = findNthWeekdayOfMonth(
        candidateMonth.getFullYear(),
        candidateMonth.getMonth(),
        daysOfWeek![0],
        weekOfMonth!
      );
    } else if (dayOfMonth === 31) {
      candidateDate = endOfMonth(candidateMonth);
    } else {
      const targetDay = dayOfMonth || 1;
      const lastDayOfMonth = endOfMonth(candidateMonth).getDate();
      candidateDate = setDate(
        candidateMonth,
        Math.min(targetDay, lastDayOfMonth)
      );
    }

    if (candidateDate && candidateDate >= today) {
      return candidateDate;
    }
  }

  // Fallback: shouldn't be reached in practice (60 iterations covers 5+ years)
  return addMonths(fromDate, monthInterval);
}

/**
 * Find the next yearly occurrence on or after (inclusive of) a given date.
 * Checks fromDate's own year first before advancing.
 */
function findNextYearlyOnOrAfterInclusive(
  fromDate: Date,
  monthOfYear: number | null | undefined,
  dayOfMonth: number | null | undefined
): Date {
  const today = startOfDay(fromDate);

  for (let i = 0; i < 6; i++) {
    let candidate = new Date(fromDate.getFullYear() + i, 0, 1);
    if (monthOfYear) {
      candidate = setMonth(candidate, monthOfYear - 1);
    }
    if (dayOfMonth) {
      const lastDay = endOfMonth(candidate).getDate();
      candidate = setDate(candidate, Math.min(dayOfMonth, lastDay));
    }
    if (candidate >= today) {
      return candidate;
    }
  }

  // Fallback: shouldn't be reached in practice (6 years checked)
  return addYears(fromDate, 1);
}

/**
 * Calculates the next occurrence at or after (inclusive of) a reference
 * date, given a recurrence pattern. Used when a template's recurrence rule
 * is edited: unlike calculateNextTaskDate (which advances strictly past a
 * known prior occurrence), this answers "if this pattern started fresh
 * today, what's the first date it lands on?" so the cursor never rewinds
 * into the past and never skips a today-that-already-matches.
 *
 * interval_days-based types (fixed_daily, interval_from_completion) have no
 * calendar anchor once the pattern changes - there's no "correct" prior
 * cursor to count from other than the one we're deliberately not using - so
 * the new cycle simply starts on the reference date itself.
 */
export function calculateNextOccurrenceOnOrAfter(
  recurringTask: Partial<RecurringTask>,
  referenceDate: Date
): Date {
  const {
    recurrence_type,
    interval_weeks,
    interval_months,
    days_of_week,
    day_of_month,
    week_of_month,
    month_of_year,
  } = recurringTask;

  const today = startOfDay(referenceDate);

  switch (recurrence_type) {
    case 'interval_from_completion':
    case 'fixed_daily':
      return today;

    case 'fixed_weekly':
      return findNextWeekdayOnOrAfterInclusive(
        today,
        days_of_week || [],
        interval_weeks || 1
      );

    case 'fixed_monthly':
      return findNextMonthlyOnOrAfterInclusive(
        today,
        day_of_month,
        week_of_month,
        days_of_week,
        interval_months || 1
      );

    case 'fixed_yearly':
      return findNextYearlyOnOrAfterInclusive(
        today,
        month_of_year,
        day_of_month
      );

    default:
      return today;
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
        interval_weeks: 1,
        days_of_week: [0], // Monday
        start_date: todayStr,
        next_due_date: todayStr,
      };

    case 'fixed_monthly':
      return {
        recurrence_type: 'fixed_monthly',
        interval_months: 1,
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
