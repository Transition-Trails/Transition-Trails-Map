import type { ReactNode } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useLocation } from 'wouter';
import {
  Activity, Users, Inbox, Brain,
  ArrowRight, AlertTriangle, CheckCircle2, Lightbulb,
  Plus, BarChart3, FileText, Bot, Map,
} from 'lucide-react';

// ── Prototype data ────────────────────────────────────────────────────────────

const ACTIVITY_ITEMS = [
  { id: 'a1', icon: Bot,      catCls: 'bg-violet-100 text-violet-700', cat: 'Penny',    text: "Learning Coach flagged low confidence on Cohort 3 recap", time: '8m' },
  { id: 'a2', icon: Inbox,    catCls: 'bg-amber-100 text-amber-700',   cat: 'Demand',   text: "New intake case — Explorer's Trail expansion", time: '23m' },
  { id: 'a3', icon: Users,    catCls: 'bg-sky-100 text-sky-700',       cat: 'Cohort',   text: 'Guided Trail Cohort 1 · Week 3 materials uploaded', time: '1h' },
  { id: 'a4', icon: Activity, catCls: 'bg-emerald-100 text-emerald-700',cat: 'Health',  text: 'Foundations Trail capacity at 89%', time: '2h' },
  { id: 'a5', icon: FileText, catCls: 'bg-indigo-100 text-indigo-700', cat: 'Knowledge',text: 'Source Mapping updated — RESOLVE Course Canvas', time: '3h' },
];

const PENNY_BULLETS = [
  "Guided Trail Cohort 1 · Week 3 of 8 — on track",
  "Foundations Trail Cohort 2 approaching capacity (89%)",
  "Trail of Mastery · Solve phase — sprint review needed before Q3",
  "5 open demand items · 2 change requests pending triage",
  "234 Penny interactions · 1 Learning Coach confidence flag",
];

const ATTENTION = [
  { icon: AlertTriangle, bg: 'bg-amber-50 border-amber-200',   text: 'Execute phase needs source documentation review',    icon_cls: 'text-amber-500' },
  { icon: Lightbulb,     bg: 'bg-sky-50 border-sky-200',       text: 'Trail of Mastery — schedule Q3 sprint review',       icon_cls: 'text-sky-500' },
  { icon: CheckCircle2,  bg: 'bg-emerald-50 border-emerald-200',text: "Explorer's Trail Cohort 3 active · 12 of 15 enrolled", icon_cls: 'text-emerald-500' },
];

const QUICK_ACTIONS = [
  { icon: Plus,      label: 'Create Demand Request', path: '/operations/demand',   primary: true  },
  { icon: Inbox,     label: 'Review Cases',          path: '/operations/demand',   primary: false },
  { icon: BarChart3, label: 'Program Health',        path: '/operations/health',   primary: false },
  { icon: Bot,       label: 'Test Penny',            path: '/penny/test',          primary: false },
  { icon: FileText,  label: 'Knowledge Library',     path: '/knowledge/library',   primary: false },
  { icon: Map,       label: 'Program Map',           path: '/program',             primary: false },
];

const PROGRAM_COLORS: Record<string, string> = {
  'explorers-trail':   'bg-sky-400',
  'foundations-trail': 'bg-emerald-400',
  'guided-trail':      'bg-amber-400',
  'trail-of-mastery':  'bg-purple-400',
  'digital-compass':   'bg-rose-400',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { programs } = useAppContext();
  const [, setLocation] = useLocation();

  return (
    <div className="h-full w-full flex flex-col p-4 gap-3 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-baseline gap-2">
        <h1 className="text-2xl font-serif font-bold text-foreground leading-none">Mission Control</h1>
        <span className="text-[10px] font-medium text-muted-foreground/50 bg-muted/50 border border-border/60 px-1.5 py-0.5 rounded leading-none">
          Prototype Data
        </span>
      </div>

      {/* ── Quick Actions — command toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {QUICK_ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => setLocation(a.path)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                a.primary
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-white border border-border/70 text-foreground/70 hover:text-foreground hover:bg-muted/50 hover:border-border'
              }`}
            >
              <Icon className={`w-3 h-3 flex-shrink-0 ${a.primary ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* ── Status strip — 4 primary signals ── */}
      <div className="flex-shrink-0 flex items-stretch rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
        {[
          { label: 'Programs',    value: programs.length.toString(), icon: Activity, cls: 'text-primary' },
          { label: 'Learners',    value: '47',  icon: Users,  cls: 'text-sky-600' },
          { label: 'Open Demand', value: '5',   icon: Inbox,  cls: 'text-amber-600' },
          { label: 'Penny / wk', value: '234', icon: Brain,  cls: 'text-violet-600' },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`flex-1 flex items-center gap-2.5 px-4 py-3 ${i > 0 ? 'border-l border-border/40' : ''}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${m.cls}`} />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{m.value}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">

        {/* ── 2-col: Activity + Penny/Attention ── */}
        <div className="grid grid-cols-5 gap-3">

          {/* Recent Activity */}
          <div className="col-span-3 space-y-1.5">
            <Label>Recent Activity</Label>
            <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
              {ACTIVITY_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 px-3 py-2.5 ${i < ACTIVITY_ITEMS.length - 1 ? 'border-b border-border/30' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${item.catCls}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground leading-snug">{item.text}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{item.cat} · {item.time} ago</p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-border/30 px-3 py-2">
                <button
                  onClick={() => setLocation('/operations/health')}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
                >
                  View All Activity <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Penny Briefing + Attention */}
          <div className="col-span-2 space-y-3">

            {/* Penny Briefing */}
            <div>
              <Label>Penny Briefing</Label>
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 shadow-sm px-3 py-2.5 mt-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wide">Penny · Chief of Staff</span>
                </div>
                <ul className="space-y-1">
                  {PENNY_BULLETS.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-violet-900 leading-snug">
                      <span className="text-violet-400 flex-shrink-0 mt-px leading-none">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setLocation('/penny/intelligence')}
                  className="flex items-center gap-1 text-[10px] text-violet-600 hover:underline font-medium mt-2"
                >
                  View Full Brief <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Executive Attention */}
            <div>
              <Label>Attention</Label>
              <div className="space-y-1.5 mt-1.5">
                {ATTENTION.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-[10px] ${a.bg}`}>
                      <Icon className={`w-3 h-3 flex-shrink-0 mt-0.5 ${a.icon_cls}`} />
                      <span className="text-foreground leading-snug">{a.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* ── Program Portfolio ── */}
        <div className="pb-4">
          <Label>Program Portfolio</Label>
          <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden mt-1.5">
            {programs.map((p, i) => {
              const dot = PROGRAM_COLORS[p.id] ?? 'bg-muted';
              return (
                <button
                  key={p.id}
                  onClick={() => setLocation('/program')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/30 transition-colors ${
                    i < programs.length - 1 ? 'border-b border-border/30' : ''
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-[12px] font-semibold text-foreground flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{p.duration}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{children}</p>
  );
}
