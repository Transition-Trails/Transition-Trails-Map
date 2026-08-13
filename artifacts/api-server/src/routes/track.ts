/**
 * track.ts
 *
 * POST /api/track
 *
 * Accepts `{ feature, action, detail?, metadata? }` from the frontend and
 * writes a `feature_use` audit event.  Available to any authenticated staff
 * session.  Rate-limited to 60 calls/minute per email to prevent spam.
 */

import { Router } from 'express';
import { insertAuditEvent } from '../lib/auditLog.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ── Rate limiter (in-memory, per email) ───────────────────────────────────────

export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_CALLS = 60;
export const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRate(email: string): { allowed: boolean; retryAfter?: number } {
  const now    = Date.now();
  let   bucket = rateBuckets.get(email);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(email, bucket);
  }
  bucket.count++;
  if (bucket.count > RATE_MAX_CALLS) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

// ── Payload allowlists (server-side enforcement) ──────────────────────────────
//
// Only named, privacy-reviewed feature+action pairs are accepted.
// Arbitrary caller-supplied strings are rejected so PII can never enter the
// audit log via this endpoint, regardless of what the frontend sends.

export const KNOWN_FEATURES = new Set([
  'penny', 'knowledge', 'programs', 'sf_ops',
  'procedure_builder', 'collaboration', 'governance',
]);

export const KNOWN_ACTIONS = new Set([
  'open', 'navigate', 'query_submit', 'search', 'load',
]);

// ── POST /api/track ───────────────────────────────────────────────────────────

interface TrackBody {
  feature: string;
  action:  string;
}

router.post('/track', async (req, res) => {
  const email    = req.session.googleEmail;
  const audience = req.session.googleAudience ?? null;

  if (!email) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  const { feature, action } = req.body as TrackBody;

  if (typeof feature !== 'string' || !KNOWN_FEATURES.has(feature.trim())) {
    res.status(400).json({ error: 'unknown_feature', knownFeatures: [...KNOWN_FEATURES] });
    return;
  }
  if (typeof action !== 'string' || !KNOWN_ACTIONS.has(action.trim())) {
    res.status(400).json({ error: 'unknown_action', knownActions: [...KNOWN_ACTIONS] });
    return;
  }

  const rate = checkRate(email);
  if (!rate.allowed) {
    res.status(429).json({ error: 'rate_limited', retryAfter: rate.retryAfter });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? null;

  // Store only the server-validated feature+action — no caller-supplied strings
  // that could carry PII or arbitrary data.
  void insertAuditEvent({
    eventType:  'feature_use',
    actorEmail: email.toLowerCase(),
    audience,
    ipAddress:  ip,
    metadata:   { feature: feature.trim(), action: action.trim() },
  });

  logger.debug({ email, feature, action }, 'track: feature_use event queued');

  res.json({ ok: true });
});

export default router;
