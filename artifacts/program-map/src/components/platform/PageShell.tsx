import { Building2, Plug, Clock, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';

/* ─── Shared atomic components used by Operations Center pages ─── */

export function StatusDot({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) {
  const cls = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red:   'bg-red-500',
    gray:  'bg-muted-foreground/30',
  }[status];
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />;
}

export function StatCard({
  label, value, sub, trend,
}: {
  label: string; value: string; sub?: string; trend?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold font-serif text-foreground leading-none">{value}</p>
      {sub   && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      {trend && <p className="text-xs font-medium mt-1.5 text-emerald-600">{trend}</p>}
    </div>
  );
}

export function OpsHeader({
  title, subtitle, integration,
}: {
  title: string; subtitle?: string; integration?: string;
}) {
  const { openSlackPanel } = useAppContext();
  return (
    <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operations Center</span>
            <span className="inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-amber-50 border-amber-200 text-amber-700">
              Prototype Data
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <button
            onClick={() => openSlackPanel({ context: 'operations', title, subtitle: `Slack, Drive, and workspace signals for ${title}.` })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground bg-white border border-border/70 hover:text-foreground hover:border-border transition-colors whitespace-nowrap"
          >
            <Layers className="w-3 h-3" />
            Workspace Signals
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Not live
          </div>
        </div>
      </div>
      {integration && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 border border-border/50 rounded-md px-3 py-1.5">
          <Plug className="w-3 h-3 flex-shrink-0" />
          Future integration: {integration}
        </div>
      )}
    </div>
  );
}

/* ─── PageShell — for stub / coming-soon pages ─── */

const BADGE_STYLES = {
  prototype:      'bg-amber-50 border-amber-200 text-amber-700',
  'future-state': 'bg-sky-50 border-sky-200 text-sky-700',
  'coming-soon':  'bg-muted border-border text-muted-foreground',
} as const;

const BADGE_LABELS = {
  prototype:      'Prototype Data',
  'future-state': 'Future State',
  'coming-soon':  'Coming Soon',
} as const;

interface PageShellProps {
  section: string;
  title: string;
  subtitle?: string;
  badge?: keyof typeof BADGE_STYLES;
  integration?: string;
  children?: React.ReactNode;
}

export function PageShell({ section, title, subtitle, badge, integration, children }: PageShellProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{section}</span>
              {badge && (
                <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${BADGE_STYLES[badge]}`}>
                  {BADGE_LABELS[badge]}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        {integration && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 border border-border/50 rounded-md px-3 py-1.5">
            <Plug className="w-3 h-3 flex-shrink-0" />
            Future integration: {integration}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {children ? (
          <ScrollArea className="h-full">
            <div className="p-6">{children}</div>
          </ScrollArea>
        ) : (
          <EmptyState title={title} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Building2 className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1.5">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
        This section is being built. Content and integrations will be added in a future sprint.
      </p>
    </div>
  );
}

export default PageShell;
