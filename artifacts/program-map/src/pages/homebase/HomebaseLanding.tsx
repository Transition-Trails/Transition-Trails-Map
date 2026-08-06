import { HomebaseShell } from "@/components/layout/HomebaseShell";
import { LogTimeRow }    from "@/components/homebase/LogTimeRow";
import { useHomebaseAuth } from "@/hooks/useHomebaseAuth";
import { GraduationCap, Users, Heart, Loader2 } from "lucide-react";

/**
 * HomebaseLanding
 *
 * Placeholder landing page rendered inside HomebaseShell while audience-specific
 * pages (Learner #250, Coach #251, Volunteer #252) are being built.
 *
 * It dispatches on `audience` so the correct audience-specific page can be
 * swapped in here once each homebase task is merged.
 */
export default function HomebaseLanding() {
  const { audience, displayName, isLoading } = useHomebaseAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40_30%_94%)]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config = {
    learner:   { label: "Learner",   Icon: GraduationCap, color: "text-emerald-700" },
    coach:     { label: "Coach",     Icon: Users,         color: "text-sky-700"     },
    volunteer: { label: "Volunteer", Icon: Heart,         color: "text-rose-600"    },
  }[audience ?? "learner"] ?? { label: "Member", Icon: GraduationCap, color: "text-foreground" };

  const { Icon } = config;

  return (
    <HomebaseShell audience={audience ?? "learner"} displayName={displayName ?? ""}>
      <div className="flex flex-col gap-6 px-6 py-8 max-w-2xl mx-auto">
        {/* Welcome banner */}
        <div className="rounded-xl border border-border bg-white p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center flex-shrink-0">
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              {config.label} Homebase
            </p>
            <h2 className="text-base font-semibold text-foreground">
              {displayName ? `Welcome back, ${displayName.split(" ")[0]}` : "Welcome to Trail OS"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Your homebase is coming soon. The full view will be here shortly.
            </p>
          </div>
        </div>

        {/* Log time row is always available */}
        <LogTimeRow audience={audience ?? "learner"} />
      </div>
    </HomebaseShell>
  );
}
