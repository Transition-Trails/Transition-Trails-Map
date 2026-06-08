// ── Curriculum Studio Data — Prototype ────────────────────────────────────────
// Models the Trail OS curriculum object hierarchy:
// Program → Sprint → Module → Lesson → Assignment → Assessment →
//   Knowledge Article → Penny Template → Outcome
//
// Foundations Trail is the primary prototype example with full data.
// All data is prototype — structure and content standards, not live records.

export type CurriculumObjectType =
  | 'program' | 'sprint' | 'module' | 'lesson'
  | 'assignment' | 'assessment' | 'knowledgeArticle' | 'pennyTemplate' | 'healthIssue';

export type ContentStatus      = 'published' | 'draft' | 'needs-review' | 'missing';
export type ContentConfidence  = 'confirmed' | 'prototype' | 'draft' | 'planned';
export type HealthSeverity     = 'high' | 'medium' | 'low';

export interface CurriculumItem {
  id: string;
  objectType: CurriculumObjectType;
  name: string;
  status: ContentStatus;
  confidence: ContentConfidence;
  owner: string;
  program: string;
  purpose: string;
  relatedSalesforceObject: string;
  relatedLmsObject: string;
  pennyActions: string[];
  futureDemandLink: string;
  notes?: string;
  // typed extension fields
  [key: string]: unknown;
}

// ── Display Config ────────────────────────────────────────────────────────────

export const CURRICULUM_OBJECT_CONFIG: Record<CurriculumObjectType, {
  label: string;
  pluralLabel: string;
  chip: string;
  border: string;
}> = {
  program:          { label: 'Program',           pluralLabel: 'Programs',           chip: 'bg-primary/10 text-primary border-primary/20',          border: 'border-primary/20 hover:border-primary/40' },
  sprint:           { label: 'Sprint',            pluralLabel: 'Sprints',            chip: 'bg-violet-50 text-violet-800 border-violet-200',         border: 'border-violet-100 hover:border-violet-300' },
  module:           { label: 'Module',            pluralLabel: 'Modules',            chip: 'bg-sky-50 text-sky-800 border-sky-200',                  border: 'border-sky-100 hover:border-sky-300' },
  lesson:           { label: 'Lesson',            pluralLabel: 'Lessons',            chip: 'bg-amber-50 text-amber-800 border-amber-200',            border: 'border-amber-100 hover:border-amber-300' },
  assignment:       { label: 'Assignment',        pluralLabel: 'Assignments',        chip: 'bg-orange-50 text-orange-800 border-orange-200',         border: 'border-orange-100 hover:border-orange-300' },
  assessment:       { label: 'Assessment',        pluralLabel: 'Assessments',        chip: 'bg-rose-50 text-rose-800 border-rose-200',               border: 'border-rose-100 hover:border-rose-300' },
  knowledgeArticle: { label: 'Knowledge Article', pluralLabel: 'Knowledge Articles', chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',         border: 'border-indigo-100 hover:border-indigo-300' },
  pennyTemplate:    { label: 'Penny Template',    pluralLabel: 'Penny Templates',    chip: 'bg-secondary/10 text-secondary border-secondary/20',     border: 'border-secondary/20 hover:border-secondary/40' },
  healthIssue:      { label: 'Health Issue',      pluralLabel: 'Health Issues',      chip: 'bg-red-50 text-red-700 border-red-200',                  border: 'border-red-100 hover:border-red-300' },
};

export const CONTENT_STATUS_CONFIG: Record<ContentStatus, { label: string; cls: string }> = {
  published:      { label: 'Published',    cls: 'text-green-700 bg-green-50 border-green-200' },
  draft:          { label: 'Draft',        cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  'needs-review': { label: 'Needs Review', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  missing:        { label: 'Missing',      cls: 'text-red-700 bg-red-50 border-red-200' },
};

export const SEVERITY_CONFIG: Record<HealthSeverity, { label: string; cls: string }> = {
  high:   { label: 'High',   cls: 'text-red-700 bg-red-50 border-red-200' },
  medium: { label: 'Medium', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  low:    { label: 'Low',    cls: 'text-amber-700 bg-amber-50 border-amber-200' },
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
    purpose: 'Salesforce skills training and certification preparation — prepares learners for Admin and Associate certifications in a structured 12-week cohort format with 4 sprints, 12 modules, and Penny-assisted content throughout.',
    relatedSalesforceObject: 'Program__c (Custom Object)',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Module', 'Create Assessment', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    duration: '12 weeks',
    audience: 'Career changers seeking Salesforce Admin or Associate certification',
    sprintCount: 4,
    moduleCount: 12,
    lessonCount: 36,
    assignmentCount: 24,
    assessmentCount: 11,
    knowledgeArticleCount: 10,
    pennyTemplateCount: 8,
    cohortCount: 2,
    notes: 'Primary prototype example — full data modeled here.',
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
    relatedSalesforceObject: 'Program__c (Custom Object)',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Lesson', 'Create Reflection Prompt', 'Create Slack Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    duration: '12–16 weeks',
    audience: 'Adult career changers in cohort-based job placement programs',
    sprintCount: 4,
    moduleCount: 8,
    lessonCount: 24,
    assignmentCount: 16,
    assessmentCount: 8,
    knowledgeArticleCount: 6,
    pennyTemplateCount: 6,
    cohortCount: 1,
    notes: 'Curriculum structure prototype — content creation underway.',
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
    relatedSalesforceObject: 'Program__c (Custom Object)',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Knowledge Article', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    duration: '4 weeks',
    audience: 'Job seekers new to digital and professional environments',
    sprintCount: 1,
    moduleCount: 4,
    lessonCount: 12,
    assignmentCount: 8,
    assessmentCount: 4,
    knowledgeArticleCount: 4,
    pennyTemplateCount: 3,
    cohortCount: 2,
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
    purpose: 'Employer partnership program placing learners on real nonprofit workplace projects — structured around client deliverables, sprint cycles, and employer presentations.',
    relatedSalesforceObject: 'Program__c (Custom Object)',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Create Module', 'Create Google Chat Update', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    duration: '8 weeks',
    audience: 'Learners with foundational skills ready for workplace projects',
    sprintCount: 2,
    moduleCount: 6,
    lessonCount: 16,
    assignmentCount: 10,
    assessmentCount: 4,
    knowledgeArticleCount: 5,
    pennyTemplateCount: 4,
    cohortCount: 1,
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
    purpose: 'Advanced credential and specialization path for Foundations Trail alumni — deepens Salesforce expertise with specialty certifications and career positioning.',
    relatedSalesforceObject: 'Program__c (Custom Object)',
    relatedLmsObject: 'Course (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    duration: '8–12 weeks',
    audience: 'Foundations Trail alumni seeking advanced Salesforce credentials',
    sprintCount: 0,
    moduleCount: 0,
    lessonCount: 0,
    assignmentCount: 0,
    assessmentCount: 0,
    knowledgeArticleCount: 0,
    pennyTemplateCount: 0,
    cohortCount: 0,
    notes: 'Planned — no content created yet.',
  },
];

// ── Sprints (Foundations Trail) ───────────────────────────────────────────────

export const curriculumSprints: CurriculumItem[] = [
  {
    id: 'spr-ft-1',
    objectType: 'sprint',
    name: 'Salesforce Ecosystem Foundations',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Establish foundational understanding of the Salesforce ecosystem, CRM concepts, and the Admin role — with career context for the learner\'s transition journey.',
    relatedSalesforceObject: 'Sprint__c (Custom Object)',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Coach Notes', 'Create Slack Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprintNumber: 1,
    duration: 'Weeks 1–3',
    moduleCount: 3,
    lessonCount: 9,
    theme: 'Ecosystem, CRM, Navigation',
    resolvePhase: 'Recognize',
  },
  {
    id: 'spr-ft-2',
    objectType: 'sprint',
    name: 'Data Modeling & Admin Fundamentals',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Build core Salesforce admin competency in data modeling, user management, security settings, reports, and dashboards — the foundation of the Admin certification.',
    relatedSalesforceObject: 'Sprint__c (Custom Object)',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprintNumber: 2,
    duration: 'Weeks 4–6',
    moduleCount: 3,
    lessonCount: 9,
    theme: 'Data Modeling, Security, Reporting',
    resolvePhase: 'Evaluate',
  },
  {
    id: 'spr-ft-3',
    objectType: 'sprint',
    name: 'Automation & Flows',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Introduce process automation, Flow Builder, and basic integration concepts — enabling learners to build and manage automated workflows in Salesforce.',
    relatedSalesforceObject: 'Sprint__c (Custom Object)',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Lesson', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprintNumber: 3,
    duration: 'Weeks 7–9',
    moduleCount: 3,
    lessonCount: 9,
    theme: 'Automation, Flow Builder, Integrations',
    resolvePhase: 'Solve',
  },
  {
    id: 'spr-ft-4',
    objectType: 'sprint',
    name: 'Certification Prep & Career Launch',
    status: 'needs-review',
    confidence: 'prototype',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Prepare learners for the Salesforce Admin or Associate certification exam and transition into the job market — including exam strategy, mock exams, portfolio work, and career positioning.',
    relatedSalesforceObject: 'Sprint__c (Custom Object)',
    relatedLmsObject: 'Unit (Salesforce LMS)',
    pennyActions: ['Generate Sprint Outline', 'Create Assessment', 'Create Coach Notes', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprintNumber: 4,
    duration: 'Weeks 10–12',
    moduleCount: 3,
    lessonCount: 9,
    theme: 'Certification, Portfolio, Career',
    resolvePhase: 'Verify',
    notes: 'Career Launch module content needs review — portfolio content updated Q1.',
  },
];

// ── Modules (Foundations Trail — 12 modules, 3 per sprint) ───────────────────

export const curriculumModules: CurriculumItem[] = [
  // Sprint 1 ──
  {
    id: 'mod-ft-1-1',
    objectType: 'module',
    name: 'Introduction to Salesforce',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Orient learners to the Salesforce platform: its history, ecosystem, key products, and why it matters for their career transition.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Knowledge Article', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 1: Salesforce Ecosystem Foundations',
    sprintId: 'spr-ft-1',
    moduleNumber: '1.1',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-1-1',
    learningObjectives: [
      'Explain what Salesforce is and why it is the leading CRM platform',
      'Identify the key Salesforce product families and their purposes',
      'Describe the Admin role and its career value',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-1-2',
    objectType: 'module',
    name: 'CRM Concepts & Career Context',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Build conceptual understanding of CRM principles and connect those concepts to the learner\'s career story — bridging prior experience to the Salesforce Admin path.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Reflection Prompt', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 1: Salesforce Ecosystem Foundations',
    sprintId: 'spr-ft-1',
    moduleNumber: '1.2',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-1-2',
    learningObjectives: [
      'Define CRM and explain how Salesforce implements CRM principles',
      'Connect learner\'s prior work experience to CRM concepts',
      'Articulate the career value of Salesforce Admin skills to an employer',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-1-3',
    objectType: 'module',
    name: 'Navigation & Core Objects',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Develop hands-on familiarity with the Salesforce UI, core standard objects (Accounts, Contacts, Leads, Opportunities), and basic record navigation.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 1: Salesforce Ecosystem Foundations',
    sprintId: 'spr-ft-1',
    moduleNumber: '1.3',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-1-3',
    learningObjectives: [
      'Navigate the Salesforce UI confidently: App Launcher, tabs, list views',
      'Identify and describe the purpose of Accounts, Contacts, Leads, and Opportunities',
      'Create and edit records in a Salesforce sandbox environment',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  // Sprint 2 ──
  {
    id: 'mod-ft-2-1',
    objectType: 'module',
    name: 'Data Modeling & Schema',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Teach the principles of Salesforce data modeling — objects, fields, relationships, and schema design — forming the foundation for all admin configuration work.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 2: Data Modeling & Admin Fundamentals',
    sprintId: 'spr-ft-2',
    moduleNumber: '2.1',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-2-1',
    learningObjectives: [
      'Explain the difference between standard and custom objects',
      'Design a simple data schema for a business use case',
      'Create custom fields with appropriate field types',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-2-2',
    objectType: 'module',
    name: 'User Management & Security',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Cover Salesforce security architecture — profiles, permission sets, roles, and sharing rules — enabling learners to manage access control for real org configurations.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 2: Data Modeling & Admin Fundamentals',
    sprintId: 'spr-ft-2',
    moduleNumber: '2.2',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-2-2',
    learningObjectives: [
      'Distinguish between profiles, permission sets, and roles',
      'Configure user access using appropriate sharing mechanisms',
      'Troubleshoot a common permission issue in a sandbox',
    ],
    hasPennyTemplate: false,
    hasKnowledgeArticle: true,
    notes: 'Missing Penny template — flagged in Content Health.',
  },
  {
    id: 'mod-ft-2-3',
    objectType: 'module',
    name: 'Reports & Dashboards',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Build practical skill in Salesforce reporting — creating tabular, summary, and matrix reports, building dashboards, and interpreting data for stakeholder communication.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 2: Data Modeling & Admin Fundamentals',
    sprintId: 'spr-ft-2',
    moduleNumber: '2.3',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-2-3',
    learningObjectives: [
      'Build a tabular, summary, and matrix report in Salesforce',
      'Create a dashboard with at least 3 components',
      'Explain the business value of a report to a non-technical stakeholder',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: false,
    notes: 'Knowledge article for dashboards needed — flagged in Content Health.',
  },
  // Sprint 3 ──
  {
    id: 'mod-ft-3-1',
    objectType: 'module',
    name: 'Validation Rules & Workflow',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Introduce Salesforce process automation through validation rules, workflow rules, and process builder — the foundational automation layer before Flow Builder.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 3: Automation & Flows',
    sprintId: 'spr-ft-3',
    moduleNumber: '3.1',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-3-1',
    learningObjectives: [
      'Write a validation rule using formula syntax',
      'Build a workflow rule with field update and email alert actions',
      'Explain when to use validation rules vs. automation',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-3-2',
    objectType: 'module',
    name: 'Flow Builder Fundamentals',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Teach Flow Builder as the primary Salesforce automation tool — covering screen flows, record-triggered flows, and scheduled flows with practical lab exercises.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 3: Automation & Flows',
    sprintId: 'spr-ft-3',
    moduleNumber: '3.2',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-3-2',
    learningObjectives: [
      'Build a screen flow with at least 3 screens and decision logic',
      'Create a record-triggered flow for a common admin use case',
      'Debug a broken flow using the Debug feature',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-3-3',
    objectType: 'module',
    name: 'Integration Concepts',
    status: 'needs-review',
    confidence: 'prototype',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Introduce integration concepts at a conceptual level — APIs, connected apps, AppExchange, and data import/export tools — without requiring learners to build integrations.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Knowledge Article'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 3: Automation & Flows',
    sprintId: 'spr-ft-3',
    moduleNumber: '3.3',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-3-3',
    learningObjectives: [
      'Describe Salesforce APIs and when they are used',
      'Explain the purpose of AppExchange and evaluate an AppExchange listing',
      'Import data using the Data Import Wizard',
    ],
    hasPennyTemplate: false,
    hasKnowledgeArticle: false,
    notes: 'Both Penny template and knowledge article missing — flagged. Last reviewed >6 months ago.',
  },
  // Sprint 4 ──
  {
    id: 'mod-ft-4-1',
    objectType: 'module',
    name: 'Exam Strategy & Mindset',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Prepare learners for the cognitive and strategic dimensions of the Salesforce certification exam — test-taking strategy, time management, anxiety reduction, and study planning.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Assessment', 'Create Reflection Prompt'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 4: Certification Prep & Career Launch',
    sprintId: 'spr-ft-4',
    moduleNumber: '4.1',
    lessonCount: 3,
    assignmentCount: 2,
    assessmentId: 'asmnt-ft-4-1',
    learningObjectives: [
      'Create a personalized 2-week exam study plan',
      'Apply active recall and spaced repetition to Salesforce content',
      'Manage exam anxiety using evidence-based strategies',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-4-2',
    objectType: 'module',
    name: 'Practice Exam Sessions',
    status: 'published',
    confidence: 'confirmed',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Run 3 timed practice exams with debrief — simulating real exam conditions, identifying knowledge gaps, and using Penny Exam Coach for targeted review.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Assessment', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 4: Certification Prep & Career Launch',
    sprintId: 'spr-ft-4',
    moduleNumber: '4.2',
    lessonCount: 3,
    assignmentCount: 1,
    assessmentId: 'asmnt-ft-4-2',
    learningObjectives: [
      'Complete 3 timed practice exams at 60-question length',
      'Identify the top 3 topic areas needing additional review',
      'Score ≥70% on the final practice exam before the real exam',
    ],
    hasPennyTemplate: true,
    hasKnowledgeArticle: true,
  },
  {
    id: 'mod-ft-4-3',
    objectType: 'module',
    name: 'Portfolio & Career Launch',
    status: 'needs-review',
    confidence: 'prototype',
    owner: 'Curriculum Lead',
    program: 'Foundations Trail',
    purpose: 'Guide learners through building a portfolio showcasing their Salesforce work and preparing for job applications — resume, LinkedIn, interview preparation, and job search strategy.',
    relatedSalesforceObject: 'Module__c (Custom Object)',
    relatedLmsObject: 'Module (Salesforce LMS)',
    pennyActions: ['Create Lesson', 'Create Reflection Prompt', 'Create Coach Notes'],
    futureDemandLink: 'Submit Change Request → /demand/change-request',
    sprint: 'Sprint 4: Certification Prep & Career Launch',
    sprintId: 'spr-ft-4',
    moduleNumber: '4.3',
    lessonCount: 3,
    assignmentCount: 3,
    assessmentId: null,
    learningObjectives: [
      'Build a portfolio with at least 2 Salesforce project examples',
      'Update LinkedIn profile with Salesforce skills and certification',
      'Complete at least 2 mock interviews with coach feedback',
    ],
    hasPennyTemplate: false,
    hasKnowledgeArticle: false,
    notes: 'Assessment missing — flagged in Content Health. Portfolio content needs Q1 update.',
  },
];

// ── Lessons (sample — 18 representative lessons) ──────────────────────────────

export const curriculumLessons: CurriculumItem[] = [
  // Module 1.1 ──
  { id: 'les-ft-1-1-1', objectType: 'lesson', name: 'What Is Salesforce?', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Introduce the Salesforce platform — its origin, market position, and why it is the #1 CRM.', relatedSalesforceObject: 'Lesson__c (Custom Object)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Knowledge Article'], futureDemandLink: 'Submit Change Request', module: 'Introduction to Salesforce', moduleId: 'mod-ft-1-1', moduleNumber: '1.1', lessonNumber: '1.1.1', lessonType: 'Video + Discussion', duration: '45 min', learningObjective: 'Explain what Salesforce is and why it leads the CRM market', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-1-1-2', objectType: 'lesson', name: 'The Salesforce Ecosystem', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Overview of Salesforce Clouds, AppExchange, Trailhead, and the broader ecosystem.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', module: 'Introduction to Salesforce', moduleId: 'mod-ft-1-1', moduleNumber: '1.1', lessonNumber: '1.1.2', lessonType: 'Reading + Lab', duration: '60 min', learningObjective: 'Identify the key Salesforce product families and their purposes', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-1-1-3', objectType: 'lesson', name: 'The Admin Role', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Profile the Salesforce Admin role — responsibilities, career paths, and day-in-the-life.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Introduction to Salesforce', moduleId: 'mod-ft-1-1', moduleNumber: '1.1', lessonNumber: '1.1.3', lessonType: 'Video + Workshop', duration: '45 min', learningObjective: 'Describe the Admin role and its career value', hasPennyPrompt: false, hasAssessment: true },
  // Module 1.2 ──
  { id: 'les-ft-1-2-1', objectType: 'lesson', name: 'CRM Fundamentals', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Explain the core principles of Customer Relationship Management and how Salesforce implements them.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'CRM Concepts & Career Context', moduleId: 'mod-ft-1-2', moduleNumber: '1.2', lessonNumber: '1.2.1', lessonType: 'Reading + Discussion', duration: '45 min', learningObjective: 'Define CRM and explain how Salesforce implements it', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-1-2-2', objectType: 'lesson', name: 'Translating Your Experience', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Help learners identify transferable skills from prior careers and connect them to CRM and Admin concepts.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', module: 'CRM Concepts & Career Context', moduleId: 'mod-ft-1-2', moduleNumber: '1.2', lessonNumber: '1.2.2', lessonType: 'Workshop', duration: '60 min', learningObjective: 'Connect prior work experience to CRM concepts', hasPennyPrompt: false, hasAssessment: false },
  { id: 'les-ft-1-2-3', objectType: 'lesson', name: 'Your Career Story', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Guide learners in articulating a clear career narrative that positions their Salesforce training as intentional and valuable.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', module: 'CRM Concepts & Career Context', moduleId: 'mod-ft-1-2', moduleNumber: '1.2', lessonNumber: '1.2.3', lessonType: 'Workshop + Live Session', duration: '75 min', learningObjective: 'Articulate career value of Salesforce Admin skills to an employer', hasPennyPrompt: true, hasAssessment: true },
  // Module 2.1 ──
  { id: 'les-ft-2-1-1', objectType: 'lesson', name: 'Objects, Fields & Relationships', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Introduce standard and custom objects, field types, and relationship types (Lookup, Master-Detail).', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article', 'Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Data Modeling & Schema', moduleId: 'mod-ft-2-1', moduleNumber: '2.1', lessonNumber: '2.1.1', lessonType: 'Video + Lab', duration: '60 min', learningObjective: 'Explain the difference between standard and custom objects', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-2-1-2', objectType: 'lesson', name: 'Schema Builder Lab', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Hands-on lab using Schema Builder to design and build a custom data model for a business scenario.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Data Modeling & Schema', moduleId: 'mod-ft-2-1', moduleNumber: '2.1', lessonNumber: '2.1.2', lessonType: 'Hands-On Lab', duration: '90 min', learningObjective: 'Design a simple data schema for a business use case', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-2-1-3', objectType: 'lesson', name: 'Custom Fields Workshop', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Create custom fields with correct field types, required settings, and field-level security — a core admin task.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', module: 'Data Modeling & Schema', moduleId: 'mod-ft-2-1', moduleNumber: '2.1', lessonNumber: '2.1.3', lessonType: 'Workshop', duration: '60 min', learningObjective: 'Create custom fields with appropriate field types', hasPennyPrompt: false, hasAssessment: true },
  // Module 3.2 ──
  { id: 'les-ft-3-2-1', objectType: 'lesson', name: 'Flow Builder Introduction', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Tour the Flow Builder interface, element types, and flow variables — orienting learners before they build.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Flow Builder Fundamentals', moduleId: 'mod-ft-3-2', moduleNumber: '3.2', lessonNumber: '3.2.1', lessonType: 'Video + Lab', duration: '60 min', learningObjective: 'Navigate the Flow Builder interface and identify element types', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-3-2-2', objectType: 'lesson', name: 'Screen Flow Lab', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Build a 3-screen screen flow with decision logic for a common admin use case — e.g. a new client intake form.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Flow Builder Fundamentals', moduleId: 'mod-ft-3-2', moduleNumber: '3.2', lessonNumber: '3.2.2', lessonType: 'Hands-On Lab', duration: '90 min', learningObjective: 'Build a screen flow with at least 3 screens and decision logic', hasPennyPrompt: false, hasAssessment: false },
  { id: 'les-ft-3-2-3', objectType: 'lesson', name: 'Record-Triggered Flows', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Build and debug a record-triggered flow that automates a common Salesforce admin task.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Flow Builder Fundamentals', moduleId: 'mod-ft-3-2', moduleNumber: '3.2', lessonNumber: '3.2.3', lessonType: 'Workshop + Lab', duration: '90 min', learningObjective: 'Create a record-triggered flow for a common admin use case', hasPennyPrompt: true, hasAssessment: true },
  // Module 4.1 ──
  { id: 'les-ft-4-1-1', objectType: 'lesson', name: 'Know the Exam Blueprint', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Map the official Salesforce Admin certification exam blueprint — topics, weights, and recommended focus areas.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', module: 'Exam Strategy & Mindset', moduleId: 'mod-ft-4-1', moduleNumber: '4.1', lessonNumber: '4.1.1', lessonType: 'Reading + Discussion', duration: '45 min', learningObjective: 'Identify exam topic weights and align study time accordingly', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-4-1-2', objectType: 'lesson', name: 'Active Recall Techniques', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Teach evidence-based study techniques (active recall, spaced repetition) applied to Salesforce certification content.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', module: 'Exam Strategy & Mindset', moduleId: 'mod-ft-4-1', moduleNumber: '4.1', lessonNumber: '4.1.2', lessonType: 'Workshop', duration: '60 min', learningObjective: 'Apply active recall and spaced repetition to Salesforce content', hasPennyPrompt: true, hasAssessment: false },
  { id: 'les-ft-4-1-3', objectType: 'lesson', name: 'Managing Exam Anxiety', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Address test anxiety with practical strategies — reframing, breathing techniques, and confidence-building through prior success.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Exam Strategy & Mindset', moduleId: 'mod-ft-4-1', moduleNumber: '4.1', lessonNumber: '4.1.3', lessonType: 'Live Session', duration: '45 min', learningObjective: 'Manage exam anxiety using evidence-based strategies', hasPennyPrompt: false, hasAssessment: false },
  // Module 4.3 ──
  { id: 'les-ft-4-3-1', objectType: 'lesson', name: 'Building Your Portfolio', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Guide learners in selecting, documenting, and presenting 2+ Salesforce projects for a portfolio site or PDF.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Lesson', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', module: 'Portfolio & Career Launch', moduleId: 'mod-ft-4-3', moduleNumber: '4.3', lessonNumber: '4.3.1', lessonType: 'Workshop', duration: '90 min', learningObjective: 'Build a portfolio with at least 2 Salesforce project examples', hasPennyPrompt: false, hasAssessment: false },
  { id: 'les-ft-4-3-2', objectType: 'lesson', name: 'LinkedIn for Salesforce Professionals', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Optimize the LinkedIn profile for Salesforce job seekers — headline, summary, skills, and certification badges.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Lesson', 'Create Knowledge Article'], futureDemandLink: 'Submit Change Request', module: 'Portfolio & Career Launch', moduleId: 'mod-ft-4-3', moduleNumber: '4.3', lessonNumber: '4.3.2', lessonType: 'Workshop + Live Session', duration: '75 min', learningObjective: 'Update LinkedIn profile with Salesforce skills and certification', hasPennyPrompt: false, hasAssessment: false },
  { id: 'les-ft-4-3-3', objectType: 'lesson', name: 'Mock Interview Prep', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Run 2 mock interviews with coach feedback — practicing technical and behavioral questions for Salesforce Admin roles.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', module: 'Portfolio & Career Launch', moduleId: 'mod-ft-4-3', moduleNumber: '4.3', lessonNumber: '4.3.3', lessonType: 'Live Session', duration: '60 min', learningObjective: 'Complete at least 2 mock interviews with coach feedback', hasPennyPrompt: false, hasAssessment: false },
];

// ── Assessments (12 — one per module) ────────────────────────────────────────

export const curriculumAssessments: CurriculumItem[] = [
  { id: 'asmnt-ft-1-1', objectType: 'assessment', name: 'Salesforce Intro Knowledge Check', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Verify learner understanding of the Salesforce platform, product families, and the Admin role after Module 1.1.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Introduction to Salesforce', moduleId: 'mod-ft-1-1', assessmentType: 'Knowledge Check', questionCount: 10, passingScore: 80, hasPennyCoach: true },
  { id: 'asmnt-ft-1-2', objectType: 'assessment', name: 'CRM Concepts Quiz', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Assess understanding of CRM fundamentals and ability to connect prior experience to Salesforce context.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'CRM Concepts & Career Context', moduleId: 'mod-ft-1-2', assessmentType: 'Knowledge Check', questionCount: 10, passingScore: 75, hasPennyCoach: true },
  { id: 'asmnt-ft-1-3', objectType: 'assessment', name: 'Navigation & Objects Skill Check', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Practical skill check: navigate the Salesforce UI and demonstrate correct use of core standard objects.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Navigation & Core Objects', moduleId: 'mod-ft-1-3', assessmentType: 'Skill Assessment', questionCount: 12, passingScore: 80, hasPennyCoach: true },
  { id: 'asmnt-ft-2-1', objectType: 'assessment', name: 'Data Modeling Quiz', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Assess understanding of Salesforce data modeling: objects, fields, relationships, and schema design principles.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Data Modeling & Schema', moduleId: 'mod-ft-2-1', assessmentType: 'Knowledge Check', questionCount: 15, passingScore: 80, hasPennyCoach: true },
  { id: 'asmnt-ft-2-2', objectType: 'assessment', name: 'Security Configuration Check', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Verify ability to configure user access correctly using profiles, permission sets, and sharing rules.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'User Management & Security', moduleId: 'mod-ft-2-2', assessmentType: 'Skill Assessment', questionCount: 12, passingScore: 80, hasPennyCoach: false },
  { id: 'asmnt-ft-2-3', objectType: 'assessment', name: 'Reports & Dashboards Lab Check', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Practical check: learner builds a report and dashboard that meets defined specifications.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Reports & Dashboards', moduleId: 'mod-ft-2-3', assessmentType: 'Skill Assessment', questionCount: 8, passingScore: 75, hasPennyCoach: true },
  { id: 'asmnt-ft-3-1', objectType: 'assessment', name: 'Validation & Workflow Quiz', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Test understanding of validation rule syntax and workflow rule configuration.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Validation Rules & Workflow', moduleId: 'mod-ft-3-1', assessmentType: 'Knowledge Check', questionCount: 12, passingScore: 80, hasPennyCoach: true },
  { id: 'asmnt-ft-3-2', objectType: 'assessment', name: 'Flow Builder Lab Check', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Learner submits a completed screen flow and record-triggered flow for review — practical flow-building skill check.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Flow Builder Fundamentals', moduleId: 'mod-ft-3-2', assessmentType: 'Skill Assessment', questionCount: 6, passingScore: 80, hasPennyCoach: true },
  { id: 'asmnt-ft-3-3', objectType: 'assessment', name: 'Integration Concepts Check', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Conceptual assessment of integration types, API use cases, and AppExchange evaluation skills.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Integration Concepts', moduleId: 'mod-ft-3-3', assessmentType: 'Knowledge Check', questionCount: 10, passingScore: 75, hasPennyCoach: false, notes: 'Needs Penny Coach prompt — flagged.' },
  { id: 'asmnt-ft-4-1', objectType: 'assessment', name: 'Study Plan Review', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Learner submits personalized 2-week study plan and coach reviews against exam blueprint requirements.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Assignment (Salesforce LMS)', pennyActions: ['Create Assessment', 'Create Coach Notes'], futureDemandLink: 'Submit Change Request', module: 'Exam Strategy & Mindset', moduleId: 'mod-ft-4-1', assessmentType: 'Portfolio Review', questionCount: 1, passingScore: 100, hasPennyCoach: true },
  { id: 'asmnt-ft-4-2', objectType: 'assessment', name: 'Practice Exam 3 (Final Gate)', status: 'published', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Final timed practice exam — 60 questions, 90-minute limit — learner must score ≥70% to proceed to real certification.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', module: 'Practice Exam Sessions', moduleId: 'mod-ft-4-2', assessmentType: 'Practice Exam', questionCount: 60, passingScore: 70, hasPennyCoach: true },
];

// ── Knowledge Articles ────────────────────────────────────────────────────────

export const curriculumKnowledgeArticles: CurriculumItem[] = [
  { id: 'ka-01', objectType: 'knowledgeArticle', name: 'What Is Salesforce? — Learner Reference', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Introductory reference article explaining Salesforce, its products, and why it matters for career changers.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Salesforce Overview', articleType: 'Reference', wordCount: 850, lastReviewed: 'Dec 2024', hasPennyMapping: true, relatedModules: ['Introduction to Salesforce'] },
  { id: 'ka-02', objectType: 'knowledgeArticle', name: 'CRM Concepts: A Career Changer\'s Guide', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Explains CRM concepts in plain language with career-context framing — written for learners without a business background.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'CRM & Career', articleType: 'Career', wordCount: 1100, lastReviewed: 'Dec 2024', hasPennyMapping: true, relatedModules: ['CRM Concepts & Career Context'] },
  { id: 'ka-03', objectType: 'knowledgeArticle', name: 'Salesforce Objects & Fields — Quick Reference', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Reference guide for standard and custom objects, field types, and relationships — used by Learning Coach to answer field-type questions.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Data Modeling', articleType: 'Reference', wordCount: 1400, lastReviewed: 'Nov 2024', hasPennyMapping: false, relatedModules: ['Data Modeling & Schema'], notes: 'No Salesforce/LMS mapping — flagged in Content Health.' },
  { id: 'ka-04', objectType: 'knowledgeArticle', name: 'Understanding Salesforce Security Model', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Explains profiles, permission sets, roles, and sharing rules with visual diagrams — key reference for the security module.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Security & Access', articleType: 'Reference', wordCount: 1600, lastReviewed: 'Dec 2024', hasPennyMapping: true, relatedModules: ['User Management & Security'] },
  { id: 'ka-05', objectType: 'knowledgeArticle', name: 'Flow Builder: Getting Started', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Step-by-step how-to guide for building a first Flow in Salesforce — written to support Build Companion responses.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Automation', articleType: 'How-To', wordCount: 1800, lastReviewed: 'Jan 2025', hasPennyMapping: true, relatedModules: ['Flow Builder Fundamentals'] },
  { id: 'ka-06', objectType: 'knowledgeArticle', name: 'Salesforce Admin Certification: Exam Blueprint', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Exam blueprint breakdown with topic weights, study time recommendations, and recommended Trailhead trails.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Certification', articleType: 'Certification', wordCount: 1200, lastReviewed: 'Oct 2024', hasPennyMapping: false, relatedModules: ['Exam Strategy & Mindset'], notes: 'No Salesforce/LMS mapping — flagged in Content Health.' },
  { id: 'ka-07', objectType: 'knowledgeArticle', name: 'Resume Writing for Salesforce Roles', status: 'draft', confidence: 'prototype', owner: '', program: 'Foundations Trail', purpose: 'Career article covering resume structure, Salesforce skill keywords, and how to present certification and project experience.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Career', articleType: 'Career', wordCount: 900, lastReviewed: 'Never', hasPennyMapping: false, relatedModules: ['Portfolio & Career Launch'], notes: 'No owner assigned — flagged in Content Health.' },
  { id: 'ka-08', objectType: 'knowledgeArticle', name: 'LinkedIn Profile Optimization Guide', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Step-by-step guide to optimizing a LinkedIn profile for Salesforce job searching — headline, summary, skills, certifications.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article', 'Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', topic: 'Career', articleType: 'Career', wordCount: 750, lastReviewed: 'Sep 2024', hasPennyMapping: true, relatedModules: ['Portfolio & Career Launch'] },
  { id: 'ka-09', objectType: 'knowledgeArticle', name: 'Introduction to Validation Rules', status: 'published', confidence: 'confirmed', owner: '', program: 'Foundations Trail', purpose: 'Explains validation rule syntax, formula logic, and common use cases — supports Learning Coach questions on automation.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Automation', articleType: 'Reference', wordCount: 1100, lastReviewed: 'Nov 2024', hasPennyMapping: true, relatedModules: ['Validation Rules & Workflow'], notes: 'No owner assigned — flagged in Content Health.' },
  { id: 'ka-10', objectType: 'knowledgeArticle', name: 'AppExchange: Evaluating Solutions', status: 'draft', confidence: 'draft', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Guide for evaluating AppExchange solutions — security review, pricing, user reviews, and implementation considerations.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', topic: 'Integration', articleType: 'How-To', wordCount: 600, lastReviewed: 'Never', hasPennyMapping: false, relatedModules: ['Integration Concepts'], notes: 'Draft — not yet reviewed. No Salesforce/LMS mapping.' },
];

// ── Penny Templates ───────────────────────────────────────────────────────────

export const curriculumPennyTemplates: CurriculumItem[] = [
  { id: 'pt-01', objectType: 'pennyTemplate', name: 'Sprint Welcome Message', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Opening message delivered by Penny at the start of each new sprint — sets context, previews modules, and encourages the learner.', relatedSalesforceObject: 'PennyTemplate__c (Custom Object)', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Slack Prompt', 'Generate Sprint Outline'], futureDemandLink: 'Submit Change Request', templateType: 'Welcome', triggerContext: 'Sprint start (automated or manual trigger)', targetAudience: 'Learner', tone: 'Encouraging, clear', sampleOutput: '"Welcome to Sprint 2: Data Modeling & Admin Fundamentals! This sprint covers Objects, Security, and Reports — three core areas of the Salesforce Admin exam. Your coach has set up your first module. Let\'s go!"' },
  { id: 'pt-02', objectType: 'pennyTemplate', name: 'Module Introduction', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Short intro message from Penny when a learner opens a new module — previews learning objectives and estimated time.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Module'], futureDemandLink: 'Submit Change Request', templateType: 'Introduction', triggerContext: 'Module entry (first open)', targetAudience: 'Learner', tone: 'Helpful, concise', sampleOutput: '"You\'re starting Data Modeling & Schema — one of the most important modules in Foundations Trail. After this module, you\'ll be able to design your first custom Salesforce data model. Estimated time: 3 hours across 3 lessons."' },
  { id: 'pt-03', objectType: 'pennyTemplate', name: 'Lesson Reflection Prompt', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'End-of-lesson reflection question generated by Penny — connects lesson content to the learner\'s career story or prior experience.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', templateType: 'Reflection', triggerContext: 'Lesson completion', targetAudience: 'Learner', tone: 'Thoughtful, personal', sampleOutput: '"Now that you\'ve built your first validation rule — think about a past job where inconsistent data caused problems. How would a validation rule have helped in that situation? Share your thoughts in your Trail Journal."' },
  { id: 'pt-04', objectType: 'pennyTemplate', name: 'Assignment Feedback Guide', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Coach-facing guide generated by Penny for giving structured, consistent feedback on a specific assignment type.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request', templateType: 'Feedback', triggerContext: 'Assignment submission review', targetAudience: 'Coach', tone: 'Instructional, structured', sampleOutput: '"When reviewing the Schema Builder Lab: Check that the learner has at least 2 custom objects with a Lookup relationship. Look for correct field types (Text vs. Picklist). Provide specific improvement notes before marking complete."' },
  { id: 'pt-05', objectType: 'pennyTemplate', name: 'Assessment Coach Prompt', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Pre-assessment encouragement message from Penny — reduces anxiety, reminds learner of their preparation, and sets a calm mindset.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', templateType: 'Coaching', triggerContext: 'Before assessment (automated)', targetAudience: 'Learner', tone: 'Calm, confidence-building', sampleOutput: '"You\'ve completed all 3 lessons in Module 2.1 and your lab scores are solid. Remember: this assessment checks your understanding, not your worth. Take a breath, read each question carefully, and trust your preparation."' },
  { id: 'pt-06', objectType: 'pennyTemplate', name: 'At-Risk Learner Nudge', status: 'draft', confidence: 'prototype', owner: 'Penny Lead', program: 'All Programs', purpose: 'Confidence-triggered outreach from Penny when a learner\'s engagement or progress signals dropout risk — sent via Slack or direct message.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Slack Prompt'], futureDemandLink: 'Submit Change Request', templateType: 'Alert', triggerContext: 'Confidence score drops below threshold (automated)', targetAudience: 'Learner', tone: 'Caring, low-pressure', sampleOutput: '"Hey — I noticed you haven\'t opened Module 3.1 yet this week. That\'s okay! Life happens. Your coach is available for a quick check-in if you\'d like. Want me to schedule 15 minutes?"' },
  { id: 'pt-07', objectType: 'pennyTemplate', name: 'Weekly Progress Summary', status: 'draft', confidence: 'prototype', owner: 'Penny Lead', program: 'All Programs', purpose: 'Cohort health digest for coaches — summarizes learner progress, confidence flags, and upcoming milestones for the week ahead.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Coach Notes', 'Create Slack Prompt'], futureDemandLink: 'Submit Change Request', templateType: 'Summary', triggerContext: 'Weekly (every Monday, automated)', targetAudience: 'Coach', tone: 'Professional, data-forward', sampleOutput: '"Foundations Trail Cohort 2 — Week 7 Summary: 12/14 learners on track. 2 at-risk (flagged for review). Module 3.1 average score: 84%. Upcoming: Module 3.2 opens Wednesday."' },
  { id: 'pt-08', objectType: 'pennyTemplate', name: 'Coach Notes Template', status: 'published', confidence: 'confirmed', owner: 'Penny Lead', program: 'Foundations Trail', purpose: 'Structured coach guidance generated by Penny for each module — covers facilitation tips, common learner confusion points, and recommended support actions.', relatedSalesforceObject: 'PennyTemplate__c', relatedLmsObject: 'N/A — Penny-native', pennyActions: ['Create Coach Notes'], futureDemandLink: 'Submit Change Request', templateType: 'Notes', triggerContext: 'Module activation (coach dashboard)', targetAudience: 'Coach', tone: 'Collegial, practical', sampleOutput: '"Module 3.2 Coach Notes — Flow Builder: Most learners struggle with decision element logic. Encourage them to draw the flow before building. Common mistake: using Assignment element when a Decision should branch first."' },
];

// ── Content Health Issues ─────────────────────────────────────────────────────

export const contentHealthIssues: CurriculumItem[] = [
  { id: 'health-01', objectType: 'healthIssue', name: 'Module 4.3: Assessment Missing', status: 'missing', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Module 4.3 (Portfolio & Career Launch) has no associated assessment. All modules require a completion check.', relatedSalesforceObject: 'Assessment__c', relatedLmsObject: 'Quiz (Salesforce LMS)', pennyActions: ['Create Assessment'], futureDemandLink: 'Submit Change Request', severity: 'high', issueType: 'Missing Assessment', affectedItems: ['Portfolio & Career Launch (Module 4.3)'], actionRequired: 'Create an assessment for Module 4.3 using Penny — assign to Curriculum Lead.', module: 'Portfolio & Career Launch', moduleId: 'mod-ft-4-3' },
  { id: 'health-02', objectType: 'healthIssue', name: '3 Lessons Without Learning Objectives', status: 'needs-review', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Lessons L1.1.3, L4.1.3, and L4.3.2 are missing documented learning objectives — making them unverifiable for quality and Penny unmappable.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Lesson'], futureDemandLink: 'Submit Change Request', severity: 'medium', issueType: 'Missing Learning Objectives', affectedItems: ['The Admin Role (L1.1.3)', 'Managing Exam Anxiety (L4.1.3)', 'LinkedIn for Salesforce Professionals (L4.3.2)'], actionRequired: 'Add one learning objective per lesson — use Penny Create Lesson to generate aligned objectives.' },
  { id: 'health-03', objectType: 'healthIssue', name: '2 Knowledge Articles Without Owners', status: 'needs-review', confidence: 'confirmed', owner: '', program: 'Foundations Trail', purpose: 'KA-07 (Resume Writing for Salesforce Roles) and KA-09 (Introduction to Validation Rules) have no assigned owner — creating governance and review risk.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', severity: 'medium', issueType: 'Unowned Content', affectedItems: ['Resume Writing for Salesforce Roles (KA-07)', 'Introduction to Validation Rules (KA-09)'], actionRequired: 'Assign an owner to each article in Administration → Knowledge Articles.' },
  { id: 'health-04', objectType: 'healthIssue', name: 'Module 3.3: Needs Review — 7+ Months Old', status: 'needs-review', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Module 3.3 (Integration Concepts) was last reviewed July 2024 — over 7 months ago — and AppExchange landscape changes may have made content stale.', relatedSalesforceObject: 'Module__c', relatedLmsObject: 'Module (Salesforce LMS)', pennyActions: ['Create Knowledge Article', 'Create Lesson'], futureDemandLink: 'Submit Change Request', severity: 'medium', issueType: 'Stale Content', affectedItems: ['Integration Concepts (Module 3.3)'], actionRequired: 'Review Module 3.3 against current Salesforce documentation — update lesson content and knowledge article.' },
  { id: 'health-05', objectType: 'healthIssue', name: '5 Lessons Missing Penny Prompts', status: 'needs-review', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'Lessons 1.1.3, 1.2.2, 2.1.3, 3.2.2, and 4.1.3 have no Penny reflection or engagement prompts — reducing learner engagement during those lessons.', relatedSalesforceObject: 'Lesson__c', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Reflection Prompt'], futureDemandLink: 'Submit Change Request', severity: 'medium', issueType: 'Missing Penny Prompts', affectedItems: ['The Admin Role (1.1.3)', 'Translating Your Experience (1.2.2)', 'Custom Fields Workshop (2.1.3)', 'Screen Flow Lab (3.2.2)', 'Managing Exam Anxiety (4.1.3)'], actionRequired: 'Use Penny Content Assistant → Create Reflection Prompt for each flagged lesson.' },
  { id: 'health-06', objectType: 'healthIssue', name: '3 Knowledge Articles Without Salesforce/LMS Mapping', status: 'needs-review', confidence: 'confirmed', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'KA-03, KA-06, and KA-10 have no Salesforce Knowledge or LMS object mapping — preventing Penny from retrieving them correctly in future API integration.', relatedSalesforceObject: 'Knowledge (Salesforce Knowledge)', relatedLmsObject: 'Content (Salesforce LMS)', pennyActions: ['Create Knowledge Article'], futureDemandLink: 'Submit Change Request', severity: 'medium', issueType: 'Missing LMS/Salesforce Mapping', affectedItems: ['Salesforce Objects & Fields — Quick Reference (KA-03)', 'Salesforce Admin Certification: Exam Blueprint (KA-06)', 'AppExchange: Evaluating Solutions (KA-10)'], actionRequired: 'Complete the Salesforce/LMS mapping fields in the Knowledge Articles admin area.' },
  { id: 'health-07', objectType: 'healthIssue', name: 'Duplicate Concept: Data Modeling in M2.1 & M3.3', status: 'needs-review', confidence: 'prototype', owner: 'Curriculum Lead', program: 'Foundations Trail', purpose: 'The concept "Salesforce data model basics" appears in both Module 2.1 (Data Modeling & Schema) and Module 3.3 (Integration Concepts) — learners may encounter redundant content without clear progression.', relatedSalesforceObject: 'Module__c', relatedLmsObject: 'Module (Salesforce LMS)', pennyActions: ['Create Lesson', 'Create Knowledge Article'], futureDemandLink: 'Submit Change Request', severity: 'low', issueType: 'Duplicate Concept', affectedItems: ['Data Modeling & Schema (Module 2.1)', 'Integration Concepts (Module 3.3)'], actionRequired: 'Review both modules — M3.3 should reference M2.1 rather than re-teach data modeling basics.' },
];

// ── Penny Content Assistant Actions ──────────────────────────────────────────

export interface PennyAssistantAction {
  id: string;
  label: string;
  description: string;
  outputType: CurriculumObjectType;
  targetAudience: 'Learner' | 'Coach' | 'Staff';
  estimatedTime: string;
  notes: string;
}

export const pennyAssistantActions: PennyAssistantAction[] = [
  { id: 'action-create-module',      label: 'Create Module',             description: 'Generate a module structure with name, learning objectives, lesson outline, estimated duration, and suggested Penny template.', outputType: 'module',           targetAudience: 'Staff',   estimatedTime: '~30 seconds', notes: 'Penny generates from program + sprint context and learning objective inputs.' },
  { id: 'action-create-lesson',      label: 'Create Lesson',             description: 'Generate a lesson plan with objective, content outline, activity type, duration estimate, and reflection prompt.', outputType: 'lesson',           targetAudience: 'Staff',   estimatedTime: '~30 seconds', notes: 'Input: module name + lesson topic. Output: structured lesson plan for review.' },
  { id: 'action-create-assessment',  label: 'Create Assessment',         description: 'Generate assessment questions aligned to a module\'s learning objectives — multiple choice, scenario-based, or practical check.', outputType: 'assessment',       targetAudience: 'Staff',   estimatedTime: '~45 seconds', notes: 'Penny generates from learning objectives. Staff reviews before publishing.' },
  { id: 'action-create-article',     label: 'Create Knowledge Article',  description: 'Draft a knowledge article from provided source topics — structured for Salesforce Knowledge taxonomy and Penny retrieval.', outputType: 'knowledgeArticle', targetAudience: 'Staff',   estimatedTime: '~60 seconds', notes: 'Requires topic and source reference inputs. Output is a draft — must be reviewed and owned before publishing.' },
  { id: 'action-sprint-outline',     label: 'Generate Sprint Outline',   description: 'Build a full sprint plan — theme, modules, lesson sequence, assignments, and assessment strategy — from program and RESOLVE phase context.', outputType: 'sprint',           targetAudience: 'Staff',   estimatedTime: '~60 seconds', notes: 'Input: program name + sprint number + RESOLVE phase. Output: structured sprint outline for Curriculum Lead review.' },
  { id: 'action-coach-notes',        label: 'Create Coach Notes',        description: 'Generate facilitation guidance for a module or sprint — covering common learner confusion points, recommended support actions, and coaching tips.', outputType: 'module',           targetAudience: 'Coach',   estimatedTime: '~30 seconds', notes: 'Context: module content + prior cohort performance signals (when available).' },
  { id: 'action-slack-prompt',       label: 'Create Slack Prompt',       description: 'Generate a cohort-facing Slack message for a specific trigger — sprint start, Trail Quest launch, milestone celebration, or learner nudge.', outputType: 'pennyTemplate',    targetAudience: 'Learner', estimatedTime: '~20 seconds', notes: 'Output is a Slack-formatted message draft. Future: auto-route to #guided-trail-cohort via Slack API.' },
  { id: 'action-gchat-update',       label: 'Create Google Chat Update', description: 'Generate a client-facing project update message for Digital Compass employer partners — sprint milestone, UAT prep, or learner progress summary.', outputType: 'pennyTemplate',    targetAudience: 'Learner', estimatedTime: '~20 seconds', notes: 'Output formatted for Google Chat Space. Future: auto-route to Digital Compass Space via Google Chat API.' },
  { id: 'action-reflection-prompt',  label: 'Create Reflection Prompt',  description: 'Generate a learner reflection question for a lesson — connecting content to personal experience, career goals, or prior work history.', outputType: 'pennyTemplate',    targetAudience: 'Learner', estimatedTime: '~15 seconds', notes: 'Generated from lesson topic and module learning objective. Output added to lesson record as Penny prompt field.' },
];
