import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumResources, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Link, ArrowRight } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'External Platform': 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Documentation':     'bg-slate-50 text-slate-800 border-slate-200',
  'Internal Document': 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
};

export default function LearningResources() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Learning Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Resources</h1>
          <p className="text-[14px] text-muted-foreground mt-1">External platforms, documentation links, and internal reference documents attached to modules. Resources supplement structured lessons with self-directed learning material.</p>
        </div>
        <div className="grid gap-3">
          {curriculumResources.map(res => {
            const statusCfg = CONTENT_STATUS_CONFIG[res.status];
            const typeCls = TYPE_COLORS[res.resourceType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button key={res.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: res.id, data: res })} className="rounded-xl border border-border bg-white p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{res.name}</p>
                      <span className={`text-[14px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{res.resourceType as string}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{res.purpose}</p>
                <p className="text-[14px] text-muted-foreground mt-1">
                  Linked to: {((res.moduleIds as string[]) || []).length > 0 ? `${(res.moduleIds as string[]).join(', ')}` : 'All Programs'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
