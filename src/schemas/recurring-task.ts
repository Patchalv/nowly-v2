import { z } from 'zod';

/**
 * Recurrence type enum
 */
export const recurrenceTypeSchema = z.enum([
  'interval_from_completion',
  'fixed_daily',
  'fixed_weekly',
  'fixed_monthly',
  'fixed_yearly',
]);

/**
 * Recurring task schema - Master templates for recurring task generation
 */
export const recurringTaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(),
  priority: z.number().int().min(0).max(3),
  recurrence_type: recurrenceTypeSchema,
  interval_days: z.number().int().min(1).nullable(),
  interval_weeks: z.number().int().min(1).nullable(), // For "every X weeks"
  interval_months: z.number().int().min(1).nullable(), // For "every X months"
  days_of_week: z.array(z.number().int().min(0).max(6)).nullable(),
  day_of_month: z.number().int().min(1).max(31).nullable(),
  week_of_month: z.number().int().min(-1).max(5).nullable(), // -1=last, 1-5=nth
  month_of_year: z.number().int().min(1).max(12).nullable(),
  start_date: z.string().date(),
  end_date: z.string().date().nullable(),
  next_due_date: z.string().date(),
  is_active: z.boolean(),
  is_paused: z.boolean(),
  occurrences_generated: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * Schema for creating a new recurring task
 */
export const createRecurringTaskSchema = z
  .object({
    workspace_id: z.string().uuid(),
    category_id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(3).default(0),
    recurrence_type: recurrenceTypeSchema,
    interval_days: z.number().int().min(1).optional(),
    interval_weeks: z.number().int().min(1).optional(), // For "every X weeks"
    interval_months: z.number().int().min(1).optional(), // For "every X months"
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    week_of_month: z.number().int().min(-1).max(5).optional(), // -1=last, 1-5=nth
    month_of_year: z.number().int().min(1).max(12).optional(),
    start_date: z.string().date(),
    end_date: z.string().date().optional(),
    next_due_date: z.string().date(),
    is_active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation: interval_from_completion and fixed_daily require interval_days
    if (
      (data.recurrence_type === 'interval_from_completion' ||
        data.recurrence_type === 'fixed_daily') &&
      !data.interval_days
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interval_days is required for this recurrence type',
        path: ['interval_days'],
      });
    }

    // Validation: fixed_weekly requires days_of_week
    if (
      data.recurrence_type === 'fixed_weekly' &&
      (!data.days_of_week || data.days_of_week.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'days_of_week is required for weekly recurrence',
        path: ['days_of_week'],
      });
    }

    // Validation: fixed_monthly requires either day_of_month OR (week_of_month + days_of_week)
    if (data.recurrence_type === 'fixed_monthly') {
      const hasWeekOfMonth =
        data.week_of_month !== undefined && data.week_of_month !== null;
      const hasDaysOfWeek = data.days_of_week && data.days_of_week.length > 0;
      const hasDayOfMonth = data.day_of_month !== undefined;

      // Must have either day_of_month OR (week_of_month + days_of_week)
      if (hasWeekOfMonth) {
        // Using Nth weekday pattern - needs days_of_week
        if (!hasDaysOfWeek) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'days_of_week is required when using week_of_month',
            path: ['days_of_week'],
          });
        }
      } else if (!hasDayOfMonth) {
        // Not using week_of_month, so need day_of_month
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Either day_of_month or week_of_month is required for monthly recurrence',
          path: ['day_of_month'],
        });
      }
    }

    // Validation: fixed_yearly requires month_of_year and day_of_month
    if (data.recurrence_type === 'fixed_yearly') {
      if (!data.month_of_year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'month_of_year is required for yearly recurrence',
          path: ['month_of_year'],
        });
      }
      if (!data.day_of_month) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'day_of_month is required for yearly recurrence',
          path: ['day_of_month'],
        });
      }
    }

    // Validation: end_date must be after start_date
    if (data.end_date && data.end_date <= data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must be after start_date',
        path: ['end_date'],
      });
    }
  });

/**
 * Schema for updating a recurring task
 */
export const updateRecurringTaskSchema = z
  .object({
    id: z.string().uuid(),
    category_id: z.string().uuid().optional(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(3).optional(),
    recurrence_type: recurrenceTypeSchema.optional(),
    interval_days: z.number().int().min(1).optional(),
    interval_weeks: z.number().int().min(1).optional(),
    interval_months: z.number().int().min(1).optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    day_of_month: z.number().int().min(1).max(31).optional(),
    week_of_month: z.number().int().min(-1).max(5).optional(),
    month_of_year: z.number().int().min(1).max(12).optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    next_due_date: z.string().date().optional(),
    is_active: z.boolean().optional(),
    is_paused: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Validation: end_date must be after start_date (if both present)
    if (data.start_date && data.end_date && data.end_date <= data.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'end_date must be after start_date',
        path: ['end_date'],
      });
    }
  });

/**
 * Derived types from Zod schemas (source of truth)
 */
export type RecurrenceType = z.infer<typeof recurrenceTypeSchema>;
export type RecurringTask = z.infer<typeof recurringTaskSchema>;
export type CreateRecurringTaskInput = z.infer<
  typeof createRecurringTaskSchema
>;
export type UpdateRecurringTaskInput = z.infer<
  typeof updateRecurringTaskSchema
>;
