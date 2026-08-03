export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

// ── Sub-structure types ────────────────────────────────────────────────────────

/** A named role track within a programme (e.g. Trail of Mastery role specialisations) */
export interface ProgramTrack {
  id: string;
  name: string;
  description?: string; // leave empty until confirmed in source materials
}

/** A membership tier within a programme (e.g. Explorer's Trail access tiers) */
export interface ProgramMembershipTier {
  id: string;
  name: string;       // leave empty until tier names confirmed in source materials
  description?: string;
}

/** Cohort delivery model — squad sizes, alternates, constraints */
export interface CohortStructure {
  model: string;             // prose description of the squad model
  squadSize?: string;        // e.g. "2, 4, or 6 — always even"
  maxSquadSize?: number;     // hard cap (6 for Guided Trail)
  alternatesPerSquad?: number;
  notes?: string;
}

/** A named first cohort with a year (no quarter or half) */
export interface FirstCohort {
  label: string; // e.g. "Cohort 0"
  year: string;  // e.g. "2027" — no quarter or half suffix
}

export interface Program {
  id: string;
  entityType: 'program';
  name: string;
  color: string;
  pricingStatus: 'subsidized' | 'paid' | 'grant-subsidized';
  confidence: ConfidenceStatus;
  sourceDoc: string; // primary source of truth document name
  strategicRole: string;
  audience: string;
  prerequisite: string;
  format: string;
  duration: string;
  pricing: string; // kept for sidebar only, not shown on map cards — blank if unconfirmed
  coreOutcome: string;
  executiveSummary: string;
  whyItMatters: string;
  keyFacts: string[];
  outcomes: string[];
  whatBreaksIfMissing: string;
  dependencies: string;
  pennyStatus: 'Active' | 'Planned' | 'Not Planned';
  pennyActive: boolean;  // derived: pennyStatus === 'Active'
  pennyFeatures: string[];
  trailOsCapabilities: string[];
  resolvePhases: string[];
  docs: string[];
  relatedConcepts: Array<{ label: string; type: string; id: string }>;
  // Sub-structure — populated where the Guide defines programme-internal structure
  tracks?: ProgramTrack[];             // role tracks (Trail of Mastery)
  membershipTiers?: ProgramMembershipTier[]; // access tiers (Explorer's Trail)
  cohortStructure?: CohortStructure;   // squad/cohort delivery model (Guided Trail)
  coachingLadder?: boolean;            // true if a coaching ladder runs across tiers
  firstCohort?: FirstCohort;           // first scheduled cohort, year only
  crossProgramme?: boolean;            // true if the programme runs across all others (First Two Weeks)
  // Live Salesforce fields (populated when data comes from pmdm__Program__c)
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  shortSummary?: string | null;
  targetPopulation?: string | null;
  programIssueArea?: string | null;
  programManager?: string | null;
  programGoals?: string | null;
  programStructure?: string | null;
  targetAudience?: string | null;
  expectedOutcomes?: string | null;
  problemStatement?: string | null;
  successMetrics?: string | null;
  risksAssumptions?: string | null;
  budgetResources?: string | null;
  fundingStrategy?: string | null;
  implementationPlan?: string | null;
  partnershipOpportunities?: string | null;
  googleDriveFolder?: string | null;
  canvaFolder?: string | null;
  referenceLink?: string | null;
  requiresPayment?: boolean | null;
  sfId?: string | null;
}

export const programs: Program[] = [
  {
    id: "explorers-trail",
    entityType: "program",
    name: "Explorer's Trail",
    color: "sky-blue",
    pricingStatus: "subsidized",
    confidence: "confirmed",
    sourceDoc: "Explorer's Trail Blueprint",
    strategicRole: "Entry point — removes access barriers and builds foundational digital literacy",
    audience: "Job seekers with no prior tech background; career changers",
    prerequisite: "None",
    format: "Cohort-based, online synchronous",
    duration: "4 weeks",
    pricing: "$0 — subsidized, grant-funded",
    coreOutcome: "Learners gain foundational digital literacy and career readiness tools",
    executiveSummary: "Explorer's Trail is the no-barrier entry program designed for adults new to digital work environments. It removes cost and prerequisite obstacles so that underserved job seekers can access the Transition Trails ecosystem. Success here feeds the entire program pipeline.",
    whyItMatters: "Without Explorer's Trail, there is no accessible entry point for non-technical learners. The entire cohort pipeline depends on this program functioning as a reliable, high-quality on-ramp.",
    keyFacts: [
      "No cost to the learner (grant-funded)",
      "No prior tech experience required",
      "Online synchronous — maximizes access",
      "Direct feeder into Foundations Trail",
      "Three membership tiers with a coaching ladder running through them",
      "Facilitator Guide governs delivery"
    ],
    outcomes: ["Digital literacy", "Resume basics", "LinkedIn optimization", "Introduction to career tools"],
    whatBreaksIfMissing: "Pipeline to all downstream programs collapses. Without Explorer's Trail, only learners with existing digital skills can access Transition Trails — defeating the equity mission.",
    dependencies: "None — this is the entry point",
    pennyStatus: 'Active',
    pennyActive: true,
    pennyFeatures: ["Trail Guide", "Learning Coach", "Career Translator"],
    trailOsCapabilities: ["Intake Coordination", "Learner-Client Matching", "Org Readiness"],
    resolvePhases: ["Recognize", "Explore"],
    docs: ["Explorer's Trail Blueprint", "Facilitator Guide", "Brand Book"],
    relatedConcepts: [
      { label: "Foundations Trail", type: "program", id: "foundations-trail" },
      { label: "Trail Guide", type: "penny", id: "trail-guide" },
      { label: "Intake Coordination", type: "trailOs", id: "intake" }
    ],
    // Three membership tiers with a coaching ladder — tier names needed from Master Program Guide
    membershipTiers: [
      { id: "tier-1", name: "" }, // name not confirmed in source materials
      { id: "tier-2", name: "" }, // name not confirmed in source materials
      { id: "tier-3", name: "" }, // name not confirmed in source materials
    ],
    coachingLadder: true,
  },
  {
    id: "foundations-trail",
    entityType: "program",
    name: "Foundations Trail",
    color: "deep-teal",
    pricingStatus: "paid",
    confidence: "confirmed",
    sourceDoc: "Foundations Trail Blueprint",
    strategicRole: "Core skill-building — develops employable technical and professional competencies",
    audience: "Explorer's Trail graduates; early-career adults with basic digital literacy",
    prerequisite: "Explorer's Trail or equivalent assessment",
    format: "Cohort-based, hybrid delivery",
    duration: "6 weeks",
    pricing: "", // pricing not confirmed in source materials — do not display
    coreOutcome: "Learners develop foundational Salesforce, productivity, and professional skills",
    executiveSummary: "Foundations Trail bridges digital literacy into employable technical skills. It is the core competency-building layer of the program sequence, preparing learners for advanced project-based work in Guided Trail.",
    whyItMatters: "This program represents the highest-volume, highest-impact stage for most learners. It is where career transformation becomes concrete and measurable.",
    keyFacts: [
      "Prerequisite: Explorer's Trail or assessment",
      "Hybrid delivery format",
      "6-week cohort structure",
      "Covers Salesforce basics, productivity, professional presence",
      "Pricing not yet confirmed — do not publish a price",
      "Governed by Foundations Trail Blueprint"
    ],
    outcomes: ["Salesforce basics", "Productivity tools", "Professional presence", "Strategic analysis introduction"],
    whatBreaksIfMissing: "Learners cannot progress to Guided Trail without foundational technical competencies. The program sequence breaks and advanced cohorts cannot be filled.",
    dependencies: "Explorer's Trail",
    pennyStatus: 'Active',
    pennyActive: true,
    pennyFeatures: ["Trail Guide", "Learning Coach", "Exam Coach", "Build Companion"],
    trailOsCapabilities: ["Project Delivery", "Documentation", "Coach Visibility"],
    resolvePhases: ["Recognize", "Explore", "Select"],
    docs: ["Foundations Trail Blueprint", "Program Comparison Sheet", "Facilitator Guide"],
    relatedConcepts: [
      { label: "Explorer's Trail", type: "program", id: "explorers-trail" },
      { label: "Guided Trail", type: "program", id: "guided-trail" },
      { label: "Exam Coach", type: "penny", id: "exam-coach" }
    ]
  },
  {
    id: "guided-trail",
    entityType: "program",
    name: "Guided Trail",
    color: "trail-green",
    pricingStatus: "paid",
    confidence: "confirmed",
    sourceDoc: "Guided Trail Blueprint",
    strategicRole: "Advanced specialization — develops real-world portfolio and professional identity",
    audience: "Foundations Trail graduates; career advancers seeking specialization",
    prerequisite: "Foundations Trail or equivalent experience",
    format: "Intensive project-based, hybrid, sprint cadence",
    duration: "12 weeks (4 sprints × 3 weeks)",
    pricing: "", // pricing not confirmed in source materials — do not display
    coreOutcome: "Learners build a portfolio of real-world projects and achieve advanced tool mastery",
    executiveSummary: "Guided Trail is the flagship program — the most intensive, most structured, and most differentiated offering in the Transition Trails ecosystem. Sprint-based delivery mirrors professional work environments. Outcomes here directly drive employer placement.",
    whyItMatters: "Guided Trail is the primary driver of employer placement outcomes and organizational reputation. Its sprint cadence and project portfolio are the core differentiators of the Transition Trails model.",
    keyFacts: [
      "12 weeks across 4 structured sprints",
      "Two concurrent squads per cohort — 2, 4, or 6 learners each (always even; buddy testing pairs)",
      "Each squad has 2 alternates",
      "Squad cap: 6 learners",
      "Sprint cadence governed by Guided Trail Sprint Cadence document",
      "RESOLVE framework applied as a course module",
      "Intern Workbook structures learner engagement",
      "Most Trail OS and Penny capabilities active here"
    ],
    outcomes: ["Real-world tool mastery", "Salesforce advanced", "Strategic analysis", "Professional portfolio"],
    whatBreaksIfMissing: "The pathway to employment outcomes collapses. Without Guided Trail, learners plateau at foundational skills and the organization loses its primary value proposition to employers.",
    dependencies: "Foundations Trail",
    pennyStatus: 'Active',
    pennyActive: true,
    pennyFeatures: ["Trail Guide", "Exam Coach", "Build Companion", "Quest Master", "Career Translator"],
    trailOsCapabilities: ["Project Delivery", "Coach Visibility", "Outcomes Tracking"],
    resolvePhases: ["Select", "Outline", "Launch", "Verify"],
    docs: ["Guided Trail Blueprint", "Guided Trail Sprint Cadence", "RESOLVE Course Canvas", "Intern Workbook"],
    relatedConcepts: [
      { label: "Foundations Trail", type: "program", id: "foundations-trail" },
      { label: "Trail of Mastery", type: "program", id: "trail-of-mastery" },
      { label: "Quest Master", type: "penny", id: "quest-master" },
      { label: "Project Delivery", type: "trailOs", id: "delivery" }
    ],
    // Two concurrent squads — always even, capped at 6, plus 2 alternates each
    cohortStructure: {
      model: "Two concurrent squads per cohort",
      squadSize: "2, 4, or 6 — always even (buddy testing pairs learners)",
      maxSquadSize: 6,
      alternatesPerSquad: 2,
    },
  },
  {
    id: "trail-of-mastery",
    entityType: "program",
    name: "Trail of Mastery",
    color: "charcoal",
    pricingStatus: "paid",
    confidence: "draft",
    sourceDoc: "Trail of Mastery Proposal",
    strategicRole: "Leadership development — prepares advanced practitioners for mentorship and consulting roles",
    audience: "Guided Trail graduates; advanced practitioners seeking leadership readiness",
    prerequisite: "Guided Trail + portfolio review",
    format: "Needs Review — format not confirmed in source materials",
    duration: "Needs Review — duration not confirmed in source materials",
    pricing: "", // pricing not confirmed in source materials — do not display
    coreOutcome: "Needs Review — outcomes not confirmed beyond proposal stage",
    executiveSummary: "Trail of Mastery is currently in proposal stage. It delivers through four role tracks (Admin, Product Owner, Business Analyst, Advanced Admin). Cohort 0 is planned for 2027. Full programme details should be confirmed against the Trail of Mastery Proposal before being treated as authoritative.",
    whyItMatters: "This program would close the loop on the ecosystem by giving the most advanced learners a path toward becoming practitioners, coaches, or organizational consultants — expanding Transition Trails' alumni-to-contributor pipeline.",
    keyFacts: [
      "Status: Proposal — not yet active",
      "Four role tracks: Admin, Product Owner, Business Analyst, Advanced Admin",
      "Cohort 0 planned for 2027",
      "Primary source: Trail of Mastery Proposal document",
      "Intended audience: Guided Trail graduates",
      "Full details require source document review"
    ],
    outcomes: ["Needs Review"],
    whatBreaksIfMissing: "Advanced practitioners have no pathway within the ecosystem — they exit after Guided Trail with no continuation option.",
    dependencies: "Guided Trail",
    pennyStatus: 'Planned',
    pennyActive: false,
    pennyFeatures: ["Coach Intelligence Layer"],
    trailOsCapabilities: ["Outcomes Tracking", "Coach Visibility"],
    resolvePhases: ["Launch", "Verify"],
    docs: ["Trail of Mastery Proposal", "Pricing Analysis", "Program Comparison Sheet"],
    relatedConcepts: [
      { label: "Guided Trail", type: "program", id: "guided-trail" },
      { label: "Coach Intelligence Layer", type: "penny", id: "coach-intelligence" }
    ],
    // Four role tracks — descriptions not confirmed in source materials
    tracks: [
      { id: "admin",          name: "Admin Track" },
      { id: "product-owner",  name: "Product Owner Track" },
      { id: "business-analyst", name: "Business Analyst Track" },
      { id: "advanced-admin", name: "Advanced Admin Track" },
    ],
    // Cohort 0 — year only, no quarter or half
    firstCohort: { label: "Cohort 0", year: "2027" },
  },
  {
    id: "digital-compass",
    entityType: "program",
    name: "Digital Compass",
    color: "sun-amber",
    pricingStatus: "grant-subsidized",
    confidence: "confirmed",
    sourceDoc: "Digital Compass Blueprint",
    strategicRole: "Nonprofit client track — distinct parallel program for organizational digital transformation",
    audience: "Nonprofit staff and leadership seeking digital transformation skills",
    prerequisite: "None — separate track from the main trail sequence",
    format: "Hybrid cohort, client-organization focused",
    duration: "8 weeks",
    pricing: "Grant-subsidized; custom nonprofit pricing applies",
    coreOutcome: "Nonprofit clients gain digital strategy capability and Salesforce for nonprofits skills",
    executiveSummary: "Digital Compass is a parallel program track serving nonprofit organizations as clients rather than individual learners. It shares the Transition Trails pedagogical model but is designed for organizational change management. It connects to the main trail at the Guided Trail level for advanced participants.",
    whyItMatters: "Digital Compass diversifies Transition Trails' revenue and impact model by serving organizations, not just individuals. It also opens partnership opportunities with the nonprofit sector.",
    keyFacts: [
      "Completely separate entry track — no individual-learner prerequisites",
      "Nonprofit organizations are the clients",
      "Grant-subsidized pricing model",
      "Connects to Guided Trail level for advanced participants",
      "Digital Compass Blueprint is the source of truth"
    ],
    outcomes: ["Digital strategy", "Salesforce for nonprofits", "Data literacy", "Change management"],
    whatBreaksIfMissing: "Transition Trails loses its nonprofit client revenue stream and organizational partnership pipeline. The ecosystem becomes individual-learner-only.",
    dependencies: "Independent — connects laterally at Guided Trail level",
    pennyStatus: 'Not Planned',
    pennyActive: false,
    pennyFeatures: [],
    trailOsCapabilities: ["Intake Coordination", "Org Readiness", "Outcomes Tracking"],
    resolvePhases: ["Recognize", "Explore", "Select", "Outline"],
    docs: ["Digital Compass Blueprint", "RESOLVE Course Canvas", "Brand Book"],
    relatedConcepts: [
      { label: "Guided Trail", type: "program", id: "guided-trail" },
      { label: "Org Readiness", type: "trailOs", id: "readiness" },
      { label: "Trail Guide", type: "penny", id: "trail-guide" }
    ]
  },
  {
    id: "first-two-weeks",
    entityType: "program",
    name: "First Two Weeks",
    color: "warm-gray",
    pricingStatus: "subsidized",      // bundled with programme — pricingStatus needs confirmation
    confidence: "draft",
    sourceDoc: "Master Program Guide",
    strategicRole: "Shared onboarding — runs across all programmes at the start of each cohort",
    audience: "",                      // all programme learners — specific intake details needed
    prerequisite: "",                  // not yet confirmed in source materials
    format: "",                        // not yet confirmed in source materials
    duration: "2 weeks",
    pricing: "",                       // pricing not confirmed — do not display
    coreOutcome: "",                   // not yet confirmed in source materials
    executiveSummary: "First Two Weeks is a shared onboarding programme that runs across all Transition Trails programmes. It is described in the Master Program Guide as a cross-programme element. Detailed structure, content, and facilitation approach are not yet confirmed.",
    whyItMatters: "",                  // not yet confirmed in source materials
    keyFacts: [
      "Shared onboarding — applies to all programmes, not programme-specific",
      "Duration: 2 weeks",
      "Source: Master Program Guide",
      "Detailed structure, content, and delivery format not yet confirmed"
    ],
    outcomes: [],                      // not yet confirmed in source materials
    whatBreaksIfMissing: "",           // not yet confirmed in source materials
    dependencies: "",                  // not yet confirmed — runs across programmes
    pennyStatus: 'Planned',
    pennyActive: false,
    pennyFeatures: [],                 // not yet confirmed
    trailOsCapabilities: [],           // not yet confirmed
    resolvePhases: [],                 // not yet confirmed
    docs: ["Master Program Guide"],
    relatedConcepts: [],
    crossProgramme: true,
  },
];
