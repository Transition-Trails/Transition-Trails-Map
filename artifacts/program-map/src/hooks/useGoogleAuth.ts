/**
 * useGoogleAuth.ts
 *
 * React Query hook for the Google SSO session state.
 * Calls /api/auth/google/me on mount (and on window focus) and caches
 * the result for 4 minutes — slightly under the server's 5-minute group
 * refresh interval so the client never shows stale group data for too long.
 *
 * Two consumers use this hook:
 *  - InnerApp (App.tsx) — gates the entire staff UI on isSignedIn
 *  - UserProfileButton (Topbar.tsx) — reads name/email/tier for the avatar panel
 *
 * React Query deduplicates the fetch, so both consumers share one request.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AccessTier } from '@/config/accessTiers';

export interface GoogleUser {
  email:  string;
  name:   string;
  sub:    string;
  /** Full set of Trail OS Google Group emails this user belongs to. */
  groups: string[];
  /** Highest-privilege tier derived from the group set (for display). */
  tier:   AccessTier;
  /**
   * Homebase audience when the user is in a learner/coach/volunteer group.
   * null for staff-only users.
   */
  audience: 'learner' | 'coach' | 'volunteer' | 'team' | null;
  /**
   * The configured team group email address (from GOOGLE_GROUP_TEAM env var).
   * Exposed so the frontend never hardcodes a specific address — changing the
   * env var requires no frontend code change.
   * null when the env var is not set.
   */
  teamGroup: string | null;
}

interface MeResponse {
  authenticated:   boolean;
  email?:          string;
  name?:           string;
  sub?:            string;
  groups?:         string[];
  tier?:           string;
  audience?:       'learner' | 'coach' | 'volunteer' | 'team' | null;
  teamGroup?:      string | null;
  reason?:         string;
  /** Set when a superadmin is viewing the platform as another user. */
  isImpersonating?: boolean;
  realEmail?:      string;
  realName?:       string;
}

const VALID_TIERS: AccessTier[] = ['everyday', 'power', 'admin', 'superadmin'];
const QUERY_KEY = ['google-auth-me'] as const;

export function useGoogleAuth(): {
  isLoading:        boolean;
  isSignedIn:       boolean;
  user:             GoogleUser | null;
  /** True when a superadmin is currently viewing the platform as another user. */
  isImpersonating:  boolean;
  /** The user being impersonated. Null when not impersonating. */
  impersonatedUser: { email: string; name: string; audience: string | null } | null;
  /** The superadmin's real email. Non-null only during impersonation. */
  realEmail:        string | null;
  realName:         string | null;
} {
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

  const { data, isLoading, isPending } = useQuery<MeResponse>({
    queryKey: QUERY_KEY,
    queryFn:  () =>
      fetch(`${BASE}/api/auth/google/me`, { credentials: 'include' }).then(r => r.json()),
    staleTime:          4 * 60 * 1000,   // 4 min — re-fetch every ~4 min in background
    retry:              false,
    refetchOnWindowFocus: true,           // catch group changes when user returns to tab
  });

  if (isLoading || isPending || !data) {
    return {
      isLoading: true, isSignedIn: false, user: null,
      isImpersonating: false, impersonatedUser: null, realEmail: null, realName: null,
    };
  }

  if (!data.authenticated || !data.email) {
    return {
      isLoading: false, isSignedIn: false, user: null,
      isImpersonating: false, impersonatedUser: null, realEmail: null, realName: null,
    };
  }

  const tier = (VALID_TIERS.includes(data.tier as AccessTier)
    ? data.tier
    : 'everyday') as AccessTier;

  const VALID_AUDIENCES = ['learner', 'coach', 'volunteer', 'team'] as const;
  type ValidAudience = typeof VALID_AUDIENCES[number];
  const audience = (VALID_AUDIENCES as readonly string[]).includes(data.audience ?? '')
    ? (data.audience as ValidAudience)
    : null;

  const isImpersonating = data.isImpersonating === true;

  return {
    isLoading: false,
    isSignedIn: true,
    user: {
      email:     data.email,
      name:      data.name   ?? data.email,
      sub:       data.sub    ?? '',
      groups:    data.groups ?? [],
      tier,
      audience,
      teamGroup: data.teamGroup ?? null,
    },
    isImpersonating,
    impersonatedUser: isImpersonating
      ? { email: data.email, name: data.name ?? data.email, audience: audience }
      : null,
    realEmail: isImpersonating ? (data.realEmail ?? null) : null,
    realName:  isImpersonating ? (data.realName  ?? null) : null,
  };
}

/**
 * Call to invalidate the auth cache after sign-out so React Query
 * re-fetches and the UI transitions to the sign-in state immediately.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, '');

  return async () => {
    await fetch(`${BASE}/api/auth/google/sign-out`, {
      method:      'POST',
      credentials: 'include',
    });
    queryClient.clear();
    // Hard navigate so the session cookie is cleared before React re-renders
    window.location.href = `${BASE}/`;
  };
}
