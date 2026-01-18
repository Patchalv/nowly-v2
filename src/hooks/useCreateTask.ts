import { useInsertMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Create a new task
 * Automatically invalidates related task queries
 */
export function useCreateTask() {
  const supabase = createClient();

  return useInsertMutation(supabase.from('tasks'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
