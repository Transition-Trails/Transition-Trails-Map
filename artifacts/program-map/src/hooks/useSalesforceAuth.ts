import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SfUser {
  userId: string;
  username: string;
  email: string;
}

export interface SalesforceAuthStatus {
  authenticated: boolean;
  contactId: string | null;
  user: SfUser | null;
}

type SfStatusApiResponse =
  | { authenticated: false }
  | { authenticated: true; contactId: string; user: SfUser };

const SF_AUTH_KEY = ['sf-auth-status'] as const;

async function fetchSfStatus(): Promise<SalesforceAuthStatus> {
  const res = await fetch('/api/auth/salesforce/status', { credentials: 'include' });
  if (!res.ok) throw new Error(`SF status check failed: HTTP ${res.status}`);
  const data = (await res.json()) as SfStatusApiResponse;
  if (data.authenticated) {
    return { authenticated: true, contactId: data.contactId, user: data.user };
  }
  return { authenticated: false, contactId: null, user: null };
}

export function useSalesforceAuth() {
  const queryClient = useQueryClient();

  const query = useQuery<SalesforceAuthStatus>({
    queryKey: SF_AUTH_KEY,
    queryFn: fetchSfStatus,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/salesforce/logout', { credentials: 'include' });
      if (!res.ok) throw new Error(`Logout failed: HTTP ${res.status}`);
    },
    onSuccess: () => {
      queryClient.setQueryData<SalesforceAuthStatus>(SF_AUTH_KEY, {
        authenticated: false,
        contactId: null,
        user: null,
      });
    },
  });

  const status: SalesforceAuthStatus = query.data ?? {
    authenticated: false,
    contactId: null,
    user: null,
  };

  return {
    ...status,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    disconnect: disconnect.mutate,
    disconnecting: disconnect.isPending,
  };
}
