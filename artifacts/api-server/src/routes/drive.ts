import express, { Router } from "express";

const router = Router();

// ─── Access-token cache (Drive uses its own refresh token) ────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const refreshToken = process.env["GOOGLE_DRIVE_REFRESH_TOKEN"];

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_DRIVE_REFRESH_TOKEN");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: string; error_description?: string };
    throw new Error(body.error_description ?? body.error ?? `Token exchange failed: HTTP ${resp.status}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  id:            string;
  name:          string;
  mimeType:      string;
  thumbnailLink?: string;
  webViewLink?:  string;
  iconLink?:     string;
  modifiedTime?: string;
  size?:         string;
  parents?:      string[];
  description?:  string;
}

interface DriveFolder {
  id:   string;
  name: string;
}

interface DriveFolderResult {
  id:           string;
  name:         string;
  webViewLink?: string;
  modifiedTime?: string;
  parents?:     string[];
  path?:        string;  // ancestor path, e.g. "Programs → Coaching"
}

// ─── Helper: list files in a folder ──────────────────────────────────────────

async function listFilesInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const fields  = "files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,modifiedTime,size,parents,description)";
  const query   = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url     = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message ?? `Drive API error: HTTP ${resp.status}`);
  }

  const data = await resp.json() as { files: DriveFile[] };
  return data.files ?? [];
}

async function getFolderMeta(token: string, folderId: string): Promise<DriveFolder | null> {
  const resp = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) }
  );
  if (!resp.ok) return null;
  return resp.json() as Promise<DriveFolder>;
}

// ─── Helper: resolve ancestor path strings for a set of folders ──────────────
//
// For each folder, walks up the parent chain (up to 5 levels) and returns a
// Map<folderId, "Grandparent → Parent"> path prefix string.
// Skips the Drive root ("root" pseudo-ID and any ID matching the org root).

async function buildFolderPaths(
  token: string,
  folders: Array<{ id: string; name: string; parents?: string[] }>
): Promise<Map<string, string>> {
  const nameCache = new Map<string, string>(); // id → name
  const parentOf  = new Map<string, string>(); // id → parentId

  for (const f of folders) {
    nameCache.set(f.id, f.name);
    if (f.parents?.[0]) parentOf.set(f.id, f.parents[0]);
  }

  // Iteratively fetch ancestor layers (up to 4 additional hops)
  let idsToFetch = new Set<string>(
    [...parentOf.values()].filter(id => !nameCache.has(id))
  );

  for (let depth = 0; depth < 4 && idsToFetch.size > 0; depth++) {
    const ids = [...idsToFetch];
    const results = await Promise.all(
      ids.map(id =>
        fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,parents`, {
          headers: { Authorization: `Bearer ${token}` },
          signal:  AbortSignal.timeout(8_000),
        })
          .then(r => r.ok ? r.json() as Promise<{ id: string; name: string; parents?: string[] }> : null)
          .catch(() => null)
      )
    );

    idsToFetch = new Set<string>();
    for (const r of results) {
      if (!r) continue;
      nameCache.set(r.id, r.name);
      if (r.parents?.[0]) {
        parentOf.set(r.id, r.parents[0]);
        if (!nameCache.has(r.parents[0])) idsToFetch.add(r.parents[0]);
      }
    }
  }

  // Build path strings (ancestors only, not the folder itself)
  const pathMap = new Map<string, string>();
  for (const f of folders) {
    const parts: string[] = [];
    let cur: string | undefined = parentOf.get(f.id);
    const visited = new Set<string>();
    while (cur && cur !== "root" && !visited.has(cur)) {
      visited.add(cur);
      const n = nameCache.get(cur);
      if (n) parts.unshift(n);
      cur = parentOf.get(cur);
    }
    if (parts.length > 0) pathMap.set(f.id, parts.join(" → "));
  }
  return pathMap;
}

// ─── GET /api/drive/folders ────────────────────────────────────────────────
//
// Lists Drive folders inside a parent (default: "root" = My Drive).
// Used by the Knowledge Sources admin folder picker.
// Query params:
//   parent  — folder ID (default "root"); ignored when global=true
//   q       — optional name fragment to filter by
//   global  — "true" to search across all of Drive (omits parent filter)
//             When global=true, each result includes a `path` field showing
//             the ancestor chain, e.g. "Programs → Coaching"
//
// Response: { folders: [{ id, name, webViewLink, modifiedTime, path? }] }

router.get("/drive/folders", async (req, res): Promise<void> => {
  try {
    const token    = await getAccessToken();
    const isGlobal = req.query["global"] === "true";
    const parent   = typeof req.query["parent"] === "string" ? req.query["parent"] : "root";
    const nameQ    = typeof req.query["q"] === "string" ? req.query["q"].replace(/'/g, "\\'") : "";

    const parts: string[] = [
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`,
    ];
    if (!isGlobal) parts.push(`'${parent}' in parents`);
    if (nameQ)     parts.push(`name contains '${nameQ}'`);

    const q      = encodeURIComponent(parts.join(" and "));
    // Include `parents` so we can build ancestor paths for global results
    const fields  = "files(id,name,webViewLink,modifiedTime,parents)";
    const orderBy = isGlobal ? "name" : "modifiedTime+desc";
    const url     = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=50&orderBy=${orderBy}&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      res.status(resp.status).json({ error: body.error?.message ?? `Drive API error: HTTP ${resp.status}`, folders: [] });
      return;
    }

    const data    = await resp.json() as { files: DriveFolderResult[] };
    const folders = data.files ?? [];

    // For global searches, resolve ancestor paths so the UI can show
    // "Programs → Coaching → Spring 2026" next to each result.
    if (isGlobal && folders.length > 0) {
      const pathMap = await buildFolderPaths(token, folders);
      for (const f of folders) {
        const p = pathMap.get(f.id);
        if (p) f.path = p;
      }
    }

    res.json({ folders });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing GOOGLE")) {
      res.status(503).json({ error: "Drive integration not configured", folders: [] });
      return;
    }
    res.status(500).json({ error: msg, folders: [] });
  }
});

// ─── GET /api/drive/status ─────────────────────────────────────────────────

router.get("/drive/status", async (_req, res) => {
  const hasRefreshToken = !!process.env["GOOGLE_DRIVE_REFRESH_TOKEN"];
  const hasCreds        = !!process.env["GOOGLE_CLIENT_ID"] && !!process.env["GOOGLE_CLIENT_SECRET"];
  const configured      = hasRefreshToken && hasCreds;
  const pennyFolderId   = process.env["GOOGLE_DRIVE_PENNY_FOLDER_ID"] ?? null;

  if (!configured) {
    return res.json({ connected: false, reason: "Missing OAuth credentials or refresh token", pennyFolderConfigured: false });
  }

  try {
    const token = await getAccessToken();
    // quick probe — list root (max 1 file) just to confirm the token works
    await fetch("https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)", {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(8_000),
    });

    return res.json({
      connected: true,
      pennyFolderConfigured: !!pennyFolderId,
      pennyFolderId: pennyFolderId ?? null,
    });
  } catch (err) {
    return res.json({ connected: false, reason: err instanceof Error ? err.message : String(err), pennyFolderConfigured: false });
  }
});

// ─── GET /api/drive/penny-assets ──────────────────────────────────────────────
//
// Returns files from the Penny Assets Drive folder, grouped by subfolder.
// Subfolder names map to Penny states (coaching, trail-talk, etc.).
// Env: GOOGLE_DRIVE_PENNY_FOLDER_ID  — root Penny Assets folder ID.
//
// Response shape:
//   { folderId, folderName, groups: [{ state, folderId, files }], ungrouped: DriveFile[] }

router.get("/drive/penny-assets", async (_req, res) => {
  const pennyFolderId = process.env["GOOGLE_DRIVE_PENNY_FOLDER_ID"];

  if (!pennyFolderId) {
    return res.status(200).json({
      configured: false,
      message: "GOOGLE_DRIVE_PENNY_FOLDER_ID is not set. Create a 'Penny Assets' folder in Google Drive and add its ID as this secret.",
      folderId: null,
      folderName: null,
      groups: [],
      ungrouped: [],
    });
  }

  try {
    const token = await getAccessToken();

    // Get root folder metadata + contents in parallel
    const [rootMeta, rootContents] = await Promise.all([
      getFolderMeta(token, pennyFolderId),
      listFilesInFolder(token, pennyFolderId),
    ]);

    const subFolders = rootContents.filter(f => f.mimeType === "application/vnd.google-apps.folder");
    const rootFiles  = rootContents.filter(f => f.mimeType !== "application/vnd.google-apps.folder");

    // Fetch contents of each subfolder in parallel
    const groupResults = await Promise.all(
      subFolders.map(async folder => {
        const files = await listFilesInFolder(token, folder.id);
        return { state: folder.name.toLowerCase().replace(/\s+/g, "-"), folderId: folder.id, folderName: folder.name, files };
      })
    );

    return res.json({
      configured: true,
      folderId:   pennyFolderId,
      folderName: rootMeta?.name ?? "Penny Assets",
      groups:     groupResults,
      ungrouped:  rootFiles,
    });
  } catch (err) {
    return res.status(500).json({
      configured: true,
      error: err instanceof Error ? err.message : String(err),
      folderId: pennyFolderId,
      groups: [],
      ungrouped: [],
    });
  }
});

// ─── GET /api/drive/penny-assets/folders ──────────────────────────────────────
//
// Helper: list top-level Drive folders so the user can configure the Penny Assets folder.

router.get("/drive/penny-assets/folders", async (_req, res) => {
  try {
    const token = await getAccessToken();
    const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false");
    const resp  = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&orderBy=name&pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }
    );
    if (!resp.ok) throw new Error(`Drive API error: HTTP ${resp.status}`);
    const data = await resp.json() as { files: DriveFolder[] };
    return res.json({ folders: data.files ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err), folders: [] });
  }
});

// ─── GET /api/drive/penny-content ─────────────────────────────────────────────
//
// Lists media files (images, audio, video) from the GOOGLE_DRIVE_PENNY_FOLDER_ID
// folder, for use in the Prompt Studio PennyContentStrip.
//
// Response shape:
//   {
//     configured: boolean,
//     folderId: string | null,
//     folderName: string | null,
//     folderWebViewLink: string | null,
//     images: DriveFile[],
//     audio:  DriveFile[],
//     video:  DriveFile[],
//   }

router.get("/drive/penny-content", async (_req, res): Promise<void> => {
  const pennyFolderId = process.env["GOOGLE_DRIVE_PENNY_FOLDER_ID"];

  if (!pennyFolderId) {
    res.status(200).json({
      configured: false,
      folderId: null,
      folderName: null,
      folderWebViewLink: null,
      images: [],
      audio:  [],
      video:  [],
    });
    return;
  }

  try {
    const token = await getAccessToken();

    // Fetch folder metadata and media files in parallel
    const mediaQuery = encodeURIComponent(
      `'${pennyFolderId}' in parents and trashed = false and ` +
      `(mimeType contains 'image/' or mimeType contains 'audio/' or mimeType contains 'video/')`
    );
    const fields = "files(id,name,mimeType,webViewLink,modifiedTime,size)";
    const url = `https://www.googleapis.com/drive/v3/files?q=${mediaQuery}&fields=${fields}&pageSize=100&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const [rootMeta, filesResp] = await Promise.all([
      fetch(
        `https://www.googleapis.com/drive/v3/files/${pennyFolderId}?fields=id,name,webViewLink&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) }
      ),
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal:  AbortSignal.timeout(10_000),
      }),
    ]);

    const folderMeta = rootMeta.ok
      ? (await rootMeta.json() as { id: string; name: string; webViewLink?: string })
      : null;

    if (!filesResp.ok) {
      const body = await filesResp.json().catch(() => ({})) as { error?: { message?: string } };
      res.status(filesResp.status).json({
        configured: true,
        error: body.error?.message ?? `Drive API error: HTTP ${filesResp.status}`,
        folderId: pennyFolderId,
        folderName: folderMeta?.name ?? null,
        folderWebViewLink: folderMeta?.webViewLink ?? null,
        images: [], audio: [], video: [],
      });
      return;
    }

    const data  = await filesResp.json() as { files: DriveFile[] };
    const files = data.files ?? [];

    const images = files.filter(f => f.mimeType.startsWith("image/"));
    const audio  = files.filter(f => f.mimeType.startsWith("audio/"));
    const video  = files.filter(f => f.mimeType.startsWith("video/"));

    res.json({
      configured:        true,
      folderId:          pennyFolderId,
      folderName:        folderMeta?.name ?? "Penny Content",
      folderWebViewLink: folderMeta?.webViewLink ?? null,
      images,
      audio,
      video,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing GOOGLE")) {
      res.status(503).json({ configured: false, error: "Drive integration not configured", images: [], audio: [], video: [] });
      return;
    }
    res.status(500).json({
      configured: true,
      error: msg,
      folderId: pennyFolderId,
      folderName: null,
      folderWebViewLink: null,
      images: [], audio: [], video: [],
    });
  }
});

// ─── POST /api/drive/penny-content ────────────────────────────────────────────
//
// Uploads a media file (image, audio, or video) to GOOGLE_DRIVE_PENNY_FOLDER_ID.
// The file is sent as a raw binary body; metadata arrives as query params.
//
// Query params:
//   name     — desired filename in Drive
//   mimeType — MIME type of the file (e.g. "image/png")
//
// Response: { success: true, file: DriveFile }

router.post(
  "/drive/penny-content",
  express.raw({ type: "*/*", limit: "100mb" }),
  async (req, res): Promise<void> => {
    const pennyFolderId = process.env["GOOGLE_DRIVE_PENNY_FOLDER_ID"];
    if (!pennyFolderId) {
      res.status(503).json({ error: "GOOGLE_DRIVE_PENNY_FOLDER_ID is not configured" });
      return;
    }

    const fileName = typeof req.query["name"] === "string" && req.query["name"].trim()
      ? req.query["name"].trim()
      : "upload";
    const mimeType = typeof req.query["mimeType"] === "string" && req.query["mimeType"].trim()
      ? req.query["mimeType"].trim()
      : "application/octet-stream";

    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "No file data received" });
      return;
    }

    try {
      const token = await getAccessToken();

      // Build a multipart/related body (metadata + media) for the Drive upload API
      const boundary  = "tt_drive_upload_boundary";
      const metadata  = JSON.stringify({ name: fileName, parents: [pennyFolderId] });
      const multipart = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${metadata}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: ${mimeType}\r\n\r\n`
        ),
        body,
        Buffer.from(`\r\n--${boundary}--`),
      ]);

      const uploadResp = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
        {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body:   multipart,
          signal: AbortSignal.timeout(120_000),
        }
      );

      if (!uploadResp.ok) {
        const errBody = await uploadResp.json().catch(() => ({})) as { error?: { message?: string } };
        res.status(uploadResp.status).json({
          error: errBody.error?.message ?? `Drive upload failed: HTTP ${uploadResp.status}`,
        });
        return;
      }

      const file = await uploadResp.json() as DriveFile;
      res.json({ success: true, file });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Missing GOOGLE")) {
        res.status(503).json({ error: "Drive integration not configured" });
        return;
      }
      res.status(500).json({ error: msg });
    }
  }
);

// ─── GET /api/drive/folder-check ──────────────────────────────────────────────
//
// Checks whether one or more Drive folders are still accessible.
// Query param: ids — comma-separated folder IDs to check (max 20)
// Response: { results: { [folderId]: "ok" | "not_found" | "forbidden" | "error" } }

router.get("/drive/folder-check", async (req, res): Promise<void> => {
  const raw = typeof req.query["ids"] === "string" ? req.query["ids"] : "";
  const ids = raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 20);

  if (ids.length === 0) {
    res.json({ results: {} });
    return;
  }

  try {
    const token = await getAccessToken();
    const results: Record<string, "ok" | "not_found" | "forbidden" | "error"> = {};

    await Promise.all(ids.map(async (id) => {
      try {
        const resp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${id}?fields=id&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) },
        );
        if (resp.ok) {
          results[id] = "ok";
        } else if (resp.status === 404) {
          results[id] = "not_found";
        } else if (resp.status === 403) {
          results[id] = "forbidden";
        } else {
          results[id] = "error";
        }
      } catch {
        results[id] = "error";
      }
    }));

    res.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing GOOGLE")) {
      res.status(503).json({ error: "Drive integration not configured", results: {} });
      return;
    }
    res.status(500).json({ error: msg, results: {} });
  }
});

export default router;
