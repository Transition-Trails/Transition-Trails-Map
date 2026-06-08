// ── Penny Content Assistant — Action Definitions & Sample Outputs ────────────
// Penny as curriculum architect and content co-author for Transition Trails staff.
// These are the 11 prototype content generation actions available in the
// Penny Content Assistant workspace.

export type PennyActionId =
  | 'generate-module-outline'
  | 'create-lesson'
  | 'create-assessment-support'
  | 'create-knowledge-article'
  | 'create-reflection-prompt'
  | 'create-coach-notes'
  | 'create-slack-activity'
  | 'create-google-chat-update'
  | 'create-calendar-reminder'
  | 'generate-sprint-outline'
  | 'review-consistency';

export type PennyActionCategory =
  | 'Program Architecture'
  | 'Learning Content'
  | 'Penny Assets'
  | 'Delivery Assets'
  | 'Quality & Standards';

export type PennyActionApplicableTo =
  | 'program' | 'sprint' | 'module' | 'lesson'
  | 'assessment' | 'knowledgeArticle' | 'coachingPrompt'
  | 'reflectionPrompt' | 'cohort';

export interface PennyContentAction {
  id: PennyActionId;
  name: string;
  shortName: string;
  category: PennyActionCategory;
  applicableTo: PennyActionApplicableTo[];
  purpose: string;
  contextSentence: string;
  inputs: { label: string; required: boolean; description: string }[];
  generates: { label: string; description: string }[];
  relatedLearningAssets: string[];
  relatedDeliveryAssets: string[];
  relatedPennyAssets: string[];
  salesforceMapping: string;
  lmsMapping: string;
  status: 'prototype' | 'planned' | 'future';
  estimatedTime: string;
  icon: string;
  notes?: string;
}

export const pennyContentActions: PennyContentAction[] = [
  {
    id: 'generate-module-outline',
    name: 'Generate Module Outline',
    shortName: 'Module Outline',
    category: 'Program Architecture',
    applicableTo: ['module', 'sprint', 'program'],
    purpose: 'Generate a complete module outline including learning objectives, lesson sequence, assessment alignment, knowledge article recommendations, and estimated duration — using the existing program structure as context.',
    contextSentence: 'Creates the structural blueprint for a module before content is written.',
    inputs: [
      { label: 'Module Name', required: true, description: 'The name and purpose of the module' },
      { label: 'Sprint Context', required: true, description: 'The sprint this module belongs to and its theme' },
      { label: 'RESOLVE Phase', required: false, description: 'Which RESOLVE phase this module aligns to' },
      { label: 'Learner Level', required: false, description: 'Beginner / Intermediate / Advanced' },
    ],
    generates: [
      { label: 'Learning Objectives (3–5)', description: 'Measurable, verb-first objectives aligned to the module purpose' },
      { label: 'Lesson Sequence', description: 'Ordered list of lesson titles with type (Instruction/Lab/Workshop) and estimated duration' },
      { label: 'Assessment Alignment', description: 'Recommended assessment type, question areas, and passing score' },
      { label: 'Knowledge Article Recommendations', description: 'Topics and article types to create or link' },
      { label: 'Delivery Asset Suggestions', description: 'Recommended Slack activity, office hours, and calendar touchpoints' },
    ],
    relatedLearningAssets: ['Lessons', 'Assessments', 'Knowledge Articles'],
    relatedDeliveryAssets: ['Slack Activities', 'Calendar Events', 'Office Hours'],
    relatedPennyAssets: ['Coaching Prompts', 'Reflection Prompts'],
    salesforceMapping: 'TrailModule__c — creates draft module record with linked lesson stubs',
    lmsMapping: 'Unit (Salesforce LMS) — generates unit draft with learning objective records',
    status: 'prototype',
    estimatedTime: '2–3 min',
    icon: 'layout',
  },
  {
    id: 'create-lesson',
    name: 'Create Lesson',
    shortName: 'Lesson',
    category: 'Learning Content',
    applicableTo: ['module', 'lesson'],
    purpose: 'Draft a complete lesson including title, learning objective, instructional sequence, key concepts, knowledge check questions, and a linked reflection prompt — all grounded in the module\'s objectives.',
    contextSentence: 'Creates a full lesson from the module\'s learning objectives and content scope.',
    inputs: [
      { label: 'Module Context', required: true, description: 'The parent module and its objectives' },
      { label: 'Lesson Topic', required: true, description: 'What this lesson covers' },
      { label: 'Lesson Type', required: true, description: 'Instruction, Lab, or Workshop' },
      { label: 'Learner Background', required: false, description: 'What learners already know before this lesson' },
    ],
    generates: [
      { label: 'Lesson Title & Objective', description: 'Title and one measurable learning objective' },
      { label: 'Instructional Sequence', description: '3–5 section outline with estimated time per section' },
      { label: 'Key Concepts', description: 'Glossary of terms and definitions the learner needs' },
      { label: 'Knowledge Check Questions (2–3)', description: 'Comprehension questions linked to the lesson objective' },
      { label: 'Reflection Prompt', description: 'Post-lesson reflection connecting content to the learner\'s career story' },
      { label: 'Coach Facilitation Notes', description: 'Tips for coaches on common misconceptions and facilitation cues' },
    ],
    relatedLearningAssets: ['Lessons', 'Assessments'],
    relatedDeliveryAssets: ['Slack Activities'],
    relatedPennyAssets: ['Reflection Prompts', 'Coaching Prompts'],
    salesforceMapping: 'TrailLesson__c — creates lesson record linked to parent module',
    lmsMapping: 'Lesson (Salesforce LMS) — generates lesson with objective and content blocks',
    status: 'prototype',
    estimatedTime: '3–4 min',
    icon: 'book-open',
  },
  {
    id: 'create-assessment-support',
    name: 'Create Assessment Support',
    shortName: 'Assessment',
    category: 'Learning Content',
    applicableTo: ['module', 'assessment'],
    purpose: 'Generate assessment support materials including a question bank outline, answer key structure, passing score recommendation, and a coach scoring rubric — aligned to the module\'s learning objectives.',
    contextSentence: 'Builds the assessment framework and coach support materials from module objectives.',
    inputs: [
      { label: 'Module Context', required: true, description: 'Parent module and its learning objectives' },
      { label: 'Assessment Type', required: true, description: 'Knowledge Check, Practice Exam, or Self-Assessment' },
      { label: 'Question Count', required: false, description: 'Target number of questions (default: 15–20)' },
    ],
    generates: [
      { label: 'Question Bank Outline', description: 'Grouped question areas mapped to each learning objective (count per area)' },
      { label: 'Sample Questions (3–5)', description: 'Prototype questions for each question area' },
      { label: 'Passing Score Recommendation', description: 'Recommended passing threshold with rationale' },
      { label: 'Coach Scoring Rubric', description: 'Rubric for evaluating lab-style assessments' },
      { label: 'Re-take Guidance', description: 'Penny prompt template for learners who don\'t pass' },
    ],
    relatedLearningAssets: ['Assessments', 'Lessons'],
    relatedDeliveryAssets: ['Calendar Events', 'Office Hours'],
    relatedPennyAssets: ['Coaching Prompts'],
    salesforceMapping: 'Assessment__c — creates assessment record linked to module with question count',
    lmsMapping: 'Quiz (Salesforce LMS) — generates quiz with question blocks',
    status: 'prototype',
    estimatedTime: '2–3 min',
    icon: 'check-circle',
  },
  {
    id: 'create-knowledge-article',
    name: 'Create Knowledge Article Draft',
    shortName: 'KB Article',
    category: 'Learning Content',
    applicableTo: ['module', 'lesson', 'knowledgeArticle'],
    purpose: 'Draft a knowledge article outline including headline, key sections, visual description, and Salesforce reference links — ready for a curriculum writer to complete. Linked to the module or lesson that needs it.',
    contextSentence: 'Creates a ready-to-complete article outline aligned to a specific module concept.',
    inputs: [
      { label: 'Module/Lesson Context', required: true, description: 'Which module or lesson needs this article' },
      { label: 'Article Topic', required: true, description: 'The concept or skill this article explains' },
      { label: 'Article Type', required: true, description: 'Concept Guide, Quick Reference, Decision Guide, or Checklist' },
      { label: 'Target Audience', required: false, description: 'Learner, Coach, or Both' },
    ],
    generates: [
      { label: 'Article Outline (4–6 sections)', description: 'Section titles with one-line description of content' },
      { label: 'Key Concepts List', description: 'Terms and concepts the article must explain' },
      { label: 'Visual Description', description: 'Recommended diagrams, tables, or screenshots' },
      { label: 'Salesforce Help References', description: 'Relevant Salesforce help doc links to include' },
      { label: 'Review Checklist', description: 'Quality checklist before publishing' },
    ],
    relatedLearningAssets: ['Knowledge Articles', 'Lessons'],
    relatedDeliveryAssets: [],
    relatedPennyAssets: [],
    salesforceMapping: 'Knowledge__kav — creates knowledge article draft in Salesforce Knowledge',
    lmsMapping: 'Resource Link (Salesforce LMS) — adds article as resource attachment to module',
    status: 'prototype',
    estimatedTime: '2–3 min',
    icon: 'file-text',
  },
  {
    id: 'create-reflection-prompt',
    name: 'Create Reflection Prompt',
    shortName: 'Reflection Prompt',
    category: 'Penny Assets',
    applicableTo: ['lesson', 'module'],
    purpose: 'Generate a post-lesson or end-of-module reflection prompt that connects the learning content to the learner\'s career story, prior experience, or future goals — helping Penny facilitate meaningful reflection.',
    contextSentence: 'Creates a career-connected reflection question for learners after completing a lesson or module.',
    inputs: [
      { label: 'Lesson/Module Context', required: true, description: 'What learners just completed' },
      { label: 'Learning Objective', required: true, description: 'The objective this reflection should reinforce' },
      { label: 'Trigger Timing', required: true, description: 'On lesson completion, end of module, or post-assessment' },
      { label: 'Tone', required: false, description: 'Thoughtful, Personal, Analytical, or Celebratory' },
    ],
    generates: [
      { label: 'Reflection Prompt Text', description: 'The question or prompt Penny sends to the learner' },
      { label: 'Journal Anchor', description: 'A specific action the learner should take (write, share, record)' },
      { label: 'Career Connection Frame', description: 'How this connects to the learner\'s career transition' },
      { label: 'Coach Follow-Up Suggestion', description: 'What a coach might follow up on after reading the response' },
    ],
    relatedLearningAssets: ['Lessons'],
    relatedDeliveryAssets: ['Slack Activities'],
    relatedPennyAssets: ['Reflection Prompts'],
    salesforceMapping: 'PennyPrompt__c — creates reflection prompt record linked to lesson/module',
    lmsMapping: 'N/A — Penny-native delivery',
    status: 'prototype',
    estimatedTime: '1–2 min',
    icon: 'message-circle',
  },
  {
    id: 'create-coach-notes',
    name: 'Create Coach Notes',
    shortName: 'Coach Notes',
    category: 'Penny Assets',
    applicableTo: ['module', 'lesson', 'assessment'],
    purpose: 'Generate coach facilitation notes including an explanation of the module/lesson intent, common learner misconceptions, coaching conversation starters, and assessment scoring guidance — helping coaches deliver consistent, high-quality support.',
    contextSentence: 'Creates a facilitator guide for coaches covering content delivery, learner support, and assessment coaching.',
    inputs: [
      { label: 'Module/Lesson Context', required: true, description: 'What the coach is facilitating' },
      { label: 'Learner Profile', required: false, description: 'Expected background and prior knowledge of learners' },
      { label: 'Known Difficulty Areas', required: false, description: 'Concepts learners typically struggle with' },
    ],
    generates: [
      { label: 'Facilitator Intent Summary', description: 'Why this content matters and what success looks like' },
      { label: 'Common Misconceptions (3–5)', description: 'The most frequent learner misunderstandings and how to address them' },
      { label: 'Coaching Conversation Starters', description: 'Questions a coach can ask to check understanding' },
      { label: 'Lab/Assessment Scoring Tips', description: 'What to look for when reviewing learner work' },
      { label: 'At-Risk Learner Signals', description: 'Behaviors that indicate a learner needs more support' },
    ],
    relatedLearningAssets: ['Lessons', 'Assessments'],
    relatedDeliveryAssets: ['Office Hours'],
    relatedPennyAssets: ['Coaching Prompts'],
    salesforceMapping: 'PennyPrompt__c (type: CoachNote) — linked to module/lesson record',
    lmsMapping: 'Facilitator Guide attachment (Salesforce LMS)',
    status: 'prototype',
    estimatedTime: '2–3 min',
    icon: 'users',
  },
  {
    id: 'create-slack-activity',
    name: 'Create Slack Activity',
    shortName: 'Slack Activity',
    category: 'Delivery Assets',
    applicableTo: ['module', 'lesson', 'sprint'],
    purpose: 'Draft a Slack-native learning activity — kickoff thread, lab share prompt, or cohort engagement exercise — that Penny posts to the cohort channel at the right moment in the learning sequence.',
    contextSentence: 'Creates a cohort Slack thread or activity that reinforces learning and builds community.',
    inputs: [
      { label: 'Module/Lesson Context', required: true, description: 'What content this activity relates to' },
      { label: 'Activity Type', required: true, description: 'Kickoff Thread, Lab Share, Check-In, or Announcement' },
      { label: 'Timing', required: true, description: 'When Penny should post (e.g., module start, after lesson, lab completion)' },
      { label: 'Channel', required: false, description: 'Which Slack channel (cohort channel by default)' },
    ],
    generates: [
      { label: 'Slack Thread Message', description: 'The message Penny posts — formatted for Slack with emoji, structure' },
      { label: 'Engagement Prompt', description: 'A question or task for learners to reply to in the thread' },
      { label: 'Coach Follow-Up Note', description: 'What the coach should do after learners respond' },
      { label: 'Timing Recommendation', description: 'Best day/time to post based on the module schedule' },
    ],
    relatedLearningAssets: ['Lessons', 'Modules'],
    relatedDeliveryAssets: ['Slack Activities'],
    relatedPennyAssets: ['Coaching Prompts'],
    salesforceMapping: 'SlackActivity__c — creates activity record with module link and channel config',
    lmsMapping: 'N/A — Slack-native delivery',
    status: 'prototype',
    estimatedTime: '1–2 min',
    icon: 'message-square',
  },
  {
    id: 'create-google-chat-update',
    name: 'Create Google Chat Update',
    shortName: 'Google Chat',
    category: 'Delivery Assets',
    applicableTo: ['sprint', 'module', 'cohort'],
    purpose: 'Draft a Google Chat update for coach team channels or cohort spaces — sprint launches, progress updates, assessment reminders, or program announcements.',
    contextSentence: 'Creates a structured Google Chat message for coach or cohort spaces.',
    inputs: [
      { label: 'Update Context', required: true, description: 'What event or milestone triggered this update' },
      { label: 'Audience', required: true, description: 'Coach team channel or cohort space' },
      { label: 'Tone', required: false, description: 'Professional, Celebratory, or Informational' },
    ],
    generates: [
      { label: 'Chat Message Text', description: 'The formatted message ready to send to Google Chat' },
      { label: 'Action Items (if any)', description: 'Any tasks or links the recipient needs' },
    ],
    relatedLearningAssets: [],
    relatedDeliveryAssets: ['Google Chat Updates'],
    relatedPennyAssets: [],
    salesforceMapping: 'N/A — Google Chat delivery via integration',
    lmsMapping: 'N/A — external delivery',
    status: 'prototype',
    estimatedTime: '1 min',
    icon: 'message-circle',
  },
  {
    id: 'create-calendar-reminder',
    name: 'Create Calendar Reminder',
    shortName: 'Calendar Reminder',
    category: 'Delivery Assets',
    applicableTo: ['module', 'cohort', 'sprint'],
    purpose: 'Generate a calendar event description including event title, purpose, attendees, agenda, and a Penny reminder message — for office hours, kickoff sessions, or progress reviews.',
    contextSentence: 'Creates calendar event details and a Penny reminder for a module or sprint touchpoint.',
    inputs: [
      { label: 'Event Context', required: true, description: 'What the event is for (office hours, kickoff, review)' },
      { label: 'Event Type', required: true, description: 'Office Hours, Kickoff, Review, or Workshop' },
      { label: 'Cohort/Module', required: true, description: 'Which learner group this is for' },
      { label: 'Timing', required: false, description: 'When in the learning sequence this should happen' },
    ],
    generates: [
      { label: 'Event Title & Description', description: 'Calendar-ready title and agenda-style description' },
      { label: 'Attendee Recommendations', description: 'Who should attend and why' },
      { label: 'Penny Reminder Message', description: 'Message Penny sends to learners the day before' },
      { label: 'Coach Prep Notes', description: 'What the coach should prepare before the event' },
    ],
    relatedLearningAssets: [],
    relatedDeliveryAssets: ['Calendar Events', 'Office Hours'],
    relatedPennyAssets: [],
    salesforceMapping: 'CalendarEvent__c — creates event record linked to module and cohort',
    lmsMapping: 'N/A — calendar-native delivery',
    status: 'prototype',
    estimatedTime: '1–2 min',
    icon: 'calendar',
  },
  {
    id: 'generate-sprint-outline',
    name: 'Generate Sprint Outline',
    shortName: 'Sprint Outline',
    category: 'Program Architecture',
    applicableTo: ['sprint', 'program'],
    purpose: 'Generate a complete sprint outline — module sequence, sprint theme, RESOLVE phase alignment, cohort touchpoints, and delivery cadence — establishing the container before module content is built.',
    contextSentence: 'Creates the sprint-level blueprint that defines the module sequence and delivery structure.',
    inputs: [
      { label: 'Program Context', required: true, description: 'Parent program and its overall arc' },
      { label: 'Sprint Theme', required: true, description: 'The central topic or skill area of this sprint' },
      { label: 'RESOLVE Phase', required: false, description: 'Which RESOLVE phase this sprint aligns to' },
      { label: 'Duration', required: false, description: 'Number of weeks' },
    ],
    generates: [
      { label: 'Sprint Goal Statement', description: 'What learners will be able to do by the end of the sprint' },
      { label: 'Module Sequence (3–4)', description: 'Ordered module titles with purpose and estimated duration' },
      { label: 'Cohort Touchpoints', description: 'Recommended kickoff, office hours, and wrap-up events' },
      { label: 'Delivery Cadence', description: 'Weekly schedule of lesson delivery, Slack activities, and assessments' },
      { label: 'Sprint Assessment Plan', description: 'Assessment coverage across the sprint modules' },
    ],
    relatedLearningAssets: ['Modules', 'Assessments'],
    relatedDeliveryAssets: ['Slack Activities', 'Calendar Events', 'Office Hours'],
    relatedPennyAssets: ['Coaching Prompts', 'Weekly Reviews'],
    salesforceMapping: 'Sprint__c — creates sprint record with module stubs',
    lmsMapping: 'Unit (Salesforce LMS) — generates unit structure with sub-unit references',
    status: 'prototype',
    estimatedTime: '2–3 min',
    icon: 'layers',
  },
  {
    id: 'review-consistency',
    name: 'Review for Consistency',
    shortName: 'Consistency Review',
    category: 'Quality & Standards',
    applicableTo: ['program', 'sprint', 'module'],
    purpose: 'Analyze a program, sprint, or module against the learning architecture standards — identifying missing objectives, missing assessments, missing knowledge articles, missing Penny prompts, duplicate concepts, and missing delivery activities. Generates a prioritized action plan.',
    contextSentence: 'Runs a standards-based content health check and returns a prioritized gap analysis.',
    inputs: [
      { label: 'Scope', required: true, description: 'Program, Sprint, or Module to analyze' },
      { label: 'Standard Level', required: false, description: 'Minimum Standard (objectives + assessment) or Full Standard (all asset types)' },
    ],
    generates: [
      { label: 'Health Score (0–100)', description: 'Overall content completeness score for the scope' },
      { label: 'Gap Report', description: 'List of all missing or incomplete assets grouped by check type' },
      { label: 'Prioritized Action Plan', description: 'Ordered list of fixes with estimated effort and suggested Penny actions' },
      { label: 'Duplicate Concept Flags', description: 'Content overlaps between modules that may confuse learners' },
      { label: 'Coverage Summary', description: 'Table showing asset coverage across all modules in scope' },
    ],
    relatedLearningAssets: ['Modules', 'Lessons', 'Assessments', 'Knowledge Articles'],
    relatedDeliveryAssets: ['Slack Activities', 'Calendar Events'],
    relatedPennyAssets: ['Coaching Prompts', 'Reflection Prompts'],
    salesforceMapping: 'ContentHealthIssue__c — creates health issue records for each gap found',
    lmsMapping: 'N/A — internal quality tool',
    status: 'prototype',
    estimatedTime: '1–2 min',
    icon: 'shield-check',
  },
];

// ── Context-Aware Action Mapping ───────────────────────────────────────────────
// Maps object types to their most relevant Penny Content Actions

export const ACTIONS_BY_OBJECT_TYPE: Record<string, PennyActionId[]> = {
  program:          ['generate-sprint-outline', 'create-lesson', 'create-knowledge-article', 'review-consistency'],
  sprint:           ['generate-sprint-outline', 'generate-module-outline', 'create-slack-activity', 'create-google-chat-update', 'create-calendar-reminder', 'review-consistency'],
  module:           ['generate-module-outline', 'create-lesson', 'create-assessment-support', 'create-knowledge-article', 'create-reflection-prompt', 'create-coach-notes', 'create-slack-activity', 'create-calendar-reminder', 'review-consistency'],
  lesson:           ['create-lesson', 'create-reflection-prompt', 'create-coach-notes', 'create-slack-activity', 'create-knowledge-article'],
  assessment:       ['create-assessment-support', 'create-coach-notes', 'create-calendar-reminder'],
  knowledgeArticle: ['create-knowledge-article', 'review-consistency'],
  coachingPrompt:   ['create-coach-notes', 'create-reflection-prompt'],
  reflectionPrompt: ['create-reflection-prompt', 'create-coach-notes'],
  cohort:           ['generate-sprint-outline', 'create-slack-activity', 'create-google-chat-update', 'create-calendar-reminder'],
};

// ── Sample Generated Output — Module 2.1 ──────────────────────────────────────
// What Penny would generate for Module 2.1: Data Modeling & Schema Design
// Represents the "Generate Module Outline" + supporting actions in prototype form.

export interface GeneratedModuleOutput {
  moduleId: string;
  moduleName: string;
  program: string;
  sprint: string;
  generatedAt: string;
  generatedBy: PennyActionId[];
  objectives: { text: string; level: string; verb: string }[];
  lessonStructure: {
    lessonId: string;
    title: string;
    type: string;
    duration: string;
    objective: string;
    knowledgeChecks: string[];
    reflectionPrompt: string;
  }[];
  assessmentAlignment: {
    title: string;
    type: string;
    questionCount: number;
    passingScore: number;
    questionAreas: { area: string; count: number; objectives: string[] }[];
    sampleQuestions: string[];
  };
  knowledgeArticles: { title: string; type: string; keyTopics: string[] }[];
  coachNotes: {
    intentSummary: string;
    commonMisconceptions: { misconception: string; response: string }[];
    conversationStarters: string[];
    labScoringTips: string[];
    atRiskSignals: string[];
  };
  reflectionPrompts: { lessonId: string; lessonTitle: string; prompt: string; journalAnchor: string }[];
  slackActivities: { title: string; type: string; timing: string; message: string; engagementPrompt: string }[];
  calendarEvents: { title: string; type: string; timing: string; description: string; attendees: string; pennyReminder: string }[];
}

export const module21GeneratedOutput: GeneratedModuleOutput = {
  moduleId: 'mod-2-1',
  moduleName: 'Data Modeling & Schema Design',
  program: 'Foundations Trail',
  sprint: 'Sprint 2 — Data Modeling & Admin Fundamentals',
  generatedAt: 'Prototype — sample output for standards illustration',
  generatedBy: ['generate-module-outline', 'create-lesson', 'create-assessment-support', 'create-reflection-prompt', 'create-coach-notes', 'create-slack-activity', 'create-calendar-reminder'],
  objectives: [
    { text: 'Define custom objects and explain their role in a Salesforce data model', level: 'Understand', verb: 'Define' },
    { text: 'Select the correct field type for a given data requirement', level: 'Apply', verb: 'Select' },
    { text: 'Create a multi-object schema using Schema Builder', level: 'Apply', verb: 'Create' },
    { text: 'Explain the difference between Lookup and Master-Detail relationships', level: 'Understand', verb: 'Explain' },
  ],
  lessonStructure: [
    {
      lessonId: 'les-2-1a',
      title: 'Lesson 2.1a — Custom Objects & Fields',
      type: 'Instruction',
      duration: '45 min',
      objective: 'Create a custom object with appropriate fields and explain its role in the data model.',
      knowledgeChecks: [
        'What is the difference between a Standard Object and a Custom Object in Salesforce?',
        'A client needs to track "Project Timelines" — not a standard Salesforce object. What would you create?',
      ],
      reflectionPrompt: 'Think about a past role — what data did your team track manually (spreadsheets, notebooks, sticky notes)? How could a custom Salesforce object have helped? Jot your answer in your Trail Journal.',
    },
    {
      lessonId: 'les-2-1b',
      title: 'Lesson 2.1b — Field Types & Formula Fields',
      type: 'Instruction',
      duration: '50 min',
      objective: 'Select the correct field type for a given data requirement and build a basic formula field.',
      knowledgeChecks: [
        'When would you use a Picklist field instead of a Text field? Give a real example.',
        'You need to auto-calculate "Days Since Application" on a custom object. Which field type would you use?',
      ],
      reflectionPrompt: 'You\'ve now seen 12+ Salesforce field types. Which one surprised you the most? When would you choose a Picklist over a Multi-Select Picklist? Think of a real data scenario and write it down.',
    },
    {
      lessonId: 'les-2-1c',
      title: 'Lesson 2.1c — Schema Builder Lab',
      type: 'Lab',
      duration: '60 min',
      objective: 'Design a multi-object data model for a mock nonprofit scenario using Schema Builder and present the rationale for your relationship choices.',
      knowledgeChecks: [
        'In your schema, why did you choose a Master-Detail vs. a Lookup relationship between those two objects?',
      ],
      reflectionPrompt: 'What was the hardest decision you made building your schema? If you were explaining your design to a new Salesforce admin, what would you say first?',
    },
  ],
  assessmentAlignment: {
    title: 'Data Modeling Assessment',
    type: 'Knowledge Check',
    questionCount: 20,
    passingScore: 75,
    questionAreas: [
      { area: 'Custom Objects & Standard Objects', count: 5, objectives: ['Define custom objects and explain their role'] },
      { area: 'Field Types & Formula Fields', count: 5, objectives: ['Select the correct field type for a given requirement'] },
      { area: 'Relationships (Lookup vs. Master-Detail)', count: 5, objectives: ['Explain the difference between Lookup and Master-Detail'] },
      { area: 'Schema Builder & Practical Application', count: 5, objectives: ['Create a multi-object schema using Schema Builder'] },
    ],
    sampleQuestions: [
      'A client wants to track "Service Requests" that can exist independently of any Contact. Which relationship type connects Service Requests to Contacts?',
      'You need a field that calculates the number of days between two date fields. Which field type is appropriate?',
      'What is the key behavioral difference between a Master-Detail relationship and a Lookup relationship in terms of record deletion?',
    ],
  },
  knowledgeArticles: [
    {
      title: 'Objects vs. Fields vs. Records — A Visual Guide',
      type: 'Concept Guide',
      keyTopics: ['Database analogy (table, column, row)', 'Standard vs Custom objects', 'Object Manager navigation', 'Field types overview'],
    },
    {
      title: 'Schema Design Patterns for Salesforce Admins',
      type: 'Reference Guide',
      keyTopics: ['When to create a custom object', 'Lookup vs Master-Detail decision guide', 'Junction objects for Many-to-Many', 'Schema Builder navigation', 'Common nonprofit data model patterns'],
    },
  ],
  coachNotes: {
    intentSummary: 'Module 2.1 is where many learners first encounter "thinking like a database designer." The shift from "what data do I need?" to "how should this data be structured?" is the key cognitive leap. Lessons 2.1a and 2.1b lay the conceptual foundation; the Schema Builder Lab is where it clicks. This module is the most important in Sprint 2 — it underpins everything in Modules 2.2 and 2.3.',
    commonMisconceptions: [
      { misconception: '"I can just put everything in one object."', response: 'Draw the analogy to spreadsheets — one sheet with 50 columns vs. related tables. Ask: "If you needed to track 1000 projects each with 10 contacts, would you want 10 columns or a separate table?"' },
      { misconception: '"Custom fields and custom objects are the same thing."', response: 'Remind them: a field is a column, an object is the whole table. A Custom Object is an entirely new table; a Custom Field adds a column to an existing table.' },
      { misconception: '"I\'ll just use Lookup for everything — it\'s simpler."', response: 'Show the deletion behavior difference. Ask: "If you delete the parent record, what should happen to the children?" That question usually makes the Lookup vs. Master-Detail distinction clear.' },
    ],
    conversationStarters: [
      '"Walk me through your schema — pretend I\'m the nonprofit client and explain why you designed it this way."',
      '"What would happen to your child records if you deleted the parent? Is that the behavior you want?"',
      '"Looking at your field choices — is there any field where you could replace a Text with something more structured? Why does that matter?"',
    ],
    labScoringTips: [
      'Check that the learner has at least 2 custom objects (not counting standard objects like Contact or Account)',
      'Look for at least one relationship between custom objects — and verify they can explain why they chose Lookup vs. Master-Detail',
      'Check field types — are they using Picklists where appropriate instead of free-text?',
      'Ask the learner to narrate one design decision — the explanation reveals understanding even if the schema has minor errors',
    ],
    atRiskSignals: [
      'Learner has been in the Schema Builder lab > 20 minutes with no screenshot posted',
      'Learner\'s schema only contains Standard Objects — they may not have tried creating a custom object',
      'Learner asks "which one do I pick?" for Lookup vs. Master-Detail without attempting to reason through it first',
    ],
  },
  reflectionPrompts: [
    {
      lessonId: 'les-2-1a',
      lessonTitle: 'Custom Objects & Fields',
      prompt: 'Think about a past role — what data did your team track manually (spreadsheets, notebooks, sticky notes)? How could a custom Salesforce object have helped? What would you have named it?',
      journalAnchor: 'Write 2–3 sentences in your Trail Journal. Share in the cohort thread if you\'re comfortable.',
    },
    {
      lessonId: 'les-2-1b',
      lessonTitle: 'Field Types & Formula Fields',
      prompt: 'You\'ve now seen 12+ Salesforce field types. Which surprised you most? Think of a real data scenario where choosing the wrong field type would cause problems. What would go wrong?',
      journalAnchor: 'Jot down your scenario. In tomorrow\'s cohort thread, we\'ll share field type "gotchas" we\'ve discovered.',
    },
  ],
  slackActivities: [
    {
      title: 'Module 2.1 Kickoff Thread',
      type: 'Kickoff',
      timing: 'Monday of Week 4, 8 AM',
      message: 'Week 4 starts today! 🗃️ We\'re diving into *Data Modeling* — arguably the most important skill in the Salesforce Admin toolkit.\n\nBy the end of this week you\'ll be able to design your first custom data model. That\'s a real, client-facing skill.\n\n📅 This week:\n• Lesson 2.1a: Custom Objects & Fields\n• Lesson 2.1b: Field Types & Formula Fields\n• Lesson 2.1c: Schema Builder Lab (your first big build!)\n• 📖 Reading: Objects vs. Fields vs. Records guide\n\nTell me: have you ever built a spreadsheet to track work at a job? That instinct is exactly what we\'re formalizing this week. 👇',
      engagementPrompt: 'Share what you used to track manually in a past role. A spreadsheet, a notebook, a whiteboard? That\'s your future Salesforce object waiting to happen.',
    },
    {
      title: 'Schema Builder Lab Share',
      type: 'Lab Share',
      timing: 'After Lesson 2.1c completion',
      message: '📸 *Schema Builder Lab Share* — Time to show your work!\n\nYou just built your first Salesforce data model. That\'s real. Post a screenshot of your schema and answer the two questions below. Your coach will give you feedback before the end of the day.',
      engagementPrompt: '1. What business scenario did you model? (1–2 sentences) \n2. What relationship type did you use between your objects — and why did you choose it?',
    },
  ],
  calendarEvents: [
    {
      title: 'Module 2.1 — Schema Builder Office Hours',
      type: 'Office Hours',
      timing: 'Wednesday of Week 5, 6:00–7:00 PM ET',
      description: 'Open office hours focused on the Schema Builder lab — data modeling Q&A and schema review. Learners who have completed Lesson 2.1c are encouraged to bring their schema for live coach review. New learners can come with any questions from Lessons 2.1a–b.',
      attendees: 'All Foundations Trail Cohort 1 learners (open, optional)',
      pennyReminder: '"Office hours tomorrow — 6 PM ET! Bring your schema from the lab, or any questions from this week\'s data modeling lessons. Coach [Name] will be there. Zoom link in the channel. 📐"',
    },
  ],
};

// ── Action Category Colors ─────────────────────────────────────────────────────

export const ACTION_CATEGORY_CONFIG: Record<PennyActionCategory, { chip: string; border: string; bg: string }> = {
  'Program Architecture': { chip: 'bg-violet-50 text-violet-800 border-violet-200', border: 'border-violet-200 hover:border-violet-400', bg: 'bg-violet-50/50' },
  'Learning Content':     { chip: 'bg-amber-50 text-amber-800 border-amber-200',    border: 'border-amber-200 hover:border-amber-400',    bg: 'bg-amber-50/50' },
  'Penny Assets':         { chip: 'bg-secondary/10 text-secondary border-secondary/20', border: 'border-secondary/30 hover:border-secondary/60', bg: 'bg-secondary/5' },
  'Delivery Assets':      { chip: 'bg-green-50 text-green-800 border-green-200',    border: 'border-green-200 hover:border-green-400',    bg: 'bg-green-50/50' },
  'Quality & Standards':  { chip: 'bg-sky-50 text-sky-800 border-sky-200',          border: 'border-sky-200 hover:border-sky-400',          bg: 'bg-sky-50/50' },
};
