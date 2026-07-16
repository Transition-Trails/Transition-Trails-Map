import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";
import type { ISalesforceClient } from "../lib/salesforceClient.js";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
    }
  };
}

// Validate Salesforce record IDs (15 or 18 alphanumeric chars).
function isSfId(id: string): boolean {
  return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(id);
}

// ── Programs ──────────────────────────────────────────────────────────────────

router.get("/programs", withClient(async (_req, res, client) => {
  const result = await client.query<{
    Id: string; Name: string; pmdm__Status__c: string | null;
    pmdm__StartDate__c: string | null; pmdm__EndDate__c: string | null;
    pmdm__ShortSummary__c: string | null;
  }>(
    "SELECT Id, Name, pmdm__Status__c, pmdm__StartDate__c, pmdm__EndDate__c, pmdm__ShortSummary__c " +
    "FROM pmdm__Program__c ORDER BY Name ASC LIMIT 100"
  );
  res.json({ programs: result.records, total: result.totalSize });
}));

router.get("/programs/:id", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const record = await client.getRecord<Record<string, unknown>>("pmdm__Program__c", id, [
    "Id","Name","pmdm__Status__c","pmdm__Description__c","pmdm__StartDate__c","pmdm__EndDate__c",
    "pmdm__ShortSummary__c","pmdm__TargetPopulation__c","Program_Goals__c","Program_Structure__c",
    "Problem_Statement__c","Program_Expected_Outcomes__c","Implementation_Plan__c",
    "Budget_Resouces__c","Funding_Strategy__c","Partnership_Opportunities__c",
    "Risks_Assumptions__c","Success_Metrics_Evaluation_Plan__c","Program_Target_Audience__c",
    "Program_Manager__c","Google_Drive_Folder__c","Canva_Folder__c","Requires_Payment__c",
  ]);
  res.json({ program: record });
}));

router.post("/programs", withClient(async (req, res, client) => {
  const body = req.body as Record<string, unknown>;
  if (!body["Name"]) { res.status(400).json({ error: "Name is required" }); return; }
  const result = await client.createRecord("pmdm__Program__c", body);
  res.status(201).json({ id: result.id, success: result.success });
}));

router.patch("/programs/:id", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await client.updateRecord("pmdm__Program__c", id, req.body as Record<string, unknown>);
  res.json({ success: true });
}));

// ── Cohorts ───────────────────────────────────────────────────────────────────

router.get("/programs/:id/cohorts", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const result = await client.query<Record<string, unknown>>(
    "SELECT Id, Name, pmdm__Status__c, pmdm__StartDate__c, pmdm__EndDate__c, " +
    `Cohort_Capacity__c, pmdm__Description__c FROM pmdm__ProgramCohort__c WHERE pmdm__Program__c = '${id}' ` +
    "ORDER BY Name ASC LIMIT 50"
  );
  res.json({ cohorts: result.records, total: result.totalSize });
}));

router.post("/programs/:id/cohorts", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const body = req.body as Record<string, unknown>;
  if (!body["Name"]) { res.status(400).json({ error: "Name is required" }); return; }
  const result = await client.createRecord("pmdm__ProgramCohort__c", { ...body, pmdm__Program__c: id });
  res.status(201).json({ id: result.id, success: result.success });
}));

router.patch("/cohorts/:id", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await client.updateRecord("pmdm__ProgramCohort__c", id, req.body as Record<string, unknown>);
  res.json({ success: true });
}));

// ── Courses ───────────────────────────────────────────────────────────────────

router.get("/programs/:id/courses", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  // Course__c.Program__c is a picklist matching by program name — resolve name first
  const prog = await client.query<{ Id: string; Name: string }>(
    `SELECT Id, Name FROM pmdm__Program__c WHERE Id = '${id}' LIMIT 1`
  );
  const programName = prog.records[0]?.Name ?? "";
  const safeProgName = programName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const soql = programName
    ? `SELECT Id, Name, Course_Title__c, Status__c, Program__c, Overview__c, Learning_Goals__c, ` +
      `Estimated_Start_Date__c, Estimated_End_Date__c FROM Course__c WHERE Program__c = '${safeProgName}' ORDER BY Name ASC LIMIT 50`
    : "SELECT Id, Name, Course_Title__c, Status__c, Program__c, Overview__c, Learning_Goals__c, " +
      "Estimated_Start_Date__c, Estimated_End_Date__c FROM Course__c ORDER BY Name ASC LIMIT 50";
  const result = await client.query<Record<string, unknown>>(soql);
  res.json({ courses: result.records, total: result.totalSize });
}));

router.post("/courses", withClient(async (req, res, client) => {
  const body = req.body as Record<string, unknown>;
  if (!body["Name"]) { res.status(400).json({ error: "Name is required" }); return; }
  const result = await client.createRecord("Course__c", body);
  res.status(201).json({ id: result.id, success: result.success });
}));

router.patch("/courses/:id", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await client.updateRecord("Course__c", id, req.body as Record<string, unknown>);
  res.json({ success: true });
}));

// ── Modules ───────────────────────────────────────────────────────────────────

router.get("/courses/:id/modules", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const result = await client.query<Record<string, unknown>>(
    "SELECT Id, Name, Mission_Brief__c, Core_Concepts__c, Trail_Tools__c, Reflection_Prompt__c, " +
    `Trail_Talk_Prompts__c, Order__c, Status__c FROM Course_Module__c WHERE Course__c = '${id}' ` +
    "ORDER BY Order__c ASC NULLS LAST, Name ASC LIMIT 50"
  );
  res.json({ modules: result.records, total: result.totalSize });
}));

router.post("/courses/:id/modules", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const body = req.body as Record<string, unknown>;
  if (!body["Name"]) { res.status(400).json({ error: "Name is required" }); return; }
  const result = await client.createRecord("Course_Module__c", { ...body, Course__c: id });
  res.status(201).json({ id: result.id, success: result.success });
}));

router.patch("/modules/:id", withClient(async (req, res, client) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await client.updateRecord("Course_Module__c", id, req.body as Record<string, unknown>);
  res.json({ success: true });
}));

// ── Agentforce — Program context invoke ───────────────────────────────────────

router.post("/programs/:id/agentforce", async (req, res) => {
  const { id } = req.params as { id: string };
  if (!id || !isSfId(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const agentId = process.env["AGENTFORCE_AGENT_ID"] ?? process.env["AGENTFORCE_API_KEY"];
  if (!agentId) {
    res.status(503).json({ error: "Agentforce not configured — set AGENTFORCE_AGENT_ID" });
    return;
  }

  const { message, programContext } = req.body as {
    message?: string;
    programContext?: Record<string, unknown>;
  };

  const userMessage =
    message ??
    `Review and help configure program with Salesforce ID ${id}. ` +
    `Program context: ${JSON.stringify(programContext ?? {})}`;

  try {
    const connectors = new ReplitConnectors();
    const proxyFetch = connectors.createProxyFetch("salesforce");

    // Create session
    const sessionResp = await proxyFetch(`/einstein/ai-assist/v1/agents/${agentId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        externalSessionKey: `prog-config-${id}-${Date.now()}`,
        instanceConfig: { endpoint: process.env["AGENTFORCE_API_URL"] ?? "" },
        streamingCapabilities: { chunkTypes: ["Text"] },
        bypassUser: true,
      }),
    });
    const sessionData = await sessionResp.json() as { sessionId?: string; id?: string; error?: string };
    const sessionId = sessionData.sessionId ?? sessionData.id;
    if (!sessionId) {
      res.status(502).json({ error: "Failed to create Agentforce session", detail: sessionData });
      return;
    }

    // Send message
    const msgResp = await proxyFetch(
      `/einstein/ai-assist/v1/agents/${agentId}/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { role: "user", content: [{ type: "text", text: userMessage }] },
          variables: [{ name: "programId", type: "Text", value: id }],
        }),
      }
    );
    const msgData = await msgResp.json() as { messages?: { type?: string; text?: string }[] };
    const reply =
      msgData.messages?.find(m => m.type === "Text")?.text ?? "No response from Agentforce.";

    // Close session
    await proxyFetch(`/einstein/ai-assist/v1/agents/${agentId}/sessions/${sessionId}`, {
      method: "DELETE",
    }).catch(() => undefined);

    res.json({ reply, sessionId });
  } catch (err) {
    logger.error({ err }, "Agentforce program invocation failed");
    res.status(502).json({ error: err instanceof Error ? err.message : "Agentforce call failed" });
  }
});

export default router;
