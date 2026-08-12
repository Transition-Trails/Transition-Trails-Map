// Slack Integration Center — comprehensive data for Trail OS Slack integration
// Covers workspace config, channels, user-role mapping, Penny integration,
// templates, activity, governance, health scorecards, and test scenarios.

// ── Types ─────────────────────────────────────────────────────────────────────
export type ChannelLifecycle = 'active' | 'archived' | 'planned' | 'deprecated';
export type ChannelPurpose   = 'cohort' | 'coach' | 'program' | 'internal' | 'announcement' | 'penny' | 'executive' | 'admin';
export type ReadinessLevel   = 'ready' | 'partial' | 'not-ready' | 'planned';
export type RoleType         = 'learner' | 'coach' | 'program-lead' | 'curriculum-designer' | 'volunteer' | 'executive-director' | 'admin';

export interface SlackWorkspace {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  memberCount: number;
  channelCount: number;
  activeChannels: number;
  plan: string;
  oauthStatus: 'connected' | 'pending' | 'not-configured';
  botUser: string;
  environment: 'production' | 'staging' | 'development';
  lastSynced: string;
  permissionsGranted: string[];
  permissionsMissing: string[];
  validationStatus: 'passing' | 'partial' | 'failing';
  validationNotes: string;
  webhookUrl?: string;
  signingSecret: 'configured' | 'missing';
  botToken: 'configured' | 'missing';
  userToken: 'configured' | 'missing';
}

export interface SlackChannel {
  id: string;
  name: string;
  purpose: ChannelPurpose;
  topic: string;
  description: string;
  memberCount: number;
  lifecycle: ChannelLifecycle;
  owner: string;
  ownerPersonaId?: string;
  relatedProgram?: string;
  relatedCohort?: string;
  relatedRole?: string;
  pennyEnabled: boolean;
  pennyCapabilities: string[];
  governanceStatus: 'compliant' | 'missing-metadata' | 'needs-review' | 'archived';
  health: 'healthy' | 'needs-attention' | 'incomplete' | 'unknown';
  healthNote: string;
  messageFrequency: 'high' | 'medium' | 'low' | 'none';
  createdAt: string;
  archivePolicy: string;
  uomObjectId?: string;
}

export interface SlackUserMapping {
  id: string;
  slackDisplayName: string;
  slackUserId: string;
  trailOsPersonaId: string;
  trailOsPersonaName: string;
  roleType: RoleType;
  roleLabel: string;
  relatedPrograms: string[];
  relatedCohorts: string[];
  pennyEnabled: boolean;
  mappingStatus: 'mapped' | 'partial' | 'unmapped';
  healthStatus: 'healthy' | 'needs-attention' | 'incomplete';
}

export interface PennySlackCapability {
  id: string;
  capabilityName: string;
  capabilityId: string;
  enabledChannels: string[];
  deliveryTrigger: string;
  triggerCondition: string;
  outputFormat: string;
  escalationChannel?: string;
  readiness: 'operational' | 'in-development' | 'planned';
  promptTemplateId?: string;
  qualityScore?: number;
}

export interface SlackTemplate {
  id: string;
  name: string;
  purpose: string;
  audience: string;
  trigger: string;
  pennyGenerated: boolean;
  promptTemplateId?: string;
  channel: string;
  readiness: ReadinessLevel;
  lastUpdated: string;
  previewText: string;
}

export interface SlackActivityEvent {
  id: string;
  timestamp: string;
  type: 'penny' | 'communication' | 'governance' | 'channel' | 'user' | 'system';
  channel?: string;
  actor: string;
  summary: string;
  detail?: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

export interface SlackGovernanceRecord {
  objectType: 'channel' | 'workspace' | 'user-mapping' | 'template';
  name: string;
  owner: string;
  lifecycleStatus: ChannelLifecycle;
  reviewCadence: string;
  lastReview?: string;
  nextReview?: string;
  complianceStatus: 'compliant' | 'partial' | 'non-compliant';
  issues: string[];
}

export interface SlackHealthScore {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'ready' | 'partial' | 'not-ready';
  note: string;
  items: { label: string; status: 'pass' | 'partial' | 'fail'; note: string }[];
}

export interface SlackTestScenario {
  id: string;
  category: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'accessibility' | 'performance' | 'governance';
  status: 'passing' | 'partial' | 'pending' | 'failing';
  coverage: number;
  automatable: boolean;
  mockable: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ── Slack Workspace ──────────────────────────────────────────────────────────
export const SLACK_WORKSPACE: SlackWorkspace = {
  id: 'transition-trails-slack',
  name: 'Transition Trails',
  displayName: 'Transition Trails Workspace',
  domain: 'transitiontrails',
  memberCount: 47,
  channelCount: 22,
  activeChannels: 18,
  plan: 'Pro',
  oauthStatus: 'pending',
  botUser: '@penny-bot',
  environment: 'development',
  lastSynced: 'Not yet synced',
  permissionsGranted: [
    'channels:read', 'channels:history', 'channels:join',
    'chat:write', 'chat:write.public',
    'users:read', 'users:read.email',
    'groups:read', 'groups:history',
    'files:read', 'reactions:read',
  ],
  permissionsMissing: [
    'channels:manage',
    'users:write',
    'admin.conversations:read',
    'workflow.steps:read',
    'workflow.steps:execute',
  ],
  validationStatus: 'partial',
  validationNotes: 'OAuth pending. Bot token and signing secret not yet configured. Core read scopes documented. Write scopes require Slack workspace admin approval.',
  webhookUrl: undefined,
  signingSecret: 'missing',
  botToken: 'missing',
  userToken: 'missing',
};

// ── Slack Channels ────────────────────────────────────────────────────────────
export const SLACK_CHANNELS: SlackChannel[] = [
  {
    id: 'foundations-cohort-2',
    name: '#foundations-cohort-2',
    purpose: 'cohort',
    topic: 'Foundations Trail Cohort 2 — Week 6 of 8',
    description: 'Primary cohort channel for Foundations Trail Cohort 2. Learner check-ins, sprint updates, Penny reflections, and coach communication.',
    memberCount: 16,
    lifecycle: 'active',
    owner: 'Coach (Foundations)',
    ownerPersonaId: 'coach',
    relatedProgram: 'Foundations Trail',
    relatedCohort: 'Cohort 2',
    relatedRole: 'Learner',
    pennyEnabled: true,
    pennyCapabilities: ['learning-coach', 'trail-quest-runner', 'weekly-brief'],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Active. 3+ messages per day. Penny delivery on schedule.',
    messageFrequency: 'high',
    createdAt: 'Mar 2025',
    archivePolicy: 'Archive 30 days after cohort completion',
    uomObjectId: 'channel-foundations-c2',
  },
  {
    id: 'foundations-coaches',
    name: '#foundations-coaches',
    purpose: 'coach',
    topic: 'Coach channel — Foundations Trail',
    description: 'Private channel for Foundations Trail coaches. Weekly briefs from Penny, learner at-risk alerts, cohort summaries.',
    memberCount: 4,
    lifecycle: 'active',
    owner: 'Program Lead',
    ownerPersonaId: 'program-lead',
    relatedProgram: 'Foundations Trail',
    relatedCohort: undefined,
    relatedRole: 'Coach',
    pennyEnabled: true,
    pennyCapabilities: ['coach-support', 'weekly-brief'],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Weekly briefs delivered Monday 8am. Coach response rate 100%.',
    messageFrequency: 'medium',
    createdAt: 'Feb 2025',
    archivePolicy: 'Archive when program retires',
    uomObjectId: 'channel-foundations-coaches',
  },
  {
    id: 'guided-trail-general',
    name: '#guided-trail-general',
    purpose: 'program',
    topic: 'Guided Trail — Program Channel',
    description: 'General channel for Guided Trail program. Cohort 1 planning and announcements.',
    memberCount: 9,
    lifecycle: 'active',
    owner: 'Program Lead',
    ownerPersonaId: 'program-lead',
    relatedProgram: 'Guided Trail',
    relatedCohort: 'Cohort 1 (Planning)',
    relatedRole: undefined,
    pennyEnabled: false,
    pennyCapabilities: [],
    governanceStatus: 'missing-metadata',
    health: 'needs-attention',
    healthNote: 'Missing channel purpose and governance record. Penny not yet enabled.',
    messageFrequency: 'low',
    createdAt: 'May 2025',
    archivePolicy: 'TBD',
    uomObjectId: undefined,
  },
  {
    id: 'penny-qa',
    name: '#penny-qa',
    purpose: 'penny',
    topic: 'Penny quality assurance and prompt testing',
    description: 'Internal channel for Penny AI testing, prompt QA, and response quality review. Team-only.',
    memberCount: 6,
    lifecycle: 'active',
    owner: 'Penny Lead',
    ownerPersonaId: 'curriculum-designer',
    relatedProgram: undefined,
    relatedCohort: undefined,
    relatedRole: 'Curriculum Designer',
    pennyEnabled: true,
    pennyCapabilities: ['knowledge-retrieval'],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Active QA channel. Test delivery confirmed.',
    messageFrequency: 'medium',
    createdAt: 'Jan 2025',
    archivePolicy: 'Never archive',
    uomObjectId: 'channel-penny-qa',
  },
  {
    id: 'team-general',
    name: '#general',
    purpose: 'internal',
    topic: 'Transition Trails team workspace',
    description: 'General team channel for Transition Trails organisation.',
    memberCount: 47,
    lifecycle: 'active',
    owner: 'Executive Director',
    ownerPersonaId: 'executive-director',
    relatedProgram: undefined,
    relatedCohort: undefined,
    relatedRole: undefined,
    pennyEnabled: false,
    pennyCapabilities: [],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Managed by admin. No Penny delivery required.',
    messageFrequency: 'medium',
    createdAt: 'Jan 2024',
    archivePolicy: 'Never archive',
    uomObjectId: undefined,
  },
  {
    id: 'program-announcements',
    name: '#program-announcements',
    purpose: 'announcement',
    topic: 'Program news and announcements',
    description: 'Read-only announcements channel for all learners and coaches. Penny weekly summaries posted here.',
    memberCount: 41,
    lifecycle: 'active',
    owner: 'Program Director',
    ownerPersonaId: 'program-lead',
    relatedProgram: undefined,
    relatedCohort: undefined,
    relatedRole: undefined,
    pennyEnabled: true,
    pennyCapabilities: ['weekly-brief'],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Weekly Penny summaries posting on schedule.',
    messageFrequency: 'low',
    createdAt: 'Feb 2024',
    archivePolicy: 'Never archive',
    uomObjectId: 'channel-announcements',
  },
  {
    id: 'exec-briefs',
    name: '#exec-briefs',
    purpose: 'executive',
    topic: 'Executive program briefs',
    description: 'Private channel for executive director and program leads. Penny executive summaries delivered weekly.',
    memberCount: 3,
    lifecycle: 'active',
    owner: 'Executive Director',
    ownerPersonaId: 'executive-director',
    relatedProgram: undefined,
    relatedCohort: undefined,
    relatedRole: 'Executive Director',
    pennyEnabled: true,
    pennyCapabilities: ['weekly-brief'],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Weekly executive brief delivered Mondays.',
    messageFrequency: 'low',
    createdAt: 'Apr 2025',
    archivePolicy: 'Never archive',
    uomObjectId: 'channel-exec-briefs',
  },
  {
    id: 'trail-os-ops',
    name: '#trail-os-ops',
    purpose: 'admin',
    topic: 'Trail OS platform operations and alerts',
    description: 'Operational alerts, Trail OS status updates, governance notifications, and Penny error escalation.',
    memberCount: 5,
    lifecycle: 'active',
    owner: 'Platform Lead',
    ownerPersonaId: 'admin',
    relatedProgram: undefined,
    relatedCohort: undefined,
    relatedRole: 'Admin',
    pennyEnabled: false,
    pennyCapabilities: [],
    governanceStatus: 'compliant',
    health: 'healthy',
    healthNote: 'Operational alerts channel. Ready for automated routing.',
    messageFrequency: 'low',
    createdAt: 'Mar 2025',
    archivePolicy: 'Never archive',
    uomObjectId: 'channel-trail-os-ops',
  },
  {
    id: 'explorers-trail-c1',
    name: "#explorers-trail-c1",
    purpose: 'cohort',
    topic: "Explorer's Trail Cohort 1",
    description: "Cohort channel for Explorer's Trail Cohort 1. Penny integration planned, not yet enabled.",
    memberCount: 14,
    lifecycle: 'active',
    owner: 'Coach (Explorers)',
    ownerPersonaId: 'coach',
    relatedProgram: "Explorer's Trail",
    relatedCohort: 'Cohort 1',
    relatedRole: 'Learner',
    pennyEnabled: false,
    pennyCapabilities: [],
    governanceStatus: 'needs-review',
    health: 'needs-attention',
    healthNote: "Penny not yet enabled. Blueprint compliance pending for Explorer's Trail.",
    messageFrequency: 'medium',
    createdAt: 'Apr 2025',
    archivePolicy: 'Archive 30 days after cohort completion',
    uomObjectId: undefined,
  },
  {
    id: 'foundations-c1-archive',
    name: '#foundations-cohort-1',
    purpose: 'cohort',
    topic: 'Foundations Trail Cohort 1 — Archived',
    description: 'Archived cohort channel from Foundations Trail Cohort 1 (completed Jan 2025). Retained for retrospective reference.',
    memberCount: 0,
    lifecycle: 'archived',
    owner: 'Program Lead',
    ownerPersonaId: 'program-lead',
    relatedProgram: 'Foundations Trail',
    relatedCohort: 'Cohort 1',
    relatedRole: 'Learner',
    pennyEnabled: false,
    pennyCapabilities: [],
    governanceStatus: 'archived',
    health: 'unknown',
    healthNote: 'Archived. Retained for 12 months per governance policy.',
    messageFrequency: 'none',
    createdAt: 'Sep 2024',
    archivePolicy: 'Retained until Sep 2026, then deleted',
    uomObjectId: undefined,
  },
];

// ── User / Role Mappings ──────────────────────────────────────────────────────
export const SLACK_USER_MAPPINGS: SlackUserMapping[] = [
  { id:'map-1', slackDisplayName:'Alex J.',      slackUserId:'U01A', trailOsPersonaId:'learner',              trailOsPersonaName:'Learner',            roleType:'learner',             roleLabel:'Learner',            relatedPrograms:['Foundations Trail'], relatedCohorts:['Cohort 2'], pennyEnabled:true,  mappingStatus:'mapped',   healthStatus:'healthy' },
  { id:'map-2', slackDisplayName:'Jordan C.',    slackUserId:'U02B', trailOsPersonaId:'coach',                trailOsPersonaName:'Coach',              roleType:'coach',               roleLabel:'Coach',              relatedPrograms:['Foundations Trail'], relatedCohorts:['Cohort 2'], pennyEnabled:true,  mappingStatus:'mapped',   healthStatus:'healthy' },
  { id:'map-3', slackDisplayName:'Sam T.',       slackUserId:'U03C', trailOsPersonaId:'program-lead',         trailOsPersonaName:'Program Lead',       roleType:'program-lead',        roleLabel:'Program Lead',       relatedPrograms:['Foundations Trail','Guided Trail'], relatedCohorts:[], pennyEnabled:true, mappingStatus:'mapped', healthStatus:'healthy' },
  { id:'map-4', slackDisplayName:'Morgan R.',    slackUserId:'U04D', trailOsPersonaId:'curriculum-designer',  trailOsPersonaName:'Curriculum Designer',roleType:'curriculum-designer',  roleLabel:'Curriculum Designer',relatedPrograms:['Foundations Trail'], relatedCohorts:[], pennyEnabled:true,  mappingStatus:'mapped',   healthStatus:'healthy' },
  { id:'map-5', slackDisplayName:'Casey L.',     slackUserId:'U05E', trailOsPersonaId:'volunteer',            trailOsPersonaName:'Volunteer',          roleType:'volunteer',           roleLabel:'Volunteer',          relatedPrograms:['Foundations Trail'], relatedCohorts:['Cohort 2'], pennyEnabled:false, mappingStatus:'partial', healthStatus:'needs-attention' },
  { id:'map-6', slackDisplayName:'Dr. Simmons',  slackUserId:'U06F', trailOsPersonaId:'executive-director',   trailOsPersonaName:'Executive Director', roleType:'executive-director',  roleLabel:'Executive Director', relatedPrograms:['Foundations Trail','Guided Trail',"Explorer's Trail"], relatedCohorts:[], pennyEnabled:true, mappingStatus:'mapped', healthStatus:'healthy' },
  { id:'map-7', slackDisplayName:'River K.',     slackUserId:'U07G', trailOsPersonaId:'admin',                trailOsPersonaName:'Platform Admin',     roleType:'admin',               roleLabel:'Admin',              relatedPrograms:[], relatedCohorts:[], pennyEnabled:false, mappingStatus:'mapped', healthStatus:'healthy' },
  { id:'map-8', slackDisplayName:'Quinn M.',     slackUserId:'U08H', trailOsPersonaId:'learner',              trailOsPersonaName:'Learner',            roleType:'learner',             roleLabel:'Learner',            relatedPrograms:["Explorer's Trail"], relatedCohorts:['Cohort 1'], pennyEnabled:false, mappingStatus:'partial', healthStatus:'needs-attention' },
  { id:'map-9', slackDisplayName:'Sage P.',      slackUserId:'U09I', trailOsPersonaId:'coach',                trailOsPersonaName:'Coach',              roleType:'coach',               roleLabel:'Coach',              relatedPrograms:["Explorer's Trail"], relatedCohorts:['Cohort 1'], pennyEnabled:false, mappingStatus:'partial', healthStatus:'needs-attention' },
  { id:'map-10',slackDisplayName:'Unknown User', slackUserId:'U10J', trailOsPersonaId:'',                     trailOsPersonaName:'—',                  roleType:'learner',             roleLabel:'Unmapped',           relatedPrograms:[], relatedCohorts:[], pennyEnabled:false, mappingStatus:'unmapped', healthStatus:'incomplete' },
];

// ── Penny–Slack Integration ───────────────────────────────────────────────────
export const PENNY_SLACK_CAPABILITIES: PennySlackCapability[] = [
  {
    id:'psc-1', capabilityName:'Learning Coach',      capabilityId:'learning-coach',
    enabledChannels:['#foundations-cohort-2'],
    deliveryTrigger:'Weekly sprint check-in',
    triggerCondition:'Every Monday 9am AEST during active sprint',
    outputFormat:'Slack message with sprint reflection questions',
    escalationChannel:'#foundations-coaches',
    readiness:'operational',
    promptTemplateId:'learning-coach-sprint-checkin',
    qualityScore:89,
  },
  {
    id:'psc-2', capabilityName:'Trail Quest Runner',  capabilityId:'trail-quest-runner',
    enabledChannels:['#foundations-cohort-2'],
    deliveryTrigger:'Sprint milestone',
    triggerCondition:'Triggered when learner completes sprint milestone in Salesforce',
    outputFormat:'Slack DM with quest challenge + due date',
    escalationChannel:'#foundations-coaches',
    readiness:'operational',
    promptTemplateId:'trail-quest-delivery',
    qualityScore:84,
  },
  {
    id:'psc-3', capabilityName:'Weekly Brief',        capabilityId:'weekly-brief',
    enabledChannels:['#foundations-coaches','#program-announcements','#exec-briefs'],
    deliveryTrigger:'Weekly schedule',
    triggerCondition:'Every Monday 8am AEST',
    outputFormat:'Formatted Slack message with cohort summary, highlights, and next steps',
    escalationChannel:'#trail-os-ops',
    readiness:'operational',
    promptTemplateId:'weekly-brief-generator',
    qualityScore:91,
  },
  {
    id:'psc-4', capabilityName:'Coach Support',       capabilityId:'coach-support',
    enabledChannels:['#foundations-coaches'],
    deliveryTrigger:'At-risk learner flag',
    triggerCondition:'Triggered when learner misses check-in or assessment milestone',
    outputFormat:'Coach alert with learner name, status, and suggested action',
    escalationChannel:'#trail-os-ops',
    readiness:'in-development',
    promptTemplateId:undefined,
    qualityScore:undefined,
  },
  {
    id:'psc-5', capabilityName:'Resume Review',       capabilityId:'resume-review',
    enabledChannels:[],
    deliveryTrigger:'Learner submission',
    triggerCondition:'Planned: Learner DMs Penny with resume draft',
    outputFormat:'Planned: Structured review delivered as Slack message',
    escalationChannel:undefined,
    readiness:'planned',
    promptTemplateId:'resume-review-v2',
    qualityScore:87,
  },
  {
    id:'psc-6', capabilityName:'Knowledge Retrieval', capabilityId:'knowledge-retrieval',
    enabledChannels:['#penny-qa'],
    deliveryTrigger:'Slash command',
    triggerCondition:'Triggered by /penny ask [question] in enabled channels',
    outputFormat:'Knowledge-sourced answer with citation',
    escalationChannel:'#trail-os-ops',
    readiness:'in-development',
    promptTemplateId:'knowledge-retrieval-base',
    qualityScore:85,
  },
];

// ── Communication Templates ───────────────────────────────────────────────────
export const SLACK_TEMPLATES: SlackTemplate[] = [
  { id:'tpl-1', name:'Sprint Weekly Check-in',      purpose:'Learner weekly coaching message',     audience:'Learner',            trigger:'Weekly (Monday)',          pennyGenerated:true,  promptTemplateId:'learning-coach-sprint-checkin', channel:'#cohort-channels',     readiness:'ready',     lastUpdated:'Jun 2025', previewText:"Hi [Name], it's Week [N] of your program. This week we're focusing on [sprint topic]. Your check-in question: [question]" },
  { id:'tpl-2', name:'Weekly Coach Brief',          purpose:'Coach cohort summary and alerts',     audience:'Coach',              trigger:'Weekly (Monday 8am)',      pennyGenerated:true,  promptTemplateId:'weekly-brief-generator',        channel:'#foundations-coaches',  readiness:'ready',     lastUpdated:'Jun 2025', previewText:'📋 Coach Brief — Week [N]: [N] learners active. [N] on track, [N] at risk. Key actions: [actions]' },
  { id:'tpl-3', name:'Executive Weekly Summary',    purpose:'Program-level executive summary',     audience:'Executive Director', trigger:'Weekly (Monday)',          pennyGenerated:true,  promptTemplateId:'weekly-brief-generator',        channel:'#exec-briefs',          readiness:'ready',     lastUpdated:'Jun 2025', previewText:'🎯 Weekly Summary — [Program]: Cohort [N] Week [N]. Completion rate: [N]%. Highlights: [highlights]' },
  { id:'tpl-4', name:'Trail Quest Delivery',        purpose:'Learner quest challenge message',     audience:'Learner',            trigger:'Sprint milestone',         pennyGenerated:true,  promptTemplateId:'trail-quest-delivery',          channel:'#cohort-channels',     readiness:'ready',     lastUpdated:'May 2025', previewText:"🗺 Trail Quest — [Quest Name]: Here's your challenge for this sprint. [Quest description]. Due: [date]" },
  { id:'tpl-5', name:'At-Risk Learner Alert',       purpose:'Coach alert for learner at risk',     audience:'Coach',              trigger:'Missed milestone',         pennyGenerated:true,  promptTemplateId:undefined,                       channel:'#coach-channels',      readiness:'partial',   lastUpdated:'May 2025', previewText:'⚠ At-Risk Alert: [Learner Name] has missed [milestone]. Last activity: [date]. Suggested action: [action]' },
  { id:'tpl-6', name:'Sprint Completion Message',   purpose:'Learner sprint completion celebration',audience:'Learner',            trigger:'Sprint completion',        pennyGenerated:false, promptTemplateId:undefined,                       channel:'#cohort-channels',     readiness:'ready',     lastUpdated:'Apr 2025', previewText:"🎉 Congratulations [Name]! You've completed Sprint [N]. [Personal note]. What's next: [next sprint preview]" },
  { id:'tpl-7', name:'Welcome to Cohort',           purpose:'New learner onboarding message',      audience:'Learner',            trigger:'Cohort start',            pennyGenerated:false, promptTemplateId:undefined,                       channel:'#cohort-channels',     readiness:'ready',     lastUpdated:'Mar 2025', previewText:"👋 Welcome to [Program Name], [Name]! You're now part of [Cohort]. Here's everything you need to know: [info]" },
  { id:'tpl-8', name:'Trail OS Ops Alert',          purpose:'System and governance alerts',        audience:'Admin',              trigger:'System event',            pennyGenerated:false, promptTemplateId:undefined,                       channel:'#trail-os-ops',        readiness:'partial',   lastUpdated:'May 2025', previewText:'🔔 Trail OS Alert — [Type]: [Description]. Action required: [action]. Severity: [severity]' },
];

// ── Activity Feed ─────────────────────────────────────────────────────────────
export const SLACK_ACTIVITY: SlackActivityEvent[] = [
  { id:'ev-1',  timestamp:'Today 2:06am',  type:'system',    actor:'Trail OS',      summary:'AppContext updated — activeContext & recentContexts added', severity:'info' },
  { id:'ev-2',  timestamp:'Today 2:05am',  type:'system',    actor:'Trail OS',      summary:'ContextBar wired to AppShell — persistent context bar active', severity:'success' },
  { id:'ev-3',  timestamp:'Mon Jun 9',     type:'penny',     channel:'#foundations-cohort-2', actor:'Penny Bot', summary:'Sprint 3 Week 6 check-in delivered to 13 learners', detail:'Learning Coach prompt v1.3 | 100% delivery rate | Quality score: 89', severity:'success' },
  { id:'ev-4',  timestamp:'Mon Jun 9',     type:'penny',     channel:'#foundations-coaches',  actor:'Penny Bot', summary:'Coach brief delivered — Week 6 summary', detail:'13 learners active. 12 on track, 1 at risk (missed check-in).', severity:'success' },
  { id:'ev-5',  timestamp:'Mon Jun 9',     type:'penny',     channel:'#exec-briefs',          actor:'Penny Bot', summary:'Executive summary delivered', severity:'success' },
  { id:'ev-6',  timestamp:'Sun Jun 8',     type:'governance',actor:'Platform Lead',  summary:'Governance review completed — Channel Registry Q2 2025', severity:'info' },
  { id:'ev-7',  timestamp:'Sun Jun 8',     type:'channel',   channel:'#guided-trail-general', actor:'Program Lead', summary:'Channel #guided-trail-general created for Guided Trail', severity:'info' },
  { id:'ev-8',  timestamp:'Fri Jun 6',     type:'penny',     channel:'#foundations-cohort-2', actor:'Penny Bot', summary:'Trail Quest "LinkedIn Profile Sprint 3" delivered to learners', severity:'success' },
  { id:'ev-9',  timestamp:'Thu Jun 5',     type:'governance',actor:'Governance Engine', summary:'Channel #guided-trail-general flagged — missing metadata', severity:'warning' },
  { id:'ev-10', timestamp:'Tue Jun 3',     type:'user',      actor:'Morgan R.',     summary:'Penny-Slack integration mapping reviewed — Curriculum Designer', severity:'info' },
  { id:'ev-11', timestamp:'Mon Jun 2',     type:'penny',     channel:'#foundations-cohort-2', actor:'Penny Bot', summary:'Week 5 check-in — 100% engagement rate', severity:'success' },
  { id:'ev-12', timestamp:'May 2025',      type:'system',    actor:'Trail OS',      summary:'Slack Integration Center Phase 1 design completed', severity:'info' },
];

// ── Governance ────────────────────────────────────────────────────────────────
export const SLACK_GOVERNANCE: SlackGovernanceRecord[] = [
  { objectType:'workspace', name:'Transition Trails Workspace', owner:'Platform Lead', lifecycleStatus:'active', reviewCadence:'Quarterly', lastReview:'Mar 2025', nextReview:'Jun 2025', complianceStatus:'partial', issues:['OAuth not yet connected','Bot token missing','Signing secret not configured'] },
  { objectType:'channel',   name:'#foundations-cohort-2',       owner:'Coach (Foundations)', lifecycleStatus:'active', reviewCadence:'Per cohort', lastReview:'Mar 2025', nextReview:'Aug 2025', complianceStatus:'compliant', issues:[] },
  { objectType:'channel',   name:'#foundations-coaches',        owner:'Program Lead',         lifecycleStatus:'active', reviewCadence:'Quarterly', lastReview:'Apr 2025', nextReview:'Jul 2025', complianceStatus:'compliant', issues:[] },
  { objectType:'channel',   name:'#guided-trail-general',       owner:'Program Lead',         lifecycleStatus:'active', reviewCadence:'Quarterly', lastReview:undefined,   nextReview:'Jun 2025', complianceStatus:'partial', issues:['Missing channel purpose','No governance record','Penny not enabled'] },
  { objectType:'channel',   name:"#explorers-trail-c1",         owner:'Coach (Explorers)',    lifecycleStatus:'active', reviewCadence:'Per cohort', lastReview:undefined,   nextReview:'Jun 2025', complianceStatus:'partial', issues:["Blueprint compliance pending for Explorer's Trail","Penny not enabled"] },
  { objectType:'user-mapping', name:'Unmapped User (U10J)',      owner:'Platform Admin',       lifecycleStatus:'active', reviewCadence:'On-demand', lastReview:undefined,   nextReview:undefined,  complianceStatus:'non-compliant', issues:['No Trail OS persona assigned','No role mapping','Cannot receive Penny messages'] },
  { objectType:'template',  name:'At-Risk Learner Alert',       owner:'Penny Lead',           lifecycleStatus:'active', reviewCadence:'Quarterly', lastReview:'May 2025',  nextReview:'Aug 2025', complianceStatus:'partial', issues:['Prompt template not yet created','Readiness: partial'] },
];

// ── Health Scorecards ─────────────────────────────────────────────────────────
export const SLACK_HEALTH_SCORES: SlackHealthScore[] = [
  {
    dimension:'workspace',   label:'Workspace Readiness',
    score:45, maxScore:100,  status:'not-ready',
    note:'OAuth and bot configuration required before Penny delivery is possible.',
    items:[
      { label:'OAuth Connected',        status:'fail',    note:'Not yet connected — requires Slack admin approval' },
      { label:'Bot Token',              status:'fail',    note:'Missing — required for Penny message delivery' },
      { label:'Signing Secret',         status:'fail',    note:'Missing — required for webhook validation' },
      { label:'Read Permissions',       status:'pass',    note:'Core read scopes documented' },
      { label:'Write Permissions',      status:'partial', note:'Write scopes require admin approval' },
      { label:'Workspace Metadata',     status:'pass',    note:'47 members, 22 channels documented' },
      { label:'Environment Configured', status:'partial', note:'Development environment — production pending' },
    ],
  },
  {
    dimension:'channels',    label:'Channel Readiness',
    score:72, maxScore:100,  status:'partial',
    note:'Core cohort and coach channels are compliant. 3 channels need governance review.',
    items:[
      { label:'Channel Inventory Complete',   status:'pass',    note:'22 channels documented' },
      { label:'Active Channels Compliant',    status:'partial', note:'15/18 compliant, 3 need review' },
      { label:'Cohort Channels Ready',        status:'partial', note:'2/3 cohort channels Penny-enabled' },
      { label:'Coach Channels Ready',         status:'pass',    note:'All coach channels compliant' },
      { label:'Governance Records',           status:'partial', note:'18/22 channels have governance records' },
      { label:'Archive Policy Documented',    status:'partial', note:'14/22 channels have archive policy' },
      { label:'UOM Object Mappings',          status:'partial', note:'8/18 active channels mapped to UOM' },
    ],
  },
  {
    dimension:'users',       label:'User Mapping Readiness',
    score:80, maxScore:100,  status:'partial',
    note:'Core team mapped. 1 unmapped user and 2 partial mappings require attention.',
    items:[
      { label:'Learner Persona Mapped',         status:'partial', note:'2 learner mappings — 1 partial, 1 missing' },
      { label:'Coach Persona Mapped',           status:'partial', note:'2 coach mappings — 1 partial' },
      { label:'Program Lead Mapped',            status:'pass',    note:'Mapped and Penny-enabled' },
      { label:'Curriculum Designer Mapped',     status:'pass',    note:'Mapped and Penny-enabled' },
      { label:'Executive Director Mapped',      status:'pass',    note:'Mapped and Penny-enabled' },
      { label:'Volunteer Mapped',               status:'partial', note:'Partial — Penny not enabled' },
      { label:'Admin Mapped',                   status:'pass',    note:'Fully mapped' },
      { label:'Zero Unmapped Users',            status:'fail',    note:'1 unmapped user (U10J)' },
    ],
  },
  {
    dimension:'penny',       label:'Penny Integration Readiness',
    score:65, maxScore:100,  status:'partial',
    note:'3 capabilities operational, 2 in development, 1 planned. Bot connection is the main blocker.',
    items:[
      { label:'Bot Token Connected',           status:'fail',    note:'Blocker — prevents all Penny delivery' },
      { label:'Learning Coach Operational',    status:'pass',    note:'Operational — 89% quality score' },
      { label:'Weekly Brief Operational',      status:'pass',    note:'Operational — 91% quality score' },
      { label:'Trail Quest Operational',       status:'pass',    note:'Operational — 84% quality score' },
      { label:'Coach Support Ready',           status:'partial', note:'In development — prompt template pending' },
      { label:'Resume Review Ready',           status:'partial', note:'Planned — channel delivery not yet configured' },
      { label:'Knowledge Retrieval Ready',     status:'partial', note:'In development — QA channel only' },
      { label:'Escalation Routing Configured', status:'partial', note:'#trail-os-ops configured for 3/6 capabilities' },
    ],
  },
  {
    dimension:'governance',  label:'Governance Readiness',
    score:70, maxScore:100,  status:'partial',
    note:'Core governance structure in place. 3 channels and 1 user mapping need review.',
    items:[
      { label:'Channel Ownership Documented',      status:'partial', note:'17/22 channels have named owners' },
      { label:'Lifecycle Policy Defined',          status:'partial', note:'Policy defined, not all channels compliant' },
      { label:'Review Cadence Set',                status:'partial', note:'6/8 governance record types scheduled' },
      { label:'Archive Policy',                    status:'partial', note:'14/22 channels have archive policy' },
      { label:'Security Review',                   status:'fail',    note:'Security review requires OAuth + credentials' },
      { label:'UOM Object Model Compliance',       status:'partial', note:'8/18 active channels in UOM registry' },
    ],
  },
  {
    dimension:'production',  label:'Production Readiness',
    score:38, maxScore:100,  status:'not-ready',
    note:'Core design and data architecture complete. OAuth and credentials are the primary blockers for production.',
    items:[
      { label:'OAuth Connected',             status:'fail',    note:'Critical blocker' },
      { label:'Credentials Configured',      status:'fail',    note:'Bot token, signing secret, user token missing' },
      { label:'Data Architecture',           status:'pass',    note:'UOM types, governance model, channel registry complete' },
      { label:'Channel Registry',            status:'partial', note:'18/22 compliant channels' },
      { label:'User Mappings',               status:'partial', note:'1 unmapped, 3 partial' },
      { label:'Penny Capabilities',          status:'partial', note:'3 operational, 3 in-development/planned' },
      { label:'Test Coverage',               status:'partial', note:'Scenarios defined, automation pending' },
      { label:'Error Handling',              status:'partial', note:'Escalation routing partial — #trail-os-ops' },
      { label:'Monitoring & Alerting',       status:'fail',    note:'Not yet configured' },
    ],
  },
];

// ── Test Scenarios ────────────────────────────────────────────────────────────
export const SLACK_TESTS: SlackTestScenario[] = [
  // Workspace Connection
  { id:'t-01',  category:'Workspace Connection',  name:'OAuth token validation',                 description:'Verify OAuth token is valid and has required scopes',              type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-02',  category:'Workspace Connection',  name:'Bot user presence check',                description:'Confirm @penny-bot is in workspace and has correct permissions',   type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-03',  category:'Workspace Connection',  name:'Webhook signature validation',           description:'Validate Slack signing secret verification for incoming webhooks',  type:'unit',          status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-04',  category:'Workspace Connection',  name:'Workspace metadata retrieval',           description:'Fetch and validate workspace name, member count, plan type',        type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-05',  category:'Workspace Connection',  name:'Permission scope inventory',             description:'Enumerate granted permissions and flag missing required scopes',     type:'integration',   status:'partial', coverage:40,  automatable:true,  mockable:true,  priority:'high' },
  // Channel Registry
  { id:'t-06',  category:'Channel Registry',      name:'Channel list retrieval',                 description:'Fetch all public and private channels the bot has access to',       type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-07',  category:'Channel Registry',      name:'Channel metadata completeness',          description:'Validate that all active channels have required metadata fields',    type:'unit',          status:'partial', coverage:60,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-08',  category:'Channel Registry',      name:'Cohort channel lifecycle check',         description:'Verify cohort channels follow lifecycle policy (active→archived)',   type:'governance',    status:'partial', coverage:50,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-09',  category:'Channel Registry',      name:'Penny-enabled channel validation',       description:'Confirm all Penny-enabled channels have the bot as a member',       type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-10',  category:'Channel Registry',      name:'UOM object mapping completeness',        description:'Verify all cohort and coach channels have UOM object IDs',          type:'governance',    status:'partial', coverage:45,  automatable:true,  mockable:false, priority:'medium' },
  // User & Role Mapping
  { id:'t-11',  category:'User & Role Mapping',   name:'All Slack users mapped to personas',     description:'Verify no unmapped active Slack users exist',                       type:'unit',          status:'partial', coverage:80,  automatable:true,  mockable:false, priority:'critical' },
  { id:'t-12',  category:'User & Role Mapping',   name:'Learner persona Penny enablement',       description:'Verify all learner-mapped users receive Penny messages',            type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-13',  category:'User & Role Mapping',   name:'Coach role escalation routing',          description:'Confirm at-risk alerts route to correct coach channels',            type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-14',  category:'User & Role Mapping',   name:'Role change propagation',                description:'Test role changes propagate to Penny delivery channels',            type:'e2e',           status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'medium' },
  // Penny Integration
  { id:'t-15',  category:'Penny Integration',     name:'Learning Coach delivery test',           description:'End-to-end test of weekly check-in delivery to cohort channel',    type:'e2e',           status:'partial', coverage:35,  automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-16',  category:'Penny Integration',     name:'Weekly Brief delivery test',             description:'Verify brief delivery to coach and exec channels on schedule',      type:'e2e',           status:'partial', coverage:40,  automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-17',  category:'Penny Integration',     name:'Trail Quest delivery test',              description:'Verify quest delivery triggered by Salesforce milestone event',      type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-18',  category:'Penny Integration',     name:'At-risk alert escalation test',          description:'Trigger at-risk condition and verify coach alert routing',          type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-19',  category:'Penny Integration',     name:'Prompt template rendering',              description:'Render all active prompt templates with mock learner data',         type:'unit',          status:'partial', coverage:65,  automatable:true,  mockable:true,  priority:'high' },
  { id:'t-20',  category:'Penny Integration',     name:'Hallucination / safety validation',      description:'Validate Penny outputs against safety guardrails before delivery',   type:'unit',          status:'partial', coverage:55,  automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-21',  category:'Penny Integration',     name:'Delivery rate monitoring',               description:'Confirm 100% delivery rate for all scheduled Penny messages',       type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:false, priority:'high' },
  // Governance
  { id:'t-22',  category:'Governance',            name:'Channel ownership completeness',         description:'All active channels have a named owner in the governance registry',  type:'governance',    status:'partial', coverage:75,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-23',  category:'Governance',            name:'Review cycle compliance',                description:'All overdue channel reviews are flagged and actioned',              type:'governance',    status:'partial', coverage:60,  automatable:true,  mockable:false, priority:'medium' },
  { id:'t-24',  category:'Governance',            name:'Archive policy enforcement',             description:'Archived channels follow retention policy',                         type:'governance',    status:'partial', coverage:70,  automatable:true,  mockable:false, priority:'medium' },
  { id:'t-25',  category:'Governance',            name:'Security readiness check',               description:'Signing secret, token storage, and access control validated',       type:'governance',    status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  // Object Relationship
  { id:'t-26',  category:'Object Relationships',  name:'Channel → Cohort mapping',               description:'Verify channel-to-cohort relationship in UOM registry',             type:'unit',          status:'passing', coverage:90,  automatable:true,  mockable:false, priority:'medium' },
  { id:'t-27',  category:'Object Relationships',  name:'Channel → Program mapping',              description:'Verify channel-to-program relationship in UOM registry',            type:'unit',          status:'passing', coverage:88,  automatable:true,  mockable:false, priority:'medium' },
  { id:'t-28',  category:'Object Relationships',  name:'User → Persona mapping integrity',       description:'Verify all user-persona mappings are consistent in UOM',            type:'unit',          status:'partial', coverage:70,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-29',  category:'Object Relationships',  name:'Penny capability → channel dependency',  description:'Verify capability-channel dependencies are correctly represented',   type:'unit',          status:'passing', coverage:85,  automatable:true,  mockable:false, priority:'high' },
  // Search & Context Engine
  { id:'t-30',  category:'Search & Context',      name:'Slack channels in search index',         description:'Verify all active channels appear in Global Search results',         type:'unit',          status:'partial', coverage:70,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-31',  category:'Search & Context',      name:'Context engine — channel context',        description:'Set a Slack channel as active context and verify workspace filtering',type:'integration',  status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-32',  category:'Search & Context',      name:'Relationship explorer — channel paths',   description:'Verify channel relationships in the relationship explorer',          type:'unit',          status:'passing', coverage:80,  automatable:true,  mockable:false, priority:'medium' },
  // Accessibility
  { id:'t-33',  category:'Accessibility',         name:'WCAG 2.1 AA compliance — Slack UI',       description:'All Slack Integration Center UI passes WCAG 2.1 Level AA',         type:'accessibility', status:'partial', coverage:60,  automatable:true,  mockable:false, priority:'high' },
  { id:'t-34',  category:'Accessibility',         name:'Keyboard navigation — Channel Registry',  description:'Channel list, detail tabs, and actions navigable via keyboard',      type:'accessibility', status:'partial', coverage:55,  automatable:true,  mockable:false, priority:'medium' },
  { id:'t-35',  category:'Accessibility',         name:'Screen reader — health scorecards',       description:'Health status badges and progress bars are screen-reader friendly',  type:'accessibility', status:'partial', coverage:50,  automatable:true,  mockable:false, priority:'medium' },
  // Performance
  { id:'t-36',  category:'Performance',           name:'Channel list load time < 500ms',          description:'Channel registry renders within 500ms with 50+ channels',            type:'performance',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'medium' },
  { id:'t-37',  category:'Performance',           name:'Penny delivery latency < 2s',             description:'End-to-end Penny → Slack delivery completes in under 2 seconds',    type:'performance',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
  { id:'t-38',  category:'Performance',           name:'Global Search — Slack results < 200ms',   description:'Slack objects returned in search results within 200ms',              type:'performance',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'medium' },
  // Error Handling
  { id:'t-39',  category:'Error Handling',        name:'OAuth failure graceful degradation',       description:'UI shows correct error state when OAuth token is invalid',          type:'unit',          status:'partial', coverage:65,  automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-40',  category:'Error Handling',        name:'Penny delivery failure escalation',        description:'Failed Penny delivery triggers #trail-os-ops alert',               type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'critical' },
  { id:'t-41',  category:'Error Handling',        name:'Channel not found handling',               description:'Graceful error when bot tries to post to archived/deleted channel', type:'unit',          status:'partial', coverage:55,  automatable:true,  mockable:true,  priority:'high' },
  { id:'t-42',  category:'Error Handling',        name:'Rate limiting compliance',                 description:'Verify Slack API rate limit handling with exponential backoff',      type:'integration',   status:'pending', coverage:0,   automatable:true,  mockable:true,  priority:'high' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getChannelsByPurpose(purpose: ChannelPurpose) {
  return SLACK_CHANNELS.filter(c => c.purpose === purpose);
}

export function getPennyEnabledChannels() {
  return SLACK_CHANNELS.filter(c => c.pennyEnabled && c.lifecycle === 'active');
}

export function getTestsByCategory(category: string) {
  return SLACK_TESTS.filter(t => t.category === category);
}

export function getTestCategories() {
  return Array.from(new Set(SLACK_TESTS.map(t => t.category)));
}

export function getOverallTestCoverage() {
  const avg = SLACK_TESTS.reduce((sum, t) => sum + t.coverage, 0) / SLACK_TESTS.length;
  return Math.round(avg);
}

export function getHealthScore(dimension: string) {
  return SLACK_HEALTH_SCORES.find(s => s.dimension === dimension);
}
