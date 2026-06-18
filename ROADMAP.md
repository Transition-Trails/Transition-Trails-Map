# Trail OS Roadmap

> This roadmap reflects the current Phase 1 completion state and the planned Phase 2 priorities.  
> The authoritative backlog is maintained in the app at `/admin/phase2-backlog` (19 draft cards).  
> Dates are targets, not commitments.

---

## Phase 1 — Completed (June 2026)

✅ Complete navigational shell (7 sidebar groups, 50+ routes)  
✅ All sections with realistic prototype data  
✅ Role-aware UX (4 tiers: Everyday, Power, Admin, Super Admin)  
✅ Overview-first hub pattern across all major sections  
✅ Salesforce REST API integration (live — PMM + NPSP · 127 Accounts · 129 Contacts)  
✅ Slack POC integration (live — @coachconnectbot posting confirmed)  
✅ **Penny AI live** — Gemini 2.5 Flash · `POST /api/penny/ask` · billing active · 22-chunk tier-filtered RAG corpus  
✅ **Gmail live** — gmail.readonly + gmail.send · real inbox · Penny draft + send  
✅ **Google Calendar live** — real events via `/api/calendar/events` · Penny prep briefs per event  
✅ **Agentforce POC live** — Salesforce Sessions API · dual-AI coaching on Penny Assessments page  
✅ **Clerk v6 + Google Sign-In live** — Google OAuth · Google Groups auto-tier assignment  
✅ Ask Penny global slide-over panel — globally mounted in AppShell, accessible from every page  
✅ Google OAuth wizard at `/admin/integrations/google-auth`  
✅ Phase 1 UX audit and standards documentation  
✅ Phase 1 Completion Audit page (`/admin/phase1-audit`)  
✅ People & Access Permission Matrix — sortable/filterable 11-persona matrix + Access Tiers & Auth tab  
✅ 19-card Phase 2 backlog  
✅ GitHub repository documentation  

---

## Phase 2 — Planned (Q3–Q4 2026)

Phase 2 focuses on **replacing hardcoded prototype data with live connections**, **completing the Google integration layer**, and **deepening Penny's contextual intelligence**.

> **Note:** Several items originally scoped to Phase 2 shipped in Phase 1 and are marked ✅ below.

### Theme 1 — Penny AI (deepen)

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-penny-live-llm` | Connect Penny UI to live Gemini LLM endpoint | High | ✅ Complete (Phase 1) |
| `p2-penny-rag` | RAG over knowledge sources — governed by trust review system | High | ✅ Complete (Phase 1 · 22-chunk corpus) |
| `p2-penny-memory` | Multi-turn conversational memory and session continuity | High | Planned |
| `p2-penny-assessment` | Live assessment and quiz delivery via Penny | Medium | Planned |
| `p2-coaching-flows` | Structured coaching conversation flows with memory | Medium | Planned |

### Theme 2 — Live Data

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-sf-live-queries` | Replace hardcoded operational data with live Salesforce queries | High | Planned |
| `p2-trail-signals-engine` | Live Trail Signals aggregation (Salesforce + Slack + Penny events) | High | Planned |
| `p2-agentforce` | Agentforce coexistence model — full context handoff protocol | Medium | In Progress (POC live) |

### Theme 3 — Google Integration (complete)

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-gmail-panel` | Gmail / Google Mail action panel in right rail | Low | ✅ Complete (Phase 1) |
| `p2-calendar-panel` | Google Calendar action panel — no-response invites, prep briefs | Low | ✅ Complete (Phase 1) |
| `p2-google-drive` | Google Drive API — wire knowledge sources to Drive folders | High | Planned |
| `p2-google-groups-dwd` | Complete Google Groups DWD tier auto-assignment (service account + impersonation) | Medium | In Progress |

### Theme 4 — Trail Quests

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-trail-quest-live` | Live Trail Quest delivery — learning journey activation via Penny | Medium | Planned |

### Theme 5 — UX Enhancements

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-universal-sidebar-panel` | Ask Penny available from every page via persistent slide-over | High | ✅ Complete (Phase 1) |
| `p2-trail-signals-control` | Trail Signals Control Center — personalised watch rules and urgency settings | Medium | Planned |

### Theme 6 — Testing and Quality

| Card | Description | Priority | Status |
|---|---|---|---|
| `p2-vitest-automation` | Vitest test suite — unit, integration, and component coverage | High | Planned |

---

## Phase 3 — Under Consideration

These items are not yet on the backlog. They represent likely directions after Phase 2 is complete.

- **Org Memory** — live institutional memory layer: decisions, history, lessons learned
- **LMS integration** — learner progress tracking and content delivery
- **Live blueprint validation** — automatic standards gap detection against live program data
- **Learner-facing view** — Everyday user tier serving as a real learner portal
- **Notification system** — programmatic Slack notifications driven by Trail Signals
- **Mobile optimisation** — Trail OS is currently desktop-first; a responsive mobile pass is planned
- **Custom report builder** — operational reports from live Salesforce + Penny data

---

## How to Contribute to Roadmap Items

1. Check the backlog at `/admin/phase2-backlog` for an existing card before creating a new one.
2. If a feature is clearly Phase 2, add a draft card to `Phase2Backlog.tsx` rather than implementing it.
3. To propose a new Phase 3 item, open a GitHub issue using the Feature Request template.
4. Phase 2 implementation branches use the naming convention: `phase2/<card-id>` (e.g., `phase2/p2-sf-live-queries`).
