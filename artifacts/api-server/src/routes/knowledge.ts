import { Router } from "express";
import { db } from "@workspace/db";
import { knowledgeDocumentsTable, knowledgeSourcesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchSfLiveMetrics,
  buildIntegrationStatus,
  SOURCE_INTEGRATION_MAP,
  filterStaleHealthIssues,
} from "../lib/integrationHealth.js";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";

const router = Router();

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
    relatedSfObjects: ["Program__c", "Training_Plan__c"],
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
    relatedSfObjects: ["Training_Plan_Item__c", "Program_Engagement__c"],
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
    relatedSfObjects: ["Training_Plan__c", "Training_Plan_Item__c"],
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
    const current = rows[0].data as KnowledgeSource;
    const updated: KnowledgeSource = { ...current, ...(req.body as Partial<KnowledgeSource>), id };
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
}

interface SfArticleDetail extends SfArticle {
  body: string | null;
  urlName: string | null;
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

// GET /api/knowledge/sf-article-categories
// Returns all data category groups and their categories for Knowledge articles.
// Returns { groups: [] } gracefully if categories are not configured in this org.
router.get("/knowledge/sf-article-categories", async (req, res): Promise<void> => {
  try {
    const client = new ConnectorSalesforceClient();
    const data = await client.rest<SfDataCategoryGroupsResponse>(
      `/services/data/v62.0/support/dataCategoryGroups?sObjectType=KnowledgeArticle`
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

      // 2. Describe each __kav object, look for rich-text / body-like fields
      const BODY_FIELD_CANDIDATES = [
        "Body__c", "Content__c", "Details__c", "Answer__c", "Question__c",
        "Description__c", "Text__c", "ArticleBody", "ArticleBody__c",
      ];

      for (const objName of kavObjects) {
        try {
          const desc = await client.rest<{ fields: { name: string; type: string }[] }>(
            `/services/data/v62.0/sobjects/${objName}/describe`
          );
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

          // Fall back: any richTextarea or textarea field not in the exclusion list
          const EXCLUDE = new Set(["Summary__c", "Title", "UrlName", "PublishStatus"]);
          const richField = desc.fields.find(
            f => (f.type === "richTextarea" || f.type === "textarea") && !EXCLUDE.has(f.name)
          );
          if (richField) {
            const info = { objectName: objName, fieldName: richField.name };
            log.info(`KAV body discovery: fallback rich-text field ${objName}.${richField.name}`);
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

// GET /api/knowledge/sf-articles
// Lists Salesforce Knowledge articles. Optional query params:
//   status  — 'online' (default) | 'draft' | 'all'
//   type    — article type filter (ArticleType field; skipped if field absent in org)
//   q       — title/summary search substring
//   cat     — data category filter as 'GroupApiName:CategoryApiName'
//             e.g. 'Topics:Products' → WITH DATA CATEGORY Topics BELOW Products
router.get("/knowledge/sf-articles", async (req, res): Promise<void> => {
  try {
    const client = new ConnectorSalesforceClient();
    const fields  = await getKavFieldSet(client, { warn: (m) => req.log.warn(m) });

    const statusParam = typeof req.query["status"] === "string" ? req.query["status"] : "online";
    const typeParam   = typeof req.query["type"]   === "string" ? req.query["type"]   : "";
    const qParam      = typeof req.query["q"]      === "string" ? req.query["q"]      : "";
    const catParam    = typeof req.query["cat"]    === "string" ? req.query["cat"]    : "";

    const whereClauses: string[] = [];
    if (statusParam === "all") {
      whereClauses.push("PublishStatus IN ('online', 'draft')");
    } else {
      whereClauses.push(`PublishStatus = '${statusParam === "draft" ? "draft" : "online"}'`);
    }
    // ArticleType filter only if the field exists in this org
    if (typeParam && fields.has("ArticleType")) {
      whereClauses.push(`ArticleType = '${typeParam.replace(/'/g, "\\'")}'`);
    }
    if (qParam) whereClauses.push(`Title LIKE '%${qParam.replace(/'/g, "\\'")}%'`);

    const where = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // WITH DATA CATEGORY clause must come between WHERE and ORDER BY.
    // BELOW matches the selected category and all of its descendants.
    let withDataCategory = "";
    if (catParam && catParam.includes(":")) {
      const colonIdx  = catParam.indexOf(":");
      const groupName = catParam.slice(0, colonIdx).replace(/[^a-zA-Z0-9_]/g, "");
      const catName   = catParam.slice(colonIdx + 1).replace(/[^a-zA-Z0-9_]/g, "");
      if (groupName && catName) {
        withDataCategory = `WITH DATA CATEGORY ${groupName} BELOW ${catName}`;
      }
    }

    const soql = `SELECT ${fields.selectList}
                  FROM KnowledgeArticleVersion
                  ${where}
                  ${withDataCategory}
                  ORDER BY LastModifiedDate DESC
                  LIMIT 200`;

    const result = await client.query<{
      Id: string; KnowledgeArticleId: string; Title: string; Summary?: string;
      ArticleType?: string; PublishStatus: string; VersionNumber?: number;
      CreatedDate: string; LastModifiedDate: string;
      IsVisibleInApp?: boolean; Language?: string;
    }>(soql);

    // Derive available article types from result for filter UI (only if field present)
    const typeSet = fields.has("ArticleType")
      ? new Set(result.records.map(r => r.ArticleType).filter(Boolean))
      : new Set<string>();

    const articles: SfArticle[] = result.records.map(r => ({
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
    }));

    res.json({ articles, total: result.totalSize, articleTypes: Array.from(typeSet) });
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

    // Fetch body from the article-type __kav object using discovered object/field names.
    let body: string | null = null;
    const bodyInfo = await getKavBodyInfo(client, {
      warn: (m) => req.log.warn(m),
      info: (m) => req.log.info(m),
    });
    if (bodyInfo) {
      try {
        const bodySoql = `SELECT Id, ${bodyInfo.fieldName}
                          FROM ${bodyInfo.objectName}
                          WHERE KnowledgeArticleId = '${meta.KnowledgeArticleId}'
                          AND PublishStatus = '${meta.PublishStatus}'
                          LIMIT 1`;
        const bodyResult = await client.query<{ Id: string; [k: string]: string | undefined }>(bodySoql);
        body = bodyResult.records[0]?.[bodyInfo.fieldName] ?? null;
      } catch (bodyErr) {
        req.log.warn(`Body fetch failed for ${bodyInfo.objectName}.${bodyInfo.fieldName}: ${String(bodyErr)}`);
      }
    }

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
      urlName:            meta.UrlName ?? null,
      body,
    };

    res.json({ article });
  } catch (err) {
    req.log.error(err, "Failed to fetch SF Knowledge article detail");
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `Salesforce query failed: ${msg}` });
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
    const rows = await db.select().from(knowledgeDocumentsTable).orderBy(knowledgeDocumentsTable.createdAt);
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

export default router;
