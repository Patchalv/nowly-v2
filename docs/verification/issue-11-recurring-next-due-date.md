# Verification: editing a recurring task no longer rewinds `next_due_date`

This documents the manual verification for the ticket "Editing a recurring
task rewinds next_due_date to start_date" (issue #11), run against a
throwaway Postgres cluster as required by the ticket's acceptance criteria,
the same way #9 was verified. It is not an automated test (the repo has no
test suite) - it's a recorded, reproducible transcript so a reviewer doesn't
have to redo the work to confirm the fix.

There's no Docker daemon, Supabase CLI project link, or Supabase credentials
in the sandbox this was produced in, so this exercises the exact `UPDATE`
statement shapes the new code in `actions.ts` issues directly against a
local Postgres 16 server loaded with this repo's own
`supabase/migrations/*.sql`, rather than going through a running
Next.js + PostgREST stack.

## Setup

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE DATABASE recurring_verify;"
```

A minimal stub of the pieces of Supabase's `auth` schema these migrations
reference (`auth.users`, `auth.uid()`, and the `authenticated`/`anon`/
`service_role` roles) was created so the migrations apply as-is:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
GRANT ALL ON auth.users TO authenticated, anon, service_role;
```

Then every file in `supabase/migrations/` was applied in order, unmodified,
with `psql -f`.

**Pre-existing, unrelated issue found along the way:** migrations
`20240101000001`, `...002`, `...004`, `...005`, `...006` and `...011` use a
single `$` instead of `$$` as the PL/pgSQL dollar-quote delimiter (e.g.
`RETURNS TRIGGER AS $ ... $ LANGUAGE plpgsql;`), which is invalid Postgres
syntax - present since the commit that first added these files, unrelated to
this ticket. Their `CREATE TABLE`/`CREATE POLICY`/`CREATE INDEX` statements
still succeed (each statement in the file is independent), only the
`update_updated_at()` and the _original_ (long since superseded by
migrations 10/12/13) `generate_next_recurring_instance()` function bodies
fail to create. Neither is needed to verify `next_due_date` behaviour, so a
one-off local stand-in for `update_updated_at()` was created purely to quiet
the noise:

```sql
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

This typo was not touched in this PR's diff - it's out of scope for this
ticket - but is worth its own follow-up.

## Scenario 1: title-only edit leaves `next_due_date` untouched

Seeded a `fixed_daily` template whose `next_due_date` (2025-06-15) had
already advanced well past its `start_date` (2025-01-01):

```sql
INSERT INTO public.recurring_tasks (
  id, user_id, workspace_id, title, description, priority,
  recurrence_type, interval_days, start_date, next_due_date,
  is_active, is_paused, occurrences_generated
) VALUES (
  '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 'Water the plants', NULL, 0,
  'fixed_daily', 1, '2025-01-01', '2025-06-15', true, false, 10
);
```

Then ran the exact `UPDATE` `updateRecurringTaskAndInstances` issues when no
recurrence-rule field is present in the edit payload (`next_due_date` is not
mentioned at all):

```sql
UPDATE public.recurring_tasks
SET title = 'Water the plants daily', description = NULL, category_id = NULL,
    priority = 0, start_date = '2025-01-01', end_date = NULL, is_active = true
WHERE id = '33333333-3333-3333-3333-333333333333';
```

**Result:** `next_due_date` stayed `2025-06-15`.

```
                  title          | recurrence_type | interval_days | start_date | next_due_date
------------------------+-----------------+---------------+------------+---------------
 Water the plants daily | fixed_daily     |             1 | 2025-01-01 | 2025-06-15

NOTICE:  PASS scenario 1: next_due_date unchanged at 2025-06-15
```

## Scenario 2: a full recurrence-rule change recomputes to "today", not `start_date`

Same row, now editing the recurrence rule itself (`fixed_daily` ->
`fixed_weekly`, every Monday). `next_due_date` computed by
`calculateNextOccurrenceOnOrAfter` for a reference date of `2026-08-31`
(itself a Monday) is `2026-08-31`:

```sql
UPDATE public.recurring_tasks
SET recurrence_type = 'fixed_weekly', interval_days = NULL, interval_weeks = 1,
    days_of_week = ARRAY[0], next_due_date = '2026-08-31'
WHERE id = '33333333-3333-3333-3333-333333333333';
```

**Result:** `next_due_date` became `2026-08-31` - today, not `start_date`
(`2025-01-01`) and not the stale `2025-06-15`.

```
         title          | recurrence_type | interval_weeks | days_of_week | start_date | next_due_date
------------------------+-----------------+----------------+--------------+------------+---------------
 Water the plants daily | fixed_weekly    |              1 | {0}          | 2025-01-01 | 2026-08-31

NOTICE:  PASS scenario 2: next_due_date recomputed to 2026-08-31 (start_date 2025-01-01 untouched)
```

## Scenario 3: a partial patch that changes only `interval_months` still recomputes

This exercises the fix for the second review round: the recompute must not
be gated on `recurrence_type` being present in the payload, or a caller that
patches just one rule field (without resending `recurrence_type`) would
silently skip the recompute.

Seeded a `fixed_monthly` template, day 5 of every month:

```sql
INSERT INTO public.recurring_tasks (
  id, user_id, workspace_id, title, description, priority,
  recurrence_type, interval_months, day_of_month, start_date, next_due_date,
  is_active, is_paused, occurrences_generated
) VALUES (
  '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 'Pay rent', NULL, 0,
  'fixed_monthly', 1, 5, '2025-01-01', '2025-06-05', true, false, 5
);
```

Simulated payload: `{ interval_months: 3 }` only - no `recurrence_type`, no
`day_of_month`/`week_of_month`/`days_of_week`. Checked in isolation (via
`npx tsx`, not added as a project dependency) that the new gating condition
fires where the old one wouldn't, and that `day_of_month` correctly falls
back to the stored value of `5` (not clobbered) when computing the new date:

```
OLD gate (recurrence_type-only) would recompute: false   <- bug: never runs
NEW gate (any rule field) would recompute: true
Computed next_due_date for the merged state: 2026-11-05 (expect 2026-11-05:
day 5 already passed this Aug, +3-month interval => November)
```

Then ran the corresponding `UPDATE` against Postgres:

```sql
UPDATE public.recurring_tasks
SET interval_months = 3, next_due_date = '2026-11-05'
WHERE id = '44444444-4444-4444-4444-444444444444';
```

**Result:** `interval_months` changed to 3, `day_of_month` stayed 5
(untouched, pulled from the stored row since the payload didn't touch it),
and `next_due_date` recomputed to `2026-11-05`.

```
  title   | recurrence_type | interval_months | day_of_month | next_due_date
----------+-----------------+-----------------+--------------+---------------
 Pay rent | fixed_monthly   |               3 |            5 | 2026-11-05

NOTICE:  PASS scenario 3: next_due_date recomputed to 2026-11-05 using
preserved day_of_month=5, even though the payload only contained
interval_months
```

## `calculateNextOccurrenceOnOrAfter` date-math cases

Ran `src/lib/utils/recurrence.ts`'s new `calculateNextOccurrenceOnOrAfter`
directly (via `npx tsx`, not added as a project dependency) against 15
hand-checked cases spanning all 5 recurrence types - today already matching
the pattern, the target day still ahead this period, the target day already
passed, quarterly/biweekly intervals, the Nth-weekday-of-month pattern, and
the day-31/last-day-of-month sentinel:

```
OK   fixed_daily today: got 2026-08-31, expected 2026-08-31
OK   interval_from_completion today: got 2026-08-31, expected 2026-08-31
OK   fixed_weekly today matches (Mon): got 2026-08-31, expected 2026-08-31
OK   fixed_weekly next Wed: got 2026-09-02, expected 2026-09-02
OK   fixed_weekly biweekly today matches (base week): got 2026-08-31, expected 2026-08-31
OK   fixed_monthly this month (day ahead): got 2026-08-15, expected 2026-08-15
OK   fixed_monthly next month (day passed): got 2026-09-05, expected 2026-09-05
OK   fixed_monthly today matches: got 2026-08-10, expected 2026-08-10
OK   fixed_monthly quarterly (day passed): got 2026-11-05, expected 2026-11-05
OK   fixed_monthly last day, ahead: got 2026-08-31, expected 2026-08-31
OK   fixed_monthly nth weekday ahead: got 2026-08-03, expected 2026-08-03
OK   fixed_monthly nth weekday passed: got 2026-09-07, expected 2026-09-07
OK   fixed_yearly this year ahead: got 2026-12-25, expected 2026-12-25
OK   fixed_yearly next year: got 2027-01-15, expected 2027-01-15
OK   fixed_yearly today matches: got 2026-08-31, expected 2026-08-31

OVERALL: PASS (all 15 cases)
```

## Teardown

```bash
sudo -u postgres psql -c "DROP DATABASE recurring_verify;"
sudo pg_ctlcluster 16 main stop
```
