/**
 * pennyContactResolver.test.ts
 *
 * Tests the Contact resolution logic used to associate every Penny exchange
 * with a Salesforce Contact record, including the critical fallback:
 *   learner Contact → preferred when present
 *   staff user's own Contact → used when no learner Contact is in play
 *
 * Also tests cache behaviour (positive hits cached, null misses cached,
 * query failures NOT cached so the next request retries).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveContactByEmail,
  resolveExchangeContact,
  clearContactCache,
  _contactCache,
  CACHE_TTL_MS,
} from '../lib/pennyContactResolver.js';
import type { ISalesforceClient } from '../lib/salesforceClient.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeMockClient(contactId: string | null = 'c001'): ISalesforceClient {
  const records = contactId ? [{ Id: contactId }] : [];
  return {
    query:        vi.fn().mockResolvedValue({ records, totalSize: records.length, done: true }),
    getRecord:    vi.fn().mockResolvedValue({}),
    createRecord: vi.fn().mockResolvedValue({ id: 'x', success: true }),
    updateRecord: vi.fn().mockResolvedValue(undefined),
    deleteRecord: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  clearContactCache();
});

// ── resolveExchangeContact — the critical resolution contract ─────────────────

describe('resolveExchangeContact — resolution priority', () => {
  it('returns the learner Contact immediately when one is already resolved', async () => {
    const client = makeMockClient('staff-c001');
    const result = await resolveExchangeContact(client, 'learner-c001', 'staff@example.com');
    // Learner Contact takes priority — SF is never called
    expect(result).toBe('learner-c001');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('resolves the staff user Contact via email when no learner Contact is present', async () => {
    const client = makeMockClient('staff-c001');
    const result = await resolveExchangeContact(client, null, 'angela@transitiontrails.org');
    expect(result).toBe('staff-c001');
    expect(client.query).toHaveBeenCalledOnce();
  });

  it('returns null when no learner Contact and no email are provided', async () => {
    const client = makeMockClient('staff-c001');
    const result = await resolveExchangeContact(client, null, null);
    expect(result).toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('returns null when no learner Contact and email is an empty string', async () => {
    const client = makeMockClient('staff-c001');
    const result = await resolveExchangeContact(client, null, '');
    expect(result).toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('returns null when no learner Contact and email is whitespace only', async () => {
    const client = makeMockClient('staff-c001');
    const result = await resolveExchangeContact(client, null, '   ');
    expect(result).toBeNull();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('returns null when no Contact matches the email', async () => {
    const client = makeMockClient(null); // no Contact in org
    const result = await resolveExchangeContact(client, null, 'unknown@example.com');
    expect(result).toBeNull();
  });
});

// ── resolveContactByEmail — lookup and cache behaviour ────────────────────────

describe('resolveContactByEmail — successful lookup', () => {
  it('returns the Contact ID when a matching Contact exists', async () => {
    const client = makeMockClient('c001');
    const id = await resolveContactByEmail(client, 'user@example.com');
    expect(id).toBe('c001');
  });

  it('returns null when no Contact matches the email', async () => {
    const client = makeMockClient(null);
    const id = await resolveContactByEmail(client, 'nobody@example.com');
    expect(id).toBeNull();
  });

  it('escapes single quotes in the email before querying', async () => {
    const client = makeMockClient('c001');
    await resolveContactByEmail(client, "o'brien@example.com");
    const soql = (client.query as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(soql).not.toContain("o'brien");
    expect(soql).toContain("o\\'brien");
  });
});

describe('resolveContactByEmail — caching', () => {
  it('caches a positive result and does not call SF on the second request', async () => {
    const client = makeMockClient('c001');
    const first  = await resolveContactByEmail(client, 'user@example.com');
    const second = await resolveContactByEmail(client, 'user@example.com');
    expect(first).toBe('c001');
    expect(second).toBe('c001');
    expect(client.query).toHaveBeenCalledOnce();
  });

  it('caches a null result so repeated misses do not flood SF', async () => {
    const client = makeMockClient(null);
    await resolveContactByEmail(client, 'unknown@example.com');
    await resolveContactByEmail(client, 'unknown@example.com');
    expect(client.query).toHaveBeenCalledOnce();
  });

  it('re-queries after the TTL has expired', async () => {
    const client = makeMockClient('c001');
    await resolveContactByEmail(client, 'user@example.com');

    // Backdate the cache entry so it looks expired
    const entry = _contactCache.get('user@example.com')!;
    _contactCache.set('user@example.com', { ...entry, resolvedAt: Date.now() - CACHE_TTL_MS - 1 });

    await resolveContactByEmail(client, 'user@example.com');
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it('does NOT cache a query failure — retries on the next request', async () => {
    const failingClient: ISalesforceClient = {
      query:        vi.fn().mockRejectedValue(new Error('Network timeout')),
      getRecord:    vi.fn().mockResolvedValue({}),
      createRecord: vi.fn().mockResolvedValue({ id: 'x', success: true }),
      updateRecord: vi.fn().mockResolvedValue(undefined),
      deleteRecord: vi.fn().mockResolvedValue(undefined),
    };
    await resolveContactByEmail(failingClient, 'user@example.com');
    await resolveContactByEmail(failingClient, 'user@example.com');
    // Both attempts hit SF because the failure was not cached
    expect(failingClient.query).toHaveBeenCalledTimes(2);
  });

  it('returns null on a query failure without throwing', async () => {
    const failingClient: ISalesforceClient = {
      query:        vi.fn().mockRejectedValue(new Error('SF unavailable')),
      getRecord:    vi.fn().mockResolvedValue({}),
      createRecord: vi.fn().mockResolvedValue({ id: 'x', success: true }),
      updateRecord: vi.fn().mockResolvedValue(undefined),
      deleteRecord: vi.fn().mockResolvedValue(undefined),
    };
    const result = await resolveContactByEmail(failingClient, 'user@example.com');
    expect(result).toBeNull();
  });
});

describe('clearContactCache', () => {
  it('forces a re-query after the cache is cleared', async () => {
    const client = makeMockClient('c001');
    await resolveContactByEmail(client, 'user@example.com');
    clearContactCache();
    await resolveContactByEmail(client, 'user@example.com');
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
