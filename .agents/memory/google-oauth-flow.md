---
name: Google OAuth flow
description: How the OAuth wizard works, scope tiers, callback paths, and Gmail-specific gotchas
---

## Wizard location
- Current path: `/admin/integrations/google-auth` (GoogleOAuthFlow.tsx)
- Old path `/admin/google-oauth` redirects there — do NOT use old path in callback redirects

## Callback redirect paths
All redirects in `artifacts/api-server/src/routes/googleOAuth.ts` must point to:
- Success: `${frontendBase}/admin/integrations/google-auth?status=success&session=...`
- Error: `${frontendBase}/admin/integrations/google-auth?status=error&error=...`

**Why:** The callback was previously hardcoded to `/admin/google-oauth`. When the wizard moved, the success screen never rendered and the one-time token was lost.

## Token session flow
1. Callback stores token in `sessions` Map (in-memory, 10-min TTL)
2. Redirects to frontend with `?session=<id>`
3. Frontend calls `GET /api/google/oauth/session/:id` — **one-time only, deleted on read**
4. Success screen shows token revealed by default (TokenRow `revealed=true`)

## Scope tiers — critical distinction
Google has three scope tiers with very different Testing-mode behavior:

| Tier | Examples | Testing mode |
|------|----------|-------------|
| Non-sensitive | email, openid | Anyone |
| **Sensitive** | drive.readonly, drive.file, calendar.readonly, calendar.events, **gmail.send** | Test users only (up to 100) |
| **Restricted** | **gmail.readonly**, gmail.modify | Requires Google security assessment — "Something went wrong" even in Testing mode |

**Current SCOPES array** (googleOAuth.ts) intentionally omits `gmail.readonly` because it is restricted:
- drive.readonly, drive.file, calendar.readonly, calendar.events, gmail.send, openid, email

## Three secrets, one token value
The refresh token from one OAuth flow covers all scopes. Save the SAME value as:
1. `GOOGLE_DRIVE_REFRESH_TOKEN`
2. `GOOGLE_CALENDAR_REFRESH_TOKEN`
3. `GOOGLE_GMAIL_REFRESH_TOKEN`

## Validate endpoint
`GET /api/gmail/validate` — exchanges the stored refresh token and calls Google tokeninfo to show actual scopes. Use to diagnose "insufficient authentication scopes" errors.

## Gmail inbox reading (gmail.readonly)
Currently disabled in the authorization flow because it is a restricted scope. The GmailActionPanel handles this gracefully:
- Shows amber "Inbox reading requires app verification" notice
- Compose/send still available via footer Compose button
- To re-enable: pass Google's restricted scope security review, then add `gmail.readonly` back to SCOPES

## Common failure modes
1. **"Something went wrong" from Google** → restricted scope in SCOPES (remove gmail.readonly)
2. **"insufficient authentication scopes"** → saved token was minted before gmail.send was in SCOPES; re-authorize and overwrite GOOGLE_GMAIL_REFRESH_TOKEN
3. **Success screen never appears** → callback redirected to old path; check all redirect strings in googleOAuth.ts
4. **Token lost after authorize** → session is one-time; if page crashed (runtime error) before reading session, user must re-authorize
