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

export interface LogInteractionPayload {
  contactId: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
}

export interface InteractionLogRecord {
  id: string;
  userMessage: string;
  pennyResponse: string;
  promptMode: string;
  source: string;
  createdDate: string;
}

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
