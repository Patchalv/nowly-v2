import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch all recurring tasks for the current user
 * Includes category and workspace relations
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 * @param searchQuery - Optional search string for title (min 2 chars, pre-escaped)
 */
export function useRecurringTasks(
  workspaceId?: string | null,
  searchQuery?: string
) {
  const supabase = createClient();

  let query = supabase.from('recurring_tasks').select(
    `
        *,
        category:categories(id, name, color, icon),
        workspace:workspaces(id, name)
      `
  );

  // Apply workspace filter if specified
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  // Apply search filter if specified (min 2 chars)
  if (searchQuery && searchQuery.length >= 2) {
    // Escape SQL LIKE wildcards to treat them as literal characters
    const escapedSearch = searchQuery.replace(/[%_\\]/g, '\\$&');
    query = query.ilike('title', `%${escapedSearch}%`);
  }

  return useQuery(query.order('created_at', { ascending: false }));
}
