/**
 * MCItemRenderer
 *
 * Multiple-choice item renderer for the Trail OS v1.7 Skill Assessment.
 *
 * Layout:
 *   ─ Question stem
 *   ─ Four option cards (A · B · C · D), keyboard-shortcut support
 *   ─ "How sure are you?" confidence picker (Confident / Fairly sure / Guessing)
 *   ─ Continue button — disabled until both an option AND a confidence level are chosen
 *
 * The component never reveals correct/incorrect during the session.
 * Feedback is deferred to the debrief (Task 6).
 */

import { useState, useEffect, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MCItem {
  id:          number;
  domain:      string;
  domainLabel: string;
  itemType:    string;
  question:    string;
  /** Array of 4 option strings; order is canonical A/B/C/D */
  options?:    string[];
  weight:      number;
}

/** Must match the API's validConfidence list: ["confident","fairly_sure","guessing"] */
export type ConfidenceLevel = "confident" | "fairly_sure" | "guessing";

interface MCItemRendererProps {
  item:       MCItem;
  onSubmit:   (answer: string, confidence: ConfidenceLevel) => Promise<void>;
  submitting: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const CONFIDENCE_PILLS: { value: ConfidenceLevel; label: string; sub: string }[] = [
  { value: "confident",   label: "Confident",   sub: "I know this"         },
  { value: "fairly_sure", label: "Fairly sure", sub: "Pretty good feeling" },
  { value: "guessing",    label: "Guessing",    sub: "Not sure at all"     },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function OptionCard({
  letter,
  text,
  selected,
  disabled,
  onClick,
}: {
  letter:   string;
  text:     string;
  selected: boolean;
  disabled: boolean;
  onClick:  () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-100"
      style={{
        background:   selected ? "#EAF4EC" : "white",
        borderColor:  selected ? "#2F6B3F" : "#E2E4E1",
        borderWidth:  selected ? 2         : 1,
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled && !selected ? 0.6 : 1,
      }}
      aria-pressed={selected}
    >
      {/* Letter badge */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold mt-0.5"
        style={{
          background: selected ? "#2F6B3F" : "#F3F4F6",
          color:      selected ? "white"   : "#6B7280",
        }}
      >
        {letter}
      </span>
      <span
        className="text-[14px] leading-snug flex-1"
        style={{ color: selected ? "#2A2E2C" : "#4A4F4D", fontWeight: selected ? 500 : 400 }}
      >
        {text}
      </span>
    </button>
  );
}

function ConfidencePicker({
  value,
  onChange,
  disabled,
}: {
  value:    ConfidenceLevel | null;
  onChange: (v: ConfidenceLevel) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold" style={{ color: "#4A4F4D" }}>
        How sure are you?
      </p>
      <div className="flex gap-2 flex-wrap">
        {CONFIDENCE_PILLS.map(pill => {
          const active = value === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => onChange(pill.value)}
              disabled={disabled}
              className="flex flex-col items-start px-3 py-2 rounded-xl border transition-all duration-100"
              style={{
                background:  active ? "#EAF4EC" : "white",
                borderColor: active ? "#2F6B3F" : "#E2E4E1",
                borderWidth: active ? 2         : 1,
                cursor:      disabled ? "not-allowed" : "pointer",
                minWidth:    100,
              }}
              aria-pressed={active}
            >
              <span
                className="text-[13px] font-semibold"
                style={{ color: active ? "#2F6B3F" : "#2A2E2C" }}
              >
                {pill.label}
              </span>
              <span className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>
                {pill.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MCItemRenderer({ item, onSubmit, submitting }: MCItemRendererProps) {
  const [selected,    setSelected]    = useState<string | null>(null);
  const [confidence,  setConfidence]  = useState<ConfidenceLevel | null>(null);

  const options = item.options ?? [];
  const canSubmit = !!selected && !!confidence && !submitting;

  // ── Keyboard shortcuts: A / B / C / D select options ──────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when focus is on an input/textarea to avoid hijacking text entry
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    const idx = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
    if (idx >= 0 && idx < options.length) {
      setSelected(options[idx]);
    }
  }, [options]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Reset state when item changes
  useEffect(() => {
    setSelected(null);
    setConfidence(null);
  }, [item.id]);

  async function handleContinue() {
    if (!canSubmit || !selected || !confidence) return;
    await onSubmit(selected, confidence);
  }

  return (
    <div className="space-y-5">

      {/* ── Question stem ─────────────────────────────────────────── */}
      <p className="text-[15px] font-medium leading-relaxed" style={{ color: "#2A2E2C" }}>
        {item.question}
      </p>

      {/* ── Option cards ──────────────────────────────────────────── */}
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <OptionCard
            key={idx}
            letter={OPTION_LABELS[idx] ?? String(idx + 1)}
            text={opt}
            selected={selected === opt}
            disabled={submitting}
            onClick={() => setSelected(opt)}
          />
        ))}
      </div>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="h-px" style={{ background: "#F3F4F6" }} />

      {/* ── Confidence picker ─────────────────────────────────────── */}
      <ConfidencePicker
        value={confidence}
        onChange={setConfidence}
        disabled={submitting}
      />

      {/* ── Continue button ───────────────────────────────────────── */}
      <button
        onClick={() => void handleContinue()}
        disabled={!canSubmit}
        className="w-full h-11 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        style={{ background: "#2F6B3F" }}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Saving…
          </>
        ) : (
          "Continue →"
        )}
      </button>

      {/* Keyboard hint */}
      {!submitting && (
        <p className="text-center text-[11px]" style={{ color: "#C4C9C6" }}>
          Press A · B · C · D to select
        </p>
      )}

    </div>
  );
}
