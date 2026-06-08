import { useAppContext } from '@/context/AppContext';
import { useLocation } from 'wouter';
import {
  Activity, Users, Inbox, Brain, BookOpen, Map,
  ArrowRight, AlertTriangle, CheckCircle2, Lightbulb,
  Plus, BarChart3, FileText, Bot, MessageSquare, Flag, Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ── Prototype data — clearly labeled; future: Salesforce, GA4, Agentforce ─────

const ACTIVITY_FEED = [
  { id: 'a1', icon: Bot,           cat: 'Penny',    catCls: 'bg-violet-100 text-violet-700',  text: "Learning Coach flagged low confidence on Cohort 3 session recap", time: '8m ago' },
  { id: 'a2', icon: Inbox,         cat: 'Demand',   catCls: 'bg-amber-100 text-amber-700',    text: "New intake case submitted — Explorer's Trail expansion", time: '23m ago' },
  { id: 'a3', icon: Users,         cat: 'Cohort',   catCls: 'bg-sky-100 text-sky-700',        text: 'Guided Trail Cohort 1 · Week 3 materials uploaded to Knowledge Library', time: '1h ago' },
  { id: 'a4', icon: Activity,      cat: 'Health',   catCls: 'bg-emerald-100 text-emerald-700',text: 'Program Health · Foundations Trail capacity at 89%', time: '2h ago' },
  { id: 'a5', icon: FileText,      cat: 'Knowledge',catCls: 'bg-indigo-100 text-indigo-700',  text: 'Source Mapping updated — RESOLVE Course Canvas cross-reference added', time: '3h ago' },
  { id: 'a6', icon: Bot,           cat: 'Penny',    catCls: 'bg-violet-100 text-violet-700',  text: 'Trail Guide processed 12 intake briefs since last session', time: '4h ago' },
  { id: 'a7', icon: MessageSquare, cat: 'Slack',    catCls: 'bg-green-100 text-green-700',    text: '#trail-wins · Cohort 2: 8 of 10 learners completed career module', time: 'Yesterday' },
  { id: 'a8', icon: Flag,          cat: 'Demand',   catCls: 'bg-amber-100 text-amber-700',    text: '2 change requests submitted for review — Q4 curriculum updates', time: 'Yesterday' },
];

const PENNY_BRIEFING =
  "Three cohorts are active. Guided Trail Cohort 1 is in Week 3 of 8 — on track. Foundations Trail Cohort 2 is nearing capacity. Trail of Mastery design is in Solve phase and needs a sprint review before Q3. Open demand has 5 active items; two change requests are pending triage. Penny processed 234 interactions this week; one confidence flag on Learning Coach requires attention.";

const EXEC_ATTENTION = {
  warnings: [
    'Execute phase distinction from Leverage needs source documentation review',
    'Penny Exam Coach response quality below 80% threshold (prototype)',
  ],
  opportunities: [
    'Trail of Mastery design active — schedule Q3 sprint review',
    'Salesforce case sync integration planned — intake automation unlocked when live',
  ],
  healthy: [
    "Explorer's Trail Cohort 3 active · 12 of 15 learners enrolled",
    'Guided Trail Cohort 1 · Week 3 of 8 on track',
    'Knowledge Library · 14 source documents indexed and current',
  ],
};

const QUICK_ACTIONS = [
  { icon: Plus,      label: 'Create Demand Request', path: '/demand/intake',                cls: 'bg-primary text-primary-foreground hover:bg-primary/90', textCls: 'text-primary-foreground' },
  { icon: Inbox,     label: 'Review Cases',          path: '/demand/cases',                 cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
  { icon: BarChart3, label: 'Program Health',        path: '/operations/program-health',    cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
  { icon: Bot,       label: 'Launch Penny Test',     path: '/penny/test-penny',             cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
  { icon: FileText,  label: 'Add Knowledge Article', path: '/library/documents',            cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
  { icon: Activity,  label: 'Salesforce Health',     path: '/operations/salesforce-health', cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
  { icon: Map,       label: 'Open Program Map',      path: '/navigator/program-map',        cls: 'bg-white border border-border hover:bg-muted/40', textCls: 'text-foreground' },
];

const PROGRAM_COLORS: Record<string, string> = {
  'explorers-trail':   'bg-sky-400',
  'foundations-trail': 'bg-emerald-400',
  'guided-trail':      'bg-amber-400',
  'trail-of-mastery':  'bg-purple-400',
  'digital-compass':   'bg-rose-400',
};

const PRICING_LABELS: Record<string, { label: string; cls: string }> = {
  subsidized:         { label: 'Subsidized', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paid:               { label: 'Paid',       cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  'grant-subsidized': { label: 'Grant',      cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { programs, sourceDocuments } = useAppContext();
  const [, setLocation] = useLocation();

  const snapStats = [
    { label: 'Active Programs',     value: programs.length.toString(),          note: 'Confirmed',            icon: Layers,    bg: 'bg-primary/8  text-primary' },
    { label: 'Active Cohorts',      value: '3',                                  note: 'Prototype',            icon: Users,     bg: 'bg-sky-100    text-sky-700' },
    { label: 'Active Learners',     value: '47',                                 note: 'Prototype',            icon: Users,     bg: 'bg-emerald-100 text-emerald-700' },
    { label: 'Open Demand',         value: '5',                                  note: 'Prototype',            icon: Inbox,     bg: 'bg-amber-100  text-amber-700' },
    { label: 'Penny Interactions',  value: '234',                                note: 'This week · Prototype',icon: Brain,     bg: 'bg-violet-100 text-violet-700' },
    { label: 'Knowledge Articles',  value: sourceDocuments.length.toString(),    note: 'Confirmed',            icon: BookOpen,  bg: 'bg-indigo-100 text-indigo-700' },
  ];

  return (
    <div className="h-full w-full flex flex-col p-4 gap-3 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">
            Mission Control
          </h1>
          <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/60 border border-border px-1.5 py-0.5 rounded flex-shrink-0">
            Prototype Data
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          What is happening, what needs attention, and where to go next.
        </p>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">

        {/* ── Section 1: Organization Snapshot ── */}
        <SectionHead title="Organization Snapshot" note="Live counts future: Salesforce · Prototype values shown" />
        <div className="grid grid-cols-6 gap-2">
          {snapStats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-border/60 bg-white/80 shadow-sm px-3 py-3">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mb-2 ${s.bg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[11px] font-medium text-foreground/80 mt-0.5 leading-none">{s.label}</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-none">{s.note}</p>
              </div>
            );
          })}
        </div>

        {/* ── Section 2+3: Activity Feed + Right Panel ── */}
        <div className="grid grid-cols-5 gap-3">

          {/* Activity Feed */}
          <div className="col-span-3 space-y-1.5">
            <SectionHead title="What's Happening Now" note="Prototype feed · future: Salesforce · Slack · Penny live sync" />
            <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
              {ACTIVITY_FEED.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 px-3 py-2.5 ${i < ACTIVITY_FEED.length - 1 ? 'border-b border-border/30' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${item.catCls}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${item.catCls}`}>
                          {item.cat}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-foreground leading-snug">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Penny Briefing + Exec Attention */}
          <div className="col-span-2 space-y-3 flex flex-col">

            {/* Penny Briefing */}
            <div>
              <SectionHead title="Penny Briefing" note="Prototype executive summary" />
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 shadow-sm p-3 mt-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wide">Penny · Chief of Staff</span>
                  <span className="text-[9px] text-violet-400 ml-auto">Prototype</span>
                </div>
                <p className="text-[11px] text-violet-900 leading-relaxed">{PENNY_BRIEFING}</p>
              </div>
            </div>

            {/* Executive Attention */}
            <div className="flex-1">
              <SectionHead title="Executive Attention" note="Prototype · future: automated health checks" />
              <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden mt-1.5 space-y-0">

                {EXEC_ATTENTION.warnings.length > 0 && (
                  <div className="px-3 py-2 border-b border-border/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Needs Attention</span>
                    </div>
                    {EXEC_ATTENTION.warnings.map((w, i) => (
                      <p key={i} className="text-[10px] text-foreground leading-snug pl-4 mb-0.5">{w}</p>
                    ))}
                  </div>
                )}

                {EXEC_ATTENTION.opportunities.length > 0 && (
                  <div className="px-3 py-2 border-b border-border/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb className="w-3 h-3 text-sky-500 flex-shrink-0" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600">Opportunities</span>
                    </div>
                    {EXEC_ATTENTION.opportunities.map((o, i) => (
                      <p key={i} className="text-[10px] text-foreground leading-snug pl-4 mb-0.5">{o}</p>
                    ))}
                  </div>
                )}

                {EXEC_ATTENTION.healthy.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Confirmed Healthy</span>
                    </div>
                    {EXEC_ATTENTION.healthy.map((h, i) => (
                      <p key={i} className="text-[10px] text-foreground leading-snug pl-4 mb-0.5">{h}</p>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: Program Portfolio ── */}
        <SectionHead title="Program Portfolio" note="Confirmed from source blueprints · click any row to open Program Map" />
        <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[16px_1fr_140px_80px_90px_28px] gap-x-3 px-4 py-2 border-b border-border/40 bg-muted/20">
            {['', 'Program', 'Audience', 'Format', 'Pricing', ''].map((h, i) => (
              <p key={i} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{h}</p>
            ))}
          </div>
          {programs.map((p, i) => {
            const dotCls = PROGRAM_COLORS[p.id] ?? 'bg-muted';
            const pric   = PRICING_LABELS[p.pricingStatus] ?? { label: p.pricingStatus, cls: 'bg-muted text-muted-foreground border-border' };
            return (
              <button
                key={p.id}
                onClick={() => setLocation('/navigator/program-map')}
                className={`w-full grid grid-cols-[16px_1fr_140px_80px_90px_28px] gap-x-3 items-center px-4 py-2.5 text-left transition-colors hover:bg-muted/30 ${
                  i < programs.length - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotCls}`} />
                <div>
                  <p className="text-[12px] font-semibold text-foreground leading-none">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-none truncate">{p.strategicRole}</p>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{p.audience}</p>
                <p className="text-[10px] text-muted-foreground">{p.duration}</p>
                <span className={`text-[9px] border px-1.5 py-0.5 rounded font-medium w-fit ${pric.cls}`}>
                  {pric.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </button>
            );
          })}
        </div>

        {/* ── Section 5: Quick Actions ── */}
        <SectionHead title="Quick Actions" note="" />
        <div className="grid grid-cols-7 gap-2 pb-4">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button
                key={a.path}
                onClick={() => setLocation(a.path)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center transition-all shadow-sm ${a.cls}`}
              >
                <Icon className={`w-4 h-4 ${a.textCls}`} />
                <span className={`text-[10px] font-medium leading-tight ${a.textCls}`}>{a.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap flex-shrink-0">
      <h2 className="text-sm font-bold text-foreground flex-shrink-0">{title}</h2>
      {note && <span className="text-[9px] text-muted-foreground/60 truncate">{note}</span>}
    </div>
  );
}
