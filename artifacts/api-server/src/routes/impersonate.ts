/**
 * impersonate.ts
 *
 * Superadmin impersonation — lets a superadmin view Trail OS as any user.
 *
 * Routes (requireSuperAdmin middleware is applied at mount time in index.ts):
 *   POST /admin/impersonate         — start impersonating a target user
 *   POST /admin/impersonate/exit    — stop impersonating, restore real session
 *
 * Audit ordering — both events are BLOCKING success gates:
 *
 *   START:  (1) write impersonation_start FIRST, (2) then save session.
 *           If the audit write fails → 500, nothing was persisted, clean state.
 *           If the session save then fails → 500, an orphaned audit record exists
 *           (impersonation that never became active) — logged prominently.
 *
 *   EXIT:   (1) write impersonation_end FIRST, (2) then clear & save session.
 *           If the audit write fails → 500, session is unchanged (still impersonating).
 *           If the session save then fails → 500 with critical log.
 *           In both failure cases the exit has NOT succeeded from the caller's perspective.
 *
 * Security constraints:
 *   - Superadmin-only (requireSuperAdmin applied at mount)
 *   - Cannot impersonate another superadmin
 *   - Cannot impersonate yourself
 *   - Cannot nest impersonation
 */

import { Router } from 'express';
import { isSuperAdmin } from '../middlewares/requireAuth';
import { db } from '@workspace/db';
import { trailOsAuditLogTable } from '@workspace/db/schema';
import { logger } from '../lib/logger';

const router = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

function getIp(req: import('express').Request): string | null {
  return (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? null;
}

function sessionSave(req: import('express').Request): Promise<void> {
  return new Promise((resolve, reject) =>
    req.session.save(err => (err ? reject(err) : resolve())),
  );
}

// ── POST /admin/impersonate ───────────────────────────────────────────────────

router.post('/admin/impersonate', async (req, res) => {
  const superadminEmail = req.session.googleEmail!; // guaranteed by requireSuperAdmin

  // Block nested impersonation
  if (req.session.impersonatedEmail) {
    res.status(409).json({
      error:   'already_impersonating',
      message: `You are already viewing the platform as ${req.session.impersonatedEmail}. Exit first.`,
    });
    return;
  }

  const { targetEmail, targetName, targetAudience } = req.body as {
    targetEmail?:    unknown;
    targetName?:     unknown;
    targetAudience?: unknown;
  };

  if (typeof targetEmail !== 'string' || !targetEmail.trim()) {
    res.status(400).json({ error: 'targetEmail is required' });
    return;
  }

  const normalizedTarget = targetEmail.trim().toLowerCase();

  if (normalizedTarget === superadminEmail.toLowerCase()) {
    res.status(400).json({ error: 'self_impersonation', message: 'You cannot impersonate yourself.' });
    return;
  }

  if (isSuperAdmin(normalizedTarget)) {
    res.status(403).json({ error: 'target_is_superadmin', message: 'Superadmin accounts cannot be impersonated.' });
    return;
  }

  const VALID_AUDIENCES = ['learner', 'coach', 'volunteer', 'team'] as const;
  type ValidAudience = typeof VALID_AUDIENCES[number];
  const audience: ValidAudience | null =
    VALID_AUDIENCES.includes(targetAudience as ValidAudience) ? (targetAudience as ValidAudience) : null;

  const displayName =
    typeof targetName === 'string' && targetName.trim() ? targetName.trim() : normalizedTarget;

  const ip = getIp(req);

  // ── Step 1: Write audit record FIRST ────────────────────────────────────────
  // Writing before saving the session means a failure here leaves the session
  // unchanged — no rollback required.
  try {
    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_start',
      actorEmail:  superadminEmail,
      targetEmail: normalizedTarget,
      audience,
      ipAddress:   ip,
      metadata:    { displayName, targetAudience: audience ?? 'staff' },
    });
  } catch (auditErr) {
    logger.error({ auditErr }, 'impersonate: audit write failed — impersonation aborted, session unchanged');
    res.status(500).json({
      error:   'audit_log_failed',
      message: 'Could not record impersonation in audit log. Impersonation aborted to preserve audit trail integrity.',
    });
    return;
  }

  // ── Step 2: Persist impersonation fields to session ──────────────────────────
  req.session.impersonatedEmail       = normalizedTarget;
  req.session.impersonatedAudience    = audience;
  req.session.impersonatedDisplayName = displayName;
  req.session.originalSuperadminEmail = superadminEmail;

  try {
    await sessionSave(req);
  } catch (sessionErr) {
    // Audit record exists but session could not be saved — orphaned audit entry.
    // Impersonation did not become active. Log prominently.
    logger.error(
      { sessionErr, superadmin: superadminEmail, target: normalizedTarget },
      'impersonate: CRITICAL — audit written but session save failed; impersonation not active',
    );
    res.status(500).json({ error: 'session_save_failed', message: 'Session could not be saved after audit was recorded.' });
    return;
  }

  logger.info({ superadmin: superadminEmail, target: normalizedTarget, audience }, 'impersonate: started');

  res.json({ ok: true, impersonatedAs: normalizedTarget, audience, displayName });
});

// ── POST /admin/impersonate/exit ──────────────────────────────────────────────

router.post('/admin/impersonate/exit', async (req, res) => {
  const superadminEmail   = req.session.originalSuperadminEmail ?? req.session.googleEmail!;
  const impersonatedEmail = req.session.impersonatedEmail;

  if (!impersonatedEmail) {
    res.json({ ok: true, message: 'Not currently impersonating.' });
    return;
  }

  const ip = getIp(req);

  // ── Step 1: Write audit record FIRST (success gate) ─────────────────────────
  // If the audit write fails the exit is rejected — session remains unchanged.
  // This guarantees every successful exit has an audit record.
  try {
    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_end',
      actorEmail:  superadminEmail,
      targetEmail: impersonatedEmail,
      audience:    null,
      ipAddress:   ip,
      metadata:    { exitedFrom: req.headers['referer'] ?? null },
    });
  } catch (auditErr) {
    logger.error({ auditErr }, 'impersonate/exit: audit write failed — exit rejected, session unchanged');
    res.status(500).json({
      error:   'audit_log_failed',
      message: 'Could not record impersonation end in audit log. Exit rejected to preserve audit trail integrity.',
    });
    return;
  }

  // ── Step 2: Clear impersonation session fields ───────────────────────────────
  delete req.session.impersonatedEmail;
  delete req.session.impersonatedAudience;
  delete req.session.impersonatedDisplayName;
  delete req.session.originalSuperadminEmail;

  try {
    await sessionSave(req);
  } catch (sessionErr) {
    logger.error(
      { sessionErr, superadmin: superadminEmail, target: impersonatedEmail },
      'impersonate/exit: CRITICAL — audit end written but session clear failed; session may still show impersonation',
    );
    res.status(500).json({ error: 'session_save_failed', message: 'Session could not be cleared after audit was recorded.' });
    return;
  }

  logger.info({ superadmin: superadminEmail, target: impersonatedEmail }, 'impersonate: ended');

  res.json({ ok: true });
});

export default router;
