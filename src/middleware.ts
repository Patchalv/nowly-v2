import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Public routes - allow access without authentication
  const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Auth routes - redirect to /today if already authenticated
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Protected routes - require authentication
  const isDashboardRoute =
    pathname.startsWith('/today') ||
    pathname.startsWith('/daily') ||
    pathname.startsWith('/recurring') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/upcoming') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/dashboard');

  // If user is authenticated and trying to access auth pages, redirect to /today
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/today';
    return NextResponse.redirect(url);
  }

  // If user is not authenticated and trying to access protected routes, redirect to /login
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Allow the request to proceed
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
