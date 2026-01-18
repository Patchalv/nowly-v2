import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch categories for a specific workspace
 * Ordered by position (user-defined order)
 */
export function useCategories(workspaceId: string) {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
  );
}
