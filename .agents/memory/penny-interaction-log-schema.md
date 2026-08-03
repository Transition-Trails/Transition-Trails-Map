---
name: Penny_Interaction_Log__c schema
description: Confirmed field list and constraints for the SF interaction log object; key blocker for internal-staff logging.
---

# Penny_Interaction_Log__c — Confirmed Schema

Described via `/sobjects/Penny_Interaction_Log__c/describe` against production org (v62.0).

## Custom fields (5 total)

| API Name | Type | Length | Nillable |
|---|---|---|---|
| Learner__c | reference → Contact | 18 | **FALSE — required** |
| User_Message__c | textarea | 32 768 | true |
| Penny_Response__c | textarea | 32 768 | true |
| Prompt_Mode__c | string | 50 | true |
| Source__c | picklist | 255 | true |

## Missing fields (metadata not in schema)
- No field for Gemini model used
- No field for response latency
- No field for prompt layers present
- No field for audience identity
- No field for user tier

These go to the local DB (`pennyLogsTable`) which has no such constraint.

## Critical constraint
`Learner__c` is NOT nillable. Records cannot be created without a resolved Contact.
Internal-staff exchanges (no sfContactId) are written only to the local DB.
To allow unrelated records, the SF admin must make `Learner__c` nillable.

## Truncation
`logInteraction` applies `SF_TEXTAREA_LIMIT = 10_000` chars to User_Message__c and
Penny_Response__c with a `[truncated — full text in local DB]` marker.
Prompt_Mode__c is sliced to 50 chars (field hard limit).

**Why:** Prevents silent data corruption at the SF hard limit of 32 768 chars and
gives anyone reading the SF record a clear signal the value was intentionally cut.

**How to apply:** If new text fields are added to the object, apply `truncateSf()`
from `salesforceService.ts` before writing them.

## Permission error logging
The SF write uses a fire-and-forget `.catch()`.  If the error message contains
`INSUFFICIENT_ACCESS`, `FIELD_INTEGRITY_EXCEPTION`, or `Required fields are missing`,
the catch handler logs at `logger.error` (not `warn`) with the object name so a
permission-denied failure is immediately visible after an integration-user switch.
