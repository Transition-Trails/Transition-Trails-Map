import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Network, Puzzle, Shield, BookOpen, Brain, Activity, Target,
  CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type ReadinessStatus = 'complete' | 'on-track' | 'at-risk' | 'blocked';

interface ReadinessArea {
  id: string;
  title: string;
  icon: LucideIcon;
  score: number;
  status: ReadinessStatus;
  owner: string;
  description: string;
  completed: string[];
  gaps: string[];
  blockers: string[];
  nextActions: string[];
}

const STATUS_CONFIG: Record<ReadinessStatus, { label: string; cls: string; dot: string; bar: string; icon: LucideIcon }> = {
  complete: { label: 'Complete',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-400', icon: CheckCircle2 },
  'on-track': { label: 'On Track', cls: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500',    bar: 'bg-blue-400',    icon: CheckCircle2 },
  'at-risk':  { label: 'At Risk',  cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-400',   icon: AlertTriangle },
  blocked:    { label: 'Blocked',  cls: 'bg-rose-100 text-rose-700 border-rose-200',          dot: 'bg-rose-500',    bar: 'bg-rose-400',    icon: XCircle },
};

const AREAS: ReadinessArea[] = [
  {
    id: 'architecture',
    title: 'Architecture Readiness',
    icon: Network,
    score: 86,
    status: 'on-track',
    owner: 'Platform Lead',
    description: 'UOM definition, object profiles, Digital Twin foundation, and structural integrity.',
    completed: [
      'Unified Object Model (UOM) defined across all 7 object types',
      'Object profiles documented with purpose, ownership, relationships',
      'Digital Twin shell built with Org Graph, Program Network, Knowledge Net',
      'Sidebar consolidated to 8 core hubs',
      'Context engine wired with workspace context switching',
      'Salesforce connected via Replit Connector — REST API live; 127 Accounts, 129 Contacts, NPSP + PMM (7/8 objects) confirmed',
      'Phase 1 UX Consolidation complete — sidebar deduplicated, 48 routes audited, all stale status text cleared',
      'Trail Signals button responsive — Activity icon always visible, label collapses to icon-only below sm breakpoint (matches Penny + Calendar pattern)',
      'Google Sign-In live — Clerk v6, branded /sign-in page, Google OAuth, Show-gated access across all routes',
    ],
    gaps: [
      'pmdm__Program__c (PMM) accessible — Trail OS Program__c custom object not yet created in org',
      'No production data wired — all UOM objects are prototype/in-memory',
      'Penny capability ↔ program linkages are partial',
      'Digital Twin relationship graph uses placeholder data',
    ],
    blockers: [],
    nextActions: [
      'Validate pmdm__Program__c field mapping against Trail OS Program object definition',
      'Complete program ↔ Salesforce object linkage document',
      'Finalize Trail OS object naming standards and export',
    ],
  },
  {
    id: 'integration',
    title: 'Integration Readiness',
    icon: Puzzle,
    score: 97,
    status: 'on-track',
    owner: 'Tech Lead',
    description: 'Salesforce API, Google Workspace, Slack, Agentforce, Penny, and auth layer live connections.',
    completed: [
      'Trail OS API server running (Express 5, port 8080)',
      'Salesforce REST API live via Replit Connector — 127 Accounts, 129 Contacts, NPSP + PMM (7/8 objects) confirmed',
      'Slack POC: bot token, app token, signing secret, 3 channel IDs, client ID/secret — all configured',
      'Slack bot (@coachconnectbot) posting live to Penny AI and Admin channels — POC confirmed',
      'GEMINI_API_KEY validated live — 21 models available (Gemini 2.5 Flash + Pro), auth confirmed',
      'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET live-validated — format correct, Google APIs reachable in 25ms',
      'GOOGLE_DRIVE_REFRESH_TOKEN obtained — Google Drive OAuth fully live (Jun 13 2026); GOOGLE_DRIVE_PENNY_FOLDER_ID set — Penny Asset Library reading real files from Shared Drive (Jun 16 2026)',
      'GOOGLE_CALENDAR_REFRESH_TOKEN obtained — Google Calendar OAuth fully live (Jun 13 2026)',
      'CalendarPanel live — real events via /api/calendar/events, Penny prep briefs per event, pending invite flags',
      'GOOGLE_GMAIL_REFRESH_TOKEN obtained — gmail.readonly + gmail.send scopes confirmed live (Jun 2026)',
      'GmailCenter live at /collaboration/gmail — real inbox (15 threads), thread read, Penny draft, real send via POST /api/gmail/send',
      'AGENTFORCE_API_KEY confirmed (0Xxan0… prefix) — Agentforce Sessions API live, coexistence POC complete',
      'Salesforce webhook secret configured (SALESFORCE_WEBHOOK_SECRET)',
      'GitHub PAT and webhook secret configured',
      'Dual-layer secrets audit live — presence/format + live API validation at /admin/secrets-audit',
      'Live validation endpoints: /api/gemini/validate, /api/google/validate, /api/salesforce/validate, /api/agentforce/status',
      'Clerk v6 Google Sign-In wired — @clerk/react 6.9.1 + @clerk/express 2.1.26; ClerkProvider + proxy; signed-in/out gating live',
      'Access tier architecture live — 3 Google Groups mapped; /api/auth/tier + /api/auth/groups-status endpoints built',
      'Google Groups auto-tier LIVE — service account DWD configured; angela@, hugh@, technology@ resolve from trailosadmin group in real time (Jun 14 2026)',
    ],
    gaps: [
      'Salesforce REST API read-only — SOQL write/mutation not yet implemented',
      'Slack channels:read + groups:read scopes not yet added',
    ],
    blockers: [],
    nextActions: [
      'Add channels:read + groups:read to Slack app manifest (unblocks Penny/Admin channel name resolution)',
      'Wire Salesforce data query to health dashboard (REST API live at /api/salesforce/validate)',
    ],
  },
  {
    id: 'governance',
    title: 'Governance Readiness',
    icon: Shield,
    score: 58,
    status: 'on-track',
    owner: 'Curriculum Director',
    description: 'Blueprint definitions, standards documents, governance policies, and review cadences.',
    completed: [
      'Program Blueprint structure defined (7 sections)',
      'Standards Studio built with filterable standard cards',
      'Governance hub live with framework, policies, roles views',
      'RESOLVE framework documented and wired into demand pipeline',
      'Role definitions drafted (Program Director, LC, Curriculum, Penny Lead)',
    ],
    gaps: [
      'Standards documents not yet uploaded to Knowledge Library',
      'Review cadences not formally scheduled',
      'Blueprint approval workflow not yet active',
      'Standards not linked to Salesforce assessment object',
    ],
    blockers: [],
    nextActions: [
      'Upload Program Standards PDFs to Knowledge Library',
      'Set quarterly review schedule for all Blueprint owners',
      'Assign Blueprint owners per domain in Admin',
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge Readiness',
    icon: BookOpen,
    score: 68,
    status: 'on-track',
    owner: 'Knowledge Manager',
    description: 'Source registry completeness, trust levels, sync status, and Penny activation.',
    completed: [
      'Knowledge source registry live with 9 registered sources',
      'Trust level taxonomy defined (Authoritative → Unverified)',
      'Source type classification complete',
      'Knowledge Brief rail wired to context engine',
      'Library, Sources, and Org Memory tabs built',
    ],
    gaps: [
      '3 sources still Unverified — not yet activated in Penny',
      'Salesforce KB sync not yet configured',
      'Google Drive linked for Penny Asset Library (Shared Drive live) — program-specific workspace folder linkage remains Phase 2',
      'Org Memory Phase 2 — decision records not yet created',
    ],
    blockers: [],
    nextActions: [
      'Complete trust review for all 3 Unverified sources',
      'Configure Salesforce KB connector — REST API is live, query endpoint available at /api/salesforce/validate',
      'Link Google Drive folders per program in source registry (GOOGLE_DRIVE_REFRESH_TOKEN now live)',
    ],
  },
  {
    id: 'penny',
    title: 'Penny Readiness',
    icon: Brain,
    score: 80,
    status: 'on-track',
    owner: 'Penny Lead',
    description: 'Capability registry, prompt library, Slack + knowledge integration, and POC validation.',
    completed: [
      '22 capabilities defined and documented in registry (Phase 1 + Phase 2 scope)',
      'Prompt drafts written for core capabilities',
      'Trail OS map built (capability ↔ program ↔ knowledge graph)',
      'PennyHub + Prompt Studio + Intelligence views live',
      'GEMINI_API_KEY live · Ask Penny → Gemini 2.5 Flash (serviceTier: standard, billing active)',
      'POST /api/penny/ask endpoint live — Trail OS context-aware AI responses with RAG (22-chunk corpus)',
      'Penny Reacts to Trail Signals — P1–P10 priority badges, auto-fire signal context into AskPennyPanel',
      'Calendar Action Panel live — next 5 events, pending-response flags, per-event Penny prep briefs via Gemini',
      'Trail Quests workspace live — 11 quests, 78% completion rate, 24 streaks, Penny coaching trigger wired',
      'Assessments workspace live — per-learner results, filter, dual-AI coaching: Penny + Agentforce in parallel',
      'Agentforce coexistence confirmed — 8/8 POC steps, live API, POST /api/agentforce/invoke session flow',
      'SF Case → Penny focus wired (Sprint 5) — case row click auto-fires rich Penny query (case #, subject, priority, status, contact, age)',
      'Slack POC: @coachconnectbot posting to Penny AI channel (confirmed working)',
      'Google OAuth fully live — GOOGLE_DRIVE_REFRESH_TOKEN + GOOGLE_CALENDAR_REFRESH_TOKEN obtained (Jun 13 2026)',
    ],
    gaps: [
      'Penny delivery pipeline for Slack Weekly Brief not yet wired end-to-end',
      'Knowledge source activation incomplete (3 sources unverified — not yet fed to Penny)',
      'Learner journey ↔ Penny capability linkage not validated end-to-end',
    ],
    blockers: [],
    nextActions: [
      'Wire Slack integration for Weekly Brief capability using confirmed SLACK_BOT_TOKEN',
      'Complete trust review for 3 Unverified knowledge sources and activate in Penny',
      'Link program-specific Google Drive workspace folders in source registry (Drive OAuth + Shared Drive support now live)',
    ],
  },
  {
    id: 'operations',
    title: 'Operations Readiness',
    icon: Activity,
    score: 71,
    status: 'on-track',
    owner: 'Operations Director',
    description: 'Health monitoring, demand pipeline, scorecard accuracy, and live data feeds.',
    completed: [
      'Executive health dashboard with domain scorecards live',
      'Domain health indicators across 7 domains built',
      'Demand pipeline (Intake) live with RESOLVE framework',
      'Trends & recommendations views built',
      'OperationsHub consolidated (Operations + Integrations + Demand)',
      'SF Cases live strip — table view with Priority / Case # / Subject / Status / Contact / Age; links open Salesforce Lightning via MyDomain URL',
      'SF Case → Penny focus wired (Sprint 5) — clicking a live SF case row highlights the row, opens AskPennyPanel, and fires a rich Penny query; dismissible focus strip below table',
    ],
    gaps: [
      'Health dashboard data not yet wired to Salesforce REST API (connection accessible at /api/salesforce/validate)',
      'Demand intake not connected to Salesforce Cases queue',
      'No automation triggers or webhook-based alerts',
      'Scorecard accuracy depends on live data (Phase 2)',
    ],
    blockers: [],
    nextActions: [
      'Wire first Salesforce query to health dashboard (enrollment count from Accounts/Contacts — REST API live)',
      'Wire demand intake to Salesforce Cases queue',
      'Set up first live health indicator using existing /api/salesforce/validate endpoint',
    ],
  },
];

const OVERALL: ReadinessArea = {
  id: 'overall',
  title: 'Overall Phase 1 Completion',
  icon: Target,
  score: Math.round(AREAS.reduce((sum, a) => sum + a.score, 0) / AREAS.length),
  status: 'on-track',
  owner: 'Platform Director',
  description: 'Combined readiness across all 6 domains. Phase 1 target: production-ready shell for real data onboarding and live integrations.',
  completed: [
    'Trail OS shell architecture complete — all 8 hubs live',
    'UX consistency pass complete (ActionBar, RelationshipCard, EmptyState, ContextBar)',
    'Digital Twin foundation built',
    'Context engine + lens system live',
    '48 routes wired, audited, and working',
    'Penny live — Ask Penny → Gemini 2.5 Flash · POST /api/penny/ask · billing active · RAG (22-chunk corpus)',
    'Penny Reacts to Trail Signals — P1–P10 priority badges, auto-fire signal context into AskPennyPanel',
    'Calendar Action Panel live — next 5 events, pending flags, per-event Penny prep briefs via Gemini',
    'Trail Quests workspace live — 11 quests, 78% completion, 24 streaks, Penny coaching trigger',
    'Assessments workspace live — dual-AI coaching: Penny + Agentforce in parallel',
    'Agentforce coexistence confirmed — 8/8 POC steps, live API (0Xxan0… key), session flow live',
    'SF Case → Penny focus wired — case row click fires rich Penny query; highlighted row + dismissible strip',
    'Google OAuth fully live — GOOGLE_DRIVE_REFRESH_TOKEN + GOOGLE_CALENDAR_REFRESH_TOKEN obtained (Jun 13 2026)',
    'Gmail fully live — GOOGLE_GMAIL_REFRESH_TOKEN active · gmail.readonly + gmail.send confirmed · GmailCenter at /collaboration/gmail (Jun 2026)',
    'Collaboration Overview refactored to rule management hub — channel signal rules, Penny routing config, Trail Signals destinations',
    'Google Drive + Google Calendar + Gmail + Agentforce promoted to Live integrations — Admin Setup updated',
    'Phase 1 UX Consolidation complete — sidebar deduplicated, all stale status text cleared',
    'Trail Signals button responsive — icon-only below sm breakpoint, matching Penny + Calendar pattern',
    'Google Sign-In live — Clerk v6, branded sign-in page, Google OAuth, role-gated Show components across all routes',
    'Access tier architecture wired — 3 Google Groups mapped (trailosadmin, trailospennyadmin, trailosusers); tier API endpoints built',
    'Google Groups auto-tier LIVE — service account DWD + GOOGLE_ADMIN_CREDENTIALS configured; real-time group membership drives tier assignment on every login (Jun 14 2026)',
  ],
  gaps: [
    'Salesforce live — data not yet wired to any live dashboard or capability',
    'Slack live (POC) — Penny Weekly Brief delivery pipeline not yet wired end-to-end',
  ],
  blockers: [],
  nextActions: [
    'Wire Salesforce data query to health dashboard (REST API live at /api/salesforce/validate)',
    'Wire Slack Weekly Brief delivery pipeline using confirmed SLACK_BOT_TOKEN',
  ],
};

function ProgressBar({ score, bar }: { score: number; bar: string }) {
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${bar}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function AreaCard({ area, isOverall = false }: { area: ReadinessArea; isOverall?: boolean }) {
  const [open, setOpen] = useState(isOverall);
  const cfg = STATUS_CONFIG[area.status];
  const Icon = area.icon;
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${isOverall ? 'border-primary/30 shadow-sm' : 'border-border'}`}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOverall ? 'bg-primary/10' : 'bg-muted/50'}`}>
            <Icon className={`w-5 h-5 ${isOverall ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-semibold text-foreground ${isOverall ? 'text-[15px]' : 'text-[13px]'}`}>{area.title}</p>
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
                <StatusIcon className="w-2.5 h-2.5" />
                {cfg.label}
              </span>
            </div>
            <ProgressBar score={area.score} bar={cfg.bar} />
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className={`font-bold ${isOverall ? 'text-4xl' : 'text-3xl'} ${area.score >= 70 ? 'text-blue-600' : area.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
              {area.score}
            </p>
            <p className="text-[9px] text-muted-foreground">/ 100</p>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-border/50 px-5 py-4 space-y-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground max-w-xl">{area.description}</p>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-4">Owner: <strong>{area.owner}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Completed */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed ({area.completed.length})
              </p>
              <div className="space-y-1">
                {area.completed.map(item => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <p className="text-[11px] text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gaps + Blockers */}
            <div className="space-y-3">
              {area.gaps.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Gaps ({area.gaps.length})
                  </p>
                  <div className="space-y-1">
                    {area.gaps.map(g => (
                      <div key={g} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <p className="text-[11px] text-foreground">{g}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {area.blockers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700/70 mb-2 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Blockers ({area.blockers.length})
                  </p>
                  <div className="space-y-1">
                    {area.blockers.map(b => (
                      <div key={b} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <p className="text-[11px] text-foreground font-medium">{b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next Actions */}
          {area.nextActions.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Recommended Next Actions</p>
              <div className="space-y-1.5">
                {area.nextActions.map((a, i) => (
                  <div key={a} className="flex items-start gap-2">
                    <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Phase1ReadinessDashboard() {
  const blockedCount  = AREAS.filter(a => a.status === 'blocked').length;
  const atRiskCount   = AREAS.filter(a => a.status === 'at-risk').length;
  const onTrackCount  = AREAS.filter(a => a.status === 'on-track').length;
  const completeCount = AREAS.filter(a => a.status === 'complete').length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-4xl space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration — Phase 1</p>
            <h1 className="text-base font-semibold text-foreground">Phase 1 Readiness Dashboard</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">
              Architecture, integration, governance, knowledge, Penny, and operations readiness — scored, gap-analysed, and prioritised for production onboarding.
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'Complete',  v: completeCount,  cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'On Track',  v: onTrackCount,   cls: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
            { label: 'At Risk',   v: atRiskCount,    cls: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200'  },
            { label: 'Blocked',   v: blockedCount,   cls: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200'    },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border px-3 py-2.5 text-center ${s.bg}`}>
              <p className={`text-xl font-bold ${s.cls}`}>{s.v}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Overall score — always expanded */}
        <AreaCard area={OVERALL} isOverall />

        {/* Domain areas */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Domain Readiness</p>
          <div className="space-y-2">
            {AREAS.map(area => (
              <AreaCard key={area.id} area={area} />
            ))}
          </div>
        </div>

        {/* ── Trail Signals Roadmap ─────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">
            Trail Signals Roadmap
          </p>
          <div className="space-y-3">

            {/* Phase 1 — active model */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Phase 1 · Active
                </span>
                <span className="text-[12px] font-bold text-foreground">System-Driven Trail Signals</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
                In Phase 1, Trail Signals are assigned automatically by the platform — not configured by users.
                The system selects signals based on four factors:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Access tier',              detail: 'Everyday / Power User / Admin determines signal depth and source visibility' },
                  { label: 'Org role / responsibility', detail: 'Your functional role determines which Required Signals always appear' },
                  { label: 'Page context',              detail: 'Signals surface relevant to the hub or object currently in view' },
                  { label: 'Digital Twin relationships',detail: 'Object connections in the Twin route related signals to the right people' },
                ].map(f => (
                  <div key={f.label} className="bg-white/70 border border-emerald-100 rounded-lg px-3 py-2">
                    <p className="text-[11px] font-semibold text-foreground">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{f.detail}</p>
                  </div>
                ))}
              </div>

              {/* Role-based signal model */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                Phase 1 signal model by role
              </p>
              <div className="space-y-1.5">
                {[
                  { tier: 'Everyday User',      dot: 'bg-emerald-500', signals: 'Simplified counts + visual health indicators + guided next actions — no source detail required' },
                  { tier: 'Penny Power User',   dot: 'bg-violet-500',  signals: 'Penny quality metrics, source trust scores, usage analytics, learner/cohort intelligence, and deeper analytics' },
                  { tier: 'Admin / Super Admin', dot: 'bg-amber-500',  signals: 'Integration health, governance flags, secrets status, full Digital Twin alerts, and system-level ops signals' },
                ].map(r => (
                  <div key={r.tier} className="flex items-start gap-2 bg-white/60 border border-emerald-100 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${r.dot}`} />
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">{r.tier}  </span>
                      <span className="text-[11px] text-muted-foreground">{r.signals}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Required vs Optional note */}
              <div className="mt-3 bg-emerald-100/60 border border-emerald-200 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-emerald-800 mb-0.5">Required vs Optional Signals</p>
                <p className="text-[11px] text-emerald-900 leading-snug">
                  <span className="font-semibold">Required signals</span> come from your role and responsibility — they cannot be hidden because ignoring them would create a blind spot in your accountability area.
                  <span className="font-semibold"> Optional signals</span> are contextual and informational — in Phase 2 users will control these. Phase 1 shows both without distinction.
                </p>
              </div>
            </div>

            {/* Phase 2 — deferred parking lot */}
            <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted border border-border px-2 py-0.5 rounded-full">
                    Phase 2 · Deferred
                  </span>
                  <span className="text-[12px] font-bold text-foreground">My Trail Signals Control Center</span>
                </div>
                <span className="text-[9px] text-muted-foreground/50 flex-shrink-0">Requires Phase 1 live data first</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
                Once Phase 1 data connections are live, users will be able to customize what enters their Trail Signals feed.
                Required signals (role + responsibility) remain always-on; optional signals become user-controlled.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Personal watch rules',       detail: 'Add custom triggers — "notify me when program capacity exceeds 85%"' },
                  { label: 'Custom urgency thresholds',  detail: 'Define what counts as urgent for your context and role' },
                  { label: 'Urgency descriptions',       detail: 'Label urgency in terms that match your team\'s language' },
                  { label: 'Digest vs alert mode',       detail: 'Choose real-time alerts or a daily digest per signal category' },
                  { label: 'Mute optional signals',      detail: 'Silence signals that aren\'t relevant to your work this sprint' },
                  { label: 'Required signals always on', detail: 'Role/responsibility signals stay visible — no blind spots created' },
                ].map(item => (
                  <div key={item.label} className="bg-white/50 border border-border/60 rounded-lg px-3 py-2 opacity-70">
                    <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">About These Scores</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Scores reflect the current state of the Trail OS prototype vs. Phase 1 production-readiness targets. All scores are manually assessed based on completed architecture, built features, and known blockers. They will be replaced by automated readiness checks once live data connections are established.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}
