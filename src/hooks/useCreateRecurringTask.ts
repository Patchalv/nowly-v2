import { useInsertMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Create a new recurring task
 * Automatically invalidates related recurring task queries
 * Note: First task instance creation should be handled separately
 */
export function useCreateRecurringTask() {
  const supabase = createClient();

  return useInsertMutation(supabase.from('recurring_tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
