'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWeekDays, getTodayIndex } from '@/hooks/useWeekDays';
import { DayColumn } from '@/components/features/weekly/DayColumn';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface DayCarouselProps {
  weekStart: Date;
  tasks: TaskWithRelations[];
  showWeekend: boolean;
  isLoading: boolean;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  workspaceId: string | null;
}

/**
 * Mobile swipeable carousel using CSS scroll-snap
 * Shows one day at 85% width with peek of next day
 * Uses IntersectionObserver to track active day for dot indicators
 */
export function DayCarousel({
  weekStart,
  tasks,
  showWeekend,
  isLoading,
  onToggleComplete,
  onTaskClick,
  workspaceId,
}: DayCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Use shared hook for day generation
  const daysToShow = useWeekDays(weekStart, showWeekend);

  // Initialize to today's index using useMemo (avoids flash)
  const initialIndex = useMemo(() => getTodayIndex(daysToShow), [daysToShow]);

  // Set initial scroll position and active index on mount/week change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const cardWidth = container.offsetWidth * 0.85;
      const gap = 16; // gap-4 = 1rem = 16px
      container.scrollLeft = initialIndex * (cardWidth + gap);
      setActiveIndex(initialIndex);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [initialIndex, weekStart]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped: Record<string, TaskWithRelations[]> = {};
    daysToShow.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = tasks.filter(
        (task) => task.scheduled_date === dateKey
      );
    });
    return grouped;
  }, [daysToShow, tasks]);

  // Track active index via IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    // Observe all day cards
    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [daysToShow]);

  // Scroll to specific day when dot is clicked
  const scrollToDay = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = container.offsetWidth * 0.85;
    const gap = 16;
    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Day Indicator Dots */}
      <div className="flex flex-shrink-0 items-center justify-center gap-2">
        {daysToShow.map((day, index) => (
          <button
            key={format(day, 'yyyy-MM-dd')}
            onClick={() => scrollToDay(index)}
            className={cn(
              'h-2 rounded-full transition-all',
              index === activeIndex
                ? 'bg-primary w-6'
                : 'bg-muted-foreground/30 w-2'
            )}
            aria-label={`Go to ${format(day, 'EEEE')}`}
          />
        ))}
      </div>

      {/* Scroll-snap Container */}
      <div
        ref={scrollContainerRef}
        className="scrollbar-hide flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto"
      >
        {daysToShow.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[dateKey] || [];
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              data-index={index}
              className="h-full w-[85%] flex-shrink-0 snap-center"
            >
              <DayColumn
                date={day}
                tasks={dayTasks}
                isToday={isCurrentDay}
                isLoading={isLoading}
                onToggleComplete={onToggleComplete}
                onTaskClick={onTaskClick}
                workspaceId={workspaceId}
              />
            </div>
          );
        })}
        {/* Spacer for last item to allow proper snap alignment */}
        <div className="w-[15%] flex-shrink-0" aria-hidden="true" />
      </div>

      {/* Current Day Label */}
      <div className="flex-shrink-0 text-center">
        <p className="text-muted-foreground text-sm">
          {daysToShow[activeIndex]
            ? format(daysToShow[activeIndex], 'EEEE, MMMM d')
            : ''}
        </p>
      </div>
    </div>
  );
}
