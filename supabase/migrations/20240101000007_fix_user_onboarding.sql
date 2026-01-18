-- =====================================================
-- FIX USER ONBOARDING
-- Ensures new users get a default workspace with categories
-- =====================================================

-- =====================================================
-- Update handle_new_user() to create default workspace
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration:
--
-- -- Restore original handle_new_user function
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, email, full_name, avatar_url)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     NEW.raw_user_meta_data->>'full_name',
--     NEW.raw_user_meta_data->>'avatar_url'
--   );
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
