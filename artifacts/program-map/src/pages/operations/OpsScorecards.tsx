import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { readinessScorecards, HEALTH_LEVEL_CONFIG } from '@/data/operationalIntelligenceData';

export default function OpsScorecards() {
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
      </div>
    </ScrollArea>
  );
}
