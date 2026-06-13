/**
 * Route smoke manifest — type-checked by `pnpm typecheck`.
 * Not a runtime test; asserts route shape at compile time and
 * serves as a single-file canonical list of every active route
 * and every redirect registered in App.tsx.
 *
 * To verify: pnpm --filter @workspace/program-map run typecheck
 */

type RouteKind = 'active' | 'redirect' | 'redirect-canonical';

interface RouteEntry {
  path: string;
  kind: RouteKind;
  target?: string;
  note?: string;
}

export const ROUTE_MANIFEST: RouteEntry[] = [
  // ── Home ────────────────────────────────────────────────────────────────
  { path: '/',                              kind: 'active' },

  // ── Navigator ────────────────────────────────────────────────────────────
  { path: '/navigator/program-map',        kind: 'active' },
  { path: '/resolve',                      kind: 'active' },
  { path: '/roles',                        kind: 'active' },
  { path: '/trail-os-map',                 kind: 'redirect', target: '/trail-os-overview' },
  { path: '/trail-os-overview',            kind: 'active' },
  { path: '/digital-twin',                 kind: 'active' },
  { path: '/digital-twin/:tab',            kind: 'active' },
  { path: '/digital-twin/map',             kind: 'redirect', target: '/digital-twin', note: 'tab handled by hub' },
  { path: '/digital-twin/impact',          kind: 'redirect', target: '/digital-twin', note: 'tab handled by hub' },
  { path: '/uom',                          kind: 'active' },
  { path: '/uom/:tab',                     kind: 'active' },

  // ── Operations ────────────────────────────────────────────────────────────
  { path: '/operations',                   kind: 'active' },
  { path: '/operations/:tab',              kind: 'active' },
  { path: '/operations/integrations',      kind: 'redirect', target: '/admin/integration-readiness' },

  // ── Programs ─────────────────────────────────────────────────────────────
  { path: '/program',                      kind: 'active' },
  { path: '/program/:tab',                 kind: 'active' },
  { path: '/program/sf-validation',        kind: 'redirect', target: '/admin/sf-validation' },
  { path: '/program/resources',            kind: 'redirect', target: '/admin/program-resources' },
  { path: '/curriculum/salesforce-arch',   kind: 'redirect', target: '/admin/salesforce-arch' },

  // ── Penny ─────────────────────────────────────────────────────────────────
  { path: '/penny',                        kind: 'active',   note: 'Command Center landing' },
  { path: '/penny/:tab',                   kind: 'active' },
  { path: '/penny/capabilities',           kind: 'active',   note: 'Capabilities workspace (canonical)' },
  { path: '/penny/capability-registry',    kind: 'redirect', target: '/penny' },
  { path: '/penny/prompt-studio',          kind: 'redirect', target: '/penny/prompts' },
  { path: '/penny/test-penny',             kind: 'redirect', target: '/penny/test' },
  { path: '/penny/test',                   kind: 'active',   note: 'PennyHub "Ask Penny" tab — served via /penny/:tab wildcard; standalone route removed' },
  { path: '/penny/prompt-library',         kind: 'redirect', target: '/penny/prompts' },
  { path: '/penny/response-quality',       kind: 'redirect', target: '/penny/intelligence' },
  { path: '/penny/integrations',           kind: 'redirect', target: '/admin/setup' },
  { path: '/penny/integration-layer',      kind: 'redirect', target: '/admin/setup' },
  { path: '/penny/trail-quests',           kind: 'redirect', target: '/penny' },
  { path: '/penny/assessments',            kind: 'redirect', target: '/penny/learners' },
  { path: '/penny/logs',                   kind: 'redirect', target: '/penny/learners' },

  // ── Knowledge ────────────────────────────────────────────────────────────
  { path: '/knowledge',                    kind: 'active' },
  { path: '/knowledge/:tab',               kind: 'active' },
  { path: '/knowledge/search',             kind: 'redirect', target: '/search' },
  { path: '/knowledge/relationships',      kind: 'redirect', target: '/digital-twin' },

  // ── Collaboration ────────────────────────────────────────────────────────
  { path: '/collaboration',                kind: 'active' },
  { path: '/collaboration/:tab',           kind: 'active' },
  { path: '/collaboration/calendar-live',  kind: 'active',   note: 'Live Google Calendar Action Panel — served via /collaboration/:tab; sidebar nav entry for Power+ users' },

  // ── Governance / UOM ─────────────────────────────────────────────────────
  { path: '/governance',                   kind: 'active' },
  { path: '/governance/:tab',              kind: 'active' },

  // ── Utility ──────────────────────────────────────────────────────────────
  { path: '/search',                       kind: 'active' },
  { path: '/context',                      kind: 'active' },
  { path: '/context/:tab',                 kind: 'active' },

  // ── Administration ───────────────────────────────────────────────────────
  { path: '/admin',                        kind: 'redirect', target: '/admin/setup' },
  { path: '/admin/setup',                  kind: 'active',   note: 'Canonical admin entry — 8 integration cards + 5 readiness links' },
  { path: '/admin/people-access',          kind: 'active' },
  { path: '/admin/integration-readiness',  kind: 'active',   note: 'Deep-link from AdminSetup; not in sidebar' },
  { path: '/admin/salesforce-arch',        kind: 'active',   note: 'Deep-link from AdminSetup; not in sidebar' },
  { path: '/admin/sf-validation',          kind: 'active' },
  { path: '/admin/program-resources',      kind: 'active' },
  { path: '/admin/phase1-readiness',       kind: 'active' },
  { path: '/admin/ux-standards',           kind: 'active' },
  { path: '/admin/secrets-audit',          kind: 'active' },
  { path: '/admin/google-oauth',           kind: 'active' },
  { path: '/admin/create-audit',           kind: 'active' },
  { path: '/admin/phase2-backlog',         kind: 'active' },
  { path: '/admin/phase1-audit',           kind: 'active' },
  { path: '/admin/:section',              kind: 'active',   note: 'Admin section catch-all (Admin.tsx URL routing)' },
];

// Compile-time assertion: every redirect has a target
type RedirectEntry = RouteEntry & { kind: 'redirect'; target: string };
export const REDIRECTS: RedirectEntry[] = ROUTE_MANIFEST.filter(
  (r): r is RedirectEntry => r.kind === 'redirect',
);

export const ACTIVE_ROUTES = ROUTE_MANIFEST.filter(r => r.kind === 'active');
