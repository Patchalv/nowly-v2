import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Redirect to login with error message
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // Set Sentry user context after successful authentication (production only)
    const isProduction = process.env.NODE_ENV === 'production';
    const hasSentryDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

    if (isProduction && hasSentryDsn) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Only send user ID to Sentry (GDPR compliance - no PII)
        Sentry.setUser({ id: user.id });
      }
    }

    // Successful authentication - redirect to /today
    return NextResponse.redirect(`${origin}/today`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=No+code+provided`);
}
