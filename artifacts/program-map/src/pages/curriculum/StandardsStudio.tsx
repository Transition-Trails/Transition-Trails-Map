import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import {
  contentStandards as SEED_STANDARDS,
  gapReportItems,
  STANDARDS_SUMMARY, GAP_SUMMARY,
  STANDARD_STATUS_CONFIG, STANDARD_CONFIDENCE_CONFIG,
  STANDARD_CATEGORY_CONFIG, GAP_TYPE_CONFIG,
  type ContentStandard, type StandardCategory, type GapType,
  type StandardStatus, type StandardConfidence,
  type StandardField, type QualityCheck,
} from '@/data/standardsData';
import {
  BookCheck, ShieldCheck, ClipboardList, AlertTriangle,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Layers, BookOpen, Brain, Zap, Search, Filter, Plus, Sparkles,
  Pencil, X, Trash2, GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Types ──────────────────────────────────────────────────────────────────

type StudioView = 'overview' | 'standards' | 'checklist' | 'gap-report';

interface ChecklistFilter {
  objectType?: string;
  standardId?: string;
}

type NavigateFn = (view: StudioView, stdId?: string, filter?: ChecklistFilter) => void;

const CATEGORY_ICONS: Record<StandardCategory, typeof BookOpen> = {
  'Program Architecture': Layers,
  'Learning Content':     BookOpen,
  'Penny Assets':         Brain,
  'Delivery Assets':      Zap,
};

const CATEGORY_ORDER: StandardCategory[] = [
  'Program Architecture', 'Learning Content', 'Penny Assets', 'Delivery Assets',
];

const CATEGORIES: StandardCategory[] = [...CATEGORY_ORDER];
const STATUSES: StandardStatus[]     = ['active', 'review', 'draft'];
const CONFIDENCES: StandardConfidence[] = ['high', 'medium', 'low'];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function blankStandard(): ContentStandard {
  return {
    id: `std-${uid()}`,
    name: '',
    objectType: '',
    category: 'Learning Content',
    purpose: '',
    whyItMatters: '',
    howPennyUsesIt: '',
    exampleOutput: '',
    sfMapping: '',
    lmsMapping: '',
    relatedKnowledgeCategory: '',
    relatedContentObjects: [],
    owner: '',
    reviewCycle: 'Quarterly',
    status: 'draft',
    confidence: 'medium',
    requiredFields: [],
    qualityCriteria: [],
    pennyChecks: [],
  };
}

// ── StandardEditDrawer ─────────────────────────────────────────────────────

type DrawerTab = 'basic' | 'content' | 'fields' | 'checks' | 'mappings';

function StandardEditDrawer({
  standard,
  onSave,
  onClose,
}: {
  standard: ContentStandard | null; // null = create mode
  onSave: (std: ContentStandard) => void;
  onClose: () => void;
}) {
  const isCreate = standard === null;
  const [draft, setDraft] = useState<ContentStandard>(() =>
    standard ? { ...standard, requiredFields: standard.requiredFields.map(f => ({ ...f })), qualityCriteria: [...standard.qualityCriteria], pennyChecks: standard.pennyChecks.map(c => ({ ...c })), relatedContentObjects: [...standard.relatedContentObjects] } : blankStandard()
  );
  const [tab, setTab] = useState<DrawerTab>('basic');
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  function handleSave() {
    if (!draft.name.trim()) { setTab('basic'); return; }
    onSave(draft);
    close();
  }

  function set<K extends keyof ContentStandard>(key: K, val: ContentStandard[K]) {
    setDraft(d => ({ ...d, [key]: val }));
  }

  // Required fields
  function addField() {
    setDraft(d => ({ ...d, requiredFields: [...d.requiredFields, { field: '', description: '', required: true }] }));
  }
  function updateField(i: number, patch: Partial<StandardField>) {
    setDraft(d => { const arr = d.requiredFields.map((f, j) => j === i ? { ...f, ...patch } : f); return { ...d, requiredFields: arr }; });
  }
  function removeField(i: number) {
    setDraft(d => ({ ...d, requiredFields: d.requiredFields.filter((_, j) => j !== i) }));
  }

  // Quality criteria
  function addCriteria() {
    setDraft(d => ({ ...d, qualityCriteria: [...d.qualityCriteria, ''] }));
  }
  function updateCriteria(i: number, val: string) {
    setDraft(d => { const arr = [...d.qualityCriteria]; arr[i] = val; return { ...d, qualityCriteria: arr }; });
  }
  function removeCriteria(i: number) {
    setDraft(d => ({ ...d, qualityCriteria: d.qualityCriteria.filter((_, j) => j !== i) }));
  }

  // Penny checks
  function addCheck() {
    setDraft(d => ({ ...d, pennyChecks: [...d.pennyChecks, { id: `chk-${uid()}`, check: '', passing: '', failing: '', required: true }] }));
  }
  function updateCheck(i: number, patch: Partial<QualityCheck>) {
    setDraft(d => { const arr = d.pennyChecks.map((c, j) => j === i ? { ...c, ...patch } : c); return { ...d, pennyChecks: arr }; });
  }
  function removeCheck(i: number) {
    setDraft(d => ({ ...d, pennyChecks: d.pennyChecks.filter((_, j) => j !== i) }));
  }

  // Related objects (comma-separated)
  function relatedStr() { return draft.relatedContentObjects.join(', '); }
  function setRelated(val: string) {
    set('relatedContentObjects', val.split(',').map(s => s.trim()).filter(Boolean));
  }

  const TABS: { id: DrawerTab; label: string }[] = [
    { id: 'basic',    label: 'Basic Info' },
    { id: 'content',  label: 'Content' },
    { id: 'fields',   label: `Fields (${draft.requiredFields.length})` },
    { id: 'checks',   label: `Checks (${draft.pennyChecks.length})` },
    { id: 'mappings', label: 'Mappings' },
  ];

  const nameEmpty = !draft.name.trim();

  return (
    <>
      {/* Scrim */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[580px] max-w-full bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-250 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">
              {isCreate ? 'New Content Standard' : 'Edit Standard'}
            </p>
            <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          {draft.name ? (
            <h2 className="text-base font-semibold text-foreground truncate">{draft.name}</h2>
          ) : (
            <p className="text-base text-muted-foreground/40 italic">Untitled standard…</p>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-0 mt-3 border-b border-border -mb-3">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">

            {/* ── BASIC TAB ── */}
            {tab === 'basic' && (
              <>
                <Field label="Standard Name" required error={nameEmpty && 'Name is required'}>
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    value={draft.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Knowledge Article"
                    autoFocus
                  />
                </Field>

                <Field label="Object Type">
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    value={draft.objectType}
                    onChange={e => set('objectType', e.target.value)}
                    placeholder="e.g. Knowledge Article"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                      value={draft.category}
                      onChange={e => set('category', e.target.value as StandardCategory)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Status">
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                      value={draft.status}
                      onChange={e => set('status', e.target.value as StandardStatus)}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STANDARD_STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Confidence">
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                      value={draft.confidence}
                      onChange={e => set('confidence', e.target.value as StandardConfidence)}
                    >
                      {CONFIDENCES.map(c => <option key={c} value={c}>{STANDARD_CONFIDENCE_CONFIG[c].label}</option>)}
                    </select>
                  </Field>

                  <Field label="Review Cycle">
                    <input
                      className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                      value={draft.reviewCycle}
                      onChange={e => set('reviewCycle', e.target.value)}
                      placeholder="e.g. Quarterly"
                    />
                  </Field>
                </div>

                <Field label="Owner">
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    value={draft.owner}
                    onChange={e => set('owner', e.target.value)}
                    placeholder="e.g. Curriculum Lead"
                  />
                </Field>

                {/* Status preview */}
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Preview</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${STANDARD_CATEGORY_CONFIG[draft.category].cls}`}>{draft.category}</span>
                    <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${STANDARD_STATUS_CONFIG[draft.status].cls}`}>{STANDARD_STATUS_CONFIG[draft.status].label}</span>
                    <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${STANDARD_CONFIDENCE_CONFIG[draft.confidence].cls}`}>{STANDARD_CONFIDENCE_CONFIG[draft.confidence].label}</span>
                  </div>
                </div>
              </>
            )}

            {/* ── CONTENT TAB ── */}
            {tab === 'content' && (
              <>
                <Field label="Purpose" hint="What does this standard define?">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={4}
                    value={draft.purpose}
                    onChange={e => set('purpose', e.target.value)}
                    placeholder="Provide a reference-grade explanation of…"
                  />
                </Field>

                <Field label="Why It Matters" hint="What breaks without this standard?">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                    value={draft.whyItMatters}
                    onChange={e => set('whyItMatters', e.target.value)}
                    placeholder="Without this standard, Penny will…"
                  />
                </Field>

                <Field label={`How ${TERMS.aiAssistant} Uses It`} hint="Penny reads this at generation time">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                    value={draft.howPennyUsesIt}
                    onChange={e => set('howPennyUsesIt', e.target.value)}
                    placeholder="Before generating content, Penny reads…"
                  />
                </Field>

                <Field label="Example Output" hint="Concrete illustration of a passing object">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                    value={draft.exampleOutput}
                    onChange={e => set('exampleOutput', e.target.value)}
                    placeholder="A knowledge article that meets this standard looks like…"
                  />
                </Field>

                {/* Quality criteria */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[12px] font-semibold text-foreground">Quality Criteria</label>
                    <button onClick={addCriteria} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors">
                      <Plus className="w-3 h-3" /> Add criterion
                    </button>
                  </div>
                  <div className="space-y-2">
                    {draft.qualityCriteria.length === 0 && (
                      <p className="text-[12px] text-muted-foreground/50 italic">No quality criteria yet — add one above.</p>
                    )}
                    {draft.qualityCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
                        <input
                          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                          value={c}
                          onChange={e => updateCriteria(i, e.target.value)}
                          placeholder="Quality criterion…"
                        />
                        <button onClick={() => removeCriteria(i)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── FIELDS TAB ── */}
            {tab === 'fields' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Required Fields</p>
                    <p className="text-[12px] text-muted-foreground">Fields that content objects matching this standard must have.</p>
                  </div>
                  <button onClick={addField} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors border border-primary/30 rounded-full px-2.5 py-1">
                    <Plus className="w-3 h-3" /> Add field
                  </button>
                </div>

                {draft.requiredFields.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-border">
                    <p className="text-[13px] text-muted-foreground/50">No fields defined yet.</p>
                    <button onClick={addField} className="mt-2 text-[12px] font-semibold text-primary">Add the first field</button>
                  </div>
                )}

                <div className="space-y-2">
                  {draft.requiredFields.map((f, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            className="flex-1 h-7 rounded-md border border-input bg-background px-2.5 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                            value={f.field}
                            onChange={e => updateField(i, { field: e.target.value })}
                            placeholder="Field name"
                          />
                        </div>
                        <button
                          onClick={() => updateField(i, { required: !f.required })}
                          className={`flex-shrink-0 text-[11px] font-bold border rounded-full px-2 py-0.5 transition-colors ${
                            f.required
                              ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4] hover:bg-[#FBEAE6]/70'
                              : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {f.required ? 'Required' : 'Optional'}
                        </button>
                        <button onClick={() => removeField(i)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        rows={2}
                        value={f.description}
                        onChange={e => updateField(i, { description: e.target.value })}
                        placeholder="Description of what this field should contain…"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CHECKS TAB ── */}
            {tab === 'checks' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{TERMS.aiAssistant} Quality Checks</p>
                    <p className="text-[12px] text-muted-foreground">Pass/fail criteria Penny runs against this content type.</p>
                  </div>
                  <button onClick={addCheck} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors border border-primary/30 rounded-full px-2.5 py-1">
                    <Plus className="w-3 h-3" /> Add check
                  </button>
                </div>

                {draft.pennyChecks.length === 0 && (
                  <div className="text-center py-8 rounded-lg border border-dashed border-border">
                    <p className="text-[13px] text-muted-foreground/50">No quality checks defined yet.</p>
                    <button onClick={addCheck} className="mt-2 text-[12px] font-semibold text-primary">Add the first check</button>
                  </div>
                )}

                <div className="space-y-3">
                  {draft.pennyChecks.map((chk, i) => (
                    <div key={chk.id} className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 h-7 rounded-md border border-input bg-background px-2.5 text-[13px] font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                          value={chk.check}
                          onChange={e => updateCheck(i, { check: e.target.value })}
                          placeholder="Check description…"
                        />
                        <button
                          onClick={() => updateCheck(i, { required: !chk.required })}
                          className={`flex-shrink-0 text-[11px] font-bold border rounded-full px-2 py-0.5 transition-colors ${
                            chk.required
                              ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]'
                              : 'text-slate-500 bg-slate-50 border-slate-200'
                          }`}
                        >
                          {chk.required ? 'Required' : 'Optional'}
                        </button>
                        <button onClick={() => removeCheck(i)} className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-1.5" />
                          <input
                            className="flex-1 h-7 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                            value={chk.passing}
                            onChange={e => updateCheck(i, { passing: e.target.value })}
                            placeholder="Passing example…"
                          />
                        </div>
                        <div className="flex items-start gap-2">
                          <XCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-1.5" />
                          <input
                            className="flex-1 h-7 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-ring"
                            value={chk.failing}
                            onChange={e => updateCheck(i, { failing: e.target.value })}
                            placeholder="Failing example…"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MAPPINGS TAB ── */}
            {tab === 'mappings' && (
              <>
                <Field label="Salesforce Mapping" hint="Which SF objects does this standard govern?">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                    value={draft.sfMapping}
                    onChange={e => set('sfMapping', e.target.value)}
                    placeholder="e.g. Knowledge__c — Salesforce Knowledge article object"
                  />
                </Field>

                <Field label="LMS Mapping" hint="How this maps to the LMS course structure">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={3}
                    value={draft.lmsMapping}
                    onChange={e => set('lmsMapping', e.target.value)}
                    placeholder="e.g. Course unit in LMS, linked via Learner_Course_Module__c"
                  />
                </Field>

                <Field label="Related Knowledge Category">
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    value={draft.relatedKnowledgeCategory}
                    onChange={e => set('relatedKnowledgeCategory', e.target.value)}
                    placeholder="e.g. Program Architecture"
                  />
                </Field>

                <Field label="Related Content Objects" hint="Comma-separated list">
                  <input
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-[13px] focus:outline-none focus:ring-1 focus:ring-ring"
                    value={relatedStr()}
                    onChange={e => setRelated(e.target.value)}
                    placeholder="e.g. Module, Lesson, Assessment"
                  />
                  {draft.relatedContentObjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {draft.relatedContentObjects.map(o => (
                        <span key={o} className="text-[11px] font-medium border border-border bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{o}</span>
                      ))}
                    </div>
                  )}
                </Field>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-background flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={nameEmpty}
            className="flex-1 h-9 bg-foreground text-background rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreate ? 'Create Standard' : 'Save Changes'}
          </button>
          <button
            onClick={close}
            className="h-9 px-4 rounded-lg border border-border text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Field helper ───────────────────────────────────────────────────────────

function Field({ label, hint, required, error, children }: {
  label: string; hint?: string; required?: boolean; error?: string | false; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <label className="text-[12px] font-semibold text-foreground">{label}</label>
        {required && <span className="text-[11px] text-[#A93F2F]">*</span>}
        {hint && <span className="text-[11px] text-muted-foreground/60 ml-1">— {hint}</span>}
      </div>
      {children}
      {error && <p className="text-[11px] text-[#A93F2F]">{error}</p>}
    </div>
  );
}

// ── StandardRow ────────────────────────────────────────────────────────────

function StandardRow({
  std, selected, onSelect,
}: {
  std: ContentStandard; selected: boolean; onSelect: () => void;
}) {
  const catCfg    = STANDARD_CATEGORY_CONFIG[std.category];
  const statusCfg = STANDARD_STATUS_CONFIG[std.status];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-background border-border hover:border-foreground/20 hover:bg-muted/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[14px] font-bold leading-snug ${selected ? 'text-background' : 'text-foreground'}`}>{std.name}</p>
          <p className={`text-[14px] mt-0.5 truncate ${selected ? 'text-background/60' : 'text-muted-foreground'}`}>{std.category}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${selected ? 'bg-background/20 text-background border-background/30' : statusCfg.cls}`}>{statusCfg.label}</span>
          <span className={`text-[14px] font-medium ${selected ? 'text-background/50' : 'text-muted-foreground/60'}`}>{std.pennyChecks.length} checks</span>
        </div>
      </div>
    </button>
  );
}

// ── StandardDetail ─────────────────────────────────────────────────────────

function StandardDetail({
  std, onOpenBrief, onEdit,
}: {
  std: ContentStandard; onOpenBrief: () => void; onEdit: () => void;
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['fields', 'criteria']));
  const statusCfg     = STANDARD_STATUS_CONFIG[std.status];
  const confidenceCfg = STANDARD_CONFIDENCE_CONFIG[std.confidence];
  const catCfg        = STANDARD_CATEGORY_CONFIG[std.category];

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
          <span className="text-[14px] font-bold text-foreground">{label}</span>
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
              <p className="text-[14px] font-bold text-muted-foreground/60 mb-0.5">Content Standard</p>
              <h3 className="text-lg font-bold text-foreground">{std.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-[14px] font-bold text-muted-foreground border border-border rounded-full px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={onOpenBrief}
                className="text-[14px] font-bold text-primary border border-primary/30 rounded-full px-2 py-1 hover:bg-primary/5"
              >
                {TERMS.knowledgeBrief}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[14px] font-bold border rounded-full px-2 py-0.5 ${catCfg.cls}`}>{std.category}</span>
            <span className={`text-[14px] font-bold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
            <span className={`text-[14px] font-bold border rounded-full px-2 py-0.5 ${confidenceCfg.cls}`}>{confidenceCfg.label}</span>
          </div>
        </div>

        {/* Purpose */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
          <p className="text-[14px] font-bold text-primary/70 mb-1">Purpose</p>
          <p className="text-[14px] text-foreground leading-relaxed">{std.purpose || <span className="text-muted-foreground/40 italic">No purpose defined.</span>}</p>
        </div>

        {/* Why it matters */}
        <div className="rounded-lg border border-[#FFF3E0] bg-[#FFF3E0]/50 p-3">
          <p className="text-[14px] font-bold text-[#CC8400] mb-1">Why It Matters</p>
          <p className="text-[14px] text-[#CC8400] leading-relaxed">{std.whyItMatters || <span className="opacity-50 italic">Not defined.</span>}</p>
        </div>

        {/* Required Fields */}
        <Section id="fields" label={`Required Fields (${std.requiredFields.length})`}>
          {std.requiredFields.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/50 italic">No fields defined — click Edit to add them.</p>
          ) : (
            <div className="space-y-1.5">
              {std.requiredFields.map(f => (
                <div key={f.field} className="flex items-start gap-2">
                  <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 mt-0.5 ${f.required ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {f.required ? 'Req' : 'Opt'}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{f.field}</p>
                    <p className="text-[14px] text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Quality Criteria */}
        <Section id="criteria" label="Quality Criteria">
          {std.qualityCriteria.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/50 italic">No criteria defined — click Edit to add them.</p>
          ) : (
            <div className="space-y-1.5">
              {std.qualityCriteria.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0 mt-0.5" />
                  <p className="text-[14px] text-foreground">{c}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Penny Checks */}
        <Section id="checks" label={`${TERMS.aiAssistant} Checks (${std.pennyChecks.length})`}>
          {std.pennyChecks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/50 italic">No quality checks defined — click Edit to add them.</p>
          ) : (
            <div className="space-y-2">
              {std.pennyChecks.map(chk => (
                <div key={chk.id} className="rounded border border-border bg-muted/20 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${chk.required ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>{chk.required ? 'Required' : 'Optional'}</span>
                    <p className="text-[14px] font-semibold text-foreground">{chk.check}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1 pl-1">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0 mt-0.5" />
                      <p className="text-[14px] text-muted-foreground">{chk.passing}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 text-[#A93F2F] shrink-0 mt-0.5" />
                      <p className="text-[14px] text-muted-foreground">{chk.failing}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Example Output */}
        <Section id="example" label="Example Output">
          <div className="rounded-lg border border-secondary/15 bg-secondary/5 p-3">
            <p className="text-[14px] text-foreground/80 italic leading-relaxed">{std.exampleOutput || <span className="not-italic text-muted-foreground/40">Not defined.</span>}</p>
          </div>
        </Section>

        {/* How Penny Uses It */}
        <Section id="penny" label={`How ${TERMS.aiAssistant} Uses This Standard`}>
          <p className="text-[14px] text-foreground leading-relaxed">{std.howPennyUsesIt || <span className="text-muted-foreground/40 italic">Not defined.</span>}</p>
        </Section>

        {/* Mappings */}
        <Section id="mappings" label="Salesforce & LMS Mapping">
          <div className="space-y-2">
            <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] p-2.5">
              <p className="text-[14px] font-bold text-[#2F6F7E] mb-0.5">Salesforce</p>
              <p className="text-[14px] text-[#2F6F7E]">{std.sfMapping || <span className="italic opacity-50">Not mapped.</span>}</p>
            </div>
            <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] p-2.5">
              <p className="text-[14px] font-bold text-[#2F6F7E] mb-0.5">LMS</p>
              <p className="text-[14px] text-[#2F6F7E]">{std.lmsMapping || <span className="italic opacity-50">Not mapped.</span>}</p>
            </div>
          </div>
        </Section>

        {/* Meta */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
          <div><span className="text-muted-foreground">Owner</span><p className="font-semibold text-foreground">{std.owner || '—'}</p></div>
          <div><span className="text-muted-foreground">Review Cycle</span><p className="font-semibold text-foreground">{std.reviewCycle || '—'}</p></div>
          <div><span className="text-muted-foreground">Knowledge Category</span><p className="font-semibold text-foreground">{std.relatedKnowledgeCategory || '—'}</p></div>
          <div>
            <span className="text-muted-foreground">Related Objects</span>
            {std.relatedContentObjects.length === 0 ? (
              <p className="text-muted-foreground/40 italic text-[13px] mt-0.5">None</p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {std.relatedContentObjects.map(o => (
                  <span key={o} className="text-[14px] font-medium border border-border bg-background rounded-full px-1.5 py-0.5 text-muted-foreground">{o}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Overview View ──────────────────────────────────────────────────────────

function OverviewView({
  standards,
  onNavigate,
}: {
  standards: ContentStandard[];
  onNavigate: NavigateFn;
}) {
  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    stds: standards.filter(s => s.category === cat),
  }));

  const reqChecks = standards.reduce((n, s) => n + s.pennyChecks.filter(c => c.required).length, 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">

        {/* Quick-action nav cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('checklist')}
            className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-left hover:bg-secondary/10 transition-colors flex items-center gap-3"
          >
            <ClipboardList className="w-4 h-4 text-secondary shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-foreground">Standards Checklist</p>
              <p className="text-[12px] text-muted-foreground">{reqChecks} required checks · run against any content object</p>
            </div>
          </button>
          <button
            onClick={() => onNavigate('gap-report')}
            className="rounded-xl border border-[#E8B9B4] bg-[#FBEAE6]/60 px-4 py-3 text-left hover:bg-[#FBEAE6] transition-colors flex items-center gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-[#A93F2F] shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-foreground">Gap Report</p>
              <p className="text-[12px] text-muted-foreground">
                {standards.length === 0
                  ? 'Add standards to enable gap analysis'
                  : `${GAP_SUMMARY.bySeverity.high} high-severity gaps need attention`}
              </p>
            </div>
          </button>
        </div>

        {standards.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/10 px-4 py-8 text-center">
            <BookCheck className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-foreground mb-1">No content standards yet</p>
            <p className="text-[12px] text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
              Add your first standard using the button in the top-right corner. Standards guide how {TERMS.aiAssistant} generates and validates content.
            </p>
          </div>
        ) : (
          byCategory.map(({ cat, stds }) => {
            if (stds.length === 0) return null;
            const Icon   = CATEGORY_ICONS[cat];
            const catCfg = STANDARD_CATEGORY_CONFIG[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-[14px] font-bold text-foreground">{cat}</h3>
                  <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.cls}`}>{stds.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stds.map(std => {
                    const statusCfg = STANDARD_STATUS_CONFIG[std.status];
                    return (
                      <button
                        key={std.id}
                        onClick={() => onNavigate('standards', std.id)}
                        className="text-left rounded-lg border border-border bg-background hover:border-foreground/20 hover:bg-muted/20 p-3 transition-all"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-[14px] font-bold text-foreground">{std.name}</p>
                          <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ml-1 ${statusCfg.cls}`}>{statusCfg.label}</span>
                        </div>
                        <p className="text-[14px] text-muted-foreground leading-snug line-clamp-2">{std.purpose}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[14px] text-muted-foreground/70">{std.pennyChecks.length} checks · Owner: {std.owner || '—'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

      </div>
    </ScrollArea>
  );
}

// ── Standards Browser View ─────────────────────────────────────────────────

function StandardsBrowserView({
  standards,
  initialStdId,
  onOpenBrief,
  onEdit,
}: {
  standards: ContentStandard[];
  initialStdId?: string;
  onOpenBrief: (std: ContentStandard) => void;
  onEdit: (std: ContentStandard) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(initialStdId ?? (standards[0]?.id ?? ''));
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState<StandardCategory | 'all'>('all');

  // keep selection valid if standards list changes
  useEffect(() => {
    if (!standards.find(s => s.id === selectedId) && standards.length > 0) {
      setSelectedId(standards[0].id);
    }
  }, [standards, selectedId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return standards.filter(s => {
      const matchesCat = filterCat === 'all' || s.category === filterCat;
      const matchesQ   = !q || s.name.toLowerCase().includes(q) || s.purpose.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [search, filterCat, standards]);

  const selected = standards.find(s => s.id === selectedId) ?? standards[0];

  if (!selected) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-[14px]">No standards yet — create one above.</div>
  );

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
              className="pl-7 h-7 text-[14px] bg-background"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as StandardCategory | 'all')}
            className="w-full h-7 text-[14px] rounded-md border border-input bg-background px-2"
          >
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-[14px] text-muted-foreground text-center py-6">No standards match.</p>
            )}
            {CATEGORY_ORDER.map(cat => {
              const catStds = filtered.filter(s => s.category === cat);
              if (catStds.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[14px] font-bold text-muted-foreground/50 px-1 py-1.5">{cat}</p>
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
        <StandardDetail
          std={selected}
          onOpenBrief={() => onOpenBrief(selected)}
          onEdit={() => onEdit(selected)}
        />
      </div>
    </div>
  );
}

// ── Checklist View ─────────────────────────────────────────────────────────

type CheckState = 'pass' | 'fail' | 'unchecked';

function ChecklistView({
  standards,
  initialFilter,
}: {
  standards: ContentStandard[];
  initialFilter?: ChecklistFilter;
}) {
  const [states, setStates]         = useState<Record<string, CheckState>>({});
  const [filterType, setFilterType] = useState<string>(initialFilter?.objectType ?? 'all');
  const sectionRefs                 = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll to the focused standard section once the view has rendered
  useEffect(() => {
    if (initialFilter?.standardId) {
      const el = sectionRefs.current[initialFilter.standardId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Only run on mount / when the filter identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilter?.standardId]);

  const objectTypes = Array.from(new Set(standards.map(s => s.objectType)));

  const shownStandards = filterType === 'all'
    ? standards
    : standards.filter(s => s.objectType === filterType);

  function cycle(id: string) {
    setStates(prev => {
      const cur = prev[id] ?? 'unchecked';
      return { ...prev, [id]: cur === 'unchecked' ? 'pass' : cur === 'pass' ? 'fail' : 'unchecked' };
    });
  }

  const allChecks = shownStandards.flatMap(s => s.pennyChecks.map(c => ({ ...c, stdId: s.id })));
  const passCount = allChecks.filter(c => states[c.id] === 'pass').length;
  const failCount = allChecks.filter(c => states[c.id] === 'fail').length;
  const total     = allChecks.length;
  const pct       = total === 0 ? 0 : Math.round((passCount / total) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setStates({}); }}
            className="h-7 text-[14px] rounded-md border border-input bg-background px-2"
          >
            <option value="all">All object types</option>
            {objectTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-[14px] text-muted-foreground">{total} checks · Click to cycle: → ✓ Pass → ✗ Fail → unchecked</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#2F6B3F]">{passCount} pass</span>
              <span className="text-[14px] font-semibold text-[#A93F2F]">{failCount} fail</span>
              <span className="text-[14px] text-muted-foreground">{pct}% complete</span>
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[#2F6B3F] transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <button onClick={() => setStates({})} className="text-[14px] font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-1 hover:bg-muted transition-colors">Reset</button>
        </div>
      </div>

      {/* Focus banner — shown when jumping from a gap row */}
      {initialFilter?.objectType && (
        <div className="px-5 py-2 border-b border-primary/20 bg-primary/5 flex items-center gap-2 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-[12px] text-primary font-semibold">
            Focused on <span className="font-bold">{initialFilter.objectType}</span> checks
            {initialFilter.standardId && (() => {
              const std = standards.find(s => s.id === initialFilter.standardId);
              return std ? <> — <span className="font-bold">{std.name}</span> standard highlighted</> : null;
            })()}
          </p>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {shownStandards.length === 0 && standards.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/10 px-4 py-8 text-center">
              <ClipboardList className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-foreground mb-1">No standards to check against</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                Add a standard to generate a runnable checklist of {TERMS.aiAssistant} quality checks.
              </p>
            </div>
          )}
          {shownStandards.map(std => {
            const catCfg    = STANDARD_CATEGORY_CONFIG[std.category];
            const stdPass   = std.pennyChecks.filter(c => states[c.id] === 'pass').length;
            const stdFail   = std.pennyChecks.filter(c => states[c.id] === 'fail').length;
            const isFocused = initialFilter?.standardId === std.id;
            return (
              <div
                key={std.id}
                ref={el => { sectionRefs.current[std.id] = el; }}
                className={`rounded-xl border bg-background overflow-hidden transition-colors ${
                  isFocused ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                }`}
              >
                <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[14px] font-bold text-foreground">{std.name}</span>
                    <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${catCfg.cls}`}>{std.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stdPass > 0 && <span className="text-[14px] font-semibold text-[#2F6B3F]">{stdPass} pass</span>}
                    {stdFail > 0 && <span className="text-[14px] font-semibold text-[#A93F2F]">{stdFail} fail</span>}
                    <span className="text-[14px] text-muted-foreground">{std.pennyChecks.length} checks</span>
                  </div>
                </div>
                {std.pennyChecks.length === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-muted-foreground/50 italic">No checks defined for this standard.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {std.pennyChecks.map(chk => {
                      const state = states[chk.id] ?? 'unchecked';
                      return (
                        <button
                          key={chk.id}
                          onClick={() => cycle(chk.id)}
                          className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-muted/20 transition-colors ${
                            state === 'pass' ? 'bg-[#E6F0EA]/50' : state === 'fail' ? 'bg-[#FBEAE6]/50' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            state === 'pass' ? 'bg-[#2F6B3F] border-[#2F6B3F]' : state === 'fail' ? 'bg-[#A93F2F] border-[#A93F2F]' : 'bg-background border-muted-foreground/30'
                          }`}>
                            {state === 'pass' && <CheckCircle2 className="w-3 h-3 text-white" />}
                            {state === 'fail' && <XCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-[14px] font-semibold text-foreground">{chk.check}</p>
                              {chk.required && <span className="text-[14px] font-bold text-[#A93F2F] bg-[#FBEAE6] border border-[#E8B9B4] rounded-full px-1.5 py-0.5">Required</span>}
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="flex items-start gap-1">
                                <span className="text-[14px] font-bold text-[#2F6B3F] shrink-0 mt-0.5">✓</span>
                                <p className="text-[14px] text-muted-foreground">{chk.passing}</p>
                              </div>
                              <div className="flex items-start gap-1">
                                <span className="text-[14px] font-bold text-[#A93F2F] shrink-0 mt-0.5">✗</span>
                                <p className="text-[14px] text-muted-foreground">{chk.failing}</p>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
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

// ── Gap Report View ────────────────────────────────────────────────────────

function GapReportView({
  standards,
  onNavigate,
}: {
  standards: ContentStandard[];
  onNavigate: NavigateFn;
}) {
  const { setSelectedItem } = useAppContext();
  const [filterType, setFilterType] = useState<GapType | 'all'>('all');
  const [filterSev, setFilterSev]   = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [focusedId, setFocusedId]   = useState<string | null>(null);

  const filtered = useMemo(() =>
    gapReportItems.filter(g =>
      (filterType === 'all' || g.gapType === filterType) &&
      (filterSev  === 'all' || g.severity === filterSev)
    ), [filterType, filterSev]);

  const sevCls: Record<string, string> = {
    high:   'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',
    medium: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    low:    'text-slate-600 bg-slate-50 border-slate-200',
  };

  function selectGap(gap: (typeof gapReportItems)[0]) {
    const std = standards.find(s => s.id === gap.standardId);
    setFocusedId(gap.id);
    setSelectedItem({ type: 'gapReportItem', id: gap.id, data: { gap, std } });
  }

  function fixGap(gap: (typeof gapReportItems)[0]) {
    // Route to the most actionable destination for this gap type:
    // missing-field → Checklist pre-filtered to the gap's object type and standard
    // everything else → Standards browser focused on the violating standard
    if (gap.gapType === 'missing-field') {
      onNavigate('checklist', undefined, { objectType: gap.objectType, standardId: gap.standardId });
    } else {
      onNavigate('standards', gap.standardId);
    }
  }

  // When there are no standards, the static gap records have no parent to resolve against —
  // show an empty state rather than a list with broken "fix" navigation.
  if (standards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-[260px]">
          <AlertTriangle className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-foreground mb-1">No standards configured</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            The gap report analyses your content against active standards.
            Add at least one standard to begin gap analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-4 flex-shrink-0 bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: `${GAP_SUMMARY.bySeverity.high} High`,   cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
            { label: `${GAP_SUMMARY.bySeverity.medium} Medium`, cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
            { label: `${GAP_SUMMARY.bySeverity.low} Low`,      cls: 'text-slate-600 bg-slate-50 border-slate-200' },
          ].map(s => (
            <span key={s.label} className={`text-[14px] font-bold border rounded-full px-2 py-0.5 ${s.cls}`}>{s.label}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as GapType | 'all')} className="h-7 text-[14px] rounded-md border border-input bg-background px-2">
            <option value="all">All gap types</option>
            {(Object.keys(GAP_TYPE_CONFIG) as GapType[]).map(t => <option key={t} value={t}>{GAP_TYPE_CONFIG[t].label}</option>)}
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value as typeof filterSev)} className="h-7 text-[14px] rounded-md border border-input bg-background px-2">
            <option value="all">All severities</option>
            <option value="high">High only</option>
            <option value="medium">Medium only</option>
            <option value="low">Low only</option>
          </select>
          <span className="text-[14px] text-muted-foreground">{filtered.length} gaps</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-[#2F6B3F] mx-auto mb-2" />
              <p className="text-[14px] font-semibold text-foreground">No gaps match the current filters.</p>
            </div>
          )}
          {filtered.map(gap => {
            const typeCfg   = GAP_TYPE_CONFIG[gap.gapType];
            const isFocused = focusedId === gap.id;
            return (
              <button
                key={gap.id}
                onClick={() => selectGap(gap)}
                onDoubleClick={e => { e.preventDefault(); fixGap(gap); }}
                title="Double-click to go to the fix"
                className={`group w-full text-left rounded-xl border overflow-hidden transition-all flex items-start gap-3 px-4 py-3 hover:border-foreground/20 hover:bg-muted/10 ${
                  isFocused ? 'border-primary/40 bg-primary/5 border-l-2 border-l-primary' : 'border-border bg-background'
                }`}
              >
                <div className="text-[16px] shrink-0 mt-0.5">{typeCfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{gap.objectName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[14px] text-muted-foreground font-medium">{gap.objectType}</span>
                        {gap.sprint && <><span className="text-muted-foreground/40">·</span><span className="text-[14px] text-muted-foreground">{gap.sprint}</span></>}
                        {/* Hint visible on hover */}
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
                          double-click to fix →
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${typeCfg.cls}`}>{typeCfg.label}</span>
                      <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${sevCls[gap.severity]}`}>{gap.severity}</span>
                      {isFocused && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type DrawerState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; std: ContentStandard };

export default function StandardsStudio() {
  const { setSelectedItem } = useAppContext();

  // Standards state — starts empty; populated via the "New Standard" drawer.
  // SEED_STANDARDS (imported above) is kept for local development reference only.
  const [standards, setStandards] = useState<ContentStandard[]>([]);

  const [view, setView]                   = useState<StudioView>('overview');
  const [initialStdId, setInitialStdId]   = useState<string | undefined>(undefined);
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter | undefined>(undefined);
  const [drawer, setDrawer]               = useState<DrawerState>({ mode: 'closed' });

  function navigateTo(v: StudioView, stdId?: string, filter?: ChecklistFilter) {
    setView(v);
    if (stdId) setInitialStdId(stdId);
    // Only carry a filter into the checklist view; clear it for all other navigation
    setChecklistFilter(v === 'checklist' ? filter : undefined);
  }

  function openBrief(std: ContentStandard) {
    setSelectedItem({ type: 'contentStandard', id: std.id, data: std });
  }

  function handleSave(updated: ContentStandard) {
    setStandards(prev => {
      const exists = prev.find(s => s.id === updated.id);
      if (exists) return prev.map(s => s.id === updated.id ? updated : s);
      return [...prev, updated];
    });
    // After create, navigate to the new standard in the browser
    if (drawer.mode === 'create') {
      setInitialStdId(updated.id);
      setView('standards');
    }
  }

  const totalChecks = standards.reduce((n, s) => n + s.pennyChecks.length, 0);
  const reqChecks   = standards.reduce((n, s) => n + s.pennyChecks.filter(c => c.required).length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact page header */}
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">

        {/* Row 1: title + stats + action */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Standards Studio</h1>

          {/* Inline stat chips */}
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">
              <span className="font-bold text-foreground">{standards.length}</span> Standards
            </span>
            <span className="text-muted-foreground/30 text-[12px]">·</span>
            <span className="text-[12px] text-muted-foreground">
              <span className="font-bold text-foreground">{totalChecks}</span> {TERMS.aiAssistant} Checks
            </span>
            <span className="text-muted-foreground/30 text-[12px]">·</span>
            <span className="text-[12px] text-muted-foreground">
              <span className="font-bold text-foreground">{reqChecks}</span> Required
            </span>
          </div>

          {/* Gap alert — only when on gap-report tab and standards exist */}
          {view === 'gap-report' && standards.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#A93F2F] border border-[#E8B9B4] bg-[#FBEAE6] rounded-full px-2 py-0.5">
              <AlertTriangle className="w-3 h-3" />
              {GAP_SUMMARY.bySeverity.high} high-severity
            </span>
          )}

          {/* New Standard — right-aligned */}
          <button
            onClick={() => setDrawer({ mode: 'create' })}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-full text-[12px] font-bold hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-3 h-3" />
            New Standard
          </button>
        </div>

        {/* Row 2: underline tabs flush to border */}
        <div className="flex items-center gap-0.5">
          <ViewTab id="overview"   label="Overview"   icon={BookCheck}     active={view === 'overview'}   onClick={() => navigateTo('overview')} />
          <ViewTab id="standards"  label="Standards"  icon={ShieldCheck}   active={view === 'standards'}  count={standards.length} onClick={() => navigateTo('standards')} />
          <ViewTab id="checklist"  label="Checklist"  icon={ClipboardList} active={view === 'checklist'}  count={reqChecks} onClick={() => navigateTo('checklist')} />
          <ViewTab id="gap-report" label="Gap Report" icon={AlertTriangle} active={view === 'gap-report'} count={standards.length > 0 ? GAP_SUMMARY.total : 0} onClick={() => navigateTo('gap-report')} />
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {view === 'overview'   && <OverviewView standards={standards} onNavigate={navigateTo} />}
        {view === 'standards'  && (
          <StandardsBrowserView
            standards={standards}
            initialStdId={initialStdId}
            onOpenBrief={openBrief}
            onEdit={std => setDrawer({ mode: 'edit', std })}
          />
        )}
        {view === 'checklist'  && <ChecklistView standards={standards} initialFilter={checklistFilter} />}
        {view === 'gap-report' && <GapReportView standards={standards} onNavigate={navigateTo} />}
      </div>

      {/* Edit / Create drawer */}
      {drawer.mode !== 'closed' && (
        <StandardEditDrawer
          standard={drawer.mode === 'edit' ? drawer.std : null}
          onSave={handleSave}
          onClose={() => setDrawer({ mode: 'closed' })}
        />
      )}
    </div>
  );
}

// ── ViewTab (kept local) ───────────────────────────────────────────────────

function ViewTab({
  id, label, icon: Icon, active, count, onClick,
}: {
  id: StudioView; label: string; icon: typeof BookCheck;
  active: boolean; count?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-secondary text-secondary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
      {count !== undefined && (
        <span className={`text-[11px] font-bold rounded-full px-1.5 py-0 ${active ? 'text-secondary bg-secondary/10' : 'text-muted-foreground bg-muted'}`}>{count}</span>
      )}
    </button>
  );
}
