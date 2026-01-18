import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch all workspaces for the current user
 * Ordered by position (user-defined order)
 */
export function useWorkspaces() {
  const supabase = createClient();

  return useQuery(
    supabase
      .from('workspaces')
      .select('*')
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
  );
}
