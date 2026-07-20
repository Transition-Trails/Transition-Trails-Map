import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

export type PennyStatus = 'Active' | 'Planned' | 'Not Planned';

interface PennyConfigRow {
  programId: string;
  status: PennyStatus;
  notes: string | null;
}

/** Bulk hook — fetches every penny config row from the DB in one request. */
export function usePennyConfigs() {
  return useQuery<{ configs: PennyConfigRow[] }>({
    queryKey: ['penny-configs-bulk'],
    queryFn: async () => {
      const res = await fetch('/api/programs/penny-configs');
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<{ configs: PennyConfigRow[] }>;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}

interface UseProgramPennyConfigResult {
  status: PennyStatus;
  setStatus: (newStatus: PennyStatus) => void;
  isSaving: boolean;
}

export function useProgramPennyConfig(
  programId: string,
  initialStatus?: PennyStatus,
): UseProgramPennyConfigResult {
  const [status, setStatusState] = useState<PennyStatus>(initialStatus ?? 'Not Planned');
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetch(`/api/programs/${programId}/penny-config`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { config?: { status?: string } }) => {
        if (!mounted.current) return;
        const s = d.config?.status as PennyStatus | undefined;
        if (s) setStatusState(s);
      })
      .catch(() => { /* keep initialStatus */ });
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const setStatus = (newStatus: PennyStatus): void => {
    setStatusState(newStatus);
    setIsSaving(true);
    fetch(`/api/programs/${programId}/penny-config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .finally(() => { if (mounted.current) setIsSaving(false); });
  };

  return { status, setStatus, isSaving };
}
