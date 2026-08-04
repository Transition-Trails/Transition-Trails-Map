// ── useCapabilityPreflight ─────────────────────────────────────────────────────
// Fetches live Salesforce / integration requirement checks for a capability,
// then merges client-side 'config' checks (capability dependencies) so the UI
// has a single unified result object.

import { useQuery } from '@tanstack/react-query';
import { getRequirements, type CapabilityRequirement } from '@/data/capabilityRequirements';

// The API returns results for SF / integration requirements.
// Config requirements are resolved client-side in mergeConfigChecks().
export type CheckStatus = 'met' | 'missing' | 'undetermined';

export interface RequirementCheckResult extends CapabilityRequirement {
  status: CheckStatus;
  detail: string; // e.g. "Present", "3 records", "Missing", "Not connected"
}

export interface PreflightResult {
  capabilityId: string;
  allMet: boolean;
  metCount: number;
  totalCount: number;
  requirements: RequirementCheckResult[];
  sfConnected: boolean;
  error?: string;
}

// Shape returned by the API (config checks are 'undetermined' at this stage)
interface ApiPreflightResponse {
  capabilityId: string;
  sfConnected: boolean;
  requirements: RequirementCheckResult[];
  error?: string;
}

async function fetchPreflight(capabilityId: string): Promise<ApiPreflightResponse> {
  const res = await fetch(`/api/penny/capabilities/${encodeURIComponent(capabilityId)}/preflight`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Preflight check failed (${res.status})`);
  }
  return res.json() as Promise<ApiPreflightResponse>;
}

/**
 * Merges client-side 'config' requirement results (capability dependency checks)
 * into the API response.  The backend can't know which capabilities are active
 * client-side, so it returns 'undetermined' for these — we override them here.
 */
function mergeConfigChecks(
  apiRequirements: RequirementCheckResult[],
  activeCapabilityIds: Set<string>,
): RequirementCheckResult[] {
  return apiRequirements.map(r => {
    if (r.kind !== 'config' || !r.capabilityDep) return r;
    const isActive = activeCapabilityIds.has(r.capabilityDep);
    return {
      ...r,
      status: isActive ? 'met' : 'missing',
      detail: isActive ? 'Active' : 'Not yet active',
    };
  });
}

/**
 * Returns live pre-flight check results for a capability.
 *
 * @param capabilityId  — ID to check, or null to disable.
 * @param activeCapabilityIds — set of capability IDs currently marked active
 *                              (used to resolve 'config' dependency checks).
 * @param enabled — pass false to skip the fetch entirely.
 */
export function useCapabilityPreflight(
  capabilityId: string | null,
  activeCapabilityIds: Set<string>,
  enabled = true,
): {
  data: PreflightResult | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['capability-preflight', capabilityId],
    queryFn: () => fetchPreflight(capabilityId!),
    enabled: !!capabilityId && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime:    5 * 60 * 1000,
    retry: 1,
  });

  if (!query.data) {
    return { data: undefined, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
  }

  const mergedRequirements = mergeConfigChecks(query.data.requirements, activeCapabilityIds);

  // Fill in any requirements the API didn't return (e.g. capability was added
  // after the backend was deployed) — compare against the frontend source of truth.
  const frontendReqs = capabilityId ? getRequirements(capabilityId) : [];
  const apiIds = new Set(mergedRequirements.map(r => r.id));
  const missing = frontendReqs
    .filter(r => !apiIds.has(r.id))
    .map(r => ({
      ...r,
      status: 'undetermined' as CheckStatus,
      detail: 'Could not check',
    }));

  const allRequirements = [...mergedRequirements, ...missing];
  const metCount  = allRequirements.filter(r => r.status === 'met').length;
  const allMet    = allRequirements.length > 0 && allRequirements.every(r => r.status === 'met');

  const result: PreflightResult = {
    capabilityId:  query.data.capabilityId,
    sfConnected:   query.data.sfConnected,
    allMet,
    metCount,
    totalCount:    allRequirements.length,
    requirements:  allRequirements,
    error:         query.data.error,
  };

  return { data: result, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
