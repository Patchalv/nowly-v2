import type { Database } from './database';

/**
 * Helper type to extract table types from the Database
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Helper type to extract insert types from the Database
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Helper type to extract update types from the Database
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/**
 * Exported database table types
 */
export type Profile = Tables<'profiles'>;
export type Workspace = Tables<'workspaces'>;
export type Category = Tables<'categories'>;
export type RecurringTask = Tables<'recurring_tasks'>;
export type Task = Tables<'tasks'>;
