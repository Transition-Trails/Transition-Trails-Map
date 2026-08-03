import type { ISalesforceClient } from "./salesforceClient.js";
import type {
  LearnerContext,
  LearnerContextUpdate,
  TrailConfig,
  LogInteractionPayload,
  InteractionLogRecord,
  CareerReviewRecord,
  CreateCareerReviewPayload,
  QuestSubmissionRecord,
  CreateQuestSubmissionPayload,
  BadgeRecord,
  GamificationRecord,
  WeeklyReportRecord,
  CreateWeeklyReportPayload,
} from "../types/salesforce.js";

// ── Raw SF response shapes (internal, not exported) ───────────────────────────

interface RawContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Penny_Trail__c: string | null;
  Penny_Trail_Config__c: string | null;
  Penny_Current_Phase__c: string | null;
  Penny_Current_Goal__c: string | null;
  Penny_Current_Blockers__c: string | null;
  Penny_Coaching_Tone__c: string | null;
  Penny_Confidence_Score__c: number | null;
  Penny_Skill_Score__c: number | null;
  Penny_Sprint_Week__c: number | null;
  Penny_Onboarding_Complete__c: boolean;
}

interface RawTrailConfig {
  Id: string;
  Name: string;
  Trail_ID__c: string;
  Penny_Role__c: string | null;
  Tone__c: string | null;
  Focal_Points__c: string | null;
  Special_Instructions__c: string | null;
  Is_Active__c: boolean;
}

interface RawInteractionLog {
  Id: string;
  User_Message__c: string;
  Penny_Response__c: string;
  Prompt_Mode__c: string;
  Source__c: string;
  CreatedDate: string;
}

interface RawCareerReview {
  Id: string;
  Name: string;
  Area_Scores__c: string | null;
  Feedback_JSON__c: string | null;
  Readiness_Label__c: string | null;
  Review_Mode__c: string | null;
  Reviewed_At__c: string | null;
  Target_Role__c: string | null;
  CreatedDate: string;
}

interface RawQuestSubmission {
  Id: string;
  Name: string;
  Submission_Text__c: string | null;
  Submitted_At__c: string | null;
  CreatedDate: string;
}

interface RawBadge {
  Id: string;
  Name: string;
  Awarded_By__c: string | null;
  Learner__c: string;
  CreatedDate: string;
}

interface RawGamification {
  Id: string;
  Name: string;
  Points__c: number | null;
  Sprint_Points__c: number | null;
  Sprint_Number__c: number | null;
  Reason__c: string | null;
  Note__c: string | null;
  Awarded_By__c: string | null;
  CreatedDate: string;
}

interface RawWeeklyReport {
  Id: string;
  Name: string;
  Generated_At__c: string | null;
  Top_Themes__c: string | null;
  Support_Flags__c: string | null;
  Suggested_Actions__c: string | null;
  Trail_Breakdown__c: string | null;
  Week_Start__c: string | null;
  Week_End__c: string | null;
  CreatedDate: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function requireOne<T>(records: T[], label: string): T {
  if (records.length === 0) {
    throw new Error(`Salesforce: no ${label} record found.`);
  }
  return records[0]!;
}

// ── Learner context ───────────────────────────────────────────────────────────

export async function getLearnerContext(
  client: ISalesforceClient,
  contactId: string
): Promise<LearnerContext> {
  const soql = `SELECT Id, FirstName, LastName, Email, Penny_Trail__c, Penny_Trail_Config__c, Penny_Current_Phase__c, Penny_Current_Goal__c, Penny_Current_Blockers__c, Penny_Coaching_Tone__c, Penny_Confidence_Score__c, Penny_Skill_Score__c, Penny_Sprint_Week__c, Penny_Onboarding_Complete__c FROM Contact WHERE Id = '${contactId}' LIMIT 1`;

  const result = await client.query<RawContact>(soql);
  const raw = requireOne(result.records, `Contact/${contactId}`);

  return {
    id:                raw.Id,
    firstName:         raw.FirstName,
    lastName:          raw.LastName,
    email:             raw.Email,
    pennyTrail:        raw.Penny_Trail__c,
    pennyTrailConfigId: raw.Penny_Trail_Config__c,
    currentPhase:      raw.Penny_Current_Phase__c,
    currentGoal:       raw.Penny_Current_Goal__c,
    currentBlockers:   raw.Penny_Current_Blockers__c,
    coachingTone:      raw.Penny_Coaching_Tone__c,
    confidenceScore:   raw.Penny_Confidence_Score__c,
    skillScore:        raw.Penny_Skill_Score__c,
    sprintWeek:        raw.Penny_Sprint_Week__c,
    onboardingComplete: raw.Penny_Onboarding_Complete__c,
  };
}

const WRITABLE_LEARNER_FIELDS = new Set<keyof LearnerContextUpdate>([
  "Penny_Current_Phase__c",
  "Penny_Current_Goal__c",
  "Penny_Current_Blockers__c",
  "Penny_Confidence_Score__c",
  "Penny_Skill_Score__c",
  "Penny_Sprint_Week__c",
  "Penny_Onboarding_Complete__c",
  "Penny_Coaching_Tone__c",
]);

export async function updateLearnerContext(
  client: ISalesforceClient,
  contactId: string,
  fields: Partial<LearnerContextUpdate>
): Promise<void> {
  const safeFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (WRITABLE_LEARNER_FIELDS.has(key as keyof LearnerContextUpdate)) {
      safeFields[key] = value;
    }
  }
  await client.updateRecord("Contact", contactId, safeFields);
}

// ── Trail configs ─────────────────────────────────────────────────────────────

function mapTrailConfig(raw: RawTrailConfig): TrailConfig {
  return {
    id:                 raw.Id,
    name:               raw.Name,
    trailId:            raw.Trail_ID__c,
    pennyRole:          raw.Penny_Role__c,
    tone:               raw.Tone__c,
    focalPoints:        raw.Focal_Points__c,
    specialInstructions: raw.Special_Instructions__c,
    isActive:           raw.Is_Active__c,
  };
}

export async function getTrailConfig(
  client: ISalesforceClient,
  trailConfigId: string
): Promise<TrailConfig> {
  const soql = `SELECT Id, Name, Trail_ID__c, Penny_Role__c, Tone__c, Focal_Points__c, Special_Instructions__c, Is_Active__c FROM Penny_Trail_Config__c WHERE Id = '${trailConfigId}' LIMIT 1`;
  const result = await client.query<RawTrailConfig>(soql);
  return mapTrailConfig(requireOne(result.records, `Penny_Trail_Config__c/${trailConfigId}`));
}

export async function getAllTrailConfigs(
  client: ISalesforceClient
): Promise<TrailConfig[]> {
  const soql = `SELECT Id, Name, Trail_ID__c, Penny_Role__c, Tone__c, Focal_Points__c, Special_Instructions__c, Is_Active__c FROM Penny_Trail_Config__c ORDER BY Is_Active__c DESC, Trail_ID__c ASC`;
  const result = await client.query<RawTrailConfig>(soql);
  return result.records.map(mapTrailConfig);
}

export async function getActiveTrailConfigs(
  client: ISalesforceClient
): Promise<TrailConfig[]> {
  const all = await getAllTrailConfigs(client);
  return all.filter(c => c.isActive);
}

// ── Interaction logs ──────────────────────────────────────────────────────────

// Salesforce field limits for Penny_Interaction_Log__c:
//   User_Message__c   — textarea, max 32 768 chars
//   Penny_Response__c — textarea, max 32 768 chars
//   Prompt_Mode__c    — string,   max 50 chars
// We apply a conservative limit (10 000 chars) on the two textarea fields so
// very long exchanges don't push against SF hard limits.  Full text is always
// in the local DB (pennyLogsTable), which has no such constraint.
const SF_TEXTAREA_LIMIT = 10_000;

/**
 * Truncate a string to the SF textarea field limit with an explicit marker.
 * The marker is important: it tells anyone reading the SF record that the
 * value was intentionally cut rather than corrupted.
 */
function truncateSf(s: string): string {
  if (s.length <= SF_TEXTAREA_LIMIT) return s;
  return s.slice(0, SF_TEXTAREA_LIMIT) + ' [truncated — full text in local DB]';
}

export async function logInteraction(
  client: ISalesforceClient,
  payload: LogInteractionPayload
): Promise<{ id: string }> {
  // NOTE: Penny_Interaction_Log__c.Learner__c is NOT nillable (required).
  // Records can only be created when a Contact is resolved.  Internal-staff
  // exchanges (no contactId) are written only to the local DB.
  //
  // NOTE: Fields that do not exist in this object's current schema are NOT
  // written here: model, durationMs, layersPresent, audience, userTier.
  // Those metadata fields are captured by the local DB (pennyLogsTable).
  // If they are added to the SF schema in a future sprint, map them here.
  //
  // Assignment__c intentionally omitted — always null.
  // Future LMS integration will populate this field; do not set it here.
  const result = await client.createRecord("Penny_Interaction_Log__c", {
    Learner__c:        payload.contactId,
    User_Message__c:   truncateSf(payload.userMessage),
    Penny_Response__c: truncateSf(payload.pennyResponse),
    Prompt_Mode__c:    payload.promptMode.slice(0, 50),
    Source__c:         payload.source,
  });
  return { id: result.id };
}

export async function getInteractionHistory(
  client: ISalesforceClient,
  contactId: string,
  limitCount: number
): Promise<InteractionLogRecord[]> {
  const soql = `SELECT Id, User_Message__c, Penny_Response__c, Prompt_Mode__c, Source__c, CreatedDate FROM Penny_Interaction_Log__c WHERE Learner__c = '${contactId}' ORDER BY CreatedDate DESC LIMIT ${limitCount}`;
  const result = await client.query<RawInteractionLog>(soql);
  return result.records.map((raw) => ({
    id:           raw.Id,
    userMessage:  raw.User_Message__c,
    pennyResponse: raw.Penny_Response__c,
    promptMode:   raw.Prompt_Mode__c,
    source:       raw.Source__c,
    createdDate:  raw.CreatedDate,
  }));
}

// ── Career reviews ────────────────────────────────────────────────────────────

function mapCareerReview(raw: RawCareerReview): CareerReviewRecord {
  return {
    id:             raw.Id,
    name:           raw.Name,
    areaScores:     raw.Area_Scores__c,
    feedbackJson:   raw.Feedback_JSON__c,
    readinessLabel: raw.Readiness_Label__c,
    reviewMode:     raw.Review_Mode__c,
    reviewedAt:     raw.Reviewed_At__c,
    targetRole:     raw.Target_Role__c,
    createdDate:    raw.CreatedDate,
  };
}

export async function getCareerReviews(
  client: ISalesforceClient,
  contactId: string
): Promise<CareerReviewRecord[]> {
  const soql = `SELECT Id, Name, Area_Scores__c, Feedback_JSON__c, Readiness_Label__c, Review_Mode__c, Reviewed_At__c, Target_Role__c, CreatedDate FROM Penny_Career_Review__c WHERE Learner__c = '${contactId}' ORDER BY CreatedDate DESC`;
  const result = await client.query<RawCareerReview>(soql);
  return result.records.map(mapCareerReview);
}

export async function createCareerReview(
  client: ISalesforceClient,
  payload: CreateCareerReviewPayload
): Promise<{ id: string }> {
  const result = await client.createRecord("Penny_Career_Review__c", {
    Learner__c:        payload.contactId,
    Area_Scores__c:    payload.areaScores,
    Feedback_JSON__c:  payload.feedbackJson,
    Readiness_Label__c: payload.readinessLabel,
    Review_Mode__c:    payload.reviewMode,
    Reviewed_At__c:    payload.reviewedAt,
    Target_Role__c:    payload.targetRole,
  });
  return { id: result.id };
}

// ── Quest submissions ─────────────────────────────────────────────────────────

export async function getQuestSubmissions(
  client: ISalesforceClient,
  contactId: string
): Promise<QuestSubmissionRecord[]> {
  // Querying via Learner__c lookup. If this field does not exist on
  // Penny_Quest_Submission__c, the query will fail with a field-not-found error
  // from Salesforce — in that case, the object schema needs a Learner__c
  // lookup field added pointing to Contact.
  const soql = `SELECT Id, Name, Submission_Text__c, Submitted_At__c, CreatedDate FROM Penny_Quest_Submission__c WHERE Learner__c = '${contactId}' ORDER BY CreatedDate DESC`;
  const result = await client.query<RawQuestSubmission>(soql);
  return result.records.map((raw) => ({
    id:             raw.Id,
    name:           raw.Name,
    submissionText: raw.Submission_Text__c,
    submittedAt:    raw.Submitted_At__c,
    createdDate:    raw.CreatedDate,
  }));
}

export async function createQuestSubmission(
  client: ISalesforceClient,
  payload: CreateQuestSubmissionPayload
): Promise<{ id: string }> {
  const result = await client.createRecord("Penny_Quest_Submission__c", {
    Name:              payload.name,
    Submission_Text__c: payload.submissionText,
    Submitted_At__c:   payload.submittedAt,
    // Assignment__c intentionally omitted — always null.
    // Future LMS integration will populate this field; do not set it here.
  });
  return { id: result.id };
}

// ── Badges ────────────────────────────────────────────────────────────────────

export async function getBadges(
  client: ISalesforceClient,
  contactId: string
): Promise<BadgeRecord[]> {
  const soql = `SELECT Id, Name, Awarded_By__c, Learner__c, CreatedDate FROM Penny_Badge__c WHERE Learner__c = '${contactId}' ORDER BY CreatedDate DESC`;
  const result = await client.query<RawBadge>(soql);
  return result.records.map((raw) => ({
    id:          raw.Id,
    name:        raw.Name,
    awardedBy:   raw.Awarded_By__c,
    learnerId:   raw.Learner__c,
    createdDate: raw.CreatedDate,
  }));
}

// ── Gamification ──────────────────────────────────────────────────────────────

export async function getGamification(
  client: ISalesforceClient,
  contactId: string
): Promise<GamificationRecord[]> {
  const soql = `SELECT Id, Name, Points__c, Sprint_Points__c, Sprint_Number__c, Reason__c, Note__c, Awarded_By__c, CreatedDate FROM Penny_Gamification__c WHERE Learner__c = '${contactId}' ORDER BY CreatedDate DESC`;
  const result = await client.query<RawGamification>(soql);
  return result.records.map((raw) => ({
    id:           raw.Id,
    name:         raw.Name,
    points:       raw.Points__c,
    sprintPoints: raw.Sprint_Points__c,
    sprintNumber: raw.Sprint_Number__c,
    reason:       raw.Reason__c,
    note:         raw.Note__c,
    awardedBy:    raw.Awarded_By__c,
    createdDate:  raw.CreatedDate,
  }));
}

// ── Weekly reports ────────────────────────────────────────────────────────────

export async function getWeeklyReports(
  client: ISalesforceClient
): Promise<WeeklyReportRecord[]> {
  const soql = `SELECT Id, Name, Generated_At__c, Top_Themes__c, Support_Flags__c, Suggested_Actions__c, Trail_Breakdown__c, Week_Start__c, Week_End__c, CreatedDate FROM Penny_Weekly_Report__c ORDER BY CreatedDate DESC LIMIT 10`;
  const result = await client.query<RawWeeklyReport>(soql);
  return result.records.map((raw: RawWeeklyReport) => ({
    id:               raw.Id,
    name:             raw.Name,
    generatedAt:      raw.Generated_At__c,
    topThemes:        raw.Top_Themes__c,
    supportFlags:     raw.Support_Flags__c,
    suggestedActions: raw.Suggested_Actions__c,
    trailBreakdown:   raw.Trail_Breakdown__c,
    weekStart:        raw.Week_Start__c,
    weekEnd:          raw.Week_End__c,
    createdDate:      raw.CreatedDate,
  }));
}

export async function createWeeklyReport(
  client: ISalesforceClient,
  payload: CreateWeeklyReportPayload
): Promise<{ id: string }> {
  const result = await client.createRecord("Penny_Weekly_Report__c", {
    Top_Themes__c:       payload.topThemes,
    Support_Flags__c:    payload.supportFlags,
    Suggested_Actions__c: payload.suggestedActions,
    Trail_Breakdown__c:  payload.trailBreakdown,
    Week_Start__c:       payload.weekStart,
    Week_End__c:         payload.weekEnd,
    Generated_At__c:     payload.generatedAt,
  });
  return { id: result.id };
}
