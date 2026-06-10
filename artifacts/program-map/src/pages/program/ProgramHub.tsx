import { GraduationCap, LayoutGrid, Star, Database, FolderOpen, Activity, GitBranch, Network, CheckSquare, Plus, Hash } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { useAppContext } from '@/context/AppContext';
import ProgramWorkspace         from '@/pages/program/ProgramWorkspace';
import StandardsStudio          from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint         from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping        from '@/pages/curriculum/SalesforceMapping';
import SalesforceValidationCenter from '@/pages/curriculum/SalesforceValidationCenter';
import ProgramResources         from '@/pages/admin/ProgramResources';

export default function ProgramHub() {
  const { openActionPanel, openSlackPanel } = useAppContext();

  const HUB_ACTIONS: ActionItem[] = [
    { id: 'create-program', label: 'Create Program', icon: Plus, variant: 'primary', onClick: () => openActionPanel({
        title: 'New Program', objectType: 'Program',
        subtitle: 'Create a new Transition Trails learning program. Assigned Draft status.',
        slackContext: 'program',
        fields: [
          { id: 'name',        label: 'Program Name',      type: 'text',     required: true, placeholder: 'e.g. Digital Literacy Trail' },
          { id: 'audience',    label: 'Target Audience',   type: 'text',     required: true, placeholder: 'e.g. Adult job seekers, career changers' },
          { id: 'format',      label: 'Format',            type: 'select',   options: ['Cohort-based', 'Self-paced', 'Hybrid', 'Workshop Series', 'Bootcamp'] },
          { id: 'duration',    label: 'Duration',          type: 'text',     placeholder: 'e.g. 8 weeks, 3 months' },
          { id: 'coreOutcome', label: 'Core Outcome',      type: 'textarea', placeholder: 'What will learners be able to do?', rows: 3 },
          { id: 'summary',     label: 'Executive Summary', type: 'textarea', placeholder: 'Brief description of the program purpose…', rows: 3 },
        ],
      })
    },
    { id: 'slack-context',  label: 'Slack Context',     icon: Hash,      variant: 'secondary', onClick: () => openSlackPanel({ context: 'program', title: 'Program Channels', subtitle: 'Cohort channels, Trail Talk threads, and program Slack activity.' }) },
    { id: 'health',         label: 'Run Health Check',  icon: Activity,  href: '/operations/health',                 variant: 'secondary' },
    { id: 'digital-twin',   label: 'Open Digital Twin', icon: Network,   href: '/digital-twin/programs',             variant: 'secondary' },
    { id: 'relationships',  label: 'View Relationships',icon: GitBranch, href: '/digital-twin/relationships',        variant: 'secondary' },
    { id: 'standards',      label: 'Review Standards',  icon: Star,      href: '/program/standards',                 variant: 'secondary' },
  ];

  return (
    <HubShell
      title="Program & Curriculum"
      icon={GraduationCap}
      description="Select a program to explore its blueprint alignment, curriculum, Penny integration, systems, and health. Use Standards and Blueprint tabs for cross-program reference content."
      actions={HUB_ACTIONS}
      tabs={[
        { id: 'programs',      label: 'Programs',        path: '/program',                icon: LayoutGrid,  content: <ProgramWorkspace /> },
        { id: 'standards',     label: 'Standards',       path: '/program/standards',      icon: Star,        content: <StandardsStudio /> },
        { id: 'blueprint',     label: 'Blueprint',       path: '/program/blueprint',      icon: LayoutGrid,  content: <ProgramBlueprint /> },
        { id: 'salesforce',    label: 'Salesforce Arch', path: '/program/salesforce',     icon: Database,    content: <SalesforceMapping /> },
        { id: 'sf-validation', label: 'SF Validation',   path: '/program/sf-validation',  icon: CheckSquare, content: <SalesforceValidationCenter /> },
        { id: 'resources',     label: 'Resources',       path: '/program/resources',      icon: FolderOpen,  content: <ProgramResources /> },
      ]}
    />
  );
}
