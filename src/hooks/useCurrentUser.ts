'use client';

import { useQuery } from '@tanstack/react-query';
import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const;

/**
 * The single client-side way to get the authenticated user.
 * Resolves to `null` when there is no signed-in user; throws on real
 * failures so React Query retries instead of caching a false `null`.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error && !isAuthSessionMissingError(error)) {
        throw error;
      }
      return user ?? null;
    },
  });
}
