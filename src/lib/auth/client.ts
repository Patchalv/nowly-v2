'use client';

import { createAuthClient } from '@neon/auth/next';

let authClient: ReturnType<typeof createAuthClient> | undefined;

/**
 * The browser-side Neon Auth client. It talks to this app's `/api/auth`
 * route, which proxies to Neon Auth.
 */
export function getAuthClient() {
  authClient ??= createAuthClient();
  return authClient;
}

let inFlightToken: Promise<string | null> | undefined;

/**
 * Returns a JWT for the signed-in user, for calls to the Neon Data API.
 *
 * The auth client routes any URL containing `/token` through its get-session
 * cache, so once a session is cached a plain `token()` call resolves to the
 * cached `{ session, user }` instead of `{ token }`. The `X-Force-Fetch`
 * header is the client's own bypass for that cache. Concurrent callers share
 * one request; nothing is cached across requests, so a JWT never outlives
 * the session it came from.
 */
export function getBrowserAccessToken(): Promise<string | null> {
  inFlightToken ??= getAuthClient()
    .token({ fetchOptions: { headers: { 'X-Force-Fetch': 'true' } } })
    .then((result) => result.data?.token ?? null)
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
