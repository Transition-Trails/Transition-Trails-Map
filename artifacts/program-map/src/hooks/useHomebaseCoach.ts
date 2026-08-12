/**
 * useHomebaseCoach
 *
 * Parallel data-fetching hooks for the Coach Homebase page.
 * Each sub-query is independent — a failed cases call never blanks the squad or
 * the Penny prepared band.
 */

import { useQuery } from "@tanstack/react-query";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

export type CoachLevel = "assistant" | "associate" | "advanced";

export const COACH_LEVEL_LABELS: Record<CoachLevel, string> = {
  assistant: "Coach's Assistant",
  associate: "Associate Coach",
  advanced:  "Advanced Coach",
};

/** A draft item Penny has staged for coach review. */
export interface PennyPreparedItem {
  id:    string;
  /** e.g. "verdict" | "date_change" | "countersign" | "nudge" */
  kind:  string;
  title: string;
  body:  string;
}

export interface PennyPreparedState {
  items:   PennyPreparedItem[];
  hasData: boolean;
}

/** Learner artifact awaiting a coach verdict. */
export interface CoachArtifact {
  id:              string;
  learnerName:     string;
  artifactType:    string;
  submittedAt:     string | null;
  criteriaCount:   number;
  pennyPreRead:    string | null;
}

export interface ArtifactsState {
  items:   CoachArtifact[];
  hasData: boolean;
}

/** A learner card in the coach's squad. */
export interface SquadLearner {
  id:           string;
  name:         string;
  buddy:        string | null;
  activity:     string | null;
  phase:        string | null;
  passedCount:  number;
  reworkCount:  number;
  /** Flat improvement curve → show amber "Stuck" flag. */
  isStuck:      boolean;
  /** "primary" | "secondary" — for advanced coaches who see two squads. */
  squadLabel?:  string;
}

export interface SquadState {
  squads:  SquadLearner[];
  hasData: boolean;
}

/** Lead coach contact info for the People panel. */
export interface LeadInfo {
  name:         string;
  email:        string;
  slackUserId:  string | null;
}

export interface LeadState {
  lead:               LeadInfo | null;
  cohortSlackChannel: string | null;
  /** true = Contact found; false = Contact not found; null = SF unavailable */
  linked:             boolean | null;
  sfUnavailable?:     boolean;
}

/** Open SF Cases for the coach's own Contact record. */
export interface CoachCase {
  Id:               string;
  CaseNumber:       string | null;
  Subject:          string | null;
  Status:           string | null;
  Priority:         string | null;
  LastModifiedDate: string | null;
  CreatedDate:      string | null;
}

export interface CoachCasesState {
  /** true = SF up + Contact found; false = no Contact; null = SF unavailable */
  linked:        boolean | null;
  sfUnavailable?: boolean;
  cases:          CoachCase[];
  totalOpen:      number;
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useCoachPennyPrepared() {
  return useQuery<PennyPreparedState>({
    queryKey: ["homebase-coach-penny-prepared"],
    queryFn:  () => fetchJson<PennyPreparedState>("/api/homebase/coach/penny-prepared"),
    staleTime: 2 * 60 * 1000,
    retry:     1,
    refetchOnWindowFocus: false,
  });
}

export function useCoachArtifacts() {
  return useQuery<ArtifactsState>({
    queryKey: ["homebase-coach-artifacts"],
    queryFn:  () => fetchJson<ArtifactsState>("/api/homebase/coach/artifacts"),
    staleTime: 3 * 60 * 1000,
    retry:     1,
  });
}

export function useCoachSquad() {
  return useQuery<SquadState>({
    queryKey: ["homebase-coach-squad"],
    queryFn:  () => fetchJson<SquadState>("/api/homebase/coach/squad"),
    staleTime: 5 * 60 * 1000,
    retry:     1,
  });
}

export function useCoachLead() {
  return useQuery<LeadState>({
    queryKey: ["homebase-coach-lead"],
    queryFn:  () => fetchJson<LeadState>("/api/homebase/coach/lead"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}

export function useCoachCases() {
  return useQuery<CoachCasesState>({
    queryKey:        ["homebase-coach-cases"],
    queryFn:         () => fetchJson<CoachCasesState>("/api/homebase/coach/cases"),
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry:           1,
  });
}
