// Option B — Power Studio: for experienced users who configure prompts regularly
// Everything surfaced — fast navigation, compact density, inline test bench

import { useState } from "react";
import {
  Brain, Search, Plus, Play, Copy, Archive, ChevronRight,
  CheckCircle2, AlertTriangle, Clock, GitBranch, FlaskConical,
  BarChart3, ShieldCheck, Layers, Zap, Hash, FileText,
  Database, Settings, Star, MoreHorizontal, ArrowRight,
  BookOpen, Users, MessageSquare, Target, Sparkles,
  ChevronDown, Filter, SlidersHorizontal, Keyboard,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "templates" | "variables" | "sources" | "formats" | "testbench";
type Domain = "Coaching" | "Career" | "Knowledge" | "Escalation" | "Admin";
type Status = "Approved" | "Draft" | "In Review" | "Archived";

interface Template {
  id: string;
  name: string;
  domain: Domain;
  status: Status;
  score: number;
  risk: "Low" | "Medium" | "High";
  version: string;
  owner: string;
  audience: string;
  tone: string;
  capability: string;
  outputFormat: string;
  lastReviewed: string;
  purpose: string;
  variables: number;
  starred?: boolean;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  { id: "t1", name: "Weekly Reflection Check-In", domain: "Coaching", status: "Approved", score: 94, risk: "Low", version: "v1.4", owner: "Penny Product Lead", audience: "Active Learners", tone: "Warm, Curious", capability: "Learner Coaching", outputFormat: "Coaching Message", lastReviewed: "Today", purpose: "Generate a contextually aware weekly check-in message that acknowledges recent activity and asks one open-ended reflection question.", variables: 6, starred: true },
  { id: "t2", name: "Module Reflection Prompt", domain: "Coaching", status: "Approved", score: 88, risk: "Low", version: "v2.1", owner: "Penny Product Lead", audience: "Learners", tone: "Curious, Inviting", capability: "Learning Reflection", outputFormat: "Reflection Prompt", lastReviewed: "Yesterday", purpose: "Surface a learner's personal takeaway from a just-completed module, tied to their career goal.", variables: 4 },
  { id: "t3", name: "Escalation Alert to Coach", domain: "Escalation", status: "Approved", score: 91, risk: "Low", version: "v1.3", owner: "Ops Lead", audience: "Staff / Coaches", tone: "Professional, Direct", capability: "Risk Flagging", outputFormat: "Alert", lastReviewed: "2d ago", purpose: "Notify an assigned coach when a learner has missed two or more milestones in a 7-day window.", variables: 5 },
  { id: "t4", name: "Learner Coaching Message", domain: "Coaching", status: "Draft", score: 76, risk: "Medium", version: "v1.3", owner: "Penny Product Lead", audience: "Learners", tone: "Warm, Encouraging", capability: "Learner Coaching", outputFormat: "Coaching Message", lastReviewed: "Just Now", purpose: "Generate a single, contextually aware coaching message for a learner at a specific point in their program.", variables: 5 },
  { id: "t5", name: "Career Interest Discovery", domain: "Career", status: "Draft", score: 69, risk: "Medium", version: "v0.9", owner: "Career Team", audience: "Job-Ready Learners", tone: "Curious, Energising", capability: "Career Guidance", outputFormat: "Discovery Questions", lastReviewed: "3d ago", purpose: "Help a learner articulate their career interests through a 3-question discovery conversation.", variables: 3 },
  { id: "t6", name: "Policy Question Answering", domain: "Knowledge", status: "In Review", score: 82, risk: "Low", version: "v1.1", owner: "Knowledge Lead", audience: "All Learners", tone: "Clear, Authoritative", capability: "Knowledge Retrieval", outputFormat: "Structured Answer", lastReviewed: "1w ago", purpose: "Answer learner questions about program policies, referencing only Approved knowledge sources.", variables: 4 },
  { id: "t7", name: "Progress Milestone Celebration", domain: "Coaching", status: "Approved", score: 96, risk: "Low", version: "v1.0", owner: "Penny Product Lead", audience: "Active Learners", tone: "Celebratory, Warm", capability: "Milestone Recognition", outputFormat: "Coaching Message", lastReviewed: "5d ago", purpose: "Send a celebratory message when a learner achieves a key program milestone.", variables: 3, starred: true },
];

const DOMAIN_CFG: Record<Domain, { cls: string; dot: string }> = {
  Coaching:   { cls: "bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]",   dot: "bg-[#2F6B3F]" },
  Career:     { cls: "bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]",   dot: "bg-[#2F6F7E]" },
  Knowledge:  { cls: "bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]",   dot: "bg-[#CC8400]" },
  Escalation: { cls: "bg-[#F3F0F8] text-[#6B3FA0] border-[#C4B5E8]",   dot: "bg-[#6B3FA0]" },
  Admin:      { cls: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",   dot: "bg-[#475569]" },
};

const STATUS_CFG: Record<Status, { cls: string; icon: typeof CheckCircle2 }> = {
  Approved:   { cls: "bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]",   icon: CheckCircle2 },
  Draft:      { cls: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",   icon: FileText },
  "In Review":{ cls: "bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]",   icon: Clock },
  Archived:   { cls: "bg-[#F8F8F8] text-[#94A3B8] border-[#E2E8F0]",   icon: Archive },
};

const RISK_CFG = {
  Low:    { cls: "bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]" },
  Medium: { cls: "bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]" },
  High:   { cls: "bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]" },
};

const DOMAIN_ORDER: Domain[] = ["Coaching", "Career", "Knowledge", "Escalation"];

// ── Components ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "#2F6B3F" : score >= 75 ? "#CC8400" : "#A93F2F";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 ${cls}`}>
      {children}
    </span>
  );
}

// ── Left sidebar ──────────────────────────────────────────────────────────────

function Sidebar({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<Domain | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchDomain = domainFilter === "all" || t.domain === domainFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchDomain && matchStatus;
  });

  const grouped = DOMAIN_ORDER.reduce<Record<string, Template[]>>((acc, d) => {
    const items = filtered.filter(t => t.domain === d);
    if (items.length) acc[d] = items;
    return acc;
  }, {});

  return (
    <aside className="w-[260px] shrink-0 border-r border-[#E8EDEF] flex flex-col bg-[#FAFBFC] overflow-hidden">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 border-b border-[#E8EDEF]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full h-8 rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 text-[13px] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]/30 focus:border-[#1B3A2D]/40"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8] bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1 py-0.5">⌘K</kbd>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-[#E8EDEF]">
        <select
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value as Domain | "all")}
          className="flex-1 h-7 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-[#475569] px-2 focus:outline-none"
        >
          <option value="all">All domains</option>
          {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Status | "all")}
          className="flex-1 h-7 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-[#475569] px-2 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {["Approved","Draft","In Review"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto py-2">
        {Object.entries(grouped).map(([domain, items]) => (
          <div key={domain} className="mb-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOMAIN_CFG[domain as Domain].dot}`} />
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{domain}</span>
              <span className="text-[10px] text-[#94A3B8] ml-auto">{items.length}</span>
            </div>
            {items.map(t => {
              const isActive = t.id === selected;
              const StatusIcon = STATUS_CFG[t.status].icon;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className={`w-full text-left px-3 py-2 transition-colors group ${isActive ? "bg-[#1B3A2D] text-white" : "hover:bg-[#F1F5F9]"}`}
                >
                  <div className="flex items-start gap-1.5">
                    {t.starred && <Star className={`w-3 h-3 shrink-0 mt-0.5 ${isActive ? "text-amber-300 fill-amber-300" : "text-amber-400 fill-amber-400"}`} />}
                    <p className={`text-[13px] font-medium leading-snug flex-1 ${isActive ? "text-white" : "text-[#1E293B]"}`}>{t.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <StatusIcon className={`w-3 h-3 ${isActive ? "text-white/70" : "text-[#94A3B8]"}`} />
                    <span className={`text-[11px] ${isActive ? "text-white/70" : "text-[#94A3B8]"}`}>{t.status}</span>
                    <span className={`text-[11px] ml-auto font-medium tabular-nums ${isActive ? "text-white/70" : t.score >= 90 ? "text-[#2F6B3F]" : "text-[#CC8400]"}`}>{t.score}</span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E8EDEF] px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1.5">
          <span>7 templates · 5 approved</span>
          <span>2 in review</span>
        </div>
        <button className="w-full h-8 rounded-lg border-2 border-dashed border-[#CBD5E1] text-[12px] font-semibold text-[#64748B] hover:border-[#1B3A2D] hover:text-[#1B3A2D] hover:bg-[#F0F5F2] transition-all flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Template
        </button>
      </div>
    </aside>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function TemplateDetail({ template, showTest, onToggleTest }: {
  template: Template;
  showTest: boolean;
  onToggleTest: () => void;
}) {
  const [activeSection, setActiveSection] = useState<Set<string>>(() => new Set(["purpose", "meta"]));
  function toggle(id: string) {
    setActiveSection(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const domCfg = DOMAIN_CFG[template.domain];
  const stCfg  = STATUS_CFG[template.status];
  const rkCfg  = RISK_CFG[template.risk];
  const StatusIcon = stCfg.icon;

  const Section = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const open = activeSection.has(id);
    return (
      <div className="border-b border-[#F1F5F9] last:border-0">
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#FAFBFC] transition-colors"
        >
          <span className="text-[12px] font-bold text-[#475569] uppercase tracking-wider">{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && <div className="px-5 pb-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Detail header */}
      <div className="shrink-0 border-b border-[#E8EDEF] px-5 py-3.5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Chip cls={domCfg.cls}>{template.domain}</Chip>
              <Chip cls={stCfg.cls}><StatusIcon className="w-2.5 h-2.5 mr-0.5" />{template.status}</Chip>
              <Chip cls={rkCfg.cls}>Risk: {template.risk}</Chip>
              <span className="text-[11px] text-[#94A3B8]">{template.version}</span>
            </div>
            <h2 className="font-['Poppins'] text-[17px] font-semibold text-[#1B3A2D] leading-snug truncate">{template.name}</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onToggleTest}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12px] font-semibold transition-colors ${showTest ? "bg-[#1B3A2D] text-white border-[#1B3A2D]" : "border-[#E2E8F0] text-[#475569] hover:border-[#1B3A2D] hover:text-[#1B3A2D]"}`}
            >
              <FlaskConical className="w-3.5 h-3.5" /> Test
            </button>
            <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#475569] hover:border-[#1B3A2D] hover:text-[#1B3A2D] transition-colors">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button className="h-8 px-3 rounded-lg bg-[#1B3A2D] text-[12px] font-semibold text-white hover:bg-[#2F6B3F] transition-colors">
              Edit
            </button>
            <button className="h-8 w-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:border-[#CBD5E1]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Score bar inline */}
        <div className="mt-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-[220px]">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide w-10">Score</span>
            <ScoreBar score={template.score} />
          </div>
          <span className="text-[11px] text-[#94A3B8]">Reviewed {template.lastReviewed} · {template.variables} variables</span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto bg-white">
        <Section id="purpose" label="Purpose">
          <p className="text-[14px] text-[#475569] leading-relaxed">{template.purpose}</p>
        </Section>

        <Section id="meta" label="Configuration">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: "Owner", value: template.owner },
              { label: "Capability", value: template.capability },
              { label: "Output Format", value: template.outputFormat },
              { label: "Last Reviewed", value: template.lastReviewed },
              { label: "Audience", value: template.audience },
              { label: "Tone", value: template.tone },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide mb-0.5">{row.label}</p>
                <p className="text-[13px] text-[#1E293B] font-medium">{row.value}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="variables" label={`Required Variables (${template.variables})`}>
          <div className="space-y-2">
            {[
              { name: "learner_name", type: "string", source: "Learner Profile" },
              { name: "program_stage", type: "string", source: "Trail Config" },
              { name: "last_module", type: "string", source: "LMS Events" },
              { name: "coach_name", type: "string", source: "Assignment" },
              { name: "days_since_active", type: "number", source: "Activity Log" },
            ].slice(0, template.variables).map(v => (
              <div key={v.name} className="flex items-center gap-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
                <Hash className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                <code className="text-[12px] font-mono text-[#1E293B] flex-1">{v.name}</code>
                <span className="text-[11px] text-[#94A3B8] bg-[#F1F5F9] rounded px-1.5 py-0.5">{v.type}</span>
                <span className="text-[11px] text-[#64748B]">{v.source}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="guardrails" label="Guardrails">
          <div className="space-y-2">
            {[
              { ok: true,  text: "Source restricted to Approved knowledge only" },
              { ok: true,  text: "No PII outside of learner_name variable" },
              { ok: false, text: "Output length not yet capped — consider adding max_tokens" },
            ].map((g, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {g.ok
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                }
                <p className="text-[13px] text-[#475569] leading-snug">{g.text}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

// ── Test bench panel ──────────────────────────────────────────────────────────

function TestBench({ template }: { template: Template }) {
  return (
    <div className="w-[320px] shrink-0 border-l border-[#E8EDEF] flex flex-col bg-[#FAFBFC] overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-[#E8EDEF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-[#1B3A2D]" />
          <span className="text-[13px] font-bold text-[#1B3A2D]">Test Bench</span>
        </div>
        <kbd className="text-[10px] text-[#94A3B8] bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5">⌘T</kbd>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-2">Scenario</p>
          <select className="w-full h-8 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#475569] px-2.5 focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]/30">
            <option>Active learner — week 4</option>
            <option>Learner at risk — missed 2 milestones</option>
            <option>High performer — ready for next stage</option>
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Variable overrides</p>
          {[
            { name: "learner_name", val: "Alex Thompson" },
            { name: "program_stage", val: "Explore" },
            { name: "last_module", val: "Resume Writing" },
          ].map(v => (
            <div key={v.name} className="flex items-center gap-2 bg-white rounded-lg border border-[#E2E8F0] px-2.5 py-1.5">
              <code className="text-[11px] text-[#94A3B8] w-28 shrink-0 truncate">{v.name}</code>
              <input defaultValue={v.val} className="flex-1 text-[12px] text-[#1E293B] bg-transparent focus:outline-none" />
            </div>
          ))}
        </div>

        <button className="w-full h-9 rounded-lg bg-[#1B3A2D] text-[13px] font-semibold text-white hover:bg-[#2F6B3F] transition-colors flex items-center justify-center gap-2">
          <Play className="w-3.5 h-3.5" /> Run Test
        </button>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Penny's Output</p>
            <span className="text-[10px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5 font-bold">Pass</span>
          </div>
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-[#F1F5F9]">
              <div className="w-5 h-5 rounded-full bg-[#1B3A2D] flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
              <span className="text-[12px] font-semibold text-[#1B3A2D]">Penny</span>
            </div>
            <p className="text-[13px] text-[#475569] leading-relaxed">
              Hey Alex! You're now 4 weeks into your journey and you've just wrapped up Resume Writing — that's a real milestone. 🎉
              <br /><br />
              How are you feeling about what you've built so far? Is there one thing from this module you want to put into practice this week?
            </p>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[{ label: "Tokens", val: "142" }, { label: "Latency", val: "1.2s" }, { label: "Risk", val: "Low" }].map(m => (
              <div key={m.label} className="bg-white rounded-lg border border-[#E2E8F0] px-2 py-1.5">
                <p className="text-[12px] font-bold text-[#1E293B]">{m.val}</p>
                <p className="text-[10px] text-[#94A3B8]">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top tab bar ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: typeof Brain; count?: number }[] = [
  { id: "templates",  label: "Templates",     icon: FileText,     count: 10 },
  { id: "variables",  label: "Variables",     icon: Hash,         count: 14 },
  { id: "sources",    label: "Source Rules",  icon: Database },
  { id: "formats",    label: "Output Formats",icon: Layers,       count: 10 },
  { id: "testbench",  label: "Test Bench",    icon: FlaskConical },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export function PowerStudio() {
  const [activeTab, setActiveTab] = useState<Tab>("templates");
  const [selectedId, setSelectedId] = useState("t4");
  const [showTest, setShowTest] = useState(true);

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? TEMPLATES[0]!;

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex flex-col font-['Open_Sans'] overflow-hidden">
      {/* App header */}
      <header className="shrink-0 bg-[#1B3A2D] px-5 py-0 flex items-center gap-4 h-12">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-white/80" />
          <span className="text-[13px] font-bold text-white">Penny</span>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[13px] font-semibold text-white/90 font-['Poppins']">Prompt Studio</span>
        </div>

        <div className="flex-1 flex items-center">
          {/* Tab strip */}
          <div className="flex items-center gap-0.5 ml-4">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 h-12 text-[12px] font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "text-white border-white"
                      : "text-white/60 border-transparent hover:text-white/90 hover:border-white/30"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                      activeTab === tab.id ? "bg-white/20" : "bg-white/10"
                    }`}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-white/50">
            <Hash className="w-3 h-3" /> Slack
          </div>
          <button className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-semibold text-white transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Template
          </button>
          <div className="flex items-center gap-1.5 bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F] rounded-full px-2.5 py-1 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> 5 Approved
          </div>
          <div className="flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFD08A] text-[#CC8400] rounded-full px-2.5 py-1 text-[11px] font-bold">
            <Clock className="w-3 h-3" /> 2 In Review
          </div>
        </div>
      </header>

      {/* Main body — 3-col layout */}
      {activeTab === "templates" && (
        <div className="flex-1 flex overflow-hidden">
          <Sidebar selected={selectedId} onSelect={setSelectedId} />
          <TemplateDetail template={selected} showTest={showTest} onToggleTest={() => setShowTest(s => !s)} />
          {showTest && <TestBench template={selected} />}
        </div>
      )}

      {activeTab !== "templates" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#E8EDEF] flex items-center justify-center mx-auto mb-3">
              {(() => {
                const tab = TABS.find(t => t.id === activeTab)!;
                const Icon = tab.icon;
                return <Icon className="w-6 h-6 text-[#64748B]" />;
              })()}
            </div>
            <p className="text-[15px] font-semibold text-[#1E293B]">{TABS.find(t => t.id === activeTab)?.label}</p>
            <p className="text-[13px] text-[#94A3B8] mt-1">Select from the left panel to get started</p>
          </div>
        </div>
      )}

      {/* Status bar */}
      <footer className="shrink-0 border-t border-[#E8EDEF] px-5 py-1.5 flex items-center gap-4 bg-white">
        <span className="text-[11px] text-[#94A3B8]">7 templates · Last updated just now</span>
        <div className="flex items-center gap-1.5 ml-auto">
          {[
            { key: "⌘K", label: "Search" },
            { key: "⌘T", label: "Test" },
            { key: "⌘D", label: "Duplicate" },
            { key: "⌘↵", label: "Approve" },
          ].map(sc => (
            <div key={sc.key} className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
              <kbd className="bg-[#F1F5F9] border border-[#E2E8F0] rounded px-1 py-0.5 font-mono text-[10px]">{sc.key}</kbd>
              <span>{sc.label}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
