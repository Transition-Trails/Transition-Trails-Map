repo: Transition-Trails/Transition-Trails-Map
branch: main
path: artifacts/program-map

Secondary repo (earlier work this project): Transition-Trails/TT-Public-Website @ main,
path artifacts/transition-trails — the public marketing site, fully aligned and launched July 2026.

Notes: the GitHub org `Transition-Trails` has 5 repos — Daybook, TT_Salesforce_Devops,
TT-Public-Website (public marketing site, Vite + React + wouter + Tailwind, monorepo at
`artifacts/transition-trails`), Transition-Trails-Map (Trail OS monorepo), Penny-POC (private).
The public site also runs in Replit as app "Transition Trails Public Site"; Trail OS as "TRAIL OS".
Site content is data-driven from `src/content/*.json` — copy fixes mostly land there, not in JSX.

## Last sync
date: 2026-08-03T14:13:57Z
tree: 2a99ea557f2b

### Updated in this project
- **Trail OS review started** (Transition-Trails-Map, `artifacts/program-map`). Built
  `Trail OS Review - Design System and Documentation.dc.html` — 26 findings: 12 blockers,
  11 rulings, 3 cleanup, across design system (12), documentation (8) and content/methodology (6).
- Headline design-system findings: no TTDS tokens imported (palette hand-derived as HSL in
  `index.css`); Inter + Playfair Display loaded, zero brand faces; primary resolves to #31724C vs
  Trail Green #2F6B3F, secondary #20646F vs Deep Teal #2F6F7E, body text #303541 (cool) vs
  Slate #4A4F4D (warm); cards beige-on-beige; radius roughly half the brand scale; 1px focus ring;
  UI type at 8–11px against a 14px brand floor; ~1,500 stock-Tailwind color class strings across
  six non-brand hues in `src/pages` alone; amber doing four jobs at once.
- Headline content finding: **RESOLVE diverges**. `resolvePhases.ts` defines eight phases
  (Recognize · Evaluate · Solve · Organize · Leverage · Verify · Execute · Evolve); the Master
  Program Guide defines seven (Recognize · Explore · Select · Outline · Launch · Verify · Evolve).
  Six of eight carry "Source mapping needed" placeholders that render in the app; Execute is
  flagged needs-review with a note questioning whether it is a real phase.
- Also: coach ladder (Assistant / Associate / Advanced) has no representation in Trail OS access
  tiers — the open coach-calibration item lands here; README contradicts replit.md on six live
  integrations; replit.md's nav table does not match `Sidebar.tsx`; index.html still ships
  "Program Map Dashboard — built on Replit" placeholder metadata; no data dictionary for the
  33 files in `src/data`; no design documentation; no glossary tied to the Master Program Guide.
- No code copied from the repo. Nothing applied to Trail OS yet — awaiting five rulings.

### Applied to Trail OS this session (via Replit connector, app "TRAIL OS")
- **TOS-CON-01 — RESOLVE corrected to seven phases.** Ruling settled by source, not preference:
  `RESOLVE_Handbook_Master.docx` section 3 is titled "The 7 Phases of R.E.S.O.L.V.E." and lists
  Recognize · Explore · Select · Outline · Launch · Verify · Evolve. Trail OS's eight-phase version
  was reverse-engineered from the acronym letters; four of its names appear nowhere in the source,
  and its own source notes admitted "phase details require source mapping".
  Rename map applied: Evaluate → Explore, Solve → Select, Organize → Outline, Leverage → Launch,
  Execute → removed (folds into Launch). Recognize / Verify / Evolve unchanged.
  All "Source mapping needed" placeholders replaced with Handbook content; `outputs` now names the
  Handbook's own deliverable per phase (Automation Opportunity Snapshot, Shadow System Inventory,
  Co-Design Admin Decision Log, Plain-Language Improvement Brief, Repository Deployment Playbook,
  UAT Execution Scorecard, System Evolution and Governance Log) — which lines the phases up with
  the ten artefact types in the coach rubric. All seven marked `confirmed`.
  Touched: resolvePhases.ts, programs.ts, knowledgeGraphData.ts, curriculumData.ts,
  trailOsCapabilities.ts, ResolveDemand.tsx, CurriculumSprints.tsx, SlackContextPanel.tsx.
  Typecheck clean. Changeset also written to `changesets/TOS-CON-01 - *`.
- Known residue, deliberately left: "Evaluate"/"Execute" survive in `demandStages.ts` as plain
  English verbs in prose, not phase labels. Penny capability links were mapped against phases that
  no longer exist and were carried forward on best fit — the capability registry owner should review.
- **TOS-DS-01/02/03/04/05/08/09/10 — token layer applied.** Brand palette from the design system
  (Trail Green #2F6B3F, Deep Teal #2F6F7E, Sky #7FAFC6 / tint #EDF5F8, Sun Amber #F5A623, neutrals
  Trail Light / Warm Gray / Slate / Charcoal, plus the green and amber ramps) defined once as the
  source of truth with the existing theme variables aliased to it. Inter and Playfair Display
  replaced with Poppins (headings) and Open Sans (body/UI). Brand radius (8/14/22/pill), 3px Trail
  Green focus ring at 15%, brand card and soft shadows, 3px card lift on hover. Cards moved from
  beige to white with the Sky tint for nested surfaces. Dark theme deliberately untouched.
- **TOS-DS-06/07 — status colors collapsed.** Six non-brand hues (emerald, sky, violet, indigo,
  rose, amber) replaced by one shared status system with five roles: success (Trail Green),
  information (Deep Teal), attention (Amber 700 text on Amber 100 — never a mid-amber fill),
  critical (new functional red #A93F2F on tint #FBEAE6), neutral (Warm Gray / Slate).
  270 of 272 source files converted, typecheck clean. Program color-coding removed; person-type
  color-coding removed. Program map keeps differentiation using five brand values (Sun Amber
  swapped for green-300, since amber is reserved for the single CTA).
  Gmail's own logo stays red by decision — third-party brand mark, not our status system.

### Rulings taken this session
- **RESOLVE**: the Handbook and Master Program Guide are authoritative; Trail OS was rewritten.
- **Fraunces**: not used in Trail OS. Poppins for headings, Open Sans for body/UI. Fraunces stays
  on outward-facing surfaces only — Trail OS has too many small, dense headings for a display serif.
- **Dark mode**: deferred, not decided. Light theme corrected; dark palette left as-is and now
  drifting further out of alignment. Still needs an explicit call.
- **Program / person-type color**: removed. Eight programs cannot be carried by four brand
  colors, and the brand requires a label alongside any color — which makes the hue decorative.
- **Functional red**: #A93F2F added provisionally for critical and destructive states. Needs a
  brand book entry as a *functional* color (not a brand color). TTDS v2.0 has no red at all.

### Still open on Trail OS
- **TOS-DOC-05 — data classification extended and rerubriced.** Replaced the three-bucket
  classification with four statuses: Live (served from a real system), Real (accurate TT content,
  hardcoded), Illustrative (plausible and invented — safe to show, never to quote), Stale (was
  accurate, now wrong). All 35 data files classified. Result: **1 Live · 9 Real · 20 Illustrative ·
  5 Stale.** The Illustrative/Real distinction is the one the old rubric was missing — "Phase 2"
  says when a file gets wired, not whether the number on screen is ours.
- **Demo hazards found by that classification** (the serious finding of the session):
  - `contextEngineData.ts` renders invented outcome figures in the **Context Bar on every page** —
    "13 learners enrolled", "91% pass rate", "Cohort 2 Week 6" — with activity dates from May–June
    2025 presented as recent. A fabricated pass rate, formatted as live operational data, on every
    screen. Highest-risk item in the app.
  - `commProviders.ts` / `commRouting.ts` state Slack is "Not Connected, target Q3 2025". Slack has
    been live for months. The UI actively contradicts reality.
  - `integrationReadinessData.ts` and `pennyCapabilityData.ts` carry Q3/Q4 2025 delivery targets,
    now 9–10 months past due, shown as live plans.
  - `programs.ts` Foundations Trail pricing field literally reads "Needs Review — pricing not
    confirmed in source materials". Would surface if that screen ever shows pricing.
  - `standardsData.ts`: the rules are authoritative but the compliance *scores* are invented, and
    the UI gives no way to tell a real rule from an invented score.
  - `peopleRolesData.ts` attaches invented health and participation scores to named people —
    unconfirmed whether those are real TT staff. Flagged for Angela.
- **Sample-data marker applied** — a neutral "Sample data" pill defined once and applied at panel
  level (not per figure) across the Context Bar, Operations, Curriculum Studio, Prompt Studio,
  People & Roles, Governance, Collaboration, Drive and Integration Readiness. Context Bar's stale
  2025 dates moved to relative language. Data deliberately not deleted — the screens still need to
  demonstrate the interface. Markers are removable file by file as real data lands.
- **TOS-DOC-06 — UX standards rewritten to the brand**, in the spec and the in-app standards page.
  Trail OS predates TTDS; the Phase 1 standard codified 9–12px type, uppercase micro-labels and the
  tighter radius, so it would have regressed the type-floor and radius work. New standard opens by
  saying the old instinct (density for a dense internal tool) was right and only the answer changed:
  density now comes from fewer columns and progressive disclosure, not smaller type. Canonical copy
  at `changesets/TOS-DOC-06 - Trail OS UX Standards (brand-aligned).md`.

### Corrections to the original review (after reading TRAIL_OS_SPEC.md + the Penny six-pager)
Recorded in `Trail OS Review - Addendum, Reading the Spec.dc.html`. Four corrections, seven new
findings. Material ones:
- **TOS-DOC-06 was wrong** — design documentation existed; it mandated the violations. Worse, not better.
- **TOS-DOC-05 was wrong** — a data classification existed, covering 12 of 33 files (all the small ones).
- **TOS-DOC-03 reframed** — the tier model is fully specified; the gap is that the sidebar gates only
  on power/admin, so Super-Admin-only items are reachable by Admins. Also: without the service
  account credentials, every signed-in user defaults to the lowest tier, so tiers are not enforced yet.
- **Penny is specified twice, incompatibly** (TOS-DOC-09). Six-pager: Experience Cloud, learner-facing,
  MVP guardrails explicitly exclude coach dashboards. Trail OS: built exactly those. Working read is
  that Trail OS is Penny's control room and Experience Cloud is her front of house — but nothing says
  so. Needs a ruling before Q3.
- Four navigation descriptions now exist (spec, README, replit.md, Sidebar.tsx), none agreeing. Spec
  gates Operations/Programs/Knowledge/Collaboration at Admin — if accurate, Power-tier coaches see
  almost nothing. Test with a real Power login; may be functional, not documentation.
- Spec contradicts itself on authentication: non-goals defer it to a later phase, sections 3 and 4
  report it live.
- Lens picker documented against three routes the spec's own redirect map redirects away. Likely dead.
- "Transition Trails Academy" (Penny doc, replit.md) vs "Transition Trails" (brand book, site, Guide).

### Still open on Trail OS
- **Applied since:** documentation sync (readinessState.ts as the single source for integration
  health; navigation documented once from Sidebar.tsx; non-goals swept — live auth, automated
  testing and Agentforce removed as shipped; the learner-portal non-goal corrected to "coach and
  learner views planned inside Trail OS, gated by Google group"); page metadata fixed; emoji
  replaced with plain status words across README, ROADMAP and the spec; "Academy" corrected.
- **Tier config colors** finished the design-system sync — the config folder had been missed by the
  page sweep. Admin moved off amber to Charcoal (amber on a tier badge would appear on every screen);
  everyday/power/superadmin already on brand values. Tick/dash symbols in the nav summary replaced
  with words. No non-brand color classes remain in config.
- **Program roster reconciled** to the Master Program Guide: 5 → 6 programs (First Two Weeks
  added, cross-program, draft), with Trail of Mastery's four tracks and Explorer's three tiers as
  sub-structure rather than new top-level records. Content supplied from this project's own design
  docs — Explorer's three tiers with pricing and audiences, the coaching ladder recorded as the
  alumni tier's core benefit, all twelve First Two Weeks fields, and the four ToM tracks defined by
  the decision each owns. Certification anchors deliberately left empty pending Angela's
  confirmation (only Advanced Admin has a candidate: Platform Administrator II).
  Unconfirmed pricing notes on Foundations, Guided Trail and ToM blanked so they cannot render as
  prices; a keyFact flags each as unconfirmed.

### Deferred by Angela (not blocked — parked)
- **Access model.** A user can hold more than one Google group (Penny Admin + Platform Admin), which
  the single-value tier ladder cannot represent. Proposal written to
  `changesets/Access model - capability not rank.md` — three independent axes (surface, domain
  authority, coach level) instead of one rank. Parked: may simply not be built that way yet.
- ~~**Digital Twin group count.**~~ **RESOLVED 4 Aug — Digital Twin is an Administration item.** The
  doc sync's 7 → 6 navigation-group correction across README, replit.md, ROADMAP and the spec was
  right and stands. My earlier `Sidebar.tsx` reading was the wrong one. No action.
- **Coach and learner views.** Not started. Decided: inside Trail OS, Google-group gated, desktop
  first, coach sees everything, and "Penny drafts, the coach approves". Open: how the three coach
  levels differ, where the verdict is issued, whether learners see each other's verdicts. Brief at
  `changesets/Coach and Learner views - design brief.md`. Driver is Guided Trail Cohort 1.
- Dark mode ruling (TOS-DS-11) — still deferred, still drifting.
- Penny: one authoritative principles list; six-pager reissue (names two programs, treats pricing
  as open, quarters carry no year). Glossary tied to the Master Program Guide. "Trail Quests" naming.

### Next design work identified
Interface improvements as the app finishes connecting. The prototype has never needed empty, loading,
stale or error states — stubbed data is always present, correctly sized and fresh. Live data is not.
A shared set of those four states, designed once against the brand, is the work to do before each
screen breaks individually.

### Previously updated in this project (public site)
- Full pre-launch review of the public site against the Master Program Guide, the Digital Compass
  blueprint and the June program comparison — 33 findings, 5 ship-blocking.
- **GT-01 applied to the live site** via the Replit connector (app "Transition Trails Public Site"):
  Guided Trail no longer claims to pair learners with a nonprofit client. Real work, sandbox only,
  coach holds the relationship. 9 edits across the Guided Trail page, nav, home, both partner pages
  and the coaches page. Changeset also written to `changesets/GT-01 - Guided Trail client language.md`.
- Built `Site Review - Master Guide Reconciliation.dc.html`, `TT Public Site - Prototype.dc.html`,
  and `Digital Compass - Program Design v0.1.dc.html`; Digital Compass added to the Master Guide
  as the fifth program.
- Decisions captured this session: Trail OS in development (testing Q4 2026, live Q1 2027);
  Penny in development for learners, Digital Compass a later undated phase; HCH capstone complete;
  Digital Compass pricing confirmed at $149/$349/$749; Base Camp pro bono Power of Us setup as the
  client acquisition channel; Guided Trail Cohort 1 = two concurrent squads, even-numbered (2, 4 or 6,
  capped at 6) because buddy testing pairs learners, plus two alternates each.
- Noted RESOLVE divergence: the public site's 7 phases match the Guide; Trail OS `resolvePhases.ts`
  defines 8 differently-named phases. Trail OS review is a separate exercise, not yet started.
- No code copied from the repo.

### Applied to the live site this session (via Replit connector)
- **GT-01** — Guided Trail no longer claims to pair learners with a nonprofit client. Real work,
  sandbox only, coach holds the relationship.
- **GT-02 / GT-07** — two concurrent squads of 2/4/6; alternates offer added to the waitlist page.
- **GT-03** — inherited seeded org replaces the capstone framing; Trail OS removed from Layer 2
  (it is not live until Q1 2027); change-set deploys stated plainly.
- **CERT-01** — applied, then REVERSED. See correction below.
- **TOM-01 / TOM-02** — four role tracks, deferred tracks moved to "designing next"; Cohort 0 dated
  simply "2027" everywhere instead of conflicting H1/Q2.
- **FT-01** — Foundations publishes no opening date; the waitlist carries it.
- **ET-01** — $1,464/yr Full + Coaching tier added to the Explorer's Trail card.
- **ORG-01** — trust strip now "501(c)(3) since May 2022", matching the structured data.
- **HOME-01** — hero stats: "3 · Nonprofit clients, none lost" and "2022 · Delivering client work since".
- **DC-01** — Digital Compass tiers presented consistently, monthly with annual alongside.

### Correction: CERT-01 was filed backwards
I recorded "Salesforce Platform Administrator" as a non-existent credential and had the site renamed
to "Salesforce Certified Administrator" across 11 places. That was wrong. Salesforce's credential
page (trailhead.salesforce.com/credentials/platformadministrator) confirms the exam is **Salesforce
Certified Platform Administrator**; "Salesforce Certified Administrator" is the retired name. The
site was right and the Master Program Guide was carrying the outdated name. Reverted in Replit to the
exact official wording, and the Guide has been corrected. The June comparison sheet already had it
right. Also open: the Trail of Mastery Advanced Admin track should probably anchor to **Platform
Administrator II**, the real second-level exam.

### Design system alignment (this session)
Reviewed the site against TTDS. Headline finding: the site imported **zero** design-system tokens and
hardcoded ~1,580 hex values in the page files. Three rulings taken:
- **Fraunces adopted** as the display face for H1/H2 only; Poppins moves to H3–H4, buttons, labels.
  Brand book to be updated.
- **Gradients approved** — the ramps make them on-palette by construction. Three fixed 135° recipes.
- **Amber**: the nav button gives up amber (white on teal); the in-page CTA keeps it. One amber button
  per screen; amber text on dark surfaces only; amber tint fills never beside the amber button.

Applied to the site: the amber ruling, and a **token layer** — `src/styles/tokens.css` as the single
source of truth, imported by `index.css`, with the legacy brand variables redefined as aliases and a
Tailwind `@theme` block exposing brand utilities. No visual change. Follow-ups sent: base layer still
forced Poppins on all headings; Caveat token present but font not imported; Fraunces import narrowed
to 400/700 roman (needs confirming); brand color utilities shadow Tailwind's own palettes and should
carry the `tt` prefix the radius utilities already use.

Still to do: collapse the ~1,580 inline hex values onto the tokens (eight find-and-replaces listed in
`changesets/TTDS v2.1 - token additions.css`), then build Stat and TierCard and move radius/shadow.

### Still to apply to the site
Nothing. Every finding against the public site has been applied via the Replit connector.
Remaining work is internal: reissue the June comparison sheet (v2.1) and strip the Penny rows
from the Digital Compass blueprint. Separately, the Trail OS review is a distinct exercise,
not yet started.

## Screen map
| Deliverable | Grounded in |
|---|---|
| Site Review - Master Guide Reconciliation.dc.html | src/content/{programs,site}.json, content/pages/home.json, pages/{Home,GuidedTrail,TrailOfMastery,FoundationsTrail,ExplorersTrail,Consulting,Waitlist,PartnersEmployers,PartnersRecruiters,Coaches,Expedition,TermsOfService}.jsx, components/Nav.jsx, constants/programs.js, index.html, index.css |
| TT Public Site - Prototype.dc.html | Same sources, with Master Program Guide corrections applied |
| Digital Compass - Program Design v0.1.dc.html | uploads/Digital_Compass_Program_Blueprint.docx; uploads/TT_Master_Program_Comparison_2026_v2.xlsx; reconciled against the site and the Master Guide |
| Design System Review - Site vs TTDS.dc.html | src/index.css, index.html (font links), all of src/pages/*.jsx (hex audit — 1,580 hardcoded values), src/components/*.jsx; compared against _ds/…/tokens/*.css |
| changesets/TTDS v2.1 - token additions.css | Proposed token additions — merged into the site as src/styles/tokens.css |
| changesets/GT-01 - Guided Trail client language.md | pages/GuidedTrail.jsx, components/Nav.jsx, pages/Home.jsx, pages/Partners{Employers,Recruiters}.jsx, pages/Coaches.jsx, content/programs.json |
| ToM Product Owner Track - Structure One-Pager.dc.html | uploads/*.docx blueprints; Trail OS Demand Management model |
| Trail OS Review - Design System and Documentation.dc.html | Transition-Trails-Map: README.md, replit.md, ROADMAP.md, artifacts/program-map/index.html, src/index.css, src/config/terminology.ts, src/data/resolvePhases.ts, src/components/layout/Sidebar.tsx, src/components/ui/{button,card,badge}.tsx, color-class audit across src/pages/*; compared against _ds/…/tokens/*.css and Master Program Guide.dc.html |

## Last sync
date: 2026-08-03T19:52:55Z
tree: 2a99ea557f2b (Transition-Trails-Map) · 8f648505367e (Penny-POC)

### Updated in this project — document reconciliation and Penny audit
- Read 14 Google Drive source documents (12 docx, 2 xlsx) and audited them against
  Transition-Trails-Map and Penny-POC. Built `Trail OS Reconciliation - Drive Docs vs GitHub.dc.html`.
- **Third repo confirmed: `Transition-Trails/Penny-POC`** — 481 files, and it is NOT a prototype.
  A mobile PWA with 12 learner screens and 4 coach screens (`pages/coach/*`), a separate 12-page
  admin app, PostgreSQL via Drizzle, a Bolt.js Slack bot, ~1,100 tests. Brand primary is `#0F6E56`
  — a fourth green. It has its own `lib/ui-tokens` package with stock framework status colors.
  **The coach and learner views exist here**, which reframes "we haven't built them yet" as true of
  Trail OS but not of the organization.
- **Headline finding: identifier collision.** The Product Vision (E-01…E-24, CAP-01…CAP-12) and the
  Features workbooks (E-02…E-14, CAP-02…CAP-12) both number from E-01 and the same ID means
  different work. E-07 = "Penny — ToM Scrum Master" in the Vision vs "DevOps & Build" in the
  workbook; E-02 = "Penny — Learner Coach (Portal)" vs "Program Mgmt"; E-03 = "Penny — Slack" vs
  "Trail of Mastery". In the Vision CAP-01 is Penny with 8 epics; in the workbooks CAP-01 does not
  exist and Penny has no capability at all. Recommendation: the Vision's numbering wins (newer,
  24 epics vs 11, Penny-centric); remap the workbooks' 56 features onto it rather than rewriting.
- Counts verified: **56 distinct features** (29 in Set 1, 27 in Set 2, plus Set 2 cross-references
  F-10-01 and F-10-05 as dependencies). 20 readiness gates in Set 1, 2 complete. 12 capabilities,
  24 epics — 13 of which have descriptions but no features.
- Three documents each tell Hugh what to build first: the PRD's prerequisite checklist, the
  workbooks' readiness gates ("no stories execute until gates are confirmed"), and the Measurement
  System's own "What Hugh Builds First". `R-01` means a readiness gate in one document and a risk in
  another. "RESOLVE" means both the 7-phase methodology and a backlog gate — recommend renaming the
  gates to readiness gates.
- Resolved by reading the Vision: **prompt architecture is 7 layers**, not the PRD's 5 (3 documents
  to 1; the Agentforce guide skips layer 4, so 7 is 5 with the context layers split). **Learner
  surface is the Experience Cloud portal** per Vision E-02, Phase 1, In Progress — but that is now a
  third answer against the PRD's "separate product" non-goal and Angela's "inside Trail OS, Google-
  group gated". Still the one open ruling.
- Also open: the Salesforce object list disagrees between the PRD (8 + 1) and the Build Requirements
  doc (3 further objects — capability, prompt, session log — plus 13 seed capability records
  referenced nowhere else). Penny is configured for 4 trails (Guided, Explorer *Journey*, ToM,
  Community/Alumni) against 8 programs in the Master Guide — Foundations Trail has no Penny
  persona at all. PRD §4.4 still mandates the superseded Phase 1 UX standards.

### Penny state audit (from code, not documents)
Built `Penny - State Audit and New Features.dc.html` — audited `api-server/src/routes/penny.ts`,
`retrieve.ts`, `index.ts` and the Penny hub.
- **One defect found.** In `penny.ts` the history validator reads
  `role === 'user' || role === 'model' && typeof text === 'string'` — `&&` binds tighter, so the text
  check never runs for user turns. Malformed history reaches Gemini as an undefined part. One-line
  fix: parenthesise.
- **Better than documented:** multi-turn history is implemented (last 10 turns, mapped correctly) —
  the roadmap lists it as future work. Retrieval is a real weighted relevance scorer with
  stop-words, tier filtering, confidence boosting and normalized scores — not a stub.
- **Not connected:** retrieval is orchestrated by the browser (`/penny/ask` accepts pre-retrieved
  chunks, never calls retrieval itself); nothing is persisted anywhere, so no engagement metric in
  the six-pager can be computed; the prompt is 3 parts (static identity + role paragraph +
  retrieved sources) against the documented 7, so Prompt Studio and the capability registry have no
  effect on real responses; tier and role come from the request body with no auth on either route.
- **Identity finding:** the system prompt defines Penny as "AI Chief of Staff", matching Vision
  E-05 — so the coaching Penny does not exist in Trail OS at all.
- Proposed 10 features in the workbooks' column shape for loading into Salesforce: F-05-01…08
  (E-05, internal) and F-02-01…02 (E-02, learner coach). Order: defect, then the layer assembler
  (five other features are additions to it), then persistence and server-side retrieval.

- **"Trail Quests" — RESOLVED: deliberate house vocabulary** (Angela, 4 Aug). Keep as-is; no rename.
  Should be written into the brand book as an intentional exception so it is not re-flagged. Note
  `Penny_Quest_Submission__c` is deployed, so the term is in the schema as well as the labels — which
  no longer matters given the ruling.
- **Foundations Penny persona — RESOLVED: a fifth trail config** (Angela, 4 Aug), to be created by
  Angela through the Penny Configuration interface so that interface gets exercised at the same time.
  Verified via MCP for her: `Penny_Trail_Config__c` is all free text with no restricted picklists —
  `Trail_ID__c` (required, 50) and `Penny_Role__c` (required, 255), plus `Tone__c`,
  `Focal_Points__c`, `Special_Instructions__c`, `Is_Active__c`. Existing four use hyphenated IDs:
  `guided-trail`, `explorer-journey`, `trail-of-mastery`, `community-alumni` — so `foundations-trail`
  matches convention.
  **Open risk flagged:** `Contact.Penny_Trail__c` is a picklist. If it has no Foundations value, the
  config can be created but no learner can be assigned to it — the same class of failure as the
  `Source__c` bug. Worth checking in Setup before testing.
- **Also found in production while cross-checking:** `Contact.Trailhead_Profile__c` — a genuinely
  prohibited brand term in a live field API name. Label can be changed cheaply; the API name persists
  without a migration. Not raised as a ruling; recorded for the brand-book pass.

### Source__c fix applied 2026-08-05 — mirror wired, still 0 records
`'dashboard'` → `'TRAIL OS'`; `SF_INTERACTION_SOURCES` now 5 values with a compile-time exhaustiveness
guard. Staff writes **skipped deliberately** via `recordSfWriteSkip()` rather than attempted and
rejected — write-health strip gains a 4th "Skipped (staff)" column shown neutral, not red. Memory-window
SOQL now carries `AND Audience__c = 'learner'`. 441 tests.
- **0 records is expected** — no learner interaction has happened yet (Angela, 5 Aug); the surface is
  still being built. The first real learner question is the end-to-end test.
- **Blocked on one schema action:** `Audience__c` does not exist on the object (confirmed by live
  describe). The write is commented out in `salesforceService.ts` because an unknown field rejects the
  entire insert. Create as Text(255), API name `Audience__c`, via dev → promote; then uncomment.
  Until then the memory-window audience filter cannot take effect, so admin-as-learner contamination
  is still possible.

### Source__c picklist — fifth value added 2026-08-05 (Angela, screenshot)
`Penny_Interaction_Log__c.Source__c` now has five active values: `slack_dm`, `slack_mention`, `mobile`,
`dashboard`, **`TRAIL OS`**. The schema blocker is cleared.
- **The code still writes `"web"`**, which is not among the five, so inserts are still rejected. One
  string change in `logInteraction()` → `'TRAIL OS'` should start the mirror writing.
- Bundle two things into the same change: `Audience__c` (needed to filter the memory window so an
  admin's direct-answer exchange cannot contaminate a learner's history), and the staff-logging
  decision — required `Learner__c` still blocks staff interactions, so this fixes learner logging only.
- Cosmetic: `TRAIL OS` is spaced/upper-case where the other four are lower-case/underscored. Invites a
  typo later; not worth a migration.


Read `PennyCommandCenter.tsx` (32845 bytes) and CHANGELOG at tree `9dd3fbea2956`.

**❗Trail key mismatch — `Contact.Penny_Trail__c` holds two formats.** Verified via prod MCP:
`SELECT Penny_Trail__c, COUNT(Id) FROM Contact GROUP BY Penny_Trail__c` returns
`explorer-journey` (1), **`Guided Trail` (3)**, **`Trail of Mastery` (1)**. Trail configs are keyed
on hyphenated slugs (`guided-trail`, `explorer-journey`, `trail-of-mastery`, `community-alumni`).
- **4 of 5 learners cannot resolve a trail config**, so Penny's trail-context layer (layer 2, marked
  `live` on the new dashboard) silently returns nothing for 80% of learners — no program, no phase,
  no trail-specific role. An absent layer is a normal condition, so nothing reports it.
- Also breaks the new dashboard's Trail Activity table: `trailKeys` merges `learnersByTrail` (keyed on
  `Penny_Trail__c`) with `stats.today.byTrail` (keyed on `trailId` from `penny_logs`) — two key spaces,
  so the same trail can appear as two rows.
- Fix: normalize existing values, then constrain the picklist. **Third silent failure from a value
  mismatch** after `Source__c` and `pmdm__Stage__c`.

**CHANGELOG overstates the code — in the code's favor.** It describes "Avg Satisfaction", per-audience
satisfaction and "satisfaction bars" in three places. `satisfaction` appears **nowhere** in
`api-server/src` or the Penny pages. The real stat cards are Today / All Time / Learners / Active
Trails. The code correctly invented no metric; the changelog describes one that does not exist.

**What landed well.** `statsError` distinguishes failure from empty (`'—'` + a "Could not load
engagement stats" alert) — the lesson took. `implemented: false` on coach/client/public with a
visible "Phase 2" badge, honestly showing the fall-through. Prompt layers marked `placeholder` render
an explicit "empty" label. Write-health strip with attempts/success/failed and last-failure reason is
exactly the fire-and-forget visibility asked for, polled every 10s.

**Two design-standard regressions.** Type runs at `text-[10px]`–`text-[13px]` throughout (Phase 2
badges, stat labels, table headers) against the **14px floor** — the contributor pack flagged this as
easy to reintroduce, and it was. And ~12 raw hex values inline (`#2F6B3F`, `#CC8400`, `#FFD08A`,
`#7A4F00`…) rather than tokens, after the token-layer pass. Amber also appears in three
non-action roles on one screen (coach identity, needs-attention, write failure).


`GET /api/learner/profile` built — four parallel SF queries (Contact, PE, `Course_Enrollment__c`,
`Course_Activity_Completion__c`), each section failing independently. `ok:false` + `contactError` =
SF failure; `ok:true` + empty arrays = learner with no records. `emptyFields[]` reports unset Contact
fields per response, which is a better answer than a one-off probe. No picklist values in any WHERE —
Id and lookup filters only. `penny.ts` now calls `getLearnerProfile()` instead of its own Contact
query, so Penny and the screens share one assembly path (service-token vs connector transport).
`LearnerDashboard.tsx` / `LearnerProgress.tsx` migrated off raw SF field names. 433 tests (+9).

**Describe corrections — I ran `pmdm__ProgramEngagement__c` against production; Replit could not.**
- ❗**Cohort DOES live on Program Engagement.** `pmdm__ProgramCohort__c` is a standard managed lookup
  to `pmdm__ProgramCohort__c`. Replit's read that "PE records membership only, trail and cohort live on
  Contact" is **half wrong** — trail does live on Contact, but cohort belongs on PE and its own object,
  and the profile endpoint should surface it.
- **`pmdm__Program__c` is REQUIRED** on PE.
- **The 7 custom fields are the admissions record, not program data:** `Withdrawal_Reason__c`,
  `pmdm_Denial_Date__c`, `pmdm_Denial_Reason__c`, `Applicant_Comment__c`, `In_United_States__c`,
  `Currently_Employeed__c` *(sic — typo in the API name)*, `Have_Salesforce_Certification__c`.
  None carries trail, so Replit was right on that half. Worth noting
  `Have_Salesforce_Certification__c` is the org's entry criterion and `Currently_Employeed__c` is an
  outcome baseline — both are measurement inputs sitting unused.
- **`pmdm__Stage__c` real values:** Applied · Ready for Interview · Application Denied · Waitlisted ·
  Enrolled · Active · Completed · Withdrawn. So the learner directory's hardcoded
  `WHERE pmdm__Stage__c = 'Active'` is valid but **silently excludes Enrolled learners** — someone
  enrolled and not yet marked Active is invisible to the directory.
- 🔑**`Learner_Course__c` was renamed, not lost.** PE's child relationship
  `Course_Enrollment__c.Program_Engagement__c` is named **`Learner_Courses__r`** — the old API name
  survives in the relationship. That closes the "missing progress parent" question properly: it was
  never unpromoted, it was renamed to `Course_Enrollment__c`. Also means enrollment hangs off Program
  Engagement, not off Contact directly.
- Also on PE: an `Assessment__c` child object (`Program_Engagement__c` lookup) that is not in the data
  model workbook either.


- `IDENTITY_LEARNER` is now **standalone** — inherits nothing from `IDENTITY_INTERNAL`. Behavioral
  difference, not tonal: learner Penny asks one targeted question where internal Penny answers.
  Coach, client and public remain `null` and **fall through to internal** — wrong default for a coach;
  must not survive the coach view being built.
- **Stuck vs uncomfortable line chosen:** uncomfortable = asks for the answer with no attempt
  described → one guiding question. Stuck = two or more attempts articulated with expected-vs-actual,
  OR a prerequisite concept blocking further self-directed work, OR a named deadline / sprint blocker
  → give the answer. In doubt: next concrete step, not the full solution.
- **Audience resolves from session only**, in order: `learnerAuthenticated` → learner;
  `sfEmail`/`sfUserId` → internal; unresolvable → **learner (most restricted)**. A body `contactId`
  still loads that learner's context into layers 2–3 for the admin "test as learner" feature but has
  **zero effect on identity** — an admin sending a learner contactId still gets `IDENTITY_INTERNAL`.
- `audience` written to every `penny_logs` row (migration pushed) and returned in `contextMeta`.
  `LogInteractionPayload.audience` optional, with the Salesforce wiring point commented pending an
  `Audience__c` field.
- **424 tests** green (+15), 0 new TS errors.
- **Memory contamination — confirmed real, fix identified.** The memory window reads
  `Penny_Interaction_Log__c WHERE Learner__c = contactId` with no audience filter. An admin testing as
  a learner logs an internal-voice exchange against that learner's Contact, which then appears in the
  learner's memory and can suppress coaching behavior. Fix: add `Audience__c` to the SF object, write
  it in `logInteraction()`, add `AND Audience__c = 'learner'` to `getInteractionHistory()`. One field,
  one clause. Do it **before** learners have real memory windows. Note the SF write is still failing
  on the `Source__c` picklist, so contamination is not yet occurring in Salesforce — the local store is
  where audience is currently recorded.

### Learner route + template auth fixes applied 2026-08-04 (Replit, all four items)
- **Assignments query rebuilt.** `Course_Module_Activity__c WHERE Learner__c` (both fields absent —
  it is the curriculum catalogue) replaced with **`Course_Activity_Completion__c WHERE Contact__c`**.
  Structural note: the real link runs `Course_Enrollment__c → Course_Activity_Completion__c`
  (required), with `Contact__c` as an **optional denormalized field** on the completion object — that
  denormalisation is what allows a per-learner query without a join. Neither object has a due-date
  field; response now returns `hasDueDate: false` so the UI suppresses the column instead of showing
  blanks, with the wiring point commented for a future `Due_Date__c`.
  **Caveat: `Course_Activity_Completion__c` has 0 records in production** (verified via MCP), so the
  corrected query returns nothing until data exists — right query, no data yet.
  This resolves the "missing learner progress parent" finding: `Learner_Course__c` is not needed, and
  the two objects absent from the data model workbook are the actual home for progress.
- **Quest submission field mapping fixed.** `Learner__c` removed, `Submission_Text__c: learnerResponse`
  added (the answer was previously sent to Gemini and discarded). Required `Assignment__c` wired to an
  optional `activityId` body param; when absent (AI-generated daily quest with no activity anchor) the
  SF write is **skipped rather than attempted and silently failing**.
- **Silent failures removed.** `sfCreate`, `sfPatch`, `sfQuery` now throw on HTTP error or missing
  credentials instead of returning `null` / `false` / `[]`. Failed submission with an `activityId`
  returns 502. Gamification wrapped in its own best-effort try/catch so a points failure cannot block
  the submission response.
- **Template auth closed.** `requireAdmin` on POST and PATCH. Self-approval enforced **server-side** on
  PATCH — 403 when `status → 'Approved'` and `req.session.sfEmail === existing.reviewRequestedBy`;
  only fires when `reviewRequestedBy` is set, so it does not block templates created without a
  reviewer. Satisfies Angela's 4 Aug ruling that approval requires Penny Admin, enforced on the write.
- API version aligned v59.0 → `SF_API_VERSION` (v62.0) in `learner.ts` and `learnerAuth.ts`.
  **`SF_SERVICE_TOKEN` is deliberate** — `/learner/auth/google/callback` runs before a session exists,
  so the connector path (which needs a session token) cannot be used there. Now commented so it is not
  removed as an apparent mistake.
- **23 new tests** across `learnerAssignments.test.ts`, `learnerQuestSubmitSf.test.ts`,
  `promptTemplatesAuth.test.ts`. No new TS errors. All five objects described cleanly — no unanswered
  schema questions.
- Three follow-ups queued by Replit: #209 activityId wiring, #210 eligible-activity quest generation,
  #211 staff SF interaction log.
- **Still a product decision:** `Quest_Eligible__c`. Generating from eligible activities would need a
  SOQL prefetch of `Course_Module_Activity__c WHERE Quest_Eligible__c = true` before the Gemini call.
  Gain: every submission gets a valid `Assignment__c` anchor. Lose: the current trail/phase-aware
  generation unconstrained by the curriculum. No code change made.

### Object population — confirmed 2026-08-04 (prod MCP). Correct figure is 13 empty, not 12.
Reconciles as 4 populated + 13 empty + 1 absent = 18.
- **Populated (4):** `Course_Module_Activity__c` 150 · `Course_Module__c` 113 · `Course__c` 24 ·
  `Penny_Trail_Config__c` 4
- **Empty (13)** — Penny (7): `Penny_Interaction_Log__c`, `Penny_Quest_Submission__c` (0, verified),
  `Penny_Gamification__c` (0, verified), `Penny_Career_Review__c`, `Penny_Weekly_Report__c`,
  `Penny_Badge__c`, `Penny_Classroom_Nudge__c`. Learner progress (2): `Learner_Course_Module__c`,
  `Learner_Course_Module_Activity__c`. Build governance (4): `TT_Build_Item__c`, `TT_Automation__c`,
  `TT_SOP_Automation__c`, `TT_SOP_Account__c`.
- **Absent from production (1):** `Learner_Course__c` — check whether it exists in dev unpromoted
  before assuming it was never built.
- **Two objects in prod that are NOT in the data model workbook:** `Course_Enrollment__c` and
  `Course_Activity_Completion__c` (found via `Course_Module_Activity__c` child relationships). These
  are the natural home for per-learner progress and are what `/learner/assignments` should query
  instead of the catalogue object.


**The local store is live and working.** Panel badged `Live · DB`, 6 interactions today / 7 all time,
each row carrying timestamp, tier badge, latency and `gemini-2.5-flash`. Telemetry capture, memory
source and admin visibility all function.

**Salesforce `Penny_Interaction_Log__c` = 0 records, and the cause is now known.** Verified via prod
MCP: **`Learner__c` is `required: true`** (lookup → Contact). Internal staff authenticate via Google
SSO and are not Contacts, so `sfContactId` resolves null and Salesforce hard-rejects the insert. This
is Replit's diagnosis and it supersedes mine — I attributed the failure to the `Source__c` picklist.
Correction: `Source__c` is a picklist (`slack_dm` / `slack_mention` / `mobile` / `dashboard`,
`required: false`); whether it is *restricted* is not visible in the describe, so whether `"web"` is
rejected is unconfirmed. The required `Learner__c` blocks staff logging regardless.

The object was scoped deliberately for learner CRM history attached to a Contact; the local DB is the
full firehose (all sessions, model, latency, tier). Admin interactions carry more detail locally than
Salesforce could hold.

**Decision (Angela, 4 Aug): resolve in a future working session, and log every Penny interaction
including internal staff.** Revised approach — **staff will live in a Salesforce `Employee` object**,
so the interaction log gets a second lookup rather than a loose email string: `Learner__c` → Contact
and a new staff lookup → Employee, both nillable, with exactly one populated per row. Better than
Replit's `Admin_Email__c` text field: staff coaching history attaches to a real record the way learner
history attaches to Contact, and it stays one object so "who asked Penny what" is a single query.
Worth a validation rule enforcing exactly one of the two, so the object cannot accumulate orphan rows.
- **Sequencing dependency:** `Employee` does **not exist in production yet** (verified via prod MCP —
  `INVALID_TYPE`). The Employee object has to land before the interaction-log change can reference it.
  Until then the local store remains the complete record.
- Schema changes travel dev → staging → prod via DevOps Center.


Angela's note: the goal for Trail Quests this session was replacing hardcoded assumptions and data;
the four review findings are queued for her next work session, not overlooked. Recorded as scheduled
work rather than open defects.
- `learner.ts` 14581 → **14680 bytes**: `/learner/daily-quest` swapped from Anthropic
  (`claude-sonnet-4-6`) to Gemini 2.5 Flash with `responseMimeType: "application/json"` and
  `temperature: 0.8` — cleaner than the Anthropic version, which relied on instructing the model not
  to emit markdown. Env var now `GEMINI_API_KEY`. Not logged in CHANGELOG (still 1.3.0, byte-identical).
- Anthropic integration retained for future use — should appear in `readinessState.ts` as available
  rather than live.

**Queued for Angela's next session** (all verified still present at 21:15):
- `POST /learner/quest/submit` — writes `Learner__c` to `Penny_Quest_Submission__c` (field absent),
  omits required `Assignment__c`, discards `learnerResponse` rather than writing `Submission_Text__c`,
  and returns `{success:true}` on a failed insert.
- `/learner/assignments` — `Due_Date__c` + `Learner__c` on `Course_Module_Activity__c`, neither of
  which exists. Per-learner data lives in `Course_Enrollment__c` / `Course_Activity_Completion__c`.
- `promptTemplates.ts` (3214 bytes, unchanged) — POST and PATCH unguarded; admin check needed on the
  write per Angela's 4 Aug ruling.
- `Quest_Eligible__c` gate bypassed by quest generation — product decision pending.
- Minor: `SF_SERVICE_TOKEN` static token and API **v59.0** in the learner routes (rest of server v62.0).


Reviewed the large Replit→GitHub push from GitHub directly. Built
`Trail OS - GitHub Change Review, 4 August.dc.html`. CHANGELOG now at **1.3.0**; **352 tests / 18 files**.

**Closed by this push**
- **F-05-17 route enforcement — landed faithfully.** `routes/index.ts` has a `staffAuthGate` before all
  mounts, default-deny with a 5-entry `PUBLIC_PATHS` allowlist; `ADMIN_PREFIXES` adds `requireAdmin`
  on `/secrets`, `/admin/google-groups`, `/admin/staff-users`, `/admin/role-owners`,
  `/admin/persona-health`. `middlewares/requireAuth.ts` checks `req.session.googleGroups` (**the set**,
  not the derived tier), distinguishes 401 `not_authenticated` from 403 `not_authorized` with
  actionable hints, and honours `TRAIL_OS_SUPERADMIN_EMAILS`. `/learner/*` is excluded from staff auth
  and correctly applies its own `requireLearnerAuth` inside `learner.ts`.
- **F-05-18 per-user Salesforce — done.** `salesforceAuth.ts`: PKCE, state validation, replay
  protection (PKCE fields cleared before exchange), silent refresh at 2h TTL, `flushSfCacheForUser`,
  and Contact ID resolution (003) distinct from User ID (005).
- Preflight hardened: per-object timeout → `undetermined` never `missing`; 429/403 → `undetermined`;
  `Program_Engagement__c` → `pmdm__ProgramEngagement__c`; `Training_Plan_Item__c` confirmed absent.

**⚠️ My F-05-05 design was wrong on its premise.** Prompt templates have been **DB-backed since
v1.2.0 (2026-07-16)** — `prompt_templates` / `prompt_variables` Postgres tables, full CRUD +
idempotent seed, `usePromptTemplates` hook with auto-seed, live editing panel. I searched
`PennyPromptStudio.tsx` rather than reading CHANGELOG and asserted they lived in a source file.
Sub-feature **05-05c is already complete**; moving to Salesforce is now a **migration**, not a first
build — worth re-deciding. Correction banner added to the design doc.

**Four defects found — three verified against production schema via MCP**
1. **Quest submission always fails and returns success.** `learner.ts` writes `Learner__c` to
   `Penny_Quest_Submission__c` — **that field does not exist**; the object's real fields are
   `Assignment__c` (required, ref → `Course_Module_Activity__c`, **not supplied**),
   `Submission_Text__c`, `Submitted_At__c`. `sfCreate` returns null on failure without throwing, so
   the route continues and returns `{success:true}` + Gemini feedback + points. The learner's answer
   is sent to Gemini and discarded despite `Submission_Text__c` existing for it. This is the
   interaction-log bug one step worse — that failed silently, this reports success.
2. **Assignments query targets the wrong object.** `SELECT … Due_Date__c … FROM
   Course_Module_Activity__c WHERE Learner__c = …` — that object has **neither field**; it is the
   curriculum catalogue. Per-learner records are `Course_Enrollment__c` and
   `Course_Activity_Completion__c` (both exist). `sfQuery` swallows to `[]`, so the dashboard shows
   "no assignments" indistinguishably from a real empty state.
3. **Approval gate not enforced on the write.** `promptTemplates.ts` has `requireAdmin` on `/seed`
   only — POST and PATCH are unguarded, so any staff user can set `status: 'Approved'` directly.
   The 1.3.0 "two-person approval rule" is likewise in the UI callback (`onSendForReview` /
   `reviewRequestedBy`), not the route. Both are good controls in the wrong layer. Contradicts
   Angela's 4 Aug ruling.
4. **`Quest_Eligible__c` governance gate bypassed.** The field's help text: "Only activities where
   Quest_Eligible__c = true may be used as source material for Trail Quest generation by Penny."
   `/learner/daily-quest` ignores it and generates quests from Claude using trail + phase.
   `Penny_Quest_Submission__c.Assignment__c` being required points the same way — the model expects
   quests tied to curriculum. Product decision, needs Angela's call.

**Implicit decisions worth making explicit**
- **Learner identity — RESOLVED 4 Aug: a dedicated Google group will gate the learner surface.**
  Learner access comes from group membership, the same mechanism as staff — not from the presence of a
  Contact record. `learnerAuth.ts`'s Contact lookup stays as the way to resolve someone's record, but
  stops being the test of whether they belong. This also answers the question F-10-01a (live learner
  read model) was blocked on. When the group is created, add it to the group constants in
  `requireAuth.ts` as a learner grant so the set remains the single place access is defined.
- **Third AI provider — RESOLVED 4 Aug: quest generation moved to Gemini.** Penny is one model again.
  The Anthropic integration is **retained for future use**, not removed — so it should appear in
  `readinessState.ts` marked available rather than live, alongside the learner surface which is also
  absent from that table (replit.md additionally still lists Clerk v6 as live).
- **`Penny_Gamification__c` is a ledger used as a counter.** Real fields include `Awarded_By__c`,
  `Reason__c`, `Note__c`, `Sprint_Number__c`, `Sprint_Points__c` — an award history. The code keeps
  one row per learner and patches a running `Points__c`, losing the audit trail.
- Minor: `learner.ts` / `learnerAuth.ts` use a static `SF_SERVICE_TOKEN` and **API v59.0** while the
  rest of the server is on v62.0; `/google/oauth/session` is a public path prefix (mitigated by
  10-min TTL and single-read).

**Recommendation:** add a **schema-conformance test** that reads the real object describe and asserts
every field the code writes exists. Three write bugs of the same species in three days is a pattern;
one test catches all of them and the next one free.


Built `F-05-05 - Prompt Studio Wiring Design.dc.html`. Read `pages/penny/` (21 files) and
`data/pennyPromptStudioData.ts`.
- **Prompt Studio is further along than the backlog implied.** 10 authored templates with
  `promptBody`, `domain`, `status` (Draft/Review/Approved/Deprecated), variables and output formats.
  `PennyPromptStudio.tsx` line 807 **already calls `/api/penny/ask`** with a real learner picked from
  `/api/penny/data/learners/directory` and renders `contextMeta` — the feedback loop exists, it just
  is not running the template being edited.
- **Core design finding: 9 of 10 templates open with "You are Penny, …"** — they were authored as
  standalone prompts before the layer assembler existed. Dropped into layer 4 unchanged, every
  request would carry two competing identity statements (layer 1 = internal chief of staff; most
  templates = learner coach). Resolution: layer 1 owns identity, layer 4 owns task. Requires an
  editorial pass over all 10 **before** they are seeded anywhere.
- **Storage recommendation: a Salesforce custom object, on the `Penny_Trail_Config__c` precedent** —
  which is already Salesforce records, edited via `TrailConfigs.tsx` (PATCH
  `/api/penny/data/trail-config/:id`), read by the assembler at request time. F-05-05 is largely
  "do for templates what already works for trails." Rejected the local DB: it holds telemetry only,
  and adding behavior-governing content makes it a second system of record.
- **Selection design:** named by caller (the Slack integration data already carries
  `promptTemplateId` per message type — so this unlocks Slack generation in the same change);
  audience default for open conversation; intent inference deliberately deferred until template
  performance is measurable.
- Safety: only Approved reaches a real request, drafts run in the test runner only, and the layer
  report names template + version so a changed answer can be tied to a changed prompt.
- Flagged: the status picklist must have all four values created before anything writes — the exact
  failure mode that stopped the interaction log. Also `PROMPT_STUDIO_SUMMARY` counts derive from the
  static array and will freeze unless moved to the query.
- Proposed 5 sub-features: 05-05a rewrite bodies (Angela, editorial), 05-05b object + seed
  (Salesforce), 05-05c Studio reads/writes live, 05-05d assembler reads approved template,
  05-05e draft preview + provenance.
- Three decisions **settled 4 Aug**: (1) templates live in **Salesforce**, on the trail-config
  precedent; (2) **approval requires Penny Admin** — to be enforced on the write, not only hidden in
  the UI, since approval is the act that changes what a learner hears; (3) the **coach-only alert
  stays out of the wiring** — not live, needs further work. Seed it as a record so the content is not
  lost, leave it in draft, and give the object an **audience field from the start** so its "never
  send to a learner" constraint is enforced by routing rather than by prose inside the prompt.
  Nine templates in scope for wiring.

### Salesforce environments (corrected 2026-08-04)
**Three orgs: development, staging, production.** Metadata changes are made in dev and promoted
through staging to production via **DevOps Center, with GitHub as source control for the Salesforce
metadata**. My earlier note in the contributor pack that there was "no development org in the loop"
was wrong and is corrected.
- MCP connectors are available for all three: `ttdevmcpconnection__*`, `ttstagingmcpconnection__*`,
  `ttprodmcpexternalconnector__*`. Their existence was itself evidence of three orgs — worth reading
  the available tools before asserting environment facts.
- **The asymmetry that matters:** the schema has a promotion path, but Trail OS itself points at
  production. There is no staging deployment of the app against the staging org, so every application
  write is real.
- Practical consequence for schema work: a field exists in dev before production, so app code
  depending on it fails against production until promoted — and a not-yet-promoted field is
  indistinguishable from one that was never created. Always state which org a schema claim came from.


- **RC-01 learner surface — RESOLVED.** See immediately below.
- **Dark mode — backlogged, not a priority** (Angela, 4 Aug). Staff-facing only, so no external
  exposure while parked. Revisit when the brand book is next opened.
- **Digital Twin — RESOLVED: it is an Administration item** (Angela, 4 Aug). The doc sync was right;
  the 7 → 6 correction stands, nothing to undo.
- **Epic identifier scheme — ACTION FOR 2026-08-05.** Epics and Features move into Salesforce
  tomorrow, which settles this in practice: whichever numbering is created there becomes real.
  Carry two things into that session. (1) Every feature written this session uses the **Vision's**
  numbering — F-05-* under E-05 (Penny as internal chief of staff), F-02-* under E-02 (Penny as
  learner coach), F-10-01a under E-10 — so choosing the workbooks' scheme instead means remapping all
  fifteen. (2) The workbooks' 56 existing features should be remapped once during the migration
  rather than left to coexist. Recommendation stands: the Vision's scheme (newer, 24 epics vs 11, and
  the only one where Penny exists as a capability — CAP-01).
- Still open: Foundations Trail has no Penny persona (most consequential — affects the learner layer);
  "Trail Quests" naming.

### RC-01 RESOLVED (Angela, 2026-08-04) — learner surface is Trail OS + Slack
The largest open question in the program is settled. **Trail OS is the learner surface; Slack is the
communication layer**, likely open in a side panel alongside it. Not Experience Cloud (Vision E-02),
not "a separate product" (PRD non-goals), not Slack-only (the implication of F-404 retirement).

Consequences to action:
- **They are concurrent, not alternating.** A learner has Trail OS and Slack open at the same time, so
  Penny-in-Trail-OS and Penny-in-Slack are **one conversation with two windows**. The memory window
  layer must therefore be keyed on the person, not the surface — otherwise a learner asks in Slack,
  switches to Trail OS, and Penny has forgotten. Worth designing before either surface is built.
- `Source__c` records *which window*, not which conversation. The picklist needs a Trail OS value
  (`dashboard` may already serve); `mobile` is a POC fossil to retire. `slack_dm` and `slack_mention`
  stay and are now first-class rather than legacy.
- Division of labour: **Trail OS is where the work and the coaching happen; Slack carries
  conversation, nudges and quest delivery.** That validates `Penny_Classroom_Nudge__c` as a real
  object rather than POC residue.
- Unblocks F-02-01 (learner identity layer), F-10-01a (learner read model), and the coach/learner
  design brief. The Vision's E-02 "Learner Coach (Portal)" epic needs its Experience Cloud framing
  corrected.
- The PRD non-goal was already corrected this session to "coach and learner views planned inside
  Trail OS, gated by Google group" — that now matches the ruling exactly.


Documents are being retired; Cases, Epics and Features move into Salesforce, with Knowledge articles
supporting Trail OS. **GitHub is current state** — divergences mean the document is stale, not the
code wrong. The product evolved as the approach was worked out. Coach and learner views come after
the current Trail OS work.

**Identity and access backlogged (3 Aug).** Login is done and confirmed working. The remainder —
F-05-14 integration user, F-05-18 per-user SF authorization, F-05-19 Slack at first use — is parked
to finish later in the week, starting with creating the Salesforce integration user. Angela's note:
pointing the Replit connector at a different account is a simple configuration switch; the real work
is the permission set behind it (read on the 18 custom objects, create on
`Penny_Interaction_Log__c`, plus the standard and managed objects the connector uses). Without that
first, the switch trades a working over-permissioned account for a broken under-permissioned one.

**Current focus: Penny Admin and Platform Admin properly connected.** Platform Admin's tool (the
validation page) is now trustworthy. Penny Admin's is not — Prompt Studio and the capability registry
have no effect on a real response. Next: F-05-05 (wire Prompt Studio into the layer assembler) and
F-05-02 (server-side retrieval).

## Last sync
date: 2026-08-03T19:57:56Z
tree: 2a99ea557f2b (Transition-Trails-Map) · 8f648505367e (Penny-POC)

### Salesforce connector review
Built `Salesforce Connector - Review.dc.html` — reviewed `api-server/src/routes/salesforce.ts`
against `uploads/TrailOS_SF_Data_Model.xlsx` (25 sheets, extracted to
`scraps/src-TrailOS_SF_Data_Model.txt`).
- **The data model supersedes the PRD's object names.** The model reuses Contact and Course rather
  than creating parallel objects; the PRD's acceptance criteria still name the old ones. Mapping:
  `Penny_Conversation__c` + `Penny_Conversation_Message__c` → **`Penny_Interaction_Log__c`**;
  `Penny_Career_Profile__c` → **`Penny_Career_Review__c`**; `Penny_Trail_Quest_Template__c` →
  **`Course__c` reused**; `Penny_Trail_Quest_Activity__c` → **`Course_Module_Activity__c` +
  `Penny_Quest_Submission__c`**; `Learner__c` → **`Contact` reused with Penny fields**.
  Two objects exist that the PRD never mentions: `Penny_Badge__c`, `Penny_Gamification__c` (the
  POC's badge and points system). Anyone building to the PRD would create duplicates.
- Also in the model but absent from every plan: `TT_Build_Item__c`, `TT_Automation__c`,
  `TT_SOP_Automation__c`, `TT_SOP_Account__c` — build-governance objects with Decision Log fields.
- **Connector is read-only.** All four endpoints are GET; every SF call is SOQL. No create or
  update anywhere. This single gap blocks Penny persistence, quest assignment, submissions, career
  reviews, weekly reports, points and badges — each of which currently looks like a separate feature.
- **Zero custom objects queried or validated.** `/salesforce/validate` proves Contact, Account,
  NPSP and 8 `pmdm__` objects. Nothing Trail OS owns. So the readiness page can report a healthy
  connection while every TT object is missing or unreadable — and there is nothing in Trail OS that
  can confirm the objects deployed.
- **Defect:** open cases order by `Priority DESC`. SOQL sorts picklists by defined order (standard
  Case priority is High/Medium/Low), so DESC returns Low first and urgent cases can fall off the
  `LIMIT 25`. Verify against their picklist order before changing.
- Failures and zeros are indistinguishable: the `safe()` helper swallows all errors to null, and
  status filters hardcode 'Active'/'Planning'/'High' — a mismatched picklist value returns 0, which
  looks like information. Also: connector ID and API version in source, 25/50 row caps with no
  pagination, in-memory per-instance cache.
- **Well built, worth preserving:** auth via the Replit connector proxy (no SF credentials in the
  codebase), identity check with a `/limits` fallback, 8-object PMM probe in parallel with per-object
  counts, and the org base URL resolved from OAuth userinfo rather than assembled from InstanceName.
- Proposed 6 features: F-05-09 write capability (highest leverage — unblocks everything above),
  F-05-10 validate Trail OS objects, F-05-11 distinguish broken from empty, F-05-12 priority sort +
  truncation, F-10-01a live learner read model, F-05-13 environment config out of source.

### Penny audit correction (verifier)
Two claims in `Penny - State Audit and New Features.dc.html` corrected after reading `app.ts` and
`middlewares/clerkProxyMiddleware.ts`:
- Penny screens: **17 page files** in `pages/penny/` (9 hub tabs per the spec). The earlier "twelve"
  was the Penny-POC admin dashboard count — wrong repository.
- Auth: **`clerkMiddleware()` IS mounted app-wide** before `/api`, so a verified identity is attached
  to every request. But it attaches auth state without enforcing it, and both Penny routes ignore it
  in favor of body-supplied `role`/`userTier`. The finding stands but is narrower and much cheaper
  to fix than "add authentication" — the identity is already there and trustworthy.

### Connector read coverage — applied and verified (2026-08-03T20:10Z)
F-05-10 through F-05-13 applied via the Replit connector. Validation endpoint now probes all 18
custom objects. Typecheck clean across all four workspaces.
- **Org: Transition Trails, Enterprise Edition, PRODUCTION.** Connector authenticates as
  `angela@transitiontrails.org`. Worth noting as a risk: production integration running on a named
  personal user, with that user's full permissions.
- **17 of 18 objects accessible.** Populated: `Course_Module_Activity__c` 150, `Course_Module__c` 113,
  `Course__c` 24, `Penny_Trail_Config__c` 4 (the four trails, confirming Angela's check). All other
  13 deployed but empty.
- **`Learner_Course__c` does not exist** — 400 INVALID_TYPE, structural absence not permissions.
  Its two children `Learner_Course_Module__c` and `Learner_Course_Module_Activity__c` both exist, so
  the parent of the learner progress chain is missing. The object probe found this on its first run,
  which is exactly what it was built for.
- **Salesforce 10 RPS ceiling breached** by firing 18 counts in parallel — 8 returned 429s. The
  parallel pattern that works for 8 managed-package objects does not scale to 18; needs batching or
  a single describe call. New finding, not on any list.
- Field checks passed on all four reused objects: Contact 28 TT fields (incl. `Penny_Trail__c`,
  `Penny_Trail_Config__c`, `Penny_Confidence_Score__c`, `Coach__c`, `LMS_Learner_ID__c`),
  `pmdm__Program__c` 17, `pmdm__ProgramEngagement__c` 7, `Knowledge__kav` 31.
- **Case priority order confirmed High → Medium → Low.** Sort changed to ASC so urgent surfaces
  first — SF-03 closed.
- Rulings taken: SF-01 read-only is deliberate (write capability F-05-09 deferred); SF-02 reframed
  as a code gap with access confirmed; SF-03 tracked then fixed; SF-04 and SF-05 agreed.
- Still open: F-10-01a live learner read model — blocked on how a learner is identified now that
  Contact is reused rather than `Learner__c`. `LMS_Learner_ID__c` and `Penny_Trail__c` are likely
  part of the answer.

### Penny — defect fix and layer assembler (2026-08-03T20:35Z)
Both applied via the Replit connector, typechecks clean across all four workspaces.
- **F-05-01 defect fixed.** The history validator precedence bug (`&&` binding tighter than `||`, so
  the text check never ran for user-role turns) closed with parentheses plus a
  `.trim().length > 0` guard. Predicate extracted as an exported `isValidHistoryItem` for testability.
  **19 tests added in `pennyHistory.test.ts`** — covering the three acceptance cases, whitespace-only
  strings, bad roles, structural garbage, and array-level degradation to `[]` with the request still
  proceeding. This is the first automated test coverage in Trail OS; Phase 1 had zero.
- **F-05-04 layer assembler built.** New `pennyPromptAssembler.ts` — the single place the system
  prompt is constructed. Seven layers as seven independently testable functions; the Gemini call
  receives a finished string and knows nothing about assembly. `layersPresent` now returned alongside
  `reply`, `model` and `durationMs`, which is what the session-info panel should display instead of
  its hardcoded value.
  - Producing content: **identity** (internal only — learner/coach/client/public are named null
    placeholders falling back to internal), **trail-context** (reads `Penny_Trail_Config__c`),
    **learner-context** (reads Contact's 28 custom fields), **knowledge** (unchanged).
  - Empty by design: **active-quest** and **career-review** (objects deployed, 0 rows),
    **memory-window** (no persistence yet).
  - Internal-user behavior verified unchanged — same identity text and role paragraph, now sourced
    from the assembler.
  - **Worth noting:** layers 2 and 3 are the first time Trail OS reads its own custom objects rather
    than prototype fixtures.
- Penny identity finding reframed after Angela confirmed five audiences (internal, learner, coach,
  client, and the Vision's public guide): the chief-of-staff prompt is *correct*, it is just the only
  one. F-02-01 rewritten to one identity layer per audience with a behavioral line for each —
  internal answers, learner asks back, coach drafts for approval, client bounded to case status with
  a human gate, public handles program fit and never coaches. Identity selected from the resolved
  session, never a request parameter.
- **F-05-14 added (Critical):** move the connector off `angela@transitiontrails.org` to a dedicated
  integration user with a deployable permission set, scoped to exactly the objects the connector
  uses. Sequencing decision: this completes **before** any learner work, so the learner read model is
  built against the permissions it will actually run under.

### Penny — persistence and memory window (2026-08-03T20:50Z)
F-05-03 applied. Typecheck clean. **29 new tests** (17 interaction log, 12 layer-7) on top of the
earlier 19 — Trail OS now has **48 automated tests** against the PRD's retirement gate of 50.
- ⚠️ **CORRECTED 2026-08-04 — verified directly against production via MCP. PERSISTENCE HAS NEVER
  WORKED.** `SELECT COUNT(Id) FROM Penny_Interaction_Log__c` in production returns **0**. Everything
  below about persistence working, and about the memory window being live from the second exchange,
  was wrong — the code path exists and has never once succeeded.
  **Root cause is a schema mismatch, not the field count:** `Source__c` is a restricted picklist whose
  only permitted values are `slack_dm`, `slack_mention`, `mobile`, `dashboard`. `logInteraction` writes
  the literal `"web"`, so Salesforce rejects the whole insert, and fire-and-forget caught and logged
  it. Field counts were confirmed accurate (5 custom here, 28 org-native on Contact) — the truncation
  doubt was unfounded, but the write was broken all along.
  **Process lesson:** direct production MCP access (`ttprodmcpexternalconnector__*`, plus staging and
  dev) was available throughout and I relied on the Replit agent's self-report instead. The agent
  listed the five fields correctly and still missed the mismatch, because it was reading its own
  code's intent rather than validating against the schema. Verify schema claims via MCP directly.
  Fix dispatched: `dashboard` for web-originated interactions, source derived from real origin, last
  write failure surfaced in the Penny admin screens, and an audit for the same
  hardcoded-string-to-restricted-picklist pattern elsewhere. Also asked whether the 218-test suite
  could have caught it — suspicion is that it mocks the Salesforce client and asserts intent rather
  than schema conformance, which is a blind spot rather than a coverage gap.
- `Penny_Interaction_Log__c` described live against production. **Five fields reported:**
  `Learner__c` (reference → Contact, **required**), `User_Message__c` and `Penny_Response__c`
  (32,768 textarea), `Prompt_Mode__c` (string 50), `Source__c` (picklist).
- **No fields exist for model, latency, prompt layers, audience identity or tier.** Those five are
  written to the local database only. Field-addition tasks were proposed and **cancelled by Angela**
  — parked deliberately.
- **Open constraint worth a decision:** `Learner__c` is required, so an exchange with no resolved
  Contact produces **no Salesforce record**. Internal staff are Penny's primary audience today, so
  internal usage is recorded only in the local DB, not in the system of record. Either make
  `Learner__c` optional, or accept that Salesforce logs learner exchanges only and the local DB is
  the source for internal usage — but the measurement spec should say which.
- Correction to the earlier audit: Trail OS **does** have a local database write path (`lib/db`);
  the finding that "nothing Penny says is stored" was true of Salesforce, not of the app.
- Write is fire-and-forget — reply is sent before the write settles, failures logged server-side and
  never propagated. Messages truncate at 10,000 chars with an explicit marker. The catch handler
  distinguishes permission errors from other failures, which is what will make the integration-user
  switch (F-05-14) fail loudly rather than silently.
- **Layer 7 now live from the second exchange onward.** History reads back from Salesforce via
  `getInteractionHistory`, so refreshing the browser no longer resets Penny's context for a learner.
  `layersPresent` includes `memory-window` once there is something to remember.
- **Resolved (Angela, 3 Aug):** `Learner__c` being required is a carry-over from an earlier model that
  had a standalone learner object. The real model is **Contact + Program Engagement + assignment to
  classes and modules** — and `Learner__c` is already a Contact reference, so the relationship is
  right and only the name is vestigial. Preferred fix is therefore *not* to make the field optional:
  resolve the authenticated user to their own Contact so every exchange has a subject, internal or
  learner. No schema change, the field name becomes accurate, and internal usage lands in the system
  of record alongside learner usage. Enrollment context comes from Program Engagement, never from the
  interaction log.
### Penny — Contact resolution for staff exchanges (2026-08-03T21:05Z)
Applied. Typecheck clean. **Found a larger bug than the one I reported.**
- **Root cause:** a `throw` on missing contact ID was caught two lines later and set `sfClient = null`,
  which stripped Salesforce from the **entire request** for staff users — not just the interaction
  write. Internal users had no Salesforce context at all: no trail config, no learner layer, no
  history. My audit reported the missing log record; the actual defect was much wider.
  Now two explicit paths: learner (Contact in session → coaching context as before) and staff
  (no Contact → `sfClient` stays alive, resolve by email).
- Resolution uses `req.session.sfEmail` from the Salesforce OAuth callback, **not** the Clerk session —
  the agent overrode my instruction and was right to: the SF-authenticated email is guaranteed to
  match a Contact in the same org. 15-minute cache; positive hits and null misses cached, query
  failures deliberately not cached so they retry; SOQL single-quote escaping handled.
- Unresolvable email logs a warning naming the address rather than dropping the exchange.
- Memory window (layer 7) now works for internal users from their second exchange onward.
- **Test count: 150 across 9 files** (17 new in `pennyContactResolver.test.ts` covering resolution
  priority, cache behavior, TTL expiry and SOQL escaping). Note this is far above the running total I
  had been tracking from this session's additions — so the spec's "zero automated tests" baseline was
  already stale before today. The PRD's retirement gate of 50 is comfortably cleared either way.
### Identity and access design (2026-08-03T23:08Z)
Built `Trail OS - Identity and Access Design.dc.html` after reading `googleOAuth.ts`,
`googleGroups.ts`, `app.ts` and `clerkProxyMiddleware.ts`.
- **`googleOAuth.ts` is not a login flow.** It is a one-off admin wizard: an admin runs it, Google
  returns a refresh token, and the page instructs pasting it into Replit Secrets
  (`GOOGLE_DRIVE_REFRESH_TOKEN` etc). Memory-only sessions, 10-min TTL, token cleared after one read.
  Service access as a single account — no per-user login exists anywhere in Trail OS.
- **`googleGroups.ts` is reporting only.** Service-account Directory read of
  `trailosadmin` / `trailospennyadmin` / `trailosusers` membership for an admin screen. Nothing calls
  it at request time to gate anything.
- **Clerk is the actual session layer** (`clerkMiddleware` app-wide, proxied via `/api/__clerk`,
  production only) but attaches identity without enforcing it, and is not connected to Google Groups.
- So three identity systems exist — Clerk sessions, Salesforce OAuth (`req.session.sfEmail`), Google
  Groups — and none is authoritative for authorization. `accessTiers.ts` still defaults to Super
  Admin with no route-level checks.
- **Key constraint documented:** Google SSO authenticates the person but cannot authorize Trail OS in
  Salesforce or Slack — each issues its own tokens. If SF/Slack use Google as SAML IdP the grants are
  one consent click each, remembered thereafter. One identity, three grants.
- **Dual-context resolution:** user context for anything on screen (their SF sharing rules apply, no
  authorization code to write); system context for Penny's fire-and-forget writes, nightly sync and
  scheduled reports. This narrows F-05-14's scope to background operations only rather than
  superseding it.
- Group membership must be read as a **set of grants**, not resolved to one tier — this is what
  resolves Angela's "a user could have more than one group" point and the parked
  `changesets/Access model - capability not rank.md`.
- Proposed F-05-15 (Google SSO login), F-05-16 (access from group membership), F-05-17 (route-level
  enforcement — the one that makes the others real), F-05-18 (per-user SF authorization),
  F-05-19 (Slack at first use).
- **Ruling taken 3 Aug: Salesforce uses Google as its SAML IdP.** The SF grant is therefore one
  consent screen, no password, once. Also means disabling a Google Workspace account closes
  Salesforce access at the same time — single revocation point.
- **Still open:** Clerk in front of Google, or Google directly. Running both is the thing to avoid;
  today there are effectively two half-wired identity systems.
### F-05-15 Google SSO login + group-derived access (2026-08-03T23:30Z)
Applied. Typecheck clean on api-server and program-map (two pre-existing errors in
`mockup-sandbox/vite.config.ts`, untouched). **169 tests across 10 files** (+19 in `googleAuth.test.ts`).
- **Per-user Google sign-in built.** CSRF state token, `hd=transitiontrails.org` as a hint, then the
  `hd` claim validated in the returned ID token — hint is not enforcement, the claim check is. Plus an
  email-suffix check. Personal Gmail refused with a specific message.
- **Groups held as a set:** `req.session.googleGroups` is `string[]`. `googleTier` derived from it for
  display only (highest wins). `useGoogleAuth` exposes both. 5-min TTL via `googleGroupsExpiry`; on
  refresh, a user now in no groups has their session ended immediately rather than at next sign-out.
- **Clerk removed — six call sites, none enforcing auth.** The server-side finding matters: Clerk was
  registered on every request but **no API route ever called `getAuth()`, `currentUser()` or
  `clerkClient()`**. The middleware attached context nothing read. Identity was never enforced
  anywhere, confirming the F-05-17 gap is total rather than partial.
- Penny contact resolver untouched — `req.session.sfEmail` (Salesforce OAuth) and
  `req.session.googleEmail` are separate namespaces.
- **Action for Angela:** register `https://{replit-dev-domain}/api/auth/google/callback` in the Google
  Cloud Console OAuth client's Authorized Redirect URIs. Existing `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` are reused — no new client needed. Sign-in cannot be tested end-to-end
  until this is done.
- **Confirmed working end-to-end (Angela, 3 Aug).** Full sequence verified in server logs:
  `/api/auth/google/login` → 302 → `/api/auth/google/callback` → 302 → `/api/auth/google/me` → 200
  authenticated → Salesforce calls completing normally. Redirect URI was already registered in GCP.
- **Two distinct callback paths, both live, both registered on the same OAuth client:**
  `/api/google/oauth/callback` (`googleOAuth.ts`) is the admin wizard for application-level Drive /
  Calendar / Gmail refresh tokens; `/api/auth/google/callback` (`googleSignIn.ts`) is per-user staff
  sign-in. Easy to confuse — the path segments are swapped.
- **186 tests across 11 files**, all passing (+17 in `googleSignInRoutes.test.ts` covering login
  redirect params, every callback error branch, `/me` both states, and sign-out clearing the session).
  Pushed to `main` at commit `b5c6ad4`. One unpushed local commit (`aae09fe`) is a machine-generated
  Salesforce ops-cache file only.
- Not yet manually exercised: personal-Gmail rejection. Enforced in code and covered by the
  `wrong_domain` automated test, but nobody has clicked through with a Gmail account.
### F-05-17 route enforcement + validation probe fix (2026-08-04T00:50Z)
Both applied. **218/218 tests passing**, typechecks clean on api-server and program-map.

**Validation probe fix.** The page had been reporting 9/18 accessible; **the real figure is 17/18.**
Nine failures were `429 Too Many Requests` from the Replit connector proxy (limit `20/10 RPS`), not
inaccessibility. Batched with 1.2s inter-batch delays and a retry honouring `Retry-After`; response
went sub-second → 4.2s, which is the correct trade. Third state added: a throttled probe that fails
its retry becomes `accessible: null` (undetermined, amber `?`) and **never `false`**.
`Learner_Course__c` is the only genuine failure (INVALID_TYPE — object absent) and now sorts to the
top of its group. The Contact panel's "0 TT fields / Missing required: Penny_Trail_Config__c…" was a
throttled describe misread as absence — the describe now runs sequentially after the object probes
drain, and the server enforces `requiredFieldsMissing === []` whenever `describeError` is set.

**Route enforcement — the exposure was total.** Clerk was never wired to Express session middleware
at all; it was pure client-side decoration. **115 route handlers across 28 files, the vast majority
open to anyone who could reach the server**, including: all Salesforce routes (live org data),
`GET /api/secrets/audit` (full credential audit), `POST /api/penny/ask` (Gemini spend + SF writes),
Drive/Calendar/Gmail routes (live Workspace data), `GET /api/admin/google-groups` (enumerated all
Workspace groups), and `POST /api/slack/notify` (could post to the admin channel).
- Now a single `staffAuthGate` before every router mount, **default-deny** — `requireStaff` unless
  explicitly in a deliberately minimal `PUBLIC_PATHS` (the two OAuth round-trips, the Google wizard
  callbacks, the HMAC-verified Slack webhook, `/healthz`). `/secrets`, `/admin/google-groups` and
  `/admin/role-owners` carry a second `requireAdmin`; so do `POST /slack/notify` and the seed routes.
  Learner routes gated separately by `requireLearnerAuth`.
- Removing the superadmin default broke nothing — it only governed the client's pre-`/me` render
  state, which now shows the least-privilege layout for one render cycle instead of the highest.
- Penny's fire-and-forget write intact; SF permission errors (`INSUFFICIENT_ACCESS`, `CREATE_FAILED`)
  log at error level so a misconfigured integration user surfaces immediately — which is what F-05-14
  needs.
- Angela's account: `tier: superadmin · groupCount: 2` via `TRAIL_OS_SUPERADMIN_EMAILS`, which passes
  `isStaff` and `isAdmin` independent of group membership.

## Sync history
- 2026-08-03T14:13:57Z — Transition-Trails-Map @ tree 2a99ea557f2b. Trail OS review (26 findings),
  then applied via the Replit connector: RESOLVE corrected to seven phases, the TTDS token layer,
  status colors collapsed to five brand roles, brand type and the 14px floor, UX standards
  rewritten, data classified (1 Live / 9 Real / 20 Illustrative / 5 Stale), sample-data markers,
  stale files corrected, program roster reconciled to 6 with ToM tracks and Explorer's tiers.
  Full detail in the section above.
- 2026-07-31T19:14:42Z — TT-Public-Website @ tree 4d4a4cf2bb98. Public site fully aligned:
  33 findings applied, token layer landed, design-system rulings taken. See the public-site
  section above for detail.
- 2026-07-31T15:08:03Z — Initial read of TT-Public-Website @ fcaf925b7048. Full site inventory and
  contradiction audit against the Master Program Guide. No changes applied.
- 2026-07-28T14:30:00Z — Trail OS grounding (Transition-Trails-Map): README, replit.md, ROADMAP,
  TRAIL_OS_SPEC.md, resolvePhases.ts, terminology.ts. Public site inventory pulled from Replit
  (TT-Public-Website appeared empty at the time).
