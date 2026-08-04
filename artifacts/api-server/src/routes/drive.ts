import { Router } from "express";

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

// ─── GET /api/drive/folders ────────────────────────────────────────────────
//
// Lists Drive folders inside a parent (default: "root" = My Drive).
// Used by the Knowledge Sources admin folder picker.
// Query params:
//   parent  — folder ID (default "root")
//   q       — optional name fragment to filter by
//
// Response: { folders: [{ id, name, webViewLink, modifiedTime }] }

router.get("/drive/folders", async (req, res): Promise<void> => {
  try {
    const token  = await getAccessToken();
    const parent = typeof req.query["parent"] === "string" ? req.query["parent"] : "root";
    const nameQ  = typeof req.query["q"] === "string" ? req.query["q"].replace(/'/g, "\\'") : "";

    const parts = [
      `'${parent}' in parents`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`,
    ];
    if (nameQ) parts.push(`name contains '${nameQ}'`);

    const q      = encodeURIComponent(parts.join(" and "));
    const fields = "files(id,name,webViewLink,modifiedTime)";
    const url    = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=50&orderBy=modifiedTime+desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      res.status(resp.status).json({ error: body.error?.message ?? `Drive API error: HTTP ${resp.status}`, folders: [] });
      return;
    }

    const data = await resp.json() as { files: Array<{ id: string; name: string; webViewLink?: string; modifiedTime?: string }> };
    res.json({ folders: data.files ?? [] });
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

export default router;
