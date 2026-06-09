import { Brain, Layers, MessageSquare, Users, BarChart2, Activity, Map, FlaskConical, GitBranch, Puzzle } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import PennyWorkspace        from '@/pages/penny/PennyWorkspace';
import PennyPromptStudio     from '@/pages/penny/PennyPromptStudio';
import Learners              from '@/pages/penny/Learners';
import Intelligence          from '@/pages/penny/Intelligence';
import TrailOSPenny          from '@/pages/TrailOSPenny';
import PennyHealth           from '@/pages/operations/PennyHealth';
import TestPenny             from '@/pages/penny/TestPenny';
import PennyIntegrationLayer from '@/pages/penny/PennyIntegrationLayer';

const HUB_ACTIONS: ActionItem[] = [
  { id: 'test',          label: 'Test Penny',         icon: FlaskConical, href: '/penny/test',          variant: 'primary'   },
  { id: 'intelligence',  label: 'View Intelligence',  icon: BarChart2,    href: '/penny/intelligence',  variant: 'secondary' },
  { id: 'trail-os-map',  label: 'Trail OS Map',       icon: Map,          href: '/penny/trail-os-map',  variant: 'secondary' },
  { id: 'health',        label: 'Penny Health',       icon: Activity,     href: '/penny/health',        variant: 'secondary' },
  { id: 'relationships', label: 'View Relationships', icon: GitBranch,    href: '/digital-twin/relationships', variant: 'secondary' },
];

export default function PennyHub() {
  return (
    <HubShell
      title="Penny"
      icon={Brain}
      description="Select a capability to explore its prompts, knowledge sources, quality metrics, and health. Use Prompt Studio, Learners, Intelligence, and Test tabs for cross-capability views."
      actions={HUB_ACTIONS}
      tabs={[
        { id: 'capabilities', label: 'Capabilities',  path: '/penny',               icon: Layers,        content: <PennyWorkspace /> },
        { id: 'prompts',      label: 'Prompt Studio', path: '/penny/prompts',       icon: MessageSquare, content: <PennyPromptStudio /> },
        { id: 'learners',     label: 'Learners',      path: '/penny/learners',      icon: Users,         content: <Learners /> },
        { id: 'intelligence', label: 'Intelligence',  path: '/penny/intelligence',  icon: BarChart2,     content: <Intelligence /> },
        { id: 'trail-os-map', label: 'Trail OS Map',  path: '/penny/trail-os-map',  icon: Map,           content: <TrailOSPenny /> },
        { id: 'health',       label: 'Health',        path: '/penny/health',        icon: Activity,      content: <PennyHealth /> },
        { id: 'test',             label: 'Test Penny',       path: '/penny/test',             icon: FlaskConical,  content: <TestPenny /> },
        { id: 'integration-layer',label: 'POC Integrations', path: '/penny/integration-layer',icon: Puzzle,        content: <PennyIntegrationLayer /> },
      ]}
    />
  );
}
