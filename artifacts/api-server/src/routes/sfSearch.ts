/**
 * Salesforce object search — GET /api/sf/search
 *
 * Searches across Case, Account, Task, and Opportunity records
 * using the current user's personal SF connection.
 *
 * Query params:
 *   q      — search term (min 2 chars)
 *   types  — comma-separated list of object types to search
 *            (case, account, task, opportunity). Defaults to all four.
 */

import { Router } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { logger } from "../lib/logger.js";

const router = Router();

interface SfSearchResult {
  id:       string;
  type:     "case" | "account" | "task" | "opportunity";
  name:     string;  // primary display label
  subtitle: string;  // secondary info (status, owner, etc.)
}

router.get("/sf/search", async (req, res) => {
  let client: ReturnType<typeof getSalesforceClient>;
  try {
    client = getSalesforceClient(req);
  } catch {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  const q     = ((req.query["q"] as string) ?? "").trim();
  const types = ((req.query["types"] as string) ?? "case,account,task,opportunity")
    .split(",").map(s => s.trim().toLowerCase());

  if (q.length < 2) {
    return res.json({ results: [] });
  }

  // Escape single quotes in the search term
  const safe = q.replace(/'/g, "\\'");

  const queries: Promise<SfSearchResult[]>[] = [];

  if (types.includes("case")) {
    queries.push(
      client.query<{ Id: string; CaseNumber: string; Subject: string; Status: string }>(
        `SELECT Id, CaseNumber, Subject, Status FROM Case
         WHERE (CaseNumber LIKE '%${safe}%' OR Subject LIKE '%${safe}%')
         AND IsClosed = false
         ORDER BY CreatedDate DESC LIMIT 5`
      ).then(r => r.records.map(rec => ({
        id:       rec.Id,
        type:     "case" as const,
        name:     rec.Subject ?? rec.CaseNumber,
        subtitle: `Case #${rec.CaseNumber} · ${rec.Status}`,
      }))).catch(() => [])
    );
  }

  if (types.includes("account")) {
    queries.push(
      client.query<{ Id: string; Name: string; Type: string }>(
        `SELECT Id, Name, Type FROM Account
         WHERE Name LIKE '%${safe}%'
         ORDER BY Name ASC LIMIT 5`
      ).then(r => r.records.map(rec => ({
        id:       rec.Id,
        type:     "account" as const,
        name:     rec.Name,
        subtitle: rec.Type ?? "Account",
      }))).catch(() => [])
    );
  }

  if (types.includes("task")) {
    queries.push(
      client.query<{ Id: string; Subject: string; Status: string; ActivityDate: string | null }>(
        `SELECT Id, Subject, Status, ActivityDate FROM Task
         WHERE Subject LIKE '%${safe}%'
         AND IsDeleted = false AND IsClosed = false
         ORDER BY CreatedDate DESC LIMIT 5`
      ).then(r => r.records.map(rec => ({
        id:       rec.Id,
        type:     "task" as const,
        name:     rec.Subject,
        subtitle: `${rec.Status}${rec.ActivityDate ? ` · Due ${rec.ActivityDate}` : ""}`,
      }))).catch(() => [])
    );
  }

  if (types.includes("opportunity")) {
    queries.push(
      client.query<{ Id: string; Name: string; StageName: string }>(
        `SELECT Id, Name, StageName FROM Opportunity
         WHERE Name LIKE '%${safe}%'
         AND IsClosed = false
         ORDER BY CloseDate ASC LIMIT 5`
      ).then(r => r.records.map(rec => ({
        id:       rec.Id,
        type:     "opportunity" as const,
        name:     rec.Name,
        subtitle: rec.StageName,
      }))).catch(() => [])
    );
  }

  try {
    const nested = await Promise.all(queries);
    const results = nested.flat();
    return res.json({ results });
  } catch (err) {
    logger.error({ err }, "SF search error");
    return res.status(500).json({ error: "Search failed." });
  }
});

export default router;
