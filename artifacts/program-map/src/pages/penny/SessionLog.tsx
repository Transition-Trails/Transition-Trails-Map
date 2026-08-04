import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock, Users, CalendarDays, RefreshCw, Plus, X,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2, Search,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionRecord {
  id: string;
  name: string;
  sessionType: string | null;
  sessionDate: string | null;
  coachName: string | null;
  learnerName: string | null;
  program: string | null;
  durationMinutes: number | null;
  notes: string | null;
  status: string | null;
  createdDate: string;
}

interface CreateForm {
  sessionType: string;
  sessionDate: string;
  coachName: string;
  learnerName: string;
  learnerId: string;
  program: string;
  durationMinutes: string;
  notes: string;
  status: string;
}

interface LearnerOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
}


// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { value: 'Office Hours',     label: 'Office Hours',     icon: Clock   },
  { value: 'Campfire Session', label: 'Campfire Session', icon: Users   },
  { value: 'Private Session',  label: 'Private Session',  icon: CalendarDays },
];

const STATUSES = ['Completed', 'No-Show', 'Rescheduled', 'Pending'];

const EMPTY_FORM: CreateForm = {
  sessionType: '',
  sessionDate: new Date().toISOString().slice(0, 10),
  coachName: '',
  learnerName: '',
  learnerId: '',
  program: '',
  durationMinutes: '',
  notes: '',
  status: 'Completed',
};

// ── Learner picker combobox ────────────────────────────────────────────────────

function LearnerPicker({
  value, learnerId, onChange,
}: {
  value: string;
  learnerId: string;
  onChange: (name: string, id: string, pennyTrail: string | null) => void;
}) {
  const [query, setQuery]       = useState(value);
  const [open, setOpen]         = useState(false);
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [loading, setLoading]   = useState(false);
  const wrapRef                 = useRef<HTMLDivElement>(null);

  // Fetch learners once on first focus
  const loaded = useRef(false);
  function ensureLoaded() {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    fetch('/api/penny/data/learners/directory')
      .then(r => r.ok ? r.json() as Promise<LearnerOption[]> : [])
      .then(data => setLearners(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim().length === 0
    ? learners.slice(0, 20)
    : learners.filter(l =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
        l.email.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);

  function select(l: LearnerOption) {
    const name = `${l.firstName} ${l.lastName}`.trim();
    setQuery(name);
    onChange(name, l.id, l.pennyTrail ?? null);
    setOpen(false);
  }

  function handleClear() {
    setQuery('');
    onChange('', '', null);
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Search learners…"
          className={`${inputCls} pl-8 pr-8`}
          onFocus={() => { ensureLoaded(); setOpen(true); }}
          onChange={e => { setQuery(e.target.value); onChange('', ''); setOpen(true); }}
        />
        {query && (
          <button type="button" onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Selected badge */}
      {learnerId && (
        <p className="text-[11px] text-[#2F6B3F] mt-0.5">✓ Linked to Salesforce record</p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-4 text-[13px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading learners…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-muted-foreground">No learners found</p>
          ) : filtered.map(l => (
            <button
              key={l.id}
              type="button"
              onMouseDown={() => select(l)}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
            >
              <p className="text-[13px] font-medium text-foreground">{l.firstName} {l.lastName}</p>
              {l.email && <p className="text-[11px] text-muted-foreground">{l.email}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(s: string | null): string {
  switch (s?.toLowerCase()) {
    case 'completed':   return 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]';
    case 'no-show':     return 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]';
    case 'rescheduled': return 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]';
    case 'pending':     return 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]';
    default:            return 'bg-muted text-muted-foreground border-border';
  }
}

function typeIcon(t: string | null) {
  if (t === 'Campfire Session') return Users;
  if (t === 'Private Session')  return CalendarDays;
  return Clock;
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: SessionRecord }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcon(session.sessionType);

  return (
    <div className="rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
      <button className="w-full text-left p-3.5" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-3">
          <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-foreground">
                {session.sessionType ?? 'Session'}
              </span>
              {session.status && (
                <span className={`text-[14px] font-bold border rounded-full px-1.5 py-0.5 ${statusColor(session.status)}`}>
                  {session.status}
                </span>
              )}
              {session.sessionDate && (
                <span className="text-[14px] text-muted-foreground">{formatDate(session.sessionDate)}</span>
              )}
              {session.durationMinutes && (
                <span className="text-[14px] text-muted-foreground/70">{session.durationMinutes} min</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[14px] text-muted-foreground">
              {session.learnerName && <span>{session.learnerName}</span>}
              {session.learnerName && session.coachName && <span className="text-muted-foreground/30">·</span>}
              {session.coachName && <span>Coach: {session.coachName}</span>}
              {session.program && <><span className="text-muted-foreground/30">·</span><span>{session.program}</span></>}
            </div>
          </div>
          <div className="text-muted-foreground/40 shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/20 space-y-2">
          {session.notes ? (
            <div>
              <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Notes</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{session.notes}</p>
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground/50 italic">No notes recorded.</p>
          )}
          <p className="text-[14px] text-muted-foreground/40">SF ID: {session.id} · Logged {formatDate(session.createdDate)}</p>
        </div>
      )}
    </div>
  );
}

// ── Log form ──────────────────────────────────────────────────────────────────

function LogForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sfError, setSfError] = useState<unknown>(null);

  function set(k: keyof CreateForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sessionType) { setError('Select a session type.'); return; }
    if (!form.sessionDate) { setError('Pick a session date.'); return; }
    setError(null);
    setSfError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/sessions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sessionType:     form.sessionType,
          sessionDate:     form.sessionDate,
          coachName:       form.coachName    || undefined,
          learnerName:     form.learnerName  || undefined,
          learnerId:       form.learnerId    || undefined,
          program:         form.program      || undefined,
          durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
          notes:           form.notes        || undefined,
          status:          form.status       || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string; detail?: unknown };
        setSfError(data.detail ?? null);
        setError(data.error ?? `Failed (${res.status})`);
        return;
      }
      setForm(EMPTY_FORM);
      onSuccess();
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Session type */}
      <div>
        <p className="text-[14px] font-bold  text-muted-foreground/60 mb-2">Session Type *</p>
        <div className="flex flex-wrap gap-2">
          {SESSION_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('sessionType', value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[14px] font-medium border transition-colors
                ${form.sessionType === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/40'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date + duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Date *</label>
          <input type="date" value={form.sessionDate} onChange={e => set('sessionDate', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Duration (min)</label>
          <input type="number" min="1" max="480" value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} placeholder="60" className={inputCls} />
        </div>
      </div>

      {/* Coach + learner */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Coach Name</label>
          <input value={form.coachName} onChange={e => set('coachName', e.target.value)} placeholder="e.g. Alex Rivera" className={inputCls} />
        </div>
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Learner Name</label>
          <LearnerPicker
            value={form.learnerName}
            learnerId={form.learnerId}
            onChange={(name, id, pennyTrail) =>
              setForm(f => ({
                ...f,
                learnerName: name,
                learnerId: id,
                // Auto-fill program from learner's trail, but only if program is still empty
                program: f.program || pennyTrail || '',
              }))
            }
          />
        </div>
      </div>

      {/* Program + status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Program</label>
          <div className={`w-full rounded-md border px-2.5 py-1.5 text-[14px] min-h-[34px] flex items-center ${
            form.program
              ? 'border-border bg-muted/30 text-foreground'
              : 'border-border/50 bg-muted/10 text-muted-foreground/40 italic'
          }`}>
            {form.program || 'Set by learner selection'}
          </div>
        </div>
        <div>
          <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Outcome</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[14px] font-bold  text-muted-foreground/60 mb-1 block">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={8}
          placeholder={`Key takeaways, next steps, observations…\n\nTip: Include what the learner shared, any blockers raised, goals for the next session, and any follow-up actions.`}
          className={`${inputCls} resize-y min-h-[120px]`}
        />
      </div>

      {/* Errors */}
      {error && (
        <div className="rounded-md border border-[#E8B9B4] bg-[#FBEAE6] p-3 space-y-1">
          <p className="text-[14px] text-[#A93F2F] font-medium">{error}</p>
          {sfError !== null && (
            <pre className="text-[14px] text-[#A93F2F]/80 whitespace-pre-wrap break-all font-mono">
              {typeof sfError === 'string' ? sfError : JSON.stringify(sfError, null, 2)}
            </pre>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        {saving ? 'Saving to Salesforce…' : 'Log Session'}
      </button>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SessionLog() {
  const [sessions, setSessions]   = useState<SessionRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [success, setSuccess]     = useState(false);

  const fetchSessions = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions?limit=50');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json() as { sessions: SessionRecord[]; total: number };
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  function handleSuccess() {
    setShowForm(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
    void fetchSessions(true);
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-4xl space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Session Log</h2>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              {loading ? 'Loading from Salesforce…' : `${sessions.length} sessions · ${total} total in Salesforce`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[14px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-md px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E6F0EA]0" />
              Salesforce · TT_Session_Log__c
            </span>
            <button
              onClick={() => void fetchSessions(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-[14px] border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-[14px] font-medium bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:bg-primary/90 transition-colors"
            >
              {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showForm ? 'Cancel' : 'Log Session'}
            </button>
          </div>
        </div>

        {/* Success banner */}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[14px] font-medium">Session logged successfully in Salesforce.</span>
          </div>
        )}

        {/* Log form */}
        {showForm && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[14px] font-bold  text-muted-foreground/60 mb-4">New Session</p>
            <LogForm onSuccess={handleSuccess} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse h-14" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#A93F2F] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] text-[#A93F2F] font-medium">{error}</p>
              <p className="text-[14px] text-[#A93F2F]/70 mt-0.5">
                Verify the SF service token has access to <code className="font-mono">TT_Session_Log__c</code>.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sessions.length === 0 && !showForm && (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center space-y-3">
            <CalendarDays className="w-7 h-7 text-muted-foreground/30 mx-auto" />
            <p className="text-[14px] font-medium text-muted-foreground">No sessions logged yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 text-[14px] font-medium bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Log your first session
            </button>
          </div>
        )}

        {/* Session list */}
        {!loading && !error && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map(s => <SessionRow key={s.id} session={s} />)}
            {sessions.length >= 50 && (
              <p className="text-center text-[14px] text-muted-foreground/60">
                Showing 50 most recent. Total in Salesforce: {total}.
              </p>
            )}
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
