'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  format,
  startOfToday,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isToday,
  isTomorrow,
  isSameDay,
} from 'date-fns';
import { DaySelector } from '@/components/features/tasks/DaySelector';
import { QuickAddTask } from '@/components/features/tasks/QuickAddTask';
import { TaskList } from '@/components/features/tasks/TaskList';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { useTasksForDateRange } from '@/hooks/useTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { createClient } from '@/lib/supabase/client';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function DailyPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfToday());
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCreatedWorkspace = useRef(false);
  const supabase = createClient();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);

  // Fetch user's workspaces to get the default workspace
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const defaultWorkspace = workspaces?.[0];

  // Auto-create default workspace if none exists
  useEffect(() => {
    const createDefaultWorkspace = async () => {
      if (
        !workspacesLoading &&
        !defaultWorkspace &&
        userId &&
        !hasCreatedWorkspace.current &&
        !createWorkspace.isPending
      ) {
        hasCreatedWorkspace.current = true;
        try {
          await createWorkspace.mutateAsync([
            {
              name: 'Personal',
              user_id: userId,
              icon: '🏠',
            },
          ]);
        } catch (error) {
          console.error('Failed to create default workspace:', error);
          hasCreatedWorkspace.current = false;
        }
      }
    };
    createDefaultWorkspace();
  }, [workspacesLoading, defaultWorkspace, userId, createWorkspace]);

  // Calculate week boundaries for data fetching
  const weekBoundaries = useMemo(() => {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
    };
  }, [weekStartDate]);

  // Fetch tasks for the entire week
  const {
    data: weekTasks,
    isLoading: tasksLoading,
    isError,
    error,
    refetch,
  } = useTasksForDateRange(weekBoundaries.start, weekBoundaries.end);

  // Filter tasks for the selected day
  const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
  const tasksForSelectedDay = useMemo(() => {
    if (!weekTasks) return undefined;
    return weekTasks.filter(
      (task) => task.scheduled_date === selectedDateString
    );
  }, [weekTasks, selectedDateString]);

  // Local state for optimistic updates
  const [optimisticTasks, setOptimisticTasks] = useState<
    TaskWithRelations[] | undefined
  >(undefined);

  // Use optimistic tasks if available, otherwise use filtered tasks
  const displayTasks = optimisticTasks ?? tasksForSelectedDay;

  // Toggle task completion mutation
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithRelations) => {
    // Immediately update UI optimistically
    setOptimisticTasks((current) => {
      const tasksToUpdate = current ?? tasksForSelectedDay;
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

  const handlePreviousWeek = () => {
    setWeekStartDate((prev) => addWeeks(prev, -1));
  };

  const handleNextWeek = () => {
    setWeekStartDate((prev) => addWeeks(prev, 1));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    // Update week start if the selected date is in a different week
    const dateWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    if (
      !isSameDay(dateWeekStart, startOfWeek(weekStartDate, { weekStartsOn: 1 }))
    ) {
      setWeekStartDate(date);
    }
  };

  // Generate dynamic heading based on selected date
  const heading = useMemo(() => {
    if (isToday(selectedDate)) {
      return 'Today';
    } else if (isTomorrow(selectedDate)) {
      return 'Tomorrow';
    } else {
      return format(selectedDate, 'EEEE, d MMM');
    }
  }, [selectedDate]);

  const isLoading = workspacesLoading || tasksLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Day Selector */}
      <div className="mb-8">
        <DaySelector
          selectedDate={selectedDate}
          weekStartDate={weekStartDate}
          onSelectDate={handleSelectDate}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
        />
      </div>

      {/* Dynamic Heading */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold">{heading}</h1>
      </div>

      {/* Quick Add Task */}
      {defaultWorkspace && (
        <div className="mb-6">
          <QuickAddTask
            scheduledDate={selectedDateString}
            workspaceId={defaultWorkspace.id}
          />
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <TaskList
          tasks={displayTasks}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          onRetry={refetch}
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
