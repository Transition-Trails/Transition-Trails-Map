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

// ── Group constants ───────────────────────────────────────────────────────────

/** Every Trail OS group that constitutes "staff" access (fixed addresses). */
export const TRAIL_OS_STAFF_GROUPS: readonly string[] = [
  'trailosusers@transitiontrails.org',
  'trailospennyadmin@transitiontrails.org',
  'trailosadmin@transitiontrails.org',
  // team@ is added dynamically via getTeamGroup() so it tracks GOOGLE_GROUP_TEAM
  // without a code change — see isStaff() below.
];

/**
 * Returns the configured team group email (from GOOGLE_GROUP_TEAM env var),
 * normalised to lower-case, or null when the env var is not set.
 * Called at request time so a live env-var update takes effect immediately.
 */
export function getTeamGroup(): string | null {
  const v = (process.env['GOOGLE_GROUP_TEAM'] ?? '').toLowerCase().trim();
  return v || null;
}

/** Groups required for admin-only routes. */
export const TRAIL_OS_ADMIN_GROUPS: readonly string[] = [
  'trailosadmin@transitiontrails.org',
];

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
  if (TRAIL_OS_STAFF_GROUPS.some(g => lowerGroups.includes(g))) return true;
  const teamGroup = getTeamGroup();
  return teamGroup !== null && lowerGroups.includes(teamGroup);
}

/**
 * Returns true if the user qualifies as admin.
 * Checks the GROUPS SET, not the derived display tier.
 */
export function isAdmin(groups: string[], email: string): boolean {
  if (isSuperAdmin(email)) return true;
  return TRAIL_OS_ADMIN_GROUPS.some(g => groups.includes(g));
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
 * requireHomebaseAuth
 *
 * Returns 401 if no Google session.
 * Returns 403 if the signed-in user does not have a homebase audience in session.
 *
 * Applied to homebase data routes (log-time, quest, squad, etc.).
 * The homebase auth flow uses the same Google Sign-In as staff, so the
 * session is the single source of truth.
 */
export const requireHomebaseAuth: RequestHandler = (req, res, next) => {
  const email = req.session.googleEmail;

  if (!email) {
    res.status(401).json({
      error:   'not_authenticated',
      message: 'Sign in required.',
    });
    return;
  }

  const audience = getHomebaseAudience(req.session);

  if (!audience) {
    res.status(403).json({
      error:   'not_authorized',
      message: 'This resource is only available to Homebase users (learner, coach, or volunteer).',
    });
    return;
  }

  next();
};
