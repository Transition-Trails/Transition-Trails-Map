import type { ReactNode } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import {
  Activity, Users, Inbox, Brain,
  ArrowRight,
  Plus, BarChart3, FileText, Bot, Map, Layers, BookOpen,
} from 'lucide-react';

// ── Activity items — tagged by minimum tier to show ───────────────────────────
const ALL_ACTIVITY = [
  { id: 'a1', icon: Bot,      catCls: 'bg-violet-100 text-violet-700', cat: 'Penny',    text: "Learning Coach flagged low confidence on Cohort 3 recap",         time: '8m',  minPower: false },
  { id: 'a2', icon: Inbox,    catCls: 'bg-amber-100 text-amber-700',   cat: 'Demand',   text: "New intake case — Explorer's Trail expansion",                    time: '23m', minPower: true  },
  { id: 'a3', icon: Users,    catCls: 'bg-sky-100 text-sky-700',       cat: 'Cohort',   text: 'Guided Trail Cohort 1 · Week 3 materials uploaded',               time: '1h',  minPower: false },
  { id: 'a4', icon: Activity, catCls: 'bg-emerald-100 text-emerald-700',cat: 'Programs', text: 'Foundations Trail cohort at 89% capacity',                       time: '2h',  minPower: false },
  { id: 'a5', icon: FileText, catCls: 'bg-indigo-100 text-indigo-700', cat: 'Knowledge',text: 'Sprint 3 Resume Writing materials updated',                       time: '3h',  minPower: false },
  { id: 'a6', icon: FileText, catCls: 'bg-indigo-100 text-indigo-700', cat: 'Knowledge',text: 'Source Mapping updated — RESOLVE Course Canvas',                  time: '3h',  minPower: true  },
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
  const { programs, openSlackPanel } = useAppContext();
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();
  const [, setLocation] = useLocation();

  // Tier-aware quick actions
  const quickActions = isEveryday
    ? [
        { icon: Map,      label: 'My Programs',      path: '/program',           primary: true  },
        { icon: Bot,      label: 'Ask Penny',         path: '/penny/test',        primary: false },
        { icon: BookOpen, label: 'Knowledge Library', path: '/knowledge/library', primary: false },
        { icon: Users,    label: 'My Cohort',         path: '/program',           primary: false },
      ]
    : isPowerOrAbove && !isAdminOrAbove
    ? [
        { icon: Map,      label: 'Program Map',       path: '/program',           primary: false },
        { icon: Bot,      label: 'Test Penny',        path: '/penny/test',        primary: false },
        { icon: BarChart3,label: 'Program Health',    path: '/operations/health', primary: false },
        { icon: FileText, label: 'Knowledge Library', path: '/knowledge/library', primary: false },
      ]
    : [
        { icon: Plus,      label: 'Create Demand Request', path: '/operations/demand',   primary: true  },
        { icon: Inbox,     label: 'Review Cases',          path: '/operations/demand',   primary: false },
        { icon: BarChart3, label: 'Program Health',        path: '/operations/health',   primary: false },
        { icon: Bot,       label: 'Test Penny',            path: '/penny/test',          primary: false },
        { icon: FileText,  label: 'Knowledge Library',     path: '/knowledge/library',   primary: false },
        { icon: Map,       label: 'Program Map',           path: '/program',             primary: false },
      ];

  // Tier-aware activity feed
  const activityItems = isEveryday
    ? ALL_ACTIVITY.filter(a => !a.minPower)
    : ALL_ACTIVITY;

  // Status strip metrics (simplified for everyday)
  const metrics = isEveryday
    ? [
        { label: 'My Programs',    value: programs.length.toString(), icon: Activity, cls: 'text-primary' },
        { label: 'Cohort Learners',value: '47',  icon: Users,  cls: 'text-sky-600' },
        { label: 'Upcoming Tasks', value: '3',   icon: Inbox,  cls: 'text-amber-600' },
        { label: 'Penny Nudges',   value: '12',  icon: Brain,  cls: 'text-violet-600' },
      ]
    : [
        { label: 'Programs',    value: programs.length.toString(), icon: Activity, cls: 'text-primary' },
        { label: 'Learners',    value: '47',  icon: Users,  cls: 'text-sky-600' },
        { label: 'Open Demand', value: '5',   icon: Inbox,  cls: 'text-amber-600' },
        { label: 'Penny / wk', value: '234', icon: Brain,  cls: 'text-violet-600' },
      ];

  return (
    <div className="h-full w-full flex flex-col p-4 gap-3 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-baseline gap-2">
        <h1 className="text-2xl font-serif font-bold text-foreground leading-none">
          {isEveryday ? 'My Dashboard' : 'Mission Control'}
        </h1>
        <span className="text-[10px] font-medium text-muted-foreground/50 bg-muted/50 border border-border/60 px-1.5 py-0.5 rounded leading-none">
          Prototype Data
        </span>
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap">
        {quickActions.map(a => {
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
        <button
          onClick={() => openSlackPanel({ context: 'home', title: isEveryday ? 'My Trail Signals' : TERMS.missionControl, subtitle: TERMS.signalSubtitle(isEveryday ? 'My Dashboard' : TERMS.missionControl) })}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-[#4A154B]/20 text-[#4A154B] hover:bg-[#4A154B]/[0.04] transition-colors whitespace-nowrap ml-auto"
        >
          <Layers className="w-3 h-3" />
          {TERMS.trailSignals}
        </button>
      </div>

      {/* ── Status strip ── */}
      <div className="flex-shrink-0 flex items-stretch rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
        {metrics.map((m, i) => {
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

        {/* ── Recent Activity — full width ── */}
        <div>
          <Label>Recent Activity</Label>
          <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden mt-1.5">
            {activityItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className={`flex items-start gap-2.5 px-3 py-2.5 ${i < activityItems.length - 1 ? 'border-b border-border/30' : ''}`}>
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
              <button onClick={() => setLocation('/operations/health')} className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
                View All Activity <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Program Portfolio ── */}
        <div className="pb-4">
          <Label>{isEveryday ? 'My Programs' : 'Program Portfolio'}</Label>
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
