// ── Slack Integration Center — Phase 2: Operational Workflow Validation ──────
// Advances from architecture readiness into real object flows, mapping,
// delivery routing, flow visualisation, and scenario testing.

// ── Types ─────────────────────────────────────────────────────────────────────

export type ValidationStatus = 'pass' | 'fail' | 'warning' | 'pending';
export type MappingStatus    = 'Mapped' | 'Partial' | 'Missing';
export type BotAccess        = 'Granted' | 'Pending' | 'Missing';
export type DeliveryStatus   = 'Active' | 'Configured' | 'Pending' | 'Blocked';
export type ScenarioStatus   = 'Ready' | 'Partially Ready' | 'Blocked';
export type IssueSeverity    = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus      = 'Open' | 'In Progress' | 'Resolved';
export type TestStatus       = 'pass' | 'fail' | 'warning' | 'pending' | 'blocked';

export interface ValidationCheck {
  id: string;
  category: 'Secret' | 'Permission' | 'Channel Access' | 'OAuth' | 'Bot';
  label: string;
  status: ValidationStatus;
  detail: string;
  impact: string;
  fix?: string;
}

export interface ChannelLink {
  channelId: string;
  channelName: string;
  purpose: 'Cohort' | 'Coaches' | 'Announcements' | 'Admin' | 'Penny Delivery' | 'Executive';
  botAccess: BotAccess;
  mappingStatus: MappingStatus;
  memberCount?: number;
}

export interface ProgramChannelMap {
  programId: string;
  programName: string;
  cohort?: string;
  status: 'active' | 'planning' | 'complete';
  channels: ChannelLink[];
}

export interface SlackUserRef {
  slackHandle: string;
  displayName: string;
  role: string;
  pennyEnabled: boolean;
}

export interface RoleGroup {
  roleId: string;
  roleName: string;
  roleType: 'Coach' | 'Learner' | 'Program Lead' | 'Curriculum Designer' | 'Volunteer' | 'Executive' | 'Admin';
  count: number;
  pennyPersona: string;
  slackUsers: SlackUserRef[];
  slackUserGroups: string[];
  mappingStatus: 'Complete' | 'Partial' | 'Missing';
  programs: string[];
  deliveryChannels: string[];
}

export interface DeliveryRoute {
  channelName: string;
  channelId: string;
  templateId: string;
  templateName: string;
  triggerType: 'Scheduled' | 'Event-Driven' | 'On-Demand' | 'Escalation';
  audience: string;
  frequency?: string;
  deliveryStatus: DeliveryStatus;
}

export interface PennyDeliveryMap {
  capabilityId: string;
  capabilityName: string;
  domain: string;
  maturity: string;
  description: string;
  deliveries: DeliveryRoute[];
  overallStatus: DeliveryStatus;
}

export interface FlowNode {
  id: string;
  type: 'Program' | 'Channel' | 'Penny' | 'Template' | 'Message' | 'Activity' | 'Signal';
  label: string;
  detail: string;
  status: 'active' | 'pending' | 'blocked';
}

export interface CommFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  cadence: string;
  status: 'Active' | 'Configured' | 'Planned' | 'Blocked';
  programs: string[];
  nodes: FlowNode[];
}

export interface SlackObjectProfile {
  id: string;
  objectType: 'channel' | 'usergroup' | 'template';
  name: string;
  status: string;
  health: 'healthy' | 'needs-attention' | 'incomplete' | 'unknown';
  owner: string;
  secondary: string;
  purpose: string;
  memberCount?: number;
  botAccess?: boolean;
  pennyEnabled?: boolean;
  programs: string[];
  governanceStatus: 'compliant' | 'needs-review' | 'missing-metadata' | 'non-compliant';
  lastActivity?: string;
  notes: string;
}

export interface ScenarioStep {
  step: number;
  type: 'trigger' | 'program' | 'channel' | 'penny' | 'template' | 'delivery' | 'signal';
  label: string;
  detail: string;
  status: 'ready' | 'pending' | 'blocked';
}

export interface OperationalScenario {
  id: string;
  name: string;
  category: 'Coaching' | 'Briefing' | 'Escalation' | 'Announcement';
  trigger: string;
  description: string;
  status: ScenarioStatus;
  readinessScore: number;
  flow: ScenarioStep[];
  blockers: string[];
  programs: string[];
  pennyCapability: string;
  destination: string;
}

export interface GovernanceIssue {
  id: string;
  severity: IssueSeverity;
  category: 'Ownership' | 'Missing Mapping' | 'Permission' | 'Orphaned' | 'Inactive' | 'Configuration';
  title: string;
  detail: string;
  affectedObjects: string[];
  resolution: string;
  status: IssueStatus;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  status: TestStatus;
  result: string;
  blockedBy?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  category: 'Secret Validation' | 'Permission Validation' | 'Channel Access' | 'Message Delivery' | 'Mapping Integrity' | 'Governance' | 'End-to-End Flow' | 'POC Restoration';
  icon: string;
  description: string;
  tests: TestCase[];
}

// ── Workspace Validation ──────────────────────────────────────────────────────

export const VALIDATION_CHECKS: ValidationCheck[] = [
  // Secret validation
  { id:'v-bot-token',    category:'Secret', label:'Bot User OAuth Token',        status:'fail',    detail:'SLACK_BOT_TOKEN not set in environment. Required for all API calls.',   impact:'Blocks all Slack API operations including channel reads and message delivery.', fix:'Set SLACK_BOT_TOKEN in environment secrets → Slack App dashboard → OAuth & Permissions → Bot User OAuth Token.' },
  { id:'v-sign-secret',  category:'Secret', label:'Signing Secret',              status:'fail',    detail:'SLACK_SIGNING_SECRET not set. Required to verify event payloads.',          impact:'Cannot verify incoming Slack events — security risk and functional blocker.',   fix:'Set SLACK_SIGNING_SECRET in environment secrets → Slack App dashboard → Basic Information → App Credentials.' },
  { id:'v-oauth-token',  category:'Secret', label:'OAuth Access Token (User)',    status:'pending', detail:'SLACK_USER_TOKEN not set. Required for user-context API calls.',            impact:'Role-to-user mapping and user group lookups will fall back to bot context.',    fix:'Complete OAuth 2.0 user authorization flow or set SLACK_USER_TOKEN.' },

  // Permission validation
  { id:'v-perm-read',    category:'Permission', label:'channels:read',            status:'pending', detail:'Scope declared in app manifest but not validated without active token.',   impact:'Cannot list workspace channels or verify channel membership.',                   fix:'Install app to workspace after bot token is set. Verify scope is present.' },
  { id:'v-perm-write',   category:'Permission', label:'chat:write',               status:'pending', detail:'Scope declared but not validated.',                                        impact:'Cannot deliver Penny messages to any channel.',                                   fix:'Confirm chat:write scope is in installed app permissions.' },
  { id:'v-perm-users',   category:'Permission', label:'users:read',               status:'pending', detail:'Required for Role-to-User mapping. Scope declared but not active.',       impact:'Cannot resolve Slack user IDs for role assignments.',                            fix:'Verify users:read scope included before installation.' },
  { id:'v-perm-groups',  category:'Permission', label:'usergroups:read',          status:'pending', detail:'Required for Slack User Group resolution. Not validated.',                 impact:'User group delivery routing will be incomplete.',                                fix:'Add usergroups:read scope to app manifest.' },
  { id:'v-perm-im',      category:'Permission', label:'im:write',                 status:'pending', detail:'Required for direct message delivery (Learner coaching nudges).',         impact:'Direct Penny coaching messages to learners blocked.',                            fix:'Add im:write scope. Note: requires additional admin approval in some workspaces.' },

  // Channel access
  { id:'v-ch-cohort',    category:'Channel Access', label:'#foundations-cohort-2',   status:'pending', detail:'Bot not installed — channel access cannot be verified.',               impact:'Cohort learner delivery blocked. Primary delivery surface.',                    fix:'Install bot to workspace and invite @trail-os-bot to #foundations-cohort-2.' },
  { id:'v-ch-coaches',   category:'Channel Access', label:'#foundations-coaches',    status:'pending', detail:'Bot not installed — channel access cannot be verified.',               impact:'Coach brief and coaching escalation delivery blocked.',                         fix:'Invite @trail-os-bot to #foundations-coaches after installation.' },
  { id:'v-ch-guided',    category:'Channel Access', label:'#guided-trail',           status:'pending', detail:'Bot not installed — channel access cannot be verified.',               impact:'Guided Trail cohort communication blocked.',                                    fix:'Invite @trail-os-bot to #guided-trail.' },
  { id:'v-ch-general',   category:'Channel Access', label:'#team-general',           status:'pending', detail:'Bot not installed — channel access cannot be verified.',               impact:'Program announcements and executive brief delivery blocked.',                   fix:'Invite @trail-os-bot to #team-general after installation.' },

  // OAuth
  { id:'v-oauth-flow',   category:'OAuth', label:'OAuth 2.0 Flow Configured',    status:'warning', detail:'OAuth redirect URI is set but app is not installed to target workspace.', impact:'Cannot obtain workspace tokens. All API operations blocked.',                   fix:'Complete Slack App installation via OAuth 2.0 flow. Add workspace as install target.' },
  { id:'v-oauth-scope',  category:'OAuth', label:'Required Scopes Declared',     status:'warning', detail:'7 of 8 required scopes declared in manifest. Missing: files:read.',       impact:'File attachment delivery in Penny templates will fail.',                        fix:'Add files:read scope to app manifest before installation.' },
  { id:'v-oauth-admin',  category:'OAuth', label:'Workspace Admin Approval',     status:'pending', detail:'Admin approval required for im:write and usergroups:write scopes.',       impact:'Direct message and user group operations pending admin sign-off.',              fix:'Request admin approval in Slack Admin dashboard → Manage Apps.' },

  // Bot
  { id:'v-bot-profile',  category:'Bot', label:'Bot Profile Configured',         status:'pass',    detail:'Bot display name "Trail OS Bot" and icon configured in app manifest.',    impact:'None — bot profile is configured.',                                             },
  { id:'v-bot-app',      category:'Bot', label:'App Installed to Workspace',      status:'fail',    detail:'App exists in development but is not installed to Transition Trails workspace.', impact:'All channel operations, message delivery, and event subscriptions are blocked.', fix:'Go to Slack App dashboard → Install App → Install to Workspace.' },
  { id:'v-bot-events',   category:'Bot', label:'Event Subscriptions Active',      status:'pending', detail:'Event subscription URL configured but not verified (requires installation).', impact:'Real-time Slack event processing for activity feed and triggers will not work.', fix:'After installation, verify event subscription URL responds with challenge.' },
];

// ── Program-to-Channel Mapping ────────────────────────────────────────────────

export const PROGRAM_CHANNEL_MAPS: ProgramChannelMap[] = [
  {
    programId: 'foundations-trail',
    programName: 'Foundations Trail',
    cohort: 'Cohort 2 — Week 6',
    status: 'active',
    channels: [
      { channelId:'ch-ft-cohort2',  channelName:'#foundations-cohort-2',  purpose:'Cohort',         botAccess:'Pending', mappingStatus:'Mapped',  memberCount:17 },
      { channelId:'ch-ft-coaches',  channelName:'#foundations-coaches',   purpose:'Coaches',        botAccess:'Pending', mappingStatus:'Mapped',  memberCount:4  },
      { channelId:'ch-ft-announce', channelName:'#foundations-announce',  purpose:'Announcements',  botAccess:'Missing', mappingStatus:'Partial', memberCount:21 },
      { channelId:'ch-team-gen',    channelName:'#team-general',           purpose:'Penny Delivery', botAccess:'Pending', mappingStatus:'Mapped',  memberCount:28 },
    ],
  },
  {
    programId: 'guided-trail',
    programName: 'Guided Trail',
    cohort: 'Cohort 1 — Week 3',
    status: 'active',
    channels: [
      { channelId:'ch-gt-cohort1',  channelName:'#guided-trail',          purpose:'Cohort',         botAccess:'Pending', mappingStatus:'Mapped',  memberCount:12 },
      { channelId:'ch-gt-coaches',  channelName:'#guided-trail-coaches',  purpose:'Coaches',        botAccess:'Missing', mappingStatus:'Missing', memberCount:3  },
      { channelId:'ch-team-gen',    channelName:'#team-general',           purpose:'Announcements',  botAccess:'Pending', mappingStatus:'Mapped',  memberCount:28 },
    ],
  },
  {
    programId: 'explorers-trail',
    programName: "Explorer's Trail",
    cohort: 'Cohort 3 — Active',
    status: 'active',
    channels: [
      { channelId:'ch-et-cohort3',  channelName:'#explorers-cohort-3',   purpose:'Cohort',         botAccess:'Missing', mappingStatus:'Partial', memberCount:15 },
      { channelId:'ch-et-coaches',  channelName:'#explorers-coaches',    purpose:'Coaches',        botAccess:'Missing', mappingStatus:'Missing', memberCount:3  },
      { channelId:'ch-team-gen',    channelName:'#team-general',          purpose:'Penny Delivery', botAccess:'Pending', mappingStatus:'Mapped',  memberCount:28 },
    ],
  },
  {
    programId: 'trail-of-mastery',
    programName: 'Trail of Mastery',
    cohort: undefined,
    status: 'planning',
    channels: [
      { channelId:'ch-tom',         channelName:'#trail-of-mastery',     purpose:'Cohort',         botAccess:'Missing', mappingStatus:'Missing', memberCount:0  },
      { channelId:'ch-team-gen',    channelName:'#team-general',          purpose:'Announcements',  botAccess:'Pending', mappingStatus:'Mapped',  memberCount:28 },
    ],
  },
  {
    programId: 'digital-compass',
    programName: 'Digital Compass',
    cohort: undefined,
    status: 'planning',
    channels: [
      { channelId:'ch-dc',          channelName:'#digital-compass',      purpose:'Cohort',         botAccess:'Missing', mappingStatus:'Missing', memberCount:0  },
      { channelId:'ch-team-gen',    channelName:'#team-general',          purpose:'Announcements',  botAccess:'Pending', mappingStatus:'Mapped',  memberCount:28 },
    ],
  },
];

// ── Role-to-User Mapping ──────────────────────────────────────────────────────

export const ROLE_GROUPS: RoleGroup[] = [
  {
    roleId: 'coach',
    roleName: 'Coach',
    roleType: 'Coach',
    count: 3,
    pennyPersona: 'Coach Support',
    slackUsers: [
      { slackHandle: '@coach.sarah',  displayName: 'Sarah M.',  role: 'Lead Coach — Foundations',  pennyEnabled: true  },
      { slackHandle: '@coach.james',  displayName: 'James T.',  role: 'Coach — Guided Trail',       pennyEnabled: true  },
      { slackHandle: '@coach.linda',  displayName: 'Linda K.',  role: 'Coach — Explorer\'s Trail',  pennyEnabled: false },
    ],
    slackUserGroups: ['@coaches'],
    mappingStatus: 'Partial',
    programs: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    deliveryChannels: ['#foundations-coaches','#guided-trail-coaches'],
  },
  {
    roleId: 'learner',
    roleName: 'Learner',
    roleType: 'Learner',
    count: 47,
    pennyPersona: 'Learner',
    slackUsers: [],
    slackUserGroups: ['@foundations-cohort-2','@guided-cohort-1','@explorers-cohort-3'],
    mappingStatus: 'Partial',
    programs: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    deliveryChannels: ['#foundations-cohort-2','#guided-trail','#explorers-cohort-3'],
  },
  {
    roleId: 'program-lead',
    roleName: 'Program Lead',
    roleType: 'Program Lead',
    count: 2,
    pennyPersona: 'Chief of Staff',
    slackUsers: [
      { slackHandle: '@lead.morgan',  displayName: 'Morgan R.', role: 'Program Lead — All Programs', pennyEnabled: true },
      { slackHandle: '@lead.alex',    displayName: 'Alex D.',   role: 'Operations Lead',              pennyEnabled: true },
    ],
    slackUserGroups: ['@program-leads'],
    mappingStatus: 'Complete',
    programs: ['All Programs'],
    deliveryChannels: ['#team-general','#penny-ops'],
  },
  {
    roleId: 'curriculum',
    roleName: 'Curriculum Designer',
    roleType: 'Curriculum Designer',
    count: 1,
    pennyPersona: 'Knowledge Manager',
    slackUsers: [
      { slackHandle: '@design.casey', displayName: 'Casey W.', role: 'Curriculum Designer', pennyEnabled: false },
    ],
    slackUserGroups: [],
    mappingStatus: 'Partial',
    programs: ['Foundations Trail', 'Guided Trail'],
    deliveryChannels: ['#team-general'],
  },
  {
    roleId: 'volunteer',
    roleName: 'Volunteer',
    roleType: 'Volunteer',
    count: 6,
    pennyPersona: 'Volunteer Liaison',
    slackUsers: [],
    slackUserGroups: ['@volunteers'],
    mappingStatus: 'Missing',
    programs: ['Foundations Trail'],
    deliveryChannels: [],
  },
  {
    roleId: 'executive',
    roleName: 'Executive',
    roleType: 'Executive',
    count: 2,
    pennyPersona: 'Chief of Staff',
    slackUsers: [
      { slackHandle: '@exec.jordan',  displayName: 'Jordan P.', role: 'Executive Director', pennyEnabled: true  },
      { slackHandle: '@exec.taylor',  displayName: 'Taylor S.', role: 'Deputy Director',    pennyEnabled: false },
    ],
    slackUserGroups: ['@leadership'],
    mappingStatus: 'Partial',
    programs: ['All Programs'],
    deliveryChannels: ['#team-leadership','#team-general'],
  },
  {
    roleId: 'admin',
    roleName: 'Admin',
    roleType: 'Admin',
    count: 1,
    pennyPersona: 'System Admin',
    slackUsers: [
      { slackHandle: '@admin.riley',  displayName: 'Riley B.',  role: 'Trail OS Administrator', pennyEnabled: true },
    ],
    slackUserGroups: ['@admins'],
    mappingStatus: 'Complete',
    programs: ['All Programs'],
    deliveryChannels: ['#penny-qa','#trail-os-ops'],
  },
];

// ── Penny Delivery Mapping ────────────────────────────────────────────────────

export const PENNY_DELIVERY_MAPS: PennyDeliveryMap[] = [
  {
    capabilityId: 'learning-coach',
    capabilityName: 'Learner Coaching',
    domain: 'Coaching',
    maturity: 'Prototype',
    description: 'Real-time personalised coaching conversations and nudges delivered to learners in their cohort channels.',
    overallStatus: 'Pending',
    deliveries: [
      { channelName:'#foundations-cohort-2', channelId:'ch-ft-cohort2', templateId:'tmpl-coaching-nudge',  templateName:'Coaching Nudge',       triggerType:'Event-Driven', audience:'Cohort 2 Learners',   frequency:'As triggered', deliveryStatus:'Pending' },
      { channelName:'#guided-trail',          channelId:'ch-gt-cohort1', templateId:'tmpl-coaching-nudge',  templateName:'Coaching Nudge',       triggerType:'Event-Driven', audience:'Guided Trail Learners', frequency:'As triggered', deliveryStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'resume-review',
    capabilityName: 'Resume Review',
    domain: 'Career',
    maturity: 'Operational',
    description: 'Reviews learner resume drafts in Sprint 3. Delivers feedback into the cohort channel.',
    overallStatus: 'Configured',
    deliveries: [
      { channelName:'#foundations-cohort-2', channelId:'ch-ft-cohort2', templateId:'tmpl-resume-feedback', templateName:'Resume Feedback',      triggerType:'Event-Driven', audience:'Sprint 3 Learners',   frequency:'On submission',  deliveryStatus:'Configured' },
    ],
  },
  {
    capabilityId: 'weekly-brief',
    capabilityName: 'Executive Briefs',
    domain: 'Operations',
    maturity: 'Planned',
    description: 'Weekly executive-level program health summary delivered to leadership channel.',
    overallStatus: 'Pending',
    deliveries: [
      { channelName:'#team-leadership',      channelId:'ch-leadership',  templateId:'tmpl-exec-brief',      templateName:'Executive Brief',      triggerType:'Scheduled',    audience:'Executive Team',      frequency:'Monday 8am',     deliveryStatus:'Pending' },
      { channelName:'#team-general',          channelId:'ch-team-gen',    templateId:'tmpl-program-health',  templateName:'Program Health Digest',triggerType:'Scheduled',    audience:'Full Team',           frequency:'Friday 4pm',     deliveryStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'coach-brief',
    capabilityName: 'Coach Support',
    domain: 'Coaching',
    maturity: 'Prototype',
    description: 'Weekly coaching briefs and at-risk learner alerts delivered to coach channels.',
    overallStatus: 'Configured',
    deliveries: [
      { channelName:'#foundations-coaches',  channelId:'ch-ft-coaches',  templateId:'tmpl-coach-brief',     templateName:'Coach Brief',          triggerType:'Scheduled',    audience:'Foundations Coaches', frequency:'Monday 7am',     deliveryStatus:'Configured' },
      { channelName:'#guided-trail-coaches', channelId:'ch-gt-coaches',  templateId:'tmpl-coach-brief',     templateName:'Coach Brief',          triggerType:'Scheduled',    audience:'Guided Trail Coaches',frequency:'Monday 7am',     deliveryStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'trail-quest',
    capabilityName: 'Trail Quests',
    domain: 'Learning',
    maturity: 'In Development',
    description: 'Delivers guided quest prompts and milestone celebrations to cohort channels.',
    overallStatus: 'Pending',
    deliveries: [
      { channelName:'#foundations-cohort-2', channelId:'ch-ft-cohort2', templateId:'tmpl-quest-prompt',    templateName:'Quest Prompt',         triggerType:'Event-Driven', audience:'Sprint Learners',     frequency:'Sprint start',   deliveryStatus:'Pending' },
      { channelName:'#foundations-cohort-2', channelId:'ch-ft-cohort2', templateId:'tmpl-quest-celebrate', templateName:'Quest Celebration',    triggerType:'Event-Driven', audience:'Sprint Completions',  frequency:'On completion',  deliveryStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'escalation',
    capabilityName: 'Coaching Escalation',
    domain: 'Coaching',
    maturity: 'Defined',
    description: 'Detects learner struggle signals and routes escalation alerts to coaches.',
    overallStatus: 'Pending',
    deliveries: [
      { channelName:'#foundations-coaches',  channelId:'ch-ft-coaches',  templateId:'tmpl-escalation',      templateName:'Escalation Alert',     triggerType:'Escalation',   audience:'Lead Coach',          frequency:'As triggered',   deliveryStatus:'Pending' },
      { channelName:'#penny-qa',             channelId:'ch-penny-qa',    templateId:'tmpl-escalation-log',  templateName:'Escalation Log',       triggerType:'Escalation',   audience:'Admins',              frequency:'As triggered',   deliveryStatus:'Pending' },
    ],
  },
];

// ── Communication Flows ───────────────────────────────────────────────────────

export const COMM_FLOWS: CommFlow[] = [
  {
    id: 'weekly-reflection',
    name: 'Weekly Reflection Delivery',
    description: 'Penny Learning Coach delivers weekly reflection prompts to cohort learners at sprint cadence.',
    trigger: 'Scheduled — Friday 3pm',
    cadence: 'Weekly (sprint-aligned)',
    status: 'Configured',
    programs: ['Foundations Trail', 'Guided Trail'],
    nodes: [
      { id:'n1', type:'Program',  label:'Foundations Trail',     detail:'Sprint 3 — Week 6',         status:'active'  },
      { id:'n2', type:'Channel',  label:'#foundations-cohort-2', detail:'17 members · Bot pending',  status:'pending' },
      { id:'n3', type:'Penny',    label:'Learning Coach',        detail:'Prototype · Coaching domain',status:'active'  },
      { id:'n4', type:'Template', label:'Reflection Prompt',     detail:'v2.1 · Sprint-aware',        status:'active'  },
      { id:'n5', type:'Message',  label:'Slack Message',         detail:'Rich Block Kit format',      status:'pending' },
      { id:'n6', type:'Activity', label:'Activity Event',        detail:'delivery_confirmed',         status:'pending' },
      { id:'n7', type:'Signal',   label:'Engagement Signal',     detail:'→ Operational Intelligence', status:'pending' },
    ],
  },
  {
    id: 'coach-brief',
    name: 'Coach Brief Delivery',
    description: 'Weekly coaching brief with at-risk learner summary delivered to coaches before the coaching session.',
    trigger: 'Scheduled — Monday 7am',
    cadence: 'Weekly',
    status: 'Configured',
    programs: ['Foundations Trail', 'Guided Trail'],
    nodes: [
      { id:'n1', type:'Program',  label:'Foundations Trail',     detail:'Program Health Data',        status:'active'  },
      { id:'n2', type:'Channel',  label:'#foundations-coaches',  detail:'4 coaches · Bot pending',    status:'pending' },
      { id:'n3', type:'Penny',    label:'Chief of Staff',        detail:'Prototype · Operations',      status:'active'  },
      { id:'n4', type:'Template', label:'Coach Brief',           detail:'v1.3 · Learner-aware',        status:'active'  },
      { id:'n5', type:'Message',  label:'Slack Message',         detail:'Includes at-risk summary',    status:'pending' },
      { id:'n6', type:'Activity', label:'Activity Event',        detail:'coach_brief_delivered',       status:'pending' },
      { id:'n7', type:'Signal',   label:'Ops Signal',            detail:'→ Program Health Dashboard',  status:'pending' },
    ],
  },
  {
    id: 'exec-brief',
    name: 'Executive Brief Delivery',
    description: 'Weekly executive brief with cross-program health and key milestones delivered to leadership.',
    trigger: 'Scheduled — Monday 8am',
    cadence: 'Weekly',
    status: 'Planned',
    programs: ['All Programs'],
    nodes: [
      { id:'n1', type:'Program',  label:'All Programs',          detail:'5 programs · Aggregate',     status:'active'  },
      { id:'n2', type:'Channel',  label:'#team-leadership',      detail:'Exec channel · Bot missing',  status:'blocked' },
      { id:'n3', type:'Penny',    label:'Chief of Staff',        detail:'Executive Brief capability',  status:'active'  },
      { id:'n4', type:'Template', label:'Executive Brief',       detail:'v1.0 · KPI-aligned',          status:'pending' },
      { id:'n5', type:'Message',  label:'Slack Message',         detail:'Leadership-formatted',         status:'blocked' },
      { id:'n6', type:'Activity', label:'Activity Event',        detail:'exec_brief_delivered',         status:'pending' },
      { id:'n7', type:'Signal',   label:'Leadership Signal',     detail:'→ Executive Dashboard',        status:'pending' },
    ],
  },
  {
    id: 'escalation-routing',
    name: 'Escalation Routing',
    description: 'At-risk learner detection triggers an escalation alert to the responsible coach and logs to the ops channel.',
    trigger: 'Event — confidence < 65% or missed check-in',
    cadence: 'As triggered',
    status: 'Configured',
    programs: ['Foundations Trail'],
    nodes: [
      { id:'n1', type:'Program',  label:'Foundations Trail',     detail:'At-risk learner event',       status:'active'  },
      { id:'n2', type:'Channel',  label:'#foundations-coaches',  detail:'Lead coach · Bot pending',    status:'pending' },
      { id:'n3', type:'Penny',    label:'Coaching Escalation',   detail:'Defined · Escalation domain', status:'active'  },
      { id:'n4', type:'Template', label:'Escalation Alert',      detail:'v1.1 · Coach-formatted',       status:'active'  },
      { id:'n5', type:'Message',  label:'Slack Alert',           detail:'DM + channel notification',    status:'pending' },
      { id:'n6', type:'Activity', label:'Activity Event',        detail:'escalation_triggered',         status:'pending' },
      { id:'n7', type:'Signal',   label:'Support Signal',        detail:'→ Learner Support Queue',      status:'pending' },
    ],
  },
  {
    id: 'program-announcement',
    name: 'Program Announcement Delivery',
    description: 'Program milestones and cohort announcements delivered to the cohort channel and team general.',
    trigger: 'Event — program milestone or admin trigger',
    cadence: 'As triggered',
    status: 'Planned',
    programs: ['All Programs'],
    nodes: [
      { id:'n1', type:'Program',  label:'Program Milestone',     detail:'Sprint start / completion',   status:'active'  },
      { id:'n2', type:'Channel',  label:'#team-general',         detail:'Full team · Bot pending',     status:'pending' },
      { id:'n3', type:'Penny',    label:'Cohort Summaries',      detail:'Planned · Learning domain',   status:'pending' },
      { id:'n4', type:'Template', label:'Announcement',          detail:'v1.0 · Celebration format',   status:'pending' },
      { id:'n5', type:'Message',  label:'Slack Message',         detail:'Emoji-rich · Milestone format',status:'pending' },
      { id:'n6', type:'Activity', label:'Activity Event',        detail:'announcement_delivered',       status:'pending' },
      { id:'n7', type:'Signal',   label:'Cohort Signal',         detail:'→ Program Health Dashboard',   status:'pending' },
    ],
  },
];

// ── Slack Object Profiles ─────────────────────────────────────────────────────

export const SLACK_OBJECT_PROFILES: SlackObjectProfile[] = [
  // Channels
  { id:'prof-ft-cohort2',   objectType:'channel',   name:'#foundations-cohort-2',   status:'Active',  health:'healthy',          owner:'Program Lead',     secondary:'Cohort channel · 17 members',   purpose:'Primary learner delivery channel for Foundations Trail Cohort 2. Penny Learning Coach, reflection prompts, trail quests.', memberCount:17, botAccess:false, pennyEnabled:true,  programs:['Foundations Trail'], governanceStatus:'compliant',      lastActivity:'2h ago',  notes:'Primary Penny delivery surface. Awaiting bot token.' },
  { id:'prof-ft-coaches',   objectType:'channel',   name:'#foundations-coaches',    status:'Active',  health:'needs-attention',   owner:'Program Lead',     secondary:'Coach channel · 4 members',     purpose:'Coach briefings, at-risk alerts, and coaching escalation routing for Foundations Trail.', memberCount:4, botAccess:false, pennyEnabled:true, programs:['Foundations Trail'], governanceStatus:'needs-review', lastActivity:'1d ago',  notes:'Coach brief configured but bot access pending.' },
  { id:'prof-guided',       objectType:'channel',   name:'#guided-trail',           status:'Active',  health:'needs-attention',   owner:'Coach James',      secondary:'Cohort channel · 12 members',   purpose:'Guided Trail Cohort 1 learner delivery. Same Penny capabilities as Foundations but independent channel.',memberCount:12, botAccess:false, pennyEnabled:true, programs:['Guided Trail'], governanceStatus:'needs-review', lastActivity:'3h ago',  notes:'Bot access missing. Coach brief channel (#guided-trail-coaches) also unconnected.' },
  { id:'prof-team-gen',     objectType:'channel',   name:'#team-general',           status:'Active',  health:'healthy',           owner:'Admin',            secondary:'Team channel · 28 members',     purpose:'Cross-program announcements, executive digest delivery, and Penny Chief of Staff briefings.', memberCount:28, botAccess:false, pennyEnabled:true, programs:['All Programs'], governanceStatus:'compliant', lastActivity:'30m ago', notes:'High-visibility channel. Announcements and weekly team digest.' },
  { id:'prof-penny-qa',     objectType:'channel',   name:'#penny-qa',               status:'Active',  health:'healthy',           owner:'Admin',            secondary:'QA channel · 5 members',        purpose:'Penny capability testing, scenario validation, and QA logging. Admin use only.', memberCount:5, botAccess:false, pennyEnabled:true, programs:['All Programs'], governanceStatus:'compliant', lastActivity:'2h ago',  notes:'All test scenarios should target this channel first.' },
  { id:'prof-et-cohort3',   objectType:'channel',   name:'#explorers-cohort-3',    status:'Active',  health:'incomplete',        owner:'Unassigned',       secondary:'Cohort channel · 15 members',   purpose:"Explorer's Trail Cohort 3 delivery channel. Not yet connected to Trail OS.", memberCount:15, botAccess:false, pennyEnabled:false, programs:["Explorer's Trail"], governanceStatus:'missing-metadata', lastActivity:'Unknown', notes:'No owner assigned. Bot access missing. Not yet mapped to Trail OS programs.' },
  { id:'prof-leadership',   objectType:'channel',   name:'#team-leadership',        status:'Active',  health:'incomplete',        owner:'Executive Director',secondary:'Leadership channel · 4 members', purpose:'Executive brief delivery, cross-program KPIs, and leadership-level Penny Intelligence.', memberCount:4, botAccess:false, pennyEnabled:false, programs:['All Programs'], governanceStatus:'missing-metadata', lastActivity:'1w ago', notes:'Executive channel. Bot access not granted. Executive Brief blocked.' },
  // User groups
  { id:'prof-ug-coaches',   objectType:'usergroup', name:'@coaches',                status:'Active',  health:'needs-attention',   owner:'Admin',            secondary:'User group · 3 of 3 coaches',   purpose:'All active coaches. Used for coach brief routing and coaching escalation DM delivery.', memberCount:3, botAccess:undefined, pennyEnabled:true, programs:['Foundations Trail','Guided Trail'], governanceStatus:'compliant', lastActivity:'1d ago', notes:'Linda K. (coach.linda) not yet Penny-enabled.' },
  { id:'prof-ug-learners',  objectType:'usergroup', name:'@foundations-cohort-2',   status:'Active',  health:'needs-attention',   owner:'Program Lead',     secondary:'User group · 14 of 17 learners', purpose:'Foundations Trail Cohort 2 learner group for direct Penny coaching DM delivery.', memberCount:14, botAccess:undefined, pennyEnabled:true, programs:['Foundations Trail'], governanceStatus:'needs-review', lastActivity:'3h ago', notes:'3 learners not yet added to user group. im:write scope needed for DMs.' },
  { id:'prof-ug-leadership',objectType:'usergroup', name:'@leadership',             status:'Active',  health:'incomplete',        owner:'Admin',             secondary:'User group · 2 executives',     purpose:'Executive team user group for leadership-level Penny Intelligence delivery.', memberCount:2, botAccess:undefined, pennyEnabled:false, programs:['All Programs'], governanceStatus:'missing-metadata', lastActivity:'Unknown', notes:'usergroups:read scope not yet active. Mapping incomplete.' },
  { id:'prof-ug-volunteers',objectType:'usergroup', name:'@volunteers',             status:'Planned', health:'incomplete',        owner:'Unassigned',        secondary:'User group · not configured',   purpose:'Volunteer group for program support communication. Not yet set up in Trail OS.', memberCount:0, botAccess:undefined, pennyEnabled:false, programs:['Foundations Trail'], governanceStatus:'non-compliant', lastActivity:'Never', notes:'Volunteer role-to-user mapping missing. Needs user group creation in Slack.' },
  // Templates
  { id:'prof-tmpl-nudge',   objectType:'template',  name:'Coaching Nudge',          status:'Active',  health:'healthy',           owner:'Penny Lead',        secondary:'Template v2.1 · Coaching',      purpose:'Personalised coaching nudge delivered by Learning Coach to individual learners at struggle signals.', programs:['Foundations Trail','Guided Trail'], governanceStatus:'compliant', lastActivity:'1d ago', notes:'Sprint-aware. Includes learner name, current sprint, and recommended action.' },
  { id:'prof-tmpl-brief',   objectType:'template',  name:'Coach Brief',             status:'Active',  health:'healthy',           owner:'Penny Lead',        secondary:'Template v1.3 · Operations',    purpose:'Weekly coach briefing including at-risk learners, upcoming milestones, and coaching priorities.', programs:['Foundations Trail','Guided Trail'], governanceStatus:'compliant', lastActivity:'2d ago', notes:'Learner-aware. Pulls from Program Health and Learner Confidence data.' },
  { id:'prof-tmpl-exec',    objectType:'template',  name:'Executive Brief',         status:'Draft',   health:'needs-attention',   owner:'Standards Lead',    secondary:'Template v1.0 · Leadership',    purpose:'Weekly cross-program health summary for executive team. KPI-focused, milestone-aware.', programs:['All Programs'], governanceStatus:'needs-review', lastActivity:'Never', notes:'Draft template. Awaiting approval before activation. Executive channel access also missing.' },
  { id:'prof-tmpl-esc',     objectType:'template',  name:'Escalation Alert',        status:'Active',  health:'healthy',           owner:'Penny Lead',        secondary:'Template v1.1 · Escalation',   purpose:'At-risk learner escalation alert to lead coach. Includes confidence score, missing check-ins, and recommended response.', programs:['Foundations Trail'], governanceStatus:'compliant', lastActivity:'3d ago', notes:'Highest priority delivery. Requires im:write scope for DM component.' },
];

// ── Operational Scenarios ─────────────────────────────────────────────────────

export const OPERATIONAL_SCENARIOS: OperationalScenario[] = [
  {
    id: 'scenario-weekly-reflection',
    name: 'Weekly Reflection Delivery',
    category: 'Coaching',
    trigger: 'Scheduled — Friday 3pm',
    description: 'Penny Learning Coach delivers sprint-aligned reflection prompts to all active cohort learners. Penny is aware of the current sprint, recent learner activity, and confidence levels.',
    status: 'Partially Ready',
    readinessScore: 62,
    programs: ['Foundations Trail', 'Guided Trail'],
    pennyCapability: 'Learning Coach',
    destination: '#foundations-cohort-2, #guided-trail',
    flow: [
      { step:1, type:'trigger',  label:'Friday 3pm Trigger',     detail:'Scheduled event from Trail OS calendar',   status:'ready'   },
      { step:2, type:'program',  label:'Sprint Data Lookup',     detail:'Current sprint, week, cohort status',       status:'ready'   },
      { step:3, type:'penny',    label:'Learning Coach Invoked', detail:'Penny resolves learner context from UOM',   status:'ready'   },
      { step:4, type:'template', label:'Reflection Prompt Built',detail:'Template v2.1 personalised per learner',    status:'ready'   },
      { step:5, type:'channel',  label:'Channel Delivery',       detail:'#foundations-cohort-2 — bot pending',       status:'pending' },
      { step:6, type:'delivery', label:'Message Sent',           detail:'Requires bot token + channel access',       status:'blocked' },
      { step:7, type:'signal',   label:'Activity Event Logged',  detail:'delivery_confirmed → Ops Intelligence',     status:'blocked' },
    ],
    blockers: ['Bot token not configured', 'SLACK_BOT_TOKEN environment secret missing', 'Bot not invited to #foundations-cohort-2'],
  },
  {
    id: 'scenario-coach-brief',
    name: 'Coach Brief Delivery',
    category: 'Briefing',
    trigger: 'Scheduled — Monday 7am',
    description: 'Penny Chief of Staff assembles a weekly coaching brief covering at-risk learners, upcoming milestones, session focus, and coaching priorities. Delivered to coach channels before the coaching session.',
    status: 'Partially Ready',
    readinessScore: 68,
    programs: ['Foundations Trail', 'Guided Trail'],
    pennyCapability: 'Coach Support (Chief of Staff)',
    destination: '#foundations-coaches',
    flow: [
      { step:1, type:'trigger',  label:'Monday 7am Trigger',     detail:'Scheduled event from Trail OS calendar',   status:'ready'   },
      { step:2, type:'program',  label:'Program Health Query',   detail:'At-risk flags, confidence scores, milestones', status:'ready' },
      { step:3, type:'penny',    label:'Chief of Staff Invoked', detail:'Penny assembles coach brief from UOM data',  status:'ready'   },
      { step:4, type:'template', label:'Coach Brief Built',      detail:'Template v1.3 with at-risk learner list',    status:'ready'   },
      { step:5, type:'channel',  label:'Channel Delivery',       detail:'#foundations-coaches — bot pending',         status:'pending' },
      { step:6, type:'delivery', label:'Message Sent',           detail:'Requires bot token + channel access',        status:'blocked' },
      { step:7, type:'signal',   label:'Delivery Logged',        detail:'coach_brief_delivered → Program Health',     status:'blocked' },
    ],
    blockers: ['Bot token not configured', 'Bot not invited to #foundations-coaches'],
  },
  {
    id: 'scenario-exec-brief',
    name: 'Executive Brief Delivery',
    category: 'Briefing',
    trigger: 'Scheduled — Monday 8am',
    description: 'Penny Chief of Staff delivers a cross-program executive brief with program health KPIs, cohort progress, operational signals, and upcoming milestone alerts to the leadership channel.',
    status: 'Blocked',
    readinessScore: 35,
    programs: ['All Programs'],
    pennyCapability: 'Executive Briefs (Chief of Staff)',
    destination: '#team-leadership',
    flow: [
      { step:1, type:'trigger',  label:'Monday 8am Trigger',     detail:'Scheduled event from Trail OS calendar',   status:'ready'   },
      { step:2, type:'program',  label:'Cross-Program Rollup',   detail:'All 5 programs · aggregate health data',   status:'ready'   },
      { step:3, type:'penny',    label:'Chief of Staff Invoked', detail:'Executive Brief capability — Planned state', status:'pending' },
      { step:4, type:'template', label:'Executive Brief Built',  detail:'Template v1.0 — draft, not approved',       status:'pending' },
      { step:5, type:'channel',  label:'Channel Delivery',       detail:'#team-leadership — bot access missing',     status:'blocked' },
      { step:6, type:'delivery', label:'Message Sent',           detail:'Requires approved template + channel access',status:'blocked' },
      { step:7, type:'signal',   label:'Leadership Signal',      detail:'exec_brief_delivered → Executive Dashboard', status:'blocked' },
    ],
    blockers: ['Bot token not configured', '#team-leadership bot access missing', 'Executive Brief template not yet approved', 'Executive Brief capability in Planned state (not Prototype)'],
  },
  {
    id: 'scenario-escalation',
    name: 'Escalation Routing',
    category: 'Escalation',
    trigger: 'Event — confidence < 65% or 2+ missed check-ins',
    description: 'At-risk learner signal triggers Penny Coaching Escalation, which routes a structured alert to the responsible coach via channel notification and direct message. Logs to #penny-qa for validation.',
    status: 'Partially Ready',
    readinessScore: 71,
    programs: ['Foundations Trail'],
    pennyCapability: 'Coaching Escalation',
    destination: '#foundations-coaches + DM to lead coach',
    flow: [
      { step:1, type:'trigger',  label:'At-Risk Signal Detected',detail:'Confidence < 65% or missed check-in event',  status:'ready'   },
      { step:2, type:'program',  label:'Learner Context Query',  detail:'Sprint position, confidence, history',        status:'ready'   },
      { step:3, type:'penny',    label:'Escalation Invoked',     detail:'Coaching Escalation — Defined state',         status:'ready'   },
      { step:4, type:'template', label:'Escalation Alert Built', detail:'Template v1.1 with learner + action summary', status:'ready'   },
      { step:5, type:'channel',  label:'Channel Notification',   detail:'#foundations-coaches — bot pending',          status:'pending' },
      { step:6, type:'delivery', label:'DM to Lead Coach',       detail:'Requires im:write scope (admin approval pending)', status:'blocked' },
      { step:7, type:'signal',   label:'Support Signal Logged',  detail:'escalation_triggered → Learner Support',      status:'pending' },
    ],
    blockers: ['Bot token not configured', 'im:write scope pending admin approval', 'Bot not invited to #foundations-coaches'],
  },
  {
    id: 'scenario-announcement',
    name: 'Program Announcement Delivery',
    category: 'Announcement',
    trigger: 'Event — program milestone or admin trigger',
    description: 'Program milestones, sprint completions, and cohort celebrations delivered to the cohort channel and #team-general. Penny Cohort Summaries generates the announcement content.',
    status: 'Blocked',
    readinessScore: 28,
    programs: ['All Programs'],
    pennyCapability: 'Cohort Summaries',
    destination: '#team-general + cohort channels',
    flow: [
      { step:1, type:'trigger',  label:'Milestone Event',        detail:'Sprint complete / program milestone',         status:'ready'   },
      { step:2, type:'program',  label:'Milestone Data',         detail:'Sprint, learner outcomes, cohort stats',       status:'ready'   },
      { step:3, type:'penny',    label:'Cohort Summaries',       detail:'Planned state — not yet prototype',            status:'pending' },
      { step:4, type:'template', label:'Announcement Built',     detail:'Template v1.0 — pending creation',            status:'pending' },
      { step:5, type:'channel',  label:'Multi-Channel Delivery', detail:'#team-general + cohort channels — bot pending',status:'blocked' },
      { step:6, type:'delivery', label:'Message Sent',           detail:'Requires all channel bot access + templates',  status:'blocked' },
      { step:7, type:'signal',   label:'Cohort Signal',          detail:'announcement_delivered → Program Dashboard',   status:'blocked' },
    ],
    blockers: ['Bot token not configured', 'Cohort Summaries capability in Planned state', 'Announcement template not created', 'Multiple channels missing bot access'],
  },
];

// ── Governance Issues ─────────────────────────────────────────────────────────

export const GOVERNANCE_ISSUES: GovernanceIssue[] = [
  { id:'gi-001', severity:'Critical', category:'Configuration',    title:'Bot User OAuth Token not configured',        detail:'SLACK_BOT_TOKEN is not set in environment secrets. This is the primary blocker for all Slack operations.', affectedObjects:['All Channels','All Deliveries','All Scenarios'], resolution:'Set SLACK_BOT_TOKEN in Replit environment secrets. Obtain from Slack App Dashboard → OAuth & Permissions.', status:'Open' },
  { id:'gi-002', severity:'Critical', category:'Configuration',    title:'Signing Secret missing',                     detail:'SLACK_SIGNING_SECRET not configured. Cannot verify incoming Slack event payloads.', affectedObjects:['Event Subscriptions','Webhook Handlers'], resolution:'Set SLACK_SIGNING_SECRET from Slack App Dashboard → Basic Information → App Credentials.', status:'Open' },
  { id:'gi-003', severity:'High',     category:'Permission',       title:'App not installed to workspace',              detail:'Slack app exists in development but has not been installed to the Transition Trails Slack workspace.', affectedObjects:['All API Operations'], resolution:'Complete Slack OAuth 2.0 installation flow. Admin approval may be required.', status:'Open' },
  { id:'gi-004', severity:'High',     category:'Missing Mapping',  title:'#explorers-cohort-3 has no Trail OS owner',   detail:'Channel has 15 members but no owner assigned in Trail OS. No program mapping.', affectedObjects:["#explorers-cohort-3","Explorer's Trail"], resolution:"Assign channel to Explorer's Trail program in Program-to-Channel mapping. Set owner to Program Lead.", status:'Open' },
  { id:'gi-005', severity:'High',     category:'Missing Mapping',  title:'Volunteer role has no Slack user mapping',    detail:'6 volunteers are active in programs but none are mapped to Slack users or user groups.', affectedObjects:['@volunteers','Volunteer Role'], resolution:'Create @volunteers Slack user group. Map volunteer Slack handles in Role-to-User mapping.', status:'Open' },
  { id:'gi-006', severity:'High',     category:'Permission',       title:'im:write scope pending admin approval',       detail:'Direct message delivery for Penny coaching nudges and escalation DMs requires im:write scope, which needs Slack workspace admin approval.', affectedObjects:['Learning Coach DMs','Escalation Routing'], resolution:'Request workspace admin to approve im:write scope in Slack Admin → Manage Apps.', status:'In Progress' },
  { id:'gi-007', severity:'Medium',   category:'Ownership',        title:'#team-leadership has no Trail OS owner',      detail:'Executive channel exists but ownership is not recorded in Trail OS. Executive Brief template is also in draft.', affectedObjects:['#team-leadership','Executive Brief Template'], resolution:"Assign Executive Director as owner. Approve Executive Brief template v1.0.", status:'Open' },
  { id:'gi-008', severity:'Medium',   category:'Missing Mapping',  title:'3 Guided Trail channels missing bot access',  detail:'#guided-trail-coaches has no bot access and is not mapped to any Trail OS role.', affectedObjects:['#guided-trail-coaches'], resolution:'Invite @trail-os-bot to #guided-trail-coaches. Map to Coach role for Guided Trail.', status:'Open' },
  { id:'gi-009', severity:'Medium',   category:'Permission',       title:'files:read scope not declared in manifest',   detail:'8 of 9 required scopes are declared. files:read is missing, blocking file attachment delivery in templates.', affectedObjects:['File Attachment Templates'], resolution:'Add files:read to Slack app manifest before next installation.', status:'Open' },
  { id:'gi-010', severity:'Low',      category:'Inactive',         title:'#penny-archive channel inactive for 90+ days', detail:'Channel exists in Slack workspace but has had no activity for 90+ days and is not mapped to any program.', affectedObjects:['#penny-archive'], resolution:'Archive channel in Slack or repurpose. Remove from Trail OS channel registry if archiving.', status:'Open' },
];

// ── Expanded Test Suites ──────────────────────────────────────────────────────

export const TEST_SUITES: TestSuite[] = [
  {
    id: 'suite-secrets',
    name: 'Secret Validation',
    category: 'Secret Validation',
    icon: 'Key',
    description: 'Validates that all required environment secrets are configured and the correct format.',
    tests: [
      { id:'tv-01', name:'SLACK_BOT_TOKEN present',        description:'Verify SLACK_BOT_TOKEN is set in environment secrets.',               status:'fail',    result:'Secret not found. Set SLACK_BOT_TOKEN in Replit environment.',                        blockedBy:undefined },
      { id:'tv-02', name:'SLACK_BOT_TOKEN format',         description:'Verify token begins with xoxb- (bot token format).',                   status:'blocked', result:'Cannot validate format — secret not set.',                                            blockedBy:'SLACK_BOT_TOKEN not configured' },
      { id:'tv-03', name:'SLACK_SIGNING_SECRET present',   description:'Verify SLACK_SIGNING_SECRET is set in environment secrets.',           status:'fail',    result:'Secret not found. Set SLACK_SIGNING_SECRET.',                                          blockedBy:undefined },
      { id:'tv-04', name:'SLACK_SIGNING_SECRET format',    description:'Verify signing secret is 32+ characters (Slack standard).',            status:'blocked', result:'Cannot validate format — secret not set.',                                            blockedBy:'SLACK_SIGNING_SECRET not configured' },
      { id:'tv-05', name:'OAuth redirect URI configured',  description:'Verify OAuth callback URL is set and reachable.',                      status:'warning', result:'URI is configured but app not installed. Cannot verify reachability until installed.',  blockedBy:undefined },
    ],
  },
  {
    id: 'suite-permissions',
    name: 'Permission Validation',
    category: 'Permission Validation',
    icon: 'Shield',
    description: 'Validates all required bot and user permission scopes are granted.',
    tests: [
      { id:'pv-01', name:'channels:read granted',   description:'Bot can list public channels in workspace.',     status:'blocked', result:'Cannot test — app not installed.',  blockedBy:'App not installed to workspace' },
      { id:'pv-02', name:'chat:write granted',       description:'Bot can send messages to channels.',            status:'blocked', result:'Cannot test — app not installed.',  blockedBy:'App not installed to workspace' },
      { id:'pv-03', name:'users:read granted',       description:'Bot can read workspace user directory.',        status:'blocked', result:'Cannot test — app not installed.',  blockedBy:'App not installed to workspace' },
      { id:'pv-04', name:'usergroups:read granted',  description:'Bot can read user group memberships.',          status:'blocked', result:'Cannot test — app not installed.',  blockedBy:'App not installed to workspace' },
      { id:'pv-05', name:'im:write granted',         description:'Bot can open direct message channels.',         status:'blocked', result:'Cannot test — pending admin approval for im:write scope.',  blockedBy:'Admin approval pending' },
      { id:'pv-06', name:'files:read declared',      description:'files:read scope declared in app manifest.',    status:'fail',    result:'Scope not found in manifest. Add files:read before next installation.',  blockedBy:undefined },
    ],
  },
  {
    id: 'suite-channel-access',
    name: 'Channel Access',
    category: 'Channel Access',
    icon: 'Hash',
    description: 'Tests that Trail OS bot has access to all required Slack channels.',
    tests: [
      { id:'ca-01', name:'#foundations-cohort-2 bot access', description:'Bot member of #foundations-cohort-2.',  status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
      { id:'ca-02', name:'#foundations-coaches bot access',  description:'Bot member of #foundations-coaches.',   status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
      { id:'ca-03', name:'#guided-trail bot access',         description:'Bot member of #guided-trail.',          status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
      { id:'ca-04', name:'#team-general bot access',         description:'Bot member of #team-general.',          status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
      { id:'ca-05', name:'#penny-qa bot access',             description:'Bot member of #penny-qa.',              status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
      { id:'ca-06', name:'#team-leadership bot access',      description:'Bot member of #team-leadership.',       status:'blocked', result:'Cannot test — bot not installed.', blockedBy:'App not installed' },
    ],
  },
  {
    id: 'suite-delivery',
    name: 'Message Delivery Simulation',
    category: 'Message Delivery',
    icon: 'Send',
    description: 'Simulated message delivery tests using mock data against #penny-qa before live channel delivery.',
    tests: [
      { id:'md-01', name:'#penny-qa test message delivery',         description:'Send test message to #penny-qa to verify bot posting.',      status:'blocked', result:'Cannot test — bot token missing.',                 blockedBy:'SLACK_BOT_TOKEN not configured' },
      { id:'md-02', name:'Block Kit template rendering',            description:'Render Coaching Nudge template as Block Kit JSON.',           status:'pass',    result:'Template renders correctly as valid Block Kit JSON. Ready for delivery.', blockedBy:undefined },
      { id:'md-03', name:'Rich text formatting validation',         description:'Validate Markdown, bold, emoji in all active templates.',     status:'pass',    result:'All 4 active templates pass format validation.',  blockedBy:undefined },
      { id:'md-04', name:'Personalisation token replacement',       description:'Verify {learner_name}, {sprint}, {coach} tokens resolve.',   status:'pass',    result:'All personalisation tokens resolve correctly with mock data.', blockedBy:undefined },
      { id:'md-05', name:'Escalation DM routing simulation',        description:'Simulate im:write DM to lead coach via mock channel.',        status:'blocked', result:'im:write scope pending admin approval.',          blockedBy:'im:write admin approval pending' },
    ],
  },
  {
    id: 'suite-mapping',
    name: 'Mapping Integrity',
    category: 'Mapping Integrity',
    icon: 'GitMerge',
    description: 'Validates completeness and consistency of all Program-to-Channel, Role-to-User, and Penny-to-Channel mappings.',
    tests: [
      { id:'mi-01', name:'All active programs have channel mappings',  description:'Every active program mapped to at least one Slack channel.',  status:'pass',    result:'3 active programs all have channel mappings. 2 planning programs have partial mappings.', blockedBy:undefined },
      { id:'mi-02', name:'All coach roles have Slack user mapping',    description:'Every coach role has at least one Slack user assigned.',      status:'warning', result:'2 of 3 coaches mapped. coach.linda not yet Penny-enabled.', blockedBy:undefined },
      { id:'mi-03', name:'All Penny capabilities have delivery routes',description:'Every active Penny capability has at least one delivery route.',status:'warning', result:'4 of 6 capabilities have delivery routes. Trail Quests and Cohort Summaries missing.', blockedBy:undefined },
      { id:'mi-04', name:'No orphaned channels in registry',           description:'All channels in registry are mapped to at least one program.', status:'fail',    result:'#explorers-cohort-3 and #penny-archive have no program mapping.', blockedBy:undefined },
      { id:'mi-05', name:'All templates linked to capabilities',       description:'Every active template is linked to a Penny capability.',       status:'pass',    result:'All 4 active templates are linked to Penny capabilities.',  blockedBy:undefined },
    ],
  },
  {
    id: 'suite-governance',
    name: 'Governance',
    category: 'Governance',
    icon: 'ClipboardCheck',
    description: 'Validates governance compliance for all channels, user groups, and templates.',
    tests: [
      { id:'gv-01', name:'All channels have assigned owners',      description:'Every active channel has an owner in Trail OS.',          status:'fail',    result:'2 channels missing owners: #explorers-cohort-3, #team-leadership.', blockedBy:undefined },
      { id:'gv-02', name:'No non-compliant channels',              description:'All channels meet Trail OS governance standards.',        status:'fail',    result:'1 non-compliant channel: @volunteers user group not created.', blockedBy:undefined },
      { id:'gv-03', name:'All templates are version-controlled',   description:'Every template has a version number and review date.',   status:'pass',    result:'All 4 active templates are version-controlled.', blockedBy:undefined },
      { id:'gv-04', name:'No inactive channels unmaintained >30d', description:'Inactive channels reviewed and actioned within 30 days.',status:'fail',    result:'#penny-archive inactive for 90+ days with no action recorded.', blockedBy:undefined },
      { id:'gv-05', name:'All role mappings have a primary owner', description:'Every role group has at least one Trail OS owner.',       status:'warning', result:'Volunteer role and Curriculum Designer role have incomplete ownership records.', blockedBy:undefined },
    ],
  },
  {
    id: 'suite-e2e',
    name: 'End-to-End Flow',
    category: 'End-to-End Flow',
    icon: 'Workflow',
    description: 'End-to-end communication flow tests validating the full path from trigger to operational intelligence signal.',
    tests: [
      { id:'e2e-01', name:'Weekly Reflection full flow',     description:'Program → Channel → Penny → Template → Message → Activity → Signal', status:'blocked', result:'Blocked at message delivery step. Bot token required.',                   blockedBy:'SLACK_BOT_TOKEN not configured' },
      { id:'e2e-02', name:'Coach Brief full flow',           description:'Health Query → Coaches Channel → Chief of Staff → Brief → Message',  status:'blocked', result:'Blocked at message delivery step. Bot token required.',                   blockedBy:'SLACK_BOT_TOKEN not configured' },
      { id:'e2e-03', name:'Escalation routing full flow',    description:'At-risk signal → Coaches channel + DM → Alert → Activity → Support', status:'blocked', result:'Blocked at delivery. Bot token + im:write scope required.',               blockedBy:'SLACK_BOT_TOKEN + im:write pending' },
      { id:'e2e-04', name:'Mock data flow to #penny-qa',     description:'Full scenario delivery using mock data to #penny-qa channel.',        status:'blocked', result:'Bot not installed. Mock delivery cannot be validated.',                   blockedBy:'App not installed' },
      { id:'e2e-05', name:'Activity event round-trip',       description:'Message delivery → Activity event logged → Ops Intelligence update.', status:'pending', result:'Activity event structure is defined. Cannot validate until delivery works.', blockedBy:'Delivery blocked upstream' },
    ],
  },
  {
    id: 'suite-poc',
    name: 'POC Restoration',
    category: 'POC Restoration',
    icon: 'FlaskConical',
    description: 'Validates restoration of the known-working POC state: Penny AI channel, Agentforce coexistence, assessment quiz flow, bot membership, and Trail OS event recording.',
    tests: [
      { id:'poc-01', name:'Multi-channel bot membership confirmed',    description:'Trail OS Bot is a confirmed member of both Penny AI channel and admin channel.',                    status:'pending', result:'Pending — bot needs to be invited to the Penny AI channel. Set SLACK_PENNY_CHANNEL_ID and run /invite @trail-os-bot.', blockedBy:'Bot invite to Penny AI channel' },
      { id:'poc-02', name:'User mention → Penny response',             description:'User @mentions Penny in Penny AI channel; Penny (Gemini) responds within expected latency.',        status:'pending', result:'Pending — bot channel access not yet confirmed. Restore channel access first.', blockedBy:'Bot not in Penny AI channel' },
      { id:'poc-03', name:'Agentforce response in same channel',       description:'Agentforce (Penny–Transition Trails Assistant) responds in same channel as Penny/Gemini.',          status:'pending', result:'Pending — Agentforce integration layer needs re-confirmation after channel access restored.', blockedBy:'Channel access + Agentforce integration layer' },
      { id:'poc-04', name:'Bot coexistence — no conflict',             description:'Penny (Gemini) and Agentforce both respond without duplicating or conflicting messages.',           status:'pending', result:'Was confirmed working in POC screenshot. Pending re-validation once channel access restored.', blockedBy:'Channel access restoration' },
      { id:'poc-05', name:'Assessment quiz flow — initiation',         description:'User requests assessment; Penny routes to assessment template and delivers quiz in Slack.',        status:'pending', result:'Pending — assessment routing not yet wired to Penny delivery route.', blockedBy:'Assessment routing + channel access' },
      { id:'poc-06', name:'Assessment quiz flow — completion + record',description:'User completes quiz; Trail OS records result as an operational event in Operations Center.',       status:'pending', result:'Pending — Trail OS event recording bridge not yet connected to Slack interactions.', blockedBy:'Assessment flow + Trail OS events bridge' },
      { id:'poc-07', name:'Penny prompt routing via Prompt Studio',    description:'Penny responses are routed through Prompt Studio templates for coaching and assessment flows.',    status:'pending', result:'Pending — prompt template routing not yet confirmed for the restored Slack channel.', blockedBy:'Prompt Studio wiring' },
      { id:'poc-08', name:'Trail OS records Slack interaction event',  description:'A Slack message interaction triggers an operational event visible in the Operations Center.',      status:'pending', result:'Pending — event recording bridge not yet implemented between Slack and Trail OS ops layer.', blockedBy:'Ops event recording bridge' },
      { id:'poc-09', name:'Penny delivery graceful on missing channel',description:'Penny handles SLACK_CHANNEL_ID missing or invalid gracefully — returns structured error.',         status:'pass',    result:'Validation endpoint returns structured error with resolution guidance when channel is missing or inaccessible.', blockedBy:undefined },
      { id:'poc-10', name:'Multiple channel IDs validated independently',description:'SLACK_CHANNEL_ID, SLACK_PENNY_CHANNEL_ID, SLACK_ADMIN_CHANNEL_ID each validated and role-detected.',status:'pass', result:'API /slack/validate returns per-channel ChannelResult array. Role auto-detected from channel name.', blockedBy:undefined },
    ],
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getValidationSummary() {
  const pass    = VALIDATION_CHECKS.filter(c => c.status === 'pass').length;
  const fail    = VALIDATION_CHECKS.filter(c => c.status === 'fail').length;
  const warning = VALIDATION_CHECKS.filter(c => c.status === 'warning').length;
  const pending = VALIDATION_CHECKS.filter(c => c.status === 'pending').length;
  return { pass, fail, warning, pending, total: VALIDATION_CHECKS.length };
}

export function getGovernanceSummary() {
  const critical = GOVERNANCE_ISSUES.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
  const high     = GOVERNANCE_ISSUES.filter(i => i.severity === 'High'     && i.status !== 'Resolved').length;
  const medium   = GOVERNANCE_ISSUES.filter(i => i.severity === 'Medium'   && i.status !== 'Resolved').length;
  const low      = GOVERNANCE_ISSUES.filter(i => i.severity === 'Low'      && i.status !== 'Resolved').length;
  return { critical, high, medium, low, total: GOVERNANCE_ISSUES.length };
}

export function getTestSuiteSummary(suite: TestSuite) {
  const pass    = suite.tests.filter(t => t.status === 'pass').length;
  const fail    = suite.tests.filter(t => t.status === 'fail').length;
  const blocked = suite.tests.filter(t => t.status === 'blocked').length;
  const warning = suite.tests.filter(t => t.status === 'warning').length;
  const pct     = Math.round((pass / suite.tests.length) * 100);
  return { pass, fail, blocked, warning, pct, total: suite.tests.length };
}

export function getOverallTestSummary() {
  const all   = TEST_SUITES.flatMap(s => s.tests);
  const pass  = all.filter(t => t.status === 'pass').length;
  const fail  = all.filter(t => t.status === 'fail').length;
  const blocked = all.filter(t => t.status === 'blocked').length;
  const pct   = Math.round((pass / all.length) * 100);
  return { pass, fail, blocked, total: all.length, pct };
}

export function getScenarioSummary() {
  const ready   = OPERATIONAL_SCENARIOS.filter(s => s.status === 'Ready').length;
  const partial = OPERATIONAL_SCENARIOS.filter(s => s.status === 'Partially Ready').length;
  const blocked = OPERATIONAL_SCENARIOS.filter(s => s.status === 'Blocked').length;
  const avgScore = Math.round(OPERATIONAL_SCENARIOS.reduce((sum, s) => sum + s.readinessScore, 0) / OPERATIONAL_SCENARIOS.length);
  return { ready, partial, blocked, avgScore, total: OPERATIONAL_SCENARIOS.length };
}

// ── POC Restoration Data ──────────────────────────────────────────────────────

export type PocStatus = 'confirmed-working' | 'tested' | 'designed' | 'planned';

export interface PocWorkingItem {
  id: string;
  capability: string;
  status: PocStatus;
  channel: string;
  note: string;
  testedDate: string;
  linkedTo: string[];
}

export interface PocChannelRecord {
  role: 'penny' | 'admin';
  channelName: string;
  envVarHint: string;
  recommendedEnvVar: string;
  testedStatus: PocStatus;
  botsPresent: string[];
  featuresTested: string[];
}

export interface PocBot {
  id: string;
  name: string;
  platform: string;
  role: string;
  colorCls: string;
  status: 'confirmed' | 'planned';
}

export interface PocRestoreItem {
  step: string;
  note: string;
  done: boolean;
  status: string;
}

export interface PocIntegrationLink {
  id: string;
  label: string;
  description: string;
  route: string;
  status: 'operational' | 'partial' | 'planned';
  category: 'penny' | 'agentforce' | 'assessment' | 'slack' | 'trail-os';
}

export const POC_WORKING_ITEMS: PocWorkingItem[] = [
  { id:'poc-1', capability:'Penny AI Channel — Penny (Gemini) Active',         status:'confirmed-working', channel:'Penny AI',      note:'Penny (Gemini) was responding to user messages in the Penny AI Slack channel during the POC.',                               testedDate:'Prior to June 2026', linkedTo:['Penny Integration Layer','Capability Registry'] },
  { id:'poc-2', capability:'Agentforce Active in Penny AI Channel',            status:'confirmed-working', channel:'Penny AI',      note:'Agentforce (Penny–Transition Trails Assistant) was observed responding in the same Penny AI channel as Penny/Gemini.',        testedDate:'Prior to June 2026', linkedTo:['Agentforce Integration','Penny Integration Layer'] },
  { id:'poc-3', capability:'Bot Coexistence — Penny + Agentforce',             status:'confirmed-working', channel:'Penny AI',      note:'Both bots responded in the same channel without conflict. Confirmed via screenshot showing both responding simultaneously.',   testedDate:'Prior to June 2026', linkedTo:['Slack Integration Center'] },
  { id:'poc-4', capability:'Assessment Quiz Flow Tested',                      status:'confirmed-working', channel:'Penny AI',      note:'Assessment quiz functionality was tested in the POC. Quiz flow was initiated and completed in Slack.',                         testedDate:'Prior to June 2026', linkedTo:['Assessment','Penny Integration Layer'] },
  { id:'poc-5', capability:'Admin Channel — Tested',                           status:'tested',            channel:'Admin Channel', note:'The admin/ops channel was tested for operational notifications and bot access during the POC.',                                testedDate:'Prior to June 2026', linkedTo:['Operations Center'] },
  { id:'poc-6', capability:'Connected Agentforce (Salesforce-backed)',          status:'confirmed-working', channel:'Penny AI',      note:'Connected Agentforce (Salesforce-backed Penny–Transition Trails Assistant) was active and responding in the POC.',             testedDate:'Prior to June 2026', linkedTo:['Salesforce Integration','Agentforce'] },
];

export const POC_BOTS_CONFIRMED: PocBot[] = [
  { id:'bot-penny-gemini', name:'Penny (Gemini)',                    platform:'Gemini / Trail OS',    role:'Learner coaching, assessments, weekly briefs, Trail Quests',                  colorCls:'border-pink-200 bg-pink-50 text-pink-700',       status:'confirmed' },
  { id:'bot-agentforce',   name:'Penny–Transition Trails Assistant', platform:'Agentforce / Salesforce', role:'Connected agent, Salesforce-backed responses, escalation',               colorCls:'border-sky-200 bg-sky-50 text-sky-700',          status:'confirmed' },
  { id:'bot-trail-os',     name:'Trail OS Bot',                      platform:'Trail OS / Slack API', role:'Delivery routing, event recording, system notifications, test messages',     colorCls:'border-emerald-200 bg-emerald-50 text-emerald-700', status:'confirmed' },
];

export const POC_CHANNELS_RECORD: PocChannelRecord[] = [
  {
    role: 'penny',
    channelName: 'Penny AI',
    envVarHint: 'Set SLACK_PENNY_CHANNEL_ID to this channel ID, or ensure SLACK_CHANNEL_ID points to the Penny AI channel.',
    recommendedEnvVar: 'SLACK_PENNY_CHANNEL_ID',
    testedStatus: 'confirmed-working',
    botsPresent: ['Penny (Gemini)', 'Agentforce / Penny-Transition Trails Assistant', 'Trail OS Bot'],
    featuresTested: ['Penny response to user mentions', 'Agentforce response in same channel', 'Assessment quiz flow', 'Bot coexistence confirmed', 'Connected Agentforce (Salesforce) active'],
  },
  {
    role: 'admin',
    channelName: 'Admin / Ops Channel',
    envVarHint: 'Set SLACK_ADMIN_CHANNEL_ID to the admin/ops channel ID used in the POC.',
    recommendedEnvVar: 'SLACK_ADMIN_CHANNEL_ID',
    testedStatus: 'tested',
    botsPresent: ['Trail OS Bot'],
    featuresTested: ['Bot access confirmed', 'Admin notifications', 'Ops alerts'],
  },
];

export const POC_RESTORE_CHECKLIST: PocRestoreItem[] = [
  { step:'Bot Token (SLACK_BOT_TOKEN) configured',            note:'Required for all Slack API operations.',                                   done:true,  status:'Completed' },
  { step:'Signing Secret (SLACK_SIGNING_SECRET) configured',  note:'Required for event payload verification.',                                 done:true,  status:'Completed' },
  { step:'Bot token passes auth.test with Slack API',         note:'Confirms the token is valid and the bot user is active.',                  done:true,  status:'Completed' },
  { step:'Penny AI channel ID configured (SLACK_PENNY_CHANNEL_ID)', note:'SLACK_PENNY_CHANNEL_ID set in Replit Secrets — Penny AI channel explicitly targeted.', done:true, status:'Completed' },
  { step:'Admin channel ID configured (SLACK_ADMIN_CHANNEL_ID)',    note:'SLACK_ADMIN_CHANNEL_ID set in Replit Secrets — admin/ops channel explicitly targeted.', done:true, status:'Completed' },
  { step:'Add channels:read + groups:read scopes to bot token', note:'Required for conversations.info to discover channel names, privacy, and member counts. Add in Slack App → OAuth & Permissions → Bot Token Scopes, then reinstall.', done:false, status:'Action needed — add scopes in Slack App' },
  { step:'Invite bot to Penny AI channel',                    note:'Run /invite @penny inside the Penny AI Slack channel.',          done:false, status:'Pending — confirm bot name first' },
  { step:'Verify bot membership in Penny AI channel',         note:'conversations.info should return is_member: true for the Penny AI channel.', done:false, status:'Pending scope + invite' },
  { step:'Confirm assessment flow routing in Prompt Studio',  note:'Assessment quiz templates wired to Penny delivery for the restored channel.', done:false, status:'In progress' },
  { step:'Confirm Agentforce integration layer path',         note:'Agentforce integration configured to respond in the restored Penny AI channel.', done:false, status:'In progress' },
  { step:'End-to-end: user mention → Penny response',         note:'Full flow validated: user @mentions Penny → Penny responds in Penny AI channel.', done:false, status:'Pending scope + membership' },
];

export const POC_INTEGRATION_LINKS: PocIntegrationLink[] = [
  { id:'link-penny-layer',   label:'Penny Integration Layer',  description:'Penny/Gemini capability wiring, Agentforce handoff path, and delivery routing configuration.', route:'/penny/integration-layer', status:'partial',  category:'penny' },
  { id:'link-prompt-studio', label:'Prompt Studio',            description:'Prompt templates for Penny responses, assessment quizzes, and coaching nudges.',                route:'/penny/prompt-studio',     status:'partial',  category:'penny' },
  { id:'link-capabilities',  label:'Capability Registry',      description:'All registered Penny capabilities including assessment, Trail Quests, weekly briefs.',           route:'/penny/capabilities',      status:'partial',  category:'penny' },
  { id:'link-assessments',   label:'Assessment Functionality', description:'Assessment quiz flow tested in POC. Template routing and Slack delivery configuration.',          route:'/penny/assessments',       status:'partial',  category:'assessment' },
  { id:'link-agentforce',    label:'Agentforce Handoff',       description:'Connected Agentforce (Salesforce) bot configuration for Slack channel coexistence.',              route:'/admin/integrations',      status:'planned',  category:'agentforce' },
  { id:'link-sf-valid',      label:'Salesforce Validation',    description:'Salesforce integration status and Agentforce (Penny–Transition Trails) configuration.',           route:'/program/sf-validation',   status:'partial',  category:'agentforce' },
  { id:'link-ops-center',    label:'Operations Center',        description:'Trail OS operational event recording from Slack interactions — program health intelligence.',     route:'/operations/program-health',status:'planned', category:'trail-os' },
  { id:'link-slack-valid',   label:'Workspace Validation',     description:'Live Slack token, channel access, and bot membership validation against real Slack API.',        route:'/collaboration/slack/validation', status:'operational', category:'slack' },
];
