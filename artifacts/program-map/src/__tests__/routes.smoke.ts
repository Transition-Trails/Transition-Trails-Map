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
  // ── Home / Homebase ───────────────────────────────────────────────────────
  { path: '/',                    kind: 'active', note: 'HomebaseLanding (learner/coach/volunteer) or Home (staff) — audience-dispatched' },
  { path: '/access-not-granted',  kind: 'active', note: 'Authenticated but no recognised Trail OS group' },

  // ── Navigator (sidebar links use /navigator/* prefix; these are the App.tsx redirects) ─
  { path: '/navigator/program-map',              kind: 'redirect', target: '/program' },
  { path: '/navigator/resolve',                  kind: 'redirect', target: '/operations/demand' },
  { path: '/navigator/roles',                    kind: 'redirect', target: '/digital-twin' },
  { path: '/navigator/trail-os-map',             kind: 'redirect', target: '/trail-os-overview' },
  { path: '/navigator/knowledge-relationships',  kind: 'redirect', target: '/digital-twin' },

  // ── Trail OS Overview ──────────────────────────────────────────────────────
  { path: '/trail-os-overview', kind: 'active' },

  // ── Digital Twin ───────────────────────────────────────────────────────────
  { path: '/digital-twin',          kind: 'active' },
  { path: '/digital-twin/:tab',     kind: 'active' },
  // Retired sub-tab redirects
  { path: '/digital-twin/org-graph',      kind: 'redirect', target: '/digital-twin' },
  { path: '/digital-twin/programs',       kind: 'redirect', target: '/digital-twin' },
  { path: '/digital-twin/knowledge',      kind: 'redirect', target: '/digital-twin' },
  { path: '/digital-twin/penny-network',  kind: 'redirect', target: '/digital-twin' },
  { path: '/digital-twin/people',         kind: 'redirect', target: '/digital-twin' },
  { path: '/digital-twin/relationships',  kind: 'redirect', target: '/digital-twin' },

  // ── Unified Object Model ───────────────────────────────────────────────────
  { path: '/uom',      kind: 'active' },
  { path: '/uom/:tab', kind: 'active' },

  // ── Operations ─────────────────────────────────────────────────────────────
  { path: '/operations/:tab', kind: 'active' },
  // Operations sub-page redirects
  { path: '/operations/program-health',      kind: 'redirect', target: '/operations/health' },
  { path: '/operations/salesforce-health',   kind: 'redirect', target: '/operations/health' },
  { path: '/operations/automation-health',   kind: 'redirect', target: '/operations/health' },
  { path: '/operations/website-marketing',   kind: 'redirect', target: '/operations/health' },
  { path: '/operations/penny-health',        kind: 'redirect', target: '/penny/health' },
  { path: '/operations/trail-os-health',     kind: 'redirect', target: '/operations/health' },
  { path: '/operations/communications',      kind: 'redirect', target: '/collaboration' },
  { path: '/operations/integrations',        kind: 'redirect', target: '/admin/integrations' },

  // ── Programs ───────────────────────────────────────────────────────────────
  { path: '/program',      kind: 'active' },
  { path: '/program/:tab', kind: 'active' },
  { path: '/program/courses',  kind: 'active', note: 'Courses & Modules — live Salesforce Course__c / Course_Module__c split-pane view' },
  { path: '/program/modules',  kind: 'active', note: 'Alias for /program/courses' },
  { path: '/program/sf-validation', kind: 'redirect', target: '/admin/sf-validation' },
  { path: '/program/resources',     kind: 'redirect', target: '/admin/program-resources' },
  { path: '/program/salesforce',    kind: 'redirect', target: '/admin/salesforce-arch' },

  // ── Demand (all redirect to /operations/demand) ────────────────────────────
  { path: '/demand',               kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/intake',        kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/cases',         kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/epics',         kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/features',      kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/stories',       kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/roadmap',       kind: 'redirect', target: '/operations/demand' },
  { path: '/demand/change-request', kind: 'redirect', target: '/operations/demand' },

  // ── Curriculum (all redirect to /program/*) ────────────────────────────────
  { path: '/curriculum',                    kind: 'redirect', target: '/program/curriculum' },
  { path: '/curriculum/:sub',               kind: 'redirect', target: '/program/curriculum' },
  { path: '/curriculum/blueprint',          kind: 'redirect', target: '/program/blueprint' },
  { path: '/curriculum/standards',          kind: 'redirect', target: '/program/standards' },
  { path: '/curriculum/salesforce-mapping', kind: 'redirect', target: '/admin/salesforce-arch' },
  { path: '/curriculum/salesforce-arch',    kind: 'redirect', target: '/admin/salesforce-arch' },
  { path: '/curriculum/overview',           kind: 'redirect', target: '/program/curriculum' },
  { path: '/curriculum/programs',           kind: 'redirect', target: '/program/programs' },

  // ── Penny ──────────────────────────────────────────────────────────────────
  // Sidebar nav: Overview / Operate / Configure Penny / Admin
  // Retired from nav but routes intact: Intelligence, Assessments, Agentforce, Health, Asset Library, Quest Library
  { path: '/penny',                    kind: 'active', note: 'PennyCommandCenter' },
  { path: '/penny/learners',           kind: 'active', note: 'Operate > Learners' },
  { path: '/penny/session-log',        kind: 'active', note: 'Operate > Session Log' },
  { path: '/penny/trail-quests',       kind: 'active', note: 'Operate > Trail Quests' },
  { path: '/penny/trail-configs',      kind: 'active', note: 'Configure Penny > Trail Configs' },
  { path: '/penny/prompts',            kind: 'active', note: 'Configure Penny > Prompt Studio' },
  { path: '/penny/capabilities',       kind: 'active', note: 'Configure Penny > Capabilities' },
  { path: '/penny/penny-sandbox',      kind: 'active', note: 'Admin > Penny Sandbox' },
  { path: '/penny/penny-logs',         kind: 'active', note: 'Admin > Penny Logs' },
  { path: '/penny/intelligence',       kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/assessments',        kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/agentforce',         kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/health',             kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/asset-library',      kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/quest-library',      kind: 'active', note: 'Retired from nav; route intact' },
  { path: '/penny/learner/:contactId', kind: 'active', note: 'Learner detail standalone' },
  // Penny redirects
  { path: '/penny/capability-registry', kind: 'redirect', target: '/penny' },
  { path: '/penny/admin-center',        kind: 'redirect', target: '/penny' },
  { path: '/penny/prompt-studio',       kind: 'redirect', target: '/penny/prompts' },
  { path: '/penny/prompt-library',      kind: 'redirect', target: '/penny/prompts' },
  { path: '/penny/response-quality',    kind: 'redirect', target: '/penny/intelligence' },
  { path: '/penny/weekly-reports',      kind: 'redirect', target: '/penny/intelligence' },
  { path: '/penny/integrations',        kind: 'redirect', target: '/admin/integrations' },
  { path: '/penny/integration-layer',   kind: 'redirect', target: '/admin/integrations' },
  { path: '/penny/test-penny',          kind: 'redirect', target: '/penny/penny-sandbox' },
  { path: '/penny/test',                kind: 'redirect', target: '/penny/penny-sandbox' },
  { path: '/penny/logs',                kind: 'redirect', target: '/penny/penny-logs' },
  { path: '/penny/trails',              kind: 'redirect', target: '/penny/trail-configs' },
  { path: '/penny/quest-templates',     kind: 'redirect', target: '/penny/quest-library' },
  { path: '/penny/quest-activity',      kind: 'redirect', target: '/penny/learners' },

  // ── Knowledge ──────────────────────────────────────────────────────────────
  { path: '/knowledge',              kind: 'active' },
  { path: '/knowledge/governance',   kind: 'active' },
  { path: '/knowledge/library',      kind: 'active' },
  { path: '/knowledge/memory',       kind: 'active' },
  { path: '/knowledge/article-studio', kind: 'redirect', target: '/knowledge' },
  { path: '/knowledge/sources',       kind: 'redirect', target: '/knowledge/governance' },
  { path: '/knowledge/sf-articles',   kind: 'redirect', target: '/knowledge/governance' },
  { path: '/knowledge/review-queue',  kind: 'redirect', target: '/knowledge/governance' },
  { path: '/knowledge/search',        kind: 'redirect', target: '/search' },
  { path: '/knowledge/relationships', kind: 'redirect', target: '/governance/map' },

  // ── Library (legacy redirects to /knowledge) ───────────────────────────────
  { path: '/library',                   kind: 'redirect', target: '/knowledge' },
  { path: '/library/:sub',              kind: 'redirect', target: '/knowledge/library' },
  { path: '/library/knowledge-sources', kind: 'redirect', target: '/knowledge' },
  { path: '/library/documents',         kind: 'redirect', target: '/knowledge/library' },
  { path: '/library/templates',         kind: 'redirect', target: '/knowledge/library' },
  { path: '/library/salesforce-kb',     kind: 'redirect', target: '/knowledge/library' },
  { path: '/library/source-mapping',    kind: 'redirect', target: '/digital-twin' },
  { path: '/library/search',            kind: 'redirect', target: '/search' },

  // ── Collaboration ───────────────────────────────────────────────────────────
  { path: '/collaboration',                  kind: 'redirect', target: '/collaboration/my-signals' },
  { path: '/collaboration/my-signals',       kind: 'active' },
  { path: '/collaboration/channels',         kind: 'active' },
  { path: '/collaboration/templates',        kind: 'active' },
  { path: '/collaboration/briefs',           kind: 'active' },
  { path: '/collaboration/notifications',    kind: 'active' },
  { path: '/collaboration/calendar-live',    kind: 'active', note: 'Live Google Calendar Action Panel' },
  { path: '/collaboration/gmail',            kind: 'active', note: 'Gmail Center — Power+ users' },
  { path: '/collaboration/slack',            kind: 'active' },
  { path: '/collaboration/slack/:tab',       kind: 'active' },
  { path: '/collaboration/:tab',             kind: 'active' },
  // Drive / Calendar sub-paths redirect to Integration Hub
  { path: '/collaboration/drive',            kind: 'redirect', target: '/admin/integrations/google-drive' },
  { path: '/collaboration/drive/:sub',       kind: 'redirect', target: '/admin/integrations/google-drive' },
  { path: '/collaboration/calendar',         kind: 'redirect', target: '/admin/integrations/google-calendar' },
  { path: '/collaboration/calendar/:sub',    kind: 'redirect', target: '/admin/integrations/google-calendar' },

  // ── Communications (legacy → /collaboration) ───────────────────────────────
  { path: '/communications',                   kind: 'redirect', target: '/collaboration' },
  { path: '/communications/overview',          kind: 'redirect', target: '/collaboration' },
  { path: '/communications/providers',         kind: 'redirect', target: '/collaboration' },
  { path: '/communications/channels',          kind: 'redirect', target: '/collaboration/channels' },
  { path: '/communications/calendar',          kind: 'redirect', target: '/collaboration/calendar' },
  { path: '/communications/penny-broadcasts',  kind: 'redirect', target: '/collaboration/channels' },
  { path: '/communications/weekly-briefs',     kind: 'redirect', target: '/collaboration/briefs' },
  { path: '/communications/notifications',     kind: 'redirect', target: '/collaboration/notifications' },
  { path: '/communications/message-templates', kind: 'redirect', target: '/collaboration/templates' },

  // ── Governance ─────────────────────────────────────────────────────────────
  { path: '/governance',      kind: 'active' },
  { path: '/governance/:tab', kind: 'active' },

  // ── Utility ────────────────────────────────────────────────────────────────
  { path: '/search',       kind: 'active' },
  { path: '/context',      kind: 'active' },
  { path: '/context/:tab', kind: 'active' },

  // ── Administration ──────────────────────────────────────────────────────────
  { path: '/admin',                       kind: 'redirect', target: '/admin/integrations' },
  { path: '/admin/setup',                 kind: 'redirect', target: '/admin/integrations', note: 'Canonical admin entry moved to /admin/integrations' },
  { path: '/admin/integrations',          kind: 'active',   note: 'IntegrationHub — unified setup center' },
  { path: '/admin/integrations/google-auth',            kind: 'active' },
  { path: '/admin/integrations/google-drive',           kind: 'active' },
  { path: '/admin/integrations/google-drive/:tab',      kind: 'active' },
  { path: '/admin/integrations/google-calendar',        kind: 'active' },
  { path: '/admin/integrations/google-calendar/:tab',   kind: 'active' },
  { path: '/admin/integrations/secrets',                kind: 'active' },
  { path: '/admin/people-access',         kind: 'active' },
  { path: '/admin/users',                 kind: 'active',   note: 'User Directory — all Trail OS users with status and last login' },
  { path: '/admin/people',                kind: 'redirect', target: '/admin/people-access' },
  { path: '/admin/integration-readiness', kind: 'active', note: 'Deep-link; not in sidebar' },
  { path: '/admin/salesforce-arch',       kind: 'active', note: 'Deep-link; not in sidebar' },
  { path: '/admin/sf-validation',         kind: 'active' },
  { path: '/admin/program-resources',     kind: 'active' },
  { path: '/admin/phase1-readiness',      kind: 'active' },
  { path: '/admin/ux-standards',          kind: 'active' },
  { path: '/admin/create-audit',          kind: 'active' },
  { path: '/admin/phase1-audit',          kind: 'active' },
  { path: '/admin/program-config',        kind: 'redirect', target: '/program/config', note: 'Legacy — now a Programs subpage' },
  { path: '/program/config',              kind: 'active',   note: 'Program Configuration — Programs subpage, admin only' },
  { path: '/program/config/:id',          kind: 'active',   note: 'Program Configuration pre-selected to a specific SF record' },
  // Legacy admin redirects → Integration Hub sub-pages
  { path: '/admin/google-oauth',    kind: 'redirect', target: '/admin/integrations/google-auth' },
  { path: '/admin/secrets-audit',   kind: 'redirect', target: '/admin/integrations/secrets' },
  { path: '/admin/comm-channels',   kind: 'redirect', target: '/collaboration/channels' },
  { path: '/admin/comm-routing',    kind: 'redirect', target: '/collaboration/channels' },
  { path: '/admin/:section',        kind: 'active',   note: 'Admin section catch-all (Admin.tsx URL routing)' },
];

// Compile-time assertion: every redirect has a target
type RedirectEntry = RouteEntry & { kind: 'redirect'; target: string };
export const REDIRECTS: RedirectEntry[] = ROUTE_MANIFEST.filter(
  (r): r is RedirectEntry => r.kind === 'redirect',
);

export const ACTIVE_ROUTES = ROUTE_MANIFEST.filter(r => r.kind === 'active');
