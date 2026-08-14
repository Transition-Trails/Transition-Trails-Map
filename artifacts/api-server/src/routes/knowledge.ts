import { Router } from "express";
import { db } from "@workspace/db";
import { knowledgeDocumentsTable, knowledgeSourcesTable, articleReviewsTable, knowledgeArticlesTable, sfSyncSettingsTable, articleProcedureStepsTable, articleRelationshipsTable } from "@workspace/db/schema";
import { eq, desc, asc, inArray, or, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getSyncJobStatus, recordManualSync } from "../lib/sfArticleSyncJob.js";
import {
  fetchSfLiveMetrics,
  buildIntegrationStatus,
  SOURCE_INTEGRATION_MAP,
  filterStaleHealthIssues,
} from "../lib/integrationHealth.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";
import { requireAdmin, requireStaff } from "../middlewares/requireAuth.js";

const router = Router();

// ── Recording storage ─────────────────────────────────────────────────────────

// ── SF data-category cache (1-hour TTL) ───────────────────────────────────────
interface KnSfSubCategory { name: string; label: string; }
interface KnSfCategoryGroup { name: string; label: string; categories: KnSfSubCategory[]; }
let sfCategoryCacheExpiry = 0;
let sfCategoryCache: KnSfCategoryGroup[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SyncStatus = "Live" | "Manual" | "Disconnected" | "Planned" | "Future";

interface ArchiveDocument {
  id: string;
  name: string;
  categories: string[];
  uploadedBy?: string;
  uploadDate?: string;
  owner?: string;
}

interface KnowledgeSource {
  id: string;
  name: string;
  shortName: string;
  type: string;
  owner: string;
  systemOfRecord: string;
  description: string;
  purpose: string;
  relatedPrograms: string[];
  relatedKnowledgeCategories: string[];
  relatedSfObjects: string[];
  relatedPennyCapabilities: string[];
  relatedStandards: string[];
  relatedSources: string[];
  trustLevel: string;
  reviewCycle: string;
  lastReviewDate: string;
  nextReviewDate: string;
  accessStatus: string;
  syncStatus: SyncStatus;
  availability: string;
  approvedForPenny: boolean;
  pennyUseDescription: string;
  healthStatus: string;
  healthIssues: string[];
  futureIntegrationPath: string;
  integrationPriority: "P1" | "P2" | "P3";
  sampleContents?: string[];
  sfCategory?: string;
  documents?: ArchiveDocument[];
  // Live-enrichment fields (injected at serve-time, not persisted)
  liveFileCount?: number | null;
  liveSfArticleCount?: number | null;
  // Connection fields — set via admin UI, persisted in DB
  driveFolderUrl?: string;
  driveFolderName?: string;
  driveSyncFrequency?: string;
  driveLastSynced?: string;
  sfArticleFilter?: string;
  linkUrl?: string;
  linkCheckFrequency?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// Seeds the DB on first empty load. After seeding, the DB is the source of
// truth — edit records there, not here.
// ─────────────────────────────────────────────────────────────────────────────

const SEED_SOURCES: KnowledgeSource[] = [
  {
    id: "src-sf-mission-delivery",
    name: "Salesforce Knowledge — Mission & Delivery",
    shortName: "SF Knowledge: Mission",
    type: "Salesforce Knowledge",
    sfCategory: "Mission & Delivery",
    owner: "Knowledge Lead",
    systemOfRecord: "Salesforce",
    description: "Knowledge articles covering program model, coaching delivery approach, learner pathways, career outcomes, and participant guidelines.",
    purpose: "Authoritative reference for how Transition Trails delivers its programs. Penny uses this to answer coaching questions, provide career guidance, and stay aligned with organizational standards.",
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Explorer's Trail", "All programs"],
    relatedKnowledgeCategories: ["Mission & Delivery", "Coaching", "Career"],
    relatedSfObjects: ["Knowledge__c", "Program_Engagement__c", "Contact"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-resume-review", "cap-knowledge-retrieval"],
    relatedStandards: ["std-knowledge-article", "std-coach-notes"],
    relatedSources: ["src-sf-ops-business", "src-curriculum-studio", "src-standards-studio"],
    trustLevel: "Authoritative",
    reviewCycle: "Quarterly",
    lastReviewDate: "March 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Open",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Primary knowledge source for coaching conversations, career guidance, and answering learner questions about the program model and pathway.",
    healthStatus: "Warning",
    healthIssues: ["Review date approaching — schedule quarterly review", "Sync is manual — no live connection to Salesforce Knowledge API yet"],
    futureIntegrationPath: "Q3 2025 — Salesforce Knowledge API. Live sync with 24h refresh cadence.",
    integrationPriority: "P1",
    sampleContents: ["Foundations Trail Program Model Overview", "Coaching Delivery Standards", "Learner Pathway: Admin to Analyst", "Career Outcomes Framework"],
  },
  {
    id: "src-sf-ops-business",
    name: "Salesforce Knowledge — Operations & Business",
    shortName: "SF Knowledge: Operations",
    type: "Salesforce Knowledge",
    sfCategory: "Operations & Business",
    owner: "Operations Lead",
    systemOfRecord: "Salesforce",
    description: "Knowledge articles covering internal operations, business policies, partner management, staff onboarding, and compliance.",
    purpose: "Internal operational reference. Penny uses this selectively for coach-facing interactions that require policy context — not exposed to learners directly.",
    relatedPrograms: ["Internal"],
    relatedKnowledgeCategories: ["Operations", "Business"],
    relatedSfObjects: ["Knowledge__c"],
    relatedPennyCapabilities: ["cap-escalations", "cap-executive-briefs"],
    relatedStandards: [],
    relatedSources: ["src-sf-mission-delivery", "src-sf-technology"],
    trustLevel: "Trusted",
    reviewCycle: "Bi-annually",
    lastReviewDate: "January 2025",
    nextReviewDate: "July 2025",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: false,
    pennyUseDescription: "Not currently approved for direct Penny retrieval. Used by executive briefs and escalation summaries with human review required.",
    healthStatus: "Warning",
    healthIssues: ["Not yet approved for Penny retrieval — requires compliance review", "Some articles >12 months without update — flag for review"],
    futureIntegrationPath: "Q4 2025 — Restricted Penny access. Coach-only context injection.",
    integrationPriority: "P2",
    sampleContents: ["Internal Operations Handbook", "Partner Management Policies", "Staff Onboarding Guide"],
  },
  {
    id: "src-sf-technology",
    name: "Salesforce Knowledge — Technology & Trail OS",
    shortName: "SF Knowledge: Technology",
    type: "Salesforce Knowledge",
    sfCategory: "Technology & Trail OS",
    owner: "Technology Lead",
    systemOfRecord: "Salesforce",
    description: "Knowledge articles covering Salesforce platform how-tos, Trail OS documentation, system configuration guides, and technical standards.",
    purpose: "Technical reference for the team and for Penny when answering learner questions about Salesforce concepts, Trail OS navigation, and system behavior.",
    relatedPrograms: ["Foundations Trail", "Explorer's Trail", "Internal"],
    relatedKnowledgeCategories: ["Technology", "Trail OS", "Salesforce Platform"],
    relatedSfObjects: ["Knowledge__c"],
    relatedPennyCapabilities: ["cap-knowledge-retrieval", "cap-study-coach"],
    relatedStandards: ["std-knowledge-article"],
    relatedSources: ["src-sf-mission-delivery", "src-curriculum-studio"],
    trustLevel: "Authoritative",
    reviewCycle: "Monthly (tech changes frequently)",
    lastReviewDate: "May 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Open",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Penny uses this to answer learner Salesforce and Trail OS questions. Highest accuracy requirement.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Q3 2025 — Live SF Knowledge API sync. Highest priority for RAG pipeline accuracy.",
    integrationPriority: "P1",
    sampleContents: ["Salesforce Admin: Object Model Reference", "Trail OS Navigation Guide", "Custom Object Setup How-To"],
  },
  {
    id: "src-gdrive-foundations",
    name: "Foundations Trail Google Drive Folder",
    shortName: "GDrive: Foundations Trail",
    type: "Google Drive",
    owner: "Curriculum Lead",
    systemOfRecord: "Google Drive",
    description: "Google Drive folder containing all Foundations Trail program materials: coach guides, sprint schedules, assessment rubrics, and session resources.",
    purpose: "Source of truth for all Foundations Trail program assets. Penny uses this for program context, coach guidance, and supplementary content.",
    relatedPrograms: ["Foundations Trail"],
    relatedKnowledgeCategories: ["Mission & Delivery", "Coaching", "Curriculum"],
    relatedSfObjects: ["Program__c", "pmdm__ServiceSchedule__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-study-coach", "cap-trail-quests"],
    relatedStandards: ["std-module", "std-lesson", "std-coach-notes"],
    relatedSources: ["src-lms-modules", "src-curriculum-studio", "src-sf-mission-delivery"],
    trustLevel: "Trusted",
    reviewCycle: "Per sprint",
    lastReviewDate: "May 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Partial",
    approvedForPenny: false,
    pennyUseDescription: "Drive API is connected. Penny access pending folder indexing configuration and content trust review.",
    healthStatus: "Warning",
    healthIssues: ["Folder indexing not yet configured — content not accessible to Trail OS", "Not approved for Penny until folder sync is set up and content reviewed"],
    futureIntegrationPath: "Folder indexing → RAG pipeline. Content must pass Standards Studio review before Penny access.",
    integrationPriority: "P1",
    sampleContents: ["Sprint 1 Coach Guide", "Module Assessment Rubrics", "Learner Reference Packet", "Office Hours Agenda Templates"],
  },
  {
    id: "src-gdrive-guided",
    name: "Guided Trail Google Drive Folder",
    shortName: "GDrive: Guided Trail",
    type: "Google Drive",
    owner: "Curriculum Lead",
    systemOfRecord: "Google Drive",
    description: "Google Drive folder containing all Guided Trail program materials, coach resources, sprint documentation, and supplementary learning assets.",
    purpose: "Source of truth for Guided Trail assets. Penny context layer for the Guided Trail program experience.",
    relatedPrograms: ["Guided Trail"],
    relatedKnowledgeCategories: ["Mission & Delivery", "Curriculum"],
    relatedSfObjects: ["Program__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-reflection-prompts"],
    relatedStandards: ["std-module", "std-coach-notes"],
    relatedSources: ["src-gdrive-foundations", "src-curriculum-studio"],
    trustLevel: "Trusted",
    reviewCycle: "Per sprint",
    lastReviewDate: "April 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Partial",
    approvedForPenny: false,
    pennyUseDescription: "Drive API is connected. Folder indexing and content review pending.",
    healthStatus: "Warning",
    healthIssues: ["Folder indexing not yet configured — content not accessible to Trail OS", "Folder content not yet indexed for Penny retrieval"],
    futureIntegrationPath: "Same indexing pipeline as Foundations Trail Drive.",
    integrationPriority: "P2",
    sampleContents: ["Sprint Schedule", "Cohort Kick-off Materials", "Module Resource Packs"],
  },
  {
    id: "src-gdrive-source-docs",
    name: "Source Document Archive",
    shortName: "Source Doc Archive",
    type: "Google Drive",
    owner: "Knowledge Lead",
    systemOfRecord: "Google Drive",
    description: "Curated archive of reference documents, research papers, and source materials uploaded to Trail OS and mapped via Source Mapping.",
    purpose: "Supplementary reference layer. Penny uses these for answering nuanced questions requiring external documentation or research-backed content.",
    relatedPrograms: ["All programs"],
    relatedKnowledgeCategories: ["Technology", "Mission & Delivery"],
    relatedSfObjects: ["Knowledge__c"],
    relatedPennyCapabilities: ["cap-knowledge-retrieval", "cap-source-recommendations"],
    relatedStandards: ["std-knowledge-article"],
    relatedSources: ["src-sf-technology", "src-sf-mission-delivery"],
    trustLevel: "Curated",
    reviewCycle: "As uploaded",
    lastReviewDate: "May 2025",
    nextReviewDate: "August 2025",
    accessStatus: "Open",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Secondary retrieval source. Penny uses when primary SF Knowledge sources do not answer a query. Always cites source document and upload date.",
    healthStatus: "Warning",
    healthIssues: ["12 documents awaiting category mapping", "3 documents have no owner assigned", "No automated review trigger — items can become stale"],
    futureIntegrationPath: "Q3 2025 — Automated indexing on upload. Standards Studio compliance check before Penny ingestion.",
    integrationPriority: "P2",
    sampleContents: ["Salesforce Certified Admin Study Guide", "Nonprofit Cloud Reference", "Trailhead Module Index Export"],
    documents: [
      { id: "sda-001", name: "Salesforce Certified Admin Study Guide",      categories: ["technology"],                        uploadedBy: "Knowledge Lead",  uploadDate: "Mar 2025", owner: "Knowledge Lead"  },
      { id: "sda-002", name: "Nonprofit Cloud Reference",                   categories: ["technology", "mission-delivery"],    uploadedBy: "Knowledge Lead",  uploadDate: "Mar 2025", owner: "Knowledge Lead"  },
      { id: "sda-003", name: "Trailhead Module Index Export",               categories: ["technology", "curriculum"],           uploadedBy: "Curriculum Lead", uploadDate: "Apr 2025", owner: "Curriculum Lead" },
      { id: "sda-004", name: "NPSP Configuration Best Practices",           categories: [],                                    uploadedBy: "Knowledge Lead",  uploadDate: "Apr 2025", owner: "Knowledge Lead"  },
      { id: "sda-005", name: "Volunteer Management Framework",              categories: [],                                    uploadedBy: "Operations Lead", uploadDate: "Apr 2025", owner: "Operations Lead" },
      { id: "sda-006", name: "Coaching Protocol Template Pack",             categories: [],                                    uploadedBy: "Coach Team Lead", uploadDate: "Apr 2025"                           },
      { id: "sda-007", name: "Sprint Planning Guide for Cohort Leads",      categories: [],                                    uploadedBy: "Operations Lead", uploadDate: "May 2025"                           },
      { id: "sda-008", name: "Assessment Rubric Collection",                categories: [],                                    uploadedBy: "Curriculum Lead", uploadDate: "May 2025", owner: "Curriculum Lead" },
      { id: "sda-009", name: "Career Pathway Research — Tech Sector 2024", categories: [],                                    uploadedBy: "Knowledge Lead",  uploadDate: "May 2025"                           },
      { id: "sda-010", name: "Employer Partner Onboarding Guide",           categories: [],                                    uploadedBy: "Operations Lead", uploadDate: "May 2025"                           },
      { id: "sda-011", name: "SF Admin Exam Blueprint v7",                  categories: [],                                    uploadedBy: "Curriculum Lead", uploadDate: "May 2025", owner: "Curriculum Lead" },
      { id: "sda-012", name: "Learning Outcomes Measurement Framework",     categories: [],                                    uploadedBy: "Knowledge Lead",  uploadDate: "May 2025"                           },
      { id: "sda-013", name: "Coaching Conversation Note Templates",        categories: [],                                    uploadedBy: "Coach Team Lead", uploadDate: "Jun 2025"                           },
      { id: "sda-014", name: "Program Budget Template FY25",                categories: [],                                    uploadedBy: "Operations Lead", uploadDate: "Jun 2025"                           },
      { id: "sda-015", name: "Transition Trails Impact Report 2024",        categories: [],                                    uploadedBy: "Knowledge Lead",  uploadDate: "Jun 2025", owner: "Knowledge Lead"  },
    ],
  },
  {
    id: "src-lms-modules",
    name: "LMS Course Modules",
    shortName: "LMS Modules",
    type: "LMS Content",
    owner: "Curriculum Lead",
    systemOfRecord: "Salesforce (Course__c / Course_Module__c)",
    description: "Course and module records live in Salesforce as Course__c and Course_Module__c objects. Foundations Trail (13 modules) and Guided Trail (20 modules) are active. Real-time read access via the Trail OS LMS API.",
    purpose: "Core learning content that Penny uses as context for coaching, answering module questions, guiding study, and generating reflections.",
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Explorer's Trail"],
    relatedKnowledgeCategories: ["Curriculum", "Mission & Delivery"],
    relatedSfObjects: ["Course__c", "Course_Module__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-study-coach", "cap-reflection-prompts", "cap-trail-quests", "cap-progress-insights"],
    relatedStandards: ["std-module", "std-lesson", "std-reflection-prompt"],
    relatedSources: ["src-curriculum-studio", "src-assessments", "src-gdrive-foundations"],
    trustLevel: "Authoritative",
    reviewCycle: "Per cohort",
    lastReviewDate: "July 2025",
    nextReviewDate: "October 2025",
    accessStatus: "Open",
    syncStatus: "Live",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Highest priority source for active program coaching. Penny retrieves current module content before every learner interaction.",
    healthStatus: "Healthy",
    healthIssues: ["No completion event webhook — Penny cannot auto-trigger on module completion yet (Phase 2)"],
    futureIntegrationPath: "Phase 2 — LMS completion event webhook so Penny auto-triggers on module completion.",
    integrationPriority: "P1",
    sampleContents: ["Module 1: Salesforce Fundamentals", "Module 2: Object Model Deep Dive", "Module 3: Automation Tools", "Module 4: Reports & Dashboards"],
  },
  {
    id: "src-assessments",
    name: "Salesforce Assessment Objects",
    shortName: "SF Assessments",
    type: "Assessments",
    owner: "Curriculum Lead",
    systemOfRecord: "Salesforce",
    description: "Assessment questions, learner response data, scoring results, and pass/fail records stored as Salesforce objects.",
    purpose: "Penny reads assessment data to understand where a learner is struggling, trigger coaching interventions, and personalize study guidance.",
    relatedPrograms: ["Foundations Trail", "Guided Trail"],
    relatedKnowledgeCategories: ["Assessments", "Learner Progress"],
    relatedSfObjects: ["Learner_Course_Module__c", "Program_Engagement__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-escalations", "cap-study-coach", "cap-cohort-summaries", "cap-progress-insights"],
    relatedStandards: [],
    relatedSources: ["src-lms-modules", "src-sf-mission-delivery"],
    trustLevel: "Authoritative",
    reviewCycle: "Continuous (assessment records are live data)",
    lastReviewDate: "May 2025",
    nextReviewDate: "Ongoing",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Penny reads assessment scores and pass/fail patterns to personalize coaching messages and generate progress insights.",
    healthStatus: "Warning",
    healthIssues: ["No live Salesforce API connection — data pulled manually for prototype", "Assessment → module mapping incomplete for Sprint 3+"],
    futureIntegrationPath: "Q3 2025 — Live Salesforce SOQL queries. Penny reads in real-time per coaching interaction.",
    integrationPriority: "P1",
    sampleContents: ["Declarative Automation Assessment", "Data Model Quiz", "Reports & Dashboards Evaluation", "Certification Readiness Check"],
    documents: [
      { id: "asmnt-001", name: "Declarative Automation Assessment",  categories: ["assessments", "curriculum"], uploadedBy: "Curriculum Lead", uploadDate: "Feb 2025" },
      { id: "asmnt-002", name: "Data Model Quiz — Sprint 1",         categories: ["assessments", "curriculum"], uploadedBy: "Curriculum Lead", uploadDate: "Feb 2025" },
      { id: "asmnt-003", name: "Reports & Dashboards Evaluation",    categories: ["assessments"],               uploadedBy: "Curriculum Lead", uploadDate: "Mar 2025" },
      { id: "asmnt-004", name: "Certification Readiness Check",      categories: ["assessments", "technology"], uploadedBy: "Curriculum Lead", uploadDate: "Mar 2025" },
      { id: "asmnt-005", name: "Flow Builder Practical Assessment",  categories: ["assessments", "curriculum"], uploadedBy: "Curriculum Lead", uploadDate: "Mar 2025" },
      { id: "asmnt-006", name: "Security & Access Quiz",             categories: ["assessments", "technology"], uploadedBy: "Curriculum Lead", uploadDate: "Apr 2025" },
      { id: "asmnt-007", name: "Custom Objects Workshop Evaluation", categories: [],                            uploadedBy: "Curriculum Lead", uploadDate: "Apr 2025" },
      { id: "asmnt-008", name: "Automation Strategy Capstone",       categories: [],                            uploadedBy: "Curriculum Lead", uploadDate: "May 2025" },
      { id: "asmnt-009", name: "NPSP Data Migration Assessment",     categories: [],                            uploadedBy: "Curriculum Lead", uploadDate: "May 2025" },
      { id: "asmnt-010", name: "Mentor Program Review Rubric",       categories: [],                            uploadedBy: "Coach Team Lead", uploadDate: "May 2025" },
    ],
  },
  {
    id: "src-standards-studio",
    name: "Standards Studio Rules",
    shortName: "Standards Studio",
    type: "Standards Studio",
    owner: "Curriculum Lead",
    systemOfRecord: "Trail OS — Standards Studio",
    description: "Content quality rules and Penny prompt standards defined in Standards Studio.",
    purpose: "Penny's rule layer. Before generating or delivering any content, Penny checks the applicable standard to ensure quality, tone, structure, and required fields are met.",
    relatedPrograms: ["All programs"],
    relatedKnowledgeCategories: ["Standards", "Quality"],
    relatedSfObjects: [],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-reflection-prompts", "cap-trail-quests", "cap-knowledge-retrieval"],
    relatedStandards: ["std-module", "std-lesson", "std-knowledge-article", "std-penny-prompt", "std-reflection-prompt", "std-coach-notes"],
    relatedSources: ["src-curriculum-studio", "src-sf-mission-delivery"],
    trustLevel: "Authoritative",
    reviewCycle: "Quarterly (or when standards are updated)",
    lastReviewDate: "May 2025",
    nextReviewDate: "August 2025",
    accessStatus: "Open",
    syncStatus: "Live",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Penny reads Standards Studio rules before every content generation step. Acts as the quality gate.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Live — Standards Studio is a Trail OS-native source. No external sync needed.",
    integrationPriority: "P1",
    sampleContents: ["Module Standard (10 rules)", "Lesson Standard (8 rules)", "Reflection Prompt Standard (6 rules)", "Penny Prompt Standard (7 rules)"],
  },
  {
    id: "src-curriculum-studio",
    name: "Curriculum Studio Content",
    shortName: "Curriculum Studio",
    type: "Curriculum Studio",
    owner: "Curriculum Lead",
    systemOfRecord: "Trail OS — Curriculum Studio",
    description: "Module outlines, lesson frameworks, Penny asset definitions, and curriculum metadata authored in Trail OS Curriculum Studio.",
    purpose: "The structural design standard for all learning content. Penny uses curriculum data to understand the intended module sequence, learning objectives, and delivery design.",
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Explorer's Trail"],
    relatedKnowledgeCategories: ["Curriculum", "Program Design"],
    relatedSfObjects: ["pmdm__ServiceSchedule__c", "Learner_Course_Module__c"],
    relatedPennyCapabilities: ["cap-study-coach", "cap-trail-quests", "cap-reflection-prompts", "cap-cohort-summaries"],
    relatedStandards: ["std-module", "std-lesson"],
    relatedSources: ["src-standards-studio", "src-lms-modules", "src-gdrive-foundations"],
    trustLevel: "Authoritative",
    reviewCycle: "Per sprint",
    lastReviewDate: "May 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Open",
    syncStatus: "Live",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Penny reads curriculum structure before generating module-specific content. This is the scaffold.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Live — Curriculum Studio is Trail OS-native. Future: LMS export pipeline wires this to live delivery data.",
    integrationPriority: "P1",
    sampleContents: ["Module Outline: Sprint 1-4", "Lesson Templates per Module", "Penny Asset Definitions"],
  },
  {
    id: "src-penny-generated",
    name: "Penny Content Assistant Outputs",
    shortName: "Penny Outputs",
    type: "Penny Generated",
    owner: "Penny Product Lead",
    systemOfRecord: "Trail OS — Penny Command Center",
    description: "Coaching messages, reflection prompts, weekly summaries, and other content generated by Penny and reviewed through the Content Assistant workflow.",
    purpose: "Creates a feedback loop. Penny's reviewed and approved outputs become training examples and prompt templates for future interactions.",
    relatedPrograms: ["All programs"],
    relatedKnowledgeCategories: ["Penny", "Coaching", "Curriculum"],
    relatedSfObjects: ["Program_Engagement__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-reflection-prompts", "cap-cohort-summaries"],
    relatedStandards: ["std-penny-prompt", "std-reflection-prompt"],
    relatedSources: ["src-standards-studio", "src-curriculum-studio"],
    trustLevel: "Curated",
    reviewCycle: "Per output (human review required before re-use)",
    lastReviewDate: "May 2025",
    nextReviewDate: "Ongoing",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Partial",
    approvedForPenny: false,
    pennyUseDescription: "Not yet approved for automatic Penny retrieval. Human-reviewed outputs can be promoted to prompt templates manually.",
    healthStatus: "Warning",
    healthIssues: ["No automated feedback loop yet", "Approval workflow for output promotion to templates is manual"],
    futureIntegrationPath: "Q4 2025 — Automated quality scoring. Approved outputs promoted to template library.",
    integrationPriority: "P2",
    sampleContents: ["Sprint 1 Reflection Prompts (reviewed set)", "Weekly Coaching Message Templates"],
  },
  {
    id: "src-coach-notes",
    name: "Coach Notes Library",
    shortName: "Coach Notes",
    type: "Salesforce Knowledge",
    sfCategory: "Mission & Delivery",
    owner: "Coach Team Lead",
    systemOfRecord: "Salesforce",
    description: "Coach-authored notes on learner cohorts, escalation patterns, and program delivery insights stored in Salesforce.",
    purpose: "Penny reads coach notes to understand escalation triggers, learner struggle patterns, and context that helps calibrate coaching tone and urgency.",
    relatedPrograms: ["Foundations Trail", "Guided Trail"],
    relatedKnowledgeCategories: ["Coaching", "Mission & Delivery"],
    relatedSfObjects: ["Knowledge__c", "Program_Engagement__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-escalations", "cap-cohort-summaries"],
    relatedStandards: ["std-coach-notes"],
    relatedSources: ["src-sf-mission-delivery", "src-assessments"],
    trustLevel: "Trusted",
    reviewCycle: "Per cohort",
    lastReviewDate: "April 2025",
    nextReviewDate: "June 2025",
    accessStatus: "Restricted",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Restricted coach-context injection. Penny uses to calibrate escalation detection and cohort tone. Never surfaced verbatim to learners.",
    healthStatus: "Warning",
    healthIssues: ["No live API connection — notes pulled manually", "No standardized tagging for escalation pattern extraction"],
    futureIntegrationPath: "Q3 2025 — Live Salesforce SOQL. Automated escalation signal detection on new note creation.",
    integrationPriority: "P1",
    sampleContents: ["Sprint 1 Cohort Notes", "Escalation Pattern Log", "Session Debrief Notes"],
  },
  {
    id: "src-future-slack",
    name: "Future: Slack Conversation History",
    shortName: "Slack History",
    type: "Slack History",
    owner: "Communications Lead",
    systemOfRecord: "Slack",
    description: "Future source: learner and coach conversations from designated Slack channels where consent and retention policies are in place.",
    purpose: "When connected, Slack history will give Penny real-time conversational context — understanding what was just discussed in a channel before crafting a coaching message.",
    relatedPrograms: ["All programs"],
    relatedKnowledgeCategories: ["Communications", "Coaching"],
    relatedSfObjects: [],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-trail-talk", "cap-cohort-summaries"],
    relatedStandards: [],
    relatedSources: ["src-sf-mission-delivery"],
    trustLevel: "Unverified",
    reviewCycle: "Continuous (real-time channel data)",
    lastReviewDate: "Not yet",
    nextReviewDate: "Q3 2025",
    accessStatus: "Not Connected",
    syncStatus: "Future",
    availability: "Future",
    approvedForPenny: false,
    pennyUseDescription: "Not yet available. When connected, Slack history will provide channel conversation context for coaching message calibration.",
    healthStatus: "Future",
    healthIssues: ["Privacy and data retention policy not yet defined", "Learner consent model for conversation logging not designed"],
    futureIntegrationPath: "Q3 2025 — Slack Bolt app. Conversation logging with learner consent. Retention: 90-day rolling window.",
    integrationPriority: "P2",
  },
  {
    id: "src-future-calendar",
    name: "Future: Google Calendar Events",
    shortName: "Calendar Events",
    type: "Calendar Events",
    owner: "Communications Lead",
    systemOfRecord: "Google Calendar",
    description: "Future source: Google Calendar event data for program sessions, sprint deadlines, office hours, and assessment windows.",
    purpose: "When connected, Calendar data will allow Penny to send context-aware reminders and tie coaching messages to upcoming sessions.",
    relatedPrograms: ["All programs"],
    relatedKnowledgeCategories: ["Communications", "Program Schedule"],
    relatedSfObjects: ["Service_Schedule__c", "Service_Attendance__c"],
    relatedPennyCapabilities: ["cap-calendar-reminders", "cap-weekly-reviews"],
    relatedStandards: ["std-calendar-reminder"],
    relatedSources: ["src-sf-mission-delivery"],
    trustLevel: "Unverified",
    reviewCycle: "Continuous (real-time)",
    lastReviewDate: "Not yet",
    nextReviewDate: "Q3 2025",
    accessStatus: "Not Connected",
    syncStatus: "Future",
    availability: "Future",
    approvedForPenny: false,
    pennyUseDescription: "Not yet available. When connected, Calendar events will be the trigger source for reminder capabilities.",
    healthStatus: "Future",
    healthIssues: ["Calendar schema mapping to Salesforce Service_Schedule__c not yet designed"],
    futureIntegrationPath: "Q3 2025 — Google Calendar API via service account. Read-only event access.",
    integrationPriority: "P2",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DB SEED
// ─────────────────────────────────────────────────────────────────────────────

async function seedSourcesIfEmpty(): Promise<void> {
  const existing = await db.select().from(knowledgeSourcesTable);
  if (existing.length > 0) return;
  for (const src of SEED_SOURCES) {
    await db
      .insert(knowledgeSourcesTable)
      .values({ id: src.id, data: src })
      .onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ENRICHMENT
// ─────────────────────────────────────────────────────────────────────────────

// Fetch a Drive access token using the standard env vars (same as drive.ts).
async function getDriveToken(): Promise<string> {
  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const refreshToken = process.env["GOOGLE_DRIVE_REFRESH_TOKEN"];
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Missing Drive OAuth env vars");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!resp.ok) throw new Error(`Drive token exchange failed: HTTP ${resp.status}`);
  const data = await resp.json() as { access_token: string };
  return data.access_token;
}

// Count files in a specific Drive folder (non-recursive, non-trashed).
async function countDriveFiles(token: string, folderId: string): Promise<number> {
  const q   = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!resp.ok) throw new Error(`Drive files list failed: HTTP ${resp.status}`);
  const data = await resp.json() as { files: { id: string }[] };
  return data.files.length;
}

interface DriveEnrichment {
  pennyAssetFileCount: number | null;  // total files in Penny Asset Library root
}

async function fetchDriveEnrichment(): Promise<DriveEnrichment> {
  try {
    const pennyFolderId = process.env["GOOGLE_DRIVE_PENNY_FOLDER_ID"];
    if (!pennyFolderId) return { pennyAssetFileCount: null };
    const token = await getDriveToken();
    const count = await countDriveFiles(token, pennyFolderId);
    return { pennyAssetFileCount: count };
  } catch {
    return { pennyAssetFileCount: null };
  }
}

// Query Salesforce Knowledge article count (graceful if Knowledge not enabled).
interface SfKnowledgeEnrichment {
  totalArticles: number | null;
  articlesByCategory: Record<string, number> | null;
}

async function fetchSfKnowledgeEnrichment(): Promise<SfKnowledgeEnrichment> {
  try {
    const client = new ConnectorSalesforceClient();
    // KnowledgeArticleVersion is the standard SF Knowledge object.
    // PublishStatus='online' means published articles only.
    const result = await client.query<{ DataCategoryGroupName?: string }>(
      "SELECT COUNT() FROM KnowledgeArticleVersion WHERE PublishStatus = 'online' LIMIT 1000"
    );
    const total = result.totalSize;

    // Per-category breakdown using DataCategoryGroupName if available.
    // Falls back to just the total if category data is unavailable.
    return { totalArticles: total, articlesByCategory: null };
  } catch {
    // SF Knowledge may not be enabled — treat as null, not an error.
    return { totalArticles: null, articlesByCategory: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENRICH SOURCES
// Applies live integration status, Drive file counts, and SF article counts
// to the base sources read from DB.
// ─────────────────────────────────────────────────────────────────────────────

function enrichSources(
  sources: KnowledgeSource[],
  integrationStatus: Record<string, string>,
  driveData: DriveEnrichment,
  sfKnowledge: SfKnowledgeEnrichment,
): KnowledgeSource[] {
  return sources.map(src => {
    const integrationKey = SOURCE_INTEGRATION_MAP[src.id];

    // ── syncStatus from live integration health ──────────────────────────────
    let syncStatus: SyncStatus = src.syncStatus;
    if (integrationKey) {
      const status = integrationStatus[integrationKey] ?? "error";
      syncStatus =
        status === "live"    ? "Live"   :
        status === "phase-2" ? "Future" :
        src.syncStatus;
    }

    // ── Filter stale healthIssues ────────────────────────────────────────────
    const healthIssues = integrationKey
      ? filterStaleHealthIssues(src.healthIssues, integrationKey, integrationStatus)
      : src.healthIssues;

    // ── Drive: inject real file count for Drive sources ──────────────────────
    let liveFileCount: number | null = null;
    if (src.type === "Google Drive" && driveData.pennyAssetFileCount !== null) {
      // Penny Asset Library file count surfaces for the source doc archive;
      // program folders report Drive as "connected" without a specific count
      // (the Penny folder is not the program content folder).
      if (src.id === "src-gdrive-source-docs") {
        liveFileCount = driveData.pennyAssetFileCount;
      }
    }

    // ── SF Knowledge: inject article counts + clean stale health issues ───────
    // Only applies to sources that map directly to KnowledgeArticleVersion records.
    // Coach Notes Library is Salesforce-stored but is NOT a KnowledgeArticleVersion source.
    const SF_ARTICLE_SOURCE_IDS = new Set([
      "src-sf-mission-delivery",
      "src-sf-ops-business",
      "src-sf-technology",
    ]);

    let liveSfArticleCount: number | null = null;
    let sfHealthIssues = healthIssues;

    if (SF_ARTICLE_SOURCE_IDS.has(src.id)) {
      if (sfKnowledge.totalArticles !== null) {
        // The query succeeded → the live API connection IS working.
        // Remove the "Sync is manual" seed issue — it's no longer accurate.
        liveSfArticleCount = sfKnowledge.totalArticles;
        sfHealthIssues = sfHealthIssues.filter(
          h => !h.toLowerCase().includes("sync is manual") &&
               !h.toLowerCase().includes("no live connection")
        );
        if (sfKnowledge.totalArticles === 0) {
          // Connected but no published articles — surface this as the real blocker.
          sfHealthIssues = [
            ...sfHealthIssues,
            "SF Knowledge API connected — 0 published articles found. Create and publish articles in Salesforce Knowledge to populate this source.",
          ];
        }
        // Ensure syncStatus reflects the live connection regardless of integration key.
        syncStatus = "Live";
      }
      // If sfKnowledge.totalArticles === null → query failed (Knowledge not enabled
      // in org, or auth issue). Keep the original "Sync is manual" issue as-is.
    }

    return { ...src, syncStatus, healthIssues: sfHealthIssues, liveFileCount, liveSfArticleCount };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/knowledge/sources
// Returns the full KnowledgeSource[] from DB, enriched with live data.
router.get("/knowledge/sources", async (req, res): Promise<void> => {
  try {
    await seedSourcesIfEmpty();
    const rows = await db.select().from(knowledgeSourcesTable);
    const sources = rows.map(r => r.data as KnowledgeSource);

    const [metrics, driveData, sfKnowledge] = await Promise.all([
      fetchSfLiveMetrics(),
      fetchDriveEnrichment(),
      fetchSfKnowledgeEnrichment(),
    ]);

    const integrationStatus = buildIntegrationStatus(metrics.sfLive);
    const enriched = enrichSources(sources, integrationStatus, driveData, sfKnowledge);

    res.json({
      sources: enriched,
      metrics,
      integrationStatus,
      driveEnrichment: driveData,
      sfKnowledgeEnrichment: sfKnowledge,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err, "Failed to build knowledge sources response");
    res.status(500).json({ error: "Failed to fetch knowledge sources" });
  }
});

// PATCH /api/knowledge/sources/:id
// Persist edits to a knowledge source (owner, trustLevel, approvedForPenny, etc.)
router.patch("/knowledge/sources/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const rows = await db.select().from(knowledgeSourcesTable).where(eq(knowledgeSourcesTable.id, id));
    if (rows.length === 0) {
      res.status(404).json({ error: "Source not found" });
      return;
    }
    const current = rows[0]!.data as KnowledgeSource;
    const updated = { ...current, ...(req.body as Partial<KnowledgeSource>) };
    await db
      .update(knowledgeSourcesTable)
      .set({ data: updated, updatedAt: new Date() })
      .where(eq(knowledgeSourcesTable.id, id));
    res.json({ source: updated });
  } catch (err) {
    req.log.error(err, "Failed to update knowledge source");
    res.status(500).json({ error: "Failed to update source" });
  }
});

// POST /api/knowledge/sources
// Create a new knowledge source record.
router.post("/knowledge/sources", async (req, res): Promise<void> => {
  try {
    const body = req.body as Partial<KnowledgeSource>;
    if (!body.name || !body.type) {
      res.status(400).json({ error: "name and type are required" });
      return;
    }
    const id = `src-${Date.now()}`;
    const newSource: KnowledgeSource = {
      id,
      name:                   body.name,
      shortName:              body.shortName ?? body.name,
      type:                   body.type,
      owner:                  body.owner ?? "Admin",
      systemOfRecord:         body.systemOfRecord ?? body.type,
      description:            body.description ?? "",
      purpose:                body.purpose ?? "",
      relatedPrograms:        body.relatedPrograms ?? [],
      relatedKnowledgeCategories: body.relatedKnowledgeCategories ?? [],
      relatedSfObjects:       body.relatedSfObjects ?? [],
      relatedPennyCapabilities: body.relatedPennyCapabilities ?? [],
      relatedStandards:       body.relatedStandards ?? [],
      relatedSources:         body.relatedSources ?? [],
      trustLevel:             body.trustLevel ?? "Unverified",
      reviewCycle:            body.reviewCycle ?? "Annual",
      lastReviewDate:         body.lastReviewDate ?? "",
      nextReviewDate:         body.nextReviewDate ?? "",
      accessStatus:           body.accessStatus ?? "Not Connected",
      syncStatus:             body.syncStatus ?? "Manual",
      availability:           body.availability ?? "Partial",
      approvedForPenny:       body.approvedForPenny ?? false,
      pennyUseDescription:    body.pennyUseDescription ?? "",
      healthStatus:           body.healthStatus ?? "Warning",
      healthIssues:           body.healthIssues ?? ["Connection not configured"],
      futureIntegrationPath:  body.futureIntegrationPath ?? "",
      integrationPriority:    body.integrationPriority ?? "P3",
      driveFolderUrl:         body.driveFolderUrl,
      driveFolderName:        body.driveFolderName,
      driveSyncFrequency:     body.driveSyncFrequency,
      sfCategory:             body.sfCategory,
      sfArticleFilter:        body.sfArticleFilter,
      linkUrl:                body.linkUrl,
      linkCheckFrequency:     body.linkCheckFrequency,
    };
    await db.insert(knowledgeSourcesTable).values({ id, data: newSource });
    res.status(201).json({ source: newSource });
  } catch (err) {
    req.log.error(err, "Failed to create knowledge source");
    res.status(500).json({ error: "Failed to create source" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SF KNOWLEDGE ARTICLE ROUTES
// ─────────────────────────────────────────────────────────────────────────────

interface SfArticle {
  id: string;
  knowledgeArticleId: string;
  title: string;
  summary: string | null;
  articleType: string | null;
  publishStatus: string;
  versionNumber: number | null;
  createdDate: string;
  lastModifiedDate: string;
  isVisibleInApp: boolean;
  language: string;
  dataCategories: string[];
  /** Present when a search was performed. Excerpt around the matched text. */
  snippet?: string | null;
  /** True when the search match came from the article body, not title/summary. */
  bodyMatch?: boolean;
}

interface ArticleSection {
  label: string;
  html: string;
}

interface SfArticleDetail extends SfArticle {
  body: string | null;
  urlName: string | null;
  sections: ArticleSection[];
  sfUrl: string | null;
  sfEditUrl: string | null;
}

// ── Data-category helpers ──────────────────────────────────────────────────────

interface SfDataCategory {
  name: string;
  label: string;
  childCategories?: SfDataCategory[];
}

interface SfDataCategoryGroup {
  name: string;
  label: string;
  topCategories: SfDataCategory[];
}

interface SfDataCategoryGroupsResponse {
  categoryGroups: SfDataCategoryGroup[];
}

/** Flatten a nested category tree into a depth-annotated list. */
function flattenCategories(
  cats: SfDataCategory[],
  depth = 0
): { name: string; label: string; depth: number }[] {
  const out: { name: string; label: string; depth: number }[] = [];
  for (const cat of cats) {
    out.push({ name: cat.name, label: cat.label, depth });
    if (cat.childCategories?.length) {
      out.push(...flattenCategories(cat.childCategories, depth + 1));
    }
  }
  return out;
}

// ── Image URL rewriter ────────────────────────────────────────────────────────
// Salesforce rich-text bodies embed images as `/servlet/rtaImage?...` (relative
// to the org base URL). Browsers can't inject a Bearer token into <img> src
// requests, so we rewrite every SF image URL to route through our proxy.
function rewriteSfImageUrls(html: string, orgBaseUrl: string): string {
  return html.replace(
    /(<img\b[^>]*?\ssrc=")([^"]*?)(")/gi,
    (_match, pre, src, post) => {
      // Skip already-proxied URLs or data URIs
      if (src.startsWith("/api/knowledge/sf-image") || src.startsWith("data:")) {
        return `${pre}${src}${post}`;
      }
      // Make relative paths absolute using the org base URL
      const abs = src.startsWith("http") ? src : `${orgBaseUrl}${src.startsWith("/") ? "" : "/"}${src}`;
      // Only proxy URLs that belong to Salesforce (contains .salesforce.com or .force.com
      // or was originally a relative path on the same org)
      const isSfUrl =
        abs.includes(".salesforce.com") ||
        abs.includes(".force.com") ||
        abs.startsWith(orgBaseUrl);
      if (!isSfUrl) return `${pre}${src}${post}`;
      return `${pre}/api/knowledge/sf-image?url=${encodeURIComponent(abs)}${post}`;
    }
  );
}

// Allowed hostname suffixes for the SF image proxy.
// Only *.salesforce.com and *.force.com are valid SF org hosts.
const SF_ALLOWED_HOSTS = [".salesforce.com", ".force.com"];

// Allowed path prefixes for the SF image proxy.
// SF rich-text images are always served under /servlet/rtaImage.
const SF_ALLOWED_PATH_PREFIXES = ["/servlet/rtaImage", "/servlet/imageserver"];

function isSfImageUrlAllowed(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();
  const pathOk = SF_ALLOWED_PATH_PREFIXES.some(p => parsed.pathname.startsWith(p));
  const hostOk = SF_ALLOWED_HOSTS.some(suffix => host.endsWith(suffix));
  return hostOk && pathOk;
}

// GET /api/knowledge/sf-image  — authenticated image proxy for SF rich-text content
// Requires staff authentication. Only proxies *.salesforce.com / *.force.com
// image paths (e.g. /servlet/rtaImage); all other paths are rejected.
// Query params: url=<encoded absolute SF image URL>
router.get("/knowledge/sf-image", requireStaff, async (req, res): Promise<void> => {
  const rawUrl = req.query["url"] as string | undefined;
  if (!rawUrl) {
    res.status(400).json({ error: "Missing url param" });
    return;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid url param" });
    return;
  }
  // Strict allowlist: host must be *.salesforce.com or *.force.com AND path must
  // match a known SF image prefix. This prevents the connector proxy from being
  // used to reach arbitrary SF REST endpoints.
  if (!isSfImageUrlAllowed(parsedUrl)) {
    res.status(400).json({ error: "URL is not an allowed Salesforce image host/path" });
    return;
  }
  // Build just the path+query portion to pass through the connector proxy
  const sfPath = `${parsedUrl.pathname}${parsedUrl.search}`;
  try {
    const client = new ConnectorSalesforceClient();
    const imgResp = await client.fetchRaw(sfPath);
    if (!imgResp.ok) {
      res.status(imgResp.status).json({ error: `SF image fetch failed: ${imgResp.status}` });
      return;
    }
    // Only forward image/* content types; reject unexpected responses.
    const contentType = imgResp.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      res.status(502).json({ error: "Unexpected content type from Salesforce" });
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buf = await imgResp.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    req.log.warn({ err, sfPath }, "SF image proxy failed");
    res.status(502).json({ error: "Could not fetch image from Salesforce" });
  }
});


// GET /api/knowledge/sf-article-categories
// Returns all data category groups and their categories for Knowledge articles.
// Returns { groups: [] } gracefully if categories are not configured in this org.
router.get("/knowledge/sf-article-categories", async (req, res): Promise<void> => {
  try {
    const client = new ConnectorSalesforceClient();
    const data = await client.rest<SfDataCategoryGroupsResponse>(
      `/services/data/v62.0/support/dataCategoryGroups?sObjectType=KnowledgeArticleVersion`
    );
    const groups = (data.categoryGroups ?? []).map(g => ({
      name:       g.name,
      label:      g.label,
      categories: flattenCategories(g.topCategories ?? []),
    }));
    res.json({ groups });
  } catch (err) {
    req.log.warn(err, "Failed to fetch SF data category groups — returning empty");
    res.json({ groups: [] });
  }
});

// ── KnowledgeArticleVersion field discovery ────────────────────────────────────
// Orgs vary in which optional fields exist on KAV. We describe the object once
// per server lifetime and cache the result so every article query uses only the
// fields that are actually present. This prevents INVALID_FIELD 400 errors from
// fields like ArticleType or IsVisibleInApp that may not exist in all orgs.

const ALWAYS_REQUIRED_KAV_FIELDS = [
  "Id", "KnowledgeArticleId", "Title", "PublishStatus", "CreatedDate", "LastModifiedDate",
] as const;

const OPTIONAL_KAV_FIELDS = [
  "Summary", "ArticleType", "VersionNumber", "IsVisibleInApp", "Language", "UrlName",
] as const;

type OptionalKavField = typeof OPTIONAL_KAV_FIELDS[number];

interface KavFieldSet {
  selectList: string;          // comma-joined SELECT fields
  has: (f: OptionalKavField) => boolean;
}

let kavFieldSetCache: KavFieldSet | null = null;
let kavFieldSetInflight: Promise<KavFieldSet> | null = null;

async function getKavFieldSet(client: ConnectorSalesforceClient, log: { warn: (msg: string) => void }): Promise<KavFieldSet> {
  if (kavFieldSetCache) return kavFieldSetCache;
  if (kavFieldSetInflight) return kavFieldSetInflight;

  kavFieldSetInflight = (async (): Promise<KavFieldSet> => {
    let presentOptional = new Set<string>(OPTIONAL_KAV_FIELDS);
    try {
      const desc = await client.rest<{ fields: { name: string }[] }>(
        `/services/data/v62.0/sobjects/KnowledgeArticleVersion/describe`
      );
      const orgFields = new Set(desc.fields.map(f => f.name));
      presentOptional = new Set(OPTIONAL_KAV_FIELDS.filter(f => orgFields.has(f)));
    } catch {
      log.warn("Could not describe KnowledgeArticleVersion — using minimal field set");
      presentOptional = new Set<string>();
    }

    const allFields = [...ALWAYS_REQUIRED_KAV_FIELDS, ...OPTIONAL_KAV_FIELDS.filter(f => presentOptional.has(f))];
    const result: KavFieldSet = {
      selectList: allFields.join(", "),
      has: (f) => presentOptional.has(f),
    };
    kavFieldSetCache = result;
    return result;
  })();

  try {
    return await kavFieldSetInflight;
  } finally {
    kavFieldSetInflight = null;
  }
}

// ── KAV body-field discovery ───────────────────────────────────────────────────
// The article body lives on a separate __kav object (e.g. Knowledge__kav,
// How_To__kav). We discover the right object + field once per server lifetime
// via EntityDefinition, then describe that object to find rich-text/textarea
// fields that are likely the body. Falls back to a null body if nothing found.

interface KavBodyInfo {
  objectName: string;
  fieldName:  string;
}

// undefined = not yet fetched; null = fetched, nothing found; KavBodyInfo = found
let kavBodyInfoCache: KavBodyInfo | null | undefined = undefined;
let kavBodyInfoInflight: Promise<KavBodyInfo | null> | null = null;

async function getKavBodyInfo(
  client: ConnectorSalesforceClient,
  log: { warn: (msg: string) => void; info: (msg: string) => void }
): Promise<KavBodyInfo | null> {
  if (kavBodyInfoCache !== undefined) return kavBodyInfoCache;
  if (kavBodyInfoInflight) return kavBodyInfoInflight;

  kavBodyInfoInflight = (async (): Promise<KavBodyInfo | null> => {
    try {
      // 1. Find all __kav objects in this org via EntityDefinition
      const entityResult = await client.query<{ QualifiedApiName: string }>(
        `SELECT QualifiedApiName FROM EntityDefinition
         WHERE QualifiedApiName LIKE '%__kav'
         LIMIT 10`
      );
      const kavObjects = entityResult.records.map(r => r.QualifiedApiName);
      log.info(`KAV body discovery: found __kav objects: ${kavObjects.join(", ") || "(none)"}`);

      if (!kavObjects.length) {
        kavBodyInfoCache = null;
        return null;
      }

      // 2. Describe each __kav object, look for rich-text / body-like fields.
      // Candidates are checked in order; first match wins.
      const BODY_FIELD_CANDIDATES = [
        // Generic body field names
        "Body__c", "Content__c", "ArticleBody", "ArticleBody__c",
        // Procedural / how-to article types
        "Procedure__c", "Steps__c", "Instructions__c",
        // FAQ / Q&A article types
        "Answer__c", "Question__c", "Resolution__c",
        // Other common patterns
        "Details__c", "Description__c", "Overview__c",
        "Text__c", "Information__c", "Solution__c",
      ];

      for (const objName of kavObjects) {
        try {
          const desc = await client.rest<{ fields: { name: string; type: string; label: string }[] }>(
            `/services/data/v62.0/sobjects/${objName}/describe`
          );

          // Log every field so we can diagnose which one holds the body
          const fieldSummary = desc.fields
            .map(f => `${f.name}[${f.type}]`)
            .join(", ");
          log.info(`KAV body discovery: ${objName} fields → ${fieldSummary}`);

          const fieldNames = new Set(desc.fields.map(f => f.name));

          // Prefer explicit candidates first
          for (const candidate of BODY_FIELD_CANDIDATES) {
            if (fieldNames.has(candidate)) {
              const info = { objectName: objName, fieldName: candidate };
              log.info(`KAV body discovery: using ${objName}.${candidate}`);
              kavBodyInfoCache = info;
              return info;
            }
          }

          // Fall back: prefer custom __c textarea/richTextArea fields over bare system fields.
          // Type comparison is case-insensitive — SF API returns "richTextArea" (capital A).
          const EXCLUDE = new Set([
            "Summary__c", "Summary", "Title", "UrlName", "PublishStatus", "Name",
            "AssignmentNote", "ArticleTotalViewCount", "ArticleCreatedById",
          ]);
          const isBodyType = (t: string) =>
            t.toLowerCase() === "richtextarea" || t.toLowerCase() === "textarea";

          const allTextFields = desc.fields.filter(
            f => isBodyType(f.type) && !EXCLUDE.has(f.name)
          );
          // Prefer custom fields (ending __c) over standard fields
          const richFields = [
            ...allTextFields.filter(f => f.name.endsWith("__c")),
            ...allTextFields.filter(f => !f.name.endsWith("__c")),
          ];
          log.info(`KAV body discovery: ${objName} candidate body fields: ${richFields.map(f => `${f.name}[${f.type}]`).join(", ") || "(none)"}`);

          if (richFields.length > 0) {
            const info = { objectName: objName, fieldName: richFields[0]!.name };
            log.info(`KAV body discovery: selected ${objName}.${richFields[0]!.name}`);
            kavBodyInfoCache = info;
            return info;
          }
        } catch (descErr) {
          log.warn(`KAV body discovery: could not describe ${objName}: ${String(descErr)}`);
        }
      }

      log.warn("KAV body discovery: no body field found in any __kav object");
      kavBodyInfoCache = null;
      return null;
    } catch (err) {
      log.warn(`KAV body discovery failed: ${String(err)}`);
      kavBodyInfoCache = null;
      return null;
    }
  })();

  try {
    return await kavBodyInfoInflight;
  } finally {
    kavBodyInfoInflight = null;
  }
}

// ── KAV all-body-fields discovery ─────────────────────────────────────────────
// Companion to getKavBodyInfo: discovers ALL rich-text / textarea fields on the
// __kav object so the detail route can return every populated content section.

interface KavBodyField {
  name: string;
  label: string;
}

interface KavAllBodyInfo {
  objectName: string;
  fields: KavBodyField[];
}

let kavAllBodyInfoCache: KavAllBodyInfo | null | undefined = undefined;
let kavAllBodyInfoInflight: Promise<KavAllBodyInfo | null> | null = null;

/** Exported for test isolation only — resets all module-level KAV discovery caches. */
export function resetKavBodyInfoCachesForTest(): void {
  kavFieldSetCache       = null;
  kavFieldSetInflight    = null;
  kavBodyInfoCache       = undefined;
  kavBodyInfoInflight    = null;
  kavAllBodyInfoCache    = undefined;
  kavAllBodyInfoInflight = null;
}

async function getKavAllBodyFields(
  client: ConnectorSalesforceClient,
  log: { warn: (msg: string) => void; info: (msg: string) => void }
): Promise<KavAllBodyInfo | null> {
  if (kavAllBodyInfoCache !== undefined) return kavAllBodyInfoCache;
  if (kavAllBodyInfoInflight) return kavAllBodyInfoInflight;

  kavAllBodyInfoInflight = (async (): Promise<KavAllBodyInfo | null> => {
    try {
      const entityResult = await client.query<{ QualifiedApiName: string }>(
        `SELECT QualifiedApiName FROM EntityDefinition
         WHERE QualifiedApiName LIKE '%__kav'
         LIMIT 10`
      );
      const kavObjects = entityResult.records.map(r => r.QualifiedApiName);
      log.info(`KAV all-fields discovery: found __kav objects: ${kavObjects.join(", ") || "(none)"}`);

      if (!kavObjects.length) { kavAllBodyInfoCache = null; return null; }

      const EXCLUDE = new Set([
        "Summary__c", "Summary", "Title", "UrlName", "PublishStatus", "Name",
        "AssignmentNote", "ArticleTotalViewCount", "ArticleCreatedById",
      ]);
      const isBodyType = (t: string) =>
        t.toLowerCase() === "richtextarea" || t.toLowerCase() === "textarea";

      for (const objName of kavObjects) {
        try {
          const desc = await client.rest<{ fields: { name: string; type: string; label: string }[] }>(
            `/services/data/v62.0/sobjects/${objName}/describe`
          );
          const allTextFields = desc.fields.filter(
            f => isBodyType(f.type) && !EXCLUDE.has(f.name)
          );
          // Prefer custom fields (ending __c) over standard fields
          const richFields: KavBodyField[] = [
            ...allTextFields.filter(f => f.name.endsWith("__c")).map(f => ({ name: f.name, label: f.label })),
            ...allTextFields.filter(f => !f.name.endsWith("__c")).map(f => ({ name: f.name, label: f.label })),
          ];
          log.info(`KAV all-fields discovery: ${objName} → ${richFields.map(f => f.name).join(", ") || "(none)"}`);

          if (richFields.length > 0) {
            const info: KavAllBodyInfo = { objectName: objName, fields: richFields };
            kavAllBodyInfoCache = info;
            return info;
          }
        } catch (descErr) {
          log.warn(`KAV all-fields discovery: could not describe ${objName}: ${String(descErr)}`);
        }
      }

      kavAllBodyInfoCache = null;
      return null;
    } catch (err) {
      log.warn(`KAV all-fields discovery failed: ${String(err)}`);
      kavAllBodyInfoCache = null;
      return null;
    }
  })();

  try {
    return await kavAllBodyInfoInflight;
  } finally {
    kavAllBodyInfoInflight = null;
  }
}

// ── SOSL helpers ──────────────────────────────────────────────────────────────

/** Escape special characters inside a SOSL FIND {} clause. */
function soslEscape(term: string): string {
  // Characters that must be escaped within FIND {}: \ { }
  return term.replace(/[\\{}]/g, "\\$&");
}

/**
 * Extract a ~150-char excerpt from `text` around the first occurrence of `query`.
 * Returns null when `query` is not found in `text`.
 */
function extractSnippet(query: string, text: string | null): string | null {
  if (!text || !query) return null;
  const lc    = text.toLowerCase();
  const qLc   = query.toLowerCase();
  const idx   = lc.indexOf(qLc);
  if (idx === -1) return null;
  const CONTEXT = 70;
  const start  = Math.max(0, idx - CONTEXT);
  const end    = Math.min(text.length, idx + query.length + CONTEXT);
  let snippet  = text.slice(start, end).trim();
  if (start > 0)             snippet = "\u2026" + snippet;
  if (end < text.length)     snippet = snippet + "\u2026";
  return snippet;
}

// GET /api/knowledge/sf-articles
// Lists Salesforce Knowledge articles. Optional query params:
//   status  — 'online' (default) | 'draft' | 'all'
//   type    — article type filter (ArticleType field; skipped if field absent in org)
//   q       — full-text search (≥3 chars: uses SOSL IN ALL FIELDS; <3 chars: ignored)
//   cat     — data category filter as 'GroupApiName:CategoryApiName'
//             e.g. 'Topics:Products' → WITH DATA CATEGORY Topics BELOW Products
router.get("/knowledge/sf-articles", async (req, res): Promise<void> => {
  try {
    const client = new ConnectorSalesforceClient();
    const fields = await getKavFieldSet(client, { warn: (m) => req.log.warn(m) });

    const statusParam = typeof req.query["status"] === "string" ? req.query["status"] : "online";
    const typeParam   = typeof req.query["type"]   === "string" ? req.query["type"]   : "";
    const qParam      = typeof req.query["q"]      === "string" ? req.query["q"].trim() : "";
    const catParam    = typeof req.query["cat"]    === "string" ? req.query["cat"]    : "";
    // sort=oldest → ORDER BY LastModifiedDate ASC (used by review queue to surface most-stale articles first)
    const sortParam   = typeof req.query["sort"]   === "string" ? req.query["sort"]   : "newest";
    const orderDir    = sortParam === "oldest" ? "ASC" : "DESC";

    // Build WITH DATA CATEGORY (valid for both SOQL and SOSL).
    let withDataCategory = "";
    if (catParam && catParam.includes(":")) {
      const colonIdx  = catParam.indexOf(":");
      const groupName = catParam.slice(0, colonIdx).replace(/[^a-zA-Z0-9_]/g, "");
      const catName   = catParam.slice(colonIdx + 1).replace(/[^a-zA-Z0-9_]/g, "");
      if (groupName && catName) {
        withDataCategory = `WITH DATA CATEGORY ${groupName} BELOW ${catName}`;
      }
    }

    // Build publish-status condition (reused in both SOQL and SOSL WHERE).
    const statusClause =
      statusParam === "all"   ? "PublishStatus IN ('online', 'draft')" :
      statusParam === "draft" ? "PublishStatus = 'draft'"              :
                                "PublishStatus = 'online'";

    type KavRow = {
      Id: string; KnowledgeArticleId: string; Title: string; Summary?: string;
      ArticleType?: string; PublishStatus: string; VersionNumber?: number;
      CreatedDate: string; LastModifiedDate: string;
      IsVisibleInApp?: boolean; Language?: string;
    };

    let records: KavRow[] = [];
    let totalSize = 0;

    // ── Full-text SOSL (≥3 chars) ───────────────────────────────────────────
    if (qParam.length >= 3) {
      // Build WHERE inside the RETURNING clause.
      const returningWhereClauses: string[] = [statusClause];
      if (typeParam && fields.has("ArticleType")) {
        returningWhereClauses.push(`ArticleType = '${typeParam.replace(/'/g, "\\'")}'`);
      }
      const returningWhere = returningWhereClauses.join(" AND ");

      // SOSL: FIND {term} IN ALL FIELDS RETURNING KnowledgeArticleVersion(fields WHERE ... ORDER BY ... LIMIT ...)
      // WITH DATA CATEGORY goes after RETURNING.
      const soslQuery =
        `FIND {${soslEscape(qParam)}} IN ALL FIELDS ` +
        `RETURNING KnowledgeArticleVersion(${fields.selectList} ` +
        `WHERE ${returningWhere} ORDER BY LastModifiedDate ${orderDir} LIMIT 200) ` +
        `${withDataCategory}`;

      const encoded = encodeURIComponent(soslQuery);
      const soslResult = await client.rest<{
        searchRecords: (KavRow & { attributes: unknown })[];
      }>(`/services/data/v62.0/search/?q=${encoded}`);

      records   = soslResult.searchRecords ?? [];
      totalSize = records.length;

    // ── Standard SOQL (no search term or <3 chars) ──────────────────────────
    } else {
      const whereClauses: string[] = [statusClause];
      if (typeParam && fields.has("ArticleType")) {
        whereClauses.push(`ArticleType = '${typeParam.replace(/'/g, "\\'")}'`);
      }
      const where = `WHERE ${whereClauses.join(" AND ")}`;

      // WITH DATA CATEGORY must come between WHERE and ORDER BY in SOQL.
      const soql = `SELECT ${fields.selectList}
                    FROM KnowledgeArticleVersion
                    ${where}
                    ${withDataCategory}
                    ORDER BY LastModifiedDate ${orderDir}
                    LIMIT 200`;

      const result = await client.query<KavRow>(soql);
      records   = result.records;
      totalSize = result.totalSize;
    }

    const typeSet = fields.has("ArticleType")
      ? new Set(records.map(r => r.ArticleType).filter(Boolean))
      : new Set<string>();

    const articles: SfArticle[] = records.map(r => {
      // Generate snippet: prefer summary excerpt, fall back to body-match indicator.
      let snippet: string | null = null;
      let bodyMatch = false;
      if (qParam.length >= 3) {
        snippet = extractSnippet(qParam, r.Summary ?? null);
        if (!snippet) {
          // Match wasn't in the summary — it came from the body or title.
          const titleMatches = r.Title.toLowerCase().includes(qParam.toLowerCase());
          bodyMatch = !titleMatches;
        }
      }
      return {
        id:                 r.Id,
        knowledgeArticleId: r.KnowledgeArticleId,
        title:              r.Title,
        summary:            r.Summary ?? null,
        articleType:        r.ArticleType ?? null,
        publishStatus:      r.PublishStatus,
        versionNumber:      r.VersionNumber ?? null,
        createdDate:        r.CreatedDate,
        lastModifiedDate:   r.LastModifiedDate,
        isVisibleInApp:     r.IsVisibleInApp ?? false,
        language:           r.Language ?? "en_US",
        dataCategories:     [],
        snippet,
        bodyMatch,
      };
    });

    res.json({
      articles,
      total:        totalSize,
      articleTypes: Array.from(typeSet),
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch SF Knowledge articles");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Salesforce query failed: ${msg}`, articles: [] });
  }
});

// GET /api/knowledge/sf-articles/:id
// Returns full detail for a single article version, including body content.
// :id is the KnowledgeArticleVersion Id.
router.get("/knowledge/sf-articles/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const client = new ConnectorSalesforceClient();

    // Reuse the cached field set so we never SELECT fields absent in this org.
    const fields = await getKavFieldSet(client, { warn: (m) => req.log.warn(m) });

    const metaSoql = `SELECT ${fields.selectList}
                      FROM KnowledgeArticleVersion
                      WHERE Id = '${id}'
                      LIMIT 1`;
    const metaResult = await client.query<{
      Id: string; KnowledgeArticleId: string; Title: string; Summary?: string;
      ArticleType?: string; PublishStatus: string; VersionNumber?: number;
      CreatedDate: string; LastModifiedDate: string;
      IsVisibleInApp?: boolean; Language?: string; UrlName?: string;
    }>(metaSoql);

    if (!metaResult.records.length) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    const meta = metaResult.records[0]!;

    // Fetch ALL content fields from the article-type __kav object.
    const sections: ArticleSection[] = [];
    let body: string | null = null;
    let orgBaseUrl: string | null = null;
    const allBodyInfo = await getKavAllBodyFields(client, {
      warn: (m) => req.log.warn(m),
      info: (m) => req.log.info(m),
    });
    if (allBodyInfo && allBodyInfo.fields.length > 0) {
      try {
        const fieldList = allBodyInfo.fields.map(f => f.name).join(", ");
        const bodySoql = `SELECT Id, ${fieldList}
                          FROM ${allBodyInfo.objectName}
                          WHERE KnowledgeArticleId = '${meta.KnowledgeArticleId}'
                          AND PublishStatus = '${meta.PublishStatus}'
                          LIMIT 1`;
        const bodyResult = await client.query<{ Id: string; [k: string]: string | undefined }>(bodySoql);
        const row = bodyResult.records[0];
        if (row) {
          // Fetch org base URL once for image rewriting across all sections.
          try { orgBaseUrl = await client.getOrgBaseUrl(); } catch { /* ok — images will load without rewrite */ }

          for (const field of allBodyInfo.fields) {
            const raw = row[field.name] ?? null;
            if (!raw) continue;
            const html = (orgBaseUrl && raw.includes("<img"))
              ? rewriteSfImageUrls(raw, orgBaseUrl)
              : raw;
            sections.push({ label: field.label, html });
          }
          // Keep legacy `body` field as the first section for backward compat.
          body = sections[0]?.html ?? null;
        }
      } catch (bodyErr) {
        req.log.warn(`Body fetch failed for ${allBodyInfo.objectName}: ${String(bodyErr)}`);
      }
    }

    // Ensure we have the org base URL for building Salesforce record links
    if (!orgBaseUrl) {
      try { orgBaseUrl = await client.getOrgBaseUrl(); } catch { /* ok */ }
    }
    const sfType    = meta.ArticleType ?? 'Knowledge__kav';
    const sfUrl     = orgBaseUrl ? `${orgBaseUrl}/lightning/r/${sfType}/${meta.Id}/view` : null;
    const sfEditUrl = orgBaseUrl ? `${orgBaseUrl}/lightning/r/${sfType}/${meta.Id}/edit` : null;

    const article: SfArticleDetail = {
      id:                 meta.Id,
      knowledgeArticleId: meta.KnowledgeArticleId,
      title:              meta.Title,
      summary:            meta.Summary ?? null,
      articleType:        meta.ArticleType ?? null,
      publishStatus:      meta.PublishStatus,
      versionNumber:      meta.VersionNumber ?? null,
      createdDate:        meta.CreatedDate,
      lastModifiedDate:   meta.LastModifiedDate,
      isVisibleInApp:     meta.IsVisibleInApp ?? false,
      language:           meta.Language ?? "en_US",
      dataCategories:     [],
      urlName:            meta.UrlName ?? null,
      body,
      sections,
      sfUrl,
      sfEditUrl,
    };

    res.json({ article });
  } catch (err) {
    req.log.error(err, "Failed to fetch SF Knowledge article detail");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Salesforce query failed: ${msg}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE REVIEW ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/knowledge/sf-article-reviews
// Returns all recorded review timestamps so the frontend can filter the queue.
router.get("/knowledge/sf-article-reviews", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(articleReviewsTable)
      .orderBy(desc(articleReviewsTable.reviewedAt));
    res.json({ reviews: rows });
  } catch (err) {
    req.log.error(err, "Failed to fetch article reviews");
    res.status(500).json({ error: "Failed to fetch article reviews" });
  }
});

// POST /api/knowledge/sf-articles/sync
// ─────────────────────────────────────────────────────────────────────────────
// buildSfSyncExistingMap — exported for unit testing
//
// Builds a unified map from SF KnowledgeArticleId (kaId) → { localId, status }
// by combining two query result sets:
//
//   byPkRows:   rows where knowledge_articles.id IN (sfArticleIds)
//               → articles originally synced FROM Salesforce (their local pk IS the kaId)
//
//   bySfIdRows: rows where knowledge_articles.sf_article_id IN (sfArticleIds)
//               → articles AUTHORED in Trail OS, published to SF, so their local pk
//                 differs from the kaId but sfArticleId matches.
//
// bySfIdRows entries overwrite byPkRows entries for the same kaId so that
// Trail OS-authored articles are always updated in-place rather than duplicated.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// normalizeArticleType — exported for unit testing
//
// When Salesforce returns an ArticleType that matches the discovered __kav object
// via its base name (e.g. "Knowledge" instead of "Knowledge__kav"), we must
// normalize it to the full canonical sObject API name before persisting. The
// publish endpoint uses the stored articleType directly as the Salesforce sObject
// name for the POST; an un-normalized base name like "Knowledge" would cause a
// POST to /sobjects/Knowledge which does not exist.
//
// Rules:
//   - If rawType matches the full canonicalKavObj name (case-insensitive) → canonical
//   - If rawType matches the base name (canonicalKavObj stripped of __kav) → canonical
//   - Otherwise → preserve rawType as-is (unknown type, handled by isMatchingType elsewhere)
//   - If canonicalKavObj is null (body discovery unavailable) → preserve rawType
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeArticleType(
  rawType: string | undefined | null,
  canonicalKavObj: string | null,
): string {
  const raw = rawType ?? "";
  if (!canonicalKavObj) return raw;
  const t    = raw.toLowerCase();
  const full = canonicalKavObj.toLowerCase();
  const base = canonicalKavObj.replace(/__kav$/i, "").toLowerCase();
  return (t === full || t === base) ? canonicalKavObj : raw;
}

export function buildSfSyncExistingMap(
  byPkRows:   Array<{ id: string; status: string }>,
  bySfIdRows: Array<{ id: string; status: string; sfArticleId: string | null }>,
): Map<string, { localId: string; status: string }> {
  const map = new Map<string, { localId: string; status: string }>();
  // Primary-key lookup first (directly-synced articles whose id IS the kaId)
  for (const r of byPkRows) {
    map.set(r.id, { localId: r.id, status: r.status });
  }
  // sfArticleId lookup second — Trail OS-authored articles preserve their local id.
  // These entries take precedence over any byPkRows entry for the same kaId.
  for (const r of bySfIdRows) {
    if (r.sfArticleId) {
      map.set(r.sfArticleId, { localId: r.id, status: r.status });
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulls all Salesforce Knowledge articles (Online + Draft) into the local
// knowledge_articles table so staff can edit and manage them through the
// Trail OS publish workflow.
//
// Deduplication:  KnowledgeArticleId is used as the local record id.
//                 Online version is preferred over Draft for the same article.
// Conflict rules: Articles in 'pending-review' or 'approved' state have their
//                 body and status preserved — only SF metadata is refreshed.
// Returns:        { total, created, updated, skipped, errors, syncedAt }
//
// The core logic lives in runSfArticleSync() below so the background job can
// call it directly without making an HTTP round-trip.

interface SyncLog {
  warn:  (obj: object | string, msg?: string) => void;
  info:  (obj: object | string, msg?: string) => void;
  error: (obj: object | string, msg?: string) => void;
}

export interface SfSyncResult {
  total:             number;
  created:           number;
  updated:           number;
  skipped:           number;
  errors:            number;
  syncedAt:          string;
  bodyFetchErrors?:  number;
  bodyFetchWarning?: string;
  typeSkipped?:      number;
  typeSkipNote?:     string;
}

/**
 * Paginate through all records for a SOQL query, following nextRecordsUrl.
 * Removes the need for a LIMIT clause and avoids silently truncating results.
 */
async function queryAll<T>(client: ConnectorSalesforceClient, soql: string): Promise<T[]> {
  type Page = { done: boolean; records: T[]; nextRecordsUrl?: string };
  const all: T[] = [];
  let page = await client.query<T>(soql) as Page;
  all.push(...page.records);
  while (!page.done && page.nextRecordsUrl) {
    page = await client.rest<Page>(page.nextRecordsUrl);
    all.push(...page.records);
  }
  return all;
}

/**
 * Core SF article sync logic.
 * Exported so the background job can call it without an HTTP round-trip.
 *
 * Row identity: articles are looked up by sfArticleId (the canonical SF ID) so
 * that locally-authored articles which were published to SF are refreshed rather
 * than duplicated. Backward compat: rows where id === KaId (older sync-imported
 * rows) are also matched via the id column through buildSfSyncExistingMap.
 */
export async function runSfArticleSync(log: SyncLog): Promise<SfSyncResult> {
  const client = new ConnectorSalesforceClient();
  const fields  = await getKavFieldSet(client, { warn: (m) => log.warn(m) });

  // ── 1. Fetch ALL KAV records (paginated — no LIMIT cap) ────────────────────
  // Sort Draft before Online so the deduplication loop lets Online win by
  // overwriting Draft entries as they appear later in the array.
  const soql = `SELECT ${fields.selectList}
                FROM KnowledgeArticleVersion
                WHERE PublishStatus IN ('online', 'draft')
                ORDER BY PublishStatus ASC, LastModifiedDate DESC`;

  type KavRow = {
    Id: string; KnowledgeArticleId: string; Title: string; Summary?: string;
    ArticleType?: string; PublishStatus: string; VersionNumber?: number;
    CreatedDate: string; LastModifiedDate: string;
    IsVisibleInApp?: boolean; Language?: string; UrlName?: string;
  };
  // queryAll follows SF nextRecordsUrl pages until done, so the full article
  // catalogue is synced regardless of org size.
  const kavRecords = await client.queryAll<KavRow>(soql);

  if (!kavRecords.length) {
    return { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, syncedAt: new Date().toISOString() };
  }

  // ── 2. Discover body fields for the supported __kav type ───────────────────
  const bodyInfo = await getKavAllBodyFields(client, { warn: (m) => log.warn(m), info: (m) => log.info(m) });
  const supportedKavObj  = bodyInfo?.objectName ?? null;
  const supportedKavBase = supportedKavObj?.replace(/__kav$/i, "") ?? null;

  function isMatchingType(articleType: string | undefined): boolean {
    if (!supportedKavObj) return true;
    if (!articleType) return false;
    const t = articleType.toLowerCase();
    return t === supportedKavObj.toLowerCase() || t === (supportedKavBase ?? "").toLowerCase();
  }

  // Deduplicate by KnowledgeArticleId — prefer Online over Draft.
  // Draft never overwrites any existing entry; between two Online versions keep
  // the newer LastModifiedDate (page-boundary safety).
  const deduped = new Map<string, KavRow>();
  let typeSkipped = 0;
  for (const r of kavRecords) {
    if (!isMatchingType(r.ArticleType)) { typeSkipped++; continue; }
    const existing  = deduped.get(r.KnowledgeArticleId);
    const curOnline = r.PublishStatus.toLowerCase() === "online";
    const exOnline  = existing?.PublishStatus.toLowerCase() === "online";
    if (!existing) {
      deduped.set(r.KnowledgeArticleId, r);
    } else if (curOnline && !exOnline) {
      deduped.set(r.KnowledgeArticleId, r);
    } else if (curOnline && exOnline && new Date(r.LastModifiedDate) > new Date(existing.LastModifiedDate)) {
      deduped.set(r.KnowledgeArticleId, r);
    }
  }
  if (typeSkipped > 0) {
    log.warn({ typeSkipped, supportedKavObj }, "Sync: skipped articles whose ArticleType does not match the discovered __kav object");
  }

  // ── 3. Batch-fetch body content aligned to selected __kav version Ids ──────
  // Query bodies by the specific __kav record Id (r.Id from deduped) so the
  // body is always from the exact version chosen by deduplication.
  // Chunking: ≤200 Ids per query keeps IN-clause length inside SF SOQL limits.
  // Failure: a failed body batch does NOT update the local body to empty;
  // bodyFetchFailedKaIds tracks affected articles so the upsert loop preserves
  // existing local content. New articles import with empty body (no prior content).
  const BODY_BATCH_SIZE = 200;
  const bodyByKaId           = new Map<string, string>();
  const bodyFetchFailedKaIds = new Set<string>();
  let bodyFetchErrors = 0;

  if (bodyInfo && bodyInfo.fields.length > 0) {
    const fieldList = bodyInfo.fields.map(f => f.name).join(", ");
    let orgBaseUrl: string | null = null;
    try { orgBaseUrl = await client.getOrgBaseUrl(); } catch { /* non-fatal */ }

    const kavVersionIdToKaId = new Map<string, string>();
    for (const [kaId, r] of deduped) kavVersionIdToKaId.set(r.Id, kaId);

    const allVersionIds = [...kavVersionIdToKaId.keys()];
    for (let batchStart = 0; batchStart < allVersionIds.length; batchStart += BODY_BATCH_SIZE) {
      const batchVersionIds = allVersionIds.slice(batchStart, batchStart + BODY_BATCH_SIZE);
      const batchKaIds      = batchVersionIds.map(vid => kavVersionIdToKaId.get(vid)!);
      const idList          = batchVersionIds.map(vid => `'${vid}'`).join(", ");
      const bodySoql = `SELECT Id, ${fieldList} FROM ${bodyInfo.objectName} WHERE Id IN (${idList})`;
      try {
        const bodyRows = await client.queryAll<{ Id: string; [k: string]: string | undefined }>(bodySoql);
        for (const row of bodyRows) {
          const kaId = kavVersionIdToKaId.get(row["Id"] ?? "") ?? "";
          if (!kaId) continue;
          const parts: string[] = [];
          for (const field of bodyInfo.fields) {
            const raw = row[field.name];
            if (!raw) continue;
            const html = orgBaseUrl && raw.includes("<img") ? rewriteSfImageUrls(raw, orgBaseUrl) : raw;
            parts.push(html);
          }
          if (parts.length > 0) bodyByKaId.set(kaId, parts.join("\n"));
        }
      } catch (bodyBatchErr) {
        bodyFetchErrors++;
        for (const kaId of batchKaIds) bodyFetchFailedKaIds.add(kaId);
        log.warn({ batchStart, batchSize: batchVersionIds.length, err: String(bodyBatchErr) },
          "Sync: body batch-fetch failed — existing bodies preserved, new articles will have empty bodies");
      }
    }
  } else if (!bodyInfo) {
    for (const kaId of deduped.keys()) bodyFetchFailedKaIds.add(kaId);
    bodyFetchErrors += 1;
    log.warn({ articlesAffected: bodyFetchFailedKaIds.size },
      "Sync: body-field discovery unavailable — existing article bodies preserved, new articles import with empty body");
  }

  // ── 4. Look up existing rows by id OR sfArticleId ──────────────────────────
  // a) id IN (sfArticleIds)        — originally-synced rows (id IS the KaId)
  // b) sfArticleId IN (sfArticleIds) — authored-in-Trail-OS, published-to-SF rows
  const sfArticleIds = [...deduped.keys()];
  const [byPkRows, bySfIdRows] = await Promise.all([
    db.select({ id: knowledgeArticlesTable.id, status: knowledgeArticlesTable.status })
      .from(knowledgeArticlesTable)
      .where(inArray(knowledgeArticlesTable.id, sfArticleIds)),
    db.select({ id: knowledgeArticlesTable.id, status: knowledgeArticlesTable.status, sfArticleId: knowledgeArticlesTable.sfArticleId })
      .from(knowledgeArticlesTable)
      .where(inArray(knowledgeArticlesTable.sfArticleId, sfArticleIds)),
  ]);
  const existingByKaId = buildSfSyncExistingMap(byPkRows, bySfIdRows);

  // ── 5. Upsert ──────────────────────────────────────────────────────────────
  let created = 0, updated = 0, skipped = 0, errors = 0;
  const now = new Date();

  function localSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  }

  for (const [kaId, r] of deduped) {
    try {
      const existing   = existingByKaId.get(kaId);
      const localId    = existing?.localId;
      const localSt    = existing?.status;
      const body       = bodyByKaId.get(kaId) ?? "";
      const bodyFailed = bodyFetchFailedKaIds.has(kaId);
      const sfStatus   = r.PublishStatus.toLowerCase() === "online" ? "published" : "draft";

      if (!localId) {
        // New article — insert with KaId as local PK so future syncs find it via id lookup.
        await db.insert(knowledgeArticlesTable).values({
          id:              kaId,
          title:           r.Title,
          summary:         r.Summary ?? "",
          body,
          category:        "",
          urlName:         r.UrlName ?? localSlug(r.Title),
          articleType:     normalizeArticleType(r.ArticleType, supportedKavObj),
          status:          sfStatus,
          sfArticleId:     r.KnowledgeArticleId,
          sfVersionId:     r.Id,
          sfPublishStatus: r.PublishStatus,
          publishedAt:     sfStatus === "published" ? now : null,
          createdAt:       new Date(r.CreatedDate),
          updatedAt:       new Date(r.LastModifiedDate),
        });
        created++;
      } else if (localSt === "pending-review" || localSt === "approved") {
        // In active review — refresh metadata only, leave body + status alone.
        await db.update(knowledgeArticlesTable)
          .set({ title: r.Title, summary: r.Summary ?? "", sfVersionId: r.Id, sfPublishStatus: r.PublishStatus, updatedAt: now })
          .where(eq(knowledgeArticlesTable.id, localId));
        skipped++;
      } else {
        // Full refresh — use localId so Trail OS-authored articles update in-place.
        // When body batch failed, omit body field to preserve existing local content.
        await db.update(knowledgeArticlesTable)
          .set({
            title:           r.Title,
            summary:         r.Summary ?? "",
            ...(bodyFailed ? {} : { body }),
            urlName:         r.UrlName ?? localSlug(r.Title),
            articleType:     normalizeArticleType(r.ArticleType, supportedKavObj),
            status:          sfStatus,
            sfArticleId:     r.KnowledgeArticleId,
            sfVersionId:     r.Id,
            sfPublishStatus: r.PublishStatus,
            publishedAt:     sfStatus === "published" ? now : null,
            updatedAt:       now,
          })
          .where(eq(knowledgeArticlesTable.id, localId));
        updated++;
      }
    } catch (itemErr) {
      log.warn({ kaId, err: String(itemErr) }, "Sync: failed to upsert article");
      errors++;
    }
  }

  log.info({ total: deduped.size, created, updated, skipped, errors, bodyFetchErrors, typeSkipped }, "SF articles sync complete");
  return {
    total:    deduped.size,
    created,
    updated,
    skipped,
    errors,
    syncedAt: now.toISOString(),
    ...(bodyFetchErrors > 0 && {
      bodyFetchErrors,
      bodyFetchWarning: `${bodyFetchErrors} body batch(es) failed; affected articles were imported with empty bodies. Retry sync to attempt recovery.`,
    }),
    ...(typeSkipped > 0 && {
      typeSkipped,
      typeSkipNote: `${typeSkipped} article versions skipped — their ArticleType does not match the supported __kav object (${supportedKavObj}). Only articles of the supported type are synced.`,
    }),
  };
}

router.post("/knowledge/sf-articles/sync", requireAdmin, async (req, res): Promise<void> => {
  try {
    const result = await runSfArticleSync(req.log);
    // Keep the in-process job state current so GET /sf-sync-status reflects manual syncs.
    recordManualSync(result);
    res.json(result);
  } catch (err) {
    req.log.error(err, "SF articles sync failed");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Sync failed: ${msg}` });
  }
});

// GET /api/knowledge/sf-sync-status
// Returns the current auto-sync settings and the last-synced timestamp.
// Used by the SF Articles toolbar to display freshness.
router.get("/knowledge/sf-sync-status", async (req, res): Promise<void> => {
  try {
    const jobStatus = getSyncJobStatus();

    // Read current settings from DB.
    const rows = await db
      .select({ enabled: sfSyncSettingsTable.enabled, intervalHours: sfSyncSettingsTable.intervalHours })
      .from(sfSyncSettingsTable)
      .where(eq(sfSyncSettingsTable.id, "default"))
      .limit(1);

    const settings = rows[0] ?? { enabled: true, intervalHours: 6 };

    res.json({
      lastSyncAt:     jobStatus.lastSyncAt,
      lastSyncResult: jobStatus.lastSyncResult,
      autoSyncEnabled: settings.enabled,
      intervalHours:  settings.intervalHours,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch SF sync status");
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

// PATCH /api/knowledge/sf-sync-settings
// Lets admins configure the auto-sync schedule (enabled flag + interval hours).
router.patch("/knowledge/sf-sync-settings", requireAdmin, async (req, res): Promise<void> => {
  try {
    const body = req.body as { enabled?: boolean; intervalHours?: number };

    // Validate intervalHours up-front so an invalid value is never persisted,
    // even on the initial insert (where no prior row exists to conflict against).
    const rawHours = body.intervalHours;
    if (rawHours !== undefined) {
      if (
        typeof rawHours !== "number" ||
        !Number.isFinite(rawHours) ||
        !Number.isInteger(rawHours) ||
        rawHours < 1 ||
        rawHours > 168
      ) {
        res.status(400).json({ error: "intervalHours must be an integer between 1 and 168" });
        return;
      }
    }
    const safeHours = rawHours as number | undefined;

    const updatedBy = (req.user as { email?: string } | undefined)?.email ?? null;
    const now = new Date();

    // Use the validated values in BOTH the INSERT and the ON CONFLICT UPDATE so
    // neither path can write an unvalidated value.
    const insertEnabled    = typeof body.enabled === "boolean" ? body.enabled : true;
    const insertHours      = safeHours ?? 6;
    const conflictSet: Record<string, unknown> = { updatedBy, updatedAt: now };
    if (typeof body.enabled === "boolean")  conflictSet["enabled"]      = body.enabled;
    if (safeHours !== undefined)            conflictSet["intervalHours"] = safeHours;

    await db
      .insert(sfSyncSettingsTable)
      .values({ id: "default", enabled: insertEnabled, intervalHours: insertHours, updatedBy, updatedAt: now })
      .onConflictDoUpdate({ target: sfSyncSettingsTable.id, set: conflictSet });

    const rows = await db
      .select({ enabled: sfSyncSettingsTable.enabled, intervalHours: sfSyncSettingsTable.intervalHours })
      .from(sfSyncSettingsTable)
      .where(eq(sfSyncSettingsTable.id, "default"))
      .limit(1);

    res.json({ settings: rows[0] ?? { enabled: true, intervalHours: 6 } });
  } catch (err) {
    req.log.error(err, "Failed to update SF sync settings");
    res.status(500).json({ error: "Failed to update sync settings" });
  }
});

// POST /api/knowledge/sf-articles/:id/mark-reviewed
// Records that the authenticated user reviewed this article right now.
// :id is the KnowledgeArticleVersion Id (same as used in the list/detail routes).
//
// Cadence: Knowledge Articles are reviewed biannually (every 6 months) per the
// Governance Ownership Matrix. next_review_due is set to 6 months from now.
const KNOWLEDGE_ARTICLE_REVIEW_MONTHS = 6;

router.post("/knowledge/sf-articles/:id/mark-reviewed", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!id || typeof id !== "string" || id.length === 0) {
    res.status(400).json({ error: "Invalid article id" });
    return;
  }
  try {
    const reviewedBy: string | null =
      (req.user as { email?: string } | undefined)?.email ?? null;

    const now = new Date();
    const nextReviewDue = new Date(now);
    nextReviewDue.setMonth(nextReviewDue.getMonth() + KNOWLEDGE_ARTICLE_REVIEW_MONTHS);

    const [row] = await db
      .insert(articleReviewsTable)
      .values({ articleId: id, reviewedBy, nextReviewDue })
      .returning();

    res.status(201).json({ review: row });
  } catch (err) {
    req.log.error(err, "Failed to record article review");
    res.status(500).json({ error: "Failed to record review" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ROUTES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

interface SourceDocument {
  id: string;
  entityType: "document";
  name: string;
  category: string;
  status: "Active" | "Draft" | "Deprecated" | "Archived";
  confidence: "confirmed" | "needs-review" | "draft" | "deprecated";
  owner: string;
  lastUpdated: string;
  programs: string[];
  summary: string;
  purpose: string;
  quickTake: string;
  keyDecisionsInfluenced: string[];
  sourceOfTruthFor: string[];
  notSourceOfTruthFor: string[];
  keySections: string[];
  relatedDocuments: string[];
  driveUrl?: string;
}

const SEED_DOCS: SourceDocument[] = [
  { id: "1",  entityType: "document", name: "Brand Book",                   category: "Brand",       status: "Active",  confidence: "confirmed", owner: "Leadership",         lastUpdated: "Jun 2025", programs: ["All"],                                  summary: "Defines Transition Trails' visual identity, voice, tone, and design system.",                                                                                     purpose: "Establish and protect brand consistency across all programs, materials, and communications.",           quickTake: "If it carries a Transition Trails name or logo, this document governs how it looks and sounds.",          keyDecisionsInfluenced: ["Logo and color usage", "Typography standards", "Tone of voice for all materials"],     sourceOfTruthFor: ["Brand colors and palette", "Logo usage rules", "Typography hierarchy"],     notSourceOfTruthFor: ["Program curriculum", "Pricing", "Org structure"],         keySections: ["Brand story", "Color system", "Typography", "Logo usage", "Voice and tone guidelines"],         relatedDocuments: ["Master Program Overview", "Facilitator Guide"] },
  { id: "2",  entityType: "document", name: "Master Program Overview",       category: "Strategy",    status: "Active",  confidence: "confirmed", owner: "Program Director",   lastUpdated: "Jun 2025", programs: ["All"],                                  summary: "High-level strategic overview of all Transition Trails programs and organizational purpose.",                                                                      purpose: "Provide a single authoritative reference for program scope, positioning, and strategic intent.",        quickTake: "Start here if you are new to Transition Trails or need to explain the program ecosystem.",                keyDecisionsInfluenced: ["Program sequencing decisions", "Entry-point definitions", "Partnership positioning"], sourceOfTruthFor: ["Program sequence and dependencies", "Ecosystem structure"],          notSourceOfTruthFor: ["Detailed curriculum content", "Pricing figures"],         keySections: ["Program overview table", "Audience matrix", "Program dependencies"],             relatedDocuments: ["Program Comparison Sheet", "Brand Book", "Pricing Analysis"] },
  { id: "3",  entityType: "document", name: "Explorer's Trail Blueprint",    category: "Program",     status: "Active",  confidence: "confirmed", owner: "Curriculum Lead",    lastUpdated: "May 2025", programs: ["Explorer's Trail"],                     summary: "Comprehensive design document for Explorer's Trail including learning objectives and session structure.",                                                           purpose: "Serve as the complete operational and curricular reference for delivering Explorer's Trail.",            quickTake: "The single source of truth for what Explorer's Trail teaches, how it is structured, and who delivers it.", keyDecisionsInfluenced: ["Session plan design", "Facilitator preparation", "Learner eligibility"],             sourceOfTruthFor: ["Explorer's Trail learning objectives", "Session structure"],  notSourceOfTruthFor: ["Pricing", "Organization-wide strategy"],                   keySections: ["Program overview", "Learning objectives", "Session-by-session plan", "Facilitator notes"],      relatedDocuments: ["Facilitator Guide", "Master Program Overview"] },
  { id: "4",  entityType: "document", name: "Foundations Trail Blueprint",   category: "Program",     status: "Active",  confidence: "confirmed", owner: "Curriculum Lead",    lastUpdated: "May 2025", programs: ["Foundations Trail"],                    summary: "Comprehensive design document for Foundations Trail covering technical curriculum and hybrid delivery.",                                                            purpose: "Serve as the complete operational and curricular reference for delivering Foundations Trail.",           quickTake: "The source of truth for Foundations Trail content, structure, and learning expectations.",                keyDecisionsInfluenced: ["Technical content selection", "Assessment design", "Hybrid session structure"],       sourceOfTruthFor: ["Foundations Trail curriculum", "Technical modules", "Learning sequence"], notSourceOfTruthFor: ["Pricing", "Ecosystem-wide dependencies"],                  keySections: ["Program overview", "Technical curriculum map", "Salesforce module", "Assessment approach"],     relatedDocuments: ["Explorer's Trail Blueprint", "Guided Trail Blueprint", "Facilitator Guide"] },
  { id: "5",  entityType: "document", name: "Guided Trail Blueprint",        category: "Program",     status: "Active",  confidence: "confirmed", owner: "Curriculum Lead",    lastUpdated: "Jun 2025", programs: ["Guided Trail"],                         summary: "The definitive reference for Guided Trail — the flagship 12-week sprint-based program.",                                                                           purpose: "Provide the complete design authority for Guided Trail curriculum, sprint structure, and delivery.",    quickTake: "Most important program document for Guided Trail facilitators and program managers.",                      keyDecisionsInfluenced: ["Sprint module design", "Project scope", "Facilitator team structure"],               sourceOfTruthFor: ["Guided Trail module content", "Sprint cadence overview"],     notSourceOfTruthFor: ["Week-by-week sprint schedules (see Sprint Cadence doc)", "Pricing"], keySections: ["Program philosophy", "Sprint structure overview", "Module content by sprint", "Portfolio and assessment"], relatedDocuments: ["Guided Trail Sprint Cadence", "RESOLVE Course Canvas", "Intern Workbook"] },
  { id: "6",  entityType: "document", name: "Trail of Mastery Proposal",     category: "Program",     status: "Draft",   confidence: "draft",     owner: "Program Director",   lastUpdated: "Apr 2025", programs: ["Trail of Mastery"],                     summary: "Early-stage proposal outlining the vision and strategic rationale for a Trail of Mastery advanced program.",                                                       purpose: "Document the initial vision and secure internal alignment to develop Trail of Mastery.",                 quickTake: "Treat all details here as proposed, not confirmed. Do not use as a delivery reference.",                   keyDecisionsInfluenced: ["Whether to develop Trail of Mastery", "Target audience framing"],                    sourceOfTruthFor: ["Intent and vision for Trail of Mastery"],                   notSourceOfTruthFor: ["Duration", "Pricing", "Curriculum", "Outcomes — none confirmed"],  keySections: ["Problem statement", "Proposed audience", "Vision and goals", "Open questions"],                 relatedDocuments: ["Guided Trail Blueprint", "Pricing Analysis"] },
  { id: "7",  entityType: "document", name: "Digital Compass Blueprint",     category: "Program",     status: "Active",  confidence: "confirmed", owner: "Partnerships Lead",  lastUpdated: "May 2025", programs: ["Digital Compass"],                      summary: "Design and delivery reference for the Digital Compass nonprofit client program.",                                                                                  purpose: "Guide delivery of Digital Compass for nonprofit organizational clients.",                               quickTake: "This is the operational reference for Digital Compass — distinct from all individual-learner programs.", keyDecisionsInfluenced: ["Client engagement model", "Curriculum for nonprofit context"],                       sourceOfTruthFor: ["Digital Compass program design", "Nonprofit engagement approach"],  notSourceOfTruthFor: ["Individual learner track details", "Pricing for individual programs"], keySections: ["Nonprofit client model", "Curriculum overview", "Delivery format"],              relatedDocuments: ["Brand Book", "RESOLVE Course Canvas", "Master Program Overview"] },
  { id: "8",  entityType: "document", name: "Pricing Analysis",              category: "Finance",     status: "Active",  confidence: "confirmed", owner: "Operations",         lastUpdated: "Jun 2025", programs: ["All"],                                  summary: "Internal financial analysis covering program pricing models, cost structures, and grant-funding assumptions.",                                                     purpose: "Provide the authoritative reference for pricing decisions and grant budget alignment.",                  quickTake: "The only document where pricing figures should be sourced from.",                                          keyDecisionsInfluenced: ["Program pricing decisions", "Scholarship structures", "Grant budget alignment"],     sourceOfTruthFor: ["All program pricing figures", "Cost model assumptions"],     notSourceOfTruthFor: ["Curriculum", "Program design", "Audience definitions"],   keySections: ["Pricing model by program", "Cost assumptions", "Grant-funding analysis"],       relatedDocuments: ["Program Comparison Sheet", "Master Program Overview"] },
  { id: "9",  entityType: "document", name: "Program Comparison Sheet",      category: "Strategy",    status: "Active",  confidence: "confirmed", owner: "Program Director",   lastUpdated: "Jun 2025", programs: ["All"],                                  summary: "Side-by-side matrix comparing all Transition Trails programs across key dimensions.",                                                                              purpose: "Enable quick comparison and communication of the full program portfolio.",                               quickTake: "Use this for any conversation that compares programs or explains the ecosystem to new stakeholders.",      keyDecisionsInfluenced: ["Learner guidance conversations", "Stakeholder presentations"],                       sourceOfTruthFor: ["Cross-program comparisons", "Audience and prerequisite matrix"], notSourceOfTruthFor: ["Pricing (see Pricing Analysis)", "Detailed curriculum (see blueprints)"], keySections: ["Comparison matrix", "Audience definitions", "Prerequisites summary"],            relatedDocuments: ["Master Program Overview", "Pricing Analysis"] },
  { id: "10", entityType: "document", name: "Trail Guide Framework",         category: "Curriculum",  status: "Active",  confidence: "confirmed", owner: "Curriculum Lead",    lastUpdated: "Apr 2025", programs: ["Guided Trail", "Trail of Mastery"],      summary: "Defines the Trail Guide pedagogical framework underpinning how facilitators and Penny support learner progression.",                                                purpose: "Establish the conceptual and practical framework for how learner guidance operates across programs.",    quickTake: "The intellectual foundation behind how Trail Guide (Penny) and human facilitators approach learner support.", keyDecisionsInfluenced: ["Facilitator coaching approach", "Trail Guide AI design principles"],                sourceOfTruthFor: ["Trail Guide methodology", "Coaching philosophy"],            notSourceOfTruthFor: ["Technical implementation of Penny", "Session content"],    keySections: ["Framework philosophy", "Guidance principles", "Facilitator application"],       relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide"] },
  { id: "11", entityType: "document", name: "RESOLVE Course Canvas",         category: "Curriculum",  status: "Active",  confidence: "confirmed", owner: "Curriculum Lead",    lastUpdated: "May 2025", programs: ["Guided Trail"],                         summary: "Course canvas for the RESOLVE module within Guided Trail.",                                                                                                        purpose: "Provide the instructional design reference for delivering RESOLVE as a taught framework.",              quickTake: "The source of truth for how RESOLVE is taught — not a description of RESOLVE as an operational framework.", keyDecisionsInfluenced: ["RESOLVE module content", "Assessment design", "Learner activities"],                sourceOfTruthFor: ["RESOLVE curriculum as taught in Guided Trail"],              notSourceOfTruthFor: ["Operational use of RESOLVE across the org", "Demand management process"], keySections: ["Learning objectives", "Module activities", "Assessment approach", "RESOLVE phase breakdown"], relatedDocuments: ["Guided Trail Blueprint", "Trail Guide Framework"] },
  { id: "12", entityType: "document", name: "Guided Trail Sprint Cadence",   category: "Operations",  status: "Active",  confidence: "confirmed", owner: "Operations",         lastUpdated: "Jun 2025", programs: ["Guided Trail"],                         summary: "Week-by-week operational schedule for Guided Trail's four sprints.",                                                                                               purpose: "Serve as the operational calendar and scheduling reference for Guided Trail delivery.",                  quickTake: "The week-by-week delivery schedule. Facilitators and operations staff use this to plan each sprint.",     keyDecisionsInfluenced: ["Session scheduling", "Milestone timing", "Facilitator coordination"],               sourceOfTruthFor: ["Week-by-week Guided Trail schedule", "Sprint milestone dates"], notSourceOfTruthFor: ["Curriculum content (see Blueprint)", "Assessment criteria"], keySections: ["Sprint 1 schedule", "Sprint 2 schedule", "Sprint 3 schedule", "Sprint 4 schedule"],               relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide"] },
  { id: "13", entityType: "document", name: "Facilitator Guide",             category: "Operations",  status: "Active",  confidence: "confirmed", owner: "Lead Facilitator",   lastUpdated: "May 2025", programs: ["Explorer's Trail", "Foundations Trail"], summary: "Practical facilitation reference for Explorer's Trail and Foundations Trail.",                                                                                     purpose: "Equip facilitators with the practical knowledge to deliver Explorer's Trail and Foundations Trail.",    quickTake: "The facilitator's handbook for the first two programs.",                                                   keyDecisionsInfluenced: ["Facilitation approach", "Session pacing", "Learner support strategies"],             sourceOfTruthFor: ["Facilitation methodology for Explorer's and Foundations Trail"], notSourceOfTruthFor: ["Curriculum content (see Blueprints)", "Guided Trail facilitation"], keySections: ["Facilitator role overview", "Session preparation checklist", "Learner engagement strategies"], relatedDocuments: ["Explorer's Trail Blueprint", "Foundations Trail Blueprint"] },
  { id: "14", entityType: "document", name: "Intern Workbook",               category: "HR",          status: "Draft",   confidence: "draft",     owner: "Program Director",   lastUpdated: "Mar 2025", programs: ["Guided Trail"],                         summary: "Draft workbook for intern participants in Guided Trail.",                                                                                                          purpose: "Support interns with structured guidance specific to their role.",                                      quickTake: "Draft status — do not treat this as finalized guidance. Contents subject to change.",                     keyDecisionsInfluenced: ["Intern onboarding process", "Intern project contributions"],                         sourceOfTruthFor: ["Intern-specific guidance for Guided Trail"],                 notSourceOfTruthFor: ["General learner guidance (see Blueprint)", "Pricing or program structure"], keySections: ["Intern role overview", "Orientation checklist", "Project contribution expectations"],            relatedDocuments: ["Guided Trail Blueprint", "Guided Trail Sprint Cadence"] },
];

async function seedDocumentsIfEmpty(): Promise<void> {
  const existing = await db.select().from(knowledgeDocumentsTable);
  if (existing.length > 0) return;
  for (const doc of SEED_DOCS) {
    await db.insert(knowledgeDocumentsTable).values({ id: doc.id, data: doc }).onConflictDoNothing();
  }
}

router.get("/knowledge/documents", async (req, res): Promise<void> => {
  try {
    await seedDocumentsIfEmpty();
    const rows = await db.select().from(knowledgeDocumentsTable);
    res.json({ documents: rows.map(r => r.data as SourceDocument) });
  } catch (err) {
    req.log.error(err, "Failed to list knowledge documents");
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/knowledge/documents/:id", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(knowledgeDocumentsTable).where(eq(knowledgeDocumentsTable.id, req.params.id));
    if (rows.length === 0) { res.status(404).json({ error: "Document not found" }); return; }
    res.json({ document: rows[0].data as SourceDocument });
  } catch (err) {
    req.log.error(err, "Failed to fetch knowledge document");
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

router.post("/knowledge/documents", async (req, res): Promise<void> => {
  try {
    const doc = req.body as SourceDocument;
    await db.insert(knowledgeDocumentsTable).values({ id: doc.id, data: doc });
    res.status(201).json({ document: doc });
  } catch (err) {
    req.log.error(err, "Failed to create knowledge document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.patch("/knowledge/documents/:id", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(knowledgeDocumentsTable).where(eq(knowledgeDocumentsTable.id, req.params.id));
    if (rows.length === 0) { res.status(404).json({ error: "Document not found" }); return; }
    const updated = { ...(rows[0].data as SourceDocument), ...(req.body as Partial<SourceDocument>) };
    await db.update(knowledgeDocumentsTable).set({ data: updated, updatedAt: new Date() }).where(eq(knowledgeDocumentsTable.id, req.params.id));
    res.json({ document: updated });
  } catch (err) {
    req.log.error(err, "Failed to update knowledge document");
    res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/knowledge/documents/:id", async (req, res): Promise<void> => {
  try {
    await db.delete(knowledgeDocumentsTable).where(eq(knowledgeDocumentsTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete knowledge document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE STUDIO ROUTES
// Draft → Review → Approved → Published (Salesforce)
// ─────────────────────────────────────────────────────────────────────────────

function generateArticleId(): string {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "article";
}

// GET /api/knowledge/sf-article-types
// Returns Knowledge article type __kav object names from the connected SF org.
router.get("/knowledge/sf-article-types", async (req, res): Promise<void> => {
  try {
    const client = new ConnectorSalesforceClient();
    const result = await client.rest<{ sobjects?: { name: string; label: string; queryable: boolean }[] }>(
      `/services/data/${(ConnectorSalesforceClient as unknown as { SF_API_VERSION?: string }).SF_API_VERSION ?? "v62.0"}/sobjects/`
    );
    const kavTypes = (result.sobjects ?? [])
      .filter(s => s.name.endsWith("__kav") && s.queryable)
      .map(s => ({ value: s.name, label: s.label.replace(/ Version$/, "") }));
    res.json({ articleTypes: kavTypes });
  } catch (err) {
    req.log.warn(err, "Failed to fetch SF article types — returning empty list");
    res.json({ articleTypes: [] });
  }
});

// GET /api/knowledge/articles
// GET /api/knowledge/sf-categories  — SF DataCategoryGroup list with 1-hour in-memory cache
router.get("/knowledge/sf-categories", async (req, res): Promise<void> => {
  try {
    const now = Date.now();
    if (sfCategoryCache.length === 0 || now > sfCategoryCacheExpiry) {
      const client = new ConnectorSalesforceClient();
      // Reuse the established SfDataCategoryGroupsResponse shape (key: categoryGroups)
      // and the existing flattenCategories helper for recursive child support.
      const data = await client.rest<SfDataCategoryGroupsResponse>(
        "/services/data/v62.0/support/dataCategoryGroups?sObjectType=KnowledgeArticleVersion"
      );
      sfCategoryCache = (data.categoryGroups ?? []).map(g => ({
        name:       g.name,
        label:      g.label,
        categories: flattenCategories(g.topCategories ?? []).map(({ name, label }) => ({ name, label })),
      }));
      sfCategoryCacheExpiry = now + 60 * 60 * 1000; // 1 hour
    }
    res.json({ groups: sfCategoryCache });
  } catch (err) {
    req.log.warn("SF categories fetch failed (returning empty): " + String(err));
    res.json({ groups: [] });
  }
});

router.get("/knowledge/articles", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(knowledgeArticlesTable)
      .orderBy(desc(knowledgeArticlesTable.updatedAt));
    res.json({ articles: rows });
  } catch (err) {
    req.log.error(err, "Failed to list knowledge articles");
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// GET /api/knowledge/articles/:id
router.get("/knowledge/articles/:id", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, req.params.id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    res.json({ article: rows[0] });
  } catch (err) {
    req.log.error(err, "Failed to fetch knowledge article");
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

// POST /api/knowledge/articles  — create draft
router.post("/knowledge/articles", async (req, res): Promise<void> => {
  try {
    const { title, summary = "", body = "", category = "", articleType = "", urlName, dataCategoryGroup, dataCategory } = req.body as {
      title: string; summary?: string; body?: string; category?: string; articleType?: string; urlName?: string;
      dataCategoryGroup?: string; dataCategory?: string;
    };
    if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
    const authoredBy: string | null = (req.user as { email?: string } | undefined)?.email ?? null;
    const id = generateArticleId();
    const [row] = await db.insert(knowledgeArticlesTable).values({
      id,
      title: title.trim(),
      summary,
      body,
      category,
      articleType,
      urlName: urlName?.trim() || slugify(title),
      status: "draft",
      authoredBy,
      dataCategoryGroup: dataCategoryGroup || null,
      dataCategory:      dataCategory      || null,
    }).returning();
    res.status(201).json({ article: row });
  } catch (err) {
    req.log.error(err, "Failed to create knowledge article");
    res.status(500).json({ error: "Failed to create article" });
  }
});

// PATCH /api/knowledge/articles/:id  — update draft fields (staff only)
router.patch("/knowledge/articles/:id", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, articleId));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    const current = rows[0]!;
    if (current.status !== "draft") {
      res.status(409).json({ error: "Only draft articles can be edited. Recall it first." });
      return;
    }
    const {
      title, summary, body, category, articleType, urlName,
      dataCategoryGroup, dataCategory, reviewCycle,
      ownerDepartment, difficulty, audience, appliesTo, estimatedTime,
      lastTestedVersion, retrievalAbstract, prerequisites,
    } = req.body as Partial<{
      title: string; summary: string; body: string; category: string; articleType: string; urlName: string;
      dataCategoryGroup: string; dataCategory: string; reviewCycle: string;
      ownerDepartment: string; difficulty: string; audience: string; appliesTo: string;
      estimatedTime: string; lastTestedVersion: string; retrievalAbstract: string; prerequisites: string;
    }>;
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({
        ...(title             !== undefined && { title: title.trim() }),
        ...(summary           !== undefined && { summary }),
        ...(body              !== undefined && { body }),
        ...(category          !== undefined && { category }),
        ...(articleType       !== undefined && { articleType }),
        ...(urlName           !== undefined && { urlName: urlName.trim() || slugify(title ?? current.title) }),
        ...(dataCategoryGroup !== undefined && { dataCategoryGroup: dataCategoryGroup || null }),
        ...(dataCategory      !== undefined && { dataCategory: dataCategory || null }),
        // Review cycle (sent explicitly from the left-panel save; empty string = clear to null)
        ...(reviewCycle       !== undefined && { reviewCycle: reviewCycle || null }),
        // Reference fields (Knowledge Studio left-column panel)
        ...(ownerDepartment   !== undefined && { ownerDepartment:   ownerDepartment   || null }),
        ...(difficulty        !== undefined && { difficulty:        difficulty        || null }),
        ...(audience          !== undefined && { audience:          audience          || null }),
        ...(appliesTo         !== undefined && { appliesTo:         appliesTo         || null }),
        ...(estimatedTime     !== undefined && { estimatedTime:     estimatedTime     || null }),
        ...(lastTestedVersion !== undefined && { lastTestedVersion: lastTestedVersion || null }),
        ...(retrievalAbstract !== undefined && { retrievalAbstract: retrievalAbstract || null }),
        ...(prerequisites     !== undefined && { prerequisites:     prerequisites     || null }),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeArticlesTable.id, articleId))
      .returning();
    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to update knowledge article");
    res.status(500).json({ error: "Failed to update article" });
  }
});

// POST /api/knowledge/articles/:id/submit  — draft → pending-review
router.post("/knowledge/articles/:id/submit", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, req.params.id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    if (rows[0]!.status !== "draft") {
      res.status(409).json({ error: `Cannot submit: article is currently '${rows[0]!.status}'` });
      return;
    }
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({ status: "pending-review", reviewNote: null, submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(knowledgeArticlesTable.id, req.params.id))
      .returning();

    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to submit article for review");
    res.status(500).json({ error: "Failed to submit article" });
  }
});

// POST /api/knowledge/articles/:id/approve  — pending-review → approved (admin only)
router.post("/knowledge/articles/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    if (rows[0]!.status !== "pending-review") {
      res.status(409).json({ error: `Cannot approve: article is currently '${rows[0]!.status}'` });
      return;
    }

    // Enforce required-finding gate server-side: Penny must clear all required checks
    // before an article can advance to approved, regardless of client state.
    const steps = await db.select().from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, id))
      .orderBy(asc(articleProcedureStepsTable.sequence));
    const { required } = runPennyChecks(steps);
    if (required.length > 0) {
      res.status(409).json({
        error: `Cannot approve: ${required.length} required Penny finding${required.length === 1 ? '' : 's'} must be resolved first.`,
        requiredCount: required.length,
      });
      return;
    }

    const reviewedBy: string | null = (req.user as { email?: string } | undefined)?.email ?? null;
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({ status: "approved", reviewedBy, reviewedAt: new Date(), reviewNote: null, updatedAt: new Date() })
      .where(eq(knowledgeArticlesTable.id, id))
      .returning();

    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to approve article");
    res.status(500).json({ error: "Failed to approve article" });
  }
});

// POST /api/knowledge/articles/:id/request-changes  — pending-review → draft (admin only)
router.post("/knowledge/articles/:id/request-changes", requireAdmin, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    if (rows[0]!.status !== "pending-review") {
      res.status(409).json({ error: `Cannot request changes: article is currently '${rows[0]!.status}'` });
      return;
    }
    const { note = "" } = req.body as { note?: string };
    const reviewedBy: string | null = (req.user as { email?: string } | undefined)?.email ?? null;
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({ status: "draft", reviewedBy, reviewNote: note || null, updatedAt: new Date() })
      .where(eq(knowledgeArticlesTable.id, id))
      .returning();
    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to request changes on article");
    res.status(500).json({ error: "Failed to request changes" });
  }
});

// POST /api/knowledge/articles/:id/recall  — published (SF-originated) → draft
// Allows staff to reopen a published SF-synced article for editing without touching SF.
router.post("/knowledge/articles/:id/recall", requireStaff, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    const article = rows[0]!;
    if (article.status !== "published") {
      res.status(409).json({ error: `Cannot recall: article must be 'published' (currently '${article.status}')` });
      return;
    }
    if (!article.sfArticleId) {
      res.status(409).json({ error: "Cannot recall: article has no Salesforce link. Only SF-originated articles can be recalled." });
      return;
    }
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(knowledgeArticlesTable.id, id))
      .returning();
    req.log.info({ id, sfArticleId: article.sfArticleId }, "Article recalled for editing");
    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to recall article");
    res.status(500).json({ error: "Failed to recall article" });
  }
});

// POST /api/knowledge/articles/:id/publish-to-sf
//   approved → published
//   For Trail OS-authored articles: creates a new SF Knowledge record.
//   For SF-originated articles (sfArticleId set): creates a new __kav version linked to
//   the existing KnowledgeArticle, avoiding duplicate article records in Salesforce.
router.post("/knowledge/articles/:id/publish-to-sf", requireAdmin, async (req, res): Promise<void> => {
  const id = req.params['id'] as string;
  try {
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, id));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    const article = rows[0]!;
    if (article.status !== "approved") {
      res.status(409).json({ error: `Cannot publish: article must be 'approved' (currently '${article.status}')` });
      return;
    }

    // Enforce the same Penny required-finding gate as the local publish endpoint.
    // Staff can edit steps after approval; re-running checks prevents newly introduced
    // required findings from making it into the Salesforce record.
    const steps = await db.select().from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, id))
      .orderBy(asc(articleProcedureStepsTable.sequence));
    const { required: sfRequired } = runPennyChecks(steps);
    if (sfRequired.length > 0) {
      res.status(409).json({
        error: `Cannot publish to Salesforce: ${sfRequired.length} required Penny finding${sfRequired.length === 1 ? '' : 's'} must be resolved first.`,
        requiredCount: sfRequired.length,
      });
      return;
    }

    const client = new ConnectorSalesforceClient();

    // Discover the article-type __kav object and its body fields.
    const bodyInfo = await getKavAllBodyFields(client, {
      warn: (m) => req.log.warn(m),
      info: (m) => req.log.info(m),
    });

    // Build the record payload. Always include standard Knowledge fields.
    const payload: Record<string, unknown> = {
      Title:    article.title,
      UrlName:  article.urlName || slugify(article.title),
      Language: "en_US",
    };
    if (article.summary) payload["Summary"] = article.summary;

    // Map the article body to the first discovered rich-text field, if any.
    if (bodyInfo && bodyInfo.fields.length > 0 && article.body) {
      payload[bodyInfo.fields[0]!.name] = article.body;
    }

    // Use the article's chosen type, falling back to the discovered object or a safe default.
    const objectName = article.articleType || bodyInfo?.objectName || "Knowledge__kav";

    // SF-originated articles: link the new __kav version to the existing KnowledgeArticle
    // so Salesforce does not create a duplicate top-level article record.
    const isSfOriginated = Boolean(article.sfArticleId);
    if (isSfOriginated) {
      payload["KnowledgeArticleId"] = article.sfArticleId;
      req.log.info(
        { objectName, sfArticleId: article.sfArticleId, payload: Object.keys(payload) },
        "Publishing updated version of existing SF Knowledge article"
      );
    } else {
      req.log.info({ objectName, payload: Object.keys(payload) }, "Publishing new article to SF Knowledge");
    }

    let sfVersionId: string | null = null;
    let sfArticleId: string | null = article.sfArticleId; // preserve for SF-originated articles
    let sfPublishStatus = "Draft";

    // Step 1: Create the __kav record in Salesforce.
    //   - For SF-originated articles, KnowledgeArticleId in the payload ensures this is a
    //     new version of the existing article rather than a brand-new article.
    //   - For Trail OS-authored articles, no KnowledgeArticleId is set so SF creates a fresh one.
    const createResult = await client.createRecord(objectName, payload);
    if (!createResult.success) {
      const errMsg = (createResult as unknown as { errors?: { message: string }[] }).errors?.[0]?.message ?? "Unknown Salesforce error";
      res.status(502).json({ error: `Salesforce create failed: ${errMsg}` });
      return;
    }
    sfVersionId = createResult.id;
    req.log.info({ sfVersionId, isSfOriginated }, "SF Knowledge article version created");

    // Step 1.5: Assign data category selection if the author chose one.
    // The selection object follows the pattern {ArticleType}__DataCategorySelection.
    if (article.dataCategoryGroup && article.dataCategory && sfVersionId) {
      const selectionObjectName = objectName.replace(/__kav$/i, "__DataCategorySelection");
      try {
        await client.createRecord(selectionObjectName, {
          ParentId:              sfVersionId,
          DataCategoryGroupName: article.dataCategoryGroup,
          DataCategoryName:      article.dataCategory,
        });
        req.log.info(
          { selectionObjectName, group: article.dataCategoryGroup, category: article.dataCategory },
          "SF data category assigned"
        );
      } catch (catErr) {
        // Non-fatal — the article still publishes without the category assignment.
        req.log.warn(`Could not assign SF data category (non-fatal): ${String(catErr)}`);
      }
    }

    // Step 2: Retrieve (or confirm) the KnowledgeArticleId from the created record.
    //   For SF-originated articles we verify the org actually linked the new version to the
    //   existing KnowledgeArticle. Some org configurations may silently ignore the
    //   KnowledgeArticleId field on create and produce an independent new article instead.
    //   Detecting a mismatch here lets us return a clear 409 rather than silently duplicate.
    try {
      const versionRecord = await client.getRecord<{ Id: string; KnowledgeArticleId?: string }>(
        objectName, sfVersionId!, ["Id", "KnowledgeArticleId"]
      );
      const returnedKaId = versionRecord.KnowledgeArticleId ?? null;

      if (isSfOriginated) {
        // Compare the returned KnowledgeArticleId to the one we supplied.
        // A mismatch means the org rejected the link and created a brand-new article instead.
        if (returnedKaId && returnedKaId !== article.sfArticleId) {
          req.log.warn(
            { expectedKaId: article.sfArticleId, actualKaId: returnedKaId, sfVersionId },
            "Duplicate SF article detected: org rejected KnowledgeArticleId linking — " +
            "returned record belongs to a different KnowledgeArticle"
          );
          res.status(409).json({
            error:
              `Salesforce did not link this version to the existing article ` +
              `(KnowledgeArticleId mismatch). A duplicate article was created in Salesforce ` +
              `(version ID: ${sfVersionId!}). Please delete the duplicate from Salesforce ` +
              `Knowledge and try again, or contact your Salesforce admin if the API does not ` +
              `allow KnowledgeArticleId assignment on create.`,
          });
          return;
        }
        // Link confirmed — sfArticleId remains article.sfArticleId (set above).
      } else {
        sfArticleId = returnedKaId;
      }
    } catch (lookupErr) {
      req.log.warn(`Could not retrieve KnowledgeArticleId: ${String(lookupErr)}`);
      // Non-fatal: new articles will have sfArticleId = null; SF-originated articles retain
      // the known sfArticleId and skip the mismatch check.
    }

    // Step 3: Attempt to publish the article (set PublishStatus = Online).
    // Some orgs require workflow/approval and will reject this — we catch and leave as Draft.
    try {
      await client.updateRecord(objectName, sfVersionId, { PublishStatus: "Online" });
      sfPublishStatus = "Online";
      req.log.info({ sfVersionId }, "SF Knowledge article published (Online)");
    } catch (publishErr) {
      req.log.warn(`Could not auto-publish SF article (may need manual publish in SF): ${String(publishErr)}`);
      // Not a fatal error — article is created as Draft in SF, user can publish from SF.
    }

    // Step 4: Persist SF IDs and mark as published.
    const [updated] = await db.update(knowledgeArticlesTable)
      .set({
        status: "published",
        sfVersionId,
        sfArticleId,
        sfPublishStatus,
        publishedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(eq(knowledgeArticlesTable.id, id))
      .returning();

    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to publish article to Salesforce");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Publish failed: ${msg}` });
  }
});

// ─── Procedure Step endpoints ─────────────────────────────────────────────────
// Steps are stored in article_procedure_steps (local authoritative).
// SF write-through to Procedure_Step__c is best-effort — failures are logged and
// do not prevent the local write from succeeding.

// GET /api/knowledge/articles/:id/steps
router.get("/knowledge/articles/:id/steps", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const steps = await db.select()
      .from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId))
      .orderBy(asc(articleProcedureStepsTable.sequence));
    res.json({ steps });
  } catch (err) {
    req.log.error(err, "Failed to load procedure steps");
    res.status(500).json({ error: "Failed to load steps" });
  }
});

// POST /api/knowledge/articles/:id/steps
router.post("/knowledge/articles/:id/steps", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    // Determine next sequence number
    const existing = await db.select({ sequence: articleProcedureStepsTable.sequence })
      .from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId))
      .orderBy(desc(articleProcedureStepsTable.sequence))
      .limit(1);
    const nextSeq = existing.length > 0 ? (existing[0]!.sequence + 1) : 1;

    const { instruction = "", verifyLine = null, directUrl = null, toolVersion = null } =
      req.body as Partial<{ instruction: string; verifyLine: string | null; directUrl: string | null; toolVersion: string | null }>;

    const id = randomUUID();
    const [step] = await db.insert(articleProcedureStepsTable).values({
      id, articleId, sequence: nextSeq, instruction, verifyLine, directUrl, toolVersion,
      createdAt: new Date(), updatedAt: new Date(),
    }).returning();

    // Best-effort SF write
    try {
      const client = new ConnectorSalesforceClient();
      const sfResult = await client.createRecord("Procedure_Step__c", {
        Knowledge_Article__c: articleId,
        Sequence__c:          nextSeq,
        Instruction__c:       instruction,
        Verify_Line__c:       verifyLine,
      });
      if (sfResult.success && step) {
        await db.update(articleProcedureStepsTable)
          .set({ sfStepId: sfResult.id, updatedAt: new Date() })
          .where(eq(articleProcedureStepsTable.id, id));
      }
    } catch (sfErr) {
      req.log.warn({ err: String(sfErr) }, "Procedure_Step__c SF write skipped (object may not exist yet)");
    }

    res.status(201).json({ step });
  } catch (err) {
    req.log.error(err, "Failed to create procedure step");
    res.status(500).json({ error: "Failed to create step" });
  }
});

// PATCH /api/knowledge/articles/:id/steps/reorder   — must appear before /:stepId
router.patch("/knowledge/articles/:id/steps/reorder", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== "string")) {
      res.status(400).json({ error: "orderedIds must be a string array" }); return;
    }

    // Reject duplicate IDs before any DB work
    const uniqueInputIds = new Set(orderedIds);
    if (uniqueInputIds.size !== orderedIds.length) {
      res.status(400).json({ error: "orderedIds contains duplicate IDs" }); return;
    }

    // Validate: all IDs must belong to this article, and the set must be complete
    const existing = await db.select({ id: articleProcedureStepsTable.id })
      .from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId));
    const validIds = new Set(existing.map(s => s.id));
    const foreignIds = orderedIds.filter(id => !validIds.has(id));
    if (foreignIds.length > 0) {
      res.status(400).json({ error: "orderedIds contains IDs that do not belong to this article" }); return;
    }
    if (orderedIds.length !== validIds.size) {
      res.status(400).json({ error: "orderedIds must contain exactly one entry per step in this article" }); return;
    }

    // Perform the reorder atomically so partial failures leave no gap/duplicate sequences
    const now = new Date();
    const steps = await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.update(articleProcedureStepsTable)
          .set({ sequence: i + 1, updatedAt: now })
          .where(and(
            eq(articleProcedureStepsTable.id, orderedIds[i]!),
            eq(articleProcedureStepsTable.articleId, articleId),
          ));
      }
      return tx.select()
        .from(articleProcedureStepsTable)
        .where(eq(articleProcedureStepsTable.articleId, articleId))
        .orderBy(asc(articleProcedureStepsTable.sequence));
    });
    res.json({ steps });
  } catch (err) {
    req.log.error(err, "Failed to reorder steps");
    res.status(500).json({ error: "Failed to reorder steps" });
  }
});

// PATCH /api/knowledge/articles/:id/steps/:stepId
router.patch("/knowledge/articles/:id/steps/:stepId", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const stepId    = req.params["stepId"] as string;
    const { instruction, verifyLine, directUrl, toolVersion } = req.body as Partial<{
      instruction: string; verifyLine: string | null; directUrl: string | null; toolVersion: string | null;
    }>;
    const typedPatch: {
      updatedAt: Date;
      instruction?: string;
      verifyLine?:  string | null;
      directUrl?:   string | null;
      toolVersion?: string | null;
    } = { updatedAt: new Date() };
    if (instruction !== undefined) typedPatch.instruction = instruction;
    if (verifyLine  !== undefined) typedPatch.verifyLine  = verifyLine  || null;
    if (directUrl   !== undefined) typedPatch.directUrl   = directUrl   || null;
    if (toolVersion !== undefined) typedPatch.toolVersion = toolVersion || null;

    // Scope the update to both stepId AND articleId to prevent cross-article mutation
    const [step] = await db.update(articleProcedureStepsTable)
      .set(typedPatch)
      .where(and(
        eq(articleProcedureStepsTable.id, stepId),
        eq(articleProcedureStepsTable.articleId, articleId),
      ))
      .returning();

    if (!step) { res.status(404).json({ error: "Step not found or does not belong to this article" }); return; }
    res.json({ step });
  } catch (err) {
    req.log.error(err, "Failed to update procedure step");
    res.status(500).json({ error: "Failed to update step" });
  }
});

// DELETE /api/knowledge/articles/:id/steps/:stepId
router.delete("/knowledge/articles/:id/steps/:stepId", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const stepId    = req.params["stepId"] as string;
    // Scope delete to both stepId AND articleId to prevent cross-article mutation
    await db.delete(articleProcedureStepsTable)
      .where(and(
        eq(articleProcedureStepsTable.id, stepId),
        eq(articleProcedureStepsTable.articleId, articleId),
      ));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete procedure step");
    res.status(500).json({ error: "Failed to delete step" });
  }
});

// ─── Article relationship endpoints ───────────────────────────────────────────
// Every forward link writes its inverse in the same transaction.

// GET /api/knowledge/articles/:id/relationships
router.get("/knowledge/articles/:id/relationships", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const rels = await db.select()
      .from(articleRelationshipsTable)
      .where(eq(articleRelationshipsTable.articleId, articleId))
      .orderBy(asc(articleRelationshipsTable.createdAt));
    res.json({ relationships: rels });
  } catch (err) {
    req.log.error(err, "Failed to load relationships");
    res.status(500).json({ error: "Failed to load relationships" });
  }
});

// POST /api/knowledge/articles/:id/relationships
router.post("/knowledge/articles/:id/relationships", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const { relatedArticleId, relationType = "other", reason = null } = req.body as {
      relatedArticleId: string; relationType?: string; reason?: string | null;
    };
    if (!relatedArticleId) { res.status(400).json({ error: "relatedArticleId is required" }); return; }

    // Verify both articles exist before creating any records
    const [sourceArticle] = await db.select({ id: knowledgeArticlesTable.id })
      .from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, articleId)).limit(1);
    if (!sourceArticle) { res.status(404).json({ error: "Source article not found" }); return; }
    const [targetArticle] = await db.select({ id: knowledgeArticlesTable.id })
      .from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, relatedArticleId)).limit(1);
    if (!targetArticle) { res.status(404).json({ error: "Target article not found" }); return; }

    const now = new Date();
    const forwardId = randomUUID();
    const inverseId = randomUUID();

    const inverseTypeMap: Record<string, string> = {
      "prerequisite": "next-step",
      "next-step":    "prerequisite",
      "reverses":     "reverses",
      "other":        "other",
    };

    // Both forward and inverse are written atomically; pairedRelId on each points to the other
    // so deletion can remove exactly one pair without scanning by type/direction heuristics.
    const forward = await db.transaction(async (tx) => {
      const [fwd] = await tx.insert(articleRelationshipsTable).values({
        id: forwardId, articleId, relatedArticleId,
        relationType, reason, direction: "forward",
        pairedRelId: inverseId,
        createdAt: now, updatedAt: now,
      }).returning();
      await tx.insert(articleRelationshipsTable).values({
        id: inverseId, articleId: relatedArticleId, relatedArticleId: articleId,
        relationType: inverseTypeMap[relationType] ?? "other",
        reason, direction: "inverse",
        pairedRelId: forwardId,
        createdAt: now, updatedAt: now,
      });
      return fwd!;
    });

    res.status(201).json({ relationship: forward });
  } catch (err) {
    req.log.error(err, "Failed to create relationship");
    res.status(500).json({ error: "Failed to create relationship" });
  }
});

// DELETE /api/knowledge/articles/:id/relationships/:relId
router.delete("/knowledge/articles/:id/relationships/:relId", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const relId     = req.params["relId"] as string;
    // Delete forward record and its exact paired inverse atomically.
    await db.transaction(async (tx) => {
      // Scope lookup to the URL article to prevent cross-article deletion
      const rows = await tx.select().from(articleRelationshipsTable)
        .where(and(
          eq(articleRelationshipsTable.id, relId),
          eq(articleRelationshipsTable.articleId, articleId),
        ));
      if (rows.length === 0) return; // already gone or not owned by this article
      const fwd = rows[0]!;
      // Delete the exact inverse using pairedRelId (set at creation time)
      if (fwd.pairedRelId) {
        await tx.delete(articleRelationshipsTable)
          .where(eq(articleRelationshipsTable.id, fwd.pairedRelId));
      }
      await tx.delete(articleRelationshipsTable)
        .where(eq(articleRelationshipsTable.id, relId));
    });
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete relationship");
    res.status(500).json({ error: "Failed to delete relationship" });
  }
});

// DELETE /api/knowledge/articles/:id  — only drafts can be deleted
// Cascade-deletes all procedure steps and both sides of any relationships.
router.delete("/knowledge/articles/:id", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const rows = await db.select().from(knowledgeArticlesTable).where(eq(knowledgeArticlesTable.id, articleId));
    if (rows.length === 0) { res.status(404).json({ error: "Article not found" }); return; }
    if (rows[0]!.status !== "draft") {
      res.status(409).json({ error: "Only draft articles can be deleted." });
      return;
    }

    await db.transaction(async (tx) => {
      // 1. Delete all procedure steps for this article
      await tx.delete(articleProcedureStepsTable)
        .where(eq(articleProcedureStepsTable.articleId, articleId));

      // 2. Delete all relationships where this article is the source OR target,
      //    including both sides of every pair to avoid leaving stale inverse rows.
      //    Get all relationship IDs involving this article first.
      const ownedRels = await tx.select({ id: articleRelationshipsTable.id, pairedRelId: articleRelationshipsTable.pairedRelId })
        .from(articleRelationshipsTable)
        .where(eq(articleRelationshipsTable.articleId, articleId));
      const pairedIds = ownedRels.map(r => r.pairedRelId).filter((id): id is string => id !== null);
      // Delete the article's own rows
      await tx.delete(articleRelationshipsTable)
        .where(eq(articleRelationshipsTable.articleId, articleId));
      // Delete the paired inverse rows on other articles
      if (pairedIds.length > 0) {
        await tx.delete(articleRelationshipsTable)
          .where(inArray(articleRelationshipsTable.id, pairedIds));
      }

      // 3. Delete the article itself
      await tx.delete(knowledgeArticlesTable)
        .where(eq(knowledgeArticlesTable.id, articleId));
    });

    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete knowledge article");
    res.status(500).json({ error: "Failed to delete article" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PENNY REVIEW — Structural checks (no LLM required)
// ─────────────────────────────────────────────────────────────────────────────

interface PennyFinding {
  id: string;            // deterministic: "{stepId}|{type}"
  stepId: string;
  stepSequence: number;
  type: 'no-verify-line' | 'named-person' | 'no-url-with-menu-path' | 'parenthetical-hedge';
  severity: 'required' | 'suggested';
  description: string;
  affectedText: string | null;
  suggestedFix: string | null;   // null = no automated fix; must be resolved manually
}

interface PennyPassedCheck {
  type: string;
  reason: string;
}

type PennyReviewResult = {
  required: PennyFinding[];
  suggested: PennyFinding[];
  passed: PennyPassedCheck[];
};

/**
 * Run structural Penny-review checks against a set of procedure steps.
 * Returns required findings (block publish), suggestions (never block), and passed checks.
 * Deterministic — same input always produces the same output; safe to call multiple times.
 */
function runPennyChecks(steps: { id: string; sequence: number; instruction: string; verifyLine: string | null; directUrl: string | null }[]): PennyReviewResult {
  const required: PennyFinding[] = [];
  const suggested: PennyFinding[] = [];

  // ── Regex patterns ─────────────────────────────────────────────────────────
  // Named-person: two-stage check.
  //   Stage 1 (NAMED_VERB_RE): match the action verb case-insensitively so sentence-start
  //     "Contact John" and mid-sentence "contact John" both resolve.
  //     Captures the first following word.
  //   Stage 2: require the captured word to begin with an uppercase letter (ASCII [A-Z]),
  //     which excludes generic role words like "contact support", "email team", "ping the admin".
  const NAMED_VERB_RE = /\b(?:reach\s+out\s+to|contact|email|call(?:\s+to)?|ping)\s+([A-Za-z][a-z]*(?:\s+[A-Z][a-z]+)?)\b/i;
  function namedPersonMatch(text: string): RegExpMatchArray | null {
    const m = text.match(NAMED_VERB_RE);
    if (!m) return null;
    // Ensure the first captured word begins with an uppercase letter
    const firstWord = m[1]?.split(' ')[0] ?? '';
    return /^[A-Z]/.test(firstWord) ? m : null;
  }
  // Parenthetical hedge: "(this may vary)", "(your org might differ)", "(depending on setup)"
  const HEDGE_RE          = /\([^)]*\b(?:may|might|could|varies|depending|sometimes|usually)\b[^)]*\)/i;
  // Menu navigation path: "Setup > Objects", "App Builder > Flows > New", "Quick Find > ..."
  const MENU_PATH_RE      = /\b\w[\w\s]{1,30}\s+>\s+\w/;

  for (const step of steps) {
    const instruction = step.instruction ?? '';
    const seq         = step.sequence;
    const stepId      = step.id;

    // ── Required: no verification line ────────────────────────────────────────
    if (!step.verifyLine?.trim()) {
      required.push({
        id: `${stepId}|no-verify-line`,
        stepId,
        stepSequence: seq,
        type: 'no-verify-line',
        severity: 'required',
        description: `Step ${seq}: No verification line — Penny cannot confirm step completion without a "You should see…" statement.`,
        affectedText: null,
        suggestedFix: 'You should see the confirmation before continuing.',
      });
    }

    // ── Required: named person reference ──────────────────────────────────────
    const namedMatch = namedPersonMatch(instruction);
    if (namedMatch) {
      // Replace the captured Title-Case name with a generic role label
      const fixed = instruction.replace(NAMED_VERB_RE, (m) =>
        m.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/, 'the appropriate team member'),
      );
      required.push({
        id: `${stepId}|named-person`,
        stepId,
        stepSequence: seq,
        type: 'named-person',
        severity: 'required',
        description: `Step ${seq}: Named person reference ("${namedMatch[0]}") — articles must not name specific people; they change roles over time.`,
        affectedText: namedMatch[0],
        suggestedFix: fixed !== instruction ? fixed : null,
      });
    }

    // ── Suggested: menu path without a direct URL ──────────────────────────────
    const menuMatch = instruction.match(MENU_PATH_RE);
    if (menuMatch && !step.directUrl?.trim()) {
      suggested.push({
        id: `${stepId}|no-url-with-menu-path`,
        stepId,
        stepSequence: seq,
        type: 'no-url-with-menu-path',
        severity: 'suggested',
        description: `Step ${seq}: Menu navigation ("${menuMatch[0].trim()}") with no direct URL — Penny cannot deep-link the user to this screen.`,
        affectedText: menuMatch[0].trim(),
        suggestedFix: null,  // a URL cannot be auto-generated
      });
    }

    // ── Suggested: parenthetical hedge ────────────────────────────────────────
    const hedgeMatch = instruction.match(HEDGE_RE);
    if (hedgeMatch) {
      const cleaned = instruction.replace(HEDGE_RE, '').replace(/\s{2,}/g, ' ').trim();
      suggested.push({
        id: `${stepId}|parenthetical-hedge`,
        stepId,
        stepSequence: seq,
        type: 'parenthetical-hedge',
        severity: 'suggested',
        description: `Step ${seq}: Parenthetical hedge ("${hedgeMatch[0]}") — qualifiers weaken Penny's confidence in the instruction.`,
        affectedText: hedgeMatch[0],
        suggestedFix: cleaned !== instruction ? cleaned : null,
      });
    }
  }

  // ── Passed checks ──────────────────────────────────────────────────────────
  const passed: PennyPassedCheck[] = [];
  const HEDGE_RE2     = /\([^)]*\b(?:may|might|could|varies|depending|sometimes|usually)\b[^)]*\)/i;
  const MENU_PATH_RE2 = /\b\w[\w\s]{1,30}\s+>\s+\w/;

  if (steps.length === 0 || !steps.some(s => !s.verifyLine?.trim())) {
    passed.push({ type: 'verify-lines', reason: 'All steps have a verification line — Penny can confirm completion at every step.' });
  }
  if (!steps.some(s => namedPersonMatch(s.instruction ?? ''))) {
    passed.push({ type: 'no-named-people', reason: 'No named individuals — the article stays valid when team members change roles.' });
  }
  if (!steps.some(s => MENU_PATH_RE2.test(s.instruction ?? '') && !s.directUrl?.trim())) {
    passed.push({ type: 'url-coverage', reason: 'All navigable steps have a direct URL — Penny can deep-link users to the right screen.' });
  }
  if (!steps.some(s => HEDGE_RE2.test(s.instruction ?? ''))) {
    passed.push({ type: 'no-hedging', reason: 'No parenthetical hedges — instructions are stated with full confidence.' });
  }

  return { required, suggested, passed };
}

// POST /api/knowledge/articles/:id/penny-review
router.post("/knowledge/articles/:id/penny-review", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const articleRows = await db.select().from(knowledgeArticlesTable)
      .where(eq(knowledgeArticlesTable.id, articleId)).limit(1);
    if (!articleRows[0]) { res.status(404).json({ error: "Article not found" }); return; }

    const steps = await db.select().from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId))
      .orderBy(asc(articleProcedureStepsTable.sequence));

    const review = runPennyChecks(steps);
    res.json({ review, stepCount: steps.length });
  } catch (err) {
    req.log.error(err, "Failed to run Penny review");
    res.status(500).json({ error: "Failed to run Penny review" });
  }
});

// POST /api/knowledge/articles/:id/penny-review/:findingId/apply
// findingId format: "{stepId}|{checkType}"
// Applies Penny's suggested fix to the relevant step field and re-runs the check.
router.post("/knowledge/articles/:id/penny-review/:findingId/apply", requireStaff, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const findingId = req.params["findingId"] as string;
    const pipeIdx   = findingId.indexOf('|');
    if (pipeIdx < 0) { res.status(400).json({ error: "Invalid findingId — expected '{stepId}|{type}'" }); return; }
    const stepId    = findingId.slice(0, pipeIdx);
    const checkType = findingId.slice(pipeIdx + 1) as PennyFinding['type'];

    // Load all steps for this article (needed for full re-run after fix)
    const allSteps = await db.select().from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId))
      .orderBy(asc(articleProcedureStepsTable.sequence));

    const targetStep = allSteps.find(s => s.id === stepId);
    if (!targetStep) { res.status(404).json({ error: "Step not found or does not belong to this article" }); return; }

    // Re-derive the finding from current step content
    const currentReview = runPennyChecks(allSteps);
    const allFindings   = [...currentReview.required, ...currentReview.suggested];
    const finding       = allFindings.find(f => f.id === findingId);

    if (!finding) {
      res.status(409).json({ error: "Finding already resolved — re-run Penny review to see current state." }); return;
    }
    if (!finding.suggestedFix) {
      res.status(400).json({ error: "This finding has no automated fix and must be resolved manually." }); return;
    }

    // Apply the fix to the correct field
    const patch: { updatedAt: Date; verifyLine?: string; instruction?: string } = { updatedAt: new Date() };
    if (checkType === 'no-verify-line') {
      patch.verifyLine = finding.suggestedFix;
    } else if (checkType === 'named-person' || checkType === 'parenthetical-hedge') {
      patch.instruction = finding.suggestedFix;
    } else {
      res.status(400).json({ error: `Check type '${checkType}' has no automated fix.` }); return;
    }

    const [updatedStep] = await db.update(articleProcedureStepsTable)
      .set(patch)
      .where(and(
        eq(articleProcedureStepsTable.id, stepId),
        eq(articleProcedureStepsTable.articleId, articleId),
      ))
      .returning();

    if (!updatedStep) { res.status(404).json({ error: "Step not found after update — this should not happen." }); return; }

    // Re-run full check with updated content
    const updatedAllSteps = allSteps.map(s =>
      s.id === stepId ? { ...s, ...patch } : s,
    );
    const newReview = runPennyChecks(updatedAllSteps);

    res.json({ step: updatedStep, review: newReview });
  } catch (err) {
    req.log.error(err, "Failed to apply Penny fix");
    res.status(500).json({ error: "Failed to apply fix" });
  }
});

// PATCH /api/knowledge/articles/:id/categories
// Assigns data categories. UI-gated by Knowledge Manager role (checked via session groups).
router.patch("/knowledge/articles/:id/categories", requireAdmin, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const { dataCategoryGroup, dataCategory } = req.body as {
      dataCategoryGroup: string | null;
      dataCategory: string | null;
    };

    // requireAdmin middleware already enforces the Knowledge Manager gate (admin role).
    // Non-admin staff see the control as disabled in the UI.

    const articleRows = await db.select().from(knowledgeArticlesTable)
      .where(eq(knowledgeArticlesTable.id, articleId)).limit(1);
    if (!articleRows[0]) { res.status(404).json({ error: "Article not found" }); return; }

    const [updated] = await db.update(knowledgeArticlesTable)
      .set({
        dataCategoryGroup: dataCategoryGroup || null,
        dataCategory:      dataCategory      || null,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeArticlesTable.id, articleId))
      .returning();

    res.json({ article: updated });
  } catch (err) {
    req.log.error(err, "Failed to assign categories");
    res.status(500).json({ error: "Failed to assign categories" });
  }
});

// POST /api/knowledge/articles/:id/publish
// Local publish: bumps version metadata, confirms relationships, sets next review date.
// Distinct from /publish-to-sf (which pushes to Salesforce Knowledge API).
// Requires zero required Penny findings; blocks with a 409 if any remain.
router.post("/knowledge/articles/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  try {
    const articleId = req.params["id"] as string;
    const articleRows = await db.select().from(knowledgeArticlesTable)
      .where(eq(knowledgeArticlesTable.id, articleId)).limit(1);
    if (!articleRows[0]) { res.status(404).json({ error: "Article not found" }); return; }
    const article = articleRows[0];

    if (article.status !== 'approved') {
      res.status(409).json({
        error: `Cannot publish: article must be 'approved' (currently '${article.status}'). Use the Approval tab to approve it first.`,
      });
      return;
    }

    // SF-originated articles must go through /publish-to-sf to keep Salesforce in sync.
    // Allowing a local-only publish on an SF article would move it out of 'approved',
    // permanently blocking the Salesforce publish endpoint (which requires 'approved').
    if (article.sfArticleId) {
      res.status(409).json({
        error: "This article is linked to a Salesforce record. Use 'Publish to Salesforce' to keep it in sync.",
        code: 'use-publish-to-sf',
      });
      return;
    }

    // Run Penny review — required findings must be zero
    const steps = await db.select().from(articleProcedureStepsTable)
      .where(eq(articleProcedureStepsTable.articleId, articleId))
      .orderBy(asc(articleProcedureStepsTable.sequence));
    const { required } = runPennyChecks(steps);
    if (required.length > 0) {
      res.status(409).json({
        error: `Cannot publish: ${required.length} required finding${required.length === 1 ? '' : 's'} must be resolved first.`,
        requiredCount: required.length,
      });
      return;
    }

    // Compute next review date from review cycle
    const CYCLE_DAYS: Record<string, number> = { Monthly: 30, Quarterly: 90, Yearly: 365 };
    const cycleDays   = CYCLE_DAYS[article.reviewCycle ?? ''] ?? 90;
    const now         = new Date();
    const nextReview  = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);
    const nextReviewLabel = nextReview.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Count relationship pairs for the publish summary
    const relRows = await db.select({ id: articleRelationshipsTable.id })
      .from(articleRelationshipsTable)
      .where(eq(articleRelationshipsTable.articleId, articleId));

    const reviewedBy: string | null = (req.user as { email?: string } | undefined)?.email ?? null;

    const [updated] = await db.update(knowledgeArticlesTable)
      .set({
        status:      'published',
        publishedAt: now,
        reviewedBy,
        reviewedAt:  now,
        updatedAt:   now,
      })
      .where(eq(knowledgeArticlesTable.id, articleId))
      .returning();

    // Persist the next review date to article_reviews so the queue can show staleness
    await db.insert(articleReviewsTable).values({
      articleId,
      reviewedAt:    now,
      reviewedBy,
      nextReviewDue: nextReview,
    });

    res.json({
      article: updated,
      publishSteps: [
        {
          step: 'version-bump',
          label: 'Version bumped',
          detail: `updatedAt set to ${now.toISOString()}`,
          done: true,
        },
        {
          step: 'categories',
          label: article.dataCategoryGroup
            ? `Category confirmed: ${article.dataCategoryGroup} / ${article.dataCategory ?? '—'}`
            : 'No category assigned — set one in Approval before publishing to SF',
          done: true,
        },
        {
          step: 'retrieval-abstract',
          label: article.retrievalAbstract
            ? 'Retrieval abstract marked current'
            : 'No retrieval abstract — add one in the Article editor for best Penny retrieval',
          done: true,
        },
        {
          step: 'relationships',
          label: relRows.length > 0
            ? `${relRows.length} relationship row${relRows.length === 1 ? '' : 's'} confirmed`
            : 'No relationships — add links in the Article editor if this article has prerequisites',
          done: true,
        },
        {
          step: 'review-date',
          label: `Next review: ${nextReviewLabel} (${article.reviewCycle ?? 'Quarterly'})`,
          detail: `Based on ${cycleDays}-day review cycle`,
          done: true,
        },
      ],
    });
  } catch (err) {
    req.log.error(err, "Failed to publish article");
    res.status(500).json({ error: "Failed to publish article" });
  }
});

export default router;
