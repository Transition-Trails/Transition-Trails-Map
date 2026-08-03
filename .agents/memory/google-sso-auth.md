---
name: Google SSO Authentication
description: How per-user Google Sign-In works in Trail OS — OAuth flow, group cache, session fields, Clerk removal
---

## Pattern

Staff sign in via Google OAuth (not Clerk). Session is express-session with 7-day file store.

**Routes** (api-server `routes/googleSignIn.ts`):
- `GET /auth/google/login` — start OAuth (state → session, redirect to Google with `hd=transitiontrails.org` hint)
- `GET /auth/google/callback` — exchange code, validate `hd` claim, check groups, write session
- `GET /auth/google/me` — return current user from session; refreshes groups if expired
- `POST /auth/google/sign-out` — destroy session

**Session fields added** (`types/session.d.ts`):
- `googleEmail`, `googleName`, `googleSub`, `googleGroups`, `googleGroupsExpiry`, `googleTier`, `googleOAuthState`

**Callback URL**: Set `GOOGLE_USER_SIGNIN_CALLBACK_URL` env var to the full URL registered in Google Cloud Console. Falls back to derived URL from request headers in dev. This URL must be added to the OAuth client's authorized redirect URIs in GCP.

## Group membership cache (`lib/googleGroupsCache.ts`)

- 5-min TTL per email; caches both positive results and non-membership (empty array)
- Does NOT cache lookup failures (no token / network error) so next call retries
- Uses `GET /admin/directory/v1/groups/{group}/members/{email}` (one call per group per user)
- Requires only `admin.directory.group.member.readonly` scope — already on the DWD service account

## Groups held as a set

`googleGroups` on the session is a `string[]` of group emails. `googleTier` is the derived display tier (highest privilege). Decisions should be made against the groups set, not the tier alone.

Three groups: `trailosadmin@`, `trailospennyadmin@`, `trailosusers@` (all `@transitiontrails.org`).

## Domain enforcement

`hd=transitiontrails.org` in the auth URL is a HINT only. The callback validates the `hd` claim in the ID token AND checks `email.endsWith('@transitiontrails.org')`. Both must pass.

## Client auth hook (`hooks/useGoogleAuth.ts`)

Uses React Query (`queryKey: ['google-auth-me']`). Both `InnerApp` (App.tsx) and `UserProfileButton` (Topbar.tsx) call it — React Query deduplicates to one request. `useSignOut()` POSTs to sign-out, clears QueryClient, then hard-navigates.

## Redirect after OAuth

After callback success/failure: `res.redirect('/')` following the same pattern as `salesforceAuth.ts`. Frontend `useGoogleAuth()` re-fetches `/me` on mount.

## What Clerk did (and was removed)

Server: `clerkMiddleware` + `clerkProxyMiddleware` registered globally in app.ts — never read identity on any route. Pure decoration.

Client: `ClerkProvider` wrap, `useUser()` for tier lookup in `TierInitializer`, `useUser()`+`useClerk()` in Topbar for name/email/avatar/signOut, `<SignIn>` component on sign-in page.

Files removed: `middlewares/clerkProxyMiddleware.ts`. Packages removed: `@clerk/express`, `@clerk/shared` (api-server), `@clerk/react`, `@clerk/themes` (program-map). Catalog entries removed from pnpm-workspace.yaml.

## Admin Google OAuth wizard

`src/pages/admin/GoogleOAuthFlow.tsx` — grants Trail OS APPLICATION-level access to Drive, Calendar, Gmail. This is a separate one-time admin flow. Added a blue notice banner at line ~518 making clear it is NOT how users sign in. Keep it when updating the auth system.

**Why:** The two flows look alike (both use Google OAuth) and are easily confused by new admins.
