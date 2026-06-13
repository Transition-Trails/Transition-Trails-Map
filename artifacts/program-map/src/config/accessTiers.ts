// ─────────────────────────────────────────────────────────────────────────────
// Trail OS — Access Tier Configuration
//
// Four experience tiers control what navigation, features, and detail level
// each user sees. The three production tiers map to Google Workspace Groups
// so that future Google Sign-In can assign them automatically.
//
// GOOGLE GROUPS MAPPING (active — matches Workspace admin console):
//   trailosuers@transitiontrails.org        → everyday     (Regular/Everyday User)
//   trailospennyadmin@transitiontrails.org  → power        (Penny Power User)
//   trailosadmin@transitiontrails.org       → admin        (Full Admin)
//   N/A — email whitelist only              → superadmin   (Builder / Super Admin)
//
// PROTOTYPE STATE (current):
//   Default tier = 'superadmin'. The tier switcher in the Topbar lets the
//   builder preview what each tier would see. No URL-level access enforcement
//   exists yet — that ships with Google Workspace SSO (planned Q3–Q4).
// ─────────────────────────────────────────────────────────────────────────────

export type AccessTier = 'everyday' | 'power' | 'admin' | 'superadmin';

// Order matters — higher index = more access
export const TIER_ORDER: AccessTier[] = ['everyday', 'power', 'admin', 'superadmin'];

/** Returns true if `current` tier meets or exceeds `required`. */
export function canAccess(required: AccessTier | undefined, current: AccessTier): boolean {
  if (!required) return true;
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

// ── Tier definitions ──────────────────────────────────────────────────────────

export const TIER_CONFIG = {
  everyday: {
    label:       'Everyday User',
    shortLabel:  'Everyday',
    googleGroup: 'trailosuers@transitiontrails.org',
    groupLabel:  'TRAIL OS Users',
    description: 'Program team, coaches, and coordinators.',
    detail:      'Simplified program health, learner activity, and guided next actions. Visual indicators, counts, and page-level Trail Signals. Digital Twin runs as silent background infrastructure.',
    color:       'emerald',
    colorClass:  'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotClass:    'bg-emerald-500',
    badgeClass:  'bg-emerald-100 text-emerald-800 border-emerald-300',
    activeClass: 'bg-emerald-100 text-emerald-800 border-r border-emerald-200',
    defaultLens: 'executive' as const,
  },
  power: {
    label:       'Penny Power User',
    shortLabel:  'Power',
    googleGroup: 'trailospennyadmin@transitiontrails.org',
    groupLabel:  'Trail OS Penny Admin',
    description: 'Penny governors and AI operations.',
    detail:      'Full Penny analytics, prompt governance, quality metrics, source trust, usage analytics, learner/cohort intelligence, and deeper Trail Signals. Digital Twin as explainable context layer.',
    color:       'violet',
    colorClass:  'text-violet-700 bg-violet-50 border-violet-200',
    dotClass:    'bg-violet-500',
    badgeClass:  'bg-violet-100 text-violet-800 border-violet-300',
    activeClass: 'bg-violet-100 text-violet-800 border-r border-violet-200',
    defaultLens: 'executive' as const,
  },
  admin: {
    label:       'Admin',
    shortLabel:  'Admin',
    googleGroup: 'trailosadmin@transitiontrails.org',
    groupLabel:  'Trail OS Admin',
    description: 'System integrators and platform operators.',
    detail:      'All integration, authentication, secrets, Salesforce, Slack, Google, Drive, Calendar, Gmail, object model, governance, Digital Twin studio, lifecycle, ownership, and configuration.',
    color:       'amber',
    colorClass:  'text-amber-700 bg-amber-50 border-amber-200',
    dotClass:    'bg-amber-500',
    badgeClass:  'bg-amber-100 text-amber-800 border-amber-300',
    activeClass: 'bg-amber-100 text-amber-800 border-r border-amber-200',
    defaultLens: 'builder' as const,
  },
  superadmin: {
    label:       'Super Admin',
    shortLabel:  'Super',
    googleGroup: 'N/A — prototype builder only',
    groupLabel:  'Builder / Super Admin',
    description: 'Platform builder with full access and tier preview.',
    detail:      'Everything Admin sees, plus the ability to preview any tier view without losing access. Used during development and QA.',
    color:       'primary',
    colorClass:  'text-primary bg-primary/5 border-primary/20',
    dotClass:    'bg-primary',
    badgeClass:  'bg-primary/10 text-primary border-primary/20',
    activeClass: 'bg-primary text-primary-foreground',
    defaultLens: 'builder' as const,
  },
} as const;

// ── Navigation visibility ─────────────────────────────────────────────────────
// Minimum tier required per nav item (by item id from Sidebar.tsx).
// Items with no entry are visible to ALL tiers (everyday+).

export const NAV_TIER: Record<string, AccessTier> = {
  'digital-twin':         'power',    // whole group hidden from everyday
  'admin':                'admin',    // whole group hidden from everyday + power

  'dt-map':               'admin',
  'dt-impact':            'admin',
  'dt-governance':        'admin',

  'ops-integrations':     'power',
  'ops-scorecards':       'power',
  'ops-trends':           'power',
  'ops-demand':           'power',

  'prog-standards':       'power',
  'prog-salesforce':      'power',
  'prog-resources':       'power',

  'penny-capabilities':   'power',
  'penny-prompts':        'power',
  'penny-intelligence':   'power',
  'penny-trail-os-map':   'power',
  'penny-test':           'power',

  'know-sources':         'power',
  'know-relationships':   'power',
  'know-memory':          'power',

  'collab-slack':         'power',
  'collab-drive':         'power',
  'collab-channels':      'power',
  'collab-templates':     'power',
};

// ── Feature capabilities per tier ────────────────────────────────────────────

export const TIER_FEATURES: Record<string, Record<AccessTier, string>> = {
  'Trail Signals': {
    everyday:   'Page-level counts + guided next actions (visual, no source detail)',
    power:      'Full analytics with source breakdown — Slack, Drive, SF, Calendar, Email, Penny',
    admin:      'All power features + integration health, secrets status, and system-level signals',
    superadmin: 'Everything + prototype state signals and build-time notices',
  },
  'Digital Twin': {
    everyday:   'Silent background — powers Knowledge Brief context, not directly visible',
    power:      'Explainable context layer — Explore view shows how objects connect',
    admin:      'Full studio — Explore, Map, Impact analysis, Governance, object lifecycle',
    superadmin: 'Full studio + build tools',
  },
  'Penny': {
    everyday:   'Learner outcomes and program progress only',
    power:      'Full suite — capabilities, prompt studio, intelligence, quality metrics, source trust, test tools',
    admin:      'All power features + Penny system configuration and integration setup',
    superadmin: 'Everything',
  },
  'Knowledge': {
    everyday:   'Document library and search',
    power:      'All sources, relationship graph, org memory, and source trust scoring',
    admin:      'All power features + knowledge governance and lifecycle management',
    superadmin: 'Everything',
  },
  'Administration': {
    everyday:   'No access',
    power:      'No access',
    admin:      'Full — programs, docs, capabilities, integrations, secrets, auth, roles, users, access tiers',
    superadmin: 'Full admin + Super Admin mode controls',
  },
  'Lens (view style)': {
    everyday:   'Executive only — visual summaries and guided actions',
    power:      'Executive (default) — can switch to Builder for detail',
    admin:      'Builder (default) — can switch to Executive for summary',
    superadmin: 'Both — auto-set per previewed tier',
  },
};

// ── Navigation summary per tier (for the access matrix display) ──────────────

export const TIER_NAV_SUMMARY: Record<AccessTier, Record<string, string>> = {
  everyday: {
    'Home':            '✓ Full',
    'Global Search':   '✓ Full',
    'Context Engine':  '✓ Full',
    'Operations':      'Executive Overview + Health Indicators',
    'Programs':        'Programs + Blueprint',
    'Penny':           'Learners only',
    'Knowledge':       'Library + Search',
    'Collaboration':   'Overview + Google Calendar',
    'Digital Twin':    '— Hidden (background infrastructure)',
    'Administration':  '— Hidden',
  },
  power: {
    'Home':            '✓ Full',
    'Global Search':   '✓ Full',
    'Context Engine':  '✓ Full',
    'Operations':      'All 6 items including Integration Readiness, Scorecards, Trends, Demand',
    'Programs':        'All 5 items including Standards, Salesforce Arch, Resources',
    'Penny':           'All 6 items — full governance suite',
    'Knowledge':       'All 5 items including Sources, Relationships, Org Memory',
    'Collaboration':   'All 6 items including Slack, Drive, Channels, Templates',
    'Digital Twin':    'Explore only (context layer) — Map/Impact/Governance hidden',
    'Administration':  '— Hidden',
  },
  admin: {
    'Home':            '✓ Full',
    'Global Search':   '✓ Full',
    'Context Engine':  '✓ Full',
    'Operations':      '✓ All items',
    'Programs':        '✓ All items',
    'Penny':           '✓ All items',
    'Knowledge':       '✓ All items',
    'Collaboration':   '✓ All items',
    'Digital Twin':    '✓ Full studio — Explore, Map, Impact, Governance',
    'Administration':  '✓ Full — all sections including Access & Roles',
  },
  superadmin: {
    'Home':            '✓ Full',
    'Global Search':   '✓ Full',
    'Context Engine':  '✓ Full',
    'Operations':      '✓ All items',
    'Programs':        '✓ All items',
    'Penny':           '✓ All items',
    'Knowledge':       '✓ All items',
    'Collaboration':   '✓ All items',
    'Digital Twin':    '✓ Full studio',
    'Administration':  '✓ Full + tier preview controls',
  },
};
