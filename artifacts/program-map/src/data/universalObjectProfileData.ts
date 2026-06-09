// Universal Object Profile — concrete instance data
// Each profile is a real-world example of a UOM object type fully documented.

export type ProfileHealthStatus = 'healthy' | 'needs-attention' | 'incomplete' | 'unknown';
export type ComplianceStatus    = 'compliant' | 'partial' | 'non-compliant' | 'not-assessed';
export type ActivityType        = 'decision' | 'review' | 'change' | 'health-event' | 'update';

export interface ProfileRelationship {
  objectTypeId: string;
  objectTypeName: string;
  objectName: string;
  direction: 'upstream' | 'downstream';
  relationshipType: string;
  profileId?: string;
}

export interface ProfileHealthIndicator {
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  source: string;
  note?: string;
}

export interface StandardCompliance {
  blueprintName: string;
  compliance: ComplianceStatus;
  gaps: string[];
  lastReviewed?: string;
  notes?: string;
}

export interface ObjectProfile {
  id: string;
  objectTypeId: string;
  objectTypeName: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  name: string;
  status: string;
  statusVariant: 'active' | 'inactive' | 'draft' | 'planning';
  description: string;
  confidence: number;
  workspaceLink: string;
  overview: {
    purpose: string;
    keyFacts: { label: string; value: string }[];
  };
  relationships: ProfileRelationship[];
  ownership: {
    primary: string;
    secondary?: string;
    team: string;
    reviewCycle: string;
    accountabilityGaps: string[];
  };
  health: {
    overall: ProfileHealthStatus;
    summary: string;
    indicators: ProfileHealthIndicator[];
    lastChecked: string;
  };
  history: {
    decisions: { date: string; title: string; description: string; impact: string }[];
    changes: { date: string; type: string; description: string; by: string }[];
    lessonsLearned: string[];
    orgMemoryNote?: string;
  };
  standards: StandardCompliance[];
  knowledge: {
    sources: { name: string; trustLevel: string; pennyApproved: boolean }[];
    articles: { title: string; type: string; location: string }[];
    driveResources: { name: string; type: 'folder' | 'document' | 'sheet'; }[];
    sourceGovernance: string;
  };
  penny: {
    capabilities: { name: string; status: string; quality: string; description: string }[];
    promptTemplates: { name: string; version: string; status: string }[];
    contentAssistant: string[];
    futureServices: string[];
  };
  systems: {
    salesforce: { object: string; fields: string[]; note?: string }[];
    googleDrive: { name: string; path: string }[];
    slack: { name: string; type: string }[];
    googleCalendar: string[];
    lms: string[];
    assessments: string[];
    other: { name: string; details: string }[];
  };
  activity: { date: string; type: ActivityType; title: string; by: string; detail?: string }[];
}

// ── 6 Example Profiles ────────────────────────────────────────────────────────

export const PROFILES: ObjectProfile[] = [
  // ── 1. Foundations Trail (Program) ──────────────────────────────────────────
  {
    id: 'foundations-trail',
    objectTypeId: 'program', objectTypeName: 'Program',
    category: 'Program Layer', categoryColor: 'text-emerald-700', categoryBg: 'bg-emerald-50 border-emerald-200',
    name: 'Foundations Trail', status: 'Active', statusVariant: 'active',
    description: 'An 8-week foundational program for career changers. Covers resume, LinkedIn, interview skills, and job search strategy through cohort-based sprints with Penny coaching.',
    confidence: 91,
    workspaceLink: '/program',
    overview: {
      purpose: 'Equip adult learners with the foundational career-change skills and job-search confidence to transition into their target industry within 6 months of graduation.',
      keyFacts: [
        { label: 'Duration',      value: '8 weeks (4 sprints × 2 weeks)' },
        { label: 'Cohort Size',   value: 'Up to 15 learners' },
        { label: 'Active Cohort', value: 'Cohort 2 — Week 6 of 8' },
        { label: 'Next Cohort',   value: 'Cohort 3 — Q3 2025 (Planning)' },
        { label: 'Total Learners',value: '34 (across 2 cohorts)' },
        { label: 'Format',        value: 'Cohort-based, async + live sessions' },
      ],
    },
    relationships: [
      { objectTypeId: 'cohort',            objectTypeName: 'Cohort',            objectName: 'Foundations Trail Cohort 2',       direction: 'downstream', relationshipType: 'contains',  profileId: undefined },
      { objectTypeId: 'cohort',            objectTypeName: 'Cohort',            objectName: 'Foundations Trail Cohort 1 (Alumni)',direction: 'downstream',relationshipType: 'contains',  profileId: undefined },
      { objectTypeId: 'program-blueprint', objectTypeName: 'Program Blueprint', objectName: 'Program Blueprint v2',              direction: 'upstream',   relationshipType: 'governs',   profileId: 'program-blueprint-v2' },
      { objectTypeId: 'salesforce-object', objectTypeName: 'Salesforce Object', objectName: 'Program Engagement (SF Object)',    direction: 'downstream', relationshipType: 'maps-to',   profileId: 'sf-program-engagement' },
      { objectTypeId: 'penny-capability',  objectTypeName: 'Penny Capability',  objectName: 'Learning Coach',                   direction: 'downstream', relationshipType: 'triggers',  profileId: undefined },
      { objectTypeId: 'penny-capability',  objectTypeName: 'Penny Capability',  objectName: 'Resume Review',                    direction: 'downstream', relationshipType: 'triggers',  profileId: 'resume-review-capability' },
      { objectTypeId: 'google-drive-resource', objectTypeName: 'Google Drive Resource', objectName: 'Foundations Trail Drive Folder', direction: 'downstream', relationshipType: 'sources', profileId: 'foundations-trail-drive' },
      { objectTypeId: 'person',            objectTypeName: 'Person',            objectName: 'Enrolled Learners (14 active)',     direction: 'downstream', relationshipType: 'serves',    profileId: undefined },
    ],
    ownership: {
      primary: 'Program Director', secondary: 'Curriculum Lead',
      team: 'Program Delivery Team',
      reviewCycle: 'Per cohort retrospective + annual strategy review',
      accountabilityGaps: ['Cohort 3 capacity decision not formally documented', 'No named backup owner if Program Director is unavailable'],
    },
    health: {
      overall: 'healthy', lastChecked: 'Jun 2025',
      summary: 'Foundations Trail is tracking well. Cohort 2 Week 6 is on schedule, content coverage is high, and Penny quality is above threshold.',
      indicators: [
        { name: 'Enrollment Rate',    value: '89% (13 of 15)',  status: 'healthy', source: 'Salesforce', note: 'Cohort 2 — 2 spots unfilled' },
        { name: 'Completion Rate',    value: '94% (prev cohort)',status:'healthy',  source: 'Salesforce', note: 'Cohort 1 final metric' },
        { name: 'Content Coverage',   value: '97%',             status: 'healthy', source: 'Standards Studio' },
        { name: 'Sprint Delivery',    value: 'On track',        status: 'healthy', source: 'Salesforce' },
        { name: 'Penny Quality',      value: '87/100',          status: 'healthy', source: 'Penny AI',   note: 'Above 80 threshold' },
        { name: 'Blueprint Compliance',value: 'Compliant',      status: 'healthy', source: 'Standards Studio' },
      ],
    },
    history: {
      decisions: [
        { date: 'Jan 2025', title: 'Adopt Sprint Structure', description: 'Moved from milestone-based to 2-week sprint delivery to align with Program Blueprint v2.', impact: 'All Foundations Trail curriculum reordered into 4 sprints.' },
        { date: 'Mar 2025', title: 'Add Penny Learning Coach', description: 'Integrated Penny AI Learning Coach capability into Cohort 2 onboarding and weekly touchpoints.', impact: 'Penny now active for all Cohort 2 learners from Week 1.' },
        { date: 'May 2025', title: 'Cohort 3 Approval', description: 'Cohort 3 approved for Q3 2025 start with same 15-person capacity.', impact: 'Program Manager begins Cohort 3 Salesforce record setup and Drive structure.' },
      ],
      changes: [
        { date: 'Jun 2025', type: 'Content Update',    description: 'Sprint 3 LinkedIn module updated to reflect 2025 algorithm changes.',          by: 'Curriculum Lead' },
        { date: 'May 2025', type: 'Structure Update',  description: 'Added Penny Trail Quest for Interview Prep to Sprint 4.',                       by: 'Penny Lead' },
        { date: 'Apr 2025', type: 'Cohort Milestone',  description: 'Cohort 1 completed — 16 of 17 learners graduated (94% completion).',            by: 'Program Director' },
      ],
      lessonsLearned: [
        'Learners benefit from Penny prompts in the first 48 hours of a new sprint — set this as a standard trigger.',
        'Drive folder structure needs to be set up before cohort starts, not after — add to Cohort Setup checklist.',
        'Sprint 2 has historically highest dropout risk — add targeted Penny check-in at Sprint 2 Week 1.',
      ],
      orgMemoryNote: 'Full decision log maintained in Org Memory. Contact Program Director for historical context before Cohort 1.',
    },
    standards: [
      { blueprintName: 'Program Blueprint v2', compliance: 'compliant',  gaps: [],                                                      lastReviewed: 'Mar 2025', notes: 'Fully compliant including Sprint structure and Penny integration requirements.' },
      { blueprintName: 'Module Blueprint',     compliance: 'compliant',  gaps: [],                                                      lastReviewed: 'Mar 2025' },
      { blueprintName: 'Communication Blueprint', compliance: 'partial', gaps: ['Slack channel naming convention not fully applied for Cohort 3 pre-setup'], lastReviewed: 'Feb 2025' },
    ],
    knowledge: {
      sources: [
        { name: 'Foundations Trail Salesforce KB', trustLevel: 'Authoritative', pennyApproved: true },
        { name: 'Resume Writing Guide',            trustLevel: 'Authoritative', pennyApproved: true },
        { name: 'Interview Prep Library',          trustLevel: 'Supplemental',  pennyApproved: true },
        { name: 'LinkedIn Strategy Guide',         trustLevel: 'Supplemental',  pennyApproved: false },
      ],
      articles: [
        { title: 'Foundations Trail Program Overview',    type: 'Program Doc', location: 'Google Drive' },
        { title: 'Sprint 1–4 Facilitator Guides',        type: 'Curriculum',  location: 'Google Drive' },
        { title: 'Cohort 1 Retrospective Findings',      type: 'Review Doc',  location: 'Google Drive' },
      ],
      driveResources: [
        { name: 'Foundations Trail Root Folder',   type: 'folder' },
        { name: 'Sprint Archives',                 type: 'folder' },
        { name: 'Cohort 2 Materials',              type: 'folder' },
        { name: 'Program One-Pager',               type: 'document' },
      ],
      sourceGovernance: 'All sources reviewed quarterly. Penny-approved sources must pass trust review by Knowledge Manager before activation.',
    },
    penny: {
      capabilities: [
        { name: 'Learning Coach',        status: 'Active', quality: '89/100', description: 'Weekly coaching nudges, reflection prompts, and sprint check-ins for enrolled learners.' },
        { name: 'Resume Review',         status: 'Active', quality: '87/100', description: 'Reviews learner resume drafts and provides structured feedback in Sprint 3.' },
        { name: 'Trail Quest Runner',    status: 'Active', quality: '84/100', description: 'Delivers Sprint-specific Trail Quests and tracks completion.' },
        { name: 'Weekly Brief Generator',status: 'Active', quality: '91/100', description: 'Generates weekly program brief for Program Director and coaches.' },
      ],
      promptTemplates: [
        { name: 'Learning Coach Sprint Check-in',  version: 'v1.3', status: 'Approved' },
        { name: 'Resume Review Prompt',            version: 'v2.1', status: 'Approved' },
        { name: 'Weekly Brief Generator',          version: 'v1.0', status: 'Approved' },
        { name: 'Trail Quest — Sprint 3',          version: 'v1.1', status: 'Approved' },
      ],
      contentAssistant: ['Draft sprint facilitator notes', 'Generate learner progress summary', 'Identify at-risk learners from cohort data', 'Suggest Sprint 4 content updates'],
      futureServices: ['Employer matching (Q4 2025)', 'Automated alumni check-in (Q4 2025)', 'Cross-program pathway recommendations (2026)'],
    },
    systems: {
      salesforce: [
        { object: 'Program__c',            fields: ['Name', 'Status__c', 'Capacity__c', 'Start_Date__c', 'Program_Director__c'] },
        { object: 'Program_Engagement__c', fields: ['Contact__c', 'Program__c', 'Cohort__c', 'Stage__c', 'Health_Score__c'] },
        { object: 'Task',                  fields: ['Subject', 'WhoId', 'Status', 'ActivityDate'], note: 'Penny interaction records' },
      ],
      googleDrive: [
        { name: 'Foundations Trail',          path: '/Program Delivery/Foundations Trail' },
        { name: 'Sprint Archives',            path: '/Program Delivery/Foundations Trail/Sprint Archives' },
        { name: 'Cohort 2 Materials',         path: '/Program Delivery/Foundations Trail/Cohort 2' },
      ],
      slack: [
        { name: '#foundations-cohort-2',      type: 'Learner cohort channel' },
        { name: '#foundations-coaches',       type: 'Coach coordination' },
        { name: '#penny-foundations',         type: 'Penny activity log' },
      ],
      googleCalendar: ['Foundations Trail Cohort 2 — Sprint Calendar', 'Foundations Trail Office Hours'],
      lms: ['Foundations Trail Course (planned Q3)'],
      assessments: ['Sprint 2 Assessment', 'Sprint 4 Final Assessment'],
      other: [],
    },
    activity: [
      { date: 'Jun 9 2025',  type: 'update',      title: 'Cohort 2 — Sprint 3 started',                   by: 'Program Manager' },
      { date: 'Jun 4 2025',  type: 'health-event', title: 'Sprint 2 Assessment pass rate: 91%',            by: 'Penny AI',       detail: 'Above 85% threshold — no intervention required.' },
      { date: 'Jun 2 2025',  type: 'change',       title: 'LinkedIn module updated for 2025 algorithm',    by: 'Curriculum Lead' },
      { date: 'May 28 2025', type: 'review',       title: 'Cohort 2 mid-point review completed',           by: 'Program Director', detail: 'On track. 1 learner flagged for additional coaching support.' },
      { date: 'May 20 2025', type: 'decision',     title: 'Cohort 3 approved for Q3 2025',                 by: 'Program Director' },
      { date: 'Apr 18 2025', type: 'update',       title: 'Cohort 1 completed — 94% completion rate',      by: 'Program Director' },
    ],
  },

  // ── 2. Coach (Role) ──────────────────────────────────────────────────────────
  {
    id: 'coach-role',
    objectTypeId: 'role', objectTypeName: 'Role',
    category: 'People Layer', categoryColor: 'text-blue-700', categoryBg: 'bg-blue-50 border-blue-200',
    name: 'Coach', status: 'Active', statusVariant: 'active',
    description: 'A Coach guides learners through program content, provides personalised feedback, monitors cohort health, and coordinates with Penny AI for learner support.',
    confidence: 74,
    workspaceLink: '/digital-twin/people',
    overview: {
      purpose: 'Deliver program content, facilitate weekly sessions, provide 1:1 coaching, monitor learner progress, and coordinate with Penny to support individual learner needs.',
      keyFacts: [
        { label: 'Role Type',      value: 'Internal — Staff' },
        { label: 'Active Coaches', value: '3' },
        { label: 'Ratio',          value: '1 Coach : up to 8 learners' },
        { label: 'Time Commitment',value: 'Part-time (8–12 hrs/week per cohort)' },
        { label: 'Blueprint Status',value: 'Partial — coaching responsibilities not fully documented' },
        { label: 'Salesforce Profile', value: 'Staff (custom profile)' },
      ],
    },
    relationships: [
      { objectTypeId: 'person',                objectTypeName: 'Person',                objectName: 'Assigned Learners (up to 8)',          direction: 'downstream', relationshipType: 'serves' },
      { objectTypeId: 'cohort',                objectTypeName: 'Cohort',                objectName: 'Foundations Trail Cohort 2',            direction: 'downstream', relationshipType: 'participates-in' },
      { objectTypeId: 'standard',              objectTypeName: 'Standard',              objectName: 'Role Blueprint — Coach',                direction: 'upstream',   relationshipType: 'governs' },
      { objectTypeId: 'penny-capability',      objectTypeName: 'Penny Capability',      objectName: 'Coach Support',                         direction: 'downstream', relationshipType: 'triggers' },
      { objectTypeId: 'communication-channel', objectTypeName: 'Communication Channel', objectName: '#foundations-coaches (Slack)',           direction: 'downstream', relationshipType: 'participates-in' },
      { objectTypeId: 'salesforce-object',     objectTypeName: 'Salesforce Object',     objectName: 'User (Salesforce Staff Profile)',        direction: 'downstream', relationshipType: 'maps-to' },
    ],
    ownership: {
      primary: 'Program Director', secondary: 'Coach Lead',
      team: 'Program Delivery Team',
      reviewCycle: 'Annual role review + per program iteration',
      accountabilityGaps: ['Coach Role Blueprint not fully documented — coaching responsibilities section empty', 'No formal backup process defined if a Coach is unavailable mid-cohort'],
    },
    health: {
      overall: 'needs-attention', lastChecked: 'Jun 2025',
      summary: 'Role is active and coaches are delivering, but the Role Blueprint is only 60% complete. Coaching responsibilities and handoff procedures are undocumented.',
      indicators: [
        { name: 'Blueprint Completeness', value: '60%',     status: 'warning', source: 'Standards Studio', note: 'Coaching responsibilities section not documented' },
        { name: 'Coverage Rate',          value: '100%',    status: 'healthy', source: 'Administration',   note: 'All 3 coach slots filled for Cohort 2' },
        { name: 'Penny Integration',      value: 'Active',  status: 'healthy', source: 'Penny AI',         note: 'Coach Support capability active for all coaches' },
        { name: 'Salesforce Mapping',     value: 'Partial', status: 'warning', source: 'Salesforce',       note: 'Staff profile exists, but Coach role not linked to cohort records' },
      ],
    },
    history: {
      decisions: [
        { date: 'Feb 2025', title: 'Coach Role Formalised', description: 'Coach role moved from informal volunteer to formal staff role with defined responsibilities.', impact: 'Created Staff profile in Salesforce; Role Blueprint drafted (still partial).' },
      ],
      changes: [
        { date: 'Mar 2025', type: 'Role Update', description: 'Added Penny Coach Support capability access to all coaches.', by: 'Penny Lead' },
        { date: 'Feb 2025', type: 'Role Update', description: 'Created Coach Role Blueprint draft (partial).', by: 'Standards Lead' },
      ],
      lessonsLearned: ['Coaches need Penny onboarding before cohort starts — add to Coach Setup checklist.', 'Coaching responsibilities must be documented before Cohort 3 launch.'],
      orgMemoryNote: 'Decision to formalise the Coach role is recorded in Org Memory (Feb 2025).',
    },
    standards: [
      { blueprintName: 'Role Blueprint — Coach', compliance: 'partial', gaps: ['Coaching responsibilities section incomplete', 'Handoff and backup procedures not documented', 'Communication mapping not defined'], lastReviewed: 'Feb 2025' },
      { blueprintName: 'Communication Blueprint', compliance: 'partial', gaps: ['Coach communication routing not fully mapped'], lastReviewed: 'Feb 2025' },
    ],
    knowledge: {
      sources: [{ name: 'Coach Handbook (Drive)', trustLevel: 'Supplemental', pennyApproved: false }],
      articles: [{ title: 'Coach Onboarding Guide', type: 'Onboarding', location: 'Google Drive' }],
      driveResources: [{ name: 'Coach Resources', type: 'folder' }],
      sourceGovernance: 'Coach knowledge resources are supplemental and not yet Penny-approved. Requires trust review before Penny activation.',
    },
    penny: {
      capabilities: [
        { name: 'Coach Support', status: 'Active', quality: '82/100', description: 'Provides coaches with learner summaries, at-risk alerts, and weekly cohort briefs.' },
      ],
      promptTemplates: [
        { name: 'Weekly Coach Brief', version: 'v1.2', status: 'Approved' },
        { name: 'Learner Risk Alert', version: 'v1.0', status: 'Approved' },
      ],
      contentAssistant: ['Generate weekly learner progress summary', 'Flag at-risk learners', 'Draft sprint facilitation notes'],
      futureServices: ['Automated coaching session planner (Q4 2025)', 'Penny-driven coach CPD suggestions (2026)'],
    },
    systems: {
      salesforce: [
        { object: 'User', fields: ['Name', 'Profile', 'IsActive'], note: 'Staff (custom) profile' },
        { object: 'Contact', fields: ['Name', 'Role__c', 'Program__c'], note: 'Contact record for non-staff coaches' },
      ],
      googleDrive: [{ name: 'Coach Resources', path: '/Program Delivery/Coach Resources' }],
      slack: [{ name: '#foundations-coaches', type: 'Coach coordination' }, { name: '#penny-coaches', type: 'Penny activity log for coaches' }],
      googleCalendar: ['Coach Office Hours Calendar'],
      lms: [], assessments: [],
      other: [],
    },
    activity: [
      { date: 'Jun 9 2025',  type: 'health-event', title: 'Blueprint completeness flag — coaching responsibilities still missing', by: 'Standards Studio' },
      { date: 'May 15 2025', type: 'update',        title: 'Coach 3 onboarded — Cohort 2 coaching team now complete', by: 'Program Director' },
      { date: 'Mar 10 2025', type: 'change',        title: 'Penny Coach Support capability activated for all coaches', by: 'Penny Lead' },
    ],
  },

  // ── 3. Resume Review (Penny Capability) ─────────────────────────────────────
  {
    id: 'resume-review-capability',
    objectTypeId: 'penny-capability', objectTypeName: 'Penny Capability',
    category: 'Intelligence Layer', categoryColor: 'text-pink-700', categoryBg: 'bg-pink-50 border-pink-200',
    name: 'Resume Review', status: 'Active', statusVariant: 'active',
    description: 'Penny reviews learner resume drafts in Sprint 3, providing structured, actionable feedback on formatting, narrative, impact language, and alignment with target roles.',
    confidence: 88,
    workspaceLink: '/penny',
    overview: {
      purpose: 'Deliver consistent, high-quality resume feedback to learners during Sprint 3 of any program that includes a resume component, reducing coach workload and scaling personalised feedback.',
      keyFacts: [
        { label: 'Capability Type',  value: 'Learner Support → Document Review' },
        { label: 'Quality Score',    value: '87/100 (threshold: 80)' },
        { label: 'Hallucination Risk', value: 'Low' },
        { label: 'Active Programs',  value: 'Foundations Trail, Guided Trail' },
        { label: 'Uses',             value: '234 interactions (last 30 days)' },
        { label: 'Prompt Version',   value: 'Resume Review Prompt v2.1' },
      ],
    },
    relationships: [
      { objectTypeId: 'prompt-template',  objectTypeName: 'Prompt Template',  objectName: 'Resume Review Prompt v2.1',       direction: 'downstream', relationshipType: 'depends-on' },
      { objectTypeId: 'knowledge-source', objectTypeName: 'Knowledge Source', objectName: 'Resume Writing Guide',             direction: 'upstream',   relationshipType: 'depends-on' },
      { objectTypeId: 'knowledge-source', objectTypeName: 'Knowledge Source', objectName: 'Salesforce Foundations Trail KB',  direction: 'upstream',   relationshipType: 'depends-on' },
      { objectTypeId: 'standard',         objectTypeName: 'Standard',         objectName: 'Penny Blueprint',                  direction: 'upstream',   relationshipType: 'governs' },
      { objectTypeId: 'lesson',           objectTypeName: 'Lesson',           objectName: 'Sprint 3 — Resume Writing Lesson', direction: 'upstream',   relationshipType: 'triggers' },
      { objectTypeId: 'person',           objectTypeName: 'Person',           objectName: 'Enrolled Learners (Sprints 3+)',   direction: 'downstream', relationshipType: 'serves' },
    ],
    ownership: {
      primary: 'Penny Lead', secondary: 'Curriculum Lead',
      team: 'Penny Governance Team',
      reviewCycle: 'Quarterly quality review + on knowledge source change',
      accountabilityGaps: [],
    },
    health: {
      overall: 'healthy', lastChecked: 'Jun 2025',
      summary: 'Resume Review is performing above threshold with low hallucination risk. Quality reviews are current and all knowledge sources are approved.',
      indicators: [
        { name: 'Quality Score',        value: '87/100',         status: 'healthy', source: 'Penny AI',          note: 'Threshold: 80. Reviewed Jun 2025.' },
        { name: 'Hallucination Risk',   value: 'Low',            status: 'healthy', source: 'Penny AI' },
        { name: 'Knowledge Source Status', value: 'All Approved', status: 'healthy', source: 'Knowledge Registry' },
        { name: 'Prompt Currency',      value: 'Current (v2.1)', status: 'healthy', source: 'Prompt Studio' },
        { name: 'Usage Rate',           value: '234 / 30 days',  status: 'healthy', source: 'Penny AI' },
      ],
    },
    history: {
      decisions: [
        { date: 'Apr 2025', title: 'Upgrade to Resume Review Prompt v2', description: 'v1 showed inconsistent formatting feedback. v2 adds structured rubric with ATS optimisation section.', impact: 'Quality score improved from 72 to 87. Hallucination rate dropped from medium to low.' },
        { date: 'Jan 2025', title: 'Add Resume Review to Foundations Trail', description: 'Program Director approved Penny resume review as a core Sprint 3 activity.', impact: 'Capability activated for Cohort 1 Sprint 3.' },
      ],
      changes: [
        { date: 'Apr 2025', type: 'Prompt Update', description: 'Upgraded to Resume Review Prompt v2.1 — added ATS optimisation section.', by: 'Penny Lead' },
        { date: 'Mar 2025', type: 'Knowledge Source', description: 'Resume Writing Guide added as Authoritative source.', by: 'Knowledge Manager' },
      ],
      lessonsLearned: ['Penny performs better with structured input — add a learner pre-submission checklist before Penny reviews.', 'Quality scores drop when learners submit partial drafts — add prompt guard for incomplete submissions.'],
    },
    standards: [
      { blueprintName: 'Penny Blueprint', compliance: 'compliant', gaps: [], lastReviewed: 'Jun 2025', notes: 'All governance requirements met. Quality reviews current.' },
    ],
    knowledge: {
      sources: [
        { name: 'Resume Writing Guide',           trustLevel: 'Authoritative', pennyApproved: true },
        { name: 'Salesforce Foundations Trail KB', trustLevel: 'Authoritative', pennyApproved: true },
        { name: 'LinkedIn Best Practices Guide',  trustLevel: 'Supplemental',  pennyApproved: true },
      ],
      articles: [
        { title: 'Resume Formatting Standards',    type: 'Standard',   location: 'Google Drive' },
        { title: 'ATS Optimisation Guide',         type: 'Reference',  location: 'Google Drive' },
        { title: 'Impact Language Examples',       type: 'Reference',  location: 'Google Drive' },
      ],
      driveResources: [{ name: 'Penny Resume Review Assets', type: 'folder' }],
      sourceGovernance: 'All sources reviewed quarterly by Knowledge Manager. Penny activation requires both trust review and governance sign-off.',
    },
    penny: {
      capabilities: [{ name: 'Resume Review', status: 'Active', quality: '87/100', description: 'This profile.' }],
      promptTemplates: [
        { name: 'Resume Review Prompt v2.1',    version: 'v2.1', status: 'Approved' },
        { name: 'Resume Pre-Submission Check',  version: 'v1.0', status: 'Approved' },
      ],
      contentAssistant: ['Review this learner\'s resume draft', 'Identify gaps in work history', 'Suggest formatting improvements for ATS', 'Generate impact language alternatives'],
      futureServices: ['Multi-round resume coaching (Q4 2025)', 'Employer matching resume alignment (Q4 2025)'],
    },
    systems: {
      salesforce: [{ object: 'Task', fields: ['Subject', 'WhoId', 'ActivityDate', 'Status'], note: 'Penny interaction record per resume review' }],
      googleDrive: [{ name: 'Penny Resume Review Assets', path: '/Penny/Resume Review' }],
      slack: [{ name: '#penny-foundations', type: 'Penny activity log' }],
      googleCalendar: [], lms: [], assessments: [],
      other: [{ name: 'Penny AI Engine', details: 'Runs on Agentforce — planned Q4 integration' }],
    },
    activity: [
      { date: 'Jun 2025',  type: 'review',      title: 'Quarterly quality review — 87/100 (Pass)',             by: 'Penny Lead' },
      { date: 'Apr 2025',  type: 'change',       title: 'Upgraded to Resume Review Prompt v2.1',               by: 'Penny Lead', detail: 'Added ATS optimisation section. Quality score up 15 points.' },
      { date: 'Mar 2025',  type: 'health-event', title: 'Resume Writing Guide added as Authoritative source',   by: 'Knowledge Manager' },
      { date: 'Jan 2025',  type: 'update',       title: 'Capability activated for Foundations Trail Cohort 1', by: 'Program Director' },
    ],
  },

  // ── 4. Program Blueprint v2 (Standard) ──────────────────────────────────────
  {
    id: 'program-blueprint-v2',
    objectTypeId: 'program-blueprint', objectTypeName: 'Program Blueprint',
    category: 'Knowledge Layer', categoryColor: 'text-violet-700', categoryBg: 'bg-violet-50 border-violet-200',
    name: 'Program Blueprint v2', status: 'Active', statusVariant: 'active',
    description: 'The architectural standard governing how all Transition Trails programs are designed, structured, and delivered. Defines required components, sprint architecture, Penny integration, and quality standards.',
    confidence: 94,
    workspaceLink: '/program/blueprint',
    overview: {
      purpose: 'Ensure all Transition Trails programs share a consistent structure, quality standard, and delivery architecture that enables measurement, Penny integration, and learner predictability.',
      keyFacts: [
        { label: 'Version',            value: 'v2.1 (current)' },
        { label: 'Programs Governed',  value: '5 (all active programs)' },
        { label: 'Compliance Rate',    value: '80% (4 of 5 programs fully compliant)' },
        { label: 'Last Updated',       value: 'Mar 2025 (v2.1 — Penny requirements)' },
        { label: 'Owner',              value: 'Standards Lead' },
        { label: 'Review Cycle',       value: 'Annual + on major platform change' },
      ],
    },
    relationships: [
      { objectTypeId: 'program', objectTypeName: 'Program', objectName: 'Foundations Trail',  direction: 'downstream', relationshipType: 'governs', profileId: 'foundations-trail' },
      { objectTypeId: 'program', objectTypeName: 'Program', objectName: 'Guided Trail',       direction: 'downstream', relationshipType: 'governs' },
      { objectTypeId: 'program', objectTypeName: 'Program', objectName: "Explorer's Trail",   direction: 'downstream', relationshipType: 'governs' },
      { objectTypeId: 'program', objectTypeName: 'Program', objectName: 'Trail of Mastery',   direction: 'downstream', relationshipType: 'governs' },
      { objectTypeId: 'program', objectTypeName: 'Program', objectName: 'Digital Compass',    direction: 'downstream', relationshipType: 'governs' },
      { objectTypeId: 'standard', objectTypeName: 'Standard', objectName: 'Module Blueprint', direction: 'downstream', relationshipType: 'contains' },
      { objectTypeId: 'standard', objectTypeName: 'Standard', objectName: 'Lesson Blueprint', direction: 'downstream', relationshipType: 'contains' },
      { objectTypeId: 'standard', objectTypeName: 'Standard', objectName: 'Penny Blueprint',  direction: 'downstream', relationshipType: 'contains' },
      { objectTypeId: 'decision', objectTypeName: 'Decision', objectName: 'Sprint Structure Adoption (Jan 2025)', direction: 'upstream', relationshipType: 'informs' },
    ],
    ownership: {
      primary: 'Standards Lead', secondary: 'Program Director',
      team: 'Standards & Quality Team',
      reviewCycle: 'Annual review in January + triggered review on major platform change',
      accountabilityGaps: ['Digital Compass compliance gap not yet formally assigned to an owner'],
    },
    health: {
      overall: 'healthy', lastChecked: 'Mar 2025',
      summary: '4 of 5 programs are fully compliant. Digital Compass is the only program with an outstanding gap (Sprint structure not yet adopted). Blueprint is current.',
      indicators: [
        { name: 'Program Compliance Rate', value: '80% (4 of 5)',   status: 'warning', source: 'Standards Studio', note: 'Digital Compass sprint migration pending' },
        { name: 'Currency',                value: 'Current (v2.1)', status: 'healthy', source: 'Standards Studio' },
        { name: 'Pending Reviews',         value: 'None',           status: 'healthy', source: 'Standards Studio' },
      ],
    },
    history: {
      decisions: [
        { date: 'Jan 2025', title: 'v2.0 — Sprint Architecture Adopted', description: 'All programs moved from milestone-based to 2-week sprint delivery model.', impact: 'Required curriculum reordering for 4 programs. Digital Compass migration still pending.' },
        { date: 'Mar 2025', title: 'v2.1 — Penny Integration Requirements Added', description: 'Penny AI capability requirements added as mandatory blueprint section for all new and updated programs.', impact: 'All programs must document active Penny capabilities from v2.1 onwards.' },
      ],
      changes: [
        { date: 'Mar 2025', type: 'Blueprint Update', description: 'v2.1 released — added Penny Integration Requirements section.', by: 'Standards Lead' },
        { date: 'Jan 2025', type: 'Blueprint Update', description: 'v2.0 released — Sprint Architecture replacing Milestone format.', by: 'Standards Lead' },
        { date: 'Dec 2024', type: 'Blueprint Update', description: 'v1.0 initial release — established Program structure standard.', by: 'Standards Lead' },
      ],
      lessonsLearned: ['Blueprints must have named compliance owners per program — blanket compliance checks missed the Digital Compass gap for 2 months.'],
      orgMemoryNote: 'Full version history and rationale stored in Org Memory.',
    },
    standards: [
      { blueprintName: 'Program Blueprint v2 (self)', compliance: 'compliant', gaps: [], lastReviewed: 'Mar 2025', notes: 'Self-referential governance check — blueprint follows its own structural requirements.' },
    ],
    knowledge: {
      sources: [{ name: 'Standards Studio', trustLevel: 'Authoritative', pennyApproved: false }],
      articles: [
        { title: 'Program Blueprint v2.1 Full Document',  type: 'Standard',   location: 'Standards Studio + Google Drive' },
        { title: 'Blueprint Change Log',                  type: 'History Doc',location: 'Google Drive' },
        { title: 'Program Compliance Tracker',            type: 'Sheet',      location: 'Google Drive' },
      ],
      driveResources: [
        { name: 'Standards & Blueprints Folder', type: 'folder' },
        { name: 'Program Blueprint v2.1',        type: 'document' },
        { name: 'Program Compliance Tracker',    type: 'sheet' },
      ],
      sourceGovernance: 'Standards Studio is the authoritative source. Google Drive holds working copies and change history.',
    },
    penny: {
      capabilities: [],
      promptTemplates: [],
      contentAssistant: ['Check a program\'s compliance with this blueprint', 'Generate a compliance gap summary', 'Draft blueprint update rationale'],
      futureServices: ['Automated compliance checking via Penny (Q4 2025)', 'Blueprint version control integration (2026)'],
    },
    systems: {
      salesforce: [], googleDrive: [{ name: 'Standards & Blueprints', path: '/Standards/Blueprints' }],
      slack: [{ name: '#standards-team', type: 'Standards team coordination' }],
      googleCalendar: ['Annual Blueprint Review — January'], lms: [], assessments: [],
      other: [{ name: 'Standards Studio', details: 'Primary authoring and compliance tracking tool for all blueprints' }],
    },
    activity: [
      { date: 'Mar 2025', type: 'change',       title: 'v2.1 released — Penny Integration Requirements added',  by: 'Standards Lead' },
      { date: 'Feb 2025', type: 'health-event', title: 'Digital Compass compliance gap identified',             by: 'Standards Studio', detail: 'Sprint migration still pending. Owner not assigned.' },
      { date: 'Jan 2025', type: 'change',       title: 'v2.0 released — Sprint Architecture standard adopted',  by: 'Standards Lead' },
    ],
  },

  // ── 5. Foundations Trail Google Drive Folder (Google Drive Resource) ─────────
  {
    id: 'foundations-trail-drive',
    objectTypeId: 'google-drive-resource', objectTypeName: 'Google Drive Resource',
    category: 'Infrastructure Layer', categoryColor: 'text-teal-700', categoryBg: 'bg-teal-50 border-teal-200',
    name: 'Foundations Trail Drive Folder', status: 'Active', statusVariant: 'active',
    description: 'The Google Drive root folder for all Foundations Trail content — curriculum materials, sprint archives, coach resources, and learner handouts. Linked to the Salesforce Program__c record.',
    confidence: 79,
    workspaceLink: '/program/resources',
    overview: {
      purpose: 'Serve as the single Google Drive repository for all Foundations Trail program content, providing organized access for program staff, coaches, and learners with appropriate permissions.',
      keyFacts: [
        { label: 'Drive Path',          value: '/Program Delivery/Foundations Trail' },
        { label: 'Sub-folders',         value: '6 (Sprint Archives, Curriculum, Coach Resources, Learner Materials, Cohort Records, Admin)' },
        { label: 'Linked Salesforce',   value: 'Program__c — Foundations Trail record' },
        { label: 'Access — Staff',      value: 'Edit' },
        { label: 'Access — Coaches',    value: 'Comment' },
        { label: 'Access — Learners',   value: 'View (cohort sub-folders only)' },
      ],
    },
    relationships: [
      { objectTypeId: 'program',          objectTypeName: 'Program',          objectName: 'Foundations Trail',              direction: 'upstream',   relationshipType: 'sources',   profileId: 'foundations-trail' },
      { objectTypeId: 'knowledge-source', objectTypeName: 'Knowledge Source', objectName: 'Foundations Trail KB (Drive)',   direction: 'downstream', relationshipType: 'sources' },
      { objectTypeId: 'lesson',           objectTypeName: 'Lesson',           objectName: 'Sprint 1–4 Lessons',            direction: 'downstream', relationshipType: 'contains' },
      { objectTypeId: 'salesforce-object',objectTypeName: 'Salesforce Object',objectName: 'Program__c — Foundations Trail',direction: 'downstream', relationshipType: 'syncs-with', profileId: 'sf-program-engagement' },
    ],
    ownership: {
      primary: 'Program Manager', secondary: 'Curriculum Lead',
      team: 'Program Delivery Team',
      reviewCycle: 'Per cohort (folder hygiene) + access control review every 6 months',
      accountabilityGaps: ['Last access control review: Nov 2024 — overdue by 1 month', '2 sub-folders outside the naming convention'],
    },
    health: {
      overall: 'needs-attention', lastChecked: 'Jun 2025',
      summary: 'Drive folder is active and in use. Access control review is overdue and 2 sub-folders have naming convention violations.',
      indicators: [
        { name: 'Access Control Review', value: 'Overdue (Nov 2024)', status: 'warning',  source: 'Google Drive', note: 'Review due every 6 months. Last: Nov 2024.' },
        { name: 'Naming Convention',     value: '4 of 6 folders correct', status: 'warning',  source: 'Google Drive', note: '2 folders outside convention' },
        { name: 'Salesforce Link',       value: 'Active',             status: 'healthy', source: 'Salesforce' },
        { name: 'Knowledge Source Sync', value: 'Active',             status: 'healthy', source: 'Knowledge Registry' },
      ],
    },
    history: {
      decisions: [
        { date: 'Dec 2024', title: 'Standardise Drive Structure for All Programs', description: 'Agreed to adopt consistent sub-folder structure across all program Drive roots.', impact: 'Foundations Trail folder restructured. 2 legacy sub-folders not yet renamed.' },
      ],
      changes: [
        { date: 'Jun 2025', type: 'Content Update', description: 'Sprint 3 LinkedIn module updated — new version uploaded to Curriculum folder.', by: 'Curriculum Lead' },
        { date: 'May 2025', type: 'Cohort Setup',   description: 'Cohort 2 folder created and permissions configured.', by: 'Program Manager' },
      ],
      lessonsLearned: ['Drive folder structure should be templated before each new cohort — current manual setup creates inconsistencies.'],
    },
    standards: [
      { blueprintName: 'Program Blueprint v2 (Drive requirements)', compliance: 'partial', gaps: ['2 sub-folders outside naming convention', 'Access control review overdue'], lastReviewed: 'Nov 2024' },
    ],
    knowledge: {
      sources: [{ name: 'Foundations Trail KB (Drive)', trustLevel: 'Supplemental', pennyApproved: false }],
      articles: [
        { title: 'Foundations Trail Program One-Pager', type: 'Program Doc', location: '/Foundations Trail/Admin' },
        { title: 'Sprint 1–4 Facilitator Guides',      type: 'Curriculum',  location: '/Foundations Trail/Curriculum' },
      ],
      driveResources: [
        { name: 'Foundations Trail (root)',   type: 'folder' },
        { name: 'Sprint Archives',            type: 'folder' },
        { name: 'Curriculum',                 type: 'folder' },
        { name: 'Coach Resources',            type: 'folder' },
        { name: 'Cohort 2 Materials',         type: 'folder' },
      ],
      sourceGovernance: 'Drive is a Supplemental source. Requires Knowledge Manager review before Penny activation.',
    },
    penny: {
      capabilities: [], promptTemplates: [],
      contentAssistant: ['List all files in this folder by sprint', 'Identify files that haven\'t been updated in 90+ days'],
      futureServices: ['Automated Drive → Salesforce sync (Q3 2025)', 'Penny Drive content indexing (Q4 2025)'],
    },
    systems: {
      salesforce: [{ object: 'Program__c', fields: ['Drive_Folder_URL__c'], note: 'Drive folder URL stored in Salesforce Program record' }],
      googleDrive: [{ name: 'Foundations Trail', path: '/Program Delivery/Foundations Trail' }],
      slack: [], googleCalendar: [], lms: [], assessments: [],
      other: [],
    },
    activity: [
      { date: 'Jun 9 2025',  type: 'health-event', title: 'Access control review flagged as overdue',         by: 'Standards Studio' },
      { date: 'Jun 2 2025',  type: 'change',        title: 'Sprint 3 LinkedIn module updated',                by: 'Curriculum Lead' },
      { date: 'May 15 2025', type: 'update',        title: 'Cohort 2 folder created and permissions set',    by: 'Program Manager' },
    ],
  },

  // ── 6. Salesforce Program Engagement (Salesforce Object) ─────────────────────
  {
    id: 'sf-program-engagement',
    objectTypeId: 'salesforce-object', objectTypeName: 'Salesforce Object',
    category: 'Infrastructure Layer', categoryColor: 'text-teal-700', categoryBg: 'bg-teal-50 border-teal-200',
    name: 'Salesforce Program Engagement', status: 'Active', statusVariant: 'active',
    description: 'The Program_Engagement__c custom object records each learner\'s participation in a specific program cohort — the primary enrollment and progress record linking a Contact to a Program and Cohort.',
    confidence: 86,
    workspaceLink: '/program/salesforce',
    overview: {
      purpose: 'Track each learner\'s enrollment, progress, and outcomes in a specific program cohort. The authoritative source for learner stage, health score, and completion status across all programs.',
      keyFacts: [
        { label: 'Object API Name',  value: 'Program_Engagement__c' },
        { label: 'Active Records',   value: '~247 (all cohorts)' },
        { label: 'Active Cohort Records', value: '13 (Foundations Trail Cohort 2)' },
        { label: 'Data Completeness', value: '94%' },
        { label: 'Integrity Errors', value: '0' },
        { label: 'Relationship to PMM', value: 'Parallel to PMM Program Engagement (mapping in progress)' },
      ],
    },
    relationships: [
      { objectTypeId: 'cohort',   objectTypeName: 'Cohort',   objectName: 'Foundations Trail Cohort 2',   direction: 'downstream', relationshipType: 'contains',  profileId: undefined },
      { objectTypeId: 'person',   objectTypeName: 'Person',   objectName: 'Enrolled Learners (Contact)',  direction: 'downstream', relationshipType: 'maps-to' },
      { objectTypeId: 'program',  objectTypeName: 'Program',  objectName: 'Foundations Trail',            direction: 'upstream',   relationshipType: 'maps-to',   profileId: 'foundations-trail' },
      { objectTypeId: 'integration', objectTypeName: 'Integration', objectName: 'LMS Integration (planned)', direction: 'downstream', relationshipType: 'syncs-with' },
    ],
    ownership: {
      primary: 'Salesforce Admin', secondary: 'Program Director',
      team: 'Operations & Systems Team',
      reviewCycle: 'Quarterly data quality review + on schema change',
      accountabilityGaps: ['PMM parallel mapping not yet formalized — two records per learner in some cases'],
    },
    health: {
      overall: 'healthy', lastChecked: 'Jun 2025',
      summary: 'Program Engagement records are clean and current. 94% field completeness and 0 integrity errors. PMM mapping is the only outstanding gap.',
      indicators: [
        { name: 'Data Completeness',    value: '94%',      status: 'healthy', source: 'Salesforce', note: 'Below 100% due to some legacy records missing Cohort__c lookup' },
        { name: 'Integrity Errors',     value: '0',        status: 'healthy', source: 'Salesforce' },
        { name: 'PMM Mapping Status',   value: 'Partial',  status: 'warning', source: 'Salesforce', note: 'Some learners have both PMM and custom records — consolidation needed' },
        { name: 'LMS Sync',             value: 'Planned Q3', status: 'unknown', source: 'Operations Hub' },
      ],
    },
    history: {
      decisions: [
        { date: 'Nov 2024', title: 'Create Custom Program Engagement Object', description: 'Decided to create Program_Engagement__c rather than rely solely on PMM Program Engagement due to custom fields required (Health_Score, Cohort__c, Coach__c).', impact: 'Custom object live since Dec 2024. PMM parallel record mapping still in progress.' },
      ],
      changes: [
        { date: 'Mar 2025', type: 'Schema Update', description: 'Added Health_Score__c field to track Penny engagement quality per learner.', by: 'Salesforce Admin' },
        { date: 'Dec 2024', type: 'Object Created', description: 'Program_Engagement__c object created and deployed to production.', by: 'Salesforce Admin' },
      ],
      lessonsLearned: ['Running parallel to PMM creates data maintenance overhead — plan consolidation before LMS integration.'],
      orgMemoryNote: 'Decision to use custom object over PMM recorded in Org Memory (Nov 2024).',
    },
    standards: [
      { blueprintName: 'Program Blueprint v2 (Salesforce requirements)', compliance: 'compliant', gaps: [], lastReviewed: 'Mar 2025' },
    ],
    knowledge: {
      sources: [{ name: 'Salesforce Foundations Trail KB', trustLevel: 'Authoritative', pennyApproved: true }],
      articles: [
        { title: 'Program Engagement Object Data Dictionary', type: 'Technical Doc', location: 'Google Drive' },
        { title: 'PMM Mapping Plan',                         type: 'Planning Doc',  location: 'Google Drive' },
      ],
      driveResources: [{ name: 'Salesforce Architecture Docs', type: 'folder' }],
      sourceGovernance: 'Salesforce is the authoritative source. All schema changes require Admin sign-off and change log entry.',
    },
    penny: {
      capabilities: [],
      promptTemplates: [],
      contentAssistant: ['List all active learner records for a cohort', 'Flag records with missing Cohort__c lookup', 'Generate data quality report'],
      futureServices: ['Automated Penny health score sync from SF (Q3 2025)', 'LMS completion sync (Q3 2025)'],
    },
    systems: {
      salesforce: [
        { object: 'Program_Engagement__c', fields: ['Contact__c', 'Program__c', 'Cohort__c', 'Stage__c', 'Start_Date__c', 'End_Date__c', 'Coach__c', 'Health_Score__c', 'Completion_Date__c'] },
        { object: 'Contact',               fields: ['Name', 'Email', 'Program_Stage__c'], note: 'Parent object via Contact__c lookup' },
        { object: 'Program__c',            fields: ['Name', 'Status__c'],                note: 'Parent object via Program__c lookup' },
      ],
      googleDrive: [{ name: 'Salesforce Architecture Docs', path: '/Admin/Salesforce Architecture' }],
      slack: [{ name: '#salesforce-ops', type: 'Salesforce admin channel' }],
      googleCalendar: ['Quarterly Data Quality Review'],
      lms: ['LMS sync planned Q3 2025'], assessments: [],
      other: [{ name: 'PMM (Nonprofit Success Pack)', details: 'Parallel Program Engagement records exist — consolidation plan in progress' }],
    },
    activity: [
      { date: 'Jun 2025',  type: 'review',      title: 'Quarterly data quality review — 94% completeness (Pass)', by: 'Salesforce Admin' },
      { date: 'Mar 2025',  type: 'change',       title: 'Health_Score__c field added to object',                   by: 'Salesforce Admin' },
      { date: 'Feb 2025',  type: 'health-event', title: 'PMM parallel record mapping gap identified',             by: 'Operations Lead', detail: '23 learners have both PMM and custom records.' },
      { date: 'Dec 2024',  type: 'update',       title: 'Program_Engagement__c object deployed to production',    by: 'Salesforce Admin' },
    ],
  },
];

export const PROFILE_MAP = Object.fromEntries(PROFILES.map(p => [p.id, p]));
