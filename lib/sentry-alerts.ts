/**
 * Sentry Alert Helper
 * 
 * Use this module to capture critical errors with proper context and alerting.
 * Sentry will be configured with alert rules in the Sentry dashboard.
 */

import * as Sentry from '@sentry/nextjs';

// Error severity levels for alerting
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

interface CaptureOptions {
  // Additional context data
  context?: Record<string, unknown>;
  // User information (sanitized)
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  // Tags for filtering in Sentry
  tags?: Record<string, string>;
  // Alert level - 'critical' triggers immediate alerts
  level?: AlertLevel;
}

/**
 * Capture an error with full context
 * Critical errors will trigger immediate alerts in Sentry
 */
export function captureError(
  error: Error | string,
  options: CaptureOptions = {}
): string {
  const { context, user, tags, level = 'error' } = options;

  // Set user context (without PII)
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email ? `${user.email.split('@')[0]}@***` : undefined,
      role: user.role,
    });
  }

  // Add custom tags
  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  }

  // Add critical tag for alerting
  if (level === 'critical') {
    Sentry.setTag('alert', 'critical');
  }

  // Capture the error
  const errorInstance = typeof error === 'string' ? new Error(error) : error;
  
  const eventId = Sentry.captureException(errorInstance, {
    level: level === 'critical' ? 'fatal' : level,
    extra: context,
  });

  // Clear user after capture
  Sentry.setUser(null);

  return eventId;
}

/**
 * Capture a critical error that needs immediate attention
 * This will trigger alerts in Sentry (if configured)
 */
export function captureCritical(
  error: Error | string,
  context?: Record<string, unknown>
): string {
  return captureError(error, {
    context,
    level: 'critical',
    tags: {
      priority: 'high',
      requiresAction: 'true',
    },
  });
}

/**
 * Critical error types for structured alerting
 */
export const CriticalErrors = {
  // Payment failures
  paymentFailed: (orderId: string, gateway: string, reason: string) =>
    captureCritical(new Error(`Payment failed: ${reason}`), {
      orderId,
      gateway,
      errorType: 'payment_failure',
    }),

  // Database connection issues
  databaseError: (operation: string, details: string) =>
    captureCritical(new Error(`Database error in ${operation}: ${details}`), {
      operation,
      errorType: 'database_error',
    }),

  // AI service failures
  aiServiceDown: (service: string, details: string) =>
    captureCritical(new Error(`AI service failure: ${service}`), {
      service,
      details,
      errorType: 'ai_service_failure',
    }),

  // Authentication issues
  authBypass: (route: string, details: string) =>
    captureCritical(new Error(`Potential auth bypass: ${route}`), {
      route,
      details,
      errorType: 'security_alert',
    }),

  // Rate limit abuse
  rateLimitAbuse: (ip: string, endpoint: string, count: number) =>
    captureCritical(new Error(`Rate limit abuse detected`), {
      ip: ip.replace(/\d+\.\d+$/, '*.* '), // Partial IP for privacy
      endpoint,
      requestCount: count,
      errorType: 'rate_limit_abuse',
    }),
};

/**
 * Track a business metric or event
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category: 'business',
    message: eventName,
    data,
    level: 'info',
  });
}

/**
 * Create a performance transaction for monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({ name, op });
}
