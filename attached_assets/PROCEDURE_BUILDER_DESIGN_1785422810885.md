# Procedure Builder — Technical Design Document

**Purpose:** Reference spec for integrating the Procedure Builder feature into TRAIL OS (or any new host app), building a companion Chrome extension, and implementing public shareable links.

---

## 1. Feature Overview

Procedure Builder lets small teams document training processes step-by-step with annotated screenshots, rich-text descriptions, and one-click export. The core workflow is:

```
Record screen / upload image
  → Pick frames (or use image directly)
  → Crop screenshot to focus area
  → Annotate (arrows, highlights, callouts, rectangles)
  → Write rich-text description + Salesforce KB link
  → Add notes
  → Export (PDF via browser print, or Salesforce Knowledge HTML)
  → Share via public link (no login)
```

---

## 2. Current Architecture (Reference Implementation)

### 2.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| UI components | shadcn/ui + Tailwind CSS |
| API client | Orval-generated React Query hooks (OpenAPI codegen) |
| Backend | Express + TypeScript (pnpm workspace) |
| Database | PostgreSQL via Drizzle ORM |
| File storage | Local disk (`/uploads/`) served as static files |
| Rich text | Tiptap (StarterKit + Link + Placeholder extensions) |
| Drag-to-reorder | @hello-pangea/dnd |

### 2.2 Database Schema

```sql
-- procedures
id            SERIAL PRIMARY KEY
title         TEXT NOT NULL
description   TEXT
created_by    TEXT
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()

-- steps
id            SERIAL PRIMARY KEY
procedure_id  INTEGER REFERENCES procedures(id) ON DELETE CASCADE
step_order    INTEGER NOT NULL DEFAULT 0
title         TEXT NOT NULL DEFAULT 'New Step'
description   TEXT          -- stored as HTML (Tiptap output)
notes         TEXT
image_url     TEXT          -- path returned by upload endpoint
gif_url       TEXT          -- reserved for future GIF support
annotations   JSONB DEFAULT '[]'
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()
```

**Annotations JSONB shape:**
```ts
type Annotation = {
  id: string;           // "temp-<timestamp>"
  type: 'arrow' | 'highlight' | 'rectangle' | 'callout';
  x: number;            // SVG coords (rendered px, not natural px)
  y: number;
  color: string;        // hex
  width?: number;       // highlight / rectangle
  height?: number;
  endX?: number;        // arrow / callout
  endY?: number;
  label?: string;       // callout only
};
```

> **Note:** Annotation coordinates are in **rendered pixel space** (relative to the displayed `<img>` element), not the image's natural pixel dimensions. When re-rendering at a different size the SVG overlay scales automatically via `width="100%" height="100%"`.

### 2.3 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/procedures` | List all procedures (with `step_count`) |
| POST | `/api/procedures` | Create procedure |
| GET | `/api/procedures/:id` | Get procedure with all steps |
| PATCH | `/api/procedures/:id` | Update title / description |
| DELETE | `/api/procedures/:id` | Delete procedure + steps (cascade) |
| POST | `/api/procedures/:id/steps` | Add a step (optionally with `imageUrl`) |
| PATCH | `/api/procedures/:id/steps/reorder` | Reorder steps (body: `{ stepIds: number[] }`) |
| PATCH | `/api/procedures/:id/steps/:stepId` | Update any step field |
| DELETE | `/api/procedures/:id/steps/:stepId` | Delete step |
| GET | `/api/procedures/:id/export/html` | Return Salesforce-compatible HTML string |
| POST | `/api/upload` | Multipart image upload → returns `{ url, filename }` |
| GET | `/api/uploads/:filename` | Serve uploaded file (static) |

### 2.4 Key Frontend Components

| Component | Responsibility |
|---|---|
| `RecordingDialog` | `getDisplayMedia` with `audio: true`, WebM frame extraction, bulk upload |
| `AnnotationCanvas` | SVG overlay, draw modes (arrow/highlight/callout/rectangle/crop), crop-to-upload flow |
| `RichTextEditor` | Tiptap wrapper with toolbar (bold, italic, lists, link); stores HTML |
| `StepDetail` | Step editor; debounced auto-save for all fields including `imageUrl` after crop |
| `StepList` | Drag-to-reorder via `@hello-pangea/dnd` |
| `ExportMenu` | PDF (browser print window), Salesforce HTML (clipboard copy) |

---

## 3. Integration into TRAIL OS

### 3.1 Recommended Approach

Build Procedure Builder as a **self-contained module** inside TRAIL OS — its own route, its own DB tables, reusing the host app's auth and file storage. Do **not** iframe or embed the standalone app; integrate natively so it inherits TRAIL OS's navigation, design system, and user sessions.

### 3.2 Steps for the TRAIL OS Agent

1. **Add DB tables** — copy the schema from §2.2. If TRAIL OS uses a different ORM, translate accordingly. Add a `created_by` foreign key to TRAIL OS's users table.
2. **Add API routes** — copy the route logic from §2.3. Mount under `/api/procedures` or a namespaced path like `/api/trail/procedures`.
3. **Add file storage** — if TRAIL OS already has object storage (S3, Replit Object Storage, etc.), route uploads there instead of local disk. Change the upload handler to return the correct public URL.
4. **Add frontend routes** — `/procedures` (list) and `/procedures/:id` (editor). Copy the five key components from §2.4; adapt imports to TRAIL OS's design system.
5. **Wire auth** — replace the `createdBy: 'Current User'` placeholder with the actual user from TRAIL OS's session/auth context.
6. **Navigation** — add a "Procedures" link in TRAIL OS's sidebar or nav.

### 3.3 Design System Adaptation

The reference implementation uses:
- Font: DM Sans
- Accent: Teal/cyan (`#14b8a6` primary, `#0d9488` hover)
- Radius: `0.5rem`

Replace all of these with TRAIL OS's existing tokens. The Tiptap editor uses the `prose` class from `@tailwindcss/typography` — ensure that package is installed and the plugin is in `tailwind.config`.

### 3.4 What to Tell the TRAIL OS Agent

> "I want to add a Procedure Builder module. It needs: two DB tables (`procedures`, `steps` with JSONB annotations), a set of REST endpoints (list, CRUD, reorder, HTML export, file upload), and a React editor UI with screenshot annotation, rich text description, drag-to-reorder steps, crop tool, PDF export, and shareable public links. I have a working reference implementation with all the implementation details documented — use PROCEDURE_BUILDER_DESIGN.md as the spec."

---

## 4. Chrome Extension

### 4.1 What the Extension Does

The Chrome extension acts as a **capture companion** to the main app. Instead of recording the whole screen, users click the extension icon on any tab, it screenshots the current page, and sends the image directly into a procedure they're actively building.

```
User is on any webpage
  → Click extension icon (or keyboard shortcut)
  → Extension captures visible tab as PNG
  → Side panel opens showing the step being added
  → User crops / annotates within the panel
  → Step is saved to the procedure via the same API
```

### 4.2 Extension Architecture

```
extension/
├── manifest.json          # v3 manifest
├── background.js          # service worker — handles tab capture
├── content.js             # (optional) injected for element detection
├── panel/
│   ├── index.html         # side panel host
│   ├── main.tsx           # React entry
│   └── ...                # reuse StepDetail, AnnotationCanvas, etc.
└── icons/
    └── icon-*.png
```

**manifest.json (key fields):**
```json
{
  "manifest_version": 3,
  "name": "Procedure Builder",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "tabCapture",
    "storage",
    "sidePanel"
  ],
  "side_panel": {
    "default_path": "panel/index.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Capture step"
  }
}
```

### 4.3 Screenshot Capture

Use `chrome.tabs.captureVisibleTab()` in the background service worker (it cannot run in content scripts or the panel directly):

```js
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel for this tab
  await chrome.sidePanel.open({ tabId: tab.id });

  // Capture screenshot as base64 PNG
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
    quality: 100,
  });

  // Send to the side panel
  chrome.runtime.sendMessage({ type: 'SCREENSHOT_CAPTURED', dataUrl, tabUrl: tab.url, tabTitle: tab.title });
});
```

The side panel listens for this message and opens the crop/annotation UI pre-loaded with the screenshot.

### 4.4 API Connection

The extension needs to know the URL of the Procedure Builder API. Two options:

**Option A — Hard-code the production URL** (simple, works for internal tools):
```js
const API_BASE = 'https://your-deployed-app.replit.app/api';
```

**Option B — User-configurable** (better for team distribution):
Store the URL in `chrome.storage.sync` via a small settings popup. The panel reads it on load.

For auth, include a Bearer token (from `chrome.storage.sync`) in every API request. The backend checks it against a per-user API token stored in the users table.

### 4.5 Build Setup

Use Vite with `vite-plugin-web-extension` or a manual multi-entry config:

```js
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: 'background.js',
        panel: 'panel/index.html',
      },
      output: { dir: 'dist' },
    },
  },
});
```

Build output goes to `dist/`. Load that folder in Chrome via `chrome://extensions` → Developer Mode → Load unpacked.

### 4.6 Development Loop

1. `pnpm build` (or `pnpm build --watch` for auto-rebuild)
2. Go to `chrome://extensions`, click the reload icon on the extension
3. Re-open the side panel

There is no hot-reload for extensions. The watch + manual reload loop is the standard workflow.

### 4.7 Non-Obvious Gotchas

- `captureVisibleTab` requires the `activeTab` permission **and** must be called from a user gesture handler (clicking the action button counts). It will fail silently if called outside a gesture.
- The side panel and service worker are in separate JS contexts. Use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` to pass data between them. Don't try to share memory.
- MV3 service workers are **ephemeral** — they shut down after ~30 seconds of inactivity. Don't store state in service worker variables; use `chrome.storage.session` for short-lived state.
- CORS: if the API is on a different domain from the extension, add the extension's origin (`chrome-extension://<id>`) to the API's CORS `origin` allowlist, or set `cors({ origin: '*' })` for internal tools.

---

## 5. Shareable Public Links

### 5.1 Concept

A procedure owner generates a public URL that anyone can view without logging in. The link renders a read-only version of the procedure — all steps, images, and annotations visible, no editing controls.

### 5.2 Database Changes

Add a `share_token` column to the `procedures` table:

```sql
ALTER TABLE procedures
  ADD COLUMN share_token TEXT UNIQUE,
  ADD COLUMN share_enabled BOOLEAN NOT NULL DEFAULT FALSE;
```

- `share_token` — a random URL-safe string (e.g. `nanoid(21)`)
- `share_enabled` — lets owners revoke the link without deleting the token

### 5.3 API Changes

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/api/procedures/:id/share` | Yes | Generate / regenerate token, set `share_enabled = true`, return token |
| DELETE | `/api/procedures/:id/share` | Yes | Set `share_enabled = false` (revoke) |
| GET | `/api/share/:token` | **No** | Return full procedure + steps (read-only) |

**Share route (no auth middleware):**
```ts
router.get('/share/:token', async (req, res) => {
  const procedure = await db.query.proceduresTable.findFirst({
    where: and(
      eq(proceduresTable.shareToken, req.params.token),
      eq(proceduresTable.shareEnabled, true)
    ),
    with: { steps: { orderBy: asc(stepsTable.stepOrder) } },
  });

  if (!procedure) return res.status(404).json({ error: 'Not found' });
  res.json(procedure);
});
```

### 5.4 Frontend Changes

**Share button** in the procedure header → copies `https://yourapp.com/share/<token>` to clipboard (or shows a modal with the link + revoke option).

**Public view route** (`/share/:token`):
- Fetches from `/api/share/:token` — no auth headers needed
- Renders a read-only `ProcedureViewer` component (no edit controls, no toolbar, annotations rendered as static SVG overlay)
- Suitable for embedding in a browser tab or Salesforce iframe

**Read-only annotation rendering** (no SVG event handlers, just static shapes):
```tsx
function StaticAnnotationLayer({ imageUrl, annotations }) {
  return (
    <div className="relative">
      <img src={imageUrl} alt="Step" className="w-full h-auto" />
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {annotations.map(renderAnnotation)}
      </svg>
    </div>
  );
}
```

### 5.5 Security Considerations

- Tokens should be cryptographically random and at least 128 bits of entropy (21-char nanoid is sufficient)
- Rate-limit the `/api/share/:token` endpoint to prevent enumeration
- Uploaded images are already public by URL if the API is unauthenticated — if that's a concern, move file storage behind a signed URL system (S3 presigned URLs, Replit Object Storage, etc.)
- "Revoke" sets `share_enabled = false` but does **not** regenerate the token. Add a "Reset link" option that also regenerates the token if the old URL needs to be truly killed

---

## 6. Known Implementation Gotchas

These are non-obvious issues discovered during the reference build that will save the TRAIL OS agent significant debugging time.

| Area | Gotcha | Fix |
|---|---|---|
| **WebM recording** | `video.duration` is `Infinity` for browser-recorded WebM blobs | After `loadedmetadata`, if duration is not finite, seek to `1e9` and wait for `timeupdate` — the browser will then report the real duration |
| **Frame extraction** | `video.currentTime = NaN` throws a DOM exception that crashes silently | Always guard: `if (!isFinite(duration) \|\| duration <= 0) { return error }` before the frame loop |
| **Canvas crop + CORS** | `canvas.toDataURL()` throws "tainted canvas" if the image was loaded without `crossOrigin` | Add `crossOrigin="anonymous"` to the `<img>` element AND add a cache-busting query param when re-loading for crop (otherwise the browser serves the cached non-CORS response) |
| **Upload path mismatch** | Multer saves to `dist/../uploads` but Express static serves from `src/../uploads` after build | Both paths must resolve to the same directory — use exactly the same `path.resolve(__dirname, "..", "uploads")` pattern in both files |
| **Tiptap + zod** | `@tiptap/starter-kit` and `@tiptap/extension-link` both register a `link` extension name, producing a console warning | The warning is harmless but can be silenced by explicitly excluding link from StarterKit: `StarterKit.configure({ ... })` without link, then add `Link` separately |
| **OpenAPI + zod v3** | `type: integer` in OpenAPI spec causes Orval to generate `z.number().int()` which doesn't exist in zod v3 | Use `type: number` everywhere in the spec |
| **PDF export** | `jspdf` and `html2canvas` are blocked by the Replit package firewall | Use `window.open()` + `window.print()` in a new tab with a purpose-built print stylesheet — no external library needed |
| **pnpm workspace install** | `installLanguagePackages` adds to workspace root; use `pnpm --filter @workspace/<name> add <pkg>` for workspace-specific packages | Always use the `--filter` flag for per-artifact installs |
| **MV3 service worker state** | Chrome MV3 service workers shut down after ~30s idle; any in-memory state is lost | Use `chrome.storage.session` (cleared on browser restart) or `chrome.storage.local` (persisted) for any state the service worker needs to remember |

---

## 7. Feature Roadmap (Future Scope)

These were considered but not built in the reference implementation:

- **GIF export** — `gifUrl` column is reserved; could use `gif.js` or `ffmpeg.wasm` client-side to convert extracted frames into an animated GIF per step
- **Auto-crop on click detection** — During recording, capture `mousemove`/`click` events via a content script injected into the recorded tab; on stop, auto-suggest crop regions centered on each click point (this is how Tango works)
- **AI step titles** — Send the screenshot to a vision model and auto-generate a title and description for each step
- **Version history** — Add a `procedure_versions` table that snapshots the full procedure JSON on each publish, enabling rollback
- **Team workspaces** — Add an `organization_id` to procedures; scope list and share endpoints by org
- **Salesforce direct publish** — Instead of clipboard copy, use the Salesforce Knowledge REST API to create or update an article directly (requires OAuth connected app setup)
- **Chrome extension element detection** — Inject a content script that highlights DOM elements on hover; on click, captures the element's bounding box and auto-crops the screenshot to that region

---

*Generated from working reference implementation — Procedure Builder v1, July 2026*
