// ─────────────────────────────────────────────────────────────────────────────
// ContentStudioPennyCard — Content Studio shared component
// Three modes: Coordinator, Quest Guide, Coach.
// Renders a teal EDF5F8 header band with mode badge, message body, action links,
// and an optional "Penny reviewed this on Gemini" block with applied/flagged items.
// ─────────────────────────────────────────────────────────────────────────────

import { CircleCheckBig, TriangleAlert } from 'lucide-react';
import type { PennyCardProps } from '../types';

const MODE_COLORS: Record<string, { badge: string; border: string }> = {
  Coordinator: { badge: 'bg-[#2F6F7E] text-white',            border: 'border-[#7FAFC6]' },
  'Quest Guide': { badge: 'bg-[#2F6B3F] text-white',          border: 'border-[#9FC3AE]' },
  Coach:        { badge: 'bg-[#CC8400] text-white',            border: 'border-[#FFD08A]' },
};

export function ContentStudioPennyCard({
  mode,
  message,
  actions,
  aiReview,
}: PennyCardProps) {
  const { badge, border } = MODE_COLORS[mode] ?? MODE_COLORS['Coordinator'];

  return (
    <div className={`rounded-lg border bg-card overflow-hidden text-[14px] ${border}`}>

      {/* ── Header band ─────────────────────────────────────────────────────── */}
      <div className="bg-[#EDF5F8] border-b border-[#7FAFC6] px-4 py-2.5 flex items-center gap-2.5">
        <span className="text-[11px] font-semibold text-[#2F6F7E] uppercase tracking-wide">Penny</span>
        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>
          {mode}
        </span>
      </div>

      {/* ── Message body ────────────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        <p className="text-muted-foreground leading-relaxed">{message}</p>

        {/* Action links */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action, i) => (
              <button
                key={i}
                className="text-[13px] font-medium text-[#2F6F7E] hover:underline transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── AI review band ──────────────────────────────────────────────────── */}
      {aiReview && aiReview.revisions.length > 0 && (
        <div className="border-t border-[#7FAFC6] bg-[#F8FCFD] px-4 py-3 space-y-2">
          <p className="text-[12px] font-semibold text-[#2F6F7E]">
            Penny reviewed this on Gemini
          </p>
          <ul className="space-y-1.5">
            {aiReview.revisions.map((rev, i) => (
              <li key={i} className="flex items-start gap-2">
                {rev.kind === 'applied' ? (
                  <CircleCheckBig className="w-3.5 h-3.5 text-[#2F6B3F] flex-shrink-0 mt-0.5" />
                ) : (
                  <TriangleAlert className="w-3.5 h-3.5 text-[#CC8400] flex-shrink-0 mt-0.5" />
                )}
                <span className="text-[13px] text-muted-foreground leading-snug">{rev.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
