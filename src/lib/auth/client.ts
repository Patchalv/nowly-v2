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
