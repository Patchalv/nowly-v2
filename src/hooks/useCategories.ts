import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch categories for a specific workspace or all workspaces
 * Ordered by position (user-defined order)
 * @param workspaceId - Workspace ID to filter by, or null for all categories (Master view)
 */
export function useCategories(workspaceId: string | null) {
  const supabase = createClient();

  // When workspaceId is null (Master view), fetch all categories
  // When workspaceId is provided, filter by that workspace
  const query = workspaceId
    ? supabase
        .from('categories')
        .select('*, workspace:workspaces(id, name, color)')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
    : supabase
        .from('categories')
        .select('*, workspace:workspaces(id, name, color)')
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

  return useQuery(query);
}
