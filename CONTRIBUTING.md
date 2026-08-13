# Contributing to Trail OS

Trail OS is an internal platform for Transition Trails. This guide covers the development workflow, branch conventions, commit style, and PR process for all contributors.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Workspace Rules](#workspace-rules)
3. [Branch Conventions](#branch-conventions)
4. [Branch Protection Rules](#branch-protection-rules)
5. [Commit Style](#commit-style)
6. [Pull Request Process](#pull-request-process)
7. [Docs Sync Automation](#docs-sync-automation)
8. [Code Standards](#code-standards)
9. [UX Standards](#ux-standards)
10. [Testing Requirements](#testing-requirements)
11. [Adding New Pages or Sections](#adding-new-pages-or-sections)
12. [Working with Data](#working-with-data)
13. [Adding New Integrations](#adding-new-integrations)
14. [Environment Variables](#environment-variables)

---

## Development Setup

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL (for API server features)
- A Replit account (recommended — the project is wired to run in Replit)

### Install

```bash
git clone https://github.com/Transition-Trails/TRAIL_OS.git
cd TRAIL_OS
pnpm install
```

### Run

```bash
# Frontend (React + Vite)
pnpm --filter @workspace/program-map run dev

# API server (Express 5)
pnpm --filter @workspace/api-server run dev

# Typecheck (full workspace — run before every commit)
pnpm run typecheck
```

> ⚠️ **Do NOT run `pnpm dev` at the workspace root.** There is no root dev script by design. Always use `--filter`.

---

## Workspace Rules

Trail OS is a pnpm monorepo. Key rules:

- **Each package manages its own dependencies.** Don't add a dependency to the root unless it's a shared dev tool (TypeScript, ESLint, Vitest).
- **Frontend artifacts use `devDependencies` only** (Vite bundles everything at build time).
- **Server artifacts** use `dependencies` for runtime packages (`express`, `drizzle-orm`) and `devDependencies` for build tools and `@types/*`.
- **Never use `pnpm add --no-frozen-lockfile`** — if you need a new package, `pnpm add <pkg>` inside the relevant package directory.
- **Shared code** goes in `lib/` as a composite TypeScript package. Artifact packages should not import each other directly.

### TypeScript

- `pnpm run typecheck` runs the full workspace check (lib build → leaf artifact checks).
- `pnpm --filter @workspace/program-map run typecheck` checks only the frontend.
- TypeScript must pass clean (`0 errors`) before any PR merge.
- Do not add leaf artifacts (e.g., `program-map`) to the root `tsconfig.json` references — that file is for libs only.

#### Lib build dependency

`lib/` packages (`lib/db`, `lib/api-zod`, etc.) are composite TypeScript projects whose
compiled declarations live in their `dist/` directories. Artifact packages (`artifacts/api-server`,
`artifacts/program-map`, etc.) import those declarations at typecheck time.

The root `typecheck` script always rebuilds libs first:

```
pnpm run typecheck:libs   # tsc --build — rebuilds any lib whose source is newer than dist/
pnpm -r ... typecheck     # artifact-level checks against fresh declarations
```

**Never skip `typecheck:libs`.** If `dist/` is stale (e.g. after `git pull` adds a column to
`lib/db/src/schema/`) downstream typechecks will silently use the old declarations, hiding
real errors or surfacing spurious ones.

If you suspect the incremental build state (`.tsbuildinfo`) is corrupted — for example after
a branch switch where timestamps are unreliable — force a clean lib rebuild before re-running:

```bash
pnpm run typecheck:libs:force   # tsc --build --force — ignores tsbuildinfo cache
```

---

## Branch Conventions

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Direct pushes are blocked — use PRs only. |
| `dev` | Integration branch for ongoing work. PRs merge here first. |
| `feature/<short-description>` | New features or sections (e.g., `feature/programs-overview`) |
| `fix/<short-description>` | Bug fixes (e.g., `fix/hue-map-stone-crash`) |
| `chore/<short-description>` | Maintenance, dependency updates, config (e.g., `chore/update-pnpm`) |
| `docs/<short-description>` | Documentation only (e.g., `docs/trail-os-spec`) |
| `phase2/<card-id>` | Phase 2 backlog items (e.g., `phase2/p2-penny-live-llm`) |

### Branch rules

- Branch from `dev`, not `main`.
- Keep branches short-lived — merge or close within one sprint.
- Delete branches after merge.
- One feature or fix per branch — don't bundle unrelated changes.

---

## Branch Protection Rules

The `main` branch is protected on GitHub to prevent history corruption from the post-merge automation and any other direct pushes. The rules are configured under **Settings → Branches → Branch protection rules** in the GitHub repository.

### Active rules on `main`

| Rule | Setting |
|---|---|
| Require a pull request before merging | Enabled — at least 1 approval required |
| Allow force pushes | Disabled |
| Allow deletions | Disabled |
| Require status checks to pass before merging | `Sync Docs to GitHub / validate-and-tag` must pass |

### Why these rules exist

- **No force pushes** — the post-merge script uses `git push origin HEAD:main`. Without this guard, a misconfigured push could rewrite history and overwrite legitimate commits including documentation.
- **PR required** — all intentional changes to `main` go through code review via `dev → main` release PRs, not direct pushes.
- **`validate-and-tag` required check** — the `sync-docs` workflow validates that all required docs are present and non-empty. Requiring it as a status check means a PR that accidentally deletes or empties a root doc file cannot merge. The job runs on both `push` to `main` and `pull_request` targeting `main` (for doc-touching files), so GitHub can enforce it on PRs before they land.

### Configuring the protection rule (one-time setup)

If the rule was ever removed or the repo was re-created, restore it:

1. Go to **Settings → Branches → Add branch protection rule**.
2. Branch name pattern: `main`.
3. Check **Require a pull request before merging** → set required approvals to `1`.
4. Check **Require status checks to pass before merging** → search for `validate-and-tag` and add it.
5. Check **Do not allow bypassing the above settings**.
6. Uncheck **Allow force pushes** and **Allow deletions**.
7. Save.

> **Note:** The GitHub Actions bot (`github-actions[bot]`) is exempt from branch protection when it pushes the `latest-docs` tag — tags are not subject to the branch rules above.

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Use for |
|---|---|
| `feat` | New feature or page |
| `fix` | Bug fix |
| `refactor` | Code restructure without behaviour change |
| `style` | UX/visual changes (no logic change) |
| `docs` | Documentation only |
| `chore` | Build, config, dependency changes |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |

### Scope examples

`programs`, `knowledge`, `penny`, `collaboration`, `admin`, `sidebar`, `topbar`, `context`, `api`, `data`, `types`

### Examples

```
feat(knowledge): add KnowledgeOverview command center landing

fix(phase2-backlog): add 'stone' to HUE_MAP to prevent runtime crash

style(governance): replace font-serif with font-semibold on stat values

docs: add TRAIL_OS_SPEC.md and supporting GitHub docs

chore(deps): update lucide-react to 0.400.0
```

---

## Pull Request Process

1. **Branch from `dev`**, make your changes, pass typecheck.
2. **Open a PR against `dev`** (not `main`).
3. Fill out the [PR template](.github/PULL_REQUEST_TEMPLATE.md).
4. **Checklist before requesting review**:
   - [ ] `pnpm run typecheck` passes (0 errors)
   - [ ] No `font-serif` added anywhere
   - [ ] No secrets, API keys, or `.env` values committed
   - [ ] New pages follow Phase 1 UX standards (compact headers, no empty default panes, no modals)
   - [ ] New data files use typed interfaces (no `any`)
   - [ ] New hub tabs follow the overview-first pattern
   - [ ] Sidebar changes update `Sidebar.tsx` navGroups AND any relevant admin tiles
   - [ ] New Phase 2 items are added to `Phase2Backlog.tsx` BACKLOG_CARDS (not built as live features)
5. **At least one reviewer** must approve before merge.
6. **Squash and merge** into `dev` — keep the commit history clean.
7. Periodically, `dev` is merged into `main` as a release.

---

## Docs Sync Automation

Root-level documentation files (`TRAIL_OS_SPEC.md`, `ROADMAP.md`, `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`) are automatically kept in sync with the GitHub remote through two layers of automation.

### Layer 1 — Post-merge push (Replit → GitHub)

`scripts/post-merge.sh` runs automatically after every Replit task merge. It installs dependencies, runs migrations, and then pushes the merged commit to `origin main`. This means every merge in Replit — including doc-only changes — is immediately reflected on GitHub without a separate manual push.

If the push fails (e.g. the remote is temporarily unreachable), the script prints a warning but does **not** block the merge. Resolve it by running:

```bash
git push origin HEAD:main
```

### Layer 2 — GitHub Actions validation (`.github/workflows/sync-docs.yml`)

Once a commit lands on `origin main`, the `sync-docs` workflow triggers automatically on any push that touches a root-level doc file. It:

1. **Validates** that all required docs exist and are non-empty — fails loudly if any are missing.
2. **Summarises** which files changed (visible in the GitHub Actions run summary).
3. **Moves the `latest-docs` tag** to the current commit, so the GitHub UI always shows exactly which commit has the most recent documentation state.

### Convention

If you update `TRAIL_OS_SPEC.md`, `ROADMAP.md`, or any root doc:

- **In Replit**: no extra steps needed — the post-merge push handles it.
- **Outside Replit** (local clone): push to `origin main` after your commit. The `docs/<branch>` branch convention in [Branch Conventions](#branch-conventions) is a good fit for doc-only changes.

---

## Code Standards

### TypeScript

- Strict mode is enabled — no `any` unless absolutely necessary and documented with a comment.
- Use `as const` for configuration objects and enums.
- Export types alongside their data (`export type`, `export interface`).
- Prefer `interface` for object shapes, `type` for unions and utility types.

### React

- Functional components only — no class components.
- Prefer `useMemo` for expensive derivations from props/context.
- Co-locate small helper components at the top of the file (e.g., `Eyebrow`, `StatPill`, `NavCard`).
- Do not use `console.log` in production code — use the server `logger` (see API server docs) or remove before committing.

### Imports

- Use `@/` path alias for all imports within `program-map/src/`.
- Group imports: React core → libraries → internal components → data/types.
- Do not import from sibling artifact packages — use `lib/` for shared code.

### Tailwind

- Use the existing design token classes (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`) — do not hardcode hex colours.
- Follow the Phase 1 UX standards for all new components (see below and `/admin/ux-standards`).

---

## UX Standards

All new UI must follow the Phase 1 UX standards. The full reference is in the app at `/admin/ux-standards` and in [TRAIL_OS_SPEC.md § 5](TRAIL_OS_SPEC.md#5-phase-1-ux-standards).

### Quick reference

| Rule | Detail |
|---|---|
| No `font-serif` | Use `font-semibold` or `font-bold` for emphasis everywhere |
| Stat values | `text-xl font-semibold` — never `text-2xl` or `text-3xl` |
| Eyebrow labels | `text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50` |
| Cards | `rounded-lg border border-border bg-white p-4` |
| No empty panes | All pages must show meaningful content at first render |
| No modals | Use inline panels, tabs, or drawers instead |
| No hero cards | Remove intro/description cards from operational page tops |
| Hub first tab | Always `Overview` — command center with real data, not a workspace |
| Workspace tabs | `ObjectWorkspace` (left-list/right-detail) is a secondary tab, never default |

---

## Testing Requirements

### Automated test suite (active)

Trail OS has a Vitest test suite covering API routes and frontend data integrity. Run it with:

```bash
# api-server tests (43 tests across 4 files)
pnpm --filter @workspace/api-server test

# program-map tests (62 tests across 3 files)
pnpm --filter @workspace/program-map test
```

**Test files:**

| File | Package | Coverage |
|---|---|---|
| `health.test.ts` | api-server | `/api/healthz` shape, content-type, 404 |
| `salesforce.test.ts` | api-server | SF operations summary shape, cache, validate endpoint |
| `promptTemplates.test.ts` | api-server | Full CRUD contract for `/api/penny/prompt-templates` routes |
| `promptVariables.test.ts` | api-server | Full CRUD contract for `/api/penny/prompt-variables` routes |
| `validationData.test.ts` | program-map | Slack/Calendar/Drive data integrity (shape, uniqueness, enum values) |
| `formatSyncAge.test.ts` | program-map | `formatSyncAge` utility time-bucket logic |
| `pennyStudioData.test.ts` | program-map | Prompt template + variable data integrity (shape, uniqueness, valid enums) |

**Mocking pattern for DB-backed API tests:** use `vi.hoisted()` to create mock fn references accessible in both `vi.mock()` factory and test bodies. See `promptTemplates.test.ts` for the reference implementation.

### `routes.smoke.ts`

`artifacts/program-map/src/__tests__/routes.smoke.ts` is a type-checked route manifest — not a runtime test. It lists every active route and redirect in `App.tsx`. Verified by `pnpm --filter @workspace/program-map run typecheck`. Update it when adding or removing routes from `App.tsx`.

### Required before every PR

1. `pnpm run typecheck` — must pass with 0 errors.
2. `pnpm --filter @workspace/api-server test` and `pnpm --filter @workspace/program-map test` — all tests must pass.
3. Visually verify your page at the relevant route.
4. Check at all four tier levels (use the tier switcher in the sidebar footer).
5. Verify no browser console errors.

### When to add tests

- **New API route** → add tests to the relevant test file in `api-server/src/__tests__/`; follow the `vi.hoisted` + `vi.mock('@workspace/db')` pattern for DB-backed routes.
- **New data file** (static data in `program-map/src/data/`) → add data integrity tests to `program-map/src/__tests__/`; follow the `validationData.test.ts` pattern (non-empty, unique IDs, required fields, valid enum values).
- **New utility function** → add unit tests alongside the existing utility tests.
- **New route in `App.tsx`** → add the entry to `routes.smoke.ts`.

---

## Adding New Pages or Sections

### New hub page

1. Create the page component in `src/pages/<section>/`.
2. Add a tab entry to the hub's `TABS` array in the hub file (`<Section>Hub.tsx`).
3. Add a sidebar item to the appropriate `navGroups` entry in `Sidebar.tsx`.
4. Add the route to `App.tsx` if it needs its own path.
5. If it's a Phase 2 feature, add a card to `Phase2Backlog.tsx` instead of building it.

### New Phase 2 backlog card

1. Open `src/pages/admin/Phase2Backlog.tsx`.
2. Add a `BacklogCard` object to the `BACKLOG_CARDS` array.
3. Ensure the `hue` value exists in `HUE_MAP` — if using a new colour, add it. Supported hues: `violet, amber, sky, emerald, rose, orange, pink, teal, yellow, indigo, stone`.
4. Do **not** implement the feature — just document it as a Draft card.

### New admin standalone tool

Admin-only tools (not inside the `AdminView` URL-routing) must:
1. Be registered in both `Sidebar.tsx` navGroups under `admin` AND the Admin home readiness tiles in `AdminSetup.tsx`.
2. Use a standalone route in `App.tsx` (not inside `Admin.tsx`).

---

## Database Migrations

Trail OS uses Drizzle ORM for schema definitions. SQL migration files live in `lib/db/drizzle/`.

### Applying migrations (clean setup or after pulling new migrations)

```bash
# From the workspace root — applies every SQL file in lib/db/drizzle/ via psql
bash scripts/apply-migrations.sh
```

The script is **idempotent** — safe to run multiple times. It maintains a
`_trail_migrations` ledger table that records every successfully applied file.
Files already in the ledger are skipped; new files are applied inside a transaction
with `ON_ERROR_STOP=1` so failures stop the script immediately and roll back the partial
migration rather than being silently swallowed.

The post-merge hook runs the script automatically, so contributor clones and CI
environments are always kept up to date.

> ⚠️ **Do NOT use `drizzle-kit push` in scripts or CI.** It requires an interactive TTY
> and exits immediately with an `EOF` error when stdin is closed, leaving the database
> partially migrated with no error message. Use `apply-migrations.sh` instead.

### Adding a new migration

1. Create `lib/db/drizzle/<NNNN>_my_description.sql` using `IF NOT EXISTS` guards.
2. Add the entry to `lib/db/drizzle/meta/_journal.json` (copy the last entry, increment `idx`).
3. Edit or create the matching Drizzle schema file under `lib/db/src/schema/`.
4. Export from `lib/db/src/schema/index.ts` if it's a new table.
5. Run `bash scripts/apply-migrations.sh` to apply the file locally.
6. Run `pnpm run typecheck` to verify the workspace compiles cleanly.

---

## Working with Data

### Adding a new data file

1. Create `src/data/<name>.ts`.
2. Define and export TypeScript interfaces first.
3. Export the data array/object as a named const.
4. If the data needs to be accessible throughout the app, consider adding it to `AppContext`.

### Updating existing data

- `programs.ts` and `knowledgeSourceData.ts` are considered **authoritative** data — changes should reflect real program/knowledge state. Discuss with the program team before modifying.
- `readinessState.ts` is the single source of truth for integration status — update it when an integration changes state.

### Data classification

Before adding new data, classify it:
- **Phase 1 OK**: accurate, can stay hardcoded for now
- **Phase 2 data**: placeholder shape, will be replaced by live API
- **Stale**: outdated, needs review or removal

See [TRAIL_OS_SPEC.md § 14](TRAIL_OS_SPEC.md#14-hardcoded-and-demo-data-classification) for the full inventory.

---

## Adding New Integrations

1. Add the API route in `artifacts/api-server/src/routes/`.
2. Register the route in `artifacts/api-server/src/app.ts`.
3. Update `src/data/readinessState.ts` to reflect the new integration's status.
4. Update the Integration Readiness dashboard (`/admin/integration-readiness`).
5. Add a Collaboration hub tab (if it's a communication tool) or Admin section (if it's configuration).
6. **Never hardcode API credentials** — use Replit Secrets or environment variables.

---

## Environment Variables

Trail OS requires the following environment variables. **None of these values should ever appear in source code or commits.**

| Variable | Used by | Purpose |
|---|---|---|
| `SESSION_SECRET` | API server | Express session signing |
| `SALESFORCE_CLIENT_ID` | API server | Salesforce OAuth client |
| `SALESFORCE_CLIENT_SECRET` | API server | Salesforce OAuth secret |
| `SALESFORCE_INSTANCE_URL` | API server | Salesforce org URL |
| `SLACK_BOT_TOKEN` | API server | Slack bot authentication |
| `SLACK_SIGNING_SECRET` | API server | Slack webhook verification |
| `GOOGLE_CLIENT_ID` | API server | Google OAuth client (public — safe in code) |
| `GOOGLE_CLIENT_SECRET` | API server | Google OAuth secret |
| `GEMINI_API_KEY` | API server | Google Gemini AI |
| `DATABASE_URL` | API server | PostgreSQL connection string |
| `PORT` | Both | Assigned by Replit at runtime |

Copy `.env.example` to `.env` for local development and fill in your own values.

See [SECURITY.md](SECURITY.md) for the full secrets policy.
