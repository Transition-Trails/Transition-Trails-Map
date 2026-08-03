/**
 * VideoProduction — Build with Me voiceover pipeline
 * Phase 1: Write / rewrite script with Gemini
 * Phase 2: Pick a voice from ElevenLabs
 * Phase 3: Generate TTS audio, preview, and download
 */
import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mic, Wand2, Play, Pause, Download, RefreshCw,
  CheckCircle2, ChevronRight, AlertCircle, Volume2,
  FileText, Sparkles, Clock, Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Voice {
  voiceId:     string;
  name:        string;
  category:    string;
  accent:      string | null;
  description: string | null;
  gender:      string | null;
  age:         string | null;
  useCase:     string | null;
  previewUrl:  string | null;
}

type Phase = 1 | 2 | 3;
type ScriptStyle = 'build-with-me' | 'overview' | 'coaching' | 'reflection';

const STYLE_OPTIONS: { value: ScriptStyle; label: string; desc: string }[] = [
  { value: 'build-with-me', label: 'Build with Me',     desc: 'Step-by-step guided build'    },
  { value: 'overview',      label: 'Program Overview',  desc: 'Big-picture narration'         },
  { value: 'coaching',      label: 'Coaching Session',  desc: 'One-on-one coaching tone'      },
  { value: 'reflection',    label: 'Guided Reflection', desc: 'Introspective prompts & space' },
];

const PHASE_LABELS: Record<Phase, string> = {
  1: 'Script',
  2: 'Voice',
  3: 'Produce',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function estimateDuration(words: number) {
  // ~140 words per minute for coached narration
  const secs = Math.round((words / 140) * 60);
  if (secs < 60) return `~${secs}s`;
  return `~${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Phase stepper ──────────────────────────────────────────────────────────────

function Stepper({ phase, done }: { phase: Phase; done: Phase[] }) {
  return (
    <div className="flex items-center gap-0">
      {([1, 2, 3] as Phase[]).map((p, i) => {
        const isActive = p === phase;
        const isDone   = done.includes(p);
        return (
          <div key={p} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              isActive ? 'bg-primary text-primary-foreground'
              : isDone  ? 'bg-[#E6F0EA] text-[#2F6B3F]'
              : 'bg-muted text-muted-foreground'
            }`}>
              {isDone && !isActive
                ? <CheckCircle2 className="w-3 h-3" />
                : <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold">{p}</span>
              }
              {PHASE_LABELS[p]}
            </div>
            {i < 2 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Voice card ──────────────────────────────────────────────────────────────────

function VoiceCard({
  voice, selected, onSelect, onPreview, previewing,
}: {
  voice:     Voice;
  selected:  boolean;
  onSelect:  () => void;
  onPreview: () => void;
  previewing: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-foreground">{voice.name}</span>
            {voice.gender && (
              <span className="text-[9px] font-bold bg-muted border border-border rounded-full px-1.5 py-0.5 text-muted-foreground capitalize">
                {voice.gender}
              </span>
            )}
            {voice.accent && (
              <span className="text-[9px] font-bold bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-1.5 py-0.5 text-[#2F6F7E] capitalize">
                {voice.accent}
              </span>
            )}
            {voice.age && (
              <span className="text-[9px] font-bold bg-muted border border-border rounded-full px-1.5 py-0.5 text-muted-foreground capitalize">
                {voice.age}
              </span>
            )}
          </div>
          {voice.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{voice.description}</p>
          )}
          {voice.useCase && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 capitalize">{voice.useCase}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {voice.previewUrl && (
            <button
              onClick={e => { e.stopPropagation(); onPreview(); }}
              title="Preview voice"
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                previewing
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'
              }`}
            >
              {previewing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}
          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
        </div>
      </div>
    </button>
  );
}

// ── Audio player ───────────────────────────────────────────────────────────────

function AudioPlayer({ audioBase64, filename }: { audioBase64: string; filename: string }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const src = `data:audio/mpeg;base64,${audioBase64}`;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnd   = () => { setPlaying(false); setProgress(0); };
    const onTime  = () => setProgress(el.currentTime);
    const onMeta  = () => setDuration(el.duration);
    el.addEventListener('ended',           onEnd);
    el.addEventListener('timeupdate',      onTime);
    el.addEventListener('loadedmetadata',  onMeta);
    return () => {
      el.removeEventListener('ended',          onEnd);
      el.removeEventListener('timeupdate',     onTime);
      el.removeEventListener('loadedmetadata', onMeta);
    };
  }, [audioBase64]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else         { void el.play(); setPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const t = (parseFloat(e.target.value) / 100) * duration;
    el.currentTime = t;
    setProgress(t);
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function handleDownload() {
    const bytes  = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const blob   = new Blob([bytes], { type: 'audio/mpeg' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <audio ref={audioRef} src={src} preload="auto" />

      {/* Waveform progress bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 hover:bg-primary/90 transition-colors"
        >
          {playing
            ? <Pause  className="w-4 h-4" />
            : <Play   className="w-4 h-4 ml-0.5" />
          }
        </button>
        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0} max={100}
            value={pct}
            onChange={handleSeek}
            className="w-full h-1.5 appearance-none bg-muted rounded-full cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{fmtTime(progress)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Download MP3 · {filename}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function VideoProduction() {
  // Phase
  const [phase, setPhase]       = useState<Phase>(1);
  const [donePhases, setDone]   = useState<Phase[]>([]);

  // Phase 1 — Script
  const [rawScript,       setRawScript]       = useState('');
  const [programName,     setProgramName]     = useState('');
  const [scriptStyle,     setScriptStyle]     = useState<ScriptStyle>('build-with-me');
  const [rewrittenScript, setRewrittenScript] = useState('');
  const [activeScript,    setActiveScript]    = useState<'raw' | 'rewritten'>('raw');
  const [rewriting,       setRewriting]       = useState(false);
  const [rewriteError,    setRewriteError]    = useState<string | null>(null);
  const [rewriteMs,       setRewriteMs]       = useState<number | null>(null);

  // Phase 2 — Voice
  const [voices,        setVoices]        = useState<Voice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError,   setVoicesError]   = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [previewingId,  setPreviewingId]  = useState<string | null>(null);
  const [categoryFilter,setCategoryFilter]= useState<string>('all');
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  // Phase 3 — Produce
  const [generating,  setGenerating]  = useState(false);
  const [produceError,setProduceError]= useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [generateMs,  setGenerateMs]  = useState<number | null>(null);

  // Load voices when entering phase 2
  useEffect(() => {
    if (phase !== 2 || voices.length > 0) return;
    setVoicesLoading(true);
    setVoicesError(null);
    fetch('/api/voiceover/voices')
      .then(r => r.ok ? r.json() as Promise<{ voices: Voice[] }> : r.json().then(e => Promise.reject(e)))
      .then(d => setVoices(d.voices ?? []))
      .catch((e: unknown) => {
        const msg = (e as { error?: string })?.error ?? 'Failed to load voices';
        setVoicesError(msg);
      })
      .finally(() => setVoicesLoading(false));
  }, [phase, voices.length]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleRewrite() {
    if (!rawScript.trim() || rewriting) return;
    setRewriting(true);
    setRewriteError(null);
    try {
      const resp = await fetch('/api/voiceover/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawScript, programName: programName || undefined, style: scriptStyle }),
      });
      const data = await resp.json() as { script?: string; error?: string; durationMs?: number };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'Rewrite failed');
      setRewrittenScript(data.script!);
      setActiveScript('rewritten');
      setRewriteMs(data.durationMs ?? null);
    } catch (e) {
      setRewriteError(e instanceof Error ? e.message : 'Script rewrite failed');
    } finally {
      setRewriting(false);
    }
  }

  function handlePhase1Continue() {
    const script = activeScript === 'rewritten' && rewrittenScript ? rewrittenScript : rawScript;
    if (!script.trim()) return;
    setDone(d => d.includes(1) ? d : [...d, 1]);
    setPhase(2);
  }

  function handlePhase2Continue() {
    if (!selectedVoice) return;
    setDone(d => d.includes(2) ? d : [...d, 2]);
    setPhase(3);
    setAudioBase64(null);
    setProduceError(null);
  }

  async function handleGenerate() {
    const script = activeScript === 'rewritten' && rewrittenScript ? rewrittenScript : rawScript;
    if (!script.trim() || !selectedVoice || generating) return;
    setGenerating(true);
    setProduceError(null);
    setAudioBase64(null);
    try {
      const resp = await fetch('/api/voiceover/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, voiceId: selectedVoice.voiceId }),
      });
      const data = await resp.json() as { audioBase64?: string; error?: string; durationMs?: number };
      if (!resp.ok || data.error) throw new Error(data.error ?? 'TTS generation failed');
      setAudioBase64(data.audioBase64!);
      setGenerateMs(data.durationMs ?? null);
      setDone(d => d.includes(3) ? d : [...d, 3]);
    } catch (e) {
      setProduceError(e instanceof Error ? e.message : 'Audio generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function stopPreview() {
    previewAudio.current?.pause();
    previewAudio.current = null;
    setPreviewingId(null);
  }

  function togglePreview(voice: Voice) {
    if (!voice.previewUrl) return;
    if (previewingId === voice.voiceId) { stopPreview(); return; }
    stopPreview();
    const a = new Audio(voice.previewUrl);
    previewAudio.current = a;
    setPreviewingId(voice.voiceId);
    void a.play();
    a.onended = () => setPreviewingId(null);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const currentScript = activeScript === 'rewritten' && rewrittenScript ? rewrittenScript : rawScript;
  const wc     = wordCount(currentScript);
  const canP1  = rawScript.trim().length > 0;
  const canP2  = selectedVoice !== null;

  const categories = ['all', ...Array.from(new Set(voices.map(v => v.category).filter(Boolean)))];
  const filteredVoices = categoryFilter === 'all'
    ? voices
    : voices.filter(v => v.category === categoryFilter);

  const filename = `${(programName || 'voiceover').toLowerCase().replace(/\s+/g, '-')}-${scriptStyle}.mp3`;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Mic className="w-4 h-4 text-primary" />
              <h1 className="text-base font-semibold text-foreground">Build with Me · Video Production</h1>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Rewrite any content into a voiced narration — powered by Gemini + ElevenLabs
            </p>
          </div>
          <div className="shrink-0">
            <Stepper phase={phase} done={donePhases} />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PHASE 1 — SCRIPT                                               */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {phase === 1 && (
          <div className="space-y-4">

            {/* Program name + style */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                  Program name <span className="font-normal">(optional)</span>
                </label>
                <input
                  value={programName}
                  onChange={e => setProgramName(e.target.value)}
                  placeholder="e.g. Guided Trail — Sprint 3"
                  className="w-full text-[12px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                  Script style
                </label>
                <select
                  value={scriptStyle}
                  onChange={e => setScriptStyle(e.target.value as ScriptStyle)}
                  className="w-full text-[12px] border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {STYLE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Raw script input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Raw content
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {wordCount(rawScript)} words
                </span>
              </div>
              <textarea
                value={rawScript}
                onChange={e => { setRawScript(e.target.value); setActiveScript('raw'); }}
                placeholder="Paste lesson content, program description, learning objectives, or any text you want to turn into a voiced narration…"
                rows={8}
                className="w-full text-[12px] border border-border rounded-lg px-3 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
              />
            </div>

            {/* Rewrite controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => void handleRewrite()}
                disabled={!rawScript.trim() || rewriting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rewriting
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Wand2 className="w-3.5 h-3.5" />
                }
                {rewriting ? 'Rewriting…' : 'Rewrite with Gemini'}
              </button>
              {rewriteMs !== null && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Zap className="w-3 h-3" />{(rewriteMs / 1000).toFixed(1)}s
                </span>
              )}
              {rewriteError && (
                <span className="flex items-center gap-1 text-[11px] text-[#A93F2F]">
                  <AlertCircle className="w-3 h-3" />{rewriteError}
                </span>
              )}
            </div>

            {/* Rewritten script */}
            {rewrittenScript && (
              <div className="rounded-xl border border-[#9FC3AE] bg-[#E6F0EA]/40 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#9FC3AE]/60 bg-[#E6F0EA]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2F6B3F]" />
                  <span className="text-[11px] font-semibold text-[#2F6B3F]">Gemini rewrite</span>
                  <span className="text-[10px] text-[#2F6B3F]/70 ml-auto">
                    {wordCount(rewrittenScript)} words · {estimateDuration(wordCount(rewrittenScript))} spoken
                  </span>
                </div>
                <div className="p-3">
                  <textarea
                    value={rewrittenScript}
                    onChange={e => setRewrittenScript(e.target.value)}
                    rows={8}
                    className="w-full text-[12px] bg-transparent border-none focus:outline-none resize-none leading-relaxed text-foreground"
                    onClick={() => setActiveScript('rewritten')}
                  />
                </div>
                <div className="flex items-center gap-2 px-3 pb-2.5">
                  {(['raw', 'rewritten'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setActiveScript(v)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        activeScript === v
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      Use {v === 'raw' ? 'original' : 'rewritten'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Script summary */}
            {currentScript.trim() && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/20">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Using <strong>{activeScript === 'rewritten' && rewrittenScript ? 'rewritten' : 'original'}</strong> script</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{estimateDuration(wc)} spoken
                </span>
                <span>·</span>
                <span>{wc} words</span>
              </div>
            )}

            <button
              onClick={handlePhase1Continue}
              disabled={!canP1}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Choose a voice <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PHASE 2 — VOICE                                                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {phase === 2 && (
          <div className="space-y-4">

            {/* Script summary chip */}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/20">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-xs">{currentScript.slice(0, 80)}…</span>
              <button
                onClick={() => setPhase(1)}
                className="ml-auto shrink-0 text-primary text-[10px] font-medium hover:underline"
              >
                Edit script
              </button>
            </div>

            {/* Category filter */}
            {voices.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors capitalize ${
                      categoryFilter === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {cat === 'all' ? 'All voices' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Voices list */}
            {voicesLoading && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse" />
                ))}
              </div>
            )}

            {!voicesLoading && voicesError && (
              <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A93F2F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-[#A93F2F]">{voicesError}</p>
                  <p className="text-[11px] text-[#A93F2F]/70 mt-0.5">
                    Make sure ELEVENLABS_API_KEY is set in Admin → Integrations → Secrets.
                  </p>
                </div>
              </div>
            )}

            {!voicesLoading && !voicesError && filteredVoices.length > 0 && (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto rounded-lg">
                {filteredVoices.map(voice => (
                  <VoiceCard
                    key={voice.voiceId}
                    voice={voice}
                    selected={selectedVoice?.voiceId === voice.voiceId}
                    onSelect={() => setSelectedVoice(voice)}
                    onPreview={() => togglePreview(voice)}
                    previewing={previewingId === voice.voiceId}
                  />
                ))}
              </div>
            )}

            {selectedVoice && (
              <div className="flex items-center gap-2 text-[11px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Voice selected: <strong>{selectedVoice.name}</strong></span>
                {selectedVoice.accent && <span className="text-[#2F6B3F]/70">· {capitalize(selectedVoice.accent)}</span>}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setPhase(1)}
                className="px-4 py-2.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePhase2Continue}
                disabled={!canP2}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate audio <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PHASE 3 — PRODUCE                                              */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {phase === 3 && (
          <div className="space-y-4">

            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Script</p>
                <p className="text-[11px] font-medium text-foreground truncate">{currentScript.slice(0, 60)}…</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{wc} words · {estimateDuration(wc)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Voice</p>
                <p className="text-[11px] font-medium text-foreground">{selectedVoice?.name ?? '—'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {selectedVoice?.gender ?? ''}{selectedVoice?.accent ? ` · ${selectedVoice.accent}` : ''}
                </p>
              </div>
            </div>

            {/* Generate button */}
            {!audioBase64 && (
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating voiceover…
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Generate voiceover
                  </>
                )}
              </button>
            )}

            {generating && (
              <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-foreground">Generating audio with ElevenLabs…</p>
                  <p className="text-[10px] text-muted-foreground">This takes 10–30 seconds depending on script length.</p>
                </div>
              </div>
            )}

            {produceError && (
              <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#A93F2F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-[#A93F2F]">{produceError}</p>
                  <button
                    onClick={() => void handleGenerate()}
                    className="mt-1.5 text-[11px] text-[#A93F2F] font-medium underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {audioBase64 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px] text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Voiceover generated successfully</span>
                  {generateMs !== null && (
                    <span className="ml-auto text-[#2F6B3F]/70 flex items-center gap-1">
                      <Zap className="w-3 h-3" />{(generateMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                <AudioPlayer audioBase64={audioBase64} filename={filename} />

                <button
                  onClick={() => void handleGenerate()}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPhase(2)}
                className="px-4 py-2.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                Change voice
              </button>
              <button
                onClick={() => { setPhase(1); setAudioBase64(null); setRewrittenScript(''); setDone([]); }}
                className="px-4 py-2.5 rounded-lg border border-border text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors"
              >
                New script
              </button>
            </div>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
