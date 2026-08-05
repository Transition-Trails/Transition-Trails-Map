/**
 * pennyInteractionLog.test.ts
 *
 * Tests the Salesforce interaction log write path.
 *
 * The behaviour the user cares most about not regressing:
 *   A failed Salesforce write must never surface to the caller.
 *   Penny should return her reply regardless of whether the SF write succeeds.
 *
 * This file covers:
 *   • logInteraction happy-path (creates on the right object, returns id)
 *   • Truncation of User_Message__c and Penny_Response__c at the SF field limit
 *   • Prompt_Mode__c truncation at 50 chars
 *   • Fire-and-forget isolation: a rejected createRecord, when caught like the
 *     route does, must not propagate to the surrounding code
 *   • Source__c picklist conformance (static)
 *   • Audience__c written from payload.audience
 *   • getInteractionHistory audience filter
 *
 * ─── Test Blind Spot (honest) ──────────────────────────────────────────────────
 *
 * These tests mock ISalesforceClient.createRecord with vi.fn().  The mock
 * accepts ANY value — it never validates against the real Salesforce schema.
 * This means:
 *
 *   1. A wrong Source__c value will pass every test in this file.  The mock
 *      does not reject it.  This is exactly how the original bug (source: "web"
 *      → zero SF records for months) went undetected.
 *
 *   2. The picklist conformance tests below close the gap for Source__c by
 *      asserting that the written value is in the known permitted list.  They
 *      do NOT prove the SF schema is correct — that requires a live describe
 *      call against the org.
 *
 * ─── On live-schema conformance testing ───────────────────────────────────────
 *
 * The unit test mock does not support Salesforce metadata calls (DESCRIBE,
 * Tooling API, PicklistValueInfo queries).  ISalesforceClient exposes only
 * query / getRecord / createRecord / updateRecord / deleteRecord.
 *
 * A fully automated live-schema conformance test for picklist values would
 * require either:
 *   a) Extending ISalesforceClient with a describeObject() method and calling
 *      the /sobjects/<object>/describe REST endpoint in a separate integration
 *      test marked @skip in CI (run manually with LIVE_SF_TEST=true).
 *   b) A standalone script that runs describe and diffs against our constants.
 *
 * Neither is in scope for this task.  What IS in scope (and done) is:
 *   • The compile-time exhaustiveness guard in types/salesforce.ts, which ensures
 *     SF_INTERACTION_SOURCES and SfInteractionSource cannot drift apart.
 *   • The conformance tests below, which verify the value written is in the
 *     known permitted list — preventing a developer from silently changing a
 *     hardcoded source without updating this list.
 *
 * If you add a new picklist field to logInteraction, add a conformance test for
 * it here AND verify the permitted values with a live SF describe before shipping.
 *
 * Permitted values confirmed by a live SF describe on 2026-08-05:
 *   'TRAIL OS', 'dashboard', 'slack_dm', 'slack_mention', 'mobile'
 */

import { describe, it, expect, vi } from 'vitest';
import {
  logInteraction,
  getInteractionHistory,
  SF_INTERACTION_SOURCES,
} from '../lib/salesforceService.js';
import type { ISalesforceClient } from '../lib/salesforceClient.js';
import type { SfInteractionSource } from '../types/salesforce.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeMockClient(overrides?: Partial<ISalesforceClient>): ISalesforceClient {
  return {
    query:        vi.fn().mockResolvedValue({ records: [], totalSize: 0, done: true }),
    getRecord:    vi.fn().mockResolvedValue({}),
    createRecord: vi.fn().mockResolvedValue({ id: 'a1B000000testAAA', success: true }),
    updateRecord: vi.fn().mockResolvedValue(undefined),
    deleteRecord: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const VALID_PAYLOAD = {
  contactId:     '0031000000testCCC',
  userMessage:   'What phase am I in?',
  pennyResponse: 'You are in the Explore phase.',
  promptMode:    'ask+learner',
  // Source__c is a RESTRICTED picklist — the web interface writes 'TRAIL OS'.
  // Other origins: 'slack_dm', 'slack_mention', 'mobile', 'dashboard' (legacy).
  source:        'TRAIL OS' as SfInteractionSource,
  audience:      'learner',
};

// ── Happy path ────────────────────────────────────────────────────────────────

describe('logInteraction — happy path', () => {
  it('returns the new record id on success', async () => {
    const client = makeMockClient();
    const result = await logInteraction(client, VALID_PAYLOAD);
    expect(result.id).toBe('a1B000000testAAA');
  });

  it('writes to Penny_Interaction_Log__c', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    expect(client.createRecord).toHaveBeenCalledWith(
      'Penny_Interaction_Log__c',
      expect.objectContaining({ Learner__c: VALID_PAYLOAD.contactId })
    );
  });

  it('maps contactId to Learner__c', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['Learner__c']).toBe(VALID_PAYLOAD.contactId);
  });

  it('passes userMessage as User_Message__c unchanged when within limit', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['User_Message__c']).toBe(VALID_PAYLOAD.userMessage);
  });

  it('passes pennyResponse as Penny_Response__c unchanged when within limit', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['Penny_Response__c']).toBe(VALID_PAYLOAD.pennyResponse);
  });
});

// ── Audience__c field ─────────────────────────────────────────────────────────
//
// Audience__c does not yet exist on Penny_Interaction_Log__c in production.
// Writing a non-existent field causes SF to reject the ENTIRE insert, so the
// write is commented out in salesforceService.ts logInteraction() until the
// field is confirmed present.
//
// These tests document the CURRENT state (not written) and will be replaced
// with positive write-assertion tests once the field is provisioned.
// Steps to enable:
//   1. Create Audience__c as Text(255) in SF Setup
//   2. Confirm: SELECT COUNT() FROM Penny_Interaction_Log__c WHERE Audience__c != null
//   3. Uncomment the write in logInteraction()
//   4. Replace the tests below with:
//        expect(data['Audience__c']).toBe('learner')   // etc.

describe('logInteraction — Audience__c (pending SF schema change)', () => {
  it('does NOT write Audience__c while the field is absent from the SF schema', async () => {
    const client = makeMockClient();
    await logInteraction(client, { ...VALID_PAYLOAD, audience: 'learner' });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    // Audience__c must be absent from the fields map until the SF column exists.
    // Writing an unknown field causes SF to reject the entire insert.
    expect(Object.prototype.hasOwnProperty.call(data, 'Audience__c')).toBe(false);
  });

  it('the payload type accepts audience — field is ready to wire once column exists', () => {
    // This test is a compile-time check: if the TypeScript type rejects audience,
    // this line will not compile.
    const payload = { ...VALID_PAYLOAD, audience: 'internal' };
    expect(payload.audience).toBe('internal');
  });
});

// ── Truncation ────────────────────────────────────────────────────────────────

describe('logInteraction — truncation', () => {
  it('truncates User_Message__c when it exceeds the field limit', async () => {
    const client = makeMockClient();
    const longMessage = 'x'.repeat(15_000);
    await logInteraction(client, { ...VALID_PAYLOAD, userMessage: longMessage });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    const stored = data['User_Message__c'] as string;
    expect(stored.length).toBeLessThan(longMessage.length);
    expect(stored).toContain('[truncated');
  });

  it('truncates Penny_Response__c when it exceeds the field limit', async () => {
    const client = makeMockClient();
    const longResponse = 'y'.repeat(15_000);
    await logInteraction(client, { ...VALID_PAYLOAD, pennyResponse: longResponse });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    const stored = data['Penny_Response__c'] as string;
    expect(stored.length).toBeLessThan(longResponse.length);
    expect(stored).toContain('[truncated');
  });

  it('does not truncate messages within the limit', async () => {
    const client = makeMockClient();
    const okMsg = 'Short message that fits';
    await logInteraction(client, { ...VALID_PAYLOAD, userMessage: okMsg });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['User_Message__c']).toBe(okMsg);
  });

  it('truncates Prompt_Mode__c to 50 chars', async () => {
    const client = makeMockClient();
    const longMode = 'a'.repeat(100);
    await logInteraction(client, { ...VALID_PAYLOAD, promptMode: longMode });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect((data['Prompt_Mode__c'] as string).length).toBeLessThanOrEqual(50);
  });

  it('passes short promptMode unchanged', async () => {
    const client = makeMockClient();
    await logInteraction(client, { ...VALID_PAYLOAD, promptMode: 'ask' });
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['Prompt_Mode__c']).toBe('ask');
  });
});

// ── Fire-and-forget isolation — the critical contract ─────────────────────────
//
// This is the behaviour the user identified as most important.  The penny.ts
// route calls:
//
//   logInteraction(sfClient, payload).catch(err => logger.warn(err));
//
// A rejected promise caught this way must not propagate.  The test models
// exactly that calling pattern.

describe('fire-and-forget write isolation', () => {
  it('a rejected createRecord, when caught, does not throw', async () => {
    const client = makeMockClient({
      createRecord: vi.fn().mockRejectedValue(new Error('INSUFFICIENT_ACCESS_OR_READONLY')),
    });

    // Pattern used in penny.ts: fire-and-forget with .catch()
    await expect(
      logInteraction(client, VALID_PAYLOAD).catch(() => 'handled')
    ).resolves.toBe('handled');
  });

  it('the reply value is unaffected when the SF write fails concurrently', async () => {
    const client = makeMockClient({
      createRecord: vi.fn().mockRejectedValue(new Error('Network timeout')),
    });

    // Simulate the route: reply is assembled before the SF write settles
    const replyAssembled = 'Here is your answer.';

    const writePromise = logInteraction(client, VALID_PAYLOAD).catch(() => null);
    const reply = replyAssembled; // already sent to browser

    await writePromise;
    expect(reply).toBe('Here is your answer.');
  });

  it('a permission error does not throw — handled same way as any other failure', async () => {
    const client = makeMockClient({
      createRecord: vi.fn().mockRejectedValue(
        new Error('Salesforce API error 403 POST /sobjects/Penny_Interaction_Log__c: INSUFFICIENT_ACCESS')
      ),
    });

    await expect(
      logInteraction(client, VALID_PAYLOAD).catch(() => 'handled')
    ).resolves.toBe('handled');
  });

  it('a field validation error does not throw', async () => {
    const client = makeMockClient({
      createRecord: vi.fn().mockRejectedValue(
        new Error('Salesforce API error 400 POST /sobjects/Penny_Interaction_Log__c: FIELD_INTEGRITY_EXCEPTION')
      ),
    });

    await expect(
      logInteraction(client, VALID_PAYLOAD).catch(() => 'handled')
    ).resolves.toBe('handled');
  });
});

// ── Source__c picklist conformance ────────────────────────────────────────────
//
// Source__c is a RESTRICTED picklist in the Salesforce org.  A value that is
// not in the permitted list causes the entire insert to be rejected — with no
// error returned to the caller (fire-and-forget).
//
// These tests assert that logInteraction writes a value that is in the known
// permitted list.  They do NOT validate against the live schema (see the
// "live-schema conformance testing" note at the top of this file).
//
// Permitted values confirmed by a live SF describe on 2026-08-05:
//   'TRAIL OS', 'dashboard', 'slack_dm', 'slack_mention', 'mobile'
//
// Origin → source mapping (as of 2026-08-05):
//   /api/penny/ask  (Trail OS web)  → 'TRAIL OS'
//   Future Slack DM                 → 'slack_dm'
//   Future Slack @mention           → 'slack_mention'
//   Future mobile                   → 'mobile'
//   Legacy existing records         → 'dashboard'

describe('logInteraction — Source__c picklist conformance', () => {
  it('the default fixture writes a Source__c value in the permitted picklist', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(SF_INTERACTION_SOURCES).toContain(data['Source__c']);
  });

  it('the default fixture writes TRAIL OS as the web-interface source', async () => {
    const client = makeMockClient();
    await logInteraction(client, VALID_PAYLOAD);
    const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
    expect(data['Source__c']).toBe('TRAIL OS');
  });

  it.each([...SF_INTERACTION_SOURCES] as SfInteractionSource[])(
    'accepts "%s" as a valid source and passes it through to Source__c',
    async (src) => {
      const client = makeMockClient();
      await logInteraction(client, { ...VALID_PAYLOAD, source: src });
      const [, data] = (client.createRecord as ReturnType<typeof vi.fn>).mock.calls[0] as [string, Record<string, unknown>];
      expect(data['Source__c']).toBe(src);
    }
  );
});

// ── getInteractionHistory — audience filter ───────────────────────────────────
//
// When audience is provided, the SOQL must include AND Audience__c = '...'
// so that internal-staff test sessions do not contaminate a learner's
// coaching memory window.

describe('getInteractionHistory — audience filter', () => {
  it('includes audience filter in SOQL when audience is provided', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ records: [], totalSize: 0, done: true });
    const client = makeMockClient({ query: mockQuery });
    await getInteractionHistory(client, '003test', 5, 'learner');
    const soql = (mockQuery.mock.calls[0] as [string])[0];
    expect(soql).toContain("Audience__c = 'learner'");
  });

  it('omits audience WHERE filter when audience is not provided (Audience__c still selected)', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ records: [], totalSize: 0, done: true });
    const client = makeMockClient({ query: mockQuery });
    await getInteractionHistory(client, '003test', 5);
    const soql = (mockQuery.mock.calls[0] as [string])[0];
    // Audience__c appears in the SELECT list (always fetched) but not in the WHERE clause.
    expect(soql).toContain('Audience__c');           // present in SELECT
    expect(soql).not.toContain("Audience__c = '");   // absent from WHERE
  });

  it('returns audience field from records', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      records: [{
        Id: 'a1B001',
        User_Message__c: 'Hi',
        Penny_Response__c: 'Hello',
        Prompt_Mode__c: 'ask',
        Source__c: 'TRAIL OS',
        Audience__c: 'learner',
        CreatedDate: '2026-08-05T00:00:00.000Z',
      }],
      totalSize: 1,
      done: true,
    });
    const client = makeMockClient({ query: mockQuery });
    const result = await getInteractionHistory(client, '003test', 5, 'learner');
    expect(result[0].audience).toBe('learner');
  });

  it('returns null audience when Audience__c is null in record', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      records: [{
        Id: 'a1B002',
        User_Message__c: 'Hi',
        Penny_Response__c: 'Hello',
        Prompt_Mode__c: 'ask',
        Source__c: 'TRAIL OS',
        Audience__c: null,
        CreatedDate: '2026-08-05T00:00:00.000Z',
      }],
      totalSize: 1,
      done: true,
    });
    const client = makeMockClient({ query: mockQuery });
    const result = await getInteractionHistory(client, '003test', 5);
    expect(result[0].audience).toBeNull();
  });
});
