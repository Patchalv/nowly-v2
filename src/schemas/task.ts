import { z } from 'zod';

/**
 * Task schema - Main task table with self-reference for subtasks
 */
export const taskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  parent_task_id: z.string().uuid().nullable(),
  recurring_task_id: z.string().uuid().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  scheduled_date: z.string().date().nullable(),
  due_date: z.string().date().nullable(),
  is_completed: z.boolean(),
  completed_at: z.string().datetime().nullable(),
  priority: z.number().int().min(0).max(3),
  position: z.number().int().min(0),
  is_detached: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for creating a new task
 */
export const createTaskSchema = z
  .object({
    workspace_id: z.string().uuid(),
    category_id: z.string().uuid().optional(),
    parent_task_id: z.string().uuid().optional(),
    recurring_task_id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    scheduled_date: z.string().date().optional(),
    due_date: z.string().date().optional(),
    priority: z.number().int().min(0).max(3).default(0),
    position: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    // Validation: due_date must be after scheduled_date (if both present)
    if (
      data.scheduled_date &&
      data.due_date &&
      data.due_date < data.scheduled_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'due_date must be on or after scheduled_date',
        path: ['due_date'],
      });
    }
  });

/**
 * Schema for updating a task
 */
export const updateTaskSchema = z
  .object({
    id: z.string().uuid(),
    category_id: z.string().uuid().optional(),
    parent_task_id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    scheduled_date: z.string().date().optional(),
    due_date: z.string().date().optional(),
    is_completed: z.boolean().optional(),
    completed_at: z.string().datetime().optional(),
    priority: z.number().int().min(0).max(3).optional(),
    position: z.number().int().min(0).optional(),
    is_detached: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation: due_date must be after scheduled_date (if both present)
    if (
      data.scheduled_date &&
      data.due_date &&
      data.due_date < data.scheduled_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'due_date must be on or after scheduled_date',
        path: ['due_date'],
      });
    }

    // Validation: completed_at should be set when is_completed is true
    if (data.is_completed === true && !data.completed_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'completed_at is required when marking task as completed',
        path: ['completed_at'],
      });
    }
  });

/**
 * Schema for completing a task (simplified version)
 */
export const completeTaskSchema = z.object({
  id: z.string().uuid(),
  is_completed: z.literal(true),
  completed_at: z.string().datetime(),
});

/**
 * Derived types from Zod schemas (source of truth)
 */
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
