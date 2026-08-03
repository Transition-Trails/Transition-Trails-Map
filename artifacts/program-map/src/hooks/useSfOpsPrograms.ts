import { useQuery } from '@tanstack/react-query';
import type { SfCount } from './useSfOpsSummary';

export interface SfProgram {
  Id: string;
  Name: string;
  pmdm__Status__c: string | null;
  pmdm__StartDate__c: string | null;
  pmdm__EndDate__c: string | null;
}

export interface SfOpsPrograms {
  programs:      SfProgram[];
  programsError: string | null;
  total:         SfCount;
  active:        SfCount;
  planning:      SfCount;
  statusValuesFound: string[];
  isTruncated:   boolean;
  limit:         number;
  lastUpdated:   string;
  fromCache:     boolean;
  cacheAge:      number;
}

export function useSfOpsPrograms() {
  return useQuery<SfOpsPrograms>({
    queryKey: ['sf-ops-programs'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/operations/programs');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfOpsPrograms>;
    },
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
}
