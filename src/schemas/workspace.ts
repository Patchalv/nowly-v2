import { z } from 'zod';

/**
 * Workspace schema - User's workspace containers (e.g., "Personal", "Work")
 */
export const workspaceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1, 'Workspace name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  icon: z.string().nullable(),
  position: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for creating a new workspace
 */
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#6366f1'),
  icon: z.string().optional(),
  position: z.number().int().min(0).default(0),
});

/**
 * Schema for updating a workspace
 */
export const updateWorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Workspace name is required').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  icon: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

/**
 * Derived types from Zod schemas (source of truth)
 */
export type Workspace = z.infer<typeof workspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
