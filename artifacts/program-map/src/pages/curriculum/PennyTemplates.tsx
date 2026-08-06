import { ScrollArea } from '@/components/ui/scroll-area';
import { TERMS } from '@/config/terminology';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';

export default function PennyTemplates() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">{TERMS.aiAssistant} Templates</h1>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-4xl space-y-4">
          <p className="text-[14px] text-muted-foreground">
            This section has moved. {TERMS.aiAssistant} content generation is now managed in the {TERMS.aiAssistant} Content Assistant — Content Workshop.
          </p>
          <button onClick={() => setLocation('/curriculum/penny-assistant')} className="flex items-center gap-2 text-[14px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-lg px-4 py-3 hover:bg-primary/10 transition-colors">
            Go to Content Workshop <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
