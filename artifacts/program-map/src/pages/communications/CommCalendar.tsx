import { useAppContext } from '@/context/AppContext';
import { commCalendarCategories, type CommCalendarCategory } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';

function statusBadge(s: CommCalendarCategory['status']) {
  if (s === 'planned') return <Badge className="text-[14px] bg-primary/10 text-primary border-primary/20 border">Planned</Badge>;
  return <Badge variant="secondary" className="text-[14px]">Future</Badge>;
}

const CATEGORY_ICONS = ['📅', '🗓️', '⚙️', '🤝', '✨'];

export default function CommCalendar() {
  const { setSelectedItem } = useAppContext();

  function select(c: CommCalendarCategory) {
    setSelectedItem({ type: 'commCalendar', id: c.id, data: c });
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="space-y-8">

        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/50 mb-1">Communications & Collaboration</p>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Google Calendar is the operational timing layer for Trail OS — telling Penny and Trail OS <em>when</em> things happen so communications fire at the right moment, not on a fixed schedule.
          </p>
        </div>

        {/* Mental model callout */}
        <div className="rounded-xl border border-border bg-white shadow-sm p-5">
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-3">The Operating Model</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Knowledge Library', role: 'what', color: 'border-secondary/30 bg-secondary/5', textColor: 'text-secondary' },
              { label: 'Salesforce / Demand', role: 'work', color: 'border-[#FFD08A] bg-[#FFF3E0]', textColor: 'text-[#CC8400]' },
              { label: 'Communications', role: 'who', color: 'border-primary/30 bg-primary/5', textColor: 'text-primary' },
              { label: 'Calendar', role: 'when', color: 'border-[#9FC3AE] bg-[#E6F0EA]', textColor: 'text-[#245531]' },
            ].map(m => (
              <div key={m.role} className={`rounded-lg border px-3 py-2.5 ${m.color}`}>
                <p className={`text-[14px] font-bold  ${m.textColor}`}>{m.role}</p>
                <p className="text-[14px] font-semibold text-foreground mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">
            Calendar answers the <strong>"when"</strong> question. Without it, Trail OS and Penny use fixed schedules. With it, every communication fires based on what's actually happening — cohort starts, UAT sessions, sprint reviews, and leadership meetings.
          </p>
        </div>

        {/* Provider status */}
        <div className="rounded-md bg-muted/40 border border-border/60 px-4 py-3 flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            <strong>Google Calendar — Future Collaboration Source.</strong> No live connection yet. Calendar categories and event types below represent the planned configuration when the Google Calendar API integration is established.
          </p>
        </div>

        {/* Calendar categories */}
        <div className="space-y-4">
          {commCalendarCategories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => select(cat)}
              className="w-full rounded-xl border border-border bg-white shadow-sm p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl shrink-0">{CATEGORY_ICONS[i]}</span>
                  <div>
                    <p className="font-bold text-foreground">{cat.name}</p>
                    <p className="text-[14px] text-muted-foreground mt-0.5">Owner: {cat.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(cat.status)}
                  <ChevronRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary transition-colors" />
                </div>
              </div>

              <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">{cat.purpose}</p>

              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/60 mb-2">Event Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.events.map(e => (
                    <div key={e} className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1">
                      <Clock className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0" />
                      <span className="text-[14px] text-muted-foreground">{e}</span>
                    </div>
                  ))}
                </div>
              </div>

              {cat.relatedChannels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {cat.relatedChannels.map(ch => (
                    <Badge key={ch} variant="secondary" className="text-[14px] font-mono">{ch}</Badge>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
