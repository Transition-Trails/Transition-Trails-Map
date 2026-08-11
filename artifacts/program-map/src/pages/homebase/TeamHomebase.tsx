/**
 * TeamHomebase
 *
 * Homebase landing for team@ staff members. They land here instead of the
 * admin app — Mission Control (the full admin app) is one click away via the
 * left drawer or the prominent card below.
 *
 * When rendered for staff (isStaff=true), quick links are tailored to the
 * user's access tier. Team audience members see the original generic links.
 */

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  Activity,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { HomebaseShell } from "@/components/layout/HomebaseShell";
import { useTierFlags }  from "@/hooks/useTierFlags";
import { TodayTasksCard }    from "@/components/homebase/TodayTasksCard";
import { TodayMeetingsCard } from "@/components/homebase/TodayMeetingsCard";
import { ActiveTasksCard }   from "@/components/homebase/ActiveTasksCard";
import { MeetingNotesCard }  from "@/components/homebase/MeetingNotesCard";

interface TeamHomebaseProps {
  displayName: string;
  /** True when rendered for a staff user (no homebase audience). */
  isStaff?: boolean;
}

// Generic links for team@ audience members
const TEAM_QUICK_LINKS = [
  { label: "Programs",  desc: "Program map and health",         href: "/program",                    icon: LayoutDashboard },
  { label: "People",    desc: "Learners, coaches, volunteers",  href: "/admin/people",               icon: Users           },
  { label: "Calendar",  desc: "Upcoming sessions and events",   href: "https://calendar.google.com", icon: CalendarDays,   external: true },
  { label: "Slack",     desc: "Team channels",                  href: "https://slack.com",           icon: MessageSquare,  external: true },
];

// Staff links — admin / superadmin
const ADMIN_QUICK_LINKS = [
  { label: "Operations",        desc: "Demand queue and system health",    href: "/operations/demand",       icon: Activity       },
  { label: "Penny Studio",      desc: "Prompts, capabilities, and intel",  href: "/penny/prompts",           icon: Sparkles       },
  { label: "Phase 1 Readiness", desc: "Integration and launch checklist",  href: "/admin/phase1-readiness",  icon: ShieldCheck    },
  { label: "People & Access",   desc: "Learners, coaches, and volunteers", href: "/admin/people",            icon: Users          },
];

// Staff links — power
const POWER_QUICK_LINKS = [
  { label: "Programs",    desc: "Program map and health",           href: "/program",           icon: LayoutDashboard },
  { label: "Penny",       desc: "AI assistant and capabilities",    href: "/penny",             icon: Sparkles        },
  { label: "Knowledge",   desc: "Articles, briefs, and sources",    href: "/knowledge",         icon: BookOpen        },
  { label: "Operations",  desc: "Demand queue and health checks",   href: "/operations/demand", icon: Activity        },
];

// Staff links — everyday
const EVERYDAY_QUICK_LINKS = [
  { label: "Programs",       desc: "Program map and health",         href: "/program",       icon: LayoutDashboard },
  { label: "Knowledge",      desc: "Articles and knowledge briefs",  href: "/knowledge",     icon: BookOpen        },
  { label: "Collaboration",  desc: "Channels, signals, and comms",   href: "/collaboration", icon: MessageSquare   },
  { label: "Penny",          desc: "AI assistant for quick answers", href: "/penny",         icon: Zap             },
];

export default function TeamHomebase({ displayName, isStaff = false }: TeamHomebaseProps) {
  const firstName = displayName.split(" ")[0] || "there";
  const { isAdminOrAbove, isPower, isEveryday } = useTierFlags();

  // Pick the right link set
  let quickLinks = TEAM_QUICK_LINKS;
  if (isStaff) {
    if (isAdminOrAbove) {
      quickLinks = ADMIN_QUICK_LINKS;
    } else if (isPower) {
      quickLinks = POWER_QUICK_LINKS;
    } else if (isEveryday) {
      quickLinks = EVERYDAY_QUICK_LINKS;
    }
  }

  return (
    <HomebaseShell audience="team" displayName={displayName}>
      <div className="px-6 py-8 space-y-8">

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
            {quickLinks.map(({ label, desc, href, icon: Icon, external }) => (
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

        {/* Today snapshot — Tasks + Meetings side by side at 1/3 each */}
        <div className="space-y-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Today
          </p>

          <div className="grid grid-cols-3 gap-4 items-start">
            <TodayTasksCard />
            <TodayMeetingsCard />
            <MeetingNotesCard />
          </div>

          {/* Active Tasks — full width */}
          <ActiveTasksCard />
        </div>

      </div>
    </HomebaseShell>
  );
}
