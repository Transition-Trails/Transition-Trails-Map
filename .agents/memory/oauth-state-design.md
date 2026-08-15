---
name: Google OAuth state design
description: Why the sign-in state is HMAC-signed AND session-bound; never accept signature-only
---
**Rule:** The Google sign-in `state` is double-layered: HMAC-signed (SESSION_SECRET, 10-min TTL) AND stored on the session (shared PostgreSQL store). The callback must require BOTH — never fall back to signature-only validation.

**Why:** A signature only proves the server minted the state, not that it belongs to the current browser. Accepting signature-only enables login-CSRF: an attacker mints a state, completes Google auth as themselves, and injects the callback URL into a victim's browser, logging the victim into the attacker's account. A code reviewer rejected the signature-only fallback for exactly this.

**How to apply:** Cross-instance (autoscale) resilience comes from the shared PG session store, not from making the state stateless. If the session cookie can't persist, fail sign-in loudly (500 at /login on save error) rather than degrade. The session copy delete on callback makes the state single-use.
