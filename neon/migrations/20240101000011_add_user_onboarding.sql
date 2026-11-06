-- =====================================================
-- USER ONBOARDING TABLE
-- Tracks tour completion and dismissed tooltips for new users
-- =====================================================
-- Neon port of supabase/migrations/20240101000011_add_user_onboarding.sql.
-- Edits: user_id references neon_auth."user"(id); the handle_new_user()
-- update is dropped (account setup is ensure_account(), see 20240101000015).
-- =====================================================

-- Create user_onboarding table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES neon_auth."user"(id) ON DELETE CASCADE UNIQUE NOT NULL,

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
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration:
--
-- -- Drop the user_onboarding table
-- DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON public.user_onboarding;
-- DROP TABLE IF EXISTS public.user_onboarding CASCADE;
