import { useQuery } from '@tanstack/react-query';

/** Mirrors the server-side SfCount — every count field is {value, error} not a bare number. */
export interface SfCount { value: number | null; error: string | null; }

export interface SfOpsSummary {
  programs:          { total: SfCount; active: SfCount; planning: SfCount };
  engagements:       { total: SfCount; active: SfCount };
  serviceDeliveries: { last30Days: SfCount };
  cases:             { open: SfCount; highPriority: SfCount };
  contacts:          { total: SfCount };
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
