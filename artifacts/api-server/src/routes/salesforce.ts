import { Router } from "express";
import type { Request, Response as ExpressResponse, RequestHandler } from "express";
import { getEffectiveSfFetch } from "../lib/salesforceOAuth.js";
import { SfPersistentCache } from "../lib/sfFileCache.js";
import { SF_API_VERSION } from "../lib/sfConstants.js";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";
import type { ISalesforceClient } from "../lib/salesforceClient.js";
import {
  getBuildItems,
  createBuildItem,
  getAutomations,
  TtAutomationFieldsNotProvisionedError,
  getClassroomNudges,
  createClassroomNudge,
} from "../lib/salesforceService.js";

const router = Router();

// ── Configuration ──────────────────────────────────────────────────────────────
// To upgrade the Salesforce REST API target, update SF_API_VERSION in
// src/lib/sfConstants.ts — the route file and probe scripts share that constant.
// Change SF_CONNECTOR_ID here when pointing the app at a different org
// (staging, sandbox, secondary production org, etc.) — no other code edit needed.
const SF_CONNECTOR_ID    = "conn_salesforce_01KTVV2KV10ESH5DJE3871WY1E"; // eslint-disable-line @typescript-eslint/no-unused-vars
const OPS_CACHE_TTL      = 5 * 60 * 1000;          // 5 min — ops counts
const PICKLIST_CACHE_TTL = 60 * 60 * 1000;         // 1 hr  — picklist describes

// ── Cache (file-backed, survives restarts) ─────────────────────────────────────
// Exported for test inspection only — do not mutate from outside this module.
export const opsCache = new SfPersistentCache();

/**
 * Flush all cache entries belonging to the given user and all "system" entries.
 * Call from salesforceAuth after a new user token is written to the session.
 */
export function flushSfCacheForUser(sfUserId?: string): void {
  for (const key of opsCache.keys()) {
    if (key.startsWith("system:") || (sfUserId && key.startsWith(`${sfUserId}:`))) {
      opsCache.delete(key);
    }
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

/** A count value with an explicit error reason — never silently null. */
export interface SfCount { value: number | null; error: string | null; }

type CheckStatus = "pass" | "fail" | "warning" | "skip";
interface Check {
  id: string; category: string; label: string;
  status: CheckStatus; detail: string; meta?: Record<string, unknown>;
}

// ── Low-level helpers ──────────────────────────────────────────────────────────

type SfFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Thrown when the Replit connector proxy returns 429 Too Many Requests.
 * Callers that want retry behaviour should catch this specifically; other
 * callers propagate it like any other error.
 */
class RateLimitError extends Error {
  readonly retryAfter: number; // seconds from Retry-After header
  constructor(retryAfter: number, detail: string) {
    super(`Rate limited — retry after ${retryAfter}s: ${detail}`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sfGet(proxyFetch: SfFetch, path: string): Promise<Record<string, unknown>> {
  const res = await proxyFetch(`/services/data/${SF_API_VERSION}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
      const text = await res.text().catch(() => '');
      throw new RateLimitError(retryAfter, text.slice(0, 100));
    }
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Like sfGet but retries once on RateLimitError, honouring the Retry-After header.
 * Used in validation probes where a stale result is worse than waiting a moment.
 */
async function sfGetWithRetry(
  proxyFetch: SfFetch,
  path: string,
  maxRetries = 1,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sfGet(proxyFetch, path);
    } catch (e) {
      if (e instanceof RateLimitError && attempt < maxRetries) {
        // In production: wait at least 12 s so the proxy's 10 s sliding window fully resets.
        // In test: honour the mock's Retry-After directly (mocks set it to 0 for instant retries).
        const sleepMs = process.env['NODE_ENV'] === 'test'
          ? e.retryAfter * 1000
          : Math.max(e.retryAfter * 1000, 12_000);
        await sleep(sleepMs);
        continue;
      }
      throw e;
    }
  }
  throw new Error('sfGetWithRetry: unreachable');
}

async function sfQuery(
  proxyFetch: SfFetch,
  soql: string
): Promise<{ totalSize: number; records: Record<string, unknown>[] }> {
  const encoded = encodeURIComponent(soql);
  const result  = await sfGet(proxyFetch, `/query?q=${encoded}`);
  return {
    totalSize: (result["totalSize"] as number) ?? 0,
    records:   (result["records"]   as Record<string, unknown>[]) ?? [],
  };
}

/** Count a SOQL result — returns value+error so callers can distinguish zero from failure. */
async function safeCount(proxyFetch: SfFetch, soql: string): Promise<SfCount> {
  try {
    const r = await sfQuery(proxyFetch, soql);
    return { value: r.totalSize, error: null };
  } catch (e: unknown) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Fetch records safely — returns rows + error so callers can distinguish empty from failure. */
async function safeRecords(
  proxyFetch: SfFetch,
  soql: string
): Promise<{ records: Record<string, unknown>[]; totalSize: number; error: string | null }> {
  try {
    const r = await sfQuery(proxyFetch, soql);
    return { records: r.records, totalSize: r.totalSize, error: null };
  } catch (e: unknown) {
    return { records: [], totalSize: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Picklist helpers ───────────────────────────────────────────────────────────

/**
 * Returned by getPicklistValues.  `error` is non-null when the describe call
 * failed; callers should distinguish this from an empty-but-successful result.
 */
export interface PicklistResult {
  values: string[];
  /** Non-null when the describe call itself failed (network error, 429, etc.). */
  error: string | null;
}

/**
 * Read the picklist values (in defined order) for a specific field.
 * Results are cached for PICKLIST_CACHE_TTL to avoid per-request describes.
 * On failure, logs a structured warning and returns { values: [], error: <message> }
 * so callers can distinguish a failed describe from a legitimately empty picklist.
 */
async function getPicklistValues(
  proxyFetch: SfFetch,
  cacheNs: string,
  objectApiName: string,
  fieldApiName: string
): Promise<PicklistResult> {
  const cacheKey = `${cacheNs}:picklist:${objectApiName}:${fieldApiName}`;
  const cached   = opsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < PICKLIST_CACHE_TTL) {
    return cached.data as PicklistResult;
  }
  try {
    const describe = await sfGet(proxyFetch, `/sobjects/${objectApiName}/describe`);
    const fields   = (describe["fields"] ?? []) as Record<string, unknown>[];
    const field    = fields.find(f => String(f["name"]) === fieldApiName);
    const values   = ((field?.["picklistValues"] ?? []) as Record<string, unknown>[])
      .filter(v => v["active"] !== false)
      .map(v => String(v["value"]));
    const result: PicklistResult = { values, error: null };
    opsCache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn(
      `[getPicklistValues] describe failed — object=${objectApiName} field=${fieldApiName} error=${message}`
    );
    // Do not cache failures so the next request retries the describe.
    return { values: [], error: message };
  }
}

/**
 * Describe an object and return all custom field API names.
 * Optionally filter out fields belonging to managed package namespaces.
 */
async function getCustomFields(
  proxyFetch: SfFetch,
  objectApiName: string,
  excludeNamespacePrefixes: string[] = []
): Promise<{ found: string[]; error: string | null; undetermined: boolean }> {
  try {
    // Use retry so a transient 429 doesn't produce a false "fields missing" report
    const describe = await sfGetWithRetry(proxyFetch, `/sobjects/${objectApiName}/describe`);
    const fields   = (describe["fields"] ?? []) as Record<string, unknown>[];
    const custom   = fields
      .filter(f => f["custom"] === true)
      .map(f => String(f["name"]))
      .filter(name => !excludeNamespacePrefixes.some(ns => name.startsWith(ns)));
    return { found: custom, error: null, undetermined: false };
  } catch (e: unknown) {
    return {
      found:        [],
      error:        e instanceof Error ? e.message : String(e),
      undetermined: e instanceof RateLimitError,
    };
  }
}

// Get the org base URL from the OAuth Identity endpoint (shared across handlers)
async function getOrgBaseUrl(proxyFetch: SfFetch): Promise<string> {
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

// ── TT custom object groups (FIRST) ───────────────────────────────────────────

const TT_CUSTOM_OBJECT_GROUPS = [
  {
    id: "penny",
    label: "Penny Objects",
    objects: [
      { api: "Penny_Trail_Config__c",        label: "Trail Config" },
      { api: "Penny_Interaction_Log__c",     label: "Interaction Log" },
      { api: "Penny_Quest_Submission__c",    label: "Quest Submission" },
      { api: "Penny_Career_Review__c",       label: "Career Review" },
      { api: "Penny_Weekly_Report__c",       label: "Weekly Report" },
      { api: "Penny_Badge__c",               label: "Badge" },
      { api: "Penny_Gamification__c",        label: "Gamification" },
      { api: "Penny_Classroom_Nudge__c",     label: "Classroom Nudge" },
    ],
  },
  {
    id: "curriculum",
    label: "Curriculum & Progress",
    objects: [
      { api: "Course__c",                          label: "Course" },
      { api: "Course_Module__c",                   label: "Course Module" },
      { api: "Course_Module_Activity__c",          label: "Course Module Activity" },
      { api: "Learner_Course_Module__c",           label: "Learner Course Module" },
      { api: "Learner_Course_Module_Activity__c",  label: "Learner Course Module Activity" },
    ],
  },
  {
    id: "governance",
    label: "Build Governance",
    objects: [
      { api: "TT_Build_Item__c",     label: "Build Item" },
      { api: "TT_Automation__c",     label: "Automation" },
      { api: "TT_SOP_Automation__c", label: "SOP Automation" },
      { api: "TT_SOP_Account__c",    label: "SOP Account" },
    ],
  },
] as const;

// ── Reused objects for custom field verification (FIRST — field check) ─────────

interface FieldCheckConfig {
  id: string;
  objectApi: string;
  label: string;
  description: string;
  requiredFields: string[];
  excludeNamespaces: string[];
  /**
   * When true, the describe is skipped entirely and the result is marked as
   * Phase 2 deferred. Use this when the required fields are documented but have
   * not yet been provisioned in the org — it prevents the entry from appearing
   * as a vacuous "0 fields, all required present" pass.
   */
  phase2Deferred?: boolean;
  /** The fields expected once this object is fully provisioned (documentation only). */
  phase2ExpectedFields?: string[];
}

const REUSED_OBJECT_FIELD_CHECKS: FieldCheckConfig[] = [
  {
    id: "contact-fields",
    objectApi: "Contact",
    label: "Contact",
    description: "Penny coaching + learner tracking fields added to the standard Contact object",
    requiredFields: [
      "Penny_Trail_Config__c", "Penny_Trail__c", "Penny_Coaching_Tone__c",
      "Penny_Confidence_Score__c", "Penny_Current_Goal__c", "Penny_Current_Phase__c",
      "Penny_Current_Blockers__c", "Penny_Sprint_Week__c", "Penny_Skill_Score__c",
      "Penny_Onboarding_Complete__c", "LMS_Learner_ID__c", "Last_Assessment_Date__c",
      "Coach__c", "Learner_Slack_User_Id__c", "TT_Academy_Connector_Token__c",
    ],
    excludeNamespaces: [
      "npe01__", "npo02__", "npsp__", "pmdm__",
      "GW_Volunteers__", "ClickSendSMS__", "jrsl_ul_",
    ],
  },
  {
    id: "program-fields",
    objectApi: "pmdm__Program__c",
    label: "Program (pmdm)",
    description: "Non-pmdm custom fields added to the PMM Program object by Transition Trails",
    requiredFields: [
      "Program_Manager__c", "Program_Goals__c", "Program_Structure__c",
      "Program_Target_Audience__c", "Program_Expected_Outcomes__c",
      "Problem_Statement__c", "Success_Metrics_Evaluation_Plan__c",
      "Google_Drive_Folder__c", "Canva_Folder__c",
      "Program_Reference_Link__c", "Requires_Payment__c",
    ],
    excludeNamespaces: ["pmdm__"],
  },
  {
    id: "engagement-fields",
    objectApi: "pmdm__ProgramEngagement__c",
    label: "Program Engagement (pmdm)",
    description: "Non-pmdm custom fields added to the PMM Program Engagement object",
    requiredFields: [],
    excludeNamespaces: ["pmdm__"],
  },
  {
    id: "knowledge-fields",
    objectApi: "Knowledge__kav",
    label: "Knowledge Articles",
    description: "Custom fields added to the standard Salesforce Knowledge article object",
    requiredFields: [],
    excludeNamespaces: [],
  },
  // ── Penny custom objects ────────────────────────────────────────────────────
  {
    id: "penny-trail-config-fields",
    objectApi: "Penny_Trail_Config__c",
    label: "Penny Trail Config",
    description: "Fields queried when loading a learner's trail configuration for Penny coaching",
    requiredFields: [
      "Trail_ID__c", "Penny_Role__c", "Tone__c",
      "Focal_Points__c", "Special_Instructions__c", "Is_Active__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-interaction-log-fields",
    objectApi: "Penny_Interaction_Log__c",
    label: "Penny Interaction Log",
    description: "Write-critical object — fields created on every Penny ask; Learner__c is required (not nillable)",
    requiredFields: [
      "Learner__c", "User_Message__c", "Penny_Response__c",
      "Prompt_Mode__c", "Source__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-quest-submission-fields",
    objectApi: "Penny_Quest_Submission__c",
    label: "Penny Quest Submission",
    description: "Fields queried when retrieving a learner's quest submission history",
    requiredFields: [
      "Learner__c", "Submission_Text__c", "Submitted_At__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-career-review-fields",
    objectApi: "Penny_Career_Review__c",
    label: "Penny Career Review",
    description: "Fields queried and written for learner career review records",
    requiredFields: [
      "Learner__c", "Area_Scores__c", "Feedback_JSON__c",
      "Readiness_Label__c", "Review_Mode__c", "Reviewed_At__c", "Target_Role__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-weekly-report-fields",
    objectApi: "Penny_Weekly_Report__c",
    label: "Penny Weekly Report",
    description: "Fields queried when loading weekly learner progress reports",
    requiredFields: [
      "Generated_At__c", "Top_Themes__c", "Support_Flags__c",
      "Suggested_Actions__c", "Trail_Breakdown__c", "Week_Start__c", "Week_End__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-badge-fields",
    objectApi: "Penny_Badge__c",
    label: "Penny Badge",
    description: "Fields queried when loading badges awarded to a learner",
    requiredFields: [
      "Learner__c", "Awarded_By__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-gamification-fields",
    objectApi: "Penny_Gamification__c",
    label: "Penny Gamification",
    description: "Fields queried when loading gamification points and sprint scores for a learner",
    requiredFields: [
      "Learner__c", "Points__c", "Sprint_Points__c", "Sprint_Number__c",
      "Reason__c", "Note__c", "Awarded_By__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "penny-classroom-nudge-fields",
    objectApi: "Penny_Classroom_Nudge__c",
    label: "Penny Classroom Nudge",
    description: "Classroom nudge records written when Penny sends a nudge to a learner during a session",
    // Verified against live org (Task #143): object has 4 custom fields.
    // Nudge_Type__c / Message__c / Status__c do not exist on org — removed.
    requiredFields: [
      "Course_Work_ID__c", "Learner__c", "Nudge_Date__c", "Sent_At__c",
    ],
    excludeNamespaces: [],
  },
  // ── Build Governance custom objects ────────────────────────────────────────
  {
    id: "tt-build-item-fields",
    objectApi: "TT_Build_Item__c",
    label: "TT Build Item",
    description: "Governance build item records queried and written by the Build Governance pipeline",
    // Verified against live org (Task #143): only 1 custom field present.
    // Status__c / Priority__c / Description__c / Assigned_To__c / Due_Date__c do not exist — removed.
    requiredFields: [
      "TT_Automation__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "tt-automation-fields",
    objectApi: "TT_Automation__c",
    label: "TT Automation",
    description: "Automation definition records queried when the governance layer resolves active automations",
    // Four required filter fields provisioned in the org.
    // Confirmed via probe-governance-fields.ts: Is_Active__c, Automation_Type__c,
    // Description__c, and Status__c all present on TT_Automation__c.
    requiredFields: [
      "Is_Active__c",
      "Automation_Type__c",
      "Description__c",
      "Status__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "tt-sop-automation-fields",
    objectApi: "TT_SOP_Automation__c",
    label: "TT SOP Automation",
    description: "Junction records linking SOP definitions to their associated automations",
    // Verified against live org (Task #143): TT_SOP__c / TT_Automation__c / Status__c do not exist.
    // Actual fields on org: Automation__c (reference), Knowledge_Article__c (reference).
    requiredFields: [
      "Automation__c", "Knowledge_Article__c",
    ],
    excludeNamespaces: [],
  },
  {
    id: "tt-sop-account-fields",
    objectApi: "TT_SOP_Account__c",
    label: "TT SOP Account",
    description: "Junction records linking SOP definitions to the accounts they govern",
    // Verified against live org (Task #143): TT_SOP__c / Status__c do not exist.
    // Actual fields on org: Account__c (reference), Knowledge_Article__c (reference).
    requiredFields: [
      "Account__c", "Knowledge_Article__c",
    ],
    excludeNamespaces: [],
  },
];

// ── GET /salesforce/validate ───────────────────────────────────────────────────

router.get("/salesforce/validate", async (req, res) => {
  const start   = Date.now();
  const checks: Check[] = [];

  // 1. Token resolution
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    checks.push({ id: "proxy-init", category: "Connection", label: "Salesforce credentials available", status: "fail", detail: "No Salesforce token found. Connect your account at /api/sf/login." });
    return res.status(401).json({ checks, orgInfo: null, objects: [], npspDetected: false, identity: null, durationMs: Date.now() - start, timestamp: new Date().toISOString() });
  }
  checks.push({ id: "proxy-init", category: "Connection", label: "Salesforce credentials available", status: "pass", detail: "Bearer token resolved (session, env, or connector)." });

  // 2. Identity check
  let identity: Record<string, unknown> | null = null;
  try {
    const me = await sfGet(proxyFetch, "/chatter/users/me");
    identity = { username: me["username"], displayName: me["displayName"] ?? me["name"], email: me["email"], userId: me["id"] };
    checks.push({ id: "identity", category: "Auth", label: "Salesforce identity confirmed", status: "pass", detail: `Authenticated as ${identity["displayName"] ?? identity["username"]} (${identity["email"] ?? "no email"}).`, meta: { ...identity } });
  } catch {
    try {
      const limits    = await sfGet(proxyFetch, "/limits");
      const apiCalls  = (limits["DailyApiRequests"] as { Remaining?: number; Max?: number } | undefined);
      checks.push({ id: "identity", category: "Auth", label: "Salesforce API access confirmed", status: "pass", detail: `API access confirmed via /limits. Daily API calls remaining: ${apiCalls?.Remaining ?? "?"} / ${apiCalls?.Max ?? "?"}.`, meta: { dailyApiRemaining: apiCalls?.Remaining, dailyApiMax: apiCalls?.Max } });
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      checks.push({ id: "identity", category: "Auth", label: "Salesforce API access confirmed", status: "fail", detail: `API access failed: ${msg.slice(0, 200)}` });
    }
  }

  // 3. Org metadata
  interface OrgInfo { name: string | null; id: string | null; edition: string | null; sandboxType: string | null; }
  let orgInfo: OrgInfo = { name: null, id: null, edition: null, sandboxType: null };
  try {
    const result = await sfQuery(proxyFetch, "SELECT Id, Name, OrganizationType, IsSandbox FROM Organization LIMIT 1");
    const org    = result.records[0];
    if (org) {
      orgInfo = { name: String(org["Name"] ?? ""), id: String(org["Id"] ?? ""), edition: String(org["OrganizationType"] ?? ""), sandboxType: org["IsSandbox"] ? "sandbox" : "production" };
      checks.push({ id: "org-meta", category: "Org", label: "Organisation metadata", status: "pass", detail: `Org: ${orgInfo.name} (${orgInfo.edition}) — ${orgInfo.sandboxType}.`, meta: { ...orgInfo } });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.push({ id: "org-meta", category: "Org", label: "Organisation metadata", status: "warning", detail: `Could not query Organization: ${msg.slice(0, 150)}` });
  }

  // 4. Core object access (Contact, Account)
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

  // 5. NPSP detection
  let npspDetected = false;
  const npspObjects = ["npsp__Program_Enrollment__c", "npe01__OppPayment__c", "npsp__Household_Account__c"] as const;
  for (const npspObj of npspObjects) {
    try {
      await sfQuery(proxyFetch, `SELECT COUNT() FROM ${npspObj}`);
      npspDetected = true;
      checks.push({ id: "npsp", category: "NPSP", label: "Nonprofit Success Pack detected", status: "pass", detail: `NPSP confirmed via ${npspObj}.`, meta: { detectedVia: npspObj } });
      break;
    } catch { /* try next */ }
  }
  if (!npspDetected) {
    checks.push({ id: "npsp", category: "NPSP", label: "Nonprofit Success Pack detected", status: "warning", detail: "NPSP custom objects not found. Org may use Nonprofit Cloud or NPSP is not installed." });
  }

  // 6. PMM (Program Management Module) detection
  const PMM_OBJECTS: { api: string; label: string }[] = [
    { api: "pmdm__Program__c",            label: "Programs" },
    { api: "pmdm__ProgramEngagement__c",  label: "Program Engagements" },
    { api: "pmdm__ServiceDelivery__c",    label: "Service Deliveries" },
    { api: "pmdm__Service__c",            label: "Services" },
    { api: "pmdm__ProgramCohort__c",      label: "Program Cohorts" },
    { api: "pmdm__ServiceSchedule__c",    label: "Service Schedules" },
    { api: "pmdm__ServiceSession__c",     label: "Service Sessions" },
    { api: "pmdm__ServiceParticipant__c", label: "Service Participants" },
  ];

  const pmmObjects: { object: string; label: string; accessible: boolean; count: number; error?: string }[] = [];
  let pmmDetected = false;

  // Probe PMM objects sequentially — parallel would fire 8 requests at once and
  // exhaust most of the proxy's 20-req/10s budget before TT probes even start.
  const PMM_DELAY_MS = process.env['NODE_ENV'] === 'test' ? 0 : 500;
  for (const { api, label } of PMM_OBJECTS) {
    try {
      const r = await sfQuery(proxyFetch, `SELECT COUNT() FROM ${api}`);
      pmmObjects.push({ object: api, label, accessible: true, count: r.totalSize });
      pmmDetected = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      pmmObjects.push({ object: api, label, accessible: false, count: 0, error: msg.slice(0, 120) });
    }
    await sleep(PMM_DELAY_MS);
  }
  pmmObjects.sort((a, b) => {
    if (a.accessible !== b.accessible) return a.accessible ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  if (pmmDetected) {
    const accessible   = pmmObjects.filter(o => o.accessible);
    const totalRecords = accessible.reduce((s, o) => s + o.count, 0);
    checks.push({ id: "pmm", category: "PMM", label: "Program Management Module detected", status: "pass", detail: `PMM installed — ${accessible.length}/${PMM_OBJECTS.length} objects accessible, ${totalRecords.toLocaleString()} total records across all PMM objects.`, meta: { objectsAccessible: accessible.length, objectsTotal: PMM_OBJECTS.length, totalRecords, objects: pmmObjects } });
  } else {
    checks.push({ id: "pmm", category: "PMM", label: "Program Management Module detected", status: "warning", detail: "No pmdm__ objects found. PMM may not be installed, or the connected user lacks access." });
  }

  // 7. TT custom objects — probed in sequential batches to stay within the
  //    Replit connector proxy rate limit (20 req / 10 s).
  //
  //    PRINCIPLE: a throttled probe (429) and a genuine absence are DIFFERENT.
  //      accessible: null  → undetermined (throttled after one retry)  — NOT a failure
  //      accessible: false → confirmed inaccessible (4xx object error) — real finding
  //      accessible: true  → confirmed accessible

  // Batch budget math (20 req / 10 s sliding window):
  //   ~14 requests fire before this point (identity, org, 2 objects, 1 NPSP, 8 PMM × 500ms each).
  //   With PROBE_BATCH_SIZE=3 and PROBE_BATCH_DELAY_MS=3000:
  //     batch 1 at ~t=4.5 s → window total ≤ 17  ✓
  //     batch 2 at ~t=7.5 s → window total ≤ 20  ✓ (early requests start dropping out)
  //     batch 3 at ~t=10.5 s → window total ≤ 17 ✓ (requests from t<0.5s are expired)
  //   0 ms / size=6 in test so the suite does not sleep.
  const PROBE_BATCH_SIZE     = process.env['NODE_ENV'] === 'test' ? 6 : 3;
  const PROBE_BATCH_DELAY_MS = process.env['NODE_ENV'] === 'test' ? 0 : 3_000;

  type TtObjectResult = {
    object: string; label: string;
    /** true = confirmed; false = confirmed inaccessible; null = undetermined (throttled) */
    accessible: boolean | null;
    count: number; error?: string;
  };
  type TtGroupResult = {
    id: string; label: string; objects: TtObjectResult[];
    accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number;
  };

  const probeObject = async (api: string, label: string): Promise<TtObjectResult> => {
    const encoded = encodeURIComponent(`SELECT COUNT() FROM ${api}`);
    try {
      const result = await sfGetWithRetry(proxyFetch, `/query?q=${encoded}`);
      return { object: api, label, accessible: true, count: (result["totalSize"] as number) ?? 0 };
    } catch (e: unknown) {
      if (e instanceof RateLimitError) {
        return { object: api, label, accessible: null, count: 0,
          error: `Rate limited — undetermined (Retry-After ${e.retryAfter}s)` };
      }
      const msg     = e instanceof Error ? e.message : String(e);
      const sfError = msg.match(/INVALID_TYPE|INVALID_FIELD|MALFORMED_QUERY|INSUFFICIENT_ACCESS|NOT_FOUND/)?.[0]
        ?? msg.slice(0, 80);
      return { object: api, label, accessible: false, count: 0, error: sfError };
    }
  };

  const ttGroupResults: TtGroupResult[] = [];

  for (const group of TT_CUSTOM_OBJECT_GROUPS) {
    const groupObjects: TtObjectResult[] = [];
    const objs = [...group.objects];

    for (let i = 0; i < objs.length; i += PROBE_BATCH_SIZE) {
      const batch   = objs.slice(i, i + PROBE_BATCH_SIZE);
      const results = await Promise.all(batch.map(({ api, label }) => probeObject(api, label)));
      groupObjects.push(...results);
      if (i + PROBE_BATCH_SIZE < objs.length) await sleep(PROBE_BATCH_DELAY_MS);
    }

    // Sort: confirmed inaccessible first (the real finding), then undetermined, then accessible
    groupObjects.sort((a, b) => {
      const rank = (o: TtObjectResult) => o.accessible === false ? 0 : o.accessible === null ? 1 : 2;
      return rank(a) - rank(b);
    });

    ttGroupResults.push({
      id: group.id, label: group.label, objects: groupObjects,
      accessibleCount:   groupObjects.filter(o => o.accessible === true).length,
      inaccessibleCount: groupObjects.filter(o => o.accessible === false).length,
      undeterminedCount: groupObjects.filter(o => o.accessible === null).length,
      totalCount:        group.objects.length,
    });
  }

  const ttTotalAccessible   = ttGroupResults.reduce((s, g) => s + g.accessibleCount,   0);
  const ttTotalInaccessible = ttGroupResults.reduce((s, g) => s + g.inaccessibleCount, 0);
  const ttTotalUndetermined = ttGroupResults.reduce((s, g) => s + g.undeterminedCount, 0);
  const ttTotalObjects      = ttGroupResults.reduce((s, g) => s + g.totalCount,        0);

  // Status is driven by confirmed inaccessible only — undetermined is not a failure
  const ttStatus: CheckStatus =
    ttTotalInaccessible > 0 ? "warning"
    : ttTotalUndetermined > 0 ? "warning"
    : "pass";

  let ttDetail = `${ttTotalAccessible}/${ttTotalObjects} TT custom objects confirmed accessible`;
  if (ttTotalInaccessible > 0) {
    const names = ttGroupResults.flatMap(g => g.objects.filter(o => o.accessible === false).map(o => o.label));
    ttDetail += `, ${ttTotalInaccessible} confirmed inaccessible: ${names.join(', ')}`;
  }
  if (ttTotalUndetermined > 0) {
    ttDetail += `, ${ttTotalUndetermined} undetermined (rate limited — rerun to confirm)`;
  }

  checks.push({
    id: "tt-custom-objects", category: "TT Objects", label: "Transition Trails custom objects",
    status: ttStatus, detail: ttDetail,
    meta: { groups: ttGroupResults },
  });

  // 8. Custom field verification on reused managed / standard objects.
  //
  //    PRINCIPLE: a throttled or errored describe is not evidence of absence.
  //    Only a successful describe that omits a field proves it is missing.
  //    Probed sequentially to avoid another rate-limit burst after the object probes.

  type FieldCheckResult = {
    id: string; object: string; label: string; description: string;
    ourFields: string[];
    requiredFieldsFound:   string[];
    requiredFieldsMissing: string[]; // always [] when describeError is non-null
    describeError:         string | null;
    describeUndetermined:  boolean;  // true = throttled; undetermined, not missing
    /**
     * True when the describe was intentionally skipped (e.g. phase2Deferred).
     * Callers must exclude rows where describeSkipped===true from "all describes
     * failed" detection — a skipped row has describeError:null by design, not
     * because the describe succeeded.
     */
    describeSkipped:       boolean;
    /** True when the object's required fields are documented but not yet provisioned. */
    phase2Deferred:        boolean;
    /** The fields expected once this object is fully provisioned (documentation only). */
    phase2ExpectedFields:  string[];
  };

  const customFieldResults: FieldCheckResult[] = [];
  const FIELD_CHECK_DELAY_MS = process.env['NODE_ENV'] === 'test' ? 0 : 400;

  for (const cfg of REUSED_OBJECT_FIELD_CHECKS) {
    // Phase-2-deferred objects skip the describe entirely — they are not yet
    // provisioned in the org, so running a describe would always return "missing"
    // and still wouldn't tell us anything useful.  The result is marked explicitly
    // so the UI can render a "Phase 2 deferred" label instead of a vacuous pass.
    if (cfg.phase2Deferred) {
      customFieldResults.push({
        id: cfg.id, object: cfg.objectApi, label: cfg.label, description: cfg.description,
        ourFields: [],
        requiredFieldsFound:  [],
        requiredFieldsMissing: [],
        describeError:         null,
        describeUndetermined:  false,
        // describeSkipped:true distinguishes "intentionally not attempted" from
        // "attempted and succeeded with no error".  Callers that detect the
        // "all describes failed" condition MUST filter out skipped rows first.
        describeSkipped:       true,
        phase2Deferred:        true,
        phase2ExpectedFields:  cfg.phase2ExpectedFields ?? [],
      });
      continue;
    }

    const { found, error, undetermined: isUndetermined } = await getCustomFields(
      proxyFetch, cfg.objectApi, cfg.excludeNamespaces,
    );
    const foundSet = new Set(found);
    customFieldResults.push({
      id: cfg.id, object: cfg.objectApi, label: cfg.label, description: cfg.description,
      ourFields: found,
      // Only infer presence / absence when the describe actually succeeded
      requiredFieldsFound:   error ? [] : cfg.requiredFields.filter(f =>  foundSet.has(f)),
      requiredFieldsMissing: error ? [] : cfg.requiredFields.filter(f => !foundSet.has(f)),
      describeError:         error,
      describeUndetermined:  isUndetermined,
      describeSkipped:       false,
      phase2Deferred:        false,
      phase2ExpectedFields:  [],
    });
    await sleep(FIELD_CHECK_DELAY_MS);
  }

  // An issue is only a confirmed-missing field on a non-deferred object.
  // Phase-2-deferred objects are intentionally unprovisioned and must not
  // block the overall check status.
  const fieldCheckIssues = customFieldResults.some(
    r => !r.phase2Deferred && !r.describeError && r.requiredFieldsMissing.length > 0,
  );
  checks.push({
    id: "custom-fields", category: "TT Fields", label: "Custom fields on reused objects",
    status: fieldCheckIssues ? "warning" : "pass",
    detail: customFieldResults
      .map(r => {
        if (r.phase2Deferred)       return `${r.label}: Phase 2 deferred — ${r.phase2ExpectedFields.length} fields not yet provisioned in org (${r.phase2ExpectedFields.join(", ")})`;
        if (r.describeUndetermined) return `${r.label}: describe rate-limited — undetermined`;
        if (r.describeError)        return `${r.label}: describe failed`;
        const missing = r.requiredFieldsMissing.length;
        return `${r.label}: ${r.ourFields.length} TT fields, ${missing ? `${missing} required missing` : "all required present"}`;
      })
      .join("; "),
    meta: { fieldChecks: customFieldResults },
  });

  return res.json({
    checks,
    orgInfo,
    objects:         objectResults,
    npspDetected,
    pmmDetected,
    pmmObjects,
    ttCustomObjects: {
      groups:            ttGroupResults,
      totalAccessible:   ttTotalAccessible,
      totalInaccessible: ttTotalInaccessible,
      totalUndetermined: ttTotalUndetermined,
      totalObjects:      ttTotalObjects,
    },
    customFieldChecks: customFieldResults,
    identity,
    durationMs: Date.now() - start,
    timestamp:  new Date().toISOString(),
  });
});

// ── GET /salesforce/org-url ────────────────────────────────────────────────────

router.get("/salesforce/org-url", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login.", orgBaseUrl: "" });
  }
  const cacheNs = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:org-url`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true });
  }
  const orgBaseUrl = await getOrgBaseUrl(proxyFetch);
  const data = { orgBaseUrl };
  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/operations/summary ────────────────────────────────────────
// Live SOQL counts for Operations hub panels.
// SECOND: safe() now returns SfCount — failure is explicit, never silently null.
// THIRD:  picklist values are read from the org; hardcoded strings reported when missing.

router.get("/salesforce/operations/summary", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const cacheNs = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:ops-summary`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  // Read picklist values so filtered queries use real org values
  const [programStatusResult, casePriorityResult] = await Promise.all([
    getPicklistValues(proxyFetch, cacheNs, "pmdm__Program__c", "pmdm__Status__c"),
    getPicklistValues(proxyFetch, cacheNs, "Case", "Priority"),
  ]);
  const programStatusValues = programStatusResult.values;
  const casePriorityValues  = casePriorityResult.values;

  // Determine which expected status values are actually present
  const statusExpected = ["Active", "Planning"];
  const statusMissing  = statusExpected.filter(v => !programStatusValues.includes(v));

  // Determine which priority value is used for "high priority" count
  // Priority is 'High' by convention; if the org uses a different first value, report it.
  const priorityExpected  = "High";
  const priorityAvailable = casePriorityValues.includes(priorityExpected) ? priorityExpected : (casePriorityValues[0] ?? null);

  // Run all counts in parallel.
  // If an expected picklist value is absent, return an explicit error rather than
  // running a query that succeeds with misleading zero results.
  // If the describe itself failed, surface the describe error on every affected count.
  const makeStatusError = (val: string) =>
    programStatusResult.error
      ? `Picklist describe failed for pmdm__Program__c.pmdm__Status__c: ${programStatusResult.error}`
      : statusMissing.includes(val)
        ? `Picklist value '${val}' not found in this org. Available: ${programStatusValues.join(", ") || "none"}`
        : null;

  const activeError   = makeStatusError("Active");
  const planningError = makeStatusError("Planning");

  const [
    progTotal, progActive, progPlanning,
    engTotal, engActive,
    sdLast30,
    casesOpen, casesHigh,
    contacts,
  ] = await Promise.all([
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c"),
    activeError  ? Promise.resolve<SfCount>({ value: null, error: activeError })
                 : safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Active'"),
    planningError? Promise.resolve<SfCount>({ value: null, error: planningError })
                 : safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Planning'"),
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__ProgramEngagement__c"),
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__ProgramEngagement__c WHERE pmdm__Stage__c = 'Active'"),
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__ServiceDelivery__c WHERE pmdm__DeliveryDate__c = LAST_N_DAYS:30"),
    safeCount(proxyFetch, "SELECT COUNT() FROM Case WHERE IsClosed = false"),
    priorityAvailable
      ? safeCount(proxyFetch, `SELECT COUNT() FROM Case WHERE IsClosed = false AND Priority = '${priorityAvailable}'`)
      : Promise.resolve<SfCount>({ value: null, error: "No Case Priority picklist values found in this org." }),
    safeCount(proxyFetch, "SELECT COUNT() FROM Contact"),
  ]);

  const data = {
    programs: {
      total:    progTotal,
      active:   progActive,
      planning: progPlanning,
      statusValuesFound:    programStatusValues,
      statusValuesMissing:  statusMissing,
      statusDescribeError:  programStatusResult.error,
    },
    engagements: {
      total:  engTotal,
      active: engActive,
    },
    serviceDeliveries: { last30Days: sdLast30 },
    cases: {
      open:                 casesOpen,
      highPriority:         casesHigh,
      priorityValuesFound:  casePriorityValues,
      priorityValueUsed:    priorityAvailable,
      priorityDescribeError: casePriorityResult.error,
    },
    contacts: { total: contacts },
    lastUpdated: new Date().toISOString(),
    fromCache:   false,
    cacheAge:    0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/operations/cases ──────────────────────────────────────────
// SECOND: errors are returned explicitly.
// THIRD:  Priority picklist read from org; expected value reported if missing.
// FOURTH: ORDER BY direction derived from picklist order (most urgent first).
//         isTruncated flag added when totalOpen > returned count.

router.get("/salesforce/operations/cases", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const cacheNs = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:ops-cases`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  // Read Priority picklist to determine correct sort order.
  // Salesforce ORDER BY on a picklist field sorts by the picklist-definition order,
  // not alphabetically. ASC = first picklist value first. We want most-urgent first,
  // which is the first value in the admin-defined picklist.
  const priorityResult    = await getPicklistValues(proxyFetch, cacheNs, "Case", "Priority");
  const priorityValues    = priorityResult.values;
  // "High" is the expected first (most urgent) value; verify it actually is first.
  const sortDirection     = "ASC";  // ASC = picklist order = most urgent first
  const priorityValueUsed = priorityValues.includes("High") ? "High"
    : priorityValues[0] ?? "High";

  const LIMIT = 25;

  const [casesResult, totalOpen, highPriority, orgBaseUrl] = await Promise.all([
    safeRecords(
      proxyFetch,
      `SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate, Contact.Name, Account.Name ` +
      `FROM Case WHERE IsClosed = false ORDER BY Priority ${sortDirection}, CreatedDate ASC LIMIT ${LIMIT}`
    ),
    safeCount(proxyFetch, "SELECT COUNT() FROM Case WHERE IsClosed = false"),
    priorityResult.error
      ? Promise.resolve<SfCount>({ value: null, error: `Picklist describe failed for Case.Priority: ${priorityResult.error}` })
      : priorityValueUsed
        ? safeCount(proxyFetch, `SELECT COUNT() FROM Case WHERE IsClosed = false AND Priority = '${priorityValueUsed}'`)
        : Promise.resolve<SfCount>({ value: null, error: "No Priority picklist values found." }),
    getOrgBaseUrl(proxyFetch),
  ]);

  const isTruncated   = (totalOpen.value ?? 0) > casesResult.records.length;
  const fetchError    = casesResult.error ?? totalOpen.error ?? highPriority.error ?? null;

  const data = {
    cases:                 casesResult.records,
    casesError:            casesResult.error,
    totalOpen:             totalOpen.value,
    totalOpenError:        totalOpen.error,
    highPriority:          highPriority.value,
    highPriorityError:     highPriority.error,
    priorityValuesFound:   priorityValues,
    priorityDescribeError: priorityResult.error,
    priorityValueUsed,
    sortDirection,
    isTruncated,
    limit:                 LIMIT,
    fetchError,
    orgBaseUrl,
    lastUpdated:           new Date().toISOString(),
    fromCache:             false,
    cacheAge:              0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/operations/programs ───────────────────────────────────────
// SECOND: count fields are SfCount — error reason included.
// THIRD:  pmdm__Status__c picklist read from org.
// FOURTH: isTruncated flag added when total > returned list.

router.get("/salesforce/operations/programs", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const cacheNs = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:ops-programs`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  const statusResult = await getPicklistValues(proxyFetch, cacheNs, "pmdm__Program__c", "pmdm__Status__c");
  const statusValues = statusResult.values;
  const makeStatusError = (val: string) =>
    statusResult.error
      ? `Picklist describe failed for pmdm__Program__c.pmdm__Status__c: ${statusResult.error}`
      : !statusValues.includes(val) && statusValues.length > 0
        ? `Picklist value '${val}' not in this org. Available: ${statusValues.join(", ")}`
        : null;

  const activeError   = makeStatusError("Active");
  const planningError = makeStatusError("Planning");

  const LIMIT = 50;

  const [programs, total, active, planning] = await Promise.all([
    safeRecords(
      proxyFetch,
      `SELECT Id, Name, pmdm__Status__c, pmdm__StartDate__c, pmdm__EndDate__c FROM pmdm__Program__c ORDER BY pmdm__Status__c, Name LIMIT ${LIMIT}`
    ),
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c"),
    activeError
      ? Promise.resolve<SfCount>({ value: null, error: activeError })
      : safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Active'"),
    planningError
      ? Promise.resolve<SfCount>({ value: null, error: planningError })
      : safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c WHERE pmdm__Status__c = 'Planning'"),
  ]);

  const isTruncated = (total.value ?? 0) > programs.records.length;

  const data = {
    programs:           programs.records,
    programsError:      programs.error,
    total,
    active,
    planning,
    statusValuesFound:  statusValues,
    statusDescribeError: statusResult.error,
    isTruncated,
    limit:              LIMIT,
    lastUpdated:        new Date().toISOString(),
    fromCache:          false,
    cacheAge:           0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/programs/list ─────────────────────────────────────────────
// Full pmdm__Program__c record list for the Programs workspace. 5-min cache.

router.get("/salesforce/programs/list", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const cacheNs   = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:programs-list`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true, cacheAge: Math.floor((Date.now() - cached.ts) / 1000) });
  }

  const LIMIT = 200;
  const [programs, total, orgBaseUrl] = await Promise.all([
    safeRecords(
      proxyFetch,
      "SELECT Id, Name, pmdm__Status__c, pmdm__StartDate__c, pmdm__EndDate__c, pmdm__Description__c, pmdm__ShortSummary__c, pmdm__TargetPopulation__c, pmdm__ProgramIssueArea__c, Program_Manager__c, Program_Goals__c, Program_Structure__c, Program_Target_Audience__c, Program_Expected_Outcomes__c, Problem_Statement__c, Success_Metrics_Evaluation_Plan__c, Risks_Assumptions__c, Budget_Resouces__c, Funding_Strategy__c, Implementation_Plan__c, Partnership_Opportunities__c, Google_Drive_Folder__c, Canva_Folder__c, Program_Reference_Link__c, Requires_Payment__c FROM pmdm__Program__c ORDER BY Name LIMIT " + LIMIT
    ),
    safeCount(proxyFetch, "SELECT COUNT() FROM pmdm__Program__c"),
    getOrgBaseUrl(proxyFetch),
  ]);

  const filtered  = programs.records.filter(p =>
    p["Name"] !== "TEST PROGRAM" && p["pmdm__Status__c"] !== "Canceled"
  );
  const isTruncated = (total.value ?? 0) > programs.records.length;

  const data = {
    programs:    filtered,
    total:       total.value,
    totalError:  total.error,
    isTruncated,
    limit:       LIMIT,
    orgBaseUrl,
    lastUpdated: new Date().toISOString(),
    fromCache:   false,
    cacheAge:    0,
  };

  opsCache.set(CACHE_KEY, { data, ts: Date.now() });
  return res.json(data);
});

// ── GET /salesforce/curriculum/by-program/:programName ────────────────────────

router.get("/salesforce/curriculum/by-program/:programName", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const raw       = decodeURIComponent(req.params.programName);
  const cacheNs   = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:curriculum-byprogram-${raw}`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true });
  }

  const words = raw
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/'/g, "''"));
  const likePattern = "%" + words.join("%") + "%";

  try {
    const result = await sfQuery(
      proxyFetch,
      `SELECT Id, Name, Course_Title__c, Status__c, Total_Modules__c FROM Course__c WHERE Name LIKE '${likePattern}' LIMIT 1`
    );
    const course = (result.records ?? [])[0] ?? null;
    const data   = { course, fromCache: false };
    opsCache.set(CACHE_KEY, { data, ts: Date.now() });
    return res.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: "SOQL failed", detail: msg });
  }
});

// ── GET /salesforce/curriculum/course/:courseId ────────────────────────────────

router.get("/salesforce/curriculum/course/:courseId", async (req, res) => {
  const courseId = req.params.courseId;
  if (!/^[a-zA-Z0-9]{15,18}$/.test(courseId)) {
    return res.status(400).json({ error: "Invalid Salesforce ID" });
  }
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce. Connect your account at /api/sf/login." });
  }
  const cacheNs   = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:curriculum-${courseId}`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true });
  }

  try {
    const [courseResult, modulesResult] = await Promise.all([
      sfQuery(proxyFetch, `SELECT Id, Name, Course_Title__c, Status__c, Estimated_Start_Date__c, Estimated_End_Date__c, Total_Modules__c, Overview__c, Learning_Goals__c, Structure__c, Google_Drive_Folder__c, Canva_Course_Folder__c FROM Course__c WHERE Id = '${courseId}' LIMIT 1`),
      sfQuery(proxyFetch, `SELECT Id, Name, Course__c, Order__c, Status__c, PercentCompleted__c FROM Course_Module__c WHERE Course__c = '${courseId}' ORDER BY Order__c ASC LIMIT 50`),
    ]);
    const course  = (courseResult.records  ?? [])[0] ?? null;
    const modules =  modulesResult.records ?? [];
    const data    = { course, modules, fromCache: false };
    opsCache.set(CACHE_KEY, { data, ts: Date.now() });
    return res.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: "SOQL failed", detail: msg });
  }
});

// ── GET /lms/courses ───────────────────────────────────────────────────────────

router.get("/lms/courses", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }
  const cacheNs   = req.session.sfUserId ?? "system";
  const CACHE_KEY = `${cacheNs}:lms-courses`;
  const cached    = opsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.ts < OPS_CACHE_TTL) {
    return res.json({ ...(cached.data as object), fromCache: true });
  }

  try {
    const coursesResult = await sfQuery(
      proxyFetch,
      "SELECT Id, Name, Course_Title__c, Status__c, Total_Modules__c, Estimated_Start_Date__c, Estimated_End_Date__c FROM Course__c ORDER BY Name ASC LIMIT 20"
    );
    const courses = coursesResult.records ?? [];

    const coursesWithModules = await Promise.all(
      courses.map(async (course) => {
        const courseId = String(course["Id"] ?? "");
        try {
          const modulesResult = await sfQuery(
            proxyFetch,
            `SELECT Id, Name, Course__c, Order__c, Status__c, PercentCompleted__c FROM Course_Module__c WHERE Course__c = '${courseId}' ORDER BY Order__c ASC LIMIT 50`
          );
          return { ...course, modules: modulesResult.records ?? [] };
        } catch {
          return { ...course, modules: [] as Record<string, unknown>[] };
        }
      })
    );

    const data = { courses: coursesWithModules };
    opsCache.set(CACHE_KEY, { data, ts: Date.now() });
    return res.json({ ...data, fromCache: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: "SOQL failed", detail: msg });
  }
});

// ── Governance & classroom nudge routes ───────────────────────────────────────
//
// These routes use ISalesforceClient (session or connector) rather than the raw
// proxyFetch pattern so they can share the typed service layer in salesforceService.ts.

type SfHandler = (req: Request, res: ExpressResponse, client: ISalesforceClient) => Promise<void>;

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
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  };
}

// GET /salesforce/governance/build-items
// Returns TT_Build_Item__c records (most recent first, limit 50).

router.get("/salesforce/governance/build-items", withClient(async (req, res, client) => {
  const limitParam = Number(req.query["limit"]) || 50;
  const limit = Math.min(Math.max(1, limitParam), 200);
  const items = await getBuildItems(client, limit);
  res.json({ items, total: items.length });
}));

// POST /salesforce/governance/build-items
// Creates a new TT_Build_Item__c record.
// Body: { name: string; automationId?: string }

router.post("/salesforce/governance/build-items", withClient(async (req, res, client) => {
  const { name, automationId } = req.body as { name?: unknown; automationId?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required and must be a non-empty string." });
    return;
  }
  const result = await createBuildItem(client, {
    name: name.trim(),
    automationId: typeof automationId === "string" ? automationId : undefined,
  });
  res.status(201).json(result);
}));

// GET /salesforce/governance/automations
// Returns active TT_Automation__c records.
//
// This route probes for the four required filter fields
// (Is_Active__c, Automation_Type__c, Description__c, Status__c) before issuing
// any SOQL.  If they are absent the route returns HTTP 503 with a clear error
// rather than executing an unfiltered query that would dump every automation
// record in the org.
//
// The probe uses the same getCustomFields helper used by the preflight validate
// endpoint, so this check is always live rather than relying on a cached result.
//
// All four fields have been confirmed provisioned on the org via
// probe-governance-fields.ts.  The runtime describe guard remains as a safety
// rail in case the org schema changes unexpectedly.

const TT_AUTOMATION_REQUIRED_FIELDS = [
  "Is_Active__c",
  "Automation_Type__c",
  "Description__c",
  "Status__c",
] as const;

router.get("/salesforce/governance/automations", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) {
    return res.status(401).json({ error: "Not connected to Salesforce." });
  }

  // Probe whether the four required filter fields are provisioned.
  const { found, error: describeError, undetermined } = await getCustomFields(
    proxyFetch,
    "TT_Automation__c",
  );

  if (undetermined) {
    // Rate-limited — cannot confirm field presence; refuse to query rather than
    // risk an unfiltered dump.
    return res.status(503).json({
      error: "TT_Automation__c field describe was rate-limited. Retry after a moment.",
      phase2Deferred: true,
    });
  }

  if (describeError) {
    return res.status(503).json({
      error: `TT_Automation__c describe failed: ${describeError}`,
      phase2Deferred: true,
    });
  }

  const missingFields = TT_AUTOMATION_REQUIRED_FIELDS.filter(f => !found.includes(f));
  if (missingFields.length > 0) {
    // Required filter fields are not provisioned — refuse to query unfiltered.
    // This is an explicit safety guard: without Is_Active__c (and the other
    // three fields) there is no way to restrict the SOQL result set, so every
    // TT_Automation__c record in the org would be returned.
    return res.status(503).json({
      error:
        `TT_Automation__c cannot be queried: required filter fields are not yet provisioned on the org ` +
        `(missing: ${missingFields.join(", ")}). ` +
        `Add the fields in SF Setup and re-run probe-governance-fields.ts before enabling this route.`,
      phase2Deferred: true,
      missingFields,
    });
  }

  // All four filter fields confirmed — safe to query with Is_Active__c = true.
  try {
    let client;
    try {
      client = getSalesforceClient(req);
    } catch {
      client = new ConnectorSalesforceClient();
    }
    const limitParam = Number(req.query["limit"]) || 50;
    const limit = Math.min(Math.max(1, limitParam), 200);
    const automations = await getAutomations(client, /* fieldsReady */ true, limit);
    return res.json({ automations, total: automations.length });
  } catch (err) {
    if (err instanceof TtAutomationFieldsNotProvisionedError) {
      // Should not reach here (we checked above), but guard anyway.
      return res.status(503).json({ error: err.message, phase2Deferred: true });
    }
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

// GET /salesforce/governance/classroom-nudges/:contactId
// Returns Penny_Classroom_Nudge__c records for a learner (most recent first, limit 25).

router.get("/salesforce/governance/classroom-nudges/:contactId", withClient(async (req, res, client) => {
  const contactId = String(req.params["contactId"] ?? "");
  if (!/^[a-zA-Z0-9]{15,18}$/.test(contactId)) {
    res.status(400).json({ error: "Invalid Salesforce Contact ID." });
    return;
  }
  const limitParam = Number(req.query["limit"]) || 25;
  const limit = Math.min(Math.max(1, limitParam), 100);
  const nudges = await getClassroomNudges(client, contactId, limit);
  res.json({ nudges, total: nudges.length });
}));

// POST /salesforce/governance/classroom-nudges
// Creates a new Penny_Classroom_Nudge__c record.
// Body: { contactId: string; courseWorkId: string; nudgeDate: string; sentAt: string }

router.post("/salesforce/governance/classroom-nudges", withClient(async (req, res, client) => {
  const { contactId, courseWorkId, nudgeDate, sentAt } =
    req.body as { contactId?: unknown; courseWorkId?: unknown; nudgeDate?: unknown; sentAt?: unknown };

  const missing = (["contactId", "courseWorkId", "nudgeDate", "sentAt"] as const).filter(
    k => typeof req.body[k] !== "string" || !(req.body[k] as string).trim()
  );
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}.` });
    return;
  }

  if (!/^[a-zA-Z0-9]{15,18}$/.test(String(contactId))) {
    res.status(400).json({ error: "contactId must be a valid Salesforce ID." });
    return;
  }

  const result = await createClassroomNudge(client, {
    contactId:   String(contactId),
    courseWorkId: String(courseWorkId),
    nudgeDate:   String(nudgeDate),
    sentAt:      String(sentAt),
  });
  res.status(201).json(result);
}));

// ── GET /salesforce/describe/:objectApiName ────────────────────────────────────

router.get("/salesforce/describe/:objectApiName", async (req, res) => {
  const proxyFetch = getEffectiveSfFetch(req);
  if (!proxyFetch) return res.status(401).json({ error: "Not connected to Salesforce." });
  const { objectApiName } = req.params;
  try {
    const describe = await sfGet(proxyFetch, `/sobjects/${objectApiName}/describe`);
    const fields = ((describe["fields"] ?? []) as Record<string, unknown>[]).map(f => ({
      name:       f["name"],
      label:      f["label"],
      type:       f["type"],
      length:     f["length"],
      nillable:   f["nillable"],
      custom:     f["custom"],
      referenceTo: f["referenceTo"],
    }));
    return res.json({ objectApiName, fields, totalFields: fields.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

export default router;
