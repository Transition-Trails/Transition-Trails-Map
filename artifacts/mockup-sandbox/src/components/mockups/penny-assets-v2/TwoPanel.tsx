import { useState } from "react";
import {
  Sparkles, Layers, FileText, Mic, Play, CheckCircle2,
  Image, Music, Video, ExternalLink, RefreshCw,
  HardDrive, AlertTriangle, LayoutGrid, List,
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
    sub: "Check-ins & goal setting",
    icon: Sparkles,
    accent: "#7c3aed",
    lightBg: "#f5f3ff",
    count: 3,
    files: [
      { id: "1", name: "Penny coaching avatar.png",    type: "image", date: "12 Jun 2026", size: "840 KB" },
      { id: "2", name: "Opening check-in script.pdf",  type: "doc",   date: "10 Jun 2026", size: "120 KB" },
      { id: "3", name: "Coaching tone voice.mp3",      type: "audio", date: "9 Jun 2026",  size: "2.1 MB" },
    ] as MockFile[],
  },
  {
    id: "trail-talk",
    label: "Trail Talk",
    sub: "Group sessions",
    icon: Layers,
    accent: "#0284c7",
    lightBg: "#f0f9ff",
    count: 2,
    files: [
      { id: "4", name: "Trail Talk intro slide.png",   type: "image", date: "8 Jun 2026",  size: "1.2 MB" },
      { id: "5", name: "Group welcome message.mp3",    type: "audio", date: "8 Jun 2026",  size: "980 KB" },
    ] as MockFile[],
  },
  {
    id: "resume-review",
    label: "Resume Review",
    sub: "Career documents",
    icon: FileText,
    accent: "#059669",
    lightBg: "#f0fdf4",
    count: 4,
    files: [
      { id: "6",  name: "Resume review avatar.png",    type: "image", date: "7 Jun 2026",  size: "670 KB" },
      { id: "7",  name: "Review feedback script.pdf",  type: "doc",   date: "7 Jun 2026",  size: "88 KB"  },
      { id: "8",  name: "Encouragement snippet.mp3",   type: "audio", date: "6 Jun 2026",  size: "540 KB" },
      { id: "9",  name: "Document walkthrough.mp4",    type: "video", date: "5 Jun 2026",  size: "14 MB"  },
    ] as MockFile[],
  },
  {
    id: "interview-prep",
    label: "Interview Prep",
    sub: "Mock interviews",
    icon: Mic,
    accent: "#e11d48",
    lightBg: "#fff1f2",
    count: 2,
    files: [
      { id: "10", name: "Interview Penny avatar.png",  type: "image", date: "4 Jun 2026",  size: "720 KB" },
      { id: "11", name: "STAR framework guide.pdf",    type: "doc",   date: "4 Jun 2026",  size: "210 KB" },
    ] as MockFile[],
  },
  {
    id: "confidence-builder",
    label: "Confidence Builder",
    sub: "Affirmations & motivation",
    icon: Play,
    accent: "#d97706",
    lightBg: "#fffbeb",
    count: 0,
    files: [] as MockFile[],
  },
  {
    id: "quest-debrief",
    label: "Quest Debrief",
    sub: "Completions & celebrations",
    icon: CheckCircle2,
    accent: "#0d9488",
    lightBg: "#f0fdfa",
    count: 2,
    files: [
      { id: "12", name: "Quest completion banner.png", type: "image", date: "2 Jun 2026",  size: "1.4 MB" },
      { id: "13", name: "Debrief celebration.mp3",     type: "audio", date: "2 Jun 2026",  size: "760 KB" },
    ] as MockFile[],
  },
];

const TYPE_META: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  image: { icon: Image,    label: "Image", bg: "bg-violet-50",  text: "text-violet-600" },
  audio: { icon: Music,    label: "Audio", bg: "bg-sky-50",     text: "text-sky-600"    },
  video: { icon: Video,    label: "Video", bg: "bg-rose-50",    text: "text-rose-600"   },
  doc:   { icon: FileText, label: "Doc",   bg: "bg-amber-50",   text: "text-amber-600"  },
};

// ── File row (list view) ──────────────────────────────────────────────────────

function FileRow({ file }: { file: MockFile }) {
  const meta = TYPE_META[file.type];
  const FIcon = meta.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 rounded-lg group transition-colors">
      <div className={`p-1.5 rounded-lg ${meta.bg} shrink-0`}>
        <FIcon className={`w-3.5 h-3.5 ${meta.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-zinc-700 truncate">{file.name}</p>
        <p className="text-[10px] text-zinc-400">{file.date} · {file.size}</p>
      </div>
      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
        {meta.label}
      </span>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-200">
        <ExternalLink className="w-3 h-3 text-zinc-400" />
      </button>
    </div>
  );
}

// ── File card (grid view) ─────────────────────────────────────────────────────

function FileCard({ file }: { file: MockFile }) {
  const meta = TYPE_META[file.type];
  const FIcon = meta.icon;
  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden group hover:shadow-md transition-shadow">
      <div className="h-24 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative">
        <FIcon className="w-9 h-9 text-zinc-200" />
        <button className="absolute top-2 right-2 p-1.5 rounded-lg bg-white border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ExternalLink className="w-3 h-3 text-zinc-400" />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-medium text-zinc-700 truncate">{file.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>{meta.label}</span>
          <span className="text-[9px] text-zinc-400">{file.size}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TwoPanel() {
  const [activeId, setActiveId] = useState("coaching");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const active = STATES.find(s => s.id === activeId)!;

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div className="border-b border-zinc-200 px-5 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-[13px] font-semibold text-zinc-800">Asset Library</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Drive live
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: state list */}
        <aside className="w-52 border-r border-zinc-100 bg-zinc-50/60 flex flex-col shrink-0 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Penny states</p>
          </div>
          <nav className="flex-1 px-2 pb-4 space-y-0.5">
            {STATES.map(s => {
              const SI = s.icon;
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-white shadow-sm border border-zinc-200"
                      : "hover:bg-white/70"
                  }`}
                >
                  <div
                    className="p-1.5 rounded-lg shrink-0"
                    style={{ background: isActive ? s.lightBg : "#f4f4f5" }}
                  >
                    <SI
                      className="w-3 h-3"
                      style={{ color: isActive ? s.accent : "#a1a1aa" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate ${isActive ? "text-zinc-800" : "text-zinc-600"}`}>
                      {s.label}
                    </p>
                  </div>
                  {s.count > 0 ? (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: isActive ? s.lightBg : "#f4f4f5", color: isActive ? s.accent : "#a1a1aa" }}
                    >
                      {s.count}
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-300 shrink-0">—</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* RIGHT: asset panel */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Panel header */}
          <div
            className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between"
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
                <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded text-zinc-600">{active.id}/</code>
              </span>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg border transition-colors ${viewMode === "grid" ? "bg-white border-zinc-300 shadow-sm" : "border-transparent hover:bg-white/50"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg border transition-colors ${viewMode === "list" ? "bg-white border-zinc-300 shadow-sm" : "border-transparent hover:bg-white/50"}`}
              >
                <List className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* Asset content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {active.files.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-3 gap-3">
                  {active.files.map(f => <FileCard key={f.id} file={f} />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {active.files.map(f => <FileRow key={f.id} file={f} />)}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[260px] text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: active.lightBg }}
                >
                  <HardDrive className="w-7 h-7" style={{ color: active.accent + "66" }} />
                </div>
                <p className="text-[13px] font-semibold text-zinc-600 mb-1">No assets for {active.label}</p>
                <p className="text-[11px] text-zinc-400 max-w-xs leading-relaxed">
                  Create a folder named{" "}
                  <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-500">{active.id}/</code>{" "}
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
