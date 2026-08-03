import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, X, Search, Pencil, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  pennyCapabilities as ALL_CAPABILITIES,
  type PennyCapability,
  type CapabilityDomain,
  type CapabilityReadiness,
} from '@/data/pennyCapabilityData';

// ── Constants ─────────────────────────────────────────────────────────────────

const MATURITY_STAGES: CapabilityReadiness[] = [
  'Prototype', 'Defined', 'In Development', 'Integrated', 'Operational',
];

const DOMAIN_COLORS: Record<CapabilityDomain, string> = {
  Coaching:       'bg-[#EDF5F8] text-[#2F6F7E]',
  Career:         'bg-[#EDF5F8] text-[#2F6F7E]',
  Learning:       'bg-[#E6F0EA] text-[#2F6B3F]',
  Knowledge:      'bg-[#FFF3E0] text-[#CC8400]',
  Communications: 'bg-[#FFF3E0] text-[#CC8400]',
  Questing:       'bg-[#FBEAE6] text-[#A93F2F]',
  Operations:     'bg-gray-100 text-gray-600',
};

const FILTER_PILLS: { label: string; value: string }[] = [
  { label: 'All',       value: '' },
  { label: 'Coaching',  value: 'Coaching' },
  { label: 'Career',    value: 'Career' },
  { label: 'Learning',  value: 'Learning' },
  { label: 'Knowledge', value: 'Knowledge' },
  { label: 'Comms',     value: 'Communications' },
  { label: 'Questing',  value: 'Questing' },
];

const BASE_CAPABILITIES = ALL_CAPABILITIES.filter(
  c => c.pocStatus === 'exists' || c.pocStatus === 'partial'
);

// ── Add-form state shape ──────────────────────────────────────────────────────

interface AddFormData {
  name:             string;
  domain:           CapabilityDomain;
  maturity:         CapabilityReadiness;
  shortDescription: string;
  purpose:          string;
  audience:         string;
  trails:           string;
  inputs:           string;
  outputs:          string;
  nextSteps:        string;
}

const EMPTY_FORM: AddFormData = {
  name: '', domain: 'Coaching', maturity: 'Prototype',
  shortDescription: '', purpose: '', audience: '',
  trails: '', inputs: '', outputs: '', nextSteps: '',
};

// ── Shared micro-components ───────────────────────────────────────────────────

function DomainBadge({ domain }: { domain: CapabilityDomain }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold  ${DOMAIN_COLORS[domain]}`}>
      {domain === 'Communications' ? 'Comms' : domain}
    </span>
  );
}

function StatusChip({ pocStatus }: { pocStatus: 'exists' | 'partial' }) {
  const live = pocStatus === 'exists';
  return (
    <span className={`inline-flex items-center gap-1 text-[14px] font-medium ${live ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[#E6F0EA]0' : 'bg-[#CC8400]'}`} />
      {live ? 'Live' : 'Partial'}
    </span>
  );
}

function MaturityBadge({ maturity }: { maturity: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold  bg-muted text-muted-foreground">
      {maturity}
    </span>
  );
}

function Tag({
  label, onRemove, mono,
}: {
  label: string;
  onRemove?: () => void;
  mono?: boolean;
}) {
  return (
    <span className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground font-medium ${mono ? 'font-mono text-[14px]' : 'text-[14px]'}`}>
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
          aria-label={`Remove ${label}`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

function InlineTagInput({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  return (
    <form
      className="inline-flex"
      onSubmit={e => {
        e.preventDefault();
        const t = val.trim();
        if (t) { onAdd(t); setVal(''); }
      }}
    >
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="text-[14px] border border-dashed border-border rounded-full px-2 py-0.5 bg-white focus:outline-none focus:border-primary/50 w-24 placeholder:text-muted-foreground/40"
      />
    </form>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] font-bold text-muted-foreground  mb-2">
      {children}
    </p>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-[14px] font-semibold text-muted-foreground/60  w-24 shrink-0 mt-0.5">
        {label}
      </span>
      <div className="flex-1 flex flex-wrap gap-1 items-start">{children}</div>
    </div>
  );
}

// ── Maturity track ────────────────────────────────────────────────────────────

function MaturityTrack({
  maturity,
  onPromote,
}: {
  maturity: CapabilityReadiness;
  onPromote: (m: CapabilityReadiness) => void;
}) {
  const currentIdx = MATURITY_STAGES.indexOf(maturity);

  return (
    <div className="flex items-stretch gap-0 w-full rounded-lg overflow-hidden border border-border">
      {MATURITY_STAGES.map((stage, i) => {
        const isDone    = currentIdx >= 0 && i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture  = currentIdx < 0 ? true : i > currentIdx;

        return (
          <button
            key={stage}
            onClick={() => isFuture && onPromote(stage)}
            disabled={isDone || isCurrent}
            className={`flex-1 py-2 px-1.5 text-[14px] font-semibold text-center border-r border-border/50 last:border-0 transition-colors leading-tight ${
              isCurrent
                ? 'bg-primary/10 text-primary font-bold'
                : isDone
                  ? 'bg-[#E6F0EA] text-[#2F6B3F] cursor-default'
                  : 'bg-muted/30 text-muted-foreground hover:bg-primary/5 hover:text-primary cursor-pointer'
            }`}
            title={isFuture ? `Promote to ${stage}` : undefined}
          >
            {isDone && <span className="block text-[#2F6B3F] mb-0.5 text-[14px]">✓</span>}
            {stage}
          </button>
        );
      })}
    </div>
  );
}

// ── Capability detail panel ───────────────────────────────────────────────────

function CapabilityDetail({
  capability,
  onDelete,
  onUpdate,
}: {
  capability: PennyCapability;
  onDelete: () => void;
  onUpdate: (updated: PennyCapability) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<PennyCapability>(capability);

  useEffect(() => {
    if (!editing) setDraft(capability);
  }, [capability, editing]);

  function handleSave() {
    console.log('[Penny Capabilities] Save to Salesforce — not yet wired:', draft);
    onUpdate(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(capability);
    setEditing(false);
  }

  function removeFrom(field: keyof PennyCapability, value: string) {
    setDraft(d => ({ ...d, [field]: (d[field] as string[]).filter(v => v !== value) }));
  }

  function addTo(field: keyof PennyCapability, value: string) {
    setDraft(d => {
      const arr = d[field] as string[];
      return arr.includes(value) ? d : { ...d, [field]: [...arr, value] };
    });
  }

  const cap = editing ? draft : capability;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="text-[16px] font-medium text-foreground w-full border-b border-border focus:outline-none focus:border-primary pb-0.5 bg-transparent leading-snug"
              />
            ) : (
              <h2 className="text-[16px] font-medium text-foreground leading-snug">{cap.name}</h2>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <DomainBadge domain={cap.domain} />
              <StatusChip pocStatus={cap.pocStatus as 'exists' | 'partial'} />
              <MaturityBadge maturity={cap.maturity} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => editing ? handleCancel() : setEditing(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[14px] font-semibold transition-colors ${
                editing
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              <Pencil className="w-3 h-3" />
              {editing ? 'Editing…' : 'Edit'}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg border border-border bg-white text-muted-foreground hover:border-[#E8B9B4] hover:text-[#A93F2F] hover:bg-[#FBEAE6] transition-colors"
              aria-label="Delete capability"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5 space-y-6 max-w-2xl">

          {/* ── Section 1: Description ─────────────────────────────────── */}
          <div>
            <SectionLabel>Description</SectionLabel>
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <FieldRow label="What it does">
                {editing ? (
                  <input
                    value={draft.shortDescription}
                    onChange={e => setDraft(d => ({ ...d, shortDescription: e.target.value }))}
                    className="flex-1 text-[14px] text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:border-primary/50 bg-white"
                  />
                ) : (
                  <span className="text-[14px] text-foreground leading-relaxed">{cap.shortDescription}</span>
                )}
              </FieldRow>
              <FieldRow label="Audience">
                {cap.audience.map(a => (
                  <Tag key={a} label={a} onRemove={editing ? () => removeFrom('audience', a) : undefined} />
                ))}
                {editing && <InlineTagInput onAdd={v => addTo('audience', v)} placeholder="Add…" />}
              </FieldRow>
              <FieldRow label="Trails">
                {cap.relatedPrograms.map(p => (
                  <Tag key={p} label={p} onRemove={editing ? () => removeFrom('relatedPrograms', p) : undefined} />
                ))}
                {editing
                  ? <InlineTagInput onAdd={v => addTo('relatedPrograms', v)} placeholder="Add trail…" />
                  : (
                    <button
                      onClick={() => console.log('[Penny Capabilities] Add trail — not yet wired')}
                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-border text-[14px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" /> add
                    </button>
                  )
                }
              </FieldRow>
            </div>
          </div>

          {/* ── Section 2: How it works ────────────────────────────────── */}
          <div>
            <SectionLabel>How it works</SectionLabel>
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              <FieldRow label="Inputs">
                {cap.inputs.map(i => (
                  <Tag key={i} label={i} onRemove={editing ? () => removeFrom('inputs', i) : undefined} />
                ))}
                {editing && <InlineTagInput onAdd={v => addTo('inputs', v)} placeholder="Add input…" />}
              </FieldRow>
              <FieldRow label="Outputs">
                {cap.outputs.map(o => (
                  <Tag key={o} label={o} onRemove={editing ? () => removeFrom('outputs', o) : undefined} />
                ))}
                {editing && <InlineTagInput onAdd={v => addTo('outputs', v)} placeholder="Add output…" />}
              </FieldRow>
              <FieldRow label="Prompt template">
                <button
                  onClick={() => console.log('[Penny Capabilities] Navigate to Prompt Studio')}
                  className="flex items-center gap-1 text-[14px] text-primary font-medium hover:underline"
                >
                  {cap.name} <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </FieldRow>
            </div>
          </div>

          {/* ── Section 3: Maturity progress ───────────────────────────── */}
          <div>
            <SectionLabel>Maturity progress</SectionLabel>
            <MaturityTrack
              maturity={capability.maturity}
              onPromote={m => onUpdate({ ...capability, maturity: m })}
            />
          </div>

          {/* ── Section 4: Next steps ──────────────────────────────────── */}
          <div>
            <SectionLabel>Next steps to activate</SectionLabel>
            {editing ? (
              <textarea
                value={draft.nextSteps.join('\n')}
                onChange={e => setDraft(d => ({ ...d, nextSteps: e.target.value.split('\n') }))}
                rows={Math.max(draft.nextSteps.length + 1, 4)}
                placeholder="One step per line"
                className="w-full text-[14px] border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 bg-white resize-none"
              />
            ) : (
              <ol className="space-y-1.5">
                {cap.nextSteps.filter(Boolean).map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-foreground leading-snug">
                    <span className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[14px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* ── Section 5: Connected Salesforce objects ─────────────────── */}
          <div>
            <SectionLabel>Connected Salesforce objects</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {cap.relatedSfObjects.map(o => (
                <Tag key={o} label={o} mono onRemove={editing ? () => removeFrom('relatedSfObjects', o) : undefined} />
              ))}
              {editing
                ? <InlineTagInput onAdd={v => addTo('relatedSfObjects', v)} placeholder="API name…" />
                : (
                  <button
                    onClick={() => console.log('[Penny Capabilities] Add SF object — not yet wired')}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-border text-[14px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5" /> add
                  </button>
                )
              }
            </div>
          </div>

        </div>
      </ScrollArea>

      {/* Footer — visible in edit mode only */}
      {editing && (
        <div className="shrink-0 px-6 py-3 border-t border-border bg-background flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded-lg border border-border text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-foreground text-background text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            Save to Salesforce
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add capability form ───────────────────────────────────────────────────────

function AddCapabilityForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (cap: PennyCapability) => void;
}) {
  const [form, setForm] = useState<AddFormData>(EMPTY_FORM);

  function set(field: keyof AddFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit() {
    const newCap: PennyCapability = {
      id:                     `cap-custom-${Date.now()}`,
      name:                   form.name.trim(),
      domain:                 form.domain,
      maturity:               form.maturity,
      shortDescription:       form.shortDescription.trim(),
      purpose:                form.purpose.trim(),
      audience:               form.audience.split(',').map(s => s.trim()).filter(Boolean),
      inputs:                 form.inputs.split(',').map(s => s.trim()).filter(Boolean),
      outputs:                form.outputs.split(',').map(s => s.trim()).filter(Boolean),
      relatedPrograms:        form.trails.split(',').map(s => s.trim()).filter(Boolean),
      nextSteps:              form.nextSteps.split('\n').map(s => s.trim()).filter(Boolean),
      relatedSfObjects:       [],
      relatedKnowledgeSources:[],
      relatedCommChannels:    [],
      relatedCalendarEvents:  [],
      relatedStandards:       [],
      dependencies:           [],
      owner:                  '',
      futureIntegrationStatus:'',
      pocMapping:             '',
      pocStatus:              'partial',
    };
    console.log('[Penny Capabilities] Save to Salesforce — not yet wired:', newCap);
    onAdd(newCap);
  }

  const inputCls  = 'w-full text-[14px] border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary/50 bg-white placeholder:text-muted-foreground/40';
  const labelCls  = 'block text-[14px] font-semibold text-muted-foreground  mb-1';
  const hintCls   = 'text-[14px] text-muted-foreground mt-0.5';

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-[16px] font-medium text-foreground">Add a capability</h2>
        <p className="text-[14px] text-muted-foreground mt-1 leading-snug max-w-md">
          Define what Penny can do. This creates a record in Salesforce and makes the capability available to Prompt Studio.
        </p>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-w-2xl">

            {/* Name — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Capability name *</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Salary Negotiation Coach" className={inputCls} />
            </div>

            {/* Domain */}
            <div>
              <label className={labelCls}>Domain</label>
              <select value={form.domain} onChange={set('domain')} className={inputCls}>
                {(['Coaching','Career','Learning','Knowledge','Communications','Questing','Operations'] as CapabilityDomain[]).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Maturity */}
            <div>
              <label className={labelCls}>Maturity</label>
              <select value={form.maturity} onChange={set('maturity')} className={inputCls}>
                {(['Prototype','Defined','Planned','In Development','Integrated','Operational'] as CapabilityReadiness[]).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Short description — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Short description</label>
              <input value={form.shortDescription} onChange={set('shortDescription')} placeholder="One-line summary of what this capability does" className={inputCls} />
            </div>

            {/* Purpose — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Purpose</label>
              <textarea value={form.purpose} onChange={set('purpose')} placeholder="What does this capability do for learners or coaches?" rows={3} className={`${inputCls} resize-none`} />
            </div>

            {/* Audience */}
            <div>
              <label className={labelCls}>Audience</label>
              <input value={form.audience} onChange={set('audience')} placeholder="Learners, Coaches" className={inputCls} />
              <p className={hintCls}>Comma-separated</p>
            </div>

            {/* Trails in scope */}
            <div>
              <label className={labelCls}>Trails in scope</label>
              <input value={form.trails} onChange={set('trails')} placeholder="Foundations Trail, Guided Trail" className={inputCls} />
              <p className={hintCls}>Comma-separated</p>
            </div>

            {/* Inputs — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Inputs — what Penny needs</label>
              <input value={form.inputs} onChange={set('inputs')} placeholder="Learner context, Module data, Assessment scores" className={inputCls} />
              <p className={hintCls}>Comma-separated</p>
            </div>

            {/* Outputs — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Outputs — what Penny produces</label>
              <input value={form.outputs} onChange={set('outputs')} placeholder="Coaching message, Follow-up questions, Log entry" className={inputCls} />
              <p className={hintCls}>Comma-separated</p>
            </div>

            {/* Next steps — full width */}
            <div className="col-span-2">
              <label className={labelCls}>Next steps to activate</label>
              <textarea value={form.nextSteps} onChange={set('nextSteps')} placeholder={"Step 1\nStep 2\nStep 3"} rows={4} className={`${inputCls} resize-none`} />
              <p className={hintCls}>One step per line</p>
            </div>

          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 px-6 py-3 border-t border-border bg-background flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded-lg border border-border text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!form.name.trim()}
          className="px-4 py-1.5 rounded-lg bg-foreground text-background text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Save to Salesforce
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PennyCapabilityRegistry() {
  const [capabilities, setCapabilities] = useState<PennyCapability[]>(BASE_CAPABILITIES);
  const [selectedId,   setSelectedId]   = useState<string | null>(BASE_CAPABILITIES[0]?.id ?? null);
  const [isAdding,     setIsAdding]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [domainFilter, setDomainFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return capabilities.filter(c => {
      if (q && !c.name.toLowerCase().includes(q) && !c.shortDescription.toLowerCase().includes(q)) return false;
      if (domainFilter && c.domain !== domainFilter) return false;
      return true;
    });
  }, [capabilities, search, domainFilter]);

  const selected = capabilities.find(c => c.id === selectedId) ?? null;

  function handleAdd(newCap: PennyCapability) {
    setCapabilities(cs => [...cs, newCap]);
    setSelectedId(newCap.id);
    setIsAdding(false);
  }

  function handleUpdate(updated: PennyCapability) {
    setCapabilities(cs => cs.map(c => c.id === updated.id ? updated : c));
  }

  function handleDelete() {
    const nextId = filtered.find(c => c.id !== selectedId)?.id ?? null;
    setCapabilities(cs => cs.filter(c => c.id !== selectedId));
    setSelectedId(nextId);
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── Left panel: list ─────────────────────────────────────────────── */}
      <div className="w-[260px] shrink-0 flex flex-col border-r border-border bg-card">

        {/* List header */}
        <div className="px-3 pt-3 pb-2 border-b border-border/60 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-foreground">
              All capabilities
            </span>
            <button
              onClick={() => { setIsAdding(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground text-[14px] font-bold hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search capabilities…"
              className="w-full text-[14px] border border-border rounded-md pl-6 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Domain filter pills */}
          <div className="flex flex-wrap gap-1">
            {FILTER_PILLS.map(p => (
              <button
                key={p.label}
                onClick={() => setDomainFilter(p.value)}
                className={`px-2 py-0.5 rounded-full text-[14px] font-bold transition-colors ${
                  domainFilter === p.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-[14px] text-muted-foreground text-center">
              No capabilities match.
            </p>
          ) : (
            filtered.map(cap => {
              const isActive = cap.id === selectedId && !isAdding;
              return (
                <button
                  key={cap.id}
                  onClick={() => { setSelectedId(cap.id); setIsAdding(false); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                  }`}
                >
                  <p className={`text-[14px] font-medium leading-snug truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {cap.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <StatusChip pocStatus={cap.pocStatus as 'exists' | 'partial'} />
                    <DomainBadge domain={cap.domain} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: detail / add form ───────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {isAdding ? (
          <AddCapabilityForm
            onCancel={() => setIsAdding(false)}
            onAdd={handleAdd}
          />
        ) : selected ? (
          <CapabilityDetail
            key={selected.id}
            capability={selected}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <p className="text-[14px] font-medium text-foreground mb-1">Select a capability</p>
            <p className="text-[14px] max-w-xs">
              Choose a capability from the list, or click Add to define a new one.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
