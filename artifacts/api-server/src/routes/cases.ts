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
import { db, submittedCasesTable } from "@workspace/db";
import { eq, desc }             from "drizzle-orm";

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

// ── GET /sf/cases/record-types ────────────────────────────────────────────────
// Returns the active, non-master record types for the Case object.

router.get("/sf/cases/record-types", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) return res.status(401).json({ error: "Not connected to Salesforce." });

  try {
    const r = await proxyFetch(`/services/data/${SF_API_VERSION}/sobjects/Case/describe`, {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({ error: `SF describe failed: ${text.slice(0, 200)}` });
    }
    const data = await r.json() as {
      recordTypeInfos?: Array<{
        active: boolean; master: boolean; available: boolean;
        name: string; recordTypeId: string; defaultRecordTypeMapping: boolean;
      }>;
    };
    const recordTypes = (data.recordTypeInfos ?? [])
      .filter(rt => rt.active && !rt.master && rt.available)
      .map(rt => ({ id: rt.recordTypeId, name: rt.name, isDefault: rt.defaultRecordTypeMapping }));
    return res.json({ recordTypes });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── GET /sf/cases/queues ──────────────────────────────────────────────────────
// Returns Salesforce queues that support the Case object.

router.get("/sf/cases/queues", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient>;
  try { client = getSalesforceClient(req); }
  catch { return res.status(401).json({ error: "Not connected to Salesforce." }); }

  try {
    const result = await client.query<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Group WHERE Type = 'Queue' AND Id IN ` +
      `(SELECT QueueId FROM QueueSobject WHERE SobjectType = 'Case') ` +
      `ORDER BY Name LIMIT 50`
    );
    return res.json({ queues: result.records.map(q => ({ id: q.Id, name: q.Name })) });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── POST /api/cases/submit ────────────────────────────────────────────────────
// Local-first case creation: writes to DB first, then syncs to Salesforce.

router.post("/cases/submit", async (req, res) => {
  const userEmail = (req.session.googleEmail ?? req.session.sfEmail) || null;
  if (!userEmail) return res.status(401).json({ error: "Not signed in." });

  const sfUserId = req.session.sfUserId ?? null;

  const {
    recordTypeId, recordTypeName, subject, description, priority,
    ownerId, ownerName, ownerType,
    contactId, contactName, accountId, accountName, customFields,
  } = req.body as {
    recordTypeId?:  string; recordTypeName?: string;
    subject?:       string; description?:    string; priority?: string;
    ownerId?:       string; ownerName?:      string; ownerType?: string;
    contactId?:     string; contactName?:    string;
    accountId?:     string; accountName?:    string;
    customFields?:  Record<string, unknown>;
  };

  if (!subject?.trim()) return res.status(400).json({ error: "subject is required." });

  // 1. Insert local record (pending sync)
  const [local] = await db
    .insert(submittedCasesTable)
    .values({
      subject:        subject.trim(),
      description:    description?.trim() || null,
      priority:       priority ?? "Medium",
      status:         "New",
      recordTypeId:   recordTypeId   || null,
      recordTypeName: recordTypeName || null,
      ownerId:        ownerId        || null,
      ownerName:      ownerName      || null,
      ownerType:      ownerType      || null,
      contactId:      contactId      || null,
      contactName:    contactName    || null,
      accountId:      accountId      || null,
      accountName:    accountName    || null,
      customFields:   customFields   ?? null,
      createdByEmail: userEmail,
      syncStatus:     "pending",
    })
    .returning();

  if (!local) return res.status(500).json({ error: "Failed to create local case record." });

  // 2. Attempt Salesforce sync
  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }

  if (!client) {
    return res.status(201).json({
      case: local, synced: false,
      message: "Case saved locally. Connect to Salesforce to sync.",
    });
  }

  try {
    const sfData: Record<string, unknown> = {
      Subject:  subject.trim(),
      Status:   "New",
      Priority: priority ?? "Medium",
      Origin:   "Web",
    };
    if (description?.trim())  sfData["Description"]  = description.trim();
    if (recordTypeId)         sfData["RecordTypeId"]  = recordTypeId;
    if (contactId)            sfData["ContactId"]     = contactId;
    if (accountId)            sfData["AccountId"]     = accountId;
    // Owner: explicit ID (queue or user) beats the session user
    sfData["OwnerId"] = ownerId || sfUserId || undefined;
    if (customFields) {
      for (const [k, v] of Object.entries(customFields)) sfData[k] = v;
    }
    // Remove undefined keys so SF doesn't reject them
    for (const k of Object.keys(sfData)) {
      if (sfData[k] === undefined) delete sfData[k];
    }

    const result = await client.createRecord("Case", sfData);

    // Fetch case number (best-effort)
    let sfCaseNumber: string | null = null;
    try {
      const cq = await client.query<{ CaseNumber: string }>(
        `SELECT CaseNumber FROM Case WHERE Id = '${result.id}' LIMIT 1`
      );
      sfCaseNumber = cq.records[0]?.CaseNumber ?? null;
    } catch { /* non-fatal */ }

    const [updated] = await db
      .update(submittedCasesTable)
      .set({ sfCaseId: result.id, sfCaseNumber, syncStatus: "synced", syncedAt: new Date(), updatedAt: new Date() })
      .where(eq(submittedCasesTable.id, local.id))
      .returning();

    return res.status(201).json({
      case: updated ?? local, synced: true,
      sfCaseId: result.id, sfCaseNumber,
    });
  } catch (e: unknown) {
    const syncError = e instanceof Error ? e.message : String(e);
    logger.error({ err: syncError, localId: local.id }, "Failed to sync case to Salesforce");

    await db
      .update(submittedCasesTable)
      .set({ syncStatus: "failed", syncError, updatedAt: new Date() })
      .where(eq(submittedCasesTable.id, local.id));

    return res.status(201).json({
      case: { ...local, syncStatus: "failed", syncError },
      synced: false,
      message: "Saved locally — Salesforce sync failed. You can retry from the Cases page.",
    });
  }
});

// ── POST /api/sf/cases/:caseId/attachments ────────────────────────────────────
// Upload one or more files to a Salesforce Case as ContentVersion records.
// Setting FirstPublishLocationId = caseId automatically creates the
// ContentDocumentLink — no separate link step required.
//
// Body: { files: [{ name: string; base64: string; mimeType: string }] }

router.post("/sf/cases/:caseId/attachments", async (req, res) => {
  const { caseId } = req.params;
  if (!caseId || !/^[a-zA-Z0-9]{15,18}$/.test(caseId)) {
    return res.status(400).json({ error: "Invalid caseId." });
  }

  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) return res.status(401).json({ error: "Not connected to Salesforce." });

  const { files } = req.body as {
    files?: Array<{ name: string; base64: string; mimeType: string }>;
  };
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "files array is required." });
  }
  if (files.length > 10) {
    return res.status(400).json({ error: "Maximum 10 files per request." });
  }

  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    if (!file.name || !file.base64) {
      results.push({ name: file.name ?? "(unnamed)", success: false, error: "Missing name or base64." });
      continue;
    }
    try {
      const r = await proxyFetch(`/services/data/${SF_API_VERSION}/sobjects/ContentVersion`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          Title:                  file.name,
          PathOnClient:           file.name,
          VersionData:            file.base64,
          FirstPublishLocationId: caseId,
        }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        logger.warn({ caseId, file: file.name }, `ContentVersion upload failed: ${text.slice(0, 200)}`);
        results.push({ name: file.name, success: false, error: text.slice(0, 200) });
      } else {
        results.push({ name: file.name, success: true });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name: file.name, success: false, error: msg });
    }
  }

  const uploaded = results.filter(r => r.success).length;
  const failed   = results.filter(r => !r.success).length;
  return res.json({ uploaded, failed, results });
});

// ── GET /api/cases/submitted ──────────────────────────────────────────────────
// Returns cases the current user has submitted via Trail OS (local + SF sync status).

router.get("/cases/submitted", async (req, res) => {
  const userEmail = (req.session.googleEmail ?? req.session.sfEmail) || null;
  if (!userEmail) return res.status(401).json({ error: "Not signed in." });

  const cases = await db
    .select()
    .from(submittedCasesTable)
    .where(eq(submittedCasesTable.createdByEmail, userEmail))
    .orderBy(desc(submittedCasesTable.createdAt))
    .limit(50);

  return res.json({ cases });
});

export default router;
