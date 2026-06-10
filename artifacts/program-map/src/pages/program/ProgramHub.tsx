import {
  GraduationCap, LayoutGrid, Star, Database, FolderOpen,
  Activity, GitBranch, Network, CheckSquare, Plus, Hash,
} from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import ProgramWorkspace          from '@/pages/program/ProgramWorkspace';
import StandardsStudio           from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint          from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping         from '@/pages/curriculum/SalesforceMapping';
import SalesforceValidationCenter from '@/pages/curriculum/SalesforceValidationCenter';
import ProgramResources          from '@/pages/admin/ProgramResources';

export default function ProgramHub() {
  const { openActionPanel, openSlackPanel } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const HUB_ACTIONS: ActionItem[] = [
    ...(!isEveryday ? [{
      id: 'create-program', label: 'Create Program', icon: Plus, variant: 'primary' as const,
      onClick: () => openActionPanel({
        title: 'New Program', objectType: 'Program',
        subtitle: 'Create a new Transition Trails learning program. Assigned Draft status.',
        slackContext: 'program',
        fields: [
          { id: 'name',        label: 'Program Name',    type: 'text',     required: true, placeholder: 'e.g. Digital Literacy Trail' },
          { id: 'audience',    label: 'Target Audience', type: 'text',     required: true, placeholder: 'e.g. Adult job seekers, career changers' },
          { id: 'format',      label: 'Format',          type: 'select',   options: ['Cohort-based', 'Self-paced', 'Hybrid', 'Workshop Series', 'Bootcamp'] },
          { id: 'duration',    label: 'Duration',        type: 'text',     placeholder: 'e.g. 8 weeks, 3 months' },
          { id: 'coreOutcome', label: 'Core Outcome',    type: 'textarea', placeholder: 'What will learners be able to do?', rows: 3 },
          { id: 'summary',     label: 'Summary',         type: 'textarea', placeholder: 'Brief description of the program purpose…', rows: 3 },
        ],
      }),
    }] : []),
    {
      id: 'slack-context', label: isEveryday ? 'Program Signals' : 'Slack Context',
      icon: Hash, variant: 'secondary' as const,
      onClick: () => openSlackPanel({ context: 'program', title: 'Program Channels', subtitle: 'Cohort channels, Trail Talk threads, and program Slack activity.' }),
    },
    ...(!isEveryday ? [{
      id: 'health', label: 'Run Health Check', icon: Activity,
      href: '/operations/health', variant: 'secondary' as const,
    }] : []),
    ...(isAdminOrAbove ? [
      { id: 'digital-twin',  label: 'Open Digital Twin',   icon: Network,    href: '/digital-twin/programs',        variant: 'secondary' as const },
      { id: 'relationships', label: 'View Relationships',  icon: GitBranch,  href: '/digital-twin/relationships',   variant: 'secondary' as const },
      { id: 'standards',     label: 'Review Standards',    icon: Star,       href: '/program/standards',            variant: 'secondary' as const },
    ] : []),
  ];

  const ALL_TABS = [
    {
      id: 'programs',
      label: isEveryday ? 'My Programs' : 'Programs',
      path: '/program',
      icon: LayoutGrid,
      content: <ProgramWorkspace />,
    },
    ...(!isEveryday ? [{
      id: 'standards', label: 'Standards', path: '/program/standards',
      icon: Star, content: <StandardsStudio />,
    }] : []),
    ...(isAdminOrAbove ? [
      { id: 'blueprint',     label: 'Blueprint',      path: '/program/blueprint',     icon: LayoutGrid,  content: <ProgramBlueprint /> },
      { id: 'salesforce',    label: 'Salesforce Arch',path: '/program/salesforce',    icon: Database,    content: <SalesforceMapping /> },
      { id: 'sf-validation', label: 'SF Validation',  path: '/program/sf-validation', icon: CheckSquare, content: <SalesforceValidationCenter /> },
    ] : []),
    ...(!isEveryday ? [{
      id: 'resources', label: 'Resources', path: '/program/resources',
      icon: FolderOpen, content: <ProgramResources />,
    }] : []),
  ];

  return (
    <HubShell
      title={isEveryday ? 'Programs' : 'Program & Curriculum'}
      icon={GraduationCap}
      description={
        isEveryday
          ? 'Your active programs, upcoming sessions, curriculum, and Penny support.'
          : 'Select a program to explore its blueprint alignment, curriculum, Penny integration, systems, and health. Use Standards and Blueprint tabs for cross-program reference content.'
      }
      actions={HUB_ACTIONS}
      tabs={ALL_TABS}
    />
  );
}
