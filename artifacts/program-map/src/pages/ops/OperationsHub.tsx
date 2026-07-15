import { useState } from 'react';
import {
  Activity, GitBranch, TrendingUp, ChevronRight, ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  domainHealthData, recommendations, readinessScorecards, trendInsights,
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG, TREND_TYPE_CONFIG, TREND_URGENCY_CONFIG,
} from '@/data/operationalIntelligenceData';
import Intake        from '@/pages/demand/Intake';

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 max-w-4xl">
          {readinessScorecards.map(sc => {
            const cfg    = HEALTH_LEVEL_CONFIG[sc.level];
            const isOpen = expanded.has(sc.id);
            return (
              <div key={sc.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">

                {/* Card header */}
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

                {/* Dimension pills — always visible */}
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

                {/* Expand for notes + mini bars */}
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
      </div>
    </ScrollArea>
  );
}

// ── Trends ────────────────────────────────────────────────────────────────────
// Sort order: immediate blockers/risks first, then near-term, then watch
const URGENCY_ORDER: Record<string, number> = { immediate: 0, 'near-term': 1, watch: 2 };
const TYPE_BORDER: Record<string, string> = {
  blocker:     'border-l-orange-400',
  risk:        'border-l-rose-400',
  gap:         'border-l-amber-400',
  opportunity: 'border-l-emerald-400',
};

function TrendsView() {
  const { setSelectedItem } = useAppContext();

  const sorted = [...trendInsights].sort((a, b) =>
    (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9)
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2.5 max-w-4xl">
          {sorted.map(t => {
            const tc = TREND_TYPE_CONFIG[t.type];
            const uc = TREND_URGENCY_CONFIG[t.urgency];
            const shortDesc = t.description.split('.')[0] + '.';
            return (
              <button
                key={t.id}
                onClick={() => setSelectedItem({ type: 'healthIndicator', id: t.id, data: t })}
                className={`text-left rounded-lg border border-border border-l-[3px] ${TYPE_BORDER[t.type]} bg-white p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex flex-col gap-2`}
              >
                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${tc.cls}`}>{tc.label}</span>
                  <span className={`text-[9px] ${uc.cls}`}>{uc.label}</span>
                </div>

                {/* Title + summary */}
                <div>
                  <p className="text-[12px] font-semibold text-foreground group-hover:text-primary leading-snug">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{shortDesc}</p>
                </div>

                {/* Domain tags + drill-in */}
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
  const { isEveryday } = useTierFlags();

  const TABS = [
    { id: 'health',     label: 'Health Indicators', path: '/operations/health',           icon: Activity,      content: <HealthIndicators /> },
    { id: 'demand',     label: 'Demand',            path: '/operations/demand',           icon: GitBranch,     content: <Intake /> },
    { id: 'scorecards', label: 'Scorecards',        path: '/operations/scorecards',       icon: TrendingUp,    content: <ScorecardsView /> },
    { id: 'trends',     label: 'Trends & Insights', path: '/operations/trends',           icon: AlertTriangle, content: <TrendsView /> },
    { id: 'recs',       label: 'Recommendations',   path: '/operations/recommendations',  icon: ChevronRight,  content: <AllRecommendations /> },
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
