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
  // Track whether the user has already set a value locally so the
  // background fetch on mount doesn't clobber an in-progress save.
  const locallySet = useRef(false);

  useEffect(() => {
    mounted.current = true;
    locallySet.current = false;
    setIsLoading(true);
    fetch(`/api/programs/${programId}/penny-config`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { config?: { status?: string } }) => {
        if (!mounted.current || locallySet.current) return;
        const s = d.config?.status as PennyStatus | undefined;
        if (s) {
          setStatusState(s);
          // Sync AppContext so ProgramWorkspace reflects DB truth on load.
          updateProgram(programId, { pennyStatus: s, pennyActive: s === 'Active' });
        }
      })
      .catch(() => { /* keep initialStatus */ })
      .finally(() => { if (mounted.current) setIsLoading(false); });
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const setStatus = async (newStatus: PennyStatus): Promise<void> => {
    locallySet.current = true;
    // Optimistic local update — no AppContext write here to avoid
    // triggering a re-render cascade that remounts this hook.
    setStatusState(newStatus);
    setIsSaving(true);
    try {
      await fetch(`/api/programs/${programId}/penny-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Sync AppContext after confirmed save (no cascade risk here —
      // the PATCH is already done, no pending effect to race against).
      updateProgram(programId, { pennyStatus: newStatus, pennyActive: newStatus === 'Active' });
    } finally {
      if (mounted.current) setIsSaving(false);
    }
  };

  return { status, setStatus, isSaving, isLoading };
}
