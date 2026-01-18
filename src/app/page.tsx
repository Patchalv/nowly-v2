import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br">
      <div className="max-w-2xl space-y-6 px-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Welcome to Nowly</h1>
        <p className="text-muted-foreground text-xl">
          A simple, powerful task management app that helps you focus on what
          matters today.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
