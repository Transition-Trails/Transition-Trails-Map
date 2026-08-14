// ─────────────────────────────────────────────────────────────────────────────
// Build With Me tab — Content Studio
// Video-specific production pipeline: Script → Record → Narrate → Edit →
// Thumbnail → Publish. Covers narration selector, post-production tiles,
// QR card, publications table, and right-rail cards.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Info,
  FolderOpen,
  Check,
  Headphones,
  User,
  OctagonMinus,
  Link,
  Scissors,
  Image,
  Captions,
  ExternalLink,
  ScanLine,
} from 'lucide-react';
import { BUILD_WITH_ME_VIDEO } from '../mockData';
import { InsightCard } from '../components/InsightCard';
import { ContentStudioPennyCard } from '../components/PennyCard';

// ── Stage rail ────────────────────────────────────────────────────────────────

type StageState = 'complete' | 'current' | 'future';

interface StageCircleProps {
  state: StageState;
  index: number;
}

function StageCircle({ state, index }: StageCircleProps) {
  const base =
    'relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0';

  if (state === 'complete') {
    return (
      <div
        className={base}
        style={{ backgroundColor: '#2F6B3F' }}
      >
        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
      </div>
    );
  }
  if (state === 'current') {
    return (
      <div
        className={base}
        style={{
          backgroundColor: '#F5A623',
          boxShadow: '0 0 0 3px rgba(245,166,35,.25)',
        }}
      >
        <span className="text-[10px] font-bold text-white leading-none">
          {index + 1}
        </span>
      </div>
    );
  }
  // future
  return (
    <div
      className={`${base} bg-white`}
      style={{ border: '1.5px solid #E2E4E1' }}
    >
      <span className="text-[10px] text-[#B0B4AE] leading-none font-medium">
        {index + 1}
      </span>
    </div>
  );
}

function lineColor(state: StageState, next: StageState | null): string {
  if (state === 'complete' && next === 'complete') return '#2F6B3F';
  if (state === 'complete' && next === 'current') return '#2F6B3F';
  return '#E2E4E1';
}

function StageRail() {
  const stages = BUILD_WITH_ME_VIDEO.stages;

  return (
    <div className="grid grid-cols-6 gap-0 w-full">
      {stages.map((stage, i) => {
        const isFirst = i === 0;
        const isLast = i === stages.length - 1;
        const nextState = stages[i + 1]?.state ?? null;
        const leftColor = i === 0 ? 'transparent' : lineColor(stages[i - 1].state, stage.state);
        const rightColor = isLast ? 'transparent' : lineColor(stage.state, nextState);

        return (
          <div key={stage.name} className="flex flex-col items-center">
            {/* Line + circle row */}
            <div className="flex items-center w-full">
              {/* Left half-line */}
              <div
                className="flex-1 h-[2px]"
                style={{ backgroundColor: isFirst ? 'transparent' : leftColor }}
              />
              {/* Circle */}
              <StageCircle state={stage.state} index={i} />
              {/* Right half-line */}
              <div
                className="flex-1 h-[2px]"
                style={{ backgroundColor: isLast ? 'transparent' : rightColor }}
              />
            </div>

            {/* Label + sublabel */}
            <div className="mt-1.5 text-center px-1">
              <p
                className="text-[12px] font-semibold leading-tight"
                style={{
                  color:
                    stage.state === 'complete'
                      ? '#2F6B3F'
                      : stage.state === 'current'
                      ? '#CC8400'
                      : '#687069',
                }}
              >
                {stage.name}
              </p>
              {stage.sublabel ? (
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {stage.sublabel}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground/40 leading-tight mt-0.5">
                  &mdash;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Script approval card ──────────────────────────────────────────────────────

function ScriptApprovalCard() {
  const { script } = BUILD_WITH_ME_VIDEO;

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-foreground leading-snug">
          The script is approved before anyone records
        </p>
        <span className="flex-shrink-0 text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#E6F0EA] text-[#2F6B3F] border border-[#9FC3AE]">
          Approved
        </span>
      </div>

      {/* Body copy */}
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        A wrong word in a script costs one rewrite. A wrong word discovered after
        recording costs a full re-record — new raw audio, new edit pass, new
        narration render. Script approval is the gate that protects all of that
        downstream work. Every step below was signed off on{' '}
        {script.approvedAt} by {script.approvedBy}.
      </p>

      {/* Three-column inner tiles */}
      <div className="grid grid-cols-3 gap-2">
        {/* Tile 1: Steps */}
        <div className="rounded-[8px] border border-[#E2E4E1] p-3 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            Steps to demonstrate
          </p>
          <ol className="space-y-2 list-none">
            {script.steps.map((step, i) => (
              <li key={i} className="text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {i + 1}. {step.label}
                </span>
                <br />
                <span className="text-[11px] text-muted-foreground/70">
                  You should see: {step.youShouldSee}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tile 2: Sandbox */}
        <div className="rounded-[8px] border border-[#E2E4E1] p-3 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            Org to record in
          </p>
          <p className="text-[13px] font-mono text-foreground bg-[#F2F3F1] rounded px-2 py-1">
            {script.sandbox}
          </p>
          <span className="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A]">
            never production
          </span>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Record every step in the sandbox. Production data is never shown in a
            Build With Me video — not even anonymized.
          </p>
        </div>

        {/* Tile 3: Prohibitions */}
        <div className="rounded-[8px] border border-[#E2E4E1] p-3 space-y-2">
          <p className="text-[12px] font-semibold text-foreground">
            What may not appear on screen
          </p>
          <ul className="space-y-2">
            {[
              'Real learner names or case numbers',
              'Donor records or giving amounts',
              'Partner or vendor contact data',
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <OctagonMinus className="w-3.5 h-3.5 text-[#CC8400] flex-shrink-0 mt-0.5" />
                <span className="text-[12px] text-muted-foreground leading-snug">
                  {rule}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground/70 pt-1 leading-snug">
            Use the pre-seeded sandbox records only. If a real record appears by
            accident, the recording must be deleted and restarted — not blurred.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Narration selector ────────────────────────────────────────────────────────

type VoiceChoice = null | 'penny' | 'learner';

/**
 * localStorage key format: `narrator-voice-<videoId>`
 *
 * This is an interim persistence layer. The correct long-term home is a
 * `selected_voice` column on the video item record in the database (e.g. on
 * the `content_items` table or a dedicated `video_items` table), surfaced via
 * GET/PATCH /api/content-items/:id so the choice is durable across devices and
 * shared with the rest of the production pipeline.  Until that column exists,
 * localStorage gives us per-browser durability with zero API changes.
 */
const VOICE_STORAGE_KEY = (videoId: string) => `narrator-voice-${videoId}`;

function readStoredVoice(videoId: string): VoiceChoice {
  try {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY(videoId));
    if (raw === 'penny' || raw === 'learner') return raw;
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
  }
  return null;
}

function writeStoredVoice(videoId: string, choice: VoiceChoice): void {
  try {
    if (choice === null) {
      localStorage.removeItem(VOICE_STORAGE_KEY(videoId));
    } else {
      localStorage.setItem(VOICE_STORAGE_KEY(videoId), choice);
    }
  } catch {
    // ignore write failures — UI still works, just won't persist
  }
}

function NarrationSelector() {
  const videoId = BUILD_WITH_ME_VIDEO.id;
  // Lazy initializer reads the persisted choice so the consequence band
  // renders immediately on load without a flicker.
  const [voice, setVoice] = useState<VoiceChoice>(() => readStoredVoice(videoId));

  const cardBase =
    'cursor-pointer rounded-[8px] p-4 border-[1.5px] transition-all space-y-2 select-none';
  const selected = 'border-[#2F6B3F] bg-[#E6F0EA]';
  const unselected = 'border-[#E2E4E1] bg-white hover:border-[#9FC3AE]';

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
        Who narrates this one
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Card 1 — Penny */}
        <div
          className={`${cardBase} ${voice === 'penny' ? selected : unselected}`}
          onClick={() => setVoice(v => { const next = v === 'penny' ? null : 'penny'; writeStoredVoice(videoId, next); return next; })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setVoice(v => { const next = v === 'penny' ? null : 'penny'; writeStoredVoice(videoId, next); return next; }); }}
        >
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-[#2F6F7E]" />
            <p className="text-[13px] font-semibold text-foreground">
              Penny, on ElevenLabs
            </p>
            {voice === 'penny' && (
              <span className="ml-auto text-[11px] font-semibold text-[#2F6B3F]">Selected</span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Penny generates a synthetic voiceover using the approved script and
            the "Rachel — Coaching" voice preset on ElevenLabs.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Best for: high-volume series, consistent tone, fast turnaround.
          </p>
        </div>

        {/* Card 2 — Learner */}
        <div
          className={`${cardBase} ${voice === 'learner' ? selected : unselected}`}
          onClick={() => setVoice(v => { const next = v === 'learner' ? null : 'learner'; writeStoredVoice(videoId, next); return next; })}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setVoice(v => { const next = v === 'learner' ? null : 'learner'; writeStoredVoice(videoId, next); return next; }); }}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#2F6B3F]" />
            <p className="text-[13px] font-semibold text-foreground">
              The learner's own voice
            </p>
            {voice === 'learner' && (
              <span className="ml-auto text-[11px] font-semibold text-[#2F6B3F]">Selected</span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            The learner records their own narration using the approved script as
            a teleprompter guide. Audio is reviewed before editing begins.
          </p>
          <p className="text-[11px] text-muted-foreground/70">
            Best for: personal stories, coaching spotlights, community voices.
          </p>
        </div>
      </div>

      {/* Consequence band */}
      {voice === 'penny' && (
        <div className="rounded-[8px] px-4 py-3 bg-[#EDF5F8] border border-[#7FAFC6] text-[13px] text-[#2F6F7E] leading-snug">
          <span className="font-semibold">Disclosure required:</span> Videos narrated by
          Penny must include an on-screen caption and a description note reading
          "Narration generated by AI (ElevenLabs)." This caption appears in the
          first 5 seconds and in the YouTube description. Penny's voice is not
          identified as a specific person.
        </div>
      )}
      {voice === 'learner' && (
        <div className="rounded-[8px] px-4 py-3 bg-[#E6F0EA] border border-[#9FC3AE] text-[13px] text-[#2F6B3F] leading-snug space-y-1">
          <p>
            <span className="font-semibold">Name credit:</span> The learner's first name
            and last initial appear in the YouTube description and on the kit page
            (e.g. "Narrated by Jordan T.").
          </p>
          <p>
            <span className="font-semibold">25 campaign points</span> are awarded to the
            learner's Trail OS profile when the video publishes.
          </p>
          <p>
            <span className="font-semibold">Portfolio link:</span> The learner may
            request a direct YouTube link to add to their transition portfolio.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Post-production tiles ─────────────────────────────────────────────────────

const POST_PROD_TILES = [
  {
    icon: Scissors,
    name: 'Descript',
    description:
      'Use Descript to cut dead air between steps, add chapter markers at each numbered step, and export a clean MP4. Do not use the AI voice filler — the approved script is the source of truth.',
    action: 'Open Descript project',
    href: 'https://descript.com',
  },
  {
    icon: Image,
    name: 'Thumbnail',
    description:
      'Use the Build With Me Canva template. The thumbnail must not include AI-generated lettering (no Gemini image text) — all text must come from the Canva template type layers.',
    action: 'Open Canva template',
    href: 'https://canva.com',
  },
  {
    icon: Captions,
    name: 'Captions',
    description:
      'Upload captions from the approved script file — do not use YouTube\'s auto-transcription. Script captions are already timed to the narration pass. Review for accuracy before publishing.',
    action: 'Download caption file',
    href: '#',
  },
];

function PostProductionTiles() {
  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
        Post-production
      </p>
      <div className="grid grid-cols-3 gap-3">
        {POST_PROD_TILES.map(tile => (
          <div
            key={tile.name}
            className="rounded-[8px] border border-[#E2E4E1] bg-white p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <tile.icon className="w-4 h-4 text-[#2F6F7E]" />
              <p className="text-[13px] font-semibold text-foreground">{tile.name}</p>
            </div>
            <p className="text-[12px] text-muted-foreground leading-snug">
              {tile.description}
            </p>
            <a
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2F6F7E] hover:underline"
            >
              {tile.action}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QR card ───────────────────────────────────────────────────────────────────

function QrCard() {
  const { shortCode, shortUrl } = BUILD_WITH_ME_VIDEO;

  return (
    <div className="rounded-[14px] border border-border bg-card p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: '120px 1fr' }}>
        {/* QR placeholder */}
        <div
          className="rounded-[8px] flex flex-col items-center justify-center gap-1 text-center"
          style={{
            width: 120,
            height: 120,
            backgroundColor: '#F2F3F1',
          }}
        >
          <ScanLine className="w-8 h-8 text-[#687069]" />
          <span className="text-[9px] text-[#687069] leading-tight px-1 break-all">
            {shortUrl}
          </span>
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 text-[#2F6F7E]" />
            <p className="text-[13px] font-semibold text-foreground">
              Short code:{' '}
              <span className="font-mono text-[#2F6F7E]">{shortCode}</span>
            </p>
          </div>
          <ul className="space-y-1">
            {[
              'Never encodes the YouTube URL — always the short redirect.',
              'Can be issued at script approval, before recording is done.',
              'Scan-test the QR before sending to print; test again after publish.',
            ].map((pt, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-[#2F6F7E] font-bold text-[11px] mt-0.5">·</span>
                <span className="text-[12px] text-muted-foreground leading-snug">{pt}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <button className="text-[12px] font-medium px-3 py-1.5 rounded-md border border-[#E2E4E1] text-muted-foreground hover:bg-muted/40 transition-colors">
              Test before print
            </button>
            <button className="text-[12px] font-medium px-3 py-1.5 rounded-md border border-[#E2E4E1] text-muted-foreground hover:bg-muted/40 transition-colors">
              Test after publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Publications table ────────────────────────────────────────────────────────

function PublicationsTable() {
  const { publications } = BUILD_WITH_ME_VIDEO;

  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
        Where it lands
      </p>
      <div className="rounded-[8px] border border-border overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#F2F3F1] border-b border-border">
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Platform
              </th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Planned date
              </th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Note / URL
              </th>
            </tr>
          </thead>
          <tbody>
            {publications.map((pub, i) => (
              <tr
                key={pub.platform}
                className={i < publications.length - 1 ? 'border-b border-border' : ''}
              >
                <td className="px-3 py-2 font-medium text-foreground">{pub.platform}</td>
                <td className="px-3 py-2 text-muted-foreground">{pub.planned}</td>
                <td className="px-3 py-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF5F8] text-[#2F6F7E] border border-[#7FAFC6]">
                    {pub.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground text-[12px]">
                  {pub.url ? (
                    <a
                      href={pub.url}
                      className="text-[#2F6F7E] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {pub.url}
                    </a>
                  ) : (
                    pub.note
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Series list card ──────────────────────────────────────────────────────────

function SeriesCard() {
  const { series } = BUILD_WITH_ME_VIDEO;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden text-[14px]">
      <div className="bg-[#F2F3F1] border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Series — Build With Me
        </p>
      </div>
      <div className="p-3 space-y-1">
        {series.map(ep => (
          <div
            key={ep.id}
            className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/30 transition-colors"
          >
            {ep.voice === 'penny' ? (
              <Headphones className="w-3.5 h-3.5 text-[#2F6F7E] flex-shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-[#2F6B3F] flex-shrink-0" />
            )}
            <span className="text-[12px] text-muted-foreground leading-snug flex-1 min-w-0 truncate">
              {ep.title}
            </span>
            <span
              className="text-[10px] font-medium flex-shrink-0"
              style={{ color: ep.voice === 'penny' ? '#2F6F7E' : '#2F6B3F' }}
            >
              {ep.voice === 'penny' ? 'Penny' : 'Learner'}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-2.5 bg-[#F8F9F8]">
        <p className="text-[11px] text-muted-foreground/70 leading-snug">
          One voice per video, not per series — mixing deliberately is fine,
          drifting is not.
        </p>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function BuildWithMeTab() {
  const { title, eyebrow, status, format, length, kit, driveUrl } =
    BUILD_WITH_ME_VIDEO;

  return (
    <div className="flex flex-col gap-5 p-4 text-[14px] min-h-0 overflow-y-auto">

      {/* ── Info strip ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-2.5 rounded-[8px] px-4 py-3 text-[13px] text-[#2F6F7E]"
        style={{ backgroundColor: '#EDF5F8', borderLeft: '4px solid #2F6F7E' }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          A video is a Content Item with Format{' '}
          <span className="font-semibold">Video</span>. Same record, same
          statuses, same one gate — this tab is the stages that only a video
          has.
        </p>
      </div>

      {/* ── Record sub-header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            {eyebrow}
          </p>
          <h2
            className="font-serif font-semibold leading-snug text-foreground"
            style={{ fontSize: 20 }}
          >
            {title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {/* Status pill */}
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A]">
              {status}
            </span>
            {/* Format chip */}
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#F2F3F1] text-[#687069] border border-[#E2E4E1]">
              {format} · {length}
            </span>
            {/* Ships note */}
            <span className="text-[12px] text-muted-foreground">
              Ships inside kit{' '}
              <span className="font-medium text-foreground">{kit}</span> and on
              YouTube
            </span>
          </div>
        </div>

        {/* Drive button */}
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2F6F7E] text-[#2F6F7E] text-[13px] font-medium hover:bg-[#EDF5F8] transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open folder in Drive
        </a>
      </div>

      {/* ── Stage rail ──────────────────────────────────────────────────────── */}
      <div className="rounded-[8px] border border-border bg-card px-6 py-4">
        <StageRail />
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 300px' }}>

        {/* Main column */}
        <div className="flex flex-col gap-5 min-w-0">
          <ScriptApprovalCard />
          <NarrationSelector />
          <PostProductionTiles />
          <QrCard />
          <PublicationsTable />
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <InsightCard
            kind="advisory"
            scope="This record"
            observation="Step 4 in the approved script ('Review the CI check results') was captured with all checks passing — but the recording shows a TypeScript warning that was dismissed without resolution. The script says 'All checks green; no failing TypeScript or lint errors.' This is a capture mismatch. A viewer following the video may expect a clean output and be confused when they see a warning. Recommend a retake of step 4 or a script amendment acknowledging the warning is expected."
            readFrom={['Script · Approved 11 Aug', 'Recording · captured 13 Aug', 'CI log · step 4 output']}
            primaryAction={{ label: 'Flag for retake', onClick: () => {} }}
            secondaryAction={{ label: 'Amend script', onClick: () => {} }}
            pennyNote="I cross-referenced the script steps against the recording timestamps. Step 4 is the only mismatch — steps 1–3 and 5–7 are clean."
            onDismiss={_reason => {}}
          />

          <ContentStudioPennyCard
            mode="Quest Guide"
            message="You're in the Narrate stage — the most consequential choice in this pipeline. Penny narration ships faster and stays consistent across the series, but requires a disclosure caption. Learner narration adds authenticity and earns campaign points, but needs audio review before editing can start. Choose based on who this video is for and how quickly it needs to ship."
            actions={['Compare voice samples', 'View disclosure template', 'Open audio review checklist']}
          />

          <SeriesCard />
        </div>
      </div>
    </div>
  );
}
