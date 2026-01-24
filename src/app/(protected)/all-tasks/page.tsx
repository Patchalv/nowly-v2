'use client';

import { useState, useEffect, useRef } from 'react';
import { QuickAddBacklog } from '@/components/features/tasks/QuickAddBacklog';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function AllTasksPage() {
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCreatedWorkspace = useRef(false);
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspaceStore();

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

  const handleTaskClick = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const isLoading = workspacesLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">All tasks</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          View and manage all your uncompleted tasks
        </p>
      </div>

      {/* Quick Add Task */}
      <div className="mb-6">
        <QuickAddBacklog workspaceId={selectedWorkspaceId} />
      </div>

      {/* Placeholder for task list - will be implemented in Phase 4 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground py-8 text-center">
            Loading...
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center">
            Task list with filters will be implemented in upcoming phases.
          </div>
        )}
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
