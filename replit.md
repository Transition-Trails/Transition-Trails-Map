# Trail OS Operating Platform — Transition Trails

A unified internal operating dashboard for Transition Trails Academy. Consolidates Navigator, Operations Center, Demand Management, Penny Command Center, Knowledge Library, Collaboration, and Administration into a single shell with live integrations.

## Run & Operate

- `pnpm --filter @workspace/program-map run dev` — run the dashboard (auto-wired via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + shadcn/ui + framer-motion + Tailwind
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk v6 + Google OAuth + Google Groups auto-tier
- State: TanStack Query + AppContext (in-memory for prototype data)

## Live Integrations (Phase 1)

| Integration          | Status        | Notes                                                                 |
|----------------------|---------------|-----------------------------------------------------------------------|
| Salesforce           | Live          | REST API · 127 Accounts · 129 Contacts · NPSP + PMM (7/8 objects)   |
| Slack                | Live (POC)    | @coachconnectbot · bot posting confirmed · channels:read pending      |
| Gemini / Penny       | Live          | Penny → Gemini 2.5 Flash · POST /api/penny/ask · billing active       |
| Google Drive         | Live          | OAuth refresh token active · program workspace sync is Phase 2        |
| Google Calendar      | Live          | Real events via /api/calendar/events · Penny prep briefs per event    |
| Gmail                | Live          | gmail.readonly + gmail.send · real inbox · Penny draft + send         |
| Agentforce           | Live (POC)    | Sessions API · dual-AI coaching with Penny on Assessment page         |
| Google Auth / Groups | Live          | Clerk v6 · Google Sign-In · 3 Google Groups drive access tier         |

Phase 2: Google Chat · Mural · GA4 · Google Drive rule config · full Agentforce context handoff

## Where things live

```
artifacts/program-map/src/
  App.tsx                         # Route definitions — 50+ routes
  context/AppContext.tsx          # Global state — panels, tier, Penny, lens
  data/readinessState.ts          # Single source of truth for integration status
  config/terminology.ts           # Branded UI labels (Trail Signals, Penny, etc.)
  components/
    layout/
      AppShell.tsx                # Root shell (Sidebar + Topbar + ContextPanel)
      Sidebar.tsx                 # 220px collapsible 7-group sidebar
      Topbar.tsx                  # Breadcrumb + Lens picker + panel triggers
      ContextPanel.tsx            # "Knowledge Brief" right rail (ContextBar)
      GmailActionPanel.tsx        # Slide-over Gmail compose panel
    workspace/
      ObjectWorkspace.tsx         # Shared list+detail workspace shell
      HubShell.tsx                # Tab-based hub wrapper (accepts actions prop)
  pages/
    navigator/                    # Program Map, RESOLVE, Roles, Trail OS Map
    operations/                   # Health, Demand, Scorecards, Trends, SF Cases
    demand/                       # Intake, Cases, Epics, Features, Stories, Roadmap
    penny/                        # Command Center, Capabilities, Prompts, Learners,
                                  #   Trail Quests, Assessments, Agentforce, Intelligence
    knowledge/                    # Overview, Sources, Library, Org Memory
    collaboration/                # Overview (rule hub), Gmail, Calendar, Slack,
                                  #   Channels, Templates, Briefs, Notifications
    admin/                        # Setup, Integrations, Phase 1 Readiness,
                                  #   Phase 1 Audit, Phase 2 Backlog, Secrets Audit,
                                  #   Google OAuth, SF Validation, …
```

## Navigation structure

| Sidebar Group        | Key Routes                                                                 |
|----------------------|----------------------------------------------------------------------------|
| Navigator            | /navigator/program-map, /resolve, /roles, /trail-os-map                   |
| Operations Center    | /operations, /operations/health, /operations/demand, /operations/scorecards|
| Demand Management    | /demand/intake, /demand/cases, /demand/epics, /demand/features, /demand/stories |
| Penny Command Center | /penny, /penny/capabilities, /penny/prompts, /penny/learners, /penny/test |
| Knowledge Library    | /knowledge, /knowledge/sources, /knowledge/library, /knowledge/memory     |
| Collaboration        | /collaboration, /collaboration/gmail, /collaboration/calendar-live,        |
|                      | /collaboration/slack, /collaboration/channels, /collaboration/templates   |
| Administration       | /admin/setup, /admin/integrations, /admin/phase1-readiness, …             |

## Architecture decisions

- **Sidebar groups are collapsible** with smooth max-height animation; the active group auto-opens.
- **Lens picker is Topbar-only** and only shows on `/navigator/program-map`, `/resolve`, `/trail-os-map`. Two lenses: executive (amber) + builder (sky).
- **ContextBar is always mounted** — 32px no-context state, 40px active. Never returns null.
- **HubShell hides the tab bar when only 1 tab is passed** — Everyday users see plain content without tab chrome.
- **Collaboration Overview is a rule management hub** — configures how each channel (Slack, Gmail, Calendar, Drive) routes signals to Penny and Trail Signals. Not an activity feed.
- **Admin uses URL-based section routing** via `useLocation`; sidebar links (`/admin/setup` etc.) set the view directly.
- **Access tiers** (Everyday / Power / Admin) drive what tabs, actions, and sidebar items are visible. Resolved from Google Groups membership via `/api/auth/tier` on every login.
- **Trail Signals** are system-assigned in Phase 1 — platform selects signals based on tier, role, context, and program ownership.
- **Penny** uses Gemini 2.5 Flash with a 22-chunk RAG corpus (tier-filtered). `pendingPennyQuery` in AppContext pre-fills the Ask Penny panel from anywhere in the app.
- **All non-integration data is in-memory prototype** — AppContext holds programs, source docs, resolve phases, Penny caps. Edits reset on refresh. Live data: Salesforce, Gmail, Calendar, Slack bot.

## Product

Internal operating platform for the Transition Trails Academy team. Phase 1 complete — shell architecture, live integrations (Salesforce, Gmail, Calendar, Slack, Agentforce, Penny/Gemini, Google Auth), and role-gated access are all production-ready. Phase 2 targets live data wiring to dashboards, Google Chat, Mural, and mobile.

## User preferences

_Populate as you build._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use the workflow or `pnpm --filter @workspace/<slug> run dev`.
- `pnpm --filter @workspace/program-map run typecheck` (or `npx tsc --noEmit --skipLibCheck` in the artifact dir) verifies types without a full build.
- Vite HMR may show transient "file not found" errors when many files are written quickly — they self-resolve.
- LibraryDocuments.tsx is a re-export of SourceDocs: `export { default } from '@/pages/SourceDocs'`.
- Calendar API route is `/api/calendar/events` (not `/api/google-calendar/events`).
- Wouter navigation: use `const [, navigate] = useLocation()` — there is no `useNavigate`.
- Never hardcode brand strings — import from `src/config/terminology.ts` (`TERMS`).
- `readinessState.ts` is the single source of truth for integration health — update it first, then surface changes in Admin pages.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Phase 1 Readiness: `/admin/phase1-readiness` — scored dashboard for all 6 domains.
- Phase 2 Backlog: `/admin/phase2-backlog` — all deferred features with draft cards.
- Integration hub: `/admin/integrations` — token health, config, and quick links per integration.
- Collaboration signal rules: `/collaboration` — configure how each channel feeds Penny + Trail Signals.
