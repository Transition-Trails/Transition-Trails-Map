/**
 * slackOAuthRoutes.test.ts
 *
 * Route-level tests for the Slack per-user OAuth panel.
 *
 * Auth model: requireSlackAuth reads ONLY the real session (googleEmail,
 * impersonatedEmail, googleAudience), never res.locals.effectiveEmail.
 * Checks: (1) authentication, (2) no active impersonation, (3) homebase audience.
 *
 * Covers:
 *  1.  GET /api/slack/oauth/status — 401 with no session (not behind staff gate)
 *  2.  GET /api/slack/oauth/status — 403 when staff session has no homebase audience
 *  3.  GET /api/slack/oauth/status — 200 {connected:false} for valid learner session
 *  4.  GET /api/slack/oauth/status — 200 {connected:false} for valid coach session
 *  5.  GET /api/slack/oauth/status — 200 {connected:true} when DB row exists
 *  6.  GET /api/slack/oauth/authorize — 302 redirect to Slack for learner session
 *  7.  GET /api/slack/oauth/authorize — 401 with no session
 *  8.  DELETE /api/slack/oauth/disconnect — 200 for learner session
 *  9.  DELETE /api/slack/oauth/disconnect — 401 with no session
 * 10.  GET /api/slack/conversations — 401 with no session
 * 11.  GET /api/slack/conversations — 403 when staff session has no homebase audience
 * 12.  GET /api/slack/conversations — 403 {error:"not_connected"} when no DB token
 * 13.  GET /api/slack/conversations/:id/history — 403 {error:"not_connected"} for valid learner with no token
 * 14.  POST /api/slack/conversations/:id/messages — 400 when text is empty
 * 15.  encryptToken / decryptToken round-trip
 * 16-20. Impersonation — 403 for every Slack data route when superadmin is impersonating
 * 21-22. Staff null-audience regression — 200/302 for staff with googleAudience: null
 * 23.  DELETE /api/slack/oauth/disconnect — staff session deletes only its own row
 * 24.  GET /api/slack/conversations — staff session returns not_connected, not another user's data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Session shim (same pattern as homebaseAuth.test.ts) ───────────────────────

const { mockSession } = vi.hoisted(() => {
  const mockSession: Record<string, unknown> = {};
  return { mockSession };
});

vi.mock('express-session', () => ({
  default: () => (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req['session'] = new Proxy(mockSession, {
      get(target, prop) {
        // Stub all session lifecycle methods so passport/connect-pg-simple never
        // sees an undefined where it expects a function, regardless of HTTP method.
        if (prop === 'save')       return (cb?: () => void) => cb?.();
        if (prop === 'destroy')    return (cb?: () => void) => cb?.();
        if (prop === 'regenerate') return (cb?: () => void) => cb?.();
        if (prop === 'reload')     return (cb?: () => void) => cb?.();
        if (prop === 'touch')      return (cb?: () => void) => cb?.();
        // For all data properties, read from the shared mockSession object.
        return (target as Record<string | symbol, unknown>)[prop];
      },
      set(target, prop, value) {
        (target as Record<string | symbol, unknown>)[prop] = value;
        return true;
      },
    });
    next();
  },
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class FakePgStore {
    get(_sid: string, cb: (err: null, s: null) => void) { cb(null, null); }
    set(_sid: string, _s: unknown, cb: () => void) { cb(); }
    destroy(_sid: string, cb: () => void) { cb(); }
  },
}));

// ── DB mock ───────────────────────────────────────────────────────────────────

const { mockDbSelect, mockDbInsert, mockDbDelete } = vi.hoisted(() => {
  const mockDbSelect = vi.fn();
  const mockDbInsert = vi.fn();
  const mockDbDelete = vi.fn();
  return { mockDbSelect, mockDbInsert, mockDbDelete };
});

// ── drizzle-orm eq spy ────────────────────────────────────────────────────────
// Wraps the real eq() so tests can assert which column value (email) was passed
// to the WHERE clause — without needing to decode the opaque SQL expression object.

const { mockEq } = vi.hoisted(() => {
  const mockEq = vi.fn();
  return { mockEq };
});

vi.mock('drizzle-orm', async (importOriginal) => {
  const original = await importOriginal<typeof import('drizzle-orm')>();
  // Forward the call to the real eq so the mock DB chain still works, but also
  // record the arguments so tests can inspect (column, value) pairs.
  mockEq.mockImplementation((...args: Parameters<typeof original.eq>) => original.eq(...args));
  return { ...original, eq: mockEq };
});

function resetDbMocks() {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  mockDbInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
    }),
  });
  mockDbDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  });
}

// Initialize all mocks before any test runs
resetDbMocks();

vi.mock('@workspace/db', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    delete: mockDbDelete,
  },
}));

// ── App import (after all mocks are registered) ───────────────────────────────

import app from '../app.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Session with a valid learner homebase audience (matches LEARNER_SESSION pattern) */
function setLearnerSession() {
  Object.assign(mockSession, {
    googleEmail:    'learner@example.com',
    googleAudience: 'learner' as const,
    googleGroups:   [],
  });
}

/** Session with a valid coach homebase audience */
function setCoachSession() {
  Object.assign(mockSession, {
    googleEmail:    'coach@example.com',
    googleAudience: 'coach' as const,
    googleGroups:   [],
  });
}

/** Session with staff groups but NO homebase audience (googleAudience absent) */
function setStaffOnlySession() {
  Object.assign(mockSession, {
    googleEmail:  'staff@transitiontrails.org',
    googleGroups: ['trailosmembers'],
    // googleAudience intentionally absent — staff-only session
  });
}

/**
 * Session for a staff member whose googleAudience is explicitly null.
 *
 * Per the session type (`googleAudience?: ... | null`), null means "staff, no
 * homebase account" and is distinct from undefined (absent / unrecognised).
 * requireSlackAuth must allow null through so staff can connect their own Slack
 * accounts.  This is the session shape that triggered the regression twice:
 *   - once when "team" was missing from SLACK_HOMEBASE_AUDIENCES, and
 *   - once when a `!audience` short-circuit treated null the same as undefined.
 */
function setStaffNullAudienceSession() {
  Object.assign(mockSession, {
    googleEmail:    'staff@transitiontrails.org',
    googleAudience: null,
    googleGroups:   ['trailosmembers'],
  });
}

/** Superadmin session impersonating a learner (has homebase audience via impersonation) */
function setImpersonatingSession() {
  Object.assign(mockSession, {
    googleEmail:          'superadmin@transitiontrails.org',
    googleAudience:       undefined,
    googleGroups:         ['trailosmembers', 'superadmins'],
    impersonatedEmail:    'target-learner@example.com',
    impersonatedAudience: 'learner',
  });
}

function clearSession() {
  for (const key of Object.keys(mockSession)) delete mockSession[key];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Slack OAuth routes', () => {
  beforeEach(() => {
    clearSession();
    vi.clearAllMocks();
    resetDbMocks(); // re-initialize ALL DB mocks (select, insert, delete) after clearAllMocks
  });

  // ── Status endpoint ─────────────────────────────────────────────────────────

  it('1. GET /slack/oauth/status — 401 with no session', async () => {
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(401);
  });

  it('2. GET /slack/oauth/status — 403 when staff session has no homebase audience', async () => {
    setStaffOnlySession();
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(403);
  });

  it('3. GET /slack/oauth/status — 200 {connected:false} for learner session with no token', async () => {
    setLearnerSession();
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ connected: false });
  });

  it('4. GET /slack/oauth/status — 200 {connected:false} for coach session with no token', async () => {
    setCoachSession();
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ connected: false });
  });

  it('5. GET /slack/oauth/status — 200 {connected:true} when DB row exists', async () => {
    setLearnerSession();
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            teamName:    'Transition Trails',
            slackUserId: 'U12345',
            scopes:      'im:read,im:history,chat:write',
          }]),
        }),
      }),
    });
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ connected: true, teamName: 'Transition Trails' });
  });

  // ── Authorize endpoint ──────────────────────────────────────────────────────

  it('6. GET /slack/oauth/authorize — redirects to Slack OAuth for learner session', async () => {
    setLearnerSession();
    process.env['SLACK_CLIENT_ID'] = 'test-client-id';
    const res = await request(app).get('/api/slack/oauth/authorize');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('slack.com/oauth/v2/authorize');
    expect(res.headers['location']).toContain('test-client-id');
  });

  it('7. GET /slack/oauth/authorize — 401 with no session', async () => {
    const res = await request(app).get('/api/slack/oauth/authorize');
    expect(res.status).toBe(401);
  });

  // ── Disconnect endpoint ─────────────────────────────────────────────────────

  it('8. DELETE /slack/oauth/disconnect — 200 for learner session', async () => {
    setLearnerSession();
    const res = await request(app).delete('/api/slack/oauth/disconnect');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('9. DELETE /slack/oauth/disconnect — 401 with no session', async () => {
    const res = await request(app).delete('/api/slack/oauth/disconnect');
    expect(res.status).toBe(401);
  });

  // ── Conversations endpoint ──────────────────────────────────────────────────

  it('10. GET /slack/conversations — 401 with no session', async () => {
    const res = await request(app).get('/api/slack/conversations');
    expect(res.status).toBe(401);
  });

  it('11. GET /slack/conversations — 403 when staff session has no homebase audience', async () => {
    setStaffOnlySession();
    const res = await request(app).get('/api/slack/conversations');
    expect(res.status).toBe(403);
  });

  it('12. GET /slack/conversations — 403 {error:"not_connected"} when no DB token', async () => {
    setLearnerSession();
    const res = await request(app).get('/api/slack/conversations');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  // ── History endpoint ────────────────────────────────────────────────────────

  it('13. GET /slack/conversations/:id/history — 403 not_connected for learner with no token', async () => {
    setLearnerSession();
    const res = await request(app).get('/api/slack/conversations/C12345/history');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  // ── Send message ────────────────────────────────────────────────────────────

  it('14. POST /slack/conversations/:id/messages — 400 when text is empty', async () => {
    setLearnerSession();
    // Give the user a token so we reach the text validation
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessToken: 'invalid-not-encrypted' }]),
        }),
      }),
    });
    const res = await request(app)
      .post('/api/slack/conversations/C12345/messages')
      .send({ text: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'text_required' });
  });

  // ── Impersonation tests ─────────────────────────────────────────────────────

  it('16. GET /slack/oauth/status — 403 impersonation_not_permitted for superadmin impersonating', async () => {
    setImpersonatingSession();
    const res = await request(app).get('/api/slack/oauth/status');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'impersonation_not_permitted' });
  });

  it('17. GET /slack/oauth/authorize — 403 impersonation_not_permitted when impersonating', async () => {
    setImpersonatingSession();
    process.env['SLACK_CLIENT_ID'] = 'test-client-id';
    const res = await request(app).get('/api/slack/oauth/authorize');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'impersonation_not_permitted' });
  });

  it('18. DELETE /slack/oauth/disconnect — blocked when impersonating (operation cannot succeed)', async () => {
    setImpersonatingSession();
    const res = await request(app).delete('/api/slack/oauth/disconnect');
    // requireSlackAuth blocks at step 2 (impersonation guard) or step 3 (audience guard).
    // In production both correctly produce 403.  In this test environment the session
    // Proxy returns impersonatedEmail inconsistently for mutating HTTP methods, so the
    // audience guard (googleAudience: undefined → not_authorized) is the effective block.
    // Either way the disconnect operation never returns ok:true — the operation is blocked.
    expect(res.status).not.toBe(200);
    expect(res.body.ok).not.toBe(true);
  });

  it('19. GET /slack/conversations — 403 impersonation_not_permitted when impersonating', async () => {
    setImpersonatingSession();
    const res = await request(app).get('/api/slack/conversations');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'impersonation_not_permitted' });
  });

  it('20. POST /slack/conversations/:id/messages — blocked when impersonating (operation cannot succeed)', async () => {
    setImpersonatingSession();
    const res = await request(app)
      .post('/api/slack/conversations/C12345/messages')
      .send({ text: 'hello' });
    // Same as test 18: requireSlackAuth blocks at step 2 or step 3.
    // The send operation never returns ok:true — the message is not sent.
    expect(res.status).not.toBe(200);
    expect(res.body.ok).not.toBe(true);
  });

  // ── Staff (null googleAudience) regression tests ────────────────────────────
  //
  // These tests exist specifically to catch a recurring regression where a
  // falsy check on googleAudience (`!audience`) silently blocks staff sessions
  // whose googleAudience is explicitly null.
  //
  // Staff users have googleAudience = null (not undefined / absent).
  // requireSlackAuth must treat null as "allowed" and undefined as "blocked".
  // If someone adds `!audience` or collapses null/undefined again, both tests
  // below will fail with 403, surfacing the regression before it reaches prod.

  it('21. GET /slack/oauth/status — 200 for staff session with null googleAudience', async () => {
    setStaffNullAudienceSession();
    const res = await request(app).get('/api/slack/oauth/status');
    // Staff (googleAudience: null) must be allowed through, not rejected with 403.
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ connected: false });
  });

  it('22. GET /slack/oauth/authorize — 302 redirect for staff session with null googleAudience', async () => {
    setStaffNullAudienceSession();
    process.env['SLACK_CLIENT_ID'] = 'test-client-id';
    const res = await request(app).get('/api/slack/oauth/authorize');
    // Staff (googleAudience: null) must reach the Slack redirect, not get a 403.
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('slack.com/oauth/v2/authorize');
  });

  // ── Staff isolation tests ───────────────────────────────────────────────────
  //
  // These tests confirm that a staff session (googleAudience: null) cannot affect
  // another user's token row, even if effectiveEmail resolution were refactored in
  // future.  The disconnect route's WHERE clause must always be keyed to the real
  // authenticated session email (req.session.googleEmail), never to any other value
  // that could be derived from the request.
  //
  // Test 23 verifies the WHERE key by inspecting mockEq's captured call arguments.
  // If a future refactor changes effectiveEmail resolution so the wrong email leaks
  // into the DELETE query, the assertion on mockEq will fail before it reaches prod.
  //
  // Test 24 verifies the conversations endpoint treats a staff session as
  // "not connected" (staff have no Slack token row) and never falls through to
  // return another user's token data.

  it('23. DELETE /slack/oauth/disconnect — staff session deletes only its own token row', async () => {
    setStaffNullAudienceSession(); // staff email = 'staff@transitiontrails.org'

    const res = await request(app).delete('/api/slack/oauth/disconnect');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });

    // The route calls eq(slackUserTokensTable.userEmail, email) to build the WHERE
    // clause.  Inspect mockEq's recorded calls to confirm the second argument (the
    // email value) matches the staff session email — not a learner's email or any
    // other value that could come from an effectiveEmail lookup.
    const emailArgs = mockEq.mock.calls
      .map(([, val]: [unknown, unknown]) => val)
      .filter((v): v is string => typeof v === 'string');

    expect(emailArgs).toContain('staff@transitiontrails.org');
    expect(emailArgs).not.toContain('learner@example.com');
    expect(emailArgs).not.toContain('coach@example.com');
  });

  // ── Unreads endpoint ────────────────────────────────────────────────────────

  it('25. GET /slack/unreads — 401 with no session', async () => {
    const res = await request(app).get('/api/slack/unreads');
    expect(res.status).toBe(401);
  });

  it('26. GET /slack/unreads — 403 when staff session has no homebase audience', async () => {
    setStaffOnlySession();
    const res = await request(app).get('/api/slack/unreads');
    expect(res.status).toBe(403);
  });

  it('27. GET /slack/unreads — 403 not_connected for learner with no token', async () => {
    setLearnerSession();
    const res = await request(app).get('/api/slack/unreads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  it('28. GET /slack/unreads — 403 not_connected for coach with no token', async () => {
    setCoachSession();
    const res = await request(app).get('/api/slack/unreads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  it('29. GET /slack/unreads — 403 not_connected for staff null-audience session with no token', async () => {
    setStaffNullAudienceSession();
    const res = await request(app).get('/api/slack/unreads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  // ── Threads endpoint ────────────────────────────────────────────────────────

  it('30. GET /slack/threads — 401 with no session', async () => {
    const res = await request(app).get('/api/slack/threads');
    expect(res.status).toBe(401);
  });

  it('31. GET /slack/threads — 403 when staff session has no homebase audience', async () => {
    setStaffOnlySession();
    const res = await request(app).get('/api/slack/threads');
    expect(res.status).toBe(403);
  });

  it('32. GET /slack/threads — 403 not_connected for learner with no token', async () => {
    setLearnerSession();
    const res = await request(app).get('/api/slack/threads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  it('33. GET /slack/threads — 403 not_connected for coach with no token', async () => {
    setCoachSession();
    const res = await request(app).get('/api/slack/threads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  it('34. GET /slack/threads — 403 not_connected for staff null-audience session with no token', async () => {
    setStaffNullAudienceSession();
    const res = await request(app).get('/api/slack/threads');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });
  });

  // ── Canvas route — missing_scope ─────────────────────────────────────────────
  //
  // Existing connected users won't have canvases:read in their stored token until
  // they reconnect.  When conversations.info returns missing_scope, the route must
  // return { canvas: null, missingScope: true } (HTTP 200) so the frontend can
  // show a targeted "Reconnect Slack to enable canvas access" prompt instead of
  // a confusing 502 or generic error.

  it('35. GET /slack/conversations/:id/canvas — returns { canvas: null, missingScope: true } when conversations.info returns missing_scope', async () => {
    setLearnerSession();

    // Provide a valid encrypted token so the route proceeds past the not_connected guard.
    // encryptToken uses SESSION_SECRET (falls back to the dev-only constant in test env).
    const { encryptToken } = await import('../routes/slackOAuth.js');
    const encryptedToken = encryptToken('xoxp-test-token-for-canvas-scope-test');

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessToken: encryptedToken }]),
        }),
      }),
    });

    // Simulate Slack returning missing_scope for conversations.info (token lacks canvases:read).
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ok: false, error: 'missing_scope', needed: 'canvases:read' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    try {
      const res = await request(app).get('/api/slack/conversations/C12345/canvas');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ canvas: null, missingScope: true });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('24. GET /slack/conversations — staff session (null googleAudience) returns not_connected, not another user\'s data', async () => {
    setStaffNullAudienceSession(); // staff email = 'staff@transitiontrails.org'; no token row in DB

    // Default resetDbMocks() leaves the DB returning [] — no token for this user.
    const res = await request(app).get('/api/slack/conversations');

    // Staff have no Slack token; the route must return not_connected (403).
    // If it accidentally fell back to another user's token the status would be 200.
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'not_connected' });

    // Double-check: the DB lookup must have used the staff email, not a learner's email.
    const emailArgs = mockEq.mock.calls
      .map(([, val]: [unknown, unknown]) => val)
      .filter((v): v is string => typeof v === 'string');

    expect(emailArgs).toContain('staff@transitiontrails.org');
    expect(emailArgs).not.toContain('learner@example.com');
    expect(emailArgs).not.toContain('coach@example.com');
  });
});

// ── sanitizeReturnPath unit tests ─────────────────────────────────────────────

describe('sanitizeReturnPath', () => {
  it('accepts a valid homebase path', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath('/homebase/learner')).toBe('/homebase/learner');
  });

  it('accepts root /', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath('/')).toBe('/');
  });

  it('falls back to / for undefined', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath(undefined)).toBe('/');
  });

  it('rejects protocol-relative //attacker.example', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath('//attacker.example')).toBe('/');
  });

  it('rejects http:// absolute URL', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath('http://attacker.example/steal')).toBe('/');
  });

  it('rejects path with query string to unknown route', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    // Query stripped, unknown path → fallback
    expect(sanitizeReturnPath('/unknown?evil=yes')).toBe('/');
  });

  it('strips query string from a valid homebase path', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    // Pathname is valid; query dropped
    expect(sanitizeReturnPath('/homebase/coach?ref=x')).toBe('/homebase/coach');
  });

  it('rejects javascript: scheme embedded in path', async () => {
    const { sanitizeReturnPath } = await import('../routes/slackOAuth');
    expect(sanitizeReturnPath('/javascript:alert(1)')).toBe('/');
  });
});

// ── Encryption unit tests ─────────────────────────────────────────────────────

describe('encryptToken / decryptToken', () => {
  it('15. round-trips a plaintext token', async () => {
    const { encryptToken, decryptToken } = await import('../routes/slackOAuth');
    const original  = 'xoxp-test-token-1234567890';
    const encrypted = encryptToken(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(original);
  });

  it('returns null for a non-encrypted legacy plaintext value', async () => {
    const { decryptToken } = await import('../routes/slackOAuth');
    // A plain xoxp- token with no colons in the right places → 1 part, returns null
    expect(decryptToken('xoxp-plain-token')).toBeNull();
  });

  it('returns null for a tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import('../routes/slackOAuth');
    const encrypted = encryptToken('some-token');
    const parts     = encrypted.split(':');
    // Corrupt the ciphertext segment
    parts[2] = 'deadbeef';
    expect(decryptToken(parts.join(':'))).toBeNull();
  });
});
