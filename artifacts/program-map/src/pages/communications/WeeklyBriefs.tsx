import { useAppContext } from '@/context/AppContext';
import { TERMS } from '@/config/terminology';
import { commWeeklyBriefs, type CommWeeklyBrief } from '@/data/commData';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CheckCircle, ChevronRight } from 'lucide-react';

function statusBadge(s: CommWeeklyBrief['status']) {
  if (s === 'active')  return <Badge className="text-[14px] bg-[#E6F0EA] text-[#245531] border-[#9FC3AE] border">Active</Badge>;
  if (s === 'planned') return <Badge className="text-[14px] bg-primary/10 text-primary border-primary/20 border">Planned</Badge>;
  return <Badge variant="secondary" className="text-[14px]">Draft</Badge>;
}

const SECTION_ICONS: string[] = ['📊', '👤', '🎓', '✨', '📥', '📚'];

export default function WeeklyBriefs() {
  const { setSelectedItem } = useAppContext();

  function select(b: CommWeeklyBrief) {
    setSelectedItem({ type: 'commWeeklyBrief', id: b.id, data: b });
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="space-y-6">
          {commWeeklyBriefs.map(b => (
            <button
              key={b.id}
              onClick={() => select(b)}
              className="w-full rounded-xl border border-border bg-white shadow-sm p-6 text-left hover:border-primary/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground text-lg">{b.name}</p>
                    <p className="text-[14px] text-muted-foreground mt-0.5">{b.audience} · {b.frequency} · {b.channel}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {statusBadge(b.status)}
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{b.purpose}</p>

              <div>
                <p className="text-[14px] font-bold  text-muted-foreground/60 mb-3">Brief Sections</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {b.sections.map((section, i) => {
                    const [title, ...rest] = section.split(' — ');
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                        <span className="text-sm shrink-0 mt-0.5">{SECTION_ICONS[i] || '📋'}</span>
                        <div>
                          <p className="text-[14px] font-bold text-foreground">{title}</p>
                          {rest.length > 0 && <p className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">{rest.join(' — ')}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/40">
                <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                <span className="text-[14px] text-muted-foreground/60">Owner: {b.owner}</span>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[14px] text-muted-foreground/60">{b.relatedDemandEvent}</span>
                <ChevronRight className="w-3 h-3 text-primary/40 group-hover:text-primary ml-auto transition-colors" />
              </div>
            </button>
          ))}
        </div>


      </div>
    </div>
  );
}
