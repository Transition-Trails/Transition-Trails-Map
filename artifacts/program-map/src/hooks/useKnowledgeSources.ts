import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SOURCE_TYPE_ORDER } from '@/data/knowledgeSourceData';
import type { KnowledgeSource, SourceType } from '@/data/knowledgeSourceData';

// ── API response shape ────────────────────────────────────────────────────────

export interface SfLiveMetrics {
  sfPrograms: number | null;
  sfContacts: number | null;
  sfCases:    number | null;
  sfLive:     boolean;
}

interface KnowledgeSourcesResponse {
  sources:           KnowledgeSource[];
  metrics?:          SfLiveMetrics;
  integrationStatus?: Record<string, string>;
  fetchedAt?:        string;
}

// ── Summary helper ────────────────────────────────────────────────────────────

function computeSummary(sources: KnowledgeSource[]) {
  return {
    total:            sources.length,
    available:        sources.filter(s => s.availability === 'Available').length,
    partial:          sources.filter(s => s.availability === 'Partial').length,
    future:           sources.filter(s => s.availability === 'Future').length,
    approvedForPenny: sources.filter(s => s.approvedForPenny).length,
    healthy:          sources.filter(s => s.healthStatus === 'Healthy').length,
    warnings:         sources.filter(s => s.healthStatus === 'Warning').length,
    critical:         sources.filter(s => s.healthStatus === 'Critical').length,
    byType: Object.fromEntries(
      SOURCE_TYPE_ORDER.map(t => [t, sources.filter(s => s.type === t).length])
    ) as Record<SourceType, number>,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type SourceSummary = ReturnType<typeof computeSummary>;

export function useKnowledgeSources() {
  const { data, isLoading, isError } = useQuery<KnowledgeSourcesResponse>({
    queryKey: ['knowledge-sources'],
    queryFn: async () => {
      const r = await fetch('/api/knowledge/sources');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<KnowledgeSourcesResponse>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return useMemo(() => {
    // When the API hasn't responded yet or errored, return empty; never fall
    // back to stale static constants — components must handle loading/error explicitly.
    const sources: KnowledgeSource[] = data?.sources ?? [];
    return {
      sources,
      summary: computeSummary(sources),
      metrics: data?.metrics ?? null,
      integrationStatus: data?.integrationStatus ?? {},
      isLoading,
      isError,
    };
  }, [data, isLoading, isError]);
}
