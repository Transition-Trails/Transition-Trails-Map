import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatSyncAge } from '../hooks/useSfOpsSummary.js';

const NOW = new Date('2026-06-13T12:00:00.000Z');

describe('formatSyncAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns "just now" for timestamps less than 1 minute ago', () => {
    const ts = new Date(NOW.getTime() - 30_000).toISOString();
    expect(formatSyncAge(ts)).toBe('just now');
  });

  test('returns "just now" for timestamps 59 seconds ago', () => {
    const ts = new Date(NOW.getTime() - 59_000).toISOString();
    expect(formatSyncAge(ts)).toBe('just now');
  });

  test('returns "1m ago" for exactly 1 minute ago', () => {
    const ts = new Date(NOW.getTime() - 60_000).toISOString();
    expect(formatSyncAge(ts)).toBe('1m ago');
  });

  test('returns "5m ago" for 5 minutes ago', () => {
    const ts = new Date(NOW.getTime() - 5 * 60_000).toISOString();
    expect(formatSyncAge(ts)).toBe('5m ago');
  });

  test('returns "59m ago" for 59 minutes ago', () => {
    const ts = new Date(NOW.getTime() - 59 * 60_000).toISOString();
    expect(formatSyncAge(ts)).toBe('59m ago');
  });

  test('returns "1h ago" for exactly 1 hour ago', () => {
    const ts = new Date(NOW.getTime() - 60 * 60_000).toISOString();
    expect(formatSyncAge(ts)).toBe('1h ago');
  });

  test('returns "2h ago" for 2 hours ago', () => {
    const ts = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString();
    expect(formatSyncAge(ts)).toBe('2h ago');
  });
});
