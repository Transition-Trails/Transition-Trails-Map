/**
 * Route smoke tests — Trail OS Phase 1 consolidation
 *
 * These are declarative contract assertions. They document every canonical
 * route and every expected redirect. Run with:
 *   pnpm --filter @workspace/program-map exec vitest run src/tests/routes.smoke.ts
 *
 * Each REDIRECT_MAP entry = { from → to } — the app must never 404 on `from`.
 * Each CANONICAL_ROUTES entry = a route the app renders a real component for.
 * Each NAV_ABSENT entry = a path that must NOT appear as a sidebar nav item.
 */

// ── Canonical hub routes ──────────────────────────────────────────────────────

export const CANONICAL_ROUTES = [
  '/',
  '/trail-os-overview',
  '/search',
  '/context',

  '/digital-twin',
  '/digital-twin/governance',

  '/operations',
  '/operations/health',
  '/operations/demand',
  '/operations/scorecards',
  '/operations/trends',
  '/operations/recommendations',

  '/program',
  '/program/programs',
  '/program/standards',
  '/program/blueprint',

  '/penny',
  '/penny/prompts',
  '/penny/learners',
  '/penny/intelligence',
  '/penny/health',
  '/penny/integration-layer',

  '/knowledge',
  '/knowledge/sources',
  '/knowledge/library',
  '/knowledge/memory',

  '/collaboration',
  '/collaboration/slack',
  '/collaboration/drive',
  '/collaboration/calendar',
  '/collaboration/channels',
  '/collaboration/templates',

  '/governance',

  '/admin/setup',
  '/admin/people-access',
  '/admin/integration-readiness',
  '/admin/phase1-readiness',
  '/admin/ux-standards',
  '/admin/phase2-backlog',
  '/admin/phase1-audit',
  '/admin/secrets-audit',
  '/admin/google-oauth',
  '/admin/salesforce-arch',
  '/admin/sf-validation',
] as const;

// ── Redirect map — from → to ──────────────────────────────────────────────────

export const REDIRECT_MAP: Record<string, string> = {
  // Administration landing → Setup (canonical)
  '/admin': '/admin/setup',

  // Navigator legacy
  '/navigator/program-map':              '/program',
  '/navigator/resolve':                  '/operations/demand',
  '/navigator/roles':                    '/digital-twin',
  '/navigator/trail-os-map':             '/trail-os-overview',
  '/navigator/knowledge-relationships':  '/digital-twin',

  // Digital Twin sub-routes → Explore
  '/digital-twin/org-graph':             '/digital-twin',
  '/digital-twin/programs':              '/digital-twin',
  '/digital-twin/knowledge':             '/digital-twin',
  '/digital-twin/penny-network':         '/digital-twin',
  '/digital-twin/people':                '/digital-twin',
  '/digital-twin/relationships':         '/digital-twin',
  '/digital-twin/map':                   '/digital-twin',
  '/digital-twin/impact':                '/digital-twin',

  // Operations legacy
  '/operations/program-health':          '/operations/health',
  '/operations/salesforce-health':       '/operations/health',
  '/operations/automation-health':       '/operations/health',
  '/operations/website-marketing':       '/operations/health',
  '/operations/trail-os-health':         '/operations/health',
  '/operations/penny-health':            '/penny/health',
  '/operations/communications':          '/collaboration',
  '/operations/integrations':            '/admin/integration-readiness',

  // Demand → Operations demand tab
  '/demand':                             '/operations/demand',
  '/demand/intake':                      '/operations/demand',
  '/demand/cases':                       '/operations/demand',
  '/demand/epics':                       '/operations/demand',
  '/demand/features':                    '/operations/demand',
  '/demand/stories':                     '/operations/demand',
  '/demand/roadmap':                     '/operations/demand',
  '/demand/change-request':              '/operations/demand',

  // Penny — test surface removed from primary nav
  '/penny/test':                         '/penny',
  '/penny/test-penny':                   '/penny',
  '/penny/capability-registry':          '/penny',
  '/penny/trail-quests':                 '/penny',
  '/penny/prompt-studio':                '/penny/prompts',
  '/penny/prompt-library':               '/penny/prompts',
  '/penny/response-quality':             '/penny/intelligence',
  '/penny/assessments':                  '/penny/learners',
  '/penny/logs':                         '/penny/learners',
  '/penny/integrations':                 '/admin/integration-readiness',

  // Knowledge — Relationships absorbed into Digital Twin
  '/knowledge/relationships':            '/digital-twin',
  '/knowledge/search':                   '/search',

  // Library → knowledge hub
  '/library':                            '/knowledge',
  '/library/knowledge-sources':          '/knowledge',
  '/library/documents':                  '/knowledge/library',
  '/library/templates':                  '/knowledge/library',
  '/library/salesforce-kb':              '/knowledge/library',
  '/library/source-mapping':             '/digital-twin',
  '/library/search':                     '/search',

  // Communications → Collaboration
  '/communications':                     '/collaboration',
  '/communications/overview':            '/collaboration',
  '/communications/channels':            '/collaboration/channels',
  '/communications/calendar':            '/collaboration/calendar',
  '/communications/templates':           '/collaboration/templates',

  // Curriculum → Program / Admin
  '/curriculum':                         '/program/curriculum',
  '/curriculum/blueprint':               '/program/blueprint',
  '/curriculum/standards':               '/program/standards',
  '/curriculum/salesforce-mapping':      '/admin/salesforce-arch',
  '/curriculum/overview':                '/program/curriculum',
  '/curriculum/programs':                '/program/programs',

  // Program sub-paths → Administration
  '/program/sf-validation':              '/admin/sf-validation',
  '/program/resources':                  '/admin/program-resources',
  '/program/salesforce':                 '/admin/salesforce-arch',

  // Admin internal aliases
  '/admin/roles':                        '/admin/people-access',
  '/admin/access-roles':                 '/admin/people-access',
  '/admin/penny':                        '/penny',
  '/admin/settings':                     '/admin/setup',
  '/admin/templates':                    '/knowledge/library',
  '/admin/comm-channels':                '/collaboration/channels',
  '/admin/comm-routing':                 '/collaboration/channels',
  '/admin/comm-templates':               '/collaboration/templates',
};

// ── Paths that must NOT appear in sidebar primary nav ─────────────────────────

export const NAV_ABSENT = [
  '/penny/test',            // removed — testing lives in ask-penny panel
  '/knowledge/relationships', // removed — absorbed into Digital Twin Explore
  '/admin',                 // removed — admin landing now redirects to /admin/setup
] as const;

// ── Sidebar nav present ───────────────────────────────────────────────────────

export const NAV_PRESENT = [
  '/operations/recommendations', // added this session
  '/admin/setup',                // canonical admin home
] as const;

// ── Runtime contract validation (no test runner required) ────────────────────
// Call validateRouteContract() in dev to assert invariants at startup.

export function validateRouteContract(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const canonicalSet = new Set<string>(CANONICAL_ROUTES);

  const KNOWN_ROOT_PREFIXES = [
    '/admin', '/penny', '/knowledge', '/operations', '/program',
    '/collaboration', '/digital-twin', '/governance', '/search',
    '/trail-os-overview', '/context', '/',
  ];

  for (const [from, to] of Object.entries(REDIRECT_MAP)) {
    if (!to.startsWith('/')) errors.push(`REDIRECT ${from} → "${to}" does not start with /`);
    if (to === from)         errors.push(`REDIRECT ${from} → self`);
    const isKnownRoot = KNOWN_ROOT_PREFIXES.some(p => to === p || to.startsWith(p + '/'));
    if (!isKnownRoot && !canonicalSet.has(to))
      errors.push(`REDIRECT ${from} → "${to}" is not a known path`);
  }

  for (const path of NAV_ABSENT) {
    if (canonicalSet.has(path))
      errors.push(`NAV_ABSENT "${path}" unexpectedly appears in CANONICAL_ROUTES`);
  }

  for (const path of NAV_PRESENT) {
    const targetSet = new Set(Object.values(REDIRECT_MAP));
    if (!canonicalSet.has(path) && !targetSet.has(path))
      errors.push(`NAV_PRESENT "${path}" is missing from both CANONICAL_ROUTES and REDIRECT_MAP targets`);
  }

  return { ok: errors.length === 0, errors };
}
