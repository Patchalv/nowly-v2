'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useCurrentUser } from '@/hooks/useCurrentUser';

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
  const { data: user, isSuccess } = useCurrentUser();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isSentryEnabled() || !isSuccess) {
      return;
    }
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId, isSuccess]);

  // This component lives in the protected layout, so it unmounts on sign-out.
  // Clear the browser-side Sentry user then.
  useEffect(() => {
    return () => {
      if (isSentryEnabled()) {
        Sentry.setUser(null);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}
