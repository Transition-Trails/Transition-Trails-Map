import { useState } from "react";
import {
  FolderOpen, Database, Link as LinkIcon,
  CheckCircle2, AlertCircle, XCircle,
  Plus, ChevronRight, Edit2, FileText, ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type TrustLevel = "Authoritative" | "Trusted" | "Curated" | "Unverified";
type SyncStatus = "Live" | "Manual" | "Disconnected" | "Planned";
type HealthStatus = "healthy" | "needs-attention" | "incomplete";
type ColumnId = "drive" | "sfkb" | "links";

interface KSource {
  id: string;
  name: string;
  column: ColumnId;
  trust: TrustLevel;
  sync: SyncStatus;
  pennyApproved: boolean;
  owner: string;
  health: HealthStatus;
  metric: string; // e.g. "247 files" or "89 articles"
  expanded?: boolean;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const INITIAL_SOURCES: KSource[] = [
  { id: "1", name: "Guided Trail Blueprint",        column: "drive",  trust: "Authoritative", sync: "Live",         pennyApproved: true,  owner: "Program Director", health: "healthy",          metric: "14 files" },
  { id: "2", name: "Resume Writing Standards",       column: "drive",  trust: "Trusted",       sync: "Manual",       pennyApproved: false, owner: "Program Director", health: "needs-attention",  metric: "6 files"  },
  { id: "3", name: "Coaching Protocol Library",      column: "drive",  trust: "Authoritative", sync: "Live",         pennyApproved: true,  owner: "Penny Admin",      health: "healthy",          metric: "31 files" },
  { id: "4", name: "Salesforce Knowledge Articles",  column: "sfkb",   trust: "Trusted",       sync: "Live",         pennyApproved: true,  owner: "Ops Team",         health: "healthy",          metric: "89 articles" },
  { id: "5", name: "SF Cases & Client Feedback",     column: "sfkb",   trust: "Curated",       sync: "Disconnected", pennyApproved: false, owner: "Ops Team",         health: "incomplete",       metric: "–" },
  { id: "6", name: "LinkedIn Job Market Insights",   column: "links",  trust: "Curated",       sync: "Manual",       pennyApproved: true,  owner: "Career Coach",     health: "needs-attention",  metric: "1 URL" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const TRUST_CLASSES: Record<TrustLevel, string> = {
  Authoritative: "text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]",
  Trusted:       "text-[#2F6F7E] bg-[#EDF5F8] border-[#B6D8E4]",
  Curated:       "text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]",
  Unverified:    "text-muted-foreground bg-muted border-border",
};

const SYNC_DOT: Record<SyncStatus, string> = {
  Live:         "bg-[#2F6B3F]",
  Manual:       "bg-[#CC8400]",
  Disconnected: "bg-[#8B2A2A]",
  Planned:      "bg-muted-foreground",
};

const HEALTH_ICON = {
  healthy:          <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6B3F]" />,
  "needs-attention": <AlertCircle  className="w-3.5 h-3.5 text-[#CC8400]" />,
  incomplete:       <XCircle      className="w-3.5 h-3.5 text-[#8B2A2A]" />,
};

// ── Source card ────────────────────────────────────────────────────────────────

function SourceCard({
  source,
  onToggleExpand,
}: {
  source: KSource;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-all overflow-hidden ${
        source.expanded ? "ring-2 ring-primary/20" : "hover:shadow-md"
      }`}
    >
      {/* Card header */}
      <div
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => onToggleExpand(source.id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground leading-snug truncate pr-1">
              {source.name}
            </p>
            <button className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground mt-0.5">{source.owner} · {source.metric}</p>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Trust badge */}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TRUST_CLASSES[source.trust]}`}>
              {source.trust}
            </span>

            {/* Sync status */}
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${SYNC_DOT[source.sync]}`} />
              {source.sync}
            </span>

            {/* Health */}
            {HEALTH_ICON[source.health]}
          </div>

          {/* Penny pill */}
          <div className="mt-2.5">
            {source.pennyApproved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F0EA] border border-[#9FC3AE] px-2 py-0.5 text-[10px] font-semibold text-[#2F6B3F]">
                ✦ Penny enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] border border-[#FFD08A] px-2 py-0.5 text-[10px] font-semibold text-[#CC8400]">
                Config needed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded edit inline */}
      {source.expanded && (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Trust Level</label>
            <select className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
              <option>Authoritative</option>
              <option selected={source.trust === "Trusted"}>Trusted</option>
              <option selected={source.trust === "Curated"}>Curated</option>
              <option>Unverified</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Approved for Penny</p>
              <p className="text-[11px] text-muted-foreground">Allow Penny to retrieve from this source</p>
            </div>
            <button className={`w-9 h-5 rounded-full relative transition-colors focus:outline-none ${source.pennyApproved ? "bg-[#2F6B3F]" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${source.pennyApproved ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Penny Use Description</label>
            <textarea className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16" placeholder="What should Penny use this source for?" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => onToggleExpand(source.id)} className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors">Cancel</button>
            <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────────

interface ColDef {
  id: ColumnId;
  label: string;
  icon: React.ReactElement;
  connected: boolean;
  metric: string;
  accentBg: string;
  accentBorder: string;
}

const COLUMNS: ColDef[] = [
  {
    id: "drive",
    label: "Google Drive",
    icon: <FolderOpen className="w-4 h-4" />,
    connected: true,
    metric: "3 sources · 51 files",
    accentBg: "#F0F4FF",
    accentBorder: "#C5D3F5",
  },
  {
    id: "sfkb",
    label: "Salesforce Knowledge Base",
    icon: <Database className="w-4 h-4" />,
    connected: true,
    metric: "2 sources · 89 articles",
    accentBg: "#EEF5FF",
    accentBorder: "#B8D0F5",
  },
  {
    id: "links",
    label: "Custom Links",
    icon: <LinkIcon className="w-4 h-4" />,
    connected: true,
    metric: "1 source · 1 URL",
    accentBg: "#F5F0FF",
    accentBorder: "#C8B8F0",
  },
];

// ── New-link form shown inline in the Links column ─────────────────────────────

function NewLinkForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.02] p-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">New Custom Link</p>
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Name</label>
        <input type="text" placeholder="e.g. Industry Salary Guide" className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">URL</label>
        <div className="relative">
          <ExternalLink className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="url" placeholder="https://..." className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Trust Level</label>
        <select className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option>Curated</option>
          <option>Trusted</option>
          <option>Unverified</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors">Cancel</button>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">Add Link</button>
      </div>
    </div>
  );
}

// ── Connect articles panel shown on SF KB column ──────────────────────────────

function ConnectArticlesBanner() {
  return (
    <div className="rounded-lg border border-[#B8D0F5] bg-[#EEF5FF] p-3 flex items-center gap-2.5 text-[12px]">
      <FileText className="w-4 h-4 text-[#2F6F7E] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#2F6F7E]">89 knowledge articles connected</p>
        <p className="text-[#2F6F7E]/70 text-[11px]">Synced from Salesforce · Last updated 2h ago</p>
      </div>
      <button className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#2F6F7E] hover:underline">
        Browse <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function IntegrationWorkshop() {
  const [sources, setSources] = useState<KSource[]>(INITIAL_SOURCES);
  const [showNewLink, setShowNewLink] = useState(false);

  function toggleExpand(id: string) {
    setSources(prev =>
      prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : { ...s, expanded: false })
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="border-b px-6 py-4 bg-card flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Knowledge Sources</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Manage the sources Penny learns from, organised by connected system.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-[#2F6B3F] inline-block" />
          3 integrations connected · 6 sources · 4 Penny-enabled
        </div>
      </div>

      {/* ── Three swimlane columns ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-0 divide-x h-[calc(100vh-61px)] overflow-hidden">
        {COLUMNS.map(col => {
          const colSources = sources.filter(s => s.column === col.id);

          return (
            <div key={col.id} className="flex flex-col h-full overflow-hidden">

              {/* Column header */}
              <div
                className="px-4 pt-4 pb-3 border-b"
                style={{ background: col.accentBg, borderColor: col.accentBorder }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span style={{ color: "#444" }}>{col.icon}</span>
                    {col.label}
                  </div>
                  {/* Connection status */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F0EA] border border-[#9FC3AE] px-2 py-0.5 text-[10px] font-bold text-[#2F6B3F]">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Connected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{col.metric}</p>

                {/* SF KB: article count banner */}
                {col.id === "sfkb" && (
                  <div className="mt-2.5">
                    <ConnectArticlesBanner />
                  </div>
                )}

                {/* Add source button */}
                <button
                  onClick={() => { if (col.id === "links") setShowNewLink(true); }}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 h-7 rounded-md border border-dashed text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  style={{ borderColor: col.accentBorder }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add {col.label === "Custom Links" ? "Link" : "Source"}
                </button>
              </div>

              {/* Source cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {/* New link form (links column only) */}
                {col.id === "links" && showNewLink && (
                  <NewLinkForm onCancel={() => setShowNewLink(false)} />
                )}

                {colSources.map(source => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    onToggleExpand={toggleExpand}
                  />
                ))}

                {/* Empty drop target */}
                {colSources.length === 0 && !showNewLink && (
                  <div className="rounded-xl border-2 border-dashed border-border h-24 flex items-center justify-center text-[12px] text-muted-foreground">
                    No sources yet — add one above
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
