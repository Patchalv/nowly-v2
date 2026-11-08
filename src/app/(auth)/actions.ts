'use server';

import { getAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

// Neon Auth rejects passwords shorter than 8 characters (PASSWORD_TOO_SHORT).
const PASSWORD_MIN_LENGTH = 8;
const passwordTooShort = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(PASSWORD_MIN_LENGTH, passwordTooShort),
});

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(PASSWORD_MIN_LENGTH, passwordTooShort),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ActionResponse =
  | { error: Record<string, string | string[]> }
  | { success: string }
  | undefined;

function isSentryEnabled() {
  return (
    process.env.NODE_ENV === 'production' &&
    !!process.env.NEXT_PUBLIC_SENTRY_DSN
  );
}

export async function login(formData: FormData): Promise<ActionResponse> {
  // Parse and validate input
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const validated = loginSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  // Attempt login
  const { data, error } = await getAuth().signIn.email({ email, password });

  if (error) {
    return { error: { general: error.message ?? 'Failed to log in' } };
  }

  // Only send user ID to Sentry (GDPR compliance - no PII)
  if (isSentryEnabled() && data?.user) {
    Sentry.setUser({ id: data.user.id });
  }

  // Successful login - redirect to /today
  redirect('/today');
}

export async function signup(formData: FormData): Promise<ActionResponse> {
  // Parse and validate input
  const rawData = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const validated = signupSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.flatten().fieldErrors };
  }

  const { fullName, email, password } = validated.data;

  // Attempt signup
  const { data, error } = await getAuth().signUp.email({
    email,
    password,
    name: fullName,
  });

  if (error) {
    return { error: { general: error.message ?? 'Failed to sign up' } };
  }

  // Only send user ID to Sentry (GDPR compliance - no PII)
  if (isSentryEnabled() && data?.user) {
    Sentry.setUser({ id: data.user.id });
  }

  // Email verification is off, so the new user is signed in. The protected
  // layout sets up the account on the first page load.
  redirect('/today');
}

export async function signOut(): Promise<{ error: string } | undefined> {
  const { error } = await getAuth().signOut();

  if (error) {
    return { error: error.message ?? 'Failed to sign out' };
  }

  // Clear Sentry user context on logout (production only)
  if (isSentryEnabled()) {
    Sentry.setUser(null);
  }

  // Successful logout - redirect to /login
  redirect('/login');
}
