import { useState, useEffect } from 'react';
import {
  MessageSquare, Mail, CalendarDays, Database, Sparkles,
  Lock, Plus, Trash2, Pause, Play, Zap, Bell,
  ChevronDown, CheckCircle2, AlertCircle, Info,
  Settings2, Activity,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';

// ── Types ─────────────────────────────────────────────────────────────────────

type Urgency  = 'high' | 'medium' | 'low';
type Delivery = 'realtime' | 'digest';

interface SourceSetting {
  active:   boolean;
  urgency:  Urgency;
  delivery: Delivery;
  required: boolean;
}

type SourceId = 'penny' | 'slack' | 'gmail' | 'calendar' | 'salesforce';

interface SignalSource {
  id:          SourceId;
  label:       string;
  icon:        React.ElementType;
  color:       string;
  bg:          string;
  border:      string;
  description: string;
  signals:     string[];
  required:    boolean;
}

interface WatchRule {
  id:         string;
  objectType: string;
  field:      string;
  condition:  string;
  threshold:  string;
  action:     string;
  paused:     boolean;
  required:   boolean;
}

// ── Static data ───────────────────────────────────────────────────────────────

const SOURCES: SignalSource[] = [
  {
    id: 'penny', label: `${TERMS.aiAssistant} AI`, icon: Sparkles,
    color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8]', border: 'border-[#7FAFC6]',
    description: `${TERMS.aiAssistant} recommendations, insight flags, and coaching nudges`,
    signals: ['Coaching recommendations', 'Attrition risk flags', 'Program health insights'],
    required: true,
  },
  {
    id: 'slack', label: 'Slack', icon: MessageSquare,
    color: 'text-[#2F6B3F]', bg: 'bg-[#E6F0EA]', border: 'border-[#9FC3AE]',
    description: 'Channel mentions, bot alerts, and team activity signals',
    signals: ['Bot alerts (@penny)', 'Channel activity digest', 'Attrition threshold alerts'],
    required: false,
  },
  {
    id: 'gmail', label: 'Gmail', icon: Mail,
    color: 'text-[#A93F2F]', bg: 'bg-[#FBEAE6]', border: 'border-[#E8B9B4]',
    description: 'Flagged threads, follow-up reminders, and label-routed signals',
    signals: ['TRAIL_OS label → Penny queue', 'CASE_ALERTS → urgent signal', '48h no-reply reminders'],
    required: false,
  },
  {
    id: 'calendar', label: 'Google Calendar', icon: CalendarDays,
    color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8]', border: 'border-[#7FAFC6]',
    description: 'Meeting prep signals, cadence gaps, and coach check-in tracking',
    signals: ['Cadence gap > 2 weeks', 'Pending meeting invites', 'Coach check-in reminders'],
    required: false,
  },
  {
    id: 'salesforce', label: 'Salesforce', icon: Database,
    color: 'text-[#2F6F7E]', bg: 'bg-[#EDF5F8]', border: 'border-[#7FAFC6]',
    description: 'Case updates, contact changes, and program record signals',
    signals: ['High-priority case opened', 'Contact status change', 'Program completion milestone'],
    required: false,
  },
];

const DEFAULT_SETTINGS: Record<SourceId, SourceSetting> = {
  penny:       { active: true,  urgency: 'high',   delivery: 'realtime', required: true  },
  slack:       { active: true,  urgency: 'medium',  delivery: 'realtime', required: false },
  gmail:       { active: true,  urgency: 'high',   delivery: 'realtime', required: false },
  calendar:    { active: true,  urgency: 'medium',  delivery: 'digest',   required: false },
  salesforce:  { active: false, urgency: 'low',    delivery: 'digest',   required: false },
};

const DEFAULT_RULES: WatchRule[] = [
  {
    id: 'r1', objectType: 'Learner', field: 'Inactivity', condition: '>',
    threshold: '14 days', action: 'Create signal', paused: false, required: true,
  },
  {
    id: 'r2', objectType: 'Case', field: 'Priority', condition: 'changes to',
    threshold: 'High', action: 'Alert (real-time)', paused: false, required: false,
  },
  {
    id: 'r3', objectType: 'Program', field: 'Completion %', condition: '<',
    threshold: '50%', action: 'Digest (daily)', paused: true, required: false,
  },
];

const LS_KEY = 'trail-os:my-trail-signals-prefs';

const OBJECT_TYPES  = ['Learner', 'Coach', 'Program', 'Case', 'Contact'];
const FIELDS        = ['Inactivity', 'Completion %', 'Status', 'Priority', 'Case Count', 'Last Activity'];
const CONDITIONS    = ['>', '<', '=', 'changes to', 'is missing'];
const ACTIONS       = ['Create signal', 'Alert (real-time)', 'Digest (daily)', 'Notify Penny'];

// ── Sub-components ────────────────────────────────────────────────────────────

const URGENCY_OPTS: { value: Urgency; label: string; cls: string }[] = [
  { value: 'high',   label: 'High',   cls: 'bg-[#FBEAE6]   border-[#E8B9B4]   text-[#A93F2F]'   },
  { value: 'medium', label: 'Medium', cls: 'bg-[#FFF3E0]  border-[#FFD08A]  text-[#CC8400]'  },
  { value: 'low',    label: 'Low',    cls: 'bg-zinc-100  border-zinc-200   text-zinc-500'   },
];

function UrgencyPicker({
  value, onChange, disabled,
}: { value: Urgency; onChange: (v: Urgency) => void; disabled?: boolean }) {
  return (
    <div className="flex rounded-md border border-zinc-200 overflow-hidden text-[10px] font-semibold divide-x divide-zinc-200">
      {URGENCY_OPTS.map(o => (
        <button
          key={o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 transition-colors ${
            value === o.value ? o.cls : 'bg-white text-zinc-400 hover:bg-zinc-50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DeliveryToggle({
  value, onChange, disabled,
}: { value: Delivery; onChange: (v: Delivery) => void; disabled?: boolean }) {
  return (
    <div className="flex rounded-md border border-zinc-200 overflow-hidden text-[10px] font-semibold divide-x divide-zinc-200">
      <button
        disabled={disabled}
        onClick={() => onChange('realtime')}
        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
          value === 'realtime'
            ? 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]'
            : 'bg-white text-zinc-400 hover:bg-zinc-50'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Zap className="w-2.5 h-2.5" /> Real-time
      </button>
      <button
        disabled={disabled}
        onClick={() => onChange('digest')}
        className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${
          value === 'digest'
            ? 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]'
            : 'bg-white text-zinc-400 hover:bg-zinc-50'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Bell className="w-2.5 h-2.5" /> Digest
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MyTrailSignals() {
  const [settings, setSettings] = useState<Record<SourceId, SourceSetting>>(DEFAULT_SETTINGS);
  const [rules,    setRules   ] = useState<WatchRule[]>(DEFAULT_RULES);
  const [expanded, setExpanded] = useState<Set<SourceId>>(new Set(['penny']));
  const [saved,    setSaved   ] = useState(false);

  // New rule form state
  const [showForm,    setShowForm   ] = useState(false);
  const [newObj,      setNewObj     ] = useState(OBJECT_TYPES[0]);
  const [newField,    setNewField   ] = useState(FIELDS[0]);
  const [newCond,     setNewCond    ] = useState(CONDITIONS[0]);
  const [newThresh,   setNewThresh  ] = useState('');
  const [newAction,   setNewAction  ] = useState(ACTIONS[0]);

  const toggleSource = (id: SourceId, field: 'active', value: boolean) => {
    if (settings[id].required) return;
    setSettings(p => ({ ...p, [id]: { ...p[id], [field]: value } }));
    setSaved(false);
  };

  const updateSource = (id: SourceId, patch: Partial<SourceSetting>) => {
    setSettings(p => ({ ...p, [id]: { ...p[id], ...patch } }));
    setSaved(false);
  };

  const toggleExpand = (id: SourceId) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pauseRule  = (id: string) => setRules(r => r.map(x => x.id === id ? { ...x, paused: !x.paused } : x));
  const deleteRule = (id: string) => setRules(r => r.filter(x => x.id !== id));

  const addRule = () => {
    if (!newThresh.trim()) return;
    setRules(r => [...r, {
      id: `r${Date.now()}`, objectType: newObj, field: newField,
      condition: newCond, threshold: newThresh.trim(),
      action: newAction, paused: false, required: false,
    }]);
    setNewThresh('');
    setShowForm(false);
    setSaved(false);
  };

  // Hydrate from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { settings?: Record<SourceId, SourceSetting>; rules?: WatchRule[] };
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.rules) {
        setRules([
          ...DEFAULT_RULES.filter(r => r.required),
          ...parsed.rules.filter(r => !r.required),
        ]);
      }
    } catch { /* corrupt storage — ignore */ }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        settings,
        rules: rules.filter(r => !r.required),
      }));
    } catch { /* storage unavailable — ignore */ }
    setSaved(true);
  };

  const activeCount  = Object.values(settings).filter(s => s.active).length;
  const ruleCount    = rules.filter(r => !r.paused).length;

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-zinc-600 leading-relaxed max-w-2xl">
              Control what enters your personal {TERMS.trailSignals} feed — choose which sources to
              watch, set urgency levels, and decide whether signals arrive in real-time or as a
              daily digest. Watch rules let you define your own conditions on top of the
              org-level rules set in Systems Overview.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-semibold text-[#2F6B3F] bg-[#E6F0EA] border border-[#9FC3AE] rounded-full px-2.5 py-1">
              {activeCount} sources active
            </span>
            <span className="text-[10px] font-semibold text-[#2F6F7E] bg-[#EDF5F8] border border-[#7FAFC6] rounded-full px-2.5 py-1">
              {ruleCount} rules live
            </span>
          </div>
        </div>

        {/* ── Required signals notice ── */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#FFD08A] bg-[#FFF3E0] px-4 py-3">
          <Info className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#CC8400] leading-snug">
            <span className="font-semibold">Required signals</span> — sources and rules marked with a lock are
            set by your organisation and cannot be paused or removed. They ensure the team always has visibility
            on critical learner and program activity.
          </p>
        </div>

        {/* ── Signal sources ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Signal sources</h2>
          </div>
          <div className="space-y-2">
            {SOURCES.map(src => {
              const s     = settings[src.id];
              const isExp = expanded.has(src.id);
              return (
                <div key={src.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

                  {/* Row header */}
                  <div className="flex items-center gap-3 px-5 py-3.5">

                    {/* Active toggle */}
                    <button
                      onClick={() => toggleSource(src.id, 'active', !s.active)}
                      disabled={s.required}
                      title={s.required ? 'Required — cannot be disabled' : s.active ? 'Pause this source' : 'Enable this source'}
                      className={`w-8 h-4.5 rounded-full border-2 transition-colors shrink-0 relative ${
                        s.active
                          ? 'bg-[#E6F0EA]0 border-[#E6F0EA]0'
                          : 'bg-zinc-200 border-zinc-300'
                      } ${s.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{ width: 32, height: 18 }}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${s.active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>

                    {/* Source icon + label */}
                    <div className={`p-1.5 rounded-lg ${src.bg} border ${src.border} shrink-0`}>
                      <src.icon className={`w-3.5 h-3.5 ${src.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-semibold ${s.active ? 'text-zinc-800' : 'text-zinc-400'}`}>
                          {src.label}
                        </span>
                        {src.required && <span title="Required — set by organisation"><Lock className="w-3 h-3 text-zinc-400" /></span>}
                        {!s.active && (
                          <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-full">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{src.description}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 shrink-0">
                      <UrgencyPicker
                        value={s.urgency}
                        onChange={v => updateSource(src.id, { urgency: v })}
                        disabled={!s.active}
                      />
                      <DeliveryToggle
                        value={s.delivery}
                        onChange={v => updateSource(src.id, { delivery: v })}
                        disabled={!s.active}
                      />
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(src.id)}
                      className="ml-1 p-1 rounded hover:bg-zinc-100 transition-colors shrink-0"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Expanded signal list */}
                  {isExp && (
                    <div className="border-t border-zinc-100 px-5 py-3 bg-zinc-50">
                      <div className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Signals included
                      </div>
                      <div className="space-y-1.5">
                        {src.signals.map(sig => (
                          <div key={sig} className="flex items-center gap-2">
                            {s.active
                              ? <CheckCircle2 className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                              : <AlertCircle  className="w-3 h-3 text-zinc-300 shrink-0" />}
                            <span className={`text-[11px] leading-snug ${s.active ? 'text-zinc-700' : 'text-zinc-400'}`}>
                              {sig}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Watch rules ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">My watch rules</h2>
            </div>
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add rule
            </button>
          </div>

          {/* Add rule form */}
          {showForm && (
            <div className="mb-3 rounded-xl border border-[#7FAFC6] bg-[#EDF5F8] px-5 py-4 space-y-3">
              <div className="text-[10px] font-semibold text-[#2F6F7E] uppercase tracking-wider mb-1">New watch rule</div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Object',    value: newObj,    set: setNewObj,    opts: OBJECT_TYPES  },
                  { label: 'Field',     value: newField,  set: setNewField,  opts: FIELDS        },
                  { label: 'Condition', value: newCond,   set: setNewCond,   opts: CONDITIONS    },
                  { label: 'Action',    value: newAction, set: setNewAction, opts: ACTIONS       },
                ].map(sel => (
                  <div key={sel.label}>
                    <div className="text-[9px] text-zinc-500 mb-1">{sel.label}</div>
                    <select
                      value={sel.value}
                      onChange={e => sel.set(e.target.value)}
                      className="w-full text-[11px] border border-zinc-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring focus:ring-[#2F6B3F]/15"
                    >
                      {sel.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <div className="text-[9px] text-zinc-500 mb-1">Threshold</div>
                  <input
                    value={newThresh}
                    onChange={e => setNewThresh(e.target.value)}
                    placeholder="e.g. 14 days"
                    className="w-full text-[11px] border border-zinc-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring focus:ring-[#2F6B3F]/15"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={addRule}
                  className="px-3 py-1.5 rounded-lg bg-[#2F6F7E] text-white text-[11px] font-semibold hover:bg-[#225968] transition-colors"
                >
                  Add rule
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-[11px] text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
            {rules.map(rule => (
              <div key={rule.id} className={`flex items-center gap-3 px-5 py-3 ${rule.paused ? 'opacity-50' : ''}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${rule.paused ? 'bg-zinc-300' : 'bg-[#E6F0EA]0'}`} />
                <span className="text-[11px] text-zinc-700 flex-1 leading-snug">
                  When <span className="font-semibold">{rule.objectType}</span> {' '}
                  <span className="text-zinc-500">{rule.field}</span> {' '}
                  <span className="font-medium">{rule.condition}</span> {' '}
                  <span className="font-semibold">{rule.threshold}</span>
                  {' → '}
                  <span className={`font-semibold ${rule.action.includes('Alert') ? 'text-[#CC8400]' : 'text-zinc-700'}`}>
                    {rule.action}
                  </span>
                </span>
                {rule.required && <span title="Required rule — set by Admin"><Lock className="w-3 h-3 text-zinc-400 shrink-0" /></span>}
                {!rule.required && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => pauseRule(rule.id)}
                      title={rule.paused ? 'Resume rule' : 'Pause rule'}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {rule.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      title="Delete rule"
                      className="p-1 rounded hover:bg-[#FBEAE6] text-zinc-400 hover:text-[#A93F2F] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {rules.length === 0 && (
              <div className="px-5 py-6 text-center text-[11px] text-zinc-400">
                No watch rules yet — click "Add rule" to create one.
              </div>
            )}
          </div>

          <p className="text-[10px] text-zinc-400 mt-2">
            Watch rules layer on top of the org-level signal rules configured in{' '}
            <span className="font-medium">Systems Overview</span>.
            Required rules (🔒) are set by Admin and apply to all users of your tier.
          </p>
        </div>

        {/* ── Save bar ── */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3.5">
          <p className="text-[11px] text-zinc-500">
            {saved
              ? '✓ Preferences saved — your settings will persist across sessions.'
              : 'Changes are unsaved — click Save to apply your preferences.'}
          </p>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-[11px] font-semibold hover:bg-zinc-700 transition-colors"
          >
            Save preferences
          </button>
        </div>

      </div>
    </ScrollArea>
  );
}
