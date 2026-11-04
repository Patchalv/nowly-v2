-- Schema fingerprint used by the spike to compare the Neon port with production.
-- Run against the Neon branch after applying the migrations and compare with
-- the production values recorded below (taken from Supabase project
-- xranzhizzedugrakggkf on 2026-11-04).
--
-- k                                  production value
-- col                                8f413d3aca189b038a5e0d08bc415547
-- pol                                750883ba16c11a35eeb3823b9a434b42
-- idx                                abc9059535be7669009228f4bbcfac3f
-- chk                                f84f373821303569c1c4e1473538ce89
-- fn:calculate_next_recurrence       09ce1e38b4d22ccbfc9f72aee171cb6c
-- fn:update_updated_at               f240f2c28154d7f8068600476ba15b17   (production's hand-edited version)
-- fn:generate_next_recurring_instance 211bb2265d2b7d2db1ead97ffb739b85  (production runs the 0013 version)
-- trg  on_task_completed tasks,update_profiles_updated_at profiles,update_recurring_tasks_updated_at recurring_tasks,update_tasks_updated_at tasks,update_user_onboarding_updated_at user_onboarding,update_workspaces_updated_at workspaces
--
-- Expected on Neon:
-- * col, pol, idx, chk, trg and fn:calculate_next_recurrence equal production.
-- * fn:generate_next_recurring_instance differs ON PURPOSE: Neon carries the
--   repo's migration-0014 version. The spike's 0014 port fingerprinted as
--   ed64a51d9b4622f4372ad59db2cffcc7.
-- * fn:update_updated_at equals production once production-functions.sql's
--   definition is used (the spike's port used the repo version, 5b1124a2...).
-- * fn:handle_new_user must not exist on Neon.
-- On Supabase, exclude auth/storage/realtime triggers; on Neon, exclude neon_auth.

SELECT 'col' AS k, md5(string_agg(table_name||'.'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''), '|' ORDER BY table_name, column_name)) AS v
  FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL
SELECT 'pol', md5(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'')||':'||array_to_string(roles,','), '|' ORDER BY tablename, policyname))
  FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'fn:'||p.proname, md5(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'))
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('generate_next_recurring_instance', 'calculate_next_recurrence', 'update_updated_at', 'handle_new_user')
UNION ALL
SELECT 'trg', string_agg(tgname||' '||tgrelid::regclass::text, ',' ORDER BY tgname)
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgrelid::regclass::text NOT LIKE 'neon_auth.%'
   AND tgrelid::regclass::text NOT LIKE 'auth.%'
   AND tgrelid::regclass::text NOT LIKE 'storage.%'
   AND tgrelid::regclass::text NOT LIKE 'realtime.%'
UNION ALL
SELECT 'idx', md5(string_agg(indexdef, '|' ORDER BY indexname))
  FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'chk', md5(string_agg(conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid), '|' ORDER BY conrelid::regclass::text, conname))
  FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype IN ('c', 'u', 'p');
