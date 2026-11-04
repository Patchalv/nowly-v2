# Verification: Neon migration spike

Run on 2026-11-04 to answer the open questions in `docs/NEON_MIGRATION_SPEC.md` before splitting it into tickets. Everything ran against a throwaway Neon project and a scratchpad Next.js app; nothing in the repo was changed.

## Setup

- **Neon project:** `nowly-spike` (`hidden-credit-21677541`, deleted after the spike), Free plan, `aws-eu-west-2`, Postgres 17. Data API enabled with Managed Better Auth as the JWT provider, and with default grants **off**, so every grant below is explicit.
- **Schema:** the 14 Supabase migrations concatenated, with three edits:
  1. `REFERENCES auth.users(id)` became `REFERENCES neon_auth."user"(id)`.
  2. The `on_auth_user_created` trigger statements were removed.
  3. Broken dollar quoting was fixed (see Findings).

  It was applied in one transaction, followed by a Neon-only file that drops `handle_new_user`, grants table privileges to `authenticated`, and adds `ensure_account()`.

- **Packages:** `@neon/auth` 0.8.2, `@neon/postgrest-js` 0.3.0, `@supabase-cache-helpers/postgrest-react-query` 1.13.9 and `@supabase-cache-helpers/postgrest-core` 0.13.1, with `@supabase/postgrest-js` pinned to 2.79.0. Next.js 16.1.3.

## Production facts (read-only queries on Supabase `xranzhizzedugrakggkf`)

| Fact                            | Value                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Region                          | `eu-north-1` (Stockholm), not `eu-west-1` as the September research said                                                                           |
| Database size                   | 14.9 MB, including system catalogs                                                                                                                 |
| Accounts in `auth.users`        | 6                                                                                                                                                  |
| Rows                            | 6 profiles, 9 workspaces, 26 categories, 19 recurring templates, 764 tasks, 3 onboarding rows                                                      |
| Subtasks (`parent_task_id` set) | 0                                                                                                                                                  |
| Main account (`302dcbe7…`)      | Google sign-in only, no password. 757 tasks (434 recurring instances, 724 completed), 19 recurring templates, 4 workspaces. Last active 2026-11-04 |
| Other 5 accounts                | 0–3 tasks each, no recurring templates, 1 workspace each. Last sign-ins: four in January 2026, one on 2026-09-05                                   |

## Results

| Question                                                         | Result                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does `auth.uid()` exist on Neon and return uuid?                 | Yes. `auth.uid() → uuid` and `auth.user_id() → text` both exist once the Data API is enabled.                                                                                                                                                                                                                                    |
| Do the 9 RLS policies work unchanged?                            | Yes. User B saw only B's tasks; B's update of A's task matched 0 rows; B's insert with A's `user_id` failed with `42501`.                                                                                                                                                                                                        |
| Does the ported schema match production?                         | Columns, policies, indexes, check/unique/primary-key constraints, the trigger list and `calculate_next_recurrence` match production exactly (md5 fingerprints compared). Two functions differ; see Findings.                                                                                                                     |
| Can the public tables reference `neon_auth.user(id)`?            | Yes. The owner role has SELECT and REFERENCES on it, and all five foreign keys were created. Cascade on user deletion was not exercised.                                                                                                                                                                                         |
| Can a SECURITY DEFINER function read `neon_auth.user`?           | Yes. `ensure_account()` read the caller's name and email from it.                                                                                                                                                                                                                                                                |
| Is `ensure_account()` idempotent, including concurrent calls?    | Yes. The first call returned `true`, the second `false`; two simultaneous calls returned exactly one `true`. A new account held 1 profile, 1 workspace, 3 categories, 2 tasks and 1 onboarding row.                                                                                                                              |
| Is `ensure_account()` refused without a token?                   | Yes, HTTP 400 ("missing authentication credentials").                                                                                                                                                                                                                                                                            |
| Is `calculate_next_recurrence` hidden from RPC?                  | Yes, `PGRST202`.                                                                                                                                                                                                                                                                                                                 |
| Does a request with no token return data?                        | No, HTTP 400 before reaching Postgres.                                                                                                                                                                                                                                                                                           |
| Do the recurring triggers work over the Data API?                | Yes. Completing a `fixed_daily` instance generated the next day's; undoing it retracted that instance (migration 0014 behaviour).                                                                                                                                                                                                |
| Does server-side `auth.token()` work at runtime?                 | Yes. In a Next.js route handler, after a sign-up through the `/api/auth` proxy, `auth.token()` returned a JWT. The handler used it to call `ensure_account()` and read workspaces with embedded categories. Without a session it returned 401 `invalid_credentials`. It is a function at runtime, despite being typed `unknown`. |
| Does the managed server enforce an 8-character password minimum? | Yes. A 7-character sign-up returned 400 `PASSWORD_TOO_SHORT`.                                                                                                                                                                                                                                                                    |
| Does cache-helpers parse Neon queries the same way?              | Yes. `PostgrestParser` output for the `useTasks` query was identical whether built from `NeonPostgrestClient` or Supabase's `PostgrestClient`. The same query returned `category` and `subtasks` from the Data API.                                                                                                              |
| Does `next build` pass with `NEON_AUTH_*` unset?                 | Not with `createNeonAuth` at module scope: the build failed with "Missing required config: cookies.secret". It passes when the instance is created lazily on first use, and the lazily created instance then worked at runtime in `next start`.                                                                                  |
| Can the owner role set `session_replication_role`?               | No: "permission denied to set parameter". The data load cannot switch off triggers or foreign-key checks.                                                                                                                                                                                                                        |

## Findings that change the spec

1. **Nowly has six accounts, not one.** Five are dormant, with almost no data. Decided 2026-11-04: only the owner's account is migrated.
2. **The main account signs in with Google only.** Cutover should go through Google sign-in, not an email/password account. A first Google sign-in through the app runs `ensure_account()` before the import. The import therefore has to remove the new account's starter rows first, or the sign-in has to land somewhere that doesn't call it.
3. **Production is behind the repo.** Production's `generate_next_recurring_instance` is the migration-0013 version: it has no undo-retraction branch, so migration 0014 (PR #25) was never applied there. The port carries 0014, so Neon gets that fix.
4. **Production's `update_updated_at` was hardened by hand.** It is `SECURITY DEFINER` with `SET search_path = public`, a change that exists in no migration file. The port should adopt production's definition.
5. **Two repo migrations don't run.** Migrations `0001` and `0006` close their function bodies with `$` instead of `$$`, so the repo can't rebuild the database as committed.
6. **The foreign keys can stay.** They point at `neon_auth."user"(id)`, which keeps `ON DELETE CASCADE`.

## Not verified here

- **Google sign-in on Neon.** Shared development credentials are enabled on the spike project, but the browser flow, and whether it links to an existing email/password user, needs the owner's own Google login.
- **The real dump and load.** It needs Nowly's Supabase database password for `supabase db dump --db-url`.
- **Cache refresh after a mutation in the React UI.** Parsing is identical; the in-browser behaviour is on the manual checklist.

## Reproducing this

The spike's files are in `neon-spike-files/` next to this document; its README lists them. To reproduce:

1. Create a Neon project and enable the Data API with Managed Better Auth as the provider and default grants off.
2. Apply the output of `port-migrations.sh`, then `neon-additions.sql`, in one transaction.
3. Run `fingerprint.sql` and compare with the production values in its header.
4. Run `node check-data-api.mjs` with `NEON_AUTH_URL` and `NEON_DATA_API_URL` set.

One line was corrected after the run. The cache-helpers check compared `path` instead of `alias`, and the original run reported a false failure on it. The direct comparison (`cache-key-compare.mjs`) confirmed the parse is identical.
