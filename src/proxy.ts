import type { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';

// Routes reachable without a session. Every other route redirects to /login
// when signed out. /api/auth is public by default. /monitoring is Sentry's
// tunnel route.
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/monitoring',
];

let middleware:
  | ReturnType<ReturnType<typeof getAuth>['middleware']>
  | undefined;

// Optimistic redirects only. The protected layout is the primary auth check.
// Signed-in users on /login or /signup are redirected by those pages.
export async function proxy(request: NextRequest) {
  middleware ??= getAuth().middleware({ loginUrl: '/login', publicRoutes });
  return middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (web app manifest)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
