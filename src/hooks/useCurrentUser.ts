'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuthClient } from '@/lib/auth/client';

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const;

/**
 * The single client-side way to get the authenticated user, read from the
 * Neon Auth session. Resolves to `null` when there is no signed-in user;
 * throws on real failures so React Query retries instead of caching a false
 * `null`.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const { data: session, error } = await getAuthClient().getSession();
      if (error) {
        throw new Error(error.message ?? 'Failed to load the session');
      }
      return session?.user ?? null;
    },
  });
}
