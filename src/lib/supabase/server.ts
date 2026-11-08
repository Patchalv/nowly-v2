import { NeonPostgrestClient, fetchWithToken } from '@neon/postgrest-js';
import { getServerAccessToken } from '@/lib/auth/server';

/**
 * The server data client: a Neon Data API client that sends the current
 * session's JWT with every request. For server actions and server components.
 *
 * Create one per request. Getting the JWT is a call to Neon Auth, so the
 * client fetches it once, on its first query, and reuses it.
 */
export async function createClient() {
  let token: Promise<string | null> | undefined;
  return new NeonPostgrestClient({
    dataApiUrl: process.env.NEXT_PUBLIC_NEON_DATA_API_URL!,
    options: {
      global: {
        fetch: fetchWithToken(() => (token ??= getServerAccessToken())),
      },
    },
  });
}
