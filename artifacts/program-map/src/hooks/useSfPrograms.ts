import { useQuery } from '@tanstack/react-query';

export interface SfProgramRecord {
  Id: string;
  Name: string;
  pmdm__Status__c: string | null;
  pmdm__StartDate__c: string | null;
  pmdm__EndDate__c: string | null;
  pmdm__Description__c: string | null;
  pmdm__ShortSummary__c: string | null;
  pmdm__TargetPopulation__c: string | null;
  pmdm__ProgramIssueArea__c: string | null;
  Program_Manager__c: string | null;
  Program_Goals__c: string | null;
  Program_Structure__c: string | null;
  Program_Target_Audience__c: string | null;
  Program_Expected_Outcomes__c: string | null;
  Problem_Statement__c: string | null;
  Success_Metrics_Evaluation_Plan__c: string | null;
  Risks_Assumptions__c: string | null;
  Budget_Resouces__c: string | null;
  Funding_Strategy__c: string | null;
  Implementation_Plan__c: string | null;
  Partnership_Opportunities__c: string | null;
  Google_Drive_Folder__c: string | null;
  Canva_Folder__c: string | null;
  Program_Reference_Link__c: string | null;
  Requires_Payment__c: boolean | null;
}

export interface SfProgramsResponse {
  programs:    SfProgramRecord[];
  total:       number | null;
  orgBaseUrl:  string;
  lastUpdated: string;
  fromCache:   boolean;
  cacheAge:    number;
}

export function useSfPrograms() {
  return useQuery<SfProgramsResponse>({
    queryKey: ['sf-programs-list'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/programs/list');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<SfProgramsResponse>;
    },
    staleTime:        0,
    refetchInterval:  5 * 60 * 1000,
    refetchOnMount:   true,
    retry: 1,
  });
}
