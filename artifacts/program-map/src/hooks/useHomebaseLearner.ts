/**
 * useHomebaseLearner
 *
 * Parallel data-fetching hook for the Learner Homebase page.
 * Each sub-query is independent — a failed cases call never blanks the quest band.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LearnerQuest {
  title:              string;
  description:        string;
  difficulty:         "Beginner" | "Intermediate" | "Expert";
  pointValue:         number;
  category:           string;
  acceptanceCriteria: string;
}

export interface QuestState {
  quest:           LearnerQuest | null;
  stoneSet:        boolean;
  stonesThisCairn: number;
  cairnTarget:     number;
  trailBehind:     Array<{ label: string; earnedAt: string }>;
}

export interface LearnerCase {
  Id:               string;
  CaseNumber:       string | null;
  Subject:          string | null;
  Status:           string | null;
  Priority:         string | null;
  LastModifiedDate: string | null;
  CreatedDate:      string | null;
}

export interface CasesState {
  /** true = SF available + Contact found; false = Contact not found; null = SF unavailable */
  linked:       boolean | null;
  sfUnavailable?: boolean;
  cases:         LearnerCase[];
  totalOpen:     number;
}

export interface WeekItem {
  id:      string;
  type:    "rework" | "deadline" | "buddy_test";
  label:   string;
  dueDate: string | null;
  status:  string;
}

export interface WeekState {
  items:   WeekItem[];
  hasData: boolean;
}

export interface CoachInfo {
  name:     string;
  email:    string;
  slackUserId: string | null;
  nextSession: string | null;
}

export interface CoachState {
  coach:              CoachInfo | null;
  cohortSlackChannel: string | null;
  /** true = Contact found; false = Contact not found; null = SF unavailable */
  linked:             boolean | null;
  sfUnavailable?:     boolean;
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useHomebaseLearnerQuest() {
  return useQuery<QuestState>({
    queryKey:    ["homebase-learner-quest"],
    queryFn:     () => fetchJson<QuestState>("/api/homebase/learner/quest"),
    staleTime:   5 * 60 * 1000,
    retry:       1,
    refetchOnWindowFocus: false,
  });
}

export function useHomebaseLearnerCases() {
  return useQuery<CasesState>({
    queryKey:        ["homebase-learner-cases"],
    queryFn:         () => fetchJson<CasesState>("/api/homebase/learner/cases"),
    staleTime:       4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry:           1,
  });
}

export function useHomebaseLearnerWeek() {
  return useQuery<WeekState>({
    queryKey:  ["homebase-learner-week"],
    queryFn:   () => fetchJson<WeekState>("/api/homebase/learner/week"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}

export function useHomebaseLearnerCoach() {
  return useQuery<CoachState>({
    queryKey:  ["homebase-learner-coach"],
    queryFn:   () => fetchJson<CoachState>("/api/homebase/learner/coach"),
    staleTime: 10 * 60 * 1000,
    retry:     1,
  });
}

/** Marks today's stone as set. Invalidates the quest query so the compact band renders. */
export function useSetStone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/homebase/learner/quest/set-stone`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to set stone");
      return res.json() as Promise<{ ok: boolean; stoneSet: boolean; stonesThisCairn: number }>;
    },
    onSuccess: (data) => {
      // Optimistic update — patch the cached quest state instead of refetching
      qc.setQueryData<QuestState>(["homebase-learner-quest"], (prev) =>
        prev
          ? { ...prev, stoneSet: data.stoneSet, stonesThisCairn: data.stonesThisCairn }
          : prev,
      );
    },
  });
}
