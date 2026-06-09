// ── People & Roles Studio — Data ───────────────────────────────────────────
// Models the human layer of Trail OS: personas, roles, blueprints, participation,
// communications, Penny support, Salesforce mappings, and health indicators.

export type PersonaType = 'Learner' | 'Staff' | 'Volunteer' | 'Partner' | 'Sponsor' | 'Admin';
export type RoleType     = 'Internal' | 'External' | 'Volunteer' | 'Partner' | 'Platform';
export type ParticipationType = 'Lead' | 'Support' | 'Participant' | 'Observer' | 'Sponsor';
export type BlueprintStatus = 'complete' | 'draft' | 'missing';
export type HealthStatus = 'healthy' | 'needs-attention' | 'incomplete';

// ── PERSONA ───────────────────────────────────────────────────────────────────
export interface Persona {
  id: string;
  name: string;
  shortName: string;
  type: PersonaType;
  colorCls: string;
  badgeCls: string;
  description: string;
  purpose: string;
  coreResponsibilities: string[];
  relatedPrograms: string[];
  relatedRoles: string[];
  relatedSfObjects: string[];
  relatedPennyCapabilities: string[];
  relatedCommChannels: string[];
  keyOutcomes: string[];
  healthStatus: HealthStatus;
  healthIssues: string[];
  setupSteps: string[];
}

// ── ROLE ─────────────────────────────────────────────────────────────────────
export interface Role {
  id: string;
  name: string;
  shortName: string;
  personaId: string;
  personaName: string;
  type: RoleType;
  description: string;
  hasBlueprint: boolean;
  blueprintStatus: BlueprintStatus;
  programParticipation: string[];
  owner: string | null;
  healthStatus: HealthStatus;
  healthIssues: string[];
}

// ── ROLE RESPONSIBILITY ───────────────────────────────────────────────────────
export interface RoleResponsibility {
  id: string;
  roleId: string;
  roleName: string;
  area: string;
  description: string;
  required: boolean;
  relatedPrograms: string[];
  relatedSfObjects: string[];
  pennySupport: string | null;
  healthStatus: HealthStatus;
}

// ── ROLE BLUEPRINT ────────────────────────────────────────────────────────────
export interface RoleBlueprint {
  id: string;
  roleId: string;
  roleName: string;
  personaName: string;
  shortDescription: string;
  purpose: string;
  responsibilities: { area: string; description: string; required: boolean }[];
  requiredKnowledgeSources: string[];
  relatedProgramObjects: string[];
  relatedCommunications: { channel: string; type: string; purpose: string }[];
  calendarTouchpoints: string[];
  pennySupport: { capability: string; description: string }[];
  salesforceMappings: { object: string; fields: string[]; relationship: string }[];
  standards: string[];
  status: BlueprintStatus;
  owner: string;
  lastReviewed: string;
}

// ── PROGRAM PARTICIPATION ─────────────────────────────────────────────────────
export interface ProgramRoleParticipation {
  roleId: string;
  roleName: string;
  personaName: string;
  type: ParticipationType;
  description: string;
  touchpoints: string[];
}

export interface ProgramParticipation {
  programId: string;
  programName: string;
  programShort: string;
  programColorCls: string;
  description: string;
  roleParticipation: ProgramRoleParticipation[];
}

// ── COMM MAPPING ──────────────────────────────────────────────────────────────
export interface RoleCommMapping {
  roleId: string;
  roleName: string;
  personaName: string;
  slack: { channel: string; purpose: string }[];
  googleChat: { space: string; purpose: string }[];
  calendar: { event: string; cadence: string; purpose: string }[];
  email: { type: string; trigger: string }[];
}

// ── PENNY SUPPORT MAPPING ─────────────────────────────────────────────────────
export interface RolePennySupport {
  roleId: string;
  roleName: string;
  personaName: string;
  capabilities: { capability: string; description: string; status: 'active' | 'planned' | 'prototype' }[];
  promptTypes: string[];
  accessLevel: 'Full' | 'Guided' | 'Read-Only' | 'None';
  notes: string;
}

// ── SALESFORCE MAPPING ────────────────────────────────────────────────────────
export interface RoleSalesforceMapping {
  roleId: string;
  roleName: string;
  personaName: string;
  primaryObject: string;
  relatedObjects: { object: string; relationship: string; fields: string[] }[];
  permissionModel: string;
  futureNotes: string;
}

// ── ROLE HEALTH ───────────────────────────────────────────────────────────────
export interface RoleHealthRecord {
  roleId: string;
  roleName: string;
  personaId: string;
  personaName: string;
  healthScore: number;
  healthStatus: HealthStatus;
  missingOwner: boolean;
  unclearResponsibilities: boolean;
  missingCommChannel: boolean;
  missingPennySupport: boolean;
  missingSalesforceMapping: boolean;
  trainingGap: boolean;
  issues: string[];
  recommendations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

export const PERSONA_TYPE_CONFIG: Record<PersonaType, { label: string; cls: string }> = {
  Learner:   { label: 'Learner',   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  Staff:     { label: 'Staff',     cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  Volunteer: { label: 'Volunteer', cls: 'text-violet-700 bg-violet-50 border-violet-200' },
  Partner:   { label: 'Partner',   cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  Sponsor:   { label: 'Sponsor',   cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  Admin:     { label: 'Admin',     cls: 'text-slate-700 bg-slate-100 border-slate-300' },
};

export const HEALTH_STATUS_CONFIG: Record<HealthStatus, { label: string; cls: string; dot: string }> = {
  healthy:          { label: 'Healthy',          cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  'needs-attention': { label: 'Needs Attention', cls: 'text-amber-700 bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  incomplete:        { label: 'Incomplete',       cls: 'text-rose-700 bg-rose-50 border-rose-200',        dot: 'bg-rose-500' },
};

export const BLUEPRINT_STATUS_CONFIG: Record<BlueprintStatus, { label: string; cls: string }> = {
  complete: { label: 'Complete', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  draft:    { label: 'Draft',    cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  missing:  { label: 'Missing',  cls: 'text-rose-700 bg-rose-50 border-rose-200' },
};

export const PARTICIPATION_TYPE_CONFIG: Record<ParticipationType, { label: string; cls: string }> = {
  Lead:        { label: 'Lead',        cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  Support:     { label: 'Support',     cls: 'text-violet-700 bg-violet-50 border-violet-200' },
  Participant: { label: 'Participant', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  Observer:    { label: 'Observer',    cls: 'text-slate-600 bg-slate-50 border-slate-200' },
  Sponsor:     { label: 'Sponsor',     cls: 'text-rose-700 bg-rose-50 border-rose-200' },
};

// ── PERSONAS ──────────────────────────────────────────────────────────────────
export const personas: Persona[] = [
  {
    id: 'persona-learner',
    name: 'Learner',
    shortName: 'Learner',
    type: 'Learner',
    colorCls: 'text-emerald-700',
    badgeCls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    description: 'Individuals enrolled in a Transition Trails program who are progressing through structured learning experiences with Penny AI guidance.',
    purpose: 'The primary recipient of the Trail OS operating model — learners engage with curriculum, coaching, questing, and community to build career-readiness.',
    coreResponsibilities: [
      'Complete assigned modules, quests, and assessments on schedule',
      'Engage with Penny coaching prompts and reflections',
      'Participate in cohort Slack and Google Chat spaces',
      'Attend office hours, mentor sessions, and cohort events',
      'Submit employer data and outcomes for impact tracking',
    ],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    relatedRoles: ['role-learner-active', 'role-learner-alumni'],
    relatedSfObjects: ['Contact', 'Program_Enrollment__c', 'Training_Plan__c', 'Case'],
    relatedPennyCapabilities: ['cap-study-coach', 'cap-trail-quests', 'cap-reflection-prompts', 'cap-weekly-review'],
    relatedCommChannels: ['Cohort Slack Channel', 'Google Chat Space', 'Weekly Digest', 'Calendar Events'],
    keyOutcomes: ['Career readiness score improvement', 'Module completion rate', 'Quest completion rate', 'Employment outcomes'],
    healthStatus: 'healthy',
    healthIssues: [],
    setupSteps: ['Enroll in Salesforce as Contact + Program Enrollment', 'Assign Penny learning profile', 'Add to cohort Slack channel', 'Generate onboarding welcome message'],
  },
  {
    id: 'persona-coach',
    name: 'Coach',
    shortName: 'Coach',
    type: 'Staff',
    colorCls: 'text-blue-700',
    badgeCls: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Qualified facilitators who guide learners through program experiences, provide feedback, and maintain program quality through direct engagement.',
    purpose: 'The primary human facilitator in the learning journey — coaches bridge curriculum, community, and career readiness with support from Penny AI.',
    coreResponsibilities: [
      'Facilitate weekly cohort sessions and office hours',
      'Review Penny-generated learner briefs and act on escalations',
      'Provide feedback on learner quests and assessments',
      'Monitor cohort health and flag at-risk learners',
      'Coordinate with Program Leads on delivery quality',
    ],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery'],
    relatedRoles: ['role-coach-lead', 'role-coach-support'],
    relatedSfObjects: ['Contact', 'Volunteer__c', 'Program_Engagement__c', 'Case'],
    relatedPennyCapabilities: ['cap-coach-briefs', 'cap-escalation-detection', 'cap-cohort-summaries', 'cap-session-prep'],
    relatedCommChannels: ['Coach Slack Channel', 'Program Lead Slack', 'Office Hours Calendar', 'Cohort Calendar'],
    keyOutcomes: ['Learner progression rate', 'At-risk learner response time', 'Cohort completion rate', 'Coach satisfaction score'],
    healthStatus: 'needs-attention',
    healthIssues: ['Coach Salesforce mapping incomplete for volunteer coaches', 'No formal Penny escalation SLA defined'],
    setupSteps: ['Create Volunteer record in Salesforce', 'Link to Program Engagements', 'Assign Penny Coach Brief capability', 'Add to coach Slack workspace', 'Grant curriculum read access'],
  },
  {
    id: 'persona-program-lead',
    name: 'Program Lead',
    shortName: 'Prog. Lead',
    type: 'Staff',
    colorCls: 'text-blue-700',
    badgeCls: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Staff members responsible for end-to-end program operations — intake, cohort management, coach coordination, and outcome reporting.',
    purpose: 'The operational centre of each program delivery — Program Leads coordinate the human, curriculum, and technology layers to deliver consistent outcomes.',
    coreResponsibilities: [
      'Manage program intake pipeline and learner onboarding',
      'Coordinate coach assignments and coverage',
      'Monitor program health dashboards and escalate issues',
      'Manage Salesforce program records and reporting',
      'Liaise with Curriculum Designers on content gaps',
    ],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    relatedRoles: ['role-program-lead'],
    relatedSfObjects: ['Training_Plan__c', 'Program_Enrollment__c', 'Campaign', 'Account', 'Report'],
    relatedPennyCapabilities: ['cap-program-health', 'cap-cohort-summaries', 'cap-escalation-detection'],
    relatedCommChannels: ['Program Lead Slack', 'Ops Channel', 'Program Calendar', 'Stakeholder Reports'],
    keyOutcomes: ['Program completion rate', 'Intake conversion', 'Cohort health score', 'Outcome reporting accuracy'],
    healthStatus: 'healthy',
    healthIssues: [],
    setupSteps: ['Assign as Program Owner in Salesforce', 'Grant full program record access', 'Add to program Slack workspace', 'Configure program health dashboard access'],
  },
  {
    id: 'persona-curriculum-designer',
    name: 'Curriculum Designer',
    shortName: 'Curr. Designer',
    type: 'Staff',
    colorCls: 'text-blue-700',
    badgeCls: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Content specialists who author, review, and maintain curriculum assets, Penny prompts, Trail Quests, and learning standards in Curriculum Studio.',
    purpose: 'The content quality layer — Curriculum Designers ensure all learning experiences are coherent, on-standard, and Penny-ready before delivery.',
    coreResponsibilities: [
      'Author and maintain module outlines, lessons, and assessments',
      'Write and review Penny coaching prompts, quests, and reflections',
      'Run consistency reviews and quality checks on content',
      'Maintain knowledge standards and curriculum blueprints',
      'Coordinate with Penny Admin on prompt governance',
    ],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    relatedRoles: ['role-curriculum-designer'],
    relatedSfObjects: ['Training_Plan__c', 'Training_Plan_Item__c', 'Knowledge__c'],
    relatedPennyCapabilities: ['cap-curriculum-generation', 'cap-consistency-review', 'cap-prompt-governance'],
    relatedCommChannels: ['Curriculum Slack', 'Content Review Calendar', 'Standards Review Meetings'],
    keyOutcomes: ['Content quality score', 'Prompt approval rate', 'Standards compliance', 'On-time delivery rate'],
    healthStatus: 'healthy',
    healthIssues: [],
    setupSteps: ['Grant Curriculum Studio edit access', 'Add to curriculum Slack channel', 'Configure prompt governance workflow', 'Assign to standards review group'],
  },
  {
    id: 'persona-penny-admin',
    name: 'Penny Admin',
    shortName: 'Penny Admin',
    type: 'Admin',
    colorCls: 'text-violet-700',
    badgeCls: 'text-violet-700 bg-violet-50 border-violet-200',
    description: 'Technical administrators responsible for Penny AI configuration, prompt governance, capability registry, source rules, and quality monitoring.',
    purpose: 'The AI governance layer — Penny Admins ensure Penny is operating within approved parameters, using trusted sources, and producing quality outputs.',
    coreResponsibilities: [
      'Maintain Penny capability registry and activation status',
      'Review and approve prompt templates in Prompt Studio',
      'Configure source rules and knowledge source trust levels',
      'Monitor Penny quality metrics and hallucination risk',
      'Manage Penny integration with Salesforce and LMS',
    ],
    relatedPrograms: ['All programs'],
    relatedRoles: ['role-penny-admin'],
    relatedSfObjects: ['Knowledge__c', 'Case', 'Integration_Log__c'],
    relatedPennyCapabilities: ['cap-prompt-governance', 'cap-source-control', 'cap-quality-review', 'cap-capability-registry'],
    relatedCommChannels: ['Penny Admin Slack', 'Quality Review Calendar', 'Incident Channel'],
    keyOutcomes: ['Prompt approval rate', 'Hallucination incident rate', 'Source trust compliance', 'Capability uptime'],
    healthStatus: 'needs-attention',
    healthIssues: ['Formal Penny Admin role not yet defined in Salesforce', 'Prompt governance SLA not documented'],
    setupSteps: ['Define Penny Admin role in Salesforce permissions', 'Grant Prompt Studio admin access', 'Create quality review calendar', 'Document escalation protocol'],
  },
  {
    id: 'persona-volunteer',
    name: 'Volunteer',
    shortName: 'Volunteer',
    type: 'Volunteer',
    colorCls: 'text-violet-700',
    badgeCls: 'text-violet-700 bg-violet-50 border-violet-200',
    description: 'Community members contributing time to program delivery as coaches, mentors, guest speakers, or workshop facilitators.',
    purpose: 'The community amplification layer — Volunteers extend program capacity and bring real-world experience into the learning environment.',
    coreResponsibilities: [
      'Deliver assigned volunteer sessions or workshops',
      'Provide learner feedback and mentoring',
      'Complete required training before engagement',
      'Log hours in Volunteer Management (NPSP)',
    ],
    relatedPrograms: ['Foundations Trail', 'Guided Trail'],
    relatedRoles: ['role-volunteer-coach', 'role-volunteer-mentor'],
    relatedSfObjects: ['Volunteer__c', 'Volunteer_Job__c', 'Volunteer_Shift__c', 'Contact'],
    relatedPennyCapabilities: ['cap-coach-briefs'],
    relatedCommChannels: ['Volunteer Slack', 'Training Calendar'],
    keyOutcomes: ['Hours delivered', 'Session quality rating', 'Learner satisfaction with volunteer sessions'],
    healthStatus: 'needs-attention',
    healthIssues: ['Volunteer Salesforce mapping uses legacy NPSP fields — Nonprofit Cloud migration pending'],
    setupSteps: ['Create Volunteer record in NPSP', 'Assign to Volunteer Jobs', 'Add to volunteer Slack channel', 'Complete volunteer training module'],
  },
  {
    id: 'persona-client-sponsor',
    name: 'Client Sponsor',
    shortName: 'Client Sponsor',
    type: 'Sponsor',
    colorCls: 'text-rose-700',
    badgeCls: 'text-rose-700 bg-rose-50 border-rose-200',
    description: 'Organisational sponsors who fund or refer learners to Transition Trails programs and receive outcome reporting.',
    purpose: 'The funding and accountability layer — Client Sponsors align program investment with learner outcomes and employer needs.',
    coreResponsibilities: [
      'Refer and sponsor learner cohorts',
      'Review outcome reports and dashboards',
      'Provide employer-side context for program design',
      'Participate in program review meetings',
    ],
    relatedPrograms: ['Guided Trail', "Explorer's Trail", 'Trail of Mastery'],
    relatedRoles: ['role-client-sponsor'],
    relatedSfObjects: ['Account', 'Opportunity', 'Contact', 'Report'],
    relatedPennyCapabilities: ['cap-executive-briefs'],
    relatedCommChannels: ['Stakeholder Report Emails', 'Sponsor Review Calendar'],
    keyOutcomes: ['Learner employment rate', 'Cohort satisfaction', 'Renewal rate'],
    healthStatus: 'incomplete',
    healthIssues: ['No formal Salesforce Account record type for Client Sponsors yet', 'Communication mapping not defined'],
    setupSteps: ['Create Account and Opportunity records', 'Link enrolled learners as Contacts', 'Set up outcome reporting dashboard', 'Define communication cadence'],
  },
  {
    id: 'persona-employer-partner',
    name: 'Employer Partner',
    shortName: 'Employer',
    type: 'Partner',
    colorCls: 'text-amber-700',
    badgeCls: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Employers who partner with Transition Trails to hire graduates, provide work experience, or co-design skill-based curriculum.',
    purpose: 'The employment outcomes layer — Employer Partners define the real-world destinations that program design is calibrated toward.',
    coreResponsibilities: [
      'Define skill requirements and job profiles for curriculum alignment',
      'Provide work experience placements and hiring opportunities',
      'Participate in graduate matching and placement pipeline',
      'Give feedback on graduate readiness',
    ],
    relatedPrograms: ['Trail of Mastery', "Explorer's Trail", 'Digital Compass'],
    relatedRoles: ['role-employer-partner'],
    relatedSfObjects: ['Account', 'Opportunity', 'Job_Application__c', 'Contact'],
    relatedPennyCapabilities: ['cap-employer-matching'],
    relatedCommChannels: ['Partner Email', 'Partner Review Meetings'],
    keyOutcomes: ['Graduate hire rate', 'Skills match score', 'Partner satisfaction'],
    healthStatus: 'incomplete',
    healthIssues: ['Employer Partner object model not yet defined in Salesforce', 'No Penny employer matching capability configured'],
    setupSteps: ['Define Account record type for Employer Partners', 'Map skill requirements to curriculum standards', 'Configure Penny employer matching (planned Q4)'],
  },
  {
    id: 'persona-executive-director',
    name: 'Executive Director',
    shortName: 'Exec Director',
    type: 'Staff',
    colorCls: 'text-blue-700',
    badgeCls: 'text-blue-700 bg-blue-50 border-blue-200',
    description: 'Senior leadership responsible for strategic direction, funder relationships, organisational health, and Trail OS oversight.',
    purpose: 'The strategic governance layer — the Executive Director ensures the operating model serves the mission and is accountable to funders and partners.',
    coreResponsibilities: [
      'Set and communicate organisational strategy',
      'Review program health and impact dashboards',
      'Manage funder and board relationships',
      'Approve major operational changes to Trail OS',
    ],
    relatedPrograms: ['All programs'],
    relatedRoles: ['role-executive-director'],
    relatedSfObjects: ['Account', 'Opportunity', 'Report', 'Dashboard'],
    relatedPennyCapabilities: ['cap-executive-briefs', 'cap-impact-summaries'],
    relatedCommChannels: ['Executive Briefing Calendar', 'Board Reports'],
    keyOutcomes: ['Organisational health score', 'Funder satisfaction', 'Program reach'],
    healthStatus: 'healthy',
    healthIssues: [],
    setupSteps: ['Grant executive Salesforce dashboard access', 'Configure executive brief digest', 'Add to board reporting calendar'],
  },
  {
    id: 'persona-salesforce-admin',
    name: 'Salesforce Admin',
    shortName: 'SF Admin',
    type: 'Admin',
    colorCls: 'text-slate-700',
    badgeCls: 'text-slate-600 bg-slate-100 border-slate-300',
    description: 'Technical administrators responsible for Salesforce NPSP/Nonprofit Cloud configuration, data integrity, integrations, and permission models.',
    purpose: 'The CRM infrastructure layer — the Salesforce Admin ensures all Trail OS data flows are correctly structured, permissioned, and integrated.',
    coreResponsibilities: [
      'Maintain Salesforce NPSP and Nonprofit Cloud configuration',
      'Manage permission sets, profiles, and user access',
      'Support Trail OS integration with Salesforce data layer',
      'Monitor data quality and deduplication',
      'Configure reports and dashboards for program teams',
    ],
    relatedPrograms: ['All programs (via Salesforce)'],
    relatedRoles: ['role-salesforce-admin'],
    relatedSfObjects: ['All objects', 'Permission_Set__c', 'Profile', 'User'],
    relatedPennyCapabilities: ['cap-sf-mapping'],
    relatedCommChannels: ['Tech Team Slack', 'SF Release Calendar'],
    keyOutcomes: ['Data quality score', 'Integration uptime', 'Permission model compliance'],
    healthStatus: 'needs-attention',
    healthIssues: ['Nonprofit Cloud migration timeline unclear', 'Integration Readiness Center setup in progress'],
    setupSteps: ['Complete Integration Readiness assessment', 'Migrate legacy NPSP to Nonprofit Cloud (planned Q3)', 'Document all permission sets'],
  },
  {
    id: 'persona-nonprofit-partner',
    name: 'Nonprofit Partner',
    shortName: 'NP Partner',
    type: 'Partner',
    colorCls: 'text-amber-700',
    badgeCls: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Partner organisations who refer learners, co-deliver programs, or collaborate on impact measurement across the sector.',
    purpose: 'The network amplification layer — Nonprofit Partners extend reach into communities that Transition Trails cannot access alone.',
    coreResponsibilities: [
      'Refer eligible learners into Transition Trails programs',
      'Co-facilitate community-based sessions where agreed',
      'Share anonymised outcome data for sector reporting',
    ],
    relatedPrograms: ['Foundations Trail', 'Digital Compass'],
    relatedRoles: ['role-nonprofit-partner'],
    relatedSfObjects: ['Account', 'Contact', 'Program_Enrollment__c'],
    relatedPennyCapabilities: [],
    relatedCommChannels: ['Partner Email', 'Partner Meetings'],
    keyOutcomes: ['Referral conversion rate', 'Co-delivery quality', 'Shared impact metrics'],
    healthStatus: 'incomplete',
    healthIssues: ['No formal data sharing agreement template', 'Account record type for NP Partners not defined'],
    setupSteps: ['Define Account record type', 'Create data sharing agreement template', 'Build referral tracking workflow in Salesforce'],
  },
];

// ── ROLES ─────────────────────────────────────────────────────────────────────
export const roles: Role[] = [
  {
    id: 'role-learner-active',
    name: 'Active Learner',
    shortName: 'Active Learner',
    personaId: 'persona-learner',
    personaName: 'Learner',
    type: 'External',
    description: 'Enrolled learner actively participating in a program cohort.',
    hasBlueprint: true,
    blueprintStatus: 'complete',
    programParticipation: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    owner: 'Program Lead',
    healthStatus: 'healthy',
    healthIssues: [],
  },
  {
    id: 'role-learner-alumni',
    name: 'Alumni Learner',
    shortName: 'Alumni',
    personaId: 'persona-learner',
    personaName: 'Learner',
    type: 'External',
    description: 'Graduated learner who may remain connected for outcomes tracking and alumni engagement.',
    hasBlueprint: false,
    blueprintStatus: 'draft',
    programParticipation: ['All programs (alumni)'],
    owner: null,
    healthStatus: 'needs-attention',
    healthIssues: ['No defined alumni Salesforce record type', 'No alumni communication flow defined'],
  },
  {
    id: 'role-coach-lead',
    name: 'Lead Coach',
    shortName: 'Lead Coach',
    personaId: 'persona-coach',
    personaName: 'Coach',
    type: 'Internal',
    description: 'Primary coach responsible for a cohort — owns facilitation, feedback, and escalation.',
    hasBlueprint: true,
    blueprintStatus: 'complete',
    programParticipation: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    owner: 'Program Lead',
    healthStatus: 'healthy',
    healthIssues: [],
  },
  {
    id: 'role-coach-support',
    name: 'Support Coach',
    shortName: 'Support Coach',
    personaId: 'persona-coach',
    personaName: 'Coach',
    type: 'Internal',
    description: 'Secondary coach who assists the Lead Coach in cohort delivery and learner support.',
    hasBlueprint: false,
    blueprintStatus: 'draft',
    programParticipation: ['Foundations Trail', 'Guided Trail'],
    owner: null,
    healthStatus: 'needs-attention',
    healthIssues: ['No blueprint defined', 'Owner not assigned'],
  },
  {
    id: 'role-program-lead',
    name: 'Program Lead',
    shortName: 'Program Lead',
    personaId: 'persona-program-lead',
    personaName: 'Program Lead',
    type: 'Internal',
    description: 'Operational lead for one or more programs — manages intake, delivery, coaching, and reporting.',
    hasBlueprint: true,
    blueprintStatus: 'complete',
    programParticipation: ['Foundations Trail', 'Guided Trail', "Explorer's Trail", 'Trail of Mastery', 'Digital Compass'],
    owner: 'Executive Director',
    healthStatus: 'healthy',
    healthIssues: [],
  },
  {
    id: 'role-curriculum-designer',
    name: 'Curriculum Designer',
    shortName: 'Curr. Designer',
    personaId: 'persona-curriculum-designer',
    personaName: 'Curriculum Designer',
    type: 'Internal',
    description: 'Content lead responsible for curriculum authoring, Penny prompts, and learning standards.',
    hasBlueprint: true,
    blueprintStatus: 'complete',
    programParticipation: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"],
    owner: 'Program Lead',
    healthStatus: 'healthy',
    healthIssues: [],
  },
  {
    id: 'role-penny-admin',
    name: 'Penny Admin',
    shortName: 'Penny Admin',
    personaId: 'persona-penny-admin',
    personaName: 'Penny Admin',
    type: 'Platform',
    description: 'Technical owner of Penny AI configuration, prompt governance, and capability registry.',
    hasBlueprint: true,
    blueprintStatus: 'complete',
    programParticipation: ['All programs (Penny platform)'],
    owner: null,
    healthStatus: 'needs-attention',
    healthIssues: ['Owner not yet formally assigned', 'Salesforce permission model not defined'],
  },
  {
    id: 'role-volunteer-coach',
    name: 'Volunteer Coach',
    shortName: 'Vol. Coach',
    personaId: 'persona-volunteer',
    personaName: 'Volunteer',
    type: 'Volunteer',
    description: 'Community volunteer providing coaching sessions and mentoring to learners.',
    hasBlueprint: false,
    blueprintStatus: 'draft',
    programParticipation: ['Foundations Trail', 'Guided Trail'],
    owner: 'Program Lead',
    healthStatus: 'needs-attention',
    healthIssues: ['No blueprint', 'NPSP Volunteer record mapping incomplete'],
  },
  {
    id: 'role-volunteer-mentor',
    name: 'Volunteer Mentor',
    shortName: 'Vol. Mentor',
    personaId: 'persona-volunteer',
    personaName: 'Volunteer',
    type: 'Volunteer',
    description: 'Community professional providing 1:1 mentoring to learners outside formal cohort sessions.',
    hasBlueprint: false,
    blueprintStatus: 'missing',
    programParticipation: ['Guided Trail', "Explorer's Trail"],
    owner: null,
    healthStatus: 'incomplete',
    healthIssues: ['No blueprint', 'No owner', 'No Salesforce record defined', 'No Penny support configured'],
  },
  {
    id: 'role-client-sponsor',
    name: 'Client Sponsor',
    shortName: 'Client Sponsor',
    personaId: 'persona-client-sponsor',
    personaName: 'Client Sponsor',
    type: 'External',
    description: 'Organisational sponsor funding or referring a learner cohort and receiving outcome reports.',
    hasBlueprint: false,
    blueprintStatus: 'missing',
    programParticipation: ['Guided Trail', "Explorer's Trail"],
    owner: 'Executive Director',
    healthStatus: 'incomplete',
    healthIssues: ['No blueprint', 'Salesforce Account record type not defined', 'No communication flow'],
  },
  {
    id: 'role-employer-partner',
    name: 'Employer Partner',
    shortName: 'Employer',
    personaId: 'persona-employer-partner',
    personaName: 'Employer Partner',
    type: 'Partner',
    description: 'Employer partner hiring graduates, providing placements, or co-designing curriculum.',
    hasBlueprint: false,
    blueprintStatus: 'missing',
    programParticipation: ['Trail of Mastery', "Explorer's Trail", 'Digital Compass'],
    owner: null,
    healthStatus: 'incomplete',
    healthIssues: ['No blueprint', 'No owner', 'No Salesforce object model', 'No Penny matching capability'],
  },
  {
    id: 'role-executive-director',
    name: 'Executive Director',
    shortName: 'Exec Director',
    personaId: 'persona-executive-director',
    personaName: 'Executive Director',
    type: 'Internal',
    description: 'Strategic leader with oversight across all programs, funders, and Trail OS operations.',
    hasBlueprint: false,
    blueprintStatus: 'draft',
    programParticipation: ['All programs'],
    owner: 'Board',
    healthStatus: 'healthy',
    healthIssues: [],
  },
  {
    id: 'role-salesforce-admin',
    name: 'Salesforce Admin',
    shortName: 'SF Admin',
    personaId: 'persona-salesforce-admin',
    personaName: 'Salesforce Admin',
    type: 'Platform',
    description: 'Technical Salesforce owner — maintains data model, integrations, permissions, and org health.',
    hasBlueprint: false,
    blueprintStatus: 'draft',
    programParticipation: ['All programs (via platform)'],
    owner: null,
    healthStatus: 'needs-attention',
    healthIssues: ['Owner not formally assigned', 'No integration readiness blueprint defined'],
  },
  {
    id: 'role-nonprofit-partner',
    name: 'Nonprofit Partner',
    shortName: 'NP Partner',
    personaId: 'persona-nonprofit-partner',
    personaName: 'Nonprofit Partner',
    type: 'Partner',
    description: 'Partner organisation referring learners and collaborating on community-based delivery.',
    hasBlueprint: false,
    blueprintStatus: 'missing',
    programParticipation: ['Foundations Trail', 'Digital Compass'],
    owner: 'Program Lead',
    healthStatus: 'incomplete',
    healthIssues: ['No blueprint', 'No Salesforce account type', 'No data sharing agreement'],
  },
];

// ── ROLE RESPONSIBILITIES ─────────────────────────────────────────────────────
export const responsibilities: RoleResponsibility[] = [
  { id: 'resp-coach-facilitate', roleId: 'role-coach-lead', roleName: 'Lead Coach', area: 'Facilitation', description: 'Deliver weekly cohort sessions, office hours, and milestone reviews.', required: true, relatedPrograms: ['Foundations Trail', 'Guided Trail'], relatedSfObjects: ['Training_Plan__c', 'Program_Engagement__c'], pennySupport: 'Session prep briefs and cohort summaries', healthStatus: 'healthy' },
  { id: 'resp-coach-feedback', roleId: 'role-coach-lead', roleName: 'Lead Coach', area: 'Learner Feedback', description: 'Review and respond to Penny-generated learner risk flags within 24 hours.', required: true, relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"], relatedSfObjects: ['Case', 'Contact'], pennySupport: 'Escalation detection and at-risk alerts', healthStatus: 'healthy' },
  { id: 'resp-coach-reporting', roleId: 'role-coach-lead', roleName: 'Lead Coach', area: 'Reporting', description: 'Submit weekly progress notes into Salesforce for each active learner.', required: true, relatedPrograms: ['Foundations Trail', 'Guided Trail'], relatedSfObjects: ['Program_Engagement__c', 'Contact'], pennySupport: null, healthStatus: 'needs-attention' },
  { id: 'resp-pl-intake', roleId: 'role-program-lead', roleName: 'Program Lead', area: 'Intake Management', description: 'Own the full intake pipeline from enquiry to enrolled learner.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Lead', 'Contact', 'Program_Enrollment__c', 'Campaign'], pennySupport: 'Intake summary digests', healthStatus: 'healthy' },
  { id: 'resp-pl-coaches', roleId: 'role-program-lead', roleName: 'Program Lead', area: 'Coach Coordination', description: 'Assign and coordinate coaches to cohorts, cover shortfalls, and review quality.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Volunteer__c', 'Program_Engagement__c'], pennySupport: 'Coach brief generation', healthStatus: 'healthy' },
  { id: 'resp-pl-health', roleId: 'role-program-lead', roleName: 'Program Lead', area: 'Program Health', description: 'Monitor and act on program health dashboard daily during active cohorts.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Report', 'Dashboard'], pennySupport: 'Program health summaries', healthStatus: 'healthy' },
  { id: 'resp-cd-content', roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', area: 'Content Authoring', description: 'Author and maintain all module, lesson, and assessment content in Curriculum Studio.', required: true, relatedPrograms: ['Foundations Trail', 'Guided Trail', "Explorer's Trail"], relatedSfObjects: ['Training_Plan__c', 'Training_Plan_Item__c'], pennySupport: 'Curriculum generation assistance', healthStatus: 'healthy' },
  { id: 'resp-cd-prompts', roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', area: 'Penny Prompt Authoring', description: 'Write and review all coaching prompts, quests, and reflections in Prompt Studio.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Knowledge__c'], pennySupport: 'Prompt quality review', healthStatus: 'healthy' },
  { id: 'resp-cd-standards', roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', area: 'Standards Compliance', description: 'Ensure all content meets defined curriculum standards and passes consistency review.', required: true, relatedPrograms: ['Foundations Trail', 'Guided Trail'], relatedSfObjects: [], pennySupport: 'Consistency review checks', healthStatus: 'healthy' },
  { id: 'resp-pa-registry', roleId: 'role-penny-admin', roleName: 'Penny Admin', area: 'Capability Registry', description: 'Maintain and update the Penny Capability Registry — activate, deprecate, and document capabilities.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Knowledge__c'], pennySupport: null, healthStatus: 'needs-attention' },
  { id: 'resp-pa-governance', roleId: 'role-penny-admin', roleName: 'Penny Admin', area: 'Prompt Governance', description: 'Review and approve all prompt templates before production deployment.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: ['Knowledge__c'], pennySupport: null, healthStatus: 'needs-attention' },
  { id: 'resp-pa-sources', roleId: 'role-penny-admin', roleName: 'Penny Admin', area: 'Source Rules', description: 'Configure and maintain knowledge source trust levels and Penny approval status.', required: true, relatedPrograms: ['All programs'], relatedSfObjects: [], pennySupport: null, healthStatus: 'needs-attention' },
];

// ── ROLE BLUEPRINTS ───────────────────────────────────────────────────────────
export const roleBlueprints: RoleBlueprint[] = [
  {
    id: 'bp-learner',
    roleId: 'role-learner-active',
    roleName: 'Active Learner',
    personaName: 'Learner',
    shortDescription: 'Defines the expected experience, responsibilities, and support structure for an enrolled Transition Trails learner.',
    purpose: 'Ensure every learner has a clear, supported, and measurable journey from enrolment to career outcome — with Penny, their cohort, and their coach available at each stage.',
    responsibilities: [
      { area: 'Engagement',   description: 'Complete assigned modules and quests on schedule; attend cohort sessions.', required: true },
      { area: 'Reflection',   description: 'Submit Penny reflection prompts at module milestones.', required: true },
      { area: 'Outcomes',     description: 'Submit employment data and outcomes within 30 days of graduation.', required: true },
      { area: 'Community',    description: 'Participate actively in cohort Slack and community spaces.', required: false },
    ],
    requiredKnowledgeSources: ['Curriculum Studio (module outlines)', 'Learner Profiles (Salesforce)', 'Penny Trail Quests'],
    relatedProgramObjects: ['Training_Plan__c', 'Program_Enrollment__c', 'Contact', 'Training_Plan_Item__c'],
    relatedCommunications: [
      { channel: 'Cohort Slack Channel', type: 'Slack', purpose: 'Day-to-day peer and coach communication' },
      { channel: 'Google Chat Space', type: 'Google Chat', purpose: 'Shared resources and announcements' },
      { channel: 'Weekly Digest', type: 'Email', purpose: 'Progress summary and next steps' },
    ],
    calendarTouchpoints: ['Cohort kickoff session', 'Weekly cohort check-in', 'Module milestone review', 'Graduation ceremony'],
    pennySupport: [
      { capability: 'Study Coach', description: 'Daily coaching prompts aligned to current module and learner stage.' },
      { capability: 'Trail Quests', description: 'Gamified mission sequences to drive deep engagement with learning content.' },
      { capability: 'Reflection Prompts', description: 'Structured reflection at milestone completions.' },
      { capability: 'Weekly Review', description: 'Auto-generated weekly summary sent to learner and coach.' },
    ],
    salesforceMappings: [
      { object: 'Contact', fields: ['Name', 'Email', 'Program_Enrollment_Status__c', 'Career_Readiness_Score__c'], relationship: 'Primary learner record' },
      { object: 'Program_Enrollment__c', fields: ['Program__c', 'Cohort__c', 'Status__c', 'Start_Date__c', 'End_Date__c'], relationship: 'Links learner to program and cohort' },
      { object: 'Training_Plan__c', fields: ['Learner__c', 'Module_Progress__c', 'Completion_Date__c'], relationship: 'Tracks curriculum progress' },
    ],
    standards: ['Learner Engagement Standard', 'Outcomes Reporting Standard', 'Data Privacy Standard'],
    status: 'complete',
    owner: 'Curriculum Lead',
    lastReviewed: 'May 2025',
  },
  {
    id: 'bp-coach',
    roleId: 'role-coach-lead',
    roleName: 'Lead Coach',
    personaName: 'Coach',
    shortDescription: 'Defines the facilitation responsibilities, Penny integration, and Salesforce record model for a Lead Coach.',
    purpose: 'Ensure every cohort has a well-supported Lead Coach with clear responsibilities, Penny AI assistance, and direct access to learner data for timely intervention.',
    responsibilities: [
      { area: 'Facilitation',       description: 'Deliver all scheduled cohort sessions, office hours, and milestone reviews.', required: true },
      { area: 'Penny Integration',  description: 'Review Penny coach briefs and act on escalations within 24 hours.', required: true },
      { area: 'Reporting',          description: 'Submit learner progress notes weekly into Salesforce.', required: true },
      { area: 'Quality Feedback',   description: 'Provide content quality feedback to Curriculum Designer monthly.', required: false },
    ],
    requiredKnowledgeSources: ['Program Curriculum (Curriculum Studio)', 'Learner Profiles (Salesforce)', 'Penny Coach Briefs', 'Escalation Protocols'],
    relatedProgramObjects: ['Program_Engagement__c', 'Contact', 'Volunteer__c', 'Case', 'Training_Plan__c'],
    relatedCommunications: [
      { channel: 'Coach Slack Channel', type: 'Slack', purpose: 'Intra-coach communication and escalations' },
      { channel: 'Program Lead Slack', type: 'Slack', purpose: 'Operational coordination with Program Lead' },
      { channel: 'Cohort Calendar', type: 'Calendar', purpose: 'Session scheduling and milestone tracking' },
    ],
    calendarTouchpoints: ['Weekly cohort session', 'Office hours block', 'Coach briefing (Penny-generated)', 'Monthly program review', 'End-of-cohort retrospective'],
    pennySupport: [
      { capability: 'Coach Briefs',         description: 'Weekly AI-generated briefings on cohort progress, at-risk learners, and next steps.' },
      { capability: 'Escalation Detection', description: 'Flags learners showing disengagement patterns for coach action.' },
      { capability: 'Cohort Summaries',     description: 'Post-session summaries and learning health snapshot.' },
      { capability: 'Session Prep',         description: 'Pre-session context package — learner status, open quests, and relevant content.' },
    ],
    salesforceMappings: [
      { object: 'Volunteer__c',          fields: ['Name', 'Email', 'Volunteer_Status__c', 'Hours_Volunteered__c'], relationship: 'Coach record in NPSP Volunteer Management' },
      { object: 'Program_Engagement__c', fields: ['Volunteer__c', 'Program__c', 'Role__c', 'Start_Date__c'], relationship: 'Links coach to program delivery' },
      { object: 'Case',                  fields: ['ContactId', 'Type', 'Status__c', 'Description'], relationship: 'Escalation cases logged by or for coach' },
    ],
    standards: ['Facilitation Quality Standard', 'Escalation Response Standard', 'Data Entry Standard'],
    status: 'complete',
    owner: 'Program Lead',
    lastReviewed: 'May 2025',
  },
  {
    id: 'bp-program-lead',
    roleId: 'role-program-lead',
    roleName: 'Program Lead',
    personaName: 'Program Lead',
    shortDescription: 'Defines the full operational scope, system access, and Penny integration for a Program Lead.',
    purpose: 'Ensure Program Leads have a clear, system-supported operating model that spans intake, delivery, coaching, quality, and outcomes reporting.',
    responsibilities: [
      { area: 'Intake',            description: 'Manage full intake pipeline from enquiry to enrolled learner in Salesforce.', required: true },
      { area: 'Coach Coordination', description: 'Assign coaches to cohorts, manage coverage, and review session quality.', required: true },
      { area: 'Program Health',    description: 'Monitor daily program health dashboard and escalate issues.', required: true },
      { area: 'Outcomes Reporting', description: 'Produce monthly and cohort-end outcome reports from Salesforce.', required: true },
      { area: 'Curriculum Liaison', description: 'Communicate content gaps and delivery issues to Curriculum Designer.', required: false },
    ],
    requiredKnowledgeSources: ['Salesforce CRM', 'Program Health Dashboard', 'Curriculum Studio', 'Communications Module'],
    relatedProgramObjects: ['Training_Plan__c', 'Program_Enrollment__c', 'Campaign', 'Contact', 'Volunteer__c', 'Report'],
    relatedCommunications: [
      { channel: 'Program Lead Slack', type: 'Slack', purpose: 'Ops coordination and coach updates' },
      { channel: 'Ops Channel', type: 'Slack', purpose: 'Cross-program operational escalations' },
      { channel: 'Stakeholder Reports', type: 'Email', purpose: 'Funders, sponsors, and executive reporting' },
    ],
    calendarTouchpoints: ['Weekly program ops review', 'Cohort kick-off', 'End-of-cohort retrospective', 'Monthly outcome reporting', 'Funder meeting prep'],
    pennySupport: [
      { capability: 'Program Health Summaries', description: 'AI-generated program health snapshot with risk flags and recommended actions.' },
      { capability: 'Cohort Summaries',         description: 'Cohort progress overview across all active learners.' },
      { capability: 'Escalation Detection',     description: 'Escalation alerts surfaced to Program Lead when coach action stalls.' },
    ],
    salesforceMappings: [
      { object: 'Training_Plan__c',      fields: ['Program_Lead__c', 'Status__c', 'Cohort__c', 'Start_Date__c'], relationship: 'Program Lead is owner of Training Plan records' },
      { object: 'Campaign',             fields: ['OwnerId', 'Program__c', 'Status__c', 'Start_Date__c'],         relationship: 'Intake pipeline management' },
      { object: 'Report',               fields: ['Folder', 'Report_Type__c'],                                    relationship: 'Access to program health and outcome reports' },
    ],
    standards: ['Intake Quality Standard', 'Coach Assignment Standard', 'Outcomes Reporting Standard'],
    status: 'complete',
    owner: 'Executive Director',
    lastReviewed: 'May 2025',
  },
  {
    id: 'bp-curriculum-designer',
    roleId: 'role-curriculum-designer',
    roleName: 'Curriculum Designer',
    personaName: 'Curriculum Designer',
    shortDescription: 'Defines content authoring responsibilities, Penny prompt governance, and system access for a Curriculum Designer.',
    purpose: 'Ensure Curriculum Designers can author, review, and publish all learning content to Trail OS standards — with Penny AI integrated at authoring time.',
    responsibilities: [
      { area: 'Content Authoring',   description: 'Author and maintain modules, lessons, assessments, and resources in Curriculum Studio.', required: true },
      { area: 'Penny Prompts',       description: 'Write, review, and submit for approval all Penny coaching and quest prompts.', required: true },
      { area: 'Standards Compliance', description: 'Ensure all content passes consistency review before publication.', required: true },
      { area: 'Curriculum Mapping',  description: 'Map curriculum assets to Salesforce Training Plan objects.', required: false },
    ],
    requiredKnowledgeSources: ['Curriculum Studio', 'Standards Studio', 'Prompt Studio', 'Knowledge Source Registry'],
    relatedProgramObjects: ['Training_Plan__c', 'Training_Plan_Item__c', 'Knowledge__c'],
    relatedCommunications: [
      { channel: 'Curriculum Slack', type: 'Slack', purpose: 'Content team coordination and review requests' },
      { channel: 'Standards Review Meeting', type: 'Calendar', purpose: 'Periodic review of standards compliance across curriculum' },
    ],
    calendarTouchpoints: ['Sprint content review', 'Prompt approval batch review', 'Monthly standards audit', 'Cross-team curriculum alignment'],
    pennySupport: [
      { capability: 'Curriculum Generation',  description: 'AI-assisted drafting of module outlines, lesson structures, and quest sequences.' },
      { capability: 'Consistency Review',     description: 'Automated checks for standards compliance before content publication.' },
      { capability: 'Prompt Quality Review',  description: 'Quality scoring and hallucination risk flags on authored prompts.' },
    ],
    salesforceMappings: [
      { object: 'Training_Plan__c',      fields: ['Name', 'Program__c', 'Status__c', 'Curriculum_Designer__c'], relationship: 'Curriculum Designer linked as content owner' },
      { object: 'Knowledge__c',          fields: ['Title', 'Body', 'Status', 'Category'],                       relationship: 'Salesforce Knowledge articles for curriculum content' },
    ],
    standards: ['Content Quality Standard', 'Prompt Governance Standard', 'Accessibility Standard'],
    status: 'complete',
    owner: 'Program Lead',
    lastReviewed: 'May 2025',
  },
  {
    id: 'bp-penny-admin',
    roleId: 'role-penny-admin',
    roleName: 'Penny Admin',
    personaName: 'Penny Admin',
    shortDescription: 'Defines Penny governance responsibilities, system access, and oversight protocols for the Penny Admin role.',
    purpose: 'Ensure Penny AI operates within approved parameters at all times — with clear ownership of prompt governance, source trust, capability management, and quality monitoring.',
    responsibilities: [
      { area: 'Capability Registry',  description: 'Maintain capability registry — activate, deprecate, and document all Penny capabilities.', required: true },
      { area: 'Prompt Governance',    description: 'Review and approve all prompt templates before production deployment.', required: true },
      { area: 'Source Trust',         description: 'Configure knowledge source trust levels and Penny approval status in Source Registry.', required: true },
      { area: 'Quality Monitoring',   description: 'Monitor Penny quality metrics, hallucination rates, and output review queue.', required: true },
      { area: 'Incident Response',    description: 'Own Penny incident response — identify, escalate, and resolve output quality issues.', required: true },
    ],
    requiredKnowledgeSources: ['Penny Capability Registry', 'Prompt Studio', 'Knowledge Source Registry', 'Quality Review Logs'],
    relatedProgramObjects: ['Knowledge__c', 'Case', 'Integration_Log__c'],
    relatedCommunications: [
      { channel: 'Penny Admin Slack', type: 'Slack', purpose: 'Governance updates, prompt reviews, and incidents' },
      { channel: 'Quality Review Calendar', type: 'Calendar', purpose: 'Scheduled batch prompt and output quality reviews' },
    ],
    calendarTouchpoints: ['Weekly prompt review session', 'Monthly capability registry audit', 'Quarterly source trust review', 'Incident retrospectives'],
    pennySupport: [
      { capability: 'Prompt Governance',    description: 'Tooling to review, approve, and version control all prompt templates.' },
      { capability: 'Source Control',       description: 'Dashboard for managing knowledge source trust and Penny access rules.' },
      { capability: 'Quality Review',       description: 'Output quality monitoring, scoring, and review queue management.' },
    ],
    salesforceMappings: [
      { object: 'Knowledge__c', fields: ['Title', 'Penny_Approved__c', 'Trust_Level__c'], relationship: 'Penny Admin approves Knowledge articles as Penny sources' },
      { object: 'Case',         fields: ['Type', 'Subject', 'Status'],                    relationship: 'Penny quality incidents tracked as Cases' },
    ],
    standards: ['Prompt Governance Standard', 'Source Trust Standard', 'Incident Response Standard'],
    status: 'complete',
    owner: '',
    lastReviewed: 'May 2025',
  },
];

// ── PROGRAM PARTICIPATION ─────────────────────────────────────────────────────
export const programParticipation: ProgramParticipation[] = [
  {
    programId: 'foundations-trail',
    programName: 'Foundations Trail',
    programShort: 'Foundations',
    programColorCls: 'text-emerald-700',
    description: 'Entry-level 12-week cohort program. Broad role participation — learners, coaches, program lead, curriculum designer, and volunteer coaches all participate.',
    roleParticipation: [
      { roleId: 'role-learner-active',    roleName: 'Active Learner',      personaName: 'Learner',            type: 'Participant', description: 'Primary beneficiary — completes all modules, quests, and assessments.', touchpoints: ['Cohort kickoff', 'Weekly sessions', 'Milestone reviews', 'Graduation'] },
      { roleId: 'role-coach-lead',        roleName: 'Lead Coach',          personaName: 'Coach',              type: 'Lead',        description: 'Owns cohort facilitation and learner feedback.', touchpoints: ['All cohort sessions', 'Office hours', 'Coach briefs', 'Escalation response'] },
      { roleId: 'role-volunteer-coach',   roleName: 'Volunteer Coach',     personaName: 'Volunteer',          type: 'Support',     description: 'Supplements Lead Coach in facilitation and 1:1 support.', touchpoints: ['Selected sessions', 'Office hours'] },
      { roleId: 'role-program-lead',      roleName: 'Program Lead',        personaName: 'Program Lead',       type: 'Lead',        description: 'Manages intake pipeline, coach assignment, and program health.', touchpoints: ['Intake reviews', 'Coach coordination', 'Monthly ops review'] },
      { roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', personaName: 'Curriculum Designer', type: 'Support', description: 'Authors and maintains all Foundations Trail curriculum content.', touchpoints: ['Sprint reviews', 'Standards audits', 'Prompt reviews'] },
      { roleId: 'role-nonprofit-partner', roleName: 'Nonprofit Partner',   personaName: 'Nonprofit Partner',  type: 'Sponsor',     description: 'Refers learners and supports community-based delivery.', touchpoints: ['Intake referrals', 'Partner meetings'] },
    ],
  },
  {
    programId: 'guided-trail',
    programName: 'Guided Trail',
    programShort: 'Guided',
    programColorCls: 'text-blue-700',
    description: 'Structured coaching-intensive program with employer-linked outcomes. Adds employer partner and client sponsor participation.',
    roleParticipation: [
      { roleId: 'role-learner-active',    roleName: 'Active Learner',    personaName: 'Learner',          type: 'Participant', description: 'Progresses through guided coaching pathway with Penny support.', touchpoints: ['All program sessions', 'Employer matching', 'Mentoring sessions'] },
      { roleId: 'role-coach-lead',        roleName: 'Lead Coach',        personaName: 'Coach',            type: 'Lead',        description: 'Primary facilitator — intensive coaching relationship.', touchpoints: ['Weekly sessions', 'At-risk interventions', 'Graduation review'] },
      { roleId: 'role-coach-support',     roleName: 'Support Coach',     personaName: 'Coach',            type: 'Support',     description: 'Supplements Lead Coach during intensive delivery periods.', touchpoints: ['Selected sessions', 'Peer review sessions'] },
      { roleId: 'role-program-lead',      roleName: 'Program Lead',      personaName: 'Program Lead',     type: 'Lead',        description: 'Manages Guided Trail pipeline and sponsor reporting.', touchpoints: ['Intake', 'Sponsor reports', 'Monthly ops review'] },
      { roleId: 'role-client-sponsor',    roleName: 'Client Sponsor',    personaName: 'Client Sponsor',   type: 'Sponsor',     description: 'Funds or refers a learner cohort and receives outcome reports.', touchpoints: ['Intake referrals', 'Quarterly outcome reports'] },
      { roleId: 'role-volunteer-mentor',  roleName: 'Volunteer Mentor',  personaName: 'Volunteer',        type: 'Support',     description: 'Provides 1:1 mentoring alongside cohort facilitation.', touchpoints: ['Mentor matching sessions', 'Monthly check-ins'] },
    ],
  },
  {
    programId: 'explorers-trail',
    programName: "Explorer's Trail",
    programShort: 'Explorer',
    programColorCls: 'text-violet-700',
    description: 'Advanced skills exploration and career pathway program. Employer and curriculum design collaboration central.',
    roleParticipation: [
      { roleId: 'role-learner-active',       roleName: 'Active Learner',      personaName: 'Learner',            type: 'Participant', description: 'Self-directed learner with structured Penny-guided pathway.', touchpoints: ['Module completion', 'Quest submissions', 'Employer sessions'] },
      { roleId: 'role-coach-lead',           roleName: 'Lead Coach',          personaName: 'Coach',              type: 'Support',     description: 'Advisory coaching rather than direct facilitation.', touchpoints: ['Monthly milestone reviews', 'Escalation response'] },
      { roleId: 'role-program-lead',         roleName: 'Program Lead',        personaName: 'Program Lead',       type: 'Lead',        description: 'Manages program operations and employer partnerships.', touchpoints: ['Employer coordination', 'Outcome reporting'] },
      { roleId: 'role-employer-partner',     roleName: 'Employer Partner',    personaName: 'Employer Partner',   type: 'Sponsor',     description: 'Provides real-world skill contexts and hiring pipeline.', touchpoints: ['Curriculum input', 'Employer sessions', 'Graduate matching'] },
      { roleId: 'role-curriculum-designer',  roleName: 'Curriculum Designer', personaName: 'Curriculum Designer', type: 'Support',    description: 'Co-designs curriculum with employer input.', touchpoints: ['Skill mapping workshops', 'Content reviews'] },
    ],
  },
  {
    programId: 'trail-of-mastery',
    programName: 'Trail of Mastery',
    programShort: 'Mastery',
    programColorCls: 'text-amber-700',
    description: 'Advanced mastery program for experienced learners and coaches. Small cohorts, high-touch employer integration.',
    roleParticipation: [
      { roleId: 'role-learner-active',    roleName: 'Active Learner',    personaName: 'Learner',          type: 'Participant', description: 'Advanced learner — largely self-directed with Penny mentoring support.', touchpoints: ['Mastery assessments', 'Employer meetings', 'Graduation showcase'] },
      { roleId: 'role-coach-lead',        roleName: 'Lead Coach',        personaName: 'Coach',            type: 'Lead',        description: 'Senior coach with mastery-level facilitation experience.', touchpoints: ['Monthly sessions', 'Assessment review', 'Graduation prep'] },
      { roleId: 'role-program-lead',      roleName: 'Program Lead',      personaName: 'Program Lead',     type: 'Lead',        description: 'Manages Mastery cohort and employer matching pipeline.', touchpoints: ['Employer liaison', 'Outcome reporting'] },
      { roleId: 'role-employer-partner',  roleName: 'Employer Partner',  personaName: 'Employer Partner', type: 'Sponsor',     description: 'Central to Mastery — provides real hiring and placement pipeline.', touchpoints: ['Skill briefings', 'Placement matching', 'Outcome reviews'] },
      { roleId: 'role-executive-director', roleName: 'Executive Director', personaName: 'Executive Director', type: 'Observer', description: 'Strategic oversight of flagship Mastery program.', touchpoints: ['Outcome reviews', 'Stakeholder meetings'] },
    ],
  },
  {
    programId: 'digital-compass',
    programName: 'Digital Compass',
    programShort: 'Digital Compass',
    programColorCls: 'text-rose-700',
    description: 'Digital literacy and technology readiness program. Broad community access — Nonprofit Partners play a large referral role.',
    roleParticipation: [
      { roleId: 'role-learner-active',    roleName: 'Active Learner',    personaName: 'Learner',          type: 'Participant', description: 'Community learner building foundational digital skills.', touchpoints: ['Weekly sessions', 'Penny guided quests', 'Certification assessment'] },
      { roleId: 'role-coach-lead',        roleName: 'Lead Coach',        personaName: 'Coach',            type: 'Lead',        description: 'Facilitates community-facing delivery — accessible and inclusive approach.', touchpoints: ['All sessions', 'Community office hours'] },
      { roleId: 'role-volunteer-coach',   roleName: 'Volunteer Coach',   personaName: 'Volunteer',        type: 'Support',     description: 'High volunteer involvement — community coaches central to Digital Compass.', touchpoints: ['Most sessions', 'Community outreach'] },
      { roleId: 'role-program-lead',      roleName: 'Program Lead',      personaName: 'Program Lead',     type: 'Lead',        description: 'Manages community partnerships and referral pipeline.', touchpoints: ['Partner coordination', 'Intake management'] },
      { roleId: 'role-nonprofit-partner', roleName: 'Nonprofit Partner', personaName: 'Nonprofit Partner', type: 'Support',    description: 'Key referral and co-delivery partner for community access.', touchpoints: ['Learner referrals', 'Co-facilitation sessions'] },
    ],
  },
];

// ── COMM MAPPINGS ─────────────────────────────────────────────────────────────
export const commMappings: RoleCommMapping[] = [
  {
    roleId: 'role-learner-active', roleName: 'Active Learner', personaName: 'Learner',
    slack: [{ channel: '#cohort-[program]', purpose: 'Day-to-day cohort communication and peer connection' }, { channel: '#penny-quests', purpose: 'Quest submissions and Penny-facilitated discussions' }],
    googleChat: [{ space: 'Cohort Space', purpose: 'Shared resources, announcements, and group activities' }],
    calendar: [{ event: 'Weekly Cohort Session', cadence: 'Weekly', purpose: 'Main learning session' }, { event: 'Module Milestone Review', cadence: 'Per milestone', purpose: 'Progress check with coach' }],
    email: [{ type: 'Weekly Digest', trigger: 'Auto-generated by Penny weekly' }, { type: 'Onboarding Welcome', trigger: 'On enrollment' }],
  },
  {
    roleId: 'role-coach-lead', roleName: 'Lead Coach', personaName: 'Coach',
    slack: [{ channel: '#coach-team', purpose: 'Coach coordination and support' }, { channel: '#cohort-[program]', purpose: 'Cohort facilitation and learner communication' }, { channel: '#penny-alerts', purpose: 'Penny escalation and at-risk learner alerts' }],
    googleChat: [{ space: 'Coach Hub', purpose: 'Coach resources and briefing materials' }],
    calendar: [{ event: 'Cohort Sessions', cadence: 'Weekly', purpose: 'Facilitation' }, { event: 'Office Hours', cadence: 'Weekly', purpose: 'Learner 1:1 support' }, { event: 'Coach Briefing', cadence: 'Weekly', purpose: 'Penny-generated prep session' }],
    email: [{ type: 'Coach Brief', trigger: 'Auto-generated by Penny before each session' }, { type: 'Escalation Alert', trigger: 'Triggered by Penny when at-risk learner detected' }],
  },
  {
    roleId: 'role-program-lead', roleName: 'Program Lead', personaName: 'Program Lead',
    slack: [{ channel: '#program-ops', purpose: 'Program operational coordination' }, { channel: '#coach-team', purpose: 'Coach management and updates' }, { channel: '#escalations', purpose: 'Cross-program issue escalation' }],
    googleChat: [{ space: 'Ops Hub', purpose: 'Program health dashboards and weekly ops' }],
    calendar: [{ event: 'Weekly Ops Review', cadence: 'Weekly', purpose: 'Program health and ops check' }, { event: 'Monthly Outcome Review', cadence: 'Monthly', purpose: 'Reporting and stakeholder updates' }],
    email: [{ type: 'Program Health Summary', trigger: 'Auto-generated weekly by Penny' }, { type: 'Stakeholder Report', trigger: 'Monthly' }],
  },
  {
    roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', personaName: 'Curriculum Designer',
    slack: [{ channel: '#curriculum-team', purpose: 'Content team coordination and review requests' }, { channel: '#penny-prompts', purpose: 'Prompt drafts, reviews, and governance' }],
    googleChat: [],
    calendar: [{ event: 'Sprint Content Review', cadence: 'Per sprint', purpose: 'Review content before publication' }, { event: 'Standards Audit', cadence: 'Monthly', purpose: 'Compliance review across curriculum' }],
    email: [{ type: 'Consistency Review Report', trigger: 'Post-batch content submission' }],
  },
  {
    roleId: 'role-penny-admin', roleName: 'Penny Admin', personaName: 'Penny Admin',
    slack: [{ channel: '#penny-admin', purpose: 'Governance, incidents, and capability updates' }, { channel: '#penny-alerts', purpose: 'Quality monitoring and escalation alerts' }],
    googleChat: [],
    calendar: [{ event: 'Weekly Prompt Review', cadence: 'Weekly', purpose: 'Batch prompt approval queue' }, { event: 'Monthly Capability Audit', cadence: 'Monthly', purpose: 'Capability registry review' }],
    email: [{ type: 'Quality Review Report', trigger: 'Weekly automated report' }, { type: 'Incident Alert', trigger: 'On Penny quality incident detection' }],
  },
];

// ── PENNY SUPPORT MAPPINGS ────────────────────────────────────────────────────
export const pennySupportMappings: RolePennySupport[] = [
  {
    roleId: 'role-learner-active', roleName: 'Active Learner', personaName: 'Learner',
    capabilities: [
      { capability: 'Study Coach',        description: 'Daily coaching prompts aligned to current module and learner stage.',          status: 'active' },
      { capability: 'Trail Quests',       description: 'Gamified quest sequences that deepen engagement with curriculum content.',     status: 'active' },
      { capability: 'Reflection Prompts', description: 'Structured reflections at module milestones.',                                 status: 'active' },
      { capability: 'Weekly Review',      description: 'Auto-generated weekly summary of learner progress and next steps.',           status: 'active' },
    ],
    promptTypes: ['Study Coaching', 'Quest Guidance', 'Reflection', 'Milestone Summary'],
    accessLevel: 'Guided',
    notes: 'Learners interact with Penny via prompts and quests — no direct Penny admin access.',
  },
  {
    roleId: 'role-coach-lead', roleName: 'Lead Coach', personaName: 'Coach',
    capabilities: [
      { capability: 'Coach Briefs',         description: 'Weekly AI-generated briefings on cohort health and at-risk learners.', status: 'active' },
      { capability: 'Escalation Detection', description: 'Flags learner disengagement patterns requiring coach action.',            status: 'active' },
      { capability: 'Cohort Summaries',     description: 'Post-session cohort learning health snapshot.',                          status: 'prototype' },
      { capability: 'Session Prep',         description: 'Pre-session context — learner status, open quests, relevant content.',  status: 'planned' },
    ],
    promptTypes: ['Coach Brief', 'Escalation Alert', 'Session Prep', 'At-Risk Learner Flag'],
    accessLevel: 'Guided',
    notes: 'Coaches receive Penny outputs passively — briefs, alerts, and summaries. Active Penny querying planned for Q3.',
  },
  {
    roleId: 'role-program-lead', roleName: 'Program Lead', personaName: 'Program Lead',
    capabilities: [
      { capability: 'Program Health Summaries', description: 'AI-generated program health snapshot with risk flags.',     status: 'prototype' },
      { capability: 'Cohort Summaries',         description: 'Cohort progress overview across all active learners.',      status: 'prototype' },
      { capability: 'Escalation Detection',     description: 'Cross-cohort escalation visibility for Program Lead.',      status: 'planned' },
      { capability: 'Intake Summaries',         description: 'Intake pipeline summaries and conversion health digests.',  status: 'planned' },
    ],
    promptTypes: ['Program Health', 'Cohort Overview', 'Intake Digest', 'Escalation Summary'],
    accessLevel: 'Full',
    notes: 'Program Leads will have full access to all Penny outputs across their programs in Q3.',
  },
  {
    roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', personaName: 'Curriculum Designer',
    capabilities: [
      { capability: 'Curriculum Generation',  description: 'AI-assisted drafting of modules, lessons, and quest sequences.',   status: 'prototype' },
      { capability: 'Consistency Review',     description: 'Automated standards compliance checks before publication.',         status: 'active' },
      { capability: 'Prompt Quality Review',  description: 'Quality scoring and hallucination risk flags on authored prompts.', status: 'active' },
    ],
    promptTypes: ['Content Draft', 'Consistency Check', 'Prompt Quality Score', 'Standards Flag'],
    accessLevel: 'Full',
    notes: 'Curriculum Designers use Penny actively in authoring — generation and review tools are central to the workflow.',
  },
  {
    roleId: 'role-penny-admin', roleName: 'Penny Admin', personaName: 'Penny Admin',
    capabilities: [
      { capability: 'Prompt Governance',  description: 'Full tooling to review, approve, and version control all prompt templates.', status: 'prototype' },
      { capability: 'Source Control',     description: 'Dashboard for managing knowledge source trust and Penny access rules.',      status: 'prototype' },
      { capability: 'Quality Review',     description: 'Output quality monitoring, scoring, and review queue management.',           status: 'prototype' },
      { capability: 'Capability Registry', description: 'Manage and maintain the full Penny capability registry.',                  status: 'active' },
    ],
    promptTypes: ['Governance Review', 'Quality Audit', 'Source Trust Check', 'Incident Report'],
    accessLevel: 'Full',
    notes: 'Penny Admins have full platform access. Governance tooling is prototype — production workflow TBD Q3.',
  },
  {
    roleId: 'role-executive-director', roleName: 'Executive Director', personaName: 'Executive Director',
    capabilities: [
      { capability: 'Executive Briefs',    description: 'Strategic summary of program health, outcomes, and risk across all programs.', status: 'planned' },
      { capability: 'Impact Summaries',    description: 'AI-generated impact narrative for funder and board reporting.',               status: 'planned' },
    ],
    promptTypes: ['Executive Brief', 'Impact Narrative', 'Board Report Draft'],
    accessLevel: 'Read-Only',
    notes: 'Executive Penny access is read-only — strategic summaries only. Planned for Q4.',
  },
];

// ── SALESFORCE MAPPINGS ───────────────────────────────────────────────────────
export const salesforceMappings: RoleSalesforceMapping[] = [
  {
    roleId: 'role-learner-active', roleName: 'Active Learner', personaName: 'Learner',
    primaryObject: 'Contact',
    relatedObjects: [
      { object: 'Program_Enrollment__c', relationship: 'Has many', fields: ['Program__c', 'Cohort__c', 'Status__c', 'Start_Date__c'] },
      { object: 'Training_Plan__c',      relationship: 'Has many', fields: ['Learner__c', 'Module_Progress__c', 'Completion_Date__c'] },
      { object: 'Case',                  relationship: 'Has many', fields: ['ContactId', 'Type', 'Status__c'] },
    ],
    permissionModel: 'Learner Portal Profile — read access to own records, submit access for assignments.',
    futureNotes: 'Nonprofit Cloud migration will shift to unified Contact model with improved learner journey tracking.',
  },
  {
    roleId: 'role-coach-lead', roleName: 'Lead Coach', personaName: 'Coach',
    primaryObject: 'Volunteer__c (NPSP)',
    relatedObjects: [
      { object: 'Program_Engagement__c', relationship: 'Has many', fields: ['Volunteer__c', 'Program__c', 'Role__c'] },
      { object: 'Contact',               relationship: 'Has one',  fields: ['Name', 'Email', 'Phone'] },
      { object: 'Case',                  relationship: 'Can create', fields: ['Subject', 'Status', 'ContactId'] },
    ],
    permissionModel: 'Coach Profile — read access to enrolled learner records, create/edit on Program Engagements and Cases.',
    futureNotes: 'NPSP Volunteer Management migrating to Nonprofit Cloud Volunteer Management. Mapping to be updated post-migration.',
  },
  {
    roleId: 'role-program-lead', roleName: 'Program Lead', personaName: 'Program Lead',
    primaryObject: 'User (Salesforce Internal)',
    relatedObjects: [
      { object: 'Training_Plan__c',      relationship: 'Owns',     fields: ['Program_Lead__c', 'Status__c', 'Cohort__c'] },
      { object: 'Campaign',              relationship: 'Owns',     fields: ['OwnerId', 'Program__c', 'Status__c'] },
      { object: 'Program_Enrollment__c', relationship: 'Full access', fields: ['All'] },
      { object: 'Report',                relationship: 'Full access', fields: ['Program health and outcome reports'] },
    ],
    permissionModel: 'Program Lead Profile — full access to program records, intake pipeline, coach records, and reporting.',
    futureNotes: 'Permission model to be reviewed as Nonprofit Cloud introduces new program management objects.',
  },
  {
    roleId: 'role-curriculum-designer', roleName: 'Curriculum Designer', personaName: 'Curriculum Designer',
    primaryObject: 'Training_Plan__c',
    relatedObjects: [
      { object: 'Training_Plan_Item__c', relationship: 'Owns',     fields: ['All curriculum item fields'] },
      { object: 'Knowledge__c',          relationship: 'Creates',  fields: ['Title', 'Body', 'Category', 'Status'] },
    ],
    permissionModel: 'Curriculum Designer Profile — create/edit on Training Plan and Knowledge objects. No access to learner PII.',
    futureNotes: 'Knowledge article model to be extended for Penny prompt templates in Q3.',
  },
  {
    roleId: 'role-penny-admin', roleName: 'Penny Admin', personaName: 'Penny Admin',
    primaryObject: 'Knowledge__c',
    relatedObjects: [
      { object: 'Case',  relationship: 'Creates and manages', fields: ['Type', 'Subject', 'Status', 'Description'] },
    ],
    permissionModel: 'Penny Admin Custom Profile — full access to Knowledge, Penny config objects, and incident cases. TBD Q3.',
    futureNotes: 'Formal Penny Admin permission set to be defined as part of Integration Readiness work Q3.',
  },
  {
    roleId: 'role-salesforce-admin', roleName: 'Salesforce Admin', personaName: 'Salesforce Admin',
    primaryObject: 'User / Profile / Permission Set',
    relatedObjects: [
      { object: 'All objects',          relationship: 'System Administrator', fields: ['Full access'] },
      { object: 'Integration_Log__c',   relationship: 'Monitors',             fields: ['Integration__c', 'Status__c', 'Error_Detail__c'] },
    ],
    permissionModel: 'System Administrator Profile — full Salesforce access. Managed separately from program role permissions.',
    futureNotes: 'Nonprofit Cloud migration is the primary near-term Salesforce Admin workstream. See Integration Readiness Center.',
  },
  {
    roleId: 'role-client-sponsor', roleName: 'Client Sponsor', personaName: 'Client Sponsor',
    primaryObject: 'Account',
    relatedObjects: [
      { object: 'Opportunity', relationship: 'Has many', fields: ['Account', 'Amount', 'Stage', 'Program__c'] },
      { object: 'Contact',     relationship: 'Has many', fields: ['AccountId', 'Role__c'] },
    ],
    permissionModel: 'Not yet defined — Account record type for Client Sponsors pending.',
    futureNotes: 'Define Account record type and Opportunity model for Client Sponsors. Outcome reporting portal planned Q4.',
  },
];

// ── ROLE HEALTH ───────────────────────────────────────────────────────────────
export const roleHealthRecords: RoleHealthRecord[] = roles.map(role => {
  const issues: string[] = [...role.healthIssues];
  const missingOwner              = role.owner === null;
  const unclearResponsibilities   = role.blueprintStatus === 'missing';
  const missingCommChannel        = !commMappings.find(c => c.roleId === role.id);
  const missingPennySupport       = !pennySupportMappings.find(p => p.roleId === role.id);
  const missingSalesforceMapping  = !salesforceMappings.find(s => s.roleId === role.id);
  const trainingGap               = role.blueprintStatus !== 'complete';

  if (missingOwner)             issues.push('No owner assigned to this role');
  if (unclearResponsibilities)  issues.push('Role blueprint missing — responsibilities undefined');
  if (missingCommChannel)       issues.push('No communication channel mapping defined');
  if (missingPennySupport)      issues.push('No Penny support configuration defined');
  if (missingSalesforceMapping) issues.push('No Salesforce object mapping defined');

  const flagCount = [missingOwner, unclearResponsibilities, missingCommChannel, missingPennySupport, missingSalesforceMapping, trainingGap].filter(Boolean).length;
  const healthScore = Math.round(Math.max(0, 100 - (flagCount * 17)));

  const recommendations: string[] = [];
  if (missingOwner)             recommendations.push('Assign a named owner to this role.');
  if (unclearResponsibilities)  recommendations.push('Create a Role Blueprint in People & Roles Studio.');
  if (missingCommChannel)       recommendations.push('Define communication channel mapping.');
  if (missingPennySupport)      recommendations.push('Configure Penny support capabilities for this role.');
  if (missingSalesforceMapping) recommendations.push('Define Salesforce object mapping.');
  if (trainingGap)              recommendations.push('Complete or publish the role blueprint.');

  return {
    roleId: role.id,
    roleName: role.name,
    personaId: role.personaId,
    personaName: role.personaName,
    healthScore,
    healthStatus: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'needs-attention' : 'incomplete',
    missingOwner,
    unclearResponsibilities,
    missingCommChannel,
    missingPennySupport,
    missingSalesforceMapping,
    trainingGap,
    issues,
    recommendations,
  } as RoleHealthRecord;
});
