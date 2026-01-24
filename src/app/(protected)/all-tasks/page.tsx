'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { QuickAddBacklog } from '@/components/features/tasks/QuickAddBacklog';
import { TaskFilters } from '@/components/features/tasks/TaskFilters';
import { TaskItem } from '@/components/features/tasks/TaskItem';
import { TaskDialog } from '@/components/features/tasks/TaskDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAllTasks, type SortOption } from '@/hooks/useAllTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useCreateWorkspace } from '@/hooks/useCreateWorkspace';
import { useCategories } from '@/hooks/useCategories';
import { useToggleTaskComplete } from '@/hooks/useToggleTaskComplete';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';
import type { Task, Category } from '@/types/supabase';

interface TaskWithRelations extends Task {
  category?: Category | null;
}

export default function AllTasksPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('due_date');

  // UI state
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Clients and stores
  const supabase = createClient();
  const { selectedWorkspaceId } = useWorkspaceStore();

  // Refs
  const hasCreatedWorkspace = useRef(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const previousWorkspaceId = useRef(selectedWorkspaceId);

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

  // Fetch user's workspaces
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

  // Fetch categories (supports null for Master view)
  const { data: categories } = useCategories(selectedWorkspaceId);

  // Fetch all tasks with infinite query
  const {
    data: tasksData,
    isLoading: tasksLoading,
    isFetching,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useAllTasks({
    workspaceId: selectedWorkspaceId,
    categoryIds: selectedCategories,
    searchQuery,
    sortBy,
  });

  // Flatten pages into single array
  const tasks = useMemo(() => {
    if (!tasksData?.pages) return [];
    return tasksData.pages.flatMap((page) => page.tasks);
  }, [tasksData]);

  // Toggle task completion
  const toggleComplete = useToggleTaskComplete();

  // Reset filters when workspace changes
  // This is a legitimate pattern for syncing state with external changes (store change triggers state reset)
  useEffect(() => {
    // Skip initial mount - filters already have default values
    if (previousWorkspaceId.current !== selectedWorkspaceId) {
      previousWorkspaceId.current = selectedWorkspaceId;
      /* eslint-disable react-hooks/set-state-in-effect */
      setSearchQuery('');
      setSelectedCategories([]);
      setSortBy('due_date');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [selectedWorkspaceId]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Back to top scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 800);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleComplete = useCallback(
    (task: TaskWithRelations) => {
      toggleComplete.mutate(task, {
        onSuccess: () => {
          refetch();
        },
      });
    },
    [toggleComplete, refetch]
  );

  const handleTaskClick = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSortBy('due_date');
  }, []);

  const handleDialogClose = useCallback(
    (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) {
        setSelectedTask(null);
        // Refetch to get updated data after dialog closes
        refetch();
      }
    },
    [refetch]
  );

  const isLoading = workspacesLoading || tasksLoading;

  // Check if we have active filters for empty state messaging
  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedCategories.length > 0 ||
    sortBy !== 'due_date';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold">All tasks</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          View and manage all your uncompleted tasks
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TaskFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          sortBy={sortBy}
          onSortChange={setSortBy}
          categories={categories ?? undefined}
          onClearFilters={handleClearFilters}
          isInitialLoading={workspacesLoading}
        />
      </div>

      {/* Quick Add Task */}
      <div className="mb-6">
        <QuickAddBacklog workspaceId={selectedWorkspaceId} />
      </div>

      {/* Results count and refetching indicator */}
      {!isLoading && !isError && tasks.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p
            className="text-muted-foreground text-sm"
            role="status"
            aria-live="polite"
          >
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {hasNextPage && '+'}
            {hasActiveFilters && ' matching filters'}
          </p>
          {isFetching && !isFetchingNextPage && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Updating...
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2" role="list" aria-label="Tasks">
        {/* Loading state - initial load */}
        {isLoading && tasks.length === 0 && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
              >
                <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-8 w-24 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="space-y-2">
              <p className="text-destructive text-lg font-medium">
                Failed to load tasks
              </p>
              <p className="text-muted-foreground text-sm">
                {error?.message || 'Something went wrong'}
              </p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="space-y-2">
              {hasActiveFilters ? (
                <>
                  <p className="text-lg font-medium">
                    No tasks match your filters
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">No tasks yet</p>
                  <p className="text-muted-foreground text-sm">
                    Create your first task above to get started
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tasks */}
        {!isError &&
          tasks.map((task) => (
            <div key={task.id} role="listitem">
              <TaskItem
                task={task}
                onToggleComplete={handleToggleComplete}
                onTaskClick={handleTaskClick}
              />
            </div>
          ))}

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div
            className="flex justify-center py-4"
            role="status"
            aria-live="polite"
          >
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Loading more...
            </div>
          </div>
        )}

        {/* Intersection observer target */}
        <div ref={observerTarget} className="h-4" />
      </div>

      {/* Back to Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        className={cn(
          'bg-primary text-primary-foreground hover:bg-primary/90 fixed right-6 bottom-6 z-50 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300',
          showBackToTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        )}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      {/* Task Dialog */}
      <TaskDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
