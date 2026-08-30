# Nowly

Nowly is a task management app built around one idea: **manage when you do, not just when it's due.** It separates a _scheduled date_ (when you plan to work on something) from a _due date_ (a real, hard deadline), so planning your day doesn't dull the meaning of an actual deadline. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning behind this and other design decisions.

## Tech Stack

- **[Next.js](https://nextjs.org)** (App Router) with TypeScript — the app itself, under `src/app`.
- **[Supabase](https://supabase.com)** — Postgres database, auth, and row-level security. Generated types live in `src/types/database.ts` (run `npm run db:types` to regenerate; don't hand-edit).
- **[Sentry](https://sentry.io)** — error tracking and monitoring in production. See [Error Monitoring](#error-monitoring) below.

## Getting Started

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app. The `npm run dev` server auto-updates as you edit files under `src/`.

You'll need Supabase environment variables (project URL and anon key) in `.env.local` for auth and data to work locally.

## Error Monitoring

Nowly v2 uses [Sentry](https://sentry.io) for error tracking and monitoring in production.

### Setup

Add the following environment variables to enable Sentry:

```bash
# Required for error tracking in production
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Required for uploading source maps during builds
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

**Important:** Errors are **not** sent to Sentry during local development (when `NODE_ENV=development`). To enable Sentry locally for testing, you must:

1. Set `NEXT_PUBLIC_SENTRY_DSN` in your `.env.local`
2. Run a production build with `npm run build && npm start`

### Features

- Automatic error capture in production
- User context tracking (user ID and email only)
- Session replay with privacy-first settings (all text masked, media blocked)
- Supabase error handlers with automatic PII scrubbing
- Configurable sample rates (10% traces, 5% session replays in production)

For more details on error handling utilities, see [`src/lib/errors/README.md`](src/lib/errors/README.md).

## CI & Factory Onboarding

This repository is onboarded to a software factory that can plan and implement tickets autonomously:

- `factory.yml` at the repo root marks the repository as factory-eligible. It names the CI jobs the factory's Verify stage gates on and carries the house style (conventions, permitted grants, network access) handed to the agent that plans and implements a ticket.
- `.github/workflows/ci.yml` runs on every push to `main` and every pull request, with three jobs — `lint`, `typecheck`, and `build` — each named exactly as `factory.yml` expects. A pull request isn't marked ready until all three are green.
- Work is handed to the factory via a GitHub issue using the [`factory-ticket`](.github/ISSUE_TEMPLATE/factory-ticket.md) template: a goal, observable acceptance criteria, and optionally an out-of-scope list and notes. Adding the `state:ready` label starts a run; nothing happens without it.

Before committing, run `npm run format`, and make sure `npm run lint`, `npm run typecheck`, and `npm run build` all pass — they're the same checks CI runs.
