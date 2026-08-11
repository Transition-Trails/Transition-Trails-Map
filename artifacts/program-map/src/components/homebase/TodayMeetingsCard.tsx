/**
 * TodayMeetingsCard
 *
 * Shows Google Calendar events that start today. Extracts a Google Meet join
 * link from each event's location or description and surfaces it as a "Join"
 * button so staff can launch the meeting without leaving Homebase.
 *
 * States: loading | unavailable | empty | list
 */

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Loader2, Video, Clock, ExternalLink, RefreshCw } from "lucide-react";

// ── Types (mirrors CalendarEventOut from the API) ──────────────────────────────

interface GCalDateTime {
  dateTime?: string;
  date?: string;
}

interface CalEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: GCalDateTime;
  end: GCalDateTime;
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

function isToday(dt: GCalDateTime): boolean {
  const str = dt.dateTime ?? dt.date;
  if (!str) return false;
  const evDate  = new Date(str);
  const today   = new Date();
  return (
    evDate.getFullYear() === today.getFullYear() &&
    evDate.getMonth()    === today.getMonth()    &&
    evDate.getDate()     === today.getDate()
  );
}

function isHappeningNow(ev: CalEvent): boolean {
  if (!ev.start.dateTime || !ev.end.dateTime) return false;
  const now   = Date.now();
  const start = new Date(ev.start.dateTime).getTime();
  const end   = new Date(ev.end.dateTime).getTime();
  return now >= start && now <= end;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Event row ─────────────────────────────────────────────────────────────────

function MeetingRow({ ev }: { ev: CalEvent }) {
  const meetLink  = getMeetLink(ev);
  const now       = isHappeningNow(ev);
  const startTime = formatTime(ev.start);
  const endTime   = formatTime(ev.end);
  const desc      = ev.description ? stripHtml(ev.description) : "";

  // Trim description to keep the card compact
  const shortDesc = desc.length > 100 ? desc.slice(0, 97) + "…" : desc;

  return (
    <li className={`py-3 border-b border-border/50 last:border-0 ${now ? "opacity-100" : ""}`}>
      {/* Time row */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${now ? "text-emerald-600" : "text-muted-foreground"}`}>
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{startTime} – {endTime}</span>
          {now && (
            <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              Now
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
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
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug">{ev.summary}</p>

      {/* Description */}
      {shortDesc && (
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {shortDesc}
        </p>
      )}
    </li>
  );
}

// ── TodayMeetingsCard ─────────────────────────────────────────────────────────

export function TodayMeetingsCard() {
  const [events,      setEvents]      = useState<CalEvent[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const res = await fetch("/api/calendar/events");
      if (!res.ok) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      const data = await res.json() as { events: CalEvent[] };
      // Keep only events that start (or span) today, sorted by start time
      const todayEvents = (data.events ?? [])
        .filter(ev => isToday(ev.start) || isToday(ev.end))
        .sort((a, b) => {
          const aTime = a.start.dateTime ?? a.start.date ?? "";
          const bTime = b.start.dateTime ?? b.start.date ?? "";
          return aTime.localeCompare(bTime);
        });
      setEvents(todayEvents);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Today's Meetings</span>
          {!loading && !unavailable && events.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {events.length}
            </span>
          )}
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

      {/* Body */}
      <div className="px-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-5">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : unavailable ? (
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar to see today's meetings.
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
            <p className="text-sm text-muted-foreground">No meetings today.</p>
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
            {events.map(ev => <MeetingRow key={ev.id} ev={ev} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
