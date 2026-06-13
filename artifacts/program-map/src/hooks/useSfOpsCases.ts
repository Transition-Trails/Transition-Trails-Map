import { useQuery } from '@tanstack/react-query';

export interface SfCase {
  Id: string;
  CaseNumber: string | null;
  Subject: string | null;
  Priority: 'High' | 'Medium' | 'Low' | null;
  Status: string | null;
  CreatedDate: string | null;
  Contact?: { Name: string | null } | null;
  Account?: { Name: string | null } | null;
}

export interface SfOpsCases {
  cases: SfCase[];
  totalOpen: number | null;
  highPriority: number | null;
  instanceName: string;
  lastUpdated: string;
  fromCache: boolean;
  cacheAge: number;
}

export function useSfOpsCases() {
  return useQuery<SfOpsCases>({
    queryKey: ['sf-ops-cases'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/operations/cases');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfOpsCases>;
    },
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}

export function caseAge(createdDate: string | null): string {
  if (!createdDate) return '—';
  const diffMs = Date.now() - new Date(createdDate).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d';
  return `${days}d`;
}
