export const resolvePhases = [
  {
    id: "recognize",
    letter: "R",
    name: "Recognize",
    purpose: "Identify the learner/client need, program gap, or capability demand",
    inputs: "Market data, learner feedback, client requests",
    outputs: "Need definition, initial scope",
    owner: "Strategy Team",
    penny: ["Trail Guide"],
    trailOs: ["Intake Coordination"],
    implications: "Determines initial demand and alignment with overall goals."
  },
  {
    id: "evaluate",
    letter: "E",
    name: "Evaluate",
    purpose: "Assess feasibility, fit, capacity, and strategic alignment",
    inputs: "Need definition",
    outputs: "Feasibility assessment, go/no-go decision",
    owner: "Leadership",
    penny: [],
    trailOs: ["Intake Coordination", "Org Readiness"],
    implications: "Filters out misaligned or unfeasible requests."
  },
  {
    id: "solve",
    letter: "S",
    name: "Solve",
    purpose: "Design the solution — curriculum, delivery model, tech configuration",
    inputs: "Feasibility assessment",
    outputs: "Program blueprint, curriculum design",
    owner: "Curriculum Lead",
    penny: ["Build Companion"],
    trailOs: ["Documentation"],
    implications: "Sets the technical and educational foundation."
  },
  {
    id: "organize",
    letter: "O",
    name: "Organize",
    purpose: "Structure delivery — teams, timelines, resources, sprint cadence",
    inputs: "Program blueprint",
    outputs: "Sprint cadence, resourcing plan",
    owner: "Operations",
    penny: ["Quest Master"],
    trailOs: ["Project Delivery", "Org Readiness"],
    implications: "Prepares the operational environment for execution."
  },
  {
    id: "leverage",
    letter: "L",
    name: "Leverage",
    purpose: "Execute with full Trail OS + Penny support; activate all program systems",
    inputs: "Resourcing plan",
    outputs: "Active program delivery",
    owner: "Facilitators",
    penny: ["Learning Coach", "Coach Intelligence Layer"],
    trailOs: ["Coach Visibility", "Learner-Client Matching"],
    implications: "Maximizes the use of technology for coaching and matching."
  },
  {
    id: "verify",
    letter: "V",
    name: "Verify",
    purpose: "Assess outcomes against intended results; collect learner and employer feedback",
    inputs: "Active program data",
    outputs: "Outcomes report, assessment results",
    owner: "Evaluators",
    penny: ["Exam Coach", "Career Translator"],
    trailOs: ["Outcomes Tracking", "Coach Visibility"],
    implications: "Ensures the program meets its designed outcomes."
  },
  {
    id: "execute",
    letter: "E",
    name: "Execute",
    purpose: "Full operational deployment; program runs at capacity",
    inputs: "Outcomes report (for iteration)",
    outputs: "Steady-state program operations",
    owner: "Program Director",
    penny: ["All Penny Capabilities"],
    trailOs: ["Project Delivery"],
    implications: "Scales the solution to full operational capacity."
  },
  {
    id: "evolve",
    letter: "E",
    name: "Evolve",
    purpose: "Reflect, iterate, and incorporate learning into the next program cycle",
    inputs: "Outcomes and operational data",
    outputs: "Updated blueprints, revised strategies",
    owner: "Strategy Team",
    penny: [],
    trailOs: ["Outcomes Tracking"],
    implications: "Drives continuous improvement and demand forecasting."
  }
];