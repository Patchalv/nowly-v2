This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
