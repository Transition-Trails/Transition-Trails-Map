import {
  MessageSquare, Mail, CalendarDays, HardDrive, Hash,
  Sparkles, ArrowUpRight, Settings2, CheckCircle2,
  AlertCircle, Clock, Zap, Shield, Bell, FileText,
  ChevronRight, Circle,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Channel rule configs ───────────────────────────────────────────────────────

interface ChannelConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'live' | 'phase-2';
  statusLabel: string;
  dot: string;
  iconColor: string;
  bg: string;
  border: string;
  headerBg: string;
  managePath: string | null;
  manageLabel: string;
  rules: RuleGroup[];
  pennyRole: string;
  stats: { label: string; value: string }[];
}

interface RuleGroup {
  label: string;
  items: { text: string; status: 'active' | 'pending' | 'phase-2' }[];
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'slack',
    name: 'Slack',
    icon: MessageSquare,
    status: 'live',
    statusLabel: 'Live',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-50',
    managePath: '/collaboration/slack',
    manageLabel: 'Manage Slack Rules',
    pennyRole: 'Monitors 5 channels · Posts digests + alerts · Routes to Trail Signals',
    stats: [
      { label: 'Channels monitored', value: '5' },
      { label: 'Bot posting rules',  value: '3' },
      { label: 'Penny triggers',     value: '6' },
    ],
    rules: [
      {
        label: 'Channel Monitoring',
        items: [
          { text: '#trail-os-ops — all messages flagged for Penny review', status: 'active' },
          { text: '#guided-trail-cohort — enrollment + completion signals', status: 'active' },
          { text: '#guided-trail-coaches — coach activity cadence tracking', status: 'active' },
        ],
      },
      {
        label: 'Penny Posting Rules',
        items: [
          { text: 'Trail Talk reminders → #guided-trail-cohort (weekly)', status: 'active' },
          { text: 'Insight Digest → #trail-os-ops (weekly, Fridays)', status: 'active' },
          { text: 'Attrition alerts → DM to admin (threshold: 3 signals)', status: 'pending' },
        ],
      },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    status: 'live',
    statusLabel: 'Live',
    dot: 'bg-rose-500',
    iconColor: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    headerBg: 'bg-rose-50',
    managePath: '/collaboration/gmail',
    manageLabel: 'Manage Gmail Rules',
    pennyRole: 'Watches 4 labels · Flags follow-ups · Feeds Trail Signals digest',
    stats: [
      { label: 'Labels watched',    value: '4' },
      { label: 'Penny flags / wk', value: '6' },
      { label: 'Auto-routed',       value: '2' },
    ],
    rules: [
      {
        label: 'Label Routing Rules',
        items: [
          { text: 'TRAIL_OS label → Penny review queue (all threads)', status: 'active' },
          { text: 'CASE_ALERTS label → Trail Signals within 1h', status: 'active' },
          { text: 'LEARNER_COMMS label → Penny follow-up watch (48h)', status: 'active' },
          { text: 'COACH_COMMS label → Coach activity digest (weekly)', status: 'pending' },
        ],
      },
      {
        label: 'Penny Follow-Up Rules',
        items: [
          { text: 'No reply after 48h → Penny surfaces to admin inbox', status: 'active' },
          { text: 'Attrition signal keywords → Trail Signal auto-created', status: 'active' },
          { text: 'Bulk send tracking → weekly delivery stats', status: 'phase-2' },
        ],
      },
    ],
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    icon: CalendarDays,
    status: 'live',
    statusLabel: 'Live',
    dot: 'bg-sky-500',
    iconColor: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    headerBg: 'bg-sky-50',
    managePath: '/collaboration/calendar-live',
    manageLabel: 'Manage Calendar Rules',
    pennyRole: 'Preps meetings on request · Tracks coach cadence · Flags overdue check-ins',
    stats: [
      { label: 'Event types tracked', value: '3' },
      { label: 'Penny prep triggers', value: 'On demand' },
      { label: 'Cadence alerts',      value: 'Active' },
    ],
    rules: [
      {
        label: 'Penny Prep Rules',
        items: [
          { text: 'Program Sync meetings → Penny prep brief available on demand', status: 'active' },
          { text: 'Coach Check-ins → attendance + cadence logged to Penny', status: 'active' },
          { text: 'Trail Quest Reviews → Penny pulls learner readiness snapshot', status: 'pending' },
        ],
      },
      {
        label: 'Cadence Monitoring',
        items: [
          { text: 'Coach check-in gap > 2 weeks → Trail Signal (attrition risk)', status: 'active' },
          { text: 'Sprint close meetings → auto-logged to program timeline', status: 'pending' },
          { text: 'Recurring meeting drop → Penny insight flag', status: 'phase-2' },
        ],
      },
    ],
  },
  {
    id: 'drive',
    name: 'Google Drive',
    icon: HardDrive,
    status: 'live',
    statusLabel: 'Live',
    dot: 'bg-amber-500',
    iconColor: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    headerBg: 'bg-amber-50',
    managePath: null,
    manageLabel: 'Rule config — Phase 2',
    pennyRole: 'File change notifications planned · Rule configuration coming in Phase 2',
    stats: [
      { label: 'Folders watched',    value: '—' },
      { label: 'Penny triggers',     value: '—' },
      { label: 'Routing rules',      value: '—' },
    ],
    rules: [
      {
        label: 'Planned Rules (Phase 2)',
        items: [
          { text: 'Trail Quest template changes → notify program leads', status: 'phase-2' },
          { text: 'Assessment uploads → Penny queues review task', status: 'phase-2' },
          { text: 'Shared document activity → weekly Drive digest', status: 'phase-2' },
        ],
      },
    ],
  },
  {
    id: 'chat',
    name: 'Google Chat',
    icon: Hash,
    status: 'phase-2',
    statusLabel: 'Phase 2',
    dot: 'bg-zinc-300',
    iconColor: 'text-zinc-400',
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    headerBg: 'bg-zinc-50',
    managePath: null,
    manageLabel: 'Coming in Phase 2',
    pennyRole: 'Client-facing spaces planned for Q3 — not yet connected',
    stats: [
      { label: 'Spaces',         value: '—' },
      { label: 'Penny routing',  value: '—' },
      { label: 'Rules',          value: '—' },
    ],
    rules: [],
  },
];

// ── Signal pipeline destinations ───────────────────────────────────────────────

const SIGNAL_DESTINATIONS = [
  {
    id: 'penny',
    label: 'Penny',
    description: 'Receives all flagged signals for synthesis, follow-up, and recommendations',
    icon: Sparkles,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    sources: ['Slack (6 rules)', 'Gmail (6 rules)', 'Calendar (2 rules)'],
    status: 'active' as const,
  },
  {
    id: 'trail-signals',
    label: 'Trail Signals',
    description: 'Surfaces urgency-flagged signals as actionable items for the team',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    sources: ['Gmail CASE_ALERTS', 'Slack attrition threshold', 'Calendar cadence gaps'],
    status: 'active' as const,
  },
  {
    id: 'notifications',
    label: 'Notification Rules',
    description: 'Controls who receives what, and at what threshold, across channels',
    icon: Bell,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    sources: ['Admin DMs', 'Weekly digests', 'Threshold alerts'],
    status: 'active' as const,
  },
  {
    id: 'templates',
    label: 'Message Templates',
    description: 'Penny uses approved templates for all outbound Slack + Gmail messages',
    icon: FileText,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    sources: ['Slack bot messages', 'Gmail drafts', 'Weekly briefs'],
    status: 'active' as const,
  },
];

// ── Status badge ───────────────────────────────────────────────────────────────

function RuleStatus({ status }: { status: 'active' | 'pending' | 'phase-2' }) {
  if (status === 'active')   return <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />;
  if (status === 'pending')  return <Clock className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />;
  return <Circle className="w-3 h-3 text-zinc-300 shrink-0 mt-0.5" />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CollaborationWorkspace() {
  const [, navigate] = useLocation();

  const liveChannels   = CHANNELS.filter(c => c.status === 'live');
  const phase2Channels = CHANNELS.filter(c => c.status === 'phase-2');

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">

        {/* ── Intro ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-zinc-600 leading-relaxed max-w-2xl">
              Configure how each connected channel generates signals, routes them to Penny, and surfaces
              actionable insights across Trail OS. These rules define what Penny watches, when it posts,
              and what reaches Trail Signals.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              {liveChannels.length} channels live
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
              {phase2Channels.length} phase 2
            </span>
          </div>
        </div>

        {/* ── Signal destination strip ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Where signals go</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {SIGNAL_DESTINATIONS.map(dest => (
              <button
                key={dest.id}
                onClick={() => {
                  if (dest.id === 'notifications') navigate('/collaboration/notifications');
                  if (dest.id === 'templates')     navigate('/collaboration/templates');
                }}
                className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${dest.bg} ${dest.border} ${
                  (dest.id === 'notifications' || dest.id === 'templates') ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <dest.icon className={`w-3.5 h-3.5 ${dest.color}`} />
                  <span className={`text-[11px] font-semibold ${dest.color}`}>{dest.label}</span>
                  {(dest.id === 'notifications' || dest.id === 'templates') && (
                    <ArrowUpRight className={`w-2.5 h-2.5 ${dest.color} ml-auto opacity-60`} />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 leading-snug mb-2">{dest.description}</p>
                <div className="space-y-0.5">
                  {dest.sources.map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full bg-current ${dest.color} opacity-60`} />
                      <span className="text-[9px] text-zinc-500">{s}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Channel rule cards ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Channel signal rules</h2>
          </div>
          <div className="space-y-4">
            {CHANNELS.filter(c => c.status !== 'phase-2').map(ch => (
              <div key={ch.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

                {/* Card header */}
                <div className={`px-5 py-3.5 border-b border-zinc-100 flex items-center gap-3 ${ch.headerBg}`}>
                  <span className={`w-2 h-2 rounded-full ${ch.dot} shrink-0`} />
                  <ch.icon className={`w-4 h-4 ${ch.iconColor} shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-zinc-800">{ch.name}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${ch.bg} ${ch.border} ${ch.iconColor}`}>
                        {ch.statusLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{ch.pennyRole}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5 mr-4">
                    {ch.stats.map(s => (
                      <div key={s.label} className="text-center">
                        <div className="text-[14px] font-bold text-zinc-800 leading-none">{s.value}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5 whitespace-nowrap">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Manage button */}
                  {ch.managePath ? (
                    <button
                      onClick={() => navigate(ch.managePath!)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all hover:shadow-sm shrink-0 ${ch.bg} ${ch.border} ${ch.iconColor}`}
                    >
                      <Settings2 className="w-3 h-3" />
                      {ch.manageLabel}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-medium shrink-0 italic">{ch.manageLabel}</span>
                  )}
                </div>

                {/* Rule groups */}
                {ch.rules.length > 0 && (
                  <div className={`grid gap-0 ${ch.rules.length > 1 ? 'grid-cols-2 divide-x divide-zinc-100' : 'grid-cols-1'}`}>
                    {ch.rules.map(group => (
                      <div key={group.label} className="px-5 py-3.5">
                        <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">{group.label}</div>
                        <div className="space-y-2">
                          {group.items.map(item => (
                            <div key={item.text} className="flex items-start gap-2">
                              <RuleStatus status={item.status} />
                              <span className={`text-[11px] leading-snug ${
                                item.status === 'phase-2' ? 'text-zinc-400' : 'text-zinc-700'
                              }`}>
                                {item.text}
                              </span>
                              {item.status === 'phase-2' && (
                                <span className="text-[8px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap mt-0.5">
                                  Phase 2
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Phase 2 channel stubs */}
            {CHANNELS.filter(c => c.status === 'phase-2').map(ch => (
              <div key={ch.id} className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-3.5 flex items-center gap-3 opacity-60">
                <span className={`w-2 h-2 rounded-full ${ch.dot} shrink-0`} />
                <ch.icon className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-[12px] font-semibold text-zinc-500">{ch.name}</span>
                <span className="text-[10px] text-zinc-400">— {ch.pennyRole}</span>
                <span className="ml-auto text-[9px] font-semibold text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">Phase 2</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-6 text-[10px] text-zinc-400 pb-2">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active rule</div>
          <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-400" /> Configured, not yet live</div>
          <div className="flex items-center gap-1.5"><Circle className="w-3 h-3 text-zinc-300" /> Phase 2 planned</div>
          <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-zinc-300" /> Rule config managed per-channel tab</div>
        </div>

      </div>
    </ScrollArea>
  );
}
