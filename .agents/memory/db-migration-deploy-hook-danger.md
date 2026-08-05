---
name: DB migration deploy hook danger
description: Why deployment.build drizzle push hooks fail silently and how production schema migrations actually work on Replit
---

## Rule

Never add a `deployment.build` drizzle-kit push hook to `.replit`. It is explicitly forbidden by Replit's database migration contract and causes publish failures.

**Why:** During the image build phase, `drizzle-kit push` exits non-zero (connection timeout or other error against the production DB). Replit's build system continues and successfully builds/pushes the image, but then marks the deployment as failed because of the hook exit code. This appears in build logs as a 1-second failure after "Pushed image manifest" — looks like a startup crash but is actually a pre-build hook failure.

**How to apply:** When schema drift causes the publish UI to show changes, tell the user that is the intended behavior (not an error). They confirm renames/additions in the publish UI, and Replit applies the diff to production automatically. No code or scripts required. If found in `.replit` [deployment.build], remove it immediately and republish.

**The two correct schema migration points:**
1. Task merge → dev DB: post-merge setup script runs push-force automatically
2. Publish → prod DB: publish flow diffs dev vs prod, confirms renames with user, applies to prod
