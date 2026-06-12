import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  programDriveResources, DRIVE_STATUS_CONFIG, PERMISSIONS_CONFIG,
  type ProgramDriveResource, type DriveStatus, type PermissionsModel, type SyncStatus,
} from '@/data/programResourcesData';
import { FolderOpen, ExternalLink, Settings, AlertTriangle, CheckCircle2, Clock, Plus, Database, Layers } from 'lucide-react';

export default function ProgramResources() {
  const { setSelectedItem } = useAppContext();
  const [resources, setResources] = useState<ProgramDriveResource[]>(programDriveResources);
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
    setResources(prev => prev.map(r => r.id === editingId ? { ...r, ...editDraft } : r));
    setEditingId(null);
    setEditDraft({});
  }

  const activeCount = resources.filter(r => r.status === 'active').length;
  const needsSetupCount = resources.filter(r => r.status === 'needs-setup').length;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Administration · Program Resources</p>
          <h1 className="text-[15px] font-semibold text-foreground leading-snug">Drive Workspaces</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-2xl">
            Configure Google Drive folder URLs, permissions, and metadata for each program. Metadata stored in prototype — live Drive API planned for Q4 2025.
          </p>
        </div>

        {/* Architecture context */}
        <div className="rounded-xl border border-border bg-slate-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <p className="text-[12px] font-bold text-foreground">Salesforce</p>
              </div>
              <p className="text-[10px] text-muted-foreground">System of Record</p>
              <p className="text-[9px] text-blue-700 font-medium border border-blue-200 bg-blue-50 rounded-full px-2 py-0.5 inline-block">Program__c will store Drive metadata</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <p className="text-[12px] font-bold text-foreground">Trail OS</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Operating Layer</p>
              <p className="text-[9px] text-primary font-medium border border-primary/20 bg-primary/5 rounded-full px-2 py-0.5 inline-block">Displays + manages Drive metadata</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <FolderOpen className="w-4 h-4 text-green-600" />
                <p className="text-[12px] font-bold text-foreground">Google Drive</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Content Repository</p>
              <p className="text-[9px] text-green-700 font-medium border border-green-200 bg-green-50 rounded-full px-2 py-0.5 inline-block">Authoritative content source</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-3">
            Live Google Drive API integration (folder browsing, file sync, permissions management) is planned for Q4 2025.
            Phase 1 is metadata management only.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-white px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{resources.length}</p>
            <p className="text-[11px] text-muted-foreground">Programs</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
            <p className="text-[11px] text-green-700">Active Drives</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{needsSetupCount}</p>
            <p className="text-[11px] text-amber-700">Needs Setup</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-violet-700">{resources.filter(r => r.status === 'pending').length}</p>
            <p className="text-[11px] text-violet-700">Pending</p>
          </div>
        </div>

        {/* Program resource list */}
        <div className="space-y-3">
          {resources.map(resource => {
            const statusCfg = DRIVE_STATUS_CONFIG[resource.status];
            const isEditing = editingId === resource.id;

            return (
              <div key={resource.id} className={`rounded-xl border-2 bg-white overflow-hidden transition-all ${isEditing ? 'border-primary/30 shadow-md' : 'border-border'}`}>

                {/* Resource header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-green-700" />
                  </div>
                  <div className="flex-1">
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
                  <div className="border-t border-border bg-slate-50 p-4 space-y-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Editing — {resource.programName}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Folder Name</label>
                        <input
                          type="text"
                          value={editDraft.folderName || ''}
                          onChange={e => setEditDraft(d => ({ ...d, folderName: e.target.value }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                          placeholder="e.g. Foundations Trail — Program Workspace"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Google Drive Folder URL</label>
                        <input
                          type="url"
                          value={editDraft.folderUrl || ''}
                          onChange={e => setEditDraft(d => ({ ...d, folderUrl: e.target.value }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                          placeholder="https://drive.google.com/drive/folders/..."
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Owner</label>
                        <input
                          type="text"
                          value={editDraft.owner || ''}
                          onChange={e => setEditDraft(d => ({ ...d, owner: e.target.value }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                          placeholder="e.g. Curriculum Lead"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Status</label>
                        <select
                          value={editDraft.status || 'needs-setup'}
                          onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as DriveStatus }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
                        >
                          {Object.entries(DRIVE_STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Permissions Model</label>
                        <select
                          value={editDraft.permissionsModel || 'not-set'}
                          onChange={e => setEditDraft(d => ({ ...d, permissionsModel: e.target.value as PermissionsModel }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
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
                          value={editDraft.sharedDriveId || ''}
                          onChange={e => setEditDraft(d => ({ ...d, sharedDriveId: e.target.value }))}
                          className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary font-mono"
                          placeholder="Google Shared Drive ID (optional)"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Description</label>
                      <textarea
                        value={editDraft.description || ''}
                        onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                        rows={2}
                        className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary resize-none"
                        placeholder="Describe the content and purpose of this Drive workspace"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Notes</label>
                      <textarea
                        value={editDraft.notes || ''}
                        onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                        rows={2}
                        className="w-full text-[12px] border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary resize-none"
                        placeholder="Internal notes about this resource (not shown to learners)"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveEdit}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save Changes
                      </button>
                      <button onClick={cancelEdit}
                        className="text-[12px] font-medium text-muted-foreground border border-border rounded-lg px-4 py-2 hover:bg-muted/20 transition-colors">
                        Cancel
                      </button>
                      <p className="text-[10px] text-muted-foreground ml-2 italic">Changes are stored in-session (prototype). In production, saves to Salesforce Program_Resource__c.</p>
                    </div>
                  </div>
                )}

                {/* Collapsed details */}
                {!isEditing && (
                  <div className="border-t border-border/50 px-4 py-2 bg-slate-50/50">
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

        {/* Future integration roadmap */}
        <div className="rounded-xl border border-border bg-slate-50 p-5 space-y-3">
          <p className="text-[12px] font-bold text-foreground">Google Drive Integration Roadmap</p>
          <div className="space-y-2">
            {[
              { phase: 'Phase 1 — Now', label: 'Metadata Management', desc: 'Admin configures folder URLs, owners, permissions model, and descriptions. Displayed in Program Blueprint and Knowledge Brief.', status: 'In Progress', cls: 'text-green-700 bg-green-50 border-green-200' },
              { phase: 'Phase 2 — Q3 2025', label: 'Salesforce Sync', desc: 'Drive metadata synced to Program_Resource__c in Salesforce org. URL and status visible in SF Program record.', status: 'Planned', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
              { phase: 'Phase 3 — Q4 2025', label: 'Google Drive API Integration', desc: 'Live folder browsing, file listing, and folder structure display in Trail OS. Penny-generated content auto-saves draft to Drive.', status: 'Future', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
              { phase: 'Phase 4 — 2026', label: 'Permissions & Sync Automation', desc: 'Automated permissions management (add learner to cohort = add to Drive folder). Bi-directional sync with SF.', status: 'Future', cls: 'text-slate-600 bg-slate-50 border-slate-200' },
            ].map(item => (
              <div key={item.phase} className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <span className={`text-[9px] font-bold border rounded-full px-1.5 py-0.5 whitespace-nowrap ${item.cls}`}>{item.status}</span>
                </div>
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
