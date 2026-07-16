# TRAIL_OS_SPEC.md

> **Specification for Trail OS Operating Platform — Transition Trails**  
> Version: 1.1 · Phase 1 Complete · June 2026  
> Status: Internal prototype — Clerk v6 + Google Sign-In live · deployed on Replit

---

## Table of Contents

1. [Product Purpose](#1-product-purpose)
2. [Platform Architecture](#2-platform-architecture)
3. [User Role Model](#3-user-role-model)
4. [Phase 1 Scope and Completion Status](#4-phase-1-scope-and-completion-status)
5. [Phase 1 UX Standards](#5-phase-1-ux-standards)
6. [Canonical Page Ownership Rules](#6-canonical-page-ownership-rules)
7. [Navigation Architecture](#7-navigation-architecture)
8. [Hub and Workspace Patterns](#8-hub-and-workspace-patterns)
9. [Ask Penny / Penny Insights / Trail Signals Architecture](#9-ask-penny--penny-insights--trail-signals-architecture)
10. [Section-by-Section Reference](#10-section-by-section-reference)
    - [Digital Twin](#101-digital-twin)
    - [Operations Center](#102-operations-center)
    - [Programs & Curriculum](#103-programs--curriculum)
    - [Penny Command Center](#104-penny-command-center)
    - [Knowledge](#105-knowledge)
    - [Collaboration](#106-collaboration)
    - [Administration](#107-administration)
11. [Integration Architecture](#11-integration-architecture)
12. [Salesforce / Slack / Google / Gemini Status](#12-salesforce--slack--google--gemini-status)
13. [Testing Strategy](#13-testing-strategy)
14. [Hardcoded and Demo Data Classification](#14-hardcoded-and-demo-data-classification)
15. [Phase 2 Backlog Themes](#15-phase-2-backlog-themes)
16. [Penny POC Incorporation Strategy](#16-penny-poc-incorporation-strategy)
17. [Non-Goals and Deferred Features](#17-non-goals-and-deferred-features)
18. [Secrets and API Keys Policy](#18-secrets-and-api-keys-policy)

---

## 1. Product Purpose

Trail OS is the unified internal operating platform for the Transition Trails team. It replaces a set of disconnected tools and spreadsheets with a single shell that consolidates program management, operations intelligence, knowledge governance, Penny AI command, learner tracking, and organizational administration.

**Core goals of Trail OS:**

- Give program directors and coaches a single place to understand what is happening across all programs, cohorts, and learners.
- Surface the right data at the right time through Penny, rather than requiring users to navigate to find it.
- Govern the quality of knowledge sources, program blueprints, and standards so that content and AI both improve over time.
- Create an integration layer that connects Salesforce, Slack, Google Workspace, and AI providers without replacing them.
- Support a multi-tier user model that shows each role exactly what they need and nothing more.

Trail OS is **not** a consumer product. It is built for a small internal team of ~10–30 users at Transition Trails. Design decisions prioritize information density, role awareness, and operational clarity over consumer UX conventions.

---

## 2. Platform Architecture

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Wouter (routing), shadcn/ui, Tailwind CSS, Framer Motion |
| Language | TypeScript 5.9 (strict mode) |
| Runtime | Node.js 24 |
| Package manager | pnpm workspaces (monorepo) |
| API server | Express 5 (port 8080) |
| Database | PostgreSQL + Drizzle ORM |
| State management | TanStack Query + AppContext (in-memory prototype) |
| Icons | lucide-react |
| Deployment | Replit (dev + hosted preview) |

### Monorepo structure

```
artifacts/
  program-map/          # Frontend React + Vite app
    src/
      App.tsx           # Route definitions — 40+ routes + legacy redirects
      context/
        AppContext.tsx   # Global state, tier, selected item, context engine
      components/
        layout/
          AppShell.tsx   # Root shell (Sidebar + Topbar + ContextPanel)
          Sidebar.tsx    # 220px collapsible 7-group sidebar
          Topbar.tsx     # Breadcrumb + Lens picker
          ContextPanel.tsx  # Right-rail "Knowledge Brief"
        platform/
          PageShell.tsx  # Shared stub wrapper + StatusDot + StatCard + OpsHeader
        workspace/
          ActionBar.tsx
          ObjectWorkspace.tsx
          RelationshipCard.tsx
          EmptyState.tsx
          HubShell.tsx
      pages/             # All page components by section
      data/              # 30+ typed in-memory data files
      config/            # accessTiers.ts, terminology.ts
      hooks/             # useTierFlags.ts, use-mobile.tsx
  api-server/           # Express 5 API
    src/
      routes/            # health, slack, google, salesforce, gemini, secrets
lib/                     # Shared TypeScript packages (composite, emit declarations)
scripts/                 # Utility scripts
pnpm-workspace.yaml
tsconfig.base.json
tsconfig.json            # Solution file for libs only
```

### Routing

Routing uses `wouter`. The application uses a flat Hub model — all primary sections are hubs (`/program`, `/knowledge`, `/penny`, etc.) with sub-tabs handled internally by `HubShell`. Legacy paths from earlier architectures (e.g., `/navigator/*`, `/library/*`, `/curriculum/*`) are preserved as client-side redirects so that existing links do not break.

### Data model (Phase 1)

Most data is in-memory prototype state initialized in `AppContext`; edits reset on page refresh. **Exception:** `prompt_templates` and `prompt_variables` are persisted to PostgreSQL via the API server and survive restarts (seeded automatically on first empty-DB load). The broader data layer uses typed TypeScript interfaces and constants in `src/data/`, providing a realistic demonstration of production data shapes.

---

## 3. User Role Model

Trail OS has four user tiers. The active tier is set via the tier switcher in the sidebar footer during the prototype phase. In production, tier is auto-assigned from Google Groups membership via Clerk v6 (see below).

| Tier | Internal ID | Who it represents | Access |
|---|---|---|---|
| **Everyday** | `everyday` | Learners, participants, basic staff | My Programs, Documents, limited Penny features |
| **Power** | `power` | Coaches, program facilitators, content creators | All operational hubs, full Penny, Standards, Communications |
| **Admin** | `admin` | Program directors, operations leads | Everything Power has + Administration, Blueprint, People & Access, Integration configuration |
| **Super Admin** | `superadmin` | Platform owners, technical leads | Everything Admin has + Secrets Audit, Google OAuth wizard, Phase 1/2 tooling |

In production, tier is auto-assigned from **Google Groups membership** via Clerk v6 on each sign-in. Three Google Workspace groups are configured: `trailosusers@transitiontrails.org` (Everyday), `trailospennyadmin@transitiontrails.org` (Power), `trailosadmin@transitiontrails.org` (Admin). Super Admin is email-whitelist only (prototype). The API endpoint `/api/auth/tier` performs the group lookup; full auto-assignment requires `GOOGLE_ADMIN_CREDENTIALS` (service account) + `GOOGLE_ADMIN_IMPERSONATE_EMAIL` in Replit Secrets. Without these, all `@transitiontrails.org` users default to Everyday.

### Tier flags (`useTierFlags` hook)

```typescript
isEveryday:     userTier === 'everyday'
isPower:        userTier === 'power'
isPowerOrAbove: tier is 'power' | 'admin' | 'superadmin'
isAdminOrAbove: tier is 'admin' | 'superadmin'
isSuperAdmin:   userTier === 'superadmin'
```

### Tier gating rules

- **Sidebar groups**: each group has a `minTier` that hides it entirely below that tier.
- **Hub tabs**: tabs are conditionally included via `...(!isEveryday ? [...] : [])` pattern.
- **ActionBar**: not shown to Everyday users on any page.
- **Page content**: Everyday users see plain-language descriptions; Power/Admin see governance metadata and operational controls.
- **Administration section**: hidden from Everyday and Power users.

---

## 4. Phase 1 Scope and Completion Status

Phase 1 was defined as: build the complete navigational shell, populate all sections with realistic prototype data, establish UX standards, wire live integrations for Salesforce and Slack, and prepare for Phase 2 AI and data connectivity.

### Phase 1 completion summary (June 2026)

| Category | Count | Status |
|---|---|---|
| Pages / routes | 50+ | ✅ All built |
| Sidebar groups | 7 + global | ✅ Complete |
| Hub sections with Overview landing | 5 | ✅ Programs, Knowledge, Collaboration, Digital Twin, Operations |
| UX violations (font-serif) | 6 found → 0 remaining | ✅ Fixed |
| Salesforce REST API | Live | ✅ 127 Accounts · 129 Contacts · PMM + NPSP |
| Slack bot | Live POC | ✅ @coachconnectbot posting confirmed |
| Penny / Gemini AI | Live | ✅ Gemini 2.5 Flash · POST /api/penny/ask · billing active |
| Gmail integration | Live | ✅ gmail.readonly + gmail.send · real inbox |
| Google Calendar | Live | ✅ Real events via /api/calendar/events |
| Agentforce | Live POC | ✅ Sessions API · dual-AI coaching on Assessment page |
| Clerk v6 + Google Sign-In | Live | ✅ Google OAuth · Google Groups auto-tier |
| Automated test suite | 105 | ✅ Live — 7 files across api-server + program-map |
| Metadata-driven readiness cases | 70 | ✅ |
| Hardcoded content items | ~28 | Classified (12 OK, 11 Phase 2, 5 stale) |

### Phase 1 canonical audit

A full Phase 1 Completion Audit page is available in the app at `/admin/phase1-audit`. It contains:
- Per-page UX review (42 pages, each rated Pass / Fixed / Watch)
- Hardcoded content inventory with Phase 2 linkage
- Test coverage summary
- Penny POC review (13 capabilities rated)
- Final verdict: **CONDITIONALLY COMPLETE**

---

## 5. Phase 1 UX Standards

All pages must conform to these standards. The authoritative source is `/admin/ux-standards` in the app.

### Typography

| Element | Class |
|---|---|
| Section eyebrow label | `text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50` |
| Page / section title | `text-[15px] font-semibold` or `text-base font-semibold` |
| Body text | `text-[12px] text-foreground` or `text-[11px] text-muted-foreground` |
| Stat value | `text-xl font-semibold` (never `text-2xl` or `text-3xl`) |
| Badge/tag text | `text-[9px] font-bold` or `text-[10px] font-bold` |

**`font-serif` is prohibited everywhere in Trail OS.** Use `font-semibold` or `font-bold` for emphasis.

### Layout

- Cards: `rounded-lg border border-border bg-white p-4`
- Section containers: `rounded-lg border border-border bg-muted/20 p-4`
- Two-column grids: `grid grid-cols-1 md:grid-cols-2 gap-4`
- No modal or slide-over overlays — use inline panels or tabs instead.
- No empty default detail panes — all pages must show meaningful content at first render.
- No hero/intro cards at the top of operational pages.

### Interaction

- Hub overview pages use card-based navigation (NavCard pattern) not empty split-panes.
- Workspace pages (Sources, Programs list) use the `ObjectWorkspace` left-list/right-detail pattern — these are **secondary tabs**, never the default landing.
- All navigation links use `useLocation` + `setLocation` from wouter, not anchor tags.
- Tabs use the underline tab style (not pill buttons) wherever HubShell is used.

### Role gating at the UX level

- Everyday users: plain language, single tab, no ActionBar, no governance metadata.
- Power users and above: operational controls, multi-tab hubs, ActionBar actions.
- Admin+ only: Administration group, Blueprint canvas, People & Access.
- Super Admin only: Secrets Audit, Google OAuth wizard, Phase 1/2 audit tools.

---

## 6. Canonical Page Ownership Rules

Each section of Trail OS has a canonical owner. Content and tooling that belongs to a specific audience must not bleed into other sections.

| Content type | Canonical location | NOT in |
|---|---|---|
| Program health, curriculum, blueprint | Programs hub | Administration |
| Knowledge source governance, trust reviews | Knowledge → Sources | Administration |
| Salesforce integration config | Administration → SF Validation | Programs |
| Slack integration config | Collaboration → Slack | Administration |
| Google Drive integration config | Collaboration → Drive | Administration |
| Google OAuth wizard | Administration → Google OAuth | Collaboration |
| AI capability governance | Penny hub | Administration |
| Integration readiness dashboard | Administration → Integration Readiness | Penny |
| Phase 1/2 tooling | Administration (Super Admin) | any other section |
| Org standards and quality rulebook | Programs → Standards | Knowledge |
| Source document archive | Knowledge → Library | Administration |
| Learner communication templates | Collaboration → Templates | Penny |
| People and role access | Administration → People & Access | Operations |

**Admin-only setup and security items must stay in Administration.** If a page could reasonably serve both operations and admin users, prefer the more operational hub and gate admin-only sections by tier.

---

## 7. Navigation Architecture

### Sidebar groups

| Group | Base path | Min tier | Items |
|---|---|---|---|
| Digital Twin | `/digital-twin` | power | Explore, Governance |
| Operations | `/operations` | admin | Executive Overview, Health Indicators, Scorecards, Trends & Insights, Demand |
| Programs | `/program` | admin | Overview, Programs, Standards, Blueprint |
| Penny | `/penny` | admin | Capabilities, Prompt Studio, Learners, Intelligence, Test Penny |
| Knowledge | `/knowledge` | admin | Overview, Sources, Library, Relationships, Org Memory |
| Collaboration | `/collaboration` | admin | Overview, Slack, Google Drive, Google Calendar, Channels, Templates |
| Administration | `/admin` | admin | Knowledge Management, People & Access, Setup, Integration Readiness, Phase 1 Readiness, UX Standards, Phase 2 Backlog, Phase 1 Audit |

### Global nav items (always visible)

| Item | Path | Description |
|---|---|---|
| Home | `/` | Dashboard landing |
| Trail OS Overview | `/trail-os-overview` | Platform map |
| Global Search | `/search` | Cross-system search |
| Context Engine | `/context` | Active context management |

### Lens picker

The Lens picker is rendered within the Program Map page (`/navigator/program-map`) as a component-level control — it is not a Topbar element and does not appear on other routes. It offers two lenses:

| Lens | Color | Purpose |
|---|---|---|
| Executive | Amber | High-level program and health view |
| Builder | Sky | Technical detail and configuration view |

The active lens is stored as `activeLens` in AppContext (default: `'builder'`). The `PortfolioPulse` component inside `ProgramMap.tsx` reads `activeLens` to switch its display mode.

### ContextBar

The ContextBar is a persistent 32–40px strip always mounted below the Topbar. It is never null. Three rendering paths:

- **Everyday**: auto page label, no controls
- **Power**: "Current Focus" language, set/clear
- **Admin/Super Admin**: full Context Engine with switcher and health indicators

### Legacy redirect map

The following paths are preserved as client-side redirects:

| Old path | New canonical path |
|---|---|
| `/navigator/program-map` | `/program` |
| `/navigator/knowledge-relationships` | `/knowledge/relationships` |
| `/library/documents` | `/knowledge/library` |
| `/library/knowledge-sources` | `/knowledge` |
| `/library/source-mapping` | `/knowledge/relationships` |
| `/curriculum/blueprint` | `/program/blueprint` |
| `/curriculum/standards` | `/program/standards` |
| `/program/sf-validation` | `/admin/sf-validation` |
| `/program/resources` | `/admin/program-resources` |
| `/program/salesforce` | `/admin/salesforce-arch` |

---

## 8. Hub and Workspace Patterns

### HubShell

Every major section uses `HubShell` as its layout wrapper.

```typescript
<HubShell
  title="Knowledge"
  icon={BookOpen}
  description="Review source quality..."
  actions={HUB_ACTIONS}   // optional ActionBar items
  tabs={TABS}              // HubTab[]
/>
```

`HubShell` hides the tab bar when `tabs.length <= 1` (Everyday single-tab pattern).

### Overview-first pattern

All hubs follow the **overview-first** pattern established by Collaboration:

1. **First tab** = `Overview` at the hub's base path. Renders an insights-driven command center with real data, stat pills, two-column grids, and Penny guidance. No empty panes.
2. **Subsequent tabs** = workspace tabs (left-list/right-detail), functional tools (Standards, Blueprint), and integration centers.

| Hub | Overview path | Workspace path |
|---|---|---|
| Programs | `/program` | `/program/programs` |
| Knowledge | `/knowledge` | `/knowledge/sources` |
| Collaboration | `/collaboration` | `/collaboration/slack` etc. |
| Penny | `/penny` | `/penny/capabilities` etc. |

### ObjectWorkspace

Used for the left-list/right-detail pattern in Sources, Programs, and Penny workspaces. The selected item's detail is shown in a multi-tab right pane. An empty state is shown when no item is selected. Never the default landing tab.

### ActionBar

Appears between the tab bar and content only when `actions` are passed to HubShell. Not shown to Everyday users. Used for Create, Navigate, and Quick Action buttons.

---

## 9. Ask Penny / Penny Insights / Trail Signals Architecture

### Right rail panels

The `ContextPanel` right rail (`rightPanelOpen: boolean` in AppContext) renders three nested panels:

| Panel | Content | Trigger |
|---|---|---|
| **Ask Penny** | Free-form Penny chat (Phase 2 live; Phase 1 POC only) | Tab in ContextPanel |
| **Penny Insights** | Contextual bullet-point insights from Penny based on current page/context | Default tab in ContextPanel |
| **Trail Signals** | Aggregated signals from connected sources with count badge | Topbar counter + Penny Insights section |

### Trail Signals

Trail Signals are surfaced in the Topbar as a count badge (e.g., "3 Trail Signals"). Signal counts are managed in `src/data/signalCounts.ts` with a `locationToContext` mapping that adjusts the count by current route. In Phase 2, these will be live-computed from Salesforce events, Slack activity, and Penny interactions.

### Penny Insights (Phase 1 behaviour)

In Phase 1, Penny Insights in the ContextPanel are **hardcoded per-page guidance** drawn from `operationalIntelligenceData.ts` and inline content in each hub's Overview component. The insights follow a consistent format:

1. Priority numbered action
2. Plain-language reason ("why this matters")
3. Tag: `Action Now` / `Phase 2` / `Complete`

In Phase 2, insights will be dynamically generated by Penny based on live Salesforce data, Slack signals, and Gemini LLM processing.

### Ask Penny (Live — Phase 1)

Ask Penny is **live** as of Phase 1. The slide-over panel (`AskPennyPanel`) is globally mounted in `AppShell` and opens from the Topbar on any page. Requests are sent to `POST /api/penny/ask` (Express route in `api-server`) which calls Gemini 2.5 Flash with a 22-chunk RAG corpus (tier-filtered). Billing is active (`serviceTier: standard`). Key implementation notes:

- `maxOutputTokens: 1024` is required — the thinking budget fails silently without it
- The `pendingPennyQuery` field in AppContext allows any page to pre-fill and auto-fire a query by setting it before opening the panel
- The full conversational memory and tool-use layer is Phase 2; current responses are single-turn with context injection from the RAG corpus
- `/penny/test` remains available as a raw Gemini smoke-test interface

---

## 10. Section-by-Section Reference

### 10.1 Digital Twin

**Path**: `/digital-twin`  
**Min tier**: Power  
**Pattern**: 4-tab guided compass

| Tab | Path | Content |
|---|---|---|
| Explore | `/digital-twin` | Guided entry grid + object workspace (selectedObject state in parent) |
| Map | `/digital-twin/map` | Focused radial SVG relationship map |
| Impact | `/digital-twin/impact` | Cascade impact per object kind |
| Governance | `/digital-twin/governance` | Gateway to `/uom` + `/governance` |

The `extraPrefixes: ['/uom', '/governance']` on the Digital Twin sidebar group ensures those routes highlight the Digital Twin group.

---

### 10.2 Operations Center

**Path**: `/operations`  
**Min tier**: Admin  
**Pattern**: Dashboard panels with `OpsHeader` + `StatCard` + `StatusDot` primitives from `PageShell`

| Tab | Path | Content |
|---|---|---|
| Executive Overview | `/operations` | Domain health cards, top signals, readiness summary |
| Health Indicators | `/operations/health` | Per-domain health scores and issue lists |
| Scorecards | `/operations/scorecards` | Readiness scorecards by domain |
| Trends & Insights | `/operations/trends` | Trend data and recommendations |
| Demand | `/operations/demand` | Demand intake pipeline |

Data source: `src/data/operationalIntelligenceData.ts` — `domainHealthData`, `recommendations`, `readinessScorecards`, `trendInsights`.

---

### 10.3 Programs & Curriculum

**Path**: `/program`  
**Min tier**: Admin (Everyday: My Programs only)  
**Pattern**: Overview-first hub

| Tab | Path | Tier | Content |
|---|---|---|---|
| Overview | `/program` | All | Command center: program health, blueprint coverage, Penny coverage, standards readiness, Penny guidance |
| Programs | `/program/programs` | All | ObjectWorkspace: program list + detail pane (Overview, Blueprint, Curriculum, Penny, Systems, Health tabs) |
| Standards | `/program/standards` | Power+ | StandardsStudio: Overview → Browser → Checklist → Gap Report |
| Blueprint | `/program/blueprint` | Admin+ | ProgramBlueprint: program selector + multi-section canvas |

Data source: `src/data/programs.ts` (5 programs: Explorer's Trail, Foundations Trail, Guided Trail, Trail of Mastery, Digital Compass).

Admin-only program tooling (SF Validation, Program Resources, Salesforce Architecture) has been moved to Administration.

---

### 10.4 Penny Command Center

**Path**: `/penny`  
**Min tier**: Admin  
**Pattern**: Multi-tab hub (overview-first)

| Tab | Path | Content |
|---|---|---|
| Command Center | `/penny` | Hub overview: live AI status, capability health, RAG coverage, Penny guidance |
| Capabilities | `/penny/capabilities` | Capability workspace with governance tabs |
| Prompt Studio | `/penny/prompts` | Prompt management and testing — Templates and Variables tabs are DB-backed (`prompt_templates` + `prompt_variables` PostgreSQL tables); Variables tab is live editable with RailActionPanel create/edit |
| Learners | `/penny/learners` | Learner engagement and Penny interaction logs |
| Trail Quests | `/penny/trail-quests` | Trail Quest delivery and progress tracking |
| Assessments | `/penny/assessments` | Assessment delivery + Agentforce dual-AI coaching (live POC) |
| Agentforce | `/penny/agentforce` | Agentforce Sessions API integration center |
| Intelligence | `/penny/intelligence` | Penny intelligence dashboard |
| Test Penny | `/penny/test` | Live Gemini smoke-test interface |

`/penny/integration-layer` redirects to `/admin/integrations` (removed from Penny hub in Phase 1 UX consolidation).

Data sources: `src/data/pennyCapabilityData.ts`, `src/data/pennyCapabilities.ts`, `src/data/pennyContentActions.ts`, `src/data/pennyPromptStudioData.ts`.

---

### 10.5 Knowledge

**Path**: `/knowledge`  
**Min tier**: Admin (Everyday: Documents only)  
**Pattern**: Overview-first hub

| Tab | Path | Tier | Content |
|---|---|---|---|
| Overview | `/knowledge` | Power+ | Command center: source health, trust breakdown, sync coverage, Penny readiness, needs-attention list, Penny guidance |
| Sources | `/knowledge/sources` | Power+ | KnowledgeWorkspace: source list + detail pane (Overview, Governance, Programs, Penny Assets, Relationships tabs) |
| Library | `/knowledge/library` | All | SourceDocs table with search and status filters |
| Relationships | `/knowledge/relationships` | Power+ | KnowledgeRelationships: ecosystem architecture + relationship map |
| Org Memory | `/knowledge/memory` | Power+ | Phase 2 placeholder: 9 planned sections, example decision records |

Data source: `src/data/knowledgeSourceData.ts` (14 knowledge sources with full governance metadata: trust level, sync status, health status, health issues, Penny approval, review cycle).

Exported summary constant: `SOURCE_SUMMARY` (totals, health counts, trust counts, approval count).

Trust levels: `Authoritative` → `Trusted` → `Curated` → `Unverified`  
Sync status: `Live` | `Manual` | `Disconnected` | `Planned` | `Future`  
Health status: `Healthy` | `Warning` | `Critical` | `Future`

---

### 10.6 Collaboration

**Path**: `/collaboration`  
**Min tier**: Admin (Everyday: limited)  
**Pattern**: Overview-first hub (the reference implementation for the overview-first pattern)

| Tab | Path | Tier | Content |
|---|---|---|---|
| Systems Overview | `/collaboration` | All | CollaborationWorkspace: integration health cards for all connected systems |
| Channels | `/collaboration/channels` | Power+ | CommChannels: Slack channel registry |
| Templates | `/collaboration/templates` | Power+ | CommMessageTemplates: message template library |
| Weekly Briefs | `/collaboration/briefs` | Power+ | WeeklyBriefs |
| Notifications | `/collaboration/notifications` | Power+ | CommNotifications |
| Slack Integration | `/collaboration/slack` | Admin+ | SlackIntegrationCenter with live validation |
| Google Drive | `/collaboration/drive` | Admin+ | GoogleDriveIntegrationCenter |
| Google Calendar | `/collaboration/calendar` | Admin+ | GoogleCalendarIntegrationCenter |

---

### 10.7 Administration

**Path**: `/admin`  
**Min tier**: Admin  
**Pattern**: URL-routed single page (AdminView) + standalone tools

The Administration hub uses `useLocation` to route between sections without a tab bar. Sidebar links (`/admin/:section`) set the active section via URL.

| Path | Section | Min tier | Description |
|---|---|---|---|
| `/admin` | Knowledge Management hub | Admin | 11-section home with readiness tiles |
| `/admin/people-access` | People & Access | Admin | Permission Matrix (11 personas, sortable/filterable) + Access Tiers & Auth (Google Groups mapping, Clerk auth flow, feature capability table) |
| `/admin/integrations` | Integration Hub | Admin | Central integration management — all connectors, health, and config (canonical entry point; `/admin/setup` redirects here) |
| `/admin/integrations/google-auth` | Google OAuth Wizard | Super Admin | 5-step OAuth flow wizard (old `/admin/google-oauth` redirects here) |
| `/admin/integrations/secrets` | Secrets Audit | Super Admin | Environment variable audit tool (old `/admin/secrets-audit` redirects here) |
| `/admin/integration-readiness` | Integration Readiness | Admin | Full integration health dashboard |
| `/admin/phase1-readiness` | Phase 1 Readiness | Super Admin | Live readiness checklist and system status |
| `/admin/ux-standards` | UX Standards | Super Admin | Phase 1 UX compliance reference |
| `/admin/phase2-backlog` | Phase 2 Backlog | Super Admin | 19-card Kanban backlog |
| `/admin/phase1-audit` | Phase 1 Audit | Super Admin | Full completion audit (48 pages, POC review, verdict) |
| `/admin/sf-validation` | SF Validation | Admin | Salesforce object validation center |
| `/admin/salesforce-arch` | Salesforce Architecture | Admin | SF object mapping and schema |
| `/admin/program-resources` | Program Resources | Admin | Program resource registry |

---

## 11. Integration Architecture

Trail OS integrates with external systems through the API server at `artifacts/api-server`. All integration state is managed in `src/data/readinessState.ts` (single source of truth for current integration status).

### Integration readiness states

| State | Meaning |
|---|---|
| `live` | Connected and operating (Salesforce, Penny/Gemini, Gmail, Calendar, Slack) |
| `in-progress` | Connected but incomplete (Agentforce POC, Google Drive pending) |
| `planned` | Architecture defined, not yet connected |
| `phase-2` | Roadmap item, no architecture yet |

### Integration model

Each integration is described by:

```typescript
{
  name: string;
  status: IntegrationStatus;  // 'live' | 'partial' | 'planned' | 'future'
  health: HealthStatus;
  lastChecked: string;
  notes: string;
  nextStep?: string;
}
```

The Integration Readiness dashboard at `/admin/integration-readiness` renders this state. The Phase 1 Readiness dashboard at `/admin/phase1-readiness` shows the authoritative current state for all integrations.

---

## 12. Salesforce / Slack / Google / Gemini Status

### Salesforce

- **Status**: Live  
- **Connection**: REST API — PMM (Program Management Module) + NPSP (Nonprofit Success Pack) confirmed  
- **API routes**: `GET /api/salesforce/*` — object validation, schema mapping, field queries  
- **Data model**: SF objects mapped in `src/data/salesforceArchitectureData.ts` (6 of 12 objects fully mapped)  
- **Next step**: Wire live SF data to Operations dashboards (Phase 2)  
- **Admin UI**: `/admin/sf-validation` + `/admin/salesforce-arch`

### Slack

- **Status**: Live POC  
- **Bot**: `@coachconnectbot`  
- **Connection**: `SlackValidationProvider` auto-validates on mount via `GET /api/slack/validate`. Smoke test via `POST /api/slack/validate/test-message`  
- **Scope limitation**: Uses `conversations.info` `is_member` field for bot membership check (avoids needing `conversations.members` scope)  
- **Admin UI**: `/collaboration/slack`  
- **Next step**: Add `channels:read` scope for full channel listing (Phase 2)

### Google

- **OAuth flow**: 5-endpoint route at `/api/google/oauth/*` — initiate, callback, token exchange, refresh, revoke. Wizard at `/admin/integrations/google-auth` (old `/admin/google-oauth` redirects there).  
- **Gmail**: **Live** — `gmail.readonly` + `gmail.send` scopes active. Real inbox accessible. `GOOGLE_GMAIL_REFRESH_TOKEN` configured. Penny can draft and send email from the Collaboration → Gmail panel.  
- **Google Calendar**: **Live** — real events via `GET /api/calendar/events`. Penny prep briefs generated per event.  
- **Google Drive**: Planned (Phase 2) — OAuth refresh token active but Drive API not yet wired to knowledge sources.  
- **Google Groups / DWD**: In progress — requires `GOOGLE_ADMIN_CREDENTIALS` (service account JSON) + `GOOGLE_ADMIN_IMPERSONATE_EMAIL`. DWD must be enabled on the service account in GCP and authorized in Workspace Admin with matching Client ID. Uses `groups/{groupEmail}/members` (member.readonly scope).  
- **Blocker**: #1 issue is Google OAuth app in "Testing" mode — all test users must be explicitly added in Google Cloud Console.  
- **Note**: `req.params` needs `as string` cast in Express 5 types.

### Gemini / Penny AI

- **Status**: Live  
- **Model**: `gemini-2.5-flash` via Replit AI Integration proxy  
- **Endpoint**: `POST /api/penny/ask` (Express route in `artifacts/api-server/src/routes/penny.ts`)  
- **Billing**: Active — `serviceTier: standard` confirmed  
- **RAG corpus**: 22 chunks, tier-filtered (Everyday gets a subset; Power/Admin get full corpus)  
- **UI**: `AskPennyPanel` slide-over, globally mounted in `AppShell` — opens from the Topbar on any page  
- **Pre-fill pattern**: `pendingPennyQuery` in AppContext; any page can push a query that auto-fires when the panel opens  
- **Key constraint**: `maxOutputTokens: 1024` required — thinking budget fails silently without it  
- **Smoke test**: `GET /api/gemini/validate` · raw interface at `/penny/test`  
- **Phase 2**: Conversational memory, tool use, multi-turn sessions

### Agentforce

- **Status**: Live POC  
- **Integration**: Salesforce Agentforce Sessions API — dual-AI coaching on the Penny Assessments page (`/penny/assessments`)  
- **Relationship**: Coexistence model — Penny (Trail OS AI layer) + Agentforce (Salesforce AI layer) operate as complementary agents, not duplicates  
- **Phase 2**: Full context handoff protocol, deeper coexistence model, `/penny/agentforce` integration center

---

## 13. Testing Strategy

### Automated test suite (active — 105 tests, 7 files)

Trail OS has a Vitest test suite across both workspace packages.

**api-server tests** (`artifacts/api-server/src/__tests__/`):

| File | Tests | Coverage |
|---|---|---|
| `health.test.ts` | 11 | `/api/healthz` shape, content-type, 404 |
| `salesforce.test.ts` | ~16 | SF operations summary, cache, validate endpoint |
| `promptTemplates.test.ts` | 16 | Full CRUD contract: `GET`, `POST`, `/seed`, `PATCH` — 200/201/400/404 |
| `promptVariables.test.ts` | 16 | Full CRUD contract for `/api/penny/prompt-variables` |

**program-map tests** (`artifacts/program-map/src/__tests__/`):

| File | Tests | Coverage |
|---|---|---|
| `validationData.test.ts` | ~20 | Slack/Calendar/Drive data integrity (shape, uniqueness, enum values) |
| `formatSyncAge.test.ts` | ~18 | `formatSyncAge` utility time-bucket logic |
| `pennyStudioData.test.ts` | 24 | Prompt template + variable data integrity (id/name uniqueness, `VariableType`, `PromptStatus`, `HallucinationRisk`, `PromptDomain`, config map coverage) |

**DB-mocking pattern:** `vi.hoisted()` creates mock fn references accessible in both the `vi.mock('@workspace/db')` factory and test bodies. This is the required pattern for all DB-backed route tests. See `promptTemplates.test.ts` for the reference implementation.

**Run commands:**

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/program-map test
```

### `routes.smoke.ts` — type-checked route manifest

`artifacts/program-map/src/__tests__/routes.smoke.ts` is not a runtime test. It is a typed manifest of every route registered in `App.tsx`, verified by `pnpm --filter @workspace/program-map run typecheck`. Every entry is one of:

- `active` — a real `<Route>` rendering a component
- `redirect` — a `<Redirect>` (or `useEffect` redirect) to a canonical path

Update `routes.smoke.ts` whenever routes are added, removed, or redirected in `App.tsx`.

### TypeScript compiler (primary quality gate)

`pnpm run typecheck` — must pass with 0 errors before any PR merge. Covers type errors, import issues, missing exports, and route manifest validity.

### Smoke-test tools (manual, in-app)

- Slack message test: `POST /api/slack/validate/test-message`
- Salesforce field validation: `GET /api/salesforce/validate`
- Google OAuth flow: `/admin/integrations/google-auth`
- Gemini / Penny test interface: `/penny/test`

### Phase 2 testing additions (planned)

- Component tests for shared UI (HubShell, ObjectWorkspace, ContextBar)
- Snapshot tests for the five Overview landing pages
- Integration tests for Slack, Google, and Agentforce routes

---

## 14. Hardcoded and Demo Data Classification

All data in Trail OS Phase 1 is hardcoded in `src/data/`. This is by design for the prototype. The following classification governs how each item should be treated:

### DB-backed (live, persistent across restarts)

- `prompt_templates` table — Penny Prompt Studio templates; seeded from `pennyData.ts`; editable via `PATCH /api/penny/prompt-templates/:id`
- `prompt_variables` table — Penny Prompt Studio variables; seeded from `pennyData.ts`; live editable via VariablesView + `PATCH /api/penny/prompt-variables/:id`

### Phase 1 OK — accurate representation, ready for live data swap

- `programs.ts` — 5 programs with full metadata (confirmed by program team)
- `knowledgeSourceData.ts` — 14 sources with real governance records
- `resolvePhases.ts` — RESOLVE framework phases (authoritative)
- `standardsData.ts` — Program, Module, Lesson, Assessment standards (authoritative)
- `accessTiers.ts` — tier definitions (authoritative)
- `terminology.ts` — brand labels (authoritative)

### Phase 2 data — placeholder shapes, need live data

- `operationalIntelligenceData.ts` — health scores and recommendations (to be replaced by live Salesforce queries)
- `signalCounts.ts` — Trail Signal counts (to be replaced by live aggregation engine)
- `pennyCapabilityData.ts` — capability activation statuses (to be replaced by live Penny registry)
- `commData.ts` — Slack channel data (to be replaced by live Slack API)
- `googleCalendarData.ts` — calendar events (**live** — real events now served via `/api/calendar/events`; this file is a fallback/prototype only)
- `googleDriveData.ts` — Drive folder structure (to be replaced by Drive API)

### Stale / needs review

- `universalObjectProfileData.ts` — some profiles reference deprecated architecture
- `demandStages.ts` — demand pipeline stages may not reflect current intake process
- `trailOsCapabilities.ts` — some capabilities listed as planned that are now Phase 2

---

## 15. Phase 2 Backlog Themes

The full Phase 2 backlog is maintained in the app at `/admin/phase2-backlog` (19 draft cards). The authoritative source is the `BACKLOG_CARDS` constant in `src/pages/admin/Phase2Backlog.tsx`.

### Phase 2 themes

| Theme | Backlog cards | Description |
|---|---|---|
| **Live AI (Penny)** | p2-penny-live-llm, p2-penny-rag, p2-penny-assessment, p2-coaching-flows | Wire Penny to live Gemini LLM with RAG over knowledge sources |
| **Live Data (Salesforce)** | p2-sf-live-queries, p2-agentforce | Replace hardcoded operational data with live Salesforce queries |
| **Trail Signals Engine** | p2-trail-signals-engine | Build the live signal aggregation layer (Salesforce + Slack + Penny events) |
| **Trail Quests** | p2-trail-quest-live | Live Trail Quest delivery (learning journey activation) |
| **Testing** | p2-vitest-automation | Vitest suite with unit, integration, and component coverage |
| **UX Features** | p2-universal-sidebar-panel, p2-trail-signals-control, p2-gmail-panel, p2-calendar-panel | Right-panel UX enhancements and communication actions |
| **Org Memory** | Covered under Penny RAG | Institutional memory layer for Penny context |

---

## 16. Penny POC Incorporation Strategy

The Penny-POC repository (separate repo at `github.com/Transition-Trails/Penny-POC`) contains early-stage Penny AI experiments. The Trail OS incorporation strategy is:

### Phase 1 (complete)

- Penny Command Center hub is built in Trail OS (`/penny`) as the **governance and configuration surface** for Penny.
- The POC test interface (`/penny/test`) provides a live Gemini POC connection for smoke testing.
- The former standalone Integration Layer page (`/penny/integration-layer`) was removed in Phase 1 UX consolidation and now redirects to `/admin/integrations`; integration capability status is visible in the Integration Hub.
- 13 Penny capabilities are catalogued in `pennyCapabilityData.ts` with POC state, Trail OS state, and risk level.

### Phase 2 incorporation plan

1. **Penny LLM Wire-Up** (`p2-penny-live-llm`): Connect the Trail OS Penny UI to a live Gemini endpoint. The `/api/gemini` routes in the API server are the integration point.

2. **RAG over Knowledge Sources** (`p2-penny-rag`): Implement retrieval-augmented generation over the knowledge sources managed in the Knowledge hub. The governance layer (trust levels, Penny approval flags) in `knowledgeSourceData.ts` is already designed for this.

3. **Capability Activation** (`p2-penny-assessment`, `p2-coaching-flows`): Wire the planned capability states in `pennyCapabilityData.ts` to live Penny prompt execution.

4. **Agentforce Coexistence** (`p2-agentforce`): Define the handoff protocol between Trail OS Penny and Salesforce Agentforce so they serve complementary, non-overlapping roles.

### Penny design principles (non-negotiable)

- Penny **supports** coaches — it does not replace them.
- Penny's knowledge is gated by the trust review process in the Knowledge hub.
- Penny insights are **transparent** — users can always see why Penny is saying something.
- Ask Penny is always in the right rail — never a modal or full-page takeover.

---

## 17. Non-Goals and Deferred Features

The following are explicitly out of scope for Trail OS Phase 1 and are not on the Phase 2 backlog unless noted:

| Feature | Reason deferred |
|---|---|
| Live user authentication (login/logout) | Phase 2 — will use Salesforce SSO or Replit Auth |
| Multi-tenant or multi-org support | Not applicable — single org (Transition Trails) |
| LMS integration (lesson delivery, progress tracking) | Phase 2+ — requires LMS selection decision |
| Public-facing learner portal | Different product — not part of Trail OS internal platform |
| Mobile app | Trail OS is desktop-first; mobile is accessible but not optimised |
| Real-time collaborative editing | Not planned — async patterns suffice |
| Custom report builder | Deferred — Phase 2 data queries will enable standard reports |
| Email marketing / campaign management | Not in scope — Salesforce PMM handles this |
| Financial / billing management | Not in scope — handled by Salesforce |
| Video/content hosting | Not in scope — Google Drive and LMS handle content |
| Org Memory live records | Phase 2 — architecture defined, build deferred |
| Automated testing | ✅ Live — 105 tests across 7 files (api-server + program-map); `p2-vitest-automation` backlog card completed in Phase 1 |
| Agentforce integration | Phase 2 — `p2-agentforce` backlog card |

---

## 18. Secrets and API Keys Policy

> ⚠️ **This policy is non-negotiable. Violations will require a full credential rotation.**

### Rule

**Secrets, API keys, tokens, connection strings, and credentials must never be committed to this repository.** This applies to:

- Salesforce credentials (client ID, client secret, access tokens, instance URLs with embedded auth)
- Slack bot tokens and signing secrets
- Google OAuth client secrets and refresh tokens
- Gemini / Google AI API keys
- Agentforce credentials
- Database connection strings
- `SESSION_SECRET` or any session signing keys
- Any `.env` file content

### Where secrets live

| Environment | Secret storage |
|---|---|
| Replit development | Replit Secrets (via the Replit Secrets panel — never `.env` files) |
| GitHub Actions CI | GitHub repository secrets (Settings → Secrets and variables → Actions) |
| Production deployment | Replit deployment secrets or environment variable injection at deploy time |

### What is safe to commit

- Public API endpoint URLs (e.g., `https://api.slack.com/`)
- Salesforce **instance URL** without credentials (e.g., `https://orgname.salesforce.com`)
- Google OAuth **client ID** (this is a public identifier, safe in code)
- Feature flags and configuration that contain no credentials
- This specification document

### `.gitignore` requirements

The repository `.gitignore` must include:

```
.env
.env.*
!.env.example
*.pem
*.key
node_modules/
dist/
.replit
replit.nix
```

### Reporting a leaked secret

If a secret is accidentally committed:
1. Immediately rotate the credential in the relevant system (Salesforce, Slack, Google Console).
2. Force-push to remove the commit, or use `git filter-repo` to scrub history.
3. Document the incident in `SECURITY.md` under Incident History.
4. See `SECURITY.md` for the full vulnerability reporting process.
