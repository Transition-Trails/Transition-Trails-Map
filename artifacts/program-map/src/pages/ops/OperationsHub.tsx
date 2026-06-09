import { Activity, BarChart2, Puzzle, GitBranch, TrendingUp, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
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
  const cfg = HEALTH_LEVEL_CONFIG[overallHealthLevel];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Phase 1 Architecture Consolidation</span>
          <span className="text-[11px] text-amber-600">— Operations, Integrations, and Demand are unified here. Demand Management is now a section of this hub.</span>
        </div>

        {/* Overall score row */}
        <div className="rounded-lg border border-border bg-white p-5 flex items-start gap-6">
          <div className="shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Overall Health</p>
            <p className={`text-5xl font-bold font-serif mt-1 ${cfg.score}`}>{overallHealthScore}</p>
            <span className={`inline-block mt-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { l: 'Critical',    v: recommendations.filter(r => r.priority === 'critical').length, c: 'text-rose-600' },
              { l: 'High Priority', v: recommendations.filter(r => r.priority === 'high').length,   c: 'text-orange-600' },
              { l: 'Domains At Risk', v: domainHealthData.filter(d => d.level === 'at-risk').length,  c: 'text-rose-600' },
              { l: 'Needs Work', v: domainHealthData.filter(d => d.level === 'needs-work').length,  c: 'text-amber-600' },
            ].map(s => (
              <div key={s.l} className="rounded-lg border border-border px-3 py-2.5">
                <p className={`text-2xl font-bold font-serif ${s.c}`}>{s.v}</p>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Domain health cards */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Domain Health</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {domainHealthData.map(d => {
              const dc = HEALTH_LEVEL_CONFIG[d.level];
              return (
                <button key={d.id}
                  onClick={() => setSelectedItem({ type: 'healthIndicator', id: d.id, data: d })}
                  className="rounded-lg border border-border bg-white p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${dc.cls}`}>{dc.label}</span>
                    <span className={`text-xl font-bold font-serif ${dc.score}`}>{d.score}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">{d.domain}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{d.summary.slice(0, 85)}…</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Critical + high priority recs */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Critical & High Priority Actions</p>
          <div className="space-y-1.5">
            {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').map(r => {
              const pc = REC_PRIORITY_CONFIG[r.priority];
              return (
                <button key={r.id}
                  onClick={() => setSelectedItem({ type: 'oicRecommendation', id: r.id, data: r })}
                  className="w-full text-left rounded-lg border border-border bg-white px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex items-center gap-3">
                  <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${pc.cls}`}>{pc.label}</span>
                  <span className="text-[12px] font-semibold text-foreground group-hover:text-primary flex-1 text-left">{r.action}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{r.domain}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">Effort: {r.effort}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Health Indicators detail ──────────────────────────────────────────────────
function HealthIndicators() {
  const { setSelectedItem } = useAppContext();
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        {domainHealthData.map(d => {
          const dc = HEALTH_LEVEL_CONFIG[d.level];
          return (
            <div key={d.id} className="rounded-lg border border-border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{d.domain}</p>
                  <p className="text-[10px] text-muted-foreground">Source: {d.sourceSystem}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 ${dc.cls}`}>{dc.label}</span>
                  <span className={`text-2xl font-bold font-serif ${dc.score}`}>{d.score}</span>
                </div>
              </div>
              <div className="px-4 py-2">
                {d.indicators.map(ind => {
                  const ic = HEALTH_LEVEL_CONFIG[ind.status];
                  const Icon = ind.status === 'strong' || ind.status === 'good' ? CheckCircle2 : AlertTriangle;
                  return (
                    <div key={ind.id}
                      onClick={() => setSelectedItem({ type: 'healthIndicator', id: ind.id, data: ind })}
                      className="flex items-start gap-2.5 py-1.5 border-b border-border/40 last:border-0 hover:bg-primary/5 cursor-pointer rounded transition-colors px-1 group">
                      <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${ind.status === 'strong' || ind.status === 'good' ? 'text-emerald-500' : ind.status === 'needs-work' ? 'text-amber-500' : 'text-rose-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground group-hover:text-primary">{ind.label}</p>
                        <p className="text-[10px] text-muted-foreground">{ind.detail}</p>
                      </div>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${ic.cls}`}>{ic.label}</span>
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
          const pc = REC_PRIORITY_CONFIG[r.priority];
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

export default function OperationsHub() {
  return (
    <HubShell
      title="Operations"
      icon={Activity}
      description="Executive health, domain indicators, integration readiness, demand pipeline, readiness scorecards, and strategic trends."
      tabs={[
        { id: 'overview',    label: 'Executive Overview', path: '/operations',              icon: BarChart2,   content: <ExecutiveOverview /> },
        { id: 'health',      label: 'Health Indicators',  path: '/operations/health',       icon: Activity,    content: <HealthIndicators /> },
        { id: 'integrations',label: 'Integrations',       path: '/operations/integrations', icon: Puzzle,      content: <IntegrationReadinessCenter /> },
        { id: 'demand',      label: 'Demand',             path: '/operations/demand',       icon: GitBranch,   content: <Intake /> },
        { id: 'scorecards',  label: 'Scorecards',         path: '/operations/scorecards',   icon: TrendingUp,  content: <ScorecardsView /> },
        { id: 'trends',      label: 'Trends & Insights',  path: '/operations/trends',       icon: AlertTriangle, content: <TrendsView /> },
        { id: 'recs',        label: 'Recommendations',    path: '/operations/recommendations', icon: ChevronRight, content: <AllRecommendations /> },
      ]}
    />
  );
}
