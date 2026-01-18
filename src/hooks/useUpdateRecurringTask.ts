import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Update a recurring task
 * Automatically invalidates related recurring task queries
 * Note: Updating related task instances should be handled separately via server action
 */
export function useUpdateRecurringTask() {
  const supabase = createClient();

  return useUpdateMutation(supabase.from('recurring_tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
