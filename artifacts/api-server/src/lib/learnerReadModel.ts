/**
 * learnerReadModel.ts
 *
 * Assembles the canonical learner read model from four Salesforce objects.
 * This function is transport-agnostic: it accepts a generic query callback that
 * works with either the service-token path (learner routes, pre-auth) or the
 * connector OAuth path (Penny, staff admin surfaces).
 *
 * Objects queried:
 *   • Contact                       — identity + all Penny coaching fields
 *   • pmdm__ProgramEngagement__c    — trail/cohort membership (NPSP managed pkg)
 *   • Course_Enrollment__c          — per-learner enrollment + current module
 *   • Course_Activity_Completion__c — per-learner activity progress events
 *
 * Design constraints:
 *   • ok=false (SF failed) is distinguishable from ok=true with empty arrays (no data yet).
 *   • No picklist values in WHERE clauses — filters use Id/lookup fields only.
 *   • No placeholder values — absent data is null or []; callers render accordingly.
 *   • emptyFields lists Contact fields that came back null so the caller can
 *     surface a "needs seeding" diagnostic rather than silently hiding gaps.
 *
 * PROGRAM ENGAGEMENT NOTE:
 *   pmdm__ProgramEngagement__c is an NPSP managed-package object. Only the
 *   standard managed fields are queried here (stage, program name, dates).
 *   To inspect the 7 custom fields your org has added, run:
 *     GET /services/data/vXX.0/sobjects/pmdm__ProgramEngagement__c/describe
 *   and look for fields where custom=true. Once the names are confirmed, add
 *   them to the SELECT below and map them into ProgramEngagementRecord.custom.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * The query callback accepted by assembleLearnerProfile.
 * Returns the raw records array from a SOQL query.
 * Throws on HTTP failure or missing credentials — callers wrap in try/catch.
 * An empty array means the query succeeded but returned no rows.
 */
export type SfQueryFn = <T>(soql: string) => Promise<T[]>;

/**
 * Contact fields + Penny coaching fields for one learner.
 * Extends LearnerContext (from types/salesforce.ts) with additional standard
 * and org-specific fields.  Penny's assembler can use this directly wherever
 * LearnerContext is accepted.
 */
export interface ContactProfile {
  // ── Standard identity ────────────────────────────────────────────────────
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  // ── Penny coaching fields ────────────────────────────────────────────────
  // These map directly from Penny_*__c custom fields on Contact.
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
  /** LMS identifier — Penny uses this to cross-reference course platform records. */
  lmsLearnerId: string | null;
  /** Id of the Contact record for the assigned coach, if carried on Contact. */
  coachId: string | null;
}

/** One NPSP Program Engagement record for this learner. */
export interface ProgramEngagementRecord {
  id: string;
  programId: string | null;
  programName: string | null;
  /** Stage picklist value as returned by the org — never pre-filtered. */
  stage: string | null;
  startDate: string | null;
  endDate: string | null;
  /**
   * Custom fields the org has added beyond the standard NPSP set.
   * Keys and values are passed through as-is.  When the custom field names
   * are confirmed, map them into typed properties above and remove from here.
   */
  custom: Record<string, unknown>;
}

/** One Course_Enrollment__c record showing the learner's current module. */
export interface EnrollmentRecord {
  id: string;
  name: string;
  currentModuleId: string | null;
  currentModuleName: string | null;
  /** Related course name via Course__r, if accessible. */
  courseName: string | null;
}

/** One Course_Activity_Completion__c record showing a progress event. */
export interface CompletionRecord {
  id: string;
  name: string;
  /** Status picklist value as returned by the org — never pre-filtered. */
  status: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  score: number | null;
  pointsEarned: number | null;
  activityName: string | null;
  moduleName: string | null;
}

/** The assembled read model returned by assembleLearnerProfile. */
export interface LearnerProfileResult {
  /**
   * true when the Contact query succeeded.
   * false when SF was unreachable or the query errored — in that case contact is
   * null and contactError carries the failure reason.
   * Callers MUST check ok before trusting contact.
   */
  ok: boolean;

  /** Failure reason for the Contact query. Undefined when ok=true. */
  contactError?: string;
  /** Failure reason for the Program Engagement query. Independent of ok. */
  engagementError?: string;
  /** Failure reason for the Enrollment query. Independent of ok. */
  enrollmentError?: string;
  /** Failure reason for the Completion query. Independent of ok. */
  completionError?: string;

  /** The learner's Contact record. null when ok=false. */
  contact: ContactProfile | null;

  /**
   * All Program Engagement records for this learner, regardless of stage.
   * Empty when the object has no records yet or when the query failed.
   * No stage filter is applied — picklist values are never hardcoded here.
   */
  programEngagements: ProgramEngagementRecord[];

  /**
   * All Course_Enrollment__c records for this learner.
   * Empty when the learner has no enrollments yet or when the query failed.
   */
  enrollments: EnrollmentRecord[];

  /**
   * All Course_Activity_Completion__c records for this learner (max 50, newest first).
   * Empty when the learner has no completions yet or when the query failed.
   * Zero rows here is normal for new learners — it is NOT an error.
   */
  completions: CompletionRecord[];

  /**
   * Contact fields that were queried but came back null.
   * Non-empty means those fields need seeding in Salesforce.
   * This lets callers surface a "fields need data" diagnostic without guessing.
   */
  emptyFields: string[];

  /** ISO 8601 datetime when this profile was assembled. */
  assembledAt: string;
}

// ── Raw SF response shapes ─────────────────────────────────────────────────────

interface RawContactFull {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string | null;
  MailingCity: string | null;
  MailingState: string | null;
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
  // LMS learner identifier — may not exist in the org yet; handled with ?
  Penny_LMS_Learner_ID__c?: string | null;
  // Coach reference — may not exist in the org yet; handled with ?
  Penny_Coach__c?: string | null;
}

interface RawEngagement {
  Id: string;
  pmdm__Contact__c: string | null;
  pmdm__Program__c: string | null;
  pmdm__Program__r: { Name: string } | null;
  pmdm__Stage__c: string | null;
  pmdm__Start_Date__c: string | null;
  pmdm__End_Date__c: string | null;
}

interface RawEnrollment {
  Id: string;
  Name: string;
  Current_Module__c: string | null;
  Current_Module__r: { Name: string } | null;
  Course__r: { Name: string } | null;
}

interface RawCompletion {
  Id: string;
  Name: string;
  Status__c: string | null;
  Submitted_At__c: string | null;
  Graded_At__c: string | null;
  Score__c: number | null;
  Points_Earned__c: number | null;
  Activity__r: { Name: string } | null;
  Course_Module__r: { Name: string } | null;
}

// ── Contact SOQL ───────────────────────────────────────────────────────────────
//
// All fields listed here are verified as present on Contact in the org.
// Penny_LMS_Learner_ID__c and Penny_Coach__c are included speculatively;
// if they don't exist the query will throw — the catch block in assembleLearnerProfile
// handles that gracefully.
//
// If the query fails with INVALID_FIELD mentioning one of those two, remove
// the offending field and the probe will tell you which ones are missing.
const CONTACT_SOQL = (id: string) =>
  `SELECT Id, FirstName, LastName, Email, Phone, MailingCity, MailingState, ` +
  `Penny_Trail__c, Penny_Trail_Config__c, Penny_Current_Phase__c, ` +
  `Penny_Current_Goal__c, Penny_Current_Blockers__c, Penny_Coaching_Tone__c, ` +
  `Penny_Confidence_Score__c, Penny_Skill_Score__c, Penny_Sprint_Week__c, ` +
  `Penny_Onboarding_Complete__c, Penny_LMS_Learner_ID__c, Penny_Coach__c ` +
  `FROM Contact WHERE Id = '${id}' LIMIT 1`;

// Fallback SOQL when the speculative fields fail
const CONTACT_SOQL_MINIMAL = (id: string) =>
  `SELECT Id, FirstName, LastName, Email, Phone, MailingCity, MailingState, ` +
  `Penny_Trail__c, Penny_Trail_Config__c, Penny_Current_Phase__c, ` +
  `Penny_Current_Goal__c, Penny_Current_Blockers__c, Penny_Coaching_Tone__c, ` +
  `Penny_Confidence_Score__c, Penny_Skill_Score__c, Penny_Sprint_Week__c, ` +
  `Penny_Onboarding_Complete__c ` +
  `FROM Contact WHERE Id = '${id}' LIMIT 1`;

// ── Assembly ───────────────────────────────────────────────────────────────────

/**
 * Assembles the full learner read model by running four Salesforce queries.
 * Each query is independent; a failure in one section does not prevent the
 * others from succeeding.  The ok flag reflects only the Contact query because
 * the contact record is the prerequisite for the learner being in the system.
 *
 * @param query  Transport-agnostic SF query function.  Throws on failure.
 * @param contactId  The Salesforce Contact Id for the learner.
 */
export async function assembleLearnerProfile(
  query: SfQueryFn,
  contactId: string
): Promise<LearnerProfileResult> {
  const assembledAt = new Date().toISOString();

  // ── All four queries run in parallel ────────────────────────────────────────
  const [contactResult, engagementResult, enrollmentResult, completionResult] =
    await Promise.allSettled([
      // 1. Contact — try full field set, fall back to minimal if INVALID_FIELD
      query<RawContactFull>(CONTACT_SOQL(contactId)).catch(async (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('INVALID_FIELD') || msg.includes('No such field')) {
          return query<RawContactFull>(CONTACT_SOQL_MINIMAL(contactId));
        }
        throw err;
      }),
      // 2. Program Engagement — all engagements for this contact, no stage filter
      query<RawEngagement>(
        `SELECT Id, pmdm__Contact__c, pmdm__Program__c, pmdm__Program__r.Name, ` +
        `pmdm__Stage__c, pmdm__Start_Date__c, pmdm__End_Date__c ` +
        `FROM pmdm__ProgramEngagement__c WHERE pmdm__Contact__c = '${contactId}'`
      ),
      // 3. Course Enrollment — all enrollments for this contact
      query<RawEnrollment>(
        `SELECT Id, Name, Current_Module__c, Current_Module__r.Name, Course__r.Name ` +
        `FROM Course_Enrollment__c WHERE Contact__c = '${contactId}' ` +
        `ORDER BY CreatedDate DESC LIMIT 10`
      ),
      // 4. Course Activity Completion — most recent 50 events for this contact
      query<RawCompletion>(
        `SELECT Id, Name, Status__c, Submitted_At__c, Graded_At__c, Score__c, ` +
        `Points_Earned__c, Activity__r.Name, Course_Module__r.Name ` +
        `FROM Course_Activity_Completion__c WHERE Contact__c = '${contactId}' ` +
        `ORDER BY CreatedDate DESC LIMIT 50`
      ),
    ]);

  // ── Contact ───────────────────────────────────────────────────────────────
  let contact: ContactProfile | null = null;
  let contactError: string | undefined;
  const emptyFields: string[] = [];

  if (contactResult.status === 'fulfilled') {
    const raw = contactResult.value[0];
    if (raw) {
      // Track which Penny coaching fields came back null — these need seeding
      const pennyFieldMap: Record<string, unknown> = {
        Penny_Trail__c:             raw.Penny_Trail__c,
        Penny_Trail_Config__c:      raw.Penny_Trail_Config__c,
        Penny_Current_Phase__c:     raw.Penny_Current_Phase__c,
        Penny_Current_Goal__c:      raw.Penny_Current_Goal__c,
        Penny_Current_Blockers__c:  raw.Penny_Current_Blockers__c,
        Penny_Coaching_Tone__c:     raw.Penny_Coaching_Tone__c,
        Penny_Confidence_Score__c:  raw.Penny_Confidence_Score__c,
        Penny_Skill_Score__c:       raw.Penny_Skill_Score__c,
        Penny_Sprint_Week__c:       raw.Penny_Sprint_Week__c,
        Penny_LMS_Learner_ID__c:    raw.Penny_LMS_Learner_ID__c,
        Penny_Coach__c:             raw.Penny_Coach__c,
      };
      for (const [field, val] of Object.entries(pennyFieldMap)) {
        if (val === null || val === undefined) emptyFields.push(field);
      }

      contact = {
        id:                  raw.Id,
        firstName:           raw.FirstName,
        lastName:            raw.LastName,
        email:               raw.Email,
        phone:               raw.Phone ?? null,
        mailingCity:         raw.MailingCity ?? null,
        mailingState:        raw.MailingState ?? null,
        pennyTrail:          raw.Penny_Trail__c,
        pennyTrailConfigId:  raw.Penny_Trail_Config__c,
        currentPhase:        raw.Penny_Current_Phase__c,
        currentGoal:         raw.Penny_Current_Goal__c,
        currentBlockers:     raw.Penny_Current_Blockers__c,
        coachingTone:        raw.Penny_Coaching_Tone__c,
        confidenceScore:     raw.Penny_Confidence_Score__c,
        skillScore:          raw.Penny_Skill_Score__c,
        sprintWeek:          raw.Penny_Sprint_Week__c,
        onboardingComplete:  raw.Penny_Onboarding_Complete__c ?? false,
        lmsLearnerId:        raw.Penny_LMS_Learner_ID__c ?? null,
        coachId:             raw.Penny_Coach__c ?? null,
      };
    } else {
      // Query succeeded but returned no records — Contact Id not found
      contactError = `Contact not found: ${contactId}`;
    }
  } else {
    contactError = contactResult.reason instanceof Error
      ? contactResult.reason.message
      : String(contactResult.reason);
  }

  // ── Program Engagement ────────────────────────────────────────────────────
  let programEngagements: ProgramEngagementRecord[] = [];
  let engagementError: string | undefined;

  if (engagementResult.status === 'fulfilled') {
    programEngagements = engagementResult.value.map(raw => ({
      id:          raw.Id,
      programId:   raw.pmdm__Program__c,
      programName: raw.pmdm__Program__r?.Name ?? null,
      stage:       raw.pmdm__Stage__c,
      startDate:   raw.pmdm__Start_Date__c,
      endDate:     raw.pmdm__End_Date__c,
      custom:      {},  // custom fields added here once field names are confirmed via describe
    }));
  } else {
    engagementError = engagementResult.reason instanceof Error
      ? engagementResult.reason.message
      : String(engagementResult.reason);
  }

  // ── Enrollment ────────────────────────────────────────────────────────────
  let enrollments: EnrollmentRecord[] = [];
  let enrollmentError: string | undefined;

  if (enrollmentResult.status === 'fulfilled') {
    enrollments = enrollmentResult.value.map(raw => ({
      id:              raw.Id,
      name:            raw.Name,
      currentModuleId: raw.Current_Module__c,
      currentModuleName: raw.Current_Module__r?.Name ?? null,
      courseName:      raw.Course__r?.Name ?? null,
    }));
  } else {
    enrollmentError = enrollmentResult.reason instanceof Error
      ? enrollmentResult.reason.message
      : String(enrollmentResult.reason);
  }

  // ── Completion ────────────────────────────────────────────────────────────
  let completions: CompletionRecord[] = [];
  let completionError: string | undefined;

  if (completionResult.status === 'fulfilled') {
    completions = completionResult.value.map(raw => ({
      id:           raw.Id,
      name:         raw.Name,
      status:       raw.Status__c,
      submittedAt:  raw.Submitted_At__c,
      gradedAt:     raw.Graded_At__c,
      score:        raw.Score__c,
      pointsEarned: raw.Points_Earned__c,
      activityName: raw.Activity__r?.Name ?? null,
      moduleName:   raw.Course_Module__r?.Name ?? null,
    }));
  } else {
    completionError = completionResult.reason instanceof Error
      ? completionResult.reason.message
      : String(completionResult.reason);
  }

  return {
    ok:               contact !== null,
    ...(contactError    && { contactError }),
    ...(engagementError && { engagementError }),
    ...(enrollmentError && { enrollmentError }),
    ...(completionError && { completionError }),
    contact,
    programEngagements,
    enrollments,
    completions,
    emptyFields,
    assembledAt,
  };
}
