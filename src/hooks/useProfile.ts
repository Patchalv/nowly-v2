import { useQuery } from '@supabase-cache-helpers/postgrest-react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Fetch the current user's profile
 */
export function useProfile() {
  const supabase = createClient();

  return useQuery(supabase.from('profiles').select('*').single());
}
