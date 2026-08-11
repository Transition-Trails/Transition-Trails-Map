/**
 * CalendarActionPanel — global calendar slide-over accessible from the Topbar.
 * Shows next 5 events with time-to-start countdowns, pending response flags,
 * Trail Talk badges, and inline Penny prep briefs.
 * Mounts in AppShell. Triggered via calendarPanelOpen in AppContext.
 */
import { useState, useEffect, useCallback } from 'react';
import { TERMS } from '@/config/terminology';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  X, CalendarDays, RefreshCw, AlertCircle, Clock, Users,
  ExternalLink, Brain, Zap, CheckCircle2, Star, ArrowRight,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { CalendarHoverCard } from '@/components/homebase/CalendarHoverCard';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GCalDateTime { dateTime?: string; date?: string; }
interface GCalAttendee {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "needsAction" | "declined" | "tentative";
  self?: boolean;
  organizer?: boolean;
}
interface CalEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: GCalDateTime;
  end:   GCalDateTime;
  attendees: GCalAttendee[];
  htmlLink: string;
  meetLink: string | null;
  status: string;
  isTrailTalk: boolean;
  isPendingResponse: boolean;
  attendeeCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseStart(ev: CalEvent): Date {
  const raw = ev.start.dateTime ?? ev.start.date;
  return raw ? new Date(raw) : new Date();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date): string {
  const today    = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
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
  if (days  > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  if (mins  > 0) return `in ${mins}m`;
  return 'Starting now';
}

function isStartingSoon(start: Date): boolean {
  const diffMs = start.getTime() - Date.now();
  return diffMs >= 0 && diffMs <= 15 * 60_000;
}

// ── Penny prep ────────────────────────────────────────────────────────────────

interface PrepState { loading: boolean; reply: string | null; error: string | null; }

async function fetchPennyPrep(ev: CalEvent): Promise<string> {
  const start  = parseStart(ev);
  const people = ev.attendees
    .filter(a => !a.self && !a.organizer)
    .map(a => a.displayName ?? a.email)
    .slice(0, 5)
    .join(', ') || 'no external attendees';

  const query =
    `I have a meeting coming up: "${ev.summary}" on ${formatDate(start)} at ${formatTime(start)}.` +
    (ev.description ? ` Meeting description: ${ev.description.slice(0, 300)}.` : '') +
    (ev.location    ? ` Location: ${ev.location}.` : '') +
    ` Attendees: ${people}.` +
    ' Please give me a brief meeting prep note — key context, 2–3 suggested talking points, and anything I should bring or prepare. Keep it to 4–6 sentences.';

  const resp = await fetch('/api/penny/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context: 'Calendar Action Panel', role: 'admin' }),
  });
  const data = await resp.json() as { reply?: string; error?: string };
  if (!resp.ok || data.error) throw new Error(data.error ?? `${TERMS.aiAssistant} could not generate a prep brief.`);
  return data.reply!;
}

// ── Compact Event Card ────────────────────────────────────────────────────────

interface EventCardProps {
  ev:      CalEvent;
  onRsvp?: (eventId: string, newStatus: string) => void;
}

function EventCard({ ev, onRsvp }: EventCardProps) {
  const start = parseStart(ev);
  const soon  = isStartingSoon(start);
  const [prep, setPrep] = useState<PrepState>({ loading: false, reply: null, error: null });
  const [pendingResponse, setPendingResponse] = useState(ev.isPendingResponse);

  function handleRsvp(eventId: string, newStatus: string) {
    // If the user accepted or declined, the event no longer needs a response
    if (newStatus === 'accepted' || newStatus === 'declined') {
      setPendingResponse(false);
    }
    onRsvp?.(eventId, newStatus);
  }

  async function requestPrep() {
    setPrep({ loading: true, reply: null, error: null });
    try {
      const reply = await fetchPennyPrep(ev);
      setPrep({ loading: false, reply, error: null });
    } catch (e) {
      setPrep({ loading: false, reply: null, error: e instanceof Error ? e.message : 'Error' });
    }
  }

  return (
    <div className={`rounded-lg border bg-card overflow-hidden ${
      ev.isTrailTalk   ? 'border-[#7FAFC6]' :
      pendingResponse  ? 'border-[#FFD08A]'  :
      soon             ? 'border-[#9FC3AE]' :
                         'border-border'
    }`}>

      {/* Trail Talk header */}
      {ev.isTrailTalk && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EDF5F8] border-b border-[#7FAFC6]">
          <Star className="w-2.5 h-2.5 text-[#2F6F7E]" />
          <span className="text-[14px] font-bold  text-[#2F6F7E]">Trail Talk</span>
        </div>
      )}

      {/* Pending response header */}
      {pendingResponse && !ev.isTrailTalk && (
        <div className="flex items-center justify-between px-3 py-1 bg-[#FFF3E0] border-b border-[#FFD08A]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-2.5 h-2.5 text-[#CC8400]" />
            <span className="text-[14px] font-bold  text-[#CC8400]">Response needed</span>
          </div>
          <span className="text-[14px] text-[#CC8400]/70 italic">click to respond</span>
        </div>
      )}

      {/* Starting soon banner */}
      {soon && !pendingResponse && !ev.isTrailTalk && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#E6F0EA] border-b border-[#9FC3AE]">
          <Zap className="w-2.5 h-2.5 text-[#2F6B3F]" />
          <span className="text-[14px] font-bold  text-[#2F6B3F]">Starting soon</span>
        </div>
      )}

      <CalendarHoverCard event={ev} onRsvp={handleRsvp}>
        <button className="w-full text-left p-3 space-y-1.5 focus:outline-none hover:bg-muted/30 transition-colors">

          {/* Title + open link */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-foreground leading-snug">{ev.summary}</p>
            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
          </div>

          {/* Date + countdown */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <CalendarDays className="w-2.5 h-2.5" />
              <span>{formatDate(start)}{ev.start.dateTime ? ` · ${formatTime(start)}` : ''}</span>
            </div>
            <div className={`flex items-center gap-1 text-[14px] font-semibold ${soon ? 'text-[#2F6B3F]' : 'text-primary'}`}>
              <Clock className="w-2.5 h-2.5" />
              <span>{timeToStart(start)}</span>
            </div>
          </div>

          {/* Attendees (compact) */}
          {ev.attendeeCount > 0 && (
            <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
              <Users className="w-2.5 h-2.5" />
              <span>{ev.attendeeCount}</span>
              {ev.attendees.slice(0, 2).map(a => (
                <span key={a.email} className="bg-muted rounded-full px-1.5 py-0.5 text-[14px] truncate max-w-[70px]">
                  {a.displayName ?? a.email.split('@')[0]}
                </span>
              ))}
              {ev.attendeeCount > 2 && (
                <span className="text-[14px] text-muted-foreground">+{ev.attendeeCount - 2}</span>
              )}
            </div>
          )}
        </button>
      </CalendarHoverCard>

      {/* Penny prep — outside the popover trigger */}
      <div className="px-3 pb-3 pt-0">
        {!prep.reply && !prep.loading && !prep.error && (
          <button
            onClick={() => void requestPrep()}
            className="flex items-center gap-1 text-[14px] text-primary border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
          >
            <Brain className="w-2.5 h-2.5" /> {TERMS.aiAssistant} prep brief
          </button>
        )}

        {prep.loading && (
          <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
            <Brain className="w-2.5 h-2.5 text-primary animate-pulse" />
            <span>Generating brief…</span>
          </div>
        )}

        {prep.reply && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1">
            <div className="flex items-center gap-1 mb-0.5">
              <Brain className="w-2.5 h-2.5 text-primary" />
              <span className="text-[14px] font-bold  text-primary">{TERMS.aiAssistant} Prep Brief</span>
            </div>
            <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">{prep.reply}</p>
            <button
              onClick={() => setPrep({ loading: false, reply: null, error: null })}
              className="text-[14px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {prep.error && (
          <div className="flex items-center gap-1 text-[14px] text-[#A93F2F]">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>{prep.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CalendarActionPanel ────────────────────────────────────────────────────────

export function CalendarActionPanel() {
  const { calendarPanelOpen, setCalendarPanelOpen } = useAppContext();
  const [, setLocation] = useLocation();

  const [events,    setEvents]    = useState<CalEvent[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [, setTick]               = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/calendar/events');
      const data = await resp.json() as { events?: CalEvent[]; error?: string; fetchedAt?: string };
      if (!resp.ok || data.error) throw new Error(data.error ?? `HTTP ${resp.status}`);
      setEvents((data.events ?? []).slice(0, 5));
      setFetchedAt(data.fetchedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load calendar events.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when panel opens
  useEffect(() => {
    if (calendarPanelOpen) void load();
  }, [calendarPanelOpen, load]);

  // Refresh countdown ticks every 30s while open
  useEffect(() => {
    if (!calendarPanelOpen) return undefined;
    const id = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, [calendarPanelOpen]);

  // When RSVP is confirmed, mark the event as no longer pending so the
  // section header count updates without a full reload.
  const handleRsvp = useCallback((eventId: string, newStatus: string) => {
    if (newStatus === 'accepted' || newStatus === 'declined') {
      setEvents(prev =>
        prev.map(e => e.id === eventId ? { ...e, isPendingResponse: false } : e)
      );
    }
  }, []);

  const pending  = events.filter(e => e.isPendingResponse);
  const upcoming = events.filter(e => !e.isPendingResponse);

  return (
    <AnimatePresence>
      {calendarPanelOpen && (
        <>
          {/* Scrim */}
          <motion.div
            key="cal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setCalendarPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="cal-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[400px] bg-card border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#E6F0EA] flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-3.5 h-3.5 text-[#2F6B3F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground leading-none">Calendar</p>
                  <p className="text-[14px] text-muted-foreground mt-0.5">
                    {loading
                      ? 'Loading…'
                      : error
                        ? 'Could not load events'
                        : `${events.length} event${events.length !== 1 ? 's' : ''} · next 7 days`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
                  <span className="font-semibold">Live</span>
                </div>

                <button
                  onClick={() => void load()}
                  disabled={loading}
                  title="Refresh calendar"
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => setCalendarPanelOpen(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Updated strip + full-view link */}
            {fetchedAt && !loading && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 flex-shrink-0">
                <span className="text-[14px] text-muted-foreground/60">
                  Updated {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => { setCalendarPanelOpen(false); setLocation('/collaboration/calendar-live'); }}
                  className="flex items-center gap-0.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  View full Calendar <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">

                {/* Loading skeleton */}
                {loading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="rounded-lg border border-border bg-card p-3 animate-pulse">
                        <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-2 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {!loading && error && (
                  <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[14px] font-semibold text-[#A93F2F]">Could not load calendar</p>
                        <p className="text-[14px] text-[#A93F2F] mt-0.5">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => void load()}
                      className="text-[14px] text-[#A93F2F] border border-[#E8B9B4] rounded-md px-2.5 py-1 hover:bg-[#FBEAE6] transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {/* Needs response section */}
                {!loading && !error && pending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-3 h-3 text-[#CC8400]" />
                      <p className="text-[14px] font-bold  text-[#CC8400]">
                        Needs Response ({pending.length})
                      </p>
                    </div>
                    <div className="space-y-2">
                      {pending.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={handleRsvp} />)}
                    </div>
                  </div>
                )}

                {/* Upcoming events section */}
                {!loading && !error && upcoming.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CalendarDays className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[14px] font-bold  text-muted-foreground/70">
                        Upcoming
                      </p>
                    </div>
                    <div className="space-y-2">
                      {upcoming.map(ev => <EventCard key={ev.id} ev={ev} onRsvp={handleRsvp} />)}
                    </div>
                  </div>
                )}

                {/* Zero state */}
                {!loading && !error && events.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center mt-4">
                    <CheckCircle2 className="w-7 h-7 text-[#2F6B3F] mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-foreground mb-1">All clear</p>
                    <p className="text-[14px] text-muted-foreground">No events in the next 7 days.</p>
                  </div>
                )}

              </div>
            </ScrollArea>

            {/* Footer */}
            {!loading && !error && events.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border flex-shrink-0 bg-muted/20">
                <p className="text-[14px] text-muted-foreground/50 text-center leading-snug">
                  Read-only · no calendar writes without your action · {TERMS.aiAssistant} prep by Gemini 2.5 Flash
                </p>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
