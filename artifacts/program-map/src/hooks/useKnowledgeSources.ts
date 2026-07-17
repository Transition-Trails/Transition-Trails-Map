import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { knowledgeSources as STATIC_SOURCES, SOURCE_TYPE_ORDER } from '@/data/knowledgeSourceData';
import type { KnowledgeSource, SourceType } from '@/data/knowledgeSourceData';

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
  const { data, isLoading } = useQuery<KnowledgeSource[]>({
    queryKey: ['knowledge-sources'],
    queryFn: () => fetch('/api/knowledge/sources').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<KnowledgeSource[]>;
    }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return useMemo(() => {
    // API data is the primary source; fall back to static if unavailable
    const sources = data ?? STATIC_SOURCES;
    return {
      sources,
      summary: computeSummary(sources),
      isLoading,
    };
  }, [data, isLoading]);
}
