/**
 * HelpPanel — global slide-over that surfaces published SF Knowledge articles.
 * Triggered by the BookOpen icon in Topbar (AppShell) and PennyBar (HomebaseShell).
 * Follows the same fixed inset-y-0 right-0 z-50, spring-animation, scrim pattern
 * as AskPennyPanel and CalendarActionPanel.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, Search, Loader2, AlertCircle, ArrowLeft,
  FileText, ExternalLink, ChevronRight, Eye, Flag,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import {
  useHelpArticles,
  useHelpArticleDetail,
  getVisitedArticles,
  markArticleVisited,
} from '@/hooks/useHelpArticles';
import { useToast } from '@/hooks/use-toast';

// ── Prose style for article body ─────────────────────────────────────────────

const PROSE =
  'prose prose-sm max-w-none text-foreground ' +
  'prose-headings:font-semibold prose-headings:text-foreground ' +
  'prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-muted-foreground ' +
  'prose-li:text-[13px] prose-li:text-muted-foreground ' +
  'prose-a:text-primary prose-a:underline ' +
  'prose-strong:text-foreground prose-strong:font-semibold ' +
  'prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto prose-img:my-3 ' +
  'prose-code:text-[12px] prose-code:bg-muted/60 prose-code:px-1 prose-code:rounded';

// ── Article detail view ───────────────────────────────────────────────────────

function ArticleDetail({
  articleId,
  onBack,
}: {
  articleId: string;
  onBack: () => void;
}) {
  const { data, isLoading, isError } = useHelpArticleDetail(articleId);
  const { toast } = useToast();
  const a = data?.article;
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function sendReport() {
    if (reported || reporting) return;
    setReporting(true);
    try {
      const res = await fetch(`/api/knowledge/sf-articles/${articleId}/report`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: `Reported from ${window.location.pathname}` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((body['message'] as string | undefined) ?? `HTTP ${res.status}`);
      }
      setReported(true);
      toast({
        title: 'Report sent',
        description: 'Thanks — the content team will review this step.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Could not send report',
        description: msg.startsWith('HTTP') ? 'Please try again or contact the content team directly.' : msg,
        variant: 'destructive',
      });
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Back bar */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/20">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All articles
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading article…</span>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm">Could not load this article.</p>
          </div>
        )}
        {a && (
          <>
            {/* Title */}
            <h2 className="text-[15px] font-semibold text-foreground leading-snug mb-1">
              {a.title}
            </h2>
            {a.summary && (
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                {a.summary}
              </p>
            )}

            {/* Body */}
            {(a.sections && a.sections.length > 0) ? (
              <div className="space-y-5">
                {a.sections.map((section, i) => (
                  <div key={i}>
                    {a.sections!.length > 1 && (
                      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b">
                        {section.label}
                      </h3>
                    )}
                    <div
                      className={PROSE}
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                  </div>
                ))}
              </div>
            ) : a.body ? (
              <div
                className={PROSE}
                dangerouslySetInnerHTML={{ __html: a.body }}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <FileText className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Body not available</p>
                <p className="text-[12px] text-muted-foreground/60 mt-1">
                  Field permission or unknown body field name.
                </p>
              </div>
            )}

            {/* One-tap step-mismatch report */}
            <div className="mt-5 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 flex items-center gap-2.5">
              <Flag className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              <p className="text-[12px] text-muted-foreground flex-1">
                Step not matching your screen?
              </p>
              {reported ? (
                <span className="text-[11px] font-medium text-[#2F6B3F]">Reported ✓</span>
              ) : (
                <button
                  onClick={() => void sendReport()}
                  disabled={reporting}
                  className="text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                >
                  {reporting ? 'Sending…' : 'Tell us'}
                </button>
              )}
            </div>

            {/* SF link */}
            {a.sfUrl && (
              <a
                href={a.sfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View in Salesforce
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Article list row ──────────────────────────────────────────────────────────

function ArticleRow({
  article,
  visited,
  onClick,
}: {
  article: { id: string; title: string; summary: string | null; lastModifiedDate: string };
  visited: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0 group"
    >
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
          visited ? 'bg-[#E6F0EA]' : 'bg-primary/8'
        }`}>
          {visited
            ? <Eye className="w-3 h-3 text-[#2F6B3F]" />
            : <FileText className="w-3 h-3 text-primary/60" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium leading-snug group-hover:text-primary transition-colors ${
            visited ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {article.title}
          </p>
          {article.summary && (
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
              {article.summary}
            </p>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 flex-shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function HelpPanel() {
  const { helpPanelOpen, setHelpPanelOpen } = useAppContext();
  const [, navigate] = useLocation();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<string>>(getVisitedArticles);

  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Focus search when panel opens; reset to list view
  useEffect(() => {
    if (!helpPanelOpen) return;
    setSelectedArticleId(null);
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [helpPanelOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && helpPanelOpen) {
        if (selectedArticleId) setSelectedArticleId(null);
        else setHelpPanelOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpPanelOpen, selectedArticleId, setHelpPanelOpen]);

  const { data, isLoading, isError } = useHelpArticles(search);
  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  const handleArticleClick = useCallback((id: string) => {
    setSelectedArticleId(id);
    markArticleVisited(id);
    setVisited(getVisitedArticles());
  }, []);

  const handleViewAll = useCallback(() => {
    setHelpPanelOpen(false);
    navigate('/knowledge/sf-articles');
  }, [setHelpPanelOpen, navigate]);

  return (
    <AnimatePresence>
      {helpPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="help-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setHelpPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="help-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[400px] bg-card border-l border-border shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex-shrink-0 border-b border-border bg-card">
              <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground leading-none">Help Guide</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Salesforce Knowledge articles</p>
                  </div>
                </div>
                <button
                  onClick={() => setHelpPanelOpen(false)}
                  title="Close (Esc)"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search — only in list view */}
              {!selectedArticleId && (
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search articles… (3+ chars)"
                      className="w-full h-8 pl-8 pr-3 text-[13px] bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Body ── */}
            {selectedArticleId ? (
              <ArticleDetail
                articleId={selectedArticleId}
                onBack={() => setSelectedArticleId(null)}
              />
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Count + "View all" */}
                {!isLoading && !isError && total > 0 && (
                  <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20">
                    <span className="text-[12px] text-muted-foreground">
                      {total} article{total !== 1 ? 's' : ''}
                      {search.length >= 3 ? ` matching "${search}"` : ''}
                    </span>
                    <button
                      onClick={handleViewAll}
                      className="text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      View all →
                    </button>
                  </div>
                )}

                {/* Article list */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading && (
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading articles…</span>
                    </div>
                  )}
                  {isError && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 px-6 text-center">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <p className="text-sm font-medium">Could not load articles</p>
                      <p className="text-[12px] text-muted-foreground/70">
                        Check that Salesforce is connected in Administration → Integrations.
                      </p>
                    </div>
                  )}
                  {!isLoading && !isError && articles.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2 px-6 text-center">
                      <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                      <p className="text-sm font-medium">
                        {search.length >= 3 ? 'No articles matched your search' : 'No published articles found'}
                      </p>
                      {search.length >= 3 && (
                        <p className="text-[12px] text-muted-foreground/70">Try a shorter or different search term.</p>
                      )}
                    </div>
                  )}
                  {!isLoading && !isError && articles.map(article => (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      visited={visited.has(article.id)}
                      onClick={() => handleArticleClick(article.id)}
                    />
                  ))}
                </div>

                {/* Footer */}
                {!isLoading && !isError && articles.length > 0 && (
                  <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-muted/10">
                    <button
                      onClick={handleViewAll}
                      className="w-full flex items-center justify-center gap-1.5 text-[13px] text-primary hover:text-primary/80 font-medium transition-colors py-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      View all articles in Knowledge Hub
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
