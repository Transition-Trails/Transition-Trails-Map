import { useState } from "react";
import {
  Sparkles, Layers, FileText, Mic, Play, CheckCircle2,
  Image, Music, Video, File, ExternalLink, HardDrive,
  ChevronRight, RefreshCw,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────

interface MockFile {
  id: string;
  name: string;
  type: "image" | "audio" | "video" | "doc";
  date: string;
  size: string;
}

const STATES = [
  {
    id: "coaching",
    label: "Coaching",
    description: "One-on-one sessions & check-ins",
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    activeBg: "bg-violet-600",
    dot: "bg-violet-500",
    files: [
      { id: "1", name: "Penny coaching avatar.png",      type: "image", date: "12 Jun 2026", size: "840 KB" },
      { id: "2", name: "Opening check-in script.pdf",    type: "doc",   date: "10 Jun 2026", size: "120 KB" },
      { id: "3", name: "Coaching tone voice.mp3",        type: "audio", date: "9 Jun 2026",  size: "2.1 MB" },
    ] as MockFile[],
  },
  {
    id: "trail-talk",
    label: "Trail Talk",
    description: "Group sessions & presentations",
    icon: Layers,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    activeBg: "bg-sky-600",
    dot: "bg-sky-500",
    files: [
      { id: "4", name: "Trail Talk intro slide.png",     type: "image", date: "8 Jun 2026",  size: "1.2 MB" },
      { id: "5", name: "Group welcome message.mp3",      type: "audio", date: "8 Jun 2026",  size: "980 KB" },
    ] as MockFile[],
  },
  {
    id: "resume-review",
    label: "Resume Review",
    description: "Career document & CV feedback",
    icon: FileText,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    activeBg: "bg-emerald-600",
    dot: "bg-emerald-500",
    files: [
      { id: "6", name: "Resume review avatar.png",       type: "image", date: "7 Jun 2026",  size: "670 KB" },
      { id: "7", name: "Review feedback script.pdf",     type: "doc",   date: "7 Jun 2026",  size: "88 KB"  },
      { id: "8", name: "Encouragement snippet.mp3",      type: "audio", date: "6 Jun 2026",  size: "540 KB" },
      { id: "9", name: "Document walkthrough.mp4",       type: "video", date: "5 Jun 2026",  size: "14 MB"  },
    ] as MockFile[],
  },
  {
    id: "interview-prep",
    label: "Interview Prep",
    description: "Mock interviews & frameworks",
    icon: Mic,
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    activeBg: "bg-rose-600",
    dot: "bg-rose-500",
    files: [
      { id: "10", name: "Interview Penny avatar.png",    type: "image", date: "4 Jun 2026",  size: "720 KB" },
      { id: "11", name: "STAR framework guide.pdf",      type: "doc",   date: "4 Jun 2026",  size: "210 KB" },
    ] as MockFile[],
  },
  {
    id: "confidence-builder",
    label: "Confidence Builder",
    description: "Motivational assets & affirmations",
    icon: Play,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBg: "bg-amber-600",
    dot: "bg-amber-500",
    files: [] as MockFile[],
  },
  {
    id: "quest-debrief",
    label: "Quest Debrief",
    description: "Trail Quest completions & debriefs",
    icon: CheckCircle2,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    activeBg: "bg-teal-600",
    dot: "bg-teal-500",
    files: [
      { id: "12", name: "Quest completion banner.png",   type: "image", date: "2 Jun 2026",  size: "1.4 MB" },
      { id: "13", name: "Debrief celebration.mp3",       type: "audio", date: "2 Jun 2026",  size: "760 KB" },
    ] as MockFile[],
  },
];

const FILE_ICONS = { image: Image, audio: Music, video: Video, doc: FileText };
const TYPE_COLORS = {
  image: "bg-violet-100 text-violet-700",
  audio: "bg-sky-100 text-sky-700",
  video: "bg-rose-100 text-rose-700",
  doc:   "bg-amber-100 text-amber-700",
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function StatePicker() {
  const [active, setActive] = useState(STATES[0].id);
  const selected = STATES.find(s => s.id === active)!;
  const Icon = selected.icon;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">

      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-[13px] font-semibold text-zinc-800">Penny Asset Library</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-[12px] text-zinc-500">{selected.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Drive connected
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-5xl mx-auto w-full">

        {/* State picker grid */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">Select a Penny state</p>
          <div className="grid grid-cols-3 gap-3">
            {STATES.map(s => {
              const SI = s.icon;
              const isActive = s.id === active;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`relative text-left rounded-xl border px-4 py-3.5 transition-all group ${
                    isActive
                      ? `${s.bg} ${s.border} shadow-sm ring-2 ring-offset-1 ring-${s.dot.split('-')[1]}-400`
                      : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                  }`}
                >
                  <div className={`inline-flex p-1.5 rounded-lg mb-2 ${isActive ? "bg-white/70" : s.bg}`}>
                    <SI className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-[12px] font-semibold ${isActive ? "text-zinc-900" : "text-zinc-700"}`}>{s.label}</p>
                      <p className="text-[10px] text-zinc-500 leading-snug mt-0.5">{s.description}</p>
                    </div>
                    <span className={`text-[9px] font-bold shrink-0 ml-2 mt-0.5 px-1.5 py-0.5 rounded-full ${
                      s.files.length > 0
                        ? `${s.bg} ${s.color} border ${s.border}`
                        : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                    }`}>
                      {s.files.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Asset gallery for selected state */}
        <div className={`rounded-xl border ${selected.border} ${selected.bg} overflow-hidden`}>
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/60">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg bg-white/70`}>
                <Icon className={`w-3.5 h-3.5 ${selected.color}`} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-800">{selected.label}</p>
                <p className="text-[10px] text-zinc-500">{selected.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">
                Drive folder: <code className="font-mono text-zinc-600 bg-white/70 px-1 rounded">{selected.id}/</code>
              </span>
            </div>
          </div>

          <div className="px-5 py-4">
            {selected.files.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selected.files.map(file => {
                  const FIcon = FILE_ICONS[file.type];
                  return (
                    <div key={file.id} className="bg-white rounded-lg border border-white shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="h-20 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative">
                        <FIcon className="w-8 h-8 text-zinc-200" />
                        <button className="absolute top-1.5 right-1.5 p-1 rounded bg-white border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </button>
                      </div>
                      <div className="px-2.5 py-2">
                        <p className="text-[10px] font-medium text-zinc-700 truncate leading-snug">{file.name}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${TYPE_COLORS[file.type]}`}>
                            {file.type}
                          </span>
                          <span className="text-[8px] text-zinc-400">{file.size}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <HardDrive className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-[12px] font-medium text-zinc-500">No assets yet</p>
                <p className="text-[10px] text-zinc-400 mt-1 max-w-xs">
                  Create a subfolder named <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-500">{selected.id}/</code> inside your Penny Assets Drive folder and upload files there.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
