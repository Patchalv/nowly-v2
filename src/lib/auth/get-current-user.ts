import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * The single server-side way to get the authenticated user.
 *
 * Pass `supabase` when the caller already holds a client whose cookies differ
 * from `next/headers` (proxy) or were just updated in this request (login,
 * OAuth callback).
 */
export async function getCurrentUser(supabase?: Pick<SupabaseClient, 'auth'>) {
  const client = supabase ?? (await createClient());
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return { user, error };
}
