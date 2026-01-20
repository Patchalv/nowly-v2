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

    // Set the environment for better issue tracking
    environment: process.env.NODE_ENV || 'development',

    // Session Replay with privacy-first settings
    integrations: [
      Sentry.replayIntegration({
        // Mask all text content to protect user privacy
        maskAllText: true,
        // Block all media (images, videos, audio) from recordings
        blockAllMedia: true,
      }),
    ],

    // Performance monitoring sample rates
    // 100% in development, 10% in production to reduce costs
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Session Replay sample rates
    // 100% in development for debugging, 5% in production to minimize quota usage
    replaysSessionSampleRate: isDevelopment ? 1.0 : 0.05,

    // Always capture replays when an error occurs (100%)
    replaysOnErrorSampleRate: 1.0,

    // Disable PII in production for privacy compliance
    sendDefaultPii: isDevelopment,

    // Scrub sensitive data before sending to Sentry
    beforeSend(event, hint) {
      // Remove PII from event data
      if (event.request) {
        // Scrub sensitive headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Scrub query parameters that might contain sensitive data
        if (event.request.query_string) {
          const sensitiveParams = [
            'token',
            'key',
            'secret',
            'password',
            'api_key',
          ];
          // Handle both string and array formats
          if (typeof event.request.query_string === 'string') {
            let queryString = event.request.query_string;
            sensitiveParams.forEach((param) => {
              const regex = new RegExp(`${param}=[^&]*`, 'gi');
              queryString = queryString.replace(regex, `${param}=[REDACTED]`);
            });
            event.request.query_string = queryString;
          }
        }
      }

      // Scrub user information (emails, names, etc.)
      if (event.user) {
        // Keep user ID for tracking but remove PII
        const userId = event.user.id;
        event.user = { id: userId };
      }

      // Scrub breadcrumbs for sensitive data
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            // Remove potentially sensitive data from breadcrumbs
            const scrubbedData = { ...breadcrumb.data };
            const sensitiveKeys = [
              'password',
              'token',
              'apiKey',
              'secret',
              'email',
            ];
            sensitiveKeys.forEach((key) => {
              if (scrubbedData[key]) {
                scrubbedData[key] = '[REDACTED]';
              }
            });
            return { ...breadcrumb, data: scrubbedData };
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
