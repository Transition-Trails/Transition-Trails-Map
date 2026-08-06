import { useState, useMemo } from 'react';
import { ChevronDown, Sparkles, AlertTriangle, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { readinessScorecards, HEALTH_LEVEL_CONFIG } from '@/data/operationalIntelligenceData';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

export default function OpsScorecards() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { setAskPennyOpen, setCalendarPanelOpen, setPendingPennyQuery } = useAppContext();

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Rail computations ────────────────────────────────────────────────────────
  const avg = useMemo(() =>
    Math.round(readinessScorecards.reduce((s, sc) => s + sc.score, 0) / readinessScorecards.length),
    []
  );

  const allDims = useMemo(() =>
    readinessScorecards.flatMap(sc => sc.dimensions.map(d => ({ ...d, scorecard: sc.title }))),
    []
  );

  const atRisk    = allDims.filter(d => d.level === 'at-risk');
  const needsWork = allDims.filter(d => d.level === 'needs-work');
  const lowest    = [...allDims].sort((a, b) => a.score - b.score).slice(0, 3);

  const overallCfg =
    avg >= 75 ? HEALTH_LEVEL_CONFIG['strong'] :
    avg >= 60 ? HEALTH_LEVEL_CONFIG['good']   :
    avg >= 45 ? HEALTH_LEVEL_CONFIG['needs-work'] :
                HEALTH_LEVEL_CONFIG['at-risk'];

  function handleAskPenny() {
    const summary = readinessScorecards
      .map(sc => `${sc.category}: ${sc.score}/100 (${HEALTH_LEVEL_CONFIG[sc.level].label})\n` +
        sc.dimensions.map(d => `  - ${d.label}: ${d.score}`).join('\n'))
      .join('\n\n');
    const query =
      `Readiness scorecard overview — average score ${avg}/100.\n\n${summary}\n\n` +
      `Based on these scores, what are the 3 highest-priority improvement areas? What should we focus on first to move the lowest scores?`;
    setCalendarPanelOpen(false);
    setAskPennyOpen(true);
    setPendingPennyQuery(query);
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Main: scorecard cards ──────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {readinessScorecards.map(sc => {
              const cfg    = HEALTH_LEVEL_CONFIG[sc.level];
              const isOpen = expanded.has(sc.id);
              return (
                <div key={sc.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">

                  <div className="px-3 py-2.5 border-b border-border/50 bg-muted/20 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-muted-foreground/50 mb-0.5">{sc.category}</p>
                      <p className="text-[14px] font-semibold text-foreground leading-tight">{sc.title}</p>
                      <p className="text-[14px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{sc.summary}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
                      <span className={`text-xl font-bold leading-none ${cfg.score}`}>{sc.score}</span>
                      <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${cfg.cls}`}>{cfg.label}</span>
                    </div>
                  </div>

                  <div className="px-3 py-2 space-y-1 flex-1">
                    {sc.dimensions.map(dim => {
                      const dc = HEALTH_LEVEL_CONFIG[dim.level];
                      return (
                        <div key={dim.label} className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dc.dot}`} />
                          <span className="text-[14px] text-foreground flex-1 truncate">{dim.label}</span>
                          <span className="text-[14px] font-bold text-muted-foreground shrink-0">{dim.score}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-3 pb-2.5 border-t border-border/30 pt-2">
                    <button
                      onClick={() => toggle(sc.id)}
                      className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
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
                                <span className="text-[14px] font-semibold text-foreground">{dim.label}</span>
                                <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${dc.cls}`}>{dim.score}</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full mb-0.5">
                                <div
                                  className={`h-1 rounded-full ${pct >= 75 ? 'bg-[#2F6B3F]' : pct >= 55 ? 'bg-[#2F6F7E]' : pct >= 40 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[14px] text-muted-foreground leading-snug">{dim.notes}</p>
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

      {/* ── Rail: summary + focus areas ───────────────────────────────────── */}
      <div className="w-[272px] shrink-0 border-l border-border bg-muted/10 overflow-y-auto">
        <div className="p-4 space-y-4">

          {/* Overall score */}
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="text-[12px] font-bold text-muted-foreground/50 mb-2 uppercase tracking-wide">Overall Readiness</p>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-3xl font-bold leading-none ${overallCfg.score}`}>{avg}</span>
              <span className="text-[12px] text-muted-foreground mb-0.5">/ 100</span>
              <span className={`ml-auto text-[12px] font-bold border rounded-full px-1.5 py-0.5 ${overallCfg.cls}`}>
                {overallCfg.label}
              </span>
            </div>
            {/* Score bars per scorecard */}
            <div className="space-y-1.5">
              {readinessScorecards.map(sc => {
                const cfg = HEALTH_LEVEL_CONFIG[sc.level];
                return (
                  <div key={sc.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[12px] text-muted-foreground truncate">{sc.category}</span>
                      <span className={`text-[12px] font-bold ${cfg.score}`}>{sc.score}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full">
                      <div
                        className={`h-1 rounded-full ${sc.score >= 75 ? 'bg-[#2F6B3F]' : sc.score >= 55 ? 'bg-[#2F6F7E]' : sc.score >= 40 ? 'bg-[#CC8400]' : 'bg-[#A93F2F]'}`}
                        style={{ width: `${sc.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attention areas */}
          {(atRisk.length > 0 || needsWork.length > 0) && (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-[#A93F2F] shrink-0" />
                <p className="text-[12px] font-bold text-[#A93F2F] uppercase tracking-wide">
                  {atRisk.length} At Risk · {needsWork.length} Needs Work
                </p>
              </div>
              <div className="space-y-1">
                {atRisk.slice(0, 3).map(d => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A93F2F] shrink-0" />
                    <span className="text-[12px] text-foreground truncate flex-1">{d.label}</span>
                    <span className="text-[12px] font-bold text-[#A93F2F] shrink-0">{d.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lowest 3 dimensions */}
          <div className="rounded-lg border border-border bg-white p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <p className="text-[12px] font-bold text-muted-foreground/50 uppercase tracking-wide">Lowest Dimensions</p>
            </div>
            <div className="space-y-1.5">
              {lowest.map(d => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12px] text-foreground truncate flex-1 pr-2">{d.label}</span>
                    <span className="text-[12px] font-bold text-muted-foreground shrink-0">{d.score}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">{d.scorecard}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ask Penny */}
          <button
            onClick={handleAskPenny}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-primary">Ask {TERMS.aiAssistant}</p>
              <p className="text-[11px] text-primary/60">Prioritize improvement areas</p>
            </div>
          </button>

        </div>
      </div>

    </div>
  );
}
