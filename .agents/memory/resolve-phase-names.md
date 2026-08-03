---
name: RESOLVE phase names
description: The canonical 7 RESOLVE phase names — old names that were retired and must never be reintroduced.
---

## Canonical 7-phase RESOLVE sequence

| Letter | Phase    | Replaces    |
|--------|----------|-------------|
| R      | Recognize | (unchanged) |
| E      | Explore   | Evaluate    |
| S      | Select    | Solve       |
| O      | Outline   | Organize    |
| L      | Launch    | Leverage    |
| V      | Verify    | (unchanged) |
| E      | Evolve    | (unchanged) |

**Execute was removed entirely.** It was never a valid phase; functionality merged into Launch and Verify.

**Why:** The Master RESOLVE Methodology Handbook uses these exact names. The old names (Evaluate, Solve, Organize, Leverage, Execute) were provisional placeholders from early development.

**How to apply:** Any new signal text, curriculum phase tag, capability badge, graph node, or admin copy that mentions a RESOLVE phase must use the 7 names above. Never introduce the old names again.

## Files that encode phase names (check these when adding new RESOLVE references)
- `src/data/resolvePhases.ts` — canonical phase objects
- `src/data/programs.ts` — `resolvePhases` arrays on each program
- `src/data/knowledgeGraphData.ts` — node IDs are `resolve-<lowercase-name>`
- `src/data/trailOsCapabilities.ts` — `resolve` arrays
- `src/data/curriculumData.ts` — `resolvePhase` field on sprint records
- `src/pages/curriculum/CurriculumSprints.tsx` — `RESOLVE_COLORS` map (must cover all 7)
- `src/components/layout/PagePennyGuide.tsx` — signal text strings
