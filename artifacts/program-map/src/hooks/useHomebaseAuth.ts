/**
 * useHomebaseAuth.ts
 *
 * React Query hook for the homebase session state.
 * Calls /api/auth/homebase/status on mount — safe to call when not signed in
 * (returns { isSignedIn: false }).
 *
 * Used by:
 *  - HomebaseRoute guard (App.tsx) — decides which shell to render
 *  - HomebaseLanding / audience-specific pages — reads audience + displayName
 */

import { useQuery } from "@tanstack/react-query";

export type HomebaseAudience = "learner" | "coach" | "volunteer";

interface HomebaseStatusResponse {
  isSignedIn:  boolean;
  audience:    HomebaseAudience | null;
  email?:      string;
  displayName?: string;
}

const QUERY_KEY = ["homebase-auth-status"] as const;

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

export function useHomebaseAuth(): {
  isLoading:   boolean;
  isSignedIn:  boolean;
  audience:    HomebaseAudience | null;
  email:       string | null;
  displayName: string | null;
} {
  const { data, isLoading, isPending } = useQuery<HomebaseStatusResponse>({
    queryKey: QUERY_KEY,
    queryFn:  () =>
      fetch(`${BASE}/api/auth/homebase/status`, { credentials: "include" }).then(r => r.json()),
    staleTime:            4 * 60 * 1000,
    retry:                false,
    refetchOnWindowFocus: true,
  });

  if (isLoading || isPending || !data) {
    return { isLoading: true, isSignedIn: false, audience: null, email: null, displayName: null };
  }

  return {
    isLoading:   false,
    isSignedIn:  data.isSignedIn,
    audience:    data.audience ?? null,
    email:       data.email        ?? null,
    displayName: data.displayName  ?? null,
  };
}
