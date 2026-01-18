import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Update a category
 * Automatically invalidates category queries
 */
export function useUpdateCategory() {
  const supabase = createClient();

  return useUpdateMutation(supabase.from('categories'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
