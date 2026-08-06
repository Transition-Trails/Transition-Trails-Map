---
name: Homebase shell and auth extension
description: Durable architecture decisions for the HomebaseShell, audience auth flow, and homebase routing split.
---

# Homebase Shell and Auth — Architecture Decisions

## Staff-takes-priority invariant
Every code path that sets `session.googleAudience` must apply the staff-priority rule:
if `isKnownStaff(groups, email)` is true, `audience` must be forced to `null` — regardless of homebase group membership.
This applies in both the OAuth callback and the `/me` cache-refresh path.

**Why:** a user in both a staff group and a homebase group must always land in the admin shell, never in HomebaseShell. Violating this removes their staff UI access silently.

**How to apply:** always compute `hasStaff` before calling `deriveAudience`; use `const audience = hasStaff ? null : deriveAudience(...)`.

## Three ENV vars control homebase group membership
`GOOGLE_GROUP_COACHES`, `GOOGLE_GROUP_VOLUNTEERS`, `GOOGLE_GROUP_LEARNERS` — read from environment at runtime. Missing/empty = group ignored; nobody gets that audience. Set in Replit Secrets before homebase routing is live.

**Why:** group emails are ops config, not code — avoids deploys when Workspace admin renames a group.

## Homebase bypass in staff auth gate
`/homebase/*` and `/learner/*` prefixes are explicitly excluded from the `requireStaff` gate in `routes/index.ts`. They use their own auth middleware (`requireHomebaseAuth` / `requireLearnerAuth`).

**Why:** homebase users are not in any staff Google group, so the default-deny staff gate would block all their requests.

## `/auth/homebase/status` response contract
- No session → `{ isSignedIn: false, audience: null }`
- Session with email, no audience (staff) → `{ isSignedIn: true, audience: null }`
- Session with email + audience (homebase) → `{ isSignedIn: true, audience: 'learner'|'coach'|'volunteer' }`

The frontend reads `audience` to decide which shell to render. `null` means admin AppShell.

## time_logs migration placement
Migration `0001_create_time_logs` lives in `lib/db/drizzle/` (the Drizzle-managed migration directory) with a journal entry in `meta/_journal.json`. The `drizzle.config.ts` `out` field points there. Table was pre-created via psql on the dev database; migration ensures reproducibility on clean environments and the production deploy.

**Why:** Drizzle `push` is TTY-only and cannot run in CI or non-interactive shells; committed migrations are the only reliable deploy path.
