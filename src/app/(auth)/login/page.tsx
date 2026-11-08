import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { LoginForm } from '@/components/features/auth/LoginForm';

// Reads the session cookie, so it can't be prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Signed-in users don't need this form. On a session error, show the form.
  const { user } = await getCurrentUser();
  if (user) {
    redirect('/today');
  }

  return <LoginForm />;
}
