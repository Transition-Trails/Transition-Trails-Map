import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { SampleDataBadge } from '@/components/ui/SampleDataBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  promptTemplates as seedTemplates,
  promptVariables, outputFormats,
  DOMAIN_ORDER, DOMAIN_CLS, PROMPT_STATUS_CONFIG, RISK_CONFIG,
  type PromptTemplate, type PromptDomain, type PromptStatus,
} from '@/data/pennyPromptStudioData';

import {
  Brain, Search, Plus, Play, Copy, FlaskConical, Hash,
  FileText, CheckCircle2, AlertTriangle, Clock, Star,
  ChevronDown, ChevronRight, MoreHorizontal, ArrowRight,
  ArrowLeft, Eye, Wand2, Lightbulb, RotateCcw,
  ImageIcon, Music, Video, FolderOpen, Wifi, ExternalLink,
  Layers, Database, ShieldCheck, Lock, Sparkles, Upload,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type StudioTab = 'templates' | 'variables' | 'source-rules' | 'formats';
type WizardStep = 1 | 2 | 3;

// ── Penny content (Drive folder) ──────────────────────────────────────────────

interface PennyContentData {
  configured:        boolean;
  folderId:          string | null;
  folderName:        string | null;
  folderWebViewLink: string | null;
  images: { id: string; name: string }[];
  audio:  { id: string; name: string }[];
  video:  { id: string; name: string }[];
  error?: string;
}

const ASSET_ROWS: { kind: keyof Pick<PennyContentData, 'images' | 'audio' | 'video'>; icon: React.ElementType; hint: string }[] = [
  { kind: 'images', icon: ImageIcon, hint: 'Used in chat bubbles & preview cards' },
  { kind: 'audio',  icon: Music,     hint: 'Played when Penny first opens'        },
  { kind: 'video',  icon: Video,     hint: 'Add to Drive folder to activate'      },
];

// ── Domain category cards for wizard step 1 ───────────────────────────────────

const WIZARD_CATEGORIES: {
  domain: PromptDomain; description: string; examples: string[];
}[] = [
  { domain: 'Coaching',        description: 'Penny checks in with learners, nudges reflection, and surfaces next steps.',             examples: ['Weekly check-in', 'Module reflection', 'Progress celebration']          },
  { domain: 'Career',          description: 'Penny helps learners explore roles, prep for interviews, and build confidence.',          examples: ['Resume review', 'Interview prep', 'Job-fit discovery']                  },
  { domain: 'Knowledge',       description: 'Penny answers questions from verified sources — handbooks, procedures, FAQs.',            examples: ['Policy questions', 'Step-by-step how-to', 'Resource discovery']         },
  { domain: 'Learning',        description: 'Penny guides learners through modules, surfaces gaps, and builds study plans.',           examples: ['Study plan', 'Module guidance', 'Assessment support']                   },
  { domain: 'Communications',  description: 'Penny drafts messages, summaries, and briefs for staff and leadership.',                  examples: ['Cohort brief', 'Executive summary', 'Escalation alert']                 },
  { domain: 'Operations',      description: 'Penny monitors program health, flags risks, and surfaces operational insights.',          examples: ['Risk flag', 'Missed milestone notice', 'Cohort health summary']         },
];

const TONE_OPTIONS = ['Warm & Encouraging', 'Direct & Clear', 'Curious & Inviting', 'Professional', 'Celebratory'];
const AUDIENCE_OPTIONS = ['All Learners', 'Active Learners', 'Coaching Stage', 'Job Ready', 'Alumni', 'Staff / Coaches'];

// ── Small reusables ───────────────────────────────────────────────────────────

function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-bold border rounded-full px-2 py-0.5 ${cls}`}>
      {children}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? '#2F6B3F' : score >= 70 ? '#CC8400' : '#A93F2F';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-bold tabular-nums w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PromptStatus }) {
  const cfg = PROMPT_STATUS_CONFIG[status];
  const Icon = status === 'Approved' ? CheckCircle2 : status === 'Review' ? Clock : status === 'Deprecated' ? AlertTriangle : FileText;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold border rounded-full px-2 py-0.5 ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" />
      {status === 'Review' ? 'In Review' : status}
    </span>
  );
}

// ── MIME accept map for the file picker ───────────────────────────────────────

const MIME_ACCEPT: Record<string, string> = {
  images: 'image/*',
  audio:  'audio/*',
  video:  'video/*',
};

// ── Penny content strip ───────────────────────────────────────────────────────

function PennyContentStrip() {
  const [data, setData]             = useState<PennyContentData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKind  = useRef<string>('');

  const fetchContent = useCallback(() => {
    setLoading(true);
    fetch('/api/drive/penny-content')
      .then(r => r.json() as Promise<PennyContentData>)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  function openPicker(kind: string) {
    if (!fileInputRef.current) return;
    pendingKind.current = kind;
    fileInputRef.current.accept = MIME_ACCEPT[kind] ?? '*/*';
    fileInputRef.current.value  = '';
    fileInputRef.current.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind = pendingKind.current;
    setUploading(kind);
    setUploadError(null);
    try {
      const params = new URLSearchParams({
        name:     file.name,
        mimeType: file.type || 'application/octet-stream',
      });
      const resp = await fetch(`/api/drive/penny-content?${params}`, {
        method:  'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body:    file,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Upload failed (HTTP ${resp.status})`);
      }
      fetchContent();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  const connected  = data?.configured && !data?.error;
  const folderName = data?.folderName ?? 'Penny Content / Assets';
  const folderLink = data?.folderWebViewLink ?? null;

  return (
    <div className="rounded-xl border border-[#D9EAE0] bg-[#F0F5F2] overflow-hidden">
      {/* Hidden file input — shared across all rows */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[#D9EAE0]">
        <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center text-[11px] font-bold text-background ring-2 ring-white shadow-sm shrink-0">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">Penny's content</span>
            {loading ? (
              <span className="text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded-full px-1.5 py-0.5">
                Loading…
              </span>
            ) : connected ? (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#2F6B3F] bg-[#C8E6D0] border border-[#9FC3AE] rounded-full px-1.5 py-0.5">
                <Wifi className="w-2 h-2" /> Connected
              </span>
            ) : (
              <span className="text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded-full px-1.5 py-0.5">
                Not configured
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <FolderOpen className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{folderName}</span>
          </p>
        </div>
        {folderLink ? (
          <a
            href={folderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Open in Drive"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <button
            className="text-muted-foreground/40 cursor-not-allowed"
            title="Drive folder not configured"
            disabled
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Asset rows */}
      <div className="divide-y divide-[#D9EAE0]">
        {ASSET_ROWS.map(({ kind, icon: Icon, hint }) => {
          const files      = data?.[kind] ?? [];
          const ready      = files.length > 0;
          const label      = ready ? files[0].name : (loading ? '—' : 'No file found');
          const isUploading = uploading === kind;
          return (
            <div key={kind} className="flex items-center gap-2.5 px-3 py-2">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${ready ? 'bg-foreground' : 'bg-muted'}`}>
                <Icon className={`w-2.5 h-2.5 ${ready ? 'text-background' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${ready ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground">{hint}</p>
              </div>
              <span className={`text-[9px] font-bold rounded-full px-1.5 py-0.5 shrink-0 border ${
                ready
                  ? 'bg-[#C8E6D0] text-[#2F6B3F] border-[#9FC3AE]'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {isUploading ? '…' : loading ? '…' : ready ? 'Ready' : 'Not set'}
              </span>
              {/* Upload button */}
              <button
                onClick={() => openPicker(kind)}
                disabled={isUploading || !connected}
                title={connected ? `Upload ${kind}` : 'Drive folder not configured'}
                className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-md border transition-colors ${
                  !connected
                    ? 'border-border text-muted-foreground/30 cursor-not-allowed'
                    : isUploading
                    ? 'border-border text-muted-foreground cursor-wait'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {isUploading
                  ? <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                  : <Upload className="w-2.5 h-2.5" />
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Inline upload error */}
      {uploadError && (
        <div className="px-3 py-1.5 border-t border-[#D9EAE0] flex items-center justify-between gap-2">
          <p className="text-[10px] text-[#A93F2F] leading-snug flex-1">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  templates, selectedId, onSelect,
}: {
  templates: PromptTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch]         = useState('');
  const [domainFilter, setDomain]   = useState<PromptDomain | 'all'>('all');
  const [statusFilter, setStatus]   = useState<PromptStatus | 'all'>('all');

  const filtered = useMemo(() => templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (domainFilter !== 'all' && t.domain !== domainFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  }), [templates, search, domainFilter, statusFilter]);

  const grouped = useMemo(() =>
    DOMAIN_ORDER.reduce<Record<string, PromptTemplate[]>>((acc, d) => {
      const items = filtered.filter(t => t.domain === d);
      if (items.length) acc[d] = items;
      return acc;
    }, {}),
  [filtered]);

  return (
    <aside className="w-[240px] shrink-0 border-r border-border flex flex-col bg-muted/20 overflow-hidden">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full h-7 rounded-lg border border-border bg-background pl-7 pr-2.5 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border">
        <select
          value={domainFilter}
          onChange={e => setDomain(e.target.value as PromptDomain | 'all')}
          className="flex-1 h-7 rounded-md border border-border bg-background text-[11px] text-foreground px-2 focus:outline-none"
        >
          <option value="all">All domains</option>
          {DOMAIN_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value as PromptStatus | 'all')}
          className="flex-1 h-7 rounded-md border border-border bg-background text-[11px] text-foreground px-2 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {(['Approved','Review','Draft','Deprecated'] as PromptStatus[]).map(s =>
            <option key={s} value={s}>{s === 'Review' ? 'In Review' : s}</option>
          )}
        </select>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="py-1.5">
          {Object.entries(grouped).map(([domain, items]) => (
            <div key={domain} className="mb-1">
              <div className="flex items-center gap-1.5 px-3 py-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOMAIN_CLS[domain as PromptDomain].split(' ')[0].replace('text-', 'bg-')}`} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{domain}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{items.length}</span>
              </div>
              {items.map(t => {
                const isActive = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`w-full text-left px-3 py-2 transition-colors ${
                      isActive ? 'bg-foreground' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      {t.qualityScore >= 90 &&
                        <Star className={`w-3 h-3 shrink-0 mt-0.5 fill-current ${isActive ? 'text-amber-300' : 'text-amber-400'}`} />
                      }
                      <p className={`text-[12px] font-medium leading-snug flex-1 ${isActive ? 'text-background' : 'text-foreground'}`}>
                        {t.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[10px] font-bold ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}>
                        {t.status === 'Review' ? 'In Review' : t.status}
                      </span>
                      <span className={`text-[11px] ml-auto font-bold tabular-nums ${
                        isActive ? 'text-background/70'
                          : t.qualityScore >= 90 ? 'text-[#2F6B3F]'
                          : 'text-[#CC8400]'
                      }`}>{t.qualityScore}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="px-4 py-6 text-[12px] text-muted-foreground text-center">No templates match</p>
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="border-t border-border px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{templates.length} total</span>
          <span>{templates.filter(t => t.status === 'Approved').length} approved · {templates.filter(t => t.status === 'Review').length} in review</span>
        </div>
      </div>
    </aside>
  );
}

// ── Template detail panel ─────────────────────────────────────────────────────

function TemplateDetailPanel({
  template, showTest, onToggleTest, onEdit, onBrief, onStatusChange,
}: {
  template: PromptTemplate;
  showTest: boolean;
  onToggleTest: () => void;
  onEdit: (t: PromptTemplate) => void;
  onBrief: (t: PromptTemplate) => void;
  onStatusChange: (id: string, status: PromptStatus) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(['purpose', 'config', 'guardrails']));
  const [confirmChip, setConfirmChip] = useState<'approved' | 'revision' | null>(null);

  function fireStatusChange(id: string, status: PromptStatus, chip: 'approved' | 'revision') {
    onStatusChange(id, status);
    setConfirmChip(chip);
    setTimeout(() => setConfirmChip(null), 2200);
  }
  function toggle(id: string) {
    setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const domCls  = DOMAIN_CLS[template.domain];
  const riskCfg = RISK_CONFIG[template.hallucinationRisk];

  const Sec = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const isOpen = open.has(id);
    return (
      <div className="border-b border-border last:border-0">
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {isOpen && <div className="px-5 pb-4">{children}</div>}
      </div>
    );
  };

  // look up variables from the shared list
  const vars = useMemo(() =>
    template.requiredVariables
      .map(vid => promptVariables.find(v => v.id === vid))
      .filter(Boolean) as typeof promptVariables,
  [template.requiredVariables]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Detail header */}
      <div className="shrink-0 border-b border-border px-5 py-3 bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Chip cls={domCls}>{template.domain}</Chip>
              <StatusBadge status={template.status} />
              <Chip cls={riskCfg.cls}>Risk: {template.hallucinationRisk}</Chip>
              <span className="text-[11px] text-muted-foreground">v{template.version}</span>
            </div>
            <h2 className="text-[16px] font-bold text-foreground leading-snug">{template.name}</h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Confirmation chip */}
            {confirmChip && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold border rounded-full px-2.5 py-0.5 animate-in fade-in slide-in-from-right-2 duration-200 ${
                  confirmChip === 'approved'
                    ? 'text-[#2F6B3F] bg-[#C8E6D0] border-[#9FC3AE]'
                    : 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]'
                }`}
              >
                {confirmChip === 'approved'
                  ? <><CheckCircle2 className="w-3 h-3" /> Approved</>
                  : <><RotateCcw className="w-3 h-3" /> Sent for revision</>
                }
              </span>
            )}

            {/* Approve */}
            {(template.status === 'Draft' || template.status === 'Review') && (
              <button
                onClick={() => fireStatusChange(template.id, 'Approved', 'approved')}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F] text-[12px] font-bold hover:bg-[#C8E6D0] transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
            )}
            {(template.status === 'Approved' || template.status === 'Deprecated') && (
              <button
                disabled
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border text-[12px] font-bold text-muted-foreground/40 cursor-not-allowed"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
            )}

            {/* Request Revision */}
            {(template.status === 'Review' || template.status === 'Approved') && (
              <button
                onClick={() => fireStatusChange(template.id, 'Draft', 'revision')}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400] text-[12px] font-bold hover:bg-[#FFE8A3] transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Request Revision
              </button>
            )}
            {(template.status === 'Draft' || template.status === 'Deprecated') && (
              <button
                disabled
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border text-[12px] font-bold text-muted-foreground/40 cursor-not-allowed"
              >
                <RotateCcw className="w-3 h-3" /> Request Revision
              </button>
            )}

            <button
              onClick={() => onToggleTest()}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-bold transition-colors ${
                showTest
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <FlaskConical className="w-3 h-3" /> Test
            </button>
            <button
              onClick={() => onBrief(template)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border text-[12px] font-bold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Eye className="w-3 h-3" /> Brief
            </button>
            <button
              onClick={() => onEdit(template)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-foreground text-background text-[12px] font-bold hover:opacity-90 transition-opacity"
            >
              Edit
            </button>
            <button className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Score */}
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Score</span>
            <ScoreBar score={template.qualityScore} />
          </div>
          <span className="text-[11px] text-muted-foreground">
            Reviewed {template.lastReviewed} · {vars.length} variable{vars.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Sections */}
      <ScrollArea className="flex-1">
        <Sec id="purpose" label="Purpose">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{template.purpose}</p>
          {template.shortDescription && (
            <p className="text-[12px] text-muted-foreground/60 mt-2 italic">{template.shortDescription}</p>
          )}
        </Sec>

        <Sec id="config" label="Configuration">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              { label: 'Owner',         value: template.owner },
              { label: 'Output Format', value: template.outputFormatId },
              { label: 'Tone',          value: template.tone },
              { label: 'Last Reviewed', value: template.lastReviewed },
              { label: 'Audience',      value: template.audience.join(', ') },
              { label: 'Capability',    value: template.capabilityId },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">{row.label}</p>
                <p className="text-[12px] text-foreground font-medium">{row.value}</p>
              </div>
            ))}
          </div>
        </Sec>

        {vars.length > 0 && (
          <Sec id="variables" label={`Variables (${vars.length})`}>
            <div className="space-y-1.5">
              {vars.map(v => (
                <div key={v.id} className="flex items-center gap-2.5 rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="text-[11px] font-mono text-foreground flex-1">{v.name}</code>
                  <span className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">{v.type}</span>
                  <span className="text-[10px] text-muted-foreground">{v.source}</span>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {template.guardrails.length > 0 && (
          <Sec id="guardrails" label="Guardrails">
            <div className="space-y-1.5">
              {template.guardrails.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-muted-foreground leading-snug">{g}</p>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {template.sourceRules.length > 0 && (
          <Sec id="sources" label="Source Rules">
            <div className="space-y-1.5">
              {template.sourceRules.map(sr => (
                <div key={sr.sourceId} className="flex items-start gap-2.5 rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <Database className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground">{sr.sourceName}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{sr.reasoning}</p>
                  </div>
                  <span className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 ${
                    sr.role === 'Required'  ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' :
                    sr.role === 'Preferred' ? 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' :
                    sr.role === 'Forbidden' ? 'text-foreground bg-muted border-border' :
                                             'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]'
                  }`}>{sr.role}</span>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {template.promptBody && (
          <Sec id="body" label="Prompt Body">
            <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto">
              {template.promptBody}
            </pre>
          </Sec>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Test bench panel ──────────────────────────────────────────────────────────

function TestBenchPanel({ template }: { template: PromptTemplate }) {
  const vars = useMemo(() =>
    template.requiredVariables
      .map(vid => promptVariables.find(v => v.id === vid))
      .filter(Boolean) as typeof promptVariables,
  [template.requiredVariables]);

  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(vars.map(v => [v.id, v.exampleValue]))
  );
  const [ran, setRan] = useState(true); // show pre-populated output

  return (
    <div className="w-[300px] shrink-0 border-l border-border flex flex-col bg-muted/20 overflow-hidden">
      <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-foreground" />
          <span className="text-[13px] font-bold text-foreground">Test Bench</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Penny content */}
          <PennyContentStrip />

          {/* Scenario */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Scenario</p>
            <select className="w-full h-7 rounded-lg border border-border bg-background text-[12px] text-foreground px-2.5 focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option>Active learner — week 4</option>
              <option>Learner at risk — missed 2 milestones</option>
              <option>High performer — ready for next stage</option>
            </select>
          </div>

          {/* Variable overrides */}
          {vars.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Variable overrides</p>
              {vars.slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-background rounded-lg border border-border px-2.5 py-1.5">
                  <code className="text-[10px] text-muted-foreground w-24 shrink-0 truncate">{v.name}</code>
                  <input
                    value={inputs[v.id] ?? v.exampleValue}
                    onChange={e => setInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                    className="flex-1 min-w-0 text-[12px] text-foreground bg-transparent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setRan(true)}
            className="w-full h-8 rounded-lg bg-foreground text-[12px] font-bold text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5" /> Run Test
          </button>

          {/* Output */}
          {ran && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Penny's Output</p>
                <span className="text-[9px] font-bold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-1.5 py-0.5">Pass</span>
              </div>
              <div className="bg-background rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
                  <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center text-[9px] font-bold text-background ring-1 ring-border">
                    P
                  </div>
                  <span className="text-[12px] font-bold text-foreground">Penny</span>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <ImageIcon className="w-2.5 h-2.5" /> avatar.png
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {template.testBench.simulatedOutput ||
                    `Hi ${inputs['var-learner-name'] ?? 'there'}! You've been making great progress this week. How are you feeling about ${inputs['var-current-module'] ?? 'your current module'}? Let me know what's clicking and what's still unclear — I'd love to help you focus your energy in the right place.`}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                {[
                  { label: 'Tokens',  val: '138' },
                  { label: 'Latency', val: '1.1s' },
                  { label: 'Risk',    val: template.hallucinationRisk },
                ].map(m => (
                  <div key={m.label} className="bg-background rounded-lg border border-border px-2 py-1.5">
                    <p className="text-[11px] font-bold text-foreground">{m.val}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Secondary tab views ───────────────────────────────────────────────────────

function VariablesView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl">
        <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
          Variables are dynamic tokens that Penny substitutes at runtime. Each maps to a data source — Salesforce, LMS, User Input, Calendar, or Penny's own generated context.
        </p>
        <div className="space-y-2">
          {promptVariables.map(v => (
            <div key={v.id} className="rounded-xl border border-border bg-background px-4 py-3 flex items-start gap-4">
              <code className="text-[13px] font-mono text-foreground font-bold w-48 shrink-0 pt-0.5">{v.name}</code>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-muted-foreground leading-snug">{v.description}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Example: {v.exampleValue}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Chip cls="bg-muted border-border text-muted-foreground">{v.source}</Chip>
                <Chip cls="bg-muted border-border text-muted-foreground">{v.type}</Chip>
                {v.required && <Chip cls="text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]">Required</Chip>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function OutputFormatsView() {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl">
        <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
          Output formats define the shape of every response Penny delivers — from coaching messages to executive summaries. Each template is bound to exactly one format.
        </p>
        <div className="space-y-3">
          {outputFormats.map(f => (
            <div key={f.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="text-[14px] font-bold text-foreground">{f.name}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{f.description}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{f.usedBy.length} template{f.usedBy.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Structure</p>
                  <ul className="space-y-0.5">
                    {f.structure.map((s, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <span className="text-muted-foreground/40 shrink-0">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Tone</p>
                  <p className="text-[11px] text-muted-foreground">{f.tone}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 mt-2">Length</p>
                  <p className="text-[11px] text-muted-foreground">{f.lengthGuidance}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function SourceRulesView({ templates }: { templates: PromptTemplate[] }) {
  const allRules = useMemo(() => {
    const seen = new Set<string>();
    return templates.flatMap(t => t.sourceRules.map(sr => ({ ...sr, templateName: t.name, templateId: t.id }))).filter(sr => {
      if (seen.has(sr.sourceId + sr.templateId)) return false;
      seen.add(sr.sourceId + sr.templateId);
      return true;
    });
  }, [templates]);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl">
        <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
          Source rules control which knowledge sources Penny may consult for each template — Required, Preferred, Optional, or Forbidden.
        </p>
        <div className="space-y-2">
          {allRules.map((sr, i) => (
            <div key={i} className="rounded-xl border border-border bg-background px-4 py-3 flex items-start gap-4">
              <Database className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{sr.sourceName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{sr.reasoning}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Used in: {sr.templateName}</p>
              </div>
              <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${
                sr.role === 'Required'  ? 'text-[#A93F2F] bg-[#FBEAE6] border-[#E8B9B4]' :
                sr.role === 'Preferred' ? 'text-[#CC8400] bg-[#FFF3E0] border-[#FFD08A]' :
                sr.role === 'Forbidden' ? 'text-foreground bg-muted border-border' :
                                         'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]'
              }`}>{sr.role}</span>
            </div>
          ))}
          {allRules.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-10">No source rules configured yet.</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Guided Wizard (new template overlay) ─────────────────────────────────────

function GuidedWizardOverlay({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (t: PromptTemplate) => void;
}) {
  const [step, setStep] = useState<WizardStep>(1);
  const [domain, setDomain] = useState<PromptDomain | null>(null);
  const [purpose, setPurpose] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('');
  const [name, setName] = useState('');

  const canAdvance = step === 1 ? domain !== null : step === 2 ? purpose.trim().length > 0 : true;

  const previewText = purpose
    ? `Penny will ${purpose.toLowerCase().replace(/[.!?]$/, '')} — tailored for ${audience || 'your learners'} with a ${tone?.toLowerCase() || 'warm'} tone.`
    : 'Fill in the fields to see a preview of what Penny will do.';

  function handleSave() {
    const newTemplate: PromptTemplate = {
      id: `tpl-${Date.now()}`,
      name: name.trim() || `${domain} — ${purpose.slice(0, 40)}`,
      domain: domain!,
      capabilityId: 'cap-general',
      shortDescription: purpose.slice(0, 80),
      purpose,
      audience: audience ? [audience] : ['All Learners'],
      requiredVariables: [],
      sourceRules: [],
      outputFormatId: 'Coaching Message',
      tone: tone || 'Warm & Encouraging',
      guardrails: [],
      owner: 'Staff',
      status: 'Draft',
      version: '1.0',
      lastReviewed: 'Just now',
      promptBody: '',
      relatedStandards: [],
      relatedSfObjects: [],
      hallucinationRisk: 'Medium',
      qualityScore: 0,
      testBench: { sampleInputs: {}, simulatedOutput: '', simulationNotes: '' },
    };
    onCreate(newTemplate);
    onClose();
  }

  const STEP_LABELS: Record<WizardStep, string> = { 1: 'Choose type', 2: 'Define purpose', 3: 'Review & save' };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Topbar */}
      <header className="shrink-0 border-b border-border px-10 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-foreground flex items-center justify-center">
            <Wand2 className="w-3.5 h-3.5 text-background" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">New Template</p>
            <p className="text-[13px] font-bold text-foreground leading-none">Guided Setup</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {([1, 2, 3] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  s < step  ? 'bg-foreground text-background' :
                  s === step ? 'bg-foreground text-background ring-4 ring-foreground/20' :
                               'bg-muted border border-border text-muted-foreground'
                }`}>
                  {s < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                </div>
                <span className={`text-[12px] font-semibold ${s === step ? 'text-foreground' : s < step ? 'text-foreground/70' : 'text-muted-foreground'}`}>
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < 2 && <div className={`w-8 h-0.5 mx-2 rounded-full ${s < step ? 'bg-foreground' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-[12px] font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            Cancel
          </button>
        </div>
      </header>

      {/* Step 1 — choose domain */}
      {step === 1 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-10 pt-8 pb-5">
            <h1 className="text-xl font-bold text-foreground">What do you want to teach Penny?</h1>
            <p className="text-[14px] text-muted-foreground mt-1.5">Choose the type of interaction Penny will handle.</p>
          </div>
          <div className="flex-1 px-10 pb-8 grid grid-cols-3 gap-3 content-start overflow-auto">
            {WIZARD_CATEGORIES.map(cat => {
              const isSelected = domain === cat.domain;
              const cls = DOMAIN_CLS[cat.domain];
              return (
                <button
                  key={cat.domain}
                  onClick={() => setDomain(cat.domain)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all hover:scale-[1.01] ${
                    isSelected ? `${cls.replace('text-', 'border-').split(' ')[0]} bg-muted/40 border-2 shadow-sm scale-[1.01]` : 'bg-background border-border hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${cls}`}>{cat.domain}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-foreground" />}
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{cat.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {cat.examples.map(ex => (
                      <span key={ex} className="text-[10px] bg-muted border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">{ex}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 — define purpose */}
      {step === 2 && domain && (
        <div className="flex-1 flex overflow-hidden">
          {/* Form */}
          <div className="w-1/2 border-r border-border flex flex-col overflow-hidden">
            <div className="px-10 pt-8 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${DOMAIN_CLS[domain]}`}>{domain}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">Define what Penny should do</h2>
              <p className="text-[13px] text-muted-foreground mt-1.5">Answer three questions — Penny handles the rest.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-10 pb-8 space-y-5">
              <div>
                <label className="block text-[12px] font-bold text-foreground mb-1">1. What should Penny do in this prompt?</label>
                <p className="text-[11px] text-muted-foreground mb-1.5">Write in plain language — what action or outcome?</p>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="e.g. Send a weekly check-in that acknowledges a learner's progress and asks how they're feeling about their next step."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-foreground mb-1.5">2. Who will receive this?</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setAudience(opt)}
                      className={`text-[12px] font-medium rounded-full px-3 py-1.5 border transition-all ${
                        audience === opt ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-foreground mb-1.5">3. What tone should Penny use?</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setTone(opt)}
                      className={`text-[12px] font-medium rounded-full px-3 py-1.5 border transition-all ${
                        tone === opt ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
            <div className="px-8 pt-8 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">Live Preview</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">How Penny will appear when this prompt fires</p>
            </div>

            {/* Avatar + content strip */}
            <div className="flex items-center gap-2.5 px-8 py-2.5 bg-[#E6F0EA]/60 border-b border-[#D9EAE0]">
              <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-[10px] font-bold text-background ring-1 ring-white shadow-sm shrink-0">P</div>
              <span className="text-[11px] font-semibold text-foreground">Penny's avatar</span>
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#2F6B3F] bg-[#C8E6D0] border border-[#9FC3AE] rounded-full px-1.5 py-0.5">
                <Wifi className="w-2 h-2" /> Connected
              </span>
              <div className="flex items-center gap-1 ml-auto">
                {ASSET_ROWS.map(({ kind, icon: Icon }) => (
                  <span key={kind} className="w-5 h-5 rounded flex items-center justify-center bg-foreground">
                    <Icon className="w-2.5 h-2.5 text-background" />
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="bg-foreground px-4 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-background/20 flex items-center justify-center text-[11px] font-bold text-background">P</div>
                  <span className="text-[13px] font-bold text-background">Penny</span>
                  <span className="text-[10px] text-background/50 ml-auto">{audience || '…'}</span>
                </div>
                <div className="px-4 py-3">
                  <p className={`text-[13px] leading-relaxed ${purpose ? 'text-foreground' : 'text-muted-foreground italic'}`}>{previewText}</p>
                </div>
              </div>

              {purpose && (
                <div className="mt-4 rounded-xl bg-[#E6F0EA] border border-[#9FC3AE] px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#2F6B3F]" />
                    <span className="text-[11px] font-bold text-[#2F6B3F]">Looking good</span>
                  </div>
                  <p className="text-[11px] text-[#2F6B3F] leading-relaxed">
                    Penny has enough context. You'll test and refine this before it goes live.
                  </p>
                </div>
              )}

              {!purpose && (
                <div className="mt-4 space-y-2.5">
                  {[
                    { label: 'Be specific', hint: '"Send a coaching message" is vague. "Check in on module progress and suggest one next action" is clear.' },
                    { label: 'Use plain language', hint: 'Describe what Penny should accomplish — not the prompt itself.' },
                    { label: 'One job per prompt', hint: 'The best prompts do one thing well. Create more for other scenarios.' },
                  ].map(tip => (
                    <div key={tip.label} className="flex items-start gap-3 rounded-xl bg-background border border-border px-4 py-3">
                      <Lightbulb className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12px] font-bold text-foreground">{tip.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — review & save */}
      {step === 3 && domain && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-10 pt-8 pb-5">
            <h2 className="text-xl font-bold text-foreground">Review your prompt</h2>
            <p className="text-[13px] text-muted-foreground mt-1.5">Give it a name and save as Draft — test and refine before going live.</p>
          </div>
          <div className="px-10 pb-10 max-w-2xl space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-foreground mb-1.5">Template name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`e.g. ${domain} — ${purpose.split(' ').slice(0, 4).join(' ')}…`}
                className="w-full h-10 rounded-xl border border-border bg-background px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>
            <div className="rounded-2xl border border-border bg-background overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <span className={`text-[12px] font-bold border rounded-full px-2 py-0.5 ${DOMAIN_CLS[domain]}`}>{domain}</span>
              </div>
              {[
                { label: 'Purpose',  value: purpose || '—' },
                { label: 'Audience', value: audience || '—' },
                { label: 'Tone',     value: tone || '—' },
                { label: 'Status',   value: 'Draft (saved, not live)' },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-8 px-5 py-3 border-b border-border last:border-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide w-16 shrink-0 pt-0.5">{row.label}</span>
                  <span className="text-[13px] text-foreground flex-1 leading-relaxed">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-muted/30 border border-border px-5 py-4">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2.5">What happens next</p>
              <div className="space-y-2">
                {[
                  { icon: FileText,      text: 'Saved as Draft — not live yet' },
                  { icon: Play,          text: "Test Penny's response in the Test Bench" },
                  { icon: CheckCircle2,  text: 'Approve when ready — goes live immediately' },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                        <Icon className="w-3 h-3 text-foreground" />
                      </div>
                      <p className="text-[12px] text-muted-foreground">{s.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <footer className="shrink-0 border-t border-border px-10 py-3 flex items-center justify-between bg-background">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1) as WizardStep)}
          disabled={step === 1}
          className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors px-4 py-2 rounded-xl hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as WizardStep[]).map(n => (
            <div key={n} className={`rounded-full transition-all ${
              n === step ? 'w-5 h-2 bg-foreground' : n < step ? 'w-2 h-2 bg-foreground/60' : 'w-2 h-2 bg-border'
            }`} />
          ))}
        </div>

        {step < 3 ? (
          <button
            onClick={() => setStep(s => Math.min(3, s + 1) as WizardStep)}
            disabled={!canAdvance}
            className="flex items-center gap-2 text-[13px] font-bold text-background bg-foreground hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition-opacity px-5 py-2 rounded-xl"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 text-[13px] font-bold text-background bg-foreground hover:opacity-90 transition-opacity px-5 py-2 rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4" /> Save as Draft
          </button>
        )}
      </footer>
    </div>
  );
}

// ── Access denied ─────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <h2 className="text-[16px] font-bold text-foreground mb-2">Penny Admin access required</h2>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
        The Prompt Studio is available to Penny Admins, Platform Admins, and Super Users. Contact your administrator to request access.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PennyPromptStudio() {
  const { setSelectedItem, openActionPanel, openSlackPanel } = useAppContext();
  const { isPowerOrAbove } = useTierFlags();
  const { templates: liveTemplates, create, update } = usePromptTemplates();

  const [activeTab, setActiveTab]   = useState<StudioTab>('templates');
  const [selectedId, setSelectedId] = useState(() => liveTemplates[0]?.id ?? seedTemplates[0]?.id ?? '');
  const [showTest, setShowTest]     = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const selected = liveTemplates.find(t => t.id === selectedId) ?? liveTemplates[0] ?? seedTemplates[0];

  // Ensure selectedId stays valid when templates load/change
  const resolvedId = liveTemplates.find(t => t.id === selectedId) ? selectedId : (liveTemplates[0]?.id ?? '');

  function handleEdit(t: PromptTemplate) {
    openActionPanel({
      title: `Edit: ${t.name}`,
      objectType: 'Prompt Template',
      subtitle: 'Update the prompt configuration. Changes are saved to the database.',
      slackContext: 'penny',
      showOwner: false,
      fields: [
        { id: 'name',         label: 'Template Name',   type: 'text',     required: true, default: t.name },
        { id: 'domain',       label: 'Domain',           type: 'select',   options: DOMAIN_ORDER as string[], required: true, default: t.domain },
        { id: 'purpose',      label: 'Purpose',          type: 'textarea', default: t.purpose, rows: 3 },
        { id: 'promptBody',   label: 'Prompt Body',      type: 'textarea', default: t.promptBody, rows: 5, enableVariableAutocomplete: true },
        { id: 'audience',     label: 'Audience',         type: 'select',   options: ['Learner', 'Coach', 'Admin', 'All'], default: t.audience },
        { id: 'tone',         label: 'Tone & Style',     type: 'text',     default: t.tone },
        { id: 'guardrails',   label: 'Guardrails',       type: 'textarea', default: t.guardrails.join('\n'), rows: 3 },
        { id: 'reviewStatus', label: 'Review Status',    type: 'select',   options: ['Draft', 'Review', 'Approved', 'Deprecated'], default: t.status },
      ],
      onSaveAndView: (data) => {
        update({ id: t.id, updates: {
          name:         data.name         || t.name,
          domain:       (data.domain       || t.domain)  as PromptDomain,
          purpose:      data.purpose      || t.purpose,
          promptBody:   data.promptBody   || t.promptBody,
          tone:         data.tone         || t.tone,
          guardrails:   data.guardrails
            ? data.guardrails.split('\n').filter(Boolean)
            : t.guardrails,
          status:       (data.reviewStatus || t.status) as PromptStatus,
          lastReviewed: 'Just now',
        }});
      },
    });
  }

  const TABS: { id: StudioTab; label: string; icon: typeof Brain; count?: number }[] = [
    { id: 'templates',    label: 'Templates',      icon: Brain,    count: liveTemplates.length },
    { id: 'variables',    label: 'Variables',      icon: Hash,     count: promptVariables.length },
    { id: 'source-rules', label: 'Source Rules',   icon: Database },
    { id: 'formats',      label: 'Output Formats', icon: Layers,   count: outputFormats.length },
  ];

  if (!isPowerOrAbove) return <AccessDenied />;

  return (
    <>
      {wizardOpen && (
        <GuidedWizardOverlay
          onClose={() => setWizardOpen(false)}
          onCreate={(t) => {
            create(t);
            setSelectedId(t.id);
            setActiveTab('templates');
          }}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Dark header bar */}
        <header className="shrink-0 bg-foreground px-5 h-11 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-background/70" />
            <span className="text-[13px] font-bold text-background">Penny</span>
            <ChevronRight className="w-3.5 h-3.5 text-background/40" />
            <span className="text-[13px] font-semibold text-background/90">Prompt Studio</span>
            <SampleDataBadge />
          </div>

          {/* Tab strip */}
          <div className="flex items-center gap-0.5 ml-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 h-11 text-[12px] font-bold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-background border-background'
                      : 'text-background/50 border-transparent hover:text-background/80 hover:border-background/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${activeTab === tab.id ? 'bg-background/20' : 'bg-background/10'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => openSlackPanel({ context: 'penny', title: 'Penny Prompt Studio', subtitle: 'Slack channels, pending asks, and bot status.' })}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-background/15 hover:bg-background/25 text-[11px] font-bold text-background transition-colors"
            >
              <Hash className="w-3 h-3" /> Slack
            </button>
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-background/15 hover:bg-background/25 text-[11px] font-bold text-background transition-colors"
            >
              <Plus className="w-3 h-3" /> New Template
            </button>
            <span className="text-[10px] font-bold text-[#2F6B3F] bg-[#C8E6D0] border border-[#9FC3AE] rounded-full px-2 py-0.5">
              {liveTemplates.filter(t => t.status === 'Approved').length} Approved
            </span>
            <span className="text-[10px] font-bold text-[#CC8400] bg-[#FFF3E0] border border-[#FFD08A] rounded-full px-2 py-0.5">
              {liveTemplates.filter(t => t.status === 'Review').length} In Review
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'templates' && selected && (
            <>
              <Sidebar
                templates={liveTemplates}
                selectedId={resolvedId}
                onSelect={id => setSelectedId(id)}
              />
              <TemplateDetailPanel
                template={selected}
                showTest={showTest}
                onToggleTest={() => setShowTest(s => !s)}
                onEdit={handleEdit}
                onBrief={t => setSelectedItem({ type: 'promptTemplate', id: t.id, data: t })}
                onStatusChange={(id, status) =>
                  update({ id, updates: { status, lastReviewed: 'Just now' } })
                }
              />
              {showTest && <TestBenchPanel template={selected} />}
            </>
          )}

          {activeTab === 'variables' && (
            <div className="flex-1 overflow-hidden">
              <VariablesView />
            </div>
          )}
          {activeTab === 'source-rules' && (
            <div className="flex-1 overflow-hidden">
              <SourceRulesView templates={liveTemplates} />
            </div>
          )}
          {activeTab === 'formats' && (
            <div className="flex-1 overflow-hidden">
              <OutputFormatsView />
            </div>
          )}
        </div>

        {/* Status bar */}
        <footer className="shrink-0 border-t border-border px-5 py-1.5 flex items-center gap-4 bg-background">
          <span className="text-[11px] text-muted-foreground">
            {liveTemplates.length} templates · last updated just now
          </span>
          <div className="flex items-center gap-3 ml-auto">
            {[
              { key: '⌘F', label: 'Search' },
              { key: '⌘T', label: 'Test' },
              { key: '⌘E', label: 'Edit' },
              { key: '⌘N', label: 'New' },
            ].map(sc => (
              <div key={sc.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono text-[10px]">{sc.key}</kbd>
                <span>{sc.label}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
