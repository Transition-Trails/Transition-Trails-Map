import { useAppContext } from '@/context/AppContext';
import { commTemplates, type CommTemplate } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronRight } from 'lucide-react';

function statusBadge(s: CommTemplate['status']) {
  if (s === 'active')    return <Badge className="text-[10px] bg-green-50 text-green-800 border-green-200 border">Active</Badge>;
  if (s === 'approved')  return <Badge className="text-[10px] bg-secondary/10 text-secondary border-secondary/20 border">Approved</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Draft</Badge>;
}

export default function MessageTemplates() {
  const { setSelectedItem } = useAppContext();

  function select(t: CommTemplate) {
    setSelectedItem({ type: 'commTemplate', id: t.id, data: t });
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Communications</p>
          <h1 className="text-3xl font-bold text-foreground">Message Templates</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Reusable, reviewable templates that Penny and Trail OS use to compose broadcasts, briefs, and notifications. Click any template to open its Knowledge Brief.
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_110px_90px_80px] gap-3 px-5 py-2.5 bg-muted/30 border-b border-border/60">
            {['Template', 'Provider', 'Audience', 'Trigger', 'Status'].map(h => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{h}</p>
            ))}
          </div>

          {commTemplates.map((t, i) => (
            <button
              key={t.id}
              onClick={() => select(t)}
              className={`w-full grid grid-cols-[1fr_80px_110px_90px_80px] gap-3 items-start px-5 py-3.5 text-left hover:bg-muted/30 transition-colors group ${
                i < commTemplates.length - 1 ? 'border-b border-border/30' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.destination}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{t.provider}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{t.audience}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{t.triggerEvent}</p>
              <div className="flex items-center gap-1">
                {statusBadge(t.status)}
                <ChevronRight className="w-3 h-3 text-primary/30 group-hover:text-primary transition-colors shrink-0" />
              </div>
            </button>
          ))}
        </div>

        {/* Meta table */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">Template Fields</h2>
          <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-[140px_1fr] divide-y divide-border/30">
              {[
                ['Template Name', 'Short descriptive name used across the Communications Hub.'],
                ['Provider', 'Slack, Google Chat, Teams, or Email — the adapter through which this template is delivered.'],
                ['Audience', 'Who receives this message — learners, coaches, ops team, or leadership.'],
                ['Trigger Event', 'The Trail OS or Penny event that fires this template.'],
                ['Destination', 'The specific channel, space, or inbox this template is routed to.'],
                ['Owner', 'Who is responsible for keeping this template current.'],
                ['Status', 'Draft → Approved → Active. Templates must be Approved before they can go Active.'],
                ['Last Reviewed', 'Date this template was last reviewed for accuracy and relevance.'],
              ].map(([field, desc]) => (
                <div key={field} className="grid grid-cols-[140px_1fr] col-span-2">
                  <div className="px-4 py-2.5 bg-muted/30 border-r border-border/30">
                    <p className="text-[11px] font-semibold text-foreground">{field}</p>
                  </div>
                  <div className="px-4 py-2.5">
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-border/60 bg-muted/30 px-5 py-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Template management —</strong> Full template editing, versioning, and approval workflows are planned in Administration → Message Templates. This view is the operational reference for current template status.
          </p>
        </div>

      </div>
    </div>
  );
}
