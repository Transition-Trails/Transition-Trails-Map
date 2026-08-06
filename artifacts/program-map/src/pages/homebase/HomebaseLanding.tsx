import { Loader2 } from "lucide-react";
import { useHomebaseAuth } from "@/hooks/useHomebaseAuth";
import { HomebaseShell } from "@/components/layout/HomebaseShell";
import { LogTimeRow }    from "@/components/homebase/LogTimeRow";
import LearnerHomebase   from "@/pages/homebase/LearnerHomebase";

/**
 * HomebaseLanding
 *
 * Audience dispatcher.  Reads googleAudience from the homebase session and
 * renders the correct audience-specific homebase page inside HomebaseShell.
 *
 *   learner   → LearnerHomebase  (task #250 — complete)
 *   coach     → HomebaseShell + LogTimeRow placeholder (task #251 pending)
 *   volunteer → HomebaseShell + LogTimeRow placeholder (task #252 pending)
 */
export default function HomebaseLanding() {
  const { audience, displayName, isLoading } = useHomebaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40_30%_97%)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (audience === "learner") {
    return (
      <LearnerHomebase
        audience="learner"
        displayName={displayName ?? ""}
      />
    );
  }

  // Coach / Volunteer — full HomebaseShell with LogTimeRow preserved while
  // audience-specific pages (tasks #251, #252) are pending.
  const aud = audience ?? "coach";
  return (
    <HomebaseShell audience={aud} displayName={displayName ?? ""}>
      <div className="flex flex-col gap-6 px-6 py-8 max-w-2xl mx-auto">
        {/* Welcome card */}
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
            {aud === "coach" ? "Coach" : "Volunteer"} Homebase
          </p>
          <h2 className="text-base font-semibold text-foreground">
            {displayName ? `Welcome back, ${displayName.split(" ")[0]}` : "Welcome to Trail OS"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Your full homebase view is on the way. Log your time below while you wait.
          </p>
        </div>

        {/* Log time row — always available for all audiences */}
        <LogTimeRow audience={aud} />
      </div>
    </HomebaseShell>
  );
}
