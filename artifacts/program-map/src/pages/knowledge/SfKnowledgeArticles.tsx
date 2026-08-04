// SfKnowledgeArticles — Browse, filter, and read Salesforce Knowledge articles.
// Split-pane: article list on left, detail panel on right.

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, FileText, ChevronRight, Loader2, AlertCircle,
  RefreshCw, Calendar, Globe, Eye, EyeOff, BookOpen,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SfArticle {
  id: string;
  knowledgeArticleId: string;
  title: string;
  summary: string | null;
  articleType: string;
  publishStatus: string;
  versionNumber: number | null;
  createdDate: string;
  lastModifiedDate: string;
  isVisibleInApp: boolean;
  language: string;
}

interface SfArticleDetail extends SfArticle {
  body: string | null;
  urlName: string | null;
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_STYLES: Record<string, string> = {
  online:   'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
  draft:    'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
  archived: 'text-muted-foreground bg-muted border-border',
};

// ── Article list card ──────────────────────────────────────────────────────────

function ArticleCard({
  article, isSelected, onClick,
}: {
  article: SfArticle;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b transition-colors group ${
        isSelected
          ? 'bg-primary/5 border-l-2 border-l-primary'
          : 'hover:bg-muted/40 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug line-clamp-2 flex-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
          {article.title}
        </p>
        <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`} />
      </div>

      {article.summary && (
        <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {article.summary}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[article.publishStatus] ?? STATUS_STYLES['archived']}`}>
          {article.publishStatus}
        </span>
        {article.articleType && (
          <span className="text-[11px] text-muted-foreground">{article.articleType.replace(/__kav$/, '').replace(/_/g, ' ')}</span>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{fmtDateShort(article.lastModifiedDate)}</span>
      </div>
    </button>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function DetailPanel({ articleId }: { articleId: string }) {
  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ['sf-article-detail', articleId],
    queryFn: async () => {
      const r = await fetch(`/api/knowledge/sf-articles/${encodeURIComponent(articleId)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<DetailResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading article…
    </div>
  );

  if (isError || !data?.article) return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
      <AlertCircle className="w-5 h-5 text-[#CC8400]" />
      <p>Could not load this article.</p>
    </div>
  );

  const a = data.article;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b bg-card">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-snug text-foreground">{a.title}</h1>
            {a.summary && (
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{a.summary}</p>
            )}
          </div>
        </div>

        {/* Metadata strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[a.publishStatus] ?? STATUS_STYLES['archived']}`}>
            {a.publishStatus}
          </span>
          {a.articleType && (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              {a.articleType.replace(/__kav$/, '').replace(/_/g, ' ')}
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
        </div>

        <div className="flex items-center gap-4 mt-2.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" /> Created {fmtDate(a.createdDate)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Updated {fmtDate(a.lastModifiedDate)}
          </span>
        </div>
      </div>

      {/* Body content */}
      <div className="px-6 py-5">
        {a.body ? (
          <div
            className="prose prose-sm max-w-none text-foreground
              prose-headings:font-semibold prose-headings:text-foreground
              prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-muted-foreground
              prose-li:text-[13px] prose-li:text-muted-foreground
              prose-a:text-primary prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold"
            dangerouslySetInnerHTML={{ __html: a.body }}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Body not available</p>
            <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-xs mx-auto">
              The article body couldn't be fetched. This may be a field permission issue or the article type's body field has a different name.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <BookOpen className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground">Select an article</p>
      <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
        Choose an article from the list to read its content and metadata.
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SfKnowledgeArticles() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<'online' | 'draft' | 'all'>('online');
  const [typeFilter, setTypeFilter]   = useState('');
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ArticlesResponse>({
    queryKey: ['sf-articles', statusFilter, typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'online') params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (search)    params.set('q', search);
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

  // Auto-select first article on initial load
  useEffect(() => {
    if (!selectedId && articles.length > 0) setSelectedId(articles[0]!.id);
  }, [articles, selectedId]);

  return (
    <div className="h-screen flex flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Page header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm shrink-0">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Knowledge</p>
          <h1 className="text-base font-semibold mt-0.5">Salesforce Knowledge Articles</h1>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-[12px] text-muted-foreground">{totalCount} article{totalCount !== 1 ? 's' : ''}</span>
          )}
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — list + filters */}
        <div className="w-[380px] shrink-0 border-r flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="p-3 border-b space-y-2 bg-muted/10 shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by title…"
                className="w-full h-8 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setSelectedId(null); }}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="online">Published</option>
                <option value="draft">Draft</option>
                <option value="all">All statuses</option>
              </select>

              {/* Article type filter */}
              <select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setSelectedId(null); }}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={types.length === 0}
              >
                <option value="">All types</option>
                {types.map(t => (
                  <option key={t} value={t}>{t.replace(/__kav$/, '').replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Article list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading articles…
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#CC8400]" />
                <p className="text-sm font-medium text-foreground">Couldn't load articles</p>
                <p className="text-[12px] text-muted-foreground">Check that Salesforce Knowledge is enabled and the integration is connected.</p>
                <button onClick={() => void refetch()} className="mt-1 text-[12px] font-medium text-primary underline hover:no-underline">Retry</button>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No articles found</p>
                {(search || typeFilter || statusFilter !== 'online') && (
                  <button
                    onClick={() => { setSearchInput(''); setTypeFilter(''); setStatusFilter('online'); }}
                    className="mt-2 text-[12px] font-medium text-primary underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                isSelected={article.id === selectedId}
                onClick={() => setSelectedId(article.id)}
              />
            ))}
          </div>
        </div>

        {/* Right — detail */}
        <div className="flex-1 overflow-hidden bg-background">
          {selectedId ? (
            <DetailPanel key={selectedId} articleId={selectedId} />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>
    </div>
  );
}
