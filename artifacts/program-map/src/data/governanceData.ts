// Object Lifecycle & Governance — data for all 20 UOM object types

export type LifecycleColor =
  | 'sky' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'teal' | 'slate' | 'rose' | 'pink' | 'blue';
export type IssueLevel = 'critical' | 'warning' | 'info';
export type ReviewStatus = 'current' | 'overdue' | 'upcoming' | 'not-scheduled';
export type ComplianceLevel = 'compliant' | 'partial' | 'non-compliant' | 'not-assessed';

export interface LifecycleStage {
  id: string;
  label: string;
  description: string;
  color: LifecycleColor;
  entry: string[];
  exit: string[];
  checkpoint?: string;
}
export interface LifecycleModel {
  objectTypeId: string;
  objectTypeName: string;
  layer: string;
  stages: LifecycleStage[];
  retirementCriteria: string[];
  note?: string;
}
export interface OwnershipEntry {
  objectTypeId: string;
  objectTypeName: string;
  layer: string;
  primaryOwner: string;
  secondaryOwner: string;
  team: string;
  approvalAuthority: string;
  reviewCadence: string;
  sourceOfTruth: string;
  standardsDeps: string[];
}
export interface GovHealthIssue {
  id: string;
  severity: IssueLevel;
  objectType: string;
  objectName?: string;
  issue: string;
  impact: string;
  action: string;
  dueDate?: string;
}
export interface ComplianceEntry {
  objectTypeId: string;
  objectTypeName: string;
  layer: string;
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  topGap: string;
  lastChecked: string;
}
export interface ApprovalWorkflow {
  id: string;
  objectTypeId: string;
  objectTypeName: string;
  trigger: string;
  steps: string[];
  approvers: string[];
  sla: string;
  escalation: string;
}
export interface ReviewCycle {
  objectTypeId: string;
  objectTypeName: string;
  cadence: string;
  triggers: string[];
  owner: string;
  lastReview?: string;
  nextReview?: string;
  status: ReviewStatus;
}
export interface GovernancePolicy {
  id: string;
  category: string;
  title: string;
  body: string;
  appliesTo: string[];
  effective: string;
  owner: string;
}

// ── Lifecycle Models (all 20 types) ────────────────────────────────────────────
export const LIFECYCLE_MODELS: LifecycleModel[] = [
  {
    objectTypeId: 'program', objectTypeName: 'Program', layer: 'Program',
    stages: [
      { id: 'proposed',  label: 'Proposed',  description: 'Program concept submitted for review.', color: 'sky',     entry: ['Business need identified'], exit: ['Director approval'] },
      { id: 'planned',   label: 'Planned',   description: 'Blueprint assigned; curriculum build begins.', color: 'indigo', entry: ['Blueprint assigned', 'Cohort capacity defined'], exit: ['Curriculum complete', 'Penny integration spec approved'] },
      { id: 'active',    label: 'Active',    description: 'Cohort running; live delivery and Penny support.', color: 'emerald', entry: ['First cohort enrolled'], exit: ['Final cohort completes'], checkpoint: 'Cohort retrospective' },
      { id: 'paused',    label: 'Paused',    description: 'Delivery paused pending review or resource change.', color: 'amber',   entry: ['Director decision'], exit: ['Director re-activation approval'] },
      { id: 'completed', label: 'Completed', description: 'All cohorts finished; outcomes documented.', color: 'teal',    entry: ['Final cohort + retrospective done'], exit: ['Archive decision'], checkpoint: 'Program retrospective' },
      { id: 'archived',  label: 'Archived',  description: 'Historical record only. No new cohorts.', color: 'slate',   entry: ['Director + Standards Lead sign-off'], exit: ['N/A — terminal state'] },
    ],
    retirementCriteria: ['No cohorts planned for 12+ months', 'Replaced by updated program', 'Organisation strategic direction change'],
  },
  {
    objectTypeId: 'cohort', objectTypeName: 'Cohort', layer: 'Program',
    stages: [
      { id: 'planned',   label: 'Planned',   description: 'Cohort created; learner enrollment open.', color: 'sky',     entry: ['Parent program Active', 'Capacity defined'], exit: ['Enrollment deadline reached'] },
      { id: 'enrolling', label: 'Enrolling', description: 'Learner applications under review.', color: 'indigo', entry: ['Enrollment open'], exit: ['Enrollment closed or capacity reached'], checkpoint: 'Enrollment review' },
      { id: 'active',    label: 'Active',    description: 'Cohort running; sprints in progress.', color: 'emerald', entry: ['Kick-off complete', 'Coach assigned'], exit: ['Final sprint complete'], checkpoint: 'Mid-cohort review' },
      { id: 'completed', label: 'Completed', description: 'All sprints done; outcomes recorded.', color: 'teal',    entry: ['Final sprint + assessment complete'], exit: ['Retrospective done'] },
      { id: 'archived',  label: 'Archived',  description: 'Historical record. Learner data retained.', color: 'slate',   entry: ['Retrospective complete'], exit: ['N/A'] },
    ],
    retirementCriteria: ['6 months post-completion', 'All learner records transferred to alumni status'],
  },
  {
    objectTypeId: 'sprint', objectTypeName: 'Sprint', layer: 'Program',
    stages: [
      { id: 'planned',  label: 'Planned',  description: 'Sprint content and schedule prepared.', color: 'sky',     entry: ['Parent cohort Active'], exit: ['Sprint start date reached'] },
      { id: 'active',   label: 'Active',   description: 'Sprint in progress; lessons and Penny support live.', color: 'emerald', entry: ['Start date', 'Facilitator guide published'], exit: ['All lessons complete + assessment submitted'] },
      { id: 'review',   label: 'Review',   description: 'Sprint output and learner results reviewed.', color: 'amber',   entry: ['All submissions received'], exit: ['Review complete'], checkpoint: 'Sprint review meeting' },
      { id: 'complete', label: 'Complete', description: 'Sprint closed; results recorded in Salesforce.', color: 'teal',    entry: ['Review approved'], exit: ['Next sprint starts'] },
      { id: 'archived', label: 'Archived', description: 'Sprint data archived with cohort.', color: 'slate',   entry: ['Parent cohort archived'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Parent cohort archived'],
  },
  {
    objectTypeId: 'module', objectTypeName: 'Module', layer: 'Program',
    stages: [
      { id: 'draft',    label: 'Draft',    description: 'Module outline created; content in progress.', color: 'sky',     entry: ['Blueprint assigned'], exit: ['Content complete'] },
      { id: 'review',   label: 'Review',   description: 'Curriculum Lead and Standards Lead review.', color: 'amber',   entry: ['Draft complete'], exit: ['Review approved'], checkpoint: 'Blueprint compliance check' },
      { id: 'approved', label: 'Approved', description: 'Module meets blueprint; ready for live use.', color: 'indigo', entry: ['Standards review passed'], exit: ['Program activation'] },
      { id: 'active',   label: 'Active',   description: 'In use across active cohorts.', color: 'emerald', entry: ['Parent sprint active'], exit: ['Replacement module approved or program retired'] },
      { id: 'retired',  label: 'Retired',  description: 'No longer in active use; historical record.', color: 'slate',   entry: ['Replacement available or program retired'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by updated module', 'Parent program retired'],
  },
  {
    objectTypeId: 'lesson', objectTypeName: 'Lesson', layer: 'Program',
    stages: [
      { id: 'draft',    label: 'Draft',    color: 'sky',     description: 'Lesson content authored.',                        entry: ['Module approved'],         exit: ['Content complete'] },
      { id: 'review',   label: 'Review',   color: 'amber',   description: 'Curriculum and Standards review.',                entry: ['Draft complete'],           exit: ['Review approved'] },
      { id: 'approved', label: 'Approved', color: 'indigo',  description: 'Lesson meets blueprint; ready for delivery.',     entry: ['Standards review passed'], exit: ['Program activation'] },
      { id: 'active',   label: 'Active',   color: 'emerald', description: 'In live delivery.',                              entry: ['Sprint active'],           exit: ['Replacement or module retired'] },
      { id: 'retired',  label: 'Retired',  color: 'slate',   description: 'No longer delivered; archived.',                 entry: ['Replacement approved'],   exit: ['N/A'] },
    ],
    retirementCriteria: ['Parent module retired', 'Replaced by updated lesson'],
  },
  {
    objectTypeId: 'assessment', objectTypeName: 'Assessment', layer: 'Program',
    stages: [
      { id: 'draft',    label: 'Draft',    color: 'sky',     description: 'Assessment designed and criteria set.',           entry: ['Lesson/module draft'],     exit: ['Complete'] },
      { id: 'review',   label: 'Review',   color: 'amber',   description: 'Reviewed for validity and blueprint alignment.',  entry: ['Draft complete'],          exit: ['Approved'] },
      { id: 'approved', label: 'Approved', color: 'indigo',  description: 'Approved for use in live cohorts.',              entry: ['Review passed'],           exit: ['Cohort activation'] },
      { id: 'active',   label: 'Active',   color: 'emerald', description: 'In use; results tracked in Salesforce.',         entry: ['Cohort active'],           exit: ['Sprint end'] },
      { id: 'retired',  label: 'Retired',  color: 'slate',   description: 'Replaced or parent retired.',                    entry: ['Replacement available'],  exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by updated assessment', 'Module retired'],
  },
  {
    objectTypeId: 'knowledge-source', objectTypeName: 'Knowledge Source', layer: 'Knowledge',
    stages: [
      { id: 'proposed',  label: 'Proposed',      color: 'sky',     description: 'Source submitted for trust review.',              entry: ['Team submission'],          exit: ['Knowledge Manager assignment'] },
      { id: 'reviewing', label: 'Under Review',  color: 'amber',   description: 'Trust level and content assessed.',              entry: ['Assigned to reviewer'],     exit: ['Approval or rejection'], checkpoint: 'Trust review' },
      { id: 'approved',  label: 'Approved',      color: 'indigo',  description: 'Trust assigned; Penny activation pending.',      entry: ['Review passed'],            exit: ['Penny activation decision'] },
      { id: 'active',    label: 'Active',        color: 'emerald', description: 'Live in Penny and knowledge registry.',          entry: ['Penny Lead activation'],    exit: ['Review trigger or deprecation'] },
      { id: 'deprecated',label: 'Deprecated',   color: 'slate',   description: 'No longer used; Penny access revoked.',          entry: ['Penny Lead + Knowledge Lead decision'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Source no longer authoritative', 'Replaced by higher-trust source', '2+ failed quality reviews'],
  },
  {
    objectTypeId: 'knowledge-article', objectTypeName: 'Knowledge Article', layer: 'Knowledge',
    stages: [
      { id: 'draft',    label: 'Draft',    color: 'sky',     description: 'Article authored; not yet reviewed.',               entry: ['Knowledge Lead assignment'], exit: ['Draft complete'] },
      { id: 'review',   label: 'Review',   color: 'amber',   description: 'Content and accuracy reviewed.',                   entry: ['Draft submitted'],           exit: ['Approved or returned'] },
      { id: 'approved', label: 'Approved', color: 'indigo',  description: 'Approved; ready for Penny source linking.',        entry: ['Review passed'],             exit: ['Penny activation or publish'] },
      { id: 'active',   label: 'Active',   color: 'emerald', description: 'Published and live in Knowledge Library.',         entry: ['Knowledge Manager publish'],  exit: ['Review trigger or retirement'] },
      { id: 'retired',  label: 'Retired',  color: 'slate',   description: 'Replaced or out of date; archived.',              entry: ['Replacement available'],     exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by updated article', '6 months without review if flagged stale'],
  },
  {
    objectTypeId: 'standard', objectTypeName: 'Standard', layer: 'Knowledge',
    stages: [
      { id: 'draft',      label: 'Draft',      color: 'sky',     description: 'Standard authored by Standards Lead.',        entry: ['Governance decision'],     exit: ['Draft complete'] },
      { id: 'review',     label: 'Review',     color: 'amber',   description: 'Cross-team review for applicability.',        entry: ['Draft submitted'],         exit: ['Approved or revised'], checkpoint: 'Cross-team review' },
      { id: 'approved',   label: 'Approved',   color: 'indigo',  description: 'Formally approved by governance authority.', entry: ['Director + Standards Lead sign-off'], exit: ['Publication'] },
      { id: 'active',     label: 'Active',     color: 'emerald', description: 'Active — all governed objects must comply.',  entry: ['Approval + publication'], exit: ['Deprecation decision'] },
      { id: 'deprecated', label: 'Deprecated', color: 'slate',   description: 'Superseded by updated standard.',            entry: ['Replacement approved'],   exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by updated version', 'Platform direction change'],
  },
  {
    objectTypeId: 'program-blueprint', objectTypeName: 'Program Blueprint', layer: 'Knowledge',
    stages: [
      { id: 'draft',      label: 'Draft',      color: 'sky',     description: 'Blueprint authored for new program type.',     entry: ['Standards Lead assignment'], exit: ['Complete'] },
      { id: 'review',     label: 'Review',     color: 'amber',   description: 'Program Director and team review.',            entry: ['Draft complete'],             exit: ['Approved'], checkpoint: 'Blueprint review' },
      { id: 'approved',   label: 'Approved',   color: 'indigo',  description: 'Blueprint approved; governs new programs.',   entry: ['Director sign-off'],          exit: ['First program adoption'] },
      { id: 'active',     label: 'Active',     color: 'emerald', description: 'Active and governing programs.',              entry: ['First program compliant'],   exit: ['New version released'] },
      { id: 'deprecated', label: 'Deprecated', color: 'slate',   description: 'Superseded by updated blueprint version.',   entry: ['New version Active'],         exit: ['N/A'] },
    ],
    retirementCriteria: ['All governed programs migrated to new version', 'Program type discontinued'],
  },
  {
    objectTypeId: 'penny-capability', objectTypeName: 'Penny Capability', layer: 'Intelligence',
    stages: [
      { id: 'idea',        label: 'Idea',           color: 'sky',     description: 'Capability concept proposed.',              entry: ['Team proposal'],                   exit: ['Penny Lead assignment'] },
      { id: 'defined',     label: 'Defined',        color: 'blue',    description: 'Capability spec and prompt requirements defined.', entry: ['Penny Lead assigned'],        exit: ['Knowledge sources identified'] },
      { id: 'planned',     label: 'Planned',        color: 'indigo',  description: 'Prompt templates in authoring; knowledge sources in review.', entry: ['Prompt template draft'], exit: ['Prompt approved'] },
      { id: 'development', label: 'In Development', color: 'violet',  description: 'Building and testing with internal users.',  entry: ['Prompt + sources approved'],      exit: ['Quality threshold met'], checkpoint: 'Quality review' },
      { id: 'operational', label: 'Operational',    color: 'emerald', description: 'Live; serving learners/coaches.',           entry: ['Quality ≥ 80, Penny Lead sign-off'], exit: ['Retirement decision'] },
      { id: 'retired',     label: 'Retired',        color: 'slate',   description: 'Decommissioned; access revoked.',          entry: ['Penny Lead + Director decision'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Quality below 70 for 2+ consecutive reviews', 'Replaced by improved capability', 'Knowledge source deprecated'],
  },
  {
    objectTypeId: 'prompt-template', objectTypeName: 'Prompt Template', layer: 'Intelligence',
    stages: [
      { id: 'draft',       label: 'Draft',       color: 'sky',     description: 'Prompt authored by Penny team.',             entry: ['Capability planned'],     exit: ['Draft complete'] },
      { id: 'testing',     label: 'Testing',     color: 'amber',   description: 'Internal testing and hallucination review.', entry: ['Draft submitted'],        exit: ['Approved or revised'], checkpoint: 'Hallucination review' },
      { id: 'approved',    label: 'Approved',    color: 'indigo',  description: 'Approved for operational use.',             entry: ['Testing passed'],         exit: ['Operational activation'] },
      { id: 'operational', label: 'Operational', color: 'emerald', description: 'Live in Penny; serving interactions.',      entry: ['Penny Lead activation'],  exit: ['New version or retirement'] },
      { id: 'retired',     label: 'Retired',     color: 'slate',   description: 'Replaced or deprecated.',                   entry: ['Replacement Operational'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by newer version', 'Parent capability retired'],
  },
  {
    objectTypeId: 'person', objectTypeName: 'Person', layer: 'People',
    stages: [
      { id: 'onboarding', label: 'Onboarding', color: 'sky',     description: 'New team member; Salesforce + Drive setup.',   entry: ['Hire decision'],          exit: ['Setup complete'] },
      { id: 'active',     label: 'Active',     color: 'emerald', description: 'Fully operational in assigned roles.',        entry: ['Onboarding complete'],    exit: ['Leave or offboarding'] },
      { id: 'leave',      label: 'On Leave',   color: 'amber',   description: 'Temporarily unavailable; cover assigned.',    entry: ['Leave approved'],         exit: ['Return to Active'] },
      { id: 'offboarded', label: 'Offboarded', color: 'slate',   description: 'No longer active; records retained per policy.', entry: ['Offboarding process'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Employment ended', 'Contract concluded'],
  },
  {
    objectTypeId: 'role', objectTypeName: 'Role', layer: 'People',
    stages: [
      { id: 'proposed',   label: 'Proposed',   color: 'sky',     description: 'Role concept submitted for definition.',      entry: ['Org need identified'],    exit: ['Director approval'] },
      { id: 'defined',    label: 'Defined',    color: 'indigo',  description: 'Role Blueprint authored; responsibilities mapped.', entry: ['Approval granted'],  exit: ['Blueprint complete'] },
      { id: 'active',     label: 'Active',     color: 'emerald', description: 'Role filled and operating.',                  entry: ['At least one person assigned'], exit: ['Deprecation decision'] },
      { id: 'deprecated', label: 'Deprecated', color: 'slate',   description: 'Role no longer exists; responsibilities redistributed.', entry: ['Director decision'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Organisational restructure', 'Responsibilities merged into another role'],
  },
  {
    objectTypeId: 'communication-channel', objectTypeName: 'Communication Channel', layer: 'Infrastructure',
    stages: [
      { id: 'proposed', label: 'Proposed', color: 'sky',     description: 'Channel concept submitted.',                    entry: ['Team request'],         exit: ['Comms Lead approval'] },
      { id: 'setup',    label: 'Setup',    color: 'indigo',  description: 'Channel created; membership and purpose defined.', entry: ['Approval'],           exit: ['Membership set + purpose documented'] },
      { id: 'active',   label: 'Active',   color: 'emerald', description: 'Channel in operational use.',                  entry: ['Setup complete'],       exit: ['Archival decision'] },
      { id: 'archived', label: 'Archived', color: 'slate',   description: 'Channel closed; history retained.',            entry: ['Comms Lead + Program Director sign-off'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Parent program or cohort archived', 'Channel inactive for 90+ days'],
  },
  {
    objectTypeId: 'calendar', objectTypeName: 'Calendar', layer: 'Infrastructure',
    stages: [
      { id: 'draft',    label: 'Draft',    color: 'sky',     description: 'Calendar created; events being added.',          entry: ['Program/cohort planned'],  exit: ['Events complete'] },
      { id: 'published',label: 'Published',color: 'indigo',  description: 'Shared with relevant teams and learners.',       entry: ['Program Manager sign-off'], exit: ['Cohort starts'] },
      { id: 'active',   label: 'Active',   color: 'emerald', description: 'Live; events driving cohort operations.',       entry: ['Cohort active'],           exit: ['Cohort ends'] },
      { id: 'archived', label: 'Archived', color: 'slate',   description: 'Historical; events locked.',                   entry: ['Cohort archived'],         exit: ['N/A'] },
    ],
    retirementCriteria: ['Parent cohort archived'],
  },
  {
    objectTypeId: 'google-drive-resource', objectTypeName: 'Google Drive Resource', layer: 'Infrastructure',
    stages: [
      { id: 'created',   label: 'Created',   color: 'sky',     description: 'Resource created; structure being set up.',   entry: ['Program/cohort planned'], exit: ['Setup complete'] },
      { id: 'organised', label: 'Organised', color: 'indigo',  description: 'Named, structured, and permissions set.',    entry: ['Created'],               exit: ['Access control review'] },
      { id: 'active',    label: 'Active',    color: 'emerald', description: 'In regular use by team and learners.',       entry: ['Access control approved'], exit: ['Archival decision'] },
      { id: 'archived',  label: 'Archived',  color: 'slate',   description: 'Read-only; historical record.',             entry: ['Parent archived'],       exit: ['N/A'] },
    ],
    retirementCriteria: ['Parent program or cohort archived', 'Contents migrated to new structure'],
    note: 'Access control review required every 6 months.',
  },
  {
    objectTypeId: 'salesforce-object', objectTypeName: 'Salesforce Object', layer: 'Infrastructure',
    stages: [
      { id: 'proposed',    label: 'Proposed',    color: 'sky',     description: 'Object requirement proposed.',               entry: ['Ops team request'],          exit: ['Admin approval'] },
      { id: 'development', label: 'Development', color: 'indigo',  description: 'Object being built in sandbox.',            entry: ['Admin sign-off'],            exit: ['Dev complete'] },
      { id: 'testing',     label: 'Testing',     color: 'amber',   description: 'UAT in sandbox environment.',               entry: ['Development complete'],      exit: ['UAT passed'], checkpoint: 'UAT sign-off' },
      { id: 'production',  label: 'Production',  color: 'emerald', description: 'Live in Salesforce production org.',        entry: ['UAT + change-log entry'],    exit: ['Deprecation decision'] },
      { id: 'deprecated',  label: 'Deprecated',  color: 'slate',   description: 'No longer used; data retained per policy.', entry: ['Admin + Director decision'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Business process retired', 'Replaced by standard Salesforce object', 'Data migrated to replacement'],
  },
  {
    objectTypeId: 'decision', objectTypeName: 'Decision', layer: 'Governance',
    stages: [
      { id: 'proposed',  label: 'Proposed',  color: 'sky',     description: 'Decision request raised.',                    entry: ['Any team member'],        exit: ['Director or relevant authority review'] },
      { id: 'approved',  label: 'Approved',  color: 'indigo',  description: 'Decision made by authority.',               entry: ['Review complete'],         exit: ['Documentation'] },
      { id: 'recorded',  label: 'Recorded',  color: 'emerald', description: 'Decision documented in Org Memory.',         entry: ['Approval confirmed'],     exit: ['Review cycle'] },
      { id: 'reviewed',  label: 'Reviewed',  color: 'amber',   description: 'Decision re-examined; still valid?',         entry: ['Review trigger'],         exit: ['Confirmed or closed'], checkpoint: 'Decision review' },
      { id: 'closed',    label: 'Closed',    color: 'slate',   description: 'Decision closed; superseded or expired.',   entry: ['Review confirms closure'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Superseded by new decision', 'Context no longer relevant', '2 years old without review'],
  },
  {
    objectTypeId: 'integration', objectTypeName: 'Integration', layer: 'Infrastructure',
    stages: [
      { id: 'proposed',    label: 'Proposed',    color: 'sky',     description: 'Integration need identified.',               entry: ['Ops or program request'],   exit: ['Director approval'] },
      { id: 'planned',     label: 'Planned',     color: 'indigo',  description: 'Technical spec and vendor selection.',      entry: ['Approval'],                 exit: ['Vendor confirmed', 'Spec complete'] },
      { id: 'development', label: 'Development', color: 'violet',  description: 'Integration being built and connected.',   entry: ['Spec signed off'],          exit: ['Build complete'] },
      { id: 'testing',     label: 'Testing',     color: 'amber',   description: 'Testing in staging environment.',           entry: ['Build complete'],           exit: ['Tests passed'], checkpoint: 'Integration test sign-off' },
      { id: 'operational', label: 'Operational', color: 'emerald', description: 'Live in production; monitored.',           entry: ['Tests passed + SLA defined'], exit: ['Deprecation decision'] },
      { id: 'deprecated',  label: 'Deprecated',  color: 'slate',   description: 'Decommissioned; replaced or retired.',     entry: ['Director + Admin decision'], exit: ['N/A'] },
    ],
    retirementCriteria: ['Replaced by better integration', 'Vendor deprecated', 'Business process retired'],
  },
];

// ── Ownership Matrix ──────────────────────────────────────────────────────────
export const OWNERSHIP_MATRIX: OwnershipEntry[] = [
  { objectTypeId:'program',              objectTypeName:'Program',              layer:'Program',       primaryOwner:'Program Director',    secondaryOwner:'Curriculum Lead',  team:'Program Delivery',       approvalAuthority:'Program Director',           reviewCadence:'Per cohort + annual',        sourceOfTruth:'Salesforce',       standardsDeps:['Program Blueprint v2'] },
  { objectTypeId:'cohort',               objectTypeName:'Cohort',               layer:'Program',       primaryOwner:'Program Manager',     secondaryOwner:'Program Director', team:'Program Delivery',       approvalAuthority:'Program Director',           reviewCadence:'Per cohort start',           sourceOfTruth:'Salesforce',       standardsDeps:['Program Blueprint v2'] },
  { objectTypeId:'sprint',               objectTypeName:'Sprint',               layer:'Program',       primaryOwner:'Program Manager',     secondaryOwner:'Curriculum Lead',  team:'Program Delivery',       approvalAuthority:'Program Manager',            reviewCadence:'Per sprint review',          sourceOfTruth:'Salesforce',       standardsDeps:['Module Blueprint'] },
  { objectTypeId:'module',               objectTypeName:'Module',               layer:'Program',       primaryOwner:'Curriculum Lead',     secondaryOwner:'Program Director', team:'Curriculum',             approvalAuthority:'Standards Lead',             reviewCadence:'Per cohort + biannual',      sourceOfTruth:'Standards Studio', standardsDeps:['Module Blueprint', 'Lesson Blueprint'] },
  { objectTypeId:'lesson',               objectTypeName:'Lesson',               layer:'Program',       primaryOwner:'Curriculum Lead',     secondaryOwner:'Coach Lead',       team:'Curriculum',             approvalAuthority:'Standards Lead',             reviewCadence:'Per cohort',                 sourceOfTruth:'Standards Studio', standardsDeps:['Lesson Blueprint'] },
  { objectTypeId:'assessment',           objectTypeName:'Assessment',           layer:'Program',       primaryOwner:'Curriculum Lead',     secondaryOwner:'Program Manager',  team:'Curriculum',             approvalAuthority:'Standards Lead',             reviewCadence:'Per cohort',                 sourceOfTruth:'Salesforce',       standardsDeps:['Assessment Blueprint'] },
  { objectTypeId:'knowledge-source',     objectTypeName:'Knowledge Source',     layer:'Knowledge',     primaryOwner:'Knowledge Manager',   secondaryOwner:'Penny Lead',       team:'Knowledge & Penny',     approvalAuthority:'Knowledge Manager',          reviewCadence:'Quarterly',                  sourceOfTruth:'Knowledge Registry',standardsDeps:['Source Trust Standard'] },
  { objectTypeId:'knowledge-article',    objectTypeName:'Knowledge Article',    layer:'Knowledge',     primaryOwner:'Knowledge Manager',   secondaryOwner:'Subject Expert',   team:'Knowledge',             approvalAuthority:'Knowledge Manager',          reviewCadence:'Biannual',                   sourceOfTruth:'Google Drive / SF KB', standardsDeps:['Knowledge Article Standard'] },
  { objectTypeId:'standard',             objectTypeName:'Standard',             layer:'Knowledge',     primaryOwner:'Standards Lead',      secondaryOwner:'Program Director', team:'Standards & Quality',   approvalAuthority:'Director + Standards Lead',  reviewCadence:'Annual + major change',      sourceOfTruth:'Standards Studio', standardsDeps:[] },
  { objectTypeId:'program-blueprint',    objectTypeName:'Program Blueprint',    layer:'Knowledge',     primaryOwner:'Standards Lead',      secondaryOwner:'Program Director', team:'Standards & Quality',   approvalAuthority:'Director + Standards Lead',  reviewCadence:'Annual + major change',      sourceOfTruth:'Standards Studio', standardsDeps:[] },
  { objectTypeId:'penny-capability',     objectTypeName:'Penny Capability',     layer:'Intelligence',  primaryOwner:'Penny Lead',          secondaryOwner:'Curriculum Lead',  team:'Penny Governance',      approvalAuthority:'Penny Lead',                 reviewCadence:'Quarterly',                  sourceOfTruth:'Penny AI',         standardsDeps:['Penny Blueprint', 'Source Trust Standard'] },
  { objectTypeId:'prompt-template',      objectTypeName:'Prompt Template',      layer:'Intelligence',  primaryOwner:'Penny Lead',          secondaryOwner:'Knowledge Manager',team:'Penny Governance',      approvalAuthority:'Penny Lead',                 reviewCadence:'Per capability update',      sourceOfTruth:'Prompt Studio',    standardsDeps:['Prompt Governance Standard'] },
  { objectTypeId:'person',               objectTypeName:'Person',               layer:'People',        primaryOwner:'Program Director',    secondaryOwner:'Admin Lead',       team:'Operations',             approvalAuthority:'Program Director',           reviewCadence:'Annual',                     sourceOfTruth:'Salesforce',       standardsDeps:[] },
  { objectTypeId:'role',                 objectTypeName:'Role',                 layer:'People',        primaryOwner:'Program Director',    secondaryOwner:'Standards Lead',   team:'Program Delivery',       approvalAuthority:'Program Director',           reviewCadence:'Annual',                     sourceOfTruth:'Administration',   standardsDeps:['Role Blueprint'] },
  { objectTypeId:'communication-channel',objectTypeName:'Communication Channel',layer:'Infrastructure',primaryOwner:'Comms Lead',          secondaryOwner:'Program Manager',  team:'Operations',             approvalAuthority:'Comms Lead',                 reviewCadence:'Per cohort',                 sourceOfTruth:'Slack / Google Chat',standardsDeps:['Communication Blueprint'] },
  { objectTypeId:'calendar',             objectTypeName:'Calendar',             layer:'Infrastructure',primaryOwner:'Program Manager',     secondaryOwner:'Comms Lead',       team:'Operations',             approvalAuthority:'Program Manager',            reviewCadence:'Per cohort',                 sourceOfTruth:'Google Calendar',  standardsDeps:['Communication Blueprint'] },
  { objectTypeId:'google-drive-resource',objectTypeName:'Google Drive Resource',layer:'Infrastructure',primaryOwner:'Program Manager',     secondaryOwner:'Curriculum Lead',  team:'Program Delivery',       approvalAuthority:'Program Manager',            reviewCadence:'Bi-annual access review',    sourceOfTruth:'Google Drive',     standardsDeps:[] },
  { objectTypeId:'salesforce-object',    objectTypeName:'Salesforce Object',    layer:'Infrastructure',primaryOwner:'Salesforce Admin',    secondaryOwner:'Ops Lead',         team:'Systems & Operations',  approvalAuthority:'Admin + Director',           reviewCadence:'Quarterly data quality',     sourceOfTruth:'Salesforce',       standardsDeps:['Salesforce Architecture Standard'] },
  { objectTypeId:'decision',             objectTypeName:'Decision',             layer:'Governance',    primaryOwner:'Decision Authority',  secondaryOwner:'Knowledge Manager',team:'Leadership',             approvalAuthority:'Director or delegated lead', reviewCadence:'Annual or triggered',        sourceOfTruth:'Org Memory',       standardsDeps:[] },
  { objectTypeId:'integration',          objectTypeName:'Integration',          layer:'Infrastructure',primaryOwner:'Ops Lead',            secondaryOwner:'Salesforce Admin', team:'Systems & Operations',  approvalAuthority:'Director + Ops Lead',        reviewCadence:'Quarterly + on SLA breach',  sourceOfTruth:'Integration Registry', standardsDeps:['Integration Standard'] },
];

// ── Governance Health Issues (prototype) ───────────────────────────────────────
export const GOV_HEALTH_ISSUES: GovHealthIssue[] = [
  { id:'g1',  severity:'critical', objectType:'Role',                 objectName:'Coach',                          issue:'Role Blueprint only 60% complete — coaching responsibilities undocumented',      impact:'Coaches operating without formal accountability definition',          action:'Complete Role Blueprint by end of Cohort 2',                        dueDate:'Jun 30 2025' },
  { id:'g2',  severity:'critical', objectType:'Decision',                                                          issue:'3 undocumented decisions from Cohort 1 retrospective not recorded in Org Memory', impact:'Org Memory gap; future teams lack context for past choices',           action:'Record decisions in Org Memory this week',                          dueDate:'Jun 15 2025' },
  { id:'g3',  severity:'warning',  objectType:'Google Drive Resource', objectName:'Foundations Trail Drive Folder',issue:'Access control review overdue by 1 month (last: Nov 2024)',                       impact:'Unknown access permissions; potential data risk',                     action:'Complete access control review',                                    dueDate:'Jun 20 2025' },
  { id:'g4',  severity:'warning',  objectType:'Program',              objectName:'Digital Compass',                issue:'Program Blueprint v2 compliance gap — Sprint structure migration pending',         impact:'Non-compliant program in active delivery',                            action:'Assign Sprint migration owner and set deadline',                    dueDate:'Jul 15 2025' },
  { id:'g5',  severity:'warning',  objectType:'Knowledge Article',                                                 issue:'4 knowledge articles not reviewed in 12+ months',                                 impact:'Stale content may be surfaced by Penny',                              action:'Schedule biannual review for all affected articles',               dueDate:'Jun 30 2025' },
  { id:'g6',  severity:'warning',  objectType:'Salesforce Object',    objectName:'Program_Engagement__c',          issue:'PMM parallel record mapping unresolved — 23 learners have duplicate records',    impact:'Data integrity risk; duplicate interactions possible',                action:'Assign consolidation owner and plan migration',                    dueDate:'Jul 31 2025' },
  { id:'g7',  severity:'warning',  objectType:'Penny Capability',     objectName:'Coach Support',                  issue:'Quality review not completed this quarter',                                       impact:'No quality assurance on active capability',                           action:'Schedule quarterly quality review with Penny Lead',               dueDate:'Jun 30 2025' },
  { id:'g8',  severity:'info',     objectType:'Standard',             objectName:'Assessment Blueprint',           issue:'Assessment Blueprint flagged as draft — never formally approved',                 impact:'Assessments governed by unapproved standard',                         action:'Formally approve Assessment Blueprint via governance workflow' },
  { id:'g9',  severity:'info',     objectType:'Program Blueprint',    objectName:'Communication Blueprint',        issue:'Communication Blueprint partial — Slack naming convention gap',                  impact:'Minor naming inconsistency in Cohort 3 channel setup',                action:'Complete Communication Blueprint before Cohort 3 setup' },
  { id:'g10', severity:'info',     objectType:'Integration',                                                        issue:'2 planned integrations (LMS, Agentforce) have no owner assigned',                impact:'Q3 integrations at risk without ownership',                           action:'Assign integration owners in Administration' },
  { id:'g11', severity:'critical', objectType:'Knowledge Source',     objectName:'LinkedIn Strategy Guide',        issue:'Knowledge source Penny-activated without approved trust review',                 impact:'Penny may be using unreviewed source for learner interactions',       action:'Conduct trust review immediately or revoke Penny activation',      dueDate:'Jun 12 2025' },
  { id:'g12', severity:'warning',  objectType:'Prompt Template',      objectName:'Trail Quest — Sprint 3',         issue:'Prompt template last reviewed 4 months ago — review cadence exceeded',            impact:'Prompt may be outdated relative to current curriculum',               action:'Schedule prompt review with Penny Lead' },
  { id:'g13', severity:'info',     objectType:'Cohort',               objectName:'Foundations Trail Cohort 3',     issue:'Cohort 3 Salesforce record not yet created (cohort approved May 2025)',           impact:'Setup lag — Cohort 3 Q3 start at risk without Salesforce record',     action:'Program Manager to create Cohort 3 Salesforce record' },
  { id:'g14', severity:'warning',  objectType:'Role',                 objectName:'Program Director',               issue:'Program Director has no named backup for mid-cohort unavailability',              impact:'Single point of failure in active delivery',                          action:'Document backup in Role Blueprint' },
  { id:'g15', severity:'info',     objectType:'Calendar',             objectName:'Foundations Trail Sprint Calendar',issue:'Sprint Calendar not linked to Salesforce Cohort record',                       impact:'Calendar events not visible in Salesforce cohort timeline',           action:'Add Salesforce link field to Sprint Calendar admin' },
];

// ── Compliance Summary ─────────────────────────────────────────────────────────
export const COMPLIANCE_SUMMARY: ComplianceEntry[] = [
  { objectTypeId:'program',              objectTypeName:'Program',              layer:'Program',       total:5,  compliant:4, partial:1, nonCompliant:0, notAssessed:0, topGap:'Digital Compass Sprint structure pending',       lastChecked:'Jun 2025' },
  { objectTypeId:'cohort',               objectTypeName:'Cohort',               layer:'Program',       total:3,  compliant:2, partial:1, nonCompliant:0, notAssessed:0, topGap:'Cohort 3 Salesforce record not created',          lastChecked:'Jun 2025' },
  { objectTypeId:'sprint',               objectTypeName:'Sprint',               layer:'Program',       total:8,  compliant:7, partial:1, nonCompliant:0, notAssessed:0, topGap:'Sprint 4 facilitator guide draft',                lastChecked:'Jun 2025' },
  { objectTypeId:'module',               objectTypeName:'Module',               layer:'Program',       total:12, compliant:10,partial:2, nonCompliant:0, notAssessed:0, topGap:'2 modules missing Penny capability mapping',      lastChecked:'Jun 2025' },
  { objectTypeId:'lesson',               objectTypeName:'Lesson',               layer:'Program',       total:24, compliant:20,partial:3, nonCompliant:0, notAssessed:1, topGap:'1 lesson without approved blueprint',             lastChecked:'May 2025' },
  { objectTypeId:'assessment',           objectTypeName:'Assessment',           layer:'Program',       total:8,  compliant:6, partial:1, nonCompliant:0, notAssessed:1, topGap:'Assessment Blueprint unapproved',                 lastChecked:'May 2025' },
  { objectTypeId:'knowledge-source',     objectTypeName:'Knowledge Source',     layer:'Knowledge',     total:9,  compliant:6, partial:2, nonCompliant:1, notAssessed:0, topGap:'LinkedIn Guide Penny-activated without trust review',lastChecked:'Jun 2025' },
  { objectTypeId:'knowledge-article',    objectTypeName:'Knowledge Article',    layer:'Knowledge',     total:15, compliant:11,partial:3, nonCompliant:0, notAssessed:1, topGap:'4 articles overdue for biannual review',          lastChecked:'May 2025' },
  { objectTypeId:'standard',             objectTypeName:'Standard',             layer:'Knowledge',     total:7,  compliant:5, partial:1, nonCompliant:0, notAssessed:1, topGap:'Assessment Blueprint unapproved draft',           lastChecked:'Jun 2025' },
  { objectTypeId:'program-blueprint',    objectTypeName:'Program Blueprint',    layer:'Knowledge',     total:3,  compliant:2, partial:1, nonCompliant:0, notAssessed:0, topGap:'Communication Blueprint naming gap',              lastChecked:'Mar 2025' },
  { objectTypeId:'penny-capability',     objectTypeName:'Penny Capability',     layer:'Intelligence',  total:6,  compliant:4, partial:1, nonCompliant:0, notAssessed:1, topGap:'Coach Support quarterly review missed',           lastChecked:'Jun 2025' },
  { objectTypeId:'prompt-template',      objectTypeName:'Prompt Template',      layer:'Intelligence',  total:8,  compliant:6, partial:2, nonCompliant:0, notAssessed:0, topGap:'2 prompts exceeding review cadence',              lastChecked:'Jun 2025' },
  { objectTypeId:'person',               objectTypeName:'Person',               layer:'People',        total:7,  compliant:5, partial:2, nonCompliant:0, notAssessed:0, topGap:'2 staff without annual review',                   lastChecked:'Apr 2025' },
  { objectTypeId:'role',                 objectTypeName:'Role',                 layer:'People',        total:5,  compliant:3, partial:2, nonCompliant:0, notAssessed:0, topGap:'Coach + Program Director blueprints incomplete',  lastChecked:'Jun 2025' },
  { objectTypeId:'communication-channel',objectTypeName:'Communication Channel',layer:'Infrastructure',total:6,  compliant:5, partial:1, nonCompliant:0, notAssessed:0, topGap:'Slack naming convention gap',                     lastChecked:'Jun 2025' },
  { objectTypeId:'calendar',             objectTypeName:'Calendar',             layer:'Infrastructure',total:3,  compliant:2, partial:1, nonCompliant:0, notAssessed:0, topGap:'Sprint Calendar not linked to Salesforce',        lastChecked:'Jun 2025' },
  { objectTypeId:'google-drive-resource',objectTypeName:'Google Drive Resource',layer:'Infrastructure',total:5,  compliant:3, partial:2, nonCompliant:0, notAssessed:0, topGap:'Access control review overdue',                   lastChecked:'Jun 2025' },
  { objectTypeId:'salesforce-object',    objectTypeName:'Salesforce Object',    layer:'Infrastructure',total:8,  compliant:6, partial:2, nonCompliant:0, notAssessed:0, topGap:'PMM parallel record gap',                         lastChecked:'Jun 2025' },
  { objectTypeId:'decision',             objectTypeName:'Decision',             layer:'Governance',    total:12, compliant:9, partial:0, nonCompliant:0, notAssessed:3, topGap:'3 Cohort 1 retrospective decisions undocumented', lastChecked:'Jun 2025' },
  { objectTypeId:'integration',          objectTypeName:'Integration',          layer:'Infrastructure',total:4,  compliant:2, partial:1, nonCompliant:0, notAssessed:1, topGap:'2 planned integrations without owner assigned',   lastChecked:'Jun 2025' },
];

// ── Approval Workflows ─────────────────────────────────────────────────────────
export const APPROVAL_WORKFLOWS: ApprovalWorkflow[] = [
  { id:'aw1', objectTypeId:'program',           objectTypeName:'Program',           trigger:'New program proposed',         steps:['Submit brief','Director review','Blueprint assignment','Standards review','Director approval'],  approvers:['Program Director','Standards Lead'],             sla:'10 business days',   escalation:'Escalate to leadership after 15 days' },
  { id:'aw2', objectTypeId:'penny-capability',  objectTypeName:'Penny Capability',  trigger:'Capability proposed or updated',steps:['Draft spec','Knowledge source review','Prompt testing','Quality review','Penny Lead approval'], approvers:['Penny Lead','Knowledge Manager'],                 sla:'15 business days',   escalation:'Penny Lead escalates to Director' },
  { id:'aw3', objectTypeId:'standard',          objectTypeName:'Standard',          trigger:'New standard or major update', steps:['Draft','Cross-team review','Director review','Formal approval','Publish'],                      approvers:['Standards Lead','Program Director','Director'],  sla:'20 business days',   escalation:'Director escalates to leadership' },
  { id:'aw4', objectTypeId:'knowledge-source',  objectTypeName:'Knowledge Source',  trigger:'Source proposed for Penny use',steps:['Trust review','Content check','Penny Lead review','Knowledge Manager approval','Activation'],   approvers:['Knowledge Manager','Penny Lead'],                sla:'7 business days',    escalation:'Knowledge Manager escalates to Standards Lead' },
  { id:'aw5', objectTypeId:'salesforce-object', objectTypeName:'Salesforce Object', trigger:'New object or schema change',  steps:['Request','Admin design','UAT','Change log entry','Production deploy'],                           approvers:['Salesforce Admin','Ops Lead'],                   sla:'10 business days',   escalation:'Ops Lead escalates to Director' },
  { id:'aw6', objectTypeId:'integration',       objectTypeName:'Integration',       trigger:'New integration proposed',     steps:['Business case','Technical spec','Director approval','Build','Testing','Ops sign-off'],           approvers:['Ops Lead','Director'],                           sla:'Varies by complexity',escalation:'Director escalates to leadership' },
  { id:'aw7', objectTypeId:'decision',          objectTypeName:'Decision',          trigger:'Decision requiring formal record',steps:['Proposal','Authority review','Decision made','Org Memory record'],                          approvers:['Relevant authority (role-based)'],               sla:'3 business days',    escalation:'Director for unresolved proposals' },
  { id:'aw8', objectTypeId:'role',              objectTypeName:'Role',              trigger:'New role or Role Blueprint update',steps:['Propose','Program Director review','Blueprint draft','Standards review','Approval'],        approvers:['Program Director','Standards Lead'],             sla:'10 business days',   escalation:'Program Director escalates to leadership' },
];

// ── Review Cycles ─────────────────────────────────────────────────────────────
export const REVIEW_CYCLES: ReviewCycle[] = [
  { objectTypeId:'program',              objectTypeName:'Program',              cadence:'Per cohort + annual',        triggers:['Cohort completion','Annual planning'],                owner:'Program Director',    lastReview:'Apr 2025', nextReview:'Sep 2025',  status:'current' },
  { objectTypeId:'cohort',               objectTypeName:'Cohort',               cadence:'Per cohort',                 triggers:['Cohort completion'],                                  owner:'Program Manager',     lastReview:'Apr 2025', nextReview:'Aug 2025',  status:'current' },
  { objectTypeId:'sprint',               objectTypeName:'Sprint',               cadence:'Per sprint',                 triggers:['Sprint end'],                                         owner:'Program Manager',     lastReview:'Jun 2025', nextReview:'Jun 2025',  status:'current' },
  { objectTypeId:'module',               objectTypeName:'Module',               cadence:'Per cohort + biannual',      triggers:['Content change','Cohort retrospective'],              owner:'Curriculum Lead',     lastReview:'Mar 2025', nextReview:'Sep 2025',  status:'current' },
  { objectTypeId:'lesson',               objectTypeName:'Lesson',               cadence:'Per cohort',                 triggers:['Cohort retrospective','Content change'],              owner:'Curriculum Lead',     lastReview:'Mar 2025', nextReview:'Aug 2025',  status:'current' },
  { objectTypeId:'assessment',           objectTypeName:'Assessment',           cadence:'Per cohort',                 triggers:['Cohort completion','Result analysis'],                owner:'Curriculum Lead',     lastReview:'Apr 2025', nextReview:'Aug 2025',  status:'current' },
  { objectTypeId:'knowledge-source',     objectTypeName:'Knowledge Source',     cadence:'Quarterly',                  triggers:['Quality flag','Source change','Penny quality drop'],  owner:'Knowledge Manager',   lastReview:'Apr 2025', nextReview:'Jul 2025',  status:'upcoming' },
  { objectTypeId:'knowledge-article',    objectTypeName:'Knowledge Article',    cadence:'Biannual',                   triggers:['Stale flag','Subject area update'],                   owner:'Knowledge Manager',   lastReview:'Nov 2024', nextReview:'May 2025',  status:'overdue' },
  { objectTypeId:'standard',             objectTypeName:'Standard',             cadence:'Annual + major change',      triggers:['Platform change','January annual review'],            owner:'Standards Lead',      lastReview:'Mar 2025', nextReview:'Mar 2026',  status:'current' },
  { objectTypeId:'program-blueprint',    objectTypeName:'Program Blueprint',    cadence:'Annual + major change',      triggers:['Platform change','January annual review'],            owner:'Standards Lead',      lastReview:'Mar 2025', nextReview:'Mar 2026',  status:'current' },
  { objectTypeId:'penny-capability',     objectTypeName:'Penny Capability',     cadence:'Quarterly',                  triggers:['Quality threshold breach','Source change'],           owner:'Penny Lead',          lastReview:'Jun 2025', nextReview:'Sep 2025',  status:'current' },
  { objectTypeId:'prompt-template',      objectTypeName:'Prompt Template',      cadence:'Per capability update',      triggers:['Knowledge source change','Quality review'],           owner:'Penny Lead',          lastReview:'Apr 2025', nextReview:'—',         status:'overdue' },
  { objectTypeId:'person',               objectTypeName:'Person',               cadence:'Annual',                     triggers:['Annual HR cycle'],                                    owner:'Program Director',    lastReview:'Jan 2025', nextReview:'Jan 2026',  status:'current' },
  { objectTypeId:'role',                 objectTypeName:'Role',                 cadence:'Annual',                     triggers:['Annual review','Blueprint update'],                   owner:'Program Director',    lastReview:'Feb 2025', nextReview:'Feb 2026',  status:'current' },
  { objectTypeId:'communication-channel',objectTypeName:'Communication Channel',cadence:'Per cohort',                 triggers:['Cohort start/end'],                                   owner:'Comms Lead',          lastReview:'May 2025', nextReview:'Aug 2025',  status:'current' },
  { objectTypeId:'google-drive-resource',objectTypeName:'Google Drive Resource',cadence:'Biannual access review',     triggers:['Access audit cycle'],                                 owner:'Program Manager',     lastReview:'Nov 2024', nextReview:'May 2025',  status:'overdue' },
  { objectTypeId:'salesforce-object',    objectTypeName:'Salesforce Object',    cadence:'Quarterly data quality',     triggers:['Scheduled review','Integrity issue'],                 owner:'Salesforce Admin',    lastReview:'Jun 2025', nextReview:'Sep 2025',  status:'current' },
  { objectTypeId:'decision',             objectTypeName:'Decision',             cadence:'Annual or triggered',        triggers:['Annual review','Changed context'],                    owner:'Knowledge Manager',   lastReview:'May 2025', nextReview:'May 2026',  status:'current' },
  { objectTypeId:'integration',          objectTypeName:'Integration',          cadence:'Quarterly + SLA breach',     triggers:['Quarterly scheduled','SLA breach','Vendor change'],  owner:'Ops Lead',                              nextReview:'—',         status:'not-scheduled' },
  { objectTypeId:'calendar',             objectTypeName:'Calendar',             cadence:'Per cohort',                 triggers:['Cohort start'],                                       owner:'Program Manager',     lastReview:'May 2025', nextReview:'Aug 2025',  status:'current' },
];

// ── Governance Policies ────────────────────────────────────────────────────────
export const GOV_POLICIES: GovernancePolicy[] = [
  { id:'p1',  category:'Core Principles', title:'Every Object Must Have a Named Owner',          body:'All Trail OS objects must have a designated primary owner. Ownerless objects are a governance risk and will be flagged in Governance Health. Owner must be a named role, not just a team.',                               appliesTo:['All'],             effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p2',  category:'Core Principles', title:'No Object Goes Live Without Approval',          body:'Objects in Development, Testing, or Draft states may not be used in live delivery without formal approval from the designated approval authority. The one exception is objects in the Planned state where pre-live review is documented.',  appliesTo:['All'],            effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p3',  category:'Core Principles', title:'Source of Truth is Single and Named',           body:'Every object type has exactly one named source of truth system. Data from non-authoritative sources must not be used for operational decisions. If the source of truth changes, a formal decision must be recorded in Org Memory.',      appliesTo:['All'],            effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p4',  category:'Lifecycle Policy', title:'Objects Must Follow Their Lifecycle',          body:'Objects must not skip lifecycle stages without a documented governance exception. Stage transitions require the exit requirements of the current stage to be met and recorded.',                                                            appliesTo:['All'],            effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p5',  category:'Lifecycle Policy', title:'Retired Objects Must Be Formally Decommissioned', body:'Objects in Retired/Archived/Deprecated state must have all active references updated. Retired objects still referenced by Active objects trigger a critical governance health issue.',                                             appliesTo:['All'],            effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p6',  category:'Ownership Policy', title:'Role Blueprint Required Before Role is Active', body:'A Role must have a completed Role Blueprint before any person fills that role in a live program. Partial blueprints are permissible in the Defined stage only.',                                                                      appliesTo:['Role'],           effective:'Feb 2025', owner:'Program Director' },
  { id:'p7',  category:'Ownership Policy', title:'Review Cycles Must Be Met',                   body:'All review cycle deadlines must be met or formally deferred with a documented reason and a new target date. Reviews that are more than 30 days overdue trigger a warning issue in Governance Health.',                                   appliesTo:['All'],            effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p8',  category:'Penny Policy',    title:'Knowledge Sources Must Pass Trust Review Before Penny Activation', body:'No knowledge source may be activated in Penny AI without a completed trust review and approval from the Knowledge Manager. Trust level (Authoritative / Supplemental) must be recorded.',              appliesTo:['Knowledge Source','Penny Capability'], effective:'Jan 2025', owner:'Knowledge Manager' },
  { id:'p9',  category:'Penny Policy',    title:'Penny Capabilities Must Meet Quality Threshold', body:'Penny capabilities must maintain a quality score of 80 or above to remain Operational. A score below 80 triggers a review. A score below 70 for two consecutive reviews triggers a suspension and root-cause review.',               appliesTo:['Penny Capability','Prompt Template'],  effective:'Jan 2025', owner:'Penny Lead' },
  { id:'p10', category:'Standards Policy','title':'Blueprint Compliance Required Within 90 Days', body:'New objects must demonstrate compliance with their governing blueprint within 90 days of reaching the Active stage. Non-compliance after 90 days is escalated to the Program Director.',                                              appliesTo:['Program','Cohort','Module','Lesson','Assessment'], effective:'Jan 2025', owner:'Standards Lead' },
  { id:'p11', category:'Decision Policy', title:'Decisions Affecting Multiple Objects Must Be Recorded', body:'Any decision that changes the state, owner, or lifecycle of two or more objects must be documented in Org Memory within 5 business days of being made.',                                                                   appliesTo:['Decision'],       effective:'Jan 2025', owner:'Knowledge Manager' },
  { id:'p12', category:'Data Policy',     title:'Salesforce is Authoritative for Learner Records', body:'Salesforce is the single source of truth for all learner enrollment, progress, and outcome records. No other system may be used as a primary record for learner data.',                                                            appliesTo:['Salesforce Object','Cohort','Person'], effective:'Dec 2024', owner:'Salesforce Admin' },
];
