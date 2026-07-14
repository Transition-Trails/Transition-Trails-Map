import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useAppContext } from '@/context/AppContext';
import {
  Network, Compass, Shield, GraduationCap, Brain, BookOpen,
  Users, Plug, X, ChevronRight, ArrowRight, ExternalLink,
  Zap, Activity, MapPin, RotateCcw, FileText,
  HardDrive, Calendar, MessageSquare, Database, Search,
  AlertTriangle, CheckCircle, Info, Star, Layers,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RelationshipCard, type RelatedItem } from '@/components/workspace/RelationshipCard';
import { useTierFlags } from '@/hooks/useTierFlags';

// ── Types ─────────────────────────────────────────────────────────────────────

type ObjectKind = 'program' | 'capability' | 'course' | 'role' | 'integration' | 'knowledge';

interface SelectedObject {
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
  active:      { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'in-progress':{ label: 'In Progress', cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400'  },
  review:      { label: 'Under Review', cls: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500'    },
  planned:     { label: 'Planned',      cls: 'bg-muted text-muted-foreground border-border',       dot: 'bg-slate-400'  },
};

const SEV_CONFIG = {
  high:   { cls: 'bg-rose-50 text-rose-700 border-rose-200',    dot: 'bg-rose-500'   },
  medium: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400'  },
  low:    { cls: 'bg-sky-50 text-sky-700 border-sky-200',       dot: 'bg-sky-400'    },
};

const CATALOG: Record<ObjectKind, KindConfig> = {
  program: {
    icon: <GraduationCap className="w-5 h-5" />,
    verb: 'Explore a Program',
    label: 'Programs',
    description: 'Follow a program across curriculum, learners, coaches, Salesforce, Penny AI, and all team workflows.',
    question: 'What does this program touch?',
    hexColor: '#059669',
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    examples: [
      { id: 'guided-trail',  name: 'Guided Trail',       subtitle: 'Cohort-based coaching program',   status: 'active'      },
      { id: 'foundations',   name: 'Foundations Trail',  subtitle: 'Skills-based onboarding path',    status: 'active'      },
      { id: 'explorers',     name: "Explorer's Trail",   subtitle: 'Self-paced discovery program',    status: 'active'      },
      { id: 'mastery',       name: 'Trail of Mastery',   subtitle: 'Advanced practitioner pathway',   status: 'in-progress' },
      { id: 'compass',       name: 'Digital Compass',    subtitle: 'Digital fluency program',         status: 'planned'     },
    ],
    connections: [
      { system: 'Curriculum',    label: '12 courses',     count: 12, color: '#b45309', href: '/program/curriculum', detail: 'Agile Foundations, Growth Mindset, Sprint Cadence, Trail Talks +8',
        items: [{ id:'c1', label:'Agile Foundations', statusColor:'bg-emerald-400' }, { id:'c2', label:'Growth Mindset', statusColor:'bg-emerald-400' }, { id:'c3', label:'Sprint Cadence', statusColor:'bg-emerald-400' }, { id:'c4', label:'Trail Talks', statusColor:'bg-emerald-400' }, { id:'c5', label:'+8 more', statusColor:'bg-slate-400' }] },
      { system: 'Salesforce',    label: 'Program objects', count: 3,  color: '#0369a1', href: '/admin/salesforce-arch', detail: 'Program__c, Program_Engagement__c, Contact',
        items: [{ id:'s1', label:'Program__c', statusColor:'bg-sky-400' }, { id:'s2', label:'Program_Engagement__c', statusColor:'bg-sky-400' }, { id:'s3', label:'Contact', statusColor:'bg-sky-400' }] },
      { system: 'Penny AI',      label: '4 capabilities', count: 4,  color: '#be185d', href: '/penny',              detail: 'Trail Quest, Coach Brief, Sprint Coach, Resume Review',
        items: [{ id:'p1', label:'Trail Quest', statusColor:'bg-pink-400' }, { id:'p2', label:'Coach Brief', statusColor:'bg-pink-400' }, { id:'p3', label:'Sprint Coach', statusColor:'bg-amber-400' }, { id:'p4', label:'Resume Review', statusColor:'bg-pink-400' }] },
      { system: 'Roles',         label: '6 role types',   count: 6,  color: '#1d4ed8', href: '/digital-twin',       detail: 'Coach, Cohort Lead, Content Specialist, Ops Lead, Evaluator, Learner',
        items: [{ id:'r1', label:'Coach', statusColor:'bg-blue-400' }, { id:'r2', label:'Cohort Lead', statusColor:'bg-blue-400' }, { id:'r3', label:'Content Specialist', statusColor:'bg-blue-400' }, { id:'r4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Knowledge',     label: '8 sources',      count: 8,  color: '#6d28d9', href: '/knowledge',          detail: 'Trail Design Guide, Framework Doc, Standards, Drive Resources',
        items: [{ id:'k1', label:'Trail Design Guide', statusColor:'bg-violet-400' }, { id:'k2', label:'Framework Doc', statusColor:'bg-violet-400' }, { id:'k3', label:'Curriculum Standards', statusColor:'bg-violet-400' }, { id:'k4', label:'+5 more', statusColor:'bg-slate-400' }] },
      { system: 'Collaboration', label: 'Slack + Calendar', count: 3, color: '#c2410c', href: '/collaboration',     detail: '#guided-trail, Sprint Calendar, Weekly Coach Brief',
        items: [{ id:'cl1', label:'#guided-trail', statusColor:'bg-orange-400' }, { id:'cl2', label:'Sprint Calendar', statusColor:'bg-orange-400' }, { id:'cl3', label:'Coach Brief Digest', statusColor:'bg-orange-400' }] },
    ],
  },
  capability: {
    icon: <Brain className="w-5 h-5" />,
    verb: 'Trace a Penny Capability',
    label: 'Penny Capabilities',
    description: 'Map how Penny draws on knowledge, prompts, learner context, and Salesforce variables to deliver this capability.',
    question: 'What does this capability depend on?',
    hexColor: '#be185d',
    accent: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    examples: [
      { id: 'resume-review', name: 'Penny Resume Review',     subtitle: 'AI-powered resume feedback engine',    status: 'active'      },
      { id: 'trail-quest',   name: 'Trail Quest Companion',   subtitle: 'Contextual quest and reflection',      status: 'active'      },
      { id: 'coach-brief',   name: 'Coach Brief Generator',   subtitle: 'Pre-session learner summary',          status: 'active'      },
      { id: 'sprint-coach',  name: 'Sprint Coach',            subtitle: 'Sprint retrospective AI support',      status: 'in-progress' },
      { id: 'slack-penny',   name: 'Slack Penny AI Channel',  subtitle: 'Real-time learner support via Slack',  status: 'active'      },
    ],
    connections: [
      { system: 'Knowledge',      label: '6 sources',   count: 6,  color: '#6d28d9', href: '/knowledge',        detail: 'Resume frameworks, feedback guides, program content',
        items: [{ id:'k1', label:'Program Framework', statusColor:'bg-violet-400' }, { id:'k2', label:'Resume Templates', statusColor:'bg-violet-400' }, { id:'k3', label:'Feedback Guides', statusColor:'bg-violet-400' }, { id:'k4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Prompt Studio',  label: '10 prompts',  count: 10, color: '#7c3aed', href: '/penny/prompts',    detail: 'Governed templates for this capability',
        items: [{ id:'ps1', label:'Reflection Prompt', statusColor:'bg-violet-400' }, { id:'ps2', label:'Feedback Prompt', statusColor:'bg-violet-400' }, { id:'ps3', label:'Quest Prompt', statusColor:'bg-violet-400' }, { id:'ps4', label:'+7 more', statusColor:'bg-slate-400' }] },
      { system: 'Learners',       label: '8 active',    count: 8,  color: '#059669', href: '/penny/learners',   detail: '8 learners with active Penny sessions using this capability',
        items: [{ id:'l1', label:'8 active sessions', statusColor:'bg-emerald-400' }] },
      { system: 'Curriculum',     label: '4 modules',   count: 4,  color: '#b45309', href: '/program/curriculum', detail: 'Reflection, assessment, and quest modules',
        items: [{ id:'cu1', label:'Reflection Module', statusColor:'bg-amber-400' }, { id:'cu2', label:'Assessment Module', statusColor:'bg-amber-400' }, { id:'cu3', label:'Quest Module', statusColor:'bg-amber-400' }] },
      { system: 'Coaches',        label: '3 coaches',   count: 3,  color: '#1d4ed8', href: '/digital-twin',     detail: 'Coach brief and escalation recipients for this capability',
        items: [{ id:'co1', label:'3 coach recipients', statusColor:'bg-blue-400' }] },
      { system: 'Salesforce',     label: 'Variables',   count: 3,  color: '#0369a1', href: '/admin/salesforce-arch', detail: 'Contact, Assessment__c, Program_Engagement__c',
        items: [{ id:'sf1', label:'Contact', statusColor:'bg-sky-400' }, { id:'sf2', label:'Assessment__c', statusColor:'bg-sky-400' }, { id:'sf3', label:'Program_Engagement__c', statusColor:'bg-sky-400' }] },
    ],
  },
  course: {
    icon: <BookOpen className="w-5 h-5" />,
    verb: 'Review a Course',
    label: 'Courses',
    description: 'Inspect a course across program placement, knowledge sources, Penny prompts, assessments, and Salesforce records.',
    question: 'Where does this course live and what does it affect?',
    hexColor: '#b45309',
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    examples: [
      { id: 'agile-foundations', name: 'Agile Foundations',  subtitle: 'Sprint methodology fundamentals',       status: 'active'      },
      { id: 'growth-mindset',    name: 'Growth Mindset',     subtitle: 'Resilience and learning orientation',   status: 'active'      },
      { id: 'sprint-cadence',    name: 'Sprint Cadence',     subtitle: 'Weekly rhythm and standup practices',   status: 'active'      },
      { id: 'trail-talks',       name: 'Trail Talks',        subtitle: 'Peer conversation and reflection',      status: 'active'      },
      { id: 'digital-literacy',  name: 'Digital Literacy',   subtitle: 'Tools and digital fluency skills',      status: 'in-progress' },
    ],
    connections: [
      { system: 'Programs',      label: '2 programs',      count: 2, color: '#059669', href: '/program',               detail: 'Guided Trail and Foundations Trail include this course',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-emerald-400' }, { id:'pr2', label:'Foundations Trail', statusColor:'bg-emerald-400' }] },
      { system: 'Knowledge',     label: '5 articles',      count: 5, color: '#6d28d9', href: '/knowledge',              detail: 'Agile guides, sprint retrospective frameworks, learning science',
        items: [{ id:'k1', label:'Agile Guide', statusColor:'bg-violet-400' }, { id:'k2', label:'Sprint Framework', statusColor:'bg-violet-400' }, { id:'k3', label:'Learning Science', statusColor:'bg-violet-400' }, { id:'k4', label:'+2 more', statusColor:'bg-slate-400' }] },
      { system: 'Penny AI',      label: '6 prompts',       count: 6, color: '#be185d', href: '/penny/prompts',          detail: 'Reflection, quest, and assessment-linked prompts',
        items: [{ id:'p1', label:'Reflection Prompt', statusColor:'bg-pink-400' }, { id:'p2', label:'Quest Hook', statusColor:'bg-pink-400' }, { id:'p3', label:'Assessment Feedback', statusColor:'bg-pink-400' }, { id:'p4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Assessments',   label: '2 assessments',   count: 2, color: '#0f766e', href: '/program',                detail: 'Pre-course and post-course assessments',
        items: [{ id:'a1', label:'Pre-course', statusColor:'bg-teal-400' }, { id:'a2', label:'Post-course', statusColor:'bg-teal-400' }] },
      { system: 'Coaches',       label: '4 coaches',       count: 4, color: '#1d4ed8', href: '/digital-twin',           detail: 'Facilitate this course across cohorts',
        items: [{ id:'co1', label:'4 facilitating coaches', statusColor:'bg-blue-400' }] },
      { system: 'Salesforce',    label: 'Progress records', count: 1, color: '#0369a1', href: '/admin/salesforce-arch',   detail: 'Learner completion and progress data records',
        items: [{ id:'sf1', label:'Completion records', statusColor:'bg-sky-400' }, { id:'sf2', label:'Progress sync', statusColor:'bg-sky-400' }] },
    ],
  },
  role: {
    icon: <Users className="w-5 h-5" />,
    verb: 'Check a Role',
    label: 'Roles & People',
    description: 'See who holds a role, what they own, how Penny supports them, and where they appear in Slack and Salesforce.',
    question: 'Who holds this role and what do they own?',
    hexColor: '#1d4ed8',
    accent: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    examples: [
      { id: 'coach',            name: 'Coach',               subtitle: 'Primary learner support role',        status: 'active' },
      { id: 'program-manager',  name: 'Program Manager',     subtitle: 'Program strategy and delivery',       status: 'active' },
      { id: 'content-specialist', name: 'Content Specialist', subtitle: 'Curriculum design and standards',   status: 'active' },
      { id: 'cohort-lead',      name: 'Cohort Lead',         subtitle: 'Cohort operations and coordination',  status: 'active' },
      { id: 'ops-lead',         name: 'Operations Lead',     subtitle: 'Cross-program ops and integrations',  status: 'active' },
    ],
    connections: [
      { system: 'Programs',      label: '3 programs',     count: 3, color: '#059669', href: '/program',           detail: 'Active program participation assignments',
        items: [{ id:'p1', label:'Guided Trail', statusColor:'bg-emerald-400' }, { id:'p2', label:"Explorer's Trail", statusColor:'bg-emerald-400' }, { id:'p3', label:'Trail of Mastery', statusColor:'bg-amber-400' }] },
      { system: 'Learners',      label: '12 learners',    count: 12, color: '#059669', href: '/penny/learners',   detail: 'Currently assigned active learners',
        items: [{ id:'l1', label:'12 active learners', statusColor:'bg-emerald-400' }] },
      { system: 'Penny AI',      label: 'Coach support',  count: 2, color: '#be185d', href: '/penny',             detail: 'Coach Brief generator, escalation alert logic',
        items: [{ id:'ai1', label:'Coach Brief', statusColor:'bg-pink-400' }, { id:'ai2', label:'Escalation Alerts', statusColor:'bg-pink-400' }] },
      { system: 'Slack Channels', label: '4 channels',   count: 4, color: '#c2410c', href: '/collaboration',      detail: '#coaches, #guided-trail, #penny-ai, #ops',
        items: [{ id:'sl1', label:'#coaches', statusColor:'bg-orange-400' }, { id:'sl2', label:'#guided-trail', statusColor:'bg-orange-400' }, { id:'sl3', label:'#penny-ai', statusColor:'bg-orange-400' }, { id:'sl4', label:'#ops', statusColor:'bg-orange-400' }] },
      { system: 'Salesforce',    label: 'User + Contact', count: 2, color: '#0369a1', href: '/admin/salesforce-arch', detail: 'Salesforce user, contact record, permission set',
        items: [{ id:'sf1', label:'User record', statusColor:'bg-sky-400' }, { id:'sf2', label:'Contact record', statusColor:'bg-sky-400' }] },
      { system: 'Calendar',      label: '3 event types',  count: 3, color: '#0f766e', href: '/collaboration',     detail: 'Weekly check-ins, cohort sessions, retrospectives',
        items: [{ id:'ca1', label:'Weekly check-ins', statusColor:'bg-teal-400' }, { id:'ca2', label:'Cohort sessions', statusColor:'bg-teal-400' }, { id:'ca3', label:'Retrospectives', statusColor:'bg-teal-400' }] },
    ],
  },
  integration: {
    icon: <Plug className="w-5 h-5" />,
    verb: 'Analyze an Integration',
    label: 'Integrations',
    description: 'Trace how an integration connects to programs, Penny AI context, Salesforce sync, and team communications.',
    question: 'What depends on this integration being live?',
    hexColor: '#0f766e',
    accent: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    examples: [
      { id: 'google-drive',     name: 'Google Drive Resources',         subtitle: 'Program content and document source',     status: 'in-progress' },
      { id: 'slack-penny-ai',   name: 'Slack Penny AI Channel',         subtitle: 'Real-time AI learner engagement',         status: 'active'      },
      { id: 'salesforce-pe',    name: 'Salesforce Program Engagement',  subtitle: 'CRM source of record for programs',       status: 'active'      },
      { id: 'google-calendar',  name: 'Google Calendar Events',         subtitle: 'Sprint and cohort scheduling sync',       status: 'in-progress' },
      { id: 'lms',              name: 'LMS Integration',                subtitle: 'Course completion and progress sync',     status: 'planned'     },
    ],
    connections: [
      { system: 'Salesforce',    label: '6 object mappings', count: 6, color: '#0369a1', href: '/admin/salesforce-arch', detail: 'Sync fields: Program__c, Contact, Engagement, Assessment',
        items: [{ id:'sf1', label:'Program__c', statusColor:'bg-sky-400' }, { id:'sf2', label:'Contact', statusColor:'bg-sky-400' }, { id:'sf3', label:'Engagement__c', statusColor:'bg-sky-400' }, { id:'sf4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Penny AI',      label: '3 capabilities',   count: 3, color: '#be185d', href: '/penny',               detail: 'Context variables, notification dispatch, data fetch',
        items: [{ id:'p1', label:'Trail Quest', statusColor:'bg-pink-400' }, { id:'p2', label:'Coach Brief', statusColor:'bg-pink-400' }, { id:'p3', label:'Resume Review', statusColor:'bg-amber-400' }] },
      { system: 'Programs',      label: '4 programs',       count: 4, color: '#059669', href: '/program',               detail: 'All active programs depend on this integration',
        items: [{ id:'pr1', label:'Guided Trail', statusColor:'bg-emerald-400' }, { id:'pr2', label:'Foundations Trail', statusColor:'bg-emerald-400' }, { id:'pr3', label:"+2 more", statusColor:'bg-slate-400' }] },
      { system: 'Collaboration', label: 'Channels + Spaces', count: 2, color: '#c2410c', href: '/collaboration',      detail: 'Slack adapter, Google Chat space synchronization',
        items: [{ id:'cl1', label:'Slack adapter', statusColor:'bg-orange-400' }, { id:'cl2', label:'Google Chat sync', statusColor:'bg-orange-400' }] },
      { system: 'Learners',      label: 'Data sync',        count: 1, color: '#059669', href: '/penny/learners',       detail: 'Learner records and progress synced via this integration',
        items: [{ id:'l1', label:'Progress sync', statusColor:'bg-emerald-400' }, { id:'l2', label:'Completion records', statusColor:'bg-emerald-400' }] },
      { system: 'Calendar',      label: 'Event sync',       count: 1, color: '#0f766e', href: '/collaboration',        detail: 'Sprint and cohort calendar event creation',
        items: [{ id:'ca1', label:'Sprint events', statusColor:'bg-teal-400' }, { id:'ca2', label:'Cohort sessions', statusColor:'bg-teal-400' }] },
    ],
  },
  knowledge: {
    icon: <FileText className="w-5 h-5" />,
    verb: 'Inspect a Knowledge Source',
    label: 'Knowledge Sources',
    description: 'Trace where a knowledge source is cited in Penny AI, which courses it underpins, and whether it is current.',
    question: 'Where is this source used and is it up to date?',
    hexColor: '#6d28d9',
    accent: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    examples: [
      { id: 'program-framework', name: 'Program Framework Doc',   subtitle: 'Core program design principles',    status: 'active'      },
      { id: 'trail-design-guide', name: 'Trail Design Guide',     subtitle: 'Curriculum and trail standards',    status: 'active'      },
      { id: 'salesforce-kb',     name: 'Salesforce KB Articles',  subtitle: 'Knowledge__c object content',       status: 'review'      },
      { id: 'drive-resources',   name: 'Google Drive Resources',  subtitle: '/Trail OS/ folder content',         status: 'in-progress' },
      { id: 'source-registry',   name: 'Source Registry',         subtitle: 'All approved source documents',     status: 'active'      },
    ],
    connections: [
      { system: 'Penny AI',      label: '6 capabilities', count: 6, color: '#be185d', href: '/penny',               detail: 'Referenced in capability prompts and context loading',
        items: [{ id:'p1', label:'Resume Review', statusColor:'bg-pink-400' }, { id:'p2', label:'Trail Quest', statusColor:'bg-pink-400' }, { id:'p3', label:'Coach Brief', statusColor:'bg-pink-400' }, { id:'p4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Curriculum',    label: '6 modules',      count: 6, color: '#b45309', href: '/program/curriculum',   detail: 'Linked to course content and reflection prompts',
        items: [{ id:'c1', label:'Agile Foundations', statusColor:'bg-amber-400' }, { id:'c2', label:'Growth Mindset', statusColor:'bg-amber-400' }, { id:'c3', label:'Trail Talks', statusColor:'bg-amber-400' }, { id:'c4', label:'+3 more', statusColor:'bg-slate-400' }] },
      { system: 'Programs',      label: '5 programs',     count: 5, color: '#059669', href: '/program',               detail: 'All active programs reference this source',
        items: [{ id:'pr1', label:'All 5 programs', statusColor:'bg-emerald-400' }] },
      { system: 'Coaches',       label: 'Required reading', count: 8, color: '#1d4ed8', href: '/digital-twin',       detail: '8 coaches have this in required reading',
        items: [{ id:'co1', label:'8 coaches', statusColor:'bg-blue-400' }] },
      { system: 'Drive',         label: 'Source file',    count: 1, color: '#0f766e', href: '/collaboration',         detail: '/Trail OS/Framework — last updated Q1 2025',
        items: [{ id:'d1', label: 'Trail OS/Framework', statusColor:'bg-teal-400' }] },
      { system: 'Org Memory',    label: '3 decisions',    count: 3, color: '#7c3aed', href: '/knowledge/memory',      detail: '3 decisions cite this source in their rationale',
        items: [{ id:'m1', label:'3 historical decisions', statusColor:'bg-violet-400' }] },
    ],
  },
};

const IMPACT_CATALOG: Record<ObjectKind, { headline: string; areas: ImpactArea[] }> = {
  program: {
    headline: 'What cascades if this program changes?',
    areas: [
      { area: 'Curriculum',      severity: 'high',   items: ['All 12 courses need learning objective review', 'Agile Foundations and Growth Mindset directly affected', 'Sprint structure may need realignment', 'Assessment rubrics may need updating'] },
      { area: 'Salesforce',      severity: 'high',   items: ['Program__c record must be updated immediately', 'Program_Engagement__c records cascade', 'Outcome reports and PMM dashboards reflect change', 'Contact relationship records affected'] },
      { area: 'Penny AI',        severity: 'high',   items: ['Trail Quest context and framing must be reviewed', 'Coach Brief generator references program outcomes', 'Sprint Coach cadence tied to program calendar', 'Resume Review criteria may need updating'] },
      { area: 'Roles & Blueprints', severity: 'medium', items: ['Role participation mappings must be reviewed', 'Coach assignment and capacity may shift', 'Blueprint responsibilities may need revision'] },
      { area: 'Collaboration',   severity: 'medium', items: ['Slack cohort channel configuration affected', 'Calendar sprint events may need updating', 'Welcome and kickoff message templates affected'] },
      { area: 'Knowledge Sources', severity: 'low',  items: ['8 linked sources flagged for review', 'Program Framework Doc may need version update', 'Trail Design Guide alignment check required'] },
    ],
  },
  capability: {
    headline: 'What cascades if this Penny capability changes?',
    areas: [
      { area: 'Prompt Studio',   severity: 'high',   items: ['10+ governed templates are dependent', 'Prompt testing and re-certification required', 'Regression review against golden test cases needed'] },
      { area: 'Learner Experience', severity: 'high', items: ['8 active sessions may be disrupted', 'Coaching responses may change in tone or accuracy', 'Reflection quality may degrade during transition'] },
      { area: 'Knowledge Sources', severity: 'high', items: ['Source citations must be revalidated', 'Hallucination risk increases during update window', '6 referenced sources must be re-audited'] },
      { area: 'Coaches',         severity: 'medium', items: ['Coach brief format and data sources may change', 'Escalation alert logic must be tested', '3 coaches need to be notified of capability change'] },
      { area: 'Curriculum',      severity: 'medium', items: ['Reflection prompts and quest answers tied to this capability', 'Assessment feedback format may shift'] },
      { area: 'Salesforce',      severity: 'low',    items: ['Context variables may be remapped', 'Assessment__c records may use different field mappings'] },
    ],
  },
  course: {
    headline: 'What cascades if this course changes?',
    areas: [
      { area: 'Assessments',     severity: 'high',   items: ['Pre/post assessments must align with updated content', 'Scoring rubrics and criteria need review', '6 learners currently enrolled — active impact'] },
      { area: 'Penny AI Prompts', severity: 'high',  items: ['6 reflection and quest prompts reference this course', 'Trail quest framing must be updated for accuracy', 'Consistency review must be triggered in Prompt Studio'] },
      { area: 'Design Standards', severity: 'high',  items: ['Change must clear active design standards review', 'Standards consistency score will recalculate', 'Content Specialist sign-off required before publishing'] },
      { area: 'Knowledge Articles', severity: 'medium', items: ['5 linked articles may need updating', 'Content health score for this course will change', 'New articles may need to be created'] },
      { area: 'Programs',        severity: 'medium', items: ['2 programs that include this course need review', 'Cohort pacing and sprint sequence may be affected'] },
      { area: 'Salesforce',      severity: 'low',    items: ['Learner progress records may show temporary inconsistency', 'Completion data format may need mapping update'] },
    ],
  },
  role: {
    headline: 'What cascades if this role changes?',
    areas: [
      { area: 'Salesforce Access', severity: 'high', items: ['Profile and permission set assignments must be reviewed', 'Related record ownership and visibility changes', 'User record requires immediate update'] },
      { area: 'Program Assignments', severity: 'high', items: ['3 active program participation mappings affected', 'Blueprint responsibilities must be reviewed', 'Handoff and escalation paths need remapping'] },
      { area: 'Penny AI Support', severity: 'high',  items: ['Penny support mapping for this role needs updating', 'Coach brief escalation logic affected', 'Role-specific prompt context must be re-parameterized'] },
      { area: 'Learners',        severity: 'medium', items: ['12 currently assigned learners need continuity plan', 'Coaching coverage must be reassigned immediately', 'Active Trail Quest sessions have coach dependencies'] },
      { area: 'Collaboration',   severity: 'medium', items: ['Slack channel and space assignments may change', 'Calendar event ownership and invites affected', 'Google Chat space membership must be updated'] },
      { area: 'Blueprints',      severity: 'low',    items: ['Role blueprint document needs version update', 'RACI matrix entries for this role must be revised'] },
    ],
  },
  integration: {
    headline: 'What cascades if this integration changes or goes down?',
    areas: [
      { area: 'Penny AI',        severity: 'high',   items: ['Context variables may be unavailable mid-session', 'Prompt rendering may fail without required variables', '3 capabilities silently degrade if integration goes down'] },
      { area: 'Salesforce Sync', severity: 'high',   items: ['Object mappings and sync fields affected', 'PMM records may show stale or missing data', 'Contact and program records may diverge'] },
      { area: 'Learner Data',    severity: 'high',   items: ['Learner progress sync paused during change', 'Completion records may be delayed or missing', 'Assessment data may not flow to Salesforce correctly'] },
      { area: 'Programs',        severity: 'medium', items: ['4 active programs depend on this integration', 'Sprint delivery workflows may have data gaps', 'Reporting dashboards may show incomplete data'] },
      { area: 'Collaboration',   severity: 'medium', items: ['Slack bot adapter may need reconfiguration', 'Google Calendar sync may be affected', 'Channel notification routing may need update'] },
      { area: 'Operations',      severity: 'low',    items: ['Integration health score drops until restored', 'Phase 1 readiness score affected', 'Ops health dashboard flags this change'] },
    ],
  },
  knowledge: {
    headline: 'What cascades if this knowledge source changes?',
    areas: [
      { area: 'Penny AI Quality', severity: 'high',  items: ['Penny may surface outdated or inaccurate content', 'Hallucination risk increases if source is stale', '6 capabilities reference this source directly', 'Prompt grounding must be re-validated immediately'] },
      { area: 'Curriculum Content', severity: 'high', items: ['6 modules linked to this source are flagged', 'Course content health score drops', 'Reflection prompts may reference incorrect information', 'Content Specialist review required before republishing'] },
      { area: 'Coaches',         severity: 'medium', items: ['8 coaches have this in required reading', 'Coach brief accuracy may be affected', 'Facilitation guides may need updating'] },
      { area: 'Learner Experience', severity: 'medium', items: ['Quest answers and coaching responses may degrade', 'Trail OS search results may surface stale content', 'Knowledge Brief rail may show outdated snippets'] },
      { area: 'Org Memory',      severity: 'low',    items: ['3 decisions reference this source in their rationale', 'Historical decision context may be invalidated', 'Source Registry entry must be updated with new version'] },
      { area: 'Drive & Salesforce', severity: 'low', items: ['Google Drive source file version must be incremented', 'Salesforce KB article may need parallel update', 'Source mapping audit required after change'] },
    ],
  },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SelectedObject['status'] }) {
  const { label, cls, dot } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${cls}`}>
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
          {/* Center node */}
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
          {/* Satellite nodes */}
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
      {/* Hover detail panel */}
      <div className={`w-56 shrink-0 border-l border-border bg-white flex flex-col transition-opacity duration-150 ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {hovered && (
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hovered.color }} />
              <p className="text-[13px] font-bold text-foreground">{hovered.system}</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{hovered.detail}</p>
            <div className="space-y-1">
              {hovered.items.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {item.statusColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.statusColor}`} />}
                  {item.label}
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate(hovered.href)}
              className="w-full text-[11px] font-semibold text-primary border border-primary/30 rounded-md px-2 py-1.5 hover:bg-primary/5 transition-colors">
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
      <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.accent} opacity-70`}>{cfg.label}</span>
      <span className={`w-1 h-1 rounded-full ${cfg.border} bg-current opacity-40`} />
      <span className="text-[13px] font-bold text-foreground">{obj.name}</span>
      <span className="text-[11px] text-muted-foreground">{obj.subtitle}</span>
      <StatusBadge status={obj.status} />
      <div className="ml-auto flex items-center gap-2">
        <button onClick={onSwitch}
          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 bg-white hover:bg-muted/30 transition-colors flex items-center gap-1">
          <Search className="w-3 h-3" /> Switch object
        </button>
        <button onClick={onClear}
          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}

// ── Object Workspace ─────────────────────────────────────────────────────────

type WorkspaceTab = 'overview' | 'relationships' | 'health' | 'ownership' | 'activity' | 'actions';
const WS_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview',       label: 'Overview'     },
  { id: 'relationships',  label: 'Relationships' },
  { id: 'health',         label: 'Health'        },
  { id: 'ownership',      label: 'Ownership'     },
  { id: 'activity',       label: 'Recent Activity' },
  { id: 'actions',        label: 'Recommended Actions' },
];

function ObjectWorkspace({ obj, onNavigate }: { obj: SelectedObject; onNavigate: (p: string) => void }) {
  const [wsTab, setWsTab] = useState<WorkspaceTab>('overview');
  const cfg = CATALOG[obj.kind];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Sub-tab bar */}
      <div className="flex gap-0 border-b border-border bg-white shrink-0 px-4 overflow-x-auto">
        {WS_TABS.map(t => (
          <button key={t.id} onClick={() => setWsTab(t.id)}
            className={`px-3 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              wsTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-3xl space-y-4">

          {wsTab === 'overview' && (
            <div className="space-y-4">
              <div className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-1.5">{cfg.question}</p>
                <p className="text-[13px] text-foreground leading-relaxed">{cfg.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {cfg.connections.map(c => (
                    <button key={c.system} onClick={() => onNavigate(c.href)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-white text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.system} · {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Quick impact preview</p>
                <div className="space-y-1">
                  {IMPACT_CATALOG[obj.kind].areas.slice(0, 3).map(a => (
                    <div key={a.area} className="flex items-start gap-2 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${SEV_CONFIG[a.severity].dot}`} />
                      <span><strong>{a.area}</strong> — {a.items[0]}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setWsTab('actions')}
                  className="mt-2 text-[10px] font-semibold text-primary hover:underline">View full impact →</button>
              </div>
            </div>
          )}

          {wsTab === 'relationships' && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">Every system this object connects to. Click a tag to navigate to that workspace.</p>
              {cfg.connections.map(c => (
                <RelationshipCard key={c.system} title={c.system} items={c.items}
                  viewAllHref={c.href} defaultOpen={true} />
              ))}
            </div>
          )}

          {wsTab === 'health' && (
            <div className="space-y-3">
              {[
                { label: 'Data completeness', pct: 85, color: 'bg-emerald-500', note: 'Core fields populated across all connected systems' },
                { label: 'Salesforce sync',    pct: 100, color: 'bg-emerald-500', note: 'Last synced less than 1 hour ago' },
                { label: 'Knowledge freshness', pct: 72, color: 'bg-amber-400',  note: '2 of 8 sources flagged for review — last audit Q1 2025' },
                { label: 'Penny AI coverage',  pct: obj.kind === 'capability' ? 95 : 60, color: obj.kind === 'capability' ? 'bg-emerald-500' : 'bg-amber-400', note: 'Capabilities configured for this object' },
                { label: 'Governance status',  pct: 78, color: 'bg-amber-400',  note: 'Lifecycle review due Q3 — ownership confirmed' },
              ].map(h => (
                <div key={h.label} className="rounded-lg border border-border bg-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">{h.label}</span>
                    <span className="text-[12px] font-bold tabular-nums text-foreground">{h.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${h.color}`} style={{ width: `${h.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{h.note}</p>
                </div>
              ))}
            </div>
          )}

          {wsTab === 'ownership' && (
            <div className="space-y-3">
              {[
                { role: 'Primary Owner',   name: 'Program Manager',     detail: 'Accountable for this object\'s health and currency', status: 'active' as const },
                { role: 'Content Steward', name: 'Content Specialist',  detail: 'Manages content quality and knowledge alignment',    status: 'active' as const },
                { role: 'Data Owner',      name: 'Operations Lead',     detail: 'Owns Salesforce records and integration mappings',   status: 'active' as const },
                { role: 'AI Curator',      name: 'Penny Lead',          detail: 'Reviews Penny prompts and capability quality',       status: 'review' as const },
              ].map(o => (
                <div key={o.role} className="rounded-lg border border-border bg-white p-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[11px] font-bold text-foreground">{o.name}</p>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${STATUS_CONFIG[o.status].cls}`}>{o.role}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{o.detail}</p>
                  </div>
                </div>
              ))}
              <div className="rounded border border-border bg-muted/20 px-3 py-2">
                <p className="text-[10px] text-muted-foreground">
                  Full ownership matrix at{' '}
                  <button onClick={() => onNavigate('/digital-twin/governance')}
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
                { date: 'Today',          actor: 'Penny AI',         action: 'Trail Quest session completed',                   color: 'bg-pink-400'   },
                { date: 'Yesterday',      actor: 'Coach',            action: 'Coach brief reviewed before session',             color: 'bg-blue-400'   },
                { date: '3 days ago',     actor: 'Salesforce Sync',  action: 'Program_Engagement__c updated',                  color: 'bg-sky-400'    },
                { date: 'Last week',      actor: 'Content Specialist', action: 'Knowledge source linked and confirmed current', color: 'bg-violet-400' },
                { date: 'Last week',      actor: 'Program Manager',  action: 'Sprint 3 calendar events created',               color: 'bg-emerald-400'},
                { date: '2 weeks ago',    actor: 'Operations Lead',  action: 'Integration health check passed',                color: 'bg-teal-400'   },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded border border-border bg-white px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground leading-snug">{a.action}</p>
                    <p className="text-[10px] text-muted-foreground">{a.actor} · {a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {wsTab === 'actions' && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">Suggested next actions based on this object's current state and connections.</p>
              {[
                { label: 'Open in Salesforce',        desc: 'Review the primary record and related data',           href: '/admin/salesforce-arch', icon: <Database className="w-4 h-4" />, variant: 'primary' as const },
                { label: 'Review Knowledge Sources',  desc: '2 sources are flagged for currency review',            href: '/knowledge',          icon: <BookOpen  className="w-4 h-4" />, variant: 'secondary' as const },
                { label: 'Check Penny Prompts',       desc: 'Verify prompt quality and consistency after changes',  href: '/penny/prompts',      icon: <Brain     className="w-4 h-4" />, variant: 'secondary' as const },
                { label: 'View Impact Analysis',      desc: 'See the full cascade of changes for this object',      href: '/digital-twin/impact',icon: <Zap       className="w-4 h-4" />, variant: 'secondary' as const },
                { label: 'Check Governance Status',   desc: 'Review lifecycle stage and ownership assignments',     href: '/digital-twin/governance', icon: <Shield className="w-4 h-4" />, variant: 'secondary' as const },
              ].map((a, i) => (
                <button key={i} onClick={() => onNavigate(a.href)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:shadow-sm group ${a.variant === 'primary' ? 'border-primary/30 bg-primary/5 hover:bg-primary/10' : 'border-border bg-white hover:border-primary/30'}`}>
                  <span className={`shrink-0 ${a.variant === 'primary' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${a.variant === 'primary' ? 'text-primary' : 'text-foreground'}`}>{a.label}</p>
                    <p className="text-[10px] text-muted-foreground">{a.desc}</p>
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
      <div className="p-4 max-w-3xl">
        {/* Framing */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Digital Twin · Explore</p>
          <p className="text-[11px] text-muted-foreground">Pick an object to see what it touches — relationships, health, ownership, and change impact.</p>
        </div>

        {/* Entry tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          {kinds.map(([kind, cfg]) => {
            const isExpanded = expanded === kind;
            return (
              <div key={kind}
                className={`rounded-lg border bg-white transition-all duration-150 overflow-hidden cursor-pointer
                  ${isExpanded ? `${cfg.border} shadow-sm` : 'border-border hover:border-primary/30 hover:shadow-sm'}`}
                onClick={() => setExpanded(isExpanded ? null : kind)}
              >
                <div className="p-3">
                  <div className="flex items-start gap-2.5 mb-1.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.accent}`}>
                      <span className="scale-75">{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-foreground leading-tight">{cfg.verb}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{cfg.description}</p>
                    </div>
                  </div>
                  {/* Quick example pills — always visible */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cfg.examples.slice(0, 3).map(ex => (
                      <button key={ex.id}
                        onClick={e => { e.stopPropagation(); onSelect({ kind, ...ex }); }}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors hover:opacity-80 ${cfg.bg} ${cfg.border} ${cfg.accent}`}>
                        {ex.name}
                      </button>
                    ))}
                    {cfg.examples.length > 3 && (
                      <span className="text-[9px] text-muted-foreground px-1 py-0.5">+{cfg.examples.length - 3}</span>
                    )}
                  </div>
                </div>
                {/* Expanded: full list */}
                {isExpanded && (
                  <div className={`border-t ${cfg.border} ${cfg.bg} divide-y divide-white/60`}>
                    {cfg.examples.map(ex => (
                      <button key={ex.id}
                        onClick={e => { e.stopPropagation(); onSelect({ kind, ...ex }); }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-white/50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold ${cfg.accent}`}>{ex.name}</p>
                          <p className="text-[9px] text-muted-foreground">{ex.subtitle}</p>
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

        {/* Guidance footer */}
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Selecting an object opens a workspace with <strong>relationships</strong>, <strong>health</strong>, <strong>ownership</strong>, and <strong>recommended actions</strong>. Use <strong>Map</strong> for a visual graph or <strong>Impact</strong> to trace change cascades.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab: Explore ──────────────────────────────────────────────────────────────

function ExploreTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject) => void;
  onNavigate: (p: string) => void;
}) {
  if (!selected) return <EntryGrid onSelect={onSelect} />;
  return (
    <>
      <ObjectHeader obj={selected} onClear={() => onSelect(null as unknown as SelectedObject)} onSwitch={() => onSelect(null as unknown as SelectedObject)} />
      <ObjectWorkspace obj={selected} onNavigate={onNavigate} />
    </>
  );
}

// ── Tab: Map ──────────────────────────────────────────────────────────────────

function MapTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject) => void;
  onNavigate: (p: string) => void;
}) {
  if (!selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="text-center max-w-md">
            <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[15px] font-semibold text-foreground mb-1.5">No object selected</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Select an object in <strong>Explore</strong> to see its focused relationship map — what it connects to, how many links, and how to navigate to each.
            </p>
          </div>
          {/* Quick pick */}
          <div className="w-full max-w-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2 text-center">Quick start — pick an example</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { kind: 'program' as ObjectKind, ex: { id: 'guided-trail', name: 'Guided Trail', subtitle: 'Cohort-based coaching', status: 'active' as const } },
                { kind: 'capability' as ObjectKind, ex: { id: 'resume-review', name: 'Penny Resume Review', subtitle: 'AI feedback engine', status: 'active' as const } },
                { kind: 'course' as ObjectKind, ex: { id: 'agile-foundations', name: 'Agile Foundations', subtitle: 'Sprint fundamentals', status: 'active' as const } },
                { kind: 'role' as ObjectKind, ex: { id: 'coach', name: 'Coach', subtitle: 'Learner support role', status: 'active' as const } },
                { kind: 'integration' as ObjectKind, ex: { id: 'salesforce-pe', name: 'Salesforce Engagement', subtitle: 'CRM source of record', status: 'active' as const } },
                { kind: 'knowledge' as ObjectKind, ex: { id: 'program-framework', name: 'Program Framework', subtitle: 'Design principles doc', status: 'active' as const } },
              ]).map(({ kind, ex }) => {
                const cfg = CATALOG[kind];
                return (
                  <button key={ex.id} onClick={() => onSelect({ kind, ...ex })}
                    className={`text-left p-3 rounded-lg border-2 ${cfg.border} ${cfg.bg} hover:shadow-sm transition-all`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${cfg.accent}`}>{cfg.label}</div>
                    <div className="text-[11px] font-semibold text-foreground leading-tight">{ex.name}</div>
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
      <ObjectHeader obj={selected} onClear={() => onSelect(null as unknown as SelectedObject)} onSwitch={() => onSelect(null as unknown as SelectedObject)} />
      <div className="flex-1 min-h-0">
        <FocusedMap selected={selected} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ── Tab: Impact ───────────────────────────────────────────────────────────────

function ImpactTab({ selected, onSelect, onNavigate }: {
  selected: SelectedObject | null;
  onSelect: (obj: SelectedObject) => void;
  onNavigate: (p: string) => void;
}) {
  const [filterSev, setFilterSev] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  if (!selected) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 px-8">
        <div className="text-center max-w-md">
          <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-foreground mb-1.5">Select an object to trace impact</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Impact Analysis answers: <em>"What changes if this object changes?"</em> — across programs, curriculum, Penny AI, Salesforce, communication channels, and team ownership.
          </p>
        </div>
        <button onClick={() => onNavigate('/digital-twin')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors">
          <ArrowRight className="w-4 h-4" /> Go to Explore to select an object
        </button>
      </div>
    );
  }

  const impact = IMPACT_CATALOG[selected.kind];
  const areas = filterSev === 'all' ? impact.areas : impact.areas.filter(a => a.severity === filterSev);
  const cfg = CATALOG[selected.kind];

  return (
    <div className="flex flex-col h-full">
      <ObjectHeader obj={selected} onClear={() => onSelect(null as unknown as SelectedObject)} onSwitch={() => onSelect(null as unknown as SelectedObject)} />
      <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-muted/20 shrink-0">
        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[12px] font-semibold text-foreground flex-1">{impact.headline}</p>
        <div className="flex items-center gap-1">
          {(['all', 'high', 'medium', 'low'] as const).map(sev => (
            <button key={sev} onClick={() => setFilterSev(sev)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
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
        <div className="p-5 space-y-3 max-w-3xl">
          {areas.map(area => (
            <div key={area.area} className="rounded-lg border border-border bg-white overflow-hidden">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-border ${SEV_CONFIG[area.severity].cls}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${SEV_CONFIG[area.severity].dot}`} />
                <span className="text-[12px] font-bold">{area.area}</span>
                <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEV_CONFIG[area.severity].cls}`}>
                  {area.severity} impact
                </span>
              </div>
              <ul className="px-4 py-3 space-y-1.5">
                {area.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {areas.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[12px]">No {filterSev} severity impacts for this object.</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Tab: Governance ───────────────────────────────────────────────────────────

function GovernanceTab({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-3xl space-y-4">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Digital Twin · Governance</p>
          <p className="text-[11px] text-muted-foreground">Manage the Trail OS object model, lifecycle compliance, and ownership structure.</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              title: 'Object Model',
              subtitle: '36 core object types',
              desc: 'Every object type — relationships, source-of-truth system, ownership patterns, and health definitions.',
              href: '/uom',
              icon: <Layers className="w-4 h-4" />,
              accent: 'text-primary',
              bg: 'bg-primary/5',
              border: 'border-primary/20',
            },
            {
              title: 'Object Explorer',
              subtitle: 'Browse and filter all types',
              desc: 'Filter by category, search by name, view full profiles with relationship matrices.',
              href: '/uom/explorer',
              icon: <Search className="w-4 h-4" />,
              accent: 'text-violet-700',
              bg: 'bg-violet-50',
              border: 'border-violet-200',
            },
            {
              title: 'Lifecycle Models',
              subtitle: '8 lifecycle models',
              desc: 'Lifecycle stages for program, knowledge, people, and infrastructure objects — with approval workflows.',
              href: '/governance/lifecycle',
              icon: <RotateCcw className="w-4 h-4" />,
              accent: 'text-teal-700',
              bg: 'bg-teal-50',
              border: 'border-teal-200',
            },
            {
              title: 'Ownership Matrix',
              subtitle: 'Role-based ownership',
              desc: 'Ownership assignments across all object types — primary owners, stewards, data owners, and AI curators.',
              href: '/governance/ownership',
              icon: <Users className="w-4 h-4" />,
              accent: 'text-amber-700',
              bg: 'bg-amber-50',
              border: 'border-amber-200',
            },
          ].map(item => (
            <button key={item.href} onClick={() => onNavigate(item.href)}
              className={`text-left p-3 rounded-lg border ${item.border} bg-white hover:shadow-sm transition-all group`}>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${item.bg} ${item.accent}`}>
                {item.icon}
              </div>
              <p className="text-[12px] font-bold text-foreground mb-0.5">{item.title}</p>
              <p className={`text-[9px] font-semibold uppercase tracking-wide mb-1.5 ${item.accent}`}>{item.subtitle}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{item.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                <span>Open</span><ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 flex items-start gap-2.5">
          <Shield className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            These tools define the shared vocabulary for Universal Object Profiles, Global Search, and Penny AI context loading.
            Coordinate with the Operations Lead before making structural changes.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DigitalTwin() {
  useAppContext();
  const [location, setLocation] = useLocation();
  const { isAdminOrAbove } = useTierFlags();
  const [selected, setSelected] = useState<SelectedObject | null>(null);

  const nav = (p: string) => setLocation(p);

  function handleSelect(obj: SelectedObject | null) {
    setSelected(obj);
  }

  if (isAdminOrAbove && location.startsWith('/digital-twin/governance')) {
    return <GovernanceTab onNavigate={nav} />;
  }
  return <ExploreTab selected={selected} onSelect={handleSelect} onNavigate={nav} />;
}
