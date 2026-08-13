import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import passport from "passport";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { reportBuildError } from "./lib/buildErrorReporter.js";
import { errorLogger } from "./middlewares/errorLogger.js";
import { responseLogger } from "./middlewares/responseLogger.js";

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\" " +
    "and set it in Replit Secrets."
  );
}

const PgStore = connectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  session({
    secret:            SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      tableName: 'session',
      ttl:       7 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      secure:   process.env["NODE_ENV"] === "production",
      maxAge:   7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({
  verify: (_req, _res, buf) => {
    (_req as unknown as { rawBody: Buffer }).rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));

// ── Response-finish audit logger ──────────────────────────────────────────────
// Attaches a finish listener to every request so explicit res.status(5xx) calls
// (which never flow through the 4-arg error pipeline) are captured as error
// audit events.  errorLogger sets res.locals.errorLogged to prevent duplicates.
app.use(responseLogger);

app.use("/api", router);

// ── Error audit logger (must precede the generic error handler) ───────────────
// Writes a trail_os_audit_log `error` row for every unhandled 5xx before the
// generic handler consumes the error.
app.use(errorLogger);

// ── Global error handler ──────────────────────────────────────────────────────
//
// Catches unhandled errors that escape all route and middleware handlers.
// Uses `reportBuildError` — the same centralized logging path available to
// any route that catches an error locally — so both locally-caught errors
// (via reportBuildError) and unhandled errors (via this handler) go through
// the same classification + case-creation pipeline.
//
// IMPORTANT: the response body uses a stable generic message so that internal
// error details (DB schema, connector diagnostics, env-var names) are never
// disclosed to API callers.  Full details remain in the server log only.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  reportBuildError(err, 'Unhandled API error');

  // Return a generic message — never expose internal error details to callers.
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
