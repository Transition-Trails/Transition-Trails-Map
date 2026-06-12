# Trail OS Roadmap

> This roadmap reflects the current Phase 1 completion state and the planned Phase 2 priorities.  
> The authoritative backlog is maintained in the app at `/admin/phase2-backlog` (19 draft cards).  
> Dates are targets, not commitments.

---

## Phase 1 — Completed (June 2026)

✅ Complete navigational shell (7 sidebar groups, 40+ routes)  
✅ All sections with realistic prototype data  
✅ Role-aware UX (4 tiers: Everyday, Power, Admin, Super Admin)  
✅ Overview-first hub pattern across all major sections  
✅ Salesforce REST API integration (live — PMM + NPSP)  
✅ Slack POC integration (live — @coachconnectbot)  
✅ Google OAuth wizard (in progress — tokens pending)  
✅ Phase 1 UX audit and standards documentation  
✅ Phase 1 Completion Audit page  
✅ 19-card Phase 2 backlog  
✅ GitHub repository documentation  

---

## Phase 2 — Planned (Q3–Q4 2026)

Phase 2 focuses on **replacing hardcoded prototype data with live connections** and **wiring Penny to real AI and data sources**.

### Theme 1 — Live Penny AI

| Card | Description | Priority |
|---|---|---|
| `p2-penny-live-llm` | Connect Penny UI to live Gemini LLM endpoint | High |
| `p2-penny-rag` | RAG over knowledge sources — governed by trust review system | High |
| `p2-penny-assessment` | Live assessment and quiz delivery via Penny | Medium |
| `p2-coaching-flows` | Structured coaching conversation flows with memory | Medium |

### Theme 2 — Live Data

| Card | Description | Priority |
|---|---|---|
| `p2-sf-live-queries` | Replace hardcoded operational data with live Salesforce queries | High |
| `p2-trail-signals-engine` | Live Trail Signals aggregation (Salesforce + Slack + Penny events) | High |
| `p2-agentforce` | Agentforce coexistence model and handoff protocol with Penny | Medium |

### Theme 3 — Trail Quests

| Card | Description | Priority |
|---|---|---|
| `p2-trail-quest-live` | Live Trail Quest delivery — learning journey activation via Penny | Medium |

### Theme 4 — UX Enhancements

| Card | Description | Priority |
|---|---|---|
| `p2-universal-sidebar-panel` | Ask Penny available from every page via persistent side panel | High |
| `p2-trail-signals-control` | Trail Signals Control Center — personalised watch rules and urgency settings | Medium |
| `p2-gmail-panel` | Gmail / Google Mail action panel in right rail | Low |
| `p2-calendar-panel` | Google Calendar action panel — no-response invites, prep briefs | Low |

### Theme 5 — Testing and Quality

| Card | Description | Priority |
|---|---|---|
| `p2-vitest-automation` | Vitest test suite — unit, integration, and component coverage | High |

---

## Phase 3 — Under Consideration

These items are not yet on the backlog. They represent likely directions after Phase 2 is complete.

- **User authentication** — Salesforce SSO or Replit Auth for all tiers (removes the prototype tier switcher)
- **Org Memory** — live institutional memory layer: decisions, history, lessons learned
- **LMS integration** — learner progress tracking and content delivery
- **Live blueprint validation** — automatic standards gap detection against live program data
- **Learner-facing view** — Everyday user tier serving as a real learner portal
- **Notification system** — programmatic Slack notifications driven by Trail Signals
- **Mobile optimisation** — Trail OS is currently desktop-first; a responsive mobile pass is planned

---

## How to Contribute to Roadmap Items

1. Check the backlog at `/admin/phase2-backlog` for an existing card before creating a new one.
2. If a feature is clearly Phase 2, add a draft card to `Phase2Backlog.tsx` rather than implementing it.
3. To propose a new Phase 3 item, open a GitHub issue using the Feature Request template.
4. Phase 2 implementation branches use the naming convention: `phase2/<card-id>` (e.g., `phase2/p2-penny-live-llm`).
