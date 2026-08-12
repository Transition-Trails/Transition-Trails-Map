// ── Integration Readiness Center — Planning & Readiness Architecture ────────
// Governance and readiness workspace for all Trail OS integrations.
// Live as of Aug 2026: Salesforce (REST API), Slack (@penny bot), Gemini 2.5 Flash,
// Google Drive (Penny Asset Library), Google Calendar, Gmail, Agentforce.
// Remaining integrations (LMS, Assessments pipeline, RAG, GChat) are still planned.

export type IntegrationDomain =
  | 'Salesforce' | 'Google Drive' | 'Slack' | 'Google Chat'
  | 'Google Calendar' | 'LMS' | 'Assessments' | 'Penny Services';

export type IntegrationStatus =
  | 'Live'
  | 'Prototype'
  | 'Ready to Configure'
  | 'Needs Admin Setup'
  | 'Needs Security Review'
  | 'Blocked'
  | 'Future';

export type SyncDirection = 'Read Only' | 'Write Only' | 'Bidirectional' | 'Event-Driven' | 'TBD';

export type AuthType = 'OAuth 2.0' | 'API Key' | 'Service Account' | 'Webhook' | 'JWT' | 'Session Token' | 'TBD';

export type LaunchPhase = 'Planned' | 'TBD' | 'Live';

export type RiskSeverity  = 'Critical' | 'High' | 'Medium' | 'Low';
export type RiskLikelihood = 'Likely' | 'Possible' | 'Unlikely';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface AuthRequirement {
  scope: string;
  purpose: string;
  minimumRequired: boolean;
  approver: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  direction: 'Source → Trail OS' | 'Trail OS → Source' | 'Bidirectional';
  notes: string;
  status: 'Confirmed' | 'Proposed' | 'Blocked' | 'TBD';
}

export interface SyncReadinessCheck {
  check: string;
  description: string;
  status: 'Pass' | 'Fail' | 'Partial' | 'Not Started';
  notes: string;
}

export interface Integration {
  id: string;
  name: string;
  shortName: string;
  domain: IntegrationDomain;
  status: IntegrationStatus;
  launchPhase: LaunchPhase;
  priority: 'P1' | 'P2' | 'P3';
  owner: string;
  description: string;
  purpose: string;
  systemRole: string;                    // e.g. "System of Record"
  authType: AuthType;
  authRequirements: AuthRequirement[];
  syncDirection: SyncDirection;
  syncCadence: string;
  fieldMappings: FieldMapping[];
  syncReadiness: SyncReadinessCheck[];
  relatedTrailOSModules: string[];
  relatedSfObjects: string[];
  relatedKnowledgeSources: string[];     // source ids from knowledgeSourceData
  relatedIntegrations: string[];         // other integration ids
  risks: string[];
  blockers: string[];
  nextSteps: string[];
  readinessScore: number;                // 0–100
  pennyNote?: string;                    // note if this relates to Penny
}

export interface RiskEntry {
  id: string;
  title: string;
  description: string;
  affectedIntegrations: string[];
  severity: RiskSeverity;
  likelihood: RiskLikelihood;
  mitigation: string;
  owner: string;
  status: 'Open' | 'Mitigated' | 'Accepted' | 'Closed';
}

export interface LaunchMilestone {
  id: string;
  phase: LaunchPhase;
  title: string;
  description: string;
  integrationIds: string[];
  dependencies: string[];
  successCriteria: string[];
  estimatedEffort: string;
  status: 'Not Started' | 'In Planning' | 'In Progress' | 'Complete';
}

export interface DataFlowNode {
  id: string;
  label: string;
  systemRole: string;
  description: string;
  cls: string;
  outbound: { targetId: string; label: string; direction: 'send' | 'receive' | 'both'; note: string }[];
}

// ── Config ─────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<IntegrationStatus, { cls: string; order: number }> = {
  'Live':                  { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',       order: 0 },
  'Prototype':             { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       order: 1 },
  'Ready to Configure':    { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',       order: 2 },
  'Needs Admin Setup':     { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',       order: 3 },
  'Needs Security Review': { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',       order: 4 },
  'Blocked':               { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',       order: 5 },
  'Future':                { cls: 'text-slate-500 bg-slate-50 border-slate-200',         order: 6 },
};

export const DOMAIN_CONFIG: Record<IntegrationDomain, { cls: string; icon: string; tagline: string }> = {
  'Salesforce':      { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',       icon: 'database',     tagline: 'System of Record' },
  'Google Drive':    { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',    icon: 'folder-open',  tagline: 'Content Repository' },
  'Slack':           { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', icon: 'message-square', tagline: 'Learner Delivery Channel' },
  'Google Chat':     { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',       icon: 'message-circle', tagline: 'Client & Executive Channel' },
  'Google Calendar': { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',    icon: 'calendar',     tagline: 'Timing & Trigger Layer' },
  'LMS':             { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', icon: 'graduation-cap', tagline: 'Learning Delivery Platform' },
  'Assessments':     { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',       icon: 'check-square', tagline: 'Learner Progress Data' },
  'Penny Services':  { cls: 'text-secondary border-secondary/20 bg-secondary/10', icon: 'brain',    tagline: 'Intelligence Layer (POC)' },
};

export const DOMAIN_ORDER: IntegrationDomain[] = [
  'Salesforce', 'Google Drive', 'LMS', 'Assessments',
  'Slack', 'Google Chat', 'Google Calendar', 'Penny Services',
];

// ── Standard Readiness Checklist Template ──────────────────────────────────

function mkChecks(overrides: Partial<Record<string, Partial<SyncReadinessCheck>>>): SyncReadinessCheck[] {
  const base: SyncReadinessCheck[] = [
    { check: 'Source Exists',          description: 'The source system is live and accessible.',                            status: 'Not Started', notes: '' },
    { check: 'Owner Assigned',         description: 'A named owner is accountable for this integration.',                  status: 'Not Started', notes: '' },
    { check: 'Permissions Known',      description: 'Required permissions and scopes are documented.',                      status: 'Not Started', notes: '' },
    { check: 'Object Mapping Done',    description: 'Field and object mapping to Trail OS schema is confirmed.',            status: 'Not Started', notes: '' },
    { check: 'Data Quality Verified',  description: 'Source data has been reviewed for completeness and accuracy.',         status: 'Not Started', notes: '' },
    { check: 'Sync Direction Known',   description: 'Whether data flows Read / Write / Bidirectional is documented.',      status: 'Not Started', notes: '' },
    { check: 'Error Handling Planned', description: 'What happens on API error, timeout, or data mismatch is defined.',    status: 'Not Started', notes: '' },
    { check: 'Rollback Plan Documented', description: 'A rollback procedure exists if the integration needs to be disabled.', status: 'Not Started', notes: '' },
  ];
  return base.map(b => ({ ...b, ...(overrides[b.check] ?? {}) }));
}

// ── Integrations ────────────────────────────────────────────────────────────

export const integrations: Integration[] = [

  // ── Salesforce ─────────────────────────────────────────────────────────

  {
    id: 'int-sf-pmm',
    name: 'Salesforce Program Management Module',
    shortName: 'SF: PMM Core',
    domain: 'Salesforce',
    status: 'Live',
    launchPhase: 'Live',
    priority: 'P1',
    owner: 'Salesforce Admin',
    description: 'Core integration with Salesforce PMM (pmdm__ namespace) — Program Engagements, Service Schedules, Service Deliveries, and Training Plans. The primary system of record for learner enrollment, attendance, and program progress. Live and confirmed.',
    purpose: 'Trail OS reads learner enrollment and program progress data from Salesforce PMM to drive all Penny coaching interactions, cohort summaries, and dashboard views.',
    systemRole: 'System of Record',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'api',                               purpose: 'Read/write all Salesforce data via REST API',          minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'refresh_token',                      purpose: 'Long-lived session for background sync jobs',         minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'pmdm__ProgramEngagement__c:read',    purpose: 'Read learner enrollment and pmdm__Stage__c status',   minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Training_Plan__c:read',              purpose: 'Read LMS-linked training plan data',                  minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Service_Schedule__c:read',           purpose: 'Read session and sprint schedule data',               minimumRequired: true,  approver: 'Salesforce Admin' },
    ],
    syncDirection: 'Bidirectional',
    syncCadence: 'Real-time on change events + 15-min polling fallback',
    fieldMappings: [
      { sourceField: 'pmdm__ProgramEngagement__c.pmdm__Stage__c',    targetField: 'Learner.enrollmentStatus', direction: 'Source → Trail OS', notes: 'Active, Completed, Withdrawn map to Trail OS learner states. Stage field confirmed — pmdm__ProgramStatus__c does not exist.', status: 'Confirmed' },
      { sourceField: 'pmdm__ProgramEngagement__c.pmdm__Program__c',  targetField: 'Learner.programId',        direction: 'Source → Trail OS', notes: 'SF Program record ID.',                                                                                                       status: 'Confirmed' },
      { sourceField: 'Training_Plan__c.Name',                         targetField: 'Program.lmsLinkedPlan',    direction: 'Source → Trail OS', notes: 'Training Plan links program to LMS module set.',                                                                            status: 'Proposed' },
      { sourceField: 'Service_Schedule__c.Start_Date__c',            targetField: 'Sprint.startDate',         direction: 'Source → Trail OS', notes: 'Sprint schedule dates for study plan calculation.',                                                                         status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',    notes: 'Salesforce PMM live. pmdm__ProgramEngagement__c accessible — 36 engagement records, 2 Active learners (Marissa Pavlak, Michele Ward on Foundations Trail).' },
      'Owner Assigned':         { status: 'Pass',    notes: 'Salesforce Admin is the owner.' },
      'Permissions Known':      { status: 'Pass',    notes: 'OAuth active via Replit Connector SDK. Connected App configured. Integration set up and confirmed.' },
      'Object Mapping Done':    { status: 'Pass',    notes: 'pmdm__ namespace objects confirmed. pmdm__Stage__c is the correct stage field. Active learner query via pmdm__ProgramEngagement__c WHERE pmdm__Stage__c = Active. Learner__c required on Penny_Interaction_Log__c.' },
      'Sync Direction Known':   { status: 'Pass',    notes: 'Bidirectional confirmed. Write scope: Penny_Interaction_Log__c only.' },
      'Error Handling Planned': { status: 'Partial', notes: 'Retry logic in place for Penny ask endpoint. Dead-letter queue not yet designed.' },
    }),
    relatedTrailOSModules: ['Navigator', 'Penny Command Center', 'Demand Management'],
    relatedSfObjects: ['pmdm__ProgramEngagement__c','pmdm__Program__c','pmdm__ProgramCohort__c','Service_Schedule__c','Training_Plan__c','Contact','Penny_Interaction_Log__c'],
    relatedKnowledgeSources: ['src-assessments','src-coach-notes'],
    relatedIntegrations: ['int-sf-knowledge','int-sf-assessments','int-sf-npsp'],
    risks: ['Bidirectional sync scope risk: write permissions too broad without row-level security', 'pmdm__Stage__c picklist values must be kept in sync with Trail OS active-learner filter'],
    blockers: [],
    nextSteps: ['Define row-level security for write scope', 'Expand learner directory to include Waitlisted stage when DM delivery is ready', 'Design dead-letter queue for failed Penny_Interaction_Log__c writes'],
    readinessScore: 84,
  },

  {
    id: 'int-sf-knowledge',
    name: 'Salesforce Knowledge API',
    shortName: 'SF: Knowledge',
    domain: 'Salesforce',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Knowledge Lead',
    description: 'Live sync of Salesforce Knowledge articles across three categories (Mission & Delivery, Operations & Business, Technology & Trail OS) into the Trail OS Knowledge Source Registry and Penny RAG pipeline.',
    purpose: 'Penny retrieves knowledge articles in real-time to answer learner questions. The Knowledge API is the data pipe from Salesforce-authored content to the Penny retrieval system.',
    systemRole: 'Authoritative Knowledge Source',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'api',                   purpose: 'Read Knowledge__kav records via REST',                   minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Knowledge__kav:read',   purpose: 'Read all published knowledge articles',                  minimumRequired: true,  approver: 'Knowledge Lead' },
      { scope: 'KnowledgeManagement',   purpose: 'Access Knowledge Management features and taxonomy',       minimumRequired: false, approver: 'Salesforce Admin' },
    ],
    syncDirection: 'Read Only',
    syncCadence: '24-hour refresh. On-publish event trigger (future).',
    fieldMappings: [
      { sourceField: 'Knowledge__kav.Title',         targetField: 'KnowledgeArticle.title',    direction: 'Source → Trail OS', notes: 'Direct mapping.',                                  status: 'Confirmed' },
      { sourceField: 'Knowledge__kav.ArticleBody',   targetField: 'KnowledgeArticle.body',     direction: 'Source → Trail OS', notes: 'HTML → Markdown conversion required.',              status: 'Proposed' },
      { sourceField: 'Knowledge__kav.DataCategorySelectionsByCategoryName', targetField: 'KnowledgeArticle.category', direction: 'Source → Trail OS', notes: 'Mission & Delivery / Operations / Technology taxonomy.', status: 'Confirmed' },
      { sourceField: 'Knowledge__kav.LastModifiedDate', targetField: 'KnowledgeArticle.updatedAt', direction: 'Source → Trail OS', notes: 'Used to detect stale articles.',              status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: 'SF Knowledge is live with articles in all 3 categories.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Knowledge Lead owns this integration.' },
      'Permissions Known':      { status: 'Partial',     notes: 'Read scopes clear. Connected App creation pending.' },
      'Data Quality Verified':  { status: 'Partial',     notes: 'Some articles >12mo without review. Quality gate needed before RAG ingestion.' },
      'Sync Direction Known':   { status: 'Pass',        notes: 'Read-only confirmed. Penny never writes to SF Knowledge.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Need retry policy for article fetch failures.' },
    }),
    relatedTrailOSModules: ['Knowledge Library', 'Penny Command Center'],
    relatedSfObjects: ['Knowledge__kav','Knowledge__DataCategorySelection'],
    relatedKnowledgeSources: ['src-sf-mission-delivery','src-sf-ops-business','src-sf-technology'],
    relatedIntegrations: ['int-sf-pmm','int-penny-rag'],
    risks: ['HTML-to-Markdown conversion may lose formatting', 'Stale articles will pollute Penny RAG if no quality gate exists', 'Category taxonomy changes in SF break Trail OS mapping'],
    blockers: [],
    nextSteps: ['Create Connected App (shared with PMM)', 'Build HTML→Markdown pipeline', 'Add quality gate: only articles reviewed within 90 days enter RAG'],
    readinessScore: 55,
  },

  {
    id: 'int-sf-assessments',
    name: 'Salesforce Assessment Objects',
    shortName: 'SF: Assessments',
    domain: 'Salesforce',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Curriculum Lead',
    description: 'Live read access to Salesforce Training Plan Item records containing learner assessment results, scores, pass/fail status, and completion dates.',
    purpose: 'Penny reads assessment data in real-time to personalise coaching, trigger escalations, and generate cohort health summaries. This is the highest-priority data source for Penny\'s coaching accuracy.',
    systemRole: 'Learner Progress Data',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'Training_Plan_Item__c:read', purpose: 'Read assessment results and scores',            minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Program_Engagement__c:read', purpose: 'Link assessment data to learner enrollment',    minimumRequired: true,  approver: 'Salesforce Admin' },
    ],
    syncDirection: 'Read Only',
    syncCadence: 'Real-time query per Penny interaction (SOQL). No bulk sync needed.',
    fieldMappings: [
      { sourceField: 'Training_Plan_Item__c.Score__c',       targetField: 'Assessment.score',          direction: 'Source → Trail OS', notes: 'Numeric 0–100.',                          status: 'Confirmed' },
      { sourceField: 'Training_Plan_Item__c.Status__c',      targetField: 'Assessment.status',         direction: 'Source → Trail OS', notes: 'Pass / Fail / Not Attempted.',            status: 'Confirmed' },
      { sourceField: 'Training_Plan_Item__c.Training_Plan__c', targetField: 'Assessment.programPlanId', direction: 'Source → Trail OS', notes: 'Links to Program enrollment.',           status: 'Proposed' },
      { sourceField: 'Training_Plan_Item__c.Completed_Date__c', targetField: 'Assessment.completedAt', direction: 'Source → Trail OS', notes: 'For timeline and pacing calculations.',  status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',    notes: 'Training_Plan_Item__c records exist in Salesforce org.' },
      'Owner Assigned':         { status: 'Pass',    notes: 'Curriculum Lead owns.' },
      'Object Mapping Done':    { status: 'Partial', notes: 'Core fields mapped. Sprint 3+ items not yet mapped to modules.' },
      'Data Quality Verified':  { status: 'Partial', notes: '40% of items missing category mapping. Needs cleanup before Penny use.' },
      'Sync Direction Known':   { status: 'Pass',    notes: 'Read-only. Penny never modifies assessment records.' },
    }),
    relatedTrailOSModules: ['Penny Command Center', 'Navigator'],
    relatedSfObjects: ['Training_Plan_Item__c','Training_Plan__c','Program_Engagement__c'],
    relatedKnowledgeSources: ['src-assessments'],
    relatedIntegrations: ['int-sf-pmm','int-lms-completion'],
    risks: ['40% category mapping gap means Penny personalisation is incomplete', 'Real-time SOQL queries may hit governor limits at scale', 'Score field naming varies across assessment types — normalisation needed'],
    blockers: [],
    nextSteps: ['Complete category mapping for Sprint 3+ items', 'Test SOQL query performance under load', 'Define score normalisation logic'],
    readinessScore: 58,
  },

  {
    id: 'int-sf-npsp',
    name: 'Salesforce NPSP / Nonprofit Cloud',
    shortName: 'SF: NPSP Core',
    domain: 'Salesforce',
    status: 'Live',
    launchPhase: 'Live',
    priority: 'P1',
    owner: 'Salesforce Admin',
    description: 'Core Salesforce NPSP / Nonprofit Cloud objects: Contacts, Accounts, Cases, Relationships, and Households. The identity layer for all learner records in Trail OS. Live and confirmed.',
    purpose: 'Contact and Account records are the identity foundation for all learner data. Trail OS maintains a clean link between Salesforce Contact IDs and Trail OS learner profiles.',
    systemRole: 'Identity & Relationship Data',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'Contact:read',           purpose: 'Read learner identity, demographics, contact info',     minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Account:read',           purpose: 'Read Account (Household/Organisation) associations',    minimumRequired: true,  approver: 'Salesforce Admin' },
      { scope: 'Case:read',              purpose: 'Read case records for support and escalation context',  minimumRequired: false, approver: 'Operations Lead' },
    ],
    syncDirection: 'Read Only',
    syncCadence: '1-hour sync. Event-driven on Contact update.',
    fieldMappings: [
      { sourceField: 'Contact.Id',           targetField: 'Learner.sfContactId',   direction: 'Source → Trail OS', notes: 'Primary join key.',                           status: 'Confirmed' },
      { sourceField: 'Contact.FirstName',    targetField: 'Learner.firstName',      direction: 'Source → Trail OS', notes: '',                                            status: 'Confirmed' },
      { sourceField: 'Contact.LastName',     targetField: 'Learner.lastName',       direction: 'Source → Trail OS', notes: '',                                            status: 'Confirmed' },
      { sourceField: 'Contact.Email',        targetField: 'Learner.email',          direction: 'Source → Trail OS', notes: 'PII — excluded from all Penny context windows.', status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass', notes: 'NPSP/Nonprofit Cloud live. 127 Accounts, 129 Contacts confirmed. npe01__OppPayment__c detected.' },
      'Owner Assigned':         { status: 'Pass', notes: 'Salesforce Admin.' },
      'Permissions Known':      { status: 'Pass', notes: 'OAuth active via Replit Connector SDK. Connected App configured. Integration set up and confirmed.' },
      'Data Quality Verified':  { status: 'Partial', notes: 'Some Contacts missing Email — impacts Penny messaging. Deduplication strategy not yet defined for learners with multiple SF records.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Conflict resolution on Contact merge not yet designed.' },
    }),
    relatedTrailOSModules: ['Navigator', 'Penny Command Center', 'Administration'],
    relatedSfObjects: ['Contact','Account','npe01__OppPayment__c','Case'],
    relatedKnowledgeSources: ['src-sf-mission-delivery'],
    relatedIntegrations: ['int-sf-pmm','int-sf-assessments'],
    risks: ['Contact.Email is PII — Penny context injection already excludes raw email', 'Contact deduplication edge cases when learner has multiple SF records', 'Case records contain sensitive support data — restricted access required'],
    blockers: [],
    nextSteps: ['Define Contact deduplication strategy for learners with multiple SF records', 'Confirm Case access scope with Operations Lead', 'Resolve missing Email on subset of Contact records'],
    readinessScore: 82,
  },

  {
    id: 'int-sf-volunteer',
    name: 'Salesforce Volunteer Management (V4S)',
    shortName: 'SF: Volunteers',
    domain: 'Salesforce',
    status: 'Future',
    launchPhase: 'Planned',
    priority: 'P3',
    owner: 'TBD',
    description: 'Volunteers for Salesforce (V4S) integration for volunteer job tracking, shift management, and coach-volunteer relationship mapping.',
    purpose: 'Future: Connect volunteer records to coach profiles and program delivery context. Not yet in scope.',
    systemRole: 'Volunteer & Coach Context',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'GW_Volunteers__Volunteer_Job__c:read', purpose: 'Read volunteer jobs and availability', minimumRequired: true, approver: 'TBD' },
    ],
    syncDirection: 'TBD',
    syncCadence: 'TBD',
    fieldMappings: [],
    syncReadiness: mkChecks({}),
    relatedTrailOSModules: ['Administration'],
    relatedSfObjects: ['GW_Volunteers__Volunteer_Job__c','GW_Volunteers__Volunteer_Hours__c','Contact'],
    relatedKnowledgeSources: [],
    relatedIntegrations: ['int-sf-pmm'],
    risks: ['V4S package version compatibility with current org needs verification'],
    blockers: ['No owner assigned', 'Not yet in scope'],
    nextSteps: ['Revisit in future planning cycle'],
    readinessScore: 5,
  },

  // ── Google Drive ────────────────────────────────────────────────────────

  {
    id: 'int-gdrive-foundations',
    name: 'Foundations Trail Google Drive Folder',
    shortName: 'GDrive: Foundations',
    domain: 'Google Drive',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Curriculum Lead',
    description: 'Google Drive API connection to the Foundations Trail program folder. Indexes coach guides, sprint schedules, assessment rubrics, and reference materials for Penny context and Source Document Archive.',
    purpose: 'Makes program materials accessible to Trail OS without manual uploads. Penny uses indexed content as supplementary coaching context.',
    systemRole: 'Content Repository',
    authType: 'Service Account',
    authRequirements: [
      { scope: 'drive.readonly',           purpose: 'Read folder contents and file metadata',               minimumRequired: true,  approver: 'Google Workspace Admin' },
      { scope: 'drive.file',               purpose: 'Read specific files shared with the service account',  minimumRequired: false, approver: 'Google Workspace Admin' },
    ],
    syncDirection: 'Read Only',
    syncCadence: '6-hour index refresh. On file-change webhook (future).',
    fieldMappings: [
      { sourceField: 'Drive File: Name',          targetField: 'SourceDoc.title',       direction: 'Source → Trail OS', notes: 'Used for display and search.',     status: 'Confirmed' },
      { sourceField: 'Drive File: mimeType',      targetField: 'SourceDoc.contentType', direction: 'Source → Trail OS', notes: 'Filter to Docs, Sheets, Slides.',  status: 'Proposed' },
      { sourceField: 'Drive File: modifiedTime',  targetField: 'SourceDoc.updatedAt',   direction: 'Source → Trail OS', notes: 'Used to detect stale content.',    status: 'Confirmed' },
      { sourceField: 'Drive File: webViewLink',   targetField: 'SourceDoc.url',         direction: 'Source → Trail OS', notes: 'Deep link for Knowledge Brief.',   status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: 'Google Drive OAuth active (GOOGLE_DRIVE_REFRESH_TOKEN). Penny Asset Library confirmed: 37 media files across 6 subfolders (Coaching, Confidence-Builder, Interview-Prep, Quest-Debrief, Resume-Review, Trail-Talk). Subfolder-recursive query confirmed in /api/drive/penny-content. Foundations program folder not yet separately mapped.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Curriculum Lead.' },
      'Permissions Known':      { status: 'Partial',     notes: 'OAuth complete via /admin/integrations/google-auth. supportsAllDrives confirmed. Foundations-specific program folder not yet connected via Drive admin page.' },
      'Data Quality Verified':  { status: 'Not Started', notes: 'Folder structure not yet reviewed for Standards compliance.' },
      'Object Mapping Done':    { status: 'Partial',     notes: 'File → SourceDoc mapping designed. Penny Asset Library file pipeline live. Foundations program folder pipeline not yet tested.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Need retry logic for quota limits.' },
      'Rollback Plan Documented': { status: 'Not Started', notes: 'TBD.' },
    }),
    relatedTrailOSModules: ['Knowledge Library', 'Penny Command Center', 'Curriculum Studio'],
    relatedSfObjects: ['Training_Plan__c','Program__c'],
    relatedKnowledgeSources: ['src-gdrive-foundations','src-gdrive-source-docs'],
    relatedIntegrations: ['int-gdrive-guided','int-sf-pmm'],
    risks: ['Foundations folder not yet connected — content unavailable to Penny until admin step complete', 'File change detection requires Drive webhooks (additional setup)', 'Folder structure not mapped to curriculum module schema'],
    blockers: ['Foundations Trail folder not yet connected via /admin/integrations/google-drive'],
    nextSteps: ['Connect Foundations Trail folder via /admin/integrations/google-drive', 'Map folder → module schema in Curriculum Studio', 'Review folder structure against Standards compliance'],
    readinessScore: 55,
  },

  {
    id: 'int-gdrive-guided',
    name: 'Guided Trail Google Drive Folder',
    shortName: 'GDrive: Guided Trail',
    domain: 'Google Drive',
    status: 'Future',
    launchPhase: 'Planned',
    priority: 'P2',
    owner: 'Curriculum Lead',
    description: 'Same integration pattern as Foundations Trail Google Drive. Connects the Guided Trail program folder to Trail OS.',
    purpose: 'Secondary to Foundations Trail Drive integration. Same pipeline, different folder.',
    systemRole: 'Content Repository',
    authType: 'Service Account',
    authRequirements: [{ scope: 'drive.readonly', purpose: 'Read Guided Trail folder', minimumRequired: true, approver: 'Google Workspace Admin' }],
    syncDirection: 'Read Only',
    syncCadence: '6-hour refresh.',
    fieldMappings: [],
    syncReadiness: mkChecks({}),
    relatedTrailOSModules: ['Knowledge Library', 'Curriculum Studio'],
    relatedSfObjects: ['Program__c'],
    relatedKnowledgeSources: ['src-gdrive-guided'],
    relatedIntegrations: ['int-gdrive-foundations'],
    risks: ['Depends on Foundations Trail Drive integration being complete first'],
    blockers: ['Foundations Trail Drive must be complete first'],
    nextSteps: ['Complete Foundations Trail Drive integration first. Reuse service account.'],
    readinessScore: 10,
  },

  // ── Slack ───────────────────────────────────────────────────────────────

  {
    id: 'int-slack-learner',
    name: 'Slack — Learner & Coaching Channels',
    shortName: 'Slack: Learner Channels',
    domain: 'Slack',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Communications Lead',
    description: 'Slack Bolt app integration for Penny-delivered coaching messages in learner DMs and cohort channels. Penny sends coaching messages, reflection prompts, and weekly reviews via Slack.',
    purpose: 'Primary learner-facing delivery channel. Penny messages learners directly in Slack rather than email. Supports direct messages, cohort channels, and event-triggered notifications.',
    systemRole: 'Learner Delivery Channel',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'chat:write',              purpose: 'Send messages to DMs and channels as Penny',           minimumRequired: true,  approver: 'Slack Workspace Admin' },
      { scope: 'im:read',                 purpose: 'Read DM conversation history for context (consent req)', minimumRequired: false, approver: 'Slack Workspace Admin + Legal' },
      { scope: 'channels:read',           purpose: 'List channels Penny is invited to',                    minimumRequired: true,  approver: 'Slack Workspace Admin' },
      { scope: 'users:read',              purpose: 'Resolve Slack user ID from SF Contact.Email',          minimumRequired: true,  approver: 'Slack Workspace Admin' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Penny sends on trigger (module completion, weekly review, coach request). Inbound messages trigger Penny response pipeline.',
    fieldMappings: [
      { sourceField: 'Slack user_id',     targetField: 'Learner.slackUserId',    direction: 'Source → Trail OS', notes: 'Mapped via Contact.Email → Slack users:read.',  status: 'Proposed' },
      { sourceField: 'Message timestamp', targetField: 'PennyLog.sentAt',        direction: 'Source → Trail OS', notes: 'Used for conversation history.',                 status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: 'Slack workspace live. @penny bot active — posting to #penny-ai and #admin confirmed.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Communications Lead.' },
      'Permissions Known':      { status: 'Partial',     notes: 'SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET active. channels:read + groups:read scopes pending for channel name resolution. im:read requires legal/consent review.' },
      'Data Quality Verified':  { status: 'Not Started', notes: 'Need to confirm all learner Slack accounts exist before DM delivery launch.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'What happens when learner does not have Slack? Need fallback.' },
    }),
    relatedTrailOSModules: ['Penny Command Center', 'Communications & Collaboration'],
    relatedSfObjects: ['Program_Engagement__c','Contact'],
    relatedKnowledgeSources: ['src-future-slack'],
    relatedIntegrations: ['int-sf-pmm','int-penny-slack'],
    risks: ['im:read requires explicit learner consent — privacy policy must cover this', 'Learner Slack account may not match SF Contact.Email — mapping may fail', 'Message rate limits could delay Penny delivery during cohort events'],
    blockers: ['Legal review of im:read scope and learner consent model needed before learner DM delivery'],
    nextSteps: ['Add channels:read + groups:read scopes for channel name resolution', 'Draft learner consent language for conversation logging', 'Test Penny bot DM delivery in sandbox workspace'],
    readinessScore: 48,
    pennyNote: 'This is the primary Penny delivery channel. Penny Slack Bot (int-penny-slack) depends on this integration being configured first.',
  },

  {
    id: 'int-slack-internal',
    name: 'Slack — Internal Operations Channels',
    shortName: 'Slack: Internal Ops',
    domain: 'Slack',
    status: 'Future',
    launchPhase: 'Planned',
    priority: 'P2',
    owner: 'Operations Lead',
    description: 'Internal Slack channels for staff operations: #coaches, #program-ops, #escalations, #data-team. Penny posts escalation alerts and cohort summaries to internal channels.',
    purpose: 'Penny alerts coaches to escalation events and posts weekly cohort briefs to internal channels. Read-only for internal history retrieval.',
    systemRole: 'Internal Operations Channel',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'chat:write', purpose: 'Post escalation alerts and cohort summaries to internal channels', minimumRequired: true, approver: 'Slack Workspace Admin' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'On escalation trigger or weekly summary schedule.',
    fieldMappings: [],
    syncReadiness: mkChecks({}),
    relatedTrailOSModules: ['Operations Center', 'Communications & Collaboration'],
    relatedSfObjects: ['Program_Engagement__c'],
    relatedKnowledgeSources: [],
    relatedIntegrations: ['int-slack-learner','int-sf-pmm'],
    risks: ['Over-broad internal channel access could expose sensitive cohort data', 'Penny escalation messages must be clearly labelled as AI-generated'],
    blockers: [],
    nextSteps: ['Complete learner Slack integration first. Reuse Bolt app.'],
    readinessScore: 15,
  },

  // ── Google Chat ──────────────────────────────────────────────────────────

  {
    id: 'int-gchat-client',
    name: 'Google Chat — Client & Executive Sponsor Spaces',
    shortName: 'Google Chat: Client',
    domain: 'Google Chat',
    status: 'Needs Security Review',
    launchPhase: 'Planned',
    priority: 'P2',
    owner: 'Communications Lead',
    description: 'Google Chat spaces for client relationships and executive sponsor communication. Penny posts program summaries and milestone updates to client-facing spaces.',
    purpose: 'Automated, Penny-generated executive briefs posted to Google Chat spaces shared with client contacts and executive sponsors. Eliminates manual report drafting.',
    systemRole: 'Client & Executive Channel',
    authType: 'Service Account',
    authRequirements: [
      { scope: 'chat.spaces:read',         purpose: 'List spaces the bot has access to',                   minimumRequired: true,  approver: 'Google Workspace Admin' },
      { scope: 'chat.messages:create',     purpose: 'Post messages to client-facing spaces',               minimumRequired: true,  approver: 'Google Workspace Admin + Security Lead' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Monthly program brief trigger. Manual send for milestone updates.',
    fieldMappings: [],
    syncReadiness: mkChecks({
      'Permissions Known':      { status: 'Partial', notes: 'Service account scopes identified. Security review required before client-space access.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Accidental post to wrong client space is a reputational risk — needs approval gate.' },
    }),
    relatedTrailOSModules: ['Communications & Collaboration', 'Operations Center'],
    relatedSfObjects: ['Account','Contact'],
    relatedKnowledgeSources: [],
    relatedIntegrations: ['int-sf-npsp','int-gchat-project'],
    risks: ['Posting to wrong client space is a reputational risk — approval gate required', 'Client-facing Penny content must have human review before send', 'Space membership management could expose internal staff to client spaces'],
    blockers: ['Security review required before service account gets chat.messages:create in client spaces'],
    nextSteps: ['Security review of Chat API access model', 'Design mandatory approval gate for client-facing Penny messages', 'Map client contacts to Chat space IDs'],
    readinessScore: 25,
  },

  // ── Google Calendar ──────────────────────────────────────────────────────

  {
    id: 'int-calendar-program',
    name: 'Google Calendar — Program & Cohort Calendars',
    shortName: 'Calendar: Program',
    domain: 'Google Calendar',
    status: 'Prototype',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Communications Lead',
    description: 'Google Calendar API connection to program cohort calendars: sprint sessions, office hours, assessment windows, and module release dates.',
    purpose: 'Penny reads calendar events to trigger time-sensitive messages: pre-session reminders, assessment window alerts, and weekly review kickoffs. Calendar is the timing layer for all Penny interactions.',
    systemRole: 'Timing & Trigger Layer',
    authType: 'Service Account',
    authRequirements: [
      { scope: 'calendar.readonly',        purpose: 'Read calendar events for trigger logic',               minimumRequired: true,  approver: 'Google Workspace Admin' },
      { scope: 'calendar.events:read',     purpose: 'Read event details, attendees, recurrence',            minimumRequired: true,  approver: 'Google Workspace Admin' },
    ],
    syncDirection: 'Read Only',
    syncCadence: 'Real-time proximity triggers (24h, 1h, 15min before events).',
    fieldMappings: [
      { sourceField: 'Event.summary',      targetField: 'CalendarEvent.title',    direction: 'Source → Trail OS', notes: 'Used to classify event type.',              status: 'Proposed' },
      { sourceField: 'Event.start.dateTime', targetField: 'CalendarEvent.startAt', direction: 'Source → Trail OS', notes: 'Trigger window calculation.',            status: 'Confirmed' },
      { sourceField: 'Event.attendees',    targetField: 'CalendarEvent.learners', direction: 'Source → Trail OS', notes: 'Maps attendees to SF Contacts by email.', status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',    notes: 'Google Calendar live. Real events fetched via /api/calendar/events. GOOGLE_CALENDAR_REFRESH_TOKEN active.' },
      'Owner Assigned':         { status: 'Pass',    notes: 'Communications Lead.' },
      'Permissions Known':      { status: 'Pass',    notes: 'OAuth flow complete via /admin/integrations. calendar.readonly + calendar.events:read confirmed active.' },
      'Object Mapping Done':    { status: 'Partial', notes: 'CalendarPanel reads next 5 real events. Event → SF Service_Schedule__c mapping not yet confirmed.' },
      'Sync Direction Known':   { status: 'Pass',    notes: 'Read-only confirmed.' },
    }),
    relatedTrailOSModules: ['Communications & Collaboration', 'Penny Command Center'],
    relatedSfObjects: ['Service_Schedule__c','Service_Attendance__c'],
    relatedKnowledgeSources: ['src-future-calendar'],
    relatedIntegrations: ['int-slack-learner','int-sf-pmm'],
    risks: ['Attendee email → SF Contact mapping may fail for learners with multiple emails', 'Calendar event taxonomy is informal — "Sprint 2 Session 3" is not machine-parseable without naming standards'],
    blockers: [],
    nextSteps: ['Define calendar event naming convention for machine parsing', 'Map program-specific Calendar IDs for cohort-scoped event queries', 'Map calendar events to SF Service_Schedule__c records'],
    readinessScore: 65,
    pennyNote: 'Google Calendar is live — CalendarPanel shows next 5 real events with Penny-generated prep briefs. Event-triggered coaching messages (pre-session reminders) pending Penny Slack delivery integration.',
  },

  // ── LMS ─────────────────────────────────────────────────────────────────

  {
    id: 'int-lms-content',
    name: 'LMS Module Content API',
    shortName: 'LMS: Content',
    domain: 'LMS',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Curriculum Lead',
    description: 'API connection to LMS platform for reading published module content, lesson text, and associated resources. Feeds Penny\'s primary coaching context layer.',
    purpose: 'Penny needs module content to answer learner questions accurately. Without this, Penny is coaching blind — not knowing what the learner just studied.',
    systemRole: 'Learning Delivery Platform',
    authType: 'API Key',
    authRequirements: [
      { scope: 'modules:read',   purpose: 'Read all published module content and metadata',    minimumRequired: true,  approver: 'LMS Administrator' },
      { scope: 'lessons:read',   purpose: 'Read lesson text, activities, and embedded content', minimumRequired: true,  approver: 'LMS Administrator' },
      { scope: 'resources:read', purpose: 'Read resource attachments and external links',       minimumRequired: false, approver: 'LMS Administrator' },
    ],
    syncDirection: 'Read Only',
    syncCadence: '24-hour content refresh. On-publish webhook (future).',
    fieldMappings: [
      { sourceField: 'Module.title',           targetField: 'Module.name',          direction: 'Source → Trail OS', notes: 'Maps to Curriculum Studio module name.',    status: 'Confirmed' },
      { sourceField: 'Module.content',         targetField: 'Module.body',          direction: 'Source → Trail OS', notes: 'HTML → plain text for RAG pipeline.',      status: 'Proposed' },
      { sourceField: 'Module.published_at',    targetField: 'Module.publishedAt',   direction: 'Source → Trail OS', notes: 'Freshness indicator for Penny context.',   status: 'Confirmed' },
      { sourceField: 'Lesson.learning_objectives', targetField: 'Lesson.objectives', direction: 'Source → Trail OS', notes: 'Used for study coach planning.',          status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: 'LMS platform is live with published modules.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Curriculum Lead.' },
      'Permissions Known':      { status: 'Partial',     notes: 'API Key approach confirmed. Scopes being negotiated with LMS vendor.' },
      'Data Quality Verified':  { status: 'Not Started', notes: 'Module content not yet reviewed against Standards Studio compliance.' },
      'Sync Direction Known':   { status: 'Pass',        notes: 'Read-only confirmed.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'LMS downtime contingency: Penny falls back to Curriculum Studio content.' },
    }),
    relatedTrailOSModules: ['Curriculum Studio', 'Penny Command Center', 'Knowledge Library'],
    relatedSfObjects: ['Training_Plan__c','Training_Plan_Item__c'],
    relatedKnowledgeSources: ['src-lms-modules'],
    relatedIntegrations: ['int-lms-completion','int-sf-assessments','int-sf-pmm'],
    risks: ['LMS vendor API documentation not yet reviewed — scope may differ from expectation', 'HTML content conversion may lose important formatting (code blocks, tables)', 'Module content update frequency not known — stale context risk'],
    blockers: ['LMS API key needs to be requested from LMS vendor/admin'],
    nextSteps: ['Request API documentation and sandbox access from LMS vendor', 'Test content extraction and HTML conversion', 'Confirm module → SF Training_Plan__c sync mapping'],
    readinessScore: 42,
  },

  {
    id: 'int-lms-completion',
    name: 'LMS Completion Events / Webhooks',
    shortName: 'LMS: Completion Events',
    domain: 'LMS',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Curriculum Lead',
    description: 'LMS webhook for module and lesson completion events. Triggers Penny reflection prompts, progress updates, and coaching messages in real-time when a learner finishes a module.',
    purpose: 'Without completion webhooks, Penny cannot react to a learner finishing a module in real-time. This is the primary trigger for post-module reflections and coaching nudges.',
    systemRole: 'Completion Trigger',
    authType: 'Webhook',
    authRequirements: [
      { scope: 'completion_event:subscribe', purpose: 'Receive POST on module/lesson completion',  minimumRequired: true,  approver: 'LMS Administrator' },
      { scope: 'Webhook signing secret',     purpose: 'Verify webhook authenticity (HMAC)',       minimumRequired: true,  approver: 'LMS Administrator' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Real-time on learner completion action.',
    fieldMappings: [
      { sourceField: 'event.user_id',     targetField: 'LearnerEvent.lmsUserId',   direction: 'Source → Trail OS', notes: 'Map to SF Contact via email.',                status: 'Proposed' },
      { sourceField: 'event.module_id',   targetField: 'LearnerEvent.moduleId',    direction: 'Source → Trail OS', notes: 'Map to Curriculum Studio module.',            status: 'Proposed' },
      { sourceField: 'event.completed_at', targetField: 'LearnerEvent.completedAt', direction: 'Source → Trail OS', notes: 'Timestamp for Penny trigger.',              status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Partial',     notes: 'LMS has webhook support. Not yet configured.' },
      'Permissions Known':      { status: 'Partial',     notes: 'Webhook endpoint URL needed. HMAC secret exchange not done.' },
      'Object Mapping Done':    { status: 'Not Started', notes: 'LMS user_id → SF Contact mapping not confirmed.' },
    }),
    relatedTrailOSModules: ['Curriculum Studio', 'Penny Command Center'],
    relatedSfObjects: ['Training_Plan_Item__c','Program_Engagement__c'],
    relatedKnowledgeSources: ['src-lms-modules'],
    relatedIntegrations: ['int-lms-content','int-sf-assessments'],
    risks: ['LMS user_id may not cleanly map to SF Contact — email-based matching may have collisions', 'Webhook delivery failures (retries, idempotency) not yet designed', 'Multiple completion events for re-attempted modules could trigger duplicate Penny messages'],
    blockers: ['Trail OS needs a public webhook endpoint — requires deployment first'],
    nextSteps: ['Deploy Trail OS API to get public endpoint', 'Configure LMS webhook with endpoint + HMAC secret', 'Test completion event payload format'],
    readinessScore: 30,
  },

  // ── Assessments ──────────────────────────────────────────────────────────

  {
    id: 'int-assessment-results',
    name: 'Assessment Result Sync to Salesforce',
    shortName: 'Assessments: Results Sync',
    domain: 'Assessments',
    status: 'Needs Admin Setup',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Curriculum Lead',
    description: 'Pipeline to sync assessment scores and pass/fail results from the LMS assessment engine into Salesforce Training_Plan_Item__c records. Makes assessment data available to Penny via Salesforce API.',
    purpose: 'Assessment results must live in Salesforce to be accessible to Penny at query time. This sync is the bridge between LMS assessment events and Salesforce learner records.',
    systemRole: 'Assessment Data Pipeline',
    authType: 'Webhook',
    authRequirements: [
      { scope: 'Training_Plan_Item__c:write', purpose: 'Write assessment scores and status to Salesforce', minimumRequired: true, approver: 'Salesforce Admin' },
    ],
    syncDirection: 'Write Only',
    syncCadence: 'Real-time on assessment submission event.',
    fieldMappings: [
      { sourceField: 'Assessment.score',      targetField: 'Training_Plan_Item__c.Score__c',      direction: 'Source → Trail OS', notes: 'Normalise to 0–100 scale.',                    status: 'Proposed' },
      { sourceField: 'Assessment.passed',     targetField: 'Training_Plan_Item__c.Status__c',     direction: 'Source → Trail OS', notes: 'Boolean → Pass / Fail / Not Attempted.',       status: 'Proposed' },
      { sourceField: 'Assessment.submitted_at', targetField: 'Training_Plan_Item__c.Completed_Date__c', direction: 'Source → Trail OS', notes: 'Timestamp.',                           status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: 'LMS runs assessments. Results are available.' },
      'Permissions Known':      { status: 'Partial',     notes: 'SF write scope identified. Not yet provisioned.' },
      'Object Mapping Done':    { status: 'Partial',     notes: '40% of items missing category mapping — affects Penny personalisation.' },
      'Sync Direction Known':   { status: 'Pass',        notes: 'Write-only to Salesforce confirmed.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Duplicate write on re-attempt not yet handled.' },
    }),
    relatedTrailOSModules: ['Curriculum Studio', 'Penny Command Center', 'Knowledge Library'],
    relatedSfObjects: ['Training_Plan_Item__c','Training_Plan__c','Program_Engagement__c'],
    relatedKnowledgeSources: ['src-assessments'],
    relatedIntegrations: ['int-lms-completion','int-sf-assessments'],
    risks: ['Re-attempt scenarios could create duplicate Training_Plan_Item__c records', 'Score normalisation errors could corrupt learner progress data', 'Write failures could leave Salesforce out of sync with LMS state'],
    blockers: ['Depends on LMS Completion Events integration being configured first'],
    nextSteps: ['Define upsert logic for re-attempt scenarios', 'Test score normalisation pipeline', 'Implement write error alerting'],
    readinessScore: 32,
  },

  // ── Penny Services ───────────────────────────────────────────────────────

  {
    id: 'int-penny-slack',
    name: 'Penny Slack Bot (POC)',
    shortName: 'Penny: Slack Bot',
    domain: 'Penny Services',
    status: 'Prototype',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Penny Product Lead',
    description: 'Penny\'s Slack Bot — the user-facing interface for all Penny learner interactions. Built with Slack Bolt. Penny receives messages, routes them to the AI pipeline, and sends responses. ⚠️ AI code is not yet imported into Trail OS.',
    purpose: 'The Penny Slack Bot is the delivery mechanism for all learner-facing Penny interactions. Without it, Penny has no communication channel. This is a critical path dependency for all Penny capabilities.',
    systemRole: 'Intelligence Delivery Interface',
    authType: 'OAuth 2.0',
    authRequirements: [
      { scope: 'chat:write',            purpose: 'Send Penny messages to learner DMs and channels',    minimumRequired: true,  approver: 'Slack Workspace Admin' },
      { scope: 'app_mentions:read',     purpose: 'Receive messages when learner @mentions Penny',       minimumRequired: true,  approver: 'Slack Workspace Admin' },
      { scope: 'im:history',            purpose: 'Read recent conversation context (consent required)', minimumRequired: false, approver: 'Slack Workspace Admin + Legal' },
      { scope: 'reactions:read',        purpose: 'Read emoji reactions for usefulness signals',         minimumRequired: false, approver: 'Slack Workspace Admin' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Inbound: message events. Outbound: on Penny trigger (coach request, module completion, calendar event, weekly schedule).',
    fieldMappings: [
      { sourceField: 'Slack message event',  targetField: 'PennyLog.inboundMessage',   direction: 'Source → Trail OS', notes: 'Logged for quality review and feedback loop.', status: 'Proposed' },
      { sourceField: 'Penny response',       targetField: 'PennyLog.outboundMessage',  direction: 'Trail OS → Source', notes: 'Penny response sent via Slack API.',           status: 'Proposed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',        notes: '@penny bot live — SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET all active. Posting to #penny-ai and #admin confirmed.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Penny Product Lead.' },
      'Permissions Known':      { status: 'Partial',     notes: 'Core scopes active. channels:read + groups:read pending for channel name resolution. im:history requires legal/consent review.' },
      'Data Quality Verified':  { status: 'Not Started', notes: 'Learner Slack account coverage not yet measured.' },
      'Error Handling Planned': { status: 'Not Started', notes: 'Message delivery failure logging and retry not designed.' },
      'Rollback Plan Documented': { status: 'Not Started', notes: 'Fallback to email if Slack bot is unavailable not documented.' },
    }),
    relatedTrailOSModules: ['Penny Command Center', 'Communications & Collaboration'],
    relatedSfObjects: ['Program_Engagement__c','Contact'],
    relatedKnowledgeSources: ['src-future-slack'],
    relatedIntegrations: ['int-slack-learner','int-penny-llm','int-sf-pmm'],
    risks: ['Message rate limiting could delay cohort-wide broadcast events', 'Conversation history consent model not yet designed', 'Learner DM delivery pending learner channel setup (int-slack-learner)'],
    blockers: ['Legal review of conversation logging consent needed before im:history scope can be activated'],
    nextSteps: ['Add channels:read + groups:read scopes', 'Design conversation logging consent flow', 'Set up learner DM delivery via int-slack-learner'],
    readinessScore: 58,
    pennyNote: '@penny Slack bot is live and posting to #penny-ai and #admin channels. Gemini 2.5 Flash powers responses. Learner DM and cohort channel delivery pending Slack Learner integration setup.',
  },

  {
    id: 'int-penny-llm',
    name: 'Penny LLM / AI Service — Gemini 2.5 Flash',
    shortName: 'Penny: Gemini AI',
    domain: 'Penny Services',
    status: 'Prototype',
    launchPhase: 'Planned',
    priority: 'P1',
    owner: 'Penny Product Lead',
    description: 'Gemini 2.5 Flash integration powering all Penny AI surfaces. GEMINI_API_KEY active with billing confirmed (serviceTier: standard). Four live endpoints: POST /api/penny/ask (staff Ask Penny panel), POST /api/penny/slack (Slack bot responses), GET /api/learner/daily-quest (quest generation), POST /api/penny/data/learner/chat (learner Penny chat). Retry logic (3 attempts, 1s/2s backoff) and Penny_Interaction_Log__c write-back active.',
    purpose: 'The AI engine that makes Penny intelligent. Gemini 2.5 Flash executes prompt templates with Trail OS context (learner, program, knowledge) across four surfaces. All Penny AI is consolidated on Gemini — Anthropic was evaluated but not used.',
    systemRole: 'AI Intelligence Engine',
    authType: 'API Key',
    authRequirements: [
      { scope: 'GEMINI_API_KEY',         purpose: 'Authenticate to Gemini 2.5 Flash API',                  minimumRequired: true,  approver: 'Penny Product Lead' },
      { scope: 'serviceTier:standard',   purpose: 'Paid billing tier for production usage',                 minimumRequired: true,  approver: 'Penny Product Lead' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Per-request (synchronous). Retry loop: 3 attempts with 1s / 2s backoff on 503/429/overload.',
    fieldMappings: [
      { sourceField: 'Trail OS context envelope',  targetField: 'LLM.systemPrompt',    direction: 'Trail OS → Source', notes: 'Learner + program + knowledge context injected at runtime.', status: 'Confirmed' },
      { sourceField: 'User query',                 targetField: 'LLM.userMessage',     direction: 'Trail OS → Source', notes: 'Raw learner query. PII excluded from context window.',       status: 'Confirmed' },
      { sourceField: 'Gemini response',            targetField: 'PennyResponse.body',  direction: 'Source → Trail OS', notes: 'Response logged to Penny_Interaction_Log__c in Salesforce.', status: 'Confirmed' },
    ],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Pass',    notes: 'Gemini 2.5 Flash API live. GEMINI_API_KEY confirmed valid. serviceTier: standard (billing active).' },
      'Owner Assigned':         { status: 'Pass',    notes: 'Penny Product Lead.' },
      'Permissions Known':      { status: 'Pass',    notes: 'API key active. Rate limits: standard tier. maxOutputTokens: 1024 configured for thinking budget.' },
      'Data Quality Verified':  { status: 'Partial', notes: 'PII filter in context injection — Contact.Email and raw scores excluded. Must be reviewed when new context variables are added.' },
      'Error Handling Planned': { status: 'Partial', notes: 'Retry loop (3 attempts, 1s/2s backoff) handles 503/429/overload. "Try again" UI button on retryable errors. Dead-letter queue not yet designed.' },
      'Sync Direction Known':   { status: 'Pass',    notes: 'Event-driven per-request. Write-back: Penny_Interaction_Log__c in Salesforce.' },
    }),
    relatedTrailOSModules: ['Penny Command Center', 'Standards Studio'],
    relatedSfObjects: ['Penny_Interaction_Log__c'],
    relatedKnowledgeSources: ['src-standards-studio','src-penny-generated'],
    relatedIntegrations: ['int-penny-slack','int-penny-rag','int-sf-pmm'],
    risks: ['PII must never enter LLM context — filter is live but requires review for every new context variable added', 'Prompt injection from learner inputs not yet mitigated', 'Hallucination risk for knowledge retrieval prompts — RAG pipeline (int-penny-rag) needed for cited answers'],
    blockers: [],
    nextSteps: ['Implement prompt injection mitigation (prompt boundary enforcement)', 'Add cohort-scale load testing against standard-tier rate limits', 'Connect RAG pipeline (int-penny-rag) for cited knowledge retrieval'],
    readinessScore: 82,
    pennyNote: 'Gemini 2.5 Flash is live across all four Penny surfaces: Ask Penny panel (/api/penny/ask), Slack bot (/api/penny/slack), daily quest generation (/api/learner/daily-quest), and learner Penny chat (/api/penny/data/learner/chat). Anthropic was evaluated and removed — Gemini is the single AI provider.',
  },

  {
    id: 'int-penny-rag',
    name: 'Penny RAG / Knowledge Pipeline (POC)',
    shortName: 'Penny: Knowledge RAG',
    domain: 'Penny Services',
    status: 'Prototype',
    launchPhase: 'Planned',
    priority: 'P2',
    owner: 'Penny Product Lead',
    description: 'Retrieval-Augmented Generation pipeline that indexes approved knowledge sources into a vector store, enabling Penny to retrieve accurate, cited answers. Sources: SF Knowledge, LMS modules, Curriculum Studio, Source Docs.',
    purpose: 'RAG ensures Penny answers knowledge questions from real content rather than LLM hallucination. The Knowledge Source Registry defines what enters the RAG pipeline.',
    systemRole: 'Knowledge Retrieval Engine',
    authType: 'API Key',
    authRequirements: [
      { scope: 'Vector store API key',    purpose: 'Read/write vector embeddings for knowledge chunks',  minimumRequired: true,  approver: 'Penny Product Lead' },
      { scope: 'Embedding model access',  purpose: 'Generate embeddings for knowledge content',          minimumRequired: true,  approver: 'Penny Product Lead' },
    ],
    syncDirection: 'Event-Driven',
    syncCadence: 'Re-index on knowledge source update. Initial full index on launch.',
    fieldMappings: [],
    syncReadiness: mkChecks({
      'Source Exists':          { status: 'Not Started', notes: 'Vector store provider not yet selected. Gemini confirmed as embedding/generation model.' },
      'Owner Assigned':         { status: 'Pass',        notes: 'Penny Product Lead.' },
      'Data Quality Verified':  { status: 'Not Started', notes: 'All source content must pass Standards Studio review before RAG ingestion.' },
    }),
    relatedTrailOSModules: ['Penny Command Center', 'Knowledge Library', 'Standards Studio'],
    relatedSfObjects: ['Knowledge__kav'],
    relatedKnowledgeSources: ['src-sf-mission-delivery','src-sf-technology','src-lms-modules','src-curriculum-studio','src-gdrive-source-docs'],
    relatedIntegrations: ['int-penny-llm','int-sf-knowledge','int-lms-content'],
    risks: ['Stale source content in RAG leads to hallucinated or outdated answers', 'Vector store costs scale with index size — chunking strategy affects cost', 'RAG retrieval accuracy depends on quality of Standards Studio-compliant source content'],
    blockers: ['LLM API integration must be ready first', 'Knowledge source integrations (SF Knowledge, LMS) must be live to feed RAG'],
    nextSteps: ['Select vector store provider (Pinecone, Weaviate, pgvector)', 'Design chunking strategy for Knowledge articles and LMS content', 'Build quality gate: only Standards-compliant content enters RAG'],
    readinessScore: 10,
    pennyNote: 'RAG is what makes Penny accurate instead of generic. The Knowledge Source Registry (governance) and Prompt Studio (retrieval rules) define the architecture. This integration implements it in code.',
  },
];

// ── Data Flow Map ────────────────────────────────────────────────────────────

export const dataFlowNodes: DataFlowNode[] = [
  {
    id: 'node-sf',
    label: 'Salesforce',
    systemRole: 'System of Record',
    description: 'Source of truth for all learner identity, enrollment, program progress, assessments, and organizational knowledge.',
    cls: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]',
    outbound: [
      { targetId: 'node-trail-os', label: 'PMM, Knowledge, Assessments, Contacts', direction: 'send', note: 'REST API + SOQL. Core data read by Trail OS on every interaction.' },
      { targetId: 'node-penny',    label: 'Learner context + Knowledge articles',  direction: 'send', note: 'Penny queries SF directly for coaching context (SOQL).' },
    ],
  },
  {
    id: 'node-gdrive',
    label: 'Google Drive',
    systemRole: 'Content Repository',
    description: 'Program materials, coach guides, sprint resources, and source documents not yet in Salesforce.',
    cls: 'border-green-300 bg-[#E6F0EA] text-[#245531]',
    outbound: [
      { targetId: 'node-trail-os', label: 'Indexed file content',  direction: 'send', note: '6h refresh. Files indexed into Source Document Archive and Penny RAG.' },
      { targetId: 'node-penny',    label: 'Supplementary context', direction: 'send', note: 'Fallback source for edge-case questions not answered by SF Knowledge.' },
    ],
  },
  {
    id: 'node-trail-os',
    label: 'Trail OS',
    systemRole: 'Operating Platform',
    description: 'The unified shell. Receives data from all sources and routes it to the appropriate module.',
    cls: 'border-primary/30 bg-primary/5 text-primary',
    outbound: [
      { targetId: 'node-penny',   label: 'Source data + Prompt Templates', direction: 'send', note: 'Trail OS assembles the Penny context envelope: variables + source-resolved content.' },
      { targetId: 'node-sf',      label: 'Penny logs + Assessment writes', direction: 'send', note: 'Write-back: Penny activity logs and synced assessment results.' },
    ],
  },
  {
    id: 'node-penny',
    label: 'Penny',
    systemRole: 'Intelligence Layer',
    description: 'AI coaching assistant. Retrieves context from approved sources, applies Prompt Studio templates, validates against Standards Studio, delivers via communications channels.',
    cls: 'border-secondary/30 bg-secondary/10 text-secondary',
    outbound: [
      { targetId: 'node-comms',   label: 'Coaching messages + Reflections', direction: 'send', note: 'Penny sends formatted output to Slack DMs and cohort channels.' },
      { targetId: 'node-trail-os', label: 'Penny logs + Quality review data', direction: 'send', note: 'All outputs logged back to Trail OS for quality review.' },
    ],
  },
  {
    id: 'node-comms',
    label: 'Communications',
    systemRole: 'Delivery Channels',
    description: 'Slack (learner), Google Chat (client/executive), email. Penny-generated content delivered to the right channel for each audience.',
    cls: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]',
    outbound: [
      { targetId: 'node-penny',   label: 'Learner messages + Reactions', direction: 'send', note: 'Inbound learner messages trigger Penny response pipeline.' },
    ],
  },
  {
    id: 'node-calendar',
    label: 'Calendar',
    systemRole: 'Timing Layer',
    description: 'Google Calendar. Program sessions, sprint schedules, and assessment windows provide Penny with time-aware context for reminders and weekly reviews.',
    cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]',
    outbound: [
      { targetId: 'node-penny',   label: 'Event triggers (24h, 1h, 15min)', direction: 'send', note: 'Calendar proximity events fire Penny reminder and check-in interactions.' },
    ],
  },
  {
    id: 'node-lms',
    label: 'LMS',
    systemRole: 'Learning Platform',
    description: 'Delivers modules and assessments to learners. Completion events trigger Penny interactions. Content feeds Penny coaching context.',
    cls: 'border-orange-300 bg-[#FFF3E0] text-[#CC8400]',
    outbound: [
      { targetId: 'node-sf',      label: 'Assessment results (write)',  direction: 'send', note: 'Scores written to SF Training_Plan_Item__c via pipeline.' },
      { targetId: 'node-penny',   label: 'Completion event triggers',   direction: 'send', note: 'Module completion webhooks fire Penny reflection prompts.' },
      { targetId: 'node-trail-os', label: 'Module content (24h sync)',  direction: 'send', note: 'Module content indexed into Penny RAG pipeline.' },
    ],
  },
];

// ── Risk Register ─────────────────────────────────────────────────────────────

export const risks: RiskEntry[] = [
  { id: 'risk-dup-sources',    title: 'Duplicate Source Content',      description: 'Same knowledge content exists in both SF Knowledge and Google Drive, causing Penny to retrieve conflicting versions.',          affectedIntegrations: ['int-sf-knowledge','int-gdrive-foundations'],         severity: 'High',     likelihood: 'Likely',   mitigation: 'Knowledge Source Registry defines priority order. SF Knowledge is authoritative; Drive is fallback only. RAG pipeline deduplicates on ingest.', owner: 'Knowledge Lead',     status: 'Open' },
  { id: 'risk-missing-owners', title: 'Missing Source Owners',         description: 'Integration sources without assigned owners have no accountability for data quality, review cycles, or incident response.',   affectedIntegrations: ['int-sf-volunteer','int-gchat-project'],               severity: 'Medium',   likelihood: 'Likely',   mitigation: 'Integration Catalog flags all sources without owners. Owner assignment is a P1 readiness check — no integration enters testing without it.', owner: 'Operations Lead',    status: 'Open' },
  { id: 'risk-stale-content',  title: 'Stale Content in RAG Pipeline', description: 'Knowledge articles or LMS content not refreshed before the 90-day threshold enters the RAG pipeline and gives Penny outdated context.', affectedIntegrations: ['int-sf-knowledge','int-lms-content','int-penny-rag'], severity: 'High',     likelihood: 'Possible', mitigation: 'Quality gate on RAG ingest: articles older than 90 days are excluded. Stale article alerts surface in Source Health view.', owner: 'Knowledge Lead',     status: 'Open' },
  { id: 'risk-broad-perms',    title: 'Over-Broad Permissions',        description: 'Service accounts or OAuth tokens granted more access than needed, increasing blast radius of a credential compromise.',           affectedIntegrations: ['int-gdrive-foundations','int-sf-pmm','int-penny-slack'], severity: 'Critical', likelihood: 'Possible', mitigation: 'Auth Requirements documented with minimum required scopes. Security review gate before any production credential is provisioned.', owner: 'Security Lead',      status: 'Open' },
  { id: 'risk-sync-direction', title: 'Unclear Sync Direction',        description: 'Bidirectional sync configured where read-only was intended, enabling unintended writes to the system of record.',               affectedIntegrations: ['int-sf-pmm','int-assessment-results'],                severity: 'High',     likelihood: 'Possible', mitigation: 'Sync direction documented per integration in Sync Readiness view. Write scope explicitly approved separately from read scope.', owner: 'Salesforce Admin',   status: 'Open' },
  { id: 'risk-unsupported-fields', title: 'Unsupported Salesforce Fields', description: 'Custom Salesforce fields used in Trail OS field mappings that do not exist in the org, causing silent data loss.',        affectedIntegrations: ['int-sf-pmm','int-sf-assessments','int-assessment-results'], severity: 'Medium', likelihood: 'Possible', mitigation: 'Field mapping confirmed in Salesforce sandbox before production. All custom field names validated against org schema.', owner: 'Salesforce Admin',   status: 'Open' },
  { id: 'risk-pii-llm',        title: 'PII in LLM Context Windows',    description: 'Learner email, name, or assessment scores passed directly to LLM provider without sanitisation, creating a data compliance risk.', affectedIntegrations: ['int-penny-llm','int-penny-rag'],                      severity: 'Critical', likelihood: 'Likely',   mitigation: 'PII filter mandatory before any data enters LLM. Contact.Email and raw scores are never in context windows — anonymised identifiers only.', owner: 'Penny Product Lead', status: 'Open' },
  { id: 'risk-sf-limits',      title: 'Salesforce API Governor Limits', description: 'Real-time SOQL queries per Penny interaction could exhaust daily API limits during large cohort events.',                       affectedIntegrations: ['int-sf-pmm','int-sf-assessments','int-sf-npsp'],      severity: 'High',     likelihood: 'Possible', mitigation: 'Implement caching layer for frequently-accessed Salesforce data. Batch non-urgent queries. Monitor daily API usage.', owner: 'Salesforce Admin',   status: 'Open' },
  { id: 'risk-schema-drift',   title: 'Salesforce Schema Drift',       description: 'Salesforce Admin changes custom object field names or removes fields that Trail OS field mappings depend on, breaking integrations.', affectedIntegrations: ['int-sf-pmm','int-sf-assessments','int-sf-knowledge'], severity: 'Medium',   likelihood: 'Possible', mitigation: 'Salesforce change management process must include Trail OS compatibility review. Key field names documented and locked.', owner: 'Salesforce Admin',   status: 'Open' },
  { id: 'risk-lms-docs',       title: 'LMS API Documentation Gaps',   description: 'LMS vendor API documentation is incomplete or does not match the actual API behavior, causing integration failures.',              affectedIntegrations: ['int-lms-content','int-lms-completion'],               severity: 'Medium',   likelihood: 'Likely',   mitigation: 'Request sandbox access and test against real API before finalising mapping. Budget time for undocumented behavior discovery.', owner: 'Curriculum Lead',    status: 'Open' },
];

// ── Launch Plan ─────────────────────────────────────────────────────────────

export const launchMilestones: LaunchMilestone[] = [
  {
    id: 'ms-1',
    phase: 'Planned',
    title: 'Phase 1 — Salesforce Core & Identity',
    description: 'Establish the identity and data foundation. All Trail OS learner data reads from Salesforce.',
    integrationIds: ['int-sf-pmm','int-sf-npsp','int-sf-assessments'],
    dependencies: [],
    successCriteria: ['Trail OS reads learner enrollment from SF PMM', 'Contact identity linked across Trail OS + SF', 'Assessment scores readable by Penny'],
    estimatedEffort: '4–6 weeks',
    status: 'In Progress',
  },
  {
    id: 'ms-2',
    phase: 'Planned',
    title: 'Phase 2 — Knowledge & LMS Content',
    description: 'Connect knowledge sources and learning content. Penny gains access to real content for coaching.',
    integrationIds: ['int-sf-knowledge','int-lms-content','int-lms-completion'],
    dependencies: ['ms-1'],
    successCriteria: ['SF Knowledge articles indexed in Trail OS', 'LMS module content available to Penny', 'Module completion events trigger Penny pipeline'],
    estimatedEffort: '3–4 weeks',
    status: 'Not Started',
  },
  {
    id: 'ms-3',
    phase: 'Planned',
    title: 'Phase 3 — Penny Core + Slack Delivery',
    description: 'Penny goes live as a coaching assistant. Slack bot delivers messages to learners.',
    integrationIds: ['int-penny-llm','int-penny-slack','int-slack-learner'],
    dependencies: ['ms-1','ms-2'],
    successCriteria: ['Penny responds to learner messages in Slack DM', 'Penny coaching messages use real SF + LMS context', 'Penny logs written back to Trail OS'],
    estimatedEffort: '4–6 weeks (parallel with Phase 2)',
    status: 'Not Started',
  },
  {
    id: 'ms-4',
    phase: 'Planned',
    title: 'Phase 4 — Google Drive + Calendar',
    description: 'Connect program content repository and timing layer.',
    integrationIds: ['int-gdrive-foundations','int-calendar-program'],
    dependencies: ['ms-2'],
    successCriteria: ['Foundations Trail Drive content indexed and available', 'Calendar events trigger Penny reminders', 'Penny sends pre-session reminders 24h ahead'],
    estimatedEffort: '2–3 weeks',
    status: 'In Planning',
  },
  {
    id: 'ms-5',
    phase: 'Planned',
    title: 'Phase 5 — RAG Pipeline + Knowledge Quality',
    description: 'Penny gains the ability to retrieve cited answers from a vector knowledge store.',
    integrationIds: ['int-penny-rag','int-assessment-results'],
    dependencies: ['ms-2','ms-3'],
    successCriteria: ['Penny retrieves answers with source citations from vector store', 'Knowledge quality gate: only Standards-compliant content in RAG', 'Assessment results synced to SF in real-time'],
    estimatedEffort: '4–5 weeks',
    status: 'Not Started',
  },
  {
    id: 'ms-6',
    phase: 'Planned',
    title: 'Phase 6 — Internal Operations + Executive Channels',
    description: 'Penny posts escalation alerts to coaches and executive briefs to leadership.',
    integrationIds: ['int-slack-internal','int-gchat-client'],
    dependencies: ['ms-3'],
    successCriteria: ['Penny escalation alerts reach #coaches channel in Slack', 'Monthly executive briefs post to Google Chat spaces after human approval', 'Google Chat security review complete'],
    estimatedEffort: '2–3 weeks',
    status: 'Not Started',
  },
];

// ── Summary ───────────────────────────────────────────────────────────────────

export const IRC_SUMMARY = {
  total:       integrations.length,
  byStatus:    Object.fromEntries(
    (['Prototype','Ready to Configure','Needs Admin Setup','Needs Security Review','Blocked','Future'] as IntegrationStatus[])
      .map(s => [s, integrations.filter(i => i.status === s).length])
  ) as Record<IntegrationStatus, number>,
  byDomain:    Object.fromEntries(
    DOMAIN_ORDER.map(d => [d, integrations.filter(i => i.domain === d).length])
  ) as Record<IntegrationDomain, number>,
  p1Count:     integrations.filter(i => i.priority === 'P1').length,
  openRisks:   risks.filter(r => r.status === 'Open').length,
  criticalRisks: risks.filter(r => r.severity === 'Critical' && r.status === 'Open').length,
  avgReadiness: Math.round(integrations.reduce((sum, i) => sum + i.readinessScore, 0) / integrations.length),
  phases:      launchMilestones.length,
};
