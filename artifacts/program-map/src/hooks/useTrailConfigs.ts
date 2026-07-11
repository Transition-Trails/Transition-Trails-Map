import { useState, useEffect } from 'react';

export interface TrailConfig {
  id: string;
  name: string;
  trailId: string;
  pennyRole: string | null;
  tone: string | null;
  focalPoints: string | null;
  specialInstructions: string | null;
  isActive: boolean;
}

interface TrailConfigsState {
  data: TrailConfig[];
  loading: boolean;
  error: string | null;
}

export function useTrailConfigs(): TrailConfigsState {
  const [state, setState] = useState<TrailConfigsState>({
    data:    [],
    loading: true,
    error:   null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/penny/data/trail-configs', { credentials: 'include' })
      .then(async (resp) => {
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
          throw new Error(body.error ?? `HTTP ${resp.status}`);
        }
        return resp.json() as Promise<TrailConfig[]>;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data:    [],
            loading: false,
            error:   err instanceof Error ? err.message : 'Failed to load trail configs',
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
