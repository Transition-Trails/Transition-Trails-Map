import {
  Brain, Layers, MessageSquare, Users, BarChart2,
  Activity, GitBranch, Puzzle, Plus,
} from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import PennyWorkspace        from '@/pages/penny/PennyWorkspace';
import PennyPromptStudio     from '@/pages/penny/PennyPromptStudio';
import Learners              from '@/pages/penny/Learners';
import Intelligence          from '@/pages/penny/Intelligence';
import PennyHealth           from '@/pages/operations/PennyHealth';
import PennyIntegrationLayer from '@/pages/penny/PennyIntegrationLayer';

// UI audit rule: Everyday User pages must not have multiple nav/action rows
// above content. Keep ≤ 1 tab row, no ActionBar, and plain-language labels.

export default function PennyHub() {
  const { openActionPanel } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const HUB_ACTIONS: ActionItem[] = [
    ...(!isEveryday ? [
      {
        id: 'new-prompt',
        label: 'New Prompt Template',
        icon: Plus,
        variant: 'primary' as const,
        onClick: () => openActionPanel({
          title: 'New Prompt Template',
          objectType: 'Prompt Template',
          subtitle: 'Define how Penny thinks, retrieves, and responds. Assigned Draft status.',
          slackContext: 'penny',
          fields: [
            { id: 'name',       label: 'Template Name', type: 'text',     required: true, placeholder: 'e.g. Goal-Setting Coaching Prompt' },
            { id: 'domain',     label: 'Domain',        type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
            { id: 'purpose',    label: 'Purpose',       type: 'textarea', placeholder: 'What does this prompt do and when should Penny use it?', rows: 3 },
            { id: 'promptBody', label: 'Prompt Body',   type: 'textarea', placeholder: 'Write the prompt. Use {{variable_name}} for dynamic tokens.', rows: 5 },
            { id: 'tone',       label: 'Tone & Style',  type: 'text',     placeholder: 'e.g. Empathetic and direct.' },
            { id: 'guardrails', label: 'Guardrails',    type: 'textarea', placeholder: 'Constraints: never recommend specific employers…', rows: 3 },
          ],
        }),
      },
      {
        id: 'new-capability',
        label: 'New Capability',
        icon: Brain,
        variant: 'secondary' as const,
        onClick: () => openActionPanel({
          title: 'New Penny Capability',
          objectType: 'Penny Capability',
          subtitle: 'Register a new Penny AI capability. Appears in Capability Registry with Draft/Planned status.',
          slackContext: 'penny',
          fields: [
            { id: 'name',        label: 'Capability Name', type: 'text',     required: true, placeholder: 'e.g. Salary Negotiation Coach' },
            { id: 'domain',      label: 'Domain',          type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
            { id: 'description', label: 'Description',     type: 'textarea', placeholder: 'What does this capability do for learners?', rows: 3 },
            { id: 'trigger',     label: 'When to Use',     type: 'textarea', placeholder: 'Describe the context where Penny should invoke this…', rows: 3 },
            { id: 'maturity',    label: 'Maturity',        type: 'select',   options: ['Concept', 'Planned', 'In Development', 'POC Ready', 'Live'] },
          ],
        }),
      },
      { id: 'intelligence', label: 'View Intelligence',  icon: BarChart2,    href: '/penny/intelligence',         variant: 'secondary' as const },
      { id: 'health',       label: 'Penny Health',       icon: Activity,     href: '/penny/health',               variant: 'secondary' as const },
    ] : []),
    ...(isAdminOrAbove ? [
      { id: 'relationships', label: 'View Relationships', icon: GitBranch, href: '/digital-twin/relationships', variant: 'secondary' as const },
    ] : []),
  ];

  const TABS = [
    ...(!isEveryday ? [
      { id: 'capabilities', label: 'Capabilities',  path: '/penny',             icon: Layers,        content: <PennyWorkspace /> },
      { id: 'prompts',      label: 'Prompt Studio', path: '/penny/prompts',     icon: MessageSquare, content: <PennyPromptStudio /> },
    ] : []),
    { id: 'learners', label: isEveryday ? 'My Learners' : 'Learners', path: '/penny/learners', icon: Users, content: <Learners /> },
    ...(!isEveryday ? [
      { id: 'intelligence', label: 'Intelligence', path: '/penny/intelligence', icon: BarChart2, content: <Intelligence /> },
      { id: 'health',       label: 'Health',       path: '/penny/health',       icon: Activity,  content: <PennyHealth /> },
    ] : []),
    ...(isAdminOrAbove ? [
      { id: 'integration-layer', label: 'POC Integrations', path: '/penny/integration-layer', icon: Puzzle, content: <PennyIntegrationLayer /> },
    ] : []),
  ];

  return (
    <HubShell
      title="Penny"
      icon={Brain}
      description={
        isEveryday
          ? 'Your learners and Penny AI coaching support. Ask Penny anything in the right panel.'
          : 'Select a capability to explore its prompts, knowledge sources, quality metrics, and health. Use Prompt Studio, Learners, Intelligence, and Test tabs for cross-capability views.'
      }
      actions={HUB_ACTIONS}
      tabs={TABS}
    />
  );
}
