import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { curriculumKnowledgeArticles, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function KnowledgeArticles() {
  const { setSelectedItem } = useAppContext();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const articleTypes = ['all', ...Array.from(new Set(curriculumKnowledgeArticles.map(a => a.articleType as string)))];
  const filtered = typeFilter === 'all' ? curriculumKnowledgeArticles : curriculumKnowledgeArticles.filter(a => a.articleType === typeFilter);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio — Learning Assets</p>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Articles</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Reference articles, concept guides, and decision frameworks linked to modules and lessons. Select an article to view its module connections in the Knowledge Brief.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {articleTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`text-[11px] font-semibold rounded-full px-3 py-1.5 border transition-colors capitalize ${typeFilter === t ? 'bg-[#2F6F7E] text-white border-[#2F6F7E]' : 'border-border text-muted-foreground hover:border-[#7FAFC6]'}`}>
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {filtered.map(article => {
            const statusCfg = CONTENT_STATUS_CONFIG[article.status];
            return (
              <button key={article.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: article.id, data: article })} className="rounded-xl border border-border bg-white p-4 text-left hover:border-[#7FAFC6] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2F6F7E] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{article.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-[#2F6F7E] border border-[#7FAFC6] bg-[#EDF5F8] rounded-full px-1.5 py-0.5">{article.articleType as string}</span>
                        <span className="text-[10px] text-muted-foreground">{article.wordCount as number} words · Reviewed {article.lastReviewed as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">{article.purpose}</p>
                <p className="text-[10px] text-[#2F6F7E] mt-1">
                  Linked modules: {((article.moduleIds as string[]) || []).length > 0 ? `${(article.moduleIds as string[]).length} module(s)` : 'No modules linked'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
