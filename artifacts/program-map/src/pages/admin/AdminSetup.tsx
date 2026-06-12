import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Database, MessageSquare, Lock, Brain, FolderOpen, Calendar,
  MessageCircle, Mail, Layout as LayoutIcon, GraduationCap,
  CheckSquare, ChevronRight, ExternalLink, AlertTriangle, CheckCircle2,
  Clock, Plug, Layers, Key,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ── Status model for the Setup command center ────────────────────────────────
// This is the operational/configuration status layer — distinct from the
// planning-readiness model in IntegrationReadinessCenter.

type SetupStatus =
  | 'live'           // connected and working
  | 'live-partial'   // connected, needs additional config
  | 'configured'     // auth set up, not yet syncing
  | 'needs-auth'     // auth incomplete, config needed
  | 'needs-setup'    // defined in prototype, not yet configured
  | 'phase-2';       // planned for a future phase

const STATUS_CONFIG: Record<SetupStatus, { label: string; dot: string; cls: string; badge: string }> = {
  'live':          { label: 'Live',           dot: 'bg-emerald-500', cls: 'bg-emerald-50 border-emerald-200', badge: 'text-emerald-700' },
  'live-partial':  { label: 'Live · POC',     dot: 'bg-emerald-400', cls: 'bg-emerald-50 border-emerald-200', badge: 'text-emerald-700' },
  'configured':    { label: 'Configured',     dot: 'bg-sky-500',     cls: 'bg-sky-50 border-sky-200',         badge: 'text-sky-700' },
  'needs-auth':    { label: 'Needs Auth',     dot: 'bg-amber-500',   cls: 'bg-amber-50 border-amber-200',     badge: 'text-amber-700' },
  'needs-setup':   { label: 'Needs Setup',    dot: 'bg-amber-400',   cls: 'bg-amber-50 border-amber-200',     badge: 'text-amber-700' },
  'phase-2':       { label: 'Phase 2',        dot: 'bg-slate-400',   cls: 'bg-slate-50 border-slate-200',     badge: 'text-slate-500' },
};

interface SetupCard {
  id: string;
  name: string;
  tagline: string;
  status: SetupStatus;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  owner: string;
  detail: string;
  lastCheck?: string;
  action: string;
  href: string;
  needs?: string;  // what is the one thing needed right now
}

interface ReadinessLink {
  id: string;
  name: string;
  detail: string;
  action: string;
  href: string;
  badge: string;
  badgeCls: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const LIVE_INTEGRATIONS: SetupCard[] = [
  {
    id: 'salesforce',
    name: 'Salesforce',
    tagline: 'System of Record',
    status: 'live',
    icon: Database,
    iconCls: 'bg-blue-50 text-blue-700',
    owner: 'Salesforce Admin',
    detail: 'REST API connected. PMM + NPSP confirmed. 5 active programs, 247 learner records live.',
    lastCheck: 'Today',
    action: 'View Architecture',
    href: '/admin/salesforce-arch',
    needs: 'Wire first data query to health dashboard — see /api/salesforce/validate',
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Learner Delivery Channel',
    status: 'live-partial',
    icon: MessageSquare,
    iconCls: 'bg-violet-50 text-violet-700',
    owner: 'Ops Lead',
    detail: '@coachconnectbot posting live. POC scopes active.',
    lastCheck: 'Today',
    action: 'Manage Integration',
    href: '/collaboration/slack',
    needs: 'Add channels:read scope for full channel access and member list',
  },
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    tagline: 'Auth Foundation',
    status: 'configured',
    icon: Lock,
    iconCls: 'bg-emerald-50 text-emerald-700',
    owner: 'IT Admin',
    detail: 'Redirect URI set. OAuth client ID public and safe in URL.',
    lastCheck: 'This week',
    action: 'Auth Wizard',
    href: '/admin/google-oauth',
    needs: 'Run wizard once per environment to generate and store refresh token',
  },
  {
    id: 'gemini',
    name: 'Gemini AI',
    tagline: 'Penny Intelligence Layer',
    status: 'live',
    icon: Brain,
    iconCls: 'bg-secondary/10 text-secondary',
    owner: 'Admin',
    detail: 'API key present and validated. Powers Penny Insights and context generation.',
    lastCheck: 'Today',
    action: 'Secrets Audit',
    href: '/admin/secrets-audit',
  },
];

const NEEDS_CONFIG: SetupCard[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    tagline: 'Content Repository',
    status: 'needs-setup',
    icon: FolderOpen,
    iconCls: 'bg-green-50 text-green-700',
    owner: 'Ops Lead',
    detail: 'Drive folder structure defined in prototype. Live API sync and OAuth token not configured.',
    action: 'Integration Plan',
    href: '/admin/integration-readiness',
    needs: 'Configure OAuth scopes (drive.readonly) and store refresh token',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    tagline: 'Timing & Trigger Layer',
    status: 'needs-auth',
    icon: Calendar,
    iconCls: 'bg-amber-50 text-amber-700',
    owner: 'IT Admin',
    detail: 'API endpoints and object model defined. OAuth scopes and refresh token not yet configured.',
    action: 'Auth Wizard',
    href: '/admin/google-oauth',
    needs: 'Add calendar.readonly scope in Google Auth wizard',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    tagline: 'Client & Executive Channel',
    status: 'needs-setup',
    icon: MessageCircle,
    iconCls: 'bg-teal-50 text-teal-700',
    owner: 'Ops Lead',
    detail: 'Spaces and webhook model defined. Service account auth and webhook URL not configured.',
    action: 'Integration Plan',
    href: '/admin/integration-readiness',
    needs: 'Configure Google Workspace service account with Chat API scope',
  },
];

interface Phase2Item { id: string; name: string; tagline: string; phase: string; detail: string }

const PHASE_2: Phase2Item[] = [
  { id: 'gmail',      name: 'Gmail / Email',   tagline: 'Outbound Notifications',    phase: 'Q3 2025', detail: 'Outbound email routing for cohort updates and Penny digests.' },
  { id: 'mural',      name: 'Mural',           tagline: 'Visual Collaboration',       phase: 'Q4 2025', detail: 'Whiteboard integration for sprint planning and retrospectives.' },
  { id: 'lms',        name: 'LMS',             tagline: 'Learning Delivery Platform', phase: 'Q3 2025', detail: 'Learning management system for content delivery and assessment.' },
  { id: 'agentforce', name: 'Agentforce',      tagline: 'Penny AI Upgrade',           phase: 'Q4 2025', detail: 'Salesforce Agentforce to upgrade Penny beyond standalone POC.' },
];

const READINESS_LINKS: ReadinessLink[] = [
  {
    id: 'irc',
    name: 'Integration Readiness Center',
    detail: '17 integrations planned. Avg readiness 34%. 10 open risks. Full planning workspace with auth, field mapping, sync, and risk register.',
    action: 'Open Center',
    href: '/admin/integration-readiness',
    badge: '34% ready',
    badgeCls: 'bg-amber-50 border-amber-200 text-amber-700',
    icon: Plug,
  },
  {
    id: 'secrets',
    name: 'Secrets & Credentials',
    detail: 'Two-layer audit of all integration secrets — presence and format check plus live API validation for Gemini and Google.',
    action: 'Secrets Audit',
    href: '/admin/secrets-audit',
    badge: 'Audit tool',
    badgeCls: 'bg-sky-50 border-sky-200 text-sky-700',
    icon: Key,
  },
  {
    id: 'phase1',
    name: 'Phase 1 Readiness',
    detail: 'Architecture consolidation readiness — integration scores, capability progress, and blockers across all Phase 1 workstreams.',
    action: 'View Readiness',
    href: '/admin/phase1-readiness',
    badge: 'Phase 1',
    badgeCls: 'bg-amber-50 border-amber-200 text-amber-700',
    icon: CheckCircle2,
  },
  {
    id: 'phase2',
    name: 'Phase 2 Backlog',
    detail: '10 draft feature cards for Phase 2 — Penny panel, Trail Signals control, Gmail, Calendar panels, Google Auth, Mural, and more.',
    action: 'View Backlog',
    href: '/admin/phase2-backlog',
    badge: '10 features',
    badgeCls: 'bg-stone-50 border-stone-200 text-stone-600',
    icon: Layers,
  },
  {
    id: 'ux',
    name: 'Phase 1 UX Standards',
    detail: 'Codified design rules for Trail OS Phase 1 — navigation, layout, role-aware views, right panel, language, and responsiveness.',
    action: 'View Standards',
    href: '/admin/ux-standards',
    badge: 'Standards',
    badgeCls: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    icon: LayoutIcon,
  },
  {
    id: 'access',
    name: 'Access & Roles',
    detail: 'Google Groups → Trail OS tier mapping, navigation visibility matrix, and feature capability grid by access level.',
    action: 'View Matrix',
    href: '/admin/people-access',
    badge: '4 tiers',
    badgeCls: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    icon: Lock,
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function IntegrationCard({ card, navigate }: { card: SetupCard; navigate: (href: string) => void }) {
  const cfg = STATUS_CONFIG[card.status];
  const Icon = card.icon;
  const isLive = card.status === 'live' || card.status === 'live-partial';
  const needsAttention = card.status === 'needs-auth' || card.status === 'needs-setup';

  return (
    <div className={`rounded-lg border p-3.5 bg-white flex flex-col gap-2.5 ${needsAttention ? 'border-amber-200' : 'border-border'}`}>
      {/* Top row: icon + name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${card.iconCls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground leading-tight">{card.name}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{card.tagline}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 border rounded-full px-2 py-0.5 flex-shrink-0 ${cfg.cls}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
          <span className={`text-[10px] font-bold whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Detail */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">{card.detail}</p>

      {/* Next step */}
      {card.needs && (
        <div className={`flex items-start gap-1.5 rounded-md px-2.5 py-2 ${isLive ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
          {isLive
            ? <ChevronRight className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-[10px] leading-snug ${isLive ? 'text-blue-700' : 'text-amber-800'}`}>{card.needs}</p>
        </div>
      )}

      {/* Footer: owner + last check + action */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-0.5">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
          <span>{card.owner}</span>
          {card.lastCheck && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{card.lastCheck}
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => navigate(card.href)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex-shrink-0"
        >
          {card.action}<ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ReadinessRow({ link, navigate }: { link: ReadinessLink; navigate: (href: string) => void }) {
  const Icon = link.icon;
  return (
    <button
      onClick={() => navigate(link.href)}
      className="w-full rounded-lg border border-border bg-white p-3 text-left hover:border-primary/30 hover:shadow-sm transition-all group flex items-start gap-3"
    >
      <div className="w-7 h-7 rounded-md bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-[12px] font-bold text-foreground leading-tight">{link.name}</p>
          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 flex-shrink-0 ${link.badgeCls}`}>{link.badge}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{link.detail}</p>
      </div>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-primary flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {link.action}<ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSetup() {
  const [, setLocation] = useLocation();

  const liveCount   = LIVE_INTEGRATIONS.filter(c => c.status === 'live' || c.status === 'live-partial').length;
  const needsCount  = NEEDS_CONFIG.length;
  const partialCount = LIVE_INTEGRATIONS.filter(c => c.status === 'live-partial' || c.status === 'configured').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Compact admin header ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 pt-3 pb-2.5 border-b bg-card">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration · Setup</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Integration & Readiness</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            One view of every integration, configuration requirement, and readiness workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700">{liveCount} live</span>
          </div>
          {(needsCount + partialCount) > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700">{needsCount + partialCount} need action</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl space-y-6">

          {/* ── Section 1: Live Connections ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Live Connections</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {LIVE_INTEGRATIONS.map(card => (
                <IntegrationCard key={card.id} card={card} navigate={setLocation} />
              ))}
            </div>
          </div>

          {/* ── Section 2: Needs Configuration ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Needs Configuration</p>
              <Badge variant="secondary" className="text-[10px] font-semibold">{needsCount} pending</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {NEEDS_CONFIG.map(card => (
                <IntegrationCard key={card.id} card={card} navigate={setLocation} />
              ))}
            </div>
          </div>

          {/* ── Section 3: Phase 2 — Planned ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Phase 2 — Planned</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_2.map(item => (
                <div key={item.id} className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3 flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[12px] font-semibold text-muted-foreground/70 leading-tight">{item.name}</p>
                      <span className="text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">{item.phase}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 leading-snug">{item.tagline} — {item.detail}</p>
                  </div>
                </div>
              ))}
              {/* Full backlog link */}
              <button
                onClick={() => setLocation('/admin/phase2-backlog')}
                className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-3 flex items-center justify-between hover:border-primary/30 hover:bg-muted/20 transition-all col-span-2 group"
              >
                <p className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">View full Phase 2 backlog — 10 feature cards</p>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </button>
            </div>
          </div>

          {/* ── Section 4: Platform Readiness & Governance ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Plug className="w-3.5 h-3.5 text-muted-foreground/60" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Platform Readiness & Governance</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {READINESS_LINKS.map(link => (
                <ReadinessRow key={link.id} link={link} navigate={setLocation} />
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
