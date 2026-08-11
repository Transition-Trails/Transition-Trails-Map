/**
 * Unit tests for the LLM provider router.
 *
 * Coverage:
 *   1. LLM_PROVIDER_MAP — internal→claude; learner/coach/client/public→gemini
 *   2. callLLM dispatcher — routes to the correct adapter
 *   3. No-fallback guarantee — a Claude failure throws, never silently calls Gemini
 *   4. Response shape — provider + model fields present on success
 *
 * Both adapters are fully mocked (no live API calls).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Hoist mock functions so vi.mock factories can reference them ───────────────
const { mockCallGemini, mockCallClaude } = vi.hoisted(() => ({
  mockCallGemini: vi.fn(),
  mockCallClaude: vi.fn(),
}));

vi.mock('../lib/llm/gemini.js', () => ({ callGemini: mockCallGemini }));
vi.mock('../lib/llm/claude.js',  () => ({ callClaude: mockCallClaude }));

// Import after mocks are registered
import { callLLM, LLM_PROVIDER_MAP } from '../lib/llm/index.js';
import type { LLMRequest } from '../lib/llm/index.js';

const SAMPLE_REQUEST: LLMRequest = {
  systemPrompt: 'You are Penny.',
  history: [],
  userMessage: 'Hello Penny',
  maxOutputTokens: 512,
  temperature: 0.7,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. Provider map ────────────────────────────────────────────────────────────

describe('LLM_PROVIDER_MAP — audience routing', () => {
  test('internal routes to claude', () => {
    expect(LLM_PROVIDER_MAP['internal']).toBe('claude');
  });

  test('learner routes to gemini', () => {
    expect(LLM_PROVIDER_MAP['learner']).toBe('gemini');
  });

  test('coach routes to gemini', () => {
    expect(LLM_PROVIDER_MAP['coach']).toBe('gemini');
  });

  test('client routes to gemini', () => {
    expect(LLM_PROVIDER_MAP['client']).toBe('gemini');
  });

  test('public routes to gemini', () => {
    expect(LLM_PROVIDER_MAP['public']).toBe('gemini');
  });

  test('all non-internal audiences route to gemini', () => {
    const nonInternal = Object.entries(LLM_PROVIDER_MAP)
      .filter(([audience]) => audience !== 'internal')
      .map(([, provider]) => provider);
    expect(nonInternal.every(p => p === 'gemini')).toBe(true);
  });
});

// ── 2. callLLM dispatcher ─────────────────────────────────────────────────────

describe('callLLM dispatcher — correct adapter called', () => {
  test('provider="claude" calls callClaude, not callGemini', async () => {
    mockCallClaude.mockResolvedValueOnce({
      text: 'Hello from Claude',
      provider: 'claude',
      model: 'claude-sonnet-4-5',
    });

    await callLLM('claude', SAMPLE_REQUEST);

    expect(mockCallClaude).toHaveBeenCalledOnce();
    expect(mockCallClaude).toHaveBeenCalledWith(SAMPLE_REQUEST);
    expect(mockCallGemini).not.toHaveBeenCalled();
  });

  test('provider="gemini" calls callGemini, not callClaude', async () => {
    mockCallGemini.mockResolvedValueOnce({
      text: 'Hello from Gemini',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    });

    await callLLM('gemini', SAMPLE_REQUEST);

    expect(mockCallGemini).toHaveBeenCalledOnce();
    expect(mockCallGemini).toHaveBeenCalledWith(SAMPLE_REQUEST);
    expect(mockCallClaude).not.toHaveBeenCalled();
  });
});

// ── 3. No silent fallback ─────────────────────────────────────────────────────

describe('callLLM — no-fallback guarantee', () => {
  test('Claude adapter error propagates and does NOT fall back to Gemini', async () => {
    mockCallClaude.mockRejectedValueOnce(new Error('Claude API error: 529 Overloaded'));

    await expect(callLLM('claude', SAMPLE_REQUEST)).rejects.toThrow(
      'Claude API error: 529 Overloaded',
    );
    expect(mockCallGemini).not.toHaveBeenCalled();
  });

  test('Gemini adapter error propagates and does NOT fall back to Claude', async () => {
    mockCallGemini.mockRejectedValueOnce(new Error('Gemini API returned HTTP 503'));

    await expect(callLLM('gemini', SAMPLE_REQUEST)).rejects.toThrow(
      'Gemini API returned HTTP 503',
    );
    expect(mockCallClaude).not.toHaveBeenCalled();
  });

  test('Claude missing-key error is explicit, not swallowed', async () => {
    mockCallClaude.mockRejectedValueOnce(
      new Error('Claude is not configured. Set AI_INTEGRATIONS_ANTHROPIC_API_KEY'),
    );

    await expect(callLLM('claude', SAMPLE_REQUEST)).rejects.toThrow('Claude is not configured');
    expect(mockCallGemini).not.toHaveBeenCalled();
  });
});

// ── 4. Response shape ─────────────────────────────────────────────────────────

describe('callLLM — response includes provider and model', () => {
  test('Claude response carries provider="claude" and model name', async () => {
    mockCallClaude.mockResolvedValueOnce({
      text: 'Hi there',
      provider: 'claude' as const,
      model: 'claude-sonnet-4-5',
    });

    const result = await callLLM('claude', SAMPLE_REQUEST);

    expect(result.provider).toBe('claude');
    expect(result.model).toBe('claude-sonnet-4-5');
    expect(result.text).toBe('Hi there');
  });

  test('Gemini response carries provider="gemini" and model name', async () => {
    mockCallGemini.mockResolvedValueOnce({
      text: 'Hi there',
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash',
    });

    const result = await callLLM('gemini', SAMPLE_REQUEST);

    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.text).toBe('Hi there');
  });
});
