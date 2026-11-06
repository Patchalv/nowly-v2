-- =====================================================
-- ENHANCED RECURRENCE PATTERNS
-- Add support for weekly intervals, monthly intervals,
-- and Nth weekday of month patterns
-- =====================================================

-- Add new columns for enhanced recurrence patterns
ALTER TABLE public.recurring_tasks
  ADD COLUMN IF NOT EXISTS interval_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS interval_months INTEGER,
  ADD COLUMN IF NOT EXISTS week_of_month INTEGER;

-- Add month_of_year for fixed_yearly (already in TypeScript schema, missing in DB)
ALTER TABLE public.recurring_tasks
  ADD COLUMN IF NOT EXISTS month_of_year INTEGER;

-- Update check constraint to include fixed_yearly
ALTER TABLE public.recurring_tasks
  DROP CONSTRAINT IF EXISTS recurring_tasks_recurrence_type_check;

ALTER TABLE public.recurring_tasks
  ADD CONSTRAINT recurring_tasks_recurrence_type_check
  CHECK (recurrence_type IN (
    'interval_from_completion',
    'fixed_daily',
    'fixed_weekly',
    'fixed_monthly',
    'fixed_yearly'
  ));

-- Add check constraints for new columns
ALTER TABLE public.recurring_tasks
  ADD CONSTRAINT check_interval_weeks
    CHECK (interval_weeks IS NULL OR interval_weeks >= 1);

ALTER TABLE public.recurring_tasks
  ADD CONSTRAINT check_interval_months
    CHECK (interval_months IS NULL OR interval_months >= 1);

ALTER TABLE public.recurring_tasks
  ADD CONSTRAINT check_week_of_month
    CHECK (week_of_month IS NULL OR week_of_month BETWEEN -1 AND 5);

ALTER TABLE public.recurring_tasks
  ADD CONSTRAINT check_month_of_year
    CHECK (month_of_year IS NULL OR month_of_year BETWEEN 1 AND 12);

-- Add comments for documentation
COMMENT ON COLUMN public.recurring_tasks.interval_weeks IS 'Number of weeks between occurrences for fixed_weekly (default 1)';
COMMENT ON COLUMN public.recurring_tasks.interval_months IS 'Number of months between occurrences for fixed_monthly (default 1)';
COMMENT ON COLUMN public.recurring_tasks.week_of_month IS 'Nth occurrence of weekday in month: 1-5 for 1st-5th, -1 for last';
COMMENT ON COLUMN public.recurring_tasks.month_of_year IS 'Month for fixed_yearly: 1-12 (January-December)';

-- Rollback:
-- ALTER TABLE public.recurring_tasks DROP CONSTRAINT IF EXISTS check_month_of_year;
-- ALTER TABLE public.recurring_tasks DROP CONSTRAINT IF EXISTS check_week_of_month;
-- ALTER TABLE public.recurring_tasks DROP CONSTRAINT IF EXISTS check_interval_months;
-- ALTER TABLE public.recurring_tasks DROP CONSTRAINT IF EXISTS check_interval_weeks;
-- ALTER TABLE public.recurring_tasks DROP COLUMN IF EXISTS month_of_year;
-- ALTER TABLE public.recurring_tasks DROP COLUMN IF EXISTS week_of_month;
-- ALTER TABLE public.recurring_tasks DROP COLUMN IF EXISTS interval_months;
-- ALTER TABLE public.recurring_tasks DROP COLUMN IF EXISTS interval_weeks;
