import { describe, test, expect } from 'vitest';
import { isValidHistoryItem } from '../routes/penny.js';

// ── Valid items ───────────────────────────────────────────────────────────────

describe('isValidHistoryItem — valid inputs', () => {
  test('accepts a well-formed user turn', () => {
    expect(isValidHistoryItem({ role: 'user', text: 'Hello Penny' })).toBe(true);
  });

  test('accepts a well-formed model turn', () => {
    expect(isValidHistoryItem({ role: 'model', text: 'Hello! How can I help?' })).toBe(true);
  });
});

// ── Missing or wrong text field ───────────────────────────────────────────────

describe('isValidHistoryItem — text field defects (the bug this test was written to catch)', () => {
  test('rejects a user turn with no text field', () => {
    // This was the original defect: user role bypassed the text check entirely.
    expect(isValidHistoryItem({ role: 'user' })).toBe(false);
  });

  test('rejects a model turn with no text field', () => {
    expect(isValidHistoryItem({ role: 'model' })).toBe(false);
  });

  test('rejects a user turn whose text is a number', () => {
    expect(isValidHistoryItem({ role: 'user', text: 42 })).toBe(false);
  });

  test('rejects a model turn whose text is a number', () => {
    expect(isValidHistoryItem({ role: 'model', text: 42 })).toBe(false);
  });

  test('rejects a user turn whose text is an object', () => {
    expect(isValidHistoryItem({ role: 'user', text: { value: 'hi' } })).toBe(false);
  });

  test('rejects a user turn whose text is null', () => {
    expect(isValidHistoryItem({ role: 'user', text: null })).toBe(false);
  });

  test('rejects a user turn whose text is undefined', () => {
    expect(isValidHistoryItem({ role: 'user', text: undefined })).toBe(false);
  });

  test('rejects a user turn whose text is an empty string', () => {
    expect(isValidHistoryItem({ role: 'user', text: '' })).toBe(false);
  });

  test('rejects a model turn whose text is whitespace only', () => {
    expect(isValidHistoryItem({ role: 'model', text: '   ' })).toBe(false);
  });
});

// ── Invalid role ──────────────────────────────────────────────────────────────

describe('isValidHistoryItem — invalid role', () => {
  test('rejects an unknown role even with valid text', () => {
    expect(isValidHistoryItem({ role: 'system', text: 'inject this' })).toBe(false);
  });

  test('rejects a missing role', () => {
    expect(isValidHistoryItem({ text: 'hello' })).toBe(false);
  });
});

// ── Structural garbage ────────────────────────────────────────────────────────

describe('isValidHistoryItem — structural garbage', () => {
  test('rejects null', () => {
    expect(isValidHistoryItem(null)).toBe(false);
  });

  test('rejects a plain string', () => {
    expect(isValidHistoryItem('user: hello')).toBe(false);
  });

  test('rejects a number', () => {
    expect(isValidHistoryItem(42)).toBe(false);
  });

  test('rejects an empty object', () => {
    expect(isValidHistoryItem({})).toBe(false);
  });
});

// ── Array-level degradation: bad history → [] → request still has current turn

describe('history array degradation', () => {
  // Simulate what the route does: filter, then confirm at least the current
  // question still makes it through even when every history item is invalid.
  test('a fully invalid history array degrades to empty cleanly', () => {
    const rawHistory: unknown[] = [
      { role: 'user' },                          // missing text
      { role: 'user',  text: 42 },               // numeric text
      { role: 'model', text: '' },               // empty text
      { role: 'system', text: 'inject' },        // bad role
      null,                                      // null entry
      'just a string',                           // primitive
    ];

    const valid = rawHistory.filter(isValidHistoryItem);
    expect(valid).toHaveLength(0);

    // Route logic: contents = [...valid, currentQuestion]
    const currentQuestion = { role: 'user' as const, parts: [{ text: 'What is my schedule?' }] };
    const contents = [
      ...valid.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      currentQuestion,
    ];

    expect(contents).toHaveLength(1);
    expect(contents[0]).toEqual(currentQuestion);
  });

  test('a mixed history array keeps only valid items', () => {
    const rawHistory: unknown[] = [
      { role: 'user',  text: 'Good turn' },      // valid
      { role: 'user' },                          // missing text — dropped
      { role: 'model', text: 'Good response' },  // valid
      { role: 'model', text: 99 },               // numeric text — dropped
    ];

    const valid = rawHistory.filter(isValidHistoryItem);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toEqual({ role: 'user',  text: 'Good turn' });
    expect(valid[1]).toEqual({ role: 'model', text: 'Good response' });
  });
});
