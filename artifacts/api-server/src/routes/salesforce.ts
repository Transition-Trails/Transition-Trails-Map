import { Router } from "express";
// Salesforce integration via Replit Connectors proxy (REST API, no jsforce)
// Connection: conn_salesforce_01KTVV2KV10ESH5DJE3871WY1E
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

// ── 5-minute in-memory cache ───────────────────────────────────────────────────
const opsCache = new Map<string, { data: unknown; ts: number }>();
const OPS_CACHE_TTL = 5 * 60 * 1000;

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

  // ── 6. PMM (Program Management Module) detection ──────────────────────────
  // PMM is a Salesforce managed package add-on for NPSP/Nonprofit Cloud.
  // All PMM objects live under the pmdm__ namespace.
  const PMM_OBJECTS: { api: string; label: string }[] = [
    { api: "pmdm__Program__c",              label: "Programs" },
    { api: "pmdm__ProgramEngagement__c",    label: "Program Engagements" },
    { api: "pmdm__ServiceDelivery__c",      label: "Service Deliveries" },
    { api: "pmdm__Service__c",              label: "Services" },
    { api: "pmdm__ProgramCohort__c",        label: "Program Cohorts" },
    { api: "pmdm__ServiceSchedule__c",      label: "Service Schedules" },
    { api: "pmdm__ServiceSession__c",       label: "Service Sessions" },
    { api: "pmdm__ServiceParticipant__c",   label: "Service Participants" },
  ];

  const pmmObjects: { object: string; label: string; accessible: boolean; count: number; error?: string }[] = [];
  let pmmDetected = false;

  await Promise.all(
    PMM_OBJECTS.map(async ({ api, label }) => {
      try {
        const r = await sfQuery(proxyFetch, `SELECT COUNT() FROM ${api}`);
        pmmObjects.push({ object: api, label, accessible: true, count: r.totalSize });
        pmmDetected = true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        pmmObjects.push({ object: api, label, accessible: false, count: 0, error: msg.slice(0, 120) });
      }
    })
  );

  // Sort: accessible first, then alphabetically
  pmmObjects.sort((a, b) => {
    if (a.accessible !== b.accessible) return a.accessible ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  if (pmmDetected) {
    const accessible = pmmObjects.filter(o => o.accessible);
    const totalRecords = accessible.reduce((s, o) => s + o.count, 0);
    checks.push({
      id: "pmm", category: "PMM", label: "Program Management Module detected",
      status: "pass",
      detail: `PMM installed — ${accessible.length}/${PMM_OBJECTS.length} objects accessible, ${totalRecords.toLocaleString()} total records across all PMM objects.`,
      meta: { objectsAccessible: accessible.length, objectsTotal: PMM_OBJECTS.length, totalRecords, objects: pmmObjects },
    });
  } else {
    checks.push({
      id: "pmm", category: "PMM", label: "Program Management Module detected",
      status: "warning",
      detail: "No pmdm__ objects found. PMM may not be installed, or the connected user lacks access.",
    });
  }

  return res.json({
    checks,
    orgInfo,
    objects: objectResults,
    npspDetected,
    pmmDetected,
    pmmObjects,
    identity,
    durationMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
});

// ── GET /salesforce/operations/summary ────────────────────────────────────────
// Live SOQL counts for Operations hub panels. 5-minute in-memory cache.

router.get("/salesforce/operations/summary", async (req, res) => {
  const CACHE_KEY = "ops-summary";
  const cached = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    proxyFetch = makeConnectors().createProxyFetch("salesforce");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(503).json({ error: "Salesforce connector unavailable", detail: msg });
  }

  // Run all SOQL counts in parallel — each wrapped so one failure doesn't abort others
  const safe = async (soql: string): Promise<number | null> => {
    try { return (await sfQuery(proxyFetch, soql)).totalSize; }
    catch { return null; }
  };

  const [
    progTotal, progActive, progPlanning,
    engTotal, engActive,
    sdLast30,
    casesOpen, casesHigh,
    contacts,
  ] = await Promise.all([
    safe("SELECT COUNT() FROM pmdm__Program__c"),
    safe("SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Active'"),
    safe("SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Planning'"),
    safe("SELECT COUNT() FROM pmdm__ProgramEngagement__c"),
    safe("SELECT COUNT() FROM pmdm__ProgramEngagement__c WHERE pmdm__Stage__c = 'Active'"),
    safe("SELECT COUNT() FROM pmdm__ServiceDelivery__c WHERE pmdm__DeliveryDate__c = LAST_N_DAYS:30"),
    safe("SELECT COUNT() FROM Case WHERE IsClosed = false"),
    safe("SELECT COUNT() FROM Case WHERE IsClosed = false AND Priority = 'High'"),
    safe("SELECT COUNT() FROM Contact"),
  ]);

  const data = {
    programs:          { total: progTotal,  active: progActive,  planning: progPlanning },
    engagements:       { total: engTotal,   active: engActive },
    serviceDeliveries: { last30Days: sdLast30 },
    cases:             { open: casesOpen,   highPriority: casesHigh },
    contacts:          { total: contacts },
    lastUpdated:       new Date().toISOString(),
    fromCache:         false,
    cacheAge:          0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/operations/cases ──────────────────────────────────────────
// Live open Cases from Salesforce for the Operations Demand tab. 5-min cache.

router.get("/salesforce/operations/cases", async (req, res) => {
  const CACHE_KEY = "ops-cases";
  const cached = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    proxyFetch = makeConnectors().createProxyFetch("salesforce");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(503).json({ error: "Salesforce connector unavailable", detail: msg });
  }

  const safeCount = async (soql: string): Promise<number | null> => {
    try { return (await sfQuery(proxyFetch, soql)).totalSize; }
    catch { return null; }
  };
  const safeRecords = async (soql: string): Promise<Record<string, unknown>[] | null> => {
    try { return (await sfQuery(proxyFetch, soql)).records; }
    catch { return null; }
  };

  const safeFirst = async (soql: string): Promise<Record<string, unknown> | null> => {
    try { const r = await sfQuery(proxyFetch, soql); return r.records[0] ?? null; }
    catch { return null; }
  };

  const [cases, totalOpen, highPriority, org] = await Promise.all([
    safeRecords(
      "SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate, Contact.Name, Account.Name FROM Case WHERE IsClosed = false ORDER BY Priority DESC, CreatedDate ASC LIMIT 25"
    ),
    safeCount("SELECT COUNT() FROM Case WHERE IsClosed = false"),
    safeCount("SELECT COUNT() FROM Case WHERE IsClosed = false AND Priority = 'High'"),
    safeFirst("SELECT InstanceName FROM Organization LIMIT 1"),
  ]);

  const instanceName = org ? String(org["InstanceName"] ?? "") : "";

  const data = {
    cases: cases ?? [],
    totalOpen,
    highPriority,
    instanceName,
    lastUpdated: new Date().toISOString(),
    fromCache: false,
    cacheAge: 0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/operations/programs ───────────────────────────────────────
// Live PMM program records for the Operations hub. 5-min cache.

router.get("/salesforce/operations/programs", async (req, res) => {
  const CACHE_KEY = "ops-programs";
  const cached = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    proxyFetch = makeConnectors().createProxyFetch("salesforce");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(503).json({ error: "Salesforce connector unavailable", detail: msg });
  }

  const safeCount = async (soql: string): Promise<number | null> => {
    try { return (await sfQuery(proxyFetch, soql)).totalSize; }
    catch { return null; }
  };
  const safeRecords = async (soql: string): Promise<Record<string, unknown>[] | null> => {
    try { return (await sfQuery(proxyFetch, soql)).records; }
    catch { return null; }
  };

  const [programs, total, active, planning] = await Promise.all([
    safeRecords(
      "SELECT Id, Name, pmdm__Status__c, pmdm__StartDate__c, pmdm__EndDate__c FROM pmdm__Program__c ORDER BY pmdm__Status__c, Name LIMIT 50"
    ),
    safeCount("SELECT COUNT() FROM pmdm__Program__c"),
    safeCount("SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Active'"),
    safeCount("SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Planning'"),
  ]);

  const data = {
    programs: programs ?? [],
    total,
    active,
    planning,
    lastUpdated: new Date().toISOString(),
    fromCache: false,
    cacheAge: 0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

export default router;
