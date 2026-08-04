// ── Standards Studio — Content Quality Rulebook for Transition Trails ────────
// Defines the standards Penny uses to create, review, and improve curriculum
// content consistently across Foundations Trail and all future programs.

export type StandardCategory =
  | 'Program Architecture'
  | 'Learning Content'
  | 'Penny Assets'
  | 'Delivery Assets';

export type StandardStatus  = 'active' | 'draft' | 'review';
export type StandardConfidence = 'high' | 'medium' | 'low';
export type GapType =
  | 'missing-field'
  | 'missing-alignment'
  | 'missing-owner'
  | 'duplicate-concept'
  | 'overdue-review';

export interface StandardField {
  field: string;
  description: string;
  required: boolean;
}

export interface QualityCheck {
  id: string;
  check: string;
  passing: string;
  failing: string;
  required: boolean;
}

export interface ContentStandard {
  id: string;
  name: string;
  objectType: string;
  category: StandardCategory;
  purpose: string;
  whyItMatters: string;
  requiredFields: StandardField[];
  qualityCriteria: string[];
  exampleOutput: string;
  sfMapping: string;
  lmsMapping: string;
  relatedKnowledgeCategory: string;
  relatedContentObjects: string[];
  owner: string;
  reviewCycle: string;
  status: StandardStatus;
  confidence: StandardConfidence;
  howPennyUsesIt: string;
  pennyChecks: QualityCheck[];
}

export interface GapReportItem {
  id: string;
  gapType: GapType;
  objectType: string;
  objectName: string;
  program: string;
  sprint?: string;
  gapDescription: string;
  standardId: string;
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

// ── Status / confidence config ─────────────────────────────────────────────

export const STANDARD_STATUS_CONFIG: Record<StandardStatus, { label: string; cls: string }> = {
  active: { label: 'Active',  cls: 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' },
  review: { label: 'In Review', cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  draft:  { label: 'Draft',   cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

export const STANDARD_CONFIDENCE_CONFIG: Record<StandardConfidence, { label: string; cls: string }> = {
  high:   { label: 'High Confidence',   cls: 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' },
  medium: { label: 'Medium Confidence', cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  low:    { label: 'Low Confidence',    cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' },
};

export const GAP_TYPE_CONFIG: Record<GapType, { label: string; cls: string; icon: string }> = {
  'missing-field':     { label: 'Missing Field',      cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',   icon: '⬜' },
  'missing-alignment': { label: 'Missing Alignment',  cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', icon: '🔗' },
  'missing-owner':     { label: 'Missing Owner',      cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]', icon: '👤' },
  'duplicate-concept': { label: 'Duplicate Concept',  cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',   icon: '♻️' },
  'overdue-review':    { label: 'Overdue Review',     cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', icon: '⏰' },
};

export const STANDARD_CATEGORY_CONFIG: Record<StandardCategory, { cls: string }> = {
  'Program Architecture': { cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]' },
  'Learning Content':     { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' },
  'Penny Assets':         { cls: 'text-secondary border-secondary/20 bg-secondary/10' },
  'Delivery Assets':      { cls: 'text-[#245531] bg-[#E6F0EA] border-[#9FC3AE]' },
};

// ── Content Standards ──────────────────────────────────────────────────────

export const contentStandards: ContentStandard[] = [
  // ── Program Architecture ──────────────────────────────────────────────────

  {
    id: 'std-program-blueprint',
    name: 'Program Blueprint',
    objectType: 'Program Blueprint',
    category: 'Program Architecture',
    purpose: 'The design standard that defines what every Transition Trails program must contain before it can be delivered. The Program Blueprint is not a real program — it is the specification all programs are measured against. A real program (Foundations Trail, Guided Trail, etc.) implements this blueprint and can be evaluated for compliance.',
    whyItMatters: 'Without a shared design standard, programs drift in scope and structure — making Penny coaching inconsistent and curriculum governance impossible. The blueprint defines what SHOULD exist. Programs like Foundations Trail show what DOES exist. Foundations Trail is the primary reference implementation: the first program fully built to this standard. Use its structure as the concrete example when designing new programs.',
    requiredFields: [
      // ── 1. Program Structure ────────────────────────────────────────────
      { field: 'Program Name',             description: 'Official name as it appears in Salesforce Program__c. Must not be shared with any blueprint concept.', required: true },
      { field: 'Description',              description: 'One-paragraph summary of what learners achieve by completing this program.',                              required: true },
      { field: 'Target Cohort Size',       description: 'Expected learner count per cohort run.',                                                                 required: true },
      { field: 'Sprint Count',             description: 'Total sprints in the program. Must match Salesforce Service_Schedule__c records.',                       required: true },
      { field: 'Module Count',             description: 'Total modules across all sprints. Must match LMS course unit count.',                                    required: true },
      { field: 'Learning Objectives',      description: 'Program-level outcomes mapped to SF certification or role targets. Minimum 3.',                          required: true },
      { field: 'Owner',                    description: 'Named Curriculum Lead responsible for this program.',                                                    required: true },
      { field: 'Status',                   description: 'Draft / Published / Archived. Must match Salesforce Program__c Status field.',                           required: true },
      // ── 2. Learning Assets ──────────────────────────────────────────────
      { field: 'Module Sequence',          description: 'Ordered list of all modules with sprint assignment, sequence number, and learning objectives.',           required: true },
      { field: 'Lesson Set',               description: 'At least one lesson per module with objective, exercise, and resource link.',                             required: true },
      { field: 'Resource Library',         description: 'Supplementary reference materials linked to modules (Trailhead paths, help articles, internal docs).',   required: true },
      // ── 3. Assessment Strategy ──────────────────────────────────────────
      { field: 'Assessment per Module',    description: 'At least one assessment per module, mapped to module-level learning objectives.',                         required: true },
      { field: 'Assessment Rubric',        description: 'Pass/fail criteria and score thresholds for each assessment type.',                                       required: true },
      // ── 4. Knowledge Strategy ───────────────────────────────────────────
      { field: 'Knowledge Article Set',    description: 'Salesforce Knowledge articles covering program-specific content. Linked to modules and Penny context.',   required: true },
      { field: 'Source Document Archive',  description: 'Google Drive or Source Doc archive entry for all program materials not yet in Salesforce or LMS.',       required: true },
      // ── 5. Penny Strategy ───────────────────────────────────────────────
      { field: 'Penny Coaching Prompts',   description: 'At least one coaching prompt per module. Must reference module objectives.',                              required: true },
      { field: 'Penny Reflection Prompts', description: 'Post-module reflection prompts for each module.',                                                         required: true },
      { field: 'Penny Trail Quests',       description: 'Weekly milestone quests for each sprint.',                                                                required: true },
      { field: 'Penny Weekly Reviews',     description: 'Weekly review templates for each sprint, summarising progress and setting next-week focus.',              required: true },
      { field: 'Penny Config',             description: 'Which Penny persona and prompt style is active for this program.',                                        required: false },
      // ── 6. Communications Strategy ──────────────────────────────────────
      { field: 'Slack Activities',         description: 'Structured Slack interactions per module (cohort channel activities, DM nudges).',                        required: true },
      { field: 'Google Chat Updates',      description: 'Client/executive-facing Google Chat updates at defined program milestones.',                              required: false },
      // ── 7. Calendar Strategy ────────────────────────────────────────────
      { field: 'Calendar Events',          description: 'Cohort calendar events for all sessions, office hours, and assessment windows. Linked to SF Service_Schedule__c.', required: true },
      { field: 'Office Hours Schedule',    description: 'Recurring office hours entries for each sprint.',                                                         required: true },
      // ── 8. Google Drive Resource Strategy ───────────────────────────────
      { field: 'Drive Folder',             description: 'Google Drive workspace folder URL. Must be shared with the program team.',                                required: true },
      { field: 'Drive Sub-Folder Structure', description: 'Defined sub-folders: Coach Guides, Sprint Resources, Assessment Rubrics, Session Recordings.',         required: true },
      // ── 9. Salesforce Mapping ────────────────────────────────────────────
      { field: 'Salesforce Object Map',    description: 'Which SF objects power this program (Program__c, pmdm__ServiceSchedule__c, Learner_Course_Module__c, etc.).',          required: true },
      { field: 'SF Program Record',        description: 'Confirmed Program__c record in Salesforce with matching name and status.',                                required: true },
      // ── 10. Content Health ───────────────────────────────────────────────
      { field: 'Review Cycle',             description: 'When each content layer is reviewed (modules: per cohort; knowledge: quarterly).',                        required: true },
      { field: 'Content Health Checks',    description: 'Open content health issues tracked and assigned.',                                                        required: true },
      // ── 11. Standards Compliance ─────────────────────────────────────────
      { field: 'Standards Gap Report',     description: 'All open standards gaps have been reviewed and prioritised.',                                             required: false },
    ],
    qualityCriteria: [
      'All sprints have defined themes, durations, and module breakdowns',
      'Learning objectives map to at least one SF certification or role domain',
      'Every module has an assessment, reflection prompt, coaching prompt, and delivery activity',
      'Drive folder is configured, accessible, and has the required sub-folder structure',
      'All Salesforce structural objects are mapped and present in the org',
      'Program is linked to at least one active cohort in Salesforce',
      'Penny assets (coaching, reflection, trail quests, weekly reviews) exist for every sprint',
      'Calendar events cover all sessions, office hours, and assessment windows',
      'Knowledge articles cover all module topics and are linked in Penny context',
      'Content health issues are reviewed per-cohort',
    ],
    exampleOutput: 'Reference Implementation — Foundations Trail: 12-week cohort, 4 sprints, 12 modules. Target: SF Admin + Associate certifications. Salesforce: Program__c, pmdm__ServiceSchedule__c, Program_Engagement__c, Learner_Course_Module__c. Drive: Foundations Trail — Program Workspace (Active). Penny: 12 coaching prompts, 12 reflection prompts, 4 trail quests, 4 weekly reviews. Calendar: 48 sessions + 12 office hours. This shows the blueprint applied to a real program — not the blueprint itself.',
    sfMapping: 'Program__c (PMM) — top-level program record. pmdm__ServiceSchedule__c for cohort scheduling. Learner_Course_Module__c links program to LMS modules.',
    lmsMapping: 'Program-level record in LMS; maps to course catalog entry. All modules are course units with Learner_Course_Module__c assessment links.',
    relatedKnowledgeCategory: 'Program Architecture',
    relatedContentObjects: ['Module', 'Sprint', 'Cohort', 'Drive Resource', 'Salesforce Mapping', 'Penny Assets', 'Calendar Events'],
    owner: 'Curriculum Lead',
    reviewCycle: 'Quarterly',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: "Before generating any content for a program, Penny reads the Program Blueprint standard to understand the required structural shape: the expected module count, sprint count, learning objective depth, and which delivery assets must exist. Penny then checks the actual program record (e.g. Foundations Trail in Salesforce and Curriculum Studio) against these requirements — so Penny always knows the difference between 'this is defined by the standard' and 'this is what actually exists in the program right now'.",
    pennyChecks: [
      { id: 'bp-1', check: 'Program description present',        passing: 'One full paragraph describing learner outcomes',      failing: 'Description is missing or a single sentence',       required: true },
      { id: 'bp-2', check: 'Sprint and module counts declared',  passing: 'Sprint count > 0 and module count matches sprint breakdown', failing: 'Counts are 0 or inconsistent',              required: true },
      { id: 'bp-3', check: 'Learning objectives set',            passing: 'At least 3 program-level outcomes with action verbs', failing: 'No objectives or fewer than 3',                    required: true },
      { id: 'bp-4', check: 'Salesforce object map complete',     passing: 'All structural SF objects identified and present',    failing: 'No SF object map or partial mapping',               required: true },
      { id: 'bp-5', check: 'Drive folder configured',            passing: 'Drive URL present and status = Active',               failing: 'No Drive folder or status = Needs Setup',           required: true },
      { id: 'bp-6', check: 'Penny assets exist per sprint',      passing: 'Coaching, reflection, trail quest, and weekly review exist for every sprint', failing: 'Missing Penny assets for one or more sprints', required: true },
      { id: 'bp-7', check: 'Assessments aligned per module',     passing: 'Every module has at least one linked assessment',     failing: 'One or more modules have no assessment',            required: true },
      { id: 'bp-8', check: 'Calendar events configured',         passing: 'All sessions and office hours have calendar events',  failing: 'Missing calendar events for one or more sprints',  required: true },
      { id: 'bp-9', check: 'Owner assigned',                     passing: 'Owner field has a named Curriculum Lead',             failing: 'Owner is blank',                                    required: true },
    ],
  },

  {
    id: 'std-module',
    name: 'Module',
    objectType: 'Module',
    category: 'Program Architecture',
    purpose: 'Define a self-contained learning unit within a sprint. Each module has a clear theme, learning objectives, an aligned assessment, knowledge references, and delivery assets.',
    whyItMatters: 'Modules are the primary unit of curriculum design. Inconsistent modules create learner confusion and break Penny\'s ability to reference content accurately during coaching sessions.',
    requiredFields: [
      { field: 'Title',               description: 'Descriptive name of what learners will accomplish',               required: true },
      { field: 'Purpose',             description: '1-2 sentences on why this module exists in the program',           required: true },
      { field: 'Learning Objectives', description: 'Minimum 2 measurable objectives (action-verb + outcome)',          required: true },
      { field: 'Sprint',              description: 'Parent sprint this module belongs to',                             required: true },
      { field: 'Sequence',            description: 'Order within the sprint (1-based)',                                required: true },
      { field: 'Duration',            description: 'Estimated time in hours or sessions',                              required: true },
      { field: 'Assessment Alignment', description: 'Reference to the module-level assessment',                        required: true },
      { field: 'Knowledge References', description: 'Links to knowledge articles or Salesforce KB entries',            required: true },
      { field: 'Reflection Prompt',   description: 'The post-module reflection prompt Penny will deliver',             required: true },
      { field: 'Coach Guidance',      description: 'Notes for coaches on where learners typically struggle',           required: true },
      { field: 'Delivery Activity',   description: 'Slack or Google Chat activity tied to this module',               required: true },
      { field: 'Owner',               description: 'Who maintains this module',                                        required: true },
      { field: 'Status',             description: 'Draft / Review / Published / Archived',                            required: true },
      { field: 'SF Object',          description: 'Which Salesforce object this module teaches',                       required: false },
    ],
    qualityCriteria: [
      'All learning objectives use measurable action verbs (configure, identify, build, explain)',
      'At least one assessment is linked and objective-aligned',
      'Reflection prompt is written and linked',
      'At least one knowledge article is referenced',
      'Coach guidance covers at least one common learner struggle',
      'Delivery activity is assigned to either Slack or Google Chat',
    ],
    exampleOutput: 'Module 2: Building Your Data Model — Sprint 1, Sequence 2, 2 hours. Objectives: (1) Identify the relationship between Contacts, Accounts, and custom objects; (2) Configure a basic object schema for a nonprofit. Assessment: Data Model Quiz. Reflection Prompt: "What surprised you most about how Salesforce organizes data?" Coach Notes: Learners often confuse lookup vs master-detail — prompt with an analogy.',
    sfMapping: 'No direct SF object. Represented in LMS as a course unit. Linked via Program__c structure.',
    lmsMapping: 'Module = Course Unit in Salesforce LMS. Assessment alignment tracked via Learner_Course_Module__c.',
    relatedKnowledgeCategory: 'Program Architecture',
    relatedContentObjects: ['Sprint', 'Lesson', 'Assessment', 'Reflection Prompt', 'Coach Notes', 'Delivery Activity', 'Knowledge Article'],
    owner: 'Curriculum Lead',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: 'Penny reads module purpose and objectives before generating lessons, assessments, coaching prompts, or reflection prompts. The module is the context envelope Penny uses to stay on-topic.',
    pennyChecks: [
      { id: 'm-1', check: 'Has purpose',                       passing: 'Purpose field is 1-2 full sentences',              failing: 'Purpose is empty or a fragment',             required: true },
      { id: 'm-2', check: 'Has learning objectives',           passing: '2+ objectives with action verbs',                  failing: 'Fewer than 2 objectives or passive language', required: true },
      { id: 'm-3', check: 'Assessment alignment',              passing: 'Linked assessment references each objective',       failing: 'No linked assessment or no objective map',   required: true },
      { id: 'm-4', check: 'Knowledge references present',      passing: 'At least 1 knowledge article linked',              failing: 'No knowledge references',                    required: true },
      { id: 'm-5', check: 'Reflection prompt linked',          passing: 'Reflection prompt is written and assigned',         failing: 'Reflection prompt is missing',               required: true },
      { id: 'm-6', check: 'Coach guidance present',            passing: 'Coach Notes field has at least 1 struggle note',   failing: 'Coach guidance is blank',                    required: true },
      { id: 'm-7', check: 'Delivery activity assigned',        passing: 'Slack or Google Chat activity is linked',          failing: 'No delivery activity',                       required: true },
      { id: 'm-8', check: 'Owner assigned',                    passing: 'Owner field is populated',                         failing: 'Owner is blank',                             required: true },
    ],
  },

  // ── Learning Content ──────────────────────────────────────────────────────

  {
    id: 'std-lesson',
    name: 'Lesson',
    objectType: 'Lesson',
    category: 'Learning Content',
    purpose: 'Define a single, focused learning experience within a module. Each lesson must have a clear objective, measurable outcome, and at least one active exercise.',
    whyItMatters: 'Lessons are what learners actually experience. A lesson without a clear objective or exercise creates passive learning — which Transition Trails explicitly avoids. Penny uses lesson structure to generate exercises and follow-up questions.',
    requiredFields: [
      { field: 'Title',            description: 'Action-oriented lesson title',                                      required: true },
      { field: 'Objective',        description: 'Single, measurable learning objective',                             required: true },
      { field: 'Duration',         description: 'Estimated minutes or hours to complete',                            required: true },
      { field: 'Content Body',     description: 'Full lesson content or link to source doc',                         required: true },
      { field: 'Exercise',         description: 'Active learning task learner must complete',                        required: true },
      { field: 'Resource',         description: 'Supporting reference (Trailhead, Salesforce help, internal doc)',   required: true },
      { field: 'Outcome',          description: 'What the learner will have done/made by the end',                   required: true },
      { field: 'Parent Module',    description: 'The module this lesson belongs to',                                 required: true },
      { field: 'Sequence',         description: 'Order within the module',                                           required: true },
      { field: 'Status',          description: 'Draft / Review / Published',                                         required: true },
      { field: 'Trailhead Link',  description: 'Optional Trailhead module URL if externally hosted',                 required: false },
    ],
    qualityCriteria: [
      'Objective is a single, measurable statement (no compound objectives)',
      'Exercise requires learner to do something — not just read',
      'Outcome is observable (learner has built, configured, or explained X)',
      'Duration is realistic — no lesson exceeds 45 minutes',
      'Resource is a direct link, not a general "Google it"',
    ],
    exampleOutput: 'Lesson: "Configure Your First Custom Object" — Objective: Configure a custom Salesforce object with 3 required fields. Duration: 30 min. Exercise: In your dev org, create a Training_Program__c object with Name, Start_Date__c, and Status__c fields. Outcome: Learner has a custom object with custom fields visible in the Schema Builder. Resource: Salesforce Help — Custom Object Fields.',
    sfMapping: 'Learner_Course_Module__c (LMS) — each lesson maps to a learner course module. Completion tracked here.',
    lmsMapping: 'Lesson = Individual module within a course. Completion triggers Learner_Course_Module__c update.',
    relatedKnowledgeCategory: 'Learning Content',
    relatedContentObjects: ['Module', 'Assessment', 'Resource', 'Knowledge Article'],
    owner: 'Curriculum Author',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: 'Penny reads lesson objective and exercise before suggesting follow-up questions, coaching nudges, or next-step resources. If a lesson has no exercise, Penny will flag it for review.',
    pennyChecks: [
      { id: 'l-1', check: 'Has single objective',     passing: 'One clear measurable objective',          failing: 'Multiple objectives or vague outcome',    required: true },
      { id: 'l-2', check: 'Has duration',              passing: 'Duration is set and ≤ 45 minutes',       failing: 'Duration is missing or > 45 min',         required: true },
      { id: 'l-3', check: 'Has exercise',              passing: 'Exercise requires active learner action', failing: 'Exercise is missing or is just reading',  required: true },
      { id: 'l-4', check: 'Has resource link',         passing: 'At least one resource is linked',        failing: 'No resource',                             required: true },
      { id: 'l-5', check: 'Has outcome statement',     passing: 'Outcome describes what learner will have built/done', failing: 'Outcome is vague or absent', required: true },
    ],
  },

  {
    id: 'std-assessment',
    name: 'Assessment',
    objectType: 'Assessment',
    category: 'Learning Content',
    purpose: 'Validate that learners have achieved the module or lesson objectives. Assessments must be objective-aligned, appropriately calibrated in difficulty, and include feedback guidance for coaches.',
    whyItMatters: 'Assessments without objective alignment are just quizzes. When assessments map back to specific objectives, coaches can identify exactly where a learner is struggling — enabling targeted coaching.',
    requiredFields: [
      { field: 'Title',                description: 'Assessment name including scope (module or lesson)',            required: true },
      { field: 'Objective Mapping',    description: 'Which module/lesson objectives this assesses',                 required: true },
      { field: 'Question Count',       description: 'Total number of questions',                                    required: true },
      { field: 'Difficulty',           description: 'Foundational / Intermediate / Advanced',                       required: true },
      { field: 'Scoring Guide',        description: 'Passing threshold and point breakdown',                        required: true },
      { field: 'Feedback Guidance',    description: 'What to tell learners who score below threshold',              required: true },
      { field: 'Remediation Path',     description: 'Recommended content to revisit if learner fails',              required: true },
      { field: 'Parent Module',        description: 'Module this assessment belongs to',                            required: true },
      { field: 'Status',              description: 'Draft / Review / Published',                                    required: true },
      { field: 'Time Limit',          description: 'Optional time constraint in minutes',                           required: false },
      { field: 'Retake Policy',       description: 'How many times a learner can retake',                           required: false },
    ],
    qualityCriteria: [
      'Every question maps to at least one module/lesson objective',
      'Difficulty is calibrated to the module level in the program sequence',
      'Feedback guidance is specific, not generic ("Review the lesson")',
      'Remediation path points to specific lessons or resources — not the whole module',
      'Scoring guide clearly defines passing threshold',
    ],
    exampleOutput: 'Module 2 Assessment: Data Model Fundamentals — 10 questions, Intermediate, Pass: 80%. Objective Map: Q1-Q4 → "Identify relationships between objects"; Q5-Q10 → "Configure basic schema". Feedback: "Focus on the difference between lookup and master-detail relationships — review Lesson 2, Exercise 3." Remediation: Lesson 2 → Exercise 3 → Schema Builder activity.',
    sfMapping: 'Learner_Course_Module__c with record type = Assessment. Completion score stored in Program_Engagement__c.',
    lmsMapping: 'Assessment = Quiz/Test object in LMS. Score synced to Salesforce on completion.',
    relatedKnowledgeCategory: 'Learning Content',
    relatedContentObjects: ['Module', 'Lesson', 'Coach Notes', 'Knowledge Article', 'Reflection Prompt'],
    owner: 'Curriculum Lead',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: 'Penny reads assessment objective mapping to generate targeted coaching prompts. After a learner completes an assessment, Penny references the feedback guidance and remediation path to determine the next conversation topic.',
    pennyChecks: [
      { id: 'a-1', check: 'Objective mapping present',     passing: 'All questions reference at least 1 objective',        failing: 'Questions have no objective references',         required: true },
      { id: 'a-2', check: 'Difficulty level set',          passing: 'Difficulty is Foundational / Intermediate / Advanced', failing: 'Difficulty is blank or "TBD"',                   required: true },
      { id: 'a-3', check: 'Scoring guide complete',        passing: 'Passing threshold is defined with point breakdown',   failing: 'No scoring guide or threshold',                  required: true },
      { id: 'a-4', check: 'Feedback guidance written',     passing: 'Specific feedback for below-threshold scores',        failing: 'Feedback says "review the lesson" only',         required: true },
      { id: 'a-5', check: 'Remediation path specified',    passing: 'Points to specific lesson or exercise',               failing: 'Remediation is vague or absent',                 required: true },
    ],
  },

  {
    id: 'std-knowledge-article',
    name: 'Knowledge Article',
    objectType: 'Knowledge Article',
    category: 'Learning Content',
    purpose: 'Provide a reference-grade explanation of a Salesforce concept, feature, or workflow relevant to the program. Knowledge articles are Penny\'s primary source of truth when answering learner questions.',
    whyItMatters: 'Penny cites knowledge articles when answering learner questions. An article without an owner, review date, or accurate content will cause Penny to give incorrect or stale guidance — directly harming learner trust.',
    requiredFields: [
      { field: 'Title',            description: 'Concise, searchable title',                                         required: true },
      { field: 'Summary',          description: '2-3 sentence overview for quick scanning',                          required: true },
      { field: 'Body',             description: 'Full content (markdown or rich text)',                              required: true },
      { field: 'Category',         description: 'Salesforce product area or concept category',                       required: true },
      { field: 'Related Objects',  description: 'Which SF objects are discussed',                                    required: true },
      { field: 'Owner',            description: 'Who is responsible for keeping this accurate',                      required: true },
      { field: 'Review Date',      description: 'When this article must next be reviewed for accuracy',             required: true },
      { field: 'Status',          description: 'Draft / Published / Archived',                                       required: true },
      { field: 'Source',          description: 'Reference to Salesforce help, Trailhead, or internal doc',          required: false },
      { field: 'Tags',            description: 'Keywords for search indexing',                                       required: false },
    ],
    qualityCriteria: [
      'Summary can stand alone — someone can understand the concept from the summary alone',
      'Body includes at least one concrete Salesforce example (field name, object name, etc.)',
      'Review date is no more than 6 months in the future',
      'Owner is a named person, not "Curriculum Team"',
      'Related objects are specified using Salesforce API names, not display names',
    ],
    exampleOutput: 'Title: "Lookup vs Master-Detail Relationships". Summary: Salesforce supports two relationship types between objects: Lookup (flexible, deletable parent) and Master-Detail (tightly coupled, deletion cascades). Choosing the wrong type can cause data loss. Body: [full content with field examples, diagrams, and use cases]. Owner: Curriculum Lead. Review: June 2025. Category: Data Architecture. SF Objects: Account, Contact, any custom object.',
    sfMapping: 'Knowledge__c (Salesforce Knowledge). Published articles sync to learner-facing Help center.',
    lmsMapping: 'Referenced via Learner_Course_Module__c notes or linked as external resource in LMS course.',
    relatedKnowledgeCategory: 'Knowledge Management',
    relatedContentObjects: ['Module', 'Lesson', 'Assessment', 'Coach Notes', 'Penny Coaching Prompt'],
    owner: 'Knowledge Owner (named)',
    reviewCycle: '6 months',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: 'Penny searches knowledge articles to answer learner questions. Article summary is used for quick answers; full body is referenced for detailed guidance. Penny will not cite an article that is Archived or past its review date.',
    pennyChecks: [
      { id: 'ka-1', check: 'Has summary',            passing: '2-3 sentence standalone summary',                    failing: 'Summary is missing or is same as title',       required: true },
      { id: 'ka-2', check: 'Has full body content',  passing: 'Body has substantive content with SF examples',     failing: 'Body is empty or "Coming soon"',                required: true },
      { id: 'ka-3', check: 'Owner is named',         passing: 'Owner is a specific person, not "Team"',            failing: 'Owner is blank or a team name',                 required: true },
      { id: 'ka-4', check: 'Review date set',        passing: 'Review date is within 6 months',                    failing: 'No review date or date is overdue',             required: true },
      { id: 'ka-5', check: 'Related SF objects set', passing: 'At least 1 SF API name referenced',                 failing: 'No SF objects linked',                          required: false },
    ],
  },

  // ── Penny Assets ─────────────────────────────────────────────────────────

  {
    id: 'std-reflection-prompt',
    name: 'Reflection Prompt',
    objectType: 'Reflection Prompt',
    category: 'Penny Assets',
    purpose: 'Guide learners through structured self-reflection after completing a module. Reflection prompts are how Penny moves learners from passive completion to active meaning-making.',
    whyItMatters: 'Adults learn by connecting new information to existing experience. A well-crafted reflection prompt surfaces that connection. Without it, learners complete content without integrating it — reducing retention and application.',
    requiredFields: [
      { field: 'Prompt Text',      description: 'The open-ended question Penny will ask the learner',                required: true },
      { field: 'Parent Module',    description: 'Which module this reflection follows',                              required: true },
      { field: 'Learning Focus',   description: 'Which concept or objective this reflection targets',                required: true },
      { field: 'Tone',             description: 'Coaching / Exploratory / Celebratory / Challenging',                required: true },
      { field: 'Expected Length',  description: 'Guidance on response length (1-2 sentences / short paragraph)',    required: true },
      { field: 'Follow-up Prompt', description: 'What Penny asks if learner gives a surface-level answer',          required: true },
      { field: 'Status',          description: 'Draft / Review / Published',                                         required: true },
    ],
    qualityCriteria: [
      'Prompt is open-ended — cannot be answered with yes/no',
      'Prompt references the module theme or a specific concept',
      'Follow-up prompt digs deeper — not just "tell me more"',
      'Tone matches the module position in the program sequence (earlier = exploratory, later = challenging)',
      'Expected length is set so Penny can calibrate follow-up timing',
    ],
    exampleOutput: 'Module 2 Reflection — "Looking back at your data model exercise, what was the moment you felt most uncertain, and how did you work through it?" Follow-up: "What would you do differently if you were configuring that object for a different organization?" Tone: Exploratory. Expected: Short paragraph.',
    sfMapping: 'No direct SF object. Stored in Trail OS as curriculum asset; linked to Module record.',
    lmsMapping: 'Not tracked in LMS. Delivered by Penny in Slack/Google Chat after module completion event.',
    relatedKnowledgeCategory: 'Penny Assets',
    relatedContentObjects: ['Module', 'Coach Notes', 'Penny Coaching Prompt', 'Slack Activity'],
    owner: 'Penny Content Author',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'high',
    howPennyUsesIt: 'Penny delivers the reflection prompt via Slack or Google Chat after a module completion is detected. The follow-up prompt is used when the learner\'s initial response is fewer than 2 sentences or appears surface-level.',
    pennyChecks: [
      { id: 'rp-1', check: 'Open-ended question',       passing: 'Cannot be answered yes/no',                      failing: 'Is a yes/no or factual recall question',        required: true },
      { id: 'rp-2', check: 'References module theme',   passing: 'Prompt mentions specific concept from module',   failing: 'Prompt is generic and could apply to any module', required: true },
      { id: 'rp-3', check: 'Has follow-up prompt',      passing: 'Follow-up digs deeper than "tell me more"',      failing: 'No follow-up or is just "tell me more"',        required: true },
      { id: 'rp-4', check: 'Tone is set',               passing: 'Tone is one of the four defined types',          failing: 'Tone is blank',                                 required: true },
    ],
  },

  {
    id: 'std-coach-notes',
    name: 'Coach Notes',
    objectType: 'Coach Notes',
    category: 'Penny Assets',
    purpose: 'Equip human coaches with context on where learners typically struggle in a module, and what language, analogies, or exercises help. Coach notes are also Penny\'s secondary context layer for nuanced coaching.',
    whyItMatters: 'Coaches without module-specific guidance default to general encouragement. Specific struggle patterns and tested interventions let coaches (and Penny) provide targeted support that actually moves learners forward.',
    requiredFields: [
      { field: 'Module Reference',    description: 'Which module these notes apply to',                             required: true },
      { field: 'Common Struggles',    description: 'Specific concepts or tasks where learners most often get stuck', required: true },
      { field: 'Coaching Language',   description: 'Suggested phrases or analogies that have worked',               required: true },
      { field: 'Watch-for Signals',   description: 'Behavioral signals that a learner is confused or disengaged',  required: true },
      { field: 'Escalation Trigger',  description: 'When to flag this learner for human coach intervention',       required: true },
      { field: 'Status',             description: 'Draft / Review / Published',                                     required: true },
      { field: 'Source',             description: 'Where this guidance came from (cohort debrief, Penny logs, etc.)', required: false },
    ],
    qualityCriteria: [
      'Common struggles are specific to this module — not generic learning challenges',
      'Coaching language includes at least one analogy or reframe',
      'Watch-for signals are observable behaviors, not feelings',
      'Escalation trigger is a specific threshold (e.g., 2 missed check-ins, score < 60%)',
    ],
    exampleOutput: 'Module 2 Coach Notes — Common Struggle: Learners confuse lookup and master-detail at the "parent deletion" step. Coaching Language: "Think of master-detail like a parent-child adoption — if the parent leaves, the child can\'t stay either. Lookup is more like a friend reference." Watch-For: Learner stops responding after the data model exercise. Escalation: No response + score < 65%.',
    sfMapping: 'No direct SF object. Internal asset linked to Module record in Trail OS.',
    lmsMapping: 'Not in LMS. Surfaces in coach dashboard when a learner triggers a struggle signal.',
    relatedKnowledgeCategory: 'Penny Assets',
    relatedContentObjects: ['Module', 'Reflection Prompt', 'Assessment', 'Penny Coaching Prompt'],
    owner: 'Penny Content Author + Curriculum Lead',
    reviewCycle: 'After each cohort debrief',
    status: 'active',
    confidence: 'medium',
    howPennyUsesIt: 'Penny reads coach notes as secondary context when a learner shows a watch-for signal. The coaching language is used to craft Penny\'s response. Escalation triggers cause Penny to tag the session for human coach review.',
    pennyChecks: [
      { id: 'cn-1', check: 'Common struggles present',     passing: 'At least 1 module-specific struggle described',     failing: 'Struggles are generic or absent',              required: true },
      { id: 'cn-2', check: 'Coaching language provided',   passing: 'At least 1 analogy or reframe phrase',              failing: 'Only generic "be encouraging" guidance',       required: true },
      { id: 'cn-3', check: 'Watch-for signals defined',    passing: 'Observable behavioral signals listed',              failing: 'No signals or "looks confused" type entries',  required: true },
      { id: 'cn-4', check: 'Escalation trigger set',       passing: 'Specific threshold for human coach handoff',        failing: 'No escalation trigger defined',                required: true },
    ],
  },

  {
    id: 'std-penny-prompt',
    name: 'Penny Prompt',
    objectType: 'Penny Prompt',
    category: 'Penny Assets',
    purpose: 'Define the specific coaching question or nudge Penny delivers at key learner moments — module start, mid-sprint check-in, completion, or struggle detection. Each prompt is context-bound and persona-consistent.',
    whyItMatters: 'Penny\'s value is in the specificity and timing of its questions. Generic prompts ("How are you doing?") erode trust. Context-bound prompts that reference the learner\'s actual module create the sense that Penny truly understands their learning journey.',
    requiredFields: [
      { field: 'Prompt Text',       description: 'The exact message Penny will send (with any dynamic field tokens)',   required: true },
      { field: 'Trigger',           description: 'When this prompt fires: module-start, completion, struggle, check-in', required: true },
      { field: 'Module Context',    description: 'Which module or sprint this prompt is associated with',               required: true },
      { field: 'Tone',              description: 'Welcoming / Curious / Celebratory / Challenging / Supportive',        required: true },
      { field: 'Dynamic Fields',    description: 'Learner name, module name, score, or other tokens',                   required: false },
      { field: 'Response Handlers', description: 'How Penny should handle different types of learner responses',        required: true },
      { field: 'Status',           description: 'Draft / Review / Published',                                           required: true },
    ],
    qualityCriteria: [
      'Prompt is specific to the module/sprint context — not reusable across all modules',
      'Trigger timing is precisely defined (not "around completion")',
      'Tone matches the learner moment (Celebratory for completion, Supportive for struggle)',
      'Response handlers cover at least: positive response, neutral response, no response',
      'Dynamic fields are tested with sample learner data before publishing',
    ],
    exampleOutput: 'Module 2 Completion Prompt — "You just finished the Data Model module — that\'s one of the trickiest ones! {{learner_name}}, I\'d love to hear: what felt most like it clicked for you?" Trigger: Module completion event. Tone: Celebratory → Curious. Response Handlers: Specific answer → follow-up reflection prompt; "I don\'t know" → offer to revisit exercise 3.',
    sfMapping: 'No direct SF object. Linked to Learner_Course_Module__c as completion-triggered automation metadata.',
    lmsMapping: 'Prompt delivery triggered by LMS module completion webhook. Response logged in Penny Logs.',
    relatedKnowledgeCategory: 'Penny Assets',
    relatedContentObjects: ['Module', 'Reflection Prompt', 'Coach Notes', 'Weekly Review'],
    owner: 'Penny Content Author',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'medium',
    howPennyUsesIt: 'Penny Prompts are the scripted layer of Penny\'s voice. Penny selects the appropriate prompt based on the trigger event and learner context, then uses the response handlers to continue the conversation naturally.',
    pennyChecks: [
      { id: 'pp-1', check: 'Prompt is context-specific',    passing: 'References module or sprint by name or concept', failing: 'Could apply to any module generically',           required: true },
      { id: 'pp-2', check: 'Trigger is defined',            passing: 'Specific event (completion, struggle, check-in)', failing: 'Trigger is vague or "when appropriate"',         required: true },
      { id: 'pp-3', check: 'Tone is set',                   passing: 'One of the five defined tones',                  failing: 'Tone is blank',                                  required: true },
      { id: 'pp-4', check: 'Response handlers present',     passing: 'Covers positive, neutral, and no-response',      failing: 'Only one response type handled',                 required: true },
    ],
  },

  // ── Delivery Assets ───────────────────────────────────────────────────────

  {
    id: 'std-slack-activity',
    name: 'Slack Activity',
    objectType: 'Slack Activity',
    category: 'Delivery Assets',
    purpose: 'Define the structured Slack interaction that reinforces module learning in a cohort or channel setting. Slack activities are community-first exercises delivered between or after lessons.',
    whyItMatters: 'Learning doesn\'t stop when the lesson file closes. Slack activities extend learning into the cohort community, create social accountability, and give Penny a channel to observe participation signals.',
    requiredFields: [
      { field: 'Title',              description: 'Activity name',                                                     required: true },
      { field: 'Channel',            description: 'Target Slack channel (cohort, program, or shared)',                  required: true },
      { field: 'Trigger',            description: 'When this activity is posted (module completion, scheduled, manual)', required: true },
      { field: 'Activity Type',      description: 'Discussion / Poll / Share / Challenge / Check-in',                   required: true },
      { field: 'Prompt Text',        description: 'The message Penny or the bot posts',                                 required: true },
      { field: 'Expected Response',  description: 'What a good participation looks like',                               required: true },
      { field: 'Module Alignment',   description: 'Which module this activity supports',                                required: true },
      { field: 'Status',            description: 'Draft / Review / Published',                                          required: true },
      { field: 'Follow-up Action',  description: 'What happens if a learner does/does not respond',                     required: false },
    ],
    qualityCriteria: [
      'Activity type is appropriate for the module theme (discussion for conceptual, challenge for technical)',
      'Prompt text is conversational — matches Penny\'s voice, not corporate HR-speak',
      'Expected response gives coaches a benchmark for participation quality',
      'Module alignment is specified — activity isn\'t floating without context',
      'Trigger timing ensures activity posts within 24 hours of module trigger',
    ],
    exampleOutput: 'Module 2 Slack Activity — Channel: #foundations-trail-cohort-1. Type: Challenge. Prompt: "Time for a data model challenge! Share a screenshot of your Training_Program__c object with all 3 required fields configured. First one to share gets a ⭐ from Penny!" Trigger: Module 2 completion. Expected Response: Screenshot with visible field names.',
    sfMapping: 'Linked to Learner_Course_Module__c via external activity reference. Participation logged in Salesforce via Slack webhook.',
    lmsMapping: 'Not tracked in LMS. Participation data feeds into Penny engagement score.',
    relatedKnowledgeCategory: 'Delivery Assets',
    relatedContentObjects: ['Module', 'Reflection Prompt', 'Google Chat Update', 'Penny Prompt'],
    owner: 'Curriculum Author + Delivery Lead',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'medium',
    howPennyUsesIt: 'Penny posts Slack Activities automatically on trigger events. Non-participation within 24 hours triggers a gentle follow-up. Penny uses participation patterns to adjust subsequent coaching intensity.',
    pennyChecks: [
      { id: 'sa-1', check: 'Channel specified',              passing: 'Specific Slack channel named',                 failing: 'Channel is blank or "TBD"',                    required: true },
      { id: 'sa-2', check: 'Activity type defined',          passing: 'One of the five defined types',               failing: 'Type is blank or "other"',                     required: true },
      { id: 'sa-3', check: 'Prompt text written',            passing: 'Full prompt text with Penny voice',           failing: 'Prompt is a placeholder or formal HR tone',    required: true },
      { id: 'sa-4', check: 'Module alignment set',           passing: 'Linked to specific module',                   failing: 'Activity has no module link',                  required: true },
    ],
  },

  {
    id: 'std-google-chat-update',
    name: 'Google Chat Update',
    objectType: 'Google Chat Update',
    category: 'Delivery Assets',
    purpose: 'Deliver structured learning updates, nudges, or announcements in Google Chat spaces. Used for programs that operate in Google Workspace environments or for cross-cohort comms.',
    whyItMatters: 'Some cohorts operate in Google Chat rather than Slack. Having a parallel delivery standard ensures Penny can serve learners regardless of which platform the program uses — without degrading the learning experience.',
    requiredFields: [
      { field: 'Title',           description: 'Update name',                                                          required: true },
      { field: 'Space',           description: 'Target Google Chat space',                                             required: true },
      { field: 'Message Type',    description: 'Announcement / Check-in / Nudge / Celebration / Resource',            required: true },
      { field: 'Message Text',    description: 'Full message Penny will post',                                         required: true },
      { field: 'Trigger',        description: 'When this message fires',                                               required: true },
      { field: 'Module Alignment', description: 'Which module this update supports',                                   required: true },
      { field: 'Status',         description: 'Draft / Review / Published',                                            required: true },
    ],
    qualityCriteria: [
      'Message text is brief — Google Chat updates should be under 150 words',
      'Message type matches the moment (Celebration for completion, Nudge for lagging)',
      'Trigger is tied to a specific event, not a generic calendar date',
    ],
    exampleOutput: 'Module 2 Google Chat Update — Space: Foundations Trail Cohort 1. Type: Celebration. Message: "🎉 Big round of applause for everyone who finished the Data Model module this week! You just tackled one of the most conceptual parts of the whole program. {{completed_count}} of you are through — keep that momentum going!" Trigger: Module 2 completion ≥ 60% of cohort.',
    sfMapping: 'No direct SF object. Delivery event logged via Google Chat webhook to Program_Engagement__c.',
    lmsMapping: 'Not in LMS. Delivery confirmation triggers an engagement log entry.',
    relatedKnowledgeCategory: 'Delivery Assets',
    relatedContentObjects: ['Module', 'Slack Activity', 'Penny Prompt', 'Calendar Reminder'],
    owner: 'Delivery Lead',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'medium',
    howPennyUsesIt: 'Penny posts Google Chat Updates on defined trigger events. For hybrid programs using both Slack and Google Chat, Penny posts to both simultaneously with platform-appropriate tone adjustments.',
    pennyChecks: [
      { id: 'gc-1', check: 'Space specified',          passing: 'Named Google Chat space',                           failing: 'Space is blank',                               required: true },
      { id: 'gc-2', check: 'Message under 150 words',  passing: 'Message text ≤ 150 words',                         failing: 'Message is too long for Chat format',          required: true },
      { id: 'gc-3', check: 'Trigger defined',          passing: 'Specific trigger event named',                     failing: 'Trigger is blank or vague',                    required: true },
    ],
  },

  {
    id: 'std-calendar-reminder',
    name: 'Calendar Reminder',
    objectType: 'Calendar Reminder',
    category: 'Delivery Assets',
    purpose: 'Ensure learners are prepared for time-bound cohort events — office hours, live sessions, assessment windows, or sprint deadlines — with appropriately timed reminders.',
    whyItMatters: 'Missed office hours and live sessions are the top dropout predictor in cohort programs. Well-timed, contextually aware reminders from Penny (rather than generic calendar invites) dramatically improve attendance rates.',
    requiredFields: [
      { field: 'Event Title',      description: 'Name of the event being reminded about',                             required: true },
      { field: 'Event Type',       description: 'Office Hours / Live Session / Assessment Window / Sprint Deadline',   required: true },
      { field: 'Lead Time',        description: 'How far in advance reminder fires (24h, 1h, 15min)',                  required: true },
      { field: 'Reminder Text',    description: 'The message Penny sends with the reminder',                          required: true },
      { field: 'Channel',          description: 'Slack DM / Google Chat DM / Email',                                  required: true },
      { field: 'Module Alignment', description: 'Which module or sprint this event supports',                         required: true },
      { field: 'Status',          description: 'Draft / Review / Published',                                          required: true },
    ],
    qualityCriteria: [
      'Reminder text tells learners exactly what to bring or prepare — not just "don\'t forget"',
      'Lead time is appropriate: 24h for preparation reminders, 1h for logistics reminders',
      'Event type determines Penny\'s tone (encouraging for office hours, urgent for deadlines)',
    ],
    exampleOutput: 'Sprint 1 Office Hours Reminder — Event: Module 1-3 Office Hours. Lead Time: 24 hours. Channel: Slack DM. Reminder: "Office hours tomorrow at 2pm! 🗓️ Come with your data model exercise if you hit any snags — this is the best time to get unstuck before Sprint 2 begins. See you there!"',
    sfMapping: 'Linked to Service_Attendance__c — attendance at office hours tracked here. Reminder delivery logged.',
    lmsMapping: 'Not in LMS. Calendar event synced via Google Calendar integration.',
    relatedKnowledgeCategory: 'Delivery Assets',
    relatedContentObjects: ['Sprint', 'Module', 'Slack Activity', 'Google Chat Update'],
    owner: 'Delivery Lead',
    reviewCycle: 'Per cohort cycle',
    status: 'active',
    confidence: 'medium',
    howPennyUsesIt: 'Penny sends calendar reminders automatically based on cohort schedule. Reminder text is personalized if the learner has incomplete modules — Penny references specific gaps in the reminder message.',
    pennyChecks: [
      { id: 'cr-1', check: 'Lead time specified',         passing: 'Specific lead time (24h, 1h, 15min)',             failing: 'Lead time is blank or "TBD"',                  required: true },
      { id: 'cr-2', check: 'Reminder text is specific',   passing: 'Tells learner what to prepare or bring',          failing: 'Generic "don\'t forget" message',               required: true },
      { id: 'cr-3', check: 'Channel defined',             passing: 'Specific channel named',                          failing: 'Channel is blank',                             required: true },
    ],
  },
];

// ── Summary ────────────────────────────────────────────────────────────────

export const STANDARDS_SUMMARY = {
  total:       contentStandards.length,
  byStatus: {
    active:  contentStandards.filter(s => s.status === 'active').length,
    review:  contentStandards.filter(s => s.status === 'review').length,
    draft:   contentStandards.filter(s => s.status === 'draft').length,
  },
  byCategory: {
    'Program Architecture': contentStandards.filter(s => s.category === 'Program Architecture').length,
    'Learning Content':     contentStandards.filter(s => s.category === 'Learning Content').length,
    'Penny Assets':         contentStandards.filter(s => s.category === 'Penny Assets').length,
    'Delivery Assets':      contentStandards.filter(s => s.category === 'Delivery Assets').length,
  },
  totalChecks: contentStandards.reduce((sum, s) => sum + s.pennyChecks.length, 0),
  requiredChecks: contentStandards.reduce((sum, s) => sum + s.pennyChecks.filter(c => c.required).length, 0),
};

// ── Gap Report (Foundations Trail prototype data) ──────────────────────────

export const gapReportItems: GapReportItem[] = [
  {
    id: 'gap-001',
    gapType: 'missing-field',
    objectType: 'Module',
    objectName: 'Module 3: Automation Fundamentals',
    program: 'Foundations Trail',
    sprint: 'Sprint 1',
    gapDescription: 'Reflection prompt is missing. Module has no linked post-completion reflection for Penny to deliver.',
    standardId: 'std-module',
    severity: 'high',
    suggestedAction: 'Create reflection prompt using Standard: Reflection Prompt. Link to Module 3 before Sprint 1 cohort launch.',
  },
  {
    id: 'gap-002',
    gapType: 'missing-field',
    objectType: 'Module',
    objectName: 'Module 7: Reports & Dashboards',
    program: 'Foundations Trail',
    sprint: 'Sprint 2',
    gapDescription: 'Coach guidance is missing. No coach notes have been written for this module.',
    standardId: 'std-module',
    severity: 'high',
    suggestedAction: 'Write coach notes for Module 7 — priority: common struggles with report filters and chart types.',
  },
  {
    id: 'gap-003',
    gapType: 'missing-field',
    objectType: 'Module',
    objectName: 'Module 11: Nonprofit Automation',
    program: 'Foundations Trail',
    sprint: 'Sprint 3',
    gapDescription: 'Delivery activity is missing. No Slack or Google Chat activity is linked.',
    standardId: 'std-module',
    severity: 'medium',
    suggestedAction: 'Create a Slack challenge activity for Module 11 — suggest a "share your flow screenshot" type activity.',
  },
  {
    id: 'gap-004',
    gapType: 'missing-alignment',
    objectType: 'Lesson',
    objectName: 'Lesson 4.2: Validation Rules',
    program: 'Foundations Trail',
    sprint: 'Sprint 2',
    gapDescription: 'Assessment alignment is missing. This lesson has no linked assessment and its objective is not referenced by any assessment question.',
    standardId: 'std-lesson',
    severity: 'high',
    suggestedAction: 'Add lesson objective to Module 4 Assessment objective map. Create or extend assessment question for validation rule concepts.',
  },
  {
    id: 'gap-005',
    gapType: 'missing-alignment',
    objectType: 'Lesson',
    objectName: 'Lesson 6.1: NPSP Household Model',
    program: 'Foundations Trail',
    sprint: 'Sprint 2',
    gapDescription: 'Learning objective not mapped to any assessment question. Module 6 assessment covers NPSP accounts but not the household model specifically.',
    standardId: 'std-assessment',
    severity: 'medium',
    suggestedAction: 'Add 1-2 assessment questions for NPSP Household model to Module 6 Assessment. Update objective map.',
  },
  {
    id: 'gap-006',
    gapType: 'missing-alignment',
    objectType: 'Assessment',
    objectName: 'Module 9 Assessment: Salesforce Knowledge',
    program: 'Foundations Trail',
    sprint: 'Sprint 3',
    gapDescription: 'Feedback guidance is generic ("review the module"). Does not point to specific lessons or remediation exercises.',
    standardId: 'std-assessment',
    severity: 'medium',
    suggestedAction: 'Rewrite feedback guidance to reference specific lessons. Add remediation path pointing to Lesson 9.1 and Knowledge Article: "SF Knowledge Object Architecture".',
  },
  {
    id: 'gap-007',
    gapType: 'missing-owner',
    objectType: 'Knowledge Article',
    objectName: 'NPSP Gift Entry Overview',
    program: 'Foundations Trail',
    gapDescription: 'Owner field is blank. No named individual is responsible for keeping this article accurate.',
    standardId: 'std-knowledge-article',
    severity: 'high',
    suggestedAction: 'Assign a named knowledge owner. Suggest: Curriculum Lead or designated NPSP subject matter expert.',
  },
  {
    id: 'gap-008',
    gapType: 'missing-owner',
    objectType: 'Knowledge Article',
    objectName: 'Volunteer Management — Time Entry',
    program: 'Foundations Trail',
    gapDescription: 'Owner field is "Curriculum Team" — not a named individual. Review date is also overdue by 2 months.',
    standardId: 'std-knowledge-article',
    severity: 'high',
    suggestedAction: 'Assign named owner and set a new review date within 6 months. Article content should be reviewed for Salesforce version accuracy.',
  },
  {
    id: 'gap-009',
    gapType: 'missing-owner',
    objectType: 'Knowledge Article',
    objectName: 'Program Engagement Status Values',
    program: 'Foundations Trail',
    gapDescription: 'No owner assigned. This article is cited by Penny in learner responses but has no one responsible for accuracy.',
    standardId: 'std-knowledge-article',
    severity: 'high',
    suggestedAction: 'Assign owner immediately — Penny is actively using this article. Flag for review before next cohort.',
  },
  {
    id: 'gap-010',
    gapType: 'duplicate-concept',
    objectType: 'Knowledge Article',
    objectName: 'Object Relationships in Salesforce',
    program: 'Foundations Trail',
    gapDescription: 'Concept of "lookup vs master-detail" is covered in both this article and "Lookup vs Master-Detail Relationships". Penny may cite either article with different phrasing, causing inconsistency.',
    standardId: 'std-knowledge-article',
    severity: 'medium',
    suggestedAction: 'Merge or differentiate the two articles. Designate "Lookup vs Master-Detail Relationships" as canonical. Update cross-references in lessons and assessments.',
  },
  {
    id: 'gap-011',
    gapType: 'duplicate-concept',
    objectType: 'Lesson',
    objectName: 'Lesson 2.3: Field Types Overview',
    program: 'Foundations Trail',
    sprint: 'Sprint 1',
    gapDescription: 'Field types are also covered in Lesson 1.4 ("Salesforce Data Types"). Overlapping content may cause learner confusion about which lesson is definitive.',
    standardId: 'std-lesson',
    severity: 'low',
    suggestedAction: 'Review scope of both lessons. Lesson 1.4 should introduce concepts; Lesson 2.3 should extend with practical configuration. Add a "builds on" reference note.',
  },
  {
    id: 'gap-012',
    gapType: 'overdue-review',
    objectType: 'Knowledge Article',
    objectName: 'Salesforce Admin Certification — Exam Guide',
    program: 'Foundations Trail',
    gapDescription: 'Review date was January 2025 — now 5 months overdue. Salesforce updated exam guide content in Spring 2025 release.',
    standardId: 'std-knowledge-article',
    severity: 'high',
    suggestedAction: 'Review immediately against Spring 2025 Salesforce Cert exam guide. Update content and set new review date.',
  },
  {
    id: 'gap-013',
    gapType: 'overdue-review',
    objectType: 'Assessment',
    objectName: 'Module 5 Assessment: Security & Access',
    program: 'Foundations Trail',
    sprint: 'Sprint 2',
    gapDescription: 'Assessment was last reviewed before the Summer 2024 cohort. Profile vs Permission Set guidance changed with Salesforce\'s permission set push. Some questions reference deprecated profile-first approach.',
    standardId: 'std-assessment',
    severity: 'high',
    suggestedAction: 'Update Q3 and Q7 to reflect permission set-first approach. Remove references to profile-based security as default.',
  },
  {
    id: 'gap-014',
    gapType: 'missing-field',
    objectType: 'Reflection Prompt',
    objectName: 'Module 5 Reflection',
    program: 'Foundations Trail',
    sprint: 'Sprint 2',
    gapDescription: 'Follow-up prompt is missing. Penny has no deepening question to use when learner gives a surface-level response.',
    standardId: 'std-reflection-prompt',
    severity: 'medium',
    suggestedAction: 'Add follow-up prompt to Module 5 Reflection. Follow-up should dig into how the learner would apply security access decisions in a real org.',
  },
  {
    id: 'gap-015',
    gapType: 'missing-field',
    objectType: 'Penny Prompt',
    objectName: 'Module 8 Completion Prompt',
    program: 'Foundations Trail',
    sprint: 'Sprint 3',
    gapDescription: 'Response handlers are incomplete — only "positive response" handler is defined. Neutral response and no-response handlers are missing.',
    standardId: 'std-penny-prompt',
    severity: 'medium',
    suggestedAction: 'Add neutral response handler (learner says "fine" or "ok") and no-response handler (learner doesn\'t reply within 48h).',
  },
];

export const GAP_SUMMARY = {
  total: gapReportItems.length,
  bySeverity: {
    high:   gapReportItems.filter(g => g.severity === 'high').length,
    medium: gapReportItems.filter(g => g.severity === 'medium').length,
    low:    gapReportItems.filter(g => g.severity === 'low').length,
  },
  byType: {
    'missing-field':     gapReportItems.filter(g => g.gapType === 'missing-field').length,
    'missing-alignment': gapReportItems.filter(g => g.gapType === 'missing-alignment').length,
    'missing-owner':     gapReportItems.filter(g => g.gapType === 'missing-owner').length,
    'duplicate-concept': gapReportItems.filter(g => g.gapType === 'duplicate-concept').length,
    'overdue-review':    gapReportItems.filter(g => g.gapType === 'overdue-review').length,
  },
};
