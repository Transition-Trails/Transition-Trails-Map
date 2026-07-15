import { useState, useMemo } from 'react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import {
  CalendarDays, CalendarCheck, CalendarClock, Settings, Shield, Activity, FlaskConical,
  CheckCircle, XCircle, AlertTriangle, Clock, ChevronRight, Users, Brain,
  Hash, MessageSquare, Layers, HardDrive, RefreshCw, Plus,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  CAL_VALIDATION_CHECKS, TRAIL_CALENDARS, CALENDAR_EVENTS,
  PROGRAM_EVENT_MAPPINGS, ROLE_PEOPLE_MAPPINGS, PENNY_SCHEDULING_CAPABILITIES,
  CAL_COMM_MAPPINGS, CAL_GOVERNANCE_ISSUES, CAL_TEST_SUITES, CAL_HEALTH_SCORES,
  getCalValidationSummary, getCalGovernanceSummary, getCalTestSummary,
  type CalValidationCheck, type TrailCalendar, type CalendarEvent,
  type RolePeopleMapping, type PennySchedulingCapability,
  type CalGovernanceIssue, type CalTestSuite,
} from '@/data/googleCalendarData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function CheckIcon({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status === 'fail')    return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (status === 'blocked') return <XCircle className="w-4 h-4 text-red-400 opacity-60" />;
  return <Clock className="w-4 h-4 text-zinc-400" />;
}

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'scheduled' ? 'bg-blue-500' : status === 'in-progress' ? 'bg-emerald-500' : status === 'recurring' ? 'bg-purple-500' : status === 'planning' ? 'bg-amber-400' : status === 'pending' ? 'bg-amber-300' : 'bg-zinc-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${c} mr-1.5`} />;
}

function ReadinessBadge({ r }: { r: string }) {
  const cls = r === 'Ready' ? 'bg-green-100 text-green-700 border-green-200' : r === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' : r === 'Not Ready' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${cls}`}>{r}</span>;
}

function SeverityBadge({ s }: { s: string }) {
  const cls = s === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' : s === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' : s === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${cls}`}>{s}</span>;
}

function CalTypeBadge({ t }: { t: string }) {
  const cls = t === 'Program' ? 'bg-blue-100 text-blue-700 border-blue-200' : t === 'Cohort' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : t === 'Coaching' ? 'bg-orange-100 text-orange-700 border-orange-200' : t === 'Executive' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : t === 'Client' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : t === 'Office Hours' ? 'bg-purple-100 text-purple-700 border-purple-200' : t === 'Assessment' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-muted text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${cls}`}>{t}</span>;
}

function EventTypeBadge({ t }: { t: string }) {
  const cls = t === 'Cohort Session' ? 'bg-blue-100 text-blue-700 border-blue-200' : t === 'Workshop' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : t === 'Coaching Session' ? 'bg-orange-100 text-orange-700 border-orange-200' : t === 'Office Hours' ? 'bg-purple-100 text-purple-700 border-purple-200' : t === 'Assessment Window' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : t === 'Leadership Review' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : t === 'Penny Reminder' ? 'bg-rose-100 text-rose-700 border-rose-200' : t === 'Weekly Brief' ? 'bg-amber-100 text-amber-700 border-amber-200' : t === 'Curriculum Deadline' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${cls}`}>{t}</span>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium w-36 shrink-0">{label}</span>
      <span className="text-[13px] text-foreground">{value}</span>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const valSummary  = getCalValidationSummary();
  const govSummary  = getCalGovernanceSummary();
  const testSummary = getCalTestSummary();
  const healthAvg   = Math.round(CAL_HEALTH_SCORES.reduce((s, h) => s + (h.score / h.maxScore) * 100, 0) / CAL_HEALTH_SCORES.length);

  const programCohortCount = TRAIL_CALENDARS.filter(c => c.calendarType === 'Program' || c.calendarType === 'Cohort').length;
  const specializedCount   = TRAIL_CALENDARS.length - programCohortCount;
  const eventTypeCount     = new Set(CALENDAR_EVENTS.map(e => e.eventType)).size;
  const recurringCount     = CALENDAR_EVENTS.filter(e => e.status === 'recurring').length;
  const prototypeCapCount  = PENNY_SCHEDULING_CAPABILITIES.filter(c => c.status === 'Prototype').length;
  const plannedCapCount    = PENNY_SCHEDULING_CAPABILITIES.filter(c => c.status === 'Planned').length;

  const stats = [
    { label:'Calendars Registered', value:`${TRAIL_CALENDARS.length}`,                    sub:`${programCohortCount} program/cohort · ${specializedCount} specialized`, icon:CalendarDays,  color:'text-blue-600' },
    { label:'Events Catalogued',    value:`${CALENDAR_EVENTS.length}`,                    sub:`${eventTypeCount} types · ${recurringCount} recurring`,                  icon:CalendarCheck, color:'text-emerald-600' },
    { label:'Penny Capabilities',   value:`${PENNY_SCHEDULING_CAPABILITIES.length}`,      sub:`${prototypeCapCount} prototype · ${plannedCapCount} planned`,            icon:Brain,         color:'text-purple-500' },
    { label:'Calendar Readiness',   value:`${healthAvg}%`, sub:`${testSummary.pass}/${testSummary.total} tests passing`,                                               icon:Activity,      color:'text-amber-500' },
  ];

  const criticals = CAL_GOVERNANCE_ISSUES.filter(i => i.severity === 'Critical' && i.status !== 'Resolved');

  const readinessAreas = [
    { label:'Account & Credentials',       score: CAL_HEALTH_SCORES.find(h => h.dimension === 'credentials')?.score       ?? 0, max:10 },
    { label:'Calendar Access',             score: CAL_HEALTH_SCORES.find(h => h.dimension === 'calendar-access')?.score   ?? 0, max:10 },
    { label:'Event Readiness',             score: CAL_HEALTH_SCORES.find(h => h.dimension === 'event-readiness')?.score   ?? 0, max:10 },
    { label:'Role & People Mapping',       score: CAL_HEALTH_SCORES.find(h => h.dimension === 'role-mapping')?.score      ?? 0, max:10 },
    { label:'Penny Scheduling',            score: CAL_HEALTH_SCORES.find(h => h.dimension === 'penny-readiness')?.score   ?? 0, max:10 },
    { label:'Communication Mapping',       score: CAL_HEALTH_SCORES.find(h => h.dimension === 'comm-mapping')?.score      ?? 0, max:10 },
    { label:'Governance',                  score: CAL_HEALTH_SCORES.find(h => h.dimension === 'governance')?.score        ?? 0, max:10 },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
            <s.icon className={`w-8 h-8 ${s.color} opacity-80`} />
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-[11px] font-medium text-muted-foreground">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/70">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {criticals.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wide text-red-600 font-semibold mb-2">Critical Blockers</div>
          {criticals.map(c => (
            <div key={c.id} className="flex gap-2 items-start mb-2 last:mb-0">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] font-medium text-red-800">{c.title}</div>
                <div className="text-[11px] text-red-600">{c.resolution}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">Integration Readiness by Area</div>
        <div className="space-y-2">
          {readinessAreas.map(a => {
            const pct = Math.round((a.score / a.max) * 100);
            const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
            return (
              <div key={a.label} className="flex items-center gap-3">
                <div className="text-[12px] text-foreground w-48 shrink-0">{a.label}</div>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all`} style={{ width:`${pct}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Validation Status</div>
          <div className="grid grid-cols-4 gap-2">
            {[{ l:'Pass', v: valSummary.pass, c:'text-green-600' },{ l:'Fail', v: valSummary.fail, c:'text-red-500' },{ l:'Warning', v: valSummary.warning, c:'text-amber-500' },{ l:'Pending', v: valSummary.pending, c:'text-zinc-400' }].map(s => (
              <div key={s.l} className="text-center">
                <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Go-Live Blockers</div>
          <div className="text-[12px] text-foreground space-y-1">
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_CLIENT_ID not configured</span></div>
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_CLIENT_SECRET not configured</span></div>
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_CALENDAR_REFRESH_TOKEN missing</span></div>
            <div className="flex gap-2 items-center"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span>6 of 11 calendars not connected</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Account Config Tab ────────────────────────────────────────────────────────

function AccountConfigTab() {
  const [selected, setSelected] = useState<CalValidationCheck | null>(CAL_VALIDATION_CHECKS[0]);
  const summary = getCalValidationSummary();
  const categories = ['Credentials', 'OAuth', 'Scopes', 'Calendar Access', 'Permissions'] as const;

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Validation Checks</div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[{ l:'Pass', v:summary.pass, c:'text-green-600' },{ l:'Fail', v:summary.fail, c:'text-red-500' },{ l:'Warn', v:summary.warning, c:'text-amber-500' },{ l:'Pend', v:summary.pending, c:'text-zinc-400' }].map(s => (
              <div key={s.l}><div className={`text-base font-bold ${s.c}`}>{s.v}</div><div className="text-[9px] uppercase text-muted-foreground">{s.l}</div></div>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {categories.map(cat => {
            const checks = CAL_VALIDATION_CHECKS.filter(c => c.category === cat);
            if (!checks.length) return null;
            return (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold bg-muted/30 border-b border-border">{cat}</div>
                {checks.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected?.id === c.id ? 'bg-primary text-primary-foreground' : ''}`}>
                    <CheckIcon status={c.status} />
                    <span className={`text-[12px] font-medium line-clamp-2 ${selected?.id === c.id ? 'text-primary-foreground' : 'text-foreground'}`}>{c.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </ScrollArea>
      </div>
      <div className="flex-1 p-4">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckIcon status={selected.status} />
              <div>
                <div className="text-[16px] font-semibold text-foreground">{selected.label}</div>
                <div className="text-[11px] text-muted-foreground">{selected.category} · {selected.status.toUpperCase()}</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
              <InfoRow label="Status"     value={<CheckIcon status={selected.status} />} />
              <InfoRow label="Category"   value={selected.category} />
              <InfoRow label="Detail"     value={<span className="text-[12px]">{selected.detail}</span>} />
              <InfoRow label="Impact"     value={<span className="text-[12px] text-amber-700">{selected.impact}</span>} />
              {selected.fix && <InfoRow label="Resolution" value={<span className="text-[12px] text-green-700">{selected.fix}</span>} />}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">Select a check to view details</div>
        )}
      </div>
    </div>
  );
}

// ── Calendar Registry Tab ─────────────────────────────────────────────────────

function CalendarRegistryTab() {
  const items = useMemo<WorkspaceItem[]>(() => TRAIL_CALENDARS.map(c => ({
    id: c.id,
    name: c.name,
    typeName: c.calendarType,
    typeColor: c.calendarType === 'Program' ? 'text-blue-700' : c.calendarType === 'Cohort' ? 'text-indigo-700' : c.calendarType === 'Coaching' ? 'text-orange-700' : c.calendarType === 'Executive' ? 'text-zinc-600' : c.calendarType === 'Client' ? 'text-emerald-700' : c.calendarType === 'Office Hours' ? 'text-purple-700' : 'text-cyan-700',
    typeBg:    c.calendarType === 'Program' ? 'bg-blue-50' : c.calendarType === 'Cohort' ? 'bg-indigo-50' : c.calendarType === 'Coaching' ? 'bg-orange-50' : c.calendarType === 'Executive' ? 'bg-zinc-100' : c.calendarType === 'Client' ? 'bg-emerald-50' : c.calendarType === 'Office Hours' ? 'bg-purple-50' : 'bg-cyan-50',
    status: c.status,
    health: c.readiness === 'Ready' ? 'healthy' : c.readiness === 'Partial' ? 'needs-attention' : 'incomplete',
    secondary: c.owner,
    owner: c.owner,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    {
      id: 'profile',
      label: 'Profile',
      render: (item) => {
        const cal = TRAIL_CALENDARS.find(c => c.id === item.id);
        if (!cal) return null;
        return (
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2 mb-1">
              <CalTypeBadge t={cal.calendarType} />
              <ReadinessBadge r={cal.readiness} />
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
              <InfoRow label="Purpose"    value={<span className="text-[12px]">{cal.purpose}</span>} />
              <InfoRow label="Owner"      value={cal.owner} />
              <InfoRow label="Visibility" value={cal.visibility} />
              <InfoRow label="Status"     value={<><StatusDot status={cal.status} />{cal.status}</>} />
              <InfoRow label="Events"     value={`${cal.activeEventCount} active · ${cal.eventCount} total`} />
              <InfoRow label="Programs"   value={cal.programIds.length > 0 ? cal.programIds.join(', ') : 'Cross-program'} />
              <InfoRow label="Calendar ID" value={cal.googleCalendarId ? <span className="font-mono text-[11px]">{cal.googleCalendarId}</span> : <span className="text-amber-600">Not yet connected</span>} />
            </div>
            {cal.subCalendars && cal.subCalendars.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Sub-Calendars</div>
                <div className="flex flex-wrap gap-1.5">
                  {cal.subCalendars.map(sc => <span key={sc} className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">{sc}</span>)}
                </div>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">{cal.notes}</div>
          </div>
        );
      },
    },
    {
      id: 'events',
      label: 'Events',
      render: (item) => {
        const cal = TRAIL_CALENDARS.find(c => c.id === item.id);
        if (!cal) return null;
        const events = CALENDAR_EVENTS.filter(e => e.calendarId === cal.id);
        return (
          <div className="p-1 space-y-2">
            {events.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">No catalogued events for this calendar.</div>
            ) : (
              events.map(e => (
                <div key={e.id} className="bg-card border border-border rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={e.status} />
                    <span className="text-[12px] font-medium text-foreground">{e.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EventTypeBadge t={e.eventType} />
                    <span className="text-[11px] text-muted-foreground">{e.frequency} · {e.duration}</span>
                    {e.pennyEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">Penny</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      },
    },
  ], []);

  return <ObjectWorkspace icon={CalendarDays} items={items} tabs={tabs} />;
}

// ── Event Catalog Tab ─────────────────────────────────────────────────────────

function EventCatalogTab() {
  const items = useMemo<WorkspaceItem[]>(() => CALENDAR_EVENTS.map(e => ({
    id: e.id,
    name: e.title,
    typeName: e.eventType,
    typeColor: e.eventType === 'Cohort Session' ? 'text-blue-700' : e.eventType === 'Workshop' ? 'text-indigo-700' : e.eventType === 'Coaching Session' ? 'text-orange-700' : e.eventType === 'Penny Reminder' ? 'text-rose-700' : e.eventType === 'Leadership Review' ? 'text-zinc-600' : 'text-muted-foreground',
    typeBg:    e.eventType === 'Cohort Session' ? 'bg-blue-50' : e.eventType === 'Workshop' ? 'bg-indigo-50' : e.eventType === 'Coaching Session' ? 'bg-orange-50' : e.eventType === 'Penny Reminder' ? 'bg-rose-50' : 'bg-muted',
    status: e.status,
    health: e.status === 'scheduled' ? 'healthy' : e.status === 'in-progress' ? 'healthy' : e.status === 'recurring' ? 'healthy' : e.status === 'pending' ? 'needs-attention' : 'incomplete',
    secondary: e.programName,
    owner: e.attendeeRoles[0],
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    {
      id: 'profile',
      label: 'Profile',
      render: (item) => {
        const ev = CALENDAR_EVENTS.find(e => e.id === item.id);
        if (!ev) return null;
        return (
          <div className="space-y-3 p-1">
            <div className="flex items-center gap-2">
              <EventTypeBadge t={ev.eventType} />
              {ev.pennyEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-semibold uppercase">Penny Enabled</span>}
            </div>
            <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
              <InfoRow label="Program"     value={ev.programName} />
              <InfoRow label="Calendar"    value={ev.calendarName} />
              {ev.cohort  && <InfoRow label="Cohort"  value={ev.cohort} />}
              {ev.sprint  && <InfoRow label="Sprint"  value={ev.sprint} />}
              <InfoRow label="Status"      value={<><StatusDot status={ev.status} />{ev.status}</>} />
              <InfoRow label="Frequency"   value={ev.frequency} />
              <InfoRow label="Duration"    value={ev.duration} />
              <InfoRow label="Timezone"    value={ev.timezone} />
              <InfoRow label="Attendees"   value={`${ev.attendeeCount} · ${ev.attendeeRoles.join(', ')}`} />
              <InfoRow label="Next"        value={ev.nextOccurrence} />
              {ev.slackChannel   && <InfoRow label="Slack Channel"  value={<span className="font-mono text-[11px]">{ev.slackChannel}</span>} />}
              {ev.driveResourceId && <InfoRow label="Drive Resource" value={<span className="font-mono text-[11px]">{ev.driveResourceId}</span>} />}
            </div>
            <div className="text-[11px] text-muted-foreground">{ev.notes}</div>
          </div>
        );
      },
    },
    {
      id: 'objects',
      label: 'Object Links',
      render: (item) => {
        const ev = CALENDAR_EVENTS.find(e => e.id === item.id);
        if (!ev) return null;
        const mapping = PROGRAM_EVENT_MAPPINGS
          .flatMap(m => m.events)
          .find(e => e.eventId === ev.id);
        return (
          <div className="p-1 space-y-3">
            {mapping ? (
              <>
                {mapping.sprintLink          && <div><span className="text-[11px] text-muted-foreground font-medium">Sprint: </span><span className="text-[12px]">{mapping.sprintLink}</span></div>}
                {mapping.moduleLink          && <div><span className="text-[11px] text-muted-foreground font-medium">Module: </span><span className="text-[12px]">{mapping.moduleLink}</span></div>}
                {mapping.assessmentLink      && <div><span className="text-[11px] text-muted-foreground font-medium">Assessment: </span><span className="text-[12px]">{mapping.assessmentLink}</span></div>}
                {mapping.salesforceObjectLink && <div><span className="text-[11px] text-muted-foreground font-medium">Salesforce: </span><span className="text-[12px]">{mapping.salesforceObjectLink}</span></div>}
                {mapping.driveResourceLink   && <div><span className="text-[11px] text-muted-foreground font-medium">Drive: </span><span className="text-[12px]">{mapping.driveResourceLink}</span></div>}
                {mapping.pennyCapabilityLink && <div><span className="text-[11px] text-muted-foreground font-medium">Penny Capability: </span><span className="text-[12px] text-purple-700">{mapping.pennyCapabilityLink}</span></div>}
                {mapping.promptTemplateLink  && <div><span className="text-[11px] text-muted-foreground font-medium">Prompt Template: </span><span className="text-[12px]">{mapping.promptTemplateLink}</span></div>}
                {mapping.slackChannelLink    && <div><span className="text-[11px] text-muted-foreground font-medium">Slack: </span><span className="font-mono text-[12px]">{mapping.slackChannelLink}</span></div>}
                {mapping.people && mapping.people.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">People</div>
                    <div className="flex flex-wrap gap-1.5">
                      {mapping.people.map(p => <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-muted border border-border text-muted-foreground">{p}</span>)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[12px] text-muted-foreground">No detailed object mappings defined for this event.</div>
            )}
          </div>
        );
      },
    },
  ], []);

  return <ObjectWorkspace icon={CalendarCheck} items={items} tabs={tabs} />;
}

// ── Program & Cohort Mapping Tab ──────────────────────────────────────────────

function ProgramCohortMappingTab() {
  const [selectedProgramId, setSelectedProgramId] = useState(PROGRAM_EVENT_MAPPINGS[0].programId);
  const [selectedEventId,   setSelectedEventId]   = useState(PROGRAM_EVENT_MAPPINGS[0].events[0]?.eventId ?? '');

  const program = PROGRAM_EVENT_MAPPINGS.find(m => m.programId === selectedProgramId);
  const event   = program?.events.find(e => e.eventId === selectedEventId);
  const eventFull = CALENDAR_EVENTS.find(e => e.id === selectedEventId);

  return (
    <div className="flex h-full">
      <div className="w-52 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Programs</div>
        <div className="flex-1 overflow-auto">
          {PROGRAM_EVENT_MAPPINGS.map(m => (
            <button key={m.programId} onClick={() => { setSelectedProgramId(m.programId); setSelectedEventId(m.events[0]?.eventId ?? ''); }}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selectedProgramId === m.programId ? 'bg-primary text-primary-foreground' : ''}`}>
              <div>
                <div className={`text-[12px] font-semibold ${selectedProgramId === m.programId ? 'text-primary-foreground' : 'text-foreground'}`}>{m.programName}</div>
                <div className={`text-[11px] ${selectedProgramId === m.programId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{m.events.length} events · {m.calendarIds.length} calendars</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {program && (
        <div className="w-56 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Events</div>
          <ScrollArea className="flex-1">
            {program.events.map(e => {
              const full = CALENDAR_EVENTS.find(ev => ev.id === e.eventId);
              return (
                <button key={e.eventId} onClick={() => setSelectedEventId(e.eventId)}
                  className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selectedEventId === e.eventId ? 'bg-accent' : ''}`}>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-foreground line-clamp-2">{e.eventTitle}</div>
                    <EventTypeBadge t={e.eventType} />
                    {full && <div className="text-[10px] text-muted-foreground mt-0.5">{full.frequency}</div>}
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>
      )}
      <ScrollArea className="flex-1 p-4">
        {event && eventFull ? (
          <div className="space-y-3">
            <div>
              <div className="text-[14px] font-semibold text-foreground">{eventFull.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <EventTypeBadge t={eventFull.eventType} />
                {eventFull.pennyEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">Penny</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              {event.sprintLink          && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Sprint</span><span className="text-[12px] text-foreground">{event.sprintLink}</span></div>}
              {event.moduleLink          && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Module</span><span className="text-[12px] text-foreground">{event.moduleLink}</span></div>}
              {event.assessmentLink      && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Assessment</span><span className="text-[12px] text-foreground">{event.assessmentLink}</span></div>}
              {event.salesforceObjectLink && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Salesforce</span><span className="text-[12px] text-foreground">{event.salesforceObjectLink}</span></div>}
              {event.driveResourceLink   && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Drive Resource</span><span className="text-[12px] text-foreground">{event.driveResourceLink}</span></div>}
              {event.slackChannelLink    && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Slack Channel</span><span className="font-mono text-[12px] text-foreground">{event.slackChannelLink}</span></div>}
              {event.pennyCapabilityLink && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Penny Cap.</span><span className="text-[12px] text-purple-700">{event.pennyCapabilityLink}</span></div>}
              {event.promptTemplateLink  && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Prompt Template</span><span className="text-[12px] text-foreground">{event.promptTemplateLink}</span></div>}
              {event.chatSpaceLink       && <div className="flex gap-2"><span className="text-[11px] text-muted-foreground w-28">Chat Space</span><span className="text-[12px] text-foreground">{event.chatSpaceLink}</span></div>}
            </div>
            {event.people && event.people.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">People</div>
                <div className="flex flex-wrap gap-1.5">
                  {event.people.map(p => <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-muted border border-border">{p}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">Select a program and event</div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Role & People Mapping Tab ─────────────────────────────────────────────────

function RolePeopleMappingTab() {
  const [selected, setSelected] = useState<RolePeopleMapping>(ROLE_PEOPLE_MAPPINGS[0]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {ROLE_PEOPLE_MAPPINGS.length} roles · {ROLE_PEOPLE_MAPPINGS.reduce((s, r) => s + r.peopleCount, 0)} people
        </div>
        <ScrollArea className="flex-1">
          {ROLE_PEOPLE_MAPPINGS.map(r => (
            <button key={r.roleId} onClick={() => setSelected(r)}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.roleId === r.roleId ? 'bg-primary text-primary-foreground' : ''}`}>
              <Users className={`w-4 h-4 shrink-0 mt-0.5 ${selected.roleId === r.roleId ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              <div className="min-w-0">
                <div className={`text-[12px] font-semibold ${selected.roleId === r.roleId ? 'text-primary-foreground' : 'text-foreground'}`}>{r.roleName}</div>
                <div className={`text-[11px] ${selected.roleId === r.roleId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{r.peopleCount} people · {r.pennyPersona}</div>
                <div className={`text-[10px] mt-0.5 ${selected.roleId === r.roleId ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{r.eventTypes.length} event types</div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-[15px] font-semibold text-foreground">{selected.roleName}</div>
              <div className="text-[12px] text-muted-foreground">Penny Persona: <span className="font-medium text-foreground">{selected.pennyPersona}</span> · {selected.peopleCount} people</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label:'Event Types', items: selected.eventTypes },{ label:'Owns', items: selected.ownership }].map(g => (
              <div key={g.label} className="bg-card border border-border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">{g.label}</div>
                {g.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map(i => <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-muted border border-border text-muted-foreground">{i}</span>)}
                  </div>
                ) : <div className="text-[11px] text-muted-foreground/60">None</div>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label:'Attends', items: selected.attendance },{ label:'Facilitates', items: selected.facilitation }].map(g => (
              <div key={g.label} className="bg-card border border-border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">{g.label}</div>
                {g.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map(i => <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-muted border border-border text-muted-foreground">{i}</span>)}
                  </div>
                ) : <div className="text-[11px] text-muted-foreground/60">None</div>}
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Penny Reminder Types</div>
            {selected.reminderTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selected.reminderTypes.map(r => <span key={r} className="px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200">{r}</span>)}
              </div>
            ) : <div className="text-[11px] text-muted-foreground/60">No reminders configured</div>}
          </div>
          {selected.dependencies.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">System Dependencies</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.dependencies.map(d => <span key={d} className="px-2 py-0.5 rounded text-[11px] bg-muted border border-border font-mono text-muted-foreground">{d}</span>)}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Penny Scheduling Readiness Tab ────────────────────────────────────────────

function PennySchedulingTab() {
  const [selected, setSelected] = useState<PennySchedulingCapability>(PENNY_SCHEDULING_CAPABILITIES[0]);

  const triggerColor = (t: string) => t === 'Pre-event' ? 'bg-blue-100 text-blue-700 border-blue-200' : t === 'Post-event' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : t === 'Reminder' ? 'bg-purple-100 text-purple-700 border-purple-200' : t === 'Follow-up' ? 'bg-orange-100 text-orange-700 border-orange-200' : t === 'Digest' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {PENNY_SCHEDULING_CAPABILITIES.length} scheduling capabilities
        </div>
        <ScrollArea className="flex-1">
          {PENNY_SCHEDULING_CAPABILITIES.map(cap => (
            <button key={cap.capabilityId} onClick={() => setSelected(cap)}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.capabilityId === cap.capabilityId ? 'bg-primary text-primary-foreground' : ''}`}>
              <Brain className={`w-4 h-4 shrink-0 mt-0.5 ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground' : 'text-purple-500'}`} />
              <div className="min-w-0">
                <div className={`text-[12px] font-semibold truncate ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground' : 'text-foreground'}`}>{cap.capabilityName}</div>
                <div className={`text-[11px] ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{cap.triggerType} · {cap.status}</div>
                <div className="mt-0.5"><ReadinessBadge r={cap.readiness} /></div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <div className="text-[15px] font-semibold text-foreground">{selected.capabilityName}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${triggerColor(selected.triggerType)}`}>{selected.triggerType}</span>
                <ReadinessBadge r={selected.readiness} />
                <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase bg-muted border-border text-muted-foreground">{selected.status}</span>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
            <InfoRow label="Domain"       value={selected.schedulingDomain} />
            <InfoRow label="Trigger"      value={selected.triggerOffset} />
            <InfoRow label="Target Roles" value={selected.targetRoles.join(', ')} />
            <InfoRow label="Event Types"  value={selected.targetEventTypes.join(', ')} />
            {selected.slackDelivery  && <InfoRow label="Slack Delivery" value={<span className="font-mono text-[11px]">{selected.slackDelivery}</span>} />}
            {selected.driveSource    && <InfoRow label="Drive Source"   value={selected.driveSource} />}
          </div>
          {selected.blockReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-wide text-amber-600 font-semibold mb-1">Blocker</div>
              <div className="text-[12px] text-amber-800">{selected.blockReason}</div>
            </div>
          )}
          <div className="bg-muted/30 border border-border rounded-lg p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Example Output</div>
            <div className="text-[12px] text-foreground font-mono bg-card border border-border rounded p-2.5">{selected.exampleOutput}</div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Communications Mapping Tab ────────────────────────────────────────────────

function CommMappingTab() {
  const [selectedCalId, setSelectedCalId] = useState(CAL_COMM_MAPPINGS[0].calendarId);
  const mapping = CAL_COMM_MAPPINGS.find(m => m.calendarId === selectedCalId);

  const statusColor = (s: string) => s === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : s === 'Planned' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {CAL_COMM_MAPPINGS.length} calendars mapped
        </div>
        <ScrollArea className="flex-1">
          {CAL_COMM_MAPPINGS.map(m => {
            const cal = TRAIL_CALENDARS.find(c => c.id === m.calendarId);
            const channels = m.slackChannels.length + m.chatSpaces.length;
            return (
              <button key={m.calendarId} onClick={() => setSelectedCalId(m.calendarId)}
                className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selectedCalId === m.calendarId ? 'bg-primary text-primary-foreground' : ''}`}>
                <CalendarDays className={`w-4 h-4 shrink-0 mt-0.5 ${selectedCalId === m.calendarId ? 'text-primary-foreground' : 'text-blue-500'}`} />
                <div className="min-w-0">
                  <div className={`text-[12px] font-semibold truncate ${selectedCalId === m.calendarId ? 'text-primary-foreground' : 'text-foreground'}`}>{m.calendarName}</div>
                  <div className={`text-[11px] ${selectedCalId === m.calendarId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{channels} channel{channels !== 1 ? 's' : ''} linked</div>
                  {cal && <CalTypeBadge t={cal.calendarType} />}
                </div>
              </button>
            );
          })}
        </ScrollArea>
        <div className="p-3 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
          {TRAIL_CALENDARS.length - CAL_COMM_MAPPINGS.length} calendars have no channel mappings
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        {mapping ? (
          <div className="space-y-4">
            <div className="text-[15px] font-semibold text-foreground">{mapping.calendarName}</div>
            {mapping.slackChannels.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Slack Channels ({mapping.slackChannels.length})</div>
                {mapping.slackChannels.map((ch, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-[13px] font-medium text-foreground">{ch.channel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ch.pennyEnabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">Penny</span>}
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${statusColor(ch.status)}`}>{ch.status}</span>
                      </div>
                    </div>
                    <div className="text-[12px] text-muted-foreground mb-1.5">{ch.purpose}</div>
                    <div className="flex flex-wrap gap-1">
                      {ch.eventTypes.map(et => <EventTypeBadge key={et} t={et} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {mapping.chatSpaces.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Google Chat Spaces ({mapping.chatSpaces.length})</div>
                {mapping.chatSpaces.map((sp, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[13px] font-medium text-foreground">{sp.channel}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${statusColor(sp.status)}`}>{sp.status}</span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">{sp.purpose}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">Select a calendar to view communication mappings</div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Governance Tab ────────────────────────────────────────────────────────────

function GovernanceTab() {
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState<CalGovernanceIssue | null>(null);
  const summary = getCalGovernanceSummary();

  const visible = filter === 'All' ? CAL_GOVERNANCE_ISSUES : CAL_GOVERNANCE_ISSUES.filter(i => i.severity === filter);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[{ l:'Critical', v:summary.critical, c:'text-red-600 bg-red-50 border-red-200' },{ l:'High', v:summary.high, c:'text-orange-600 bg-orange-50 border-orange-200' },{ l:'Medium', v:summary.medium, c:'text-amber-600 bg-amber-50 border-amber-200' },{ l:'Low', v:summary.low, c:'text-zinc-500 bg-zinc-50 border-zinc-200' }].map(s => (
          <div key={s.l} className={`rounded-lg border p-3 text-center ${s.c}`}>
            <div className="text-2xl font-bold">{s.v}</div>
            <div className="text-[11px] uppercase font-semibold">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {['All','Critical','High','Medium','Low'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.map(issue => (
          <div key={issue.id} onClick={() => setSelected(selected?.id === issue.id ? null : issue)}
            className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <SeverityBadge s={issue.severity} />
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-muted-foreground uppercase">{issue.category}</span>
                <span className="text-[13px] font-medium text-foreground">{issue.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-medium ${issue.status === 'Open' ? 'text-red-500' : issue.status === 'In Progress' ? 'text-amber-600' : 'text-green-600'}`}>{issue.status}</span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selected?.id === issue.id ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {selected?.id === issue.id && (
              <div className="mt-2 pt-2 border-t border-border space-y-2">
                <div className="text-[12px] text-foreground">{issue.detail}</div>
                {issue.affectedObjects.length > 0 && (
                  <div><span className="text-[11px] text-muted-foreground font-medium">Affected: </span><span className="text-[11px] text-foreground">{issue.affectedObjects.join(', ')}</span></div>
                )}
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <span className="text-[11px] font-medium text-green-700">Resolution: </span>
                  <span className="text-[11px] text-green-600">{issue.resolution}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Test Suite Tab ────────────────────────────────────────────────────────────

function TestSuiteTab() {
  const [selected, setSelected] = useState<CalTestSuite>(CAL_TEST_SUITES[0]);
  const overall = getCalTestSummary();

  const suitePassRate = (suite: CalTestSuite) => {
    const pass = suite.tests.filter(t => t.status === 'pass').length;
    return Math.round((pass / suite.tests.length) * 100);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Test Suites</div>
          <div className="text-[11px] text-muted-foreground">{overall.pass}/{overall.total} passing · {overall.pct}%</div>
        </div>
        <ScrollArea className="flex-1">
          {CAL_TEST_SUITES.map(suite => {
            const pct  = suitePassRate(suite);
            const pass = suite.tests.filter(t => t.status === 'pass').length;
            return (
              <button key={suite.id} onClick={() => setSelected(suite)}
                className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.id === suite.id ? 'bg-primary text-primary-foreground' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className={`text-[12px] font-semibold ${selected.id === suite.id ? 'text-primary-foreground' : 'text-foreground'}`}>{suite.name}</div>
                  <div className={`text-[11px] ${selected.id === suite.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{pass}/{suite.tests.length} passing · {pct}%</div>
                  <div className="mt-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${selected.id === suite.id ? 'bg-primary-foreground/70' : pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width:`${pct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          <div>
            <div className="text-[15px] font-semibold text-foreground">{selected.name}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{selected.description}</div>
          </div>
          {selected.tests.map(test => (
            <div key={test.id} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckIcon status={test.status} />
                <span className="text-[13px] font-medium text-foreground">{test.name}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${test.status === 'pass' ? 'bg-green-100 text-green-700 border-green-200' : test.status === 'fail' ? 'bg-red-100 text-red-700 border-red-200' : test.status === 'blocked' ? 'bg-red-50 text-red-500 border-red-200 opacity-70' : test.status === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{test.status}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{test.description}</div>
              <div className={`mt-1 text-[11px] italic ${test.status === 'pass' ? 'text-green-600' : test.status === 'fail' ? 'text-red-500' : test.status === 'blocked' ? 'text-red-400' : 'text-amber-600'}`}>{test.result}</div>
              {test.blockedBy && <div className="mt-1 text-[10px] text-red-400">Blocked by: {test.blockedBy}</div>}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Health Tab ────────────────────────────────────────────────────────────────

function HealthTab() {
  const [selected, setSelected] = useState(CAL_HEALTH_SCORES[0]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Health Dimensions</div>
        <ScrollArea className="flex-1">
          {CAL_HEALTH_SCORES.map(h => {
            const pct = Math.round((h.score / h.maxScore) * 100);
            return (
              <button key={h.dimension} onClick={() => setSelected(h)}
                className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.dimension === h.dimension ? 'bg-primary text-primary-foreground' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className={`text-[12px] font-semibold ${selected.dimension === h.dimension ? 'text-primary-foreground' : 'text-foreground'}`}>{h.label}</div>
                  <div className="mt-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${selected.dimension === h.dimension ? 'bg-primary-foreground/70' : pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width:`${pct}%` }} />
                  </div>
                  <div className={`text-[11px] mt-0.5 ${selected.dimension === h.dimension ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{pct}% — {h.status}</div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <div className="text-[15px] font-semibold text-foreground">{selected.label}</div>
            <div className="text-[12px] text-muted-foreground">{selected.note}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Score</span>
              <span className="text-[16px] font-bold text-foreground">{selected.score}/{selected.maxScore}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${selected.status === 'ready' ? 'bg-green-500' : selected.status === 'partial' ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width:`${(selected.score/selected.maxScore)*100}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {selected.items.map(item => (
              <div key={item.label} className="bg-card border border-border rounded-lg p-2.5 flex items-center gap-3">
                <CheckIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function GoogleCalendarIntegrationCenter() {
  const { openActionPanel } = useAppContext();
  const govSummary   = getCalGovernanceSummary();
  const criticalCount = govSummary.critical;
  const badge = criticalCount > 0 ? `${criticalCount} CRITICAL ISSUES` : 'Calendar Integration';

  const actions = [
    { id: 'add-calendar', label: 'Add Calendar Mapping', icon: Plus, variant: 'primary' as const, onClick: () => openActionPanel({
        title: 'Add Calendar Mapping', objectType: 'Calendar Mapping',
        subtitle: 'Connect a Google Calendar to a Trail OS program, cohort, or role.',
        slackContext: 'collaboration',
        fields: [
          { id: 'calendarName', label: 'Calendar Name',       type: 'text',     required: true, placeholder: 'e.g. Digital Literacy Trail — Cohort 3 Sessions' },
          { id: 'calendarId',   label: 'Google Calendar ID',  type: 'text',     placeholder: 'Paste the Google Calendar ID' },
          { id: 'mapTo',        label: 'Maps To',             type: 'select',   options: ['Program', 'Cohort', 'Sprint', 'Role', 'Penny Scheduling', 'Comms Cadence'], required: true },
          { id: 'trailObject',  label: 'Trail OS Object',     type: 'text',     placeholder: 'e.g. Digital Literacy Trail' },
          { id: 'eventTypes',   label: 'Event Types',         type: 'textarea', placeholder: 'What kinds of events will be on this calendar?', rows: 2 },
          { id: 'pennyCanRead', label: 'Penny Can Read',      type: 'select',   options: ['Yes — auto-sync', 'Yes — on request', 'No'] },
        ],
      })
    },
  ];

  return (
    <HubShell
      title="Google Calendar Integration Center"
      icon={CalendarDays}
      description="Calendars and events as first-class Trail OS objects — the timing layer. Calendar Registry, Event Catalog, Program Mapping, Penny Scheduling, and Governance in one place."
      badge={badge}
      actions={actions}
      tabs={[
        { id:'overview',       label:'Overview',            path:'/admin/integrations/google-calendar',                    icon:Activity,      content:<OverviewTab /> },
        { id:'account',        label:'Account Config',      path:'/admin/integrations/google-calendar/account',            icon:Settings,      content:<AccountConfigTab /> },
        { id:'registry',       label:'Calendar Registry',   path:'/admin/integrations/google-calendar/registry',           icon:CalendarDays,  content:<CalendarRegistryTab /> },
        { id:'events',         label:'Event Catalog',       path:'/admin/integrations/google-calendar/events',             icon:CalendarCheck, content:<EventCatalogTab /> },
        { id:'program-map',    label:'Program & Cohort',    path:'/admin/integrations/google-calendar/program-map',        icon:Layers,        content:<ProgramCohortMappingTab /> },
        { id:'roles',          label:'Role & People',       path:'/admin/integrations/google-calendar/roles',              icon:Users,         content:<RolePeopleMappingTab /> },
        { id:'penny',          label:'Penny Scheduling',    path:'/admin/integrations/google-calendar/penny',              icon:Brain,         content:<PennySchedulingTab /> },
        { id:'comms',          label:'Comms Mapping',       path:'/admin/integrations/google-calendar/comms',              icon:Hash,          content:<CommMappingTab /> },
        { id:'governance',     label:'Governance',          path:'/admin/integrations/google-calendar/governance',         icon:Shield,        content:<GovernanceTab /> },
        { id:'testing',        label:'Test Suite',          path:'/admin/integrations/google-calendar/testing',            icon:FlaskConical,  content:<TestSuiteTab /> },
        { id:'health',         label:'Health',              path:'/admin/integrations/google-calendar/health',             icon:Activity,      content:<HealthTab /> },
      ]}
    />
  );
}
