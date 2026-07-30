---
name: Procedure Builder architectural decisions
description: Confirmed design decisions for the Procedure Builder feature (Task #30) — drive structure, storage, public view, access, and scope.
---

# Procedure Builder — Confirmed Decisions

These were confirmed by the user before build begins. Do not re-ask; apply directly.

## Drive folder structure
Images (individual step screenshots) and full screen recordings both go under:
`Content/Procedures/[procedure-title-slug]/`
inside the existing Penny Google Drive folder (`GOOGLE_DRIVE_PENNY_FOLDER_ID`).
- `Content/` is the top-level content parent folder
- `Procedures/` is the subfolder for all procedure assets
- Each procedure gets its own subfolder named after its title (slugified)
- The subfolder Drive ID is stored as `drive_folder_id` on the `procedures` DB record

**Why:** Consistent with existing content folder structure; keeps recordings + images co-located per procedure; easy to find in Drive.

## Image/recording storage
Google Drive is the **single source of truth** for all procedure media (no Replit Object Storage, no local disk).
- Upload handler writes to Drive, sets sharing to "anyone with link can view", returns the direct Drive URL
- `image_url` on `procedure_steps` stores the Drive direct-access URL
- `drive_file_id` on `procedure_steps` stores the Drive file ID for management (delete, rename)

**Why:** User wants to stay with Google as the source for all content assets.

## Public share / read-only view
Shareable procedure links render as a **lightweight HTML page served directly by the API server** — not a React SPA route.
- Route: `GET /share/procedures/:token` on the Express server
- Returns a self-contained HTML page (inline CSS, static SVG annotations, no JS framework)
- No Clerk auth wrapper needed — it's a plain Express route outside the main app bundle
- Suitable for embedding in Salesforce iframe or sharing externally

**Why:** Avoids Clerk auth complexity for public views; simpler and faster to load for external recipients.

## Learner portal access
Published procedures **are visible to learners** in the learner portal (`/learner/*` routes).
- Learner-facing view uses the same `StaticProcedureViewer` component (read-only, no edit controls)
- Only published procedures (where `published_at IS NOT NULL`) are shown to learners
- Likely surface: a "Guides" or "How-To" section in the learner dashboard

**Why:** Training procedures are directly useful to learners following a trail.

## Chrome extension
**Phase 2** — not in scope for Task #30.
- Build the core editor and Drive upload flow first
- Extension can reuse AnnotationCanvas and upload endpoint unchanged once core is stable

## How to apply
When building Task #30:
1. Drive upload handler must create `Content/Procedures/[slug]/` subfolder if it doesn't exist
2. Public view = Express HTML route, not a React route in App.tsx
3. Add a read-only procedure list/view to the learner portal after the main editor is working
4. Chrome extension work → defer to Task #31
