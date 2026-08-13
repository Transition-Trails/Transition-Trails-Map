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

import { ReactNode, Fragment, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExternalLink, CheckSquare, Square, FileText, Plus, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

/** Strip inline markdown (bold, italic, code) — leaves text readable. */
function stripInline(text: string): string {
  return text
    .replace(/\*{3}(.+?)\*{3}/g, "$1")
    .replace(/_{3}(.+?)_{3}/g, "$1")
    .replace(/\*{2}(.+?)\*{2}/g, "$1")
    .replace(/_{2}(.+?)_{2}/g, "$1")
    .replace(/(^|[\s(])\*([^\s*][^*]*)\*([\s,.!?)]|$)/gm, "$1$2$3")
    .replace(/(^|[\s(])_([^\s_][^_]*)_([\s,.!?)]|$)/gm, "$1$2$3")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

type SummaryBlock =
  | { kind: "heading"; text: string }
  | { kind: "bullet";  text: string }
  | { kind: "para";    text: string };

/**
 * Parse an AI summary string into structured blocks:
 *  - ATX headings (## Meeting Purpose) → heading
 *  - Bullet lines (- / * / • / 1.) → bullet
 *  - Everything else → paragraph
 * Blank lines are ignored (they just separate blocks).
 */
function parseSummary(md: string): SummaryBlock[] {
  const lines  = md.split("\n");
  const blocks: SummaryBlock[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // ATX heading
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({ kind: "heading", text: stripInline(headingMatch[1]!) });
      continue;
    }

    // Bullet (-, *, +, •, or numbered list)
    const bulletMatch = /^(?:[-*+•]|\d+\.)\s+(.+)$/.exec(line);
    if (bulletMatch) {
      blocks.push({ kind: "bullet", text: stripInline(bulletMatch[1]!) });
      continue;
    }

    // Horizontal rule — skip
    if (/^[-*_]{3,}\s*$/.test(line)) continue;

    // Plain paragraph text — treat bare "Meeting Purpose" / "Key Takeaways" /
    // "Next Steps" lines as headings since Fathom sometimes omits the #.
    const KNOWN_HEADINGS = /^(Meeting Purpose|Key Takeaways?|Next Steps?|Summary|Overview|Action Items?)$/i;
    if (KNOWN_HEADINGS.test(line)) {
      blocks.push({ kind: "heading", text: stripInline(line) });
      continue;
    }

    blocks.push({ kind: "para", text: stripInline(line) });
  }

  return blocks;
}

/**
 * Split text on URLs and return an array of strings + <a> elements so raw
 * URLs in AI-generated summaries and action items render as clickable links.
 */
const URL_RE = /https?:\/\/[^\s)\]'"]+/g;

function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-primary underline underline-offset-2 hover:text-primary/75 transition-colors break-all"
      >
        {url}
      </a>
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

// ── ActionItemRow ─────────────────────────────────────────────────────────────
// Renders one action item with an inline "Add as SF Task" button.
// Tracks its own creating/created state so each row is independent.

function ActionItemRow({
  item,
  meetingTitle,
}: {
  item:         FathomActionItem;
  meetingTitle: string;
}) {
  const { toast }                     = useToast();
  const [creating, setCreating]       = useState(false);
  const [created,  setCreated]        = useState(false);

  async function addAsTask(e: React.MouseEvent) {
    e.stopPropagation();
    if (creating || created) return;
    setCreating(true);
    try {
      // SF Subject max is 255 chars
      const subject = item.description.length > 255
        ? item.description.slice(0, 252) + "…"
        : item.description;
      const descParts = [
        `From meeting: ${meetingTitle}`,
        item.assigneeName ? `Assigned to: ${item.assigneeName}` : null,
      ].filter(Boolean);

      const res  = await fetch("/api/sf/tasks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          subject,
          description: descParts.join("\n"),
          priority:    "Normal",
        }),
      });
      const data = await res.json() as { id?: string; success?: boolean; error?: string };

      if (res.ok && data.success) {
        setCreated(true);
        toast({
          title:       "Task added to Salesforce",
          description: subject.length > 80 ? subject.slice(0, 77) + "…" : subject,
        });
      } else {
        toast({ title: "Couldn't create task", description: data.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Couldn't create task", description: "Network error — please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <li className="flex items-start gap-2 group/item">
      {/* Checkbox icon */}
      <div className="flex-shrink-0 mt-0.5">
        {item.completed
          ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
          : <Square      className="w-3.5 h-3.5 text-muted-foreground/50" />
        }
      </div>

      {/* Description + assignee */}
      <span
        className={`text-[12px] leading-snug break-words flex-1 min-w-0 ${
          item.completed ? "line-through text-muted-foreground/60" : "text-foreground/80"
        }`}
        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
      >
        {linkifyText(item.description).map((node, j) => (
          <Fragment key={j}>{node}</Fragment>
        ))}
        {item.assigneeName && (
          <span className="text-muted-foreground ml-1">— {item.assigneeName}</span>
        )}
      </span>

      {/* Add as SF Task button */}
      <button
        onClick={addAsTask}
        disabled={creating}
        title={created ? "Added to Salesforce" : "Add as Salesforce Task"}
        className={`flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all mt-0.5 ${
          created
            ? "text-emerald-600 bg-emerald-50"
            : "opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10"
        } disabled:opacity-50`}
      >
        {creating
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : created
            ? <Check className="w-3 h-3" />
            : <Plus  className="w-3 h-3" />
        }
        <span className={creating ? "sr-only" : ""}>
          {created ? "Added" : "Task"}
        </span>
      </button>
    </li>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MeetingPopover({ meeting, children }: MeetingPopoverProps) {
  const summaryBlocks  = meeting.summary ? parseSummary(meeting.summary) : null;
  const hasActionItems = meeting.action_items.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
        style={{ width: "420px", maxWidth: "calc(100vw - 32px)" }}
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
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            AI Summary
          </p>
          {summaryBlocks && summaryBlocks.length > 0 ? (
            <div className="max-h-56 overflow-y-auto overflow-x-hidden pr-0.5 space-y-0">
              {summaryBlocks.map((block, i) => {
                if (block.kind === "heading") {
                  return (
                    <p
                      key={i}
                      className="text-[11px] font-semibold text-foreground uppercase tracking-wide mt-3 mb-1 first:mt-0"
                    >
                      {block.text}
                    </p>
                  );
                }
                if (block.kind === "bullet") {
                  return (
                    <div key={i} className="flex items-start gap-1.5 mb-1">
                      <span className="text-primary/70 text-[11px] leading-relaxed mt-[1px] flex-shrink-0">•</span>
                      <span
                        className="text-[12px] text-foreground/80 leading-relaxed break-words flex-1"
                        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                      >
                        {linkifyText(block.text).map((node, j) => (
                          <Fragment key={j}>{node}</Fragment>
                        ))}
                      </span>
                    </div>
                  );
                }
                // para
                return (
                  <p
                    key={i}
                    className="text-[12px] text-foreground/80 leading-relaxed break-words mb-1.5"
                    style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                  >
                    {linkifyText(block.text).map((node, j) => (
                      <Fragment key={j}>{node}</Fragment>
                    ))}
                  </p>
                );
              })}
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
            <ul className="space-y-1.5 max-h-44 overflow-y-auto overflow-x-hidden pr-0.5">
              {meeting.action_items.map((item, i) => (
                <ActionItemRow
                  key={i}
                  item={item}
                  meetingTitle={meeting.title}
                />
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
