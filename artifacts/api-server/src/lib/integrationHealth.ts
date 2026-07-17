/**
 * integrationHealth.ts — canonical server-side integration status.
 * Mirrors and serves as the server counterpart to frontend/src/data/readinessState.ts.
 * SF status is derived from live connectivity; others are derived from connector config.
 */

import { ConnectorSalesforceClient } from "./connectorSalesforceClient.js";

// ── Phase-1 go-live status for each integration ───────────────────────────────
// Update this when integration status changes. This is the single authoritative
// source on the server side — do not duplicate this map in individual routes.
export const INTEGRATION_PHASE: Record<string, "live" | "phase-2"> = {
  salesforce:     "live",
  googleDrive:    "live",
  googleCalendar: "live",
  gmail:          "live",
  slack:          "live",
  agentforce:     "live",
  gemini:         "live",
  mural:          "phase-2",
  ga4:            "phase-2",
};

// ── Live SF counts + connectivity check ────────────────────────────────────────

export interface SfLiveMetrics {
  sfPrograms: number | null;
  sfContacts: number | null;
  sfCases:    number | null;
  sfLive:     boolean;
}

/**
 * Runs three count queries against Salesforce via the Replit connector.
 * Returns null counts and sfLive=false if the connector is unreachable.
 * All three queries run in parallel; total latency is ~one SF round-trip.
 */
export async function fetchSfLiveMetrics(): Promise<SfLiveMetrics> {
  try {
    const client = new ConnectorSalesforceClient();
    const [programs, contacts, cases] = await Promise.all([
      client.query<object>("SELECT COUNT() FROM pmdm__Program__c"),
      client.query<object>("SELECT COUNT() FROM Contact"),
      client.query<object>("SELECT COUNT() FROM Case WHERE Status != 'Closed'"),
    ]);
    return {
      sfPrograms: programs.totalSize,
      sfContacts: contacts.totalSize,
      sfCases:    cases.totalSize,
      sfLive:     true,
    };
  } catch {
    return { sfPrograms: null, sfContacts: null, sfCases: null, sfLive: false };
  }
}

// ── Derived integration status map ────────────────────────────────────────────

/**
 * Returns an integration → status map, where SF status is derived from live
 * connectivity and others reflect Phase-1 configuration.
 */
export function buildIntegrationStatus(sfLive: boolean): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, phase] of Object.entries(INTEGRATION_PHASE)) {
    if (key === "salesforce") {
      result[key] = sfLive ? "live" : "error";
    } else {
      result[key] = phase === "live" ? "live" : "phase-2";
    }
  }
  return result;
}

// ── Source → integration key mapping ──────────────────────────────────────────

export const SOURCE_INTEGRATION_MAP: Record<string, string> = {
  "src-sf-mission-delivery": "salesforce",
  "src-sf-ops-business":     "salesforce",
  "src-sf-technology":       "salesforce",
  "src-coach-notes":         "salesforce",
  "src-gdrive-foundations":  "googleDrive",
  "src-gdrive-guided":       "googleDrive",
  "src-gdrive-source-docs":  "googleDrive",
  "src-future-slack":        "slack",
  "src-future-calendar":     "googleCalendar",
};

// Stale issue phrases that no longer apply when the integration is confirmed live.
const STALE_PHRASES = [
  "no live salesforce api",
  "no live google drive",
  "no live drive api",
  "source does not exist yet",
  "pending salesforce",
  "pending google",
];

export function filterStaleHealthIssues(issues: string[], integrationKey: string, status: Record<string, string>): string[] {
  if (status[integrationKey] !== "live") return issues;
  return issues.filter(i => !STALE_PHRASES.some(p => i.toLowerCase().includes(p)));
}
