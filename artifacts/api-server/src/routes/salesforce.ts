import { Router } from "express";
// Salesforce integration via Replit Connectors proxy (REST API, no jsforce)
// Connection: conn_salesforce_01KTVV2KV10ESH5DJE3871WY1E
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

type CheckStatus = "pass" | "fail" | "warning" | "skip";

interface Check {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  meta?: Record<string, unknown>;
}

function makeConnectors() {
  return new ReplitConnectors();
}

// Salesforce REST API via the Replit proxy — proxyFetch handles auth automatically
async function sfGet(proxyFetch: (url: string, init?: RequestInit) => Promise<Response>, path: string): Promise<Record<string, unknown>> {
  const res = await proxyFetch(`/services/data/v59.0${path}`, {
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

async function sfQuery(proxyFetch: (url: string, init?: RequestInit) => Promise<Response>, soql: string): Promise<{ totalSize: number; records: Record<string, unknown>[] }> {
  const encoded = encodeURIComponent(soql);
  const result = await sfGet(proxyFetch, `/query?q=${encoded}`);
  return {
    totalSize: (result["totalSize"] as number) ?? 0,
    records: (result["records"] as Record<string, unknown>[]) ?? [],
  };
}

// ── GET /salesforce/validate ──────────────────────────────────────────────────

router.get("/salesforce/validate", async (req, res) => {
  const start = Date.now();
  const checks: Check[] = [];

  // ── 1. Proxy init ──────────────────────────────────────────────────────────
  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    const connectors = makeConnectors();
    proxyFetch = connectors.createProxyFetch("salesforce");
    checks.push({ id: "proxy-init", category: "Connection", label: "Replit Connector proxy ready", status: "pass", detail: "Salesforce proxy fetch client initialised via Replit Connectors SDK." });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.push({ id: "proxy-init", category: "Connection", label: "Replit Connector proxy ready", status: "fail", detail: `Failed to init proxy: ${msg}` });
    return res.json({ checks, orgInfo: null, objects: [], npspDetected: false, identity: null, durationMs: Date.now() - start, timestamp: new Date().toISOString() });
  }

  // ── 2. Identity check ──────────────────────────────────────────────────────
  let identity: Record<string, unknown> | null = null;
  try {
    const me = await sfGet(proxyFetch, "/chatter/users/me");
    identity = {
      username: me["username"],
      displayName: me["displayName"] ?? me["name"],
      email: me["email"],
      userId: me["id"],
    };
    checks.push({
      id: "identity", category: "Auth", label: "Salesforce identity confirmed", status: "pass",
      detail: `Authenticated as ${identity["displayName"] ?? identity["username"]} (${identity["email"] ?? "no email"}).`,
      meta: { ...identity },
    });
  } catch {
    // Fall back to limits endpoint as identity probe
    try {
      const limits = await sfGet(proxyFetch, "/limits");
      const apiCalls = (limits["DailyApiRequests"] as { Remaining?: number; Max?: number } | undefined);
      checks.push({
        id: "identity", category: "Auth", label: "Salesforce API access confirmed", status: "pass",
        detail: `API access confirmed via /limits. Daily API calls remaining: ${apiCalls?.Remaining ?? "?"} / ${apiCalls?.Max ?? "?"}.`,
        meta: { dailyApiRemaining: apiCalls?.Remaining, dailyApiMax: apiCalls?.Max },
      });
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      checks.push({ id: "identity", category: "Auth", label: "Salesforce API access confirmed", status: "fail", detail: `API access failed: ${msg.slice(0, 200)}` });
    }
  }

  // ── 3. Org metadata ────────────────────────────────────────────────────────
  interface OrgInfo { name: string | null; id: string | null; edition: string | null; sandboxType: string | null; }
  let orgInfo: OrgInfo = { name: null, id: null, edition: null, sandboxType: null };
  try {
    const result = await sfQuery(proxyFetch, "SELECT Id, Name, OrganizationType, IsSandbox FROM Organization LIMIT 1");
    const org = result.records[0];
    if (org) {
      orgInfo = {
        name: String(org["Name"] ?? ""),
        id: String(org["Id"] ?? ""),
        edition: String(org["OrganizationType"] ?? ""),
        sandboxType: org["IsSandbox"] ? "sandbox" : "production",
      };
      checks.push({ id: "org-meta", category: "Org", label: "Organisation metadata", status: "pass", detail: `Org: ${orgInfo.name} (${orgInfo.edition}) — ${orgInfo.sandboxType}.`, meta: { ...orgInfo } });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.push({ id: "org-meta", category: "Org", label: "Organisation metadata", status: "warning", detail: `Could not query Organization: ${msg.slice(0, 150)}` });
  }

  // ── 4. Core object access ──────────────────────────────────────────────────
  const objectResults: { object: string; accessible: boolean; count: number; error?: string }[] = [];
  for (const obj of ["Contact", "Account"] as const) {
    try {
      const r = await sfQuery(proxyFetch, `SELECT COUNT() FROM ${obj}`);
      objectResults.push({ object: obj, accessible: true, count: r.totalSize });
      checks.push({ id: `obj-${obj.toLowerCase()}`, category: "Objects", label: `${obj} access`, status: "pass", detail: `${obj} queryable — ${r.totalSize} total records.`, meta: { count: r.totalSize } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      objectResults.push({ object: obj, accessible: false, count: 0, error: msg });
      checks.push({ id: `obj-${obj.toLowerCase()}`, category: "Objects", label: `${obj} access`, status: "warning", detail: `${obj}: ${msg.slice(0, 120)}` });
    }
  }

  // ── 5. NPSP detection ──────────────────────────────────────────────────────
  let npspDetected = false;
  const npspObjects = ["npsp__Program_Enrollment__c", "npe01__OppPayment__c", "npsp__Household_Account__c"] as const;
  for (const npspObj of npspObjects) {
    try {
      await sfQuery(proxyFetch, `SELECT COUNT() FROM ${npspObj}`);
      npspDetected = true;
      checks.push({ id: "npsp", category: "NPSP", label: "Nonprofit Success Pack detected", status: "pass", detail: `NPSP confirmed via ${npspObj}.`, meta: { detectedVia: npspObj } });
      break;
    } catch {
      // try next
    }
  }
  if (!npspDetected) {
    checks.push({ id: "npsp", category: "NPSP", label: "Nonprofit Success Pack detected", status: "warning", detail: "NPSP custom objects not found. Org may use Nonprofit Cloud or NPSP is not installed." });
  }

  // ── 6. Program__c (Trail OS custom object) ────────────────────────────────
  try {
    const r = await sfQuery(proxyFetch, "SELECT Id, Name FROM Program__c LIMIT 5");
    const names = r.records.map(p => String(p["Name"] ?? "")).filter(Boolean);
    checks.push({
      id: "program-object", category: "Trail OS", label: "Program__c object accessible", status: "pass",
      detail: `Program__c queryable — ${r.totalSize} records. Sample: ${names.join(", ") || "(none)"}`,
      meta: { count: r.totalSize, sample: r.records.map(p => ({ id: p["Id"], name: p["Name"] })) },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.push({ id: "program-object", category: "Trail OS", label: "Program__c object accessible", status: "warning", detail: `Program__c: ${msg.slice(0, 150)}` });
  }

  return res.json({
    checks,
    orgInfo,
    objects: objectResults,
    npspDetected,
    identity,
    durationMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
});

export default router;
