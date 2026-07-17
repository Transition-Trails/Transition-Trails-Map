import { useState, useMemo } from 'react';
import {
  Activity, GitBranch, TrendingUp, ChevronRight, ChevronDown, Sparkles,
} from 'lucide-react';
import { useOpsSummary } from '@/hooks/useOpsSummary';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  domainHealthData, recommendations, readinessScorecards, trendInsights,
  overallHealthScore, overallHealthLevel,
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG, TREND_TYPE_CONFIG, TREND_URGENCY_CONFIG,
  type HealthLevel,
} from '@/data/operationalIntelligenceData';
import Intake        from '@/pages/demand/Intake';

// ── Status weight for top-5 sorting ──────────────────────────────────────────
const STATUS_WEIGHT: Record<HealthLevel, number> = { 'at-risk': 0, 'needs-work': 1, good: 2, strong: 3 };

// ── Health Indicators — overall score + top-5 impact + domain grid ────────────
function HealthIndicators() {
  const { setSelectedItem, setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const oc = HEALTH_LEVEL_CONFIG[overallHealthLevel];
  const { data: sfData, isLoading: sfLoading } = useOpsSummary();

  // Patch stale indicators with live Salesforce data when available.
  const enrichedDomains = useMemo(() => {
    if (!sfData) return domainHealthData;
    return domainHealthData.map(d => {
      if (d.id === 'dh-programs') {
        return {
          ...d,
          indicators: d.indicators.map(ind =>
            ind.id === 'prog-7'
              ? {
                  ...ind,
                  status: 'good' as const,
                  detail: `${sfData.programs.active ?? '—'} active programs in Salesforce PMM · ${sfData.programs.planning ?? '—'} in planning · ${sfData.engagements.active ?? '—'} active engagements`,
                }
              : ind
          ),
        };
      }
      if (d.id === 'dh-integration') {
        return {
          ...d,
          indicators: d.indicators.map(ind =>
            ind.id === 'int-1'
              ? {
                  ...ind,
                  status: 'strong' as const,
                  detail: `Salesforce REST API live · ${sfData.programs.total ?? '—'} programs · ${sfData.contacts.total ?? '—'} contacts · ${sfData.cases.open ?? '—'} open cases`,
                }
              : ind
          ),
        };
      }
      return d;
    });
  }, [sfData]);

  // Top 5: worst-status first, then lowest domain score
  const top5 = enrichedDomains
    .flatMap(d => d.indicators
      .filter(i => i.status === 'at-risk' || i.status === 'needs-work')
      .map(i => ({ ...i, domainScore: d.score }))
    )
    .sort((a, b) =>
      (STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status]) ||
      (a.domainScore - b.domainScore)
    )
    .slice(0, 5);

  // Domain bars sorted worst-first
  const sortedDomains = [...enrichedDomains].sort((a, b) => a.score - b.score);

  const pennyQ = `Trail OS Overall Health Score: ${overallHealthScore}/100 (${oc.label})\n\nDomain breakdown:\n${enrichedDomains.map(d => `  • ${d.domain}: ${d.score}/100 (${HEALTH_LEVEL_CONFIG[d.level].label})`).join('\n')}\n\nTop 5 highest-impact items to address:\n${top5.map((i, n) => `  ${n + 1}. [${HEALTH_LEVEL_CONFIG[i.status].label}] ${i.label} (${i.domain}) — ${i.detail}`).join('\n')}\n\nWhat is your recommended action plan to move the Trail OS health score from ${overallHealthScore} to 75+? Prioritise the top 5 items and identify any quick wins.`;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-4xl">

        {/* ── Overall Score Hero ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Trail OS Platform Health</p>
              <p className="text-[11px] text-muted-foreground">Composite score across {domainHealthData.length} domains</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${oc.cls}`}>{oc.label}</span>
              <span className={`text-[44px] font-bold leading-none tabular-nums ${oc.score}`}>{overallHealthScore}</span>
              <span className="text-[18px] text-muted-foreground/40 font-light leading-none">/100</span>
            </div>
          </div>

          {/* Domain bars */}
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {sortedDomains.map(d => {
              const dc  = HEALTH_LEVEL_CONFIG[d.level];
              const bar = d.score >= 75 ? 'bg-emerald-400' : d.score >= 65 ? 'bg-blue-400' : d.score >= 50 ? 'bg-amber-400' : 'bg-rose-400';
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                  className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  <span className="text-[10px] text-foreground w-28 shrink-0 text-left truncate group-hover:text-primary transition-colors">{d.domain}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${d.score}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold w-6 text-right shrink-0 ${dc.score}`}>{d.score}</span>
                </button>
              );
            })}
          </div>

          {/* ── Salesforce Live Strip ───────────────────────────────────── */}
          {sfLoading && (
            <div className="mx-4 mb-3 border-t border-border/30 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse shrink-0" />
                <p className="text-[9px] text-muted-foreground">Loading Salesforce data…</p>
              </div>
            </div>
          )}
          {sfData && (
            <div className="mx-4 mb-3 border-t border-border/30 pt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Salesforce Live</p>
                {sfData.fromCache && (
                  <span className="text-[8px] text-muted-foreground/50 ml-auto">
                    cached · {sfData.cacheAge < 60 ? `${sfData.cacheAge}s` : `${Math.round(sfData.cacheAge / 60)}m`} ago
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {([
                  { label: 'Active Programs',     value: sfData.programs.active,    alert: false },
                  { label: 'In Planning',         value: sfData.programs.planning,  alert: false },
                  { label: 'Active Engagements',  value: sfData.engagements.active, alert: false },
                  { label: 'Open Cases',          value: sfData.cases.open,         alert: (sfData.cases.highPriority ?? 0) > 0, sub: sfData.cases.highPriority != null && sfData.cases.highPriority > 0 ? `${sfData.cases.highPriority} high pri` : undefined },
                  { label: 'Contacts',            value: sfData.contacts.total,     alert: false },
                ] as const).map(stat => (
                  <div
                    key={stat.label}
                    className={`rounded-md border px-2 py-1.5 text-center ${stat.alert ? 'border-amber-200 bg-amber-50/60' : 'border-border/40 bg-muted/20'}`}
                  >
                    <p className={`text-[15px] font-bold leading-tight tabular-nums ${stat.alert ? 'text-amber-700' : 'text-foreground'}`}>
                      {stat.value ?? '—'}
                    </p>
                    <p className="text-[8px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                    {'sub' in stat && stat.sub && (
                      <p className="text-[7px] text-amber-600 font-bold mt-0.5">{stat.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Focus with Penny */}
          <div className="px-4 pb-3">
            <button
              onClick={() => { setAskPennyOpen(true); setPendingPennyQuery(pennyQ); }}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get {`Penny's`} action plan to improve the score
            </button>
          </div>
        </div>

        {/* ── Top 5 High-Impact Items ────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0">Top 5 High-Impact Items</p>
            <div className="flex-1 h-px bg-border/50" />
            <p className="text-[9px] text-muted-foreground shrink-0">Fixing these will move the score most</p>
          </div>
          <div className="space-y-1.5">
            {top5.map((ind, idx) => {
              const ic = HEALTH_LEVEL_CONFIG[ind.status];
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: ind.id, data: ind })}
                  className="w-full text-left rounded-lg border border-border bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex items-center gap-3"
                >
                  <span className="text-[11px] font-bold text-muted-foreground/30 w-4 shrink-0 text-right">{idx + 1}</span>
                  <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${ic.cls}`}>{ic.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground group-hover:text-primary leading-snug">{ind.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{ind.domain} · {ind.detail}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Domain Cards ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0">By Domain</p>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {enrichedDomains.map(d => {
              const dc       = HEALTH_LEVEL_CONFIG[d.level];
              const topInds  = d.indicators.slice(0, 3);
              const extra    = d.indicators.length - 3;
              const firstBad = d.indicators.find(i => i.status === 'at-risk' || i.status === 'needs-work');

              return (
                <div key={d.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">

                  {/* Card header */}
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
                      <span className={`text-[22px] font-bold leading-none ${dc.score}`}>{d.score}</span>
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

                  {/* Key next action — clickable to open brief + Penny */}
                  {firstBad && (
                    <button
                      onClick={() => setSelectedItem({ type: 'healthIndicator', id: firstBad.id, data: firstBad })}
                      className="w-full px-3 py-1.5 border-t border-amber-200/60 bg-amber-50/60 hover:bg-amber-100/70 transition-colors text-left group"
                    >
                      <p className="text-[8px] font-bold uppercase tracking-wide text-amber-700/70 mb-0.5 flex items-center gap-1">
                        Next action
                        <span className="text-amber-500/60 group-hover:text-amber-600 transition-colors">→</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-snug line-clamp-2 group-hover:text-amber-900/80 transition-colors">{firstBad.detail}</p>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Intelligence — Scorecards + Trends + Recommendations (combined) ───────────
const URGENCY_ORDER: Record<string, number> = { immediate: 0, 'near-term': 1, watch: 2 };
const TYPE_BORDER: Record<string, string> = {
  blocker:     'border-l-orange-400',
  risk:        'border-l-rose-400',
  gap:         'border-l-amber-400',
  opportunity: 'border-l-emerald-400',
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 shrink-0">{label}</p>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function IntelligenceView() {
  const { setSelectedItem } = useAppContext();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const sortedTrends = [...trendInsights].sort((a, b) =>
    (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-8 max-w-4xl">

        {/* ── Scorecards ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Scorecards" />
          <div className="grid grid-cols-2 gap-3">
            {readinessScorecards.map(sc => {
              const cfg    = HEALTH_LEVEL_CONFIG[sc.level];
              const isOpen = expanded.has(sc.id);
              return (
                <div key={sc.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">
                  <div className="px-3 py-2.5 border-b border-border/50 bg-muted/20 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">{sc.category}</p>
                      <p className="text-[13px] font-semibold text-foreground leading-tight">{sc.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{sc.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
                      <span className={`text-xl font-bold leading-none ${cfg.score}`}>{sc.score}</span>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="px-3 py-2 space-y-1 flex-1">
                    {sc.dimensions.map(dim => {
                      const dc = HEALTH_LEVEL_CONFIG[dim.level];
                      return (
                        <div key={dim.label} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dc.dot}`} />
                          <span className="text-[11px] text-foreground flex-1 truncate">{dim.label}</span>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">{dim.score}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 pb-2.5 border-t border-border/30 pt-2">
                    <button
                      onClick={() => toggle(sc.id)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      {isOpen ? 'Hide detail' : 'Show detail'}
                    </button>
                    {isOpen && (
                      <div className="mt-2 space-y-2">
                        {sc.dimensions.map(dim => {
                          const dc  = HEALTH_LEVEL_CONFIG[dim.level];
                          const pct = dim.score;
                          return (
                            <div key={dim.label}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-semibold text-foreground">{dim.label}</span>
                                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${dc.cls}`}>{dim.score}</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full mb-0.5">
                                <div
                                  className={`h-1 rounded-full ${pct >= 75 ? 'bg-emerald-400' : pct >= 55 ? 'bg-blue-400' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-snug">{dim.notes}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Recommendations ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Recommendations" />
          <div className="space-y-2">
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
        </section>

        {/* ── Trends & Insights ───────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Trends & Insights" />
          <div className="grid grid-cols-2 gap-2.5">
            {sortedTrends.map(t => {
              const tc = TREND_TYPE_CONFIG[t.type];
              const uc = TREND_URGENCY_CONFIG[t.urgency];
              const shortDesc = t.description.split('.')[0] + '.';
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: t.id, data: t })}
                  className={`text-left rounded-lg border border-border border-l-[3px] ${TYPE_BORDER[t.type]} bg-white p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex flex-col gap-2`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${tc.cls}`}>{tc.label}</span>
                    <span className={`text-[9px] ${uc.cls}`}>{uc.label}</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground group-hover:text-primary leading-snug">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{shortDesc}</p>
                  </div>
                  <div className="flex items-end justify-between gap-2 mt-auto">
                    <div className="flex flex-wrap gap-1">
                      {t.affectedDomains.slice(0, 3).map(d => (
                        <span key={d} className="text-[9px] font-medium border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">{d}</span>
                      ))}
                      {t.affectedDomains.length > 3 && (
                        <span className="text-[9px] text-muted-foreground/50">+{t.affectedDomains.length - 3}</span>
                      )}
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </ScrollArea>
  );
}

// ── Hub ───────────────────────────────────────────────────────────────────────
// UI audit rule: Everyday User pages must not have multiple nav/action rows
// above content. Keep ≤ 1 tab row, no ActionBar, and plain-language labels.

export default function OperationsHub() {
  const { isEveryday } = useTierFlags();

  const TABS = [
    { id: 'health',        label: 'Health Indicators', path: '/operations/health',        icon: Activity,      content: <HealthIndicators /> },
    { id: 'demand',        label: 'Demand',            path: '/operations/demand',        icon: GitBranch,     content: <Intake /> },
    { id: 'intelligence',  label: 'Intelligence',      path: '/operations/intelligence',  icon: TrendingUp,    content: <IntelligenceView /> },
  ];

  return (
    <HubShell
      title="Operations"
      icon={Activity}
      description={
        isEveryday
          ? 'Program health at a glance — key indicators and items needing attention.'
          : 'Monitor program health, surface priority actions, track demand, and review scorecards and operational trends.'
      }
      tabs={TABS}
    />
  );
}
