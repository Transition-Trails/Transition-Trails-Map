import { useQuery } from '@tanstack/react-query';
import { TERMS } from '@/config/terminology';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HardDrive, Activity, Image, Settings,
  CheckCircle, XCircle, AlertTriangle, RefreshCw,
  FileText, Key, Layers, Sparkles, CheckCircle2, ExternalLink,
  Music, Video, FolderOpen,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DriveStatusResponse {
  connected:             boolean;
  reason?:               string;
  pennyFolderConfigured: boolean;
  pennyFolderId?:        string | null;
}

interface PennyContentResponse {
  configured:        boolean;
  folderId:          string | null;
  folderName:        string | null;
  folderWebViewLink: string | null;
  images:            { id: string; name: string }[];
  audio:             { id: string; name: string }[];
  video:             { id: string; name: string }[];
  error?:            string;
}

// ── Penny Content Folder Card ─────────────────────────────────────────────────

function PennyContentFolderCard() {
  const { data, isLoading, refetch } = useQuery<PennyContentResponse>({
    queryKey:  ['penny-content-summary'],
    queryFn:   () => fetch('/api/drive/penny-content').then(r => r.json()),
    staleTime: 60_000,
  });

  const configured = data?.configured === true;
  const hasError   = !!data?.error;

  const imgCount   = data?.images?.length ?? 0;
  const audCount   = data?.audio?.length  ?? 0;
  const vidCount   = data?.video?.length  ?? 0;
  const totalCount = imgCount + audCount + vidCount;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#E6F0EA] flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-[#2F6B3F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground leading-tight">
              {isLoading ? 'Checking folder…' : (data?.folderName ?? 'Penny Content Folder')}
            </p>
            <p className="text-[14px] text-muted-foreground">
              {TERMS.aiAssistant} prompt media — images, audio, video
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          {isLoading ? (
            <span className="flex items-center gap-1 border border-border rounded-full px-2 py-0.5 bg-muted/30">
              <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
              <span className="text-[14px] text-muted-foreground">Checking…</span>
            </span>
          ) : !configured ? (
            <span className="flex items-center gap-1.5 border border-[#FFD08A] rounded-full px-2 py-0.5 bg-[#FFF3E0]">
              <AlertTriangle className="w-3 h-3 text-[#CC8400]" />
              <span className="text-[14px] font-semibold text-[#CC8400]">Not configured</span>
            </span>
          ) : hasError ? (
            <span className="flex items-center gap-1.5 border border-[#E8B9B4] rounded-full px-2 py-0.5 bg-[#FBEAE6]">
              <XCircle className="w-3 h-3 text-[#A93F2F]" />
              <span className="text-[14px] font-semibold text-[#A93F2F]">Error</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 border border-[#9FC3AE] rounded-full px-2 py-0.5 bg-[#E6F0EA]">
              <CheckCircle className="w-3 h-3 text-[#2F6B3F]" />
              <span className="text-[14px] font-semibold text-[#2F6B3F]">Connected</span>
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-1 rounded hover:bg-muted/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/60" />
          </button>
        </div>
      </div>

      {/* Not configured notice */}
      {!isLoading && !configured && (
        <p className="text-[14px] text-[#CC8400] leading-snug">
          Set <code className="font-mono text-[14px] bg-[#FFF3E0] px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code> in Replit Secrets, then open the <strong>{TERMS.aiAssistant} Assets Setup</strong> tab for instructions.
        </p>
      )}

      {/* Error notice */}
      {!isLoading && configured && hasError && (
        <p className="text-[14px] text-[#A93F2F] leading-snug">{data!.error}</p>
      )}

      {/* Asset counts — only when connected and no error */}
      {!isLoading && configured && !hasError && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5">
            <Image  className="w-3.5 h-3.5 text-[#2F6F7E] shrink-0" />
            <span className="text-[14px] font-semibold text-foreground">{imgCount}</span>
            <span className="text-[14px] text-muted-foreground">image{imgCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5">
            <Music  className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
            <span className="text-[14px] font-semibold text-foreground">{audCount}</span>
            <span className="text-[14px] text-muted-foreground">audio</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5">
            <Video  className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />
            <span className="text-[14px] font-semibold text-foreground">{vidCount}</span>
            <span className="text-[14px] text-muted-foreground">video{vidCount !== 1 ? 's' : ''}</span>
          </div>
          {totalCount === 0 && (
            <span className="text-[14px] text-muted-foreground/60 italic">No media files found in the folder yet</span>
          )}
        </div>
      )}

      {/* Open in Drive link */}
      {!isLoading && configured && !hasError && data?.folderWebViewLink && (
        <a
          href={data.folderWebViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:text-primary/70 transition-colors"
        >
          Open in Drive <ExternalLink className="w-3 h-3" />
        </a>
      )}

    </div>
  );
}

// ── Penny subfolder definitions ────────────────────────────────────────────────

const PENNY_STATE_FOLDERS = [
  { id: 'coaching',           label: 'Coaching',           desc: 'Check-ins, goal setting, avatars',   icon: Sparkles,     color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8]' },
  { id: 'trail-talk',         label: 'Trail Talk',         desc: 'Group session slides & media',       icon: Layers,       color: 'text-[#2F6F7E]',    bg: 'bg-[#EDF5F8]'    },
  { id: 'resume-review',      label: 'Resume Review',      desc: 'CV feedback, document scripts',      icon: FileText,     color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA]' },
  { id: 'interview-prep',     label: 'Interview Prep',     desc: 'Mock interview guides & audio',      icon: Key,          color: 'text-[#A93F2F]',   bg: 'bg-[#FBEAE6]'   },
  { id: 'confidence-builder', label: 'Confidence Builder', desc: 'Affirmations & motivation media',    icon: CheckCircle2, color: 'text-[#CC8400]',  bg: 'bg-[#FFF3E0]'  },
  { id: 'quest-debrief',      label: 'Quest Debrief',      desc: 'Completion banners & celebration',   icon: Sparkles,     color: 'text-[#2F6B3F]',   bg: 'bg-[#E6F0EA]'   },
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
          : !driveConnected   ? 'border-[#E8B9B4] bg-[#FBEAE6]'
          : !folderConfigured ? 'border-[#FFD08A] bg-[#FFF3E0]'
          : 'border-[#9FC3AE] bg-[#E6F0EA]'
        }`}>
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : !driveConnected ? (
              <XCircle className="w-4 h-4 text-[#A93F2F] shrink-0" />
            ) : !folderConfigured ? (
              <AlertTriangle className="w-4 h-4 text-[#CC8400] shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[#2F6B3F] shrink-0" />
            )}
            <div>
              <p className={`text-[14px] font-semibold ${
                isLoading ? 'text-muted-foreground'
                : !driveConnected ? 'text-[#A93F2F]'
                : !folderConfigured ? 'text-[#CC8400]'
                : 'text-[#2F6B3F]'
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
                <p className="text-[14px] text-[#A93F2F] mt-0.5">{status.reason}</p>
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
          <p className="text-[14px] font-bold  text-muted-foreground mb-3">Setup Checklist</p>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
              <span className="text-[14px]">Google Drive connected via Replit integration</span>
            </div>
            <div className="flex gap-2 items-center">
              <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
              <span className="text-[14px]">OAuth refresh token active</span>
            </div>
            <div className="flex gap-2 items-center">
              {folderConfigured
                ? <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
                : <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />}
              <span className="text-[14px]">
                <code className="font-mono text-[14px] bg-muted px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>
                {' '}— set in Replit Secrets
              </span>
            </div>
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
              <span className="text-[14px]">Program Drive folders — create one per program and link in Knowledge Sources</span>
            </div>
          </div>
        </div>

        {/* Penny content folder summary */}
        <PennyContentFolderCard />

        {/* About */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-[14px] font-semibold text-foreground">About this integration</p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            The Google Drive integration connects Trail OS to your workspace's Drive folders. It powers Penny's asset library — images, audio scripts, PDFs, and videos organized by coaching context — and enables program folder mapping for knowledge source management.
          </p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            The connection is established via the Replit Google integration (OAuth refresh token). The only manual step is setting the{' '}
            <code className="font-mono text-[14px] bg-muted px-1 rounded">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>{' '}
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
          : !driveConnected   ? 'border-[#E8B9B4] bg-[#FBEAE6]'
          : !folderConfigured ? 'border-[#FFD08A] bg-[#FFF3E0]'
          : 'border-[#9FC3AE] bg-[#E6F0EA]'
        }`}>
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : !driveConnected ? (
              <XCircle className="w-4 h-4 text-[#A93F2F] shrink-0" />
            ) : !folderConfigured ? (
              <AlertTriangle className="w-4 h-4 text-[#CC8400] shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-[#2F6B3F] shrink-0" />
            )}
            <div>
              <p className={`text-[14px] font-semibold ${
                isLoading ? 'text-muted-foreground'
                : !driveConnected ? 'text-[#A93F2F]'
                : !folderConfigured ? 'text-[#CC8400]'
                : 'text-[#2F6B3F]'
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
                <p className="text-[14px] text-[#A93F2F] mt-0.5">{status.reason}</p>
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
          <p className="text-[14px] font-bold  text-muted-foreground mb-3">Setup steps</p>
          <div className="space-y-3">

            {/* Step 1 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5">1</div>
              <div className="space-y-1.5">
                <p className="text-[14px] font-semibold text-foreground">Create the root folder in Google Drive</p>
                <p className="text-[14px] text-muted-foreground leading-snug">
                  Open Google Drive, create a new folder, and name it exactly <strong>Penny Assets</strong> (or anything you like — the name doesn't matter, only the folder ID does).
                </p>
                <a
                  href="https://drive.google.com/drive/my-drive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[14px] font-semibold text-primary hover:underline"
                >
                  Open Google Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5">2</div>
              <div className="space-y-1.5">
                <p className="text-[14px] font-semibold text-foreground">Copy the folder ID from the URL</p>
                <p className="text-[14px] text-muted-foreground leading-snug">
                  Open the folder in Drive — the URL will look like:<br />
                  <code className="font-mono text-[14px] bg-muted px-1.5 py-0.5 rounded">
                    drive.google.com/drive/folders/<strong>1ABCdeFGhi2JKlmNOpqrSTuv3WXyz</strong>
                  </code>
                  <br />
                  Copy the bold part — that is your folder ID.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FFF3E0] text-[#CC8400] flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5">3</div>
              <div className="space-y-2">
                <p className="text-[14px] font-semibold text-[#CC8400]">Add the secret to Replit</p>
                <p className="text-[14px] text-[#CC8400] leading-snug">
                  In Replit, open <strong>Tools → Secrets</strong> (padlock icon in the left sidebar). Add a new secret:
                </p>
                <div className="rounded border border-[#FFD08A] bg-white px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold  text-[#CC8400] w-12 shrink-0">Key</span>
                    <code className="font-mono text-[14px] font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded select-all">GOOGLE_DRIVE_PENNY_FOLDER_ID</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[14px] font-bold  text-[#CC8400] w-12 shrink-0 mt-0.5">Value</span>
                    <span className="text-[14px] text-zinc-600">Paste the folder ID you copied in step 2</span>
                  </div>
                </div>
                <p className="text-[14px] text-[#CC8400]">
                  After saving the secret, the API server picks it up automatically — no restart needed.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5">4</div>
              <div className="space-y-2">
                <p className="text-[14px] font-semibold text-foreground">Create subfolders for each Penny state</p>
                <p className="text-[14px] text-muted-foreground leading-snug">
                  Inside your root <em>Penny Assets</em> folder, create one subfolder per state. The subfolder names must match exactly (lowercase, hyphens):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PENNY_STATE_FOLDERS.map(s => {
                    const SI = s.icon;
                    return (
                      <div key={s.id} className={`rounded-lg border border-border flex items-center gap-2.5 px-3 py-2 ${s.bg}`}>
                        <SI className={`w-3.5 h-3.5 shrink-0 ${s.color}`} />
                        <div className="min-w-0">
                          <code className="font-mono text-[14px] font-bold text-zinc-700">{s.id}/</code>
                          <p className="text-[14px] text-zinc-500 truncate">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[14px] text-muted-foreground">
                  {`Upload PNG/JPG images, MP3 audio scripts, PDFs, and video files into the relevant subfolder. ${TERMS.aiAssistant} will surface these when a learner enters that coaching context.`}
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="rounded-lg border border-border bg-white p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[14px] font-bold shrink-0 mt-0.5">5</div>
              <div className="space-y-1.5">
                <p className="text-[14px] font-semibold text-foreground">Verify in the Asset Library</p>
                <p className="text-[14px] text-muted-foreground leading-snug">
                  Navigate to <strong>{TERMS.aiAssistant} → Asset Library</strong> in the sidebar. The status pill should turn green ("Drive live") and each state in the sidebar will show an asset count. Hit the refresh button if it hasn't updated yet.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Verify note */}
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 flex items-center gap-2">
          <Image className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-[14px] text-muted-foreground">Once configured, navigate to <strong>{TERMS.aiAssistant} → Asset Library</strong> in the sidebar to manage and browse assets.</p>
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
      description={`Connect Google Drive to Trail OS — ${TERMS.aiAssistant} asset library setup and program folder management.`}
      badge="Google Drive"
      tabs={[
        { id: 'overview',     label: 'Overview',           path: '/admin/integrations/google-drive',              icon: Activity, content: <OverviewTab /> },
        { id: 'penny-assets', label: `${TERMS.aiAssistant} Assets Setup`, path: '/admin/integrations/google-drive/penny-assets', icon: Settings, content: <PennyAssetsSetupTab /> },
      ]}
    />
  );
}
