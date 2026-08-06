import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumGoogleChatUpdates, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function DeliveryGoogleChat() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Google Chat Updates</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumGoogleChatUpdates.length}</span> Updates
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-3">
          {curriculumGoogleChatUpdates.map(update => {
            const statusCfg = CONTENT_STATUS_CONFIG[update.status];
            return (
              <button
                key={update.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: update.id, data: update })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#7FAFC6] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#2F6F7E] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{update.name}</p>
                      <p className="text-[14px] text-muted-foreground">{update.channel as string} · {update.timing as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{update.purpose}</p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
