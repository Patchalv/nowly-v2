import { z } from 'zod';

/**
 * Profile schema - User profile data synced from Supabase Auth
 */
export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for updating profile
 * Only email, full_name, and avatar_url can be updated
 */
export const updateProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

/**
 * Derived types from Zod schemas (source of truth)
 */
export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
