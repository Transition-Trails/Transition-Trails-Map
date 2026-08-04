import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";
import type { ISalesforceClient } from "../lib/salesforceClient.js";
import { getEffectiveSfFetch } from "../lib/salesforceOAuth.js";
import { logger } from "../lib/logger.js";
import {
  recordSfWriteAttempt,
  recordSfWriteSuccess,
  recordSfWriteFailure,
} from "../lib/sfWriteHealth.js";
import {
  SF_SESSION_TYPES,
  SF_SESSION_STATUSES,
  type SfSessionType,
  type SfSessionStatus,
} from "../types/salesforce.js";

const router = Router();

const OBJECT = "TT_Session_Log__c";

// ── Field-set cache (describe once, reuse) ────────────────────────────────────

// All fields we'd like to SELECT, in preference order.
const DESIRED_FIELDS = [
  "Id", "Name", "Session_Type__c", "Session_Date__c",
  "Coach_Name__c", "Learner_Name__c", "Learner__c", "Program__c",
  "Duration_Minutes__c", "Notes__c", "Status__c", "CreatedDate",
];

interface SessionFieldSet {
  selectClause: string;   // comma-separated fields confirmed to exist
  present: Set<string>;   // quick membership test
  fetchedAt: number;
}

let sessionFieldCache: SessionFieldSet | null = null;
const SESSION_FIELD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

async function getSessionFieldSet(client: ISalesforceClient): Promise<SessionFieldSet | null> {
  const now = Date.now();
  if (sessionFieldCache && now - sessionFieldCache.fetchedAt < SESSION_FIELD_CACHE_TTL_MS) {
    return sessionFieldCache;
  }
  try {
    const result = await client.query<{ QualifiedApiName: string }>(
      `SELECT QualifiedApiName FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${OBJECT}' LIMIT 500`
    );
    const present = new Set(result.records.map(r => r.QualifiedApiName));
    const confirmed = DESIRED_FIELDS.filter(f => present.has(f));
    if (confirmed.length < 2) return null; // object likely missing
    sessionFieldCache = { selectClause: confirmed.join(", "), present, fetchedAt: now };
    return sessionFieldCache;
  } catch {
    return null;
  }
}

// ── withClient helper (same pattern as programs.ts) ───────────────────────────

type SfHandler = (req: Request, res: Response, client: ISalesforceClient) => Promise<void>;

function withClient(handler: SfHandler): RequestHandler {
  return async (req, res): Promise<void> => {
    let client: ISalesforceClient;
    try {
      client = getSalesforceClient(req);
    } catch {
      client = new ConnectorSalesforceClient();
    }
    try {
      await handler(req, res, client);
    } catch (err) {
      logger.error({ err }, "Session route error");
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  };
}

// ── GET /sessions/describe — real SF describe via OAuth fetch ─────────────────

router.get("/sessions/describe", async (req, res): Promise<void> => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) { res.status(503).json({ error: "No Salesforce token" }); return; }
  try {
    const sfRes = await proxyFetch(`/services/data/v62.0/sobjects/${OBJECT}/describe`, {
      headers: { Accept: "application/json" },
    });
    if (!sfRes.ok) { res.status(sfRes.status).json({ error: await sfRes.text() }); return; }
    const data = await sfRes.json() as Record<string, unknown>;
    const fields = (data["fields"] as Array<{ name: string; label: string; type: string }> ?? [])
      .map(f => ({ name: f.name, label: f.label, type: f.type }));
    res.json({ object: OBJECT, fields });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── GET /sessions ─────────────────────────────────────────────────────────────

interface RawSessionLog {
  Id: string;
  Name: string;
  Session_Type__c: string | null;
  Session_Date__c: string | null;
  Coach_Name__c: string | null;
  Learner_Name__c: string | null;
  Learner__c: string | null;
  Program__c: string | null;
  Duration_Minutes__c: number | null;
  Notes__c: string | null;
  Status__c: string | null;
  CreatedDate: string;
}

router.get("/sessions", withClient(async (req, res, client) => {
  const limitParam = Math.min(parseInt(String(req.query["limit"] ?? "50"), 10), 200);
  const learnerIdFilter = typeof req.query["learnerId"] === "string" ? req.query["learnerId"].trim() : null;

  // Describe the object first so we only SELECT fields that actually exist.
  const fieldSet = await getSessionFieldSet(client);
  if (!fieldSet) {
    // Object doesn't exist or describe failed — return empty rather than crashing.
    logger.warn("TT_Session_Log__c describe returned no usable fields; returning empty session list");
    res.json({ sessions: [], total: 0, warning: "TT_Session_Log__c not found or not accessible in this org" });
    return;
  }

  // Use Session_Date__c for ordering only if it exists in this org.
  const hasDate = fieldSet.present.has("Session_Date__c");
  const orderBy = hasDate
    ? "ORDER BY Session_Date__c DESC NULLS LAST, CreatedDate DESC"
    : "ORDER BY CreatedDate DESC";

  // Optional WHERE clause for learner filtering
  const whereClause = learnerIdFilter && fieldSet.present.has("Learner__c")
    ? `WHERE Learner__c = '${learnerIdFilter.replace(/'/g, "\\'")}'`
    : "";

  let records: RawSessionLog[] = [];
  let totalSize = 0;

  try {
    const result = await client.query<RawSessionLog>(
      `SELECT ${fieldSet.selectClause} FROM ${OBJECT} ${whereClause} ${orderBy} LIMIT ${limitParam}`
    );
    records   = result.records;
    totalSize = result.totalSize;
  } catch (queryErr) {
    const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
    logger.warn({ msg }, "Session query failed after field-set describe");
    res.status(502).json({ error: "Session query failed", detail: msg });
    return;
  }

  const sessions = records.map(r => ({
    id:              r.Id,
    name:            r.Name,
    sessionType:     r.Session_Type__c,
    sessionDate:     r.Session_Date__c,
    coachName:       r.Coach_Name__c,
    learnerName:     r.Learner_Name__c,
    learnerId:       r.Learner__c,
    program:         r.Program__c,
    durationMinutes: r.Duration_Minutes__c,
    notes:           r.Notes__c,
    status:          r.Status__c,
    createdDate:     r.CreatedDate,
  }));

  res.json({ sessions, total: totalSize });
}));

// ── POST /sessions ────────────────────────────────────────────────────────────

interface CreateSessionBody {
  sessionType: string;
  sessionDate: string;
  coachName?: string;
  learnerName?: string;
  learnerId?: string;
  program?: string;
  durationMinutes?: number;
  notes?: string;
  status?: string;
}

/**
 * Type-guard for Session_Type__c restricted picklist values.
 * If the SF org has different values, update SF_SESSION_TYPES in salesforce.ts
 * and confirm via GET /sessions/describe.
 */
function isValidSessionType(v: string): v is SfSessionType {
  return (SF_SESSION_TYPES as readonly string[]).includes(v);
}

/**
 * Type-guard for Status__c restricted picklist values.
 */
function isValidSessionStatus(v: string): v is SfSessionStatus {
  return (SF_SESSION_STATUSES as readonly string[]).includes(v);
}

router.post("/sessions", withClient(async (req, res, client) => {
  const body = req.body as CreateSessionBody;

  if (!body.sessionType || !body.sessionDate) {
    res.status(400).json({ error: "sessionType and sessionDate are required" });
    return;
  }

  // Guard against restricted-picklist rejections (same class of bug as Source__c "web").
  // If the org's picklist values differ from SF_SESSION_TYPES, update that array
  // rather than loosening this check — silent SF rejects are harder to debug than a 400.
  if (!isValidSessionType(body.sessionType)) {
    res.status(400).json({
      error: "Invalid sessionType",
      detail: `'${body.sessionType}' is not a permitted Session_Type__c value. Allowed: ${SF_SESSION_TYPES.join(", ")}. Verify via GET /sessions/describe.`,
    });
    return;
  }

  if (body.status && !isValidSessionStatus(body.status)) {
    res.status(400).json({
      error: "Invalid status",
      detail: `'${body.status}' is not a permitted Status__c value. Allowed: ${SF_SESSION_STATUSES.join(", ")}. Verify via GET /sessions/describe.`,
    });
    return;
  }

  const sfFields: Record<string, unknown> = {
    Session_Type__c: body.sessionType,
    Session_Date__c: body.sessionDate,
  };
  if (body.coachName)       sfFields["Coach_Name__c"]       = body.coachName;
  if (body.learnerName)     sfFields["Learner_Name__c"]     = body.learnerName;
  if (body.learnerId)       sfFields["Learner__c"]          = body.learnerId;
  if (body.program)         sfFields["Program__c"]          = body.program;
  if (body.durationMinutes) sfFields["Duration_Minutes__c"] = body.durationMinutes;
  if (body.notes)           sfFields["Notes__c"]            = body.notes;
  if (body.status)          sfFields["Status__c"]           = body.status;

  recordSfWriteAttempt();
  try {
    const result = await client.createRecord(OBJECT, sfFields);
    const id = result.id;
    recordSfWriteSuccess();
    logger.info({ id }, "Session log created in Salesforce");
    res.status(201).json({ id, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    recordSfWriteFailure(OBJECT, msg);
    logger.warn({ msg }, "SF session create failed");
    res.status(422).json({ error: "Salesforce rejected the record", detail: msg });
  }
}));

export default router;
