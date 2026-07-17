import { Router } from "express";
import { db } from "@workspace/db";
import { knowledgeDocumentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchSfLiveMetrics,
  buildIntegrationStatus,
  SOURCE_INTEGRATION_MAP,
  filterStaleHealthIssues,
} from "../lib/integrationHealth.js";

const router = Router();

// ── Static KnowledgeSource registry ──────────────────────────────────────────
// Governance architecture data — enriched at serve-time with live integration
// health to update syncStatus and filter stale healthIssues.

type SyncStatus = "Live" | "Manual" | "Disconnected" | "Planned" | "Future";

interface ArchiveDocument {
  id: string;
  name: string;
  categories: string[];   // category ids from DOCUMENT_CATEGORY_TAXONOMY
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
}

const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
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
    pennyUseDescription: "Primary knowledge source for coaching conversations, career guidance, and answering learner questions about the program model and pathway. Penny retrieves directly and cites.",
    healthStatus: "Warning",
    healthIssues: ["Review date approaching June 2025 — schedule quarterly review", "Sync is manual — no live connection to Salesforce Knowledge API yet"],
    futureIntegrationPath: "Q3 2025 — Salesforce Knowledge API. Live sync with 24h refresh cadence. Penny RAG pipeline ingests on update.",
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
    futureIntegrationPath: "Q4 2025 — Restricted Penny access. Coach-only context injection. No learner-facing retrieval.",
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
    description: "Knowledge articles covering Salesforce platform how-tos, Trail OS documentation, system configuration guides, and technical standards for the Transition Trails implementation.",
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
    pennyUseDescription: "Penny uses this to answer learner Salesforce and Trail OS questions. Highest accuracy requirement — incorrect technical guidance is a trust risk.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Q3 2025 — Live SF Knowledge API sync. Highest priority for RAG pipeline accuracy.",
    integrationPriority: "P1",
    sampleContents: ["Salesforce Admin: Object Model Reference", "Trail OS Navigation Guide", "Custom Object Setup How-To", "Apex vs Flow Decision Guide"],
  },
  {
    id: "src-gdrive-foundations",
    name: "Foundations Trail Google Drive Folder",
    shortName: "GDrive: Foundations Trail",
    type: "Google Drive",
    owner: "Curriculum Lead",
    systemOfRecord: "Google Drive",
    description: "Google Drive folder containing all Foundations Trail program materials: coach guides, sprint schedules, assessment rubrics, reference documents, and session resources.",
    purpose: "Source of truth for all Foundations Trail program assets not yet in the LMS or Salesforce. Penny uses this for program context, coach guidance, and supplementary content.",
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
    healthIssues: ["Folder indexing not yet configured — content not accessible to Trail OS", "Not approved for Penny until folder sync is set up and content reviewed", "Folder structure not yet mapped to curriculum module schema"],
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
    pennyUseDescription: "Drive API is connected. Folder indexing and content review pending — mirrors Foundations Trail Drive setup.",
    healthStatus: "Warning",
    healthIssues: ["Folder indexing not yet configured — content not accessible to Trail OS", "Folder content not yet indexed for Penny retrieval"],
    futureIntegrationPath: "Same indexing pipeline as Foundations Trail Drive. Configure after Foundations folder is set up.",
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
    description: "Curated archive of reference documents, research papers, Salesforce documentation, and source materials uploaded to Trail OS and mapped via Source Mapping.",
    purpose: "Supplementary reference layer. Penny uses these for answering nuanced questions that require external Salesforce documentation or research-backed content.",
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
      { id: "sda-001", name: "Salesforce Certified Admin Study Guide",       categories: ["technology"],                        uploadedBy: "Knowledge Lead",   uploadDate: "Mar 2025", owner: "Knowledge Lead"   },
      { id: "sda-002", name: "Nonprofit Cloud Reference",                    categories: ["technology", "mission-delivery"],    uploadedBy: "Knowledge Lead",   uploadDate: "Mar 2025", owner: "Knowledge Lead"   },
      { id: "sda-003", name: "Trailhead Module Index Export",                categories: ["technology", "curriculum"],           uploadedBy: "Curriculum Lead",  uploadDate: "Apr 2025", owner: "Curriculum Lead"  },
      { id: "sda-004", name: "NPSP Configuration Best Practices",            categories: [],                                    uploadedBy: "Knowledge Lead",   uploadDate: "Apr 2025", owner: "Knowledge Lead"   },
      { id: "sda-005", name: "Volunteer Management Framework",               categories: [],                                    uploadedBy: "Operations Lead",  uploadDate: "Apr 2025", owner: "Operations Lead"  },
      { id: "sda-006", name: "Coaching Protocol Template Pack",              categories: [],                                    uploadedBy: "Coach Team Lead",  uploadDate: "Apr 2025"                            },
      { id: "sda-007", name: "Sprint Planning Guide for Cohort Leads",       categories: [],                                    uploadedBy: "Operations Lead",  uploadDate: "May 2025"                            },
      { id: "sda-008", name: "Assessment Rubric Collection",                 categories: [],                                    uploadedBy: "Curriculum Lead",  uploadDate: "May 2025", owner: "Curriculum Lead"  },
      { id: "sda-009", name: "Career Pathway Research — Tech Sector 2024",  categories: [],                                    uploadedBy: "Knowledge Lead",   uploadDate: "May 2025"                            },
      { id: "sda-010", name: "Employer Partner Onboarding Guide",            categories: [],                                    uploadedBy: "Operations Lead",  uploadDate: "May 2025"                            },
      { id: "sda-011", name: "SF Admin Exam Blueprint v7",                   categories: [],                                    uploadedBy: "Curriculum Lead",  uploadDate: "May 2025", owner: "Curriculum Lead"  },
      { id: "sda-012", name: "Learning Outcomes Measurement Framework",      categories: [],                                    uploadedBy: "Knowledge Lead",   uploadDate: "May 2025"                            },
      { id: "sda-013", name: "Coaching Conversation Note Templates",         categories: [],                                    uploadedBy: "Coach Team Lead",  uploadDate: "Jun 2025"                            },
      { id: "sda-014", name: "Program Budget Template FY25",                 categories: [],                                    uploadedBy: "Operations Lead",  uploadDate: "Jun 2025"                            },
      { id: "sda-015", name: "Transition Trails Impact Report 2024",         categories: [],                                    uploadedBy: "Knowledge Lead",   uploadDate: "Jun 2025", owner: "Knowledge Lead"   },
    ],
  },
  {
    id: "src-lms-modules",
    name: "LMS Course Modules",
    shortName: "LMS Modules",
    type: "LMS Content",
    owner: "Curriculum Lead",
    systemOfRecord: "LMS Platform",
    description: "All published course module content, lesson text, activities, and embedded resources delivered through the LMS platform across all active programs.",
    purpose: "Core learning content that Penny uses as context for coaching, answering module questions, guiding study, and generating reflections. The most frequently accessed source during active program delivery.",
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Explorer's Trail"],
    relatedKnowledgeCategories: ["Curriculum", "Mission & Delivery"],
    relatedSfObjects: ["Training_Plan__c", "Training_Plan_Item__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-study-coach", "cap-reflection-prompts", "cap-trail-quests", "cap-progress-insights"],
    relatedStandards: ["std-module", "std-lesson", "std-reflection-prompt"],
    relatedSources: ["src-curriculum-studio", "src-assessments", "src-gdrive-foundations"],
    trustLevel: "Authoritative",
    reviewCycle: "Per cohort",
    lastReviewDate: "May 2025",
    nextReviewDate: "July 2025",
    accessStatus: "Open",
    syncStatus: "Manual",
    availability: "Available",
    approvedForPenny: true,
    pennyUseDescription: "Highest priority source for active program coaching. Penny retrieves current module content before every learner interaction to ensure context accuracy. Must stay synchronized with published LMS state.",
    healthStatus: "Warning",
    healthIssues: ["LMS API not yet connected — sync is manual export", "No completion event webhook — Penny cannot auto-trigger on module completion yet", "Salesforce Training_Plan_Item__c relationship partially mapped"],
    futureIntegrationPath: "Q3 2025 — LMS webhook for completion events. Module content API sync. Primary Penny context injection source.",
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
    description: "Assessment questions, learner response data, scoring results, and pass/fail records stored as Salesforce objects. The system of record for all learner assessment history.",
    purpose: "Penny reads assessment data to understand where a learner is struggling, trigger coaching interventions, identify escalation signals, and personalize study guidance.",
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
    pennyUseDescription: "Penny reads assessment scores and pass/fail patterns to personalize coaching messages, trigger escalation, and generate progress insights. Restricted — never exposed verbatim to learners, only interpreted.",
    healthStatus: "Warning",
    healthIssues: ["No live Salesforce API connection — data pulled manually for prototype", "Assessment → module mapping is incomplete for Sprint 3+", "Category mapping missing for 40% of assessment items"],
    futureIntegrationPath: "Q3 2025 — Live Salesforce SOQL queries. Penny reads in real-time per coaching interaction.",
    integrationPriority: "P1",
    sampleContents: ["Declarative Automation Assessment", "Data Model Quiz", "Reports & Dashboards Evaluation", "Certification Readiness Check"],
    documents: [
      { id: "asmnt-001", name: "Declarative Automation Assessment",   categories: ["assessments", "curriculum"],  uploadedBy: "Curriculum Lead",  uploadDate: "Feb 2025" },
      { id: "asmnt-002", name: "Data Model Quiz — Sprint 1",          categories: ["assessments", "curriculum"],  uploadedBy: "Curriculum Lead",  uploadDate: "Feb 2025" },
      { id: "asmnt-003", name: "Reports & Dashboards Evaluation",     categories: ["assessments"],                uploadedBy: "Curriculum Lead",  uploadDate: "Mar 2025" },
      { id: "asmnt-004", name: "Certification Readiness Check",       categories: ["assessments", "technology"],  uploadedBy: "Curriculum Lead",  uploadDate: "Mar 2025" },
      { id: "asmnt-005", name: "Flow Builder Practical Assessment",   categories: ["assessments", "curriculum"],  uploadedBy: "Curriculum Lead",  uploadDate: "Mar 2025" },
      { id: "asmnt-006", name: "Security & Access Quiz",              categories: ["assessments", "technology"],  uploadedBy: "Curriculum Lead",  uploadDate: "Apr 2025" },
      { id: "asmnt-007", name: "Custom Objects Workshop Evaluation",  categories: [],                             uploadedBy: "Curriculum Lead",  uploadDate: "Apr 2025" },
      { id: "asmnt-008", name: "Automation Strategy Capstone",        categories: [],                             uploadedBy: "Curriculum Lead",  uploadDate: "May 2025" },
      { id: "asmnt-009", name: "NPSP Data Migration Assessment",      categories: [],                             uploadedBy: "Curriculum Lead",  uploadDate: "May 2025" },
      { id: "asmnt-010", name: "Mentor Program Review Rubric",        categories: [],                             uploadedBy: "Coach Team Lead",  uploadDate: "May 2025" },
    ],
  },
  {
    id: "src-standards-studio",
    name: "Standards Studio Rules",
    shortName: "Standards Studio",
    type: "Standards Studio",
    owner: "Curriculum Lead",
    systemOfRecord: "Trail OS — Standards Studio",
    description: "Content quality rules and Penny prompt standards defined in Standards Studio. Governs what valid modules, lessons, knowledge articles, reflections, coaching messages, and Penny outputs look like.",
    purpose: "Penny's rule layer. Before generating or delivering any content, Penny checks the applicable standard to ensure quality, tone, structure, and required fields are met. This is how content quality is enforced at scale.",
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
    pennyUseDescription: "Penny reads Standards Studio rules before every content generation step. Acts as the quality gate — content that fails a standard check is flagged, not delivered. This is the highest-trust rule source.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Live — Standards Studio is a Trail OS-native source. No external sync needed. Standards updates are immediately available to Penny.",
    integrationPriority: "P1",
    sampleContents: ["Module Standard (10 rules)", "Lesson Standard (8 rules)", "Reflection Prompt Standard (6 rules)", "Penny Prompt Standard (7 rules)", "Coach Notes Standard (5 rules)"],
  },
  {
    id: "src-curriculum-studio",
    name: "Curriculum Studio Content",
    shortName: "Curriculum Studio",
    type: "Curriculum Studio",
    owner: "Curriculum Lead",
    systemOfRecord: "Trail OS — Curriculum Studio",
    description: "Module outlines, lesson frameworks, Penny asset definitions, delivery asset specifications, and curriculum metadata authored in Trail OS Curriculum Studio.",
    purpose: "The structural design standard for all learning content. Penny uses curriculum data to understand the intended module sequence, learning objectives, and delivery design — so coaching and questing stay aligned with the curriculum.",
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
    pennyUseDescription: "Penny reads curriculum structure before generating module-specific content. This is the scaffold — Penny knows module sequence, learning objectives, and what assets exist for each module.",
    healthStatus: "Healthy",
    healthIssues: [],
    futureIntegrationPath: "Live — Curriculum Studio is Trail OS-native. Structural data is immediately available. Future: LMS export pipeline wires this to live delivery data.",
    integrationPriority: "P1",
    sampleContents: ["Module Outline: Sprint 1-4", "Lesson Templates per Module", "Penny Asset Definitions", "Delivery Asset Map"],
  },
  {
    id: "src-penny-generated",
    name: "Penny Content Assistant Outputs",
    shortName: "Penny Outputs",
    type: "Penny Generated",
    owner: "Penny Product Lead",
    systemOfRecord: "Trail OS — Penny Command Center",
    description: "Coaching messages, reflection prompts, weekly summaries, cohort briefs, and other content generated by Penny and reviewed through the Content Assistant workflow.",
    purpose: "Creates a feedback loop. Penny's reviewed and approved outputs become training examples and prompt templates for future Penny interactions. Enables quality improvement over time.",
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
    pennyUseDescription: "Not yet approved for automatic Penny retrieval. Human-reviewed outputs can be promoted to prompt templates manually. Automation planned Q4 2025.",
    healthStatus: "Warning",
    healthIssues: ["No automated feedback loop yet — outputs are logged but not re-ingested", "Approval workflow for output promotion to templates is manual", "Not approved for automated Penny use without human review"],
    futureIntegrationPath: "Q4 2025 — Automated quality scoring. Approved outputs promoted to template library. Penny learns from highest-rated coaching messages.",
    integrationPriority: "P2",
    sampleContents: ["Sprint 1 Reflection Prompts (reviewed set)", "Weekly Coaching Message Templates", "Cohort Summary Drafts"],
  },
  {
    id: "src-coach-notes",
    name: "Coach Notes Library",
    shortName: "Coach Notes",
    type: "Salesforce Knowledge",
    sfCategory: "Mission & Delivery",
    owner: "Coach Team Lead",
    systemOfRecord: "Salesforce",
    description: "Coach-authored notes on learner cohorts, escalation patterns, and program delivery insights. Stored in Salesforce and governed by the Coach Notes standard.",
    purpose: "Penny reads coach notes to understand escalation triggers, learner struggle patterns, and context that helps Penny calibrate coaching tone and urgency per cohort.",
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
    pennyUseDescription: "Penny reads coach notes in strict read-only mode for escalation context. Never surfaces raw coach notes to learners. Used to calibrate coaching urgency and escalation messaging.",
    healthStatus: "Warning",
    healthIssues: ["Adherence to Coach Notes standard is 60% — 4 of 10 recent notes missing required sections", "No live Salesforce API yet — manual sync only"],
    futureIntegrationPath: "Q3 2025 — Live Salesforce API. Read-only Penny access. Standards Studio compliance check on write.",
    integrationPriority: "P2",
    sampleContents: ["Sprint 2 Cohort Notes: Escalation Patterns", "Module 3 Common Misconceptions", "High-Engagement Learner Characteristics"],
  },
  {
    id: "src-future-slack",
    name: "Future: Slack Conversation History",
    shortName: "Slack History",
    type: "Slack History",
    owner: "Communications Lead",
    systemOfRecord: "Slack",
    description: "Future source: Slack conversation history from coaching DM threads and cohort channels, once Penny Slack integration is live.",
    purpose: "When connected, Slack history will allow Penny to reference prior conversations in context — understanding what questions a learner has already asked, what was resolved, and what follows up.",
    relatedPrograms: ["Foundations Trail", "Guided Trail"],
    relatedKnowledgeCategories: ["Communications", "Coaching"],
    relatedSfObjects: ["Program_Engagement__c"],
    relatedPennyCapabilities: ["cap-learner-coaching", "cap-slack-messaging", "cap-weekly-reviews"],
    relatedStandards: ["std-slack-activity"],
    relatedSources: ["src-penny-generated", "src-assessments"],
    trustLevel: "Unverified",
    reviewCycle: "Continuous (real-time)",
    lastReviewDate: "Not yet",
    nextReviewDate: "Q3 2025",
    accessStatus: "Not Connected",
    syncStatus: "Future",
    availability: "Future",
    approvedForPenny: false,
    pennyUseDescription: "Not yet available. When connected, Penny will use recent DM history as conversation context (last 5 turns) and channel history for cohort-level pattern detection.",
    healthStatus: "Future",
    healthIssues: ["Source does not exist yet — pending Slack API integration", "Privacy and data retention policy not yet defined", "Learner consent model for conversation logging not designed"],
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
    pennyUseDescription: "Not yet available. When connected, Calendar events will be the trigger source for reminder capabilities and the scheduling context for weekly review conversations.",
    healthStatus: "Future",
    healthIssues: ["Source does not exist yet — pending Google Calendar API integration", "Calendar schema mapping to Salesforce Service_Schedule__c not yet designed"],
    futureIntegrationPath: "Q3 2025 — Google Calendar API via service account. Read-only event access. Penny triggers on event proximity (24h, 1h, 15min).",
    integrationPriority: "P2",
  },
];

// ── Enrich sources using live integration status ───────────────────────────────
function enrichSources(integrationStatus: Record<string, string>): KnowledgeSource[] {
  return KNOWLEDGE_SOURCES.map(src => {
    const integrationKey = SOURCE_INTEGRATION_MAP[src.id];
    if (!integrationKey) return src;

    const status = integrationStatus[integrationKey] ?? "error";
    const syncStatus: SyncStatus =
      status === "live"    ? "Live"   :
      status === "phase-2" ? "Future" :
      src.syncStatus;

    const healthIssues = filterStaleHealthIssues(src.healthIssues, integrationKey, integrationStatus);
    return { ...src, syncStatus, healthIssues };
  });
}

// ── GET /api/knowledge/sources ────────────────────────────────────────────────
// Returns full KnowledgeSource[] enriched with live SF metrics + integration
// health derived from actual connectivity checks (not hardcoded constants).

router.get("/knowledge/sources", async (req, res): Promise<void> => {
  try {
    const metrics = await fetchSfLiveMetrics();
    const integrationStatus = buildIntegrationStatus(metrics.sfLive);
    const sources = enrichSources(integrationStatus);
    res.json({ sources, metrics, integrationStatus, fetchedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error(err, "Failed to build knowledge sources response");
    res.status(500).json({ error: "Failed to fetch knowledge sources" });
  }
});

// ── Document helpers ──────────────────────────────────────────────────────────

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
  { id: "1",  entityType: "document", name: "Brand Book",                   category: "Brand",       status: "Active",      confidence: "confirmed", owner: "Leadership",          lastUpdated: "Jun 2025", programs: ["All"],                                         summary: "Defines Transition Trails' visual identity, voice, tone, and design system. The authoritative reference for any external or internal communication design.",                                                                                                                                                   purpose: "Establish and protect brand consistency across all programs, materials, and communications.",                                                              quickTake: "If it carries a Transition Trails name or logo, this document governs how it looks and sounds.",               keyDecisionsInfluenced: ["Logo and color usage", "Typography standards", "Tone of voice for all materials", "Approved imagery styles"],                  sourceOfTruthFor: ["Brand colors and palette", "Logo usage rules", "Typography hierarchy", "Official tone and voice"], notSourceOfTruthFor: ["Program curriculum", "Pricing", "Org structure", "Operational processes"],                keySections: ["Brand story", "Color system", "Typography", "Logo usage", "Voice and tone guidelines"],                        relatedDocuments: ["Master Program Overview", "Facilitator Guide"] },
  { id: "2",  entityType: "document", name: "Master Program Overview",       category: "Strategy",    status: "Active",      confidence: "confirmed", owner: "Program Director",    lastUpdated: "Jun 2025", programs: ["All"],                                         summary: "High-level strategic overview of all Transition Trails programs, their relationships, sequencing, and organizational purpose.",                                                                                                                                                                                  purpose: "Provide a single authoritative reference for program scope, positioning, and strategic intent across the full ecosystem.",                                   quickTake: "Start here if you are new to Transition Trails or need to explain the program ecosystem to a stakeholder.",     keyDecisionsInfluenced: ["Program sequencing decisions", "Entry-point definitions", "Partnership positioning", "Funder communications"],              sourceOfTruthFor: ["Program sequence and dependencies", "High-level audience definitions", "Ecosystem structure"],     notSourceOfTruthFor: ["Detailed curriculum content", "Pricing figures", "Delivery logistics", "Individual sprint plans"], keySections: ["Program overview table", "Audience matrix", "Program dependencies", "Strategic positioning"],                   relatedDocuments: ["Program Comparison Sheet", "Brand Book", "Pricing Analysis"] },
  { id: "3",  entityType: "document", name: "Explorer's Trail Blueprint",    category: "Program",     status: "Active",      confidence: "confirmed", owner: "Curriculum Lead",     lastUpdated: "May 2025", programs: ["Explorer's Trail"],                            summary: "Comprehensive design document for the Explorer's Trail program, including learning objectives, session structure, delivery format, and facilitator guidance.",                                                                                                                                                       purpose: "Serve as the complete operational and curricular reference for delivering Explorer's Trail.",                                                              quickTake: "The single source of truth for what Explorer's Trail teaches, how it is structured, and who delivers it.",     keyDecisionsInfluenced: ["Session plan design", "Facilitator preparation", "Learner eligibility", "Program duration"],               sourceOfTruthFor: ["Explorer's Trail learning objectives", "Session structure", "Delivery format", "Learner outcomes"], notSourceOfTruthFor: ["Pricing", "Organization-wide strategy", "Technology layer details"],                             keySections: ["Program overview", "Learning objectives", "Session-by-session plan", "Facilitator notes", "Assessment approach"], relatedDocuments: ["Facilitator Guide", "Master Program Overview", "Brand Book"] },
  { id: "4",  entityType: "document", name: "Foundations Trail Blueprint",   category: "Program",     status: "Active",      confidence: "confirmed", owner: "Curriculum Lead",     lastUpdated: "May 2025", programs: ["Foundations Trail"],                           summary: "Comprehensive design document for Foundations Trail, covering technical curriculum, Salesforce module structure, professional presence training, and hybrid delivery.",                                                                                                                                             purpose: "Serve as the complete operational and curricular reference for delivering Foundations Trail.",                                                             quickTake: "The source of truth for Foundations Trail content, structure, and learning expectations.",                     keyDecisionsInfluenced: ["Technical content selection", "Assessment design", "Hybrid session structure", "Prerequisites definition"],                 sourceOfTruthFor: ["Foundations Trail curriculum", "Technical modules", "Learning sequence", "Delivery format"],        notSourceOfTruthFor: ["Pricing", "Ecosystem-wide dependencies", "Penny AI configuration"],                              keySections: ["Program overview", "Technical curriculum map", "Professional presence module", "Salesforce module", "Assessment approach"], relatedDocuments: ["Explorer's Trail Blueprint", "Guided Trail Blueprint", "Facilitator Guide", "Program Comparison Sheet"] },
  { id: "5",  entityType: "document", name: "Guided Trail Blueprint",        category: "Program",     status: "Active",      confidence: "confirmed", owner: "Curriculum Lead",     lastUpdated: "Jun 2025", programs: ["Guided Trail"],                                summary: "The definitive reference for Guided Trail — the flagship 12-week sprint-based program. Covers all four sprint modules, project expectations, facilitator roles, and learner milestones.",                                                                                                                              purpose: "Provide the complete design authority for Guided Trail curriculum, sprint structure, and delivery.",                                                        quickTake: "Most important program document for Guided Trail facilitators and program managers. Sprint plans are derived from here.", keyDecisionsInfluenced: ["Sprint module design", "Project scope and deliverables", "Facilitator team structure", "Assessment criteria"],          sourceOfTruthFor: ["Guided Trail module content", "Sprint cadence overview", "Learning objectives per sprint", "Portfolio requirements"], notSourceOfTruthFor: ["Week-by-week sprint schedules (see Sprint Cadence doc)", "Pricing", "Intern-specific guidance (see Intern Workbook)"], keySections: ["Program philosophy", "Sprint structure overview", "Module content by sprint", "Portfolio and assessment", "Facilitator responsibilities"], relatedDocuments: ["Guided Trail Sprint Cadence", "RESOLVE Course Canvas", "Intern Workbook", "Trail Guide Framework"] },
  { id: "6",  entityType: "document", name: "Trail of Mastery Proposal",     category: "Program",     status: "Draft",       confidence: "draft",     owner: "Program Director",    lastUpdated: "Apr 2025", programs: ["Trail of Mastery"],                            summary: "Early-stage proposal document outlining the vision, intended audience, and strategic rationale for a Trail of Mastery advanced program.",                                                                                                                                                                           purpose: "Document the initial vision and secure internal alignment to develop Trail of Mastery.",                                                                   quickTake: "Treat all details here as proposed, not confirmed. Do not use this as a delivery reference — it is not a blueprint yet.", keyDecisionsInfluenced: ["Whether to develop Trail of Mastery", "Target audience framing", "Strategic positioning within ecosystem"],                  sourceOfTruthFor: ["Intent and vision for Trail of Mastery"],                                                           notSourceOfTruthFor: ["Duration", "Pricing", "Curriculum", "Outcomes — none are confirmed"],                           keySections: ["Problem statement", "Proposed audience", "Vision and goals", "Open questions"],                                relatedDocuments: ["Guided Trail Blueprint", "Pricing Analysis", "Program Comparison Sheet"] },
  { id: "7",  entityType: "document", name: "Digital Compass Blueprint",     category: "Program",     status: "Active",      confidence: "confirmed", owner: "Partnerships Lead",   lastUpdated: "May 2025", programs: ["Digital Compass"],                             summary: "Design and delivery reference for the Digital Compass nonprofit client program. Covers organizational engagement model, curriculum structure, and client partnership expectations.",                                                                                                                                   purpose: "Guide delivery of Digital Compass for nonprofit organizational clients.",                                                                                  quickTake: "This is the operational reference for Digital Compass — distinct from all individual-learner programs.",       keyDecisionsInfluenced: ["Client engagement model", "Curriculum for nonprofit context", "Partnership terms", "Grant reporting"],               sourceOfTruthFor: ["Digital Compass program design", "Nonprofit engagement approach", "Client curriculum"],             notSourceOfTruthFor: ["Individual learner track details", "Main program sequence", "Pricing for individual programs"], keySections: ["Nonprofit client model", "Curriculum overview", "Delivery format", "Partnership expectations", "Outcome metrics"], relatedDocuments: ["Brand Book", "RESOLVE Course Canvas", "Master Program Overview"] },
  { id: "8",  entityType: "document", name: "Pricing Analysis",              category: "Finance",     status: "Active",      confidence: "confirmed", owner: "Operations",          lastUpdated: "Jun 2025", programs: ["All"],                                         summary: "Internal financial analysis covering program pricing models, cost structures, grant-funding assumptions, and pricing strategy across the program portfolio.",                                                                                                                                                       purpose: "Provide the authoritative reference for pricing decisions, grant budget alignment, and revenue modeling.",                                                  quickTake: "The only document where pricing figures should be sourced from. Do not cite pricing from any other document.", keyDecisionsInfluenced: ["Program pricing decisions", "Scholarship and subsidy structures", "Grant budget alignment", "Employer-sponsored pricing"], sourceOfTruthFor: ["All program pricing figures", "Cost model assumptions", "Subsidy and scholarship logic"],            notSourceOfTruthFor: ["Curriculum", "Program design", "Audience definitions"],                                          keySections: ["Pricing model by program", "Cost assumptions", "Grant-funding analysis", "Employer sponsorship model"],        relatedDocuments: ["Program Comparison Sheet", "Master Program Overview"] },
  { id: "9",  entityType: "document", name: "Program Comparison Sheet",      category: "Strategy",    status: "Active",      confidence: "confirmed", owner: "Program Director",    lastUpdated: "Jun 2025", programs: ["All"],                                         summary: "Side-by-side matrix comparing all Transition Trails programs across key dimensions: audience, prerequisites, format, duration, outcomes, and positioning.",                                                                                                                                                         purpose: "Enable quick comparison and communication of the full program portfolio for internal planning and external stakeholder conversations.",                      quickTake: "Use this for any conversation that compares programs or explains the ecosystem to new stakeholders.",          keyDecisionsInfluenced: ["Learner guidance conversations", "Stakeholder presentations", "Funder reporting", "Program differentiation messaging"],      sourceOfTruthFor: ["Cross-program comparisons", "Audience and prerequisite matrix"],                                   notSourceOfTruthFor: ["Pricing (see Pricing Analysis)", "Detailed curriculum (see individual blueprints)"],             keySections: ["Comparison matrix", "Audience definitions", "Prerequisites summary", "Outcome comparison", "Positioning notes"], relatedDocuments: ["Master Program Overview", "Pricing Analysis", "All program blueprints"] },
  { id: "10", entityType: "document", name: "Trail Guide Framework",         category: "Curriculum",  status: "Active",      confidence: "confirmed", owner: "Curriculum Lead",     lastUpdated: "Apr 2025", programs: ["Guided Trail", "Trail of Mastery"],            summary: "Defines the Trail Guide pedagogical framework — the coaching and mentorship philosophy that underpins how facilitators and Penny's Trail Guide capability support learner progression.",                                                                                                                             purpose: "Establish the conceptual and practical framework for how learner guidance operates across programs.",                                                       quickTake: "The intellectual foundation behind how Trail Guide (Penny) and human facilitators approach learner support.", keyDecisionsInfluenced: ["Facilitator coaching approach", "Trail Guide AI design principles", "Learner touchpoint design"],               sourceOfTruthFor: ["Trail Guide methodology", "Coaching philosophy", "Guidance principles"],                           notSourceOfTruthFor: ["Technical implementation of Penny", "Session content", "Sprint schedules"],                     keySections: ["Framework philosophy", "Guidance principles", "Facilitator application", "AI integration notes"],              relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide", "RESOLVE Course Canvas"] },
  { id: "11", entityType: "document", name: "RESOLVE Course Canvas",         category: "Curriculum",  status: "Active",      confidence: "confirmed", owner: "Curriculum Lead",     lastUpdated: "May 2025", programs: ["Guided Trail"],                                summary: "Course canvas for the RESOLVE module within Guided Trail. Defines how the R.E.S.O.L.V.E. framework is taught as a curriculum unit.",                                                                                                                                                                               purpose: "Provide the instructional design reference for delivering RESOLVE as a taught framework within Guided Trail.",                                              quickTake: "The source of truth for how RESOLVE is taught — not a description of RESOLVE as an operational framework.",    keyDecisionsInfluenced: ["RESOLVE module content", "Assessment design", "Learner activities", "Sprint placement"],                sourceOfTruthFor: ["RESOLVE curriculum as taught in Guided Trail", "Learning objectives for RESOLVE module"],          notSourceOfTruthFor: ["Operational use of RESOLVE across the org", "Demand management process", "Owner roles"],         keySections: ["Learning objectives", "Module activities", "Assessment approach", "Facilitator notes", "RESOLVE phase breakdown"], relatedDocuments: ["Guided Trail Blueprint", "Trail Guide Framework", "Guided Trail Sprint Cadence"] },
  { id: "12", entityType: "document", name: "Guided Trail Sprint Cadence",   category: "Operations",  status: "Active",      confidence: "confirmed", owner: "Operations",          lastUpdated: "Jun 2025", programs: ["Guided Trail"],                                summary: "Week-by-week operational schedule for Guided Trail's four sprints. Defines session timing, milestone check-ins, project deadlines, and facilitator coordination points.",                                                                                                                                            purpose: "Serve as the operational calendar and scheduling reference for Guided Trail delivery.",                                                                     quickTake: "The week-by-week delivery schedule. Facilitators and operations staff use this to plan and execute each sprint.", keyDecisionsInfluenced: ["Session scheduling", "Milestone timing", "Facilitator coordination", "Learner deadline setting"],              sourceOfTruthFor: ["Week-by-week Guided Trail schedule", "Sprint milestone dates", "Session timing"],                  notSourceOfTruthFor: ["Curriculum content (see Blueprint)", "Assessment criteria", "Learner eligibility"],              keySections: ["Sprint 1 schedule", "Sprint 2 schedule", "Sprint 3 schedule", "Sprint 4 schedule", "Milestone calendar"], relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide", "RESOLVE Course Canvas"] },
  { id: "13", entityType: "document", name: "Facilitator Guide",             category: "Operations",  status: "Active",      confidence: "confirmed", owner: "Lead Facilitator",    lastUpdated: "May 2025", programs: ["Explorer's Trail", "Foundations Trail"],       summary: "Practical facilitation reference for Explorer's Trail and Foundations Trail. Covers session setup, facilitation techniques, learner engagement strategies, and troubleshooting.",                                                                                                                                   purpose: "Equip facilitators with the practical knowledge to deliver Explorer's Trail and Foundations Trail effectively.",                                            quickTake: "The facilitator's handbook for the first two programs. If a facilitator has a delivery question for Explorer's or Foundations Trail, this is the first place to look.", keyDecisionsInfluenced: ["Facilitation approach", "Session pacing", "Learner support strategies", "Logistics and setup"], sourceOfTruthFor: ["Facilitation methodology for Explorer's and Foundations Trail", "Session setup guidance"],        notSourceOfTruthFor: ["Curriculum content (see Blueprints)", "Guided Trail facilitation", "Penny or Trail OS configuration"], keySections: ["Facilitator role overview", "Session preparation checklist", "Facilitation techniques", "Learner engagement strategies", "Troubleshooting guide"], relatedDocuments: ["Explorer's Trail Blueprint", "Foundations Trail Blueprint", "Brand Book"] },
  { id: "14", entityType: "document", name: "Intern Workbook",               category: "HR",          status: "Draft",       confidence: "draft",     owner: "Program Director",    lastUpdated: "Mar 2025", programs: ["Guided Trail"],                                summary: "Draft workbook for intern participants in Guided Trail. Covers intern-specific orientation, role expectations, project contributions, and reflective practice exercises.",                                                                                                                                           purpose: "Support interns participating in Guided Trail with structured guidance specific to their role.",                                                            quickTake: "Draft status — do not treat this as finalized guidance. Contents subject to change.",                         keyDecisionsInfluenced: ["Intern onboarding process", "Intern project contributions", "Intern evaluation criteria"],              sourceOfTruthFor: ["Intern-specific guidance for Guided Trail"],                                                        notSourceOfTruthFor: ["General learner guidance (see Blueprint)", "Pricing or program structure"],                      keySections: ["Intern role overview", "Orientation checklist", "Project contribution expectations", "Reflective exercises"], relatedDocuments: ["Guided Trail Blueprint", "Guided Trail Sprint Cadence", "Facilitator Guide"] },
];

// ── Seed DB from static SEED_DOCS on first empty load ─────────────────────────
async function seedDocumentsIfEmpty(): Promise<void> {
  const existing = await db.select().from(knowledgeDocumentsTable);
  if (existing.length > 0) return;
  for (const doc of SEED_DOCS) {
    await db.insert(knowledgeDocumentsTable).values({ id: doc.id, data: doc }).onConflictDoNothing();
  }
}

// ── GET /api/knowledge/documents ──────────────────────────────────────────────

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

// ── POST /api/knowledge/documents ─────────────────────────────────────────────

router.post("/knowledge/documents", async (req, res): Promise<void> => {
  const body = req.body as Partial<SourceDocument>;
  if (!body.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const rows = await db.select().from(knowledgeDocumentsTable).orderBy(knowledgeDocumentsTable.createdAt);
    const maxId = rows.reduce((max, r) => {
      const n = parseInt((r.data as { id?: string })?.id ?? "0", 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const newId = String(maxId + 1);
    const doc: SourceDocument = {
      entityType: "document",
      name: body.name.trim(),
      category: "Program",
      status: "Draft",
      confidence: "draft",
      owner: "",
      lastUpdated: new Date().toLocaleString("default", { month: "short", year: "numeric" }),
      programs: [],
      summary: "",
      purpose: "",
      quickTake: "",
      keyDecisionsInfluenced: [],
      sourceOfTruthFor: [],
      notSourceOfTruthFor: [],
      keySections: [],
      relatedDocuments: [],
      ...body,
      id: newId,
    };
    await db.insert(knowledgeDocumentsTable).values({ id: newId, data: doc });
    res.status(201).json({ document: doc });
  } catch (err) {
    req.log.error(err, "Failed to create knowledge document");
    res.status(500).json({ error: "Failed to create document" });
  }
});

// ── PATCH /api/knowledge/documents/:id ────────────────────────────────────────

router.patch("/knowledge/documents/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const [existing] = await db
      .select()
      .from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const merged: SourceDocument = {
      ...(existing.data as SourceDocument),
      ...(req.body as Partial<SourceDocument>),
      id,
      // Always stamp the display date when a document is saved through Trail OS.
      lastUpdated: new Date().toLocaleString("default", { month: "short", year: "numeric" }),
    };
    await db
      .update(knowledgeDocumentsTable)
      .set({ data: merged, updatedAt: new Date() })
      .where(eq(knowledgeDocumentsTable.id, id));
    res.json({ document: merged });
  } catch (err) {
    req.log.error(err, "Failed to update knowledge document");
    res.status(500).json({ error: "Failed to update document" });
  }
});

// ── DELETE /api/knowledge/documents/:id ───────────────────────────────────────

router.delete("/knowledge/documents/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const [existing] = await db
      .select()
      .from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    await db.delete(knowledgeDocumentsTable).where(eq(knowledgeDocumentsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err, "Failed to delete knowledge document");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
