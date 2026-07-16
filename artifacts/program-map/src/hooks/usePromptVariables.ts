import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptVariables as seedVariables } from '@/data/pennyPromptStudioData';
import type { PromptVariable } from '@/data/pennyPromptStudioData';

const QUERY_KEY = ['prompt-variables'] as const;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function usePromptVariables() {
  const qc = useQueryClient();

  const query = useQuery<PromptVariable[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { variables } = await apiFetch('/api/penny/prompt-variables') as { variables: PromptVariable[] };
      if (variables.length === 0) {
        await apiFetch('/api/penny/prompt-variables/seed', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ variables: seedVariables }),
        });
        return seedVariables;
      }
      return variables;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (variable: PromptVariable) =>
      apiFetch('/api/penny/prompt-variables', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(variable),
      }) as Promise<{ variable: PromptVariable }>,
    onMutate: async (newVar) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<PromptVariable[]>(QUERY_KEY);
      qc.setQueryData<PromptVariable[]>(QUERY_KEY, old => [...(old ?? []), newVar]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { qc.setQueryData(QUERY_KEY, ctx?.prev); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PromptVariable> }) =>
      apiFetch(`/api/penny/prompt-variables/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      }) as Promise<{ variable: PromptVariable }>,
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<PromptVariable[]>(QUERY_KEY);
      qc.setQueryData<PromptVariable[]>(QUERY_KEY, old =>
        (old ?? []).map(v => v.id === id ? { ...v, ...updates } : v)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => { qc.setQueryData(QUERY_KEY, ctx?.prev); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  return {
    variables:  query.data ?? seedVariables,
    isLoading:  query.isLoading,
    isError:    query.isError,
    create:     createMutation.mutate,
    update:     updateMutation.mutate,
  };
}
