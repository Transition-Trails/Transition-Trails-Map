import { useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle, Circle, ChevronDown, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActionItems } from '@/hooks/useActionItems';
import { REC_PRIORITY_CONFIG, type RecPriority } from '@/data/operationalIntelligenceData';
import { useTierFlags } from '@/hooks/useTierFlags';

const PRIORITIES: RecPriority[] = ['critical', 'high', 'medium', 'low'];

const STATUS_CONFIG = {
  open:      { label: 'Open',     cls: 'text-[#2F6F7E] bg-[#EDF5F8] border-[#7FAFC6]',          icon: Circle },
  resolved:  { label: 'Resolved', cls: 'text-[#2F6B3F] bg-[#E6F0EA] border-[#9FC3AE]', icon: CheckCircle2 },
  dismissed: { label: 'Dismissed', cls: 'text-slate-500 bg-slate-50 border-slate-200',   icon: XCircle },
};

export default function RecommendationsManager() {
  const { isEveryday } = useTierFlags();
  const { mergedRecs, setItemStatus, setItemPriority, resetActionItemOverrides } = useActionItems();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('all');
  const [confirmReset, setConfirmReset] = useState(false);

  if (isEveryday) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Action item management is available to Power and Admin users.
      </div>
    );
  }

  const displayed = filter === 'all' ? mergedRecs : mergedRecs.filter(r => r.status === filter);
  const resolvedCount  = mergedRecs.filter(r => r.status === 'resolved').length;
  const dismissedCount = mergedRecs.filter(r => r.status === 'dismissed').length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
              Action Item Manager
            </p>
            <p className="text-[11px] text-muted-foreground">
              Adjust priority or mark items resolved · changes persist in your browser
            </p>
          </div>
          {(resolvedCount > 0 || dismissedCount > 0) && (
            confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Reset all overrides?</span>
                <button
                  onClick={() => { resetActionItemOverrides(); setConfirmReset(false); }}
                  className="text-[10px] font-semibold text-[#A93F2F] hover:underline"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-[10px] font-semibold text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset all
              </button>
            )
          )}
        </div>

        <div className="flex gap-1.5">
          {(['all', 'open', 'resolved', 'dismissed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors capitalize ${
                filter === f
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {f === 'all' ? `All (${mergedRecs.length})` : f}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {displayed.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-4 text-center">No items in this view.</p>
          )}
          {displayed.map(r => {
            const sc  = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
            const pc  = REC_PRIORITY_CONFIG[r.priority];
            const StatusIcon = sc.icon;

            return (
              <div
                key={r.id}
                className={`rounded-lg border bg-white px-3 py-2.5 flex items-start gap-3 transition-opacity ${
                  r.status === 'dismissed' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[8px] font-bold border rounded-full px-1.5 py-0.5 leading-tight ${pc.cls}`}>
                      {pc.label}
                    </span>
                    <span className={`text-[8px] font-semibold border rounded-full px-1.5 py-0.5 leading-tight flex items-center gap-0.5 ${sc.cls}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {sc.label}
                    </span>
                    <span className="text-[8px] text-muted-foreground/60">{r.domain}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-foreground leading-snug">{r.action}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <PriorityDropdown
                    value={r.priority}
                    onChange={p => setItemPriority(r.id, p)}
                  />
                  <StatusCycler
                    status={r.status as 'open' | 'resolved' | 'dismissed'}
                    onChange={s => setItemStatus(r.id, s)}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </ScrollArea>
  );
}

function PriorityDropdown({
  value,
  onChange,
}: {
  value: RecPriority;
  onChange: (p: RecPriority) => void;
}) {
  const [open, setOpen] = useState(false);
  const pc = REC_PRIORITY_CONFIG[value];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-[9px] font-bold border rounded-full px-2 py-0.5 leading-tight ${pc.cls}`}
      >
        {pc.label}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-md py-1 min-w-[100px]">
          {PRIORITIES.map(p => {
            const c = REC_PRIORITY_CONFIG[p];
            return (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold hover:bg-muted/40 flex items-center gap-2 ${
                  p === value ? 'opacity-40' : ''
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.cls.split(' ')[0].replace('text-', 'bg-')}`} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusCycler({
  status,
  onChange,
}: {
  status: 'open' | 'resolved' | 'dismissed';
  onChange: (s: 'open' | 'resolved' | 'dismissed') => void;
}) {
  const CYCLE: Array<'open' | 'resolved' | 'dismissed'> = ['open', 'resolved', 'dismissed'];
  const next = CYCLE[(CYCLE.indexOf(status) + 1) % CYCLE.length];
  const sc = STATUS_CONFIG[status];
  const StatusIcon = sc.icon;

  return (
    <button
      onClick={() => onChange(next)}
      title={`Mark as ${next}`}
      className={`flex items-center gap-1 text-[9px] font-semibold border rounded-full px-2 py-0.5 leading-tight transition-colors hover:opacity-80 ${sc.cls}`}
    >
      <StatusIcon className="w-2.5 h-2.5" />
      {sc.label}
    </button>
  );
}
