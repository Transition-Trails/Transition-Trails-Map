/**
 * One-shot script: probe the Penny Objects and Build Governance objects against the live org.
 * Run with: npx tsx src/scripts/probe-penny-governance-objects.ts
 *
 * Uses the same ReplitConnectors fallback that getEffectiveSfFetch() uses,
 * so it works without a logged-in session.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

const SF_API_VERSION = "v62.0";

const PROBE_GROUPS = [
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
    id: "governance",
    label: "Build Governance",
    objects: [
      { api: "TT_Build_Item__c",     label: "Build Item" },
      { api: "TT_Automation__c",     label: "Automation" },
      { api: "TT_SOP_Automation__c", label: "SOP Automation" },
      { api: "TT_SOP_Account__c",    label: "SOP Account" },
    ],
  },
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

  console.log("Probing Penny Objects and Build Governance objects against live Salesforce org…\n");

  for (const group of PROBE_GROUPS) {
    console.log(`\n── ${group.label} ──`);
    const results: { api: string; label: string; status: string; detail: string }[] = [];

    for (const { api, label } of group.objects) {
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

    for (const r of results) {
      const mark = r.status === "EXISTS" ? "✓" : "✗";
      console.log(`  ${mark}  ${r.api.padEnd(38)} ${r.status.padEnd(25)} ${r.detail}`);
    }
  }

  console.log("\n\nDone. Objects marked ✗ should be removed from TT_CUSTOM_OBJECT_GROUPS or annotated as 'planned'.");
}

main().catch(err => {
  console.error("Probe failed:", err);
  process.exit(1);
});
