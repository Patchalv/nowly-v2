-- =====================================================
-- PROFILES TABLE
-- User profile data synced from Neon Auth
-- =====================================================
-- Neon port of supabase/migrations/20240101000001_create_profiles.sql.
-- Edits: profiles.id references neon_auth."user"(id); no handle_new_user()
-- or on_auth_user_created trigger (account setup is ensure_account(), see
-- 20240101000015); update_updated_at() is production's hardened version
-- (docs/verification/neon-spike-files/production-functions.sql), and the
-- function bodies use $$ quoting.
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Updated_at trigger function (used by multiple tables)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;

-- Trigger for updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rollback:
-- DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
-- DROP FUNCTION IF EXISTS update_updated_at();
-- DROP TABLE IF EXISTS public.profiles CASCADE;
