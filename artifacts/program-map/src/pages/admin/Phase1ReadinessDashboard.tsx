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
    score: 72,
    status: 'at-risk',
    owner: 'Platform Lead',
    description: 'UOM definition, object profiles, Digital Twin foundation, and structural integrity.',
    completed: [
      'Unified Object Model (UOM) defined across all 7 object types',
      'Object profiles documented with purpose, ownership, relationships',
      'Digital Twin shell built with Org Graph, Program Network, Knowledge Net',
      'Sidebar consolidated to 8 core hubs',
      'Context engine wired with workspace context switching',
    ],
    gaps: [
      'Salesforce object validation not yet performed against UOM',
      'No production data — all UOM objects are prototype/in-memory',
      'Penny capability ↔ program linkages are partial',
      'Digital Twin relationship graph uses placeholder data',
    ],
    blockers: ['Awaiting Salesforce org credentials for object validation'],
    nextActions: [
      'Validate PMM object mappings against UOM architecture',
      'Complete program ↔ Salesforce object linkage document',
      'Finalize Trail OS object naming standards and export',
    ],
  },
  {
    id: 'integration',
    title: 'Integration Readiness',
    icon: Puzzle,
    score: 68,
    status: 'at-risk',
    owner: 'Tech Lead',
    description: 'Salesforce API, Google Workspace, Slack, and Penny live connections.',
    completed: [
      'Trail OS API server running (Express 5, port 8080)',
      'Slack POC: 8 secrets configured — bot token, app token, signing secret, 3 channel IDs, client ID/secret',
      'Slack bot (@coachconnectbot) posting live to Penny AI and Admin channels — POC confirmed',
      'GEMINI_API_KEY configured — format verified (AIza prefix), API reachable — key auth issue detected (see below)',
      'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET live-validated — format correct, Google APIs reachable in 25ms',
      'Salesforce webhook secret configured (SALESFORCE_WEBHOOK_SECRET)',
      'GitHub PAT and webhook secret configured',
      'Dual-layer secrets audit live — presence/format + live API validation at /admin/secrets-audit',
      'Live validation endpoints: /api/gemini/validate and /api/google/validate',
    ],
    gaps: [
      'GEMINI_API_KEY returns INVALID_ARGUMENT from Google — key may need Generative Language API enabled in GCP project',
      'GOOGLE_DRIVE_REFRESH_TOKEN not yet configured — OAuth flow not completed',
      'GOOGLE_CALENDAR_REFRESH_TOKEN not yet configured — OAuth flow not completed',
      'Salesforce Connected App client ID/secret not yet configured',
      'No live Salesforce REST/Bulk API connection',
      'Agentforce API credentials not yet configured',
      'Slack channels:read + groups:read scopes not yet added',
    ],
    blockers: [
      'Gemini key auth error — verify in Google AI Studio that Generative Language API is enabled for the key\'s project',
      'Google OAuth refresh tokens — run OAuth flow after confirming client credentials are working',
    ],
    nextActions: [
      'Check Google AI Studio (aistudio.google.com) — ensure Generative Language API is enabled and the key is unrestricted',
      'Complete Google OAuth flow to get GOOGLE_DRIVE_REFRESH_TOKEN + GOOGLE_CALENDAR_REFRESH_TOKEN',
      'Add channels:read + groups:read to Slack app manifest (unblocks Penny/Admin channel name resolution)',
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
    score: 61,
    status: 'on-track',
    owner: 'Knowledge Manager',
    description: 'Source registry completeness, trust levels, sync status, and Penny activation.',
    completed: [
      'Knowledge source registry live with 9 registered sources',
      'Trust level taxonomy defined (Authoritative → Unverified)',
      'Source type classification complete',
      'Knowledge Brief rail wired to context engine',
      'Library, Search, Relationships, Org Memory tabs built',
    ],
    gaps: [
      '3 sources still Unverified — not yet activated in Penny',
      'Salesforce KB sync not yet configured',
      'Google Drive sources not linked to specific programs',
      'Org Memory Phase 2 — decision records not yet created',
    ],
    blockers: ['Salesforce KB API access pending'],
    nextActions: [
      'Complete trust review for all 3 Unverified sources',
      'Configure Salesforce KB connector via Integration Center',
      'Link Google Drive folders per program in source registry',
    ],
  },
  {
    id: 'penny',
    title: 'Penny Readiness',
    icon: Brain,
    score: 63,
    status: 'at-risk',
    owner: 'Penny Lead',
    description: 'Capability registry, prompt library, Slack + knowledge integration, and POC validation.',
    completed: [
      '7 capabilities defined and documented in registry',
      'Prompt drafts written for all 7 capabilities',
      'Trail OS map built (capability ↔ program ↔ knowledge graph)',
      'PennyHub + Prompt Studio + Intelligence views live',
      'Test Penny interface built for POC validation',
      'GEMINI_API_KEY configured and live-validated — Generative Language API responding',
      'Slack POC: @coachconnectbot posting to Penny AI channel (confirmed working)',
      'Google OAuth client credentials configured — Drive and Calendar OAuth flow unblocked',
    ],
    gaps: [
      'Gemini API not yet wired to any Penny capability — still using prototype responses',
      'GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_CALENDAR_REFRESH_TOKEN not yet obtained',
      '5 of 7 capabilities not yet Operational with live data',
      'Knowledge source activation incomplete (3 sources unverified)',
      'Learner journey ↔ Penny capability linkage not validated end-to-end',
    ],
    blockers: [
      'Wire first capability (Resume Review or Learning Coach) to GEMINI_API_KEY endpoint',
      'Complete Google OAuth flow to unblock Drive and Calendar knowledge sources',
    ],
    nextActions: [
      'Call Generative Language API from first Penny capability — GEMINI_API_KEY is live and ready',
      'Complete Google OAuth flow to get GOOGLE_DRIVE_REFRESH_TOKEN + GOOGLE_CALENDAR_REFRESH_TOKEN',
      'Wire Slack integration for Weekly Brief capability using confirmed SLACK_BOT_TOKEN',
    ],
  },
  {
    id: 'operations',
    title: 'Operations Readiness',
    icon: Activity,
    score: 67,
    status: 'on-track',
    owner: 'Operations Director',
    description: 'Health monitoring, demand pipeline, scorecard accuracy, and live data feeds.',
    completed: [
      'Executive health dashboard with domain scorecards live',
      'Domain health indicators across 7 domains built',
      'Demand pipeline (Intake) live with RESOLVE framework',
      'Trends & recommendations views built',
      'OperationsHub consolidated (Operations + Integrations + Demand)',
    ],
    gaps: [
      'All health data is currently prototype/static — no live Salesforce feeds',
      'Demand intake not connected to Salesforce Cases queue',
      'No automation triggers or webhook-based alerts',
      'Scorecard accuracy depends on live data (Phase 2)',
    ],
    blockers: ['Salesforce data access (reports + Cases API)'],
    nextActions: [
      'Connect first Salesforce report to health dashboard',
      'Wire demand intake to Salesforce Cases queue',
      'Set up first live health indicator (enrollment count from SF)',
    ],
  },
];

const OVERALL: ReadinessArea = {
  id: 'overall',
  title: 'Overall Phase 1 Completion',
  icon: Target,
  score: Math.round(AREAS.reduce((sum, a) => sum + a.score, 0) / AREAS.length),
  status: 'at-risk',
  owner: 'Platform Director',
  description: 'Combined readiness across all 6 domains. Phase 1 target: production-ready shell for real data onboarding and live integrations.',
  completed: [
    'Trail OS shell architecture complete — all 8 hubs live',
    'UX consistency pass complete (ActionBar, RelationshipCard, EmptyState, ContextBar)',
    'Digital Twin foundation built',
    'Context engine + lens system live',
    '40+ routes wired and working',
  ],
  gaps: [
    'No live data connections in any domain — all prototype',
    'Integration layer not wired (Salesforce, Google, Slack, Penny)',
    'Penny POC not yet validated end-to-end',
  ],
  blockers: [
    'Salesforce credentials (blocks Architecture, Integration, Knowledge, Operations)',
    'Penny POC environment (blocks Penny readiness)',
    'Google OAuth (blocks Drive, Calendar, Knowledge source links)',
  ],
  nextActions: [
    'Prioritize Salesforce credential acquisition (highest ROI — unblocks 4 domains)',
    'Schedule Penny POC environment setup session',
    'Complete Google OAuth setup (unblocks Knowledge + Penny live)',
    'Assign Phase 1 completion owner per domain and set target dates',
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
            <p className={`font-bold font-serif ${isOverall ? 'text-4xl' : 'text-3xl'} ${area.score >= 70 ? 'text-blue-600' : area.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
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
      <div className="p-6 max-w-4xl space-y-5">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Administration — Phase 1</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Phase 1 Readiness Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">
            Architecture, integration, governance, knowledge, Penny, and operations readiness — scored, gap-analysed, and prioritised for production onboarding.
          </p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Complete',  v: completeCount,  cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'On Track',  v: onTrackCount,   cls: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
            { label: 'At Risk',   v: atRiskCount,    cls: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200'  },
            { label: 'Blocked',   v: blockedCount,   cls: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200'    },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.bg}`}>
              <p className={`text-3xl font-bold font-serif ${s.cls}`}>{s.v}</p>
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
