import { useState } from "react";

type HealthStatus = "healthy" | "needs-attention" | "incomplete";
type TierKey = "everyday" | "power" | "admin" | "superadmin";

interface PersonaCard {
  id: string;
  name: string;
  type: string;
  typeCls: string;
  tier: TierKey;
  tierLabel: string;
  tierBadge: string;
  health: HealthStatus;
  description: string;
  pennyAccess: string;
  pennyCapabilities: string[];
  sfObjects: string[];
  commChannels: string[];
  outcomes: string[];
  issues: string[];
  setupSteps: string[];
}

type GroupId = "learner" | "staff" | "penny-ops" | "admin" | "external";

interface PersonaGroup {
  id: GroupId;
  title: string;
  subtitle: string;
  color: string;
  border: string;
  headerBg: string;
  iconCls: string;
  personas: PersonaCard[];
}

const PERSONAS: PersonaCard[] = [
  {
    id: "learner",
    name: "Learner",
    type: "Learner",
    typeCls: "bg-emerald-50 border-emerald-200 text-emerald-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "healthy",
    description: "Individuals enrolled in a Transition Trails program progressing through structured learning with Penny AI guidance.",
    pennyAccess: "Guided — curated coaching prompts, Trail Quests, weekly reviews",
    pennyCapabilities: ["Study Coach", "Trail Quests", "Reflection Prompts", "Weekly Review"],
    sfObjects: ["Contact", "Program_Enrollment__c", "Training_Plan__c", "Case"],
    commChannels: ["Cohort Slack Channel", "Google Chat Space", "Weekly Digest", "Calendar Events"],
    outcomes: ["Career readiness score improvement", "Module completion rate", "Quest completion rate", "Employment outcomes"],
    issues: [],
    setupSteps: ["Enroll in Salesforce as Contact + Program Enrollment", "Assign Penny learning profile", "Add to cohort Slack", "Generate onboarding message"],
  },
  {
    id: "coach",
    name: "Coach",
    type: "Staff",
    typeCls: "bg-blue-50 border-blue-200 text-blue-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "needs-attention",
    description: "Qualified facilitators who guide learners through program experiences with support from Penny AI.",
    pennyAccess: "Guided — coach briefs, escalation detection, cohort summaries",
    pennyCapabilities: ["Coach Briefs", "Escalation Detection", "Cohort Summaries", "Session Prep"],
    sfObjects: ["Contact", "Volunteer__c", "Program_Engagement__c", "Case"],
    commChannels: ["Coach Slack Channel", "Program Lead Slack", "Office Hours Calendar"],
    outcomes: ["Learner progression rate", "At-risk learner response time", "Cohort completion rate"],
    issues: ["Salesforce mapping incomplete for volunteer coaches", "No formal Penny escalation SLA defined"],
    setupSteps: ["Create Volunteer record in Salesforce", "Link to Program Engagements", "Assign Penny Coach Brief", "Add to coach Slack"],
  },
  {
    id: "program-lead",
    name: "Program Lead",
    type: "Staff",
    typeCls: "bg-blue-50 border-blue-200 text-blue-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "healthy",
    description: "Staff members responsible for end-to-end program operations — intake, cohort management, and outcome reporting.",
    pennyAccess: "Guided — program health, cohort summaries, escalation detection",
    pennyCapabilities: ["Program Health", "Cohort Summaries", "Escalation Detection"],
    sfObjects: ["Training_Plan__c", "Program_Enrollment__c", "Campaign", "Account"],
    commChannels: ["Program Lead Slack", "Ops Channel", "Program Calendar"],
    outcomes: ["Program completion rate", "Intake conversion", "Cohort health score"],
    issues: [],
    setupSteps: ["Assign as Program Owner in Salesforce", "Grant full program record access", "Add to program Slack"],
  },
  {
    id: "curriculum-designer",
    name: "Curriculum Designer",
    type: "Staff",
    typeCls: "bg-blue-50 border-blue-200 text-blue-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "healthy",
    description: "Content specialists who author, review, and maintain curriculum assets, Penny prompts, and Trail Quests.",
    pennyAccess: "Power — curriculum generation, consistency review, prompt governance",
    pennyCapabilities: ["Curriculum Generation", "Consistency Review", "Prompt Governance"],
    sfObjects: ["Training_Plan__c", "Training_Plan_Item__c", "Knowledge__c"],
    commChannels: ["Curriculum Slack", "Content Review Calendar"],
    outcomes: ["Content quality score", "Prompt approval rate", "Standards compliance"],
    issues: [],
    setupSteps: ["Grant Curriculum Studio edit access", "Add to curriculum Slack", "Configure prompt governance workflow"],
  },
  {
    id: "penny-admin",
    name: "Penny Admin",
    type: "Admin",
    typeCls: "bg-violet-50 border-violet-200 text-violet-700",
    tier: "power",
    tierLabel: "Power",
    tierBadge: "bg-violet-50 border-violet-200 text-violet-700",
    health: "needs-attention",
    description: "Technical administrators responsible for Penny AI configuration, prompt governance, and quality monitoring.",
    pennyAccess: "Full — prompt-level access, capability registry, source trust, quality metrics",
    pennyCapabilities: ["Prompt Governance", "Source Control", "Quality Review", "Capability Registry"],
    sfObjects: ["Knowledge__c", "Case", "Integration_Log__c"],
    commChannels: ["Penny Admin Slack", "Quality Review Calendar", "Incident Channel"],
    outcomes: ["Prompt approval rate", "Hallucination incident rate", "Source trust compliance"],
    issues: ["Formal Penny Admin role not yet defined in Salesforce", "Prompt governance SLA not documented"],
    setupSteps: ["Define Penny Admin role in Salesforce", "Grant Prompt Studio admin access", "Create quality review calendar"],
  },
  {
    id: "volunteer",
    name: "Volunteer",
    type: "Volunteer",
    typeCls: "bg-violet-50 border-violet-200 text-violet-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "needs-attention",
    description: "Community members contributing as coaches, mentors, guest speakers, or workshop facilitators.",
    pennyAccess: "Guided — coach briefs only",
    pennyCapabilities: ["Coach Briefs"],
    sfObjects: ["Volunteer__c", "Volunteer_Job__c", "Volunteer_Shift__c", "Contact"],
    commChannels: ["Volunteer Slack", "Training Calendar"],
    outcomes: ["Hours delivered", "Session quality rating", "Learner satisfaction"],
    issues: ["Volunteer SF mapping uses legacy NPSP fields — Nonprofit Cloud migration pending"],
    setupSteps: ["Create Volunteer record in NPSP", "Assign to Volunteer Jobs", "Add to volunteer Slack"],
  },
  {
    id: "client-sponsor",
    name: "Client Sponsor",
    type: "Sponsor",
    typeCls: "bg-rose-50 border-rose-200 text-rose-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "incomplete",
    description: "Organisational sponsors who fund or refer learners to programs and receive outcome reporting.",
    pennyAccess: "Guided — executive briefs only",
    pennyCapabilities: ["Executive Briefs"],
    sfObjects: ["Account", "Opportunity", "Contact", "Report"],
    commChannels: ["Stakeholder Report Emails", "Sponsor Review Calendar"],
    outcomes: ["Learner employment rate", "Cohort satisfaction", "Renewal rate"],
    issues: ["No formal Salesforce Account record type for Client Sponsors yet", "Communication mapping not defined"],
    setupSteps: ["Create Account and Opportunity records", "Link enrolled learners as Contacts", "Set up outcome reporting dashboard"],
  },
  {
    id: "employer-partner",
    name: "Employer Partner",
    type: "Partner",
    typeCls: "bg-amber-50 border-amber-200 text-amber-700",
    tier: "everyday",
    tierLabel: "Everyday",
    tierBadge: "bg-emerald-50 border-emerald-200 text-emerald-700",
    health: "incomplete",
    description: "Employers who partner with Transition Trails to hire graduates, provide work experience, or co-design curriculum.",
    pennyAccess: "Guided — employer matching (planned Q4)",
    pennyCapabilities: ["Employer Matching (planned)"],
    sfObjects: ["Account", "Opportunity", "Job_Application__c", "Contact"],
    commChannels: ["Partner Email", "Partner Review Meetings"],
    outcomes: ["Graduate hire rate", "Skills match score", "Partner satisfaction"],
    issues: ["Employer Partner object model not yet defined in Salesforce", "No Penny employer matching configured"],
    setupSteps: ["Define Account record type for Employer Partners", "Map skill requirements to curriculum", "Configure Penny employer matching (Q4)"],
  },
  {
    id: "executive-director",
    name: "Executive Director",
    type: "Staff",
    typeCls: "bg-blue-50 border-blue-200 text-blue-700",
    tier: "admin",
    tierLabel: "Admin",
    tierBadge: "bg-amber-50 border-amber-200 text-amber-700",
    health: "healthy",
    description: "Senior leadership responsible for strategic direction, funder relationships, and Trail OS oversight.",
    pennyAccess: "Admin — executive briefs, impact summaries, full context",
    pennyCapabilities: ["Executive Briefs", "Impact Summaries"],
    sfObjects: ["Account", "Opportunity", "Report", "Dashboard"],
    commChannels: ["Executive Briefing Calendar", "Board Reports"],
    outcomes: ["Organisational health score", "Funder satisfaction", "Program reach"],
    issues: [],
    setupSteps: ["Grant executive Salesforce dashboard access", "Configure executive brief digest", "Add to board reporting calendar"],
  },
  {
    id: "salesforce-admin",
    name: "Salesforce Admin",
    type: "Admin",
    typeCls: "bg-slate-100 border-slate-300 text-slate-700",
    tier: "admin",
    tierLabel: "Admin",
    tierBadge: "bg-amber-50 border-amber-200 text-amber-700",
    health: "healthy",
    description: "Technical administrators responsible for Salesforce NPSP/Nonprofit Cloud configuration, data integrity, and integrations.",
    pennyAccess: "Admin — SF mapping, data layer, integration governance",
    pennyCapabilities: ["SF Mapping"],
    sfObjects: ["All objects", "Permission_Set__c", "Profile", "User"],
    commChannels: ["Tech Team Slack", "SF Release Calendar"],
    outcomes: ["Data quality score", "Integration uptime", "Permission model compliance"],
    issues: [],
    setupSteps: ["Grant Salesforce admin profile", "Configure integration user credentials", "Set up audit log review schedule"],
  },
  {
    id: "platform-admin",
    name: "Platform Admin",
    type: "Admin",
    typeCls: "bg-slate-100 border-slate-300 text-slate-700",
    tier: "superadmin",
    tierLabel: "Super",
    tierBadge: "bg-slate-100 border-slate-300 text-slate-700",
    health: "healthy",
    description: "Trail OS builders and architects who configure the platform, manage all integrations, and design the operating model.",
    pennyAccess: "Unrestricted — all RAG chunks, system prompts, governance override",
    pennyCapabilities: ["All capabilities", "System prompt access", "RAG corpus control"],
    sfObjects: ["All objects"],
    commChannels: ["All channels", "Admin Slack", "Tech calendar"],
    outcomes: ["Platform uptime", "Integration health", "Phase delivery"],
    issues: [],
    setupSteps: ["Email whitelist in Replit Secrets", "Full environment variable access", "All admin routes unlocked"],
  },
];

const GROUPS: PersonaGroup[] = [
  {
    id: "learner",
    title: "Learner",
    subtitle: "Program participants",
    color: "text-emerald-700",
    border: "border-emerald-200",
    headerBg: "bg-emerald-50",
    iconCls: "bg-emerald-50 text-emerald-600",
    personas: PERSONAS.filter((p) => p.id === "learner"),
  },
  {
    id: "staff",
    title: "Staff & Facilitators",
    subtitle: "Coaches, program leads, curriculum",
    color: "text-sky-700",
    border: "border-sky-200",
    headerBg: "bg-sky-50",
    iconCls: "bg-sky-50 text-sky-600",
    personas: PERSONAS.filter((p) => ["coach", "program-lead", "curriculum-designer", "executive-director"].includes(p.id)),
  },
  {
    id: "penny-ops",
    title: "Penny Operations",
    subtitle: "AI governance & prompt management",
    color: "text-violet-700",
    border: "border-violet-200",
    headerBg: "bg-violet-50",
    iconCls: "bg-violet-50 text-violet-600",
    personas: PERSONAS.filter((p) => p.id === "penny-admin"),
  },
  {
    id: "admin",
    title: "Platform & Systems",
    subtitle: "Salesforce admin, platform builders",
    color: "text-amber-700",
    border: "border-amber-200",
    headerBg: "bg-amber-50",
    iconCls: "bg-amber-50 text-amber-600",
    personas: PERSONAS.filter((p) => ["salesforce-admin", "platform-admin"].includes(p.id)),
  },
  {
    id: "external",
    title: "External Partners",
    subtitle: "Volunteers, sponsors, employers",
    color: "text-rose-700",
    border: "border-rose-200",
    headerBg: "bg-rose-50",
    iconCls: "bg-rose-50 text-rose-600",
    personas: PERSONAS.filter((p) => ["volunteer", "client-sponsor", "employer-partner"].includes(p.id)),
  },
];

const HEALTH_DOT: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  "needs-attention": "bg-amber-400",
  incomplete: "bg-rose-500",
};

const HEALTH_BADGE: Record<HealthStatus, string> = {
  healthy: "bg-emerald-50 border-emerald-200 text-emerald-700",
  "needs-attention": "bg-amber-50 border-amber-200 text-amber-700",
  incomplete: "bg-rose-50 border-rose-200 text-rose-700",
};

function groupScore(g: PersonaGroup) {
  const healthy = g.personas.filter((p) => p.health === "healthy").length;
  return g.personas.length === 0 ? 100 : Math.round((healthy / g.personas.length) * 100);
}

export function OptionB() {
  const [selectedGroup, setSelectedGroup] = useState<GroupId | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const activeGroup = GROUPS.find((g) => g.id === selectedGroup) ?? null;
  const activePersona = activeGroup?.personas.find((p) => p.id === selectedPersona) ?? null;

  const allPersonas = PERSONAS;
  const healthy = allPersonas.filter((p) => p.health === "healthy").length;
  const needsAttn = allPersonas.filter((p) => p.health === "needs-attention").length;
  const incomplete = allPersonas.filter((p) => p.health === "incomplete").length;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Administration — People &amp; Access</p>
            <h1 className="text-xl font-bold text-zinc-900">Role Health Map</h1>
            <p className="text-[13px] text-zinc-500 mt-0.5">Click a persona group to inspect each role's access, Penny capabilities, and setup health.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[13px] font-bold text-emerald-700">{healthy}</span><span className="text-[11px] text-emerald-600">healthy</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[13px] font-bold text-amber-700">{needsAttn}</span><span className="text-[11px] text-amber-600">needs attention</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[13px] font-bold text-rose-700">{incomplete}</span><span className="text-[11px] text-rose-600">incomplete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-113px)]">
        {/* Group cards */}
        <div className={`overflow-auto p-5 transition-all duration-300 ${selectedGroup ? "w-72 shrink-0 border-r border-zinc-200" : "flex-1"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Persona Groups</p>
          <div className={`grid gap-4 ${selectedGroup ? "grid-cols-1" : "grid-cols-5"}`}>
            {GROUPS.map((g) => {
              const score = groupScore(g);
              const isSelected = selectedGroup === g.id;
              const barColor = score === 100 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
              const pctColor = score === 100 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
              return (
                <button
                  key={g.id}
                  onClick={() => { setSelectedGroup(isSelected ? null : g.id); setSelectedPersona(null); setExpandedSection(null); }}
                  className={`text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${isSelected ? `${g.border} shadow-md` : "border-zinc-200 hover:border-zinc-300"}`}
                >
                  <div className={`px-4 py-3 ${isSelected ? g.headerBg : "bg-white"}`}>
                    <p className={`text-[13px] font-bold ${isSelected ? g.color : "text-zinc-800"}`}>{g.title}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{g.subtitle}</p>
                  </div>
                  <div className="px-4 py-3 bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex gap-1">
                        {g.personas.map((p) => (
                          <span key={p.id} className={`w-2.5 h-2.5 rounded-full ${HEALTH_DOT[p.health]}`} title={p.name} />
                        ))}
                      </div>
                      <span className={`text-[11px] font-bold ${pctColor}`}>{score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                    </div>
                    {!selectedGroup && (
                      <p className="text-[10px] text-zinc-400 mt-2">{g.personas.length} persona{g.personas.length !== 1 ? "s" : ""} · click to inspect</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Persona list (middle) */}
        {activeGroup && !activePersona && (
          <div className="w-64 border-r border-zinc-200 overflow-auto bg-white">
            <div className={`px-4 py-3 border-b ${activeGroup.headerBg}`}>
              <p className={`text-[13px] font-bold ${activeGroup.color}`}>{activeGroup.title}</p>
              <p className="text-[11px] text-zinc-500">{activeGroup.personas.length} personas</p>
            </div>
            <div className="divide-y divide-zinc-100">
              {activeGroup.personas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-center gap-3"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[p.health]}`} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-zinc-800">{p.name}</p>
                    <p className="text-[10px] text-zinc-500">{p.type} · {p.tierLabel}</p>
                  </div>
                  <span className="text-zinc-300 ml-auto">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Persona detail */}
        {activeGroup && activePersona && (
          <div className="flex-1 overflow-auto bg-white">
            <div className={`px-6 py-4 border-b ${activeGroup.headerBg} flex items-start justify-between`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={`text-[15px] font-bold ${activeGroup.color}`}>{activePersona.name}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activePersona.typeCls}`}>{activePersona.type}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activePersona.tierBadge}`}>{activePersona.tierLabel} tier</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${HEALTH_BADGE[activePersona.health]}`}>{activePersona.health.replace("-", " ")}</span>
                </div>
                <p className="text-[12px] text-zinc-500">{activePersona.description}</p>
              </div>
              <button onClick={() => setSelectedPersona(null)} className="text-[11px] text-zinc-400 hover:text-zinc-700 shrink-0 ml-4">← Back</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Penny access */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-[10px] font-bold uppercase text-violet-500 mb-1">Penny access level</p>
                <p className="text-[13px] font-semibold text-violet-800 mb-2">{activePersona.pennyAccess}</p>
                <div className="flex flex-wrap gap-1">
                  {activePersona.pennyCapabilities.map((c) => (
                    <span key={c} className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* SF objects */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Salesforce objects</p>
                  <div className="space-y-1">
                    {activePersona.sfObjects.map((o) => (
                      <div key={o} className="text-[11px] font-mono text-zinc-600 bg-zinc-50 rounded px-2 py-1">{o}</div>
                    ))}
                  </div>
                </div>
                {/* Comm channels */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Communication channels</p>
                  <div className="space-y-1">
                    {activePersona.commChannels.map((c) => (
                      <div key={c} className="text-[11px] text-zinc-600 bg-zinc-50 rounded px-2 py-1">{c}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key outcomes */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Key outcomes</p>
                <div className="flex flex-wrap gap-1.5">
                  {activePersona.outcomes.map((o) => (
                    <span key={o} className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">✓ {o}</span>
                  ))}
                </div>
              </div>

              {/* Issues */}
              {activePersona.issues.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[10px] font-bold uppercase text-amber-600 mb-2">Issues</p>
                  <div className="space-y-1">
                    {activePersona.issues.map((i) => (
                      <p key={i} className="text-[12px] text-amber-800">⚠ {i}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup steps */}
              <div>
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Setup steps</p>
                <div className="space-y-1.5">
                  {activePersona.setupSteps.map((s, i) => (
                    <div key={s} className="flex items-start gap-2 text-[12px] text-zinc-700">
                      <span className="text-[10px] font-bold text-zinc-400 w-4 mt-0.5">{i + 1}.</span>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group overview panel (when group selected but no persona) */}
        {activeGroup && !activePersona && (
          <div className="flex-1 overflow-auto bg-zinc-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[13px] font-semibold text-zinc-500">Select a persona from the list to see full detail</p>
              <p className="text-[11px] text-zinc-400 mt-1">{activeGroup.personas.length} personas in {activeGroup.title}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
