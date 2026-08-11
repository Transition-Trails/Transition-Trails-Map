/**
 * One-shot script: probe the Curriculum & Progress objects against the live org.
 * Run with: npx tsx src/scripts/probe-curriculum-objects.ts
 *
 * Uses the same ReplitConnectors fallback that getEffectiveSfFetch() uses,
 * so it works without a logged-in session.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { SF_API_VERSION } from "../lib/sfConstants.js";

const CURRICULUM_OBJECTS = [
  { api: "Course__c",                         label: "Course" },
  { api: "Course_Module__c",                  label: "Course Module" },
  { api: "Course_Module_Activity__c",          label: "Course Module Activity" },
  { api: "Learner_Course_Module__c",           label: "Learner Course Module" },
  { api: "Learner_Course_Module_Activity__c",  label: "Learner Course Module Activity" },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const connectors  = new ReplitConnectors();
  const proxyFetch  = connectors.createProxyFetch("salesforce");
  const proxyUrl    = connectors.getProxyUrl();

  const sfFetch = (path: string, init?: RequestInit): Promise<Response> => {
    const url = path.startsWith("http") ? path : `${proxyUrl}${path}`;
    return proxyFetch(url, init) as Promise<Response>;
  };

  console.log("Probing Curriculum & Progress objects against live Salesforce org…\n");

  const results: { api: string; label: string; status: string; detail: string }[] = [];

  for (const { api, label } of CURRICULUM_OBJECTS) {
    const soql    = `SELECT COUNT() FROM ${api}`;
    const encoded = encodeURIComponent(soql);
    try {
      const res  = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${encoded}`, {
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const body = await res.json() as Record<string, unknown>;
      if (res.ok) {
        results.push({ api, label, status: "EXISTS", detail: `${body["totalSize"] ?? 0} records` });
      } else {
        // Salesforce error response — likely INVALID_TYPE (object doesn't exist)
        const errs  = (body as unknown as { errorCode?: string; message?: string }[]);
        const code  = Array.isArray(errs) ? (errs[0]?.errorCode ?? "") : "";
        const msg   = Array.isArray(errs) ? (errs[0]?.message  ?? "") : JSON.stringify(body).slice(0, 120);
        results.push({ api, label, status: `NOT_FOUND (${res.status})`, detail: `${code}: ${msg}`.slice(0, 120) });
      }
    } catch (e: unknown) {
      results.push({ api, label, status: "ERROR", detail: e instanceof Error ? e.message : String(e) });
    }
    await sleep(400);
  }

  console.log("Results:\n");
  for (const r of results) {
    const mark = r.status === "EXISTS" ? "✓" : "✗";
    console.log(`  ${mark}  ${r.api.padEnd(38)} ${r.status.padEnd(20)} ${r.detail}`);
  }

  console.log("\nSummary JSON:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error("Probe failed:", err);
  process.exit(1);
});
