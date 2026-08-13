/**
 * responseLogger.ts
 *
 * Request middleware that hooks into `res.on('finish', ...)` to write an
 * `error` audit event for every completed 5xx response.
 *
 * This is the catch-all for explicit `res.status(5xx).json(...)` calls that
 * never flow through Express's 4-argument error pipeline.  To avoid duplicate
 * audit rows, it checks `res.locals.errorLogged` — a flag set by `errorLogger`
 * when it has already written an entry for the same response.
 *
 * Mount this middleware BEFORE routes in app.ts so the finish listener is
 * attached to every incoming request.
 */

import type { RequestHandler } from 'express';
import { insertAuditEvent } from '../lib/auditLog.js';

export const responseLogger: RequestHandler = (req, res, next) => {
  res.on('finish', () => {
    // Only care about 5xx responses.
    if (res.statusCode < 500) return;

    // errorLogger already wrote an audit row for this response (unhandled errors
    // that flow through next(err)).  Skip to avoid a duplicate entry.
    if (res.locals['errorLogged'] === true) return;

    const actorEmail = req.session?.googleEmail ?? 'anonymous';
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;

    // Fire-and-forget — never delay the already-sent response.
    void insertAuditEvent({
      eventType:  'error',
      actorEmail: actorEmail.toLowerCase(),
      ipAddress:  ip,
      metadata:   {
        route:   req.path,
        method:  req.method,
        status:  res.statusCode,
        source:  'response_finish_middleware',
      },
    });
  });

  next();
};
