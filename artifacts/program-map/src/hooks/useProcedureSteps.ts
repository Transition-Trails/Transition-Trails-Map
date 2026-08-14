import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcedureStep {
  id: string;
  articleId: string;
  sequence: number;
  instruction: string;
  verifyLine: string | null;
  directUrl: string | null;
  captureUrl: string | null;
  toolVersion: string | null;
  captureDate: string | null;
  sfStepId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRelationship {
  id: string;
  articleId: string;
  relatedArticleId: string;
  relationType: 'prerequisite' | 'next-step' | 'reverses' | 'other';
  reason: string | null;
  direction: 'forward' | 'inverse';
  sfRelId: string | null;
  createdAt: string;
  updatedAt: string;
  // joined from knowledge_articles:
  relatedTitle?: string;
}

// ─── useProcedureSteps ───────────────────────────────────────────────────────

export function useProcedureSteps(articleId: string | null) {
  const [steps, setSteps]     = useState<ProcedureStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!articleId) { setSteps([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/steps`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { steps: ProcedureStep[] };
      setSteps(data.steps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load steps');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { void load(); }, [load]);

  const addStep = useCallback(async (): Promise<ProcedureStep | null> => {
    if (!articleId) return null;
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ instruction: '' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { step: ProcedureStep };
      setSteps(prev => [...prev, data.step]);
      return data.step;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add step');
      return null;
    }
  }, [articleId]);

  const updateStep = useCallback(async (stepId: string, patch: Partial<Pick<ProcedureStep, 'instruction' | 'verifyLine' | 'directUrl' | 'toolVersion'>>): Promise<void> => {
    if (!articleId) return;
    // Optimistic update
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...patch } : s));
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/steps/${encodeURIComponent(stepId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { step: ProcedureStep };
      setSteps(prev => prev.map(s => s.id === stepId ? data.step : s));
    } catch (e) {
      // Revert on error
      void load();
      setError(e instanceof Error ? e.message : 'Failed to update step');
    }
  }, [articleId, load]);

  const deleteStep = useCallback(async (stepId: string): Promise<void> => {
    if (!articleId) return;
    setSteps(prev => prev.filter(s => s.id !== stepId));
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/steps/${encodeURIComponent(stepId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        void load(); // revert on failure
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete step');
    }
  }, [articleId, load]);

  const reorderSteps = useCallback(async (orderedIds: string[]): Promise<void> => {
    if (!articleId) return;
    // Optimistic reorder
    setSteps(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, sequence: i + 1 }));
    });
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/steps/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        void load(); // revert
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json() as { steps: ProcedureStep[] };
      setSteps(data.steps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder steps');
    }
  }, [articleId, load]);

  return { steps, loading, error, reload: load, addStep, updateStep, deleteStep, reorderSteps };
}

// ─── useArticleRelationships ─────────────────────────────────────────────────

export function useArticleRelationships(articleId: string | null) {
  const [relationships, setRelationships] = useState<ArticleRelationship[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!articleId) { setRelationships([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/relationships`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json() as { relationships: ArticleRelationship[] };
      setRelationships(data.relationships);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { void load(); }, [load]);

  const addRelationship = useCallback(async (
    relatedArticleId: string,
    relationType: ArticleRelationship['relationType'],
    reason?: string,
  ): Promise<void> => {
    if (!articleId) return;
    const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ relatedArticleId, relationType, reason }),
    });
    if (!res.ok) {
      // Throw so the calling form's try/catch can display an error message
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const data = await res.json() as { relationship: ArticleRelationship };
    setRelationships(prev => [...prev, data.relationship]);
  }, [articleId]);

  const removeRelationship = useCallback(async (relId: string): Promise<void> => {
    if (!articleId) return;
    setRelationships(prev => prev.filter(r => r.id !== relId));
    try {
      const res = await fetch(`/api/knowledge/articles/${encodeURIComponent(articleId)}/relationships/${encodeURIComponent(relId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) void load();
    } catch { void load(); }
  }, [articleId, load]);

  return { relationships, loading, reload: load, addRelationship, removeRelationship };
}
