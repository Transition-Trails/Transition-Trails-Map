// KnowledgeSourcesAdmin — replaces the read-only KnowledgeWorkspace at /knowledge/sources.
// Admin table + edit drawer with type-specific connection fields, including a real Drive folder picker.

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, FolderOpen, Database, Link as LinkIcon,
  Edit, X, ChevronDown, ExternalLink, RefreshCw,
  CheckCircle2, AlertCircle, XCircle, Loader2,
  ChevronRight, Home, CornerDownRight,
} from 'lucide-react';
import type { KnowledgeSource, SourceType, TrustLevel, SyncStatus, HealthStatus } from '@/data/knowledgeSourceData';
import { useKnowledgeSources } from '@/hooks/useKnowledgeSources';

// ── API helpers ────────────────────────────────────────────────────────────────

async function patchSource(id: string, patch: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
  const r = await fetch(`/api/knowledge/sources/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { source: KnowledgeSource };
  return data.source;
}

async function postSource(body: Partial<KnowledgeSource>): Promise<KnowledgeSource> {
  const r = await fetch('/api/knowledge/sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json() as { source: KnowledgeSource };
  return data.source;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface DriveFolder { id: string; name: string; webViewLink?: string; modifiedTime?: string; path?: string; }

// ── Style helpers ──────────────────────────────────────────────────────────────

const TRUST_CLASSES: Record<TrustLevel, string> = {
  Authoritative: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]',
  Trusted:       'text-[#2F6F7E] bg-[#EDF5F8] border-[#B6D8E4]',
  Curated:       'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]',
  Unverified:    'text-muted-foreground bg-muted border-border',
};

const SYNC_DOT: Record<string, string> = {
  Live:         'bg-[#2F6B3F]',
  Manual:       'bg-[#CC8400]',
  Disconnected: 'bg-[#8B2A2A]',
  Planned:      'bg-muted-foreground',
  Future:       'bg-muted-foreground',
};

function healthIcon(h: HealthStatus) {
  if (h === 'Healthy')  return <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" />;
  if (h === 'Warning')  return <AlertCircle  className="w-3.5 h-3.5 text-[#CC8400]" />;
  if (h === 'Critical') return <XCircle      className="w-3.5 h-3.5 text-[#8B2A2A]" />;
  return <span className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30 inline-block" />;
}

function SourceTypeIcon({ type, className = 'w-4 h-4 text-muted-foreground' }: { type: SourceType; className?: string }) {
  if (type === 'Google Drive')        return <FolderOpen className={className} />;
  if (type === 'Salesforce Knowledge') return <Database  className={className} />;
  return <LinkIcon className={className} />;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="p-4 rounded-lg border bg-card shadow-sm">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

// ── Collapsible drawer section ─────────────────────────────────────────────────

function Section({
  title, defaultOpen = false, badge, children,
}: { title: string; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-4 border-t space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
        <span>{label}</span>
        {required && <span className="font-normal text-muted-foreground/70 normal-case">Required</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {children}
    </select>
  );
}

// ── Drive folder picker ────────────────────────────────────────────────────────

interface BreadcrumbItem { id: string; name: string; }

const DRIVE_PICKER_STORAGE_KEY = 'drive-picker-breadcrumbs';

function loadSavedBreadcrumbs(): BreadcrumbItem[] | null {
  try {
    const raw = localStorage.getItem(DRIVE_PICKER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every(
        (x): x is BreadcrumbItem =>
          typeof x === 'object' && x !== null &&
          typeof (x as BreadcrumbItem).id === 'string' &&
          typeof (x as BreadcrumbItem).name === 'string',
      )
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveBreadcrumbs(crumbs: BreadcrumbItem[]) {
  try {
    if (crumbs.length === 0) {
      localStorage.removeItem(DRIVE_PICKER_STORAGE_KEY);
    } else {
      localStorage.setItem(DRIVE_PICKER_STORAGE_KEY, JSON.stringify(crumbs));
    }
  } catch {
    // ignore storage errors (private browsing, quota)
  }
}

function DriveFolderPicker({
  value, folderName, onChange,
}: {
  value: string;
  folderName: string;
  onChange: (url: string, name: string) => void;
}) {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState('');
  const [folders, setFolders]         = useState<DriveFolder[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [folderGone, setFolderGone]   = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const pickerRef                     = useRef<HTMLDivElement>(null);

  const currentParentId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : 'root';
  // When a non-empty query is typed, we search globally across all of Drive
  const isGlobalSearch = query.length > 0;

  // Close picker when clicking outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function fetchFolders(parentId: string, q = '', globalSearch = false): Promise<{ ok: boolean }> {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (globalSearch) {
        params.set('global', 'true');
      } else if (parentId !== 'root') {
        params.set('parent', parentId);
      }
      if (q) params.set('q', q);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const r  = await fetch(`/api/drive/folders${qs}`);
      const d  = await r.json() as { folders: DriveFolder[]; error?: string };
      if (!r.ok || d.error) throw new Error(d.error ?? `HTTP ${r.status}`);
      setFolders(d.folders);
      return { ok: true };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load folders');
      setFolders([]);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }

  async function browse() {
    setOpen(true);
    setQuery('');
    setFolderGone(false);
    // Restore the last-browsed position for this session
    const saved = loadSavedBreadcrumbs();
    if (saved) {
      setBreadcrumbs(saved);
      const result = await fetchFolders(saved[saved.length - 1].id);
      if (!result.ok) {
        // Folder no longer accessible — clear saved state and fall back to root
        setBreadcrumbs([]);
        saveBreadcrumbs([]);
        setFolderGone(true);
        setError('');
        void fetchFolders('root');
      }
    } else {
      setBreadcrumbs([]);
      void fetchFolders('root');
    }
  }

  function navigateInto(f: DriveFolder) {
    const next = [...breadcrumbs, { id: f.id, name: f.name }];
    setBreadcrumbs(next);
    saveBreadcrumbs(next);
    setQuery('');
    fetchFolders(f.id);
  }

  function navigateTo(index: number) {
    // index === -1 → root "My Drive"
    if (index === -1) {
      setBreadcrumbs([]);
      saveBreadcrumbs([]);
      setQuery('');
      fetchFolders('root');
    } else {
      const next = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(next);
      saveBreadcrumbs(next);
      setQuery('');
      fetchFolders(next[index].id);
    }
  }

  function search(q: string) {
    setQuery(q);
    if (q) {
      // Non-empty query → global search across all of Drive
      fetchFolders('root', q, true);
    } else {
      // Cleared → return to local browse at current position
      fetchFolders(currentParentId);
    }
  }

  function select(f: DriveFolder) {
    onChange(f.webViewLink ?? `https://drive.google.com/drive/folders/${f.id}`, f.name);
    setOpen(false);
  }

  function selectCurrent() {
    if (breadcrumbs.length === 0) return;
    const cur = breadcrumbs[breadcrumbs.length - 1];
    onChange(`https://drive.google.com/drive/folders/${cur.id}`, cur.name);
    setOpen(false);
  }

  const displayUrl  = value;
  const displayName = folderName || (value ? value.replace('https://drive.google.com/drive/folders/', '').slice(0, 20) + '…' : '');

  return (
    <div className="space-y-1.5" ref={pickerRef}>
      {/* Current value row */}
      {displayName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#E6F0EA] border border-[#9FC3AE] rounded-md text-[12px] text-[#2F6B3F]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium truncate flex-1">{displayName}</span>
          <a href={displayUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:opacity-70">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button type="button" onClick={() => onChange('', '')} className="hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input + Browse button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FolderOpen className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={displayUrl}
            onChange={e => onChange(e.target.value, '')}
            placeholder="Paste a Drive folder URL, or browse below…"
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={browse}
          className="h-9 shrink-0 inline-flex items-center gap-1.5 px-3 border rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Browse
        </button>
      </div>

      {/* Picker dropdown */}
      {open && (
        <div className="border rounded-lg bg-background shadow-lg overflow-hidden">

          {/* Breadcrumb trail */}
          <div className="flex items-center gap-0.5 px-3 py-2 border-b bg-muted/20 flex-wrap">
            <button
              type="button"
              onClick={() => navigateTo(-1)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-3 h-3" />
              <span>My Drive</span>
            </button>
            {breadcrumbs.map((bc, i) => (
              <span key={bc.id} className="flex items-center gap-0.5">
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => navigateTo(i)}
                  className={`text-[11px] font-medium transition-colors max-w-[120px] truncate ${
                    i === breadcrumbs.length - 1
                      ? 'text-foreground cursor-default'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {bc.name}
                </button>
              </span>
            ))}
            {/* Select current folder button — only shown when inside a subfolder */}
            {breadcrumbs.length > 0 && (
              <button
                type="button"
                onClick={selectCurrent}
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-primary hover:opacity-70 transition-opacity shrink-0"
              >
                <CheckCircle2 className="w-3 h-3" />
                Select this folder
              </button>
            )}
          </div>

          {/* Fallback notice when the last-browsed folder is no longer accessible */}
          {folderGone && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-[#CC8400] bg-[#FFF3E0] border-b border-[#FFD08A]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Last folder no longer accessible — starting from My Drive
            </div>
          )}

          {/* Search within picker */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => search(e.target.value)}
                placeholder="Search all Drive folders…"
                className="w-full h-8 pl-8 pr-3 text-sm bg-muted/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {isGlobalSearch && (
              <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                Searching all folders in Drive
              </p>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {isGlobalSearch ? 'Searching Drive…' : 'Loading folders…'}
              </div>
            ) : error ? (
              <div className="px-3 py-3 text-sm text-[#8B2A2A]">{error}</div>
            ) : folders.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                {isGlobalSearch ? 'No folders match that name.' : breadcrumbs.length > 0 ? 'No subfolders here.' : 'No folders found.'}
              </div>
            ) : folders.map(f => (
              <div
                key={f.id}
                className="group flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                {/* Navigate into folder */}
                <button
                  type="button"
                  onClick={() => navigateInto(f)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  title="Open folder"
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    {/* Show ancestor path for global search results; modified date for local browse */}
                    {isGlobalSearch && f.path ? (
                      <p className="text-[11px] text-muted-foreground truncate">{f.path}</p>
                    ) : !isGlobalSearch && f.modifiedTime ? (
                      <p className="text-[11px] text-muted-foreground">
                        Modified {new Date(f.modifiedTime).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                {/* Select this folder */}
                <button
                  type="button"
                  onClick={() => select(f)}
                  title="Select this folder"
                  className="shrink-0 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 hover:underline transition-opacity whitespace-nowrap"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Connection section (type-specific) ────────────────────────────────────────

function ConnectionSection({
  source, draft, onChange,
}: {
  source: KnowledgeSource;
  draft: Partial<KnowledgeSource>;
  onChange: (patch: Partial<KnowledgeSource>) => void;
}) {
  const t = source.type;

  if (t === 'Google Drive') {
    const url  = (draft.driveFolderUrl  ?? source.driveFolderUrl)  ?? '';
    const name = (draft.driveFolderName ?? source.driveFolderName) ?? '';
    const freq = (draft.driveSyncFrequency ?? source.driveSyncFrequency) ?? 'live';

    return (
      <>
        <Field
          label="Drive folder"
          hint="Select a folder to index all files inside it, or paste a file URL for a single document."
        >
          <DriveFolderPicker
            value={url}
            folderName={name}
            onChange={(u, n) => onChange({ driveFolderUrl: u, driveFolderName: n })}
          />
        </Field>

        <Field label="Sync frequency">
          <Select value={freq} onChange={v => onChange({ driveSyncFrequency: v as KnowledgeSource['driveSyncFrequency'] })}>
            <option value="live">Live — auto-sync on file change</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="manual">Manual only</option>
          </Select>
        </Field>

        {source.driveLastSynced && !draft.driveFolderUrl && (
          <div className="flex items-center justify-between rounded-md px-3 py-2.5 text-[12px] bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F]">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Last synced {source.driveLastSynced}
            </span>
            <button type="button" className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70">
              <RefreshCw className="w-3 h-3" /> Sync now
            </button>
          </div>
        )}
      </>
    );
  }

  if (t === 'Salesforce Knowledge') {
    const cat    = (draft.sfCategory     ?? source.sfCategory)     ?? '';
    const filter = (draft.sfArticleFilter ?? source.sfArticleFilter) ?? 'published';

    return (
      <>
        <Field label="Article category" hint="Penny will retrieve articles from this Salesforce Knowledge category.">
          <Select value={cat} onChange={v => onChange({ sfCategory: v })}>
            <option value="">— Select a category —</option>
            <option value="Mission &amp; Delivery">Mission &amp; Delivery</option>
            <option value="Trail OS Operations">Trail OS Operations</option>
            <option value="Coaching Protocols">Coaching Protocols</option>
            <option value="Client Case Management">Client Case Management</option>
            <option value="Program Administration">Program Administration</option>
            <option value="Technical Support">Technical Support</option>
          </Select>
        </Field>

        <Field label="Article filter">
          <Select value={filter} onChange={v => onChange({ sfArticleFilter: v as KnowledgeSource['sfArticleFilter'] })}>
            <option value="published">Published articles only</option>
            <option value="published_draft">Published + Draft</option>
            <option value="all">All statuses</option>
          </Select>
        </Field>

        {cat ? (
          <div className="flex items-center justify-between rounded-md px-3 py-2.5 text-[12px] bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F]">
            <span className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salesforce connected · pulling from "{cat}"
            </span>
            <button type="button" className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70">
              <RefreshCw className="w-3 h-3" /> Re-sync
            </button>
          </div>
        ) : (
          <div className="rounded-md px-3 py-2.5 text-[12px] bg-[#FAE6E6] border border-[#F0BDBD] text-[#8B2A2A] font-medium">
            No category selected — connection incomplete
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The Salesforce integration is managed under{' '}
          <a href="/admin/integrations" className="underline hover:text-foreground">Admin → Integrations</a>.
          Reconnect there if the sync status shows Disconnected.
        </p>
      </>
    );
  }

  if (t === 'LMS Content' || t === 'Assessments' || t === 'Standards Studio' || t === 'Curriculum Studio') {
    return (
      <div className="rounded-md px-4 py-3 bg-muted/30 border text-sm text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-1">Managed by integration</p>
        This source is connected via the <strong>{t}</strong> integration. Connection settings are
        configured under{' '}
        <a href="/admin/integrations" className="underline hover:text-foreground">Admin → Integrations</a>.
      </div>
    );
  }

  // Custom / generic URL-based source
  const url  = (draft.linkUrl           ?? source.linkUrl)          ?? '';
  const freq = (draft.linkCheckFrequency ?? source.linkCheckFrequency) ?? 'weekly';

  return (
    <>
      <Field label="URL" hint="Penny will fetch and index this page's content. Public pages only — authentication-gated pages won't work.">
        <div className="relative">
          <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={e => onChange({ linkUrl: e.target.value })}
            placeholder="https://…"
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </Field>

      <Field label="Re-check frequency">
        <Select value={freq} onChange={v => onChange({ linkCheckFrequency: v as KnowledgeSource['linkCheckFrequency'] })}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="manual">Manual only</option>
        </Select>
      </Field>

      {!url && (
        <div className="rounded-md px-3 py-2.5 text-[12px] bg-[#FAE6E6] border border-[#F0BDBD] text-[#8B2A2A] font-medium">
          No URL configured — source will not index any content
        </div>
      )}
    </>
  );
}

// ── Edit drawer ────────────────────────────────────────────────────────────────

function EditDrawer({
  source, onClose, onSave, isSaving,
}: {
  source: KnowledgeSource;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeSource>) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<Partial<KnowledgeSource>>({});
  function patch(p: Partial<KnowledgeSource>) { setDraft(d => ({ ...d, ...p })); }

  const hasConnectionGap =
    (source.type === 'Google Drive' && !(draft.driveFolderUrl ?? source.driveFolderUrl)) ||
    (source.type === 'Salesforce Knowledge' && !(draft.sfCategory ?? source.sfCategory)) ||
    (['Penny Generated', 'Slack History', 'Google Chat History', 'Calendar Events'].includes(source.type) === false &&
      source.type !== 'Google Drive' &&
      source.type !== 'Salesforce Knowledge' &&
      source.type !== 'LMS Content' &&
      source.type !== 'Assessments' &&
      source.type !== 'Standards Studio' &&
      source.type !== 'Curriculum Studio' &&
      !(draft.linkUrl ?? source.linkUrl));

  return (
    <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
      {/* Scrim */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="w-[480px] bg-background h-full shadow-2xl border-l flex flex-col relative">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b bg-card">
          <div>
            <h2 className="text-base font-semibold">{source.name}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <SourceTypeIcon type={source.type} className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{source.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Identity */}
          <Section title="Identity">
            <Field label="Source name">
              <input
                type="text"
                value={draft.name ?? source.name}
                onChange={e => patch({ name: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Owner">
              <input
                type="text"
                value={draft.owner ?? source.owner}
                onChange={e => patch({ owner: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={draft.description ?? source.description}
                onChange={e => patch({ description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </Field>
          </Section>

          {/* Connection — type-specific */}
          <Section
            title="Connection"
            defaultOpen
            badge={
              hasConnectionGap ? (
                <span className="inline-flex items-center rounded-full bg-[#FAE6E6] border border-[#F0BDBD] px-2 py-0.5 text-[10px] font-semibold text-[#8B2A2A]">
                  Incomplete
                </span>
              ) : undefined
            }
          >
            <ConnectionSection source={source} draft={draft} onChange={patch} />
          </Section>

          {/* Governance */}
          <Section title="Governance">
            <Field label="Trust level">
              <Select
                value={draft.trustLevel ?? source.trustLevel}
                onChange={v => patch({ trustLevel: v as TrustLevel })}
              >
                <option>Authoritative</option>
                <option>Trusted</option>
                <option>Curated</option>
                <option>Unverified</option>
              </Select>
            </Field>
            <Field label="Sync status">
              <Select
                value={draft.syncStatus ?? source.syncStatus}
                onChange={v => patch({ syncStatus: v as SyncStatus })}
              >
                <option>Live</option>
                <option>Manual</option>
                <option>Disconnected</option>
                <option>Planned</option>
                <option>Future</option>
              </Select>
            </Field>
            <Field label="Review cycle">
              <input
                type="text"
                value={draft.reviewCycle ?? source.reviewCycle}
                onChange={e => patch({ reviewCycle: e.target.value })}
                placeholder="e.g. Quarterly"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </Field>
          </Section>

          {/* Penny config */}
          <Section title="Penny Configuration">
            <div className="flex items-center justify-between py-0.5">
              <div>
                <p className="text-sm font-medium">Approved for Penny</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Allow Penny to retrieve from this source</p>
              </div>
              <button
                type="button"
                onClick={() => patch({ approvedForPenny: !(draft.approvedForPenny ?? source.approvedForPenny) })}
                className={`w-9 h-5 rounded-full relative focus:outline-none shadow-inner transition-colors ${
                  (draft.approvedForPenny ?? source.approvedForPenny) ? 'bg-[#2F6B3F]' : 'bg-muted-foreground/30'
                }`}
              >
                <span className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${
                  (draft.approvedForPenny ?? source.approvedForPenny) ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <Field label="Use description" required hint="Penny uses this to decide when to search this source.">
              <textarea
                value={draft.pennyUseDescription ?? source.pennyUseDescription}
                onChange={e => patch({ pennyUseDescription: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                placeholder="Describe what questions or scenarios this source should answer…"
              />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-card flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={isSaving || Object.keys(draft).length === 0}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New source drawer ─────────────────────────────────────────────────────────

const NEW_SOURCE_TYPES: SourceType[] = ['Google Drive', 'Salesforce Knowledge', 'Google Drive']; // reuse for 3 canonical types

function NewSourceDrawer({
  onClose, onCreate, isCreating,
}: {
  onClose: () => void;
  onCreate: (body: Partial<KnowledgeSource>) => void;
  isCreating: boolean;
}) {
  const [step, setStep]   = useState<'type' | 'connection'>('type');
  const [type, setType]   = useState<SourceType | null>(null);
  const [name, setName]   = useState('');
  const [draft, setDraft] = useState<Partial<KnowledgeSource>>({});

  const TYPE_OPTIONS: { value: SourceType; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'Google Drive',         label: 'Google Drive',          desc: 'Index files and folders from your connected Google Drive.', icon: <FolderOpen className="w-5 h-5" /> },
    { value: 'Salesforce Knowledge', label: 'Salesforce Knowledge',  desc: 'Pull articles from a Salesforce Knowledge category.', icon: <Database className="w-5 h-5" /> },
    { value: 'Slack History',        label: 'External / Custom URL', desc: 'Index a public web page or external knowledge base URL.', icon: <LinkIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[480px] bg-background h-full shadow-2xl border-l flex flex-col relative">
        <div className="flex items-start justify-between px-6 py-5 border-b bg-card">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {step === 'type' ? 'Step 1 of 2' : 'Step 2 of 2'}
            </p>
            <h2 className="text-base font-semibold">{step === 'type' ? 'Choose a source type' : 'Configure connection'}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 'type' ? (
            <div className="space-y-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setType(opt.value); setStep('connection'); }}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all border-border hover:border-primary/40 hover:bg-muted/30 active:border-primary active:bg-primary/5"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${type === opt.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Source name" required>
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Coaching Protocol Library"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="border-t pt-4">
                {type && (
                  <ConnectionSection
                    source={{ ...({} as KnowledgeSource), type: type }}
                    draft={draft}
                    onChange={p => setDraft(d => ({ ...d, ...p }))}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-card flex justify-between gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          {step === 'connection' ? (
            <button onClick={() => setStep('type')} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              Cancel
            </button>
          )}
          {step === 'type' ? (
            <button
              onClick={() => setStep('connection')}
              disabled={!type}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={() => onCreate({ ...draft, name, type: type ?? 'Google Drive' })}
              disabled={isCreating || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {isCreating ? 'Creating…' : 'Create Source'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Table tab ──────────────────────────────────────────────────────────────────

type TabId = 'all' | 'drive' | 'salesforce' | 'other';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',       label: 'All Sources' },
  { id: 'drive',     label: 'Google Drive' },
  { id: 'salesforce',label: 'Salesforce KB' },
  { id: 'other',     label: 'Other' },
];

// ── Connection column preview ──────────────────────────────────────────────────

function ConnectionPreview({ source }: { source: KnowledgeSource }) {
  if (source.type === 'Google Drive') {
    return source.driveFolderName || source.driveFolderUrl ? (
      <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">
        {source.driveFolderName ?? source.driveFolderUrl?.replace('https://drive.google.com/drive/folders/', '').slice(0, 20) + '…'}
      </span>
    ) : (
      <span className="text-[12px] text-[#8B2A2A]">No folder linked</span>
    );
  }
  if (source.type === 'Salesforce Knowledge') {
    return source.sfCategory ? (
      <span className="text-[12px] text-muted-foreground">{source.sfCategory}</span>
    ) : (
      <span className="text-[12px] text-[#8B2A2A]">No category</span>
    );
  }
  if (source.linkUrl) {
    return <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">{source.linkUrl.replace('https://', '').slice(0, 30)}…</span>;
  }
  return <span className="text-[12px] text-muted-foreground">Via integration</span>;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function KnowledgeSourcesAdmin() {
  const qc = useQueryClient();
  const { sources, summary, isLoading, isError } = useKnowledgeSources();

  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState<TabId>('all');
  const [editSource, setEditSource]       = useState<KnowledgeSource | null>(null);
  const [showNewDrawer, setShowNewDrawer] = useState(false);

  // PATCH mutation
  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<KnowledgeSource> }) => patchSource(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['knowledge-sources'] });
      setEditSource(null);
    },
  });

  // POST mutation
  const createMutation = useMutation({
    mutationFn: (body: Partial<KnowledgeSource>) => postSource(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['knowledge-sources'] });
      setShowNewDrawer(false);
    },
  });

  // Filtered sources
  const filtered = sources.filter(s => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'drive'     && s.type === 'Google Drive') ||
      (activeTab === 'salesforce' && s.type === 'Salesforce Knowledge') ||
      (activeTab === 'other'     && s.type !== 'Google Drive' && s.type !== 'Salesforce Knowledge');
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading knowledge sources…
    </div>
  );

  if (isError) return (
    <div className="flex items-center justify-center h-64 text-sm text-[#8B2A2A]">
      Failed to load knowledge sources. Check the API server.
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col relative">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm z-10 relative">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Knowledge</p>
          <h1 className="text-base font-semibold mt-0.5">Knowledge Sources</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="text"
              placeholder="Search sources…"
              className="h-9 w-60 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowNewDrawer(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Source
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-[1400px] mx-auto w-full">
        {/* Stat strip */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Sources"   value={summary.total} />
          <StatCard title="Google Drive"    value={sources.filter(s => s.type === 'Google Drive').length} />
          <StatCard title="Salesforce KB"   value={sources.filter(s => s.type === 'Salesforce Knowledge').length} />
          <StatCard title="Penny-Enabled"   value={summary.approvedForPenny} />
        </div>

        {/* Table card */}
        <div className="bg-card border rounded-lg shadow-sm flex flex-col">
          {/* Tabs */}
          <div className="border-b px-4 flex items-center gap-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase text-muted-foreground bg-muted/40 font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Name &amp; Type</th>
                  <th className="px-4 py-3 font-medium">Connection</th>
                  <th className="px-4 py-3 font-medium">Trust</th>
                  <th className="px-4 py-3 font-medium">Sync</th>
                  <th className="px-4 py-3 font-medium">Penny</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No sources match your filters.
                    </td>
                  </tr>
                ) : filtered.map(source => {
                  const isActive = editSource?.id === source.id;
                  return (
                    <tr
                      key={source.id}
                      className={`group h-14 transition-colors ${isActive ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <td className="px-4 py-2 w-[30%]">
                        <div className="flex items-start gap-3">
                          <SourceTypeIcon type={source.type} className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{source.name}</p>
                            <p className="text-[11px] text-muted-foreground">{source.type} · {source.owner}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 w-[22%]">
                        <div className="flex items-center gap-1.5">
                          <SourceTypeIcon type={source.type} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <ConnectionPreview source={source} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TRUST_CLASSES[source.trustLevel]}`}>
                          {source.trustLevel}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${SYNC_DOT[source.syncStatus] ?? 'bg-muted-foreground'}`} />
                          <span className="text-[13px]">{source.syncStatus}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className={`w-8 h-4 rounded-full relative shadow-inner border border-transparent ${source.approvedForPenny ? 'bg-[#2F6B3F]' : 'bg-muted-foreground/30'}`}>
                          <span className={`absolute top-[1px] left-[1px] bg-white w-3.5 h-3.5 rounded-full shadow-sm transition-transform ${source.approvedForPenny ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          {healthIcon(source.healthStatus)}
                          <span className="text-[11px] capitalize text-muted-foreground font-medium">{source.healthStatus}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setEditSource(isActive ? null : source)}
                          className={`p-1.5 rounded-md transition-all ${
                            isActive
                              ? 'text-primary bg-primary/10'
                              : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit drawer */}
      {editSource && (
        <EditDrawer
          source={editSource}
          onClose={() => setEditSource(null)}
          onSave={patch => patchMutation.mutate({ id: editSource.id, patch })}
          isSaving={patchMutation.isPending}
        />
      )}

      {/* New source drawer */}
      {showNewDrawer && (
        <NewSourceDrawer
          onClose={() => setShowNewDrawer(false)}
          onCreate={body => createMutation.mutate(body)}
          isCreating={createMutation.isPending}
        />
      )}
    </div>
  );
}
