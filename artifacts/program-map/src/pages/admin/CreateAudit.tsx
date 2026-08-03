import { CheckCircle2, Plus, Eye, MinusCircle } from 'lucide-react';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'wouter';

type AuditStatus = 'added' | 'by-design' | 'planned';

interface AuditEntry {
  workspace: string;
  section: string;
  action: string;
  objectType: string;
  entryPoint: string;
  status: AuditStatus;
  notes: string;
  path: string;
}

interface ReadOnlyEntry {
  workspace: string;
  view: string;
  reason: string;
}

const ADDED: AuditEntry[] = [
  {
    workspace: 'Program & Curriculum',
    section: 'Program Hub',
    action: 'Create Program',
    objectType: 'Program',
    entryPoint: 'ActionBar → "Create Program" button',
    status: 'added',
    notes: 'Fields: Name, Audience, Format, Duration, Core Outcome, Summary, Owner.',
    path: '/program',
  },
  {
    workspace: 'Program & Curriculum',
    section: 'Standards Studio',
    action: 'New Content Standard',
    objectType: 'Content Standard',
    entryPoint: 'Header → "New Standard" button',
    status: 'added',
    notes: 'Fields: Title, Category, Rule, Rationale, Good/Bad Example, Applies To, Owner.',
    path: '/program/standards',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    section: `${TERMS.aiAssistant} Hub`,
    action: 'New Prompt Template',
    objectType: 'Prompt Template',
    entryPoint: 'ActionBar → "New Prompt Template" button (primary)',
    status: 'added',
    notes: 'Fields: Name, Domain, Purpose, Prompt Body, Audience, Tone, Guardrails, Owner.',
    path: '/penny',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    section: `${TERMS.aiAssistant} Hub`,
    action: `New ${TERMS.aiAssistant} Capability`,
    objectType: `${TERMS.aiAssistant} Capability`,
    entryPoint: 'ActionBar → "New Capability" button (secondary)',
    status: 'added',
    notes: 'Fields: Name, Domain, Description, When to Use, Maturity, Hallucination Risk, Knowledge Sources, Owner.',
    path: '/penny',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    section: 'Prompt Studio',
    action: 'New Template',
    objectType: 'Prompt Template',
    entryPoint: 'Header → "New Template" button',
    status: 'added',
    notes: 'Same fields as hub prompt create. Secondary entry point within Prompt Studio.',
    path: '/penny/prompts',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    section: 'Capability Registry',
    action: 'New Capability',
    objectType: `${TERMS.aiAssistant} Capability`,
    entryPoint: 'Header → "New Capability" button',
    status: 'added',
    notes: 'Full capability fields including hallucination risk and knowledge sources.',
    path: '/penny',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    section: 'POC Integrations',
    action: 'Add Integration Connection',
    objectType: 'Integration Connection',
    entryPoint: 'Header → "Add Integration" button',
    status: 'added',
    notes: 'Fields: From system, To system, Description, Phase, Status, Readiness %, Blocker.',
    path: '/penny/integration-layer',
  },
  {
    workspace: 'Knowledge Library',
    section: 'Knowledge Source Registry',
    action: 'Add Knowledge Source',
    objectType: 'Knowledge Source',
    entryPoint: 'Header → "Add Source" button',
    status: 'added',
    notes: `Fields: Name, Type, Trust Level, Description, Source URL/ID, Sync Cadence, ${TERMS.aiAssistant} Approval, Owner.`,
    path: '/knowledge',
  },
  {
    workspace: 'People & Roles',
    section: 'People & Roles Studio',
    action: 'New Persona',
    objectType: 'Persona',
    entryPoint: 'Header → "New Persona" button (primary)',
    status: 'added',
    notes: 'Fields: Name, Type, Background, Goals, Frustrations, Typical Programs, Owner.',
    path: '/admin/people-access',
  },
  {
    workspace: 'People & Access',
    section: 'People & Roles Studio',
    action: 'New Role',
    objectType: 'Role',
    entryPoint: 'Header → "New Role" button (secondary)',
    status: 'added',
    notes: `Fields: Name, Category, Description, Programs, ${TERMS.aiAssistant} Support, Salesforce Object, Owner.`,
    path: '/admin/people-access',
  },
  {
    workspace: 'Governance',
    section: 'Governance Hub',
    action: 'Add Lifecycle Model',
    objectType: 'Lifecycle Model',
    entryPoint: 'ActionBar → "Add Lifecycle Model" button',
    status: 'added',
    notes: 'Fields: Object Type, Model Name, Stages, Approval Required, Review Cadence, Retention Rule, Owner.',
    path: '/governance',
  },
  {
    workspace: 'Navigator',
    section: 'Knowledge Relationships',
    action: 'Add Knowledge Relationship',
    objectType: 'Knowledge Relationship',
    entryPoint: 'Header → "Add Relationship" button',
    status: 'added',
    notes: 'Fields: From Object, Relationship type, To Object, How It Works, Data/Signal Flow, Owner.',
    path: '/knowledge/relationships',
  },
  {
    workspace: 'Collaboration',
    section: 'Slack Integration Center',
    action: 'Add Channel Mapping',
    objectType: 'Channel Mapping',
    entryPoint: 'ActionBar or outer wrapper — "Add Channel Mapping" button',
    status: 'added',
    notes: `Fields: Channel Name, Mapping Type, Trail OS Object, Purpose, Visibility, ${TERMS.aiAssistant} Access, Owner.`,
    path: '/collaboration/slack',
  },
  {
    workspace: 'Collaboration',
    section: 'Google Drive Integration Center',
    action: 'Add Folder Mapping',
    objectType: 'Folder Mapping',
    entryPoint: 'ActionBar → "Add Folder Mapping" button',
    status: 'added',
    notes: `Fields: Folder Name, Drive ID, Maps To, Trail OS Object, Content Type, Sync to ${TERMS.aiAssistant}, Owner.`,
    path: '/collaboration/drive',
  },
  {
    workspace: 'Collaboration',
    section: 'Google Calendar Integration Center',
    action: 'Add Calendar Mapping',
    objectType: 'Calendar Mapping',
    entryPoint: 'ActionBar → "Add Calendar Mapping" button',
    status: 'added',
    notes: `Fields: Calendar Name, Google Calendar ID, Maps To, Trail OS Object, Event Types, ${TERMS.aiAssistant} Access, Owner.`,
    path: '/collaboration/calendar',
  },
];

const READ_ONLY: ReadOnlyEntry[] = [
  {
    workspace: 'Navigator',
    view: 'Digital Twin (4-tab compass)',
    reason: 'Discovery surface only. Objects are created in their own workspaces (Programs, People, Knowledge). The Digital Twin visualises relationships, not source data.',
  },
  {
    workspace: 'Operations Center',
    view: `Program Health, Ops Health, ${TERMS.aiAssistant} Health, etc.`,
    reason: 'Health views are computed read-only dashboards. No creation applies — they reflect the state of objects created elsewhere.',
  },
  {
    workspace: 'Operations Center',
    view: 'Demand Management',
    reason: 'Demand items (Epics, Features, Stories) will be sourced from Salesforce backlog. Direct creation is planned via Salesforce integration (Q3).',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    view: 'Learners, Intelligence, Logs',
    reason: `Read-only analytics surfaces — data generated by learner activity and ${TERMS.aiAssistant} operations. No manual creation applies.`,
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    view: `Test ${TERMS.aiAssistant}`,
    reason: 'Interactive testing surface. Tests are run, not created. Prompt creation lives in Prompt Studio.',
  },
  {
    workspace: `${TERMS.aiAssistant} Command Center`,
    view: 'Trail OS Map',
    reason: 'Capability relationship visualisation. Read-only. Capabilities created in Capability Registry.',
  },
  {
    workspace: 'Administration',
    view: 'Admin Hub (programs, documents, resolve, penny, trail-os sections)',
    reason: 'Inline edit-in-place pattern already in Admin. Create was deliberately not duplicated to avoid two create flows for the same objects.',
  },
  {
    workspace: 'Knowledge Library',
    view: 'Source Documents, Templates, SF KB, Search',
    reason: 'Document upload and template creation planned via Drive integration. Search is read-only by design.',
  },
  {
    workspace: 'Context Engine',
    view: 'Context Hub / Workspace Context Engine',
    reason: 'Computed context surface. Context is derived from existing objects; no direct creation applies.',
  },
  {
    workspace: 'Unified Object Model',
    view: 'UOM explorer',
    reason: 'Schema documentation surface. Object type definitions are code-level, not runtime-created.',
  },
];

const STATUS_CFG: Record<AuditStatus, { label: string; cls: string; bg: string; icon: typeof CheckCircle2 }> = {
  added:     { label: 'Added',      cls: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA] border-[#9FC3AE]', icon: CheckCircle2 },
  'by-design': { label: 'By Design', cls: 'text-[#2F6F7E]',    bg: 'bg-[#EDF5F8] border-[#7FAFC6]',         icon: Eye },
  planned:   { label: 'Planned',    cls: 'text-[#CC8400]',  bg: 'bg-[#FFF3E0] border-[#FFD08A]',      icon: Plus },
};

export default function CreateAudit() {
  const addedCount = ADDED.filter(e => e.status === 'added').length;
  const workspaceCount = new Set(ADDED.map(e => e.workspace)).size;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration — Audit</p>
          <h1 className="text-base font-semibold text-foreground">Create Actions Audit</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">
            Comprehensive record of every create/add action added across Trail OS. All use the shared <code className="text-[11px] bg-muted rounded px-1">CreatePanel</code> pattern — in-page, Draft status, consistent Cancel / Save Draft / Save &amp; View controls.
          </p>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {[
              { label: 'Actions Added',          v: addedCount,        cls: 'text-[#2F6B3F]' },
              { label: 'Workspaces Covered',     v: workspaceCount,    cls: 'text-primary' },
              { label: 'Read-Only by Design',    v: READ_ONLY.length,  cls: 'text-[#2F6F7E]' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-white px-3 py-2.5 text-center">
                <p className={`text-xl font-bold ${s.cls}`}>{s.v}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern card */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Shared Pattern — CreatePanel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'No modals or slide-overs',    desc: 'Create panel renders in-page, replacing the content area' },
              { label: 'Draft status',                desc: 'All new items are auto-assigned Draft status on creation' },
              { label: 'Prototype notice',            desc: 'Amber banner on every panel clarifies data resets on refresh' },
              { label: '3-button footer',             desc: 'Cancel — Save as Draft — Save & View (consistent on all panels)' },
            ].map(p => (
              <div key={p.label} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <div className="flex items-start gap-1.5 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold text-foreground leading-snug">{p.label}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Added actions table */}
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Create Actions Added — {addedCount} total
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-x-4 px-4 py-2.5 border-b border-border bg-muted/30">
              {['Workspace', 'Object Type', 'Entry Point', 'Notes'].map(h => (
                <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {ADDED.map((entry, i) => {
              const cfg = STATUS_CFG[entry.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-x-4 items-start px-4 py-3 ${i < ADDED.length - 1 ? 'border-b border-border/40' : ''} hover:bg-muted/20 transition-colors`}
                >
                  <div>
                    <p className="text-[11px] font-bold text-foreground leading-snug">{entry.workspace}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">{entry.section}</p>
                    <Link href={entry.path}>
                      <span className="text-[9px] text-primary/60 hover:text-primary transition-colors cursor-pointer">
                        {entry.path} →
                      </span>
                    </Link>
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-full border px-2 py-0.5 ${cfg.bg} ${cfg.cls}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                    <p className="text-[11px] font-bold text-foreground mt-1">{entry.objectType}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.action}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{entry.entryPoint}</p>
                  <p className="text-[10px] text-muted-foreground leading-snug">{entry.notes}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Read-only by design */}
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Read-Only by Design — {READ_ONLY.length} views
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-x-4 px-4 py-2.5 border-b border-border bg-muted/30">
              {['Workspace', 'View', 'Why No Create Action'].map(h => (
                <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
              ))}
            </div>
            {READ_ONLY.map((entry, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_1fr_2fr] gap-x-4 items-start px-4 py-3 ${i < READ_ONLY.length - 1 ? 'border-b border-border/40' : ''}`}
              >
                <p className="text-[11px] font-semibold text-foreground">{entry.workspace}</p>
                <div className="flex items-center gap-1.5">
                  <MinusCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-snug">{entry.view}</p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Prototype status:</strong> All create panels are wired to the in-page <code className="text-[10px] bg-muted rounded px-1">CreatePanel</code> component.
            New objects appear immediately in the UI but reset on page refresh until a live backend (Express/PostgreSQL) is wired in.
            When the API is connected, <code className="text-[10px] bg-muted rounded px-1">onSaveDraft</code> and <code className="text-[10px] bg-muted rounded px-1">onSaveAndView</code> callbacks
            will call the appropriate POST endpoints — no structural changes to the panels will be needed.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}
