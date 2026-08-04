// KnowledgeReviewQueue — Published articles whose next biannual review falls within 30 days,
// plus any that are already overdue.  Uses lastModifiedDate as the review-date proxy
// (6-month / 180-day cadence, matching the governance schedule).

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, AlertTriangle, BookOpen, Calendar, CheckCircle2,
  ChevronRight, Clock, FileText, Globe, Loader2, RefreshCw,
  Eye, EyeOff,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

interface ArticleSection { label: string; html: string; }

interface SfArticleDetail extends SfArticle {
  body: string | null;
  urlName: string | null;
  sections?: ArticleSection[];
}

interface ArticlesResponse {
  articles: SfArticle[];
  total: number;
  articleTypes: string[];
}

interface DetailResponse { article: SfArticleDetail; }

// ── Review-queue helpers ──────────────────────────────────────────────────────

/** Biannual = 180 days */
const REVIEW_CADENCE_DAYS = 180;
/** Window: articles due within this many days are surfaced */
const UPCOMING_WINDOW_DAYS = 30;

type Urgency = 'overdue' | 'this-week' | 'this-month';

interface ReviewItem {
  article: SfArticle;
  lastReviewDate: Date;
  nextReviewDate: Date;
  daysUntilDue: number;   // negative = overdue
  urgency: Urgency;
}

function classifyArticle(article: SfArticle, now: Date): ReviewItem | null {
  const last = new Date(article.lastModifiedDate);
  const next = new Date(last.getTime() + REVIEW_CADENCE_DAYS * 86_400_000);
  const daysUntilDue = Math.ceil((next.getTime() - now.getTime()) / 86_400_000);

  if (daysUntilDue > UPCOMING_WINDOW_DAYS) return null;

  const urgency: Urgency =
    daysUntilDue < 0      ? 'overdue'    :
    daysUntilDue <= 7     ? 'this-week'  :
                            'this-month';

  return { article, lastReviewDate: last, nextReviewDate: next, daysUntilDue, urgency };
}

// ── Shared formatters ─────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Urgency badge ─────────────────────────────────────────────────────────────

const URGENCY_CFG = {
  overdue:    { label: 'Overdue',     cls: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',   icon: AlertCircle  },
  'this-week':{ label: 'Due < 7 days',cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',   icon: AlertTriangle},
  'this-month':{ label: 'Due < 30 days',cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', icon: Clock        },
} as const;

function UrgencyBadge({ urgency, days }: { urgency: Urgency; days: number }) {
  const cfg = URGENCY_CFG[urgency];
  const Icon = cfg.icon;
  const label = days < 0
    ? `${Math.abs(days)}d overdue`
    : days === 0 ? 'Due today'
    : `Due in ${days}d`;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ── Review queue article card ─────────────────────────────────────────────────

function ReviewCard({
  item, isSelected, onClick,
}: {
  item: ReviewItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { article, daysUntilDue, urgency } = item;
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
        <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`} />
      </div>

      {article.summary && (
        <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {article.summary}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <UrgencyBadge urgency={urgency} days={daysUntilDue} />
        {article.articleType && (
          <span className="text-[11px] text-muted-foreground">
            {article.articleType.replace(/__kav$/, '').replace(/_/g, ' ')}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">
          Last updated {fmtDate(article.lastModifiedDate)}
        </span>
      </div>
    </button>
  );
}

// ── Detail panel (inline, same pattern as SfKnowledgeArticles) ────────────────

const PROSE_CLS = `prose prose-sm max-w-none text-foreground
  prose-headings:font-semibold prose-headings:text-foreground
  prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-muted-foreground
  prose-li:text-[13px] prose-li:text-muted-foreground
  prose-a:text-primary prose-a:underline
  prose-strong:text-foreground prose-strong:font-semibold
  prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto prose-img:my-3 prose-img:border prose-img:border-border/40
  prose-table:w-full prose-table:text-[13px]
  prose-th:bg-muted/40 prose-th:font-semibold prose-th:text-foreground prose-th:text-[12px] prose-th:uppercase prose-th:tracking-wide
  prose-td:text-muted-foreground prose-td:text-[13px]
  prose-code:text-[12px] prose-code:bg-muted/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded`;

function DetailPanel({ item }: { item: ReviewItem }) {
  const { article, daysUntilDue, urgency, nextReviewDate } = item;

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ['sf-article-detail', article.id],
    queryFn: async () => {
      const r = await fetch(`/api/knowledge/sf-articles/${encodeURIComponent(article.id)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<DetailResponse>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const urgencyCfg = URGENCY_CFG[urgency];

  return (
    <div className="h-full overflow-y-auto">
      {/* Review notice */}
      <div className={`mx-6 mt-5 rounded-lg border px-4 py-3 flex items-start gap-3 ${urgencyCfg.cls}`}>
        <urgencyCfg.icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug">
            {daysUntilDue < 0
              ? `Review overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
              : daysUntilDue === 0
              ? 'Review due today'
              : `Review due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}
          </p>
          <p className="text-[12px] mt-0.5 opacity-80">
            Next review: {nextReviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}Based on biannual (180-day) cadence from last update
          </p>
        </div>
      </div>

      {/* Article header */}
      <div className="px-6 pt-4 pb-4 border-b">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-snug text-foreground">{article.title}</h1>
            {article.summary && (
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{article.summary}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]">
            {article.publishStatus}
          </span>
          {article.articleType && (
            <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              {article.articleType.replace(/__kav$/, '').replace(/_/g, ' ')}
            </span>
          )}
          {article.versionNumber != null && (
            <span className="text-[12px] text-muted-foreground">v{article.versionNumber}</span>
          )}
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            <Globe className="w-3.5 h-3.5" />
            {article.language?.replace('_', '-') ?? 'en-US'}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
            {article.isVisibleInApp ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {article.isVisibleInApp ? 'Visible in app' : 'Not visible'}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-2.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" /> Created {fmtDate(article.createdDate)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <RefreshCw className="w-3 h-3" /> Updated {fmtDate(article.lastModifiedDate)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading article…
          </div>
        ) : isError || !data?.article ? (
          <div className="flex flex-col items-center py-8 gap-2 text-muted-foreground text-sm">
            <AlertCircle className="w-5 h-5 text-[#CC8400]" />
            <p>Could not load article body.</p>
          </div>
        ) : (data.article.sections && data.article.sections.length > 0) ? (
          <div className="space-y-6">
            {data.article.sections.map((section, i) => (
              <div key={i}>
                {data.article.sections!.length > 1 && (
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 pb-1.5 border-b">
                    {section.label}
                  </h2>
                )}
                <div className={PROSE_CLS} dangerouslySetInnerHTML={{ __html: section.html }} />
              </div>
            ))}
          </div>
        ) : data.article.body ? (
          <div className={PROSE_CLS} dangerouslySetInnerHTML={{ __html: data.article.body }} />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Body not available</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyQueue({ isFetching }: { isFetching: boolean }) {
  if (isFetching) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
      <div className="w-14 h-14 rounded-2xl bg-[#E6F0EA] flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-[#2F6B3F]" />
      </div>
      <p className="text-sm font-semibold text-foreground">All articles are up to date</p>
      <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[240px] leading-relaxed">
        No published articles have a review due within the next 30 days.
      </p>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-16">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <BookOpen className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground">Select an article</p>
      <p className="text-[12px] text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
        Choose an article from the list to see its content and schedule the review.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KnowledgeReviewQueue() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const now = new Date();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ArticlesResponse>({
    queryKey: ['sf-articles-review-queue'],
    queryFn: async () => {
      // Fetch oldest-first so the most-overdue articles are never cut off by LIMIT 200.
      const r = await fetch('/api/knowledge/sf-articles?sort=oldest&status=online');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ArticlesResponse>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Client-side filtering: only articles whose next review date ≤ now + 30 days
  const reviewItems: ReviewItem[] = (data?.articles ?? [])
    .map(a => classifyArticle(a, now))
    .filter((x): x is ReviewItem => x !== null)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);  // overdue first

  const overdue   = reviewItems.filter(i => i.urgency === 'overdue').length;
  const thisWeek  = reviewItems.filter(i => i.urgency === 'this-week').length;
  const thisMonth = reviewItems.filter(i => i.urgency === 'this-month').length;

  // Auto-select first item
  useEffect(() => {
    if (!selectedId && reviewItems.length > 0) setSelectedId(reviewItems[0]!.article.id);
  }, [reviewItems, selectedId]);

  const selectedItem = reviewItems.find(i => i.article.id === selectedId) ?? null;

  return (
    <div className="h-screen flex flex-col bg-background font-sans text-foreground overflow-hidden">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm shrink-0">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Knowledge</p>
          <h1 className="text-base font-semibold mt-0.5">Article Review Queue</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          {!isLoading && !isError && (
            <div className="flex items-center gap-2">
              {overdue > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]">
                  <AlertCircle className="w-3 h-3" /> {overdue} overdue
                </span>
              )}
              {thisWeek > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]">
                  <AlertTriangle className="w-3 h-3" /> {thisWeek} this week
                </span>
              )}
              {thisMonth > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]">
                  <Clock className="w-3 h-3" /> {thisMonth} this month
                </span>
              )}
              {reviewItems.length === 0 && !isLoading && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]">
                  <CheckCircle2 className="w-3 h-3" /> All current
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Sub-header: criteria explanation */}
      <div className="border-b bg-muted/20 px-6 py-2 shrink-0">
        <p className="text-[12px] text-muted-foreground">
          Published articles whose biannual (180-day) review falls within the next 30 days, sorted by urgency.
          Draft articles and articles not yet due are excluded.
        </p>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — review list */}
        <div className="w-[380px] shrink-0 border-r flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading articles…
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#CC8400]" />
                <p className="text-sm font-medium">Couldn't load articles</p>
                <p className="text-[12px] text-muted-foreground">Check that Salesforce is connected.</p>
                <button onClick={() => void refetch()} className="mt-1 text-[12px] font-medium text-primary underline">Retry</button>
              </div>
            ) : reviewItems.length === 0 ? (
              <EmptyQueue isFetching={isFetching} />
            ) : (
              <>
                {/* Group: overdue */}
                {overdue > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#FBEAE6]/40 border-b">
                      <p className="text-[10px] font-semibold text-[#A93F2F] uppercase tracking-wider">
                        Overdue · {overdue}
                      </p>
                    </div>
                    {reviewItems.filter(i => i.urgency === 'overdue').map(item => (
                      <ReviewCard
                        key={item.article.id}
                        item={item}
                        isSelected={item.article.id === selectedId}
                        onClick={() => setSelectedId(item.article.id)}
                      />
                    ))}
                  </>
                )}

                {/* Group: due this week */}
                {thisWeek > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#FFF3E0]/40 border-b">
                      <p className="text-[10px] font-semibold text-[#CC8400] uppercase tracking-wider">
                        Due this week · {thisWeek}
                      </p>
                    </div>
                    {reviewItems.filter(i => i.urgency === 'this-week').map(item => (
                      <ReviewCard
                        key={item.article.id}
                        item={item}
                        isSelected={item.article.id === selectedId}
                        onClick={() => setSelectedId(item.article.id)}
                      />
                    ))}
                  </>
                )}

                {/* Group: due this month */}
                {thisMonth > 0 && (
                  <>
                    <div className="px-4 py-2 bg-[#EDF5F8]/40 border-b">
                      <p className="text-[10px] font-semibold text-[#2F6F7E] uppercase tracking-wider">
                        Due this month · {thisMonth}
                      </p>
                    </div>
                    {reviewItems.filter(i => i.urgency === 'this-month').map(item => (
                      <ReviewCard
                        key={item.article.id}
                        item={item}
                        isSelected={item.article.id === selectedId}
                        onClick={() => setSelectedId(item.article.id)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right — detail */}
        <div className="flex-1 overflow-hidden bg-background">
          {selectedItem ? (
            <DetailPanel key={selectedItem.article.id} item={selectedItem} />
          ) : (
            <EmptyDetail />
          )}
        </div>
      </div>
    </div>
  );
}
