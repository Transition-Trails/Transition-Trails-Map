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
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Strip away technical assumptions and diagnose the root cause of operational friction before any configuration begins.",
    executiveSummary: "Recognize is a disciplined pause. The team names the problem across three dimensions — people, process, and technology — before any solution is designed. The client articulates their frustration and does not specify a platform tool. Nothing moves forward without a stated root cause and a stated mission risk.",
    whyItMatters: "Without a well-defined recognition phase, programs are built for assumed needs rather than real ones. Skipping this phase is the primary cause of misaligned configuration and wasted delivery effort.",
    keyFacts: [
      "The toolkit is the five whys for simple linear issues, and current-state vs future-state process flow mapping for systemic ones",
      "The client articulates their frustration — they do not specify a platform tool",
      "Deliverable: Automation Opportunity Snapshot recording current symptom, root cause, and mission risk of inaction",
      "Nothing advances without a stated root cause and a stated mission risk"
    ],
    inputs: "Client description of frustration and operational friction; current-state process walkthrough",
    outputs: "Automation Opportunity Snapshot: current symptom, root cause, mission risk of doing nothing",
    owner: "Business analyst leads root-cause workshops; technical builder audits the environment; operations lead quantifies hours lost; client walks through their own process",
    implications: "Nothing moves forward without a stated root cause and a stated mission risk. This phase is non-negotiable — advancing without it produces misaligned configuration.",
    penny: ["Trail Guide"],
    trailOs: ["Intake Coordination"],
    relatedPrograms: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas"]
  },
  {
    id: "explore",
    entityType: "resolve-phase",
    letter: "E",
    name: "Explore",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Map the current-state process and generate candidate solutions without committing to a build.",
    executiveSummary: "Explore is the divergent phase — its principle is quantity over quality. Non-technical options count: staff training, process simplification, a policy change. Shadow systems are catalogued here, meaning local spreadsheets, unmonitored shared mailboxes, and printed workflows. Explore has failed if only one option reaches the next phase.",
    whyItMatters: "Skipping divergence leads to building the first idea rather than the best one. Documenting shadow systems here prevents them from undermining the configured solution after launch.",
    keyFacts: [
      "Principle: quantity over quality — generate multiple candidate solutions",
      "Non-technical options must be included: training, process simplification, policy change",
      "Shadow systems are catalogued: local spreadsheets, unmonitored shared mailboxes, printed workflows",
      "Deliverable: Shadow System Inventory — each system, its owner, the fields it captures, how data will be ingested",
      "Phase has failed if only one option reaches Select"
    ],
    inputs: "Automation Opportunity Snapshot from Recognize; current-state process maps; shadow system audit",
    outputs: "Shadow System Inventory: each system, its owner, fields captured, and ingestion plan; list of candidate solutions",
    owner: "Business analyst facilitates divergent option generation; technical builder audits shadow systems and technical feasibility",
    implications: "Explore has failed if only one option reaches Select. The shadow system inventory must be complete before Select or the selected solution will be undermined by data sources it did not account for.",
    penny: [],
    trailOs: ["Intake Coordination", "Org Readiness"],
    relatedPrograms: ["Explorer's Trail", "Foundations Trail", "Digital Compass"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas"]
  },
  {
    id: "select",
    entityType: "resolve-phase",
    letter: "S",
    name: "Select",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Commit to one solution with the business trade-offs written down.",
    executiveSummary: "Select is where the team commits to one path with the trade-offs documented. Every solution has trade-offs, and writing down why this path was chosen is what defends the architecture against later scope creep. Security architecture is decided here. Nothing gets built until the trade-off is written down and signed by the client.",
    whyItMatters: "Undocumented decisions become contested assumptions. A signed Co-Design Admin Decision Log is the difference between an architecture that holds under pressure and one that drifts through scope creep.",
    keyFacts: [
      "Every solution has trade-offs — documenting them defends the architecture against scope creep",
      "Security architecture is decided in this phase",
      "Deliverable: Co-Design Admin Decision Log — decision point, solution selected, alternative evaluated, technical trade-off, formal client sign-off",
      "Client approves and signs before any build begins",
      "Nothing gets built until the trade-off is written down and signed"
    ],
    inputs: "Candidate solutions and Shadow System Inventory from Explore; requirements and budget constraints; security architecture requirements",
    outputs: "Co-Design Admin Decision Log: decision point, solution selected, alternative evaluated, technical trade-off, and formal client sign-off",
    owner: "Client approves and signs; business analyst screens options against requirements and budget; technical builder models the architecture; operations lead scores adoption and training cost",
    implications: "Nothing gets built until the trade-off is written down and signed. A Select phase completed without formal sign-off is not complete.",
    penny: ["Build Companion"],
    trailOs: ["Documentation"],
    relatedPrograms: ["Foundations Trail", "Guided Trail", "Digital Compass"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas", "Guided Trail Blueprint"]
  },
  {
    id: "outline",
    entityType: "resolve-phase",
    letter: "O",
    name: "Outline",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Decompose the chosen solution into blueprints, data models, and user stories using the epic/feature/story hierarchy.",
    executiveSummary: "Outline converts the selected solution into actionable specifications. The hierarchy is: epic as the mountain, feature as the room, user story as the brick. Stories follow the INVEST framework and are paired with Given-When-Then acceptance criteria. The deliverable is a Plain-Language Improvement Brief covering the input trigger, mandatory fields, and automated decision logic.",
    whyItMatters: "Design without decomposition leads to chaotic delivery. A story without acceptance criteria cannot be verified — which means unverified work will either stall at Verify or ship with undetected defects.",
    keyFacts: [
      "Hierarchy: epic = mountain, feature = room, user story = brick",
      "Stories follow the INVEST framework",
      "Acceptance criteria are written in Given-When-Then form",
      "Deliverable: Plain-Language Improvement Brief — input trigger, mandatory fields, automated decision logic",
      "A story without acceptance criteria cannot be verified and therefore cannot be launched"
    ],
    inputs: "Co-Design Admin Decision Log from Select; architecture model; client requirements and acceptance criteria",
    outputs: "Plain-Language Improvement Brief: input trigger, mandatory fields, automated decision logic; user stories with Given-When-Then acceptance criteria",
    owner: "Business analyst decomposes epics into stories; technical builder designs data model; client signs off on acceptance criteria",
    implications: "A story without acceptance criteria cannot be verified, so it cannot be launched. Any story reaching Launch without Given-When-Then criteria is out of process.",
    penny: ["Quest Master"],
    trailOs: ["Project Delivery", "Org Readiness"],
    relatedPrograms: ["Guided Trail", "Digital Compass"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas", "Guided Trail Sprint Cadence"]
  },
  {
    id: "launch",
    entityType: "resolve-phase",
    letter: "L",
    name: "Launch",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Deploy the configuration, or run the manual pilot, with a clear risk-mitigation plan.",
    executiveSummary: "Launch is managed as a process, not an event. The sequence is: sandbox deployment, manual pilot, user training, smoke test, and written fallback. The manual pilot runs before the automation. If the smoke test fails, the fallback runs. Launch is reversible by design.",
    whyItMatters: "A Launch without a written fallback is a Launch that cannot be reversed when it fails — and all launches carry failure risk. The manual pilot is not optional: it is what separates a controlled rollout from an uncontrolled one.",
    keyFacts: [
      "Launch is a process — not an event: sandbox, pilot, training, smoke test, fallback",
      "Manual pilot runs before the automation goes live",
      "Deliverable: Repository Deployment Playbook — deploy window, pre-deployment steps, component checklist, smoke test script, fallback strategy",
      "If the smoke test fails, the fallback runs",
      "Launch is reversible by design"
    ],
    inputs: "Plain-Language Improvement Brief and user stories from Outline; sandbox environment; user training materials",
    outputs: "Repository Deployment Playbook: deploy window, pre-deployment steps, component checklist, smoke test script, fallback strategy",
    owner: "Technical builder executes deployment; operations lead coordinates manual pilot; client participates in user training and smoke test sign-off",
    implications: "If the smoke test fails, the fallback runs. A Launch that cannot be reversed is not a compliant Launch. The manual pilot must occur before automation goes live.",
    penny: ["Learning Coach", "Coach Intelligence Layer"],
    trailOs: ["Coach Visibility", "Learner-Client Matching"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas", "Facilitator Guide"]
  },
  {
    id: "verify",
    entityType: "resolve-phase",
    letter: "V",
    name: "Verify",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Confirm the solution works technically, matches requirements, and delivers the business value claimed for it.",
    executiveSummary: "Verification begins at Launch and measures the system against the original problem statement. User acceptance testing is scripted in Given-When-Then form and returns a pass or a fail — never a percentage. Three quantitative models apply: reclaimed capacity, SLA compliance rate, and a data integrity and completeness coefficient. A failure returns work to Outline or Launch.",
    whyItMatters: "Without verification, the organization cannot demonstrate impact, justify pricing, or identify what to improve. Verification is the evidence layer — without it, the value claimed for any solution is an opinion, not a fact.",
    keyFacts: [
      "UAT is scripted in Given-When-Then form and returns pass or fail — never a percentage",
      "Three quantitative models: reclaimed capacity, SLA compliance rate, data integrity and completeness coefficient",
      "Deliverable: UAT Execution Scorecard — story, tester, scenario, result, detected errors",
      "Client performs the testing themselves and confirms whether the operational pain is gone",
      "A failure returns work to Outline or Launch"
    ],
    inputs: "Repository Deployment Playbook from Launch; UAT scripts in Given-When-Then form; original problem statement from Recognize",
    outputs: "UAT Execution Scorecard: story, tester, scenario, result, and any detected errors",
    owner: "Client performs the testing and confirms whether the operational pain is gone; business analyst reviews scorecard and routes failures back to Outline or Launch",
    implications: "A failure returns work to Outline or Launch. UAT that does not return a clear pass or fail is not complete. The client — not the builder — is the final judge of whether the pain is gone.",
    penny: ["Exam Coach", "Career Translator"],
    trailOs: ["Outcomes Tracking", "Coach Visibility"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas", "Pricing Analysis"]
  },
  {
    id: "evolve",
    entityType: "resolve-phase",
    letter: "E",
    name: "Evolve",
    confidence: "confirmed",
    sourceNote: "Confirmed against Master RESOLVE Methodology Handbook",
    purpose: "Establish governance, triage change requests, and feed what was learned back into a new Recognize cycle.",
    executiveSummary: "Evolve is where feedback is captured and prioritized rather than patched. A new request opens a new Recognize cycle — it does not become an immediate hotfix. The deliverable is a System Evolution and Governance Log recording feedback, system root cause, and proposed resolution. Evolve terminates in a new Recognize — the methodology is a cycle, not a line.",
    whyItMatters: "Without Evolve, unresolved feedback accumulates into compounding technical and operational debt. This phase is what separates programs that get better over time from programs that stagnate.",
    keyFacts: [
      "Feedback is captured and prioritized — not patched",
      "A new request opens a new Recognize cycle — it does not become an immediate hotfix",
      "Deliverable: System Evolution and Governance Log — feedback, system root cause, proposed resolution",
      "Evolve terminates in a new Recognize — the methodology is a cycle, not a line"
    ],
    inputs: "UAT Execution Scorecard and outcomes data from Verify; change requests and user feedback",
    outputs: "System Evolution and Governance Log: feedback, system root cause, proposed resolution; new Recognize trigger",
    owner: "Operations lead manages governance and change triage; client submits feedback; business analyst routes change requests to new Recognize cycles",
    implications: "A new request opens a new Recognize cycle — it is never an immediate hotfix. Evolve is not an endpoint; it is the beginning of the next cycle.",
    penny: [],
    trailOs: ["Outcomes Tracking"],
    relatedPrograms: ["Guided Trail", "Trail of Mastery"],
    docs: ["Master RESOLVE Methodology Handbook", "RESOLVE Course Canvas", "Master Program Overview"]
  }
];
