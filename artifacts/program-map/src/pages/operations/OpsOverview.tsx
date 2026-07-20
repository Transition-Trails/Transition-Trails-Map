import { Activity, ChevronRight, AlertTriangle, RefreshCw, Users, Database, WifiOff } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import {
  domainHealthData,
  HEALTH_LEVEL_CONFIG, REC_PRIORITY_CONFIG,
  overallHealthScore, overallHealthLevel,
} from '@/data/operationalIntelligenceData';
import { useActionItems } from '@/hooks/useActionItems';
import { useSfOpsSummary, formatSyncAge } from '@/hooks/useSfOpsSummary';
import { useSfOpsPrograms } from '@/hooks/useSfOpsPrograms';

function SfLiveStrip() {
  const { data, isLoading, isError, refetch, isFetching } = useSfOpsSummary();
  const n = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 flex items-center gap-2">
        <WifiOff className="w-3 h-3 text-rose-500 shrink-0" />
        <span className="text-[10px] text-rose-600 flex-1">Salesforce unreachable — live counts unavailable.</span>
        <button onClick={() => refetch()} className="text-[10px] font-semibold text-rose-700 hover:underline flex items-center gap-1">
          <RefreshCw className="w-2.5 h-2.5" /> Retry
        </button>
      </div>
    );
  }

  const isStale = data && data.cacheAge > 5 * 60;
  const syncLabel = data ? formatSyncAge(data.lastUpdated) : null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLoading || isFetching ? 'bg-amber-400 animate-pulse' : isStale ? 'bg-amber-400' : 'bg-emerald-500'}`} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">Live from Salesforce</span>
          {data && (
            <span className={`text-[9px] ${isStale ? 'text-amber-600' : 'text-emerald-600/70'}`}>
              · {isStale ? 'stale · ' : ''}{syncLabel}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-[9px] text-emerald-700/60 hover:text-emerald-800 flex items-center gap-0.5 disabled:opacity-40"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-7 flex-1 rounded bg-emerald-100 animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Database,       label: 'Programs',    value: n(data.programs.total),                    sub: `${n(data.programs.active)} active` },
            { icon: Users,          label: 'Enrollments', value: n(data.engagements.total),                 sub: `${n(data.engagements.active)} active` },
            { icon: Activity,       label: 'Deliveries',  value: n(data.serviceDeliveries.last30Days),      sub: 'last 30 days' },
            { icon: AlertTriangle,  label: 'Open Cases',  value: n(data.cases.open),                        sub: `${n(data.cases.highPriority)} high priority` },
          ].map(m => (
            <div key={m.label} className="rounded bg-white/70 border border-emerald-100 px-2 py-1.5">
              <p className="text-[9px] font-bold text-emerald-700/60 uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className="text-[15px] font-bold text-emerald-900 leading-none">{m.value}</p>
              <p className="text-[9px] text-emerald-700/60 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function OpsOverview() {
  const { setSelectedItem } = useAppContext();
  const { isEveryday } = useTierFlags();
  const { visibleRecs } = useActionItems();
  const cfg = HEALTH_LEVEL_CONFIG[overallHealthLevel];
  const { data: sfPrograms } = useSfOpsPrograms();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {!isEveryday && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2">
            <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Phase 1</span>
            <span className="text-[10px] text-amber-600">Operations, Health, Demand, Scorecards, and Trends are unified here.</span>
          </div>
        )}

        <SfLiveStrip />

        <div className="rounded-lg border border-border bg-white px-4 py-3 flex items-center gap-5">
          <div className="flex items-baseline gap-2 shrink-0">
            <p className={`text-4xl font-bold leading-none ${cfg.score}`}>{overallHealthScore}</p>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider leading-none">Overall</span>
              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 leading-none ${cfg.cls}`}>{cfg.label}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-border/60 shrink-0" />
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            {[
              { l: 'Critical',        v: visibleRecs.filter(r => r.priority === 'critical').length, c: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200'   },
              { l: 'High Priority',   v: visibleRecs.filter(r => r.priority === 'high').length,     c: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
              { l: 'Domains At Risk', v: domainHealthData.filter(d => d.level === 'at-risk').length,    c: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200'   },
              { l: 'Needs Work',      v: domainHealthData.filter(d => d.level === 'needs-work').length, c: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200'  },
            ].map(s => (
              <div key={s.l} className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 ${s.bg}`}>
                <span className={`text-xl font-bold leading-none ${s.c}`}>{s.v}</span>
                <span className={`text-[9px] font-medium leading-tight ${s.c} opacity-80`}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>

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
                    <span className={`text-lg font-bold leading-none ${dc.score}`}>{d.score}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{d.domain}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">{d.summary}</p>
                  {d.id === 'dh-programs' && sfPrograms != null && (
                    <span className="text-[8px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 mt-1 inline-block leading-none">
                      SF: {sfPrograms.active ?? '?'} active · {sfPrograms.total ?? '?'} total
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
