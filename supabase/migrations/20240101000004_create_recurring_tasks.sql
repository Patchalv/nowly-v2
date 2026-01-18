-- =====================================================
-- RECURRING_TASKS TABLE
-- Master templates for recurring task generation
-- =====================================================

-- Create recurring_tasks table
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),

  -- Recurrence configuration
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN (
    'interval_from_completion',
    'fixed_daily',
    'fixed_weekly',
    'fixed_monthly'
  )),

  interval_days INTEGER,
  days_of_week INTEGER[],
  day_of_month INTEGER,

  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,

  occurrences_generated INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_user ON public.recurring_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_next_due ON public.recurring_tasks(next_due_date)
  WHERE is_active = TRUE AND is_paused = FALSE;

-- Enable RLS
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage own recurring tasks" ON public.recurring_tasks;
CREATE POLICY "Users can manage own recurring tasks"
  ON public.recurring_tasks FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_recurring_tasks_updated_at ON public.recurring_tasks;
CREATE TRIGGER update_recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback:
-- DROP TRIGGER IF EXISTS update_recurring_tasks_updated_at ON public.recurring_tasks;
-- DROP TABLE IF EXISTS public.recurring_tasks CASCADE;
