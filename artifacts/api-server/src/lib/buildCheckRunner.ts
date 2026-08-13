/**
 * buildCheckRunner.ts
 *
 * Stateless check runner for build-check assessment items.
 * Each exported function runs one verification type against the learner's
 * connected Salesforce org and returns { passed, detail }.
 *
 * No DB writes — the caller (verify route) collects results and the
 * respond route stores them as rubric_scores on the response record.
 */

import { SF_API_VERSION } from "./sfConstants.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CheckMethod = "describe" | "soql" | "tooling" | "audit";

/** An object-level or field-level existence check via SObject describe. */
export interface DescribeCheckConfig {
  method:    "describe";
  objectApi: string;
  /** When provided, also checks that this field exists on the object. */
  fieldApi?: string;
  }

/** A SOQL query that must return at least one (or a bounded range of) records. */
export interface SoqlCheckConfig {
  method:          "soql";
  query:           string;
  /** Minimum number of records expected (default 1). */
  expectMinCount?: number;
  /** Maximum number of records allowed (omit = no upper bound). */
  expectMaxCount?: number;
}

/** A Tooling API SOQL query (sent to /tooling/query). */
export interface ToolingCheckConfig {
  method:          "tooling";
  query:           string;
  /** Minimum record count expected (default 1). Ignored when expectFieldValue is set. */
  expectMinCount?: number;
  /**
   * When set, asserts that the first record's named field equals the given value.
   * Use this for metadata checks where the API returns a single record with a
   * specific field you want to match (e.g. EntityDefinition.DefaultSharingAccess).
   */
  expectFieldValue?: { field: string; value: string };
}

/** A SetupAuditTrail query — looks for a matching action within a time window. */
export interface AuditCheckConfig {
  method:       "audit";
  /** Substring to match in the SetupAuditTrail Action field (case-insensitive). */
  action:       string;
  /** Substring to match in the Section field (case-insensitive). Optional. */
  section?:     string;
  /** How many hours back to look (default 24). */
  withinHours?: number;
}

export type CheckConfig =
  | DescribeCheckConfig
  | SoqlCheckConfig
  | ToolingCheckConfig
  | AuditCheckConfig;

export interface VerificationCriterion {
  id:          string;
  label:       string;
  method:      CheckMethod;
  description: string;
  checkConfig: CheckConfig;
}

export interface BuildCheckRubric {
  /** Numbered steps shown to the learner before they build. */
  steps:                string[];
  verificationCriteria: VerificationCriterion[];
}

export interface CheckResult {
  id:     string;
  passed: boolean;
  /** Plain English — shown to the learner when a criterion fails. */
  detail: string;
  method: CheckMethod;
}

// ── Internal ───────────────────────────────────────────────────────────────────

type SfFetch = (url: string, init?: RequestInit) => Promise<Response>;

async function sfJson<T = Record<string, unknown>>(
  sfFetch: SfFetch,
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  try {
    const res = await sfFetch(path, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      return { ok: false, status: res.status, text: text.slice(0, 300) };
    }
    const data = await res.json() as T;
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, status: 0, text: String(e).slice(0, 300) };
  }
}

// ── Check runners ──────────────────────────────────────────────────────────────

async function runDescribeCheck(
  sfFetch: SfFetch,
  cfg: DescribeCheckConfig,
  criterion: VerificationCriterion,
): Promise<CheckResult> {
  const base = `${criterion.label}`;
  const r = await sfJson<{ fields?: { name: string }[]; sharingModel?: string }>(
    sfFetch,
    `/services/data/${SF_API_VERSION}/sobjects/${cfg.objectApi}/describe`,
  );

  if (!r.ok) {
    const notFound = r.status === 404 || r.status === 400;
    return {
      id:     criterion.id,
      passed: false,
      detail: notFound
        ? `${base} — the object '${cfg.objectApi}' was not found in your org. Make sure you created it with the exact API name shown.`
        : `${base} — could not read the object (${r.text.slice(0, 120)}).`,
      method: "describe",
    };
  }

  if (cfg.fieldApi) {
    const hasField = (r.data.fields ?? []).some(f => f.name === cfg.fieldApi);
    return {
      id:     criterion.id,
      passed: hasField,
      detail: hasField
        ? `${base} — field '${cfg.fieldApi}' confirmed on '${cfg.objectApi}'.`
        : `${base} — field '${cfg.fieldApi}' was not found on '${cfg.objectApi}'. Check the API name and save the field.`,
      method: "describe",
    };
  }

  return {
    id:     criterion.id,
    passed: true,
    detail: `${base} — object '${cfg.objectApi}' confirmed in your org.`,
    method: "describe",
  };
}

async function runSoqlCheck(
  sfFetch: SfFetch,
  cfg: SoqlCheckConfig,
  criterion: VerificationCriterion,
): Promise<CheckResult> {
  const minCount = cfg.expectMinCount ?? 1;
  const encoded = encodeURIComponent(cfg.query);
  const r = await sfJson<{ totalSize?: number; records?: unknown[] }>(
    sfFetch,
    `/services/data/${SF_API_VERSION}/query?q=${encoded}`,
  );

  if (!r.ok) {
    return {
      id:     criterion.id,
      passed: false,
      detail: `${criterion.label} — query failed (${r.text.slice(0, 120)}). Make sure your org has the right object access.`,
      method: "soql",
    };
  }

  const count = r.data.totalSize ?? 0;
  const meetsMin = count >= minCount;
  const meetsMax = cfg.expectMaxCount == null || count <= cfg.expectMaxCount;
  const passed = meetsMin && meetsMax;

  return {
    id:     criterion.id,
    passed,
    detail: passed
      ? `${criterion.label} — ${count} matching record(s) found.`
      : `${criterion.label} — found ${count} record(s) but expected at least ${minCount}. ${criterion.description}`,
    method: "soql",
  };
}

async function runToolingCheck(
  sfFetch: SfFetch,
  cfg: ToolingCheckConfig,
  criterion: VerificationCriterion,
): Promise<CheckResult> {
  const minCount = cfg.expectMinCount ?? 1;
  const encoded  = encodeURIComponent(cfg.query);
  const r = await sfJson<{ totalSize?: number; records?: unknown[] }>(
    sfFetch,
    `/services/data/${SF_API_VERSION}/tooling/query?q=${encoded}`,
  );

  if (!r.ok) {
    return {
      id:     criterion.id,
      passed: false,
      detail: `${criterion.label} — Tooling API query failed (${r.text.slice(0, 120)}).`,
      method: "tooling",
    };
  }

  // expectFieldValue mode: assert that the first record has a specific field value.
  // Used for metadata checks like EntityDefinition.DefaultSharingAccess.
  if (cfg.expectFieldValue) {
    const { field, value } = cfg.expectFieldValue;
    const records = (r.data.records ?? []) as Array<Record<string, unknown>>;
    if (records.length === 0) {
      return {
        id:     criterion.id,
        passed: false,
        detail: `${criterion.label} — no matching metadata record found. ${criterion.description}`,
        method: "tooling",
      };
    }
    const actual  = String(records[0][field] ?? "");
    const passed  = actual === value;
    return {
      id:     criterion.id,
      passed,
      detail: passed
        ? `${criterion.label} — confirmed (${field} = '${actual}').`
        : `${criterion.label} — expected ${field} = '${value}' but found '${actual}'. ${criterion.description}`,
      method: "tooling",
    };
  }

  const count  = r.data.totalSize ?? 0;
  const passed = count >= minCount;

  return {
    id:     criterion.id,
    passed,
    detail: passed
      ? `${criterion.label} — ${count} matching item(s) found via Tooling API.`
      : `${criterion.label} — found ${count} item(s) but expected at least ${minCount}. ${criterion.description}`,
    method: "tooling",
  };
}

async function runAuditCheck(
  sfFetch: SfFetch,
  cfg: AuditCheckConfig,
  criterion: VerificationCriterion,
): Promise<CheckResult> {
  const withinHours = cfg.withinHours ?? 24;
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
  const soql = `SELECT Id, Action, Section, CreatedDate FROM SetupAuditTrail WHERE CreatedDate >= ${cutoff} ORDER BY CreatedDate DESC LIMIT 50`;
  const encoded = encodeURIComponent(soql);

  const r = await sfJson<{ totalSize?: number; records?: Array<{ Action: string; Section: string; CreatedDate: string }> }>(
    sfFetch,
    `/services/data/${SF_API_VERSION}/query?q=${encoded}`,
  );

  if (!r.ok) {
    return {
      id:     criterion.id,
      passed: false,
      detail: `${criterion.label} — could not read Setup Audit Trail (${r.text.slice(0, 100)}).`,
      method: "audit",
    };
  }

  const records = r.data.records ?? [];
  const match = records.find(rec => {
    const actionMatch   = rec.Action.toLowerCase().includes(cfg.action.toLowerCase());
    const sectionMatch  = cfg.section ? rec.Section.toLowerCase().includes(cfg.section.toLowerCase()) : true;
    return actionMatch && sectionMatch;
  });

  return {
    id:     criterion.id,
    passed: !!match,
    detail: match
      ? `${criterion.label} — setup action recorded at ${new Date(match.CreatedDate).toLocaleTimeString()}.`
      : `${criterion.label} — no matching setup action found in the last ${withinHours} hours. Make sure you saved the change in Setup and try again.`,
    method: "audit",
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Parse a raw rubric JSONB value into a typed BuildCheckRubric.
 * Returns null if the rubric is missing or malformed.
 */
export function parseBuildCheckRubric(raw: unknown): BuildCheckRubric | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r["verificationCriteria"])) return null;
  const criteria = r["verificationCriteria"] as VerificationCriterion[];
  if (criteria.length === 0) return null;
  return {
    steps:                Array.isArray(r["steps"]) ? (r["steps"] as string[]) : [],
    verificationCriteria: criteria,
  };
}

/**
 * Run all verification criteria for a build-check item.
 * Returns one CheckResult per criterion.
 * Never throws — individual check failures are captured in the result.
 */
export async function runBuildChecks(
  sfFetch: SfFetch,
  criteria: VerificationCriterion[],
): Promise<CheckResult[]> {
  return Promise.all(
    criteria.map(async (criterion) => {
      try {
        switch (criterion.checkConfig.method) {
          case "describe": return runDescribeCheck(sfFetch, criterion.checkConfig, criterion);
          case "soql":     return runSoqlCheck(sfFetch, criterion.checkConfig, criterion);
          case "tooling":  return runToolingCheck(sfFetch, criterion.checkConfig, criterion);
          case "audit":    return runAuditCheck(sfFetch, criterion.checkConfig, criterion);
          default: return {
            id: criterion.id, passed: false,
            detail: `Unknown check method: ${(criterion.checkConfig as { method: string }).method}`,
            method: "soql" as CheckMethod,
          };
        }
      } catch (e: unknown) {
        return {
          id:     criterion.id,
          passed: false,
          detail: `Verification error: ${String(e).slice(0, 200)}`,
          method: criterion.checkConfig.method,
        };
      }
    }),
  );
}
