/**
 * LogTimeRow
 *
 * Shared component used by all three Homebase pages.
 * Renders an activity selector, numeric hours input, and a "Log it" button.
 * Submits to POST /api/homebase/log-time and shows a success toast.
 */

import { useState } from "react";
import { Clock, ChevronDown, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { HomebaseAudience } from "@/hooks/useHomebaseAuth";

// ── Activity options per audience ─────────────────────────────────────────────

const ACTIVITIES: Record<HomebaseAudience, string[]> = {
  learner: [
    "Client session",
    "Case research",
    "Salesforce practice",
    "Trail Quest",
    "Peer review",
    "Onboarding task",
    "Other",
  ],
  coach: [
    "Squad coaching",
    "Artefact review",
    "Verdict session",
    "Office hours",
    "Team meeting",
    "Other",
  ],
  volunteer: [
    "Client session",
    "Case research",
    "Queue work",
    "Training",
    "Process documentation",
    "Community post",
    "Other",
  ],
  // Team staff members can log time from Mission Control; this entry satisfies
  // the exhaustive Record<HomebaseAudience, string[]> requirement.
  team: [
    "Team meeting",
    "Admin work",
    "Programme support",
    "Other",
  ],
};

const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Component ──────────────────────────────────────────────────────────────────

interface LogTimeRowProps {
  audience: HomebaseAudience;
  /** Optional default activity label override (e.g. client org name). */
  defaultActivity?: string;
  /**
   * 'primary' — amber fill (default, used when this is the only CTA on screen).
   * 'secondary' — outlined style (use when another amber CTA is already visible,
   *               e.g. "Set today's stone →" in the CairnBand).
   */
  buttonVariant?: "primary" | "secondary";
}

export function LogTimeRow({ audience, defaultActivity, buttonVariant = "primary" }: LogTimeRowProps) {
  const options  = ACTIVITIES[audience];
  const firstOpt = defaultActivity ?? options[0] ?? "Other";

  const [activity,  setActivity]  = useState(firstOpt);
  const [hours,     setHours]     = useState<string>("");
  const [loading,   setLoading]   = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const { toast } = useToast();

  const isValid = hours !== "" && Number(hours) > 0 && Number(hours) <= 24;

  async function handleSubmit() {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/homebase/log-time`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ activityLabel: activity, hours: Number(hours) }),
      });
      if (!res.ok) throw new Error("Server error");

      setSucceeded(true);
      setHours("");
      toast({ title: "Time logged", description: `${hours}h — ${activity}` });
      setTimeout(() => setSucceeded(false), 2500);
    } catch {
      toast({ variant: "destructive", title: "Couldn't log time", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 flex items-center gap-3">
      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      {/* Activity selector */}
      <div className="relative flex-1">
        <select
          value={activity}
          onChange={e => setActivity(e.target.value)}
          className="w-full appearance-none bg-transparent text-sm text-foreground pr-6 outline-none cursor-pointer"
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {defaultActivity && !options.includes(defaultActivity) && (
            <option value={defaultActivity}>{defaultActivity}</option>
          )}
        </select>
        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>

      {/* Hours input */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          value={hours}
          onChange={e => setHours(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void handleSubmit(); }}
          placeholder="hrs"
          className="w-16 text-sm text-center border border-border rounded-md px-2 py-1 outline-none focus:border-primary bg-white placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Submit button — primary=amber fill, secondary=outlined (avoids two amber CTAs) */}
      <button
        onClick={() => void handleSubmit()}
        disabled={!isValid || loading}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0",
          buttonVariant === "secondary"
            ? "border border-border text-foreground hover:bg-muted/40"
            : "bg-[#D97706] text-white hover:bg-[#B45309]",
        ].join(" ")}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : succeeded ? (
          <Check className="w-3.5 h-3.5" />
        ) : null}
        {loading ? "Logging…" : succeeded ? "Logged!" : "Log it"}
      </button>
    </div>
  );
}
