import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import passport from "passport";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

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

app.use("/api", router);

export default app;
