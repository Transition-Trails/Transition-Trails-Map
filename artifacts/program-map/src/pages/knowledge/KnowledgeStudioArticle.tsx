/**
 * KnowledgeStudioArticle
 *
 * The Article tab of the Knowledge Studio hub.
 *
 * Route /knowledge/studio/article         → article list, select to open editor
 * Route /knowledge/studio/article/:id     → three-column structured step editor
 *
 * Three-column layout (ID present):
 *   232px  Left   — Reference fields + Review cycle + staleness info
 *   flex-1 Center — Retrieval abstract (collapsible) · Overview/Prereqs ·
 *                   Procedure steps (DnD reorder) · Related articles
 *   300px  Right  — Capture session card · Penny Coordinator (static) ·
 *                   Relationship type chips
 */

import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FileText, Plus, Send, ChevronDown, ChevronUp, ArrowLeft, Loader2,
  Camera, Link2, LayoutList, Sparkles, Info, Clock, Save, X, Trash2,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKnowledgeArticles, type KnowledgeArticle } from '@/hooks/useKnowledgeArticles';
import { useProcedureSteps, useArticleRelationships } from '@/hooks/useProcedureSteps';
import { ProcedureStepCard } from '@/components/knowledge/ProcedureStepCard';
import { STATUS_CLASSES } from '@/config/statusColors';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const REVIEW_CYCLE_OPTIONS = ['Monthly', 'Quarterly', 'Yearly'];

const STATUS_STYLES: Record<string, string> = {
  draft:            'bg-muted text-muted-foreground border-border',
  'pending-review': 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  approved:         'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  published:        'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {status === 'draft' ? 'Draft' : status === 'pending-review' ? 'In Review' : status === 'approved' ? 'Approved' : 'Published'}
    </span>
  );
}

// ── Inline field ──────────────────────────────────────────────────────────────

function InlineField({
  label, value, onChange, placeholder, type = 'text', options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: 'text' | 'select'; options?: string[];
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      {type === 'select' && options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2 py-1 rounded border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}…`}
          className="w-full px-2 py-1 rounded border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      )}
    </div>
  );
}

// ── Relation type chip ────────────────────────────────────────────────────────

const REL_STYLES: Record<string, string> = {
  'prerequisite': 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'next-step':    'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',
  'reverses':     'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'other':        'bg-muted text-muted-foreground border-border',
};

const REL_LABELS: Record<string, string> = {
  'prerequisite': 'Prerequisite',
  'next-step':    'Next step',
  'reverses':     'Reverses',
  'other':        'Other side',
};

// ── Article list panel (no article selected) ──────────────────────────────────

function ArticleListPanel() {
  const { articles, loading } = useKnowledgeArticles();
  const [, setLocation] = useLocation();
  const [q, setQ] = useState('');

  const filtered = q.trim()
    ? articles.filter(a => a.title.toLowerCase().includes(q.toLowerCase()))
    : articles;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search articles…"
          className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 gap-2 text-muted-foreground text-[13px]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">No articles yet</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Select an article from the Knowledge hub or sync from Salesforce to get started.</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="py-1">
            {filtered.map(article => (
              <button
                key={article.id}
                onClick={() => setLocation(`/knowledge/studio/article/${article.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{article.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusPill status={article.status} />
                      {article.category && (
                        <span className="text-[10px] text-muted-foreground">{article.category}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ── Three-column editor ───────────────────────────────────────────────────────

// Inline form for creating a new relationship
interface RelFormState {
  open:    boolean;
  targetId: string;
  type:    'prerequisite' | 'next-step' | 'reverses' | 'other';
  reason:  string;
  saving:  boolean;
  error:   string | null;
}

function ArticleEditor({ article, onArticleChange }: {
  article: KnowledgeArticle;
  onArticleChange: (updated: KnowledgeArticle) => void;
}) {
  const { updateArticle, articles: allArticles } = useKnowledgeArticles();
  const { steps, loading: stepsLoading, addStep, updateStep, deleteStep, reorderSteps } = useProcedureSteps(article.id);
  const { relationships, addRelationship, removeRelationship } = useArticleRelationships(article.id);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Reference field local state
  const [refs, setRefs] = useState({
    ownerDepartment:   article.ownerDepartment ?? '',
    difficulty:        article.difficulty ?? '',
    audience:          article.audience ?? '',
    appliesTo:         article.appliesTo ?? '',
    estimatedTime:     article.estimatedTime ?? '',
    lastTestedVersion: article.lastTestedVersion ?? '',
    reviewCycle:       article.reviewCycle ?? 'Quarterly',
  });
  const [refsDirty, setRefsDirty]     = useState(false);
  const [refsSaving, setRefsSaving]   = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [relForm, setRelForm] = useState<RelFormState>({
    open: false, targetId: '', type: 'prerequisite', reason: '', saving: false, error: null,
  });

  // Reset refs when article changes
  useEffect(() => {
    setRefs({
      ownerDepartment:   article.ownerDepartment ?? '',
      difficulty:        article.difficulty ?? '',
      audience:          article.audience ?? '',
      appliesTo:         article.appliesTo ?? '',
      estimatedTime:     article.estimatedTime ?? '',
      lastTestedVersion: article.lastTestedVersion ?? '',
      reviewCycle:       article.reviewCycle ?? 'Quarterly',
    });
    setRefsDirty(false);
  }, [article.id]);

  function setRef(key: keyof typeof refs) {
    return (v: string) => { setRefs(prev => ({ ...prev, [key]: v })); setRefsDirty(true); };
  }

  async function saveRefs() {
    setRefsSaving(true);
    try {
      // Send all fields explicitly — empty string becomes null on the backend.
      // Using `|| undefined` would silently skip clearing a populated field.
      const updated = await updateArticle(article.id, {
        ownerDepartment:   refs.ownerDepartment,
        difficulty:        refs.difficulty,
        audience:          refs.audience,
        appliesTo:         refs.appliesTo,
        estimatedTime:     refs.estimatedTime,
        lastTestedVersion: refs.lastTestedVersion,
        reviewCycle:       refs.reviewCycle as 'Monthly' | 'Quarterly' | 'Yearly',
      });
      onArticleChange(updated);
      setRefsDirty(false);
    } catch {
      // Preserve dirty flag so the user can retry
      toast({ title: 'Failed to save reference fields', variant: 'destructive' });
    } finally {
      setRefsSaving(false);
    }
  }

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = steps.findIndex(s => s.id === active.id);
    const newIdx = steps.findIndex(s => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(steps, oldIdx, newIdx);
    void reorderSteps(reordered.map(s => s.id));
  }

  async function handleSendToPenny() {
    try {
      const updated = await updateArticle(article.id, {} as Parameters<typeof updateArticle>[1]);
      // PATCH status to pending-review via submit endpoint
      const res = await fetch(`/api/knowledge/articles/${article.id}/submit`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json() as { article: KnowledgeArticle };
        onArticleChange(data.article);
        setLocation(`/knowledge/studio/penny-review`);
      }
    } catch {
      toast({ title: 'Could not send for Penny review', variant: 'destructive' });
    }
  }

  // Show ALL relationship rows (forward + inverse) — each article holds its own
  // correctly-typed view of the link (e.g. Article B has an "inverse / next-step"
  // row that is the correct label for B's relationship to A).
  const allRels = relationships;
  const relsByType = (['prerequisite', 'next-step', 'reverses', 'other'] as const).map(type => ({
    type,
    items: allRels.filter(r => r.relationType === type),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT COLUMN: Reference fields (232px) ────────────────────────── */}
      <div className="w-[232px] shrink-0 border-r border-border flex flex-col">
        {/* Back button + article meta header */}
        <div className="px-3 py-2 border-b border-border shrink-0 space-y-1.5">
          <button
            onClick={() => setLocation('/knowledge/studio/article')}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to list
          </button>
          <div className="flex items-start gap-1.5 flex-wrap">
            <StatusPill status={article.status} />
            {article.category && (
              <span className="text-[10px] text-muted-foreground">{article.category}</span>
            )}
          </div>
          <p className="text-[12px] font-semibold text-foreground line-clamp-2 leading-snug">
            {article.title}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-3 py-3 space-y-3">
            {/* Reference fields */}
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Reference fields
              </p>
              <InlineField label="Owner dept" value={refs.ownerDepartment} onChange={setRef('ownerDepartment')} placeholder="e.g. Operations" />
              <InlineField label="Difficulty" value={refs.difficulty} onChange={setRef('difficulty')} type="select" options={DIFFICULTY_OPTIONS} />
              <InlineField label="Audience" value={refs.audience} onChange={setRef('audience')} placeholder="e.g. Coaches, Coordinators" />
              <InlineField label="Applies to" value={refs.appliesTo} onChange={setRef('appliesTo')} placeholder="e.g. All programs" />
              <InlineField label="Est. time" value={refs.estimatedTime} onChange={setRef('estimatedTime')} placeholder="e.g. 5 min" />
            </div>

            {/* Review cycle */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Review cycle
              </p>
              <InlineField label="Cycle" value={refs.reviewCycle} onChange={setRef('reviewCycle')} type="select" options={REVIEW_CYCLE_OPTIONS} />
              <InlineField label="Last tested" value={refs.lastTestedVersion} onChange={setRef('lastTestedVersion')} placeholder="e.g. Spring ʼ25" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Last reviewed</span>
                <p className="text-[12px] text-foreground">{fmt(article.reviewedAt)}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Updated</span>
                <p className="text-[12px] text-foreground">{fmt(article.updatedAt)}</p>
              </div>
            </div>

            {/* Save refs */}
            {refsDirty && (
              <button
                onClick={saveRefs}
                disabled={refsSaving}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {refsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save fields
              </button>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── CENTER COLUMN: Step editor ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Article header + CTA */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-muted-foreground/60 font-mono shrink-0">SOP</span>
            <span className="text-[13px] font-semibold text-foreground truncate">{article.title}</span>
          </div>
          {article.status === 'draft' && (
            <button
              onClick={handleSendToPenny}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] text-[12px] font-medium hover:bg-[#FFE9B3] transition-colors"
            >
              <Sparkles className="w-3 h-3" /> Send to Penny for review
            </button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-5 max-w-2xl">

            {/* ── Retrieval abstract (collapsible) ─────────────────────────── */}
            <div className="rounded-lg border border-[#7FAFC6] overflow-hidden">
              <button
                onClick={() => setAbstractOpen(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#EDF5F8] text-[#2F6F7E] text-[12px] font-semibold"
              >
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  What Penny sees
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ml-1 ${STATUS_CLASSES.neutral.badge}`}>
                    Not shown to readers
                  </span>
                </div>
                {abstractOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {abstractOpen && (
                <div className="px-3 py-3 bg-[#EDF5F8]/40 border-t border-[#7FAFC6]/30 space-y-2">
                  {article.retrievalAbstract ? (
                    <p className="text-[13px] text-[#2F6F7E] leading-relaxed">{article.retrievalAbstract}</p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground italic">
                      Generated at publish — Penny's retrieval abstract will appear here after the article is approved and published.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Overview + Prerequisites ──────────────────────────────────── */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Overview</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{article.summary || '—'}</p>
              {article.prerequisites && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Prerequisites</p>
                  <p className="text-[13px] text-foreground leading-relaxed">{article.prerequisites}</p>
                </div>
              )}
            </div>

            {/* ── Procedure steps ───────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Procedure steps
                  <span className="ml-2 text-muted-foreground/50 normal-case font-normal tracking-normal">
                    ({steps.length})
                  </span>
                </p>
                <button
                  onClick={() => void addStep()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add step
                </button>
              </div>

              {stepsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-[13px] py-4">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading steps…
                </div>
              ) : steps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <LayoutList className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground">No steps yet.</p>
                  <button
                    onClick={() => void addStep()}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add first step
                  </button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {steps.map(step => (
                        <ProcedureStepCard
                          key={step.id}
                          step={step}
                          lastTestedVersion={article.lastTestedVersion ?? null}
                          onUpdate={patch => void updateStep(step.id, patch)}
                          onDelete={() => void deleteStep(step.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* ── Related articles ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                  Related articles
                  {allRels.length > 0 && (
                    <span className="ml-2 text-muted-foreground/50 normal-case font-normal tracking-normal">
                      ({allRels.length})
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setRelForm(f => ({ ...f, open: !f.open, error: null }))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                >
                  {relForm.open ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {relForm.open ? 'Cancel' : 'Add link'}
                </button>
              </div>

              {/* Inline create form */}
              {relForm.open && (
                <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-foreground">Link another article</p>
                  {/* Article selector */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Article</label>
                    <select
                      value={relForm.targetId}
                      onChange={e => setRelForm(f => ({ ...f, targetId: e.target.value, error: null }))}
                      className="w-full px-2 py-1.5 rounded border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="">— Select article —</option>
                      {allArticles
                        .filter(a => a.id !== article.id)
                        .map(a => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                  </div>
                  {/* Type */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Relationship type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['prerequisite', 'next-step', 'reverses', 'other'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setRelForm(f => ({ ...f, type: t }))}
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold transition-colors ${
                            relForm.type === t
                              ? REL_STYLES[t]
                              : 'border-border bg-background text-muted-foreground hover:bg-muted/30'
                          }`}
                        >
                          {REL_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Reason */}
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Reason <span className="font-normal normal-case opacity-60">(optional)</span></label>
                    <input
                      type="text"
                      value={relForm.reason}
                      onChange={e => setRelForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="e.g. Must be completed before this article"
                      className="w-full px-2 py-1.5 rounded border border-border bg-background text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  {/* Error */}
                  {relForm.error && (
                    <p className="text-[11px] text-destructive">{relForm.error}</p>
                  )}
                  {/* Submit */}
                  <button
                    disabled={!relForm.targetId || relForm.saving}
                    onClick={async () => {
                      if (!relForm.targetId) return;
                      setRelForm(f => ({ ...f, saving: true, error: null }));
                      try {
                        await addRelationship(relForm.targetId, relForm.type, relForm.reason || undefined);
                        setRelForm(f => ({ ...f, open: false, targetId: '', reason: '', saving: false }));
                      } catch {
                        setRelForm(f => ({ ...f, saving: false, error: 'Failed to create relationship. Does the target article exist?' }));
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {relForm.saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                    Create link
                  </button>
                  <p className="text-[10px] text-muted-foreground/50 italic">
                    Adding "Prerequisite" here also adds "Next step" on the linked article.
                  </p>
                </div>
              )}

              {/* Existing relationships grouped by type */}
              {relsByType.length > 0 ? (
                <div className="space-y-2">
                  {relsByType.map(({ type, items }) => (
                    <div key={type} className="space-y-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${REL_STYLES[type]}`}>
                        {REL_LABELS[type]}
                      </span>
                      {items.map(rel => (
                        <div key={rel.id} className="group/rel flex items-start gap-2 pl-2 py-1.5 rounded-lg border border-border bg-background">
                          <Link2 className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground truncate">
                              {allArticles.find(a => a.id === rel.relatedArticleId)?.title ?? rel.relatedArticleId}
                            </p>
                            {rel.reason && <p className="text-[11px] text-muted-foreground">{rel.reason}</p>}
                          </div>
                          <button
                            onClick={() => void removeRelationship(rel.id)}
                            aria-label="Remove relationship"
                            className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/rel:opacity-100 transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : !relForm.open ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <Link2 className="w-4 h-4 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-[12px] text-muted-foreground">No links yet.</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Click "Add link" to connect this article to a prerequisite, next step, or reversal.
                  </p>
                </div>
              ) : null}
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* ── RIGHT COLUMN: Rail (300px) ────────────────────────────────────── */}
      <div className="w-[300px] shrink-0 border-l border-border flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="px-3 py-3 space-y-4">

            {/* Capture session card */}
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <Camera className="w-3 h-3 text-muted-foreground" />
                <p className="text-[11px] font-bold text-muted-foreground">Capture session</p>
              </div>
              <div className="px-3 py-3 space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Frames captured</span>
                  <span className="font-semibold text-foreground">{steps.filter(s => s.captureUrl).length} / {steps.length || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Steps attached</span>
                  <span className="font-semibold text-foreground">{steps.filter(s => s.captureUrl).length}</span>
                </div>
                {steps.some(s => !s.captureUrl) && (
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] ${STATUS_CLASSES.attention.badge}`}>
                    {steps.filter(s => !s.captureUrl).length} step{steps.filter(s => !s.captureUrl).length === 1 ? '' : 's'} without a capture
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/60 italic">
                  Capture upload coming in the next sprint.
                </p>
              </div>
            </div>

            {/* Penny Coordinator (static for now) */}
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <Sparkles className="w-3 h-3 text-primary" />
                <p className="text-[11px] font-bold text-muted-foreground">Penny Coordinator</p>
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATUS_CLASSES.neutral.badge}`}>
                  Review mode
                </span>
              </div>
              <div className="px-3 py-3">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Send this article for Penny review to get step-level findings, missing verify lines, and audience coverage gaps.
                </p>
                <button
                  disabled={article.status !== 'draft'}
                  onClick={handleSendToPenny}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] text-[12px] font-medium hover:bg-[#FFE9B3] disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3 h-3" /> Send for Penny review
                </button>
              </div>
            </div>

            {/* Relationship type chips */}
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
                <Link2 className="w-3 h-3 text-muted-foreground" />
                <p className="text-[11px] font-bold text-muted-foreground">Relationship types</p>
              </div>
              <div className="px-3 py-3 flex flex-wrap gap-1.5">
                {(['prerequisite', 'next-step', 'reverses', 'other'] as const).map(type => (
                  <span key={type} className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${REL_STYLES[type]}`}>
                    {REL_LABELS[type]}
                  </span>
                ))}
              </div>
              <div className="px-3 pb-3 space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Links (this article)</span>
                  <span className="font-semibold">{allRels.length}</span>
                </div>
              </div>
            </div>

            {/* Article metadata */}
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Article meta</p>
              <div className="space-y-1">
                {[
                  ['Created', fmt(article.createdAt)],
                  ['Updated', fmt(article.updatedAt)],
                  ['Authored by', article.authoredBy ?? '—'],
                  ['SF Article ID', article.sfArticleId ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-2 text-[12px]">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="text-foreground font-medium text-right break-all">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="w-3 h-3 text-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground">
                  {article.estimatedTime ? `Est. ${article.estimatedTime}` : 'No time estimate'}
                </span>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function KnowledgeStudioArticle() {
  const [location] = useLocation();

  // Extract article ID from /knowledge/studio/article/:id
  const match = location.match(/^\/knowledge\/studio\/article\/(.+)$/);
  const articleId = match?.[1] ?? null;

  const { articles, loading } = useKnowledgeArticles();
  const [localArticle, setLocalArticle] = useState<KnowledgeArticle | null>(null);

  useEffect(() => {
    if (!articleId) { setLocalArticle(null); return; }
    const found = articles.find(a => a.id === articleId);
    if (found) setLocalArticle(found);
  }, [articleId, articles]);

  if (!articleId) return <ArticleListPanel />;

  if (loading && !localArticle) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-[13px]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading article…
      </div>
    );
  }

  if (!localArticle) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <FileText className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-[13px] font-semibold text-foreground">Article not found</p>
        <p className="text-[12px] text-muted-foreground">The article may have been deleted or synced from Salesforce under a different ID.</p>
      </div>
    );
  }

  return (
    <ArticleEditor
      article={localArticle}
      onArticleChange={setLocalArticle}
    />
  );
}
