'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Flag, RefreshCw } from 'lucide-react';
import { format, isPast, isToday, startOfToday } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import { toast } from 'sonner';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface TaskItemProps {
  task: TaskWithRelations;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
}

export function TaskItem({
  task,
  onToggleComplete,
  onTaskClick,
}: TaskItemProps) {
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const updateTask = useUpdateTask();

  const handleReschedule = async (date: Date | undefined) => {
    if (!date) return;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        scheduled_date: format(date, 'yyyy-MM-dd'),
      });
      setIsRescheduleOpen(false);
      toast.success('Task rescheduled', {
        description: format(date, 'EEEE, MMMM d'),
      });
    } catch (error) {
      toast.error('Failed to reschedule task', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  // Check if due date is overdue
  const isDueOverdue = task.due_date
    ? isPast(new Date(task.due_date)) || isToday(new Date(task.due_date))
    : false;

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
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        {/* Title and badges */}
        <div className="flex w-full items-center gap-2">
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
        </div>

        {/* Metadata row: due date and recurring icon */}
        {(task.due_date || task.recurring_task_id) && (
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            {/* Due date */}
            {task.due_date && (
              <div
                className={cn(
                  'flex items-center gap-1',
                  isDueOverdue &&
                    !task.is_completed &&
                    'text-destructive font-medium'
                )}
              >
                <Flag className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'MMM d')}</span>
              </div>
            )}

            {/* Recurring icon */}
            {task.recurring_task_id && (
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>Repeats</span>
              </div>
            )}
          </div>
        )}
      </button>

      {/* Reschedule button with calendar popover */}
      <Popover open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsRescheduleOpen(true);
            }}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={
              task.scheduled_date ? new Date(task.scheduled_date) : undefined
            }
            onSelect={handleReschedule}
            initialFocus
            disabled={(date) => date < startOfToday()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
