/**
 * LLM provider dispatcher.
 *
 * The single config constant LLM_PROVIDER_MAP controls which audience maps
 * to which provider.  Changing a routing decision is a one-line edit here;
 * no route or adapter code needs to change.
 *
 * Current routing:
 *   internal  → Claude  (reduces Gemini quota consumption for staff)
 *   learner   → Gemini  (no behaviour change from before)
 *   coach     → Gemini
 *   client    → Gemini
 *   public    → Gemini
 */

import type { PennyAudience } from '../pennyPromptAssembler.js';
import type { LLMRequest, LLMResponse, LLMProvider } from './types.js';
import { callGemini } from './gemini.js';
import { callClaude } from './claude.js';

export type { LLMRequest, LLMResponse, LLMProvider };

// ── Audience → provider routing table ────────────────────────────────────────
//
// To re-route an audience, change its value here.
// To add a new audience, add it here before using it in the route.
//
export const LLM_PROVIDER_MAP: Record<PennyAudience, LLMProvider> = {
  internal:  'claude',
  learner:   'gemini',
  coach:     'gemini',
  client:    'gemini',
  public:    'gemini',
};

/**
 * Dispatch an LLM request to the correct provider adapter.
 *
 * Throws on any error — never silently falls back to another provider.
 * The `provider` field in the returned LLMResponse can be logged and
 * surfaced in analytics to distinguish which model handled each exchange.
 */
export async function callLLM(
  provider: LLMProvider,
  request:  LLMRequest,
): Promise<LLMResponse> {
  switch (provider) {
    case 'claude':
      return callClaude(request);
    case 'gemini':
      return callGemini(request);
    default: {
      // TypeScript exhaustiveness guard
      const _never: never = provider;
      throw new Error(`Unknown LLM provider: ${String(_never)}`);
    }
  }
}
