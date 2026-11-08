import { getAuth } from '@/lib/auth/server';

/**
 * The single server-side way to get the authenticated user, read from the
 * Neon Auth session.
 */
export async function getCurrentUser() {
  const { data: session, error } = await getAuth().getSession();
  return { user: session?.user ?? null, error };
}
