import { useQuery } from '@tanstack/react-query';

/** A count value with an explicit error reason — never silently null. */
export interface SfCount { value: number | null; error: string | null; }

export interface SfOpsSummary {
  programs: {
    total:    SfCount;
    active:   SfCount;
    planning: SfCount;
    statusValuesFound:   string[];
    statusValuesMissing: string[];
  };
  engagements: {
    total:  SfCount;
    active: SfCount;
  };
  serviceDeliveries: {
    last30Days: SfCount;
  };
  cases: {
    open:          SfCount;
    highPriority:  SfCount;
    priorityValuesFound: string[];
    priorityValueUsed:   string | null;
  };
  contacts: { total: SfCount };
  lastUpdated: string;
  fromCache:   boolean;
  cacheAge:    number;
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
