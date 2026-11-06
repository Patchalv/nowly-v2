'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser, CURRENT_USER_QUERY_KEY } from '@/hooks/useCurrentUser';

function isSentryEnabled() {
  return (
    process.env.NODE_ENV === 'production' &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN
  );
}

/**
 * Sets Sentry user context when authenticated.
 * This component should be placed in the protected layout to automatically
 * track the authenticated user in Sentry for better error tracking.
 *
 * Only sets user context in production to avoid polluting development logs.
 * Sends only the user ID (GDPR: no email or other PII).
 */
export function SentryUserContext() {
  const queryClient = useQueryClient();
  const { data: user, isSuccess } = useCurrentUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isSentryEnabled() || !isSuccess) {
      return;
    }
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId, isSuccess]);

  // Keep the cached current user and Sentry context in sync with auth changes
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUserId = session?.user.id ?? null;

      if (event === 'SIGNED_OUT') {
        queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
      } else if (
        queryClient.getQueryState(CURRENT_USER_QUERY_KEY)?.status ===
          'success' &&
        queryClient.getQueryData<User | null>(CURRENT_USER_QUERY_KEY)?.id !==
          (sessionUserId ?? undefined)
      ) {
        // Re-verify with the auth server rather than trusting the local session
        void queryClient.invalidateQueries({
          queryKey: CURRENT_USER_QUERY_KEY,
        });
      }

      if (isSentryEnabled()) {
        Sentry.setUser(sessionUserId ? { id: sessionUserId } : null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // This component doesn't render anything
  return null;
}
