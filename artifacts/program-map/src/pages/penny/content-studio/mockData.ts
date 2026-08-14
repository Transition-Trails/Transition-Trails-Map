// ─────────────────────────────────────────────────────────────────────────────
// Content Studio — Rich mock data
// All fixtures typed against the shared types in ./types.ts
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ContentItem,
  ContentTopic,
  ContentItemPublication,
  ProductNode,
  CrewTask,
  GapCell,
  VideoItem,
  PublicationPlatform,
} from './types';

// ── 34 Content Items across 5 Kanban columns ─────────────────────────────────
// Idea (6), In Progress (4), Ready for Review (3), Ready to Publish (2), Published (19)

export const MOCK_CONTENT_ITEMS: ContentItem[] = [
  // ── Idea (6) ────────────────────────────────────────────────────────────────
  {
    id: 'ci-001',
    title: 'What Is a Transition Plan and Why It Matters',
    format: 'Article',
    topic: 'Transition Fundamentals',
    status: 'Idea',
    objective: 'Introduce the concept of a transition plan to new learners',
    pillars: ['Awareness', 'Education'],
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
  },
  {
    id: 'ci-002',
    title: 'Five Questions to Ask Before Choosing a Housing Option',
    format: 'Checklist',
    topic: 'Housing Navigation',
    status: 'Idea',
    objective: 'Help learners self-screen housing options',
    pillars: ['Housing', 'Decision Making'],
    createdAt: '2026-06-03T10:00:00Z',
    updatedAt: '2026-06-03T10:00:00Z',
  },
  {
    id: 'ci-003',
    title: 'Understanding SSI vs SSDI: A Plain-English Guide',
    format: 'Guide',
    topic: 'Benefits Navigation',
    status: 'Idea',
    objective: 'Clarify the difference between federal benefit programs',
    pillars: ['Benefits', 'Education'],
    createdAt: '2026-06-05T11:00:00Z',
    updatedAt: '2026-06-05T11:00:00Z',
  },
  {
    id: 'ci-004',
    title: 'How to Build a Weekly Routine That Sticks',
    format: 'Article',
    topic: 'Life Skills',
    status: 'Idea',
    objective: 'Provide a practical framework for habit formation',
    pillars: ['Life Skills', 'Coaching'],
    createdAt: '2026-06-07T09:30:00Z',
    updatedAt: '2026-06-07T09:30:00Z',
  },
  {
    id: 'ci-005',
    title: 'Nonprofit Tech Stack 101: What Every Team Should Know',
    format: 'Article',
    topic: 'Nonprofit Tech Stack',
    status: 'Idea',
    objective: 'Orient new staff to the org tech landscape',
    pillars: ['Operations', 'Onboarding'],
    createdAt: '2026-06-10T14:00:00Z',
    updatedAt: '2026-06-10T14:00:00Z',
  },
  {
    id: 'ci-006',
    title: 'The Coach Role: Setting Expectations in Session One',
    format: 'Template',
    topic: 'Coaching Practice',
    status: 'Idea',
    objective: 'Give coaches a repeatable session-one framework',
    pillars: ['Coaching', 'Onboarding'],
    createdAt: '2026-06-12T08:00:00Z',
    updatedAt: '2026-06-12T08:00:00Z',
  },

  // ── In Progress (4) ─────────────────────────────────────────────────────────
  {
    id: 'ci-007',
    title: 'RESOLVE Phase Overview: From Recognize to Evolve',
    format: 'Article',
    topic: 'RESOLVE Framework',
    status: 'In Progress',
    dueDate: '2026-08-20T00:00:00Z',
    objective: 'Map all 7 RESOLVE phases with learner-facing descriptions',
    pillars: ['Framework', 'Education'],
    assignee: 'Jordan T.',
    driveUrl: 'https://drive.google.com/drive/folders/mock-resolve-overview',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-08-10T15:30:00Z',
  },
  {
    id: 'ci-008',
    title: 'Building Your Support Network: A Worksheet',
    format: 'Template',
    topic: 'Life Skills',
    status: 'In Progress',
    dueDate: '2026-08-18T00:00:00Z',
    objective: 'Guided reflection to map support people and resources',
    pillars: ['Life Skills', 'Self-Advocacy'],
    assignee: 'Sam R.',
    driveUrl: 'https://drive.google.com/drive/folders/mock-support-network',
    createdAt: '2026-07-05T11:00:00Z',
    updatedAt: '2026-08-09T12:00:00Z',
  },
  {
    id: 'ci-009',
    title: 'How Salesforce Powers the Trail OS Org',
    format: 'Video',
    topic: 'Nonprofit Tech Stack',
    status: 'In Progress',
    dueDate: '2026-08-25T00:00:00Z',
    objective: 'Short explainer video for new staff onboarding',
    pillars: ['Operations', 'Onboarding'],
    assignee: 'Morgan L.',
    length: '4–6 min',
    createdAt: '2026-07-15T09:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'ci-010',
    title: 'Monthly Newsletter: August 2026',
    format: 'Email',
    topic: 'Org Communications',
    status: 'In Progress',
    dueDate: '2026-08-28T00:00:00Z',
    objective: 'Recap key wins, upcoming events, and learner spotlights',
    pillars: ['Communications'],
    assignee: 'Alex P.',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-13T16:00:00Z',
  },

  // ── Ready for Review (3) ────────────────────────────────────────────────────
  {
    id: 'ci-011',
    title: 'Who Can See What: Data Access in Salesforce',
    format: 'Article',
    topic: 'Nonprofit Tech Stack',
    status: 'Ready for Review',
    dueDate: '2026-08-16T00:00:00Z',
    objective: 'Explain Salesforce sharing rules to non-technical staff',
    pillars: ['Operations', 'Data Privacy'],
    assignee: 'Jordan T.',
    driveUrl: 'https://drive.google.com/drive/folders/mock-who-can-see',
    seoMeta: {
      title: 'Who Can See What: Salesforce Data Access Explained',
      description: 'A plain-English guide to Salesforce sharing rules for nonprofit staff.',
      keywords: ['salesforce', 'data access', 'sharing rules', 'nonprofit'],
    },
    productIds: ['prod-001', 'prod-002'],
    createdAt: '2026-07-20T09:00:00Z',
    updatedAt: '2026-08-13T14:00:00Z',
  },
  {
    id: 'ci-012',
    title: 'Trail Quest Facilitator Guide',
    format: 'Guide',
    topic: 'Trail Quests',
    status: 'Ready for Review',
    dueDate: '2026-08-19T00:00:00Z',
    objective: 'Help coaches facilitate Trail Quest sessions effectively',
    pillars: ['Coaching', 'Framework'],
    assignee: 'Sam R.',
    driveUrl: 'https://drive.google.com/drive/folders/mock-facilitator-guide',
    createdAt: '2026-07-22T10:00:00Z',
    updatedAt: '2026-08-12T11:00:00Z',
  },
  {
    id: 'ci-013',
    title: 'LinkedIn Post Series: Transition Milestones',
    format: 'Social',
    topic: 'Org Communications',
    status: 'Ready for Review',
    dueDate: '2026-08-15T00:00:00Z',
    objective: '5-post series celebrating learner transition milestones',
    pillars: ['Communications', 'Brand'],
    assignee: 'Alex P.',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-13T09:00:00Z',
  },

  // ── Ready to Publish (2) ────────────────────────────────────────────────────
  {
    id: 'ci-014',
    title: 'Volunteer Orientation: Your First 30 Days',
    format: 'Guide',
    topic: 'Volunteer Onboarding',
    status: 'Ready to Publish',
    dueDate: '2026-08-14T00:00:00Z',
    objective: 'Set clear expectations for new volunteers',
    pillars: ['Onboarding', 'Volunteers'],
    assignee: 'Morgan L.',
    driveUrl: 'https://drive.google.com/drive/folders/mock-volunteer-orientation',
    productIds: ['prod-003'],
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-08-13T17:00:00Z',
  },
  {
    id: 'ci-015',
    title: 'August Program Update: What Changed and Why',
    format: 'Email',
    topic: 'Org Communications',
    status: 'Ready to Publish',
    dueDate: '2026-08-14T00:00:00Z',
    objective: 'Communicate program changes to stakeholders',
    pillars: ['Communications'],
    assignee: 'Alex P.',
    createdAt: '2026-08-08T09:00:00Z',
    updatedAt: '2026-08-13T16:30:00Z',
  },

  // ── Published (19) ─────────────────────────────────────────────────────────
  ...Array.from({ length: 19 }, (_, i) => ({
    id: `ci-pub-${String(i + 1).padStart(3, '0')}`,
    title: [
      'Introduction to the RESOLVE Framework',
      'Housing First: What It Means in Practice',
      'Benefits Cliff: How Earning More Can Cost You',
      'Coaches Corner: Reflective Listening Techniques',
      'Trail OS Quick Start for New Staff',
      'How to Navigate the Case Portal',
      'Understanding Your Transition Plan Document',
      'Goal Setting in the Select Phase',
      'What to Expect in Your First Coaching Session',
      'Peer Support: Finding Your Community',
      'Financial Literacy Module 1: Budgeting Basics',
      'Digital Skills for Modern Employment',
      'Self-Advocacy: Speaking Up in Appointments',
      'Volunteer Spotlight: Impact Stories Q2',
      'Community Resources Directory — Summer 2026',
      'Salesforce for Coaches: The Basics',
      'Zoom Meeting Etiquette for Learners',
      'Monthly Digest: July 2026 Highlights',
      'Program Outcomes Report: Spring 2026',
    ][i],
    format: (['Article', 'Guide', 'Article', 'Article', 'Guide', 'Guide', 'Article', 'Article', 'Article', 'Article', 'Guide', 'Checklist', 'Article', 'Article', 'Guide', 'Guide', 'Article', 'Email', 'Article'] as const)[i],
    topic: ['RESOLVE Framework', 'Housing Navigation', 'Benefits Navigation', 'Coaching Practice', 'Nonprofit Tech Stack', 'Operations', 'RESOLVE Framework', 'RESOLVE Framework', 'Coaching Practice', 'Life Skills', 'Life Skills', 'Life Skills', 'Life Skills', 'Org Communications', 'Org Communications', 'Nonprofit Tech Stack', 'Life Skills', 'Org Communications', 'Org Communications'][i],
    status: 'Published' as const,
    pillars: [['Framework'], ['Housing'], ['Benefits'], ['Coaching'], ['Onboarding'], ['Operations'], ['Framework'], ['Framework'], ['Coaching'], ['Community'], ['Financial'], ['Skills'], ['Self-Advocacy'], ['Communications'], ['Resources'], ['Operations'], ['Skills'], ['Communications'], ['Reporting']][i],
    assignee: ['Jordan T.', 'Sam R.', 'Morgan L.', 'Alex P.', 'Jordan T.', 'Sam R.', 'Morgan L.', 'Alex P.', 'Jordan T.', 'Sam R.', 'Morgan L.', 'Alex P.', 'Jordan T.', 'Sam R.', 'Morgan L.', 'Alex P.', 'Jordan T.', 'Sam R.', 'Morgan L.'][i],
    createdAt: new Date(2026, 0, i + 1).toISOString(),
    updatedAt: new Date(2026, 5, i + 1).toISOString(),
  })),
];

// ── Featured content item for the Content Item detail tab ─────────────────────

export const MOCK_FEATURED_ITEM: ContentItem = MOCK_CONTENT_ITEMS.find(c => c.id === 'ci-011')!;

// ── 1 ContentTopic with family tree: "Nonprofit tech stack" ──────────────────

export const MOCK_TOPIC: ContentTopic = {
  id: 'topic-001',
  title: 'Nonprofit tech stack',
  description: 'Everything staff and learners need to know about the technology tools that power the organization.',
  pillar: 'Operations',
  itemCount: 6,
  children: [
    {
      id: 'topic-001-sub-1',
      title: 'Salesforce Basics',
      kind: 'subtopic',
      children: [
        { id: 'ci-005', title: 'Nonprofit Tech Stack 101: What Every Team Should Know', kind: 'content-item' },
        { id: 'ci-009', title: 'How Salesforce Powers the Trail OS Org', kind: 'content-item' },
        { id: 'ci-011', title: 'Who Can See What: Data Access in Salesforce', kind: 'content-item' },
        { id: 'ci-pub-016', title: 'Salesforce for Coaches: The Basics', kind: 'content-item' },
      ],
    },
    {
      id: 'topic-001-sub-2',
      title: 'Digital Communication Tools',
      kind: 'subtopic',
      children: [
        { id: 'ci-pub-017', title: 'Zoom Meeting Etiquette for Learners', kind: 'content-item' },
      ],
    },
    {
      id: 'topic-001-sub-3',
      title: 'Trail OS Orientation',
      kind: 'subtopic',
      children: [
        { id: 'ci-pub-005', title: 'Trail OS Quick Start for New Staff', kind: 'content-item' },
      ],
    },
  ],
  createdAt: '2026-05-01T00:00:00Z',
};

// ── 12-week × 5-platform publication gap matrix ──────────────────────────────

const PLATFORMS: PublicationPlatform[] = [
  'Salesforce Knowledge',
  'Slack',
  'Email Newsletter',
  'LinkedIn',
  'Website Blog',
];

const WEEK_STARTS = [
  'Jul 7', 'Jul 14', 'Jul 21', 'Jul 28',
  'Aug 4', 'Aug 11', 'Aug 18', 'Aug 25',
  'Sep 1', 'Sep 8', 'Sep 15', 'Sep 22',
];

const GAP_STATUS_MAP: Array<Array<'planned' | 'published' | 'gap' | 'overdue'>> = [
  // week:  1           2           3           4           5           6           7           8           9           10          11          12
  ['published', 'published', 'published', 'gap',       'published', 'published', 'planned',  'planned',  'planned',  'planned',  'planned',  'planned'],  // SF Knowledge
  ['published', 'gap',       'published', 'published', 'gap',       'published', 'planned',  'gap',      'planned',  'planned',  'planned',  'planned'],  // Slack
  ['published', 'published', 'gap',       'published', 'overdue',   'published', 'planned',  'planned',  'planned',  'planned',  'planned',  'planned'],  // Email
  ['gap',       'published', 'published', 'gap',       'published', 'overdue',   'planned',  'planned',  'planned',  'planned',  'planned',  'planned'],  // LinkedIn
  ['published', 'gap',       'gap',       'published', 'published', 'gap',       'planned',  'planned',  'planned',  'planned',  'planned',  'planned'],  // Website
];

export const MOCK_GAP_MATRIX: GapCell[] = PLATFORMS.flatMap((platform, pi) =>
  WEEK_STARTS.map((weekLabel, wi) => ({
    platform,
    week: wi + 1,
    weekLabel,
    status: GAP_STATUS_MAP[pi][wi],
    itemTitle: GAP_STATUS_MAP[pi][wi] === 'published' ? `${platform} content · ${weekLabel}` : undefined,
  }))
);

// ── Video item: "Build With Me — Moving changes to production" ────────────────

export const MOCK_VIDEO_ITEM: VideoItem = {
  id: 'vid-001',
  title: 'Build With Me — Moving changes to production',
  format: 'Video',
  topic: 'Nonprofit Tech Stack',
  status: 'In Progress',
  dueDate: '2026-09-01T00:00:00Z',
  objective: 'Walk staff through the full deploy cycle — from a feature branch to a live Salesforce sandbox push.',
  pillars: ['Operations', 'Technical'],
  assignee: 'Jordan T.',
  length: '8–12 min',
  driveUrl: 'https://drive.google.com/drive/folders/mock-build-with-me-prod',
  createdAt: '2026-08-01T09:00:00Z',
  updatedAt: '2026-08-13T15:00:00Z',
  stages: [
    { id: 'stage-1', label: 'Script draft',       status: 'complete',     narration: 'Script written and approved by Jordan T. on Aug 5.' },
    { id: 'stage-2', label: 'Gemini rewrite',     status: 'complete',     narration: 'Rewritten for voiceover cadence. 847 words, ~6 min.' },
    { id: 'stage-3', label: 'Voice selection',    status: 'complete',     narration: 'Voice "Rachel — Coaching" selected from ElevenLabs.' },
    { id: 'stage-4', label: 'TTS generation',     status: 'in-progress',  narration: 'First pass generated. Reviewing for pacing issues around step 3.' },
    { id: 'stage-5', label: 'Screen recording',   status: 'pending',      narration: undefined },
    { id: 'stage-6', label: 'Final export',       status: 'pending',      narration: undefined },
  ],
  scriptUrl: 'https://drive.google.com/drive/folders/mock-bwm-script',
};

// ── Product tree ──────────────────────────────────────────────────────────────

export const MOCK_PRODUCT_TREE: ProductNode = {
  id: 'prod-coll-001',
  name: 'Transition Trails Learning Library',
  kind: 'collection',
  children: [
    {
      id: 'prod-bundle-001',
      name: 'RESOLVE Framework Bundle',
      kind: 'bundle',
      price: 0,
      children: [
        { id: 'prod-001', name: 'RESOLVE Overview Guide',           kind: 'standalone', price: 0, sku: 'TT-RESOLVE-001' },
        { id: 'prod-002', name: 'RESOLVE Facilitator Workbook',     kind: 'standalone', price: 0, sku: 'TT-RESOLVE-002' },
        { id: 'prod-var-001', name: 'RESOLVE — Learner Edition',    kind: 'variation',  price: 0, sku: 'TT-RESOLVE-LRN' },
        { id: 'prod-var-002', name: 'RESOLVE — Coach Edition',      kind: 'variation',  price: 0, sku: 'TT-RESOLVE-CCH' },
      ],
    },
    {
      id: 'prod-bundle-002',
      name: 'Staff Onboarding Package',
      kind: 'bundle',
      price: 0,
      children: [
        { id: 'prod-003', name: 'Trail OS Quick Start Guide',       kind: 'standalone', price: 0, sku: 'TT-STAFF-001' },
        { id: 'prod-004', name: 'Volunteer First 30 Days Guide',    kind: 'standalone', price: 0, sku: 'TT-VOL-001' },
      ],
    },
  ],
};

// ── Crew tasks ────────────────────────────────────────────────────────────────

export const MOCK_CREW_TASKS: CrewTask[] = [
  {
    id: 'task-001',
    title: 'Review "Who Can See What" draft',
    contentItemId: 'ci-011',
    contentItemTitle: 'Who Can See What: Data Access in Salesforce',
    assignee: 'Sam R.',
    dueDate: '2026-08-16T00:00:00Z',
    status: 'in-progress',
    tab: 'mine',
  },
  {
    id: 'task-002',
    title: 'Final copy edit for Volunteer Orientation guide',
    contentItemId: 'ci-014',
    contentItemTitle: 'Volunteer Orientation: Your First 30 Days',
    assignee: 'Sam R.',
    dueDate: '2026-08-14T00:00:00Z',
    status: 'todo',
    tab: 'mine',
  },
  {
    id: 'task-003',
    title: 'Record screen capture: deploy to sandbox',
    contentItemId: 'vid-001',
    contentItemTitle: 'Build With Me — Moving changes to production',
    assignee: 'Jordan T.',
    dueDate: '2026-08-22T00:00:00Z',
    status: 'todo',
    tab: 'team',
  },
  {
    id: 'task-004',
    title: 'Draft August newsletter intro paragraph',
    contentItemId: 'ci-010',
    contentItemTitle: 'Monthly Newsletter: August 2026',
    assignee: 'Alex P.',
    dueDate: '2026-08-20T00:00:00Z',
    status: 'in-progress',
    tab: 'team',
  },
  {
    id: 'task-005',
    title: 'Approve Trail Quest Facilitator Guide',
    contentItemId: 'ci-012',
    contentItemTitle: 'Trail Quest Facilitator Guide',
    assignee: 'Morgan L.',
    dueDate: '2026-08-19T00:00:00Z',
    status: 'todo',
    tab: 'review-queue',
  },
  {
    id: 'task-006',
    title: 'Approve LinkedIn post series copy',
    contentItemId: 'ci-013',
    contentItemTitle: 'LinkedIn Post Series: Transition Milestones',
    assignee: 'Morgan L.',
    dueDate: '2026-08-15T00:00:00Z',
    status: 'blocked',
    tab: 'review-queue',
  },
];
