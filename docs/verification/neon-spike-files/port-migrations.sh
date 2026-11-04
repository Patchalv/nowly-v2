#!/usr/bin/env bash
# Spike recipe: print the 14 Supabase migrations as one Neon-ready SQL file.
# Usage: docs/verification/neon-spike-files/port-migrations.sh > ported.sql
# Then apply in one transaction: psql "$NEON_DIRECT_URL" -1 -v ON_ERROR_STOP=1 -f ported.sql
# followed by neon-additions.sql.
#
# Edits, matching the spec's "Schema port" section:
#   1. REFERENCES auth.users(id)  ->  REFERENCES neon_auth."user"(id)
#   2. drop the on_auth_user_created trigger statements (Neon has no auth.users)
#   3. fix migrations 0001 and 0006, which close function bodies with `$` not `$$`
#
# Not done here (the spike used the repo's update_updated_at; the spec says to use
# production's): see production-functions.sql.
set -euo pipefail
cd "$(dirname "$0")/../../../supabase/migrations"
cat 2024*.sql | perl -0pe '
  s/REFERENCES auth\.users\(id\)/REFERENCES neon_auth."user"(id)/g;
  s/DROP TRIGGER IF EXISTS on_auth_user_created ON auth\.users;//g;
  s/CREATE TRIGGER on_auth_user_created\s+AFTER INSERT ON auth\.users\s+FOR EACH ROW EXECUTE FUNCTION public\.handle_new_user\(\);//g;
  s/AS \$\n/AS \$\$\n/g;
  s/^\$ LANGUAGE/\$\$ LANGUAGE/mg;
'
