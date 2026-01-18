import { useInsertMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Create a new category
 * Automatically invalidates related category queries
 */
export function useCreateCategory() {
  const supabase = createClient();

  return useInsertMutation(supabase.from('categories'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
