import { useState } from 'react';
import { X, CheckCircle2, Pencil, Hash, Send, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActionPanelConfig } from '@/types/actionPanel';
import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';

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
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Notify via Slack</p>
        <span className="ml-auto text-[9px] text-muted-foreground/40 font-medium">Prototype</span>
      </div>
      <div className="p-3 space-y-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-muted-foreground/70">Channel</label>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value)}
            className="w-full h-7 rounded border border-input bg-white px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select channel…</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-snug">
          Sends a draft-created notification to the selected channel.
        </p>
        <button
          onClick={sendTest}
          disabled={!channel}
          className={`flex items-center gap-1.5 w-full justify-center px-2 py-1.5 rounded text-[10px] font-bold transition-all ${
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
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved,  setSaved]  = useState(false);
  const { setAskPennyOpen, setPendingPennyQuery } = useAppContext();

  const {
    title, objectType, subtitle, fields,
    ownerLabel = 'Owner',
    ownerHint  = 'Person accountable for this object.',
    showOwner  = true,
    slackContext,
    onSaveDraft,
    onSaveAndView,
    pennyPrompt,
  } = config;

  function handleFocusWithPenny() {
    setPendingPennyQuery(pennyPrompt ?? '');
    setAskPennyOpen(true);
    config.onClose?.();
    onClose();
  }

  function set(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }));
  }

  function handleSendRequest() {
    onSaveDraft?.(values);
    onSaveAndView?.(values);
    fetch('/api/slack/notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ objectType, fields: values }),
    }).catch(() => {});
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1600);
  }

  function handleClose() {
    config.onClose?.();
    onClose();
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-4 bg-white">
        <div className="w-10 h-10 rounded-full bg-[#E6F0EA] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#2F6B3F]" />
        </div>
        <p className="text-[13px] font-bold text-foreground text-center">Request Sent to Slack</p>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Your {objectType} has been saved to the list and a notification sent to the team channel.
        </p>
        <p className="text-[10px] text-muted-foreground/60 text-center leading-snug mt-1">
          Changes are session-only and will reset on page refresh.
        </p>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#2F6B3F] border border-[#9FC3AE] bg-[#E6F0EA] rounded-full px-2.5 py-1">
          Saved · Session Only
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
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Action Panel
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#CC8400] border border-[#FFD08A] bg-[#FFF3E0] rounded-full px-1.5 py-0.5">
                Draft
              </span>
            </div>
            <h2 className="text-[15px] font-bold text-foreground leading-tight">{title}</h2>
            <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide mt-0.5">
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
          <p className="text-[10px] text-muted-foreground leading-snug mt-1">{subtitle}</p>
        )}
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-3.5">

          {/* Prototype notice */}
          <div className="rounded border border-[#FFD08A] bg-[#FFF3E0]/60 px-2.5 py-2 flex items-start gap-1.5">
            <Pencil className="w-3 h-3 text-[#CC8400] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#CC8400] leading-snug">
              <strong>Prototype:</strong> New items appear immediately but reset on refresh.
            </p>
          </div>

          {fields.map(field => (
            <div key={field.id} className="space-y-1">
              <label className="block text-[10px] font-bold text-foreground">
                {field.label}
                {field.required && <span className="text-[#A93F2F] ml-0.5">*</span>}
              </label>

              {field.type === 'text' && (
                <Input
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  className="h-7 text-[11px] bg-white"
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  rows={field.rows ?? 3}
                  className="w-full rounded-md border border-input bg-white px-2.5 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[60px]"
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  className="w-full h-7 rounded-md border border-input bg-white px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select…</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.hint && (
                <p className="text-[10px] text-muted-foreground leading-snug">{field.hint}</p>
              )}
            </div>
          ))}

          {/* Owner */}
          {showOwner && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-foreground">{ownerLabel}</label>
              <Input
                value={values['_owner'] ?? ''}
                onChange={e => set('_owner', e.target.value)}
                placeholder="e.g. Program Director"
                className="h-7 text-[11px] bg-white"
              />
              {ownerHint && (
                <p className="text-[10px] text-muted-foreground leading-snug">{ownerHint}</p>
              )}
            </div>
          )}

          {/* Auto-assigned strip */}
          <div className="rounded border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Auto-assigned</p>
            <div className="flex gap-3 text-[10px] text-foreground flex-wrap">
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
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Focus with {TERMS.aiAssistant}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClose}
            className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendRequest}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
          >
            <Send className="w-3 h-3" />
            Save &amp; Notify Slack
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 text-center leading-snug">
          Create from the right panel · workspace stays focused
        </p>
      </div>

    </div>
  );
}
