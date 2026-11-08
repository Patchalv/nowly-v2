import { NeonPostgrestClient, fetchWithToken } from '@neon/postgrest-js';
import { getBrowserAccessToken } from '@/lib/auth/client';

let client: NeonPostgrestClient | undefined;

/**
 * The browser data client: a Neon Data API client that sends the signed-in
 * user's JWT with every request. Created once, on first use.
 */
export function createClient() {
  client ??= new NeonPostgrestClient({
    dataApiUrl: process.env.NEXT_PUBLIC_NEON_DATA_API_URL!,
    options: {
      global: {
        fetch: fetchWithToken(getBrowserAccessToken),
      },
    },
  });
  return client;
}
