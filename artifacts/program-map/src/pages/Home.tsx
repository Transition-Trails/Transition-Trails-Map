import type { ReactNode } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useLocation } from 'wouter';
import {
  Activity, Users, Inbox, Brain,
  ArrowRight, CheckCircle2, Circle,
  BarChart3, FileText, Bot,
  AlertTriangle, Calendar,
} from 'lucide-react';

// ── Activity items ────────────────────────────────────────────────────────────
const ALL_ACTIVITY = [
  { id: 'a1', icon: Bot,      catCls: 'bg-violet-100 text-violet-700', cat: 'Penny',    text: "Learning Coach flagged low confidence on Cohort 3 recap",      time: '8m',  minPower: false },
  { id: 'a2', icon: Inbox,    catCls: 'bg-amber-100 text-amber-700',   cat: 'Demand',   text: "New intake case — Explorer's Trail expansion",                 time: '23m', minPower: true  },
  { id: 'a3', icon: Users,    catCls: 'bg-sky-100 text-sky-700',       cat: 'Cohort',   text: 'Guided Trail Cohort 1 · Week 3 materials uploaded',            time: '1h',  minPower: false },
  { id: 'a4', icon: Activity, catCls: 'bg-emerald-100 text-emerald-700',cat:'Programs', text: 'Foundations Trail cohort at 89% capacity',                    time: '2h',  minPower: false },
  { id: 'a5', icon: FileText, catCls: 'bg-indigo-100 text-indigo-700', cat: 'Knowledge',text: 'Sprint 3 Resume Writing materials updated',                   time: '3h',  minPower: false },
];

const UPCOMING_SESSIONS = [
  { label: 'Guided Trail · Week 3 Session',     date: 'Today, 2:00 PM',   done: false },
  { label: 'Foundations Trail · Cohort Check-in',date: 'Tomorrow, 10:00 AM', done: false },
  { label: 'RESOLVE Phase Review',               date: 'Thu, Jun 13',      done: false },
];

const MY_TASKS = [
  { label: 'Review Week 3 materials',   done: false },
  { label: 'Update Cohort 1 attendance',done: false },
  { label: 'Complete program survey',   done: true  },
];

const ATTENTION_ITEMS = [
  { level: 'critical', text: 'Assign Penny Admin Owner', sub: 'Penny AI' },
  { level: 'high',     text: 'Plan Nonprofit Cloud Migration Sprint', sub: 'Integrations' },
  { level: 'high',     text: 'Build Penny Slack Adapter MVP', sub: 'Communications' },
];

const QUICK_LINKS = [
  { label: 'Program Handbook',        path: '/knowledge/library' },
  { label: 'RESOLVE Course Overview', path: '/knowledge/library' },
  { label: 'Week 3 Materials',        path: '/knowledge/library' },
  { label: 'Learner FAQ',             path: '/knowledge/library' },
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
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();
  const [, setLocation] = useLocation();

  const activityItems = isEveryday
    ? ALL_ACTIVITY.filter(a => !a.minPower)
    : ALL_ACTIVITY;

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
    <div className="h-full w-full flex flex-col p-3 gap-2.5 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0">
        <h1 className="text-sm font-semibold text-foreground leading-none">
          {isEveryday ? 'My Dashboard' : 'Mission Control'}
        </h1>
      </div>

      {/* ── Metric strip ── */}
      <div className="flex-shrink-0 flex items-stretch rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`flex-1 flex items-center gap-2 px-3 py-2 ${i > 0 ? 'border-l border-border/40' : ''}`}>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${m.cls}`} />
              <div>
                <p className="text-base font-bold text-foreground leading-none">{m.value}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3">

          {/* ── LEFT column ── */}
          <div className="space-y-3">

            {/* Recent Activity */}
            <Card label="Recent Activity">
              {activityItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className={`flex items-start gap-2 px-3 py-2 ${i < activityItems.length - 1 ? 'border-b border-border/30' : ''}`}>
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
              <CardFooter onClick={() => setLocation('/operations/health')} label="View all activity" />
            </Card>

            {/* Everyday: Upcoming Sessions | Power+: Attention Items */}
            {isEveryday ? (
              <Card label="Upcoming Sessions">
                {UPCOMING_SESSIONS.map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < UPCOMING_SESSIONS.length - 1 ? 'border-b border-border/30' : ''}`}>
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{s.label}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{s.date}</p>
                    </div>
                  </div>
                ))}
                <CardFooter onClick={() => setLocation('/collaboration')} label="Open calendar" />
              </Card>
            ) : (
              <Card label="Attention Required">
                {ATTENTION_ITEMS.map((a, i) => (
                  <div key={a.text} className={`flex items-start gap-2.5 px-3 py-2 ${i < ATTENTION_ITEMS.length - 1 ? 'border-b border-border/30' : ''}`}>
                    <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${a.level === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{a.text}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{a.sub}</p>
                    </div>
                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap ${a.level === 'critical' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                      {a.level}
                    </span>
                  </div>
                ))}
                <CardFooter onClick={() => setLocation('/operations')} label="View all in Operations" />
              </Card>
            )}
          </div>

          {/* ── RIGHT column ── */}
          <div className="space-y-3">

            {/* My Programs / Program Portfolio */}
            <Card label={isEveryday ? 'My Programs' : 'Program Portfolio'}>
              {programs.map((p, i) => {
                const dot = PROGRAM_COLORS[p.id] ?? 'bg-muted';
                return (
                  <button
                    key={p.id}
                    onClick={() => setLocation('/program')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/30 transition-colors ${i < programs.length - 1 ? 'border-b border-border/30' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-[11px] font-medium text-foreground flex-1 truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:block">{p.duration}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  </button>
                );
              })}
              <CardFooter onClick={() => setLocation('/program')} label={isEveryday ? 'Open Program Hub' : 'Open Program & Curriculum'} />
            </Card>

            {/* Everyday: Tasks + Resources | Power: Penny Performance | Admin: Demand queue */}
            {isEveryday ? (
              <>
                <Card label="My Tasks">
                  {MY_TASKS.map((t, i) => (
                    <div key={t.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < MY_TASKS.length - 1 ? 'border-b border-border/30' : ''}`}>
                      {t.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                      }
                      <span className={`text-[11px] flex-1 ${t.done ? 'line-through text-muted-foreground/50' : 'text-foreground'}`}>{t.label}</span>
                    </div>
                  ))}
                </Card>

                <Card label="Quick Resources">
                  {QUICK_LINKS.map((l, i) => (
                    <button
                      key={l.label}
                      onClick={() => setLocation(l.path)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors ${i < QUICK_LINKS.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                      <span className="text-[11px] text-foreground flex-1 truncate">{l.label}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  ))}
                  <CardFooter onClick={() => setLocation('/knowledge/library')} label="Open Knowledge Library" />
                </Card>
              </>
            ) : isPowerOrAbove && !isAdminOrAbove ? (
              <Card label="Penny This Week">
                {[
                  { icon: Brain,         label: 'Interactions',     value: '234', sub: 'this week',  cls: 'text-violet-600', bg: 'bg-violet-50'  },
                  { icon: Users,         label: 'Learner sessions', value: '12',  sub: 'active now', cls: 'text-sky-600',    bg: 'bg-sky-50'     },
                  { icon: BarChart3,     label: 'Prompt quality',   value: '87%', sub: 'avg score',  cls: 'text-emerald-600',bg: 'bg-emerald-50' },
                  { icon: AlertTriangle, label: 'Knowledge gaps',   value: '3',   sub: 'flagged',    cls: 'text-amber-600',  bg: 'bg-amber-50'   },
                ].map((m, i, arr) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                        <Icon className={`w-3 h-3 ${m.cls}`} />
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-1">{m.label}</span>
                      <div className="text-right">
                        <p className={`text-[13px] font-bold leading-none ${m.cls}`}>{m.value}</p>
                        <p className="text-[9px] text-muted-foreground/60 leading-none mt-0.5">{m.sub}</p>
                      </div>
                    </div>
                  );
                })}
                <CardFooter onClick={() => setLocation('/penny/intelligence')} label="Open Penny Intelligence" />
              </Card>
            ) : (
              <Card label="Open Demand">
                {[
                  { id: 'D-041', title: "Explorer's Trail expansion", priority: 'High'     },
                  { id: 'D-039', title: 'Slack channel restructure',  priority: 'Medium'   },
                  { id: 'D-037', title: 'Phase 2 curriculum audit',   priority: 'High'     },
                  { id: 'D-035', title: 'Penny knowledge gap review', priority: 'Critical' },
                  { id: 'D-033', title: 'Q3 capacity planning',       priority: 'Medium'   },
                ].map((d, i, arr) => (
                  <div key={d.id} className={`flex items-center gap-2 px-3 py-2 ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}>
                    <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0 w-10">{d.id}</span>
                    <span className="text-[11px] text-foreground flex-1 truncate">{d.title}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap border ${
                      d.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200'
                      : d.priority === 'High'   ? 'bg-orange-50 text-orange-600 border-orange-200'
                      : 'bg-muted text-muted-foreground border-border/60'
                    }`}>{d.priority}</span>
                  </div>
                ))}
                <CardFooter onClick={() => setLocation('/operations/demand')} label="Open Demand Management" />
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Shared card primitives ────────────────────────────────────────────────────

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">{children}</p>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function CardFooter({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div className="border-t border-border/30 px-3 py-1.5">
      <button onClick={onClick} className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
        {label} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
