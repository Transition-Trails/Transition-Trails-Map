---
name: LLM provider router
description: Multi-LLM abstraction in api-server; staff→Claude, others→Gemini; how adapters are structured.
---

# LLM Provider Router

## Rule
`artifacts/api-server/src/lib/llm/` holds the provider abstraction. `LLM_PROVIDER_MAP` in `index.ts` is the single routing config — change audience→provider mapping there only.

## Why
Reduces Gemini quota consumption by routing internal staff off it. Gives a one-line escape hatch for future re-routing.

## How to apply
- Adding a new audience: add to `PennyAudience` in `pennyPromptAssembler.ts`, then add to `LLM_PROVIDER_MAP` in `llm/index.ts`.
- Changing routing: edit `LLM_PROVIDER_MAP` only.
- New provider: add adapter in `llm/<name>.ts`, extend `LLMProvider` union, add case to `callLLM` switch.

## Claude adapter
- Uses lazy-init `Anthropic` client (no import-time throw).
- Checks `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` + `AI_INTEGRATIONS_ANTHROPIC_API_KEY` first (Replit-managed proxy), then `ANTHROPIC_API_KEY` (direct key — now set as a secret).
- Model: `claude-sonnet-4-5` (confirmed working as `claude-sonnet-4-5-20250929`).
- Fails explicitly — never falls back to Gemini.

## Gemini adapter
- Extracted from inline `penny.ts` logic. Same retry/overload/timeout behaviour.
- Overload errors carry `retryable: true` on the thrown Error instance; penny.ts catches and returns 503.

## Response
- `provider` field added to `POST /api/penny/ask` JSON response — `"gemini"` or `"claude"`.
- `model` field now comes from adapter response (was hardcoded `"gemini-2.5-flash"`).
