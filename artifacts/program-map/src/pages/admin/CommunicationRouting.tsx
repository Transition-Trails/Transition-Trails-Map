import { useAppContext } from '@/context/AppContext';
import { commRoutes } from '@/data/commRouting';
import { PageShell, StatusDot } from '@/components/platform/PageShell';
import { Info } from 'lucide-react';

const STATUS_DOT: Record<string, 'green' | 'amber' | 'gray'> = {
  'Planned Q3 2025': 'amber',
  'Planned Q3':      'amber',
  'Future Q4':       'gray',
  'Future Q4 2025':  'gray',
  'Future':          'gray',
};

function getDot(s: string | undefined): 'green' | 'amber' | 'gray' {
  if (!s) return 'gray';
  for (const [key, val] of Object.entries(STATUS_DOT)) {
    if (s.includes(key.split(' ')[0])) return val;
  }
  return 'gray';
}

export default function CommunicationRouting() {
  const { setSelectedItem } = useAppContext();

  return (
    <PageShell
      section="Administration · Integrations"
      title="Comm Routing"
      badge="prototype"
      subtitle="Maps Trail OS event types to communication channel destinations. Define events once — swap providers later without changing event logic."
      integration="Slack API + Google Chat API (future)"
    >
      <div className="rounded-xl border border-[#7FAFC6] bg-[#EDF5F8] p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#2F6F7E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#2F6F7E] mb-1">Routing Model</p>
            <p className="text-xs text-[#2F6F7E] leading-relaxed">
              Each row is an <strong>event type</strong> — a specific trigger that should result in a message.
              Events map to a <em>Slack channel now</em> and optionally a <em>Google Chat space later</em>.
              Changing provider means updating the destination column only.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {['Event Type', 'Trigger', 'Audience', 'Slack Channel', 'Google Chat', 'Owner'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {commRoutes.map(route => (
              <tr
                key={route.id}
                onClick={() => setSelectedItem({ type: 'commRoute', id: route.id, data: route })}
                className="hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <td className="px-3 py-3">
                  <p className="font-semibold text-foreground text-[13px] leading-snug">{route.eventType}</p>
                  {route.relatedPennyCap && (
                    <span className="inline-flex items-center text-[10px] bg-[#FFF3E0] text-[#CC8400] border border-[#FFD08A] rounded-full px-1.5 py-0.5 mt-1">
                      Penny: {route.relatedPennyCap.split(',')[0]}
                    </span>
                  )}
                  {route.relatedDemandEvent && (
                    <span className="inline-flex items-center text-[10px] bg-[#EDF5F8] text-[#2F6F7E] border border-[#7FAFC6] rounded-full px-1.5 py-0.5 mt-1">
                      Demand: {route.relatedDemandEvent}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-foreground max-w-[120px]">
                  <span className="line-clamp-2">{route.trigger}</span>
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{route.audience}</td>
                <td className="px-3 py-3">
                  <p className="font-mono text-[11px] text-foreground">{route.slackChannel}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <StatusDot status="amber" />
                    <span className="text-[10px] text-[#CC8400]">{route.slackStatus}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {route.googleChatSpace ? (
                    <>
                      <p className="text-[11px] text-muted-foreground">{route.googleChatSpace}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <StatusDot status="gray" />
                        <span className="text-[10px] text-muted-foreground">{route.googleChatStatus}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{route.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 text-center">
        Click any row to open its Knowledge Brief. {commRoutes.length} routes defined — all planned, none yet connected.
      </p>
    </PageShell>
  );
}
