import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, FileText, Layers, CheckCircle, AlertTriangle, Compass } from 'lucide-react';
import type { Program } from '@/data/programs';
import type { SourceDocument } from '@/data/sourceDocuments';

type Section = 'programs' | 'documents';

export default function Admin() {
  const { programs, sourceDocuments, updateProgram, updateDocument } = useAppContext();
  const [section, setSection] = useState<Section>('programs');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedProgram = programs.find(p => p.id === selectedId);
  const selectedDocument = sourceDocuments.find(d => d.id === selectedId);

  const handleSectionChange = (next: Section) => {
    setSection(next);
    setSelectedId(null);
    setSaved(false);
  };

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
            Changes are session-local and not persisted to any database or file. Refreshing the page resets all edits.
            A future version will connect to a persistent knowledge store.
          </p>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-[220px] flex-shrink-0 border-r border-border/50 flex flex-col">
          <div className="flex border-b border-border/40">
            <button
              onClick={() => handleSectionChange('programs')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                section === 'programs'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Programs
            </button>
            <button
              onClick={() => handleSectionChange('documents')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
                section === 'documents'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Documents
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {section === 'programs' && programs.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setSaved(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedId === p.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-xs truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{p.confidence}</p>
                </button>
              ))}
              {section === 'documents' && sourceDocuments.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedId(d.id); setSaved(false); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedId === d.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <p className="font-medium text-xs truncate">{d.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{d.category}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">{d.status}</Badge>
                  </div>
                </button>
              ))}
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

        <div className="flex-1 min-w-0">
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Settings className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Select a {section === 'programs' ? 'program' : 'document'} from the list to edit it.
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
              onSave={(updates) => {
                updateProgram(selectedProgram.id, updates);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
              }}
            />
          )}

          {section === 'documents' && selectedDocument && (
            <DocumentForm
              key={selectedDocument.id}
              document={selectedDocument}
              onSave={(updates) => {
                updateDocument(selectedDocument.id, updates);
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgramForm({
  program,
  onSave,
}: {
  program: Program;
  onSave: (updates: Partial<Program>) => void;
}) {
  const [form, setForm] = useState({
    name: program.name,
    strategicRole: program.strategicRole,
    audience: program.audience,
    coreOutcome: program.coreOutcome,
    executiveSummary: program.executiveSummary,
    whyItMatters: program.whyItMatters,
    whatBreaksIfMissing: program.whatBreaksIfMissing,
    confidence: program.confidence,
    duration: program.duration,
    format: program.format,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({
      name: program.name,
      strategicRole: program.strategicRole,
      audience: program.audience,
      coreOutcome: program.coreOutcome,
      executiveSummary: program.executiveSummary,
      whyItMatters: program.whyItMatters,
      whatBreaksIfMissing: program.whatBreaksIfMissing,
      confidence: program.confidence,
      duration: program.duration,
      format: program.format,
    });
    setDirty(false);
  }, [program.id]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(form as Partial<Program>);
    setDirty(false);
  };

  const handleCancel = () => {
    setForm({
      name: program.name,
      strategicRole: program.strategicRole,
      audience: program.audience,
      coreOutcome: program.coreOutcome,
      executiveSummary: program.executiveSummary,
      whyItMatters: program.whyItMatters,
      whatBreaksIfMissing: program.whatBreaksIfMissing,
      confidence: program.confidence,
      duration: program.duration,
      format: program.format,
    });
    setDirty(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/50">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Editing Program</p>
          <p className="text-sm font-semibold text-foreground">{program.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={!dirty}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">

          <FormRow label="Program Name">
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </FormRow>

          <FormRow label="Confidence / Data Status">
            <Select value={form.confidence} onValueChange={v => set('confidence', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed — verified against source documents</SelectItem>
                <SelectItem value="needs-review">Needs Review — some details unverified</SelectItem>
                <SelectItem value="draft">Draft — proposal stage, not active</SelectItem>
                <SelectItem value="deprecated">Deprecated — no longer current</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Strategic Role" hint="One sentence shown in the card header">
            <Input value={form.strategicRole} onChange={e => set('strategicRole', e.target.value)} />
          </FormRow>

          <FormRow label="Core Outcome" hint="Primary learner outcome shown on the map card">
            <Input value={form.coreOutcome} onChange={e => set('coreOutcome', e.target.value)} />
          </FormRow>

          <FormRow label="Audience" hint="Who this program serves">
            <Input value={form.audience} onChange={e => set('audience', e.target.value)} />
          </FormRow>

          <FormRow label="Duration">
            <Input value={form.duration} onChange={e => set('duration', e.target.value)} />
          </FormRow>

          <FormRow label="Format">
            <Input value={form.format} onChange={e => set('format', e.target.value)} />
          </FormRow>

          <FormRow label="Executive Summary" hint="2–4 sentences shown in the decision brief sidebar">
            <Textarea
              value={form.executiveSummary}
              onChange={e => set('executiveSummary', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </FormRow>

          <FormRow label="Why It Matters" hint="One strategic value statement">
            <Textarea
              value={form.whyItMatters}
              onChange={e => set('whyItMatters', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </FormRow>

          <FormRow label="What Would Break If Missing" hint="Shown as a risk callout in the decision brief">
            <Textarea
              value={form.whatBreaksIfMissing}
              onChange={e => set('whatBreaksIfMissing', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </FormRow>

          {dirty && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              You have unsaved changes. Click "Save Changes" to apply them to this session.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DocumentForm({
  document,
  onSave,
}: {
  document: SourceDocument;
  onSave: (updates: Partial<SourceDocument>) => void;
}) {
  const [form, setForm] = useState({
    name: document.name,
    status: document.status,
    confidence: document.confidence,
    owner: document.owner,
    summary: document.summary,
    purpose: document.purpose,
    quickTake: document.quickTake,
    sourceOfTruthFor: document.sourceOfTruthFor.join('\n'),
    notSourceOfTruthFor: document.notSourceOfTruthFor.join('\n'),
    keyDecisionsInfluenced: document.keyDecisionsInfluenced.join('\n'),
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({
      name: document.name,
      status: document.status,
      confidence: document.confidence,
      owner: document.owner,
      summary: document.summary,
      purpose: document.purpose,
      quickTake: document.quickTake,
      sourceOfTruthFor: document.sourceOfTruthFor.join('\n'),
      notSourceOfTruthFor: document.notSourceOfTruthFor.join('\n'),
      keyDecisionsInfluenced: document.keyDecisionsInfluenced.join('\n'),
    });
    setDirty(false);
  }, [document.id]);

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onSave({
      name: form.name,
      status: form.status as SourceDocument['status'],
      confidence: form.confidence as SourceDocument['confidence'],
      owner: form.owner,
      summary: form.summary,
      purpose: form.purpose,
      quickTake: form.quickTake,
      sourceOfTruthFor: form.sourceOfTruthFor.split('\n').map(s => s.trim()).filter(Boolean),
      notSourceOfTruthFor: form.notSourceOfTruthFor.split('\n').map(s => s.trim()).filter(Boolean),
      keyDecisionsInfluenced: form.keyDecisionsInfluenced.split('\n').map(s => s.trim()).filter(Boolean),
    });
    setDirty(false);
  };

  const handleCancel = () => {
    setForm({
      name: document.name,
      status: document.status,
      confidence: document.confidence,
      owner: document.owner,
      summary: document.summary,
      purpose: document.purpose,
      quickTake: document.quickTake,
      sourceOfTruthFor: document.sourceOfTruthFor.join('\n'),
      notSourceOfTruthFor: document.notSourceOfTruthFor.join('\n'),
      keyDecisionsInfluenced: document.keyDecisionsInfluenced.join('\n'),
    });
    setDirty(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/50">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Editing Document</p>
          <p className="text-sm font-semibold text-foreground">{document.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={!dirty}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">

          <FormRow label="Document Name">
            <Input value={form.name} onChange={e => set('name', e.target.value)} />
          </FormRow>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Status">
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Deprecated">Deprecated</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

            <FormRow label="Confidence">
              <Select value={form.confidence} onValueChange={v => set('confidence', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="needs-review">Needs Review</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          </div>

          <FormRow label="Owner">
            <Input value={form.owner} onChange={e => set('owner', e.target.value)} />
          </FormRow>

          <FormRow label="Summary" hint="1–2 sentences on what this document is">
            <Textarea
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              rows={3}
              className="resize-none"
            />
          </FormRow>

          <FormRow label="Purpose" hint="Why this document exists">
            <Textarea
              value={form.purpose}
              onChange={e => set('purpose', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </FormRow>

          <FormRow label="Quick Take" hint="One-line practical guidance shown in green callout">
            <Input value={form.quickTake} onChange={e => set('quickTake', e.target.value)} />
          </FormRow>

          <FormRow
            label="Source of Truth For"
            hint="One item per line — what this document authoritatively defines"
          >
            <Textarea
              value={form.sourceOfTruthFor}
              onChange={e => set('sourceOfTruthFor', e.target.value)}
              rows={4}
              className="resize-none font-mono text-xs"
              placeholder="One item per line"
            />
          </FormRow>

          <FormRow
            label="Not Source of Truth For"
            hint="One item per line — what this document does NOT govern"
          >
            <Textarea
              value={form.notSourceOfTruthFor}
              onChange={e => set('notSourceOfTruthFor', e.target.value)}
              rows={3}
              className="resize-none font-mono text-xs"
              placeholder="One item per line"
            />
          </FormRow>

          <FormRow
            label="Key Decisions Influenced"
            hint="One item per line"
          >
            <Textarea
              value={form.keyDecisionsInfluenced}
              onChange={e => set('keyDecisionsInfluenced', e.target.value)}
              rows={4}
              className="resize-none font-mono text-xs"
              placeholder="One item per line"
            />
          </FormRow>

          {dirty && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              You have unsaved changes. Click "Save Changes" to apply them to this session.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}
