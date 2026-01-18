'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfToday } from 'date-fns';
import { QuickAddTask } from '@/components/features/tasks/QuickAddTask';
import { TaskList } from '@/components/features/tasks/TaskList';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { useTasks } from '@/hooks/useTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { createClient } from '@/lib/supabase/client';
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

  // Fetch tasks for today
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError,
    error,
    refetch,
  } = useTasks(todayDate);

  // Toggle task completion mutation
  const toggleComplete = useToggleTaskComplete();

  const handleToggleComplete = (task: TaskWithRelations) => {
    toggleComplete.mutate(task);
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
      {defaultWorkspace && (
        <div className="mb-6">
          <QuickAddTask
            scheduledDate={todayDate}
            workspaceId={defaultWorkspace.id}
          />
        </div>
      )}

      {/* Tasks Section */}
      <div className="space-y-4">
        <TaskList
          tasks={tasks ?? undefined}
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
