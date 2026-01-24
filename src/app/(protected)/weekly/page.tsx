'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { useTasksForDateRange } from '@/hooks/useTasks';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useUIStore } from '@/stores/ui-store';
import { WeekNavigation } from '@/components/features/weekly/WeekNavigation';

export default function WeeklyPage() {
  const [selectedWeekStart, setSelectedWeekStart] =
    useState<Date>(startOfToday());

  // Zustand stores
  const { showWeekend, setShowWeekend } = useUIStore();
  const { selectedWorkspaceId } = useWorkspaceStore();

  // Calculate week boundaries
  const weekBoundaries = useMemo(() => {
    const weekStart = startOfWeek(selectedWeekStart, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
    };
  }, [selectedWeekStart]);

  // Fetch tasks for the week
  const {
    data: weekTasks,
    isLoading,
    isError,
    error,
  } = useTasksForDateRange(
    weekBoundaries.start,
    weekBoundaries.end,
    selectedWorkspaceId
  );

  // Filter to only show incomplete tasks (client-side)
  const incompleteTasks = useMemo(() => {
    if (!weekTasks) return [];
    return weekTasks.filter((task) => !task.is_completed);
  }, [weekTasks]);

  // Navigation handlers
  const handlePreviousWeek = () => {
    setSelectedWeekStart((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setSelectedWeekStart((prev) => addWeeks(prev, 1));
  };

  const handleGoToToday = () => {
    setSelectedWeekStart(startOfToday());
  };

  const handleSelectDate = (date: Date) => {
    setSelectedWeekStart(date);
  };

  const handleToggleWeekend = () => {
    setShowWeekend(!showWeekend);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col px-4 py-6">
      {/* Header Section */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        <h1 className="text-4xl font-bold">Weekly</h1>

        <WeekNavigation
          selectedWeekStart={selectedWeekStart}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
          onGoToToday={handleGoToToday}
          onSelectDate={handleSelectDate}
          showWeekend={showWeekend}
          onToggleWeekend={handleToggleWeekend}
        />
      </div>

      {/* Content placeholder - will be replaced with WeekGrid/DayCarousel in Phase 3 */}
      <div className="bg-card min-h-0 flex-1 rounded-lg border p-4">
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong>Phase 2 Complete - Navigation Wired Up</strong>
          </p>
          <p>
            Week: {weekBoundaries.start} to {weekBoundaries.end}
          </p>
          <p>Show Weekend: {showWeekend ? 'Yes' : 'No'}</p>
          <p>Workspace: {selectedWorkspaceId || 'Master (all)'}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          {isError && (
            <p className="text-destructive">Error: {error?.message}</p>
          )}
          <p>Tasks fetched: {incompleteTasks.length}</p>

          {incompleteTasks.length > 0 && (
            <ul className="mt-4 list-inside list-disc">
              {incompleteTasks.slice(0, 5).map((task) => (
                <li key={task.id}>
                  {task.title} - {task.scheduled_date}
                </li>
              ))}
              {incompleteTasks.length > 5 && (
                <li>...and {incompleteTasks.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
