# Trail OS Operating Platform — Transition Trails

A unified internal operating dashboard for Transition Trails. Consolidates Navigator, Operations Center, Demand Management, Penny Command Center, Knowledge Library, and Administration into a single shell.

## Run & Operate

- `pnpm --filter @workspace/program-map run dev` — run the dashboard (auto-wired via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + shadcn/ui + framer-motion + Tailwind
- API: Express 5 (port 8080)
- DB: PostgreSQL + Drizzle ORM
- State: TanStack Query + AppContext (in-memory for prototype)

## Where things live

```
artifacts/program-map/src/
  App.tsx                       # Route definitions — 40+ routes
  components/
    layout/
      AppShell.tsx              # Root shell (Sidebar + Topbar + ContextPanel)
      Sidebar.tsx               # 220px collapsible 6-group sidebar
      Topbar.tsx                # Breadcrumb + Lens picker (Navigator-only)
      ContextPanel.tsx          # "Knowledge Brief" right rail
    platform/
      PageShell.tsx             # Shared stub wrapper + StatusDot + StatCard + OpsHeader
  pages/
    navigator/                  # Program Map, RESOLVE, Roles, Trail OS Map, Knowledge Relationships
    operations/                 # 6 prototype panels (real data)
    demand/                     # Intake, Cases, Epics, Features, Stories, Roadmap, Change Request
    penny/                      # Learners, Logs, Trail Quests, Assessments, Intelligence, Test Penny, …
    library/                    # Documents (→ SourceDocs), Templates, SF KB, Source Mapping, Search
    Admin.tsx                   # Knowledge Management hub — URL-routed, 11 sections
```

## Navigation structure

| Sidebar Group       | Key Routes                                          |
|---------------------|-----------------------------------------------------|
| Navigator           | /navigator/program-map, /resolve, /roles, /trail-os-map |
| Operations Center   | /operations/program-health … trail-os-health        |
| Demand Management   | /demand/intake, cases, epics, features, stories, roadmap |
| Penny Command Center| /penny/learners, logs, test-penny …                 |
| Knowledge Library   | /library/documents, templates, salesforce-kb, search |
| Administration      | /admin, /admin/:section (URL-routed, 11 sections)   |

## Architecture decisions

- **Sidebar groups are collapsible** with smooth max-height animation; the active group auto-opens.
- **Lens picker is Topbar-only** and only shows on `/navigator/program-map`, `/resolve`, `/trail-os-map`.
- **Admin uses URL-based section routing** via `useLocation` so sidebar links (`/admin/programs` etc.) set the view correctly.
- **PageShell** is the shared stub for future-state and coming-soon pages; Operations Center pages use their own layout with the exported `OpsHeader`, `StatCard`, `StatusDot` primitives.
- **All data is in-memory prototype** — AppContext holds programs, source docs, resolve phases, Penny caps, Trail OS caps. Edits reset on refresh.

## Product

Internal operating platform shell for Transition Trails team. In prototype mode — no live Salesforce, GA4, or Agentforce connections yet. All integrations are planned for Q3–Q4 2025.

## User preferences

_Populate as you build._

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use the workflow or `pnpm --filter @workspace/<slug> run dev`.
- `pnpm --filter @workspace/program-map run typecheck` passes; use it to verify before claiming done.
- Vite HMR may show transient "file not found" errors when many files are written in quick succession — they self-resolve as files land on disk.
- LibraryDocuments.tsx is just a re-export of SourceDocs: `export { default } from '@/pages/SourceDocs'`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
