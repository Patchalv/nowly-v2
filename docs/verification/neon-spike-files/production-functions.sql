-- Function definitions read from production (Supabase project xranzhizzedugrakggkf)
-- with pg_get_functiondef on 2026-11-04. Reference only; not a migration.

-- update_updated_at: production was hand-edited to this hardened version, which
-- exists in no repo migration. The spec says the Neon port adopts it.
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $function$;

-- generate_next_recurring_instance: production runs the migration-0013 version
-- (no undo-retraction branch). The Neon port deliberately uses the repo's
-- migration-0014 version instead; see supabase/migrations/20240101000014_*.sql.
