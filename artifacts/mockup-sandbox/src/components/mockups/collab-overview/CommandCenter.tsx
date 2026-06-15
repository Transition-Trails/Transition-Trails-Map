import { useState } from 'react'
import {
  MessageSquare, Mail, CalendarDays, HardDrive,
  Sparkles, ChevronRight, Clock, Bell, Send,
  AlertCircle, CheckCircle2, ArrowUpRight, Hash,
  Pencil, RefreshCw, Star, Users, Zap, FileText,
  Circle, TrendingUp, MoreHorizontal, ExternalLink,
} from 'lucide-react'

// ── Channel status ────────────────────────────────────────────────────────────

const CHANNELS = [
  {
    id: 'slack',
    name: 'Slack',
    icon: MessageSquare,
    color: 'emerald',
    status: 'live',
    stat: '5 unread DMs',
    sub: '22 channels · bot active',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 5,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    color: 'rose',
    status: 'live',
    stat: '3 unread threads',
    sub: '2 need reply · 1 Penny-flagged',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 3,
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: CalendarDays,
    color: 'sky',
    status: 'live',
    stat: '2 meetings today',
    sub: 'Next: Program Sync at 2:00 PM',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    badge: 2,
  },
  {
    id: 'drive',
    name: 'Google Drive',
    icon: HardDrive,
    color: 'amber',
    status: 'live',
    stat: '3 new files shared',
    sub: 'Trail Quest templates updated',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 0,
  },
  {
    id: 'chat',
    name: 'Google Chat',
    icon: Hash,
    color: 'zinc',
    status: 'phase-2',
    stat: 'Phase 2',
    sub: 'Client spaces — planned Q3',
    dot: 'bg-zinc-300',
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    text: 'text-zinc-500',
    badge: 0,
  },
]

// ── Attention items ───────────────────────────────────────────────────────────

const ATTENTION_ITEMS = [
  {
    id: 1, channel: 'gmail', icon: Mail, iconBg: 'bg-rose-100', iconText: 'text-rose-600',
    title: 'Trail Quest completion review needed',
    from: 'Angela Rodriguez',
    time: '10:42 AM', priority: 'high',
    action: 'Reply',
    penny: 'Penny watching — follow-up in 48h',
  },
  {
    id: 2, channel: 'calendar', icon: CalendarDays, iconBg: 'bg-sky-100', iconText: 'text-sky-600',
    title: 'Program Sync · 2:00 PM today',
    from: '4 attendees',
    time: 'In 1h 18m', priority: 'high',
    action: 'Prep with Penny',
    penny: null,
  },
  {
    id: 3, channel: 'slack', icon: MessageSquare, iconBg: 'bg-emerald-100', iconText: 'text-emerald-600',
    title: '5 unread messages in #trail-os-ops',
    from: 'Multiple senders',
    time: '35m ago', priority: 'medium',
    action: 'Open Slack',
    penny: null,
  },
  {
    id: 4, channel: 'gmail', icon: Mail, iconBg: 'bg-rose-100', iconText: 'text-rose-600',
    title: 'New Case #0004821 — Onboarding delay',
    from: 'Salesforce Alerts',
    time: 'Mon', priority: 'medium',
    action: 'View in Penny',
    penny: 'Added to Trail Signals digest',
  },
  {
    id: 5, channel: 'calendar', icon: CalendarDays, iconBg: 'bg-sky-100', iconText: 'text-sky-600',
    title: 'Coach Check-in · Destiny Walker',
    from: 'Recurring · Wed 3:30 PM',
    time: 'Tomorrow', priority: 'low',
    action: 'View',
    penny: null,
  },
]

// ── Activity feed ─────────────────────────────────────────────────────────────

const ACTIVITY = [
  { id: 1, channel: 'slack', icon: MessageSquare, iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', text: 'Penny posted Trail Talk reminder in #guided-trail-cohort', time: '8m ago' },
  { id: 2, channel: 'gmail', icon: Mail, iconBg: 'bg-rose-100', iconText: 'text-rose-600', text: 'Marcus Chen replied to "Is this goodbye (for now)?"', time: '22m ago' },
  { id: 3, channel: 'drive', icon: HardDrive, iconBg: 'bg-amber-100', iconText: 'text-amber-600', text: 'Trail Quest Assessment Template v3 updated', time: '1h ago' },
  { id: 4, channel: 'slack', icon: MessageSquare, iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', text: 'Jordan Kim: "Thursday 2pm works. Sending the invite"', time: '2h ago' },
  { id: 5, channel: 'calendar', icon: CalendarDays, iconBg: 'bg-sky-100', iconText: 'text-sky-600', text: 'Sprint Close meeting rescheduled to Friday 10 AM', time: '3h ago' },
  { id: 6, channel: 'gmail', icon: Mail, iconBg: 'bg-rose-100', iconText: 'text-rose-600', text: 'Penny Insight Digest delivered — 6 Trail Signals', time: 'Yesterday' },
]

// ── Penny signals ──────────────────────────────────────────────────────────────

const PENNY_SIGNALS = [
  { id: 1, type: 'alert', text: '3 learners approaching 80% completion threshold — Trail Quest reviews due this week.', channel: 'Salesforce + Gmail', urgent: true },
  { id: 2, type: 'insight', text: 'Coach check-in cadence dropped 40% this sprint. Recommend Slack nudge to #guided-trail-coaches.', channel: 'Calendar + Slack', urgent: false },
  { id: 3, type: 'action', text: 'Case #0004821 (Destiny Walker, onboarding delay) has no response after 72h — follow-up needed.', channel: 'Gmail + Salesforce', urgent: true },
  { id: 4, type: 'insight', text: '"Is this goodbye" thread from Marcus Chen may indicate learner attrition risk — worth a personal reply.', channel: 'Gmail', urgent: false },
]

// ── Quick compose ──────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: 'email', label: 'Compose Email', icon: Mail, color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100', border: 'border-rose-200' },
  { id: 'slack', label: 'Message on Slack', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-200' },
  { id: 'meeting', label: 'Schedule Meeting', icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50 hover:bg-sky-100', border: 'border-sky-200' },
  { id: 'brief', label: 'Send Weekly Brief', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100', border: 'border-violet-200' },
]

// ── Priority dot ──────────────────────────────────────────────────────────────

function PriorityDot({ p }: { p: string }) {
  if (p === 'high')   return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
  if (p === 'medium') return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
  return <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CommandCenter() {
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  const filtered = activeChannel
    ? ATTENTION_ITEMS.filter(i => i.channel === activeChannel)
    : ATTENTION_ITEMS

  return (
    <div className="h-screen bg-zinc-50 font-sans text-sm overflow-hidden flex flex-col">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <div>
          <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest mb-0.5">Collaboration</div>
          <h1 className="text-[15px] font-semibold text-zinc-900 leading-none">Overview</h1>
        </div>
        <p className="text-[11px] text-zinc-400 ml-2 hidden lg:block">
          Manage communication channels, review integrations, and act on team signals — all in one place.
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* ── Channel status strip ── */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto">
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(activeChannel === ch.id ? null : ch.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all shrink-0 ${
                activeChannel === ch.id
                  ? `${ch.bg} ${ch.border} shadow-sm`
                  : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ch.dot} shrink-0`} />
              <ch.icon className={`w-3.5 h-3.5 ${activeChannel === ch.id ? ch.text : 'text-zinc-400'} shrink-0`} />
              <div className="text-left">
                <p className={`text-[11px] font-semibold ${activeChannel === ch.id ? ch.text : 'text-zinc-700'}`}>{ch.name}</p>
                <p className="text-[10px] text-zinc-400 leading-none">{ch.stat}</p>
              </div>
              {ch.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ch.bg} ${ch.text} border ${ch.border} ml-1`}>{ch.badge}</span>
              )}
              {ch.status === 'phase-2' && (
                <span className="text-[8px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full ml-1">Phase 2</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* ── Col 1: Needs Attention + Recent Activity ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200">

          {/* — Needs Attention — */}
          <div className="bg-white flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="px-5 py-2.5 border-b border-zinc-100 flex items-center gap-2 shrink-0">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold text-zinc-800">Needs Attention</span>
              <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5 font-semibold ml-1">
                {filtered.filter(i => i.priority === 'high').length} high priority
              </span>
              {activeChannel && (
                <button onClick={() => setActiveChannel(null)} className="text-[9px] text-zinc-400 hover:text-zinc-600 underline ml-auto">Clear filter</button>
              )}
            </div>
            <div className="flex-1 overflow-auto bg-white">
              {filtered.map(item => (
                <div key={item.id} className="px-5 py-3.5 border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.iconText}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <PriorityDot p={item.priority} />
                        <p className="text-[12px] font-medium text-zinc-800 truncate leading-snug">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-zinc-400">{item.from}</span>
                        <span className="text-[9px] text-zinc-300">·</span>
                        <span className="text-[10px] text-zinc-400">{item.time}</span>
                      </div>
                      {item.penny && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                          <Sparkles className="w-2 h-2" />
                          {item.penny}
                        </div>
                      )}
                    </div>
                    <button className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-800 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-1">
                      {item.action} <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* — Divider band — */}
          <div className="bg-zinc-100 border-y border-zinc-200 px-5 py-2 flex items-center gap-2 shrink-0">
            <Zap className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recent Activity</span>
            <span className="text-[9px] text-zinc-400 ml-auto">{ACTIVITY.length} events</span>
          </div>

          {/* — Recent Activity — */}
          <div className="bg-zinc-50 overflow-auto shrink-0" style={{ maxHeight: '38%' }}>
            {ACTIVITY.map(a => (
              <div key={a.id} className="px-5 py-2.5 border-b border-zinc-100 flex items-start gap-2.5 hover:bg-white transition-colors">
                <div className={`w-5 h-5 rounded-md ${a.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <a.icon className={`w-2.5 h-2.5 ${a.iconText}`} />
                </div>
                <p className="text-[11px] text-zinc-600 flex-1 leading-snug">{a.text}</p>
                <span className="text-[9px] text-zinc-400 shrink-0 whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>

        </div>

        {/* ── Col 2: Penny Intelligence ── */}
        <div className="w-72 flex flex-col overflow-hidden border-r border-zinc-200 bg-white shrink-0">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-[11px] font-semibold text-violet-900">Penny Intelligence</span>
            <span className="text-[9px] bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5 font-medium ml-auto">
              {PENNY_SIGNALS.filter(s => s.urgent).length} urgent
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {PENNY_SIGNALS.map(s => (
              <div
                key={s.id}
                className={`rounded-xl border p-3 transition-all cursor-pointer hover:shadow-sm ${
                  s.urgent
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-zinc-100 bg-zinc-50 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  {s.urgent
                    ? <AlertCircle className="w-3 h-3 text-violet-600 shrink-0 mt-0.5" />
                    : <TrendingUp className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />}
                  <p className="text-[11px] text-zinc-800 leading-snug">{s.text}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400">{s.channel}</span>
                  <button className="text-[9px] font-semibold text-violet-600 hover:underline flex items-center gap-0.5">
                    Ask Penny <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Penny Ask bar */}
          <div className="border-t border-zinc-100 p-3 bg-gradient-to-t from-violet-50 to-white shrink-0">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-violet-200 px-3 py-2 shadow-sm">
              <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
              <input
                className="flex-1 bg-transparent outline-none text-[11px] text-zinc-700 placeholder:text-zinc-400"
                placeholder="Ask Penny about your channels…"
              />
              <button className="text-violet-500 hover:text-violet-700 shrink-0">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Col 3: Quick Actions + Channel Summary ── */}
        <div className="w-56 flex flex-col overflow-hidden bg-white shrink-0">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 shrink-0">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-700">Quick Actions</span>
          </div>
          <div className="p-3 space-y-2 shrink-0">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAction(a.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${a.bg} ${a.border} ${
                  selectedAction === a.id ? 'shadow-sm' : ''
                }`}
              >
                <a.icon className={`w-3.5 h-3.5 ${a.color} shrink-0`} />
                <span className={`text-[11px] font-semibold ${a.color}`}>{a.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-4 py-3 shrink-0">
            <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">Channel Health</div>
            <div className="space-y-2">
              {CHANNELS.filter(c => c.status === 'live').map(ch => (
                <div key={ch.id} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${ch.dot} shrink-0`} />
                  <ch.icon className={`w-3 h-3 ${ch.text} shrink-0`} />
                  <span className="text-[11px] text-zinc-600 flex-1">{ch.name}</span>
                  <span className="text-[9px] font-semibold text-emerald-600">Live</span>
                </div>
              ))}
              {CHANNELS.filter(c => c.status !== 'live').map(ch => (
                <div key={ch.id} className="flex items-center gap-2 opacity-50">
                  <span className={`w-1.5 h-1.5 rounded-full ${ch.dot} shrink-0`} />
                  <ch.icon className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="text-[11px] text-zinc-500 flex-1">{ch.name}</span>
                  <span className="text-[9px] font-semibold text-zinc-400">Phase 2</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 px-4 py-3 flex-1">
            <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">This Week</div>
            <div className="space-y-2.5">
              {[
                { label: 'Emails sent',       val: '12', icon: Mail,           col: 'text-rose-500' },
                { label: 'Slack messages',    val: '47', icon: MessageSquare,  col: 'text-emerald-500' },
                { label: 'Meetings',          val: '6',  icon: CalendarDays,   col: 'text-sky-500' },
                { label: 'Penny drafts used', val: '8',  icon: Sparkles,       col: 'text-violet-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className={`w-3 h-3 ${s.col} shrink-0`} />
                  <span className="text-[11px] text-zinc-500 flex-1">{s.label}</span>
                  <span className="text-[12px] font-bold text-zinc-800">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
