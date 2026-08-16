---
name: OAuth callback URL derivation
description: Why OAuth redirect URIs must be request-derived and session-bound, not fixed env values
---

# OAuth callback URL derivation

Rule: never build an OAuth redirect_uri from a fixed env var or REPLIT_DEV_DOMAIN. Derive it from `x-forwarded-proto`/`x-forwarded-host` at `/login`-time, store it on the session alongside state/PKCE, and reuse that byte-identical value at token exchange.

**Why:** A fixed `SALESFORCE_CALLBACK_URL` secret pinned to a dev domain sent production logins back to the dev server (different session → "Invalid or expired OAuth session"). Slack's `getPublicBaseUrl` preferred `REPLIT_DEV_DOMAIN`, so the deployed app sent Slack a *stale* dev domain (dev domains change across workspace restarts) → `redirect_uri did not match any configured URIs`.

**How to apply:**
- Header-derived first; env var only as localhost/no-host fallback.
- Bind the derived URI to the OAuth transaction in the session (shared PG store — autoscale-safe). Never keep OAuth state in an in-memory Map (instance-local; breaks on autoscale). Slack flow migrated to `req.session.slackOAuth`.
- Session cookie is `sameSite: "lax"` (explicit in app.ts) so it rides along on top-level OAuth callback GETs.
- Both prod and dev callback URLs must be registered in the provider (SF Connected App / Slack app config); dev replit.dev domain changes on workspace restart and must be re-registered.
