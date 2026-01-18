import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch all recurring tasks for the current user
 * Includes category and workspace relations
 * @param workspaceId - Optional workspace filter (null = all workspaces)
 */
export function useRecurringTasks(workspaceId?: string | null) {
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

  return useQuery(query.order('created_at', { ascending: false }));
}
