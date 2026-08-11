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
  Plus,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { HomebaseShell } from "@/components/layout/HomebaseShell";
import { useTierFlags }  from "@/hooks/useTierFlags";
import { TodayTasksCard }    from "@/components/homebase/TodayTasksCard";
import { TodayMeetingsCard } from "@/components/homebase/TodayMeetingsCard";
import { ActiveTasksCard }   from "@/components/homebase/ActiveTasksCard";
import { MeetingNotesCard }  from "@/components/homebase/MeetingNotesCard";
import { CasesCard }         from "@/components/homebase/CasesCard";

interface TeamHomebaseProps {
  displayName: string;
  /** True when rendered for a staff user (no homebase audience). */
  isStaff?: boolean;
}

// Generic links for team@ audience members
const TEAM_QUICK_LINKS = [
  { label: "Programs",  href: "/program",                    icon: LayoutDashboard },
  { label: "People",    href: "/admin/people",               icon: Users           },
  { label: "Calendar",  href: "https://calendar.google.com", icon: CalendarDays,   external: true },
  { label: "Slack",     href: "https://slack.com",           icon: MessageSquare,  external: true },
];

// Staff links — admin / superadmin
const ADMIN_QUICK_LINKS = [
  { label: "Operations",   href: "/operations/demand",      icon: Activity    },
  { label: "Penny Studio", href: "/penny/prompts",          icon: Sparkles    },
  { label: "Readiness",    href: "/admin/phase1-readiness", icon: ShieldCheck },
  { label: "People",       href: "/admin/people",           icon: Users       },
];

// Staff links — power
const POWER_QUICK_LINKS = [
  { label: "Programs",   href: "/program",           icon: LayoutDashboard },
  { label: "Penny",      href: "/penny",             icon: Sparkles        },
  { label: "Knowledge",  href: "/knowledge",         icon: BookOpen        },
  { label: "Operations", href: "/operations/demand", icon: Activity        },
];

// Staff links — everyday
const EVERYDAY_QUICK_LINKS = [
  { label: "Programs",      href: "/program",       icon: LayoutDashboard },
  { label: "Knowledge",     href: "/knowledge",     icon: BookOpen        },
  { label: "Collaboration", href: "/collaboration", icon: MessageSquare   },
  { label: "Penny",         href: "/penny",         icon: Zap             },
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
      <div className="px-6 py-8 space-y-6">

        {/* Greeting + Submit a Case — same row */}
        <div className="flex items-start justify-between gap-4">
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

          {/* Submit a Case */}
          <a
            href="https://transitiontrails.my.salesforce.com/500/e"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm mt-1"
          >
            <Plus className="w-4 h-4" />
            Submit a Case
          </a>
        </div>

        {/* Quick access — compact horizontal chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickLinks.map(({ label, href, icon: Icon, external }) =>
            external ? (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-sm text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
                <ExternalLink className="w-3 h-3 text-muted-foreground/60 ml-0.5" />
              </a>
            ) : (
              <Link
                key={label}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-sm text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                {label}
              </Link>
            )
          )}
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

          {/* Active Tasks + Open Cases — side by side, 50/50 */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <ActiveTasksCard />
            <CasesCard />
          </div>
        </div>

      </div>
    </HomebaseShell>
  );
}
