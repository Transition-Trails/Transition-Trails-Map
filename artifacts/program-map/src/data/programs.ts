export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

// ── Sub-structure types ────────────────────────────────────────────────────────

/** A named role track within a programme (e.g. Trail of Mastery role specialisations) */
export interface ProgramTrack {
  id: string;
  name: string;
  description?: string;
  duration?: string;            // delivery duration for this track
  certificationAnchor?: string; // deliberately left empty until all four are confirmed
}

/** A membership tier within a programme (e.g. Explorer's Trail access tiers) */
export interface ProgramMembershipTier {
  id: string;
  name: string;
  pricing?: string;      // price as stated in source materials
  audience?: string;     // who this tier is for
  coreBenefit?: string;  // what they are buying
  churnRisk?: string;    // primary churn risk for this tier
  description?: string;
}

/** One level of the coaching ladder */
export interface CoachingLadderLevel {
  id: string;
  name: string;
}

/** Coaching ladder configuration — record as a benefit of the membership, not a separate programme */
export interface CoachingLadderConfig {
  levels: CoachingLadderLevel[];
  source: string;        // who the coaches are drawn from
  solves: string[];      // the three things it solves simultaneously
  membershipNote: string; // relationship to the alumni tier
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
  pricing: string; // kept for sidebar only, not shown on map cards — blank if unconfirmed or tier-based
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
  tracks?: ProgramTrack[];
  trackCompositionRules?: string[];  // rules governing how tracks may be combined
  membershipTiers?: ProgramMembershipTier[];
  coachingLadderConfig?: CoachingLadderConfig;
  earnedMembership?: string;         // how membership can be earned rather than bought
  cohortStructure?: CohortStructure;
  firstCohort?: FirstCohort;         // first scheduled cohort, year only
  crossProgramme?: boolean;          // true if the programme runs across all others
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
    pricingStatus: "paid",
    confidence: "confirmed",
    sourceDoc: "Explorer's Trail Blueprint",
    strategicRole: "Entry point — removes access barriers and builds foundational digital literacy",
    audience: "Job seekers with no prior tech background; career changers",
    prerequisite: "None",
    format: "Cohort-based, online synchronous",
    duration: "4 weeks",
    pricing: "", // tier-based — see membershipTiers for per-tier pricing
    coreOutcome: "Learners gain foundational digital literacy and career readiness tools",
    executiveSummary: "Explorer's Trail is the no-barrier entry program designed for adults new to digital work environments. It removes cost and prerequisite obstacles so that underserved job seekers can access the Transition Trails ecosystem. Success here feeds the entire program pipeline.",
    whyItMatters: "Without Explorer's Trail, there is no accessible entry point for non-technical learners. The entire cohort pipeline depends on this program functioning as a reliable, high-quality on-ramp.",
    keyFacts: [
      "Three membership tiers: Community Pass, Full Membership, Full Membership plus Coaching",
      "Membership can be earned rather than bought — completing Guided Trail earns membership; Guided Trail plus an apprenticeship earns it for life",
      "Coaching is what the top tier sells — Penny coaches every tier; a human coach is the upgrade",
      "Coaching ladder drawn from Guided Trail alumni who stayed: Coach's Assistant, Associate Coach, Advanced TT Coach",
      "No prior tech experience required",
      "Online synchronous — maximizes access",
      "Direct feeder into Foundations Trail",
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
    membershipTiers: [
      {
        id: "community-pass",
        name: "Community Pass",
        pricing: "$27 monthly",
        audience: "The curious — people deciding whether Salesforce is for them",
        coreBenefit: "Permission to start: a low-stakes first win inside two weeks and an honest answer about what the career involves",
        churnRisk: "Month two, having read a lot and built nothing",
      },
      {
        id: "full-membership",
        name: "Full Membership",
        pricing: "$97 monthly or $1,164 annually",
        audience: "Active learners — studying for a certification, or filling gaps their accidental-admin job created",
        coreBenefit: "A habit and a next step: something new every month at their level, and a visible route into Foundations or Guided Trail",
        churnRisk: "A mission that is too easy or too hard twice in a row",
        description: "This is the tier that converts.",
      },
      {
        id: "full-membership-plus-coaching",
        name: "Full Membership plus Coaching",
        pricing: "$1,464 annually",
        audience: "Working alumni — employed and not needing the monthly missions",
        coreBenefit: "Belonging and standing",
        churnRisk: "Having nothing to do",
      },
    ],
    coachingLadderConfig: {
      levels: [
        { id: "coachs-assistant",   name: "Coach's Assistant" },
        { id: "associate-coach",    name: "Associate Coach" },
        { id: "advanced-tt-coach",  name: "Advanced TT Coach" },
      ],
      source: "People who have completed Guided Trail and stayed in Explorer's Trail",
      solves: [
        "Alumni retention",
        "Delivery capacity for Guided Trail and the apprenticeships",
        "Founder independence",
      ],
      membershipNote: "The alumni tier's core benefit rather than a career perk — record as a benefit of the membership, not as a separate programme",
    },
    earnedMembership: "Completing Guided Trail earns membership. Guided Trail plus an apprenticeship earns it for life. Activation should be automatic from the programme record on completion confirmation.",
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
      "Completion earns Explorer's Trail membership; completion plus an apprenticeship earns it for life",
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
    executiveSummary: "Trail of Mastery delivers through four role tracks (Admin, Product Owner, Business Analyst, Advanced Admin), each defined by the decision it owns and the evidence type it produces. Cohort 0 is planned for 2027. Solution Consultant and Solution Architect were deliberately removed from the role set. Full programme details should be confirmed against the Trail of Mastery Proposal before being treated as authoritative.",
    whyItMatters: "This program closes the loop on the ecosystem by giving the most advanced learners a path toward becoming practitioners, coaches, or organizational consultants — expanding Transition Trails' alumni-to-contributor pipeline.",
    keyFacts: [
      "Status: Proposal — not yet active",
      "Four role tracks: Admin, Product Owner, Business Analyst, Advanced Admin",
      "Each role is defined by the decision it owns",
      "Composition rule: never two owners of the same decision — two roles owning the same decision means one of them is shadowing",
      "Solution Consultant and Solution Architect deliberately removed — SC collided with Product Owner and Admin; SA collided with Advanced Admin",
      "Cohort 0 planned for 2027",
      "Certification anchors not yet confirmed for all four tracks — do not guess",
      "Primary source: Trail of Mastery Proposal document"
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
    tracks: [
      {
        id: "admin",
        name: "Admin Track",
        description: "Evidence is the build — a working configuration. Eight to ten weeks, because competence can be proved inside one delivery cycle.",
        duration: "8–10 weeks",
        // certificationAnchor: not yet confirmed — do not fill
      },
      {
        id: "advanced-admin",
        name: "Advanced Admin Track",
        description: "Evidence is the build. Eight to ten weeks.",
        duration: "8–10 weeks",
        // certificationAnchor: not yet confirmed — do not fill
      },
      {
        id: "business-analyst",
        name: "Business Analyst Track",
        description: "Evidence is judgement. Twelve weeks. The Business Analyst finds out what is true; someone else decides what happens because of it. Pairs with a Product Owner, never sits alone, and never pairs with an Admin as the only other role.",
        duration: "12 weeks",
        // certificationAnchor: not yet confirmed — do not fill
      },
      {
        id: "product-owner",
        name: "Product Owner Track",
        description: "Evidence is judgement. Twelve weeks, because a Product Owner needs a full cycle plus its consequences: a decision defended, shipped, and then lived with.",
        duration: "12 weeks",
        // certificationAnchor: not yet confirmed — do not fill
      },
    ],
    trackCompositionRules: [
      "Never two owners of the same decision — two roles owning the same decision means one of them is shadowing",
      "Business Analyst pairs with a Product Owner; never sits alone; never pairs with an Admin as the only other role",
      "Solution Consultant removed — collided with Product Owner on one side and Admin on the other",
      "Solution Architect removed — collided with Advanced Admin",
    ],
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
    pricingStatus: "subsidized",
    confidence: "draft",
    sourceDoc: "Master Program Guide",
    strategicRole: "Shared onboarding — runs across all programmes at the start of each cohort",
    audience: "All programme learners, across Foundations, Guided Trail and the apprenticeships. Cross-programme by definition.",
    prerequisite: "None — it is day one",
    format: "Facilitator-led, running inside weeks one and two of the programme itself. Not asynchronous pre-work and not something a learner completes in a gap while waiting for a cohort to form. An apprentice with a day job will not complete a module in a gap; they will complete it when it is week one and someone is expecting it.",
    duration: "2 weeks",
    pricing: "", // bundled into every programme — not separately charged
    coreOutcome: "The learner holds the shared vocabulary and has opened their Decision Log at entry number one.",
    executiveSummary: "First Two Weeks is a shared onboarding programme that runs across Foundations, Guided Trail and the apprenticeships. It establishes the shared vocabulary, opens the Decision Log, and introduces RESOLVE — teaching Recognize directly in the week the learner is actually recognising something. It is facilitator-led, running inside weeks one and two of the programme itself, not as pre-work.",
    whyItMatters: "Parity. Same words, same shape, different content. Without it, every programme becomes its own dialect and the cost lands in three places: a learner who has to relearn vocabulary at every transition, a coach who cannot move between programmes, and a funder who cannot compare one cohort to another.",
    keyFacts: [
      "Bundled into every programme — not separately charged",
      "Facilitator-led: runs inside weeks one and two, not in a gap before cohort start",
      "Shared vocabulary intended to be published as Salesforce Knowledge articles — learners and coaches read them through External Apps Login, Penny can ground on them, and a change to a definition is versioned rather than silently diverging across three programme guides",
      "Decision Log opens at entry number one and keeps counting for years",
      "Definition of Done means the same thing in week two of Foundations as in week nine of an apprenticeship",
    ],
    outcomes: [
      "Shared vocabulary taught in week one",
      "RESOLVE module split across the two weeks — Recognize taught in the week the learner is actually recognising something",
      "Decision Log opens at number one and keeps counting for years",
      "Definition of Done means the same thing in week two of Foundations as in week nine of an apprenticeship",
    ],
    whatBreaksIfMissing: "Rework rate stops being comparable across cohorts, which makes the number decoration rather than evidence. And a volunteer coach at four to six hours a week cannot learn a new process for every programme.",
    dependencies: "None — it is the true day-one start",
    pennyStatus: 'Planned',
    pennyActive: false,
    pennyFeatures: [], // Penny grounds on the shared vocabulary — no specific feature name confirmed yet
    trailOsCapabilities: ["Intake Coordination", "Documentation"],
    resolvePhases: ["Recognize", "Explore", "Select", "Outline", "Launch", "Verify", "Evolve"],
    docs: ["Master Program Guide"],
    relatedConcepts: [],
    crossProgramme: true,
  },
];
