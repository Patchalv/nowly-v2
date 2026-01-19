import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import {
  MoreVertical,
  Clock,
  Layers,
  Calendar,
  Flag,
  RefreshCw,
  CheckCircle2,
  ListTodo,
  Repeat,
  Zap,
  X,
  Briefcase,
  GraduationCap,
  Users,
} from 'lucide-react';

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
              Plan when you&apos;ll actually work on tasks, separate from when
              they&apos;re due. Match tasks to your energy levels, organize by
              context, and never let important work fall through the cracks.
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
              {/* Header with Workspace Indicator */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 text-sm dark:bg-blue-900/30">
                    💼
                  </div>
                  <span className="text-sm font-semibold">Work</span>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>

              {/* Task Card with Category Badge */}
              <div className="bg-background flex items-center gap-3 rounded-xl border p-3 shadow-sm">
                <div className="border-border h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-32 rounded-full" />
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700 dark:bg-purple-900/30"
                    >
                      DEEP WORK
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/30"
                    >
                      <Calendar className="mr-0.5 h-2.5 w-2.5" />
                      Today
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30"
                    >
                      <Flag className="mr-0.5 h-2.5 w-2.5" />
                      Due Wed
                    </Badge>
                  </div>
                </div>
                <MoreVertical className="text-muted-foreground h-4 w-4" />
              </div>

              {/* Active Task with Recurring Indicator */}
              <div className="bg-background flex items-center gap-3 rounded-xl border border-l-4 border-l-emerald-500 p-3 shadow-sm">
                <div className="border-border h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-28 rounded-full" />
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/30"
                    >
                      HEALTH
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="h-auto border-0 bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/30"
                    >
                      <Calendar className="mr-0.5 h-2.5 w-2.5" />
                      Today
                    </Badge>
                    <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>Repeats</span>
                    </div>
                  </div>
                </div>
                <Clock className="h-4 w-4 text-emerald-500" />
              </div>

              {/* Completed Task */}
              <div className="bg-background flex items-center gap-3 rounded-xl border p-3 opacity-60 shadow-sm">
                <div className="bg-foreground h-5 w-5 rounded-md border-2"></div>
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
            </div>

            {/* Gradient Overlay */}
            <div className="from-background pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-40"></div>
          </div>
        </section>

        {/* How You'll Use It Section */}
        <section className="space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              How you&apos;ll use it
            </h2>
            <p className="text-muted-foreground">
              Four views for capturing, planning, and executing your work
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Today</h3>
                <p className="text-muted-foreground">
                  Your daily focus list. Overdue tasks automatically roll
                  forward so nothing gets lost. Start here every morning.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Daily</h3>
                <p className="text-muted-foreground">
                  Week planner with day-by-day navigation. Schedule tasks across
                  your week based on when you&apos;ll actually have time and
                  energy.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <ListTodo className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Backlog</h3>
                <p className="text-muted-foreground">
                  Inbox for unscheduled tasks. Capture ideas quickly without
                  committing to a date. Schedule them when ready.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                  <Repeat className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Recurring Tasks</h3>
                <p className="text-muted-foreground">
                  Templates that auto-generate task instances. Set it once,
                  never think about daily routines again.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground">
              Core concepts that make Nowly different
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Workspaces</h3>
                <p className="text-muted-foreground">
                  Separate contexts like Personal, Work, and Side Projects. Each
                  workspace has its own categories and color scheme. Filter your
                  entire app by workspace to stay focused.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">
                  Energy-Based Categories
                </h3>
                <p className="text-muted-foreground">
                  Tag tasks by the energy they require: Deep Work, Admin,
                  Creative. Schedule high-energy tasks when you&apos;re fresh,
                  low-energy tasks when you&apos;re winding down.
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
                  Set when you&apos;ll work on a task (scheduled date)
                  separately from when it&apos;s due (deadline). Plan realistic
                  timelines instead of artificial urgency.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20">
                  <Repeat className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Recurring Tasks</h3>
                <p className="text-muted-foreground">
                  Create templates for daily routines, weekly reviews, or
                  monthly goals. Tasks auto-generate on schedule. Modify
                  individual instances without breaking the pattern.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Nowly Section */}
        <section className="space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Why Nowly?</h2>
            <p className="text-muted-foreground">
              Built for how you actually work
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
            {/* Other Apps */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <X className="text-destructive h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold">Other Apps</h3>
                </div>
                <ul className="text-muted-foreground space-y-3 text-sm">
                  <li className="flex gap-2">
                    <X className="text-destructive h-4 w-4 flex-shrink-0" />
                    <span>
                      Only track deadlines, not when you&apos;ll actually work
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <X className="text-destructive h-4 w-4 flex-shrink-0" />
                    <span>
                      Mix personal and work tasks in one overwhelming list
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <X className="text-destructive h-4 w-4 flex-shrink-0" />
                    <span>Manual setup for every recurring task instance</span>
                  </li>
                  <li className="flex gap-2">
                    <X className="text-destructive h-4 w-4 flex-shrink-0" />
                    <span>No energy-level matching for task scheduling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Nowly */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <CheckCircle2 className="text-primary h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold">Nowly</h3>
                </div>
                <ul className="text-muted-foreground space-y-3 text-sm">
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 flex-shrink-0" />
                    <span>
                      Scheduled date AND due date for realistic planning
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 flex-shrink-0" />
                    <span>Workspaces keep contexts separate but visible</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 flex-shrink-0" />
                    <span>
                      Recurring task templates auto-generate instances
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="text-primary h-4 w-4 flex-shrink-0" />
                    <span>
                      Energy-based categories match tasks to your state
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Who uses Nowly?
            </h2>
            <p className="text-muted-foreground">
              Different workflows, same powerful system
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Freelancers</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Separate workspace for each client. Schedule deep work for
                  mornings, admin tasks for afternoons. Recurring tasks for
                  invoicing and follow-ups.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    Client Work
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Personal
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Admin
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Students</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  One workspace per course. Categories for lectures,
                  assignments, studying. Schedule study sessions days before
                  exams, not last-minute.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    CS 101
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Biology
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Personal
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-foreground/40 transition-all">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-xl font-bold">Professionals</h3>
                <p className="text-muted-foreground mb-3 text-sm">
                  Work and personal in separate workspaces. Energy-based
                  categories ensure strategic work gets morning slots. Recurring
                  1-on-1s and reviews.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    Work
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Personal
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Side Project
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Everything You Need Section */}
        <section className="bg-muted/30 mx-auto max-w-4xl space-y-8 rounded-3xl border p-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need
            </h2>
            <p className="text-muted-foreground">
              All the features to take control of your time
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Scheduled vs. Due Dates</h4>
                <p className="text-muted-foreground text-sm">
                  Plan when you&apos;ll work, track when it&apos;s due
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Multiple Workspaces</h4>
                <p className="text-muted-foreground text-sm">
                  Separate contexts with custom colors and icons
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Energy-Based Categories</h4>
                <p className="text-muted-foreground text-sm">
                  Match tasks to your energy levels throughout the day
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Recurring Task Templates</h4>
                <p className="text-muted-foreground text-sm">
                  Set once, auto-generate daily/weekly/monthly tasks
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Today View with Rollover</h4>
                <p className="text-muted-foreground text-sm">
                  Overdue tasks automatically appear in today&apos;s list
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Week Planner</h4>
                <p className="text-muted-foreground text-sm">
                  Navigate days and schedule across your entire week
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Backlog Inbox</h4>
                <p className="text-muted-foreground text-sm">
                  Capture unscheduled tasks without committing to dates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Workspace Filtering</h4>
                <p className="text-muted-foreground text-sm">
                  Focus on one context or view all workspaces at once
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Quick Task Capture</h4>
                <p className="text-muted-foreground text-sm">
                  Add tasks in seconds with keyboard shortcuts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-primary h-5 w-5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Dark Mode</h4>
                <p className="text-muted-foreground text-sm">
                  Beautiful interface for day or night work sessions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-foreground text-background mx-auto max-w-2xl space-y-6 rounded-3xl p-8 text-center">
          <h2 className="text-3xl font-bold">Ready to take control?</h2>
          <p className="text-foreground/70">
            Built for intentional planners who value execution over endless
            organization.
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
