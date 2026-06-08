// ── Program Resources Data — Google Drive Workspace Configuration ─────────────
// Admin-configured Google Drive folder metadata per program.
// NO live Google Drive API integration — this is metadata management only.
// Live Google Drive integration is planned for Q4 2025.
//
// Architecture:
//   Google Drive = content repository (source files, slide decks, worksheets)
//   Salesforce   = system of record (metadata stored on Program_Resource__c)
//   Trail OS     = operating layer (displays Drive links + metadata)

export type DriveStatus      = 'active' | 'needs-setup' | 'archived' | 'pending';
export type PermissionsModel = 'program-team-only' | 'org-wide-view' | 'restricted' | 'external-partners' | 'not-set';
export type SyncStatus       = 'manual' | 'scheduled' | 'real-time' | 'not-configured';

export interface ProgramDriveResource {
  id: string;
  programId: string;
  programName: string;
  folderName: string;
  folderUrl: string;
  sharedDriveId?: string;
  owner: string;
  ownerEmail?: string;
  status: DriveStatus;
  description: string;
  permissionsModel: PermissionsModel;
  syncStatus: SyncStatus;
  contentTypes: string[];
  lastUpdated: string;
  createdBy: string;
  notes?: string;
  subFolders: { name: string; description: string; url?: string }[];
}

export const DRIVE_STATUS_CONFIG: Record<DriveStatus, { label: string; cls: string; description: string }> = {
  active:       { label: 'Active',       cls: 'text-green-700 bg-green-50 border-green-200',   description: 'Google Drive folder is configured and accessible.' },
  'needs-setup':{ label: 'Needs Setup',  cls: 'text-amber-700 bg-amber-50 border-amber-200',  description: 'Program is listed but the Drive folder has not been configured yet.' },
  archived:     { label: 'Archived',     cls: 'text-slate-600 bg-slate-50 border-slate-200',  description: 'Folder exists but is no longer actively used.' },
  pending:      { label: 'Pending',      cls: 'text-violet-700 bg-violet-50 border-violet-200', description: 'Setup is in progress.' },
};

export const PERMISSIONS_CONFIG: Record<PermissionsModel, { label: string; description: string }> = {
  'program-team-only':   { label: 'Program Team Only',   description: 'Only the assigned program team members have access.' },
  'org-wide-view':       { label: 'Org-Wide View',       description: 'All Transition Trails staff can view, only team members can edit.' },
  'restricted':          { label: 'Restricted',          description: 'Access limited to specific named individuals.' },
  'external-partners':   { label: 'External Partners',   description: 'Select external partners (coaches, employers) have view access.' },
  'not-set':             { label: 'Not Set',             description: 'Permissions model not yet configured.' },
};

export const programDriveResources: ProgramDriveResource[] = [
  {
    id: 'drive-foundations',
    programId: 'prog-foundations',
    programName: 'Foundations Trail',
    folderName: 'Foundations Trail — Program Workspace',
    folderUrl: 'https://drive.google.com/drive/folders/foundations-trail-placeholder',
    sharedDriveId: '',
    owner: 'Curriculum Lead',
    ownerEmail: 'curriculum@transitiontrails.org',
    status: 'active',
    description: 'The authoritative content workspace for Foundations Trail. Contains all curriculum source files, lesson slide decks, lab worksheets, assessment item banks, coaching guides, and program documentation.',
    permissionsModel: 'program-team-only',
    syncStatus: 'manual',
    contentTypes: ['Curriculum Source Files', 'Lesson Slide Decks', 'Lab Worksheets', 'Assessment Item Banks', 'Coaching Guides', 'Sprint Planning Docs', 'Cohort Rosters'],
    lastUpdated: 'Jun 1, 2025',
    createdBy: 'Program Manager',
    notes: 'Primary content repository for Foundations Trail. All Penny-generated drafts are reviewed and saved here before integration into the LMS.',
    subFolders: [
      { name: 'Sprint 1 — Platform Foundations',    description: 'All Sprint 1 lesson materials, labs, and assessments' },
      { name: 'Sprint 2 — Data & Relationships',    description: 'Sprint 2 curriculum files including Module 2.1 full content set' },
      { name: 'Sprint 3 — Automation & Flows',      description: 'Sprint 3 materials — screen flows, record-triggered flows, approvals' },
      { name: 'Sprint 4 — Certification & Career',  description: 'Exam prep materials, practice tests, portfolio templates' },
      { name: 'Cohort Resources',                   description: 'Cohort-specific documents, rosters, and communication logs' },
      { name: 'Assessment Item Bank',               description: 'Question bank by module — 200+ items' },
      { name: 'Coach Guides',                       description: 'Facilitator notes, conversation starters, coaching scripts' },
    ],
  },
  {
    id: 'drive-guided',
    programId: 'prog-guided',
    programName: 'Guided Trail',
    folderName: 'Guided Trail — Program Workspace',
    folderUrl: 'https://drive.google.com/drive/folders/guided-trail-placeholder',
    sharedDriveId: '',
    owner: 'Program Manager',
    ownerEmail: 'programs@transitiontrails.org',
    status: 'active',
    description: 'Content workspace for Guided Trail — the structured post-Foundations program for emerging Salesforce practitioners with a coach-led project track.',
    permissionsModel: 'program-team-only',
    syncStatus: 'manual',
    contentTypes: ['Project Templates', 'Coaching Frameworks', 'Assessment Rubrics', 'Case Studies', 'Career Resources'],
    lastUpdated: 'May 15, 2025',
    createdBy: 'Program Manager',
    subFolders: [
      { name: 'Project Tracks',          description: 'Three project track options with deliverables and rubrics' },
      { name: 'Coaching Frameworks',     description: 'Structured coaching conversation guides' },
      { name: 'Case Studies',            description: 'Real-world Salesforce implementation case studies' },
      { name: 'Career Resources',        description: 'Resume templates, interview prep, LinkedIn guides' },
    ],
  },
  {
    id: 'drive-explorers',
    programId: 'prog-explorers',
    programName: "Explorer's Trail",
    folderName: "Explorer's Trail — Program Workspace",
    folderUrl: '',
    sharedDriveId: '',
    owner: 'Curriculum Lead',
    ownerEmail: 'curriculum@transitiontrails.org',
    status: 'needs-setup',
    description: "Explorer's Trail program workspace. Needs Google Drive folder setup — program is in early curriculum development.",
    permissionsModel: 'not-set',
    syncStatus: 'not-configured',
    contentTypes: ['Curriculum Drafts', 'Exploration Labs'],
    lastUpdated: 'Jun 8, 2025',
    createdBy: 'Program Manager',
    notes: 'Program curriculum is in prototype phase. Drive folder to be created when Sprint 1 content development begins.',
    subFolders: [],
  },
  {
    id: 'drive-mastery',
    programId: 'prog-mastery',
    programName: 'Trail of Mastery',
    folderName: 'Trail of Mastery — Program Workspace',
    folderUrl: '',
    sharedDriveId: '',
    owner: 'Program Manager',
    ownerEmail: 'programs@transitiontrails.org',
    status: 'pending',
    description: 'Advanced program workspace for Trail of Mastery — the advanced Salesforce Administrator certification track. Content development starting Q3 2025.',
    permissionsModel: 'not-set',
    syncStatus: 'not-configured',
    contentTypes: ['Advanced Labs', 'Certification Prep', 'Capstone Projects'],
    lastUpdated: 'Jun 8, 2025',
    createdBy: 'Program Manager',
    notes: 'Placeholder — program development begins Q3 2025.',
    subFolders: [],
  },
  {
    id: 'drive-digital-compass',
    programId: 'prog-digital-compass',
    programName: 'Digital Compass',
    folderName: 'Digital Compass — Program Workspace',
    folderUrl: 'https://drive.google.com/drive/folders/digital-compass-placeholder',
    sharedDriveId: '',
    owner: 'Operations Manager',
    ownerEmail: 'ops@transitiontrails.org',
    status: 'active',
    description: 'Content workspace for Digital Compass — the digital literacy and career orientation program for learners new to tech careers. Pre-Foundations entry point.',
    permissionsModel: 'org-wide-view',
    syncStatus: 'manual',
    contentTypes: ['Orientation Materials', 'Digital Literacy Modules', 'Career Exploration Guides', 'Assessment Tools'],
    lastUpdated: 'May 28, 2025',
    createdBy: 'Operations Manager',
    subFolders: [
      { name: 'Orientation & Onboarding', description: 'Welcome materials, program overview, expectations' },
      { name: 'Digital Literacy',          description: 'Core digital literacy content — tools, communication, productivity' },
      { name: 'Career Exploration',        description: 'Salesforce career paths, day-in-the-life profiles, salary research' },
    ],
  },
];

export function getDriveResourceByProgramId(programId: string): ProgramDriveResource | undefined {
  return programDriveResources.find(r => r.programId === programId);
}

export function getDriveResourceByProgramName(programName: string): ProgramDriveResource | undefined {
  return programDriveResources.find(r => r.programName === programName);
}
