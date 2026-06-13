import { useState } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, AlertTriangle, Wrench, Eye,
  ChevronDown, ChevronRight, ExternalLink,
  FileSearch, FlaskConical, Layers, Zap, Shield,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditStatus = 'pass' | 'fixed' | 'watch' | 'fail';
type HcClass = 'demo-ok' | 'phase2-data' | 'stale' | 'fixed';
type PocRisk = 'High' | 'Medium' | 'Low';

interface PageAudit {
  path: string;
  name: string;
  role: string;
  status: AuditStatus;
  issues: string;
}

interface HardcodedItem {
  name: string;
  location: string;
  classification: HcClass;
  p2Item?: string;
  notes: string;
}

interface PocItem {
  capability: string;
  pocState: string;
  trailOsState: string;
  p2Item: string | null;
  risk: PocRisk | null;
}

// ── Audit data ────────────────────────────────────────────────────────────────

const AUDIT_DATE = 'Jun 13, 2026';

const PAGE_AUDITS: PageAudit[] = [
  { path: '/',                              name: 'Home',                            role: 'All',    status: 'pass',  issues: '' },
  { path: '/trail-os-overview',             name: 'Trail OS Overview',               role: 'All',    status: 'fixed', issues: 'font-serif metric values removed' },
  { path: '/search',                        name: 'Global Search',                   role: 'All',    status: 'pass',  issues: '' },
  { path: '/context',                       name: 'Context Engine',                  role: 'Power+', status: 'fixed', issues: 'font-serif removed; Sprint 0: guided empty state + "Set Context via Search" CTA; workspace coverage grid shows object counts per workspace' },
  { path: '/digital-twin',                  name: 'Digital Twin · Explore',          role: 'Power+', status: 'pass',  issues: '' },
  { path: '/digital-twin/governance',       name: 'Digital Twin · Governance',       role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/operations',                    name: 'Operations · Overview',           role: 'Admin+', status: 'fixed', issues: 'font-serif removed from health score + stat chips' },
  { path: '/operations/health',             name: 'Operations · Health',             role: 'Admin+', status: 'fixed', issues: 'font-serif removed from domain score values' },
  { path: '/operations/demand',             name: 'Operations · Demand',             role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/operations/scorecards',         name: 'Operations · Scorecards',         role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/operations/trends',             name: 'Operations · Trends',             role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/operations/recommendations',    name: 'Operations · Recommendations',    role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/program',                       name: 'Programs · Hub',                  role: 'All',    status: 'pass',  issues: '' },
  { path: '/program/standards',             name: 'Programs · Standards',            role: 'Power+', status: 'fixed', issues: 'Sprint 0: context-sensitive action bar — shows Review Standards + Gap Report on standards tab; Create Program on other tabs' },
  { path: '/program/blueprint',             name: 'Programs · Blueprint',            role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/penny',                         name: 'Penny · Command Center',          role: 'Admin+', status: 'fixed', issues: 'Sprint 0: action bar role-gated — Review Readiness + View Relationships + Ask Penny for Power+; New Capability + New Prompt Template admin-only; Phase 1 UX: Command Center overview landing tab added at base path; POC Integrations tab removed with /penny/integration-layer → /admin/setup redirect' },
  { path: '/penny/capabilities',            name: 'Penny · Capabilities',            role: 'Admin+', status: 'fixed', issues: 'Phase 1 UX: canonical route for Capabilities workspace shifted from /penny to /penny/capabilities; Sidebar item updated (Command Center at /penny, Capabilities at /penny/capabilities); tab ordering: Command Center → Capabilities → Prompt Studio' },
  { path: '/penny/prompts',                 name: 'Penny · Prompt Studio',           role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/penny/learners',                name: 'Penny · Learners',                role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/penny/intelligence',            name: 'Penny · Intelligence',            role: 'Admin+', status: 'fixed', issues: 'Sprint 0: P5 Phase 2 Placeholder — 3 preview cards (Learner Trend Analysis, Cohort Health Signals, Weekly Report Archive) with data source attribution' },
  { path: '/penny/test',                    name: 'Penny · Ask Penny (hub tab)',     role: 'Admin+', status: 'fixed', issues: 'Sprint 2: standalone /penny/test route removed; TestPenny component now rendered as "Ask Penny" tab in PennyHub at /penny/test (served by /penny/:tab wildcard); standalone TestPenny import removed from App.tsx; live Gemini LLM wired with rate limiter + multi-turn history' },
  { path: '/knowledge',                     name: 'Knowledge · Overview',            role: 'Power+', status: 'fixed', issues: 'Sprint 0: breadcrumb fixed → Overview; /knowledge/sources added to Topbar PAGE_INFO with Sources label' },
  { path: '/knowledge/sources',             name: 'Knowledge · Sources',             role: 'Power+', status: 'fixed', issues: 'Sprint 0: new route entry in Topbar — breadcrumb now reads Knowledge / Sources (was showing Dashboard)' },
  { path: '/knowledge/library',             name: 'Knowledge · Library',             role: 'All',    status: 'pass',  issues: '' },
  { path: '/knowledge/relationships',       name: 'Knowledge · Relationships (→ DT)', role: 'Power+', status: 'fixed', issues: 'Removed from Knowledge nav + hub tabs; redirects to /digital-twin; relationship mapping lives in Digital Twin Explore' },
  { path: '/knowledge/memory',              name: 'Knowledge · Org Memory',          role: 'Admin+', status: 'watch', issues: 'Phase 2 placeholder content — acceptable for Phase 1' },
  { path: '/collaboration',                 name: 'Collaboration · Overview',        role: 'Power+', status: 'pass',  issues: '' },
  { path: '/collaboration/slack',           name: 'Collaboration · Slack',           role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/collaboration/drive',           name: 'Collaboration · Drive',           role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/collaboration/calendar-live',   name: 'Collaboration · Calendar (Live)', role: 'Power+', status: 'fixed', issues: 'Sprint 2: new Calendar Action Panel — live Google Calendar API via /api/calendar/events; real events from primary calendar; pending invite detection; Trail Talk branding; per-event Penny prep brief via Gemini; time-to-start countdowns; sidebar nav updated to "Calendar" → /collaboration/calendar-live for Power+ users' },
  { path: '/collaboration/calendar',        name: 'Collaboration · Calendar (Admin)', role: 'Admin+', status: 'fixed', issues: 'Sprint 2: stale credential data updated — GOOGLE_CALENDAR_REFRESH_TOKEN now pass (was fail); Calendar API confirmed live; blocked tests → warning; CAL_HEALTH_SCORES credentials 0→10/10; Penny readiness 2→5/10; cgi-02 governance issue status → Resolved' },
  { path: '/collaboration/channels',        name: 'Collaboration · Channels',        role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/collaboration/templates',       name: 'Collaboration · Templates',       role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/governance',                    name: 'Governance Hub',                  role: 'Admin+', status: 'fixed', issues: '4× stat values removed' },
  { path: '/admin',                         name: 'Admin · Landing (→ Setup)',       role: 'Admin+', status: 'fixed', issues: '/admin now redirects to /admin/setup; AdminSetup is the canonical Administration landing' },
  { path: '/admin/setup',                   name: 'Admin · Setup',                   role: 'Admin+', status: 'fixed', issues: 'Sprint 1: removed Integration Readiness from sidebar; Setup is now canonical admin entry; Phase 1 UX: Gmail card added to NEEDS_CONFIG; Drive + Calendar moved to LIVE_INTEGRATIONS (OAuth tokens obtained); Google OAuth status updated to live; admin sidebar deduplicated — removed Phase 1 Readiness, UX Standards, Phase 2 Backlog, Phase 1 Audit from sidebar nav (all accessible via Admin Setup readiness grid)' },
  { path: '/admin/people-access',           name: 'Admin · People & Access',         role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/integration-readiness',   name: 'Admin · Integration Readiness',   role: 'Admin+', status: 'fixed', issues: 'Sprint 1: removed from sidebar nav; accessible only via Admin Setup deep-link; canonical entry is /admin/setup' },
  { path: '/admin/phase1-readiness',        name: 'Admin · Phase 1 Readiness',       role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/ux-standards',            name: 'Admin · UX Standards',            role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/secrets-audit',           name: 'Admin · Secrets Audit',           role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/google-oauth',            name: 'Admin · Google OAuth',            role: 'Admin+', status: 'fixed', issues: 'OAuth flow unblocked: Authorize button changed to target="_blank" (Google blocks OAuth inside iframes); GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_CALENDAR_REFRESH_TOKEN obtained and stored in Replit Secrets; Drive + Calendar status updated to live across AdminSetup, readinessState.ts, and PagePennyGuide footer' },
  { path: '/admin/sf-validation',           name: 'Admin · SF Validation',           role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/program-resources',       name: 'Admin · Drive Workspaces',        role: 'Admin+', status: 'pass',  issues: '' },
  { path: '/admin/phase2-backlog',          name: 'Admin · Phase 2 Backlog',         role: 'Admin+', status: 'pass',  issues: '' },
];

const HARDCODED_ITEMS: HardcodedItem[] = [
  { name: 'Sample Programs (5)',              location: 'data/programs.ts',                  classification: 'demo-ok',    notes: 'Explorer\'s Trail, Foundations, Guided, Trail of Mastery, Digital Compass — real program names' },
  { name: 'Penny Capabilities (22)',          location: 'data/pennyCapabilities.ts',          classification: 'demo-ok',    notes: 'Registry reflects planned Phase 1/2 scope accurately' },
  { name: 'Prompt Studio Templates',         location: 'data/pennyPromptStudioData.ts',      classification: 'demo-ok',    notes: 'Architectural prompt templates — intentional design content' },
  { name: 'Source Documents inventory',      location: 'data/sourceDocuments.ts',            classification: 'demo-ok',    notes: 'Representative sample of real TT document types' },
  { name: 'People & Roles directory',        location: 'data/peopleRolesData.ts',            classification: 'demo-ok',    notes: 'Persona definitions accurate to TT team structure' },
  { name: 'RESOLVE framework phases',        location: 'data/resolvePhases.ts',              classification: 'demo-ok',    notes: 'Mirrors real TT program framework — not synthetic' },
  { name: 'Content & UX standards',          location: 'data/standardsData.ts',              classification: 'demo-ok',    notes: 'Actual Phase 1 standards being built — valid reference data' },
  { name: 'Governance rules & lifecycle',    location: 'data/governanceData.ts',             classification: 'demo-ok',    notes: 'Governance model is intentional design — not synthetic' },
  { name: 'Curriculum structure',            location: 'data/curriculumData.ts',             classification: 'demo-ok',    notes: 'Module/lesson schema represents real TT curriculum structure' },
  { name: 'Demand queue requests (7)',        location: 'pages/ops/Intake.tsx',               classification: 'demo-ok',    notes: 'Representative REQ-025–031 — realistic request types and statuses' },
  { name: 'Message templates',              location: 'data/messageTemplates.ts',           classification: 'demo-ok',    notes: 'Template structures are correct — content evolves with live Penny' },
  { name: 'Salesforce object mapping',       location: 'data/salesforceArchitectureData.ts', classification: 'demo-ok',    notes: 'Reflects confirmed Salesforce schema from live API probe' },
  { name: 'Trail Signals counts',            location: 'data/signalCounts.ts',               classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'All counts are static; P2 = aggregated from live sources' },
  { name: 'Penny Insights SIGNAL_ITEMS',     location: 'layout/PagePennyGuide.tsx',          classification: 'phase2-data', p2Item: 'p2-penny-reacts-signals',  notes: 'Hardcoded insights; P2 = Gemini-generated from live Trail Signals' },
  { name: 'Slack pending action items',      location: 'workspace/SlackContextPanel.tsx',    classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'CONTEXT_PENDING is hardcoded; P2 = live Slack API events' },
  { name: 'Operations health scores',        location: 'data/operationalIntelligenceData.ts',classification: 'phase2-data', p2Item: 'p2-sf-live-queries',      notes: 'Health metrics and recommendations are prototype data' },
  { name: 'Integration readiness checklist', location: 'data/integrationReadinessData.ts',   classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'Status should be calculated from live API probe results' },
  { name: 'Google Calendar events',          location: 'data/googleCalendarData.ts',         classification: 'phase2-data', p2Item: 'p2-calendar-panel',       notes: 'Mock data; P2 = Calendar API with OAuth refresh token' },
  { name: 'Google Drive file metadata',      location: 'data/googleDriveData.ts',            classification: 'phase2-data', p2Item: 'p2-gmail-panel',           notes: 'Mock Drive data; P2 = Drive API with OAuth refresh token' },
  { name: 'Slack workspace channel data',    location: 'data/slackIntegrationData.ts',       classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'Partial live data; full channel metadata needs channels:read scope' },
  { name: 'Global search index',             location: 'data/globalSearchData.ts',           classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'Static index; P2 = dynamic from Salesforce + Drive + Slack queries' },
  { name: 'Context Engine workspace items',  location: 'data/contextEngineData.ts',          classification: 'phase2-data', p2Item: 'p2-ask-penny-panel',      notes: 'Hardcoded; P2 = dynamic from active Salesforce records' },
  { name: 'Phase 1 readiness scores',        location: 'admin/Phase1ReadinessDashboard.tsx', classification: 'phase2-data', p2Item: 'p2-trail-signals-engine', notes: 'Manual updates; P2 = calculated from live integration checks' },
  { name: '"Future:" integration notices',   location: 'All active pages',                   classification: 'stale',       notes: 'Removed from Demand page this session; verified absent in all other active pages' },
  { name: 'TestPenny regex responses',       location: 'pages/penny/TestPenny.tsx',           classification: 'stale',       p2Item: 'p2-penny-live-llm', notes: 'Pattern-match responses should be replaced by live Gemini LLM calls' },
  { name: '"Live (POC)" Slack status',       location: 'PagePennyGuide.tsx, TrailOsHealth',   classification: 'fixed',       notes: 'Sprint 1: updated to "Live" in PagePennyGuide (SOURCE_CONNECT + collaboration powerInsights) and TrailOsHealth integrations array' },
  { name: '"new Gemini key needed" footer', location: 'PagePennyGuide.tsx line 696 (Ask Penny tab)', classification: 'fixed', notes: 'Phase 1 UX: stale text "Prototype responses — new Gemini key needed · Agentforce: Phase 2" updated to "Live · Gemini API · Agentforce upgrade: Phase 2"' },
  { name: '"Google OAuth in progress" footer', location: 'PagePennyGuide.tsx Trail Signals footer', classification: 'fixed', notes: 'Jun 13: stale text "Google OAuth in progress" updated to "Salesforce + Slack + Google OAuth live" after refresh tokens obtained' },
];

const POC_ITEMS: PocItem[] = [
  { capability: 'Learning Coach (LLM)',           pocState: 'Regex/pattern match only',  trailOsState: 'TestPenny.tsx',                risk: 'High',   p2Item: 'p2-penny-live-llm' },
  { capability: 'Prompt Studio',                  pocState: 'Substantially implemented', trailOsState: 'PennyHub > Prompts ✅',        risk: null,     p2Item: null },
  { capability: 'Salesforce Intelligence',        pocState: 'Live API probe confirmed',  trailOsState: 'SF Validation ✅',             risk: 'Low',    p2Item: 'p2-sf-live-queries' },
  { capability: 'Slack Bot (@coachconnectbot)',    pocState: 'Functional (live POC)',     trailOsState: 'Collaboration > Slack ✅',     risk: 'Low',    p2Item: 'p2-trail-quest-live' },
  { capability: 'Gemini API route',               pocState: 'Live · Gemini API active',  trailOsState: 'API server route ✅',          risk: 'Low',    p2Item: 'p2-penny-live-llm' },
  { capability: 'Trail Quest delivery',           pocState: 'Data model only',           trailOsState: 'Not wired to Slack/Gemini',    risk: 'Medium', p2Item: 'p2-trail-quest-live' },
  { capability: 'Assessment / Quiz flow',         pocState: 'Not started',               trailOsState: 'Not implemented',              risk: 'Medium', p2Item: 'p2-penny-assessment' },
  { capability: 'RAG / Knowledge retrieval',      pocState: 'Not started',               trailOsState: 'Not implemented',              risk: 'High',   p2Item: 'p2-penny-rag' },
  { capability: 'Voice / HeyGen avatar',          pocState: 'Not started',               trailOsState: 'Phase 2 Backlog only',         risk: 'Low',    p2Item: 'p2-penny-asset-library' },
  { capability: 'Agentforce coexistence',         pocState: 'Not started',               trailOsState: 'Not implemented',              risk: 'Medium', p2Item: 'p2-agentforce' },
  { capability: 'Coaching conversation flows',    pocState: 'Regex/pattern match',       trailOsState: 'TestPenny.tsx',                risk: 'Medium', p2Item: 'p2-coaching-flows' },
  { capability: 'Security quiz (Slack delivery)', pocState: 'Not started',               trailOsState: 'Not implemented',              risk: 'Low',    p2Item: 'p2-penny-assessment' },
  { capability: 'Career Translator',              pocState: 'Data model only',           trailOsState: 'Not implemented',              risk: 'Low',    p2Item: 'p2-coaching-flows' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<AuditStatus, { label: string; icon: React.ReactNode; row: string; badge: string }> = {
  pass:  { label: 'Pass',    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, row: '',                          badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  fixed: { label: 'Fixed ✓', icon: <Wrench       className="w-3.5 h-3.5 text-sky-600" />,     row: 'bg-sky-50/40',              badge: 'bg-sky-50 border-sky-200 text-sky-700' },
  watch: { label: 'Watch',   icon: <Eye          className="w-3.5 h-3.5 text-amber-500" />,    row: 'bg-amber-50/30',            badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  fail:  { label: 'Fail',    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,    row: 'bg-rose-50/40',             badge: 'bg-rose-50 border-rose-200 text-rose-700' },
};

const HC_META: Record<HcClass, { label: string; badge: string }> = {
  'demo-ok':    { label: 'Phase 1 OK',   badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  'phase2-data':{ label: 'Phase 2 Data', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  'stale':      { label: 'Stale',        badge: 'bg-rose-50 border-rose-200 text-rose-700' },
  'fixed':      { label: 'Fixed',        badge: 'bg-sky-50 border-sky-200 text-sky-700' },
};

const RISK_META: Record<PocRisk, { badge: string }> = {
  High:   { badge: 'bg-rose-50 border-rose-200 text-rose-700' },
  Medium: { badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  Low:    { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
};

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
      {text}
    </span>
  );
}

function SectionHeader({
  icon, title, meta, open, onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  meta: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[12px] font-bold text-foreground flex-1">{title}</span>
      <span className="flex items-center gap-2 mr-2">{meta}</span>
      {open
        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Phase1CompletionAudit() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({
    ux: true, hc: false, tests: false, poc: false, verdict: true,
  });
  const toggle = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // UX tallies
  const passCount  = PAGE_AUDITS.filter(p => p.status === 'pass').length;
  const fixedCount = PAGE_AUDITS.filter(p => p.status === 'fixed').length;
  const watchCount = PAGE_AUDITS.filter(p => p.status === 'watch').length;
  const failCount  = PAGE_AUDITS.filter(p => p.status === 'fail').length;
  const totalPages = PAGE_AUDITS.length;

  // Hardcoded tallies
  const hcOk    = HARDCODED_ITEMS.filter(i => i.classification === 'demo-ok').length;
  const hcP2    = HARDCODED_ITEMS.filter(i => i.classification === 'phase2-data').length;
  const hcStale = HARDCODED_ITEMS.filter(i => i.classification === 'stale').length;

  // POC tallies
  const pocHigh   = POC_ITEMS.filter(i => i.risk === 'High').length;
  const pocMedium = POC_ITEMS.filter(i => i.risk === 'Medium').length;

  const verdictOk = failCount === 0 && hcStale <= 3 && pocHigh <= 3;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-5xl">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Administration</p>
          <h1 className="text-[15px] font-semibold text-foreground">Phase 1 Completion Audit</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Full audit of UX compliance, hardcoded content, test coverage, and Penny POC status — {AUDIT_DATE}
          </p>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Pages Audited', value: String(totalPages),    cls: 'border-stone-200 bg-stone-50' },
            { label: 'UX Pass / Fixed', value: `${passCount} / ${fixedCount}`, cls: 'border-emerald-200 bg-emerald-50' },
            { label: 'UX Fails',      value: String(failCount),     cls: failCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50' },
            { label: 'Hardcoded (P2)',  value: `${hcP2} items`,     cls: 'border-amber-200 bg-amber-50' },
            { label: 'POC High Risk',  value: `${pocHigh} items`,   cls: pocHigh > 2 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-2.5 ${s.cls}`}>
              <p className="text-[18px] font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Section 1: UX Audit ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={<FileSearch className="w-4 h-4" />}
            title="UX Page Audit"
            meta={<>
              <Badge text={`${passCount} pass`}  cls="bg-emerald-50 border-emerald-200 text-emerald-700" />
              {fixedCount > 0 && <Badge text={`${fixedCount} fixed`} cls="bg-sky-50 border-sky-200 text-sky-700" />}
              {watchCount > 0 && <Badge text={`${watchCount} watch`} cls="bg-amber-50 border-amber-200 text-amber-700" />}
              {failCount  > 0 && <Badge text={`${failCount} fail`}  cls="bg-rose-50 border-rose-200 text-rose-700" />}
            </>}
            open={open.ux}
            onToggle={() => toggle('ux')}
          />
          {open.ux && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-5/12">Page</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-1/12">Role</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-1/12">Status</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {PAGE_AUDITS.map((p, i) => {
                    const m = STATUS_META[p.status];
                    return (
                      <tr key={p.path} className={`border-b border-border/60 ${m.row} ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-3 py-1.5">
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <button
                            onClick={() => setLocation(p.path)}
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5"
                          >
                            {p.path} <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{p.role}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${m.badge}`}>
                            {m.icon}{m.label}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{p.issues || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Section 2: Hardcoded Content ─────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={<Layers className="w-4 h-4" />}
            title="Hardcoded Content Inventory"
            meta={<>
              <Badge text={`${hcOk} Phase 1 OK`}   cls="bg-emerald-50 border-emerald-200 text-emerald-700" />
              <Badge text={`${hcP2} Phase 2 data`}  cls="bg-amber-50 border-amber-200 text-amber-700" />
              {hcStale > 0 && <Badge text={`${hcStale} stale`} cls="bg-rose-50 border-rose-200 text-rose-700" />}
            </>}
            open={open.hc}
            onToggle={() => toggle('hc')}
          />
          {open.hc && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-3/12">Item</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-2/12">Class</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-2/12">Phase 2 Ticket</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {HARDCODED_ITEMS.map((item, i) => {
                    const m = HC_META[item.classification];
                    return (
                      <tr key={item.name} className={`border-b border-border/60 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-3 py-1.5">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.location}</p>
                        </td>
                        <td className="px-3 py-1.5">
                          <Badge text={m.label} cls={m.badge} />
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground font-mono text-[10px]">
                          {item.p2Item ? (
                            <button
                              onClick={() => setLocation('/admin/phase2-backlog')}
                              className="hover:text-primary transition-colors"
                            >
                              {item.p2Item}
                            </button>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{item.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Section 3: Test Coverage ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={<FlaskConical className="w-4 h-4" />}
            title="Test Coverage"
            meta={<>
              <Badge text="0 automated"     cls="bg-rose-50 border-rose-200 text-rose-700" />
              <Badge text="70 metadata cases" cls="bg-amber-50 border-amber-200 text-amber-700" />
              <Badge text="4 smoke-test tools" cls="bg-sky-50 border-sky-200 text-sky-700" />
            </>}
            open={open.tests}
            onToggle={() => toggle('tests')}
          />
          {open.tests && (
            <div className="border-t border-border p-4 space-y-3 text-[12px]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    title: 'Automated (Vitest/Jest)',
                    value: '0',
                    sub: 'No test runner configured — vitest.config.ts and *.test.ts files are absent from the workspace.',
                    cls: 'border-rose-200 bg-rose-50',
                    valcls: 'text-rose-600',
                  },
                  {
                    title: 'Metadata-driven validation',
                    value: '70',
                    sub: 'Slack integration: 42 cases (t-11 to t-42) covering user mapping, Penny delivery, governance, performance, and error handling. Calendar: 28 cases (ct-01 to ct-28) covering credentials, access, mapping, and graceful degradation.',
                    cls: 'border-amber-200 bg-amber-50',
                    valcls: 'text-amber-600',
                  },
                  {
                    title: 'Interactive smoke-test tools',
                    value: '4',
                    sub: 'TestPenny (regex chat simulator), Secrets Audit (env-var format & plausibility), Slack Validation Center (live test-message to bot channel), SF Validation Center (live SOQL probe via Replit connector).',
                    cls: 'border-sky-200 bg-sky-50',
                    valcls: 'text-sky-600',
                  },
                ].map(card => (
                  <div key={card.title} className={`rounded-lg border p-3 ${card.cls}`}>
                    <p className={`text-[22px] font-bold leading-none mb-1 ${card.valcls}`}>{card.value}</p>
                    <p className="text-[11px] font-semibold text-foreground mb-1">{card.title}</p>
                    <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-800">
                  <span className="font-bold">Phase 2 recommendation:</span> add a Vitest test suite. Start by consuming the 70 metadata test cases in{' '}
                  <span className="font-mono">slackIntegrationData.ts</span> and{' '}
                  <span className="font-mono">googleCalendarData.ts</span> as automated assertions. Add the{' '}
                  <span className="font-mono">p2-vitest-automation</span> backlog card for scoping.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 4: Penny POC Review ───────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={<Zap className="w-4 h-4" />}
            title="Penny POC Capability Review"
            meta={<>
              <Badge text={`${pocHigh} high risk`}   cls="bg-rose-50 border-rose-200 text-rose-700" />
              <Badge text={`${pocMedium} medium risk`} cls="bg-amber-50 border-amber-200 text-amber-700" />
              <Badge text={`${POC_ITEMS.length} reviewed`} cls="bg-stone-50 border-stone-200 text-stone-600" />
            </>}
            open={open.poc}
            onToggle={() => toggle('poc')}
          />
          {open.poc && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-3/12">Capability</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-2/12">POC State</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-2/12">In Trail OS</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px] w-1/12">Risk</th>
                    <th className="px-3 py-2 text-left font-bold text-muted-foreground uppercase tracking-wide text-[10px]">Phase 2 Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {POC_ITEMS.map((item, i) => (
                    <tr key={item.capability} className={`border-b border-border/60 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-3 py-1.5 font-semibold text-foreground">{item.capability}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.pocState}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{item.trailOsState}</td>
                      <td className="px-3 py-1.5">
                        {item.risk ? (
                          <Badge text={item.risk} cls={RISK_META[item.risk].badge} />
                        ) : (
                          <Badge text="—" cls="bg-stone-50 border-stone-200 text-stone-500" />
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {item.p2Item ? (
                          <button
                            onClick={() => setLocation('/admin/phase2-backlog')}
                            className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {item.p2Item}
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[10px]">In Phase 1 ✅</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Section 5: Final Verdict ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SectionHeader
            icon={<Shield className="w-4 h-4" />}
            title="Final Verdict"
            meta={<Badge
              text={verdictOk ? 'CONDITIONALLY COMPLETE' : 'NEEDS WORK'}
              cls={verdictOk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}
            />}
            open={open.verdict}
            onToggle={() => toggle('verdict')}
          />
          {open.verdict && (
            <div className="border-t border-border p-4 space-y-3 text-[12px]">
              <div className={`rounded-lg border px-4 py-3 ${verdictOk ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className={`text-[13px] font-bold mb-1 ${verdictOk ? 'text-emerald-800' : 'text-rose-800'}`}>
                  Phase 1 UX: {failCount === 0 ? 'No violations' : `${failCount} violations found`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {passCount} pages pass, {fixedCount} pages had violations fixed across Sprint 0 + Sprint 1 + Phase 1 UX Consolidation (font-serif sweep, role-gated action bars, stale status text, sidebar dedup, Penny Command Center hub, AdminSetup Gmail card + href fixes),
                  {watchCount > 0 ? ` ${watchCount} page(s) have acceptable Phase 2 placeholders` : ' 0 watch items'}. No major violations found.
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-muted-foreground">
                {[
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, text: `${totalPages} routes audited — all Phase 1 UX standards applied.` },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, text: `${hcOk} hardcoded data sets classified as Phase 1 acceptable — realistic sample data.` },
                  { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,  text: `${hcP2} hardcoded items identified as Phase 2 data-connection work — all logged in backlog.` },
                  { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,  text: `No automated test suite. 70 metadata-driven cases + 4 smoke tools cover Phase 1 validation.` },
                  { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,  text: `Gemini API key needs refresh (AQ. format) before any live Penny LLM capability can ship.` },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, text: `Salesforce integration operational. Slack bot live. Google OAuth flow documented.` },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, text: `9 new Phase 2 backlog items added from Penny POC review and hardcoded content analysis.` },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">{item.icon}</span>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setLocation('/admin/phase2-backlog')}
                  className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  View Phase 2 Backlog <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  onClick={() => setLocation('/admin/phase1-readiness')}
                  className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  Phase 1 Readiness <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  onClick={() => setLocation('/admin/ux-standards')}
                  className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  UX Standards <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground/40 text-center pb-2">
          Audit generated {AUDIT_DATE} · Trail OS Phase 1 · {totalPages} pages · {HARDCODED_ITEMS.length} data items · {POC_ITEMS.length} POC capabilities reviewed
        </p>
      </div>
    </ScrollArea>
  );
}
