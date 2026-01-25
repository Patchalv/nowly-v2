import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SentryUserContext } from '@/components/sentry-user-context';
import { OnboardingTour } from '@/components/features/onboarding/OnboardingTour';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  // PRIMARY AUTH CHECK - validates JWT with Supabase server
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME);

  // Default to open (true) if no cookie, otherwise parse the cookie value
  const defaultOpen =
    sidebarCookie?.value === undefined ? true : sidebarCookie.value === 'true';

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex flex-1 flex-col p-4">{children}</main>
        </SidebarInset>
        <OnboardingTour />
      </SidebarProvider>
      {/* Set Sentry user context for error tracking in production */}
      <SentryUserContext />
    </TooltipProvider>
  );
}
