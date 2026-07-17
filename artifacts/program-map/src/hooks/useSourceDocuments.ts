import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SourceDocument } from '@/data/sourceDocuments';

const QK = ['source-documents'] as const;

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useSourceDocuments() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ documents: SourceDocument[] }>({
    queryKey: QK,
    queryFn: () => apiFetch('/api/knowledge/documents'),
    staleTime: 60 * 1000,
  });

  const create = useMutation<{ document: SourceDocument }, Error, Partial<SourceDocument>>({
    mutationFn: (payload) =>
      apiFetch('/api/knowledge/documents', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK }),
  });

  const update = useMutation<{ document: SourceDocument }, Error, { id: string; patch: Partial<SourceDocument> }>({
    mutationFn: ({ id, patch }) =>
      apiFetch(`/api/knowledge/documents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK }),
  });

  const remove = useMutation<{ success: boolean }, Error, string>({
    mutationFn: (id) =>
      apiFetch(`/api/knowledge/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QK }),
  });

  return {
    documents: data?.documents ?? [],
    isLoading,
    create,
    update,
    remove,
  };
}
