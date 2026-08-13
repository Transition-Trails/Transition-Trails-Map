/**
 * TodayMeetingsCard
 *
 * Shows Google Calendar events that start today or this week. Extracts a
 * Google Meet join link from each event's location or description and surfaces
 * it as a "Join" button so staff can launch the meeting without leaving
 * Homebase.
 *
 * States: loading | unavailable | empty | list
 * View modes: today | this-week
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { CalendarDays, Loader2, Video, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { CalendarHoverCard } from "./CalendarHoverCard";

type ViewMode = "today" | "this-week";

// ── Types (mirrors CalendarEventOut from the API) ──────────────────────────────

interface GCalDateTime {
  dateTime?: string;
  date?: string;
}

interface GCalAttendee {
  email:          string;
  displayName?:   string;
  responseStatus?: "accepted" | "needsAction" | "declined" | "tentative";
  self?:          boolean;
  organizer?:     boolean;
}

interface CalEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: GCalDateTime;
  end: GCalDateTime;
  attendees: GCalAttendee[];
  htmlLink: string;
  /** Resolved server-side from conferenceData / hangoutLink. */
  meetLink: string | null;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEET_RE = /https:\/\/meet\.google\.com\/[^\s"'<>]+/i;

/**
 * Return the Meet join URL for an event.
 * Prefers the server-resolved meetLink; falls back to regex scanning
 * location/description for events with non-standard conferenceData.
 */
function getMeetLink(ev: CalEvent): string | null {
  if (ev.meetLink) return ev.meetLink;
  const candidates = [ev.location, ev.description].join(" ");
  const m = candidates.match(MEET_RE);
  return m ? m[0] : null;
}

function formatTime(dt: GCalDateTime): string {
  if (!dt.dateTime) return "All day";
  return new Date(dt.dateTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function isToday(dt: GCalDateTime): boolean {
  const str = dt.dateTime ?? dt.date;
  if (!str) return false;
  return isSameDay(new Date(str), new Date());
}

/** True if the event touches the current calendar week (Mon–Sun). */
function isThisWeek(ev: CalEvent): boolean {
  const now      = new Date();
  // Monday of current week at 00:00:00
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...
  const diffToMon = (dayOfWeek + 6) % 7;  // days since Monday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  // Sunday end of week at 23:59:59
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const startStr = ev.start.dateTime ?? ev.start.date ?? "";
  const endStr   = ev.end.dateTime   ?? ev.end.date   ?? "";
  if (!startStr) return false;

  const evStart = new Date(startStr);
  const evEnd   = endStr ? new Date(endStr) : evStart;
  // Event overlaps the week if it starts before weekEnd AND ends after weekStart
  return evStart <= weekEnd && evEnd >= weekStart;
}

/** Short label for the event date when showing the full-week view. */
function formatEventDate(dt: GCalDateTime): string {
  const str = dt.dateTime ?? dt.date;
  if (!str) return "";
  const d = new Date(str);
  if (isSameDay(d, new Date())) return "Today";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isHappeningNow(ev: CalEvent): boolean {
  if (!ev.start.dateTime || !ev.end.dateTime) return false;
  const now   = Date.now();
  const start = new Date(ev.start.dateTime).getTime();
  const end   = new Date(ev.end.dateTime).getTime();
  return now >= start && now <= end;
}

/** True if the event has already ended (entirely in the past). */
function isPast(ev: CalEvent): boolean {
  const endStr = ev.end.dateTime ?? ev.end.date;
  if (!endStr) return false;
  return new Date(endStr).getTime() < Date.now();
}
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Event row ─────────────────────────────────────────────────────────────────

function MeetingRow({ ev, showDate = false }: { ev: CalEvent; showDate?: boolean }) {
  const meetLink  = getMeetLink(ev);
  const now       = isHappeningNow(ev);
  const past      = !now && isPast(ev);
  const startTime = formatTime(ev.start);
  const endTime   = formatTime(ev.end);
  const dateLabel = showDate ? formatEventDate(ev.start) : null;
  const desc      = ev.description ? stripHtml(ev.description) : "";

  // Trim description to keep the card compact
  const shortDesc = desc.length > 100 ? desc.slice(0, 97) + "…" : desc;

  return (
    <li className={`py-3 border-b border-border/50 last:border-0 ${past ? "opacity-50" : ""}`}>
      <CalendarHoverCard event={ev}>
        {/* Clickable trigger area: time row + title + description */}
        <button className="w-full text-left space-y-1 focus:outline-none">
          {/* Date label (week view only) */}
          {dateLabel && (
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${
              dateLabel === "Today" ? "text-primary" : "text-muted-foreground/60"
            }`}>
              {dateLabel}
            </p>
          )}

          {/* Time row */}
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium ${now ? "text-emerald-600" : "text-muted-foreground"}`}>
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{startTime} – {endTime}</span>
              {now && (
                <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Now
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-foreground leading-snug">{ev.summary}</p>

          {/* Description */}
          {shortDesc && (
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {shortDesc}
            </p>
          )}
        </button>
      </CalendarHoverCard>

      {/* Action buttons — outside the popover trigger so they don't open the popover */}
      <div className="flex items-center gap-1 mt-1.5">
        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
              now
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
            title="Join Google Meet"
          >
            <Video className="w-3 h-3" />
            Join
          </a>
        )}
        <a
          href={ev.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Open in Google Calendar"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </li>
  );
}

// ── TodayMeetingsCard ─────────────────────────────────────────────────────────

export function TodayMeetingsCard() {
  const [allEvents,   setAllEvents]   = useState<CalEvent[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [viewMode,    setViewMode]    = useState<ViewMode>("today");

  const load = useCallback(async (mode: ViewMode) => {
    setLoading(true);
    setUnavailable(false);
    try {
      let url: string;
      if (mode === "this-week") {
        // ?week=true → server uses the calendar's configured timezone to compute
        // Mon 00:00 – Sun 23:59:59 so past meetings from earlier this week appear.
        url = "/api/calendar/events?week=true";
      } else {
        // Pass the browser's local midnight so the server starts from the correct
        // day boundary regardless of server timezone (UTC on Replit).
        const localMidnight = new Date();
        localMidnight.setHours(0, 0, 0, 0);
        url = `/api/calendar/events?from=${encodeURIComponent(localMidnight.toISOString())}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      const data = await res.json() as { events: CalEvent[] };
      // Store events returned by the API, sorted by start time.
      const sorted = (data.events ?? []).sort((a, b) => {
        const aTime = a.start.dateTime ?? a.start.date ?? "";
        const bTime = b.start.dateTime ?? b.start.date ?? "";
        return aTime.localeCompare(bTime);
      });
      setAllEvents(sorted);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(viewMode); }, [load, viewMode]);

  // Filter client-side based on active view mode.
  const events = useMemo(() => {
    if (viewMode === "today") {
      return allEvents.filter(ev => isToday(ev.start) || isToday(ev.end));
    }
    return allEvents.filter(ev => isThisWeek(ev));
  }, [allEvents, viewMode]);

  const title = viewMode === "today" ? "Today's Meetings" : "This Week";

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {!loading && !unavailable && events.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {events.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("today")}
              className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                viewMode === "today"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode("this-week")}
              className={`px-2 py-0.5 text-[11px] font-medium border-l border-border transition-colors ${
                viewMode === "this-week"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              This Week
            </button>
          </div>

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Calendar →
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-5">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : unavailable ? (
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar to see your meetings.
            </p>
            <a
              href="/admin/integrations/google-auth"
              className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              Connect Calendar
            </a>
          </div>
        ) : events.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {viewMode === "today" ? "No meetings today." : "No meetings this week."}
            </p>
            <a
              href="https://calendar.google.com/calendar/r/eventedit"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[12px] text-primary hover:text-primary/80 transition-colors"
            >
              + Schedule one
            </a>
          </div>
        ) : (
          <ul>
            {events.map(ev => (
              <MeetingRow key={ev.id} ev={ev} showDate={viewMode === "this-week"} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
