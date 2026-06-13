---
name: Penny live API wiring
description: POST /api/penny/ask endpoint details, model choice, and billing gotcha for Gemini 2.5 Flash
---

## Rule
Use `gemini-2.5-flash` (NOT `gemini-2.0-flash`) for the Penny ask endpoint.

**Why:** `gemini-2.0-flash` returns `limit: 0` on the free tier even after billing is enabled on the GCP project. `gemini-2.5-flash` is confirmed live with `serviceTier: standard` once billing is active.

**How to apply:** `artifacts/api-server/src/routes/penny.ts` — model is set as a const. If the endpoint starts failing with quota errors, check the model string first.

## Token budget
`maxOutputTokens: 1024` minimum. Gemini 2.5 Flash uses reasoning/thinking tokens before producing output — a 20-token budget produces no visible text (all goes to `thoughtsTokenCount`).

## Endpoint
- Route: `POST /api/penny/ask`
- File: `artifacts/api-server/src/routes/penny.ts`
- Registered in: `artifacts/api-server/src/routes/index.ts`
- System prompt: Transition Trails Academy context — RESOLVE phases, programs, learners, Salesforce, Slack, Knowledge

## Frontend
- `PagePennyGuide.tsx` — `handleAsk()` is async, calls `/api/penny/ask`
- States: `loading` (spinner in send button + "Penny is thinking…" bubble), `isError` (amber bubble), success (violet bubble)
- Clear button resets both `response` and `isError`

## Billing note
Google AI Studio free-tier keys may show `limit: 0` for `generate_content_free_tier_*` metrics even after billing is enabled. Fix: generate a new key from the same project in AI Studio after billing is linked — or verify `serviceTier: standard` appears in the response `usageMetadata`.
