import { Router, type Request, type Response, type RequestHandler } from "express";
import { getSalesforceClient } from "../lib/getSalesforceClient.js";
import { SalesforceClient } from "../lib/salesforceClient.js";
import {
  getLearnerContext,
  getTrailConfig,
  getActiveTrailConfigs,
  getInteractionHistory,
  logInteraction,
  getCareerReviews,
  createCareerReview,
  getQuestSubmissions,
  createQuestSubmission,
  getBadges,
  getGamification,
  updateLearnerContext,
  getWeeklyReports,
  createWeeklyReport,
} from "../lib/salesforceService.js";
import type { LearnerContextUpdate } from "../types/salesforce.js";

const router = Router();

// ── Auth wrapper ──────────────────────────────────────────────────────────────
// Resolves the per-request SalesforceClient from session tokens and wraps
// both auth errors (401) and Salesforce API errors (500) in one place.

type SfHandler = (req: Request, res: Response, client: SalesforceClient) => Promise<void>;

function withClient(handler: SfHandler): RequestHandler {
  return async (req, res): Promise<void> => {
    let client: SalesforceClient;
    try {
      client = getSalesforceClient(req);
    } catch {
      res.status(401).json({ error: "Not authenticated with Salesforce" });
      return;
    }
    try {
      await handler(req, res, client);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  };
}

// ── Validation helper ─────────────────────────────────────────────────────────

function requireStringFields(
  body: unknown,
  fields: string[],
  res: Response
): body is Record<string, string> {
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Request body must be a JSON object" });
    return false;
  }
  const missing = fields.filter(
    (f) =>
      typeof (body as Record<string, unknown>)[f] !== "string" ||
      (body as Record<string, unknown>)[f] === ""
  );
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing or empty required fields: ${missing.join(", ")}` });
    return false;
  }
  return true;
}

// ── GET /learner/:contactId ───────────────────────────────────────────────────

router.get(
  "/learner/:contactId",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const data = await getLearnerContext(client, contactId);
    res.json(data);
  })
);

// ── GET /learner/:contactId/trail-config ──────────────────────────────────────

router.get(
  "/learner/:contactId/trail-config",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const learner = await getLearnerContext(client, contactId);
    if (!learner.pennyTrailConfigId) {
      res.status(404).json({ error: "No trail config assigned" });
      return;
    }
    const config = await getTrailConfig(client, learner.pennyTrailConfigId);
    res.json(config);
  })
);

// ── GET /trail-configs ────────────────────────────────────────────────────────

router.get(
  "/trail-configs",
  withClient(async (_req, res, client) => {
    const data = await getActiveTrailConfigs(client);
    res.json(data);
  })
);

// ── GET /learner/:contactId/interactions ──────────────────────────────────────

router.get(
  "/learner/:contactId/interactions",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const rawLimit = parseInt((req.query["limit"] as string | undefined) ?? "20", 10);
    const limit = isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 50);
    const data = await getInteractionHistory(client, contactId, limit);
    res.json(data);
  })
);

// ── POST /learner/:contactId/interactions ─────────────────────────────────────

router.post(
  "/learner/:contactId/interactions",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const REQUIRED = ["userMessage", "pennyResponse", "promptMode", "source"] as const;
    if (!requireStringFields(req.body, [...REQUIRED], res)) return;
    const body = req.body as Record<typeof REQUIRED[number], string>;
    const result = await logInteraction(client, {
      contactId,
      userMessage:   body.userMessage,
      pennyResponse: body.pennyResponse,
      promptMode:    body.promptMode,
      source:        body.source,
    });
    res.json(result);
  })
);

// ── GET /learner/:contactId/career-reviews ────────────────────────────────────

router.get(
  "/learner/:contactId/career-reviews",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const data = await getCareerReviews(client, contactId);
    res.json(data);
  })
);

// ── POST /learner/:contactId/career-reviews ───────────────────────────────────

router.post(
  "/learner/:contactId/career-reviews",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const REQUIRED = [
      "areaScores", "feedbackJson", "readinessLabel",
      "reviewMode", "reviewedAt", "targetRole",
    ] as const;
    if (!requireStringFields(req.body, [...REQUIRED], res)) return;
    const body = req.body as Record<typeof REQUIRED[number], string>;
    const result = await createCareerReview(client, {
      contactId,
      areaScores:     body.areaScores,
      feedbackJson:   body.feedbackJson,
      readinessLabel: body.readinessLabel,
      reviewMode:     body.reviewMode,
      reviewedAt:     body.reviewedAt,
      targetRole:     body.targetRole,
    });
    res.json(result);
  })
);

// ── GET /learner/:contactId/quests ────────────────────────────────────────────

router.get(
  "/learner/:contactId/quests",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const data = await getQuestSubmissions(client, contactId);
    res.json(data);
  })
);

// ── POST /quests ──────────────────────────────────────────────────────────────

router.post(
  "/quests",
  withClient(async (req, res, client) => {
    const REQUIRED = ["name", "submissionText", "submittedAt"] as const;
    if (!requireStringFields(req.body, [...REQUIRED], res)) return;
    const body = req.body as Record<typeof REQUIRED[number], string>;
    const result = await createQuestSubmission(client, {
      name:           body.name,
      submissionText: body.submissionText,
      submittedAt:    body.submittedAt,
    });
    res.json(result);
  })
);

// ── GET /learner/:contactId/badges ────────────────────────────────────────────

router.get(
  "/learner/:contactId/badges",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const data = await getBadges(client, contactId);
    res.json(data);
  })
);

// ── GET /learner/:contactId/gamification ──────────────────────────────────────

router.get(
  "/learner/:contactId/gamification",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    const data = await getGamification(client, contactId);
    res.json(data);
  })
);

// ── PATCH /learner/:contactId ─────────────────────────────────────────────────

router.patch(
  "/learner/:contactId",
  withClient(async (req, res, client) => {
    const { contactId } = req.params as { contactId: string };
    await updateLearnerContext(
      client,
      contactId,
      req.body as Partial<LearnerContextUpdate>
    );
    res.json({ success: true });
  })
);

// ── GET /weekly-reports ───────────────────────────────────────────────────────

router.get(
  "/weekly-reports",
  withClient(async (_req, res, client) => {
    const data = await getWeeklyReports(client);
    res.json(data);
  })
);

// ── POST /weekly-reports ──────────────────────────────────────────────────────

router.post(
  "/weekly-reports",
  withClient(async (req, res, client) => {
    const REQUIRED = [
      "topThemes", "supportFlags", "suggestedActions",
      "trailBreakdown", "weekStart", "weekEnd", "generatedAt",
    ] as const;
    if (!requireStringFields(req.body, [...REQUIRED], res)) return;
    const body = req.body as Record<typeof REQUIRED[number], string>;
    const result = await createWeeklyReport(client, {
      topThemes:        body.topThemes,
      supportFlags:     body.supportFlags,
      suggestedActions: body.suggestedActions,
      trailBreakdown:   body.trailBreakdown,
      weekStart:        body.weekStart,
      weekEnd:          body.weekEnd,
      generatedAt:      body.generatedAt,
    });
    res.json(result);
  })
);

// ── GET /logs/today ───────────────────────────────────────────────────────────

interface SfInteractionLog {
  Id: string;
  Learner__c: string | null;
  User_Message__c: string | null;
  Penny_Response__c: string | null;
  Prompt_Mode__c: string | null;
  Source__c: string | null;
  CreatedDate: string;
}

interface SfContactName {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
}

router.get(
  "/logs/today",
  withClient(async (_req, res, client) => {
    const logsResult = await client.query<SfInteractionLog>(
      "SELECT Id, Learner__c, User_Message__c, Penny_Response__c, Prompt_Mode__c, Source__c, CreatedDate " +
      "FROM Penny_Interaction_Log__c WHERE CreatedDate = TODAY ORDER BY CreatedDate DESC LIMIT 100"
    );
    const logs = logsResult.records;

    const contactIds = [
      ...new Set(
        logs.map(l => l.Learner__c).filter((id): id is string => id !== null)
      ),
    ];
    const nameMap = new Map<string, string>();
    if (contactIds.length > 0) {
      const idList = contactIds.map(id => `'${id}'`).join(",");
      const contactsResult = await client.query<SfContactName>(
        `SELECT Id, FirstName, LastName FROM Contact WHERE Id IN (${idList})`
      );
      for (const c of contactsResult.records) {
        const name = [c.FirstName, c.LastName].filter(Boolean).join(" ");
        nameMap.set(c.Id, name || "Unknown");
      }
    }

    res.json(
      logs.map(l => ({
        id:            l.Id,
        learnerName:   l.Learner__c ? (nameMap.get(l.Learner__c) ?? "Unknown") : "Unknown",
        userMessage:   l.User_Message__c ?? "",
        pennyResponse: l.Penny_Response__c ?? "",
        promptMode:    l.Prompt_Mode__c ?? "",
        source:        l.Source__c ?? "",
        createdDate:   l.CreatedDate,
      }))
    );
  })
);

// ── GET /learners/directory ───────────────────────────────────────────────────

interface SfContactLearner {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Email: string | null;
  Penny_Trail__c: string | null;
  Penny_Current_Phase__c: string | null;
  Penny_Current_Goal__c: string | null;
  Penny_Confidence_Score__c: number | null;
  Penny_Skill_Score__c: number | null;
  Penny_Sprint_Week__c: number | null;
  Penny_Onboarding_Complete__c: boolean | null;
  Penny_Coaching_Tone__c: string | null;
}

interface SfAggLastInteraction {
  Learner__c: string;
  lastInteraction: string;
}

router.get(
  "/learners/directory",
  withClient(async (_req, res, client) => {
    const contactsResult = await client.query<SfContactLearner>(
      "SELECT Id, FirstName, LastName, Email, Penny_Trail__c, Penny_Current_Phase__c, " +
      "Penny_Current_Goal__c, Penny_Confidence_Score__c, Penny_Skill_Score__c, " +
      "Penny_Sprint_Week__c, Penny_Onboarding_Complete__c, Penny_Coaching_Tone__c " +
      "FROM Contact WHERE Penny_Trail__c != null ORDER BY LastName ASC"
    );
    const contacts = contactsResult.records;

    const lastMap = new Map<string, string>();
    if (contacts.length > 0) {
      const idList = contacts.map(c => `'${c.Id}'`).join(",");
      const lastResult = await client.query<SfAggLastInteraction>(
        `SELECT Learner__c, MAX(CreatedDate) lastInteraction ` +
        `FROM Penny_Interaction_Log__c WHERE Learner__c IN (${idList}) GROUP BY Learner__c`
      );
      for (const r of lastResult.records) {
        lastMap.set(r.Learner__c, r.lastInteraction);
      }
    }

    res.json(
      contacts.map(c => ({
        id:                 c.Id,
        firstName:          c.FirstName ?? "",
        lastName:           c.LastName ?? "",
        email:              c.Email ?? "",
        pennyTrail:         c.Penny_Trail__c,
        currentPhase:       c.Penny_Current_Phase__c,
        currentGoal:        c.Penny_Current_Goal__c,
        confidenceScore:    c.Penny_Confidence_Score__c,
        skillScore:         c.Penny_Skill_Score__c,
        sprintWeek:         c.Penny_Sprint_Week__c,
        onboardingComplete: c.Penny_Onboarding_Complete__c ?? false,
        coachingTone:       c.Penny_Coaching_Tone__c,
        lastInteraction:    lastMap.get(c.Id) ?? null,
      }))
    );
  })
);

export default router;

