/**
 * Shared types for the LLM provider abstraction.
 *
 * Every provider adapter accepts an LLMRequest and returns an LLMResponse.
 * The callLLM dispatcher selects the adapter based on the provider name.
 */

export type LLMProvider = 'gemini' | 'claude';

/**
 * A single turn in the conversation history.
 * Uses Gemini-style role names ('user' | 'model'); each adapter maps to its
 * own convention internally (Claude maps 'model' → 'assistant').
 */
export interface LLMHistoryItem {
  role: 'user' | 'model';
  text: string;
}

/**
 * The canonical input shape passed to every provider adapter.
 * Adapters are responsible for mapping these fields to their own API shapes.
 */
export interface LLMRequest {
  /** The assembled system prompt (all seven layers). */
  systemPrompt: string;
  /** Prior conversation turns, oldest first. */
  history: LLMHistoryItem[];
  /** The current user message (may include page context prefix). */
  userMessage: string;
  /** Maximum tokens to generate. Adapter applies its own default if absent. */
  maxOutputTokens?: number;
  /** Sampling temperature. Adapter applies its own default if absent. */
  temperature?: number;
}

/**
 * What every provider adapter must return on success.
 * Throw an Error on failure — never return a partial/empty response.
 */
export interface LLMResponse {
  /** The model's reply text. */
  text: string;
  /** Which provider generated this response. */
  provider: LLMProvider;
  /** Exact model identifier used (e.g. "gemini-2.5-flash", "claude-sonnet-4-5"). */
  model: string;
}
