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
    health: 'in-progress',
    summary: 'Key format updated (AQ. and AIza both accepted) — new key needed from AI Studio',
    detail:
      'GEMINI_API_KEY validation now accepts new AQ. secure auth key format (Google AI Studio June 2026 change) and legacy AIza format. ' +
      'Enter new key from aistudio.google.com in Replit Secrets to unblock live Penny responses. ' +
      'Validation endpoint: GET /api/gemini/validate',
    lastVerified: 'June 2026',
  },
  googleDrive: {
    id: 'google-drive',
    label: 'Google Drive',
    health: 'in-progress',
    summary: 'OAuth client configured — GOOGLE_DRIVE_REFRESH_TOKEN not yet obtained',
    detail:
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are live and validated. ' +
      'Complete OAuth flow at /admin/google-oauth to get GOOGLE_DRIVE_REFRESH_TOKEN. ' +
      'Replit integration bound (google-drive==1.0.0).',
  },
  googleCalendar: {
    id: 'google-calendar',
    label: 'Google Calendar',
    health: 'in-progress',
    summary: 'OAuth client configured — GOOGLE_CALENDAR_REFRESH_TOKEN not yet obtained',
    detail:
      'Same OAuth flow as Drive. Run /admin/google-oauth to get GOOGLE_CALENDAR_REFRESH_TOKEN. ' +
      'Replit integration bound (google-calendar==1.0.0).',
  },
  gmail: {
    id: 'gmail',
    label: 'Gmail',
    health: 'phase-2',
    summary: 'Phase 2 — Email / Gmail Action Panel (draft in backlog)',
    detail:
      'Gmail read/compose integration deferred to Phase 2. ' +
      'See /admin/phase2-backlog — "Email / Gmail Action Panel" draft card.',
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
    health: 'phase-2',
    summary: 'Phase 2 — not yet started',
    detail:
      'Agentforce (Salesforce AI) integration deferred to Phase 2. ' +
      'Salesforce REST API is live and can validate object access when needed.',
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
      'Authoritative source for all deferred and future features. 10 draft cards: ' +
      'Universal Ask Penny Panel · Trail Signals Control Center · Gmail Panel · ' +
      'Calendar Panel · Google SSO & Groups · Mural · Penny Asset Library · ' +
      'Mobile Trail OS · Penny Reacts to Signals · Learning Delivery Center.',
  },
} as const;

// ── Convenience helpers ───────────────────────────────────────────────────────

export function isLive(id: string): boolean {
  return INTEGRATION_STATUS[id]?.health === 'live';
}

export function integrationSummary(id: string): string {
  return INTEGRATION_STATUS[id]?.summary ?? 'Status unknown';
}
