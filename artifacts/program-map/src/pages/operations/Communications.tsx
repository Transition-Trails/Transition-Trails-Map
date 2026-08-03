import { useAppContext } from '@/context/AppContext';
import { commProviders } from '@/data/commProviders';
import { commRoutes } from '@/data/commRouting';
import { messageTemplates } from '@/data/messageTemplates';
import { OpsHeader, StatCard, StatusDot } from '@/components/platform/PageShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, MessageCircle, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

export default function OperationsCommunications() {
  const { setSelectedItem } = useAppContext();
  const [, setLocation]     = useLocation();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OpsHeader
        title="Communications"
        subtitle="Channel status, routing health, and template readiness across all communication providers."
        integration="Slack API + Google Chat API (future)"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Providers Configured" value="0 / 2" sub="Slack + Google Chat planned" />
            <StatCard label="Routing Rules"         value={String(commRoutes.length)} sub="all planned, none live" />
            <StatCard label="Message Templates"     value={String(messageTemplates.length)} sub="7 in draft" />
            <StatCard label="Messages Sent (7d)"    value="0"   sub="Not yet connected" />
          </div>

          {/* Channel status */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Channel Status</h2>
            <div className="grid grid-cols-2 gap-4">
              {commProviders.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedItem({ type: 'commProvider', id: p.id, data: p })}
                  className="text-left rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all p-4 group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.slug === 'slack' ? 'bg-[#4A154B]' : 'bg-[#1A73E8]'}`}>
                      {p.slug === 'slack' ? <Hash className="w-4 h-4 text-white" /> : <MessageCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusDot status={p.status === 'prototype' ? 'amber' : 'gray'} />
                    <span className="text-xs text-muted-foreground">{p.connectionStatus}</span>
                    <span className={`inline-flex text-[10px] font-semibold border px-2 py-0.5 rounded-full ml-auto ${p.status === 'prototype' ? 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]' : 'bg-muted border-border text-muted-foreground'}`}>
                      {p.status === 'prototype' ? 'Prototype-Ready' : 'Future'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.purpose}</p>
                  <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">Open Trail Insights →</p>
                </button>
              ))}
            </div>
          </div>

          {/* Routing summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Routing Rules</h2>
              <button
                onClick={() => setLocation('/admin/comm-routing')}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Configure <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {['Event Type', 'Slack Channel', 'Audience', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {commRoutes.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedItem({ type: 'commRoute', id: r.id, data: r })}
                      className="hover:bg-primary/5 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground text-[13px]">{r.eventType}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.slackChannel}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{r.audience}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status="amber" />
                          <span className="text-[11px] text-[#CC8400]">{r.slackStatus}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
