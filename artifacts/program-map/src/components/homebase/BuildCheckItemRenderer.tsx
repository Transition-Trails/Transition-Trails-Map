/**
 * BuildCheckItemRenderer
 *
 * Renders a build-check assessment item. Learner reads numbered task steps,
 * opens their dev org, builds the thing, then triggers server-side verification.
 * Penny runs Describe / SOQL / Tooling / Audit checks against the learner's
 * connected Salesforce org and shows pass/fail per criterion.
 *
 * Re-check: if any criterion fails the learner can fix and re-run without penalty.
 * Confidence: required after all criteria pass, before the response is submitted.
 */

import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Database, Wrench, FileText } from "lucide-react";
import { ConfidenceLevel } from "@/components/homebase/MCItemRenderer";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CriterionResult {
  id:     string;
  passed: boolean;
  detail: string;
  method: "describe" | "soql" | "tooling" | "audit";
}

export interface VerificationCriterion {
  id:          string;
  label:       string;
  method:      "describe" | "soql" | "tooling" | "audit";
  description: string;
}

export interface BuildCheckRubric {
  steps:                string[];
  verificationCriteria: VerificationCriterion[];
}

export interface BuildCheckItem {
  id:          number;
  question:    string;
  domain:      string;
  domainLabel: string;
  itemType:    "build-check";
  rubric?:     unknown;
}

// No signals needed — the server re-runs SF checks at respond time.
// BuildCheckItemRenderer passes no client-side verification data to onSubmit.

interface BuildCheckItemRendererProps {
  item:       BuildCheckItem;
  sessionId:  number;
  onSubmit:   (answer: string, confidence: ConfidenceLevel) => Promise<void>;
  submitting: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type VerifyState = "idle" | "verifying" | "hasResults" | "sfNotConnected";

const METHOD_ICONS: Record<string, React.ReactNode> = {
  describe: <ShieldCheck size={11} />,
  soql:     <Database    size={11} />,
  tooling:  <Wrench      size={11} />,
  audit:    <FileText    size={11} />,
};

const METHOD_LABELS: Record<string, string> = {
  describe: "Describe",
  soql:     "SOQL",
  tooling:  "Tooling API",
  audit:    "Audit Trail",
};

const METHOD_COLORS: Record<string, string> = {
  describe: "bg-sky-100 text-sky-700",
  soql:     "bg-violet-100 text-violet-700",
  tooling:  "bg-amber-100 text-amber-700",
  audit:    "bg-rose-100 text-rose-700",
};

function parseRubric(raw: unknown): BuildCheckRubric | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r["verificationCriteria"])) return null;
  return {
    steps:                Array.isArray(r["steps"]) ? (r["steps"] as string[]) : [],
    verificationCriteria: r["verificationCriteria"] as VerificationCriterion[],
  };
}

function MethodBadge({ method }: { method: string }) {
  const color = METHOD_COLORS[method] ?? "bg-gray-100 text-gray-600";
  const label = METHOD_LABELS[method] ?? method;
  const icon  = METHOD_ICONS[method];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {icon}
      {label}
    </span>
  );
}

function ConfidencePicker({
  value,
  onChange,
}: {
  value:    ConfidenceLevel | null;
  onChange: (v: ConfidenceLevel) => void;
}) {
  const pills: { value: ConfidenceLevel; label: string; sub: string }[] = [
    { value: "confident",   label: "Confident",    sub: "I'm sure I got it right" },
    { value: "fairly_sure", label: "Fairly sure",  sub: "Pretty confident"        },
    { value: "guessing",    label: "Not sure",     sub: "I guessed or rushed"     },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600">How confident are you in your build?</p>
      <div className="flex gap-2 flex-wrap">
        {pills.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border text-xs text-left transition-all
              ${value === p.value
                ? "border-[#2F6B3F] bg-[#2F6B3F]/5 text-[#2F6B3F] font-semibold"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
          >
            <div className="font-medium">{p.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{p.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BuildCheckItemRenderer({
  item,
  sessionId,
  onSubmit,
  submitting,
}: BuildCheckItemRendererProps) {
  const rubric     = parseRubric(item.rubric);
  const criteria   = rubric?.verificationCriteria ?? [];
  const steps      = rubric?.steps ?? [];

  const [verifyState,  setVerifyState]  = useState<VerifyState>("idle");
  const [results,      setResults]      = useState<CriterionResult[]>([]);
  const [confidence,   setConfidence]   = useState<ConfidenceLevel | null>(null);
  const [verifyError,  setVerifyError]  = useState<string | null>(null);

  // Reset all state when item changes
  useEffect(() => {
    setVerifyState("idle");
    setResults([]);
    setConfidence(null);
    setVerifyError(null);
  }, [item.id]);

  const allPassed = results.length > 0 && results.every(r => r.passed);
  const anyFailed = results.some(r => !r.passed);

  // ── Verify ───────────────────────────────────────────────────────────────────

  async function handleVerify() {
    setVerifyState("verifying");
    setVerifyError(null);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/assessments/sessions/${sessionId}/items/${item.id}/verify`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (res.status === 503) {
        setVerifyState("sfNotConnected");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setVerifyError(data.error ?? `Verification failed (${res.status}).`);
        setVerifyState("idle");
        return;
      }
      const data = await res.json() as {
        results:        CriterionResult[];
        allPassed:      boolean;
        sfNotConnected?: boolean;
      };
      if (data.sfNotConnected) {
        setVerifyState("sfNotConnected");
        return;
      }
      setResults(data.results);
      setVerifyState("hasResults");
    } catch (e: unknown) {
      setVerifyError(String(e).slice(0, 200));
      setVerifyState("idle");
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleContinue() {
    if (!allPassed || !confidence || submitting) return;
    // No client-side verification data is sent — the server re-runs SF checks
    // at respond time and is the sole authority on pass/fail.
    await onSubmit("build-check-verified", confidence);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Task description */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Task</p>
        <p className="text-sm text-gray-800 leading-relaxed">{item.question}</p>
      </div>

      {/* Numbered steps */}
      {steps.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Steps</p>
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2F6B3F]/10 text-[#2F6B3F] text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Open dev org button */}
      <a
        href="https://login.salesforce.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2F6B3F] text-[#2F6B3F] text-sm font-medium hover:bg-[#2F6B3F]/5 transition-colors"
      >
        <ExternalLink size={14} />
        Open dev org
      </a>

      {/* Verification criteria */}
      {criteria.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            What Penny will check
          </p>
          <div className="space-y-2">
            {criteria.map((criterion) => {
              const result = results.find(r => r.id === criterion.id);
              const hasPassed = result?.passed === true;
              const hasFailed = result?.passed === false;

              return (
                <div
                  key={criterion.id}
                  className={`border rounded-lg p-3 transition-colors ${
                    hasPassed ? "border-green-200 bg-green-50/50" :
                    hasFailed ? "border-red-200 bg-red-50/50" :
                    "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Status icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {hasPassed ? (
                        <CheckCircle2 size={15} className="text-green-600" />
                      ) : hasFailed ? (
                        <XCircle size={15} className="text-red-500" />
                      ) : (
                        <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-sm font-medium ${hasFailed ? "text-red-700" : hasPassed ? "text-green-700" : "text-gray-800"}`}>
                          {criterion.label}
                        </span>
                        <MethodBadge method={criterion.method} />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {criterion.description}
                      </p>
                      {/* Failure detail */}
                      {hasFailed && result && (
                        <p className="mt-1.5 text-xs text-red-600 leading-relaxed bg-red-50 rounded px-2 py-1.5 border border-red-100">
                          {result.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Not-connected state */}
      {verifyState === "sfNotConnected" && (
        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
          <p className="text-sm font-medium text-amber-800 mb-1">Salesforce not connected</p>
          <p className="text-xs text-amber-700">
            Penny needs a connected Salesforce session to verify your build.
            Ask your coach to help you link your account, then try again.
          </p>
        </div>
      )}

      {/* Error */}
      {verifyError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {verifyError}
        </p>
      )}

      {/* All-pass success banner */}
      {allPassed && (
        <div className="flex items-center gap-2 border border-green-200 rounded-lg p-3 bg-green-50">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">All criteria passed — great work!</p>
        </div>
      )}

      {/* Confidence picker — shown after all pass */}
      {allPassed && (
        <ConfidencePicker value={confidence} onChange={setConfidence} />
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {/* Primary action */}
        {verifyState === "idle" && (
          <button
            onClick={handleVerify}
            className="px-4 py-2 rounded-lg bg-[#2F6B3F] text-white text-sm font-medium hover:bg-[#265d35] transition-colors"
          >
            Mark done and check my work
          </button>
        )}

        {verifyState === "verifying" && (
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2F6B3F]/60 text-white text-sm font-medium cursor-not-allowed"
          >
            <RefreshCw size={14} className="animate-spin" />
            Penny is checking your org…
          </button>
        )}

        {verifyState === "hasResults" && anyFailed && (
          <button
            onClick={handleVerify}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Fix and re-check
          </button>
        )}

        {verifyState === "hasResults" && allPassed && (
          <button
            onClick={handleContinue}
            disabled={!confidence || submitting}
            className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
              confidence && !submitting
                ? "bg-[#2F6B3F] hover:bg-[#265d35]"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        )}

        {verifyState === "sfNotConnected" && (
          <button
            onClick={handleVerify}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
