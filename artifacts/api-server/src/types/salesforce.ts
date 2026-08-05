export interface LearnerContext {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  pennyTrail: string | null;
  pennyTrailConfigId: string | null;
  currentPhase: string | null;
  currentGoal: string | null;
  currentBlockers: string | null;
  coachingTone: string | null;
  confidenceScore: number | null;
  skillScore: number | null;
  sprintWeek: number | null;
  onboardingComplete: boolean;
}

export interface LearnerContextUpdate {
  Penny_Current_Phase__c: string;
  Penny_Current_Goal__c: string;
  Penny_Current_Blockers__c: string;
  Penny_Confidence_Score__c: number;
  Penny_Skill_Score__c: number;
  Penny_Sprint_Week__c: number;
  Penny_Onboarding_Complete__c: boolean;
  Penny_Coaching_Tone__c: string;
}

export interface TrailConfig {
  id: string;
  name: string;
  trailId: string;
  pennyRole: string | null;
  tone: string | null;
  focalPoints: string | null;
  specialInstructions: string | null;
  isActive: boolean;
}

/**
 * Permitted values for Penny_Interaction_Log__c.Source__c.
 *
 * This field is a RESTRICTED picklist in Salesforce — any value not in this
 * list causes the entire record insert to be rejected.  Keep this in sync with
 * the org schema.  Do NOT add values here without first adding them to the
 * picklist in SF Setup → Object Manager → Penny Interaction Log → Fields → Source.
 *
 * Permitted values confirmed by a live SF describe on 2026-08-05:
 *   'TRAIL OS', 'dashboard', 'slack_dm', 'slack_mention', 'mobile'
 *
 * Origin → source mapping:
 *   Trail OS web interface  → 'TRAIL OS'   (this file; all /api/penny/ask requests)
 *   Slack DM                → 'slack_dm'   (future Slack bot route)
 *   Slack @mention          → 'slack_mention' (future Slack bot route)
 *   Mobile app              → 'mobile'     (future mobile route)
 *   Legacy / existing recs  → 'dashboard'  (kept for backward compat with old records)
 *
 * History: original code wrote "web" (not permitted → silent zero-record failure).
 * Then corrected to "dashboard" (permitted but semantically wrong for the web UI).
 * On 2026-08-05 the org added 'TRAIL OS' as the canonical web-interface value.
 */
export type SfInteractionSource = 'TRAIL OS' | 'dashboard' | 'slack_dm' | 'slack_mention' | 'mobile';

export const SF_INTERACTION_SOURCES: readonly SfInteractionSource[] = [
  'TRAIL OS', 'dashboard', 'slack_dm', 'slack_mention', 'mobile',
] as const;

// Compile-time exhaustiveness guard — if SfInteractionSource and
// SF_INTERACTION_SOURCES drift apart this assignment fails to typecheck.
const _sourceExhaustive: Record<SfInteractionSource, true> =
  Object.fromEntries(SF_INTERACTION_SOURCES.map(s => [s, true])) as Record<SfInteractionSource, true>;
void _sourceExhaustive;

export interface LogInteractionPayload {
  /**
   * Salesforce Contact Id for the learner being coached.
   * Pass null for internal-staff sessions — Learner__c will be left blank
   * (requires the field to be nillable on the SF object) and Admin_Email__c
   * will be populated instead so the record is still attributable.
   */
  contactId: string | null;
  /**
   * Email of the authenticated staff user.  Only written when contactId is null.
   * Stored in Admin_Email__c so staff exchanges are attributable in Salesforce
   * without needing a Contact lookup.
   */
  adminEmail?: string | null;
  userMessage: string;
  pennyResponse: string;
  /** Plain string — not a picklist. Describe what actually happened, e.g. "ask+learner+memory". */
  promptMode: string;
  /** Must be one of SF_INTERACTION_SOURCES — Source__c is a restricted picklist. */
  source: SfInteractionSource;
  /**
   * Audience identity used for this exchange ('learner', 'internal', etc.).
   * Written to Audience__c on Penny_Interaction_Log__c (field added 2026-08-05).
   * Also captured by the local DB (pennyLogsTable).
   */
  audience?: string | null;
}

export interface InteractionLogRecord {
  id: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
  audience: string | null;
  createdDate: string;
}

/**
 * Permitted values for TT_Session_Log__c.Session_Type__c.
 *
 * If Session_Type__c is a RESTRICTED picklist in the org, any value not in
 * this list will cause Salesforce to silently reject the insert.  Verify
 * permitted values via GET /sessions/describe and keep this array in sync.
 * Add new values here only after adding them to the picklist in SF Setup →
 * Object Manager → TT Session Log → Fields → Session Type.
 */
export type SfSessionType =
  | 'Coaching Session'
  | 'Group Session'
  | 'Workshop'
  | 'Check-in'
  | 'Orientation'
  | 'Other';

export const SF_SESSION_TYPES: readonly SfSessionType[] = [
  'Coaching Session',
  'Group Session',
  'Workshop',
  'Check-in',
  'Orientation',
  'Other',
] as const;

/**
 * Permitted values for TT_Session_Log__c.Status__c.
 *
 * Same restricted-picklist risk as Session_Type__c above.  Verify against
 * GET /sessions/describe and keep in sync with the SF org schema.
 */
export type SfSessionStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'
  | 'Rescheduled';

export const SF_SESSION_STATUSES: readonly SfSessionStatus[] = [
  'Scheduled',
  'Completed',
  'Cancelled',
  'No Show',
  'Rescheduled',
] as const;

export interface CareerReviewRecord {
  id: string;
  name: string;
  areaScores: string | null;
  feedbackJson: string | null;
  readinessLabel: string | null;
  reviewMode: string | null;
  reviewedAt: string | null;
  targetRole: string | null;
  createdDate: string;
}

export interface CreateCareerReviewPayload {
  contactId: string;
  areaScores: string;
  feedbackJson: string;
  readinessLabel: string;
  reviewMode: string;
  reviewedAt: string;
  targetRole: string;
}

export interface QuestSubmissionRecord {
  id: string;
  name: string;
  submissionText: string | null;
  submittedAt: string | null;
  createdDate: string;
}

export interface CreateQuestSubmissionPayload {
  name: string;
  submissionText: string;
  submittedAt: string;
}

export interface BadgeRecord {
  id: string;
  name: string;
  awardedBy: string | null;
  learnerId: string;
  createdDate: string;
}

export interface GamificationRecord {
  id: string;
  name: string;
  points: number | null;
  sprintPoints: number | null;
  sprintNumber: number | null;
  reason: string | null;
  note: string | null;
  awardedBy: string | null;
  createdDate: string;
}

export interface WeeklyReportRecord {
  id: string;
  name: string;
  generatedAt: string | null;
  topThemes: string | null;
  supportFlags: string | null;
  suggestedActions: string | null;
  trailBreakdown: string | null;
  weekStart: string | null;
  weekEnd: string | null;
  createdDate: string;
}

export interface CreateWeeklyReportPayload {
  topThemes: string;
  supportFlags: string;
  suggestedActions: string;
  trailBreakdown: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
}

// ── Build Governance ──────────────────────────────────────────────────────────

/**
 * A TT_Build_Item__c record.
 * The only confirmed custom field is TT_Automation__c (a lookup to TT_Automation__c).
 * Additional fields (Status__c, Priority__c, etc.) do not yet exist on the live org
 * and must not be queried or written until they are added and confirmed via the
 * preflight check.
 */
export interface BuildItemRecord {
  id: string;
  name: string;
  /** Lookup to TT_Automation__c — may be null when not yet linked. */
  automationId: string | null;
  createdDate: string;
}

export interface CreateBuildItemPayload {
  name: string;
  /** Optional lookup to TT_Automation__c. */
  automationId?: string;
}

// ── TT Automation ─────────────────────────────────────────────────────────────

/**
 * A TT_Automation__c record — returned only when the four governance filter
 * fields are confirmed present on the org.
 *
 * All four fields (Is_Active__c, Automation_Type__c, Description__c, Status__c)
 * have been confirmed provisioned on TT_Automation__c.  Do not query
 * TT_Automation__c without first verifying these fields exist; without them any
 * SOQL against the object returns every record unfiltered (no active/type filter
 * possible).
 */
export interface AutomationRecord {
  id: string;
  name: string;
  /** Is_Active__c — filter field; used in WHERE clause to restrict to active automations. */
  isActive: boolean;
  /** Automation_Type__c — classification field for the automation. */
  automationType: string | null;
  /** Description__c — human-readable description of the automation. */
  description: string | null;
  /** Status__c — current lifecycle status of the automation. */
  status: string | null;
  createdDate: string;
}

// ── Classroom Nudges ──────────────────────────────────────────────────────────

/**
 * A Penny_Classroom_Nudge__c record.
 * Confirmed fields (via preflight): Course_Work_ID__c, Learner__c,
 * Nudge_Date__c, Sent_At__c.
 */
export interface ClassroomNudgeRecord {
  id: string;
  name: string;
  courseWorkId: string | null;
  learnerId: string;
  nudgeDate: string | null;
  sentAt: string | null;
  createdDate: string;
}

export interface CreateClassroomNudgePayload {
  /** Salesforce Contact Id for the learner receiving the nudge. */
  contactId: string;
  /** External course work / activity identifier. */
  courseWorkId: string;
  /** ISO date string (YYYY-MM-DD). */
  nudgeDate: string;
  /** ISO datetime string when the nudge was dispatched. */
  sentAt: string;
}
