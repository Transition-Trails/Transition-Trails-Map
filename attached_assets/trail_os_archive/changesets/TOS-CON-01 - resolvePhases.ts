// ─────────────────────────────────────────────────────────────────────────────
// TOS-CON-01 — RESOLVE, seven phases.
//
// Drop-in replacement for artifacts/program-map/src/data/resolvePhases.ts
//
// The previous version defined EIGHT phases (Recognize · Evaluate · Solve ·
// Organize · Leverage · Verify · Execute · Evolve) and carried "Source mapping
// needed" placeholders in six of them. That expansion was reconstructed from
// the acronym letters, not from the source.
//
// The Master R.E.S.O.L.V.E. Methodology Handbook, section 3, defines seven:
//   [R]ecognize · [E]xplore · [S]elect · [O]utline · [L]aunch · [V]erify · [E]volve
//
// Every field below is filled from that Handbook. Role actions come from the
// Cross-Role Alignment Matrix (section 2). Each phase's `outputs` names the
// Handbook's own deliverable for that phase. No placeholders remain.
//
// The ResolvePhase interface is unchanged, so consumers keep compiling.
// ─────────────────────────────────────────────────────────────────────────────

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

const SOURCE_NOTE =
  'Confirmed against The Master R.E.S.O.L.V.E. Methodology Handbook, section 3 (The 7 Phases). ' +
  'Role actions from the Cross-Role Alignment Matrix, section 2. Deliverable named from the ' +
  'phase artefact of the same name.';

export const resolvePhases: ResolvePhase[] = [
  {
    id: 'recognize',
    entityType: 'resolve-phase',
    letter: 'R',
    name: 'Recognize',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Strip away technical assumptions and diagnose the root cause of operational friction before any configuration begins.',
    executiveSummary:
      'Recognize is the disciplined pause. The team names the problem in terms of people, process and technology instead of accepting the first request for a tool. Before you automate the work, understand the work.',
    whyItMatters:
      'Jumping into technical configuration before defining the problem space is the primary driver of technical debt. Automation does not fix confusion, it accelerates it. Recognize is what separates a solved problem from an accelerated one.',
    keyFacts: [
      'Toolkit: the 5 Whys for linear issues, current-state and future-state process flow mapping for systemic ones',
      'Problems are categorised across three dimensions — People, Process, Technology',
      'The client articulates the frustration and does not specify the platform tool',
      'Horizon Community Hub case: the root cause was channel fragmentation, not email volume',
    ],
    inputs:
      'Raw operational frustration, system logs and object limits, hours lost to manual transcription, observation of the current process including its workarounds.',
    outputs:
      'Automation Opportunity Snapshot — current symptom, root cause, mission risk. Business Problem Statement.',
    owner:
      'Business Analyst leads the root-cause workshops. Technical Builder audits the environment. Accidental Admin quantifies the lost hours. Client runs the diagnostic autopsy of their own process.',
    implications:
      'A need that is real but not currently actionable stops here. Nothing enters Explore without a stated root cause and a stated mission risk.',
    penny: ['Trail Guide'],
    trailOs: ['Intake Coordination'],
    relatedPrograms: ["Explorer's Trail", 'Foundations Trail', 'Guided Trail', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase R', 'From Tool-User to Architect'],
  },
  {
    id: 'explore',
    entityType: 'resolve-phase',
    letter: 'E',
    name: 'Explore',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Map the current-state process and generate candidate solutions without committing to a build.',
    executiveSummary:
      'Explore is the divergent phase — quantity over quality. Every option is on the table, including the non-technical ones: staff training, process simplification, a security policy change.',
    whyItMatters:
      'Teams that skip Explore commit to the first plausible solution they think of. The phase exists so that building is a choice rather than a default.',
    keyFacts: [
      'Divergent by design — generate options before evaluating any of them',
      'Non-technical options count: training, process change, policy',
      'Shadow systems are catalogued here — local spreadsheets, unmonitored mailboxes, printed workflows',
      'Horizon Community Hub case: four options ran from an Experience Cloud portal to standardised email guidelines',
    ],
    inputs:
      'Automation Opportunity Snapshot, stakeholder interviews, review of out-of-the-box platform capability and sandbox limits, a walkthrough of the current process including bypasses.',
    outputs:
      'Shadow System Inventory — system, owner, fields captured, ingestion strategy. Current-state process map. A candidate option set with complexity and capability noted against each.',
    owner:
      'Business Analyst maps workflows and interviews users. Technical Builder explores platform and AppExchange capability. Accidental Admin catalogues shadow IT. Client explains operations without hiding the unofficial spreadsheets.',
    implications:
      'Explore has failed if only one option reaches Select. A single-option phase is a decision already taken.',
    penny: ['Trail Guide', 'Build Companion'],
    trailOs: ['Intake Coordination', 'Documentation'],
    relatedPrograms: ["Explorer's Trail", 'Foundations Trail', 'Guided Trail', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase E (Explore)'],
  },
  {
    id: 'select',
    entityType: 'resolve-phase',
    letter: 'S',
    name: 'Select',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose: 'Commit to one solution with the business trade-offs written down.',
    executiveSummary:
      'Select turns a brainstorm into a decision. Every technical solution has trade-offs, and documenting why this path was chosen is what defends the architecture against later scope creep.',
    whyItMatters:
      'An undocumented decision gets relitigated. The Decision Log is what lets a team decline a change six months later without re-running the whole analysis.',
    keyFacts: [
      'The Co-Design Admin Decision Log is this phase\u2019s artefact and a graded deliverable in Guided Trail',
      'Every entry records the alternative that was evaluated, not only the option chosen',
      'Security architecture is decided here — Horizon Community Hub set Case organisation-wide defaults to Private',
      'Client sign-off closes the phase',
    ],
    inputs:
      'The candidate option set, budget and timeline constraints, a usability and training assessment, security and data-sensitivity requirements.',
    outputs:
      'Co-Design Admin Decision Log — decision point, solution selected, alternative evaluated, technical trade-off, client sign-off. A signed project charter.',
    owner:
      'Client approves the path and signs the charter. Business Analyst screens options against requirements and budget. Technical Builder models the architecture and security setup. Accidental Admin scores adoption and training cost.',
    implications:
      'Nothing is built until the trade-off is written down and signed. This is the phase that produces the Decision Log entries the coach rubric reads.',
    penny: ['Build Companion'],
    trailOs: ['Documentation', 'Org Readiness'],
    relatedPrograms: ['Foundations Trail', 'Guided Trail', 'Trail of Mastery', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase S', 'Guided Trail Blueprint'],
  },
  {
    id: 'outline',
    entityType: 'resolve-phase',
    letter: 'O',
    name: 'Outline',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Decompose the chosen solution into technical blueprints, data models and user stories.',
    executiveSummary:
      'Outline translates business requirements into technical specification through the Agile hierarchy — the Epic as the mountain, the Feature as the room, the User Story as the brick.',
    whyItMatters:
      'Work that is not decomposed cannot be estimated, tested or verified. Outline is where "build an intake system" becomes something a learner can finish inside a sprint.',
    keyFacts: [
      'Epic → Feature → User Story, with INVEST stories and Gherkin Given-When-Then acceptance criteria',
      'Technical Builder drafts the ERD and the custom field API names; the BA writes the stories',
      'The Accidental Admin writes the plain-language business rules, including the automated decision logic',
      'The Client validates that the stories describe real scenarios rather than assumed ones',
    ],
    inputs:
      'The signed Decision Log and charter, the selected architecture, the current-state process map.',
    outputs:
      'Plain-Language Improvement Brief — input trigger, mandatory fields, automated decision logic. INVEST user stories with Gherkin acceptance criteria. ERD and custom field map.',
    owner:
      'Business Analyst owns the stories and the acceptance criteria. Technical Builder owns the schema and flow entry criteria. Accidental Admin owns the plain-language rules and required inputs. Client validates against reality.',
    implications:
      'A story without acceptance criteria cannot be verified, so it cannot be launched. This phase sets the standard the Verify verdict is measured against.',
    penny: ['Build Companion', 'Quest Master'],
    trailOs: ['Documentation', 'Project Delivery'],
    relatedPrograms: ['Guided Trail', 'Trail of Mastery', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase O', 'Guided Trail Sprint Cadence'],
  },
  {
    id: 'launch',
    entityType: 'resolve-phase',
    letter: 'L',
    name: 'Launch',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Deploy the technical configuration, or run the manual pilot, with a clear risk-mitigation plan.',
    executiveSummary:
      'Launch is managed as a process rather than an event: sandbox deployment, manual pilot, user training, smoke test, and a written fallback strategy.',
    whyItMatters:
      'Trust is lost at launch. A pilot that surfaces a validation gap on a paper form costs nothing; the same gap found in production costs the relationship.',
    keyFacts: [
      'The manual pilot runs before the automation — Horizon Community Hub piloted for a week and found users entering past dates',
      'Every deployment carries a component checklist, a smoke test script and a fallback strategy',
      'Training is part of Launch, not an afterthought to it',
      'In Guided Trail this is the sandbox change-set deploy, with the coach holding the client relationship',
    ],
    inputs:
      'User stories with acceptance criteria, the deployment playbook, sandbox-validated configuration, trained users, a data backup.',
    outputs:
      'Repository Deployment Playbook — deploy window, pre-deployment steps, component checklist, smoke test script, fallback strategy. Published user guides. Pilot feedback.',
    owner:
      'Technical Builder deploys metadata and runs the smoke tests. Business Analyst validates the migrated data and publishes the guides. Accidental Admin leads the pilot and collects adoption feedback. Client allocates training time and commits to the new process.',
    implications:
      'If the smoke test fails, the fallback runs. Launch is reversible by design, and that reversibility is what makes real client work safe for learners.',
    penny: ['Quest Master', 'Learning Coach'],
    trailOs: ['Project Delivery', 'Coach Visibility'],
    relatedPrograms: ['Guided Trail', 'Trail of Mastery', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase L', 'Facilitator Guide'],
  },
  {
    id: 'verify',
    entityType: 'resolve-phase',
    letter: 'V',
    name: 'Verify',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Confirm the solution works technically, matches the requirements, and delivers the business value that was claimed for it.',
    executiveSummary:
      'Verify begins at launch and measures the system against the original problem statement, the UAT scripts and the operational metrics. It is the evidence layer of the methodology.',
    whyItMatters:
      'Without verification the organisation cannot demonstrate impact, defend its pricing, or know what to improve. Inside Transition Trails it is also where the coach issues the verdict.',
    keyFacts: [
      'UAT is scripted in Given-When-Then form and returns a pass or a fail, never a percentage',
      'Three quantitative models: Reclaimed Capacity, SLA Compliance Rate, Data Integrity and Completeness Coefficient',
      'The client performs UAT themselves and confirms whether the operational pain is actually gone',
      'Maps directly to the Pass / Needs rework / Not attempted verdict in the coach rubric',
    ],
    inputs:
      'The deployed configuration, UAT scripts, the original Business Problem Statement, baseline metrics from Recognize.',
    outputs:
      'UAT Execution Scorecard — story, tester, scenario, result, detected errors. Quantified capacity, SLA and data-integrity figures. The coach verdict.',
    owner:
      'Business Analyst authors the UAT scripts and tracks passes and failures. Technical Builder runs unit and performance tests and audits system health. Accidental Admin monitors adoption and data quality. Client executes UAT and confirms business value.',
    implications:
      'A fail returns the work to Outline or Launch. The rework curve, not the first-pass result, is the measure of judgement.',
    penny: ['Exam Coach', 'Career Translator'],
    trailOs: ['Outcomes Tracking', 'Coach Visibility'],
    relatedPrograms: ['Guided Trail', 'Trail of Mastery', 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase V', 'Guided Trail Coach Rubric'],
  },
  {
    id: 'evolve',
    entityType: 'resolve-phase',
    letter: 'E',
    name: 'Evolve',
    confidence: 'confirmed',
    sourceNote: SOURCE_NOTE,
    purpose:
      'Establish governance, triage change requests, and feed what was learned back into a new Recognize cycle.',
    executiveSummary:
      'Evolve is the loop that closes the methodology. Feedback is captured and prioritised rather than patched, which is what prevents technical drift and keeps adoption alive past the first month.',
    whyItMatters:
      'This is the phase that separates systems which improve from systems which decay. It is also where a client learns to submit a structured request instead of demanding an ad-hoc fix.',
    keyFacts: [
      'A new request opens a new Recognize cycle; it does not become an immediate patch',
      'The System Evolution and Governance Log records feedback, root cause and proposed resolution together',
      'Horizon Community Hub case: a request for dynamic case assignment became the next RESOLVE cycle rather than a hotfix',
      'Feeds updated blueprints, the demand backlog and the next cohort\u2019s curriculum',
    ],
    inputs:
      'Post-launch feedback, system error logs, adoption and data-quality signals, enhancement requests with business justification.',
    outputs:
      'System Evolution and Governance Log. Triaged backlog briefs for future phases. Updated blueprints and standards.',
    owner:
      'Accidental Admin maintains the Evolution Log and triages feature requests. Business Analyst triages feedback and writes the briefs. Technical Builder clears technical debt and monitors access rules. Client submits structured enhancement requests.',
    implications:
      'Evolve terminates in a new Recognize. RESOLVE is a cycle, not a line, and this is the phase that makes that true.',
    penny: ['Trail Guide', 'Coach Intelligence Layer'],
    trailOs: ['Outcomes Tracking', 'Documentation'],
    relatedPrograms: ['Guided Trail', 'Trail of Mastery', "Explorer's Trail", 'Digital Compass'],
    docs: ['RESOLVE Handbook (Master) — Phase E (Evolve)', 'Master Program Guide'],
  },
];
