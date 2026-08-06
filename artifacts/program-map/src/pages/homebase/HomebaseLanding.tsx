import { Loader2 } from "lucide-react";
import { useHomebaseAuth } from "@/hooks/useHomebaseAuth";
import LearnerHomebase    from "@/pages/homebase/LearnerHomebase";
import CoachHomebase      from "@/pages/homebase/CoachHomebase";
import VolunteerHomebase  from "@/pages/homebase/VolunteerHomebase";
import TeamHomebase       from "@/pages/homebase/TeamHomebase";

/**
 * HomebaseLanding
 *
 * Audience dispatcher.  Reads googleAudience from the homebase session and
 * renders the correct audience-specific homebase page inside HomebaseShell.
 *
 *   learner   → LearnerHomebase  (task #250 — complete)
 *   coach     → CoachHomebase    (task #251 — complete)
 *   volunteer → HomebaseShell + LogTimeRow placeholder (task #252 pending)
 */
export default function HomebaseLanding() {
  const { audience, displayName, coachLevel, isLoading } = useHomebaseAuth();

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

  if (audience === "coach") {
    return (
      <CoachHomebase
        audience="coach"
        displayName={displayName ?? ""}
        coachLevel={coachLevel}
      />
    );
  }

  if (audience === "team") {
    return <TeamHomebase displayName={displayName ?? ""} />;
  }

  // Volunteer (default for any remaining audience)
  return (
    <VolunteerHomebase
      audience="volunteer"
      displayName={displayName ?? ""}
    />
  );
}
