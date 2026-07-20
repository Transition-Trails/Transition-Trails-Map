import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";
import type { ISalesforceClient } from "../lib/salesforceClient.js";
import { getEffectiveSfFetch } from "../lib/salesforceOAuth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const OBJECT = "TT_Session_Log__c";

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

  // Attempt the full field list; fall back to minimal if any field is missing
  let records: RawSessionLog[] = [];
  let totalSize = 0;

  try {
    const result = await client.query<RawSessionLog>(
      `SELECT Id, Name, Session_Type__c, Session_Date__c,
              Coach_Name__c, Learner_Name__c, Learner__c, Program__c,
              Duration_Minutes__c, Notes__c, Status__c, CreatedDate
       FROM ${OBJECT}
       ORDER BY Session_Date__c DESC NULLS LAST, CreatedDate DESC
       LIMIT ${limitParam}`
        .trim().replace(/\s+/g, " ")
    );
    records   = result.records;
    totalSize = result.totalSize;
  } catch (queryErr) {
    // Surface which fields are actually invalid
    const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
    logger.warn({ msg }, "Full session query failed — returning field error");
    res.status(422).json({ error: "SOQL query failed — some fields may not exist on TT_Session_Log__c", detail: msg });
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

router.post("/sessions", withClient(async (req, res, client) => {
  const body = req.body as CreateSessionBody;

  if (!body.sessionType || !body.sessionDate) {
    res.status(400).json({ error: "sessionType and sessionDate are required" });
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

  try {
    const result = await client.createRecord(OBJECT, sfFields);
    const id = result.id;
    logger.info({ id }, "Session log created in Salesforce");
    res.status(201).json({ id, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ msg }, "SF session create failed");
    res.status(422).json({ error: "Salesforce rejected the record", detail: msg });
  }
}));

export default router;
