'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const;

/**
 * The single client-side way to get the authenticated user.
 * Resolves to `null` when there is no signed-in user.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user ?? null;
    },
  });
}
