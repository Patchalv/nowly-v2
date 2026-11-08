const REFRESH_MARGIN_SECONDS = 30;

function decodePayload(token: string): { iat?: unknown; exp?: unknown } | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * How long a JWT that was just issued can be reused, in milliseconds: its
 * lifetime minus a 30-second margin, or 0 when that can't be read.
 *
 * The lifetime is `exp - iat` from the token itself, so it doesn't depend on
 * the browser's clock matching the server's.
 */
export function reusableForMs(token: string): number {
  const claims = decodePayload(token);
  if (!claims || typeof claims.exp !== 'number') {
    return 0;
  }
  const issuedAt =
    typeof claims.iat === 'number' ? claims.iat : Date.now() / 1000;
  const lifetimeSeconds = claims.exp - issuedAt - REFRESH_MARGIN_SECONDS;
  return Math.max(0, lifetimeSeconds * 1000);
}
