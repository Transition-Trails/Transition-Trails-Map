import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';

export default function PennyTemplates() {
  const [, setLocation] = useLocation();
  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Penny Templates</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            This section has moved. Penny content generation is now managed in the Penny Content Assistant — Content Workshop.
          </p>
        </div>
        <button onClick={() => setLocation('/curriculum/penny-assistant')} className="flex items-center gap-2 text-[13px] font-semibold text-primary border border-primary/20 bg-primary/5 rounded-lg px-4 py-3 hover:bg-primary/10 transition-colors">
          Go to Content Workshop <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </ScrollArea>
  );
}
