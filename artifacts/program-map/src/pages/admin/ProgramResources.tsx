import { useState } from 'react';
import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  programDriveResources, DRIVE_STATUS_CONFIG, PERMISSIONS_CONFIG,
  type ProgramDriveResource, type DriveStatus, type PermissionsModel,
} from '@/data/programResourcesData';
import { FolderOpen, ExternalLink, Settings, AlertTriangle, CheckCircle2, Database, Layers } from 'lucide-react';

// ── Persistence helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'trail-os-drive-workspaces';

function loadResources(): ProgramDriveResource[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as ProgramDriveResource[];
  } catch {}
  return programDriveResources;
}

function persistResources(resources: ProgramDriveResource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
  } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProgramResources() {
  useAppContext();
  const [resources, setResources] = useState<ProgramDriveResource[]>(loadResources);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ProgramDriveResource>>({});

  function startEdit(resource: ProgramDriveResource) {
    setEditingId(resource.id);
    setEditDraft({ ...resource });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  function saveEdit() {
    const updated = resources.map(r => r.id === editingId ? { ...r, ...editDraft } : r);
    setResources(updated);
    persistResources(updated);
    setEditingId(null);
    setEditDraft({});
  }

  const activeCount     = resources.filter(r => r.status === 'active').length;
  const needsSetupCount = resources.filter(r => r.status === 'needs-setup').length;
  const pendingCount    = resources.filter(r => r.status === 'pending').length;

  const inputCls = 'w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary';

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration · Program Resources</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-base font-semibold text-foreground leading-snug">Drive Workspaces</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Google Drive folder metadata per program. Phase 1: metadata management only — live Drive API is Phase 2.
              </p>
            </div>
          </div>
        </div>

        {/* Architecture strip */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-[12px] font-bold text-foreground">Salesforce</p>
              </div>
              <p className="text-[10px] text-muted-foreground">System of Record</p>
              <p className="text-[9px] text-blue-700 font-medium border border-blue-200 bg-blue-50 rounded-full px-2 py-0.5 inline-block">Program__c will store Drive metadata</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <p className="text-[12px] font-bold text-foreground">Trail OS</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Operating Layer</p>
              <p className="text-[9px] text-primary font-medium border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5 inline-block">Displays + manages Drive metadata</p>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-green-600" />
                <p className="text-[12px] font-bold text-foreground">Google Drive</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Content Repository</p>
              <p className="text-[9px] text-green-700 font-medium border border-green-200 bg-green-50 rounded-full px-2 py-0.5 inline-block">Authoritative content source</p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-center">
            <p className="text-xl font-bold text-foreground">{resources.length}</p>
            <p className="text-[11px] text-muted-foreground">Programs</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{activeCount}</p>
            <p className="text-[11px] text-green-700">Active Drives</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <p className="text-xl font-bold text-amber-700">{needsSetupCount}</p>
            <p className="text-[11px] text-amber-700">Needs Setup</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center">
            <p className="text-xl font-bold text-violet-700">{pendingCount}</p>
            <p className="text-[11px] text-violet-700">Pending</p>
          </div>
        </div>

        {/* Program resource list */}
        <div className="space-y-3">
          {resources.map(resource => {
            const statusCfg = DRIVE_STATUS_CONFIG[resource.status];
            const isEditing = editingId === resource.id;

            return (
              <div key={resource.id} className={`rounded-xl border bg-background overflow-hidden transition-all ${isEditing ? 'border-primary/30 shadow-sm' : 'border-border'}`}>

                {/* Resource header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-foreground">{resource.programName}</p>
                      <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{resource.folderName || 'No folder configured'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {resource.folderUrl && (
                      <a href={resource.folderUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-medium text-primary border border-primary/20 rounded-full px-2 py-1 hover:bg-primary/5">
                        <ExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                    <button
                      onClick={() => isEditing ? cancelEdit() : startEdit(resource)}
                      className={`flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-1 transition-colors ${isEditing ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-border text-muted-foreground hover:border-secondary/40'}`}
                    >
                      <Settings className="w-3 h-3" /> {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Editing — {resource.programName}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Folder Name</label>
                        <input
                          type="text"
                          value={editDraft.folderName ?? ''}
                          onChange={e => setEditDraft(d => ({ ...d, folderName: e.target.value }))}
                          className={inputCls}
                          placeholder="e.g. Foundations Trail — Program Workspace"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Google Drive Folder URL</label>
                        <input
                          type="url"
                          value={editDraft.folderUrl ?? ''}
                          onChange={e => setEditDraft(d => ({ ...d, folderUrl: e.target.value }))}
                          className={inputCls}
                          placeholder="https://drive.google.com/drive/folders/..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Owner</label>
                        <input
                          type="text"
                          value={editDraft.owner ?? ''}
                          onChange={e => setEditDraft(d => ({ ...d, owner: e.target.value }))}
                          className={inputCls}
                          placeholder="e.g. Curriculum Lead"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Status</label>
                        <select
                          value={editDraft.status ?? 'needs-setup'}
                          onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as DriveStatus }))}
                          className={inputCls}
                        >
                          {Object.entries(DRIVE_STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Permissions Model</label>
                        <select
                          value={editDraft.permissionsModel ?? 'not-set'}
                          onChange={e => setEditDraft(d => ({ ...d, permissionsModel: e.target.value as PermissionsModel }))}
                          className={inputCls}
                        >
                          {Object.entries(PERMISSIONS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                          Shared Drive ID
                          <span className="ml-1 text-[9px] text-muted-foreground font-normal">(future API access)</span>
                        </label>
                        <input
                          type="text"
                          value={editDraft.sharedDriveId ?? ''}
                          onChange={e => setEditDraft(d => ({ ...d, sharedDriveId: e.target.value }))}
                          className={`${inputCls} font-mono`}
                          placeholder="Google Shared Drive ID (optional)"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Description</label>
                      <textarea
                        value={editDraft.description ?? ''}
                        onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                        rows={2}
                        className={`${inputCls} resize-none`}
                        placeholder="Describe the content and purpose of this Drive workspace"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Notes</label>
                      <textarea
                        value={editDraft.notes ?? ''}
                        onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                        rows={2}
                        className={`${inputCls} resize-none`}
                        placeholder="Internal notes about this resource (not shown to learners)"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveEdit}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-primary-foreground bg-primary border border-primary rounded-full px-4 py-1.5 hover:bg-primary/90 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save Changes
                      </button>
                      <button onClick={cancelEdit}
                        className="text-[12px] font-medium text-muted-foreground border border-border rounded-full px-4 py-1.5 hover:bg-muted/20 transition-colors">
                        Cancel
                      </button>
                      <p className="text-[10px] text-muted-foreground ml-2 italic">Changes persist across navigation · In production, saves to Salesforce Program_Resource__c.</p>
                    </div>
                  </div>
                )}

                {/* Collapsed details */}
                {!isEditing && (
                  <div className="border-t border-border/50 px-4 py-2 bg-muted/10">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Owner: <strong className="text-foreground">{resource.owner}</strong></span>
                      <span>Permissions: <strong className="text-foreground">{PERMISSIONS_CONFIG[resource.permissionsModel].label}</strong></span>
                      <span>Sync: <strong className="text-foreground capitalize">{resource.syncStatus.replace(/-/g, ' ')}</strong></span>
                      <span>Updated: <strong className="text-foreground">{resource.lastUpdated}</strong></span>
                      {resource.subFolders.length > 0 && <span><strong className="text-foreground">{resource.subFolders.length}</strong> sub-folders</span>}
                      {resource.contentTypes.length > 0 && <span><strong className="text-foreground">{resource.contentTypes.length}</strong> content types</span>}
                    </div>
                    {resource.notes && (
                      <p className="text-[10px] text-amber-700 mt-1 italic">{resource.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Integration roadmap */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-[12px] font-bold text-foreground">Google Drive Integration Roadmap</p>
          <div className="space-y-2">
            {[
              { phase: 'Phase 1 — Complete', label: 'Metadata Management', desc: 'Admin configures folder URLs, owners, permissions model, and descriptions. Displayed in Program Blueprint and Knowledge Brief.', status: 'Complete', cls: 'text-green-700 bg-green-50 border-green-200' },
              { phase: 'Phase 2 — Planned', label: 'Salesforce Sync', desc: 'Drive metadata synced to Program_Resource__c in Salesforce org. URL and status visible in SF Program record.', status: 'Planned', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
              { phase: 'Phase 3 — Future', label: 'Google Drive API Integration', desc: `Live folder browsing, file listing, and folder structure display in Trail OS. ${TERMS.aiAssistant}-generated content auto-saves draft to Drive.`, status: 'Future', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
              { phase: 'Phase 4 — Future', label: 'Permissions & Sync Automation', desc: 'Automated permissions management (add learner to cohort = add to Drive folder). Bi-directional sync with Salesforce.', status: 'Future', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
            ].map(item => (
              <div key={item.phase} className="flex items-start gap-3">
                <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 whitespace-nowrap shrink-0 mt-0.5 ${item.cls}`}>{item.status}</span>
                <div>
                  <p className="text-[11px] font-bold text-foreground">{item.phase} — {item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ScrollArea>
  );
}
