import { useState, useMemo } from 'react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import {
  HardDrive, FolderOpen, FileText, Settings, Shield, Activity, FlaskConical,
  CheckCircle, XCircle, AlertTriangle, Clock, ChevronRight, Key,
  Layers, Brain, BookOpen, Database, RefreshCw, File, Folder, Plus,
} from 'lucide-react';
import { CreatePanel } from '@/components/workspace/CreatePanel';
import {
  DRIVE_VALIDATION_CHECKS, PROGRAM_FOLDERS, DRIVE_FILES,
  CONTENT_MAPPINGS, PENNY_SOURCE_MAPPINGS, KNOWLEDGE_SOURCE_MAPPINGS,
  DRIVE_GOVERNANCE_ISSUES, DRIVE_TEST_SUITES, DRIVE_HEALTH_SCORES,
  getDriveValidationSummary, getDriveGovernanceSummary, getDriveTestSummary,
  type DriveValidationCheck, type ProgramFolder, type DriveFile,
  type PennySourceMapping, type KnowledgeSourceMapping,
  type DriveGovernanceIssue, type DriveTestSuite,
} from '@/data/googleDriveData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'planning' ? 'bg-amber-400' : status === 'current' ? 'bg-green-500' : status === 'stale' ? 'bg-red-400' : status === 'draft' ? 'bg-amber-400' : 'bg-zinc-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${c} mr-2`} />;
}
function CheckIcon({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle className="w-4 h-4 text-green-600" />;
  if (status === 'fail')    return <XCircle className="w-4 h-4 text-red-500" />;
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  if (status === 'blocked') return <XCircle className="w-4 h-4 text-red-400 opacity-60" />;
  return <Clock className="w-4 h-4 text-zinc-400" />;
}
function ReadinessBadge({ r }: { r: string }) {
  const cls = r === 'Ready' ? 'bg-green-100 text-green-700 border-green-200' : r === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' : r === 'Missing' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${cls}`}>{r}</span>;
}
function SeverityBadge({ s }: { s: string }) {
  const cls = s === 'Critical' ? 'bg-red-100 text-red-700 border-red-200' : s === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' : s === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${cls}`}>{s}</span>;
}
function TrustBadge({ t }: { t: string }) {
  const cls = t === 'Authoritative' ? 'bg-green-100 text-green-700 border-green-200' : t === 'Reference' ? 'bg-blue-100 text-blue-700 border-blue-200' : t === 'Draft' ? 'bg-amber-100 text-amber-700 border-amber-200' : t === 'Deprecated' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
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
  const valSummary  = getDriveValidationSummary();
  const govSummary  = getDriveGovernanceSummary();
  const testSummary = getDriveTestSummary();
  const healthAvg   = Math.round(DRIVE_HEALTH_SCORES.reduce((s, h) => s + (h.score / h.maxScore) * 100, 0) / DRIVE_HEALTH_SCORES.length);

  const stats = [
    { label:'Program Folders', value:'5', sub:'3 active · 2 planning',      icon:Folder,    color:'text-blue-600' },
    { label:'Files Catalogued', value:'15', sub:'12 current · 1 stale · 2 draft', icon:File,  color:'text-emerald-600' },
    { label:'Governance Issues', value:`${govSummary.critical + govSummary.high + govSummary.medium + govSummary.low}`, sub:`${govSummary.critical} critical · ${govSummary.high} high`, icon:Shield, color:'text-red-500' },
    { label:'Drive Readiness',  value:`${healthAvg}%`, sub:`${testSummary.pass}/${testSummary.total} tests passing`, icon:Activity, color:'text-amber-500' },
  ];

  const criticals = DRIVE_GOVERNANCE_ISSUES.filter(i => i.severity === 'Critical' && i.status !== 'Resolved');

  const readinessAreas = [
    { label:'Credentials & OAuth',   score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'credentials')?.score    ?? 0, max:10 },
    { label:'Folder Access',         score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'folder-access')?.score  ?? 0, max:10 },
    { label:'File Mapping',          score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'file-mapping')?.score   ?? 0, max:10 },
    { label:'Governance',            score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'governance')?.score     ?? 0, max:10 },
    { label:'Penny Source Readiness',score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'penny-sources')?.score  ?? 0, max:10 },
    { label:'Permissions',           score: DRIVE_HEALTH_SCORES.find(h => h.dimension === 'permissions')?.score    ?? 0, max:10 },
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
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">Readiness Scorecard</div>
        <div className="space-y-2">
          {readinessAreas.map(a => {
            const pct = Math.round((a.score / a.max) * 100);
            const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
            return (
              <div key={a.label} className="flex items-center gap-3">
                <div className="text-[12px] text-foreground w-44 shrink-0">{a.label}</div>
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
            {[{ label:'Pass', value: valSummary.pass, color:'text-green-600' },{ label:'Fail', value: valSummary.fail, color:'text-red-500' },{ label:'Warning', value: valSummary.warning, color:'text-amber-500' },{ label:'Pending', value: valSummary.pending, color:'text-zinc-400' }].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Go-Live Blockers</div>
          <div className="text-[12px] text-foreground space-y-1">
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_CLIENT_ID not configured</span></div>
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_CLIENT_SECRET not configured</span></div>
            <div className="flex gap-2 items-center"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>GOOGLE_DRIVE_REFRESH_TOKEN not configured</span></div>
            <div className="flex gap-2 items-center"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span>Google Drive API not verified in GCP</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Account Config Tab ────────────────────────────────────────────────────────

function AccountConfigTab() {
  const [selected, setSelected] = useState<DriveValidationCheck | null>(DRIVE_VALIDATION_CHECKS[0]);
  const summary = getDriveValidationSummary();

  const grouped = ['Credentials', 'OAuth', 'Permissions', 'Folder Access', 'File Access'] as const;

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Validation Checks</div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[{ l:'Pass', v:summary.pass, c:'text-green-600' },{ l:'Fail', v:summary.fail, c:'text-red-500' },{ l:'Warn', v:summary.warning, c:'text-amber-500' },{ l:'Pending', v:summary.pending, c:'text-zinc-400' }].map(s => (
              <div key={s.l}><div className={`text-base font-bold ${s.c}`}>{s.v}</div><div className="text-[9px] uppercase text-muted-foreground">{s.l}</div></div>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          {grouped.map(cat => {
            const checks = DRIVE_VALIDATION_CHECKS.filter(c => c.category === cat);
            if (!checks.length) return null;
            return (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold bg-muted/30 border-b border-border">{cat}</div>
                {checks.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-b border-border/40 transition-colors hover:bg-accent ${selected?.id === c.id ? 'bg-primary text-primary-foreground' : ''}`}>
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
              <InfoRow label="Status"   value={<CheckIcon status={selected.status} />} />
              <InfoRow label="Category" value={selected.category} />
              <InfoRow label="Detail"   value={<span className="text-[12px]">{selected.detail}</span>} />
              <InfoRow label="Impact"   value={<span className="text-[12px] text-amber-700">{selected.impact}</span>} />
              {selected.fix && <InfoRow label="Resolution" value={<span className="text-[12px] text-green-700">{selected.fix}</span>} />}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">Select a check to view details</div>
        )}
      </div>
    </div>
  );
}

// ── Program Folder Registry Tab ───────────────────────────────────────────────

function ProgramFolderRegistryTab() {
  const [selected, setSelected] = useState<ProgramFolder>(PROGRAM_FOLDERS[0]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          Programs — {PROGRAM_FOLDERS.length} folders mapped
        </div>
        <ScrollArea className="flex-1">
          {PROGRAM_FOLDERS.map(f => (
            <button key={f.id} onClick={() => setSelected(f)}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 transition-colors hover:bg-accent ${selected.id === f.id ? 'bg-primary text-primary-foreground' : ''}`}>
              <StatusDot status={f.status} />
              <div className="min-w-0">
                <div className={`text-[12px] font-semibold truncate ${selected.id === f.id ? 'text-primary-foreground' : 'text-foreground'}`}>{f.programName}</div>
                <div className={`text-[11px] ${selected.id === f.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{f.fileCount} files · {f.status}</div>
                <div className={`text-[10px] mt-0.5 ${selected.id === f.id ? 'text-primary-foreground/60' : 'text-muted-foreground/70'}`}>{f.trustLevel}</div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FolderOpen className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <div className="text-[16px] font-semibold text-foreground">{selected.programName}</div>
              <div className="text-[12px] text-muted-foreground font-mono">{selected.drivePath}</div>
              <div className="flex items-center gap-2 mt-1">
                <TrustBadge t={selected.trustLevel} />
                <ReadinessBadge r={selected.status === 'active' ? 'Partial' : 'Not Configured'} />
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
            <InfoRow label="Owner"       value={selected.owner} />
            <InfoRow label="Files"       value={`${selected.fileCount} files catalogued`} />
            <InfoRow label="Status"      value={<><StatusDot status={selected.status} />{selected.status}</>} />
            <InfoRow label="Trust Level" value={<TrustBadge t={selected.trustLevel} />} />
            <InfoRow label="Drive ID"    value={selected.folderId ? <span className="font-mono text-[11px]">{selected.folderId}</span> : <span className="text-amber-600">Not yet connected</span>} />
            <InfoRow label="Last Synced" value={<span className="text-amber-600">{selected.lastSynced}</span>} />
          </div>
          {selected.subFolders.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Sub-Folders ({selected.subFolders.length})</div>
              {selected.subFolders.map(sf => (
                <div key={sf.name} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40 last:border-0">
                  <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{sf.name}</div>
                    <div className="text-[11px] text-muted-foreground">{sf.purpose}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">{sf.fileCount} files</div>
                  <StatusDot status={sf.status} />
                </div>
              ))}
            </div>
          )}
          {selected.subFolders.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-700">
              No sub-folder structure defined yet. This program is in early planning phase.
            </div>
          )}
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-[12px] text-muted-foreground">
            <span className="font-medium">Notes: </span>{selected.notes}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── File & Asset Catalog Tab ──────────────────────────────────────────────────

function FileAssetCatalogTab() {
  const fileTypeIcon = (t: string) => t === 'Folder' ? Folder : t === 'Spreadsheet' ? Database : t === 'PDF' ? FileText : File;

  const items = useMemo<WorkspaceItem[]>(() => DRIVE_FILES.map(f => ({
    id: f.id,
    name: f.name,
    typeName: f.fileType,
    typeColor: f.fileType === 'PDF' ? 'text-red-600' : f.fileType === 'Spreadsheet' ? 'text-green-600' : f.fileType === 'Presentation' ? 'text-orange-500' : 'text-blue-600',
    typeBg:    f.fileType === 'PDF' ? 'bg-red-50' : f.fileType === 'Spreadsheet' ? 'bg-green-50' : f.fileType === 'Presentation' ? 'bg-orange-50' : 'bg-blue-50',
    status:    f.status,
    health:    f.status === 'current' ? 'healthy' : f.status === 'stale' ? 'needs-attention' : f.status === 'draft' ? 'needs-attention' : 'incomplete',
    secondary: f.programName,
    owner:     f.owner,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    {
      id: 'profile',
      label: 'Profile',
      render: (item) => {
        const f = DRIVE_FILES.find(x => x.id === item.id);
        if (!f) return null;
        return (
          <div className="space-y-3 p-1">
            <div className="bg-card border border-border rounded-lg divide-y divide-border/40">
              <InfoRow label="File Type"     value={f.fileType} />
              <InfoRow label="Program"       value={f.programName} />
              <InfoRow label="Folder"        value={f.folder} />
              <InfoRow label="Owner"         value={f.owner} />
              <InfoRow label="Last Modified" value={f.lastModified} />
              <InfoRow label="Size"          value={f.size} />
              <InfoRow label="Trust Level"   value={<TrustBadge t={f.trustLevel} />} />
              <InfoRow label="Status"        value={<><StatusDot status={f.status} />{f.status}</>} />
              <InfoRow label="Permissions"   value={f.permissionLevel} />
            </div>
            <div className="text-[11px] text-muted-foreground">{f.notes}</div>
          </div>
        );
      },
    },
    {
      id: 'mappings',
      label: 'Object Mappings',
      render: (item) => {
        const f = DRIVE_FILES.find(x => x.id === item.id);
        if (!f) return null;
        return (
          <div className="space-y-3 p-1">
            {f.uomMappings.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">UOM Objects</div>
                <div className="flex flex-wrap gap-1.5">
                  {f.uomMappings.map(m => <span key={m} className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200">{m}</span>)}
                </div>
              </div>
            )}
            {f.pennyMappings.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Penny Capabilities</div>
                <div className="flex flex-wrap gap-1.5">
                  {f.pennyMappings.map(m => <span key={m} className="px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 border border-purple-200">{m}</span>)}
                </div>
              </div>
            )}
            {f.knowledgeMappings.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Knowledge Sources</div>
                <div className="flex flex-wrap gap-1.5">
                  {f.knowledgeMappings.map(m => <span key={m} className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">{m}</span>)}
                </div>
              </div>
            )}
            {f.uomMappings.length === 0 && f.pennyMappings.length === 0 && f.knowledgeMappings.length === 0 && (
              <div className="text-[12px] text-muted-foreground">No object mappings defined for this file.</div>
            )}
          </div>
        );
      },
    },
  ], []);

  return <ObjectWorkspace icon={FileText} items={items} tabs={tabs} />;
}

// ── Content Mapping Tab ───────────────────────────────────────────────────────

function ContentMappingTab() {
  const [selectedFileId, setSelectedFileId] = useState<string>(CONTENT_MAPPINGS[0]?.fileId ?? '');
  const mapping = CONTENT_MAPPINGS.find(m => m.fileId === selectedFileId);

  const confidenceColor = (c: string) => c === 'High' ? 'text-green-600' : c === 'Medium' ? 'text-amber-600' : 'text-red-500';
  const statusColor     = (s: string) => s === 'Mapped' ? 'bg-green-100 text-green-700 border-green-200' : s === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {CONTENT_MAPPINGS.length} files mapped
        </div>
        <ScrollArea className="flex-1">
          {CONTENT_MAPPINGS.map(m => {
            const file = DRIVE_FILES.find(f => f.id === m.fileId);
            return (
              <button key={m.fileId} onClick={() => setSelectedFileId(m.fileId)}
                className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selectedFileId === m.fileId ? 'bg-primary text-primary-foreground' : ''}`}>
                <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${selectedFileId === m.fileId ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <div className={`text-[12px] font-medium line-clamp-2 ${selectedFileId === m.fileId ? 'text-primary-foreground' : 'text-foreground'}`}>{m.fileName}</div>
                  <div className={`text-[11px] mt-0.5 ${selectedFileId === m.fileId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{m.mappings.length} mappings</div>
                  {file && <div className={`text-[10px] ${selectedFileId === m.fileId ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{file.folder}</div>}
                </div>
              </button>
            );
          })}
        </ScrollArea>
        <div className="p-3 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
          {DRIVE_FILES.filter(f => f.uomMappings.length === 0).length} files have no UOM mappings
        </div>
      </div>
      <div className="flex-1">
        {mapping ? (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="text-[15px] font-semibold text-foreground">{mapping.fileName}</div>
              <div className="space-y-2">
                {mapping.mappings.map((entry, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted border border-border text-muted-foreground uppercase">{entry.targetType}</span>
                        <span className="text-[13px] font-medium text-foreground">{entry.targetName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-medium ${confidenceColor(entry.confidence)}`}>{entry.confidence} confidence</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${statusColor(entry.mappingStatus)}`}>{entry.mappingStatus}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{entry.relationship}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">Select a file to view its content mappings</div>
        )}
      </div>
    </div>
  );
}

// ── Penny Source Mapping Tab ──────────────────────────────────────────────────

function PennySourceMappingTab() {
  const [selected, setSelected] = useState<PennySourceMapping>(PENNY_SOURCE_MAPPINGS[0]);

  const syncColor = (s: string) => s === 'Synced' ? 'text-green-600' : s === 'Pending' ? 'text-amber-600' : s === 'Stale' ? 'text-red-500' : 'text-zinc-400';
  const roleColor = (r: string) => r === 'Primary Source' ? 'bg-purple-100 text-purple-700 border-purple-200' : r === 'Template' ? 'bg-blue-100 text-blue-700 border-blue-200' : r === 'Supporting' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200';

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {PENNY_SOURCE_MAPPINGS.length} Penny capabilities mapped
        </div>
        <ScrollArea className="flex-1">
          {PENNY_SOURCE_MAPPINGS.map(cap => (
            <button key={cap.capabilityId} onClick={() => setSelected(cap)}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.capabilityId === cap.capabilityId ? 'bg-primary text-primary-foreground' : ''}`}>
              <Brain className={`w-4 h-4 shrink-0 mt-0.5 ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground' : 'text-purple-500'}`} />
              <div className="min-w-0">
                <div className={`text-[12px] font-semibold truncate ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground' : 'text-foreground'}`}>{cap.capabilityName}</div>
                <div className={`text-[11px] ${selected.capabilityId === cap.capabilityId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{cap.domain} · {cap.sources.length} sources</div>
                <div className="mt-0.5"><ReadinessBadge r={cap.sourceReadiness} /></div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-500" />
            <div>
              <div className="text-[15px] font-semibold text-foreground">{selected.capabilityName}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">{selected.domain}</span>
                <ReadinessBadge r={selected.sourceReadiness} />
              </div>
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Drive Source Files ({selected.sources.length})</div>
          {selected.sources.map(src => {
            const file = DRIVE_FILES.find(f => f.id === src.fileId);
            return (
              <div key={src.fileId} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">{src.fileName}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${roleColor(src.role)}`}>{src.role}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Type: </span><span className="font-medium">{src.fileType}</span></div>
                  <div><span className="text-muted-foreground">Trust: </span><TrustBadge t={src.trustLevel} /></div>
                  <div><span className="text-muted-foreground">Sync: </span><span className={`font-medium ${syncColor(src.syncStatus)}`}>{src.syncStatus}</span></div>
                </div>
                {file && <div className="mt-1 text-[10px] text-muted-foreground">Folder: {file.folder} · {file.programName}</div>}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Knowledge Source Mapping Tab ──────────────────────────────────────────────

function KnowledgeSourceMappingTab() {
  const [selected, setSelected] = useState<KnowledgeSourceMapping>(KNOWLEDGE_SOURCE_MAPPINGS[0]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {KNOWLEDGE_SOURCE_MAPPINGS.length} knowledge sources
        </div>
        <ScrollArea className="flex-1">
          {KNOWLEDGE_SOURCE_MAPPINGS.map(ks => (
            <button key={ks.sourceId} onClick={() => setSelected(ks)}
              className={`w-full flex items-start gap-2 px-3 py-3 text-left border-b border-border/40 hover:bg-accent transition-colors ${selected.sourceId === ks.sourceId ? 'bg-primary text-primary-foreground' : ''}`}>
              <BookOpen className={`w-4 h-4 shrink-0 mt-0.5 ${selected.sourceId === ks.sourceId ? 'text-primary-foreground' : 'text-emerald-500'}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-[12px] font-semibold truncate ${selected.sourceId === ks.sourceId ? 'text-primary-foreground' : 'text-foreground'}`}>{ks.sourceName}</div>
                <div className={`text-[11px] ${selected.sourceId === ks.sourceId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{ks.sourceType} · {ks.driveFiles.length} files</div>
                <div className="mt-1 h-1 bg-muted/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${selected.sourceId === ks.sourceId ? 'bg-primary-foreground/70' : 'bg-emerald-400'}`} style={{ width:`${ks.completeness}%` }} />
                </div>
                <div className={`text-[10px] mt-0.5 ${selected.sourceId === ks.sourceId ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{ks.completeness}% complete</div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-[15px] font-semibold text-foreground">{selected.sourceName}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">{selected.sourceType}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase ${selected.status === 'Mapped' ? 'bg-green-100 text-green-700 border-green-200' : selected.status === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{selected.status}</span>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Completeness</span>
              <span className="text-[13px] font-bold text-foreground">{selected.completeness}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width:`${selected.completeness}%` }} />
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Drive Files ({selected.driveFiles.length})</div>
          {selected.driveFiles.map(link => (
            <div key={link.fileId} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">{link.fileName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div><span className="text-muted-foreground">Type: </span><span>{link.fileType}</span></div>
                <div><TrustBadge t={link.trustLevel} /></div>
                <div><span className="text-muted-foreground">{link.relationship}</span></div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Governance Tab ────────────────────────────────────────────────────────────

function GovernanceTab() {
  const [filter, setFilter]       = useState<string>('All');
  const [selected, setSelected]   = useState<DriveGovernanceIssue | null>(null);
  const summary = getDriveGovernanceSummary();
  const filters = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const visible = filter === 'All' ? DRIVE_GOVERNANCE_ISSUES : DRIVE_GOVERNANCE_ISSUES.filter(i => i.severity === filter);

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
        {filters.map(f => (
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
                  <div>
                    <span className="text-[11px] text-muted-foreground font-medium">Affected: </span>
                    <span className="text-[11px] text-foreground">{issue.affectedObjects.join(', ')}</span>
                  </div>
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
  const [selected, setSelected] = useState<DriveTestSuite>(DRIVE_TEST_SUITES[0]);
  const overall = getDriveTestSummary();

  const suitePassRate = (suite: DriveTestSuite) => {
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
          {DRIVE_TEST_SUITES.map(suite => {
            const pct = suitePassRate(suite);
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
  const [selected, setSelected] = useState(DRIVE_HEALTH_SCORES[0]);

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-3 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Health Dimensions</div>
        <ScrollArea className="flex-1">
          {DRIVE_HEALTH_SCORES.map(h => {
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

export default function GoogleDriveIntegrationCenter() {
  const [createMode, setCreateMode] = useState(false);
  const govSummary = getDriveGovernanceSummary();
  const criticalCount = govSummary.critical;
  const badge = criticalCount > 0 ? `${criticalCount} CRITICAL ISSUES` : 'Phase 1 — Drive Integration';

  if (createMode) {
    return (
      <CreatePanel
        title="Add Folder Mapping"
        objectType="Folder Mapping"
        subtitle="Connect a Google Drive folder to a Trail OS program, cohort, or content type."
        fields={[
          { id: 'folderName',  label: 'Folder Name',        type: 'text',     required: true, placeholder: 'e.g. Digital Literacy Trail — Cohort 3' },
          { id: 'folderId',    label: 'Google Drive Folder ID', type: 'text', placeholder: 'Paste the Drive folder ID or URL' },
          { id: 'mapTo',       label: 'Maps To',            type: 'select',   options: ['Program', 'Cohort', 'Sprint', 'Role', 'Penny Source', 'Knowledge Source'], required: true },
          { id: 'trailObject', label: 'Trail OS Object',    type: 'text',     placeholder: 'e.g. Digital Literacy Trail' },
          { id: 'contentType', label: 'Content Type',       type: 'select',   options: ['Program Materials', 'Assessments', 'Templates', 'Reference Docs', 'Media', 'Penny Knowledge'] },
          { id: 'syncEnabled', label: 'Sync to Penny',      type: 'select',   options: ['Yes — auto-sync', 'Yes — manual sync', 'No'] },
        ]}
        onClose={() => setCreateMode(false)}
        onSaveDraft={() => setCreateMode(false)}
        onSaveAndView={() => setCreateMode(false)}
      />
    );
  }

  const actions = [
    { id: 'add-folder', label: 'Add Folder Mapping', icon: Plus, onClick: () => setCreateMode(true), variant: 'primary' as const },
  ];

  return (
    <HubShell
      title="Google Drive Integration Center"
      icon={HardDrive}
      description="Drive folders and files as first-class Trail OS objects. Program Folder Registry, File Catalog, Content Mapping, Penny Source Mapping, and Governance in one place."
      badge={badge}
      actions={actions}
      tabs={[
        { id:'overview',       label:'Overview',               path:'/collaboration/drive',                  icon:Activity,    content:<OverviewTab /> },
        { id:'account',        label:'Account Config',         path:'/collaboration/drive/account',          icon:Settings,    content:<AccountConfigTab /> },
        { id:'folders',        label:'Program Folders',        path:'/collaboration/drive/folders',          icon:FolderOpen,  content:<ProgramFolderRegistryTab /> },
        { id:'catalog',        label:'File Catalog',           path:'/collaboration/drive/catalog',          icon:File,        content:<FileAssetCatalogTab /> },
        { id:'content-map',    label:'Content Mapping',        path:'/collaboration/drive/content-map',      icon:Layers,      content:<ContentMappingTab /> },
        { id:'penny-sources',  label:'Penny Sources',          path:'/collaboration/drive/penny-sources',    icon:Brain,       content:<PennySourceMappingTab /> },
        { id:'knowledge',      label:'Knowledge Sources',      path:'/collaboration/drive/knowledge',        icon:BookOpen,    content:<KnowledgeSourceMappingTab /> },
        { id:'governance',     label:'Governance',             path:'/collaboration/drive/governance',       icon:Shield,      content:<GovernanceTab /> },
        { id:'testing',        label:'Test Suite',             path:'/collaboration/drive/testing',          icon:FlaskConical, content:<TestSuiteTab /> },
        { id:'health',         label:'Health',                 path:'/collaboration/drive/health',           icon:Activity,    content:<HealthTab /> },
      ]}
    />
  );
}
