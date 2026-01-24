import {
  startOfWeek,
  endOfWeek,
  format,
  addWeeks,
  subWeeks,
  startOfToday,
  isSameWeek,
  isThisWeek,
} from 'date-fns';

/**
 * Generate human-readable week label
 * Examples: "This Week (Jan 20-26)", "Next Week (Jan 27-Feb 2)", "Dec 30-Jan 5, 2024/2025"
 */
export function getWeekLabel(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const startMonth = format(weekStart, 'MMM');
  const endMonth = format(weekEnd, 'MMM');
  const startDay = format(weekStart, 'd');
  const endDay = format(weekEnd, 'd');
  const startYear = format(weekStart, 'yyyy');
  const endYear = format(weekEnd, 'yyyy');

  // Format date range (handle month boundary)
  const dateRange =
    startMonth === endMonth
      ? `${startMonth} ${startDay}-${endDay}`
      : `${startMonth} ${startDay}-${endMonth} ${endDay}`;

  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return `This Week (${dateRange})`;
  }

  const nextWeekStart = addWeeks(startOfToday(), 1);
  if (isSameWeek(date, nextWeekStart, { weekStartsOn: 1 })) {
    return `Next Week (${dateRange})`;
  }

  const lastWeekStart = subWeeks(startOfToday(), 1);
  if (isSameWeek(date, lastWeekStart, { weekStartsOn: 1 })) {
    return `Last Week (${dateRange})`;
  }

  // Handle year boundary (e.g., Dec 30 - Jan 5 spanning two years)
  const yearLabel =
    startYear !== endYear ? `${startYear}/${endYear}` : startYear;

  return `${dateRange}, ${yearLabel}`;
}
