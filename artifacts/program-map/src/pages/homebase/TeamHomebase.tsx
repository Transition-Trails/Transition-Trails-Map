/**
 * TeamHomebase
 *
 * Homebase landing for team@ staff members. They land here instead of the
 * admin app — Mission Control (the full admin app) is one click away via the
 * left drawer or the prominent card below.
 */

import { LayoutDashboard, Users, CalendarDays, MessageSquare } from "lucide-react";
import { HomebaseShell }  from "@/components/layout/HomebaseShell";

interface TeamHomebaseProps {
  displayName: string;
}

const QUICK_LINKS = [
  { label: "Programs",   desc: "Program map and health",      href: "/program",                icon: LayoutDashboard },
  { label: "People",     desc: "Learners, coaches, volunteers", href: "/admin/people",          icon: Users           },
  { label: "Calendar",   desc: "Upcoming sessions and events", href: "https://calendar.google.com", icon: CalendarDays, external: true },
  { label: "Slack",      desc: "Team channels",               href: "https://slack.com",       icon: MessageSquare, external: true },
];

export default function TeamHomebase({ displayName }: TeamHomebaseProps) {
  const firstName = displayName.split(" ")[0] || "there";

  return (
    <HomebaseShell audience="team" displayName={displayName}>
      <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">

        {/* Greeting */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Team Homebase
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Good to see you, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily workspace.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick access
          </p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ label, desc, href, icon: Icon, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-white hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </HomebaseShell>
  );
}
