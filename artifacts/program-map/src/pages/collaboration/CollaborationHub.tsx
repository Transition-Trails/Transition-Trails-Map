/**
 * CollaborationHub — single entry point for Collaboration.
 *
 * 4 tabs:
 *   Overview  — live service status, signal routing summary, quick nav
 *   Comms     — Gmail + Calendar in one place (inner tab switcher)
 *   Signals   — personal Trail Signal configuration
 *   Channels  — admin: channel catalog, templates, notification rules, briefs
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import {
  LayoutDashboard, Mail, Radio, Network, MessageSquare,
  CheckCircle2, AlertCircle, Clock, RefreshCw,
  Slack, HardDrive, CalendarDays, ChevronRight,
  Zap, ArrowRight, Hash, FileText, Bell, Settings2, Save, Timer,
} from 'lucide-react';

// Tab content — existing components
import GmailCenter    from './GmailCenter';
import CalendarPanel  from './CalendarPanel';
import MyTrailSignals from './MyTrailSignals';
import CommChannels       from '@/pages/communications/CommChannels';
import CommNotifications  from '@/pages/communications/CommNotifications';
import WeeklyBriefs       from '@/pages/communications/WeeklyBriefs';
import MessageTemplates   from '@/pages/communications/MessageTemplates';

// ── Live-data types ───────────────────────────────────────────────────────────

interface SlackValidation { status: string; passed?: number; failed?: number; timestamp?: string; }
interface GmailThread { unread?: boolean; }
interface CalendarEvent { summary?: string; start?: { dateTime?: string; date?: string }; }
interface DriveStatus { connected?: boolean; folderName?: string; lastSync?: string; }

interface AlertSettings {
  threshold: number;
  windowMinutes: number;
  updatedBy: string | null;
  updatedAt: string | null;
  source: 'db' | 'default';
  envFallback: number;
}

interface RateLimitEntry {
  route: string;
  lastAlertedAt: string;
  nextAvailableAt: string;
  cooldownMs: number;
  msRemaining: number;
}

interface AlertStatusResponse {
  entries: RateLimitEntry[];
  timestamp: string;
}

// ── Alert Settings Card (admin-only) ──────────────────────────────────────────

function AlertSettingsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<AlertSettings>({
    queryKey: ['/api/slack/alert-settings'],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch('/api/slack/alert-settings');
      if (!res.ok) throw new Error(`Failed to load alert settings (${res.status})`);
      return res.json() as Promise<AlertSettings>;
    },
  });

  const { data: statusData } = useQuery<AlertStatusResponse>({
    queryKey: ['/api/slack/alert-settings/status'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/slack/alert-settings/status');
      if (!res.ok) throw new Error(`Failed to load rate-limit status (${res.status})`);
      return res.json() as Promise<AlertStatusResponse>;
    },
  });

  // Entries that are still in cooldown (msRemaining > 0)
  const activeCooldowns = statusData?.entries.filter(e => e.msRemaining > 0) ?? [];

  const [threshold,     setThreshold]     = useState<string>('');
  const [windowMinutes, setWindowMinutes] = useState<string>('');
  const [initialized,   setInitialized]   = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [err,           setErr]           = useState<string | null>(null);

  // Populate inputs once data first arrives; do not overwrite mid-edit
  useEffect(() => {
    if (data && !initialized) {
      setThreshold(String(data.threshold));
      setWindowMinutes(String(data.windowMinutes));
      setInitialized(true);
    }
  }, [data, initialized]);

  const mutation = useMutation({
    mutationFn: async () => {
      const t = parseInt(threshold, 10);
      const w = parseInt(windowMinutes, 10);
      if (!Number.isFinite(t) || t < 1) throw new Error('Threshold must be a positive whole number.');
      if (!Number.isFinite(w) || w < 1) throw new Error('Window must be a positive whole number.');
      const res = await fetch('/api/slack/alert-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ threshold: t, windowMinutes: w }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to save settings.');
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['/api/slack/alert-settings'] });
      setSaved(true);
      setErr(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: Error) => {
      setErr(e.message);
    },
  });

  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-[15px] font-semibold text-foreground">Error Alert Settings</span>
        </div>
        {data?.source === 'db' && data.updatedAt && (
          <span className="text-[14px] text-muted-foreground/60">
            Last saved {new Date(data.updatedAt).toLocaleDateString()}
            {data.updatedBy ? ` by ${data.updatedBy.split('@')[0]}` : ''}
          </span>
        )}
      </div>
      <p className="text-[14px] text-muted-foreground leading-snug">
        Configure when the error-spike monitor posts a Slack alert to the admin channel.
        Changes take effect on the next polling cycle (within 60 s) without a restart.
      </p>

      {isLoading ? (
        <p className="text-[14px] text-muted-foreground/60">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-foreground">
              Error threshold
            </label>
            <p className="text-[13px] text-muted-foreground">Alert when errors exceed this count</p>
            <input
              type="number"
              min={1}
              max={10000}
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="mt-1 rounded border border-border px-2.5 py-1.5 text-[14px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
            />
            {data?.envFallback !== undefined && data.source === 'default' && (
              <p className="text-[13px] text-muted-foreground/60">
                Env fallback: {data.envFallback}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-semibold text-foreground">
              Window (minutes)
            </label>
            <p className="text-[13px] text-muted-foreground">Rolling window for counting errors</p>
            <input
              type="number"
              min={1}
              max={1440}
              value={windowMinutes}
              onChange={e => setWindowMinutes(e.target.value)}
              className="mt-1 rounded border border-border px-2.5 py-1.5 text-[14px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
            />
          </div>
        </div>
      )}

      {/* Rate-limit cooldown notice */}
      {activeCooldowns.length > 0 && (
        <div className="rounded border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />
            <span className="text-[13px] font-semibold text-[#CC8400]">
              Rate limit active — alerts are paused for the following routes:
            </span>
          </div>
          {activeCooldowns.map(e => {
            const minsRemaining = Math.ceil(e.msRemaining / 60_000);
            return (
              <div key={e.route} className="flex items-center justify-between text-[13px] text-[#CC8400] pl-5">
                <span className="font-mono truncate max-w-[260px]">{e.route}</span>
                <span className="font-semibold shrink-0 ml-2">
                  Next alert in {minsRemaining} min
                </span>
              </div>
            );
          })}
        </div>
      )}

      {err && (
        <p className="text-[13px] text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded px-2.5 py-1.5">
          {err}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || isLoading}
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {mutation.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[14px] text-[#2F6B3F] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function ServiceCard({
  icon, label, status, detail, note, href,
}: { icon: React.ReactNode; label: string; status: 'live' | 'error' | 'loading' | 'unknown'; detail: string; note?: string; href?: string }) {
  const dot: Record<typeof status, string> = {
    live:    'bg-[#2F6B3F]',
    error:   'bg-[#A93F2F]',
    loading: 'bg-[#CC8400]',
    unknown: 'bg-[#C8CBC6]',
  };
  const badge: Record<typeof status, string> = {
    live:    'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
    error:   'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',
    loading: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    unknown: 'bg-muted text-muted-foreground border-border',
  };
  const label2: Record<typeof status, string> = {
    live: 'Connected', error: 'Error', loading: 'Checking…', unknown: 'Unknown',
  };
  return (
    <div className="rounded-lg border border-border bg-white p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-[15px] font-semibold text-foreground">{label}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[14px] font-bold px-1.5 py-0.5 rounded border ${badge[status]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
          {label2[status]}
        </span>
      </div>
      <p className="text-[14px] text-foreground font-medium leading-tight">{detail}</p>
      {note && <p className="text-[14px] text-muted-foreground leading-snug">{note}</p>}
      {href && (
        <a href={href} className="text-[14px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
          Configure <ChevronRight className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function OverviewTab() {
  const { userTier } = useAppContext();
  const isAdmin = userTier === 'admin' || userTier === 'superadmin';

  const { data: slackData, isLoading: slackLoading }    = useQuery<SlackValidation>({ queryKey: ['/api/slack/validate'],    staleTime: 60_000 });
  const { data: gmailData, isLoading: gmailLoading }    = useQuery<GmailThread[]>({ queryKey: ['/api/gmail/threads'],     staleTime: 30_000 });
  const { data: calData,   isLoading: calLoading }      = useQuery<CalendarEvent[]>({ queryKey: ['/api/calendar/events'],   staleTime: 30_000 });
  const { data: driveData, isLoading: driveLoading }    = useQuery<DriveStatus>({ queryKey: ['/api/drive/status'],    staleTime: 60_000 });

  const unreadCount  = gmailLoading ? '…' : (gmailData?.filter(t => t.unread).length ?? 0);
  const nextEvent    = calLoading   ? '…' : (calData?.[0]?.summary ?? 'No upcoming events');
  const slackStatus  = slackLoading ? 'loading' : slackData?.status === 'ok' ? 'live' : slackData ? 'error' : 'unknown';
  const gmailStatus  = gmailLoading ? 'loading' : gmailData           ? 'live'    : 'unknown';
  const calStatus    = calLoading   ? 'loading' : calData             ? 'live'    : 'unknown';
  const driveStatus  = driveLoading ? 'loading' : driveData?.connected ? 'live'   : driveData ? 'error' : 'unknown';

  const SIGNAL_ROUTING = [
    { src: `${TERMS.aiAssistant} Interactions`,  dest: ['Trail Signals', 'Slack DM'],         color: 'bg-[#2F6F7E]' },
    { src: 'Salesforce Case Changes',            dest: ['Trail Signals', 'Notification Rule'], color: 'bg-[#CC8400]' },
    { src: 'Gmail Follow-ups',                   dest: ['Trail Signals', 'Digest'],            color: 'bg-[#2F6B3F]' },
    { src: 'Calendar Events',                    dest: ['Trail Signals', 'Slack Channel'],     color: 'bg-[#6d28d9]' },
    { src: 'Program Milestones',                 dest: ['Trail Signals', 'Weekly Brief'],      color: 'bg-[#b45309]' },
  ];

  const QUICK_LINKS = [
    { label: 'Comms',    sub: 'Gmail & Calendar',           icon: <Mail className="w-4 h-4" />,    href: '/collaboration/comms',    tier: 'all'  },
    { label: 'Signals',  sub: 'Personal signal config',     icon: <Radio className="w-4 h-4" />,   href: '/collaboration/signals',  tier: 'all'  },
    { label: 'Channels', sub: 'Channels, templates & rules',icon: <Network className="w-4 h-4" />, href: '/collaboration/channels', tier: 'admin'},
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">

        {/* Service status grid */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">Connected services</p>
          <div className="grid grid-cols-4 gap-3">
            <ServiceCard icon={<Slack className="w-4 h-4" />}       label="Slack"          status={slackStatus}
              detail={slackLoading ? 'Checking…' : slackData?.status === 'ok' ? `${slackData.passed ?? '–'} checks passed` : 'Validation issue detected'}
              note={slackData?.timestamp ? `Last checked: ${new Date(slackData.timestamp).toLocaleTimeString()}` : undefined}
              href="/admin/integrations" />
            <ServiceCard icon={<Mail className="w-4 h-4" />}        label="Gmail"          status={gmailStatus}
              detail={gmailLoading ? 'Loading…' : `${unreadCount} unread thread${unreadCount === 1 ? '' : 's'}`}
              note="Real-time inbox via Google OAuth" />
            <ServiceCard icon={<CalendarDays className="w-4 h-4" />} label="Google Calendar" status={calStatus}
              detail={calLoading ? 'Loading…' : nextEvent}
              note="Next 7-day event window" />
            <ServiceCard icon={<HardDrive className="w-4 h-4" />}   label="Google Drive"   status={driveStatus}
              detail={driveLoading ? 'Loading…' : driveData?.folderName ? `/${driveData.folderName}` : 'Drive connected'}
              note={driveData?.lastSync ? `Synced ${driveData.lastSync}` : 'Content and knowledge source'}
              href="/admin/integrations/google-drive" />
          </div>
        </div>

        {/* Signal routing + channel summary */}
        <div className="grid grid-cols-[1fr_320px] gap-4">
          {/* Signal routing */}
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[15px] font-semibold text-foreground">Signal routing</p>
                <p className="text-[14px] text-muted-foreground">Where events from each source land</p>
              </div>
              <a href="/collaboration/signals" className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-1">
                Configure <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {SIGNAL_ROUTING.map(row => (
                <div key={row.src} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-52 shrink-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                    <span className="text-[14px] text-foreground font-medium truncate">{row.src}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {row.dest.map(d => (
                      <span key={d} className="text-[14px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel summary */}
          <div className="rounded-lg border border-border bg-white p-4">
            <p className="text-[15px] font-semibold text-foreground mb-1">Active channels</p>
            <p className="text-[14px] text-muted-foreground mb-4">Key Slack and messaging channels</p>
            {[
              { name: '#guided-trail',         type: 'Cohort',   status: 'live' as const  },
              { name: '#trail-signals',         type: 'Signals',  status: 'live' as const  },
              { name: '#coach-hub',             type: 'Team',     status: 'live' as const  },
              { name: '#penny-ai',              type: 'AI',       status: 'live' as const  },
              { name: '#foundations-cohort',    type: 'Cohort',   status: 'live' as const  },
              { name: 'Google Chat (Coaches)',  type: 'Space',    status: 'planned' as const },
            ].map(ch => (
              <div key={ch.name} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <Hash className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                <span className="text-[14px] text-foreground flex-1 font-medium">{ch.name}</span>
                <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border ${ch.status === 'live' ? 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]' : 'bg-muted text-muted-foreground border-border'}`}>
                  {ch.type}
                </span>
              </div>
            ))}
            <a href="/collaboration/channels" className="mt-3 block text-[14px] font-semibold text-primary hover:underline">View all channels →</a>
          </div>
        </div>

        {/* Quick nav */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">Navigate to</p>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_LINKS.map(ql => (
              <a key={ql.label} href={ql.label === 'Comms' ? '/collaboration/comms' : ql.label === 'Signals' ? '/collaboration/signals' : '/collaboration/channels'}
                className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{ql.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{ql.label}</p>
                  <p className="text-[14px] text-muted-foreground">{ql.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>

        {/* Error alert settings — admin only */}
        {isAdmin && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">Alert settings</p>
            <AlertSettingsCard />
          </div>
        )}

      </div>
    </ScrollArea>
  );
}

// ── Comms tab (Gmail + Calendar inner switch) ─────────────────────────────────

type CommsPane = 'gmail' | 'calendar';
const COMMS_TABS: { id: CommsPane; label: string; icon: React.ReactNode }[] = [
  { id: 'gmail',    label: 'Gmail',           icon: <Mail         className="w-3.5 h-3.5" /> },
  { id: 'calendar', label: 'Google Calendar', icon: <CalendarDays className="w-3.5 h-3.5" /> },
];

function CommsTab() {
  const [pane, setPane] = useState<CommsPane>('gmail');
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-0 border-b border-border bg-white shrink-0 px-4">
        {COMMS_TABS.map(t => (
          <button key={t.id} onClick={() => setPane(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              pane === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {pane === 'gmail'    && <GmailCenter />}
        {pane === 'calendar' && <CalendarPanel />}
      </div>
    </div>
  );
}

// ── Channels tab (Channels / Templates / Notifications / Briefs) ──────────────

type ChannelsPane = 'channels' | 'templates' | 'notifications' | 'briefs';
const CHANNEL_TABS: { id: ChannelsPane; label: string; icon: React.ReactNode }[] = [
  { id: 'channels',      label: 'Channels',              icon: <Hash      className="w-3.5 h-3.5" /> },
  { id: 'templates',     label: 'Message Templates',     icon: <FileText  className="w-3.5 h-3.5" /> },
  { id: 'notifications', label: 'Notification Rules',    icon: <Bell      className="w-3.5 h-3.5" /> },
  { id: 'briefs',        label: 'Weekly Briefs',         icon: <Zap       className="w-3.5 h-3.5" /> },
];

function ChannelsTab() {
  const [pane, setPane] = useState<ChannelsPane>('channels');
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-0 border-b border-border bg-white shrink-0 px-4">
        {CHANNEL_TABS.map(t => (
          <button key={t.id} onClick={() => setPane(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              pane === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {pane === 'channels'      && <CommChannels />}
        {pane === 'templates'     && <MessageTemplates />}
        {pane === 'notifications' && <CommNotifications />}
        {pane === 'briefs'        && <WeeklyBriefs />}
      </div>
    </div>
  );
}

// ── Hub ───────────────────────────────────────────────────────────────────────

export default function CollaborationHub() {
  const { userTier } = useAppContext();
  const isAdmin = userTier === 'admin' || userTier === 'superadmin';

  const tabs = [
    { id: 'overview',  label: 'Overview',       path: '/collaboration',          icon: LayoutDashboard, content: <OverviewTab />   },
    { id: 'comms',     label: 'Comms',           path: '/collaboration/comms',    icon: Mail,            content: <CommsTab />      },
    { id: 'signals',   label: 'Trail Signals',   path: '/collaboration/signals',  icon: Radio,           content: <MyTrailSignals /> },
    ...(isAdmin ? [
      { id: 'channels', label: 'Channels',       path: '/collaboration/channels', icon: Network,         content: <ChannelsTab />   },
    ] : []),
  ];

  return (
    <HubShell
      title="Collaboration"
      icon={MessageSquare}
      description={`Team communications, live signals, and ${TERMS.aiAssistant}-assisted comms across Slack, Gmail, and Calendar.`}
      tabs={tabs}
    />
  );
}
