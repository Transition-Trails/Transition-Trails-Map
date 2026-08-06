/**
 * Object Tracer tabs — migrated from Digital Twin.
 * Exported and consumed by GovernanceHub as investigation/diagnostic tabs.
 *
 * Three tabs:
 *   ExploreTab    — pick an object kind, select an example, browse workspace
 *   MapTab        — radial SVG relationship map for a selected object
 *   ImpactTab     — cascade analysis: "what changes if this object changes?"
 */

import { useState, useMemo } from 'react';
import {
  Network, Brain, BookOpen, Users, Plug, X, ChevronRight, ArrowRight,
  Zap, MapPin, FileText, HardDrive, Calendar, MessageSquare, Database,
  Info, Star, GraduationCap, Search, AlertTriangle, CheckCircle, Shield,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelationshipCard, type RelatedItem } from '@/components/workspace/RelationshipCard';
import { TERMS } from '@/config/terminology';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ObjectKind = 'program' | 'capability' | 'course' | 'role' | 'integration' | 'knowledge';

export interface SelectedObject {
  kind: ObjectKind;
  id: string;
  name: string;
  subtitle: string;
  status: 'active' | 'in-progress' | 'review' | 'planned';
}

interface ObjEntry { id: string; name: string; subtitle: string; status: SelectedObject['status']; }

interface KindConnection {
  system: string;
  label: string;
  count: number;
  color: string;
  href: string;
  detail: string;
  items: RelatedItem[];
}

interface KindConfig {
  icon: React.ReactNode;
  verb: string;
  label: string;
  description: string;
  question: string;
  hexColor: string;
  accent: string;
  bg: string;
  border: string;
  examples: ObjEntry[];
  connections: KindConnection[];
}

interface ImpactArea {
  area: string;
  severity: 'high' | 'medium' | 'low';
  items: string[];
}

// ── Data ──────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SelectedObject['status'], { label: string; cls: string; dot: string }> = {
  active:       { label: 'Active',       cls: 'bg-[#E6F0EA] text-[#2F6B3F] border-[#9FC3AE]',   dot: 'bg-[#2F6B3F]'     },
  'in-progress':{ label: 'In Progress',  cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]',   dot: 'bg-[#CC8400]'     },
  review:       { label: 'Under Review', cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]',   dot: 'bg-[#2F6F7E]'     },
  planned:      { label: 'Planned',      cls: 'bg-muted text-muted-foreground border-border',     dot: 'bg-[#C8CBC6]'     },
};

const SEV_CONFIG = {
  high:   { cls: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]', dot: 'bg-[#A93F2F]'  },
  medium: { cls: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]', dot: 'bg-[#CC8400]'  },
  low:    { cls: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', dot: 'bg-[#2F6F7E]'  },
};

const CATALOG: Record<ObjectKind, KindConfig> = {
  program: {
    icon: <GraduationCap className="w-5 h-5" />,
    verb: 'Explore a Program',
    label: 'Programs',
    description: `Follow a program across curriculum, learners, coaches, Salesforce, ${TERMS.aiAssistant}, and all team workflows.`,
    question: 'What does this program touch?',
    hexColor: '#059669',
    accent: 'text-[#2F6B3F]',
    bg: 'bg-[#E6F0EA]',
    border: 'border-[#9FC3AE]',
    examples: [
      { id: 'guided-trail',  name: 'Guided Trail',       subtitle: 'Cohort-based coaching program',   status: 'active'      },
      { id: 'foundations',   name: 'Foundations Trail',  subtitle: 'Skills-based onboarding path',    status: 'active'      },
      { id: 'explorers',     name: "Explorer's Trail",   subtitle: 'Self-paced discovery program',    status: 'active'      },
      { id: 'mastery',       name: 'Trail of Mastery',   subtitle: 'Advanced practitioner pathway',   status: 'in-progress' },
      { id: 'compass',       name: 'Digital Compass',    subtitle: 'Digital fluency program',         status: 'planned'     },
    ],
    connections: [
      { system: 'Curriculum',    label: '12 courses',      count: 12, color: '#b45309', href: '/program/curriculum', detail: 'Agile Foundations, Growth Mindset, Sprint Cadence, Trail Talks +8',
        items: [{ id:'c1', label:'Agile Foundations', statusColor:'bg-[#2F6B3F]' }, { id:'c2', label:'Growth Mindset', statusColor:'bg-[#2F6B3F]' }, { id:'c3', label:'Sprint Cadence', statusColor:'bg-[#2F6B3F]' }, { id:'c4', label:'Trail Talks', statusColor:'bg-[#2F6B3F]' }, { id:'c5', label:'+8 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Salesforce',    label: 'Program objects', count: 3,  color: '#0369a1', href: '/admin/salesforce-arch', detail: 'Program__c, Program_Engagement__c, Contact',
        items: [{ id:'s1', label:'Program__c', statusColor:'bg-[#2F6F7E]' }, { id:'s2', label:'Program_Engagement__c', statusColor:'bg-[#2F6F7E]' }, { id:'s3', label:'Contact', statusColor:'bg-[#2F6F7E]' }] },
      { system: TERMS.aiAssistant, label: '4 capabilities', count: 4,  color: '#be185d', href: '/penny',           detail: 'Trail Quest, Coach Brief, Sprint Coach, Resume Review',
        items: [{ id:'p1', label:'Trail Quest', statusColor:'bg-[#2F6F7E]' }, { id:'p2', label:'Coach Brief', statusColor:'bg-[#2F6F7E]' }, { id:'p3', label:'Sprint Coach', statusColor:'bg-[#CC8400]' }, { id:'p4', label:'Resume Review', statusColor:'bg-[#2F6F7E]' }] },
      { system: 'Roles',         label: '6 role types',   count: 6,  color: '#1d4ed8', href: '/governance/tracer', detail: 'Coach, Cohort Lead, Content Specialist, Ops Lead, Evaluator, Learner',
        items: [{ id:'r1', label:'Coach', statusColor:'bg-[#2F6F7E]' }, { id:'r2', label:'Cohort Lead', statusColor:'bg-[#2F6F7E]' }, { id:'r3', label:'Content Specialist', statusColor:'bg-[#2F6F7E]' }, { id:'r4', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Knowledge',     label: '8 sources',      count: 8,  color: '#6d28d9', href: '/knowledge',       detail: 'Trail Design Guide, Framework Doc, Standards, Drive Resources',
        items: [{ id:'k1', label:'Trail Design Guide', statusColor:'bg-[#2F6F7E]' }, { id:'k2', label:'Framework Doc', statusColor:'bg-[#2F6F7E]' }, { id:'k3', label:'Curriculum Standards', statusColor:'bg-[#2F6F7E]' }, { id:'k4', label:'+5 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Collaboration', label: 'Slack + Calendar', count: 3, color: '#c2410c', href: '/collaboration', detail: '#guided-trail, Sprint Calendar, Weekly Coach Brief',
        items: [{ id:'cl1', label:'#guided-trail', statusColor:'bg-[#CC8400]' }, { id:'cl2', label:'Sprint Calendar', statusColor:'bg-[#CC8400]' }, { id:'cl3', label:'Coach Brief Digest', statusColor:'bg-[#CC8400]' }] },
    ],
  },
  capability: {
    icon: <Brain className="w-5 h-5" />,
    verb: `Trace a ${TERMS.aiAssistant} Capability`,
    label: `${TERMS.aiAssistant} Capabilities`,
    description: `Map how ${TERMS.aiAssistant} draws on knowledge, prompts, learner context, and Salesforce variables to deliver this capability.`,
    question: 'What does this capability depend on?',
    hexColor: '#be185d',
    accent: 'text-[#A93F2F]',
    bg: 'bg-[#FBEAE6]',
    border: 'border-[#E8B9B4]',
    examples: [
      { id: 'resume-review',  name: `${TERMS.aiAssistant} Resume Review`,   subtitle: 'AI-powered resume feedback engine',   status: 'active'      },
      { id: 'trail-quest',    name: 'Trail Quest',                           subtitle: 'Learner challenge and reward system',  status: 'active'      },
      { id: 'coach-brief',    name: 'Coach Brief Generator',                 subtitle: 'Pre-session coach context brief',      status: 'active'      },
      { id: 'sprint-coach',   name: 'Sprint Coach',                          subtitle: 'Sprint retrospective AI facilitator',  status: 'in-progress' },
      { id: 'exec-brief',     name: 'Executive Brief',                       subtitle: 'Program health AI summary',            status: 'planned'     },
    ],
    connections: [
      { system: 'Knowledge Sources', label: '6 sources', count: 6, color: '#6d28d9', href: '/knowledge', detail: 'Program Framework, Trail Design Guide, Salesforce KB, Drive Resources',
        items: [{ id:'k1', label:'Program Framework', statusColor:'bg-[#2F6F7E]' }, { id:'k2', label:'Trail Design Guide', statusColor:'bg-[#2F6F7E]' }, { id:'k3', label:'Salesforce KB', statusColor:'bg-[#2F6F7E]' }, { id:'k4', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Prompt Studio',  label: '10+ templates',  count: 10, color: '#be185d', href: '/penny/prompts', detail: 'Governed prompts for this capability — all require review before activation',
        items: [{ id:'p1', label:'Resume Review v2', statusColor:'bg-[#2F6F7E]' }, { id:'p2', label:'Coach Context', statusColor:'bg-[#2F6F7E]' }, { id:'p3', label:'Quest Framing', statusColor:'bg-[#2F6F7E]' }, { id:'p4', label:'+7 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Salesforce',     label: 'Context vars',   count: 5,  color: '#0369a1', href: '/admin/integrations', detail: 'Learner data, Program__c, Assessment__c context variables injected',
        items: [{ id:'s1', label:'Contact record', statusColor:'bg-[#2F6F7E]' }, { id:'s2', label:'Program__c', statusColor:'bg-[#2F6F7E]' }, { id:'s3', label:'Assessment__c', statusColor:'bg-[#2F6F7E]' }] },
      { system: 'Learners',       label: '8 active',       count: 8,  color: '#059669', href: '/penny/learners', detail: 'Active learner sessions using this capability today',
        items: [{ id:'l1', label:'8 active sessions', statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Programs',       label: '3 programs',     count: 3,  color: '#059669', href: '/program',  detail: 'Guided Trail, Foundations, and Explorer use this capability',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-[#2F6B3F]' }, { id:'pr2', label:'Foundations', statusColor:'bg-[#2F6B3F]' }, { id:'pr3', label:"Explorer's Trail", statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Standards',      label: '2 standards',    count: 2,  color: '#b45309', href: '/program/standards', detail: 'Must pass Content Quality Standard and Coaching Tone Standard',
        items: [{ id:'st1', label:'Content Quality', statusColor:'bg-[#CC8400]' }, { id:'st2', label:'Coaching Tone', statusColor:'bg-[#2F6B3F]' }] },
    ],
  },
  course: {
    icon: <BookOpen className="w-5 h-5" />,
    verb: 'Inspect a Course',
    label: 'Courses',
    description: `See how a course links to assessments, ${TERMS.aiAssistant} reflection prompts, knowledge sources, and the programs that include it.`,
    question: 'What does this course connect to?',
    hexColor: '#b45309',
    accent: 'text-[#CC8400]',
    bg: 'bg-[#FFF3E0]',
    border: 'border-[#FFD08A]',
    examples: [
      { id: 'agile-foundations', name: 'Agile Foundations',  subtitle: 'Sprint fundamentals and ceremonies',   status: 'active'      },
      { id: 'growth-mindset',    name: 'Growth Mindset',      subtitle: 'Resilience and adaptive thinking',    status: 'active'      },
      { id: 'sprint-cadence',    name: 'Sprint Cadence',      subtitle: 'Delivery rhythm and retrospectives',  status: 'active'      },
      { id: 'trail-talks',       name: 'Trail Talks',         subtitle: 'Peer learning and reflection',        status: 'active'      },
      { id: 'digital-fluency',   name: 'Digital Fluency',     subtitle: 'Digital skills for modern work',     status: 'planned'     },
    ],
    connections: [
      { system: 'Assessments',   label: '3 assessments',  count: 3, color: '#b45309', href: '/program/assessments', detail: 'Pre-course, mid-course, and end-of-sprint assessments',
        items: [{ id:'a1', label:'Pre-course', statusColor:'bg-[#2F6F7E]' }, { id:'a2', label:'Mid-sprint', statusColor:'bg-[#2F6B3F]' }, { id:'a3', label:'End of sprint', statusColor:'bg-[#2F6B3F]' }] },
      { system: TERMS.aiAssistant,   label: '6 prompts',      count: 6, color: '#be185d', href: '/penny/prompts', detail: 'Reflection, quest, and retrospective prompts tied to this course',
        items: [{ id:'p1', label:'Reflection prompt', statusColor:'bg-[#2F6F7E]' }, { id:'p2', label:'Quest framing', statusColor:'bg-[#2F6F7E]' }, { id:'p3', label:'Retro facilitation', statusColor:'bg-[#CC8400]' }] },
      { system: 'Knowledge',     label: '5 articles',     count: 5, color: '#6d28d9', href: '/knowledge',   detail: '5 knowledge articles directly linked to this course content',
        items: [{ id:'k1', label:'Sprint Guide', statusColor:'bg-[#2F6B3F]' }, { id:'k2', label:'Agile Reference', statusColor:'bg-[#2F6B3F]' }, { id:'k3', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Programs',      label: '2 programs',     count: 2, color: '#059669', href: '/program',    detail: 'Guided Trail and Foundations include this course',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-[#2F6B3F]' }, { id:'pr2', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Standards',     label: '1 standard',     count: 1, color: '#b45309', href: '/program/standards', detail: 'Content Quality Standard governs this course',
        items: [{ id:'st1', label:'Content Quality Standard', statusColor:'bg-[#2F6F7E]' }] },
      { system: 'Coaches',       label: '3 coaches',      count: 3, color: '#1d4ed8', href: '/penny/learners', detail: '3 active coaches facilitate this course this sprint',
        items: [{ id:'ca1', label:'Weekly check-ins', statusColor:'bg-[#2F6B3F]' }, { id:'ca2', label:'Cohort sessions', statusColor:'bg-[#2F6B3F]' }, { id:'ca3', label:'Retrospectives', statusColor:'bg-[#2F6B3F]' }] },
    ],
  },
  role: {
    icon: <Users className="w-5 h-5" />,
    verb: 'Trace a Role',
    label: 'Roles',
    description: `Map how a role participates in programs, owns objects in Salesforce, triggers ${TERMS.aiAssistant} interactions, and is governed by blueprints.`,
    question: 'What is this role responsible for?',
    hexColor: '#1d4ed8',
    accent: 'text-[#2F6F7E]',
    bg: 'bg-[#EDF5F8]',
    border: 'border-[#7FAFC6]',
    examples: [
      { id: 'coach',             name: 'Coach',              subtitle: 'Learner support and facilitation role',  status: 'active'      },
      { id: 'cohort-lead',       name: 'Cohort Lead',        subtitle: 'Cohort coordination and accountability', status: 'active'      },
      { id: 'content-specialist',name: 'Content Specialist', subtitle: 'Curriculum design and standards review', status: 'active'      },
      { id: 'ops-lead',          name: 'Operations Lead',    subtitle: 'Platform operations and data stewardship', status: 'active'    },
      { id: 'learner',           name: 'Learner',            subtitle: 'Program participant and trail traveller', status: 'active'      },
    ],
    connections: [
      { system: 'Programs',      label: '3 programs',     count: 3, color: '#059669', href: '/program',    detail: 'Active participation in Guided Trail, Foundations, and Explorer',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-[#2F6B3F]' }, { id:'pr2', label:'Foundations', statusColor:'bg-[#2F6B3F]' }, { id:'pr3', label:"Explorer's Trail", statusColor:'bg-[#CC8400]' }] },
      { system: 'Salesforce',    label: 'Ownership',     count: 4, color: '#0369a1', href: '/admin/integrations', detail: 'Owns Program_Engagement__c, Session_Log__c, and related records',
        items: [{ id:'s1', label:'Program_Engagement__c', statusColor:'bg-[#2F6F7E]' }, { id:'s2', label:'TT_Session_Log__c', statusColor:'bg-[#2F6F7E]' }] },
      { system: TERMS.aiAssistant,   label: '2 personas',     count: 2, color: '#be185d', href: '/penny',  detail: `${TERMS.aiAssistant} is configured with role-aware personas for this role`,
        items: [{ id:'p1', label:'Coach persona', statusColor:'bg-[#2F6B3F]' }, { id:'p2', label:'Support mode', statusColor:'bg-[#CC8400]' }] },
      { system: 'Blueprints',    label: '1 blueprint',    count: 1, color: '#b45309', href: '/program/blueprints', detail: 'Role Blueprint defines responsibilities, RACI, and handoff protocols',
        items: [{ id:'b1', label:'Coach Blueprint', statusColor:'bg-[#CC8400]' }] },
      { system: 'Collaboration', label: 'Channels',       count: 3, color: '#c2410c', href: '/collaboration', detail: 'Slack channels, Google Chat spaces, and Calendar events for this role',
        items: [{ id:'cl1', label:'#coach-hub', statusColor:'bg-[#2F6B3F]' }, { id:'cl2', label:'Sprint calendar', statusColor:'bg-[#2F6B3F]' }, { id:'cl3', label:'Coach briefs', statusColor:'bg-[#CC8400]' }] },
      { system: 'Governance',    label: 'Ownership matrix', count: 1, color: '#7c3aed', href: '/governance/ownership', detail: 'Ownership assignments for this role in the governance framework',
        items: [{ id:'g1', label:'Ownership Matrix entry', statusColor:'bg-[#2F6F7E]' }] },
    ],
  },
  integration: {
    icon: <Plug className="w-5 h-5" />,
    verb: 'Analyze an Integration',
    label: 'Integrations',
    description: `Trace how an integration connects to programs, ${TERMS.aiAssistant} context, Salesforce sync, and team communications.`,
    question: 'What depends on this integration being live?',
    hexColor: '#0f766e',
    accent: 'text-[#2F6B3F]',
    bg: 'bg-[#E6F0EA]',
    border: 'border-[#9FC3AE]',
    examples: [
      { id: 'google-drive',     name: 'Google Drive Resources',         subtitle: 'Program content and document source',   status: 'active'  },
      { id: 'slack-penny-ai',   name: `Slack ${TERMS.aiAssistant} Channel`, subtitle: 'Real-time AI learner engagement',  status: 'active'  },
      { id: 'salesforce-pe',    name: 'Salesforce Program Engagement',  subtitle: 'CRM source of record for programs',     status: 'active'  },
      { id: 'google-calendar',  name: 'Google Calendar Events',         subtitle: 'Sprint and cohort scheduling sync',     status: 'active'  },
      { id: 'lms',              name: 'LMS Integration',                subtitle: 'Course completion and progress sync',   status: 'planned' },
    ],
    connections: [
      { system: 'Salesforce',    label: '6 object mappings', count: 6, color: '#0369a1', href: '/admin/integrations', detail: 'Sync fields: Program__c, Contact, Engagement, Assessment',
        items: [{ id:'sf1', label:'Program__c', statusColor:'bg-[#2F6F7E]' }, { id:'sf2', label:'Contact', statusColor:'bg-[#2F6F7E]' }, { id:'sf3', label:'Engagement__c', statusColor:'bg-[#2F6F7E]' }, { id:'sf4', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: TERMS.aiAssistant, label: '3 capabilities',   count: 3, color: '#be185d', href: '/penny',             detail: 'Context variables, notification dispatch, data fetch',
        items: [{ id:'p1', label:'Trail Quest', statusColor:'bg-[#2F6F7E]' }, { id:'p2', label:'Coach Brief', statusColor:'bg-[#2F6F7E]' }, { id:'p3', label:'Resume Review', statusColor:'bg-[#CC8400]' }] },
      { system: 'Programs',      label: '4 programs',       count: 4, color: '#059669', href: '/program',             detail: 'All active programs depend on this integration',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-[#2F6B3F]' }, { id:'pr2', label:'Foundations Trail', statusColor:'bg-[#2F6B3F]' }, { id:'pr3', label:'+2 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Collaboration', label: 'Channels + Spaces', count: 2, color: '#c2410c', href: '/collaboration',     detail: 'Slack adapter, Google Chat space synchronization',
        items: [{ id:'cl1', label:'Slack adapter', statusColor:'bg-[#CC8400]' }, { id:'cl2', label:'Google Chat sync', statusColor:'bg-[#CC8400]' }] },
      { system: 'Learners',      label: 'Data sync',        count: 1, color: '#059669', href: '/penny/learners',      detail: 'Learner records and progress synced via this integration',
        items: [{ id:'l1', label:'Progress sync', statusColor:'bg-[#2F6B3F]' }, { id:'l2', label:'Completion records', statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Calendar',      label: 'Event sync',       count: 1, color: '#0f766e', href: '/collaboration',       detail: 'Sprint and cohort calendar event creation',
        items: [{ id:'ca1', label:'Sprint events', statusColor:'bg-[#2F6B3F]' }, { id:'ca2', label:'Cohort sessions', statusColor:'bg-[#2F6B3F]' }] },
    ],
  },
  knowledge: {
    icon: <FileText className="w-5 h-5" />,
    verb: 'Inspect a Knowledge Source',
    label: 'Knowledge Sources',
    description: `Trace where a knowledge source is cited in ${TERMS.aiAssistant}, which courses it underpins, and whether it is current.`,
    question: 'Where is this source used and is it up to date?',
    hexColor: '#6d28d9',
    accent: 'text-[#2F6F7E]',
    bg: 'bg-[#EDF5F8]',
    border: 'border-[#7FAFC6]',
    examples: [
      { id: 'program-framework',  name: 'Program Framework Doc',   subtitle: 'Core program design principles',   status: 'active'      },
      { id: 'trail-design-guide', name: 'Trail Design Guide',      subtitle: 'Curriculum and trail standards',   status: 'active'      },
      { id: 'salesforce-kb',      name: 'Salesforce KB Articles',  subtitle: 'Knowledge__c object content',      status: 'review'      },
      { id: 'drive-resources',    name: 'Google Drive Resources',  subtitle: '/Trail OS/ folder content',        status: 'in-progress' },
      { id: 'source-registry',    name: 'Source Registry',         subtitle: 'All approved source documents',    status: 'active'      },
    ],
    connections: [
      { system: TERMS.aiAssistant, label: '6 capabilities', count: 6, color: '#be185d', href: '/penny',             detail: 'Referenced in capability prompts and context loading',
        items: [{ id:'p1', label:'Resume Review', statusColor:'bg-[#2F6F7E]' }, { id:'p2', label:'Trail Quest', statusColor:'bg-[#2F6F7E]' }, { id:'p3', label:'Coach Brief', statusColor:'bg-[#2F6F7E]' }, { id:'p4', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Curriculum',    label: '6 modules',      count: 6, color: '#b45309', href: '/program/curriculum', detail: 'Linked to course content and reflection prompts',
        items: [{ id:'c1', label:'Agile Foundations', statusColor:'bg-[#CC8400]' }, { id:'c2', label:'Growth Mindset', statusColor:'bg-[#CC8400]' }, { id:'c3', label:'Trail Talks', statusColor:'bg-[#CC8400]' }, { id:'c4', label:'+3 more', statusColor:'bg-[#C8CBC6]' }] },
      { system: 'Programs',      label: '6 programs',     count: 6, color: '#059669', href: '/program',             detail: 'All active programs reference this source',
        items: [{ id:'pr1', label:'All 6 programs', statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Coaches',       label: 'Required reading', count: 8, color: '#1d4ed8', href: '/governance/tracer', detail: '8 coaches have this in required reading',
        items: [{ id:'co1', label:'8 coaches', statusColor:'bg-[#2F6F7E]' }] },
      { system: 'Drive',         label: 'Source file',    count: 1, color: '#0f766e', href: '/collaboration',      detail: '/Trail OS/Framework — last updated Q1 2025',
        items: [{ id:'d1', label:'Trail OS/Framework', statusColor:'bg-[#2F6B3F]' }] },
      { system: 'Org Memory',    label: '3 decisions',    count: 3, color: '#7c3aed', href: '/knowledge/memory',   detail: '3 decisions cite this source in their rationale',
        items: [{ id:'m1', label:'3 historical decisions', statusColor:'bg-[#2F6F7E]' }] },
    ],
  },
};

const IMPACT_CATALOG: Record<ObjectKind, { headline: string; areas: ImpactArea[] }> = {
  program: {
    headline: 'What cascades if this program changes?',
    areas: [
      { area: 'Curriculum',        severity: 'high',   items: ['All 12 courses need learning objective review', 'Agile Foundations and Growth Mindset directly affected', 'Sprint structure may need realignment', 'Assessment rubrics may need updating'] },
      { area: 'Salesforce',        severity: 'high',   items: ['Program__c record must be updated immediately', 'Program_Engagement__c records cascade', 'Outcome reports and PMM dashboards reflect change', 'Contact relationship records affected'] },
      { area: TERMS.aiAssistant,   severity: 'high',   items: ['Trail Quest context and framing must be reviewed', 'Coach Brief generator references program outcomes', 'Sprint Coach cadence tied to program calendar', 'Resume Review criteria may need updating'] },
      { area: 'Roles & Blueprints', severity: 'medium', items: ['Role participation mappings must be reviewed', 'Coach assignment and capacity may shift', 'Blueprint responsibilities may need revision'] },
      { area: 'Collaboration',     severity: 'medium', items: ['Slack cohort channel configuration affected', 'Calendar sprint events may need updating', 'Welcome and kickoff message templates affected'] },
      { area: 'Knowledge Sources', severity: 'low',    items: ['8 linked sources flagged for review', 'Program Framework Doc may need version update', 'Trail Design Guide alignment check required'] },
    ],
  },
  capability: {
    headline: `What cascades if this ${TERMS.aiAssistant} capability changes?`,
    areas: [
      { area: 'Prompt Studio',        severity: 'high',   items: ['10+ governed templates are dependent', 'Prompt testing and re-certification required', 'Regression review against golden test cases needed'] },
      { area: 'Learner Experience',   severity: 'high',   items: ['8 active sessions may be disrupted', 'Coaching responses may change in tone or accuracy', 'Reflection quality may degrade during transition'] },
      { area: 'Knowledge Sources',    severity: 'high',   items: ['Source citations must be revalidated', 'Hallucination risk increases during update window', '6 referenced sources must be re-audited'] },
      { area: 'Coaches',              severity: 'medium', items: ['Coach brief format and data sources may change', 'Escalation alert logic must be tested', '3 coaches need to be notified of capability change'] },
      { area: 'Curriculum',           severity: 'medium', items: ['Reflection prompts and quest answers tied to this capability', 'Assessment feedback format may shift'] },
      { area: 'Salesforce',           severity: 'low',    items: ['Context variables may be remapped', 'Assessment__c records may use different field mappings'] },
    ],
  },
  course: {
    headline: 'What cascades if this course changes?',
    areas: [
      { area: 'Assessments',           severity: 'high',   items: ['Pre/post assessments must align with updated content', 'Scoring rubrics and criteria need review', '6 learners currently enrolled — active impact'] },
      { area: `${TERMS.aiAssistant} Prompts`, severity: 'high', items: ['6 reflection and quest prompts reference this course', 'Trail quest framing must be updated for accuracy', 'Consistency review must be triggered in Prompt Studio'] },
      { area: 'Design Standards',      severity: 'high',   items: ['Change must clear active design standards review', 'Standards consistency score will recalculate', 'Content Specialist sign-off required before publishing'] },
      { area: 'Knowledge Articles',    severity: 'medium', items: ['5 linked articles may need updating', 'Content health score for this course will change', 'New articles may need to be created'] },
      { area: 'Programs',              severity: 'medium', items: ['2 programs that include this course need review', 'Cohort pacing and sprint sequence may be affected'] },
      { area: 'Salesforce',            severity: 'low',    items: ['Learner progress records may show temporary inconsistency', 'Completion data format may need mapping update'] },
    ],
  },
  role: {
    headline: 'What cascades if this role changes?',
    areas: [
      { area: 'Salesforce Access',     severity: 'high',   items: ['Profile and permission set assignments must be reviewed', 'Related record ownership and visibility changes', 'User record requires immediate update'] },
      { area: 'Program Assignments',   severity: 'high',   items: ['3 active program participation mappings affected', 'Blueprint responsibilities must be reviewed', 'Handoff and escalation paths need remapping'] },
      { area: `${TERMS.aiAssistant} Support`, severity: 'high', items: [`${TERMS.aiAssistant} support mapping for this role needs updating`, 'Coach brief escalation logic affected', 'Role-specific prompt context must be re-parameterized'] },
      { area: 'Learners',              severity: 'medium', items: ['12 currently assigned learners need continuity plan', 'Coaching coverage must be reassigned immediately', 'Active Trail Quest sessions have coach dependencies'] },
      { area: 'Collaboration',         severity: 'medium', items: ['Slack channel and space assignments may change', 'Calendar event ownership and invites affected', 'Google Chat space membership must be updated'] },
      { area: 'Blueprints',            severity: 'low',    items: ['Role blueprint document needs version update', 'RACI matrix entries for this role must be revised'] },
    ],
  },
  integration: {
    headline: 'What cascades if this integration changes or goes down?',
    areas: [
      { area: TERMS.aiAssistant,   severity: 'high',   items: ['Context variables may be unavailable mid-session', 'Prompt rendering may fail without required variables', '3 capabilities silently degrade if integration goes down'] },
      { area: 'Salesforce Sync',   severity: 'high',   items: ['Object mappings and sync fields affected', 'PMM records may show stale or missing data', 'Contact and program records may diverge'] },
      { area: 'Learner Data',      severity: 'high',   items: ['Learner progress sync paused during change', 'Completion records may be delayed or missing', 'Assessment data may not flow to Salesforce correctly'] },
      { area: 'Programs',          severity: 'medium', items: ['4 active programs depend on this integration', 'Sprint delivery workflows may have data gaps', 'Reporting dashboards may show incomplete data'] },
      { area: 'Collaboration',     severity: 'medium', items: ['Slack bot adapter may need reconfiguration', 'Google Calendar sync may be affected', 'Channel notification routing may need update'] },
      { area: 'Operations',        severity: 'low',    items: ['Integration health score drops until restored', 'Phase 1 readiness score affected', 'Ops health dashboard flags this change'] },
    ],
  },
  knowledge: {
    headline: 'What cascades if this knowledge source changes?',
    areas: [
      { area: `${TERMS.aiAssistant} Quality`,  severity: 'high',   items: [`${TERMS.aiAssistant} may surface outdated or inaccurate content`, 'Hallucination risk increases if source is stale', '6 capabilities reference this source directly', 'Prompt grounding must be re-validated immediately'] },
      { area: 'Curriculum Content',             severity: 'high',   items: ['6 modules linked to this source are flagged', 'Course content health score drops', 'Reflection prompts may reference incorrect information', 'Content Specialist review required before republishing'] },
      { area: 'Coaches',                        severity: 'medium', items: ['8 coaches have this in required reading', 'Coach brief accuracy may be affected', 'Facilitation guides may need updating'] },
      { area: 'Learner Experience',             severity: 'medium', items: ['Quest answers and coaching responses may degrade', 'Trail OS search results may surface stale content', 'Knowledge Brief rail may show outdated snippets'] },
      { area: 'Org Memory',                     severity: 'low',    items: ['3 decisions reference this source in their rationale', 'Historical decision context may be invalidated', 'Source Registry entry must be updated with new version'] },
      { area: 'Drive & Salesforce',             severity: 'low',    items: ['Google Drive source file version must be incremented', 'Salesforce KB article may need parallel update', 'Source mapping audit required after change'] },
    ],
  },
};

// ── Utility components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SelectedObject['status'] }) {
  const { label, cls, dot } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[14px] font-bold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── Focused Map (SVG) ─────────────────────────────────────────────────────────

function FocusedMap({ selected, onNavigate }: { selected: SelectedObject; onNavigate: (p: string) => void }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const cfg = CATALOG[selected.kind];
  const conns = cfg.connections;
  const cx = 290, cy = 220;

  const satellites = useMemo(() => {
    const n = conns.length;
    return conns.map((c, i) => ({
      ...c,
      id: c.system,
      x: Math.round(cx + 155 * Math.cos(-Math.PI / 2 + i * (2 * Math.PI / n))),
      y: Math.round(cy + 155 * Math.sin(-Math.PI / 2 + i * (2 * Math.PI / n))),
    }));
  }, [conns]);

  const hovered = hoverId ? satellites.find(s => s.id === hoverId) : null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 min-w-0">
        <svg viewBox="0 0 580 440" className="w-full max-w-[580px] max-h-full" style={{ overflow: 'visible' }}>
          {satellites.map(s => (
            <line key={s.id} x1={cx} y1={cy} x2={s.x} y2={s.y}
              stroke={hoverId === null || hoverId === s.id ? '#94a3b8' : '#e2e8f0'}
              strokeWidth={hoverId === s.id ? 2 : 1.5}
              style={{ transition: 'stroke 0.12s' }}
            />
          ))}
          <g style={{ cursor: 'default' }}>
            <circle cx={cx} cy={cy} r={36} fill={cfg.hexColor} stroke="white" strokeWidth={3} />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight={700} fill="white"
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {selected.name.length > 14 ? selected.name.slice(0, 13) + '…' : selected.name}
            </text>
            <text x={cx} y={cy + 47} textAnchor="middle"
              fontSize={8} fontWeight={600} fill={cfg.hexColor}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {cfg.label}
            </text>
          </g>
          {satellites.map(s => {
            const isHov = hoverId === s.id;
            return (
              <g key={s.id}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => onNavigate(s.href)}
                style={{ cursor: 'pointer', opacity: hoverId && !isHov ? 0.35 : 1, transition: 'opacity 0.12s' }}>
                <circle cx={s.x} cy={s.y} r={isHov ? 23 : 20}
                  fill={s.color} stroke={isHov ? 'white' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isHov ? 2.5 : 1}
                  style={{ transition: 'r 0.1s' }} />
                <text x={s.x} y={s.y + 30} textAnchor="middle"
                  fontSize={9} fontWeight={600} fill={hoverId && !isHov ? '#94a3b8' : '#1e293b'}
                  style={{ userSelect: 'none', pointerEvents: 'none', transition: 'fill 0.12s' }}>
                  {s.system}
                </text>
                <text x={s.x} y={s.y + 40} textAnchor="middle"
                  fontSize={8} fill="#64748b"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className={`w-56 shrink-0 border-l border-border bg-white flex flex-col transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {hovered && (
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hovered.color }} />
              <p className="text-[14px] font-bold text-foreground">{hovered.system}</p>
            </div>
            <p className="text-[14px] text-muted-foreground leading-relaxed">{hovered.detail}</p>
            <div className="space-y-1">
              {hovered.items.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                  {item.statusColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.statusColor}`} />}
                  {item.label}
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate(hovered.href)}
              className="w-full text-[14px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1.5 hover:bg-primary/5 transition-colors">
              Open workspace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Object Header ─────────────────────────────────────────────────────────────

function ObjectHeader({ obj, onClear, onSwitch }: { obj: SelectedObject; onClear: () => void; onSwitch: () => void }) {
  const cfg = CATALOG[obj.kind];
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border-b border-border ${cfg.bg} shrink-0`}>
      <span className={`text-[14px] font-bold ${cfg.accent} opacity-70`}>{cfg.label}</span>
      <span className={`w-1 h-1 rounded-full bg-current opacity-40`} />
      <span className="text-[14px] font-bold text-foreground">{obj.name}</span>
      <span className="text-[14px] text-muted-foreground">{obj.subtitle}</span>
      <StatusBadge status={obj.status} />
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onSwitch}
          className="text-[14px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 bg-white hover:bg-muted/30 transition-colors flex items-center gap-1">
          <Search className="w-3 h-3" /> Switch object
        </button>
        <button onClick={onClear}
          className="text-[14px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}

// ── Object Workspace ──────────────────────────────────────────────────────────

type WorkspaceTab = 'overview' | 'relationships' | 'health' | 'ownership' | 'activity' | 'actions';
const WS_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview',      label: 'Overview'            },
  { id: 'relationships', label: 'Relationships'       },
  { id: 'health',        label: 'Health'              },
  { id: 'ownership',     label: 'Ownership'           },
  { id: 'activity',      label: 'Recent Activity'     },
  { id: 'actions',       label: 'Recommended Actions' },
];

function ObjectWorkspace({ obj, onNavigate }: { obj: SelectedObject; onNavigate: (p: string) => void }) {
  const [wsTab, setWsTab] = useState<WorkspaceTab>('overview');
  const cfg = CATALOG[obj.kind];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex gap-0 border-b border-border bg-white shrink-0 px-4 overflow-x-auto">
        {WS_TABS.map(t => (
          <button key={t.id} onClick={() => setWsTab(t.id)}
            className={`px-3 py-2 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              wsTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">

          {wsTab === 'overview' && (
            <div className="space-y-4">
              <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
                <p className="text-[14px] font-bold text-foreground mb-1.5">{cfg.question}</p>
                <p className="text-[14px] text-foreground leading-relaxed">{cfg.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {cfg.connections.map(c => (
                    <button key={c.system} onClick={() => onNavigate(c.href)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-white text-[14px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.system} · {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-[14px] font-bold text-muted-foreground mb-2">Quick impact preview</p>
                <div className="space-y-1">
                  {IMPACT_CATALOG[obj.kind].areas.slice(0, 3).map(a => (
                    <div key={a.area} className="flex items-start gap-2 text-[14px]">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEV_CONFIG[a.severity].dot}`} />
                      <span><strong>{a.area}</strong> — {a.items[0]}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setWsTab('actions')}
                  className="mt-2 text-[14px] font-semibold text-primary hover:underline">View full impact →</button>
              </div>
            </div>
          )}

          {wsTab === 'relationships' && (
            <div className="space-y-3">
              <p className="text-[14px] text-muted-foreground">Every system this object connects to. Click a tag to navigate to that workspace.</p>
              {cfg.connections.map(c => (
                <RelationshipCard key={c.system} title={c.system} items={c.items}
                  viewAllHref={c.href} defaultOpen={true} />
              ))}
            </div>
          )}

          {wsTab === 'health' && (
            <div className="space-y-3">
              {[
                { label: 'Data completeness',      pct: 85,  color: 'bg-[#2F6B3F]', note: 'Core fields populated across all connected systems' },
                { label: 'Salesforce sync',         pct: 100, color: 'bg-[#2F6B3F]', note: 'Last synced less than 1 hour ago' },
                { label: 'Knowledge freshness',     pct: 72,  color: 'bg-[#CC8400]',  note: '2 of 8 sources flagged for review — last audit Q1 2025' },
                { label: `${TERMS.aiAssistant} coverage`, pct: obj.kind === 'capability' ? 95 : 60, color: obj.kind === 'capability' ? 'bg-[#2F6B3F]' : 'bg-[#CC8400]', note: 'Capabilities configured for this object' },
                { label: 'Governance status',       pct: 78,  color: 'bg-[#CC8400]',  note: 'Lifecycle review due Q3 — ownership confirmed' },
              ].map(h => (
                <div key={h.label} className="rounded-lg border border-border bg-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-foreground">{h.label}</span>
                    <span className="text-[14px] font-bold tabular-nums text-foreground">{h.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${h.color}`} style={{ width: `${h.pct}%` }} />
                  </div>
                  <p className="text-[14px] text-muted-foreground">{h.note}</p>
                </div>
              ))}
            </div>
          )}

          {wsTab === 'ownership' && (
            <div className="space-y-3">
              {[
                { role: 'Primary Owner',   name: 'Program Manager',     detail: "Accountable for this object's health and currency",                    status: 'active' as const },
                { role: 'Content Steward', name: 'Content Specialist',  detail: 'Manages content quality and knowledge alignment',                      status: 'active' as const },
                { role: 'Data Owner',      name: 'Operations Lead',     detail: 'Owns Salesforce records and integration mappings',                      status: 'active' as const },
                { role: 'AI Curator',      name: `${TERMS.aiAssistant} Lead`, detail: `Reviews ${TERMS.aiAssistant} prompts and capability quality`, status: 'review' as const },
              ].map(o => (
                <div key={o.role} className="rounded-lg border border-border bg-white p-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-bold text-foreground">{o.name}</p>
                      <span className={`text-[14px] font-bold px-1 py-0.5 rounded border ${STATUS_CONFIG[o.status].cls}`}>{o.role}</span>
                    </div>
                    <p className="text-[14px] text-muted-foreground">{o.detail}</p>
                  </div>
                </div>
              ))}
              <div className="rounded border border-border bg-muted/20 px-3 py-2">
                <p className="text-[14px] text-muted-foreground">
                  Full ownership matrix at{' '}
                  <button onClick={() => onNavigate('/governance/ownership')}
                    className="font-semibold text-primary hover:underline">
                    Governance → Ownership Matrix
                  </button>
                </p>
              </div>
            </div>
          )}

          {wsTab === 'activity' && (
            <div className="space-y-2">
              {[
                { date: 'Today',       actor: TERMS.aiAssistant,    action: 'Trail Quest session completed',                color: 'bg-[#2F6F7E]' },
                { date: 'Yesterday',   actor: 'Coach',              action: 'Coach brief reviewed before session',          color: 'bg-[#2F6F7E]' },
                { date: '3 days ago',  actor: 'Salesforce Sync',    action: 'Program_Engagement__c updated',                color: 'bg-[#2F6F7E]' },
                { date: 'Last week',   actor: 'Content Specialist', action: 'Knowledge source linked and confirmed current', color: 'bg-[#2F6F7E]' },
                { date: 'Last week',   actor: 'Program Manager',    action: 'Sprint 3 calendar events created',             color: 'bg-[#2F6B3F]' },
                { date: '2 weeks ago', actor: 'Operations Lead',    action: 'Integration health check passed',              color: 'bg-[#2F6B3F]' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded border border-border bg-white px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground leading-snug">{a.action}</p>
                    <p className="text-[14px] text-muted-foreground">{a.actor} · {a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {wsTab === 'actions' && (
            <div className="space-y-3">
              <p className="text-[14px] text-muted-foreground">Suggested next actions based on this object's current state and connections.</p>
              {[
                { label: 'Open in Salesforce',              desc: 'Review the primary record and related data',           href: '/admin/integrations', icon: <Database className="w-4 h-4" />, variant: 'primary'    as const },
                { label: 'Review Knowledge Sources',        desc: '2 sources are flagged for currency review',            href: '/knowledge',          icon: <BookOpen  className="w-4 h-4" />, variant: 'secondary' as const },
                { label: `Check ${TERMS.aiAssistant} Prompts`, desc: 'Verify prompt quality and consistency after changes', href: '/penny/prompts',   icon: <Brain     className="w-4 h-4" />, variant: 'secondary' as const },
                { label: 'View Impact Analysis',            desc: 'See the full cascade of changes for this object',      href: '/governance/impact',  icon: <Zap       className="w-4 h-4" />, variant: 'secondary' as const },
                { label: 'Check Governance Status',         desc: 'Review lifecycle stage and ownership assignments',     href: '/governance/ownership',icon: <Shield   className="w-4 h-4" />, variant: 'secondary' as const },
              ].map((a, i) => (
                <button key={i} onClick={() => onNavigate(a.href)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-sm group ${a.variant === 'primary' ? 'border-primary/30 bg-primary/5 hover:bg-primary/10' : 'border-border bg-white hover:border-primary/30'}`}>
                  <span className={`shrink-0 ${a.variant === 'primary' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold ${a.variant === 'primary' ? 'text-primary' : 'text-foreground'}`}>{a.label}</p>
                    <p className="text-[14px] text-muted-foreground">{a.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}

// ── Entry Grid ────────────────────────────────────────────────────────────────

function EntryGrid({ onSelect }: { onSelect: (obj: SelectedObject) => void }) {
  const [expanded, setExpanded] = useState<ObjectKind | null>(null);
  const kinds = Object.entries(CATALOG) as [ObjectKind, KindConfig][];

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="mb-3">
          <p className="text-[14px] font-bold text-muted-foreground/50 mb-0.5">Object Tracer</p>
          <p className="text-[14px] text-muted-foreground">Pick an object to trace what it touches — relationships, health, ownership, and change impact. Useful for investigating why {TERMS.aiAssistant} is behaving a certain way or troubleshooting a cross-system issue.</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {kinds.map(([kind, cfg]) => {
            const isExpanded = expanded === kind;
            return (
              <div key={kind}
                className={`rounded-lg border bg-white transition-all duration-150 overflow-hidden cursor-pointer ${isExpanded ? `${cfg.border} shadow-sm` : 'border-border hover:border-primary/30 hover:shadow-sm'}`}
                onClick={() => setExpanded(isExpanded ? null : kind)}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2.5 mb-1.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.accent}`}>
                      <span className="scale-75">{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground leading-tight">{cfg.verb}</p>
                      <p className="text-[14px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{cfg.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cfg.examples.slice(0, 3).map(ex => (
                      <button key={ex.id}
                        onClick={e => { e.stopPropagation(); onSelect({ kind, ...ex }); }}
                        className={`text-[14px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors hover:opacity-80 ${cfg.bg} ${cfg.border} ${cfg.accent}`}>
                        {ex.name}
                      </button>
                    ))}
                    {cfg.examples.length > 3 && (
                      <span className="text-[14px] text-muted-foreground px-1 py-0.5">+{cfg.examples.length - 3}</span>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className={`border-t ${cfg.border} ${cfg.bg} divide-y divide-white/60`}>
                    {cfg.examples.map(ex => (
                      <button key={ex.id}
                        onClick={e => { e.stopPropagation(); onSelect({ kind, ...ex }); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-semibold ${cfg.accent}`}>{ex.name}</p>
                          <p className="text-[14px] text-muted-foreground">{ex.subtitle}</p>
                        </div>
                        <StatusBadge status={ex.status} />
                        <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Selecting an object opens a workspace with <strong>relationships</strong>, <strong>health</strong>, <strong>ownership</strong>, and <strong>recommended actions</strong>. Use <strong>Relationship Map</strong> for a visual graph or <strong>Impact Analysis</strong> to trace change cascades.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Exported tab components ───────────────────────────────────────────────────

export function ObjectTracerTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject | null) => void;
  onNavigate: (p: string) => void;
}) {
  if (!selected) return <EntryGrid onSelect={onSelect} />;
  return (
    <>
      <ObjectHeader obj={selected} onClear={() => onSelect(null)} onSwitch={() => onSelect(null)} />
      <ObjectWorkspace obj={selected} onNavigate={onNavigate} />
    </>
  );
}

export function RelationshipMapTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject | null) => void;
  onNavigate: (p: string) => void;
}) {
  if (!selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="text-center max-w-md">
            <Network className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[15px] font-semibold text-foreground mb-1.5">No object selected</p>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Select an object in <strong>Object Tracer</strong> to see its focused relationship map — what it connects to, how many links, and how to navigate to each.
            </p>
          </div>
          <div className="w-full max-w-lg">
            <p className="text-[14px] font-bold text-muted-foreground/50 mb-2 text-center">Quick start — pick an example</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { kind: 'program'     as ObjectKind, ex: { id: 'guided-trail',    name: 'Guided Trail',         subtitle: 'Cohort-based coaching',    status: 'active' as const } },
                { kind: 'capability'  as ObjectKind, ex: { id: 'resume-review',   name: `${TERMS.aiAssistant} Resume Review`, subtitle: 'AI feedback engine', status: 'active' as const } },
                { kind: 'course'      as ObjectKind, ex: { id: 'agile-foundations',name: 'Agile Foundations',   subtitle: 'Sprint fundamentals',      status: 'active' as const } },
                { kind: 'role'        as ObjectKind, ex: { id: 'coach',            name: 'Coach',               subtitle: 'Learner support role',     status: 'active' as const } },
                { kind: 'integration' as ObjectKind, ex: { id: 'salesforce-pe',    name: 'Salesforce Engagement',subtitle: 'CRM source of record',    status: 'active' as const } },
                { kind: 'knowledge'   as ObjectKind, ex: { id: 'program-framework',name: 'Program Framework',   subtitle: 'Design principles doc',    status: 'active' as const } },
              ]).map(({ kind, ex }) => {
                const cfg = CATALOG[kind];
                return (
                  <button key={ex.id} onClick={() => onSelect({ kind, ...ex })}
                    className={`text-left p-3 rounded-lg border-2 ${cfg.border} ${cfg.bg} hover:shadow-sm transition-all`}>
                    <div className={`text-[14px] font-bold mb-0.5 ${cfg.accent}`}>{cfg.label}</div>
                    <div className="text-[14px] font-semibold text-foreground leading-tight">{ex.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <ObjectHeader obj={selected} onClear={() => onSelect(null)} onSwitch={() => onSelect(null)} />
      <div className="flex-1 min-h-0">
        <FocusedMap selected={selected} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function ImpactAnalysisTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject | null) => void;
  onNavigate: (p: string) => void;
}) {
  const [filterSev, setFilterSev] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  if (!selected) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-8">
        <div className="text-center max-w-md">
          <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-foreground mb-1.5">Select an object to trace impact</p>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Impact Analysis answers: <em>"What changes if this object changes?"</em> — across programs, curriculum, {TERMS.aiAssistant}, Salesforce, communication channels, and team ownership.
          </p>
        </div>
        <button onClick={() => onNavigate('/governance/tracer')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors">
          <ArrowRight className="w-4 h-4" /> Go to Object Tracer to select an object
        </button>
      </div>
    );
  }

  const impact = IMPACT_CATALOG[selected.kind];
  const areas  = filterSev === 'all' ? impact.areas : impact.areas.filter(a => a.severity === filterSev);

  return (
    <div className="flex flex-col h-full">
      <ObjectHeader obj={selected} onClear={() => onSelect(null)} onSwitch={() => onSelect(null)} />
      <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-muted/20 shrink-0">
        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[14px] font-semibold text-foreground flex-1">{impact.headline}</p>
        <div className="flex items-center gap-1">
          {(['all', 'high', 'medium', 'low'] as const).map(sev => (
            <button key={sev} onClick={() => setFilterSev(sev)}
              className={`px-2 py-0.5 rounded text-[14px] font-bold border transition-colors ${
                filterSev === sev
                  ? sev === 'all' ? 'bg-foreground text-background border-foreground'
                    : sev === 'high' ? SEV_CONFIG.high.cls : sev === 'medium' ? SEV_CONFIG.medium.cls : SEV_CONFIG.low.cls
                  : 'bg-white border-border text-muted-foreground hover:bg-muted/30'
              }`}>
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-3">
          {areas.map(area => (
            <div key={area.area} className="rounded-lg border border-border bg-white overflow-hidden">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-border ${SEV_CONFIG[area.severity].cls}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${SEV_CONFIG[area.severity].dot}`} />
                <span className="text-[14px] font-bold">{area.area}</span>
                <span className={`ml-auto text-[14px] font-bold px-1.5 py-0.5 rounded border ${SEV_CONFIG[area.severity].cls}`}>
                  {area.severity} impact
                </span>
              </div>
              <ul className="px-4 py-3 space-y-1.5">
                {area.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-foreground">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {areas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[14px]">No {filterSev} severity impacts for this object.</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
