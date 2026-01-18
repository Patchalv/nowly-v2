-- =====================================================
-- TASKS TABLE
-- Main task table with self-reference for subtasks
-- =====================================================

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurring_task_id UUID REFERENCES public.recurring_tasks(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,

  -- Date fields (critical distinction!)
  scheduled_date DATE,
  due_date DATE,

  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 3),
  position INTEGER DEFAULT 0,

  -- For recurring task instances
  is_detached BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_scheduled ON public.tasks(workspace_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(recurring_task_id);

-- Partial index for incomplete tasks
CREATE INDEX IF NOT EXISTS idx_tasks_incomplete_scheduled
  ON public.tasks(user_id, scheduled_date)
  WHERE is_completed = FALSE;

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback:
-- DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
-- DROP TABLE IF EXISTS public.tasks CASCADE;
