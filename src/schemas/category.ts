import { z } from 'zod';

/**
 * Category schema - Categories within workspaces for organizing tasks
 */
export const categorySchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .nullable(),
  icon: z.string().nullable(),
  position: z.number().int().min(0),
  created_at: z.string().datetime(),
});

/**
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  icon: z.string().optional(),
  position: z.number().int().min(0).default(0),
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Category name is required').optional(),
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
export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
