import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptTemplates as seedTemplates } from '@/data/pennyPromptStudioData';
import type { PromptTemplate } from '@/data/pennyPromptStudioData';

const QUERY_KEY = ['prompt-templates'] as const;

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function usePromptTemplates() {
  const qc = useQueryClient();

  const query = useQuery<PromptTemplate[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { templates } = await apiFetch('/api/penny/prompt-templates') as { templates: PromptTemplate[] };
      if (templates.length === 0) {
        await apiFetch('/api/penny/prompt-templates/seed', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ templates: seedTemplates }),
        });
        return seedTemplates;
      }
      return templates;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (template: PromptTemplate) =>
      apiFetch('/api/penny/prompt-templates', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(template),
      }) as Promise<{ template: PromptTemplate }>,
    onMutate: async (newTemplate) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<PromptTemplate[]>(QUERY_KEY);
      qc.setQueryData<PromptTemplate[]>(QUERY_KEY, old => [...(old ?? []), newTemplate]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { qc.setQueryData(QUERY_KEY, ctx?.prev); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PromptTemplate> }) =>
      apiFetch(`/api/penny/prompt-templates/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      }) as Promise<{ template: PromptTemplate }>,
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<PromptTemplate[]>(QUERY_KEY);
      qc.setQueryData<PromptTemplate[]>(QUERY_KEY, old =>
        (old ?? []).map(t => t.id === id ? { ...t, ...updates } : t)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => { qc.setQueryData(QUERY_KEY, ctx?.prev); },
    onSettled: () => { void qc.invalidateQueries({ queryKey: QUERY_KEY }); },
  });

  return {
    templates:  query.data ?? seedTemplates,
    isLoading:  query.isLoading,
    isError:    query.isError,
    create:     createMutation.mutate,
    update:     updateMutation.mutate,
  };
}
