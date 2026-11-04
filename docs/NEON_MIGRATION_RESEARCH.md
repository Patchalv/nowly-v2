# Research: Migrating Nowly from Supabase to Neon

Status: research only, nothing implemented. Date: 2026-09-05.

## What we actually depend on

I inventoried every Supabase touchpoint in the repo before looking at Neon.

| Surface                                         | Usage                                                                                                                                    | Migration weight      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| PostgREST data access                           | 53 files import a Supabase client; 22 hooks in `src/hooks/`                                                                              | Low — see below       |
| `@supabase-cache-helpers/postgrest-react-query` | 22 hooks (`useQuery`, `useInsertMutation`, `useUpdateMutation`, `useDeleteMutation`)                                                     | Medium, risk          |
| Supabase Auth                                   | email/password, Google OAuth, PKCE callback, cookie sessions via `@supabase/ssr`                                                         | High                  |
| RLS                                             | 9 policies, all keyed on `(SELECT auth.uid())`                                                                                           | Low-medium            |
| `auth.users` FKs                                | `profiles.id`, `workspaces.user_id`, `categories` (via workspace), `tasks.user_id`, `recurring_tasks.user_id`, `user_onboarding.user_id` | High                  |
| `on_auth_user_created` trigger                  | `handle_new_user()` bootstraps profile + default workspace + 3 categories + onboarding row + sample tasks                                | High                  |
| Other SECURITY DEFINER functions                | `generate_next_recurring_instance()`, `calculate_next_recurrence()`                                                                      | None — plain Postgres |
| Extensions                                      | `uuid-ossp` only                                                                                                                         | None                  |
| Realtime                                        | **not used**                                                                                                                             | None                  |
| Storage                                         | **not used**                                                                                                                             | None                  |
| Edge Functions                                  | **not used**                                                                                                                             | None                  |
| `.rpc()` calls                                  | **none from the client**                                                                                                                 | None                  |
| pg_cron / scheduled jobs                        | none in repo                                                                                                                             | None                  |
| `db:types` script                               | `supabase gen types typescript --project-id …`                                                                                           | Small                 |

The absence of Realtime, Storage, and Edge Functions is the single biggest thing in our favour. The only genuinely Supabase-shaped dependencies are Auth and the PostgREST client.

## The good news: Neon speaks PostgREST

Neon shipped a [Data API](https://neon.com/docs/data-api/overview) — a PostgREST service in front of a Neon branch, secured by JWT plus RLS. Because it is PostgREST, the query builder is the same one we already write:

```ts
// works against Supabase today, works against Neon Data API after the swap
client
  .from('tasks')
  .select(
    '*, category:categories(id, name, color, icon), subtasks:tasks!parent_task_id(id, title, is_completed, position)'
  )
  .eq('scheduled_date', date)
  .is('parent_task_id', null);
```

Embedded resource syntax, `.eq/.is/.gte/.ilike`, and `.order()` are all PostgREST features, not Supabase extensions. Neon ships `@neondatabase/postgrest-js` (use with any JWT provider) and `@neondatabase/neon-js` (Data API + Managed Better Auth in one SDK, with a `SupabaseAuthAdapter` for migration).

Caveats worth knowing up front: the Data API is **Beta**, it is enabled per-branch for one database, and it is incompatible with IP Allow / Private Networking. Issued JWTs are short-lived (~15 min).

## Two viable paths

### Path A — Neon for data, keep Supabase Auth (recommended first move)

Neon's Data API accepts a [custom JWKS URL](https://neon.com/docs/data-api/custom-authentication-providers), not just a fixed provider list. Supabase publishes a JWKS endpoint at `/auth/v1/.well-known/jwks.json` once the project uses asymmetric signing keys. Point Neon at it and Supabase-issued access tokens authorise Neon queries directly.

Why this is attractive:

- **No user migration at all.** Users, password hashes, Google identities, and active sessions stay put.
- **No ID remapping.** The JWT `sub` claim is still the same UUID, so every `user_id` column and every FK value stays valid.
- `auth.uid()` becomes `auth.user_id()` in the 9 policies; that is a sed away.
- All auth code — `src/app/(auth)/actions.ts`, `src/app/auth/callback/route.ts`, `src/proxy.ts`, `src/lib/supabase/*` — stays as it is.

What still has to change:

1. Move the schema and data (`pg_dump --schema=public --no-acl` → `psql` into Neon).
2. Replace `REFERENCES auth.users(id)` on 6 columns. Neon has no `auth.users`, so either drop the FK and rely on app-level integrity, or create a local `users` mirror table synced from Supabase.
3. Rehome `handle_new_user()`. There is no `auth.users` table to hang the trigger on, so the signup bootstrap moves into the signup path in `actions.ts` (and the OAuth callback route) — most simply as a `bootstrap_new_user(uuid, text, text, text)` SQL function on Neon that the app calls once after signup.
4. Rewrite RLS: `auth.uid()` → `auth.user_id()`, `anon` role → `anonymous`, and add explicit `GRANT`s — Supabase grants table privileges to `authenticated`/`anon` by default and Neon does not.
5. Swap the data client to `@neondatabase/postgrest-js`, feeding it the Supabase access token via `getToken`.
6. Replace the `db:types` script — `supabase gen types` will not point at Neon.

The obvious downside is two vendors and a Supabase project kept alive purely for Auth. Given the free tiers, that costs nothing but tidiness.

### Path B — Full migration, Neon Managed Better Auth

Neon's own auth product is now [Managed Better Auth](https://neon.com/docs/auth/overview) (the older Stack Auth integration is legacy and closed to new projects). It stores identity in a `neon_auth` schema in our own database, supports email/password, Google/GitHub/Microsoft OAuth, magic links, and OTP, free up to 60k MAU.

The blocker is user data. Neon's own [migration doc](https://neon.com/docs/auth/migrate/from-supabase) is blunt about it:

> Existing password-based users cannot migrate due to different hashing algorithms. They'll need to create new accounts or re-authenticate via OAuth.

Neon's longer [migration guide](https://neon.com/guides/complete-supabase-migration) describes a bcrypt-preserving import, but that path goes through the legacy Stack Auth API, and the same guide warns that imported users get **new user IDs**, forcing an email-keyed remap of every `user_id` column and a reapply of every FK.

On top of the user problem, Path B also means rewriting:

- `src/app/(auth)/actions.ts` — `signInWithPassword`, `signUp`, `signInWithOAuth`, `signOut`
- `src/app/auth/callback/route.ts` — `exchangeCodeForSession`
- `src/proxy.ts` and `src/app/(protected)/layout.tsx` — 19 `supabase.auth.getUser()` call sites
- `src/lib/supabase/{client,server,middleware}.ts` — all cookie-session plumbing from `@supabase/ssr`
- `src/lib/errors/auth-error-handler.ts` — 239 lines of Supabase error-code mapping

Managed Better Auth's built-in email sender is development-grade, so the "Check your email to confirm your account" flow in `signup()` needs a real provider (Resend, Postmark, SMTP) before production. Managed Better Auth also pins Better Auth 1.4.18 and does not support custom plugins or hooks, and it is AWS-regions only.

## The shared risk: supabase-cache-helpers

22 of our hooks are built on `@supabase-cache-helpers/postgrest-react-query`. It wraps `PostgrestFilterBuilder` from `@supabase/postgrest-js`. `@neondatabase/postgrest-js` is a separate package, so type identity almost certainly breaks even if the runtime shapes match. This is the one item I would spike before committing to either path.

If it does not work, the fallback is to drop cache-helpers and write the hooks against `@tanstack/react-query` directly — already a dependency. That means hand-writing the query keys and invalidation that cache-helpers currently derives automatically: roughly 22 hooks plus an invalidation map. Call it a day or two of mechanical work, and it makes the data layer portable afterwards.

## Free-plan realities

Neon Free gives 0.5 GB storage per project, 100 CU-hours/month, 10 branches, and 5 GB egress. Storage is a non-issue for a task app. The thing to actually think about is **scale-to-zero after 5 minutes of inactivity, which cannot be disabled on Free**. Every first request after an idle period pays a cold start. For a to-do app people open a few times a day, that lands on the user-visible path.

Supabase's free tier pauses projects after a week of inactivity, which is a coarser but less frequently hit penalty. Worth measuring before deciding this is an upgrade.

## Suggested sequence

1. Spike `@neondatabase/postgrest-js` against `@supabase-cache-helpers` with one hook. This decides how big the whole job is.
2. `pg_dump` the public schema into a Neon branch; sed `auth.uid()` → `auth.user_id()`, `anon` → `anonymous`; add the missing `GRANT`s.
3. Resolve the six `auth.users` FKs and port `handle_new_user()` into an app-called bootstrap function.
4. Enable the Data API on the branch and point it at Supabase's JWKS URL (Path A).
5. Swap the data client, keep auth on Supabase, ship, and measure cold starts.
6. Only then decide whether Path B's second migration — new auth, forced password resets — is worth it.

Steps 1–5 are a contained project. Step 6 is a separate product decision, because it costs every existing password user a reset email.

## Resolved: JWT signing keys

Checked 2026-09-05. The project serves a JWKS endpoint with a single ES256 key:

```
$ curl -s https://xranzhizzedugrakggkf.supabase.co/auth/v1/.well-known/jwks.json
{"keys":[{"alg":"ES256","crv":"P-256","kid":"58e55b17-2cae-49b4-9da1-07cd69cdbaf4","kty":"EC","use":"sig",...}]}
```

A decoded live access-token header confirms `alg: ES256`, so asymmetric signing is genuinely in use, not merely staged. Neon's Data API can be pointed at this JWKS URL. **Path A is viable.**

## Single-user reality changes the calculus

Nowly has exactly one real user (the author), opening the app once or twice a day. Two consequences:

- **Path A's main advantage evaporates.** Zero user migration, no ID remapping, no forced password resets — all of that is worth one password reset here. Path B's user-migration blocker stops being a blocker.
- **Path B's code cost does not shrink.** Rewriting `actions.ts`, `callback/route.ts`, `proxy.ts`, 19 `getUser()` call sites, the `@supabase/ssr` cookie plumbing, and 239 lines of `auth-error-handler.ts` costs the same whether there is 1 user or 10,000. Path A still skips all of it.

So Path A remains the cheaper build; it just no longer wins on data-safety grounds. Path B buys a single vendor and a cleaner story, for maybe a week of auth rewrite.

## Measured: cold start on the free plan

Measured 2026-09-05 against a throwaway Neon project (`nowly` / `damp-silence-23792569`, PG18, 0.25-2 CU, `aws-eu-west-2`), driven from a laptop in the UK. Supabase runs in `eu-west-1`, close enough that region is not a confounder. The compute was forced to `idle` via the API rather than waiting out the 5-minute timer, which is the same suspended state.

| Measurement                               | Cold    | Warm       |
| ----------------------------------------- | ------- | ---------- |
| `psql` connect + query, direct host       | 1454 ms | ~370 ms    |
| `psql` connect + query, pooled host       | 1000 ms | ~370 ms    |
| Neon Auth JWKS fetch (HTTP)               | 1043 ms | 125-204 ms |
| Query round trip, connection already open | —       | ~35 ms     |

So the **cold-start penalty is roughly 0.6-1.1 s**, on top of a ~370 ms connect. The ~35 ms figure is the honest network round trip once a connection exists; most of the warm 370 ms is TLS and auth handshake, which a pooled app pays once rather than per request.

One useful detail: Neon Auth is served from the same compute (`ep-….neonauth.…`), and hitting its JWKS endpoint while suspended **woke the compute** — confirmed by the endpoint's `started_at` jumping to match the request. Auth and data therefore share a single wake-up rather than paying the penalty twice. Since `src/proxy.ts` calls `getUser()` on every request, the wake lands on the auth check and the data query is warm by the time it runs.

### Data API, measured end to end

The Data API was enabled on the test project and the whole Path B stack verified: signed up a user against Neon Auth, minted a JWT from the session, created an RLS-protected table, and queried it over HTTP. RLS behaved correctly — the request returned only the calling user's row out of two.

| Data API request (authenticated, RLS active) | Time    |
| -------------------------------------------- | ------- |
| Cold (compute idle)                          | 996 ms  |
| Warm                                         | ~120 ms |

Same ~0.9 s penalty as the Postgres path, which is expected: PostgREST connects to the same compute.

Unauthenticated requests are rejected by PostgREST with HTTP 400 before touching Postgres, so they neither leak data nor wake the compute.

### Gotcha: `auth.user_id()` returns text

Supabase's `auth.uid()` returns `uuid`. Neon's `auth.user_id()` returns `text`, so a plain find-replace produces:

```
ERROR:  operator does not exist: text = uuid
```

Every policy needs an explicit cast:

```sql
create policy own_rows on tasks for all to authenticated
  using (auth.user_id()::uuid = user_id)
  with check (auth.user_id()::uuid = user_id);
```

That applies to all 9 policies. Neon Auth user ids are UUID-shaped, so the cast is safe.

Grants also have to be spelled out — `authenticated` gets nothing by default, including sequence usage, which inserts need:

```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on <table> to authenticated;
grant usage, select on sequence <table>_id_seq to authenticated;
```

## What that means here

At once or twice a day, every session starts cold. There is no realistic usage pattern at this volume that keeps the compute warm.

A one-second delay on app open is noticeable but not fatal for a to-do app — and it is a genuine regression against today, because Supabase's free tier does not autosuspend on a five-minute timer (it pauses only after about a week of inactivity, which daily use never triggers).

Options if that second is unacceptable:

- **Pay for Neon.** Paid plans allow raising or disabling the scale-to-zero timeout. This is the only clean fix.
- **Keep-warm ping.** Does not fit in the free budget: 0.25 CU held open costs ~180 CU-hours/month against a 100 CU-hour cap. Even pinging only during waking hours (~12h/day) lands at ~90 CU-hours, leaving almost nothing for actual queries.
- **Accept it.** Defensible, but it should be a decision rather than a surprise.

## Recommendation: don't move

Every piece was verified to work. That was never the question — the question is what the move buys, and at this usage the answer is nothing that isn't already in hand.

Against moving:

- It makes the app measurably worse: ~1 s on open, every session, permanently. Supabase's free tier has no equivalent penalty at daily usage.
- It is real work for zero user-facing features. Path A is contained; Path B is roughly a week of auth rewrite.
- 22 hooks currently get cache invalidation for free from `supabase-cache-helpers`. That goes away and has to be hand-written.
- The Data API is Beta. Fine for a toy, thin ice for a daily driver whose incumbent is GA.
- Nothing is broken today.

What would justify revisiting:

- Supabase actually causing pain — pricing, a limit, an outage that was felt.
- Wanting Neon branching for schema work. Given how often the recurring-task schema gets touched, branch-per-migration is a genuinely nice workflow and the one argument here with real substance.

Neither of those is "the database is on the wrong vendor."

If the move happens anyway for preference reasons, take Path A: Neon for data, Supabase for auth. Cheapest build, skips the auth rewrite entirely, and the ~1 s app-open cost is the price paid for tidiness.

## Open questions

- How many rows are in production? The project (`xranzhizzedugrakggkf`) is not in the org reachable from my Supabase tooling, so I could not check volumes. Almost certainly trivial for one user, but the dump size matters for the 0.5 GB Free cap.
- Is the Data API's Beta status acceptable here?
- What is the actual motivation for moving? That determines whether Path A (cheap, two vendors) or Path B (expensive, one vendor) is the right target.
