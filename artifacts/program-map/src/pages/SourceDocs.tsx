import { useState, useMemo } from 'react';
import { sourceDocuments as SEED, type SourceDocument, type ConfidenceStatus } from '@/data/sourceDocuments';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { TERMS } from '@/config/terminology';
import { Search, FileText, Plus, Pencil, Trash2, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'trail-os-library-documents';

function loadDocs(): SourceDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SourceDocument[];
  } catch {}
  return SEED;
}

function persistDocs(docs: SourceDocument[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(docs)); } catch {}
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Draft:      'bg-sky-50 text-sky-700 border-sky-200',
  Deprecated: 'bg-amber-50 text-amber-700 border-amber-200',
  Archived:   'bg-muted text-muted-foreground border-border',
};

const STATUSES    = ['Active', 'Draft', 'Deprecated', 'Archived'] as const;
const CATEGORIES  = ['Brand', 'Strategy', 'Program', 'Curriculum', 'Finance', 'Operations', 'HR', 'Other'];
const CONFIDENCES = ['confirmed', 'needs-review', 'draft', 'deprecated'] as const;
const OWNERS      = ['Leadership', 'Program Director', 'Curriculum Lead', 'Operations', 'Lead Facilitator', 'Partnerships Lead'];

function nextId(docs: SourceDocument[]): string {
  const maxNum = docs.reduce((m, d) => Math.max(m, Number(d.id) || 0), 0);
  return String(maxNum + 1);
}

// ── Empty draft ───────────────────────────────────────────────────────────────

function emptyDraft(): Partial<SourceDocument> {
  return {
    entityType: 'document',
    name: '',
    category: 'Program',
    status: 'Draft',
    confidence: 'draft',
    owner: '',
    lastUpdated: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
    programs: [],
    summary: '',
    purpose: '',
    quickTake: '',
    keyDecisionsInfluenced: [],
    sourceOfTruthFor: [],
    notSourceOfTruthFor: [],
    keySections: [],
    relatedDocuments: [],
    driveUrl: '',
  };
}

// ── Form component ────────────────────────────────────────────────────────────

function DocForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  draft: Partial<SourceDocument>;
  onChange: (patch: Partial<SourceDocument>) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const inputCls = 'w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary';
  const labelCls = 'text-[11px] font-semibold text-muted-foreground block mb-1';

  function csv(arr?: string[]) { return (arr ?? []).join(', '); }
  function parseArr(val: string) { return val.split(',').map(s => s.trim()).filter(Boolean); }

  return (
    <div className="border-b border-border bg-muted/10">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <p className="text-[12px] font-bold text-foreground">
          {isNew ? 'Add New Document' : `Editing — ${draft.name || 'Untitled'}`}
        </p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="max-h-[420px]">
        <div className="p-4 space-y-4">

          {/* Row 1: name + category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Document Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={draft.name ?? ''}
                onChange={e => onChange({ name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Explorer's Trail Blueprint"
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={draft.category ?? 'Program'} onChange={e => onChange({ category: e.target.value })} className={inputCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: status + confidence + owner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={draft.status ?? 'Draft'} onChange={e => onChange({ status: e.target.value as SourceDocument['status'] })} className={inputCls}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Confidence</label>
              <select value={draft.confidence ?? 'draft'} onChange={e => onChange({ confidence: e.target.value as ConfidenceStatus })} className={inputCls}>
                {CONFIDENCES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Owner</label>
              <select value={draft.owner ?? ''} onChange={e => onChange({ owner: e.target.value })} className={inputCls}>
                <option value="">Select owner…</option>
                {OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: programs + drive URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Programs <span className="font-normal text-muted-foreground/60">(comma-separated)</span></label>
              <input
                type="text"
                value={csv(draft.programs)}
                onChange={e => onChange({ programs: parseArr(e.target.value) })}
                className={inputCls}
                placeholder="e.g. Foundations Trail, All"
              />
            </div>
            <div>
              <label className={labelCls}>Google Drive URL <span className="font-normal text-muted-foreground/60">(optional)</span></label>
              <input
                type="url"
                value={draft.driveUrl ?? ''}
                onChange={e => onChange({ driveUrl: e.target.value })}
                className={inputCls}
                placeholder="https://drive.google.com/…"
              />
            </div>
          </div>

          {/* Summary + purpose */}
          <div>
            <label className={labelCls}>Summary</label>
            <textarea
              rows={2}
              value={draft.summary ?? ''}
              onChange={e => onChange({ summary: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="Brief description of this document's content and scope"
            />
          </div>
          <div>
            <label className={labelCls}>Purpose</label>
            <textarea
              rows={2}
              value={draft.purpose ?? ''}
              onChange={e => onChange({ purpose: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="Why this document exists and who uses it"
            />
          </div>
          <div>
            <label className={labelCls}>Quick Take</label>
            <textarea
              rows={1}
              value={draft.quickTake ?? ''}
              onChange={e => onChange({ quickTake: e.target.value })}
              className={`${inputCls} resize-none`}
              placeholder="One-line summary for fast orientation"
            />
          </div>

          {/* Source of truth fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Source of Truth For <span className="font-normal text-muted-foreground/60">(one per line)</span></label>
              <textarea
                rows={2}
                value={(draft.sourceOfTruthFor ?? []).join('\n')}
                onChange={e => onChange({ sourceOfTruthFor: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                className={`${inputCls} resize-none`}
                placeholder="e.g. Brand colors and palette"
              />
            </div>
            <div>
              <label className={labelCls}>Not Source of Truth For <span className="font-normal text-muted-foreground/60">(one per line)</span></label>
              <textarea
                rows={2}
                value={(draft.notSourceOfTruthFor ?? []).join('\n')}
                onChange={e => onChange({ notSourceOfTruthFor: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                className={`${inputCls} resize-none`}
                placeholder="e.g. Pricing figures"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Key Decisions Influenced <span className="font-normal text-muted-foreground/60">(one per line)</span></label>
            <textarea
              rows={2}
              value={(draft.keyDecisionsInfluenced ?? []).join('\n')}
              onChange={e => onChange({ keyDecisionsInfluenced: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
              className={`${inputCls} resize-none`}
              placeholder="e.g. Logo and color usage"
            />
          </div>

          <div>
            <label className={labelCls}>Related Documents <span className="font-normal text-muted-foreground/60">(comma-separated)</span></label>
            <input
              type="text"
              value={csv(draft.relatedDocuments)}
              onChange={e => onChange({ relatedDocuments: parseArr(e.target.value) })}
              className={inputCls}
              placeholder="e.g. Facilitator Guide, Brand Book"
            />
          </div>

        </div>
      </ScrollArea>

      {/* Form actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50">
        <button
          onClick={onSave}
          disabled={!draft.name?.trim()}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-foreground bg-primary border border-primary rounded-full px-4 py-1.5 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isNew ? 'Add Document' : 'Save Changes'}
        </button>
        <button
          onClick={onCancel}
          className="text-[12px] font-medium text-muted-foreground border border-border rounded-full px-4 py-1.5 hover:bg-muted/20 transition-colors"
        >
          Cancel
        </button>
        <p className="text-[10px] text-muted-foreground/60 ml-2 italic">Persists locally · production will sync to Salesforce.</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SourceDocs() {
  const [docs, setDocs]                   = useState<SourceDocument[]>(loadDocs);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('All');
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [isAdding, setIsAdding]           = useState(false);
  const [draft, setDraft]                 = useState<Partial<SourceDocument>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { setSelectedItem, selectedItem } = useAppContext();
  const { isEveryday }                    = useTierFlags();

  const canEdit = !isEveryday;

  const statuses = ['All', 'Active', 'Draft', 'Deprecated', 'Archived'];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter(doc => {
      const matchesSearch  = !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.category?.toLowerCase().includes(q) ||
        doc.programs?.some(p => p.toLowerCase().includes(q)) ||
        doc.owner?.toLowerCase().includes(q);
      const matchesStatus  = statusFilter === 'All' || doc.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [docs, search, statusFilter]);

  function saveDocs(updated: SourceDocument[]) {
    setDocs(updated);
    persistDocs(updated);
  }

  function startEdit(doc: SourceDocument) {
    setIsAdding(false);
    setEditingId(doc.id);
    setDraft({ ...doc });
  }

  function startAdd() {
    setEditingId(null);
    setIsAdding(true);
    setDraft(emptyDraft());
  }

  function cancelForm() {
    setIsAdding(false);
    setEditingId(null);
    setDraft({});
    setConfirmDeleteId(null);
  }

  function saveForm() {
    if (!draft.name?.trim()) return;
    if (isAdding) {
      const newDoc: SourceDocument = {
        ...emptyDraft(),
        ...draft,
        id: nextId(docs),
        entityType: 'document',
        lastUpdated: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
      } as SourceDocument;
      const updated = [...docs, newDoc];
      saveDocs(updated);
      setSelectedItem({ type: 'document', id: newDoc.id, data: newDoc });
    } else {
      const updated = docs.map(d => d.id === editingId ? { ...d, ...draft } as SourceDocument : d);
      saveDocs(updated);
      const updatedDoc = updated.find(d => d.id === editingId);
      if (updatedDoc) setSelectedItem({ type: 'document', id: updatedDoc.id, data: updatedDoc });
    }
    cancelForm();
  }

  function deleteDoc(id: string) {
    const updated = docs.filter(d => d.id !== id);
    saveDocs(updated);
    if (selectedItem?.id === id) setSelectedItem(null);
    setConfirmDeleteId(null);
    cancelForm();
  }

  function handleRowClick(doc: SourceDocument) {
    if (editingId === doc.id) return;
    setSelectedItem({ type: 'document', id: doc.id, data: doc });
  }

  const showForm = isAdding || editingId !== null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b bg-card flex-wrap">

        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder={isEveryday ? 'Search documents…' : 'Search by name, category, program…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-[12px] rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 h-7"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border/70 hover:text-foreground hover:border-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap hidden sm:block">
          {filtered.length} {filtered.length === 1 ? 'doc' : 'docs'}
        </span>

        {canEdit && !showForm && (
          <button
            onClick={startAdd}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground bg-primary border border-primary rounded-full px-3 py-1 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Document
          </button>
        )}
      </div>

      {/* ── Add / Edit form ── */}
      {showForm && (
        <DocForm
          draft={draft}
          onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          onSave={saveForm}
          onCancel={cancelForm}
          isNew={isAdding}
        />
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="w-full min-w-[640px]">

            {/* Header */}
            <div className="grid grid-cols-[40px_2fr_1fr_90px_1fr_1fr_40px] gap-3 px-3 py-2 border-b bg-muted/40 sticky top-0 z-10">
              {['#', 'Document', 'Category', 'Status', 'Owner', 'Updated', ''].map((h, i) => (
                <div key={i} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/40">
              {filtered.map(doc => {
                const isSelected = selectedItem?.type === 'document' && selectedItem.id === doc.id;
                const isEditing  = editingId === doc.id;
                const isDeleting = confirmDeleteId === doc.id;

                return (
                  <div key={doc.id}>
                    <div
                      onClick={() => handleRowClick(doc)}
                      className={`group grid grid-cols-[40px_2fr_1fr_90px_1fr_1fr_40px] gap-3 px-3 py-2 items-center cursor-pointer transition-colors hover:bg-muted/30 ${
                        isEditing  ? 'bg-primary/5 border-l-2 border-primary' :
                        isSelected ? 'bg-primary/[0.03]' : ''
                      }`}
                    >
                      <div className="text-[10px] text-muted-foreground/50 font-mono">{doc.id}</div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="text-[12px] font-medium text-foreground truncate">{doc.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{doc.category}</div>
                      <div>
                        <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[doc.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{doc.owner}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{doc.lastUpdated}</div>

                      {/* Edit / delete controls — admin/power only */}
                      <div className="flex items-center justify-end gap-1 shrink-0">
                        {canEdit && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); startEdit(doc); }}
                              title="Edit"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(doc.id); }}
                              title="Delete"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline delete confirmation */}
                    {isDeleting && (
                      <div className="px-4 py-2.5 bg-rose-50 border-t border-rose-200 flex items-center gap-3">
                        <p className="text-[11px] text-rose-700 font-medium flex-1">
                          Delete <strong>{doc.name}</strong>? This cannot be undone.
                        </p>
                        <button
                          onClick={() => deleteDoc(doc.id)}
                          className="text-[11px] font-bold text-rose-700 border border-rose-300 bg-rose-100 rounded-full px-3 py-1 hover:bg-rose-200 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] font-medium text-muted-foreground border border-border bg-background rounded-full px-3 py-1 hover:bg-muted/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="px-3 py-10 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">
                    {search || statusFilter !== 'All'
                      ? 'No documents match your search.'
                      : `No documents yet. ${canEdit ? 'Click "Add Document" to create the first one.' : ''}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ── Tier hint ── */}
      {isEveryday && (
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-border/40 bg-muted/20">
          <p className="text-[10px] text-muted-foreground/60">
            Contact an Admin or Power user to add or edit library documents.
          </p>
        </div>
      )}
    </div>
  );
}
