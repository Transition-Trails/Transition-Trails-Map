/**
 * Claude adapter for the LLM provider abstraction.
 *
 * Uses the Replit-managed Anthropic AI integration when
 * AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY are
 * present, and falls back to a direct ANTHROPIC_API_KEY when those are absent.
 *
 * Implemented via direct fetch (not the Anthropic SDK) so that tests can
 * intercept calls with vi.stubGlobal('fetch', ...) and the adapter stays
 * dependency-light.
 *
 * Errors are always thrown as Error instances with clear messages so the
 * penny.ts route can return an explicit 503 instead of silently retrying
 * on Gemini (per task spec: "fail explicitly, no silent fallback").
 */

import type { LLMRequest, LLMResponse } from './types.js';

const CLAUDE_MODEL    = 'claude-sonnet-4-5';
const REQUEST_TIMEOUT = 30_000;

interface AnthropicErrorBody {
  error?: { type?: string; message?: string };
}

interface AnthropicSuccessBody {
  content?: Array<{ type: string; text?: string }>;
  model?: string;
}

/**
 * Call claude-sonnet-4-5 via the Anthropic Messages API.
 *
 * Maps the shared LLMRequest into Anthropic's shape:
 *  - history role 'model' → 'assistant'
 *  - systemPrompt → top-level system field
 *  - userMessage appended as the final 'user' message
 *
 * Throws an Error on any failure — never silently degrades.
 * Error instances carry extra properties so penny.ts can choose the right
 * HTTP status code:
 *   { code: 'NOT_CONFIGURED' }  → 503, user-legible, no retryable field
 *   { retryable: true }         → 503 with retryable: true
 *   { timedOut: true }          → 503 with timeout message + retryable: true
 */
export async function callClaude(req: LLMRequest): Promise<LLMResponse> {
  const baseURL = process.env['AI_INTEGRATIONS_ANTHROPIC_BASE_URL'] ?? 'https://api.anthropic.com';
  const apiKey  =
    process.env['AI_INTEGRATIONS_ANTHROPIC_API_KEY'] ??
    process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    throw Object.assign(
      new Error(
        'Penny is not available for staff right now — the AI provider is not configured. ' +
        'Contact your system administrator.',
      ),
      { code: 'NOT_CONFIGURED' },
    );
  }

  // Map history to Anthropic's role convention
  const messages = [
    ...req.history.map(h => ({
      role:    h.role === 'model' ? 'assistant' : 'user',
      content: h.text,
    })),
    { role: 'user', content: req.userMessage },
  ];

  let resp: Response;
  try {
    resp = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: req.maxOutputTokens ?? 8192,
        system:     req.systemPrompt,
        messages,
        temperature: req.temperature ?? 0.7,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
  } catch (e: unknown) {
    const isTimeout = e instanceof Error && e.name === 'TimeoutError';
    throw Object.assign(
      new Error(
        isTimeout
          ? 'Claude request timed out after 30s'
          : `Claude request failed: ${e instanceof Error ? e.message : String(e)}`,
      ),
      { retryable: true, timedOut: isTimeout },
    );
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as AnthropicErrorBody;
    const errType = body?.error?.type ?? 'unknown';
    throw Object.assign(
      new Error(`Claude API returned ${resp.status} (${errType})`),
      { retryable: true },
    );
  }

  const data = await resp.json() as AnthropicSuccessBody;
  const text  = (data.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw Object.assign(
      new Error('Claude returned an empty response. Try rephrasing your question.'),
      { retryable: true },
    );
  }

  return { text, provider: 'claude', model: CLAUDE_MODEL };
}
