// Workspace Context Engine — example contexts + workspace impact mappings
import type { SearchHealth, SearchStatus } from '@/data/globalSearchData';

export interface ActiveContext {
  id: string;
  objectTypeId: string;
  objectTypeName: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  name: string;
  status: string;
  statusVariant: SearchStatus;
  health: SearchHealth;
  owner: string;
  workspaceLink: string;
  profileId?: string;
  setAt: string;
}

export interface WorkspaceImpact {
  workspaceId: string;
  workspaceName: string;
  workspaceLink: string;
  description: string;
  filterDescription: string;
  active: boolean;
}

export interface ContextDefinition {
  id: string;
  objectTypeId: string;
  objectTypeName: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  name: string;
  status: string;
  statusVariant: SearchStatus;
  health: SearchHealth;
  confidence: number;
  owner: string;
  workspaceLink: string;
  profileId?: string;
  description: string;
  workspaceImpacts: WorkspaceImpact[];
  keyRelationships: string[];
  recentActivity: { date: string; action: string; by: string }[];
}

export const EXAMPLE_CONTEXTS: ContextDefinition[] = [
  {
    id:'foundations-trail', objectTypeId:'program', objectTypeName:'Program',
    category:'Program Layer', categoryColor:'text-[#2F6B3F]', categoryBg:'bg-[#E6F0EA] border-[#9FC3AE]',
    name:'Foundations Trail', status:'Active', statusVariant:'active', health:'healthy', confidence:91,
    owner:'Program Director', workspaceLink:'/program', profileId:'foundations-trail',
    description:'8-week foundational career-change program. Cohort 2 active (Week 6). 13 learners enrolled.',
    workspaceImpacts: [
      { workspaceId:'program',      workspaceName:'Program & Curriculum',  workspaceLink:'/program',           description:'Shows Foundations Trail program map, curriculum, and blueprint compliance.', filterDescription:'Filtering to Foundations Trail', active:true  },
      { workspaceId:'penny',        workspaceName:'Penny',                  workspaceLink:'/penny',             description:'Shows Learning Coach, Resume Review, and Trail Quest capabilities for this program.', filterDescription:'Filtering to FT capabilities', active:true  },
      { workspaceId:'knowledge',    workspaceName:'Knowledge',              workspaceLink:'/knowledge',         description:'Shows all knowledge sources and articles linked to Foundations Trail.', filterDescription:'Filtering to FT knowledge',  active:true  },
      { workspaceId:'collaboration',workspaceName:'Collaboration',          workspaceLink:'/collaboration',     description:'Shows #foundations-cohort-2 and #foundations-coaches channels and sprint calendar.', filterDescription:'Filtering to FT channels',   active:true  },
      { workspaceId:'operations',   workspaceName:'Operations',             workspaceLink:'/operations',        description:'Shows health, demand, and Salesforce data for Foundations Trail.', filterDescription:'Filtering to FT operations', active:true  },
      { workspaceId:'digital-twin', workspaceName:'Digital Twin',           workspaceLink:'/digital-twin',      description:'Focuses org graph on Foundations Trail program node and relationships.', filterDescription:'Focusing on FT node',        active:true  },
      { workspaceId:'uom',          workspaceName:'Unified Object Model',   workspaceLink:'/uom/profile/foundations-trail', description:'Shows the Foundations Trail Universal Object Profile.', filterDescription:'Viewing FT profile',         active:false },
      { workspaceId:'admin',        workspaceName:'Administration',         workspaceLink:'/admin/programs',    description:'Highlights Foundations Trail program configuration and ownership.', filterDescription:'Highlighting FT admin',      active:false },
    ],
    keyRelationships:['Program Blueprint v2 (governs)','FT Cohort 2 (contains)','Coach — 3 assigned','Resume Review, Learning Coach, Trail Quest (Penny)','SF Program Engagement (maps to)','Foundations Trail Drive Folder'],
    recentActivity:[
      { date:'Sprint 3, Week 1',  action:'Sprint 3 started (Week 6 of 8)',                by:'Program Manager' },
      { date:'Sprint 2, Week 8',  action:'Sprint 2 Assessment: 91% pass rate',            by:'Penny AI' },
      { date:'Sprint 2, Week 7',  action:'Mid-point review completed — on track',         by:'Program Director' },
    ],
  },
  {
    id:'coach-role', objectTypeId:'role', objectTypeName:'Role',
    category:'People Layer', categoryColor:'text-[#2F6F7E]', categoryBg:'bg-[#EDF5F8] border-[#7FAFC6]',
    name:'Coach', status:'Active', statusVariant:'active', health:'needs-attention', confidence:74,
    owner:'Program Director', workspaceLink:'/digital-twin/people', profileId:'coach-role',
    description:'Guides learners through program delivery. Role Blueprint 60% complete — coaching responsibilities undocumented.',
    workspaceImpacts: [
      { workspaceId:'digital-twin', workspaceName:'Digital Twin',           workspaceLink:'/digital-twin/people', description:'Shows Coach role node, assigned learners, and program connections.', filterDescription:'Focusing on Coach role', active:true },
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/program',            description:'Shows programs where coaches are assigned and coach-specific resources.', filterDescription:'Filtering to coach programs', active:true },
      { workspaceId:'penny',        workspaceName:'Penny',                  workspaceLink:'/penny',              description:'Shows Coach Support capability, weekly brief prompt, and at-risk alerts.', filterDescription:'Filtering to coach Penny caps', active:true },
      { workspaceId:'collaboration',workspaceName:'Collaboration',          workspaceLink:'/collaboration/channels', description:'Shows #foundations-coaches and #penny-coaches channels.', filterDescription:'Filtering to coach channels', active:true },
      { workspaceId:'knowledge',    workspaceName:'Knowledge',              workspaceLink:'/knowledge/library',  description:'Shows Coach Onboarding Guide and coach-related knowledge articles.', filterDescription:'Filtering to coach knowledge', active:false },
      { workspaceId:'admin',        workspaceName:'Administration',         workspaceLink:'/admin/roles',        description:'Shows Coach Role Blueprint and governance gap.', filterDescription:'Highlighting Coach role admin', active:false },
    ],
    keyRelationships:['Foundations Trail (assigned to Cohort 2)','3 active coaches (Person objects)','Coach Support (Penny)','#foundations-coaches (Slack)','Role Blueprint (governs — partial)'],
    recentActivity:[
      { date:'Sprint 3, Week 1',  action:'Blueprint completeness flag — coaching responsibilities missing', by:'Standards Studio' },
      { date:'Sprint 1, Week 7',  action:'Coach 3 onboarded — coaching team complete',       by:'Program Director' },
      { date:'Pre-cohort',        action:'Penny Coach Support capability activated',          by:'Penny Lead' },
    ],
  },
  {
    id:'resume-review-capability', objectTypeId:'penny-capability', objectTypeName:'Penny Capability',
    category:'Intelligence Layer', categoryColor:'text-[#A93F2F]', categoryBg:'bg-[#FBEAE6] border-[#E8B9B4]',
    name:'Resume Review', status:'Active', statusVariant:'active', health:'healthy', confidence:88,
    owner:'Penny Lead', workspaceLink:'/penny', profileId:'resume-review-capability',
    description:'Reviews learner resume drafts in Sprint 3. Quality 87/100. Prompt v2.1. Low hallucination risk.',
    workspaceImpacts: [
      { workspaceId:'penny',        workspaceName:'Penny',                  workspaceLink:'/penny',             description:'Shows capability details, quality metrics, prompt, and source dependencies.', filterDescription:'Focusing on Resume Review', active:true },
      { workspaceId:'knowledge',    workspaceName:'Knowledge',              workspaceLink:'/knowledge',         description:'Shows Resume Writing Guide, ATS Guide, and Salesforce KB used by this capability.', filterDescription:'Filtering to capability sources', active:true },
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/program/curriculum',description:'Shows Sprint 3 lessons that trigger this capability.', filterDescription:'Filtering to capability programs', active:true },
      { workspaceId:'operations',   workspaceName:'Operations',             workspaceLink:'/operations/health', description:'Shows capability quality health indicators and usage metrics.', filterDescription:'Filtering to capability health', active:false },
    ],
    keyRelationships:['Resume Review Prompt v2.1 (depends on)','Resume Writing Guide (knowledge source)','Sprint 3 Resume Draft Lesson (triggers)','FT Cohort 2 Learners (serves — 234 interactions/30 days)'],
    recentActivity:[
      { date:'Quarterly review',  action:'Quarterly review — 87/100 (Pass)',                   by:'Penny Lead' },
      { date:'Prompt update',     action:'Upgraded to Prompt v2.1 — quality up 15 points',     by:'Penny Lead' },
      { date:'Pre-cohort',        action:'Resume Writing Guide added as Authoritative source',  by:'Knowledge Manager' },
    ],
  },
  {
    id:'program-blueprint-v2', objectTypeId:'program-blueprint', objectTypeName:'Program Blueprint',
    category:'Knowledge Layer', categoryColor:'text-[#2F6F7E]', categoryBg:'bg-[#EDF5F8] border-[#7FAFC6]',
    name:'Program Blueprint v2', status:'Active', statusVariant:'active', health:'healthy', confidence:94,
    owner:'Standards Lead', workspaceLink:'/program/blueprint', profileId:'program-blueprint-v2',
    description:'Governing standard for all 5 programs. 4 of 5 fully compliant. Digital Compass migration pending.',
    workspaceImpacts: [
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/program/blueprint', description:'Shows blueprint document, compliance status for all 5 programs.', filterDescription:'Viewing blueprint compliance', active:true },
      { workspaceId:'operations',   workspaceName:'Operations',             workspaceLink:'/operations/health', description:'Shows compliance health indicators across all governed programs.', filterDescription:'Filtering to blueprint health', active:true },
      { workspaceId:'digital-twin', workspaceName:'Digital Twin',           workspaceLink:'/digital-twin',      description:'Shows relationship graph for this standard and all governed programs.', filterDescription:'Focusing on blueprint node', active:false },
      { workspaceId:'knowledge',    workspaceName:'Knowledge',              workspaceLink:'/knowledge',         description:'Shows blueprint as an authoritative standard in the knowledge registry.', filterDescription:'Showing blueprint in library', active:false },
    ],
    keyRelationships:['Governs all 5 programs','Module Blueprint (contains)','Lesson Blueprint (contains)','Penny Blueprint (contains)','Sprint Structure Adoption decision (informs)'],
    recentActivity:[
      { date:'v2.1 release',     action:'v2.1 released — Penny Integration Requirements added',   by:'Standards Lead' },
      { date:'Standards review', action:'Digital Compass compliance gap identified',              by:'Standards Studio' },
      { date:'v2.0 release',     action:'v2.0 released — Sprint Architecture adopted',           by:'Standards Lead' },
    ],
  },
  {
    id:'sf-program-engagement', objectTypeId:'salesforce-object', objectTypeName:'Salesforce Object',
    category:'Infrastructure Layer', categoryColor:'text-[#2F6B3F]', categoryBg:'bg-[#E6F0EA] border-[#9FC3AE]',
    name:'Salesforce Program Engagement', status:'Active', statusVariant:'active', health:'healthy', confidence:86,
    owner:'Salesforce Admin', workspaceLink:'/admin/salesforce-arch', profileId:'sf-program-engagement',
    description:'Program_Engagement__c — 247 active records. Primary learner enrollment and progress record.',
    workspaceImpacts: [
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/admin/salesforce-arch',description:'Shows Salesforce architecture and Program Engagement object details.', filterDescription:'Viewing SF architecture',    active:true },
      { workspaceId:'operations',   workspaceName:'Operations',             workspaceLink:'/operations',        description:'Shows data completeness, integrity errors, and sync status.', filterDescription:'Filtering to SF health',      active:true },
      { workspaceId:'digital-twin', workspaceName:'Digital Twin',           workspaceLink:'/digital-twin',      description:'Shows object node, relationships to Program and Contact objects.', filterDescription:'Focusing on SF object node',  active:false },
    ],
    keyRelationships:['Foundations Trail (maps to)','Contact (learner lookup)','Program__c (parent)','LMS sync (planned Q3)','PMM parallel mapping (in progress)'],
    recentActivity:[
      { date:'Q2 review',         action:'Quarterly data quality review — 94% completeness (Pass)', by:'Salesforce Admin' },
      { date:'Pre-cohort setup',  action:'Health_Score__c field added',                               by:'Salesforce Admin' },
      { date:'Pre-cohort',        action:'PMM parallel record gap identified (23 learners)',          by:'Operations Lead' },
    ],
  },
  {
    id:'slack-foundations-cohort', objectTypeId:'communication-channel', objectTypeName:'Communication Channel',
    category:'Infrastructure Layer', categoryColor:'text-[#2F6B3F]', categoryBg:'bg-[#E6F0EA] border-[#9FC3AE]',
    name:'#foundations-cohort-2', status:'Active', statusVariant:'active', health:'healthy', confidence:86,
    owner:'Comms Lead', workspaceLink:'/collaboration/channels', profileId:undefined,
    description:'Primary Slack channel for FT Cohort 2 learners. 13 members. Penny broadcasts active.',
    workspaceImpacts: [
      { workspaceId:'collaboration',workspaceName:'Collaboration',          workspaceLink:'/collaboration/channels', description:'Shows channel details, members, message templates, and broadcast schedule.', filterDescription:'Viewing cohort channel', active:true },
      { workspaceId:'penny',        workspaceName:'Penny',                  workspaceLink:'/penny',                 description:'Shows Penny broadcasts and learner nudges scheduled for this channel.', filterDescription:'Filtering to channel Penny', active:true },
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/program',               description:'Shows the cohort and program this channel serves.', filterDescription:'Linking to FT Cohort 2', active:false },
    ],
    keyRelationships:['FT Cohort 2 (serves)','Sprint Calendar (triggers broadcasts)','Penny Broadcasts (dependent)','Coach — 3 members'],
    recentActivity:[
      { date:'Sprint 3, Week 1',  action:'Sprint 3 kick-off message posted',   by:'Program Manager' },
      { date:'Sprint 2, Week 8',  action:'Sprint 2 results announcement',      by:'Penny AI' },
      { date:'Pre-Sprint 1',      action:'Channel created for Cohort 2',       by:'Comms Lead' },
    ],
  },
  {
    id:'foundations-trail-drive', objectTypeId:'google-drive-resource', objectTypeName:'Google Drive Resource',
    category:'Infrastructure Layer', categoryColor:'text-[#2F6B3F]', categoryBg:'bg-[#E6F0EA] border-[#9FC3AE]',
    name:'Foundations Trail Drive Folder', status:'Active', statusVariant:'active', health:'needs-attention', confidence:79,
    owner:'Program Manager', workspaceLink:'/program/resources', profileId:'foundations-trail-drive',
    description:'Root Drive folder for FT curriculum. Access review overdue. 2 naming convention violations.',
    workspaceImpacts: [
      { workspaceId:'program',      workspaceName:'Program & Curriculum',   workspaceLink:'/program/resources',  description:'Shows program resources and Drive folder structure.', filterDescription:'Viewing FT Drive resources', active:true },
      { workspaceId:'knowledge',    workspaceName:'Knowledge',              workspaceLink:'/knowledge',          description:'Shows knowledge sources and articles stored in this Drive folder.', filterDescription:'Filtering to Drive knowledge', active:false },
      { workspaceId:'operations',   workspaceName:'Operations',             workspaceLink:'/operations/health',  description:'Shows access control health and naming convention compliance indicators.', filterDescription:'Showing Drive health', active:false },
    ],
    keyRelationships:['Foundations Trail (sources)','Sprint Archives (sub-folder)','Curriculum (sub-folder)','SF Program__c (linked via URL field)'],
    recentActivity:[
      { date:'Sprint 3, Week 1',  action:'Access control review flagged as overdue', by:'Standards Studio' },
      { date:'Sprint 3 start',    action:'Sprint 3 LinkedIn module updated',          by:'Curriculum Lead' },
      { date:'Pre-Sprint 1',      action:'Cohort 2 folder created',                   by:'Program Manager' },
    ],
  },
];

export const CONTEXT_MAP = Object.fromEntries(EXAMPLE_CONTEXTS.map(c => [c.id, c]));
