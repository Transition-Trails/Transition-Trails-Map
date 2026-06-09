import { useState, useMemo } from 'react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, GitBranch, Users, CheckSquare, RotateCcw,
  BarChart2, Activity, BookOpen, AlertTriangle, Info, ChevronRight, ArrowRight,
} from 'lucide-react';
import {
  LIFECYCLE_MODELS, OWNERSHIP_MATRIX, GOV_HEALTH_ISSUES,
  COMPLIANCE_SUMMARY, APPROVAL_WORKFLOWS, REVIEW_CYCLES, GOV_POLICIES,
  type LifecycleModel, type OwnershipEntry, type ComplianceEntry,
  type ReviewCycle, type GovHealthIssue, type GovernancePolicy,
} from '@/data/governanceData';

// ── Utility components ────────────────────────────────────────────────────────
function LayerBadge({ layer }: { layer: string }) {
  const cls =
    layer === 'Program'       ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    layer === 'Knowledge'     ? 'bg-violet-50  text-violet-700  border-violet-200'  :
    layer === 'Intelligence'  ? 'bg-pink-50    text-pink-700    border-pink-200'    :
    layer === 'People'        ? 'bg-blue-50    text-blue-700    border-blue-200'    :
    layer === 'Infrastructure'? 'bg-teal-50    text-teal-700    border-teal-200'    :
    layer === 'Governance'    ? 'bg-orange-50  text-orange-700  border-orange-200'  :
                                'bg-muted      text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${cls}`}>
      {layer}
    </span>
  );
}

function StagePill({ label, color, isLast }: { label: string; color: string; isLast: boolean }) {
  const cls =
    color === 'sky'     ? 'bg-sky-50    text-sky-700    border-sky-200'    :
    color === 'indigo'  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
    color === 'violet'  ? 'bg-violet-50 text-violet-700 border-violet-200' :
    color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    color === 'amber'   ? 'bg-amber-50  text-amber-700  border-amber-200'  :
    color === 'teal'    ? 'bg-teal-50   text-teal-700   border-teal-200'   :
    color === 'blue'    ? 'bg-blue-50   text-blue-700   border-blue-200'   :
    color === 'rose'    ? 'bg-rose-50   text-rose-700   border-rose-200'   :
    color === 'pink'    ? 'bg-pink-50   text-pink-700   border-pink-200'   :
                          'bg-slate-50  text-slate-500  border-slate-200';
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold whitespace-nowrap ${cls}`}>
        {label}
      </span>
      {!isLast && <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: ReviewCycle['status'] }) {
  const cfg =
    status === 'current'       ? { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Current' }       :
    status === 'overdue'       ? { cls: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'Overdue' }        :
    status === 'upcoming'      ? { cls: 'bg-amber-50 text-amber-700 border-amber-200',        label: 'Due Soon' }       :
                                 { cls: 'bg-muted text-muted-foreground border-border',       label: 'Not Scheduled' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ComplianceBar({ compliant, partial, nonCompliant, notAssessed, total }: {
  compliant: number; partial: number; nonCompliant: number; notAssessed: number; total: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
      {compliant    > 0 && <div className="bg-emerald-400" style={{ width: pct(compliant) }} />}
      {partial      > 0 && <div className="bg-amber-400"   style={{ width: pct(partial) }} />}
      {nonCompliant > 0 && <div className="bg-rose-400"    style={{ width: pct(nonCompliant) }} />}
      {notAssessed  > 0 && <div className="bg-slate-200"   style={{ width: pct(notAssessed) }} />}
    </div>
  );
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────
function OverviewTab() {
  const criticalCount  = GOV_HEALTH_ISSUES.filter(i => i.severity === 'critical').length;
  const warningCount   = GOV_HEALTH_ISSUES.filter(i => i.severity === 'warning').length;
  const overdueReviews = REVIEW_CYCLES.filter(r => r.status === 'overdue').length;
  const totalIssues    = GOV_HEALTH_ISSUES.length;
  const totalCompliant = COMPLIANCE_SUMMARY.reduce((s, c) => s + c.compliant, 0);
  const totalObjects   = COMPLIANCE_SUMMARY.reduce((s, c) => s + c.total, 0);
  const pctCompliant   = Math.round((totalCompliant / totalObjects) * 100);

  const PRINCIPLES = [
    { icon: '🔑', title:'Every object has a named owner',    body:'No object exists without a designated primary owner. Ownerless objects are a governance risk.' },
    { icon: '🛡️',  title:'No object goes live without approval', body:'Objects in draft or testing states may not be used in live delivery without formal approval.' },
    { icon: '📍', title:'Source of truth is single and named', body:'Every object type has exactly one named source of truth. Non-authoritative data is never used operationally.' },
    { icon: '🔄', title:'Objects must follow their lifecycle', body:'Stage transitions require exit requirements to be met and recorded. Skipping stages requires a documented exception.' },
    { icon: '📋', title:'Review cycles must be met',          body:'All review deadlines must be met or formally deferred with a new target date.' },
    { icon: '✅', title:'Decisions must be documented',       body:'Decisions affecting two or more objects must be recorded in Org Memory within 5 business days.' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-4xl">

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1">Phase 1 Governance Capability</p>
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Object Lifecycle & Governance defines how every Trail OS object is created, reviewed, approved, operated, retired, and
            governed. It applies to all 20 Unified Object Model types and is the operational rulebook that ensures clear ownership,
            accountability, review cycles, and retirement paths.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:'Object Types Governed', value:'20',              sub:'Across all 6 UOM layers',    cls:'border-primary/20 bg-primary/5' },
            { label:'Overall Compliance',    value:`${pctCompliant}%`,sub:`${totalCompliant}/${totalObjects} objects`,cls:'border-emerald-200 bg-emerald-50' },
            { label:'Critical Issues',       value:String(criticalCount), sub:`${warningCount} warnings also open`, cls: criticalCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50' },
            { label:'Overdue Reviews',       value:String(overdueReviews),sub:'Of 20 review cycles',    cls: overdueReviews > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.cls}`}>
              <p className="text-2xl font-bold font-serif text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Framework */}
        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Governance Framework</p>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {['Lifecycle', 'Ownership', 'Approval', 'Review', 'Compliance', 'Retirement'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-foreground bg-muted border border-border rounded px-2.5 py-1">{step}</span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed max-w-2xl">
            Each of the 20 UOM object types has a defined lifecycle (stages with entry/exit requirements), an ownership matrix
            (primary owner, team, approval authority), a review cadence, and retirement criteria. All objects must satisfy these
            requirements before reaching Active or Operational status.
          </p>
        </div>

        {/* Core principles */}
        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Core Principles</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PRINCIPLES.map(p => (
              <div key={p.title} className="rounded-lg border border-border bg-white px-4 py-3">
                <p className="text-[12px] font-bold text-foreground mb-0.5">{p.icon} {p.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Layers coverage */}
        <div>
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wide mb-3">Coverage by Layer</p>
          {(['Program', 'Knowledge', 'Intelligence', 'People', 'Infrastructure', 'Governance'] as const).map(layer => {
            const types = OWNERSHIP_MATRIX.filter(o => o.layer === layer);
            return (
              <div key={layer} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <LayerBadge layer={layer} />
                <p className="text-[11px] text-foreground flex-1">{types.map(t => t.objectTypeName).join(', ')}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{types.length} types</span>
              </div>
            );
          })}
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Tab 2: Lifecycle Models ───────────────────────────────────────────────────
function LifecycleTab() {
  const [selectedType, setSelectedType] = useState<string>(LIFECYCLE_MODELS[0].objectTypeId);
  const model = LIFECYCLE_MODELS.find(m => m.objectTypeId === selectedType) ?? LIFECYCLE_MODELS[0];
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const detail = model.stages.find(s => s.id === activeStage);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0 h-full">
        {/* Object type selector */}
        <div className="p-4 border-b border-border bg-background/60 flex flex-wrap gap-1.5">
          {LIFECYCLE_MODELS.map(m => (
            <button
              key={m.objectTypeId}
              onClick={() => { setSelectedType(m.objectTypeId); setActiveStage(null); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                selectedType === m.objectTypeId
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {m.objectTypeName}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div>
              <h3 className="text-base font-bold font-serif text-foreground">{model.objectTypeName}</h3>
              <LayerBadge layer={model.layer} />
              {model.note && <p className="text-[11px] text-amber-700 mt-1">{model.note}</p>}
            </div>
          </div>

          {/* Stage flow */}
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Lifecycle Stages — click to inspect</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {model.stages.map((stage, i) => (
                <button key={stage.id} onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}>
                  <StagePill label={stage.label} color={stage.color} isLast={i === model.stages.length - 1} />
                </button>
              ))}
            </div>
          </div>

          {/* Stage detail */}
          {detail && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <StagePill label={detail.label} color={detail.color} isLast={true} />
                {detail.checkpoint && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 uppercase">
                    Checkpoint
                  </span>
                )}
              </div>
              <p className="text-[12px] text-foreground leading-relaxed">{detail.description}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1.5">Entry Requirements</p>
                  <ul className="space-y-0.5">
                    {detail.entry.map((r, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-primary mb-1.5">Exit Requirements</p>
                  <ul className="space-y-0.5">
                    {detail.exit.map((r, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 shrink-0">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {detail.checkpoint && (
                <p className="text-[11px] text-amber-700 font-medium">⚠ Governance checkpoint: {detail.checkpoint}</p>
              )}
            </div>
          )}

          {/* Retirement criteria */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-600 mb-1.5">Retirement Criteria</p>
            <ul className="space-y-0.5">
              {model.retirementCriteria.map((c, i) => (
                <li key={i} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5 shrink-0">·</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 3: Ownership Matrix ───────────────────────────────────────────────────
function OwnershipTab() {
  const [layerFilter, setLayerFilter] = useState<string>('All');
  const layers = ['All', 'Program', 'Knowledge', 'Intelligence', 'People', 'Infrastructure', 'Governance'];
  const filtered = layerFilter === 'All'
    ? OWNERSHIP_MATRIX
    : OWNERSHIP_MATRIX.filter(o => o.layer === layerFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {layers.map(l => (
            <button key={l} onClick={() => setLayerFilter(l)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                layerFilter === l ? 'bg-foreground text-background border-foreground' : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >{l}</button>
          ))}
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Object Type', 'Layer', 'Primary Owner', 'Team', 'Approval Authority', 'Review Cadence', 'Source of Truth'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.objectTypeId} className={`border-b border-border/40 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                  <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{o.objectTypeName}</td>
                  <td className="px-3 py-2"><LayerBadge layer={o.layer} /></td>
                  <td className="px-3 py-2 text-foreground">{o.primaryOwner}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.team}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.approvalAuthority}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{o.reviewCadence}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-teal-50 border border-teal-200 text-teal-700">
                      {o.sourceOfTruth}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground">{filtered.length} object type{filtered.length !== 1 ? 's' : ''} displayed</p>
      </div>
    </ScrollArea>
  );
}

// ── Tab 4: Approval Workflows ─────────────────────────────────────────────────
function ApprovalsTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const wf = APPROVAL_WORKFLOWS.find(w => w.id === selected);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        <p className="text-[12px] text-muted-foreground">
          Formal approval workflows govern stage transitions for high-impact object types.
          Click any workflow to see the full approval path.
        </p>
        {APPROVAL_WORKFLOWS.map(w => {
          const isOpen = selected === w.id;
          return (
            <div key={w.id} className={`rounded-lg border overflow-hidden transition-colors ${isOpen ? 'border-primary/30 bg-primary/5' : 'border-border bg-white'}`}>
              <button
                onClick={() => setSelected(isOpen ? null : w.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <LayerBadge layer={OWNERSHIP_MATRIX.find(o => o.objectTypeId === w.objectTypeId)?.layer ?? 'Program'} />
                  <div>
                    <p className="text-[12px] font-bold text-foreground">{w.objectTypeName} Approval</p>
                    <p className="text-[11px] text-muted-foreground">{w.trigger}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground">SLA: {w.sla}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {isOpen && wf && (
                <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Approval Steps</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {wf.steps.map((step, i) => (
                        <div key={step} className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-foreground bg-white border border-border rounded px-2 py-0.5">
                            {i + 1}. {step}
                          </span>
                          {i < wf.steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1">Approvers</p>
                      {wf.approvers.map(a => <p key={a} className="text-[11px] text-foreground">{a}</p>)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1">SLA</p>
                      <p className="text-[11px] text-foreground">{wf.sla}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1">Escalation</p>
                      <p className="text-[11px] text-muted-foreground">{wf.escalation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Tab 5: Review Cycles ──────────────────────────────────────────────────────
function ReviewCyclesTab() {
  const overdue  = REVIEW_CYCLES.filter(r => r.status === 'overdue');
  const upcoming = REVIEW_CYCLES.filter(r => r.status === 'upcoming');
  const current  = REVIEW_CYCLES.filter(r => r.status === 'current');
  const notSched = REVIEW_CYCLES.filter(r => r.status === 'not-scheduled');

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        {overdue.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="text-[10px] font-bold text-rose-700 uppercase mb-2">⚠ Overdue Reviews ({overdue.length})</p>
            {overdue.map(r => (
              <div key={r.objectTypeId} className="flex items-center justify-between py-1.5 border-b border-rose-100 last:border-0">
                <div>
                  <p className="text-[12px] font-semibold text-rose-800">{r.objectTypeName}</p>
                  <p className="text-[10px] text-rose-600">Last: {r.lastReview ?? '—'} · Owner: {r.owner}</p>
                </div>
                <ReviewStatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Object Type', 'Cadence', 'Owner', 'Last Review', 'Next Review', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REVIEW_CYCLES.map((r, i) => (
                <tr key={r.objectTypeId} className={`border-b border-border/40 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                  <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">{r.objectTypeName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.cadence}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.owner}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.lastReview ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.nextReview ?? '—'}</td>
                  <td className="px-3 py-2"><ReviewStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span>✓ Current: {current.length}</span>
          <span className="text-amber-600">⚡ Due soon: {upcoming.length}</span>
          <span className="text-rose-600">⚠ Overdue: {overdue.length}</span>
          <span>— Not scheduled: {notSched.length}</span>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 6: Compliance Dashboard ───────────────────────────────────────────────
function ComplianceTab() {
  const [layerFilter, setLayerFilter] = useState('All');
  const layers = ['All', 'Program', 'Knowledge', 'Intelligence', 'People', 'Infrastructure', 'Governance'];
  const filtered = layerFilter === 'All' ? COMPLIANCE_SUMMARY : COMPLIANCE_SUMMARY.filter(c => c.layer === layerFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {layers.map(l => (
            <button key={l} onClick={() => setLayerFilter(l)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                layerFilter === l ? 'bg-foreground text-background border-foreground' : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >{l}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((c: ComplianceEntry) => {
            const pct = Math.round(((c.compliant + c.partial * 0.5) / c.total) * 100);
            return (
              <div key={c.objectTypeId} className="rounded-lg border border-border bg-white p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-bold text-foreground">{c.objectTypeName}</p>
                    <LayerBadge layer={c.layer} />
                  </div>
                  <span className={`text-lg font-bold font-serif ${pct >= 85 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {pct}%
                  </span>
                </div>
                <ComplianceBar {...c} />
                <div className="flex gap-3 text-[10px]">
                  <span className="text-emerald-600">✓ {c.compliant} compliant</span>
                  {c.partial > 0 && <span className="text-amber-600">~ {c.partial} partial</span>}
                  {c.nonCompliant > 0 && <span className="text-rose-600">✗ {c.nonCompliant} non-compliant</span>}
                  {c.notAssessed > 0 && <span className="text-muted-foreground">? {c.notAssessed} not assessed</span>}
                </div>
                {c.topGap && (
                  <p className="text-[10px] text-amber-700 border-l-2 border-amber-300 pl-2">{c.topGap}</p>
                )}
                <p className="text-[9px] text-muted-foreground/60">Last checked: {c.lastChecked}</p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-[10px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Compliant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Non-compliant</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-200 inline-block" />Not assessed</span>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 7: Governance Health ──────────────────────────────────────────────────
function HealthTab() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const shown = filter === 'all' ? GOV_HEALTH_ISSUES : GOV_HEALTH_ISSUES.filter(i => i.severity === filter);
  const critical = GOV_HEALTH_ISSUES.filter(i => i.severity === 'critical');
  const warning  = GOV_HEALTH_ISSUES.filter(i => i.severity === 'warning');
  const info     = GOV_HEALTH_ISSUES.filter(i => i.severity === 'info');

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        {/* Summary */}
        <div className="flex gap-3">
          {[
            { key:'all',      label:'All',      count:GOV_HEALTH_ISSUES.length, cls:'border-border bg-muted' },
            { key:'critical', label:'Critical',  count:critical.length, cls:'border-rose-200 bg-rose-50' },
            { key:'warning',  label:'Warning',   count:warning.length,  cls:'border-amber-200 bg-amber-50' },
            { key:'info',     label:'Info',      count:info.length,     cls:'border-sky-200 bg-sky-50' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`flex-1 rounded-lg border p-2.5 text-center transition-all ${f.cls} ${filter === f.key ? 'ring-2 ring-foreground ring-offset-1' : ''}`}
            >
              <p className="text-lg font-bold font-serif text-foreground">{f.count}</p>
              <p className="text-[10px] font-semibold text-foreground/70">{f.label}</p>
            </button>
          ))}
        </div>

        {/* Issues */}
        <div className="space-y-2">
          {shown.map((issue: GovHealthIssue) => {
            const cfg =
              issue.severity === 'critical' ? { icon: AlertTriangle, cls: 'border-rose-200 bg-rose-50', ic:'text-rose-600', label:'Critical' } :
              issue.severity === 'warning'  ? { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50', ic:'text-amber-600', label:'Warning' } :
                                             { icon: Info, cls: 'border-sky-200 bg-sky-50', ic:'text-sky-600', label:'Info' };
            const IconComp = cfg.icon;
            return (
              <div key={issue.id} className={`rounded-lg border p-4 ${cfg.cls}`}>
                <div className="flex items-start gap-3">
                  <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.ic}`} />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-bold text-foreground">{issue.issue}</p>
                        {issue.objectName && (
                          <p className="text-[10px] text-muted-foreground">Object: {issue.objectName} ({issue.objectType})</p>
                        )}
                        {!issue.objectName && (
                          <p className="text-[10px] text-muted-foreground">Type: {issue.objectType}</p>
                        )}
                      </div>
                      {issue.dueDate && (
                        <span className="text-[9px] font-bold text-foreground/60 whitespace-nowrap shrink-0">Due: {issue.dueDate}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/70"><strong>Impact:</strong> {issue.impact}</p>
                    <p className="text-[11px] text-foreground font-medium">→ {issue.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 8: Governance Policies ────────────────────────────────────────────────
function PoliciesTab() {
  const [catFilter, setCatFilter] = useState('All');
  const categories = ['All', ...Array.from(new Set(GOV_POLICIES.map(p => p.category)))];
  const filtered = catFilter === 'All' ? GOV_POLICIES : GOV_POLICIES.filter(p => p.category === catFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                catFilter === c ? 'bg-foreground text-background border-foreground' : 'bg-white border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >{c}</button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((p: GovernancePolicy) => (
            <div key={p.id} className="rounded-lg border border-border bg-white p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted border border-border text-muted-foreground mb-1.5">
                    {p.category}
                  </span>
                  <p className="text-[12px] font-bold text-foreground">{p.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-muted-foreground/60">Effective {p.effective}</p>
                  <p className="text-[9px] text-muted-foreground/60">Owner: {p.owner}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p.body}</p>
              {p.appliesTo.length > 0 && p.appliesTo[0] !== 'All' && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  <span className="text-[9px] text-muted-foreground/60">Applies to:</span>
                  {p.appliesTo.map(a => (
                    <span key={a} className="text-[9px] font-semibold bg-muted border border-border rounded px-1.5 py-0.5 text-foreground">{a}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── GovernanceHub ─────────────────────────────────────────────────────────────
export default function GovernanceHub() {
  return (
    <HubShell
      title="Governance"
      icon={Shield}
      description="Object Lifecycle & Governance — the operational rulebook for all 20 UOM object types. Defines lifecycle, ownership, approvals, review cycles, compliance, and retirement for every core Trail OS object."
      badge="Phase 1"
      tabs={[
        { id:'overview',    label:'Overview',            path:'/governance',             icon:Shield,      content:<OverviewTab />     },
        { id:'lifecycle',   label:'Lifecycle Models',    path:'/governance/lifecycle',   icon:GitBranch,   content:<LifecycleTab />    },
        { id:'ownership',   label:'Ownership Matrix',    path:'/governance/ownership',   icon:Users,       content:<OwnershipTab />    },
        { id:'approvals',   label:'Approval Workflows',  path:'/governance/approvals',   icon:CheckSquare, content:<ApprovalsTab />    },
        { id:'reviews',     label:'Review Cycles',       path:'/governance/reviews',     icon:RotateCcw,   content:<ReviewCyclesTab /> },
        { id:'compliance',  label:'Compliance',          path:'/governance/compliance',  icon:BarChart2,   content:<ComplianceTab />   },
        { id:'health',      label:'Governance Health',   path:'/governance/health',      icon:Activity,    content:<HealthTab />       },
        { id:'policies',    label:'Policies',            path:'/governance/policies',    icon:BookOpen,    content:<PoliciesTab />     },
      ]}
    />
  );
}
