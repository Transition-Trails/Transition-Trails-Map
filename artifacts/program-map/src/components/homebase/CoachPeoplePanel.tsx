/**
 * CoachPeoplePanel
 *
 * Right-side People panel content for the Coach Homebase.
 *
 * Shows:
 *   - Lead coach name + "Message [Lead] on Slack" link
 *   - Counter-sign protocol note for assistant-level coaches
 *   - Cohort Slack channel link
 *
 * Phase 1: Lead info not yet in SF — shows placeholder until provisioned.
 */

import { Shield, MessageSquare, Hash, Users } from "lucide-react";
import type { LeadState, CoachLevel } from "@/hooks/useHomebaseCoach";

// ── No-lead fallback ───────────────────────────────────────────────────────────

function NoLeadContent({ coachLevel }: { coachLevel: CoachLevel }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Lead coach</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">
            Lead contact will appear once coaching assignments are configured.
          </p>
        </div>
      </div>

      {coachLevel === "assistant" && <AssistantNote />}
    </div>
  );
}

// ── Counter-sign note (assistants only) ────────────────────────────────────────

function AssistantNote() {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 flex items-start gap-2.5">
      <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-[12px] text-amber-800 leading-relaxed">
        As Coach's Assistant, your draft verdicts need your lead coach's countersign before they take effect.
      </p>
    </div>
  );
}

// ── Lead card ──────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  cohortSlackChannel,
  coachLevel,
}: {
  lead:               NonNullable<LeadState["lead"]>;
  cohortSlackChannel: string | null;
  coachLevel:         CoachLevel;
}) {
  const firstName = lead.name.split(" ")[0] ?? lead.name;

  const slackDmUrl = lead.slackUserId
    ? `https://slack.com/app_redirect?channel=${lead.slackUserId}`
    : null;

  const channelUrl = cohortSlackChannel
    ? `https://slack.com/app_redirect?channel=${cohortSlackChannel}`
    : null;

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Your Team
      </p>

      {/* Lead identity */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-4 h-4 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{lead.name}</p>
          <p className="text-[12px] text-muted-foreground">Lead coach</p>
        </div>
      </div>

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
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
          <MessageSquare className="w-3.5 h-3.5" />
          {lead.email}
        </div>
      )}

      {/* Cohort channel */}
      {channelUrl && cohortSlackChannel && (
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <Hash className="w-3.5 h-3.5 text-muted-foreground" />
          #{cohortSlackChannel.replace(/^#/, "")}
        </a>
      )}

      {/* Counter-sign note for assistants */}
      {coachLevel === "assistant" && <AssistantNote />}
    </div>
  );
}

// ── CoachPeoplePanel (exported) ────────────────────────────────────────────────

interface CoachPeoplePanelProps {
  leadState:  LeadState | undefined;
  coachLevel: CoachLevel;
}

export function CoachPeoplePanel({ leadState, coachLevel }: CoachPeoplePanelProps) {
  if (!leadState || !leadState.lead) {
    return <NoLeadContent coachLevel={coachLevel} />;
  }

  return (
    <LeadCard
      lead={leadState.lead}
      cohortSlackChannel={leadState.cohortSlackChannel}
      coachLevel={coachLevel}
    />
  );
}
