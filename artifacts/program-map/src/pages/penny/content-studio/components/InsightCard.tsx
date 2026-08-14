// ─────────────────────────────────────────────────────────────────────────────
// InsightCard — Content Studio shared component
// Renders an advisory (amber lightbulb) or informational (teal lightbulb) card
// with observation text, "Read from" fields, primary/secondary actions,
// a dismissal row with reason input, and a teal Penny footer band.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Lightbulb, GitBranch, X } from 'lucide-react';
import type { InsightCardProps } from '../types';

export function InsightCard({
  kind,
  scope,
  observation,
  readFrom,
  primaryAction,
  secondaryAction,
  pennyNote,
  onDismiss,
}: InsightCardProps) {
  const [dismissing, setDismissing] = useState(false);
  const [reason, setReason]         = useState('');

  const isAdvisory = kind === 'advisory';

  // Color tokens by kind
  const iconColor  = isAdvisory ? 'text-[#CC8400]'  : 'text-[#2F6F7E]';
  const chipBg     = isAdvisory ? 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]' : 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
  const borderTop  = isAdvisory ? 'border-[#FFD08A]' : 'border-[#7FAFC6]';

  function handleDismiss() {
    if (!reason.trim()) return;
    onDismiss(reason.trim());
    setDismissing(false);
    setReason('');
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden text-[14px]">

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">

        {/* Header row: lightbulb icon + "Insight" + scope chip */}
        <div className="flex items-center gap-2">
          <Lightbulb className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
          <span className="font-semibold text-foreground">Insight</span>
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${chipBg}`}>
            {scope}
          </span>
        </div>

        {/* Observation */}
        <p className="text-muted-foreground leading-relaxed">{observation}</p>

        {/* "Read from" hairline with git-branch icon */}
        {readFrom.length > 0 && (
          <div className={`flex items-start gap-2 pt-2 border-t ${borderTop}`}>
            <GitBranch className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-[12px] text-muted-foreground/60 font-medium">Read from:</span>
              {readFrom.map((src, i) => (
                <span key={i} className="text-[12px] text-muted-foreground/80">{src}{i < readFrom.length - 1 ? '·' : ''}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={primaryAction.onClick}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            {primaryAction.label}
          </button>
          <button
            onClick={secondaryAction.onClick}
            className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {secondaryAction.label}
          </button>
          <button
            onClick={() => setDismissing(d => !d)}
            className="ml-auto text-[12px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Dismiss
          </button>
        </div>

        {/* Dismissal row */}
        {dismissing && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for dismissing (required)…"
              className="flex-1 text-[13px] border border-border rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              onKeyDown={e => { if (e.key === 'Enter') handleDismiss(); }}
            />
            <button
              onClick={handleDismiss}
              disabled={!reason.trim()}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {/* ── Penny footer band ────────────────────────────────────────────────── */}
      <div className="bg-[#EDF5F8] border-t border-[#7FAFC6] px-4 py-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-[#2F6F7E] uppercase tracking-wide">Penny</span>
        <span className="text-[12px] text-[#2F6F7E]/80 leading-snug">{pennyNote}</span>
      </div>
    </div>
  );
}
