export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

export interface TrailOsCapability {
  id: string;
  entityType: 'trail-os-capability';
  confidence: ConfidenceStatus;
  name: string;
  description: string;
  executiveSummary: string;
  whyItMatters: string;
  keyFacts: string[];
  programs: string[];
  penny: string[];
  resolve: string[];
}

export const trailOsCapabilities: TrailOsCapability[] = [
  {
    id: "intake",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Intake Coordination",
    description: "Manages program applications, assessments, and enrollment workflows",
    executiveSummary: "Intake Coordination manages all program applications, assessments, and enrollment workflows — the entry point of the operational system.",
    whyItMatters: "Without structured intake, learner placement becomes ad hoc and program capacity is mismanaged.",
    keyFacts: ["First operational touchpoint for learners", "Feeds Learner-Client Matching", "Active in Explorer's Trail and Digital Compass"],
    programs: ["Explorer's Trail", "Digital Compass"],
    penny: ["Trail Guide"],
    resolve: ["Recognize", "Evaluate"]
  },
  {
    id: "delivery",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Project Delivery",
    description: "Coordinates sprint cadences, milestones, and facilitator assignments",
    executiveSummary: "Project Delivery coordinates sprint cadences, facilitator assignments, and milestone tracking across program cohorts.",
    whyItMatters: "Delivery coordination is what turns a curriculum design into a reliably delivered program.",
    keyFacts: ["Sprint and milestone management", "Facilitator scheduling", "Active in Foundations and Guided Trail"],
    programs: ["Foundations Trail", "Guided Trail"],
    penny: ["Build Companion", "Quest Master"],
    resolve: ["Organize", "Execute"]
  },
  {
    id: "docs",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Documentation",
    description: "Central knowledge base for blueprints, canvases, and program artifacts",
    executiveSummary: "Documentation is the central knowledge base for program blueprints, course canvases, and operational artifacts.",
    whyItMatters: "Without centralized documentation, institutional knowledge lives in emails and memory rather than accessible references.",
    keyFacts: ["Houses all active program blueprints", "Supports source-of-truth access", "Connected to Curriculum Lead workflows"],
    programs: ["Foundations Trail"],
    penny: ["Learning Coach"],
    resolve: ["Solve"]
  },
  {
    id: "matching",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Learner-Client Matching",
    description: "Aligns learner skills and interests with client and employer needs",
    executiveSummary: "Learner-Client Matching aligns learner skills, interests, and readiness with employer and client partner needs.",
    whyItMatters: "Placement quality depends on match quality. Poor matching wastes employer relationships and learner potential.",
    keyFacts: ["Driven by Career Translator outputs", "Connects learner profiles to employer opportunities", "Active at Explorer's Trail exit"],
    programs: ["Explorer's Trail"],
    penny: ["Career Translator"],
    resolve: ["Leverage"]
  },
  {
    id: "readiness",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Org Readiness",
    description: "Assesses organizational capacity for program delivery and partner engagement",
    executiveSummary: "Org Readiness assesses whether Transition Trails and its partners have the capacity to deliver programs effectively.",
    whyItMatters: "Launching programs without org readiness leads to poor delivery quality and facilitator burnout.",
    keyFacts: ["Covers internal and partner capacity", "Used before new cohort launches", "Active in Explorer's Trail and Digital Compass"],
    programs: ["Explorer's Trail", "Digital Compass"],
    penny: [],
    resolve: ["Evaluate", "Organize"]
  },
  {
    id: "visibility",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Coach Visibility",
    description: "Dashboard for coaches to track learner progress, flag risks, and coordinate support",
    executiveSummary: "Coach Visibility gives coaches a real-time dashboard view of learner progress, engagement, and risk signals.",
    whyItMatters: "Coaches can only intervene effectively if they can see where learners are struggling. Visibility makes coaching proactive.",
    keyFacts: ["Flags at-risk learners", "Tracks session attendance and project progress", "Connects to Coach Intelligence Layer"],
    programs: ["Foundations Trail", "Trail of Mastery"],
    penny: ["Learning Coach", "Coach Intelligence Layer"],
    resolve: ["Leverage", "Verify"]
  },
  {
    id: "outcomes",
    entityType: "trail-os-capability",
    confidence: "confirmed",
    name: "Outcomes Tracking",
    description: "Captures placement rates, skill gains, employer feedback, and program metrics",
    executiveSummary: "Outcomes Tracking captures placement rates, skill gains, employer feedback, and program metrics for reporting and improvement.",
    whyItMatters: "Without outcomes data, the organization cannot demonstrate impact to funders or improve programs systematically.",
    keyFacts: ["Tracks 90-day placement rates", "Captures employer feedback", "Feeds into Evolve phase of RESOLVE"],
    programs: ["Guided Trail", "Digital Compass"],
    penny: ["Exam Coach"],
    resolve: ["Verify", "Evolve"]
  }
];
