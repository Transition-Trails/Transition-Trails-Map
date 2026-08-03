# Trail OS — Transition Trails Operating Platform

> Unified internal operating platform for the Transition Trails team.  
> Consolidates program management, operations intelligence, knowledge governance, Penny AI, and organizational administration into a single shell.

---

## What is Trail OS?

Trail OS is the internal operating system for Transition Trails — a nonprofit delivering workforce development programs to adult learners. It replaces disconnected spreadsheets and tools with a single platform where program directors, coaches, and staff can:

- Monitor program health, cohort signals, and operational readiness
- Govern knowledge sources, standards, and blueprints
- Manage and test Penny (the Transition Trails AI coaching layer)
- Connect Salesforce, Slack, Google Workspace, and AI providers
- Administer roles, integrations, and organizational configuration

**Phase 1 is complete as of June 2026.** The full audit is available at `/admin/phase1-audit` inside the app.

---

## Quick Start

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL (for the API server)

### Install dependencies

```bash
pnpm install
```

### Run the frontend (program map)

```bash
pnpm --filter @workspace/program-map run dev
```

### Run the API server

```bash
pnpm --filter @workspace/api-server run dev
```

### Typecheck (full workspace)

```bash
pnpm run typecheck
```

> **Never run `pnpm dev` at the workspace root.** Use the `--filter` flag or the Replit workflow. See [CONTRIBUTING.md](CONTRIBUTING.md) for full development workflow.

---

## Project Structure

```
artifacts/
  program-map/        # React + Vite frontend
  api-server/         # Express 5 API server
lib/                  # Shared TypeScript packages
scripts/              # Utility scripts
```

See [TRAIL_OS_SPEC.md](TRAIL_OS_SPEC.md) for the complete technical specification.

---

## Tech Stack

| | |
|---|---|
| **Frontend** | React 18, Vite, Wouter, shadcn/ui, Tailwind CSS, Framer Motion |
| **Language** | TypeScript 5.9 (strict) |
| **Runtime** | Node.js 24 |
| **Package manager** | pnpm workspaces (monorepo) |
| **API** | Express 5 |
| **Database** | PostgreSQL + Drizzle ORM |
| **State** | TanStack Query + AppContext (in-memory prototype) |
| **Deployment** | Replit |

---

## Navigation at a Glance

| Sidebar group | Base path | Purpose |
|---|---|---|
| Operations | `/operations` | Program health, scorecards, demand |
| Programs | `/program` | Program management, curriculum, standards, blueprints |
| Penny | `/penny` | AI capability governance and testing |
| Knowledge | `/knowledge` | Source governance, library, relationships |
| Collaboration | `/collaboration` | Trail Signals, Gmail, Calendar, Slack, channels, templates |
| Administration | `/admin` | Integrations, people and access, Digital Twin |

> Navigation is documented once in the specification. See [Navigation Architecture (§ 7)](TRAIL_OS_SPEC.md#7-navigation-architecture) for the full sidebar definition, tier gates, and legacy redirect map.

---

## User Roles

| Tier | Who | Access |
|---|---|---|
| Everyday | Learners / basic staff | Programs, Documents, basic Penny |
| Power | Coaches / facilitators | All operational hubs, full Penny |
| Admin | Program directors | All + Administration, Blueprint, integrations |
| Super Admin | Platform owners | All + Secrets Audit, Phase 1/2 tooling |

---

## Integration Status

> Authoritative status and last-verified dates: `src/data/readinessState.ts`. The table below reflects that file.

| System | Status | Notes |
|---|---|---|
| Salesforce | Live | REST API — PMM + NPSP · 127 Accounts · 129 Contacts |
| Slack | Live | @penny bot — posting to #penny-ai and #admin channels confirmed |
| Google OAuth + Groups | Live | Clerk v6 · Google Sign-In · 3 Groups auto-tier · wizard at `/admin/integrations/google-auth` |
| Gmail | Live | `gmail.readonly` + `gmail.send` · real inbox · Penny draft + send |
| Google Calendar | Live | Real events via `/api/calendar/events` · Penny prep briefs per event |
| Google Drive | Live | Penny Asset Library reads real Drive files · program workspace sync is Phase 2 |
| Gemini / Penny AI | Live | Gemini 2.5 Flash · `POST /api/penny/ask` · billing active · 22-chunk RAG corpus |
| Agentforce | Live (POC) | Dual-AI coaching on Assessments page · Salesforce Sessions API confirmed |

---

## Documentation

| File | Contents |
|---|---|
| [TRAIL_OS_SPEC.md](TRAIL_OS_SPEC.md) | Full technical specification |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow, branches, PRs |
| [SECURITY.md](SECURITY.md) | Security policy, secrets handling, vulnerability reporting |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [ROADMAP.md](ROADMAP.md) | Phase 2 themes and priorities |

---

## Secrets

**Never commit secrets, API keys, or tokens to this repository.**

Secrets belong in:
- **Replit development**: Replit Secrets panel
- **CI/CD**: GitHub repository secrets
- **Production**: Environment variable injection at deploy time

See [SECURITY.md](SECURITY.md) for the full policy.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch conventions, PR templates, commit style, and development workflow.

---

## License

Internal use only — Transition Trails. Not licensed for redistribution.
