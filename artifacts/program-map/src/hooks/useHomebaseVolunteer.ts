/**
 * useHomebaseVolunteer
 *
 * Parallel data-fetching hooks for the Volunteer Homebase page.
 * Each sub-query is independent — a failed cases call never blanks the queue.
 */

import { useQuery } from "@tanstack/react-query";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

/** Monthly hours + merch progress for the This Month band. */
export interface VolunteerMonthState {
  hoursLogged:      number;
  /** null when the volunteer's monthly commitment hasn't been set yet */
  hoursCommitment:  number | null;
  commitmentSet:    boolean;
  points:           number;
  /** Display name of the next merch tier, or null when all tiers unlocked */
  nextMerchTier:    string | null;
  nextMerchPoints:  number | null;
  /** Points needed to reach next tier (nextMerchPoints - points), or 0 */
  pointsToNext:     number;
  specialty:        string | null;
  caseLimit:        number | null;
}

/** An open SF Case assigned to the volunteer. */
export interface VolunteerCase {
  Id:               string;
  CaseNumber:       string | null;
  Subject:          string | null;
  Status:           string | null;
  Priority:         string | null;
  LastModifiedDate: string | null;
  CreatedDate:      string | null;
}

export interface VolunteerCasesState {
  linked:        boolean | null;
  sfUnavailable?: boolean;
  cases:          VolunteerCase[];
  totalOpen:      number;
}

/** An unassigned case in the help queue. */
export interface QueueCase {
  id:            string;
  caseNumber:    string | null;
  subject:       string | null;
  clientName:    string | null;
  estimatedSize: "small" | "medium" | "large" | null;
  daysWaiting:   number | null;
  matchesSpecialty: boolean;
}

export interface QueueState {
  items:        QueueCase[];
  openCount:    number;
  caseLimit:    number;
  hasData:      boolean;
}

/** A Penny-suggested skill from the queue gap analysis. */
export interface GrowthSkill {
  id:           string;
  skillName:    string;
  whyThis:      string;
  timeEstimate: string;
  format:       string;
}

export interface GrowthState {
  skills:   GrowthSkill[];
  hasData:  boolean;
}

/** A piece of content worth sharing or engaging with. */
export interface ShareableItem {
  id:       string;
  kind:     "post" | "draft";
  title:    string;
  url:      string | null;
  label:    string;
}

export interface ShareablesState {
  items:   ShareableItem[];
  hasData: boolean;
}

/** Volunteer coordinator contact for the People panel. */
export interface CoordinatorState {
  coordinatorName:       string | null;
  coordinatorSlackId:    string | null;
  volunteerSlackChannel: string | null;
  linked:                boolean | null;
  sfUnavailable?:        boolean;
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useVolunteerMonth() {
  return useQuery<VolunteerMonthState>({
    queryKey:        ["homebase-volunteer-month"],
    queryFn:         () => fetchJson<VolunteerMonthState>("/api/homebase/volunteer/month"),
    staleTime:       2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry:           1,
  });
}

export function useVolunteerCases() {
  return useQuery<VolunteerCasesState>({
    queryKey:        ["homebase-volunteer-cases"],
    queryFn:         () => fetchJson<VolunteerCasesState>("/api/homebase/volunteer/cases"),
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry:           1,
  });
}

export function useVolunteerQueue() {
  return useQuery<QueueState>({
    queryKey:        ["homebase-volunteer-queue"],
    queryFn:         () => fetchJson<QueueState>("/api/homebase/volunteer/queue"),
    staleTime:       3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry:           1,
  });
}

export function useVolunteerGrowth() {
  return useQuery<GrowthState>({
    queryKey:  ["homebase-volunteer-growth"],
    queryFn:   () => fetchJson<GrowthState>("/api/homebase/volunteer/growth"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}

export function useVolunteerShareables() {
  return useQuery<ShareablesState>({
    queryKey:  ["homebase-volunteer-shareables"],
    queryFn:   () => fetchJson<ShareablesState>("/api/homebase/volunteer/shareables"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}

export function useVolunteerCoordinator() {
  return useQuery<CoordinatorState>({
    queryKey:  ["homebase-volunteer-coordinator"],
    queryFn:   () => fetchJson<CoordinatorState>("/api/homebase/volunteer/coordinator"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}
