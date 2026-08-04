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
 * History: the original code wrote "web", which is not a permitted value.
 * Salesforce silently rejected every insert; the fire-and-forget design meant
 * the failure was only visible in server logs.  The correct value for the Trail
 * OS web interface is "dashboard".
 */
export type SfInteractionSource = 'dashboard' | 'slack_dm' | 'slack_mention' | 'mobile';

export const SF_INTERACTION_SOURCES: readonly SfInteractionSource[] = [
  'dashboard', 'slack_dm', 'slack_mention', 'mobile',
] as const;

export interface LogInteractionPayload {
  contactId: string;
  userMessage: string;
  pennyResponse: string;
  /** Plain string — not a picklist. Describe what actually happened, e.g. "ask+learner+memory". */
  promptMode: string;
  /** Must be one of SF_INTERACTION_SOURCES — Source__c is a restricted picklist. */
  source: SfInteractionSource;
}

export interface InteractionLogRecord {
  id: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
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
