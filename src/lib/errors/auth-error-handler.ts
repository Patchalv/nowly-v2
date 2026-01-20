import * as Sentry from '@sentry/nextjs';
import type { AuthError } from '@supabase/supabase-js';

/**
 * Context metadata for Supabase auth errors
 */
export interface AuthErrorContext {
  /** The authentication operation (e.g., 'signIn', 'signUp', 'signOut', 'resetPassword') */
  operation?:
    | 'signIn'
    | 'signUp'
    | 'signOut'
    | 'resetPassword'
    | 'updateUser'
    | 'refreshSession'
    | 'getUser'
    | 'getSession'
    | 'verifyOtp';
  /** Authentication provider (e.g., 'email', 'google', 'github') */
  provider?: 'email' | 'google' | 'github' | 'magic_link';
  /** The function or component where the error occurred */
  source?: string;
  /** Additional metadata about the operation (without sensitive data) */
  metadata?: Record<string, unknown>;
}

/**
 * Handles Supabase AuthError by logging to console in development
 * and capturing to Sentry in production with proper context.
 *
 * This function automatically scrubs sensitive data like emails, passwords,
 * and tokens before sending to Sentry.
 *
 * @param error - The AuthError from Supabase
 * @param context - Additional context about the auth operation
 * @returns The original error for further handling
 *
 * @example
 * ```ts
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email,
 *   password,
 * });
 * if (error) {
 *   handleAuthError(error, {
 *     operation: 'signIn',
 *     provider: 'email',
 *     source: 'LoginForm',
 *   });
 * }
 * ```
 */
export function handleAuthError(
  error: AuthError,
  context: AuthErrorContext = {}
): AuthError {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development, log to console with full details
  if (isDevelopment) {
    console.error('[Auth Error]', {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name,
      context,
    });
    return error;
  }

  // In production, send to Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Scrub the error message to remove potential PII
    const scrubbedMessage = scrubAuthErrorMessage(error.message);

    Sentry.captureException(error, {
      tags: {
        error_type: 'auth_error',
        error_code: error.code,
        auth_operation: context.operation,
        auth_provider: context.provider,
        status: error.status,
      },
      contexts: {
        auth: {
          message: scrubbedMessage,
          status: error.status,
          code: error.code,
          name: error.name,
        },
        operation: {
          operation: context.operation,
          provider: context.provider,
          source: context.source,
        },
      },
      extra: {
        metadata: context.metadata,
      },
      level: getErrorLevel(error),
      fingerprint: [
        'auth-error',
        error.code || error.name,
        context.operation || 'unknown',
      ],
    });
  }

  return error;
}

/**
 * Scrubs sensitive information from auth error messages
 * @param message - Original error message
 * @returns Scrubbed error message
 */
function scrubAuthErrorMessage(message: string): string {
  // Remove email addresses
  let scrubbed = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');

  // Remove potential phone numbers
  scrubbed = scrubbed.replace(
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    '[PHONE_REDACTED]'
  );

  // Remove tokens and secrets
  scrubbed = scrubbed.replace(/[a-zA-Z0-9_-]{20,}/g, '[TOKEN_REDACTED]');

  return scrubbed;
}

/**
 * Determines the Sentry severity level based on the error
 * @param error - The AuthError
 * @returns Sentry severity level
 */
function getErrorLevel(error: AuthError): Sentry.SeverityLevel {
  // User-facing errors (wrong password, invalid credentials) are warnings
  const userErrors = [
    'invalid_credentials',
    'email_not_confirmed',
    'user_not_found',
    'weak_password',
    'email_exists',
  ];

  if (error.code && userErrors.includes(error.code)) {
    return 'warning';
  }

  // 400-level HTTP status are warnings (client errors)
  if (error.status && error.status >= 400 && error.status < 500) {
    return 'warning';
  }

  // 500-level HTTP status are errors (server errors)
  if (error.status && error.status >= 500) {
    return 'error';
  }

  // Default to error for unexpected cases
  return 'error';
}

/**
 * Type guard to check if an error is an AuthError
 *
 * @param error - Unknown error object
 * @returns true if error is an AuthError
 *
 * @example
 * ```ts
 * try {
 *   // ... some auth operation
 * } catch (err) {
 *   if (isAuthError(err)) {
 *     handleAuthError(err, { operation: 'signIn' });
 *   }
 * }
 * ```
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'name' in error &&
    'status' in error &&
    (error as AuthError).name === 'AuthError'
  );
}

/**
 * Common auth error messages for user-friendly display
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password. Please try again.',
  email_not_confirmed: 'Please check your email and confirm your account.',
  user_not_found: 'No account found with this email.',
  weak_password:
    'Password is too weak. Please use a stronger password with at least 8 characters.',
  email_exists: 'An account with this email already exists.',
  invalid_grant: 'Invalid login credentials. Please try again.',
  over_email_send_rate_limit:
    'Too many requests. Please wait a few minutes before trying again.',
  session_not_found: 'Your session has expired. Please sign in again.',
  refresh_token_not_found: 'Your session has expired. Please sign in again.',
  network_error: 'Network error. Please check your connection and try again.',
  default: 'An error occurred. Please try again.',
};

/**
 * Gets a user-friendly error message for display
 *
 * @param error - The AuthError
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * const { error } = await supabase.auth.signIn({ email, password });
 * if (error) {
 *   const message = getAuthErrorMessage(error);
 *   toast.error(message);
 * }
 * ```
 */
export function getAuthErrorMessage(error: AuthError): string {
  if (error.code && error.code in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[error.code];
  }

  // Check for network errors
  if (error.message.toLowerCase().includes('fetch')) {
    return AUTH_ERROR_MESSAGES.network_error;
  }

  return AUTH_ERROR_MESSAGES.default;
}
