/**
 * The error shape Neon Auth's `token()` returns, on the server and in the
 * browser.
 */
type TokenFetchFailure = {
  message?: string;
  status?: number;
  statusText?: string;
};

/**
 * Raised when Neon Auth fails to issue a JWT for a reason other than "no
 * session" (an outage, a bad cookie secret, ...).
 *
 * It is thrown from inside the Data API client's fetch, which postgrest-js
 * turns into the query's `error` with the message
 * `AuthTokenError: <message>`. The existing `handleSupabaseError` call sites
 * then report the real cause to Sentry, instead of a generic
 * "Authentication required".
 */
export class AuthTokenError extends Error {
  constructor(failure: TokenFetchFailure) {
    const status = failure.status ?? 'unknown';
    const reason = failure.message || failure.statusText || 'no message';
    super(`Could not get an access token (status ${status}): ${reason}`);
    this.name = 'AuthTokenError';
  }
}

/**
 * Turns a `token()` result into the JWT, `null` when signed out, or a thrown
 * `AuthTokenError` for any other failure.
 *
 * A 401 means there is no session. Returning `null` keeps that case as it was:
 * the Data API client throws its own `AuthRequiredError`.
 */
export function tokenFromResult(result: {
  data: { token: string } | null;
  error: TokenFetchFailure | null;
}): string | null {
  if (result.error && result.error.status !== 401) {
    throw new AuthTokenError(result.error);
  }
  return result.data?.token ?? null;
}
