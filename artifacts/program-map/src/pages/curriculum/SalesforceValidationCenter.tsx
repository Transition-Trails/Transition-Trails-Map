import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Database, ChevronDown, ChevronRight } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ValidationStatus = 'validated' | 'partial' | 'pending' | 'blocked' | 'n-a';
type SfProduct = 'PMM' | 'NPSP' | 'Nonprofit Cloud' | 'Volunteer Mgmt' | 'Assessments' | 'LMS';

interface ObjectMapping {
  id: string;
  trailOsObject: string;
  trailOsGroup: string;
  sfObject: string;
  sfProduct: SfProduct;
  fieldCount: number;
  validatedFields: number;
  status: ValidationStatus;
  notes: string;
}

interface ProductReadiness {
  product: SfProduct;
  description: string;
  overallStatus: ValidationStatus;
  score: number;
  objectsMapped: number;
  objectsTotal: number;
  checks: { label: string; status: ValidationStatus; note: string }[];
}

interface ValidationWorkflow {
  phase: string;
  steps: { id: string; label: string; status: ValidationStatus; owner: string; detail: string }[];
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ValidationStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  validated: { label: 'Validated', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  partial:   { label: 'Partial',   cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: AlertTriangle },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200',        icon: Clock        },
  blocked:   { label: 'Blocked',   cls: 'bg-rose-100 text-rose-700 border-rose-200',           icon: XCircle      },
  'n-a':     { label: 'N/A',       cls: 'bg-muted text-muted-foreground border-border',        icon: Clock        },
};

const OBJECT_MAPPINGS: ObjectMapping[] = [
  // Program Structure
  { id: 'm1',  trailOsObject: 'Program',             trailOsGroup: 'Program Structure',  sfObject: 'Program__c (PMM)',              sfProduct: 'PMM',              fieldCount: 18, validatedFields: 0,  status: 'pending',   notes: 'Core program record — direct PMM Program__c mapping. Needs org access.' },
  { id: 'm2',  trailOsObject: 'Program',             trailOsGroup: 'Program Structure',  sfObject: 'Account (NPSP)',               sfProduct: 'NPSP',             fieldCount: 12, validatedFields: 0,  status: 'pending',   notes: 'Program as Org Account hierarchy in NPSP.' },
  { id: 'm3',  trailOsObject: 'Cohort',              trailOsGroup: 'Program Structure',  sfObject: 'Program Cohort__c (PMM)',       sfProduct: 'PMM',              fieldCount: 10, validatedFields: 0,  status: 'pending',   notes: 'Cohort-based delivery maps directly to PMM Program Cohort.' },
  { id: 'm4',  trailOsObject: 'Enrollment',          trailOsGroup: 'Program Structure',  sfObject: 'Program Engagement__c (PMM)',  sfProduct: 'PMM',              fieldCount: 14, validatedFields: 0,  status: 'pending',   notes: 'Learner enrollment / program engagement record.' },
  // Learning Assets
  { id: 'm5',  trailOsObject: 'Module',              trailOsGroup: 'Learning Assets',    sfObject: 'Training Plan (LMS)',          sfProduct: 'LMS',              fieldCount: 8,  validatedFields: 0,  status: 'pending',   notes: 'Module maps to LMS Training Plan sections.' },
  { id: 'm6',  trailOsObject: 'Lesson',              trailOsGroup: 'Learning Assets',    sfObject: 'Training Plan Item (LMS)',     sfProduct: 'LMS',              fieldCount: 6,  validatedFields: 0,  status: 'pending',   notes: 'Individual lesson as LMS Training Plan Item.' },
  { id: 'm7',  trailOsObject: 'Assessment',          trailOsGroup: 'Learning Assets',    sfObject: 'Survey (Assessments)',         sfProduct: 'Assessments',      fieldCount: 12, validatedFields: 0,  status: 'pending',   notes: 'Trail OS assessments map to Salesforce Surveys & Quizzes.' },
  // Penny Assets
  { id: 'm8',  trailOsObject: 'Penny Capability',    trailOsGroup: 'Penny Assets',       sfObject: 'Custom Object (TBD)',          sfProduct: 'PMM',              fieldCount: 10, validatedFields: 0,  status: 'blocked',   notes: 'No standard SF object — requires custom object design.' },
  { id: 'm9',  trailOsObject: 'Penny Interaction',   trailOsGroup: 'Penny Assets',       sfObject: 'Activity / Task',              sfProduct: 'NPSP',             fieldCount: 8,  validatedFields: 0,  status: 'partial',   notes: 'Penny interactions logged as Activity records; structure TBD.' },
  // Delivery Assets
  { id: 'm10', trailOsObject: 'Coach',               trailOsGroup: 'Delivery Assets',    sfObject: 'Contact (NPSP)',               sfProduct: 'NPSP',             fieldCount: 15, validatedFields: 5,  status: 'partial',   notes: 'Coach = NPSP Contact with custom role fields. Core fields identified.' },
  { id: 'm11', trailOsObject: 'Learner',             trailOsGroup: 'Delivery Assets',    sfObject: 'Contact (NPSP)',               sfProduct: 'NPSP',             fieldCount: 20, validatedFields: 8,  status: 'partial',   notes: 'Learner = NPSP Contact. Contact Type field distinguishes learner vs coach.' },
  { id: 'm12', trailOsObject: 'Volunteer',           trailOsGroup: 'Delivery Assets',    sfObject: 'Volunteer Hours / Job (VM)',   sfProduct: 'Volunteer Mgmt',   fieldCount: 8,  validatedFields: 0,  status: 'pending',   notes: 'Guest coaches and volunteer mentors tracked in Volunteer Management.' },
  // Demand Management
  { id: 'm13', trailOsObject: 'Intake Case',         trailOsGroup: 'Demand Management',  sfObject: 'Case',                        sfProduct: 'NPSP',             fieldCount: 12, validatedFields: 2,  status: 'partial',   notes: 'Demand intake mapped to Salesforce Cases. Basic field map exists.' },
  { id: 'm14', trailOsObject: 'Change Request',      trailOsGroup: 'Demand Management',  sfObject: 'Case (Change type)',           sfProduct: 'NPSP',             fieldCount: 8,  validatedFields: 0,  status: 'pending',   notes: 'Change requests as a Case record type.' },
  // Content Repository
  { id: 'm15', trailOsObject: 'Knowledge Article',   trailOsGroup: 'Content Repository', sfObject: 'Knowledge Article (SF KB)',   sfProduct: 'Nonprofit Cloud',  fieldCount: 10, validatedFields: 0,  status: 'blocked',   notes: 'Salesforce KB API access needed. Article sync design ready.' },
  { id: 'm16', trailOsObject: 'Source Document',     trailOsGroup: 'Content Repository', sfObject: 'ContentDocument / File',      sfProduct: 'NPSP',             fieldCount: 6,  validatedFields: 0,  status: 'pending',   notes: 'Source docs as Salesforce Files linked to related records.' },
];

const PRODUCT_READINESS: ProductReadiness[] = [
  {
    product: 'PMM',
    description: 'Program Management Module — core program, cohort, and engagement objects.',
    overallStatus: 'pending',
    score: 20,
    objectsMapped: 3,
    objectsTotal: 4,
    checks: [
      { label: 'Org Access',           status: 'blocked',   note: 'PMM installed org access not yet granted' },
      { label: 'Object Inventory',     status: 'validated', note: 'Program__c, Program Cohort__c, Program Engagement__c identified' },
      { label: 'Field Mapping',        status: 'pending',   note: 'Field-level mapping not yet performed' },
      { label: 'Relationship Mapping', status: 'pending',   note: 'PMM object relationships not yet validated' },
      { label: 'Data Migration Plan',  status: 'pending',   note: 'Migration scope not yet scoped' },
    ],
  },
  {
    product: 'NPSP',
    description: 'Nonprofit Success Pack — contact, account, and relationship management.',
    overallStatus: 'partial',
    score: 40,
    objectsMapped: 5,
    objectsTotal: 6,
    checks: [
      { label: 'Org Access',           status: 'blocked',   note: 'NPSP org access not yet granted' },
      { label: 'Object Inventory',     status: 'validated', note: 'Contact (learner/coach), Account, Case, Activity identified' },
      { label: 'Contact Role Design',  status: 'partial',   note: 'Learner vs coach Contact Type field design drafted, not validated' },
      { label: 'Household Account',    status: 'pending',   note: 'Household Account usage not yet assessed for learner records' },
      { label: 'Relationship Types',   status: 'partial',   note: 'Coach ↔ Learner relationship type partially mapped' },
    ],
  },
  {
    product: 'Nonprofit Cloud',
    description: 'Salesforce Nonprofit Cloud — Knowledge Articles and content management.',
    overallStatus: 'blocked',
    score: 10,
    objectsMapped: 1,
    objectsTotal: 2,
    checks: [
      { label: 'Org Access',            status: 'blocked',  note: 'Nonprofit Cloud org access not yet granted' },
      { label: 'Knowledge API Access',  status: 'blocked',  note: 'Knowledge Article API requires specific permission set' },
      { label: 'Article Type Design',   status: 'pending',  note: 'Article Type and category design not yet started' },
      { label: 'Sync Architecture',     status: 'pending',  note: 'Bi-directional sync or read-only TBD' },
    ],
  },
  {
    product: 'Volunteer Mgmt',
    description: 'Volunteer Management — volunteer jobs, shifts, and hours tracking.',
    overallStatus: 'pending',
    score: 15,
    objectsMapped: 1,
    objectsTotal: 2,
    checks: [
      { label: 'Org Access',              status: 'blocked',   note: 'Volunteer Management org access not yet granted' },
      { label: 'Volunteer Job Design',    status: 'pending',   note: 'Guest coach = Volunteer Job concept drafted' },
      { label: 'Hours Tracking',          status: 'pending',   note: 'Volunteer hours for session tracking not yet mapped' },
    ],
  },
  {
    product: 'Assessments',
    description: 'Salesforce Surveys & Assessments — learning assessments and feedback.',
    overallStatus: 'pending',
    score: 15,
    objectsMapped: 1,
    objectsTotal: 3,
    checks: [
      { label: 'Org Access',           status: 'blocked',   note: 'Assessments org access not yet granted' },
      { label: 'Survey Object Design', status: 'pending',   note: 'Trail OS Assessment → SF Survey mapping designed but not validated' },
      { label: 'Response Capture',     status: 'pending',   note: 'Learner response → SurveyResponse__c not yet mapped' },
      { label: 'Scoring Logic',        status: 'pending',   note: 'Scoring rules not yet designed for SF objects' },
    ],
  },
  {
    product: 'LMS',
    description: 'Learning Management System — training plans, items, and completion tracking.',
    overallStatus: 'pending',
    score: 10,
    objectsMapped: 2,
    objectsTotal: 3,
    checks: [
      { label: 'Org Access',              status: 'blocked',   note: 'LMS org access not yet granted' },
      { label: 'Training Plan Mapping',   status: 'pending',   note: 'Module → Training Plan design drafted' },
      { label: 'Completion Tracking',     status: 'pending',   note: 'Lesson completion → TrainingPlanItem status not yet mapped' },
    ],
  },
];

const VALIDATION_WORKFLOWS: ValidationWorkflow[] = [
  {
    phase: 'Phase 1 — Object Identification',
    steps: [
      { id: 'v1', label: 'Inventory all Trail OS objects that need Salesforce backing',                    status: 'validated', owner: 'Platform Lead',       detail: 'UOM defines 7 object types; 16 SF mappings identified above.' },
      { id: 'v2', label: 'Identify corresponding standard and custom SF objects per product',             status: 'validated', owner: 'Platform Lead',       detail: 'PMM, NPSP, NC, VM, Assessments, LMS objects all identified.' },
      { id: 'v3', label: 'Obtain Salesforce org access (sandbox or dev edition)',                         status: 'blocked',   owner: 'Tech Lead',           detail: 'Blocked on Salesforce admin providing access credentials.' },
    ],
  },
  {
    phase: 'Phase 2 — Field-Level Mapping',
    steps: [
      { id: 'v4', label: 'Export SF object field lists for all mapped objects',                           status: 'pending',   owner: 'Tech Lead',           detail: 'Requires org access. Use Salesforce Inspector or Workbench.' },
      { id: 'v5', label: 'Map UOM fields to SF fields — label, API name, type, required',                status: 'pending',   owner: 'Platform Lead',       detail: 'Field mapping spreadsheet template ready; needs org access to populate.' },
      { id: 'v6', label: 'Identify field gaps — Trail OS fields with no SF equivalent',                  status: 'pending',   owner: 'Platform Lead',       detail: 'Expected gaps: Penny integration fields, Trail OS-specific metadata.' },
      { id: 'v7', label: 'Design custom field additions for SF where needed',                             status: 'pending',   owner: 'Tech Lead',           detail: 'Custom fields to be created in sandbox before production.' },
    ],
  },
  {
    phase: 'Phase 3 — Data Architecture Validation',
    steps: [
      { id: 'v8',  label: 'Validate relationship integrity (lookups, master-detail)',                     status: 'pending',   owner: 'Tech Lead',           detail: 'Ensure all Trail OS relationships have equivalent SF relationship fields.' },
      { id: 'v9',  label: 'Validate PMM Program ↔ NPSP Contact relationship design',                     status: 'pending',   owner: 'Platform Lead',       detail: 'PMM Program Engagement links to NPSP Contact — validate this works in org.' },
      { id: 'v10', label: 'Test Penny interaction logging into Activity / custom object',                 status: 'blocked',   owner: 'Penny Lead',          detail: 'Blocked on Penny API access; design drafted but not testable.' },
    ],
  },
  {
    phase: 'Phase 4 — Integration Testing',
    steps: [
      { id: 'v11', label: 'Test Trail OS → Salesforce write (create program engagement)',                 status: 'pending',   owner: 'Tech Lead',           detail: 'Requires Connected App credentials and REST API access.' },
      { id: 'v12', label: 'Test Salesforce → Trail OS read (pull program list from SF)',                  status: 'pending',   owner: 'Tech Lead',           detail: 'Read-only query test via REST API.' },
      { id: 'v13', label: 'Validate Salesforce Knowledge Article sync to Trail OS library',              status: 'blocked',   owner: 'Knowledge Manager',   detail: 'Blocked on Knowledge API permission set and org access.' },
      { id: 'v14', label: 'End-to-end test: Intake case → SF Case → Trail OS demand board',             status: 'pending',   owner: 'Operations Director', detail: 'Full round-trip validation for demand pipeline.' },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ValidationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function ReadinessTrackingView() {
  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRODUCT_READINESS.map(prod => {
          const cfg = STATUS_CONFIG[prod.overallStatus];
          const [open, setOpen] = useState(false);
          return (
            <div key={prod.product} className="rounded-lg border border-border bg-white overflow-hidden">
              <button onClick={() => setOpen(v => !v)} className="w-full text-left px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-foreground">{prod.product}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={prod.overallStatus} />
                    <span className={`text-xl font-bold ${prod.score >= 60 ? 'text-blue-600' : prod.score >= 30 ? 'text-amber-600' : 'text-rose-600'}`}>{prod.score}</span>
                    {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{prod.description}</p>
                <div className="h-1.5 bg-muted rounded-full">
                  <div className={`h-1.5 rounded-full ${prod.score >= 60 ? 'bg-blue-400' : prod.score >= 30 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${prod.score}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{prod.objectsMapped} of {prod.objectsTotal} object groups mapped</p>
              </button>
              {open && (
                <div className="border-t border-border/50 divide-y divide-border/40">
                  {prod.checks.map(c => (
                    <div key={c.label} className="px-4 py-2 flex items-start gap-3">
                      <StatusBadge status={c.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground">{c.label}</p>
                        <p className="text-[10px] text-muted-foreground">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ObjectMappingView() {
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ValidationStatus | 'all'>('all');
  const groups = ['all', ...Array.from(new Set(OBJECT_MAPPINGS.map(m => m.trailOsGroup)))];

  const filtered = OBJECT_MAPPINGS.filter(m => {
    if (groupFilter !== 'all' && m.trailOsGroup !== groupFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex flex-wrap gap-2">
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
          className="text-[11px] border border-border rounded px-2 py-1 bg-background">
          {groups.map(g => <option key={g} value={g}>{g === 'all' ? 'All Groups' : g}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="text-[11px] border border-border rounded px-2 py-1 bg-background">
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_CONFIG) as ValidationStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground self-center ml-auto">{filtered.length} mappings</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Trail OS Object</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">SF Object</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Product</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Fields</th>
              <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map(m => (
              <tr key={m.id} className="bg-white hover:bg-muted/10 transition-colors">
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-foreground">{m.trailOsObject}</p>
                  <p className="text-[10px] text-muted-foreground">{m.trailOsGroup}</p>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-foreground">{m.sfObject}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{m.notes}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700">{m.sfProduct}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <p className="font-bold text-foreground">{m.validatedFields}/{m.fieldCount}</p>
                  <div className="h-1 bg-muted rounded-full mt-0.5 w-12">
                    <div className="h-1 rounded-full bg-primary/60" style={{ width: m.fieldCount > 0 ? `${(m.validatedFields / m.fieldCount) * 100}%` : '0%' }} />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ValidationWorkflowView() {
  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {VALIDATION_WORKFLOWS.map(wf => (
        <div key={wf.phase} className="rounded-lg border border-border bg-white overflow-hidden">
          <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
            <p className="text-[12px] font-bold text-foreground">{wf.phase}</p>
            <div className="flex gap-2 mt-1">
              {(['validated','partial','pending','blocked'] as ValidationStatus[]).map(s => {
                const count = wf.steps.filter(st => st.status === s).length;
                if (!count) return null;
                return <span key={s} className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 ${STATUS_CONFIG[s].cls}`}>{count} {STATUS_CONFIG[s].label}</span>;
              })}
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {wf.steps.map(step => (
              <div key={step.id} className="px-4 py-3 flex items-start gap-3">
                <StatusBadge status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{step.label}</p>
                  <p className="text-[10px] text-muted-foreground">{step.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{step.owner}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GapAnalysisView() {
  const blocked  = OBJECT_MAPPINGS.filter(m => m.status === 'blocked');
  const pending  = OBJECT_MAPPINGS.filter(m => m.status === 'pending');
  const partial  = OBJECT_MAPPINGS.filter(m => m.status === 'partial');
  const totalFields = OBJECT_MAPPINGS.reduce((s, m) => s + m.fieldCount, 0);
  const validatedFields = OBJECT_MAPPINGS.reduce((s, m) => s + m.validatedFields, 0);

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Mappings',      v: OBJECT_MAPPINGS.length,    cls: 'text-foreground'   },
          { label: 'Blocked',             v: blocked.length,             cls: 'text-rose-600'     },
          { label: 'Pending Validation',  v: pending.length,             cls: 'text-amber-600'    },
          { label: 'Fields Validated',    v: `${validatedFields}/${totalFields}`, cls: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-white px-3 py-3 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Critical blockers */}
      {blocked.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-rose-200">
            <p className="text-[11px] font-bold text-rose-700">Critical Blockers ({blocked.length} mappings)</p>
          </div>
          {blocked.map(m => (
            <div key={m.id} className="px-4 py-2.5 border-b border-rose-100 last:border-0 flex items-start gap-2">
              <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-foreground">{m.trailOsObject} → {m.sfObject}</p>
                <p className="text-[10px] text-muted-foreground">{m.notes}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Partially mapped */}
      {partial.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-blue-200">
            <p className="text-[11px] font-bold text-blue-700">Partially Mapped — Needs Completion ({partial.length})</p>
          </div>
          {partial.map(m => (
            <div key={m.id} className="px-4 py-2.5 border-b border-blue-100 last:border-0 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-foreground">{m.trailOsObject} → {m.sfObject}</p>
                <p className="text-[10px] text-muted-foreground">{m.validatedFields}/{m.fieldCount} fields · {m.notes}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommended unblocking actions */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Top Unblocking Actions</p>
        {[
          { priority: 1, action: 'Obtain Salesforce org access (sandbox) — unblocks 12 of 16 mappings' },
          { priority: 2, action: 'Request PMM permission set — unblocks Program, Cohort, Engagement objects' },
          { priority: 3, action: 'Request Knowledge API permission set — unblocks Salesforce KB sync' },
          { priority: 4, action: 'Design Penny custom object schema before requesting custom object creation' },
          { priority: 5, action: 'Complete Contact Type field design (learner vs coach) — partial mappings can be completed' },
        ].map(a => (
          <div key={a.priority} className="flex items-start gap-2 py-1.5 border-b border-primary/10 last:border-0">
            <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">{a.priority}</span>
            <p className="text-[11px] text-foreground">{a.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type SFView = 'readiness' | 'mappings' | 'workflows' | 'gaps';

const VIEWS: { id: SFView; label: string }[] = [
  { id: 'readiness',  label: 'Product Readiness' },
  { id: 'mappings',   label: 'Object Mapping Inventory' },
  { id: 'workflows',  label: 'Validation Workflows' },
  { id: 'gaps',       label: 'Gap Analysis' },
];

export default function SalesforceValidationCenter() {
  const [view, setView] = useState<SFView>('readiness');
  const totalMapped   = OBJECT_MAPPINGS.filter(m => m.status !== 'blocked' && m.status !== 'n-a').length;
  const totalValidated = OBJECT_MAPPINGS.filter(m => m.status === 'validated').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration · SF Validation</p>
            <h2 className="text-[15px] font-semibold text-foreground leading-snug">Salesforce Validation & Mapping Center</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Object mapping inventory, validation workflows, and readiness tracking across PMM, NPSP, Nonprofit Cloud, VM, Assessments, and LMS.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-[11px] font-bold text-foreground">6 SF Products</p>
              </div>
              <p className="text-[10px] text-muted-foreground">{totalMapped}/{OBJECT_MAPPINGS.length} objects mapped · {totalValidated} validated</p>
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-t transition-colors border-b-2 ${
                view === v.id ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {view === 'readiness'  && <ReadinessTrackingView />}
        {view === 'mappings'   && <ObjectMappingView />}
        {view === 'workflows'  && <ValidationWorkflowView />}
        {view === 'gaps'       && <GapAnalysisView />}
      </ScrollArea>
    </div>
  );
}
