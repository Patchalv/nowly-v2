import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { MoreVertical, Clock, Layers, Tag, Calendar } from 'lucide-react';

export default function Page() {
  return (
    <div className="bg-background text-foreground min-h-screen transition-colors duration-300">
      <SiteHeader />

      {/* Main Content */}
      <main className="flex flex-col gap-16 px-6 py-12">
        {/* Hero Section */}
        <section className="mx-auto flex max-w-lg flex-col items-center space-y-8 text-center">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="text-muted-foreground border-border text-xs font-semibold tracking-wide uppercase"
            >
              REDEFINING PRODUCTIVITY
            </Badge>
            <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Manage <span className="text-primary">when you do</span>, not just
              when it&apos;s due.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Stop drowning in deadlines. Nowly helps you schedule focus time
              for tasks based on your energy and availability, not just calendar
              dates.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-xl py-6 text-lg font-semibold shadow-lg"
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-xl py-6 text-lg font-medium"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>

          {/* Mock Phone UI */}
          <div className="bg-muted relative mt-8 aspect-square w-full max-w-[340px] overflow-hidden rounded-3xl border p-4 shadow-2xl">
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="mb-2 flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>

              {/* Task Cards */}
              <div className="bg-background flex items-center gap-3 rounded-xl border p-3 shadow-sm">
                <div className="border-border h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4 rounded-full" />
                  <Skeleton className="h-2 w-1/2 rounded-full" />
                </div>
                <MoreVertical className="text-muted-foreground h-4 w-4" />
              </div>

              {/* Active Task Card */}
              <div className="bg-background flex items-center gap-3 rounded-xl border border-l-4 border-l-blue-500 p-3 shadow-sm">
                <div className="border-border h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3 rounded-full" />
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/30"
                    >
                      Today 2:00 PM
                    </Badge>
                  </div>
                </div>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>

              {/* Completed Task Card */}
              <div className="bg-background flex items-center gap-3 rounded-xl border p-3 opacity-60 shadow-sm">
                <div className="border-border h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/2 rounded-full" />
                </div>
              </div>
            </div>

            {/* Gradient Overlay */}
            <div className="from-background pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-40"></div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground">
              A system built for intentional execution.
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6">
            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Unified Workspaces</h3>
                <p className="text-muted-foreground">
                  Keep personal projects and work separated but visible in one
                  timeline. Context switching has never been this smooth.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <Tag className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Smart Categories</h3>
                <p className="text-muted-foreground">
                  Organize by energy levels or tags. Tackle &quot;Deep
                  Work&quot; when you&apos;re fresh and &quot;Admin&quot; when
                  you&apos;re winding down.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Scheduled vs. Due</h3>
                <p className="text-muted-foreground">
                  Distinguish between the hard deadline and when you actually
                  plan to work on it. Never miss a beat again.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-foreground text-background mx-auto max-w-2xl space-y-6 rounded-3xl p-8 text-center">
          <h2 className="text-3xl font-bold">Ready to take control?</h2>
          <p className="text-foreground/70">
            Join thousands of planners who are actually getting things done.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-background text-foreground hover:bg-background/90 w-full rounded-xl py-6 font-bold shadow-lg"
          >
            <Link href="/signup">Get Started for Free</Link>
          </Button>
          <p className="text-foreground/50 text-xs">
            No credit card required. Cancel anytime.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
