import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { useAppContext } from '@/context/AppContext';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { usePromptVariables } from '@/hooks/usePromptVariables';
import {
  promptTemplates, promptVariables, outputFormats, versionHistory, qualityReviews,
  PROMPT_STUDIO_SUMMARY, DOMAIN_ORDER, DOMAIN_CLS,
  PROMPT_STATUS_CONFIG, RISK_CONFIG,
  type PromptTemplate, type PromptDomain, type PromptStatus,
  type PromptVariable, type VariableType, type VariableSource,
} from '@/data/pennyPromptStudioData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

import {
  Brain, BookOpen, Layers, ShieldCheck, Database, Search, Filter,
  ChevronDown, ChevronRight, ArrowRight, AlertTriangle, CheckCircle2,
  Zap, Clock, Star, GitBranch, FlaskConical, ClipboardCheck, BarChart3,
  Play, RotateCcw, Users, FileText, Plus, Hash, Loader2, Pencil,
} from 'lucide-react';

type StudioView = 'library' | 'templates' | 'variables' | 'source-rules' | 'formats' | 'test-bench' | 'history' | 'quality' | 'create';

// ── Tab ────────────────────────────────────────────────────────────────────

function ViewTab({ label, icon: Icon, active, count, onClick }: {
  label: string; icon: typeof Brain; active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
        active ? 'bg-foreground text-background border-foreground'
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

// ── Status dot ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PromptStatus }) {
  const cfg = PROMPT_STATUS_CONFIG[status];
  return <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${cfg.cls}`}>{status}</span>;
}

// ── Template Row ───────────────────────────────────────────────────────────

function TemplateRow({ t, selected, onSelect }: { t: PromptTemplate; selected: boolean; onSelect: () => void }) {
  const domCls = DOMAIN_CLS[t.domain];
  return (
    <button onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected ? 'bg-foreground text-background border-foreground'
                 : 'bg-white border-border hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <p className={`text-[11px] font-bold leading-snug mb-0.5 ${selected ? 'text-background' : 'text-foreground'}`}>{t.name}</p>
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : domCls}`}>{t.domain}</span>
        <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : PROMPT_STATUS_CONFIG[t.status].cls}`}>{t.status}</span>
      </div>
    </button>
  );
}

// ── Template Detail ────────────────────────────────────────────────────────

function TemplateDetail({ t, onOpenBrief, onEdit }: { t: PromptTemplate; onOpenBrief: () => void; onEdit: () => void }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['purpose','guardrails']));
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
  const riskCfg = RISK_CONFIG[t.hallucinationRisk];
  const domCls  = DOMAIN_CLS[t.domain];
  const stsCfg  = PROMPT_STATUS_CONFIG[t.status];
  const qr      = qualityReviews.find(q => q.templateId === t.id);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Prompt Template · v{t.version}</p>
              <h3 className="text-[16px] font-bold text-foreground leading-snug">{t.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={onEdit} className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2 py-1 hover:bg-muted/40 transition-colors">Edit</button>
              <button onClick={onOpenBrief} className="text-[10px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5 transition-colors">Brief</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${domCls}`}>{t.domain}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${stsCfg.cls}`}>{t.status}</span>
            <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${riskCfg.cls}`}>Risk: {t.hallucinationRisk}</span>
            <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 border-border text-muted-foreground">Score: {t.qualityScore}/100</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mb-1">Purpose</p>
          <p className="text-[12px] text-foreground leading-relaxed">{t.purpose}</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Owner',           value: t.owner },
            { label: 'Capability',      value: t.capabilityId.replace('cap-', '').replace(/-/g, ' ') },
            { label: 'Output Format',   value: t.outputFormatId },
            { label: 'Last Reviewed',   value: t.lastReviewed },
            { label: 'Audience',        value: t.audience.join(', ') },
            { label: 'Tone',            value: t.tone.split('.')[0] },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-white p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">{label}</p>
              <p className="text-[11px] font-semibold text-foreground capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Required variables */}
        <Sec id="vars" label={`Required Variables (${t.requiredVariables.length})`}>
          <div className="flex flex-wrap gap-1">
            {t.requiredVariables.map(id => {
              const v = promptVariables.find(v => v.id === id);
              return v ? (
                <span key={id} className="text-[10px] font-mono font-semibold bg-muted border border-border rounded px-1.5 py-0.5 text-foreground">{v.name}</span>
              ) : null;
            })}
          </div>
        </Sec>

        {/* Source rules */}
        <Sec id="sources" label={`Source Rules (${t.sourceRules.length})`}>
          <div className="space-y-1.5">
            {t.sourceRules.map(sr => {
              const cls = sr.role === 'Required' ? 'text-green-700 bg-green-50 border-green-200'
                        : sr.role === 'Preferred' ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : sr.role === 'Optional' ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-rose-700 bg-rose-50 border-rose-200';
              return (
                <div key={sr.sourceId} className="flex items-start gap-2">
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${cls}`}>{sr.role}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{sr.sourceName}</p>
                    <p className="text-[10px] text-muted-foreground">{sr.reasoning}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Sec>

        {/* Guardrails */}
        <Sec id="guardrails" label={`Guardrails (${t.guardrails.length})`}>
          <div className="space-y-1.5">
            {t.guardrails.map((g, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-900 leading-snug">{g}</p>
              </div>
            ))}
          </div>
        </Sec>

        {/* Prompt body */}
        <Sec id="prompt" label="Prompt Body (Annotated)">
          <pre className="text-[10px] font-mono text-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap leading-relaxed overflow-x-auto">{t.promptBody}</pre>
        </Sec>

        {/* SF Objects + Standards */}
        <Sec id="related" label="Related Systems">
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Salesforce Objects</p>
              <div className="flex flex-wrap gap-1">
                {t.relatedSfObjects.length === 0
                  ? <span className="text-[10px] italic text-muted-foreground/50">None</span>
                  : t.relatedSfObjects.map(o => <span key={o} className="text-[10px] font-semibold text-blue-900 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{o}</span>)
                }
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Standards</p>
              <div className="flex flex-wrap gap-1">
                {t.relatedStandards.length === 0
                  ? <span className="text-[10px] italic text-muted-foreground/50">None defined yet</span>
                  : t.relatedStandards.map(s => <span key={s} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground">{s.replace('std-','').replace(/-/g,' ')}</span>)
                }
              </div>
            </div>
          </div>
        </Sec>

        {/* Quality */}
        {qr && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Quality Review</p>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { label: 'Source Coverage',    value: qr.sourceCoverage },
                { label: 'Standards Alignment', value: qr.standardsAlignment },
                { label: 'Usefulness',          value: qr.usefulnessScore },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                      <div className="h-full bg-foreground rounded-full" style={{ width: `${value}%` }} />
                    </div>
                    <span className="text-[10px] font-bold">{value}%</span>
                  </div>
                </div>
              ))}
            </div>
            {qr.openFlags.length > 0 && (
              <div className="space-y-1">
                {qr.openFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-800">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Studio context (live template state) ───────────────────────────────────

interface StudioCtxValue { templates: PromptTemplate[]; }
const StudioCtx = createContext<StudioCtxValue>({ templates: promptTemplates });
function useStudioTemplates() { return useContext(StudioCtx).templates; }

// ── Library View ───────────────────────────────────────────────────────────

function LibraryView({ onSelectTemplate }: { onSelectTemplate: (t: PromptTemplate) => void }) {
  const templates = useStudioTemplates();
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Brain className="w-7 h-7 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[14px] font-bold text-foreground mb-1">Prompt Library</h2>
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                All Penny prompt templates organized by capability domain. Each template defines how Penny thinks, what it retrieves, and what guardrails govern its output. Staff configure Penny behavior here — no code required.
              </p>
            </div>
          </div>
        </div>

        {DOMAIN_ORDER.map(domain => {
          const domTemplates = templates.filter(t => t.domain === domain);
          if (!domTemplates.length) return null;
          const cls = DOMAIN_CLS[domain];
          return (
            <div key={domain}>
              <div className={`flex items-center gap-2 rounded-xl border p-3 mb-2 ${cls}`}>
                <Brain className="w-4 h-4" />
                <p className="text-[13px] font-bold">{domain}</p>
                <span className="text-[10px] font-bold ml-auto">{domTemplates.length} template{domTemplates.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {domTemplates.map(t => (
                  <button key={t.id} onClick={() => onSelectTemplate(t)}
                    className="text-left rounded-xl border border-border bg-white p-3 hover:border-foreground/30 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-[12px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{t.name}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug mb-2">{t.shortDescription}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className={`font-bold border rounded-full px-1.5 py-0.5 ${RISK_CONFIG[t.hallucinationRisk].cls}`}>Risk: {t.hallucinationRisk}</span>
                      <span className="border border-border bg-muted/40 rounded-full px-1.5 py-0.5">v{t.version}</span>
                      <span className="ml-auto font-semibold">{t.qualityScore}/100</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Templates View ─────────────────────────────────────────────────────────

function TemplatesView({ onOpenBrief, onEdit }: { onOpenBrief: (t: PromptTemplate) => void; onEdit: (t: PromptTemplate) => void }) {
  const templates = useStudioTemplates();
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '');
  const [search, setSearch]         = useState('');
  const [filterDomain, setFilterDomain]   = useState<PromptDomain | 'all'>('all');
  const [filterStatus, setFilterStatus]   = useState<PromptStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter(t =>
      (filterDomain === 'all' || t.domain === filterDomain) &&
      (filterStatus === 'all' || t.status === filterStatus) &&
      (!q || t.name.toLowerCase().includes(q) || t.shortDescription.toLowerCase().includes(q))
    );
  }, [templates, search, filterDomain, filterStatus]);

  const selected = templates.find(t => t.id === selectedId) ?? templates[0];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 space-y-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…" className="pl-7 h-7 text-[11px] bg-white" />
          </div>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value as any)} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All domains</option>
            {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All statuses</option>
            {(['Approved','Review','Draft','Deprecated'] as PromptStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-[11px] text-center text-muted-foreground py-6">No templates match.</p>}
            {DOMAIN_ORDER.map(domain => {
              const ts = filtered.filter(t => t.domain === domain);
              if (!ts.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ts.map(t => <TemplateRow key={t.id} t={t} selected={selectedId === t.id} onSelect={() => setSelectedId(t.id)} />)}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 overflow-hidden">
        <TemplateDetail t={selected} onOpenBrief={() => onOpenBrief(selected)} onEdit={() => onEdit(selected)} />
      </div>
    </div>
  );
}

// ── Variables View ─────────────────────────────────────────────────────────

const SOURCE_CLS: Record<string, string> = {
  'Salesforce':       'text-blue-700 bg-blue-50 border-blue-200',
  'LMS':              'text-amber-700 bg-amber-50 border-amber-200',
  'Calendar':         'text-amber-700 bg-amber-50 border-amber-200',
  'Standards Studio': 'text-rose-700 bg-rose-50 border-rose-200',
  'Curriculum Studio':'text-orange-700 bg-orange-50 border-orange-200',
  'Penny Generated':  'text-secondary border-secondary/20 bg-secondary/10',
};

const VARIABLE_SOURCES: VariableSource[] = [
  'Salesforce', 'LMS', 'Calendar', 'User Input',
  'Standards Studio', 'Curriculum Studio', 'Penny Generated',
];

function VariablesView() {
  const { openActionPanel } = useAppContext();
  const { variables, create, update } = usePromptVariables();
  const [selectedId, setSelectedId] = useState<string | null>(() => null);
  const selected = selectedId ? (variables.find(v => v.id === selectedId) ?? null) : null;

  function handleNew() {
    openActionPanel({
      title:       'New Variable',
      objectType:  'Prompt Variable',
      subtitle:    'Define a new runtime variable Penny can use in prompts. Saved to the database.',
      slackContext:'penny',
      fields: [
        { id: 'name',         label: 'Placeholder',    type: 'text',     required: true,  placeholder: '{{variable_name}}' },
        { id: 'label',        label: 'Display Label',  type: 'text',     required: true,  placeholder: 'Human-readable label' },
        { id: 'type',         label: 'Type',           type: 'select',   required: true,  options: ['text','number','list','object','boolean'] },
        { id: 'source',       label: 'Data Source',    type: 'select',   required: true,  options: VARIABLE_SOURCES },
        { id: 'description',  label: 'Description',    type: 'textarea', required: true,  placeholder: 'What does this variable represent?', rows: 2 },
        { id: 'exampleValue', label: 'Example Value',  type: 'text',     placeholder: 'e.g. Jordan Smith' },
        { id: 'required',     label: 'Required',       type: 'select',   options: ['true','false'] },
      ],
      onSaveAndView: (data) => {
        if (data.name?.trim() && data.label?.trim()) {
          create({
            id:              `var-${Date.now()}`,
            name:            data.name.trim(),
            label:           data.label.trim(),
            type:            (data.type as VariableType)     || 'text',
            source:          (data.source as VariableSource) || 'User Input',
            description:     data.description  || '',
            exampleValue:    data.exampleValue || '',
            required:        data.required === 'true',
            usedByTemplates: [],
          });
        }
      },
    });
  }

  function handleEdit(v: PromptVariable) {
    openActionPanel({
      title:       `Edit: ${v.label}`,
      objectType:  'Prompt Variable',
      subtitle:    'Update variable configuration. Changes are saved to the database.',
      slackContext:'penny',
      fields: [
        { id: 'label',        label: 'Display Label', type: 'text',     placeholder: v.label },
        { id: 'type',         label: 'Type',          type: 'select',   options: ['text','number','list','object','boolean'] },
        { id: 'source',       label: 'Data Source',   type: 'select',   options: VARIABLE_SOURCES },
        { id: 'description',  label: 'Description',   type: 'textarea', placeholder: v.description, rows: 2 },
        { id: 'exampleValue', label: 'Example Value', type: 'text',     placeholder: v.exampleValue },
      ],
      onSaveAndView: (data) => {
        update({ id: v.id, updates: {
          ...(data.label        ? { label:        data.label                     } : {}),
          ...(data.type         ? { type:         data.type as VariableType      } : {}),
          ...(data.source       ? { source:       data.source as VariableSource  } : {}),
          ...(data.description  ? { description:  data.description               } : {}),
          ...(data.exampleValue ? { exampleValue: data.exampleValue              } : {}),
        }});
      },
    });
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── List column ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Sub-header */}
        <div className="px-5 py-2.5 border-b border-border bg-white flex-shrink-0 flex items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Runtime variables injected into Penny prompts. Each maps to a live data source — Salesforce, LMS, Calendar, or User Input.
          </p>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Variable
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-1">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_64px_96px_24px] gap-2 px-3 py-1">
              {['Variable / Label','Type','Source',''].map((h,i) => (
                <p key={i} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{h}</p>
              ))}
            </div>

            {variables.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedId(id => id === v.id ? null : v.id)}
                className={`w-full text-left grid grid-cols-[1fr_64px_96px_24px] gap-2 px-3 py-2.5 rounded-lg border transition-all items-center ${
                  selectedId === v.id
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border bg-white hover:bg-muted/20'
                }`}
              >
                <div>
                  <code className="text-[10px] font-mono font-bold text-foreground bg-muted/40 rounded px-1.5 py-0.5">{v.name}</code>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{v.label}</p>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground capitalize">{v.type}</span>
                <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 truncate ${SOURCE_CLS[v.source] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                  {v.source}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${selectedId === v.id ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Detail panel ──────────────────────────────────── */}
      {selected && (
        <div className="w-[280px] flex-shrink-0 border-l border-border flex flex-col bg-white">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Variable</p>
              <p className="text-[13px] font-bold text-foreground leading-tight truncate">{selected.label}</p>
              <code className="text-[10px] font-mono text-muted-foreground">{selected.name}</code>
            </div>
            <button
              onClick={() => handleEdit(selected)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors shrink-0"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 text-slate-600 bg-slate-50 border-slate-200 capitalize">{selected.type}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${SOURCE_CLS[selected.source] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>{selected.source}</span>
                {selected.required && (
                  <span className="text-[10px] font-bold border rounded-full px-2 py-0.5 text-rose-700 bg-rose-50 border-rose-200">Required</span>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Description</p>
                <p className="text-[11px] text-foreground leading-relaxed">{selected.description}</p>
              </div>

              {/* Example */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Example Value</p>
                <code className="text-[11px] font-mono text-muted-foreground block bg-muted/30 rounded px-2 py-1.5 break-all">{selected.exampleValue || '—'}</code>
              </div>

              {/* Used by */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
                  Used by {selected.usedByTemplates.length} template{selected.usedByTemplates.length !== 1 ? 's' : ''}
                </p>
                {selected.usedByTemplates.length > 0 ? (
                  <div className="space-y-1">
                    {selected.usedByTemplates.map(tid => (
                      <p key={tid} className="text-[10px] font-mono text-muted-foreground bg-muted/20 rounded px-2 py-1">{tid}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">No templates yet</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// ── Source Rules View ──────────────────────────────────────────────────────

function SourceRulesView() {
  const templates = useStudioTemplates();
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '');
  const t = templates.find(t => t.id === selectedId) ?? templates[0];

  const roleConfig = {
    Required:  'text-green-700 bg-green-50 border-green-200',
    Preferred: 'text-blue-700 bg-blue-50 border-blue-200',
    Optional:  'text-amber-700 bg-amber-50 border-amber-200',
    Forbidden: 'text-rose-700 bg-rose-50 border-rose-200',
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[200px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Select Template</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(domain => {
              const ts = templates.filter(t => t.domain === domain);
              if (!ts.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ts.map(pt => (
                    <button key={pt.id} onClick={() => setSelectedId(pt.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        selectedId === pt.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >{pt.name}</button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl space-y-4">
          <div className={`rounded-xl border p-3 ${DOMAIN_CLS[t.domain]}`}>
            <p className="text-[13px] font-bold">{t.name}</p>
            <p className="text-[10px] text-muted-foreground">{t.shortDescription}</p>
          </div>
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-4 py-2 bg-muted/30 border-b border-border">
              {['Role','Source','Reasoning'].map(h => (
                <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {t.sourceRules.map((sr, i) => (
              <div key={sr.sourceId} className={`grid grid-cols-[100px_1fr_1fr] gap-2 px-4 py-3 items-start ${i < t.sourceRules.length - 1 ? 'border-b border-border' : ''}`}>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 self-start ${roleConfig[sr.role]}`}>{sr.role}</span>
                <p className="text-[11px] font-semibold text-foreground">{sr.sourceName}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{sr.reasoning}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold text-foreground mb-2">Source Rule Legend</p>
            <div className="space-y-1.5">
              {(['Required','Preferred','Optional','Forbidden'] as const).map(role => (
                <div key={role} className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 w-20 text-center ${roleConfig[role]}`}>{role}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {role === 'Required'  ? 'Penny must retrieve from this source. Missing = abort and flag.' : ''}
                    {role === 'Preferred' ? 'Use if available. Penny continues without it but logs the gap.' : ''}
                    {role === 'Optional'  ? 'Enrich context if present. Never required.' : ''}
                    {role === 'Forbidden' ? 'Penny must never retrieve from this source for this prompt.' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Output Formats View ────────────────────────────────────────────────────

function OutputFormatsView() {
  const templates = useStudioTemplates();
  const [selectedId, setSelectedId] = useState<string>(outputFormats[0].id);
  const selected = outputFormats.find(f => f.id === selectedId) ?? outputFormats[0];
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[190px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Formats ({outputFormats.length})</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {outputFormats.map(f => (
              <button key={f.id} onClick={() => setSelectedId(f.id)}
                className={`w-full text-left px-2.5 py-2.5 rounded-lg transition-all ${
                  selectedId === f.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <p className={`text-[11px] font-bold ${selectedId === f.id ? 'text-background' : 'text-foreground'}`}>{f.name}</p>
                <p className={`text-[10px] ${selectedId === f.id ? 'text-background/60' : 'text-muted-foreground/60'}`}>{f.usedBy.length} template{f.usedBy.length !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Output Format</p>
            <h2 className="text-[18px] font-bold text-foreground">{selected.name}</h2>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-[11px] font-bold text-primary/70 uppercase tracking-wider mb-1">Description</p>
            <p className="text-[12px] text-foreground leading-relaxed">{selected.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Length Guidance</p>
              <p className="text-[11px] text-foreground">{selected.lengthGuidance}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5">Tone</p>
              <p className="text-[11px] text-foreground">{selected.tone}</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-[11px] font-bold text-foreground mb-2">Required Structure</p>
            <div className="space-y-1.5">
              {selected.structure.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-[11px] text-foreground">{s}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-[11px] font-bold text-foreground mb-2">Format Example</p>
            <p className="text-[11px] text-foreground/80 italic leading-relaxed">{selected.example}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-foreground mb-2">Used by Templates</p>
            <div className="flex flex-wrap gap-1">
              {selected.usedBy.map(id => {
                const t = templates.find(t => t.id === id);
                return t ? <span key={id} className="text-[10px] font-medium border border-border bg-white rounded-full px-2 py-0.5 text-muted-foreground">{t.name}</span> : null;
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Test Bench View ────────────────────────────────────────────────────────

type RunStatus = 'idle' | 'loading' | 'success' | 'error';

function interpolatePrompt(body: string, inputs: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => inputs[key] ?? '');
}

interface LearnerOption {
  id: string;
  firstName: string;
  lastName: string;
  pennyTrail: string | null;
}

interface ContextMeta {
  promptPath: string;
  currentGoal: string | null;
  currentPhase: string | null;
  coachingTone: string | null;
  trailId: string | null;
}

function TestBenchView() {
  const templates = useStudioTemplates();
  const [selectedId, setSelectedId]         = useState(() => templates[0]?.id ?? '');
  const [status, setStatus]                 = useState<RunStatus>('idle');
  const [liveReply, setLiveReply]           = useState('');
  const [liveDurationMs, setLiveDurationMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg]             = useState('');
  const [inputs, setInputs]                 = useState<Record<string, string>>({});

  const [learners, setLearners]                 = useState<LearnerOption[]>([]);
  const [learnersLoading, setLearnersLoading]   = useState(true);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('');
  const [contextMeta, setContextMeta]           = useState<ContextMeta | null>(null);

  useEffect(() => {
    fetch('/api/penny/data/learners/directory')
      .then(r => r.ok ? r.json() as Promise<LearnerOption[]> : Promise.resolve([]))
      .then((data: LearnerOption[]) => {
        setLearners(data);
        setLearnersLoading(false);
      })
      .catch(() => setLearnersLoading(false));
  }, []);

  const t = templates.find(t => t.id === selectedId) ?? templates[0];

  function loadTemplate(id: string) {
    const tmpl = templates.find(t => t.id === id) ?? templates[0];
    setSelectedId(id);
    setStatus('idle');
    setLiveReply('');
    setLiveDurationMs(null);
    setErrorMsg('');
    setInputs({ ...tmpl.testBench.sampleInputs });
  }

  function reset() {
    setStatus('idle');
    setLiveReply('');
    setLiveDurationMs(null);
    setErrorMsg('');
  }

  async function runPenny() {
    setStatus('loading');
    setLiveReply('');
    setLiveDurationMs(null);
    setErrorMsg('');
    const interpolated = interpolatePrompt(t.promptBody, inputs);
    try {
      const resp = await fetch('/api/penny/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: interpolated,
          systemOverride: interpolated,
          role: 'admin',
          context: 'Prompt Studio Test Bench',
          ...(selectedLearnerId ? { contactId: selectedLearnerId } : {}),
        }),
      });
      const data = await resp.json() as { reply?: string; durationMs?: number; error?: string; contextMeta?: ContextMeta };
      if (!resp.ok || data.error) {
        setErrorMsg(data.error ?? `HTTP ${resp.status}`);
        setStatus('error');
        return;
      }
      setLiveReply(data.reply ?? '');
      setLiveDurationMs(data.durationMs ?? null);
      setContextMeta(data.contextMeta ?? null);
      setStatus('success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Network error — could not reach API.');
      setStatus('error');
    }
  }

  const domCls = DOMAIN_CLS[t.domain];
  const isLoading = status === 'loading';
  const showOutput = status === 'success' || status === 'error';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Template picker */}
      <div className="w-[190px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <div className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Test Bench</p></div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(domain => {
              const ts = templates.filter(t => t.domain === domain);
              if (!ts.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ts.map(pt => (
                    <button key={pt.id} onClick={() => loadTemplate(pt.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        selectedId === pt.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >{pt.name}</button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Run panel */}
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl space-y-4">
          <div className={`rounded-xl border p-3 ${domCls}`}>
            <p className="text-[13px] font-bold">{t.name}</p>
            <p className="text-[10px] text-muted-foreground">{t.shortDescription}</p>
          </div>

          {/* Learner selector */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Test As Learner</p>
            <p className="text-[10px] text-muted-foreground mb-2">Select a learner to inject their live Salesforce context into this prompt. Leave blank to use the generic fallback prompt.</p>
            <select
              value={selectedLearnerId}
              onChange={e => {
                setSelectedLearnerId(e.target.value);
                setContextMeta(null);
                setLiveReply('');
                setStatus('idle');
              }}
              disabled={isLoading}
              className="w-full h-7 rounded-md border border-input bg-white px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
            >
              <option value="">No learner — use fallback prompt</option>
              {learnersLoading
                ? <option disabled>Loading learners…</option>
                : learners.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} — {l.pennyTrail ?? 'No trail'}
                    </option>
                  ))
              }
            </select>
            {selectedLearnerId && (
              <div className="mt-1.5">
                {contextMeta === null ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    ⚡ Learner context will load on first run
                  </span>
                ) : contextMeta.promptPath === 'salesforce' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    ✓ Live Salesforce context active for {learners.find(l => l.id === selectedLearnerId)?.firstName ?? 'learner'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    ⚠ Using fallback prompt — check Salesforce connection
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Inputs */}
          <div>
            <p className="text-[11px] font-bold text-foreground mb-2">Sample Inputs</p>
            <div className="space-y-2">
              {Object.entries(t.testBench.sampleInputs).map(([key]) => (
                <div key={key}>
                  <label className="text-[10px] font-mono font-bold text-foreground/70">{`{{${key}}}`}</label>
                  <Input
                    value={inputs[key] ?? ''}
                    onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    className="mt-0.5 h-7 text-[11px] bg-white"
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sources that would be queried */}
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-bold text-foreground mb-1.5">Sources Penny Would Query</p>
            <div className="flex flex-wrap gap-1">
              {t.sourceRules.filter(sr => sr.role !== 'Forbidden').map(sr => (
                <span key={sr.sourceId} className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${
                  sr.role === 'Required' ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-600 bg-slate-50 border-slate-200'
                }`}>{sr.sourceName}</span>
              ))}
            </div>
          </div>

          {/* Run button */}
          <div className="flex items-center gap-2">
            <button
              onClick={runPenny}
              disabled={isLoading}
              className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Play className="w-3.5 h-3.5" />
              }
              {isLoading ? 'Running…' : 'Run Penny'}
            </button>
            {showOutput && (
              <button onClick={reset} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-3 h-3" />Reset
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-secondary" />
                <p className="text-[12px] font-bold text-foreground">Penny Output</p>
                <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 ml-auto">Live · Gemini 2.5 Flash</span>
              </div>
              <div className="rounded-lg border border-secondary/20 bg-white p-3 space-y-2">
                <div className="h-2.5 bg-muted rounded w-full" />
                <div className="h-2.5 bg-muted rounded w-5/6" />
                <div className="h-2.5 bg-muted rounded w-4/6" />
                <div className="h-2.5 bg-muted rounded w-3/4" />
              </div>
            </div>
          )}

          {/* Live output */}
          {showOutput && (
            <div className={`rounded-xl border p-4 space-y-3 ${status === 'error' ? 'border-red-200 bg-red-50/50' : 'border-secondary/20 bg-secondary/5'}`}>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-secondary" />
                <p className="text-[12px] font-bold text-foreground">Penny Output</p>
                {status === 'success' && (
                  <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 ml-auto">Live · Gemini 2.5 Flash</span>
                )}
                {status === 'error' && (
                  <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 ml-auto">Error</span>
                )}
              </div>

              {status === 'success' && (
                <>
                  <div className="rounded-lg border border-secondary/20 bg-white p-3">
                    <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-line">{liveReply}</p>
                  </div>
                  {liveDurationMs !== null && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Run Complete</p>
                      <p className="text-[11px] text-green-900 leading-snug">
                        Completed in {liveDurationMs.toLocaleString()} ms
                      </p>
                      {contextMeta && selectedLearnerId && contextMeta.promptPath === 'salesforce' && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Context: Salesforce ✓ · Trail: {contextMeta.trailId ?? '—'} · Phase: {contextMeta.currentPhase ?? '—'} · Tone: {contextMeta.coachingTone ?? '—'}
                        </p>
                      )}
                      {contextMeta && contextMeta.promptPath === 'fallback' && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          Context: Fallback (generic prompt — no learner data)
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {status === 'error' && (
                <div className="rounded-lg border border-red-200 bg-white p-3">
                  <p className="text-[12px] text-red-700 leading-relaxed">{errorMsg}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${RISK_CONFIG[t.hallucinationRisk].cls}`}>Hallucination Risk: {t.hallucinationRisk}</span>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${PROMPT_STATUS_CONFIG[t.status].cls}`}>{t.status}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Version History View ───────────────────────────────────────────────────

function VersionHistoryView() {
  const templates = useStudioTemplates();
  const [selectedId, setSelectedId] = useState(() => templates[0]?.id ?? '');
  const t       = templates.find(t => t.id === selectedId) ?? templates[0];
  const entries = versionHistory.filter(v => v.templateId === selectedId).sort((a, b) => b.version.localeCompare(a.version));

  const changeTypeCls = {
    Created:    'text-blue-700 bg-blue-50 border-blue-200',
    Updated:    'text-amber-700 bg-amber-50 border-amber-200',
    Approved:   'text-green-700 bg-green-50 border-green-200',
    Deprecated: 'text-rose-700 bg-rose-50 border-rose-200',
    Reverted:   'text-slate-600 bg-slate-50 border-slate-200',
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[190px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-2.5 border-b border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Templates</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {DOMAIN_ORDER.map(domain => {
              const ts = templates.filter(t => t.domain === domain);
              if (!ts.length) return null;
              return (
                <div key={domain}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1 py-1.5">{domain}</p>
                  {ts.map(pt => (
                    <button key={pt.id} onClick={() => setSelectedId(pt.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                        selectedId === pt.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                      }`}
                    >
                      <p className="font-bold">{pt.name}</p>
                      <p className={`text-[9px] mt-0.5 ${selectedId === pt.id ? 'text-background/60' : 'text-muted-foreground/60'}`}>
                        {versionHistory.filter(v => v.templateId === pt.id).length} change{versionHistory.filter(v => v.templateId === pt.id).length !== 1 ? 's' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-xl space-y-4">
          <div className={`rounded-xl border p-3 ${DOMAIN_CLS[t.domain]}`}>
            <p className="text-[13px] font-bold">{t.name}</p>
            <p className="text-[10px] text-muted-foreground">Current version: v{t.version} · {entries.length} change{entries.length !== 1 ? 's' : ''}</p>
          </div>
          {entries.length === 0 && <p className="text-[12px] text-muted-foreground text-center py-8">No version history yet.</p>}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {entries.map(entry => (
                <div key={entry.id} className="relative flex items-start gap-3 pl-10">
                  <div className="absolute left-3 top-2 w-2.5 h-2.5 rounded-full bg-background border-2 border-foreground" />
                  <div className="flex-1 rounded-xl border border-border bg-white p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono font-bold bg-muted rounded px-1.5 py-0.5">v{entry.version}</span>
                      <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${changeTypeCls[entry.changeType]}`}>{entry.changeType}</span>
                      {entry.breaking && <span className="text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5">Breaking</span>}
                      <span className="text-[10px] text-muted-foreground ml-auto">{entry.date}</span>
                    </div>
                    <p className="text-[11px] text-foreground leading-snug">{entry.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">by {entry.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Quality Review View ────────────────────────────────────────────────────

function QualityReviewView() {
  const templates = useStudioTemplates();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const filtered = filterStatus === 'all' ? qualityReviews : qualityReviews.filter(q => q.reviewStatus === filterStatus);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-white flex-shrink-0 flex items-center gap-3">
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5">
          <p className="text-[11px] font-semibold text-green-700">
            {qualityReviews.filter(q => q.reviewStatus === 'Approved').length} Approved · {qualityReviews.filter(q => q.reviewStatus !== 'Approved').length} Pending or flagged
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-7 text-[11px] rounded-md border border-input bg-white px-2">
            <option value="all">All statuses</option>
            {['Approved','In Review','Pending','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-1">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px_100px] gap-2 px-3 py-1.5">
            {['Template','Coverage','Standards','Usefulness','Risk','Status'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{h}</p>
            ))}
          </div>
          {filtered.map(qr => {
            const t = templates.find(t => t.id === qr.templateId);
            if (!t) return null;
            const stsCls = qr.reviewStatus === 'Approved' ? 'text-green-700 bg-green-50 border-green-200'
                         : qr.reviewStatus === 'In Review' ? 'text-amber-700 bg-amber-50 border-amber-200'
                         : qr.reviewStatus === 'Rejected' ? 'text-rose-700 bg-rose-50 border-rose-200'
                         : 'text-slate-600 bg-slate-50 border-slate-200';
            return (
              <div key={qr.templateId} className="grid grid-cols-[1fr_80px_80px_80px_80px_100px] gap-2 px-3 py-3 rounded-lg border border-border bg-white hover:bg-muted/20 transition-colors items-center">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{t.name}</p>
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${DOMAIN_CLS[t.domain]}`}>{t.domain}</span>
                  {qr.openFlags.length > 0 && <span className="ml-1 text-[9px] font-bold text-amber-700">⚠ {qr.openFlags.length} flag{qr.openFlags.length > 1 ? 's' : ''}</span>}
                </div>
                {[qr.sourceCoverage, qr.standardsAlignment, qr.usefulnessScore].map((val, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-foreground rounded-full" style={{ width: `${val}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{val}</span>
                    </div>
                  </div>
                ))}
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${RISK_CONFIG[qr.hallucinationRisk].cls}`}>{qr.hallucinationRisk}</span>
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${stsCls}`}>{qr.reviewStatus}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PennyPromptStudio() {
  const { setSelectedItem, openActionPanel, openSlackPanel } = useAppContext();
  const { templates: liveTemplates, create, update } = usePromptTemplates();
  const [view, setView] = useState<StudioView>('library');
  const [librarySelectedTemplate, setLibrarySelectedTemplate] = useState<PromptTemplate | null>(null);

  function openBrief(t: PromptTemplate) {
    setSelectedItem({ type: 'promptTemplate', id: t.id, data: t });
  }

  function handleLibrarySelect(t: PromptTemplate) {
    setLibrarySelectedTemplate(t);
    setView('templates');
  }

  function handleEditTemplate(t: PromptTemplate) {
    openActionPanel({
      title: `Edit: ${t.name}`,
      objectType: 'Prompt Template',
      subtitle: 'Update the prompt configuration. Changes are saved to the database.',
      slackContext: 'penny',
      fields: [
        { id: 'name',         label: 'Template Name',   type: 'text',     required: true, placeholder: t.name },
        { id: 'domain',       label: 'Domain',           type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
        { id: 'purpose',      label: 'Purpose',          type: 'textarea', placeholder: t.purpose, rows: 3 },
        { id: 'promptBody',   label: 'Prompt Body',      type: 'textarea', placeholder: t.promptBody, rows: 5 },
        { id: 'audience',     label: 'Audience',         type: 'select',   options: ['Learner', 'Coach', 'Admin', 'All'] },
        { id: 'tone',         label: 'Tone & Style',     type: 'text',     placeholder: t.tone },
        { id: 'guardrails',   label: 'Guardrails',       type: 'textarea', placeholder: t.guardrails.join('\n'), rows: 3 },
        { id: 'reviewStatus', label: 'Review Status',    type: 'select',   options: ['Draft', 'In Review', 'Approved', 'Needs Revision'] },
      ],
      onSaveAndView: (data) => {
        update({ id: t.id, updates: {
          ...(data.name         ? { name: data.name }                                          : {}),
          ...(data.domain       ? { domain: data.domain as PromptDomain }                     : {}),
          ...(data.purpose      ? { purpose: data.purpose }                                    : {}),
          ...(data.promptBody   ? { promptBody: data.promptBody }                             : {}),
          ...(data.tone         ? { tone: data.tone }                                          : {}),
          ...(data.guardrails   ? { guardrails: data.guardrails.split('\n').filter(Boolean) } : {}),
          ...(data.reviewStatus ? { status: data.reviewStatus as PromptStatus }               : {}),
          lastReviewed: 'Just now',
        }});
        setView('templates');
      },
    });
  }

  function handleNewTemplate() {
    openActionPanel({
      title: 'Request New Prompt Template', objectType: 'Prompt Template',
      subtitle: 'Configure how Penny thinks, retrieves, and responds in a specific context.',
      slackContext: 'penny',
      fields: [
        { id: 'name',       label: 'Template Name',   type: 'text',     required: true, placeholder: 'e.g. Goal-Setting Coaching Prompt' },
        { id: 'domain',     label: 'Domain',           type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
        { id: 'purpose',    label: 'Purpose',          type: 'textarea', placeholder: 'What does this prompt do and when should Penny use it?', rows: 3 },
        { id: 'promptBody', label: 'Prompt Body',      type: 'textarea', placeholder: 'Write the prompt. Use {{variable_name}} for dynamic tokens.', rows: 5 },
        { id: 'audience',   label: 'Audience',         type: 'select',   options: ['Learner', 'Coach', 'Admin', 'All'] },
        { id: 'inputs',     label: 'Required Inputs',  type: 'textarea', placeholder: 'e.g. learnerName, programName, currentGoal…', rows: 2 },
        { id: 'tone',       label: 'Tone & Style',     type: 'text',     placeholder: 'e.g. Empathetic and direct.' },
        { id: 'guardrails', label: 'Guardrails',       type: 'textarea', placeholder: 'Constraints: never recommend specific employers…', rows: 3 },
        { id: 'reviewStatus', label: 'Review Status',  type: 'select',   options: ['Draft', 'In Review', 'Approved', 'Needs Revision'] },
        { id: 'testCase',   label: 'Test Case',        type: 'textarea', placeholder: 'Describe a test input and expected Penny response…', rows: 3 },
      ],
      onSaveAndView: (data) => {
        if (data.name?.trim()) {
          const newTemplate: PromptTemplate = {
            id: `tpl-${Date.now()}`,
            name: data.name.trim(),
            domain: (data.domain as PromptDomain) || 'Coaching',
            capabilityId: 'cap-general',
            shortDescription: data.purpose?.slice(0, 80) || '',
            purpose: data.purpose || '',
            audience: data.audience ? [data.audience] : ['Coach'],
            requiredVariables: [],
            sourceRules: [],
            outputFormatId: 'Knowledge Answer',
            tone: data.tone || 'Professional and clear.',
            guardrails: data.guardrails ? data.guardrails.split('\n').filter(Boolean) : [],
            owner: 'Staff',
            status: (data.reviewStatus as PromptStatus) || 'Draft',
            version: '1.0',
            lastReviewed: 'Just now',
            promptBody: data.promptBody || '',
            relatedStandards: [],
            relatedSfObjects: [],
            hallucinationRisk: 'Medium',
            qualityScore: 0,
            testBench: { sampleInputs: {}, simulatedOutput: '', simulationNotes: '' },
          };
          create(newTemplate);
        }
        setView('templates');
      },
    });
  }

  return (
    <StudioCtx.Provider value={{ templates: liveTemplates }}>
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0 bg-background">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Penny — Prompt Studio</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Penny Prompt Studio</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              The administrative control center for how Penny thinks. Configure prompts, variables, source rules, and output formats — no code required.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openSlackPanel({ context: 'penny', title: 'Penny Prompt Studio', subtitle: 'Slack channels, pending asks, and bot status for Penny prompt work.' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#4A154B]/20 bg-[#4A154B]/5 text-[#4A154B] hover:bg-[#4A154B]/10 transition-colors"
              title="Open Slack context"
            >
              <Hash className="w-3.5 h-3.5" />
              Slack
            </button>
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[11px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New Template
            </button>
            <span className="text-[11px] font-semibold text-green-700 border border-green-200 bg-green-50 rounded-full px-3 py-1">
              {liveTemplates.filter(t => t.status === 'Approved').length} Approved
            </span>
            <span className="text-[11px] font-semibold text-amber-700 border border-amber-200 bg-amber-50 rounded-full px-3 py-1">
              {liveTemplates.filter(t => t.status === 'Review').length} In Review
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <ViewTab label="Prompt Library"   icon={BookOpen}       active={view === 'library'}      onClick={() => setView('library')} />
          <ViewTab label="Templates"        icon={Brain}          active={view === 'templates'}    count={liveTemplates.length} onClick={() => setView('templates')} />
          <ViewTab label="Variables"        icon={Zap}            active={view === 'variables'}    count={PROMPT_STUDIO_SUMMARY.variables} onClick={() => setView('variables')} />
          <ViewTab label="Source Rules"     icon={Database}       active={view === 'source-rules'} onClick={() => setView('source-rules')} />
          <ViewTab label="Output Formats"   icon={FileText}       active={view === 'formats'}      count={PROMPT_STUDIO_SUMMARY.formats} onClick={() => setView('formats')} />
          <ViewTab label="Test Bench"       icon={FlaskConical}   active={view === 'test-bench'}   onClick={() => setView('test-bench')} />
          <ViewTab label="Version History"  icon={GitBranch}      active={view === 'history'}      onClick={() => setView('history')} />
          <ViewTab label="Quality Review"   icon={ClipboardCheck} active={view === 'quality'}      onClick={() => setView('quality')} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'create' && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <p className="text-sm font-semibold mb-1">Use the Action Panel →</p>
            <p className="text-[12px] leading-relaxed max-w-xs">
              Click <strong>New Template</strong> above. The creation form opens in the right panel so the library stays visible.
            </p>
          </div>
        )}
        {view === 'library'      && <LibraryView onSelectTemplate={handleLibrarySelect} />}
        {view === 'templates'    && <TemplatesView onOpenBrief={openBrief} onEdit={handleEditTemplate} />}
        {view === 'variables'    && <VariablesView />}
        {view === 'source-rules' && <SourceRulesView />}
        {view === 'formats'      && <OutputFormatsView />}
        {view === 'test-bench'   && <TestBenchView />}
        {view === 'history'      && <VersionHistoryView />}
        {view === 'quality'      && <QualityReviewView />}
      </div>
    </div>
    </StudioCtx.Provider>
  );
}
