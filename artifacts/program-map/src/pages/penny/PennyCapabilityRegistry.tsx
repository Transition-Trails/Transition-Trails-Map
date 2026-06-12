import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  pennyCapabilities, CAPABILITY_SUMMARY, PENNY_ARCHITECTURE_LAYERS,
  CAPABILITY_READINESS_CONFIG, CAPABILITY_DOMAIN_CONFIG, POC_STATUS_CONFIG,
  DOMAIN_ORDER,
  type PennyCapability, type CapabilityDomain, type CapabilityReadiness,
} from '@/data/pennyCapabilityData';
import {
  Brain, Layers, Network, FlaskConical, ChevronDown, ChevronRight,
  CheckCircle2, ArrowRight, Search, Filter, Zap, BookOpen, MessageSquare,
  CalendarDays, Database, ShieldCheck, Users, Star, Link2, Plus, Hash,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';


type RegistryView = 'architecture' | 'capabilities' | 'relationships' | 'poc-mapping';

const DOMAIN_ICONS: Record<CapabilityDomain, typeof Brain> = {
  Coaching:       Brain,
  Career:         Star,
  Learning:       BookOpen,
  Knowledge:      Database,
  Operations:     Layers,
  Communications: MessageSquare,
  Questing:       Zap,
};

// ── Tab bar ────────────────────────────────────────────────────────────────

function ViewTab({
  label, icon: Icon, active, count, onClick,
}: { label: string; icon: typeof Brain; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
        active
          ? 'bg-foreground text-background border-foreground'
          : 'border-border bg-white text-muted-foreground hover:border-foreground/30 hover:text-foreground'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {count !== undefined && (
        <span className={`text-[10px] font-bold rounded-full px-1.5 ${active ? 'bg-background/20' : 'bg-muted'}`}>{count}</span>
      )}
    </button>
  );
}

// ── Capability list row ────────────────────────────────────────────────────

function CapabilityRow({ cap, selected, onSelect }: { cap: PennyCapability; selected: boolean; onSelect: () => void }) {
  const matCfg    = CAPABILITY_READINESS_CONFIG[cap.maturity];
  const domCfg    = CAPABILITY_DOMAIN_CONFIG[cap.domain];
  const pocCfg    = POC_STATUS_CONFIG[cap.pocStatus];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-white border-border hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[12px] font-bold leading-tight ${selected ? 'text-background' : 'text-foreground'}`}>{cap.name}</p>
          <p className={`text-[10px] mt-0.5 truncate ${selected ? 'text-background/60' : 'text-muted-foreground'}`}>{cap.domain}</p>
        </div>
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap ${selected ? 'bg-background/20 text-background border-background/30' : matCfg.cls}`}>{cap.maturity}</span>
      </div>
    </button>
  );
}

// ── Capability detail panel ────────────────────────────────────────────────

function CapabilityDetail({ cap, onOpenBrief }: { cap: PennyCapability; onOpenBrief: () => void }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['overview', 'io']));
  const matCfg  = CAPABILITY_READINESS_CONFIG[cap.maturity];
  const domCfg  = CAPABILITY_DOMAIN_CONFIG[cap.domain];
  const pocCfg  = POC_STATUS_CONFIG[cap.pocStatus];
  const deps    = pennyCapabilities.filter(c => cap.dependencies.includes(c.id));

  function toggle(id: string) {
    setOpenSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const open = openSections.has(id);
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {open && <div className="p-3">{children}</div>}
      </div>
    );
  };

  const Chips = ({ items, cls }: { items: string[]; cls?: string }) => (
    <div className="flex flex-wrap gap-1">
      {items.length === 0
        ? <span className="text-[10px] text-muted-foreground/50 italic">None</span>
        : items.map(i => <span key={i} className={`text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground ${cls ?? ''}`}>{i}</span>)
      }
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Penny Capability</p>
              <h3 className="text-lg font-bold text-foreground leading-snug">{cap.name}</h3>
            </div>
            <button onClick={onOpenBrief} className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5 shrink-0">
              Trail Insights
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${domCfg.cls}`}>{cap.domain}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${matCfg.cls}`}>{cap.maturity}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${pocCfg.cls}`}>{pocCfg.label}</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3">
          <p className="text-[10px] font-bold text-secondary/60 uppercase tracking-wider mb-1">Purpose</p>
          <p className="text-[12px] text-foreground leading-relaxed">{cap.purpose}</p>
        </div>

        {/* Audience */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Audience</p>
          <div className="flex flex-wrap gap-1">
            {cap.audience.map(a => (
              <span key={a} className="flex items-center gap-1 text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground">
                <Users className="w-2.5 h-2.5" />{a}
              </span>
            ))}
          </div>
        </div>

        {/* Inputs / Outputs */}
        <Section id="io" label="Inputs & Outputs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Inputs</p>
              <div className="space-y-1">
                {cap.inputs.map(i => (
                  <div key={i} className="flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground">{i}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Outputs</p>
              <div className="space-y-1">
                {cap.outputs.map(o => (
                  <div key={o} className="flex items-start gap-1.5">
                    <Zap className="w-3 h-3 text-secondary/50 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground">{o}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Related systems */}
        <Section id="related" label="Related Systems">
          <div className="space-y-2.5">
            {[
              { label: 'Programs',       items: cap.relatedPrograms,         icon: BookOpen },
              { label: 'Salesforce',     items: cap.relatedSfObjects,        icon: Database },
              { label: 'Knowledge',      items: cap.relatedKnowledgeSources, icon: ShieldCheck },
              { label: 'Channels',       items: cap.relatedCommChannels,     icon: MessageSquare },
              { label: 'Calendar',       items: cap.relatedCalendarEvents,   icon: CalendarDays },
              { label: 'Standards',      items: cap.relatedStandards,        icon: ShieldCheck },
            ].map(({ label, items, icon: Icon }) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-muted-foreground/60" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p>
                </div>
                <Chips items={items} />
              </div>
            ))}
          </div>
        </Section>

        {/* Dependencies */}
        {deps.length > 0 && (
          <Section id="deps" label={`Depends On (${deps.length})`}>
            <div className="space-y-1.5">
              {deps.map(d => {
                const dDomCfg = CAPABILITY_DOMAIN_CONFIG[d.domain];
                const dMatCfg = CAPABILITY_READINESS_CONFIG[d.maturity];
                return (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2">
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{d.name}</p>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${dDomCfg.cls}`}>{d.domain}</span>
                    </div>
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${dMatCfg.cls}`}>{d.maturity}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* POC Mapping */}
        <Section id="poc" label="POC Mapping">
          <div className={`rounded-lg border p-3 mb-2 ${POC_STATUS_CONFIG[cap.pocStatus].cls}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1">POC Status: {POC_STATUS_CONFIG[cap.pocStatus].label}</p>
            <p className="text-[11px] leading-relaxed">{cap.pocMapping}</p>
          </div>
        </Section>

        {/* Next Steps */}
        <Section id="nextsteps" label="Next Implementation Steps">
          <div className="space-y-1.5">
            {cap.nextSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-[11px] text-foreground leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Foundations Trail Example */}
        {cap.foundationsTrailExample && (
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">★ Foundations Trail Example</p>
            <p className="text-[11px] text-foreground italic leading-relaxed">{cap.foundationsTrailExample}</p>
          </div>
        )}

        {/* Future integration */}
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Future Integration</p>
          <p className="text-[11px] text-amber-900 leading-relaxed">{cap.futureIntegrationStatus}</p>
        </div>

        {/* Meta */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] space-y-1">
          <div><span className="text-muted-foreground">Owner</span><span className="font-semibold text-foreground ml-2">{cap.owner}</span></div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Architecture Overview View ─────────────────────────────────────────────

function ArchitectureView() {
  const domainStats = DOMAIN_ORDER.map(d => ({
    domain: d,
    count: pennyCapabilities.filter(c => c.domain === d).length,
    operational: pennyCapabilities.filter(c => c.domain === d && (c.maturity === 'Prototype' || c.maturity === 'Operational')).length,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6 max-w-3xl">

        {/* Hero */}
        <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5">
          <div className="flex items-start gap-3">
            <Brain className="w-8 h-8 text-secondary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-1">Penny as the Intelligence Layer</h2>
              <p className="text-[12px] text-foreground/80 leading-relaxed mb-3">
                Penny is not a chatbot. Penny is the intelligence layer that sits above Trail OS, Salesforce, the Knowledge Library,
                Communications, Calendar, and Curriculum Studio — reading context from each and delivering personalized, standards-aligned
                interactions to every learner and coach.
              </p>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                The Capability Registry is how Transition Trails defines, organizes, and tracks every capability Penny has or will have
                — before integrating the POC codebase. This is the architecture map, not the implementation.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Capabilities',  value: CAPABILITY_SUMMARY.total,               sub: 'registered', cls: 'border-foreground/20 bg-foreground/5' },
            { label: 'Prototype+',    value: CAPABILITY_SUMMARY.byMaturity['Prototype'], sub: 'active', cls: 'border-amber-200 bg-amber-50' },
            { label: 'In POC',        value: CAPABILITY_SUMMARY.byPocStatus.exists + CAPABILITY_SUMMARY.byPocStatus.partial, sub: 'partial or full', cls: 'border-green-200 bg-green-50' },
            { label: 'Domains',       value: DOMAIN_ORDER.length,                    sub: 'coverage areas', cls: 'border-secondary/20 bg-secondary/5' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold text-foreground/80">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Architecture layers */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Architecture Layers</h3>
          <div className="space-y-2">
            {PENNY_ARCHITECTURE_LAYERS.map((layer, i) => (
              <div key={layer.layer} className={`rounded-xl border p-4 ${layer.cls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {i === 0 && <Brain className="w-4 h-4 text-secondary" />}
                      <p className="text-[12px] font-bold text-foreground">{layer.layer}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{layer.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {layer.components.map(c => (
                        <span key={c} className="text-[10px] font-medium border border-border/50 bg-white/60 rounded-full px-2 py-0.5 text-foreground/70">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Capability Readiness Model */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Capability Readiness Model</h3>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {(['Prototype', 'Defined', 'Planned', 'In Development', 'Integrated', 'Operational'] as CapabilityReadiness[]).map((r, i) => {
              const cfg   = CAPABILITY_READINESS_CONFIG[r];
              const count = CAPABILITY_SUMMARY.byMaturity[r];
              const descriptions: Record<CapabilityReadiness, string> = {
                'Prototype':      'Rough proof of concept exists in the POC repository. Core behavior demonstrated but not production-ready.',
                'Defined':        'Capability is fully specified in the Registry — purpose, inputs, outputs, and standards. Not yet built.',
                'Planned':        'On the product roadmap with a target quarter. Spec is stable; resourcing confirmed.',
                'In Development': 'Actively being built. Integration work underway in the development environment.',
                'Integrated':     'Connected to live systems (Salesforce, Slack, etc.) and running in a test environment.',
                'Operational':    'Running in production. Learners and coaches are using it in active cohorts.',
              };
              return (
                <div key={r} className={`flex items-center gap-3 px-4 py-3 ${i < 5 ? 'border-b border-border' : ''}`}>
                  <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 w-28 text-center ${cfg.cls}`}>{cfg.label}</span>
                  <p className="text-[11px] text-muted-foreground flex-1">{descriptions[r]}</p>
                  <span className="text-[11px] font-bold text-foreground shrink-0">{count > 0 ? `${count}` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Domains */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Capability Domains</h3>
          <div className="grid grid-cols-2 gap-2">
            {domainStats.map(({ domain, count }) => {
              const Icon   = DOMAIN_ICONS[domain];
              const domCfg = CAPABILITY_DOMAIN_CONFIG[domain];
              const caps   = pennyCapabilities.filter(c => c.domain === domain);
              return (
                <div key={domain} className={`rounded-xl border p-3 ${domCfg.cls}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4" />
                    <p className="text-[12px] font-bold text-foreground">{domain}</p>
                    <span className="text-[10px] font-bold ml-auto">{count}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2 leading-snug">{domCfg.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {caps.map(c => (
                      <span key={c.id} className="text-[9px] font-medium bg-white/60 border border-white/80 rounded-full px-1.5 py-0.5 text-foreground/70">{c.name}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Capabilities Browser View ──────────────────────────────────────────────

function CapabilitiesView({
  initialId, onOpenBrief,
}: { initialId?: string; onOpenBrief: (cap: PennyCapability) => void }) {
  const [selectedId, setSelectedId] = useState(initialId ?? pennyCapabilities[0].id);
  const [search,     setSearch]     = useState('');
  const [filterDom,  setFilterDom]  = useState<CapabilityDomain | 'all'>('all');
  const [filterMat,  setFilterMat]  = useState<CapabilityReadiness | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pennyCapabilities.filter(c =>
      (filterDom === 'all' || c.domain === filterDom) &&
      (filterMat === 'all' || c.maturity === filterMat) &&
      (!q || c.name.toLowerCase().includes(q) || c.shortDescription.toLowerCase().includes(q))
    );
  }, [search, filterDom, filterMat]);

  const selected = pennyCapabilities.find(c => c.id === selectedId) ?? pennyCapabilities[0];

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search capabilities…" className="pl-7 h-7 text-[11px] bg-white" />
          </div>
          <select value={filterDom} onChange={e => setFilterDom(e.target.value as CapabilityDomain | 'all')} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All domains</option>
            {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterMat} onChange={e => setFilterMat(e.target.value as CapabilityReadiness | 'all')} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All readiness</option>
            {(['Prototype','Defined','Planned','In Development','Integrated','Operational'] as CapabilityReadiness[]).map(r =>
              <option key={r} value={r}>{r}</option>
            )}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-[11px] text-center text-muted-foreground py-6">No capabilities match.</p>}
            {DOMAIN_ORDER.map(dom => {
              const caps = filtered.filter(c => c.domain === dom);
              if (caps.length === 0) return null;
              const domCfg = CAPABILITY_DOMAIN_CONFIG[dom];
              return (
                <div key={dom}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{dom}</p>
                  {caps.map(cap => <CapabilityRow key={cap.id} cap={cap} selected={selectedId === cap.id} onSelect={() => setSelectedId(cap.id)} />)}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        <CapabilityDetail cap={selected} onOpenBrief={() => onOpenBrief(selected)} />
      </div>
    </div>
  );
}

// ── Relationship Map View ──────────────────────────────────────────────────

function RelationshipMapView() {
  const [selectedId, setSelectedId] = useState(pennyCapabilities[0].id);
  const cap = pennyCapabilities.find(c => c.id === selectedId)!;
  const domCfg = CAPABILITY_DOMAIN_CONFIG[cap.domain];
  const deps = pennyCapabilities.filter(c => cap.dependencies.includes(c.id));
  const dependents = pennyCapabilities.filter(c => c.dependencies.includes(cap.id));

  const RELATIONSHIP_GROUPS = [
    { label: 'Programs',             items: cap.relatedPrograms,         icon: BookOpen,    clsText: 'text-primary',    clsBg: 'bg-primary/5 border-primary/15' },
    { label: 'Salesforce Objects',   items: cap.relatedSfObjects,        icon: Database,    clsText: 'text-blue-700',   clsBg: 'bg-blue-50 border-blue-200' },
    { label: 'Knowledge Sources',    items: cap.relatedKnowledgeSources, icon: ShieldCheck, clsText: 'text-amber-700',  clsBg: 'bg-amber-50 border-amber-100' },
    { label: 'Comm Channels',        items: cap.relatedCommChannels,     icon: MessageSquare, clsText: 'text-green-700', clsBg: 'bg-green-50 border-green-200' },
    { label: 'Calendar Events',      items: cap.relatedCalendarEvents,   icon: CalendarDays, clsText: 'text-violet-700', clsBg: 'bg-violet-50 border-violet-200' },
    { label: 'Curriculum Standards', items: cap.relatedStandards,        icon: ShieldCheck, clsText: 'text-rose-700',   clsBg: 'bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Picker */}
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Select Capability</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(dom => {
              const caps = pennyCapabilities.filter(c => c.domain === dom);
              return (
                <div key={dom}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{dom}</p>
                  {caps.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        selectedId === c.id
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Map */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5 max-w-2xl">
          {/* Selected cap */}
          <div className={`rounded-xl border p-4 ${domCfg.cls}`}>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4" />
              <p className="text-[13px] font-bold text-foreground">{cap.name}</p>
              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ml-auto ${CAPABILITY_READINESS_CONFIG[cap.maturity].cls}`}>{cap.maturity}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{cap.shortDescription}</p>
          </div>

          {/* Relationships grid */}
          <div className="grid grid-cols-2 gap-3">
            {RELATIONSHIP_GROUPS.map(({ label, items, icon: Icon, clsText, clsBg }) => (
              <div key={label} className={`rounded-xl border p-3 ${clsBg}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3.5 h-3.5 ${clsText}`} />
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${clsText}`}>{label}</p>
                  <span className={`text-[9px] font-bold ml-auto ${clsText}`}>{items.length}</span>
                </div>
                {items.length === 0
                  ? <p className="text-[10px] text-muted-foreground/50 italic">None</p>
                  : <div className="flex flex-wrap gap-1">
                      {items.map(item => (
                        <span key={item} className="text-[10px] font-medium bg-white/70 border border-white rounded-full px-2 py-0.5 text-foreground/80">{item}</span>
                      ))}
                    </div>
                }
              </div>
            ))}
          </div>

          {/* Capability dependencies */}
          {(deps.length > 0 || dependents.length > 0) && (
            <div>
              <p className="text-[11px] font-bold text-foreground mb-2">Capability Dependencies</p>
              <div className="grid grid-cols-2 gap-3">
                {deps.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Depends On</p>
                    <div className="space-y-1.5">
                      {deps.map(d => (
                        <div key={d.id} className="flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                          <p className="text-[11px] text-foreground">{d.name}</p>
                          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ml-auto ${CAPABILITY_READINESS_CONFIG[d.maturity].cls}`}>{d.maturity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dependents.length > 0 && (
                  <div className="rounded-xl border border-border bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Required By</p>
                    <div className="space-y-1.5">
                      {dependents.map(d => (
                        <div key={d.id} className="flex items-center gap-1.5">
                          <p className="text-[11px] text-foreground">{d.name}</p>
                          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ml-auto ${CAPABILITY_READINESS_CONFIG[d.maturity].cls}`}>{d.maturity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── POC Mapping View ───────────────────────────────────────────────────────

function PocMappingView() {
  const [filterDom,    setFilterDom]    = useState<CapabilityDomain | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'exists' | 'partial' | 'planned' | 'none'>('all');

  const filtered = useMemo(() =>
    pennyCapabilities.filter(c =>
      (filterDom    === 'all' || c.domain    === filterDom) &&
      (filterStatus === 'all' || c.pocStatus === filterStatus)
    ), [filterDom, filterStatus]);

  const priorityOrder = { exists: 0, partial: 1, none: 2, planned: 3 };

  const sorted = [...filtered].sort((a, b) => {
    const matOrder = CAPABILITY_READINESS_CONFIG[a.maturity].order - CAPABILITY_READINESS_CONFIG[b.maturity].order;
    if (matOrder !== 0) return matOrder;
    return priorityOrder[a.pocStatus] - priorityOrder[b.pocStatus];
  });

  const complexityFor = (cap: PennyCapability): string => {
    if (cap.dependencies.length >= 2) return 'High';
    if (cap.inputs.length >= 4) return 'Medium';
    return 'Low';
  };

  const complexityCls: Record<string, string> = {
    High:   'text-rose-700 bg-rose-50 border-rose-200',
    Medium: 'text-amber-700 bg-amber-50 border-amber-200',
    Low:    'text-green-700 bg-green-50 border-green-200',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-white">
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-1.5">
          <p className="text-[11px] font-semibold text-secondary">
            {CAPABILITY_SUMMARY.byPocStatus.exists} exist · {CAPABILITY_SUMMARY.byPocStatus.partial} partial · {CAPABILITY_SUMMARY.byPocStatus.none} not in POC
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterDom} onChange={e => setFilterDom(e.target.value as CapabilityDomain | 'all')} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All domains</option>
            {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All POC status</option>
            <option value="exists">Exists in POC</option>
            <option value="partial">Partial in POC</option>
            <option value="none">Not in POC</option>
            <option value="planned">Planned</option>
          </select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_120px_90px_90px_90px] gap-3 px-3 py-1.5">
            {['Capability / Domain', 'POC Status', 'Maturity', 'Complexity', 'Priority'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</p>
            ))}
          </div>

          {sorted.map(cap => {
            const domCfg = CAPABILITY_DOMAIN_CONFIG[cap.domain];
            const matCfg = CAPABILITY_READINESS_CONFIG[cap.maturity];
            const pocCfg = POC_STATUS_CONFIG[cap.pocStatus];
            const complexity = complexityFor(cap);
            const priority = cap.maturity === 'Prototype' ? 'P1' : cap.maturity === 'Defined' ? 'P2' : 'P3';
            const priorityCls: Record<string, string> = { P1: 'text-rose-700 bg-rose-50 border-rose-200', P2: 'text-amber-700 bg-amber-50 border-amber-200', P3: 'text-slate-600 bg-slate-50 border-slate-200' };
            return (
              <div key={cap.id} className="grid grid-cols-[1fr_120px_90px_90px_90px] gap-3 px-3 py-3 rounded-lg border border-border bg-white hover:bg-muted/20 transition-colors items-center">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">{cap.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${domCfg.cls}`}>{cap.domain}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{cap.pocMapping}</p>
                </div>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 text-center ${pocCfg.cls}`}>{pocCfg.label}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 text-center ${matCfg.cls}`}>{cap.maturity}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 text-center ${complexityCls[complexity]}`}>{complexity}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 text-center ${priorityCls[priority]}`}>{priority}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PennyCapabilityRegistry() {
  const { setSelectedItem, openActionPanel, openSlackPanel } = useAppContext();
  const [view,         setView]         = useState<RegistryView>('architecture');
  const [initialCapId, setInitialCapId] = useState<string | undefined>(undefined);

  function openBrief(cap: PennyCapability) {
    setSelectedItem({ type: 'pennyCapability', id: cap.id, data: cap });
  }

  function goToCapabilities(id?: string) {
    setView('capabilities');
    if (id) setInitialCapId(id);
  }

  function handleNewCapability() {
    openActionPanel({
      title: 'New Penny Capability', objectType: 'Penny Capability',
      subtitle: 'Register a new Penny AI capability. Appears with Planned/Draft status until validated.',
      slackContext: 'penny',
      fields: [
        { id: 'name',             label: 'Capability Name',      type: 'text',     required: true, placeholder: 'e.g. Salary Negotiation Coach' },
        { id: 'domain',           label: 'Domain',               type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
        { id: 'description',      label: 'Description',          type: 'textarea', placeholder: 'What does this capability do for learners?', rows: 3 },
        { id: 'trigger',          label: 'When to Use',          type: 'textarea', placeholder: 'Describe the context where Penny should invoke this…', rows: 3 },
        { id: 'maturity',         label: 'Maturity Level',       type: 'select',   options: ['Concept', 'Planned', 'In Development', 'POC Ready', 'Live'] },
        { id: 'hallucinationRisk',label: 'Hallucination Risk',   type: 'select',   options: ['Low', 'Medium', 'High'] },
        { id: 'knowledgeSources', label: 'Key Knowledge Sources',type: 'textarea', placeholder: 'Which sources should Penny query?', rows: 2 },
      ],
      onSaveAndView: () => setView('capabilities'),
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0 bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
          Penny Command Center — Capability Registry
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Penny Capability Registry</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Architecture inventory of all Penny capabilities across {DOMAIN_ORDER.length} domains — before POC integration.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openSlackPanel({ context: 'penny', title: 'Penny Capabilities', subtitle: 'Slack channels and pending bot status for capability work.' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#4A154B]/20 bg-[#4A154B]/5 text-[#4A154B] hover:bg-[#4A154B]/10 transition-colors"
              title="Open Slack context"
            >
              <Hash className="w-3.5 h-3.5" />
              Slack
            </button>
            <button
              onClick={handleNewCapability}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New Capability
            </button>
            <span className="text-[11px] font-semibold text-secondary border border-secondary/20 bg-secondary/5 rounded-full px-3 py-1">
              {CAPABILITY_SUMMARY.total} capabilities
            </span>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-2 mt-3">
          <ViewTab label="Architecture"  icon={Layers}       active={view === 'architecture'}  onClick={() => setView('architecture')} />
          <ViewTab label="Capabilities"  icon={Brain}        active={view === 'capabilities'}  count={CAPABILITY_SUMMARY.total} onClick={() => setView('capabilities')} />
          <ViewTab label="Relationships" icon={Network}      active={view === 'relationships'} onClick={() => setView('relationships')} />
          <ViewTab label="POC Mapping"   icon={FlaskConical} active={view === 'poc-mapping'}   count={CAPABILITY_SUMMARY.byPocStatus.exists + CAPABILITY_SUMMARY.byPocStatus.partial} onClick={() => setView('poc-mapping')} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'architecture'  && <ArchitectureView />}
        {view === 'capabilities'  && <CapabilitiesView initialId={initialCapId} onOpenBrief={openBrief} />}
        {view === 'relationships' && <RelationshipMapView />}
        {view === 'poc-mapping'   && <PocMappingView />}
      </div>
    </div>
  );
}
