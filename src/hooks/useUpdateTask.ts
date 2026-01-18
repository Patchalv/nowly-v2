import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Update a task
 * Automatically invalidates related task queries
 */
export function useUpdateTask() {
  const supabase = createClient();

  return useUpdateMutation(supabase.from('tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
