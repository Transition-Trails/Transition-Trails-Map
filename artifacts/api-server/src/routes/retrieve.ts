/**
 * POST /api/penny/retrieve
 * Keyword-relevance retrieval over the in-memory knowledge corpus.
 * Returns top-N chunks relevant to the query, filtered by user tier.
 */
import { Router } from "express";
import { KNOWLEDGE_CORPUS, filterByTier, type KnowledgeChunk } from "../data/knowledgeCorpus";

const router = Router();

// ── Stop-words to ignore when scoring ────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'and','or','but','so','for','nor','yet','both','either','neither','not',
  'in','on','at','to','from','with','by','of','as','into','through',
  'i','me','my','we','our','you','your','it','its','this','that','these','those',
  'what','which','who','how','when','where','why','there','here',
  'about','about','more','some','any','all','each','every','no','same',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

// ── Relevance scorer ──────────────────────────────────────────────────────────

interface ScoredChunk {
  chunk: KnowledgeChunk;
  score: number;
}

function scoreChunks(query: string, chunks: KnowledgeChunk[]): ScoredChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  return chunks.map(chunk => {
    const nameTokens    = tokenize(chunk.name);
    const searchTokens  = tokenize(chunk.searchText);
    const snippetTokens = tokenize(chunk.snippet);
    const catTokens     = tokenize(chunk.category);

    let score = 0;

    for (const term of terms) {
      // Exact name match — highest weight
      if (nameTokens.includes(term))    score += 4;
      // Partial name match
      if (chunk.name.toLowerCase().includes(term)) score += 2;
      // Category match
      if (catTokens.includes(term))     score += 2;
      // Snippet match (key visible text)
      const snippetCount = snippetTokens.filter(t => t === term).length;
      score += snippetCount * 1.5;
      // Full search text match
      const searchCount  = searchTokens.filter(t => t === term).length;
      score += searchCount * 0.8;
    }

    // Boost confirmed documents
    if (chunk.confidence === 'confirmed') score *= 1.2;
    // Slight boost for curriculum + Salesforce sources (domain-grounded)
    if (chunk.sourceType === 'curriculum' || chunk.sourceType === 'salesforce-kb') score *= 1.1;

    return { chunk, score };
  });
}

// ── POST /api/penny/retrieve ───────────────────────────────────────────────────

interface RetrieveBody {
  query?: unknown;
  userTier?: unknown;
  topN?: unknown;
}

export interface RetrievedSource {
  id: string;
  name: string;
  category: string;
  sourceType: string;
  confidence: string;
  snippet: string;
  relevance: number; // 0–1 normalised
  driveUrl?: string;
}

router.post("/penny/retrieve", (req, res) => {
  const { query, userTier, topN } = req.body as RetrieveBody;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'query is required' });
  }
  if (query.length > 1000) {
    return res.status(400).json({ error: 'query must be 1000 characters or fewer' });
  }

  const tier = typeof userTier === 'string' ? userTier : undefined;
  const n    = typeof topN    === 'number'  ? Math.min(topN, 6) : 3;

  const eligible = filterByTier(KNOWLEDGE_CORPUS, tier);
  const scored   = scoreChunks(query.trim(), eligible)
    .filter(s => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);

  if (scored.length === 0) {
    return res.json({ sources: [] });
  }

  const maxScore = scored[0]!.score;

  const sources: RetrievedSource[] = scored.map(({ chunk, score }) => ({
    id:         chunk.id,
    name:       chunk.name,
    category:   chunk.category,
    sourceType: chunk.sourceType,
    confidence: chunk.confidence,
    snippet:    chunk.snippet,
    relevance:  Math.round((score / maxScore) * 100) / 100,
    driveUrl:   chunk.driveUrl,
  }));

  return res.json({ sources });
});

export default router;
