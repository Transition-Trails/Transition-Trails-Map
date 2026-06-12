import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumGoogleChatUpdates, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function DeliveryGoogleChat() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Delivery Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Google Chat Updates</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Structured Google Chat messages for cohort spaces and coaching team channels — sprint launches, progress updates,
            assessment reminders, and program announcements. Select an update to view its script in the Knowledge Brief.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumGoogleChatUpdates.map(update => {
            const statusCfg = CONTENT_STATUS_CONFIG[update.status];
            return (
              <button
                key={update.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: update.id, data: update })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{update.name}</p>
                      <p className="text-[11px] text-muted-foreground">{update.channel as string} · {update.timing as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">{update.purpose}</p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
