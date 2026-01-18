'use client';

import { RefreshCw, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatRecurrencePattern,
  formatDateRange,
} from '@/lib/utils/recurrence';
import type { RecurringTask } from '@/schemas/recurring-task';
import type { Category } from '@/types/supabase';

interface RecurringTaskWithRelations extends RecurringTask {
  category?: Category | null;
}

interface RecurringItemProps {
  recurringTask: RecurringTaskWithRelations;
  onItemClick: (item: RecurringTaskWithRelations) => void;
}

export function RecurringItem({
  recurringTask,
  onItemClick,
}: RecurringItemProps) {
  const isInactive = !recurringTask.is_active || recurringTask.is_paused;

  return (
    <div
      onClick={() => onItemClick(recurringTask)}
      className={cn(
        'group bg-background hover:bg-accent/50 flex w-full cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        isInactive && 'opacity-50'
      )}
    >
      {/* Recurring icon */}
      <RefreshCw
        className={cn(
          'mt-0.5 h-5 w-5 flex-shrink-0',
          isInactive ? 'text-muted-foreground' : 'text-blue-500'
        )}
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Title and category */}
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{recurringTask.title}</span>

          {/* Category badge */}
          {recurringTask.category && (
            <Badge
              variant="secondary"
              className="flex-shrink-0 text-xs font-medium uppercase"
              style={
                recurringTask.category.color
                  ? {
                      backgroundColor: `${recurringTask.category.color}15`,
                      color: recurringTask.category.color,
                    }
                  : undefined
              }
            >
              {recurringTask.category.name}
            </Badge>
          )}
        </div>

        {/* Recurrence pattern */}
        <div className="text-muted-foreground text-sm">
          {formatRecurrencePattern(recurringTask)}
        </div>

        {/* Date range and stats */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <span>
            {formatDateRange(recurringTask.start_date, recurringTask.end_date)}
          </span>
          <span>•</span>
          <span>Generated {recurringTask.occurrences_generated} tasks</span>
          {isInactive && (
            <>
              <span>•</span>
              <span className="text-orange-500">
                {recurringTask.is_paused ? 'Paused' : 'Inactive'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Edit button */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onItemClick(recurringTask);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
