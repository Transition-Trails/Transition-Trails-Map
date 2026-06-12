# Changelog — Trail OS

All notable changes to Trail OS are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

Changes on `dev` branch not yet merged to `main`.

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
