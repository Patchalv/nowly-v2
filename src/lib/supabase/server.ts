import { NeonPostgrestClient, fetchWithToken } from '@neon/postgrest-js';
import { getServerAccessToken } from '@/lib/auth/server';

/**
 * The server data client: a Neon Data API client that sends the current
 * session's JWT with every request. For server actions and server components.
 */
export async function createClient() {
  return new NeonPostgrestClient({
    dataApiUrl: process.env.NEXT_PUBLIC_NEON_DATA_API_URL!,
    options: {
      global: {
        fetch: fetchWithToken(getServerAccessToken),
      },
    },
  });
}
