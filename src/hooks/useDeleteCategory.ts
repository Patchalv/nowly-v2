import { useDeleteMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Delete a category
 * Automatically invalidates category queries
 */
export function useDeleteCategory() {
  const supabase = createClient();

  return useDeleteMutation(supabase.from('categories'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
