import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumSlackActivities, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { Hash, ArrowRight } from 'lucide-react';

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  'Kickoff':      'bg-[#E6F0EA] text-[#245531] border-[#9FC3AE]',
  'Lab Share':    'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Check-In':     'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',
  'Announcement': 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',
  'Lab Check-In': 'bg-cyan-50 text-cyan-800 border-cyan-200',
};

export default function DeliverySlackActivities() {
  const { setSelectedItem } = useAppContext();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[14px] font-bold  text-muted-foreground/60 mb-1">Curriculum Studio — Delivery Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Slack Activities</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Penny-posted Slack threads, lab shares, and cohort engagement activities linked to modules and lessons.
            Each activity has a defined trigger timing and channel target. Select an activity to view its full script and Knowledge Brief.
          </p>
        </div>
        <div className="grid gap-3">
          {curriculumSlackActivities.map(activity => {
            const statusCfg = CONTENT_STATUS_CONFIG[activity.status];
            const typeCls = ACTIVITY_TYPE_COLORS[activity.activityType as string] || 'bg-slate-50 text-slate-700 border-slate-200';
            return (
              <button
                key={activity.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: activity.id, data: activity })}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-[#9FC3AE] hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-[#2F6B3F] shrink-0" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{activity.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[14px] font-medium border rounded-full px-1.5 py-0.5 ${typeCls}`}>{activity.activityType as string}</span>
                        <span className="text-[14px] text-muted-foreground">{activity.channel as string} · {activity.timing as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{activity.purpose}</p>
                {!!(activity.sampleOutput) && (
                  <div className="mt-2 rounded bg-gray-900 text-white px-3 py-2 font-mono">
                    <p className="text-[14px] text-gray-400 mb-0.5">Sample message</p>
                    <p className="text-[14px] leading-relaxed line-clamp-2 italic">{activity.sampleOutput as string}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
