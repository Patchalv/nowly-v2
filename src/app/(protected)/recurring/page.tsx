'use client';

import { useState, useEffect, useRef } from 'react';
import { QuickAddRecurring } from '@/components/features/recurring/QuickAddRecurring';
import { RecurringList } from '@/components/features/recurring/RecurringList';
import { RecurringDialog } from '@/components/features/recurring/RecurringDialog';
import { useRecurringTasks } from '@/hooks/useRecurringTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useCategories } from '@/hooks/useCategories';
import { createClient } from '@/lib/supabase/client';
import {
  createRecurringTaskWithInstance,
  updateRecurringTaskAndInstances,
  deleteRecurringTaskAndInstances,
} from './actions';
import type { RecurringTask, RecurrenceType } from '@/schemas/recurring-task';
import type { Category } from '@/types/supabase';

interface RecurringTaskWithRelations extends RecurringTask {
  category?: Category | null;
}

export default function RecurringPage() {
  const [selectedItem, setSelectedItem] =
    useState<RecurringTaskWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogDefaultValues, setDialogDefaultValues] = useState<
    Partial<RecurringTask> | undefined
  >(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCreatedWorkspace = useRef(false);
  const supabase = createClient();

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

  // Fetch recurring tasks
  const {
    data: recurringTasks,
    isLoading: tasksLoading,
    isError,
    error,
    refetch,
  } = useRecurringTasks();

  // Fetch categories for the default workspace (only when workspace is loaded)
  const { data: categories } = useCategories(defaultWorkspace?.id || '');

  const handleItemClick = (item: RecurringTaskWithRelations) => {
    setSelectedItem(item);
    setDialogDefaultValues(undefined);
    setIsDialogOpen(true);
  };

  const handleOpenDialog = (defaultValues?: Partial<RecurringTask>) => {
    setSelectedItem(null);
    setDialogDefaultValues(defaultValues);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: {
    workspace_id?: string;
    title: string;
    description?: string;
    category_id?: string;
    priority: number;
    recurrence_type: RecurrenceType;
    interval_days?: number;
    days_of_week?: number[];
    day_of_month?: number;
    month_of_year?: number;
    start_date: string;
    end_date?: string;
    next_due_date: string;
    is_active?: boolean;
  }) => {
    if (selectedItem) {
      // Update existing
      const result = await updateRecurringTaskAndInstances(
        selectedItem.id,
        data
      );
      if (result.error) {
        throw new Error(result.error);
      }
    } else {
      // Create new
      const result = await createRecurringTaskWithInstance({
        ...data,
        workspace_id: defaultWorkspace?.id || data.workspace_id,
      });
      if (result.error) {
        throw new Error(result.error);
      }
    }
    await refetch();
  };

  const handleDelete = async (id: string) => {
    const result = await deleteRecurringTaskAndInstances(id);
    if (result.error) {
      throw new Error(result.error);
    }
    await refetch();
  };

  const isLoading = workspacesLoading || tasksLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Recurring Tasks</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Manage templates that automatically create tasks
        </p>
      </div>

      {/* Quick Add */}
      {defaultWorkspace && (
        <div className="mb-6">
          <QuickAddRecurring
            workspaceId={defaultWorkspace.id}
            onOpenDialog={handleOpenDialog}
          />
        </div>
      )}

      {/* Recurring List */}
      <div className="space-y-4">
        <RecurringList
          recurringTasks={recurringTasks ?? undefined}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onItemClick={handleItemClick}
          onRetry={refetch}
        />
      </div>

      {/* Dialog */}
      <RecurringDialog
        recurringTask={selectedItem}
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedItem(null);
            setDialogDefaultValues(undefined);
          }
        }}
        defaultValues={dialogDefaultValues}
        categories={categories ?? undefined}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
