import { PageShell } from '@/components/platform/PageShell';
export default function LibrarySearch() {
  return (
    <PageShell
      section="Knowledge Library"
      title="Search"
      badge="future-state"
      subtitle="Full-text search across all source documents, Salesforce Knowledge articles, templates, and program materials."
      integration="Salesforce search API + Google Drive indexing"
    />
  );
}
