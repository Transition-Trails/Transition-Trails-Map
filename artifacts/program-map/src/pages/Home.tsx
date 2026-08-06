import type { ReactNode } from 'react';
import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { useLocation } from 'wouter';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import {
  Activity, Users, Inbox, Brain,
  ArrowRight, CheckCircle2, Circle,
  BarChart3, FileText, Bot,
  AlertTriangle, Calendar,
  RefreshCw, WifiOff, ChevronRight,
  Home as HomeIcon,
} from 'lucide-react';
import { useSfOpsSummary, formatSyncAge, type SfCount } from '@/hooks/useSfOpsSummary';
import {
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG,
} from '@/data/operationalIntelligenceData';
import { useActionItems } from '@/hooks/useActionItems';
import { useHealthScores } from '@/hooks/useHealthScores';

// ── Route maps (mirrors OperationsHub) ───────────────────────────────────────
const REC_ID_ROUTE: Record<string, string> = {
  'rec-1':  '/admin/people-access#owners',
  'rec-3':  '/collaboration/slack',
  'rec-4':  '/admin/people-access#owners',
  'rec-5':  '/penny/capabilities',
  'rec-7':  '/penny/capabilities',
  'rec-8':  '/knowledge/sources',
  'rec-9':  '/navigator/program-map',
  'rec-10': '/admin/integrations',
  'rec-11': '/admin/integrations',
  'rec-12': '/penny/prompts',
};
const REC_DOMAIN_ROUTE: Record<string, string> = {
  [TERMS.aiAssistant]: '/penny/capabilities',
  'People & Roles': '/admin/people-access#owners',
  'Programs':       '/navigator/program-map',
  'Communications': '/collaboration/slack',
  'Integrations':   '/admin/integrations',
  'Knowledge':      '/knowledge/sources',
  'Curriculum':     '/navigator/program-map',
};

// ── Static prototype data ─────────────────────────────────────────────────────
const ALL_ACTIVITY = [
  { id: 'a1', icon: Bot,      catCls: 'bg-[#EDF5F8] text-[#2F6F7E]', cat: TERMS.aiAssistant,    text: "Learning Coach flagged low confidence on Cohort 3 recap",      time: '8m',  minPower: false },
  { id: 'a2', icon: Inbox,    catCls: 'bg-[#FFF3E0] text-[#CC8400]',   cat: 'Demand',   text: "New intake case — Explorer's Trail expansion",                 time: '23m', minPower: true  },
  { id: 'a3', icon: Users,    catCls: 'bg-[#EDF5F8] text-[#2F6F7E]',       cat: 'Cohort',   text: 'Guided Trail Cohort 1 · Week 3 materials uploaded',            time: '1h',  minPower: false },
  { id: 'a4', icon: Activity, catCls: 'bg-[#E6F0EA] text-[#2F6B3F]',cat:'Programs', text: 'Foundations Trail cohort at 89% capacity',                    time: '2h',  minPower: false },
  { id: 'a5', icon: FileText, catCls: 'bg-[#EDF5F8] text-[#2F6F7E]', cat: 'Knowledge',text: 'Sprint 3 Resume Writing materials updated',                   time: '3h',  minPower: false },
];

const UPCOMING_SESSIONS = [
  { label: 'Guided Trail · Week 3 Session',      date: 'Today, 2:00 PM'     },
  { label: 'Foundations Trail · Cohort Check-in', date: 'Tomorrow, 10:00 AM' },
  { label: 'RESOLVE Phase Review',                date: 'Thu, Jun 13'        },
];

const MY_TASKS = [
  { label: 'Review Week 3 materials',    done: false },
  { label: 'Update Cohort 1 attendance', done: false },
  { label: 'Complete program survey',    done: true  },
];

const QUICK_LINKS = [
  { label: 'Program Handbook',        path: '/knowledge/library' },
  { label: 'RESOLVE Course Overview', path: '/knowledge/library' },
  { label: 'Week 3 Materials',        path: '/knowledge/library' },
  { label: 'Learner FAQ',             path: '/knowledge/library' },
];

const PROGRAM_COLORS: Record<string, string> = {
  'explorers-trail':   'bg-[#2F6F7E]',
  'foundations-trail': 'bg-[#2F6B3F]',
  'guided-trail':      'bg-[#CC8400]',
  'trail-of-mastery':  'bg-[#2F6F7E]',
  'digital-compass':   'bg-[#A93F2F]',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { programs } = useAppContext();
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();
  const [, navigate] = useLocation();
  const { user } = useGoogleAuth();
  // Superadmins always get audience=null (isKnownStaff short-circuits before
  // deriveAudience runs), so check group membership directly instead.
  const isTeam = user?.audience === 'team'
    || user?.groups?.includes('team@transitiontrails.org');
  const { visibleRecs } = useActionItems();
  const { domainHealthData, overallHealthScore, overallHealthLevel } = useHealthScores();

  const { data: sfData, isLoading: sfLoading, isError: sfError, refetch, isFetching } = useSfOpsSummary();

  const cfg = HEALTH_LEVEL_CONFIG[overallHealthLevel];
  const n = (v: SfCount | number | null | undefined): string => {
   if (v == null) return '—';
   if (typeof v === 'object') {
     if (v.error) return 'Error';
     if (v.value === null) return '—';
     return v.value.toLocaleString();
   }
   return v.toLocaleString();
 };

  const activityItems = isEveryday
    ? ALL_ACTIVITY.filter(a => !a.minPower)
    : ALL_ACTIVITY;

  const everydayMetrics = [
    { label: 'My Programs',    value: programs.length.toString(), icon: Activity, cls: 'text-primary' },
    { label: 'Cohort Learners',value: '47',  icon: Users,  cls: 'text-[#2F6F7E]'    },
    { label: 'Upcoming Tasks', value: '3',   icon: Inbox,  cls: 'text-[#CC8400]'  },
    { label: `${TERMS.aiAssistant} Nudges`,   value: '12',  icon: Brain,  cls: 'text-[#2F6F7E]' },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-0">
        <h1 className="text-sm font-semibold text-foreground leading-none">
          {isEveryday ? 'My Dashboard' : 'Mission Control'}
        </h1>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">

        {/* ── Back to Homebase (team users only) ── */}
        {isTeam && (
          <button
            onClick={() => navigate('/homebase')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Home className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground leading-none">Back to Homebase</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Return to your daily workspace</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </button>
        )}

        {/* ── EVERYDAY: compact metric strip ── */}
        {isEveryday && (
          <div className="flex items-stretch rounded-xl border border-border/60 bg-white/80 shadow-sm overflow-hidden">
            {everydayMetrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className={`flex-1 flex items-center gap-2 px-3 py-2 ${i > 0 ? 'border-l border-border/40' : ''}`}>
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${m.cls}`} />
                  <div>
                    <p className="text-base font-bold text-foreground leading-none">{m.value}</p>
                    <p className="text-[14px] text-muted-foreground leading-none mt-0.5">{m.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── POWER+: Live Salesforce strip ── */}
        {!isEveryday && (
          sfError ? (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2 flex items-center gap-2">
              <WifiOff className="w-3 h-3 text-[#A93F2F] shrink-0" />
              <span className="text-[14px] text-[#A93F2F] flex-1">Salesforce unreachable — live counts unavailable.</span>
              <button onClick={() => refetch()} className="text-[14px] font-semibold text-[#A93F2F] hover:underline flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Retry
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/60 px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sfLoading || isFetching ? 'bg-[#CC8400] animate-pulse' : (sfData && sfData.cacheAge > 300) ? 'bg-[#CC8400]' : 'bg-[#E6F0EA]0'}`} />
                  <span className="text-[14px] font-bold  text-[#245531]">Live from Salesforce</span>
                  {sfData && (
                    <span className={`text-[14px] ${sfData.cacheAge > 300 ? 'text-[#CC8400]' : 'text-[#2F6B3F]/70'}`}>
                      · {sfData.cacheAge > 300 ? 'stale · ' : ''}{formatSyncAge(sfData.lastUpdated)}
                    </span>
                  )}
                </div>
                <button onClick={() => refetch()} disabled={isFetching} className="text-[14px] text-[#2F6B3F]/60 hover:text-[#245531] disabled:opacity-40">
                  <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {sfLoading ? (
                <div className="flex gap-2">{[1,2,3,4].map(i => <div key={i} className="h-7 flex-1 rounded bg-[#E6F0EA] animate-pulse" />)}</div>
              ) : sfData ? (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Programs',    value: n(sfData.programs.total),                   sub: `${n(sfData.programs.active)} active`         },
                    { label: 'Enrollments', value: n(sfData.engagements.total),                sub: `${n(sfData.engagements.active)} active`       },
                    { label: 'Deliveries',  value: n(sfData.serviceDeliveries.last30Days),     sub: 'last 30 days'                                 },
                    { label: 'Open Cases',  value: n(sfData.cases.open),                       sub: `${n(sfData.cases.highPriority)} high priority` },
                  ].map(m => (
                    <div key={m.label} className="rounded bg-white/70 border border-[#E6F0EA] px-2 py-1.5">
                      <p className="text-[14px] font-bold text-[#2F6B3F]/60  mb-0.5">{m.label}</p>
                      <p className="text-[15px] font-bold text-[#245531] leading-none">{m.value}</p>
                      <p className="text-[14px] text-[#2F6B3F]/60 mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        )}

        {/* ── POWER+: Overall health score row ── */}
        {!isEveryday && (
          <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center gap-5">
            <div className="flex items-baseline gap-2 shrink-0">
              <p className={`text-4xl font-bold leading-none ${cfg.score}`}>{overallHealthScore}</p>
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] text-muted-foreground/60 font-medium  leading-none">Overall</span>
                <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 leading-none ${cfg.cls}`}>{cfg.label}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-border/60 shrink-0" />
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              {[
                { l: 'Critical',        v: visibleRecs.filter(r => r.priority === 'critical').length, c: 'text-[#A93F2F]',   bg: 'bg-[#FBEAE6] border-[#E8B9B4]'   },
                { l: 'High Priority',   v: visibleRecs.filter(r => r.priority === 'high').length,     c: 'text-[#CC8400]', bg: 'bg-[#FFF3E0] border-[#FFD08A]' },
                { l: 'Domains At Risk', v: domainHealthData.filter(d => d.level === 'at-risk').length,    c: 'text-[#A93F2F]',   bg: 'bg-[#FBEAE6] border-[#E8B9B4]'   },
                { l: 'Needs Work',      v: domainHealthData.filter(d => d.level === 'needs-work').length, c: 'text-[#CC8400]',  bg: 'bg-[#FFF3E0] border-[#FFD08A]'  },
              ].map(s => (
                <div key={s.l} className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 ${s.bg}`}>
                  <span className={`text-xl font-bold leading-none ${s.c}`}>{s.v}</span>
                  <span className={`text-[14px] font-medium leading-tight ${s.c} opacity-80`}>{s.l}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/operations')}
              className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
              Full report <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── POWER+: Domain Health ── */}
        {!isEveryday && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[14px] font-bold  text-muted-foreground/60">Domain Health</p>
              <button
                onClick={() => navigate('/operations/health')}
                className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                Health Indicators <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {domainHealthData.map(d => {
                const dc = HEALTH_LEVEL_CONFIG[d.level];
                return (
                  <button key={d.id}
                    onClick={() => navigate('/operations/health')}
                    className="rounded-lg border border-border bg-white px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 leading-tight ${dc.cls}`}>{dc.label}</span>
                      <span className={`text-lg font-bold leading-none ${dc.score}`}>{d.score}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{d.domain}</p>
                    <p className="text-[14px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{d.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── POWER+: Critical & High Priority Actions ── */}
        {!isEveryday && (() => {
          const allItems = [
            ...visibleRecs.filter(r => r.priority === 'critical'),
            ...visibleRecs.filter(r => r.priority === 'high'),
          ];
          const LIMIT   = 6;
          const visible = allItems.slice(0, LIMIT);
          const extra   = allItems.length - LIMIT;
          return (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[14px] font-bold  text-muted-foreground/60">
                  Critical &amp; High Priority Actions
                </p>
                {extra > 0 && (
                  <button
                    onClick={() => navigate('/operations/recommendations')}
                    className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    View all {allItems.length} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {visible.map(r => {
                  const pc   = REC_PRIORITY_CONFIG[r.priority];
                  const dest = REC_ID_ROUTE[r.id] ?? REC_DOMAIN_ROUTE[r.domain] ?? '/operations';
                  return (
                    <button key={r.id}
                      onClick={() => navigate(dest)}
                      className="text-left rounded-lg border border-border bg-white px-2.5 py-2 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 leading-tight shrink-0 ${pc.cls}`}>
                          {pc.label}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/25 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {r.action}
                      </p>
                      <p className="text-[14px] text-muted-foreground/70 truncate">{r.domain}</p>
                    </button>
                  );
                })}
              </div>
              {extra > 0 && (
                <button
                  onClick={() => navigate('/operations/recommendations')}
                  className="mt-2 w-full text-center text-[14px] font-semibold text-primary hover:underline py-1.5 rounded-lg border border-dashed border-primary/30 hover:border-primary/60 transition-colors"
                >
                  + {extra} more attention items
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* LEFT column */}
          <div className="space-y-3">

            {isEveryday && (
              <Card label="Upcoming Sessions">
                {UPCOMING_SESSIONS.map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < UPCOMING_SESSIONS.length - 1 ? 'border-b border-border/30' : ''}`}>
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate">{s.label}</p>
                      <p className="text-[14px] text-muted-foreground/60 mt-0.5">{s.date}</p>
                    </div>
                  </div>
                ))}
                <CardFooter onClick={() => navigate('/collaboration')} label="Open calendar" />
              </Card>
            )}

          </div>

          {/* RIGHT column */}
          <div className="space-y-3">

            {isEveryday ? (
              <>
                <Card label="My Tasks">
                  {MY_TASKS.map((t, i) => (
                    <div key={t.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < MY_TASKS.length - 1 ? 'border-b border-border/30' : ''}`}>
                      {t.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] flex-shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                      }
                      <span className={`text-[14px] flex-1 ${t.done ? 'line-through text-muted-foreground/50' : 'text-foreground'}`}>{t.label}</span>
                    </div>
                  ))}
                </Card>

                <Card label="Quick Resources">
                  {QUICK_LINKS.map((l, i) => (
                    <button
                      key={l.label}
                      onClick={() => navigate(l.path)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors ${i < QUICK_LINKS.length - 1 ? 'border-b border-border/30' : ''}`}
                    >
                      <FileText className="w-3 h-3 text-[#2F6F7E] flex-shrink-0" />
                      <span className="text-[14px] text-foreground flex-1 truncate">{l.label}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  ))}
                  <CardFooter onClick={() => navigate('/knowledge/library')} label="Open Knowledge Library" />
                </Card>
              </>
            ) : isPowerOrAbove && !isAdminOrAbove ? (
              <Card label={`${TERMS.aiAssistant} This Week`}>
                {[
                  { icon: Brain,         label: 'Interactions',     value: '234', sub: 'this week',  cls: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8]'   },
                  { icon: Users,         label: 'Learner sessions', value: '12',  sub: 'active now', cls: 'text-[#2F6F7E]',    bg: 'bg-[#EDF5F8]'      },
                  { icon: BarChart3,     label: 'Prompt quality',   value: '87%', sub: 'avg score',  cls: 'text-[#2F6B3F]',bg: 'bg-[#E6F0EA]'  },
                  { icon: AlertTriangle, label: 'Knowledge gaps',   value: '3',   sub: 'flagged',    cls: 'text-[#CC8400]',  bg: 'bg-[#FFF3E0]'    },
                ].map((m, i, arr) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className={`flex items-center gap-2.5 px-3 py-2 ${i < arr.length - 1 ? 'border-b border-border/30' : ''}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                        <Icon className={`w-3 h-3 ${m.cls}`} />
                      </div>
                      <span className="text-[14px] text-muted-foreground flex-1">{m.label}</span>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold leading-none ${m.cls}`}>{m.value}</p>
                        <p className="text-[14px] text-muted-foreground/60 leading-none mt-0.5">{m.sub}</p>
                      </div>
                    </div>
                  );
                })}
                <CardFooter onClick={() => navigate('/penny/intelligence')} label={`Open ${TERMS.aiAssistant} Intelligence`} />
              </Card>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared card primitives ────────────────────────────────────────────────────

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">{children}</p>
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
      <button onClick={onClick} className="flex items-center gap-1 text-[14px] text-primary hover:underline font-medium">
        {label} <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
