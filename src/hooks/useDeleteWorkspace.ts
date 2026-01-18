import { useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a workspace
 * Automatically invalidates workspace queries
 */
export function useDeleteWorkspace() {
  const supabase = createClient();

  return useDeleteMutation(supabase.from('workspaces'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
