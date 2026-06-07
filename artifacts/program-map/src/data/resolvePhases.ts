export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

export interface ResolvePhase {
  id: string;
  entityType: 'resolve-phase';
  letter: string;
  name: string;
  confidence: ConfidenceStatus;
  sourceNote: string;
  purpose: string;
  executiveSummary: string;
  whyItMatters: string;
  keyFacts: string[];
  inputs: string;
  outputs: string;
  owner: string;
  implications: string;
  penny: string[];
  trailOs: string[];
  relatedPrograms: string[];
  docs: string[];
}

export const resolvePhases: ResolvePhase[] = [
  {
    id: "recognize",
    entityType: "resolve-phase",
    letter: "R",
    name: "Recognize",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Identify the learner, client, or organizational need that the program or initiative is addressing.",
    executiveSummary: "Recognize is the first phase of the RESOLVE framework — the moment of seeing and naming a need clearly before any solution is designed. Good recognition prevents misaligned programs and wasted delivery effort.",
    whyItMatters: "Without a well-defined recognition phase, programs are built for assumed needs rather than real ones. This phase prevents scope creep and misaligned solutions from the start.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Operational owner and process details require source mapping",
      "Applied in Explorer's Trail and Foundations Trail as early-stage design thinking"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: ["Trail Guide"],
    trailOs: ["Intake Coordination"],
    relatedPrograms: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    docs: ["RESOLVE Course Canvas"]
  },
  {
    id: "evaluate",
    entityType: "resolve-phase",
    letter: "E",
    name: "Evaluate",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Assess the recognized need against feasibility, capacity, strategic fit, and organizational readiness.",
    executiveSummary: "Evaluate is the gate between recognition and solution design. It prevents moving forward on needs that are real but not currently actionable — protecting organizational capacity and strategic focus.",
    whyItMatters: "Without evaluation, every recognized need becomes a new initiative. This phase enforces discipline and strategic prioritization.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Acts as a strategic gate before solution design begins",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: [],
    trailOs: ["Intake Coordination", "Org Readiness"],
    relatedPrograms: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    docs: ["RESOLVE Course Canvas"]
  },
  {
    id: "solve",
    entityType: "resolve-phase",
    letter: "S",
    name: "Solve",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Design the solution — whether a curriculum, delivery approach, technology configuration, or partnership structure.",
    executiveSummary: "Solve is where insight becomes design. After Recognize and Evaluate, this phase produces the blueprint for what will be built or delivered. It is the most creative and consequential phase for long-term program quality.",
    whyItMatters: "The quality of the Solve phase directly determines the quality of what gets delivered. Poor design here propagates through every downstream phase.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Applied heavily in Guided Trail as a curriculum module",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: ["Build Companion"],
    trailOs: ["Documentation"],
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Digital Compass"],
    docs: ["RESOLVE Course Canvas", "Guided Trail Blueprint"]
  },
  {
    id: "organize",
    entityType: "resolve-phase",
    letter: "O",
    name: "Organize",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Structure the delivery — teams, timelines, resources, sprint cadences, and operational logistics.",
    executiveSummary: "Organize converts the designed solution into an executable plan. Without this phase, even excellent designs fail to be delivered reliably. This is where sprint cadences, team structures, and resource plans are established.",
    whyItMatters: "Design without organization leads to chaotic, inconsistent delivery. This phase is the operational foundation for everything that follows.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Directly related to Guided Trail Sprint Cadence document",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: ["Quest Master"],
    trailOs: ["Project Delivery", "Org Readiness"],
    relatedPrograms: ["Guided Trail", "Digital Compass"],
    docs: ["RESOLVE Course Canvas", "Guided Trail Sprint Cadence"]
  },
  {
    id: "leverage",
    entityType: "resolve-phase",
    letter: "L",
    name: "Leverage",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Execute delivery with full activation of available resources, technology, coaching, and partnerships.",
    executiveSummary: "Leverage is active delivery — where the full power of Trail OS and Penny is engaged in service of the learner or client. This phase is where all prior planning produces visible outcomes.",
    whyItMatters: "Leverage is where learners and clients experience the program. Every other phase exists to make this phase excellent.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Peak Trail OS and Penny engagement occurs here",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: ["Learning Coach", "Coach Intelligence Layer"],
    trailOs: ["Coach Visibility", "Learner-Client Matching"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["RESOLVE Course Canvas", "Facilitator Guide"]
  },
  {
    id: "verify",
    entityType: "resolve-phase",
    letter: "V",
    name: "Verify",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Assess whether delivery achieved the intended outcomes — for learners, clients, and the organization.",
    executiveSummary: "Verify closes the delivery loop by measuring results against intended outcomes. This phase drives accountability, surfaces gaps, and generates the evidence needed for funder reporting and program improvement.",
    whyItMatters: "Without verification, the organization cannot demonstrate impact, justify pricing, or identify what to improve. Verification is the evidence layer.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Directly feeds Outcomes Tracking in Trail OS",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: ["Exam Coach", "Career Translator"],
    trailOs: ["Outcomes Tracking", "Coach Visibility"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["RESOLVE Course Canvas", "Pricing Analysis"]
  },
  {
    id: "execute",
    entityType: "resolve-phase",
    letter: "E",
    name: "Execute",
    confidence: "needs-review",
    sourceNote: "Framework name included in source. Phase-level distinction from Leverage and Evolve requires source mapping to clarify whether Execute is a distinct operational phase or a combined phase with Evolve.",
    purpose: "Full operational deployment and steady-state program running at intended capacity.",
    executiveSummary: "Execute represents the steady-state operation of a program after initial delivery has been verified and confirmed. The distinction between Leverage (active delivery) and Execute (steady-state scale) requires source mapping to clarify.",
    whyItMatters: "Source mapping needed — relationship between Execute and other delivery phases is unclear without source review.",
    keyFacts: [
      "Framework phase name included in source acronym",
      "Distinction from Leverage phase requires source mapping",
      "Treat details as preliminary until source-reviewed"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: [],
    trailOs: ["Project Delivery"],
    relatedPrograms: ["Trail of Mastery"],
    docs: ["RESOLVE Course Canvas"]
  },
  {
    id: "evolve",
    entityType: "resolve-phase",
    letter: "E",
    name: "Evolve",
    confidence: "confirmed",
    sourceNote: "Framework name confirmed via RESOLVE Course Canvas. Phase details require source mapping.",
    purpose: "Reflect, iterate, and incorporate lessons learned into the next program cycle or organizational capability.",
    executiveSummary: "Evolve is the continuous improvement phase — where what was learned in delivery becomes embedded into updated blueprints, revised processes, and new program designs. Without Evolve, the organization repeats avoidable mistakes.",
    whyItMatters: "This phase is what separates programs that get better over time from programs that stagnate. It is the engine of organizational learning.",
    keyFacts: [
      "Framework phase confirmed in RESOLVE Course Canvas",
      "Feeds directly into updated blueprints and demand forecasting",
      "Operational details require source mapping"
    ],
    inputs: "Source mapping needed",
    outputs: "Source mapping needed",
    owner: "Source mapping needed",
    implications: "Source mapping needed",
    penny: [],
    trailOs: ["Outcomes Tracking"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["RESOLVE Course Canvas", "Master Program Overview"]
  }
];
