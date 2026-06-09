import { GraduationCap, LayoutGrid, Star, Database, FolderOpen } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import ProgramWorkspace    from '@/pages/program/ProgramWorkspace';
import StandardsStudio     from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint    from '@/pages/curriculum/ProgramBlueprint';
import SalesforceMapping   from '@/pages/curriculum/SalesforceMapping';
import ProgramResources    from '@/pages/admin/ProgramResources';

export default function ProgramHub() {
  return (
    <HubShell
      title="Program & Curriculum"
      icon={GraduationCap}
      description="Select a program to explore its blueprint alignment, curriculum, Penny integration, systems, and health. Use Standards and Blueprint tabs for cross-program reference content."
      tabs={[
        { id:'programs',   label:'Programs',          path:'/program',            icon:LayoutGrid,  content:<ProgramWorkspace /> },
        { id:'standards',  label:'Standards',         path:'/program/standards',  icon:Star,        content:<StandardsStudio /> },
        { id:'blueprint',  label:'Blueprint',         path:'/program/blueprint',  icon:LayoutGrid,  content:<ProgramBlueprint /> },
        { id:'salesforce', label:'Salesforce Arch',   path:'/program/salesforce', icon:Database,    content:<SalesforceMapping /> },
        { id:'resources',  label:'Resources',         path:'/program/resources',  icon:FolderOpen,  content:<ProgramResources /> },
      ]}
    />
  );
}
