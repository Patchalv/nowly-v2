import { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';

/**
 * Generate array of days for a week, optionally filtering weekends
 * @param weekStart - Any date within the target week
 * @param showWeekend - Whether to include Saturday and Sunday
 * @returns Array of Date objects for the week (Monday-Sunday or Monday-Friday)
 */
export function useWeekDays(weekStart: Date, showWeekend: boolean): Date[] {
  return useMemo(() => {
    const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({
      start: weekStartDate,
      end: weekEndDate,
    });

    if (showWeekend) return allDays;

    // Filter out Saturday (6) and Sunday (0)
    return allDays.filter((day) => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  }, [weekStart, showWeekend]);
}

/**
 * Get the index of today within the days array, or 0 if not found
 * @param days - Array of Date objects
 * @returns Index of today, or 0 if today is not in the array
 */
export function getTodayIndex(days: Date[]): number {
  const index = days.findIndex((day) => isToday(day));
  return index !== -1 ? index : 0;
}
