/**
 * Cases routes — /api/sf/cases
 *
 * GET    /sf/cases                — list cases owned by the current SF user
 * PATCH  /sf/cases/:id/status     — update Status field
 * PATCH  /sf/cases/:id            — update FollowUpDate
 * POST   /sf/cases/:id/comments   — create a CaseComment (internal note)
 */

import { Router } from "express";
import { getSalesforceClient }  from "../lib/getSalesforceClient.js";
import { getEffectiveSfFetch }  from "../lib/salesforceOAuth.js";
import { SF_API_VERSION }       from "../lib/sfConstants.js";
import { logger }               from "../lib/logger.js";

const router = Router();

const ALLOWED_CASE_STATUSES = ["New", "Working", "Escalated", "Closed"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getOrgBaseUrl(proxyFetch: (url: string, init?: RequestInit) => Promise<Response>): Promise<string> {
  try {
    const res  = await proxyFetch("/services/oauth2/userinfo", { headers: { Accept: "application/json" } });
    if (!res.ok) return "";
    const info = await res.json() as Record<string, unknown>;
    const urls = info["urls"] as Record<string, string> | undefined;
    const sobjectsUrl = urls?.["sobjects"] ?? "";
    if (sobjectsUrl) return sobjectsUrl.replace(/\/services\/.*$/, "");
    return String(info["profile"] ?? "").replace(/\/[A-Za-z0-9]{15,18}$/, "");
  } catch { return ""; }
}

// ── GET /sf/cases ──────────────────────────────────────────────────────────────

router.get("/sf/cases", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient>;
  try {
    client = getSalesforceClient(req);
  } catch {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const sfUserId = req.session.sfUserId;
  if (!sfUserId || !/^[a-zA-Z0-9]{15,18}$/.test(sfUserId)) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  const statusParam = (req.query["status"] as string) ?? "open";
  const statusClause =
    statusParam === "open"   ? `AND IsClosed = false` :
    statusParam === "closed" ? `AND IsClosed = true`  : "";

  const proxyFetch = getEffectiveSfFetch(req);
  const orgBaseUrl = proxyFetch ? await getOrgBaseUrl(proxyFetch) : "";

  // Try with optional fields; fall back gracefully if any are unsupported.
  // LastModifiedDate is a standard Case field and is always included in the
  // base query.  LastModifiedBy.Name and FollowUpDate are optional — they are
  // dropped in the fallback attempt if the org does not support them.
  let records: Record<string, unknown>[] = [];
  let followUpDateSupported    = false;
  let lastModifiedBySupported  = false;

  const buildSoql = (withModifiedBy: boolean, withFollowUp: boolean) =>
    `SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate, LastModifiedDate` +
    (withModifiedBy ? `, LastModifiedBy.Name` : ``) +
    (withFollowUp   ? `, FollowUpDate`        : ``) +
    `, Owner.Name, Contact.Name, Account.Name ` +
    `FROM Case WHERE OwnerId = '${sfUserId}' ${statusClause} ` +
    `ORDER BY CreatedDate DESC LIMIT 50`;

  // Progressive fallback: richest → stripped.  Each attempt drops one layer
  // of optional fields so we always land on a query the org can handle.
  const attempts: Array<[boolean, boolean]> = [
    [true,  true ],  // all optional fields
    [false, false],  // minimal (base query — guaranteed safe)
  ];

  let lastError = "";
  for (const [withModifiedBy, withFollowUp] of attempts) {
    try {
      const result = await client.query<Record<string, unknown>>(
        buildSoql(withModifiedBy, withFollowUp)
      );
      records = result.records;
      lastModifiedBySupported = withModifiedBy;
      followUpDateSupported   = withFollowUp;
      lastError = "";
      break;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
      logger.warn({ sfUserId, err: lastError }, "SOQL attempt failed, trying next fallback");
    }
  }

  if (lastError) {
    logger.error({ sfUserId, err: lastError }, "All SOQL fallback attempts failed for /sf/cases");
    return res.status(500).json({ error: lastError });
  }

  const cases = records.map(r => ({
    Id:                   r["Id"]               as string,
    CaseNumber:           r["CaseNumber"]        as string | null,
    Subject:              r["Subject"]           as string | null,
    Priority:             r["Priority"]          as string | null,
    Status:               r["Status"]            as string | null,
    CreatedDate:          r["CreatedDate"]        as string | null,
    LastModifiedDate:     r["LastModifiedDate"]  as string | null,
    LastModifiedByName:   lastModifiedBySupported ? (((r["LastModifiedBy"] as Record<string, unknown> | null)?.["Name"] as string | null) ?? null) : null,
    FollowUpDate:         followUpDateSupported   ? (r["FollowUpDate"] as string | null) : null,
    OwnerName:            ((r["Owner"]   as Record<string, unknown> | null)?.["Name"]  as string | null) ?? null,
    ContactName:          ((r["Contact"] as Record<string, unknown> | null)?.["Name"]  as string | null) ?? null,
    AccountName:          ((r["Account"] as Record<string, unknown> | null)?.["Name"]  as string | null) ?? null,
  }));

  return res.json({ cases, orgBaseUrl, followUpDateSupported });
});

// ── PATCH /sf/cases/:id/status ─────────────────────────────────────────────────

router.patch("/sf/cases/:id/status", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient>;
  try {
    client = getSalesforceClient(req);
  } catch {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const { id } = req.params;
  if (!id || !/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    return res.status(400).json({ error: "Invalid Case ID." });
  }

  const { status } = (req.body ?? {}) as { status?: string };
  if (!status || !(ALLOWED_CASE_STATUSES as readonly string[]).includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ALLOWED_CASE_STATUSES.join(", ")}`,
    });
  }

  const sfUserId = req.session.sfUserId ?? "";
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  try {
    // Ownership check — return 404 regardless of whether the Case exists but
    // belongs to someone else, to avoid leaking existence of other users' cases.
    const owned = await client.query<{ Id: string }>(
      `SELECT Id FROM Case WHERE Id = '${id}' AND OwnerId = '${sfUserId}' AND IsDeleted = false LIMIT 1`,
    );
    if (owned.records.length === 0) {
      return res.status(404).json({ error: "Case not found." });
    }
    await client.updateRecord("Case", id, { Status: status });
    return res.json({ success: true, status });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── PATCH /sf/cases/:id ────────────────────────────────────────────────────────

router.patch("/sf/cases/:id", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient>;
  try {
    client = getSalesforceClient(req);
  } catch {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const { id } = req.params;
  if (!id || !/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    return res.status(400).json({ error: "Invalid Case ID." });
  }

  const body = (req.body ?? {}) as { followUpDate?: string | null };
  if (!("followUpDate" in body)) {
    return res.status(400).json({ error: "No updatable fields provided." });
  }

  const dateVal = body.followUpDate ?? null;
  if (dateVal !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return res.status(400).json({ error: "followUpDate must be YYYY-MM-DD or null." });
  }

  const sfUserId = req.session.sfUserId ?? "";
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  try {
    // Ownership check — return 404 regardless of whether the Case belongs to another user.
    const owned = await client.query<{ Id: string }>(
      `SELECT Id FROM Case WHERE Id = '${id}' AND OwnerId = '${sfUserId}' AND IsDeleted = false LIMIT 1`,
    );
    if (owned.records.length === 0) {
      return res.status(404).json({ error: "Case not found." });
    }
    await client.updateRecord("Case", id, { FollowUpDate: dateVal });
    return res.json({ success: true, FollowUpDate: dateVal });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/FollowUpDate|No such column/i.test(msg)) {
      return res.json({ success: false, fieldUnsupported: true });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── POST /sf/cases/:id/comments ───────────────────────────────────────────────

router.post("/sf/cases/:id/comments", async (req, res) => {
  // Need both client (ownership check) and proxyFetch (CaseComment creation).
  let client: ReturnType<typeof getSalesforceClient>;
  try {
    client = getSalesforceClient(req);
  } catch {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const { id } = req.params;
  if (!id || !/^[a-zA-Z0-9]{15,18}$/.test(id)) {
    return res.status(400).json({ error: "Invalid Case ID." });
  }

  const sfUserId = req.session.sfUserId ?? "";
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  const { body: commentBody } = (req.body ?? {}) as { body?: string };
  if (!commentBody || typeof commentBody !== "string" || !commentBody.trim()) {
    return res.status(400).json({ error: "comment body is required." });
  }

  try {
    // Ownership check — do not disclose whether a foreign Case exists.
    const owned = await client.query<{ Id: string }>(
      `SELECT Id FROM Case WHERE Id = '${id}' AND OwnerId = '${sfUserId}' AND IsDeleted = false LIMIT 1`,
    );
    if (owned.records.length === 0) {
      return res.status(404).json({ error: "Case not found." });
    }

    const sfRes = await proxyFetch(`/services/data/${SF_API_VERSION}/sobjects/CaseComment`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify({ ParentId: id, CommentBody: commentBody.trim() }),
    });

    if (sfRes.status === 403) {
      return res.status(403).json({ error: "Comments not permitted — check Salesforce sharing rules." });
    }
    if (!sfRes.ok) {
      const text = await sfRes.text().catch(() => `HTTP ${sfRes.status}`);
      return res.status(sfRes.status).json({ error: text.slice(0, 200) });
    }
    const data = await sfRes.json() as { id?: string; success?: boolean };
    return res.status(201).json({ success: true, id: data.id });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
