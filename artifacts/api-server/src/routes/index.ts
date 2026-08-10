import { Router, type IRouter, type RequestHandler } from "express";
import healthRouter          from "./health";
import slackRouter           from "./slack";
import secretsRouter         from "./secrets";
import geminiRouter          from "./gemini";
import anthropicRouter        from "./anthropic";
import googleRouter          from "./google";
import googleOAuthRouter     from "./googleOAuth";
import salesforceRouter      from "./salesforce";
import salesforceAuthRouter  from "./salesforceAuth";
import pennyDataRouter       from "./pennyData";
import pennyRouter           from "./penny";
import retrieveRouter        from "./retrieve";
import calendarRouter        from "./calendar";
import gmailRouter           from "./gmail";
import agentforceRouter      from "./agentforce";
import authRouter            from "./auth";
import googleSignInRouter    from "./googleSignIn";
import googleGroupsRouter    from "./googleGroups";
import driveRouter           from "./drive";
import notificationsRouter   from "./notifications";
import learnerAuthRouter      from "./learnerAuth";
import learnerRouter          from "./learner";
import promptTemplatesRouter  from "./promptTemplates";
import promptVariablesRouter  from "./promptVariables";
import programsRouter          from "./programs";
import knowledgeRouter         from "./knowledge";
import roleOwnersRouter        from "./roleOwners";
import personaHealthRouter     from "./personaHealth";
import sessionsRouter           from "./sessions";
import voiceoverRouter          from "./voiceover";
import governanceRouter         from "./governance";
import moduleDraftsRouter       from "./moduleDrafts";
import homebaseRouter           from "./homebase";
import adminUsersRouter         from "./adminUsers";
import { requireStaff, requireAdmin } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ── Public-path allowlist ─────────────────────────────────────────────────────
//
// These paths are reachable without a signed-in Google session.  Everything
// else requires requireStaff (authentication + at least one Trail OS group).
//
// Default: "refused unless explicitly public" — the opposite of the old
// prototype behaviour where everything was open.
//
// Paths here are relative to the /api mount point (i.e. strip leading /api).
// The learner surface (/learner/*) uses its own requireLearnerAuth and is
// excluded entirely from staff auth via the prefix check below.

const PUBLIC_PATHS: readonly string[] = [
  // Health probe
  '/healthz',
  // Per-user Google Sign-In flow (no session exists yet during these requests)
  '/auth/google/login',
  '/auth/google/callback',
  '/auth/google/me',       // returns { authenticated: false } when not signed in
  '/auth/google/sign-out', // safe to call without a session
  // Homebase audience check — safe to call without a session (returns isSignedIn:false)
  '/auth/homebase/status',
  // Salesforce auth flow (browser redirect round-trips, same reasoning)
  '/auth/salesforce/login',
  '/auth/salesforce/callback',
  '/auth/salesforce/status',
  '/auth/salesforce/logout',
  // Admin Google OAuth wizard (involves browser redirects from Google;
  // the wizard UI itself is behind the client-side auth gate)
  '/google/oauth/info',
  '/google/oauth/start',
  '/google/oauth/callback',
  '/google/oauth/session', // prefix — matches /google/oauth/session/:id
  // Slack webhook (HMAC-authenticated by Slack's signature, not user session)
  '/slack/events',
];

// ── Global staff-auth middleware ──────────────────────────────────────────────
//
// Applied before any router is mounted so every data route is protected by
// default.  Public paths and the learner/homebase surfaces are explicitly excluded.

const staffAuthGate: RequestHandler = (req, res, next) => {
  const path = req.path;

  // Learner routes (/learner/*) use requireLearnerAuth, not staff auth.
  if (path.startsWith('/learner')) return next();

  // Homebase routes (/homebase/*) use requireHomebaseAuth, not staff auth.
  // The /auth/homebase/status endpoint is in PUBLIC_PATHS below (no auth needed).
  if (path.startsWith('/homebase')) return next();

  // Check against the public allowlist (exact match or path prefix).
  const isPublic = PUBLIC_PATHS.some(
    p => path === p || path.startsWith(`${p}/`),
  );
  if (isPublic) return next();

  // All other paths require a valid signed-in staff session.
  return (requireStaff as RequestHandler)(req, res, next);
};

router.use(staffAuthGate);

// ── Admin-only path guards ────────────────────────────────────────────────────
//
// These paths require the trailosadmin group (or superadmin).  The staff gate
// above has already run, so we only need the group check here.
// requireAdmin also handles the 401 case for defence-in-depth.

const ADMIN_PREFIXES: string[] = [
  '/secrets',           // GET /api/secrets/audit — credential exposure
  '/admin/google-groups', // GET /api/admin/google-groups — workspace admin
  '/admin/staff-users',   // GET /api/admin/staff-users — people picker
  '/admin/role-owners',    // GET/PATCH /api/admin/role-owners
  '/admin/persona-health', // GET/PATCH /api/admin/persona-health
  '/admin/users',          // GET /api/admin/users — user directory
  '/admin/audit-log',      // GET /api/admin/audit-log — login audit log
];

router.use(ADMIN_PREFIXES as unknown as string, requireAdmin as RequestHandler);

// ── Router mounts ─────────────────────────────────────────────────────────────

router.use("/auth/salesforce", salesforceAuthRouter);
router.use("/penny/data", pennyDataRouter);
router.use(healthRouter);
router.use(slackRouter);
router.use(secretsRouter);
router.use(geminiRouter);
router.use(anthropicRouter);
router.use(googleRouter);
router.use(googleOAuthRouter);
router.use(salesforceRouter);
router.use(pennyRouter);
router.use(retrieveRouter);
router.use(calendarRouter);
router.use(gmailRouter);
router.use(agentforceRouter);
router.use(authRouter);
router.use(googleSignInRouter);
router.use(googleGroupsRouter);
router.use(driveRouter);
router.use(notificationsRouter);
router.use(learnerAuthRouter);
router.use(learnerRouter);
router.use(promptTemplatesRouter);
router.use(promptVariablesRouter);
router.use(programsRouter);
router.use(knowledgeRouter);
router.use(roleOwnersRouter);
router.use(personaHealthRouter);
router.use(sessionsRouter);
router.use(voiceoverRouter);
router.use(governanceRouter);
router.use(moduleDraftsRouter);
router.use(homebaseRouter);
router.use(adminUsersRouter);

export default router;
