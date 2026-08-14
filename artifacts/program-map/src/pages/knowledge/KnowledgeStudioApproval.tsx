/**
 * KnowledgeStudioApproval
 *
 * Approval tab of Knowledge Studio — the final quality gate.
 *
 * Layout (article selected):
 *   Main panel   — Category assignment · Relationship confirmation · Publish action
 *   Right rail   — Waiting queue (three states) · Articles due for review
 *
 * Key design rules:
 *  - Approve button is disabled when required Penny findings > 0; shows count in title.
 *  - Category assignment control is visible to all staff but disabled for non-admin
 *    users; the disabled reason appears in the `title` attribute (disabledReason pattern).
 *  - Penny-suggested relationships are accept-or-decline, never silently added.
 *  - A relationship whose target is not published renders with a "Pending" badge and a
 *    tooltip explaining it will resolve at publish.
 *  - "What publishing does" lists all four steps explicitly.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Info, Loader2, Link2, Tag, Send,
  ChevronDown, ChevronUp, Check, Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKnowledgeArticles, type KnowledgeArticle } from '@/hooks/useKnowledgeArticles';
import { useArticleRelationships } from '@/hooks/useProcedureSteps';
import { useTierFlags } from '@/hooks/useTierFlags';
import { STATUS_CLASSES } from '@/config/statusColors';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PennyFinding {
  id: string;
  stepSequence: number;
  type: string;
  severity: 'required' | 'suggested';
  description: string;
}

interface ReviewState {
  required: PennyFinding[];
  suggested: PennyFinding[];
}

interface PublishStepResult {
  step: string;
  label: string;
  detail?: string;
  done: boolean;
}

// ── Hook — usePennyQueueCounts ────────────────────────────────────────────────
// Runs penny-review for every pending-review/approved article in parallel and
// classifies each into: cleared | requiredOpen | suggestionsOnly.

interface QueueReviewMap {
  [articleId: string]: { required: number; suggested: number } | 'loading' | 'error';
}

function usePennyQueueCounts(articles: KnowledgeArticle[]) {
  const [map, setMap] = useState<QueueReviewMap>({});

  useEffect(() => {
    const reviewable = articles.filter(a =>
      a.status === 'pending-review' || a.status === 'approved',
    );
    if (reviewable.length === 0) { setMap({}); return; }

    // Seed all as loading
    setMap(Object.fromEntries(reviewable.map(a => [a.id, 'loading'])));

    // Fetch in parallel — each POST is cheap (pure function on the steps already in DB)
    void Promise.allSettled(
      reviewable.map(async a => {
        try {
          const res = await fetch(
            `/api/knowledge/articles/${encodeURIComponent(a.id)}/penny-review`,
            { method: 'POST', credentials: 'include' },
          );
          if (!res.ok) { setMap(prev => ({ ...prev, [a.id]: 'error' })); return; }
          const data = await res.json() as { review: { required: PennyFinding[]; suggested: PennyFinding[] } };
          setMap(prev => ({
            ...prev,
            [a.id]: { required: data.review.required.length, suggested: data.review.suggested.length },
          }));
        } catch {
          setMap(prev => ({ ...prev, [a.id]: 'error' }));
        }
      }),
    );
  // Re-run only when the article IDs change, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles.map(a => a.id).join(',')]);

  return map;
}

// ── Hook — usePennyReviewCount ────────────────────────────────────────────────

function usePennyReviewCount(articleId: string | null) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!articleId) { setState(null); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/knowledge/articles/${encodeURIComponent(articleId)}/penny-review`,
        { method: 'POST', credentials: 'include' },
      );
      if (!res.ok) return;
      const data = await res.json() as { review: ReviewState };
      setState(data.review);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { void run(); }, [run]);

  return { reviewState: state, reviewLoading: loading, rerunReview: run };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusLabel(status: string) {
  const m: Record<string, string> = {
    draft: 'Draft', 'pending-review': 'In Review', approved: 'Approved', published: 'Published',
  };
  return m[status] ?? status;
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft:            'bg-muted text-muted-foreground border-border',
    'pending-review': 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    approved:         'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
    published:        'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${cls[status] ?? cls.draft}`}>
      {statusLabel(status)}
    </span>
  );
}

// ── Category assignment section ───────────────────────────────────────────────

const SF_CATEGORY_GROUPS = [
  { name: 'Mission__c', label: 'Mission & Delivery', categories: ['Mission_Delivery', 'Coaching', 'Career', 'Learner_Pathways'] },
  { name: 'Operations__c', label: 'Operations & Business', categories: ['Operations', 'Business', 'Compliance', 'Partner_Management'] },
  { name: 'Technology__c', label: 'Technology & Trail OS', categories: ['Salesforce_Platform', 'Trail_OS', 'Technical_Standards'] },
];

function CategorySection({
  article,
  isKnowledgeManager,
  onCategoryChange,
}: {
  article: KnowledgeArticle;
  isKnowledgeManager: boolean;
  onCategoryChange: (updated: KnowledgeArticle) => void;
}) {
  const [group, setGroup] = useState(article.dataCategoryGroup ?? '');
  const [cat,   setCat]   = useState(article.dataCategory ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const { toast } = useToast();

  const currentGroup = SF_CATEGORY_GROUPS.find(g => g.name === group);
  const disabledReason = 'Category assignment requires a Knowledge Manager license (admin role).';

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${article.id}/categories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dataCategoryGroup: group || null, dataCategory: cat || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { article: KnowledgeArticle };
      onCategoryChange(data.article);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast({ title: 'Could not save category', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // Where this makes the article appear
  const consequence = group && cat
    ? [
        `SF Knowledge ${currentGroup?.label ?? group} category`,
        `Penny routes queries tagged "${cat.replace(/_/g, ' ')}" to this article`,
        `Appears in the ${currentGroup?.label ?? group} section of the Knowledge Base`,
      ]
    : [];

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-primary" />
        <p className="text-[12px] font-bold text-foreground">Category assignment</p>
        {!isKnowledgeManager && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_CLASSES.attention.badge}`}>
            Knowledge Manager only
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Category Group */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Category group</label>
          <select
            value={group}
            onChange={e => { setGroup(e.target.value); setCat(''); }}
            disabled={!isKnowledgeManager}
            title={!isKnowledgeManager ? disabledReason : undefined}
            className="w-full px-2 py-1.5 rounded border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">— No group —</option>
            {SF_CATEGORY_GROUPS.map(g => (
              <option key={g.name} value={g.name}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* Sub-category */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Data category</label>
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            disabled={!isKnowledgeManager || !currentGroup}
            title={!isKnowledgeManager ? disabledReason : !currentGroup ? 'Select a category group first' : undefined}
            className="w-full px-2 py-1.5 rounded border border-border bg-background text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">— No category —</option>
            {currentGroup?.categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Where this appears */}
      {consequence.length > 0 && (
        <div className="rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-[#2F6F7E] uppercase tracking-wide">Where this makes the article appear</p>
          {consequence.map(c => (
            <div key={c} className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#2F6F7E] mt-1.5 shrink-0" />
              <p className="text-[11px] text-[#2F6F7E]">{c}</p>
            </div>
          ))}
        </div>
      )}

      {isKnowledgeManager && (
        <button
          onClick={handleSave}
          disabled={saving || (!group && !article.dataCategoryGroup)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[12px] font-bold text-primary hover:bg-primary/15 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3 text-[#2F6B3F]" /> : null}
          {saved ? 'Saved' : 'Save category'}
        </button>
      )}
    </div>
  );
}

// ── Relationship confirmation section ──────────────────────────────────────────

const REL_LABELS: Record<string, string> = {
  prerequisite: 'Prerequisite',
  'next-step':  'Next step',
  reverses:     'Reverses',
  other:        'Related',
};

const INVERSE_LABELS: Record<string, string> = {
  prerequisite: 'next-step',
  'next-step':  'prerequisite',
  reverses:     'reverses',
  other:        'other',
};

function RelationshipSection({
  articleId,
  articles,
}: {
  articleId: string;
  articles: KnowledgeArticle[];
}) {
  const { relationships } = useArticleRelationships(articleId);

  const pennyRels  = relationships.filter(r => r.direction === 'inverse');
  const authorRels = relationships.filter(r => r.direction === 'forward');

  function getTargetArticle(relatedId: string) {
    return articles.find(a => a.id === relatedId);
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-primary" />
        <p className="text-[12px] font-bold text-foreground">Relationship confirmation</p>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {relationships.length} link{relationships.length === 1 ? '' : 's'}
        </span>
      </div>

      {relationships.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">
          No relationships. Add links in the Article editor if this article has prerequisites.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Author-created (forward) */}
          {authorRels.map(rel => {
            const target = getTargetArticle(rel.relatedArticleId);
            const isPending = target && !['published', 'approved'].includes(target.status);
            return (
              <div key={rel.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {REL_LABELS[rel.relationType] ?? rel.relationType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">→</span>
                    <span className="text-[12px] font-medium text-foreground truncate max-w-[180px]">
                      {target?.title ?? rel.relatedArticleId}
                    </span>
                    {isPending && (
                      <span
                        title="The linked article is not yet published. This link will resolve automatically when the target is published."
                        className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_CLASSES.attention.badge}`}
                      >
                        <Clock className="w-2.5 h-2.5" /> Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Writes inverse: <span className="font-semibold">{REL_LABELS[INVERSE_LABELS[rel.relationType] ?? 'other'] ?? 'Related'}</span> on {target?.title ?? 'linked article'}
                    {' · '}Proposed by <span className="font-semibold">Author</span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* Inverse (incoming) links — automatically created when another article links here.
              These are established relationships, not proposals; no accept/decline needed. */}
          {pennyRels.map(rel => {
            const source = getTargetArticle(rel.relatedArticleId);
            const isPending = source && !['published', 'approved'].includes(source.status);
            return (
              <div key={rel.id} className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-primary uppercase">
                      {REL_LABELS[rel.relationType] ?? rel.relationType}
                    </span>
                    <span className="text-[10px] text-muted-foreground">←</span>
                    <span className="text-[12px] font-medium text-foreground truncate max-w-[180px]">
                      {source?.title ?? rel.relatedArticleId}
                    </span>
                    {isPending && (
                      <span
                        title="The source article is not yet published. This incoming link will resolve when the source is published."
                        className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_CLASSES.attention.badge}`}
                      >
                        <Clock className="w-2.5 h-2.5" /> Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Incoming link — created automatically when the source article linked here
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Publish action ─────────────────────────────────────────────────────────────

function PublishSection({
  article,
  requiredCount,
  onPublished,
}: {
  article: KnowledgeArticle;
  requiredCount: number;
  onPublished: (updated: KnowledgeArticle) => void;
}) {
  const [publishing, setPublishing]  = useState(false);
  const [publishResult, setResult]   = useState<PublishStepResult[] | null>(null);
  const [open, setOpen]              = useState(true);
  const { toast } = useToast();

  // SF-origin articles must go through /publish-to-sf so the Salesforce record
  // stays in sync. Calling the local /publish endpoint would move the article
  // out of 'approved', permanently blocking the SF publish route.
  const isSfArticle = Boolean(article.sfArticleId);

  const canPublish = requiredCount === 0 && article.status === 'approved';
  const disabledReason = requiredCount > 0
    ? `${requiredCount} required finding${requiredCount === 1 ? '' : 's'} must be resolved in Penny's Review before publishing`
    : article.status !== 'approved'
    ? `Article is '${article.status}' — approve it in Penny's Review tab first`
    : undefined;

  async function handleLocalPublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${article.id}/publish`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { article: KnowledgeArticle; publishSteps: PublishStepResult[] };
      setResult(data.publishSteps);
      onPublished(data.article);
      toast({ title: 'Article published', description: `"${article.title}" is now live.` });
    } catch (e) {
      toast({
        title: 'Could not publish',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleSfPublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${article.id}/publish-to-sf`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { article: KnowledgeArticle };
      onPublished(data.article);
      toast({ title: 'Published to Salesforce', description: `"${article.title}" is live in Salesforce Knowledge.` });
    } catch (e) {
      toast({
        title: 'Could not publish to Salesforce',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-primary" />
        <p className="text-[12px] font-bold text-foreground">
          {isSfArticle ? 'Publish to Salesforce' : 'Publish'}
        </p>
        {isSfArticle && (
          <span className="ml-auto text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
            SF-linked
          </span>
        )}
      </div>

      {/* SF article routing notice */}
      {isSfArticle && (
        <div className="rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2">
          <p className="text-[11px] text-[#2F6F7E] leading-relaxed">
            This article is linked to a Salesforce record. Publishing pushes the approved
            version to Salesforce Knowledge and keeps both systems in sync.
          </p>
        </div>
      )}

      {/* What publishing does — local articles only */}
      {!isSfArticle && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            What publishing does
          </button>
          {open && (
            <div className="space-y-1.5 pl-1">
              {[
                { icon: '①', label: 'Version bump', note: 'Sets updatedAt and publishedAt timestamps.' },
                { icon: '②', label: 'Category confirmed', note: 'Assigned category written to the article record.' },
                { icon: '③', label: 'Retrieval abstract marked current', note: 'Penny uses this abstract for RAG retrieval.' },
                { icon: '④', label: 'Relationship inverses confirmed', note: 'Both sides of every link are confirmed in the DB.' },
                { icon: '⑤', label: 'Next review date set', note: 'Computed from the review cycle (Monthly / Quarterly / Yearly).' },
              ].map(({ icon, label, note }) => (
                <div key={icon} className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <span className="text-[12px] font-semibold text-foreground">{label}</span>
                    <span className="text-[11px] text-muted-foreground ml-1.5">{note}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Publish result (local only) */}
      {publishResult && (
        <div className="space-y-1">
          {publishResult.map(step => (
            <div key={step.step} className="flex items-start gap-2 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-0.5" />
              <p className="text-foreground leading-snug">{step.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Publish button */}
      {!publishResult && (
        <button
          onClick={isSfArticle ? () => void handleSfPublish() : () => void handleLocalPublish()}
          disabled={!canPublish || publishing}
          title={disabledReason}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          {publishing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
            : requiredCount > 0
            ? <><AlertTriangle className="w-4 h-4" /> {requiredCount} finding{requiredCount === 1 ? '' : 's'} blocking</>
            : isSfArticle
            ? <><Send className="w-4 h-4" /> Publish to Salesforce</>
            : <><Send className="w-4 h-4" /> Publish article</>
          }
        </button>
      )}
    </div>
  );
}

// ── Right rail — queue + articles due ─────────────────────────────────────────

interface QueueCounts {
  cleared: KnowledgeArticle[];
  requiredOpen: KnowledgeArticle[];
  suggestionsOnly: KnowledgeArticle[];
}

function ApprovalRail({
  articles,
  queueCounts,
  onSelect,
}: {
  articles: KnowledgeArticle[];
  queueCounts: QueueCounts;
  onSelect: (id: string) => void;
}) {
  const dueSoon = articles.filter(a =>
    a.status === 'published' &&
    a.reviewedAt &&
    (Date.now() - new Date(a.reviewedAt).getTime()) > 60 * 24 * 60 * 60 * 1000,
  );

  return (
    <div className="w-[260px] shrink-0 border-l border-border flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Waiting queue */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Waiting queue</p>

            {/* Penny cleared */}
            <div
              className="flex items-center justify-between rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/30 px-3 py-2 cursor-pointer hover:bg-[#E6F0EA]/50 transition-colors"
              onClick={() => queueCounts.cleared[0] && onSelect(queueCounts.cleared[0].id)}
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" />
                <p className="text-[11px] font-semibold text-[#245531]">Penny cleared</p>
              </div>
              <span className="text-[12px] font-bold text-[#2F6B3F]">{queueCounts.cleared.length}</span>
            </div>

            {/* Required open */}
            <div
              className="flex items-center justify-between rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/30 px-3 py-2 cursor-pointer hover:bg-[#FBEAE6]/50 transition-colors"
              onClick={() => queueCounts.requiredOpen[0] && onSelect(queueCounts.requiredOpen[0].id)}
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#A93F2F]" />
                <p className="text-[11px] font-semibold text-[#A93F2F]">Required open</p>
              </div>
              <span className="text-[12px] font-bold text-[#A93F2F]">{queueCounts.requiredOpen.length}</span>
            </div>

            {/* Suggestions only */}
            <div
              className="flex items-center justify-between rounded-lg border border-[#FFD08A] bg-[#FFF3E0]/30 px-3 py-2 cursor-pointer hover:bg-[#FFF3E0]/50 transition-colors"
              onClick={() => queueCounts.suggestionsOnly[0] && onSelect(queueCounts.suggestionsOnly[0].id)}
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#CC8400]" />
                <p className="text-[11px] font-semibold text-[#CC8400]">Suggestions only</p>
              </div>
              <span className="text-[12px] font-bold text-[#CC8400]">{queueCounts.suggestionsOnly.length}</span>
            </div>

            <p className="text-[10px] text-muted-foreground/60 italic leading-snug">
              "Penny cleared" and "Suggestions only" are approvable. "Required open" blocks until resolved in Penny's Review.
            </p>
          </div>

          {/* Articles due for review */}
          {dueSoon.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Due for review</p>
              <p className="text-[10px] text-muted-foreground/70 leading-snug">
                Review means following the procedure again — not just reading it.
              </p>
              {dueSoon.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  className="w-full text-left flex items-start gap-2 rounded-lg border border-border bg-muted/10 px-2.5 py-2 hover:bg-muted/30 transition-colors"
                >
                  <Clock className="w-3 h-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a.reviewCycle ?? 'Quarterly'} · last reviewed {a.reviewedAt
                        ? new Date(a.reviewedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'never'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Article picker ─────────────────────────────────────────────────────────────

function ApprovalPicker({
  articles,
  onSelect,
}: {
  articles: KnowledgeArticle[];
  onSelect: (id: string) => void;
}) {
  const reviewable = articles.filter(a => ['pending-review', 'approved'].includes(a.status));

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[13px] font-bold text-foreground">Select an article to approve</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Assign categories, confirm relationships, then publish. Required findings must be cleared in Penny's Review first.
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {reviewable.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">No articles awaiting approval.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Submit a draft from the Article tab to begin.
              </p>
            </div>
          ) : reviewable.map(article => (
            <button
              key={article.id}
              onClick={() => onSelect(article.id)}
              className="w-full text-left flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 hover:border-primary/20 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground group-hover:text-primary truncate transition-colors">
                  {article.title}
                </p>
                {article.summary && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{article.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={article.status} />
                  {article.dataCategoryGroup && (
                    <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {article.dataCategoryGroup.replace(/__c$/, '').replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main approval pane ─────────────────────────────────────────────────────────

function ArticleApproval({
  article,
  articles,
  queueCounts,
  onBack,
  onSelect,
  onArticleUpdated,
}: {
  article: KnowledgeArticle;
  articles: KnowledgeArticle[];
  queueCounts: QueueCounts;
  onBack: () => void;
  onSelect: (id: string) => void;
  onArticleUpdated: (updated: KnowledgeArticle) => void;
}) {
  const { isAdminOrAbove: isAdmin } = useTierFlags();

  const { reviewState, reviewLoading } = usePennyReviewCount(article.id);

  const requiredCount = reviewState?.required?.length ?? 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1.5"
          >
            ← Back to list
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-foreground truncate max-w-[420px]">{article.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={article.status} />
                {reviewLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                {!reviewLoading && reviewState && (
                  <span className={`text-[11px] font-semibold ${requiredCount > 0 ? 'text-[#A93F2F]' : 'text-[#245531]'}`}>
                    {requiredCount > 0
                      ? `${requiredCount} required finding${requiredCount === 1 ? '' : 's'} open`
                      : 'Penny cleared ✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {/* Category — keyed by article.id so React unmounts/remounts on article change,
                guaranteeing CategorySection's useState initializers always see the correct
                article's values and never carry stale state from a prior selection. */}
            <CategorySection
              key={article.id}
              article={article}
              isKnowledgeManager={isAdmin}
              onCategoryChange={onArticleUpdated}
            />

            {/* Relationships */}
            <RelationshipSection articleId={article.id} articles={articles} />

            {/* Publish */}
            <PublishSection
              article={article}
              requiredCount={requiredCount}
              onPublished={onArticleUpdated}
            />
          </div>
        </ScrollArea>
      </div>

      {/* ── Right rail ─────────────────────────────────────────────────────── */}
      <ApprovalRail
        articles={articles}
        queueCounts={queueCounts}
        onSelect={onSelect}
      />
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function KnowledgeStudioApproval() {
  const { articles, loading, reload } = useKnowledgeArticles();
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const pennyMap                      = usePennyQueueCounts(articles);

  const article = selectedId ? articles.find(a => a.id === selectedId) : null;

  // Build queue counts from real per-article Penny review results.
  // Articles still loading ("loading") or errored are kept in suggestionsOnly as a
  // safe fallback so they never silently appear cleared.
  const reviewableIds = new Set(
    articles
      .filter(a => a.status === 'pending-review' || a.status === 'approved')
      .map(a => a.id),
  );

  // Three mutually exclusive buckets (every reviewable article appears in exactly one):
  //   cleared       — required === 0 AND suggested === 0  (Penny fully cleared)
  //   suggestionsOnly — required === 0 AND suggested > 0  (minor improvements only)
  //   requiredOpen  — required > 0                        (blocks approval)
  // loading/error entries fall into suggestionsOnly as a safe fallback (never appear cleared).
  const queueCounts: QueueCounts = {
    cleared: articles.filter(a => {
      if (!reviewableIds.has(a.id)) return false;
      const r = pennyMap[a.id];
      return typeof r === 'object' && r.required === 0 && r.suggested === 0;
    }),
    requiredOpen: articles.filter(a => {
      if (!reviewableIds.has(a.id)) return false;
      const r = pennyMap[a.id];
      return typeof r === 'object' && r.required > 0;
    }),
    suggestionsOnly: articles.filter(a => {
      if (!reviewableIds.has(a.id)) return false;
      const r = pennyMap[a.id];
      if (r === 'loading' || r === 'error') return true;          // safe fallback
      return typeof r === 'object' && r.required === 0 && r.suggested > 0;
    }),
  };

  function handleArticleUpdated(updated: KnowledgeArticle) {
    void reload();
    void updated; // selection stays — reload refreshes the list
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading articles…</span>
      </div>
    );
  }

  if (article) {
    return (
      <ArticleApproval
        article={article}
        articles={articles}
        queueCounts={queueCounts}
        onBack={() => setSelectedId(null)}
        onSelect={setSelectedId}
        onArticleUpdated={handleArticleUpdated}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <ApprovalPicker articles={articles} onSelect={setSelectedId} />
      </div>
      <ApprovalRail articles={articles} queueCounts={queueCounts} onSelect={setSelectedId} />
    </div>
  );
}
