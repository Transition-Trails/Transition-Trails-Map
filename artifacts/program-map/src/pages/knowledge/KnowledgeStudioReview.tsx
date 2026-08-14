/**
 * KnowledgeStudioReview
 *
 * Penny's Review tab of Knowledge Studio.
 *
 * Route /knowledge/studio/penny-review         → article picker (pending-review only)
 * Route /knowledge/studio/penny-review/:id     → article Penny review
 *
 * Design rules:
 *  - Required findings ALWAYS show their count and render with the critical border;
 *    they are never collapsed, hidden, or soft-labelled.
 *  - Required findings block the Approve CTA — the button shows the count in its title.
 *  - Suggestions use the attention border and "Does not block" pill.
 *  - "Apply Penny's fix" always shows a diff view before writing (never silent).
 *  - Passed checks are in a collapsible section, open by default.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import {
  Brain, ChevronDown, ChevronUp, ArrowLeft, Loader2, AlertTriangle,
  CheckCircle2, Info, Sparkles, Edit2, X, Check,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKnowledgeArticles, type KnowledgeArticle } from '@/hooks/useKnowledgeArticles';
import { STATUS_CLASSES } from '@/config/statusColors';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PennyFinding {
  id: string;
  stepId: string;
  stepSequence: number;
  type: 'no-verify-line' | 'named-person' | 'no-url-with-menu-path' | 'parenthetical-hedge';
  severity: 'required' | 'suggested';
  description: string;
  affectedText: string | null;
  suggestedFix: string | null;
}

interface PennyPassedCheck {
  type: string;
  reason: string;
}

interface PennyReview {
  required: PennyFinding[];
  suggested: PennyFinding[];
  passed: PennyPassedCheck[];
}

// ── Hook — usePennyReview ─────────────────────────────────────────────────────

function usePennyReview(articleId: string | null) {
  const [review, setReview]   = useState<PennyReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/penny-review`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { review: PennyReview };
      setReview(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run Penny review');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { void run(); }, [run]);

  const applyFix = useCallback(async (findingId: string): Promise<PennyReview | null> => {
    if (!articleId) return null;
    const res = await fetch(
      `/api/knowledge/articles/${encodeURIComponent(articleId)}/penny-review/${encodeURIComponent(findingId)}/apply`,
      { method: 'POST', credentials: 'include' },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { review: PennyReview };
    setReview(data.review);
    return data.review;
  }, [articleId]);

  return { review, loading, error, rerun: run, applyFix };
}

// ── Diff modal ────────────────────────────────────────────────────────────────

function DiffModal({
  finding,
  onConfirm,
  onCancel,
  applying,
}: {
  finding: PennyFinding;
  onConfirm: () => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const original = finding.affectedText ?? '(current value)';
  const fixed    = finding.suggestedFix ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-foreground">Apply Penny's fix</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{finding.description}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted/50 text-muted-foreground shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Diff view */}
        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#A93F2F] mb-1">Before</p>
            <div className="rounded border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2 text-[12px] font-mono text-[#A93F2F] leading-relaxed break-words">
              {original}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#245531] mb-1">After</p>
            <div className="rounded border border-[#9FC3AE] bg-[#E6F0EA] px-3 py-2 text-[12px] font-mono text-[#245531] leading-relaxed break-words">
              {fixed}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          This writes directly to the step record. The finding check re-runs immediately after.
        </p>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Confirm fix
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onApply,
  onEditMyself,
}: {
  finding: PennyFinding;
  onApply: (f: PennyFinding) => void;
  onEditMyself: (f: PennyFinding) => void;
}) {
  const isRequired = finding.severity === 'required';
  const borderCls  = isRequired
    ? `border-l-4 border-l-[#A93F2F] bg-[#FBEAE6]/40`
    : `border-l-4 border-l-[#CC8400] bg-[#FFF3E0]/40`;
  const pillCls    = isRequired
    ? STATUS_CLASSES.critical.badge
    : STATUS_CLASSES.attention.badge;
  const pillLabel  = isRequired ? 'Blocks the gate' : 'Does not block';

  return (
    <div className={`rounded-lg border border-border ${borderCls} p-3 space-y-2`}>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-snug">{finding.description}</p>
          {finding.affectedText && (
            <code className="mt-1 inline-block text-[11px] font-mono bg-muted/60 px-1.5 py-0.5 rounded text-foreground/70 max-w-full truncate">
              {finding.affectedText}
            </code>
          )}
        </div>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${pillCls}`}>
          {pillLabel}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {finding.suggestedFix ? (
          <button
            onClick={() => onApply(finding)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary hover:bg-primary/15 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Apply Penny's fix
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">No automated fix — resolve manually.</span>
        )}
        <button
          onClick={() => onEditMyself(finding)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit myself
        </button>
      </div>
    </div>
  );
}

// ── Right rail ─────────────────────────────────────────────────────────────────

function ReviewRail() {
  return (
    <div className="w-[280px] shrink-0 border-l border-border flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* 4-step sequence */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Review sequence</p>
            {[
              { n: '1', label: 'Resolve all required findings', note: 'These block the Approve button.' },
              { n: '2', label: 'Review suggestions', note: 'Improve quality; never block.' },
              { n: '3', label: 'Confirm passed checks', note: 'Penny already cleared these.' },
              { n: '4', label: 'Move to Approval tab', note: 'Categorize, confirm links, publish.' },
            ].map(({ n, label, note }) => (
              <div key={n} className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary">{n}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground leading-snug">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Definition of "required" */}
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6]/30 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0" />
              <p className="text-[11px] font-bold text-[#A93F2F] uppercase tracking-wide">What "required" means</p>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed">
              A required finding blocks the Approve button. It will always show its count and reason — it is never hidden, collapsed, or soft-labelled. The only way to unblock is to resolve it.
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Required checks catch content that makes Penny unreliable: steps Penny cannot verify, named people who may leave, or hedged instructions that signal the author is uncertain.
            </p>
          </div>

          {/* Penny's identity reminder */}
          <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-primary shrink-0" />
              <p className="text-[11px] font-bold text-foreground">Penny reads every field</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Penny uses the verify line to confirm step completion and the direct URL to deep-link users. Missing either degrades her response quality.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Article picker (no article selected) ─────────────────────────────────────

function ArticlePicker({
  articles,
  onSelect,
}: {
  articles: KnowledgeArticle[];
  onSelect: (id: string) => void;
}) {
  const reviewable = articles.filter(a =>
    ['pending-review', 'draft', 'approved'].includes(a.status),
  );
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[13px] font-bold text-foreground">Select an article to review</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Penny will run structural checks against its steps. Required findings block approval.
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {reviewable.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">No articles are awaiting review.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                Submit a draft from the Article tab to begin the review cycle.
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
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={article.status} />
                  {article.category && (
                    <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      {article.category}
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

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    draft:            'bg-muted text-muted-foreground border-border',
    'pending-review': 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
    approved:         'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
    published:        'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  };
  const lbl: Record<string, string> = {
    draft: 'Draft', 'pending-review': 'In Review', approved: 'Approved', published: 'Published',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${cls[status] ?? cls.draft}`}>
      {lbl[status] ?? status}
    </span>
  );
}

// ── Approve CTA — calls admin-gated /approve, then navigates to Approval tab ─

function ApproveCta({
  articleId,
  requiredCount,
  reviewLoading,
}: {
  articleId: string;
  requiredCount: number;
  reviewLoading: boolean;
}) {
  const [approving, setApproving] = useState(false);
  const [, setLocation]           = useLocation();
  const { toast }                 = useToast();

  const blocked = requiredCount > 0 || reviewLoading || approving;

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/approve`, {
        method: 'POST', credentials: 'include',
      });
      if (res.status === 403) {
        toast({
          title: 'Not authorized',
          description: 'Only Knowledge Managers (admins) can approve articles.',
          variant: 'destructive',
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast({ title: 'Article approved', description: 'Moving to Approval tab to publish.' });
      setLocation('/knowledge/studio/approval');
    } catch (e) {
      toast({
        title: 'Could not approve',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  }

  return (
    <button
      disabled={blocked}
      title={
        requiredCount > 0
          ? `${requiredCount} required finding${requiredCount === 1 ? '' : 's'} must be resolved before approving`
          : reviewLoading
          ? 'Running Penny checks…'
          : 'Approve this article and move to the Approval tab to publish'
      }
      onClick={() => void handleApprove()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors"
    >
      {approving
        ? <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />Approving…</>
        : <><CheckCircle2 className="w-3.5 h-3.5" />{requiredCount > 0 ? `${requiredCount} block${requiredCount === 1 ? 's' : ''}` : 'Approve'}</>
      }
    </button>
  );
}

// ── Main review pane ──────────────────────────────────────────────────────────

function ArticleReview({
  article,
  onBack,
}: {
  article: KnowledgeArticle;
  onBack: () => void;
}) {
  const { review, loading, error, rerun, applyFix } = usePennyReview(article.id);
  const { toast } = useToast();

  const [diffTarget, setDiffTarget]   = useState<PennyFinding | null>(null);
  const [applying, setApplying]       = useState(false);
  const [passedOpen, setPassedOpen]   = useState(true);
  const [, setLocation]               = useLocation();

  const req = review?.required ?? [];
  const sug = review?.suggested ?? [];
  const pas = review?.passed ?? [];

  async function handleApplyConfirm() {
    if (!diffTarget) return;
    setApplying(true);
    try {
      await applyFix(diffTarget.id);
      toast({ title: 'Fix applied', description: diffTarget.description.slice(0, 80) + '…' });
      setDiffTarget(null);
    } catch (e) {
      toast({
        title: 'Could not apply fix',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  }

  function handleEditMyself(finding: PennyFinding) {
    // Navigate to the article editor focused on the relevant step
    void setLocation(`/knowledge/studio/article/${article.id}`);
    toast({
      title: 'Opening Article editor',
      description: `Scroll to step ${finding.stepSequence} to resolve: ${finding.type.replace(/-/g, ' ')}`,
    });
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3 h-3" /> Back to list
          </button>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate">{article.title}</p>
              {/* Counts headline */}
              {review && (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#A93F2F]">
                    <AlertTriangle className="w-3 h-3" />
                    {req.length} required
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#CC8400]">
                    <Info className="w-3 h-3" />
                    {sug.length} suggested
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#245531]">
                    <CheckCircle2 className="w-3 h-3" />
                    {pas.length} passed
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void rerun()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-[11px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                Re-run
              </button>
              {/* Approve CTA — calls admin-gated /approve transition, then navigates */}
              <ApproveCta
                articleId={article.id}
                requiredCount={req.length}
                reviewLoading={loading}
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-[12px]">Running structural checks…</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 text-[12px] text-[#A93F2F]">
                {error}
              </div>
            )}

            {review && (
              <>
                {/* Required findings */}
                {req.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#A93F2F]" />
                      <p className="text-[12px] font-bold text-[#A93F2F] uppercase tracking-wide">
                        Required — {req.length} finding{req.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    {req.map(f => (
                      <FindingCard
                        key={f.id}
                        finding={f}
                        onApply={setDiffTarget}
                        onEditMyself={handleEditMyself}
                      />
                    ))}
                  </section>
                )}

                {/* Suggestions */}
                {sug.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#CC8400]" />
                      <p className="text-[12px] font-bold text-[#CC8400] uppercase tracking-wide">
                        Suggested — {sug.length}
                      </p>
                    </div>
                    {sug.map(f => (
                      <FindingCard
                        key={f.id}
                        finding={f}
                        onApply={setDiffTarget}
                        onEditMyself={handleEditMyself}
                      />
                    ))}
                  </section>
                )}

                {/* All clear */}
                {req.length === 0 && sug.length === 0 && (
                  <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] p-5 text-center">
                    <CheckCircle2 className="w-7 h-7 text-[#2F6B3F] mx-auto mb-2" />
                    <p className="text-[13px] font-bold text-[#245531]">All checks passed</p>
                    <p className="text-[11px] text-[#2F6B3F] mt-0.5">
                      Penny has no required or suggested findings. This article is ready for Approval.
                    </p>
                  </div>
                )}

                {/* Passed checks — collapsible */}
                {pas.length > 0 && (
                  <section className="space-y-2">
                    <button
                      onClick={() => setPassedOpen(o => !o)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#245531]" />
                      <p className="text-[12px] font-bold text-[#245531] uppercase tracking-wide flex-1">
                        Passed — {pas.length} check{pas.length === 1 ? '' : 's'}
                      </p>
                      {passedOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                    {passedOpen && (
                      <div className="space-y-1.5">
                        {pas.map(p => (
                          <div key={p.type} className="flex items-start gap-2 rounded-lg border border-[#9FC3AE] bg-[#E6F0EA]/40 px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] mt-0.5 shrink-0" />
                            <p className="text-[12px] text-foreground leading-snug">{p.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right rail ─────────────────────────────────────────────────────── */}
      <ReviewRail />

      {/* ── Diff modal ─────────────────────────────────────────────────────── */}
      {diffTarget && (
        <DiffModal
          finding={diffTarget}
          onConfirm={handleApplyConfirm}
          onCancel={() => setDiffTarget(null)}
          applying={applying}
        />
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function KnowledgeStudioReview() {
  const { articles, loading: articlesLoading } = useKnowledgeArticles();
  const [, setLocation]                        = useLocation();

  // Accept an ID either from the URL param or from a local state selection
  const [matchReview, reviewParams] = useRoute('/knowledge/studio/penny-review/:id');
  const urlId       = matchReview ? (reviewParams as { id: string }).id : null;
  const [localId, setLocalId] = useState<string | null>(null);

  const selectedId  = urlId ?? localId;
  const article     = selectedId ? articles.find(a => a.id === selectedId) : null;

  function handleSelect(id: string) {
    setLocalId(id);
    setLocation(`/knowledge/studio/penny-review/${id}`);
  }

  function handleBack() {
    setLocalId(null);
    setLocation('/knowledge/studio/penny-review');
  }

  if (articlesLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading articles…</span>
      </div>
    );
  }

  if (article) {
    return <ArticleReview article={article} onBack={handleBack} />;
  }

  return <ArticlePicker articles={articles} onSelect={handleSelect} />;
}
