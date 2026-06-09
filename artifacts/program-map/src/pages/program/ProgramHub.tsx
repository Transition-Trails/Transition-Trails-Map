import { GraduationCap, Map, BookOpen, LayoutGrid, Database, FolderOpen, Star } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import ProgramMap       from '@/pages/ProgramMap';
import CurriculumPrograms  from '@/pages/curriculum/CurriculumPrograms';
import CurriculumOverview  from '@/pages/curriculum/CurriculumOverview';
import StandardsStudio     from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint    from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping   from '@/pages/curriculum/SalesforceMapping';
import ProgramResources    from '@/pages/admin/ProgramResources';

export default function ProgramHub() {
  return (
    <HubShell
      title="Program & Curriculum"
      icon={GraduationCap}
      description="Program canvas, curriculum design, design standards, blueprints, Salesforce architecture, and program resources — all in one workspace."
      tabs={[
        { id: 'map',        label: 'Program Map',        path: '/program',              icon: Map,       content: <ProgramMap /> },
        { id: 'programs',   label: 'Programs',           path: '/program/programs',     icon: LayoutGrid,content: <CurriculumPrograms /> },
        { id: 'curriculum', label: 'Curriculum',         path: '/program/curriculum',   icon: BookOpen,  content: <CurriculumOverview /> },
        { id: 'standards',  label: 'Standards',          path: '/program/standards',    icon: Star,      content: <StandardsStudio /> },
        { id: 'blueprint',  label: 'Program Blueprint',  path: '/program/blueprint',    icon: LayoutGrid,content: <ProgramBlueprint /> },
        { id: 'salesforce', label: 'Salesforce Arch',    path: '/program/salesforce',   icon: Database,  content: <SalesforceMapping /> },
        { id: 'resources',  label: 'Resources',          path: '/program/resources',    icon: FolderOpen,content: <ProgramResources /> },
      ]}
    />
  );
}
