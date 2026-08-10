/**
 * impersonate.ts
 *
 * Superadmin impersonation — lets a superadmin view Trail OS as any user.
 *
 * Routes (all require requireSuperAdmin middleware applied at mount time):
 *   POST /admin/impersonate         — start impersonating a target user
 *   POST /admin/impersonate/exit    — stop impersonating, restore real session
 *
 * Audit log:
 *   impersonation_start  — written on POST /admin/impersonate  (BLOCKING — aborts on failure)
 *   impersonation_end    — written on POST /admin/impersonate/exit  (best-effort)
 *
 * What impersonation does:
 *   Writes four session fields (impersonatedEmail, impersonatedAudience,
 *   impersonatedDisplayName, originalSuperadminEmail).  The effectiveIdentityMiddleware
 *   propagates these to res.locals so every route reads the impersonated identity.
 *   The /me and /auth/homebase/status routes overlay these for the frontend.
 *   All access-control checks (requireStaff / requireAdmin / requireSuperAdmin)
 *   continue to use the REAL session (googleEmail, googleGroups) so the
 *   superadmin retains their own permissions throughout.
 *
 * Constraints enforced here:
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

// ── POST /admin/impersonate ───────────────────────────────────────────────────

router.post('/admin/impersonate', async (req, res) => {
  const superadminEmail = req.session.googleEmail!; // guaranteed by requireSuperAdmin

  // Block nested impersonation
  if (req.session.impersonatedEmail) {
    res.status(409).json({
      error:   'already_impersonating',
      message: `You are already viewing the platform as ${req.session.impersonatedEmail}. Exit first before starting a new impersonation.`,
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

  // Block impersonating yourself
  if (normalizedTarget === superadminEmail.toLowerCase()) {
    res.status(400).json({
      error:   'self_impersonation',
      message: 'You cannot impersonate yourself.',
    });
    return;
  }

  // Block impersonating another superadmin
  if (isSuperAdmin(normalizedTarget)) {
    res.status(403).json({
      error:   'target_is_superadmin',
      message: 'Superadmin accounts cannot be impersonated.',
    });
    return;
  }

  // Validate audience
  const VALID_AUDIENCES = ['learner', 'coach', 'volunteer', 'team'] as const;
  type ValidAudience = typeof VALID_AUDIENCES[number];
  const audience: ValidAudience | null =
    VALID_AUDIENCES.includes(targetAudience as ValidAudience)
      ? (targetAudience as ValidAudience)
      : null;

  const displayName =
    typeof targetName === 'string' && targetName.trim()
      ? targetName.trim()
      : normalizedTarget;

  // Set impersonation session fields
  req.session.impersonatedEmail       = normalizedTarget;
  req.session.impersonatedAudience    = audience;
  req.session.impersonatedDisplayName = displayName;
  req.session.originalSuperadminEmail = superadminEmail;

  // Persist session
  try {
    await new Promise<void>((resolve, reject) =>
      req.session.save(err => (err ? reject(err) : resolve())),
    );
  } catch (sessionErr) {
    logger.error({ sessionErr }, 'impersonate: session save failed');
    // Clear the in-memory fields we just set (session wasn't saved)
    delete req.session.impersonatedEmail;
    delete req.session.impersonatedAudience;
    delete req.session.impersonatedDisplayName;
    delete req.session.originalSuperadminEmail;
    res.status(500).json({ error: 'session_save_failed' });
    return;
  }

  // Blocking audit write — abort impersonation if audit cannot be recorded
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? null;

  try {
    await db.insert(trailOsAuditLogTable).values({
      eventType:   'impersonation_start',
      actorEmail:  superadminEmail,
      targetEmail: normalizedTarget,
      audience:    audience,
      ipAddress:   ip,
      metadata:    { displayName, targetAudience: audience ?? 'staff' },
    });
  } catch (auditErr) {
    // Roll back: clear session fields and re-save
    delete req.session.impersonatedEmail;
    delete req.session.impersonatedAudience;
    delete req.session.impersonatedDisplayName;
    delete req.session.originalSuperadminEmail;
    await new Promise<void>(resolve => req.session.save(() => resolve()));
    logger.error({ auditErr }, 'impersonate: audit log write failed — impersonation aborted');
    res.status(500).json({
      error:   'audit_log_failed',
      message: 'Could not record impersonation in audit log. Impersonation aborted to preserve audit trail integrity.',
    });
    return;
  }

  logger.info(
    { superadmin: superadminEmail, target: normalizedTarget, audience },
    'impersonate: impersonation started',
  );

  res.json({
    ok:             true,
    impersonatedAs: normalizedTarget,
    audience,
    displayName,
  });
});

// ── POST /admin/impersonate/exit ──────────────────────────────────────────────

router.post('/admin/impersonate/exit', async (req, res) => {
  const superadminEmail   = req.session.originalSuperadminEmail ?? req.session.googleEmail!;
  const impersonatedEmail = req.session.impersonatedEmail;

  if (!impersonatedEmail) {
    // Not currently impersonating — no-op
    res.json({ ok: true, message: 'Not currently impersonating.' });
    return;
  }

  // Clear impersonation fields
  delete req.session.impersonatedEmail;
  delete req.session.impersonatedAudience;
  delete req.session.impersonatedDisplayName;
  delete req.session.originalSuperadminEmail;

  try {
    await new Promise<void>((resolve, reject) =>
      req.session.save(err => (err ? reject(err) : resolve())),
    );
  } catch (sessionErr) {
    logger.error({ sessionErr }, 'impersonate/exit: session save failed');
    res.status(500).json({ error: 'session_save_failed' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? null;

  // Best-effort audit write — exit always succeeds even if audit fails,
  // since rolling back here would leave the superadmin stuck impersonating.
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
    logger.error({ auditErr }, 'impersonate/exit: audit log write failed for end event');
  }

  logger.info(
    { superadmin: superadminEmail, target: impersonatedEmail },
    'impersonate: impersonation ended',
  );

  res.json({ ok: true });
});

export default router;
