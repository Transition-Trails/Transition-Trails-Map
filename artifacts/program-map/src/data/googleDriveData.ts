// ── Google Drive Integration Center — Data Layer ─────────────────────────────
// Drives folders and files as first-class Trail OS objects.

export type DriveFileType   = 'Document' | 'Spreadsheet' | 'Presentation' | 'PDF' | 'Folder' | 'Form' | 'Video' | 'Image' | 'Other';
export type FolderStatus    = 'active' | 'planning' | 'archived' | 'unmapped';
export type TrustLevel      = 'Authoritative' | 'Reference' | 'Draft' | 'Unreviewed' | 'Deprecated';
export type PermLevel       = 'Owner' | 'Editor' | 'Commenter' | 'Viewer' | 'None';
export type DriveCheckStatus = 'pass' | 'fail' | 'warning' | 'pending';

export interface DriveValidationCheck {
  id: string;
  category: 'Credentials' | 'Permissions' | 'Folder Access' | 'File Access' | 'OAuth';
  label: string;
  status: DriveCheckStatus;
  detail: string;
  impact: string;
  fix?: string;
}

export interface ProgramFolder {
  id: string;
  programId: string;
  programName: string;
  programStatus: 'active' | 'planning' | 'complete';
  drivePath: string;
  folderId?: string;
  status: FolderStatus;
  owner: string;
  fileCount: number;
  trustLevel: TrustLevel;
  subFolders: SubFolder[];
  lastSynced: string;
  notes: string;
}

export interface SubFolder {
  name: string;
  purpose: string;
  fileCount: number;
  status: FolderStatus;
}

export interface DriveFile {
  id: string;
  name: string;
  fileType: DriveFileType;
  programId: string;
  programName: string;
  folder: string;
  owner: string;
  lastModified: string;
  trustLevel: TrustLevel;
  size: string;
  status: 'current' | 'stale' | 'draft' | 'archived';
  uomMappings: string[];
  pennyMappings: string[];
  knowledgeMappings: string[];
  permissionLevel: PermLevel;
  notes: string;
}

export interface ContentMapping {
  fileId: string;
  fileName: string;
  mappings: ContentMappingEntry[];
}

export interface ContentMappingEntry {
  targetType: 'Program' | 'Sprint' | 'Module' | 'Lesson' | 'Assessment' | 'Standard' | 'Knowledge Source' | 'Salesforce Object';
  targetId: string;
  targetName: string;
  relationship: string;
  confidence: 'High' | 'Medium' | 'Low';
  mappingStatus: 'Mapped' | 'Partial' | 'Unverified';
}

export interface PennySourceMapping {
  capabilityId: string;
  capabilityName: string;
  domain: string;
  sources: PennySourceEntry[];
  sourceReadiness: 'Ready' | 'Partial' | 'Missing' | 'Blocked';
}

export interface PennySourceEntry {
  fileId: string;
  fileName: string;
  fileType: DriveFileType;
  role: 'Primary Source' | 'Supporting' | 'Template' | 'Reference';
  trustLevel: TrustLevel;
  lastSynced: string;
  syncStatus: 'Synced' | 'Pending' | 'Stale' | 'Not Configured';
}

export interface KnowledgeSourceMapping {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  driveFiles: KnowledgeFileLink[];
  completeness: number;
  status: 'Mapped' | 'Partial' | 'Unmapped';
}

export interface KnowledgeFileLink {
  fileId: string;
  fileName: string;
  fileType: DriveFileType;
  trustLevel: TrustLevel;
  relationship: string;
}

export interface DriveGovernanceIssue {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Missing Owner' | 'Stale Content' | 'Permission' | 'Duplicate' | 'Unmapped' | 'Archival';
  title: string;
  detail: string;
  affectedObjects: string[];
  resolution: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export interface DriveTestCase {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending' | 'blocked';
  result: string;
  blockedBy?: string;
}

export interface DriveTestSuite {
  id: string;
  name: string;
  category: string;
  description: string;
  tests: DriveTestCase[];
}

export interface DriveHealthScore {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'ready' | 'partial' | 'not-ready';
  note: string;
  items: { label: string; status: 'pass' | 'partial' | 'fail'; note: string }[];
}

// ── Validation Checks ─────────────────────────────────────────────────────────

export const DRIVE_VALIDATION_CHECKS: DriveValidationCheck[] = [
  { id:'dv-01', category:'Credentials', label:'GOOGLE_CLIENT_ID configured',        status:'pass',    detail:'GOOGLE_CLIENT_ID is set and format-verified (*.apps.googleusercontent.com) — confirmed by secrets audit.',  impact:'OAuth 2.0 flow can be initiated for Google Drive.',               fix:'' },
  { id:'dv-02', category:'Credentials', label:'GOOGLE_CLIENT_SECRET configured',    status:'pass',    detail:'GOOGLE_CLIENT_SECRET is set and format-verified — confirmed by secrets audit.',                           impact:'OAuth 2.0 authentication can proceed.',                           fix:'' },
  { id:'dv-03', category:'Credentials', label:'GOOGLE_DRIVE_REFRESH_TOKEN set',     status:'fail',    detail:'Refresh token not configured. Client ID/Secret are ready — OAuth flow has not been completed yet.',        impact:'Drive sessions cannot be established without a refresh token.',    fix:'Complete OAuth flow with drive.readonly and drive.file scopes. Store the resulting refresh token as GOOGLE_DRIVE_REFRESH_TOKEN.' },
  { id:'dv-04', category:'OAuth',       label:'Drive API enabled in Google Cloud',  status:'warning', detail:'Drive API status cannot be confirmed without credentials.',       impact:'Even with OAuth, API calls will fail if Drive API is not enabled.', fix:'Enable Google Drive API in Google Cloud Console → APIs & Services → Library.' },
  { id:'dv-05', category:'OAuth',       label:'OAuth consent screen configured',    status:'warning', detail:'Consent screen status unverifiable without credentials.',         impact:'OAuth flow will fail for external users if consent screen is missing.', fix:'Configure OAuth consent screen in Google Cloud Console → APIs & Services → OAuth consent screen.' },
  { id:'dv-06', category:'OAuth',       label:'Required scopes declared',           status:'warning', detail:'Scopes: drive.readonly, drive.file, drive.metadata.readonly need to be declared.', impact:'Missing scopes will cause permission errors on API calls.', fix:'Add required scopes to OAuth consent screen and credential configuration.' },
  { id:'dv-07', category:'Permissions', label:'Read access to shared Drive',        status:'pending', detail:'Cannot verify until credentials are configured.',                impact:'Cannot read program folders or file listings.',                   fix:'After OAuth setup, grant service account access to Transition Trails shared Drive.' },
  { id:'dv-08', category:'Permissions', label:'Write access for Penny sources',     status:'pending', detail:'Penny source sync requires write access to designated folder.',   impact:'Penny source material uploads and sync will be blocked.',          fix:'Grant write access to /Transition Trails/Penny Sources/ folder.' },
  { id:'dv-09', category:'Folder Access', label:'Program root folder accessible',  status:'pending', detail:'Cannot test folder access without active credentials.',           impact:'Program Folder Registry cannot be populated from live Drive.',     fix:'After OAuth, verify access to /Transition Trails/Programs/.' },
  { id:'dv-10', category:'Folder Access', label:'Template folder accessible',       status:'pending', detail:'Template folder access not verified.',                           impact:'Template sync and Penny template sources unavailable.',            fix:'Verify access to /Transition Trails/Templates/ folder.' },
  { id:'dv-11', category:'File Access', label:'File listing available',             status:'pending', detail:'Cannot list files without folder access.',                       impact:'File & Asset Catalog cannot be populated from live Drive.',        fix:'Complete OAuth and folder access configuration.' },
  { id:'dv-12', category:'File Access', label:'File metadata readable',             status:'pending', detail:'Metadata (owner, modified date, permissions) requires drive.metadata.readonly scope.', impact:'Governance checks and staleness detection will be limited.', fix:'Ensure drive.metadata.readonly scope is included.' },
];

// ── Program Folder Registry ───────────────────────────────────────────────────

export const PROGRAM_FOLDERS: ProgramFolder[] = [
  {
    id: 'pf-foundations',
    programId: 'foundations-trail',
    programName: 'Foundations Trail',
    programStatus: 'active',
    drivePath: '/Transition Trails/Programs/Foundations Trail/',
    folderId: 'gdrive_ft_001',
    status: 'active',
    owner: 'Program Lead',
    fileCount: 34,
    trustLevel: 'Authoritative',
    lastSynced: 'Not yet synced (credentials pending)',
    notes: 'Primary program folder. Contains all curriculum, cohort materials, and assessments. Most complete folder structure.',
    subFolders: [
      { name:'Curriculum',         purpose:'Sprint-by-sprint curriculum documents, module guides',     fileCount:12, status:'active' },
      { name:'Cohort 2 Materials', purpose:'Active cohort session materials, sprint trackers',         fileCount:8,  status:'active' },
      { name:'Assessments',        purpose:'Assessment rubrics, evaluation criteria, answer keys',     fileCount:6,  status:'active' },
      { name:'Facilitator Guides', purpose:'Coach and facilitator preparation materials',              fileCount:4,  status:'active' },
      { name:'Templates',          purpose:'Reusable templates for sprint activities',                fileCount:2,  status:'active' },
      { name:'Standards',          purpose:'Learning standards alignment documents',                  fileCount:2,  status:'active' },
    ],
  },
  {
    id: 'pf-guided',
    programId: 'guided-trail',
    programName: 'Guided Trail',
    programStatus: 'active',
    drivePath: '/Transition Trails/Programs/Guided Trail/',
    folderId: 'gdrive_gt_001',
    status: 'active',
    owner: 'Program Lead',
    fileCount: 21,
    trustLevel: 'Authoritative',
    lastSynced: 'Not yet synced (credentials pending)',
    notes: 'Active program folder. Cohort 1 materials complete. Some assessment materials still in draft.',
    subFolders: [
      { name:'Curriculum',          purpose:'Module guides and sprint content',     fileCount:8,  status:'active'  },
      { name:'Cohort 1 Materials',  purpose:'Active cohort sprint trackers',        fileCount:6,  status:'active'  },
      { name:'Assessments',         purpose:'Assessment rubrics — some in draft',   fileCount:4,  status:'active'  },
      { name:'Facilitator Guides',  purpose:'Facilitator preparation materials',    fileCount:3,  status:'active'  },
    ],
  },
  {
    id: 'pf-explorers',
    programId: 'explorers-trail',
    programName: "Explorer's Trail",
    programStatus: 'active',
    drivePath: "/Transition Trails/Programs/Explorer's Trail/",
    folderId: 'gdrive_et_001',
    status: 'active',
    owner: 'Program Lead',
    fileCount: 17,
    trustLevel: 'Reference',
    lastSynced: 'Not yet synced (credentials pending)',
    notes: "Active program with Cohort 3. Folder structure is partially complete. Assessments folder missing — items stored in Curriculum folder.",
    subFolders: [
      { name:'Curriculum',        purpose:'Module guides and sprint content',       fileCount:9,  status:'active'  },
      { name:'Cohort 3 Materials',purpose:'Active cohort materials',               fileCount:5,  status:'active'  },
      { name:'Facilitator Guides',purpose:'Facilitator preparation materials',     fileCount:3,  status:'active'  },
    ],
  },
  {
    id: 'pf-mastery',
    programId: 'trail-of-mastery',
    programName: 'Trail of Mastery',
    programStatus: 'planning',
    drivePath: '/Transition Trails/Programs/Trail of Mastery/',
    folderId: undefined,
    status: 'planning',
    owner: 'Unassigned',
    fileCount: 4,
    trustLevel: 'Draft',
    lastSynced: 'Not yet synced (credentials pending)',
    notes: 'Planning phase. Folder not yet created in Drive. 4 draft documents exist in root program folder.',
    subFolders: [],
  },
  {
    id: 'pf-digital-compass',
    programId: 'digital-compass',
    programName: 'Digital Compass',
    programStatus: 'planning',
    drivePath: '/Transition Trails/Programs/Digital Compass/',
    folderId: undefined,
    status: 'planning',
    owner: 'Unassigned',
    fileCount: 2,
    trustLevel: 'Draft',
    lastSynced: 'Not yet synced (credentials pending)',
    notes: 'Early planning phase. No folder structure established yet.',
    subFolders: [],
  },
];

// ── File & Asset Catalog ──────────────────────────────────────────────────────

export const DRIVE_FILES: DriveFile[] = [
  { id:'f-01', name:'Foundations Trail Program Blueprint v2', fileType:'PDF',          programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Curriculum',         owner:'Program Lead',  lastModified:'3 days ago',   trustLevel:'Authoritative', size:'2.4 MB', status:'current',  uomMappings:['foundations-trail','program-standard'], pennyMappings:['module-generation','knowledge-retrieval'], knowledgeMappings:['ft-program-blueprint'], permissionLevel:'Viewer', notes:'Primary source of truth for Foundations Trail program standards.' },
  { id:'f-02', name:'FT Sprint 3 — Resume Writing Session Guide', fileType:'Document',  programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Facilitator Guides',  owner:'Program Lead',  lastModified:'1 week ago',   trustLevel:'Authoritative', size:'180 KB', status:'current',  uomMappings:['sprint-3','module-resume-writing'], pennyMappings:['resume-review','learner-coaching'], knowledgeMappings:['ft-facilitator-guides'], permissionLevel:'Viewer', notes:'Facilitator guide for Sprint 3 resume writing workshop.' },
  { id:'f-03', name:'Resume Review Rubric — Salesforce Roles', fileType:'Spreadsheet', programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Assessments',        owner:'Program Lead',  lastModified:'2 weeks ago',  trustLevel:'Authoritative', size:'95 KB',  status:'current',  uomMappings:['assessment-resume-review','sprint-3'], pennyMappings:['resume-review'], knowledgeMappings:['ft-assessments'], permissionLevel:'Viewer', notes:'Rubric used by Penny Resume Review for evaluation criteria.' },
  { id:'f-04', name:'Sprint 3 Weekly Reflection Prompts', fileType:'Document',          programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Curriculum',         owner:'Curriculum Designer', lastModified:'5 days ago', trustLevel:'Authoritative', size:'62 KB', status:'current',  uomMappings:['sprint-3','lesson-reflection'], pennyMappings:['weekly-reflection','learner-coaching'], knowledgeMappings:['ft-curriculum'], permissionLevel:'Viewer', notes:'Primary source for Penny weekly reflection prompt generation.' },
  { id:'f-05', name:'Salesforce Admin Certification Study Guide', fileType:'PDF',       programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Curriculum',         owner:'Program Lead',  lastModified:'1 month ago',  trustLevel:'Reference',     size:'4.2 MB', status:'current',  uomMappings:['module-salesforce-admin','sprint-4'], pennyMappings:['knowledge-retrieval','resume-review'], knowledgeMappings:['sf-certification-guide'], permissionLevel:'Viewer', notes:'External reference — Salesforce official study guide (v2024).' },
  { id:'f-06', name:'FT Cohort 2 Sprint Tracker', fileType:'Spreadsheet',              programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Cohort 2 Materials', owner:'Program Lead',  lastModified:'2 days ago',   trustLevel:'Authoritative', size:'145 KB', status:'current',  uomMappings:['cohort-ft-2','sprint-3'], pennyMappings:['executive-briefs','coach-support'], knowledgeMappings:[], permissionLevel:'Editor', notes:'Live sprint tracker for active cohort. Updated weekly.' },
  { id:'f-07', name:'Coach Brief Template', fileType:'Document',                        programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Templates',          owner:'Penny Lead',    lastModified:'3 weeks ago',  trustLevel:'Authoritative', size:'48 KB',  status:'current',  uomMappings:['prompt-template-coach-brief'], pennyMappings:['coach-support'], knowledgeMappings:['penny-templates'], permissionLevel:'Viewer', notes:'Base template used by Penny Chief of Staff for coach brief generation.' },
  { id:'f-08', name:'Weekly Reflection Template', fileType:'Document',                  programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Templates',          owner:'Penny Lead',    lastModified:'2 weeks ago',  trustLevel:'Authoritative', size:'42 KB',  status:'current',  uomMappings:['prompt-template-reflection'], pennyMappings:['weekly-reflection'], knowledgeMappings:['penny-templates'], permissionLevel:'Viewer', notes:'Base template for Penny learning coach weekly reflection prompts.' },
  { id:'f-09', name:'Learning Standards Framework v3', fileType:'PDF',                  programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Standards',          owner:'Program Lead',  lastModified:'6 weeks ago',  trustLevel:'Authoritative', size:'890 KB', status:'current',  uomMappings:['learning-standard-salesforce','program-standard'], pennyMappings:['module-generation','knowledge-retrieval'], knowledgeMappings:['learning-standards'], permissionLevel:'Viewer', notes:'Authoritative learning standards document for all Foundations Trail content.' },
  { id:'f-10', name:'GT Module 1 — Intro to Salesforce', fileType:'Document',           programId:'guided-trail',       programName:'Guided Trail',       folder:'Curriculum',         owner:'Curriculum Designer', lastModified:'1 week ago', trustLevel:'Authoritative', size:'220 KB', status:'current',  uomMappings:['module-gt-01','sprint-gt-1'], pennyMappings:['module-generation','learner-coaching'], knowledgeMappings:['gt-curriculum'], permissionLevel:'Viewer', notes:'Guided Trail opening module guide.' },
  { id:'f-11', name:'GT Cohort 1 Assessment Rubric', fileType:'Spreadsheet',            programId:'guided-trail',       programName:'Guided Trail',       folder:'Assessments',        owner:'Program Lead',  lastModified:'2 weeks ago',  trustLevel:'Draft',         size:'88 KB',  status:'draft',    uomMappings:['assessment-gt-intro'], pennyMappings:['resume-review'], knowledgeMappings:['gt-assessments'], permissionLevel:'Viewer', notes:'Draft rubric pending curriculum designer review.' },
  { id:'f-12', name:"ET Cohort 3 Sprint 1 Kickoff Materials", fileType:'Presentation',  programId:'explorers-trail',    programName:"Explorer's Trail",   folder:'Cohort 3 Materials', owner:'Program Lead',  lastModified:'4 days ago',   trustLevel:'Reference',     size:'3.1 MB', status:'current',  uomMappings:['cohort-et-3','sprint-et-1'], pennyMappings:['learner-coaching'], knowledgeMappings:['et-cohort-3'], permissionLevel:'Viewer', notes:'Sprint 1 kickoff presentation for active cohort.' },
  { id:'f-13', name:'Executive Brief Template', fileType:'Document',                    programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Templates',          owner:'Standards Lead',lastModified:'5 weeks ago',  trustLevel:'Draft',         size:'51 KB',  status:'draft',    uomMappings:['prompt-template-exec-brief'], pennyMappings:['executive-briefs'], knowledgeMappings:['penny-templates'], permissionLevel:'Viewer', notes:'Draft template pending approval. Exec Brief capability blocked until approved.' },
  { id:'f-14', name:'Trail of Mastery Overview Draft', fileType:'Document',              programId:'trail-of-mastery',   programName:'Trail of Mastery',   folder:'(Root)',             owner:'Unassigned',    lastModified:'2 months ago', trustLevel:'Draft',         size:'78 KB',  status:'stale',    uomMappings:['trail-of-mastery'], pennyMappings:[], knowledgeMappings:[], permissionLevel:'Viewer', notes:'Stale overview document with no assigned owner.' },
  { id:'f-15', name:'Coaching Escalation Protocol', fileType:'PDF',                     programId:'foundations-trail',  programName:'Foundations Trail',  folder:'Facilitator Guides', owner:'Program Lead',  lastModified:'3 weeks ago',  trustLevel:'Authoritative', size:'126 KB', status:'current',  uomMappings:['penny-cap-escalation'], pennyMappings:['coaching-escalation'], knowledgeMappings:['coaching-protocols'], permissionLevel:'Viewer', notes:'Protocol document used by Penny Coaching Escalation capability.' },
];

// ── Content Mappings ──────────────────────────────────────────────────────────

export const CONTENT_MAPPINGS: ContentMapping[] = [
  {
    fileId: 'f-01',
    fileName: 'Foundations Trail Program Blueprint v2',
    mappings: [
      { targetType:'Program',           targetId:'foundations-trail',     targetName:'Foundations Trail',           relationship:'Defines program standard',    confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Standard',          targetId:'program-standard-ft',   targetName:'FT Learning Standards',       relationship:'Authoritative source',         confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Knowledge Source',  targetId:'ft-program-blueprint',  targetName:'FT Program Blueprint (KS)',   relationship:'Source document',              confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Salesforce Object', targetId:'sf-program-record',     targetName:'Foundations Trail (SF)',      relationship:'Referenced by SF Program record',confidence:'Medium',mappingStatus:'Partial' },
    ],
  },
  {
    fileId: 'f-03',
    fileName: 'Resume Review Rubric — Salesforce Roles',
    mappings: [
      { targetType:'Assessment',        targetId:'assessment-resume-review',targetName:'Resume Review Assessment',  relationship:'Primary rubric',               confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Sprint',            targetId:'sprint-3-ft',            targetName:'Sprint 3 — Resume Writing',  relationship:'Used in sprint',               confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Knowledge Source',  targetId:'ft-assessments',         targetName:'FT Assessments (KS)',        relationship:'Source material',              confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Salesforce Object', targetId:'sf-assessment',          targetName:'Salesforce Assessment Record',relationship:'Sync target',                 confidence:'Low',    mappingStatus:'Unverified' },
    ],
  },
  {
    fileId: 'f-04',
    fileName: 'Sprint 3 Weekly Reflection Prompts',
    mappings: [
      { targetType:'Sprint',            targetId:'sprint-3-ft',           targetName:'Sprint 3 — Resume Writing',  relationship:'Reflection prompts for sprint',confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Lesson',            targetId:'lesson-reflection-ft3', targetName:'Weekly Reflection (FT S3)', relationship:'Source content',               confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Knowledge Source',  targetId:'ft-curriculum',         targetName:'FT Curriculum (KS)',         relationship:'Source material',              confidence:'High',   mappingStatus:'Mapped' },
    ],
  },
  {
    fileId: 'f-09',
    fileName: 'Learning Standards Framework v3',
    mappings: [
      { targetType:'Standard',          targetId:'ls-salesforce',         targetName:'Salesforce Learning Standard', relationship:'Defines standard',           confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Program',           targetId:'foundations-trail',     targetName:'Foundations Trail',           relationship:'Governs program standards',    confidence:'High',   mappingStatus:'Mapped' },
      { targetType:'Knowledge Source',  targetId:'learning-standards',    targetName:'Learning Standards (KS)',     relationship:'Authoritative source',         confidence:'High',   mappingStatus:'Mapped' },
    ],
  },
  {
    fileId: 'f-11',
    fileName: 'GT Cohort 1 Assessment Rubric',
    mappings: [
      { targetType:'Assessment',        targetId:'assessment-gt-intro',   targetName:'GT Intro Assessment',         relationship:'Draft rubric',                 confidence:'Medium', mappingStatus:'Partial' },
      { targetType:'Program',           targetId:'guided-trail',          targetName:'Guided Trail',                relationship:'Associated program',           confidence:'High',   mappingStatus:'Mapped' },
    ],
  },
];

// ── Penny Source Mapping ──────────────────────────────────────────────────────

export const PENNY_SOURCE_MAPPINGS: PennySourceMapping[] = [
  {
    capabilityId: 'resume-review',
    capabilityName: 'Resume Review',
    domain: 'Career',
    sourceReadiness: 'Ready',
    sources: [
      { fileId:'f-03', fileName:'Resume Review Rubric — Salesforce Roles', fileType:'Spreadsheet', role:'Primary Source', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-02', fileName:'FT Sprint 3 — Resume Writing Session Guide', fileType:'Document', role:'Supporting', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-05', fileName:'Salesforce Admin Certification Study Guide', fileType:'PDF', role:'Reference', trustLevel:'Reference', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'weekly-reflection',
    capabilityName: 'Weekly Reflection',
    domain: 'Coaching',
    sourceReadiness: 'Ready',
    sources: [
      { fileId:'f-04', fileName:'Sprint 3 Weekly Reflection Prompts', fileType:'Document', role:'Primary Source', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-08', fileName:'Weekly Reflection Template', fileType:'Document', role:'Template', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'learner-coaching',
    capabilityName: 'Learner Coaching',
    domain: 'Coaching',
    sourceReadiness: 'Partial',
    sources: [
      { fileId:'f-04', fileName:'Sprint 3 Weekly Reflection Prompts', fileType:'Document', role:'Supporting', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-02', fileName:'FT Sprint 3 — Resume Writing Session Guide', fileType:'Document', role:'Supporting', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-15', fileName:'Coaching Escalation Protocol', fileType:'PDF', role:'Reference', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'knowledge-retrieval',
    capabilityName: 'Knowledge Retrieval',
    domain: 'Learning',
    sourceReadiness: 'Partial',
    sources: [
      { fileId:'f-01', fileName:'Foundations Trail Program Blueprint v2', fileType:'PDF', role:'Primary Source', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-09', fileName:'Learning Standards Framework v3', fileType:'PDF', role:'Primary Source', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-05', fileName:'Salesforce Admin Certification Study Guide', fileType:'PDF', role:'Reference', trustLevel:'Reference', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'module-generation',
    capabilityName: 'Module Generation',
    domain: 'Learning',
    sourceReadiness: 'Missing',
    sources: [
      { fileId:'f-01', fileName:'Foundations Trail Program Blueprint v2', fileType:'PDF', role:'Reference', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
      { fileId:'f-09', fileName:'Learning Standards Framework v3', fileType:'PDF', role:'Reference', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
  {
    capabilityId: 'coaching-escalation',
    capabilityName: 'Coaching Escalation',
    domain: 'Coaching',
    sourceReadiness: 'Ready',
    sources: [
      { fileId:'f-15', fileName:'Coaching Escalation Protocol', fileType:'PDF', role:'Primary Source', trustLevel:'Authoritative', lastSynced:'Not yet synced', syncStatus:'Pending' },
    ],
  },
];

// ── Knowledge Source Mapping ──────────────────────────────────────────────────

export const KNOWLEDGE_SOURCE_MAPPINGS: KnowledgeSourceMapping[] = [
  { sourceId:'ft-program-blueprint', sourceName:'FT Program Blueprint', sourceType:'Program Documentation', completeness:90, status:'Mapped',   driveFiles:[{ fileId:'f-01', fileName:'Foundations Trail Program Blueprint v2', fileType:'PDF', trustLevel:'Authoritative', relationship:'Primary source' }] },
  { sourceId:'ft-curriculum',        sourceName:'FT Curriculum',        sourceType:'Curriculum',             completeness:75, status:'Partial',  driveFiles:[{ fileId:'f-04', fileName:'Sprint 3 Weekly Reflection Prompts', fileType:'Document', trustLevel:'Authoritative', relationship:'Sprint 3 component' }, { fileId:'f-02', fileName:'FT Sprint 3 Session Guide', fileType:'Document', trustLevel:'Authoritative', relationship:'Facilitator guide' }] },
  { sourceId:'ft-assessments',       sourceName:'FT Assessments',       sourceType:'Assessment Materials',  completeness:80, status:'Mapped',   driveFiles:[{ fileId:'f-03', fileName:'Resume Review Rubric', fileType:'Spreadsheet', trustLevel:'Authoritative', relationship:'Primary rubric' }] },
  { sourceId:'learning-standards',   sourceName:'Learning Standards',   sourceType:'Standards Framework',   completeness:95, status:'Mapped',   driveFiles:[{ fileId:'f-09', fileName:'Learning Standards Framework v3', fileType:'PDF', trustLevel:'Authoritative', relationship:'Authoritative source' }] },
  { sourceId:'penny-templates',      sourceName:'Penny Templates',      sourceType:'Template Library',       completeness:60, status:'Partial',  driveFiles:[{ fileId:'f-07', fileName:'Coach Brief Template', fileType:'Document', trustLevel:'Authoritative', relationship:'Coach brief template' }, { fileId:'f-08', fileName:'Weekly Reflection Template', fileType:'Document', trustLevel:'Authoritative', relationship:'Reflection template' }, { fileId:'f-13', fileName:'Executive Brief Template', fileType:'Document', trustLevel:'Draft', relationship:'Draft exec template' }] },
  { sourceId:'gt-curriculum',        sourceName:'GT Curriculum',        sourceType:'Curriculum',             completeness:55, status:'Partial',  driveFiles:[{ fileId:'f-10', fileName:'GT Module 1 — Intro to Salesforce', fileType:'Document', trustLevel:'Authoritative', relationship:'Module 1 content' }] },
  { sourceId:'coaching-protocols',   sourceName:'Coaching Protocols',   sourceType:'Operations',            completeness:85, status:'Mapped',   driveFiles:[{ fileId:'f-15', fileName:'Coaching Escalation Protocol', fileType:'PDF', trustLevel:'Authoritative', relationship:'Escalation protocol' }] },
];

// ── Governance Issues ─────────────────────────────────────────────────────────

export const DRIVE_GOVERNANCE_ISSUES: DriveGovernanceIssue[] = [
  { id:'dgi-01', severity:'Critical', category:'Missing Owner',   title:'Trail of Mastery folder has no owner',           detail:'4 documents in Trail of Mastery root folder have no assigned owner in Trail OS or Google Drive.',           affectedObjects:['Trail of Mastery Folder','Trail of Mastery Overview Draft'],                            resolution:'Assign Program Lead as owner in both Drive and Trail OS. Create folder structure once program enters active planning.', status:'Open' },
  { id:'dgi-02', severity:'Critical', category:'Missing Owner',   title:'Digital Compass has no owner or folder',          detail:'Digital Compass has 2 draft documents with no owner and no folder structure in Drive.',                     affectedObjects:['Digital Compass Draft Documents'],                                                          resolution:'Assign owner and create Drive folder structure: /Transition Trails/Programs/Digital Compass/', status:'Open' },
  { id:'dgi-03', severity:'High',     category:'Stale Content',   title:'Trail of Mastery Overview Draft is stale (60d+)', detail:"Trail of Mastery Overview Draft has not been modified in 2+ months with Draft trust level and no owner.",  affectedObjects:['Trail of Mastery Overview Draft (f-14)'],                                                   resolution:'Assign owner to review and either update to current or archive the document.', status:'Open' },
  { id:'dgi-04', severity:'Medium',   category:'Permission',      title:'Google Drive refresh token missing',               detail:'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured and verified. Only GOOGLE_DRIVE_REFRESH_TOKEN is missing — the OAuth flow has not been completed yet.',  affectedObjects:['All Program Folders','All Drive Files'],                                                    resolution:'Complete Google OAuth flow with drive.readonly and drive.file scopes. Store the refresh token as GOOGLE_DRIVE_REFRESH_TOKEN.', status:'Open' },
  { id:'dgi-05', severity:'High',     category:'Unmapped',        title:"Explorer's Trail missing Assessments folder",     detail:"Explorer's Trail has no Assessments subfolder. Assessment documents are mixed into Curriculum folder.",   affectedObjects:["Explorer's Trail Folder"],                                                                  resolution:"Create /Assessments/ subfolder in Explorer's Trail Drive folder and move assessment documents.", status:'Open' },
  { id:'dgi-06', severity:'Medium',   category:'Stale Content',   title:'GT Cohort 1 Assessment Rubric is in Draft status', detail:'Assessment rubric for Guided Trail Cohort 1 has been in Draft for 2+ weeks pending review.',            affectedObjects:['GT Cohort 1 Assessment Rubric (f-11)'],                                                     resolution:'Curriculum Designer to complete review and update trust level to Authoritative.', status:'In Progress' },
  { id:'dgi-07', severity:'Medium',   category:'Unmapped',        title:'Executive Brief Template not approved',           detail:'Executive Brief Template is in Draft status and not yet approved, blocking Executive Briefs capability.',  affectedObjects:['Executive Brief Template (f-13)','Executive Briefs Penny Capability'],                      resolution:'Standards Lead to review and approve template. Update trust level to Authoritative.', status:'In Progress' },
  { id:'dgi-08', severity:'Low',      category:'Missing Owner',   title:'2 files in Templates folder lack review dates',   detail:'Coach Brief Template and Weekly Reflection Template have no review date set.',                           affectedObjects:['Coach Brief Template (f-07)','Weekly Reflection Template (f-08)'],                          resolution:'Set review cadence (quarterly) and next review date for both templates.', status:'Open' },
];

// ── Test Suites ───────────────────────────────────────────────────────────────

export const DRIVE_TEST_SUITES: DriveTestSuite[] = [
  {
    id: 'ds-credentials', name: 'Account & Credentials', category: 'Credentials',
    description: 'Validates Google Drive API credentials and OAuth configuration.',
    tests: [
      { id:'dt-01', name:'GOOGLE_CLIENT_ID present',       description:'Verify GOOGLE_CLIENT_ID is set.', status:'pass',    result:'GOOGLE_CLIENT_ID confirmed present — format: *.apps.googleusercontent.com ✓' },
      { id:'dt-02', name:'GOOGLE_CLIENT_SECRET present',   description:'Verify GOOGLE_CLIENT_SECRET is set.', status:'pass', result:'GOOGLE_CLIENT_SECRET confirmed present — format plausible ✓' },
      { id:'dt-03', name:'Refresh token configured',       description:'Verify GOOGLE_DRIVE_REFRESH_TOKEN is set.', status:'fail', result:'Refresh token not found. Client credentials are ready — complete OAuth flow and store as GOOGLE_DRIVE_REFRESH_TOKEN.' },
      { id:'dt-04', name:'Drive API enabled',              description:'Verify Google Drive API is enabled in GCP.', status:'warning', result:'Cannot verify without credentials. Check GCP console.' },
      { id:'dt-05', name:'OAuth consent screen',           description:'Verify OAuth consent screen is configured.', status:'warning', result:'Cannot verify without credentials.' },
    ],
  },
  {
    id: 'ds-folder-access', name: 'Folder Access', category: 'Folder Access',
    description: 'Tests that Trail OS can access all required program folders.',
    tests: [
      { id:'dt-06', name:'Program root folder accessible', description:'Can list /Transition Trails/Programs/ contents.', status:'blocked', result:'Cannot test — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-07', name:'Foundations Trail folder',       description:'Can access /Programs/Foundations Trail/.', status:'blocked', result:'Cannot test — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-08', name:'Guided Trail folder',            description:'Can access /Programs/Guided Trail/.', status:'blocked', result:'Cannot test — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-09', name:'Templates folder',               description:'Can access /Transition Trails/Templates/.', status:'blocked', result:'Cannot test — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-10', name:'Penny Sources folder',           description:'Can read from /Transition Trails/Penny Sources/.', status:'blocked', result:'Cannot test — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
    ],
  },
  {
    id: 'ds-file-listing', name: 'File Listing', category: 'File Access',
    description: 'Tests file listing and metadata access.',
    tests: [
      { id:'dt-11', name:'List files in program folder',    description:'Can enumerate files in a program folder.', status:'blocked', result:'Blocked — no folder access.', blockedBy:'Folder access blocked' },
      { id:'dt-12', name:'Read file metadata',              description:'Can read owner, modified date, permissions.', status:'blocked', result:'Blocked — no folder access.', blockedBy:'Folder access blocked' },
      { id:'dt-13', name:'Search by keyword',               description:'Can search Drive for files by keyword.', status:'blocked', result:'Blocked — no folder access.', blockedBy:'Folder access blocked' },
    ],
  },
  {
    id: 'ds-permissions', name: 'Permission Checks', category: 'Permissions',
    description: 'Validates read, write, and share permissions for Drive objects.',
    tests: [
      { id:'dt-14', name:'Read permission — program files',  description:'Can read program curriculum documents.', status:'blocked', result:'Blocked — credentials missing.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-15', name:'Write permission — Penny sources', description:'Can write to designated Penny source folder.', status:'blocked', result:'Blocked — credentials missing.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'dt-16', name:'Metadata read permissions',        description:'drive.metadata.readonly scope active.', status:'blocked', result:'Blocked — credentials missing.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
    ],
  },
  {
    id: 'ds-mapping', name: 'Mapping Integrity', category: 'Mapping',
    description: 'Validates completeness of content, Penny source, and knowledge source mappings.',
    tests: [
      { id:'dt-17', name:'All programs have folder mappings',   description:'Every active program has a folder path.', status:'pass',    result:'5 of 5 programs have folder paths defined (2 planning without Drive folder ID).' },
      { id:'dt-18', name:'All Penny capabilities have sources', description:'Every active capability has at least one source file.', status:'warning', result:'5 of 6 capabilities have source files. Module Generation missing primary source.' },
      { id:'dt-19', name:'All knowledge sources have files',    description:'Every knowledge source has at least one Drive file mapped.', status:'pass',    result:'7 of 7 knowledge sources have at least one mapped Drive file.' },
      { id:'dt-20', name:'No orphaned files in catalog',        description:'All catalogued files are mapped to at least one UOM object.', status:'warning', result:'1 file (Trail of Mastery Overview Draft) has no UOM mappings.' },
    ],
  },
  {
    id: 'ds-governance', name: 'Source Governance', category: 'Governance',
    description: 'Validates trust levels, ownership, and content lifecycle.',
    tests: [
      { id:'dt-21', name:'All active files have owners',     description:'Every non-archived file has an assigned owner.', status:'fail',    result:'2 files have no owner: Trail of Mastery Overview Draft, Digital Compass documents.' },
      { id:'dt-22', name:'No stale Authoritative files',     description:'No Authoritative-trust files unmodified for 90+ days.', status:'pass', result:'All Authoritative files modified within 90 days.' },
      { id:'dt-23', name:'Draft files have review dates',    description:'All Draft-trust files have a review date set.', status:'fail',    result:'3 Draft files missing review dates: Executive Brief Template, GT Assessment Rubric, ToM Overview.' },
      { id:'dt-24', name:'No duplicate file names',          description:'No two files in the catalog share the same name.', status:'pass',    result:'No duplicate file names detected.' },
    ],
  },
  {
    id: 'ds-search', name: 'Search & Relationship Explorer', category: 'Search',
    description: 'Tests Global Search indexing and Relationship Explorer traversal for Drive objects.',
    tests: [
      { id:'dt-25', name:'Drive files indexed in Global Search', description:'Drive files appear in Global Search results.', status:'pending', result:'Files defined in catalog. Search indexing pending credential setup.' },
      { id:'dt-26', name:'Relationship Explorer — file to program', description:'Can traverse from file to program to cohort.', status:'pending', result:'Relationship graph defined. Live traversal pending API connection.' },
      { id:'dt-27', name:'Universal Object Profile renders',  description:'Object Profile renders for Drive file objects.', status:'pass',    result:'Object Profiles render correctly in Drive Object Profiles tab.' },
    ],
  },
];

// ── Health Scores ─────────────────────────────────────────────────────────────

export const DRIVE_HEALTH_SCORES: DriveHealthScore[] = [
  { dimension:'credentials', label:'Credentials & OAuth', score:0, maxScore:10, status:'not-ready', note:'All 3 required secrets missing', items:[{ label:'GOOGLE_CLIENT_ID', status:'fail', note:'Not set' },{ label:'GOOGLE_CLIENT_SECRET', status:'fail', note:'Not set' },{ label:'Refresh Token', status:'fail', note:'Not set' }] },
  { dimension:'folder-access', label:'Folder Access', score:2, maxScore:10, status:'not-ready', note:'5 folders mapped, 0 Drive-verified', items:[{ label:'Foundations Trail Folder', status:'partial', note:'Path defined, not Drive-verified' },{ label:'Guided Trail Folder', status:'partial', note:'Path defined, not Drive-verified' },{ label:'Explorer\'s Trail Folder', status:'partial', note:'Path defined, not Drive-verified' },{ label:'Trail of Mastery Folder', status:'fail', note:'Folder not created in Drive' },{ label:'Digital Compass Folder', status:'fail', note:'Folder not created in Drive' }] },
  { dimension:'file-mapping', label:'File Mapping Readiness', score:6, maxScore:10, status:'partial', note:'15 files catalogued, content mappings in place', items:[{ label:'Files in Catalog', status:'pass', note:'15 files across 5 programs' },{ label:'Content Mappings', status:'partial', note:'10 of 15 files fully mapped' },{ label:'Penny Source Links', status:'partial', note:'6 of 6 capabilities have sources' },{ label:'Knowledge Source Links', status:'pass', note:'7 of 7 sources have Drive files' }] },
  { dimension:'governance', label:'Governance Readiness', score:5, maxScore:10, status:'partial', note:'2 critical governance issues open', items:[{ label:'File Ownership', status:'partial', note:'2 files without owners' },{ label:'Trust Levels', status:'partial', note:'3 draft files pending review' },{ label:'Stale Content', status:'partial', note:'1 stale file (60+ days)' },{ label:'Folder Structure', status:'partial', note:"Explorer's Trail missing Assessments folder" }] },
  { dimension:'penny-sources', label:'Penny Source Readiness', score:5, maxScore:10, status:'partial', note:'Sources defined, sync pending credentials', items:[{ label:'Resume Review Sources', status:'pass', note:'3 sources mapped' },{ label:'Weekly Reflection Sources', status:'pass', note:'2 sources mapped' },{ label:'Learner Coaching Sources', status:'partial', note:'3 sources mapped' },{ label:'Module Generation Sources', status:'partial', note:'Missing primary source' }] },
  { dimension:'permissions', label:'Permissions Readiness', score:0, maxScore:10, status:'not-ready', note:'Cannot validate without credentials', items:[{ label:'Read Permissions', status:'fail', note:'Not verified' },{ label:'Write Permissions', status:'fail', note:'Not verified' },{ label:'Metadata Access', status:'fail', note:'Not verified' }] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getDriveValidationSummary() {
  const pass    = DRIVE_VALIDATION_CHECKS.filter(c => c.status === 'pass').length;
  const fail    = DRIVE_VALIDATION_CHECKS.filter(c => c.status === 'fail').length;
  const warning = DRIVE_VALIDATION_CHECKS.filter(c => c.status === 'warning').length;
  const pending = DRIVE_VALIDATION_CHECKS.filter(c => c.status === 'pending').length;
  return { pass, fail, warning, pending, total: DRIVE_VALIDATION_CHECKS.length };
}

export function getDriveGovernanceSummary() {
  const open = DRIVE_GOVERNANCE_ISSUES.filter(i => i.status !== 'Resolved');
  return {
    critical: open.filter(i => i.severity === 'Critical').length,
    high:     open.filter(i => i.severity === 'High').length,
    medium:   open.filter(i => i.severity === 'Medium').length,
    low:      open.filter(i => i.severity === 'Low').length,
    total:    DRIVE_GOVERNANCE_ISSUES.length,
  };
}

export function getDriveTestSummary() {
  const all     = DRIVE_TEST_SUITES.flatMap(s => s.tests);
  const pass    = all.filter(t => t.status === 'pass').length;
  const fail    = all.filter(t => t.status === 'fail').length;
  const blocked = all.filter(t => t.status === 'blocked').length;
  return { pass, fail, blocked, total: all.length, pct: Math.round((pass / all.length) * 100) };
}

export function getDriveHealthSummary() {
  const avg = Math.round(DRIVE_HEALTH_SCORES.reduce((s, h) => s + (h.score / h.maxScore) * 100, 0) / DRIVE_HEALTH_SCORES.length);
  return { avg, scores: DRIVE_HEALTH_SCORES };
}
