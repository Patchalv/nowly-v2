-- =====================================================
-- CATEGORIES TABLE
-- Categories within workspaces for organizing tasks
-- =====================================================

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_categories_workspace_id ON public.categories(workspace_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage categories in own workspaces" ON public.categories;
CREATE POLICY "Users can manage categories in own workspaces"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Rollback:
-- DROP TABLE IF EXISTS public.categories CASCADE;
