import { createNeonAuth, type NeonAuth } from '@neon/auth/next/server';

let instance: NeonAuth | undefined;

/**
 * The server-side Neon Auth instance, created on first use.
 *
 * It must not be created at module scope: `createNeonAuth` throws
 * "Missing required config: cookies.secret" when the secret is unset, and
 * `next build` runs in CI with no secrets.
 */
export function getAuth(): NeonAuth {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      // A revoked session stays usable for up to this many seconds, because
      // getSession() is served from a signed cookie cache. 300 is the default;
      // it is set here so the window is a visible choice.
      sessionDataTtl: 300,
      sameSite: 'lax',
    },
  });
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
