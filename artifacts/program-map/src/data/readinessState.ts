// ── Trail OS Integration & Phase Readiness — Single Source of Truth ──────────
//
// OWNERSHIP:
//   Phase 1 Readiness  (/admin/phase1-readiness) — authoritative dashboard for
//     current platform status, live connection state, blockers, gaps, and next
//     actions across all 6 readiness domains.
//
//   Phase 2 Backlog    (/admin/phase2-backlog) — authoritative place for all
//     deferred and future-state features. 10 draft cards captured as of June 2026.
//
// All pages that surface integration or phase status should reflect this model.
// Admin pages may show full detail; Everyday/Power User pages surface only
// plain-language Penny Insights and Trail Signals — no raw setup language.
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationHealth = 'live' | 'in-progress' | 'planned' | 'phase-2';

export interface IntegrationStatus {
  id: string;
  label: string;
  health: IntegrationHealth;
  summary: string;
  detail: string;
  lastVerified?: string;
}

export const INTEGRATION_STATUS: Record<string, IntegrationStatus> = {
  salesforce: {
    id: 'salesforce',
    label: 'Salesforce',
    health: 'live',
    summary: 'REST API live via Replit Connector SDK',
    detail:
      '127 Accounts · 129 Contacts · NPSP detected (npe01__OppPayment__c) · PMM 7/8 objects accessible (pmdm__ namespace). ' +
      'Authenticated as Angela Landrith (angela@transitiontrails.org) · Transition Trails Enterprise Edition · production org. ' +
      'Validation endpoint: GET /api/salesforce/validate',
    lastVerified: 'June 2026',
  },
  slack: {
    id: 'slack',
    label: 'Slack',
    health: 'live',
    summary: '@coachconnectbot live — posting to Penny AI and Admin channels (POC confirmed)',
    detail:
      'SLACK_BOT_TOKEN, SLACK_APP_TOKEN, and SLACK_SIGNING_SECRET configured. ' +
      'Bot posting confirmed in #penny-ai and #admin channels. ' +
      'Pending: add channels:read + groups:read scopes to enable channel name resolution in Penny.',
    lastVerified: 'June 2026',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini / Penny AI',
    health: 'live',
    summary: 'Penny live — Ask Penny → Gemini 2.5 Flash · POST /api/penny/ask · serviceTier: standard',
    detail:
      'GEMINI_API_KEY confirmed valid, billing active (serviceTier: standard). ' +
      'POST /api/penny/ask endpoint live — Gemini 2.5 Flash responding with Trail OS context. ' +
      'Ask Penny panel in ContextBar now returns real AI responses. ' +
      'Validation endpoint: GET /api/gemini/validate',
    lastVerified: 'June 2026',
  },
  googleDrive: {
    id: 'google-drive',
    label: 'Google Drive',
    health: 'live',
    summary: 'Live — Penny Asset Library reads real files from Shared Drive (TT Content → Penny Asset Library) · Shared Drive support active',
    detail:
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, and GOOGLE_DRIVE_PENNY_FOLDER_ID all configured. ' +
      'OAuth flow completed via /admin/integrations/google-auth. Replit integration bound (google-drive==1.0.0). ' +
      'Penny Asset Library live at /penny/asset-library — reads 6 Penny state subfolders from a Shared Drive (supportsAllDrives + includeItemsFromAllDrives params active). ' +
      'GET /api/drive/penny-assets + /api/drive/status endpoints live. ' +
      'Phase 2: link program-specific Drive workspace folders; Google Drive rule config in Collaboration Overview.',
    lastVerified: 'June 2026',
  },
  googleCalendar: {
    id: 'google-calendar',
    label: 'Google Calendar',
    health: 'live',
    summary: 'Live — real event data via /api/calendar/events · Calendar panel + Penny prep briefs active',
    detail:
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALENDAR_REFRESH_TOKEN all configured. ' +
      'OAuth flow completed via /admin/google-oauth. Replit integration bound (google-calendar==1.0.0). ' +
      'CalendarPanel live at /collaboration/calendar-live — next 5 real events, pending invite flags, per-event Penny prep briefs via Gemini. ' +
      'Collaboration Overview wires today\'s meeting count + next upcoming meeting into the rule management hub. ' +
      'Phase 2: map program-specific Calendar IDs for cohort-scoped event queries.',
    lastVerified: 'June 2026',
  },
  gmail: {
    id: 'gmail',
    label: 'Gmail',
    health: 'live',
    summary: 'Live — gmail.readonly + gmail.send confirmed · Real inbox at /collaboration/gmail',
    detail:
      'GOOGLE_GMAIL_REFRESH_TOKEN stored and active. gmail.readonly + gmail.send scopes confirmed. ' +
      'GmailCenter live at /collaboration/gmail — real inbox (15 threads), thread read, Penny-assisted draft, real send via POST /api/gmail/send. ' +
      'Collaboration Overview refactored to rule management hub — channel signal rules, Penny routing, Trail Signals config. ' +
      'Validation endpoint: GET /api/gmail/validate',
    lastVerified: 'June 2026',
  },
  mural: {
    id: 'mural',
    label: 'Mural',
    health: 'phase-2',
    summary: 'Phase 2 — Mural Integration (draft in backlog)',
    detail:
      'Mural OAuth and board embedding deferred to Phase 2. ' +
      'See /admin/phase2-backlog — "Mural Integration" draft card.',
  },
  agentforce: {
    id: 'agentforce',
    label: 'Agentforce',
    health: 'live',
    summary: 'Penny–Transition Trails Assistant live · Sessions API wired via Salesforce Connector',
    detail:
      'AGENTFORCE_API_KEY set (Agent ID 0Xxan0…). Sessions API wired: create → message → close per invoke cycle. ' +
      'POC confirmed: Agentforce and Penny (Gemini) coexisted simultaneously in the #penny-ai Slack channel. ' +
      'Trail OS can now explicitly invoke Agentforce with learner + program context via POST /api/agentforce/invoke. ' +
      'Assessment coaching wired: dual-AI coaching panel triggers both Penny and Agentforce on every Coach/Next click.',
    lastVerified: 'June 2026',
  },
  ga4: {
    id: 'ga4',
    label: 'Google Analytics 4',
    health: 'phase-2',
    summary: 'Phase 2 — not yet started',
    detail: 'GA4 analytics integration deferred to Phase 2.',
  },
};

// ── Phase ownership documentation ─────────────────────────────────────────────

export const PHASE_OWNERSHIP = {
  phase1: {
    route: '/admin/phase1-readiness',
    label: 'Phase 1 Readiness',
    scope:
      'Authoritative dashboard for current platform status — live connection state, ' +
      'readiness scores, blockers, gaps, and next actions across all 6 domains ' +
      '(Architecture, Integration, Governance, Knowledge, Penny, Operations).',
  },
  phase2: {
    route: '/admin/phase2-backlog',
    label: 'Phase 2 Backlog',
    scope:
      'Authoritative source for all deferred and future features. ' +
      'Gmail Panel, Calendar Panel, and Penny Asset Library graduated to Live in Phase 1. Remaining backlog: ' +
      'Universal Ask Penny Panel · Trail Signals Control Center · ' +
      'Google SSO & Groups · Mural · ' +
      'Mobile Trail OS · Penny Reacts to Signals · Learning Delivery Center · ' +
      'Google Drive rule config · Google Chat spaces · Google Chat client channel.',
  },
} as const;

// ── Convenience helpers ───────────────────────────────────────────────────────

export function isLive(id: string): boolean {
  return INTEGRATION_STATUS[id]?.health === 'live';
}

export function integrationSummary(id: string): string {
  return INTEGRATION_STATUS[id]?.summary ?? 'Status unknown';
}
