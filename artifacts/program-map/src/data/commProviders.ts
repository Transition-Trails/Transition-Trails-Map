export interface CommProvider {
  id: string;
  name: string;
  slug: 'slack' | 'google-chat';
  status: 'prototype' | 'future';
  tagline: string;
  purpose: string;
  whyItMatters: string;
  connectionStatus: string;
  useCases: string[];
  requiredSetup: string[];
  relatedPennyCaps: string[];
  relatedDemandEvents: string[];
  futureSetup: string;
  sourceOwner: string;
}

export const commProviders: CommProvider[] = [
  {
    id: 'slack',
    name: 'Slack',
    slug: 'slack',
    status: 'prototype',
    tagline: 'Primary channel — Q3 2025',
    purpose: 'Deliver automated notifications, coaching nudges, operational alerts, and learner engagement prompts to the Transition Trails team, coaches, and facilitators via Slack.',
    whyItMatters: 'Slack is where the Transition Trails team already operates. Routing Trail OS events into Slack gives the team timely, context-aware prompts without needing to monitor the platform directly.',
    connectionStatus: 'Not Connected',
    useCases: [
      'Trail Talk reminders — weekly learner reflection prompts',
      'Cohort announcements — session starts and milestones',
      'Trail Win prompts — celebrate learner achievements publicly',
      'Penny coaching nudges — at-risk learner flags to coaches',
      'Demand case escalation alerts to the operations channel',
      'Facilitator prep reminders 24h before sessions',
      'Weekly health digest to the leadership channel',
      'Operations Center attention flags and alerts',
    ],
    requiredSetup: [
      'Create a Slack App in the Trail OS Slack workspace',
      'Configure incoming webhook URLs per channel destination',
      'Set up Bot Token with chat:write and channels:read scopes',
      'Map Trail OS event types to Slack channel destinations in Comm Routing',
      'Test with a Penny prototype trigger event',
      'Connect via Zapier webhook or direct Slack API (Agentforce action)',
    ],
    relatedPennyCaps: ['Proactive Nudge', 'At-Risk Detection', 'Trail Quest Prompting'],
    relatedDemandEvents: ['Case Escalation', 'New Case Created', 'Change Request Submitted'],
    futureSetup: 'Direct Slack API integration via Zapier webhook or Agentforce Slack action. Target: Q3 2025.',
    sourceOwner: 'Trail OS Operations',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    slug: 'google-chat',
    status: 'future',
    tagline: 'Future channel — same routing model, different adapter',
    purpose: 'Alternative communication channel for teams using Google Workspace. Supports the same routing model as Slack via a swappable provider adapter — no event definition or template changes required.',
    whyItMatters: 'Some Transition Trails client organizations use Google Workspace instead of Slack. The routing model is provider-agnostic by design — swapping to Google Chat only changes the destination adapter, not the event logic.',
    connectionStatus: 'Future',
    useCases: [
      'All Slack use cases supported — same routing model, different adapter',
      'Client-org notifications for cohorts using Google Workspace',
      'Alternative facilitator reminders for Workspace-based teams',
      'Google Chat Space announcements for program cohorts',
    ],
    requiredSetup: [
      'Configure Google Chat incoming webhook per Space destination',
      'Enable Google Chat API in Google Cloud Console',
      'Map routing rules to Google Chat Space destinations',
      'Adapt message format to Google Chat Cards v2 spec',
      'Update provider adapter config — no event logic changes required',
    ],
    relatedPennyCaps: ['Proactive Nudge', 'At-Risk Detection'],
    relatedDemandEvents: ['Case Escalation', 'New Case Created'],
    futureSetup: 'Swap provider adapter in Comm Routing config. Core event logic unchanged. Target: Q4 2025+.',
    sourceOwner: 'Trail OS Architecture',
  },
];
