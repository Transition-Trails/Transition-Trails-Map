---
name: Program Penny config pattern
description: How pennyStatus is DB-backed per program with 3-state model; hook, API, and backward-compat pattern.
---

# Program Penny Config

## The rule
`pennyStatus: 'Active' | 'Planned' | 'Not Planned'` is the authoritative field, stored in `program_penny_configs` table. The legacy `pennyActive: boolean` is kept as a derived field (`pennyStatus === 'Active'`) for backward compat with `useHealthScores`, `ProgramOverview`, and other boolean consumers — do not remove it.

**Why:** `pennyActive` had no nuance — programs in planning were treated the same as programs that had explicitly opted out. Three states let ops distinguish "we haven't decided yet" from "definitely not planned".

**How to apply:**
- DB table: `lib/db/src/schema/programPennyConfigs.ts` — `programId` text PK, `status` text (enum enforced at API layer), `notes`, `updatedAt`.
- API: `GET /api/programs/:id/penny-config` returns row or default `{ status: 'Not Planned' }`; `PATCH` upserts via `onConflictDoUpdate`. Both endpoints accept any programId (static slug or 18-char Salesforce Id).
- Hook: `useProgramPennyConfig(programId, initialStatus?)` in `src/hooks/useProgramPennyConfig.ts` — fetches DB on mount, exposes `setStatus()` which PATCHes API and calls `updateProgram()` to sync AppContext. Handles component unmount with `mounted` ref.
- UI: 3-way pill selector in `ProgramWorkspace.tsx` `PennyTab` replaces the old binary toggle. Spinner shown during save.
- When adding new static programs to `programs.ts`, always include `pennyStatus` explicitly; the type now requires it.
- SF programs mapped in `AppContext.tsx` `mapSfToProgram` default to `pennyStatus: 'Not Planned'` and are overridden by the DB fetch on first open of their ProgramWorkspace.
