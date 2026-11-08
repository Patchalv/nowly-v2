# Nowly

Nowly is a task management app built around one idea: **manage when you do, not just when it's due.** It separates a _scheduled date_ (when you plan to work on something) from a _due date_ (a real, hard deadline), so planning your day doesn't dull the meaning of an actual deadline. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning behind this and other design decisions.

## Tech Stack

- **[Next.js](https://nextjs.org)** (App Router) with TypeScript — the app itself, under `src/app`.
- **[Neon](https://neon.com)** — Postgres database with row-level security, Neon Auth for sign-in, and the Neon Data API for data access. The schema lives in [`neon/migrations/`](neon/migrations/README.md). Generated types live in `src/types/database.ts` (run `npm run db:types` to regenerate; don't hand-edit).
- **[Sentry](https://sentry.io)** — error tracking and monitoring in production. See [Error Monitoring](#error-monitoring) below.

## Getting Started

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app. The `npm run dev` server auto-updates as you edit files under `src/`.

You'll need the Neon Auth URL, a cookie secret and the Neon Data API URL in `.env.local` for auth and data to work locally. Copy `.env.local.example` and fill them in.

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
- User context tracking (user ID only, no email or other PII)
- Session replay with privacy-first settings (all text masked, media blocked)
- Database error handlers with automatic PII scrubbing
- Configurable sample rates (10% traces, 5% session replays in production)

For more details on error handling utilities, see [`src/lib/errors/README.md`](src/lib/errors/README.md).

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, with three jobs: `lint`, `typecheck` and `build`.

Before committing, run `npm run format`, and make sure `npm run lint`, `npm run typecheck`, and `npm run build` all pass — they're the same checks CI runs.
