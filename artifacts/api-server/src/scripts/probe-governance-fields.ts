/**
 * Field-level probe for the five governance objects added in Task #140.
 * Describes each object and compares its actual custom fields against the
 * requiredFields lists in REUSED_OBJECT_FIELD_CHECKS.
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/probe-governance-fields.ts
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

const SF_API_VERSION = "v62.0";

/**
 * Objects to probe and their expected requiredFields.
 * Verified against live org (Task #143) — these match the corrected
 * REUSED_OBJECT_FIELD_CHECKS entries in salesforce.ts.
 */
const PROBE_CONFIGS = [
  {
    id: "penny-classroom-nudge-fields",
    objectApi: "Penny_Classroom_Nudge__c",
    label: "Penny Classroom Nudge",
    // Live org: Course_Work_ID__c, Learner__c, Nudge_Date__c, Sent_At__c
    requiredFields: [
      "Course_Work_ID__c", "Learner__c", "Nudge_Date__c", "Sent_At__c",
    ],
  },
  {
    id: "tt-build-item-fields",
    objectApi: "TT_Build_Item__c",
    label: "TT Build Item",
    // Live org: TT_Automation__c only (Status/Priority/Description/Assigned_To/Due_Date absent)
    requiredFields: [
      "TT_Automation__c",
    ],
  },
  {
    id: "tt-automation-fields",
    objectApi: "TT_Automation__c",
    label: "TT Automation",
    // Live org: 0 custom fields — Phase 2 fields not yet added to org
    requiredFields: [] as string[],
  },
  {
    id: "tt-sop-automation-fields",
    objectApi: "TT_SOP_Automation__c",
    label: "TT SOP Automation",
    // Live org: Automation__c, Knowledge_Article__c (TT_SOP__c / TT_Automation__c / Status__c absent)
    requiredFields: [
      "Automation__c", "Knowledge_Article__c",
    ],
  },
  {
    id: "tt-sop-account-fields",
    objectApi: "TT_SOP_Account__c",
    label: "TT SOP Account",
    // Live org: Account__c, Knowledge_Article__c (TT_SOP__c / Status__c absent)
    requiredFields: [
      "Account__c", "Knowledge_Article__c",
    ],
  },
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface DescribeField {
  name: string;
  custom: boolean;
  type: string;
  nillable: boolean;
}

async function describeObject(
  sfFetch: (path: string, init?: RequestInit) => Promise<Response>,
  objectApi: string,
): Promise<{ found: true; fields: DescribeField[] } | { found: false; error: string }> {
  const url = `/services/data/${SF_API_VERSION}/sobjects/${objectApi}/describe`;
  try {
    const res = await sfFetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => `HTTP ${res.status}`);
      return { found: false, error: `${res.status}: ${body.slice(0, 200)}` };
    }
    const describe = await res.json() as { fields?: Record<string, unknown>[] };
    const fields = (describe.fields ?? []).map(f => ({
      name: String(f["name"]),
      custom: f["custom"] === true,
      type: String(f["type"] ?? "unknown"),
      nillable: f["nillable"] !== false,
    }));
    return { found: true, fields };
  } catch (e: unknown) {
    return { found: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const connectors = new ReplitConnectors();
  const proxyFetch = connectors.createProxyFetch("salesforce");
  const proxyUrl   = connectors.getProxyUrl();

  const sfFetch = (path: string, init?: RequestInit): Promise<Response> => {
    const url = path.startsWith("http") ? path : `${proxyUrl}${path}`;
    return proxyFetch(url, init) as Promise<Response>;
  };

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Governance Field Probe — comparing expected vs. live org");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const summary: {
    objectApi: string;
    label: string;
    objectFound: boolean;
    missing: string[];
    extra: string[];
    allFound: string[];
  }[] = [];

  for (const cfg of PROBE_CONFIGS) {
    console.log(`\n── ${cfg.label} (${cfg.objectApi}) ──`);
    const result = await describeObject(sfFetch, cfg.objectApi);

    if (!result.found) {
      console.log(`  ✗  OBJECT NOT FOUND: ${result.error}`);
      summary.push({
        objectApi: cfg.objectApi,
        label: cfg.label,
        objectFound: false,
        missing: [...cfg.requiredFields],
        extra: [],
        allFound: [],
      });
      await sleep(400);
      continue;
    }

    const customFieldNames = new Set(
      result.fields.filter(f => f.custom).map(f => f.name),
    );

    const allCustom = [...customFieldNames].sort();
    const missing = cfg.requiredFields.filter(f => !customFieldNames.has(f));
    const extra = allCustom.filter(f => !cfg.requiredFields.includes(f as never));

    summary.push({
      objectApi: cfg.objectApi,
      label: cfg.label,
      objectFound: true,
      missing,
      extra,
      allFound: allCustom,
    });

    console.log(`  Object found ✓   ${allCustom.length} custom fields on org`);
    console.log(`\n  Expected requiredFields (${cfg.requiredFields.length} total):`);
    for (const f of cfg.requiredFields) {
      const exists = customFieldNames.has(f);
      console.log(`    ${exists ? "✓" : "✗"} ${f}`);
    }

    if (extra.length > 0) {
      console.log(`\n  Additional custom fields on org not in requiredFields (${extra.length}):`);
      for (const f of extra) {
        const field = result.fields.find(fd => fd.name === f)!;
        const nillableTag = field.nillable ? "nillable" : "required";
        console.log(`    + ${f.padEnd(42)} [${field.type}, ${nillableTag}]`);
      }
    }

    await sleep(400);
  }

  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let hasProblems = false;
  for (const s of summary) {
    if (!s.objectFound) {
      console.log(`  ✗  ${s.label}: OBJECT MISSING from org`);
      hasProblems = true;
    } else if (s.missing.length > 0) {
      console.log(`  ✗  ${s.label}: ${s.missing.length} field(s) not found → ${s.missing.join(", ")}`);
      hasProblems = true;
    } else {
      console.log(`  ✓  ${s.label}: all ${s.objectFound ? s.allFound.length : 0} required fields present`);
    }
  }

  if (!hasProblems) {
    console.log("\n  All five objects pass. Update salesforce.ts requiredFields if needed.");
  } else {
    console.log("\n  Fix the ✗ items in REUSED_OBJECT_FIELD_CHECKS (salesforce.ts lines ~393–443).");
  }

  console.log("\n  Full field lists (for copy-paste into salesforce.ts):");
  for (const s of summary) {
    if (!s.objectFound) continue;
    console.log(`\n  // ${s.label} (${s.objectApi})`);
    console.log(`  requiredFields: [`);
    for (const f of s.allFound) {
      console.log(`    "${f}",`);
    }
    console.log(`  ],`);
  }
}

main().catch(err => {
  console.error("Probe failed:", err);
  process.exit(1);
});
