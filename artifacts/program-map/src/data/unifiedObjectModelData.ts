// Unified Object Model — core object type definitions, relationships, and governance

export type ObjectCategory =
  | 'program-layer'
  | 'knowledge-layer'
  | 'intelligence-layer'
  | 'people-layer'
  | 'infrastructure-layer'
  | 'governance-layer';

export type RelType =
  | 'contains' | 'governs' | 'sources' | 'maps-to' | 'triggers'
  | 'participates-in' | 'syncs-with' | 'depends-on' | 'informs' | 'serves';

export interface ObjRelationship {
  targetId: string;
  targetName: string;
  type: RelType;
  description: string;
}

export interface HealthIndicator {
  name: string;
  source: string;
  description: string;
}

export interface UOMObjectType {
  id: string;
  name: string;
  plural: string;
  category: ObjectCategory;
  purpose: string;
  ownership: string[];
  sourceOfTruth: string;
  lifecycle: string[];
  health: HealthIndicator[];
  relationships: ObjRelationship[];
  systems: string[];
  reviewCycle: string;
  workspaceLink: string;
  standards: string[];
  profileTabs: string[];
}

export const OBJECT_CATEGORIES: { id: ObjectCategory; label: string; color: string; bg: string }[] = [
  { id: 'program-layer',       label: 'Program Layer',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'knowledge-layer',     label: 'Knowledge Layer',     color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { id: 'intelligence-layer',  label: 'Intelligence Layer',  color: 'text-pink-700',    bg: 'bg-pink-50 border-pink-200' },
  { id: 'people-layer',        label: 'People Layer',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  { id: 'infrastructure-layer',label: 'Infrastructure Layer',color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200' },
  { id: 'governance-layer',    label: 'Governance Layer',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
];

export const REL_TYPE_CONFIG: Record<RelType, { label: string; color: string }> = {
  'contains':        { label: 'Contains',        color: 'text-emerald-600' },
  'governs':         { label: 'Governs',          color: 'text-violet-600'  },
  'sources':         { label: 'Sources From',     color: 'text-blue-600'    },
  'maps-to':         { label: 'Maps To',          color: 'text-sky-600'     },
  'triggers':        { label: 'Triggers',         color: 'text-pink-600'    },
  'participates-in': { label: 'Participates In',  color: 'text-orange-600'  },
  'syncs-with':      { label: 'Syncs With',       color: 'text-teal-600'    },
  'depends-on':      { label: 'Depends On',       color: 'text-rose-600'    },
  'informs':         { label: 'Informs',          color: 'text-indigo-600'  },
  'serves':          { label: 'Serves',           color: 'text-amber-600'   },
};

export const OBJECT_TYPES: UOMObjectType[] = [
  // ── Program Layer ──────────────────────────────────────────────────────────
  {
    id: 'program', name: 'Program', plural: 'Programs', category: 'program-layer',
    purpose: 'A structured learning pathway designed for a specific learner population and career goal. The primary unit of program delivery at Transition Trails.',
    ownership: ['Program Director', 'Curriculum Lead'],
    sourceOfTruth: 'Salesforce',
    lifecycle: ['Design', 'Build', 'Pilot', 'Active', 'Iterate', 'Sunset'],
    health: [
      { name: 'Enrollment Rate', source: 'Salesforce', description: 'Active learners as a percentage of capacity' },
      { name: 'Completion Rate', source: 'Salesforce', description: 'Percentage of learners completing the full program' },
      { name: 'Content Coverage', source: 'Standards Studio', description: 'Completeness score against the Program Blueprint' },
      { name: 'Penny Quality', source: 'Penny AI', description: 'Quality of Penny interactions for this program context' },
    ],
    relationships: [
      { targetId: 'cohort',            targetName: 'Cohort',           type: 'contains',   description: 'A Program runs one or more Cohorts' },
      { targetId: 'program-blueprint', targetName: 'Program Blueprint',type: 'governs',    description: 'Program Blueprint defines the structural design standard' },
      { targetId: 'knowledge-source',  targetName: 'Knowledge Source', type: 'sources',    description: 'Program content is sourced from approved knowledge systems' },
      { targetId: 'salesforce-object', targetName: 'Salesforce Object',type: 'maps-to',    description: 'Maps to Program__c and PMM program records' },
      { targetId: 'penny-capability',  targetName: 'Penny Capability', type: 'triggers',   description: 'Program context activates specific Penny capabilities' },
      { targetId: 'decision',          targetName: 'Decision',         type: 'informs',    description: 'Organizational decisions shape program direction' },
    ],
    systems: ['Salesforce', 'Google Drive', 'Standards Studio', 'Penny AI'],
    reviewCycle: 'Per cohort + annual strategy review',
    workspaceLink: '/program',
    standards: ['Program Blueprint', 'Module Blueprint'],
    profileTabs: ['Overview', 'Cohorts', 'Curriculum', 'Standards', 'Salesforce', 'Penny', 'Decisions'],
  },
  {
    id: 'cohort', name: 'Cohort', plural: 'Cohorts', category: 'program-layer',
    purpose: 'A single delivery instance of a program. Tracks a specific group of learners through the program lifecycle, from enrollment to completion.',
    ownership: ['Program Manager', 'Coach Lead'],
    sourceOfTruth: 'Salesforce',
    lifecycle: ['Planning', 'Enrollment', 'Active', 'Sprint Review', 'Completion', 'Alumni'],
    health: [
      { name: 'Enrollment Status', source: 'Salesforce', description: 'Enrolled vs target capacity' },
      { name: 'Weekly Attendance', source: 'Salesforce', description: 'Attendance rate across sprint sessions' },
      { name: 'Completion Rate', source: 'Salesforce', description: 'Percentage completing all program milestones' },
    ],
    relationships: [
      { targetId: 'program',               targetName: 'Program',            type: 'governs',        description: 'Cohort is an instance of a Program' },
      { targetId: 'sprint',                targetName: 'Sprint',             type: 'contains',        description: 'Cohort contains ordered Sprints' },
      { targetId: 'person',                targetName: 'Person',             type: 'serves',          description: 'Cohort serves a specific group of learners' },
      { targetId: 'communication-channel', targetName: 'Communication Channel', type: 'syncs-with',  description: 'Each Cohort has dedicated Slack/Chat spaces' },
      { targetId: 'salesforce-object',     targetName: 'Salesforce Object',  type: 'maps-to',         description: 'Maps to Cohort__c and PMM Program Cohort records' },
    ],
    systems: ['Salesforce', 'Slack', 'Google Drive', 'Google Calendar'],
    reviewCycle: 'Weekly sprint reviews + post-cohort retrospective',
    workspaceLink: '/program/curriculum',
    standards: ['Program Blueprint', 'Communication Blueprint'],
    profileTabs: ['Overview', 'Sprints', 'Learners', 'Channels', 'Calendar', 'Salesforce'],
  },
  {
    id: 'sprint', name: 'Sprint', plural: 'Sprints', category: 'program-layer',
    purpose: 'A 2-week delivery unit within a cohort. The primary rhythm of content delivery, coaching, and learner engagement.',
    ownership: ['Curriculum Lead', 'Coach'],
    sourceOfTruth: 'Salesforce / LMS',
    lifecycle: ['Planning', 'Active', 'Review', 'Complete'],
    health: [
      { name: 'Content Delivery Rate', source: 'LMS', description: 'Modules and lessons delivered on schedule' },
      { name: 'Assessment Pass Rate', source: 'Salesforce', description: 'Learner assessment completion and pass rates' },
      { name: 'Engagement Score', source: 'Penny AI', description: 'Penny interaction quality and learner engagement' },
    ],
    relationships: [
      { targetId: 'cohort',   targetName: 'Cohort',   type: 'governs',  description: 'Sprint belongs to a Cohort' },
      { targetId: 'module',   targetName: 'Module',   type: 'contains', description: 'Sprint delivers ordered Modules' },
      { targetId: 'calendar', targetName: 'Calendar', type: 'syncs-with', description: 'Sprint events are scheduled via Calendar' },
    ],
    systems: ['Salesforce', 'LMS', 'Google Drive', 'Slack'],
    reviewCycle: 'Per sprint (bi-weekly)',
    workspaceLink: '/program/curriculum',
    standards: ['Module Blueprint', 'Lesson Blueprint'],
    profileTabs: ['Overview', 'Modules', 'Assessments', 'Calendar', 'Penny'],
  },
  {
    id: 'module', name: 'Module', plural: 'Modules', category: 'program-layer',
    purpose: 'A themed learning unit containing ordered lessons. The primary content grouping within a sprint.',
    ownership: ['Curriculum Designer'],
    sourceOfTruth: 'Standards Studio + Google Drive',
    lifecycle: ['Draft', 'Review', 'Approved', 'Active', 'Deprecated'],
    health: [
      { name: 'Standards Compliance', source: 'Standards Studio', description: 'Compliance with Module Blueprint standards' },
      { name: 'Content Completeness', source: 'Standards Studio', description: 'All required sections present and complete' },
      { name: 'Knowledge Coverage', source: 'Knowledge Registry', description: 'Knowledge articles properly referenced' },
    ],
    relationships: [
      { targetId: 'sprint',           targetName: 'Sprint',           type: 'governs',  description: 'Module belongs to a Sprint' },
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'contains', description: 'Module contains ordered Lessons' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',  description: 'Module Blueprint governs module design' },
      { targetId: 'knowledge-article',targetName: 'Knowledge Article',type: 'sources',  description: 'Module content draws from Knowledge Articles' },
    ],
    systems: ['Standards Studio', 'Google Drive', 'LMS'],
    reviewCycle: 'Per program iteration',
    workspaceLink: '/program/curriculum',
    standards: ['Module Blueprint', 'Lesson Blueprint'],
    profileTabs: ['Overview', 'Lessons', 'Knowledge', 'Standards', 'Penny'],
  },
  {
    id: 'lesson', name: 'Lesson', plural: 'Lessons', category: 'program-layer',
    purpose: 'A single learning activity or session. The atomic unit of curriculum content delivery.',
    ownership: ['Curriculum Designer'],
    sourceOfTruth: 'Google Drive + Standards Studio',
    lifecycle: ['Draft', 'Review', 'Approved', 'Active', 'Deprecated'],
    health: [
      { name: 'Standards Compliance', source: 'Standards Studio', description: 'Meets Lesson Blueprint requirements' },
      { name: 'Penny Asset Coverage', source: 'Penny AI', description: 'Coaching prompts and Trail Quests aligned to lesson' },
    ],
    relationships: [
      { targetId: 'module',           targetName: 'Module',           type: 'governs',  description: 'Lesson belongs to a Module' },
      { targetId: 'assessment',       targetName: 'Assessment',       type: 'contains', description: 'Lesson may include an Assessment' },
      { targetId: 'knowledge-article',targetName: 'Knowledge Article',type: 'sources',  description: 'Lesson content draws from Knowledge Articles' },
      { targetId: 'penny-capability', targetName: 'Penny Capability', type: 'triggers', description: 'Lesson context activates coaching and quest capabilities' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',  description: 'Governed by Lesson Blueprint standards' },
    ],
    systems: ['Standards Studio', 'Google Drive', 'LMS', 'Penny AI'],
    reviewCycle: 'Per program iteration',
    workspaceLink: '/program/curriculum',
    standards: ['Lesson Blueprint', 'Assessment Blueprint'],
    profileTabs: ['Overview', 'Assessments', 'Knowledge', 'Standards', 'Penny Assets'],
  },
  {
    id: 'assessment', name: 'Assessment', plural: 'Assessments', category: 'program-layer',
    purpose: 'An evaluation activity that measures learner understanding, skill, or progress at a defined point in the program.',
    ownership: ['Curriculum Designer', 'Program Director'],
    sourceOfTruth: 'Salesforce + LMS',
    lifecycle: ['Draft', 'Review', 'Active', 'Archived'],
    health: [
      { name: 'Pass Rate', source: 'Salesforce', description: 'Percentage of learners passing on first attempt' },
      { name: 'Standards Alignment', source: 'Standards Studio', description: 'Compliance with Assessment Blueprint' },
      { name: 'Completion Rate', source: 'LMS', description: 'Learner completion rate before sprint deadline' },
    ],
    relationships: [
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'governs',  description: 'Assessment evaluates lesson content' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',  description: 'Assessment Blueprint governs design' },
      { targetId: 'salesforce-object',targetName: 'Salesforce Object',type: 'maps-to',  description: 'Maps to Assessment__c records' },
      { targetId: 'knowledge-article',targetName: 'Knowledge Article',type: 'sources',  description: 'Questions draw from Knowledge Articles' },
    ],
    systems: ['Salesforce', 'LMS', 'Standards Studio'],
    reviewCycle: 'Per program iteration',
    workspaceLink: '/program/curriculum',
    standards: ['Assessment Blueprint'],
    profileTabs: ['Overview', 'Questions', 'Results', 'Standards', 'Salesforce'],
  },

  // ── Knowledge Layer ────────────────────────────────────────────────────────
  {
    id: 'knowledge-source', name: 'Knowledge Source', plural: 'Knowledge Sources', category: 'knowledge-layer',
    purpose: 'An approved authoritative source that Penny AI may reference when generating responses. Governed for trust, accuracy, and relevance.',
    ownership: ['Knowledge Manager', 'Standards Lead'],
    sourceOfTruth: 'Knowledge Source Registry',
    lifecycle: ['Proposed', 'Under Review', 'Approved', 'Active', 'Deprecated'],
    health: [
      { name: 'Penny Approval', source: 'Knowledge Registry', description: 'Whether Penny is cleared to use this source' },
      { name: 'Trust Level', source: 'Knowledge Registry', description: 'Organizational trust rating: Authoritative → Supplemental' },
      { name: 'Sync Status', source: 'Integration Layer', description: 'Real-time sync health with the source system' },
    ],
    relationships: [
      { targetId: 'knowledge-article', targetName: 'Knowledge Article',  type: 'contains',  description: 'Source contains Knowledge Articles' },
      { targetId: 'prompt-template',   targetName: 'Prompt Template',    type: 'governs',   description: 'Sources are referenced within prompt templates' },
      { targetId: 'penny-capability',  targetName: 'Penny Capability',   type: 'depends-on',description: 'Penny capabilities depend on approved sources' },
      { targetId: 'salesforce-object', targetName: 'Salesforce Object',  type: 'syncs-with',description: 'Some sources sync from Salesforce records' },
      { targetId: 'decision',          targetName: 'Decision',           type: 'informs',   description: 'Source governance decisions tracked in Org Memory' },
    ],
    systems: ['Knowledge Source Registry', 'Salesforce', 'Google Drive', 'LMS'],
    reviewCycle: 'Quarterly + on source change',
    workspaceLink: '/knowledge',
    standards: ['Knowledge Blueprint'],
    profileTabs: ['Overview', 'Articles', 'Penny Usage', 'Governance', 'Decisions'],
  },
  {
    id: 'knowledge-article', name: 'Knowledge Article', plural: 'Knowledge Articles', category: 'knowledge-layer',
    purpose: 'A discrete piece of curated content linked to a knowledge source. Used in curriculum, referenced by Penny, and stored in Salesforce Knowledge__c or Google Drive.',
    ownership: ['Content Author', 'Curriculum Designer'],
    sourceOfTruth: 'Google Drive + Salesforce Knowledge__c',
    lifecycle: ['Draft', 'Review', 'Published', 'Archived'],
    health: [
      { name: 'Review Currency', source: 'Standards Studio', description: 'Age since last content review' },
      { name: 'Usage Rate', source: 'LMS', description: 'How often referenced in lessons and modules' },
    ],
    relationships: [
      { targetId: 'knowledge-source', targetName: 'Knowledge Source', type: 'governs',  description: 'Article belongs to a Knowledge Source' },
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'serves',   description: 'Article content powers lessons' },
      { targetId: 'module',           targetName: 'Module',           type: 'serves',   description: 'Article content powers modules' },
      { targetId: 'salesforce-object',targetName: 'Salesforce Object',type: 'maps-to',  description: 'Maps to Salesforce Knowledge__c articles' },
    ],
    systems: ['Google Drive', 'Salesforce', 'LMS'],
    reviewCycle: 'Quarterly + on program change',
    workspaceLink: '/knowledge/library',
    standards: ['Knowledge Blueprint'],
    profileTabs: ['Overview', 'Used In', 'Salesforce', 'History'],
  },
  {
    id: 'standard', name: 'Standard', plural: 'Standards', category: 'knowledge-layer',
    purpose: 'A design rule, quality requirement, or pattern that governs how Trail OS objects are created, structured, and maintained.',
    ownership: ['Standards Lead', 'Program Director'],
    sourceOfTruth: 'Standards Studio',
    lifecycle: ['Proposed', 'Draft', 'Active', 'Deprecated'],
    health: [
      { name: 'Compliance Rate', source: 'Standards Studio', description: 'Percentage of governed objects meeting the standard' },
      { name: 'Coverage', source: 'Standards Studio', description: 'Object types covered by this standard' },
    ],
    relationships: [
      { targetId: 'module',           targetName: 'Module',           type: 'governs', description: 'Module Blueprint standards govern module design' },
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'governs', description: 'Lesson Blueprint standards govern lesson design' },
      { targetId: 'assessment',       targetName: 'Assessment',       type: 'governs', description: 'Assessment Blueprint governs evaluation design' },
      { targetId: 'prompt-template',  targetName: 'Prompt Template',  type: 'governs', description: 'Prompt standards govern Penny template quality' },
      { targetId: 'program-blueprint',targetName: 'Program Blueprint',type: 'governs', description: 'Program Blueprint contains design standards' },
    ],
    systems: ['Standards Studio'],
    reviewCycle: 'Annual + on object change',
    workspaceLink: '/program/standards',
    standards: [],
    profileTabs: ['Overview', 'Governed Objects', 'Compliance', 'History'],
  },
  {
    id: 'program-blueprint', name: 'Program Blueprint', plural: 'Program Blueprints', category: 'knowledge-layer',
    purpose: 'A structural design template defining what a program must contain, how it should be delivered, and what quality standards it must meet. The architectural specification for a program type.',
    ownership: ['Program Director', 'Standards Lead'],
    sourceOfTruth: 'Standards Studio',
    lifecycle: ['Draft', 'Review', 'Active', 'Deprecated'],
    health: [
      { name: 'Program Compliance', source: 'Standards Studio', description: 'Programs correctly implementing this blueprint' },
      { name: 'Currency', source: 'Standards Studio', description: 'Time since last update relative to review cycle' },
    ],
    relationships: [
      { targetId: 'program',  targetName: 'Program',  type: 'governs',  description: 'Blueprint defines the program\'s structural requirements' },
      { targetId: 'standard', targetName: 'Standard', type: 'contains', description: 'Blueprint references applicable design standards' },
    ],
    systems: ['Standards Studio', 'Google Drive'],
    reviewCycle: 'Annual + on program evolution',
    workspaceLink: '/program/blueprint',
    standards: [],
    profileTabs: ['Overview', 'Programs Using This', 'Standards', 'History', 'Decisions'],
  },

  // ── Intelligence Layer ─────────────────────────────────────────────────────
  {
    id: 'penny-capability', name: 'Penny Capability', plural: 'Penny Capabilities', category: 'intelligence-layer',
    purpose: 'A defined, governed AI capability that Penny can perform — coaching, summarizing, generating, evaluating, or routing. The building block of Penny\'s intelligence.',
    ownership: ['Penny Lead', 'Standards Lead'],
    sourceOfTruth: 'Penny Capability Registry',
    lifecycle: ['Proposed', 'POC', 'Approved', 'Active', 'Deprecated'],
    health: [
      { name: 'Quality Score', source: 'Penny AI', description: 'Rolling quality review score from governance process' },
      { name: 'Hallucination Rate', source: 'Penny AI', description: 'Rate of factual inaccuracies detected in outputs' },
      { name: 'Usage Rate', source: 'Penny AI', description: 'Frequency of capability activation across programs' },
    ],
    relationships: [
      { targetId: 'prompt-template',  targetName: 'Prompt Template',  type: 'depends-on', description: 'Capability is implemented via governed prompt templates' },
      { targetId: 'knowledge-source', targetName: 'Knowledge Source', type: 'depends-on', description: 'Capability draws only from approved knowledge sources' },
      { targetId: 'person',           targetName: 'Person',           type: 'serves',     description: 'Capability serves learners, coaches, and staff' },
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'triggers',   description: 'Lesson context activates the capability' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',    description: 'Penny Blueprint standards govern all capabilities' },
    ],
    systems: ['Penny AI', 'Knowledge Source Registry', 'Salesforce', 'Prompt Studio'],
    reviewCycle: 'Quarterly quality review',
    workspaceLink: '/penny',
    standards: ['Penny Blueprint'],
    profileTabs: ['Overview', 'Prompt Templates', 'Knowledge Sources', 'Quality', 'Governance', 'Usage'],
  },
  {
    id: 'prompt-template', name: 'Prompt Template', plural: 'Prompt Templates', category: 'intelligence-layer',
    purpose: 'A governed, versioned prompt that implements a specific Penny capability for a defined use case. The executable specification of how Penny communicates.',
    ownership: ['Penny Lead', 'Curriculum Designer'],
    sourceOfTruth: 'Penny Prompt Studio',
    lifecycle: ['Draft', 'Review', 'Approved', 'Active', 'Deprecated'],
    health: [
      { name: 'Quality Review Score', source: 'Prompt Studio', description: 'Score from the most recent quality review cycle' },
      { name: 'Hallucination Risk', source: 'Prompt Studio', description: 'Assessed risk level: Low / Medium / High' },
      { name: 'Knowledge Source Coverage', source: 'Knowledge Registry', description: 'All required source IDs are approved and active' },
    ],
    relationships: [
      { targetId: 'penny-capability', targetName: 'Penny Capability', type: 'governs',    description: 'Template implements a specific Penny capability' },
      { targetId: 'knowledge-source', targetName: 'Knowledge Source', type: 'depends-on', description: 'Template references approved knowledge sources' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',    description: 'Prompt standards govern template quality' },
      { targetId: 'salesforce-object',targetName: 'Salesforce Object',type: 'sources',    description: 'Template variables sourced from Salesforce records' },
    ],
    systems: ['Penny Prompt Studio', 'Knowledge Source Registry', 'Salesforce'],
    reviewCycle: 'Quarterly + on knowledge source change',
    workspaceLink: '/penny/prompts',
    standards: ['Penny Blueprint'],
    profileTabs: ['Overview', 'Variables', 'Knowledge Sources', 'Quality Reviews', 'Version History'],
  },

  // ── People Layer ───────────────────────────────────────────────────────────
  {
    id: 'person', name: 'Person', plural: 'People', category: 'people-layer',
    purpose: 'A human who interacts with Trail OS — a learner, coach, employer partner, staff member, or volunteer. The central human unit of the platform.',
    ownership: ['Program Manager', 'Administration'],
    sourceOfTruth: 'Salesforce (Contact / Lead)',
    lifecycle: ['Prospect', 'Enrolled', 'Active Learner', 'Alumni', 'Inactive'],
    health: [
      { name: 'Engagement Rate', source: 'Salesforce', description: 'Activity and interaction frequency' },
      { name: 'Progress Rate', source: 'Salesforce', description: 'Progression through program milestones' },
      { name: 'Penny Interaction Quality', source: 'Penny AI', description: 'Quality and frequency of Penny interactions' },
    ],
    relationships: [
      { targetId: 'cohort',                targetName: 'Cohort',                type: 'participates-in', description: 'Person is enrolled in one or more Cohorts' },
      { targetId: 'role',                  targetName: 'Role',                  type: 'governs',         description: 'Person has one or more defined Roles' },
      { targetId: 'penny-capability',      targetName: 'Penny Capability',      type: 'serves',          description: 'Penny serves the person based on their role and context' },
      { targetId: 'communication-channel', targetName: 'Communication Channel', type: 'participates-in', description: 'Person is a member of relevant channels and spaces' },
      { targetId: 'salesforce-object',     targetName: 'Salesforce Object',     type: 'maps-to',         description: 'Maps to Salesforce Contact and Lead records' },
    ],
    systems: ['Salesforce', 'Slack', 'Google Drive', 'Google Calendar'],
    reviewCycle: 'Per cohort enrollment + alumni follow-up',
    workspaceLink: '/digital-twin/people',
    standards: ['Communication Blueprint'],
    profileTabs: ['Overview', 'Roles', 'Programs', 'Penny', 'Channels', 'Salesforce'],
  },
  {
    id: 'role', name: 'Role', plural: 'Roles', category: 'people-layer',
    purpose: 'A defined organizational function with specific responsibilities, permissions, and participation patterns. The building block of the People & Roles model.',
    ownership: ['Administration', 'Program Director'],
    sourceOfTruth: 'Administration',
    lifecycle: ['Proposed', 'Active', 'Deprecated'],
    health: [
      { name: 'Coverage Rate', source: 'Administration', description: 'Percentage of active role slots filled' },
      { name: 'Blueprint Compliance', source: 'Standards Studio', description: 'Role meets its blueprint requirements' },
      { name: 'Responsibility Clarity', source: 'Administration', description: 'All responsibilities documented and owned' },
    ],
    relationships: [
      { targetId: 'person',           targetName: 'Person',           type: 'serves',   description: 'Role is assigned to one or more Persons' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'governs',  description: 'Role Blueprint defines role design standards' },
      { targetId: 'salesforce-object',targetName: 'Salesforce Object',type: 'maps-to',  description: 'Maps to Salesforce Profile and Permission Set records' },
    ],
    systems: ['Administration', 'Salesforce', 'Slack'],
    reviewCycle: 'Annual + on program evolution',
    workspaceLink: '/digital-twin/people',
    standards: ['Role Blueprint'],
    profileTabs: ['Overview', 'People', 'Responsibilities', 'Blueprints', 'Programs', 'Salesforce'],
  },

  // ── Infrastructure Layer ───────────────────────────────────────────────────
  {
    id: 'communication-channel', name: 'Communication Channel', plural: 'Communication Channels', category: 'infrastructure-layer',
    purpose: 'A platform channel or space (Slack channel, Google Chat space) used to deliver program content, coaching, and organizational communication.',
    ownership: ['Communications Lead', 'Program Manager'],
    sourceOfTruth: 'Collaboration Hub',
    lifecycle: ['Planning', 'Active', 'Archived'],
    health: [
      { name: 'Readiness Status', source: 'Collaboration Hub', description: 'Channel created and configured correctly' },
      { name: 'Membership Completeness', source: 'Collaboration Hub', description: 'All required members and roles assigned' },
      { name: 'Template Coverage', source: 'Collaboration Hub', description: 'Message templates available for common scenarios' },
    ],
    relationships: [
      { targetId: 'cohort',           targetName: 'Cohort',           type: 'serves',     description: 'Dedicated channel for each active cohort' },
      { targetId: 'role',             targetName: 'Role',             type: 'serves',     description: 'Role-based channels for coaches, staff, alumni' },
      { targetId: 'penny-capability', targetName: 'Penny Capability', type: 'triggers',   description: 'Penny broadcasts are delivered via channels' },
      { targetId: 'calendar',         targetName: 'Calendar',         type: 'syncs-with', description: 'Calendar events trigger channel notifications' },
    ],
    systems: ['Slack', 'Google Chat', 'Google Calendar'],
    reviewCycle: 'Per cohort + quarterly audit',
    workspaceLink: '/collaboration/channels',
    standards: ['Communication Blueprint'],
    profileTabs: ['Overview', 'Members', 'Penny Broadcasts', 'Templates', 'Calendar'],
  },
  {
    id: 'calendar', name: 'Calendar', plural: 'Calendars', category: 'infrastructure-layer',
    purpose: 'A schedule of program events, office hours, deadlines, and activities. Coordinates the timing of delivery across cohorts, roles, and channels.',
    ownership: ['Program Manager', 'Coach'],
    sourceOfTruth: 'Google Calendar',
    lifecycle: ['Draft', 'Published', 'Active', 'Archived'],
    health: [
      { name: 'Event Coverage', source: 'Google Calendar', description: 'All required sprint events and milestones scheduled' },
      { name: 'Integration Status', source: 'Integration Layer', description: 'Calendar sync with Salesforce and Slack operational' },
    ],
    relationships: [
      { targetId: 'sprint',                targetName: 'Sprint',                type: 'syncs-with', description: 'Sprint events are scheduled via Calendar' },
      { targetId: 'cohort',                targetName: 'Cohort',                type: 'serves',     description: 'Calendar serves a specific cohort timeline' },
      { targetId: 'communication-channel', targetName: 'Communication Channel', type: 'syncs-with', description: 'Calendar events trigger channel reminders' },
      { targetId: 'salesforce-object',     targetName: 'Salesforce Object',     type: 'syncs-with', description: 'Events sync with Salesforce Activity records' },
    ],
    systems: ['Google Calendar', 'Salesforce', 'Slack'],
    reviewCycle: 'Per cohort sprint',
    workspaceLink: '/collaboration/calendar',
    standards: ['Communication Blueprint'],
    profileTabs: ['Overview', 'Events', 'Cohorts', 'Integration Status'],
  },
  {
    id: 'google-drive-resource', name: 'Google Drive Resource', plural: 'Google Drive Resources', category: 'infrastructure-layer',
    purpose: 'A file, folder, or structured workspace in Google Drive that stores program content, curriculum assets, or organizational documents.',
    ownership: ['Program Manager', 'Curriculum Designer'],
    sourceOfTruth: 'Google Drive',
    lifecycle: ['Created', 'Active', 'Archived'],
    health: [
      { name: 'Organization Score', source: 'Google Drive', description: 'Folder structure follows the program resource standard' },
      { name: 'Access Control', source: 'Google Drive', description: 'Permissions correctly set for roles and cohorts' },
      { name: 'Salesforce Link', source: 'Salesforce', description: 'Drive resource correctly linked to Salesforce records' },
    ],
    relationships: [
      { targetId: 'lesson',           targetName: 'Lesson',           type: 'contains',  description: 'Drive contains lesson materials and activities' },
      { targetId: 'module',           targetName: 'Module',           type: 'contains',  description: 'Drive stores module content and assets' },
      { targetId: 'knowledge-article',targetName: 'Knowledge Article',type: 'contains',  description: 'Drive stores knowledge article source documents' },
      { targetId: 'knowledge-source', targetName: 'Knowledge Source', type: 'sources',   description: 'Drive folder is registered as a knowledge source' },
      { targetId: 'salesforce-object',targetName: 'Salesforce Object',type: 'syncs-with',description: 'Drive links stored in Salesforce program records' },
    ],
    systems: ['Google Drive', 'Salesforce'],
    reviewCycle: 'Per program iteration',
    workspaceLink: '/program/resources',
    standards: ['Knowledge Blueprint'],
    profileTabs: ['Overview', 'Contents', 'Linked Records', 'Access Control'],
  },
  {
    id: 'salesforce-object', name: 'Salesforce Object', plural: 'Salesforce Objects', category: 'infrastructure-layer',
    purpose: 'A Salesforce data entity (standard or custom) that records organizational data about programs, people, assessments, or outcomes. The primary system of record for Trail OS.',
    ownership: ['Salesforce Admin', 'Program Director'],
    sourceOfTruth: 'Salesforce',
    lifecycle: ['Active', 'Deprecated'],
    health: [
      { name: 'Data Completeness', source: 'Salesforce', description: 'Required fields populated across all records' },
      { name: 'Relationship Integrity', source: 'Salesforce', description: 'Object relationships and lookups correctly configured' },
      { name: 'Access Control', source: 'Salesforce', description: 'Field- and record-level security correctly set' },
    ],
    relationships: [
      { targetId: 'program',  targetName: 'Program',  type: 'contains', description: 'Records Program delivery data' },
      { targetId: 'cohort',   targetName: 'Cohort',   type: 'contains', description: 'Records Cohort enrollment and progress' },
      { targetId: 'person',   targetName: 'Person',   type: 'contains', description: 'Records learner and staff contact data' },
      { targetId: 'integration', targetName: 'Integration', type: 'syncs-with', description: 'Salesforce data flows through integration layer' },
    ],
    systems: ['Salesforce'],
    reviewCycle: 'Quarterly data quality review',
    workspaceLink: '/program/salesforce',
    standards: ['Program Blueprint'],
    profileTabs: ['Overview', 'Fields', 'Relationships', 'Security', 'Integrations'],
  },
  {
    id: 'integration', name: 'Integration', plural: 'Integrations', category: 'infrastructure-layer',
    purpose: 'A planned or active connection between Trail OS (Salesforce) and an external platform — Google Drive, LMS, Slack, Calendar, or Agentforce.',
    ownership: ['Operations Lead', 'Salesforce Admin'],
    sourceOfTruth: 'Integration Readiness Center (Operations)',
    lifecycle: ['Planned', 'In Assessment', 'In Development', 'Active', 'Deprecated'],
    health: [
      { name: 'Readiness Score', source: 'Operations Hub', description: 'Overall integration readiness across all checks' },
      { name: 'Risk Level', source: 'Operations Hub', description: 'Current risk assessment: Critical / High / Medium / Low' },
      { name: 'Owner Assigned', source: 'Operations Hub', description: 'Named owner accountable for the integration' },
    ],
    relationships: [
      { targetId: 'salesforce-object',     targetName: 'Salesforce Object',     type: 'syncs-with', description: 'Integration connects to Salesforce objects' },
      { targetId: 'communication-channel', targetName: 'Communication Channel', type: 'syncs-with', description: 'Slack / Google Chat integrations connect channels' },
      { targetId: 'google-drive-resource', targetName: 'Google Drive Resource', type: 'syncs-with', description: 'Drive integration connects program file structures' },
      { targetId: 'penny-capability',      targetName: 'Penny Capability',      type: 'depends-on', description: 'Some Penny capabilities depend on active integrations' },
    ],
    systems: ['Operations Hub', 'Salesforce', 'Google Drive', 'Slack', 'LMS', 'Agentforce'],
    reviewCycle: 'Quarterly + on platform change',
    workspaceLink: '/operations/integrations',
    standards: [],
    profileTabs: ['Overview', 'Readiness Checks', 'Field Mappings', 'Risks', 'Data Flow', 'Timeline'],
  },

  // ── Governance Layer ───────────────────────────────────────────────────────
  {
    id: 'decision', name: 'Decision', plural: 'Decisions', category: 'governance-layer',
    purpose: 'A documented organizational decision — capturing not only what was decided, but why, by whom, what the impact is, and when it should be reviewed. The core record of Organizational Memory.',
    ownership: ['Program Director', 'Administration'],
    sourceOfTruth: 'Organizational Memory (Knowledge Hub)',
    lifecycle: ['Open', 'Decided', 'Documented', 'Under Review', 'Closed'],
    health: [
      { name: 'Documentation Status', source: 'Org Memory', description: 'Rationale, owner, and impact fully documented' },
      { name: 'Review Currency', source: 'Org Memory', description: 'Time elapsed since last review relative to review date' },
      { name: 'Impact Coverage', source: 'Org Memory', description: 'All affected objects and systems documented' },
    ],
    relationships: [
      { targetId: 'program',          targetName: 'Program',          type: 'informs',  description: 'Decisions shape program design and direction' },
      { targetId: 'standard',         targetName: 'Standard',         type: 'informs',  description: 'Decisions drive standard creation and updates' },
      { targetId: 'knowledge-source', targetName: 'Knowledge Source', type: 'informs',  description: 'Source governance decisions tracked here' },
      { targetId: 'integration',      targetName: 'Integration',      type: 'informs',  description: 'Integration strategy decisions preserved here' },
      { targetId: 'role',             targetName: 'Role',             type: 'informs',  description: 'Organizational structure decisions captured here' },
    ],
    systems: ['Organizational Memory', 'Knowledge Source Registry'],
    reviewCycle: 'Per decision review date (set at time of decision)',
    workspaceLink: '/knowledge/memory',
    standards: [],
    profileTabs: ['Overview', 'Rationale', 'Impact', 'Related Objects', 'History'],
  },
];

// ── Helper lookups ─────────────────────────────────────────────────────────
export const OBJECT_MAP = Object.fromEntries(OBJECT_TYPES.map(o => [o.id, o]));

export const OBJECTS_BY_CATEGORY = OBJECT_CATEGORIES.map(cat => ({
  ...cat,
  objects: OBJECT_TYPES.filter(o => o.category === cat.id),
}));

// Source of truth registry
export const SOURCE_OF_TRUTH_SYSTEMS = [
  'Salesforce', 'Standards Studio', 'Knowledge Source Registry', 'Penny Capability Registry',
  'Penny Prompt Studio', 'Collaboration Hub', 'Google Drive', 'Google Calendar',
  'Integration Readiness Center', 'Administration', 'Organizational Memory',
];

// Relationship pairs for the matrix
export interface MatrixEntry {
  fromId: string;
  toId: string;
  type: RelType;
}
export const RELATIONSHIP_MATRIX: MatrixEntry[] = OBJECT_TYPES.flatMap(obj =>
  obj.relationships.map(r => ({ fromId: obj.id, toId: r.targetId, type: r.type }))
);
