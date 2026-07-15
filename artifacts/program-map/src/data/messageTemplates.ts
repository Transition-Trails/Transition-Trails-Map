import { TERMS } from '@/config/terminology';

export interface MessageTemplate {
  id: string;
  name: string;
  provider: 'slack' | 'google-chat' | 'any';
  destination: string;
  audience: string;
  triggerEvent: string;
  messageSummary: string;
  status: 'draft' | 'approved' | 'active' | 'planned';
  owner: string;
  lastReviewed: string;
  whyItMatters: string;
  relatedPennyCap?: string;
  relatedDemandEvent?: string;
}

export const messageTemplates: MessageTemplate[] = [
  {
    id: 'tpl-trail-talk',
    name: 'Trail Talk Weekly Reminder',
    provider: 'slack',
    destination: '#trail-talks-cohort-{N}',
    audience: 'Active learners — all cohorts',
    triggerEvent: 'Trail Talk Reminder (Monday scheduled)',
    messageSummary: "👋 Hey @learner — it's Trail Talk time! Your weekly reflection is due. What's one insight from your trail this week? Drop it in the thread. 🌲",
    status: 'draft',
    owner: 'Program Manager',
    lastReviewed: 'Jun 2025',
    whyItMatters: 'Regular reflection is a core RESOLVE behavior. Automated reminders maintain cadence without manual facilitator effort.',
    relatedPennyCap: 'Trail Quest Prompting',
  },
  {
    id: 'tpl-cohort-announcement',
    name: 'Cohort Session Announcement',
    provider: 'slack',
    destination: '#cohort-{program}-{N}',
    audience: 'Enrolled learners + facilitators',
    triggerEvent: 'Salesforce: Cohort stage change',
    messageSummary: '📣 Heads up Cohort {N}! Your next {program} session is on {date} at {time}. Come prepared with your Trail Quest from this week. See you there!',
    status: 'approved',
    owner: 'Operations Team',
    lastReviewed: 'Jun 2025',
    whyItMatters: 'Cohort announcements replace ad hoc email chains. Consistent formatting ensures learners always know what to expect.',
    relatedPennyCap: 'Program Navigation',
  },
  {
    id: 'tpl-trail-win',
    name: 'Trail Win Celebration',
    provider: 'slack',
    destination: '#trail-wins',
    audience: 'Coach + all-team',
    triggerEvent: 'Salesforce: Learner milestone event',
    messageSummary: '🏆 Trail Win! @learner just completed the {phase} phase of {program}. A huge step forward on their trail. Drop some encouragement! 👏',
    status: 'draft',
    owner: TERMS.aiAssistant,
    lastReviewed: 'Jun 2025',
    whyItMatters: 'Celebrating wins publicly builds culture and keeps learners motivated through their full trail.',
    relatedPennyCap: 'Proactive Nudge',
  },
  {
    id: 'tpl-coach-nudge',
    name: `${TERMS.aiAssistant} Coaching Nudge`,
    provider: 'slack',
    destination: '#coach-alerts',
    audience: 'Coaches',
    triggerEvent: `${TERMS.aiAssistant}: At-risk flag OR 3+ escalations`,
    messageSummary: `⚠️ ${TERMS.aiAssistant} Flag: @learner may need attention. Reason: {flag_reason}. Last active: {last_active}. Suggested action: {recommendation}.`,
    status: 'approved',
    owner: TERMS.aiAssistant,
    lastReviewed: 'Jun 2025',
    whyItMatters: `Coaches cannot monitor every learner continuously. ${TERMS.aiAssistant} flags surface the right context at the right time.`,
    relatedPennyCap: 'At-Risk Detection',
  },
  {
    id: 'tpl-case-escalation',
    name: 'Case Escalation Alert',
    provider: 'slack',
    destination: '#ops-support',
    audience: 'Operations staff',
    triggerEvent: 'Salesforce: Case escalated OR urgent OR age > 48h',
    messageSummary: '🚨 Case Escalated: {case_id} — "{subject}" | Priority: {priority} | Age: {age} | View in Salesforce → {link}',
    status: 'approved',
    owner: 'Demand Management',
    lastReviewed: 'Jun 2025',
    whyItMatters: 'Urgent cases must not fall through the cracks. Automated alerts ensure immediate visibility without manual monitoring.',
    relatedDemandEvent: 'Case Escalation',
  },
  {
    id: 'tpl-facilitator-reminder',
    name: 'Facilitator Pre-Session Reminder',
    provider: 'slack',
    destination: '#facilitators',
    audience: 'Facilitators',
    triggerEvent: 'Scheduled: 24h before cohort session',
    messageSummary: `📅 Tomorrow: {program} Cohort {N} at {time}. {enrolled} learners expected. Check Trail Quest completion in ${TERMS.platform} before the call. 🌲`,
    status: 'draft',
    owner: 'Operations Team',
    lastReviewed: 'Jun 2025',
    whyItMatters: 'Facilitators managing multiple cohorts need 24h reminders with learner context to show up fully prepared.',
  },
  {
    id: 'tpl-health-digest',
    name: 'Weekly Health Digest',
    provider: 'slack',
    destination: '#leadership',
    audience: 'Leadership team',
    triggerEvent: 'Scheduled: Monday 9am',
    messageSummary: `📊 ${TERMS.platform} Weekly — {date} | Active Learners: {n} | Open Cases: {n} | ${TERMS.aiAssistant} Quality: {score}/100 | Automations: {status}`,
    status: 'active',
    owner: `${TERMS.platform} / Automation`,
    lastReviewed: 'Jun 2025',
    whyItMatters: `Leadership needs a weekly pulse on the platform without logging in. The digest brings ${TERMS.platform} context to where they already are.`,
  },
];
