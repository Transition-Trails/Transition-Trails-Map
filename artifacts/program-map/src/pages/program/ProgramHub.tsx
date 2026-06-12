import {
  GraduationCap, LayoutGrid, Star, Plus, LayoutDashboard,
} from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import type { ActionItem } from '@/components/workspace/ActionBar';
import { useAppContext } from '@/context/AppContext';
import { useTierFlags } from '@/hooks/useTierFlags';
import ProgramOverview  from '@/pages/program/ProgramOverview';
import ProgramWorkspace from '@/pages/program/ProgramWorkspace';
import StandardsStudio  from '@/pages/curriculum/StandardsStudio';
import ProgramBlueprint from '@/pages/curriculum/ProgramBlueprint';

export default function ProgramHub() {
  const { openActionPanel } = useAppContext();
  const { isEveryday, isAdminOrAbove } = useTierFlags();

  const HUB_ACTIONS: ActionItem[] = !isEveryday ? [{
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
  }] : [];

  const ALL_TABS = [
    {
      id: 'overview',
      label: 'Overview',
      path: '/program',
      icon: LayoutDashboard,
      content: <ProgramOverview />,
    },
    {
      id: 'programs',
      label: isEveryday ? 'My Programs' : 'Programs',
      path: '/program/programs',
      icon: LayoutGrid,
      content: <ProgramWorkspace />,
    },
    ...(!isEveryday ? [{
      id: 'standards', label: 'Standards', path: '/program/standards',
      icon: Star, content: <StandardsStudio />,
    }] : []),
    ...(isAdminOrAbove ? [
      { id: 'blueprint', label: 'Blueprint', path: '/program/blueprint', icon: LayoutGrid, content: <ProgramBlueprint /> },
    ] : []),
  ];

  return (
    <HubShell
      title={isEveryday ? 'Programs' : 'Program & Curriculum'}
      icon={GraduationCap}
      description={
        isEveryday
          ? 'Your active programs, upcoming sessions, curriculum, and Penny support.'
          : 'Program health, blueprint coverage, Penny readiness, and standards status — explore the full program suite, standards rulebook, and cross-program blueprint canvas.'
      }
      actions={HUB_ACTIONS}
      tabs={ALL_TABS}
    />
  );
}
