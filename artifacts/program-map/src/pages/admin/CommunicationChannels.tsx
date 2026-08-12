import { TERMS } from '@/config/terminology';
import { useAppContext } from '@/context/AppContext';
import { commProviders } from '@/data/commProviders';
import { commRoutes } from '@/data/commRouting';
import { messageTemplates } from '@/data/messageTemplates';
import { PageShell, StatusDot } from '@/components/platform/PageShell';
import { Hash, MessageCircle, Plus, Info, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

const ICON: Record<string, React.ReactNode> = {
  slack: <Hash className="w-5 h-5 text-white" />,
  'google-chat': <MessageCircle className="w-5 h-5 text-white" />,
};

const COLOR: Record<string, string> = {
  slack: 'bg-[#4A154B]',
  'google-chat': 'bg-[#1A73E8]',
};

const STATUS_BADGE: Record<string, string> = {
  prototype: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',
  future:    'bg-muted border-border text-muted-foreground',
};

export default function CommunicationChannels() {
  const { setSelectedItem } = useAppContext();
  const [, setLocation]     = useLocation();

  return (
    <PageShell
      section="Administration · Integrations"
      title="Communication Channels"
      badge="prototype"
      subtitle="Channel-agnostic communication layer. Connect Slack now — add Google Chat later with no routing logic changes."
    >
      {/* Architecture callout */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Channel-Agnostic Architecture</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Events (Trail Talk reminders, case escalations, {TERMS.aiAssistant} nudges) are defined once in the{' '}
              <strong>Comm Routing</strong> model. Each event maps to a <em>provider + destination</em> pair.
              Switching from Slack to Google Chat means updating the destination adapter only — no changes to
              event definitions, templates, or core logic.
            </p>
          </div>
        </div>
      </div>

      {/* Provider cards */}
      <h2 className="text-sm font-semibold text-foreground mb-3">Communication Providers</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {commProviders.map(provider => (
          <button
            key={provider.id}
            onClick={() => setSelectedItem({ type: 'commProvider', id: provider.id, data: provider })}
            className="text-left rounded-xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-150 overflow-hidden group"
          >
            <div className={`${COLOR[provider.slug]} px-4 py-3 flex items-center gap-3`}>
              {ICON[provider.slug]}
              <div>
                <p className="text-white font-bold text-sm leading-none">{provider.name}</p>
                <p className="text-white/70 text-[14px] mt-0.5">{provider.tagline}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <StatusDot status={provider.status === 'prototype' ? 'amber' : 'gray'} />
                <span className="text-sm text-muted-foreground">{provider.connectionStatus}</span>
                <span className={`inline-flex items-center text-[14px] font-semibold border px-2 py-0.5 rounded-full ml-auto ${STATUS_BADGE[provider.status]}`}>
                  {provider.status === 'prototype' ? 'Prototype-Ready' : 'Future'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{provider.purpose}</p>
              <div>
                <p className="text-[14px] font-bold  text-foreground mb-1.5">Use Cases</p>
                <ul className="space-y-1">
                  {provider.useCases.slice(0, 4).map((uc, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[14px] text-muted-foreground">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0 mt-1.5" />
                      {uc}
                    </li>
                  ))}
                  {provider.useCases.length > 4 && (
                    <li className="text-[14px] text-primary">+{provider.useCases.length - 4} more</li>
                  )}
                </ul>
              </div>
              <p className="text-[14px] text-primary font-medium group-hover:underline">Click to open Trail Insights →</p>
            </div>
          </button>
        ))}

        {/* Phase 2 provider — coming soon */}
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/10 flex flex-col items-center justify-center p-6 text-center min-h-[200px] gap-2">
          <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <Plus className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground/70">More providers in Phase 2</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed max-w-[160px] mx-auto">
              Teams, Email, and SMS support are on the Phase 2 roadmap.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration shortcuts */}
      <h2 className="text-sm font-semibold text-foreground mb-3">Configuration Areas</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Comm Routing',
            desc: `${commRoutes.length} event-to-channel mappings defined`,
            path: '/admin/comm-routing',
            count: commRoutes.length,
          },
          {
            label: 'Message Templates',
            desc: `${messageTemplates.length} draft templates ready for review`,
            path: '/admin/comm-templates',
            count: messageTemplates.length,
          },
        ].map(link => (
          <button
            key={link.path}
            onClick={() => setLocation(link.path)}
            className="text-left rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/30 transition-all p-4 group"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">{link.label}</p>
              <span className="text-[14px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">{link.count}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{link.desc}</p>
            <div className="flex items-center gap-1 text-[14px] text-primary font-medium group-hover:gap-2 transition-all">
              <span>Configure</span><ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
