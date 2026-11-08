import { cookies, headers } from 'next/headers';
import { createNeonAuth, type NeonAuth } from '@neon/auth/next/server';
import {
  createAuthServer,
  extractNeonAuthCookies,
  type RequestContext,
} from '@neon/auth/server';

let instance: NeonAuth | undefined;

function isServerComponentCookieError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('Cookies can only be modified')
  );
}

/**
 * The same request context as @neon/auth's own Next.js adapter, except that
 * setCookie tolerates being called from a Server Component.
 *
 * When an upstream Neon Auth response carries Set-Cookie (a refreshed session,
 * or the token() response), the library writes it with cookies().set(), which
 * Next.js only allows in Server Actions and Route Handlers. In a Server
 * Component that throws, which made /login return 500 with a stale session
 * cookie. Skipping the write there is safe: the proxy refreshes session
 * cookies on the next request.
 */
async function createRequestContext(): Promise<RequestContext> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return {
    getCookies() {
      return extractNeonAuthCookies(headerStore);
    },
    setCookie(name, value, options) {
      try {
        cookieStore.set(name, value, options);
      } catch (error) {
        if (!isServerComponentCookieError(error)) {
          throw error;
        }
      }
    },
    getHeader(name) {
      return headerStore.get(name) ?? null;
    },
    getOrigin() {
      return (
        headerStore.get('origin') ||
        headerStore.get('referer')?.split('/').slice(0, 3).join('/') ||
        ''
      );
    },
    getFramework() {
      return 'nextjs';
    },
  };
}

/**
 * The server-side Neon Auth instance, created on first use.
 *
 * It must not be created at module scope: Neon Auth throws
 * "Missing required config: cookies.secret" when the secret is unset, and
 * `next build` runs in CI with no secrets.
 *
 * The route handler and middleware come from `createNeonAuth`. The server
 * methods (getSession, signIn, token, ...) come from `createAuthServer` with
 * the request context above.
 */
export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL!;
    const cookieConfig = {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      // A revoked session stays usable for up to this many seconds, because
      // getSession() is served from a signed cookie cache. 300 is the default;
      // it is set here so the window is a visible choice.
      sessionDataTtl: 300,
      sameSite: 'lax',
    } as const;
    const { handler, middleware } = createNeonAuth({
      baseUrl,
      cookies: cookieConfig,
    });
    const server = createAuthServer({
      baseUrl,
      context: createRequestContext,
      cookieSecret: cookieConfig.secret,
      sessionDataTtl: cookieConfig.sessionDataTtl,
      sameSite: cookieConfig.sameSite,
    });
    instance = Object.assign(server, { handler, middleware });
  }
  return instance;
}

type TokenResult = {
  data: { token: string } | null;
  error: unknown;
};

type WithToken = { token: () => Promise<TokenResult> };

/**
 * Returns a JWT for the current session, for calls to the Neon Data API.
 *
 * `token()` works at runtime but is typed `unknown` in @neon/auth 0.8.2. This
 * is the only place that casts it.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const auth = getAuth() as unknown as WithToken;
  const result = await auth.token();
  return result.data?.token ?? null;
}
