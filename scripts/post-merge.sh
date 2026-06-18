#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

# Push the latest commit to the GitHub remote so docs (and all code) stay in sync.
# This is a best-effort step — it will not fail the merge if the remote is unreachable
# or if no remote named 'origin' is configured (e.g. in a fresh fork).
if git remote get-url origin > /dev/null 2>&1; then
  git push origin HEAD:main || echo "[post-merge] Warning: git push to origin failed — push manually when the remote is reachable."
else
  echo "[post-merge] No 'origin' remote configured — skipping push."
fi
