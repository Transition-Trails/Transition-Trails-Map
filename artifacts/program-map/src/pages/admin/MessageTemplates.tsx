import { useAppContext } from '@/context/AppContext';
import { messageTemplates } from '@/data/messageTemplates';
import { TERMS } from '@/config/terminology';
import { PageShell, StatusDot } from '@/components/platform/PageShell';

const STATUS_CONFIG: Record<string, { badge: string; dot: 'green' | 'amber' | 'gray' }> = {
  active:   { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'green' },
  approved: { badge: 'bg-sky-50 border-sky-200 text-sky-700',             dot: 'green' },
  draft:    { badge: 'bg-amber-50 border-amber-200 text-amber-700',       dot: 'amber' },
  planned:  { badge: 'bg-muted border-border text-muted-foreground',      dot: 'gray'  },
};

const PROVIDER_BADGE: Record<string, string> = {
  slack:        'bg-[#4A154B]/10 text-[#4A154B] border-[#4A154B]/20',
  'google-chat':'bg-blue-50 text-blue-700 border-blue-200',
  any:          'bg-muted text-muted-foreground border-border',
};

export default function MessageTemplates() {
  const { setSelectedItem } = useAppContext();

  const counts = {
    active:   messageTemplates.filter(t => t.status === 'active').length,
    approved: messageTemplates.filter(t => t.status === 'approved').length,
    draft:    messageTemplates.filter(t => t.status === 'draft').length,
    planned:  messageTemplates.filter(t => t.status === 'planned').length,
  };

  return (
    <PageShell
      section="Administration · Integrations"
      title="Message Templates"
      badge="prototype"
      subtitle="Manage Slack and Google Chat message templates without changing code. Templates use variable placeholders filled at send time."
      integration="Slack API + Google Chat API (future)"
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active',    value: counts.active,   dot: 'green' as const },
          { label: 'Approved',  value: counts.approved, dot: 'green' as const },
          { label: 'Draft',     value: counts.draft,    dot: 'amber' as const },
          { label: 'Planned',   value: counts.planned,  dot: 'gray'  as const },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <StatusDot status={s.dot} />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {['Template', 'Provider', 'Destination', 'Trigger Event', 'Audience', 'Status', 'Owner', 'Reviewed'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {messageTemplates.map(tpl => {
              const sc = STATUS_CONFIG[tpl.status] ?? STATUS_CONFIG.draft;
              return (
                <tr
                  key={tpl.id}
                  onClick={() => setSelectedItem({ type: 'commTemplate', id: tpl.id, data: tpl })}
                  className="hover:bg-primary/5 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3">
                    <p className="font-semibold text-foreground text-[13px] leading-snug">{tpl.name}</p>
                    {tpl.relatedPennyCap && (
                      <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5 mt-1">
                        {TERMS.aiAssistant}: {tpl.relatedPennyCap}
                      </span>
                    )}
                    {tpl.relatedDemandEvent && (
                      <span className="inline-flex items-center text-[10px] bg-sky-50 text-sky-700 border border-sky-200 rounded-full px-1.5 py-0.5 mt-1">
                        Demand: {tpl.relatedDemandEvent}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center text-[10px] font-semibold border px-2 py-0.5 rounded-full ${PROVIDER_BADGE[tpl.provider]}`}>
                      {tpl.provider}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">{tpl.destination}</td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground max-w-[130px]">
                    <span className="line-clamp-2">{tpl.triggerEvent}</span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground">{tpl.audience}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={sc.dot} />
                      <span className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ${sc.badge}`}>
                        {tpl.status.charAt(0).toUpperCase() + tpl.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground">{tpl.owner}</td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground">{tpl.lastReviewed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Click any row to open its Knowledge Brief. Variables in {'{curly braces}'} are filled at send time.
      </p>
    </PageShell>
  );
}
