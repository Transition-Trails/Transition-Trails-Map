import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { curriculumKnowledgeArticles, CONTENT_STATUS_CONFIG } from '@/data/curriculumData';
import { BookOpen, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const ARTICLE_TYPES = ['All', 'Reference', 'How-To', 'Career', 'Certification', 'Glossary'];

export default function KnowledgeArticles() {
  const { setSelectedItem } = useAppContext();
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = typeFilter === 'All'
    ? curriculumKnowledgeArticles
    : curriculumKnowledgeArticles.filter(a => a.articleType === typeFilter);

  return (
    <div className="h-full w-full overflow-y-auto p-6 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Curriculum Studio</p>
          <h1 className="text-3xl font-serif font-bold text-foreground">Knowledge Articles</h1>
          <p className="text-muted-foreground mt-2">Salesforce Knowledge taxonomy articles — the atomic content units that Penny draws from. Each article maps to a future Salesforce Knowledge record. Click any article to open its Knowledge Brief.</p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {ARTICLE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                typeFilter === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-border text-muted-foreground hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(article => {
            const statusCfg    = CONTENT_STATUS_CONFIG[article.status];
            const hasPenny     = article.hasPennyMapping as boolean;
            const hasOwner     = !!(article.owner as string);
            const hasIssue     = !hasPenny || !hasOwner || article.status === 'draft';
            return (
              <button
                key={article.id}
                onClick={() => setSelectedItem({ type: 'curriculumItem', id: article.id, data: article })}
                className="w-full text-left rounded-xl border border-border bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all p-4 group shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[13px] font-bold text-foreground group-hover:text-indigo-700">{article.name as string}</p>
                      <span className={`inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusCfg.cls}`}>{statusCfg.label}</span>
                      <span className="inline-flex text-[10px] font-medium text-indigo-700 border border-indigo-200 bg-indigo-50 rounded-full px-2 py-0.5">{article.articleType as string}</span>
                      {hasIssue && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{article.purpose as string}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px]">
                      <span className={`flex items-center gap-1 ${hasOwner ? 'text-muted-foreground' : 'text-red-600'}`}>
                        {hasOwner ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3" />}
                        {hasOwner ? `Owner: ${article.owner as string}` : 'No owner assigned'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{article.wordCount as number} words</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">Reviewed: {article.lastReviewed as string}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`flex items-center gap-1 ${hasPenny ? 'text-secondary' : 'text-orange-600'}`}>
                        {hasPenny ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        Penny {hasPenny ? 'mapped' : 'unmapped'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-600 flex-shrink-0 mt-0.5" />
                </div>
                {article.notes && (
                  <div className="mt-2 ml-11 text-[10px] text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1">
                    ⚠ {article.notes as string}
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
