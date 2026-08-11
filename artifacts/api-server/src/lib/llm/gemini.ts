/**
 * Gemini adapter for the LLM provider abstraction.
 *
 * Extracted from the inline fetch block previously in penny.ts.
 * Behaviour is identical: same model, same retry/back-off logic,
 * same overload detection, same 30 s timeout.
 */

import type { LLMRequest, LLMResponse } from './types.js';
import { logger } from '../logger.js';

const GEMINI_MODEL     = 'gemini-2.5-flash';
const MAX_ATTEMPTS     = 3;
const REQUEST_TIMEOUT  = 30_000;

/** True when the Gemini response signals a transient overload. */
function isOverloaded(status: number, msg: string): boolean {
  return (
    status === 503 ||
    status === 429 ||
    /high demand|overload|resource.has.been.exhausted|quota/i.test(msg)
  );
}

/**
 * Call Gemini 2.5 Flash with automatic overload retries.
 *
 * Throws an Error on:
 *  - Missing GEMINI_API_KEY
 *  - All retry attempts exhausted (overload)
 *  - Non-retryable API error
 *  - Empty response text
 *  - Network / timeout error
 */
export async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in Replit Secrets.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const contents = [
    ...req.history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user' as const, parts: [{ text: req.userMessage }] },
  ];

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: req.systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: req.maxOutputTokens ?? 4096,
      temperature:     req.temperature     ?? 0.7,
    },
  });

  let lastStatus = 502;
  let lastErrMsg = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      // Exponential back-off: 1 s → 2 s
      await new Promise(r => setTimeout(r, (attempt - 1) * 1_000));
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
    } catch (e) {
      // Network / timeout — re-throw immediately (no retry benefit)
      throw e;
    }

    if (resp.ok) {
      const data = await resp.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error('Penny returned an empty response. Try rephrasing your question.');
      }
      return { text, provider: 'gemini', model: GEMINI_MODEL };
    }

    const errBody = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    lastStatus  = resp.status;
    lastErrMsg  = errBody.error?.message ?? `Gemini API returned HTTP ${resp.status}`;

    if (!isOverloaded(resp.status, lastErrMsg)) {
      // Non-retryable
      throw new Error(lastErrMsg);
    }

    logger.warn({ attempt, lastStatus, lastErrMsg }, 'Gemini overloaded — retrying');
    // Loop and retry
  }

  // All attempts hit overload
  logger.error({ lastStatus, lastErrMsg }, 'Gemini overload — all retry attempts exhausted');
  const overloadErr = new Error(
    'Penny is temporarily busy due to high demand. Please try again in a moment.',
  ) as Error & { retryable?: boolean };
  overloadErr.retryable = true;
  throw overloadErr;
}
