'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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

  // Tasks list
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
