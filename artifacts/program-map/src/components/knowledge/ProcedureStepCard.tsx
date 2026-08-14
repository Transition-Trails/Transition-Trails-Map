/**
 * ProcedureStepCard
 *
 * Renders a single procedure step in the Knowledge Studio Article editor.
 * Features:
 *   - Numbered chip, editable instruction, verify block, URL field, version-stamped thumbnail
 *   - "Needs a verify line" attention pill with "Penny can draft it" toast affordance
 *   - Drag-to-reorder handle via @dnd-kit/sortable (host wraps in DndContext)
 *   - Add / Delete step controls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Trash2, ExternalLink, Camera,
  CheckCircle2, AlertCircle, Sparkles, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProcedureStep } from '@/hooks/useProcedureSteps';
import { STATUS_CLASSES } from '@/config/statusColors';

interface ProcedureStepCardProps {
  step: ProcedureStep;
  /** Article's Last_Tested_Version for stale-capture detection */
  lastTestedVersion: string | null;
  onUpdate: (patch: Partial<Pick<ProcedureStep, 'instruction' | 'verifyLine' | 'directUrl' | 'toolVersion'>>) => void;
  onDelete: () => void;
}

// ── Inline editable textarea ──────────────────────────────────────────────────

interface InlineTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

function InlineTextarea({ value, onChange, placeholder, rows = 2, className = '', autoFocus = false }: InlineTextareaProps) {
  const [local, setLocal] = useState(value);

  // Sync when the prop value changes (e.g. after optimistic update resolves from the server)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <textarea
      value={local}
      rows={rows}
      placeholder={placeholder}
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onChange(local); }}
      className={`w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/40
        focus:outline-none resize-none leading-snug ${className}`}
    />
  );
}

// ── VersionStamp ──────────────────────────────────────────────────────────────

function VersionStamp({
  toolVersion, captureDate, lastTestedVersion,
}: {
  toolVersion: string | null; captureDate: string | null; lastTestedVersion: string | null;
}) {
  if (!toolVersion && !captureDate) return null;

  const isStale = toolVersion && lastTestedVersion && toolVersion !== lastTestedVersion;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
      isStale ? STATUS_CLASSES.critical.badge : STATUS_CLASSES.neutral.badge
    }`}>
      {isStale && <AlertCircle className="w-2.5 h-2.5" />}
      {toolVersion ?? 'Unknown version'}
      {captureDate && (
        <span className="opacity-60">
          · {new Date(captureDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
      )}
      {isStale && <span>→ needs retake</span>}
    </span>
  );
}

// ── ProcedureStepCard ─────────────────────────────────────────────────────────

export function ProcedureStepCard({
  step, lastTestedVersion, onUpdate, onDelete,
}: ProcedureStepCardProps) {
  const { toast } = useToast();

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: step.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.45 : 1,
    zIndex:    isDragging ? 20 : undefined,
  };

  /**
   * verifyEditing tracks whether the user has explicitly opened the verify block
   * for editing, even when verifyLine is still null/empty on the step.
   * This is separate from hasVerify (which is true only if the DB value is non-empty).
   * When the user clicks "Add manually", verifyEditing = true and the green textarea
   * appears immediately so they can type — the DB is only updated on blur.
   */
  const [verifyEditing, setVerifyEditing] = useState(false);

  // Keep verifyEditing in sync when step.verifyLine is set externally (e.g. server response)
  const prevVerifyLine = useRef(step.verifyLine);
  useEffect(() => {
    if (prevVerifyLine.current !== step.verifyLine) {
      prevVerifyLine.current = step.verifyLine;
      // If the server cleared the verify line, exit editing mode
      if (!step.verifyLine) setVerifyEditing(false);
    }
  }, [step.verifyLine]);

  const handlePennyDraft = useCallback(() => {
    toast({
      title: "Penny drafting verify line…",
      description: "Penny can generate a verify line based on the step instruction. This feature will be available after the article is sent for Penny review.",
    });
  }, [toast]);

  const handleDismissVerify = useCallback(() => {
    setVerifyEditing(false);
    // If the field had content, also clear it
    if (step.verifyLine) onUpdate({ verifyLine: null });
  }, [step.verifyLine, onUpdate]);

  const hasVerify = Boolean(step.verifyLine?.trim());
  // Show the green verify block when there is content OR the user opened the editor manually
  const showVerifyBlock = hasVerify || verifyEditing;

  return (
    <div ref={setNodeRef} style={style} className="group/step relative">
      <div className="rounded-lg border border-border bg-white overflow-hidden">

        {/* ── Step header: chip + drag + delete ────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
          {/* Sequence chip */}
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
            {step.sequence}
          </span>

          <span className="text-[11px] font-semibold text-muted-foreground flex-1">
            Step {step.sequence}
          </span>

          {/* Drag handle */}
          <button
            {...listeners}
            {...attributes}
            aria-label="Drag to reorder step"
            className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none opacity-0 group-hover/step:opacity-100 transition-opacity"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            aria-label="Delete step"
            className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/step:opacity-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Instruction ──────────────────────────────────────────────────── */}
        <div className="px-3 pt-3 pb-2">
          <InlineTextarea
            value={step.instruction}
            onChange={v => onUpdate({ instruction: v })}
            placeholder="Describe what the user does in this step…"
            rows={2}
          />
        </div>

        {/* ── Verify block ─────────────────────────────────────────────────── */}
        {showVerifyBlock ? (
          /* Green surface — visible when hasVerify OR user clicked "Add manually" */
          <div className="mx-3 mb-3 rounded-md border border-[#9FC3AE] bg-[#E6F0EA] px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
              <span className="text-[10px] font-bold text-[#2F6B3F] uppercase tracking-wide flex-1">You should see</span>
              {/* Dismiss button: clear the field and exit editing mode */}
              <button
                onClick={handleDismissVerify}
                aria-label="Remove verify line"
                className="p-0.5 rounded text-[#2F6B3F]/50 hover:text-[#2F6B3F] hover:bg-[#9FC3AE]/30 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <InlineTextarea
              /* Use step.id as key so the textarea re-mounts fresh when a new step gets a verify line */
              key={`verify-${step.id}`}
              value={step.verifyLine ?? ''}
              onChange={v => {
                if (v.trim()) {
                  onUpdate({ verifyLine: v });
                } else {
                  // User cleared the field — exit edit mode and remove the value
                  setVerifyEditing(false);
                  onUpdate({ verifyLine: null });
                }
              }}
              placeholder="Describe the expected result the user should see…"
              rows={2}
              className="text-[#2F6B3F]"
              autoFocus={verifyEditing && !hasVerify}
            />
          </div>
        ) : (
          /* Attention pills — shown only when no verify line exists and editing not active */
          <div className="mx-3 mb-3 flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${STATUS_CLASSES.attention.badge}`}>
              <AlertCircle className="w-2.5 h-2.5" /> Needs a verify line
            </span>
            <button
              onClick={handlePennyDraft}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" /> Penny can draft it
            </button>
            {/* Opens the green textarea so the user can type a verify line manually */}
            <button
              onClick={() => setVerifyEditing(true)}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors ml-auto"
            >
              + Add manually
            </button>
          </div>
        )}

        {/* ── Direct URL ───────────────────────────────────────────────────── */}
        <div className="px-3 pb-3 flex items-center gap-2">
          <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />
          <input
            type="url"
            defaultValue={step.directUrl ?? ''}
            onBlur={e => {
              const v = e.target.value.trim() || null;
              if (v !== step.directUrl) onUpdate({ directUrl: v });
            }}
            placeholder="Direct link for this step (optional)"
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/35
              focus:outline-none border-b border-transparent focus:border-border transition-colors"
          />
        </div>

        {/* ── Capture tile ─────────────────────────────────────────────────── */}
        <div className="mx-3 mb-3 rounded-md border border-dashed border-border bg-muted/20
          flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
            {step.captureUrl ? (
              <img src={step.captureUrl} alt="Capture" className="w-full h-full object-cover rounded" />
            ) : (
              <Camera className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">
              {step.captureUrl ? 'Capture attached' : 'No capture yet'}
            </p>
            <VersionStamp
              toolVersion={step.toolVersion}
              captureDate={step.captureDate}
              lastTestedVersion={lastTestedVersion}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
