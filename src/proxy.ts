import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Public routes - no authentication required
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/auth/callback',
];

// Auth routes - redirect to /today if already authenticated
const authRoutes = ['/login', '/signup'];

// Protected route prefixes - require authentication
const protectedPrefixes = [
  '/today',
  '/daily',
  '/weekly',
  '/all-tasks',
  '/backlog',
  '/recurring',
  '/account',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static assets and Next.js internals
  // Note: matcher config already filters common asset extensions,
  // so we only need to check for _next and api prefixes here
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Check if this is an auth route (login/signup)
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // Check if this is a protected route
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Create response to modify cookies if needed
  let response = NextResponse.next({
    request,
  });

  // Create Supabase client for session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - this validates the JWT with Supabase
  // Note: We intentionally use fail-closed behavior here. If getUser() errors
  // (network issue, Supabase down), user will be undefined and protected routes
  // will redirect to /login. This is the safe default. The protected layout
  // provides the primary auth check and will report errors to Sentry.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Log auth errors in development for debugging (don't spam Sentry from proxy)
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('[proxy] Auth error:', error.message);
  }

  // If user is authenticated and on auth routes, redirect to /today
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/today';
    return NextResponse.redirect(url);
  }

  // If user is not authenticated and on protected routes, redirect to /login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
