# Security Policy — Trail OS

---

## Supported Versions

Trail OS is currently in active development (Phase 1 complete, Phase 2 in progress). Security fixes are applied to the `main` branch only.

| Branch | Supported |
|---|---|
| `main` | ✅ Yes |
| `dev` | ✅ Yes (pre-release) |
| Older branches | ❌ No |

---

## Secrets and API Keys — Zero Tolerance Policy

> ⚠️ **Secrets, API keys, tokens, and credentials must never be committed to this repository.**

This is a hard rule with no exceptions. Committing a secret — even temporarily — triggers an immediate credential rotation.

### What counts as a secret

- Salesforce: client ID, client secret, access tokens, refresh tokens, instance URLs with embedded auth
- Slack: bot token (`xoxb-*`), signing secret, app token
- Google: OAuth client secret, refresh tokens, service account keys (`.json` files)
- Gemini / Google AI: API key
- Agentforce: any credential
- Database: full connection strings (e.g., `postgresql://user:password@host/db`)
- Session secrets: any value used to sign cookies or sessions
- Any value from a `.env` file

### What is safe to commit

- Public OAuth client IDs (e.g., Google `client_id` — this is a public identifier)
- Public Salesforce instance URLs without credentials
- Slack workspace IDs and public channel IDs
- Feature flags and configuration that contain no credentials
- Environment variable **names** (but not values) in `.env.example` or documentation

### Where secrets must live

| Environment | Secret storage |
|---|---|
| Replit development | Replit Secrets panel (never `.env` files checked into git) |
| GitHub Actions | GitHub repository secrets (Settings → Secrets and variables → Actions) |
| Production | Environment variable injection at Replit deploy time |

### If a secret is accidentally committed

1. **Immediately rotate the credential** in the relevant system:
   - Salesforce: Connected App → regenerate client secret
   - Slack: App settings → rotate signing secret and bot token
   - Google: Cloud Console → OAuth credentials → delete and recreate
   - Gemini: Google AI Studio → delete and regenerate API key
2. **Remove from git history** using `git filter-repo` or BFG Repo Cleaner — a simple revert commit is not sufficient.
3. **Force-push** the cleaned history (requires bypass of branch protection).
4. **Notify the team** immediately — assume the secret was compromised.
5. **Document the incident** in the Incident History section below.

---

## Reporting a Vulnerability

Trail OS is an internal platform. If you discover a security issue:

1. **Do not open a public GitHub issue.** This could expose the vulnerability before it is fixed.
2. **Email the Trail OS maintainer** directly (contact via the Transition Trails organisation). Use the subject line: `[TRAIL OS SECURITY] <brief description>`.
3. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fix (optional)
4. You will receive a response within 2 business days.
5. We will work with you to validate, fix, and disclose the issue responsibly.

---

## Security Considerations by Integration

### Salesforce

- All Salesforce API calls go through the API server at `/api/salesforce/*` — the frontend never holds Salesforce credentials.
- Connected App credentials are stored as Replit Secrets only.
- No Salesforce data is persisted in the Trail OS database in Phase 1 — all queries are read-through.
- The SF Validation tool at `/admin/sf-validation` requires Admin tier authentication.

### Slack

- The Slack bot token is stored as a Replit Secret only.
- Incoming Slack events are verified using the signing secret before processing.
- The `@coachconnectbot` has minimal scopes: `chat:write`, `channels:read` (Phase 2).
- No Slack message content is stored in the Trail OS database.

### Google

- The Google OAuth client secret is stored as a Replit Secret only.
- The Google `client_id` is safe to include in code — it is a public identifier.
- OAuth tokens (access + refresh) are stored server-side only, never sent to the client.
- The OAuth wizard at `/admin/integrations/google-auth` is restricted to Super Admin tier.
- Google OAuth app is currently in "Testing" mode — only explicitly added test users can authenticate.

### Gemini / AI

- The Gemini API key is stored as a Replit Secret only.
- The `/penny/test` interface is restricted to Super Admin tier.
- No user data is sent to Gemini in Phase 1 — only constructed prompts.
- In Phase 2, before any user data is sent to an AI provider, a privacy review must be completed.

### Session management

- `SESSION_SECRET` is a Replit Secret — never hardcoded.
- Sessions are signed with `SESSION_SECRET` to prevent tampering.
- Session duration should be configured conservatively (8 hours max for internal tools).

### Database

- `DATABASE_URL` is a Replit Secret — the full connection string (including password) is never in code.
- The database stores platform configuration data: `prompt_templates` and `prompt_variables` tables persist Penny Prompt Studio content. No personally identifiable information (PII) is stored in Phase 1.
- In Phase 2, before storing any learner data or PII, a data protection review is required.

---

## Access Control

### Application tier model

Trail OS uses a four-tier access model (`everyday`, `power`, `admin`, `superadmin`). In Phase 1, the tier is selected via the UI switcher. In production, tiers must be:

1. Assigned from a trusted source (Salesforce user profile or directory service).
2. Validated server-side on every request to protected API routes.
3. Never trusted from client-side parameters alone.

### Admin and Super Admin routes

The following routes must be protected by server-side authentication in production (currently open in Phase 1 prototype):

- `/admin/integrations/secrets` — lists environment variable names (replaces `/admin/secrets-audit`)
- `/admin/integrations/google-auth` — can initiate OAuth flows (replaces `/admin/google-oauth`)
- `/api/salesforce/*` — accesses Salesforce data
- `/api/slack/*` — posts to Slack channels
- `/api/secrets/*` — manages integration credentials
- `/api/penny/prompt-templates` and `/api/penny/prompt-variables` — write endpoints for DB-backed prompt configuration

---

## `.gitignore` Requirements

The repository `.gitignore` must include at minimum:

```
# Environment variables — never commit
.env
.env.*
!.env.example

# Private keys
*.pem
*.key
*.p12
*.pfx

# Google service account keys
*service-account*.json

# Node
node_modules/
dist/
.tsbuildinfo

# Replit (contains internal config that may reference secrets)
.replit
replit.nix
.breakpoints

# OS
.DS_Store
Thumbs.db
```

---

## Incident History

| Date | Summary | Resolution |
|---|---|---|
| — | No incidents recorded | — |

> Document any future security incidents here with: date, brief description, and resolution steps taken.
