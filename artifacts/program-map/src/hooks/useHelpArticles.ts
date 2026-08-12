/**
 * useHelpArticles — fetches published SF Knowledge articles for the Help panel.
 * Debouncing and caching are handled here; the panel just passes a search string.
 */
import { useQuery } from '@tanstack/react-query';

export interface HelpArticle {
  id: string;
  knowledgeArticleId: string;
  title: string;
  summary: string | null;
  articleType: string | null;
  publishStatus: string;
  lastModifiedDate: string;
  snippet?: string | null;
}

interface HelpArticlesResponse {
  articles: HelpArticle[];
  total: number;
}

export interface HelpArticleDetail extends HelpArticle {
  body: string | null;
  urlName: string | null;
  sections?: { label: string; html: string }[];
  sfUrl?: string | null;
}

interface HelpArticleDetailResponse {
  article: HelpArticleDetail;
}

// ── Article list ─────────────────────────────────────────────────────────────

export function useHelpArticles(search: string) {
  const activeSearch = search.trim().length >= 3 ? search.trim() : '';

  return useQuery<HelpArticlesResponse>({
    queryKey: ['help-articles', activeSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      // status=online is the default — omitting it keeps URLs clean
      if (activeSearch) params.set('q', activeSearch);
      const r = await fetch(
        `/api/knowledge/sf-articles${params.size ? `?${params}` : ''}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<HelpArticlesResponse>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Article detail ───────────────────────────────────────────────────────────

export function useHelpArticleDetail(articleId: string | null) {
  return useQuery<HelpArticleDetailResponse>({
    queryKey: ['help-article-detail', articleId],
    queryFn: async () => {
      const r = await fetch(
        `/api/knowledge/sf-articles/${encodeURIComponent(articleId!)}`,
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<HelpArticleDetailResponse>;
    },
    enabled: !!articleId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// ── Visited-article tracking (localStorage) ──────────────────────────────────

const LS_KEY = 'helpPanelVisited';

export function getVisitedArticles(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

export function markArticleVisited(id: string): void {
  try {
    const visited = getVisitedArticles();
    visited.add(id);
    localStorage.setItem(LS_KEY, JSON.stringify([...visited]));
  } catch { /* ignore */ }
}
