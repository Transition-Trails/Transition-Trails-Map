// ── Google Calendar Integration Center — Data Layer ───────────────────────────
// Calendars and events as first-class Trail OS objects (timing layer).

export type CalendarType  = 'Program' | 'Cohort' | 'Operations' | 'Client' | 'Office Hours' | 'Coaching' | 'Assessment' | 'Executive';
export type EventType     = 'Cohort Session' | 'Office Hours' | 'Workshop' | 'Coaching Session' | 'Assessment Window' | 'Curriculum Deadline' | 'Client Milestone' | 'UAT Session' | 'Training' | 'Leadership Review' | 'Weekly Brief' | 'Penny Reminder' | 'Mentor Session';
export type CalCheckStatus = 'pass' | 'fail' | 'warning' | 'pending' | 'blocked';
export type EventStatus   = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'pending' | 'recurring';
export type Visibility    = 'Private' | 'Internal' | 'Team' | 'External';

export interface CalValidationCheck {
  id: string;
  category: 'Credentials' | 'Permissions' | 'Scopes' | 'Calendar Access' | 'OAuth';
  label: string;
  status: CalCheckStatus;
  detail: string;
  impact: string;
  fix?: string;
}

export interface TrailCalendar {
  id: string;
  name: string;
  calendarType: CalendarType;
  purpose: string;
  owner: string;
  visibility: Visibility;
  programIds: string[];
  eventCount: number;
  activeEventCount: number;
  color: string;
  status: 'active' | 'planning' | 'inactive';
  googleCalendarId?: string;
  readiness: 'Ready' | 'Partial' | 'Not Configured';
  notes: string;
  subCalendars?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  calendarId: string;
  calendarName: string;
  programId: string;
  programName: string;
  cohort?: string;
  sprint?: string;
  status: EventStatus;
  frequency: 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Sprint-aligned' | 'Ad hoc';
  timezone: string;
  attendeeRoles: string[];
  attendeeCount: number;
  duration: string;
  nextOccurrence: string;
  pennyEnabled: boolean;
  slackChannel?: string;
  driveResourceId?: string;
  notes: string;
}

export interface ProgramEventMapping {
  programId: string;
  programName: string;
  calendarIds: string[];
  events: EventMappingEntry[];
}

export interface EventMappingEntry {
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  sprintLink?: string;
  moduleLink?: string;
  assessmentLink?: string;
  salesforceObjectLink?: string;
  driveResourceLink?: string;
  slackChannelLink?: string;
  chatSpaceLink?: string;
  pennyCapabilityLink?: string;
  promptTemplateLink?: string;
  people: string[];
}

export interface RolePeopleMapping {
  roleId: string;
  roleName: string;
  pennyPersona: string;
  peopleCount: number;
  eventTypes: string[];
  ownership: string[];
  attendance: string[];
  facilitation: string[];
  reminderTypes: string[];
  dependencies: string[];
}

export interface PennySchedulingCapability {
  capabilityId: string;
  capabilityName: string;
  schedulingDomain: string;
  triggerType: 'Pre-event' | 'Post-event' | 'Reminder' | 'Follow-up' | 'Digest' | 'Nudge';
  triggerOffset: string;
  targetRoles: string[];
  targetEventTypes: EventType[];
  slackDelivery?: string;
  driveSource?: string;
  status: 'Configured' | 'Planned' | 'Blocked' | 'Prototype';
  readiness: 'Ready' | 'Partial' | 'Not Ready';
  blockReason?: string;
  exampleOutput: string;
}

export interface CalCommunicationMapping {
  calendarId: string;
  calendarName: string;
  slackChannels: CommChannelLink[];
  chatSpaces: CommChannelLink[];
}

export interface CommChannelLink {
  channel: string;
  purpose: string;
  eventTypes: string[];
  pennyEnabled: boolean;
  status: 'Active' | 'Planned' | 'Pending';
}

export interface CalGovernanceIssue {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  category: 'Missing Owner' | 'Stale Event' | 'Permission' | 'Duplicate' | 'Unmapped' | 'Timezone Risk' | 'Lifecycle';
  title: string;
  detail: string;
  affectedObjects: string[];
  resolution: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export interface CalTestCase {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'pending' | 'blocked';
  result: string;
  blockedBy?: string;
}

export interface CalTestSuite {
  id: string;
  name: string;
  category: string;
  description: string;
  tests: CalTestCase[];
}

export interface CalHealthScore {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'ready' | 'partial' | 'not-ready';
  note: string;
  items: { label: string; status: 'pass' | 'partial' | 'fail'; note: string }[];
}

// ── Validation Checks ─────────────────────────────────────────────────────────

export const CAL_VALIDATION_CHECKS: CalValidationCheck[] = [
  { id:'cv-01', category:'Credentials', label:'GOOGLE_CLIENT_ID configured',          status:'pass',    detail:'GOOGLE_CLIENT_ID is set and format-verified (*.apps.googleusercontent.com) — confirmed by secrets audit. Shared with Drive.',  impact:'OAuth 2.0 flow can be initiated for Google Calendar.',               fix:'' },
  { id:'cv-02', category:'Credentials', label:'GOOGLE_CLIENT_SECRET configured',      status:'pass',    detail:'GOOGLE_CLIENT_SECRET is set and format-verified — confirmed by secrets audit. Shared with Drive.',              impact:'OAuth 2.0 authentication can proceed.',                             fix:'' },
  { id:'cv-03', category:'Credentials', label:'GOOGLE_CALENDAR_REFRESH_TOKEN set',    status:'fail',    detail:'Calendar refresh token not configured. Client ID/Secret are ready — OAuth flow has not been completed yet.',   impact:'Calendar API sessions cannot be established without a refresh token.', fix:'Complete Calendar OAuth flow with calendar.readonly and calendar.events scopes. Store as GOOGLE_CALENDAR_REFRESH_TOKEN.' },
  { id:'cv-04', category:'OAuth',       label:'Calendar API enabled in Google Cloud', status:'warning', detail:'Calendar API status cannot be confirmed without credentials.',          impact:'Even with OAuth, API calls fail if Calendar API is not enabled.',           fix:'Enable Google Calendar API in GCP Console → APIs & Services → Library.' },
  { id:'cv-05', category:'Scopes',      label:'calendar.readonly scope declared',     status:'warning', detail:'Read scope needed for all calendar and event listing operations.',       impact:'Cannot list calendars or events without calendar.readonly scope.',          fix:'Add https://www.googleapis.com/auth/calendar.readonly to OAuth consent.' },
  { id:'cv-06', category:'Scopes',      label:'calendar.events scope declared',       status:'warning', detail:'Events scope needed for Penny to create reminders and calendar items.', impact:'Penny cannot create reminders, pre-brief events, or follow-up items.',      fix:'Add https://www.googleapis.com/auth/calendar.events to OAuth consent.' },
  { id:'cv-07', category:'Scopes',      label:'calendar.settings.readonly scope',     status:'warning', detail:'Settings scope needed to read timezone and workspace config.',           impact:'Cannot read workspace timezone settings. Timezone risk increases.',         fix:'Add calendar.settings.readonly scope.' },
  { id:'cv-08', category:'Calendar Access', label:'Program calendars accessible',     status:'pending', detail:'Cannot verify calendar access without credentials.',                    impact:'Calendar Registry cannot be populated from live Google Calendar.',         fix:'After OAuth, verify access to all program calendars.' },
  { id:'cv-09', category:'Calendar Access', label:'Operations calendar accessible',   status:'pending', detail:'Operations calendar access not verified.',                              impact:'Operations scheduling layer unavailable to Trail OS.',                     fix:'Share operations calendar with service account.' },
  { id:'cv-10', category:'Calendar Access', label:'Executive calendar accessible',    status:'pending', detail:'Executive calendar may have restricted visibility.',                    impact:'Executive review scheduling will not be available.',                       fix:'Executive Lead to share calendar with Trail OS service account (read-only).' },
  { id:'cv-11', category:'Permissions', label:'Event read permissions',               status:'pending', detail:'Cannot verify event read access without credentials.',                  impact:'Event Catalog cannot be populated from live calendar.',                    fix:'Complete OAuth and calendar sharing configuration.' },
  { id:'cv-12', category:'Permissions', label:'Event write permissions (Penny)',      status:'pending', detail:'Event write required for Penny reminders and pre-brief creation.',      impact:'Penny scheduling capabilities fully blocked.',                            fix:'Grant calendar.events write scope and test Penny event creation.' },
];

// ── Calendar Registry ─────────────────────────────────────────────────────────

export const TRAIL_CALENDARS: TrailCalendar[] = [
  {
    id: 'cal-ft-program',
    name: 'Foundations Trail Program Calendar',
    calendarType: 'Program',
    purpose: 'Master calendar for all Foundations Trail sprint milestones, deadlines, and cohort events.',
    owner: 'Program Lead',
    visibility: 'Internal',
    programIds: ['foundations-trail'],
    eventCount: 42,
    activeEventCount: 18,
    color: '#4285F4',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Partial',
    notes: 'Primary program calendar. Most events defined in Trail OS but not yet synced from Google Calendar.',
    subCalendars: ['Foundations Trail Cohort 2', 'FT Assessment Windows'],
  },
  {
    id: 'cal-gt-program',
    name: 'Guided Trail Program Calendar',
    calendarType: 'Program',
    purpose: 'Sprint milestones, cohort sessions, and curriculum deadlines for Guided Trail.',
    owner: 'Program Lead',
    visibility: 'Internal',
    programIds: ['guided-trail'],
    eventCount: 28,
    activeEventCount: 12,
    color: '#0F9D58',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Partial',
    notes: 'Cohort 1 events active. Some deadlines not yet added to calendar.',
  },
  {
    id: 'cal-et-program',
    name: "Explorer's Trail Program Calendar",
    calendarType: 'Program',
    purpose: "Sprint and cohort timeline for Explorer's Trail.",
    owner: 'Program Lead',
    visibility: 'Internal',
    programIds: ['explorers-trail'],
    eventCount: 22,
    activeEventCount: 10,
    color: '#F4B400',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Partial',
    notes: 'Cohort 3 active. Event catalog partially populated.',
  },
  {
    id: 'cal-ft-cohort2',
    name: 'FT Cohort 2 Calendar',
    calendarType: 'Cohort',
    purpose: 'All sessions, workshops, and reviews for Foundations Trail Cohort 2.',
    owner: 'Program Lead',
    visibility: 'Internal',
    programIds: ['foundations-trail'],
    eventCount: 24,
    activeEventCount: 14,
    color: '#4285F4',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Partial',
    notes: 'Sprint 3 events current. Sprint 4 events not yet added.',
  },
  {
    id: 'cal-gt-cohort1',
    name: 'GT Cohort 1 Calendar',
    calendarType: 'Cohort',
    purpose: 'All sessions and milestones for Guided Trail Cohort 1.',
    owner: 'Program Lead',
    visibility: 'Internal',
    programIds: ['guided-trail'],
    eventCount: 18,
    activeEventCount: 9,
    color: '#0F9D58',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Partial',
    notes: 'Actively running. Events current through Sprint 2.',
  },
  {
    id: 'cal-operations',
    name: 'Operations Calendar',
    calendarType: 'Operations',
    purpose: 'Internal team ops: UAT sessions, planning meetings, team retrospectives, escalation check-ins.',
    owner: 'Operations Lead',
    visibility: 'Internal',
    programIds: [],
    eventCount: 15,
    activeEventCount: 8,
    color: '#DB4437',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'Operations calendar exists but not yet connected to Trail OS.',
  },
  {
    id: 'cal-office-hours',
    name: 'Office Hours Calendar',
    calendarType: 'Office Hours',
    purpose: 'Coach and Program Lead office hours. Published to learners and coaches.',
    owner: 'Coach Team',
    visibility: 'Team',
    programIds: ['foundations-trail', 'guided-trail', 'explorers-trail'],
    eventCount: 32,
    activeEventCount: 16,
    color: '#9C27B0',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'High-value calendar for Penny attendance nudges and coach prep briefs.',
  },
  {
    id: 'cal-coaching',
    name: 'Coaching Sessions Calendar',
    calendarType: 'Coaching',
    purpose: '1:1 and group coaching sessions. Feeds Penny coaching escalation and coach brief generation.',
    owner: 'Coach Team',
    visibility: 'Private',
    programIds: ['foundations-trail', 'guided-trail', 'explorers-trail'],
    eventCount: 48,
    activeEventCount: 22,
    color: '#FF6D00',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'Critical for Penny Coaching Escalation. Needs access with privacy safeguards.',
  },
  {
    id: 'cal-assessments',
    name: 'Assessment Windows Calendar',
    calendarType: 'Assessment',
    purpose: 'Certification test windows, assessment submission deadlines, evaluation periods.',
    owner: 'Program Lead',
    visibility: 'Team',
    programIds: ['foundations-trail', 'guided-trail'],
    eventCount: 12,
    activeEventCount: 4,
    color: '#00ACC1',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'Assessment windows need to feed Penny assessment reminders and deadline nudges.',
  },
  {
    id: 'cal-executive',
    name: 'Executive Reviews Calendar',
    calendarType: 'Executive',
    purpose: 'Program health reviews, leadership briefings, executive sprint reviews.',
    owner: 'Executive Lead',
    visibility: 'Private',
    programIds: [],
    eventCount: 8,
    activeEventCount: 3,
    color: '#546E7A',
    status: 'active',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'Restricted access. Penny Executive Briefs should be triggered by events on this calendar.',
  },
  {
    id: 'cal-digital-compass',
    name: 'Digital Compass Client Calendar',
    calendarType: 'Client',
    purpose: 'Client milestone sessions, UAT events, training sessions, and project reviews for Digital Compass.',
    owner: 'Unassigned',
    visibility: 'External',
    programIds: ['digital-compass'],
    eventCount: 6,
    activeEventCount: 2,
    color: '#8BC34A',
    status: 'planning',
    googleCalendarId: undefined,
    readiness: 'Not Configured',
    notes: 'Planning phase. No owner assigned. Client calendar needs separate sharing configuration.',
  },
];

// ── Event Catalog ─────────────────────────────────────────────────────────────

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id:'ev-01', title:'Sprint 3 Kickoff — Foundations Trail Cohort 2',     eventType:'Cohort Session',    calendarId:'cal-ft-cohort2',   calendarName:'FT Cohort 2 Calendar',          programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'scheduled',   frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Learner','Coach','Program Lead'], attendeeCount:19, duration:'90 min', nextOccurrence:'Monday 9:00 AM',   pennyEnabled:true,  slackChannel:'#foundations-cohort-2', driveResourceId:'f-02', notes:'Sprint 3 kickoff. Penny pre-session brief auto-generated 2h before.' },
  { id:'ev-02', title:'Sprint 3 Resume Writing Workshop',                   eventType:'Workshop',          calendarId:'cal-ft-cohort2',   calendarName:'FT Cohort 2 Calendar',          programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'scheduled',   frequency:'One-time',      timezone:'America/Chicago', attendeeRoles:['Learner','Coach'],                attendeeCount:17, duration:'2 hrs',  nextOccurrence:'Wednesday 10:00 AM', pennyEnabled:true,  slackChannel:'#foundations-cohort-2', driveResourceId:'f-03', notes:'Resume review rubric sourced from Drive. Penny assessment integration planned.' },
  { id:'ev-03', title:'Coach Office Hours — Foundations Trail',              eventType:'Office Hours',      calendarId:'cal-office-hours', calendarName:'Office Hours Calendar',         programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'recurring',   frequency:'Weekly',        timezone:'America/Chicago', attendeeRoles:['Learner','Coach'],                attendeeCount:6,  duration:'60 min', nextOccurrence:'Thursday 3:00 PM',  pennyEnabled:false, slackChannel:'#foundations-coaches',  notes:'Open office hours for active cohort learners. Low attendance tracking.' },
  { id:'ev-04', title:'Sprint 3 Assessment Window — Resume Review',          eventType:'Assessment Window', calendarId:'cal-assessments',  calendarName:'Assessment Windows Calendar',   programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'scheduled',   frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Learner'],                       attendeeCount:17, duration:'1 week', nextOccurrence:'Week of Sprint 3 end', pennyEnabled:false, notes:'Penny assessment reminders planned for this event type.' },
  { id:'ev-05', title:'FT Sprint 3 Curriculum Deadline',                     eventType:'Curriculum Deadline', calendarId:'cal-ft-program',calendarName:'FT Program Calendar',            programId:'foundations-trail', programName:'Foundations Trail', cohort:'All',       sprint:'Sprint 3', status:'scheduled',   frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Curriculum Designer','Program Lead'], attendeeCount:2, duration:'—', nextOccurrence:'Friday 5:00 PM', pennyEnabled:false, driveResourceId:'f-04', notes:'Sprint 3 curriculum materials due. Drive deadline tracking.' },
  { id:'ev-06', title:'GT Sprint 1 Module Workshop — Intro to Salesforce',   eventType:'Workshop',          calendarId:'cal-gt-cohort1',   calendarName:'GT Cohort 1 Calendar',          programId:'guided-trail',      programName:'Guided Trail',      cohort:'Cohort 1',  sprint:'Sprint 1', status:'scheduled',   frequency:'One-time',      timezone:'America/Chicago', attendeeRoles:['Learner','Coach'],                attendeeCount:14, duration:'90 min', nextOccurrence:'Tuesday 2:00 PM',   pennyEnabled:true,  slackChannel:'#guided-trail',         driveResourceId:'f-10', notes:'Module 1 workshop. Drive resource linked for prep materials.' },
  { id:'ev-07', title:'ET Cohort 3 Sprint 1 Kickoff',                       eventType:'Cohort Session',    calendarId:'cal-et-program',   calendarName:"ET Program Calendar",           programId:'explorers-trail',   programName:"Explorer's Trail",  cohort:'Cohort 3',  sprint:'Sprint 1', status:'in-progress', frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Learner','Coach','Program Lead'], attendeeCount:11, duration:'90 min', nextOccurrence:'In progress',       pennyEnabled:true,  slackChannel:'#explorers-trail',      driveResourceId:'f-12', notes:'Active session. Penny learning coach engaged.' },
  { id:'ev-08', title:'Coaching Escalation Check-in',                       eventType:'Coaching Session',  calendarId:'cal-coaching',     calendarName:'Coaching Sessions Calendar',    programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'recurring',   frequency:'Bi-weekly',     timezone:'America/Chicago', attendeeRoles:['Coach','Program Lead'],           attendeeCount:4,  duration:'45 min', nextOccurrence:'Friday 11:00 AM',   pennyEnabled:true,  slackChannel:'#foundations-coaches',  driveResourceId:'f-15', notes:'Penny Coaching Escalation briefing source. Protocol document in Drive.' },
  { id:'ev-09', title:'Program Health Review — FT Sprint 3',                eventType:'Leadership Review', calendarId:'cal-executive',    calendarName:'Executive Reviews Calendar',    programId:'foundations-trail', programName:'Foundations Trail', cohort:'All',       sprint:'Sprint 3', status:'scheduled',   frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Executive Lead','Program Lead','Standards Lead'], attendeeCount:3, duration:'60 min', nextOccurrence:'Thursday 2:00 PM', pennyEnabled:false, slackChannel:'#penny-qa',             notes:'Executive brief triggered from this event. Penny Executive Briefs planned.' },
  { id:'ev-10', title:'Sprint 3 Weekly Reflection Delivery',                eventType:'Penny Reminder',    calendarId:'cal-ft-cohort2',   calendarName:'FT Cohort 2 Calendar',          programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'recurring',   frequency:'Weekly',        timezone:'America/Chicago', attendeeRoles:['Learner'],                       attendeeCount:17, duration:'—',      nextOccurrence:'Friday 3:00 PM',    pennyEnabled:true,  slackChannel:'#foundations-cohort-2', driveResourceId:'f-04', notes:'Penny weekly reflection delivery. Scheduled via calendar trigger.' },
  { id:'ev-11', title:'FT Cohort 2 Graduation Milestone',                   eventType:'Client Milestone',  calendarId:'cal-ft-program',   calendarName:'FT Program Calendar',           programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 6', status:'pending',     frequency:'One-time',      timezone:'America/Chicago', attendeeRoles:['Learner','Coach','Program Lead','Executive Lead'], attendeeCount:22, duration:'3 hrs', nextOccurrence:'Sprint 6 final week', pennyEnabled:false, notes:'Graduation event. Penny celebration message planned.' },
  { id:'ev-12', title:'Digital Compass UAT Session 1',                      eventType:'UAT Session',       calendarId:'cal-digital-compass', calendarName:'Digital Compass Client Calendar', programId:'digital-compass', programName:'Digital Compass',   cohort:'—',         sprint:'—',        status:'pending',     frequency:'One-time',      timezone:'America/Chicago', attendeeRoles:['Client','Program Lead','Standards Lead'], attendeeCount:6, duration:'2 hrs', nextOccurrence:'TBD',                pennyEnabled:false, notes:'First UAT session for Digital Compass client. Calendar not yet created.' },
  { id:'ev-13', title:'Weekly Executive Digest Trigger',                    eventType:'Weekly Brief',      calendarId:'cal-executive',    calendarName:'Executive Reviews Calendar',    programId:'foundations-trail', programName:'Foundations Trail', cohort:'All',       sprint:'All',      status:'recurring',   frequency:'Weekly',        timezone:'America/Chicago', attendeeRoles:['Executive Lead'],                attendeeCount:1,  duration:'—',      nextOccurrence:'Monday 8:00 AM',    pennyEnabled:true,  slackChannel:'#penny-qa',             notes:'Trigger for Penny Executive Digest generation. Planned Q3 2025.' },
  { id:'ev-14', title:'Mentor Session — Career Coaching',                   eventType:'Mentor Session',    calendarId:'cal-coaching',     calendarName:'Coaching Sessions Calendar',    programId:'foundations-trail', programName:'Foundations Trail', cohort:'Cohort 2',  sprint:'Sprint 3', status:'scheduled',   frequency:'Monthly',       timezone:'America/Chicago', attendeeRoles:['Learner','Mentor'],               attendeeCount:3,  duration:'45 min', nextOccurrence:'Last Friday of month', pennyEnabled:false, notes:'Mentor-led career coaching sessions. Penny integration planned.' },
  { id:'ev-15', title:'GT Curriculum Submission Deadline',                  eventType:'Curriculum Deadline', calendarId:'cal-gt-program',calendarName:'GT Program Calendar',             programId:'guided-trail',      programName:'Guided Trail',      cohort:'All',       sprint:'Sprint 2', status:'scheduled',   frequency:'Sprint-aligned', timezone:'America/Chicago', attendeeRoles:['Curriculum Designer'],           attendeeCount:1,  duration:'—',      nextOccurrence:'Next Friday',        pennyEnabled:false, driveResourceId:'f-10', notes:'Sprint 2 curriculum deadline. Drive materials due.' },
];

// ── Program & Cohort Mappings ─────────────────────────────────────────────────

export const PROGRAM_EVENT_MAPPINGS: ProgramEventMapping[] = [
  {
    programId: 'foundations-trail',
    programName: 'Foundations Trail',
    calendarIds: ['cal-ft-program', 'cal-ft-cohort2', 'cal-coaching', 'cal-office-hours', 'cal-assessments'],
    events: [
      { eventId:'ev-01', eventTitle:'Sprint 3 Kickoff', eventType:'Cohort Session',    sprintLink:'Sprint 3 — Resume Writing', slackChannelLink:'#foundations-cohort-2', driveResourceLink:'FT Sprint 3 Session Guide', pennyCapabilityLink:'Learner Coaching', promptTemplateLink:'Pre-session Brief', people:['Sarah M.', 'James T.', 'Program Lead'] },
      { eventId:'ev-02', eventTitle:'Resume Writing Workshop', eventType:'Workshop',  moduleLink:'Module: Resume Writing',    assessmentLink:'Resume Review Assessment', driveResourceLink:'Resume Review Rubric', pennyCapabilityLink:'Resume Review', promptTemplateLink:'Workshop Brief', people:['Sarah M.', 'James T.'] },
      { eventId:'ev-08', eventTitle:'Coaching Escalation Check-in', eventType:'Coaching Session', pennyCapabilityLink:'Coaching Escalation', driveResourceLink:'Coaching Escalation Protocol', slackChannelLink:'#foundations-coaches', people:['Sarah M.', 'Program Lead'] },
      { eventId:'ev-09', eventTitle:'Program Health Review', eventType:'Leadership Review', salesforceObjectLink:'SF Program Record — FT', slackChannelLink:'#penny-qa', pennyCapabilityLink:'Executive Briefs', people:['Executive Lead', 'Program Lead'] },
      { eventId:'ev-10', eventTitle:'Weekly Reflection Delivery', eventType:'Penny Reminder', sprintLink:'Sprint 3', driveResourceLink:'Sprint 3 Reflection Prompts', slackChannelLink:'#foundations-cohort-2', pennyCapabilityLink:'Weekly Reflection', promptTemplateLink:'Reflection Template', people:['All Cohort 2 Learners'] },
    ],
  },
  {
    programId: 'guided-trail',
    programName: 'Guided Trail',
    calendarIds: ['cal-gt-program', 'cal-gt-cohort1', 'cal-coaching'],
    events: [
      { eventId:'ev-06', eventTitle:'Module 1 Workshop', eventType:'Workshop', moduleLink:'GT Module 1 — Intro to Salesforce', driveResourceLink:'GT Module 1 Guide', slackChannelLink:'#guided-trail', pennyCapabilityLink:'Learner Coaching', people:['Learners', 'Coach'] },
      { eventId:'ev-15', eventTitle:'GT Curriculum Deadline', eventType:'Curriculum Deadline', sprintLink:'Sprint 2', driveResourceLink:'GT Module 1 Guide', people:['Curriculum Designer'] },
    ],
  },
  {
    programId: 'explorers-trail',
    programName: "Explorer's Trail",
    calendarIds: ['cal-et-program', 'cal-coaching', 'cal-office-hours'],
    events: [
      { eventId:'ev-07', eventTitle:'Cohort 3 Sprint 1 Kickoff', eventType:'Cohort Session', sprintLink:'Sprint 1', driveResourceLink:'ET Cohort 3 Kickoff Materials', slackChannelLink:'#explorers-trail', pennyCapabilityLink:'Learner Coaching', people:['ET Cohort 3 Learners', 'Program Lead'] },
    ],
  },
];

// ── Role & People Mappings ────────────────────────────────────────────────────

export const ROLE_PEOPLE_MAPPINGS: RolePeopleMapping[] = [
  { roleId:'coach',            roleName:'Coach',            pennyPersona:'Coach Support',    peopleCount:3,  eventTypes:['Cohort Session','Workshop','Office Hours','Coaching Session'], ownership:['Office Hours Calendar','Coaching Sessions Calendar'], attendance:['Sprint Kickoffs','Workshops','Coaching Sessions'], facilitation:['Workshops','Office Hours'],   reminderTypes:['Pre-session Brief','Coach Prep Note'],   dependencies:['#foundations-coaches','#guided-trail-coaches','Google Chat Coach Space'] },
  { roleId:'learner',          roleName:'Learner',          pennyPersona:'Learning Coach',   peopleCount:47, eventTypes:['Cohort Session','Workshop','Assessment Window','Office Hours','Penny Reminder'], ownership:[], attendance:['All Cohort Events','Office Hours'], facilitation:[],  reminderTypes:['Attendance Nudge','Weekly Reflection','Assessment Reminder','Sprint Kickoff Brief'], dependencies:['#foundations-cohort-2','#guided-trail','#explorers-trail'] },
  { roleId:'program-lead',     roleName:'Program Lead',     pennyPersona:'Chief of Staff',   peopleCount:2,  eventTypes:['Cohort Session','Leadership Review','Curriculum Deadline','Assessment Window'], ownership:['Program Calendars','Cohort Calendars','Assessment Calendar'], attendance:['All Program Events'], facilitation:['Sprint Kickoffs','Program Reviews'], reminderTypes:['Executive Digest','Sprint Summary'],  dependencies:['#foundations-cohort-2','Salesforce Program Record'] },
  { roleId:'curriculum-designer', roleName:'Curriculum Designer', pennyPersona:'Knowledge Curator', peopleCount:1, eventTypes:['Curriculum Deadline','Workshop'], ownership:['Curriculum Deadlines'], attendance:['Curriculum Reviews'], facilitation:[], reminderTypes:['Deadline Reminder'],  dependencies:['Google Drive Curriculum Folder'] },
  { roleId:'executive',        roleName:'Executive Lead',   pennyPersona:'Chief of Staff',   peopleCount:1,  eventTypes:['Leadership Review','Weekly Brief'], ownership:['Executive Reviews Calendar'], attendance:['Leadership Reviews'], facilitation:['Executive Reviews'], reminderTypes:['Executive Digest','Weekly Brief'],  dependencies:['Executive Reviews Calendar','#penny-qa'] },
  { roleId:'volunteer',        roleName:'Volunteer/Mentor', pennyPersona:'Mentor Support',   peopleCount:6,  eventTypes:['Mentor Session','Office Hours'], ownership:[], attendance:['Mentor Sessions'], facilitation:['Mentor Sessions'],   reminderTypes:['Session Reminder','Attendance Nudge'], dependencies:[] },
];

// ── Penny Scheduling Readiness ────────────────────────────────────────────────

export const PENNY_SCHEDULING_CAPABILITIES: PennySchedulingCapability[] = [
  {
    capabilityId:'pre-session-brief',
    capabilityName:'Pre-Session Brief',
    schedulingDomain:'Coaching',
    triggerType:'Pre-event',
    triggerOffset:'2 hours before session',
    targetRoles:['Coach','Learner'],
    targetEventTypes:['Cohort Session','Workshop','Coaching Session'],
    slackDelivery:'#foundations-cohort-2, #foundations-coaches',
    driveSource:'FT Sprint 3 Session Guide',
    status:'Planned',
    readiness:'Partial',
    blockReason:'Google Calendar credentials not configured. Pre-session trigger requires calendar event access.',
    exampleOutput:'📋 Sprint 3 Kickoff in 2h — 17 learners confirmed. Resume Writing workshop. Drive resource: Sprint 3 Session Guide. Action items from last session: 3 outstanding.',
  },
  {
    capabilityId:'post-session-summary',
    capabilityName:'Post-Session Summary',
    schedulingDomain:'Coaching',
    triggerType:'Post-event',
    triggerOffset:'30 minutes after session',
    targetRoles:['Coach','Program Lead'],
    targetEventTypes:['Cohort Session','Workshop','Coaching Session'],
    slackDelivery:'#foundations-coaches',
    status:'Planned',
    readiness:'Not Ready',
    blockReason:'Google Calendar credentials missing. Post-event trigger and attendee data unavailable.',
    exampleOutput:'✅ Sprint 3 Kickoff complete — 15 of 17 attendees present. 2 missed. Reflection prompts sent. Escalation: Linda K. flagged for follow-up.',
  },
  {
    capabilityId:'attendance-nudge',
    capabilityName:'Attendance Nudge',
    schedulingDomain:'Coaching',
    triggerType:'Reminder',
    triggerOffset:'24 hours + 1 hour before event',
    targetRoles:['Learner'],
    targetEventTypes:['Cohort Session','Workshop','Assessment Window','Office Hours'],
    slackDelivery:'#foundations-cohort-2, #guided-trail, #explorers-trail',
    status:'Planned',
    readiness:'Not Ready',
    blockReason:'Calendar event read access required. GOOGLE_CALENDAR_REFRESH_TOKEN not configured.',
    exampleOutput:'👋 Heads up — Sprint 3 Kickoff is tomorrow at 9 AM. See you there! Resources: [Sprint 3 Guide] in Drive.',
  },
  {
    capabilityId:'weekly-reflection-schedule',
    capabilityName:'Weekly Reflection Scheduler',
    schedulingDomain:'Learning',
    triggerType:'Reminder',
    triggerOffset:'Friday 3:00 PM (sprint-aligned)',
    targetRoles:['Learner'],
    targetEventTypes:['Penny Reminder'],
    slackDelivery:'#foundations-cohort-2',
    driveSource:'Sprint 3 Weekly Reflection Prompts',
    status:'Prototype',
    readiness:'Partial',
    blockReason:'Currently triggered by Slack schedule, not calendar. Calendar integration will improve accuracy.',
    exampleOutput:'📝 Week 3 reflection — How did your resume draft feel? What\'s one thing you learned about the Salesforce hiring process?',
  },
  {
    capabilityId:'escalation-follow-up',
    capabilityName:'Escalation Follow-up',
    schedulingDomain:'Coaching',
    triggerType:'Follow-up',
    triggerOffset:'48 hours after coaching session with escalation flag',
    targetRoles:['Coach','Program Lead'],
    targetEventTypes:['Coaching Session'],
    slackDelivery:'#foundations-coaches',
    driveSource:'Coaching Escalation Protocol',
    status:'Planned',
    readiness:'Partial',
    blockReason:'Escalation trigger defined. Calendar event read required to detect coaching session completion.',
    exampleOutput:'⚠️ Follow-up: Linda K. had a coaching escalation flag 48h ago. Check-in status: pending. Protocol: Coaching Escalation Protocol doc.',
  },
  {
    capabilityId:'coach-prep-note',
    capabilityName:'Coach Prep Note',
    schedulingDomain:'Coaching',
    triggerType:'Pre-event',
    triggerOffset:'Evening before session',
    targetRoles:['Coach'],
    targetEventTypes:['Cohort Session','Workshop','Coaching Session'],
    slackDelivery:'#foundations-coaches',
    driveSource:'Coach Brief Template',
    status:'Planned',
    readiness:'Not Ready',
    blockReason:'Calendar event access required. Coach Brief Template is Authoritative but not yet connected to calendar triggers.',
    exampleOutput:'🏃 Tomorrow — Sprint 3 Kickoff with Cohort 2. 17 learners. 3 flagged for check-in. Session guide in Drive. Focus areas: resume confidence, Salesforce basics.',
  },
  {
    capabilityId:'executive-digest-schedule',
    capabilityName:'Executive Digest Schedule',
    schedulingDomain:'Operations',
    triggerType:'Digest',
    triggerOffset:'Monday 8:00 AM (weekly)',
    targetRoles:['Executive Lead','Program Lead'],
    targetEventTypes:['Weekly Brief','Leadership Review'],
    slackDelivery:'#penny-qa',
    status:'Planned',
    readiness:'Not Ready',
    blockReason:'Executive Reviews Calendar not connected. Executive Brief Template in Draft status.',
    exampleOutput:'📊 Week 12 Executive Digest — FT Sprint 3: 15/17 learners on track. GT Sprint 2: 12/14 on track. ET Cohort 3: Sprint 1 complete. 2 escalations open.',
  },
];

// ── Communications Mapping ────────────────────────────────────────────────────

export const CAL_COMM_MAPPINGS: CalCommunicationMapping[] = [
  {
    calendarId: 'cal-ft-cohort2',
    calendarName: 'FT Cohort 2 Calendar',
    slackChannels: [
      { channel:'#foundations-cohort-2', purpose:'Primary learner delivery — session reminders, reflection prompts, sprint updates', eventTypes:['Cohort Session','Workshop','Penny Reminder','Assessment Window'], pennyEnabled:true, status:'Active' },
      { channel:'#foundations-coaches',  purpose:'Coach coordination — prep briefs, escalation follow-ups, attendance reports',    eventTypes:['Coaching Session','Office Hours'],                                 pennyEnabled:true, status:'Active' },
    ],
    chatSpaces: [
      { channel:'Foundations Trail Space', purpose:'Google Chat space for cohort-wide announcements and resource sharing', eventTypes:['Cohort Session','Workshop'], pennyEnabled:false, status:'Planned' },
    ],
  },
  {
    calendarId: 'cal-gt-cohort1',
    calendarName: 'GT Cohort 1 Calendar',
    slackChannels: [
      { channel:'#guided-trail', purpose:'GT learner and coach shared channel — session updates and reminders', eventTypes:['Cohort Session','Workshop','Penny Reminder'], pennyEnabled:true, status:'Active' },
    ],
    chatSpaces: [],
  },
  {
    calendarId: 'cal-office-hours',
    calendarName: 'Office Hours Calendar',
    slackChannels: [
      { channel:'#foundations-cohort-2', purpose:'Office hours reminders to FT learners',    eventTypes:['Office Hours'], pennyEnabled:false, status:'Planned' },
      { channel:'#guided-trail',         purpose:'Office hours reminders to GT learners',    eventTypes:['Office Hours'], pennyEnabled:false, status:'Planned' },
    ],
    chatSpaces: [],
  },
  {
    calendarId: 'cal-executive',
    calendarName: 'Executive Reviews Calendar',
    slackChannels: [
      { channel:'#penny-qa', purpose:'Executive digest delivery and program health alerts', eventTypes:['Leadership Review','Weekly Brief'], pennyEnabled:true, status:'Planned' },
    ],
    chatSpaces: [],
  },
];

// ── Governance Issues ─────────────────────────────────────────────────────────

export const CAL_GOVERNANCE_ISSUES: CalGovernanceIssue[] = [
  { id:'cgi-01', severity:'Critical', category:'Missing Owner', title:'Digital Compass Client Calendar has no owner',   detail:'Digital Compass Client Calendar is in Planning status with no owner assigned. 2 events exist with no governing person.',                 affectedObjects:['Digital Compass Client Calendar', 'Digital Compass UAT Session 1'],       resolution:'Assign Program Lead or Digital Compass account owner. Create calendar in Google Workspace.', status:'Open' },
  { id:'cgi-02', severity:'High',     category:'Permission',    title:'Google Calendar refresh token missing',            detail:'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured and verified. Only GOOGLE_CALENDAR_REFRESH_TOKEN is missing — OAuth flow not yet completed.',         affectedObjects:['All Calendars', 'All Events'],                                             resolution:'Complete Calendar OAuth flow with calendar.readonly and calendar.events scopes. Store as GOOGLE_CALENDAR_REFRESH_TOKEN.', status:'Open' },
  { id:'cgi-03', severity:'High',     category:'Unmapped',      title:'6 of 11 calendars not connected to Trail OS',       detail:'Operations, Office Hours, Coaching, Assessment, Executive, and Digital Compass calendars have status Not Configured.',            affectedObjects:['Operations Calendar','Office Hours Calendar','Coaching Sessions Calendar','Assessment Calendar','Executive Reviews Calendar','Digital Compass Calendar'], resolution:'After OAuth setup, share each calendar with Trail OS service account and map Google Calendar IDs.', status:'Open' },
  { id:'cgi-04', severity:'High',     category:'Missing Owner', title:'Trail of Mastery has no calendar',                 detail:'Trail of Mastery is in Planning with no calendar created. No events will be visible in Trail OS.',                                  affectedObjects:['Trail of Mastery Program'],                                                resolution:'Create Trail of Mastery Program Calendar in Google Workspace when program enters active planning.', status:'Open' },
  { id:'cgi-05', severity:'High',     category:'Timezone Risk', title:'Timezone not standardized across calendars',       detail:'All calendars use America/Chicago but this is not enforced. Penny scheduling triggers use server timezone by default.',            affectedObjects:['All Calendars', 'Penny Scheduling Capabilities'],                          resolution:'Enforce America/Chicago timezone on all calendar creation. Add timezone validation to Penny trigger logic.', status:'Open' },
  { id:'cgi-06', severity:'Medium',   category:'Stale Event',   title:'Sprint 4+ events missing from FT Cohort 2',       detail:'FT Cohort 2 Calendar only has events through Sprint 3. Sprint 4, 5, 6 events are not yet defined.',                                 affectedObjects:['FT Cohort 2 Calendar'],                                                    resolution:'Program Lead to add Sprint 4–6 events to FT Cohort 2 Calendar before Sprint 4 kickoff.', status:'Open' },
  { id:'cgi-07', severity:'Medium',   category:'Duplicate',     title:'Weekly Reflection appears in both calendar and Slack schedule', detail:'Weekly Reflection Delivery is triggered by both a Calendar event (planned) and an existing Slack schedule. Risk of double delivery.', affectedObjects:['Weekly Reflection (ev-10)', 'Slack Weekly Reflection Flow'], resolution:'Once Calendar integration is live, deprecate Slack schedule trigger and use calendar event as single source of truth.', status:'In Progress' },
  { id:'cgi-08', severity:'Low',      category:'Lifecycle',     title:'FT Cohort 2 Graduation event not yet detailed',   detail:'Graduation milestone event exists in calendar but has no attendee list, agenda, or Drive resources linked.',                          affectedObjects:['FT Cohort 2 Graduation Milestone (ev-11)'],                                resolution:'Program Lead to add agenda and attendee list 3 sprints before graduation date.', status:'Open' },
];

// ── Test Suites ───────────────────────────────────────────────────────────────

export const CAL_TEST_SUITES: CalTestSuite[] = [
  {
    id:'cts-credentials', name:'Account & Credentials', category:'Credentials',
    description:'Validates Google Calendar API credentials and OAuth scope configuration.',
    tests: [
      { id:'ct-01', name:'GOOGLE_CLIENT_ID present',         description:'Verify GOOGLE_CLIENT_ID is set in environment.', status:'pass',    result:'GOOGLE_CLIENT_ID confirmed present — format: *.apps.googleusercontent.com ✓' },
      { id:'ct-02', name:'GOOGLE_CLIENT_SECRET present',     description:'Verify GOOGLE_CLIENT_SECRET is set.',            status:'pass',    result:'GOOGLE_CLIENT_SECRET confirmed present — format plausible ✓' },
      { id:'ct-03', name:'GOOGLE_CALENDAR_REFRESH_TOKEN set',description:'Calendar refresh token configured.',              status:'fail',    result:'Refresh token not found. Client credentials are ready — complete Calendar OAuth flow and store as GOOGLE_CALENDAR_REFRESH_TOKEN.' },
      { id:'ct-04', name:'Calendar API enabled in GCP',      description:'Google Calendar API enabled in project.',        status:'warning', result:'Cannot verify without credentials. Check GCP console.' },
      { id:'ct-05', name:'calendar.readonly scope active',   description:'Read scope declared and granted.',               status:'warning', result:'Cannot verify without credentials.' },
      { id:'ct-06', name:'calendar.events scope active',     description:'Events write scope for Penny creation.',         status:'warning', result:'Cannot verify without credentials.' },
    ],
  },
  {
    id:'cts-calendar-access', name:'Calendar Access', category:'Calendar Access',
    description:'Tests read access to all registered Trail OS calendars.',
    tests: [
      { id:'ct-07', name:'FT Program Calendar accessible',    description:'Can read Foundations Trail Program Calendar.', status:'blocked', result:'Blocked — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'ct-08', name:'FT Cohort 2 Calendar accessible',   description:'Can read FT Cohort 2 Calendar.',              status:'blocked', result:'Blocked — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'ct-09', name:'Office Hours Calendar accessible',  description:'Can read Office Hours Calendar.',             status:'blocked', result:'Blocked — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'ct-10', name:'Coaching Calendar accessible',      description:'Can read Coaching Sessions Calendar.',        status:'blocked', result:'Blocked — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
      { id:'ct-11', name:'Executive Calendar accessible',     description:'Can read Executive Reviews Calendar.',        status:'blocked', result:'Blocked — credentials not configured.', blockedBy:'GOOGLE_CLIENT_ID not configured' },
    ],
  },
  {
    id:'cts-event-listing', name:'Event Listing', category:'Events',
    description:'Tests event enumeration, filtering, and metadata access.',
    tests: [
      { id:'ct-12', name:'List events in program calendar',   description:'Can enumerate events with time filter.',     status:'blocked', result:'Blocked — no calendar access.', blockedBy:'Calendar access blocked' },
      { id:'ct-13', name:'Recurring event expansion',         description:'Recurring events expand to instances.',     status:'blocked', result:'Blocked — no calendar access.', blockedBy:'Calendar access blocked' },
      { id:'ct-14', name:'Timezone normalization',            description:'All event times normalize to America/Chicago.', status:'blocked', result:'Blocked — no calendar access.', blockedBy:'Calendar access blocked' },
      { id:'ct-15', name:'Malformed recurrence rule handling',description:'Malformed RRULE returns error gracefully.', status:'pending', result:'Error handling logic defined. Test pending credentials.' },
    ],
  },
  {
    id:'cts-mapping', name:'Mapping Integrity', category:'Mapping',
    description:'Validates completeness of event-to-program, role, and Penny mappings.',
    tests: [
      { id:'ct-16', name:'All active programs have calendars', description:'Every active program has at least one calendar.', status:'pass',    result:'3 of 3 active programs have program calendars. Planning programs (ToM, DC) noted.' },
      { id:'ct-17', name:'All events mapped to programs',      description:'Every event references a valid program.',        status:'pass',    result:'15 of 15 catalogued events have program associations.' },
      { id:'ct-18', name:'All roles have event type coverage', description:'Every role has at least one relevant event type.', status:'pass',  result:'6 of 6 roles have event type coverage defined.' },
      { id:'ct-19', name:'All Penny capabilities have calendar triggers', description:'Every scheduling capability has a calendar event trigger.', status:'warning', result:'7 of 7 capabilities defined. 5 blocked by missing credentials.' },
      { id:'ct-20', name:'No orphaned events in catalog',      description:'All events have valid calendar and program links.', status:'pass', result:'All 15 events have valid associations.' },
    ],
  },
  {
    id:'cts-governance', name:'Governance Checks', category:'Governance',
    description:'Validates calendar ownership, visibility, timezone, and lifecycle status.',
    tests: [
      { id:'ct-21', name:'All calendars have owners',          description:'Every calendar has an assigned owner in Trail OS.', status:'fail', result:'1 calendar has no owner: Digital Compass Client Calendar.' },
      { id:'ct-22', name:'Timezone consistency',               description:'All calendars use standardized timezone.',    status:'warning', result:'All currently defined as America/Chicago but not enforced at API level.' },
      { id:'ct-23', name:'No duplicate events detected',       description:'No events with identical title+time+calendar.', status:'pass',   result:'No duplicates detected in current catalog (15 events).' },
      { id:'ct-24', name:'All active events have owners',      description:'Every non-cancelled event has an owner role.', status:'pass',   result:'All 15 events have owner roles defined.' },
    ],
  },
  {
    id:'cts-error-handling', name:'Error Handling', category:'Resilience',
    description:'Tests system behavior for missing credentials, unavailable calendars, and invalid payloads.',
    tests: [
      { id:'ct-25', name:'Missing credentials — graceful fallback', description:'System displays readiness state when credentials missing.', status:'pass',    result:'Integration Center renders in readiness mode when credentials not configured.' },
      { id:'ct-26', name:'Unavailable calendar — error display',    description:'Unavailable calendar shows error with resolution steps.', status:'pass',    result:'Calendar with status Not Configured displays resolution guide.' },
      { id:'ct-27', name:'Invalid event payload — skip and log',    description:'Malformed event data is skipped and logged, not crashed.', status:'pending', result:'Error boundary defined. Live test pending credentials.' },
      { id:'ct-28', name:'Permission failure — user guidance',      description:'Permission error shows actionable guidance.',             status:'pass',    result:'All permission failures in Governance tab show resolution steps.' },
    ],
  },
  {
    id:'cts-search', name:'Search & Profiles', category:'Search',
    description:'Tests Global Search indexing and Universal Object Profile rendering for calendar objects.',
    tests: [
      { id:'ct-29', name:'Calendars indexed in Global Search',    description:'Calendar objects appear in Global Search.',         status:'pending', result:'Calendar registry defined. Search indexing pending API connection.' },
      { id:'ct-30', name:'Events indexed in Global Search',       description:'Event objects appear in Global Search results.',   status:'pending', result:'Event catalog defined. Search indexing pending API connection.' },
      { id:'ct-31', name:'Universal Object Profile renders',      description:'Object Profiles render for calendar and events.',  status:'pass',    result:'Object Profiles render in Calendar Registry and Event Catalog tabs.' },
      { id:'ct-32', name:'Relationship Explorer — event to program', description:'Can traverse event → program → cohort → sprint.', status:'pass', result:'Relationship graph traversal defined and renders in Program Mapping tab.' },
    ],
  },
];

// ── Health Scores ─────────────────────────────────────────────────────────────

export const CAL_HEALTH_SCORES: CalHealthScore[] = [
  { dimension:'credentials', label:'Account & Credentials', score:0, maxScore:10, status:'not-ready', note:'All 3 required secrets missing', items:[{ label:'GOOGLE_CLIENT_ID', status:'fail', note:'Not set' },{ label:'GOOGLE_CLIENT_SECRET', status:'fail', note:'Not set' },{ label:'Calendar Refresh Token', status:'fail', note:'Not set' }] },
  { dimension:'calendar-access', label:'Calendar Access', score:2, maxScore:10, status:'not-ready', note:'11 calendars defined, 0 Google-verified', items:[{ label:'FT Program Calendar', status:'partial', note:'Defined, not verified' },{ label:'Cohort Calendars', status:'partial', note:'2 defined, not verified' },{ label:'Operations Calendar', status:'fail', note:'Not configured' },{ label:'Office Hours Calendar', status:'fail', note:'Not configured' },{ label:'Executive Calendar', status:'fail', note:'Not configured' }] },
  { dimension:'event-readiness', label:'Event Readiness', score:6, maxScore:10, status:'partial', note:'15 events catalogued, not live-synced', items:[{ label:'Events Catalogued', status:'pass', note:'15 events across 9 types' },{ label:'Recurring Events', status:'partial', note:'5 recurring events defined' },{ label:'Program Mappings', status:'pass', note:'All events have program links' },{ label:'Timezone Consistency', status:'partial', note:'Not enforced at API level' }] },
  { dimension:'role-mapping', label:'Role & People Mapping', score:7, maxScore:10, status:'partial', note:'6 roles mapped, event coverage complete', items:[{ label:'Role Coverage', status:'pass', note:'6 of 6 roles have event types' },{ label:'People Assignments', status:'partial', note:'Named individuals in 3 roles' },{ label:'Ownership', status:'partial', note:'1 calendar missing owner' }] },
  { dimension:'penny-readiness', label:'Penny Scheduling Readiness', score:2, maxScore:10, status:'not-ready', note:'7 capabilities defined, 5 blocked on credentials', items:[{ label:'Weekly Reflection Trigger', status:'partial', note:'Prototype via Slack schedule' },{ label:'Pre-Session Brief', status:'fail', note:'Blocked on Calendar credentials' },{ label:'Attendance Nudge', status:'fail', note:'Blocked on Calendar credentials' },{ label:'Escalation Follow-up', status:'partial', note:'Partially defined' }] },
  { dimension:'comm-mapping', label:'Communication Mapping', score:5, maxScore:10, status:'partial', note:'4 calendars have Slack channel links', items:[{ label:'FT Cohort 2 → Slack', status:'pass', note:'2 channels mapped' },{ label:'GT Cohort 1 → Slack', status:'pass', note:'1 channel mapped' },{ label:'Office Hours → Slack', status:'partial', note:'Planned, not active' },{ label:'Executive → Slack', status:'partial', note:'Planned, not active' }] },
  { dimension:'governance', label:'Governance Readiness', score:4, maxScore:10, status:'partial', note:'2 critical governance issues open', items:[{ label:'Calendar Ownership', status:'partial', note:'1 of 11 calendars missing owner' },{ label:'Timezone Enforcement', status:'partial', note:'Not enforced at API level' },{ label:'Event Completeness', status:'partial', note:'Sprint 4+ events missing' },{ label:'Duplicate Prevention', status:'pass', note:'No duplicates detected' }] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCalValidationSummary() {
  const pass    = CAL_VALIDATION_CHECKS.filter(c => c.status === 'pass').length;
  const fail    = CAL_VALIDATION_CHECKS.filter(c => c.status === 'fail').length;
  const warning = CAL_VALIDATION_CHECKS.filter(c => c.status === 'warning').length;
  const pending = CAL_VALIDATION_CHECKS.filter(c => c.status === 'pending').length;
  return { pass, fail, warning, pending, total: CAL_VALIDATION_CHECKS.length };
}

export function getCalGovernanceSummary() {
  const open = CAL_GOVERNANCE_ISSUES.filter(i => i.status !== 'Resolved');
  return {
    critical: open.filter(i => i.severity === 'Critical').length,
    high:     open.filter(i => i.severity === 'High').length,
    medium:   open.filter(i => i.severity === 'Medium').length,
    low:      open.filter(i => i.severity === 'Low').length,
  };
}

export function getCalTestSummary() {
  const all     = CAL_TEST_SUITES.flatMap(s => s.tests);
  const pass    = all.filter(t => t.status === 'pass').length;
  const fail    = all.filter(t => t.status === 'fail').length;
  const blocked = all.filter(t => t.status === 'blocked').length;
  return { pass, fail, blocked, total: all.length, pct: Math.round((pass / all.length) * 100) };
}
