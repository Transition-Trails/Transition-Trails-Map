import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';

export type PennyStatus = 'Active' | 'Planned' | 'Not Planned';

interface UseProgramPennyConfigResult {
  status: PennyStatus;
  setStatus: (newStatus: PennyStatus) => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
}

export function useProgramPennyConfig(
  programId: string,
  initialStatus?: PennyStatus,
): UseProgramPennyConfigResult {
  const { updateProgram } = useAppContext();
  const [status, setStatusState] = useState<PennyStatus>(initialStatus ?? 'Not Planned');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setIsLoading(true);
    fetch(`/api/programs/${programId}/penny-config`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { config?: { status?: string } }) => {
        if (!mounted.current) return;
        const s = d.config?.status as PennyStatus | undefined;
        if (s) {
          setStatusState(s);
          updateProgram(programId, { pennyStatus: s, pennyActive: s === 'Active' });
        }
      })
      .catch(() => { /* keep initialStatus */ })
      .finally(() => { if (mounted.current) setIsLoading(false); });
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const setStatus = async (newStatus: PennyStatus): Promise<void> => {
    setStatusState(newStatus);
    updateProgram(programId, { pennyStatus: newStatus, pennyActive: newStatus === 'Active' });
    setIsSaving(true);
    try {
      await fetch(`/api/programs/${programId}/penny-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } finally {
      if (mounted.current) setIsSaving(false);
    }
  };

  return { status, setStatus, isSaving, isLoading };
}
