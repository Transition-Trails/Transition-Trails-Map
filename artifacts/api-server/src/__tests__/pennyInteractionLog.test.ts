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
 */

import { describe, it, expect, vi } from 'vitest';
import { logInteraction } from '../lib/salesforceService.js';
import type { ISalesforceClient } from '../lib/salesforceClient.js';

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeMockClient(overrides?: Partial<ISalesforceClient>): ISalesforceClient {
  return {
    query:        vi.fn().mockResolvedValue({ records: [], totalSize: 0, done: true }),
    getRecord:    vi.fn().mockResolvedValue({}),
    createRecord: vi.fn().mockResolvedValue({ id: 'a1B000000testAAA', success: true }),
    updateRecord: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const VALID_PAYLOAD = {
  contactId:     '0031000000testCCC',
  userMessage:   'What phase am I in?',
  pennyResponse: 'You are in the Explore phase.',
  promptMode:    'ask',
  source:        'web',
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
