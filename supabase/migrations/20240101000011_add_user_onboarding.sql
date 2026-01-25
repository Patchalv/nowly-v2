-- =====================================================
-- USER ONBOARDING TABLE
-- Tracks tour completion and dismissed tooltips for new users
-- =====================================================

-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Tour state
  initial_tour_completed BOOLEAN DEFAULT FALSE,
  initial_tour_completed_at TIMESTAMPTZ,
  initial_tour_step_reached INTEGER DEFAULT 0,

  -- Contextual tooltips dismissed (array of tooltip type strings)
  dismissed_tooltips TEXT[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON public.user_onboarding(user_id);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Trigger for updated_at (uses existing function)
DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- UPDATE handle_new_user() TO INCLUDE ONBOARDING
-- Now creates: profile, workspace, categories, onboarding record, sample tasks
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create default workspace
  INSERT INTO public.workspaces (user_id, name, color, icon, position)
  VALUES (
    NEW.id,
    'Default',
    '#6366f1',
    '📋',
    0
  )
  RETURNING id INTO new_workspace_id;

  -- Create default categories in the workspace
  INSERT INTO public.categories (workspace_id, name, color, icon, position)
  VALUES
    (new_workspace_id, 'Personal', '#10b981', '👤', 0),
    (new_workspace_id, 'Work', '#3b82f6', '💼', 1),
    (new_workspace_id, 'Home', '#f59e0b', '🏠', 2);

  -- Create onboarding record
  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.id);

  -- Create sample onboarding tasks (kept as real tasks for user to complete)
  INSERT INTO public.tasks (user_id, workspace_id, title, scheduled_date, is_completed, priority, position)
  VALUES
    (NEW.id, new_workspace_id, 'Explore workspaces and categories in Nowly', today_date, FALSE, 0, 0),
    (NEW.id, new_workspace_id, 'Create your first task in Nowly', today_date, FALSE, 0, 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration:
--
-- -- Drop the user_onboarding table
-- DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
-- DROP TABLE IF EXISTS public.user_onboarding CASCADE;
--
-- -- Restore handle_new_user without onboarding/sample tasks
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   new_workspace_id UUID;
-- BEGIN
--   INSERT INTO public.profiles (id, email, full_name, avatar_url)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     NEW.raw_user_meta_data->>'full_name',
--     NEW.raw_user_meta_data->>'avatar_url'
--   );
--
--   INSERT INTO public.workspaces (user_id, name, color, icon, position)
--   VALUES (NEW.id, 'Default', '#6366f1', '📋', 0)
--   RETURNING id INTO new_workspace_id;
--
--   INSERT INTO public.categories (workspace_id, name, color, icon, position)
--   VALUES
--     (new_workspace_id, 'Personal', '#10b981', '👤', 0),
--     (new_workspace_id, 'Work', '#3b82f6', '💼', 1),
--     (new_workspace_id, 'Home', '#f59e0b', '🏠', 2);
--
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
