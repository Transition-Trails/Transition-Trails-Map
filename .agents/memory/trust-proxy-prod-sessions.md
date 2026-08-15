---
name: Trust proxy required for prod session cookies
description: Why app.set('trust proxy', 1) must stay in the api-server Express app
---
**Rule:** The api-server must keep `app.set('trust proxy', 1)` before the session middleware.

**Why:** Replit's deployment proxy terminates HTTPS; Express sees plain HTTP. With `cookie.secure: true` in production, express-session silently refuses to set the cookie unless trust proxy makes `req.secure` reflect `X-Forwarded-Proto`. Removing it breaks Google sign-in in production only (callback fails with state_mismatch in ~1ms because the OAuth state saved at /login is never persisted) while dev keeps working — a very confusing prod-only failure.

**How to apply:** Any new Express service with secure cookies deployed on Replit needs the same setting. Keep the hop count at 1; do not broaden to `true`.
