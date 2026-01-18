import type { ReactNode } from 'react';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* TODO: Add sidebar, header, etc. here in the future */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
