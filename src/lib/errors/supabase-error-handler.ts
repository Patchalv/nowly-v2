import * as Sentry from '@sentry/nextjs';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Context metadata for Supabase errors
 */
export interface SupabaseErrorContext {
  /** The database table being queried (e.g., 'tasks', 'users') */
  table?: string;
  /** The type of query operation (e.g., 'select', 'insert', 'update', 'delete') */
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
  /** User ID if available (without PII) */
  userId?: string;
  /** Additional metadata about the operation */
  metadata?: Record<string, unknown>;
  /** The function or component where the error occurred */
  source?: string;
}

/**
 * Handles Supabase PostgrestError by logging to console in development
 * and capturing to Sentry in production with proper context.
 *
 * @param error - The PostgrestError from Supabase
 * @param context - Additional context about the operation
 * @returns The original error for further handling
 *
 * @example
 * ```ts
 * const { data, error } = await supabase.from('tasks').select('*');
 * if (error) {
 *   handleSupabaseError(error, {
 *     table: 'tasks',
 *     operation: 'select',
 *     userId: user.id,
 *     source: 'useTasks',
 *   });
 * }
 * ```
 */
export function handleSupabaseError(
  error: PostgrestError,
  context: SupabaseErrorContext = {}
): PostgrestError {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development, log to console with full details
  if (isDevelopment) {
    console.error('[Supabase Error]', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      context,
    });
    return error;
  }

  // In production, send to Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        error_type: 'supabase_error',
        error_code: error.code,
        table: context.table,
        operation: context.operation,
      },
      contexts: {
        supabase: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        operation: {
          table: context.table,
          operation: context.operation,
          source: context.source,
        },
      },
      user: context.userId ? { id: context.userId } : undefined,
      extra: {
        metadata: context.metadata,
      },
      level: 'error',
    });
  }

  return error;
}

/**
 * Type guard to check if an error is a PostgrestError
 *
 * @param error - Unknown error object
 * @returns true if error is a PostgrestError
 *
 * @example
 * ```ts
 * try {
 *   // ... some operation
 * } catch (err) {
 *   if (isPostgrestError(err)) {
 *     handleSupabaseError(err, { table: 'tasks' });
 *   }
 * }
 * ```
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'details' in error &&
    'hint' in error &&
    'code' in error
  );
}
