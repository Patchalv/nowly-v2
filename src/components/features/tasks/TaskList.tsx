'use client';

import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TaskItem } from './TaskItem';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface TaskListProps {
  tasks?: TaskWithRelations[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  onRetry?: () => void;
}

export function TaskList({
  tasks,
  isLoading,
  isError,
  error,
  onToggleComplete,
  onTaskClick,
  onRetry,
}: TaskListProps) {
  const [showCompleted, setShowCompleted] = useState(true);

  // Separate completed and uncompleted tasks
  const { uncompletedTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { uncompletedTasks: [], completedTasks: [] };

    return {
      uncompletedTasks: tasks.filter((task) => !task.is_completed),
      completedTasks: tasks.filter((task) => task.is_completed),
    };
  }, [tasks]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
          >
            <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-8 w-24 flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <p className="text-destructive text-lg font-medium">
            Failed to load tasks
          </p>
          <p className="text-muted-foreground text-sm">
            {error?.message || 'Something went wrong'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-4">
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <p className="text-lg font-medium">No tasks scheduled</p>
          <p className="text-muted-foreground text-sm">
            Add a task above to get started
          </p>
        </div>
      </div>
    );
  }

  // Tasks list with separated sections
  return (
    <div className="space-y-6">
      {/* Uncompleted tasks section */}
      {uncompletedTasks.length > 0 && (
        <div className="space-y-2">
          {uncompletedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}

      {/* Completed tasks section */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          {/* Completed section header */}
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
              Completed
              <span className="text-xs">({completedTasks.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Show completed
              </span>
              <Switch
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
            </div>
          </div>

          {/* Completed tasks list */}
          {showCompleted && (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onTaskClick={onTaskClick}
                  hideReschedule
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state when all tasks are completed */}
      {uncompletedTasks.length === 0 && completedTasks.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">
            All tasks completed! 🎉
          </p>
        </div>
      )}
    </div>
  );
}
