'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getWeekLabel } from '@/lib/week-utils';

interface WeekNavigationProps {
  selectedWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  onSelectDate: (date: Date) => void;
  showWeekend: boolean;
  onToggleWeekend: () => void;
}

export function WeekNavigation({
  selectedWeekStart,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
  onSelectDate,
  showWeekend,
  onToggleWeekend,
}: WeekNavigationProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onSelectDate(date);
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Week Range with Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPreviousWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="min-w-[200px] text-center font-semibold">
          {getWeekLabel(selectedWeekStart)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Today Button */}
        <Button variant="outline" size="sm" onClick={onGoToToday}>
          Today
        </Button>

        {/* Date Picker */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Pick a date">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedWeekStart}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Weekend Toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-weekend"
            checked={showWeekend}
            onCheckedChange={onToggleWeekend}
          />
          <Label htmlFor="show-weekend" className="cursor-pointer text-sm">
            Weekend
          </Label>
        </div>
      </div>
    </div>
  );
}
