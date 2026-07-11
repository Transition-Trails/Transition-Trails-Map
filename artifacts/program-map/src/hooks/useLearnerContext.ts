import { useState, useEffect } from 'react';

export interface LearnerContext {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
  pennyTrailConfigId: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  currentBlockers: string | null;
  coachingTone: string | null;
  confidenceScore: number | null;
  skillScore: number | null;
  sprintWeek: number | null;
  onboardingComplete: boolean;
}

interface LearnerContextState {
  data: LearnerContext | null;
  loading: boolean;
  error: string | null;
}

export function useLearnerContext(contactId: string | null): LearnerContextState {
  const [state, setState] = useState<LearnerContextState>({
    data:    null,
    loading: false,
    error:   null,
  });

  useEffect(() => {
    if (!contactId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetch(`/api/penny/data/learner/${encodeURIComponent(contactId)}`, {
      credentials: 'include',
    })
      .then(async (resp) => {
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
          throw new Error(body.error ?? `HTTP ${resp.status}`);
        }
        return resp.json() as Promise<LearnerContext>;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data:    null,
            loading: false,
            error:   err instanceof Error ? err.message : 'Failed to load learner context',
          });
        }
      });

    return () => { cancelled = true; };
  }, [contactId]);

  return state;
}
