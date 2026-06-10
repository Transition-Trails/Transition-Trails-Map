// ─────────────────────────────────────────────────────────────────────────────
// Trail OS — Centralized product terminology
//
// All user-visible branded labels are defined here. Components import from
// this file so that a future market/white-label edition only needs to update
// this one file to rename every label across the platform.
//
// MARKET-EDITION GUIDE — to relabel for a sold version:
//   trailSignals       → 'Context Signals' | 'Workspace Intelligence' | 'Signals'
//   knowledgeBrief     → 'Object Brief' | 'Context Brief'
//   aiAssistant        → 'Aria' | 'Scout' | <your brand>
//   platform           → 'ProgramOS' | 'LearnerOS' | <your brand>
//   brand              → 'Acme Learning' | <your brand>
//   missionControl     → 'Command Center' | 'Home' | <your brand>
//   digitalTwin        → 'Knowledge Graph' | 'Object Map' | <your brand>
//
// NOTE: This config is intentionally kept as a plain TypeScript const so it
// can be overridden at build time via an import alias (e.g. path alias to a
// tenant-specific override file) or environment-driven module swap. No API
// call, no database read — just swap the import.
// ─────────────────────────────────────────────────────────────────────────────

export const TERMS = {
  // ── Signal panel ───────────────────────────────────────────────────────────
  /** Actionable cross-system insights panel (Slack, SF, Drive, Email, Cal, Penny) */
  trailSignals:   'Trail Signals',

  /** Object-knowledge reading mode inside the same panel */
  knowledgeBrief: 'Knowledge Brief',

  // ── Platform ───────────────────────────────────────────────────────────────
  platform:       'Trail OS',
  brand:          'Transition Trails',

  // ── AI assistant ───────────────────────────────────────────────────────────
  aiAssistant:    'Penny',

  // ── Key views ──────────────────────────────────────────────────────────────
  missionControl: 'Mission Control',
  digitalTwin:    'Digital Twin',

  // ── Copy helpers ───────────────────────────────────────────────────────────
  /**
   * Standard subtitle used when opening the Trail Signals panel for an area.
   * Example: signalSubtitle('Operations') →
   *   'Trail Signals for Operations — Slack, Salesforce, Drive, Email, Calendar, and Penny context.'
   */
  signalSubtitle: (area: string) =>
    `Trail Signals for ${area} — Slack, Salesforce, Drive, Email, Calendar, and Penny context.`,

  /**
   * Tooltip shown on the global header indicator.
   * urgent = 0 → 'N Trail Signals available — click to open'
   * urgent > 0 → 'N urgent · M Trail Signals available — click to open'
   */
  signalTooltip: (total: number, urgent: number) =>
    urgent > 0
      ? `${urgent} urgent · ${total} Trail Signals available — click to open`
      : `${total} Trail Signals available — click to open`,
} as const;

export type TermsConfig = typeof TERMS;

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PLACEHOLDER
// Trail OS settings / Administration → Terminology
//
// Future: expose TERMS overrides in Administration → Settings → Terminology
// so operators can relabel the platform without a code deploy.
// Planned fields: trailSignals, knowledgeBrief, aiAssistant, platform, brand
// ─────────────────────────────────────────────────────────────────────────────
