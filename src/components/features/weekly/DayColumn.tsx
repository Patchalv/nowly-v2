'use client';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskCard } from '@/components/features/weekly/TaskCard';
import { QuickAddTask } from '@/components/features/tasks/QuickAddTask';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface DayColumnProps {
  date: Date;
  tasks: TaskWithRelations[];
  isToday: boolean;
  isLoading: boolean;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  workspaceId: string | null;
}

/**
 * Single day column with header, scrollable task list, and quick add
 * Uses flex-based layout for proper height management
 */
export function DayColumn({
  date,
  tasks,
  isToday,
  isLoading,
  onToggleComplete,
  onTaskClick,
  workspaceId,
}: DayColumnProps) {
  const dateString = format(date, 'yyyy-MM-dd');

  return (
    <div
      className={cn(
        'bg-card flex h-full flex-col rounded-lg border',
        isToday && 'border-primary border-2'
      )}
    >
      {/* Day Header - fixed height */}
      <div
        className={cn(
          'flex-shrink-0 border-b p-3 text-center',
          isToday && 'bg-primary/5'
        )}
      >
        <div className="text-muted-foreground text-xs font-medium uppercase">
          {format(date, 'EEE')}
        </div>
        <div className={cn('text-xl font-semibold', isToday && 'text-primary')}>
          {format(date, 'd')}
        </div>
        <div className="text-muted-foreground text-xs">
          {format(date, 'MMM')}
        </div>
      </div>

      {/* Task List - scrollable, fills available space */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-full min-h-[80px] items-center justify-center">
            <p className="text-muted-foreground text-sm">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={() => onToggleComplete(task)}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>

      {/* Quick Add at Bottom - fixed height */}
      <div className="flex-shrink-0 border-t p-2">
        <QuickAddTask scheduledDate={dateString} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
