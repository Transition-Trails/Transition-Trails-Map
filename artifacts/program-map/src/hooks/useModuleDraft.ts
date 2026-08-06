import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModuleDraft {
  nodeId:     string;
  nodeKind:   'course' | 'module';
  sections:   Record<string, string>;
  nodeStatus: 'draft' | 'review' | 'published';
  savedAt:    string; // ISO string from DB
  savedBy:    string | null;
}

export interface SaveDraftPayload {
  nodeId:     string;
  nodeKind:   'course' | 'module';
  sections:   Record<string, string>;
  nodeStatus: 'draft' | 'review' | 'published';
}

// ── Fetch hook ────────────────────────────────────────────────────────────────

export function useModuleDraft(nodeId: string | null) {
  return useQuery<{ draft: ModuleDraft | null }>({
    queryKey: ['module-draft', nodeId],
    enabled:  !!nodeId,
    queryFn:  async () => {
      const res = await fetch(`/api/lms/drafts/${nodeId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ draft: ModuleDraft | null }>;
    },
    staleTime: 0, // always refetch when node changes
    retry: 1,
  });
}

// ── Save mutation ─────────────────────────────────────────────────────────────

export function useSaveModuleDraft() {
  const queryClient = useQueryClient();

  return useMutation<{ draft: ModuleDraft }, Error, SaveDraftPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/lms/drafts/${payload.nodeId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((body['error'] as string | undefined) ?? `${res.status}`);
      }
      return res.json() as Promise<{ draft: ModuleDraft }>;
    },
    onSuccess: (data, payload) => {
      // Update the cache so a re-fetch reads the fresh value immediately
      queryClient.setQueryData(['module-draft', payload.nodeId], { draft: data.draft });
    },
  });
}
