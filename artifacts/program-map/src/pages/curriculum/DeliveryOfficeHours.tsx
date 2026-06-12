import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumOfficeHours, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Clock, ArrowRight } from 'lucide-react';

export default function DeliveryOfficeHours() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Delivery Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Office Hours</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Recurring and module-specific office hours sessions. Penny reminds learners before each session and coaches
            prepare using the linked module context. Select a session to view prep notes in the Knowledge Brief.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumOfficeHours.map(oh => {
            const statusCfg = CONTENT_STATUS_CONFIG[oh.status];
            return (
              <button
                key={oh.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: oh.id, data: oh })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-pink-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-pink-600 shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{oh.name}</p>
                      <p className="text-[11px] text-muted-foreground">{oh.schedule as string} · {oh.format as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">{oh.purpose}</p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
