// ── Penny Prompt Studio — Prompt Architecture & Governance Layer ─────────
// The administrative control center for how Penny thinks, retrieves knowledge,
// applies standards, and generates outputs. Staff configure Penny behavior here
// without touching code.

export type PromptDomain =
  | 'Coaching' | 'Career' | 'Learning' | 'Knowledge' | 'Operations' | 'Communications' | 'Questing';

export type PromptStatus = 'Draft' | 'Review' | 'Approved' | 'Deprecated';

export type HallucinationRisk = 'Low' | 'Medium' | 'High';

export type VariableSource =
  | 'Salesforce' | 'LMS' | 'User Input' | 'Calendar' | 'Standards Studio' | 'Curriculum Studio' | 'Penny Generated';

export type VariableType = 'text' | 'number' | 'list' | 'object' | 'boolean';

export type OutputFormatType =
  | 'Coaching Message' | 'Feedback Report' | 'Executive Summary' | 'Study Plan'
  | 'Knowledge Answer' | 'Cohort Brief' | 'Career Recommendation' | 'Escalation Alert'
  | 'Module Outline' | 'Reflection Prompt';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface PromptVariable {
  id: string;
  name: string;               // e.g. {{learner_name}}
  label: string;
  type: VariableType;
  description: string;
  source: VariableSource;
  required: boolean;
  exampleValue: string;
  usedByTemplates: string[];  // template ids
}

export interface PromptSourceRule {
  sourceId: string;
  sourceName: string;
  role: 'Required' | 'Preferred' | 'Optional' | 'Forbidden';
  reasoning: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  domain: PromptDomain;
  capabilityId: string;
  shortDescription: string;
  purpose: string;
  audience: string[];
  requiredVariables: string[];       // variable ids
  sourceRules: PromptSourceRule[];
  outputFormatId: OutputFormatType;
  tone: string;
  guardrails: string[];
  owner: string;
  lastModifiedBy?: string;
  /** Email of the user who last submitted this template for review via "Send for Review". */
  reviewRequestedBy?: string;
  status: PromptStatus;
  version: string;
  lastReviewed: string;
  /**
   * ISO date string (YYYY-MM-DD) of the last meaningful edit to this template.
   * Used to compute governance SLA compliance for Draft prompts (3-day review window).
   */
  lastModifiedDate?: string;
  promptBody: string;                // simplified annotated prompt text
  relatedStandards: string[];
  relatedSfObjects: string[];
  hallucinationRisk: HallucinationRisk;
  qualityScore: number;              // 0–100
  testBench: {
    sampleInputs: Record<string, string>;
    simulatedOutput: string;
    simulationNotes: string;
  };
}

export interface OutputFormat {
  id: OutputFormatType;
  name: string;
  description: string;
  usedBy: string[];   // template ids
  structure: string[];  // field list
  example: string;
  lengthGuidance: string;
  tone: string;
}

export interface VersionEntry {
  id: string;
  templateId: string;
  version: string;
  date: string;
  author: string;
  changeType: 'Created' | 'Updated' | 'Approved' | 'Deprecated' | 'Reverted';
  summary: string;
  breaking: boolean;
}

export interface QualityReview {
  templateId: string;
  sourceCoverage: number;        // 0–100 %
  standardsAlignment: number;
  hallucinationRisk: HallucinationRisk;
  usefulnessScore: number;
  reviewStatus: 'Pending' | 'In Review' | 'Approved' | 'Rejected';
  approvedBy: string;
  approvedDate: string;
  openFlags: string[];
}

// ── Config ─────────────────────────────────────────────────────────────────

export const PROMPT_STATUS_CONFIG: Record<PromptStatus, { cls: string; order: number }> = {
  Draft:      { cls: 'text-slate-600 bg-slate-50 border-slate-200',     order: 1 },
  Review:     { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',     order: 2 },
  Approved:   { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',     order: 3 },
  Deprecated: { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',        order: 4 },
};

export const RISK_CONFIG: Record<HallucinationRisk, { cls: string; description: string }> = {
  Low:    { cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',  description: 'Penny answers from well-structured, single-source data. Drift risk is minimal.' },
  Medium: { cls: 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]', description: 'Multi-source synthesis required. Penny may over-generalise. Human review recommended.' },
  High:   { cls: 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',    description: 'Open-ended generation. Penny may fabricate details. Mandatory guardrails + human review.' },
};

export const DOMAIN_CLS: Record<PromptDomain, string> = {
  Coaching:       'text-secondary border-secondary/20 bg-secondary/10',
  Career:         'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',
  Learning:       'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
  Knowledge:      'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',
  Operations:     'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]',
  Communications: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
  Questing:       'text-primary border-primary/20 bg-primary/5',
};

export const DOMAIN_ORDER: PromptDomain[] = [
  'Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing',
];

// ── Variables ──────────────────────────────────────────────────────────────

export const promptVariables: PromptVariable[] = [
  { id: 'var-learner-name',       name: '{{learner_name}}',        label: 'Learner Name',           type: 'text',    source: 'Salesforce',         required: true,  exampleValue: 'Jordan Smith',          description: 'Full name of the learner receiving the interaction.',                                          usedByTemplates: ['pt-learner-coaching','pt-weekly-reflection','pt-study-coach','pt-resume-review','pt-linkedin-review','pt-reflection-prompt','pt-escalation-alert'] },
  { id: 'var-program-name',       name: '{{program_name}}',        label: 'Program Name',           type: 'text',    source: 'Salesforce',         required: true,  exampleValue: 'Foundations Trail',     description: 'Name of the active program the learner is enrolled in.',                                       usedByTemplates: ['pt-learner-coaching','pt-weekly-reflection','pt-study-coach','pt-cohort-summary','pt-executive-brief','pt-reflection-prompt','pt-escalation-alert'] },
  { id: 'var-sprint-number',      name: '{{sprint_number}}',       label: 'Sprint Number',          type: 'number',  source: 'Salesforce',         required: false, exampleValue: '2',                     description: 'Current sprint the learner is in.',                                                            usedByTemplates: ['pt-learner-coaching','pt-weekly-reflection','pt-study-coach','pt-reflection-prompt'] },
  { id: 'var-current-module',     name: '{{current_module}}',      label: 'Current Module',         type: 'text',    source: 'LMS',                required: false, exampleValue: 'Module 3: Automation',  description: 'The module the learner is currently working through.',                                          usedByTemplates: ['pt-learner-coaching','pt-study-coach','pt-reflection-prompt','pt-knowledge-retrieval'] },
  { id: 'var-assessment-scores',  name: '{{assessment_scores}}',   label: 'Assessment Scores',      type: 'object',  source: 'Salesforce',         required: false, exampleValue: '{"Module 1": 82, "Module 2": 74}', description: 'Object of module → score pairs for recent assessments.',                           usedByTemplates: ['pt-learner-coaching','pt-study-coach','pt-resume-review','pt-cohort-summary','pt-escalation-alert'] },
  { id: 'var-certifications',     name: '{{certifications}}',      label: 'Certifications Earned',  type: 'list',    source: 'Salesforce',         required: false, exampleValue: 'SF Admin (in progress)', description: 'Comma-separated list of certifications the learner has earned or is pursuing.',               usedByTemplates: ['pt-resume-review','pt-linkedin-review','pt-interview-prep'] },
  { id: 'var-career-goal',        name: '{{career_goal}}',         label: 'Career Goal',            type: 'text',    source: 'User Input',         required: false, exampleValue: 'Salesforce Admin at a nonprofit', description: 'Learner\'s stated career target role and sector.',                                  usedByTemplates: ['pt-resume-review','pt-linkedin-review','pt-interview-prep'] },
  { id: 'var-coach-notes',        name: '{{coach_notes}}',         label: 'Coach Notes',            type: 'text',    source: 'Salesforce',         required: false, exampleValue: 'Struggling with automation concepts; missed Sprint 1 check-in.', description: 'Coach-authored notes for this learner — injected only when escalation flag is set.', usedByTemplates: ['pt-learner-coaching','pt-escalation-alert'] },
  { id: 'var-knowledge-sources',  name: '{{knowledge_sources}}',   label: 'Knowledge Source IDs',   type: 'list',    source: 'Standards Studio',   required: false, exampleValue: 'src-sf-technology, src-lms-modules', description: 'Resolved list of approved source IDs Penny may draw from for this interaction.', usedByTemplates: ['pt-knowledge-retrieval','pt-study-coach'] },
  { id: 'var-cohort-size',        name: '{{cohort_size}}',         label: 'Cohort Size',            type: 'number',  source: 'Salesforce',         required: false, exampleValue: '18',                    description: 'Number of active learners in the current cohort.',                                              usedByTemplates: ['pt-cohort-summary','pt-executive-brief'] },
  { id: 'var-week-number',        name: '{{week_number}}',         label: 'Week Number',            type: 'number',  source: 'Calendar',           required: false, exampleValue: '4',                     description: 'Current week number in the program cohort.',                                                    usedByTemplates: ['pt-weekly-reflection','pt-cohort-summary'] },
  { id: 'var-prior-commitments',  name: '{{prior_commitments}}',   label: 'Prior Week Commitments', type: 'text',    source: 'Penny Generated',    required: false, exampleValue: 'Finish Module 3 and submit Sprint 2 assessment.', description: 'Commitments captured from the learner\'s prior weekly review — used to follow up.', usedByTemplates: ['pt-weekly-reflection'] },
  { id: 'var-completion-rate',    name: '{{completion_rate}}',     label: 'Cohort Completion Rate', type: 'number',  source: 'Salesforce',         required: false, exampleValue: '68',                    description: 'Percentage of expected modules completed by the cohort at this point.',                         usedByTemplates: ['pt-cohort-summary','pt-executive-brief'] },
  { id: 'var-escalation-count',   name: '{{escalation_count}}',   label: 'Escalation Count',       type: 'number',  source: 'Salesforce',         required: false, exampleValue: '3',                     description: 'Number of active escalation flags in the current cohort.',                                      usedByTemplates: ['pt-cohort-summary','pt-executive-brief','pt-escalation-alert'] },
];

// ── Output Formats ─────────────────────────────────────────────────────────

export const outputFormats: OutputFormat[] = [
  {
    id: 'Coaching Message',
    name: 'Coaching Message',
    description: 'A direct, warm, conversational message delivered to a learner in Slack or Google Chat.',
    usedBy: ['pt-learner-coaching','pt-reflection-prompt','pt-weekly-reflection'],
    structure: ['Opening acknowledgment (1 sentence)', 'Core message or question (2–3 sentences)', 'Follow-up or call to action (1 sentence)'],
    example: '"You finished Module 3! That automation section can feel like a lot the first time through. What part clicked for you most — Process Builder, Flow, or the Apex triggers? Let me know and I\'ll tailor tomorrow\'s check-in."',
    lengthGuidance: '3–5 sentences. No lists. Conversational.',
    tone: 'Warm, encouraging, curious. Never robotic or preachy.',
  },
  {
    id: 'Feedback Report',
    name: 'Feedback Report',
    description: 'Structured section-by-section feedback on learner career materials (resume, LinkedIn).',
    usedBy: ['pt-resume-review','pt-linkedin-review'],
    structure: ['Overall score (numeric + label)', 'Section scores (object per section)', 'Top 3 priority improvements', 'Rewrite examples for 1–2 sections', 'Confidence rating'],
    example: '"Overall: 72/100 — Strong Foundation. Experience: 8/10. Summary: 5/10. Skills: 6/10. Top priority: Rewrite your summary to lead with your Salesforce Admin certification path..."',
    lengthGuidance: 'Structured — not a wall of text. Use section headers. 200–350 words.',
    tone: 'Direct, constructive, specific. No vague praise.',
  },
  {
    id: 'Executive Summary',
    name: 'Executive Summary',
    description: 'Concise leadership brief covering program health, key metrics, and recommended actions.',
    usedBy: ['pt-executive-brief'],
    structure: ['Program + date range', 'Key metrics (3–5 numbers)', 'Trend vs prior period', 'Top 3 insights', 'Recommended actions'],
    example: '"Foundations Trail — Week 8 of 16. Completion rate: 68% (↓4% vs last week). Engagement: 81%. Escalations: 3 active. Insight: Sprint 2 Module 4 is the highest drop-off point — consider an optional office hours session..."',
    lengthGuidance: '150–250 words. Bullets for metrics. Narrative for insights.',
    tone: 'Professional, data-backed, decisive. No fluff.',
  },
  {
    id: 'Study Plan',
    name: 'Study Plan',
    description: 'Personalised day-by-day study schedule for the upcoming sprint period.',
    usedBy: ['pt-study-coach'],
    structure: ['Context: where the learner is', 'Today\'s recommended focus', 'Day-by-day priorities (3–5 days)', 'Resource recommendations', 'Pacing warning if behind'],
    example: '"Based on your pace this week, here\'s a focused plan to catch up before the Sprint 2 assessment window opens Friday. Today: finish Module 3 (est. 90 min). Tomorrow: Module 4 + practice scenarios (2 hrs)..."',
    lengthGuidance: '100–200 words. Use numbered list for day-by-day. Brief resource links.',
    tone: 'Practical, encouraging, specific. No lecturing.',
  },
  {
    id: 'Knowledge Answer',
    name: 'Knowledge Answer',
    description: 'A cited, conversational answer to a knowledge question with source attribution.',
    usedBy: ['pt-knowledge-retrieval'],
    structure: ['Direct answer (1–2 sentences)', 'Explanation with context (2–3 sentences)', 'Source citation', 'Offer to go deeper'],
    example: '"A lookup relationship is flexible — the child record can exist without the parent. A master-detail is tighter — the child requires the parent and rolls up data. [Source: SF Knowledge — Technology] Want me to walk through when you\'d use each one?"',
    lengthGuidance: '60–120 words. Always cite source. Always offer to expand.',
    tone: 'Clear, precise, helpful. Never condescending.',
  },
  {
    id: 'Cohort Brief',
    name: 'Cohort Brief',
    description: 'Weekly cohort health summary for coaches and program managers.',
    usedBy: ['pt-cohort-summary'],
    structure: ['Date and cohort info', 'Completion snapshot', 'Engagement indicators', 'Flagged learners (anonymized)', 'Recommended coach actions'],
    example: '"Foundations Trail Cohort — Week 4. Completion: 68% on-pace, 22% behind (3+ modules), 10% ahead. 3 learners flagged for check-in. Coach action: Reach out to flagged learners before Thursday office hours..."',
    lengthGuidance: '150–200 words. Tables for metrics where appropriate.',
    tone: 'Factual, action-oriented. For coaches, not learners.',
  },
  {
    id: 'Career Recommendation',
    name: 'Career Recommendation',
    description: 'Targeted career advice with specific next steps for job readiness.',
    usedBy: ['pt-interview-prep'],
    structure: ['Readiness assessment', 'Target role alignment', 'Top 3 prep areas', 'Specific next steps', 'Timeline suggestion'],
    example: '"Based on your Foundations completion and Admin certification path, you\'re approximately 6 weeks from job-ready for entry-level Admin roles. Your strongest talking point: nonprofit config experience from Trail Quests..."',
    lengthGuidance: '150–200 words. Specific and actionable.',
    tone: 'Confident, honest, encouraging. No empty reassurance.',
  },
  {
    id: 'Escalation Alert',
    name: 'Escalation Alert',
    description: 'Structured alert to a coach flagging a learner who needs human intervention.',
    usedBy: ['pt-escalation-alert'],
    structure: ['Learner + program', 'Signal detected', 'Supporting data', 'Suggested action', 'Urgency level'],
    example: '"Escalation — Foundations Trail. Jordan S. has missed 2 consecutive check-ins and scored below 60% on Module 2. Penny has attempted 3 engagement messages with no response. Suggested: direct coach outreach within 24h. Urgency: High."',
    lengthGuidance: '80–120 words. Structured. Never send to learner.',
    tone: 'Clinical, factual. For coaches only.',
  },
  {
    id: 'Reflection Prompt',
    name: 'Reflection Prompt',
    description: 'Post-module reflection prompt with deepening follow-up question logic.',
    usedBy: ['pt-reflection-prompt'],
    structure: ['Completion acknowledgment (1 sentence)', 'Core reflection question', 'Context from the module', 'Follow-up logic hint for Penny'],
    example: '"You just finished the Automation module — great work getting through it. What\'s one real situation from your own experience where an automated flow would have saved time? I\'ll follow up based on what you share."',
    lengthGuidance: '2–4 sentences. Question is the focus. No lecture.',
    tone: 'Curious, warm, open-ended.',
  },
  {
    id: 'Module Outline',
    name: 'Module Outline',
    description: 'Structured module scaffold: objectives, lessons, assessments, and Penny touchpoints.',
    usedBy: ['pt-module-gen'],
    structure: ['Module title + program context', 'Learning objectives (3–5)', 'Lesson list with descriptions', 'Assessment design', 'Penny touchpoints', 'Standards compliance check'],
    example: '"Module 5: Reports & Dashboards — Foundations Trail Sprint 2. Objectives: 1) Build a tabular report from scratch, 2) Add filters and groupings… Penny touchpoints: Pre-module study nudge, post-lesson reflection (Lesson 3)..."',
    lengthGuidance: 'Structured — no prose blocks. Full outline, ~400 words.',
    tone: 'Precise, instructional, standards-aligned.',
  },
];

// ── Prompt Templates ────────────────────────────────────────────────────────

export const promptTemplates: PromptTemplate[] = [

  {
    id: 'pt-learner-coaching',
    name: 'Learner Coaching Message',
    domain: 'Coaching',
    capabilityId: 'cap-learner-coaching',
    shortDescription: 'Personalized mid-program coaching message based on learner context.',
    purpose: 'Generate a single, contextually aware coaching message for a learner at a specific point in their program. Penny uses module progress, assessment data, and coach notes (if escalation-flagged) to craft the message.',
    audience: ['Learners'],
    requiredVariables: ['var-learner-name','var-program-name','var-sprint-number','var-current-module','var-assessment-scores'],
    sourceRules: [
      { sourceId: 'src-lms-modules',         sourceName: 'LMS Course Modules',    role: 'Required',  reasoning: 'Current module content is essential for accurate coaching context.' },
      { sourceId: 'src-assessments',          sourceName: 'SF Assessments',        role: 'Required',  reasoning: 'Assessment performance personalizes the message tone and focus.' },
      { sourceId: 'src-standards-studio',     sourceName: 'Standards Studio',      role: 'Required',  reasoning: 'Coach Notes standard defines valid tone, escalation triggers, format.' },
      { sourceId: 'src-sf-mission-delivery',  sourceName: 'SF Knowledge: Mission', role: 'Preferred', reasoning: 'Program model context keeps Penny aligned with org coaching approach.' },
      { sourceId: 'src-coach-notes',          sourceName: 'Coach Notes',           role: 'Optional',  reasoning: 'Read only if escalation flag is active. Adds human-coach context.' },
    ],
    outputFormatId: 'Coaching Message',
    tone: 'Warm, curious, encouraging. Never robotic, preachy, or generic.',
    guardrails: [
      'Never share assessment scores verbatim with the learner',
      'Do not diagnose learning disabilities or emotional issues',
      'If learner expresses distress, route to coach escalation immediately',
      'Never compare learner to other cohort members by name',
      'Limit to 5 sentences maximum — do not monologue',
    ],
    owner: 'Penny Product Lead',
    status: 'Approved',
    version: '1.3',
    lastReviewed: 'May 2025',
    promptBody: `You are Penny, a supportive Salesforce learning coach for Transition Trails.
Learner: {{learner_name}} | Program: {{program_name}} | Sprint: {{sprint_number}} | Module: {{current_module}}
Assessment context: {{assessment_scores}}
{{#if escalation_flag}}Coach context: {{coach_notes}}{{/if}}

RETRIEVE from: LMS module content for {{current_module}} | Standards: Coach Notes standard
TONE: Warm and curious. Acknowledge what they've done before suggesting anything.
OUTPUT: A single coaching message (3–5 sentences) in the Coaching Message format.
GUARDRAILS: No score disclosure. No comparison. Max 5 sentences. Escalate if distress signal.`,
    relatedStandards: ['std-coach-notes','std-penny-prompt'],
    relatedSfObjects: ['Program_Engagement__c','Training_Plan_Item__c','Contact'],
    hallucinationRisk: 'Low',
    qualityScore: 91,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', program_name: 'Foundations Trail', sprint_number: '2', current_module: 'Module 3: Automation Tools', assessment_scores: '{"Module 1": 88, "Module 2": 74}' },
      simulatedOutput: '"Hey Jordan — Module 2 was a tough one, and an 74 is a solid pass. You\'re heading into Automation Tools now, which a lot of people find either clicks immediately or takes a couple sessions. What part are you most curious about going in — Process Builder, Flow, or something else? I\'ll tailor this week\'s check-ins based on where you land."',
      simulationNotes: 'Penny acknowledged the lower Module 2 score without stating it numerically. Opened with a question to invite engagement. 4 sentences — within guardrail.',
    },
  },

  {
    id: 'pt-resume-review',
    name: 'Resume Review',
    domain: 'Career',
    capabilityId: 'cap-resume-review',
    shortDescription: 'Structured resume review for Salesforce role readiness.',
    purpose: 'Review a learner\'s resume section-by-section against Salesforce admin/analyst/consultant role expectations. Output a structured Feedback Report with scores, priorities, and rewrite examples.',
    audience: ['Learners', 'Career-transition Participants'],
    requiredVariables: ['var-learner-name','var-career-goal','var-certifications','var-assessment-scores'],
    sourceRules: [
      { sourceId: 'src-sf-mission-delivery',  sourceName: 'SF Knowledge: Mission',   role: 'Required',  reasoning: 'Career outcomes framework defines Salesforce-ready standards per role.' },
      { sourceId: 'src-assessments',           sourceName: 'SF Assessments',          role: 'Required',  reasoning: 'Cert progress tells Penny what skills the learner can credibly claim.' },
      { sourceId: 'src-lms-modules',           sourceName: 'LMS Course Modules',      role: 'Preferred', reasoning: 'Module completion informs what Salesforce experience the learner can describe.' },
      { sourceId: 'src-sf-ops-business',       sourceName: 'SF Knowledge: Operations',role: 'Forbidden', reasoning: 'Internal operations knowledge must not surface in learner-facing career content.' },
    ],
    outputFormatId: 'Feedback Report',
    tone: 'Direct, constructive, specific. No vague praise. Treat them as a professional.',
    guardrails: [
      'Never fabricate job titles or experience the learner has not described',
      'Do not reference other learners\' resumes as comparison points',
      'Flag if resume contains false certification claims for human review',
      'Do not make guarantees about job placement outcomes',
      'If career goal is unclear, ask before reviewing',
    ],
    owner: 'Career Services Lead',
    reviewRequestedBy: 'angela.landrith@transitiontrails.org',
    status: 'Review',
    version: '0.9',
    lastReviewed: 'April 2025',
    promptBody: `You are Penny, reviewing a Salesforce career-transition resume for Transition Trails.
Learner: {{learner_name}} | Career goal: {{career_goal}} | Certifications: {{certifications}}
Assessment results: {{assessment_scores}}
Resume text: [ATTACHED]

RETRIEVE from: SF Knowledge (Mission & Delivery) — career outcomes framework
VALIDATE: Does resume match what learner has actually completed per LMS + assessment data?
OUTPUT: Structured Feedback Report — Overall score, section scores, top 3 priorities, 1–2 rewrite examples.
GUARDRAILS: No fabrication of experience. Flag false cert claims. No placement guarantees.`,
    relatedStandards: [],
    relatedSfObjects: ['Contact','Program_Engagement__c'],
    hallucinationRisk: 'Medium',
    qualityScore: 78,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', career_goal: 'Salesforce Admin at a nonprofit', certifications: 'Salesforce Admin (in progress — Sprint 4)', assessment_scores: '{"Module 1": 88, "Module 2": 74, "Module 3": 81}' },
      simulatedOutput: 'Overall: 74/100 — Solid Foundation, Needs Strengthening\n\nExperience: 7/10 — You describe real responsibilities but undersell your declarative automation work.\nSummary: 4/10 — Too generic. Lead with your Salesforce pathway and nonprofit mission alignment.\nSkills: 6/10 — Add: "Salesforce Admin (in progress)", "Process Builder", "Declarative Automation".\n\nTop Priorities:\n1. Rewrite summary to open with your Admin certification path and nonprofit career goal.\n2. Rename "Database Management" bullet → "Salesforce Object Model and Relationships (Foundations Trail)"\n3. Add a Projects section: include your Trail Quest automation scenario from Sprint 2.\n\nRewrite example (Summary): "Salesforce Admin-in-training (Foundations Trail, Transition Trails) with 4 years of program coordination experience. Focused on nonprofit CRM configuration and data-driven program delivery. Expected certification: Q3 2025."',
      simulationNotes: 'Penny pulled career outcomes framework from SF Knowledge (Mission). Matched resume claims against LMS module completion. Flagged no fabrication issues. Output is in Feedback Report format.',
    },
  },

  {
    id: 'pt-linkedin-review',
    name: 'LinkedIn Profile Review',
    domain: 'Career',
    capabilityId: 'cap-linkedin-review',
    shortDescription: 'LinkedIn profile optimization for Salesforce ecosystem visibility.',
    purpose: 'Review a learner\'s pasted LinkedIn profile sections (headline, summary, skills, experience) and output targeted improvements for Salesforce job market visibility.',
    audience: ['Learners'],
    requiredVariables: ['var-learner-name','var-career-goal','var-certifications'],
    sourceRules: [
      { sourceId: 'src-sf-mission-delivery',  sourceName: 'SF Knowledge: Mission', role: 'Required',  reasoning: 'Role definitions and career pathways inform LinkedIn keyword strategy.' },
      { sourceId: 'src-lms-modules',           sourceName: 'LMS Course Modules',    role: 'Preferred', reasoning: 'Module content provides Salesforce terminology the learner can legitimately use.' },
    ],
    outputFormatId: 'Feedback Report',
    tone: 'Encouraging but specific. Help them see their story, not just fix their text.',
    guardrails: [
      'Do not fabricate connections or endorsements',
      'Only recommend keywords the learner has genuinely worked with',
      'Do not comment on profile photos',
      'Do not suggest connecting with specific individuals',
    ],
    owner: 'Career Services Lead',
    status: 'Draft',
    version: '0.4',
    lastReviewed: 'March 2025',
    lastModifiedDate: '2026-07-24',
    promptBody: `You are Penny, reviewing a LinkedIn profile for a Salesforce career-transition learner.
Learner: {{learner_name}} | Goal: {{career_goal}} | Certs: {{certifications}}
Profile sections: [PASTED INPUT]

RETRIEVE from: SF Knowledge (Mission & Delivery) — role definitions and keyword strategy
OUTPUT: Feedback Report — Headline score, Summary score, Skills score, Top 3 improvements, rewrite for headline + summary.
GUARDRAILS: Only real keywords. No photo comments. No specific connections.`,
    relatedStandards: [],
    relatedSfObjects: ['Contact'],
    hallucinationRisk: 'Medium',
    qualityScore: 68,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', career_goal: 'Salesforce Admin at a nonprofit', certifications: 'Salesforce Admin (in progress)' },
      simulatedOutput: 'Headline Score: 5/10 — "Project Coordinator | Program Manager" doesn\'t signal your Salesforce pivot.\nSummary Score: 4/10 — No mention of Salesforce, certification path, or nonprofit CRM focus.\nSkills Score: 6/10 — Missing: Salesforce, CRM, Declarative Automation, Process Builder.\n\nPriority Improvements:\n1. Rewrite headline: "Salesforce Admin (In Training) | Nonprofit CRM | Foundations Trail — Transition Trails"\n2. Open summary with your pivot story: why Salesforce, why now, what you\'re building toward.\n3. Add Trailhead to your Skills section and request endorsements from your coach.\n\nRewrite (Headline): "Salesforce Admin-in-Training | Nonprofit Program Ops | Expected Cert: Q3 2025"',
      simulationNotes: 'Penny reviewed pasted headline, summary, and skills sections. Applied SF Knowledge career role definitions. Output follows Feedback Report structure.',
    },
  },

  {
    id: 'pt-weekly-reflection',
    name: 'Weekly Reflection Check-In',
    domain: 'Coaching',
    capabilityId: 'cap-weekly-reviews',
    shortDescription: 'End-of-week structured reflection guiding learner through look-back, reflect, and look-ahead.',
    purpose: 'Guide a learner through the three-part weekly review: what they accomplished, what challenged them, and what they\'re committing to next week. Captures commitments for follow-through.',
    audience: ['Learners'],
    requiredVariables: ['var-learner-name','var-program-name','var-week-number','var-prior-commitments'],
    sourceRules: [
      { sourceId: 'src-curriculum-studio',    sourceName: 'Curriculum Studio',     role: 'Required',  reasoning: 'Sprint schedule and upcoming modules structure the "look ahead" section.' },
      { sourceId: 'src-assessments',           sourceName: 'SF Assessments',        role: 'Preferred', reasoning: 'Progress data grounds the "look back" in facts, not just self-report.' },
      { sourceId: 'src-standards-studio',      sourceName: 'Standards Studio',      role: 'Required',  reasoning: 'Reflection Prompt standard validates the structure and follow-up logic.' },
    ],
    outputFormatId: 'Reflection Prompt',
    tone: 'Curious, warm, non-judgmental. Hold space for honesty.',
    guardrails: [
      'Do not make the learner feel guilty about missed commitments',
      'If learner reports significant personal challenges, acknowledge and offer to route to coach',
      'Keep the commitment capture specific and achievable — no vague "work harder" commitments',
      'Maximum 3 reflection questions per session',
    ],
    owner: 'Penny Content Author',
    status: 'Approved',
    version: '2.1',
    lastReviewed: 'May 2025',
    promptBody: `You are Penny, facilitating a weekly reflection for a Transition Trails learner.
Learner: {{learner_name}} | Program: {{program_name}} | Week: {{week_number}}
Prior commitment: {{prior_commitments}}

PART 1 — Look back: Acknowledge what they did this week. Reference actual progress if available.
PART 2 — Reflect: One open question about a challenge or insight from the week.
PART 3 — Look ahead: Ask for ONE specific commitment for next week. Capture it.

RETRIEVE from: Curriculum Studio (upcoming module schedule) | Standards: Reflection Prompt standard
OUTPUT: Coaching Message format — 3 short paragraphs, one per part. End with commitment capture prompt.
GUARDRAILS: No guilt. No vague commitments. Max 3 questions.`,
    relatedStandards: ['std-reflection-prompt','std-penny-prompt'],
    relatedSfObjects: ['Program_Engagement__c'],
    hallucinationRisk: 'Low',
    qualityScore: 94,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', program_name: 'Foundations Trail', week_number: '4', prior_commitments: 'Finish Module 3 and submit the Sprint 2 practice scenario.' },
      simulatedOutput: 'End of Week 4, Jordan — you set out to finish Module 3 and submit your Sprint 2 practice scenario. Did you get both of those done, or did something get in the way? No judgment either way — I just want to start from where you actually are.\n\nLooking back at the week: what was the moment where something in the curriculum surprised you or clicked differently than you expected?\n\nHeading into Week 5, you\'re moving into Reports & Dashboards. What\'s ONE thing you want to commit to this week — specific enough that you\'d know by Friday if you did it or not?',
      simulationNotes: 'Three-part structure followed. Prior commitment referenced without guilt framing. Commitment prompt is specific and measurable. Output is Coaching Message format.',
    },
  },

  {
    id: 'pt-knowledge-retrieval',
    name: 'Knowledge Retrieval Answer',
    domain: 'Knowledge',
    capabilityId: 'cap-knowledge-retrieval',
    shortDescription: 'Cited, conversational answer to a Salesforce or program knowledge question.',
    purpose: 'Answer a learner or coach knowledge question by retrieving from approved sources in priority order. Always cite the source. Acknowledge when uncertain rather than fabricating.',
    audience: ['Learners', 'Coaches'],
    requiredVariables: ['var-current-module','var-knowledge-sources'],
    sourceRules: [
      { sourceId: 'src-sf-technology',        sourceName: 'SF Knowledge: Technology', role: 'Required',  reasoning: 'Primary source for all Salesforce platform questions — highest accuracy requirement.' },
      { sourceId: 'src-sf-mission-delivery',  sourceName: 'SF Knowledge: Mission',    role: 'Required',  reasoning: 'Primary for program model, career, and coaching questions.' },
      { sourceId: 'src-curriculum-studio',    sourceName: 'Curriculum Studio',         role: 'Preferred', reasoning: 'For questions about program structure and what\'s coming next.' },
      { sourceId: 'src-gdrive-source-docs',   sourceName: 'Source Doc Archive',        role: 'Optional',  reasoning: 'Fallback for edge-case technical questions not covered in SF Knowledge.' },
      { sourceId: 'src-sf-ops-business',      sourceName: 'SF Knowledge: Operations',  role: 'Forbidden', reasoning: 'Internal operations content must not be surfaced in learner-facing answers.' },
    ],
    outputFormatId: 'Knowledge Answer',
    tone: 'Clear, precise, helpful. Never condescending or falsely confident.',
    guardrails: [
      'If confidence is below threshold, say "I\'m not certain — let me flag this for your coach" instead of guessing',
      'Always cite source name and category',
      'If the question involves learner-specific data, redirect to coaching prompt not knowledge retrieval',
      'Never invent Salesforce feature names, limits, or version details',
    ],
    owner: 'Knowledge Lead',
    status: 'Approved',
    version: '1.5',
    lastReviewed: 'May 2025',
    promptBody: `You are Penny, answering a knowledge question for a Transition Trails learner.
Context: Module {{current_module}}
Question: [QUESTION]

RETRIEVE in priority order: SF Knowledge (Technology) → SF Knowledge (Mission) → Curriculum Studio → Source Docs
FORBIDDEN: SF Knowledge (Operations)
CONFIDENCE CHECK: If < 80% confident, do not answer — say: "I'm not certain on this one. Let me flag it for your coach."
OUTPUT: Knowledge Answer format — direct answer, explanation (2–3 sentences), source citation, offer to expand.
GUARDRAILS: Never invent features or limits. Always cite.`,
    relatedStandards: ['std-knowledge-article','std-penny-prompt'],
    relatedSfObjects: ['Knowledge__c'],
    hallucinationRisk: 'Low',
    qualityScore: 96,
    testBench: {
      sampleInputs: { current_module: 'Module 2: Object Model', question: 'What\'s the difference between a lookup relationship and a master-detail relationship in Salesforce?' },
      simulatedOutput: 'A lookup relationship is flexible — the child record can exist independently without its parent. A master-detail is tighter: the child requires the parent to exist, and deleting the parent deletes all its children.\n\nThe key practical difference: master-detail enables roll-up summary fields (count, sum, min, max) on the parent, which lookups don\'t support. Most admin configs start with lookups for flexibility and move to master-detail only when roll-ups are needed.\n\n[Source: SF Knowledge — Technology & Trail OS]\n\nWant me to walk through a specific scenario where you\'d choose one over the other?',
      simulationNotes: 'Retrieved from SF Knowledge (Technology). High-confidence answer. Source cited. Offer to expand included. No fabrication — uses standard Salesforce definitions.',
    },
  },

  {
    id: 'pt-cohort-summary',
    name: 'Weekly Cohort Summary',
    domain: 'Operations',
    capabilityId: 'cap-cohort-summaries',
    shortDescription: 'Weekly cohort health brief for coaches and program managers.',
    purpose: 'Generate a data-backed weekly cohort health summary. Highlights completion rates, engagement patterns, flagged learners, and recommended coach actions.',
    audience: ['Coaches', 'Program Managers'],
    requiredVariables: ['var-program-name','var-week-number','var-cohort-size','var-completion-rate','var-escalation-count'],
    sourceRules: [
      { sourceId: 'src-assessments',           sourceName: 'SF Assessments',        role: 'Required',  reasoning: 'Assessment data is the backbone of cohort health analysis.' },
      { sourceId: 'src-sf-mission-delivery',   sourceName: 'SF Knowledge: Mission', role: 'Required',  reasoning: 'Program health benchmarks define what on-pace vs behind looks like.' },
      { sourceId: 'src-coach-notes',           sourceName: 'Coach Notes',           role: 'Preferred', reasoning: 'Coach notes provide qualitative context to quantitative data.' },
      { sourceId: 'src-standards-studio',      sourceName: 'Standards Studio',      role: 'Required',  reasoning: 'Coach Notes standard validates format and required fields for the brief.' },
    ],
    outputFormatId: 'Cohort Brief',
    tone: 'Factual, action-oriented. For coaches, not learners.',
    guardrails: [
      'Anonymize or omit individual learner names in the summary — use identifiers if needed',
      'Do not share individual assessment scores in the group summary',
      'Flag escalations with urgency level — never bury critical signals',
      'Do not make clinical or diagnostic judgments about learner behavior',
    ],
    owner: 'Penny Product Lead',
    reviewRequestedBy: 'marcus.osei@transitiontrails.org',
    status: 'Review',
    version: '0.8',
    lastReviewed: 'April 2025',
    promptBody: `You are Penny, generating a weekly cohort brief for coaches.
Program: {{program_name}} | Week: {{week_number}} | Cohort size: {{cohort_size}}
Completion rate: {{completion_rate}}% | Active escalations: {{escalation_count}}

RETRIEVE from: SF Assessments (aggregate data only) | SF Knowledge: Mission (benchmarks) | Coach Notes (context)
VALIDATE against: Coach Notes standard (required sections)
OUTPUT: Cohort Brief — snapshot metrics, engagement indicators, flagged learner count + urgency, recommended actions.
GUARDRAILS: No individual names or scores in group summary. Flag escalations prominently.`,
    relatedStandards: ['std-coach-notes'],
    relatedSfObjects: ['Program_Engagement__c','Service_Schedule__c','Training_Plan_Item__c'],
    hallucinationRisk: 'Medium',
    qualityScore: 82,
    testBench: {
      sampleInputs: { program_name: 'Foundations Trail', week_number: '6', cohort_size: '18', completion_rate: '62', escalation_count: '2' },
      simulatedOutput: 'Foundations Trail — Week 6 Cohort Brief\n\nCompletion Snapshot: 62% on-pace (11/18), 28% behind 2+ modules (5/18), 11% ahead (2/18). Benchmark: 68% on-pace at Week 6.\n\nEngagement: Average Penny interaction rate this week: 74%. 3 learners have not opened any messages in 7+ days.\n\nFlagged: 2 active escalations. Urgency: High (1), Medium (1). Coach review needed before Thursday office hours.\n\nRecommended Actions:\n1. Direct outreach to 2 escalated learners before Thursday.\n2. Consider optional Module 4 study session for the 5 learners who are 2+ modules behind.\n3. Recognize the 2 ahead-of-pace learners — consider assigning a Trail Quest.',
      simulationNotes: 'Aggregate data only — no individual names. Escalations flagged with urgency. Recommended actions are specific. Cohort Brief format followed.',
    },
  },

  {
    id: 'pt-executive-brief',
    name: 'Executive Program Brief',
    domain: 'Operations',
    capabilityId: 'cap-executive-briefs',
    shortDescription: 'Monthly program health brief for leadership.',
    purpose: 'Generate a concise, data-backed executive brief for Transition Trails leadership. Covers completion rates, Penny engagement, escalation trends, and program trajectory.',
    audience: ['Executive Team', 'Program Managers'],
    requiredVariables: ['var-program-name','var-cohort-size','var-completion-rate','var-escalation-count'],
    sourceRules: [
      { sourceId: 'src-assessments',           sourceName: 'SF Assessments',        role: 'Required',  reasoning: 'Primary data source for all program health metrics.' },
      { sourceId: 'src-sf-mission-delivery',   sourceName: 'SF Knowledge: Mission', role: 'Required',  reasoning: 'Organizational benchmarks and program model context for leadership framing.' },
      { sourceId: 'src-penny-generated',       sourceName: 'Penny Outputs',         role: 'Optional',  reasoning: 'Penny engagement metrics from prior output logs if available.' },
    ],
    outputFormatId: 'Executive Summary',
    tone: 'Professional, data-backed, decisive. Leadership-facing. No fluff.',
    guardrails: [
      'Do not include individual learner names or personal data',
      'Round all metrics to whole numbers — no false precision',
      'Do not predict outcomes beyond the current data period',
      'Flag data quality issues clearly if source data is incomplete',
    ],
    owner: 'Penny Product Lead',
    status: 'Draft',
    version: '0.3',
    lastReviewed: 'March 2025',
    lastModifiedDate: '2026-07-29',
    promptBody: `You are Penny, generating a monthly executive brief for Transition Trails leadership.
Program: {{program_name}} | Cohort size: {{cohort_size}}
Completion: {{completion_rate}}% | Escalations: {{escalation_count}} active

RETRIEVE from: SF Assessments (aggregate) | SF Knowledge: Mission (benchmarks) | Penny engagement logs (if available)
OUTPUT: Executive Summary — key metrics, trend vs prior period, top 3 insights, recommended actions.
GUARDRAILS: No individual data. Whole numbers. No outcome predictions. Flag data gaps.`,
    relatedStandards: [],
    relatedSfObjects: ['Program__c','Service_Schedule__c','Program_Engagement__c'],
    hallucinationRisk: 'Medium',
    qualityScore: 75,
    testBench: {
      sampleInputs: { program_name: 'Foundations Trail', cohort_size: '18', completion_rate: '62', escalation_count: '2' },
      simulatedOutput: 'Foundations Trail — Executive Brief | June 2025\n\nCohort: 18 active learners | Week 6 of 16\nCompletion: 62% on-pace (↓6% vs Week 4 benchmark of 68%)\nEscalations: 2 active (1 High, 1 Medium) | Penny engagement: 74% weekly active\n\nKey Insights:\n1. Completion rate has trended below benchmark for 2 consecutive weeks — Module 4 is the sticking point.\n2. Penny engagement remains strong at 74%, suggesting learners are active but struggling with specific content.\n3. 2 escalations represent 11% of cohort — within normal range, but High urgency case needs resolution this week.\n\nRecommended Actions:\n• Schedule an optional Module 4 office hours session this week.\n• Coach team to resolve High urgency escalation before end of week.\n• Consider a curriculum review of Module 4 before the next cohort.',
      simulationNotes: 'Executive Summary format. No individual data. Trend analysis included. Data quality note would appear if source data were flagged incomplete.',
    },
  },

  {
    id: 'pt-study-coach',
    name: 'Study Coach Plan',
    domain: 'Learning',
    capabilityId: 'cap-study-coach',
    shortDescription: 'Personalised day-by-day study plan for the upcoming sprint period.',
    purpose: 'Generate a focused study plan for a learner who is behind pace, approaching an assessment, or has requested study guidance. Uses sprint schedule and performance data to prioritize.',
    audience: ['Learners'],
    requiredVariables: ['var-learner-name','var-current-module','var-sprint-number','var-assessment-scores','var-knowledge-sources'],
    sourceRules: [
      { sourceId: 'src-lms-modules',          sourceName: 'LMS Course Modules',      role: 'Required',  reasoning: 'Module content and sequence is the study plan scaffold.' },
      { sourceId: 'src-assessments',           sourceName: 'SF Assessments',          role: 'Required',  reasoning: 'Past scores identify which areas need the most study time.' },
      { sourceId: 'src-curriculum-studio',    sourceName: 'Curriculum Studio',        role: 'Required',  reasoning: 'Sprint schedule determines available time and upcoming deadlines.' },
      { sourceId: 'src-sf-technology',        sourceName: 'SF Knowledge: Technology', role: 'Optional',  reasoning: 'For recommending supplementary Salesforce resources on weak topics.' },
    ],
    outputFormatId: 'Study Plan',
    tone: 'Practical, encouraging, specific. No lecturing or overwhelm.',
    guardrails: [
      'Do not recommend more than 4 hours of study per day',
      'Acknowledge competing demands — ask if the schedule is realistic',
      'Do not share raw assessment scores — reference them in terms of topic focus only',
      'Always end with a check-in offer, not a deadline threat',
    ],
    owner: 'Penny Content Author',
    status: 'Approved',
    version: '1.1',
    lastReviewed: 'May 2025',
    promptBody: `You are Penny, building a personalised study plan for a Transition Trails learner.
Learner: {{learner_name}} | Module: {{current_module}} | Sprint: {{sprint_number}}
Performance context: {{assessment_scores}}

RETRIEVE from: LMS (current + next modules) | Curriculum Studio (sprint schedule) | SF Knowledge: Tech (supplement)
ASSESS: Is learner on pace, behind, or ahead? Adjust plan intensity accordingly.
OUTPUT: Study Plan — context, today's focus, day-by-day (3–5 days), resource recommendations, pacing alert if behind.
GUARDRAILS: Max 4 hrs/day. No score disclosure. Always end with check-in offer.`,
    relatedStandards: ['std-module','std-lesson'],
    relatedSfObjects: ['Training_Plan_Item__c','Program_Engagement__c'],
    hallucinationRisk: 'Low',
    qualityScore: 88,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', current_module: 'Module 3: Automation Tools', sprint_number: '2', assessment_scores: '{"Module 1": 88, "Module 2": 74}' },
      simulatedOutput: 'Jordan — based on your progress in Sprint 2, you\'re 1 module behind the pace needed to hit the assessment window on Friday. Module 2 showed some gaps in the automation area, so let\'s build that up this week.\n\nToday (Tuesday): Complete Module 3, Lesson 1–3. Focus: Process Builder basics. Est. 90 min.\nWednesday: Module 3, Lesson 4–6. Try the hands-on practice scenario after each lesson. Est. 2 hrs.\nThursday: Module 3 completion + review the 3 concepts from Module 2 you found hardest. Est. 90 min.\nFriday: Sprint 2 assessment window opens. You\'re ready.\n\nSupplementary resource: Trailhead — "Automate Business Processes" (45 min, recommended for Thursday evening).\n\nDoes this schedule feel realistic given your week? I can adjust if you\'ve got something big coming up.',
      simulationNotes: 'Penny identified behind-pace status and built a catch-up plan. No raw scores disclosed — topics referenced instead. Schedule is specific and achievable. Ends with realistic check.',
    },
  },

  {
    id: 'pt-reflection-prompt',
    name: 'Module Reflection Prompt',
    domain: 'Coaching',
    capabilityId: 'cap-reflection-prompts',
    shortDescription: 'Post-module reflection prompt with deepening follow-up logic.',
    purpose: 'Deliver the correct reflection prompt after a learner completes a module. Pull the authored prompt from Curriculum Studio, validate against the Reflection Prompt standard, then deliver.',
    audience: ['Learners'],
    requiredVariables: ['var-learner-name','var-current-module'],
    sourceRules: [
      { sourceId: 'src-curriculum-studio',    sourceName: 'Curriculum Studio',     role: 'Required',  reasoning: 'Reflection prompts are authored per module in Curriculum Studio — Penny does not invent them.' },
      { sourceId: 'src-standards-studio',     sourceName: 'Standards Studio',      role: 'Required',  reasoning: 'Reflection Prompt standard validates structure: deepening question + follow-up logic.' },
      { sourceId: 'src-lms-modules',          sourceName: 'LMS Course Modules',    role: 'Preferred', reasoning: 'Module content ensures the reflection is aligned to what was just completed.' },
    ],
    outputFormatId: 'Reflection Prompt',
    tone: 'Curious, warm, open-ended. No right or wrong answers.',
    guardrails: [
      'Use the authored Curriculum Studio prompt — do not invent a new one',
      'If no prompt is authored for this module, flag it as a Standards violation rather than generating ad-hoc',
      'Deliver the follow-up question based on the learner\'s response — do not deliver both at once',
      'Never evaluate or grade a reflection response',
    ],
    owner: 'Penny Content Author',
    status: 'Approved',
    version: '2.0',
    lastReviewed: 'May 2025',
    promptBody: `You are Penny, delivering a post-module reflection for {{learner_name}}.
Module just completed: {{current_module}}

RETRIEVE from: Curriculum Studio — fetch the authored reflection prompt for {{current_module}}
VALIDATE against: Reflection Prompt standard (deepening question + follow-up logic present)
IF no prompt found: do NOT invent one. Output: "[Standards Flag: No reflection prompt authored for {{current_module}}. Action required.]"
OUTPUT: Reflection Prompt format — completion ack + core question + follow-up logic (hold until response).
GUARDRAILS: No invented prompts. No grading. One question at a time.`,
    relatedStandards: ['std-reflection-prompt','std-penny-prompt'],
    relatedSfObjects: ['Training_Plan_Item__c','Program_Engagement__c'],
    hallucinationRisk: 'Low',
    qualityScore: 97,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', current_module: 'Module 3: Automation Tools' },
      simulatedOutput: 'You made it through the Automation Tools module, Jordan — that\'s one of the denser ones in Sprint 2.\n\n[Retrieved from Curriculum Studio — Module 3 Reflection Prompt]\nAutomation makes the biggest difference when it removes a task someone was doing manually and didn\'t realize could be systematised. Think about a process you\'ve seen in your own work — a data entry task, a follow-up email, a report someone ran every week. How would you design an automation for it now?\n\n[Follow-up logic: If learner describes a specific process → ask which Salesforce tool (Flow, Process Builder, Apex) they would use and why. If learner says they can\'t think of one → prompt with "What\'s the most repetitive task you remember from your last role?"]',
      simulationNotes: 'Penny fetched the authored prompt from Curriculum Studio. Standard validated (deepening question present, follow-up logic included). Did not invent content. Output marks the source explicitly.',
    },
  },

  {
    id: 'pt-escalation-alert',
    name: 'Escalation Alert to Coach',
    domain: 'Coaching',
    capabilityId: 'cap-escalations',
    shortDescription: 'Structured alert to coach when a learner triggers escalation thresholds.',
    purpose: 'Generate a structured, factual escalation alert to a coach when a learner\'s behavior patterns cross defined thresholds. Includes supporting data and recommended action. Never sent to the learner.',
    audience: ['Coaches'],
    requiredVariables: ['var-learner-name','var-program-name','var-assessment-scores','var-escalation-count','var-coach-notes'],
    sourceRules: [
      { sourceId: 'src-assessments',          sourceName: 'SF Assessments',        role: 'Required',  reasoning: 'Assessment data is the primary escalation signal source.' },
      { sourceId: 'src-coach-notes',          sourceName: 'Coach Notes',           role: 'Required',  reasoning: 'Coach Notes standard defines escalation trigger taxonomy.' },
      { sourceId: 'src-standards-studio',     sourceName: 'Standards Studio',      role: 'Required',  reasoning: 'Coach Notes standard validates the format and required fields for an escalation.' },
      { sourceId: 'src-lms-modules',          sourceName: 'LMS Course Modules',    role: 'Optional',  reasoning: 'Module context explains what content the learner was struggling with.' },
      { sourceId: 'src-sf-ops-business',      sourceName: 'SF Knowledge: Operations', role: 'Forbidden', reasoning: 'Internal business policies must not influence learner escalation framing.' },
    ],
    outputFormatId: 'Escalation Alert',
    tone: 'Clinical, factual. For coaches only. Not for learners.',
    guardrails: [
      'This output must NEVER be sent to the learner',
      'Do not make clinical diagnoses or emotional judgments about the learner',
      'Do not suggest the learner be removed from the program',
      'Urgency levels: High (requires coach action within 24h), Medium (within 72h), Low (next scheduled touch)',
      'Include only data Penny has observed — no assumptions',
    ],
    owner: 'Penny Product Lead',
    status: 'Approved',
    version: '1.2',
    lastReviewed: 'May 2025',
    promptBody: `[COACH-ONLY ALERT — DO NOT SEND TO LEARNER]
You are Penny, generating an escalation alert for a Transition Trails coach.
Learner: {{learner_name}} | Program: {{program_name}}
Assessment data: {{assessment_scores}} | Active escalations: {{escalation_count}}
Coach notes context: {{coach_notes}}

RETRIEVE from: SF Assessments | Coach Notes | Standards: Coach Notes (escalation taxonomy)
ASSESS: Which escalation threshold was crossed? What is the urgency level?
OUTPUT: Escalation Alert — learner + program, signal detected, supporting data, suggested action, urgency level.
GUARDRAILS: Coach-only. No diagnosis. No removal suggestion. Only observed data.`,
    relatedStandards: ['std-coach-notes','std-penny-prompt'],
    relatedSfObjects: ['Program_Engagement__c','Contact','Service_Attendance__c'],
    hallucinationRisk: 'Low',
    qualityScore: 93,
    testBench: {
      sampleInputs: { learner_name: 'Jordan Smith', program_name: 'Foundations Trail', assessment_scores: '{"Module 1": 88, "Module 2": 54}', escalation_count: '1', coach_notes: 'Jordan mentioned family stress in week 3 office hours. Has been slower to respond to Penny messages.' },
      simulatedOutput: '[COACH-ONLY — Escalation Alert]\n\nLearner: Jordan Smith | Program: Foundations Trail | Week 6\nSignal Detected: Assessment score below 60% threshold (Module 2: 54%) + reduced Penny engagement (last response: 4 days ago).\n\nSupporting Data:\n• Module 2 score: 54% (threshold: 60%)\n• Penny message response rate this week: 1 of 5 messages opened\n• Prior coach context: family stress noted at Week 3 office hours\n\nSuggested Action: Direct coach outreach within 24 hours. Do not use Penny messaging for this touchpoint — human contact is appropriate given prior stress context.\n\nUrgency: HIGH',
      simulationNotes: 'Coach-only output. Two escalation signals identified (score + disengagement). Prior coach context from coach notes surfaced appropriately. Urgency correctly classified as HIGH. No clinical language.',
    },
  },
];

// ── Version History ──────────────────────────────────────────────────────────

export const versionHistory: VersionEntry[] = [
  { id: 'v1', templateId: 'pt-learner-coaching',  version: '1.0', date: 'Jan 2025', author: 'Penny Product Lead',  changeType: 'Created',    summary: 'Initial coaching message prompt — basic context injection.',               breaking: false },
  { id: 'v2', templateId: 'pt-learner-coaching',  version: '1.1', date: 'Mar 2025', author: 'Penny Content Author', changeType: 'Updated',    summary: 'Added escalation flag conditional — coach notes injected only when flagged.', breaking: false },
  { id: 'v3', templateId: 'pt-learner-coaching',  version: '1.3', date: 'May 2025', author: 'Penny Product Lead',  changeType: 'Approved',   summary: 'Approved for production. Guardrail: score non-disclosure enforced.', breaking: false },
  { id: 'v4', templateId: 'pt-resume-review',     version: '0.4', date: 'Dec 2024', author: 'Career Services Lead', changeType: 'Created',    summary: 'Initial resume review template — basic feedback structure.',               breaking: false },
  { id: 'v5', templateId: 'pt-resume-review',     version: '0.9', date: 'Apr 2025', author: 'Career Services Lead', changeType: 'Updated',    summary: 'Added Feedback Report output format. Certification context injection. False-claim guardrail added.', breaking: true },
  { id: 'v6', templateId: 'pt-weekly-reflection', version: '1.0', date: 'Feb 2025', author: 'Penny Content Author', changeType: 'Created',    summary: 'Three-part weekly review — look back, reflect, look ahead.',               breaking: false },
  { id: 'v7', templateId: 'pt-weekly-reflection', version: '2.0', date: 'Apr 2025', author: 'Penny Content Author', changeType: 'Updated',    summary: 'Breaking: Commitment capture added as Part 3. Prior commitments variable added.', breaking: true },
  { id: 'v8', templateId: 'pt-weekly-reflection', version: '2.1', date: 'May 2025', author: 'Penny Product Lead',  changeType: 'Approved',   summary: 'Approved. Guardrail: no-guilt framing for missed commitments.', breaking: false },
  { id: 'v9', templateId: 'pt-knowledge-retrieval', version: '1.0', date: 'Jan 2025', author: 'Knowledge Lead',   changeType: 'Created',    summary: 'Initial knowledge Q&A with source citation.',                             breaking: false },
  { id: 'v10', templateId: 'pt-knowledge-retrieval', version: '1.5', date: 'May 2025', author: 'Knowledge Lead',  changeType: 'Approved',   summary: 'Approved. Added confidence threshold and forbidden source rules.',          breaking: false },
  { id: 'v11', templateId: 'pt-reflection-prompt', version: '1.0', date: 'Jan 2025', author: 'Penny Content Author', changeType: 'Created', summary: 'Basic reflection delivery — pulled from Curriculum Studio.',                breaking: false },
  { id: 'v12', templateId: 'pt-reflection-prompt', version: '2.0', date: 'May 2025', author: 'Penny Content Author', changeType: 'Approved', summary: 'Approved. No-invention guardrail: Standards Flag if prompt missing.',       breaking: false },
  { id: 'v13', templateId: 'pt-escalation-alert', version: '1.0', date: 'Mar 2025', author: 'Penny Product Lead',  changeType: 'Created',   summary: 'Coach-only escalation alert. Initial thresholds from Coach Notes standard.', breaking: false },
  { id: 'v14', templateId: 'pt-escalation-alert', version: '1.2', date: 'May 2025', author: 'Penny Product Lead',  changeType: 'Approved',  summary: 'Approved. Urgency classification (High/Medium/Low) added. Human-contact recommendation logic.', breaking: false },
  { id: 'v15', templateId: 'pt-cohort-summary',   version: '0.8', date: 'Apr 2025', author: 'Penny Product Lead',  changeType: 'Updated',   summary: 'Anonymization guardrail strengthened — no individual names in group summary.', breaking: false },
];

// ── Quality Reviews ─────────────────────────────────────────────────────────

export const qualityReviews: QualityReview[] = [
  { templateId: 'pt-learner-coaching',   sourceCoverage: 90, standardsAlignment: 95, hallucinationRisk: 'Low',    usefulnessScore: 92, reviewStatus: 'Approved', approvedBy: 'Curriculum Lead', approvedDate: 'May 2025',   openFlags: [] },
  { templateId: 'pt-resume-review',      sourceCoverage: 75, standardsAlignment: 70, hallucinationRisk: 'Medium', usefulnessScore: 85, reviewStatus: 'In Review', approvedBy: 'Pending',         approvedDate: '—',          openFlags: ['No standard defined for Career content — needs one before Approval', 'Hallucination risk: fabricated experience — add explicit guardrail test'] },
  { templateId: 'pt-linkedin-review',    sourceCoverage: 65, standardsAlignment: 60, hallucinationRisk: 'Medium', usefulnessScore: 78, reviewStatus: 'Pending',   approvedBy: 'Not assigned',    approvedDate: '—',          openFlags: ['Draft status — needs full source coverage review', 'No output format test completed yet'] },
  { templateId: 'pt-weekly-reflection',  sourceCoverage: 95, standardsAlignment: 98, hallucinationRisk: 'Low',    usefulnessScore: 94, reviewStatus: 'Approved', approvedBy: 'Curriculum Lead', approvedDate: 'May 2025',   openFlags: [] },
  { templateId: 'pt-knowledge-retrieval',sourceCoverage: 98, standardsAlignment: 97, hallucinationRisk: 'Low',    usefulnessScore: 96, reviewStatus: 'Approved', approvedBy: 'Knowledge Lead',  approvedDate: 'May 2025',   openFlags: [] },
  { templateId: 'pt-cohort-summary',     sourceCoverage: 80, standardsAlignment: 85, hallucinationRisk: 'Medium', usefulnessScore: 83, reviewStatus: 'In Review', approvedBy: 'Pending',         approvedDate: '—',          openFlags: ['Aggregate data source not yet live — manual data required', 'Test with real cohort data before production approval'] },
  { templateId: 'pt-executive-brief',    sourceCoverage: 70, standardsAlignment: 72, hallucinationRisk: 'Medium', usefulnessScore: 80, reviewStatus: 'Pending',   approvedBy: 'Not assigned',    approvedDate: '—',          openFlags: ['Draft — needs leadership review for appropriate framing', 'Data completeness risk: depends on manual data pulls'] },
  { templateId: 'pt-study-coach',        sourceCoverage: 88, standardsAlignment: 90, hallucinationRisk: 'Low',    usefulnessScore: 89, reviewStatus: 'Approved', approvedBy: 'Curriculum Lead', approvedDate: 'May 2025',   openFlags: [] },
  { templateId: 'pt-reflection-prompt',  sourceCoverage: 99, standardsAlignment: 100, hallucinationRisk: 'Low',   usefulnessScore: 97, reviewStatus: 'Approved', approvedBy: 'Curriculum Lead', approvedDate: 'May 2025',   openFlags: [] },
  { templateId: 'pt-escalation-alert',   sourceCoverage: 92, standardsAlignment: 95, hallucinationRisk: 'Low',    usefulnessScore: 94, reviewStatus: 'Approved', approvedBy: 'Penny Product Lead', approvedDate: 'May 2025', openFlags: [] },
];

// ── Summary ────────────────────────────────────────────────────────────────────

export const PROMPT_STUDIO_SUMMARY = {
  total:     promptTemplates.length,
  approved:  promptTemplates.filter(t => t.status === 'Approved').length,
  inReview:  promptTemplates.filter(t => t.status === 'Review').length,
  draft:     promptTemplates.filter(t => t.status === 'Draft').length,
  variables: promptVariables.length,
  formats:   outputFormats.length,
  byDomain:  Object.fromEntries(
    DOMAIN_ORDER.map(d => [d, promptTemplates.filter(t => t.domain === d).length])
  ) as Record<PromptDomain, number>,
};
