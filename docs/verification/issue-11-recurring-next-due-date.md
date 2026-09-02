# Verification: editing a recurring task no longer rewinds `next_due_date`

This documents the manual verification for the ticket "Editing a recurring
task rewinds next_due_date to start_date" (issue #11), run against a
throwaway Postgres cluster as required by the ticket's acceptance criteria,
the same way #9 was verified. It is not an automated test (the repo has no
test suite) - it's a recorded, reproducible transcript so a reviewer doesn't
have to redo the work to confirm the fix.

There's no Docker daemon, Supabase CLI project link, or Supabase credentials
in the sandbox this was produced in, so this drives the **real, unmodified**
`buildRecurringTaskUpdate` (`src/lib/utils/recurring-task-update.ts`, which
itself imports the real `src/lib/utils/recurrence.ts` unmodified) exactly
the way `updateRecurringTaskAndInstances` does - fetch the existing row,
call `buildRecurringTaskUpdate(data, existing)`, then `UPDATE ... SET
<result>` - with only the network layer swapped: a direct `pg` connection to
a local Postgres 16 server loaded with this repo's own
`supabase/migrations/*.sql`, instead of a live Supabase/PostgREST call. The
harness imports the production file itself (verified byte-identical to what
shipped in this PR - see "Reproducing this" below), so it is exercising the
actual whitelist-building, rule-change-gating and merge logic, not a
hand-typed description of it.

## Setup

```bash
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE DATABASE recurring_verify;"
sudo -u postgres psql -c "CREATE ROLE verify_user LOGIN PASSWORD 'verify_pw' SUPERUSER;"
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
the noise. This typo was not touched in this PR's diff - it's out of scope
for this ticket - but is worth its own follow-up.

## Harness

```ts
// harness.ts - imports the real production file unmodified.
import { Client } from 'pg';
import { buildRecurringTaskUpdate } from './src/lib/utils/recurring-task-update';

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'verify_user',
  password: 'verify_pw',
  database: 'recurring_verify',
});

async function fetchExisting(id: string) {
  const { rows } = await client.query(
    'SELECT * FROM public.recurring_tasks WHERE id = $1',
    [id]
  );
  return rows[0];
}

async function applyUpdate(id: string, update: Record<string, unknown>) {
  const keys = Object.keys(update);
  if (keys.length === 0) return;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => update[k]);
  await client.query(
    `UPDATE public.recurring_tasks SET ${setClause} WHERE id = $1`,
    [id, ...values]
  );
}

// existing row fetched from Postgres -> real buildRecurringTaskUpdate call
// -> real object written back with the real UPDATE statement it produces.
const existing = await fetchExisting(id);
const update = buildRecurringTaskUpdate(payload, existing);
await applyUpdate(id, update);
```

`buildRecurringTaskUpdate` and `calculateNextOccurrenceOnOrAfter` were
loaded via a `tsconfig.json` `paths` mapping (`"@/*": ["src/*"]`) so the
production files could be copied into the harness project and imported
**without editing a single line of them** - `pg`/`tsx` were installed with
`--no-save` (not added to this repo's `package.json`/lockfile).

## Scenario 1: title-only edit leaves `next_due_date` untouched

Seeded a `fixed_daily` template whose `next_due_date` (2025-06-15) had
already advanced well past its `start_date` (2025-01-01), then called the
real `buildRecurringTaskUpdate` with the payload a title-only save from
`RecurringDialog` produces (the rest of the recurrence config resent
unchanged) and applied whatever it returned:

```
Before: { title: 'Water the plants', recurrence_type: 'fixed_daily', next_due_date: 2025-06-15 }

buildRecurringTaskUpdate returned:
{ title: 'Water the plants daily', priority: 0, recurrence_type: 'fixed_daily',
  interval_days: 1, start_date: '2025-01-01', is_active: true }
  <- note: no next_due_date key at all

SQL:    UPDATE public.recurring_tasks SET title = $2, priority = $3,
          recurrence_type = $4, interval_days = $5, start_date = $6,
          is_active = $7 WHERE id = $1
Params: ["33333333-...", "Water the plants daily", 0, "fixed_daily", 1, "2025-01-01", true]

After: { title: 'Water the plants daily', next_due_date: 2025-06-15 }

PASS: scenario 1 next_due_date unchanged = 2025-06-15 (expected 2025-06-15)
```

## Scenario 2: a full recurrence-rule change recomputes to "today", not `start_date`

Same row, now calling `buildRecurringTaskUpdate` with a payload that changes
the recurrence rule itself (`fixed_daily` -> `fixed_weekly`, every Monday).
The sandbox's clock read 2026-08-31 (a Monday) when this ran:

```
buildRecurringTaskUpdate returned:
{ recurrence_type: 'fixed_weekly', interval_weeks: 1, days_of_week: [0],
  next_due_date: '2026-08-31' }
  <- next_due_date IS present this time, computed by the real
     calculateNextOccurrenceOnOrAfter, not copied from start_date

SQL:    UPDATE public.recurring_tasks SET recurrence_type = $2,
          interval_weeks = $3, days_of_week = $4, next_due_date = $5
          WHERE id = $1
Params: ["33333333-...", "fixed_weekly", 1, [0], "2026-08-31"]

After: { recurrence_type: 'fixed_weekly', interval_weeks: 1, days_of_week: [0],
         start_date: '2025-01-01', next_due_date: '2026-08-31' }

PASS: next_due_date (2026-08-31) !== start_date (2025-01-01)
```

## Scenario 3: a partial patch that changes only `interval_months` still recomputes

This exercises the fix from the second review round: the recompute must not
be gated on `recurrence_type` being present in the payload, or a caller that
patches just one rule field (without resending `recurrence_type`) would
silently skip the recompute.

Seeded a `fixed_monthly` template, day 5 of every month, then called
`buildRecurringTaskUpdate` with a payload that is _only_
`{ interval_months: 3 }` - `recurrence_type` and `day_of_month` are not
present in the object at all, not just `undefined`-valued keys:

```
Before: { recurrence_type: 'fixed_monthly', interval_months: 1, day_of_month: 5,
          next_due_date: 2025-06-05 }

buildRecurringTaskUpdate returned:
{ interval_months: 3, next_due_date: '2026-11-05' }

SQL:    UPDATE public.recurring_tasks SET interval_months = $2,
          next_due_date = $3 WHERE id = $1
Params: ["44444444-...", 3, "2026-11-05"]

After: { recurrence_type: 'fixed_monthly', interval_months: 3, day_of_month: 5,
         next_due_date: '2026-11-05' }

PASS: scenario 3 interval_months = 3 (expected 3)
PASS: scenario 3 day_of_month preserved (not clobbered) = 5 (expected 5)
PASS: scenario 3 next_due_date recomputed = 2026-11-05 (expected 2026-11-05)
```

`day_of_month` is preserved from the stored row (falls back correctly since
none of `day_of_month`/`week_of_month`/`days_of_week` were touched by this
patch), and `next_due_date` is recomputed to November 5th: day 5 had already
passed in August (the sandbox's "today"), and with the interval now every 3
months starting from August, November is the next eligible month.

```
OVERALL: PASS
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

## Reproducing this

The two production files used by the harness
(`src/lib/utils/recurring-task-update.ts` and `src/lib/utils/recurrence.ts`)
were copied into the harness project and diffed against the versions in
this PR immediately before running, confirming byte-for-byte equality
(`diff` produced no output) - the harness never edited them, only mapped the
`@/*` import alias via `tsconfig.json` so they'd resolve outside this
repo's own Next.js build.

## Teardown

```bash
sudo -u postgres psql -c "DROP DATABASE recurring_verify;"
sudo -u postgres psql -c "DROP ROLE verify_user;"
sudo pg_ctlcluster 16 main stop
```
