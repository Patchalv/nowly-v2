import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch all recurring tasks for the current user
 * Includes category and workspace relations
 */
export function useRecurringTasks() {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('recurring_tasks')
      .select(
        `
        *,
        category:categories(id, name, color, icon),
        workspace:workspaces(id, name)
      `
      )
      .order('created_at', { ascending: false })
  );
}
