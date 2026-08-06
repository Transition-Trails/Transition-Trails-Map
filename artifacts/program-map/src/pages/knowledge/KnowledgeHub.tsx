import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import {
  useKnowledgeArticles,
  type KnowledgeArticle,
  type ArticleFormData,
  type ReviewCycle,
} from '@/hooks/useKnowledgeArticles';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';
import { RichTextEditor } from '@/components/knowledge/RichTextEditor';
import {
  ShieldCheck, PenLine, Plus, CheckCircle2, AlertCircle,
  Clock, CloudUpload, Trash2, Send, Eye, RotateCcw, Loader2,
  Sparkles, Brain, Target, RefreshCw, X, ExternalLink, FileText,
  AlertTriangle, ChevronRight, BarChart2, Database,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

type HubMode = 'builder' | 'governance';
type GovTab  = 'health' | 'review' | 'sources' | 'sf';

// ── Constants / helpers ────────────────────────────────────────────────────────

const CATEGORIES = [
  'Mission & Delivery', 'Operations & Business', 'Curriculum', 'Coaching',
  'Career', 'HR', 'Brand', 'Strategy', 'Finance', 'Technology', 'General',
];
const REVIEW_CYCLES: ReviewCycle[] = ['Monthly', 'Quarterly', 'Yearly'];
const CYCLE_DAYS: Record<ReviewCycle, number> = { Monthly: 30, Quarterly: 90, Yearly: 365 };

function isOverdue(a: KnowledgeArticle): boolean {
  const base = a.reviewedAt ?? a.updatedAt;
  if (!base) return false;
  return (Date.now() - new Date(base).getTime()) / 86_400_000 > CYCLE_DAYS[a.reviewCycle];
}
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
function fmt(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LS_MODE    = 'trailos:knowledgeHubMode';
const LS_ARTICLE = 'knowledge_last_article_id';
function lsRead<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function lsWrite(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }

interface ReviewRecord {
  reviewedAt:    string | null;
  reviewedBy:    string | null;
  nextReviewDue: string | null;
}
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

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:            'Draft',
  'pending-review': 'In Review',
  approved:         'Approved',
  published:        'Published',
};
const STATUS_STYLES: Record<string, string> = {
  draft:            'bg-muted text-muted-foreground border-border',
  'pending-review': 'bg-amber-50 text-amber-700 border-amber-200',
  approved:         'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  published:        'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
};
const STATUS_DOT: Record<string, string> = {
  draft:            'bg-muted-foreground/30',
  'pending-review': 'bg-amber-400',
  approved:         'bg-[#2F6B3F]',
  published:        'bg-[#2F6F7E]',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── ModeSwitcher ───────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, setMode }: { mode: HubMode; setMode: (m: HubMode) => void }) {
  return (
    <div className="shrink-0 px-5 pt-4 pb-3 border-b border-border bg-background">
      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2.5">Knowledge</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Builder */}
        <button
          onClick={() => setMode('builder')}
          className={`rounded-xl border-2 p-3.5 text-left transition-all ${
            mode === 'builder'
              ? 'border-[#7FAFC6] bg-[#EDF5F8]'
              : 'border-border bg-white hover:border-[#7FAFC6]/40 hover:bg-[#EDF5F8]/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mode === 'builder' ? 'bg-[#2F6F7E]' : 'bg-[#EDF5F8]'}`}>
              <PenLine className={`w-3.5 h-3.5 ${mode === 'builder' ? 'text-white' : 'text-[#2F6F7E]'}`} />
            </div>
            <p className={`text-[13px] font-bold ${mode === 'builder' ? 'text-[#1E4A56]' : 'text-foreground'}`}>Builder</p>
            {mode === 'builder' && <span className="ml-auto w-2 h-2 rounded-full bg-[#2F6F7E]" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">Author, review &amp; publish articles with {TERMS.aiAssistant}</p>
        </button>

        {/* Governance */}
        <button
          onClick={() => setMode('governance')}
          className={`rounded-xl border-2 p-3.5 text-left transition-all ${
            mode === 'governance'
              ? 'border-sky-400 bg-sky-50'
              : 'border-border bg-white hover:border-sky-200 hover:bg-sky-50/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${mode === 'governance' ? 'bg-sky-500' : 'bg-sky-100'}`}>
              <ShieldCheck className={`w-3.5 h-3.5 ${mode === 'governance' ? 'text-white' : 'text-sky-600'}`} />
            </div>
            <p className={`text-[13px] font-bold ${mode === 'governance' ? 'text-sky-800' : 'text-foreground'}`}>Governance</p>
            {mode === 'governance' && <span className="ml-auto w-2 h-2 rounded-full bg-sky-500" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">Article health, review queue &amp; source integrity</p>
        </button>
      </div>
    </div>
  );
}

// ── Builder: Article tree ──────────────────────────────────────────────────────

const TREE_GROUPS: { status: string; label: string }[] = [
  { status: 'draft',          label: 'Drafts'    },
  { status: 'pending-review', label: 'In Review' },
  { status: 'approved',       label: 'Approved'  },
  { status: 'published',      label: 'Published' },
];

function ArticleTree({
  articles, loading, selectedId, onSelect, onNew,
}: {
  articles: KnowledgeArticle[];
  loading:  boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['draft', 'pending-review']));

  function toggle(status: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(status) ? n.delete(status) : n.add(status); return n; });
  }

  return (
    <div className="w-[240px] shrink-0 border-r border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/50 bg-muted/20 shrink-0 flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Articles</p>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#2F6F7E] bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-2 py-0.5 hover:bg-[#dbeaf1] transition-colors"
        >
          <Plus className="w-3 h-3" />New
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading…
        </div>
      )}

      <ScrollArea className="flex-1">
        {TREE_GROUPS.map(group => {
          const groupArticles = articles.filter(a => a.status === group.status);
          if (groupArticles.length === 0) return null;
          const isOpen = expanded.has(group.status);
          return (
            <div key={group.status}>
              <button
                onClick={() => toggle(group.status)}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
              >
                <ChevronRight className={`w-3 h-3 text-muted-foreground/50 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[group.status]}`} />
                <span className="text-[11px] font-bold text-muted-foreground">{group.label}</span>
                <span className="ml-auto text-[10px] font-bold text-muted-foreground/40">{groupArticles.length}</span>
              </button>

              {isOpen && groupArticles.map(a => {
                const isSel = a.id === selectedId;
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a.id)}
                    className={`w-full flex items-start gap-2 px-3 py-2.5 text-left border-b border-border/20 transition-colors ${
                      isSel ? 'bg-[#EDF5F8] border-l-2 border-l-[#2F6F7E]' : 'hover:bg-muted/20 border-l-2 border-l-transparent'
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSel ? 'text-[#2F6F7E]' : 'text-muted-foreground/40'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold leading-snug truncate ${isSel ? 'text-[#1E4A56]' : 'text-foreground'}`}>
                        {a.title || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {a.category && <span className="text-[10px] text-muted-foreground/60 truncate">{a.category}</span>}
                        {isOverdue(a) && <span title="Overdue for review"><AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /></span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        {!loading && articles.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No articles yet. Start by creating one.</div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Builder: Article editor ────────────────────────────────────────────────────

interface ArticleEditorProps {
  isNew:              boolean;          // true = creating new (article = null)
  article:            KnowledgeArticle | null;
  onSave:             (form: ArticleFormData) => Promise<void>;
  onSubmitForReview:  () => Promise<void>;
  onApprove:          () => Promise<void>;
  onRequestChanges:   (note: string) => Promise<void>;
  onPublishToSf:      () => Promise<void>;
  onDelete:           () => Promise<void>;
  saving: boolean;
}

function ArticleEditor({
  isNew, article, onSave, onSubmitForReview, onApprove, onRequestChanges, onPublishToSf, onDelete, saving,
}: ArticleEditorProps) {
  const { types: articleTypes, loading: typesLoading } = useArticleTypes();

  const [title,       setTitle]       = useState(article?.title       ?? '');
  const [summary,     setSummary]     = useState(article?.summary     ?? '');
  const [body,        setBody]        = useState(article?.body        ?? '');
  const [category,    setCategory]    = useState(article?.category    ?? CATEGORIES[0]!);
  const [articleType, setArticleType] = useState(article?.articleType ?? '');
  const [reviewCycle, setReviewCycle] = useState<ReviewCycle>(article?.reviewCycle ?? 'Quarterly');
  const [dirty,       setDirty]       = useState(false);
  const [reviewNote,  setReviewNote]  = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    setTitle(article?.title       ?? '');
    setSummary(article?.summary   ?? '');
    setBody(article?.body         ?? '');
    setCategory(article?.category ?? CATEGORIES[0]!);
    setArticleType(article?.articleType ?? '');
    setReviewCycle(article?.reviewCycle ?? 'Quarterly');
    setDirty(false);
    setShowRejectForm(false);
    setReviewNote('');
  }, [article?.id, isNew]);

  useEffect(() => {
    if (!articleType && articleTypes.length > 0) setArticleType(articleTypes[0]!.value);
  }, [articleTypes, articleType]);

  function mark<T>(setter: (v: T) => void) { return (v: T) => { setter(v); setDirty(true); }; }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!isNew && !article) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 bg-muted/10 p-8">
        <div className="w-14 h-14 rounded-2xl bg-[#EDF5F8] flex items-center justify-center">
          <FileText className="w-7 h-7 text-[#2F6F7E]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-foreground mb-1">Select an article</p>
          <p className="text-[13px] text-muted-foreground max-w-[240px]">
            Choose an article from the tree, or click <strong>+ New</strong> to start one
          </p>
        </div>
      </div>
    );
  }

  const status    = article?.status ?? 'draft';
  const canSubmit = !isNew && status === 'draft' && title.trim().length > 0 && !dirty;

  // ── Published / Approved pane ────────────────────────────────────────────
  if (!isNew && (status === 'published' || status === 'approved')) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-5 py-3.5 border-b border-border shrink-0 flex items-center gap-2">
          <CloudUpload className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[15px] font-bold text-foreground truncate flex-1">{article?.title}</h2>
          <StatusBadge status={status} />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4 max-w-2xl">
            {article?.category && (
              <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">{article.category}</p>
            )}
            {article?.summary && <p className="text-[14px] text-muted-foreground italic">{article.summary}</p>}

            {status === 'approved' && (
              <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                <p className="text-[13px] font-semibold text-foreground">Ready to publish to Salesforce</p>
                <p className="text-[12px] text-muted-foreground">
                  Approved {fmt(article?.reviewedAt)}{article?.reviewedBy ? ` by ${article.reviewedBy}` : ''}. Publishing creates a Salesforce Knowledge article.
                </p>
                <button
                  onClick={onPublishToSf}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2F6F7E] text-white text-[13px] font-semibold hover:bg-[#245564] disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                  Publish to Salesforce
                </button>
              </div>
            )}

            {status === 'published' && (
              <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#245531]" />
                  <p className="text-[13px] font-semibold text-[#245531]">Published to Salesforce</p>
                </div>
                <p className="text-[12px] text-[#245531]/80">
                  Published {fmt(article?.publishedAt)}. SF status: <strong>{article?.sfPublishStatus ?? 'Draft'}</strong>.
                </p>
                {article?.sfPublishStatus === 'Draft' && (
                  <p className="text-[11px] text-[#245531]/70">The article was created in Salesforce as a Draft. Open Salesforce Knowledge to publish it online.</p>
                )}
                {article?.sfArticleId && (
                  <p className="text-[12px] font-mono text-foreground">ID: {article.sfArticleId}</p>
                )}
                <span className="flex items-center gap-1 text-[12px] text-[#2F6F7E]">
                  <ExternalLink className="w-3 h-3" />Manage in Salesforce Knowledge
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── Review pane ──────────────────────────────────────────────────────────
  if (!isNew && status === 'pending-review') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-5 py-3.5 border-b border-border shrink-0 flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-[15px] font-bold text-foreground truncate flex-1">{article?.title}</h2>
          <StatusBadge status={status} />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4 max-w-3xl">
            {article?.category && (
              <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wide">{article.category}</p>
            )}
            {article?.summary && <p className="text-[14px] text-muted-foreground italic">{article.summary}</p>}
            {article?.body ? (
              <div
                className="rich-editor rounded-lg border border-border bg-background px-5 py-4 text-[14px] leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-[13px] text-muted-foreground">No body content.</p>
              </div>
            )}
            <p className="text-[12px] text-muted-foreground/60">
              Submitted {fmt(article?.updatedAt)}{article?.authoredBy ? ` by ${article.authoredBy}` : ''}
            </p>

            {!showRejectForm ? (
              <div className="flex items-center gap-2">
                <button onClick={onApprove} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2F6B3F] text-white text-[13px] font-semibold hover:bg-[#245531] disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[13px] font-semibold hover:bg-amber-100 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />Request Changes
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Describe what needs to change before this can be approved…"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => { try { await onRequestChanges(reviewNote); setShowRejectForm(false); setReviewNote(''); } catch { /* toast shown by handler */ } }}
                    disabled={saving || !reviewNote.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Send Back
                  </button>
                  <button onClick={() => { setShowRejectForm(false); setReviewNote(''); }}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-[12px] hover:bg-muted transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── Edit / new form ──────────────────────────────────────────────────────
  async function handleSave() {
    try {
      await onSave({ title, summary, body, category, articleType, reviewCycle, urlName: slugify(title) });
      setDirty(false);
    } catch {
      // onSave already showed a toast; keep dirty=true so the save button stays enabled for retry
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <PenLine className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-[15px] font-bold text-foreground truncate">
              {isNew ? 'New Article' : (article?.title || 'Untitled')}
            </span>
            {!isNew && <StatusBadge status={status} />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isNew && (
              <button onClick={onDelete}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete draft">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || (!dirty && !isNew)}
              className="px-3 py-1.5 rounded-lg bg-[#2F6F7E] text-white text-[12px] font-semibold hover:bg-[#245564] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && !canSubmit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isNew ? 'Create Draft' : 'Save'}
            </button>
            {canSubmit && (
              <button onClick={onSubmitForReview} disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors">
                <Send className="w-3 h-3" />Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-3xl">
          {dirty && !isNew && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Unsaved changes — save before submitting for review.
            </div>
          )}
          {article?.reviewNote && (
            <div className="px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-[12px] font-semibold text-amber-700">Reviewer note</p>
              <p className="text-[13px] text-amber-800 mt-0.5">{article.reviewNote}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Title *</label>
            <input value={title} onChange={e => mark(setTitle)(e.target.value)} placeholder="Article title"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30" />
          </div>

          {/* Category + SF Type + Review Cycle */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Category</label>
              <select value={category} onChange={e => mark(setCategory)(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                SF Type {typesLoading && <RefreshCw className="inline w-2.5 h-2.5 ml-1 animate-spin opacity-50" />}
              </label>
              {articleTypes.length > 0 ? (
                <select value={articleType} onChange={e => mark(setArticleType)(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30">
                  {articleTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              ) : (
                <input value={articleType} onChange={e => mark(setArticleType)(e.target.value)}
                  placeholder={typesLoading ? 'Loading…' : 'e.g. Knowledge__kav'}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30" />
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Review Cycle</label>
              <select value={reviewCycle} onChange={e => mark(setReviewCycle)(e.target.value as ReviewCycle)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30">
                {REVIEW_CYCLES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Summary</label>
            <textarea value={summary} onChange={e => mark(setSummary)(e.target.value)}
              placeholder="A brief description visible in search results and article listings."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#2F6F7E]/30 resize-none" />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">Body *</label>
            <RichTextEditor value={body} onChange={v => mark(setBody)(v)}
              placeholder="Write your article here. Use the toolbar for headings, lists, links, and formatting."
              minHeight={360} />
          </div>

          {!isNew && article && (
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

// ── Builder: Penny co-author rail ──────────────────────────────────────────────

function KnowledgePennyRail({ article }: { article: KnowledgeArticle | null }) {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  function firePenny(q: string) { setPendingPennyQuery(q); setAskPennyOpen(true); }

  const actions = article ? [
    {
      label: 'Draft an opening paragraph',
      query: `I'm writing a knowledge article called "${article.title}" in the ${article.category} category. Draft a compelling opening paragraph (2–3 sentences) that states the article's purpose, who it's for, and what they'll learn. Keep it clear and professional.`,
      icon: PenLine, color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8] hover:bg-[#dbeaf1] border-[#7FAFC6]',
    },
    {
      label: 'Check for knowledge gaps',
      query: `Review the knowledge article "${article.title}" (category: ${article.category}). What key topics, subtopics, or use cases might be missing? Give me a prioritized list of gaps and suggest a sentence for each that I could add.`,
      icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    },
    {
      label: 'Write a search summary',
      query: `Write a 2-sentence summary for a knowledge article titled "${article.title}" in the ${article.category} category. It will appear in search results. Clearly state what the article covers and who it helps.`,
      icon: Target, color: 'text-[#245531]', bg: 'bg-[#E6F0EA] hover:bg-[#d6e8dc] border-[#9FC3AE]',
    },
    {
      label: 'Suggest related articles',
      query: `What other knowledge articles would complement "${article.title}" in a Transition Trails knowledge base? List 5 related article titles with a one-line description of each. Focus on content learners would want to read next.`,
      icon: Brain, color: 'text-secondary', bg: 'bg-secondary/5 hover:bg-secondary/10 border-secondary/20',
    },
  ] : [];

  return (
    <div className="w-[272px] shrink-0 border-l border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 bg-muted/10">
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles className="w-3.5 h-3.5 text-secondary" />
          <p className="text-[13px] font-bold text-foreground">{TERMS.aiAssistant} Co-Author</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Context-aware assistance</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {!article ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Sparkles className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Select or create an article to get context-aware suggestions</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/10 p-3">
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-1">Current Article</p>
                <p className="text-[12px] font-semibold text-foreground truncate">{article.title || 'Untitled'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={article.status} />
                  {article.category && <span className="text-[10px] text-muted-foreground/60">{article.category}</span>}
                </div>
                {isOverdue(article) && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-amber-600 font-semibold">
                    <AlertTriangle className="w-3 h-3" />Overdue for {article.reviewCycle.toLowerCase()} review
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Quick actions</p>
                <div className="space-y-1.5">
                  {actions.map(action => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} onClick={() => firePenny(action.query)}
                        className={`w-full text-left flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors ${action.bg}`}>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${action.color}`} />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {article.status === 'draft' && (
                <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Review cycle</p>
                  <p className="text-[12px] text-foreground">{article.reviewCycle} — due every {CYCLE_DAYS[article.reviewCycle]} days</p>
                  <p className="text-[11px] text-muted-foreground">Last updated {fmt(article.updatedAt)}</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Governance: Article Health ─────────────────────────────────────────────────

const HEALTH_DIMS = [
  { key: 'hasSummary',  label: 'Summary'   },
  { key: 'hasBody',     label: 'Body'      },
  { key: 'isCurrent',   label: 'Current'   },
  { key: 'sfSynced',    label: 'SF Synced' },
  { key: 'hasCategory', label: 'Category'  },
  { key: 'published',   label: 'Published' },
];

function articleDims(
  a: KnowledgeArticle,
  reviewMap: Record<string, ReviewRecord>,
): Record<string, boolean> {
  return {
    hasSummary:  (a.summary ?? '').trim().length > 10,
    hasBody:     (a.body    ?? '').trim().length > 100,
    isCurrent:   !isOverdueWithReviews(a, reviewMap),
    sfSynced:    !!a.sfArticleId,
    hasCategory: !!a.category,
    published:   a.status === 'published',
  };
}

function ArticleHealthTab({
  articles,
  reviewMap,
  reviewsLoading,
}: {
  articles:      KnowledgeArticle[];
  reviewMap:     Record<string, ReviewRecord>;
  reviewsLoading: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const filtered = filterStatus === 'all' ? articles : articles.filter(a => a.status === filterStatus);
  const overdue  = articles.filter(a => isOverdueWithReviews(a, reviewMap)).length;

  return (
    <div className="p-5 overflow-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Article Quality Matrix</p>
        <div className="flex items-center gap-1.5">
          {(['all', 'draft', 'pending-review', 'approved', 'published'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                filterStatus === s ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:bg-muted'
              }`}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {reviewsLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20 text-muted-foreground text-[12px] mb-3">
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
          Loading review history…
        </div>
      )}
      {!reviewsLoading && overdue > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[12px] mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {overdue} article{overdue !== 1 ? 's' : ''} overdue for review based on their review cycle and last governance review date.
        </div>
      )}

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground/60 min-w-[200px]">Article</th>
              {HEALTH_DIMS.map(d => (
                <th key={d.key} className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">{d.label}</th>
              ))}
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map(a => {
              const dims  = articleDims(a, reviewMap);
              const pass  = Object.values(dims).filter(Boolean).length;
              const score = Math.round((pass / HEALTH_DIMS.length) * 100);
              return (
                <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground text-[12px] truncate max-w-[180px]" title={a.title}>{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusBadge status={a.status} />
                      {isOverdueWithReviews(a, reviewMap) && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                          <AlertTriangle className="w-2.5 h-2.5" />Overdue
                        </span>
                      )}
                    </div>
                  </td>
                  {HEALTH_DIMS.map(d => (
                    <td key={d.key} className="px-3 py-2 text-center">
                      {dims[d.key]
                        ? <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] mx-auto" />
                        : <X className="w-4 h-4 text-[#A93F2F]/40 mx-auto" />}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                      score >= 80 ? 'text-[#245531] bg-[#E6F0EA]' :
                      score >= 50 ? 'text-[#CC8400] bg-[#FFF3E0]' :
                      'text-[#A93F2F] bg-[#FBEAE6]'
                    }`}>{score}%</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={HEALTH_DIMS.length + 2} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No articles found.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <td className="px-4 py-2 text-[11px] font-bold text-muted-foreground/50">Coverage</td>
              {HEALTH_DIMS.map(d => {
                const count  = filtered.length;
                const passed = count ? filtered.filter(a => articleDims(a, reviewMap)[d.key]).length : 0;
                const pct    = count ? Math.round((passed / count) * 100) : 0;
                return <td key={d.key} className="px-3 py-2 text-center text-[11px] font-bold text-muted-foreground/60">{pct}%</td>;
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Governance: Review Queue ───────────────────────────────────────────────────

function ReviewQueueTab({
  articles, onApprove, onRequestChanges, saving,
}: {
  articles: KnowledgeArticle[];
  onApprove: (id: string) => Promise<void>;
  onRequestChanges: (id: string, note: string) => Promise<void>;
  saving: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteMap,    setNoteMap]    = useState<Record<string, string>>({});
  const pending = articles.filter(a => a.status === 'pending-review');

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-8">
        <CheckCircle2 className="w-10 h-10 text-[#2F6B3F]/40" />
        <p className="text-[15px] font-semibold text-foreground">Review queue is clear</p>
        <p className="text-[13px] text-muted-foreground">No articles pending review right now.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-2">
      <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">
        {pending.length} article{pending.length !== 1 ? 's' : ''} pending review
      </p>
      {pending.map(a => {
        const isExpanded = expandedId === a.id;
        const note = noteMap[a.id] ?? '';
        return (
          <div key={a.id} className="rounded-xl border border-border bg-white overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {a.category && <span className="text-[11px] text-muted-foreground">{a.category}</span>}
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[11px] text-muted-foreground">Submitted {fmt(a.updatedAt)}</span>
                  {a.authoredBy && <span className="text-[11px] text-muted-foreground/60">by {a.authoredBy}</span>}
                </div>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 py-3 space-y-3">
                {a.summary && <p className="text-[13px] text-muted-foreground italic">{a.summary}</p>}
                {a.reviewNote && (
                  <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
                    <p className="text-[11px] font-semibold text-amber-700">Previous reviewer note</p>
                    <p className="text-[12px] text-amber-800 mt-0.5">{a.reviewNote}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => { void onApprove(a.id).catch(() => { /* toast shown by handler */ }); }} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2F6B3F] text-white text-[12px] font-semibold hover:bg-[#245531] disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Or request changes:</p>
                  <textarea value={note}
                    onChange={e => setNoteMap(prev => ({ ...prev, [a.id]: e.target.value }))}
                    placeholder="Describe what needs to change…" rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  <button
                    onClick={async () => { try { await onRequestChanges(a.id, note); setNoteMap(p => ({ ...p, [a.id]: '' })); setExpandedId(null); } catch { /* toast shown by handler */ } }}
                    disabled={saving || !note.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-semibold hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />Send Back
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Governance: Source Health ──────────────────────────────────────────────────

function SourceHealthTab() {
  const { sources, summary, isLoading, isError } = useKnowledgeSources();

  if (isLoading) return (
    <div className="flex items-center gap-2 p-6 text-[13px] text-muted-foreground">
      <RefreshCw className="w-4 h-4 animate-spin" />Loading sources…
    </div>
  );
  if (isError) return <div className="p-6 text-[13px] text-[#A93F2F]">Could not load source data.</div>;

  const HEALTH_CHIP: Record<string, string> = {
    Healthy:  'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]',
    Warning:  'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    Critical: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',
  };
  const AVAIL_CHIP: Record<string, string> = {
    Available: 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]',
    Partial:   'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
    Future:    'text-slate-500 bg-slate-50 border-slate-200',
  };

  return (
    <div className="p-5 overflow-auto h-full">
      <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-3">Knowledge Source Health</p>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Sources',  value: summary.total,            color: '' },
          { label: 'Available',      value: summary.available,        color: 'text-[#245531]' },
          { label: 'Healthy',        value: summary.healthy,          color: 'text-[#245531]' },
          { label: 'Penny Approved', value: summary.approvedForPenny, color: 'text-secondary' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-white p-3 text-center">
            <p className={`text-xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground/60">Source</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Type</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Availability</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Health</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Penny</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {sources.map(s => (
              <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground text-[12px]">{s.name}</p>
                  {s.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{s.description}</p>}
                </td>
                <td className="px-3 py-2 text-center text-[11px] text-muted-foreground">{s.type}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] font-semibold border rounded-full px-1.5 py-0.5 ${AVAIL_CHIP[s.availability] ?? 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {s.availability}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] font-semibold border rounded-full px-1.5 py-0.5 ${HEALTH_CHIP[s.healthStatus] ?? 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                    {s.healthStatus}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {s.approvedForPenny
                    ? <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] mx-auto" />
                    : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />}
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-foreground">No sources found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Governance: SF Articles ────────────────────────────────────────────────────

function SfArticlesTab({ articles }: { articles: KnowledgeArticle[] }) {
  const published = articles.filter(a => a.status === 'published');
  const { sfKnowledgeEnrichment } = useKnowledgeSources();

  return (
    <div className="p-5 overflow-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide">Salesforce Knowledge Sync</p>
        {sfKnowledgeEnrichment?.totalArticles != null && (
          <p className="text-[12px] text-muted-foreground">{sfKnowledgeEnrichment.totalArticles} articles in Salesforce org</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Published here',  value: published.length },
          { label: 'SF-synced',       value: published.filter(a => !!a.sfArticleId).length },
          { label: 'SF online',       value: published.filter(a => !!a.sfPublishStatus && a.sfPublishStatus !== 'Draft').length },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-white p-3 text-center">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-muted-foreground/60">Article</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60">SF Article ID</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">SF Status</th>
              <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground/60 text-center">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {published.map(a => (
              <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground text-[12px]">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground">{a.category}</p>
                </td>
                <td className="px-3 py-2">
                  {a.sfArticleId
                    ? <span className="text-[11px] font-mono text-foreground">{a.sfArticleId}</span>
                    : <span className="text-[11px] text-muted-foreground/40">Not synced</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {a.sfPublishStatus ? (
                    <span className={`text-[11px] font-semibold border rounded-full px-1.5 py-0.5 ${
                      a.sfPublishStatus !== 'Draft' ? 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' : 'text-slate-500 bg-slate-50 border-slate-200'
                    }`}>{a.sfPublishStatus}</span>
                  ) : <span className="text-[11px] text-muted-foreground/40">—</span>}
                </td>
                <td className="px-3 py-2 text-center text-[11px] text-muted-foreground">{fmt(a.publishedAt)}</td>
              </tr>
            ))}
            {published.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[13px] text-muted-foreground">No published articles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Governance: Right rail ─────────────────────────────────────────────────────

function KnowledgeGovernanceRail({
  articles,
  reviewMap,
}: {
  articles:  KnowledgeArticle[];
  reviewMap: Record<string, ReviewRecord>;
}) {
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();
  const { summary: sourceSummary } = useKnowledgeSources();

  const total     = articles.length;
  const drafts    = articles.filter(a => a.status === 'draft').length;
  const inReview  = articles.filter(a => a.status === 'pending-review').length;
  const approved  = articles.filter(a => a.status === 'approved').length;
  const published = articles.filter(a => a.status === 'published').length;
  const overdue   = articles.filter(a => isOverdueWithReviews(a, reviewMap)).length;

  function fireGapSummary() {
    setPendingPennyQuery('Summarize the biggest knowledge gaps in the Transition Trails knowledge base. Consider coverage across categories, overdue reviews, and missing topics learners commonly need. Give me 5 prioritized gaps with a concrete next step for each.');
    setAskPennyOpen(true);
  }

  return (
    <div className="w-[272px] shrink-0 border-l border-border bg-white flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border shrink-0 bg-muted/10">
        <p className="text-[13px] font-bold text-foreground mb-0.5 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />Knowledge Summary
        </p>
        <p className="text-[11px] text-muted-foreground">Content health at a glance</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Articles</p>
            <div className="space-y-1.5">
              {[
                { label: 'Total',     value: total },
                { label: 'Drafts',    value: drafts },
                { label: 'In Review', value: inReview,  color: inReview  > 0 ? 'text-amber-600'   : '' },
                { label: 'Approved',  value: approved,  color: approved  > 0 ? 'text-[#245531]'   : '' },
                { label: 'Published', value: published, color: published  > 0 ? 'text-[#2F6F7E]'  : '' },
                { label: 'Overdue',   value: overdue,   color: overdue   > 0 ? 'text-[#A93F2F]'   : '' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className={`font-semibold ${s.color || 'text-foreground'}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide mb-2">Sources</p>
            <div className="space-y-1.5">
              {[
                { label: 'Total',        value: sourceSummary.total },
                { label: 'Available',    value: sourceSummary.available },
                { label: 'Healthy',      value: sourceSummary.healthy },
                { label: 'Penny Ready',  value: sourceSummary.approvedForPenny },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={fireGapSummary}
            className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-secondary border-2 border-secondary/20 bg-secondary/5 rounded-xl py-3 hover:bg-secondary/10 transition-colors">
            <Sparkles className="w-4 h-4" />Ask {TERMS.aiAssistant} about gaps
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Governance tab config ──────────────────────────────────────────────────────

const GOV_TABS: { id: GovTab; label: string; icon: React.ElementType }[] = [
  { id: 'health',  label: 'Article Health', icon: BarChart2   },
  { id: 'review',  label: 'Review Queue',   icon: Eye         },
  { id: 'sources', label: 'Source Health',  icon: Database    },
  { id: 'sf',      label: 'SF Articles',    icon: CloudUpload },
];

// ── Main hub ───────────────────────────────────────────────────────────────────

export default function KnowledgeHub() {
  const [location, navigate] = useLocation();
  const { toast }  = useToast();

  const [mode, setModeRaw] = useState<HubMode>(() => {
    if (location.startsWith('/knowledge/governance')) return 'governance';
    return lsRead<HubMode>(LS_MODE, 'builder');
  });
  function setMode(m: HubMode) { setModeRaw(m); lsWrite(LS_MODE, m); }

  const [govTab, setGovTab] = useState<GovTab>('health');

  const {
    articles, loading,
    createArticle, updateArticle,
    submitForReview, approveArticle, requestChanges,
    publishToSf, deleteArticle,
  } = useKnowledgeArticles();

  // Fetch real last-reviewed dates from the governance log (governance mode only).
  // Reviews are keyed by sfVersionId (SF KnowledgeArticleVersion.Id), not local id.
  const sfVersionIds = articles
    .map(a => a.sfVersionId)
    .filter((id): id is string => !!id);
  const { reviewMap, loading: reviewsLoading } = useArticleReviewsBatch(
    mode === 'governance' ? sfVersionIds : [],
  );

  // ── Persisted article selection ──────────────────────────────────────────────
  // Priority: ?article=<id> URL param → localStorage → null
  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('article');
    if (fromUrl) return fromUrl;
    return lsRead<string | null>(LS_ARTICLE, null);
  });

  function setSelectedId(id: string | null) {
    setSelectedIdRaw(id);
    if (id) {
      lsWrite(LS_ARTICLE, id);
      navigate(`/knowledge?article=${id}`, { replace: true });
    } else {
      lsWrite(LS_ARTICLE, null);
      navigate('/knowledge', { replace: true });
    }
  }

  // Once articles finish loading, drop the persisted ID if it no longer exists
  useEffect(() => {
    if (loading || !selectedId) return;
    if (!articles.find(a => a.id === selectedId)) {
      setSelectedIdRaw(null);
      lsWrite(LS_ARTICLE, null);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isNewArticle, setIsNewArticle] = useState(false);
  const [saving,       setSaving]       = useState(false);

  const selectedArticle = selectedId ? (articles.find(a => a.id === selectedId) ?? null) : null;

  useEffect(() => {
    if (location.startsWith('/knowledge/governance')) setMode('governance');
  }, [location]);

  // ── Action handlers ────────────────────────────────────────────────────────

  async function handleSave(form: ArticleFormData) {
    setSaving(true);
    try {
      if (isNewArticle) {
        const created = await createArticle({ ...form, urlName: slugify(form.title) });
        setSelectedId(created.id);
        setIsNewArticle(false);
        toast({ title: 'Article created', description: 'Draft saved to the database.' });
      } else if (selectedId) {
        await updateArticle(selectedId, form);
        toast({ title: 'Saved', description: 'Changes saved successfully.' });
      }
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  async function handleSubmit() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await submitForReview(selectedId);
      toast({ title: 'Submitted for review', description: 'Article is now in the review queue.' });
    } catch (e) {
      toast({ title: 'Submit failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  async function handleApprove(id?: string) {
    const target = id ?? selectedId;
    if (!target) return;
    setSaving(true);
    try {
      await approveArticle(target);
      toast({ title: 'Approved', description: 'Article is ready to publish to Salesforce.' });
    } catch (e) {
      toast({ title: 'Approve failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  async function handleRequestChangesById(id: string, note: string) {
    setSaving(true);
    try {
      await requestChanges(id, note);
      toast({ title: 'Changes requested', description: 'The author has been notified.' });
    } catch (e) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  async function handleRequestChangesForSelected(note: string) {
    if (!selectedId) return;
    await handleRequestChangesById(selectedId, note);
  }

  async function handlePublish() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await publishToSf(selectedId);
      toast({ title: 'Published to Salesforce', description: 'Article created in Salesforce Knowledge.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Publish to Salesforce failed', description: msg, variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await deleteArticle(selectedId);
      setSelectedId(null);
      setIsNewArticle(false);
      toast({ title: 'Deleted', description: 'Draft deleted.' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
      throw e;
    } finally { setSaving(false); }
  }

  function handleNew()          { setIsNewArticle(true);  setSelectedId(null); }
  function handleSelect(id: string) { setIsNewArticle(false); setSelectedId(id); }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ModeSwitcher mode={mode} setMode={setMode} />

      {/* ── BUILDER MODE ── */}
      {mode === 'builder' && (
        <div className="flex flex-1 overflow-hidden">
          <ArticleTree
            articles={articles}
            loading={loading}
            selectedId={isNewArticle ? null : selectedId}
            onSelect={handleSelect}
            onNew={handleNew}
          />
          <ArticleEditor
            isNew={isNewArticle}
            article={isNewArticle ? null : selectedArticle}
            onSave={handleSave}
            onSubmitForReview={handleSubmit}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChangesForSelected}
            onPublishToSf={handlePublish}
            onDelete={handleDelete}
            saving={saving}
          />
          <KnowledgePennyRail article={isNewArticle ? null : selectedArticle} />
        </div>
      )}

      {/* ── GOVERNANCE MODE ── */}
      {mode === 'governance' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border bg-background px-5 flex items-center gap-0.5">
              {GOV_TABS.map(t => {
                const Icon     = t.icon;
                const isActive = govTab === t.id;
                const badge    = t.id === 'review' ? articles.filter(a => a.status === 'pending-review').length : 0;
                return (
                  <button key={t.id} onClick={() => setGovTab(t.id)}
                    className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-sky-500 text-sky-700'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                    {badge > 0 && (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-sky-500 text-white' : 'bg-amber-400 text-white'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {govTab === 'health'  && <ArticleHealthTab articles={articles} reviewMap={reviewMap} reviewsLoading={reviewsLoading} />}
              {govTab === 'review'  && (
                <ScrollArea className="h-full">
                  <ReviewQueueTab
                    articles={articles}
                    onApprove={id => handleApprove(id)}
                    onRequestChanges={handleRequestChangesById}
                    saving={saving}
                  />
                </ScrollArea>
              )}
              {govTab === 'sources' && <SourceHealthTab />}
              {govTab === 'sf'      && <SfArticlesTab articles={articles} />}
            </div>
          </div>

          <KnowledgeGovernanceRail articles={articles} reviewMap={reviewMap} />
        </div>
      )}
    </div>
  );
}

function useArticleReviewsBatch(ids: string[]) {
  const [reviewMap, setReviewMap] = useState<Record<string, ReviewRecord>>({});
  const [loading,   setLoading]   = useState(false);
  const key = ids.join(',');
  useEffect(() => {
    if (!key) { setReviewMap({}); return; }
    setLoading(true);
    fetch(`/api/governance/article-reviews-batch?ids=${encodeURIComponent(key)}`, { credentials: 'include' })
      .then(r => r.json() as Promise<{ reviews: Record<string, ReviewRecord> }>)
      .then(d => setReviewMap(d.reviews ?? {}))
      .catch(() => setReviewMap({}))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { reviewMap, loading };
}

// reviewMap is keyed by sfVersionId (the Salesforce KnowledgeArticleVersion.Id),
// since that is what the mark-reviewed route stores as articleId.
// Articles without an sfVersionId (drafts, etc.) fall back to the heuristic.
function isOverdueWithReviews(
  a: KnowledgeArticle,
  reviewMap: Record<string, ReviewRecord>,
): boolean {
  const govRecord = a.sfVersionId ? reviewMap[a.sfVersionId] : undefined;

  if (govRecord) {
    // Use nextReviewDue from the governance log as the authoritative due date.
    if (govRecord.nextReviewDue) {
      return new Date(govRecord.nextReviewDue) < new Date();
    }
    // Has a review record but no nextReviewDue — treat as current.
    return false;
  }

  // No governance review record — fall back to article's own dates vs its cycle.
  const base = a.reviewedAt ?? a.updatedAt;
  if (!base) return true; // never reviewed at all → always overdue
  return (Date.now() - new Date(base).getTime()) / 86_400_000 > CYCLE_DAYS[a.reviewCycle];
}
