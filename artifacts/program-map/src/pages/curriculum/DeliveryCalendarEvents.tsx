import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumCalendarEvents, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Calendar, ArrowRight } from 'lucide-react';

const EVENT_TYPE_COLORS: Record<string, string> = {
  'Office Hours': 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'Kickoff':      'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Review':       'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Workshop':     'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
};

export default function DeliveryCalendarEvents() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Calendar Events</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumCalendarEvents.length}</span> Events
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-3">
          {curriculumCalendarEvents.map(event => {
            const statusCfg = CONTENT_STATUS_CONFIG[event.status];
            const typeCls = EVENT_TYPE_COLORS[event.eventType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button
                key={event.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: event.id, data: event })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#FFD08A] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#CC8400] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{event.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[14px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{event.eventType as string}</span>
                        <span className="text-[14px] text-muted-foreground">{event.timing as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground mb-1">{event.purpose}</p>
                <p className="text-[14px] text-muted-foreground/70">Attendees: {event.attendees as string}</p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
