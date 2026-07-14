import { useState } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain, FolderOpen, MessageSquare, Shield, BookOpen, Activity,
  ChevronDown, ChevronUp, ChevronRight,
  Key, Calendar, Plug, ShieldCheck, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type DepStatus = 'live' | 'partial' | 'needs-setup' | 'phase-2';

interface DepItem {
  label: string;
  status: DepStatus;
  note: string;
  action?: string;
  actionLabel?: string;
}

interface DomainCard {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  color: string;
  border: string;
  headerBg: string;
  iconCls: string;
  deps: DepItem[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const DEP_STATUS: Record<DepStatus, { dot: string; badge: string; label: string }> = {
  live:          { dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Live' },
  partial:       { dot: 'bg-amber-400',   badge: 'bg-amber-50 border-amber-200 text-amber-700',       label: 'Partial' },
  'needs-setup': { dot: 'bg-rose-500',    badge: 'bg-rose-50 border-rose-200 text-rose-700',           label: 'Needs Setup' },
  'phase-2':     { dot: 'bg-zinc-300',    badge: 'bg-zinc-50 border-zinc-200 text-zinc-500',           label: 'Phase 2' },
};

// ── Domain data ───────────────────────────────────────────────────────────────

const DOMAINS: DomainCard[] = [
  {
    id: 'ai-core',
    icon: Brain,
    title: 'Penny AI Core',
    subtitle: 'What Penny thinks with',
    color: 'text-violet-700',
    border: 'border-violet-200',
    headerBg: 'bg-violet-50',
    iconCls: 'bg-violet-50 text-violet-600',
    deps: [
      { label: 'Gemini 2.5 Flash key', status: 'live', note: 'GEMINI_API_KEY active · billing confirmed · POST /api/penny/ask live · validated via /api/gemini/validate', action: '/admin/integrations/secrets', actionLabel: 'Secrets audit' },
      { label: 'RAG knowledge corpus', status: 'partial', note: '22 chunks active · 3 sources still Unverified — complete trust review in Knowledge Library to activate them in Penny', action: '/knowledge/sources', actionLabel: 'Review sources' },
      { label: 'Agentforce Sessions API', status: 'live', note: 'Dual-AI coaching wired · Assessment panel fires both Penny + Agentforce per Coach/Next click · Agent ID 0Xxan0…', action: '/penny/assessments', actionLabel: 'Open Assessments' },
      { label: 'Penny capability registry', status: 'live', note: '12 confirmed capabilities · prompt library active · Trail Quests + Assessments live', action: '/penny/capabilities', actionLabel: 'View capabilities' },
    ],
  },
  {
    id: 'data-access',
    icon: FolderOpen,
    title: 'Data Access',
    subtitle: 'What Penny reads',
    color: 'text-sky-700',
    border: 'border-sky-200',
    headerBg: 'bg-sky-50',
    iconCls: 'bg-sky-50 text-sky-600',
    deps: [
      { label: 'Salesforce — Accounts, Contacts, Cases', status: 'live', note: '127 Accounts · 129 Contacts · NPSP + PMM (7/8 objects) · read-only REST API live via Replit connector', action: '/admin/integrations', actionLabel: 'SF config' },
      { label: 'Google Drive — Penny Asset Library', status: 'live', note: 'GOOGLE_DRIVE_PENNY_FOLDER_ID set · Shared Drive (TT Content → Penny Asset Library) · 6 state folders · 38 assets loaded', action: '/penny/asset-library', actionLabel: 'Open Asset Library' },
      { label: 'Google Drive — Program folders', status: 'needs-setup', note: 'Drive OAuth active and Shared Drive accessible. Next: create a Drive folder per program and link each in the Knowledge Source registry.', action: '/knowledge/sources', actionLabel: 'Link folders' },
      { label: 'SF Insights field mapping', status: 'needs-setup', note: 'Salesforce Accounts, Contacts, and Cases data is live. Penny context fields (program match, risk level, engagement score) not yet mapped.', action: '/operations/scorecards', actionLabel: 'Map fields' },
    ],
  },
  {
    id: 'channels',
    icon: MessageSquare,
    title: 'Channels & Comms',
    subtitle: 'How Penny communicates',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-50',
    iconCls: 'bg-emerald-50 text-emerald-600',
    deps: [
      { label: 'Slack bot (@coachconnectbot)', status: 'partial', note: 'Bot posting confirmed to Penny AI + Admin channels. Missing: channels:read + groups:read scopes — add to Slack app manifest to resolve channel names.', action: '/collaboration/slack', actionLabel: 'Slack config' },
      { label: 'Gmail read + send', status: 'live', note: 'gmail.readonly + gmail.send confirmed · Real inbox (15 threads) · Penny-assisted draft + send via POST /api/gmail/send live', action: '/collaboration/gmail', actionLabel: 'Open Gmail' },
      { label: 'Google Calendar events', status: 'live', note: 'Real events via /api/calendar/events · Penny prep briefs per event · pending invite flags live', action: '/collaboration/calendar-live', actionLabel: 'Open Calendar' },
      { label: 'Signal routing rules', status: 'partial', note: 'Collaboration Overview rule hub live — Slack, Gmail, Calendar, Drive channel rules visible and structured. Automated Penny routing is Phase 2.', action: '/collaboration', actionLabel: 'Edit rules' },
    ],
  },
  {
    id: 'access',
    icon: Shield,
    title: 'Access Control',
    subtitle: 'Who Penny talks to',
    color: 'text-amber-700',
    border: 'border-amber-200',
    headerBg: 'bg-amber-50',
    iconCls: 'bg-amber-50 text-amber-600',
    deps: [
      { label: 'Google Sign-In (Clerk v6)', status: 'live', note: 'Branded /sign-in · Google OAuth wired · ClerkProvider + proxy configured · signed-in/out gating live across all routes', action: '/admin/setup', actionLabel: 'Auth setup' },
      { label: 'Google Groups auto-tier', status: 'live', note: '3 Groups → Everyday / Power / Admin tiers · DWD service account configured · real-time group membership on every login via /api/auth/tier', action: '/admin/integrations', actionLabel: 'View config' },
      { label: 'Penny tier-filtered responses', status: 'live', note: 'RAG corpus filtered by access tier — Everyday / Power / Admin receive different context depth from Penny', action: '/penny', actionLabel: 'Test Penny' },
      { label: 'Role-gated routes & tabs', status: 'live', note: 'HubShell tier guards active · Admin+ tabs, actions, and sidebar items hidden from Everyday users', action: '/admin/setup', actionLabel: 'View setup' },
    ],
  },
  {
    id: 'content',
    icon: BookOpen,
    title: 'Content & Knowledge',
    subtitle: 'What Penny knows',
    color: 'text-rose-700',
    border: 'border-rose-200',
    headerBg: 'bg-rose-50',
    iconCls: 'bg-rose-50 text-rose-600',
    deps: [
      { label: 'Knowledge source library', status: 'partial', note: 'Sources, Library, and Org Memory tabs live · 3 sources Unverified — complete trust review for each to activate in Penny RAG', action: '/knowledge/sources', actionLabel: 'Review sources' },
      { label: 'Penny Asset Library', status: 'live', note: '38 assets across 6 Penny states · Drive-backed thumbnails · grid + list views · 3-per-row face-anchored at /penny/asset-library', action: '/penny/asset-library', actionLabel: 'Open Library' },
      { label: 'Salesforce KB sync', status: 'needs-setup', note: 'REST API live querying Accounts/Contacts/Cases. SF Knowledge Base object not yet connected to Knowledge Library.', action: '/knowledge/sources', actionLabel: 'Configure' },
      { label: 'Org Memory decision records', status: 'phase-2', note: 'Org Memory tab built — decision record creation, structured templates, and AI indexing are Phase 2.', action: '/knowledge/memory', actionLabel: 'View Memory' },
    ],
  },
  {
    id: 'ops',
    icon: Activity,
    title: 'Operations & Health',
    subtitle: 'How Penny monitors',
    color: 'text-zinc-700',
    border: 'border-zinc-200',
    headerBg: 'bg-zinc-100',
    iconCls: 'bg-zinc-100 text-zinc-600',
    deps: [
      { label: 'Health dashboard', status: 'live', note: 'Program health scores, last check-in, coach assignment, and risk flags live at /operations/health', action: '/operations/health', actionLabel: 'View Health' },
      { label: 'Demand pipeline (cases + epics)', status: 'live', note: 'SF Cases live · Demand intake, epics, features, stories, roadmap built · Penny focus on case click', action: '/demand/cases', actionLabel: 'View Cases' },
      { label: 'Scorecard live data feed', status: 'partial', note: 'Scorecards built and displaying · direct SF data wiring to scorecard metrics is Phase 2', action: '/operations/scorecards', actionLabel: 'View Scorecards' },
      { label: 'Trail Signals auto-assignment', status: 'partial', note: 'System-assigned by tier, role, context, and program ownership · user-configurable signal selection and GA4 integration Phase 2', action: '/navigator/program-map', actionLabel: 'View Signals' },
    ],
  },
];

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: 'collab', label: 'Signal Rules',         desc: 'Configure channel feeding for Penny and Trail Signals', href: '/collaboration',               icon: MessageSquare },
  { id: 'secrets', label: 'Secrets Audit',       desc: 'Check all tokens are present and valid',               href: '/admin/integrations/secrets',   icon: Key },
  { id: 'drive', label: 'Google Drive',           desc: 'Penny Asset Library and program folder config',        href: '/admin/integrations/google-drive', icon: FolderOpen },
  { id: 'calendar', label: 'Google Calendar',    desc: 'Calendar IDs and cohort event mapping',                href: '/admin/integrations/google-calendar', icon: Calendar },
  { id: 'readiness', label: 'Integration Plan',  desc: 'Full planning workspace — 17 integrations, auth, risks', href: '/admin/integration-readiness', icon: Plug },
  { id: 'sf', label: 'Salesforce Validation',    desc: '16 Trail OS ↔ SF object mappings and readiness scores', href: '/admin/sf-validation',          icon: ShieldCheck },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function domainScore(card: DomainCard) {
  const live = card.deps.filter((d) => d.status === 'live').length;
  return Math.round((live / card.deps.length) * 100);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationHub() {
  const [, setLocation] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedDep, setExpandedDep] = useState<string | null>(null);

  const activeDomain = DOMAINS.find((d) => d.id === selectedDomain) ?? null;

  const allDeps    = DOMAINS.flatMap((d) => d.deps);
  const liveCount  = allDeps.filter((i) => i.status === 'live').length;
  const partCount  = allDeps.filter((i) => i.status === 'partial').length;
  const needsCount = allDeps.filter((i) => i.status === 'needs-setup').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 pt-3 pb-3 border-b bg-card">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Integrations</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Click any domain to inspect its dependencies — what's live, what needs setup, and where to fix it.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700">{liveCount} live</span>
          </div>
          {partCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold text-amber-700">{partCount} partial</span>
            </div>
          )}
          {needsCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-[11px] font-semibold text-rose-700">{needsCount} needs setup</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Body: cards + detail panel ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Cards column */}
        <div className={`overflow-auto transition-all duration-300 ${activeDomain ? 'w-80 shrink-0 border-r border-border' : 'flex-1'}`}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">

              {/* Domain map grid */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">Penny Dependency Map</p>
                <div className={`grid gap-3 ${activeDomain ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {DOMAINS.map((d) => {
                    const score    = domainScore(d);
                    const Icon     = d.icon;
                    const isActive = selectedDomain === d.id;
                    const barColor = score === 100 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400';
                    const pctColor = score === 100 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600';
                    return (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDomain(isActive ? null : d.id); setExpandedDep(null); }}
                        className={`text-left rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
                          isActive ? `${d.border} shadow-md` : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        {/* Card header */}
                        <div className={`px-3.5 py-2.5 ${isActive ? d.headerBg : 'bg-card'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${d.iconCls}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[12px] font-bold leading-tight ${isActive ? d.color : 'text-foreground'}`}>{d.title}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground ml-8">{d.subtitle}</p>
                        </div>
                        {/* Card body */}
                        <div className="px-3.5 py-2.5 bg-card">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex gap-1">
                              {d.deps.map((dep) => (
                                <span
                                  key={dep.label}
                                  className={`w-2 h-2 rounded-full ${DEP_STATUS[dep.status].dot}`}
                                  title={dep.label}
                                />
                              ))}
                            </div>
                            <span className={`text-[11px] font-bold ${pctColor}`}>{score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
                          </div>
                          {!activeDomain && (
                            <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                              {d.deps.filter((dep) => dep.status === 'live').length}/{d.deps.length} ready · click to inspect
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2.5">Quick Actions</p>
                <div className={`grid gap-2 ${activeDomain ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {QUICK_ACTIONS.map((qa) => {
                    const Icon = qa.icon;
                    return (
                      <button
                        key={qa.id}
                        onClick={() => setLocation(qa.href)}
                        className="rounded-lg border border-border bg-card p-3 text-left hover:shadow-sm hover:border-muted-foreground/30 transition-all flex items-start gap-2.5 group"
                      >
                        <div className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-muted-foreground">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-foreground leading-tight">{qa.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{qa.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phase 2 note */}
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 p-3">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground/60">
                  Mural, LMS, Google Chat, full Agentforce context handoff, and Drive rule config are Phase 2. Phase 2 features are tracked in Salesforce.
                </p>
              </div>

            </div>
          </ScrollArea>
        </div>

        {/* Detail panel */}
        {activeDomain && (
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            {/* Panel header */}
            <div className={`flex-shrink-0 px-5 py-3.5 border-b ${activeDomain.headerBg} flex items-center gap-3`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeDomain.iconCls}`}>
                <activeDomain.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </div>
              <div>
                <h2 className={`text-[14px] font-bold ${activeDomain.color}`}>{activeDomain.title}</h2>
                <p className="text-[11px] text-muted-foreground">{activeDomain.subtitle}</p>
              </div>
              <button
                onClick={() => { setSelectedDomain(null); setExpandedDep(null); }}
                className="ml-auto text-[11px] text-muted-foreground hover:text-foreground font-medium"
              >
                ✕ Close
              </button>
            </div>

            {/* Dependency list */}
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-2.5">
                {activeDomain.deps.map((dep) => {
                  const s     = DEP_STATUS[dep.status];
                  const key   = activeDomain.id + dep.label;
                  const isOpen = expandedDep === key;
                  return (
                    <div
                      key={dep.label}
                      className={`rounded-lg border bg-card overflow-hidden transition-shadow ${isOpen ? 'shadow-md' : 'hover:shadow-sm'}`}
                    >
                      <button
                        onClick={() => setExpandedDep(isOpen ? null : key)}
                        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                        <span className="flex-1 text-[13px] font-semibold text-foreground">{dep.label}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>{s.label}</span>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-2.5 border-t border-border bg-muted/20">
                          <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{dep.note}</p>
                          {dep.action && (
                            <button
                              onClick={() => setLocation(dep.action!)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              {dep.actionLabel} <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

      </div>
    </div>
  );
}
