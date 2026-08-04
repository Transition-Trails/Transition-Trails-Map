/**
 * One-shot: describe Course_Enrollment__c and Course_Activity_Completion__c
 * from the live org, printing every field name + type.
 *
 * Run: npx tsx src/scripts/probe-progress-objects.ts
 */
import { ReplitConnectors } from "@replit/connectors-sdk";
import { SF_API_VERSION } from "../lib/sfConstants.js";

async function describeObject(sfFetch: (path: string) => Promise<Response>, api: string) {
  const res  = await sfFetch(`/services/data/${SF_API_VERSION}/sobjects/${api}/describe`);
  const body = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    console.log(`\n✗  ${api} — NOT FOUND or ERROR`);
    console.log("   ", JSON.stringify(body).slice(0, 200));
    return;
  }
  const fields = (body["fields"] as Array<{ name: string; type: string; nillable: boolean; label: string }>) ?? [];
  console.log(`\n✓  ${api} (${fields.length} fields)`);
  for (const f of fields) {
    const req = f.nillable ? "optional" : "REQUIRED";
    console.log(`   ${f.name.padEnd(45)} ${f.type.padEnd(18)} ${req}   "${f.label}"`);
  }
}

async function main() {
  const connectors = new ReplitConnectors();
  const proxyFetch = connectors.createProxyFetch("salesforce");
  const proxyUrl   = connectors.getProxyUrl();

  const sfFetch = (path: string) =>
    proxyFetch(path.startsWith("http") ? path : `${proxyUrl}${path}`) as Promise<Response>;

  console.log("Describing progress objects against live Salesforce org…");
  await describeObject(sfFetch, "Course_Enrollment__c");
  await describeObject(sfFetch, "Course_Activity_Completion__c");
  // Also confirm the Quest_Eligible__c flag on Course_Module_Activity__c
  console.log("\n--- Checking Quest_Eligible__c on Course_Module_Activity__c ---");
  const res  = await sfFetch(`/services/data/${SF_API_VERSION}/sobjects/Course_Module_Activity__c/describe`);
  const body = await res.json() as Record<string, unknown>;
  if (res.ok) {
    const fields = (body["fields"] as Array<{ name: string; type: string; nillable: boolean; label: string }>) ?? [];
    const quest  = fields.filter(f => f.name.toLowerCase().includes("quest") || f.name.toLowerCase().includes("eligible"));
    console.log(quest.length ? `Found ${quest.length} quest-related field(s):` : "No quest-related fields found.");
    for (const f of quest) console.log(`   ${f.name} (${f.type}) — "${f.label}"`);
    // Also show any Due_Date or Learner fields
    const relevant = fields.filter(f => f.name.includes("Due") || f.name.includes("Learner") || f.name.includes("Enroll"));
    if (relevant.length) {
      console.log("Other relevant fields:");
      for (const f of relevant) console.log(`   ${f.name} (${f.type}) — "${f.label}"`);
    }
  } else {
    console.log("Course_Module_Activity__c describe failed:", JSON.stringify(body).slice(0, 200));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
