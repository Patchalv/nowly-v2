'use client';

import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { useWeekDays } from '@/hooks/useWeekDays';
import { DayColumn } from '@/components/features/weekly/DayColumn';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

interface WeekGridProps {
  weekStart: Date;
  tasks: TaskWithRelations[];
  showWeekend: boolean;
  isLoading: boolean;
  onToggleComplete: (task: TaskWithRelations) => void;
  onTaskClick: (task: TaskWithRelations) => void;
  workspaceId: string | null;
}

/**
 * Desktop 5-7 column grid layout with task lists
 * Uses CSS Grid for equal-width columns
 */
export function WeekGrid({
  weekStart,
  tasks,
  showWeekend,
  isLoading,
  onToggleComplete,
  onTaskClick,
  workspaceId,
}: WeekGridProps) {
  // Use shared hook for day generation
  const daysToShow = useWeekDays(weekStart, showWeekend);

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

  return (
    <div
      className="grid h-full gap-3"
      style={{
        gridTemplateColumns: `repeat(${daysToShow.length}, minmax(0, 1fr))`,
      }}
    >
      {daysToShow.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDay[dateKey] || [];
        const isCurrentDay = isToday(day);

        return (
          <DayColumn
            key={dateKey}
            date={day}
            tasks={dayTasks}
            isToday={isCurrentDay}
            isLoading={isLoading}
            onToggleComplete={onToggleComplete}
            onTaskClick={onTaskClick}
            workspaceId={workspaceId}
          />
        );
      })}
    </div>
  );
}
