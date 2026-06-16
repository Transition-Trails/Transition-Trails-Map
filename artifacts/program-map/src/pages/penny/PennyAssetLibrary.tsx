import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, Layers, FileText, Mic, Play, CheckCircle2,
  Image, Music, Video, File, ExternalLink, RefreshCw,
  HardDrive, AlertTriangle, LayoutGrid, List, AlertCircle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriveFile {
  id:            string;
  name:          string;
  mimeType:      string;
  thumbnailLink?: string;
  webViewLink?:  string;
  modifiedTime?: string;
  size?:         string;
}

interface AssetGroup {
  state:      string;
  folderId:   string;
  folderName: string;
  files:      DriveFile[];
}

interface PennyAssetsResponse {
  configured:  boolean;
  message?:    string;
  error?:      string;
  folderId:    string | null;
  folderName:  string | null;
  groups:      AssetGroup[];
  ungrouped:   DriveFile[];
}

interface DriveStatusResponse {
  connected:             boolean;
  reason?:               string;
  pennyFolderConfigured: boolean;
  pennyFolderId?:        string | null;
}

// ── State definitions ─────────────────────────────────────────────────────────

interface PennyStateConfig {
  id:         string;
  label:      string;
  sub:        string;
  icon:       React.ElementType;
  accent:     string;
  lightBg:    string;
  folderHint: string;
}

const PENNY_STATES: PennyStateConfig[] = [
  { id: 'coaching',           label: 'Coaching',           sub: 'Check-ins & goal setting',       icon: Sparkles,     accent: '#7c3aed', lightBg: '#f5f3ff', folderHint: 'coaching'           },
  { id: 'trail-talk',         label: 'Trail Talk',         sub: 'Group sessions & presentations', icon: Layers,       accent: '#0284c7', lightBg: '#f0f9ff', folderHint: 'trail-talk'         },
  { id: 'resume-review',      label: 'Resume Review',      sub: 'Career documents & CV feedback', icon: FileText,     accent: '#059669', lightBg: '#f0fdf4', folderHint: 'resume-review'      },
  { id: 'interview-prep',     label: 'Interview Prep',     sub: 'Mock interviews & frameworks',   icon: Mic,          accent: '#e11d48', lightBg: '#fff1f2', folderHint: 'interview-prep'     },
  { id: 'confidence-builder', label: 'Confidence Builder', sub: 'Affirmations & motivation',      icon: Play,         accent: '#d97706', lightBg: '#fffbeb', folderHint: 'confidence-builder' },
  { id: 'quest-debrief',      label: 'Quest Debrief',      sub: 'Trail Quest completions',        icon: CheckCircle2, accent: '#0d9488', lightBg: '#f0fdfa', folderHint: 'quest-debrief'      },
];

// ── MIME helpers ──────────────────────────────────────────────────────────────

type FileKind = 'image' | 'audio' | 'video' | 'doc' | 'other';

function fileKind(mimeType: string): FileKind {
  if (mimeType.startsWith('image/') || mimeType === 'application/vnd.google-apps.drawing') return 'image';
  if (mimeType.startsWith('video/') || mimeType === 'application/vnd.google-apps.video')  return 'video';
  if (mimeType.startsWith('audio/'))                                                        return 'audio';
  if (mimeType.includes('document') || mimeType.includes('text') || mimeType === 'application/pdf' || mimeType.includes('presentation')) return 'doc';
  return 'other';
}

function mimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/gif': 'GIF', 'image/webp': 'WebP', 'image/svg+xml': 'SVG',
    'video/mp4': 'MP4', 'video/quicktime': 'MOV',
    'audio/mpeg': 'MP3', 'audio/wav': 'WAV', 'audio/ogg': 'OGG',
    'application/pdf': 'PDF',
    'application/vnd.google-apps.document': 'Doc',
    'application/vnd.google-apps.presentation': 'Slides',
    'application/vnd.google-apps.drawing': 'Drawing',
    'application/vnd.google-apps.video': 'Video',
  };
  return map[mimeType] ?? mimeType.split('/')[1]?.toUpperCase().slice(0, 6) ?? 'File';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const KIND_META: Record<FileKind, { icon: React.ElementType; bg: string; text: string }> = {
  image: { icon: Image,    bg: 'bg-violet-50', text: 'text-violet-600' },
  audio: { icon: Music,    bg: 'bg-sky-50',    text: 'text-sky-600'    },
  video: { icon: Video,    bg: 'bg-rose-50',   text: 'text-rose-600'   },
  doc:   { icon: FileText, bg: 'bg-amber-50',  text: 'text-amber-600'  },
  other: { icon: File,     bg: 'bg-zinc-100',  text: 'text-zinc-500'   },
};

// ── File row (list view) ──────────────────────────────────────────────────────

function FileRow({ file }: { file: DriveFile }) {
  const kind = fileKind(file.mimeType);
  const meta = KIND_META[kind];
  const FIcon = meta.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 rounded-lg group transition-colors">
      <div className={`p-1.5 rounded-lg ${meta.bg} shrink-0`}>
        <FIcon className={`w-3.5 h-3.5 ${meta.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-700 truncate" title={file.name}>{file.name}</p>
        <p className="text-[10px] text-zinc-400">{formatDate(file.modifiedTime)}{file.size ? ` · ${file.size}` : ''}</p>
      </div>
      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
        {mimeLabel(file.mimeType)}
      </span>
      {file.webViewLink && (
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200"
        >
          <ExternalLink className="w-3 h-3 text-zinc-400" />
        </a>
      )}
    </div>
  );
}

// ── File card (grid view) ─────────────────────────────────────────────────────

function FileCard({ file }: { file: DriveFile }) {
  const kind = fileKind(file.mimeType);
  const meta = KIND_META[kind];
  const FIcon = meta.icon;
  const hasThumb = !!file.thumbnailLink;
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden group hover:shadow-md transition-shadow">
      <div className="h-24 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative overflow-hidden">
        {hasThumb
          ? <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover object-top" />
          : <FIcon className="w-9 h-9 text-zinc-200" />}
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-medium text-zinc-700 truncate" title={file.name}>{file.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
            {mimeLabel(file.mimeType)}
          </span>
          <span className="text-[9px] text-zinc-400">{formatDate(file.modifiedTime)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PennyAssetLibrary() {
  const [activeId, setActiveId]   = useState(PENNY_STATES[0].id);
  const [viewMode, setViewMode]   = useState<'grid' | 'list'>('grid');

  const { data: status, isLoading: statusLoading } = useQuery<DriveStatusResponse>({
    queryKey:  ['drive-status'],
    queryFn:   () => fetch('/api/drive/status').then(r => r.json()),
    staleTime: 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery<PennyAssetsResponse>({
    queryKey:  ['penny-assets'],
    queryFn:   () => fetch('/api/drive/penny-assets').then(r => r.json()),
    staleTime: 60_000,
    enabled:   status?.connected === true,
  });

  const groups      = data?.groups ?? [];
  const ungrouped   = data?.ungrouped ?? [];
  const totalAssets = groups.reduce((n, g) => n + g.files.length, 0) + ungrouped.length;

  const getGroup = (state: PennyStateConfig): AssetGroup | undefined =>
    groups.find(g => g.state === state.folderHint || g.folderName.toLowerCase().replace(/\s+/g, '-') === state.folderHint);

  const active    = PENNY_STATES.find(s => s.id === activeId)!;
  const isSpecial = activeId === '__ungrouped__';

  // Files for the selected sidebar item
  const activeFiles: DriveFile[] = isSpecial
    ? ungrouped
    : (getGroup(active)?.files ?? []);

  // Drive connection state for the status pill
  const driveConnected = status?.connected === true;
  const folderConfigured = status?.pennyFolderConfigured === true;

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="border-b border-zinc-200 px-5 py-3 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-[13px] font-semibold text-zinc-800">Asset Library</span>
          {isLoading && (
            <span className="text-[10px] text-zinc-400 italic ml-1">Loading from Drive…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Config warning */}
          {driveConnected && !folderConfigured && (
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              <AlertTriangle className="w-3 h-3" />
              Folder not configured
            </span>
          )}
          {/* Drive status pill */}
          {!statusLoading && (
            driveConnected
              ? <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Drive live
                </span>
              : <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                  Drive offline
                </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors"
            title="Refresh assets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Drive not connected notice ── */}
      {!statusLoading && !driveConnected && (
        <div className="flex items-center gap-2.5 px-5 py-3 bg-zinc-50 border-b border-zinc-100 shrink-0">
          <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <p className="text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-600">Google Drive not connected. </span>
            {status?.reason ?? 'GOOGLE_DRIVE_REFRESH_TOKEN is missing. '}
            Complete the OAuth flow at <strong>Administration → Google OAuth Setup</strong>.
          </p>
        </div>
      )}

      {/* ── API error notice ── */}
      {(isError || data?.error) && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 border-b border-rose-100 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <p className="text-[11px] text-rose-600">
            {data?.error ?? 'Error loading assets from Drive.'}
          </p>
        </div>
      )}

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: state sidebar */}
        <aside className="w-52 border-r border-zinc-100 bg-zinc-50/60 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Penny states</p>
          </div>
          <nav className="flex-1 px-2 pb-2 space-y-0.5">
            {PENNY_STATES.map(s => {
              const SI = s.icon;
              const isActive = s.id === activeId;
              const count = getGroup(s)?.files.length ?? 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive ? 'bg-white shadow-sm border border-zinc-200' : 'hover:bg-white/70'
                  }`}
                >
                  <div
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ background: isActive ? s.lightBg : '#f4f4f5' }}
                  >
                    <SI
                      className="w-3 h-3"
                      style={{ color: isActive ? s.accent : '#a1a1aa' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate ${isActive ? 'text-zinc-800' : 'text-zinc-600'}`}>
                      {s.label}
                    </p>
                  </div>
                  {count > 0 ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: isActive ? s.lightBg : '#f4f4f5', color: isActive ? s.accent : '#a1a1aa' }}
                    >
                      {count}
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-300 shrink-0">—</span>
                  )}
                </button>
              );
            })}

            {/* Ungrouped separator + item */}
            {ungrouped.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Other</p>
                </div>
                <button
                  onClick={() => setActiveId('__ungrouped__')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSpecial ? 'bg-white shadow-sm border border-zinc-200' : 'hover:bg-white/70'
                  }`}
                >
                  <div className="p-1.5 rounded-lg shrink-0" style={{ background: '#f4f4f5' }}>
                    <HardDrive className="w-3 h-3 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate text-zinc-600">Ungrouped</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-400 shrink-0">
                    {ungrouped.length}
                  </span>
                </button>
              </>
            )}
          </nav>

          {/* Total count footer */}
          {totalAssets > 0 && (
            <div className="px-4 py-3 border-t border-zinc-100 shrink-0">
              <p className="text-[9px] text-zinc-400">{totalAssets} total assets across {groups.length} folders</p>
            </div>
          )}
        </aside>

        {/* RIGHT: asset panel */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Panel header */}
          {!isSpecial ? (
            <div
              className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0"
              style={{ background: active.lightBg }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/80">
                  <active.icon className="w-4 h-4" style={{ color: active.accent }} />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-zinc-800">{active.label}</h2>
                  <p className="text-[11px] text-zinc-500">{active.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 mr-2">
                  <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-zinc-600">{active.folderHint}/</code>
                </span>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-white border-zinc-300 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'list' ? 'bg-white border-zinc-300 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
                >
                  <List className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white border border-zinc-200">
                  <HardDrive className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-zinc-700">Ungrouped assets</h2>
                  <p className="text-[11px] text-zinc-400">Files at the root of your Penny Assets folder — move into a state subfolder to assign them.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-white border-zinc-300 shadow-sm' : 'border-transparent hover:bg-zinc-100'}`}>
                  <LayoutGrid className="w-3.5 h-3.5 text-zinc-400" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg border transition-colors ${viewMode === 'list' ? 'bg-white border-zinc-300 shadow-sm' : 'border-transparent hover:bg-zinc-100'}`}>
                  <List className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
          )}

          {/* Asset content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Not configured empty state */}
            {driveConnected && !folderConfigured && !data?.configured && (
              <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-amber-50">
                  <HardDrive className="w-7 h-7 text-amber-300" />
                </div>
                <p className="text-[13px] font-semibold text-zinc-600 mb-2">Penny Assets folder not configured</p>
                <p className="text-[11px] text-zinc-400 max-w-sm leading-relaxed mb-3">
                  Create a folder named <strong>Penny Assets</strong> in Google Drive, copy the folder ID from its URL, and add it as the secret{' '}
                  <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-500">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>{' '}
                  in Administration → Integrations.
                </p>
                <p className="text-[10px] text-zinc-400">
                  Then create subfolders: <code className="font-mono text-zinc-500">coaching/</code>,{' '}
                  <code className="font-mono text-zinc-500">trail-talk/</code>,{' '}
                  <code className="font-mono text-zinc-500">resume-review/</code>, etc.
                </p>
              </div>
            )}

            {/* Active state has files */}
            {activeFiles.length > 0 && (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-3">
                  {activeFiles.map(f => <FileCard key={f.id} file={f} />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {activeFiles.map(f => <FileRow key={f.id} file={f} />)}
                </div>
              )
            )}

            {/* Active state has no files — but Drive is connected and configured */}
            {activeFiles.length === 0 && driveConnected && (data?.configured || folderConfigured) && !isSpecial && (
              <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: active.lightBg }}
                >
                  <HardDrive className="w-7 h-7" style={{ color: active.accent + '66' }} />
                </div>
                <p className="text-[13px] font-semibold text-zinc-600 mb-1">No assets for {active.label}</p>
                <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                  Create a subfolder named{' '}
                  <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-500">{active.folderHint}/</code>{' '}
                  inside your Penny Assets Drive folder, then upload images, voice scripts, or media.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  No folder detected in Drive
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
