import { useAppContext } from '@/context/AppContext';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Cloud } from 'lucide-react';

const FUTURE_CASE_COLUMNS = [
  { label: 'New', note: 'Incoming Salesforce Cases' },
  { label: 'Assessment', note: 'Evaluating fit + capacity' },
  { label: 'Planned', note: 'Approved, not yet started' },
  { label: 'In Progress', note: 'Active delivery' },
  { label: 'Blocked', note: 'Awaiting resolution' },
  { label: 'Completed', note: 'Case closed, outcomes logged' },
];

export default function ResolveDemand() {
  const { setSelectedItem, selectedItem, resolvePhases } = useAppContext();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-5 gap-4">

      <div className="flex-shrink-0">
        <h1 className="text-2xl font-serif font-bold text-foreground leading-tight">RESOLVE Framework</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The 8-phase methodology for designing and delivering Transition Trails programs.
          Click any phase to open its decision brief.
        </p>
      </div>

      {/* ── RESOLVE Phase Strip ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-white/60 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              — R · E · S · O · L · V · E · E —
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted/60 border border-border/50 px-2 py-0.5 rounded-full">
            8 phases · Framework confirmed · Operational details pending source mapping
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="flex gap-3 p-5 min-w-max">
              {resolvePhases.map((phase, idx) => {
                const isSelected = selectedItem?.type === 'resolve' && selectedItem.id === phase.id;
                return (
                  <button
                    key={phase.id}
                    onClick={() => setSelectedItem({ type: 'resolve', id: phase.id, data: phase })}
                    className={`flex flex-col w-[168px] flex-shrink-0 rounded-xl border-2 text-left transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? 'border-primary shadow-lg ring-2 ring-offset-2 ring-offset-background ring-primary/20 scale-[1.02]'
                        : 'border-border/50 bg-white hover:border-primary/40 hover:shadow-md'
                    }`}
                  >
                    <div className={`relative px-4 pt-4 pb-3 ${isSelected ? 'bg-primary' : 'bg-muted/30'}`}>
                      <span
                        className={`absolute top-2 right-3 text-5xl font-serif font-black leading-none select-none ${
                          isSelected ? 'text-white/15' : 'text-primary/8'
                        }`}
                      >
                        {phase.letter}
                      </span>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        Phase {idx + 1}
                      </p>
                      <p className={`font-serif font-bold text-base leading-tight ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {phase.name}
                      </p>
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-3 flex-1 bg-white">
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                        {phase.purpose}
                      </p>

                      <div className="mt-auto pt-2 border-t border-border/40 flex items-center gap-1.5">
                        <ConfidenceBadge status={phase.confidence} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-shrink-0 px-5 pb-3 pt-2 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground leading-snug">
            <span className="font-semibold text-foreground">Note: </span>
            Phase names and acronym are confirmed via the RESOLVE Course Canvas.
            Owners, inputs, outputs, and operational details are marked "Source mapping needed" until verified against source documents.
            Do not treat these fields as authoritative.
          </p>
        </div>
      </div>

      {/* ── Future: Demand Management ───────────────────────────────── */}
      <div className="flex-shrink-0 rounded-xl border border-dashed border-border/70 bg-muted/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-md bg-sky-100 border border-sky-200 flex items-center justify-center mt-0.5">
            <Cloud className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold text-foreground">Demand Management — Future Integration</p>
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">
                Not connected · Future state
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug mb-3">
              When connected, demand will be sourced exclusively from <span className="font-semibold text-foreground">Salesforce Cases</span> and
              displayed as a Cases Kanban board below. No manually entered or generated demand data will be used.
              Configure the integration in Admin → Integrations.
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FUTURE_CASE_COLUMNS.map((col) => (
                <div
                  key={col.label}
                  className="flex-shrink-0 w-36 rounded-lg border border-dashed border-border/60 bg-white/50 px-3 py-2.5"
                >
                  <p className="text-xs font-semibold text-muted-foreground/70 mb-1">{col.label}</p>
                  <p className="text-[10px] text-muted-foreground/50 leading-snug">{col.note}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2.5 w-full rounded bg-muted/50" />
                    <div className="h-2.5 w-3/4 rounded bg-muted/40" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
              Column labels above are illustrative Salesforce Case stage names — not active dashboard data.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
