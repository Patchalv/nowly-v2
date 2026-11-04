-- Spike: Neon-specific additions on top of the ported Supabase schema.

DROP FUNCTION IF EXISTS public.handle_new_user();

-- Explicit grants: Neon gives `authenticated` nothing by default.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles, public.workspaces, public.categories,
  public.recurring_tasks, public.tasks, public.user_onboarding
  TO authenticated;

-- Idempotent account setup. Replaces the Supabase trigger on auth.users.
-- Takes no user id: the caller is always auth.uid().
CREATE OR REPLACE FUNCTION public.ensure_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  u RECORD;
  inserted INTEGER;
  new_workspace_id UUID;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'ensure_account: not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT name, email, image INTO u FROM neon_auth."user" WHERE id = caller;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ensure_account: no neon_auth user %', caller;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (caller, u.email, u.name, u.image)
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;

  IF inserted = 0 THEN
    RETURN FALSE; -- already set up
  END IF;

  INSERT INTO public.workspaces (user_id, name, color, icon, position)
  VALUES (caller, 'Default', '#6366f1', '📋', 0)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.categories (workspace_id, name, color, icon, position)
  VALUES
    (new_workspace_id, 'Personal', '#10b981', '👤', 0),
    (new_workspace_id, 'Work', '#3b82f6', '💼', 1),
    (new_workspace_id, 'Home', '#f59e0b', '🏠', 2);

  INSERT INTO public.user_onboarding (user_id) VALUES (caller);

  INSERT INTO public.tasks (user_id, workspace_id, title, scheduled_date, is_completed, priority, position)
  VALUES
    (caller, new_workspace_id, 'Explore workspaces and categories in Nowly', CURRENT_DATE, FALSE, 0, 0),
    (caller, new_workspace_id, 'Create your first task in Nowly', CURRENT_DATE, FALSE, 0, 1);

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_account() FROM PUBLIC, anonymous;
GRANT EXECUTE ON FUNCTION public.ensure_account() TO authenticated;
