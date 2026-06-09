import { Brain, Layers, MessageSquare, Users, BarChart2, Activity, Map, FlaskConical } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import PennyWorkspace   from '@/pages/penny/PennyWorkspace';
import PennyPromptStudio from '@/pages/penny/PennyPromptStudio';
import Learners          from '@/pages/penny/Learners';
import Intelligence      from '@/pages/penny/Intelligence';
import TrailOSPenny      from '@/pages/TrailOSPenny';
import PennyHealth       from '@/pages/operations/PennyHealth';
import TestPenny         from '@/pages/penny/TestPenny';

export default function PennyHub() {
  return (
    <HubShell
      title="Penny"
      icon={Brain}
      description="Select a capability to explore its prompts, knowledge sources, quality metrics, and health. Use Prompt Studio, Learners, Intelligence, and Test tabs for cross-capability views."
      tabs={[
        { id:'capabilities', label:'Capabilities',  path:'/penny',               icon:Layers,        content:<PennyWorkspace /> },
        { id:'prompts',      label:'Prompt Studio', path:'/penny/prompts',       icon:MessageSquare, content:<PennyPromptStudio /> },
        { id:'learners',     label:'Learners',      path:'/penny/learners',      icon:Users,         content:<Learners /> },
        { id:'intelligence', label:'Intelligence',  path:'/penny/intelligence',  icon:BarChart2,     content:<Intelligence /> },
        { id:'trail-os-map', label:'Trail OS Map',  path:'/penny/trail-os-map',  icon:Map,           content:<TrailOSPenny /> },
        { id:'health',       label:'Health',        path:'/penny/health',        icon:Activity,      content:<PennyHealth /> },
        { id:'test',         label:'Test Penny',    path:'/penny/test',          icon:FlaskConical,  content:<TestPenny /> },
      ]}
    />
  );
}
