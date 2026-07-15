import { TERMS } from '@/config/terminology';
import { PageShell } from '@/components/platform/PageShell';
export default function SalesforceKB() {
  return (
    <PageShell
      section="Knowledge Library"
      title="Salesforce Knowledge"
      badge="future-state"
      subtitle={`Published Salesforce Knowledge Articles organized by category. Used by support teams and ${TERMS.aiAssistant} as a response knowledge base.`}
      integration="Salesforce Knowledge API via MCP"
    />
  );
}
