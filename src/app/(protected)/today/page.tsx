'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfToday } from 'date-fns';
import { QuickAddTask } from '@/components/features/tasks/QuickAddTask';
import { TaskList } from '@/components/features/tasks/TaskList';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { useTodayTasks } from '@/hooks/useTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function TodayPage() {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCreatedWorkspace = useRef(false);
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspaceStore();

  // Get today's date in ISO format (YYYY-MM-DD)
  const todayDate = useMemo(() => {
    return format(startOfToday(), 'yyyy-MM-dd');
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);

  // Fetch user's workspaces to get the default workspace
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const defaultWorkspace = workspaces?.[0];

  // Auto-create default workspace if none exists
  useEffect(() => {
    const createDefaultWorkspace = async () => {
      if (
        !workspacesLoading &&
        !defaultWorkspace &&
        userId &&
        !hasCreatedWorkspace.current &&
        !createWorkspace.isPending
      ) {
        hasCreatedWorkspace.current = true;
        try {
          await createWorkspace.mutateAsync([
            {
              name: 'Personal',
              user_id: userId,
              icon: '🏠',
            },
          ]);
        } catch (error) {
          console.error('Failed to create default workspace:', error);
          hasCreatedWorkspace.current = false;
        }
      }
    };
    createDefaultWorkspace();
  }, [workspacesLoading, defaultWorkspace, userId, createWorkspace]);

  // Fetch tasks for today and overdue tasks (filtered by workspace)
  const {
    data: allTasks,
    isLoading: tasksLoading,
    isError,
    error,
    refetch,
  } = useTodayTasks(todayDate, selectedWorkspaceId);

  // Filter tasks based on completion status:
  // - Uncompleted: show all (today + overdue)
  // - Completed: show only today's completed tasks
  const tasks = useMemo(() => {
    if (!allTasks) return undefined;
    return allTasks.filter((task) => {
      // Show all uncompleted tasks (today + overdue)
      if (!task.is_completed) return true;
      // Only show completed tasks scheduled for today
      return task.scheduled_date === todayDate;
    });
  }, [allTasks, todayDate]);

  // Local state for optimistic updates
  const [optimisticTasks, setOptimisticTasks] = useState<
    TaskWithRelations[] | undefined
  >(undefined);

  // Use optimistic tasks if available, otherwise use fetched tasks
  const displayTasks = optimisticTasks ?? tasks;

  // Toggle task completion mutation
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithRelations) => {
    // Immediately update UI optimistically
    setOptimisticTasks((current) => {
      const tasksToUpdate = current ?? tasks;
      if (!tasksToUpdate) return current;

      return tasksToUpdate.map((t) =>
        t.id === task.id
          ? {
              ...t,
              is_completed: !t.is_completed,
              completed_at: !t.is_completed ? new Date().toISOString() : null,
            }
          : t
      );
    });

    // Then trigger the actual mutation
    toggleComplete.mutate(task, {
      onSuccess: () => {
        // Clear optimistic state and refetch to get real data
        refetch().then(() => {
          setOptimisticTasks(undefined);
        });
      },
      onError: () => {
        // Revert optimistic update on error
        setOptimisticTasks(undefined);
      },
    });
  };

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const isLoading = workspacesLoading || tasksLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Today</h1>
        <p className="text-muted-foreground text-lg">
          {format(startOfToday(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Quick Add Task */}
      <div className="mb-6">
        <QuickAddTask
          scheduledDate={todayDate}
          workspaceId={selectedWorkspaceId}
        />
      </div>

      {/* Tasks Section */}
      <div className="space-y-4">
        <TaskList
          tasks={displayTasks ?? undefined}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onToggleComplete={handleToggleComplete}
          onTaskClick={handleTaskClick}
          onRetry={refetch}
        />
      </div>

      {/* Task Dialog */}
      <TaskDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedTask(null);
          }
        }}
      />
    </div>
  );
}
