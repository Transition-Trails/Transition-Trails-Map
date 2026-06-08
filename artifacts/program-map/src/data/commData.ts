// ── Communications & Collaboration — Prototype Data ───────────────────────────
// Providers in scope: Slack (community/program), Google Chat (client/project),
// Google Calendar (operational timing). Teams and Email are not in scope.

export interface CommProvider {
  id: string;
  name: string;
  status: 'planned-primary' | 'future' | 'future-collab' | 'active';
  statusLabel: string;
  icon: string;
  description: string;
  purpose: string;
  primaryUse: string;
  whyItMatters: string;
  capabilities: string[];
  owner: string;
  pennyCapability: string;
  setupNotes: string;
}

export interface CommChannel {
  id: string;
  name: string;
  provider: string;
  providerStatus: 'planned' | 'future' | 'active';
  type: 'team' | 'alert' | 'digest' | 'ops' | 'space' | 'client-space';
  audience: string;
  purpose: string;
  whyItMatters: string;
  status: 'planned' | 'active' | 'future';
  relatedProgram: string;
  pennyCapability: string;
  owner: string;
  demandEvent: string;
}

export interface CommBroadcast {
  id: string;
  name: string;
  type: 'reminder' | 'prompt' | 'nudge' | 'announcement' | 'celebration';
  trigger: string;
  audience: string;
  channel: string;
  frequency: string;
  purpose: string;
  whyItMatters: string;
  pennyCapability: string;
  relatedProgram: string;
  owner: string;
  status: 'planned' | 'draft' | 'active';
  example: string;
}

export interface CommWeeklyBrief {
  id: string;
  name: string;
  audience: string;
  sections: string[];
  frequency: string;
  channel: string;
  owner: string;
  status: 'planned' | 'draft' | 'active';
  purpose: string;
  whyItMatters: string;
  relatedDemandEvent: string;
}

export interface CommNotification {
  id: string;
  event: string;
  source: string;
  destination: string;
  destinationLabel: string;
  secondaryDestination?: string;
  audience: string;
  owner: string;
  purpose: string;
  whyItMatters: string;
  pennyCapability: string;
  relatedDemandEvent: string;
  status: 'planned' | 'active';
}

export interface CommTemplate {
  id: string;
  name: string;
  provider: string;
  audience: string;
  triggerEvent: string;
  destination: string;
  owner: string;
  status: 'draft' | 'approved' | 'active';
  lastReviewed: string;
  purpose: string;
  whyItMatters: string;
  pennyCapability: string;
  relatedDemandEvent: string;
  relatedProgram: string;
}

export interface CommCalendarCategory {
  id: string;
  name: string;
  purpose: string;
  whyItMatters: string;
  events: string[];
  relatedChannels: string[];
  pennyCapability: string;
  owner: string;
  status: 'planned' | 'future';
}

// ── Providers ────────────────────────────────────────────────────────────────
// Scope: Slack, Google Chat, Google Calendar only.

export const commProviders: CommProvider[] = [
  {
    id: 'slack',
    name: 'Slack',
    status: 'planned-primary',
    statusLabel: 'Planned · Primary Prototype',
    icon: '#',
    description: 'Slack is the primary community and program channel for learners, coaches, and the operations team. It carries Penny nudges, Trail Quests, Trail Wins, cohort conversations, office hours, celebrations, and internal ops alerts.',
    purpose: 'Community and program messaging — the channel where learners engage, coaches respond, and Penny is most active.',
    primaryUse: 'Learner cohorts, coaches, Penny broadcasts, internal ops alerts, Trail Wins, reflections',
    whyItMatters: 'Slack is where the learning community lives. Wiring Trail OS and Penny into Slack means nudges, milestones, and briefs arrive in the same place learners already show up — no context-switching required.',
    capabilities: ['Penny Broadcasts', 'Cohort Channels', 'Coach Alerts', 'Ops Notifications', 'Trail Wins', 'Trail Quests', 'Office Hours', 'Weekly Briefs'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Nudging',
    setupNotes: 'Slack workspace connection, bot token, and channel permissions required. Planned Q3 2025.',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    status: 'future',
    statusLabel: 'Future Supported',
    icon: 'G',
    description: 'Google Chat serves as the client and project collaboration channel — connecting Transition Trails with nonprofit clients, Digital Compass participants, executive sponsors, and steering committees. Client-facing Penny insights, project updates, and change management communications route through Google Chat Spaces.',
    purpose: 'Client and project collaboration — the channel through which Transition Trails works with external clients and employer partners.',
    primaryUse: 'Nonprofit client spaces, Digital Compass, executive sponsors, steering committees, client-facing Penny insights',
    whyItMatters: 'Nonprofit clients and employer partners in the Google Workspace ecosystem already use Chat. A Google Chat integration lets Transition Trails deliver project updates, client briefs, and Penny insights without asking clients to adopt a new tool.',
    capabilities: ['Client Spaces', 'Digital Compass Channel', 'Executive Sponsor Updates', 'Steering Committee Briefs', 'Change Management Posts', 'Client Penny Insights'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Progress Summary',
    setupNotes: 'Requires Google Chat API setup, OAuth app review, and Space provisioning per client. Planned post-Slack adapter.',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    status: 'future-collab',
    statusLabel: 'Future · Collaboration Source',
    icon: '📅',
    description: 'Google Calendar is the operational timing layer for Trail OS. Cohort starts, sprint reviews, office hours, mentor sessions, stakeholder interviews, UAT sessions, training events, leadership reviews, and weekly brief schedules are all coordinated through Calendar — and surfaced to Penny and Trail OS for trigger-based communications.',
    purpose: 'Operational timing source — Calendar tells Trail OS and Penny when things happen so communications can be triggered at the right moment.',
    primaryUse: 'Cohort starts, sprint reviews, office hours, UAT sessions, stakeholder interviews, leadership reviews, Penny reminder schedules',
    whyItMatters: "Without a Calendar integration, Trail OS sends reminders and briefs on fixed schedules that don't reflect what's actually happening. Calendar integration means Penny knows when a UAT session is tomorrow, when a cohort starts next week, and when a brief is due — making communications timing-aware rather than time-based.",
    capabilities: ['Program Calendar', 'Cohort Calendar', 'Operations Calendar', 'Client Calendar', 'Penny Reminder Schedule'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Nudging',
    setupNotes: 'Requires Google Calendar API, OAuth scopes, and calendar sharing configuration. Planned after Google Chat adapter.',
  },
];

// ── Channels & Spaces ─────────────────────────────────────────────────────────

export const commChannels: CommChannel[] = [
  // ── Slack — Community & Program Channels ──
  {
    id: 'guided-trail-cohort',
    name: '#guided-trail-cohort',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'team',
    audience: 'Guided Trail Learners',
    purpose: 'Primary cohort channel for Guided Trail learners. Penny broadcasts Trail Talk reminders, Trail Quest prompts, Trail Win celebrations, assignment nudges, and office hours announcements here.',
    whyItMatters: 'Cohort channels create a shared learning community where Penny-driven engagement and peer accountability reinforce each other at the program level.',
    status: 'planned',
    relatedProgram: 'Guided Trail',
    pennyCapability: 'Learner Nudging',
    owner: 'Program Manager',
    demandEvent: 'Cohort Milestone Reached',
  },
  {
    id: 'guided-trail-coaches',
    name: '#guided-trail-coaches',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'team',
    audience: 'Guided Trail Coaches',
    purpose: 'Private channel for Guided Trail coaches. Receives Penny confidence risk alerts, learner progress digests, Trail Quest completion flags, and coach-specific weekly briefs.',
    whyItMatters: 'Coaches need a private, low-noise channel where Penny surfaces at-risk learners before problems escalate. Separating coach signals from the cohort channel reduces noise for both audiences.',
    status: 'planned',
    relatedProgram: 'Guided Trail',
    pennyCapability: 'Confidence Scoring',
    owner: 'Coach Lead',
    demandEvent: 'Learner Confidence Risk',
  },
  {
    id: 'trailos-ops',
    name: '#trailos-ops',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'ops',
    audience: 'Operations Team',
    purpose: 'Internal ops channel receiving Trail OS system notifications: new demand submissions, case escalations, automation health alerts, and weekly ops briefs.',
    whyItMatters: 'Centralises Trail OS operational signals so the ops team can act on demand and system health events without polling multiple tools.',
    status: 'planned',
    relatedProgram: 'All Programs',
    pennyCapability: 'Demand Intelligence',
    owner: 'Operations Lead',
    demandEvent: 'New Demand Submitted',
  },
  {
    id: 'penny-alerts',
    name: '#penny-alerts',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'alert',
    audience: 'Operations Team, Coach Lead',
    purpose: 'Dedicated alert channel for high-priority Penny signals: low confidence scores, unanswered queries, quality flags, and model drift indicators.',
    whyItMatters: 'Separating Penny alerts from general ops noise ensures critical AI quality signals are seen and acted on promptly.',
    status: 'planned',
    relatedProgram: 'All Programs',
    pennyCapability: 'Response Quality',
    owner: 'Penny Lead',
    demandEvent: 'Learner Confidence Risk',
  },
  {
    id: 'leadership-digest',
    name: '#leadership-digest',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'digest',
    audience: 'Leadership Team',
    purpose: 'Weekly executive brief channel. Receives the auto-generated Leadership Weekly Brief covering Program Health, Learner Insights, Coach Insights, Penny Recommendations, Demand Signals, and Knowledge Gaps.',
    whyItMatters: 'Leadership needs a single weekly read-out from Trail OS and Penny — not a collection of separate updates from multiple people.',
    status: 'planned',
    relatedProgram: 'All Programs',
    pennyCapability: 'Learner Progress Summary',
    owner: 'Operations Lead',
    demandEvent: 'Weekly Brief Generated',
  },
  // ── Google Chat — Client & Project Spaces ──
  {
    id: 'digital-compass-client',
    name: 'Digital Compass — Client Space',
    provider: 'Google Chat',
    providerStatus: 'future',
    type: 'client-space',
    audience: 'Digital Compass Participants, Employer Partners',
    purpose: 'Google Chat Space for Digital Compass employer partners and client-side participants. Receives project updates, Penny learning summaries, change management posts, and UAT session confirmations.',
    whyItMatters: 'Digital Compass participants are employer-side — they live in Google Workspace. A Google Chat Space means project updates and Penny insights arrive in their existing environment without requiring them to access Trail OS directly.',
    status: 'future',
    relatedProgram: 'Digital Compass',
    pennyCapability: 'Learner Progress Summary',
    owner: 'Program Manager',
    demandEvent: 'Digital Compass Project Update',
  },
  {
    id: 'nonprofit-partner-hub',
    name: 'Nonprofit Partner Hub',
    provider: 'Google Chat',
    providerStatus: 'future',
    type: 'client-space',
    audience: 'Nonprofit Client Leads, Program Managers',
    purpose: 'Shared Google Chat Space for nonprofit client organisation leads. Receives program health updates, cohort progress summaries, and client-facing Penny insights relevant to their organisation.',
    whyItMatters: 'Nonprofit clients need visibility into program outcomes without logging into Trail OS. A dedicated Chat Space provides a structured channel for client-facing communication that keeps clients informed and engaged.',
    status: 'future',
    relatedProgram: 'All Programs',
    pennyCapability: 'Learner Progress Summary',
    owner: 'Operations Lead',
    demandEvent: 'Client Relationship Update',
  },
  {
    id: 'exec-sponsors-space',
    name: 'Executive Sponsors',
    provider: 'Google Chat',
    providerStatus: 'future',
    type: 'client-space',
    audience: 'Executive Sponsors, Steering Committee',
    purpose: 'Google Chat Space for executive sponsors and steering committee members. Receives the executive weekly brief, strategic program updates, and high-level Penny insights from Trail OS.',
    whyItMatters: 'Executive sponsors and steering committee members need high-level visibility into program performance without receiving operational noise. A dedicated Space filters signal from noise and maintains a professional client-facing channel.',
    status: 'future',
    relatedProgram: 'All Programs',
    pennyCapability: 'Learner Progress Summary',
    owner: 'Operations Lead',
    demandEvent: 'Weekly Brief Generated',
  },
];

// ── Calendar Categories ───────────────────────────────────────────────────────

export const commCalendarCategories: CommCalendarCategory[] = [
  {
    id: 'program-calendar',
    name: 'Program Calendar',
    purpose: 'Tracks program-level lifecycle events — cohort starts, graduation dates, assessment windows, and program launch milestones. Trail OS uses these events to trigger communications at the right moment.',
    whyItMatters: 'Cohort start dates, graduation days, and assessment windows are the highest-stakes communication moments in the program lifecycle. Without Calendar integration, Trail OS can only send time-based reminders — not event-aware ones.',
    events: [
      'Cohort Start Date',
      'Cohort Graduation',
      'Assessment Window Opens',
      'Assessment Window Closes',
      'Program Launch',
      'Pre-Enrollment Opens',
      'Waitlist Decision Date',
      'Program Review Meeting',
    ],
    relatedChannels: ['#guided-trail-cohort', '#trailos-ops'],
    pennyCapability: 'Learner Nudging',
    owner: 'Program Manager',
    status: 'planned',
  },
  {
    id: 'cohort-calendar',
    name: 'Cohort Calendar',
    purpose: 'Tracks recurring cohort-level events — Trail Talks, sprint reviews, office hours, Trail Quest deadlines, mentor sessions, and reflection checkpoints. Penny uses these to generate timely reminders and prompts.',
    whyItMatters: 'Cohort schedules are dense and variable. Penny reminders anchored to actual Calendar events are far more useful than fixed-schedule reminders that fire regardless of what\'s happening in the cohort that week.',
    events: [
      'Trail Talk Session',
      'Sprint Review',
      'Office Hours (Coach)',
      'Trail Quest Deadline',
      'Mentor Session',
      'Peer Reflection Check-In',
      'Learning Sprint Start',
      'Learning Sprint Close',
    ],
    relatedChannels: ['#guided-trail-cohort', '#guided-trail-coaches'],
    pennyCapability: 'Learner Nudging',
    owner: 'Program Manager',
    status: 'planned',
  },
  {
    id: 'operations-calendar',
    name: 'Operations Calendar',
    purpose: 'Tracks internal operations rhythms — weekly brief schedules, team syncs, training events, ops reviews, and leadership check-ins. Trail OS uses these to schedule and dispatch executive briefs and ops notifications.',
    whyItMatters: 'The weekly brief is only useful if it arrives at the right time — before the leadership review, not after it. An Operations Calendar lets Trail OS schedule brief generation and dispatch around actual meetings.',
    events: [
      'Weekly Executive Brief — Generation',
      'Weekly Executive Brief — Dispatch',
      'Ops Team Sync',
      'Leadership Review',
      'Trail OS Health Review',
      'Penny Intelligence Review',
      'Team Training Session',
      'Quarterly Planning Session',
    ],
    relatedChannels: ['#leadership-digest', '#trailos-ops'],
    pennyCapability: 'Demand Intelligence',
    owner: 'Operations Lead',
    status: 'planned',
  },
  {
    id: 'client-calendar',
    name: 'Client Calendar',
    purpose: 'Tracks client-facing engagement events — UAT sessions, stakeholder interviews, steering committee meetings, change management checkpoints, and project update calls. These events trigger Google Chat notifications and Penny brief updates for the relevant client space.',
    whyItMatters: 'Client calendar events are the moments when Transition Trails visibility and preparedness matter most. Automating pre-event summaries and post-event follow-ups through Google Chat means the team shows up prepared without manual scheduling.',
    events: [
      'UAT Session',
      'Stakeholder Interview',
      'Steering Committee Meeting',
      'Change Management Checkpoint',
      'Project Update Call',
      'Client Onboarding Session',
      'Employer Partner Review',
      'Digital Compass Sprint Demo',
    ],
    relatedChannels: ['Digital Compass — Client Space', 'Nonprofit Partner Hub', 'Executive Sponsors'],
    pennyCapability: 'Learner Progress Summary',
    owner: 'Program Manager',
    status: 'future',
  },
  {
    id: 'penny-reminder-schedule',
    name: 'Penny Reminder Schedule',
    purpose: 'The mapping layer between Calendar events and Penny broadcast triggers. When a calendar event is added, the Penny Reminder Schedule determines what Penny sends, to whom, when, and through which channel — making Penny\'s broadcasts calendar-aware.',
    whyItMatters: 'Without a reminder schedule tied to Calendar, Penny sends reminders based on fixed time offsets. With it, Penny knows to send a Trail Talk reminder only when a Trail Talk is actually scheduled — not every Thursday at 11am regardless of the cohort schedule.',
    events: [
      'Trail Talk Reminder (48h pre-event)',
      'Sprint Review Prep Nudge (24h pre)',
      'Office Hours Booking Prompt (72h pre)',
      'UAT Session Confirmation (24h pre)',
      'Weekly Brief Dispatch (Calendar-triggered)',
      'Cohort Start Welcome Sequence',
      'Assessment Window Alert',
      'Post-Event Reflection Prompt',
    ],
    relatedChannels: ['#guided-trail-cohort', '#guided-trail-coaches', 'Digital Compass — Client Space'],
    pennyCapability: 'Learner Nudging',
    owner: 'Penny Lead',
    status: 'planned',
  },
];

// ── Penny Broadcasts ──────────────────────────────────────────────────────────

export const commBroadcasts: CommBroadcast[] = [
  {
    id: 'trail-talk-reminder',
    name: 'Trail Talk Reminder',
    type: 'reminder',
    trigger: '48 hours before Trail Talk session (Calendar-aware)',
    audience: 'Active cohort learners',
    channel: '#guided-trail-cohort',
    frequency: 'Per session',
    purpose: 'Reminds learners of an upcoming Trail Talk session with time, topic, and what to prepare — triggered by the Cohort Calendar, not a fixed schedule.',
    whyItMatters: 'Learners with variable schedules miss sessions when reminders rely on calendar invites alone. A Penny-sent reminder in the cohort channel reduces no-shows and increases preparation.',
    pennyCapability: 'Learner Nudging',
    relatedProgram: 'Guided Trail',
    owner: 'Program Manager',
    status: 'planned',
    example: '"Hey cohort 👋 Trail Talk is this Thursday at 11am — topic: Resume Translation. Penny suggests reviewing your skills inventory beforehand. See you there!"',
  },
  {
    id: 'trail-win-prompt',
    name: 'Trail Win Prompt',
    type: 'prompt',
    trigger: 'Learner completes a sprint milestone',
    audience: 'Individual learner + cohort channel',
    channel: '#guided-trail-cohort',
    frequency: 'Per milestone completion',
    purpose: 'Celebrates a learner\'s sprint completion publicly in the cohort channel and prompts them to share their Trail Win.',
    whyItMatters: 'Public recognition drives cohort motivation and creates social proof that progress is happening. Trail Wins also feed Penny\'s learner progress summary.',
    pennyCapability: 'Learner Progress Summary',
    relatedProgram: 'All Programs',
    owner: 'Penny Lead',
    status: 'planned',
    example: '"🎉 Alex just completed Sprint 3: Project Planning — that\'s 3 of 6 milestones done! Drop a Trail Win in the thread — what\'s the biggest thing you learned this sprint?"',
  },
  {
    id: 'cohort-nudge',
    name: 'Cohort Engagement Nudge',
    type: 'nudge',
    trigger: 'Learner inactive for 5+ days',
    audience: 'Individual learner (direct message)',
    channel: 'Direct message via Slack',
    frequency: 'Per engagement gap',
    purpose: 'Penny sends a private, personalised nudge to a learner who has been inactive for 5+ days — checking in, offering a re-entry point, and surfacing their next task.',
    whyItMatters: 'Engagement gaps are the earliest signal of dropout risk. A timely private nudge from Penny re-activates learners before a 5-day gap becomes a permanent departure.',
    pennyCapability: 'Confidence Scoring',
    relatedProgram: 'All Programs',
    owner: 'Penny Lead',
    status: 'planned',
    example: '"Hey Jordan — it\'s been a few days! Your next task is the Employer Research checklist. Penny is here if you want to pick up where you left off. What\'s getting in the way?"',
  },
  {
    id: 'trail-quest-prompt',
    name: 'Trail Quest Prompt',
    type: 'prompt',
    trigger: 'Trail Quest assigned or deadline approaching',
    audience: 'Assigned learner',
    channel: '#guided-trail-cohort + Direct message',
    frequency: 'Per Trail Quest assignment and at 48h deadline',
    purpose: 'Announces a new Trail Quest to the cohort and sends a personalised reminder to the assigned learner as the deadline approaches.',
    whyItMatters: 'Trail Quests are optional but high-value. Without prompts, they go unnoticed. A cohort announcement plus a personalised deadline nudge converts awareness into action.',
    pennyCapability: 'Learner Nudging',
    relatedProgram: 'All Programs',
    owner: 'Program Manager',
    status: 'planned',
    example: '"⚡ New Trail Quest: Informational Interview — reach out to one professional in your target field this week. Drop your reflection in the thread when you\'re done!"',
  },
  {
    id: 'office-hours-announcement',
    name: 'Office Hours Announcement',
    type: 'announcement',
    trigger: 'Coach office hours added to Cohort Calendar',
    audience: 'Active cohort learners',
    channel: '#guided-trail-cohort',
    frequency: 'Per office hours session (Calendar-triggered)',
    purpose: 'Announces upcoming coach office hours in the cohort channel with booking link and topic focus — triggered by a Calendar event, not a manual post.',
    whyItMatters: 'Office hours attendance is low when announcements depend on coaches posting manually. A Calendar-triggered Penny announcement converts passive awareness into scheduled time.',
    pennyCapability: 'Learner Nudging',
    relatedProgram: 'Guided Trail',
    owner: 'Coach Lead',
    status: 'planned',
    example: '"📅 Coach Marisol is hosting office hours this Friday 2–4pm — topic: Interview Prep. Book your slot here: [link]. First come, first served — 6 spots available."',
  },
  {
    id: 'celebration-post',
    name: 'Cohort Celebration Post',
    type: 'celebration',
    trigger: 'Learner achieves placement or program completion',
    audience: 'Full cohort channel',
    channel: '#guided-trail-cohort',
    frequency: 'Per placement/completion',
    purpose: 'Penny posts a cohort-wide celebration when a learner achieves placement or completes the program — with their permission.',
    whyItMatters: 'Cohort placement announcements are the most powerful retention signal. They show undecided learners that the program delivers outcomes — reinforcing commitment at the critical midpoint.',
    pennyCapability: 'Learner Progress Summary',
    relatedProgram: 'All Programs',
    owner: 'Operations Lead',
    status: 'planned',
    example: '"🏆 Big news from the cohort — Jamie just landed a role as a Project Coordinator at City Health Network! This is what Trail looks like in action. Congratulations Jamie!"',
  },
];

// ── Weekly Briefs ─────────────────────────────────────────────────────────────

export const commWeeklyBriefs: CommWeeklyBrief[] = [
  {
    id: 'executive-weekly-brief',
    name: 'Executive Weekly Brief',
    audience: 'Leadership Team',
    sections: [
      'Program Health — cohort status, enrollment, completion, and flags for each active program',
      'Learner Insights — active learners, engagement rate, at-risk count, and Penny confidence average',
      'Coach Insights — active coaches, session volume, learner-coach ratio, and office hours utilisation',
      'Penny Recommendations — top AI recommendations surfaced this week across all learners',
      'Demand Signals — new intake submissions, open cases, epics in-flight, and roadmap movement',
      'Knowledge Gaps — source documents flagged for review, low-confidence areas, and missing coverage',
    ],
    frequency: 'Weekly — Calendar-triggered, Friday 4pm',
    channel: '#leadership-digest (Slack) · Executive Sponsors (Google Chat)',
    owner: 'Operations Lead',
    status: 'planned',
    purpose: 'Auto-generated weekly summary of the full Trail OS operating picture — delivered by Penny to both the Slack leadership channel and the Google Chat Executive Sponsors space every Friday, triggered by the Operations Calendar.',
    whyItMatters: 'Leadership currently receives program updates through ad-hoc check-ins and manual reports. The Executive Weekly Brief automates this into a single, consistent Friday read-out from Trail OS and Penny — delivered to wherever each audience works.',
    relatedDemandEvent: 'Weekly Brief Generated',
  },
  {
    id: 'coach-weekly-brief',
    name: 'Coach Weekly Brief',
    audience: 'Program Coaches',
    sections: [
      'My Learners — learner status, engagement, and Penny confidence scores for each assigned learner',
      'At-Risk Signals — learners with low engagement or confidence requiring coach outreach',
      'This Week\'s Sessions — upcoming Trail Talks and office hours I\'m facilitating (from Cohort Calendar)',
      'Assignments Due — learner assignments due this week requiring review or grading',
      'Penny Flags — content quality flags or learner queries Penny could not resolve',
    ],
    frequency: 'Weekly — Monday 8am (Calendar-triggered)',
    channel: '#guided-trail-coaches',
    owner: 'Coach Lead',
    status: 'planned',
    purpose: 'Personalised weekly brief for each coach showing their learner caseload, at-risk signals, upcoming Calendar sessions, and Penny flags — delivered Monday morning before the week begins.',
    whyItMatters: 'Coaches currently have no single view of their weekly workload. A Monday morning brief from Penny — anchored to the actual Cohort Calendar — means coaches start the week with a clear picture of who needs attention and what sessions are coming.',
    relatedDemandEvent: 'Learner Confidence Risk',
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const commNotifications: CommNotification[] = [
  {
    id: 'cohort-reminder',
    event: 'Cohort Reminder (Trail Talk / Sprint Review)',
    source: 'Google Calendar — Cohort Calendar',
    destination: '#guided-trail-cohort',
    destinationLabel: 'Cohort Slack Channel',
    secondaryDestination: 'Google Calendar · Cohort Calendar event',
    audience: 'Active Cohort Learners',
    owner: 'Program Manager',
    purpose: 'When a Trail Talk or Sprint Review is added to the Cohort Calendar, Penny sends a reminder to the cohort Slack channel 48h before — and the event appears in learners\' Calendar.',
    whyItMatters: 'Combining a Slack nudge with a Calendar event means learners get two touchpoints: a social reminder in their community channel and a calendar block to protect the time.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Trail Talk Scheduled',
    status: 'planned',
  },
  {
    id: 'client-uat-session',
    event: 'Client UAT Session',
    source: 'Google Calendar — Client Calendar',
    destination: 'Digital Compass — Client Space',
    destinationLabel: 'Google Chat Client Space',
    secondaryDestination: 'Google Calendar · Client Calendar event',
    audience: 'Digital Compass Participants, Employer Partners',
    owner: 'Program Manager',
    purpose: 'When a UAT session is added to the Client Calendar, Penny sends a preparation summary to the Digital Compass Google Chat Space 24h before — and the session appears in the client\'s Calendar.',
    whyItMatters: 'UAT sessions are the highest-stakes client touchpoints. A Penny-generated preparation summary in the client\'s Chat Space — tied to their Calendar event — signals professionalism and reduces missed sessions.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Digital Compass Project Update',
    status: 'planned',
  },
  {
    id: 'weekly-executive-brief',
    event: 'Weekly Executive Brief',
    source: 'Google Calendar — Operations Calendar',
    destination: '#leadership-digest',
    destinationLabel: 'Slack Leadership Channel',
    secondaryDestination: 'Google Chat · Executive Sponsors Space · Google Calendar schedule',
    audience: 'Leadership Team, Executive Sponsors',
    owner: 'Operations Lead',
    purpose: 'Every Friday at 4pm, the Operations Calendar triggers Trail OS to generate and dispatch the Executive Weekly Brief — to the Slack leadership channel and the Google Chat Executive Sponsors space simultaneously.',
    whyItMatters: 'Calendar-triggering the brief means it fires before leadership reviews, not at a fixed time that may not align with meetings. It also ensures the same brief reaches both the internal leadership team (Slack) and external sponsors (Google Chat).',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Weekly Brief Generated',
    status: 'planned',
  },
  {
    id: 'learner-confidence-risk',
    event: 'Learner Confidence Risk',
    source: 'Penny Command Center — Confidence Score',
    destination: '#guided-trail-coaches',
    destinationLabel: 'Coaches Slack Channel',
    audience: 'Program Coaches',
    owner: 'Penny Lead',
    purpose: 'Alerts the coaches Slack channel when Penny detects a learner confidence score drop below threshold — with learner name, score, and recommended action.',
    whyItMatters: 'Confidence score drops are the earliest predictor of dropout risk. A coach alert triggered by Penny — rather than a weekly report — creates the window for intervention before engagement collapses.',
    pennyCapability: 'Confidence Scoring',
    relatedDemandEvent: 'Learner Confidence Risk',
    status: 'planned',
  },
  {
    id: 'new-demand-submitted',
    event: 'New Demand Submitted',
    source: 'Demand Management — Intake',
    destination: '#trailos-ops',
    destinationLabel: 'Ops Slack Channel',
    audience: 'Operations Team',
    owner: 'Operations Lead',
    purpose: 'Notifies the ops Slack channel when a new intake submission is received — with applicant name, program of interest, and submission timestamp.',
    whyItMatters: 'Intake submissions currently sit in Salesforce until an ops team member checks the queue. An immediate Slack notification ensures same-day follow-up and reduces intake-to-response time.',
    pennyCapability: 'Demand Intelligence',
    relatedDemandEvent: 'Intake Submission',
    status: 'planned',
  },
  {
    id: 'digital-compass-project-update',
    event: 'Digital Compass Project Update',
    source: 'Trail OS — Program Delivery',
    destination: 'Digital Compass — Client Space',
    destinationLabel: 'Google Chat Client Space',
    audience: 'Digital Compass Participants, Employer Partners',
    owner: 'Program Manager',
    purpose: 'Sends a project update to the Digital Compass Google Chat Space when a sprint is completed, a milestone is reached, or a project status changes in Trail OS.',
    whyItMatters: 'Employer partners in Digital Compass need visibility into project progress without logging into Trail OS. A Google Chat notification in their existing workspace keeps them informed at the right cadence without overwhelming them.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Digital Compass Project Update',
    status: 'planned',
  },
];

// ── Message Templates ─────────────────────────────────────────────────────────

export const commTemplates: CommTemplate[] = [
  {
    id: 'trail-talk-reminder-tpl',
    name: 'Trail Talk Reminder',
    provider: 'Slack',
    audience: 'Active Cohort Learners',
    triggerEvent: '48h before Trail Talk (Calendar-triggered)',
    destination: '#guided-trail-cohort',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Standard reminder template for upcoming Trail Talk sessions with dynamic session name, date, time, and topic fields — fired by the Cohort Calendar.',
    whyItMatters: 'Standardising the reminder format ensures learners always receive the same level of detail regardless of who configures the session. Calendar-triggering means it only fires when a session exists.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Trail Talk Scheduled',
    relatedProgram: 'Guided Trail',
  },
  {
    id: 'trail-quest-prompt-tpl',
    name: 'Trail Quest Prompt',
    provider: 'Slack',
    audience: 'Active Cohort Learners',
    triggerEvent: 'Trail Quest assigned in Trail OS',
    destination: '#guided-trail-cohort',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Cohort announcement and individual nudge template for new Trail Quest assignments — with dynamic quest name, objective, deadline, and reflection prompt.',
    whyItMatters: 'Trail Quests require a cohort-level announcement to build social momentum plus an individual nudge as the deadline approaches. One template handles both via two send events.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Trail Quest Assigned',
    relatedProgram: 'All Programs',
  },
  {
    id: 'confidence-risk-alert-tpl',
    name: 'Learner Confidence Risk Alert',
    provider: 'Slack',
    audience: 'Program Coaches',
    triggerEvent: 'Penny confidence score below threshold',
    destination: '#guided-trail-coaches',
    owner: 'Penny Lead',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Coach alert template surfacing learner name, current confidence score, contributing factors, and Penny\'s recommended next action.',
    whyItMatters: 'A structured alert with recommended action removes ambiguity — coaches know exactly what to do with a confidence risk notification without further investigation.',
    pennyCapability: 'Confidence Scoring',
    relatedDemandEvent: 'Learner Confidence Risk',
    relatedProgram: 'All Programs',
  },
  {
    id: 'weekly-exec-brief-tpl',
    name: 'Executive Weekly Brief',
    provider: 'Slack + Google Chat',
    audience: 'Leadership Team, Executive Sponsors',
    triggerEvent: 'Weekly — Operations Calendar, Friday 4pm',
    destination: '#leadership-digest · Executive Sponsors (Google Chat)',
    owner: 'Operations Lead',
    status: 'approved',
    lastReviewed: 'Jun 2025',
    purpose: 'Structured weekly brief template covering all six brief sections — auto-populated by Trail OS and Penny from live data and dispatched to both Slack and Google Chat simultaneously.',
    whyItMatters: 'A consistent format means leadership can scan the brief in under 3 minutes every Friday. Dual delivery (Slack + Google Chat) ensures the brief reaches internal and external stakeholders in their preferred tool.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Weekly Brief Generated',
    relatedProgram: 'All Programs',
  },
  {
    id: 'uat-session-prep-tpl',
    name: 'UAT Session Preparation Summary',
    provider: 'Google Chat',
    audience: 'Digital Compass Participants, Employer Partners',
    triggerEvent: '24h before UAT session (Client Calendar-triggered)',
    destination: 'Digital Compass — Client Space',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Client-facing preparation summary for UAT sessions — sent to the Digital Compass Google Chat Space 24h before the session with agenda, test scope, and access links.',
    whyItMatters: 'UAT sessions are the highest-stakes client interactions. A Penny-generated prep summary delivered to the client\'s own Chat Space means participants arrive prepared without requiring them to log into Trail OS.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Digital Compass Project Update',
    relatedProgram: 'Digital Compass',
  },
  {
    id: 'digital-compass-update-tpl',
    name: 'Digital Compass Project Update',
    provider: 'Google Chat',
    audience: 'Digital Compass Participants, Employer Partners',
    triggerEvent: 'Sprint completion or milestone reached in Trail OS',
    destination: 'Digital Compass — Client Space',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Project update template for Digital Compass sprint completions and milestone announcements — delivered to the client Google Chat Space with progress summary and next sprint preview.',
    whyItMatters: 'Employer partners need visibility at natural sprint boundaries, not on a fixed schedule. A milestone-triggered update means clients hear about progress when it actually happens.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Digital Compass Project Update',
    relatedProgram: 'Digital Compass',
  },
  {
    id: 'calendar-reminder-tpl',
    name: 'Calendar-Triggered Reminder',
    provider: 'Google Calendar',
    audience: 'Learners, Coaches, or Clients (per event)',
    triggerEvent: 'Google Calendar event — configurable offset (24h, 48h, 72h)',
    destination: 'Mapped per Penny Reminder Schedule',
    owner: 'Penny Lead',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Generic Calendar-aware reminder template used by the Penny Reminder Schedule — the channel and message content adapt to the event type (Trail Talk, UAT, office hours, etc.).',
    whyItMatters: 'A single Calendar reminder template that adapts to event type eliminates the need for a separate template per event category. The Penny Reminder Schedule maps event types to message content and channel dynamically.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Any Calendar Event',
    relatedProgram: 'All Programs',
  },
];
