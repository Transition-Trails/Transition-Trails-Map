import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { domainHealthData, HEALTH_LEVEL_CONFIG } from '@/data/operationalIntelligenceData';

export default function OpsHealthIndicators() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {domainHealthData.map(d => {
            const dc      = HEALTH_LEVEL_CONFIG[d.level];
            const topInds = d.indicators.slice(0, 3);
            const extra   = d.indicators.length - 3;
            const firstBad = d.indicators.find(i => i.status === 'at-risk' || i.status === 'needs-work');

            return (
              <div key={d.id} className="rounded-lg border border-border bg-white overflow-hidden flex flex-col">

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
