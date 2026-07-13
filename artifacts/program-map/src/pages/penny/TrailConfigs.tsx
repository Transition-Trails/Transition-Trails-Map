import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp, Sliders } from 'lucide-react';

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

interface EditForm {
  pennyRole:           string;
  tone:                string;
  focalPoints:         string;
  specialInstructions: string;
  isActive:            boolean;
}

// ── Trail persona map (mirrors pennyPromptBuilder) ─────────────────────────────

const TRAIL_PERSONAS: Record<string, string> = {
  'guided-trail':      'TrailPenny — career readiness, job search, stakeholder communication.',
  'explorer-journey':  'Explorer Penny — foundational Salesforce knowledge, building confidence.',
  'trail-of-mastery':  'MasteryPenny — client project work, consulting mindset.',
  'community-alumni':  'AlumniPenny — post-program, job search momentum and portfolio.',
};

function trailPersonaSummary(trailId: string): string {
  return TRAIL_PERSONAS[trailId] ?? 'General guidance mode.';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Config card ────────────────────────────────────────────────────────────────

function ConfigCard({
  config,
  isEditing,
  onEdit,
  onCancel,
}: {
  config:    TrailConfig;
  isEditing: boolean;
  onEdit:    () => void;
  onCancel:  () => void;
}) {
  const [form, setForm]           = useState<EditForm>({
    pennyRole:           config.pennyRole           ?? '',
    tone:                config.tone                ?? '',
    focalPoints:         config.focalPoints         ?? '',
    specialInstructions: config.specialInstructions ?? '',
    isActive:            config.isActive,
  });
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const resp = await fetch(`/api/penny/data/trail-config/${config.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
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

  const inputCls    = 'w-full h-7 rounded-md border border-input bg-white px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const textareaCls = 'w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y';
  const labelCls    = 'block text-[10px] font-bold text-foreground mb-1';
  const noteCls     = 'text-[10px] text-muted-foreground leading-snug mb-2';

  return (
    <div className={`rounded-lg border bg-card transition-shadow ${isEditing ? 'border-primary/40 shadow-md' : 'border-border'}`}>

      {/* Card header — always visible */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[13px] font-semibold text-foreground">{config.name}</p>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              <span className="text-[9px] text-muted-foreground">{config.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <code className="text-[9px] font-mono bg-muted/60 border border-border/60 rounded px-1.5 py-0.5 text-muted-foreground">
              {config.trailId}
            </code>
          </div>
          <button
            onClick={isEditing ? onCancel : onEdit}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors shrink-0"
          >
            {isEditing ? (
              <><ChevronUp className="w-3 h-3" /> Cancel</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Edit</>
            )}
          </button>
        </div>

        {!isEditing && (
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Penny Persona</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{trailPersonaSummary(config.trailId)}</p>
            {config.pennyRole && (
              <p className="text-[11px] text-foreground leading-snug">
                {config.pennyRole.length > 120 ? `${config.pennyRole.slice(0, 120)}…` : config.pennyRole}
              </p>
            )}
            {config.tone && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">Tone</span>
                <span className="text-[10px] text-foreground">{config.tone}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded edit form */}
      {isEditing && (
        <div className="border-t border-border/60 p-4 space-y-4">

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
            <p className={noteCls}>Key topics and priorities Penny emphasizes in coaching conversations.</p>
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

          <div className="flex items-center gap-2.5">
            <input
              id={`active-${config.id}`}
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-3.5 h-3.5 rounded border-border accent-primary"
            />
            <label htmlFor={`active-${config.id}`} className="text-[11px] font-medium text-foreground cursor-pointer">
              Trail is active
            </label>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-2.5 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 leading-snug">{saveError}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={onCancel}
                className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
  const [configs, setConfigs]   = useState<TrailConfig[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/penny/data/trail-configs')
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

  const activeCount = configs.filter(c => c.isActive).length;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Penny Command Center
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Sliders className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <h1 className="text-base font-semibold text-foreground">Trail Configurations</h1>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">
              Each trail configuration defines Penny's persona, tone, and coaching behavior for learners
              on that trail. Changes take effect immediately on the next conversation.
            </p>
          </div>
          {!loading && !error && (
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[10px] font-semibold text-emerald-800">
                {activeCount} trail{activeCount !== 1 ? 's' : ''} active
              </span>
            </div>
          )}
        </div>

        {/* ── What this page does ─────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">How this works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Source',
                value: 'Salesforce · Penny_Trail_Config__c',
                note:  'Each record maps a Trail ID to a Penny persona configuration.',
              },
              {
                label: 'Used by',
                value: 'Penny system prompt builder',
                note:  'When a learner starts a conversation, their assigned config is injected into the prompt.',
              },
              {
                label: 'Takes effect',
                value: 'Next conversation',
                note:  'Existing open conversations are not updated. Changes apply to new requests only.',
              },
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                <p className="text-[11px] font-semibold text-foreground">{item.value}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Loading / error / empty ──────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-red-700">Failed to load trail configurations</p>
              <p className="text-[11px] text-red-600/80 mt-0.5">{error}</p>
              <p className="text-[11px] text-red-600/60 mt-1">
                Check Salesforce authentication in Admin → Integrations.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && configs.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Sliders className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[13px] font-medium text-foreground">No trail configurations found</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Add <code className="text-[10px] bg-muted px-1 rounded">Penny_Trail_Config__c</code> records
              in Salesforce with <code className="text-[10px] bg-muted px-1 rounded">Is_Active__c = true</code>.
            </p>
          </div>
        )}

        {/* ── Config cards grid ────────────────────────────────────────── */}
        {!loading && !error && configs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {configs.map(config => (
              <ConfigCard
                key={config.id}
                config={config}
                isEditing={editingId === config.id}
                onEdit={() => setEditingId(config.id)}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </div>
        )}

        {/* ── Live data notice ─────────────────────────────────────────── */}
        {!loading && !error && configs.length > 0 && (
          <div className="rounded border border-emerald-200 bg-emerald-50/60 px-3 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
            <p className="text-[10px] text-emerald-800 leading-snug">
              <strong>Live · Salesforce.</strong> All edits write directly to <code className="text-[9px] bg-emerald-100 px-1 rounded">Penny_Trail_Config__c</code> records in production.
            </p>
          </div>
        )}

      </div>
    </ScrollArea>
  );
}
