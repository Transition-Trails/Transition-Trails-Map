import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import sessionFileStore from "session-file-store";
import pinoHttp from "pino-http";
import passport from "passport";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\" " +
    "and set it in Replit Secrets."
  );
}

const FileStore = sessionFileStore(session);

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
    store: new FileStore({
      path:    '/tmp/sessions',
      ttl:     7 * 24 * 60 * 60,
      retries: 1,
      logFn:   () => {},
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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
