import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  CalendarDays, Clock, Users, ExternalLink, AlertCircle,
  Brain, Zap, RefreshCw, CheckCircle2, Star,
} from 'lucide-react';
import { TERMS } from '@/config/terminology';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GCalDateTime { dateTime?: string; date?: string; }
interface GCalAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  self?: boolean;
  organizer?: boolean;
}
interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: GCalDateTime;
  end:   GCalDateTime;
  attendees: GCalAttendee[];
  htmlLink: string;
  isTrailTalk: boolean;
  isPendingResponse: boolean;
  attendeeCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseStart(ev: CalendarEvent): Date {
  const raw = ev.start.dateTime ?? ev.start.date;
  return raw ? new Date(raw) : new Date();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date): string {
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString())    return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeToStart(start: Date): string {
  const diffMs = start.getTime() - Date.now();
  if (diffMs < 0)              return 'In progress';
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0)  return `in ${days}d ${hours % 24}h`;
  if (hours > 0)  return `in ${hours}h ${mins % 60}m`;
  if (mins  > 0)  return `in ${mins}m`;
  return 'Starting now';
}

function isAllDay(ev: CalendarEvent): boolean { return !ev.start.dateTime; }

function attendeeStatus(status?: string): { cls: string; label: string } {
  switch (status) {
    case 'accepted':   return { cls: 'text-emerald-600', label: 'Accepted' };
    case 'declined':   return { cls: 'text-rose-600',    label: 'Declined' };
    case 'tentative':  return { cls: 'text-amber-600',   label: 'Tentative' };
    default:           return { cls: 'text-muted-foreground', label: 'Awaiting' };
  }
}

// ─── Penny prep state ─────────────────────────────────────────────────────────

interface PrepState { loading: boolean; reply: string | null; error: string | null; }

async function fetchPennyPrep(ev: CalendarEvent): Promise<string> {
  const start  = parseStart(ev);
  const people = ev.attendees
    .filter(a => !a.self && !a.organizer)
    .map(a => a.displayName ?? a.email)
    .slice(0, 5)
    .join(', ') || 'no external attendees';

  const query = `I have a meeting coming up: "${ev.summary}" on ${formatDate(start)} at ${formatTime(start)}.` +
    (ev.description ? ` Meeting description: ${ev.description.slice(0, 300)}.` : '') +
    (ev.location    ? ` Location: ${ev.location}.` : '') +
    ` Attendees: ${people}.` +
    ' Please give me a brief meeting prep note — key context, 2–3 suggested talking points, and anything I should bring or prepare. Keep it to 4–6 sentences.';

  const resp = await fetch('/api/penny/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context: 'Calendar Panel', role: 'admin' }),
  });
  const data = await resp.json() as { reply?: string; error?: string };
  if (!resp.ok || data.error) throw new Error(data.error ?? `${TERMS.aiAssistant} could not generate a prep brief.`);
  return data.reply!;
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ ev }: { ev: CalendarEvent }) {
  const start = parseStart(ev);
  const [prep, setPrep] = useState<PrepState>({ loading: false, reply: null, error: null });

  async function requestPrep() {
    setPrep({ loading: true, reply: null, error: null });
    try {
      const reply = await fetchPennyPrep(ev);
      setPrep({ loading: false, reply, error: null });
    } catch (e) {
      setPrep({ loading: false, reply: null, error: e instanceof Error ? e.message : 'Error' });
    }
  }

  const isAllDayEv = isAllDay(ev);
  const selfAttendee = ev.attendees.find(a => a.self);
  const { cls: statusCls, label: statusLabel } = attendeeStatus(selfAttendee?.responseStatus);

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${
      ev.isTrailTalk        ? 'border-violet-200 shadow-sm' :
      ev.isPendingResponse  ? 'border-amber-200' :
                              'border-border'
    }`}>
      {/* Trail Talk badge */}
      {ev.isTrailTalk && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border-b border-violet-200">
          <Star className="w-3 h-3 text-violet-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Trail Talk</span>
        </div>
      )}

      {/* Pending response banner */}
      {ev.isPendingResponse && !ev.isTrailTalk && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Response needed</span>
          </div>
          <a
            href={ev.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-amber-700 hover:underline flex items-center gap-1"
          >
            Open in Google Calendar <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Title + link */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-foreground leading-snug">{ev.summary}</p>
          <a
            href={ev.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            aria-label="Open in Google Calendar"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Time + countdown */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span>{formatDate(start)}{!isAllDayEv && ` · ${formatTime(start)}`}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <Clock className="w-3 h-3" />
            <span>{timeToStart(start)}</span>
          </div>
          {selfAttendee && (
            <span className={`text-[10px] font-medium ${statusCls}`}>{statusLabel}</span>
          )}
        </div>

        {/* Attendees */}
        {ev.attendeeCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{ev.attendeeCount} attendee{ev.attendeeCount !== 1 ? 's' : ''}</span>
            {ev.attendees.slice(0, 3).map(a => (
              <span key={a.email} className="bg-muted rounded-full px-1.5 py-0.5 text-[10px] truncate max-w-[90px]">
                {a.displayName ?? a.email.split('@')[0]}
              </span>
            ))}
            {ev.attendeeCount > 3 && <span className="text-[10px] text-muted-foreground">+{ev.attendeeCount - 3}</span>}
          </div>
        )}

        {/* Location */}
        {ev.location && (
          <p className="text-[11px] text-muted-foreground truncate">📍 {ev.location}</p>
        )}

        {/* Penny prep */}
        <div className="pt-1">
          {!prep.reply && !prep.loading && !prep.error && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void requestPrep()}
              className="h-7 text-[11px] text-primary border border-primary/20 hover:bg-primary/5 px-2.5 gap-1.5"
            >
              <Brain className="w-3 h-3" /> Get {TERMS.aiAssistant} prep brief
            </Button>
          )}

          {prep.loading && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Brain className="w-3 h-3 text-primary animate-pulse" />
              <span>{TERMS.aiAssistant} is preparing your brief…</span>
            </div>
          )}

          {prep.reply && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Brain className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{TERMS.aiAssistant} Prep Brief</span>
              </div>
              <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{prep.reply}</p>
              <button
                onClick={() => setPrep({ loading: false, reply: null, error: null })}
                className="text-[10px] text-muted-foreground hover:text-foreground mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {prep.error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-600">
              <AlertCircle className="w-3 h-3" />
              <span>{prep.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPanel() {
  const [events,    setEvents]    = useState<CalendarEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [, setTick] = useState(0); // forces countdown re-render every 30s

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/calendar/events');
      const data = await resp.json() as { events?: CalendarEvent[]; error?: string; fetchedAt?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? `HTTP ${resp.status}`);
      setEvents(data.events ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load calendar events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Tick every 30s to refresh countdowns
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const pending  = events.filter(e => e.isPendingResponse);
  const upcoming = events.filter(e => !e.isPendingResponse);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
              Collaboration · Google Calendar
            </p>
            <h1 className="text-base font-semibold text-foreground">Calendar Action Panel</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Upcoming events from your primary Google Calendar — live data
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading} className="h-8 gap-1.5 text-[12px]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <Zap className="w-3 h-3" />
            <span className="font-semibold">Live · Google Calendar API</span>
          </div>
          {fetchedAt && (
            <span className="text-[10px] text-muted-foreground">
              Updated {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {!loading && !error && (
            <span className="text-[10px] text-muted-foreground">{events.length} event{events.length !== 1 ? 's' : ''} in next 7 days</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-rose-800 mb-0.5">Could not load calendar</p>
              <p className="text-[12px] text-rose-700">{error}</p>
              <Button variant="ghost" size="sm" onClick={() => void load()} className="mt-2 h-7 text-[11px] text-rose-700">
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-border bg-white p-3 animate-pulse">
                <div className="h-3.5 bg-muted rounded w-2/3 mb-2" />
                <div className="h-2.5 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Needs response */}
        {!loading && !error && pending.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Needs Response ({pending.length})
              </p>
            </div>
            <div className="space-y-2">
              {pending.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          </div>
        )}

        {/* Upcoming events */}
        {!loading && !error && upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Upcoming — Next 7 Days
              </p>
            </div>
            <div className="space-y-2">
              {upcoming.map(ev => <EventCard key={ev.id} ev={ev} />)}
            </div>
          </div>
        )}

        {/* Zero state */}
        {!loading && !error && events.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">All clear for the next 7 days</p>
            <p className="text-[12px] text-muted-foreground">No upcoming events found in your primary Google Calendar.</p>
          </div>
        )}

        {/* Footer note */}
        {!loading && !error && events.length > 0 && (
          <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
            Read-only view — no calendar writes occur without your action in Google Calendar.{' '}
            {TERMS.aiAssistant} prep briefs are generated by Gemini 2.5 Flash.
          </p>
        )}

      </div>
    </ScrollArea>
  );
}
