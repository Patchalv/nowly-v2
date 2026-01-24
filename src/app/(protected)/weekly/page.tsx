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
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useUIStore } from '@/stores/ui-store';
import { WeekNavigation } from '@/components/features/weekly/WeekNavigation';
import { WeekGrid } from '@/components/features/weekly/WeekGrid';
import { DayCarousel } from '@/components/features/weekly/DayCarousel';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function WeeklyPage() {
  const [selectedWeekStart, setSelectedWeekStart] =
    useState<Date>(startOfToday());
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    refetch,
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

  // Local state for optimistic updates
  const [optimisticTasks, setOptimisticTasks] = useState<
    TaskWithRelations[] | undefined
  >(undefined);

  // Use optimistic tasks if available, otherwise use filtered tasks
  const displayTasks = optimisticTasks ?? incompleteTasks;

  // Toggle task completion mutation
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithRelations) => {
    // Immediately update UI optimistically
    setOptimisticTasks((current) => {
      const tasksToUpdate = current ?? incompleteTasks;
      if (!tasksToUpdate) return current;

      return tasksToUpdate.map((t) =>
        t.id === task.id
          ? {
              ...t,
              is_completed: !t.is_completed,
              completed_at: !t.is_completed ? new Date().toISOString() : null,
            }
          : t
      );
    });

    // Then trigger the actual mutation
    toggleComplete.mutate(task, {
      onSuccess: () => {
        // Clear optimistic state and refetch to get real data
        refetch().then(() => {
          setOptimisticTasks(undefined);
        });
      },
      onError: () => {
        // Revert optimistic update on error
        setOptimisticTasks(undefined);
      },
    });
  };

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

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

      {/* Desktop: Week Grid */}
      <div className="hidden min-h-0 flex-1 md:block">
        <WeekGrid
          weekStart={selectedWeekStart}
          tasks={displayTasks}
          showWeekend={showWeekend}
          isLoading={isLoading}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          workspaceId={selectedWorkspaceId}
        />
      </div>

      {/* Mobile: Day Carousel */}
      <div className="min-h-0 flex-1 md:hidden">
        <DayCarousel
          weekStart={selectedWeekStart}
          tasks={displayTasks}
          showWeekend={showWeekend}
          isLoading={isLoading}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          workspaceId={selectedWorkspaceId}
        />
      </div>

      {/* Task Dialog */}
      <TaskDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedTask(null);
          }
        }}
      />
    </div>
  );
}
