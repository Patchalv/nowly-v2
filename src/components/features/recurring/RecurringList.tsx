'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RecurringItem } from './RecurringItem';
import type { RecurringTask } from '@/schemas/recurring-task';
import type { Category } from '@/types/supabase';

interface RecurringTaskWithRelations extends RecurringTask {
  category?: Category | null;
}

interface RecurringListProps {
  recurringTasks?: RecurringTaskWithRelations[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onItemClick: (item: RecurringTaskWithRelations) => void;
  onRetry?: () => void;
}

export function RecurringList({
  recurringTasks,
  isLoading,
  isError,
  error,
  onItemClick,
  onRetry,
}: RecurringListProps) {
  const [showInactive, setShowInactive] = useState(false);

  // Separate active and inactive recurring tasks
  const { activeTasks, inactiveTasks } = useMemo(() => {
    if (!recurringTasks) return { activeTasks: [], inactiveTasks: [] };

    return {
      activeTasks: recurringTasks.filter(
        (task) => task.is_active && !task.is_paused
      ),
      inactiveTasks: recurringTasks.filter(
        (task) => !task.is_active || task.is_paused
      ),
    };
  }, [recurringTasks]);

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
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-8 flex-shrink-0" />
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
            Failed to load recurring tasks
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
  if (!recurringTasks || recurringTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="space-y-2">
          <p className="text-lg font-medium">No recurring tasks yet</p>
          <p className="text-muted-foreground text-sm">
            Add a recurring task above to automatically create tasks
          </p>
        </div>
      </div>
    );
  }

  // List with separated sections
  return (
    <div className="space-y-6">
      {/* Active recurring tasks section */}
      {activeTasks.length > 0 && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <RecurringItem
              key={task.id}
              recurringTask={task}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}

      {/* Empty state when all tasks are inactive */}
      {activeTasks.length === 0 && inactiveTasks.length > 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm">
            All recurring tasks are inactive
          </p>
        </div>
      )}

      {/* Inactive recurring tasks section */}
      {inactiveTasks.length > 0 && (
        <div className="space-y-3">
          {/* Inactive section header */}
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm font-medium tracking-wide uppercase transition-colors"
          >
            {showInactive ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Inactive</span>
            <span className="text-xs">({inactiveTasks.length})</span>
          </button>

          {/* Inactive tasks list */}
          {showInactive && (
            <div className="space-y-2">
              {inactiveTasks.map((task) => (
                <RecurringItem
                  key={task.id}
                  recurringTask={task}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
