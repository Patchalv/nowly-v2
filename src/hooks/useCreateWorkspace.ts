import { useInsertMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Create a new workspace
 * Automatically invalidates related workspace queries
 */
export function useCreateWorkspace() {
  const supabase = createClient();

  return useInsertMutation(supabase.from('workspaces'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
