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
    <div className="flex items-center justify-center gap-0.5 sm:gap-2">
      {/* Previous week button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPreviousWeek}
        className="h-7 w-7 flex-shrink-0 sm:h-10 sm:w-10"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Days container */}
      <div className="flex gap-0.5 sm:gap-2">
        {daysInWeek.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex min-w-[40px] flex-col items-center justify-center rounded-lg px-1.5 py-1.5 transition-colors sm:min-w-[80px] sm:px-4 sm:py-3',
                'hover:bg-accent/50 border',
                isSelected &&
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                isToday && !isSelected && 'border-primary'
              )}
            >
              <span className="text-[10px] font-medium uppercase sm:text-xs">
                {format(day, 'EEE')}
              </span>
              <span className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-lg">
                {format(day, 'd')}
              </span>
              <span className="mt-0.5 text-[10px] sm:mt-1 sm:text-xs">
                {format(day, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Next week button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onNextWeek}
        className="h-7 w-7 flex-shrink-0 sm:h-10 sm:w-10"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
