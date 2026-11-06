# Neon Migrations

These files recreate Nowly's production `public` schema on Neon. They are a port of the historical [`supabase/migrations/`](../../supabase/migrations/README.md) set plus one Neon-only file. See `docs/NEON_MIGRATION_SPEC.md` for the full plan and `docs/verification/neon-spike.md` for how the approach was proven.

## Applying

Run against an **empty** Neon branch that has the Data API enabled (the Data API creates the `authenticated` and `anonymous` roles and the `auth.uid()` function the migrations rely on). Use the direct (non-pooled) connection string. All files apply in order, in one transaction:

```bash
cat neon/migrations/*.sql | psql "$NEON_DATABASE_URL" -1 -v ON_ERROR_STOP=1 -f -
```

If any statement fails, nothing is applied.

## What changed from the Supabase files

Files keep their Supabase names so each can be compared with `git diff --no-index supabase/migrations/<file> neon/migrations/<file>`.

| File   | Change                                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001` | `profiles.id` references `neon_auth."user"(id)`. No `handle_new_user()` or `on_auth_user_created` trigger. `update_updated_at()` is production's hardened version (`SECURITY DEFINER`, `search_path = public`). `$$` quoting. |
| `0002` | `workspaces.user_id` references `neon_auth."user"(id)`.                                                                                                                                                                       |
| `0004` | `recurring_tasks.user_id` references `neon_auth."user"(id)`.                                                                                                                                                                  |
| `0005` | `tasks.user_id` references `neon_auth."user"(id)`.                                                                                                                                                                            |
| `0006` | `$$` quoting (the Supabase file uses a single `$` and does not run).                                                                                                                                                          |
| `0007` | Intentionally empty: it only redefined `handle_new_user()`.                                                                                                                                                                   |
| `0008` | Comment only (`neon_auth."user"` instead of `auth.users`).                                                                                                                                                                    |
| `0011` | `user_onboarding.user_id` references `neon_auth."user"(id)`. The `handle_new_user()` update is dropped.                                                                                                                       |
| `0015` | Neon-only: grants to `authenticated` (nothing to `anonymous`) and `ensure_account()`, which replaces the signup trigger.                                                                                                      |

All foreign keys keep `ON DELETE CASCADE`. `0003`, `0009`, `0010`, `0012`, `0013` and `0014` are unchanged; `0013` keeps `REVOKE EXECUTE ... FROM PUBLIC` on `calculate_next_recurrence`.

`generate_next_recurring_instance` comes from `0014` (with the undo-retraction branch). Production still runs the `0013` version because `0014` was never applied there, so this function intentionally differs from production.

## Checking the schema against production

Run `docs/verification/neon-spike-files/fingerprint.sql` against the Neon branch and compare with the production hashes in that file. Expect:

- `col`, `pol`, `idx`, `chk`, `trg`, `fn:calculate_next_recurrence` and `fn:update_updated_at` equal production.
- `fn:generate_next_recurring_instance` differs (see above).
- `fn:handle_new_user` does not exist.

## Checking the Data API

`scripts/check-neon-data-api.mjs` exercises the branch over HTTP: sign-up, JWT, `ensure_account()`, row isolation, recurring complete/undo and embedded selects. It needs Neon credentials, so run it locally against a disposable branch, never in CI.

```bash
NEON_AUTH_URL=... NEON_DATA_API_URL=... node scripts/check-neon-data-api.mjs
```

`ORIGIN` defaults to `http://localhost:3000` and must be a trusted origin in Neon Auth. The script creates two throwaway users, so delete the branch afterwards. It exits non-zero if any check fails.

## Generating types

```bash
NEON_DATABASE_URL=... npm run db:types
```

This runs `npx @neondatabase/neon-js gen-types` against `$NEON_DATABASE_URL` and writes `src/types/database.ts`.
