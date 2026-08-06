# Coach and Learner views — design brief

**Status:** not started. Deferred until the current Trail OS work is finished.
**Driver:** Guided Trail Cohort 1 — the views need to exist for them.

---

## Decided

**Where they live.** Inside Trail OS, as a Coach view and a Learner view, with permissions driven by
Google Groups membership — the same mechanism already assigning access tiers.

This settles the question the review raised as TOS-DOC-09. The Penny six-pager described an
Experience Cloud learner surface; the Trail OS specification listed a learner portal under non-goals
as "a different product". Neither is now correct. Trail OS is both the control room and the front of
house, with the views gated by group.

**Two consequences to action:**
- The specification's non-goals entry for a public-facing learner portal must be corrected.
- The Google Groups mapping needs two more groups, or a rethink of the existing three. Today the
  three groups map to Everyday, Power and Admin. Coach and Learner are not tiers in that ladder —
  a learner is not simply "less" than a coach, they are a different product surface. This is worth
  designing deliberately rather than extending the tier enum.

**Devices.** Desktop first for both. Phone for checking progress only — not for doing the work.

**Squad visibility.** A coach sees everything. Small organization, no need to partition.

**Penny for coaches: Penny drafts, the coach approves.** This is the strongest single answer in the
brief and it should shape the whole coach view. Penny is not an assistant a coach consults — she
produces a draft the coach accepts, edits or rejects. That gives the coach view a natural spine:
a queue of things Penny has prepared, awaiting judgment.

## The jobs

**A coach, weekly:**
- Issue verdicts on artefacts — pass, needs rework, not attempted
- See which learners are stuck before they say so
- Review Decision Log entries
- Run the weekly squad session
- Move work through the RESOLVE phases

**A learner, weekly:**
- See what is due and what is next
- Submit an artefact for a verdict
- Write Decision Log entries
- Ask Penny when stuck
- Work through their current RESOLVE phase
- See their own rework curve and progress
- Coordinate with their buddy or squad

Note how well these two lists interlock. Every learner action has a coach counterpart, and the
verdict sits at the join. That is the axis the design should be built on rather than treating the two
views as separate products that happen to share data.

## Open — to be designed, not assumed

**How the three coach levels differ.** Coach's Assistant, Associate Coach, Advanced Coach. Not yet
decided whether that is the same screens with different permissions, genuinely different screens, or
the same screens with verdicts weighted or reviewed by level. This is the item Kim's measurement
dashboard has been waiting on, and it resolves here rather than before.

The Assistant's first real assignment — filling an odd-numbered squad as a buddy pair or rotating
trio — is a strong clue. An Assistant is doing a learner's work and a coach's work at once, which
argues for a distinct screen rather than a permission difference.

**Where the verdict is issued.** Undecided whether the coach issues verdicts inside the view, or
whether the view surfaces verdicts recorded in Salesforce or the LMS. This determines whether the
coach view is a system of record or a lens. Worth settling early — it is the difference between
designing a form and designing a dashboard.

**Whether learners see each other's verdicts.** Cuts both ways and needs thought. Buddy testing
requires some visibility by construction, since a learner tests a peer's work. Rework curves are far
more sensitive — that is the measure of someone's judgment over time, and it is the thing most
likely to feel like a ranking.

Worth considering a split: artefacts and test reports visible to the buddy by necessity; the rework
curve private to the learner and their coach.

## Approach agreed

Explore a few directions for the main screen before committing.

## What to read first when this starts

- `Guided Trail - Coach Rubric.dc.html` — ten artefact types, three verdicts per criterion, the
  rework curve as the measure
- `Guided Trail - Program Design v0.1.dc.html` — squads, buddy pairs, coach-mediated delivery
- `Explorers Trail - Membership Design v0.1.dc.html` — the coaching ladder
- `changesets/TOS-CON-01 - resolvePhases.ts` — the seven phases and their real deliverables, which
  are the artefacts a learner produces and a coach judges
- `changesets/TOS-DOC-06 - Trail OS UX Standards (brand-aligned).md` — anything new is born aligned
