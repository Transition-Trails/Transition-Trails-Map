import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp,
  Sliders, Plus, X, Trash2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TrailConfig {
  id:                  string;
  name:                string;
  trailId:             string;
  pennyRole:           string | null;
  tone:                string | null;
  focalPoints:         string | null;
  specialInstructions: string | null;
  isActive:            boolean;
}

interface ConfigForm {
  pennyRole:           string;
  tone:                string;
  focalPoints:         string;
  specialInstructions: string;
  isActive:            boolean;
}

interface CreateForm extends ConfigForm {
  name:    string;
  trailId: string;
}

// ── Trail ID options ───────────────────────────────────────────────────────────

const KNOWN_TRAIL_IDS = [
  { id: 'foundations-trail',  label: 'Foundations Trail' },
  { id: 'explorer-journey',   label: "Explorer's Trail" },
  { id: 'guided-trail',       label: 'Guided Trail' },
  { id: 'trail-of-mastery',   label: 'Trail of Mastery' },
  { id: 'community-alumni',   label: 'Community Alumni' },
  { id: 'custom',             label: 'Custom trail ID…' },
];

// ── Trail persona map ──────────────────────────────────────────────────────────

const TRAIL_PERSONAS: Record<string, string> = {
  'guided-trail':      'TrailPenny — career readiness, job search, stakeholder communication.',
  'explorer-journey':  'Explorer Penny — foundational Salesforce knowledge, building confidence.',
  'trail-of-mastery':  'MasteryPenny — client project work, consulting mindset.',
  'community-alumni':  'AlumniPenny — post-program, job search momentum and portfolio.',
  'foundations-trail': 'FoundationsPenny — core program coaching, habit-building, momentum.',
};

function trailPersonaSummary(trailId: string): string {
  return TRAIL_PERSONAS[trailId] ?? 'General guidance mode.';
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputCls    = 'w-full h-7 rounded-md border border-input bg-white px-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
const textareaCls = 'w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y';
const labelCls    = 'block text-[14px] font-bold text-foreground mb-1';
const noteCls     = 'text-[14px] text-muted-foreground leading-snug mb-2';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/3" />
      <div className="h-3 bg-muted rounded w-4/5" />
      <div className="h-3 bg-muted rounded w-3/4" />
    </div>
  );
}

// ── New Config form ────────────────────────────────────────────────────────────

function NewConfigForm({
  existingCount,
  onCancel,
  onCreated,
}: {
  existingCount: number;
  onCancel:  () => void;
  onCreated: (configs: TrailConfig[]) => void;
}) {
  const nextName = `PTC-${String(existingCount + 1).padStart(4, '0')}`;
  const [form, setForm] = useState<CreateForm>({
    name:                nextName,
    trailId:             '',
    pennyRole:           '',
    tone:                '',
    focalPoints:         '',
    specialInstructions: '',
    isActive:            true,
  });
  const [customTrailId, setCustomTrailId] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resolvedTrailId = form.trailId === 'custom' ? customTrailId.trim() : form.trailId;

  async function handleCreate() {
    if (!resolvedTrailId) {
      setSaveError('Trail ID is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await fetch('/api/penny/data/trail-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:                form.name    || nextName,
          trailId:             resolvedTrailId,
          pennyRole:           form.pennyRole           || null,
          tone:                form.tone                || null,
          focalPoints:         form.focalPoints         || null,
          specialInstructions: form.specialInstructions || null,
          isActive:            form.isActive,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      const data = await resp.json() as { configs: TrailConfig[] };
      onCreated(data.configs);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/40 bg-card shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[14px] font-semibold text-foreground">New Trail Config</p>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
      </div>

      <div className="border-t border-border/60 p-4 space-y-4">

        {/* Name + Trail ID row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Config Name</label>
            <p className={noteCls}>Identifier stored in Salesforce (e.g. PTC-0005).</p>
            <input
              type="text"
              maxLength={80}
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={nextName}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Trail ID <span className="text-[#A93F2F]">*</span></label>
            <p className={noteCls}>Which trail this config applies to.</p>
            <select
              value={form.trailId}
              onChange={e => setForm(prev => ({ ...prev, trailId: e.target.value }))}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="">— select trail —</option>
              {KNOWN_TRAIL_IDS.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            {form.trailId === 'custom' && (
              <input
                type="text"
                value={customTrailId}
                onChange={e => setCustomTrailId(e.target.value)}
                placeholder="e.g. digital-compass"
                className={`${inputCls} mt-1.5`}
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-start gap-2.5 rounded border border-border/60 bg-muted/20 px-3 py-2.5">
          <input
            id="new-config-active"
            type="checkbox"
            checked={form.isActive}
            onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
            className="w-3.5 h-3.5 rounded border-border accent-primary mt-0.5 shrink-0"
          />
          <div>
            <label htmlFor="new-config-active" className="text-[14px] font-medium text-foreground cursor-pointer">
              Trail is active
            </label>
            <p className="text-[14px] text-muted-foreground leading-snug mt-0.5">
              Inactive trails use the fallback Penny persona.
            </p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Penny Role</label>
          <p className={noteCls}>Which Penny persona is active for this trail. Max 255 characters.</p>
          <input
            type="text"
            maxLength={255}
            value={form.pennyRole}
            onChange={e => setForm(prev => ({ ...prev, pennyRole: e.target.value }))}
            placeholder="e.g. You are FoundationsPenny, focused on habit-building and program momentum…"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Tone</label>
          <p className={noteCls}>Overall coaching tone for this trail.</p>
          <input
            type="text"
            maxLength={255}
            value={form.tone}
            onChange={e => setForm(prev => ({ ...prev, tone: e.target.value }))}
            placeholder="e.g. Warm and encouraging. Celebrate small wins."
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Focal Points</label>
          <p className={noteCls}>Key topics and priorities Penny emphasises in coaching conversations.</p>
          <textarea
            value={form.focalPoints}
            onChange={e => setForm(prev => ({ ...prev, focalPoints: e.target.value }))}
            placeholder="e.g. Resume language, stakeholder communication, Salesforce Admin skills…"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>

        <div>
          <label className={labelCls}>Special Instructions</label>
          <p className={noteCls}>Override behavior, guardrails, or specific coaching directives for this trail.</p>
          <textarea
            value={form.specialInstructions}
            onChange={e => setForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
            placeholder="e.g. Never discuss salary negotiations. Always redirect to coach for…"
            className={`${textareaCls} min-h-[80px]`}
          />
        </div>

        {saveError && (
          <div className="flex items-start gap-2 rounded border border-[#E8B9B4] bg-[#FBEAE6] px-2.5 py-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
            <p className="text-[14px] text-[#A93F2F] leading-snug">{saveError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-2.5 py-1.5 text-[14px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleCreate()}
            disabled={saving || !resolvedTrailId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Create Config
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit card ──────────────────────────────────────────────────────────────────

function ConfigCard({
  config,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  config:    TrailConfig;
  isEditing: boolean;
  onEdit:    () => void;
  onCancel:  () => void;
  onSave:    (configs: TrailConfig[]) => void;
  onDelete:  (id: string) => void;
}) {
  const [form, setForm] = useState<ConfigForm>({
    pennyRole:           config.pennyRole           ?? '',
    tone:                config.tone                ?? '',
    focalPoints:         config.focalPoints         ?? '',
    specialInstructions: config.specialInstructions ?? '',
    isActive:            config.isActive,
  });
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]      = useState<string | null>(null);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditing) {
      setForm({
        pennyRole:           config.pennyRole           ?? '',
        tone:                config.tone                ?? '',
        focalPoints:         config.focalPoints         ?? '',
        specialInstructions: config.specialInstructions ?? '',
        isActive:            config.isActive,
      });
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [isEditing, config]);

  useEffect(() => {
    return () => { if (successTimer.current) clearTimeout(successTimer.current); };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await fetch(`/api/penny/data/trail-config/${config.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pennyRole:           form.pennyRole           || null,
          tone:                form.tone                || null,
          focalPoints:         form.focalPoints         || null,
          specialInstructions: form.specialInstructions || null,
          isActive:            form.isActive,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      setSaveSuccess(true);
      const freshResp = await fetch('/api/penny/data/trail-configs?t=' + Date.now(), { credentials: 'include' });
      if (freshResp.ok) {
        const freshData = await freshResp.json() as TrailConfig[];
        onSave(freshData);
      }
      successTimer.current = setTimeout(() => {
        setSaveSuccess(false);
        onCancel();
      }, 2500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const [reactivating, setReactivating] = useState(false);

  async function handleReactivate() {
    setReactivating(true);
    try {
      const resp = await fetch(`/api/penny/data/trail-config/${config.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: true }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const freshResp = await fetch('/api/penny/data/trail-configs?t=' + Date.now(), { credentials: 'include' });
      if (freshResp.ok) {
        const freshData = await freshResp.json() as TrailConfig[];
        onSave(freshData);
      }
    } catch {
      // silent — card retains its state if refetch fails
    } finally {
      setReactivating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const resp = await fetch(`/api/penny/data/trail-config/${config.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string };
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      onDelete(config.id);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  return (
    <div className={`rounded-lg border bg-card transition-shadow ${isEditing ? 'border-primary/40 shadow-md' : config.isActive ? 'border-border' : 'border-border/40'} ${!config.isActive && !isEditing ? 'opacity-60' : ''}`}>

      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[14px] font-semibold text-foreground">{config.name}</p>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.isActive ? 'bg-[#2F6B3F]' : 'bg-muted-foreground/40'}`} />
              <span className="text-[14px] text-muted-foreground">{config.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <code className="text-[14px] font-mono bg-muted/60 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground">
              {config.trailId}
            </code>
          </div>

          {isEditing ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors shrink-0"
            >
              <ChevronUp className="w-3 h-3" /> Cancel
            </button>
          ) : !config.isActive ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => void handleReactivate()}
                disabled={reactivating}
                className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold text-[#2F6B3F] border border-[#9FC3AE] bg-[#E6F0EA] rounded-full hover:bg-[#E6F0EA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {reactivating && <Loader2 className="w-3 h-3 animate-spin" />}
                Reactivate
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors"
              >
                <ChevronDown className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => { setConfirmDelete(true); setDeleteError(null); }}
                className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold text-[#A93F2F] border border-[#E8B9B4] rounded-full hover:bg-[#FBEAE6] transition-colors"
                title="Delete this config"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2.5 py-1 text-[14px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors shrink-0"
            >
              <ChevronDown className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {!config.isActive && (
          <div className="mt-2 flex items-start gap-1.5 rounded border border-[#FFD08A] bg-[#FFF3E0] px-2 py-1">
            <span className="text-[14px] text-[#CC8400] leading-snug">
              ⚠ This trail is inactive. Learners will receive the fallback Penny persona.
            </span>
          </div>
        )}

        {confirmDelete && (
          <div className="mt-3 rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-3 space-y-2">
            <p className="text-[14px] font-semibold text-[#A93F2F]">Delete this config?</p>
            <p className="text-[14px] text-[#A93F2F]/80 leading-snug">
              This will permanently remove this config from Salesforce. Learners on this trail will fall back to the default Penny persona.
            </p>
            {deleteError && (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
                <p className="text-[14px] text-[#A93F2F] leading-snug">{deleteError}</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                disabled={deleting}
                className="px-2.5 py-1 text-[14px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[14px] font-bold text-white bg-[#A93F2F] rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete permanently
              </button>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="mt-2 space-y-1.5">
            <p className="text-[14px] font-bold text-muted-foreground/50">Penny Persona</p>
            <p className="text-[14px] text-muted-foreground leading-snug">{trailPersonaSummary(config.trailId)}</p>
            {config.pennyRole && (
              <p className="text-[14px] text-foreground leading-snug">
                {config.pennyRole.length > 120 ? `${config.pennyRole.slice(0, 120)}…` : config.pennyRole}
              </p>
            )}
            {config.tone && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[14px] font-bold text-muted-foreground/50">Tone</span>
                <span className="text-[14px] text-foreground">{config.tone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="border-t border-border/60 p-4 space-y-4">

          <div className="flex items-start gap-2.5 rounded border border-border/60 bg-muted/20 px-3 py-2.5">
            <input
              id={`active-${config.id}`}
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-3.5 h-3.5 rounded border-border accent-primary mt-0.5 shrink-0"
            />
            <div>
              <label htmlFor={`active-${config.id}`} className="text-[14px] font-medium text-foreground cursor-pointer">
                Trail is active
              </label>
              <p className="text-[14px] text-muted-foreground leading-snug mt-0.5">
                Saving with this OFF keeps the trail inactive.
              </p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Penny Role</label>
            <p className={noteCls}>Defines which Penny persona is active. Max 255 characters.</p>
            <input
              type="text"
              maxLength={255}
              value={form.pennyRole}
              onChange={e => setForm(prev => ({ ...prev, pennyRole: e.target.value }))}
              placeholder="e.g. You are TrailPenny, focused on career readiness…"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Tone</label>
            <p className={noteCls}>Sets the overall coaching tone for this trail.</p>
            <input
              type="text"
              maxLength={255}
              value={form.tone}
              onChange={e => setForm(prev => ({ ...prev, tone: e.target.value }))}
              placeholder="e.g. Warm and direct"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Focal Points</label>
            <p className={noteCls}>Key topics and priorities Penny emphasises in coaching conversations.</p>
            <textarea
              value={form.focalPoints}
              onChange={e => setForm(prev => ({ ...prev, focalPoints: e.target.value }))}
              placeholder="e.g. Resume language, stakeholder communication, Salesforce Admin skills…"
              className={`${textareaCls} min-h-[80px]`}
            />
          </div>

          <div>
            <label className={labelCls}>Special Instructions</label>
            <p className={noteCls}>Override behavior, guardrails, or specific coaching directives.</p>
            <textarea
              value={form.specialInstructions}
              onChange={e => setForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
              placeholder="e.g. Never discuss salary negotiations. Always redirect to coach for…"
              className={`${textareaCls} min-h-[80px]`}
            />
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded border border-[#E8B9B4] bg-[#FBEAE6] px-2.5 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
              <p className="text-[14px] text-[#A93F2F] leading-snug">{saveError}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-[14px] text-[#2F6B3F] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onCancel}
                className="px-2.5 py-1.5 text-[14px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TrailConfigs() {
  const [configs,    setConfigs]    = useState<TrailConfig[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch('/api/penny/data/trail-configs', { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TrailConfig[]>;
      })
      .then(data => { setConfigs(data); setLoading(false); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load trail configurations');
        setLoading(false);
      });
  }, []);

  const activeCount   = configs.filter(c =>  c.isActive).length;
  const inactiveCount = configs.filter(c => !c.isActive).length;

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-6 space-y-6">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[14px] font-bold text-muted-foreground/50">
              Penny Command Center
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EDF5F8] flex items-center justify-center shrink-0">
                <Sliders className="w-3.5 h-3.5 text-[#2F6F7E]" />
              </div>
              <h1 className="text-base font-semibold text-foreground">Trail Configurations</h1>
            </div>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-2xl">
              Each trail configuration defines Penny's persona, tone, and coaching behavior for learners
              on that trail. Changes take effect immediately on the next conversation.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {!loading && !error && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#9FC3AE] bg-[#E6F0EA]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F] inline-block" />
                  <span className="text-[14px] font-semibold text-[#245531]">{activeCount} active</span>
                </span>
                {inactiveCount > 0 && (
                  <>
                    <span className="text-[14px] text-[#2F6B3F]/50">·</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                      <span className="text-[14px] font-semibold text-muted-foreground">{inactiveCount} inactive</span>
                    </span>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => { setShowCreate(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> New Config
            </button>
          </div>
        </div>

        {/* ── How this works ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-[14px] font-bold text-muted-foreground/50">How this works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Source',      value: 'Salesforce · Penny_Trail_Config__c', note: 'Each record maps a Trail ID to a Penny persona configuration.' },
              { label: 'Used by',     value: 'Penny system prompt builder',        note: 'When a learner starts a conversation, their assigned config is injected into the prompt.' },
              { label: 'Takes effect', value: 'Next conversation',                  note: 'Existing open conversations are not updated. Changes apply to new requests only.' },
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[14px] font-bold text-muted-foreground">{item.label}</p>
                <p className="text-[14px] font-semibold text-foreground">{item.value}</p>
                <p className="text-[14px] text-muted-foreground leading-snug">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── New config form ─────────────────────────────────────────── */}
        {showCreate && (
          <NewConfigForm
            existingCount={configs.length}
            onCancel={() => setShowCreate(false)}
            onCreated={(fresh) => {
              setConfigs(fresh);
              setShowCreate(false);
            }}
          />
        )}

        {/* ── Loading / error / empty ─────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#A93F2F] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-[#A93F2F]">Failed to load trail configurations</p>
              <p className="text-[14px] text-[#A93F2F]/80 mt-0.5">{error}</p>
              <p className="text-[14px] text-[#A93F2F]/60 mt-1">
                Check Salesforce authentication in Admin → Integrations.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && configs.length === 0 && !showCreate && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Sliders className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-foreground">No trail configurations yet</p>
            <p className="text-[14px] text-muted-foreground mt-1">
              Click <strong>New Config</strong> above to create the first one, or add{' '}
              <code className="text-[14px] bg-muted px-1 rounded">Penny_Trail_Config__c</code> records directly in Salesforce.
            </p>
          </div>
        )}

        {/* ── Config cards grid ───────────────────────────────────────── */}
        {!loading && !error && configs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {configs.map(config => (
              <ConfigCard
                key={config.id}
                config={config}
                isEditing={editingId === config.id}
                onEdit={() => { setEditingId(config.id); setShowCreate(false); }}
                onCancel={() => setEditingId(null)}
                onSave={(fresh) => { setConfigs(fresh); setEditingId(null); }}
                onDelete={(id) => setConfigs(prev => prev.filter(c => c.id !== id))}
              />
            ))}
          </div>
        )}

        {/* ── Live data notice ─────────────────────────────────────────── */}
        {!loading && !error && configs.length > 0 && (
          <div className="rounded border border-[#9FC3AE] bg-[#E6F0EA]/60 px-3 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6B3F] shrink-0 inline-block" />
            <p className="text-[14px] text-[#245531] leading-snug">
              <strong>Live · Salesforce.</strong> All edits and new configs write directly to{' '}
              <code className="text-[14px] bg-[#E6F0EA] px-1 rounded">Penny_Trail_Config__c</code> records in production.
            </p>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
