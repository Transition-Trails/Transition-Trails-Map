import { useQuery } from '@tanstack/react-query';

export interface SfProgram {
  Id: string;
  Name: string;
  pmdm__Status__c: string | null;
  pmdm__StartDate__c: string | null;
  pmdm__EndDate__c: string | null;
}

export interface SfOpsPrograms {
  programs: SfProgram[];
  total: number | null;
  active: number | null;
  planning: number | null;
  lastUpdated: string;
  fromCache: boolean;
  cacheAge: number;
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
