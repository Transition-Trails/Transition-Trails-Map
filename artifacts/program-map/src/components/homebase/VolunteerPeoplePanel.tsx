/**
 * VolunteerPeoplePanel
 *
 * Right-side People panel for the Volunteer Homebase.
 * Shows:
 *   - Volunteer coordinator name + "Message [Coordinator] on Slack" link
 *   - Note: "Assigned on your volunteer record"
 *   - Volunteer Slack channel link (#tt-volunteers or equivalent)
 *
 * Phase 1: coordinator data read from volunteer_profiles table (local DB).
 * Null when not yet set — honest placeholder shown.
 */

import { MessageSquare, Hash, Heart } from "lucide-react";
import type { CoordinatorState } from "@/hooks/useHomebaseVolunteer";

function NoCoordinatorContent() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Volunteer Coordinator</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
            Your coordinator's contact will appear here once your volunteer record is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}

function CoordinatorCard({ state }: { state: CoordinatorState }) {
  const { coordinatorName, coordinatorSlackId, volunteerSlackChannel } = state;
  const firstName = coordinatorName?.split(" ")[0] ?? coordinatorName ?? "your coordinator";

  const slackDmUrl = coordinatorSlackId
    ? `https://slack.com/app_redirect?channel=${coordinatorSlackId}`
    : null;

  const channelUrl = volunteerSlackChannel
    ? `https://slack.com/app_redirect?channel=${volunteerSlackChannel}`
    : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>

      {/* Coordinator identity */}
      {coordinatorName && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{coordinatorName}</p>
            <p className="text-[12px] text-muted-foreground">Volunteer Coordinator</p>
          </div>
        </div>
      )}

      {/* Slack DM */}
      {slackDmUrl ? (
        <a
          href={slackDmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          Message {firstName} on Slack
        </a>
      ) : coordinatorName ? (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
          {coordinatorName}
        </div>
      ) : null}

      {/* Note */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Assigned on your volunteer record.
      </p>

      {/* Volunteer channel */}
      {channelUrl && volunteerSlackChannel && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          #{volunteerSlackChannel.replace(/^#/, "")}
        </a>
      )}
    </div>
  );
}

// ── VolunteerPeoplePanel (exported) ───────────────────────────────────────────

interface VolunteerPeoplePanelProps {
  coordinatorState: CoordinatorState | undefined;
}

export function VolunteerPeoplePanel({ coordinatorState }: VolunteerPeoplePanelProps) {
  // Show placeholder when data absent or no coordinator set
  if (!coordinatorState || !coordinatorState.coordinatorName) {
    return <NoCoordinatorContent />;
  }
  return <CoordinatorCard state={coordinatorState} />;
}
