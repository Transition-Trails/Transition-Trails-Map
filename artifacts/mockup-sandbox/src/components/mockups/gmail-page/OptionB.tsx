import { useState } from 'react'
import {
  Search, Sparkles, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Tag, Inbox, Bell,
  BellOff, Zap, Eye, Clock, MoreHorizontal,
  Reply, Archive, Star, Paperclip, Plus, X,
  ArrowUpRight, Settings
} from 'lucide-react'

const LABELS = [
  { id: 'penny', name: 'Penny', color: 'violet', hex: '#8b5cf6', watched: true, action: 'follow-up', desc: 'Auto follow-up after 48h silence' },
  { id: 'insights', name: 'Insights', color: 'sky', hex: '#0ea5e9', watched: true, action: 'digest', desc: 'Added to Trail Signals weekly digest' },
  { id: 'programs', name: 'Programs', color: 'emerald', hex: '#10b981', watched: false, action: 'none', desc: 'Not monitored' },
  { id: 'urgent', name: 'Urgent', color: 'red', hex: '#ef4444', watched: false, action: 'none', desc: 'Not monitored' },
  { id: 'learners', name: 'Learners', color: 'amber', hex: '#f59e0b', watched: false, action: 'none', desc: 'Not monitored' },
]

const PENNY_ACTIONS = [
  { id: 'follow-up', label: 'Auto follow-up', desc: 'Penny drafts a reply if no response in 48h', icon: Clock },
  { id: 'digest', label: 'Add to digest', desc: 'Summarized in the Trail Signals weekly brief', icon: Zap },
  { id: 'alert', label: 'Immediate alert', desc: 'Penny surfaces this in Trail Signals now', icon: Bell },
  { id: 'none', label: 'No action', desc: 'Penny ignores threads with this label', icon: BellOff },
]

const THREADS = [
  { id: 1, from: 'Angela Rodriguez', fromI: 'AR', subject: 'Trail Quest completion review needed', preview: 'The Q2 cohort has 3 learners flagged for completion review. Can you pull the reports before EOW?', time: '10:42 AM', labels: ['penny', 'programs'], unread: true, starred: false },
  { id: 2, from: 'Marcus Chen', fromI: 'MC', subject: 'Is this goodbye (for now)?', preview: 'Wanted to reach out before the transition. The team has been incredible and I wanted you to know...', time: 'Yesterday', labels: ['learners'], unread: true, starred: true },
  { id: 3, from: 'Salesforce Alerts', fromI: 'SF', subject: 'New Case #0004821 — Onboarding delay', preview: 'A new case has been opened by Destiny Walker regarding onboarding delays in her cohort.', time: 'Mon', labels: ['penny', 'insights'], unread: false, starred: false, hasAttach: true },
  { id: 4, from: 'Penny AI', fromI: 'P', subject: 'Weekly Insight Digest — June 9', preview: '3 learners approaching 80% threshold · 2 open cases · 1 Trail Quest flagged for review.', time: 'Jun 9', labels: ['insights'], unread: false, starred: true },
  { id: 5, from: 'Jordan Kim', fromI: 'JK', subject: 'Re: Coach check-in scheduling', preview: 'Happy to jump on a call Thursday at 2pm. I\'ll send the invite. Agenda: sprint close + Q3 planning.', time: 'Jun 8', labels: ['programs'], unread: false, starred: false, hasAttach: true },
]

const LABEL_BG: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
}

export function OptionB() {
  const [labelConfig, setLabelConfig] = useState<Record<string, { watched: boolean; action: string }>>(
    Object.fromEntries(LABELS.map(l => [l.id, { watched: l.watched, action: l.action }]))
  )
  const [configOpen, setConfigOpen] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [activeAction, setActiveAction] = useState<Record<string, boolean>>({})

  const toggleWatch = (id: string) =>
    setLabelConfig(prev => ({ ...prev, [id]: { ...prev[id], watched: !prev[id].watched } }))
  const setAction = (id: string, action: string) =>
    setLabelConfig(prev => ({ ...prev, [id]: { ...prev[id], action } }))

  const watchedCount = Object.values(labelConfig).filter(c => c.watched).length
  const selectedThread = THREADS.find(t => t.id === selected)

  return (
    <div className="h-screen bg-zinc-50 font-sans text-sm overflow-hidden flex flex-col">

      {/* ── TOP HEADER ── */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-rose-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <span className="font-semibold text-zinc-800">Gmail</span>
        </div>
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-[12px] text-zinc-700 placeholder:text-zinc-400"
              placeholder="Search all mail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={() => setConfigOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
            configOpen ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Penny Labels
          <span className="text-[9px] bg-violet-500 text-white rounded-full px-1 py-0.5">{watchedCount}</span>
        </button>
      </div>

      {/* ── PENNY LABEL CONFIG PANEL (collapsible) ── */}
      {configOpen && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <h3 className="text-[13px] font-semibold text-violet-900">Penny Label Intelligence</h3>
            <span className="text-[10px] text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">{watchedCount} active</span>
            <button onClick={() => setConfigOpen(false)} className="ml-auto text-violet-400 hover:text-violet-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-[11px] text-violet-700 mb-4 leading-snug max-w-xl">
            Choose which Gmail labels Penny monitors for insights, alerts, and automated follow-ups. Threads with a watched label are surfaced in Trail Signals.
          </p>
          <div className="grid grid-cols-5 gap-2">
            {LABELS.map(l => {
              const cfg = labelConfig[l.id]
              const ActionIcon = PENNY_ACTIONS.find(a => a.id === cfg.action)?.icon || BellOff
              return (
                <div
                  key={l.id}
                  className={`rounded-xl border-2 p-3 transition-all bg-white cursor-pointer ${
                    cfg.watched ? 'border-violet-300 shadow-sm shadow-violet-100' : 'border-zinc-100 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Label header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: l.hex }} />
                      <span className="text-[11px] font-semibold text-zinc-800">{l.name}</span>
                    </div>
                    <button
                      onClick={() => toggleWatch(l.id)}
                      className="shrink-0"
                    >
                      {cfg.watched
                        ? <CheckCircle2 className="w-4 h-4 text-violet-500" />
                        : <Circle className="w-4 h-4 text-zinc-300" />}
                    </button>
                  </div>

                  {/* Action picker */}
                  {cfg.watched && (
                    <div>
                      <div className="text-[9px] text-violet-500 font-semibold uppercase tracking-wide mb-1.5">Penny action</div>
                      <div className="space-y-1">
                        {PENNY_ACTIONS.filter(a => a.id !== 'none').map(action => (
                          <button
                            key={action.id}
                            onClick={() => setAction(l.id, action.id)}
                            className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-colors ${
                              cfg.action === action.id
                                ? 'bg-violet-100 text-violet-700 font-semibold'
                                : 'text-zinc-500 hover:bg-zinc-50'
                            }`}
                          >
                            <action.icon className="w-2.5 h-2.5 shrink-0" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!cfg.watched && (
                    <p className="text-[10px] text-zinc-400">Click to enable</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Thread list */}
        <div className={`border-r border-zinc-200 bg-white flex flex-col shrink-0 ${selected ? 'w-72' : 'flex-1'}`}>
          <div className="px-3 py-2 border-b border-zinc-100 flex items-center gap-2">
            <Inbox className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-semibold text-zinc-600">Inbox</span>
            <span className="ml-auto text-[9px] text-zinc-400">2 unread</span>
          </div>
          <div className="flex-1 overflow-auto">
            {THREADS.filter(t => !search || t.subject.toLowerCase().includes(search.toLowerCase())).map(t => {
              const lbl = LABELS.find(l => t.labels.includes(l.id) && labelConfig[l.id]?.watched)
              return (
                <div
                  key={t.id}
                  onClick={() => setSelected(t.id === selected ? null : t.id)}
                  className={`px-4 py-3 border-b border-zinc-50 cursor-pointer transition-all ${
                    selected === t.id ? 'bg-violet-50 border-l-2 border-l-violet-400' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-600 shrink-0">
                      {t.fromI}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] truncate ${t.unread ? 'font-semibold text-zinc-800' : 'text-zinc-600'}`}>{t.from}</span>
                        <span className="text-[9px] text-zinc-400 shrink-0 ml-auto">{t.time}</span>
                      </div>
                      <p className={`text-[11px] truncate ${t.unread ? 'font-medium text-zinc-700' : 'text-zinc-500'}`}>{t.subject}</p>
                    </div>
                  </div>
                  {/* Penny badge */}
                  {lbl && (
                    <div className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${LABEL_BG[lbl.color]}`}>
                      <Sparkles className="w-2 h-2" />
                      Penny · {PENNY_ACTIONS.find(a => a.id === labelConfig[lbl.id]?.action)?.label ?? 'watching'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Thread preview */}
        {selectedThread && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-800 mb-1">{selectedThread.subject}</h2>
                <div className="flex flex-wrap gap-1.5">
                  {selectedThread.labels.map(lid => {
                    const l = LABELS.find(x => x.id === lid)!
                    return <span key={lid} className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${LABEL_BG[l.color]}`}>{l.name}</span>
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1.5 rounded hover:bg-zinc-100"><Reply className="w-3.5 h-3.5 text-zinc-500" /></button>
                <button className="p-1.5 rounded hover:bg-zinc-100"><Archive className="w-3.5 h-3.5 text-zinc-500" /></button>
                <button className="p-1.5 rounded hover:bg-zinc-100"><MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" /></button>
              </div>
            </div>

            {/* Penny action bar */}
            {selectedThread.labels.some(lid => labelConfig[lid]?.watched) && (
              <div className="px-6 py-2.5 bg-violet-50 border-b border-violet-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <div className="flex-1">
                    {(() => {
                      const watchedLabel = LABELS.find(l => selectedThread.labels.includes(l.id) && labelConfig[l.id]?.watched)
                      const action = watchedLabel ? PENNY_ACTIONS.find(a => a.id === labelConfig[watchedLabel.id]?.action) : null
                      return (
                        <p className="text-[11px] text-violet-800">
                          <strong>Penny</strong> · {action?.desc ?? 'Monitoring this thread'}
                        </p>
                      )
                    })()}
                  </div>
                  <button className="text-[10px] font-semibold text-violet-600 hover:underline flex items-center gap-0.5">
                    Adjust <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-[12px] font-bold text-zinc-600">
                  {selectedThread.fromI}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-zinc-800">{selectedThread.from}</p>
                  <p className="text-[10px] text-zinc-400">to me · {selectedThread.time}</p>
                </div>
              </div>
              <p className="text-[13px] text-zinc-700 leading-relaxed mb-3">{selectedThread.preview}</p>
              <p className="text-[13px] text-zinc-700 leading-relaxed">
                Please let me know by end of week so we can wrap up the sprint review cleanly.
              </p>

              <div className="mt-5 rounded-xl border border-zinc-200 p-4">
                <div className="text-[10px] text-zinc-400 mb-2">Reply</div>
                <textarea className="w-full outline-none resize-none text-[12px] text-zinc-600 placeholder:text-zinc-400 min-h-14" placeholder="Write a reply…" />
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <button className="flex items-center gap-1.5 text-[10px] text-violet-600 font-medium hover:underline">
                    <Sparkles className="w-3 h-3" /> Draft with Penny
                  </button>
                  <button className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-semibold rounded-lg hover:bg-rose-600">Send</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
