import { useQuery } from '@tanstack/react-query';

export function useSfOrgUrl() {
  return useQuery<{ orgBaseUrl: string }>({
    queryKey: ['sf-org-url'],
    queryFn: async () => {
      const res = await fetch('/api/salesforce/org-url');
      if (!res.ok) return { orgBaseUrl: '' };
      return res.json() as Promise<{ orgBaseUrl: string }>;
    },
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
