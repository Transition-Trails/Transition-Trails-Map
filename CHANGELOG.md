# Changelog — Trail OS

All notable changes to Trail OS are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Docs — 2026-08-04 (ada7cba)

- Auto-logged: `ROADMAP.md` updated in commit `ada7cba`

Changes on `dev` branch not yet merged to `main`.

---

## [1.3.0] — 2026-08-04 — Salesforce Preflight Hardening, Penny Capability QA & Prompt Studio Review Flow

### Added

**Penny Capability Preflight — Salesforce object validation**
- Per-object timeout (`PF_OBJECT_TIMEOUT_MS`, default 10 s) wraps every SF describe call; timeout produces `undetermined` (never `missing`) — a stall is not evidence of absence
- 429/403 and all non-404 errors from describe produce `undetermined` so rate-limited orgs never see false-positive missing objects
- `pfSfGetRetry` — retry helper used by all capability preflight SF calls
- `pmdm__ServiceSchedule__c` probe added to `cap-cohort-summaries` preflight; `sf-service-schedule` requirement ID introduced
- Validation Center org-wide warning banner when all SF describes fail simultaneously
- Picklist describe failure surfaced in server logs and caller responses; stale failure entries skipped on retry
- `TT_Build_Item__c` and `Penny_Classroom_Nudge__c` typed service functions and API routes (`GET /api/salesforce/governance/build-items`, `POST /api/salesforce/governance/build-items`, `GET /api/salesforce/governance/classroom-nudges/:contactId`, `POST /api/salesforce/governance/classroom-nudges`)
- `TT_Automation__c` governance route guards against unfiltered queries when filter fields are missing; field presence cached after first successful confirm
- Salesforce error sanitisation in `withClient` catch block — stack traces and raw SF XML/SOAP never reach API consumers

**Prompt Studio — review workflow**
- Two-person approval rule: the user who submitted a template for review cannot approve their own submission; `reviewRequestedBy` field tracks submitter email
- `onSendForReview` callback in `ActionPanelConfig`/`RailActionPanel` forces `status: 'Review'` and writes `reviewRequestedBy`
- `lastModifiedBy` field on `PromptTemplate` written on every save; detail header shows "Modified just now · by [Name] · N variables"
- Context Panel (Trail Insights) stays in sync after `onStatusChange` — no stale snapshot after Approve/Request Revision

**Penny Co-Pilot panel UX**
- `overflow-hidden` + `h-full` removed from `PennyCopiloPanel` root — these caused the `shrink-0` footer (Re-check button + input) to fall outside the CSS clip boundary and absorb pointer events even while visually painted
- Re-check button moved to `shrink-0` footer section, outside `overflow-y: auto` scroll region
- `isFetching` wired through `useCapabilityPreflight` hook → Re-check button shows spinner and "Checking…" label during active refetch; `staleTime: 0` ensures every Re-check hits the server

### Changed

- `Program_Engagement__c` → `pmdm__ProgramEngagement__c` in all capability requirement definitions (both `artifacts/api-server/src/routes/penny.ts` and `artifacts/program-map/src/data/capabilityRequirements.ts`) — the bare unnamespaced object does not exist in the live org; the real API name carries the `pmdm__` namespace prefix
- `Training_Plan_Item__c` removed from all preflight requirement definitions — confirmed absent from the live org
- `Training_Plan__c` references removed from standards data
- `TT_Automation__c` custom fields moved from `phase2Deferred` to `requiredFields` — all four fields confirmed live
- Knowledge Retrieval capability maturity advanced from `'Prototype'` to `'Integrated'` — RAG pipeline is live over the Knowledge Library

### Fixed

- Cohort Summaries preflight was silently skipping its Salesforce check — now always probes `pmdm__ServiceSchedule__c`
- Preflight page freeze when many SF objects time out concurrently — each object now has an independent timeout; one stall does not block others
- Org probe script hard-coded API version — updated to match server constant (`v62.0`)
- `PromptTemplate.audience` type bug — `default` was passing `string[]` instead of `string` (first element)

### Tests

**Test suite expanded (352 tests across 18 files)**
- `pennyPreflight.test.ts` — added: `pmdm__ProgramEngagement__c` guard (bare `Program_Engagement__c` must never appear in any preflight response); `cap-resume-review` missing-status check for `sf-program-engagement`; `pmdm__ServiceSchedule__c` probe suite (met / missing / throttled / 403); per-object timeout path (timeout → `undetermined`, never `missing`)
- `sfGovernanceAutomations.test.ts` (new) — unit + route integration tests for `TT_Automation__c` governance route
- `sfGovernanceBuildItems.test.ts` (new) — 500 on query failure, no stack trace or SOAP XML leaked; POST `createRecord` failure tests
- `sfGovernanceClassroomNudges.test.ts` (new) — GET query-failure tests; POST `createRecord` failure, 500 body checks
- `sfGovernanceNudges.test.ts` (new) — governance nudge route coverage
- `sfValidateCustomFields.test.ts` (new) — missing Penny fields surface as warning; custom field checks never report missing when describe is unavailable (generic error path)
- `sfCacheIsolation.test.ts` (new) — `flushSfCacheForUser` clears stale error payloads from ops-summary cache
- `salesforce.test.ts` (updated) — 429 rate-limit tests for describe calls in Validation Center; `TT_Automation__c` reflected as live check

---

## [1.2.0] — 2026-07-16 — DB-backed Prompt Studio & Expanded Test Suite

### Added

**Penny Prompt Studio — DB-backed Prompt Templates**
- `prompt_templates` PostgreSQL table — `id text PK`, `data jsonb`, `created_at`, `updated_at`; Drizzle schema pushed
- `GET /api/penny/prompt-templates` — list all templates ordered by creation date; maps DB rows to their `.data` field
- `POST /api/penny/prompt-templates` — create one template; validates `id` + `name`; returns 400 on missing fields
- `POST /api/penny/prompt-templates/seed` — idempotent bulk insert; skips existing (ON CONFLICT DO NOTHING); returns `{ seeded, total }`
- `PATCH /api/penny/prompt-templates/:id` — partial merge update; path `id` takes precedence over body; 404 when not found
- `usePromptTemplates` hook — TanStack Query with optimistic cache updates; auto-seeds from static `promptTemplates` data on first empty-DB load
- `PennyPromptStudio.tsx` Templates tab wired to `usePromptTemplates` hook

**Penny Prompt Studio — DB-backed Prompt Variables**
- `prompt_variables` PostgreSQL table — same schema shape as `prompt_templates`; Drizzle schema pushed
- `GET /api/penny/prompt-variables` — list all variables ordered by creation date
- `POST /api/penny/prompt-variables` — create one variable; validates `id` + `name`; 400 on missing fields
- `POST /api/penny/prompt-variables/seed` — idempotent bulk insert; returns `{ seeded, total }`
- `PATCH /api/penny/prompt-variables/:id` — partial merge update; 404 when not found
- `usePromptVariables` hook — TanStack Query with optimistic updates; auto-seeds from static `promptVariables` data on first empty-DB load
- `VariablesView` — upgraded from static read-only list to live editable split panel:
  - Variable list (left) + detail panel (right, toggled by row click)
  - "New Variable" button opens `RailActionPanel` with all fields (placeholder, label, type, source, description, example, required)
  - "Edit" button in detail panel opens `RailActionPanel` pre-filled with current variable values
  - Both create/update call hook mutations with optimistic UI update + DB persist + cache invalidate

**Test suite expanded (49 → 105 tests across 7 files)**
- `promptTemplates.test.ts` (api-server, new) — 16 tests: GET shape, row mapping, POST 201/400, seed counts + conflict handling, PATCH 200/404 with id-precedence check; uses `vi.hoisted()` + `vi.mock('@workspace/db')` fluent-builder mock pattern
- `promptVariables.test.ts` (api-server, new) — 16 tests: identical contract coverage for `/api/penny/prompt-variables` routes
- `pennyStudioData.test.ts` (program-map, new) — 24 tests: `promptVariables` (id uniqueness, name uniqueness, required fields, valid `VariableType`, non-empty source), `promptTemplates` (id/name uniqueness, valid `PromptStatus`/`HallucinationRisk`/`PromptDomain`, config coverage), `outputFormats`, `versionHistory`, `PROMPT_STATUS_CONFIG`, `RISK_CONFIG`
- `routes.smoke.ts` (program-map, updated) — comprehensive refresh: 40+ missing redirects added (navigator/*, demand/*, curriculum/*, library/*, communications/*, penny-retired/*, admin-legacy/*); stale active entries corrected; all `admin/integrations/*` and individual `collaboration/*` active routes added

### Changed

- `/admin/setup` now redirects to `/admin/integrations` — the Integration Hub is the canonical admin entry point
- `/penny/integrations` and `/penny/integration-layer` now redirect to `/admin/integrations` (previously `/admin/setup`)
- `VariablesView` — replaced static read-only list with live DB-backed editable split panel

### Fixed

- Routes smoke manifest: `/admin/google-oauth` and `/admin/secrets-audit` corrected from `active` to `redirect`; `/penny/integrations` and `/penny/integration-layer` targets corrected from `/admin/setup` to `/admin/integrations`; `/admin/setup` corrected from `active` to `redirect`

---

## [1.1.0] — 2026-06-18 — Live AI, Gmail, Calendar, Drive, Agentforce & Clerk v6

This release activates all Phase 1 live integrations: Penny/Gemini goes from POC to a production-ready multi-turn AI assistant, Gmail and Google Calendar become fully interactive from the Topbar, Google Drive surfaces Penny's asset corpus, Agentforce adds dual-AI coaching, and Clerk v6 with Google Groups establishes role-gated access for all tiers. Fourteen new pages, three global slide-over panels, five test files, and three live Salesforce data hooks ship in this release.

### Added

**Penny / Gemini AI (live)**
- `POST /api/penny/ask` — multi-turn Gemini 2.5 Flash endpoint; accepts `query`, `role`, `history[]`, `context`; returns `reply` + `durationMs`; billing confirmed active (`serviceTier: standard`)
- `POST /api/penny/retrieve` — RAG retrieval endpoint; returns ranked corpus chunks filtered by tier
- `AskPennyPanel` — global slide-over panel in Topbar (violet pill, Sparkles icon); always mounted, mutually exclusive with Calendar and Gmail panels; `pendingPennyQuery` in AppContext pre-fills and auto-fires from any page via `PagePennyGuide`
- `TestPenny` page at `/penny/test` — live chat UI; multi-turn history up to 10 turns; displays response timing; role passed to Gemini on every request
- `PennyCommandCenter` page at `/penny` — hub landing with capability summary, live signal feed, and Ask Penny quick-access

**Gmail (live)**
- `GET /api/gmail/validate` — confirms OAuth scope and inbox access
- `GET /api/gmail/threads` — fetches real inbox threads via `gmail.readonly` scope
- `POST /api/gmail/send` — sends email via `gmail.send` scope; Penny draft-assist available before send
- `GmailCenter` page at `/collaboration/gmail` — real inbox view with thread list and Penny draft panel
- `GmailActionPanel` — global slide-over panel in Topbar (rose pill, Mail icon); compose + Penny draft assist

**Google Calendar (live)**
- `GET /api/calendar/events` — fetches real upcoming events via Google Calendar API
- `CalendarActionPanel` — global slide-over panel in Topbar (emerald pill, CalendarDays icon); shows live events with Penny prep brief per event; mutually exclusive with Penny and Gmail panels

**Google Drive (live)**
- `GET /api/drive/status` — confirms Drive OAuth token health
- `GET /api/drive/penny-assets` — lists Penny knowledge assets from Drive corpus folder
- `GET /api/drive/penny-assets/folders` — lists Drive folder structure for corpus management
- `PennyAssetLibrary` page at `/penny/asset-library` — browse and inspect Drive-backed Penny knowledge assets

**Agentforce (live POC)**
- `GET /api/agentforce/status` — confirms Agentforce Sessions API connectivity
- `POST /api/agentforce/invoke` — routes messages to Agentforce Sessions API; full request/response cycle
- `POST /api/agentforce/test` — smoke-test endpoint; returns session status and agent response sample
- `AgentforceCenter` page at `/penny/agentforce` — dual-AI coexistence dashboard; Penny vs Agentforce capability matrix (10 rows); live test button; POC validation checklist
- `Assessments` page at `/penny/assessments` — assessment delivery UI with Penny coaching and Agentforce result-write design

**Clerk v6 + Google Groups access tiers (live)**
- `SignInPage` — Clerk v6 `<SignIn>` component with Google OAuth as primary provider; replaces custom auth flow
- `GET /api/auth/tier` — resolves user tier (`everyday` / `power` / `admin` / `superadmin`) from Google Groups membership via DWD service account; cached per session
- `GET /api/auth/groups-status` — returns raw group membership list for Admin debugging
- `clerkProxyMiddleware` — proxies Clerk frontend API through Express to satisfy Clerk v6 proxy requirements
- `googleGroups.ts` route — Google Groups DWD lookup using `groups/{groupEmail}/members` (`member.readonly` scope); impersonation requires Workspace Admin role

**New Penny hub pages**
- `TrailQuests` at `/penny/trail-quests` — quest delivery browser with curriculum cross-reference and learner delivery status
- `Intelligence` at `/penny/intelligence` — Sprint 3 preview: Learner Trend Analysis, Cohort Health Signals, Weekly Report Archive cards
- `PennyCapabilityRegistry` at `/penny/capabilities` — full capability registry with maturity, domain, POC status, and relationship cards
- `PennyPromptStudio` at `/penny/prompts` — prompt template governance; variable registry; output format library; create-template form

**New Administration pages**
- `AdminSetup` at `/admin/setup` — unified administration landing
- `IntegrationHub` at `/admin/integrations` — single integration entry point; token health, config status, and quick links per integration; sub-pages: `/admin/integrations/google-auth`, `/admin/integrations/google-drive`, `/admin/integrations/google-calendar`, `/admin/integrations/secrets`
- `PeopleAccess` at `/admin/people-access` — user and access tier management; Google Groups membership viewer
- `AccessRolesMatrix` — tier × feature permission reference table embedded in People & Access
- `IntegrationSecretsAudit` — Super Admin secrets inventory; consolidated from standalone `/admin/secrets-audit`

**Collaboration**
- `MyTrailSignals` at `/collaboration/my-signals` — Power-tier Trail Signals feed filtered to current user's context
- `CommunicationRouting` — signal routing rules: configures how each channel (Slack, Gmail, Calendar, Drive) feeds Penny and Trail Signals
- `CommunicationChannels`, `MessageTemplates` — channel configuration and template management (admin)

**Live Salesforce data hooks**
- `useSfOpsCases` — fetches live SF Cases via `/api/salesforce/cases`; exports `SfCase` type and `caseAge` utility; row-level Penny focus via `pendingPennyQuery` + `border-l-2` highlight
- `useSfOpsPrograms` — fetches live SF Program Engagement records for Operations hub
- `useSfOpsSummary` — fetches live SF org summary counts; exports `formatSyncAge` timestamp utility

**Test infrastructure**
- `vitest.config.ts` added to both `artifacts/program-map` and `artifacts/api-server`
- `formatSyncAge.test.ts` — unit tests for sync age formatting utility
- `health.test.ts` — API health endpoint smoke tests
- `salesforce.test.ts` — Salesforce route response shape tests
- `routes.smoke.ts` — type-checked route manifest listing every active route and redirect; validated by `pnpm typecheck`
- `validationData.test.ts` — integration readiness data validation tests

### Changed

**Administration sidebar consolidated**
- Sidebar Administration group reduced to three items: Setup (`/admin/setup`), Integrations (`/admin/integrations`), People & Access (`/admin/people-access`)
- All Google OAuth, Secrets Audit, and sub-integration pages moved under `/admin/integrations/*`
- Old paths `/admin/google-oauth` and `/admin/secrets-audit` redirect to `/admin/integrations`

**Penny Hub expanded**
- Added tabs: Trail Quests, Assessments, Agentforce, Asset Library
- `/penny/integration-layer` redirected to `/admin/setup`; integration config consolidated into Administration
- Sidebar Penny sub-nav items gated to `minTier: admin`; Power users navigate via hub tab bar

**Collaboration Hub**
- `My Trail Signals` added as first Power-tier sub-nav item (`minTier: power`)
- `Calendar` (live) and `Gmail` (live) replace former placeholder collaboration links
- Collaboration Overview reframed as a signal routing rule management hub, not an activity feed

**Topbar global panels**
- Three mutually exclusive slide-over panels now anchor to Topbar: Ask Penny (violet), Calendar (emerald), Mail (rose)
- Opening any panel closes the other two; state held in AppContext (`askPennyOpen`, `calendarPanelOpen`, `gmailPanelOpen`)
- `SignalsIndicator` component: context-aware Trail Signals pill; amber pulse dot when `urgent > 0`; renders only when `SIGNAL_COUNTS[context].total > 0`

**GitHub automation**
- `sync-docs.yml` GitHub Actions workflow: validates docs on push and PR; auto-appends `### Docs` subsection to `[Unreleased]` when `TRAIL_OS_SPEC.md` or `ROADMAP.md` change; moves `latest-docs` tag; tag step guarded to push events only
- `post-merge.sh`: runs `drizzle-kit push` and attempts `git push` to origin on every task merge
- `CONTRIBUTING.md`: added Branch Protection Rules section (PR required, force-push disabled, `validate-and-tag` required status check, setup instructions)

### Fixed

- **SF Lightning URL construction** — replaced `Organization.InstanceName` (returns legacy domain) with `GET /services/oauth2/userinfo → urls.sobjects` to derive true org base URL; case links now build correctly as `{orgBaseUrl}/lightning/r/Case/{Id}/view`
- **Google OAuth re-auth** — re-running OAuth flow required after initial setup to populate `GOOGLE_GMAIL_REFRESH_TOKEN`; documented in Integration Hub setup wizard
- **Clerk v5 → v6 upgrade** — v5.54.0 was broken; stable is v6.9.1; `SignedIn`/`SignedOut` renamed to `Show`; `colorInputBackground` renamed to `colorInput`; `@clerk/shared` added as direct `api-server` dependency to resolve `/keys` import
- **Google Groups DWD scope** — must use `groups/{groupEmail}/members` with `member.readonly`; `groups?userKey=` requires a broader scope and fails silently; impersonation email must hold Workspace Admin role (Groups Admin role is insufficient)

---

## [1.0.0] — 2026-06-12 — Phase 1 Complete

This release marks the completion of Phase 1: a fully navigable, role-aware internal operating platform with live Salesforce and Slack integrations, a complete UX audit, and 19 Phase 2 backlog items catalogued.

### Added

**Phase 1 Completion Audit**
- `/admin/phase1-audit` — comprehensive completion audit page with 42-page UX review table, 26-item hardcoded content inventory, test coverage summary (0 automated / 70 metadata / 4 smoke tools), 13-capability Penny POC review, and final verdict card
- 9 new Phase 2 backlog cards: `p2-penny-live-llm`, `p2-penny-rag`, `p2-trail-quest-live`, `p2-penny-assessment`, `p2-coaching-flows`, `p2-sf-live-queries`, `p2-agentforce`, `p2-trail-signals-engine`, `p2-vitest-automation`

**Knowledge Hub — Overview-first landing**
- `KnowledgeOverview` component at `/knowledge` — command center with source health bars, trust breakdown, sync coverage, Penny readiness, needs-attention list, and Penny guidance section
- Sources workspace moved to `/knowledge/sources`
- Sidebar updated: added `Overview` item at `/knowledge`, `Sources` now at `/knowledge/sources`

**Programs Hub — Overview-first landing**
- `ProgramOverview` component at `/program` — command center with program health list, blueprint coverage bars, Penny coverage per-program, standards readiness grid, and Penny guidance section
- Programs workspace moved to `/program/programs`
- Sidebar updated: added `Overview` item at `/program`, `Programs` now at `/program/programs`

**Repository documentation**
- `README.md` — project overview, quick start, stack, integration status
- `TRAIL_OS_SPEC.md` — full technical specification (18 sections)
- `CONTRIBUTING.md` — development workflow, branch conventions, PR process
- `SECURITY.md` — secrets policy, vulnerability reporting, integration security notes
- `CHANGELOG.md` — this file
- `ROADMAP.md` — Phase 2 themes and priorities
- `.env.example` — environment variable reference (no values)
- GitHub PR template and issue templates

### Fixed

**Phase 1 UX violations**
- `GovernanceHub.tsx` — replaced 4 `font-serif` instances with `font-bold`/`font-semibold`
- `TrailOSOverview.tsx` — replaced `font-serif` on platform metrics with `font-semibold`
- `ContextHub.tsx` — replaced `font-serif` on active context name with `font-semibold`
- `Phase2Backlog.tsx` — added `stone` hue to `HUE_MAP` to prevent runtime crash on `p2-vitest-automation` card

---

## [0.9.0] — 2026-06 — Google OAuth + Collaboration Hub

### Added
- Google OAuth wizard at `/admin/google-oauth` — 5-step UI flow
- API routes: `GET/POST /api/google/oauth/*` (initiate, callback, exchange, refresh, revoke)
- Collaboration hub restructured with overview-first pattern (reference implementation)
- Collaboration sub-integrations: Slack, Google Drive, Google Calendar integration centers
- SlackValidationProvider with auto-validation on mount
- `CommChannels`, `MessageTemplates`, `WeeklyBriefs`, `CommNotifications` pages

### Fixed
- Express 5 type compatibility: `req.params` cast to `string` in Google OAuth routes

---

## [0.8.0] — 2026-05 — Phase 1 Readiness + Admin Tooling

### Added
- `/admin/phase1-readiness` — live integration readiness checklist
- `/admin/integration-readiness` — full integration health dashboard
- `/admin/secrets-audit` — Super Admin secrets inventory tool
- `/admin/ux-standards` — Phase 1 UX compliance reference page
- `/admin/phase2-backlog` — 10-card Phase 2 Kanban backlog (initial set)
- `readinessState.ts` — single source of truth for integration statuses
- Centralized terminology in `src/config/terminology.ts`

---

## [0.7.0] — 2026-04 — Salesforce Live Integration

### Added
- Salesforce REST API connected — PMM + NPSP confirmed
- `/admin/sf-validation` — Salesforce object validation center
- `/admin/salesforce-arch` — Salesforce architecture mapping
- API routes: `GET /api/salesforce/*`
- `salesforceArchitectureData.ts` — 12 SF objects with mapping status

### Changed
- Moved SF Validation and Program Resources from Programs sidebar to Administration

---

## [0.6.0] — 2026-03 — Digital Twin + Penny Hub

### Added
- Digital Twin hub — 4-tab guided compass (Explore, Map, Impact, Governance)
- Unified Object Model (`/uom`) and Governance (`/governance`) as Digital Twin sub-sections
- Penny Command Center hub — Capabilities, Prompt Studio, Learners, Intelligence, Test Penny
- Gemini POC test interface at `/penny/test`
- `pennyCapabilityData.ts` — 13 capabilities with POC state and risk level
- Phase 1 Integration Layer at `/penny/integration-layer`

---

## [0.5.0] — 2026-02 — Knowledge + Operations Hubs

### Added
- Knowledge hub — Sources (KnowledgeWorkspace), Library (SourceDocs), Relationships, Org Memory placeholder
- `knowledgeSourceData.ts` — 14 sources with full governance metadata, `SOURCE_SUMMARY` export
- Operations Center hub — Executive Overview, Health Indicators, Scorecards, Trends, Demand
- `operationalIntelligenceData.ts` — domain health, scorecards, trends, recommendations

---

## [0.4.0] — 2026-01 — Programs Hub + Curriculum

### Added
- Programs hub — ProgramWorkspace (left-list/right-detail), StandardsStudio, ProgramBlueprint
- `programs.ts` — 5 programs with full metadata
- `standardsData.ts` — Program, Module, Lesson, Assessment, Penny standards
- `curriculumData.ts` — sprint and curriculum structures

---

## [0.3.0] — 2025-12 — Role Model + ContextBar

### Added
- `useTierFlags` hook — `isEveryday`, `isPower`, `isPowerOrAbove`, `isAdminOrAbove`, `isSuperAdmin`
- `accessTiers.ts` — tier definitions and `canAccess` utility
- Three-path ContextBar: `EverydayContextBar`, `PowerContextBar`, `AdminContextBar`
- ContextPanel right rail with Penny Insights and Ask Penny tabs
- Lens picker (Executive / Builder) in Topbar

---

## [0.2.0] — 2025-11 — AppShell + Navigation

### Added
- `AppShell` — root shell with Sidebar, Topbar, ContextPanel
- `Sidebar.tsx` — 220px collapsible 7-group sidebar with tier-gated groups
- `HubShell` — reusable hub layout with tabs and ActionBar
- `ObjectWorkspace` — left-list/right-detail workspace component
- `ActionBar`, `RelationshipCard`, `EmptyState` shared workspace components
- Administration hub — URL-routed 11-section admin home

---

## [0.1.0] — 2025-10 — Project Foundation

### Added
- pnpm monorepo scaffold
- `artifacts/program-map` — React + Vite frontend
- `artifacts/api-server` — Express 5 API server
- PostgreSQL + Drizzle ORM setup
- AppContext with in-memory prototype data
- Initial routing with wouter
- TypeScript 5.9 strict mode across all packages
