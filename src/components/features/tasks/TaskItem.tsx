'use client';

import { Calendar, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface TaskItemProps {
  task: TaskWithRelations;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  onReschedule?: (task: TaskWithRelations) => void;
}

export function TaskItem({
  task,
  onToggleComplete,
  onTaskClick,
  onReschedule,
}: TaskItemProps) {
  return (
    <div
      className={cn(
        'group bg-background hover:bg-accent/50 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        task.is_completed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.is_completed || false}
        onCheckedChange={() => onToggleComplete(task)}
        className="flex-shrink-0"
      />

      {/* Task content */}
      <button
        onClick={() => onTaskClick(task)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className={cn(
            'truncate font-medium',
            task.is_completed && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </span>

        {/* Category badge */}
        {task.category && (
          <Badge
            variant="secondary"
            className={cn(
              'flex-shrink-0 text-xs font-medium uppercase',
              task.category.color &&
                `bg-${task.category.color}-100 text-${task.category.color}-700`
            )}
            style={
              task.category.color
                ? {
                    backgroundColor: `${task.category.color}15`,
                    color: task.category.color,
                  }
                : undefined
            }
          >
            {task.category.name}
          </Badge>
        )}

        {/* Recurring icon */}
        {task.recurring_task_id && (
          <RefreshCw className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
        )}
      </button>

      {/* Reschedule button */}
      {onReschedule && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReschedule(task)}
          className="text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <Calendar className="mr-1.5 h-4 w-4" />
          Reschedule
        </Button>
      )}
    </div>
  );
}
