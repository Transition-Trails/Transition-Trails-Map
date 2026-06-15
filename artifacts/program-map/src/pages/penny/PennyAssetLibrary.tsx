import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Image, FileText, Music, Video, File, FolderOpen,
  ExternalLink, RefreshCw, AlertCircle, CheckCircle2,
  HardDrive, Sparkles, Settings2, Info, ChevronDown, ChevronRight,
  Mic, Layers, Play,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriveFile {
  id:            string;
  name:          string;
  mimeType:      string;
  thumbnailLink?: string;
  webViewLink?:  string;
  iconLink?:     string;
  modifiedTime?: string;
  size?:         string;
  description?:  string;
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

// ── Penny states definition ───────────────────────────────────────────────────

interface PennyState {
  id:          string;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
  bg:          string;
  border:      string;
  folderHint:  string;
}

const PENNY_STATES: PennyState[] = [
  {
    id: 'coaching', label: 'Coaching', folderHint: 'coaching',
    description: 'One-on-one coaching sessions, check-ins, goal setting',
    icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200',
  },
  {
    id: 'trail-talk', label: 'Trail Talk', folderHint: 'trail-talk',
    description: 'Trail Talk presentations and group session assets',
    icon: Layers, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200',
  },
  {
    id: 'resume-review', label: 'Resume Review', folderHint: 'resume-review',
    description: 'Career document review, CV feedback, and job prep',
    icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
  },
  {
    id: 'interview-prep', label: 'Interview Prep', folderHint: 'interview-prep',
    description: 'Mock interviews, prep frameworks, and confidence builders',
    icon: Mic, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200',
  },
  {
    id: 'confidence-builder', label: 'Confidence Builder', folderHint: 'confidence-builder',
    description: 'Motivational assets, affirmations, and self-efficacy tools',
    icon: Play, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
  },
  {
    id: 'quest-debrief', label: 'Quest Debrief', folderHint: 'quest-debrief',
    description: 'Trail Quest completion celebrations and debrief guides',
    icon: CheckCircle2, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function mimeIcon(mimeType: string): React.ElementType {
  if (mimeType.startsWith('image/') || mimeType === 'application/vnd.google-apps.drawing') return Image;
  if (mimeType.startsWith('video/') || mimeType === 'application/vnd.google-apps.video')  return Video;
  if (mimeType.startsWith('audio/'))                                                        return Music;
  if (mimeType.includes('document') || mimeType.includes('text'))                          return FileText;
  return File;
}

function mimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png':  'PNG', 'image/jpeg': 'JPG', 'image/gif': 'GIF', 'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
    'video/mp4':  'MP4', 'video/quicktime': 'MOV',
    'audio/mpeg': 'MP3', 'audio/wav': 'WAV', 'audio/ogg': 'OGG',
    'application/pdf': 'PDF',
    'application/vnd.google-apps.document':     'Doc',
    'application/vnd.google-apps.presentation': 'Slides',
    'application/vnd.google-apps.drawing':      'Drawing',
    'application/vnd.google-apps.video':        'Video',
    'application/vnd.google-apps.folder':       'Folder',
  };
  return map[mimeType] ?? mimeType.split('/')[1]?.toUpperCase().slice(0, 6) ?? 'File';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Asset file card ───────────────────────────────────────────────────────────

function AssetCard({ file }: { file: DriveFile }) {
  const Icon = mimeIcon(file.mimeType);
  const hasThumb = !!file.thumbnailLink;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden group hover:shadow-sm transition-shadow">
      {/* Thumbnail / icon */}
      <div className="h-20 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative overflow-hidden">
        {hasThumb
          ? <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
          : <Icon className="w-8 h-8 text-zinc-300" />}
        {file.webViewLink && (
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-1.5 right-1.5 p-1 rounded bg-white/80 border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open in Drive"
          >
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        )}
      </div>
      {/* Meta */}
      <div className="px-2.5 py-2">
        <p className="text-[11px] font-medium text-zinc-700 truncate leading-snug" title={file.name}>{file.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
            {mimeLabel(file.mimeType)}
          </span>
          <span className="text-[9px] text-zinc-400">{formatDate(file.modifiedTime)}</span>
        </div>
      </div>
    </div>
  );
}

// ── State section ─────────────────────────────────────────────────────────────

function StateSection({ state, group }: { state: PennyState; group?: AssetGroup }) {
  const [open, setOpen] = useState(true);
  const files = group?.files ?? [];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:brightness-[0.98] transition-all ${state.bg}`}
      >
        <div className={`p-1.5 rounded-lg border ${state.border} ${state.bg}`}>
          <state.icon className={`w-3.5 h-3.5 ${state.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-zinc-800">{state.label}</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${state.bg} ${state.border} ${state.color}`}>
              {files.length} {files.length === 1 ? 'asset' : 'assets'}
            </span>
            {files.length === 0 && (
              <span className="text-[9px] text-zinc-400 italic">— no folder found in Drive yet</span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">{state.description}</p>
        </div>
        <span className="text-[9px] text-zinc-400 mr-2">
          Folder: <code className="font-mono">{state.folderHint}/</code>
        </span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-5 py-4">
          {files.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map(f => <AssetCard key={f.id} file={f} />)}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 py-2">
              <FolderOpen className="w-4 h-4 text-zinc-300" />
              Create a subfolder named <code className="font-mono text-zinc-500 bg-zinc-100 px-1 py-0.5 rounded">{state.folderHint}</code> inside your Penny Assets Drive folder, then upload assets there.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PennyAssetLibrary() {
  const { data: status } = useQuery<DriveStatusResponse>({
    queryKey: ['drive-status'],
    queryFn:  () => fetch('/api/drive/status').then(r => r.json()),
    staleTime: 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery<PennyAssetsResponse>({
    queryKey: ['penny-assets'],
    queryFn:  () => fetch('/api/drive/penny-assets').then(r => r.json()),
    staleTime: 60_000,
    enabled:  status?.connected === true,
  });

  const groups = data?.groups ?? [];

  // Match Drive subfolders to PENNY_STATES by normalized folder name
  const getGroup = (state: PennyState): AssetGroup | undefined =>
    groups.find(g => g.state === state.folderHint || g.folderName.toLowerCase().replace(/\s+/g, '-') === state.folderHint);

  const totalAssets = groups.reduce((n, g) => n + g.files.length, 0) + (data?.ungrouped?.length ?? 0);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* ── Drive connection status ── */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] text-zinc-600 leading-relaxed max-w-2xl">
            Manage themed Penny images, voice scripts, avatar variants, and contextual
            coaching assets — all stored in Google Drive and organised by Penny state.
            Create subfolders matching the state names below inside your configured Drive folder.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {status?.connected
              ? <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="w-3 h-3" /> Drive connected
                </span>
              : <span className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-full px-2.5 py-1">
                  <AlertCircle className="w-3 h-3" /> Drive not connected
                </span>}
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Configuration strip ── */}
        {status?.connected && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            status.pennyFolderConfigured
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}>
            {status.pennyFolderConfigured
              ? <HardDrive className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              : <Info      className="w-3.5 h-3.5 text-amber-500  shrink-0 mt-0.5" />}
            <div className="space-y-0.5">
              {status.pennyFolderConfigured ? (
                <>
                  <p className="text-[11px] font-semibold text-emerald-800">
                    Penny Assets folder configured — {data?.folderName ?? 'Loading…'}
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    Folder ID: <code className="font-mono">{status.pennyFolderId}</code>
                    {' · '}{totalAssets} total assets across {groups.length} state folders
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-semibold text-amber-800">
                    Penny Assets folder not configured
                  </p>
                  <p className="text-[10px] text-amber-700">
                    Create a folder named <strong>Penny Assets</strong> in Google Drive, copy its folder ID from the URL, and add it as the secret{' '}
                    <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code> in Administration → Integrations.
                    Then create subfolders for each Penny state below.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Not connected notice ── */}
        {!status?.connected && (
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
            <HardDrive className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-zinc-700">Google Drive not connected</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {status?.reason ?? 'GOOGLE_DRIVE_REFRESH_TOKEN is missing.'}{' '}
                Complete the Google OAuth flow at <strong>Administration → Google OAuth Setup</strong> with <code className="font-mono text-[10px]">drive.readonly</code> scope.
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="flex items-center gap-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Error loading assets from Drive. Check the API server logs.
          </div>
        )}

        {/* ── API error from server ── */}
        {data?.error && (
          <div className="flex items-center gap-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Drive error: {data.error}
          </div>
        )}

        {/* ── Folder structure guide ── */}
        <div className="flex items-start gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
          <Settings2 className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-sky-800 leading-snug">
            <span className="font-semibold">Folder structure:</span>{' '}
            In your Drive <em>Penny Assets</em> folder, create one subfolder per state below
            (e.g. <code className="font-mono text-[10px] bg-sky-100 px-1 rounded">coaching/</code>,{' '}
            <code className="font-mono text-[10px] bg-sky-100 px-1 rounded">trail-talk/</code>).
            Upload images (PNG/JPG), voice scripts (PDF/Doc), and any media files into each.
            Penny will use these assets when a learner enters that coaching context.
          </p>
        </div>

        {/* ── Penny state sections ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Penny states</h2>
            {isLoading && <span className="text-[10px] text-zinc-400 italic">Loading from Drive…</span>}
          </div>
          <div className="space-y-3">
            {PENNY_STATES.map(state => (
              <StateSection key={state.id} state={state} group={getGroup(state)} />
            ))}
          </div>
        </div>

        {/* ── Ungrouped / root files ── */}
        {(data?.ungrouped?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Ungrouped assets ({data!.ungrouped.length})
              </h2>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <p className="text-[10px] text-zinc-400 mb-3">
                Files at the root of the Penny Assets folder — move them into a state subfolder to assign them to a Penny context.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {data!.ungrouped.map(f => <AssetCard key={f.id} file={f} />)}
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state when no folder configured ── */}
        {data && !data.configured && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
            <HardDrive className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-[13px] font-semibold text-zinc-500 mb-1">No Penny Assets folder configured</p>
            <p className="text-[11px] text-zinc-400 max-w-md mx-auto">{data.message}</p>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
