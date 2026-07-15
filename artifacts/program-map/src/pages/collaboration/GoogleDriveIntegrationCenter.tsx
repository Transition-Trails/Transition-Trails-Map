import { useQuery } from '@tanstack/react-query';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HardDrive, Activity, Image, Settings,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FileText, Key, Layers, Sparkles, CheckCircle2, ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriveStatusResponse {
  connected:             boolean;
  reason?:               string;
  pennyFolderConfigured: boolean;
  pennyFolderId?:        string | null;
}

// ── Penny subfolder definitions ────────────────────────────────────────────────

const PENNY_STATE_FOLDERS = [
  { id: 'coaching',           label: 'Coaching',           desc: 'Check-ins, goal setting, avatars',   icon: Sparkles,     color: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 'trail-talk',         label: 'Trail Talk',         desc: 'Group session slides & media',       icon: Layers,       color: 'text-sky-600',    bg: 'bg-sky-50'    },
  { id: 'resume-review',      label: 'Resume Review',      desc: 'CV feedback, document scripts',      icon: FileText,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'interview-prep',     label: 'Interview Prep',     desc: 'Mock interview guides & audio',      icon: Key,          color: 'text-rose-600',   bg: 'bg-rose-50'   },
  { id: 'confidence-builder', label: 'Confidence Builder', desc: 'Affirmations & motivation media',    icon: CheckCircle2, color: 'text-amber-600',  bg: 'bg-amber-50'  },
  { id: 'quest-debrief',      label: 'Quest Debrief',      desc: 'Completion banners & celebration',   icon: Sparkles,     color: 'text-teal-600',   bg: 'bg-teal-50'   },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: status, isLoading, refetch } = useQuery<DriveStatusResponse>({
    queryKey:  ['drive-status'],
    queryFn:   () => fetch('/api/drive/status').then(r => r.json()),
    staleTime: 30_000,
  });

  const driveConnected   = status?.connected === true;
  const folderConfigured = status?.pennyFolderConfigured === true;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-2xl space-y-4">

        {/* Live status */}
        <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${
          isLoading           ? 'border-border bg-muted/20'
          : !driveConnected   ? 'border-rose-200 bg-rose-50'
          : !folderConfigured ? 'border-amber-200 bg-amber-50'
          : 'border-emerald-200 bg-emerald-50'
        }`}>
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : !driveConnected ? (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : !folderConfigured ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <div>
              <p className={`text-[12px] font-semibold ${
                isLoading ? 'text-muted-foreground'
                : !driveConnected ? 'text-rose-700'
                : !folderConfigured ? 'text-amber-700'
                : 'text-emerald-700'
              }`}>
                {isLoading
                  ? 'Checking Drive status…'
                  : !driveConnected
                  ? 'Google Drive not connected — complete OAuth setup first'
                  : !folderConfigured
                  ? 'Drive connected · Penny Assets folder not yet configured'
                  : `Drive connected · Penny Assets folder active${status?.pennyFolderId ? ` (${status.pennyFolderId.slice(0, 12)}…)` : ''}`}
              </p>
              {!driveConnected && status?.reason && (
                <p className="text-[10px] text-rose-600 mt-0.5">{status.reason}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded border border-current/20 hover:bg-black/5 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-current opacity-60" />
          </button>
        </div>

        {/* Setup checklist */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Setup Checklist</p>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[12px]">Google Drive connected via Replit integration</span>
            </div>
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[12px]">OAuth refresh token active</span>
            </div>
            <div className="flex gap-2 items-center">
              {folderConfigured
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              <span className="text-[12px]">
                <code className="font-mono text-[11px] bg-muted px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>
                {' '}— set in Replit Secrets
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[12px]">Program Drive folders — create one per program and link in Knowledge Sources</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-[13px] font-semibold text-foreground">About this integration</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            The Google Drive integration connects Trail OS to your workspace's Drive folders. It powers Penny's asset library — images, audio scripts, PDFs, and videos organized by coaching context — and enables program folder mapping for knowledge source management.
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            The connection is established via the Replit Google integration (OAuth refresh token). The only manual step is setting the{' '}
            <code className="font-mono text-[11px] bg-muted px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>{' '}
            secret, then creating the subfolder structure described in the <strong>Penny Assets Setup</strong> tab.
          </p>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Penny Assets Setup Tab ────────────────────────────────────────────────────

function PennyAssetsSetupTab() {
  const { data: status, isLoading, refetch } = useQuery<DriveStatusResponse>({
    queryKey:  ['drive-status'],
    queryFn:   () => fetch('/api/drive/status').then(r => r.json()),
    staleTime: 30_000,
  });

  const driveConnected   = status?.connected === true;
  const folderConfigured = status?.pennyFolderConfigured === true;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 max-w-2xl space-y-5">

        {/* Live status banner */}
        <div className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 ${
          isLoading           ? 'border-border bg-muted/20'
          : !driveConnected   ? 'border-rose-200 bg-rose-50'
          : !folderConfigured ? 'border-amber-200 bg-amber-50'
          : 'border-emerald-200 bg-emerald-50'
        }`}>
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : !driveConnected ? (
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            ) : !folderConfigured ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            )}
            <div>
              <p className={`text-[12px] font-semibold ${
                isLoading ? 'text-muted-foreground'
                : !driveConnected ? 'text-rose-700'
                : !folderConfigured ? 'text-amber-700'
                : 'text-emerald-700'
              }`}>
                {isLoading
                  ? 'Checking Drive status…'
                  : !driveConnected
                  ? 'Google Drive not connected — complete OAuth setup first'
                  : !folderConfigured
                  ? 'Drive connected · Penny Assets folder not yet configured'
                  : `Drive connected · Penny Assets folder active${status?.pennyFolderId ? ` (${status.pennyFolderId.slice(0, 12)}…)` : ''}`}
              </p>
              {!driveConnected && status?.reason && (
                <p className="text-[10px] text-rose-600 mt-0.5">{status.reason}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded border border-current/20 hover:bg-black/5 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-current opacity-60" />
          </button>
        </div>

        {/* Setup steps */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Setup steps</p>
          <div className="space-y-3">

            {/* Step 1 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">1</div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-foreground">Create the root folder in Google Drive</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Open Google Drive, create a new folder, and name it exactly <strong>Penny Assets</strong> (or anything you like — the name doesn't matter, only the folder ID does).
                </p>
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  Open Google Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">2</div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-foreground">Copy the folder ID from the URL</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Open the folder in Drive — the URL will look like:<br />
                  <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    drive.google.com/drive/folders/<strong>1ABCdeFGhi2JKlmNOpqrSTuv3WXyz</strong>
                  </code>
                  <br />
                  Copy the bold part — that is your folder ID.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">3</div>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-amber-900">Add the secret to Replit</p>
                <p className="text-[11px] text-amber-800 leading-snug">
                  In Replit, open <strong>Tools → Secrets</strong> (padlock icon in the left sidebar). Add a new secret:
                </p>
                <div className="rounded border border-amber-300 bg-white px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-amber-700 w-12 shrink-0">Key</span>
                    <code className="font-mono text-[12px] font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded select-all">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold uppercase text-amber-700 w-12 shrink-0 mt-0.5">Value</span>
                    <span className="text-[11px] text-zinc-600">Paste the folder ID you copied in step 2</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-700">
                  After saving the secret, the API server picks it up automatically — no restart needed.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">4</div>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-foreground">Create subfolders for each Penny state</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Inside your root <em>Penny Assets</em> folder, create one subfolder per state. The subfolder names must match exactly (lowercase, hyphens):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PENNY_STATE_FOLDERS.map(s => {
                    const SI = s.icon;
                    return (
                      <div key={s.id} className={`rounded-lg border border-border flex items-center gap-2.5 px-3 py-2 ${s.bg}`}>
                        <SI className={`w-3.5 h-3.5 shrink-0 ${s.color}`} />
                        <div className="min-w-0">
                          <code className="font-mono text-[11px] font-bold text-zinc-700">{s.id}/</code>
                          <p className="text-[9px] text-zinc-500 truncate">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Upload PNG/JPG images, MP3 audio scripts, PDFs, and video files into the relevant subfolder. Penny will surface these when a learner enters that coaching context.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">5</div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-semibold text-foreground">Verify in the Asset Library</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Navigate to <strong>Penny → Asset Library</strong> in the sidebar. The status pill should turn green ("Drive live") and each state in the sidebar will show an asset count. Hit the refresh button if it hasn't updated yet.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Verify note */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center gap-2">
          <Image className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground">Once configured, navigate to <strong>Penny → Asset Library</strong> in the sidebar to manage and browse assets.</p>
        </div>

      </div>
    </ScrollArea>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function GoogleDriveIntegrationCenter() {
  return (
    <HubShell
      title="Google Drive Integration Center"
      icon={HardDrive}
      description="Connect Google Drive to Trail OS — Penny asset library setup and program folder management."
      badge="Google Drive"
      tabs={[
        { id: 'overview',     label: 'Overview',           path: '/admin/integrations/google-drive',              icon: Activity, content: <OverviewTab /> },
        { id: 'penny-assets', label: 'Penny Assets Setup', path: '/admin/integrations/google-drive/penny-assets', icon: Settings, content: <PennyAssetsSetupTab /> },
      ]}
    />
  );
}
