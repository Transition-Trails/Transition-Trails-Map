/**
 * googleSignIn.ts
 *
 * Per-user Google Sign-In for Trail OS staff.
 * This is the user authentication flow — it is separate from the administrator
 * Google OAuth wizard in googleOAuth.ts, which grants service-level access to
 * Drive, Calendar, and Gmail as an application.
 *
 * Routes:
 *   GET  /auth/google/login      — start OAuth (redirect to Google)
 *   GET  /auth/google/callback   — receive code, validate, establish session
 *   GET  /auth/google/me         — return current signed-in user (or not-authenticated)
 *   POST /auth/google/sign-out   — destroy the google session fields
 *
 * Domain enforcement:
 *   Only @transitiontrails.org accounts are accepted. A personal Gmail address
 *   is refused with a clear error, not a generic one.
 *
 * Group enforcement:
 *   After domain validation the user must belong to at least one Trail OS
 *   Google Group. Their full group set is stored on the session; `tier` is
 *   derived from the set (highest tier wins for display, but the set is
 *   returned so callers can make per-group decisions).
 *
 * Group refresh:
 *   The /me endpoint refreshes the group set once the session's
 *   googleGroupsExpiry timestamp has passed (≈ 5 min). This means a group
 *   change takes effect within one refresh interval without a sign-out.
 */

import { Router, type Request } from 'express';
import crypto from 'crypto';
import { getGroupsForUser } from '../lib/googleGroupsCache';
import { logger } from '../lib/logger';

const router = Router();

export const ALLOWED_DOMAIN = 'transitiontrails.org';

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES           = 'openid email profile';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Race a groups-lookup promise against a configurable wall-clock timeout.
 *
 * If `getGroupsForUser` is slow (e.g. Directory API is under load) the
 * promise may never settle, holding up the /me response for the full HTTP
 * round-trip duration.  Wrapping it here lets the existing catch block in
 * /me serve stale session data for slow responses, exactly as it does for
 * hard failures (network error, quota exceeded, etc.).
 *
 * Timeout is read fresh on every call so tests can override via
 * `process.env.GROUPS_REFRESH_TIMEOUT_MS` without reloading the module.
 * Default: 3 000 ms.
 */
function withGroupsTimeout(promise: Promise<import('../lib/googleGroupsCache.js').GroupLookupResult>): Promise<import('../lib/googleGroupsCache.js').GroupLookupResult> {
  const ms = Number(process.env['GROUPS_REFRESH_TIMEOUT_MS'] ?? 3000);
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`getGroupsForUser timed out after ${ms} ms`)),
        ms,
      ),
    ),
  ]);
}

/**
 * Build the OAuth callback URL.
 * Priority: GOOGLE_USER_SIGNIN_CALLBACK_URL env var → derived from request headers.
 * The env var is the one to set in Google Cloud Console's authorised redirect URIs.
 */
function getCallbackUrl(req: Request): string {
  const fromEnv = process.env['GOOGLE_USER_SIGNIN_CALLBACK_URL'];
  if (fromEnv) return fromEnv;
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol ?? 'https';
  const host  = (req.headers['x-forwarded-host']  as string | undefined) ?? req.headers.host ?? 'localhost';
  return `${proto}://${host}/api/auth/google/callback`;
}

/** Check whether an email address is from our allowed domain. */
export function isOrgEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/**
 * Derive the display tier from a set of group memberships + superadmin check.
 * Multiple memberships are held as-is on the session; this function picks the
 * highest-privilege tier for display purposes only.
 */
export function deriveGroupTier(
  groups: string[],
  email:  string,
): 'everyday' | 'power' | 'admin' | 'superadmin' {
  const superadmins = (process.env['TRAIL_OS_SUPERADMIN_EMAILS'] ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const adminGroup    = (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim();
  const powerGroup    = (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim();
  const everydayGroup = (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim();

  const lowerGroups = groups.map(g => g.toLowerCase());

  if (superadmins.includes(email.toLowerCase())) return 'superadmin';
  if (adminGroup    && lowerGroups.includes(adminGroup))    return 'admin';
  if (powerGroup    && lowerGroups.includes(powerGroup))    return 'power';
  if (everydayGroup && lowerGroups.includes(everydayGroup)) return 'everyday';
  return 'everyday'; // org-domain user not yet in any group — caller guards on groups.length
}

/**
 * Derive the homebase audience from a set of group memberships.
 *
 * Homebase group emails are read from ENV vars so they can be configured
 * without a code change:
 *   GOOGLE_GROUP_COACHES     — trailos-coaches@transitiontrails.org
 *   GOOGLE_GROUP_VOLUNTEERS  — trailos-volunteers@transitiontrails.org
 *   GOOGLE_GROUP_LEARNERS    — trailos-learners@transitiontrails.org
 *
 * Priority order when a user is (unexpectedly) in multiple homebase groups:
 *   coach > volunteer > learner
 *
 * Returns null when the user is not in any homebase group.
 */
export function deriveAudience(
  groups: string[],
  email:  string,
): 'learner' | 'coach' | 'volunteer' | 'team' | null {
  const coachGroup     = (process.env['GOOGLE_GROUP_COACHES']    ?? '').toLowerCase().trim();
  const volunteerGroup = (process.env['GOOGLE_GROUP_VOLUNTEERS'] ?? '').toLowerCase().trim();
  const learnerGroup   = (process.env['GOOGLE_GROUP_LEARNERS']   ?? '').toLowerCase().trim();
  const teamGroup      = (process.env['GOOGLE_GROUP_TEAM']       ?? '').toLowerCase().trim();

  const lowerGroups = groups.map(g => g.toLowerCase());

  // Team is resolved before coach/volunteer/learner — staff takes priority over
  // homebase audiences, but team is a special staff group that lands on homebase.
  if (teamGroup && lowerGroups.includes(teamGroup)) return 'team';

  const homebaseMatches = [
    coachGroup     && lowerGroups.includes(coachGroup)     ? 'coach'     : null,
    volunteerGroup && lowerGroups.includes(volunteerGroup) ? 'volunteer' : null,
    learnerGroup   && lowerGroups.includes(learnerGroup)   ? 'learner'   : null,
  ].filter(Boolean);

  if (homebaseMatches.length > 1) {
    logger.warn(
      { email, homebaseGroups: homebaseMatches },
      'googleSignIn: user is in multiple homebase groups — using priority order (coach > volunteer > learner)',
    );
  }

  return (homebaseMatches[0] ?? null) as 'learner' | 'coach' | 'volunteer' | null;
}

/**
 * Returns true if the user is a recognised STAFF member for audience-derivation purposes.
 * Only checks the three fixed Trail OS staff groups and superadmins — NOT the team group.
 *
 * The team group (GOOGLE_GROUP_TEAM) is intentionally excluded here: team-only members
 * should receive audience='team' and land on TeamHomebase, not the staff Mission Control.
 * requireAuth.isStaff (used for API route authorization) separately includes the team
 * group so they can access Mission Control routes once they navigate there via the drawer.
 *
 * Exported so homebase.ts can apply the same staff-priority rule when re-deriving audience
 * on a stale session (expired googleGroupsExpiry TTL).
 */
export function isKnownStaff(groups: string[], email: string): boolean {
  const superadmins = (process.env['TRAIL_OS_SUPERADMIN_EMAILS'] ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (superadmins.includes(email.toLowerCase())) return true;
  const lowerGroups = groups.map(g => g.toLowerCase());
  const staffGroups = [
    (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
    (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
  ].filter(Boolean);
  return staffGroups.some(g => lowerGroups.includes(g));
}

/**
 * Decode the payload of a Google-issued ID token.
 * We obtained this directly from Google's token endpoint, so no signature
 * verification is needed — we trust the source.
 */
function decodeIdToken(token: string): {
  sub:             string;
  email:           string;
  name?:           string;
  hd?:             string;
  email_verified?: boolean;
} {
  const payload = token.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub: string; email: string; name?: string; hd?: string; email_verified?: boolean;
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// 1. Start sign-in — redirect user to Google's consent screen
router.get('/auth/google/login', (req, res) => {
  const clientId     = process.env['GOOGLE_CLIENT_ID'];
  if (!clientId) {
    res.status(500).send(
      'Google Sign-In is not configured (GOOGLE_CLIENT_ID missing). ' +
      'Contact your Trail OS administrator.',
    );
    return;
  }

  const state = crypto.randomBytes(20).toString('hex');
  req.session['googleOAuthState'] = state;

  req.session.save((err) => {
    if (err) {
      logger.error({ err }, 'googleSignIn: session save failed before OAuth redirect');
      res.status(500).send('Session error — please try again.');
      return;
    }

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  getCallbackUrl(req),
      response_type: 'code',
      scope:         SCOPES,
      state,
      hd:            ALLOWED_DOMAIN,  // hint to Google to show org picker first
      access_type:   'online',
      prompt:        'select_account',
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });
});

// 2. Callback — exchange code, validate, write session
router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query as Record<string, string | undefined>;

  if (oauthError) {
    logger.warn({ oauthError }, 'googleSignIn: Google returned an error in callback');
    res.redirect(`/?sign_in_error=google_error&detail=${encodeURIComponent(oauthError)}`);
    return;
  }

  if (!code || !state) {
    res.redirect('/?sign_in_error=missing_params');
    return;
  }

  // CSRF check
  const savedState = req.session['googleOAuthState'] as string | undefined;
  delete req.session['googleOAuthState'];

  if (!savedState || savedState !== state) {
    res.redirect('/?sign_in_error=state_mismatch');
    return;
  }

  const clientId     = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    res.redirect('/?sign_in_error=not_configured');
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  getCallbackUrl(req),
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      logger.error({ status: tokenResp.status, body }, 'googleSignIn: token exchange failed');
      res.redirect('/?sign_in_error=token_exchange');
      return;
    }

    const tokens = await tokenResp.json() as { id_token?: string };
    if (!tokens.id_token) {
      res.redirect('/?sign_in_error=no_id_token');
      return;
    }

    // Validate identity from the ID token
    const identity = decodeIdToken(tokens.id_token);
    const { sub, email, name, hd, email_verified } = identity;

    if (!email || !sub) {
      res.redirect('/?sign_in_error=missing_identity');
      return;
    }

    // Domain enforcement — the `hd` claim MUST equal our org domain.
    // `hd=` in the auth URL is only a hint; this check is the real gate.
    if (hd !== ALLOWED_DOMAIN || !isOrgEmail(email)) {
      logger.warn({ email, hd }, 'googleSignIn: sign-in refused — not an org account');
      res.redirect(
        `/?sign_in_error=wrong_domain&email=${encodeURIComponent(email)}`,
      );
      return;
    }

    if (email_verified === false) {
      res.redirect('/?sign_in_error=unverified');
      return;
    }

    // Group membership check — accept staff groups OR homebase groups.
    // Staff takes priority: if the user is in any staff group, they go to the
    // admin screens regardless of homebase group membership.
    const { groups } = await getGroupsForUser(email.toLowerCase());
    const hasStaff    = isKnownStaff(groups, email);
    const tier        = deriveGroupTier(groups, email);
    // Only derive homebase audience for non-staff users
    const audience    = hasStaff ? null : deriveAudience(groups, email);
    const hasHomebase = audience !== null;

    if (!hasStaff && !hasHomebase) {
      logger.warn({ email }, 'googleSignIn: sign-in refused — not in any Trail OS or Homebase group');
      res.redirect(
        `/?sign_in_error=no_groups&email=${encodeURIComponent(email)}`,
      );
      return;
    }

    // Write session — these fields are checked by /me on every load
    req.session.googleEmail        = email.toLowerCase();
    req.session.googleName         = name ?? email;
    req.session.googleSub          = sub;
    req.session.googleGroups       = groups;
    req.session.googleGroupsExpiry = Date.now() + 5 * 60 * 1000;
    req.session.googleTier         = tier;
    req.session.googleAudience     = audience ?? undefined;

    req.session.save((err) => {
      if (err) {
        logger.error({ err }, 'googleSignIn: session save failed after successful sign-in');
        res.redirect('/?sign_in_error=session_save');
        return;
      }
      logger.info({ email, tier, audience, groupCount: groups.length }, 'googleSignIn: sign-in complete');
      res.redirect('/');
    });

  } catch (err) {
    logger.error({ err }, 'googleSignIn: unexpected error in callback');
    res.redirect('/?sign_in_error=unexpected');
  }
});

// 3. Current user — called by the frontend on every load
router.get('/auth/google/me', async (req, res) => {
  if (!req.session.googleEmail) {
    res.json({ authenticated: false });
    return;
  }

  const email = req.session.googleEmail;
  const now   = Date.now();

  // Groups are refreshed after the cache TTL expires
  if (!req.session.googleGroupsExpiry || req.session.googleGroupsExpiry <= now) {
    try {
      const { groups, isReliable } = await withGroupsTimeout(getGroupsForUser(email));

      if (!isReliable) {
        // The Directory API was unavailable (no token or network error).
        // Do NOT sign the user out — an empty groups list here means "couldn't
        // check", not "confirmed non-member". Leave the TTL expired so the
        // next request retries.
        logger.warn({ email }, 'googleSignIn /me: group refresh unreliable — serving cached session');
      } else {
        const hasStaff = isKnownStaff(groups, email);
        // Staff takes priority: if the user is in any staff group, audience is
        // always null — matching callback semantics exactly.
        const audience = hasStaff ? null : deriveAudience(groups, email);

        if (!hasStaff && !audience) {
          // API responded and confirmed the user is in no known group — end session.
          logger.warn({ email }, 'googleSignIn /me: user is no longer in any known group — ending session');
          req.session.destroy(() => {});
          res.json({ authenticated: false, reason: 'no_groups' });
          return;
        }

        const tier = deriveGroupTier(groups, email);
        req.session.googleGroups       = groups;
        req.session.googleGroupsExpiry = now + 5 * 60 * 1000;
        req.session.googleTier         = tier;
        req.session.googleAudience     = audience ?? undefined;
        // Fire-and-forget save — we'll already return the fresh data below
        req.session.save(() => {});
      }
    } catch (groupsErr) {
      // The groups lookup timed out (slow Directory API response).
      // Serve the stale session rather than blocking the response — the user is
      // still authenticated and should not be locked out.
      // Extend the expiry by 60 s so we retry soon without hammering the API.
      logger.warn(
        { err: groupsErr, email },
        'googleSignIn /me: groups re-fetch timed out — serving stale session data',
      );
      req.session.googleGroupsExpiry = now + 60 * 1000;
      req.session.save(() => {});
    }
  }

  res.json({
    authenticated: true,
    email:    req.session.googleEmail,
    name:     req.session.googleName  ?? req.session.googleEmail,
    sub:      req.session.googleSub   ?? '',
    groups:   req.session.googleGroups ?? [],
    tier:     req.session.googleTier  ?? deriveGroupTier(req.session.googleGroups ?? [], email),
    audience: req.session.googleAudience ?? null,
    // Non-secret config — lets the frontend adapt without a code change when
    // GOOGLE_GROUP_TEAM is updated in the environment.
    teamGroup: (process.env['GOOGLE_GROUP_TEAM'] ?? '').toLowerCase().trim() || null,
  });
});

// 4. Sign out — destroy the session
router.post('/auth/google/sign-out', (req, res) => {
  const email = req.session.googleEmail;
  req.session.destroy((err) => {
    if (err) logger.error({ err }, 'googleSignIn: error on sign-out');
    else logger.info({ email }, 'googleSignIn: signed out');
    res.json({ ok: true });
  });
});

export default router;
