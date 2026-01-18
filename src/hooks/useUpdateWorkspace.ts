import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Update a workspace
 * Automatically invalidates workspace queries
 */
export function useUpdateWorkspace() {
  const supabase = createClient();

  return useUpdateMutation(supabase.from('workspaces'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
