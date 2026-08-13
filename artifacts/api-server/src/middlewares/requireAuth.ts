/**
 * requireAuth.ts
 *
 * Authentication and authorisation middleware for Trail OS API routes.
 *
 * Design principles:
 *  - Authentication (401): checked by presence of req.session.googleEmail.
 *  - Authorisation (403): checked against req.session.googleGroups (the SET,
 *    not the derived display tier) so a user in two groups retains both grants.
 *  - Superadmin whitelist (TRAIL_OS_SUPERADMIN_EMAILS env var) always passes,
 *    regardless of group membership — keeps the operator account working.
 *  - The two statuses are intentionally distinguishable:
 *      401 not_authenticated → "sign in"
 *      403 not_authorized    → "ask to be added to a group"
 *
 * The global staff gate is applied in routes/index.ts with an explicit
 * public-path allowlist (default-deny). Individual admin routes use
 * requireAdmin directly.
 */

import type { RequestHandler } from 'express';

// ── Group getters (read from ENV vars at call time) ───────────────────────────

/**
 * Returns the resolved staff group emails at call time, reading from ENV vars
 * so a group-address change takes effect without a code deploy.
 *
 * Defaults match the historic hard-coded values so existing installations
 * continue to work even without the ENV vars set.
 *
 *   GOOGLE_GROUP_EVERYDAY — trailosusers@transitiontrails.org
 *   GOOGLE_GROUP_POWER    — trailospennyadmin@transitiontrails.org
 *   GOOGLE_GROUP_ADMIN    — trailosadmin@transitiontrails.org
 *
 * NOTE: team@ is intentionally excluded here; it is added by isStaff() via
 * getTeamGroup() so it continues to track GOOGLE_GROUP_TEAM dynamically.
 */
export function getStaffGroups(): string[] {
  return [
    (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
  ].filter(Boolean);
}

/**
 * Returns the resolved admin group emails at call time, reading from ENV vars.
 *
 *   GOOGLE_GROUP_ADMIN — trailosadmin@transitiontrails.org
 */
export function getAdminGroups(): string[] {
  return [
    (process.env['GOOGLE_GROUP_ADMIN'] ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
  ].filter(Boolean);
}

/**
 * Returns the configured team group email (from GOOGLE_GROUP_TEAM env var),
 * normalised to lower-case, or null when the env var is not set.
 * Called at request time so a live env-var update takes effect immediately.
 */
export function getTeamGroup(): string | null {
  const v = (process.env['GOOGLE_GROUP_TEAM'] ?? '').toLowerCase().trim();
  return v || null;
}

// ── Grant helpers (check the set, not the derived tier) ───────────────────────

/** Returns true if the email is in the TRAIL_OS_SUPERADMIN_EMAILS env var. */
export function isSuperAdmin(email: string): boolean {
  const list = (process.env['TRAIL_OS_SUPERADMIN_EMAILS'] ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Returns true if the user qualifies as staff.
 * Checks the GROUPS SET so a user in two groups retains both grants.
 * The team group is read from GOOGLE_GROUP_TEAM at call time so changing
 * the env var takes effect without a code change.
 */
export function isStaff(groups: string[], email: string): boolean {
  if (isSuperAdmin(email)) return true;
  const lowerGroups = groups.map(g => g.toLowerCase());
  if (getStaffGroups().some(g => lowerGroups.includes(g))) return true;
  const teamGroup = getTeamGroup();
  return teamGroup !== null && lowerGroups.includes(teamGroup);
}

/**
 * Returns true if the user qualifies as admin.
 * Checks the GROUPS SET, not the derived display tier.
 */
export function isAdmin(groups: string[], email: string): boolean {
  if (isSuperAdmin(email)) return true;
  const lowerGroups = groups.map(g => g.toLowerCase());
  return getAdminGroups().some(g => lowerGroups.includes(g));
}

// ── Middleware ─────────────────────────────────────────────────────────────────

/**
 * requireStaff
 *
 * Returns 401 if the request has no Google session.
 * Returns 403 if the signed-in user is not in any Trail OS group.
 * Calls next() otherwise.
 *
 * Applied globally in routes/index.ts via the PUBLIC_PATHS allowlist so
 * every data route is protected by default — "refused unless explicitly
 * public" not "allowed unless explicitly protected".
 */
export const requireStaff: RequestHandler = (req, res, next) => {
  const email = req.session.googleEmail;

  if (!email) {
    res.status(401).json({
      error:   'not_authenticated',
      message: 'Sign in required.',
    });
    return;
  }

  const groups = req.session.googleGroups ?? [];

  if (!isStaff(groups, email)) {
    res.status(403).json({
      error:   'not_authorized',
      message: 'Your account is not a member of any Trail OS group.',
      hint:    'Ask your administrator to add you to a Trail OS group in Google Workspace Admin.',
    });
    return;
  }

  next();
};

/**
 * requireAdmin
 *
 * Returns 401 if no Google session.
 * Returns 403 if the signed-in user is not in the admin group (or superadmin).
 *
 * Applied directly to admin-only routes: secrets audit, google-groups,
 * role-owners, slack notifications, and template seed routes.
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  const email = req.session.googleEmail;

  if (!email) {
    res.status(401).json({
      error:   'not_authenticated',
      message: 'Sign in required.',
    });
    return;
  }

  const groups = req.session.googleGroups ?? [];

  if (!isAdmin(groups, email)) {
    res.status(403).json({
      error:   'not_authorized',
      message: 'This action requires administrator access.',
      hint:    'Contact your Trail OS administrator to request access to the admin group.',
    });
    return;
  }

  next();
};

/**
 * requireSuperAdmin
 *
 * Returns 401 if no Google session.
 * Returns 403 if the signed-in user is not in TRAIL_OS_SUPERADMIN_EMAILS.
 *
 * Applied to the impersonation routes — only superadmins can trigger
 * impersonation. Admin group members (who pass requireAdmin) are explicitly
 * refused.
 */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  const email = req.session.googleEmail;

  if (!email) {
    res.status(401).json({
      error:   'not_authenticated',
      message: 'Sign in required.',
    });
    return;
  }

  if (!isSuperAdmin(email)) {
    res.status(403).json({
      error:   'not_authorized',
      message: 'This action requires superadmin access.',
      hint:    'Contact your Trail OS administrator. Only accounts listed in TRAIL_OS_SUPERADMIN_EMAILS can perform impersonation.',
    });
    return;
  }

  next();
};

// ── Homebase audience groups ──────────────────────────────────────────────────

/** Returns the stored homebase audience from session, or null. */
function getHomebaseAudience(
  session: Express.Request['session'],
): 'learner' | 'coach' | 'volunteer' | null {
  const a = session.googleAudience;
  if (a === 'learner' || a === 'coach' || a === 'volunteer') return a;
  return null;
}

/**
 * effectiveIdentityMiddleware
 *
 * Populates `res.locals.effectiveEmail` and `res.locals.effectiveAudience`
 * for every authenticated request.
 *
 * When a superadmin is impersonating, the effective identity is the impersonated
 * user — homebase data routes and audience guards use these values so the
 * superadmin sees exactly what the target user sees.
 *
 * Access-control checks (requireStaff / requireAdmin / requireSuperAdmin) always
 * read the REAL session (googleEmail, googleGroups) and are unaffected.
 *
 * Must be mounted BEFORE any router that uses the effective identity.
 */
export const effectiveIdentityMiddleware: RequestHandler = (req, res, next) => {
  if (req.session.impersonatedEmail) {
    res.locals['effectiveEmail']    = req.session.impersonatedEmail;
    res.locals['effectiveAudience'] = req.session.impersonatedAudience ?? null;
  } else {
    res.locals['effectiveEmail']    = req.session.googleEmail   ?? null;
    res.locals['effectiveAudience'] = req.session.googleAudience ?? null;
  }
  next();
};

/**
 * requireHomebaseAuth
 *
 * Returns 401 if no Google session (real session check).
 * Returns 403 if the effective audience is not a homebase audience.
 *
 * Uses res.locals.effectiveAudience (set by effectiveIdentityMiddleware) so
 * a superadmin impersonating a learner/coach/volunteer passes this gate.
 *
 * Applied to homebase data routes (log-time, quest, squad, etc.).
 */
export const requireHomebaseAuth: RequestHandler = (req, res, next) => {
  // Authentication: use real session (superadmin is genuinely signed in)
  if (!req.session.googleEmail) {
    res.status(401).json({
      error:   'not_authenticated',
      message: 'Sign in required.',
    });
    return;
  }

  // Superadmins bypass the audience check — they can access assessment routes
  // directly for testing purposes (no impersonation required).
  // effectiveEmail is their own googleEmail when not impersonating, which is
  // what gets recorded as learnerEmail on assessment sessions.
  if (isSuperAdmin(req.session.googleEmail)) {
    next();
    return;
  }

  // Authorization: use effective audience so impersonation works
  const audience = res.locals['effectiveAudience'] as string | null | undefined;
  const HOMEBASE_AUDIENCES = ['learner', 'coach', 'volunteer'] as const;

  if (!audience || !HOMEBASE_AUDIENCES.includes(audience as typeof HOMEBASE_AUDIENCES[number])) {
    res.status(403).json({
      error:   'not_authorized',
      message: 'This resource is only available to Homebase users (learner, coach, or volunteer).',
    });
    return;
  }

  next();
};
