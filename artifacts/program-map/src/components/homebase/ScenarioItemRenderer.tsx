/**
 * ScenarioItemRenderer
 *
 * Free-text scenario item renderer for the Trail OS v1.7 Skill Assessment.
 *
 * Layout (top → bottom):
 *   ─ Question stem
 *   ─ Rubric criteria cards (shown BEFORE the learner writes — they know the target)
 *   ─ Textarea with character / word counter
 *   ─ Screen-capture opt-in (optional — learner can decline with no penalty)
 *   ─ Confidence picker (same three pills as MC items)
 *   ─ Continue button — enabled when response ≥ MIN_CHARS non-whitespace + confidence chosen
 *
 * Coach signals (captured silently, never shown to learner):
 *   keystrokeCount    — printable key events on the textarea
 *   pasteCount        — number of paste events
 *   longestInsertion  — length of the longest single paste (chars)
 *   pasteRatio        — totalPastedChars / max(1, answer.length) at submit time
 *   focusTimeMs       — cumulative milliseconds the textarea held focus
 *   screenShared      — true if browser granted getDisplayMedia for this item
 *
 * Penny rubric scoring fires asynchronously on the server after the response
 * is accepted — the shell advances immediately; scores appear in the debrief.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Monitor, MonitorOff, CheckCircle } from "lucide-react";
import type { ConfidenceLevel } from "./MCItemRenderer";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RubricCriterion {
  id:          string;
  label:       string;
  description: string;
}

export interface CoachSignals {
  keystrokeCount:   number;
  pasteCount:       number;
  longestInsertion: number;
  pasteRatio:       number;
  focusTimeMs:      number;
  screenShared:     boolean;
}

export interface ScenarioItem {
  id:          number;
  domain:      string;
  domainLabel: string;
  itemType:    string;
  question:    string;
  /** Raw JSONB — parsed as { criteria: RubricCriterion[] } */
  rubric?:     unknown;
  weight:      number;
}

interface ScenarioItemRendererProps {
  item:       ScenarioItem;
  onSubmit:   (answer: string, confidence: ConfidenceLevel, signals: CoachSignals) => Promise<void>;
  submitting: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum non-whitespace characters before Continue activates */
const MIN_CHARS = 20;

const CONFIDENCE_PILLS: { value: ConfidenceLevel; label: string; sub: string }[] = [
  { value: "confident",   label: "Confident",   sub: "I know this"         },
  { value: "fairly_sure", label: "Fairly sure", sub: "Pretty good feeling" },
  { value: "guessing",    label: "Guessing",    sub: "Not sure at all"     },
];

// ── Rubric parser ─────────────────────────────────────────────────────────────

function isRubricCriterion(v: unknown): v is RubricCriterion {
  return (
    typeof v === "object" && v !== null &&
    typeof (v as RubricCriterion).id          === "string" &&
    typeof (v as RubricCriterion).label       === "string" &&
    typeof (v as RubricCriterion).description === "string"
  );
}

function parseRubric(raw: unknown): RubricCriterion[] {
  try {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as { criteria?: unknown };
    if (!Array.isArray(r.criteria)) return [];
    return r.criteria.filter(isRubricCriterion);
  } catch {
    return [];
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RubricCard({ criterion, index }: { criterion: RubricCriterion; index: number }) {
  const nums = ["①", "②", "③", "④"];
  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-lg border"
      style={{ background: "#F5FAF6", borderColor: "#BBD9C2" }}
    >
      <span className="text-base mt-0.5 shrink-0" style={{ color: "#2F6B3F" }}>
        {nums[index] ?? String(index + 1)}
      </span>
      <div>
        <p className="text-[12px] font-semibold" style={{ color: "#2F6B3F" }}>
          {criterion.label}
        </p>
        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#4A4F4D" }}>
          {criterion.description}
        </p>
      </div>
    </div>
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

export function ScenarioItemRenderer({ item, onSubmit, submitting }: ScenarioItemRendererProps) {
  const [answer,       setAnswer]       = useState("");
  const [confidence,   setConfidence]   = useState<ConfidenceLevel | null>(null);
  const [screenShared, setScreenShared] = useState(false);

  const criteria = parseRubric(item.rubric);

  // ── Coach signal refs (never cause re-renders) ──────────────────────────────
  const keystrokeCountRef   = useRef(0);
  const pasteCountRef       = useRef(0);
  const totalPastedCharsRef = useRef(0);
  const longestInsertionRef = useRef(0);
  const focusStartRef       = useRef<number | null>(null);
  const focusAccumRef       = useRef(0);
  const mediaStreamRef      = useRef<MediaStream | null>(null);
  const screenSharedRef     = useRef(false);

  // ── Reset all state and signals when item changes ───────────────────────────
  useEffect(() => {
    setAnswer("");
    setConfidence(null);
    setScreenShared(false);
    keystrokeCountRef.current   = 0;
    pasteCountRef.current       = 0;
    totalPastedCharsRef.current = 0;
    longestInsertionRef.current = 0;
    focusStartRef.current       = null;
    focusAccumRef.current       = 0;
    screenSharedRef.current     = false;
    // Stop any active capture
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  }, [item.id]);

  // ── Stop capture on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Textarea signal handlers ────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Count only printable keystrokes (ignore modifiers, arrows, etc.)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      keystrokeCountRef.current++;
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text") ?? "";
    pasteCountRef.current++;
    totalPastedCharsRef.current += pasted.length;
    if (pasted.length > longestInsertionRef.current) {
      longestInsertionRef.current = pasted.length;
    }
  }, []);

  const handleFocus = useCallback(() => {
    focusStartRef.current = Date.now();
  }, []);

  const handleBlur = useCallback(() => {
    if (focusStartRef.current !== null) {
      focusAccumRef.current += Date.now() - focusStartRef.current;
      focusStartRef.current = null;
    }
  }, []);

  function getFocusTimeMs(): number {
    if (focusStartRef.current !== null) {
      return focusAccumRef.current + (Date.now() - focusStartRef.current);
    }
    return focusAccumRef.current;
  }

  // ── Screen capture ──────────────────────────────────────────────────────────
  async function requestScreenShare() {
    // Not supported in all browsers
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      mediaStreamRef.current  = stream;
      screenSharedRef.current = true;
      setScreenShared(true);
      // Handle user stopping share via browser UI
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          screenSharedRef.current = false;
          setScreenShared(false);
          mediaStreamRef.current = null;
        };
      });
    } catch {
      // User declined or browser blocked — proceed silently; no penalty
    }
  }

  function stopScreenShare() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current  = null;
      screenSharedRef.current = false;
      setScreenShared(false);
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const trimmedLength   = answer.replace(/\s/g, "").length;
  const wordCount       = answer.trim().split(/\s+/).filter(Boolean).length;
  const meetsMinimum    = trimmedLength >= MIN_CHARS;
  const canSubmit       = meetsMinimum && confidence !== null && !submitting;

  async function handleContinue() {
    if (!canSubmit || !confidence) return;

    // Finalise paste ratio
    const textLen    = answer.trim().length;
    const pasteRatio = textLen > 0
      ? Math.min(1, totalPastedCharsRef.current / textLen)
      : 0;

    // Stop active screen share
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    const signals: CoachSignals = {
      keystrokeCount:   keystrokeCountRef.current,
      pasteCount:       pasteCountRef.current,
      longestInsertion: longestInsertionRef.current,
      pasteRatio:       Math.round(pasteRatio * 1000) / 1000,
      focusTimeMs:      getFocusTimeMs(),
      screenShared:     screenSharedRef.current,
    };

    await onSubmit(answer.trim(), confidence, signals);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Question stem ─────────────────────────────────────────── */}
      <p className="text-[15px] font-medium leading-relaxed" style={{ color: "#2A2E2C" }}>
        {item.question}
      </p>

      {/* ── Rubric criteria ───────────────────────────────────────── */}
      {criteria.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            Penny will score your response against
          </p>
          <div className="space-y-1.5">
            {criteria.map((c, i) => (
              <RubricCard key={c.id} criterion={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Textarea ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={submitting}
          rows={6}
          placeholder="Describe your approach step by step. Use specific Salesforce terms where relevant."
          className="w-full resize-y rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors"
          style={{
            borderColor:     "#E2E4E1",
            background:      submitting ? "#F9FAFB" : "white",
            color:           "#2A2E2C",
            minHeight:       120,
            // Soft green ring when typing
            boxShadow:       answer.length > 0 ? "0 0 0 2px #BBD9C2" : "none",
          }}
        />
        {/* Character / word counter */}
        <div className="flex items-center justify-between px-0.5">
          <span
            className="text-[11px]"
            style={{ color: meetsMinimum ? "#2F6B3F" : "#9CA3AF" }}
          >
            {meetsMinimum ? "✓ Minimum met" : `${MIN_CHARS - trimmedLength} more characters needed`}
          </span>
          <span className="text-[11px]" style={{ color: "#C4C9C6" }}>
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
      </div>

      {/* ── Screen-capture opt-in ─────────────────────────────────── */}
      {typeof navigator.mediaDevices?.getDisplayMedia === "function" && (
        <div className="flex items-center gap-2">
          {screenShared ? (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "#EAF4EC", border: "1px solid #BBD9C2" }}>
                <CheckCircle className="w-3.5 h-3.5" style={{ color: "#2F6B3F" }} />
                <span className="text-[11px] font-semibold" style={{ color: "#2F6B3F" }}>
                  Screen sharing active
                </span>
              </div>
              <button
                onClick={stopScreenShare}
                className="text-[11px] underline"
                style={{ color: "#9CA3AF" }}
              >
                Stop
              </button>
            </>
          ) : (
            <button
              onClick={() => void requestScreenShare()}
              disabled={submitting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-opacity disabled:opacity-40"
              style={{ background: "#F9FAFB", borderColor: "#E2E4E1", color: "#6B7280" }}
            >
              <Monitor className="w-3.5 h-3.5" />
              Share this screen (optional)
            </button>
          )}
          <span className="text-[10px]" style={{ color: "#C4C9C6" }}>
            Sharing is optional and only visible to your coach
          </span>
        </div>
      )}

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

      {!meetsMinimum && !submitting && (
        <p className="text-center text-[11px]" style={{ color: "#C4C9C6" }}>
          Write at least {MIN_CHARS} characters to continue
        </p>
      )}

    </div>
  );
}

// ── Re-export for unused-import safety (MonitorOff used only when screen share) ──
void MonitorOff;
