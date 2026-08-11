/**
 * fathom.ts
 *
 * Per-user Fathom meeting-notes integration for Team Homebase (staff only).
 *
 * Routes:
 *   GET    /fathom/status    — { connected: bool }
 *   PUT    /fathom/key       — { apiKey } → validate + upsert; { connected: true }
 *   DELETE /fathom/key       — remove stored key; 204
 *   GET    /fathom/meetings  — list recent meetings (up to 10), cached 60 s
 *
 * All routes are behind the global staffAuthGate in index.ts.  Each handler
 * additionally checks req.session.googleEmail for defence-in-depth.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { fathomUserKeysTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken, decryptToken } from "./slackOAuth.js";

const router = Router();

const FATHOM_API = "https://api.fathom.ai/external/v1";

// ── Per-user meeting cache (60 s TTL) ─────────────────────────────────────────

interface FathomMeeting {
  id: string;
  title: string;
  started_at: string;   // ISO-8601
  share_url: string;
}

interface CacheEntry {
  meetings:  FathomMeeting[];
  expiresAt: number;
}

const meetingsCache = new Map<string, CacheEntry>();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch the stored (decrypted) API key for a user, or null if not connected. */
async function getApiKey(email: string): Promise<string | null> {
  const rows = await db
    .select({ apiKey: fathomUserKeysTable.apiKey })
    .from(fathomUserKeysTable)
    .where(eq(fathomUserKeysTable.userEmail, email))
    .limit(1);
  if (rows.length === 0) return null;
  return decryptToken(rows[0]!.apiKey);
}

/** Call the Fathom API with a personal key. Returns the parsed JSON. */
async function fathomGet(
  apiKey: string,
  path:   string,
  params: Record<string, string> = {},
): Promise<unknown> {
  const url = new URL(`${FATHOM_API}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const msg  = body.message ?? `Fathom API returned HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }

  return res.json();
}

// ── GET /fathom/status ────────────────────────────────────────────────────────

router.get("/fathom/status", async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ connected: false }); return; }

  try {
    const rows = await db
      .select({ id: fathomUserKeysTable.id })
      .from(fathomUserKeysTable)
      .where(eq(fathomUserKeysTable.userEmail, email))
      .limit(1);
    res.json({ connected: rows.length > 0 });
  } catch (err) {
    req.log.error({ err }, "fathom status: db error");
    res.status(500).json({ connected: false, error: "db_error" });
  }
});

// ── PUT /fathom/key ───────────────────────────────────────────────────────────

router.put("/fathom/key", async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "not_authenticated" }); return; }

  const { apiKey } = (req.body ?? {}) as { apiKey?: string };
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }

  const trimmedKey = apiKey.trim();

  // Validate key against Fathom before persisting
  try {
    await fathomGet(trimmedKey, "/meetings", { page_size: "1" });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0;
    if (status === 401 || status === 403) {
      res.status(400).json({ error: "Invalid Fathom API key — check your key and try again." });
    } else {
      req.log.warn({ err }, "fathom key: validation call failed");
      res.status(400).json({ error: "Could not verify the key. Please try again." });
    }
    return;
  }

  try {
    const encryptedKey = encryptToken(trimmedKey);
    await db
      .insert(fathomUserKeysTable)
      .values({ userEmail: email, apiKey: encryptedKey, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: fathomUserKeysTable.userEmail,
        set:    { apiKey: encryptedKey, updatedAt: new Date() },
      });

    meetingsCache.delete(email);  // invalidate any stale cache
    res.json({ connected: true });
  } catch (err) {
    req.log.error({ err }, "fathom key: db upsert failed");
    res.status(500).json({ error: "Failed to save key. Please try again." });
  }
});

// ── DELETE /fathom/key ────────────────────────────────────────────────────────

router.delete("/fathom/key", async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "not_authenticated" }); return; }

  try {
    await db
      .delete(fathomUserKeysTable)
      .where(eq(fathomUserKeysTable.userEmail, email));
    meetingsCache.delete(email);
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "fathom key: delete failed");
    res.status(500).json({ error: "Failed to disconnect. Please try again." });
  }
});

// ── GET /fathom/meetings ──────────────────────────────────────────────────────

router.get("/fathom/meetings", async (req, res) => {
  const email = req.session.googleEmail;
  if (!email) { res.status(401).json({ error: "not_authenticated" }); return; }

  // Cache hit
  const cached = meetingsCache.get(email);
  if (cached && Date.now() < cached.expiresAt) {
    res.json({ meetings: cached.meetings });
    return;
  }

  let apiKey: string | null;
  try {
    apiKey = await getApiKey(email);
  } catch (err) {
    req.log.error({ err }, "fathom meetings: db key lookup failed");
    res.status(500).json({ error: "db_error" });
    return;
  }

  if (!apiKey) {
    res.status(404).json({ connected: false });
    return;
  }

  try {
    const data = await fathomGet(apiKey, "/meetings", { page_size: "10" }) as {
      data?: FathomMeeting[];
      items?: FathomMeeting[];  // handle alternate response shapes
    };

    // Fathom may return { data: [...] } or { items: [...] } — handle both
    const raw: unknown[] = data.data ?? data.items ?? (Array.isArray(data) ? data as unknown[] : []);

    const meetings: FathomMeeting[] = raw.map((m: unknown, idx: number) => {
      const item       = m as Record<string, unknown>;
      const title      = String(item["title"] ?? item["name"] ?? item["summary"] ?? "Untitled meeting");
      const started_at = String(item["started_at"] ?? item["created_at"] ?? item["date"] ?? "");
      // Use the API-provided id when present; fall back to a stable composite key
      // so React never receives duplicate or empty key props.
      const rawId = item["id"] ?? item["uuid"] ?? item["call_id"] ?? "";
      const id    = rawId ? String(rawId) : `fathom-${idx}-${started_at || title.slice(0, 20)}`;
      return {
        id,
        title,
        started_at,
        share_url: String(item["share_url"] ?? item["url"] ?? item["link"] ?? ""),
      };
    });

    // Sort newest first
    meetings.sort((a, b) => b.started_at.localeCompare(a.started_at));

    meetingsCache.set(email, { meetings, expiresAt: Date.now() + 60_000 });
    res.json({ meetings });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0;
    req.log.warn({ err, status }, "fathom meetings: api call failed");

    if (status === 401 || status === 403) {
      // Key was revoked — clear it so the card shows re-entry prompt
      await db.delete(fathomUserKeysTable).where(eq(fathomUserKeysTable.userEmail, email)).catch(() => undefined);
      meetingsCache.delete(email);
      res.status(401).json({ error: "key_invalid", connected: false });
    } else {
      res.status(502).json({ error: "fathom_api_error" });
    }
  }
});

export default router;
