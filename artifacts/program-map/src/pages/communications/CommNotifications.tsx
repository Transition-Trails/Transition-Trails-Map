import { useAppContext } from '@/context/AppContext';
import { commNotifications, type CommNotification } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { Bell, ArrowRight, ChevronRight, CalendarDays } from 'lucide-react';

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
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Communications & Collaboration</p>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Routing rules combining audience, timing, and provider — Slack for community, Google Chat for clients, Google Calendar for timing context. Click any rule to open its Knowledge Brief.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-2.5 bg-muted/30 border-b border-border/60 grid grid-cols-[1fr_28px_1fr_100px] gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Event · Source</p>
            <div />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Destination(s)</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Status</p>
          </div>

          {commNotifications.map((n, i) => (
            <button
              key={n.id}
              onClick={() => select(n)}
              className={`w-full grid grid-cols-[1fr_28px_1fr_100px] gap-3 items-start px-5 py-4 text-left hover:bg-muted/30 transition-colors group ${
                i < commNotifications.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              {/* Event + Source */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Bell className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[12px] font-semibold text-foreground leading-snug">{n.event}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{n.source}</p>
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground/30 justify-self-center mt-0.5" />

              {/* Destination(s) */}
              <div className="space-y-1">
                <p className="text-[12px] font-mono font-semibold text-foreground leading-snug">{n.destination}</p>
                {n.secondaryDestination && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <CalendarDays className="w-2.5 h-2.5 shrink-0" />
                    <span>{n.secondaryDestination}</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">{n.audience}</p>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                {statusBadge(n.status)}
                <ChevronRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Audience + timing, not just channel.</strong> Rules combining a primary channel (Slack or Google Chat) with a secondary Calendar destination fire at the right moment — not on a fixed schedule. Routing configuration is available in Administration → Comm Routing.
          </p>
        </div>

      </div>
    </div>
  );
}
