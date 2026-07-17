// Types only — the document data is DB-backed via /api/knowledge/documents.
// See artifacts/api-server/src/routes/knowledge.ts for the seed and CRUD implementation.

export type ConfidenceStatus = 'confirmed' | 'needs-review' | 'draft' | 'deprecated';

export interface SourceDocument {
  id: string;
  entityType: 'document';
  name: string;
  category: string;
  status: 'Active' | 'Draft' | 'Deprecated' | 'Archived';
  confidence: ConfidenceStatus;
  owner: string;
  lastUpdated: string;
  programs: string[];
  summary: string;
  purpose: string;
  quickTake: string;
  keyDecisionsInfluenced: string[];
  sourceOfTruthFor: string[];
  notSourceOfTruthFor: string[];
  keySections: string[];
  relatedDocuments: string[];
  driveUrl?: string;
}
