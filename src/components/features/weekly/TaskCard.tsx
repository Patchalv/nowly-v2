'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface TaskCardProps {
  task: TaskWithRelations;
  onToggleComplete: () => void;
  onClick: () => void;
}

/**
 * Compact task card for weekly grid columns
 * Shows: checkbox, title (2-line clamp), category badge
 * Hides: due date, recurring icon (available in TaskDialog)
 */
export function TaskCard({ task, onToggleComplete, onClick }: TaskCardProps) {
  return (
    <div
      className={cn(
        'group bg-background hover:bg-accent/50 flex items-start gap-2 rounded-md border p-2 transition-colors',
        task.is_completed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.is_completed || false}
        onCheckedChange={() => onToggleComplete()}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 flex-shrink-0"
      />

      {/* Task content - clickable */}
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
      >
        {/* Title */}
        <span
          className={cn(
            'line-clamp-2 text-sm leading-tight font-medium',
            task.is_completed && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </span>

        {/* Category badge */}
        {task.category && (
          <Badge
            variant="secondary"
            className="h-5 max-w-full truncate px-1.5 text-[10px] font-medium uppercase"
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
      </button>
    </div>
  );
}
