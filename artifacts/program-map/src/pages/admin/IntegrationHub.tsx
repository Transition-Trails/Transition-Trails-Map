import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Lock, Key, FolderOpen, Calendar, Mail, Database,
  MessageSquare, Brain, Bot, CheckCircle2, AlertTriangle,
  Clock, ChevronRight, Plug, Shield,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type IntegStatus = 'live' | 'live-partial' | 'configured' | 'needs-auth' | 'needs-setup' | 'phase-2';

const STATUS_CFG: Record<IntegStatus, { label: string; dot: string; cls: string; badge: string }> = {
  'live':         { label: 'Live',        dot: 'bg-emerald-500', cls: 'bg-emerald-50 border-emerald-200', badge: 'text-emerald-700' },
  'live-partial': { label: 'Live · POC',  dot: 'bg-emerald-400', cls: 'bg-emerald-50 border-emerald-200', badge: 'text-emerald-700' },
  'configured':   { label: 'Configured',  dot: 'bg-sky-500',     cls: 'bg-sky-50 border-sky-200',         badge: 'text-sky-700' },
  'needs-auth':   { label: 'Needs Auth',  dot: 'bg-amber-500',   cls: 'bg-amber-50 border-amber-200',     badge: 'text-amber-700' },
  'needs-setup':  { label: 'Needs Setup', dot: 'bg-amber-400',   cls: 'bg-amber-50 border-amber-200',     badge: 'text-amber-700' },
  'phase-2':      { label: 'Phase 2',     dot: 'bg-slate-400',   cls: 'bg-slate-50 border-slate-200',     badge: 'text-slate-500' },
};

interface IntegCard {
  id: string;
  name: string;
  tagline: string;
  status: IntegStatus;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  detail: string;
  action: string;
  href: string;
  needs?: string;
}

// ── Data ─────────────────────────────────────────────────────────────────────

const INTEGRATIONS: IntegCard[] = [
  {
    id: 'google-oauth',
    name: 'Google OAuth',
    tagline: 'Auth Foundation',
    status: 'live',
    icon: Lock,
    iconCls: 'bg-emerald-50 text-emerald-700',
    detail: 'OAuth client credentials active. Drive + Calendar + Gmail scopes registered. Re-run the wizard anytime to rotate tokens.',
    action: 'Open Auth Wizard',
    href: '/admin/integrations/google-auth',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    tagline: 'Mail Panel & Notifications',
    status: 'needs-auth',
    icon: Mail,
    iconCls: 'bg-rose-50 text-rose-700',
    detail: 'gmail.readonly + gmail.send scopes added to the OAuth wizard. Run the wizard and save the result as GOOGLE_GMAIL_REFRESH_TOKEN to activate the Mail panel.',
    action: 'Authorize Gmail',
    href: '/admin/integrations/google-auth',
    needs: 'Re-run OAuth wizard → copy refresh token → save as GOOGLE_GMAIL_REFRESH_TOKEN in Replit Secrets',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    tagline: 'Content Repository',
    status: 'live',
    icon: FolderOpen,
    iconCls: 'bg-green-50 text-green-700',
    detail: 'OAuth refresh token active. Replit connector live. Drive folder structure defined. Program workspace sync is Phase 2.',
    action: 'Drive Config',
    href: '/admin/integrations/google-drive',
    needs: 'Wire first program folder read to Drive workspace panel',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    tagline: 'Timing & Trigger Layer',
    status: 'live',
    icon: Calendar,
    iconCls: 'bg-amber-50 text-amber-700',
    detail: 'OAuth refresh token active. Replit connector live. Cohort event model defined. Calendar panel live. Event-trigger wiring is Phase 2.',
    action: 'Calendar Config',
    href: '/admin/integrations/google-calendar',
    needs: 'Map program-specific Google Calendar IDs for cohort-scoped event queries',
  },
  {
    id: 'secrets',
    name: 'Secrets & Credentials',
    tagline: 'Token Health',
    status: 'live',
    icon: Key,
    iconCls: 'bg-sky-50 text-sky-700',
    detail: 'Two-layer audit — presence and format check plus live API validation for Gemini and Google. Run anytime after adding or rotating tokens.',
    action: 'Secrets Audit',
    href: '/admin/integrations/secrets',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    tagline: 'System of Record',
    status: 'live',
    icon: Database,
    iconCls: 'bg-blue-50 text-blue-700',
    detail: 'REST API connected via Replit connector. PMM + NPSP confirmed. 5 active programs, 247 learner records live.',
    action: 'View Architecture',
    href: '/admin/salesforce-arch',
    needs: 'Wire first data query to health dashboard',
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Learner Delivery Channel',
    status: 'live-partial',
    icon: MessageSquare,
    iconCls: 'bg-violet-50 text-violet-700',
    detail: '@coachconnectbot posting live. POC scopes active. Manage channel mappings and validate the bot in the Collaboration section.',
    action: 'Slack Integration',
    href: '/collaboration/slack',
    needs: 'Add channels:read scope for full channel access',
  },
  {
    id: 'gemini',
    name: 'Gemini AI',
    tagline: 'Penny Intelligence',
    status: 'live',
    icon: Brain,
    iconCls: 'bg-secondary/10 text-secondary',
    detail: 'API key present and validated. gemini-2.5-flash model active. Powers Penny insights and context generation.',
    action: 'Secrets Audit',
    href: '/admin/integrations/secrets',
  },
  {
    id: 'agentforce',
    name: 'Agentforce',
    tagline: 'Penny–Salesforce Assistant',
    status: 'live-partial',
    icon: Bot,
    iconCls: 'bg-cyan-50 text-cyan-700',
    detail: 'Sessions API wired. AGENTFORCE_API_KEY set. Dual-AI coaching active — Assessment page fires both Penny and Agentforce in parallel per learner.',
    action: 'Agentforce Center',
    href: '/penny/agentforce',
    needs: 'Map learnerId to Salesforce Contact ID for full context handoff',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    tagline: 'Client & Executive Channel',
    status: 'needs-setup',
    icon: MessageSquare,
    iconCls: 'bg-teal-50 text-teal-700',
    detail: 'Spaces and webhook model defined. Service account auth and webhook URL not yet configured.',
    action: 'Integration Plan',
    href: '/admin/integration-readiness',
    needs: 'Configure Google Workspace service account with Chat API scope',
  },
];

// ── Quick-action cards (top of page) ─────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'gmail-auth',
    label: 'Authorize Gmail',
    desc: 'Re-run OAuth wizard to activate the Mail panel',
    href: '/admin/integrations/google-auth',
    icon: Lock,
    urgent: true,
  },
  {
    id: 'secrets',
    label: 'Secrets Audit',
    desc: 'Check all tokens are present and valid',
    href: '/admin/integrations/secrets',
    icon: Key,
  },
  {
    id: 'drive',
    label: 'Google Drive',
    desc: 'Folder structure and program workspace config',
    href: '/admin/integrations/google-drive',
    icon: FolderOpen,
  },
  {
    id: 'calendar',
    label: 'Google Calendar',
    desc: 'Calendar IDs and cohort event mapping',
    href: '/admin/integrations/google-calendar',
    icon: Calendar,
  },
  {
    id: 'readiness',
    label: 'Integration Readiness',
    desc: 'Full planning workspace — 17 integrations, auth, risks',
    href: '/admin/integration-readiness',
    icon: Plug,
  },
  {
    id: 'sf-validation',
    label: 'Salesforce Validation',
    desc: '16 Trail OS ↔ SF object mappings and readiness scores',
    href: '/admin/sf-validation',
    icon: Shield,
  },
];

// ── Card component ────────────────────────────────────────────────────────────

function IntegCard({ card, nav }: { card: IntegCard; nav: (h: string) => void }) {
  const cfg = STATUS_CFG[card.status];
  const Icon = card.icon;
  const isLive = card.status === 'live' || card.status === 'live-partial';
  const needsAttn = card.status === 'needs-auth' || card.status === 'needs-setup';

  return (
    <div className={`rounded-lg border p-3.5 bg-white flex flex-col gap-2.5 ${needsAttn ? 'border-amber-300 ring-1 ring-amber-200' : 'border-border'}`}>
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
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={`text-[10px] font-bold whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{card.detail}</p>

      {card.needs && (
        <div className={`flex items-start gap-1.5 rounded-md px-2.5 py-2 ${isLive ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
          {isLive
            ? <ChevronRight className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
          }
          <p className={`text-[10px] leading-snug ${isLive ? 'text-blue-700' : 'text-amber-800'}`}>{card.needs}</p>
        </div>
      )}

      <div className="mt-auto pt-0.5">
        <button
          onClick={() => nav(card.href)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {card.action} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationHub() {
  const [, setLocation] = useLocation();

  const liveCount  = INTEGRATIONS.filter(c => c.status === 'live' || c.status === 'live-partial').length;
  const alertCount = INTEGRATIONS.filter(c => c.status === 'needs-auth' || c.status === 'needs-setup').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 pt-3 pb-2.5 border-b bg-card">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Integrations</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Manage every external connection — auth, token rotation, config, and validation — in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700">{liveCount} live</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[11px] font-semibold text-amber-700">{alertCount} need action</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl space-y-6">

          {/* ── Quick actions ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Quick Actions</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map(qa => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.id}
                    onClick={() => setLocation(qa.href)}
                    className={`rounded-lg border p-3 text-left hover:shadow-sm transition-all group flex items-start gap-2.5 ${
                      qa.urgent
                        ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                        : 'border-border bg-white hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${qa.urgent ? 'bg-amber-100 text-amber-700' : 'bg-muted/40 text-muted-foreground'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[12px] font-bold leading-tight ${qa.urgent ? 'text-amber-900' : 'text-foreground'}`}>{qa.label}</p>
                      <p className={`text-[10px] leading-snug mt-0.5 ${qa.urgent ? 'text-amber-700' : 'text-muted-foreground'}`}>{qa.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Integration status grid ── */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/60" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">All Integrations</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {INTEGRATIONS.map(card => (
                <IntegCard key={card.id} card={card} nav={setLocation} />
              ))}
            </div>
          </div>

          {/* ── Phase 2 footer note ── */}
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 p-3">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground/60">
              Mural and LMS integrations are planned for Phase 2 (Q4 2025). Gmail, Google Chat, and full Agentforce context handoff are on the Phase 2 backlog.{' '}
              <button onClick={() => setLocation('/admin/phase2-backlog')} className="text-primary hover:underline font-medium">View backlog →</button>
            </p>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
