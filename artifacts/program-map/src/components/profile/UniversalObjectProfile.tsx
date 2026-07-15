import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowRight, ArrowLeft, ExternalLink, CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Activity, BookOpen, Brain, Database, FolderOpen, Clock, User, Shield, GitBranch,
  MessageSquare, Calendar, Zap,
} from 'lucide-react';
import type { ObjectProfile, ProfileHealthStatus } from '@/data/universalObjectProfileData';
import { PROFILE_MAP } from '@/data/universalObjectProfileData';

// ── Shared helpers ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<ProfileHealthStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  'healthy':        { icon: CheckCircle2,   color: 'text-emerald-600', label: 'Healthy'        },
  'needs-attention':{ icon: AlertTriangle,  color: 'text-amber-600',   label: 'Needs Attention'},
  'incomplete':     { icon: XCircle,        color: 'text-rose-600',    label: 'Incomplete'     },
  'unknown':        { icon: HelpCircle,     color: 'text-muted-foreground', label: 'Unknown'   },
};

const INDICATOR_DOT: Record<string, string> = {
  'healthy':'bg-emerald-500', 'warning':'bg-amber-500', 'critical':'bg-rose-600', 'unknown':'bg-muted-foreground/40',
};

const ACTIVITY_ICON: Record<string, typeof Clock> = {
  'decision': Shield, 'review': CheckCircle2, 'change': Zap, 'health-event': Activity, 'update': Clock,
};
const ACTIVITY_COLOR: Record<string, string> = {
  'decision':'text-violet-600', 'review':'text-emerald-600', 'change':'text-sky-600', 'health-event':'text-amber-600', 'update':'text-muted-foreground',
};

const STATUS_STYLE: Record<string, string> = {
  'active':'bg-emerald-100 text-emerald-800 border-emerald-200',
  'inactive':'bg-muted text-muted-foreground border-border',
  'draft':'bg-amber-100 text-amber-800 border-amber-200',
  'planning':'bg-sky-100 text-sky-800 border-sky-200',
};

const COMPLIANCE_CONFIG: Record<string, { color: string; label: string }> = {
  'compliant':    { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Compliant'     },
  'partial':      { color: 'bg-amber-100 text-amber-800 border-amber-200',       label: 'Partial'       },
  'non-compliant':{ color: 'bg-rose-100 text-rose-800 border-rose-200',          label: 'Non-Compliant' },
  'not-assessed': { color: 'bg-muted text-muted-foreground border-border',        label: 'Not Assessed'  },
};

// ── Tab definitions ───────────────────────────────────────────────────────────
const PROFILE_TABS = [
  { id: 'overview',       label: 'Overview',       icon: ArrowRight },
  { id: 'relationships',  label: 'Relationships',  icon: GitBranch  },
  { id: 'ownership',      label: 'Ownership',      icon: User       },
  { id: 'health',         label: 'Health',         icon: Activity   },
  { id: 'history',        label: 'History',        icon: Clock      },
  { id: 'standards',      label: 'Standards',      icon: Shield     },
  { id: 'knowledge',      label: 'Knowledge',      icon: BookOpen   },
  { id: 'penny',          label: TERMS.aiAssistant, icon: Brain      },
  { id: 'systems',        label: 'Systems',        icon: Database   },
  { id: 'activity',       label: 'Activity',       icon: Zap        },
] as const;
type ProfileTabId = typeof PROFILE_TABS[number]['id'];

// ── Section label helper ───────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{children}</p>;
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-white p-3 ${className}`}>{children}</div>;
}
function EmptyState({ msg }: { msg: string }) {
  return <p className="text-[11px] text-muted-foreground/60 italic py-2">{msg}</p>;
}

// ── Tab content components ─────────────────────────────────────────────────────

function OverviewTab({ p }: { p: ObjectProfile }) {
  const hCfg = HEALTH_CONFIG[p.health.overall];
  const HIcon = hCfg.icon;
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Purpose</SectionLabel>
        <Card><p className="text-[12px] text-foreground leading-relaxed">{p.overview.purpose}</p></Card>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {p.overview.keyFacts.map(f => (
          <div key={f.label} className="rounded-md border border-border bg-white px-3 py-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{f.label}</p>
            <p className="text-[12px] font-semibold text-foreground mt-0.5">{f.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <SectionLabel>Owner</SectionLabel>
          <Card>
            <p className="text-[11px] font-semibold text-blue-700">{p.ownership.primary}</p>
            {p.ownership.secondary && <p className="text-[10px] text-muted-foreground">{p.ownership.secondary}</p>}
            <p className="text-[10px] text-muted-foreground">{p.ownership.team}</p>
          </Card>
        </div>
        <div>
          <SectionLabel>Health</SectionLabel>
          <Card className="flex items-center gap-2">
            <HIcon className={`w-4 h-4 shrink-0 ${hCfg.color}`} />
            <div>
              <p className={`text-[11px] font-bold ${hCfg.color}`}>{hCfg.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.health.lastChecked}</p>
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <SectionLabel>Source of Truth</SectionLabel>
          <Card><span className="text-[11px] font-medium bg-teal-50 border border-teal-200 text-teal-700 px-1.5 py-0.5 rounded">{p.overview.keyFacts.find(f=>f.label.toLowerCase().includes('object') || f.label.toLowerCase().includes('source')) ? 'Salesforce' : 'See Systems tab'}</span></Card>
        </div>
        <div>
          <SectionLabel>Confidence</SectionLabel>
          <Card>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${p.confidence >= 80 ? 'bg-emerald-500' : p.confidence >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.confidence}%` }} />
              </div>
              <span className="text-[11px] font-bold text-foreground">{p.confidence}%</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RelationshipsTab({ p, onJumpToProfile }: { p: ObjectProfile; onJumpToProfile: (id: string) => void }) {
  const upstream   = p.relationships.filter(r => r.direction === 'upstream');
  const downstream = p.relationships.filter(r => r.direction === 'downstream');
  const RelRow = ({ r }: { r: typeof p.relationships[0] }) => (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border bg-white hover:bg-muted/10">
      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[12px] font-semibold text-foreground">{r.objectName}</p>
          <span className="text-[9px] text-muted-foreground/70 bg-muted/30 rounded px-1">{r.objectTypeName}</span>
          <span className="text-[9px] text-primary/70 italic">{r.relationshipType}</span>
        </div>
      </div>
      {r.profileId && PROFILE_MAP[r.profileId] && (
        <button onClick={() => onJumpToProfile(r.profileId!)} className="text-[10px] text-primary hover:underline font-medium shrink-0 flex items-center gap-0.5">
          Profile <ArrowRight className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      {upstream.length > 0 && (
        <div>
          <SectionLabel>Upstream — what governs or sources this object</SectionLabel>
          <div className="space-y-1.5">{upstream.map((r, i) => <RelRow key={i} r={r} />)}</div>
        </div>
      )}
      {downstream.length > 0 && (
        <div>
          <SectionLabel>Downstream — what this object governs, contains, or triggers</SectionLabel>
          <div className="space-y-1.5">{downstream.map((r, i) => <RelRow key={i} r={r} />)}</div>
        </div>
      )}
      {p.relationships.length === 0 && <EmptyState msg="No relationships documented." />}
    </div>
  );
}

function OwnershipTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Owner Roles</SectionLabel>
        <div className="space-y-1.5">
          {[p.ownership.primary, p.ownership.secondary].filter(Boolean).map((owner, i) => (
            <div key={owner} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{i + 1}</div>
              <div>
                <p className="text-[12px] font-semibold text-blue-900">{owner}</p>
                <p className="text-[10px] text-blue-700">{i === 0 ? 'Primary — final accountability' : 'Secondary — operational responsibility'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <SectionLabel>Team</SectionLabel>
          <Card><p className="text-[12px] text-foreground">{p.ownership.team}</p></Card>
        </div>
        <div>
          <SectionLabel>Review Cycle</SectionLabel>
          <Card><p className="text-[12px] text-foreground">{p.ownership.reviewCycle}</p></Card>
        </div>
      </div>
      {p.ownership.accountabilityGaps.length > 0 && (
        <div>
          <SectionLabel>Accountability Gaps</SectionLabel>
          <div className="space-y-1">
            {p.ownership.accountabilityGaps.map(g => (
              <div key={g} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900">{g}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthTab({ p }: { p: ObjectProfile }) {
  const hCfg = HEALTH_CONFIG[p.health.overall];
  const HIcon = hCfg.icon;
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        p.health.overall === 'healthy' ? 'border-emerald-200 bg-emerald-50'
        : p.health.overall === 'needs-attention' ? 'border-amber-200 bg-amber-50'
        : 'border-rose-200 bg-rose-50'
      }`}>
        <HIcon className={`w-5 h-5 shrink-0 ${hCfg.color}`} />
        <div>
          <p className={`text-[12px] font-bold ${hCfg.color}`}>{hCfg.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{p.health.summary}</p>
        </div>
      </div>
      <div>
        <SectionLabel>Health Indicators · {p.health.lastChecked}</SectionLabel>
        <div className="space-y-1.5">
          {p.health.indicators.map(ind => (
            <div key={ind.name} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-white">
              <div className={`w-2 h-2 rounded-full shrink-0 ${INDICATOR_DOT[ind.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[12px] font-semibold text-foreground">{ind.name}</p>
                  <span className="text-[11px] font-medium text-foreground/70">{ind.value}</span>
                  <span className="text-[9px] bg-teal-50 border border-teal-200 text-teal-700 rounded px-1">{ind.source}</span>
                </div>
                {ind.note && <p className="text-[10px] text-muted-foreground mt-0.5">{ind.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-4">
      {p.history.decisions.length > 0 && (
        <div>
          <SectionLabel>Key Decisions (Org Memory)</SectionLabel>
          <div className="space-y-2">
            {p.history.decisions.map(d => (
              <Card key={d.title}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-semibold text-foreground">{d.title}</p>
                  <span className="text-[9px] text-muted-foreground shrink-0">{d.date}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{d.description}</p>
                <p className="text-[10px] text-violet-700 mt-1">Impact: {d.impact}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
      {p.history.changes.length > 0 && (
        <div>
          <SectionLabel>Change History</SectionLabel>
          <div className="space-y-1">
            {p.history.changes.map(c => (
              <div key={c.description} className="flex items-start gap-2 px-3 py-1.5 rounded border border-border bg-white">
                <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5 w-14">{c.date}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wide mr-1">{c.type}</span>
                  <span className="text-[11px] text-foreground">{c.description}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">— {c.by}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {p.history.lessonsLearned.length > 0 && (
        <div>
          <SectionLabel>Lessons Learned</SectionLabel>
          <div className="space-y-1">
            {p.history.lessonsLearned.map(l => (
              <div key={l} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50">
                <span className="text-indigo-500 shrink-0 text-[11px]">💡</span>
                <p className="text-[11px] text-indigo-900 leading-relaxed">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {p.history.orgMemoryNote && (
        <div className="px-3 py-2 rounded-lg border border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">{p.history.orgMemoryNote}</p>
        </div>
      )}
    </div>
  );
}

function StandardsTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-3">
      {p.standards.length === 0 && <EmptyState msg="No governing standards documented for this object." />}
      {p.standards.map(s => {
        const cfg = COMPLIANCE_CONFIG[s.compliance];
        return (
          <Card key={s.blueprintName}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[12px] font-bold text-foreground">{s.blueprintName}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
            </div>
            {s.lastReviewed && <p className="text-[10px] text-muted-foreground">Reviewed: {s.lastReviewed}</p>}
            {s.notes && <p className="text-[11px] text-foreground/70 mt-1">{s.notes}</p>}
            {s.gaps.length > 0 && (
              <div className="mt-2 space-y-1">
                {s.gaps.map(g => (
                  <div key={g} className="flex items-start gap-1.5 text-[10px] text-amber-800">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0 mt-0.5" />
                    {g}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function KnowledgeTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Knowledge Sources</SectionLabel>
        {p.knowledge.sources.length === 0 ? <EmptyState msg="No knowledge sources linked." /> : (
          <div className="space-y-1.5">
            {p.knowledge.sources.map(s => (
              <div key={s.name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.pennyApproved ? 'bg-violet-500' : 'bg-muted-foreground/30'}`} />
                <p className="text-[12px] text-foreground flex-1">{s.name}</p>
                <span className="text-[9px] bg-teal-50 border border-teal-200 text-teal-700 rounded px-1">{s.trustLevel}</span>
                {s.pennyApproved && <span className="text-[9px] bg-violet-50 border border-violet-200 text-violet-700 rounded px-1">{TERMS.aiAssistant} ✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionLabel>Knowledge Articles</SectionLabel>
        {p.knowledge.articles.length === 0 ? <EmptyState msg="No articles linked." /> : (
          <div className="space-y-1">
            {p.knowledge.articles.map(a => (
              <div key={a.title} className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-white">
                <p className="text-[11px] text-foreground flex-1">{a.title}</p>
                <span className="text-[9px] text-muted-foreground">{a.type}</span>
                <span className="text-[9px] text-sky-600">{a.location}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionLabel>Google Drive Resources</SectionLabel>
        {p.knowledge.driveResources.length === 0 ? <EmptyState msg="No Drive resources linked." /> : (
          <div className="flex flex-wrap gap-1.5">
            {p.knowledge.driveResources.map(r => (
              <div key={r.name} className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-white text-[11px]">
                <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />
                {r.name}
                <span className="text-[9px] text-muted-foreground">({r.type})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-2 rounded-lg border border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground">{p.knowledge.sourceGovernance}</p>
      </div>
    </div>
  );
}

function PennyTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Active {TERMS.aiAssistant} Capabilities</SectionLabel>
        {p.penny.capabilities.length === 0 ? <EmptyState msg={`No ${TERMS.aiAssistant} capabilities linked to this object.`} /> : (
          <div className="space-y-1.5">
            {p.penny.capabilities.map(cap => (
              <Card key={cap.name}>
                <div className="flex items-center gap-2 mb-0.5">
                  <Brain className="w-3 h-3 text-pink-600 shrink-0" />
                  <p className="text-[12px] font-semibold text-foreground">{cap.name}</p>
                  <span className="text-[9px] bg-pink-50 border border-pink-200 text-pink-700 rounded px-1">{cap.status}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{cap.quality}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{cap.description}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <SectionLabel>Prompt Templates</SectionLabel>
        {p.penny.promptTemplates.length === 0 ? <EmptyState msg="No prompt templates linked." /> : (
          <div className="space-y-1">
            {p.penny.promptTemplates.map(t => (
              <div key={t.name} className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-white">
                <p className="text-[11px] text-foreground flex-1">{t.name}</p>
                <span className="text-[9px] text-muted-foreground">{t.version}</span>
                <span className={`text-[9px] rounded px-1 ${t.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-muted text-muted-foreground border border-border'}`}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {p.penny.contentAssistant.length > 0 && (
        <div>
          <SectionLabel>Content Assistant Actions</SectionLabel>
          <div className="space-y-1">
            {p.penny.contentAssistant.map(a => (
              <div key={a} className="flex items-center gap-2 px-3 py-1.5 rounded border border-violet-200 bg-violet-50 text-[11px] text-violet-900">
                <Zap className="w-2.5 h-2.5 text-violet-600 shrink-0" />
                {a}
              </div>
            ))}
          </div>
        </div>
      )}
      {p.penny.futureServices.length > 0 && (
        <div>
          <SectionLabel>Planned Services</SectionLabel>
          {p.penny.futureServices.map(s => (
            <p key={s} className="text-[11px] text-muted-foreground/60 py-0.5">· {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemsTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-3">
      {p.systems.salesforce.length > 0 && (
        <div>
          <SectionLabel>Salesforce</SectionLabel>
          <div className="space-y-1.5">
            {p.systems.salesforce.map(s => (
              <Card key={s.object}>
                <p className="text-[11px] font-bold text-sky-700 mb-0.5">{s.object}</p>
                {s.note && <p className="text-[10px] text-muted-foreground mb-1">{s.note}</p>}
                <div className="flex flex-wrap gap-1">
                  {s.fields.map(f => <span key={f} className="text-[9px] bg-muted/30 border border-border/60 rounded px-1 py-0.5 text-foreground/70">{f}</span>)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {(p.systems.googleDrive.length > 0 || p.systems.slack.length > 0 || p.systems.googleCalendar.length > 0) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {p.systems.googleDrive.length > 0 && (
            <div>
              <SectionLabel>Google Drive</SectionLabel>
              {p.systems.googleDrive.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] py-1">
                  <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-foreground/80">{d.name}</span>
                  <span className="text-[9px] text-muted-foreground truncate">{d.path}</span>
                </div>
              ))}
            </div>
          )}
          {p.systems.slack.length > 0 && (
            <div>
              <SectionLabel>Slack</SectionLabel>
              {p.systems.slack.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-[11px] py-1">
                  <MessageSquare className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className="text-foreground/80">{s.name}</span>
                  <span className="text-[9px] text-muted-foreground">{s.type}</span>
                </div>
              ))}
            </div>
          )}
          {p.systems.googleCalendar.length > 0 && (
            <div>
              <SectionLabel>Google Calendar</SectionLabel>
              {p.systems.googleCalendar.map(c => (
                <div key={c} className="flex items-center gap-1.5 text-[11px] py-1">
                  <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                  <span className="text-foreground/80">{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {(p.systems.lms.length > 0 || p.systems.assessments.length > 0 || p.systems.other.length > 0) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {p.systems.lms.length > 0 && (
            <div>
              <SectionLabel>LMS</SectionLabel>
              {p.systems.lms.map(l => <p key={l} className="text-[11px] text-muted-foreground py-0.5">· {l}</p>)}
            </div>
          )}
          {p.systems.other.length > 0 && (
            <div>
              <SectionLabel>Other Systems</SectionLabel>
              {p.systems.other.map(o => (
                <div key={o.name} className="py-0.5">
                  <p className="text-[11px] font-semibold text-foreground">{o.name}</p>
                  <p className="text-[10px] text-muted-foreground">{o.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ p }: { p: ObjectProfile }) {
  return (
    <div className="space-y-2">
      <SectionLabel>Recent Activity</SectionLabel>
      {p.activity.length === 0 && <EmptyState msg="No activity recorded." />}
      {p.activity.map((a, i) => {
        const Icon = ACTIVITY_ICON[a.type] ?? Clock;
        return (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border bg-white">
            <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${ACTIVITY_COLOR[a.type]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[12px] font-semibold text-foreground">{a.title}</p>
                <span className="text-[9px] text-muted-foreground/60">by {a.by}</span>
              </div>
              {a.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>}
            </div>
            <span className="text-[9px] text-muted-foreground shrink-0">{a.date}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export function UniversalObjectProfile({
  profile,
  onBack,
  showFullLink = true,
}: {
  profile: ObjectProfile;
  onBack?: () => void;
  showFullLink?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('overview');
  const [, setLocation] = useLocation();

  const [currentProfile, setCurrentProfile] = useState<ObjectProfile>(profile);

  const handleJumpToProfile = (id: string) => {
    const p = PROFILE_MAP[id];
    if (p) setCurrentProfile(p);
  };

  const hCfg = HEALTH_CONFIG[currentProfile.health.overall];
  const HIcon = hCfg.icon;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Profile header */}
      <div className="flex-shrink-0 border-b border-border px-5 pt-4 pb-0 bg-white">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mr-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${currentProfile.categoryBg} ${currentProfile.categoryColor}`}>
              {currentProfile.category}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">{currentProfile.objectTypeName}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[currentProfile.statusVariant]}`}>
              {currentProfile.status}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              <HIcon className={`w-3 h-3 ${hCfg.color}`} />
              <span className={`text-[10px] font-medium ${hCfg.color}`}>{hCfg.label}</span>
            </div>
            {showFullLink && (
              <button onClick={() => setLocation(currentProfile.workspaceLink)} className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
                Workspace <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">{currentProfile.name}</h2>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 max-w-2xl">{currentProfile.description}</p>

        {/* Tab bar */}
        <div className="flex gap-0 overflow-x-auto pb-0">
          {PROFILE_TABS.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon className="w-2.5 h-2.5 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {activeTab === 'overview'      && <OverviewTab       p={currentProfile} />}
          {activeTab === 'relationships' && <RelationshipsTab  p={currentProfile} onJumpToProfile={handleJumpToProfile} />}
          {activeTab === 'ownership'     && <OwnershipTab      p={currentProfile} />}
          {activeTab === 'health'        && <HealthTab         p={currentProfile} />}
          {activeTab === 'history'       && <HistoryTab        p={currentProfile} />}
          {activeTab === 'standards'     && <StandardsTab      p={currentProfile} />}
          {activeTab === 'knowledge'     && <KnowledgeTab      p={currentProfile} />}
          {activeTab === 'penny'         && <PennyTab          p={currentProfile} />}
          {activeTab === 'systems'       && <SystemsTab        p={currentProfile} />}
          {activeTab === 'activity'      && <ActivityTab       p={currentProfile} />}
        </div>
      </ScrollArea>
    </div>
  );
}
