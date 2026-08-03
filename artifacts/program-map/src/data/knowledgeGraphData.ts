// ── Trail OS Knowledge Graph — Prototype Data ─────────────────────────────────
// Models the Salesforce Knowledge taxonomy and relationships between Programs,
// Roles, RESOLVE Phases, Trail OS Capabilities, Communication Channels,
// Penny Capabilities, Knowledge Topics, and Future Salesforce Objects.
// All data is prototype — relationships are architecture design, not live config.

// ── Node Types ────────────────────────────────────────────────────────────────

export type KGNodeType =
  | 'program'
  | 'role'
  | 'resolvePhase'
  | 'capability'
  | 'channel'
  | 'pennyCapability'
  | 'knowledgeTopic'
  | 'salesforceObject';

export type KGConfidence = 'confirmed' | 'prototype' | 'planned' | 'future';
export type KGStatus     = 'active' | 'planned' | 'future';

export interface KGNode {
  id: string;
  type: KGNodeType;
  label: string;
  sublabel?: string;
  purpose: string;
  sourceCategory: string;
  owner: string;
  confidence: KGConfidence;
  status: KGStatus;
  futureIntegrations: string[];
}

export interface KGEdge {
  id: string;
  from: string;   // KGNode id
  to: string;     // KGNode id
  relationship: string;
  confidence: KGConfidence;
}

export interface KGPath {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
  relationships: string[];
}

// ── Node Type Display Config ──────────────────────────────────────────────────

export const NODE_TYPE_CONFIG: Record<KGNodeType, {
  label: string;
  pluralLabel: string;
  chip: string;       // Tailwind classes for badge
  cardBorder: string;
  dotColor: string;
}> = {
  program: {
    label: 'Program',
    pluralLabel: 'Programs',
    chip: 'bg-primary/10 text-primary border-primary/20',
    cardBorder: 'border-primary/20 hover:border-primary/40',
    dotColor: 'bg-primary',
  },
  role: {
    label: 'Role',
    pluralLabel: 'Roles',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    cardBorder: 'border-amber-100 hover:border-amber-300',
    dotColor: 'bg-amber-500',
  },
  resolvePhase: {
    label: 'RESOLVE Phase',
    pluralLabel: 'RESOLVE',
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    cardBorder: 'border-violet-100 hover:border-violet-300',
    dotColor: 'bg-violet-500',
  },
  capability: {
    label: 'Trail OS Capability',
    pluralLabel: 'Capabilities',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    cardBorder: 'border-sky-100 hover:border-sky-300',
    dotColor: 'bg-sky-500',
  },
  channel: {
    label: 'Comm Channel',
    pluralLabel: 'Channels',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    cardBorder: 'border-emerald-100 hover:border-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  pennyCapability: {
    label: 'Penny Capability',
    pluralLabel: 'Penny',
    chip: 'bg-secondary/10 text-secondary border-secondary/20',
    cardBorder: 'border-secondary/20 hover:border-secondary/40',
    dotColor: 'bg-secondary',
  },
  knowledgeTopic: {
    label: 'Knowledge Topic',
    pluralLabel: 'Knowledge',
    chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    cardBorder: 'border-indigo-100 hover:border-indigo-300',
    dotColor: 'bg-indigo-500',
  },
  salesforceObject: {
    label: 'Salesforce Object',
    pluralLabel: 'Salesforce',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    cardBorder: 'border-slate-200 hover:border-slate-400',
    dotColor: 'bg-slate-500',
  },
};

export const CONFIDENCE_CONFIG: Record<KGConfidence, { label: string; cls: string }> = {
  confirmed: { label: 'Confirmed',  cls: 'text-green-700 bg-green-50 border-green-200' },
  prototype: { label: 'Prototype',  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  planned:   { label: 'Planned',    cls: 'text-primary bg-primary/5 border-primary/20' },
  future:    { label: 'Future',     cls: 'text-muted-foreground bg-muted/40 border-border' },
};

// ── Nodes ─────────────────────────────────────────────────────────────────────

export const kgNodes: KGNode[] = [

  // ── Programs ──
  {
    id: 'guided-trail',
    type: 'program',
    label: 'Guided Trail',
    purpose: 'Multi-sprint cohort program for adult career changers — combining Trail Quests, cohort coaching, Trail Wins, and Penny AI guidance across 12–16 weeks.',
    sourceCategory: 'Programs',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Program Object', 'Slack Cohort Channel (live)', 'Google Calendar Cohort Events'],
  },
  {
    id: 'digital-compass',
    type: 'program',
    label: 'Digital Compass',
    purpose: 'Employer partnership program placing learners on real workplace projects with nonprofit clients, employer partners, and Digital Compass sponsors.',
    sourceCategory: 'Programs',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Opportunity', 'Google Chat Client Space (live)', 'Google Calendar Client Events'],
  },
  {
    id: 'explorers-trail',
    type: 'program',
    label: "Explorer's Trail",
    purpose: 'No-barrier entry program for adults new to digital environments — subsidized, grant-funded, 4-week cohort with foundational digital literacy focus.',
    sourceCategory: 'Programs',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Contact (Learner)', 'Salesforce Opportunity (Enrollment)'],
  },
  {
    id: 'foundations-trail',
    type: 'program',
    label: 'Foundations Trail',
    purpose: 'Salesforce skills training and certification preparation program — prepares learners for Admin and Associate certifications in a structured cohort format.',
    sourceCategory: 'Programs',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Contact', 'Salesforce Knowledge (Cert Prep Articles)'],
  },
  {
    id: 'trail-of-mastery',
    type: 'program',
    label: 'Trail of Mastery',
    purpose: 'Advanced credential and specialization path for alumni of earlier programs — deepens Salesforce expertise and professional positioning.',
    sourceCategory: 'Programs',
    owner: 'Program Manager',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Contact', 'Salesforce Knowledge'],
  },

  // ── Roles ──
  {
    id: 'role-learner',
    type: 'role',
    label: 'Learner',
    purpose: 'Primary program participant — a career changer or job seeker progressing through a Transition Trails cohort, guided by Penny and supported by a coach.',
    sourceCategory: 'Roles',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Contact (Learner)', 'Slack DM (Penny nudges)', 'Google Calendar (cohort events)'],
  },
  {
    id: 'role-coach',
    type: 'role',
    label: 'Coach',
    purpose: 'Program facilitator providing weekly guidance, feedback, and accountability — receives Penny confidence alerts and facilitates Trail Talks and office hours.',
    sourceCategory: 'Roles',
    owner: 'Coach Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Contact (Coach)', 'Slack Coach Channel', 'Google Calendar (sessions)'],
  },
  {
    id: 'role-program-lead',
    type: 'role',
    label: 'Program Lead',
    purpose: 'Manages program design, delivery planning, employer relationships, and client engagement — primary owner of program configuration in Trail OS.',
    sourceCategory: 'Roles',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Custom Object', 'Google Chat Client Spaces'],
  },
  {
    id: 'role-exec-sponsor',
    type: 'role',
    label: 'Executive Sponsor',
    purpose: 'Organizational funder or strategic partner — provides financial backing, governance oversight, and program direction at the executive level.',
    sourceCategory: 'Roles',
    owner: 'Operations Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Contact', 'Google Chat Executive Sponsors Space'],
  },
  {
    id: 'role-ops-lead',
    type: 'role',
    label: 'Operations Lead',
    purpose: 'Manages Trail OS configuration, data quality, operational workflows, and demand management — primary steward of the operating platform.',
    sourceCategory: 'Roles',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Admin', 'Slack #trailos-ops'],
  },
  {
    id: 'role-penny-lead',
    type: 'role',
    label: 'Penny Lead',
    purpose: 'Oversees Penny AI quality, capability configuration, and AI response governance — primary owner of Penny knowledge sources and confidence thresholds.',
    sourceCategory: 'Roles',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge (admin)', 'Slack #penny-alerts'],
  },

  // ── RESOLVE Phases ──
  {
    id: 'resolve-recognize',
    type: 'resolvePhase',
    label: 'Recognize',
    sublabel: 'R',
    purpose: 'Identify the learner, client, or organizational need clearly before any solution is designed — the moment of seeing and naming the problem.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Case (intake trigger)', 'Demand Management integration'],
  },
  {
    id: 'resolve-explore',
    type: 'resolvePhase',
    label: 'Explore',
    sublabel: 'E',
    purpose: 'Map the current-state process and generate candidate solutions without committing to a build — the divergent phase.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Business Analyst',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Demand Management epics', 'Salesforce Opportunity'],
  },
  {
    id: 'resolve-select',
    type: 'resolvePhase',
    label: 'Select',
    sublabel: 'S',
    purpose: 'Commit to one solution with trade-offs documented and client sign-off recorded before any build begins.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Business Analyst',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge (solution docs)', 'Documentation capability'],
  },
  {
    id: 'resolve-outline',
    type: 'resolvePhase',
    label: 'Outline',
    sublabel: 'O',
    purpose: 'Decompose the chosen solution into blueprints, data models, and user stories using the epic/feature/story hierarchy with Given-When-Then acceptance criteria.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Business Analyst',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Google Calendar (cohort events)', 'Project Delivery capability'],
  },
  {
    id: 'resolve-launch',
    type: 'resolvePhase',
    label: 'Launch',
    sublabel: 'L',
    purpose: 'Deploy the configuration with a sandbox test, manual pilot, smoke test, and written fallback — managed as a process, not an event.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Technical Builder',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Slack cohort channels (live)', 'Penny confidence scoring (live)'],
  },
  {
    id: 'resolve-verify',
    type: 'resolvePhase',
    label: 'Verify',
    sublabel: 'V',
    purpose: 'Measure outcomes, validate completion, and assess program effectiveness against the success criteria defined in Select.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Outcomes (custom)', 'GA4 completion events'],
  },
  {
    id: 'resolve-evolve',
    type: 'resolvePhase',
    label: 'Evolve',
    sublabel: 'E',
    purpose: 'Establish governance, triage change requests, and feed what was learned back into a new Recognize cycle — the methodology is a cycle, not a line.',
    sourceCategory: 'RESOLVE Framework',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Demand Management (feature backlog)', 'Penny capability updates'],
  },

  // ── Trail OS Capabilities ──
  {
    id: 'cap-intake',
    type: 'capability',
    label: 'Intake Coordination',
    purpose: 'Manages program applications, assessments, and enrollment workflows — the entry point of the operational system that feeds all downstream capabilities.',
    sourceCategory: 'Trail OS',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Contact sync', 'Salesforce Case (intake)', 'Agentforce intake automation'],
  },
  {
    id: 'cap-delivery',
    type: 'capability',
    label: 'Project Delivery',
    purpose: 'Coordinates sprint cadences, milestone tracking, and facilitator assignments across program cohorts — the operational engine of live delivery.',
    sourceCategory: 'Trail OS',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Google Calendar (sprint events)', 'Slack cohort broadcasts', 'Salesforce Program Object'],
  },
  {
    id: 'cap-docs',
    type: 'capability',
    label: 'Knowledge Management',
    purpose: 'Central repository for blueprints, course canvases, source documents, and program artifacts — the knowledge foundation Penny draws from.',
    sourceCategory: 'Trail OS',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge Articles', 'Agentforce knowledge retrieval', 'Source document API'],
  },
  {
    id: 'cap-matching',
    type: 'capability',
    label: 'Learner-Client Matching',
    purpose: 'Matches learners to employer projects, client opportunities, and Digital Compass placements based on skills, program stage, and availability.',
    sourceCategory: 'Trail OS',
    owner: 'Program Manager',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Opportunity', 'Google Chat client coordination'],
  },
  {
    id: 'cap-visibility',
    type: 'capability',
    label: 'Coach Visibility',
    purpose: 'Provides coaches with learner progress data, Penny confidence scores, engagement signals, and session scheduling — the coach dashboard layer.',
    sourceCategory: 'Trail OS',
    owner: 'Coach Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Slack coach alerts (live)', 'Salesforce Contact (coach view)', 'Google Calendar sessions'],
  },
  {
    id: 'cap-outcomes',
    type: 'capability',
    label: 'Outcomes Tracking',
    purpose: 'Records completion, certification results, placement data, and cohort health metrics — the measurement layer that feeds leadership briefs.',
    sourceCategory: 'Trail OS',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Reports & Dashboards', 'GA4 outcomes events', 'Slack leadership digest'],
  },
  {
    id: 'cap-demand',
    type: 'capability',
    label: 'Demand Management',
    purpose: 'Manages intake cases, epics, features, stories, and the product roadmap — the work management layer connecting operational needs to Trail OS development.',
    sourceCategory: 'Trail OS',
    owner: 'Operations Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Cases API', 'Agentforce demand routing', 'Google Chat client updates'],
  },

  // ── Communication Channels ──
  {
    id: 'ch-cohort',
    type: 'channel',
    label: '#guided-trail-cohort',
    sublabel: 'Slack',
    purpose: 'Primary community channel for Guided Trail learners — Penny broadcasts, Trail Wins, Trail Quests, office hours announcements, and cohort engagement.',
    sourceCategory: 'Communications',
    owner: 'Program Manager',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Slack API (bot token)', 'Penny broadcast automation', 'Google Calendar event triggers'],
  },
  {
    id: 'ch-coaches',
    type: 'channel',
    label: '#guided-trail-coaches',
    sublabel: 'Slack',
    purpose: 'Private Slack channel for coaches — Penny confidence alerts, learner progress digests, coach weekly briefs, and session coordination.',
    sourceCategory: 'Communications',
    owner: 'Coach Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Slack API', 'Penny alert automation', 'Coach visibility integration'],
  },
  {
    id: 'ch-ops',
    type: 'channel',
    label: '#trailos-ops',
    sublabel: 'Slack',
    purpose: 'Internal ops channel — Trail OS system notifications, intake alerts, case escalations, automation health, and weekly ops briefs.',
    sourceCategory: 'Communications',
    owner: 'Operations Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Slack API', 'Salesforce Case escalation webhooks'],
  },
  {
    id: 'ch-digest',
    type: 'channel',
    label: '#leadership-digest',
    sublabel: 'Slack',
    purpose: 'Executive brief channel for the leadership team — receives the weekly executive brief from Penny covering all programs, learner health, and demand signals.',
    sourceCategory: 'Communications',
    owner: 'Operations Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Slack API', 'Penny brief generation', 'Google Calendar (brief schedule)'],
  },
  {
    id: 'ch-digital-compass',
    type: 'channel',
    label: 'Digital Compass Space',
    sublabel: 'Google Chat',
    purpose: 'Client-facing Google Chat Space for Digital Compass employer partners — project updates, UAT session prep, Penny learning summaries, and sprint notifications.',
    sourceCategory: 'Communications',
    owner: 'Program Manager',
    confidence: 'planned',
    status: 'planned',
    futureIntegrations: ['Google Chat API', 'Google Calendar client events', 'Penny client insights'],
  },
  {
    id: 'ch-exec',
    type: 'channel',
    label: 'Executive Sponsors Space',
    sublabel: 'Google Chat',
    purpose: 'Google Chat Space for executive sponsors and steering committees — strategic program briefs, high-level Penny insights, and governance updates.',
    sourceCategory: 'Communications',
    owner: 'Operations Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Google Chat API', 'Penny brief generation'],
  },

  // ── Penny Capabilities ──
  {
    id: 'penny-trail-guide',
    type: 'pennyCapability',
    label: 'Trail Guide',
    purpose: 'Personalized path advisor — maps learner goals to the right program sequence, content, and RESOLVE phase. The primary first-contact Penny capability.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge (path content)', 'Agentforce routing', 'Slack DM (path delivery)'],
  },
  {
    id: 'penny-learning-coach',
    type: 'pennyCapability',
    label: 'Learning Coach',
    purpose: 'Real-time coursework support — answers questions, surfaces knowledge resources, and checks comprehension during asynchronous program work.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge Articles', 'Agentforce knowledge retrieval'],
  },
  {
    id: 'penny-exam-coach',
    type: 'pennyCapability',
    label: 'Exam Coach',
    purpose: 'Pre-assessment and certification preparation with adaptive practice questions — improves Salesforce Admin and Associate cert pass rates.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge (cert content)', 'Outcomes Tracking (pass rate data)'],
  },
  {
    id: 'penny-build-companion',
    type: 'pennyCapability',
    label: 'Build Companion',
    purpose: 'Live project guidance during Digital Compass builds and sprint work — contextual help tied to the specific project and employer requirements.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Google Chat (project delivery)', 'Salesforce Knowledge (project docs)'],
  },
  {
    id: 'penny-quest-master',
    type: 'pennyCapability',
    label: 'Quest Master',
    purpose: 'Manages Trail Quest assignments, cohort prompts, deadline nudges, and completion recognition — the engagement layer of program delivery.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'active',
    futureIntegrations: ['Slack broadcasts (quest announcements)', 'Google Calendar (deadline tracking)'],
  },
  {
    id: 'penny-confidence',
    type: 'pennyCapability',
    label: 'Confidence Scorer',
    purpose: 'Tracks learner engagement signals, progress velocity, and dropout risk — generates confidence scores that trigger coach alerts and at-risk notifications.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'active',
    futureIntegrations: ['Salesforce Contact (confidence field)', 'Slack coach alerts', 'Agentforce at-risk routing'],
  },
  {
    id: 'penny-career-translator',
    type: 'pennyCapability',
    label: 'Career Translator',
    purpose: 'Translates learner skills, experiences, and program outcomes into employer-ready positioning — resume language, LinkedIn optimization, and interview framing.',
    sourceCategory: 'Penny',
    owner: 'Penny Lead',
    confidence: 'confirmed',
    status: 'active',
    futureIntegrations: ['Salesforce Knowledge (career content)', 'Trail of Mastery outcomes'],
  },

  // ── Knowledge Topics (Salesforce Knowledge taxonomy) ──
  {
    id: 'kt-career',
    type: 'knowledgeTopic',
    label: 'Career Planning & Goals',
    purpose: 'Knowledge domain covering self-assessment frameworks, goal-setting methodologies, and career path mapping — the foundation of Trail Guide responses.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge Articles', 'Agentforce knowledge retrieval', 'Trail Guide context'],
  },
  {
    id: 'kt-job-search',
    type: 'knowledgeTopic',
    label: 'Job Search Strategies',
    purpose: 'Knowledge domain for opportunity sourcing, networking techniques, application strategies, and recruiter relationships — feeds Penny job search coaching.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge Articles', 'Learning Coach context'],
  },
  {
    id: 'kt-resume',
    type: 'knowledgeTopic',
    label: 'Resume & Application Materials',
    purpose: 'Knowledge domain for resume writing, cover letter frameworks, portfolio guidance, and Salesforce-role-specific application materials.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge', 'Career Translator context'],
  },
  {
    id: 'kt-interview',
    type: 'knowledgeTopic',
    label: 'Interview Preparation',
    purpose: 'Knowledge domain for interview techniques, STAR method frameworks, technical interview prep, and salary negotiation — feeds Exam Coach and Career Translator.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge Articles', 'Exam Coach context'],
  },
  {
    id: 'kt-workplace',
    type: 'knowledgeTopic',
    label: 'Workplace Navigation',
    purpose: 'Knowledge domain for professional norms, workplace communication, conflict resolution, and organizational dynamics — particularly for first-role learners.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge', 'Quest Master (reflection quests)'],
  },
  {
    id: 'kt-project',
    type: 'knowledgeTopic',
    label: 'Project Management Fundamentals',
    purpose: 'Knowledge domain for sprint methodology, project planning, stakeholder communication, and delivery frameworks — core to Digital Compass and Guided Trail.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge', 'Build Companion context', 'Digital Compass delivery'],
  },
  {
    id: 'kt-digital',
    type: 'knowledgeTopic',
    label: 'Digital Literacy & Tools',
    purpose: 'Knowledge domain for core digital tools, Salesforce basics, productivity software, and workplace technology — foundational to Explorer\'s Trail and Foundations Trail.',
    sourceCategory: 'Knowledge Library',
    owner: 'Penny Lead',
    confidence: 'prototype',
    status: 'planned',
    futureIntegrations: ['Salesforce Knowledge', 'Exam Coach (Salesforce cert content)'],
  },

  // ── Future Salesforce Objects ──
  {
    id: 'sf-contact',
    type: 'salesforceObject',
    label: 'Contact (Learner)',
    purpose: 'Salesforce Contact record representing a learner — enrollment history, program stage, coach assignment, Penny confidence score, and outcome data.',
    sourceCategory: 'Salesforce',
    owner: 'Operations Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Trail OS sync', 'Penny confidence field', 'Agentforce learner routing'],
  },
  {
    id: 'sf-opportunity',
    type: 'salesforceObject',
    label: 'Enrollment Opportunity',
    purpose: 'Salesforce Opportunity tracking program enrollment, cohort assignment, completion stage, and placement outcome — the commercial record of the learner journey.',
    sourceCategory: 'Salesforce',
    owner: 'Operations Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Outcomes Tracking sync', 'Program Manager dashboard'],
  },
  {
    id: 'sf-case',
    type: 'salesforceObject',
    label: 'Support Case',
    purpose: 'Salesforce Case representing a learner support request, program issue, or operational escalation — managed through Demand Management in Trail OS.',
    sourceCategory: 'Salesforce',
    owner: 'Operations Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Demand Management integration', 'Slack ops alerts', 'Agentforce case routing'],
  },
  {
    id: 'sf-knowledge',
    type: 'salesforceObject',
    label: 'Knowledge Article',
    purpose: 'Salesforce Knowledge article — the atomic content unit in the knowledge taxonomy. Penny draws from articles to generate accurate, sourced responses.',
    sourceCategory: 'Salesforce',
    owner: 'Penny Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Knowledge Management sync', 'Agentforce knowledge retrieval', 'Penny confidence scoring'],
  },
  {
    id: 'sf-program',
    type: 'salesforceObject',
    label: 'Program Record',
    purpose: 'Custom Salesforce object for program configuration — cohort size, sprint structure, pricing, capacity, and Trail OS integration settings.',
    sourceCategory: 'Salesforce',
    owner: 'Operations Lead',
    confidence: 'future',
    status: 'future',
    futureIntegrations: ['Trail OS Program Map', 'Intake Coordination', 'Outcomes Tracking'],
  },
];

// ── Edges (Relationships) ─────────────────────────────────────────────────────

export const kgEdges: KGEdge[] = [
  // Program → Role
  { id: 'e01', from: 'guided-trail',    to: 'role-learner',      relationship: 'serves',       confidence: 'confirmed' },
  { id: 'e02', from: 'guided-trail',    to: 'role-coach',        relationship: 'employs',      confidence: 'confirmed' },
  { id: 'e03', from: 'guided-trail',    to: 'role-program-lead', relationship: 'managed by',   confidence: 'confirmed' },
  { id: 'e04', from: 'digital-compass', to: 'role-program-lead', relationship: 'led by',       confidence: 'confirmed' },
  { id: 'e05', from: 'digital-compass', to: 'role-exec-sponsor', relationship: 'funded by',    confidence: 'prototype' },
  { id: 'e06', from: 'digital-compass', to: 'role-learner',      relationship: 'serves',       confidence: 'confirmed' },
  { id: 'e07', from: 'explorers-trail', to: 'role-learner',      relationship: 'serves',       confidence: 'confirmed' },
  { id: 'e08', from: 'foundations-trail',to: 'role-learner',     relationship: 'serves',       confidence: 'confirmed' },

  // Program → RESOLVE Phase
  { id: 'e09', from: 'guided-trail',    to: 'resolve-select',     relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e10', from: 'guided-trail',    to: 'resolve-outline',  relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e11', from: 'guided-trail',    to: 'resolve-launch',  relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e12', from: 'guided-trail',    to: 'resolve-verify',    relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e13', from: 'digital-compass', to: 'resolve-recognize', relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e14', from: 'digital-compass', to: 'resolve-explore',  relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e15', from: 'digital-compass', to: 'resolve-outline',  relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e16', from: 'explorers-trail', to: 'resolve-recognize', relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e17', from: 'explorers-trail', to: 'resolve-explore',  relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e18', from: 'foundations-trail',to: 'resolve-select',    relationship: 'applies',      confidence: 'confirmed' },
  { id: 'e19', from: 'foundations-trail',to: 'resolve-verify',   relationship: 'applies',      confidence: 'confirmed' },

  // Role → RESOLVE Phase
  { id: 'e20', from: 'role-learner',      to: 'resolve-outline',  relationship: 'engages in',  confidence: 'confirmed' },
  { id: 'e21', from: 'role-learner',      to: 'resolve-launch',  relationship: 'engages in',  confidence: 'confirmed' },
  { id: 'e22', from: 'role-coach',        to: 'resolve-verify',    relationship: 'facilitates', confidence: 'confirmed' },
  { id: 'e23', from: 'role-coach',        to: 'resolve-launch',  relationship: 'supports',    confidence: 'confirmed' },
  { id: 'e24', from: 'role-program-lead', to: 'resolve-recognize', relationship: 'leads',       confidence: 'confirmed' },
  { id: 'e25', from: 'role-program-lead', to: 'resolve-explore',  relationship: 'leads',       confidence: 'confirmed' },
  { id: 'e26', from: 'role-ops-lead',     to: 'resolve-outline',  relationship: 'manages',     confidence: 'confirmed' },
  { id: 'e27', from: 'role-ops-lead',     to: 'resolve-verify',    relationship: 'oversees',    confidence: 'confirmed' },
  { id: 'e28', from: 'role-ops-lead',     to: 'resolve-evolve',    relationship: 'drives',      confidence: 'prototype' },

  // RESOLVE Phase → Trail OS Capability
  { id: 'e29', from: 'resolve-recognize', to: 'cap-intake',    relationship: 'triggers',       confidence: 'confirmed' },
  { id: 'e30', from: 'resolve-explore',  to: 'cap-demand',    relationship: 'informs',        confidence: 'confirmed' },
  { id: 'e31', from: 'resolve-select',     to: 'cap-docs',      relationship: 'produces',       confidence: 'confirmed' },
  { id: 'e32', from: 'resolve-outline',  to: 'cap-delivery',  relationship: 'requires',       confidence: 'confirmed' },
  { id: 'e33', from: 'resolve-launch',  to: 'cap-matching',  relationship: 'activates',      confidence: 'confirmed' },
  { id: 'e34', from: 'resolve-launch',  to: 'cap-visibility',relationship: 'requires',       confidence: 'confirmed' },
  { id: 'e35', from: 'resolve-verify',    to: 'cap-outcomes',  relationship: 'measured by',    confidence: 'confirmed' },
  { id: 'e36', from: 'resolve-evolve',    to: 'cap-demand',    relationship: 'feeds into',     confidence: 'prototype' },

  // Trail OS Capability → Communication Channel
  { id: 'e37', from: 'cap-delivery',   to: 'ch-cohort',        relationship: 'broadcasts via', confidence: 'prototype' },
  { id: 'e38', from: 'cap-outcomes',   to: 'ch-digest',        relationship: 'reports to',     confidence: 'prototype' },
  { id: 'e39', from: 'cap-outcomes',   to: 'ch-exec',          relationship: 'reports to',     confidence: 'future'    },
  { id: 'e40', from: 'cap-intake',     to: 'ch-ops',           relationship: 'alerts via',     confidence: 'prototype' },
  { id: 'e41', from: 'cap-demand',     to: 'ch-digital-compass', relationship: 'updates via',  confidence: 'planned'   },
  { id: 'e42', from: 'cap-visibility', to: 'ch-coaches',       relationship: 'alerts via',     confidence: 'prototype' },
  { id: 'e43', from: 'cap-matching',   to: 'ch-digital-compass', relationship: 'coordinates via', confidence: 'planned' },

  // Program → Penny Capability
  { id: 'e44', from: 'guided-trail',    to: 'penny-build-companion', relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e45', from: 'guided-trail',    to: 'penny-quest-master',    relationship: 'uses',     confidence: 'prototype' },
  { id: 'e46', from: 'guided-trail',    to: 'penny-confidence',      relationship: 'uses',     confidence: 'prototype' },
  { id: 'e47', from: 'guided-trail',    to: 'penny-career-translator', relationship: 'uses',   confidence: 'confirmed' },
  { id: 'e48', from: 'digital-compass', to: 'penny-trail-guide',     relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e49', from: 'digital-compass', to: 'penny-learning-coach',  relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e50', from: 'digital-compass', to: 'penny-build-companion', relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e51', from: 'explorers-trail', to: 'penny-trail-guide',     relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e52', from: 'explorers-trail', to: 'penny-learning-coach',  relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e53', from: 'foundations-trail',to: 'penny-exam-coach',     relationship: 'uses',     confidence: 'confirmed' },
  { id: 'e54', from: 'foundations-trail',to: 'penny-learning-coach', relationship: 'uses',     confidence: 'confirmed' },

  // Penny Capability → Knowledge Topic
  { id: 'e55', from: 'penny-trail-guide',      to: 'kt-career',     relationship: 'draws from', confidence: 'prototype' },
  { id: 'e56', from: 'penny-learning-coach',   to: 'kt-job-search', relationship: 'draws from', confidence: 'prototype' },
  { id: 'e57', from: 'penny-learning-coach',   to: 'kt-resume',     relationship: 'draws from', confidence: 'prototype' },
  { id: 'e58', from: 'penny-build-companion',  to: 'kt-project',    relationship: 'draws from', confidence: 'prototype' },
  { id: 'e59', from: 'penny-exam-coach',       to: 'kt-digital',    relationship: 'draws from', confidence: 'prototype' },
  { id: 'e60', from: 'penny-quest-master',     to: 'kt-workplace',  relationship: 'draws from', confidence: 'prototype' },
  { id: 'e61', from: 'penny-confidence',       to: 'kt-interview',  relationship: 'draws from', confidence: 'prototype' },
  { id: 'e62', from: 'penny-career-translator',to: 'kt-resume',     relationship: 'draws from', confidence: 'prototype' },
  { id: 'e63', from: 'penny-career-translator',to: 'kt-career',     relationship: 'draws from', confidence: 'prototype' },

  // Trail OS Capability → Salesforce Object
  { id: 'e64', from: 'cap-intake',    to: 'sf-contact',    relationship: 'syncs to',     confidence: 'future' },
  { id: 'e65', from: 'cap-demand',    to: 'sf-case',       relationship: 'maps to',      confidence: 'future' },
  { id: 'e66', from: 'cap-outcomes',  to: 'sf-opportunity',relationship: 'tracks via',   confidence: 'future' },
  { id: 'e67', from: 'cap-docs',      to: 'sf-knowledge',  relationship: 'sources from', confidence: 'future' },
  { id: 'e68', from: 'cap-delivery',  to: 'sf-program',    relationship: 'configures',   confidence: 'future' },

  // Penny Capability → Salesforce Object
  { id: 'e69', from: 'penny-confidence',   to: 'sf-contact',   relationship: 'writes score to', confidence: 'future' },
  { id: 'e70', from: 'penny-trail-guide',  to: 'sf-knowledge', relationship: 'queries',         confidence: 'future' },
  { id: 'e71', from: 'penny-exam-coach',   to: 'sf-knowledge', relationship: 'queries',         confidence: 'future' },
  { id: 'e72', from: 'penny-learning-coach',to: 'sf-knowledge',relationship: 'queries',         confidence: 'future' },
];

// ── Pre-built Relationship Paths ──────────────────────────────────────────────

export const kgPaths: KGPath[] = [
  {
    id: 'path-learner-delivery',
    name: 'Learner Delivery Path',
    description: 'How a Guided Trail learner moves through the RESOLVE framework, delivery infrastructure, and Penny coaching — from program enrollment to knowledge application.',
    nodeIds: ['guided-trail', 'role-learner', 'resolve-outline', 'cap-delivery', 'ch-cohort', 'penny-quest-master', 'kt-workplace'],
    relationships: ['serves', 'engages in', 'requires', 'broadcasts via', 'managed by', 'draws from'],
  },
  {
    id: 'path-coach-verification',
    name: 'Coach Verification Path',
    description: 'How a Guided Trail coach facilitates the Verify phase through Trail OS outcomes tracking and Penny intelligence — feeding the leadership brief.',
    nodeIds: ['guided-trail', 'role-coach', 'resolve-verify', 'cap-outcomes', 'ch-digest', 'penny-confidence'],
    relationships: ['employs', 'facilitates', 'measured by', 'reports to', 'generates signals for'],
  },
  {
    id: 'path-digital-compass-client',
    name: 'Digital Compass Client Path',
    description: 'How the Digital Compass program lead drives the Recognize phase through Demand Management and connects employer partners via Google Chat.',
    nodeIds: ['digital-compass', 'role-program-lead', 'resolve-recognize', 'cap-demand', 'ch-digital-compass', 'sf-case'],
    relationships: ['led by', 'leads', 'informs', 'updates via', 'maps to'],
  },
  {
    id: 'path-knowledge-to-penny',
    name: 'Knowledge → Penny Path',
    description: 'How Salesforce Knowledge articles flow through the knowledge management capability into Penny capabilities and learner responses.',
    nodeIds: ['sf-knowledge', 'cap-docs', 'penny-learning-coach', 'kt-job-search', 'role-learner'],
    relationships: ['sources from', 'powers', 'draws from', 'guides'],
  },
];

// ── Helper: get neighbors for a node ─────────────────────────────────────────

export function getNodeNeighbors(nodeId: string): Array<{
  node: KGNode;
  relationship: string;
  direction: 'out' | 'in';
}> {
  const results: Array<{ node: KGNode; relationship: string; direction: 'out' | 'in' }> = [];

  for (const edge of kgEdges) {
    if (edge.from === nodeId) {
      const target = kgNodes.find(n => n.id === edge.to);
      if (target) results.push({ node: target, relationship: edge.relationship, direction: 'out' });
    } else if (edge.to === nodeId) {
      const source = kgNodes.find(n => n.id === edge.from);
      if (source) results.push({ node: source, relationship: edge.relationship, direction: 'in' });
    }
  }

  return results;
}
