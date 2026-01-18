'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  isSameDay,
  startOfToday,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  selectedDate: Date;
  weekStartDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function DaySelector({
  selectedDate,
  weekStartDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
}: DaySelectorProps) {
  // Get all days in the current week (Mon-Sun)
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // 1 = Monday
  const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const today = startOfToday();

  return (
    <div className="flex items-center gap-2">
      {/* Previous week button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousWeek}
        className="flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Days container */}
      <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
        {daysInWeek.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex min-w-[80px] flex-col items-center justify-center rounded-lg px-4 py-3 transition-colors',
                'hover:bg-accent/50 border',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                isToday && !isSelected && 'border-primary'
              )}
            >
              <span className="text-xs font-medium uppercase">
                {format(day, 'EEE')}
              </span>
              <span className="mt-1 text-lg font-semibold">
                {format(day, 'd')}
              </span>
              <span className="mt-1 text-xs">{format(day, 'MMM')}</span>
            </button>
          );
        })}
      </div>

      {/* Next week button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onNextWeek}
        className="flex-shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
