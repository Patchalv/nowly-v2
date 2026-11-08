'use client';

import { createAuthClient } from '@neon/auth/next';
import { reusableForMs } from '@/lib/auth/jwt';
import { tokenFromResult } from '@/lib/auth/token-error';

let authClient: ReturnType<typeof createAuthClient> | undefined;

/**
 * The browser-side Neon Auth client. It talks to this app's `/api/auth`
 * route, which proxies to Neon Auth.
 */
export function getAuthClient() {
  authClient ??= createAuthClient();
  return authClient;
}

let cachedToken: { token: string; reuseUntil: number } | undefined;
let inFlightToken: Promise<string | null> | undefined;

/**
 * Returns a JWT for the signed-in user, for calls to the Neon Data API, or
 * `null` when signed out. Any other failure throws an `AuthTokenError`.
 *
 * The JWT is reused until 30 seconds before it expires, so queries don't each
 * wait on a round trip to `/api/auth`. Reuse doesn't extend access: the Data
 * API accepts a JWT until its `exp` whether or not it is cached. Sign-out does
 * a full page load, which drops the cached token. When a new one is needed,
 * concurrent callers share one request.
 *
 * The auth client routes any URL containing `/token` through its get-session
 * cache, so once a session is cached a plain `token()` call resolves to the
 * cached `{ session, user }` instead of `{ token }`. The `X-Force-Fetch`
 * header is the client's own bypass for that cache.
 */
export function getBrowserAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.reuseUntil) {
    return Promise.resolve(cachedToken.token);
  }
  inFlightToken ??= getAuthClient()
    .token({ fetchOptions: { headers: { 'X-Force-Fetch': 'true' } } })
    .then(tokenFromResult)
    .then((token) => {
      cachedToken = token
        ? { token, reuseUntil: Date.now() + reusableForMs(token) }
        : undefined;
      return token;
    })
    .finally(() => {
      inFlightToken = undefined;
    });
  return inFlightToken;
}

/**
 * Starts Google sign-in. On success Neon redirects to `/today`; on failure it
 * redirects to `/login` with an `error` query parameter, which the login page
 * shows as a toast.
 */
export async function signInWithGoogle(): Promise<
  { error: string } | undefined
> {
  const { error } = await getAuthClient().signIn.social({
    provider: 'google',
    callbackURL: '/today',
    errorCallbackURL: '/login',
  });
  if (error) {
    return { error: error.message ?? 'Failed to initiate Google sign in' };
  }
  return undefined;
}
