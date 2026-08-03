import { Activity, ChevronRight, AlertTriangle, RefreshCw, Users, Database, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG,
} from '@/data/operationalIntelligenceData';
import { useActionItems } from '@/hooks/useActionItems';
import { useHealthScores } from '@/hooks/useHealthScores';
import { useSfOpsSummary, formatSyncAge, type SfCount } from '@/hooks/useSfOpsSummary';
import { useSfOpsPrograms } from '@/hooks/useSfOpsPrograms';

// Render a SfCount as a display string.
// Errors surface as 'Error' so they are never confused with a genuine zero.
const nv = (c: SfCount | null | undefined): string => {
  if (c == null) return '—';
  if (c.error) return 'Error';
  if (c.value === null) return '—';
  return c.value.toLocaleString();
};

function SfLiveStrip() {
  const { data, isLoading, isError, refetch, isFetching } = useSfOpsSummary();

  if (isError) {
    return (
      <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2 flex items-center gap-2">
        <WifiOff className="w-3 h-3 text-[#A93F2F] shrink-0" />
        <span className="text-[14px] text-[#A93F2F] flex-1">Salesforce unreachable — live counts unavailable.</span>
        <button onClick={() => refetch()} className="text-[14px] font-semibold text-[#A93F2F] hover:underline flex items-center gap-1">
          <RefreshCw className="w-2.5 h-2.5" /> Retry
        </button>
      </div>
    );
  }

  const isStale   = data && data.cacheAge > 5 * 60;
  const syncLabel = data ? formatSyncAge(data.lastUpdated) : null;

  return (
    <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/60 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLoading || isFetching ? 'bg-[#CC8400] animate-pulse' : isStale ? 'bg-[#CC8400]' : 'bg-[#2F6B3F]'}`} />
          <span className="text-[14px] font-bold text-[#245531]">Live from Salesforce</span>
          {data && (
            <span className={`text-[14px] ${isStale ? 'text-[#CC8400]' : 'text-[#2F6B3F]/70'}`}>
              · {isStale ? 'stale · ' : ''}{syncLabel}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[14px] text-[#2F6B3F]/60 hover:text-[#245531] flex items-center gap-0.5 disabled:opacity-40"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-7 flex-1 rounded bg-[#E6F0EA] animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { label: 'Programs',    primary: data.programs.total,            sub: `${nv(data.programs.active)} active` },
              { label: 'Enrollments', primary: data.engagements.total,         sub: `${nv(data.engagements.active)} active` },
              { label: 'Deliveries',  primary: data.serviceDeliveries.last30Days, sub: 'last 30 days' },
              { label: 'Open Cases',  primary: data.cases.open,                sub: `${nv(data.cases.highPriority)} high priority` },
            ] as { label: string; primary: SfCount; sub: string }[]
          ).map(m => {
            const hasError = m.primary.error !== null;
            return (
              <div key={m.label} className={`rounded border px-2 py-1.5 ${hasError ? 'bg-[#FBEAE6]/70 border-[#E8B9B4]' : 'bg-white/70 border-[#E6F0EA]'}`}>
                <p className={`text-[14px] font-bold mb-0.5 ${hasError ? 'text-[#A93F2F]/60' : 'text-[#2F6B3F]/60'}`}>{m.label}</p>
                <p className={`text-[15px] font-bold leading-none ${hasError ? 'text-[#A93F2F]' : 'text-[#245531]'}`}>
                  {nv(m.primary)}
                </p>
                {hasError
                  ? <p className="text-[14px] text-[#A93F2F]/70 mt-0.5 truncate" title={m.primary.error ?? ''}>{(m.primary.error ?? '').slice(0, 28)}…</p>
                  : <p className="text-[14px] text-[#2F6B3F]/60 mt-0.5">{m.sub}</p>
                }
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function OpsOverview() {
  const { setSelectedItem } = useAppContext();
  const { isEveryday } = useTierFlags();
  const { visibleRecs } = useActionItems();
  const { domainHealthData, overallHealthScore, overallHealthLevel } = useHealthScores();
  const cfg = HEALTH_LEVEL_CONFIG[overallHealthLevel];
  const { data: sfPrograms } = useSfOpsPrograms();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {!isEveryday && (
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2 flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#CC8400] ">Phase 1</span>
            <span className="text-[14px] text-[#CC8400]">Operations, Health, Demand, Scorecards, and Trends are unified here.</span>
          </div>
        )}

        <SfLiveStrip />

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
        </div>

        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1.5">Domain Health</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {domainHealthData.map(d => {
              const dc = HEALTH_LEVEL_CONFIG[d.level];
              return (
                <button key={d.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                  className="rounded-lg border border-border bg-white px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 leading-tight ${dc.cls}`}>{dc.label}</span>
                    <span className={`text-lg font-bold leading-none ${dc.score}`}>{d.score}</span>
                  </div>
                  <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{d.domain}</p>
                  <p className="text-[14px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{d.summary}</p>
                  {d.id === 'dh-programs' && sfPrograms != null && (
                    <span className="text-[14px] font-medium text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5 mt-1 inline-block leading-none">
                      SF: {nv(sfPrograms.active)} active · {nv(sfPrograms.total)} total
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const allItems = [
            ...visibleRecs.filter(r => r.priority === 'critical'),
            ...visibleRecs.filter(r => r.priority === 'high'),
          ];
          const LIMIT   = 6;
          const visible = allItems.slice(0, LIMIT);
          const extra   = allItems.length - LIMIT;
          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] font-bold  text-muted-foreground/60">
                  {isEveryday ? 'Items Needing Attention' : 'Critical & High Priority Actions'}
                </p>
                {extra > 0 && (
                  <button
                    onClick={() => setSelectedItem({ type: 'oicRecommendation', id: 'all', data: null })}
                    className="text-[14px] font-semibold text-primary hover:underline flex items-center gap-0.5"
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
                  onClick={() => setSelectedItem({ type: 'oicRecommendation', id: 'all', data: null })}
                  className="mt-2 w-full text-center text-[14px] font-semibold text-primary hover:underline py-1.5 rounded-lg border border-dashed border-primary/30 hover:border-primary/60 transition-colors"
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
