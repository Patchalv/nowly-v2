# Spec: Move Nowly from Supabase to Neon

Status: verified by spike; ready for tickets. Written 2026-11-04; updated the same day after the spike in `docs/verification/neon-spike.md`. Builds on `docs/NEON_MIGRATION_RESEARCH.md` (2026-09-05). Where they disagree, this document was checked more recently; see the evidence table at the end.

## Problem Statement

I run three apps on Supabase: Nowly on a free organization, and MapVault and eat-thirty-plants on a paid one. I want to stop paying for the paid organization. Supabase allows two active free projects across every organization where I am an Owner or Admin, and paused projects do not count. Downgrading the paid organization would put three active free projects against that limit, so one app has to leave Supabase.

Nowly is the cheapest one to move, because I am its only real user. Production has six accounts, but the other five hold 0–3 tasks each and last signed in months ago. I open Nowly every day, so pausing its Supabase project is not an option. It needs a new home that costs nothing, keeps my tasks, recurring templates, workspaces and categories intact, and still lets me sign in with Google, as I do today, or with email and password.

## Solution

Nowly moves to a single Neon project on the Free plan:

- **Postgres:** Neon Lakebase Postgres holds the same `public` schema as production.
- **Logins:** Neon Managed Better Auth replaces Supabase Auth.
- **Data access:** Neon's Data API, which is PostgREST-compatible, replaces Supabase's REST endpoint, so the existing query-builder code and the cache helpers keep working.

From my point of view, nothing about using the app changes except the following:

- I sign in with Google once on the new backend, which creates a new user ID. All my existing data is then re-keyed to that ID.
- The first request after five idle minutes takes about a second longer, because the Free plan suspends the database.
- The Google consent screen points at Neon's auth host rather than Supabase's.
- Undoing a recurring completion now retracts the instance it generated. The repo has had this fix (migration 0014, PR #25) since September, but production never got it.

Once Nowly runs on Neon and I have used it for a while, I pause Nowly's Supabase project (pause, never delete, which keeps a 90-day restore window), then downgrade the paid organization to Free.

## User Stories

### Signing in and out

1. As the Nowly user, I want to sign in with Google, as I do today, so that I don't need a password.
2. As a new Nowly user, I want to sign up with my name, email and password, so that I can use the app without Google.
3. As a Nowly user with a password, I want to sign in with my email and password, so that I can reach my tasks.
4. As the Nowly user, I want a wrong password to show an "invalid credentials" style message, not a generic failure, so that I know what went wrong.
5. As the Nowly user, I want sign-up validation errors (missing name, bad email, mismatched passwords, short password) to appear next to the right field, as they do today, so that the forms behave the same.
6. As the Nowly user, I want the password rule shown on the form to match what the auth server enforces (8 characters), so that a password the form accepts is never rejected by the server.
7. As the Nowly user, I want to sign out from the account page and land on the login page, so that I can leave a shared device safely.
8. As the Nowly user, I want my session to survive a page reload and a browser restart, so that I'm not asked to sign in every time I open the app.
9. As the Nowly user, I want visiting `/login` or `/signup` while signed in to send me to `/today`, as it does now, so that I don't see an auth form I don't need.
10. As the Nowly user, I want visiting any protected page (today, daily, weekly, all tasks, backlog, recurring, account) while signed out to send me to the login page, so that my data is never shown to a visitor.
11. As the Nowly user, I want the landing, privacy and terms pages to stay reachable while signed out, so that the public pages still work.
12. As the Nowly user, I want a failed Google sign-in to bring me back to the login page with a readable error, as the current callback does, so that I can try again.

### Account setup

13. As a new Nowly user, I want my first visit to a protected page to create my profile, a "Default" workspace, the Personal, Work and Home categories, my onboarding record and the two sample tasks, so that a fresh account looks exactly as it does today.
14. As a new Nowly user, I want that setup to happen the same way whether I signed up with email or with Google, so that neither path leaves me with a half-built account.
15. As the Nowly user, I want the setup never to run twice for the same account, even if two pages load at once, so that I never get duplicate workspaces or sample tasks.
16. As the Nowly user, I want my profile's full name to come from the name I gave at sign-up, or from Google, so that the account page shows my name.
17. As the Nowly user, I want the account page to show my email address, as it does now, so that I can see which account I'm in.

### Using my data

18. As the Nowly user, I want every task I had on Supabase (757 today) to appear on Neon with the same title, dates, priority, completion state, position, workspace, category and recurring link, so that the move loses nothing.
19. As the Nowly user, I want all 19 recurring templates to come across with their rule, next due date, pause state and occurrence count intact, so that recurring tasks keep generating correctly.
20. As the Nowly user, I want my workspaces, categories, profile and onboarding progress (tour completed, tooltips dismissed) to come across, so that I'm not shown the onboarding tour again.
21. As the Nowly user, I want the today, daily, weekly, backlog and all-tasks views to load my tasks with their categories and subtasks, as they do now, so that the views look the same.
22. As the Nowly user, I want to create, edit, complete, uncomplete and delete tasks, with the UI updating straight away, so that daily use feels unchanged.
23. As the Nowly user, I want completing a recurring instance to generate the next one, and undoing that completion to retract it, so that recurrence behaves as the fixes for issues #9, #10 and #11 intended.
24. As the Nowly user, I want creating a recurring task to create its first instance in the same action, as it does today, so that a new recurring task shows up immediately.
25. As the Nowly user, I want editing a recurring task to update its future instances without rewinding its next due date, so that the issue #11 fix still holds.
26. As the Nowly user, I want to create, rename and delete workspaces and categories, so that I can still organize my tasks.
27. As the Nowly user, I want task search on the all-tasks page to treat `%` and `_` as literal characters, as it does now, so that search results stay predictable.
28. As the Nowly user, I want edits to show up in other views without a manual refresh, as the cache helpers do now, so that I never see stale lists.

### Privacy and security

29. As the Nowly user, I want nobody else who signs up to be able to read or change my rows, so that my tasks stay private even though the Data API is a public HTTP endpoint.
30. As the Nowly user, I want a request to the Data API with no token, or an expired one, to be refused without returning data, so that the endpoint leaks nothing.
31. As the Nowly user, I want the account-setup function to work only on my own account, never on an account ID someone passes in, so that one user cannot set up or tamper with another user's data.
32. As the Nowly user, I want Sentry to receive only my user ID, never my email, so that the app follows its own GDPR rule.
33. As the Nowly user, I want deleting a user in Neon Auth to remove that user's app data, as deleting from `auth.users` does today, so that no orphaned rows are left behind.

### Operating the app

34. As the maintainer, I want CI's lint, typecheck and build jobs to pass with no secrets set, as they do today, so that the factory and pull requests keep working.
35. As the maintainer, I want one command that regenerates the database types from Neon, so that I can keep types in sync after a schema change as I can today.
36. As the maintainer, I want the schema to live in migration files in the repo that actually run, in order, on a fresh Neon branch, so that I can rebuild the database from git (today's files can't).
37. As the maintainer, I want an automated check that signs up throwaway users on a disposable Neon branch and exercises RLS, grants, account setup and the recurring triggers over the Data API, so that I can verify the backend without a browser.
38. As the maintainer, I want a written browser checklist for the login screens and the Google flow, so that the parts the automated check can't reach are still verified once.
39. As the maintainer, I want an import script that re-keys my data to my new user ID and replaces the starter rows my first sign-in created, so that I end up with exactly my old data and nothing extra.
40. As the maintainer, I want the import rehearsed on a throwaway branch with row counts checked against Supabase, so that the real import holds no surprises.
41. As the maintainer, I want the Supabase project paused, never deleted, after the move, so that I have 90 days to restore it if something turns out to be missing.
42. As the maintainer, I want the project instructions (AGENTS.md and the docs it points to) updated to describe the Neon auth and data rules, so that the factory and other agents stop following Supabase rules that no longer apply.
43. As the maintainer, I want the onboarding tour's element IDs and sidebar links left untouched, so that the tour keeps working after the move. Quick Add is on the AGENTS.md ask-first list: only its user-ID lookup changes, never its `#quick-add-task` ID.

## Implementation Decisions

### Neon project and services

- **One project.** Create one Neon project on the Free plan in `aws-eu-west-2` (London). Managed Better Auth is AWS-only, and the spike ran in this region. Nowly's Supabase project is in `eu-north-1`.
- **Services on the default branch:** Postgres, Managed Better Auth, and the Data API configured to use Managed Better Auth as its JWT provider, with the console's "default grants" option **off** so every grant lives in a migration. Declare them in the repo's existing Neon config file, which already declares `auth: true`. The `preview` block in that file (a hello-world function and an `assets` bucket) is unused scaffolding and is deprecated in favour of top-level keys. Remove it.
- **No access protections that block the services.** Do not enable IP Allow or Private Networking: the Data API and Managed Better Auth don't support them.
- **Auth settings:**
  - Leave email verification off (the default).
  - Leave the shared SMTP sender in place, since it supports password-reset emails.
  - Set the application name to "Nowly".
  - Add the production origin as a trusted domain.
- **Google OAuth.** Use my own Google OAuth client, not Neon's shared development credentials. Register `{NEON_AUTH_BASE_URL}/callback/google` as an authorized redirect URI in Google Cloud Console. The Supabase callback URI is no longer used.

### Schema port

- **Migrations.** Add a new Neon migration set that recreates production's `public` schema. The spike built it by concatenating the fourteen Supabase migrations and applying three edits, then fingerprinted the result against production. Columns, policies, indexes, constraints, the trigger list and `calculate_next_recurrence` matched exactly. Keep the existing Supabase migration files in git, marked as historical.
- **Fix the broken files.** Migrations `0001` and `0006` close their function bodies with `$` instead of `$$` and don't run. The Neon set uses correct quoting.
- **Resolve production drift.** The port follows the repo with one exception:
  - **Recurring trigger:** `generate_next_recurring_instance` takes the repo's migration-0014 version. Production still runs the 0013 version, without the undo-retraction branch, so moving to Neon ships that fix.
  - **`update_updated_at`:** takes production's version (`SECURITY DEFINER`, `SET search_path = public`). That was a hand edit that exists in no migration file.
- **`uuid-ossp`.** It is supported on Neon and stays.
- **Foreign keys.** The five columns that referenced `auth.users` now reference `neon_auth."user"(id)` with `ON DELETE CASCADE`: `profiles.id`, `workspaces.user_id`, `recurring_tasks.user_id`, `tasks.user_id` and `user_onboarding.user_id`. The owner role holds REFERENCES on that table, and the spike created all five keys. Categories reach the user through `workspace_id`.
- **RLS policies.** The nine policies carry over unchanged: all `TO authenticated`, all keyed on `(SELECT auth.uid())`. On Neon, `auth.uid()` returns uuid. The spike confirmed isolation over the Data API with real JWTs.
- **Grants.** Add grants explicitly, because the Data API was enabled without default grants:
  - schema usage on `public` to `authenticated`;
  - select, insert, update and delete on the six tables to `authenticated`;
  - nothing to `anonymous`, since no page reads data while signed out.
- **`calculate_next_recurrence`.** Its `REVOKE EXECUTE ... FROM PUBLIC` stays. The spike confirmed it isn't callable over RPC.
- **Drop the old signup function.** `handle_new_user` and its `on_auth_user_created` trigger are not carried over.

### Account setup (replaces the signup trigger)

- **One function, `ensure_account()`.** It is SECURITY DEFINER with `search_path` set to `public`, and takes no arguments. The caller is `auth.uid()`, and the function raises an error if that is null. It reads the caller's `name`, `email` and `image` from `neon_auth."user"`, which the spike confirmed it can read.
- **What it creates:** exactly the rows `handle_new_user` creates today, all in one transaction:
  - a profile (full name from `name`, avatar from `image`);
  - a "Default" workspace (colour `#6366f1`, icon 📋, position 0);
  - the Personal, Work and Home categories with their current colours, icons and positions;
  - an onboarding row;
  - the two sample tasks scheduled for the current date.
- **Idempotency.** The profile insert uses `ON CONFLICT DO NOTHING`. Only when that insert actually creates a row does the function go on to create the rest. It returns `true` when it set up the account and `false` when there was nothing to do. In the spike, two simultaneous calls produced exactly one `true`.
- **Permissions.** EXECUTE is revoked from PUBLIC and `anonymous` and granted to `authenticated`. A call without a token is refused.
- **When it runs.** The protected layout calls it once per request, after confirming the session and before rendering, through the server-side data client. Email and Google signups both pass through the protected layout.
- **The today page's workspace fallback.** Today's page creates a "Default" workspace on the client if it finds none. It overlaps with `ensure_account()` and can race with it, so remove it.

### Auth integration

- **SDK.** Use Neon's documented Next.js path: `@neon/auth` with `createNeonAuth` for the server instance and `createAuthClient` (from `@neon/auth/next`) for the browser. Do not use the `SupabaseAuthAdapter` from `@neon/neon-js/supabase`. Its compatibility is documented for browser clients, and this app's auth runs in server actions with cookie sessions.
- **Lazy server instance.** Create the server auth instance on first use, not at module scope. A module-level `createNeonAuth` fails `next build` with "Missing required config: cookies.secret" when the secret is unset, and CI builds with no secrets by design. The spike confirmed a memoized getter builds cleanly with every `NEON_AUTH_*` variable unset and works at runtime. The `/api/auth` catch-all route delegates to the lazily created instance's handler.
- **Environment.** Add these variables:
  - `NEON_AUTH_BASE_URL` (server).
  - `NEON_AUTH_COOKIE_SECRET` (server, 32+ characters).
  - A public Data API URL for the browser client, for example `NEXT_PUBLIC_NEON_DATA_API_URL`.
  - A direct connection string for type generation and the import script, kept local only.

  Remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the Supabase cookie handling. The Google client ID and secret move into Neon's auth configuration, so they leave the app's environment. `.env.local.example` is updated to match.

- **Localhost access.** Neon's production checklist says to disable "Allow Localhost" on the production branch. Local development runs against a separate Neon development branch with localhost allowed. The default branch has it disabled once cutover is done.
- **Route protection.** It keeps the current behaviour and the two-layer design:
  - **Proxy:** the proxy uses `auth.middleware()` with `loginUrl` set to `/login`. Its `publicRoutes` list is the current public pages (`/`, `/login`, `/signup`, `/privacy`, `/terms`) plus Sentry's tunnel route `/monitoring`, which would otherwise be treated as protected. `/api/auth` is public by default.
  - **Signed-in users on `/login` or `/signup`:** these pages do their own server-side session check and redirect to `/today`. Neon's agent-skill guidance advises against wrapping `auth.middleware()` in a custom proxy.
  - **Protected layout:** it stays the primary check, with `auth.getSession()` and a redirect to `/login` when there is no user.
- **Login, signup and sign-out server actions.** They keep their names, zod schemas, return shapes and redirects:
  - **Login and signup:** they call `auth.signIn.email` and `auth.signUp.email`, passing the full name as `name`.
  - **After signup:** the action redirects to `/today` instead of returning "Check your email to confirm your account", because verification is off.
  - **Password minimum:** raise it from 6 to 8 characters on both forms. The managed server rejected a 7-character password with `PASSWORD_TOO_SHORT`.
- **Google sign-in.** It moves to the browser client's `signIn.social`, the documented path, with `callbackURL` set to `/today` and `errorCallbackURL` set to `/login`.
- **The OAuth callback route goes away.** `/auth/callback` is deleted, along with its entry in the public-route list. Google now redirects to Neon's callback, and Neon then redirects to `callbackURL`.
- **Pages that need the user ID.** They read it from the session instead of from `supabase.auth.getUser()`. There are 17 live call sites. The dead `updateSession` helper is deleted.
- **Sentry user context.** It is set from the session with the user ID only. Today's component also sends the email, which breaks the project's GDPR rule.
- **The unused auth error handler is deleted.** `auth-error-handler.ts` and its README section are deleted, not rewritten: nothing imports them. The database error handler keeps its interface; its `PostgrestError` type import moves to the pinned `@supabase/postgrest-js`.

### Data access

- **Browser client.** The browser data client becomes a `NeonPostgrestClient` pointed at the branch's Data API URL. Its `fetch` is wrapped with `fetchWithToken`, which gets a JWT from the browser auth client's `token()`. Every hook keeps its query-builder code and its cache-helpers calls. The shape below comes from the spike:

  ```ts
  // spike: @neon/postgrest-js 0.3.0, @neon/auth 0.8.2,
  // @supabase-cache-helpers/postgrest-react-query 1.13.9,
  // with @supabase/postgrest-js pinned to 2.79.0
  const db = new NeonPostgrestClient({
    dataApiUrl,
    options: {
      global: {
        fetch: fetchWithToken(
          async () => (await authClient.token()).data?.token ?? null
        ),
      },
    },
  });
  useQuery(
    db
      .from('tasks')
      .select('*')
      .eq('scheduled_date', d)
      .order('position', { ascending: true })
  );
  useUpdateMutation(db.from('tasks'), ['id'], null);
  ```

- **Pin `@supabase/postgrest-js` to 2.79.0.** `@neon/postgrest-js` 0.3.0 pins it to exactly that version. With a second copy installed for cache-helpers' peer range, the hooks no longer typecheck: they failed with 2.119.0 and passed with 2.79.0. With the pin, cache-helpers' `PostgrestParser` produced an identical parse for the `useTasks` query from Neon's client and from Supabase's. The pin stays until `@neon/postgrest-js` moves; whoever upgrades either package re-checks it.
- **Server-side client.** The three recurring-task server actions and the `ensure_account()` call in the protected layout use a server-side client built the same way. It gets its JWT from the server auth instance's `token()`.
  - **The type gap:** in `@neon/auth` 0.8.2 that method is a working function at runtime, but its TypeScript type resolves to `unknown`. Wrap it in one narrowly typed helper; nothing else casts.
  - **Runtime:** the spike confirmed that a server session yields a JWT, and that the JWT authorizes Data API calls.
- **Unchanged queries.** The search hook's escaping of `%`, `_` and `\` is unchanged.

### Types

- **Type generation.** `db:types` changes to Neon's generator, `npx @neondatabase/neon-js gen-types --db-url <direct connection string> --output` pointed at the existing types file. The generator ships in the package's old name. The script must read the connection string from the environment, not from `package.json`.
- **Type helpers.** The generated file exports the same `Database`, `Tables`, `TablesInsert` and `TablesUpdate` helpers. The repo's own `Profile`, `Task` and similar aliases keep working, provided the generated `Database` shape matches. Confirm this by typecheck after the first generation.
- **Database generic.** Today's clients aren't typed with the `Database` generic. This spec doesn't add it; that's a separate change.

### Data move and cutover

My account signs in with Google only (no password), so cutover goes through Google. The first protected page load after that sign-in runs `ensure_account()` and creates starter rows. The import replaces them.

1. Apply the Neon migrations to the default branch and configure my Google OAuth client on it.
2. Deploy the Neon-backed app (a preview deployment is enough) and sign in with Google once. This creates my new user and its starter rows.
3. Read my new user ID from `neon_auth."user"`.
4. Export my rows from Supabase. Only account `302dcbe7…` comes across; the five dormant accounts stay behind. Two ways to export:
   - `supabase db dump --data-only --db-url <direct connection string>` with Nowly's database password, limited to the six Nowly tables, then filtered to my account. The command excludes Supabase-managed schemas such as `auth`.
   - Equivalent `COPY ... TO STDOUT` queries filtered by my user ID. Categories are filtered through my workspaces, since they have no `user_id`.

   On 2026-11-04 my account held 1 profile, 4 workspaces, 12 categories, 19 recurring templates, 757 tasks and 1 onboarding row. None of my tasks or templates referenced another account's workspace, category or template, so the filtered set is self-contained.

5. Run the import script. In one transaction, it:
   - deletes every row owned by the new user ID (profile, workspaces with their categories, tasks, recurring templates, onboarding row);
   - loads my exported rows with my old user ID rewritten to the new one;
   - compares per-table row counts with the export, and aborts on any mismatch.
6. Rehearse step 5 first on a throwaway branch of the default branch, then delete that branch. Things the rehearsal must respect:
   - Neon refuses to let the owner role set `session_replication_role`, so the load can't switch off triggers or foreign-key checks.
   - Every trigger fires on UPDATE only, so inserting rows doesn't start recurring generation.
   - Production has no subtasks (`parent_task_id` is null on all 764 tasks), so the self-referencing key needs no special load order. The script still loads rows without a parent first.
7. Run step 5 on the default branch.
8. Open the app and walk the browser checklist against my real data.
9. Point the production deployment at Neon.
10. Use the app for a while. Then pause the Nowly Supabase project; do not delete it.
11. Downgrade the paid Supabase organization.

### Project instructions

Update AGENTS.md and the docs it links to:

- **Rule 3** ("always getUser, never getSession") becomes "always check `auth.getSession()` on the server". The session is served from a signed HTTP-only cookie cached for `sessionDataTtl` seconds (default 300), so a revoked session can stay usable for up to that long. Set `sessionDataTtl` explicitly in config so the window is a visible choice.
- **Rule 7** describes the `auth.middleware()` public-route list instead of the hand-written prefix arrays.
- **The error-handling section** drops `handleAuthError` and `getAuthErrorMessage`.
- **The database docs** point at the Neon migration set, and record that production must be migrated from the repo, never edited by hand. The hand-edited `update_updated_at` and the missing 0014 are how production drifted.
- **The search-escaping guidance and the onboarding rules are unchanged.** The onboarding element IDs and sidebar links are not touched. One onboarding-listed file does change: the Quick Add component is one of the 17 `getUser()` call sites, so its user-ID lookup moves to the session while its `#quick-add-task` ID stays. AGENTS.md Rule 6 asks for the owner's approval before that edit.

## Testing Decisions

- **What a good test is here.** It checks behaviour I can observe from outside the code: which rows a signed-in user can read and write, what a new account contains, what a recurring completion generates. It doesn't check how the code is wired. The repo has no test runner, and CI runs only lint, typecheck and build. This spec adds one automated check, an import rehearsal and one manual checklist; it doesn't add a unit-test framework.
- **The automated seam is the Data API over HTTP**, run against a disposable Neon branch with the real migrations applied. The spike's `test.mjs` is the prototype, and its 20 checks are the starting list. A script committed to the repo:
  - signs up two throwaway users through the auth endpoints;
  - gets each user's JWT from the `set-auth-jwt` header on `get-session`;
  - calls `ensure_account()` over RPC and asserts the starting rows, then asserts a repeat call and two simultaneous calls create nothing extra;
  - asserts each user sees and changes only their own rows;
  - completes and undoes a recurring instance and checks generation and retraction;
  - asserts a request with no token returns no data, and that `calculate_next_recurrence` is not callable over RPC;
  - asserts a 7-character password is rejected.

  The branch is deleted afterwards. It needs Neon credentials, so it runs locally, not in CI or the factory sandbox.

- **Prior art.** `docs/verification/issue-11-recurring-next-due-date.md` ran the repo's real migrations against a real Postgres and recorded a reproducible transcript. `docs/verification/neon-spike.md` did the same over the Data API.
- **The import rehearsal is its own seam** (cutover step 6). Per-table row counts match the dump; my user owns exactly the dumped rows; no starter rows remain.
- **The manual seam is a browser checklist**, run once against the Neon branch before production cutover:
  - Google sign-in succeeds, and a Google failure lands on `/login` with an error;
  - email sign-up, sign-out and sign-in;
  - the session survives a reload;
  - a protected route redirects while signed out;
  - `/login` redirects to `/today` while signed in;
  - a wrong password shows the right message;
  - optimistic task updates and cross-view cache refresh work;
  - Sentry events still arrive through `/monitoring`;
  - after the import, my real tasks, recurring templates and workspaces are all there and the onboarding tour doesn't reappear.
- **Gates that stay.** Lint, typecheck and build, with build specifically run with every `NEON_AUTH_*` variable unset.

## Out of Scope

- Moving MapVault or eat-thirty-plants anywhere.
- The five dormant Nowly accounts. Only the owner's account is migrated.
- Migrating password hashes or sessions. Per Neon's migration guide, password hashes cannot transfer.
- Email verification, custom SMTP and custom email templates.
- Neon Functions, Object Storage, Realtime and the AI Gateway. The hello-world function and `assets` bucket in the Neon config are removed, not used.
- Typing the data clients with the `Database` generic.
- Replacing `supabase-cache-helpers` with hand-written TanStack Query hooks.
- Paying for Neon to remove the scale-to-zero cold start.
- A unit or end-to-end test framework.

## Further Notes

### Accepted cost: cold starts

On the Free plan the database suspends after 5 idle minutes, and that can't be disabled. In September, a throwaway Neon project in `aws-eu-west-2` measured about 0.6–1.1 s extra on the first request after idle. At one or two sessions a day, almost every session starts cold. That project no longer exists, so the measurement can't be re-run there.

### Free plan limits and data volume

The Free plan gives each project 100 CU-hours a month, 1 GB of Postgres storage (20 GB across all projects), 5 GB of egress and 10 branches. Running out of CU-hours or egress suspends compute until the next billing period. Going over storage blocks writes. Production's whole database, system catalogs included, is 14.9 MB, so storage is not a concern.

### Open questions

- **Decided 2026-11-04: keep only my account.** Production has six accounts. Mine (`302dcbe7…`, Google) holds 757 tasks and 19 recurring templates. The other five hold 0–3 tasks each and no recurring templates, and last signed in in January 2026 (four) or on 2026-09-05 (one). They stay on Supabase, and their data goes when the paused project's 90-day window ends.
- **Google account linking.** If someone with a Google-created account later tries email and password with the same address (or the reverse), do they get linked or a second user? It's undocumented, and it no longer affects cutover, since mine is Google-only. It can be checked once in the browser if it matters.
- **Cascade from `neon_auth`.** The foreign keys were created, but deleting a user in Neon Auth and watching the cascade was not exercised.

### Evidence

Tags:

- **verified:** checked directly in this repo, in installed packages, or against a live service.
- **documented:** stated in vendor docs, not executed here.
- **unverified:** inferred, or not yet run.

| Claim                                                                                                             | Source                                                   | Status     |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| Two active free Supabase projects across orgs where I'm Owner/Admin; paused projects don't count                  | Supabase docs: Billing FAQ, About billing                | documented |
| Paused free projects restorable for 90 days                                                                       | Supabase docs: Project Pausing                           | documented |
| `supabase db dump` excludes `auth`/`storage`; `--data-only` for data; `--db-url` for an unlinked project          | Supabase CLI reference: `supabase db dump`               | documented |
| Production: `eu-north-1`, 14.9 MB, 6 accounts, 764 tasks, 0 subtasks; main account Google-only                    | read-only SQL on `xranzhizzedugrakggkf`, 2026-11-04      | verified   |
| Production `generate_next_recurring_instance` lacks the 0014 undo branch                                          | `pg_get_functiondef` on production                       | verified   |
| Production `update_updated_at` is SECURITY DEFINER with `search_path`, unlike the repo                            | `pg_get_functiondef` on production vs. migration 0001    | verified   |
| Migrations 0001 and 0006 use `$` instead of `$$` and fail to apply                                                | applying them with `psql`                                | verified   |
| Ported schema matches production (columns, policies, indexes, constraints, triggers, `calculate_next_recurrence`) | md5 fingerprints, Supabase vs. Neon spike                | verified   |
| 5 columns referenced `auth.users`; categories don't                                                               | `grep "REFERENCES auth.users" supabase/migrations`       | verified   |
| Foreign keys to `neon_auth."user"(id)` can be created; owner holds SELECT and REFERENCES                          | spike `psql`; `has_table_privilege`                      | verified   |
| `auth.uid()` returns uuid, `auth.user_id()` returns text                                                          | `pg_proc` on the spike project                           | verified   |
| The 9 RLS policies isolate users over the Data API                                                                | spike `test.mjs`                                         | verified   |
| `ensure_account()` reads `neon_auth."user"`, is idempotent (also concurrently), and is refused without a token    | spike `test.mjs`                                         | verified   |
| Recurring complete/undo works over the Data API                                                                   | spike `test.mjs`                                         | verified   |
| `calculate_next_recurrence` not callable over RPC                                                                 | spike `test.mjs` (`PGRST202`)                            | verified   |
| Owner role can't set `session_replication_role`                                                                   | spike `psql`                                             | verified   |
| Recurring and `updated_at` triggers fire on UPDATE only                                                           | `CREATE TRIGGER` statements in the migrations            | verified   |
| Managed server enforces an 8-character minimum password                                                           | spike: 7 characters → `PASSWORD_TOO_SHORT`               | verified   |
| Server `auth.token()` returns a usable JWT at runtime (typed `unknown`)                                           | spike Next.js probe route                                | verified   |
| Module-level `createNeonAuth` breaks `next build` without secrets; lazy creation builds and works                 | spike `next build` and `next start`                      | verified   |
| Cache-helpers hooks typecheck against `NeonPostgrestClient` only with a single `@supabase/postgrest-js` 2.79.0    | spike `tsc`                                              | verified   |
| Cache-helpers parses Neon and Supabase queries identically; embedded selects return over the Data API             | spike `keycmp.mjs`, `test.mjs`                           | verified   |
| 17 live `auth.getUser()` call sites; `updateSession` is unused                                                    | `grep -rn auth.getUser src`                              | verified   |
| 19 hooks import cache-helpers                                                                                     | `grep -rl supabase-cache-helpers src/hooks`              | verified   |
| `auth-error-handler.ts` is never imported                                                                         | grep for its exports                                     | verified   |
| `sentry-user-context.tsx` sends email to Sentry                                                                   | file contents                                            | verified   |
| No `.rpc()`, Realtime, Storage or Edge Functions in use                                                           | grep of `src`                                            | verified   |
| Sentry tunnel route is `/monitoring`                                                                              | `next.config.ts`                                         | verified   |
| CI build runs with no secrets, by design                                                                          | `.github/workflows/ci.yml`                               | verified   |
| Data API is GA                                                                                                    | Neon changelog 2026-09-18                                | documented |
| Data API and Managed Auth unsupported with IP Allow / Private Networking; Auth AWS-only                           | Neon docs: data-api/get-started; neon-auth skill         | documented |
| Password hashes can't migrate from Supabase                                                                       | Neon docs: auth/migrate/from-supabase                    | documented |
| Email verification off by default                                                                                 | spike auth config (`verify_email_on_sign_up: false`)     | verified   |
| Shared SMTP supports verification codes and password reset, not verification links                                | Neon docs: auth/production-checklist                     | documented |
| Google redirect URI is `{NEON_AUTH_BASE_URL}/callback/google`; shared credentials are dev-only                    | Neon docs: auth/guides/setup-oauth                       | documented |
| `auth.middleware()` takes `loginUrl` and `publicRoutes`; custom wrappers discouraged                              | Neon docs: auth/reference/nextjs-server; neon-auth skill | documented |
| `auth.getSession()` is cached in a signed cookie, `sessionDataTtl` default 300 s                                  | Neon docs: auth/reference/nextjs-server                  | documented |
| Type generator is `npx @neondatabase/neon-js gen-types`                                                           | Neon docs: data-api/generate-types                       | documented |
| Free plan: 5-min scale-to-zero (can't disable), 100 CU-h, 1 GB/project, 5 GB egress, 10 branches                  | Neon docs: introduction/plans; pricing                   | documented |
| Google sign-in links to an existing same-email account                                                            | none                                                     | unverified |
| Deleting a `neon_auth` user cascades to app rows                                                                  | none                                                     | unverified |

### Corrections to the September research

- **Data API status:** it's GA now, not Beta.
- **Free storage:** 1 GB per project, not 0.5 GB.
- **RLS cast:** `auth.uid()` returns uuid on Neon, so no cast is needed.
- **Better Auth version:** `~1.7.12` (1.7.17 installed), not 1.4.18.
- **`auth.users` foreign keys:** 5, not 6, and they can point at `neon_auth."user"` rather than being dropped.
- **`getUser()` calls:** 17 live, not 19.
- **Auth error mapper:** the 239-line mapper is dead code to delete, not rewrite.
- **Cache-helpers:** it works with Neon's client given the pin, so the hand-written-hooks fallback isn't needed.
- **Supabase region:** `eu-north-1`, not `eu-west-1`.
- **Users:** six accounts, not one.
- **Sign-in method:** the main account signs in with Google only, not email and password.
- **Test project:** `damp-silence-23792569` is gone.
