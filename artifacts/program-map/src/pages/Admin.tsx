import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, FileText, Layers, CheckCircle, AlertTriangle, Compass, Cloud, Plug } from 'lucide-react';
import type { Program } from '@/data/programs';
import type { SourceDocument } from '@/data/sourceDocuments';
import type { ResolvePhase } from '@/data/resolvePhases';

type Section = 'programs' | 'documents' | 'resolve' | 'integrations';

export default function Admin() {
  const { programs, sourceDocuments, resolvePhases, updateProgram, updateDocument, updateResolvePhase } = useAppContext();
  const [section, setSection] = useState<Section>('programs');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedProgram    = programs.find(p => p.id === selectedId);
  const selectedDocument   = sourceDocuments.find(d => d.id === selectedId);
  const selectedPhase      = resolvePhases.find(p => p.id === selectedId);

  const handleSectionChange = (next: Section) => {
    setSection(next);
    setSelectedId(null);
    setSaved(false);
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const navSections: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'programs',     label: 'Programs',     icon: Layers },
    { id: 'documents',    label: 'Documents',    icon: FileText },
    { id: 'resolve',      label: 'RESOLVE',      icon: Compass },
    { id: 'integrations', label: 'Integrations', icon: Plug },
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">Internal Admin</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Edit dashboard knowledge content. Changes apply to this session only.
            </p>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Saved to session
            </div>
          )}
        </div>

        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-snug">
            <span className="font-semibold">Prototype admin — internal use only.</span>{' '}
            Changes are session-local and reset on page refresh. A future version will write to a persistent knowledge store.
          </p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* ── Left entity list ── */}
        <div className="w-[220px] flex-shrink-0 border-r border-border/50 flex flex-col">
          <div className="flex border-b border-border/40 overflow-x-auto">
            {navSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSectionChange(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors whitespace-nowrap px-1 ${
                  section === id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {section === 'programs' && programs.map(p => (
                <EntityRow
                  key={p.id}
                  id={p.id}
                  label={p.name}
                  sub={p.confidence}
                  selectedId={selectedId}
                  onClick={() => { setSelectedId(p.id); setSaved(false); }}
                />
              ))}

              {section === 'documents' && sourceDocuments.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedId(d.id); setSaved(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedId === d.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-xs truncate">{d.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{d.category}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">{d.status}</Badge>
                  </div>
                </button>
              ))}

              {section === 'resolve' && resolvePhases.map((p, idx) => (
                <EntityRow
                  key={p.id}
                  id={p.id}
                  label={`${p.letter} — ${p.name}`}
                  sub={`Phase ${idx + 1} · ${p.confidence}`}
                  selectedId={selectedId}
                  onClick={() => { setSelectedId(p.id); setSaved(false); }}
                />
              ))}

              {section === 'integrations' && (
                <button
                  onClick={() => { setSelectedId('salesforce-cases'); setSaved(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedId === 'salesforce-cases' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-xs">Salesforce Cases Kanban</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Demand Management · Not connected</p>
                </button>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border/40">
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Compass className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary/50" />
              <p className="leading-snug">
                Future: this admin becomes a broader Navigator knowledge system for nonprofits via Penny.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right editing panel ── */}
        <div className="flex-1 min-w-0">
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Select{' '}
                {section === 'programs' ? 'a program' :
                 section === 'documents' ? 'a document' :
                 section === 'resolve' ? 'a RESOLVE phase' :
                 'an integration'} from the list to edit it.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Changes reflect immediately across the dashboard in this session.
              </p>
            </div>
          )}

          {section === 'programs' && selectedProgram && (
            <ProgramForm
              key={selectedProgram.id}
              program={selectedProgram}
              onSave={(updates) => { updateProgram(selectedProgram.id, updates); showSaved(); }}
            />
          )}

          {section === 'documents' && selectedDocument && (
            <DocumentForm
              key={selectedDocument.id}
              document={selectedDocument}
              onSave={(updates) => { updateDocument(selectedDocument.id, updates); showSaved(); }}
            />
          )}

          {section === 'resolve' && selectedPhase && (
            <ResolvePhaseForm
              key={selectedPhase.id}
              phase={selectedPhase}
              onSave={(updates) => { updateResolvePhase(selectedPhase.id, updates); showSaved(); }}
            />
          )}

          {section === 'integrations' && selectedId === 'salesforce-cases' && (
            <SalesforceIntegrationPanel />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────────── */

function EntityRow({ id, label, sub, selectedId, onClick }: {
  id: string; label: string; sub: string; selectedId: string | null; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
        selectedId === id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
      }`}
    >
      <p className="font-medium text-xs truncate">{label}</p>
      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{sub}</p>
    </button>
  );
}

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

function DirtyWarning() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
      Unsaved changes — click "Save Changes" to apply to this session.
    </div>
  );
}

function FormHeader({ label, name, dirty, onSave, onCancel }: {
  label: string; name: string; dirty: boolean;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/50">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{name}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={!dirty}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={!dirty} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function ConfidenceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="confirmed">Confirmed — verified against source documents</SelectItem>
        <SelectItem value="needs-review">Needs Review — some details unverified</SelectItem>
        <SelectItem value="draft">Draft — proposal stage, not active</SelectItem>
        <SelectItem value="deprecated">Deprecated — no longer current</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* ─── Program form ──────────────────────────────────────────────────────── */

function ProgramForm({ program, onSave }: { program: Program; onSave: (u: Partial<Program>) => void }) {
  const initial = () => ({
    name: program.name, strategicRole: program.strategicRole, audience: program.audience,
    coreOutcome: program.coreOutcome, executiveSummary: program.executiveSummary,
    whyItMatters: program.whyItMatters, whatBreaksIfMissing: program.whatBreaksIfMissing,
    confidence: program.confidence, duration: program.duration, format: program.format,
  });
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setForm(initial()); setDirty(false); }, [program.id]);
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };

  return (
    <div className="h-full flex flex-col">
      <FormHeader label="Editing Program" name={program.name} dirty={dirty}
        onSave={() => { onSave(form as Partial<Program>); setDirty(false); }}
        onCancel={() => { setForm(initial()); setDirty(false); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">
          <FormRow label="Program Name"><Input value={form.name} onChange={e => set('name', e.target.value)} /></FormRow>
          <FormRow label="Confidence">
            <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v)} />
          </FormRow>
          <FormRow label="Strategic Role" hint="One sentence shown in the card header">
            <Input value={form.strategicRole} onChange={e => set('strategicRole', e.target.value)} />
          </FormRow>
          <FormRow label="Core Outcome" hint="Primary learner outcome shown on the map card">
            <Input value={form.coreOutcome} onChange={e => set('coreOutcome', e.target.value)} />
          </FormRow>
          <FormRow label="Audience"><Input value={form.audience} onChange={e => set('audience', e.target.value)} /></FormRow>
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Duration"><Input value={form.duration} onChange={e => set('duration', e.target.value)} /></FormRow>
            <FormRow label="Format"><Input value={form.format} onChange={e => set('format', e.target.value)} /></FormRow>
          </div>
          <FormRow label="Executive Summary" hint="2–4 sentences shown in the decision brief">
            <Textarea value={form.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="resize-none" />
          </FormRow>
          <FormRow label="Why It Matters">
            <Textarea value={form.whyItMatters} onChange={e => set('whyItMatters', e.target.value)} rows={2} className="resize-none" />
          </FormRow>
          <FormRow label="What Would Break If Missing">
            <Textarea value={form.whatBreaksIfMissing} onChange={e => set('whatBreaksIfMissing', e.target.value)} rows={2} className="resize-none" />
          </FormRow>
          {dirty && <DirtyWarning />}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Document form ─────────────────────────────────────────────────────── */

function DocumentForm({ document, onSave }: { document: SourceDocument; onSave: (u: Partial<SourceDocument>) => void }) {
  const initial = () => ({
    name: document.name, status: document.status, confidence: document.confidence,
    owner: document.owner, summary: document.summary, purpose: document.purpose,
    quickTake: document.quickTake,
    sourceOfTruthFor: document.sourceOfTruthFor.join('\n'),
    notSourceOfTruthFor: document.notSourceOfTruthFor.join('\n'),
    keyDecisionsInfluenced: document.keyDecisionsInfluenced.join('\n'),
  });
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setForm(initial()); setDirty(false); }, [document.id]);
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };
  const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);

  return (
    <div className="h-full flex flex-col">
      <FormHeader label="Editing Document" name={document.name} dirty={dirty}
        onSave={() => {
          onSave({
            name: form.name, status: form.status as SourceDocument['status'],
            confidence: form.confidence as SourceDocument['confidence'],
            owner: form.owner, summary: form.summary, purpose: form.purpose,
            quickTake: form.quickTake,
            sourceOfTruthFor: lines(form.sourceOfTruthFor),
            notSourceOfTruthFor: lines(form.notSourceOfTruthFor),
            keyDecisionsInfluenced: lines(form.keyDecisionsInfluenced),
          });
          setDirty(false);
        }}
        onCancel={() => { setForm(initial()); setDirty(false); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">
          <FormRow label="Document Name"><Input value={form.name} onChange={e => set('name', e.target.value)} /></FormRow>
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Status">
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Active', 'Draft', 'Deprecated', 'Archived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Confidence">
              <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v)} />
            </FormRow>
          </div>
          <FormRow label="Owner"><Input value={form.owner} onChange={e => set('owner', e.target.value)} /></FormRow>
          <FormRow label="Summary" hint="1–2 sentences on what this document is">
            <Textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} className="resize-none" />
          </FormRow>
          <FormRow label="Purpose">
            <Textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={2} className="resize-none" />
          </FormRow>
          <FormRow label="Quick Take" hint="One-line practical guidance shown in sidebar">
            <Input value={form.quickTake} onChange={e => set('quickTake', e.target.value)} />
          </FormRow>
          <FormRow label="Source of Truth For" hint="One item per line">
            <Textarea value={form.sourceOfTruthFor} onChange={e => set('sourceOfTruthFor', e.target.value)} rows={4} className="resize-none font-mono text-xs" placeholder="One item per line" />
          </FormRow>
          <FormRow label="Not Source of Truth For" hint="One item per line">
            <Textarea value={form.notSourceOfTruthFor} onChange={e => set('notSourceOfTruthFor', e.target.value)} rows={3} className="resize-none font-mono text-xs" placeholder="One item per line" />
          </FormRow>
          <FormRow label="Key Decisions Influenced" hint="One item per line">
            <Textarea value={form.keyDecisionsInfluenced} onChange={e => set('keyDecisionsInfluenced', e.target.value)} rows={4} className="resize-none font-mono text-xs" placeholder="One item per line" />
          </FormRow>
          {dirty && <DirtyWarning />}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── RESOLVE Phase form ────────────────────────────────────────────────── */

function ResolvePhaseForm({ phase, onSave }: { phase: ResolvePhase; onSave: (u: Partial<ResolvePhase>) => void }) {
  const initial = () => ({
    letter: phase.letter, name: phase.name, confidence: phase.confidence,
    purpose: phase.purpose, executiveSummary: phase.executiveSummary,
    whyItMatters: phase.whyItMatters, sourceNote: phase.sourceNote,
    relatedPrograms: phase.relatedPrograms.join('\n'), docs: phase.docs.join('\n'),
  });
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setForm(initial()); setDirty(false); }, [phase.id]);
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setDirty(true); };
  const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);

  return (
    <div className="h-full flex flex-col">
      <FormHeader label="Editing RESOLVE Phase" name={`${phase.letter} — ${phase.name}`} dirty={dirty}
        onSave={() => {
          onSave({
            letter: form.letter, name: form.name, confidence: form.confidence as ResolvePhase['confidence'],
            purpose: form.purpose, executiveSummary: form.executiveSummary,
            whyItMatters: form.whyItMatters, sourceNote: form.sourceNote,
            relatedPrograms: lines(form.relatedPrograms),
            docs: lines(form.docs),
          });
          setDirty(false);
        }}
        onCancel={() => { setForm(initial()); setDirty(false); }}
      />
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800 leading-snug">
            <span className="font-semibold">Source integrity: </span>
            Only edit fields that are confirmed against source documents.
            Operational details (owner, inputs, outputs) should remain "Source mapping needed" until verified.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Acronym Letter" hint="Single character (R, E, S, O, L, V…)">
              <Input value={form.letter} onChange={e => set('letter', e.target.value)} maxLength={2} />
            </FormRow>
            <FormRow label="Phase Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} />
            </FormRow>
          </div>

          <FormRow label="Confidence / Data Status">
            <ConfidenceSelect value={form.confidence} onChange={v => set('confidence', v)} />
          </FormRow>

          <FormRow label="Purpose" hint="What this phase does — 1–2 sentences">
            <Textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={3} className="resize-none" />
          </FormRow>

          <FormRow label="Executive Summary" hint="Shown in the decision brief sidebar">
            <Textarea value={form.executiveSummary} onChange={e => set('executiveSummary', e.target.value)} rows={4} className="resize-none" />
          </FormRow>

          <FormRow label="Why It Matters">
            <Textarea value={form.whyItMatters} onChange={e => set('whyItMatters', e.target.value)} rows={2} className="resize-none" />
          </FormRow>

          <FormRow label="Source Note" hint="Provenance note shown in the decision brief">
            <Textarea value={form.sourceNote} onChange={e => set('sourceNote', e.target.value)} rows={2} className="resize-none" />
          </FormRow>

          <FormRow label="Related Programs" hint="One program name per line">
            <Textarea value={form.relatedPrograms} onChange={e => set('relatedPrograms', e.target.value)} rows={3} className="resize-none font-mono text-xs" placeholder="One item per line" />
          </FormRow>

          <FormRow label="Source Documents" hint="One document name per line">
            <Textarea value={form.docs} onChange={e => set('docs', e.target.value)} rows={3} className="resize-none font-mono text-xs" placeholder="One item per line" />
          </FormRow>

          {dirty && <DirtyWarning />}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Salesforce Integration placeholder panel ──────────────────────────── */

const CASE_STAGES = ['New', 'Assessment', 'Planned', 'In Progress', 'Blocked', 'Completed'];

function SalesforceIntegrationPanel() {
  const [visibleStages, setVisibleStages] = useState<string[]>(CASE_STAGES);
  const [sourceObject] = useState('Case');
  const [phaseMapping, setPhaseMapping] = useState<Record<string, string>>({
    'New': 'recognize', 'Assessment': 'evaluate', 'Planned': 'organize',
    'In Progress': 'leverage', 'Blocked': '', 'Completed': 'verify',
  });

  const toggleStage = (s: string) =>
    setVisibleStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-card/50">
        <Cloud className="w-5 h-5 text-sky-400" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Integration Settings</p>
          <p className="text-sm font-semibold text-foreground">Salesforce Cases Kanban</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px] text-sky-700 border-sky-200 bg-sky-50">
          Not connected
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6 max-w-2xl">

          <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 space-y-1">
            <p className="text-xs font-semibold text-sky-900">Future-state integration — Salesforce Cases only</p>
            <p className="text-xs text-sky-800 leading-snug">
              When connected, the RESOLVE Framework page will display a live Kanban board sourced exclusively
              from Salesforce Cases. No manually entered demand data will be used. This panel configures
              how cases are surfaced and mapped to RESOLVE phases.
            </p>
          </div>

          <div className="space-y-3">
            <FormRow label="Salesforce Source Object" hint="Read-only — demand management uses Cases only">
              <Input value={sourceObject} readOnly className="bg-muted/40 text-muted-foreground cursor-not-allowed" />
            </FormRow>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Connection Status</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">Not connected to Salesforce — connect via org credentials to enable live data</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Visible Case Stages (Kanban Columns)</Label>
            <p className="text-[10px] text-muted-foreground">Choose which Salesforce Case stages appear as Kanban columns when the integration is live.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {CASE_STAGES.map(s => {
                const active = visibleStages.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStage(s)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-white text-muted-foreground border-border/50 hover:border-border'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Case Stage → RESOLVE Phase Mapping</Label>
            <p className="text-[10px] text-muted-foreground leading-snug">
              Map each Salesforce Case stage to a RESOLVE phase for contextual analysis.
              Leave blank if no mapping applies.
            </p>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="grid grid-cols-2 bg-muted/40 border-b border-border/40 px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Case Stage</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">RESOLVE Phase</span>
              </div>
              {CASE_STAGES.map((s, idx) => (
                <div key={s} className={`grid grid-cols-2 items-center px-3 py-2 gap-3 ${idx < CASE_STAGES.length - 1 ? 'border-b border-border/30' : ''}`}>
                  <span className="text-xs font-medium text-foreground">{s}</span>
                  <select
                    value={phaseMapping[s] ?? ''}
                    onChange={e => setPhaseMapping(prev => ({ ...prev, [s]: e.target.value }))}
                    className="text-xs border border-border/50 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="">— None —</option>
                    <option value="recognize">Recognize</option>
                    <option value="evaluate">Evaluate</option>
                    <option value="solve">Solve</option>
                    <option value="organize">Organize</option>
                    <option value="leverage">Leverage</option>
                    <option value="verify">Verify</option>
                    <option value="execute">Execute</option>
                    <option value="evolve">Evolve</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-[10px] text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground">Note: </span>
            These settings are stored in this session only and are not sent to Salesforce.
            Connecting a live org will require Salesforce OAuth credentials and Connected App configuration
            by a Salesforce admin. This UI is a design placeholder for the future integration.
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
