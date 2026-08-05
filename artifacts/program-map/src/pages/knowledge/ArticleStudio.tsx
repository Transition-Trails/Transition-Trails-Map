import { useState, useEffect, useCallback } from 'react';
import {
  PenLine, Send, CheckCircle2, CloudUpload, RotateCcw,
  Trash2, Plus, ChevronRight, AlertCircle, Loader2, ExternalLink,
  FileText, Clock, Eye, RefreshCw,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/knowledge/RichTextEditor';
import {
  useKnowledgeArticles,
  type KnowledgeArticle,
  type ArticleFormData,
  type ReviewCycle,
} from '@/hooks/useKnowledgeArticles';

const REVIEW_CYCLES: ReviewCycle[] = ['Monthly', 'Quarterly', 'Yearly'];

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:            'Draft',
  'pending-review': 'Pending Review',
  approved:         'Approved',
  published:        'Published',
};

const STATUS_STYLES: Record<string, string> = {
  draft:            'bg-muted text-muted-foreground border-border',
  'pending-review': 'bg-amber-50 text-amber-700 border-amber-200',
  approved:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  published:        'bg-sky-50 text-sky-700 border-sky-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:            <PenLine      className="w-3 h-3" />,
  'pending-review': <Clock        className="w-3 h-3" />,
  approved:         <CheckCircle2 className="w-3 h-3" />,
  published:        <CloudUpload  className="w-3 h-3" />,
};

const CATEGORIES = [
  'Mission & Delivery', 'Operations & Business', 'Curriculum', 'Coaching',
  'Career', 'HR', 'Brand', 'Strategy', 'Finance', 'Technology', 'General',
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {STATUS_ICON[status]}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── useArticleTypes — fetches SF article types ───────────────────────────────

interface ArticleType { value: string; label: string; }

function useArticleTypes() {
  const [types, setTypes]     = useState<ArticleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/knowledge/sf-article-types', { credentials: 'include' })
      .then(r => r.json() as Promise<{ articleTypes: ArticleType[] }>)
      .then(d => setTypes(d.articleTypes ?? []))
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, []);

  return { types, loading };
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyPane({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <FileText className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No article selected</p>
        <p className="text-[13px] text-muted-foreground mt-1">Select an article from the list or start a new one.</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> New Article
      </button>
    </div>
  );
}

// ─── EditForm ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  article: KnowledgeArticle | null; // null = new article
  onSave:   (data: ArticleFormData) => Promise<void>;
  onSubmit: () => Promise<void>;
  onDelete?: () => Promise<void>;
  saving:   boolean;
}

function EditForm({ article, onSave, onSubmit, onDelete, saving }: EditFormProps) {
  const { types: articleTypes, loading: typesLoading } = useArticleTypes();

  const [title,        setTitle]        = useState(article?.title        ?? '');
  const [summary,      setSummary]      = useState(article?.summary      ?? '');
  const [body,         setBody]         = useState(article?.body         ?? '');
  const [category,     setCategory]     = useState(article?.category     ?? CATEGORIES[0]!);
  const [articleType,  setArticleType]  = useState(article?.articleType  ?? '');
  const [reviewCycle,  setReviewCycle]  = useState<ReviewCycle>(article?.reviewCycle ?? 'Quarterly');
  const [dirty, setDirty]              = useState(false);

  // Reset when switching articles
  useEffect(() => {
    setTitle(article?.title        ?? '');
    setSummary(article?.summary    ?? '');
    setBody(article?.body          ?? '');
    setCategory(article?.category  ?? CATEGORIES[0]!);
    setArticleType(article?.articleType  ?? '');
    setReviewCycle(article?.reviewCycle  ?? 'Quarterly');
    setDirty(false);
  }, [article?.id]);

  // Default article type to first available SF type when loaded
  useEffect(() => {
    if (!articleType && articleTypes.length > 0) {
      setArticleType(articleTypes[0]!.value);
    }
  }, [articleTypes, articleType]);

  function mark<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); };
  }

  async function handleSave() {
    await onSave({ title, summary, body, category, articleType, reviewCycle, urlName: slugify(title) });
    setDirty(false);
  }

  const isNew     = !article;
  const canSubmit = !isNew && article.status === 'draft' && title.trim().length > 0 && !dirty;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <PenLine className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-[13px] font-semibold text-foreground truncate">
            {isNew ? 'New Article' : 'Edit Draft'}
          </span>
          {article && <StatusBadge status={article.status} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isNew && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Delete draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (!dirty && !isNew)}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && !canSubmit
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : isNew ? 'Create Draft' : 'Save'}
          </button>
          {canSubmit && (
            <button
              onClick={onSubmit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3 h-3" /> Submit for Review
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-3xl">

          {/* Unsaved warning */}
          {dirty && !isNew && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Unsaved changes — save before submitting for review.
            </div>
          )}

          {/* Reviewer note */}
          {article?.reviewNote && (
            <div className="px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
              <p className="text-[12px] font-semibold text-amber-700">Reviewer note</p>
              <p className="text-[13px] text-amber-800">{article.reviewNote}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Title *</label>
            <input
              value={title}
              onChange={e => mark(setTitle)(e.target.value)}
              placeholder="Article title"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Category + Article type + Review cycle — three column */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Category</label>
              <select
                value={category}
                onChange={e => mark(setCategory)(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                SF Article Type
                {typesLoading && <RefreshCw className="inline w-2.5 h-2.5 ml-1 animate-spin opacity-50" />}
              </label>
              {articleTypes.length > 0 ? (
                <select
                  value={articleType}
                  onChange={e => mark(setArticleType)(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {articleTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={articleType}
                  onChange={e => mark(setArticleType)(e.target.value)}
                  placeholder={typesLoading ? 'Loading…' : 'e.g. Knowledge__kav'}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
              {!typesLoading && articleTypes.length === 0 && (
                <p className="text-[11px] text-muted-foreground/60">
                  No article types found in SF — enter the __kav object name manually.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Review Cycle</label>
              <select
                value={reviewCycle}
                onChange={e => mark(setReviewCycle)(e.target.value as ReviewCycle)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {REVIEW_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Summary</label>
            <textarea
              value={summary}
              onChange={e => mark(setSummary)(e.target.value)}
              placeholder="A brief description visible in search results and article listings."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Body — rich text editor */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Body *</label>
            <RichTextEditor
              value={body}
              onChange={v => mark(setBody)(v)}
              placeholder="Write your article here. Use the toolbar for headings, lists, links, and formatting."
              minHeight={360}
            />
          </div>

          {!isNew && (
            <p className="text-[11px] text-muted-foreground/60 pt-1 border-t border-border/40">
              Created {fmt(article.createdAt)} · Updated {fmt(article.updatedAt)}
              {article.authoredBy ? ` · by ${article.authoredBy}` : ''}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── ReviewPane ───────────────────────────────────────────────────────────────

interface ReviewPaneProps {
  article:          KnowledgeArticle;
  onApprove:        () => Promise<void>;
  onRequestChanges: (note: string) => Promise<void>;
  saving:           boolean;
}

function ReviewPane({ article, onApprove, onRequestChanges, saving }: ReviewPaneProps) {
  const [note, setNote]           = useState('');
  const [showRequest, setShowRequest] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Review</span>
          <StatusBadge status={article.status} />
        </div>
        {article.articleType && (
          <span className="text-[11px] text-muted-foreground/60 font-mono">{article.articleType}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5 max-w-3xl">
          {/* Metadata */}
          <div className="space-y-1">
            {article.category && (
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">{article.category}</span>
            )}
            <h2 className="text-lg font-semibold text-foreground">{article.title}</h2>
            {article.summary && (
              <p className="text-[14px] text-muted-foreground italic">{article.summary}</p>
            )}
          </div>

          {/* Body preview */}
          {article.body ? (
            <div
              className="rich-editor rounded-lg border border-border bg-background px-5 py-4 text-[14px] leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: article.body }}
            />
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-[13px] text-muted-foreground">No body content.</p>
            </div>
          )}

          {/* Review actions */}
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Review Decision</p>
            <p className="text-[13px] text-muted-foreground">
              Submitted {fmt(article.updatedAt)}{article.authoredBy ? ` by ${article.authoredBy}` : ''}.
            </p>

            {!showRequest ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onApprove}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button
                  onClick={() => setShowRequest(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Request Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Describe what needs to change before this can be approved…"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => { await onRequestChanges(note); setShowRequest(false); setNote(''); }}
                    disabled={saving || !note.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Send Back
                  </button>
                  <button
                    onClick={() => { setShowRequest(false); setNote(''); }}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-[12px] hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── PublishPane ──────────────────────────────────────────────────────────────

interface PublishPaneProps {
  article:   KnowledgeArticle;
  onPublish: () => Promise<void>;
  saving:    boolean;
}

function PublishPane({ article, onPublish, saving }: PublishPaneProps) {
  const isPublished = article.status === 'published';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
        <CloudUpload className="w-4 h-4 text-muted-foreground" />
        <span className="text-[13px] font-semibold text-foreground">
          {isPublished ? 'Published to Salesforce' : 'Publish to Salesforce'}
        </span>
        <StatusBadge status={article.status} />
        {article.articleType && (
          <span className="ml-auto text-[11px] text-muted-foreground/60 font-mono">{article.articleType}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            {article.category && (
              <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">{article.category}</p>
            )}
            <p className="text-base font-semibold text-foreground">{article.title}</p>
            {article.summary && <p className="text-[13px] text-muted-foreground">{article.summary}</p>}
            <p className="text-[12px] text-muted-foreground/70">
              Approved {fmt(article.reviewedAt)}{article.reviewedBy ? ` by ${article.reviewedBy}` : ''}
            </p>
          </div>

          {isPublished ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-[13px] font-semibold text-emerald-700">Published to Salesforce</p>
                </div>
                <p className="text-[13px] text-emerald-700">
                  Published {fmt(article.publishedAt)}. SF status: <strong>{article.sfPublishStatus ?? 'Draft'}</strong>.
                </p>
                {article.sfPublishStatus === 'Draft' && (
                  <p className="text-[12px] text-emerald-600/80">
                    The article was created in Salesforce as a Draft. Open Salesforce Knowledge to publish it online.
                  </p>
                )}
              </div>
              {(article.sfArticleId || article.sfVersionId) && (
                <div className="rounded-lg border border-border bg-background p-3 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Salesforce IDs</p>
                  {article.sfArticleId   && <p className="text-[12px] text-foreground font-mono">Article: {article.sfArticleId}</p>}
                  {article.sfVersionId   && <p className="text-[12px] text-foreground font-mono">Version: {article.sfVersionId}</p>}
                </div>
              )}
              <p className="text-[12px] text-muted-foreground/70 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Manage this article in Salesforce Knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-[13px] font-semibold text-foreground">What happens when you publish</p>
                <ul className="space-y-1.5">
                  {[
                    `Creates a new ${article.articleType || 'Knowledge'} article record in Salesforce.`,
                    'Sends the title, summary, category, and formatted body to Salesforce.',
                    'If your org allows it, the article is published Online immediately. Otherwise it stays as a Draft for you to publish from Salesforce.',
                    'The Salesforce article ID is stored here so you can track it.',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onPublish}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white text-[13px] font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                  : <><CloudUpload className="w-4 h-4" /> Publish to Salesforce</>
                }
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Main: ArticleStudio ──────────────────────────────────────────────────────

type Filter = 'all' | 'draft' | 'pending-review' | 'approved' | 'published';

const FILTER_TABS: { id: Filter; label: string }[] = [
  { id: 'all',            label: 'All'       },
  { id: 'draft',          label: 'Drafts'    },
  { id: 'pending-review', label: 'In Review' },
  { id: 'approved',       label: 'Approved'  },
  { id: 'published',      label: 'Published' },
];

export default function ArticleStudio() {
  const {
    articles, loading, error, reload,
    createArticle, updateArticle,
    submitForReview, approveArticle, requestChanges,
    publishToSf, deleteArticle,
  } = useKnowledgeArticles();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew,      setIsNew]      = useState(false);
  const [filter,     setFilter]     = useState<Filter>('all');
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const selected = articles.find(a => a.id === selectedId) ?? null;
  const filtered = filter === 'all' ? articles : articles.filter(a => a.status === filter);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function wrap(fn: () => Promise<unknown>) {
    setSaving(true);
    try { await fn(); }
    catch (e) { showToast(e instanceof Error ? e.message : 'An error occurred', false); }
    finally   { setSaving(false); }
  }

  async function handleSave(data: ArticleFormData) {
    await wrap(async () => {
      if (isNew) {
        const created = await createArticle(data);
        setIsNew(false);
        setSelectedId(created.id);
        showToast('Draft created');
      } else if (selectedId) {
        await updateArticle(selectedId, data);
        showToast('Saved');
      }
    });
  }

  const handleSubmit      = useCallback(async () => { if (!selectedId) return; await wrap(async () => { await submitForReview(selectedId); showToast('Submitted for review'); }); }, [selectedId]);
  const handleApprove     = useCallback(async () => { if (!selectedId) return; await wrap(async () => { await approveArticle(selectedId);  showToast('Article approved');      }); }, [selectedId]);
  const handlePublish     = useCallback(async () => { if (!selectedId) return; await wrap(async () => { await publishToSf(selectedId);      showToast('Published to Salesforce'); }); }, [selectedId]);

  const handleRequestChanges = useCallback(async (note: string) => {
    if (!selectedId) return;
    await wrap(async () => { await requestChanges(selectedId, note); showToast('Changes requested — article returned to author'); });
  }, [selectedId]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    await wrap(async () => { await deleteArticle(selectedId); setSelectedId(null); showToast('Draft deleted'); });
  }, [selectedId]);

  function handleNew() { setIsNew(true); setSelectedId(null); }

  // Right-panel routing
  const showEdit    = isNew || (selected?.status === 'draft');
  const showReview  = !isNew && selected?.status === 'pending-review';
  const showPublish = !isNew && (selected?.status === 'approved' || selected?.status === 'published');

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* Toast */}
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-[13px] font-medium border ${
          toast.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Left: article list ── */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Article Studio</span>
          <button
            onClick={handleNew}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="New article"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-0.5 px-2 pt-2 pb-1">
          {FILTER_TABS.map(tab => {
            const count = tab.id === 'all'
              ? articles.length
              : articles.filter(a => a.status === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 text-[12px] text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-[12px] text-muted-foreground text-center">
              {filter === 'all' ? 'No articles yet.' : `No ${STATUS_LABELS[filter]?.toLowerCase()} articles.`}
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedId(a.id); setIsNew(false); }}
                  className={`w-full text-left px-4 py-3 flex items-start gap-2 transition-colors hover:bg-muted/50 ${
                    selectedId === a.id && !isNew ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{a.title || 'Untitled'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <StatusBadge status={a.status} />
                      <span className="text-[11px] text-muted-foreground/60">{fmt(a.updatedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-2 border-t border-border">
          <button onClick={reload} className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* ── Right: detail panel ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
        {showEdit ? (
          <EditForm
            article={isNew ? null : selected}
            onSave={handleSave}
            onSubmit={handleSubmit}
            onDelete={selected?.status === 'draft' ? handleDelete : undefined}
            saving={saving}
          />
        ) : showReview ? (
          <ReviewPane
            article={selected!}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
            saving={saving}
          />
        ) : showPublish ? (
          <PublishPane
            article={selected!}
            onPublish={handlePublish}
            saving={saving}
          />
        ) : (
          <EmptyPane onNew={handleNew} />
        )}
      </div>
    </div>
  );
}
