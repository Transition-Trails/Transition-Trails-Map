# Paste-ready prompt for the Replit agent

Attach **both** files to the message:

- `TOS-CON-01 - resolvePhases.ts`
- `TOS-CON-01 - RESOLVE seven phases.md`

Then paste the text below.

---

RESOLVE is currently defined with eight phases in this codebase. That is wrong — the source
methodology has seven. I'm attaching a changeset note and a replacement data file.

Please make exactly these changes and nothing else:

1. Replace the entire contents of `artifacts/program-map/src/data/resolvePhases.ts` with the
   attached `TOS-CON-01 - resolvePhases.ts`, verbatim. Do not rewrite, summarize, reformat or
   "improve" any of the phase content — the text in that file comes from our source handbook and
   must land exactly as written. Keep the file's own header comment.

2. Apply the rename map in the attached markdown note to these five files:
   - `src/data/programs.ts` — five `resolvePhases` string arrays, de-duplicate after renaming
   - `src/data/knowledgeGraphData.ts` — rename four node labels, delete the `Execute` node and
     re-point any edges that pointed at it to `Launch`
   - `src/data/curriculumData.ts` — two `resolvePhase` tags
   - `src/pages/ResolveDemand.tsx` — the phase-name strings in the demand mappings and work items
   - `src/pages/curriculum/CurriculumSprints.tsx` — the phase color map keys

   The map is: Evaluate → Explore, Solve → Select, Organize → Outline, Leverage → Launch,
   Execute → removed (folds into Launch). Recognize, Verify and Evolve are unchanged.

3. In `src/pages/ResolveDemand.tsx`, the `phaseColors` map is keyed by phase id. Rekey it to the
   seven new ids so no phase renders unstyled. Assign colors from the existing palette in that
   file — do not introduce new colors.

4. Also in `src/pages/ResolveDemand.tsx`: four work items have `owner: 'Source mapping needed'`.
   That placeholder is rendered in the UI. Change those to an empty string.

Then run a typecheck and tell me what broke. Do not change any styling, do not touch any other
file, and do not add new features.

---

## After it runs — check these

- `/resolve` renders seven phases, not eight, and every chip is styled
- No phase detail shows "Source mapping needed" anywhere
- The program cards show renamed phases with no duplicates
- The knowledge graph has no orphaned edge where `Execute` used to be
