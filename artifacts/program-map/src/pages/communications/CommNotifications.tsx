import { useAppContext } from '@/context/AppContext';
import { commNotifications, type CommNotification } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { Bell, ArrowRight, ChevronRight } from 'lucide-react';

function statusBadge(s: CommNotification['status']) {
  if (s === 'active')  return <Badge className="text-[10px] bg-green-50 text-green-800 border-green-200 border">Active</Badge>;
  return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Planned</Badge>;
}

export default function CommNotifications() {
  const { setSelectedItem } = useAppContext();

  function select(n: CommNotification) {
    setSelectedItem({ type: 'commNotification', id: n.id, data: n });
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Communications</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Event routing rules that send Trail OS and Penny signals to the right channel at the right time. Click any rule to open its Knowledge Brief.
          </p>
        </div>

        {/* Column headers */}
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_28px_1fr_100px] gap-3 px-5 py-2.5 bg-muted/30 border-b border-border/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Event</p>
            <div />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Destination</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</p>
          </div>

          {commNotifications.map((n, i) => (
            <button
              key={n.id}
              onClick={() => select(n)}
              className={`w-full grid grid-cols-[1fr_28px_1fr_100px] gap-3 items-center px-5 py-4 text-left hover:bg-muted/30 transition-colors group ${
                i < commNotifications.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Bell className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground">{n.event}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{n.source}</p>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground/30 justify-self-center" />

              <div>
                <p className="text-[12px] font-mono font-semibold text-foreground">{n.destination}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.audience}</p>
              </div>

              <div className="flex items-center justify-between">
                {statusBadge(n.status)}
                <ChevronRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Event routing is provider-agnostic.</strong> Each rule specifies a logical destination (e.g. "ops channel") rather than a specific Slack channel ID. When the provider changes, only the destination mapping updates — the routing rule stays the same. Detailed routing configuration is available in Administration → Comm Routing.
          </p>
        </div>

      </div>
    </div>
  );
}
