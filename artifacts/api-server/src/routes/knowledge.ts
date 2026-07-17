import { Router } from "express";
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";

const router = Router();

// ── Integration health (mirrors frontend readinessState.ts) ───────────────────
const INTEGRATION_HEALTH: Record<string, string> = {
  salesforce:     "live",
  googleDrive:    "live",
  slack:          "live",
  gemini:         "live",
  googleCalendar: "live",
  gmail:          "live",
  agentforce:     "live",
  mural:          "phase-2",
  ga4:            "phase-2",
};

// ── SF count queries ───────────────────────────────────────────────────────────

interface SfCounts {
  programs:    number | null;
  contacts:    number | null;
  cases:       number | null;
  engagements: number | null;
}

async function fetchSfCounts(): Promise<SfCounts> {
  const client = new ConnectorSalesforceClient();
  const [prog, cont, cas, eng] = await Promise.all([
    client.query<Record<string, unknown>>("SELECT COUNT() FROM pmdm__Program__c"),
    client.query<Record<string, unknown>>("SELECT COUNT() FROM Contact"),
    client.query<Record<string, unknown>>("SELECT COUNT() FROM Case WHERE IsClosed = false"),
    client.query<Record<string, unknown>>(
      "SELECT COUNT() FROM pmdm__Program_Engagement__c WHERE pmdm__Active__c = true"
    ),
  ]);
  return {
    programs:    prog.totalSize,
    contacts:    cont.totalSize,
    cases:       cas.totalSize,
    engagements: eng.totalSize,
  };
}

// ── In-memory document store ───────────────────────────────────────────────────
// Seeded from the static sourceDocuments array. Survives browser refreshes within
// a server session and is shared across all users.
// Phase 2: migrate to a source_documents Postgres table.

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
  {
    id: "1", entityType: "document", name: "Brand Book", category: "Brand", status: "Active", confidence: "confirmed",
    owner: "Leadership", lastUpdated: "Jun 2025", programs: ["All"],
    summary: "Defines Transition Trails' visual identity, voice, tone, and design system. The authoritative reference for any external or internal communication design.",
    purpose: "Establish and protect brand consistency across all programs, materials, and communications.",
    quickTake: "If it carries a Transition Trails name or logo, this document governs how it looks and sounds.",
    keyDecisionsInfluenced: ["Logo and color usage", "Typography standards", "Tone of voice for all materials", "Approved imagery styles"],
    sourceOfTruthFor: ["Brand colors and palette", "Logo usage rules", "Typography hierarchy", "Official tone and voice"],
    notSourceOfTruthFor: ["Program curriculum", "Pricing", "Org structure", "Operational processes"],
    keySections: ["Brand story", "Color system", "Typography", "Logo usage", "Voice and tone guidelines"],
    relatedDocuments: ["Master Program Overview", "Facilitator Guide"],
  },
  {
    id: "2", entityType: "document", name: "Master Program Overview", category: "Strategy", status: "Active", confidence: "confirmed",
    owner: "Program Director", lastUpdated: "Jun 2025", programs: ["All"],
    summary: "High-level strategic overview of all Transition Trails programs, their relationships, sequencing, and organizational purpose.",
    purpose: "Provide a single authoritative reference for program scope, positioning, and strategic intent across the full ecosystem.",
    quickTake: "Start here if you are new to Transition Trails or need to explain the program ecosystem to a stakeholder.",
    keyDecisionsInfluenced: ["Program sequencing decisions", "Entry-point definitions", "Partnership positioning", "Funder communications"],
    sourceOfTruthFor: ["Program sequence and dependencies", "High-level audience definitions", "Ecosystem structure"],
    notSourceOfTruthFor: ["Detailed curriculum content", "Pricing figures", "Delivery logistics", "Individual sprint plans"],
    keySections: ["Program overview table", "Audience matrix", "Program dependencies", "Strategic positioning"],
    relatedDocuments: ["Program Comparison Sheet", "Brand Book", "Pricing Analysis"],
  },
  {
    id: "3", entityType: "document", name: "Explorer's Trail Blueprint", category: "Program", status: "Active", confidence: "confirmed",
    owner: "Curriculum Lead", lastUpdated: "May 2025", programs: ["Explorer's Trail"],
    summary: "Comprehensive design document for the Explorer's Trail program, including learning objectives, session structure, delivery format, and facilitator guidance.",
    purpose: "Serve as the complete operational and curricular reference for delivering Explorer's Trail.",
    quickTake: "The single source of truth for what Explorer's Trail teaches, how it is structured, and who delivers it.",
    keyDecisionsInfluenced: ["Session plan design", "Facilitator preparation", "Learner eligibility", "Program duration"],
    sourceOfTruthFor: ["Explorer's Trail learning objectives", "Session structure", "Delivery format", "Learner outcomes"],
    notSourceOfTruthFor: ["Pricing", "Organization-wide strategy", "Technology layer details"],
    keySections: ["Program overview", "Learning objectives", "Session-by-session plan", "Facilitator notes", "Assessment approach"],
    relatedDocuments: ["Facilitator Guide", "Master Program Overview", "Brand Book"],
  },
  {
    id: "4", entityType: "document", name: "Foundations Trail Blueprint", category: "Program", status: "Active", confidence: "confirmed",
    owner: "Curriculum Lead", lastUpdated: "May 2025", programs: ["Foundations Trail"],
    summary: "Comprehensive design document for Foundations Trail, covering technical curriculum, Salesforce module structure, professional presence training, and hybrid delivery.",
    purpose: "Serve as the complete operational and curricular reference for delivering Foundations Trail.",
    quickTake: "The source of truth for Foundations Trail content, structure, and learning expectations.",
    keyDecisionsInfluenced: ["Technical content selection", "Assessment design", "Hybrid session structure", "Prerequisites definition"],
    sourceOfTruthFor: ["Foundations Trail curriculum", "Technical modules", "Learning sequence", "Delivery format"],
    notSourceOfTruthFor: ["Pricing", "Ecosystem-wide dependencies", "Penny AI configuration"],
    keySections: ["Program overview", "Technical curriculum map", "Professional presence module", "Salesforce module", "Assessment approach"],
    relatedDocuments: ["Explorer's Trail Blueprint", "Guided Trail Blueprint", "Facilitator Guide", "Program Comparison Sheet"],
  },
  {
    id: "5", entityType: "document", name: "Guided Trail Blueprint", category: "Program", status: "Active", confidence: "confirmed",
    owner: "Curriculum Lead", lastUpdated: "Jun 2025", programs: ["Guided Trail"],
    summary: "The definitive reference for Guided Trail — the flagship 12-week sprint-based program. Covers all four sprint modules, project expectations, facilitator roles, and learner milestones.",
    purpose: "Provide the complete design authority for Guided Trail curriculum, sprint structure, and delivery.",
    quickTake: "Most important program document for Guided Trail facilitators and program managers. Sprint plans are derived from here.",
    keyDecisionsInfluenced: ["Sprint module design", "Project scope and deliverables", "Facilitator team structure", "Assessment criteria"],
    sourceOfTruthFor: ["Guided Trail module content", "Sprint cadence overview", "Learning objectives per sprint", "Portfolio requirements"],
    notSourceOfTruthFor: ["Week-by-week sprint schedules (see Sprint Cadence doc)", "Pricing", "Intern-specific guidance (see Intern Workbook)"],
    keySections: ["Program philosophy", "Sprint structure overview", "Module content by sprint", "Portfolio and assessment", "Facilitator responsibilities"],
    relatedDocuments: ["Guided Trail Sprint Cadence", "RESOLVE Course Canvas", "Intern Workbook", "Trail Guide Framework"],
  },
  {
    id: "6", entityType: "document", name: "Trail of Mastery Proposal", category: "Program", status: "Draft", confidence: "draft",
    owner: "Program Director", lastUpdated: "Apr 2025", programs: ["Trail of Mastery"],
    summary: "Early-stage proposal document outlining the vision, intended audience, and strategic rationale for a Trail of Mastery advanced program.",
    purpose: "Document the initial vision and secure internal alignment to develop Trail of Mastery.",
    quickTake: "Treat all details here as proposed, not confirmed. Do not use this as a delivery reference — it is not a blueprint yet.",
    keyDecisionsInfluenced: ["Whether to develop Trail of Mastery", "Target audience framing", "Strategic positioning within ecosystem"],
    sourceOfTruthFor: ["Intent and vision for Trail of Mastery"],
    notSourceOfTruthFor: ["Duration", "Pricing", "Curriculum", "Outcomes — none are confirmed"],
    keySections: ["Problem statement", "Proposed audience", "Vision and goals", "Open questions"],
    relatedDocuments: ["Guided Trail Blueprint", "Pricing Analysis", "Program Comparison Sheet"],
  },
  {
    id: "7", entityType: "document", name: "Digital Compass Blueprint", category: "Program", status: "Active", confidence: "confirmed",
    owner: "Partnerships Lead", lastUpdated: "May 2025", programs: ["Digital Compass"],
    summary: "Design and delivery reference for the Digital Compass nonprofit client program. Covers organizational engagement model, curriculum structure, and client partnership expectations.",
    purpose: "Guide delivery of Digital Compass for nonprofit organizational clients.",
    quickTake: "This is the operational reference for Digital Compass — distinct from all individual-learner programs.",
    keyDecisionsInfluenced: ["Client engagement model", "Curriculum for nonprofit context", "Partnership terms", "Grant reporting"],
    sourceOfTruthFor: ["Digital Compass program design", "Nonprofit engagement approach", "Client curriculum"],
    notSourceOfTruthFor: ["Individual learner track details", "Main program sequence", "Pricing for individual programs"],
    keySections: ["Nonprofit client model", "Curriculum overview", "Delivery format", "Partnership expectations", "Outcome metrics"],
    relatedDocuments: ["Brand Book", "RESOLVE Course Canvas", "Master Program Overview"],
  },
  {
    id: "8", entityType: "document", name: "Pricing Analysis", category: "Finance", status: "Active", confidence: "confirmed",
    owner: "Operations", lastUpdated: "Jun 2025", programs: ["All"],
    summary: "Internal financial analysis covering program pricing models, cost structures, grant-funding assumptions, and pricing strategy across the program portfolio.",
    purpose: "Provide the authoritative reference for pricing decisions, grant budget alignment, and revenue modeling.",
    quickTake: "The only document where pricing figures should be sourced from. Do not cite pricing from any other document.",
    keyDecisionsInfluenced: ["Program pricing decisions", "Scholarship and subsidy structures", "Grant budget alignment", "Employer-sponsored pricing"],
    sourceOfTruthFor: ["All program pricing figures", "Cost model assumptions", "Subsidy and scholarship logic"],
    notSourceOfTruthFor: ["Curriculum", "Program design", "Audience definitions"],
    keySections: ["Pricing model by program", "Cost assumptions", "Grant-funding analysis", "Employer sponsorship model"],
    relatedDocuments: ["Program Comparison Sheet", "Master Program Overview"],
  },
  {
    id: "9", entityType: "document", name: "Program Comparison Sheet", category: "Strategy", status: "Active", confidence: "confirmed",
    owner: "Program Director", lastUpdated: "Jun 2025", programs: ["All"],
    summary: "Side-by-side matrix comparing all Transition Trails programs across key dimensions: audience, prerequisites, format, duration, outcomes, and positioning.",
    purpose: "Enable quick comparison and communication of the full program portfolio for internal planning and external stakeholder conversations.",
    quickTake: "Use this for any conversation that compares programs or explains the ecosystem to new stakeholders.",
    keyDecisionsInfluenced: ["Learner guidance conversations", "Stakeholder presentations", "Funder reporting", "Program differentiation messaging"],
    sourceOfTruthFor: ["Cross-program comparisons", "Audience and prerequisite matrix"],
    notSourceOfTruthFor: ["Pricing (see Pricing Analysis)", "Detailed curriculum (see individual blueprints)"],
    keySections: ["Comparison matrix", "Audience definitions", "Prerequisites summary", "Outcome comparison", "Positioning notes"],
    relatedDocuments: ["Master Program Overview", "Pricing Analysis", "All program blueprints"],
  },
  {
    id: "10", entityType: "document", name: "Trail Guide Framework", category: "Curriculum", status: "Active", confidence: "confirmed",
    owner: "Curriculum Lead", lastUpdated: "Apr 2025", programs: ["Guided Trail", "Trail of Mastery"],
    summary: "Defines the Trail Guide pedagogical framework — the coaching and mentorship philosophy that underpins how facilitators and Penny's Trail Guide capability support learner progression.",
    purpose: "Establish the conceptual and practical framework for how learner guidance operates across programs.",
    quickTake: "The intellectual foundation behind how Trail Guide (Penny) and human facilitators approach learner support.",
    keyDecisionsInfluenced: ["Facilitator coaching approach", "Trail Guide AI design principles", "Learner touchpoint design"],
    sourceOfTruthFor: ["Trail Guide methodology", "Coaching philosophy", "Guidance principles"],
    notSourceOfTruthFor: ["Technical implementation of Penny", "Session content", "Sprint schedules"],
    keySections: ["Framework philosophy", "Guidance principles", "Facilitator application", "AI integration notes"],
    relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide", "RESOLVE Course Canvas"],
  },
  {
    id: "11", entityType: "document", name: "RESOLVE Course Canvas", category: "Curriculum", status: "Active", confidence: "confirmed",
    owner: "Curriculum Lead", lastUpdated: "May 2025", programs: ["Guided Trail"],
    summary: "Course canvas for the RESOLVE module within Guided Trail. Defines how the R.E.S.O.L.V.E. framework is taught as a curriculum unit.",
    purpose: "Provide the instructional design reference for delivering RESOLVE as a taught framework within Guided Trail.",
    quickTake: "The source of truth for how RESOLVE is taught — not a description of RESOLVE as an operational framework.",
    keyDecisionsInfluenced: ["RESOLVE module content", "Assessment design", "Learner activities", "Sprint placement"],
    sourceOfTruthFor: ["RESOLVE curriculum as taught in Guided Trail", "Learning objectives for RESOLVE module"],
    notSourceOfTruthFor: ["Operational use of RESOLVE across the org", "Demand management process", "Owner roles"],
    keySections: ["Learning objectives", "Module activities", "Assessment approach", "Facilitator notes", "RESOLVE phase breakdown"],
    relatedDocuments: ["Guided Trail Blueprint", "Trail Guide Framework", "Guided Trail Sprint Cadence"],
  },
  {
    id: "12", entityType: "document", name: "Guided Trail Sprint Cadence", category: "Operations", status: "Active", confidence: "confirmed",
    owner: "Operations", lastUpdated: "Jun 2025", programs: ["Guided Trail"],
    summary: "Week-by-week operational schedule for Guided Trail's four sprints. Defines session timing, milestone check-ins, project deadlines, and facilitator coordination points.",
    purpose: "Serve as the operational calendar and scheduling reference for Guided Trail delivery.",
    quickTake: "The week-by-week delivery schedule. Facilitators and operations staff use this to plan and execute each sprint.",
    keyDecisionsInfluenced: ["Session scheduling", "Milestone timing", "Facilitator coordination", "Learner deadline setting"],
    sourceOfTruthFor: ["Week-by-week Guided Trail schedule", "Sprint milestone dates", "Session timing"],
    notSourceOfTruthFor: ["Curriculum content (see Blueprint)", "Assessment criteria", "Learner eligibility"],
    keySections: ["Sprint 1 schedule", "Sprint 2 schedule", "Sprint 3 schedule", "Sprint 4 schedule", "Milestone calendar"],
    relatedDocuments: ["Guided Trail Blueprint", "Facilitator Guide", "RESOLVE Course Canvas"],
  },
  {
    id: "13", entityType: "document", name: "Facilitator Guide", category: "Operations", status: "Active", confidence: "confirmed",
    owner: "Lead Facilitator", lastUpdated: "May 2025", programs: ["Explorer's Trail", "Foundations Trail"],
    summary: "Practical facilitation reference for Explorer's Trail and Foundations Trail. Covers session setup, facilitation techniques, learner engagement strategies, and troubleshooting.",
    purpose: "Equip facilitators with the practical knowledge to deliver Explorer's Trail and Foundations Trail effectively.",
    quickTake: "The facilitator's handbook for the first two programs. If a facilitator has a delivery question for Explorer's or Foundations Trail, this is the first place to look.",
    keyDecisionsInfluenced: ["Facilitation approach", "Session pacing", "Learner support strategies", "Logistics and setup"],
    sourceOfTruthFor: ["Facilitation methodology for Explorer's and Foundations Trail", "Session setup guidance"],
    notSourceOfTruthFor: ["Curriculum content (see Blueprints)", "Guided Trail facilitation", "Penny or Trail OS configuration"],
    keySections: ["Facilitator role overview", "Session preparation checklist", "Facilitation techniques", "Learner engagement strategies", "Troubleshooting guide"],
    relatedDocuments: ["Explorer's Trail Blueprint", "Foundations Trail Blueprint", "Brand Book"],
  },
  {
    id: "14", entityType: "document", name: "Intern Workbook", category: "HR", status: "Draft", confidence: "draft",
    owner: "Program Director", lastUpdated: "Mar 2025", programs: ["Guided Trail"],
    summary: "Draft workbook for intern participants in Guided Trail. Covers intern-specific orientation, role expectations, project contributions, and reflective practice exercises.",
    purpose: "Support interns participating in Guided Trail with structured guidance specific to their role.",
    quickTake: "Draft status — do not treat this as finalized guidance. Contents subject to change.",
    keyDecisionsInfluenced: ["Intern onboarding process", "Intern project contributions", "Intern evaluation criteria"],
    sourceOfTruthFor: ["Intern-specific guidance for Guided Trail"],
    notSourceOfTruthFor: ["General learner guidance (see Blueprint)", "Pricing or program structure"],
    keySections: ["Intern role overview", "Orientation checklist", "Project contribution expectations", "Reflective exercises"],
    relatedDocuments: ["Guided Trail Blueprint", "Guided Trail Sprint Cadence", "Facilitator Guide"],
  },
];

let docStore: SourceDocument[] = [...SEED_DOCS];
let nextDocId = SEED_DOCS.length + 1;

// ── GET /api/knowledge/sources/live-data ────────────────────────────────────────

router.get("/knowledge/sources/live-data", async (req, res) => {
  let sfCounts: SfCounts = { programs: null, contacts: null, cases: null, engagements: null };
  try {
    sfCounts = await fetchSfCounts();
  } catch (err) {
    req.log.warn({ err }, "SF count queries failed — returning null counts");
  }
  res.json({
    integrationHealth: INTEGRATION_HEALTH,
    sfCounts,
    fetchedAt: new Date().toISOString(),
  });
});

// ── GET /api/knowledge/documents ────────────────────────────────────────────────

router.get("/knowledge/documents", (_req, res) => {
  res.json({ documents: docStore, total: docStore.length });
});

// ── POST /api/knowledge/documents ───────────────────────────────────────────────

router.post("/knowledge/documents", (req, res) => {
  const body = req.body as Partial<SourceDocument>;
  if (!body.name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const doc: SourceDocument = {
    entityType: "document",
    name: body.name!.trim(),
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
    id: String(nextDocId++),
  };
  docStore.push(doc);
  res.status(201).json({ document: doc });
});

// ── PATCH /api/knowledge/documents/:id ──────────────────────────────────────────

router.patch("/knowledge/documents/:id", (req, res) => {
  const { id } = req.params;
  const idx = docStore.findIndex(d => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  docStore[idx] = { ...docStore[idx]!, ...(req.body as Partial<SourceDocument>), id: id! };
  res.json({ document: docStore[idx] });
});

// ── DELETE /api/knowledge/documents/:id ─────────────────────────────────────────

router.delete("/knowledge/documents/:id", (req, res) => {
  const { id } = req.params;
  const idx = docStore.findIndex(d => d.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  docStore.splice(idx, 1);
  res.json({ success: true });
});

export default router;
