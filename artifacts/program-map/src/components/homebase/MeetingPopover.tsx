/**
 * MeetingPopover
 *
 * Click-triggered Popover showing an AI summary and action items for a single
 * Fathom meeting.  The data (summary + action_items) comes directly from the
 * meetings list response — no additional network call is needed.
 *
 * Visual treatment matches TaskHoverCard: primary accent strip, shadow-2xl,
 * border-2 border-primary/25, w-80, side="bottom", align="start".
 */

import { ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, CheckSquare, Square, FileText } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FathomActionItem {
  description:  string;
  completed:    boolean;
  assigneeName: string | null;
}

export interface FathomMeetingDetail {
  id:           string;
  title:        string;
  started_at:   string;
  share_url:    string;
  summary:      string | null;
  action_items: FathomActionItem[];
}

interface MeetingPopoverProps {
  meeting:  FathomMeetingDetail;
  children: ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip common markdown syntax so AI summaries render as plain readable text.
 * Handles: headings, bold, italic, inline code, bullets, horizontal rules.
 */
function stripMarkdown(md: string): string {
  return md
    // ATX headings → plain line
    .replace(/^#{1,6}\s+/gm, "")
    // Bold + italic combined (***text*** / ___text___)
    .replace(/\*{3}(.+?)\*{3}/g, "$1")
    .replace(/_{3}(.+?)_{3}/g, "$1")
    // Bold (**text** / __text__)
    .replace(/\*{2}(.+?)\*{2}/g, "$1")
    .replace(/_{2}(.+?)_{2}/g, "$1")
    // Italic (*text* / _text_) — only when surrounded by word boundary or space
    .replace(/(^|[\s(])\*([^\s*][^*]*)\*([\s,.!?)]|$)/gm, "$1$2$3")
    .replace(/(^|[\s(])_([^\s_][^_]*)_([\s,.!?)]|$)/gm, "$1$2$3")
    // Inline code
    .replace(/`([^`]+)`/g, "$1")
    // Unordered bullets (- / * / +)
    .replace(/^[\s]*[-*+]\s+/gm, "• ")
    // Ordered list numbers
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MeetingPopover({ meeting, children }: MeetingPopoverProps) {
  const summaryText     = meeting.summary ? stripMarkdown(meeting.summary) : null;
  const hasActionItems  = meeting.action_items.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
        style={{ width: "320px" }}
      >
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/40" />

        {/* Header — title + date */}
        <div className="px-4 pt-3 pb-2.5 border-b border-border/40">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm font-semibold text-foreground leading-snug">
              {meeting.title}
            </p>
          </div>
          {meeting.started_at && (
            <p className="text-[11px] text-muted-foreground mt-1 ml-5">
              {formatDate(meeting.started_at)}
            </p>
          )}
        </div>

        {/* AI Summary */}
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            AI Summary
          </p>
          {summaryText ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {summaryText.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="text-[12px] text-foreground/80 leading-relaxed"
                >
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground/60 italic">
              Summary not yet available
            </p>
          )}
        </div>

        {/* Action Items — only shown when at least one exists */}
        {hasActionItems && (
          <div className="px-4 py-3 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              Action Items
            </p>
            <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
              {meeting.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  {item.completed ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-[12px] leading-snug ${item.completed ? "line-through text-muted-foreground/60" : "text-foreground/80"}`}>
                    {item.description}
                    {item.assigneeName && (
                      <span className="text-muted-foreground ml-1 not-line-through">
                        — {item.assigneeName}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer — "Open full notes in Fathom" */}
        {meeting.share_url && (
          <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-end">
            <a
              href={meeting.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Open full notes in Fathom
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
