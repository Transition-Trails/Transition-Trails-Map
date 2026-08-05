import { useState, useEffect, useCallback } from 'react';

export type ArticleStatus = 'draft' | 'pending-review' | 'approved' | 'published';

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  urlName: string;
  status: ArticleStatus;
  authoredBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  publishedAt: string | null;
  sfArticleId: string | null;
  sfVersionId: string | null;
  sfPublishStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleFormData {
  title: string;
  summary: string;
  body: string;
  category: string;
  urlName?: string;
}

const API = '/api/knowledge/articles';

export function useKnowledgeArticles() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { articles: KnowledgeArticle[] };
      setArticles(data.articles);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createArticle = useCallback(async (form: ArticleFormData): Promise<KnowledgeArticle> => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => [data.article, ...prev]);
    return data.article;
  }, []);

  const updateArticle = useCallback(async (id: string, patch: Partial<ArticleFormData>): Promise<KnowledgeArticle> => {
    const res = await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => prev.map(a => a.id === id ? data.article : a));
    return data.article;
  }, []);

  const submitForReview = useCallback(async (id: string): Promise<KnowledgeArticle> => {
    const res = await fetch(`${API}/${id}/submit`, {
      method: 'POST', credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => prev.map(a => a.id === id ? data.article : a));
    return data.article;
  }, []);

  const approveArticle = useCallback(async (id: string): Promise<KnowledgeArticle> => {
    const res = await fetch(`${API}/${id}/approve`, {
      method: 'POST', credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => prev.map(a => a.id === id ? data.article : a));
    return data.article;
  }, []);

  const requestChanges = useCallback(async (id: string, note: string): Promise<KnowledgeArticle> => {
    const res = await fetch(`${API}/${id}/request-changes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => prev.map(a => a.id === id ? data.article : a));
    return data.article;
  }, []);

  const publishToSf = useCallback(async (id: string): Promise<KnowledgeArticle> => {
    const res = await fetch(`${API}/${id}/publish-to-sf`, {
      method: 'POST', credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { article: KnowledgeArticle };
    setArticles(prev => prev.map(a => a.id === id ? data.article : a));
    return data.article;
  }, []);

  const deleteArticle = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`${API}/${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    setArticles(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    articles, loading, error, reload: load,
    createArticle, updateArticle,
    submitForReview, approveArticle, requestChanges,
    publishToSf, deleteArticle,
  };
}
