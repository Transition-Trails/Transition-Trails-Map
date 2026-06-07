export interface CommRoute {
  id: string;
  eventType: string;
  description: string;
  trigger: string;
  audience: string;
  slackChannel: string;
  slackStatus: string;
  googleChatSpace?: string;
  googleChatStatus?: string;
  relatedPennyCap?: string;
  relatedDemandEvent?: string;
  owner: string;
  whyItMatters: string;
}

export const commRoutes: CommRoute[] = [
  {
    id: 'trail-talk-reminder',
    eventType: 'Trail Talk Reminder',
    description: 'Weekly prompt for active learners to complete their Trail Talk reflection and post to their cohort channel.',
    trigger: 'Scheduled — Monday 8am',
    audience: 'Active learners (all cohorts)',
    slackChannel: '#trail-talks-cohort-{N}',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Cohort Space',
    googleChatStatus: 'Future Q4',
    relatedPennyCap: 'Trail Quest Prompting',
    owner: 'Penny / Automation',
    whyItMatters: 'Regular reflection is a core RESOLVE behavior. Automated reminders maintain cadence without manual facilitator effort.',
  },
  {
    id: 'cohort-announcement',
    eventType: 'Cohort Announcement',
    description: 'Automated message when a new cohort opens, reaches capacity, or starts a new session.',
    trigger: 'Salesforce: Cohort stage change',
    audience: 'Enrolled learners + facilitators',
    slackChannel: '#cohort-{program}-{N}',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Cohort Space',
    googleChatStatus: 'Future Q4',
    relatedPennyCap: 'Program Navigation',
    owner: 'Operations Team',
    whyItMatters: 'Cohort announcements replace ad hoc email chains with consistent, timely communication.',
  },
  {
    id: 'trail-win-prompt',
    eventType: 'Trail Win Prompt',
    description: 'Celebrate learner milestones — phase completions, Trail Quest achievements, and program graduations.',
    trigger: 'Salesforce: Learner milestone event',
    audience: 'Coach + all-team channel',
    slackChannel: '#trail-wins',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Team Space',
    googleChatStatus: 'Future',
    relatedPennyCap: 'Proactive Nudge',
    owner: 'Penny',
    whyItMatters: 'Public celebration builds team culture and motivates learners to complete their full trail.',
  },
  {
    id: 'penny-coaching-nudge',
    eventType: 'Penny Coaching Nudge',
    description: 'Alert coaches when Penny detects an at-risk learner, stalled progress, or escalation requiring human follow-up.',
    trigger: 'Penny: At-risk flag OR 3+ escalations',
    audience: 'Coach channel',
    slackChannel: '#penny-alerts',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Coaching Space',
    googleChatStatus: 'Future',
    relatedPennyCap: 'At-Risk Detection',
    owner: 'Penny',
    whyItMatters: 'Coaches cannot monitor every learner continuously. Penny flags surface the right context to the right person at the right time.',
  },
  {
    id: 'demand-case-escalation',
    eventType: 'Demand Case Escalation',
    description: 'Notify the operations team when a Salesforce case is escalated, urgent, or aged past threshold.',
    trigger: 'Salesforce: Priority = Urgent OR age > 48h',
    audience: 'Operations staff',
    slackChannel: '#ops-support',
    slackStatus: 'Planned Q3 2025',
    relatedDemandEvent: 'Case Escalation',
    owner: 'Demand Management',
    whyItMatters: 'Urgent cases must not fall through the cracks. Automated alerts ensure immediate visibility without manual monitoring.',
  },
  {
    id: 'at-risk-learner-alert',
    eventType: 'Penny At-Risk Learner Alert',
    description: 'Flag learners showing inactivity or low progress for proactive facilitator outreach before disengagement.',
    trigger: 'Penny: 7d inactivity OR progress < 20% after 2wks',
    audience: 'Facilitators + coach channel',
    slackChannel: '#coach-alerts',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Facilitator Space',
    googleChatStatus: 'Future',
    relatedPennyCap: 'At-Risk Detection',
    owner: 'Penny / Operations',
    whyItMatters: 'Early intervention dramatically improves completion rates. At-risk flags give facilitators time to reach out before learners disengage completely.',
  },
  {
    id: 'weekly-health-digest',
    eventType: 'Weekly Health Digest',
    description: 'Automated summary of program enrollment, case volume, Penny quality score, and automation status every Monday.',
    trigger: 'Scheduled — Monday 9am',
    audience: 'Leadership channel',
    slackChannel: '#leadership',
    slackStatus: 'Planned Q3 2025',
    owner: 'Trail OS / Automation',
    whyItMatters: 'Leadership needs a weekly pulse on the platform without logging in. The digest brings Trail OS context to where they already are.',
  },
  {
    id: 'facilitator-reminder',
    eventType: 'Facilitator Reminder',
    description: 'Pre-session reminders for facilitators — upcoming session, prep checklist, and learner attendance heads-up.',
    trigger: 'Scheduled — 24h before cohort session',
    audience: 'Facilitators channel',
    slackChannel: '#facilitators',
    slackStatus: 'Planned Q3 2025',
    googleChatSpace: 'Facilitators Space',
    googleChatStatus: 'Future',
    owner: 'Operations Team',
    whyItMatters: 'Facilitators managing multiple cohorts need 24h reminders with learner context to show up fully prepared.',
  },
];
