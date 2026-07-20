import { useState, useEffect, useRef } from 'react';

export type PennyStatus = 'Active' | 'Planned' | 'Not Planned';

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
