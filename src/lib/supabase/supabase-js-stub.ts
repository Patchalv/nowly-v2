/**
 * Stand-in for `@supabase/supabase-js`, wired up in next.config.ts.
 *
 * `@supabase-cache-helpers/postgrest-react-query` imports these two constants
 * from supabase-js for its realtime subscription hooks, but only lists the
 * package as a devDependency. Nowly doesn't use those hooks or Supabase, so
 * the bundler resolves the import here instead. Values match
 * `@supabase/realtime-js` 2.79.0.
 *
 * Remove this file and the alias once cache-helpers stops importing it.
 */
export const REALTIME_LISTEN_TYPES = {
  BROADCAST: 'broadcast',
  PRESENCE: 'presence',
  POSTGRES_CHANGES: 'postgres_changes',
  SYSTEM: 'system',
} as const;

export const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {
  ALL: '*',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
