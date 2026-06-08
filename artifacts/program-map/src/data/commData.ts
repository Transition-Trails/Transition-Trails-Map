// ── Communications Hub — Prototype Data ──────────────────────────────────────
// All data is illustrative. Slack is the first planned adapter, not the product.
// Provider-agnostic design: Google Chat, Teams, and Email can be added later.

export interface CommProvider {
  id: string;
  name: string;
  status: 'planned-primary' | 'future' | 'active';
  statusLabel: string;
  icon: string;
  description: string;
  purpose: string;
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
  type: 'team' | 'alert' | 'digest' | 'ops' | 'space';
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

// ── Providers ────────────────────────────────────────────────────────────────

export const commProviders: CommProvider[] = [
  {
    id: 'slack',
    name: 'Slack',
    status: 'planned-primary',
    statusLabel: 'Planned · Primary Prototype',
    icon: '#',
    description: 'Slack is the first communication adapter for Trail OS. It will serve as the primary prototype channel for Penny broadcasts, ops alerts, weekly briefs, and learner cohort messaging.',
    purpose: 'Operational messaging adapter — the first channel through which Trail OS and Penny communicate with learners, coaches, and the ops team.',
    whyItMatters: 'Slack is where the Transition Trails team already collaborates. Wiring Trail OS into Slack means automated broadcasts, nudges, and briefs land where people are already working, without requiring a new tool.',
    capabilities: ['Penny Broadcasts', 'Weekly Briefs', 'Ops Alerts', 'Cohort Notifications', 'Coach Digests'],
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
    description: 'Google Chat adapter planned for organisations using Google Workspace. Will support Spaces, direct messages, and webhook delivery of Trail OS and Penny communications.',
    purpose: 'Secondary communication adapter for Google Workspace cohorts and employers.',
    whyItMatters: 'Some employer partners and learner cohorts use Google Workspace natively. A Google Chat adapter avoids forcing them into a second tool.',
    capabilities: ['Spaces Messaging', 'Webhook Broadcasts', 'Learner Nudges'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Nudging',
    setupNotes: 'Requires Google Chat API setup and OAuth app review. Planned post-Slack adapter.',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    status: 'future',
    statusLabel: 'Future Supported',
    icon: 'T',
    description: 'Microsoft Teams adapter for enterprise employer partners and learners in Microsoft 365 environments. Will integrate via Power Automate or direct Bot Framework.',
    purpose: 'Enterprise adapter for Microsoft 365 employer and learner cohorts.',
    whyItMatters: 'Enterprise employers and public sector partners frequently run Microsoft 365. A Teams adapter ensures Trail OS messaging is accessible in those environments without tool-switching.',
    capabilities: ['Channel Broadcasts', 'Adaptive Cards', 'Bot Messaging'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Nudging',
    setupNotes: 'Requires Azure Bot registration and Teams app manifest. Planned after Google Chat.',
  },
  {
    id: 'email',
    name: 'Email',
    status: 'future',
    statusLabel: 'Future Supported',
    icon: '@',
    description: 'Email adapter for weekly digests, learner onboarding messages, and fallback notifications to stakeholders who do not use Slack, Google Chat, or Teams.',
    purpose: 'Universal fallback adapter and primary channel for weekly brief delivery to leadership and external stakeholders.',
    whyItMatters: 'Email is the lowest common denominator — it reaches every learner, coach, employer, and stakeholder regardless of which messaging tool they use.',
    capabilities: ['Weekly Briefs', 'Onboarding Sequences', 'Leadership Digests', 'Fallback Alerts'],
    owner: 'Operations Lead',
    pennyCapability: 'Learner Progress Summary',
    setupNotes: 'Requires SMTP or SendGrid/SES integration. Planned alongside Google Chat adapter.',
  },
];

// ── Channels ─────────────────────────────────────────────────────────────────

export const commChannels: CommChannel[] = [
  {
    id: 'guided-trail-cohort',
    name: '#guided-trail-cohort',
    provider: 'Slack',
    providerStatus: 'planned',
    type: 'team',
    audience: 'Guided Trail Learners',
    purpose: 'Primary cohort channel for all Guided Trail learners. Penny broadcasts Trail Talk reminders, assignment nudges, and celebration posts here.',
    whyItMatters: 'Cohort channels create a shared space for peer accountability and Penny-driven engagement at the program level.',
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
    purpose: 'Private channel for Guided Trail coaches. Receives Penny confidence risk alerts, learner progress digests, and coach-specific weekly briefs.',
    whyItMatters: 'Coaches need a private, low-noise channel where Penny surfaces at-risk learners before problems escalate.',
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
  {
    id: 'google-chat-ops-space',
    name: 'TrailOS Ops Space',
    provider: 'Google Chat',
    providerStatus: 'future',
    type: 'space',
    audience: 'Operations Team (Google Workspace)',
    purpose: 'Future Google Chat Space mirroring the #trailos-ops Slack channel for teams using Google Workspace.',
    whyItMatters: 'Ensures Trail OS operational signals reach the full team regardless of which messaging tool they use.',
    status: 'future',
    relatedProgram: 'All Programs',
    pennyCapability: 'Demand Intelligence',
    owner: 'Operations Lead',
    demandEvent: 'New Demand Submitted',
  },
];

// ── Penny Broadcasts ─────────────────────────────────────────────────────────

export const commBroadcasts: CommBroadcast[] = [
  {
    id: 'trail-talk-reminder',
    name: 'Trail Talk Reminder',
    type: 'reminder',
    trigger: '48 hours before Trail Talk session',
    audience: 'Active cohort learners',
    channel: '#guided-trail-cohort',
    frequency: 'Per session',
    purpose: 'Reminds learners of an upcoming Trail Talk session with time, topic, and what to prepare.',
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
    audience: 'Individual learner (private message)',
    channel: 'Direct message',
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
    id: 'assignment-reminder',
    name: 'Assignment Reminder',
    type: 'reminder',
    trigger: '24 hours before assignment due date',
    audience: 'Assigned learner',
    channel: 'Direct message',
    frequency: 'Per assignment',
    purpose: 'Reminds a learner that an assignment is due tomorrow, links them directly to the task, and offers Penny help if needed.',
    whyItMatters: 'Missed assignments are the second most common reason learners fall behind. A 24-hour reminder with a direct action link reduces late submissions without coach intervention.',
    pennyCapability: 'Learner Nudging',
    relatedProgram: 'All Programs',
    owner: 'Program Manager',
    status: 'planned',
    example: '"Heads up — your Employer Research submission is due tomorrow at 5pm. Need help? Ask Penny now and get unstuck before the deadline."',
  },
  {
    id: 'office-hours-announcement',
    name: 'Office Hours Announcement',
    type: 'announcement',
    trigger: 'Office hours scheduled by coach',
    audience: 'Active cohort learners',
    channel: '#guided-trail-cohort',
    frequency: 'Per office hours session',
    purpose: 'Announces upcoming coach office hours in the cohort channel with booking link and topic focus.',
    whyItMatters: 'Office hours attendance is low when announcements depend on coaches posting manually. A Penny-triggered announcement with a booking link converts passive awareness into scheduled time.',
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
    frequency: 'Weekly — Friday 4pm',
    channel: '#leadership-digest',
    owner: 'Operations Lead',
    status: 'planned',
    purpose: 'Auto-generated weekly summary of the full Trail OS operating picture — delivered by Penny to the leadership channel every Friday.',
    whyItMatters: 'Leadership currently receives program updates through ad-hoc check-ins and manual reports. The Executive Weekly Brief automates this into a single, consistent Friday read-out from Trail OS and Penny.',
    relatedDemandEvent: 'Weekly Brief Generated',
  },
  {
    id: 'coach-weekly-brief',
    name: 'Coach Weekly Brief',
    audience: 'Program Coaches',
    sections: [
      'My Learners — learner status, engagement, and Penny confidence scores for each assigned learner',
      'At-Risk Signals — learners with low engagement or confidence requiring coach outreach',
      'This Week\'s Sessions — upcoming Trail Talks and office hours I\'m facilitating',
      'Assignments Due — learner assignments due this week requiring review or grading',
      'Penny Flags — content quality flags or learner queries Penny could not resolve',
    ],
    frequency: 'Weekly — Monday 8am',
    channel: '#guided-trail-coaches',
    owner: 'Coach Lead',
    status: 'planned',
    purpose: 'Personalised weekly brief for each coach showing their learner caseload, at-risk signals, upcoming sessions, and Penny flags.',
    whyItMatters: 'Coaches currently have no single view of their weekly workload. A Monday morning brief from Penny means coaches start the week with a clear picture of who needs attention.',
    relatedDemandEvent: 'Learner Confidence Risk',
  },
];

// ── Notifications ─────────────────────────────────────────────────────────────

export const commNotifications: CommNotification[] = [
  {
    id: 'new-demand-submitted',
    event: 'New Demand Submitted',
    source: 'Demand Management — Intake',
    destination: '#trailos-ops',
    destinationLabel: 'Ops Channel',
    audience: 'Operations Team',
    owner: 'Operations Lead',
    purpose: 'Notifies the ops channel when a new intake submission is received — with name, program of interest, and submission timestamp.',
    whyItMatters: 'Intake submissions currently sit in Salesforce until an ops team member checks the queue. An immediate Slack notification ensures same-day follow-up and reduces intake-to-response time.',
    pennyCapability: 'Demand Intelligence',
    relatedDemandEvent: 'Intake Submission',
    status: 'planned',
  },
  {
    id: 'learner-confidence-risk',
    event: 'Learner Confidence Risk',
    source: 'Penny Command Center — Confidence Score',
    destination: '#guided-trail-coaches',
    destinationLabel: 'Coaches Channel',
    audience: 'Program Coaches',
    owner: 'Penny Lead',
    purpose: 'Alerts the coaches channel when Penny detects a learner confidence score drop below threshold — with learner name, score, and recommended action.',
    whyItMatters: 'Confidence score drops are the earliest predictor of dropout risk. A coach alert triggered by Penny — rather than a weekly report — creates the window for intervention before engagement collapses.',
    pennyCapability: 'Confidence Scoring',
    relatedDemandEvent: 'Learner Confidence Risk',
    status: 'planned',
  },
  {
    id: 'case-escalated',
    event: 'Case Escalated',
    source: 'Demand Management — Salesforce Cases',
    destination: '#trailos-ops',
    destinationLabel: 'Ops Channel',
    audience: 'Operations Team, Administration',
    owner: 'Operations Lead',
    purpose: 'Fires when a Salesforce case is escalated to high priority — notifying the ops channel with case number, escalation reason, and assigned owner.',
    whyItMatters: 'Escalated cases require rapid response. A Slack notification at escalation time eliminates the dependency on someone actively monitoring the Salesforce case queue.',
    pennyCapability: 'Demand Intelligence',
    relatedDemandEvent: 'Case Escalated',
    status: 'planned',
  },
  {
    id: 'knowledge-article-updated',
    event: 'Knowledge Article Updated',
    source: 'Knowledge Library — Documents',
    destination: '#trailos-ops',
    destinationLabel: 'Ops Channel',
    audience: 'Operations Team, Penny Lead',
    owner: 'Penny Lead',
    purpose: 'Notifies the ops channel when a source document or knowledge article is updated — triggering a prompt to review Penny\'s affected capability areas.',
    whyItMatters: 'Penny\'s coaching quality depends on the knowledge library staying current. Without notifications, updated articles are invisible to the ops team and Penny continues using stale context.',
    pennyCapability: 'Knowledge Retrieval',
    relatedDemandEvent: 'Knowledge Article Updated',
    status: 'planned',
  },
  {
    id: 'cohort-milestone-reached',
    event: 'Cohort Milestone Reached',
    source: 'Trail OS — Program Delivery',
    destination: '#guided-trail-cohort',
    destinationLabel: 'Cohort Channel',
    audience: 'Active Cohort Learners',
    owner: 'Program Manager',
    purpose: 'Fires when the cohort collectively reaches a program milestone (e.g., 50% completion) — triggering a celebration broadcast in the cohort channel from Penny.',
    whyItMatters: 'Collective milestones are powerful cohort bonding moments. Automated celebration posts from Penny remove the dependency on a program manager manually noticing and posting.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Cohort Milestone Reached',
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
    triggerEvent: '48h before Trail Talk session',
    destination: '#guided-trail-cohort',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Standard reminder template for upcoming Trail Talk sessions with dynamic session name, date, time, and topic fields.',
    whyItMatters: 'Standardising the reminder format ensures learners always receive the same level of detail regardless of who configures the session.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Trail Talk Scheduled',
    relatedProgram: 'Guided Trail',
  },
  {
    id: 'assignment-due-tpl',
    name: 'Assignment Due Reminder',
    provider: 'Slack',
    audience: 'Individual Learner',
    triggerEvent: '24h before assignment due date',
    destination: 'Direct Message',
    owner: 'Program Manager',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Personalised reminder template with dynamic learner name, assignment name, due date, and direct link to the assignment.',
    whyItMatters: 'Assignment reminders with a direct link reduce friction between notification and action — critical for learners with variable availability.',
    pennyCapability: 'Learner Nudging',
    relatedDemandEvent: 'Assignment Created',
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
    provider: 'Slack',
    audience: 'Leadership Team',
    triggerEvent: 'Weekly — Friday 4pm',
    destination: '#leadership-digest',
    owner: 'Operations Lead',
    status: 'approved',
    lastReviewed: 'Jun 2025',
    purpose: 'Structured weekly brief template covering all six brief sections — auto-populated by Trail OS and Penny from live data at send time.',
    whyItMatters: 'A consistent format means leadership can scan the brief in under 3 minutes every Friday — building the habit of Trail OS as the operating source of truth.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Weekly Brief Generated',
    relatedProgram: 'All Programs',
  },
  {
    id: 'trail-win-celebration-tpl',
    name: 'Trail Win Celebration Post',
    provider: 'Slack',
    audience: 'Full Cohort',
    triggerEvent: 'Learner milestone or placement achieved',
    destination: '#guided-trail-cohort',
    owner: 'Operations Lead',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Celebration post template for learner milestones and placements — with dynamic learner name, achievement type, and optional employer name.',
    whyItMatters: 'Celebration posts are the highest-engagement content in cohort channels. Standardising the template ensures every placement is acknowledged consistently.',
    pennyCapability: 'Learner Progress Summary',
    relatedDemandEvent: 'Cohort Milestone Reached',
    relatedProgram: 'All Programs',
  },
  {
    id: 'intake-notification-tpl',
    name: 'New Intake Notification',
    provider: 'Slack',
    audience: 'Operations Team',
    triggerEvent: 'New intake submission received',
    destination: '#trailos-ops',
    owner: 'Operations Lead',
    status: 'draft',
    lastReviewed: 'Jun 2025',
    purpose: 'Ops notification template for new intake submissions — with applicant name, program of interest, submission timestamp, and link to the intake record.',
    whyItMatters: 'Fast intake follow-up is a key conversion factor. A structured notification with a direct link to the record means the ops team can act within the hour rather than the next business day.',
    pennyCapability: 'Demand Intelligence',
    relatedDemandEvent: 'Intake Submission',
    relatedProgram: 'All Programs',
  },
];
