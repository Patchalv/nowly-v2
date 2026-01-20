'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';

/**
 * Sets Sentry user context when authenticated.
 * This component should be placed in the protected layout to automatically
 * track the authenticated user in Sentry for better error tracking.
 *
 * Only sets user context in production to avoid polluting development logs.
 * Sets minimal user data (id and email) to respect privacy.
 */
export function SentryUserContext() {
  useEffect(() => {
    const setSentryUser = async () => {
      // Only set user context in production and if Sentry DSN is configured
      const isProduction = process.env.NODE_ENV === 'production';
      const hasSentryDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

      if (!isProduction || !hasSentryDsn) {
        return;
      }

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Set Sentry user context with minimal PII
        Sentry.setUser({
          id: user.id,
          email: user.email,
          // DO NOT include other fields like name, phone, etc.
        });
      } else {
        // Clear user context if not authenticated
        Sentry.setUser(null);
      }
    };

    setSentryUser();

    // Set up auth state listener to update Sentry context on auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const hasSentryDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

      if (!isProduction || !hasSentryDsn) {
        return;
      }

      if (session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        Sentry.setUser(null);
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
