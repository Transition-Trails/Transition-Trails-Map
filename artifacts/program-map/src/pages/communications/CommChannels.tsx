import { useAppContext } from '@/context/AppContext';
import { commChannels, type CommChannel } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { Hash, Globe } from 'lucide-react';

function statusBadge(status: CommChannel['status']) {
  if (status === 'active')  return <Badge className="text-[10px] bg-[#E6F0EA] text-[#245531] border-[#9FC3AE] border">Active</Badge>;
  if (status === 'planned') return <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Planned</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Future</Badge>;
}

function providerBadge(provider: string, ps: CommChannel['providerStatus']) {
  const cls = ps === 'planned' ? 'text-primary border-primary/20 bg-primary/5' : 'text-muted-foreground border-border bg-muted/40';
  return <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cls}`}>{provider}</span>;
}

const TYPE_LABELS: Record<CommChannel['type'], string> = {
  team: 'Cohort',
  alert: 'Alert',
  digest: 'Digest',
  ops: 'Ops',
  space: 'Space',
  'client-space': 'Client Space',
};

export default function CommChannels() {
  const { setSelectedItem } = useAppContext();

  function select(ch: CommChannel) {
    setSelectedItem({ type: 'commChannel', id: ch.id, data: ch });
  }

  const slackChannels  = commChannels.filter(c => c.provider === 'Slack');
  const futureChannels = commChannels.filter(c => c.provider !== 'Slack');

  function ChannelRow({ ch }: { ch: CommChannel }) {
    return (
      <button
        onClick={() => select(ch)}
        className="w-full flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left group border-b border-border/30 last:border-0"
      >
        <div className="mt-0.5 shrink-0">
          {ch.type === 'space'
            ? <Globe className="w-4 h-4 text-muted-foreground/60" />
            : <Hash className="w-4 h-4 text-muted-foreground/60" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[12px] font-semibold text-foreground">{ch.name}</span>
            {providerBadge(ch.provider, ch.providerStatus)}
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50 border border-border/60 rounded px-1.5 py-0.5">{TYPE_LABELS[ch.type]}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ch.purpose}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ch.audience} · Owner: {ch.owner}</p>
        </div>
        <div className="shrink-0">
          {statusBadge(ch.status)}
        </div>
      </button>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Communications & Collaboration</p>
          <h1 className="text-3xl font-bold text-foreground">Channels & Spaces</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Slack channels for the learning community. Google Chat Spaces for client and project collaboration. Click any channel to open its Trail Insights.
          </p>
        </div>

        {/* Slack channels */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Slack — Community & Program</h2>
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Primary Prototype</Badge>
          </div>
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {slackChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
          </div>
        </section>

        {/* Google Chat spaces */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">Google Chat — Client & Project Spaces</h2>
            <Badge variant="secondary" className="text-[10px]">Future Supported</Badge>
          </div>
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            {futureChannels.map(ch => <ChannelRow key={ch.id} ch={ch} />)}
          </div>
        </section>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Two channel types, two audiences.</strong> Slack is the community and program layer — for learners, coaches, and internal ops. Google Chat Spaces are the client-facing layer — for nonprofit partners, Digital Compass, and executive sponsors who work in Google Workspace.
          </p>
        </div>

      </div>
    </div>
  );
}
