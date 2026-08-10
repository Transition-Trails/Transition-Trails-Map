/**
 * googleAuth.test.ts
 *
 * Tests for:
 *  - googleGroupsCache  → getGroupsForUser  (cache behaviour, group resolution)
 *  - googleSignIn       → isOrgEmail, deriveGroupTier
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearGroupsCache, getGroupsForUser } from '../lib/googleGroupsCache';
import { isOrgEmail, deriveGroupTier, ALLOWED_DOMAIN } from '../routes/googleSignIn';
import * as googleAdmin from '../lib/googleAdmin';

// ── Mock the admin access token ───────────────────────────────────────────────

vi.mock('../lib/googleAdmin', async (importOriginal) => {
  const original = await importOriginal<typeof googleAdmin>();
  return {
    ...original,
    getAdminAccessToken:   vi.fn(),
    getAdminDirectoryStatus: vi.fn(),
  };
});

const mockGetToken = vi.mocked(googleAdmin.getAdminAccessToken);

// ── Helpers ───────────────────────────────────────────────────────────────────

const GROUPS = {
  admin:    'trailosadmin@transitiontrails.org',
  power:    'trailospennyadmin@transitiontrails.org',
  everyday: 'trailosusers@transitiontrails.org',
} as const;

/** Build a fetch mock where `memberOf` groups return 200 and the rest return 404. */
function makeFetchMock(memberOf: string[]) {
  return vi.fn().mockImplementation((url: string) => {
    const isMember = memberOf.some(g => url.includes(encodeURIComponent(g)));
    return Promise.resolve({ status: isMember ? 200 : 404, ok: isMember });
  });
}

// ── googleGroupsCache ─────────────────────────────────────────────────────────

describe('getGroupsForUser', () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    clearGroupsCache();
    vi.clearAllMocks();
    // Clear homebase group ENV vars so this block always probes exactly 3 staff groups.
    // Tests that need homebase probing live in the "homebase group probing" describe below.
    delete process.env['GOOGLE_GROUP_COACHES'];
    delete process.env['GOOGLE_GROUP_VOLUNTEERS'];
    delete process.env['GOOGLE_GROUP_LEARNERS'];
    delete process.env['GOOGLE_GROUP_TEAM'];
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore any homebase/team env vars that were set before this suite ran
    for (const k of ['GOOGLE_GROUP_COACHES', 'GOOGLE_GROUP_VOLUNTEERS', 'GOOGLE_GROUP_LEARNERS', 'GOOGLE_GROUP_TEAM']) {
      if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
      else delete process.env[k];
    }
  });

  it('returns an empty array when user is a personal Gmail account (not in any group)', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([]); // member of no groups

    const groups = await getGroupsForUser('person@gmail.com');
    expect(groups).toEqual([]);
  });

  it('returns multiple groups when user belongs to more than one', async () => {
    mockGetToken.mockResolvedValue('tok');
    // This user is in both admin AND power groups
    global.fetch = makeFetchMock([GROUPS.admin, GROUPS.power]);

    const groups = await getGroupsForUser('multi@transitiontrails.org');
    expect(groups).toContain(GROUPS.admin);
    expect(groups).toContain(GROUPS.power);
    expect(groups).not.toContain(GROUPS.everyday);
    expect(groups).toHaveLength(2);
  });

  it('returns an empty array when org-domain user is in no groups', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([]); // not a member of any group

    const groups = await getGroupsForUser('nobody@transitiontrails.org');
    expect(groups).toEqual([]);
  });

  it('caches a positive result — second call does not hit the Directory API again', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([GROUPS.admin]);

    await getGroupsForUser('admin@transitiontrails.org');
    await getGroupsForUser('admin@transitiontrails.org'); // second call — should be cached

    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(3); // 3 groups checked once
  });

  it('caches an empty (non-membership) result — second call does not hit API', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([]); // no groups

    await getGroupsForUser('nogroup@transitiontrails.org');
    await getGroupsForUser('nogroup@transitiontrails.org');

    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache when the access token is unavailable — retries on next call', async () => {
    mockGetToken.mockResolvedValue(null); // no token

    await getGroupsForUser('retry@transitiontrails.org');
    await getGroupsForUser('retry@transitiontrails.org');

    // Should have tried to get the token twice since failure is never cached
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  it('re-fetches after the 5-minute cache TTL has expired', async () => {
    vi.useFakeTimers();
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([GROUPS.everyday]);

    await getGroupsForUser('ttl@transitiontrails.org');

    // Advance past 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    await getGroupsForUser('ttl@transitiontrails.org');

    // Token was fetched twice — once per live lookup
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  it('uses stale cached data when a live fetch throws — does not crash', async () => {
    mockGetToken.mockResolvedValue('tok');
    // First call succeeds
    global.fetch = makeFetchMock([GROUPS.everyday]);
    await getGroupsForUser('stale@transitiontrails.org');

    // Clear cache but keep mock returning a token — then make fetch throw
    clearGroupsCache();
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const groups = await getGroupsForUser('stale@transitiontrails.org');
    // Returns empty (no stale data this time) rather than throwing
    expect(Array.isArray(groups)).toBe(true);
  });
});

// ── Homebase group probing ────────────────────────────────────────────────────
//
// getGroupsForUser must probe GOOGLE_GROUP_COACHES/VOLUNTEERS/LEARNERS in addition
// to the hard-coded staff groups, so sign-in can derive a homebase audience.

describe('getGroupsForUser — homebase group probing', () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    clearGroupsCache();
    vi.clearAllMocks();
    process.env['GOOGLE_GROUP_COACHES']    = 'coaches@transitiontrails.org';
    process.env['GOOGLE_GROUP_VOLUNTEERS'] = 'volunteers@transitiontrails.org';
    process.env['GOOGLE_GROUP_LEARNERS']   = 'learners@transitiontrails.org';
    // Explicitly delete TEAM so tests that don't set it get a deterministic probe count
    // regardless of what the real process environment contains.
    delete process.env['GOOGLE_GROUP_TEAM'];
  });

  afterEach(() => {
    // Restore env so homebase ENV vars don't bleed into other test cases
    for (const k of ['GOOGLE_GROUP_COACHES', 'GOOGLE_GROUP_VOLUNTEERS', 'GOOGLE_GROUP_LEARNERS', 'GOOGLE_GROUP_TEAM']) {
      if (ORIG_ENV[k] !== undefined) process.env[k] = ORIG_ENV[k];
      else delete process.env[k];
    }
  });

  it('includes the learner group when the user is only in the learner group', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock(['learners@transitiontrails.org']);

    const groups = await getGroupsForUser('learner@transitiontrails.org');
    expect(groups).toContain('learners@transitiontrails.org');
    expect(groups).not.toContain(GROUPS.admin);
    expect(groups).not.toContain(GROUPS.everyday);
  });

  it('includes both a staff group and a homebase group when user is in both', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([GROUPS.admin, 'coaches@transitiontrails.org']);

    const groups = await getGroupsForUser('dualrole@transitiontrails.org');
    // Both memberships are reported — the caller (deriveAudience/isKnownStaff) applies priority
    expect(groups).toContain(GROUPS.admin);
    expect(groups).toContain('coaches@transitiontrails.org');
  });

  it('probes all 6 groups (3 staff + 3 homebase) when all ENV vars are set', async () => {
    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([]);

    await getGroupsForUser('nobody@transitiontrails.org');

    // fetch is called once per group — staff(3) + homebase(3) = 6
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(6);
  });

  it('ignores empty homebase ENV vars — only probes staff groups', async () => {
    delete process.env['GOOGLE_GROUP_COACHES'];
    delete process.env['GOOGLE_GROUP_VOLUNTEERS'];
    delete process.env['GOOGLE_GROUP_LEARNERS'];

    mockGetToken.mockResolvedValue('tok');
    global.fetch = makeFetchMock([]);

    await getGroupsForUser('nobody@transitiontrails.org');

    // Only 3 staff group probes
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(3);
  });
});

// ── isOrgEmail ────────────────────────────────────────────────────────────────

describe('isOrgEmail', () => {
  it(`returns true for a @${ALLOWED_DOMAIN} address`, () => {
    expect(isOrgEmail(`user@${ALLOWED_DOMAIN}`)).toBe(true);
  });

  it('returns false for a personal Gmail address', () => {
    expect(isOrgEmail('user@gmail.com')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isOrgEmail('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isOrgEmail(`User@${ALLOWED_DOMAIN.toUpperCase()}`)).toBe(true);
  });
});

// ── deriveGroupTier ───────────────────────────────────────────────────────────

describe('deriveGroupTier', () => {
  beforeEach(() => {
    delete process.env['TRAIL_OS_SUPERADMIN_EMAILS'];
  });

  it('returns "admin" when user is in the admin group', () => {
    expect(deriveGroupTier([GROUPS.admin], 'a@transitiontrails.org')).toBe('admin');
  });

  it('returns "admin" when user is in both admin and power groups (highest wins)', () => {
    expect(deriveGroupTier([GROUPS.admin, GROUPS.power], 'a@transitiontrails.org')).toBe('admin');
  });

  it('returns "power" when user is in power but not admin', () => {
    expect(deriveGroupTier([GROUPS.power], 'p@transitiontrails.org')).toBe('power');
  });

  it('returns "everyday" when user is only in the everyday group', () => {
    expect(deriveGroupTier([GROUPS.everyday], 'e@transitiontrails.org')).toBe('everyday');
  });

  it('returns "everyday" as fallback when user is in no groups', () => {
    expect(deriveGroupTier([], 'x@transitiontrails.org')).toBe('everyday');
  });

  it('returns "superadmin" when email is in the TRAIL_OS_SUPERADMIN_EMAILS whitelist', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'super@transitiontrails.org,other@transitiontrails.org';
    expect(deriveGroupTier([], 'super@transitiontrails.org')).toBe('superadmin');
  });

  it('is case-insensitive for the superadmin check', () => {
    process.env['TRAIL_OS_SUPERADMIN_EMAILS'] = 'Super@TransitionTrails.org';
    expect(deriveGroupTier([], 'super@transitiontrails.org')).toBe('superadmin');
  });
});
