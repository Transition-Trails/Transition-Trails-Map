import { useQuery } from '@tanstack/react-query';

export interface SfOpsSummary {
  programs:         { total: number | null; active: number | null; planning: number | null };
  engagements:      { total: number | null; active: number | null };
  serviceDeliveries:{ last30Days: number | null };
  cases:            { open: number | null; highPriority: number | null };
  contacts:         { total: number | null };
  lastUpdated:      string;
  fromCache:        boolean;
  cacheAge:         number;
}

export function useSfOpsSummary() {
  return useQuery<SfOpsSummary>({
    queryKey: ['sf-ops-summary'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/operations/summary');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfOpsSummary>;
    },
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

export function formatSyncAge(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
