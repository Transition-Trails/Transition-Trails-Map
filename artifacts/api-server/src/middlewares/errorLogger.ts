/**
 * errorLogger.ts
 *
 * Express 4-argument error-handling middleware.
 * Catches all unhandled errors that flow through the Express error pipeline
 * and writes an `error` audit event for any 5xx response.
 *
 * 4xx errors (client mistakes) are intentionally NOT logged — they are not
 * platform failures and would create noise in the failure feed.
 *
 * Mount this BEFORE the final generic error handler in app.ts so it can
 * inspect and log the error before the generic handler consumes it.
 */

import type { ErrorRequestHandler } from 'express';
import { insertAuditEvent } from '../lib/auditLog.js';
import { logger } from '../lib/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorLogger: ErrorRequestHandler = (err, req, res, next) => {
  // Derive HTTP status from the error object (various Express error shapes)
  const status: number =
    (err as { status?: number }).status
    ?? (err as { statusCode?: number }).statusCode
    ?? 500;

  // Only audit 5xx — not client errors
  if (status >= 500) {
    const actorEmail = req.session?.googleEmail ?? 'anonymous';
    const message =
      err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;

    // Fire-and-forget — never let the audit write delay the error response
    void insertAuditEvent({
      eventType:  'error',
      actorEmail: actorEmail.toLowerCase(),
      ipAddress:  ip,
      metadata:   {
        route:   req.path,
        method:  req.method,
        status,
        message,
        source:  'unhandled_error_middleware',
      },
    });

    logger.error({ err, status, route: req.path }, 'errorLogger: unhandled 5xx');
  }

  // Pass to the next error handler (the generic one in app.ts)
  next(err);
};
