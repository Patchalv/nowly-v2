import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Task, Category } from '@/types/supabase';

export type SortOption = 'due_date' | 'priority' | 'title_asc' | 'title_desc';

interface TaskWithCategory extends Task {
  category: Category | null;
}

interface UseAllTasksParams {
  workspaceId?: string | null;
  categoryIds?: string[];
  searchQuery?: string;
  sortBy?: SortOption;
}

const PAGE_SIZE = 50;

/**
 * Fetch all uncompleted tasks with infinite scroll pagination
 * Supports filtering by workspace, categories, and search query
 * Supports sorting by due date, priority, or title
 *
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 * @param categoryIds - Array of category IDs to filter by (empty = all)
 * @param searchQuery - Search string for title (min 2 chars)
 * @param sortBy - Sort option: 'due_date' | 'priority' | 'title_asc' | 'title_desc'
 */
export function useAllTasks({
  workspaceId,
  categoryIds = [],
  searchQuery = '',
  sortBy = 'due_date',
}: UseAllTasksParams) {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: [
      'all-tasks',
      workspaceId,
      categoryIds,
      searchQuery,
      sortBy,
    ] as const,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          category:categories(id, name, color, icon)
        `
        )
        .eq('is_completed', false)
        .is('parent_task_id', null);

      // Apply workspace filter if specified
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      // Apply category filter if specified
      if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds);
      }

      // Apply search filter if specified (min 2 characters)
      if (searchQuery && searchQuery.length >= 2) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      // Apply sorting with sub-ordering
      switch (sortBy) {
        case 'priority':
          query = query
            .order('priority', { ascending: false })
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
          break;
        case 'title_asc':
          query = query
            .order('title', { ascending: true })
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
          break;
        case 'title_desc':
          query = query
            .order('title', { ascending: false })
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });
          break;
        case 'due_date':
        default:
          query = query
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });
          break;
      }

      // Apply pagination
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        tasks: (data as TaskWithCategory[]) || [],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}
