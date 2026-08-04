---
name: Penny SF Write Health
description: Root cause, fix, and ongoing pattern for Penny_Interaction_Log__c write failures and the write-health monitor.
---

## The bug

`Penny_Interaction_Log__c.Source__c` is a **restricted picklist** in the Salesforce org.
Permitted values: `dashboard`, `slack_dm`, `slack_mention`, `mobile`.

The code originally wrote `"web"` — not a permitted value.  Salesforce silently rejected every insert.
Zero interaction records were ever written.  The fire-and-forget design meant the failure appeared only in
server logs, never surfaced to a user or admin.

**Root cause confirmed by live describe on 2026-08-04.**

## The fix

- `source: "web"` → `source: "dashboard"` in `artifacts/api-server/src/routes/penny.ts`
- `SfInteractionSource` union type added to `artifacts/api-server/src/types/salesforce.ts`:
  `'dashboard' | 'slack_dm' | 'slack_mention' | 'mobile'`
- `promptMode: "ask"` (hardcoded) replaced with `derivePromptMode(hasLearnerCtx, hasMemory)` in the same route
- `pennyData.ts` POST /learner/:contactId/interactions validates the `source` field against `SF_INTERACTION_SOURCES` before writing; returns 400 on invalid value
- `sfWriteHealth.ts` in-process store: `recordSfWriteAttempt / recordSfWriteSuccess / recordSfWriteFailure`
- `GET /api/penny/write-health` endpoint exposes the store to the admin UI
- `PennyCommandCenter.tsx` fetches write health on mount; shows failure in "Needs attention" + detail card

## Test blind spot (documented in test file)

The mock-based test suite (`pennyInteractionLog.test.ts`) accepts any string value for `Source__c`.
It cannot catch a schema violation against the real SF org.
A picklist conformance test now asserts the written value is in `SF_INTERACTION_SOURCES`.
This catches regressions but does NOT replace a live describe call when the permitted values change.

## Audit result

The `source: "web"` bug was the ONLY hardcoded literal being written to a restricted SF picklist.
All other `createRecord`/`updateRecord` calls in routes pass caller-supplied values from request bodies.
Those are a separate risk (no input validation), not the same class of hardcoded bug.

## How to apply

Any time a new SF field of type restricted picklist is added to a write path:
1. Run a live describe to confirm the permitted values
2. Add a union type to `types/salesforce.ts`
3. Validate caller-provided values before the write (400 on invalid)
4. Add a conformance test asserting the written value is in the permitted list
5. Never hardcode the value in the route — derive it from request context

**Why:** SF silently discards inserts with invalid restricted picklist values. The fire-and-forget
design means the failure is invisible unless the write-health monitor catches it.
