import { useQuery } from '@tanstack/react-query';

export interface SfOpsSummary {
  programs:          { total: number | null; active: number | null; planning: number | null };
  engagements:       { total: number | null; active: number | null };
  serviceDeliveries: { last30Days: number | null };
  cases:             { open: number | null; highPriority: number | null };
  contacts:          { total: number | null };
  lastUpdated:       string;
  fromCache:         boolean;
  cacheAge:          number;
}

export function useOpsSummary() {
  return useQuery<SfOpsSummary>({
    queryKey: ['sf-ops-summary'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/operations/summary');
      if (!res.ok) throw new Error(`SF summary ${res.status}`);
      return res.json() as Promise<SfOpsSummary>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
