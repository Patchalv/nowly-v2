import { useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a task
 * Automatically invalidates related task queries
 */
export function useDeleteTask() {
  const supabase = createClient();

  return useDeleteMutation(supabase.from('tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
