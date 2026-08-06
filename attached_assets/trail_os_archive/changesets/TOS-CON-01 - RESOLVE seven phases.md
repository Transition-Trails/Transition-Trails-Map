# TOS-CON-01 — RESOLVE, seven phases

**Status:** ready to apply · **Blast radius:** 7 files · **Type:** content, not styling

---

## The ruling

Settled by source, not preference.

`The Master R.E.S.O.L.V.E. Methodology Handbook`, section 3, is titled **"The 7 Phases of
R.E.S.O.L.V.E."** and its table of contents lists them explicitly:

> Phase R: Recognize · Phase E: Explore · Phase S: Select · Phase O: Outline ·
> Phase L: Launch · Phase V: Verify · Phase E: Evolve

Section 2, the Cross-Role Alignment Matrix, gives the same seven with per-role actions, and
opens with "how each role executes across all seven stages."

Trail OS defines **eight**: Recognize · Evaluate · Solve · Organize · Leverage · Verify ·
Execute · Evolve. Four of those names appear nowhere in the Handbook. The eight-phase version
was reconstructed from the acronym letters — a plausible expansion of R-E-S-O-L-V-E that
happens not to be the real one. Its own source notes admit this: every phase carries
"Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping,"
and the Execute phase is flagged `needs-review` with a note questioning whether it is a
distinct phase at all.

**The Handbook and the Master Program Guide are authoritative. Trail OS gets rewritten.**

---

## Rename map

| Trail OS today | Becomes | Note |
|---|---|---|
| Recognize | **Recognize** | unchanged |
| Evaluate | **Explore** | Evaluate was described as a strategic gate; Explore is the divergent mapping and option-generation phase. Closest semantic match. |
| Solve | **Select** | Solve was "design the solution", which in the Handbook splits across Select (commit, with trade-offs) and Outline (decompose). Maps to Select. |
| Organize | **Outline** | Organize structured delivery; Outline decomposes into stories and blueprints. |
| Leverage | **Launch** | Leverage was active delivery; Launch is deployment and pilot. |
| Verify | **Verify** | unchanged |
| Execute | *(removed)* | No Handbook equivalent. Its "steady-state operation" content folds into Launch. Its own source note already questioned whether it was real. |
| Evolve | **Evolve** | unchanged |

---

## Files to change

### 1. `src/data/resolvePhases.ts` — replace wholesale

Use `changesets/TOS-CON-01 - resolvePhases.ts` as-is. Seven phases, every field populated
from the Handbook, `ResolvePhase` interface unchanged so consumers keep compiling.

Two things worth noting in the replacement:

- **No "Source mapping needed" remains.** Six of the eight old phases carried that placeholder
  in `inputs`, `outputs`, `owner` and `implications`, and those fields render in the app.
- **`outputs` now names the Handbook's own deliverable** for each phase — Automation Opportunity
  Snapshot, Shadow System Inventory, Co-Design Admin Decision Log, Plain-Language Improvement
  Brief, Repository Deployment Playbook, UAT Execution Scorecard, System Evolution and
  Governance Log. That gives Trail OS a real artefact per phase instead of a description of one,
  and it lines the phases up with the ten artefact types in the coach rubric.

### 2. `src/data/programs.ts` — five `resolvePhases` arrays

Apply the rename map, then de-duplicate. Current values reference `Evaluate`, `Solve`,
`Organize` and `Leverage` across five programs.

### 3. `src/data/knowledgeGraphData.ts` — five node labels

Nodes labeled `Evaluate`, `Solve`, `Organize`, `Leverage` and `Execute`. Rename four; delete
the `Execute` node and re-point any edges into it at `Launch`.

### 4. `src/data/curriculumData.ts` — two module tags

`resolvePhase: 'Evaluate'` → `'Explore'`, `resolvePhase: 'Solve'` → `'Select'`.

### 5. `src/pages/ResolveDemand.tsx` — three separate problems

- The `phaseColors` map is keyed by phase id. Keys for the removed phases go stale silently and
  the four new ids get no entry, so those chips render unstyled. Rekey to the seven.
- The demand mappings and work items carry phase names as strings (`'Evaluate'`, `'Organize'`,
  `'Leverage'`, `'Solve'`). Apply the rename map.
- **Separate finding:** four work items have `owner: 'Source mapping needed'`. That string is
  rendered. Fill or blank it.

### 6. `src/pages/curriculum/CurriculumSprints.tsx` — color map keyed by phase name

Same stale-key problem as ResolveDemand. Rekey.

### 7. `src/pages/admin/Phase1CompletionAudit.tsx` — one note

`resolvePhases.ts` is classified `demo-ok` with the note "Mirrors real TT program framework —
not synthetic." That was not true. After this changeset it is, so the note can stay — but it is
worth knowing the audit page asserted fidelity that had not been checked.

---

## Sequencing

Independent of all design-system work. Nothing here touches styling, so it can run before,
after or alongside the token layer.

Do it before anything else that reads RESOLVE, because Penny's RAG corpus and the Trail Quest
content both draw on these phases — and Penny is the thing that teaches the methodology to
learners.

## Open question this raises

The old data linked each phase to Penny capabilities (`Trail Guide`, `Build Companion`,
`Quest Master`, `Learning Coach`, `Exam Coach`, `Career Translator`, `Coach Intelligence
Layer`) and to Trail OS capabilities. Those links are carried forward on a best-fit basis in
the replacement file. They should be reviewed by whoever owns Penny's capability registry —
they were mapped against phases that no longer exist.
