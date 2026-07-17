import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { knowledgeSources, SOURCE_TYPE_ORDER } from '@/data/knowledgeSourceData';
import type { KnowledgeSource, SourceType } from '@/data/knowledgeSourceData';

// ── Integration → source ID mapping ──────────────────────────────────────────
const SOURCE_INTEGRATION: Record<string, string> = {
  'src-sf-mission-delivery': 'salesforce',
  'src-sf-ops-business':     'salesforce',
  'src-sf-technology':       'salesforce',
  'src-coach-notes':         'salesforce',
  'src-gdrive-foundations':  'googleDrive',
  'src-gdrive-guided':       'googleDrive',
  'src-gdrive-source-docs':  'googleDrive',
  'src-future-slack':        'slack',
  'src-future-calendar':     'googleCalendar',
};

// Phrases in healthIssues that become stale once the integration is live.
const STALE_ISSUE_PHRASES = [
  'no live salesforce api',
  'no live google drive',
  'no live drive api',
  'source does not exist yet',
  'pending salesforce',
  'pending google',
];

function isStaleIssue(issue: string, integrationHealth: string): boolean {
  if (integrationHealth !== 'live') return false;
  const lower = issue.toLowerCase();
  return STALE_ISSUE_PHRASES.some(p => lower.includes(p));
}

export interface SfCounts {
  programs:    number | null;
  contacts:    number | null;
  cases:       number | null;
  engagements: number | null;
}

interface LiveData {
  integrationHealth: Record<string, string>;
  sfCounts: SfCounts;
  fetchedAt: string;
}

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

export function useKnowledgeSources() {
  const { data, isLoading } = useQuery<LiveData>({
    queryKey: ['knowledge-live-data'],
    queryFn: () => fetch('/api/knowledge/sources/live-data').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return useMemo(() => {
    if (!data) {
      return {
        sources: knowledgeSources,
        summary: computeSummary(knowledgeSources),
        sfCounts: null as SfCounts | null,
        isLoading,
      };
    }

    const { integrationHealth, sfCounts } = data;

    const sources = knowledgeSources.map(src => {
      const srcId = (src as unknown as { id: string }).id ?? '';
      const integration = SOURCE_INTEGRATION[srcId];
      if (!integration) return src;

      const intHealth = integrationHealth[integration] ?? '';

      const syncStatus = intHealth === 'live'
        ? ('Live' as KnowledgeSource['syncStatus'])
        : intHealth === 'phase-2'
          ? ('Future' as KnowledgeSource['syncStatus'])
          : src.syncStatus;

      const healthIssues = src.healthIssues.filter(
        issue => !isStaleIssue(issue, intHealth),
      );

      return { ...src, syncStatus, healthIssues };
    });

    return {
      sources,
      summary: computeSummary(sources),
      sfCounts,
      isLoading: false,
    };
  }, [data, isLoading]);
}
