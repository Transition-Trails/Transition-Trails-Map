import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumWeeklyReviews, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { BarChart2, ArrowRight } from 'lucide-react';

export default function PennyWeeklyReviews() {
  const { setSelectedItem } = useAppContext();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[14px] font-semibold text-foreground">Weekly Reviews</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{curriculumWeeklyReviews.length}</span> Reviews
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-5xl space-y-4">
          {curriculumWeeklyReviews.map(review => {
            const statusCfg = CONTENT_STATUS_CONFIG[review.status];
            return (
              <button
                key={review.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: review.id, data: review })}
                className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-cyan-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-cyan-600 shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{review.name}</p>
                      <p className="text-[14px] text-muted-foreground">
                        {review.program}
                        {review.weekNumber ? ` · Week ${review.weekNumber as number}` : ' · Template'}
                        {review.deliveredVia ? ` · ${review.deliveredVia as string}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{review.purpose}</p>
                {!!(review.sampleOutput) && (
                  <div className="mt-2 rounded bg-cyan-50 border border-cyan-100 px-3 py-2">
                    <p className="text-[14px] font-bold text-cyan-600 mb-0.5">SAMPLE OUTPUT</p>
                    <p className="text-[14px] text-foreground/80 italic">"{review.sampleOutput as string}"</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
