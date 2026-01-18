'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
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

export async function login(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: { general: error.message } };
  }

  // Successful login - redirect to /today
  redirect('/today');
}

export async function signup(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: { general: error.message } };
  }

  // Successful signup - return success message
  return { success: 'Check your email to confirm your account' };
}

export async function signInWithGoogle(): Promise<
  { error: string } | undefined
> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Redirect to Google OAuth
  if (data.url) {
    redirect(data.url);
  }

  return { error: 'Failed to initiate Google sign in' };
}

export async function signOut(): Promise<{ error: string } | undefined> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  // Successful logout - redirect to /login
  redirect('/login');
}
