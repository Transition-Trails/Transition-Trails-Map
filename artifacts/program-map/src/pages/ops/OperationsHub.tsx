import {
  Activity, BarChart2, Puzzle, GitBranch, TrendingUp, ChevronRight,
  AlertTriangle, CheckCircle2, Target, RefreshCw,
} from 'lucide-react';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  domainHealthData, recommendations, readinessScorecards, trendInsights,
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG, TREND_TYPE_CONFIG, TREND_URGENCY_CONFIG,
  overallHealthScore, overallHealthLevel,
} from '@/data/operationalIntelligenceData';
import IntegrationReadinessCenter from '@/pages/admin/IntegrationReadinessCenter';
import ProgramHealth               from '@/pages/operations/ProgramHealth';
import Intake                      from '@/pages/demand/Intake';

// ── Executive Overview ────────────────────────────────────────────────────────
function ExecutiveOverview() {
  const { setSelectedItem } = useAppContext();
  const { isEveryday } = useTierFlags();
  const cfg = HEALTH_LEVEL_CONFIG[overallHealthLevel];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {/* Phase 1 banner — admin/power only */}
        {!isEveryday && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2">
            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Phase 1</span>
            <span className="text-[10px] text-amber-600">Operations, Integrations, and Demand are unified here.</span>
          </div>
        )}

        {/* Overall health — compact single row */}
        <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center gap-5">
          {/* Score + label */}
          <div className="flex items-baseline gap-2 shrink-0">
            <p className={`text-4xl font-bold font-serif leading-none ${cfg.score}`}>{overallHealthScore}</p>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider leading-none">Overall</span>
              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 leading-none ${cfg.cls}`}>{cfg.label}</span>
            </div>
          </div>
          {/* Divider */}
          <div className="w-px h-8 bg-border/60 shrink-0" />
          {/* Stat chips */}
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {[
              { l: 'Critical',       v: recommendations.filter(r => r.priority === 'critical').length, c: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200'   },
              { l: 'High Priority',  v: recommendations.filter(r => r.priority === 'high').length,     c: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              { l: 'Domains At Risk',v: domainHealthData.filter(d => d.level === 'at-risk').length,    c: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200'   },
              { l: 'Needs Work',     v: domainHealthData.filter(d => d.level === 'needs-work').length, c: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200'  },
            ].map(s => (
              <div key={s.l} className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 ${s.bg}`}>
                <span className={`text-xl font-bold font-serif leading-none ${s.c}`}>{s.v}</span>
                <span className={`text-[9px] font-medium leading-tight ${s.c} opacity-80`}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain health — compact 4-col cards, no paragraph text */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Domain Health</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {domainHealthData.map(d => {
              const dc = HEALTH_LEVEL_CONFIG[d.level];
              return (
                <button key={d.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                  className="rounded-lg border border-border bg-white px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 leading-tight ${dc.cls}`}>{dc.label}</span>
                    <span className={`text-lg font-bold font-serif leading-none ${dc.score}`}>{d.score}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{d.domain}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{d.summary}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Critical + high priority recs — compact 2-column grid */}
        {(() => {
          const allItems = [
            ...recommendations.filter(r => r.priority === 'critical'),
            ...recommendations.filter(r => r.priority === 'high'),
          ];
          const LIMIT   = 6;
          const visible = allItems.slice(0, LIMIT);
          const extra   = allItems.length - LIMIT;
          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  {isEveryday ? 'Items Needing Attention' : 'Critical & High Priority Actions'}
                </p>
                {extra > 0 && (
                  <button
                    onClick={() => setSelectedItem({ type: 'oicRecommendation', id: 'all', data: null })}
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    View all {allItems.length} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {visible.map(r => {
                  const pc = REC_PRIORITY_CONFIG[r.priority];
                  return (
                    <button key={r.id}
                      onClick={() => setSelectedItem({ type: 'oicRecommendation', id: r.id, data: r })}
                      className="text-left rounded-lg border border-border bg-white px-2.5 py-2 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 leading-tight shrink-0 ${pc.cls}`}>
                          {pc.label}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/25 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <p className="text-[10px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {r.action}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70 truncate">{r.domain}</p>
                    </button>
                  );
                })}
              </div>
              {extra > 0 && (
                <button
                  onClick={() => setSelectedItem({ type: 'oicRecommendation', id: 'all', data: null })}
                  className="mt-2 w-full text-center text-[10px] font-semibold text-primary hover:underline py-1.5 rounded-lg border border-dashed border-primary/30 hover:border-primary/60 transition-colors"
                >
                  + {extra} more attention items
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </ScrollArea>
  );
}

// ── Health Indicators — compact 2-column grid ─────────────────────────────────
// UI rule: each card shows domain + score + top 3 checks + one key action.
// No full-width long cards. Scroll only below the fold.
function HealthIndicators() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {domainHealthData.map(d => {
            const dc       = HEALTH_LEVEL_CONFIG[d.level];
            const topInds  = d.indicators.slice(0, 3);
            const extra    = d.indicators.length - 3;
            const firstBad = d.indicators.find(i => i.status === 'at-risk' || i.status === 'needs-work');

            return (
              <div key={d.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">

                {/* Card header — clickable to open full detail */}
                <button
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                  className="px-3 py-2.5 border-b border-border/50 bg-muted/20 flex items-center justify-between w-full text-left hover:bg-primary/5 transition-colors group"
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors truncate">{d.domain}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{d.sourceSystem}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 ${dc.cls}`}>{dc.label}</span>
                    <span className={`text-[22px] font-bold font-serif leading-none ${dc.score}`}>{d.score}</span>
                  </div>
                </button>

                {/* Indicator rows */}
                <div className="px-3 py-1.5 flex-1">
                  {topInds.map(ind => {
                    const ic  = HEALTH_LEVEL_CONFIG[ind.status];
                    const dot =
                      ind.status === 'strong' || ind.status === 'good'
                        ? 'bg-emerald-400'
                        : ind.status === 'needs-work'
                        ? 'bg-amber-400'
                        : 'bg-rose-400';
                    return (
                      <button
                        key={ind.id}
                        onClick={() => setSelectedItem({ type: 'healthIndicator', id: ind.id, data: ind })}
                        className="w-full flex items-center gap-2 py-[5px] rounded hover:bg-primary/5 transition-colors group text-left"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-px ${dot}`} />
                        <span className="text-[10px] text-foreground group-hover:text-primary flex-1 truncate leading-tight">{ind.label}</span>
                        <span className={`text-[8px] font-bold border rounded-full px-1 py-0.5 shrink-0 leading-tight ${ic.cls}`}>{ic.label}</span>
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <button
                      onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                      className="text-[9px] text-primary hover:underline pl-3.5 mt-0.5 block"
                    >
                      +{extra} more checks
                    </button>
                  )}
                </div>

                {/* Key next action */}
                {firstBad && (
                  <div className="px-3 py-1.5 border-t border-border/40 bg-amber-50/50">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-amber-700/70 mb-0.5">Next action</p>
                    <p className="text-[9px] text-muted-foreground leading-snug line-clamp-2">{firstBad.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Scorecards ────────────────────────────────────────────────────────────────
function ScorecardsView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        {readinessScorecards.map(sc => {
          const sc_ = HEALTH_LEVEL_CONFIG[sc.level];
          return (
            <div key={sc.id} className="rounded-lg border border-border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{sc.title}</p>
                  <p className="text-[10px] text-muted-foreground">{sc.category} · {sc.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${sc_.cls}`}>{sc_.label}</span>
                  <span className={`text-2xl font-bold font-serif ${sc_.score}`}>{sc.score}</span>
                </div>
              </div>
              <div className="px-4 py-2">
                {sc.dimensions.map(dim => {
                  const dc_ = HEALTH_LEVEL_CONFIG[dim.level];
                  const pct = dim.score;
                  return (
                    <div key={dim.label} className="py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-semibold text-foreground">{dim.label}</p>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${dc_.cls}`}>{dim.score}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full mb-1">
                        <div className={`h-1 rounded-full ${pct >= 75 ? 'bg-emerald-400' : pct >= 55 ? 'bg-blue-400' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{dim.notes}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Trends ────────────────────────────────────────────────────────────────────
function TrendsView() {
  const { setSelectedItem } = useAppContext();
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-3">
        {trendInsights.map(t => {
          const tc = TREND_TYPE_CONFIG[t.type];
          const uc = TREND_URGENCY_CONFIG[t.urgency];
          return (
            <div key={t.id}
              onClick={() => setSelectedItem({ type: 'healthIndicator', id: t.id, data: t })}
              className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 cursor-pointer transition-colors group">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${tc.cls}`}>{tc.label}</span>
                  <span className={`text-[10px] ${uc.cls}`}>{uc.label}</span>
                </div>
              </div>
              <p className="text-[13px] font-semibold text-foreground group-hover:text-primary mb-1">{t.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.affectedDomains.map(d => (
                  <span key={d} className="text-[9px] font-medium border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── All Recommendations ───────────────────────────────────────────────────────
function AllRecommendations() {
  const { setSelectedItem } = useAppContext();
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-2">
        {recommendations.map(r => {
          const pc     = REC_PRIORITY_CONFIG[r.priority];
          const effort = { Low: 'text-emerald-600', Medium: 'text-amber-600', High: 'text-rose-600' }[r.effort];
          return (
            <button key={r.id}
              onClick={() => setSelectedItem({ type: 'oicRecommendation', id: r.id, data: r })}
              className="w-full text-left rounded-lg border border-border bg-white px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex items-center gap-3">
              <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${pc.cls}`}>{pc.label}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground group-hover:text-primary">{r.action}</p>
                <p className="text-[10px] text-muted-foreground">{r.domain} · {r.systems.slice(0, 2).join(', ')}</p>
              </div>
              <span className={`text-[10px] font-semibold shrink-0 ${effort}`}>{r.effort} effort</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Hub ───────────────────────────────────────────────────────────────────────
// UI audit rule: Everyday User pages must not have multiple nav/action rows
// above content. Keep ≤ 1 tab row, no ActionBar, and plain-language labels.

export default function OperationsHub() {
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const TABS = [
    {
      id: 'overview',
      label: isEveryday ? 'Overview' : 'Executive Overview',
      path: '/operations',
      icon: BarChart2,
      content: <ExecutiveOverview />,
    },
    ...(!isEveryday ? [
      { id: 'health',       label: 'Health Indicators', path: '/operations/health',           icon: Activity,      content: <HealthIndicators /> },
      { id: 'integrations', label: 'Integrations',      path: '/operations/integrations',     icon: Puzzle,        content: <IntegrationReadinessCenter /> },
      { id: 'demand',       label: 'Demand',            path: '/operations/demand',           icon: GitBranch,     content: <Intake /> },
      { id: 'scorecards',   label: 'Scorecards',        path: '/operations/scorecards',       icon: TrendingUp,    content: <ScorecardsView /> },
      { id: 'trends',       label: 'Trends & Insights', path: '/operations/trends',           icon: AlertTriangle, content: <TrendsView /> },
      { id: 'recs',         label: 'Recommendations',   path: '/operations/recommendations',  icon: ChevronRight,  content: <AllRecommendations /> },
    ] : []),
  ];

  const ACTIONS: ActionItem[] = [
    ...(isAdminOrAbove ? [
      { id: 'phase1', label: 'Phase 1 Readiness', icon: Target, href: '/admin/phase1-readiness', variant: 'primary' as const },
    ] : []),
    ...(!isEveryday ? [
      { id: 'integrations', label: 'Integrations',      icon: Puzzle,       href: '/operations/integrations',    variant: 'secondary' as const },
      { id: 'recs',         label: 'Recommendations',   icon: ChevronRight, href: '/operations/recommendations', variant: 'secondary' as const },
      { id: 'trends',       label: 'Trends & Insights', icon: TrendingUp,   href: '/operations/trends',          variant: 'secondary' as const },
    ] : []),
  ];

  return (
    <HubShell
      title="Operations"
      icon={Activity}
      description={
        isEveryday
          ? 'Program health at a glance — key indicators and items needing attention.'
          : 'Executive health, domain indicators, integration readiness, demand pipeline, readiness scorecards, and strategic trends.'
      }
      actions={ACTIONS}
      tabs={TABS}
    />
  );
}
