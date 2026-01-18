import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="from-background to-muted flex flex-1 items-center justify-center bg-gradient-to-br p-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
