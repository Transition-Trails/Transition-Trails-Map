/**
 * knowledgeCorpus.ts — static in-memory knowledge base for Penny RAG retrieval.
 * Three source types: drive-doc, salesforce-kb, curriculum.
 * Mirrors the 14 source documents in the frontend + Salesforce KB articles + curriculum entries.
 */

export type SourceType = 'drive-doc' | 'salesforce-kb' | 'curriculum';
export type ConfidenceLevel = 'confirmed' | 'needs-review' | 'draft';

export interface KnowledgeChunk {
  id: string;
  name: string;
  category: string;
  sourceType: SourceType;
  status: 'Active' | 'Draft';
  confidence: ConfidenceLevel;
  programs: string[];
  /** One-sentence answer to "what is this?" */
  quickTake: string;
  /** Searchable text blob — all key content concatenated for scoring */
  searchText: string;
  /** Short snippet shown in the Sources section */
  snippet: string;
  driveUrl?: string;
}

// ── Drive documents (mirrored from frontend sourceDocuments.ts) ───────────────

const DRIVE_DOCS: KnowledgeChunk[] = [
  {
    id: 'doc-1',
    name: 'Brand Book',
    category: 'Brand',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'Governs all visual identity, voice, tone, and design for Transition Trails.',
    snippet: 'Defines Transition Trails\' visual identity, voice, tone, and design system. Authoritative reference for any communication design — logo usage, color palette, typography, and brand voice.',
    searchText: 'brand book visual identity voice tone design logo color typography brand story brand consistency communications materials programs authorized',
  },
  {
    id: 'doc-2',
    name: 'Master Program Overview',
    category: 'Strategy',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'Start here for the full Transition Trails program ecosystem at a glance.',
    snippet: 'High-level strategic overview of all Transition Trails programs: their relationships, sequencing, and organizational purpose. Go-to for program scope, positioning, and strategic intent.',
    searchText: 'program overview strategy all programs ecosystem sequencing relationships audience funder stakeholder entry point positioning master overview strategic program map portfolio',
  },
  {
    id: 'doc-3',
    name: "Explorer's Trail Blueprint",
    category: 'Program',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Explorer's Trail"],
    quickTake: "Single source of truth for Explorer's Trail curriculum and delivery.",
    snippet: "Comprehensive design document for Explorer's Trail — learning objectives, session structure, delivery format, and facilitator guidance for this entry-level cohort program.",
    searchText: "explorer trail blueprint program curriculum session learning objectives facilitator delivery entry level cohort eligibility duration structure schedule",
  },
  {
    id: 'doc-4',
    name: "Foundations Trail Blueprint",
    category: 'Program',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Foundations Trail"],
    quickTake: "Source of truth for Foundations Trail curriculum — Salesforce modules, professional presence, hybrid delivery.",
    snippet: "Complete reference for Foundations Trail: technical curriculum, Salesforce module structure, professional presence training, and hybrid delivery. Defines prerequisites, assessment design, and learning sequence.",
    searchText: "foundations trail blueprint curriculum salesforce module professional presence hybrid delivery technical prerequisites assessment learning sequence cohort",
  },
  {
    id: 'doc-5',
    name: "Guided Trail Blueprint",
    category: 'Program',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Guided Trail"],
    quickTake: "Most important program document for Guided Trail facilitators — all four sprint modules defined here.",
    snippet: "Definitive reference for Guided Trail — the flagship 12-week sprint-based program. Covers all four sprint modules, project expectations, facilitator roles, learner milestones, and portfolio requirements.",
    searchText: "guided trail blueprint sprint module 12 week flagship project portfolio facilitator milestones assessment curriculum learning objectives sprint cadence sprint structure",
  },
  {
    id: 'doc-6',
    name: "Trail of Mastery Proposal",
    category: 'Program',
    sourceType: 'drive-doc',
    status: 'Draft',
    confidence: 'draft',
    programs: ["Trail of Mastery"],
    quickTake: "Early-stage proposal for an advanced program — not confirmed curriculum, treat details as indicative.",
    snippet: "Early-stage proposal outlining the vision, intended audience, and strategic rationale for a Trail of Mastery advanced program. Details are indicative, not authoritative.",
    searchText: "trail mastery advanced program proposal vision audience strategic rationale open questions draft not confirmed",
  },
  {
    id: 'doc-7',
    name: "Digital Compass Blueprint",
    category: 'Program',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Digital Compass"],
    quickTake: "Operational reference for the Digital Compass nonprofit client program.",
    snippet: "Design and delivery reference for Digital Compass — the nonprofit client program. Covers organizational engagement model, curriculum for nonprofit digital transformation, and client partnership expectations.",
    searchText: "digital compass nonprofit client program delivery engagement curriculum partnership grant reporting digital transformation organization",
  },
  {
    id: 'doc-8',
    name: "Pricing Analysis",
    category: 'Finance',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: "The only authoritative source for program pricing — do not cite figures from any other document.",
    snippet: "Internal financial analysis covering program pricing models, cost structures, grant-funding assumptions, and pricing strategy. All pricing figures must be sourced from this document.",
    searchText: "pricing analysis cost price scholarship subsidy grant funding employer sponsor financial revenue model all programs pricing figures cost assumptions",
  },
  {
    id: 'doc-9',
    name: "Program Comparison Sheet",
    category: 'Strategy',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: "Side-by-side matrix of all programs — audience, prerequisites, format, duration, and outcomes.",
    snippet: "Comparison matrix across all Transition Trails programs: audience, prerequisites, format, duration, outcomes, and positioning. Use for stakeholder conversations and learner guidance.",
    searchText: "program comparison matrix all programs audience prerequisites format duration outcomes positioning ecosystem stakeholder learner guidance funder",
  },
  {
    id: 'doc-10',
    name: "Trail Guide Framework",
    category: 'Curriculum',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Guided Trail", "Trail of Mastery"],
    quickTake: "The pedagogical and coaching philosophy behind how Trail Guide (Penny) and facilitators support learners.",
    snippet: "Defines the Trail Guide pedagogical framework — coaching and mentorship philosophy underpinning how facilitators and Penny's Trail Guide capability support learner progression.",
    searchText: "trail guide framework pedagogy coaching mentorship philosophy facilitator penny ai learner guidance principles progression support",
  },
  {
    id: 'doc-11',
    name: "RESOLVE Course Canvas",
    category: 'Curriculum',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Guided Trail"],
    quickTake: "How RESOLVE is taught in Guided Trail — not a description of RESOLVE as an operational framework.",
    snippet: "Course canvas for the RESOLVE module in Guided Trail. Defines how Recognize, Explore, Select, Outline, Launch, Verify, Evolve is taught as a curriculum unit — learning objectives, activities, and assessments.",
    searchText: "RESOLVE course canvas recognize explore select outline launch verify evolve framework curriculum module guided trail learning objectives assessment activities phases instructional design",
  },
  {
    id: 'doc-12',
    name: "Guided Trail Sprint Cadence",
    category: 'Operations',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Guided Trail"],
    quickTake: "Week-by-week delivery schedule for all four Guided Trail sprints.",
    snippet: "Week-by-week operational schedule for Guided Trail's four sprints. Defines session timing, milestone check-ins, project deadlines, and facilitator coordination points.",
    searchText: "guided trail sprint cadence schedule week session milestone deadline facilitator coordination calendar sprint 1 2 3 4 delivery operational",
  },
  {
    id: 'doc-13',
    name: "Facilitator Guide",
    category: 'Operations',
    sourceType: 'drive-doc',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Explorer's Trail", "Foundations Trail"],
    quickTake: "The facilitator's handbook for Explorer's Trail and Foundations Trail delivery.",
    snippet: "Practical facilitation reference for Explorer's Trail and Foundations Trail. Session setup, facilitation techniques, learner engagement strategies, troubleshooting, and logistics.",
    searchText: "facilitator guide handbook explorers trail foundations trail session setup techniques learner engagement troubleshooting logistics practical delivery",
  },
  {
    id: 'doc-14',
    name: "Intern Workbook",
    category: 'HR',
    sourceType: 'drive-doc',
    status: 'Draft',
    confidence: 'draft',
    programs: ["Guided Trail"],
    quickTake: "Draft intern orientation workbook for Guided Trail — contents subject to change.",
    snippet: "Draft workbook for intern participants in Guided Trail. Covers intern-specific orientation, role expectations, project contributions, and reflective practice exercises.",
    searchText: "intern workbook guided trail orientation expectations project contribution reflection draft hr guided trail intern participants",
  },
];

// ── Salesforce KB articles ────────────────────────────────────────────────────

const SF_KB: KnowledgeChunk[] = [
  {
    id: 'sfkb-1',
    name: 'Program & Cohort Objects — Data Model',
    category: 'Salesforce',
    sourceType: 'salesforce-kb',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'NPSP + PMM data model: Program, Cohort, Service Delivery, Contact relationships.',
    snippet: 'Trail OS uses Salesforce NPSP + Program Management Module (PMM). Core objects: Program__c, Cohort__c, Service_Delivery__c, Contact (Learner). Cohorts link to Programs; Service Deliveries track individual learner attendance and milestone completion.',
    searchText: 'salesforce program cohort service delivery contact learner NPSP PMM data model object relationship field schema custom object',
  },
  {
    id: 'sfkb-2',
    name: 'Health Score Calculation — Operations',
    category: 'Salesforce',
    sourceType: 'salesforce-kb',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'How program health scores are computed from Salesforce cohort and learner data.',
    snippet: 'Program health scores (0–100) combine enrollment rate, attendance rate, milestone completion rate, and coaching interaction frequency. Weighted average: enrollment 25%, attendance 35%, milestones 30%, coaching 10%. Scores <60 flag red; 60–79 amber; 80+ green.',
    searchText: 'health score program cohort enrollment attendance milestone coaching calculation salesforce operations indicator metric weighted average red amber green',
  },
  {
    id: 'sfkb-3',
    name: 'Opportunity & Pipeline — Demand Intake',
    category: 'Salesforce',
    sourceType: 'salesforce-kb',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'How demand intake cases and change requests map to Salesforce Opportunity records.',
    snippet: 'Demand intake cases in Trail OS map to Salesforce Opportunity records. Stage field tracks: Intake → Triaged → Scoped → Approved → In Progress → Complete. Change requests link to a parent Opportunity as child Opportunity records with Type = Change Request.',
    searchText: 'opportunity pipeline demand intake case change request salesforce stage intake triaged scoped approved in progress complete triage',
  },
  {
    id: 'sfkb-4',
    name: 'Salesforce Validation — Common Errors',
    category: 'Salesforce',
    sourceType: 'salesforce-kb',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'Common Salesforce validation errors and how to resolve them in Trail OS.',
    snippet: 'Common SF validation errors: FIELD_CUSTOM_VALIDATION_EXCEPTION (check required fields on Program or Cohort), DUPLICATE_VALUE (learner Contact already exists — merge records), INSUFFICIENT_ACCESS (check Connected App permissions), INVALID_CROSS_REFERENCE_KEY (parent record deleted — relink).',
    searchText: 'salesforce validation error field custom exception duplicate value insufficient access invalid cross reference resolve connected app permissions program cohort',
  },
];

// ── Curriculum data entries ───────────────────────────────────────────────────

const CURRICULUM: KnowledgeChunk[] = [
  {
    id: 'cur-1',
    name: 'RESOLVE Framework — Phase Definitions',
    category: 'Curriculum',
    sourceType: 'curriculum',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['Guided Trail'],
    quickTake: 'The 7-phase RESOLVE operational framework used across program management and learner journey tracking.',
    snippet: 'RESOLVE: Recognize (identify need/opportunity), Explore (research options), Select (choose path), Outline (plan delivery), Launch (begin execution), Verify (check progress and quality), Evolve (refine and scale). Used in demand management, learner journeys, and program delivery.',
    searchText: 'RESOLVE phase recognize explore select outline launch verify evolve framework operational program management learner journey demand management delivery 7 phases',
  },
  {
    id: 'cur-2',
    name: 'Trail Quest Structure',
    category: 'Curriculum',
    sourceType: 'curriculum',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Explorer's Trail", "Foundations Trail", "Guided Trail"],
    quickTake: 'Trail Quests are structured milestone tasks learners complete to demonstrate competency.',
    snippet: 'Trail Quests are structured milestone tasks assigned to learners at set points in each program. Each Quest has: objective, deliverable, success criteria, and review process. Penny can generate, review, and grade Trail Quest submissions when enabled.',
    searchText: 'trail quest milestone task learner competency objective deliverable success criteria review grade penny assessment structured',
  },
  {
    id: 'cur-3',
    name: 'Learner Tiers & Access Levels',
    category: 'Curriculum',
    sourceType: 'curriculum',
    status: 'Active',
    confidence: 'confirmed',
    programs: ['All'],
    quickTake: 'How Trail OS access levels map to learner roles and program stage.',
    snippet: 'Trail OS user tiers: Everyday User (active learner, trail-focused), Power User (advanced Penny access, analytics), Admin (program and knowledge management), Super Admin (integration config, user role assignment). Tier is set in Salesforce Contact and synced to Trail OS.',
    searchText: 'learner tier access level everyday user power user admin super admin trail os salesforce contact role program stage pennny capabilities',
  },
  {
    id: 'cur-4',
    name: 'Capstone Milestones — Completion Criteria',
    category: 'Curriculum',
    sourceType: 'curriculum',
    status: 'Active',
    confidence: 'confirmed',
    programs: ["Guided Trail", "Foundations Trail"],
    quickTake: 'Capstone criteria define what learners must deliver to complete a program.',
    snippet: 'Capstone milestones mark program completion. Foundations Trail: completed Salesforce admin certification mock + professional presence assessment. Guided Trail: portfolio of 4 sprint projects + RESOLVE case study + Trail Quest review. Penny evaluates submissions and flags gaps.',
    searchText: 'capstone milestone completion criteria foundations trail guided trail salesforce certification professional presence portfolio sprint project RESOLVE case study penny evaluation',
  },
];

// ── Combined corpus ───────────────────────────────────────────────────────────

export const KNOWLEDGE_CORPUS: KnowledgeChunk[] = [
  ...DRIVE_DOCS,
  ...SF_KB,
  ...CURRICULUM,
];

// ── Tier-based access filter ──────────────────────────────────────────────────

const EVERYDAY_ALLOWED_CATEGORIES = new Set([
  'Program', 'Curriculum', 'Operations', 'Strategy', 'Brand', 'Salesforce',
]);

export function filterByTier(chunks: KnowledgeChunk[], tier?: string): KnowledgeChunk[] {
  if (tier === 'superadmin' || tier === 'admin') {
    return chunks; // all docs including Draft
  }
  const active = chunks.filter(c => c.status === 'Active');
  if (tier === 'everyday') {
    return active.filter(c => EVERYDAY_ALLOWED_CATEGORIES.has(c.category));
  }
  return active; // poweruser: all Active
}
