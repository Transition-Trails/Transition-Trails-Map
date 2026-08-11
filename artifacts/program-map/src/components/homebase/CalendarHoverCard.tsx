/**
 * CalendarHoverCard
 *
 * Click-triggered Popover showing full Google Calendar event detail with RSVP
 * actions and a Log Time shortcut. Wraps any trigger element as a child.
 *
 * Visual treatment matches CaseHoverCard / TaskHoverCard:
 *   - side="bottom", align="start", 360 px wide
 *   - shadow-2xl, border-2 border-primary/25, rounded-xl
 *   - Accent gradient strip at top
 */

import { useState, ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ExternalLink,
  Clock,
  Video,
  MapPin,
  Users,
  Check,
  Minus,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalEventAttendee {
  email:          string;
  displayName?:   string;
  responseStatus?: "accepted" | "needsAction" | "declined" | "tentative";
  self?:          boolean;
  organizer?:     boolean;
}

export interface CalEventDateTime {
  dateTime?: string;
  date?:     string;
}

export interface CalHoverEvent {
  id:          string;
  summary:     string;
  description: string;
  location:    string;
  start:       CalEventDateTime;
  end:         CalEventDateTime;
  attendees:   CalEventAttendee[];
  htmlLink:    string;
  meetLink:    string | null;
  status:      string;
}

interface CalendarHoverCardProps {
  event:    CalHoverEvent;
  /** Called when RSVP succeeds so the parent can update isPendingResponse. */
  onRsvp?:  (eventId: string, newStatus: string) => void;
  children: ReactNode;
}

// ── Response-status config ────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  accepted:    { label: "Accepted",  className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  tentative:   { label: "Tentative", className: "bg-amber-100 text-amber-700 border border-amber-200"   },
  declined:    { label: "Declined",  className: "bg-rose-100 text-rose-700 border border-rose-200"       },
  needsAction: { label: "Awaiting",  className: "bg-slate-100 text-slate-600 border border-slate-200"   },
};

const RSVP_BTNS = [
  { status: "accepted",  label: "Accept",    Icon: Check,  activeClass: "bg-emerald-600 text-white ring-emerald-400" },
  { status: "tentative", label: "Tentative", Icon: Minus,  activeClass: "bg-amber-500 text-white ring-amber-300"    },
  { status: "declined",  label: "Decline",   Icon: X,      activeClass: "bg-rose-600 text-white ring-rose-400"      },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(start: CalEventDateTime, end: CalEventDateTime): string {
  if (!start.dateTime) return "All day";
  const s = new Date(start.dateTime);
  const e = end.dateTime ? new Date(end.dateTime) : null;

  const day = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const startT = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const endT   = e ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : null;

  return endT ? `${day} · ${startT} – ${endT}` : `${day} · ${startT}`;
}

/** Round minutes to the nearest 15, minimum 15. */
function roundToNearest15(minutes: number): number {
  return Math.max(15, Math.round(minutes / 15) * 15);
}

function getMeetingDuration(start: CalEventDateTime, end: CalEventDateTime): number | null {
  if (!start.dateTime || !end.dateTime) return null;
  const diffMs = new Date(end.dateTime).getTime() - new Date(start.dateTime).getTime();
  if (diffMs <= 0) return null;
  return roundToNearest15(diffMs / 60_000);
}

function attendeeLabel(a: CalEventAttendee): string {
  return a.displayName ?? a.email;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarHoverCard({ event: ev, onRsvp, children }: CalendarHoverCardProps) {
  const { toast } = useToast();
  const { openLogTime } = useAppContext();
  const [open, setOpen] = useState(false);

  const selfAttendee   = ev.attendees.find(a => a.self);
  const organizer      = ev.attendees.find(a => a.organizer);
  const otherAttendees = ev.attendees.filter(a => !a.self);

  const [rsvpStatus, setRsvpStatus] = useState<string>(
    selfAttendee?.responseStatus ?? "needsAction"
  );
  const [rsvping, setRsvping] = useState(false);

  async function handleRsvp(status: string) {
    if (status === rsvpStatus || rsvping) return;
    const prev = rsvpStatus;
    setRsvpStatus(status);
    setRsvping(true);
    try {
      const res = await fetch(`/api/calendar/events/${encodeURIComponent(ev.id)}/rsvp`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { responseStatus?: string };
      const confirmed = data.responseStatus ?? status;
      setRsvpStatus(confirmed);
      onRsvp?.(ev.id, confirmed);
      toast({ title: `RSVP updated — ${STATUS_CHIP[confirmed]?.label ?? confirmed}` });
    } catch {
      setRsvpStatus(prev);
      toast({ variant: "destructive", title: "Couldn't update RSVP", description: "Try again." });
    } finally {
      setRsvping(false);
    }
  }

  function handleLogTime() {
    setOpen(false);
    const minutes = getMeetingDuration(ev.start, ev.end);
    // SF record search is manual — open without a pre-selected record
    openLogTime(
      minutes !== null || ev.summary
        ? {
            // Dummy prefill so the modal opens in "notes pre-filled" mode without
            // a pre-selected SF record; user selects the record manually.
            sfObjectType:   "case",
            sfObjectId:     "",
            sfObjectName:   "",
            initialMinutes: minutes ?? undefined,
            initialNotes:   ev.summary,
          }
        : null
    );
  }

  const chipData = STATUS_CHIP[rsvpStatus] ?? STATUS_CHIP["needsAction"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="p-0 shadow-2xl border-2 border-primary/25 rounded-xl overflow-hidden bg-white"
        style={{ width: "360px", maxWidth: "calc(100vw - 32px)" }}
      >
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-primary to-primary/40" />

        {/* Header — title + time + location */}
        <div className="px-4 pt-3 pb-2.5 border-b border-border/40 space-y-1.5">
          <p className="text-sm font-semibold text-foreground leading-snug">{ev.summary}</p>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>{formatDateRange(ev.start, ev.end)}</span>
          </div>

          {ev.meetLink && (
            <a
              href={ev.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Video className="w-3 h-3" />
              Join Meet
            </a>
          )}

          {!ev.meetLink && ev.location && (
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span className="break-all">{ev.location}</span>
            </div>
          )}
        </div>

        {/* Organizer */}
        {organizer && (
          <div className="px-4 py-2.5 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Organizer
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-foreground/80 font-medium">{attendeeLabel(organizer)}</span>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Organizer</span>
            </div>
          </div>
        )}

        {/* Attendees */}
        {otherAttendees.length > 0 && (
          <div className="px-4 py-2.5 border-b border-border/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Attendees ({otherAttendees.length})
            </p>
            <ul className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {otherAttendees.map(a => {
                const chip = STATUS_CHIP[a.responseStatus ?? "needsAction"] ?? STATUS_CHIP["needsAction"];
                return (
                  <li key={a.email} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-foreground/80 truncate min-w-0">
                      {attendeeLabel(a)}
                      {a.organizer && (
                        <span className="ml-1 text-[10px] text-primary font-semibold">(Organizer)</span>
                      )}
                    </span>
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${chip.className}`}>
                      {chip.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Own RSVP */}
        {selfAttendee && (
          <div className="px-4 py-2.5 border-b border-border/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Your Response
              </p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${chipData.className}`}>
                {chipData.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {RSVP_BTNS.map(({ status, label, Icon, activeClass }) => {
                const isActive = rsvpStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => void handleRsvp(status)}
                    disabled={rsvping}
                    className={`
                      flex items-center justify-center gap-1 px-2 py-1.5 rounded-md
                      text-[11px] font-semibold transition-all disabled:opacity-60
                      ${isActive
                        ? `${activeClass} ring-2 ring-offset-1`
                        : "bg-muted/50 text-foreground/70 hover:bg-muted border border-border"}
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer — Log Time + Open in Calendar */}
        <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between gap-3">
          <button
            onClick={handleLogTime}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-semibold transition-colors"
            title="Log time for this meeting"
          >
            <Clock className="w-3 h-3" />
            Log Time
          </button>
          <a
            href={ev.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Open in Google Calendar
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
