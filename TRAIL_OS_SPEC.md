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
| Pages / routes | 50+ | Complete — all built |
| Sidebar groups | 6 + global | Complete |
| Hub sections with Overview landing | 5 | Complete — Programs, Knowledge, Collaboration, Digital Twin, Operations |
| UX violations (font-serif) | 6 found → 0 remaining | Fixed |
| Salesforce REST API | Live | Complete — 127 Accounts · 129 Contacts · PMM + NPSP |
| Slack bot | Live | Complete — @penny bot · posting confirmed |
| Penny / Gemini AI | Live | Complete — Gemini 2.5 Flash · POST /api/penny/ask · billing active |
| Gmail integration | Live | Complete — gmail.readonly + gmail.send · real inbox |
| Google Calendar | Live | Complete — Real events via /api/calendar/events |
| Agentforce | Live (POC) | Complete — Sessions API · dual-AI coaching on Assessment page |
| Clerk v6 + Google Sign-In | Live | Complete — Google OAuth · Google Groups auto-tier |
| Automated test suite | 105 | Complete — 7 files across api-server + program-map |
| Metadata-driven readiness cases | 70 | Complete |
| Hardcoded content items | ~28 | Classified (12 OK, 11 Phase 2, 5 stale) |

### Phase 1 canonical audit

A full Phase 1 Completion Audit page is available in the app at `/admin/phase1-audit`. It contains:
- Per-page UX review (42 pages, each rated Pass / Fixed / Watch)
- Hardcoded content inventory with Phase 2 linkage
- Test coverage summary
- Penny POC review (13 capabilities rated)
- Final verdict: **CONDITIONALLY COMPLETE**

---

## 5. UX Standards

The Transition Trails design system is the source of truth. This section translates the design system into the specific decisions that govern a dense internal operations tool. When this section conflicts with a pre-system pattern still visible in the codebase, this section wins. The authoritative interactive version is at `/admin/ux-standards` in the app.

### Context

Trail OS was created before the design system existed. The old standard was solving a real problem — Trail OS is a dense internal tool for a small team, and that instinct was right. What changes is the answer. **Density is now achieved by showing fewer things rather than shrinking them.** Prefer fewer columns, progressive disclosure, and a secondary tab over reducing type size. If a screen cannot work at 14 px, the screen is showing too much — that is a layout problem, not a type problem.

### Typography

The design system is the source of truth for typefaces and sizing. Trail OS sits at the bottom of the brand ranges because it is an internal tool.

| Element | Size | Face | Weight |
|---|---|---|---|
| Page title | 28 px | Poppins (`font-serif`) | Semibold |
| Section title | 22 px | Poppins | Semibold |
| Card / panel title | 18 px | Poppins | Semibold |
| Stat value | 28 px | Poppins | Semibold |
| Body | 16 px | Open Sans (`font-sans`) | Regular |
| Secondary / metadata | 14 px | Open Sans | Regular |
| Labels, badges, table headers | 14 px | Open Sans | Semibold |

**Floor: 14 px for all interface text. No exceptions for density.**

Typefaces: Poppins for headings (`font-serif` in Tailwind config — this is correct and intentional; it resolves to Poppins, not a literal serif), Open Sans for all interface text (`font-sans`). Caveat has no role in an operations tool. Fraunces is for outward-facing surfaces only and is not used here.

**Case: sentence case throughout.** The old standard used `text-[10px] font-bold uppercase tracking-widest` for eyebrow labels — that treatment compensated for illegibly small text. At 14 px, uppercase reads as shouting, which conflicts with the brand voice. Title Case applies only to proper programme and trail names.

### Colour

All colour in screen code comes from the token layer — no raw hex values and no Tailwind framework colour utilities (`bg-emerald-100`, `text-sky-700`). Import `STATUS_CLASSES` from `src/config/statusColors` for all status colours.

**Four brand colours:**

| Colour | Value | Intent in Trail OS |
|---|---|---|
| Trail Green | `#2F6B3F` | Success, live, active, complete, approved |
| Deep Teal | `#2F6F7E` | Information, configured, planned, read-only |
| Trail Light | `#F5F0E8` | Page background |
| Warm Gray | `#4A4F4D` | Neutral text and dividers |

**Five status roles — only these five:**

| Role | Treatment | States |
|---|---|---|
| Success | Trail Green on green tint | Live, active, passing, complete, approved |
| Information | Deep Teal on teal tint | Configured, planned, by design, read-only |
| Attention | Dark amber text on lightest amber tint | Needs setup, partial, prototype, warning, needs rework |
| Critical | Functional red (`#A93F2F`) on red tint (`#FBEAE6`) | Blocked, failed, missing credentials, destructive |
| Neutral | Warm Gray with Slate text | Not started, deferred, inactive |

The functional red is not a brand colour — it exists because an operations tool must distinguish a blocker from a warning, and the brand book has no red. It is pending a brand book entry and is the only non-brand colour permitted in Trail OS.

**Amber rule:** one amber element per screen (`bg-accent`, `#F5A623`) and it must be the primary action. Amber is never a status fill, never a category colour, never decorative. Attention status uses amber text on a tint.

**Meaning is never colour alone.** Every status indicator carries a text label and an icon alongside the colour.

**No categorical colour.** Programmes, person types, roles, and record types are distinguished by label, not hue. The programme map is the single exception where colour aids spatial navigation.

**Third-party brand marks** keep their own colours and must never be converted in any colour sweep.

### Shape and elevation

| Element | Radius |
|---|---|
| Small elements (tags, chips) | 8 px (`rounded`) |
| Buttons and inputs | 14 px (`rounded-[14px]`) |
| Cards and panels | 22 px (`rounded-[22px]`) |
| Badges and status pills | Fully rounded (`rounded-full`) |

Backgrounds: `bg-card` (white) on `bg-background` (Trail Light). Use `bg-[#EDF5F8]` (Sky tint) for nested surfaces inside a card — never a surface that is nearly the same value as the card behind it.

Borders: `border border-border` (1 px Warm Gray) on cards and dividers; `border-[1.5px] border-border` on inputs and secondary buttons.

Shadows: `shadow-sm` at rest, `shadow-md` on hover lift. No hard drop shadows. Never a shadow on a logo.

### Spacing

Scale: 4, 8, 16, 24, 32, 48, 64 px. Nothing off-scale. For Trail OS density, choose the lower end of the scale rather than inventing values outside it.

### Interaction

- **Focus ring:** `focus:outline-none focus:ring focus:ring-[#2F6B3F]/15` on every interactive element — 3 px Trail Green at 15% opacity.
- **Card hover:** `-translate-y-0.5 shadow-md` over ~160 ms. Buttons shift colour on hover. Nothing shrinks.
- **Press:** Darker background or colour. No bounce, no shrink.
- **Animation:** Only when it carries meaning. 200 ms ease-out for panels and accordions. No decorative animation.

### Layout patterns

- **Overview-first hubs:** populated overview at the base path; never an empty split pane as landing.
- **List-and-detail** is a secondary tab (`ObjectWorkspace`), never the default landing.
- **No modals or full-page overlays.** `AskPennyPanel` and `CalendarActionPanel` right-rail slide-overs are the only exceptions.
- **No empty default detail panes.** No hero or intro cards on operational pages.
- **Underline tabs,** not pill buttons, wherever `HubShell` is used.
- **Ask Penny** always in the right rail, never a modal or takeover.
- All navigation uses `useLocation` + `setLocation` from wouter, not anchor tags.

### Voice

Sentence case. Speak to the user as "you", call the organisation "we". Calm, precise, actionable — no urgency or hype. No emoji in the product or in repository documents; status is icon plus text. Do not adopt Trailhead, Trailblazer, Ohana, Ranger or Expedition as Trail OS vocabulary — referring to the Salesforce platform by its real name is correct; adopting its language as ours is not.

### Role gating

- Everyday users: plain language, single tab, no ActionBar, no governance metadata.
- Power users and above: operational controls, multi-tab hubs, ActionBar actions.
- Admin+ only: Administration group, Blueprint canvas, People & Access.
- Super Admin only: Secrets Audit, Google OAuth wizard, Phase 1/2 audit tools.

### What changed, and why

| Topic | Old rule | New rule | Reason |
|---|---|---|---|
| Type sizes | 9–12 px text throughout | 14 px floor everywhere | At 14 px the hierarchy is readable; shrinking text produces illegibility, not compactness |
| Uppercase labels | `text-[10px] font-bold uppercase tracking-widest` | `text-[14px] font-semibold` sentence case | Uppercase compensated for small text; at 14 px it reads as shouting |
| Stat values | `text-xl` max (20 px) | 28 px Poppins semibold | Brand type scale; stats should read at a glance |
| Card radius | `rounded-lg` (8 px) | `rounded-[22px]` | Brand specification; `rounded-lg` was a generic default |
| Card background | `bg-white` explicit | `bg-card` | On Trail Light, explicit white is indistinguishable from the page; `bg-card` is theme-safe |
| Colour families | Tailwind `emerald`/`sky`/`violet`/`indigo`/`rose`/`amber` | Five status roles via `STATUS_CLASSES` | Framework utilities couple to implementation values; named roles survive theme changes |
| Amber usage | Freely used for categories, status fills, decoration | One per screen — primary action only | Amber is the CTA colour; over-use dilutes the signal that a primary action is available |
| Shadows and hover | No explicit rule | Soft card shadow, 3 px lift on hover | Prevents hard drop shadows and decorative animation from entering the codebase |
| Focus ring | Browser default | 3 px Trail Green at 15% opacity | Accessibility requirement; brand-consistent |
| Fonts | `font-sans` only, no type specification | Poppins headings + Open Sans interface text | Trail OS now has a type system; aligns the tool with outward-facing materials |

Density is not lost — it moves from type size to information architecture. A screen that cannot work at 14 px is showing too much, and the fix is progressive disclosure, fewer columns, or a secondary tab.

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

> Source of truth: `artifacts/program-map/src/components/layout/Sidebar.tsx` (`navGroups` array). Update this table whenever `navGroups` changes.

| Group | Base path | Min tier | Items |
|---|---|---|---|
| Operations | `/operations` | — | Health Indicators (Admin+) · Demand (Admin+) |
| Programs | `/program` | — | Overview (Admin+) · Courses & Modules (Power+) · Blueprint (Admin+) · Standards Studio (Power+) |
| Penny | `/penny` | — | Overview · Learners · Session Log · Trail Quests · Trail Configs · Prompt Studio · Capabilities · Video Production · Penny Sandbox · Penny Logs — all Admin+ |
| Knowledge | `/knowledge` | — | Overview · Sources · Library — all Admin+ |
| Collaboration | `/collaboration` | — | My Trail Signals (Power+) · Calendar (Power+) · Gmail (Power+) · Slack (Admin+) · Channels (Admin+) · Templates (Admin+) |
| Administration | `/admin` | Admin | Integrations · People & Access · Digital Twin — all Admin+. Also highlights for `/digital-twin`, `/uom`, `/governance` paths. |

Groups without a `minTier` are visible at all tiers; their items are individually gated. The Administration group is hidden below Admin tier. Home (`/`) and Search (`/search`) are top-of-sidebar buttons rendered outside the group system.

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

> Authoritative status and last-verified dates: `src/data/readinessState.ts`. This section documents implementation detail and configuration notes. For integration health, update `readinessState.ts` first.

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
- **Google Drive**: **Live** — Penny Asset Library reads real Drive files from a Shared Drive via `GET /api/drive/penny-assets`. `GOOGLE_DRIVE_REFRESH_TOKEN` and `GOOGLE_DRIVE_PENNY_FOLDER_ID` configured. Phase 2: program workspace sync and rule configuration in Collaboration Overview.  
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

## 14. Data Classification

Every file in `src/data/` is classified below. Consult this table before demonstrating Trail OS to any external audience. `readinessState.ts` is listed first because the rest of this specification describes it as the single source of truth for integration status.

### Rubric

The previous classification answered two questions at once — is this accurate, and is this wired to a live system — but neither answered the question that matters in a demonstration: **can I say this number out loud and defend it?**

The four statuses answer that question directly.

| Status | Meaning | Safe to show | Safe to quote |
|---|---|---|---|
| **Live** | Served from a real system at runtime | Yes | Yes |
| **Real** | Accurate Transition Trails content, hardcoded — not yet wired to a live source | Yes | Yes |
| **Illustrative** | Plausible, well-shaped, and invented — demonstrates the interface | Yes | **No** |
| **Stale** | Was accurate once and is now wrong | **No** | **No** |

#### Why Illustrative is a distinct status

The previous rubric did not distinguish between a file that will eventually be replaced by live data and a file whose numbers are made up. Knowing that a file is a "Phase 2 item" tells you when it gets wired; it tells you nothing about whether the ninety-day placement rate shown on the overview screen is a real Transition Trails figure or an invented one. The Illustrative status is the one the old rubric was missing.

**Illustrative is different from Real** because the content was invented for the prototype rather than drawn from TT operations, documents, or verified team decisions. It is different from **Stale** because it was never presented as real — it was always a demonstration placeholder. The category is safe to show because it makes the interface feel operational. It is not safe to quote because the number is not ours.

This distinction is invisible in the UI. An Illustrative health score looks identical to a Real one. This table is the only way to know which is which.

### DB-backed data (not in the table below)

Two data stores live in the database rather than in `src/data/` files:

- **`prompt_templates` table** — Penny Prompt Studio templates; seeded at startup, editable via `PATCH /api/penny/prompt-templates/:id`. Status: **Live**.
- **`prompt_variables` table** — Penny Prompt Studio variables; seeded at startup, editable via `PATCH /api/penny/prompt-variables/:id`. Status: **Live**.

`src/config/accessTiers.ts` and `src/config/terminology.ts` are also authoritative and safe to quote; they are configuration files, not data files, and are not repeated here.

### All files in `src/data/`

| File | What it holds | Source | Status | What replaces it |
|---|---|---|---|---|
| `readinessState.ts` | Integration health records for every system — Salesforce, Slack, Gemini, Google Drive, Google Calendar, Gmail, Agentforce (all live); Mural and GA4 (Phase 3). Single source of truth per § 8 | Verified against live system credentials; last verified June 2026 | **Real** | Nothing — this is the live state; Phase 2 expands the checks it tracks |
| `programs.ts` | Five programme records — Explorer's Trail, Foundations Trail, Guided Trail, Digital Compass, Trail of Mastery — with strategic role, audience, format, outcomes, and Penny status | Confirmed by programme team; each record cites its source blueprint. The `pricing` field on Foundations Trail reads "Needs Review — not confirmed in source materials" | **Real** | Live Salesforce PMM queries enrich records via `sfId` at runtime; Phase 2 |
| `resolvePhases.ts` | Seven RESOLVE phases — Recognize, Explore, Select, Outline, Launch, Verify, Evolve — with inputs, outputs, deliverables, and methodology guidance | "Confirmed against Master RESOLVE Methodology Handbook" stated per phase in the file | **Real** | Nothing needed — authoritative framework definition |
| `pennyCapabilities.ts` | Seven Penny capability definitions — Trail Guide, Learning Coach, Exam Coach, Build Companion, Career Translator, Quest Master, Coach Intelligence Layer | Designed and confirmed capability model; all items carry `confidence: "confirmed"` | **Real** | Nothing needed — authoritative capability registry |
| `pennyRetrievalData.ts` | Penny knowledge retrieval priority order for five capabilities — which sources load, in what sequence, and why | Designed retrieval architecture aligned to the TT knowledge source model | **Real** | Live RAG wiring when capabilities are activated; Phase 2 |
| `knowledgeSourceData.ts` | Fourteen knowledge source definitions — Salesforce Knowledge, Google Drive, LMS, Assessments, Standards Studio, Curriculum Studio — with trust levels and review cycles | Confirmed as "14 sources with real governance records" in previous spec review; runtime file counts are injected by the API at serve time | **Real** (file counts shown at runtime are live; source definitions are authoritative) | Live health checks and article counts from connected systems; Phase 2 |
| `platformRoles.ts` | Seven platform role definitions — Penny Admin, Knowledge Manager, Curriculum Lead, Standards Lead, Salesforce Admin, Coach Team Lead, Platform Admin — with responsibilities and required access tier | Designed role framework for the TT organisation; `owner` and `ownerEmail` fields are blank pending assignment | **Real** (structure is authoritative; individual owner assignments are blank) | Owner assignments configured via People & Access; Phase 2 people wiring |
| `standardsData.ts` | Content-quality standards and rules Penny applies to programme content — module, lesson, assessment, and coaching standards | Standards authored by TT for content governance; any compliance percentage figures rendered in the UI are illustrative, not measured | **Real** (rules are authoritative; **compliance percentage figures from this file must not be quoted**) | Live compliance tracking from Penny telemetry; Phase 2 |
| `unifiedObjectModelData.ts` | Core object type definitions, relationship schemas, and governance metadata for the Unified Object Model — 20 object types | Architecture design data; no invented operational figures; defines the object model the system operates against | **Real** (structural architecture; no invented numbers) | Nothing needed for the definitions; live operational data populates profiles at runtime; Phase 2 |
| `sourceDocuments.ts` | TypeScript interface definitions only — no static data records; all source document records are DB-backed and served via `/api/knowledge/documents` | Runtime data from the database | **Live** | N/A — already DB-backed |
| `signalCounts.ts` | Trail Signal badge counts by page context — the number shown in the Topbar badge and Context Bar on every page (e.g. "7 on home", "5 on operations") | Invented per-route numbers; not derived from any live aggregation | **Illustrative** | Live aggregation from Salesforce events, Slack activity, and Penny interactions; Phase 2 |
| `operationalIntelligenceData.ts` | Health scores, readiness percentages, trend lines, and AI-generated recommendations for the Operations hub executive view | Invented prototype scores; not derived from real TT operational data | **Illustrative** | Live Salesforce queries and Penny analysis; Phase 2 |
| `pennyCapabilityData.ts` | Penny capability activation statuses, readiness percentages, and roadmap phases for the capability registry admin screen | Prototype roadmap; expired quarter targets replaced with "Planned" — no delivery dates remain in the file | **Illustrative** | Live Penny capability registry; Phase 2 |
| `commData.ts` | Prototype Slack and Google Chat channel data — channel names, member counts, message history, and event logs for the Collaboration hub | Explicitly labelled prototype in the file; invented; Q3 2025 reference present | **Illustrative** | Live Slack API queries; Phase 2 |
| `googleCalendarData.ts` | Calendar event definitions, cohort schedule data, and integration readiness checks | Prototype; real events are now served by `/api/calendar/events` for the CalendarPanel — this file is a fallback only | **Illustrative** (the CalendarPanel uses live data; any screen still reading this file shows prototype data) | Live Google Calendar API for all calendar screens; Phase 2 |
| `googleDriveData.ts` | Drive folder structures, file inventories, trust configurations, and permission readiness checks for the Google Drive Integration Center | Prototype; the Penny Asset Library reads real Drive files via API, but this file's folder and file inventory is not a live Drive query | **Illustrative** | Live Drive API queries; Phase 2 |
| `contextEngineData.ts` | Example workspace contexts for the Context Bar switcher — programme names, cohort numbers, activity dates, and percentage metrics shown when the bar is in demo mode | Invented; includes specific-looking figures such as "13 learners enrolled, Cohort 2 Week 6, 91% pass rate" — these are not real TT operational data | **Illustrative** (the precision of these figures makes them easy to quote accidentally — they look real because they are specific) | Live context constructed from the active Salesforce record or user selection; Phase 2 |
| `salesforceArchitectureData.ts` | Trail OS to Salesforce object mapping, NPSP and PMM architecture documentation, and readiness percentages for the SF Architecture admin screen | SF object names reflect the real TT org (confirmed by live connection); readiness percentages are invented; Q3 and Q4 2025 targets are stale | **Illustrative** (object names are real; readiness percentages and timeline targets are not) | Live SF schema queries; Phase 2 |
| `pennyContentActions.ts` | Eleven Penny content and curriculum generation action definitions with prototype sample inputs and outputs for the Content Assistant screen | Architecture and action definitions with invented sample outputs; file explicitly labels contents as prototype | **Illustrative** | Live Penny content generation with real outputs; Phase 2 |
| `knowledgeGraphData.ts` | Prototype graph nodes and relationships linking programmes, roles, RESOLVE phases, capabilities, channels, and Penny for the Digital Twin map view | Architecture design; graph topology reflects the real relationship model conceptually but is not built from a live org-data query | **Illustrative** | Live graph built from Salesforce, Drive, and Penny data; Phase 2 |
| `globalSearchData.ts` | Prototype search index across all 20 UOM object types — search results and health scores for the global search feature | Invented search fixtures; health percentages (60%, 91%) are prototype | **Illustrative** | Live search index built from real object data; Phase 2 |
| `governanceData.ts` | Lifecycle models, ownership records, governance health scores, compliance rates, and review cycles for 20 UOM object types in the Governance hub | Structural governance framework plus illustrative compliance records; the 60% compliance figure is invented | **Illustrative** | Live governance tracking from operations; Phase 2 |
| `pennyPromptStudioData.ts` | Penny prompt architecture, retrieval behaviour, governance records, and usage analytics for the Prompt Studio admin screen | Architecture definitions plus illustrative analytics; percentage figures (ranging from 4% to 81%) are invented prototype metrics; Q3 2025 reference present | **Illustrative** | Live Penny telemetry and prompt management; Phase 2 |
| `integrationReadinessData.ts` | Planning and readiness architecture for all integrations — Salesforce, Drive, Slack, Chat, Calendar, LMS, Assessments, and Penny — with readiness percentages for the Integration Readiness Center | Prototype planning data; readiness percentages (e.g. 40%) are invented; all expired quarter targets replaced with "Planned" — no dates remain | **Illustrative** | Live integration health checks; Phase 2 |
| `slackPhase2Data.ts` | Phase 2 Slack validation data — object mappings, routing architecture, flow visualisation, and scenario test fixtures for architecture planning screens | Architecture and prototype validation data; 65% readiness figure is invented | **Illustrative** | Live Phase 2 Slack wiring and validation; Phase 2 |
| `slackIntegrationData.ts` | Prototype Slack workspace model — workspace statistics, channel registry, user-role mappings, Penny routing configuration, and readiness scorecards for the Slack Integration Center | Prototype; the Slack bot is live but this file's workspace member counts, channel metadata, and readiness scores are invented, not queried from the real workspace | **Illustrative** | Live Slack API workspace queries; Phase 2 |
| `peopleRolesData.ts` | Persona profiles, participation records, health scores, Penny support configurations, and Salesforce mappings for the People & Roles Studio | Invented persona data; no evidence that named individuals are real TT staff; health and participation scores are prototype | **Illustrative** (health scores attributed to named personas must not be quoted as real staff data) | Real people data from Google Workspace and Salesforce; Phase 2 |
| `curriculumData.ts` | Full learning architecture — cohorts, sprints, modules, lessons, assessments, delivery records, and completion statistics for Curriculum Studio | Programme names match real TT programmes; lesson counts, cohort numbers, sprint timelines, and completion percentages (75–88%) are prototype. "confirmed" in the `confidence` field is a data-model status label, not TT operational verification | **Illustrative** | Live LMS data and Salesforce PMM cohort records; Phase 2 |
| `messageTemplates.ts` | Seven Slack message template definitions — Trail Talk reminder, cohort announcement, win celebration, coach nudge, case escalation, facilitator reminder, weekly health digest | Prototype template designs; none are live or automated; `lastReviewed: Jun 2025` | **Illustrative** | Active Slack message automation; Phase 2 |
| `programResourcesData.ts` | Google Drive workspace configurations per programme — folder structures, permissions models, and sync configurations for the Program Resources screen | Prototype; all `folderUrl` values are placeholders (e.g. `"foundations-trail-placeholder"`), not real Drive links | **Illustrative** | Real Drive folder URLs configured by admin; Phase 2 |
| `demandStages.ts` | Eight demand pipeline stages — Intake, Triage, Scoring, Backlog, Sprint Planning, Delivery, Verification, Retrospective — with example backlog items and ownership | Prototype; all items carry `confidence: "needs-review"`; backlog items are invented; the stage names and pipeline structure have not been verified against how Transition Trails actually stages demand today and may not reflect the current process | **Stale** (invented stage model; present only as sample data — the real intake process may differ significantly from this eight-stage design) | Live Salesforce demand case data; Phase 2 |
| `trailOsCapabilities.ts` | Seven Trail OS operational capability descriptions — Intake Coordination, Project Delivery, Documentation, Learner-Client Matching, Org Readiness, Coach Visibility, Outcomes Tracking | Partially corrected: Coach Visibility and Outcomes Tracking updated to `confidence: "needs-review"` and future-tense language — both are Phase 2 scope. Learner-Client Matching "Active at Explorer's Trail exit" wording corrected. Remaining five capabilities still carry `confidence: "confirmed"` with "Active in..." language that has not been verified against live Phase 1 operation | **Illustrative** (two capabilities explicitly marked Phase 2; "Active in..." language on the remaining five is unverified and should not be quoted as live operational claims) | Verified capability model aligned to confirmed Phase 1/2/3 boundaries; Phase 2 |
| `commProviders.ts` | Two communication provider definitions — Slack and Google Chat — with connection status, setup requirements, and use cases | Corrected: Slack updated to `status: 'live'`, `connectionStatus: 'Connected'`, setup steps reflect live bot state and Phase 2 pending items. Google Chat remains `status: 'future'` with no delivery date | **Real** (Slack accurately recorded as live; Google Chat accurately recorded as future — no stale dates remain) | Supersede with live API-driven provider registry; Phase 2 |
| `commRouting.ts` | Eight communication routing rules — event types, triggers, audience, and Slack channel destinations for the automated messaging system | Prototype routing design; all routes updated — expired `'Planned Q3 2025'` targets replaced with `'Not yet configured'`; `'Future Q4'` Google Chat statuses simplified to `'Future'` | **Illustrative** (routing rules define the intended design; none are active automation — honest absence of dates) | Live Slack routing automation; Phase 2 |
| `universalObjectProfileData.ts` | Universal Object Profile records for all UOM object types — data powering object detail views in the Digital Twin and UOM workspace | Prototype; some profiles reference deprecated architecture, confirmed in previous spec review | **Stale** (deprecated architecture references confirmed; needs reconciliation before showing) | Redesigned profiles aligned to current architecture; Phase 2 |

### Demonstration exposure — Illustrative files

**20 of the 35 files in `src/data/` are Illustrative.** The following screens render figures drawn from them. In any demonstration, these are the screens where specific numbers, percentages, and counts should not be quoted as real Transition Trails data.

- **Every page — Topbar Trail Signal badge** (`signalCounts.ts`): the badge count (e.g. "7 Trail Signals") is a per-route invented number, not a real alert count.
- **Every page — Context Bar** (`contextEngineData.ts`): when a programme context is active, the bar shows specific-looking figures such as "13 learners enrolled, Cohort 2 Week 6, 91% pass rate". These are the most precision-looking Illustrative numbers in the system and the most likely to be quoted accidentally.
- **Operations hub** (`operationalIntelligenceData.ts`): every health score, readiness percentage, trend line, and AI recommendation on the Operations overview is invented.
- **Curriculum Studio** (`curriculumData.ts`): cohort counts, sprint numbers, module and lesson totals, and completion percentages are prototype. Programme names are real; the statistics behind them are not.
- **People & Roles Studio** (`peopleRolesData.ts`): persona health scores and participation rates are attributed to named individuals who are not confirmed TT staff. These figures must not be quoted in any context.
- **Penny Prompt Studio** (`pennyPromptStudioData.ts`): all usage analytics, quality percentages, and review metrics on the admin screen are invented.
- **Integration Readiness Center** (`integrationReadinessData.ts`): readiness percentages are prototype planning figures, not live measurements. The actual integration health is in `readinessState.ts`.
- **Governance hub** (`governanceData.ts`): compliance percentages and review cycle statuses are illustrative.
- **Collaboration hub** (`commData.ts`, `slackIntegrationData.ts`): channel member counts, message frequencies, and workspace statistics are prototype. The Slack bot posts in real channels; these counts are not real.
- **Google Drive Integration Center** (`googleDriveData.ts`): folder inventories and file counts are prototype. Only the Penny Asset Library tab reads real Drive data.

One file remains **Stale** and should not appear in any demonstration until reviewed: `demandStages.ts` — the eight-stage pipeline model has not been verified against the current TT intake process and should be presented as sample data only.

`commProviders.ts` and `commRouting.ts` have been corrected and are no longer Stale.

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

The following are explicitly not in scope, or are deferred to a later phase. Items that shipped in Phase 1 have been removed — see the Phase 1 completion summary (§ 4).

| Feature | Position |
|---|---|
| Multi-tenant or multi-org support | Not applicable — single org (Transition Trails) |
| LMS integration (lesson delivery, progress tracking) | Phase 2+ — requires LMS selection decision |
| Coach and Learner views | Planned inside Trail OS, gated by Google Groups membership — not yet designed. Will not be a separate product. |
| Mobile app | Trail OS is desktop-first; mobile is accessible but not optimised |
| Real-time collaborative editing | Not planned — async patterns suffice |
| Custom report builder | Deferred — Phase 2 data queries will enable standard reports |
| Email marketing / campaign management | Not in scope — Salesforce PMM handles this |
| Financial / billing management | Not in scope — handled by Salesforce |
| Video/content hosting | Not in scope — Google Drive and LMS handle content |
| Org Memory live records | Phase 2 — architecture defined, build deferred |

Items originally in this list that shipped in Phase 1: live user authentication (Clerk v6 + Google Sign-In), Agentforce integration (live POC), and automated testing (105 tests, 7 files).

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
