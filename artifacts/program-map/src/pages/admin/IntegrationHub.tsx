import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Database, MessageSquare, Lock, Brain, FolderOpen, Calendar,
  MessageCircle, Mail, Layout as LayoutIcon, GraduationCap,
  ChevronRight, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, Plug, Key, Bot, Activity, BookOpen, Shield,
  Network, LogIn, LogOut, User, Loader2,
} from 'lucide-react';
import { useSalesforceAuth } from '@/hooks/useSalesforceAuth';

// ── Tab state ─────────────────────────────────────────────────────────────────

type Tab = 'connections' | 'capability' | 'config';

// ══════════════════════════════════════════════════════════════════════════════
//  CONNECTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

type ConnStatus = 'live' | 'live-partial' | 'configured' | 'needs-setup' | 'phase-2' | 'phase-3';

const CONN_STATUS: Record<ConnStatus, { label: string; dot: string; badge: string; cls: string }> = {
  'live':         { label: 'Live',        dot: 'bg-[#E6F0EA]0', badge: 'text-[#2F6B3F]', cls: 'border-[#9FC3AE] bg-[#E6F0EA]'   },
  'live-partial': { label: 'Live · Active', dot: 'bg-[#2F6B3F]', badge: 'text-[#2F6B3F]', cls: 'border-[#9FC3AE] bg-[#E6F0EA]'   },
  'configured':   { label: 'Configured',  dot: 'bg-[#EDF5F8]0',     badge: 'text-[#2F6F7E]',     cls: 'border-[#7FAFC6] bg-[#EDF5F8]'           },
  'needs-setup':  { label: 'Needs Setup', dot: 'bg-[#FFF3E0]0',   badge: 'text-[#CC8400]',   cls: 'border-[#FFD08A] bg-[#FFF3E0]'       },
  'phase-2':      { label: 'Phase 2',     dot: 'bg-[#C8CBC6]',   badge: 'text-slate-500',   cls: 'border-slate-200 bg-slate-50'       },
  'phase-3':      { label: 'Phase 3',     dot: 'bg-zinc-300',    badge: 'text-zinc-400',    cls: 'border-zinc-200 bg-zinc-50/60'      },
};

interface Connection {
  id: string;
  name: string;
  tagline: string;
  status: ConnStatus;
  icon: React.ComponentType<{ className?: string }>;
  iconCls: string;
  owner: string;
  detail: string;
  action: string;
  href: string;
  needs?: string;
}

const CONNECTIONS: Connection[] = [
  {
    id: 'salesforce', name: 'Salesforce', tagline: 'System of Record',
    status: 'live', icon: Database, iconCls: 'bg-[#EDF5F8] text-[#2F6F7E]', owner: 'Salesforce Admin',
    detail: 'REST API connected. PMM + NPSP confirmed. Active programs and learner records live.',
    action: 'Architecture', href: '/admin/salesforce-arch',
  },
  {
    id: 'google-oauth', name: 'Google OAuth', tagline: 'Auth Foundation',
    status: 'live', icon: Lock, iconCls: 'bg-[#E6F0EA] text-[#2F6B3F]', owner: 'IT Admin',
    detail: 'Refresh tokens active. Drive + Calendar + Gmail scopes confirmed. Wizard available for token rotation.',
    action: 'Manage', href: '/admin/integrations/google-auth',
  },
  {
    id: 'gemini', name: 'Gemini AI', tagline: `${TERMS.aiAssistant} Intelligence Layer`,
    status: 'live', icon: Brain, iconCls: 'bg-[#EDF5F8] text-[#2F6F7E]', owner: 'Admin',
    detail: `API key active and validated. Powers ${TERMS.aiAssistant} insights and context generation.`,
    action: 'Secrets', href: '/admin/integrations/secrets',
  },
  {
    id: 'google-drive', name: 'Google Drive', tagline: 'Content Repository',
    status: 'live', icon: FolderOpen, iconCls: 'bg-[#E6F0EA] text-[#2F6B3F]', owner: 'Ops Lead',
    detail: `OAuth active. ${TERMS.aiAssistant} Assets folder configured. Program workspace sync is Phase 2.`,
    action: 'Drive Config', href: '/admin/integrations/google-drive',
  },
  {
    id: 'google-calendar', name: 'Google Calendar', tagline: 'Timing & Trigger Layer',
    status: 'live', icon: Calendar, iconCls: 'bg-[#FFF3E0] text-[#CC8400]', owner: 'IT Admin',
    detail: 'OAuth active. Real events surfaced in the Calendar panel.',
    action: 'Calendar Config', href: '/admin/integrations/google-calendar',
    needs: 'Set GOOGLE_CALENDAR_ID in Secrets to enable per-program calendar queries',
  },
  {
    id: 'slack', name: 'Slack', tagline: 'Learner Delivery Channel',
    status: 'live-partial', icon: MessageSquare, iconCls: 'bg-[#EDF5F8] text-[#2F6F7E]', owner: 'Ops Lead',
    detail: '@penny posting live. POC scopes active.',
    action: 'Slack Config', href: '/collaboration/slack',
    needs: 'channels:read scope not yet approved — bot cannot list channels or members',
  },
  {
    id: 'agentforce', name: 'Agentforce', tagline: `${TERMS.aiAssistant}–Transition Trails Assistant`,
    status: 'live-partial', icon: Bot, iconCls: 'bg-cyan-50 text-cyan-700', owner: 'Salesforce Admin',
    detail: 'Sessions API wired. Dual-AI coaching active on Assessment page.',
    action: 'Agentforce', href: '/penny/agentforce',
  },
  {
    id: 'gmail', name: 'Gmail', tagline: 'Outbound Notifications',
    status: 'configured', icon: Mail, iconCls: 'bg-[#FBEAE6] text-[#A93F2F]', owner: 'Ops Lead',
    detail: 'Replit connector active. Read and send scopes enabled. Outbound routing is Phase 2.',
    action: 'Secrets', href: '/admin/integrations/secrets',
  },
  {
    id: 'google-chat', name: 'Google Chat', tagline: 'Client & Executive Channel',
    status: 'phase-3', icon: MessageCircle, iconCls: 'bg-zinc-50 text-zinc-400', owner: '—',
    detail: 'Google Chat spaces and DM delivery for programs using Google Workspace. Phase 3 — after Slack adapter MVP is validated.',
    action: '', href: '',
  },
  {
    id: 'mural', name: 'Mural', tagline: 'Visual Collaboration',
    status: 'phase-3', icon: LayoutIcon, iconCls: 'bg-zinc-50 text-zinc-400', owner: '—',
    detail: 'Whiteboard integration for sprint planning and retrospectives. Phase 3 — after Drive and collaboration foundations are complete.', action: '', href: '',
  },
  {
    id: 'lms', name: 'LMS', tagline: 'Learning Delivery Platform',
    status: 'phase-2', icon: GraduationCap, iconCls: 'bg-slate-50 text-slate-400', owner: '—',
    detail: 'Learning management system for content delivery and assessment.', action: '', href: '',
  },
];

function ConnectionCard({ conn: c, navigate }: { conn: Connection; navigate: (href: string) => void }) {
  const cfg = CONN_STATUS[c.status];
  const Icon = c.icon;
  const isDeferred = c.status === 'phase-2' || c.status === 'phase-3';

  return (
    <div className={`rounded-lg border p-3.5 bg-white flex flex-col gap-2 ${isDeferred ? 'opacity-55 border-dashed border-border/60' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${c.iconCls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground leading-tight">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.tagline}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 border rounded-full px-1.5 py-0.5 flex-shrink-0 ${cfg.cls}`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-[9px] font-bold whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.detail}</p>

      {c.needs && (
        <div className="flex items-start gap-1.5 rounded-md px-2 py-1.5 bg-[#FFF3E0] border border-[#FFF3E0]">
          <AlertTriangle className="w-3 h-3 text-[#CC8400] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#CC8400] leading-snug">{c.needs}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-0.5">
        <span className="text-[10px] text-muted-foreground/50">{c.owner}</span>
        {!isDeferred && c.href && (
          <button
            onClick={() => navigate(c.href)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/70 transition-colors"
          >
            {c.action}<ChevronRight className="w-3 h-3" />
          </button>
        )}
        {isDeferred && <span className="text-[10px] text-muted-foreground/40">{cfg.label}</span>}
      </div>
    </div>
  );
}

function SalesforceConnectionCard({ conn: c, navigate }: { conn: Connection; navigate: (href: string) => void }) {
  const cfg = CONN_STATUS[c.status];
  const Icon = c.icon;
  const { authenticated, user, loading, disconnect, disconnecting } = useSalesforceAuth();

  return (
    <div className="rounded-lg border border-border p-3.5 bg-white flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${c.iconCls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-foreground leading-tight">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.tagline}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 border rounded-full px-1.5 py-0.5 flex-shrink-0 ${cfg.cls}`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-[9px] font-bold whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.detail}</p>

      {loading ? (
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 bg-slate-50 border border-slate-100">
          <Loader2 className="w-3 h-3 text-slate-400 animate-spin flex-shrink-0" />
          <p className="text-[10px] text-slate-500">Checking your Salesforce session…</p>
        </div>
      ) : authenticated && user ? (
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-[#E6F0EA] border border-[#E6F0EA]">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3 h-3 text-[#2F6B3F] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[#245531] truncate">{user.username}</p>
              <p className="text-[9px] text-[#2F6B3F] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => disconnect()}
            disabled={disconnecting}
            className="flex items-center gap-1 text-[10px] font-semibold text-[#A93F2F] hover:text-[#A93F2F] transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
            Disconnect
          </button>
        </div>
      ) : (
        <a
          href="/api/auth/salesforce/login"
          className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 bg-[#2F6F7E] hover:bg-[#225968] transition-colors text-white text-[10px] font-semibold"
        >
          <LogIn className="w-3 h-3" />
          Connect your Salesforce account
        </a>
      )}

      <div className="flex items-center justify-between mt-auto pt-0.5">
        <span className="text-[10px] text-muted-foreground/50">{c.owner}</span>
        <button
          onClick={() => navigate(c.href)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/70 transition-colors"
        >
          {c.action}<ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function ConnectionsTab({ navigate }: { navigate: (href: string) => void }) {
  const live    = CONNECTIONS.filter(c => ['live', 'live-partial', 'configured'].includes(c.status));
  const needsSet = CONNECTIONS.filter(c => c.status === 'needs-setup');
  const phase2  = CONNECTIONS.filter(c => c.status === 'phase-2');
  const phase3  = CONNECTIONS.filter(c => c.status === 'phase-3');

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-4xl space-y-6">

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Live Connections</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {live.map(c =>
              c.id === 'salesforce'
                ? <SalesforceConnectionCard key={c.id} conn={c} navigate={navigate} />
                : <ConnectionCard key={c.id} conn={c} navigate={navigate} />
            )}
          </div>
        </div>

        {needsSet.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400]" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Needs Setup</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {needsSet.map(c => <ConnectionCard key={c.id} conn={c} navigate={navigate} />)}
            </div>
          </div>
        )}

        {phase2.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Phase 2 — Planned</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {phase2.map(c => <ConnectionCard key={c.id} conn={c} navigate={navigate} />)}
            </div>
          </div>
        )}

        {phase3.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-zinc-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Phase 3 — Planned</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {phase3.map(c => <ConnectionCard key={c.id} conn={c} navigate={navigate} />)}
            </div>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CAPABILITY MAP TAB
// ══════════════════════════════════════════════════════════════════════════════

type DepStatus = 'live' | 'partial' | 'needs-setup' | 'phase-2';

const DEP_STATUS: Record<DepStatus, { dot: string; badge: string; label: string }> = {
  live:          { dot: 'bg-[#E6F0EA]0', badge: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', label: 'Live'        },
  partial:       { dot: 'bg-[#CC8400]',   badge: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',       label: 'Partial'     },
  'needs-setup': { dot: 'bg-[#FBEAE6]0',    badge: 'bg-[#FBEAE6] border-[#E8B9B4] text-[#A93F2F]',           label: 'Needs Setup' },
  'phase-2':     { dot: 'bg-zinc-300',    badge: 'bg-zinc-50 border-zinc-200 text-zinc-500',           label: 'Phase 2'     },
};

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

const DOMAINS: DomainCard[] = [
  {
    id: 'ai-core', icon: Brain, title: `${TERMS.aiAssistant} AI Core`, subtitle: `What ${TERMS.aiAssistant} thinks with`,
    color: 'text-[#2F6F7E]', border: 'border-[#7FAFC6]', headerBg: 'bg-[#EDF5F8]', iconCls: 'bg-[#EDF5F8] text-[#2F6F7E]',
    deps: [
      { label: 'Gemini 2.5 Flash key',        status: 'live',    note: 'GEMINI_API_KEY active · billing confirmed · POST /api/penny/ask live · validated via /api/gemini/validate',                                         action: '/admin/integrations/secrets',  actionLabel: 'Secrets audit'     },
      { label: 'RAG knowledge corpus',         status: 'partial', note: `22 chunks active · 3 sources still Unverified — complete trust review in Knowledge Library to activate them in ${TERMS.aiAssistant}`,                              action: '/knowledge/sources',           actionLabel: 'Review sources'    },
      { label: 'Agentforce Sessions API',      status: 'live',    note: 'Dual-AI coaching wired · Assessment panel fires both Penny + Agentforce per Coach/Next click · Agent ID 0Xxan0…',                                 action: '/penny/assessments',           actionLabel: 'Open Assessments'  },
      { label: `${TERMS.aiAssistant} capability registry`,    status: 'live',    note: '12 confirmed capabilities · prompt library active · Trail Quests + Assessments live',                                                               action: '/penny/capabilities',          actionLabel: 'View capabilities' },
    ],
  },
  {
    id: 'data-access', icon: FolderOpen, title: 'Data Access', subtitle: `What ${TERMS.aiAssistant} reads`,
    color: 'text-[#2F6F7E]', border: 'border-[#7FAFC6]', headerBg: 'bg-[#EDF5F8]', iconCls: 'bg-[#EDF5F8] text-[#2F6F7E]',
    deps: [
      { label: 'Salesforce — Accounts, Contacts, Cases', status: 'live',        note: '127 Accounts · 129 Contacts · NPSP + PMM (7/8 objects) · read-only REST API live via Replit connector',                                   action: '/admin/integrations',          actionLabel: 'SF config'       },
      { label: 'Google Drive — Penny Asset Library',     status: 'live',        note: 'GOOGLE_DRIVE_PENNY_FOLDER_ID set · Shared Drive (TT Content → Penny Asset Library) · 6 state folders · 38 assets loaded',                action: '/penny/asset-library',         actionLabel: 'Asset Library'   },
      { label: 'Google Drive — Program folders',         status: 'needs-setup', note: 'Drive OAuth active and Shared Drive accessible. Next: create a Drive folder per program and link each in the Knowledge Source registry.', action: '/knowledge/sources',           actionLabel: 'Link folders'    },
      { label: 'SF Insights field mapping',              status: 'needs-setup', note: `Salesforce Accounts, Contacts, and Cases data is live. ${TERMS.aiAssistant} context fields (program match, risk level, engagement score) not yet mapped.`, action: '/operations/scorecards',       actionLabel: 'Map fields'      },
    ],
  },
  {
    id: 'channels', icon: MessageSquare, title: 'Channels & Comms', subtitle: `How ${TERMS.aiAssistant} communicates`,
    color: 'text-[#2F6B3F]', border: 'border-[#9FC3AE]', headerBg: 'bg-[#E6F0EA]', iconCls: 'bg-[#E6F0EA] text-[#2F6B3F]',
    deps: [
      { label: 'Slack bot (@penny)', status: 'partial', note: 'Bot posting confirmed to Penny AI + Admin channels. Missing: channels:read + groups:read scopes — add to Slack app manifest to resolve channel names.', action: '/collaboration/slack',          actionLabel: 'Slack config'  },
      { label: 'Gmail read + send',            status: 'live',    note: `gmail.readonly + gmail.send confirmed · Real inbox (15 threads) · ${TERMS.aiAssistant}-assisted draft + send via POST /api/gmail/send live`,                         action: '/collaboration/gmail',          actionLabel: 'Open Gmail'    },
      { label: 'Google Calendar events',       status: 'live',    note: `Real events via /api/calendar/events · ${TERMS.aiAssistant} prep briefs per event · pending invite flags live`,                                                      action: '/collaboration/calendar-live',  actionLabel: 'Open Calendar' },
      { label: 'Signal routing rules',         status: 'partial', note: `Collaboration Overview rule hub live — Slack, Gmail, Calendar, Drive channel rules visible and structured. Automated ${TERMS.aiAssistant} routing is Phase 2.`,      action: '/collaboration',                actionLabel: 'Edit rules'    },
    ],
  },
  {
    id: 'access', icon: Shield, title: 'Access Control', subtitle: `Who ${TERMS.aiAssistant} talks to`,
    color: 'text-[#CC8400]', border: 'border-[#FFD08A]', headerBg: 'bg-[#FFF3E0]', iconCls: 'bg-[#FFF3E0] text-[#CC8400]',
    deps: [
      { label: 'Google Sign-In (Clerk v6)',       status: 'live', note: 'Branded /sign-in · Google OAuth wired · ClerkProvider + proxy configured · signed-in/out gating live across all routes',                  action: '/admin/integrations/google-auth', actionLabel: 'Google Auth'   },
      { label: 'Google Groups auto-tier',         status: 'live', note: '3 Groups → Everyday / Power / Admin tiers · DWD service account configured · real-time group membership on every login via /api/auth/tier', action: '/admin/integrations',             actionLabel: 'View config'   },
      { label: `${TERMS.aiAssistant} tier-filtered responses`,   status: 'live', note: `RAG corpus filtered by access tier — Everyday / Power / Admin receive different context depth from ${TERMS.aiAssistant}`,                                  action: '/penny',                          actionLabel: 'Test Penny'    },
      { label: 'Role-gated routes & tabs',        status: 'live', note: 'HubShell tier guards active · Admin+ tabs, actions, and sidebar items hidden from Everyday users',                                         action: '/admin/integrations',             actionLabel: 'Integrations'  },
    ],
  },
  {
    id: 'content', icon: BookOpen, title: 'Content & Knowledge', subtitle: `What ${TERMS.aiAssistant} knows`,
    color: 'text-[#A93F2F]', border: 'border-[#E8B9B4]', headerBg: 'bg-[#FBEAE6]', iconCls: 'bg-[#FBEAE6] text-[#A93F2F]',
    deps: [
      { label: 'Knowledge source library',    status: 'partial',    note: `Sources, Library, and Org Memory tabs live · 3 sources Unverified — complete trust review for each to activate in ${TERMS.aiAssistant} RAG`,       action: '/knowledge/sources', actionLabel: 'Review sources' },
      { label: `${TERMS.aiAssistant} Asset Library`,         status: 'live',       note: `38 assets across 6 ${TERMS.aiAssistant} states · Drive-backed thumbnails · grid + list views · 3-per-row face-anchored at /penny/asset-library`,   action: '/penny/asset-library', actionLabel: 'Open Library'  },
      { label: 'Salesforce KB sync',          status: 'needs-setup', note: 'REST API live querying Accounts/Contacts/Cases. SF Knowledge Base object not yet connected to Knowledge Library.',                  action: '/knowledge/sources', actionLabel: 'Configure'      },
      { label: 'Org Memory decision records', status: 'phase-2',    note: 'Org Memory tab built — decision record creation, structured templates, and AI indexing are Phase 2.',                                action: '/knowledge/memory',  actionLabel: 'View Memory'   },
    ],
  },
  {
    id: 'ops', icon: Activity, title: 'Operations & Health', subtitle: 'How Penny monitors',
    color: 'text-zinc-700', border: 'border-zinc-200', headerBg: 'bg-zinc-100', iconCls: 'bg-zinc-100 text-zinc-600',
    deps: [
      { label: 'Health dashboard',                status: 'live',    note: 'Program health scores, last check-in, coach assignment, and risk flags live at /operations/health',                                  action: '/operations/health',      actionLabel: 'View Health'    },
      { label: 'Demand pipeline (cases + epics)', status: 'live',    note: 'SF Cases live · Demand intake, epics, features, stories, roadmap built · Penny focus on case click',                                action: '/demand/cases',           actionLabel: 'View Cases'     },
      { label: 'Scorecard live data feed',        status: 'partial', note: 'Scorecards built and displaying · direct SF data wiring to scorecard metrics is Phase 2',                                           action: '/operations/scorecards',  actionLabel: 'View Scorecards'},
      { label: 'Trail Signals auto-assignment',   status: 'partial', note: 'System-assigned by tier, role, context, and program ownership · user-configurable signal selection Phase 2 · GA4 integration Phase 3',   action: '/navigator/program-map',  actionLabel: 'View Signals'   },
    ],
  },
];

function domainScore(card: DomainCard) {
  const live = card.deps.filter(d => d.status === 'live').length;
  return Math.round((live / card.deps.length) * 100);
}

function CapabilityTab({ navigate }: { navigate: (href: string) => void }) {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [expandedDep,    setExpandedDep]    = useState<string | null>(null);

  const activeDomain = DOMAINS.find(d => d.id === selectedDomain) ?? null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* Domain cards column */}
      <div className={`overflow-auto transition-all duration-300 ${activeDomain ? 'w-80 shrink-0 border-r border-border' : 'flex-1'}`}>
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className={`grid gap-3 ${activeDomain ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {DOMAINS.map(d => {
                const score    = domainScore(d);
                const Icon     = d.icon;
                const isActive = selectedDomain === d.id;
                const barColor = score === 100 ? 'bg-[#E6F0EA]0' : score >= 50 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]';
                const pctColor = score === 100 ? 'text-[#2F6B3F]' : score >= 50 ? 'text-[#CC8400]' : 'text-[#A93F2F]';
                return (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDomain(isActive ? null : d.id); setExpandedDep(null); }}
                    className={`text-left rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
                      isActive ? `${d.border} shadow-md` : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className={`px-3.5 py-2.5 ${isActive ? d.headerBg : 'bg-card'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${d.iconCls}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-[12px] font-bold leading-tight ${isActive ? d.color : 'text-foreground'}`}>{d.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-8">{d.subtitle}</p>
                    </div>
                    <div className="px-3.5 py-2.5 bg-card">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex gap-1">
                          {d.deps.map(dep => (
                            <span key={dep.label} className={`w-2 h-2 rounded-full ${DEP_STATUS[dep.status].dot}`} title={dep.label} />
                          ))}
                        </div>
                        <span className={`text-[11px] font-bold ${pctColor}`}>{score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
                      </div>
                      {!activeDomain && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                          {d.deps.filter(dep => dep.status === 'live').length}/{d.deps.length} ready · click to inspect
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Detail panel */}
      {activeDomain && (
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          <div className={`flex-shrink-0 px-5 py-3.5 border-b ${activeDomain.headerBg} flex items-center gap-3`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeDomain.iconCls}`}>
              <activeDomain.icon className="w-[18px] h-[18px]" />
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

          <ScrollArea className="flex-1">
            <div className="p-5 space-y-2.5">
              {activeDomain.deps.map(dep => {
                const s      = DEP_STATUS[dep.status];
                const key    = activeDomain.id + dep.label;
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
                      <div className="px-4 pb-4 pt-2.5 border-t border-border bg-muted/20 space-y-2.5">
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{dep.note}</p>
                        {dep.action && dep.actionLabel && (
                          <button
                            onClick={() => navigate(dep.action!)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/70 transition-colors"
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
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONFIG & TOOLS TAB
// ══════════════════════════════════════════════════════════════════════════════

interface ConfigLink {
  id: string;
  name: string;
  detail: string;
  href: string;
  badge: string;
  badgeCls: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SETUP_PAGES: ConfigLink[] = [
  { id: 'secrets',       name: 'Secrets & Credentials',  detail: 'Presence and format check plus live API validation for Gemini and Google.', href: '/admin/integrations/secrets',         badge: 'Audit tool',     badgeCls: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',       icon: Key          },
  { id: 'google-auth',   name: 'Google OAuth',            detail: 'OAuth wizard for Drive, Calendar, and Gmail refresh tokens.',               href: '/admin/integrations/google-auth',     badge: 'Auth',           badgeCls: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]', icon: Lock     },
  { id: 'drive',         name: 'Google Drive Config',     detail: `${TERMS.aiAssistant} Asset Library setup and program folder configuration.`,               href: '/admin/integrations/google-drive',    badge: 'Drive Config',   badgeCls: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]',   icon: FolderOpen   },
  { id: 'calendar',      name: 'Google Calendar Config',  detail: 'Calendar IDs, cohort event mapping, and event-trigger readiness.',          href: '/admin/integrations/google-calendar', badge: 'Calendar',       badgeCls: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',   icon: Calendar     },
  { id: 'signal-rules',  name: 'Signal Rules',            detail: `Configure how each channel routes signals to ${TERMS.aiAssistant} and ${TERMS.trailSignals}.`,     href: '/collaboration',                      badge: 'Channel Rules',  badgeCls: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]', icon: MessageSquare },
];

const GOVERNANCE_LINKS: ConfigLink[] = [
  { id: 'irc',              name: 'Integration Readiness Center', detail: 'Full planning workspace — auth, field mapping, sync readiness, and risk register.',                  href: '/admin/integration-readiness', badge: 'Planning',      badgeCls: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',   icon: Plug         },
  { id: 'phase1-audit',     name: 'Penny Capability Build Audit', detail: 'UX compliance review, prototype content inventory, and Penny capability build assessment.',           href: '/admin/phase1-audit',          badge: 'Audit',         badgeCls: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]', icon: CheckCircle2 },
  { id: 'access',           name: 'Access & Roles',              detail: 'Google Groups → Trail OS tier mapping, navigation visibility, and feature capability grid.',          href: '/admin/people-access',         badge: 'Access tiers',  badgeCls: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]', icon: Lock         },
  { id: 'sf-validation',    name: 'SF Validation Center',        detail: 'Trail OS ↔ Salesforce object mappings, product readiness scores, and field-level validation.',       href: '/admin/sf-validation',         badge: 'SF Readiness',  badgeCls: 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',      icon: Database     },
  { id: 'program-resources',name: 'Program Drive Workspaces',    detail: 'Google Drive folder URLs, shared drive IDs, permissions, and sync status per program.',               href: '/admin/program-resources',     badge: 'Drive Config',  badgeCls: 'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]',   icon: FolderOpen   },
];

function ConfigRow({ link, navigate }: { link: ConfigLink; navigate: (href: string) => void }) {
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
        <p className="text-[11px] text-muted-foreground leading-snug">{link.detail}</p>
      </div>
    </button>
  );
}

function ConfigTab({ navigate }: { navigate: (href: string) => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-3xl space-y-6">

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Setup & Configuration</p>
          <div className="grid grid-cols-2 gap-2">
            {SETUP_PAGES.map(link => <ConfigRow key={link.id} link={link} navigate={navigate} />)}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Governance & Readiness</p>
          <div className="grid grid-cols-2 gap-2">
            {GOVERNANCE_LINKS.map(link => <ConfigRow key={link.id} link={link} navigate={navigate} />)}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHELL
// ══════════════════════════════════════════════════════════════════════════════

const TABS: { id: Tab; label: string }[] = [
  { id: 'config',      label: 'Config & Tools' },
  { id: 'capability',  label: 'Capability Map' },
  { id: 'connections', label: 'Connections'   },
];

export default function IntegrationHub() {
  const [, navigate]   = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('config');

  const liveCount  = CONNECTIONS.filter(c => c.status === 'live' || c.status === 'live-partial').length;
  const needsCount = CONNECTIONS.filter(c => c.status === 'needs-setup' || c.status === 'configured').length;

  const allDeps    = DOMAINS.flatMap(d => d.deps);
  const partCount  = allDeps.filter(d => d.status === 'partial' || d.status === 'needs-setup').length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-3 pb-0 border-b bg-card">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration</p>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">Integrations</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Connection status, Penny capability readiness, and setup tools.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <div className="flex items-center gap-1.5 bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              <span className="text-[11px] font-semibold text-[#2F6B3F]">{liveCount} live</span>
            </div>
            {needsCount > 0 && (
              <div className="flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFF3E0]0" />
                <span className="text-[11px] font-semibold text-[#CC8400]">{needsCount} need action</span>
              </div>
            )}
            {partCount > 0 && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
                <Network className="w-3 h-3 text-zinc-500" />
                <span className="text-[11px] font-semibold text-zinc-600">{partCount} dep gaps</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'connections' && <ConnectionsTab navigate={navigate} />}
        {activeTab === 'capability'  && <CapabilityTab  navigate={navigate} />}
        {activeTab === 'config'      && <ConfigTab      navigate={navigate} />}
      </div>

    </div>
  );
}
