import { GraduationCap, LayoutGrid, Star, Database, FolderOpen, Activity, GitBranch, Network, CheckSquare } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import ProgramWorkspace         from '@/pages/program/ProgramWorkspace';
import StandardsStudio          from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint         from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping        from '@/pages/curriculum/SalesforceMapping';
import SalesforceValidationCenter from '@/pages/curriculum/SalesforceValidationCenter';
import ProgramResources         from '@/pages/admin/ProgramResources';

const HUB_ACTIONS: ActionItem[] = [
  { id: 'health',        label: 'Run Health Check',   icon: Activity,  href: '/operations/health',            variant: 'secondary' },
  { id: 'digital-twin',  label: 'Open Digital Twin',  icon: Network,   href: '/digital-twin/programs',        variant: 'secondary' },
  { id: 'relationships', label: 'View Relationships', icon: GitBranch, href: '/digital-twin/relationships',   variant: 'secondary' },
  { id: 'standards',     label: 'Review Standards',   icon: Star,      href: '/program/standards',            variant: 'secondary' },
];

export default function ProgramHub() {
  return (
    <HubShell
      title="Program & Curriculum"
      icon={GraduationCap}
      description="Select a program to explore its blueprint alignment, curriculum, Penny integration, systems, and health. Use Standards and Blueprint tabs for cross-program reference content."
      actions={HUB_ACTIONS}
      tabs={[
        { id: 'programs',   label: 'Programs',        path: '/program',            icon: LayoutGrid, content: <ProgramWorkspace /> },
        { id: 'standards',  label: 'Standards',       path: '/program/standards',  icon: Star,       content: <StandardsStudio /> },
        { id: 'blueprint',  label: 'Blueprint',       path: '/program/blueprint',  icon: LayoutGrid, content: <ProgramBlueprint /> },
        { id: 'salesforce', label: 'Salesforce Arch', path: '/program/salesforce', icon: Database,   content: <SalesforceMapping /> },
        { id: 'sf-validation',label: 'SF Validation',  path: '/program/sf-validation',icon: CheckSquare, content: <SalesforceValidationCenter /> },
        { id: 'resources',    label: 'Resources',      path: '/program/resources',    icon: FolderOpen,  content: <ProgramResources /> },
      ]}
    />
  );
}
