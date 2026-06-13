import {
  Brain, Layers, MessageSquare, Users, BarChart2,
  Activity, GitBranch, Plus, Sparkles, LayoutDashboard,
  Star, ClipboardCheck, Bot,
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
import PennyCommandCenter    from '@/pages/penny/PennyCommandCenter';
import TestPenny             from '@/pages/penny/TestPenny';
import TrailQuests           from '@/pages/penny/TrailQuests';
import Assessments           from '@/pages/penny/Assessments';
import AgentforceCenter      from '@/pages/penny/AgentforceCenter';

export default function PennyHub() {
  const { openActionPanel, setRightPanelOpen } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const HUB_ACTIONS: ActionItem[] = !isEveryday ? [
    {
      id: 'review-readiness',
      label: 'Review Readiness',
      icon: Activity,
      variant: 'primary' as const,
      href: '/penny/health',
    },
    {
      id: 'view-relationships',
      label: 'View Relationships',
      icon: GitBranch,
      variant: 'secondary' as const,
      href: '/digital-twin',
    },
    {
      id: 'ask-penny',
      label: 'Ask Penny',
      icon: Sparkles,
      variant: 'secondary' as const,
      onClick: () => setRightPanelOpen(true),
    },
    ...(isAdminOrAbove ? [
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
      {
        id: 'new-prompt',
        label: 'New Prompt Template',
        icon: Plus,
        variant: 'secondary' as const,
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
    ] : []),
  ] : [];

  const TABS = [
    ...(!isEveryday ? [
      { id: 'overview',      label: 'Command Center', path: '/penny',              icon: LayoutDashboard, content: <PennyCommandCenter /> },
      { id: 'capabilities',  label: 'Capabilities',   path: '/penny/capabilities', icon: Layers,          content: <PennyWorkspace /> },
      { id: 'prompts',       label: 'Prompt Studio',  path: '/penny/prompts',      icon: MessageSquare,   content: <PennyPromptStudio /> },
    ] : []),
    { id: 'learners', label: isEveryday ? 'My Learners' : 'Learners', path: '/penny/learners', icon: Users, content: <Learners /> },
    ...(!isEveryday ? [
      { id: 'trail-quests', label: 'Trail Quests',  path: '/penny/trail-quests',  icon: Star,          content: <TrailQuests /> },
      { id: 'assessments',  label: 'Assessments',   path: '/penny/assessments',   icon: ClipboardCheck, content: <Assessments /> },
      { id: 'agentforce',   label: 'Agentforce',    path: '/penny/agentforce',    icon: Bot,           content: <AgentforceCenter /> },
      { id: 'intelligence', label: 'Intelligence',  path: '/penny/intelligence',  icon: BarChart2,     content: <Intelligence /> },
      { id: 'health',       label: 'Health',        path: '/penny/health',        icon: Activity,      content: <PennyHealth /> },
      { id: 'test',         label: 'Ask Penny',     path: '/penny/test',          icon: Sparkles,      content: <TestPenny /> },
    ] : []),
  ];

  return (
    <HubShell
      title="Penny"
      icon={Brain}
      description={
        isEveryday
          ? 'Your learners and Penny AI coaching support. Ask Penny anything in the right panel.'
          : 'Monitor Penny AI status, explore capabilities and prompts, track learner coaching, and ask Penny anything. Trail Quests, Assessments, and Agentforce are live (Sprint 4).'
      }
      actions={HUB_ACTIONS}
      tabs={TABS}
    />
  );
}
