import { useState } from 'react';
import { GraduationCap, LayoutGrid, Star, Database, FolderOpen, Activity, GitBranch, Network, CheckSquare, Plus } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { CreatePanel } from '@/components/workspace/CreatePanel';
import ProgramWorkspace         from '@/pages/program/ProgramWorkspace';
import StandardsStudio          from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint         from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping        from '@/pages/curriculum/SalesforceMapping';
import SalesforceValidationCenter from '@/pages/curriculum/SalesforceValidationCenter';
import ProgramResources         from '@/pages/admin/ProgramResources';

export default function ProgramHub() {
  const [createMode, setCreateMode] = useState(false);

  if (createMode) {
    return (
      <CreatePanel
        title="New Program"
        objectType="Program"
        subtitle="Create a new Transition Trails learning program. It will be assigned Draft status and appear in the Programs workspace."
        fields={[
          { id: 'name',        label: 'Program Name',    type: 'text',     required: true, placeholder: 'e.g. Digital Literacy Trail' },
          { id: 'audience',    label: 'Target Audience', type: 'text',     required: true, placeholder: 'e.g. Adult job seekers, career changers' },
          { id: 'format',      label: 'Format',          type: 'select',   options: ['Cohort-based', 'Self-paced', 'Hybrid', 'Workshop Series', 'Bootcamp'] },
          { id: 'duration',    label: 'Duration',        type: 'text',     placeholder: 'e.g. 8 weeks, 3 months' },
          { id: 'coreOutcome', label: 'Core Outcome',    type: 'textarea', placeholder: 'What will learners be able to do after completing this program?', rows: 3 },
          { id: 'summary',     label: 'Executive Summary', type: 'textarea', placeholder: 'Brief description of the program purpose and strategic role...', rows: 3 },
        ]}
        onClose={() => setCreateMode(false)}
        onSaveDraft={() => setCreateMode(false)}
        onSaveAndView={() => setCreateMode(false)}
      />
    );
  }

  const HUB_ACTIONS: ActionItem[] = [
    { id: 'create-program', label: 'Create Program',    icon: Plus,      onClick: () => setCreateMode(true),         variant: 'primary'   },
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
