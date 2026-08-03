import { useState, useMemo, useContext, createContext } from 'react';
import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import {
  SF_KNOWLEDGE_CATEGORIES,
  SOURCE_TYPE_CONFIG, TRUST_LEVEL_CONFIG, SYNC_STATUS_CONFIG, HEALTH_CONFIG,
  SOURCE_TYPE_ORDER,
  type KnowledgeSource, type SourceType, type TrustLevel, type HealthStatus,
  type PennyRetrievalEntry,
} from '@/data/knowledgeSourceData';
import { pennyRetrievalMap } from '@/data/pennyRetrievalData';
import { useKnowledgeSources, type SourceSummary } from '@/hooks/useKnowledgeSources';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Database, FolderOpen, BookOpen, GraduationCap, ShieldCheck, Layers,
  Brain, MessageSquare, CalendarDays, Search, Filter, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronRight, ArrowRight, Users, Link2,
  Network, Activity, GitBranch, ClipboardList, Zap, Clock, Star, Plus,
} from 'lucide-react';

type RegistryView = 'overview' | 'catalog' | 'relationships' | 'retrieval-map' | 'governance' | 'health';

// ── Live-data context ─────────────────────────────────────────────────────────
// Provided once by the main component from useKnowledgeSources(); consumed by
// all sub-components so only one network fetch is made per render tree.

interface SourcesCtxShape { sources: KnowledgeSource[]; summary: SourceSummary; }
const EMPTY_SUMMARY: SourceSummary = {
  total: 0, available: 0, partial: 0, future: 0,
  approvedForPenny: 0, healthy: 0, warnings: 0, critical: 0,
  byType: {} as Record<SourceType, number>,
};
const SourcesCtx = createContext<SourcesCtxShape>({ sources: [], summary: EMPTY_SUMMARY });

const TYPE_ICONS: Record<SourceType, typeof Database> = {
  'Salesforce Knowledge': Database,
  'Google Drive':         FolderOpen,
  'LMS Content':          GraduationCap,
  'Assessments':          ClipboardList,
  'Standards Studio':     ShieldCheck,
  'Curriculum Studio':    Layers,
  'Penny Generated':      Brain,
  'Slack History':        MessageSquare,
  'Google Chat History':  MessageSquare,
  'Calendar Events':      CalendarDays,
};

// ── Tab ────────────────────────────────────────────────────────────────────

function ViewTab({ label, icon: Icon, active, count, onClick }: {
  label: string; icon: typeof Database; active: boolean; count?: number; onClick: () => void;
}) {
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

// ── Health dot ─────────────────────────────────────────────────────────────

function HealthDot({ status }: { status: HealthStatus }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${HEALTH_CONFIG[status].dotCls}`} />;
}

// ── Source list row ─────────────────────────────────────────────────────────

function SourceRow({ src, selected, onSelect }: {
  src: KnowledgeSource; selected: boolean; onSelect: () => void;
}) {
  const typeCfg = SOURCE_TYPE_CONFIG[src.type];
  const trustCfg = TRUST_LEVEL_CONFIG[src.trustLevel];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-white border-border hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <div className="flex items-start gap-2">
        <HealthDot status={src.healthStatus} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold leading-snug ${selected ? 'text-background' : 'text-foreground'}`}>{src.shortName}</p>
          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 mt-0.5 inline-block ${selected ? 'bg-background/20 text-background border-background/30' : typeCfg.cls}`}>{src.type}</span>
        </div>
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${selected ? 'bg-background/20 text-background border-background/30' : trustCfg.cls}`}>{src.trustLevel.slice(0,4)}</span>
      </div>
    </button>
  );
}

// ── Source detail ───────────────────────────────────────────────────────────

function SourceDetail({ src, onOpenBrief }: { src: KnowledgeSource; onOpenBrief: () => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['overview', 'penny']));
  const typeCfg  = SOURCE_TYPE_CONFIG[src.type];
  const trustCfg = TRUST_LEVEL_CONFIG[src.trustLevel];
  const syncCfg  = SYNC_STATUS_CONFIG[src.syncStatus];
  const hlthCfg  = HEALTH_CONFIG[src.healthStatus];
  const Icon     = TYPE_ICONS[src.type];

  function toggle(id: string) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const isOpen = open.has(id);
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {isOpen && <div className="p-3">{children}</div>}
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
            <div className="flex items-start gap-2">
              <div className={`p-1.5 rounded-lg border ${typeCfg.cls} mt-0.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Knowledge Source</p>
                <h3 className="text-[15px] font-bold text-foreground leading-snug">{src.name}</h3>
              </div>
            </div>
            <button onClick={onOpenBrief} className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5 shrink-0">
              Trail Insights
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${typeCfg.cls}`}>{src.type}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${trustCfg.cls}`}>{src.trustLevel}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${syncCfg.cls}`}>{syncCfg.label}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 flex items-center gap-1 ${hlthCfg.cls}`}>
              <HealthDot status={src.healthStatus} />{src.healthStatus}
            </span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Purpose</p>
          <p className="text-[12px] text-foreground leading-relaxed">{src.purpose}</p>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Owner',             value: src.owner },
            { label: 'System of Record',  value: src.systemOfRecord },
            { label: 'Review Cycle',      value: src.reviewCycle },
            { label: 'Last Review',       value: src.lastReviewDate },
            { label: 'Access',            value: src.accessStatus },
            { label: 'Availability',      value: src.availability },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-white p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</p>
              <p className="text-[11px] font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Penny use */}
        <Section id="penny" label={`${TERMS.aiAssistant} Use`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${src.approvedForPenny ? 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' : 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'}`}>
              {src.approvedForPenny ? `✓ Approved for ${TERMS.aiAssistant}` : `✗ Not Approved for ${TERMS.aiAssistant}`}
            </span>
          </div>
          <p className="text-[11px] text-foreground leading-relaxed">{src.pennyUseDescription}</p>
        </Section>

        {/* Related systems */}
        <Section id="related" label="Related Systems">
          <div className="space-y-2.5">
            {[
              { label: 'Programs',            items: src.relatedPrograms,           icon: BookOpen },
              { label: 'Knowledge Categories', items: src.relatedKnowledgeCategories, icon: Database },
              { label: 'Salesforce Objects',  items: src.relatedSfObjects,          icon: Database },
              { label: 'Standards',           items: src.relatedStandards,          icon: ShieldCheck },
              { label: `${TERMS.aiAssistant} Capabilities`,  items: src.relatedPennyCapabilities.map(id => id.replace('cap-', '').replace(/-/g, ' ')), icon: Brain },
            ].map(({ label, items, icon: I }) => (
              <div key={label}>
                <div className="flex items-center gap-1.5 mb-1"><I className="w-3 h-3 text-muted-foreground/60" /><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</p></div>
                <div className="flex flex-wrap gap-1">
                  {items.length === 0
                    ? <span className="text-[10px] italic text-muted-foreground/50">None</span>
                    : items.map(i => <span key={i} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground capitalize">{i}</span>)
                  }
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Sample contents */}
        {src.sampleContents && src.sampleContents.length > 0 && (
          <Section id="samples" label="Sample Contents">
            <div className="space-y-1">
              {src.sampleContents.map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <p className="text-[11px] text-foreground">{s}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Health */}
        {src.healthIssues.length > 0 && (
          <Section id="health" label={`Health Issues (${src.healthIssues.length})`}>
            <div className="space-y-1.5">
              {src.healthIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-2">
                  <AlertTriangle className="w-3 h-3 text-[#CC8400] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#CC8400] leading-snug">{issue}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Future integration */}
        <div className="rounded-lg border border-[#FFF3E0] bg-[#FFF3E0] p-3">
          <p className="text-[10px] font-bold text-[#CC8400] uppercase tracking-wider mb-1">Future Integration Path</p>
          <p className="text-[11px] text-[#CC8400] leading-relaxed">{src.futureIntegrationPath}</p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Overview View ───────────────────────────────────────────────────────────

function OverviewView() {
  const { sources, summary } = useContext(SourcesCtx);
  const P1 = sources.filter(s => s.integrationPriority === 'P1');
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6 max-w-3xl">

        {/* Hero */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <Network className="w-8 h-8 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-1">Knowledge Source Registry</h2>
              <p className="text-[12px] text-foreground/80 leading-relaxed mb-2">
                The central place where Trail OS understands <em>where trusted information comes from</em> and how {TERMS.aiAssistant} should use it.
                Every source {TERMS.aiAssistant} can draw on — Salesforce Knowledge, Google Drive, LMS content, assessments, standards, curriculum, and future communication data — is registered, governed, and mapped here.
              </p>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                This is architecture and governance, not live integration. No APIs are connected yet. This registry defines the <strong>source-of-truth model</strong> Transition Trails will build toward.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Sources',       value: summary.total,          sub: 'registered',  cls: 'border-foreground/20 bg-foreground/5' },
            { label: `${TERMS.aiAssistant} Approved`, value: summary.approvedForPenny, sub: 'active',    cls: 'border-[#9FC3AE] bg-[#E6F0EA]' },
            { label: 'Healthy',       value: summary.healthy,         sub: 'no issues',   cls: 'border-[#9FC3AE] bg-[#E6F0EA]' },
            { label: 'Need Attention', value: summary.warnings + summary.critical, sub: 'issues found', cls: 'border-[#FFD08A] bg-[#FFF3E0]' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.cls}`}>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold text-foreground/80">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Source type breakdown */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Sources by Type</h3>
          <div className="space-y-1">
            {SOURCE_TYPE_ORDER.filter(t => (summary.byType[t] ?? 0) > 0).map(type => {
              const cfg  = SOURCE_TYPE_CONFIG[type];
              const Icon = TYPE_ICONS[type];
              const srcs = sources.filter(s => s.type === type);
              return (
                <div key={type} className={`rounded-xl border p-3 ${cfg.cls}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <p className="text-[12px] font-bold text-foreground">{type}</p>
                    <span className="text-[10px] font-bold ml-auto">{srcs.length}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-1.5 leading-snug">{cfg.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {srcs.map(s => (
                      <div key={s.id} className="flex items-center gap-1 text-[9px] font-medium bg-white/60 border border-white/80 rounded-full px-1.5 py-0.5 text-foreground/70">
                        <HealthDot status={s.healthStatus} />
                        {s.shortName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust level model */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Trust Level Model</h3>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {(['Authoritative','Trusted','Curated','Unverified'] as TrustLevel[]).map((level, i) => {
              const cfg = TRUST_LEVEL_CONFIG[level];
              const count = sources.filter(s => s.trustLevel === level).length;
              return (
                <div key={level} className={`flex items-center gap-3 px-4 py-3 ${i < 3 ? 'border-b border-border' : ''}`}>
                  <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 w-24 text-center ${cfg.cls}`}>{level}</span>
                  <p className="text-[11px] text-muted-foreground flex-1">{cfg.description}</p>
                  <span className="text-[11px] font-bold text-foreground shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SF Knowledge taxonomy */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">Salesforce Knowledge Category Taxonomy</h3>
          <div className="space-y-2">
            {SF_KNOWLEDGE_CATEGORIES.map(cat => (
              <div key={cat.id} className="rounded-xl border border-[#7FAFC6] bg-[#EDF5F8] p-4">
                <p className="text-[12px] font-bold text-[#2F6F7E] mb-1">{cat.name}</p>
                <p className="text-[11px] text-[#2F6F7E] mb-2 leading-snug">{cat.description}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.subcategories.map(s => <span key={s} className="text-[10px] font-medium bg-white/70 border border-[#EDF5F8] rounded-full px-2 py-0.5 text-[#2F6F7E]">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* P1 integration priorities */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">P1 Integration Priorities</h3>
          <div className="space-y-2">
            {P1.map(s => {
              const tCfg = SOURCE_TYPE_CONFIG[s.type];
              const Icon = TYPE_ICONS[s.type];
              return (
                <div key={s.id} className="rounded-xl border border-border bg-white p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg border ${tCfg.cls}`}><Icon className="w-3.5 h-3.5" /></div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.futureIntegrationPath.split('—')[0].trim()}</p>
                  </div>
                  <HealthDot status={s.healthStatus} />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Catalog View ─────────────────────────────────────────────────────────────

function CatalogView({ onOpenBrief }: { onOpenBrief: (src: KnowledgeSource) => void }) {
  const { sources } = useContext(SourcesCtx);
  const [selectedId, setSelectedId] = useState('');
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState<SourceType | 'all'>('all');
  const [filterTrust, setFilterTrust] = useState<TrustLevel | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sources.filter(s =>
      (filterType  === 'all' || s.type       === filterType) &&
      (filterTrust === 'all' || s.trustLevel === filterTrust) &&
      (!q || s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q) || s.purpose.toLowerCase().includes(q))
    );
  }, [sources, search, filterType, filterTrust]);

  const activeId = selectedId || sources[0]?.id;
  const selected = sources.find(s => s.id === activeId) ?? sources[0];

  const grouped = useMemo(() => {
    const groups: Partial<Record<SourceType, KnowledgeSource[]>> = {};
    for (const src of filtered) {
      if (!groups[src.type]) groups[src.type] = [];
      groups[src.type]!.push(src);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[230px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources…" className="pl-7 h-7 text-[11px] bg-white" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value as SourceType | 'all')} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All source types</option>
            {SOURCE_TYPE_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterTrust} onChange={e => setFilterTrust(e.target.value as TrustLevel | 'all')} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All trust levels</option>
            {(['Authoritative','Trusted','Curated','Unverified'] as TrustLevel[]).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-[11px] text-center text-muted-foreground py-6">No sources match.</p>}
            {SOURCE_TYPE_ORDER.map(type => {
              const srcs = grouped[type] as KnowledgeSource[] | undefined;
              if (!srcs?.length) return null;
              return (
                <div key={type}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{type}</p>
                  {srcs.map(s => <SourceRow key={s.id} src={s} selected={activeId === s.id} onSelect={() => setSelectedId(s.id)} />)}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        <SourceDetail src={selected} onOpenBrief={() => onOpenBrief(selected)} />
      </div>
    </div>
  );
}

// ── Relationships View ────────────────────────────────────────────────────────

function RelationshipsView() {
  const { sources } = useContext(SourcesCtx);
  const [selectedId, setSelectedId] = useState('');
  const activeId = (selectedId || sources[0]?.id) ?? '';
  const src = sources.find(s => s.id === activeId);
  const typeCfg = src ? SOURCE_TYPE_CONFIG[src.type] : null;
  const Icon = src ? TYPE_ICONS[src.type] : null;
  const related = src ? sources.filter(s => src.relatedSources.includes(s.id)) : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Picker */}
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Select Source</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {SOURCE_TYPE_ORDER.map(type => {
              const srcs = sources.filter(s => s.type === type);
              if (!srcs.length) return null;
              return (
                <div key={type}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{type}</p>
                  {srcs.map(s => (
                    <button key={s.id} onClick={() => setSelectedId(s.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                        activeId === s.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      <HealthDot status={s.healthStatus} />
                      {s.shortName}
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
          {!src && <p className="text-[12px] text-muted-foreground py-8 text-center">Loading sources…</p>}
          {src && typeCfg && Icon && <>

          {/* Selected */}
          <div className={`rounded-xl border p-4 ${typeCfg.cls}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" />
              <p className="text-[13px] font-bold text-foreground">{src.name}</p>
              <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ml-auto ${TRUST_LEVEL_CONFIG[src.trustLevel].cls}`}>{src.trustLevel}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{src.description}</p>
          </div>

          {/* Relationship groups */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Related Programs',        items: src.relatedPrograms,           icon: BookOpen,    cls: 'border-primary/20 bg-primary/5 text-primary' },
              { label: 'SF Objects',              items: src.relatedSfObjects,          icon: Database,    cls: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]' },
              { label: 'Knowledge Categories',    items: src.relatedKnowledgeCategories,icon: Database,    cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]' },
              { label: 'Standards',               items: src.relatedStandards,          icon: ShieldCheck, cls: 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]' },
              { label: `${TERMS.aiAssistant} Capabilities`,      items: src.relatedPennyCapabilities.map(id => id.replace('cap-', '').replace(/-/g, ' ')), icon: Brain, cls: 'border-secondary/20 bg-secondary/5 text-secondary' },
              { label: 'Related Sources',         items: related.map(s => s.shortName), icon: Link2, cls: 'border-slate-200 bg-slate-50 text-slate-600' },
            ].map(({ label, items, icon: I, cls }) => (
              <div key={label} className={`rounded-xl border p-3 ${cls.split(' ').filter(c => !c.startsWith('text-')).join(' ')}`}>
                <div className={`flex items-center gap-1.5 mb-2 ${cls.split(' ').find(c => c.startsWith('text-'))}`}>
                  <I className="w-3.5 h-3.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
                  <span className="ml-auto text-[9px] font-bold">{items.length}</span>
                </div>
                {items.length === 0
                  ? <p className="text-[10px] text-muted-foreground/50 italic">None</p>
                  : <div className="flex flex-wrap gap-1">
                      {items.map(item => <span key={item} className="text-[10px] font-medium bg-white/70 border border-white rounded-full px-2 py-0.5 text-foreground/80 capitalize">{item}</span>)}
                    </div>
                }
              </div>
            ))}
          </div>

          {/* Related source cards */}
          {related.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-foreground mb-2">Connected Sources</p>
              <div className="space-y-2">
                {related.map(r => {
                  const rCfg = SOURCE_TYPE_CONFIG[r.type];
                  const RIcon = TYPE_ICONS[r.type];
                  return (
                    <div key={r.id} className="rounded-xl border border-border bg-white p-3 flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg border ${rCfg.cls}`}><RIcon className="w-3.5 h-3.5" /></div>
                      <div className="flex-1">
                        <p className="text-[12px] font-bold text-foreground">{r.shortName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.type}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HealthDot status={r.healthStatus} />
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${TRUST_LEVEL_CONFIG[r.trustLevel].cls}`}>{r.trustLevel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Penny Retrieval Map View ──────────────────────────────────────────────────

function RetrievalMapView() {
  const { sources } = useContext(SourcesCtx);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const entry = pennyRetrievalMap[selectedIdx];

  const roleConfig = {
    Primary:   { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',    num: 'bg-[#2F6B3F]' },
    Secondary: { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       num: 'bg-[#2F6F7E]' },
    Fallback:  { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',    num: 'bg-[#CC8400]' },
    Context:   { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', num: 'bg-[#2F6F7E]' },
  };

  const confidenceConfig = {
    High:   'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
    Medium: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    Low:    'text-slate-600 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Capability picker */}
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{TERMS.aiAssistant} Capability</p>
        </div>
        <div className="p-2 space-y-1">
          {pennyRetrievalMap.map((e, i) => (
            <button key={e.capabilityId} onClick={() => setSelectedIdx(i)}
              className={`w-full text-left px-2.5 py-2.5 rounded-lg text-[11px] font-medium transition-all ${
                selectedIdx === i ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <p className="font-bold">{e.capabilityName}</p>
              <p className={`text-[9px] mt-0.5 ${selectedIdx === i ? 'text-background/60' : 'text-muted-foreground/60'}`}>{e.capabilityDomain}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5 max-w-2xl">

          {/* Header */}
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-secondary" />
              <p className="text-[13px] font-bold text-foreground">{entry.capabilityName}</p>
              <span className="text-[10px] font-bold text-secondary border border-secondary/20 rounded-full px-2 py-0.5 ml-auto">{entry.capabilityDomain}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.retrievalNote}</p>
          </div>

          {/* Role legend */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['Primary','Secondary','Context','Fallback'] as const).map(role => (
              <span key={role} className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${roleConfig[role].cls}`}>{role}</span>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">— retrieval role</span>
          </div>

          {/* Retrieval steps */}
          <div className="space-y-3">
            {entry.retrievalSteps.map((step) => {
              const src   = sources.find(s => s.id === step.sourceId);
              if (!src) return null;
              const rCfg  = roleConfig[step.role];
              const SIcon = TYPE_ICONS[src.type];
              const tCfg  = SOURCE_TYPE_CONFIG[src.type];
              const cCfg  = confidenceConfig[step.confidenceImpact];
              return (
                <div key={step.sourceId} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-start gap-3">
                    {/* Step number */}
                    <span className={`w-6 h-6 rounded-full ${rCfg.num} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>{step.order}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className={`flex items-center gap-1 text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${tCfg.cls}`}>
                          <SIcon className="w-3 h-3" />
                          {src.shortName}
                        </div>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${rCfg.cls}`}>{step.role}</span>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${cCfg}`}>Confidence: {step.confidenceImpact}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{step.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <HealthDot status={src.healthStatus} />
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${src.approvedForPenny ? 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' : 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'}`}>
                        {src.approvedForPenny ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Source readiness summary */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold text-foreground mb-2">Source Readiness for this Capability</p>
            <div className="space-y-1.5">
              {entry.retrievalSteps.map(step => {
                const src = sources.find(s => s.id === step.sourceId);
                if (!src) return null;
                const issues = src.healthIssues.length;
                return (
                  <div key={step.sourceId} className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-foreground w-28 truncate">{src.shortName}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full ${src.healthStatus === 'Healthy' ? 'bg-[#2F6B3F]' : src.healthStatus === 'Warning' ? 'bg-[#FFF3E0]0' : src.healthStatus === 'Critical' ? 'bg-[#FBEAE6]0' : 'bg-slate-300'}`}
                        style={{ width: src.healthStatus === 'Healthy' ? '100%' : src.healthStatus === 'Warning' ? '60%' : src.healthStatus === 'Critical' ? '20%' : '5%' }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground w-20 text-right">{issues > 0 ? `${issues} issue${issues > 1 ? 's' : ''}` : 'No issues'}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// ── Governance View ───────────────────────────────────────────────────────────

function GovernanceView() {
  const { sources, summary } = useContext(SourcesCtx);
  const [filterApproved, setFilterApproved] = useState<'all' | 'yes' | 'no'>('all');

  const filtered = filterApproved === 'all' ? sources
    : filterApproved === 'yes' ? sources.filter(s => s.approvedForPenny)
    : sources.filter(s => !s.approvedForPenny);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-white">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
          <p className="text-[11px] font-semibold text-primary">
            {summary.approvedForPenny} approved for {TERMS.aiAssistant} · {summary.total - summary.approvedForPenny} pending or restricted
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterApproved} onChange={e => setFilterApproved(e.target.value as any)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All sources</option>
            <option value="yes">{TERMS.aiAssistant} approved</option>
            <option value="no">Not approved</option>
          </select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px_80px_80px_80px] gap-2 px-3 py-1.5">
            {['Source', 'Owner', 'Last Review', 'Trust', 'Sync', TERMS.aiAssistant].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</p>
            ))}
          </div>
          {filtered.map(s => {
            const tCfg    = SOURCE_TYPE_CONFIG[s.type];
            const trCfg   = TRUST_LEVEL_CONFIG[s.trustLevel];
            const synCfg  = SYNC_STATUS_CONFIG[s.syncStatus];
            return (
              <div key={s.id} className="grid grid-cols-[1fr_100px_100px_80px_80px_80px] gap-2 px-3 py-3 rounded-lg border border-border bg-white hover:bg-muted/20 transition-colors items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <HealthDot status={s.healthStatus} />
                    <p className="text-[12px] font-semibold text-foreground truncate">{s.shortName}</p>
                  </div>
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${tCfg.cls}`}>{s.type}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{s.owner}</p>
                <p className="text-[11px] text-muted-foreground">{s.lastReviewDate}</p>
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 text-center ${trCfg.cls}`}>{s.trustLevel.slice(0,5)}</span>
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 text-center ${synCfg.cls}`}>{synCfg.label.split(' ')[0]}</span>
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 text-center ${s.approvedForPenny ? 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' : 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'}`}>
                  {s.approvedForPenny ? '✓ Yes' : '✗ No'}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Health View ───────────────────────────────────────────────────────────────

function HealthView() {
  const { sources, summary } = useContext(SourcesCtx);

  type IssueCategory = 'Missing Owner' | 'Stale Review' | 'Disconnected' | 'Unapproved Penny' | 'Missing LMS Link' | 'Unmapped Category' | 'Future Source';

  interface FlatIssue {
    sourceId: string;
    sourceName: string;
    sourceType: SourceType;
    severity: 'Critical' | 'Warning' | 'Info';
    issue: string;
    category: IssueCategory;
  }

  const issues: FlatIssue[] = [];
  for (const s of sources) {
    for (const issue of s.healthIssues) {
      const severity = s.healthStatus === 'Critical' ? 'Critical' : 'Warning';
      let category: IssueCategory = 'Unapproved Penny';
      if (issue.toLowerCase().includes('drive') || issue.toLowerCase().includes('connected')) category = 'Disconnected';
      else if (issue.toLowerCase().includes('owner')) category = 'Missing Owner';
      else if (issue.toLowerCase().includes('review') || issue.toLowerCase().includes('stale')) category = 'Stale Review';
      else if (issue.toLowerCase().includes('lms') || issue.toLowerCase().includes('relationship')) category = 'Missing LMS Link';
      else if (issue.toLowerCase().includes('category') || issue.toLowerCase().includes('mapping') || issue.toLowerCase().includes('mapped')) category = 'Unmapped Category';
      else if (issue.toLowerCase().includes('not yet') || issue.toLowerCase().includes('future') || issue.toLowerCase().includes('pending')) category = 'Future Source';
      issues.push({ sourceId: s.id, sourceName: s.shortName, sourceType: s.type, severity, issue, category });
    }
  }

  const categoryCls: Record<IssueCategory, string> = {
    'Missing Owner':     'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',
    'Stale Review':      'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    'Disconnected':      'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',
    'Unapproved Penny':  'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    'Missing LMS Link':  'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',
    'Unmapped Category': 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',
    'Future Source':     'text-slate-500 bg-slate-50 border-slate-200',
  };

  const categoryCounts = issues.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<IssueCategory, number>>);

  const [filterCat, setFilterCat] = useState<IssueCategory | 'all'>('all');
  const [filterSev, setFilterSev] = useState<'all' | 'Critical' | 'Warning'>('all');

  const filtered = issues.filter(i =>
    (filterCat === 'all' || i.category === filterCat) &&
    (filterSev === 'all' || i.severity === filterSev)
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3 flex-shrink-0 bg-white flex-wrap">
        <div className="flex items-center gap-2">
          {[
            { label: `${issues.filter(i => i.severity === 'Critical').length} Critical`, cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
            { label: `${issues.filter(i => i.severity === 'Warning').length} Warnings`,  cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
            { label: `${summary.healthy} Healthy`,                                cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' },
          ].map(b => (
            <span key={b.label} className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${b.cls}`}>{b.label}</span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All categories</option>
            {Object.entries(categoryCounts).map(([cat, count]) => <option key={cat} value={cat}>{cat} ({count})</option>)}
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value as any)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All severity</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
          </select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-2">

          {/* Issue type breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(Object.entries(categoryCounts) as [IssueCategory, number][]).map(([cat, count]) => (
              <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
                className={`rounded-lg border p-2.5 text-left transition-all ${filterCat === cat ? 'ring-2 ring-foreground' : ''} ${categoryCls[cat]}`}
              >
                <p className="text-xl font-bold">{count}</p>
                <p className="text-[10px] font-semibold">{cat}</p>
              </button>
            ))}
          </div>

          {filtered.length === 0 && <p className="text-center text-muted-foreground text-[12px] py-8">No issues match the filter.</p>}

          {filtered.map((issue, i) => {
            const tCfg = SOURCE_TYPE_CONFIG[issue.sourceType];
            const SIcon = TYPE_ICONS[issue.sourceType];
            return (
              <div key={i} className={`rounded-xl border p-3 ${issue.severity === 'Critical' ? 'border-[#E8B9B4] bg-[#FBEAE6]' : 'border-[#FFD08A] bg-[#FFF3E0]'}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${issue.severity === 'Critical' ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={`flex items-center gap-1 text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${tCfg.cls}`}>
                        <SIcon className="w-3 h-3" />
                        {issue.sourceName}
                      </div>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${categoryCls[issue.category]}`}>{issue.category}</span>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${issue.severity === 'Critical' ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' : 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]'}`}>{issue.severity}</span>
                    </div>
                    <p className={`text-[11px] leading-snug ${issue.severity === 'Critical' ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`}>{issue.issue}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function KnowledgeSourceRegistry() {
  const { setSelectedItem, openActionPanel } = useAppContext();
  const [view, setView] = useState<RegistryView>('overview');
  const { sources, summary } = useKnowledgeSources();

  const totalIssues = sources.reduce((acc, s) => acc + s.healthIssues.length, 0);

  function openBrief(src: KnowledgeSource) {
    setSelectedItem({ type: 'knowledgeSource', id: src.id, data: src });
  }

  function handleAddSource() {
    openActionPanel({
      title: 'Add Knowledge Source', objectType: 'Knowledge Source',
      subtitle: 'Register a new trusted knowledge source. Appears in the Source Catalog with Draft/Unvalidated status.',
      fields: [
        { id: 'name',        label: 'Source Name',          type: 'text',     required: true, placeholder: 'e.g. Transition Trails Program Guide — Google Drive' },
        { id: 'type',        label: 'Source Type',          type: 'select',   options: ['Salesforce Knowledge', 'Google Drive', 'LMS Content', 'Assessments', 'Standards Studio', 'Curriculum Studio', 'Penny Generated', 'Slack History', 'Google Chat History', 'Calendar Events'], required: true },
        { id: 'trustLevel',  label: 'Trust Level',          type: 'select',   options: ['Authoritative', 'Reference', 'Supplementary', 'Unverified'] },
        { id: 'description', label: 'Description',          type: 'textarea', placeholder: `What does this source contain and how should ${TERMS.aiAssistant} use it?`, rows: 3 },
        { id: 'sourceUrl',   label: 'Source URL / ID',      type: 'text',     placeholder: 'e.g. Google Drive folder ID, Salesforce category name' },
        { id: 'syncCadence', label: 'Sync Cadence',         type: 'select',   options: ['Real-time', 'Daily', 'Weekly', 'Manual', 'Not Synced'] },
        { id: 'usedByPenny', label: `Available to ${TERMS.aiAssistant}`,   type: 'select',   options: ['Yes — approved', 'Pending review', 'No — not approved'] },
      ],
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0 bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
          Knowledge Library — Source Registry
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Knowledge Source Registry</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Where trusted information comes from — and how {TERMS.aiAssistant} uses it. {summary.total} sources across {SOURCE_TYPE_ORDER.filter(t => (summary.byType[t] ?? 0) > 0).length} types.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAddSource}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Source
            </button>
            {totalIssues > 0 && (
              <span className="text-[11px] font-semibold text-[#CC8400] border border-[#FFD08A] bg-[#FFF3E0] rounded-full px-3 py-1">
                {totalIssues} issues
              </span>
            )}
            <span className="text-[11px] font-semibold text-[#2F6B3F] border border-[#9FC3AE] bg-[#E6F0EA] rounded-full px-3 py-1">
              {summary.approvedForPenny} {TERMS.aiAssistant}-approved
            </span>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <ViewTab label="Overview"           icon={Network}    active={view === 'overview'}      onClick={() => setView('overview')} />
          <ViewTab label="Source Catalog"     icon={Database}   active={view === 'catalog'}       count={summary.total} onClick={() => setView('catalog')} />
          <ViewTab label="Relationships"      icon={GitBranch}  active={view === 'relationships'} onClick={() => setView('relationships')} />
          <ViewTab label={`${TERMS.aiAssistant} Retrieval Map`} icon={Brain}     active={view === 'retrieval-map'} count={pennyRetrievalMap.length} onClick={() => setView('retrieval-map')} />
          <ViewTab label="Governance"         icon={ShieldCheck}active={view === 'governance'}    onClick={() => setView('governance')} />
          <ViewTab label="Source Health"      icon={Activity}   active={view === 'health'}        count={totalIssues} onClick={() => setView('health')} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <SourcesCtx.Provider value={{ sources, summary }}>
          {view === 'overview'       && <OverviewView />}
          {view === 'catalog'        && <CatalogView onOpenBrief={openBrief} />}
          {view === 'relationships'  && <RelationshipsView />}
          {view === 'retrieval-map'  && <RetrievalMapView />}
          {view === 'governance'     && <GovernanceView />}
          {view === 'health'         && <HealthView />}
        </SourcesCtx.Provider>
      </div>
    </div>
  );
}
