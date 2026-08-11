import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumOfficeHours, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Clock, ArrowRight } from 'lucide-react';

export default function DeliveryOfficeHours() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Office Hours</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumOfficeHours.length}</span> Sessions
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {curriculumOfficeHours.map(oh => {
            const statusCfg = CONTENT_STATUS_CONFIG[oh.status];
            return (
              <button
                key={oh.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: oh.id, data: oh })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#E8B9B4] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#A93F2F] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{oh.name}</p>
                      <p className="text-[14px] text-muted-foreground">{oh.schedule as string} · {oh.format as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{oh.purpose}</p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
