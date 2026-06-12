import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCalendarEvents, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Calendar, ArrowRight } from 'lucide-react';

const EVENT_TYPE_COLORS: Record<string, string> = {
  'Office Hours': 'bg-orange-50 text-orange-800 border-orange-200',
  'Kickoff':      'bg-violet-50 text-violet-800 border-violet-200',
  'Review':       'bg-sky-50 text-sky-800 border-sky-200',
  'Workshop':     'bg-amber-50 text-amber-800 border-amber-200',
};

export default function DeliveryCalendarEvents() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Delivery Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Calendar Events</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Scheduled live touchpoints in the learning journey — office hours, kickoff sessions, progress reviews, and workshops.
            Each event is linked to a module or cohort. Select an event to view its full agenda in the Knowledge Brief.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumCalendarEvents.map(event => {
            const statusCfg = CONTENT_STATUS_CONFIG[event.status];
            const typeCls = EVENT_TYPE_COLORS[event.eventType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button
                key={event.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: event.id, data: event })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{event.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{event.eventType as string}</span>
                        <span className="text-[10px] text-muted-foreground">{event.timing as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mb-1">{event.purpose}</p>
                <p className="text-[11px] text-muted-foreground/70">Attendees: {event.attendees as string}</p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
