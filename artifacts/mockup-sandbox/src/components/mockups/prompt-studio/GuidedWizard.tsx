// Option A — Guided Wizard: for users new to creating prompts
// Each step surfaces only what's needed — no walls of tabs or options

import { useState } from "react";
import {
  ArrowRight, ArrowLeft, Brain, Sparkles, Users, MessageSquare,
  FileText, BookOpen, CheckCircle2, ChevronRight, Play,
  Lightbulb, Target, Wand2, Eye, RotateCcw
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface Category {
  id: string;
  icon: typeof Brain;
  label: string;
  description: string;
  examples: string[];
  color: string;
  accent: string;
}

interface TemplateField {
  id: string;
  label: string;
  hint: string;
  type: "textarea" | "select" | "tags";
  placeholder?: string;
  options?: string[];
  value: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "coaching",
    icon: MessageSquare,
    label: "Coaching & Reflection",
    description: "Penny checks in with learners, nudges reflection, and surfaces next steps.",
    examples: ["Weekly check-in message", "Module reflection prompt", "Progress celebration"],
    color: "bg-[#E6F0EA] border-[#9FC3AE]",
    accent: "#2F6B3F",
  },
  {
    id: "career",
    icon: Target,
    label: "Career Guidance",
    description: "Penny helps learners explore roles, prep for interviews, and build confidence.",
    examples: ["Resume review feedback", "Interview prep tips", "Job-fit assessment"],
    color: "bg-[#EDF5F8] border-[#7FAFC6]",
    accent: "#2F6F7E",
  },
  {
    id: "knowledge",
    icon: BookOpen,
    label: "Knowledge & Answers",
    description: "Penny answers questions from verified sources — handbooks, procedures, FAQs.",
    examples: ["Policy question answering", "Step-by-step how-to", "Resource discovery"],
    color: "bg-[#FFF3E0] border-[#FFD08A]",
    accent: "#CC8400",
  },
  {
    id: "escalation",
    icon: Users,
    label: "Team Alerts & Escalation",
    description: "Penny notifies staff when a learner needs attention, flags risk, or misses a milestone.",
    examples: ["Escalation alert to coach", "Missed milestone notice", "Risk flag summary"],
    color: "bg-[#F3F0F8] border-[#C4B5E8]",
    accent: "#6B3FA0",
  },
];

const AUDIENCE_OPTIONS = ["All Learners", "Active Learners", "Coaching Stage", "Job Ready", "Alumni", "Staff / Coaches"];
const TONE_OPTIONS = ["Warm & Encouraging", "Direct & Clear", "Curious & Inviting", "Professional", "Celebratory"];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: "Choose type" },
    { n: 2 as Step, label: "Define purpose" },
    { n: 3 as Step, label: "Review & save" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
              s.n < current  ? "bg-[#2F6B3F] text-white" :
              s.n === current ? "bg-[#1B3A2D] text-white ring-4 ring-[#1B3A2D]/20" :
                                "bg-white border-2 border-[#CBD5E1] text-[#94A3B8]"
            }`}>
              {s.n < current ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-[13px] font-semibold ${s.n === current ? "text-[#1B3A2D]" : s.n < current ? "text-[#2F6B3F]" : "text-[#94A3B8]"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 mx-3 rounded-full ${s.n < current ? "bg-[#2F6B3F]" : "bg-[#E2E8F0]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Choose category ───────────────────────────────────────────────────

function Step1({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hero */}
      <div className="px-12 pt-8 pb-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-[#1B3A2D] flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[#2F6B3F] uppercase tracking-wide">New Prompt</span>
        </div>
        <h1 className="font-['Poppins'] text-2xl font-semibold text-[#1B3A2D] leading-tight">
          What do you want to teach Penny?
        </h1>
        <p className="text-[15px] text-[#64748B] mt-2 leading-relaxed max-w-xl">
          Choose the type of interaction Penny will handle. You can always change this later.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-12 pb-6 grid grid-cols-2 gap-4 content-start overflow-auto">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`text-left rounded-2xl border-2 p-5 transition-all group hover:scale-[1.01] ${
                isSelected
                  ? `${cat.color} shadow-md scale-[1.01]`
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/60" : "bg-[#F1F5F9]"}`}
                     style={isSelected ? { backgroundColor: `${cat.accent}18` } : {}}>
                  <Icon className="w-5 h-5" style={{ color: isSelected ? cat.accent : "#64748B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-[#1E293B]">{cat.label}</p>
                    {isSelected && <CheckCircle2 className="w-4.5 h-4.5 shrink-0" style={{ color: cat.accent }} />}
                  </div>
                  <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">{cat.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {cat.examples.map(ex => (
                      <span key={ex} className="text-[11px] font-medium rounded-full px-2 py-0.5 bg-[#F1F5F9] text-[#475569]">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <div className="px-12 py-3 border-t border-[#F1F5F9]">
        <p className="text-[12px] text-[#94A3B8] flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          You can create multiple prompt types — each one teaches Penny a specific skill.
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Define purpose ────────────────────────────────────────────────────

function Step2({ category, fields, onChange }: {
  category: Category;
  fields: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const Icon = category.icon;
  const preview = fields.purpose
    ? `Penny will ${fields.purpose.toLowerCase().replace(/[.!?]$/, "")} — tailored for ${fields.audience || "your learners"} with a ${fields.tone?.toLowerCase() || "warm"} tone.`
    : "Fill in the fields on the left to see a preview of what Penny will do.";

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Form */}
      <div className="w-[52%] border-r border-[#F1F5F9] flex flex-col overflow-hidden">
        <div className="px-10 pt-8 pb-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category.accent}18` }}>
              <Icon className="w-4 h-4" style={{ color: category.accent }} />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: category.accent }}>
              {category.label}
            </span>
          </div>
          <h2 className="font-['Poppins'] text-xl font-semibold text-[#1B3A2D]">Define what Penny should do</h2>
          <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">
            Answer three questions. That's it — Penny handles the rest.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-10 pb-8 space-y-6">
          {/* Purpose */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              1. What should Penny do in this prompt?
            </label>
            <p className="text-[12px] text-[#64748B] mb-2">Write in plain language — what action or outcome are you aiming for?</p>
            <textarea
              value={fields.purpose ?? ""}
              onChange={e => onChange("purpose", e.target.value)}
              rows={3}
              placeholder="e.g. Send a weekly check-in message that acknowledges a learner's progress and asks how they're feeling about their next step."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] resize-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3F]/30 focus:border-[#2F6B3F] transition-all leading-relaxed"
            />
          </div>

          {/* Audience */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              2. Who will receive this message?
            </label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => onChange("audience", opt)}
                  className={`text-[13px] font-medium rounded-full px-3.5 py-1.5 border transition-all ${
                    fields.audience === opt
                      ? "bg-[#1B3A2D] text-white border-[#1B3A2D]"
                      : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#94A3B8]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              3. What tone should Penny use?
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => onChange("tone", opt)}
                  className={`text-[13px] font-medium rounded-full px-3.5 py-1.5 border transition-all ${
                    fields.tone === opt
                      ? "bg-[#1B3A2D] text-white border-[#1B3A2D]"
                      : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#94A3B8]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
        <div className="px-8 pt-8 pb-5 border-b border-[#E8F0EC]">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#64748B]" />
            <span className="text-[13px] font-semibold text-[#475569] uppercase tracking-wide">Live Preview</span>
          </div>
          <p className="text-[12px] text-[#94A3B8] mt-1">How Penny will introduce herself to this prompt</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {/* Penny "card" */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="bg-[#1B3A2D] px-5 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-[14px] font-semibold text-white">Penny</span>
              <span className="text-[11px] text-white/50 ml-auto">{fields.audience || "..."}</span>
            </div>
            <div className="px-5 py-4">
              <p className={`text-[14px] leading-relaxed ${fields.purpose ? "text-[#1E293B]" : "text-[#94A3B8] italic"}`}>
                {preview}
              </p>
            </div>
          </div>

          {/* Guidance cards */}
          {!fields.purpose && (
            <div className="mt-6 space-y-3">
              {[
                { label: "Be specific", hint: "\"Send a coaching message\" is vague. \"Check in on module progress and suggest one next action\" is clear." },
                { label: "Use plain language", hint: "You don't need to write the prompt yourself — just describe what Penny should accomplish." },
                { label: "Focus on one thing", hint: "The best prompts do one job well. You can create more prompts for other scenarios." },
              ].map(tip => (
                <div key={tip.label} className="flex items-start gap-3 rounded-xl bg-white border border-[#E2E8F0] px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-[#2F6B3F] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-[#1E293B]">{tip.label}</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5 leading-relaxed">{tip.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fields.purpose && (
            <div className="mt-5 rounded-xl bg-[#E6F0EA] border border-[#9FC3AE] px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#2F6B3F]" />
                <span className="text-[12px] font-semibold text-[#2F6B3F]">Looking good</span>
              </div>
              <p className="text-[12px] text-[#2F6B3F] leading-relaxed">
                Penny has enough context to deliver this prompt. You'll be able to test it before going live.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Review & save ─────────────────────────────────────────────────────

function Step3({ category, fields }: { category: Category; fields: Record<string, string> }) {
  const Icon = category.icon;
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-12 pt-8 pb-5">
        <h2 className="font-['Poppins'] text-xl font-semibold text-[#1B3A2D]">Review your prompt</h2>
        <p className="text-[14px] text-[#64748B] mt-1.5">Give it a name and save as a draft — you can test and refine before going live.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-12 pb-8">
        <div className="max-w-2xl space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">Prompt name</label>
            <input
              defaultValue={fields.purpose ? fields.purpose.split(" ").slice(0, 5).join(" ") + "…" : ""}
              placeholder="e.g. Weekly Coaching Check-In"
              className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-white px-4 text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2F6B3F]/30 focus:border-[#2F6B3F] transition-all"
            />
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F1F5F9] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${category.accent}18` }}>
                <Icon className="w-4 h-4" style={{ color: category.accent }} />
              </div>
              <p className="text-[14px] font-semibold text-[#1E293B]">{category.label}</p>
            </div>
            <div className="divide-y divide-[#F8FAFC]">
              {[
                { label: "Purpose", value: fields.purpose || "—" },
                { label: "Audience", value: fields.audience || "—" },
                { label: "Tone", value: fields.tone || "—" },
              ].map(row => (
                <div key={row.label} className="px-5 py-3 flex items-start gap-8">
                  <span className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wide w-20 shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-[14px] text-[#1E293B] flex-1 leading-relaxed">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What happens next */}
          <div className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-6 py-5">
            <p className="text-[13px] font-semibold text-[#475569] mb-3 uppercase tracking-wide">What happens next</p>
            <div className="space-y-2.5">
              {[
                { icon: FileText, text: "Saved as a Draft — not live yet" },
                { icon: Play, text: "Test Penny's response in the Test Bench before approving" },
                { icon: CheckCircle2, text: "Approve when you're happy — it goes live immediately" },
              ].map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#1B3A2D]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-[#1B3A2D]" />
                    </div>
                    <p className="text-[13px] text-[#475569]">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function GuidedWizard() {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("coaching");
  const [fields, setFields] = useState<Record<string, string>>({
    purpose: "Send a weekly check-in message that acknowledges a learner's progress and asks how they're feeling about their next step.",
    audience: "Active Learners",
    tone: "Warm & Encouraging",
  });

  const category = CATEGORIES.find(c => c.id === selectedCategory) ?? CATEGORIES[0]!;
  const canAdvance =
    step === 1 ? selectedCategory !== null :
    step === 2 ? Boolean(fields.purpose?.trim()) :
    true;

  function handleFieldChange(key: string, val: string) {
    setFields(f => ({ ...f, [key]: val }));
  }

  return (
    <div className="h-screen w-full bg-white flex flex-col font-['Open_Sans'] overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 border-b border-[#F1F5F9] px-12 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#1B3A2D] flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">Penny</p>
            <p className="text-[14px] font-semibold text-[#1B3A2D] leading-none">Prompt Studio</p>
          </div>
        </div>
        <StepIndicator current={step} />
        <div className="flex items-center gap-2.5">
          <button className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors">
            Save draft
          </button>
          <button className="text-[13px] font-medium text-[#64748B] hover:text-[#1E293B] px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Start over
          </button>
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {step === 1 && (
          <Step1 selected={selectedCategory} onSelect={id => setSelectedCategory(id)} />
        )}
        {step === 2 && (
          <Step2 category={category} fields={fields} onChange={handleFieldChange} />
        )}
        {step === 3 && (
          <Step3 category={category} fields={fields} />
        )}
      </div>

      {/* Footer nav */}
      <footer className="shrink-0 border-t border-[#F1F5F9] px-12 py-4 flex items-center justify-between bg-white">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1) as Step)}
          disabled={step === 1}
          className="flex items-center gap-2 text-[14px] font-semibold text-[#64748B] hover:text-[#1E293B] disabled:opacity-30 disabled:pointer-events-none transition-colors px-4 py-2.5 rounded-xl hover:bg-[#F1F5F9]"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <div key={n} className={`rounded-full transition-all ${
              n === step ? "w-5 h-2 bg-[#1B3A2D]" :
              n < step   ? "w-2 h-2 bg-[#2F6B3F]" :
                           "w-2 h-2 bg-[#E2E8F0]"
            }`} />
          ))}
        </div>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => Math.min(3, s + 1) as Step)}
            disabled={!canAdvance}
            className="flex items-center gap-2 text-[14px] font-semibold text-white bg-[#1B3A2D] hover:bg-[#2F6B3F] disabled:opacity-40 disabled:pointer-events-none transition-colors px-6 py-2.5 rounded-xl shadow-sm"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="flex items-center gap-2 text-[14px] font-semibold text-white bg-[#1B3A2D] hover:bg-[#2F6B3F] transition-colors px-6 py-2.5 rounded-xl shadow-sm">
            <CheckCircle2 className="w-4 h-4" /> Save as Draft
          </button>
        )}
      </footer>
    </div>
  );
}
