// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION TRAILS — SHARED STATUS COLOUR SYSTEM
//
// Single source of truth for all status, lifecycle, and category colours.
// Import from here; never write raw colour class strings in page or component
// files. If a brand value changes, update it here once.
//
// Roles:
//   success     — live, active, passing, complete, healthy, confirmed, approved
//   information — configured, planned, in discovery, by design, read-only
//   attention   — needs setup, partial, prototype, warning, unsaved, rework
//   critical    — blocked, failed, missing credentials, auth error, destructive
//   neutral     — not started, deferred, inactive, phase-2, unknown
//
// Amber constraint:
//   The mid amber (#F5A623) is reserved for the single primary CTA button per
//   screen. Status colour for "attention" uses DARK amber (#CC8400) as text on
//   LIGHT amber tint (#FFF3E0). Never use a solid amber fill for a status badge.
//
// Critical note:
//   #A93F2F (brick red) is a PROVISIONAL functional colour pending a brand book
//   entry. It is defined here so it can be changed in one place when finalised.
// ─────────────────────────────────────────────────────────────────────────────

export type StatusRole = 'success' | 'information' | 'attention' | 'critical' | 'neutral';

// ── Status classes ──────────────────────────────────────────────────────────
// badge  — tinted background + text + border  (use for pills, chips, tags)
// dot    — solid fill                          (use for coloured dots / icons)
// text   — text colour only                   (use for inline emphasis)
// border — border colour only                 (use for container outlines)
// icon   — icon / SVG fill colour             (use for status icons)

export const STATUS_CLASSES: Record<StatusRole, {
  badge:  string;
  dot:    string;
  text:   string;
  border: string;
  icon:   string;
}> = {
  success: {
    badge:  'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
    dot:    'bg-[#2F6B3F]',
    text:   'text-[#2F6B3F]',
    border: 'border-[#9FC3AE]',
    icon:   'text-[#2F6B3F]',
  },
  information: {
    badge:  'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
    dot:    'bg-[#2F6F7E]',
    text:   'text-[#2F6F7E]',
    border: 'border-[#7FAFC6]',
    icon:   'text-[#2F6F7E]',
  },
  attention: {
    badge:  'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    dot:    'bg-[#CC8400]',
    text:   'text-[#CC8400]',
    border: 'border-[#FFD08A]',
    icon:   'text-[#CC8400]',
  },
  critical: {
    // Provisional: #A93F2F is a functional colour pending brand book entry.
    badge:  'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',
    dot:    'bg-[#A93F2F]',
    text:   'text-[#A93F2F]',
    border: 'border-[#E8B9B4]',
    icon:   'text-[#A93F2F]',
  },
  neutral: {
    badge:  'bg-[#E2E4E1] text-[#4A4F4D] border-[#C8CBC6]',
    dot:    'bg-[#4A4F4D]',
    text:   'text-[#4A4F4D]',
    border: 'border-[#C8CBC6]',
    icon:   'text-[#4A4F4D]',
  },
};

// ── Legacy colour token → StatusRole ────────────────────────────────────────
// Maps the string colour tokens used in governanceData.ts lifecycle models
// to the appropriate status role. Used by GovernanceHub's StagePill renderer.
// "teal" in the data means "completed" which resolves to success.

const LIFECYCLE_COLOR_MAP: Record<string, StatusRole> = {
  emerald: 'success',
  teal:    'success',    // completed states
  sky:     'information',
  blue:    'information',
  indigo:  'information',
  violet:  'information',
  purple:  'information',
  amber:   'attention',
  orange:  'attention',
  yellow:  'attention',
  rose:    'critical',
  red:     'critical',
  pink:    'critical',
  slate:   'neutral',
  gray:    'neutral',
  stone:   'neutral',
};

/** Resolve a legacy lifecycle colour token string to a StatusRole. */
export function lifecycleColorToRole(color: string): StatusRole {
  return LIFECYCLE_COLOR_MAP[color] ?? 'neutral';
}

/** Resolve a legacy lifecycle colour token string directly to its class bundle. */
export function lifecycleColorClasses(color: string) {
  return STATUS_CLASSES[lifecycleColorToRole(color)];
}

// ── Confidence status → StatusRole ──────────────────────────────────────────

const CONFIDENCE_ROLE_MAP: Record<string, StatusRole> = {
  confirmed:      'success',
  'needs-review': 'attention',
  draft:          'information',
  deprecated:     'neutral',
  prototype:      'information',
};

export function confidenceToRole(status: string): StatusRole {
  return CONFIDENCE_ROLE_MAP[status] ?? 'neutral';
}

// ── Penny / knowledge source trust level → StatusRole ───────────────────────

const TRUST_ROLE_MAP: Record<string, StatusRole> = {
  high:    'success',
  medium:  'attention',
  low:     'critical',
  unknown: 'neutral',
};

export function trustToRole(level: string): StatusRole {
  return TRUST_ROLE_MAP[level] ?? 'neutral';
}

// ── Health status → StatusRole ───────────────────────────────────────────────

const HEALTH_ROLE_MAP: Record<string, StatusRole> = {
  healthy:          'success',
  'needs-attention': 'attention',
  incomplete:       'critical',
  critical:         'critical',
};

export function healthToRole(status: string): StatusRole {
  return HEALTH_ROLE_MAP[status] ?? 'neutral';
}

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Returns `badge` classes for a given StatusRole. Useful for inline JSX. */
export function badgeClasses(role: StatusRole): string {
  return STATUS_CLASSES[role].badge;
}

/** Returns `dot` class for a given StatusRole. */
export function dotClass(role: StatusRole): string {
  return STATUS_CLASSES[role].dot;
}
