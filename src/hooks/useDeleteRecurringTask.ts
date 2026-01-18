import { useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a recurring task
 * Automatically invalidates related recurring task queries
 * Note: Deleting related task instances should be handled via server action
 */
export function useDeleteRecurringTask() {
  const supabase = createClient();

  return useDeleteMutation(supabase.from('recurring_tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
