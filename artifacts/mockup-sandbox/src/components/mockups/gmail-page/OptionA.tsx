import { useState } from 'react'
import {
  Search, Star, Archive, Trash2, Tag, ChevronRight,
  Inbox, Send, FileText, AlertCircle, Settings2,
  Sparkles, RefreshCw, MoreHorizontal, Paperclip,
  Reply, Forward, CheckSquare, Square, Filter
} from 'lucide-react'

const LABELS = [
  { id: 'penny', name: 'Penny', color: '#8b5cf6', active: true, desc: 'Penny monitors & follows up' },
  { id: 'insights', name: 'Insights', color: '#0ea5e9', active: true, desc: 'Feeds Trail Signals digest' },
  { id: 'programs', name: 'Programs', color: '#10b981', active: false, desc: 'Not monitored' },
  { id: 'urgent', name: 'Urgent', color: '#ef4444', active: false, desc: 'Not monitored' },
  { id: 'learners', name: 'Learners', color: '#f59e0b', active: false, desc: 'Not monitored' },
]

const THREADS = [
  { id: 1, from: 'Angela Rodriguez', fromInitial: 'AR', subject: 'Trail Quest completion review needed', preview: 'Hi, the Q2 cohort has 3 learners flagged for completion review. Can you pull the reports?', time: '10:42 AM', labels: ['penny', 'programs'], unread: true, starred: false, hasAttach: false },
  { id: 2, from: 'Marcus Chen', fromInitial: 'MC', subject: 'Is this goodbye (for now)?', preview: 'Wanted to reach out before the transition. The team has been incredible and I wanted you to know...', time: 'Yesterday', labels: ['learners'], unread: true, starred: true, hasAttach: false },
  { id: 3, from: 'Salesforce Alerts', fromInitial: 'SF', subject: 'New Case #0004821 — Onboarding delay', preview: 'A new case has been opened by Destiny Walker regarding the onboarding delay for her cohort.', time: 'Mon', labels: ['penny', 'insights'], unread: false, starred: false, hasAttach: true },
  { id: 4, from: 'Penny AI', fromInitial: 'P', subject: 'Weekly Insight Digest — June 9', preview: 'Here are this week\'s top signals: 3 learners approaching 80% completion threshold, 2 open cases...', time: 'Jun 9', labels: ['insights'], unread: false, starred: true, hasAttach: false },
  { id: 5, from: 'Jordan Kim', fromInitial: 'JK', subject: 'Re: Coach check-in scheduling', preview: 'Happy to jump on a call Thursday at 2pm. I\'ll send the invite. Just confirming the agenda items:', time: 'Jun 8', labels: ['programs'], unread: false, starred: false, hasAttach: true },
  { id: 6, from: 'Trail OS System', fromInitial: 'TO', subject: 'Phase 1 Architecture — items needing sign-off', preview: 'The following 4 items in the Phase 1 audit require your review before the sprint closes:', time: 'Jun 7', labels: ['insights', 'urgent'], unread: false, starred: false, hasAttach: false },
]

const LABEL_COLOR: Record<string, string> = {
  penny: 'bg-violet-100 text-violet-700',
  insights: 'bg-sky-100 text-sky-700',
  programs: 'bg-emerald-100 text-emerald-700',
  urgent: 'bg-red-100 text-red-700',
  learners: 'bg-amber-100 text-amber-700',
}

export function OptionA() {
  const [selected, setSelected] = useState<number | null>(1)
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [labelStates, setLabelStates] = useState<Record<string, boolean>>(
    Object.fromEntries(LABELS.map(l => [l.id, l.active]))
  )
  const [search, setSearch] = useState('')

  const selectedThread = THREADS.find(t => t.id === selected)

  const toggle = (id: string) => setLabelStates(prev => ({ ...prev, [id]: !prev[id] }))

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: 2 },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: 1 },
    { id: 'spam', label: 'Spam', icon: AlertCircle },
  ]

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-sm overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-52 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-rose-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </div>
            <span className="font-semibold text-zinc-800 text-[13px]">Gmail</span>
          </div>
        </div>

        {/* Folders */}
        <nav className="px-2 py-2 space-y-0.5">
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                activeFolder === f.id ? 'bg-rose-50 text-rose-700' : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <f.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">{f.label}</span>
              {f.count && <span className="text-[10px] font-semibold bg-rose-500 text-white rounded-full px-1.5 py-0.5">{f.count}</span>}
            </button>
          ))}
        </nav>

        <div className="mx-4 my-2 border-t border-zinc-100" />

        {/* Labels */}
        <div className="px-4 mb-1">
          <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Labels</span>
        </div>
        <div className="px-2 space-y-0.5 mb-3">
          {LABELS.map(l => (
            <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.color }} />
              <span className="flex-1 text-[12px] text-zinc-600">{l.name}</span>
            </div>
          ))}
        </div>

        <div className="mx-4 my-1 border-t border-zinc-100" />

        {/* Penny label config */}
        <div className="px-3 py-3 flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Penny Watches</span>
          </div>
          <p className="text-[10px] text-zinc-400 mb-2 leading-snug">Penny monitors these labels for insights and follow-ups.</p>
          <div className="space-y-1.5">
            {LABELS.map(l => (
              <label key={l.id} className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => toggle(l.id)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${labelStates[l.id] ? 'bg-violet-500' : 'bg-zinc-200'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${labelStates[l.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-[11px] text-zinc-600 group-hover:text-zinc-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* ── THREAD LIST ── */}
      <div className="w-72 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        {/* Search */}
        <div className="px-3 py-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2 bg-zinc-50 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-[12px] text-zinc-700 placeholder:text-zinc-400"
              placeholder="Search mail…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        {/* Filter row */}
        <div className="px-3 py-1.5 border-b border-zinc-100 flex items-center gap-1.5">
          <button className="text-[10px] text-zinc-500 flex items-center gap-1 hover:text-zinc-700">
            <Filter className="w-3 h-3" /> Filter
          </button>
          <button className="text-[10px] text-zinc-500 hover:text-zinc-700 ml-auto"><RefreshCw className="w-3 h-3" /></button>
        </div>

        {/* Threads */}
        <div className="flex-1 overflow-auto">
          {THREADS.filter(t => !search || t.subject.toLowerCase().includes(search.toLowerCase())).map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              className={`px-3 py-3 border-b border-zinc-50 cursor-pointer transition-colors ${
                selected === t.id ? 'bg-rose-50 border-l-2 border-l-rose-400' : 'hover:bg-zinc-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[9px] font-bold text-zinc-600 shrink-0">
                  {t.fromInitial}
                </div>
                <span className={`flex-1 text-[11px] truncate ${t.unread ? 'font-semibold text-zinc-800' : 'text-zinc-600'}`}>{t.from}</span>
                <span className="text-[9px] text-zinc-400 shrink-0">{t.time}</span>
                {t.starred && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              <p className={`text-[11px] truncate mb-1.5 ${t.unread ? 'font-medium text-zinc-700' : 'text-zinc-500'}`}>{t.subject}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {t.labels.map(lbl => (
                  <span key={lbl} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${LABEL_COLOR[lbl]}`}>{lbl}</span>
                ))}
                {t.hasAttach && <Paperclip className="w-2.5 h-2.5 text-zinc-400 ml-auto" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PREVIEW PANE ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-zinc-200 bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-800 mb-1">{selectedThread.subject}</h2>
                  <div className="flex items-center gap-2">
                    {selectedThread.labels.map(lbl => (
                      <span key={lbl} className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${LABEL_COLOR[lbl]}`}>{lbl}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="p-1.5 rounded hover:bg-zinc-100"><Reply className="w-3.5 h-3.5 text-zinc-500" /></button>
                  <button className="p-1.5 rounded hover:bg-zinc-100"><Forward className="w-3.5 h-3.5 text-zinc-500" /></button>
                  <button className="p-1.5 rounded hover:bg-zinc-100"><Archive className="w-3.5 h-3.5 text-zinc-500" /></button>
                  <button className="p-1.5 rounded hover:bg-zinc-100"><Trash2 className="w-3.5 h-3.5 text-zinc-500" /></button>
                  <button className="p-1.5 rounded hover:bg-zinc-100"><MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" /></button>
                </div>
              </div>
            </div>

            {/* Penny context bar — shows when thread has Penny label */}
            {selectedThread.labels.includes('penny') && (
              <div className="px-6 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <p className="text-[11px] text-violet-800 flex-1">
                  <strong>Penny is watching this thread.</strong> She'll draft a follow-up if no reply is received within 48 hours.
                </p>
                <button className="text-[10px] font-semibold text-violet-700 hover:underline shrink-0">Configure</button>
              </div>
            )}

            {/* Message body */}
            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="bg-white rounded-xl border border-zinc-200 p-5 max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-600">
                    {selectedThread.fromInitial}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-800">{selectedThread.from}</p>
                    <p className="text-[10px] text-zinc-400">to me · {selectedThread.time}</p>
                  </div>
                </div>
                <p className="text-[13px] text-zinc-700 leading-relaxed">{selectedThread.preview}</p>
                <p className="text-[13px] text-zinc-700 leading-relaxed mt-3">
                  Please let me know by end of week — we want to make sure all records are accurate before the sprint closes.
                </p>
              </div>

              {/* Reply box */}
              <div className="mt-4 max-w-2xl">
                <div className="bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="text-[10px] text-zinc-400 mb-2">Reply to {selectedThread.from}</div>
                  <textarea
                    className="w-full outline-none resize-none text-[12px] text-zinc-700 placeholder:text-zinc-400 min-h-16"
                    placeholder="Write a reply…"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <button className="flex items-center gap-1.5 text-[10px] text-violet-600 font-medium hover:underline">
                      <Sparkles className="w-3 h-3" /> Draft with Penny
                    </button>
                    <button className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-semibold rounded-lg hover:bg-rose-600">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Select a thread to preview</div>
        )}
      </div>
    </div>
  )
}
