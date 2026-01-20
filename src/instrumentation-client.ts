// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';

// Only initialize Sentry if DSN is provided
// In local development, DSN should NOT be set to prevent error reporting to Sentry
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Add optional integrations for additional features
    integrations: [Sentry.replayIntegration()],

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    // 100% in development, 10% in production to reduce costs
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // 100% in development for debugging, 10% in production to reduce costs
    replaysSessionSampleRate: isDevelopment ? 1.0 : 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    // Only send PII in development for privacy compliance
    sendDefaultPii: isDevelopment,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
