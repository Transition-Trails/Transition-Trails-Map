import React, { useState } from "react";
import {
  Search, Plus, FolderOpen, Database, Link as LinkIcon,
  Edit, X, ChevronDown, ExternalLink, RefreshCw, CheckCircle2,
} from "lucide-react";

type SourceType = "Google Drive" | "SF Knowledge Base" | "Custom Link";

type Source = {
  id: string;
  name: string;
  type: SourceType;
  trust: "Authoritative" | "Trusted" | "Curated" | "Unverified";
  sync: "Live" | "Manual" | "Disconnected" | "Planned/Future";
  penny: boolean;
  owner: string;
  health: "healthy" | "needs-attention" | "incomplete";
  // Connection-specific fields
  driveFolderUrl?: string;
  driveLastSynced?: string;
  sfCategory?: string;
  sfFilter?: string;
  linkUrl?: string;
  linkCheckFrequency?: string;
};

const sources: Source[] = [
  {
    id: "1", name: "Guided Trail Blueprint", type: "Google Drive",
    trust: "Authoritative", sync: "Live", penny: true, owner: "Program Director", health: "healthy",
    driveFolderUrl: "https://drive.google.com/drive/folders/1xK9mZpQr3AbCdEfGhIjK", driveLastSynced: "Today, 9:41 AM",
  },
  {
    id: "2", name: "Salesforce Knowledge Articles", type: "SF Knowledge Base",
    trust: "Trusted", sync: "Live", penny: true, owner: "Ops Team", health: "healthy",
    sfCategory: "Trail OS Operations", sfFilter: "Published articles only",
  },
  {
    id: "3", name: "LinkedIn Job Market Insights", type: "Custom Link",
    trust: "Curated", sync: "Manual", penny: true, owner: "Career Coach", health: "needs-attention",
    linkUrl: "https://www.linkedin.com/pulse/topics/career-development", linkCheckFrequency: "Weekly",
  },
  {
    id: "4", name: "Resume Writing Standards", type: "Google Drive",
    trust: "Trusted", sync: "Manual", penny: false, owner: "Program Director", health: "needs-attention",
    driveFolderUrl: "", driveLastSynced: "Never",
  },
  {
    id: "5", name: "Coaching Protocol Library", type: "Google Drive",
    trust: "Authoritative", sync: "Live", penny: true, owner: "Penny Admin", health: "healthy",
    driveFolderUrl: "https://drive.google.com/drive/folders/2yL0nAqRs4BcDeFgHiJkL", driveLastSynced: "Today, 8:02 AM",
  },
  {
    id: "6", name: "SF Cases & Client Feedback", type: "SF Knowledge Base",
    trust: "Curated", sync: "Disconnected", penny: false, owner: "Ops Team", health: "incomplete",
    sfCategory: "", sfFilter: "",
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card shadow-sm">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Tab({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <button className={`py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
    }`}>
      {children}
    </button>
  );
}

function CollapsibleSection({
  title, defaultOpen, badge, children,
}: {
  title: string; defaultOpen: boolean; badge?: React.ReactNode; children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          {children || <div className="text-[11px] text-muted-foreground">Section content…</div>}
        </div>
      )}
    </div>
  );
}

// ── Connection section — renders differently per source type ───────────────────

function ConnectionFields({ source }: { source: Source }) {
  if (source.type === "Google Drive") {
    const hasUrl = !!source.driveFolderUrl;
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Google Drive folder or file URL
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                defaultValue={source.driveFolderUrl}
                placeholder="https://drive.google.com/drive/folders/…"
                className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <a
              href="#"
              className="h-9 inline-flex items-center gap-1.5 px-3 border rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Paste a folder URL to index all files inside, or a file URL to index a single document.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Sync frequency
          </label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            <option>Live (auto-sync on file change)</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Manual only</option>
          </select>
        </div>

        {/* Sync status strip */}
        <div className={`flex items-center justify-between rounded-md px-3 py-2.5 text-[12px] border ${
          hasUrl
            ? "bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]"
            : "bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]"
        }`}>
          <span className="font-medium flex items-center gap-1.5">
            {hasUrl ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Connected · Last synced {source.driveLastSynced}</>
            ) : (
              "No folder linked — source will not sync"
            )}
          </span>
          {hasUrl && (
            <button className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70">
              <RefreshCw className="w-3 h-3" /> Sync now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (source.type === "SF Knowledge Base") {
    const isConnected = !!source.sfCategory;
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Article category
          </label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            defaultValue={source.sfCategory}
          >
            <option value="">— Select a category —</option>
            <option>Trail OS Operations</option>
            <option>Coaching Protocols</option>
            <option>Client Case Management</option>
            <option>Program Administration</option>
            <option>Technical Support</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Penny will retrieve articles from this Salesforce Knowledge category.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Article filter
          </label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            defaultValue={source.sfFilter}
          >
            <option>Published articles only</option>
            <option>Published + Draft</option>
            <option>All statuses</option>
          </select>
        </div>

        {/* Connection status strip */}
        <div className={`flex items-center justify-between rounded-md px-3 py-2.5 text-[12px] border ${
          isConnected
            ? "bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]"
            : "bg-[#FAE6E6] border-[#F0BDBD] text-[#8B2A2A]"
        }`}>
          <span className="font-medium flex items-center gap-1.5">
            {isConnected ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Salesforce connected · pulling from "{source.sfCategory}"</>
            ) : (
              "No category selected — connection incomplete"
            )}
          </span>
          {isConnected && (
            <button className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70">
              <RefreshCw className="w-3 h-3" /> Re-sync
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The Salesforce integration is managed under{" "}
          <a href="#" className="underline hover:text-foreground">Admin → Integrations</a>. 
          Reconnect there if the sync status shows Disconnected.
        </p>
      </div>
    );
  }

  // Custom Link
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          URL
        </label>
        <div className="relative">
          <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            defaultValue={source.linkUrl}
            placeholder="https://…"
            className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Penny will fetch and index this URL's content. Public pages only — authentication-gated pages won't work.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
          Re-check frequency
        </label>
        <select
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          defaultValue={source.linkCheckFrequency}
        >
          <option>Weekly</option>
          <option>Daily</option>
          <option>Monthly</option>
          <option>Manual only</option>
        </select>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-[#FFF3E0] border border-[#FFD08A] px-3 py-2.5 text-[12px] text-[#CC8400]">
        <span className="font-medium">Last check returned stale content — re-index recommended</span>
        <button className="ml-auto flex items-center gap-1 text-[11px] font-semibold hover:opacity-70">
          <RefreshCw className="w-3 h-3" /> Re-index
        </button>
      </div>
    </div>
  );
}

// ── Type icon ──────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: SourceType }) {
  if (type === "Google Drive") return <FolderOpen className="w-4 h-4 text-muted-foreground mt-0.5" />;
  if (type === "SF Knowledge Base") return <Database className="w-4 h-4 text-muted-foreground mt-0.5" />;
  return <LinkIcon className="w-4 h-4 text-muted-foreground mt-0.5" />;
}

function TypeIconSmall({ type }: { type: SourceType }) {
  if (type === "Google Drive") return <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />;
  if (type === "SF Knowledge Base") return <Database className="w-3.5 h-3.5 text-muted-foreground" />;
  return <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />;
}

// ── Connection section badge ───────────────────────────────────────────────────

function ConnectionBadge({ source }: { source: Source }) {
  const hasConnection =
    (source.type === "Google Drive" && !!source.driveFolderUrl) ||
    (source.type === "SF Knowledge Base" && !!source.sfCategory) ||
    (source.type === "Custom Link" && !!source.linkUrl);

  if (hasConnection) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#FAE6E6] border border-[#F0BDBD] px-2 py-0.5 text-[10px] font-semibold text-[#8B2A2A]">
      Incomplete
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SourceRegistry() {
  const [drawerSource, setDrawerSource] = useState<Source | null>(sources[1]);

  return (
    <div
      className="min-h-screen bg-background font-sans text-foreground flex flex-col relative"
      style={{ "--primary": "160 60% 25%", "--primary-foreground": "0 0% 100%" } as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card shadow-sm z-10 relative">
        <div>
          <h1 className="text-base font-semibold">Knowledge Sources</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Manage data repositories connected to Trail OS and Penny's retrieval engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources…"
              className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
          <button className="h-9 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            New Source
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stat strip */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Sources" value="6" />
          <StatCard title="Drive Sources" value="3" />
          <StatCard title="SF KB" value="2" />
          <StatCard title="Penny-Enabled" value="4" />
        </div>

        {/* Table */}
        <div className="bg-card border rounded-lg shadow-sm flex flex-col">
          <div className="border-b px-4 flex items-center gap-6">
            <Tab active>All Sources</Tab>
            <Tab>Drive</Tab>
            <Tab>Salesforce KB</Tab>
            <Tab>Links</Tab>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase text-muted-foreground bg-muted/40 font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Name &amp; Type</th>
                  <th className="px-4 py-3 font-medium">Connection</th>
                  <th className="px-4 py-3 font-medium">Trust Level</th>
                  <th className="px-4 py-3 font-medium">Sync Status</th>
                  <th className="px-4 py-3 font-medium">Penny</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sources.map(source => {
                  const isActive = drawerSource?.id === source.id;
                  const connectionLabel =
                    source.type === "Google Drive"
                      ? source.driveFolderUrl
                        ? source.driveFolderUrl.replace("https://drive.google.com/drive/folders/", "").slice(0, 18) + "…"
                        : <span className="text-[#8B2A2A]">No folder linked</span>
                      : source.type === "SF Knowledge Base"
                      ? source.sfCategory || <span className="text-[#8B2A2A]">No category</span>
                      : source.linkUrl
                      ? source.linkUrl.replace("https://", "").slice(0, 28) + "…"
                      : <span className="text-[#8B2A2A]">No URL</span>;

                  return (
                    <tr
                      key={source.id}
                      className={`group h-14 transition-colors ${isActive ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    >
                      <td className="px-4 py-2 w-[28%]">
                        <div className="flex items-start gap-3">
                          <TypeIcon type={source.type} />
                          <div>
                            <div className="text-sm font-medium">{source.name}</div>
                            <div className="text-[11px] text-muted-foreground">{source.type} · {source.owner}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 w-[22%]">
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <TypeIconSmall type={source.type} />
                          <span className="truncate max-w-[180px]">{connectionLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                          ${source.trust === "Authoritative" ? "text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]" : ""}
                          ${source.trust === "Trusted"       ? "text-[#2F6F7E] bg-[#EDF5F8] border-[#A2D3DF]" : ""}
                          ${source.trust === "Curated"       ? "text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]" : ""}
                          ${source.trust === "Unverified"    ? "text-muted-foreground bg-muted border-border"  : ""}
                        `}>
                          {source.trust}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full
                            ${source.sync === "Live"         ? "bg-[#2F6B3F]"        : ""}
                            ${source.sync === "Manual"       ? "bg-[#CC8400]"        : ""}
                            ${source.sync === "Disconnected" ? "bg-[#8B2A2A]"        : ""}
                            ${source.sync === "Planned/Future" ? "bg-muted-foreground" : ""}
                          `} />
                          <span className="text-[13px]">{source.sync}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <button className={`w-8 h-4 rounded-full relative transition-colors focus:outline-none shadow-inner border border-transparent ${source.penny ? "bg-[#2F6B3F]" : "bg-muted-foreground/30"}`}>
                          <span className={`absolute top-[1px] left-[1px] bg-white w-3.5 h-3.5 rounded-full transition-transform shadow-sm ${source.penny ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full
                            ${source.health === "healthy"         ? "bg-[#2F6B3F]" : ""}
                            ${source.health === "needs-attention" ? "bg-[#CC8400]" : ""}
                            ${source.health === "incomplete"      ? "bg-[#8B2A2A]" : ""}
                          `} />
                          <span className="text-[11px] capitalize text-muted-foreground font-medium">
                            {source.health.replace("-", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setDrawerSource(isActive ? null : source)}
                          className={`p-1.5 rounded-md transition-all ${
                            isActive
                              ? "text-primary bg-primary/10"
                              : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted"
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

      {/* Edit Drawer */}
      {drawerSource && (
        <div className="absolute inset-0 z-50 flex justify-end overflow-hidden">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setDrawerSource(null)}
          />

          {/* Drawer */}
          <div className="w-[460px] bg-background h-full shadow-2xl border-l relative flex flex-col">
            {/* Drawer header */}
            <div className="flex items-start justify-between px-6 py-5 border-b bg-card">
              <div>
                <h2 className="text-base font-semibold leading-tight">{drawerSource.name}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <TypeIconSmall type={drawerSource.type} />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {drawerSource.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDrawerSource(null)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Identity */}
              <CollapsibleSection title="Identity" defaultOpen={false}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Source Name</label>
                    <input
                      type="text"
                      defaultValue={drawerSource.name}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</label>
                    <input
                      type="text"
                      defaultValue={drawerSource.owner}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Connection — type-specific */}
              <CollapsibleSection
                title="Connection"
                defaultOpen={true}
                badge={<ConnectionBadge source={drawerSource} />}
              >
                <ConnectionFields source={drawerSource} />
              </CollapsibleSection>

              {/* Governance */}
              <CollapsibleSection title="Governance" defaultOpen={false}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trust Level</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      defaultValue={drawerSource.trust}
                    >
                      <option>Authoritative</option>
                      <option>Trusted</option>
                      <option>Curated</option>
                      <option>Unverified</option>
                    </select>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Penny Configuration */}
              <CollapsibleSection title="Penny Configuration" defaultOpen={false}>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Approved for Penny</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Allow Penny to retrieve from this source</div>
                    </div>
                    <button className={`w-9 h-5 rounded-full relative focus:outline-none shadow-inner ${drawerSource.penny ? "bg-[#2F6B3F]" : "bg-muted-foreground/30"}`}>
                      <span className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${drawerSource.penny ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Retrieval Role</label>
                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>General Knowledge</option>
                      <option>Standard Operating Procedures</option>
                      <option>Core Protocol</option>
                      <option>Coaching Examples</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                      <span>Use Description</span>
                      <span className="font-normal text-muted-foreground/70">Required</span>
                    </label>
                    <textarea
                      className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      placeholder="Describe when Penny should search this source…"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="p-4 border-t bg-card flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
              <button
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
                onClick={() => setDrawerSource(null)}
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity shadow-sm">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
