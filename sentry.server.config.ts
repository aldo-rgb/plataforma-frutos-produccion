// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1, // 10% of transactions

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out noisy errors
  ignoreErrors: [
    // Expected authentication errors
    'NEXT_REDIRECT',
    'Unauthorized',
    // Rate limiting (expected)
    'Rate limit exceeded',
  ],

  // Categorize errors by API route
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Tag errors by type for easier filtering
    if (error instanceof Error) {
      if (error.message.includes('prisma') || error.message.includes('database')) {
        event.tags = { ...event.tags, errorType: 'database' };
      } else if (error.message.includes('OpenAI') || error.message.includes('openai')) {
        event.tags = { ...event.tags, errorType: 'ai' };
      } else if (error.message.includes('Stripe') || error.message.includes('MercadoPago') || error.message.includes('PayPal')) {
        event.tags = { ...event.tags, errorType: 'payment' };
      }
    }

    // Don't send PII
    if (event.user) {
      delete event.user.ip_address;
    }

    return event;
  },
});
