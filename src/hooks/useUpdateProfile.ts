import { useUpdateMutation } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Update the current user's profile
 * Automatically invalidates profile queries
 */
export function useUpdateProfile() {
  const supabase = createClient();

  return useUpdateMutation(supabase.from('profiles'), ['id'], null, {
    onSuccess: () => {
      // Cache will be automatically invalidated by supabase-cache-helpers
    },
  });
}
