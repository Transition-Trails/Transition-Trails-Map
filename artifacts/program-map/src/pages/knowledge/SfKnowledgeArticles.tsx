// SfKnowledgeArticles — Browse and read Salesforce Knowledge articles.
// Full-width table with a slide-over popover for article content.

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, FileText, Loader2, AlertCircle,
  RefreshCw, Calendar, Globe, Eye, EyeOff, BookOpen, CheckCircle, Clock,
  Pencil, ExternalLink, X, Download,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ArticleReview {
  id:            number;
  articleId:     string;
  reviewedAt:    string;
  reviewedBy:    string | null;
  nextReviewDue: string | null;
}

interface SfArticle {
  id: string;
  knowledgeArticleId: string;
  title: string;
  summary: string | null;
  articleType: string | null;
  publishStatus: string;
  versionNumber: number | null;
  createdDate: string;
  lastModifiedDate: string;
  isVisibleInApp: boolean;
  language: string;
  snippet?: string | null;
  bodyMatch?: boolean;
}

interface ArticleSection {
  label: string;
  html: string;
}

interface SfArticleDetail extends SfArticle {
  body: string | null;
  urlName: string | null;
  sections?: ArticleSection[];
  sfUrl?: string | null;
  sfEditUrl?: string | null;
}

interface ArticlesResponse {
  articles: SfArticle[];
  total: number;
  articleTypes: string[];
}

interface DetailResponse {
  article: SfArticleDetail;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  online:   'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
  draft:    'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
  archived: 'text-muted-foreground bg-muted border-border',
};

function articleTypeLabel(raw: string | null) {
  return raw?.replace(/__kav$/, '').replace(/_/g, ' ') ?? '—';
}

// ── Review strip (inside popover) ─────────────────────────────────────────────

function ReviewStrip({ articleId }: { articleId: string }) {
  const qc = useQueryClient();
  const now = new Date();

  const { data: reviewData, isLoading: reviewLoading } = useQuery<{ review: ArticleReview | null }>({
    queryKey: ['article-review', articleId],
    queryFn: async () => {
      const r = await fetch(`/api/governance/article-review/${encodeURIComponent(articleId)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/knowledge/sf-articles/${encodeURIComponent(articleId)}/mark-reviewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['article-review', articleId] });
      void qc.invalidateQueries({ queryKey: ['governance-review-cycles'] });
    },
  });

  const review   = reviewData?.review ?? null;
  const nextDue  = review?.nextReviewDue ? new Date(review.nextReviewDue) : null;
  const isOverdue  = nextDue ? nextDue < now : false;
  const isDueSoon  = nextDue && !isOverdue
    ? (nextDue.getTime() - now.getTime()) <= 30 * 24 * 60 * 60 * 1000
    : false;

  if (reviewLoading) return (
    <div className="px-6 py-2 border-b bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-1.5">
      <Loader2 className="w-3 h-3 animate-spin" /> Loading review status…
    </div>
  );

  return (
    <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap ${
      isOverdue ? 'bg-[#FBEAE6] border-b-[#E8B9B4]' :
      isDueSoon ? 'bg-[#FFF3E0] border-b-[#FFD08A]' :
      review    ? 'bg-[#E6F0EA] border-b-[#9FC3AE]' :
                  'bg-muted/20'
    }`}>
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        {review ? (
          <>
            <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-[#A93F2F]' : 'text-[#2F6B3F]'}`} />
            <span className={isOverdue ? 'text-[#A93F2F]' : isDueSoon ? 'text-[#CC8400]' : 'text-[#2F6B3F]'}>
              Reviewed {fmtDate(review.reviewedAt)}{review.reviewedBy ? ` by ${review.reviewedBy}` : ''}
            </span>
            {nextDue && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'font-semibold text-[#A93F2F]' : isDueSoon ? 'text-[#CC8400]' : 'text-muted-foreground'}`}>
                <Clock className="w-3 h-3" />
                {isOverdue ? 'Overdue since' : 'Next due'} {nextDue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Never reviewed — mark as reviewed to start tracking the cycle
          </span>
        )}
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="shrink-0 h-7 px-3 rounded-md border border-primary/30 bg-white text-[11px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-40 transition-colors flex items-center gap-1.5"
      >
        {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Mark reviewed
      </button>
    </div>
  );
}

// ── Article popover ────────────────────────────────────────────────────────────

const PROSE =
  'prose prose-sm max-w-none text-foreground ' +
  'prose-headings:font-semibold prose-headings:text-foreground ' +
  'prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-muted-foreground ' +
  'prose-li:text-[13px] prose-li:text-muted-foreground ' +
  'prose-a:text-primary prose-a:underline ' +
  'prose-strong:text-foreground prose-strong:font-semibold ' +
  // images: constrain to popover width, never overflow
  'prose-img:rounded-lg prose-img:max-w-full prose-img:w-auto prose-img:h-auto prose-img:my-3 prose-img:border prose-img:border-border/40 ' +
  'prose-table:w-full prose-table:text-[13px] ' +
  'prose-th:bg-muted/40 prose-th:font-semibold prose-th:text-foreground prose-th:text-[12px] prose-th:uppercase prose-th:tracking-wide ' +
  'prose-td:text-muted-foreground prose-td:text-[13px] ' +
  'prose-code:text-[12px] prose-code:bg-muted/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded ' +
  'prose-pre:bg-muted/60 prose-pre:text-[12px] prose-pre:whitespace-pre-wrap prose-pre:break-words';

function ArticlePopover({
  articleId,
  onClose,
}: {
  articleId: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ['sf-article-detail', articleId],
    queryFn: async () => {
      const r = await fetch(`/api/knowledge/sf-articles/${encodeURIComponent(articleId)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<DetailResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const a = data?.article;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl"
        style={{ width: 'min(680px, 92vw)' }}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b bg-card">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm h-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading article…
            </div>
          ) : isError || !a ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground h-8">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Could not load this article.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 pr-8">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold leading-snug text-foreground break-words">{a.title}</h2>
                  {a.summary && (
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{a.summary}</p>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[a.publishStatus] ?? STATUS_STYLES['archived']}`}>
                  {a.publishStatus}
                </span>
                {a.articleType && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5" />
                    {articleTypeLabel(a.articleType)}
                  </span>
                )}
                {a.versionNumber != null && (
                  <span className="text-[12px] text-muted-foreground">v{a.versionNumber}</span>
                )}
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  {a.language?.replace('_', '-') ?? 'en-US'}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
                  {a.isVisibleInApp ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {a.isVisibleInApp ? 'Visible in app' : 'Not visible'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" /> {fmtDate(a.createdDate)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <RefreshCw className="w-3 h-3" /> Updated {fmtDate(a.lastModifiedDate)}
                </span>
              </div>

              {/* Actions */}
              {(a.sfEditUrl || a.sfUrl) && (
                <div className="flex items-center gap-2 mt-3">
                  {a.sfEditUrl && (
                    <a
                      href={a.sfEditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] font-medium text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit in Salesforce
                      <ExternalLink className="w-3 h-3 text-muted-foreground/60" />
                    </a>
                  )}
                  {a.sfUrl && (
                    <a
                      href={a.sfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-[12px] font-medium text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View in Salesforce
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {/* Close button — always visible */}
          <button
            onClick={onClose}
            aria-label="Close article"
            className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Review strip ── */}
        {a && <ReviewStrip articleId={articleId} />}

        {/* ── Body — vertical scroll only ── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5"
          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : isError || !a ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p>Could not load article content.</p>
            </div>
          ) : (a.sections && a.sections.length > 0) ? (
            <div className="space-y-6">
              {a.sections.map((section, i) => (
                <div key={i}>
                  {a.sections!.length > 1 && (
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 pb-1.5 border-b">
                      {section.label}
                    </h2>
                  )}
                  <div
                    className={PROSE}
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                </div>
              ))}
            </div>
          ) : a.body ? (
            <div
              className={PROSE}
              dangerouslySetInnerHTML={{ __html: a.body }}
            />
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center mt-4">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">Body not available</p>
              <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-xs mx-auto">
                The article body couldn't be fetched. This may be a field permission issue or the article type's body field has a different name.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SfKnowledgeArticles() {
  const [searchInput, setSearchInput]   = useState('');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<'online' | 'draft' | 'all'>('online');
  const [typeFilter, setTypeFilter]     = useState('');
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const activeSearch = search.length >= 3 ? search : '';

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ArticlesResponse>({
    queryKey: ['sf-articles', statusFilter, typeFilter, activeSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'online') params.set('status', statusFilter);
      if (typeFilter)    params.set('type', typeFilter);
      if (activeSearch)  params.set('q', activeSearch);
      const r = await fetch(`/api/knowledge/sf-articles${params.size ? `?${params}` : ''}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ArticlesResponse>;
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  const articles   = data?.articles ?? [];
  const types      = data?.articleTypes ?? [];
  const totalCount = data?.total ?? 0;

  // ── CSV export ──
  function downloadCsv() {
    const header = ['Title', 'Type', 'Status', 'Version', 'Language', 'Modified'];
    const rows = articles.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      articleTypeLabel(a.articleType),
      a.publishStatus,
      a.versionNumber ?? '',
      a.language,
      fmtDateShort(a.lastModifiedDate),
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sf-articles.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col min-h-0 bg-background font-sans text-foreground">
      {/* ── Toolbar ── */}
      <div className="border-b px-5 py-3 flex flex-wrap items-center gap-3 bg-card shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search articles…"
            className="w-full h-8 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); }}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="online">Published</option>
          <option value="draft">Draft</option>
          <option value="all">All statuses</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); }}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={types.length === 0}
        >
          <option value="">All types</option>
          {types.map(t => (
            <option key={t} value={t}>{articleTypeLabel(t)}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count + actions */}
        {totalCount > 0 && (
          <span className="text-[12px] text-muted-foreground">{totalCount} article{totalCount !== 1 ? 's' : ''}</span>
        )}
        <button
          onClick={downloadCsv}
          disabled={articles.length === 0}
          title="Download CSV"
          className="h-8 px-3 flex items-center gap-1.5 rounded-md border text-[12px] text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          title="Refresh"
          className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading articles…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm font-medium">Couldn't load articles</p>
            <p className="text-[12px] text-muted-foreground">Check that Salesforce Knowledge is enabled and the integration is connected.</p>
            <button onClick={() => void refetch()} className="mt-1 text-[12px] font-medium text-primary underline hover:no-underline">Retry</button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No articles found</p>
            {(searchInput || typeFilter || statusFilter !== 'online') && (
              <button
                onClick={() => { setSearchInput(''); setTypeFilter(''); setStatusFilter('online'); }}
                className="mt-2 text-[12px] font-medium text-primary underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[45%]">Title</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Review</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Modified</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(article => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  activeSearch={activeSearch}
                  onClick={() => setOpenArticleId(article.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Popover ── */}
      {openArticleId && (
        <ArticlePopover
          articleId={openArticleId}
          onClose={() => setOpenArticleId(null)}
        />
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function ReviewCell({ articleId }: { articleId: string }) {
  const { data, isLoading } = useQuery<{ review: ArticleReview | null }>({
    queryKey: ['article-review', articleId],
    queryFn: async () => {
      const r = await fetch(`/api/governance/article-review/${encodeURIComponent(articleId)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  if (isLoading) return <span className="text-muted-foreground/40">—</span>;

  const review  = data?.review ?? null;
  if (!review) return <span className="text-muted-foreground/40">—</span>;

  const nextDue   = review.nextReviewDue ? new Date(review.nextReviewDue) : null;
  const isOverdue = nextDue ? nextDue < new Date() : false;

  return (
    <span className={`text-[12px] ${isOverdue ? 'text-[#A93F2F] font-medium' : 'text-[#2F6B3F]'}`}>
      {fmtDateShort(review.reviewedAt)}
    </span>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-100 text-amber-900 rounded-[2px] px-0.5 not-italic font-medium">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ArticleRow({
  article,
  activeSearch,
  onClick,
}: {
  article: SfArticle;
  activeSearch: string;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="border-b hover:bg-muted/40 cursor-pointer transition-colors group"
    >
      {/* Title */}
      <td className="px-4 py-3 align-top">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
          {activeSearch.length >= 3
            ? <HighlightMatch text={article.title} query={activeSearch} />
            : article.title}
        </p>
        {activeSearch.length >= 3 && article.snippet && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed italic line-clamp-2">
            <HighlightMatch text={article.snippet} query={activeSearch} />
          </p>
        )}
        {!activeSearch && article.summary && (
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">{article.summary}</p>
        )}
      </td>

      {/* Type */}
      <td className="px-4 py-3 align-top">
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {articleTypeLabel(article.articleType)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 align-top">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[article.publishStatus] ?? STATUS_STYLES['archived']}`}>
          {article.publishStatus}
        </span>
        {activeSearch.length >= 3 && !article.snippet && article.bodyMatch && (
          <span className="ml-1.5 inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
            body
          </span>
        )}
      </td>

      {/* Review */}
      <td className="px-4 py-3 align-top">
        <ReviewCell articleId={article.id} />
      </td>

      {/* Modified */}
      <td className="px-4 py-3 align-top text-right">
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">{fmtDateShort(article.lastModifiedDate)}</span>
      </td>
    </tr>
  );
}
