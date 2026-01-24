import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SentryUserContext } from '@/components/sentry-user-context';
import { OnboardingTour } from '@/components/features/onboarding';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
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
