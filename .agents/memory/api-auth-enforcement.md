---
name: API auth enforcement
description: How the Trail OS API enforces authentication (401) and authorisation (403) — default-deny posture, public allowlist, group-set checks.
---

## The rule
Every API route is refused unless it appears in the PUBLIC_PATHS allowlist OR the request carries a valid signed-in Google session with at least one Trail OS group. The "refused unless explicitly public" posture replaced the old open-by-default prototype.

## Key files
- `artifacts/api-server/src/middlewares/requireAuth.ts` — `requireStaff` (any staff group), `requireAdmin` (trailosadmin or superadmin), `isStaff`/`isAdmin`/`isSuperAdmin` helpers, and the group constants.
- `artifacts/api-server/src/routes/index.ts` — `staffAuthGate` middleware applied before all routers; `PUBLIC_PATHS` allowlist; `requireAdmin` prefix middleware for `/secrets`, `/admin/google-groups`, `/admin/role-owners`.

## Group constants
```
TRAIL_OS_STAFF_GROUPS: trailosusers@, trailospennyadmin@, trailosadmin@
TRAIL_OS_ADMIN_GROUPS: trailosadmin@
```
Superadmin whitelist: `TRAIL_OS_SUPERADMIN_EMAILS` env var (comma-separated, case-insensitive).

## Error shapes (distinguishable)
- 401 `{ error: 'not_authenticated' }` — no session → "sign in"
- 403 `{ error: 'not_authorized' }` — signed in but wrong group → "ask admin"

## Two-group invariant
`requireStaff` and `requireAdmin` check `req.session.googleGroups` (the raw set), not a derived display tier. A user in two groups retains both grants.

## Public-path allowlist (relative to /api mount)
`/healthz`, `/auth/google/*`, `/auth/salesforce/*`, `/google/oauth/*`, `/slack/events`, `/learner` prefix.

## Per-route admin guards (beyond prefix middleware)
- `POST /slack/notify` — `requireAdmin` inline in notifications.ts
- `POST /penny/prompt-templates/seed` — `requireAdmin` inline in promptTemplates.ts
- `POST /penny/prompt-variables/seed` — `requireAdmin` inline in promptVariables.ts

## Client side
- `AppContext.tsx` default tier is `'everyday'` (not `'superadmin'`); tier set by `useGoogleAuth` session.
- `App.tsx` module-level fetch interceptor: 401 → `queryClient.invalidateQueries(['google-auth-me'])`; 403 → `window.dispatchEvent('trail-os-forbidden')` → toast in `InnerApp`.

## Tests
`authEnforcement.test.ts`: 25 cases — middleware unit tests, HTTP 401 on unauthenticated data routes, HTTP 403 for staff-tier user on admin route, two-group case. Business-logic test files (`promptTemplates`, `promptVariables`, `salesforce`) mock `requireAuth` so they continue to test DB logic in isolation.

**Why:** The prototype silently granted superadmin-level access to everyone (no session required for data routes, AppContext defaulted to superadmin). This was intentional for prototyping but wrong for production.
