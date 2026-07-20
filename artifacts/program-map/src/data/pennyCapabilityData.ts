// ── Penny Capability Registry — Capability Management Layer ──────────────
// Inventories all current and future Penny capabilities before integrating
// the Penny POC repository. This is architecture, not code integration.

export type CapabilityDomain =
  | 'Coaching'
  | 'Career'
  | 'Learning'
  | 'Knowledge'
  | 'Operations'
  | 'Communications'
  | 'Questing';

export type CapabilityReadiness =
  | 'Prototype'
  | 'Defined'
  | 'Planned'
  | 'In Development'
  | 'Integrated'
  | 'Operational';

export interface PennyCapability {
  id: string;
  name: string;
  domain: CapabilityDomain;
  shortDescription: string;
  purpose: string;
  audience: string[];
  inputs: string[];
  outputs: string[];
  relatedPrograms: string[];
  relatedSfObjects: string[];
  relatedKnowledgeSources: string[];
  relatedCommChannels: string[];
  relatedCalendarEvents: string[];
  relatedStandards: string[];
  maturity: CapabilityReadiness;
  owner: string;
  futureIntegrationStatus: string;
  dependencies: string[];           // other capability ids
  pocMapping: string;               // description of POC functionality match
  pocStatus: 'exists' | 'partial' | 'planned' | 'none';
  nextSteps: string[];
  foundationsTrailExample?: string;
}

export interface CapabilityPocEntry {
  capabilityId: string;
  pocFunction: string;
  pocStatus: 'exists' | 'partial' | 'planned' | 'none';
  gapDescription: string;
  integrationPriority: 'P1' | 'P2' | 'P3';
  estimatedComplexity: 'Low' | 'Medium' | 'High';
}

// ── Config ────────────────────────────────────────────────────────────────

export const CAPABILITY_READINESS_CONFIG: Record<CapabilityReadiness, { label: string; cls: string; order: number }> = {
  'Prototype':       { label: 'Prototype',       cls: 'text-amber-700 bg-amber-50 border-amber-200',     order: 1 },
  'Defined':         { label: 'Defined',          cls: 'text-blue-700 bg-blue-50 border-blue-200',       order: 2 },
  'Planned':         { label: 'Planned',          cls: 'text-violet-700 bg-violet-50 border-violet-200', order: 3 },
  'In Development':  { label: 'In Development',   cls: 'text-orange-700 bg-orange-50 border-orange-200', order: 4 },
  'Integrated':      { label: 'Integrated',       cls: 'text-cyan-700 bg-cyan-50 border-cyan-200',       order: 5 },
  'Operational':     { label: 'Operational',      cls: 'text-green-700 bg-green-50 border-green-200',    order: 6 },
};

export const CAPABILITY_DOMAIN_CONFIG: Record<CapabilityDomain, { cls: string; description: string }> = {
  'Coaching':         { cls: 'text-secondary border-secondary/20 bg-secondary/10', description: 'Personalized learner support and coaching conversations' },
  'Career':           { cls: 'text-violet-700 bg-violet-50 border-violet-200',     description: 'Career readiness, resume, LinkedIn, and interview support' },
  'Learning':         { cls: 'text-amber-700 bg-amber-50 border-amber-200',        description: 'Study guidance, cohort insights, and progress analysis' },
  'Knowledge':        { cls: 'text-blue-700 bg-blue-50 border-blue-200',           description: 'Knowledge retrieval and content recommendations' },
  'Operations':       { cls: 'text-rose-700 bg-rose-50 border-rose-200',           description: 'Escalations, executive briefs, and program operations' },
  'Communications':   { cls: 'text-green-700 bg-green-50 border-green-200',        description: 'Slack, Google Chat, email, and calendar-aware messaging' },
  'Questing':         { cls: 'text-primary border-primary/20 bg-primary/5',        description: 'Trail Quests, weekly reviews, and challenge-based learning' },
};

// ── Capability Status (user-configurable) ─────────────────────────────────
// Three states the team can set per capability to track configuration progress.

export type CapabilityStatus = 'Live' | 'Ready' | 'Partial';

export const CAPABILITY_STATUS_CONFIG: Record<CapabilityStatus, {
  label: string;
  badgeCls: string;
  statusVariant: 'active' | 'planning' | 'draft';
}> = {
  'Live':    { label: 'Live',    badgeCls: 'text-emerald-700 bg-emerald-50 border-emerald-200', statusVariant: 'active'   },
  'Ready':   { label: 'Ready',   badgeCls: 'text-sky-700 bg-sky-50 border-sky-200',            statusVariant: 'active'   },
  'Partial': { label: 'Partial', badgeCls: 'text-amber-700 bg-amber-50 border-amber-200',      statusVariant: 'planning' },
};

export const POC_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  exists:  { label: 'Exists in POC',  cls: 'text-green-700 bg-green-50 border-green-200' },
  partial: { label: 'Partial in POC', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  planned: { label: 'Planned',        cls: 'text-violet-700 bg-violet-50 border-violet-200' },
  none:    { label: 'Not in POC',     cls: 'text-slate-600 bg-slate-50 border-slate-200' },
};

// ── Capabilities ──────────────────────────────────────────────────────────

export const pennyCapabilities: PennyCapability[] = [

  // ── Coaching ───────────────────────────────────────────────────────────

  {
    id: 'cap-learner-coaching',
    name: 'Learner Coaching',
    domain: 'Coaching',
    shortDescription: 'Real-time personalized coaching conversations throughout the learner journey.',
    purpose: 'Provide learners with on-demand, context-aware coaching conversations that reference their current module, progress, and stated goals. Penny acts as a supportive guide — not a chatbot.',
    audience: ['Learners', 'Cohort Participants'],
    inputs: ['Learner name & program context', 'Current module and sprint', 'Assessment scores', 'Participation history', 'Prior conversation context'],
    outputs: ['Coaching message (Slack / Google Chat)', 'Follow-up questions', 'Coach escalation flag if needed', 'Engagement log entry'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', 'Explorer\'s Trail'],
    relatedSfObjects: ['Contact', 'Program_Engagement__c', 'Training_Plan_Item__c'],
    relatedKnowledgeSources: ['Module Knowledge Articles', 'Coach Notes', 'Standards: Coach Notes'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: ['Office Hours', 'Sprint Deadlines'],
    relatedStandards: ['std-coach-notes', 'std-penny-prompt', 'std-reflection-prompt'],
    maturity: 'Prototype',
    owner: 'Penny Product Lead',
    futureIntegrationStatus: 'Q3 2025 — Agentforce integration. Live Slack DM delivery. Full conversation logging to Salesforce.',
    dependencies: ['cap-knowledge-retrieval', 'cap-escalations'],
    pocMapping: 'Core coaching conversation loop exists in POC. Context injection (module + score) is partially implemented.',
    pocStatus: 'partial',
    nextSteps: [
      'Define conversation state model (module context envelope)',
      'Build context injection from Trail OS module data',
      'Wire coach notes into Penny\'s secondary context layer',
      'Implement escalation trigger detection',
    ],
    foundationsTrailExample: 'After Module 2 completion, Penny messages learner in Slack: "You finished the Data Model module! That one trips people up the first time. What felt most confusing for you?" and follows up based on response.',
  },

  {
    id: 'cap-reflection-prompts',
    name: 'Reflection Prompts',
    domain: 'Coaching',
    shortDescription: 'Structured post-module reflection delivered by Penny to deepen learning.',
    purpose: 'Automatically deliver the correct reflection prompt after a learner completes a module. Prompt is context-aware and uses the follow-up logic defined in the Reflection Prompt standard.',
    audience: ['Learners'],
    inputs: ['Module completion event', 'Learner context', 'Reflection Prompt content for the module'],
    outputs: ['Reflection prompt message (Slack / Chat)', 'Follow-up deepening question', 'Response logged to engagement record'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail'],
    relatedSfObjects: ['Training_Plan_Item__c', 'Program_Engagement__c'],
    relatedKnowledgeSources: ['Standards: Reflection Prompt', 'Module Knowledge Articles'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: [],
    relatedStandards: ['std-reflection-prompt', 'std-module'],
    maturity: 'Defined',
    owner: 'Penny Content Author',
    futureIntegrationStatus: 'Q3 2025 — Triggered by LMS completion webhook. Response stored in Salesforce engagement record.',
    dependencies: ['cap-learner-coaching', 'cap-slack-messaging'],
    pocMapping: 'Reflection prompt delivery exists in POC as a templated message. No follow-up logic or module-context injection.',
    pocStatus: 'partial',
    nextSteps: [
      'Connect module completion event trigger to Penny delivery',
      'Build follow-up logic (surface-level response → follow-up prompt)',
      'Store learner responses in engagement log',
    ],
    foundationsTrailExample: 'Module 3 completion → Penny: "What was your biggest "aha" moment in the Automation module? What made it click?"',
  },

  {
    id: 'cap-escalations',
    name: 'Coaching Escalation',
    domain: 'Coaching',
    shortDescription: 'Detects learner struggle signals and routes to human coach review.',
    purpose: 'Monitor learner behavior patterns for signals defined in Coach Notes (missed check-ins, low scores, no participation) and automatically flag for human coach intervention with context.',
    audience: ['Coaches', 'Program Managers'],
    inputs: ['Assessment scores', 'Participation data', 'Response patterns', 'Coach Notes escalation triggers'],
    outputs: ['Coach escalation notification', 'Learner context summary for coach', 'Escalation log in Salesforce'],
    relatedPrograms: ['Foundations Trail', 'All active programs'],
    relatedSfObjects: ['Program_Engagement__c', 'Contact', 'Service_Attendance__c'],
    relatedKnowledgeSources: ['Standards: Coach Notes', 'Coach Notes content'],
    relatedCommChannels: ['Coach Slack channel', 'Email'],
    relatedCalendarEvents: ['Coach office hours'],
    relatedStandards: ['std-coach-notes'],
    maturity: 'Defined',
    owner: 'Penny Product Lead',
    futureIntegrationStatus: 'Q4 2025 — Agentforce flows. Escalation logged to Case__c in Salesforce.',
    dependencies: ['cap-learner-coaching'],
    pocMapping: 'No escalation logic in POC. Static thresholds only. No Salesforce logging.',
    pocStatus: 'none',
    nextSteps: [
      'Define escalation signal taxonomy from Coach Notes',
      'Build threshold detection logic',
      'Create coach notification template',
      'Wire escalation to Salesforce Case creation',
    ],
  },

  // ── Career ─────────────────────────────────────────────────────────────

  {
    id: 'cap-resume-review',
    name: 'Resume Review',
    domain: 'Career',
    shortDescription: 'Penny reviews learner resume for Salesforce role readiness and provides structured feedback.',
    purpose: 'Help learners prepare their resume for Salesforce admin, analyst, or consultant roles. Penny provides structured feedback aligned to current job market expectations and the learner\'s certification progress.',
    audience: ['Learners', 'Career-transition Participants'],
    inputs: ['Learner resume (text or upload)', 'Target role', 'Certifications earned', 'Program completion status'],
    outputs: ['Structured feedback report', 'Priority improvements list', 'Rewritten section examples', 'Confidence score by section'],
    relatedPrograms: ['Foundations Trail', 'Explorer\'s Trail', 'Trail of Mastery'],
    relatedSfObjects: ['Contact', 'Program_Engagement__c'],
    relatedKnowledgeSources: ['Salesforce Role Requirements KB', 'Job Market Knowledge Articles'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM', 'Email'],
    relatedCalendarEvents: ['Career coaching sessions'],
    relatedStandards: [],
    maturity: 'Prototype',
    owner: 'Career Services Lead',
    futureIntegrationStatus: 'Q4 2025 — File upload to Penny via Slack attachment. Feedback delivered as structured Slack message.',
    dependencies: ['cap-learner-coaching', 'cap-knowledge-retrieval'],
    pocMapping: 'Resume review exists in POC as LLM prompt. No structured output format, no Salesforce context injection.',
    pocStatus: 'partial',
    nextSteps: [
      'Define structured feedback schema (sections, scores, recommendations)',
      'Build role-awareness context (Admin, Analyst, Consultant)',
      'Wire certification data from Salesforce into review context',
      'Test output quality with real Foundations Trail learner resumes',
    ],
    foundationsTrailExample: 'Learner uploads resume at Sprint 4. Penny: "Your admin experience section is strong, but you\'re underselling your declarative automation skills. Let me show you how to reframe that…"',
  },

  {
    id: 'cap-linkedin-review',
    name: 'LinkedIn Review',
    domain: 'Career',
    shortDescription: 'Optimizes learner LinkedIn profiles for Salesforce job market visibility.',
    purpose: 'Guide learners through optimizing their LinkedIn profile headline, summary, and skills section to attract Salesforce ecosystem employers. Uses knowledge of Trailhead, certifications, and current hiring signals.',
    audience: ['Learners', 'Career-transition Participants'],
    inputs: ['LinkedIn profile text (manual input)', 'Target role', 'Current certifications', 'Program stage'],
    outputs: ['Section-by-section feedback', 'Rewritten headline/summary examples', 'Keyword recommendations', 'Checklist of profile completeness'],
    relatedPrograms: ['Foundations Trail', 'Explorer\'s Trail'],
    relatedSfObjects: ['Contact'],
    relatedKnowledgeSources: ['Job Market Knowledge Articles', 'Salesforce Role Requirements KB'],
    relatedCommChannels: ['Slack DM'],
    relatedCalendarEvents: [],
    relatedStandards: [],
    maturity: 'Defined',
    owner: 'Career Services Lead',
    futureIntegrationStatus: 'Q4 2025 — LinkedIn profile paste to Slack. No direct LinkedIn API access planned.',
    dependencies: ['cap-resume-review', 'cap-knowledge-retrieval'],
    pocMapping: 'No LinkedIn review in POC. Conceptually similar to resume review but not implemented.',
    pocStatus: 'none',
    nextSteps: [
      'Define LinkedIn profile section schema',
      'Build keyword library by Salesforce role type',
      'Create feedback template for each section',
      'Coordinate with Resume Review for consistent messaging',
    ],
  },

  {
    id: 'cap-interview-prep',
    name: 'Interview Preparation',
    domain: 'Career',
    shortDescription: 'Mock interview practice and preparation guidance for Salesforce roles.',
    purpose: 'Help learners prepare for Salesforce admin, analyst, and consultant interviews through mock questions, answer frameworks, and scenario-based practice aligned to what Penny knows about the learner\'s program progress.',
    audience: ['Learners', 'Career-transition Participants'],
    inputs: ['Target role', 'Interview type (technical, behavioral, scenario)', 'Certifications earned', 'Program completion status'],
    outputs: ['Mock interview questions', 'STAR-method answer guidance', 'Feedback on practice answers', 'Interview prep checklist'],
    relatedPrograms: ['Foundations Trail', 'Trail of Mastery'],
    relatedSfObjects: ['Contact', 'Program_Engagement__c'],
    relatedKnowledgeSources: ['Interview Question KB', 'Salesforce Role Requirements KB'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: ['Career coaching sessions', 'Mock interview sessions'],
    relatedStandards: [],
    maturity: 'Planned',
    owner: 'Career Services Lead',
    futureIntegrationStatus: 'Q1 2026 — Structured mock interview session in Slack thread. Feedback logged to Salesforce contact record.',
    dependencies: ['cap-learner-coaching', 'cap-knowledge-retrieval'],
    pocMapping: 'Basic Q&A exists in POC but not structured as mock interview. No role-based question sets.',
    pocStatus: 'partial',
    nextSteps: [
      'Build question library by role type and interview stage',
      'Define answer evaluation rubric',
      'Wire program progress context into question selection',
      'Design multi-turn mock interview conversation flow',
    ],
  },

  // ── Learning ───────────────────────────────────────────────────────────

  {
    id: 'cap-study-coach',
    name: 'Study Coach',
    domain: 'Learning',
    shortDescription: 'Proactive study guidance, pacing recommendations, and content suggestions.',
    purpose: 'Help learners stay on track through the program by offering study plans, pacing check-ins, and targeted content recommendations based on their current module and upcoming assessment.',
    audience: ['Learners'],
    inputs: ['Current module', 'Sprint deadline', 'Assessment history', 'Self-reported confidence level'],
    outputs: ['Study plan message', 'Content recommendation list', 'Pacing alert if behind schedule', 'Pre-assessment prep checklist'],
    relatedPrograms: ['Foundations Trail', 'All programs'],
    relatedSfObjects: ['Training_Plan_Item__c', 'Program_Engagement__c'],
    relatedKnowledgeSources: ['Module Knowledge Articles', 'Trailhead recommendations', 'Source Docs'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: ['Sprint Deadlines', 'Assessment Windows'],
    relatedStandards: ['std-module', 'std-lesson'],
    maturity: 'Defined',
    owner: 'Penny Content Author',
    futureIntegrationStatus: 'Q3 2025 — Triggered by sprint schedule + progress data. Integrated with LMS completion data.',
    dependencies: ['cap-knowledge-retrieval', 'cap-source-recommendations', 'cap-learner-coaching'],
    pocMapping: 'Study nudge messages exist in POC but no pacing logic or content recommendation engine.',
    pocStatus: 'partial',
    nextSteps: [
      'Build sprint pacing model (expected vs actual progress)',
      'Create content recommendation logic by module topic',
      'Design pre-assessment prep prompt sequence',
      'Test with Foundations Trail Sprint 1 schedule',
    ],
    foundationsTrailExample: 'Day 4 of Sprint 2 with 3 modules outstanding → Penny: "You\'re 3 modules behind the pace for Sprint 2. Here\'s a focused study plan for today and tomorrow to catch up before the assessment window opens."',
  },

  {
    id: 'cap-cohort-summaries',
    name: 'Cohort Summaries',
    domain: 'Learning',
    shortDescription: 'Weekly program-level summaries for coaches and program managers.',
    purpose: 'Generate weekly cohort health summaries showing completion rates, engagement patterns, flagged learners, and program-level trends. Surfaces insights that would otherwise require manual reporting from coaches.',
    audience: ['Coaches', 'Program Managers', 'Curriculum Lead'],
    inputs: ['Cohort completion data', 'Engagement logs', 'Assessment scores', 'Escalation flags'],
    outputs: ['Weekly cohort brief (Slack/Chat post)', 'Flagged learner list with context', 'Trend analysis vs prior week', 'Recommended coach actions'],
    relatedPrograms: ['Foundations Trail', 'All active programs'],
    relatedSfObjects: ['Service_Schedule__c', 'Program_Engagement__c', 'Training_Plan_Item__c', 'Contact'],
    relatedKnowledgeSources: ['Program health benchmarks', 'Coach Notes'],
    relatedCommChannels: ['Coach Slack channel', 'Program Manager notification'],
    relatedCalendarEvents: ['Weekly coach debrief'],
    relatedStandards: ['std-coach-notes'],
    maturity: 'Planned',
    owner: 'Penny Product Lead',
    futureIntegrationStatus: 'Q4 2025 — Automated via Agentforce scheduled flow. Delivered to coach Slack channel every Monday.',
    dependencies: ['cap-escalations', 'cap-slack-messaging'],
    pocMapping: 'No cohort summary capability in POC. Would require data aggregation from Salesforce not yet connected.',
    pocStatus: 'none',
    nextSteps: [
      'Define cohort health metrics and benchmarks',
      'Build data aggregation query from Salesforce',
      'Design summary template format',
      'Test with Foundations Trail historical cohort data',
    ],
  },

  {
    id: 'cap-progress-insights',
    name: 'Progress Insights',
    domain: 'Learning',
    shortDescription: 'Individual learner progress analysis and self-service insights.',
    purpose: 'Give learners a clear picture of their own progress — what they\'ve completed, where they stand relative to the cohort, and what\'s coming next. Delivered conversationally by Penny on request or at weekly check-in.',
    audience: ['Learners'],
    inputs: ['Module completion status', 'Assessment scores', 'Sprint timeline', 'Cohort benchmarks'],
    outputs: ['Progress summary message', 'Comparison to cohort average (anonymized)', 'Next recommended action', 'Certification readiness estimate'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail'],
    relatedSfObjects: ['Program_Engagement__c', 'Training_Plan_Item__c'],
    relatedKnowledgeSources: ['Program structure data'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: ['Weekly review'],
    relatedStandards: ['std-module'],
    maturity: 'Defined',
    owner: 'Penny Content Author',
    futureIntegrationStatus: 'Q3 2025 — On-demand via Slack command. Weekly digest triggered by calendar event.',
    dependencies: ['cap-learner-coaching', 'cap-weekly-reviews'],
    pocMapping: 'Progress reporting exists in POC as raw data display. No conversational framing or coaching narrative.',
    pocStatus: 'partial',
    nextSteps: [
      'Design conversational progress narrative template',
      'Build cohort anonymized benchmarking',
      'Wire LMS completion data into Penny context',
      'Add certification readiness estimation logic',
    ],
  },

  // ── Knowledge ──────────────────────────────────────────────────────────

  {
    id: 'cap-knowledge-retrieval',
    name: 'Knowledge Retrieval',
    domain: 'Knowledge',
    shortDescription: 'Answers learner and coach questions using the Knowledge Library.',
    purpose: 'Enable Penny to answer Salesforce and program-related questions by retrieving relevant knowledge articles, Salesforce KB entries, and source documentation. Penny cites sources and acknowledges when it doesn\'t know.',
    audience: ['Learners', 'Coaches'],
    inputs: ['Learner question (natural language)', 'Current module context', 'Knowledge Library index'],
    outputs: ['Conversational answer with citation', 'Related article recommendations', 'Link to source document', 'Confidence indicator'],
    relatedPrograms: ['All programs'],
    relatedSfObjects: ['Knowledge__c'],
    relatedKnowledgeSources: ['Knowledge Library', 'Salesforce KB', 'Source Docs', 'Standards: Knowledge Article'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: [],
    relatedStandards: ['std-knowledge-article'],
    maturity: 'Prototype',
    owner: 'Knowledge Lead',
    futureIntegrationStatus: 'Q3 2025 — RAG pipeline over Knowledge Library. Salesforce Knowledge__c as source of truth.',
    dependencies: [],
    pocMapping: 'Retrieval-augmented Q&A exists in POC over a static document set. No live KB sync or citation logic.',
    pocStatus: 'exists',
    nextSteps: [
      'Define knowledge index structure and update cadence',
      'Build source citation format',
      'Add confidence scoring (high/medium/low)',
      'Implement "I don\'t know" handling with escalation',
      'Wire Knowledge Library standards compliance into retrieval',
    ],
    foundationsTrailExample: 'Learner asks "what\'s the difference between a lookup and master-detail?" → Penny retrieves Knowledge Article, gives conversational answer, cites article, and offers to explore further.',
  },

  {
    id: 'cap-source-recommendations',
    name: 'Source Recommendations',
    domain: 'Knowledge',
    shortDescription: 'Suggests relevant Trailhead, documentation, and internal content based on learner context.',
    purpose: 'Proactively surface the most relevant content resources for a learner based on their current module, stated confusion, or upcoming assessment — going beyond just answering questions to actively directing learning.',
    audience: ['Learners'],
    inputs: ['Current module', 'Learner question or confusion signal', 'Content library index', 'Trailhead module map'],
    outputs: ['Ranked resource list', 'Short explanation of why each resource is relevant', 'Direct links to Trailhead or internal docs'],
    relatedPrograms: ['Foundations Trail', 'All programs'],
    relatedSfObjects: ['Knowledge__c'],
    relatedKnowledgeSources: ['Trailhead modules', 'Salesforce Help', 'Source Docs', 'Knowledge Library'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: [],
    relatedStandards: ['std-knowledge-article', 'std-lesson'],
    maturity: 'Defined',
    owner: 'Knowledge Lead',
    futureIntegrationStatus: 'Q4 2025 — Personalized recommendation engine. Trailhead API integration planned.',
    dependencies: ['cap-knowledge-retrieval'],
    pocMapping: 'Basic resource linking exists in POC. No personalization or relevance ranking.',
    pocStatus: 'partial',
    nextSteps: [
      'Build content relevance ranking by module/topic',
      'Map internal docs to Trailhead equivalents',
      'Design recommendation message format',
      'Test with Foundations Trail Module 1-4 topic areas',
    ],
  },

  // ── Operations ─────────────────────────────────────────────────────────

  {
    id: 'cap-executive-briefs',
    name: 'Executive Briefs',
    domain: 'Operations',
    shortDescription: 'Program health summaries for leadership — generated by Penny from live data.',
    purpose: 'Generate concise, data-backed program health briefs for Transition Trails leadership. Briefs cover completion rates, learner engagement, Penny usage, and program trajectory — without requiring manual data pulls.',
    audience: ['Executive Team', 'Program Managers'],
    inputs: ['Cohort data', 'Completion rates', 'Penny engagement metrics', 'Escalation counts', 'Assessment pass rates'],
    outputs: ['Executive brief document (Slack/email/PDF)', 'Key metrics dashboard summary', 'Trend analysis', 'Action recommendations'],
    relatedPrograms: ['All programs'],
    relatedSfObjects: ['Program__c', 'Service_Schedule__c', 'Program_Engagement__c'],
    relatedKnowledgeSources: ['Program health benchmarks'],
    relatedCommChannels: ['Email', 'Leadership Slack channel'],
    relatedCalendarEvents: ['Monthly program review', 'Board reporting cycles'],
    relatedStandards: [],
    maturity: 'Planned',
    owner: 'Penny Product Lead',
    futureIntegrationStatus: 'Q1 2026 — Monthly automated brief. On-demand generation via Slack command.',
    dependencies: ['cap-cohort-summaries', 'cap-escalations'],
    pocMapping: 'No executive brief capability in POC.',
    pocStatus: 'none',
    nextSteps: [
      'Define executive brief schema and metrics set',
      'Design brief template format',
      'Build Salesforce data aggregation for program metrics',
      'Pilot with Foundations Trail Q3 2025 cohort data',
    ],
  },

  // ── Communications ─────────────────────────────────────────────────────

  {
    id: 'cap-slack-messaging',
    name: 'Slack Messaging',
    domain: 'Communications',
    shortDescription: 'Penny delivers messages, prompts, and activities in Slack channels and DMs.',
    purpose: 'Enable Penny to send and receive messages in Slack — DMs for coaching conversations, channel posts for cohort activities, and thread replies for group discussions. The primary delivery channel for Foundations Trail.',
    audience: ['Learners', 'Coaches', 'Program Managers'],
    inputs: ['Message content from any Penny capability', 'Target channel/DM', 'Learner Slack user ID', 'Trigger event'],
    outputs: ['Slack message (DM or channel)', 'Thread continuation', 'Reaction tracking', 'Delivery confirmation'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail'],
    relatedSfObjects: ['Program_Engagement__c'],
    relatedKnowledgeSources: ['Standards: Slack Activity'],
    relatedCommChannels: ['Slack DM', 'Slack channel', 'Slack thread'],
    relatedCalendarEvents: [],
    relatedStandards: ['std-slack-activity'],
    maturity: 'Prototype',
    owner: 'Communications Lead',
    futureIntegrationStatus: 'Q3 2025 — Slack API integration via Bolt. OAuth workspace connection.',
    dependencies: [],
    pocMapping: 'Slack message delivery exists in POC as basic API calls. No thread management, no reaction tracking.',
    pocStatus: 'exists',
    nextSteps: [
      'Implement Slack Bolt app with proper OAuth',
      'Build thread management for coaching conversations',
      'Add reaction and response tracking',
      'Wire to Penny message queue from other capabilities',
    ],
  },

  {
    id: 'cap-google-chat-messaging',
    name: 'Google Chat Messaging',
    domain: 'Communications',
    shortDescription: 'Penny delivers messages and activities in Google Chat spaces and DMs.',
    purpose: 'Enable Penny to post to Google Chat spaces and send DMs for programs operating in Google Workspace environments. Parallel capability to Slack Messaging — programs choose their primary channel.',
    audience: ['Learners', 'Coaches'],
    inputs: ['Message content', 'Target Chat space or DM', 'Learner email', 'Trigger event'],
    outputs: ['Google Chat message (DM or space)', 'Threaded reply', 'Delivery confirmation'],
    relatedPrograms: ['Explorer\'s Trail', 'Trail of Mastery'],
    relatedSfObjects: ['Program_Engagement__c'],
    relatedKnowledgeSources: ['Standards: Google Chat Update'],
    relatedCommChannels: ['Google Chat DM', 'Google Chat space'],
    relatedCalendarEvents: [],
    relatedStandards: ['std-google-chat-update'],
    maturity: 'Defined',
    owner: 'Communications Lead',
    futureIntegrationStatus: 'Q4 2025 — Google Chat API integration. Space membership management via Google Workspace.',
    dependencies: [],
    pocMapping: 'Google Chat delivery exists in POC as basic API call. No space management or threading.',
    pocStatus: 'partial',
    nextSteps: [
      'Implement Google Chat API with service account',
      'Build space management for multi-cohort support',
      'Mirror Slack messaging capabilities for parity',
      'Test with Explorer\'s Trail pilot cohort',
    ],
  },

  {
    id: 'cap-calendar-reminders',
    name: 'Calendar-Aware Reminders',
    domain: 'Communications',
    shortDescription: 'Penny sends contextually aware reminders tied to calendar events and sprint schedules.',
    purpose: 'Send learners and coaches reminders for upcoming sessions, deadlines, and events — personalized based on each learner\'s current progress and any outstanding items. Smarter than a calendar invite.',
    audience: ['Learners', 'Coaches'],
    inputs: ['Calendar event data', 'Learner progress context', 'Outstanding module/assessment list', 'Reminder standards config'],
    outputs: ['Personalized reminder message', 'Preparation checklist if applicable', 'Attendance confirmation request'],
    relatedPrograms: ['Foundations Trail', 'All programs'],
    relatedSfObjects: ['Service_Attendance__c', 'Service_Schedule__c'],
    relatedKnowledgeSources: ['Standards: Calendar Reminder'],
    relatedCommChannels: ['Slack DM', 'Google Chat DM', 'Email'],
    relatedCalendarEvents: ['Office Hours', 'Sprint Deadlines', 'Assessment Windows', 'Live Sessions'],
    relatedStandards: ['std-calendar-reminder'],
    maturity: 'Defined',
    owner: 'Communications Lead',
    futureIntegrationStatus: 'Q3 2025 — Google Calendar API integration. Reminder personalization from Salesforce progress data.',
    dependencies: ['cap-slack-messaging', 'cap-google-chat-messaging'],
    pocMapping: 'Calendar reminders exist in POC as fixed-time messages. No personalization or progress context.',
    pocStatus: 'partial',
    nextSteps: [
      'Connect Google Calendar API for event data',
      'Build personalization logic (what is this learner behind on?)',
      'Implement multi-channel delivery selection',
      'Test reminder timing and response rates with Foundations Trail',
    ],
    foundationsTrailExample: 'Office hours tomorrow for Sprint 1 learners. Penny sends personalized reminder to each: those with incomplete modules get a prep message; those fully caught up get an encouragement message.',
  },

  // ── Questing ───────────────────────────────────────────────────────────

  {
    id: 'cap-trail-quests',
    name: 'Trail Quests',
    domain: 'Questing',
    shortDescription: 'Challenge-based learning quests that Penny delivers and tracks throughout the program.',
    purpose: 'Engage learners in optional (and sometimes required) challenge-based learning quests that go beyond standard modules. Penny assigns, tracks, and coaches learners through Trail Quests, celebrating completions and providing hints.',
    audience: ['Learners'],
    inputs: ['Quest definitions (objective, challenge, criteria)', 'Learner program stage', 'Completion status'],
    outputs: ['Quest assignment message', 'Hint or guidance on request', 'Completion acknowledgment', 'Quest completion log'],
    relatedPrograms: ['Foundations Trail', 'All programs'],
    relatedSfObjects: ['Training_Plan_Item__c'],
    relatedKnowledgeSources: ['Quest Knowledge Articles', 'Module content'],
    relatedCommChannels: ['Slack DM', 'Slack channel (cohort)'],
    relatedCalendarEvents: ['Sprint Deadlines'],
    relatedStandards: [],
    maturity: 'Prototype',
    owner: 'Curriculum Lead',
    futureIntegrationStatus: 'Q3 2025 — Quest delivery via Slack. Completion tracking in Training_Plan_Item__c.',
    dependencies: ['cap-learner-coaching', 'cap-slack-messaging'],
    pocMapping: 'Trail Quest delivery exists in POC as static quest definitions. Penny can describe quests but not track or adapt.',
    pocStatus: 'partial',
    nextSteps: [
      'Define quest data model (objective, criteria, hints)',
      'Build quest assignment trigger logic',
      'Implement completion tracking',
      'Design hint-delivery conversation flow',
      'Connect to Salesforce Training_Plan_Item__c',
    ],
    foundationsTrailExample: 'After Module 4, Penny assigns "The Config Challenge": "Your quest: configure a complete intake flow for a fictional nonprofit using everything from Sprint 2. You have 72 hours. I\'ll be here if you get stuck."',
  },

  {
    id: 'cap-weekly-reviews',
    name: 'Weekly Reviews',
    domain: 'Questing',
    shortDescription: 'End-of-week reflection and planning sessions guided by Penny.',
    purpose: 'At the end of each week, Penny guides learners through a structured review: what they accomplished, what challenged them, and what they\'re committing to for the coming week. Creates continuity across the program.',
    audience: ['Learners'],
    inputs: ['Week completion data (modules, assessments, activities)', 'Prior week\'s commitments', 'Upcoming sprint schedule'],
    outputs: ['Weekly review conversation', 'Next-week commitment capture', 'Progress summary message', 'Coach flag if commitments are consistently missed'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail'],
    relatedSfObjects: ['Program_Engagement__c'],
    relatedKnowledgeSources: [],
    relatedCommChannels: ['Slack DM', 'Google Chat DM'],
    relatedCalendarEvents: ['Weekly review (Friday or Sunday)'],
    relatedStandards: [],
    maturity: 'Defined',
    owner: 'Penny Content Author',
    futureIntegrationStatus: 'Q3 2025 — Scheduled weekly via calendar trigger. Commitment capture stored in Salesforce.',
    dependencies: ['cap-learner-coaching', 'cap-reflection-prompts', 'cap-progress-insights'],
    pocMapping: 'Weekly check-in message exists in POC. No commitment capture, no follow-through tracking, no personalization.',
    pocStatus: 'partial',
    nextSteps: [
      'Design weekly review conversation flow (3-part: look back, reflect, look ahead)',
      'Build commitment capture and reminder logic',
      'Wire progress data into personalized review context',
      'Test 4-week review sequence with Foundations Trail cohort',
    ],
    foundationsTrailExample: 'Friday Sprint 2 Week 1 → Penny: "End of week check-in! You finished 2 of 3 modules this week. What got in the way of Module 4? And what\'s one thing you\'re committing to for next week?"',
  },
];

// ── Summary ────────────────────────────────────────────────────────────────

export const CAPABILITY_SUMMARY = {
  total:    pennyCapabilities.length,
  byDomain: Object.fromEntries(
    (['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'] as CapabilityDomain[]).map(d => [
      d, pennyCapabilities.filter(c => c.domain === d).length,
    ])
  ) as Record<CapabilityDomain, number>,
  byMaturity: Object.fromEntries(
    (['Prototype', 'Defined', 'Planned', 'In Development', 'Integrated', 'Operational'] as CapabilityReadiness[]).map(r => [
      r, pennyCapabilities.filter(c => c.maturity === r).length,
    ])
  ) as Record<CapabilityReadiness, number>,
  byPocStatus: {
    exists:  pennyCapabilities.filter(c => c.pocStatus === 'exists').length,
    partial: pennyCapabilities.filter(c => c.pocStatus === 'partial').length,
    planned: pennyCapabilities.filter(c => c.pocStatus === 'planned').length,
    none:    pennyCapabilities.filter(c => c.pocStatus === 'none').length,
  },
};

// ── Architecture Layers ────────────────────────────────────────────────────

export const PENNY_ARCHITECTURE_LAYERS = [
  {
    layer: 'Penny Intelligence Layer',
    description: 'Penny sits above all data and delivery systems. It orchestrates capabilities by reading context, applying standards, and delivering personalized interactions.',
    components: ['Capability Registry', 'Conversation Engine', 'Context Injection', 'Response Quality'],
    cls: 'border-secondary/30 bg-secondary/10',
  },
  {
    layer: 'Trail OS Operating Layer',
    description: 'The operating platform that Penny uses to understand program structure, learner progress, and curriculum content.',
    components: ['Program Blueprint', 'Standards Studio', 'Curriculum Studio', 'Salesforce Architecture'],
    cls: 'border-primary/20 bg-primary/5',
  },
  {
    layer: 'Salesforce Data Layer',
    description: 'System of record for all learner, program, and organizational data. Penny reads and writes here via Agentforce.',
    components: ['Program__c', 'Program_Engagement__c', 'Training_Plan_Item__c', 'Knowledge__c'],
    cls: 'border-blue-200 bg-blue-50',
  },
  {
    layer: 'Knowledge Layer',
    description: 'The content Penny draws on to answer questions, make recommendations, and coach learners accurately.',
    components: ['Knowledge Library', 'Standards', 'Source Docs', 'Salesforce KB'],
    cls: 'border-amber-200 bg-amber-50',
  },
  {
    layer: 'Communications Layer',
    description: 'The channels through which Penny delivers messages, prompts, and activities to learners and coaches.',
    components: ['Slack', 'Google Chat', 'Email', 'Calendar'],
    cls: 'border-green-200 bg-green-50',
  },
  {
    layer: 'Curriculum Layer',
    description: 'The structured learning content Penny uses as context for coaching, quest delivery, and reflection prompts.',
    components: ['Modules', 'Lessons', 'Assessments', 'Penny Assets', 'Delivery Assets'],
    cls: 'border-violet-200 bg-violet-50',
  },
];

export const DOMAIN_ORDER: CapabilityDomain[] = [
  'Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing',
];
