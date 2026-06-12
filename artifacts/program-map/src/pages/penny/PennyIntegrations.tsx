import { useAppContext } from '@/context/AppContext';
import { commProviders } from '@/data/commProviders';
import { commRoutes } from '@/data/commRouting';
import { PageShell, StatusDot } from '@/components/platform/PageShell';
import { Hash, MessageCircle, Brain, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

const pennyCommRoutes = commRoutes.filter(r => r.relatedPennyCap);

export default function PennyIntegrations() {
  const { setSelectedItem } = useAppContext();
  const [, setLocation]     = useLocation();

  return (
    <PageShell
      section="Penny Command Center"
      title="Integrations"
      badge="future-state"
      subtitle="How Penny connects to external systems — communication channels, Salesforce, Agentforce, and future data sources."
      integration="Agentforce + Slack + Salesforce (all future)"
    >
      <div className="space-y-6">
        {/* Penny's comm role */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Brain className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">Penny's Role in Communication</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Penny triggers several of the Trail OS communication events — at-risk learner alerts,
                coaching nudges, Trail Talk reminders, and Trail Win prompts. When Penny detects a flag,
                it fires an event that the Comm Routing model delivers to the configured Slack channel or
                Google Chat space. Penny does not send messages directly; it triggers routed events.
              </p>
            </div>
          </div>
        </div>

        {/* Penny-triggered routing rules */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Penny-Triggered Routing Rules</h2>
          <div className="space-y-2">
            {pennyCommRoutes.map(route => (
              <button
                key={route.id}
                onClick={() => setSelectedItem({ type: 'commRoute', id: route.id, data: route })}
                className="w-full text-left rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all p-4 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{route.eventType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{route.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">
                        Penny: {route.relatedPennyCap}
                      </span>
                      <span className="text-[11px] text-muted-foreground">Trigger: {route.trigger}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Hash className="w-3.5 h-3.5 text-[#4A154B]" />
                      <span className="font-mono text-[11px] text-foreground">{route.slackChannel}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <StatusDot status="amber" />
                      <span className="text-[10px] text-amber-700">{route.slackStatus}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-primary font-medium mt-2 group-hover:underline">Open Trail Insights →</p>
              </button>
            ))}
          </div>
        </div>

        {/* Channel readiness */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Communication Channel Readiness</h2>
          <div className="grid grid-cols-2 gap-3">
            {commProviders.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedItem({ type: 'commProvider', id: p.id, data: p })}
                className="text-left rounded-xl border border-border bg-card hover:bg-muted/30 transition-all p-3 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${p.slug === 'slack' ? 'bg-[#4A154B]' : 'bg-[#1A73E8]'}`}>
                    {p.slug === 'slack' ? <Hash className="w-3.5 h-3.5 text-white" /> : <MessageCircle className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <span className={`inline-flex text-[10px] font-semibold border px-1.5 py-0.5 rounded-full ml-auto ${p.status === 'prototype' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-muted border-border text-muted-foreground'}`}>
                    {p.status === 'prototype' ? 'Q3 2025' : 'Future'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{p.futureSetup}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Other future integrations */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Other Future Integrations</h2>
          <div className="space-y-2">
            {[
              { name: 'Agentforce AI',   desc: 'Penny\'s production AI backbone — replaces prototype pattern-matching with live Agentforce LLM', eta: 'Phase 2' },
              { name: 'Salesforce',      desc: 'REST API live (Replit Connector) — wire Penny capability to query learner records and cohort data', eta: 'Wire Now' },
              { name: 'Google Drive',    desc: 'Penny knowledge base — source documents synced and indexed for retrieval. OAuth client ready.',    eta: 'In Progress' },
              { name: 'Zapier',          desc: 'Automation bridge — Penny log export, Slack webhook delivery, and cross-system triggers',          eta: 'Phase 2' },
            ].map(int => (
              <div key={int.name} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <StatusDot status="gray" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{int.name}</p>
                  <p className="text-[11px] text-muted-foreground">{int.desc}</p>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0">{int.eta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => setLocation('/admin/comm-channels')}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Manage Communication Channels <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}
