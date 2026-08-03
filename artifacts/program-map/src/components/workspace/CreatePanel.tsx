import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CreateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
  rows?: number;
}

export interface CreatePanelProps {
  title: string;
  objectType: string;
  subtitle?: string;
  fields: CreateField[];
  onClose: () => void;
  onSaveDraft: (data: Record<string, string>) => void;
  onSaveAndView?: (data: Record<string, string>) => void;
  ownerLabel?: string;
  ownerHint?: string;
  showOwner?: boolean;
}

export function CreatePanel({
  title,
  objectType,
  subtitle,
  fields,
  onClose,
  onSaveDraft,
  onSaveAndView,
  ownerLabel = 'Owner',
  ownerHint = 'Person accountable for this object. Defines source-of-truth responsibility.',
  showOwner = true,
}: CreatePanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved]   = useState(false);

  function set(id: string, val: string) {
    setValues(prev => ({ ...prev, [id]: val }));
  }

  function handleSaveDraft() {
    onSaveDraft(values);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1600);
  }

  function handleSaveAndView() {
    (onSaveAndView ?? onSaveDraft)(values);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1600);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-background">
        <div className="w-12 h-12 rounded-full bg-[#E6F0EA] flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-[#2F6B3F]" />
        </div>
        <p className="text-[14px] font-bold text-foreground">Saved as Draft</p>
        <p className="text-[12px] text-muted-foreground text-center max-w-xs leading-relaxed">
          Your {objectType} was added in prototype mode. Data resets on page refresh until connected to a live backend.
        </p>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#CC8400] border border-[#FFD08A] bg-[#FFF3E0] rounded-full px-2.5 py-1 mt-1">
          Draft · Prototype Only
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-3 mb-1">
          <button
            onClick={onClose}
            className="mt-0.5 p-1.5 rounded-lg border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Cancel and go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Creating {objectType}
            </p>
            <h1 className="text-[18px] font-bold text-foreground leading-snug">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#CC8400] border border-[#FFD08A] bg-[#FFF3E0] rounded-full px-2 py-0.5">
              Draft
            </span>
            <span className="text-[9px] text-muted-foreground/50">Prototype only</span>
          </div>
        </div>
      </div>

      {/* Form ────────────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5 max-w-2xl">

          {/* Prototype notice */}
          <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0]/60 px-3 py-2.5 flex items-start gap-2">
            <Pencil className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#CC8400] leading-snug">
              <strong>Prototype mode:</strong> New items appear in the UI immediately but reset on page refresh.
              This create flow captures the right fields so a live backend can be wired in later.
            </p>
          </div>

          {fields.map(field => (
            <div key={field.id} className="space-y-1">
              <label className="block text-[11px] font-bold text-foreground">
                {field.label}
                {field.required && <span className="text-[#A93F2F] ml-0.5">*</span>}
              </label>

              {field.type === 'text' && (
                <Input
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  className="h-8 text-[12px] bg-white"
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                  rows={field.rows ?? 4}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[80px]"
                />
              )}

              {field.type === 'select' && field.options && (
                <select
                  value={values[field.id] ?? ''}
                  onChange={e => set(field.id, e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-white px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select {field.label.toLowerCase()}…</option>
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

          {/* Owner (always last unless hidden) */}
          {showOwner && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-foreground">{ownerLabel}</label>
              <Input
                value={values['_owner'] ?? ''}
                onChange={e => set('_owner', e.target.value)}
                placeholder="e.g. Program Director"
                className="h-8 text-[12px] bg-white"
              />
              {ownerHint && (
                <p className="text-[10px] text-muted-foreground leading-snug">{ownerHint}</p>
              )}
            </div>
          )}

          {/* Status notice */}
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-0.5">Auto-assigned on creation</p>
            <div className="flex gap-3 text-[11px] text-foreground">
              <span>Status: <strong>Draft</strong></span>
              <span>Created: <strong>Today</strong></span>
              <span>Source: <strong>Trail OS</strong></span>
            </div>
          </div>

        </div>
      </ScrollArea>

      {/* Footer ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-border bg-background flex-shrink-0 flex items-center gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border border-border rounded-full hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            className="px-3 py-1.5 text-[11px] font-semibold border border-border rounded-full hover:bg-muted/40 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={handleSaveAndView}
            className="px-4 py-1.5 text-[11px] font-bold bg-foreground text-background rounded-full hover:opacity-90 transition-opacity"
          >
            Save &amp; View
          </button>
        </div>
      </div>

    </div>
  );
}
