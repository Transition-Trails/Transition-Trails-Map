import { Plug, Clock, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import { TERMS } from '@/config/terminology';
import { Building2 } from 'lucide-react';

/* ─── Shared atomic components used by Operations Center pages ─── */

export function StatusDot({ status }: { status: 'green' | 'amber' | 'red' | 'gray' }) {
  const cls = {
    green: 'bg-[#E6F0EA]0',
    amber: 'bg-[#CC8400]',
    red:   'bg-[#FBEAE6]0',
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
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
      {sub   && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend && <p className="text-xs font-medium mt-1 text-[#2F6B3F]">{trend}</p>}
    </div>
  );
}

export function OpsHeader({
  title, subtitle, integration,
}: {
  title: string; subtitle?: string; integration?: string;
}) {
  const { openSlackPanel } = useAppContext();
  const { isAdminOrAbove } = useTierFlags();
  return (
    <div className="flex-shrink-0 px-4 py-2 border-b bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-semibold text-foreground leading-none">{title}</h1>
            {isAdminOrAbove && (
              <span className="inline-flex items-center text-[10px] font-semibold border px-1.5 py-0.5 rounded-full bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400] whitespace-nowrap">
                Prototype Data
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-muted-foreground line-clamp-1 hidden sm:block">{subtitle}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => openSlackPanel({ context: 'operations', title, subtitle: TERMS.signalSubtitle(title) })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-muted-foreground bg-white border border-border/70 hover:text-foreground hover:border-border transition-colors whitespace-nowrap"
          >
            <Layers className="w-3 h-3" />
            {TERMS.trailSignals}
          </button>
          {isAdminOrAbove && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Not live
            </div>
          )}
        </div>
      </div>
      {integration && isAdminOrAbove && (
        <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <Plug className="w-3 h-3 flex-shrink-0" />
          Future: {integration}
        </div>
      )}
    </div>
  );
}

/* ─── PageShell — compact header, role-aware prototype/integration notices ─── */

const BADGE_STYLES = {
  prototype:      'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',
  'future-state': 'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',
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
  const { isAdminOrAbove } = useTierFlags();
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hidden sm:block">{section} ·</span>
          <h1 className="text-sm font-semibold text-foreground leading-none">{title}</h1>
          {badge && isAdminOrAbove && (
            <span className={`inline-flex items-center text-[10px] font-semibold border px-1.5 py-0.5 rounded-full whitespace-nowrap ${BADGE_STYLES[badge]}`}>
              {BADGE_LABELS[badge]}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-muted-foreground line-clamp-1 hidden sm:block">{subtitle}</span>
          )}
        </div>
        {integration && isAdminOrAbove && (
          <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <Plug className="w-3 h-3 flex-shrink-0" />
            Future: {integration}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {children ? (
          <ScrollArea className="h-full">
            <div className="p-4">{children}</div>
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
