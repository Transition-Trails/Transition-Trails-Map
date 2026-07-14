import { useLocation } from 'wouter';
import ProgramOverview  from '@/pages/program/ProgramOverview';
import ProgramWorkspace from '@/pages/program/ProgramWorkspace';
import StandardsStudio  from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint from '@/pages/curriculum/ProgramBlueprint';

export default function ProgramHub() {
  const [location] = useLocation();
  if (location.startsWith('/program/blueprint')) return <ProgramBlueprint />;
  if (location.startsWith('/program/standards'))  return <StandardsStudio />;
  if (location.startsWith('/program/programs'))   return <ProgramWorkspace />;
  return <ProgramOverview />;
}
