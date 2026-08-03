// ── Curriculum Studio Data — Learning Architecture Workspace ─────────────────
// Models the full Trail OS learning architecture:
// Program → Cohort → Sprint → Module
//   └── Lessons, Assessments, Knowledge Articles, Resources
//   └── Penny Assets: Coaching Prompts, Reflection Prompts, Trail Quests, Weekly Reviews
//   └── Delivery Assets: Slack Activities, Google Chat Updates, Calendar Events, Office Hours
//
// Relationship-first design: Module is the central connective node.
// Foundations Trail (Module 2.1) is the primary fully-connected example.

// ── Types ─────────────────────────────────────────────────────────────────────

export type CurriculumObjectType =
  | 'program' | 'cohort' | 'sprint' | 'module'
  | 'lesson' | 'assessment' | 'knowledgeArticle' | 'resource'
  | 'coachingPrompt' | 'reflectionPrompt' | 'trailQuest' | 'weeklyReview'
  | 'slackActivity' | 'googleChatUpdate' | 'calendarEvent' | 'officeHours'
  | 'healthIssue';

export type ContentStatus     = 'published' | 'draft' | 'needs-review' | 'missing';
export type ContentConfidence = 'confirmed' | 'prototype' | 'draft' | 'planned';
export type HealthSeverity    = 'high' | 'medium' | 'low';
export type HealthCheckType   =
  | 'missing-objectives' | 'missing-assessment' | 'missing-knowledge-link'
  | 'missing-penny-prompts' | 'duplicate-concept' | 'missing-delivery'
  | 'no-owner' | 'needs-review';

export interface CurriculumItem {
  id: string;
  objectType: CurriculumObjectType;
  name: string;
  status: ContentStatus;
  confidence: ContentConfidence;
  owner: string;
  program: string;
  purpose?: string;
  relatedSalesforceObject: string;
  relatedLmsObject: string;
  pennyActions: string[];
  futureDemandLink: string;
  notes?: string;
  [key: string]: unknown;
}

// ── Display Config ────────────────────────────────────────────────────────────

export const CURRICULUM_OBJECT_CONFIG: Record<CurriculumObjectType, {
  label: string; pluralLabel: string; chip: string; border: string; group: string;
}> = {
  program:          { label: 'Program',            pluralLabel: 'Programs',            chip: 'bg-primary/10 text-primary border-primary/20',          border: 'border-primary/20 hover:border-primary/40',         group: 'Program Structure' },
  cohort:           { label: 'Cohort',             pluralLabel: 'Cohorts',             chip: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',              border: 'border-[#E6F0EA] hover:border-[#9FC3AE]',             group: 'Program Structure' },
  sprint:           { label: 'Sprint',             pluralLabel: 'Sprints',             chip: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',        border: 'border-[#EDF5F8] hover:border-[#7FAFC6]',         group: 'Program Structure' },
  module:           { label: 'Module',             pluralLabel: 'Modules',             chip: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',                 border: 'border-[#EDF5F8] hover:border-[#7FAFC6]',               group: 'Program Structure' },
  lesson:           { label: 'Lesson',             pluralLabel: 'Lessons',             chip: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',           border: 'border-[#FFF3E0] hover:border-[#FFD08A]',           group: 'Learning Assets' },
  assessment:       { label: 'Assessment',         pluralLabel: 'Assessments',         chip: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',              border: 'border-[#FBEAE6] hover:border-[#E8B9B4]',             group: 'Learning Assets' },
  knowledgeArticle: { label: 'Knowledge Article',  pluralLabel: 'Knowledge Articles',  chip: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',        border: 'border-[#EDF5F8] hover:border-[#7FAFC6]',         group: 'Learning Assets' },
  resource:         { label: 'Resource',           pluralLabel: 'Resources',           chip: 'bg-slate-50 text-slate-800 border-slate-200',           border: 'border-slate-100 hover:border-slate-300',           group: 'Learning Assets' },
  coachingPrompt:   { label: 'Coaching Prompt',    pluralLabel: 'Coaching Prompts',    chip: 'bg-secondary/10 text-secondary border-secondary/20',    border: 'border-secondary/20 hover:border-secondary/40',     group: 'Penny Assets' },
  reflectionPrompt: { label: 'Reflection Prompt',  pluralLabel: 'Reflection Prompts',  chip: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',        border: 'border-[#EDF5F8] hover:border-[#7FAFC6]',         group: 'Penny Assets' },
  trailQuest:       { label: 'Trail Quest',        pluralLabel: 'Trail Quests',        chip: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',     border: 'border-[#E6F0EA] hover:border-[#9FC3AE]',       group: 'Penny Assets' },
  weeklyReview:     { label: 'Weekly Review',      pluralLabel: 'Weekly Reviews',      chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',              border: 'border-cyan-100 hover:border-cyan-300',             group: 'Penny Assets' },
  slackActivity:    { label: 'Slack Activity',     pluralLabel: 'Slack Activities',    chip: 'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',           border: 'border-[#E6F0EA] hover:border-green-300',           group: 'Delivery Assets' },
  googleChatUpdate: { label: 'Google Chat Update', pluralLabel: 'Google Chat Updates', chip: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',              border: 'border-[#EDF5F8] hover:border-[#7FAFC6]',             group: 'Delivery Assets' },
  calendarEvent:    { label: 'Calendar Event',     pluralLabel: 'Calendar Events',     chip: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',        border: 'border-[#FFF3E0] hover:border-orange-300',         group: 'Delivery Assets' },
  officeHours:      { label: 'Office Hours',       pluralLabel: 'Office Hours',        chip: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',              border: 'border-[#FBEAE6] hover:border-pink-300',             group: 'Delivery Assets' },
  healthIssue:      { label: 'Health Issue',       pluralLabel: 'Health Issues',       chip: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]',                 border: 'border-[#FBEAE6] hover:border-red-300',               group: 'Content Health' },
};

export const CONTENT_STATUS_CONFIG: Record<ContentStatus, { label: string; cls: string }> = {
  published:      { label: 'Published',    cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]' },
  draft:          { label: 'Draft',        cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  'needs-review': { label: 'Needs Review', cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  missing:        { label: 'Missing',      cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
};

export const SEVERITY_CONFIG: Record<HealthSeverity, { label: string; cls: string }> = {
  high:   { label: 'High',   cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
  medium: { label: 'Medium', cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  low:    { label: 'Low',    cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
};

export const HEALTH_CHECK_CONFIG: Record<HealthCheckType, { label: string; description: string }> = {
  'missing-objectives':    { label: 'Missing Learning Objectives', description: 'Module has no defined learning objectives.' },
  'missing-assessment':    { label: 'Missing Assessment',          description: 'Module has no linked assessment.' },
  'missing-knowledge-link':{ label: 'Missing Knowledge Articles',  description: 'Module has no linked knowledge articles.' },
  'missing-penny-prompts': { label: 'Missing Penny Prompts',       description: 'Module has no coaching or reflection prompts.' },
  'duplicate-concept':     { label: 'Duplicate Concept',           description: 'Content concept overlaps with another module.' },
  'missing-delivery':      { label: 'Missing Delivery Activities', description: 'Module has no Slack, Calendar, or Office Hours assets.' },
  'no-owner':              { label: 'No Owner Assigned',           description: 'No owner assigned to this content object.' },
  'needs-review':          { label: 'Needs Content Review',        description: 'Content flagged for review before publishing.' },
};

// ── Programs ──────────────────────────────────────────────────────────────────

export const curriculumPrograms: CurriculumItem[] = [
  {
    id: 'prog-foundations',
    objectType: 'program',
    name: 'Foundations Trail',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Program Manager',
    program: 'Foundations Trail',
    purpose: 'Salesforce skills training and certification preparation — prepares learners for Admin and Associate certifications in a 12-week cohort format with 4 sprints, 12 modules, and Penny-assisted content throughout.',
    relatedSalesforceObject: 'Program__c',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Module', 'Create Assessment', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request',
    sprintCount: 4, moduleCount: 12, lessonCount: 36, assessmentCount: 12,
    knowledgeArticleCount: 10, cohortCount: 2,
    duration: '12 weeks',
    audience: 'Career changers seeking Salesforce Admin or Associate certification',
    cohortIds: ['coh-ft-01', 'coh-ft-02'],
    sprintIds: ['spr-ft-1', 'spr-ft-2', 'spr-ft-3', 'spr-ft-4'],
    notes: 'Primary prototype example — full relationship data modeled here.',
  },
  {
    id: 'prog-guided',
    objectType: 'program',
    name: 'Guided Trail',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Program Manager',
    program: 'Guided Trail',
    purpose: 'Multi-sprint career transition program with cohort coaching, Trail Quests, and Penny AI guidance — 12–16 weeks for adult career changers.',
    relatedSalesforceObject: 'Program__c',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Lesson', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request',
    sprintCount: 4, moduleCount: 8, lessonCount: 24, assessmentCount: 8,
    duration: '12–16 weeks',
    cohortIds: ['coh-gt-01'],
  },
  {
    id: 'prog-explorers',
    objectType: 'program',
    name: "Explorer's Trail",
    status: 'needs-review',
    confidence: 'prototype',
    owner: 'Program Manager',
    program: "Explorer's Trail",
    purpose: 'No-barrier entry program for adults new to digital environments — 4-week subsidized cohort with foundational digital literacy focus.',
    relatedSalesforceObject: 'Program__c',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Knowledge Article', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request',
    sprintCount: 1, moduleCount: 4, lessonCount: 12, assessmentCount: 4,
    duration: '4 weeks',
    notes: 'Content review needed for sprint 1 materials.',
  },
  {
    id: 'prog-compass',
    objectType: 'program',
    name: 'Digital Compass',
    status: 'draft',
    confidence: 'prototype',
    owner: 'Program Manager',
    program: 'Digital Compass',
    purpose: 'Employer partnership program placing learners on real nonprofit workplace projects — sprint cycles and employer presentations.',
    relatedSalesforceObject: 'Program__c',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Create Module', 'Create Google Chat Update', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request',
    sprintCount: 2, moduleCount: 6, lessonCount: 16, assessmentCount: 4,
    duration: '8 weeks',
    notes: 'Client-facing content drafts in progress.',
  },
  {
    id: 'prog-mastery',
    objectType: 'program',
    name: 'Trail of Mastery',
    status: 'draft',
    confidence: 'planned',
    owner: 'Program Manager',
    program: 'Trail of Mastery',
    purpose: 'Advanced credential path for Foundations Trail alumni — specialty certifications and career positioning.',
    relatedSalesforceObject: 'Program__c',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment'],
    futureDemandLink: 'Submit Change Request',
    sprintCount: 0, moduleCount: 0, lessonCount: 0, assessmentCount: 0,
    notes: 'Planned — no content created yet.',
  },
];

// ── Cohorts ───────────────────────────────────────────────────────────────────

export const curriculumCohorts: CurriculumItem[] = [
  {
    id: 'coh-ft-01',
    objectType: 'cohort',
    name: 'Foundations Trail — Cohort 1 (Jan 2025)',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Program Manager',
    program: 'Foundations Trail',
    purpose: 'First delivery of the Foundations Trail program — 14 learners across 12 weeks. Used to validate curriculum, delivery pace, and Penny prompt effectiveness.',
    relatedSalesforceObject: 'Cohort__c',
    relatedLmsObject: 'TrailGroup__c (Salesforce LMS)',
    pennyActions: ['Generate Weekly Review', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request',
    startDate: 'Jan 13, 2025',
    endDate: 'Apr 4, 2025',
    learnerCount: 14,
    activeLearners: 12,
    atRiskLearners: 2,
    completionRate: '86%',
    programId: 'prog-foundations',
    currentSprint: 'Sprint 3 — Automation & Flows',
    notes: 'Active cohort. Week 7 progress review completed.',
  },
  {
    id: 'coh-ft-02',
    objectType: 'cohort',
    name: 'Foundations Trail — Cohort 2 (Mar 2025)',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Program Manager',
    program: 'Foundations Trail',
    purpose: 'Second delivery of Foundations Trail — 12 learners. Incorporates improvements from Cohort 1 feedback.',
    relatedSalesforceObject: 'Cohort__c',
    relatedLmsObject: 'TrailGroup__c (Salesforce LMS)',
    pennyActions: ['Generate Weekly Review', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request',
    startDate: 'Mar 10, 2025',
    endDate: 'May 30, 2025',
    learnerCount: 12,
    activeLearners: 12,
    atRiskLearners: 0,
    completionRate: 'In progress',
    programId: 'prog-foundations',
    currentSprint: 'Sprint 1 — Salesforce Foundations',
  },
  {
    id: 'coh-gt-01',
    objectType: 'cohort',
    name: 'Guided Trail — Cohort 1 (Feb 2025)',
    status: 'published',
    confidence: 'prototype',
    owner: 'Program Manager',
    program: 'Guided Trail',
    purpose: 'First Guided Trail delivery — 10 learners in a coaching-intensive format.',
    relatedSalesforceObject: 'Cohort__c',
    relatedLmsObject: 'TrailGroup__c (Salesforce LMS)',
    pennyActions: ['Generate Weekly Review'],
    futureDemandLink: 'Submit Change Request',
    startDate: 'Feb 3, 2025',
    learnerCount: 10,
    activeLearners: 9,
    programId: 'prog-guided',
  },
];

// ── Sprints ────────────────────────────────────────────────────────────────────

export const curriculumSprints: CurriculumItem[] = [
  {
    id: 'spr-ft-1',
    objectType: 'sprint',
    name: 'Sprint 1 — Salesforce Ecosystem Foundations',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Establish foundational understanding of the Salesforce ecosystem, CRM concepts, and the Admin role — with career context for the learner\'s transition journey.',
    relatedSalesforceObject: 'Sprint__c',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Coach Notes', 'Create Slack Prompt'],
    futureDemandLink: 'Submit Change Request',
    sprintNumber: 1, duration: 'Weeks 1–3', moduleCount: 3,
    theme: 'Ecosystem, CRM, Navigation',
    resolvePhase: 'Recognize',
    moduleIds: ['mod-1-1', 'mod-1-2', 'mod-1-3'],
    programId: 'prog-foundations',
  },
  {
    id: 'spr-ft-2',
    objectType: 'sprint',
    name: 'Sprint 2 — Data Modeling & Admin Fundamentals',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Build core Salesforce admin competency in data modeling, user management, security settings, reports, and dashboards — the foundation of the Admin certification.',
    relatedSalesforceObject: 'Sprint__c',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request',
    sprintNumber: 2, duration: 'Weeks 4–6', moduleCount: 3,
    theme: 'Data Modeling, Security, Reporting',
    resolvePhase: 'Explore',
    moduleIds: ['mod-2-1', 'mod-2-2', 'mod-2-3'],
    programId: 'prog-foundations',
  },
  {
    id: 'spr-ft-3',
    objectType: 'sprint',
    name: 'Sprint 3 — Automation & Flows',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Introduce process automation, Flow Builder, and basic integration concepts — enabling learners to build and manage automated workflows in Salesforce.',
    relatedSalesforceObject: 'Sprint__c',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Lesson', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request',
    sprintNumber: 3, duration: 'Weeks 7–9', moduleCount: 3,
    theme: 'Automation, Flow Builder, Integrations',
    resolvePhase: 'Select',
    moduleIds: ['mod-3-1', 'mod-3-2', 'mod-3-3'],
    programId: 'prog-foundations',
  },
  {
    id: 'spr-ft-4',
    objectType: 'sprint',
    name: 'Sprint 4 — Certification Prep & Career Launch',
    status: 'needs-review',
    confidence: 'prototype',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Prepare learners for Salesforce Admin or Associate certification and the job market — exam strategy, mock exams, portfolio work, career positioning.',
    relatedSalesforceObject: 'Sprint__c',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request',
    sprintNumber: 4, duration: 'Weeks 10–12', moduleCount: 3,
    theme: 'Certification, Portfolio, Career',
    resolvePhase: 'Verify',
    moduleIds: ['mod-4-1', 'mod-4-2', 'mod-4-3'],
    programId: 'prog-foundations',
    notes: 'Career Launch module content needs review — portfolio content updated Q1.',
  },
];

// ── Modules ────────────────────────────────────────────────────────────────────
// Module 2.1 is the fully-connected sample — all relationship arrays populated.
// Other modules have partial relationship data showing realistic coverage gaps.

export const curriculumModules: CurriculumItem[] = [
  // Sprint 1
  {
    id: 'mod-1-1', objectType: 'module', name: 'Salesforce Basics & the CRM Landscape',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-1', sprint: 'Sprint 1 — Salesforce Ecosystem Foundations', moduleNumber: '1.1',
    purpose: 'Orient learners to the Salesforce ecosystem, the role of CRM, and where Salesforce fits in a nonprofit or business context.',
    learningObjectives: ['Explain what Salesforce is and why organizations use it', 'Describe the main cloud products and their purposes', 'Navigate a Salesforce org for the first time'],
    outcomes: ['Can describe the Salesforce ecosystem to a client', 'Passes Module 1.1 Assessment with 75%+'],
    lessonIds: ['les-1-1a', 'les-1-1b'], assessmentIds: ['asmnt-1-1'],
    knowledgeArticleIds: ['ka-sf-basics'], coachingPromptIds: ['cp-1-1-intro'],
    reflectionPromptIds: ['rp-1-1a'], slackActivityIds: ['sa-sprint-1-launch'],
    calendarEventIds: [], relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Reflection Prompt', 'Create Assessment'], futureDemandLink: 'Submit Change Request',
  },
  {
    id: 'mod-1-2', objectType: 'module', name: 'Navigation, AppBuilder & Customization Basics',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-1', sprint: 'Sprint 1 — Salesforce Ecosystem Foundations', moduleNumber: '1.2',
    purpose: 'Introduce learners to the Salesforce UI, navigation patterns, and basic App Builder customization.',
    learningObjectives: ['Navigate the Lightning interface confidently', 'Customize an App using App Builder', 'Understand tabs, views, and object layouts'],
    outcomes: ['Can configure a basic Salesforce app for a client', 'Passes Module 1.2 Assessment with 75%+'],
    lessonIds: ['les-1-2a', 'les-1-2b'], assessmentIds: ['asmnt-1-2'],
    knowledgeArticleIds: [], coachingPromptIds: ['cp-general-checkin'],
    reflectionPromptIds: ['rp-1-2a'], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Assessment'], futureDemandLink: 'Submit Change Request',
    notes: 'Knowledge articles not yet linked — hi-kb-1-2 flagged.',
  },
  {
    id: 'mod-1-3', objectType: 'module', name: 'User Management & Security Basics',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-1', sprint: 'Sprint 1 — Salesforce Ecosystem Foundations', moduleNumber: '1.3',
    purpose: 'Cover user management, profiles, roles, permission sets, and basic security model in Salesforce.',
    learningObjectives: ['Create and manage Salesforce users', 'Configure profiles and permission sets', 'Understand the Salesforce security model'],
    outcomes: ['Can set up a user org structure', 'Passes Module 1.3 Assessment with 75%+'],
    lessonIds: ['les-1-3a', 'les-1-3b'], assessmentIds: ['asmnt-1-3'],
    knowledgeArticleIds: ['ka-security'], coachingPromptIds: [],
    reflectionPromptIds: ['rp-module-complete'], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Assessment'], futureDemandLink: 'Submit Change Request',
    notes: 'No coaching prompts linked — flagged in Content Health.',
  },

  // Sprint 2 — The fully-connected showcase module is 2.1
  {
    id: 'mod-2-1', objectType: 'module', name: 'Data Modeling & Schema Design',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-2', sprint: 'Sprint 2 — Data Modeling & Admin Fundamentals', moduleNumber: '2.1',
    purpose: 'Build learner competency in Salesforce data modeling — custom objects, fields, relationships, and Schema Builder — as the foundation for all admin work.',
    learningObjectives: [
      'Define custom objects and explain their role in a Salesforce data model',
      'Select the correct field type for a given data requirement',
      'Create a multi-object schema using Schema Builder',
      'Explain the difference between Lookup and Master-Detail relationships',
    ],
    outcomes: [
      'Can design a custom object schema for a simple business use case',
      'Can use Schema Builder to build and review a data model',
      'Passes Module 2.1 Data Modeling Assessment with 75%+',
      'Can explain their data model decisions to a coach or client',
    ],
    lessonIds: ['les-2-1a', 'les-2-1b', 'les-2-1c'],
    assessmentIds: ['asmnt-2-1'],
    knowledgeArticleIds: ['ka-dm-1', 'ka-dm-2'],
    coachingPromptIds: ['cp-2-1-intro', 'cp-2-1-stuck'],
    reflectionPromptIds: ['rp-2-1a', 'rp-2-1b'],
    slackActivityIds: ['sa-2-1-kickoff', 'sa-2-1-lab'],
    calendarEventIds: ['ce-2-1-oh'],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Reflection Prompt', 'Create Assessment', 'Generate Weekly Review'],
    futureDemandLink: 'Submit Change Request',
    isFeatured: true,
    notes: 'Fully connected example — all asset types linked. Use as the content architecture standard.',
  },
  {
    id: 'mod-2-2', objectType: 'module', name: 'Relationships, Lookups & Junction Objects',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-2', sprint: 'Sprint 2 — Data Modeling & Admin Fundamentals', moduleNumber: '2.2',
    purpose: 'Deep-dive into Salesforce relationships — Lookup, Master-Detail, Many-to-Many, and self-relationships — with junction object patterns.',
    learningObjectives: ['Build Master-Detail and Lookup relationships', 'Design a Many-to-Many relationship using a junction object', 'Understand roll-up summary fields'],
    outcomes: ['Can model complex data relationships', 'Passes Module 2.2 Assessment with 75%+'],
    lessonIds: ['les-2-2a', 'les-2-2b'], assessmentIds: ['asmnt-2-2'],
    knowledgeArticleIds: [], coachingPromptIds: ['cp-general-checkin'],
    reflectionPromptIds: [], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request',
    notes: 'Missing delivery activities and reflection prompts — flagged in Content Health.',
  },
  {
    id: 'mod-2-3', objectType: 'module', name: 'Data Quality & Validation Rules',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-2', sprint: 'Sprint 2 — Data Modeling & Admin Fundamentals', moduleNumber: '2.3',
    purpose: 'Introduce data quality controls — validation rules, required fields, duplicate management, and data governance principles.',
    learningObjectives: ['Create validation rules with error messages', 'Configure required fields and default values', 'Use duplicate management rules'],
    outcomes: ['Can build a data quality ruleset for a Salesforce org'],
    lessonIds: ['les-2-3a'], assessmentIds: ['asmnt-2-3'],
    knowledgeArticleIds: ['ka-data-quality'], coachingPromptIds: ['cp-general-checkin'],
    reflectionPromptIds: ['rp-module-complete'], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Assessment'], futureDemandLink: 'Submit Change Request',
  },

  // Sprint 3 — some incomplete to show health issues
  {
    id: 'mod-3-1', objectType: 'module', name: 'Screen Flows & Record-Triggered Flows',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-3', sprint: 'Sprint 3 — Automation & Flows', moduleNumber: '3.1',
    purpose: 'Build learner competency in Salesforce Flow Builder — screen flows for user-facing wizards and record-triggered flows for automation.',
    learningObjectives: ['Build a screen flow with multiple screens', 'Create a record-triggered flow for automation', 'Debug flows using the Flow debugger'],
    outcomes: ['Can build a basic screen flow', 'Can create a record-triggered update flow'],
    lessonIds: ['les-3-1a', 'les-3-1b'], assessmentIds: [],
    knowledgeArticleIds: ['ka-automation'], coachingPromptIds: ['cp-general-checkin'],
    reflectionPromptIds: ['rp-3-1a'], slackActivityIds: ['sa-3-1-lab'], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Assessment', 'Create Coaching Prompt'], futureDemandLink: 'Submit Change Request',
    notes: 'No assessment linked — flagged in Content Health.',
  },
  {
    id: 'mod-3-2', objectType: 'module', name: 'Subflows, Loops & Advanced Automation',
    status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-3', sprint: 'Sprint 3 — Automation & Flows', moduleNumber: '3.2',
    purpose: 'Extend Flow knowledge with subflows, loop elements, collection variables, and scheduled automation patterns.',
    learningObjectives: [],
    outcomes: [],
    lessonIds: ['les-3-2a'], assessmentIds: ['asmnt-3-2'],
    knowledgeArticleIds: [], coachingPromptIds: [],
    reflectionPromptIds: [], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Assessment'], futureDemandLink: 'Submit Change Request',
    notes: 'Multiple health issues — no objectives, no knowledge articles, no prompts. Needs full content pass before publishing.',
  },
  {
    id: 'mod-3-3', objectType: 'module', name: 'Approval Processes & Email Alerts',
    status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-3', sprint: 'Sprint 3 — Automation & Flows', moduleNumber: '3.3',
    purpose: 'Configure Salesforce approval processes and email alert automation for workflow-style business rules.',
    learningObjectives: ['Build an approval process with multiple steps', 'Configure email alerts and outbound messages'],
    outcomes: ['Can design an approval workflow for a business scenario'],
    lessonIds: ['les-3-3a'], assessmentIds: ['asmnt-3-3'],
    knowledgeArticleIds: [], coachingPromptIds: ['cp-general-checkin'],
    reflectionPromptIds: ['rp-module-complete'], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt'], futureDemandLink: 'Submit Change Request',
  },

  // Sprint 4 — draft/planned
  {
    id: 'mod-4-1', objectType: 'module', name: 'Exam Strategy & Study Planning',
    status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-4', sprint: 'Sprint 4 — Certification Prep & Career Launch', moduleNumber: '4.1',
    purpose: 'Build a personal exam strategy — study schedule, priority topics, Trailhead mix-ins, and mindset coaching.',
    learningObjectives: ['Build a personalized 2-week study plan', 'Identify priority exam topics based on personal gaps'],
    outcomes: ['Has a study plan before entering exam prep week'],
    lessonIds: ['les-4-1a'], assessmentIds: ['asmnt-4-1'],
    knowledgeArticleIds: [], coachingPromptIds: ['cp-at-risk'],
    reflectionPromptIds: ['rp-sprint-complete'], slackActivityIds: [], calendarEventIds: ['ce-exam-prep-oh'],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Assessment', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request',
    notes: 'Needs content review — Q1 curriculum refresh in progress.',
  },
  {
    id: 'mod-4-2', objectType: 'module', name: 'Practice Exams & Knowledge Verification',
    status: 'draft', confidence: 'prototype', owner: 'Curriculum Lead',
    program: 'Foundations Trail', sprintId: 'spr-ft-4', sprint: 'Sprint 4 — Certification Prep & Career Launch', moduleNumber: '4.2',
    purpose: 'Structured practice exam sessions with Penny-assisted feedback — builds test-taking confidence and identifies remaining knowledge gaps.',
    learningObjectives: ['Complete 2 full practice exams under timed conditions', 'Score 80%+ on a practice exam'],
    outcomes: ['Ready for Salesforce Admin or Associate certification exam'],
    lessonIds: [], assessmentIds: ['asmnt-4-2'],
    knowledgeArticleIds: [], coachingPromptIds: [],
    reflectionPromptIds: [], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Coaching Prompt', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request',
    notes: 'No lessons yet — practice exam content in development.',
  },
  {
    id: 'mod-4-3', objectType: 'module', name: 'Career Launch & Portfolio Presentation',
    status: 'draft', confidence: 'prototype', owner: 'Program Manager',
    program: 'Foundations Trail', sprintId: 'spr-ft-4', sprint: 'Sprint 4 — Certification Prep & Career Launch', moduleNumber: '4.3',
    purpose: 'Prepare learners for job search — resume polish, LinkedIn optimization, portfolio presentation, and employer pitch.',
    learningObjectives: ['Complete a Salesforce portfolio project', 'Present their work to a coach panel'],
    outcomes: ['Has a job-ready Salesforce portfolio'],
    lessonIds: ['les-4-3a'], assessmentIds: [],
    knowledgeArticleIds: [], coachingPromptIds: [],
    reflectionPromptIds: ['rp-sprint-complete'], slackActivityIds: [], calendarEventIds: [],
    relatedSalesforceObject: 'TrailModule__c', relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request',
    notes: 'Career coaching content update needed.',
  },
];

// ── Lessons ───────────────────────────────────────────────────────────────────

export const curriculumLessons: CurriculumItem[] = [
  // Module 2.1 — fully detailed
  { id: 'les-2-1a', objectType: 'lesson', name: 'Custom Objects & Fields', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', moduleName: 'Data Modeling & Schema Design', sprint: 'Sprint 2', lessonNumber: '2.1a', lessonType: 'Instruction', duration: '45 min', learningObjective: 'Create a custom object with appropriate fields and understand its role in the data model.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Coaching Prompt'], futureDemandLink: 'Submit Change Request', coachingPromptIds: ['cp-2-1-intro'], reflectionPromptIds: ['rp-2-1a'] },
  { id: 'les-2-1b', objectType: 'lesson', name: 'Field Types & Formula Fields', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', moduleName: 'Data Modeling & Schema Design', sprint: 'Sprint 2', lessonNumber: '2.1b', lessonType: 'Instruction', duration: '50 min', learningObjective: 'Select the correct field type for a given requirement and build a basic formula field.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', reflectionPromptIds: ['rp-2-1b'] },
  { id: 'les-2-1c', objectType: 'lesson', name: 'Schema Builder Lab', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', moduleName: 'Data Modeling & Schema Design', sprint: 'Sprint 2', lessonNumber: '2.1c', lessonType: 'Lab', duration: '60 min', learningObjective: 'Use Schema Builder to design a multi-object data model and present it to a peer.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request', coachingPromptIds: ['cp-2-1-stuck'] },
  // Sprint 1
  { id: 'les-1-1a', objectType: 'lesson', name: 'What is Salesforce?', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-1', moduleName: 'Salesforce Basics & the CRM Landscape', sprint: 'Sprint 1', lessonNumber: '1.1a', lessonType: 'Instruction', duration: '30 min', learningObjective: 'Explain what Salesforce is and why organizations use CRM.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-1-1b', objectType: 'lesson', name: 'The Salesforce Ecosystem & Clouds', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-1', moduleName: 'Salesforce Basics & the CRM Landscape', sprint: 'Sprint 1', lessonNumber: '1.1b', lessonType: 'Instruction', duration: '35 min', learningObjective: 'Describe the main Salesforce cloud products and their use cases.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-1-2a', objectType: 'lesson', name: 'Lightning Navigation & UI', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-2', moduleName: 'Navigation, AppBuilder & Customization Basics', sprint: 'Sprint 1', lessonNumber: '1.2a', lessonType: 'Instruction', duration: '40 min', learningObjective: 'Navigate the Lightning Experience interface and describe key UI components.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-1-2b', objectType: 'lesson', name: 'App Builder Customization Lab', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-2', moduleName: 'Navigation, AppBuilder & Customization Basics', sprint: 'Sprint 1', lessonNumber: '1.2b', lessonType: 'Lab', duration: '45 min', learningObjective: 'Use App Builder to customize tabs, home page layout, and app configuration.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-1-3a', objectType: 'lesson', name: 'Users, Profiles & Permission Sets', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-3', moduleName: 'User Management & Security Basics', sprint: 'Sprint 1', lessonNumber: '1.3a', lessonType: 'Instruction', duration: '50 min', learningObjective: 'Create users and configure profiles and permission sets.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-1-3b', objectType: 'lesson', name: 'Salesforce Security Model Lab', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-3', moduleName: 'User Management & Security Basics', sprint: 'Sprint 1', lessonNumber: '1.3b', lessonType: 'Lab', duration: '45 min', learningObjective: 'Implement a multi-tier security model using org-wide defaults and role hierarchy.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
  // Sprint 2 remaining
  { id: 'les-2-2a', objectType: 'lesson', name: 'Lookup vs Master-Detail Relationships', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-2', moduleName: 'Relationships, Lookups & Junction Objects', sprint: 'Sprint 2', lessonNumber: '2.2a', lessonType: 'Instruction', duration: '45 min', learningObjective: 'Choose the correct relationship type for a given data architecture requirement.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-2-2b', objectType: 'lesson', name: 'Junction Objects & Many-to-Many Patterns', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-2', moduleName: 'Relationships, Lookups & Junction Objects', sprint: 'Sprint 2', lessonNumber: '2.2b', lessonType: 'Lab', duration: '60 min', learningObjective: 'Design a junction object pattern and build roll-up summary fields.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-2-3a', objectType: 'lesson', name: 'Validation Rules & Data Integrity', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-3', moduleName: 'Data Quality & Validation Rules', sprint: 'Sprint 2', lessonNumber: '2.3a', lessonType: 'Instruction', duration: '50 min', learningObjective: 'Write validation rules with error messages and formula conditions.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  // Sprint 3
  { id: 'les-3-1a', objectType: 'lesson', name: 'Screen Flows — Building Wizards', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-1', moduleName: 'Screen Flows & Record-Triggered Flows', sprint: 'Sprint 3', lessonNumber: '3.1a', lessonType: 'Instruction', duration: '55 min', learningObjective: 'Build a multi-screen wizard using Salesforce Screen Flow.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-3-1b', objectType: 'lesson', name: 'Record-Triggered Flows Lab', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-1', moduleName: 'Screen Flows & Record-Triggered Flows', sprint: 'Sprint 3', lessonNumber: '3.1b', lessonType: 'Lab', duration: '60 min', learningObjective: 'Create a record-triggered flow that automates a field update on record save.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-3-2a', objectType: 'lesson', name: 'Subflows & Loop Elements', status: 'draft', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-2', moduleName: 'Subflows, Loops & Advanced Automation', sprint: 'Sprint 3', lessonNumber: '3.2a', lessonType: 'Instruction', duration: '50 min', learningObjective: 'Use subflows and loop elements to process collections in a flow.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-3-3a', objectType: 'lesson', name: 'Approval Processes & Steps', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-3', moduleName: 'Approval Processes & Email Alerts', sprint: 'Sprint 3', lessonNumber: '3.3a', lessonType: 'Instruction', duration: '45 min', learningObjective: 'Build a multi-step approval process with email alerts.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request' },
  // Sprint 4
  { id: 'les-4-1a', objectType: 'lesson', name: 'Exam Strategy & Study Plan Workshop', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-4-1', moduleName: 'Exam Strategy & Study Planning', sprint: 'Sprint 4', lessonNumber: '4.1a', lessonType: 'Workshop', duration: '90 min', learningObjective: 'Complete a personalized 2-week exam study plan.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coaching Prompt'], futureDemandLink: 'Submit Change Request' },
  { id: 'les-4-3a', objectType: 'lesson', name: 'Portfolio Presentation Workshop', status: 'draft', confidence: 'prototype', owner: 'Program Manager', program: 'Foundations Trail', moduleId: 'mod-4-3', moduleName: 'Career Launch & Portfolio Presentation', sprint: 'Sprint 4', lessonNumber: '4.3a', lessonType: 'Workshop', duration: '120 min', learningObjective: 'Present a portfolio project to a panel of coaches and peers.', relatedSalesforceObject: 'TrailLesson__c', relatedLmsObject: 'Lesson (Salesforce LMS)', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
];

// ── Assessments ────────────────────────────────────────────────────────────────

export const curriculumAssessments: CurriculumItem[] = [
  { id: 'asmnt-2-1', objectType: 'assessment', name: 'Data Modeling Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', moduleName: 'Data Modeling & Schema Design', sprint: 'Sprint 2', assessmentType: 'Knowledge Check', questionCount: 20, passingScore: 75, duration: '30 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', avgScore: '82%', attempts: 26 },
  { id: 'asmnt-1-1', objectType: 'assessment', name: 'Salesforce Basics Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-1', moduleName: 'Salesforce Basics & the CRM Landscape', sprint: 'Sprint 1', assessmentType: 'Knowledge Check', questionCount: 15, passingScore: 75, duration: '20 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', avgScore: '88%', attempts: 28 },
  { id: 'asmnt-1-2', objectType: 'assessment', name: 'Navigation & AppBuilder Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-2', moduleName: 'Navigation & AppBuilder', sprint: 'Sprint 1', assessmentType: 'Knowledge Check', questionCount: 12, passingScore: 75, duration: '20 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', avgScore: '84%', attempts: 28 },
  { id: 'asmnt-1-3', objectType: 'assessment', name: 'User Management Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-1-3', moduleName: 'User Management & Security', sprint: 'Sprint 1', assessmentType: 'Knowledge Check', questionCount: 18, passingScore: 75, duration: '25 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', avgScore: '79%', attempts: 28 },
  { id: 'asmnt-2-2', objectType: 'assessment', name: 'Relationships Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-2', moduleName: 'Relationships & Junction Objects', sprint: 'Sprint 2', assessmentType: 'Knowledge Check', questionCount: 16, passingScore: 75, duration: '25 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', avgScore: '76%', attempts: 26 },
  { id: 'asmnt-2-3', objectType: 'assessment', name: 'Data Quality Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-2-3', moduleName: 'Data Quality & Validation Rules', sprint: 'Sprint 2', assessmentType: 'Knowledge Check', questionCount: 14, passingScore: 75, duration: '20 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', avgScore: '80%', attempts: 26 },
  { id: 'asmnt-3-2', objectType: 'assessment', name: 'Advanced Flows Assessment', status: 'draft', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-2', moduleName: 'Subflows & Advanced Automation', sprint: 'Sprint 3', assessmentType: 'Knowledge Check', questionCount: 18, passingScore: 75, duration: '30 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request' },
  { id: 'asmnt-3-3', objectType: 'assessment', name: 'Approval Processes Assessment', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-3-3', moduleName: 'Approval Processes', sprint: 'Sprint 3', assessmentType: 'Knowledge Check', questionCount: 12, passingScore: 75, duration: '20 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request' },
  { id: 'asmnt-4-1', objectType: 'assessment', name: 'Exam Readiness Self-Assessment', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-4-1', moduleName: 'Exam Strategy', sprint: 'Sprint 4', assessmentType: 'Self-Assessment', questionCount: 25, passingScore: 80, duration: '40 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request' },
  { id: 'asmnt-4-2', objectType: 'assessment', name: 'Practice Certification Exam — Set A', status: 'draft', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleId: 'mod-4-2', moduleName: 'Practice Exams', sprint: 'Sprint 4', assessmentType: 'Practice Exam', questionCount: 60, passingScore: 80, duration: '90 min', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request' },
];

// ── Knowledge Articles ─────────────────────────────────────────────────────────

export const curriculumKnowledgeArticles: CurriculumItem[] = [
  { id: 'ka-dm-1', objectType: 'knowledgeArticle', name: 'Objects vs. Fields vs. Records — A Visual Guide', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-2-1'], articleType: 'Concept Guide', wordCount: 850, lastReviewed: 'Jan 2025', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'Visual explainer for the core Salesforce data model — Objects, Fields, Records, and Relationships — for learners new to CRM concepts.' },
  { id: 'ka-dm-2', objectType: 'knowledgeArticle', name: 'Schema Design Patterns for Salesforce Admins', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-2-1'], articleType: 'Reference Guide', wordCount: 1200, lastReviewed: 'Jan 2025', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'Reference guide covering common schema design patterns — junction objects, lookup chains, and self-relationships — with use case examples.' },
  { id: 'ka-sf-basics', objectType: 'knowledgeArticle', name: 'Salesforce Navigation Quick Reference', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-1-1'], articleType: 'Quick Reference', wordCount: 400, lastReviewed: 'Dec 2024', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'One-page visual quick reference for the Salesforce Lightning navigation — app launcher, global search, utility bar, and tabs.' },
  { id: 'ka-security', objectType: 'knowledgeArticle', name: 'Salesforce Security Model — Layers Explained', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-1-3'], articleType: 'Concept Guide', wordCount: 950, lastReviewed: 'Nov 2024', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'Explains the four layers of Salesforce security — org, object, record, and field — with diagrams and real-world examples.' },
  { id: 'ka-automation', objectType: 'knowledgeArticle', name: 'When to Use Flow vs. Workflow vs. Process Builder', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-3-1'], articleType: 'Decision Guide', wordCount: 700, lastReviewed: 'Nov 2024', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'Decision framework for choosing the right automation tool — updated for the Flow-first Salesforce direction.' },
  { id: 'ka-data-quality', objectType: 'knowledgeArticle', name: 'Data Quality Checklist for Salesforce Admins', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-2-3'], articleType: 'Checklist', wordCount: 600, lastReviewed: 'Jan 2025', relatedSalesforceObject: 'Knowledge__kav', relatedLmsObject: 'Knowledge Article (Salesforce LMS)', pennyActions: ['Generate Summary'], futureDemandLink: 'Submit Change Request', purpose: 'Practical checklist for assessing and improving data quality in a Salesforce org — validation rules, duplicates, required fields.' },
];

// ── Resources ─────────────────────────────────────────────────────────────────

export const curriculumResources: CurriculumItem[] = [
  { id: 'res-trailhead-admin', objectType: 'resource', name: 'Salesforce Trailhead — Admin Beginner Trail', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'All Programs', moduleIds: ['mod-1-1', 'mod-1-2', 'mod-1-3'], resourceType: 'External Platform', url: 'https://trailhead.salesforce.com', relatedSalesforceObject: 'N/A — External', relatedLmsObject: 'Resource Link', pennyActions: [], futureDemandLink: 'Submit Change Request', purpose: 'Official Salesforce Trailhead beginner admin trail — supplementary self-paced learning for all Sprint 1 modules.' },
  { id: 'res-schema-builder', objectType: 'resource', name: 'Salesforce Help — Schema Builder Guide', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-2-1'], resourceType: 'Documentation', url: 'https://help.salesforce.com', relatedSalesforceObject: 'N/A — External', relatedLmsObject: 'Resource Link', pennyActions: [], futureDemandLink: 'Submit Change Request', purpose: 'Official Salesforce documentation for Schema Builder — referenced in Module 2.1 Schema Builder Lab.' },
  { id: 'res-assessment-rubric', objectType: 'resource', name: 'Transition Trails Assessment Rubric v2', status: 'published', confidence: 'confirmed', owner: 'Program Manager', program: 'All Programs', moduleIds: [], resourceType: 'Internal Document', relatedSalesforceObject: 'Document__c', relatedLmsObject: 'Resource Link', pennyActions: [], futureDemandLink: 'Submit Change Request', purpose: 'Shared rubric for evaluating learner labs and assignments — used by coaches across all programs.' },
  { id: 'res-exam-prep-guide', objectType: 'resource', name: 'Salesforce Admin Exam Preparation Guide', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', moduleIds: ['mod-4-1', 'mod-4-2'], resourceType: 'Internal Document', relatedSalesforceObject: 'Document__c', relatedLmsObject: 'Resource Link', pennyActions: [], futureDemandLink: 'Submit Change Request', purpose: 'Transition Trails exam prep guide — study schedule, topic priority list, and practice exam strategy.' },
];

// ── Coaching Prompts (Penny Assets) ───────────────────────────────────────────

export const curriculumCoachingPrompts: CurriculumItem[] = [
  { id: 'cp-2-1-intro', objectType: 'coachingPrompt', name: 'Module 2.1 — Welcome & Orientation', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', lessonId: 'les-2-1a', triggerContext: 'Module open (first access)', targetAudience: 'Learner', tone: 'Encouraging, clear', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Welcome message from Penny when a learner opens Module 2.1 for the first time — previews the learning objectives, estimated time, and what they\'ll be able to do by the end.', sampleOutput: '"Welcome to Data Modeling — one of the most important modules in Foundations Trail. By the end, you\'ll be able to design a custom Salesforce schema. Here\'s what we\'re covering: Custom Objects → Field Types → Schema Builder Lab. Estimated time: 2.5 hours."' },
  { id: 'cp-2-1-stuck', objectType: 'coachingPrompt', name: 'Module 2.1 — Learner Support (Schema Builder)', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', lessonId: 'les-2-1c', triggerContext: 'Learner paused > 15 min on Schema Builder Lab', targetAudience: 'Learner', tone: 'Calm, supportive', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Intervention prompt from Penny when a learner appears stuck on the Schema Builder lab — offers a hint, points to the knowledge article, and suggests a coach check-in.', sampleOutput: '"Still working on the schema? That\'s normal — this lab is conceptual. Tip: Start by listing your objects (think nouns: Project, Contact, Assignment). Need help? Open \'Schema Design Patterns\' in Knowledge or ping your coach."' },
  { id: 'cp-1-1-intro', objectType: 'coachingPrompt', name: 'Module 1.1 — Welcome to Salesforce', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-1-1', triggerContext: 'Module open (first access)', targetAudience: 'Learner', tone: 'Warm, career-focused', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'First Penny message a learner receives in Foundations Trail — sets the tone, introduces the program journey, and connects learning to career transition.' },
  { id: 'cp-general-checkin', objectType: 'coachingPrompt', name: 'General Progress Check-In', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'All Programs', moduleId: null, triggerContext: 'Used across multiple modules when specific prompt not available', targetAudience: 'Learner', tone: 'Warm, conversational', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'General-purpose Penny check-in for modules that don\'t yet have a specific coaching prompt. Used as a placeholder while dedicated prompts are being created.', notes: 'Replace with module-specific prompts as they are created.' },
  { id: 'cp-at-risk', objectType: 'coachingPrompt', name: 'At-Risk Learner Intervention', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'All Programs', moduleId: null, triggerContext: 'Confidence score drops below threshold or learner inactive > 3 days', targetAudience: 'Learner', tone: 'Caring, low-pressure', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Penny intervention for at-risk learners — triggered when engagement or progress signals dropout risk. Sent via Slack or direct message.', sampleOutput: '"Hey — I noticed you haven\'t opened your latest module this week. Life happens! Your coach is available for a check-in if you\'d like. Want me to schedule 15 minutes?"' },
];

// ── Reflection Prompts (Penny Assets) ─────────────────────────────────────────

export const curriculumReflectionPrompts: CurriculumItem[] = [
  { id: 'rp-2-1a', objectType: 'reflectionPrompt', name: 'After Lesson 2.1a — Objects & Fields', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', lessonId: 'les-2-1a', triggerContext: 'Lesson 2.1a completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Post-lesson reflection prompt connecting Custom Objects to a real-world scenario from the learner\'s work history.', sampleOutput: '"Think about a past role — what data did your team track manually (spreadsheets, notebooks, sticky notes)? How could a custom Salesforce object have helped? Jot your answer in your Trail Journal."' },
  { id: 'rp-2-1b', objectType: 'reflectionPrompt', name: 'After Lesson 2.1b — Field Types', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', lessonId: 'les-2-1b', triggerContext: 'Lesson 2.1b completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Reflection on field type decisions — builds judgment for real schema design choices.', sampleOutput: '"You\'ve seen 12 Salesforce field types today. Which one surprised you most? When would you choose a Picklist over a Text field? Think of a real example and write it down."' },
  { id: 'rp-1-1a', objectType: 'reflectionPrompt', name: 'After Lesson 1.1a — What is Salesforce?', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-1-1', lessonId: 'les-1-1a', triggerContext: 'Lesson 1.1a completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Career-connection reflection — helps learners articulate why they are pursuing Salesforce skills.' },
  { id: 'rp-1-2a', objectType: 'reflectionPrompt', name: 'After Lesson 1.2a — Lightning Navigation', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-1-2', lessonId: 'les-1-2a', triggerContext: 'Lesson 1.2a completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Reflection on UI customization — connects AppBuilder to the learner\'s mental model of how Salesforce serves users.' },
  { id: 'rp-module-complete', objectType: 'reflectionPrompt', name: 'End-of-Module Reflection (General)', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'All Programs', moduleId: null, triggerContext: 'Module completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'General end-of-module reflection — what was most surprising, what still feels uncertain, what would you do differently.', notes: 'Used for modules without a specific reflection prompt.' },
  { id: 'rp-3-1a', objectType: 'reflectionPrompt', name: 'After Flow Builder Intro', status: 'needs-review', confidence: 'prototype', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-3-1', lessonId: 'les-3-1a', triggerContext: 'Lesson 3.1a completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Reflection connecting automation concepts to a real process the learner has experienced.' },
  { id: 'rp-sprint-complete', objectType: 'reflectionPrompt', name: 'End-of-Sprint Reflection', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'All Programs', moduleId: null, triggerContext: 'Sprint completion', targetAudience: 'Learner', relatedSalesforceObject: 'PennyPrompt__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Reflection Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Structured sprint-end reflection — competency self-assessment, highlights, and goals for the next sprint.' },
];

// ── Trail Quests (Penny Assets) ────────────────────────────────────────────────

export const curriculumTrailQuests: CurriculumItem[] = [
  { id: 'tq-schema-designer', objectType: 'trailQuest', name: 'Schema Designer Badge', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-2-1', questType: 'Badge', difficulty: 'Intermediate', estimatedTime: '2–3 hours', relatedSalesforceObject: 'TrailQuest__c', relatedLmsObject: 'Badge (Salesforce LMS)', pennyActions: ['Generate Trail Quest'], futureDemandLink: 'Submit Change Request', purpose: 'Earnable badge for learners who complete the Schema Builder Lab and pass the Data Modeling Assessment with 80%+.', criteria: ['Complete Schema Builder Lab (les-2-1c)', 'Pass Data Modeling Assessment with 80%+', 'Submit schema to coach for review'] },
  { id: 'tq-admin-challenge', objectType: 'trailQuest', name: 'Admin Challenge — Sprint 2', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: null, questType: 'Challenge', difficulty: 'Intermediate', estimatedTime: '4–5 hours', relatedSalesforceObject: 'TrailQuest__c', relatedLmsObject: 'Badge (Salesforce LMS)', pennyActions: ['Generate Trail Quest'], futureDemandLink: 'Submit Change Request', purpose: 'Sprint 2 capstone challenge — learner builds a complete data model for a mock nonprofit client scenario.', criteria: ['Complete all Sprint 2 modules', 'Design a 5-object schema with all relationship types', 'Peer review by another learner'] },
  { id: 'tq-flow-builder', objectType: 'trailQuest', name: 'Flow Builder Badge', status: 'draft', confidence: 'prototype', owner: 'Penny Lead', program: 'Foundations Trail', moduleId: 'mod-3-1', questType: 'Badge', difficulty: 'Advanced', estimatedTime: '3–4 hours', relatedSalesforceObject: 'TrailQuest__c', relatedLmsObject: 'Badge (Salesforce LMS)', pennyActions: ['Generate Trail Quest'], futureDemandLink: 'Submit Change Request', purpose: 'Sprint 3 badge for completing both Flow lessons and the automation lab.', criteria: ['Build a working screen flow', 'Create a record-triggered flow'] },
];

// ── Weekly Reviews (Penny Assets) ─────────────────────────────────────────────

export const curriculumWeeklyReviews: CurriculumItem[] = [
  { id: 'wr-ft-week-7', objectType: 'weeklyReview', name: 'Foundations Trail — Week 7 Cohort Summary', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', cohortId: 'coh-ft-01', weekNumber: 7, relatedSalesforceObject: 'WeeklyReview__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Weekly Review'], futureDemandLink: 'Submit Change Request', purpose: 'Coach-facing weekly cohort digest — learner progress, confidence flags, and upcoming module milestones.', sampleOutput: '"Week 7 Summary — Cohort 1: 12/14 learners on track. 2 at-risk (flagged for check-in). Module 3.1 average: 78%. Upcoming: Module 3.2 opens Monday."', deliveredVia: 'Slack + Coach Dashboard' },
  { id: 'wr-ft-week-4', objectType: 'weeklyReview', name: 'Foundations Trail — Week 4 Sprint Wrap', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', cohortId: 'coh-ft-01', weekNumber: 4, relatedSalesforceObject: 'WeeklyReview__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Weekly Review'], futureDemandLink: 'Submit Change Request', purpose: 'End-of-Sprint 1 summary — celebrates completion, previews Sprint 2, highlights top learners.', deliveredVia: 'Slack + Email' },
  { id: 'wr-general', objectType: 'weeklyReview', name: 'Standard Weekly Review Template', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'All Programs', cohortId: null, relatedSalesforceObject: 'WeeklyReview__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Generate Weekly Review'], futureDemandLink: 'Submit Change Request', purpose: 'Reusable template for generating weekly cohort summaries — parameterized by program, cohort, and week.', deliveredVia: 'Coach Dashboard + Slack' },
];

// ── Slack Activities (Delivery Assets) ────────────────────────────────────────

export const curriculumSlackActivities: CurriculumItem[] = [
  { id: 'sa-2-1-kickoff', objectType: 'slackActivity', name: 'Module 2.1 Kickoff Thread', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', moduleId: 'mod-2-1', channel: '#ft-cohort-1', timing: 'Monday, Module 2.1 start', activityType: 'Kickoff Thread', relatedSalesforceObject: 'SlackActivity__c', relatedLmsObject: 'N/A — Slack', pennyActions: ['Create Slack Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Penny-generated thread introducing Module 2.1 to the cohort — sets expectations, shares the week\'s goals, and invites learners to share prior experience with data.', sampleOutput: '"Week 4 starts today! 🗃️ We\'re diving into Data Modeling — one of the most important skills in the Salesforce Admin toolkit. Share in this thread: have you ever built a spreadsheet to track work? That instinct = a data model."' },
  { id: 'sa-2-1-lab', objectType: 'slackActivity', name: 'Schema Builder Lab Share', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', moduleId: 'mod-2-1', channel: '#ft-cohort-1', timing: 'After les-2-1c (lab completion)', activityType: 'Lab Share', relatedSalesforceObject: 'SlackActivity__c', relatedLmsObject: 'N/A — Slack', pennyActions: ['Create Slack Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Peer-share activity where learners post a screenshot of their completed Schema Builder diagram for cohort review and coach feedback.', sampleOutput: '"📸 Schema Builder Lab Share: Upload your schema screenshot and answer: What business scenario did you model? What relationship type did you use, and why?"' },
  { id: 'sa-sprint-1-launch', objectType: 'slackActivity', name: 'Sprint 1 Launch Announcement', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', moduleId: null, channel: '#ft-cohort-1', timing: 'Program day 1', activityType: 'Announcement', relatedSalesforceObject: 'SlackActivity__c', relatedLmsObject: 'N/A — Slack', pennyActions: ['Create Slack Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Welcome announcement at program start — introduces Penny, sets expectations, shares the 12-week journey overview.' },
  { id: 'sa-3-1-lab', objectType: 'slackActivity', name: 'Flow Builder Lab Check-In', status: 'needs-review', confidence: 'prototype', owner: 'Coach', program: 'Foundations Trail', moduleId: 'mod-3-1', channel: '#ft-cohort-1', timing: 'After les-3-1b', activityType: 'Lab Check-In', relatedSalesforceObject: 'SlackActivity__c', relatedLmsObject: 'N/A — Slack', pennyActions: ['Create Slack Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Post-lab Slack thread for Flow Builder lab — asks learners to share what they built and what was most confusing.' },
];

// ── Google Chat Updates (Delivery Assets) ─────────────────────────────────────

export const curriculumGoogleChatUpdates: CurriculumItem[] = [
  { id: 'gc-sprint-2-start', objectType: 'googleChatUpdate', name: 'Sprint 2 Start Update', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', cohortId: 'coh-ft-01', timing: 'Sprint 2 day 1', channel: 'Foundations Trail Cohort 1 Space', relatedSalesforceObject: 'N/A — Google Chat', relatedLmsObject: 'N/A', pennyActions: ['Create Google Chat Update'], futureDemandLink: 'Submit Change Request', purpose: 'Sprint 2 kickoff message sent to the cohort Google Chat space — introduces data modeling focus and links to the sprint overview.' },
  { id: 'gc-assessment-reminder', objectType: 'googleChatUpdate', name: 'Assessment Week Reminder', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', cohortId: 'coh-ft-01', timing: 'Day before assessment week', channel: 'Foundations Trail Cohort 1 Space', relatedSalesforceObject: 'N/A — Google Chat', relatedLmsObject: 'N/A', pennyActions: ['Create Google Chat Update'], futureDemandLink: 'Submit Change Request', purpose: 'Reminder and encouragement message the day before a module assessment — shares links, tips, and coach availability.' },
  { id: 'gc-program-update', objectType: 'googleChatUpdate', name: 'Program Progress Update (Coach)', status: 'draft', confidence: 'prototype', owner: 'Coach', program: 'All Programs', cohortId: null, timing: 'Weekly (Fridays)', channel: 'Coaching Team Space', relatedSalesforceObject: 'N/A — Google Chat', relatedLmsObject: 'N/A', pennyActions: ['Create Google Chat Update'], futureDemandLink: 'Submit Change Request', purpose: 'Weekly update to the coaching team Google Chat space — cohort progress, at-risk flags, and action items.' },
];

// ── Calendar Events (Delivery Assets) ─────────────────────────────────────────

export const curriculumCalendarEvents: CurriculumItem[] = [
  { id: 'ce-2-1-oh', objectType: 'calendarEvent', name: 'Module 2.1 Office Hours (Week 5)', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', moduleId: 'mod-2-1', cohortId: 'coh-ft-01', timing: 'Week 5 — Wednesday 6–7 PM ET', eventType: 'Office Hours', attendees: 'Learners (open)', relatedSalesforceObject: 'CalendarEvent__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Calendar Event'], futureDemandLink: 'Submit Change Request', purpose: 'Open office hours for Module 2.1 content — Schema Builder lab support and data modeling Q&A.' },
  { id: 'ce-sprint-2-kickoff', objectType: 'calendarEvent', name: 'Sprint 2 Kickoff Session', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', moduleId: null, cohortId: 'coh-ft-01', timing: 'Week 4 — Monday 6–7 PM ET', eventType: 'Kickoff', attendees: 'All Cohort Learners', relatedSalesforceObject: 'CalendarEvent__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Calendar Event'], futureDemandLink: 'Submit Change Request', purpose: 'Live kickoff session for Sprint 2 — introduces data modeling, reviews Sprint 1 achievements, and sets Sprint 2 goals.' },
  { id: 'ce-cohort-progress', objectType: 'calendarEvent', name: 'Cohort 1 Mid-Program Progress Review', status: 'published', confidence: 'confirmed', owner: 'Program Manager', program: 'Foundations Trail', moduleId: null, cohortId: 'coh-ft-01', timing: 'Week 6 — Friday 4–5 PM ET', eventType: 'Review', attendees: 'Program Manager + Coaches', relatedSalesforceObject: 'CalendarEvent__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Calendar Event'], futureDemandLink: 'Submit Change Request', purpose: 'Internal team review of Cohort 1 progress at the midpoint — data review, at-risk learner plans, curriculum feedback.' },
  { id: 'ce-exam-prep-oh', objectType: 'calendarEvent', name: 'Certification Exam Prep Office Hours', status: 'needs-review', confidence: 'prototype', owner: 'Coach', program: 'Foundations Trail', moduleId: 'mod-4-1', cohortId: 'coh-ft-01', timing: 'Week 10–11 — Daily 12–1 PM ET', eventType: 'Office Hours', attendees: 'Learners (open)', relatedSalesforceObject: 'CalendarEvent__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Calendar Event'], futureDemandLink: 'Submit Change Request', purpose: 'Daily exam prep office hours during certification week — Q&A, practice exam review, and mindset coaching.' },
];

// ── Office Hours (Delivery Assets) ────────────────────────────────────────────

export const curriculumOfficeHours: CurriculumItem[] = [
  { id: 'oh-weekly-ft', objectType: 'officeHours', name: 'Foundations Trail — Weekly Office Hours', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', schedule: 'Every Wednesday 6–7 PM ET', format: 'Zoom', relatedSalesforceObject: 'OfficeHours__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Reminder'], futureDemandLink: 'Submit Change Request', purpose: 'Standing weekly office hours for all Foundations Trail learners — open Q&A on any module content, labs, or career questions.' },
  { id: 'oh-schema-lab', objectType: 'officeHours', name: 'Schema Builder Lab Office Hours', status: 'published', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', schedule: 'Week 5 — dedicated session', format: 'Zoom', relatedSalesforceObject: 'OfficeHours__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Reminder'], futureDemandLink: 'Submit Change Request', purpose: 'Dedicated office hours for the Schema Builder Lab — focused on data modeling questions and peer schema review.' },
  { id: 'oh-exam-prep', objectType: 'officeHours', name: 'Certification Exam Prep Sessions', status: 'needs-review', confidence: 'prototype', owner: 'Coach', program: 'Foundations Trail', schedule: 'Week 10–11 — daily sessions', format: 'Zoom + Recording', relatedSalesforceObject: 'OfficeHours__c', relatedLmsObject: 'N/A', pennyActions: ['Generate Reminder'], futureDemandLink: 'Submit Change Request', purpose: 'Intensive exam prep sessions in the final two weeks — mock exam Q&A, topic deep-dives, confidence coaching.' },
];

// ── Health Issues ──────────────────────────────────────────────────────────────

export const curriculumHealthIssues: CurriculumItem[] = [
  { id: 'hi-mod-3-1-assessment', objectType: 'healthIssue', name: 'Module 3.1 — No Assessment Linked', status: 'missing', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', severity: 'high', checkType: 'missing-assessment' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-3-1', affectedObjectName: 'Screen Flows & Record-Triggered Flows', affectedItems: ['Module 3.1 has no linked assessment — learners complete lessons with no knowledge check'], actionRequired: 'Create and link an assessment for Module 3.1 before Sprint 3 delivery', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', purpose: 'Content health flag: Module 3.1 is missing a linked assessment, creating a gap in learner knowledge verification.' },
  { id: 'hi-mod-3-2-multi', objectType: 'healthIssue', name: 'Module 3.2 — Multiple Content Gaps', status: 'missing', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', severity: 'high', checkType: 'missing-objectives' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-3-2', affectedObjectName: 'Subflows, Loops & Advanced Automation', affectedItems: ['No learning objectives defined', 'No knowledge articles linked', 'No coaching prompts', 'No reflection prompts'], actionRequired: 'Full content pass needed before Module 3.2 can be delivered — add objectives, articles, and prompts', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: ['Create Coaching Prompt', 'Create Reflection Prompt', 'Create Knowledge Article'], futureDemandLink: 'Submit Change Request', purpose: 'Module 3.2 has 4 simultaneous health issues — not ready for delivery.' },
  { id: 'hi-mod-1-3-prompts', objectType: 'healthIssue', name: 'Module 1.3 — No Coaching Prompts', status: 'missing', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', severity: 'medium', checkType: 'missing-penny-prompts' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-1-3', affectedObjectName: 'User Management & Security Basics', affectedItems: ['Module 1.3 has no linked coaching prompts — learners get generic fallback prompt'], actionRequired: 'Create a module-specific coaching prompt for Module 1.3 — prioritized for Cohort 2 start', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: ['Create Coaching Prompt'], futureDemandLink: 'Submit Change Request', purpose: 'Module 1.3 learners are receiving a generic Penny prompt instead of a module-specific one. Impacts experience quality.' },
  { id: 'hi-mod-2-2-delivery', objectType: 'healthIssue', name: 'Module 2.2 — No Delivery Activities', status: 'missing', confidence: 'confirmed', owner: 'Coach', program: 'Foundations Trail', severity: 'medium', checkType: 'missing-delivery' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-2-2', affectedObjectName: 'Relationships, Lookups & Junction Objects', affectedItems: ['No Slack activity linked', 'No calendar event linked'], actionRequired: 'Add at least one Slack activity and one calendar event for Module 2.2', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: ['Create Slack Prompt', 'Generate Calendar Event'], futureDemandLink: 'Submit Change Request', purpose: 'Module 2.2 has no delivery assets — no social learning moment or live touchpoint planned.' },
  { id: 'hi-duplicate-flows', objectType: 'healthIssue', name: 'Modules 3.1 & 3.2 — Duplicate Flow Concept', status: 'needs-review', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', severity: 'medium', checkType: 'duplicate-concept' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-3-1', affectedObjectName: 'Screen Flows & Record-Triggered Flows', affectedItems: ['Module 3.1 covers "screen flows for wizard navigation"', 'Module 3.2 also introduces screen flow subflows — concept overlap'], actionRequired: 'Review Module 3.1 and 3.2 lesson outlines and clarify scope boundaries', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: [], futureDemandLink: 'Submit Change Request', purpose: 'Potential duplicate concept coverage between Sprint 3 modules — may confuse learners about scope boundaries.' },
  { id: 'hi-mod-1-2-articles', objectType: 'healthIssue', name: 'Module 1.2 — No Knowledge Articles', status: 'missing', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', severity: 'low', checkType: 'missing-knowledge-link' as HealthCheckType, affectedObjectType: 'module', affectedObjectId: 'mod-1-2', affectedObjectName: 'Navigation, AppBuilder & Customization Basics', affectedItems: ['Module 1.2 has no linked knowledge articles — learners have no reference material'], actionRequired: 'Create or link an App Builder quick reference article for Module 1.2', relatedSalesforceObject: 'ContentHealthIssue__c', relatedLmsObject: 'N/A', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', purpose: 'Module 1.2 learners have no knowledge article to reference during or after lessons.' },
];

// ── Combined Lookup ────────────────────────────────────────────────────────────

export const ALL_CURRICULUM_ITEMS: CurriculumItem[] = [
  ...curriculumPrograms,
  ...curriculumCohorts,
  ...curriculumSprints,
  ...curriculumModules,
  ...curriculumLessons,
  ...curriculumAssessments,
  ...curriculumKnowledgeArticles,
  ...curriculumResources,
  ...curriculumCoachingPrompts,
  ...curriculumReflectionPrompts,
  ...curriculumTrailQuests,
  ...curriculumWeeklyReviews,
  ...curriculumSlackActivities,
  ...curriculumGoogleChatUpdates,
  ...curriculumCalendarEvents,
  ...curriculumOfficeHours,
  ...curriculumHealthIssues,
];

const _itemMap = new Map<string, CurriculumItem>(
  ALL_CURRICULUM_ITEMS.map(item => [item.id, item])
);

export function getCurriculumItemById(id: string): CurriculumItem | undefined {
  return _itemMap.get(id);
}

export function getRelatedItems(ids: string[]): CurriculumItem[] {
  return ids.flatMap(id => {
    const item = _itemMap.get(id);
    return item ? [item] : [];
  });
}

export function getItemsByModule(moduleId: string, objectType: CurriculumObjectType): CurriculumItem[] {
  return ALL_CURRICULUM_ITEMS.filter(
    item => item.objectType === objectType && item.moduleId === moduleId
  );
}
