-- =====================================================
-- REMOVE WORKSPACE DELETION CONSTRAINT
-- The constraint to prevent deletion of the last workspace
-- should be enforced at the application level, not database level.
-- This allows proper CASCADE deletion when removing users.
-- =====================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS check_last_workspace ON public.workspaces;

-- Drop the function
DROP FUNCTION IF EXISTS prevent_last_workspace_deletion();

-- =====================================================
-- NOTE: User deletion from auth.users will now properly
-- CASCADE delete all related records:
-- - profiles
-- - workspaces (including the last one)
-- - categories (via workspace CASCADE)
-- - tasks (via workspace CASCADE)
-- - recurring_tasks (via workspace CASCADE)
--
-- The constraint "users must have at least one workspace"
-- should be enforced in the application layer:
-- - Disable delete button when only one workspace exists
-- - Show error message in UI
-- - Validate in API/Server Actions before deletion
-- =====================================================
