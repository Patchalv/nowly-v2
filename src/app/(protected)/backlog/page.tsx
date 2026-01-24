'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { QuickAddBacklog } from '@/components/features/tasks/QuickAddBacklog';
import { TaskList } from '@/components/features/tasks/TaskList';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { SearchInput } from '@/components/features/search/SearchInput';
import { useInboxTasks } from '@/hooks/useTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function BacklogPage() {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const hasCreatedWorkspace = useRef(false);
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspaceStore();
  const previousWorkspaceId = useRef(selectedWorkspaceId);

  // Reset search when workspace changes
  // This is a legitimate pattern for syncing state with external changes (store change triggers state reset)
  useEffect(() => {
    // Skip initial mount - search already has default value
    if (previousWorkspaceId.current !== selectedWorkspaceId) {
      previousWorkspaceId.current = selectedWorkspaceId;
      /* eslint-disable react-hooks/set-state-in-effect */
      setSearchQuery('');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [selectedWorkspaceId]);

  // Memoize search change handler to avoid unnecessary re-renders
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
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

  // Fetch backlog tasks (tasks with no scheduled date, filtered by workspace and search)
  const {
    data: allTasks,
    isLoading: tasksLoading,
    isError,
    error,
    refetch,
  } = useInboxTasks(selectedWorkspaceId, searchQuery);

  // Filter to show only uncompleted tasks
  const tasks = useMemo(() => {
    if (!allTasks) return undefined;
    return allTasks.filter((task) => !task.is_completed);
  }, [allTasks]);

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Backlog</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tasks without a scheduled date
        </p>
      </div>

      {/* Quick Add Task */}
      <div className="mb-6">
        <QuickAddBacklog workspaceId={selectedWorkspaceId} />
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search backlog tasks..."
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
          emptyStateMessage="Your backlog is empty"
          emptyStateDescription="Add tasks that you haven't scheduled yet"
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
