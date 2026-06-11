import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  integrations, risks, launchMilestones, dataFlowNodes, IRC_SUMMARY,
  DOMAIN_ORDER, DOMAIN_CONFIG, STATUS_CONFIG,
  type Integration, type IntegrationDomain, type IntegrationStatus,
} from '@/data/integrationReadinessData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Database, FolderOpen, MessageSquare, Calendar, GraduationCap, Brain,
  CheckSquare, Network, ShieldCheck, Zap, GitBranch, ClipboardList,
  AlertTriangle, CheckCircle2, ArrowRight, ChevronDown, ChevronRight,
  Search, Filter, Lock, MapPin, Rocket, Activity,
} from 'lucide-react';

type IRCView = 'overview' | 'catalog' | 'data-flow' | 'auth' | 'field-mapping' | 'sync-readiness' | 'testing' | 'risks' | 'launch';

const DOMAIN_ICONS: Record<IntegrationDomain, typeof Database> = {
  'Salesforce':      Database,
  'Google Drive':    FolderOpen,
  'Slack':           MessageSquare,
  'Google Chat':     MessageSquare,
  'Google Calendar': Calendar,
  'LMS':             GraduationCap,
  'Assessments':     CheckSquare,
  'Penny Services':  Brain,
};

function ViewTab({ label, active, count, onClick }: {
  label: string; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[10px] font-bold rounded-full px-1 leading-none ${active ? 'text-foreground' : 'text-muted-foreground/60'}`}>{count}</span>
      )}
    </button>
  );
}

function ReadinessBar({ score, cls }: { score: number; cls?: string }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : score >= 20 ? 'bg-rose-500' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 h-2 rounded-full bg-border overflow-hidden ${cls}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-bold text-foreground w-8 text-right">{score}%</span>
    </div>
  );
}

// ── Integration Row ────────────────────────────────────────────────────────

function IntegrationRow({ int: i, selected, onSelect }: { int: Integration; selected: boolean; onSelect: () => void }) {
  const domCfg = DOMAIN_CONFIG[i.domain];
  const stsCfg = STATUS_CONFIG[i.status];
  return (
    <button onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected ? 'bg-foreground text-background border-foreground'
                 : 'bg-white border-border hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <p className={`text-[11px] font-bold leading-snug mb-0.5 ${selected ? 'text-background' : 'text-foreground'}`}>{i.shortName}</p>
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : domCfg.cls}`}>{i.domain}</span>
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : stsCfg.cls}`}>{i.status}</span>
      </div>
    </button>
  );
}

// ── Integration Detail ─────────────────────────────────────────────────────

function IntegrationDetail({ i, onOpenBrief }: { i: Integration; onOpenBrief: () => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['purpose','next']));
  function toggle(id: string) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  const Sec = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const isOpen = open.has(id);
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {isOpen && <div className="p-3">{children}</div>}
      </div>
    );
  };
  const domCfg = DOMAIN_CONFIG[i.domain];
  const stsCfg = STATUS_CONFIG[i.status];
  const DomIcon = DOMAIN_ICONS[i.domain];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded-lg border ${domCfg.cls} mt-0.5`}><DomIcon className="w-4 h-4" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{i.domain} · {i.priority}</p>
                <h3 className="text-[15px] font-serif font-bold text-foreground leading-snug">{i.name}</h3>
              </div>
            </div>
            <button onClick={onOpenBrief} className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5 shrink-0">Brief</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${stsCfg.cls}`}>{i.status}</span>
            <span className="text-[10px] font-bold border border-border bg-muted/40 rounded-full px-2 py-0.5 text-muted-foreground">{i.launchPhase}</span>
            <span className="text-[10px] font-bold border border-border bg-muted/40 rounded-full px-2 py-0.5 text-muted-foreground">{i.syncDirection}</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Purpose</p>
          <p className="text-[12px] text-foreground leading-relaxed">{i.purpose}</p>
        </div>

        {/* Penny note */}
        {i.pennyNote && (
          <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3">
            <p className="text-[10px] font-bold text-secondary/70 uppercase tracking-wider mb-1">Penny Note</p>
            <p className="text-[11px] text-foreground leading-relaxed">{i.pennyNote}</p>
          </div>
        )}

        {/* Readiness */}
        <div className="rounded-lg border border-border bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-2">Integration Readiness</p>
          <ReadinessBar score={i.readinessScore} />
          <p className="text-[10px] text-muted-foreground mt-1">
            {i.readinessScore >= 70 ? 'Near-ready for configuration.' : i.readinessScore >= 40 ? 'Significant setup work remaining.' : i.readinessScore >= 20 ? 'Early planning stage.' : 'Not yet in scope.'}
          </p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Owner',          value: i.owner },
            { label: 'Auth Type',      value: i.authType },
            { label: 'Sync Direction', value: i.syncDirection },
            { label: 'Sync Cadence',   value: i.syncCadence.split('.')[0] },
            { label: 'System Role',    value: i.systemRole },
            { label: 'Launch Phase',   value: i.launchPhase },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-white p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</p>
              <p className="text-[11px] font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Related */}
        <Sec id="related" label="Related Trail OS Modules">
          <div className="flex flex-wrap gap-1">
            {i.relatedTrailOSModules.map(m => <span key={m} className="text-[10px] font-medium border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5 text-primary">{m}</span>)}
          </div>
        </Sec>

        {i.relatedSfObjects.length > 0 && (
          <Sec id="sf" label={`Salesforce Objects (${i.relatedSfObjects.length})`}>
            <div className="flex flex-wrap gap-1">
              {i.relatedSfObjects.map(o => <span key={o} className="text-[10px] font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{o}</span>)}
            </div>
          </Sec>
        )}

        {/* Blockers */}
        {i.blockers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700/80">Blockers ({i.blockers.length})</p>
            {i.blockers.map((b, idx) => (
              <div key={idx} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-900 leading-snug">{b}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risks */}
        {i.risks.length > 0 && (
          <Sec id="risks" label={`Risks (${i.risks.length})`}>
            <div className="space-y-1.5">
              {i.risks.map((r, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-snug">{r}</p>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {/* Next steps */}
        <Sec id="next" label={`Next Steps (${i.nextSteps.length})`}>
          <div className="space-y-1.5">
            {i.nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                <p className="text-[11px] text-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </Sec>
      </div>
    </ScrollArea>
  );
}

// ── Overview View ──────────────────────────────────────────────────────────

function OverviewView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-3xl">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Integrations',  value: IRC_SUMMARY.total,               sub: 'planned',         cls: 'border-foreground/20 bg-foreground/5' },
            { label: 'P1 Priority',   value: IRC_SUMMARY.p1Count,             sub: 'critical path',   cls: 'border-primary/20 bg-primary/5' },
            { label: 'Open Risks',    value: IRC_SUMMARY.openRisks,           sub: 'need mitigation', cls: 'border-amber-200 bg-amber-50' },
            { label: 'Avg Readiness', value: `${IRC_SUMMARY.avgReadiness}%`,  sub: 'overall score',   cls: IRC_SUMMARY.avgReadiness >= 50 ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.cls}`}>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold text-foreground/80">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div>
          <h3 className="text-[12px] font-bold text-foreground mb-2">Integration Status</h3>
          <div className="space-y-2">
            {(Object.entries(IRC_SUMMARY.byStatus) as [IntegrationStatus, number][])
              .filter(([,c]) => c > 0)
              .map(([status, count]) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={status} className={`flex items-center gap-3 rounded-xl border p-3 ${cfg.cls}`}>
                    <span className="text-[11px] font-bold w-40">{status}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/50 overflow-hidden">
                      <div className="h-full bg-current rounded-full opacity-50" style={{ width: `${(count / IRC_SUMMARY.total) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-bold">{count}</span>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Domain readiness */}
        <div>
          <h3 className="text-[12px] font-bold text-foreground mb-2">Readiness by Domain</h3>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {DOMAIN_ORDER.map((domain, i) => {
              const domInts = integrations.filter(int => int.domain === domain);
              if (!domInts.length) return null;
              const avg = Math.round(domInts.reduce((s, i) => s + i.readinessScore, 0) / domInts.length);
              const cfg = DOMAIN_CONFIG[domain];
              const DIcon = DOMAIN_ICONS[domain];
              return (
                <div key={domain} className={`px-4 py-3 flex items-center gap-3 ${i < DOMAIN_ORDER.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className={`p-1.5 rounded-lg border shrink-0 ${cfg.cls}`}><DIcon className="w-3.5 h-3.5" /></div>
                  <div className="w-32 shrink-0">
                    <p className="text-[11px] font-bold text-foreground">{domain}</p>
                    <p className="text-[10px] text-muted-foreground">{domInts.length} integration{domInts.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1">
                    <ReadinessBar score={avg} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Launch timeline summary */}
        <div>
          <h3 className="text-[12px] font-bold text-foreground mb-2">Launch Phases</h3>
          <div className="space-y-2">
            {launchMilestones.map(ms => {
              const stsCls = ms.status === 'In Planning' ? 'text-amber-700 bg-amber-50 border-amber-200'
                           : ms.status === 'In Progress' ? 'text-blue-700 bg-blue-50 border-blue-200'
                           : ms.status === 'Complete' ? 'text-green-700 bg-green-50 border-green-200'
                           : 'text-slate-500 bg-slate-50 border-slate-200';
              return (
                <div key={ms.id} className="rounded-xl border border-border bg-white p-3 flex items-start gap-3">
                  <div className="shrink-0">
                    <span className="text-[9px] font-bold border rounded-full px-1.5 py-0.5 border-border text-muted-foreground">{ms.phase}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-foreground">{ms.title}</p>
                    <p className="text-[10px] text-muted-foreground">{ms.description}</p>
                  </div>
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${stsCls}`}>{ms.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Catalog View ───────────────────────────────────────────────────────────

function CatalogView({ onOpenBrief }: { onOpenBrief: (i: Integration) => void }) {
  const [selectedId, setSelectedId] = useState(integrations[0].id);
  const [search, setSearch]         = useState('');
  const [filterDomain, setFilterDomain] = useState<IntegrationDomain | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<IntegrationStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return integrations.filter(i =>
      (filterDomain === 'all' || i.domain === filterDomain) &&
      (filterStatus === 'all' || i.status === filterStatus) &&
      (!q || i.name.toLowerCase().includes(q) || i.shortName.toLowerCase().includes(q))
    );
  }, [search, filterDomain, filterStatus]);

  const selected = integrations.find(i => i.id === selectedId) ?? integrations[0];

  const grouped = useMemo(() => {
    const g: Partial<Record<IntegrationDomain, Integration[]>> = {};
    for (const int of filtered) {
      if (!g[int.domain]) g[int.domain] = [];
      g[int.domain]!.push(int);
    }
    return g;
  }, [filtered]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[230px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-7 h-7 text-[11px] bg-white" />
          </div>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value as any)} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All domains</option>
            {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All statuses</option>
            {(['Prototype','Ready to Configure','Needs Admin Setup','Needs Security Review','Blocked','Future'] as IntegrationStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-[11px] text-center text-muted-foreground py-6">No integrations match.</p>}
            {DOMAIN_ORDER.map(domain => {
              const ints = grouped[domain];
              if (!ints?.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ints.map(i => <IntegrationRow key={i.id} int={i} selected={selectedId === i.id} onSelect={() => setSelectedId(i.id)} />)}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 overflow-hidden">
        <IntegrationDetail i={selected} onOpenBrief={() => onOpenBrief(selected)} />
      </div>
    </div>
  );
}

// ── Data Flow Map View ─────────────────────────────────────────────────────

function DataFlowView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = dataFlowNodes.find(n => n.id === selectedId);
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-3xl">

        {/* Central architecture diagram */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="space-y-3">
            {/* Row 1: Salesforce + LMS */}
            <div className="grid grid-cols-2 gap-3">
              {['node-sf','node-lms'].map(id => {
                const node = dataFlowNodes.find(n => n.id === id)!;
                if (!node) return null;
                return (
                  <button key={id} onClick={() => setSelectedId(selectedId === id ? null : id)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      selectedId === id ? 'ring-2 ring-foreground ' : 'hover:border-foreground/30 '
                    }${node.cls}`}
                  >
                    <p className="text-[12px] font-bold">{node.label}</p>
                    <p className="text-[10px] font-semibold opacity-70">{node.systemRole}</p>
                    <p className="text-[10px] opacity-60 leading-snug mt-0.5">{node.description.split('.')[0]}.</p>
                  </button>
                );
              })}
            </div>
            {/* Arrow down */}
            <div className="flex justify-center gap-16">
              {[0,1].map(i => <ArrowRight key={i} className="w-4 h-4 text-muted-foreground rotate-90" />)}
            </div>
            {/* Row 2: Trail OS (center) + Google Drive */}
            <div className="grid grid-cols-2 gap-3">
              {['node-trail-os','node-gdrive'].map(id => {
                const node = dataFlowNodes.find(n => n.id === id)!;
                if (!node) return null;
                return (
                  <button key={id} onClick={() => setSelectedId(selectedId === id ? null : id)}
                    className={`text-left rounded-xl border p-3 transition-all ${selectedId === id ? 'ring-2 ring-foreground ' : 'hover:border-foreground/30 '}${node.cls}`}
                  >
                    <p className="text-[12px] font-bold">{node.label}</p>
                    <p className="text-[10px] font-semibold opacity-70">{node.systemRole}</p>
                    <p className="text-[10px] opacity-60 leading-snug mt-0.5">{node.description.split('.')[0]}.</p>
                  </button>
                );
              })}
            </div>
            {/* Arrow down */}
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
            </div>
            {/* Row 3: Penny */}
            {(() => {
              const node = dataFlowNodes.find(n => n.id === 'node-penny')!;
              return (
                <button onClick={() => setSelectedId(selectedId === 'node-penny' ? null : 'node-penny')}
                  className={`text-left rounded-xl border p-3 transition-all ${selectedId === 'node-penny' ? 'ring-2 ring-foreground ' : 'hover:border-foreground/30 '}${node.cls}`}
                >
                  <p className="text-[12px] font-bold">{node.label}</p>
                  <p className="text-[10px] font-semibold opacity-70">{node.systemRole}</p>
                  <p className="text-[10px] opacity-60 leading-snug mt-0.5">{node.description.split('.')[0]}.</p>
                </button>
              );
            })()}
            {/* Arrow down */}
            <div className="flex justify-center gap-16">
              {[0,1].map(i => <ArrowRight key={i} className="w-4 h-4 text-muted-foreground rotate-90" />)}
            </div>
            {/* Row 4: Communications + Calendar */}
            <div className="grid grid-cols-2 gap-3">
              {['node-comms','node-calendar'].map(id => {
                const node = dataFlowNodes.find(n => n.id === id)!;
                if (!node) return null;
                return (
                  <button key={id} onClick={() => setSelectedId(selectedId === id ? null : id)}
                    className={`text-left rounded-xl border p-3 transition-all ${selectedId === id ? 'ring-2 ring-foreground ' : 'hover:border-foreground/30 '}${node.cls}`}
                  >
                    <p className="text-[12px] font-bold">{node.label}</p>
                    <p className="text-[10px] font-semibold opacity-70">{node.systemRole}</p>
                    <p className="text-[10px] opacity-60 leading-snug mt-0.5">{node.description.split('.')[0]}.</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected node detail */}
        {selected && (
          <div className={`rounded-xl border p-4 ${selected.cls}`}>
            <p className="text-[13px] font-bold mb-1">{selected.label} — {selected.systemRole}</p>
            <p className="text-[11px] text-foreground/80 leading-relaxed mb-3">{selected.description}</p>
            <p className="text-[11px] font-bold text-foreground mb-2">Data Flows</p>
            <div className="space-y-2">
              {selected.outbound.map((flow, i) => {
                const target = dataFlowNodes.find(n => n.id === flow.targetId);
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white/50 border border-white p-2">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-foreground/60" />
                    <div>
                      <p className="text-[11px] font-bold text-foreground">{target?.label} ← {flow.label}</p>
                      <p className="text-[10px] text-foreground/70">{flow.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Auth & Permissions View ────────────────────────────────────────────────

function AuthView() {
  const allAuth = integrations
    .filter(i => i.authRequirements.length > 0 && i.status !== 'Future')
    .flatMap(i => i.authRequirements.map(a => ({ ...a, intId: i.id, intName: i.shortName, domain: i.domain, authType: i.authType })));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-amber-50/60 flex-shrink-0 flex items-center gap-2">
        <Lock className="w-3 h-3 text-rose-600 shrink-0" />
        <p className="text-[11px] text-rose-800 font-medium">Access planning only — no credentials stored here. Do not enter credentials until security review is complete.</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {DOMAIN_ORDER.map(domain => {
            const domAuths = allAuth.filter(a => a.domain === domain);
            if (!domAuths.length) return null;
            const cfg    = DOMAIN_CONFIG[domain];
            const DIcon  = DOMAIN_ICONS[domain];
            const intIds = [...new Set(domAuths.map(a => a.intId))];
            return (
              <div key={domain} className={`rounded-xl border p-4 ${cfg.cls}`}>
                <div className="flex items-center gap-2 mb-3">
                  <DIcon className="w-4 h-4" />
                  <p className="text-[13px] font-bold text-foreground">{domain}</p>
                  <span className="text-[10px] font-bold ml-auto">{intIds.length} integration{intIds.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {intIds.map(intId => {
                    const int     = integrations.find(i => i.id === intId)!;
                    const intAuth = domAuths.filter(a => a.intId === intId);
                    return (
                      <div key={intId} className="rounded-lg bg-white/60 border border-white p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-[11px] font-bold text-foreground">{int.shortName}</p>
                          <span className="text-[9px] font-bold border rounded-full px-1.5 py-0.5 border-border text-muted-foreground bg-white">{int.authType}</span>
                        </div>
                        <div className="space-y-1">
                          {intAuth.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px]">
                              <Lock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                              <code className="font-mono font-bold text-foreground bg-muted/40 rounded px-1 text-[10px]">{a.scope}</code>
                              <span className="text-muted-foreground flex-1">{a.purpose}</span>
                              <span className={`text-[9px] font-bold shrink-0 ${a.minimumRequired ? 'text-rose-700' : 'text-slate-500'}`}>
                                {a.minimumRequired ? 'Required' : 'Optional'}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">{a.approver}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Field Mapping View ─────────────────────────────────────────────────────

function FieldMappingView() {
  const [selectedId, setSelectedId] = useState(integrations.find(i => i.fieldMappings.length > 0)?.id ?? integrations[0].id);
  const int = integrations.find(i => i.id === selectedId) ?? integrations[0];

  const statusCls = {
    Confirmed: 'text-green-700 bg-green-50 border-green-200',
    Proposed:  'text-amber-700 bg-amber-50 border-amber-200',
    Blocked:   'text-rose-700 bg-rose-50 border-rose-200',
    TBD:       'text-slate-500 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Integrations</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(domain => {
              const ints = integrations.filter(i => i.domain === domain && i.fieldMappings.length > 0);
              if (!ints.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ints.map(i => (
                    <button key={i.id} onClick={() => setSelectedId(i.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        selectedId === i.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      <p className="font-bold">{i.shortName}</p>
                      <p className={`text-[9px] mt-0.5 ${selectedId === i.id ? 'text-background/60' : 'text-muted-foreground/60'}`}>{i.fieldMappings.length} mappings</p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-3xl space-y-4">
          <div className={`rounded-xl border p-3 ${DOMAIN_CONFIG[int.domain].cls}`}>
            <p className="text-[13px] font-bold">{int.name}</p>
            <p className="text-[10px] text-muted-foreground">{int.fieldMappings.length} field mapping{int.fieldMappings.length !== 1 ? 's' : ''}</p>
          </div>
          {int.fieldMappings.length === 0
            ? <p className="text-[12px] text-muted-foreground text-center py-8">No field mappings defined for this integration yet.</p>
            : (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_100px_80px] gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                  {['Source Field','Target Field','Direction','Status'].map(h => (
                    <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</p>
                  ))}
                </div>
                {int.fieldMappings.map((fm, i) => (
                  <div key={i} className={`grid grid-cols-[1fr_1fr_100px_80px] gap-2 px-4 py-3 items-start ${i < int.fieldMappings.length - 1 ? 'border-b border-border' : ''}`}>
                    <code className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 rounded px-1.5 py-0.5 leading-snug">{fm.sourceField}</code>
                    <code className="text-[10px] font-mono font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 leading-snug">{fm.targetField}</code>
                    <p className="text-[10px] text-muted-foreground leading-snug">{fm.direction}</p>
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 self-start ${statusCls[fm.status]}`}>{fm.status}</span>
                  </div>
                ))}
              </div>
            )}
          {int.fieldMappings.some(fm => fm.notes) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-foreground">Mapping Notes</p>
              {int.fieldMappings.filter(fm => fm.notes).map((fm, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <code className="font-mono text-[10px] text-foreground/60 shrink-0">{fm.sourceField.split('.').pop()}</code>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{fm.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Sync Readiness View ────────────────────────────────────────────────────

function SyncReadinessView() {
  const activeInts = integrations.filter(i => i.status !== 'Future');

  const checkStatusCls = {
    Pass:        'text-green-700 bg-green-50 border-green-200',
    Fail:        'text-rose-700 bg-rose-50 border-rose-200',
    Partial:     'text-amber-700 bg-amber-50 border-amber-200',
    'Not Started': 'text-slate-500 bg-slate-50 border-slate-200',
  };

  const checkNames = activeInts[0]?.syncReadiness.map(c => c.check) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left font-bold text-muted-foreground/60 uppercase tracking-wider pb-2 pr-3 w-40">Integration</th>
                {checkNames.map(name => (
                  <th key={name} className="text-center font-bold text-muted-foreground/60 uppercase tracking-wider pb-2 px-1 w-20">
                    {name.split(' ').map((w, i) => <span key={i} className="block">{w}</span>)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeInts.map(int => (
                <tr key={int.id} className="border-t border-border">
                  <td className="py-2 pr-3">
                    <p className="font-bold text-foreground">{int.shortName}</p>
                    <span className={`text-[9px] font-bold border rounded-full px-1 py-0.5 ${STATUS_CONFIG[int.status].cls}`}>{int.status}</span>
                  </td>
                  {int.syncReadiness.map(check => (
                    <td key={check.check} className="py-2 px-1 text-center">
                      <span className={`inline-block text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${checkStatusCls[check.status]}`}>
                        {check.status === 'Pass' ? '✓' : check.status === 'Fail' ? '✗' : check.status === 'Partial' ? '~' : '—'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
            {([['Pass','✓ Confirmed'],['Partial','~ Partial'],['Not Started','— Not Started'],['Fail','✗ Failed']] as const).map(([s, label]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${checkStatusCls[s]}`}>{label.split(' ')[0]}</span>
                <span className="text-[10px] text-muted-foreground">{label.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Testing Checklist View ─────────────────────────────────────────────────

function TestingChecklistView() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState(integrations.find(i => i.status !== 'Future')?.id ?? integrations[0].id);
  const int = integrations.find(i => i.id === selectedId) ?? integrations[0];

  function toggleCheck(key: string) {
    setChecked(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  const total    = int.syncReadiness.length;
  const checkedN = int.syncReadiness.filter((_, i) => checked.has(`${int.id}-${i}`)).length;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Integration</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(domain => {
              const ints = integrations.filter(i => i.domain === domain && i.status !== 'Future');
              if (!ints.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ints.map(i => {
                    const n = i.syncReadiness.filter((_, idx) => checked.has(`${i.id}-${idx}`)).length;
                    return (
                      <button key={i.id} onClick={() => setSelectedId(i.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                          selectedId === i.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                        }`}
                      >
                        <p className="font-bold">{i.shortName}</p>
                        <p className={`text-[9px] mt-0.5 ${selectedId === i.id ? 'text-background/60' : 'text-muted-foreground/60'}`}>{n}/{i.syncReadiness.length} complete</p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-xl space-y-4">
          <div className={`rounded-xl border p-3 ${DOMAIN_CONFIG[int.domain].cls}`}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">{int.name}</p>
              <span className="text-[10px] font-bold">{checkedN}/{total}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/40 overflow-hidden">
              <div className="h-full bg-current rounded-full opacity-70 transition-all" style={{ width: `${(checkedN/total) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {int.syncReadiness.map((check, i) => {
              const key    = `${int.id}-${i}`;
              const done   = checked.has(key);
              return (
                <button key={key} onClick={() => toggleCheck(key)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    done ? 'border-green-200 bg-green-50' : 'border-border bg-white hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      done ? 'bg-green-600 border-green-600' : 'border-border'
                    }`}>
                      {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className={`text-[12px] font-bold ${done ? 'text-green-900 line-through' : 'text-foreground'}`}>{check.check}</p>
                      <p className={`text-[11px] mt-0.5 ${done ? 'text-green-700' : 'text-muted-foreground'}`}>{check.description}</p>
                      {check.notes && <p className={`text-[10px] mt-1 font-semibold italic ${done ? 'text-green-700' : 'text-primary/70'}`}>Note: {check.notes}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-center text-muted-foreground/60">Checklist state is session-only — not persisted.</p>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Risk Register View ─────────────────────────────────────────────────────

function RiskRegisterView() {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const filtered = filterSeverity === 'all' ? risks : risks.filter(r => r.severity === filterSeverity);

  const sevCls = {
    Critical: 'text-red-800 bg-red-50 border-red-200',
    High:     'text-rose-700 bg-rose-50 border-rose-200',
    Medium:   'text-amber-700 bg-amber-50 border-amber-200',
    Low:      'text-slate-600 bg-slate-50 border-slate-200',
  };
  const likelyCls = {
    Likely:   'text-rose-700 bg-rose-50 border-rose-200',
    Possible: 'text-amber-700 bg-amber-50 border-amber-200',
    Unlikely: 'text-slate-500 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-white flex-shrink-0 flex items-center gap-3">
        <span className="text-[10px] font-bold text-red-800 border border-red-200 bg-red-50 rounded-full px-2 py-0.5">
          {risks.filter(r => r.severity === 'Critical' && r.status === 'Open').length} Critical Open
        </span>
        <span className="text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-2 py-0.5">
          {risks.filter(r => r.severity === 'High' && r.status === 'Open').length} High Open
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All severity</option>
            {['Critical','High','Medium','Low'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-2">
          {filtered.map(risk => (
            <div key={risk.id} className={`rounded-xl border p-4 ${risk.severity === 'Critical' ? 'border-red-200 bg-red-50' : risk.severity === 'High' ? 'border-rose-200 bg-rose-50' : 'border-border bg-white'}`}>
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${risk.severity === 'Critical' ? 'text-red-700' : risk.severity === 'High' ? 'text-rose-600' : 'text-amber-600'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-[13px] font-bold ${risk.severity === 'Critical' ? 'text-red-900' : risk.severity === 'High' ? 'text-rose-900' : 'text-foreground'}`}>{risk.title}</p>
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${sevCls[risk.severity]}`}>{risk.severity}</span>
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${likelyCls[risk.likelihood]}`}>{risk.likelihood}</span>
                  </div>
                  <p className={`text-[11px] leading-snug ${risk.severity === 'Critical' ? 'text-red-800' : risk.severity === 'High' ? 'text-rose-800' : 'text-muted-foreground'}`}>{risk.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="rounded-lg border border-white/80 bg-white/60 p-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Mitigation</p>
                  <p className="text-[11px] text-foreground leading-snug">{risk.mitigation}</p>
                </div>
                <div className="rounded-lg border border-white/80 bg-white/60 p-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Owner · Status</p>
                  <p className="text-[11px] text-foreground">{risk.owner}</p>
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${risk.status === 'Open' ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-green-700 bg-green-50 border-green-200'}`}>{risk.status}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {risk.affectedIntegrations.map(id => {
                  const int = integrations.find(i => i.id === id);
                  return int ? <span key={id} className="text-[9px] font-medium border border-border bg-white/80 rounded-full px-1.5 py-0.5 text-muted-foreground">{int.shortName}</span> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Launch Plan View ───────────────────────────────────────────────────────

function LaunchPlanView() {
  const [selectedId, setSelectedId] = useState(launchMilestones[0].id);
  const ms = launchMilestones.find(m => m.id === selectedId) ?? launchMilestones[0];

  const stsCls = {
    'Not Started': 'text-slate-500 bg-slate-50 border-slate-200',
    'In Planning': 'text-amber-700 bg-amber-50 border-amber-200',
    'In Progress': 'text-blue-700 bg-blue-50 border-blue-200',
    'Complete':    'text-green-700 bg-green-50 border-green-200',
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Phases</p>
        </div>
        <div className="p-2 space-y-1">
          {launchMilestones.map(m => (
            <button key={m.id} onClick={() => setSelectedId(m.id)}
              className={`w-full text-left px-2.5 py-2.5 rounded-lg transition-all ${
                selectedId === m.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <p className={`text-[11px] font-bold ${selectedId === m.id ? 'text-background' : 'text-foreground'}`}>{m.title.split('—')[0].trim()}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-bold border rounded-full px-1 py-0.5 ${selectedId === m.id ? 'bg-background/20 text-background border-background/30' : 'border-border text-muted-foreground/60'}`}>{m.phase}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{ms.phase}</p>
                <h2 className="text-[16px] font-serif font-bold text-foreground">{ms.title}</h2>
              </div>
              <span className={`text-[10px] font-bold border rounded-full px-2 py-1 shrink-0 ${stsCls[ms.status]}`}>{ms.status}</span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">{ms.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Estimated Effort</p>
              <p className="text-[12px] font-semibold text-foreground">{ms.estimatedEffort}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Dependencies</p>
              <p className="text-[12px] font-semibold text-foreground">{ms.dependencies.length === 0 ? 'None' : ms.dependencies.join(', ')}</p>
            </div>
          </div>

          {/* Integrations in this phase */}
          <div>
            <p className="text-[11px] font-bold text-foreground mb-2">Integrations in this Phase ({ms.integrationIds.length})</p>
            <div className="space-y-2">
              {ms.integrationIds.map(id => {
                const int = integrations.find(i => i.id === id);
                if (!int) return null;
                const domCfg = DOMAIN_CONFIG[int.domain];
                const DIcon  = DOMAIN_ICONS[int.domain];
                return (
                  <div key={id} className="rounded-xl border border-border bg-white p-3 flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg border ${domCfg.cls}`}><DIcon className="w-3.5 h-3.5" /></div>
                    <div className="flex-1">
                      <p className="text-[12px] font-bold text-foreground">{int.name}</p>
                      <p className="text-[10px] text-muted-foreground">{int.domain}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${STATUS_CONFIG[int.status].cls}`}>{int.status}</span>
                      <ReadinessBar score={int.readinessScore} cls="w-16" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success criteria */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-[11px] font-bold text-green-800 mb-2">Success Criteria</p>
            <div className="space-y-1.5">
              {ms.successCriteria.map((sc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-green-900 leading-snug">{sc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IntegrationReadinessCenter() {
  const { setSelectedItem } = useAppContext();
  const [view, setView] = useState<IRCView>('overview');

  function openBrief(i: Integration) {
    setSelectedItem({ type: 'integration', id: i.id, data: i });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 border-b border-border flex-shrink-0 bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration — Integration Planning</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground">Integration Readiness Center</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Plan real integrations without connecting live APIs. {IRC_SUMMARY.total} integrations across {DOMAIN_ORDER.length} domains.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {IRC_SUMMARY.criticalRisks > 0 && (
              <span className="text-[11px] font-semibold text-red-800 border border-red-200 bg-red-50 rounded-full px-3 py-1">
                {IRC_SUMMARY.criticalRisks} Critical Risks
              </span>
            )}
            <span className="text-[11px] font-semibold text-foreground/70 border border-border bg-muted/40 rounded-full px-3 py-1">
              Avg Readiness: {IRC_SUMMARY.avgReadiness}%
            </span>
          </div>
        </div>
        {/* Two-group tab row — one line, no wrap */}
        <div className="flex items-center border-b border-border mt-2 -mb-2.5 gap-0">
          <ViewTab label="Overview"   active={view === 'overview'}      onClick={() => setView('overview')} />
          <ViewTab label={`Catalog (${IRC_SUMMARY.total})`} active={view === 'catalog'} onClick={() => setView('catalog')} />
          <ViewTab label="Data Flow"  active={view === 'data-flow'}     onClick={() => setView('data-flow')} />
          <ViewTab label={`Risks (${IRC_SUMMARY.openRisks})`} active={view === 'risks'} onClick={() => setView('risks')} />
          <ViewTab label={`Launch (${IRC_SUMMARY.phases})`}  active={view === 'launch'} onClick={() => setView('launch')} />
          <div className="w-px h-4 bg-border mx-1.5 self-center" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 pr-1 self-center">Admin</span>
          <ViewTab label="Auth"         active={view === 'auth'}           onClick={() => setView('auth')} />
          <ViewTab label="Fields"       active={view === 'field-mapping'}  onClick={() => setView('field-mapping')} />
          <ViewTab label="Sync"         active={view === 'sync-readiness'} onClick={() => setView('sync-readiness')} />
          <ViewTab label="Testing"      active={view === 'testing'}        onClick={() => setView('testing')} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'overview'       && <OverviewView />}
        {view === 'catalog'        && <CatalogView onOpenBrief={openBrief} />}
        {view === 'data-flow'      && <DataFlowView />}
        {view === 'auth'           && <AuthView />}
        {view === 'field-mapping'  && <FieldMappingView />}
        {view === 'sync-readiness' && <SyncReadinessView />}
        {view === 'testing'        && <TestingChecklistView />}
        {view === 'risks'          && <RiskRegisterView />}
        {view === 'launch'         && <LaunchPlanView />}
      </div>
    </div>
  );
}
