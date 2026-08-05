import { useState, useRef, useCallback } from 'react';
import { X, CheckCircle2, Hash, Sparkles, Save, MessageSquare, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActionPanelConfig } from '@/types/actionPanel';
import { useAppContext } from '@/context/AppContext';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { TERMS } from '@/config/terminology';
import { promptVariables } from '@/data/pennyPromptStudioData';

// ── Variable token autocomplete ───────────────────────────────────────────────

/**
 * Textarea with {{ autocomplete for prompt variable tokens.
 * Triggers when the user types {{ and shows a filtered list of matching variables.
 * Selecting one inserts {{variable_name}} at the cursor.
 */
function PromptBodyTextarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery]     = useState<string | null>(null); // null = closed
  const [activeIdx, setActive] = useState(0);

  // Compute filtered suggestions
  const suggestions = query === null
    ? []
    : promptVariables.filter(v =>
        v.name.replace(/[{}]/g, '').toLowerCase().startsWith(query.toLowerCase()) ||
        v.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  // Detect {{ trigger on every keystroke
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;

    // Find the last {{ before the cursor that hasn't been closed yet
    const before = val.slice(0, pos);
    const match = before.match(/\{\{([a-z_]*)$/i);
    if (match) {
      setQuery(match[1]);   // partial text after {{
      setActive(0);
    } else {
      setQuery(null);
    }

    onChange(val);
  }, [onChange]);

  // Insert chosen variable at cursor
  function insertToken(varName: string) {
    const ta = ref.current;
    if (!ta) return;

    const pos   = ta.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after  = value.slice(pos);

    // Replace the partial {{ … we've typed so far
    const match = before.match(/\{\{([a-z_]*)$/i);
    const replaceFrom = match ? pos - match[0].length : pos;

    const token   = varName; // already includes {{ }}
    const newVal  = value.slice(0, replaceFrom) + token + after;
    onChange(newVal);
    setQuery(null);

    // Restore focus & move cursor to end of inserted token
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = replaceFrom + token.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query === null || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (suggestions[activeIdx]) {
        e.preventDefault();
        insertToken(suggestions[activeIdx].name);
      }
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        spellCheck={false}
      />

      {/* Autocomplete dropdown */}
      {query !== null && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 mt-0.5 rounded-lg border border-border bg-background shadow-lg overflow-hidden"
          style={{ top: '100%' }}
          onMouseDown={e => e.preventDefault()} // prevent blur before click
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 flex items-center gap-1.5">
            <Hash className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Variable tokens
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              ↑↓ navigate · Enter/Tab insert · Esc close
            </span>
          </div>
          <ul className="max-h-[220px] overflow-y-auto py-0.5">
            {suggestions.map((v, i) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => insertToken(v.name)}
                  className={`w-full text-left flex items-start gap-2.5 px-3 py-2 transition-colors ${
                    i === activeIdx ? 'bg-primary/8 text-foreground' : 'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <code className={`text-[11px] font-mono font-bold ${i === activeIdx ? 'text-primary' : 'text-foreground'}`}>
                        {v.name}
                      </code>
                      <span className="text-[9px] font-bold text-muted-foreground bg-muted border border-border rounded px-1 py-0.5">
                        {v.type}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {v.source}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug truncate">
                      e.g. <span className="italic">{v.exampleValue}</span>
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No-match hint */}
      {query !== null && suggestions.length === 0 && query.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 mt-0.5 rounded-lg border border-border bg-background shadow-sm px-3 py-2"
          style={{ top: '100%' }}
        >
          <p className="text-[11px] text-muted-foreground">
            No variables match <code className="font-mono">{`{{${query}`}</code>
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const SLACK_CHANNELS: Record<string, string[]> = {
  penny:         ['#penny-ops', '#ai-coaching-team', '#capability-reviews'],
  collaboration: ['#operations', '#program-leads', '#tech-ops'],
  slack:         ['#slack-ops', '#integrations-team', '#operations'],
  program:       ['#program-leads', '#operations', '#curriculum-team'],
  governance:    ['#governance', '#operations', '#program-leads'],
  people:        ['#people-ops', '#program-leads', '#operations'],
  default:       ['#operations', '#program-leads', '#trail-os-updates'],
};

function SlackNotifyStub({ context }: { context: string }) {
  const [channel, setChannel]   = useState('');
  const [sent, setSent]         = useState(false);
  const channels = SLACK_CHANNELS[context] ?? SLACK_CHANNELS.default;

  function sendTest() {
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div className="rounded-lg border border-[#4A154B]/20 bg-[#4A154B]/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#4A154B]/15 bg-[#4A154B]/[0.05]">
        <Hash className="w-3 h-3 text-[#4A154B]" />
        <p className="text-[14px] font-bold  text-muted-foreground/70">Notify via Slack</p>
        <span className="ml-auto text-[14px] text-muted-foreground/40 font-medium">Prototype</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="space-y-1">
          <label className="text-[14px] font-semibold text-muted-foreground/70">Channel</label>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value)}
            className="w-full h-7 rounded border border-input bg-white px-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select channel…</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p className="text-[14px] text-muted-foreground/60 leading-snug">
          Sends a draft-created notification to the selected channel.
        </p>
        <button
          onClick={sendTest}
          disabled={!channel}
          className={`flex items-center gap-1.5 w-full justify-center px-2 py-1.5 rounded text-[14px] font-bold transition-all ${
            sent
              ? 'bg-[#E6F0EA] border border-[#9FC3AE] text-[#2F6B3F]'
              : !channel
              ? 'bg-muted/30 border border-border text-muted-foreground/40 cursor-not-allowed'
              : 'bg-[#4A154B]/5 border border-[#4A154B]/20 text-[#4A154B] hover:bg-[#4A154B]/10'
          }`}
        >
          {sent ? (
            <><CheckCircle2 className="w-3 h-3" /> Sent to {channel}</>
          ) : (
            <><Send className="w-3 h-3" /> Send Test Notification</>
          )}
        </button>
      </div>
    </div>
  );
}

interface RailActionPanelProps {
  config: ActionPanelConfig;
  onClose: () => void;
}

export function RailActionPanel({ config, onClose }: RailActionPanelProps) {
  const { user } = useGoogleAuth();

  const {
    title, objectType, subtitle, fields,
    ownerLabel = 'Owner',
    ownerHint  = 'Person accountable for this object.',
    showOwner  = true,
    slackContext,
    onSaveDraft,
    onSaveAndView,
    onSendForReview,
    pennyPrompt,
  } = config;

  // Seed form values from field defaults; pre-fill _owner with the signed-in user.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of fields) {
      if (f.default !== undefined && f.default !== '') seed[f.id] = f.default;
    }
    if (user?.name) seed['_owner'] = user.name;
    return seed;
  });
  const [savedMode, setSavedMode] = useState<'idle' | 'saved' | 'notified'>('idle');
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();

  function handleFocusWithPenny() {
    setPendingPennyQuery(pennyPrompt ?? '');
    setAskPennyOpen(true);
    config.onClose?.();
    onClose();
  }

  function set(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }));
  }

  // Save only — writes to DB, closes immediately with no Slack notification.
  function handleSave() {
    onSaveDraft?.(values);
    onSaveAndView?.(values);
    setSavedMode('saved');
    setTimeout(() => { setSavedMode('idle'); onClose(); }, 1200);
  }

  // Send for review — saves (via onSendForReview if provided, otherwise onSaveAndView),
  // fires the Slack notification, and shows a confirmation screen before closing.
  function handleSendForReview() {
    onSaveDraft?.(values);
    // onSendForReview lets callers override save behaviour (e.g. force status → Review).
    if (onSendForReview) {
      onSendForReview(values);
    } else {
      onSaveAndView?.(values);
    }
    fetch('/api/slack/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ objectType, fields: values }),
    }).catch(() => {});
    setSavedMode('notified');
    setTimeout(() => { setSavedMode('idle'); onClose(); }, 1800);
  }

  function handleClose() {
    config.onClose?.();
    onClose();
  }

  if (savedMode === 'saved') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 bg-white">
        <div className="w-10 h-10 rounded-full bg-[#E6F0EA] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#2F6B3F]" />
        </div>
        <p className="text-[14px] font-bold text-foreground text-center">Saved</p>
        <p className="text-[14px] text-muted-foreground text-center leading-relaxed">
          Your {objectType} changes have been saved.
        </p>
      </div>
    );
  }

  if (savedMode === 'notified') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 bg-white">
        <div className="w-10 h-10 rounded-full bg-[#EDF5F8] flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[#2F6F7E]" />
        </div>
        <p className="text-[14px] font-bold text-foreground text-center">Sent for Review</p>
        <p className="text-[14px] text-muted-foreground text-center leading-relaxed">
          Your {objectType} has been saved and a review request sent to the team Slack channel.
        </p>
        <span className="text-[14px] font-bold text-[#2F6F7E] border border-[#7FAFC6] bg-[#EDF5F8] rounded-full px-2.5 py-1">
          Saved · Slack notified
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 border-b border-primary/15 flex-shrink-0 bg-primary/[0.05]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[14px] font-bold  text-muted-foreground/50">
                Action Panel
              </span>
              <span className="text-[14px] font-bold  text-[#CC8400] border border-[#FFD08A] bg-[#FFF3E0] rounded-full px-1.5 py-0.5">
                Draft
              </span>
            </div>
            <h2 className="text-[15px] font-bold text-foreground leading-tight">{title}</h2>
            <p className="text-[14px] font-semibold text-muted-foreground/60  mt-0.5">
              {objectType}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            aria-label="Close action panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {subtitle && (
          <p className="text-[14px] text-muted-foreground leading-snug mt-1">{subtitle}</p>
        )}
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-3.5">

          {fields.map(field => (
            <div key={field.id} className="space-y-1">
              <label className="block text-[14px] font-bold text-foreground">
                {field.label}
                {field.required && <span className="text-[#A93F2F] ml-0.5">*</span>}
              </label>

              {field.type === 'text' && (
                <Input
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  className="h-7 text-[14px] bg-white"
                />
              )}

              {field.type === 'textarea' && !field.enableVariableAutocomplete && (
                <textarea
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  rows={field.rows ?? 3}
                  className="w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[60px]"
                />
              )}

              {field.type === 'textarea' && field.enableVariableAutocomplete && (
                <PromptBodyTextarea
                  value={values[field.id] ?? ''}
                  onChange={val => set(field.id, val)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  rows={field.rows ?? 5}
                  className="w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[60px] font-mono"
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  className="w-full h-7 rounded-md border border-input bg-white px-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select…</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.hint && (
                <p className="text-[14px] text-muted-foreground leading-snug">{field.hint}</p>
              )}
            </div>
          ))}

          {/* Owner */}
          {showOwner && (
            <div className="space-y-1">
              <label className="block text-[14px] font-bold text-foreground">{ownerLabel}</label>
              <Input
                value={values['_owner'] ?? ''}
                onChange={e => set('_owner', e.target.value)}
                placeholder="e.g. Program Director"
                className="h-7 text-[14px] bg-white"
              />
              {ownerHint && (
                <p className="text-[14px] text-muted-foreground leading-snug">{ownerHint}</p>
              )}
            </div>
          )}

          {/* Auto-assigned strip */}
          <div className="rounded border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Auto-assigned</p>
            <div className="flex gap-3 text-[14px] text-foreground flex-wrap">
              <span>Status: <strong>Draft</strong></span>
              <span>Created: <strong>Today</strong></span>
              <span>Source: <strong>Trail OS</strong></span>
            </div>
          </div>


        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/60 bg-background flex-shrink-0 space-y-2">
        {pennyPrompt && (
          <button
            onClick={handleFocusWithPenny}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-[14px] font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Focus with {TERMS.aiAssistant}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClose}
            className="px-2.5 py-1.5 text-[14px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {/* Always visible: Save — writes to DB, no Slack notification */}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            {/* Slack context only: separate "Send for Review" action */}
            {slackContext && (
              <button
                onClick={handleSendForReview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-bold border border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E] rounded-full hover:bg-[#D6E9F0] transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Send for Review
              </button>
            )}
          </div>
        </div>
        <p className="text-[14px] text-muted-foreground/40 text-center leading-snug">
          Save drafts freely · notify Slack when it&apos;s ready for review
        </p>
      </div>

    </div>
  );
}
