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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background px-5 pt-4 pb-0">
        {/* Row 1: title + count */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h1 className="text-[14px] font-semibold text-foreground">Knowledge Articles</h1>
          <span className="text-muted-foreground/30 text-[12px] hidden sm:inline">·</span>
          <span className="text-[12px] text-muted-foreground">
            <span className="font-bold text-foreground">{filtered.length}</span> of {curriculumKnowledgeArticles.length}
          </span>
        </div>
        {/* Row 2: type filter as underline tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {articleTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[12px] font-semibold px-3 py-2.5 border-b-2 transition-colors whitespace-nowrap capitalize ${
                typeFilter === t
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {filtered.map(article => {
            const statusCfg = CONTENT_STATUS_CONFIG[article.status];
            return (
              <button key={article.id} onClick={() => setSelectedItem({ type: 'curriculumItem', id: article.id, data: article })} className="w-full rounded-xl border border-border bg-white p-4 text-left hover:border-[#7FAFC6] hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2F6F7E] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{article.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[14px] font-medium text-[#2F6F7E] border border-[#7FAFC6] bg-[#EDF5F8] rounded-full px-1.5 py-0.5">{article.articleType as string}</span>
                        <span className="text-[14px] text-muted-foreground">{article.wordCount as number} words · Reviewed {article.lastReviewed as string}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[14px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-[14px] text-muted-foreground">{article.purpose}</p>
                <p className="text-[14px] text-[#2F6F7E] mt-1">
                  Linked modules: {((article.moduleIds as string[]) || []).length > 0 ? `${(article.moduleIds as string[]).length} module(s)` : 'No modules linked'}
                </p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
