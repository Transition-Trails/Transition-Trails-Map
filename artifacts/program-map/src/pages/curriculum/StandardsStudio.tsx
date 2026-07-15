import { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import {
  contentStandards, gapReportItems,
  STANDARDS_SUMMARY, GAP_SUMMARY,
  STANDARD_STATUS_CONFIG, STANDARD_CONFIDENCE_CONFIG,
  STANDARD_CATEGORY_CONFIG, GAP_TYPE_CONFIG,
  type ContentStandard, type StandardCategory, type GapType,
} from '@/data/standardsData';
import {
  BookCheck, ShieldCheck, ClipboardList, AlertTriangle,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Layers, BookOpen, Brain, Zap, Search, Filter, Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';


// ── Types ──────────────────────────────────────────────────────────────────

type StudioView = 'overview' | 'standards' | 'checklist' | 'gap-report' | 'create';

const CATEGORY_ICONS: Record<StandardCategory, typeof BookOpen> = {
  'Program Architecture': Layers,
  'Learning Content':     BookOpen,
  'Penny Assets':         Brain,
  'Delivery Assets':      Zap,
};

const CATEGORY_ORDER: StandardCategory[] = [
  'Program Architecture', 'Learning Content', 'Penny Assets', 'Delivery Assets',
];

// ── Subcomponents ──────────────────────────────────────────────────────────

function ViewTab({
  id, label, icon: Icon, active, count, onClick,
}: {
  id: StudioView; label: string; icon: typeof BookCheck;
  active: boolean; count?: number; onClick: () => void;
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
        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0 ${active ? 'bg-background/20' : 'bg-muted'}`}>{count}</span>
      )}
    </button>
  );
}

function StandardRow({
  std, selected, onSelect,
}: {
  std: ContentStandard; selected: boolean; onSelect: () => void;
}) {
  const catCfg = STANDARD_CATEGORY_CONFIG[std.category];
  const statusCfg = STANDARD_STATUS_CONFIG[std.status];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-white border-border hover:border-foreground/20 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[12px] font-bold leading-snug ${selected ? 'text-background' : 'text-foreground'}`}>{std.name}</p>
          <p className={`text-[10px] mt-0.5 truncate ${selected ? 'text-background/60' : 'text-muted-foreground'}`}>{std.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : statusCfg.cls}`}>{statusCfg.label}</span>
          <span className={`text-[9px] font-medium ${selected ? 'text-background/50' : 'text-muted-foreground/60'}`}>{std.pennyChecks.length} checks</span>
        </div>
      </div>
    </button>
  );
}

function StandardDetail({ std, onOpenBrief }: { std: ContentStandard; onOpenBrief: () => void }) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['fields', 'criteria']));
  const statusCfg   = STANDARD_STATUS_CONFIG[std.status];
  const confidenceCfg = STANDARD_CONFIDENCE_CONFIG[std.confidence];
  const catCfg      = STANDARD_CATEGORY_CONFIG[std.category];

  function toggleSection(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const open = openSections.has(id);
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{label}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {open && <div className="p-3">{children}</div>}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Content Standard</p>
              <h3 className="text-lg font-bold text-foreground">{std.name}</h3>
            </div>
            <button
              onClick={onOpenBrief}
              className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5 shrink-0"
            >
              Trail Insights
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${catCfg.cls}`}>{std.category}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${confidenceCfg.cls}`}>{confidenceCfg.label}</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Purpose</p>
          <p className="text-[12px] text-foreground leading-relaxed">{std.purpose}</p>
        </div>

        {/* Why it matters */}
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Why It Matters</p>
          <p className="text-[11px] text-amber-900 leading-relaxed">{std.whyItMatters}</p>
        </div>

        {/* Required Fields */}
        <Section id="fields" label={`Required Fields (${std.requiredFields.length})`}>
          <div className="space-y-1.5">
            {std.requiredFields.map(f => (
              <div key={f.field} className="flex items-start gap-2">
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${f.required ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                  {f.required ? 'Req' : 'Opt'}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{f.field}</p>
                  <p className="text-[10px] text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Quality Criteria */}
        <Section id="criteria" label="Quality Criteria">
          <div className="space-y-1.5">
            {std.qualityCriteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground">{c}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Penny Checks */}
        <Section id="checks" label={`${TERMS.aiAssistant} Checks (${std.pennyChecks.length})`}>
          <div className="space-y-2">
            {std.pennyChecks.map(chk => (
              <div key={chk.id} className="rounded border border-border bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${chk.required ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{chk.required ? 'Required' : 'Optional'}</span>
                  <p className="text-[11px] font-semibold text-foreground">{chk.check}</p>
                </div>
                <div className="grid grid-cols-1 gap-1 pl-1">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">{chk.passing}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">{chk.failing}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Example Output */}
        <Section id="example" label="Example Output">
          <div className="rounded-lg border border-secondary/15 bg-secondary/5 p-3">
            <p className="text-[11px] text-foreground/80 italic leading-relaxed">{std.exampleOutput}</p>
          </div>
        </Section>

        {/* How Penny Uses It */}
        <Section id="penny" label="How Penny Uses This Standard">
          <p className="text-[11px] text-foreground leading-relaxed">{std.howPennyUsesIt}</p>
        </Section>

        {/* Mappings */}
        <Section id="mappings" label="Salesforce & LMS Mapping">
          <div className="space-y-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
              <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider mb-0.5">Salesforce</p>
              <p className="text-[11px] text-blue-900">{std.sfMapping}</p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5">
              <p className="text-[9px] font-bold text-violet-700 uppercase tracking-wider mb-0.5">LMS</p>
              <p className="text-[11px] text-violet-900">{std.lmsMapping}</p>
            </div>
          </div>
        </Section>

        {/* Meta */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div><span className="text-muted-foreground">Owner</span><p className="font-semibold text-foreground">{std.owner}</p></div>
          <div><span className="text-muted-foreground">Review Cycle</span><p className="font-semibold text-foreground">{std.reviewCycle}</p></div>
          <div><span className="text-muted-foreground">Knowledge Category</span><p className="font-semibold text-foreground">{std.relatedKnowledgeCategory}</p></div>
          <div>
            <span className="text-muted-foreground">Related Objects</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {std.relatedContentObjects.map(o => (
                <span key={o} className="text-[9px] font-medium border border-border bg-white rounded-full px-1.5 py-0.5 text-muted-foreground">{o}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Overview View ──────────────────────────────────────────────────────────

function OverviewView({ onNavigate }: { onNavigate: (view: StudioView, stdId?: string) => void }) {
  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    standards: contentStandards.filter(s => s.category === cat),
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-6 max-w-3xl">

        {/* Hero */}
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-8 h-8 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[15px] font-bold text-foreground mb-1">What Are Standards?</h2>
              <p className="text-[12px] text-foreground/80 leading-relaxed mb-3">
                Standards are the rulebook Penny uses to create, review, and improve Transition Trails curriculum content consistently.
                Every content object — from a Module to a Calendar Reminder — has a defined standard that specifies required fields,
                quality criteria, and how Penny uses it.
              </p>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                The <strong>Program Blueprint</strong> is the design standard — it defines what every program <em>should</em> contain.
                <strong> Foundations Trail</strong> is the reference implementation — the first program fully built to this standard, showing what <em>does</em> exist.
                These standards ensure Penny can serve every learner with consistent coaching quality across all programs.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Standards', value: STANDARDS_SUMMARY.total, sub: 'defined', cls: 'border-foreground/20 bg-foreground/5' },
            { label: 'Active',    value: STANDARDS_SUMMARY.byStatus.active, sub: 'live', cls: 'border-green-200 bg-green-50' },
            { label: `${TERMS.aiAssistant} Checks`, value: STANDARDS_SUMMARY.totalChecks, sub: 'total', cls: 'border-secondary/20 bg-secondary/5' },
            { label: 'Required Checks', value: STANDARDS_SUMMARY.requiredChecks, sub: 'must-pass', cls: 'border-rose-200 bg-rose-50' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-lg border p-3 text-center ${stat.cls}`}>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] font-semibold text-foreground/80">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* How standards work */}
        <div>
          <h3 className="text-[13px] font-bold text-foreground mb-3">How Standards Work</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Author creates content', desc: 'Curriculum authors use the required fields list as a checklist while writing modules, lessons, prompts, or delivery assets.' },
              { step: '2', title: `${TERMS.aiAssistant} audits with checklist`, desc: `Before publishing, ${TERMS.aiAssistant} runs the Standards Checklist against each content object — flagging missing fields and quality issues.` },
              { step: '3', title: 'Gap Report surfaces issues', desc: 'The Standards Gap Report shows all open gaps in the reference implementation and all programs, sorted by severity, so teams can prioritise fixes before the next cohort.' },
            ].map(s => (
              <div key={s.step} className="rounded-lg border border-border bg-white p-3">
                <div className="w-6 h-6 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center mb-2">{s.step}</div>
                <p className="text-[11px] font-bold text-foreground mb-1">{s.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Standards by category */}
        {byCategory.map(({ cat, standards }) => {
          const Icon = CATEGORY_ICONS[cat];
          const catCfg = STANDARD_CATEGORY_CONFIG[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[12px] font-bold text-foreground">{cat}</h3>
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.cls}`}>{standards.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {standards.map(std => {
                  const statusCfg = STANDARD_STATUS_CONFIG[std.status];
                  return (
                    <button
                      key={std.id}
                      onClick={() => onNavigate('standards', std.id)}
                      className="text-left rounded-lg border border-border bg-white hover:border-foreground/20 hover:bg-muted/20 p-3 transition-all"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-[12px] font-bold text-foreground">{std.name}</p>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ml-1 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{std.purpose}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-muted-foreground/70">{std.pennyChecks.length} checks · Owner: {std.owner}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* CTA row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('checklist')}
            className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-left hover:bg-secondary/10 transition-colors"
          >
            <ClipboardList className="w-5 h-5 text-secondary mb-2" />
            <p className="text-[12px] font-bold text-foreground mb-1">Standards Checklist</p>
            <p className="text-[11px] text-muted-foreground">{TERMS.aiAssistant}'s audit tool — run all required checks against any content object.</p>
          </button>
          <button
            onClick={() => onNavigate('gap-report')}
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-left hover:bg-rose-100 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 mb-2" />
            <p className="text-[12px] font-bold text-foreground mb-1">Gap Report</p>
            <p className="text-[11px] text-muted-foreground">{GAP_SUMMARY.bySeverity.high} high-severity gaps across all programs require attention before the next cohort.</p>
          </button>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Standards Browser View ─────────────────────────────────────────────────

function StandardsBrowserView({
  initialStdId, onOpenBrief,
}: {
  initialStdId?: string;
  onOpenBrief: (std: ContentStandard) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(initialStdId ?? contentStandards[0].id);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<StandardCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contentStandards.filter(s => {
      const matchesCat = filterCat === 'all' || s.category === filterCat;
      const matchesQ   = !q || s.name.toLowerCase().includes(q) || s.purpose.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [search, filterCat]);

  const selected = contentStandards.find(s => s.id === selectedId) ?? contentStandards[0];

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search standards…"
              className="pl-7 h-7 text-[11px] bg-white"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as StandardCategory | 'all')}
            className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2"
          >
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-[11px] text-muted-foreground text-center py-6">No standards match.</p>
            )}
            {CATEGORY_ORDER.map(cat => {
              const catStds = filtered.filter(s => s.category === cat);
              if (catStds.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{cat}</p>
                  {catStds.map(std => (
                    <StandardRow key={std.id} std={std} selected={selectedId === std.id} onSelect={() => setSelectedId(std.id)} />
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-hidden">
        <StandardDetail std={selected} onOpenBrief={() => onOpenBrief(selected)} />
      </div>
    </div>
  );
}

// ── Checklist View ─────────────────────────────────────────────────────────

type CheckState = 'pass' | 'fail' | 'unchecked';

function ChecklistView() {
  const [states, setStates] = useState<Record<string, CheckState>>({});
  const [filterType, setFilterType] = useState<string>('all');

  const objectTypes = Array.from(new Set(contentStandards.map(s => s.objectType)));

  const shownStandards = filterType === 'all'
    ? contentStandards
    : contentStandards.filter(s => s.objectType === filterType);

  function cycle(id: string) {
    setStates(prev => {
      const cur = prev[id] ?? 'unchecked';
      return { ...prev, [id]: cur === 'unchecked' ? 'pass' : cur === 'pass' ? 'fail' : 'unchecked' };
    });
  }

  const allChecks = shownStandards.flatMap(s => s.pennyChecks.map(c => ({ ...c, stdId: s.id })));
  const passCount  = allChecks.filter(c => states[c.id] === 'pass').length;
  const failCount  = allChecks.filter(c => states[c.id] === 'fail').length;
  const total      = allChecks.length;

  const pct = total === 0 ? 0 : Math.round((passCount / total) * 100);

  function resetAll() { setStates({}); }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Filter:</span>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setStates({}); }}
              className="h-7 text-[11px] rounded-md border border-input bg-white px-2"
            >
              <option value="all">All object types</option>
              {objectTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-muted-foreground">{total} checks · Click to cycle: → ✓ Pass → ✗ Fail → unchecked</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-green-700">{passCount} pass</span>
              <span className="text-[11px] font-semibold text-rose-600">{failCount} fail</span>
              <span className="text-[11px] text-muted-foreground">{pct}% complete</span>
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <button onClick={resetAll} className="text-[10px] font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-1 hover:bg-muted transition-colors">Reset</button>
        </div>
      </div>

      {/* Checks */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {shownStandards.map(std => {
            const catCfg = STANDARD_CATEGORY_CONFIG[std.category];
            const stdChecks = std.pennyChecks;
            const stdPass   = stdChecks.filter(c => states[c.id] === 'pass').length;
            const stdFail   = stdChecks.filter(c => states[c.id] === 'fail').length;
            return (
              <div key={std.id} className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] font-bold text-foreground">{std.name}</span>
                    <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.cls}`}>{std.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stdPass > 0 && <span className="text-[10px] font-semibold text-green-700">{stdPass} pass</span>}
                    {stdFail > 0 && <span className="text-[10px] font-semibold text-rose-600">{stdFail} fail</span>}
                    <span className="text-[10px] text-muted-foreground">{stdChecks.length} checks</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {stdChecks.map(chk => {
                    const state = states[chk.id] ?? 'unchecked';
                    return (
                      <button
                        key={chk.id}
                        onClick={() => cycle(chk.id)}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-muted/20 transition-colors ${
                          state === 'pass' ? 'bg-green-50/50' : state === 'fail' ? 'bg-rose-50/50' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          state === 'pass' ? 'bg-green-500 border-green-500'
                            : state === 'fail' ? 'bg-rose-500 border-rose-500'
                            : 'bg-white border-muted-foreground/30'
                        }`}>
                          {state === 'pass' && <CheckCircle2 className="w-3 h-3 text-white" />}
                          {state === 'fail' && <XCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[12px] font-semibold text-foreground">{chk.check}</p>
                            {chk.required && <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5">Required</span>}
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="flex items-start gap-1">
                              <span className="text-[9px] font-bold text-green-600 uppercase shrink-0 mt-0.5">✓</span>
                              <p className="text-[10px] text-muted-foreground">{chk.passing}</p>
                            </div>
                            <div className="flex items-start gap-1">
                              <span className="text-[9px] font-bold text-rose-500 uppercase shrink-0 mt-0.5">✗</span>
                              <p className="text-[10px] text-muted-foreground">{chk.failing}</p>
                            </div>
                          </div>
                        </div>
                      </button>
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

// ── Gap Report View ────────────────────────────────────────────────────────

function GapReportView() {
  const [filterType, setFilterType] = useState<GapType | 'all'>('all');
  const [filterSev, setFilterSev] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() =>
    gapReportItems.filter(g =>
      (filterType === 'all' || g.gapType === filterType) &&
      (filterSev  === 'all' || g.severity === filterSev)
    ), [filterType, filterSev]);

  const sevCls: Record<string, string> = {
    high:   'text-rose-700 bg-rose-50 border-rose-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low:    'text-slate-600 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: `${GAP_SUMMARY.bySeverity.high} High`, cls: 'text-rose-700 bg-rose-50 border-rose-200' },
            { label: `${GAP_SUMMARY.bySeverity.medium} Medium`, cls: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: `${GAP_SUMMARY.bySeverity.low} Low`, cls: 'text-slate-600 bg-slate-50 border-slate-200' },
          ].map(s => (
            <span key={s.label} className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${s.cls}`}>{s.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as GapType | 'all')} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All gap types</option>
            {(Object.keys(GAP_TYPE_CONFIG) as GapType[]).map(t => <option key={t} value={t}>{GAP_TYPE_CONFIG[t].label}</option>)}
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value as 'all' | 'high' | 'medium' | 'low')} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All severities</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
          </select>
          <span className="text-[11px] text-muted-foreground">{filtered.length} gaps</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-[12px] font-semibold text-foreground">No gaps match the current filters.</p>
            </div>
          )}
          {filtered.map(gap => {
            const typeCfg = GAP_TYPE_CONFIG[gap.gapType];
            const isOpen  = expanded === gap.id;
            const std     = contentStandards.find(s => s.id === gap.standardId);
            return (
              <div key={gap.id} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-foreground/20' : 'border-border bg-white hover:border-foreground/15'}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : gap.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                >
                  <div className={`text-[16px] shrink-0 mt-0.5`}>{typeCfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate">{gap.objectName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground font-medium">{gap.objectType}</span>
                          {gap.sprint && <><span className="text-muted-foreground/40">·</span><span className="text-[10px] text-muted-foreground">{gap.sprint}</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${typeCfg.cls}`}>{typeCfg.label}</span>
                        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${sevCls[gap.severity]}`}>{gap.severity}</span>
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20 pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Gap Description</p>
                      <p className="text-[12px] text-foreground leading-relaxed">{gap.gapDescription}</p>
                    </div>
                    <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                      <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Suggested Action</p>
                      <p className="text-[11px] text-foreground leading-relaxed">{gap.suggestedAction}</p>
                    </div>
                    {std && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Standard: <strong className="text-foreground">{std.name}</strong> · Owner: {std.owner} · Review: {std.reviewCycle}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function StandardsStudio() {
  const { setSelectedItem, openActionPanel } = useAppContext();
  const [view, setView]      = useState<StudioView>('overview');
  const [initialStdId, setInitialStdId] = useState<string | undefined>(undefined);

  function navigateTo(v: StudioView, stdId?: string) {
    setView(v);
    if (stdId) setInitialStdId(stdId);
  }

  function openBrief(std: ContentStandard) {
    setSelectedItem({ type: 'contentStandard', id: std.id, data: std });
  }

  function handleNewStandard() {
    openActionPanel({
      title: 'New Content Standard', objectType: 'Content Standard',
      subtitle: `Define a new quality rule that ${TERMS.aiAssistant} will use to create, review, and improve curriculum content.`,
      fields: [
        { id: 'title',       label: 'Standard Title',   type: 'text',     required: true, placeholder: 'e.g. Lesson Learning Objectives Format' },
        { id: 'category',    label: 'Category',          type: 'select',   options: ['Program Architecture', 'Learning Content', 'Penny AI', 'Assessments', 'Delivery'], required: true },
        { id: 'rule',        label: 'The Rule',          type: 'textarea', required: true, placeholder: 'State the standard as a clear, actionable rule…', rows: 4 },
        { id: 'rationale',   label: 'Rationale',         type: 'textarea', placeholder: 'Why does this standard exist?', rows: 2 },
        { id: 'goodExample', label: 'Good Example',      type: 'textarea', placeholder: 'A concrete example that meets this standard…', rows: 2 },
        { id: 'badExample',  label: 'Counter-Example',   type: 'textarea', placeholder: 'An example that violates this standard…', rows: 2 },
        { id: 'applies',     label: 'Applies To',        type: 'select',   options: ['All Content', 'Lessons', 'Modules', 'Assessments', 'Penny Prompts', 'Program Overviews'] },
      ],
      onSaveAndView: () => navigateTo('standards'),
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0 bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
          Programs · Standards
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-snug">Standards Studio</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              The rulebook Penny uses to create, review, and improve curriculum content consistently.
            </p>
          </div>
          {view === 'gap-report' && (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-[11px] font-bold text-rose-700">{GAP_SUMMARY.bySeverity.high} high-severity gaps</span>
            </div>
          )}
          <button
            onClick={handleNewStandard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Standard
          </button>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 mt-3">
          <ViewTab id="overview"   label="Overview"   icon={BookCheck}     active={view === 'overview'}   onClick={() => navigateTo('overview')} />
          <ViewTab id="standards"  label="Standards"  icon={ShieldCheck}   active={view === 'standards'}  count={STANDARDS_SUMMARY.total} onClick={() => navigateTo('standards')} />
          <ViewTab id="checklist"  label="Checklist"  icon={ClipboardList} active={view === 'checklist'}  count={STANDARDS_SUMMARY.requiredChecks} onClick={() => navigateTo('checklist')} />
          <ViewTab id="gap-report" label="Gap Report" icon={AlertTriangle} active={view === 'gap-report'} count={GAP_SUMMARY.total} onClick={() => navigateTo('gap-report')} />
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {view === 'create' && <OverviewView onNavigate={navigateTo} />}
        {view === 'overview'    && <OverviewView onNavigate={navigateTo} />}
        {view === 'standards'   && <StandardsBrowserView initialStdId={initialStdId} onOpenBrief={openBrief} />}
        {view === 'checklist'   && <ChecklistView />}
        {view === 'gap-report'  && <GapReportView />}
      </div>
    </div>
  );
}
