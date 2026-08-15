// ─────────────────────────────────────────────────────────────────────────────
// Trail OS — Single source of truth for the application version.
//
// To release a new version:
//   1. Bump APP_VERSION here (e.g. "1.5" → "1.6")
//   2. Add a new entry at the TOP of the RELEASES array in ReleaseNotes.tsx
//   3. Add an entry to CHANGELOG.md
//
// The sidebar footer, "What's New" dot, and toast all derive from this value
// automatically — no other file needs to be touched for the version string.
// ─────────────────────────────────────────────────────────────────────────────

export const APP_VERSION = "1.9";
