// ── Operational Intelligence Center — Data ─────────────────────────────────
// Aggregated health, readiness, trends, and recommendations for the OIC executive layer.

export type HealthLevel  = 'strong' | 'good' | 'needs-work' | 'at-risk';
export type RecPriority  = 'critical' | 'high' | 'medium' | 'low';
export type TrendType    = 'risk' | 'opportunity' | 'gap' | 'blocker';
export type TrendUrgency = 'immediate' | 'near-term' | 'watch';
export type ScorecardCat = 'Architecture' | 'Operations' | 'AI' | 'Data';

export const HEALTH_LEVEL_CONFIG: Record<HealthLevel, { label: string; cls: string; dot: string; score: string }> = {
  strong:       { label: 'Strong',       cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]', dot: 'bg-[#E6F0EA]0', score: 'text-[#2F6B3F]' },
  good:         { label: 'Good',         cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',          dot: 'bg-[#EDF5F8]0',   score: 'text-[#2F6F7E]' },
  'needs-work': { label: 'Needs Work',   cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',       dot: 'bg-[#FFF3E0]0',  score: 'text-[#CC8400]' },
  'at-risk':    { label: 'At Risk',      cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',          dot: 'bg-[#FBEAE6]0',   score: 'text-[#A93F2F]' },
};

export const REC_PRIORITY_CONFIG: Record<RecPriority, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
  high:     { label: 'High',     cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  medium:   { label: 'Medium',   cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  low:      { label: 'Low',      cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

export const TREND_TYPE_CONFIG: Record<TrendType, { label: string; cls: string }> = {
  risk:        { label: 'Risk',        cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
  opportunity: { label: 'Opportunity', cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' },
  gap:         { label: 'Gap',         cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  blocker:     { label: 'Blocker',     cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
};

export const TREND_URGENCY_CONFIG: Record<TrendUrgency, { label: string; cls: string }> = {
  immediate: { label: 'Immediate', cls: 'text-[#A93F2F] font-bold' },
  'near-term': { label: 'Near Term', cls: 'text-[#CC8400] font-semibold' },
  watch:     { label: 'Watch',     cls: 'text-slate-500' },
};

// ── HEALTH INDICATOR ─────────────────────────────────────────────────────────
export interface HealthIndicator {
  id: string;
  domain: string;
  label: string;
  status: HealthLevel;
  detail: string;
  sourceSystem: string;
  actionPath?: string;
  actionLabel?: string;
}

// ── DOMAIN HEALTH ─────────────────────────────────────────────────────────────
export interface DomainHealth {
  id: string;
  domain: string;
  score: number;
  level: HealthLevel;
  summary: string;
  indicators: HealthIndicator[];
  sourceSystem: string;
  relatedPrograms: string[];
  relatedStandards: string[];
  relatedPeople: string[];
  relatedPennyCapabilities: string[];
}

// ── RECOMMENDATION ────────────────────────────────────────────────────────────
export interface Recommendation {
  id: string;
  action: string;
  domain: string;
  priority: RecPriority;
  effort: 'Low' | 'Medium' | 'High';
  systems: string[];
  nextSteps: string[];
  status: 'open' | 'in-progress' | 'complete' | 'done';
}

// ── READINESS SCORECARD ───────────────────────────────────────────────────────
export interface ReadinessScorecard {
  id: string;
  title: string;
  category: ScorecardCat;
  score: number;
  level: HealthLevel;
  summary: string;
  dimensions: { label: string; score: number; level: HealthLevel; notes: string }[];
}

// ── TREND INSIGHT ─────────────────────────────────────────────────────────────
export interface TrendInsight {
  id: string;
  type: TrendType;
  urgency: TrendUrgency;
  title: string;
  description: string;
  affectedDomains: string[];
  affectedPrograms: string[];
  relatedSystems: string[];
  actionPath: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

export const domainHealthData: DomainHealth[] = [
  {
    id: 'dh-programs',
    domain: 'Programs',
    score: 72,
    level: 'good',
    summary: 'Five active programs with solid baseline structure. Foundations Trail and Guided Trail have the most complete health profiles. Penny coverage is active on three programs; Trail of Mastery and Digital Compass have it disabled.',
    indicators: [
      { id: 'prog-1', domain: 'Programs', label: 'Standards compliance',        status: 'good',         detail: 'Foundations Trail and Guided Trail meet curriculum standards. Explorer\'s Trail needs standards audit.', sourceSystem: 'Standards Studio' },
      { id: 'prog-2', domain: 'Programs', label: 'Assessment coverage',          status: 'needs-work',   detail: 'Trail of Mastery and Digital Compass lack complete assessment frameworks.', sourceSystem: 'Curriculum Studio',            actionPath: '/knowledge/library',    actionLabel: 'Open Curriculum Studio' },
      { id: 'prog-3', domain: 'Programs', label: 'Knowledge source coverage',    status: 'good',         detail: 'Core knowledge sources mapped to all active programs.', sourceSystem: 'Knowledge Source Registry' },
      { id: 'prog-4', domain: 'Programs', label: 'Penny capability coverage',    status: 'needs-work',   detail: 'Explorer\'s Trail, Foundations Trail, and Guided Trail have active Penny coverage. Trail of Mastery and Digital Compass have Penny disabled.', sourceSystem: 'Penny Capability Registry', actionPath: '/penny/capabilities',   actionLabel: 'Open Penny Capabilities' },
      { id: 'prog-5', domain: 'Programs', label: 'Communication readiness',      status: 'good',         detail: 'Slack and calendar mapped for active cohort programs.', sourceSystem: 'Communications & Collaboration' },
      { id: 'prog-6', domain: 'Programs', label: 'Role ownership',              status: 'good',         detail: 'All platform roles assigned. Prompt governance, knowledge management, and platform administration all have named owners.', sourceSystem: 'People & Roles Studio', actionPath: '/admin/people-access#owners', actionLabel: 'View Role Owners' },
      { id: 'prog-7', domain: 'Programs', label: 'Integration readiness',        status: 'needs-work',   detail: 'Salesforce PMM integration incomplete. Google Drive source mapping in progress.', sourceSystem: 'Integration Readiness Center', actionPath: '/admin/integrations',   actionLabel: 'Open Integration Hub' },
    ],
    sourceSystem: 'Curriculum Studio, Salesforce PMM',
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    relatedStandards: ['Learner Engagement Standard', 'Assessment Coverage Standard'],
    relatedPeople: ['Program Lead', 'Lead Coach', 'Curriculum Designer'],
    relatedPennyCapabilities: ['Study Coach', 'Trail Quests', 'Coach Briefs', 'Program Health Summaries'],
  },
  {
    id: 'dh-curriculum',
    domain: 'Curriculum',
    score: 78,
    level: 'good',
    summary: 'Curriculum Studio has strong content structures for Foundations Trail and Guided Trail. Standards Studio is operational with 12+ standards defined. Key gaps: Explorer\'s Trail blueprint compliance, incomplete knowledge article links, and overdue reviews on 3 standards.',
    indicators: [
      { id: 'curr-1', domain: 'Curriculum', label: 'Blueprint compliance',         status: 'good',       detail: 'Program Canvas (Program Blueprint) design standard is well-defined and referenced.', sourceSystem: 'Standards Studio' },
      { id: 'curr-2', domain: 'Curriculum', label: 'Missing learning objectives',  status: 'needs-work', detail: 'Explorer\'s Trail is missing learning objectives for Modules 4–6.', sourceSystem: 'Curriculum Studio',          actionPath: '/knowledge/library',   actionLabel: 'Open Curriculum Studio' },
      { id: 'curr-3', domain: 'Curriculum', label: 'Assessment coverage',          status: 'good',       detail: 'Foundations and Guided Trails have full assessment coverage.', sourceSystem: 'Curriculum Studio' },
      { id: 'curr-4', domain: 'Curriculum', label: 'Knowledge article links',      status: 'needs-work', detail: '8 knowledge articles not yet linked to curriculum modules.', sourceSystem: 'Knowledge Source Registry', actionPath: '/knowledge/sources',   actionLabel: 'Open Knowledge Sources' },
      { id: 'curr-5', domain: 'Curriculum', label: 'Overdue standards review',     status: 'needs-work', detail: '3 content standards have not been reviewed in 90+ days.', sourceSystem: 'Standards Studio',           actionPath: '/knowledge/sources',   actionLabel: 'Open Knowledge Sources' },
      { id: 'curr-6', domain: 'Curriculum', label: 'Prompt consistency',           status: 'good',       detail: 'Consistency review passed for all active Penny prompts.', sourceSystem: 'Penny Prompt Studio' },
      { id: 'curr-7', domain: 'Curriculum', label: 'Duplicate concept detection',  status: 'strong',     detail: 'No duplicate concepts detected in active modules.', sourceSystem: 'Standards Studio' },
    ],
    sourceSystem: 'Curriculum Studio, Standards Studio',
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    relatedStandards: ['Content Quality Standard', 'Prompt Governance Standard', 'Assessment Coverage Standard'],
    relatedPeople: ['Curriculum Designer', 'Penny Admin'],
    relatedPennyCapabilities: ['Curriculum Generation', 'Consistency Review', 'Prompt Quality Review'],
  },
  {
    id: 'dh-knowledge',
    domain: 'Knowledge',
    score: 65,
    level: 'needs-work',
    summary: 'Knowledge Source Registry has 6 sources registered with Penny approval, but trust levels are incomplete for 3 sources, 2 sources are overdue for review, and ownership gaps exist for newer sources.',
    indicators: [
      { id: 'know-1', domain: 'Knowledge', label: 'Source trust levels',          status: 'needs-work', detail: '3 of 9 sources missing trust level assignment.', sourceSystem: 'Knowledge Source Registry',    actionPath: '/knowledge/sources',  actionLabel: 'Open Knowledge Sources' },
      { id: 'know-2', domain: 'Knowledge', label: 'Penny-approved sources',       status: 'good',       detail: '6 sources Penny-approved. 3 pending approval.', sourceSystem: 'Knowledge Source Registry' },
      { id: 'know-3', domain: 'Knowledge', label: 'Stale content',                status: 'needs-work', detail: '2 sources not synced in 60+ days.', sourceSystem: 'Knowledge Source Registry',          actionPath: '/knowledge/sources',  actionLabel: 'Open Knowledge Sources' },
      { id: 'know-4', domain: 'Knowledge', label: 'Ownership coverage',           status: 'needs-work', detail: '2 sources have no assigned owner.', sourceSystem: 'Knowledge Source Registry',          actionPath: '/knowledge/sources',  actionLabel: 'Open Knowledge Sources' },
      { id: 'know-5', domain: 'Knowledge', label: 'Review cycle compliance',      status: 'needs-work', detail: 'Review cycles defined for 5 of 9 sources only.', sourceSystem: 'Knowledge Source Registry',    actionPath: '/knowledge/sources',  actionLabel: 'Open Knowledge Sources' },
      { id: 'know-6', domain: 'Knowledge', label: 'Salesforce integration',       status: 'needs-work', detail: 'Salesforce Knowledge (Knowledge__c) not yet synced.', sourceSystem: 'Integration Readiness Center', actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
    ],
    sourceSystem: 'Knowledge Source Registry',
    relatedPrograms: ['All programs'],
    relatedStandards: ['Source Trust Standard', 'Data Privacy Standard'],
    relatedPeople: ['Penny Admin', 'Salesforce Admin'],
    relatedPennyCapabilities: ['Source Control', 'Prompt Quality Review'],
  },
  {
    id: 'dh-penny',
    domain: 'Penny AI',
    score: 62,
    level: 'needs-work',
    summary: 'Core Penny capabilities are active and delivering value in learner coaching and trail quests. Governance gaps are the primary concern: formal Penny Admin role is unassigned, prompt governance SLA is undefined, and several advanced capabilities are prototype-only.',
    indicators: [
      { id: 'penny-1', domain: 'Penny AI', label: 'Capability maturity',         status: 'good',       detail: '14 capabilities defined; Study Coach, Trail Quests, and Consistency Review are active.', sourceSystem: 'Penny Capability Registry' },
      { id: 'penny-2', domain: 'Penny AI', label: 'Prompt readiness',            status: 'good',       detail: 'Prompt Studio operational. 20+ templates defined across domains.', sourceSystem: 'Penny Prompt Studio' },
      { id: 'penny-3', domain: 'Penny AI', label: 'Governance status',           status: 'at-risk',    detail: 'No formal Penny Admin assigned. Prompt governance SLA not defined.', sourceSystem: 'People & Roles Studio',       actionPath: '/admin/people-access', actionLabel: 'Assign Penny Admin' },
      { id: 'penny-4', domain: 'Penny AI', label: 'Source coverage',             status: 'needs-work', detail: 'Penny only has access to 6 of 9 registered knowledge sources.', sourceSystem: 'Knowledge Source Registry',  actionPath: '/knowledge/sources',   actionLabel: 'Open Knowledge Sources' },
      { id: 'penny-5', domain: 'Penny AI', label: 'Hallucination risk',          status: 'needs-work', detail: 'Quality review process in place but not fully automated.', sourceSystem: 'Penny Prompt Studio',           actionPath: '/penny/prompts',        actionLabel: 'Open Prompt Studio' },
      { id: 'penny-6', domain: 'Penny AI', label: 'Integration readiness',       status: 'needs-work', detail: 'Agentforce integration is planned; current Penny is standalone.', sourceSystem: 'Integration Readiness Center', actionPath: '/admin/integrations',  actionLabel: 'Open Integration Hub' },
      { id: 'penny-7', domain: 'Penny AI', label: 'Executive/coach briefs',      status: 'at-risk',    detail: 'Executive briefs and Program Lead summaries are planned only, not yet delivered.', sourceSystem: 'Penny Capability Registry', actionPath: '/penny/capabilities',  actionLabel: 'Open Penny Capabilities' },
    ],
    sourceSystem: 'Penny Capability Registry, Penny Prompt Studio',
    relatedPrograms: ['All programs'],
    relatedStandards: ['Prompt Governance Standard', 'Source Trust Standard'],
    relatedPeople: ['Penny Admin', 'Curriculum Designer'],
    relatedPennyCapabilities: ['All capabilities'],
  },
  {
    id: 'dh-people',
    domain: 'People & Roles',
    score: 55,
    level: 'needs-work',
    summary: 'People & Roles Studio defines 11 personas and 14 roles. 5 role blueprints are complete. Critical gaps: 6 roles lack owners, 6 roles lack blueprints, Employer Partner and Nonprofit Partner models are incomplete, and several external personas have no Salesforce record type defined.',
    indicators: [
      { id: 'people-1', domain: 'People & Roles', label: 'Roles with owners',          status: 'needs-work', detail: '8 of 14 roles have assigned owners. 6 unassigned.', sourceSystem: 'People & Roles Studio',          actionPath: '/admin/people-access', actionLabel: 'Assign Role Owners' },
      { id: 'people-2', domain: 'People & Roles', label: 'Blueprints complete',         status: 'needs-work', detail: '5 blueprints complete; 4 drafts; 5 missing.', sourceSystem: 'People & Roles Studio',           actionPath: '/admin/people-access', actionLabel: 'Open People & Access' },
      { id: 'people-3', domain: 'People & Roles', label: 'Salesforce model coverage',   status: 'needs-work', detail: 'Client Sponsor, Employer Partner, NP Partner: SF record types undefined.', sourceSystem: 'Salesforce Architecture Mapping', actionPath: '/admin/integrations',  actionLabel: 'Open Integration Hub' },
      { id: 'people-4', domain: 'People & Roles', label: 'Communication assignments',   status: 'good',       detail: 'Core roles (Learner, Coach, Program Lead, Curriculum Designer, Penny Admin) have comm mappings.', sourceSystem: 'Communications & Collaboration' },
      { id: 'people-5', domain: 'People & Roles', label: 'Penny support coverage',      status: 'good',       detail: 'Active Penny support mapped for 6 roles.', sourceSystem: 'Penny Capability Registry' },
      { id: 'people-6', domain: 'People & Roles', label: 'Training readiness',          status: 'needs-work', detail: '9 roles without complete blueprints have undefined training paths.', sourceSystem: 'People & Roles Studio', actionPath: '/admin/people-access', actionLabel: 'Open People & Access' },
    ],
    sourceSystem: 'People & Roles Studio',
    relatedPrograms: ['All programs'],
    relatedStandards: ['Role Ownership Standard', 'Facilitation Quality Standard'],
    relatedPeople: ['All personas'],
    relatedPennyCapabilities: ['Coach Briefs', 'Executive Briefs'],
  },
  {
    id: 'dh-communications',
    domain: 'Communications',
    score: 70,
    level: 'good',
    summary: 'Core communication channels are mapped for active roles. Slack integration is live including the Penny adapter. Google Chat mappings are defined but not live. Calendar events are structured. Key gaps: NP Partner and Client Sponsor comms undefined.',
    indicators: [
      { id: 'comm-1', domain: 'Communications', label: 'Slack channel readiness',        status: 'good',       detail: 'Cohort, coach, program-ops, and admin Slack channels mapped.', sourceSystem: 'Communications & Collaboration' },
      { id: 'comm-2', domain: 'Communications', label: 'Google Chat readiness',          status: 'needs-work', detail: 'Google Chat spaces defined in prototype but not live connections.', sourceSystem: 'Integration Readiness Center', actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
      { id: 'comm-3', domain: 'Communications', label: 'Calendar coverage',              status: 'good',       detail: 'Calendar events defined for all core program phases.', sourceSystem: 'Communications & Collaboration' },
      { id: 'comm-4', domain: 'Communications', label: 'Penny message integration',      status: 'good',       detail: 'Penny Slack Adapter MVP live — @penny responds to mentions in-thread via Gemini 2.5 Flash.', sourceSystem: 'Integration Readiness Center' },
      { id: 'comm-5', domain: 'Communications', label: 'External partner comms',         status: 'good',       detail: 'Deferred — external partner communication flows will be scoped in a future phase.', sourceSystem: 'People & Roles Studio' },
      { id: 'comm-6', domain: 'Communications', label: 'Broadcast templates',            status: 'good',       detail: 'Message templates defined for core communication events.', sourceSystem: 'Communications & Collaboration' },
    ],
    sourceSystem: 'Communications & Collaboration, Integration Readiness Center',
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    relatedStandards: ['Communication Quality Standard'],
    relatedPeople: ['Program Lead', 'Lead Coach', 'Active Learner'],
    relatedPennyCapabilities: ['Weekly Review', 'Coach Briefs', 'Executive Briefs'],
  },
  {
    id: 'dh-integration',
    domain: 'Integrations',
    score: 52,
    level: 'needs-work',
    summary: 'Integration Readiness Center identifies 9 planned integrations. Salesforce Nonprofit Cloud is the most mature; Google Drive, LMS, Slack, and Agentforce are all in varying stages of readiness.',
    indicators: [
      { id: 'int-1', domain: 'Integrations', label: 'Salesforce Nonprofit Cloud',   status: 'good',       detail: 'Nonprofit Cloud active. Core objects (Contacts, Programs, Engagements, Cases) mapped and live.', sourceSystem: 'Integration Readiness Center' },
      { id: 'int-2', domain: 'Integrations', label: 'Google Drive integration',     status: 'needs-work', detail: 'Drive as content repository defined in prototype. Live sync not configured.', sourceSystem: 'Integration Readiness Center', actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
      { id: 'int-3', domain: 'Integrations', label: 'LMS integration',              status: 'good',       detail: 'Course__c and Course_Module__c live in Salesforce. Foundations Trail (13 modules) and Guided Trail (20 modules) connected. Real-time sync active.', sourceSystem: 'Integration Readiness Center' },
      { id: 'int-4', domain: 'Integrations', label: 'Slack adapter',               status: 'good',       detail: 'Penny Slack Adapter MVP live — POST /api/slack/events, signature verification, @penny responding in-thread.', sourceSystem: 'Integration Readiness Center' },
      { id: 'int-5', domain: 'Integrations', label: 'Google Chat / Calendar',       status: 'needs-work', detail: 'API endpoints defined. Auth and sync readiness incomplete.', sourceSystem: 'Integration Readiness Center',                                        actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
      { id: 'int-6', domain: 'Integrations', label: 'Agentforce (Penny future)',    status: 'at-risk',    detail: 'No readiness work started. Agentforce context handoff is a future milestone.', sourceSystem: 'Integration Readiness Center',                        actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
      { id: 'int-7', domain: 'Integrations', label: 'Assessment platform',         status: 'needs-work', detail: 'Assessment data model defined. Live integration not started.', sourceSystem: 'Integration Readiness Center',                                        actionPath: '/admin/integrations', actionLabel: 'Open Integration Hub' },
    ],
    sourceSystem: 'Integration Readiness Center',
    relatedPrograms: ['All programs'],
    relatedStandards: ['Data Privacy Standard'],
    relatedPeople: ['Salesforce Admin', 'Penny Admin'],
    relatedPennyCapabilities: ['Source Control', 'Agentforce (planned)'],
  },
];

// ── READINESS SCORECARDS ──────────────────────────────────────────────────────
export const readinessScorecards: ReadinessScorecard[] = [
  {
    id: 'sc-architecture',
    title: 'Architecture Maturity',
    category: 'Architecture',
    score: 68,
    level: 'good',
    summary: 'Core architecture is well-defined with clear domain separation. Key gaps in external partner models and integration layer.',
    dimensions: [
      { label: 'Domain separation',      score: 85, level: 'strong',     notes: 'Clear boundaries between Curriculum, Knowledge, Penny, People, Comms, and Integrations.' },
      { label: 'Data model completeness', score: 65, level: 'good',       notes: 'Core objects defined. External partner and alumni models incomplete.' },
      { label: 'Integration design',      score: 55, level: 'needs-work', notes: 'Integration Readiness Center defines patterns but most are prototype-only.' },
      { label: 'Standards coverage',      score: 72, level: 'good',       notes: 'Standards Studio operational. 3 standards overdue for review.' },
      { label: 'Blueprint completeness',  score: 60, level: 'needs-work', notes: 'Role blueprints only 5/14 complete. Program Canvas design standard solid.' },
    ],
  },
  {
    id: 'sc-operations',
    title: 'Operational Readiness',
    category: 'Operations',
    score: 70,
    level: 'good',
    summary: 'Active program delivery is operational with real cohorts running. Operational Intelligence Layer is now in place for monitoring.',
    dimensions: [
      { label: 'Program delivery',        score: 80, level: 'strong',     notes: 'Foundations and Guided Trails delivering to active cohorts.' },
      { label: 'Coaching coverage',       score: 75, level: 'good',       notes: 'Lead coaches assigned to active cohorts. Support coach role undefined.' },
      { label: 'Outcome reporting',       score: 65, level: 'good',       notes: 'Salesforce reports in place. Some automation gaps.' },
      { label: 'Role ownership',          score: 88, level: 'strong',     notes: 'All platform roles assigned. Alumni Learner, Volunteer Mentor, and Employer Partner leads confirmed.' },
      { label: 'Escalation processes',    score: 60, level: 'needs-work', notes: 'Escalation detection in Penny is prototype. No formal SLA defined.' },
    ],
  },
  {
    id: 'sc-ai',
    title: 'AI Readiness',
    category: 'AI',
    score: 60,
    level: 'needs-work',
    summary: 'Penny AI core capabilities are active and valuable. Governance, coverage, and advanced capabilities need significant investment before scale.',
    dimensions: [
      { label: 'Core capability delivery', score: 78, level: 'good',       notes: 'Study Coach, Trail Quests, and Consistency Review are delivering value.' },
      { label: 'Prompt governance',        score: 58, level: 'needs-work', notes: 'Penny Admin assigned (Angela Landrith). Governance SLA not yet defined.' },
      { label: 'Knowledge source coverage', score: 67, level: 'good',      notes: '6/9 sources Penny-approved. 3 pending.' },
      { label: 'Executive intelligence',   score: 35, level: 'at-risk',    notes: 'Executive Briefs and Program Health Summaries planned only.' },
      { label: 'Integration readiness',    score: 30, level: 'at-risk',    notes: 'Agentforce integration not started. Standalone Penny only.' },
    ],
  },
  {
    id: 'sc-data',
    title: 'Data & CRM Readiness',
    category: 'Data',
    score: 63,
    level: 'needs-work',
    summary: 'Salesforce Nonprofit Cloud is active and capturing core program data. External partner object models and live data flows to Google Drive, LMS, and Slack are the critical path items for full data readiness.',
    dimensions: [
      { label: 'CRM coverage',             score: 75, level: 'good',       notes: 'Core learner, coach, and program records in Salesforce Nonprofit Cloud.' },
      { label: 'Data model completeness',   score: 60, level: 'needs-work', notes: 'External partner objects (Client Sponsor, Employer Partner) not yet defined.' },
      { label: 'Integration data flows',    score: 50, level: 'needs-work', notes: 'Google Drive, LMS, and Slack data flows not live.' },
      { label: 'External partner models',   score: 45, level: 'at-risk',   notes: 'Client Sponsor and Employer Partner object models not yet defined or mapped.' },
      { label: 'Reporting & dashboards',    score: 70, level: 'good',       notes: 'Core program health and outcome reports configured.' },
    ],
  },
];

// ── TREND INSIGHTS ────────────────────────────────────────────────────────────
export const trendInsights: TrendInsight[] = [
  {
    id: 'trend-1',
    type: 'risk',
    urgency: 'near-term',
    title: 'Prompt Governance SLA Not Yet Defined',
    description: 'Penny Admin is assigned (Angela Landrith). The remaining governance gap is a formal prompt governance SLA — review cadence, approval workflow, and maximum time from draft to approval. Without it, governance depends on individual effort rather than process.',
    affectedDomains: ['Penny AI', 'Curriculum', 'Knowledge'],
    affectedPrograms: ['All programs'],
    relatedSystems: ['Penny Capability Registry', 'Penny Prompt Studio', 'Knowledge Source Registry'],
    actionPath: '/penny/prompts',
  },
  {
    id: 'trend-2',
    type: 'risk',
    urgency: 'near-term',
    title: 'External Partner Object Models Undefined',
    description: 'Client Sponsor and Employer Partner object models are not yet defined in Salesforce Nonprofit Cloud. Several Trail OS integration designs depend on these relationships for full learner outcome tracking.',
    affectedDomains: ['Integrations', 'People & Roles', 'Programs'],
    affectedPrograms: ['All programs'],
    relatedSystems: ['Integration Readiness Center', 'Salesforce Architecture Mapping'],
    actionPath: '/admin/integrations',
  },
  {
    id: 'trend-4',
    type: 'gap',
    urgency: 'near-term',
    title: 'External Partner Models Missing',
    description: 'Client Sponsor, Employer Partner, and Nonprofit Partner all lack Salesforce object definitions, role blueprints, and communication flows. As programs like Explorer\'s Trail and Trail of Mastery depend on these personas, this gap is increasingly impactful.',
    affectedDomains: ['People & Roles', 'Programs', 'Integrations'],
    affectedPrograms: ["Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    relatedSystems: ['People & Roles Studio', 'Salesforce Architecture Mapping'],
    actionPath: '/people',
  },
  {
    id: 'trend-5',
    type: 'opportunity',
    urgency: 'near-term',
    title: 'Executive Intelligence Layer Ready to Activate',
    description: 'The architecture is now mature enough to deliver Executive Briefs, Program Health Summaries, and Impact Narratives to Program Leads and the Executive Director. Activating this would significantly improve operational visibility.',
    affectedDomains: ['Penny AI', 'Programs', 'People & Roles'],
    affectedPrograms: ['All programs'],
    relatedSystems: ['Penny Capability Registry', 'Operational Intelligence Center'],
    actionPath: '/penny/capability-registry',
  },
  {
    id: 'trend-6',
    type: 'risk',
    urgency: 'watch',
    title: '3 Knowledge Sources Overdue for Review',
    description: 'Two knowledge sources are stale (not synced in 60+ days) and 3 have undefined review cycles. If Penny draws on stale or inaccurate content, coaching quality degrades without visible warning.',
    affectedDomains: ['Knowledge', 'Penny AI'],
    affectedPrograms: ['All programs'],
    relatedSystems: ['Knowledge Source Registry', 'Penny Prompt Studio'],
    actionPath: '/library/knowledge-sources',
  },
];

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────
export const recommendations: Recommendation[] = [
  {
    id: 'rec-1',
    action: 'Define Prompt Governance SLA',
    domain: 'Penny AI',
    priority: 'high',
    effort: 'Low',
    systems: ['Penny Prompt Studio', 'Penny Capability Registry'],
    nextSteps: ['Define review cycle and approval workflow', 'Document maximum time from draft to approval', 'Create escalation path for blocked prompts', 'Add SLA to Penny Admin role blueprint'],
    status: 'done',
  },
  {
    id: 'rec-3',
    action: 'Build Penny Slack Adapter MVP',
    domain: 'Communications',
    priority: 'high',
    effort: 'Medium',
    systems: ['Integration Readiness Center', 'Penny Capability Registry', 'Communications & Collaboration'],
    nextSteps: ['Define message types for Slack delivery', 'Configure Slack API authentication', 'Build and test message routing', 'Pilot with one cohort channel'],
    status: 'done',
  },
  {
    id: 'rec-4',
    action: 'Assign Owners to 6 Unowned Roles',
    domain: 'People & Roles',
    priority: 'high',
    effort: 'Low',
    systems: ['People & Roles Studio'],
    nextSteps: ['Review all roles without owners in Role Health view', 'Assign appropriate staff or plan recruitment', 'Update blueprints for newly assigned roles'],
    status: 'open',
  },
  {
    id: 'rec-7',
    action: 'Activate Executive Intelligence Briefs',
    domain: 'Penny AI',
    priority: 'medium',
    effort: 'Medium',
    systems: ['Penny Capability Registry', 'Penny Prompt Studio', 'Operational Intelligence Center'],
    nextSteps: ['Promote Coach Briefs and Program Health Summaries from prototype to active', 'Create Executive Brief prompt templates', 'Test delivery with Program Lead', 'Schedule weekly automated brief generation'],
    status: 'open',
  },
  {
    id: 'rec-8',
    action: 'Resolve 3 Overdue Knowledge Source Reviews',
    domain: 'Knowledge',
    priority: 'medium',
    effort: 'Low',
    systems: ['Knowledge Source Registry'],
    nextSteps: ['Identify 3 overdue sources in Source Registry', 'Schedule review sessions with source owners', 'Update trust levels post-review', 'Set recurring review calendar entries'],
    status: 'open',
  },
  {
    id: 'rec-9',
    action: 'Complete Explorer\'s Trail Learning Objectives',
    domain: 'Curriculum',
    priority: 'medium',
    effort: 'Medium',
    systems: ['Curriculum Studio', 'Standards Studio'],
    nextSteps: ["Work with Curriculum Designer to author Modules 4–6 objectives", "Align objectives to Standards Studio definitions", "Review with Program Lead", "Publish to Trail OS"],
    status: 'open',
  },
  {
    id: 'rec-10',
    action: 'Configure Google Drive Live Sync',
    domain: 'Integrations',
    priority: 'medium',
    effort: 'Medium',
    systems: ['Integration Readiness Center', 'Knowledge Source Registry'],
    nextSteps: ['Configure Google Drive API authentication', 'Map Drive folders to Knowledge Source records', 'Build sync schedule', 'Test and verify content integrity'],
    status: 'open',
  },
  {
    id: 'rec-11',
    action: 'Start Agentforce Readiness Assessment',
    domain: 'Integrations',
    priority: 'low',
    effort: 'High',
    systems: ['Integration Readiness Center', 'Penny Capability Registry'],
    nextSteps: ['Review Agentforce product capabilities vs Penny requirements', 'Identify capability migration path', 'Assess data and auth requirements', 'Document in Integration Readiness Center'],
    status: 'open',
  },
  {
    id: 'rec-12',
    action: 'Formalise Prompt Governance SLA',
    domain: 'Penny AI',
    priority: 'medium',
    effort: 'Low',
    systems: ['Penny Prompt Studio', 'People & Roles Studio'],
    nextSteps: ['Define review cycle and approval workflow', 'Document maximum time from draft to approval', 'Create escalation path for blocked prompts', 'Add to Penny Admin role blueprint'],
    status: 'open',
  },
];

// ── COMPUTED SUMMARY ──────────────────────────────────────────────────────────
export const overallHealthScore = Math.round(
  domainHealthData.reduce((sum, d) => sum + d.score, 0) / domainHealthData.length
);

export const overallHealthLevel: HealthLevel =
  overallHealthScore >= 80 ? 'strong' :
  overallHealthScore >= 65 ? 'good'   :
  overallHealthScore >= 50 ? 'needs-work' : 'at-risk';
