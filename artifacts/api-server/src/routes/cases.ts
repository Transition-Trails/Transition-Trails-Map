/**
 * Cases routes — /api/sf/cases  &  /api/cases
 *
 * GET    /sf/cases                    — list cases owned by the current SF user
 *                                       (add ?assignedTo=all for org-wide view)
 * PATCH  /sf/cases/:id/status         — update Status field
 * PATCH  /sf/cases/:id                — update FollowUpDate
 * POST   /sf/cases/:id/comments       — create a CaseComment (internal note)
 * POST   /sf/cases/:id/ping-owner     — send a Slack DM to the case owner
 * GET    /sf/cases/record-types       — active record types for Case
 * GET    /sf/cases/queues             — SF queues that support Case
 * POST   /sf/cases/:caseId/attachments — upload files to a SF Case
 * POST   /cases/submit               — local-first case creation
 * GET    /cases/submitted             — list locally submitted cases
 * POST   /cases/:id/retry            — retry a failed/pending SF sync
 */

import { Router } from "express";
import { getSalesforceClient }  from "../lib/getSalesforceClient.js";
import { getEffectiveSfFetch }  from "../lib/salesforceOAuth.js";
import { SF_API_VERSION }       from "../lib/sfConstants.js";
import { logger }               from "../lib/logger.js";
import { db, submittedCasesTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { isSuperAdmin, isAdmin } from "../middlewares/requireAuth.js";

const router = Router();

// Status values are validated by Salesforce on update; no hardcoded allowlist needed.

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * If the Salesforce error contains one or more FIELD_CUSTOM_VALIDATION_EXCEPTION
 * entries, extract and join the human-readable message text they carry.
 * The org admin wrote those messages for end users; surface them directly.
 * Returns null for all other error types so the caller can fall through.
 */
function extractSfValidationMessage(errMsg: string): string | null {
  if (!errMsg.includes("FIELD_CUSTOM_VALIDATION_EXCEPTION")) return null;
  // SF embeds a JSON error array at the end of the thrown message string.
  // Find the first "[{" and parse from there.
  const bracketIdx = errMsg.indexOf("[{");
  if (bracketIdx === -1) return null;
  try {
    const errors = JSON.parse(errMsg.slice(bracketIdx)) as Array<{
      message?: string;
      errorCode?: string;
    }>;
    const messages = errors
      .filter(e => e.errorCode === "FIELD_CUSTOM_VALIDATION_EXCEPTION" && e.message)
      .map(e => e.message!.trim());
    return messages.length > 0 ? messages.join(" ") : null;
  } catch {
    return null;
  }
}

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
  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }
  if (!client) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account and try again." });
  }

  const sfUserId = req.session.sfUserId ?? null;
  if (!sfUserId || !/^[a-zA-Z0-9]{15,18}$/.test(sfUserId)) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  const statusParam = (req.query["status"] as string) ?? "open";
  const statusClause =
    statusParam === "open"   ? `AND IsClosed = false` :
    statusParam === "closed" ? `AND IsClosed = true`  : "";

  const proxyFetch = getEffectiveSfFetch(req);
  const orgBaseUrl = proxyFetch ? await getOrgBaseUrl(proxyFetch) : "";

  let records: Record<string, unknown>[] = [];
  let followUpDateSupported    = false;
  let lastModifiedBySupported  = false;

  // ?assignedTo=all removes the OwnerId filter so staff can see all org cases.
  // SF sharing rules still apply — only cases the connected user can read are returned.
  // Requires Power-or-above tier — enforce server-side, not just client-side.
  const assignedToAll = (req.query["assignedTo"] as string) === "all";
  if (assignedToAll) {
    const email  = req.session.googleEmail ?? "";
    const groups = req.session.googleGroups ?? [];
    const powerGroup = (process.env["GOOGLE_GROUP_POWER"] ?? "trailospennyadmin@transitiontrails.org").toLowerCase().trim();
    const isPowerOrAbove =
      isSuperAdmin(email) ||
      isAdmin(groups, email) ||
      groups.map(g => g.toLowerCase()).includes(powerGroup);
    if (!isPowerOrAbove) {
      return res.status(403).json({
        error:   "not_authorized",
        message: "Viewing all org cases requires Power-level access or above.",
      });
    }
  }

  const buildSoql = (withModifiedBy: boolean, withFollowUp: boolean) => {
    const cols =
      `SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate, LastModifiedDate` +
      (withModifiedBy ? `, LastModifiedBy.Name` : ``) +
      (withFollowUp   ? `, FollowUpDate`        : ``) +
      `, Owner.Name, Contact.Name, Account.Name `;
    // When fetching all org cases, "AND IsClosed = false" → "WHERE IsClosed = false".
    const where = assignedToAll
      ? (statusClause ? `WHERE ${statusClause.slice(4)} ` : ``)
      : `WHERE OwnerId = '${sfUserId}' ${statusClause} `;
    const order = assignedToAll
      ? `ORDER BY Owner.Name ASC, CreatedDate DESC`
      : `ORDER BY CreatedDate DESC`;
    return `${cols}FROM Case ${where}${order} LIMIT ${assignedToAll ? 200 : 50}`;
  };

  const attempts: Array<[boolean, boolean]> = [
    [true,  true ],
    [false, false],
  ];

  let lastError = "";
  for (const [withModifiedBy, withFollowUp] of attempts) {
    try {
      const result = await client.query<Record<string, unknown>>(buildSoql(withModifiedBy, withFollowUp));
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
    Id:                 r["Id"]              as string,
    CaseNumber:         r["CaseNumber"]       as string | null,
    Subject:            r["Subject"]          as string | null,
    Priority:           r["Priority"]         as string | null,
    Status:             r["Status"]           as string | null,
    CreatedDate:        r["CreatedDate"]       as string | null,
    LastModifiedDate:   r["LastModifiedDate"] as string | null,
    LastModifiedByName: lastModifiedBySupported ? (((r["LastModifiedBy"] as Record<string,unknown>|null)?.["Name"] as string|null) ?? null) : null,
    FollowUpDate:       followUpDateSupported   ? (r["FollowUpDate"] as string | null) : null,
    OwnerName:          ((r["Owner"]   as Record<string,unknown>|null)?.["Name"] as string|null) ?? null,
    ContactName:        ((r["Contact"] as Record<string,unknown>|null)?.["Name"] as string|null) ?? null,
    AccountName:        ((r["Account"] as Record<string,unknown>|null)?.["Name"] as string|null) ?? null,
  }));

  // Never cache this response — a newly synced case must appear immediately
  // on the next fetch without the browser serving a stale 304.
  res.set("Cache-Control", "no-store");
  return res.json({ cases, orgBaseUrl, followUpDateSupported });
});

// ── PATCH /sf/cases/:id/status ─────────────────────────────────────────────────

router.patch("/sf/cases/:id/status", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient> | null = null;
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
  if (!status || typeof status !== "string" || status.trim().length === 0 || status.length > 100) {
    return res.status(400).json({ error: "status is required." });
  }

  const sfUserId = req.session.sfUserId ?? null;
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  try {
    const owned = await client.query<{ Id: string }>(
      `SELECT Id FROM Case WHERE Id = '${id}' AND OwnerId = '${sfUserId}' AND IsDeleted = false LIMIT 1`,
    );
    if (owned.records.length === 0) {
      return res.status(404).json({ error: "Case not found." });
    }
    await client.updateRecord("Case", id, { Status: status });
    return res.json({ success: true, status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn({ caseId: id, status, sfUserId, err: msg }, "sf/cases status update failed");
    const validationMsg = extractSfValidationMessage(msg);
    if (validationMsg) {
      return res.status(422).json({ error: validationMsg });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── PATCH /sf/cases/:id ────────────────────────────────────────────────────────

router.patch("/sf/cases/:id", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient> | null = null;
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

  const sfUserId = req.session.sfUserId ?? null;
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  try {
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
    // Validation rules take priority — extract the org-admin message first so a
    // rule whose text happens to mention "FollowUpDate" isn't mistaken for a
    // missing-field error.
    const validationMsg = extractSfValidationMessage(msg);
    if (validationMsg) {
      return res.status(422).json({ error: validationMsg });
    }
    // Distinguish a genuinely unsupported / missing field from other errors.
    if (/No such column|INVALID_FIELD|field integrity exception/i.test(msg)) {
      return res.json({ success: false, fieldUnsupported: true });
    }
    return res.status(500).json({ error: msg });
  }
});

// ── POST /sf/cases/:id/comments ───────────────────────────────────────────────

router.post("/sf/cases/:id/comments", async (req, res) => {
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

  const sfUserId = req.session.sfUserId ?? null;
  if (!sfUserId) {
    return res.status(401).json({ error: "Salesforce user not found in session." });
  }

  const { body: commentBody } = (req.body ?? {}) as { body?: string };
  if (!commentBody || typeof commentBody !== "string" || !commentBody.trim()) {
    return res.status(400).json({ error: "comment body is required." });
  }

  try {
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

// ── GET /sf/cases/statuses ────────────────────────────────────────────────────
// Returns active Case Status values with their closure state.
//
// Source: CaseStatus sobject via SOQL — the ONLY place SF exposes IsClosed for
// each status value. The Case object describe's picklistValues do NOT carry a
// `closed` property, so using describe for this flag silently returns false for
// every custom terminal status (e.g. "Resolved").

router.get("/sf/cases/statuses", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }
  if (!client) return res.status(401).json({ error: "Not connected to Salesforce." });

  try {
    const result = await client.query<{ MasterLabel: string; IsClosed: boolean }>(
      `SELECT MasterLabel, IsClosed FROM CaseStatus WHERE IsActive = true ORDER BY SortOrder`
    );
    const statuses = result.records.map(r => ({
      value:  r.MasterLabel,
      closed: r.IsClosed,
    }));
    return res.json({ statuses });
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── GET /sf/cases/record-types ────────────────────────────────────────────────

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

router.get("/sf/cases/queues", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient> | null = null;
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

// ── POST /sf/cases/:caseId/attachments ────────────────────────────────────────
// Upload one or more files to a Salesforce Case as ContentVersion records.

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

// ── GET /api/cases/search/service-contracts ───────────────────────────────────
// Returns ServiceContract records whose Name matches the query string.
// Used by the SubmitCaseDrawer's Service Contract lookup field.

router.get("/cases/search/service-contracts", async (req, res) => {
  const q = ((req.query["q"] as string) ?? "").trim();
  if (q.length < 2) return res.json({ results: [] });

  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }
  if (!client) return res.status(503).json({ results: [] });

  // Strip single quotes to avoid SOQL injection; LIKE wildcards are safe.
  const safe = q.replace(/'/g, "");
  try {
    const result = await client.query<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM ServiceContract WHERE Name LIKE '%${safe}%' ORDER BY Name LIMIT 10`
    );
    return res.json({
      results: result.records.map(r => ({
        id:    r.Id,
        type:  "ServiceContract",
        label: r.Name,
      })),
    });
  } catch (e) {
    logger.warn({ err: e }, "ServiceContract search failed");
    return res.json({ results: [] });
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
    contactId, contactName, accountId, accountName,
    serviceContractId, serviceContractName,
    customFields,
  } = req.body as {
    recordTypeId?:       string; recordTypeName?: string;
    subject?:            string; description?:    string; priority?: string;
    ownerId?:            string; ownerName?:      string; ownerType?: string;
    contactId?:          string; contactName?:    string;
    accountId?:          string; accountName?:    string;
    serviceContractId?:  string; serviceContractName?: string;
    customFields?:       Record<string, unknown>;
  };

  if (!subject?.trim()) return res.status(400).json({ error: "subject is required." });

  // ── Obtain SF client early for authoritative record-type lookup ─────────────
  // Initialise here (before the local DB write) so we can verify the record
  // type name from Salesforce rather than trusting the client-supplied string.
  // This prevents a forged/omitted recordTypeName from bypassing GSC checks.
  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }

  // Resolve the authoritative record type name: query SF when a client and ID
  // are both present; fall back to the client-supplied name only when we have
  // no session (the case will be stored locally and cannot sync until the user
  // connects, at which point SF itself enforces required fields).
  // When connected to Salesforce, resolve the record type name authoritatively.
  // Fail closed: if the lookup errors or returns no row we refuse the request
  // rather than falling back to the client-supplied name (which could be forged).
  let resolvedRtName: string | null = null;
  if (client && recordTypeId) {
    // Strip non-alphanumeric chars from the ID to prevent SOQL injection.
    const safeId = recordTypeId.replace(/[^a-zA-Z0-9]/g, "");
    let rtRes: { records: Array<{ Name: string }> } | null = null;
    try {
      rtRes = await client.query<{ Name: string }>(
        `SELECT Name FROM RecordType WHERE Id = '${safeId}' LIMIT 1`
      );
    } catch (e) {
      logger.warn({ err: e }, "RecordType lookup failed during case submit");
      return res.status(503).json({ error: "Unable to verify record type. Please try again." });
    }
    if (!rtRes.records[0]) {
      return res.status(400).json({ error: "The selected record type was not found in Salesforce." });
    }
    resolvedRtName = rtRes.records[0].Name;
  } else if (!client && recordTypeName) {
    // No SF session — case will be saved locally only. Use the client-supplied
    // name for display purposes; SF itself enforces field requirements on sync.
    resolvedRtName = recordTypeName;
  }

  const isGscType = resolvedRtName?.includes("General Service Contract") ?? false;
  if (isGscType && !contactId) {
    return res.status(400).json({ error: "Contact is required for General Service Contract cases." });
  }
  if (isGscType && !serviceContractId) {
    return res.status(400).json({ error: "Service Contract is required for General Service Contract cases." });
  }

  // Build merged customFields, filtering underscore-prefixed helper keys at
  // construction time so they are never stored in the DB or sent to Salesforce.
  const mergedCustomFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(customFields ?? {})) {
    if (!k.startsWith("_")) mergedCustomFields[k] = v;
  }
  if (serviceContractId) {
    mergedCustomFields["ServiceContractId"] = serviceContractId;
  }

  // Build the fields to persist in the DB.  Underscore-prefixed keys are
  // Trail OS internals — they are stored for display purposes but never sent
  // to Salesforce (the SF sync loop skips them).
  const dbCustomFields: Record<string, unknown> = { ...mergedCustomFields };
  if (serviceContractName) {
    dbCustomFields["_serviceContractName"] = serviceContractName;
  }

  // 1. Insert local record (pending sync)
  const [local] = await db
    .insert(submittedCasesTable)
    .values({
      subject:        subject.trim(),
      description:    description?.trim() || null,
      priority:       priority ?? "Medium",
      status:         "New",
      recordTypeId:   recordTypeId   || null,
      recordTypeName: resolvedRtName || null,   // store the server-resolved name
      ownerId:        ownerId        || null,
      ownerName:      ownerName      || null,
      ownerType:      ownerType      || null,
      contactId:      contactId      || null,
      contactName:    contactName    || null,
      accountId:      accountId      || null,
      accountName:    accountName    || null,
      customFields:   Object.keys(dbCustomFields).length > 0 ? dbCustomFields : null,
      createdByEmail: userEmail,
      syncStatus:     "pending",
    })
    .returning();

  if (!local) return res.status(500).json({ error: "Failed to create local case record." });

  // 2. Attempt Salesforce sync (client already obtained above)
  if (!client) {
    return res.status(201).json({
      case: local, synced: false,
      message: "Case saved locally. Connect to Salesforce to sync.",
    });
  }

  const proxyFetch = getEffectiveSfFetch(req);
  const orgBaseUrl = proxyFetch ? await getOrgBaseUrl(proxyFetch) : "";

  try {
    const sfData: Record<string, unknown> = {
      Subject:  subject.trim(),
      Status:   "New",
      Priority: priority ?? "Medium",
      Origin:   "Web",
    };
    if (description?.trim())   sfData["Description"]      = description.trim();
    if (recordTypeId)          sfData["RecordTypeId"]      = recordTypeId;
    if (contactId)             sfData["ContactId"]         = contactId;
    if (accountId)             sfData["AccountId"]         = accountId;
    if (serviceContractId)     sfData["ServiceContractId"] = serviceContractId;
    sfData["OwnerId"] = ownerId || sfUserId || undefined;
    // Spread extra custom fields — underscore-prefixed keys are already absent
    // from mergedCustomFields (filtered at construction) and must not be sent
    // to Salesforce.
    for (const [k, v] of Object.entries(mergedCustomFields)) {
      if (!k.startsWith("_")) sfData[k] = v;
    }
    for (const k of Object.keys(sfData)) {
      if (sfData[k] === undefined) delete sfData[k];
    }

    const result = await client.createRecord("Case", sfData);

    // Fetch case number (best-effort).
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

    const sfCaseUrl = orgBaseUrl && result.id
      ? `${orgBaseUrl}/lightning/r/Case/${result.id}/view`
      : undefined;

    return res.status(201).json({
      case: updated ?? local, synced: true,
      sfCaseId: result.id, sfCaseNumber, sfCaseUrl,
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

// ── POST /api/cases/:id/retry ─────────────────────────────────────────────────
// Re-attempts a Salesforce sync for a locally-saved case that previously failed
// or is still pending.  Only the original submitter may retry their own case.
//
// Concurrency safety: we use a single atomic UPDATE that claims the row by
// transitioning it from an eligible status ('failed' | 'pending') to 'retrying'.
// If no row is returned, either another request claimed it first or the case is
// already synced — either way we return 409 and make no Salesforce call.  This
// prevents duplicate SF Case creation even when two tabs or requests race.

router.post("/cases/:id/retry", async (req, res) => {
  const userEmail = (req.session.googleEmail ?? req.session.sfEmail) || null;
  if (!userEmail) return res.status(401).json({ error: "Not signed in." });

  const localId = parseInt(req.params["id"] ?? "", 10);
  if (!Number.isFinite(localId)) {
    return res.status(400).json({ error: "Invalid case ID." });
  }

  // Need a live SF connection before we claim the row — no point locking it
  // only to immediately release because there is no session.
  let client: ReturnType<typeof getSalesforceClient> | null = null;
  try { client = getSalesforceClient(req); } catch { /* no SF session */ }
  if (!client) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account and try again." });
  }

  const sfUserId = req.session.sfUserId ?? null;

  // ── Atomic claim ──────────────────────────────────────────────────────────
  // Transition the row from an eligible status to 'retrying' in a single
  // UPDATE statement.  Postgres executes this atomically per row, so exactly
  // one concurrent caller will receive a returned row; all others get nothing.
  const [claimed] = await db
    .update(submittedCasesTable)
    .set({ syncStatus: "retrying", syncError: null, updatedAt: new Date() })
    .where(
      and(
        eq(submittedCasesTable.id, localId),
        eq(submittedCasesTable.createdByEmail, userEmail),
        inArray(submittedCasesTable.syncStatus, ["failed", "pending"]),
      )
    )
    .returning();

  if (!claimed) {
    // Either no such record, wrong owner, already synced, or another retry is
    // already in flight ('retrying').  All cases are safe to reject.
    const [existing] = await db
      .select({
        syncStatus:   submittedCasesTable.syncStatus,
        sfCaseId:     submittedCasesTable.sfCaseId,
        sfCaseNumber: submittedCasesTable.sfCaseNumber,
      })
      .from(submittedCasesTable)
      .where(and(
        eq(submittedCasesTable.id, localId),
        eq(submittedCasesTable.createdByEmail, userEmail),
      ))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Case not found." });
    if (existing.syncStatus === "synced") {
      return res.status(409).json({
        error: "Case is already synced.",
        sfCaseId:     existing.sfCaseId,
        sfCaseNumber: existing.sfCaseNumber,
      });
    }
    return res.status(409).json({ error: "A retry is already in progress for this case." });
  }

  // ── Salesforce write ──────────────────────────────────────────────────────
  const proxyFetch = getEffectiveSfFetch(req);
  const orgBaseUrl = proxyFetch ? await getOrgBaseUrl(proxyFetch) : "";

  try {
    const sfData: Record<string, unknown> = {
      Subject:  claimed.subject,
      Status:   claimed.status ?? "New",
      Priority: claimed.priority ?? "Medium",
      Origin:   "Web",
    };
    if (claimed.description)  sfData["Description"]  = claimed.description;
    if (claimed.recordTypeId) sfData["RecordTypeId"]  = claimed.recordTypeId;
    if (claimed.contactId)    sfData["ContactId"]     = claimed.contactId;
    if (claimed.accountId)    sfData["AccountId"]     = claimed.accountId;
    sfData["OwnerId"] = claimed.ownerId || sfUserId || undefined;
    if (claimed.customFields && typeof claimed.customFields === "object") {
      for (const [k, v] of Object.entries(claimed.customFields as Record<string, unknown>)) {
        // Skip underscore-prefixed helper keys — they are Trail OS internals and
        // are not valid Salesforce field names (Salesforce would reject them).
        if (!k.startsWith("_")) sfData[k] = v;
      }
    }
    for (const k of Object.keys(sfData)) {
      if (sfData[k] === undefined) delete sfData[k];
    }

    const result = await client.createRecord("Case", sfData);

    // Fetch case number (best-effort).
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
      .where(eq(submittedCasesTable.id, localId))
      .returning();

    const sfCaseUrl = orgBaseUrl && result.id
      ? `${orgBaseUrl}/lightning/r/Case/${result.id}/view`
      : undefined;

    return res.json({ case: updated ?? claimed, synced: true, sfCaseId: result.id, sfCaseNumber, sfCaseUrl });
  } catch (e: unknown) {
    const syncError = e instanceof Error ? e.message : String(e);
    logger.error({ err: syncError, localId }, "Retry: failed to sync case to Salesforce");

    const [updated] = await db
      .update(submittedCasesTable)
      .set({ syncStatus: "failed", syncError, updatedAt: new Date() })
      .where(eq(submittedCasesTable.id, localId))
      .returning();

    return res.status(502).json({ case: updated ?? claimed, synced: false, error: syncError });
  }
});

// ── POST /sf/cases/:id/ping-owner ─────────────────────────────────────────────
// Looks up the case owner's email in Salesforce, resolves their Slack user ID
// via users.lookupByEmail, and sends a status-check DM via the bot token.
// Returns { ok, ownerName, slackUserId } on success; 422 when the owner can't
// be resolved; 500 on Slack send failure.

router.post("/sf/cases/:id/ping-owner", async (req, res) => {
  const id            = req.params["id"] as string;
  const { caseNumber, subject } = req.body as { caseNumber?: string; subject?: string };

  // Validate Salesforce ID format (15 or 18 alphanumeric characters).
  if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(id)) {
    return res.status(400).json({ ok: false, error: "Invalid Salesforce case ID." });
  }

  const botToken = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  if (!botToken) {
    return res.status(400).json({ ok: false, error: "SLACK_BOT_TOKEN is not configured." });
  }

  // ── 1. Fetch the owner's email from Salesforce ──────────────────────────────
  let ownerEmail: string | null = null;
  let ownerName:  string | null = null;

  try {
    let sfClient: ReturnType<typeof getSalesforceClient> | null = null;
    try { sfClient = getSalesforceClient(req); } catch { /* no SF session */ }

    if (sfClient) {
      const result = await sfClient.query<Record<string, unknown>>(
        `SELECT Owner.Email, Owner.Name FROM Case WHERE Id = '${id}' LIMIT 1`,
      );
      const row   = result.records[0];
      const owner = row?.["Owner"] as Record<string, unknown> | null;
      ownerEmail  = (owner?.["Email"] as string | null) ?? null;
      ownerName   = (owner?.["Name"]  as string | null) ?? null;
    }
  } catch (e: unknown) {
    logger.warn({ err: e, caseId: id }, "ping-case-owner: SF email lookup failed");
  }

  if (!ownerEmail) {
    return res.status(422).json({
      ok:    false,
      error: "Could not resolve the owner's email from Salesforce.",
    });
  }

  const caseRef  = caseNumber ? `#${caseNumber}` : `(SF ID: ${id})`;
  const subj     = subject ?? "a Salesforce case";
  const firstName = ownerName ? ownerName.split(" ")[0] : null;
  const greeting  = firstName ? ` ${firstName}` : "";
  const message   =
    `👋 Hi${greeting}! Quick status check on Case ${caseRef}: *${subj}*. ` +
    `Can you share a brief update when you get a chance? Thanks!`;

  // ── 2. Resolve Slack user by email ─────────────────────────────────────────
  let slackUserId: string | null = null;
  try {
    const lookupUrl = new URL("https://slack.com/api/users.lookupByEmail");
    lookupUrl.searchParams.set("email", ownerEmail);
    const lookupRes  = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Bearer ${botToken}` },
    });
    const lookupData = await lookupRes.json() as { ok: boolean; user?: { id: string } };
    if (lookupData.ok && lookupData.user?.id) slackUserId = lookupData.user.id;
  } catch (e: unknown) {
    logger.warn({ ownerEmail, err: e }, "ping-case-owner: Slack user lookup failed");
  }

  if (!slackUserId) {
    const displayName = ownerName ?? ownerEmail;
    return res.status(422).json({
      ok:    false,
      error: `${displayName} was not found in Slack. They may not have a Slack account linked to that email.`,
    });
  }

  // ── 3. Open DM and send message ─────────────────────────────────────────────
  try {
    const openRes  = await fetch("https://slack.com/api/conversations.open", {
      method:  "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ users: slackUserId }),
    });
    const openData = await openRes.json() as { ok: boolean; channel?: { id: string } };

    if (!openData.ok || !openData.channel?.id) throw new Error("conversations.open failed");

    const postRes  = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({
        channel:      openData.channel.id,
        text:         message,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
    const postData = await postRes.json() as { ok: boolean; error?: string };

    if (!postData.ok) {
      const errMap: Record<string, string> = {
        missing_scope:    "Bot token is missing the chat:write scope — contact your admin to fix the Slack app permissions.",
        invalid_auth:     "Slack bot token is invalid or revoked — contact your admin.",
        not_in_channel:   "Bot is not a member of the DM channel. Try again or contact your admin.",
        channel_not_found: "DM channel was not found. Please try again.",
        is_archived:      "The conversation channel is archived.",
        rate_limited:     "Slack rate limit hit — please wait a moment and try again.",
      };
      const detail = errMap[postData.error ?? ""] ?? `Slack error: ${postData.error ?? "unknown"}`;
      logger.warn({ caseId: id, ownerEmail, slackError: postData.error }, "ping-case-owner: chat.postMessage failed");
      return res.status(500).json({ ok: false, error: detail });
    }

    logger.info({ caseId: id, ownerEmail, caseNumber }, "ping-case-owner: DM sent");
    return res.json({ ok: true, ownerName, slackUserId });
  } catch (e: unknown) {
    logger.warn({ ownerEmail, slackUserId, err: e }, "ping-case-owner: DM send failed");
    return res.status(500).json({ ok: false, error: "Failed to send Slack DM. Please try again." });
  }
});

export default router;
