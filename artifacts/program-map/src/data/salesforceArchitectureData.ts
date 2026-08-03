// ── Salesforce Architecture Mapping Data ─────────────────────────────────────
// Maps Trail OS operating layer objects to the Transition Trails Salesforce org.
//
// Salesforce products in use:
//   - NPSP (Nonprofit Success Pack) — Contact, Account extensions
//   - Nonprofit Cloud — next-gen successor to NPSP
//   - PMM (Program Management Module) — Program__c, Service__c, Program_Engagement__c
//   - Volunteer Management — Volunteer_Job__c, Volunteer_Hours__c
//   - Salesforce Knowledge — Knowledge__kav
//   - Assessment objects (existing managed/custom package)
//   - LMS-related objects (existing)
//   - Cases — standard Case object
//   - Core CRM — Account, Contact, Event, Task
//
// Design principle:
//   Salesforce = system of record
//   Trail OS = operating and visualization layer
//   Google Drive = content repository (admin-configured per program)

export type SfMappingStatus =
  | 'existing'
  | 'existing-needs-relationship'
  | 'proposed'
  | 'future';

export type SfProduct =
  | 'NPSP'
  | 'Nonprofit Cloud'
  | 'PMM'
  | 'Volunteer Management'
  | 'Salesforce Knowledge'
  | 'LMS'
  | 'Assessments'
  | 'Core CRM'
  | 'Cases'
  | 'Custom Objects';

export interface TrailOsSfMapping {
  id: string;
  trailOsObject: string;
  trailOsGroup: string;
  trailOsDescription: string;
  sfApiName: string;
  sfLabel: string;
  sfProduct: SfProduct;
  sfDescription: string;
  sfPackageSource: string;
  isCustom: boolean;
  status: SfMappingStatus;
  relationshipType: 'direct' | 'one-to-many' | 'many-to-many' | 'lookup';
  purpose: string;
  currentImplementation: string;
  futureRecommendation: string;
  foundationsTrailExample: string;
  owner: string;
  relatedMappingIds: string[];
  notes?: string;
}

export const SF_STATUS_CONFIG: Record<SfMappingStatus, { label: string; cls: string; description: string; dot: string }> = {
  'existing':                   { label: 'Existing',                  cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',  description: 'Object already exists and is mapped in your Salesforce org.', dot: 'bg-[#2F6B3F]' },
  'existing-needs-relationship': { label: 'Exists — Needs Wiring',     cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', description: 'Object exists in Salesforce but needs a relationship or configuration to connect to Trail OS.', dot: 'bg-[#FFF3E0]0' },
  'proposed':                   { label: 'Proposed',                  cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', description: 'Proposed as a new custom object or field extension — needs implementation.', dot: 'bg-[#EDF5F8]0' },
  'future':                     { label: 'Future Integration',        cls: 'text-slate-600 bg-slate-50 border-slate-200', description: 'Planned for a future development phase. Not yet in scope.', dot: 'bg-[#C8CBC6]' },
};

export const SF_PRODUCT_CONFIG: Record<SfProduct, { label: string; cls: string; description: string }> = {
  'NPSP':                  { label: 'NPSP',                  cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',     description: 'Nonprofit Success Pack — extends Contact & Account for nonprofits.' },
  'Nonprofit Cloud':       { label: 'Nonprofit Cloud',       cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', description: 'Next-gen nonprofit platform replacing NPSP long-term.' },
  'PMM':                   { label: 'PMM',                   cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', description: 'Program Management Module — programs, services, engagements.' },
  'Volunteer Management':  { label: 'Volunteer Mgmt',        cls: 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]', description: 'Volunteer Management module for tracking volunteer jobs and hours.' },
  'Salesforce Knowledge':  { label: 'SF Knowledge',          cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',  description: 'Salesforce Knowledge — Knowledge__kav articles and categories.' },
  'LMS':                   { label: 'LMS',                   cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', description: 'Existing LMS-related objects in your Salesforce org.' },
  'Assessments':           { label: 'Assessments',           cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',     description: 'Existing Assessment objects (managed or custom package).' },
  'Core CRM':              { label: 'Core CRM',              cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',        description: 'Standard Salesforce CRM — Account, Contact, Event, Task.' },
  'Cases':                 { label: 'Cases',                 cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',        description: 'Standard Case object for support and demand management.' },
  'Custom Objects':        { label: 'Custom',                cls: 'text-slate-700 bg-slate-50 border-slate-200',  description: 'Proposed new custom objects to be built in your org.' },
};

export const sfMappings: TrailOsSfMapping[] = [
  {
    id: 'map-program',
    trailOsObject: 'Program',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'Top-level learning program (e.g. Foundations Trail). Sets the curriculum structure, outcomes, and cohort model.',
    sfApiName: 'Program__c',
    sfLabel: 'Program',
    sfProduct: 'PMM',
    sfDescription: 'PMM Program__c — the standard program record for nonprofits. Tracks program details, target population, and capacity.',
    sfPackageSource: 'Program Management Module (PMM)',
    isCustom: false,
    status: 'existing',
    relationshipType: 'direct',
    purpose: 'Program__c IS the canonical record for a Trail OS Program. All cohorts, engagements, and services roll up to Program__c.',
    currentImplementation: 'Foundations Trail exists as a Program__c record in your SF org. PMM provides status, start/end date, and location tracking.',
    futureRecommendation: 'Add custom fields to Program__c for Trail OS metadata: drive_folder_url__c, program_type__c (Foundations/Guided/Explorer), certification_track__c, and sprint_structure__c. Link Trail OS Program IDs to Program__c via external ID.',
    foundationsTrailExample: 'Program__c: "Foundations Trail" — Status: Active, Target Population: Career Changers, Start Date: Jan 2025.',
    owner: 'Program Manager',
    relatedMappingIds: ['map-cohort', 'map-learner', 'map-service-engagement', 'map-program-resource'],
  },
  {
    id: 'map-cohort',
    trailOsObject: 'Cohort',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'A specific run of a program with a defined group of learners, start date, and coach assignment.',
    sfApiName: 'Service_Schedule__c',
    sfLabel: 'Service Schedule',
    sfProduct: 'PMM',
    sfDescription: 'PMM Service_Schedule__c — a scheduled instance of a service, closest to a Cohort in the program calendar.',
    sfPackageSource: 'Program Management Module (PMM)',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'one-to-many',
    purpose: 'Each Cohort in Trail OS maps to a Service Schedule in PMM — it represents a time-bound program delivery. Needs a Cohort__c custom object or extended Service_Schedule__c to carry Trail OS cohort metadata.',
    currentImplementation: 'Service_Schedule__c exists in PMM and is linked to Program__c. Not yet extended with Trail OS cohort fields (cohort number, coach assignment, sprint schedule).',
    futureRecommendation: 'Create a custom Cohort__c object as a child of Program__c, or extend Service_Schedule__c with: cohort_number__c, coach__c (lookup to Contact), current_sprint__c, active_learner_count__c, completion_rate__c.',
    foundationsTrailExample: 'Cohort 1 — Foundations Trail: Jan 2025–Apr 2025, 28 learners, Coach: Sarah Chen. Maps to Service_Schedule__c linked to Program__c "Foundations Trail".',
    owner: 'Program Manager',
    relatedMappingIds: ['map-program', 'map-learner', 'map-coach'],
  },
  {
    id: 'map-learner',
    trailOsObject: 'Learner',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'A person actively enrolled in a Trail OS program, tracked through their learning journey.',
    sfApiName: 'Contact + Program_Engagement__c',
    sfLabel: 'Contact & Program Engagement',
    sfProduct: 'PMM',
    sfDescription: 'Contact (NPSP) + Program_Engagement__c (PMM) — the two-record model: Contact IS the person, Program_Engagement__c links them to a Program as a participant.',
    sfPackageSource: 'NPSP + Program Management Module (PMM)',
    isCustom: false,
    status: 'existing',
    relationshipType: 'direct',
    purpose: 'Learner = Contact in NPSP. Program_Engagement__c is the junction that connects a Contact to a Program__c with stage, role, and status. This is your current system of record for learner enrollment.',
    currentImplementation: 'Contacts are created for all learners. Program_Engagement__c records link each Contact to Foundations Trail with Enrollment Date and Stage. NPSP manages Household and Affiliation.',
    futureRecommendation: 'Extend Program_Engagement__c with Trail OS fields: current_sprint__c, current_module__c, completion_percentage__c, confidence_score__c (from Penny), last_lesson_completed__c. These become the learner progress record of truth.',
    foundationsTrailExample: 'Contact: "Maria Rodriguez" → Program_Engagement__c: Program="Foundations Trail", Stage="Active", Role="Learner", Enrolled: Jan 15 2025.',
    owner: 'Program Manager',
    relatedMappingIds: ['map-program', 'map-cohort', 'map-assessment'],
  },
  {
    id: 'map-coach',
    trailOsObject: 'Coach',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'A staff member who facilitates cohorts, reviews assessments, and supports learner progress.',
    sfApiName: 'Contact + Volunteer_Job__c',
    sfLabel: 'Contact & Volunteer Job',
    sfProduct: 'Volunteer Management',
    sfDescription: 'Contact with a staff/volunteer relationship. Volunteer Management Module provides Volunteer_Job__c for role-based tracking. Could also use PMM Staff relationship.',
    sfPackageSource: 'NPSP + Volunteer Management Module',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'lookup',
    purpose: 'Coaches are Contacts in NPSP. The Volunteer Management Module provides job tracking but needs to be configured for the coaching role specifically. Coach-to-Cohort relationships need a custom junction or PMM Service Delivery staff field.',
    currentImplementation: 'Coaches exist as Contacts. Volunteer Management is installed but coach-to-cohort assignment is managed manually, not tracked in SF.',
    futureRecommendation: 'Create a Coach_Assignment__c junction object linking Contact (coach) to Cohort__c (or Service_Schedule__c) with fields: assignment_type__c, start_date__c, active_learner_count__c. This enables coach dashboard reporting.',
    foundationsTrailExample: 'Contact: "Sarah Chen" (Coach) → Coach_Assignment__c → Cohort 1 / Foundations Trail.',
    owner: 'Operations Manager',
    relatedMappingIds: ['map-cohort', 'map-learner'],
  },
  {
    id: 'map-sprint',
    trailOsObject: 'Sprint',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'A 3–4 week learning block within a program, containing 3–4 modules on a cohesive theme.',
    sfApiName: 'Trail_Sprint__c',
    sfLabel: 'Trail Sprint',
    sfProduct: 'Custom Objects',
    sfDescription: 'Proposed custom object as a child of Program__c. No native PMM equivalent — Sprint is a Trail OS concept.',
    sfPackageSource: 'Custom (to be built)',
    isCustom: true,
    status: 'proposed',
    relationshipType: 'one-to-many',
    purpose: 'Sprint is the scheduling unit for program delivery. Trail_Sprint__c groups modules into a deliverable time block and connects RESOLVE phase to curriculum content. Child of Program__c.',
    currentImplementation: 'Sprints are not tracked in Salesforce — only managed in Trail OS. No SF record exists for Sprint.',
    futureRecommendation: 'Create Trail_Sprint__c with: sprint_number__c, sprint_name__c, resolve_phase__c (picklist), theme__c, start_date__c, end_date__c, module_count__c (roll-up), program__c (M-D to Program__c). Build a Flow to auto-create sprints when a Program record is configured.',
    foundationsTrailExample: 'Trail_Sprint__c: "Sprint 1 — Platform Foundations" linked to Program__c "Foundations Trail", RESOLVE Phase: Engage.',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-program', 'map-module'],
  },
  {
    id: 'map-module',
    trailOsObject: 'Module',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'A learning unit within a sprint, covering a specific topic. The central connective node of the learning architecture.',
    sfApiName: 'Trail_Module__c',
    sfLabel: 'Trail Module',
    sfProduct: 'Custom Objects',
    sfDescription: 'Proposed custom object as a child of Trail_Sprint__c. Module is the relationship hub — connects lessons, assessments, knowledge articles, and Penny assets.',
    sfPackageSource: 'Custom (to be built)',
    isCustom: true,
    status: 'proposed',
    relationshipType: 'one-to-many',
    purpose: 'Trail_Module__c is the central node of the learning architecture. Everything — lessons, assessments, articles, coaching prompts, delivery assets — relates back to a module. It is the key unit for content health reporting.',
    currentImplementation: 'Modules are not tracked in Salesforce — only managed in Trail OS.',
    futureRecommendation: 'Create Trail_Module__c with: module_number__c, module_name__c, sprint__c (M-D to Trail_Sprint__c), learning_objective_count__c, lesson_count__c (roll-up), assessment__c (lookup), content_health_score__c. This becomes the curriculum dashboard object.',
    foundationsTrailExample: 'Trail_Module__c: "2.1 — Data Modeling & Schema Design" linked to Sprint 2 / Foundations Trail.',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-sprint', 'map-lesson', 'map-assessment', 'map-knowledge-article'],
  },
  {
    id: 'map-lesson',
    trailOsObject: 'Lesson',
    trailOsGroup: 'Learning Assets',
    trailOsDescription: 'A single learning activity — instruction, lab, or workshop — within a module.',
    sfApiName: 'Lesson__c (LMS)',
    sfLabel: 'Lesson (LMS)',
    sfProduct: 'LMS',
    sfDescription: 'Existing LMS Lesson object in your Salesforce org. Already in use for tracking individual lesson content.',
    sfPackageSource: 'Existing LMS objects',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'one-to-many',
    purpose: 'Lessons already exist in your LMS setup. The gap is the relationship between existing Lesson records and Trail_Module__c. Once Trail_Module__c is created, a lookup field on Lesson__c connects the two.',
    currentImplementation: 'Lesson records exist in the LMS layer of your org. Not currently linked to a Module-level structure.',
    futureRecommendation: 'Add a module__c lookup field on the existing Lesson object pointing to Trail_Module__c. This creates the Module → Lesson chain and enables content health roll-ups at the module level.',
    foundationsTrailExample: 'Lesson__c: "2.1a — Custom Objects & Fields" (45 min, Instruction) → linked to Trail_Module__c "2.1 — Data Modeling".',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-module', 'map-assessment'],
  },
  {
    id: 'map-assignment',
    trailOsObject: 'Assignment',
    trailOsGroup: 'Learning Assets',
    trailOsDescription: 'A structured task or project given to learners as part of a lesson or module.',
    sfApiName: 'Trail_Assignment__c',
    sfLabel: 'Trail Assignment',
    sfProduct: 'Custom Objects',
    sfDescription: 'Proposed custom object for tracking learner assignments, submissions, and review status.',
    sfPackageSource: 'Custom (to be built)',
    isCustom: true,
    status: 'proposed',
    relationshipType: 'one-to-many',
    purpose: 'Assignments bridge learning content and learner progress tracking. Trail_Assignment__c would link a lesson to a Program_Engagement__c to track what was submitted and reviewed.',
    currentImplementation: 'Assignments are not tracked in Salesforce.',
    futureRecommendation: 'Create Trail_Assignment__c with: lesson__c, program_engagement__c, submission_date__c, reviewed_by__c, score__c, status__c (picklist). Consider using existing LMS Assignment object if available.',
    foundationsTrailExample: 'Trail_Assignment__c: Lab — Schema Builder (Lesson 2.1c) submitted by Maria Rodriguez, reviewed by Coach Chen.',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-lesson', 'map-learner'],
  },
  {
    id: 'map-assessment',
    trailOsObject: 'Assessment',
    trailOsGroup: 'Learning Assets',
    trailOsDescription: 'A knowledge check or exam linked to a module, used to measure learning outcomes.',
    sfApiName: 'Assessment__c',
    sfLabel: 'Assessment',
    sfProduct: 'Assessments',
    sfDescription: 'Existing Assessment__c object in your Salesforce org (managed or custom package). Already in use.',
    sfPackageSource: 'Existing Assessment objects',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'lookup',
    purpose: 'Assessment__c already exists and is in use. The integration need is a lookup from Assessment__c to Trail_Module__c (once created) so that module-level assessment data is visible in Trail OS.',
    currentImplementation: 'Assessment__c records exist for Foundations Trail modules (Sprint 1–3 complete). Not yet linked to a module record in Trail OS.',
    futureRecommendation: 'Add a trail_module__c lookup field on Assessment__c. Optionally create Assessment_Response__c (if not already present) to track individual learner responses and connect to Program_Engagement__c for progress tracking.',
    foundationsTrailExample: 'Assessment__c: "Data Modeling Assessment" (20 questions, 75% pass, avg 82%) → linked to Trail_Module__c "2.1" and Program_Engagement__c for each learner.',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-module', 'map-learner'],
  },
  {
    id: 'map-knowledge-article',
    trailOsObject: 'Knowledge Article',
    trailOsGroup: 'Learning Assets',
    trailOsDescription: 'A reference article, guide, or quick reference linked to one or more modules.',
    sfApiName: 'Knowledge__kav',
    sfLabel: 'Knowledge Article',
    sfProduct: 'Salesforce Knowledge',
    sfDescription: 'Salesforce Knowledge Article Version — the standard knowledge base object. Full-text search, categorization, and related article features.',
    sfPackageSource: 'Salesforce Knowledge (core)',
    isCustom: false,
    status: 'existing',
    relationshipType: 'many-to-many',
    purpose: 'Knowledge__kav IS the knowledge article in Salesforce Knowledge. Trail OS surfaces these articles in the context of modules. The many-to-many link (module ↔ article) needs a junction object or topic/data category mapping.',
    currentImplementation: 'Salesforce Knowledge is active. Articles exist for key topics (Data Modeling, Security, Automation). Not yet linked to Trail_Module__c.',
    futureRecommendation: 'Create Module_Knowledge__c junction object (Module__c + Article_ID__c) or use Salesforce Knowledge Data Categories to tag articles by program/module. Enable Article Recommendations in Experience Cloud for self-directed learner access.',
    foundationsTrailExample: 'Knowledge__kav: "Objects vs Fields vs Records — A Visual Guide" tagged to Module 2.1 / Data Modeling.',
    owner: 'Curriculum Lead',
    relatedMappingIds: ['map-module'],
  },
  {
    id: 'map-penny-template',
    trailOsObject: 'Penny Template',
    trailOsGroup: 'Penny Assets',
    trailOsDescription: 'Coaching prompts, reflection prompts, and trail quests generated or managed by Penny.',
    sfApiName: 'Penny_Template__c',
    sfLabel: 'Penny Template',
    sfProduct: 'Custom Objects',
    sfDescription: 'Proposed custom object for storing Penny-generated content: prompts, reflection questions, and trail quest definitions.',
    sfPackageSource: 'Custom (to be built)',
    isCustom: true,
    status: 'future',
    relationshipType: 'one-to-many',
    purpose: 'Penny Templates are the content layer for AI-generated coaching interactions. Storing them in SF enables version control, approval workflows, and linking to modules as approved templates.',
    currentImplementation: 'Penny prompts are managed in Trail OS only. No SF object exists.',
    futureRecommendation: 'Create Penny_Template__c with: template_type__c (Coaching Prompt / Reflection / Trail Quest / Weekly Review), module__c (lookup), status__c, generated_by__c (Penny), approved_by__c, content__c (long text). Wire to Agentforce when available.',
    foundationsTrailExample: 'Penny_Template__c: "Module 2.1 — Data Modeling Coaching Prompt" → status: Approved, linked to Trail_Module__c "2.1".',
    owner: 'Program Manager',
    relatedMappingIds: ['map-module'],
  },
  {
    id: 'map-demand-request',
    trailOsObject: 'Demand Request',
    trailOsGroup: 'Demand Management',
    trailOsDescription: 'A change request, feature request, or content request submitted through Demand Management.',
    sfApiName: 'Case',
    sfLabel: 'Case',
    sfProduct: 'Cases',
    sfDescription: 'Standard Salesforce Case object — used for tracking support, change requests, and internal demand items.',
    sfPackageSource: 'Core Salesforce (Cases)',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'lookup',
    purpose: 'Cases are the demand record of truth in SF. Trail OS Demand Requests should create or link to Case records so that content requests, change requests, and support items are tracked in one place.',
    currentImplementation: 'Cases are used for external support. Internal demand/change requests are not yet connected to Cases.',
    futureRecommendation: 'Add a request_type__c picklist to Case (Content Request / Change Request / Bug / Feature Request). Add a linked_program__c and linked_module__c lookup. Enable a public-facing form (Experience Cloud or embedded Flow) to submit demand requests that auto-create Cases.',
    foundationsTrailExample: 'Case #00001847: "Add Module 3.1 Assessment" — Type: Content Request, Linked Program: Foundations Trail, Status: In Progress.',
    owner: 'Operations Manager',
    relatedMappingIds: ['map-program', 'map-module'],
  },
  {
    id: 'map-client-org',
    trailOsObject: 'Client Organization',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'The organization or employer partner associated with a learner or cohort.',
    sfApiName: 'Account',
    sfLabel: 'Account',
    sfProduct: 'NPSP',
    sfDescription: 'NPSP Account — Organizations are Accounts. NPSP extends Account with Affiliation tracking (Contact ↔ Account relationships).',
    sfPackageSource: 'NPSP (core)',
    isCustom: false,
    status: 'existing',
    relationshipType: 'lookup',
    purpose: 'Accounts represent employer partners, referring organizations, and client organizations. NPSP Affiliations link Contacts (learners) to their employer Account. This is the system of record for organizational relationships.',
    currentImplementation: 'Accounts are in use for all organizational contacts. NPSP Affiliations link learners to their employers.',
    futureRecommendation: 'Add program__c lookup on Account to associate employer partners with specific programs (Foundations Trail, Explorer\'s Trail). Add partnership_type__c picklist. Enables employer-facing reporting on program placement outcomes.',
    foundationsTrailExample: 'Account: "Acme Corp" (Employer Partner) → Affiliation to Contact "Maria Rodriguez" → linked to Program "Foundations Trail".',
    owner: 'Program Manager',
    relatedMappingIds: ['map-learner', 'map-service-engagement'],
  },
  {
    id: 'map-service-engagement',
    trailOsObject: 'Service Engagement',
    trailOsGroup: 'Program Structure',
    trailOsDescription: 'The delivery record of a service to a participant — tracks attendance, completion, and outcomes.',
    sfApiName: 'Service_Delivery__c',
    sfLabel: 'Service Delivery',
    sfProduct: 'PMM',
    sfDescription: 'PMM Service_Delivery__c — tracks when a specific service was delivered to a participant. The activity log for program delivery.',
    sfPackageSource: 'Program Management Module (PMM)',
    isCustom: false,
    status: 'existing',
    relationshipType: 'one-to-many',
    purpose: 'Service_Delivery__c is the attendance and participation log. Each lesson attended or module completed generates a Service_Delivery__c record linked to the Contact (learner) and Service__c (module/lesson). This is your participation data in SF.',
    currentImplementation: 'Service_Delivery__c is in use for program delivery tracking. Service__c records represent services delivered.',
    futureRecommendation: 'Align Service__c records with Trail OS modules/lessons. Add module__c lookup to Service__c. Set up automated Service_Delivery__c creation via Flow when a learner completes a lesson in the LMS.',
    foundationsTrailExample: 'Service_Delivery__c: Contact "Maria Rodriguez", Service "Module 2.1 — Data Modeling", Date Jan 28 2025, Attendance: Completed.',
    owner: 'Program Manager',
    relatedMappingIds: ['map-learner', 'map-module', 'map-cohort'],
  },
  {
    id: 'map-communications',
    trailOsObject: 'Communications',
    trailOsGroup: 'Delivery Assets',
    trailOsDescription: 'Slack messages, Google Chat updates, and Penny broadcast communications linked to program delivery.',
    sfApiName: 'Task + EmailMessage',
    sfLabel: 'Activity (Task / Email)',
    sfProduct: 'Core CRM',
    sfDescription: 'Standard Activity objects — Task and EmailMessage. Can log communications related to program delivery. Does not natively integrate Slack/Google Chat.',
    sfPackageSource: 'Core Salesforce (Activities)',
    isCustom: false,
    status: 'proposed',
    relationshipType: 'lookup',
    purpose: 'Penny-driven communications (Slack posts, Google Chat updates) should eventually be logged as Activities on Program_Engagement__c so coaches have a full interaction history per learner.',
    currentImplementation: 'Slack and Google Chat communications are not currently logged to Salesforce.',
    futureRecommendation: 'Build a Penny → SF integration using Salesforce MuleSoft or webhook to log key Penny touchpoints (coaching messages, weekly reviews) as Tasks on Program_Engagement__c. Add communication_channel__c picklist (Slack / Google Chat / Email).',
    foundationsTrailExample: 'Task: "Penny Coaching Message — Maria Rodriguez — Module 2.1 Stuck Signal" → linked to Program_Engagement__c, logged by Penny (system user).',
    owner: 'Program Manager',
    relatedMappingIds: ['map-learner', 'map-module'],
    notes: 'Requires Penny–Salesforce integration. Target: Q3 2025.',
  },
  {
    id: 'map-calendar-activities',
    trailOsObject: 'Calendar Activities',
    trailOsGroup: 'Delivery Assets',
    trailOsDescription: 'Scheduled events — office hours, sprint kickoffs, assessment review sessions — on the program calendar.',
    sfApiName: 'Event',
    sfLabel: 'Event',
    sfProduct: 'Core CRM',
    sfDescription: 'Standard Salesforce Event object — calendar events linked to contacts and programs. Supports invitations and related records.',
    sfPackageSource: 'Core Salesforce (Activities)',
    isCustom: false,
    status: 'existing-needs-relationship',
    relationshipType: 'lookup',
    purpose: 'Events exist in Salesforce but are not linked to Program__c or Trail_Module__c. Adding a program__c and module__c lookup on Event enables program calendar reporting and learner attendance tracking.',
    currentImplementation: 'Events are created but not associated with programs or modules in a structured way.',
    futureRecommendation: 'Add WhatId linking to Program__c or Cohort__c for Events. Build a calendar view in Experience Cloud for learner-facing program schedules. Add event_type__c picklist (Office Hours / Kickoff / Review Session / Workshop).',
    foundationsTrailExample: 'Event: "Sprint 2 Kickoff — Foundations Trail Cohort 1" — Jan 27 2025, linked to Program__c "Foundations Trail", Invitees: 28 learners + Coach.',
    owner: 'Operations Manager',
    relatedMappingIds: ['map-cohort', 'map-module'],
  },
  {
    id: 'map-program-resource',
    trailOsObject: 'Program Resource (Google Drive)',
    trailOsGroup: 'Content Repository',
    trailOsDescription: 'The Google Drive folder workspace linked to a program — the authoritative content repository for program assets.',
    sfApiName: 'Program_Resource__c',
    sfLabel: 'Program Resource',
    sfProduct: 'Custom Objects',
    sfDescription: 'Proposed custom object to store Google Drive folder metadata on Program__c — folder URL, owner, permissions model, sync status.',
    sfPackageSource: 'Custom (to be built) — lightweight metadata only',
    isCustom: true,
    status: 'proposed',
    relationshipType: 'lookup',
    purpose: 'Program Resources connect the Google Drive content workspace to the SF system of record. The Drive folder is the content repository; SF stores the metadata (URL, owner, status, permissions model) so it is discoverable and auditable.',
    currentImplementation: 'Google Drive folders exist per program but are managed manually outside Salesforce and Trail OS. No metadata record exists.',
    futureRecommendation: 'Create Program_Resource__c as a child of Program__c with: folder_name__c, folder_url__c, shared_drive_id__c (for future API access), owner__c (lookup to Contact), permissions_model__c (picklist), status__c, last_synced__c. Admin-configure in Trail OS Admin > Program Resources.',
    foundationsTrailExample: 'Program_Resource__c: "Foundations Trail — Google Drive" → URL: drive.google.com/…, Owner: Curriculum Lead, Status: Active, linked to Program__c "Foundations Trail".',
    owner: 'Operations Manager',
    relatedMappingIds: ['map-program'],
    notes: 'Live Google Drive API integration is future-state (Q4 2025). Admin metadata management is Phase 1.',
  },
];

// ── Summary statistics ────────────────────────────────────────────────────────
export const SF_MAPPING_SUMMARY = {
  total: sfMappings.length,
  byStatus: {
    existing:                   sfMappings.filter(m => m.status === 'existing').length,
    'existing-needs-relationship': sfMappings.filter(m => m.status === 'existing-needs-relationship').length,
    proposed:                   sfMappings.filter(m => m.status === 'proposed').length,
    future:                     sfMappings.filter(m => m.status === 'future').length,
  },
  byProduct: Object.fromEntries(
    Object.keys(SF_PRODUCT_CONFIG).map(p => [
      p,
      sfMappings.filter(m => m.sfProduct === (p as SfProduct)).length,
    ])
  ),
};
