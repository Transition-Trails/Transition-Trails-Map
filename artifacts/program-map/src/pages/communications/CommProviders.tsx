import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { commProviders, type CommProvider } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ExternalLink } from 'lucide-react';

function statusBadge(status: CommProvider['status']) {
  if (status === 'planned-primary') return <Badge className="text-[14px] bg-primary/10 text-primary border-primary/20 border">Planned · Primary Prototype</Badge>;
  if (status === 'active')          return <Badge className="text-[14px] bg-[#E6F0EA] text-[#245531] border-[#9FC3AE] border">Active</Badge>;
  return <Badge variant="secondary" className="text-[14px]">Future Supported</Badge>;
}

export default function CommProviders() {
  const { setSelectedItem } = useAppContext();

  function select(p: CommProvider) {
    setSelectedItem({ type: 'commProvider', id: p.id, data: p });
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Communications</p>
          <h1 className="text-3xl font-bold text-foreground">Providers</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Communication providers are the adapters through which Trail OS and {TERMS.aiAssistant} deliver messages. Slack is the first planned adapter. The hub is designed to be provider-agnostic.
          </p>
        </div>

        <div className="rounded-md bg-primary/5 border border-primary/15 px-4 py-3">
          <p className="text-[14px] text-primary/80 leading-relaxed">
            <strong>Design principle —</strong> Slack is the first adapter, not the product. Channels, broadcasts, templates, and notification rules are configured once and can be routed to any provider. Changing the provider should not require redesigning your messaging.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {commProviders.map(p => (
            <button
              key={p.id}
              onClick={() => select(p)}
              className={`rounded-xl border bg-white shadow-sm p-5 text-left transition-all hover:shadow-md group flex flex-col gap-3 ${
                p.status === 'planned-primary' ? 'border-primary/30 hover:border-primary/50' : 'border-border hover:border-border/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm border ${
                    p.status === 'planned-primary' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    {p.id === 'slack' ? <MessageSquare className="w-4 h-4" /> : p.icon}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{p.name}</p>
                    <p className="text-[14px] text-muted-foreground">{p.owner}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {statusBadge(p.status)}
                </div>
              </div>

              <p className="text-[14px] text-muted-foreground leading-relaxed line-clamp-3">{p.description}</p>

              <div className="flex flex-wrap gap-1 mt-auto">
                {p.capabilities.map(c => (
                  <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[14px] text-muted-foreground border border-border/60">{c}</span>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[14px] text-primary/60 group-hover:text-primary transition-colors mt-1">
                <ExternalLink className="w-3 h-3" />
                <span>Open Trail Insights</span>
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            <strong>No live connections active.</strong> Provider setup requires API credentials, workspace permissions, and admin configuration. Planned in Administration → Integrations when ready.
          </p>
        </div>

      </div>
    </div>
  );
}
