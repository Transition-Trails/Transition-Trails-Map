import { useState } from 'react';
import { Brain, Layers, MessageSquare, Users, BarChart2, Activity, Map, FlaskConical, GitBranch, Puzzle, Plus } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { CreatePanel } from '@/components/workspace/CreatePanel';
import PennyWorkspace        from '@/pages/penny/PennyWorkspace';
import PennyPromptStudio     from '@/pages/penny/PennyPromptStudio';
import Learners              from '@/pages/penny/Learners';
import Intelligence          from '@/pages/penny/Intelligence';
import TrailOSPenny          from '@/pages/TrailOSPenny';
import PennyHealth           from '@/pages/operations/PennyHealth';
import TestPenny             from '@/pages/penny/TestPenny';
import PennyIntegrationLayer from '@/pages/penny/PennyIntegrationLayer';

export default function PennyHub() {
  const [createMode, setCreateMode] = useState<'prompt' | 'capability' | null>(null);

  if (createMode === 'prompt') {
    return (
      <CreatePanel
        title="New Prompt Template"
        objectType="Prompt Template"
        subtitle="Define how Penny thinks, retrieves, and responds. New templates appear in Prompt Studio with Draft status."
        fields={[
          { id: 'name',       label: 'Template Name', type: 'text',     required: true, placeholder: 'e.g. Goal-Setting Coaching Prompt' },
          { id: 'domain',     label: 'Domain',        type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
          { id: 'purpose',    label: 'Purpose',       type: 'textarea', placeholder: 'Describe what this prompt does and when Penny should use it...', rows: 3 },
          { id: 'promptBody', label: 'Prompt Body',   type: 'textarea', placeholder: 'Write the prompt instructions. Use {{variable_name}} for dynamic tokens.', rows: 6 },
          { id: 'tone',       label: 'Tone & Style',  type: 'text',     placeholder: 'e.g. Empathetic and direct. Focus on action.' },
          { id: 'guardrails', label: 'Guardrails',    type: 'textarea', placeholder: 'Constraints: never recommend specific employers...', rows: 3 },
        ]}
        onClose={() => setCreateMode(null)}
        onSaveDraft={() => setCreateMode(null)}
        onSaveAndView={() => setCreateMode(null)}
      />
    );
  }

  if (createMode === 'capability') {
    return (
      <CreatePanel
        title="New Penny Capability"
        objectType="Penny Capability"
        subtitle="Register a new Penny AI capability. It will appear in the Capability Registry with Draft/Planned status."
        fields={[
          { id: 'name',        label: 'Capability Name', type: 'text',     required: true, placeholder: 'e.g. Salary Negotiation Coach' },
          { id: 'domain',      label: 'Domain',          type: 'select',   options: ['Coaching', 'Career', 'Learning', 'Knowledge', 'Operations', 'Communications', 'Questing'], required: true },
          { id: 'description', label: 'Description',     type: 'textarea', placeholder: 'What does this capability do for learners?', rows: 3 },
          { id: 'trigger',     label: 'When to Use',     type: 'textarea', placeholder: 'Describe the context in which Penny should invoke this capability...', rows: 3 },
          { id: 'maturity',    label: 'Maturity',        type: 'select',   options: ['Concept', 'Planned', 'In Development', 'POC Ready', 'Live'] },
        ]}
        onClose={() => setCreateMode(null)}
        onSaveDraft={() => setCreateMode(null)}
        onSaveAndView={() => setCreateMode(null)}
      />
    );
  }

  const HUB_ACTIONS: ActionItem[] = [
    { id: 'new-prompt',      label: 'New Prompt Template', icon: Plus,        onClick: () => setCreateMode('prompt'),      variant: 'primary'   },
    { id: 'new-capability',  label: 'New Capability',      icon: Brain,       onClick: () => setCreateMode('capability'),  variant: 'secondary' },
    { id: 'test',            label: 'Test Penny',          icon: FlaskConical,href: '/penny/test',                         variant: 'secondary' },
    { id: 'intelligence',    label: 'View Intelligence',   icon: BarChart2,   href: '/penny/intelligence',                 variant: 'secondary' },
    { id: 'health',          label: 'Penny Health',        icon: Activity,    href: '/penny/health',                       variant: 'secondary' },
    { id: 'relationships',   label: 'View Relationships',  icon: GitBranch,   href: '/digital-twin/relationships',         variant: 'secondary' },
  ];

  return (
    <HubShell
      title="Penny"
      icon={Brain}
      description="Select a capability to explore its prompts, knowledge sources, quality metrics, and health. Use Prompt Studio, Learners, Intelligence, and Test tabs for cross-capability views."
      actions={HUB_ACTIONS}
      tabs={[
        { id: 'capabilities',    label: 'Capabilities',    path: '/penny',                  icon: Layers,        content: <PennyWorkspace /> },
        { id: 'prompts',         label: 'Prompt Studio',   path: '/penny/prompts',          icon: MessageSquare, content: <PennyPromptStudio /> },
        { id: 'learners',        label: 'Learners',        path: '/penny/learners',         icon: Users,         content: <Learners /> },
        { id: 'intelligence',    label: 'Intelligence',    path: '/penny/intelligence',     icon: BarChart2,     content: <Intelligence /> },
        { id: 'trail-os-map',    label: 'Trail OS Map',    path: '/penny/trail-os-map',     icon: Map,           content: <TrailOSPenny /> },
        { id: 'health',          label: 'Health',          path: '/penny/health',           icon: Activity,      content: <PennyHealth /> },
        { id: 'test',            label: 'Test Penny',      path: '/penny/test',             icon: FlaskConical,  content: <TestPenny /> },
        { id: 'integration-layer', label: 'POC Integrations', path: '/penny/integration-layer', icon: Puzzle,    content: <PennyIntegrationLayer /> },
      ]}
    />
  );
}
