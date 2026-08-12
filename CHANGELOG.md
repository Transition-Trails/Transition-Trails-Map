# Changelog

All notable changes to Trail OS are documented here.
Dates are in `MMMM D, YYYY` format. Versions follow semantic versioning conventions.

---

## [1.6] — August 12, 2026

### Added
- **Homebase tour** — animated 7-step first-visit walkthrough fires automatically for every audience (staff, coach, learner, volunteer); steps are audience-aware and matched to each layout.
- **Tour shared-step auto-skip** — steps the user has already seen on a previous visit are filtered out on replay; a "Show all steps" button restores the full tour.
- **Submit a Case drawer** on Coach, Learner, and Volunteer homepages — pre-filtered to the General case type (Team Homebase already had it).
- **"What's New" link in PennyBar** — visible on all homebase layouts; pulsing dot + label when unseen, version tag otherwise.
- **Tour replay from Release Notes** — "Take the tour" button navigates to homebase and opens the audience-specific tour in-place.
- **Audience-aware Release Notes route** — homebase sign-in types stay in HomebaseShell; staff stay in AppShell.

### Fixed
- American English spelling enforced across the full codebase (programme→program, artefact→artifact, colour→color, -ise→-ize, and all other British variants).
- `ArtefactsCard.tsx` renamed to `ArtifactsCard.tsx` on disk — was causing a Vite import resolution error after the spelling sweep.
- 16 API server test suites updated to export `requireSuperAdmin` and `effectiveIdentityMiddleware` from the `requireAuth` mock — previously silently never running.
- 7 frontend tests for `TasksPage` updated to mock `useAppContext` — previously failing with "must be used within AppProvider".

---

## [1.5] — August 6, 2026

### Added
- **Homebase system** — audience-dispatched landing pages for learners, coaches, volunteers, and team staff, each with a dedicated shell and personalized content.
- **Google SSO + Google Group routing** — sign-in derives each user's audience from DWD group membership; 5-minute cache auto-refreshes on `/me`.
- **Learner Homebase** — upcoming sessions, quest progress band, Penny nudges, and a clear sign-in error page for rejected learners.
- **Coach Homebase** — squad overview, artifact review queue, and week summary card.
- **Volunteer Homebase** — real Salesforce unassigned case queue with specialty matching, optimistic claim UI, and two-layer concurrency protection.
- **Team Homebase** — team@transitiontrails.org members land on a focused workspace; superadmins reach it via `/homebase`.
- **Back to Homebase card** in Mission Control — visible for all team group members via direct group membership check.
- **Staff volunteer admin page** at `/admin/people/volunteers` — set commitment level, specialty, and coordinator without leaving Trail OS.
- **19-test Google Group audience routing suite** + DWD diagnostic probe script added to the API server.
- **connect-pg-simple** replaces session-file-store for durable cross-instance sessions.

### Fixed
- Learner sign-in blank page fixed — rejected learners now see a clear error message with reason and retry button.
- Home icon naming collision in Mission Control fixed — was accidentally rendering the entire page component inside the card.

---

## [1.4] — July 2026

### Added
- Procedure Builder — Google Drive-backed step editor; published procedures accessible to learners via a lightweight Express HTML page.
- RESOLVE phase names finalized — Recognize, Explore, Select, Outline, Launch, Verify, Evolve (Execute removed; old names retired).
- Digital Twin folded into Governance as three tabs (Tracer / Map / Impact); old `/digital-twin/*` routes redirect.
- Collaboration Hub consolidation — 6 sidebar items merged into 4 tabs (Overview / Comms / Signals / Channels).

---

## [1.3] — June 2026

### Added
- Centralized terminology config (`src/config/terminology.ts`) — all branded UI labels in one file; no more hardcoded brand strings.
- Signal-to-Penny pattern — Trail Signals rows fire a pre-composed Penny query and open the Ask Penny panel automatically.
- SF record → Penny focus pattern — clicking a live data row highlights it and opens Penny with rich case context.
- Global slide-over panel pattern — Ask Penny and Calendar Action panels share a fixed right-side mount with spring animation and mutual exclusion.

---

## [1.2] — May 2026

### Added
- Penny live API wiring — POST `/api/penny/ask` using gemini-2.5-flash; staff routed to Claude via LLM provider router.
- Penny Interaction Log write to Salesforce (`Penny_Interaction_Log__c`) with restricted picklist guard.
- Slack live validation — SlackValidationProvider auto-fetches on mount; smoke-test endpoint added.
- Google OAuth wizard at `/admin/integrations/google-auth`.

---

## [1.1] — April 2026

### Added
- Phase 1 Readiness Dashboard at `/admin/phase1-readiness`.
- Salesforce Validation Center as a tab in Program Hub.
- API default-deny enforcement — requireStaff / requireAdmin middleware; PUBLIC_PATHS allowlist; 401 vs 403 split.
- Role-aware hub pattern — HubShell hides tab bar when only one tab passed; hubs use useTierFlags for tier-specific tabs.

---

## [1.0] — March 2026

### Added
- Initial Trail OS release — Program Map, Digital Twin (now Governance), Knowledge Hub, Penny Command Center, Operations Hub, Collaboration Hub, and admin scaffolding.
- Google SSO authentication (Clerk removed).
- Salesforce integration (cases, tasks, programs).
