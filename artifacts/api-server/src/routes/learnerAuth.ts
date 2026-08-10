import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { logger } from "../lib/logger.js";
import { SF_API_VERSION } from "../lib/sfConstants.js";
import { db } from "@workspace/db";
import { trailOsAuditLogTable } from "@workspace/db/schema";

// ── Passport User type declaration ────────────────────────────────────────────
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      email?: string;
      name?: string;
      googleId?: string;
    }
  }
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: Express.User, done) => done(null, user));

// ── SF service account contact lookup ─────────────────────────────────────────
interface SFContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Penny_Trail__c: string | null;
}

async function queryContactByEmail(email: string): Promise<SFContact | null> {
  const token       = process.env["SF_SERVICE_TOKEN"];
  const instanceUrl = process.env["SALESFORCE_INSTANCE_URL"];
  if (!token || !instanceUrl) {
    logger.warn("SF_SERVICE_TOKEN or SALESFORCE_INSTANCE_URL not set — cannot look up learner contact");
    return null;
  }
  const soql = `SELECT Id, FirstName, LastName, Penny_Trail__c FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`;
  try {
    const res = await fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { records: SFContact[] };
    return data.records[0] ?? null;
  } catch (e) {
    logger.warn({ e }, "SF contact lookup failed");
    return null;
  }
}

// ── Google OAuth strategy (only register if env vars are set) ─────────────────
const googleClientId     = process.env["GOOGLE_CLIENT_ID"];
const googleClientSecret = process.env["GOOGLE_CLIENT_SECRET"];
const callbackUrl        = process.env["GOOGLE_LEARNER_CALLBACK_URL"];

if (googleClientId && googleClientSecret && callbackUrl) {
  passport.use(
    "learner-google",
    new GoogleStrategy(
      { clientID: googleClientId, clientSecret: googleClientSecret, callbackURL: callbackUrl },
      (_accessToken, _refreshToken, profile, done) => {
        done(null, {
          email:    profile.emails?.[0]?.value,
          name:     profile.displayName,
          googleId: profile.id,
        });
      }
    )
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

router.get("/learner/auth/google", (req, res, next) => {
  if (!googleClientId) {
    return res.status(503).json({ error: "Google OAuth not configured — set GOOGLE_CLIENT_ID in Replit Secrets" });
  }
  return passport.authenticate("learner-google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/learner/auth/google/callback", (req, res, next): void => {
  if (!googleClientId) {
    res.status(503).json({ error: "Google OAuth not configured" });
    return;
  }
  passport.authenticate(
    "learner-google",
    { failureRedirect: "/learner/login?error=oauth_failed", session: false },
    async (err: unknown, user: Express.User | false) => {
      if (err || !user || !user.email) {
        logger.warn({ err }, "Learner Google OAuth failed");
        return res.redirect("/learner/login?error=oauth_failed");
      }
      try {
        const contact = await queryContactByEmail(user.email);
        if (!contact) {
          logger.info({ email: user.email }, "Learner auth: no Salesforce contact found");
          return res.redirect("/learner/login?error=not_enrolled");
        }
        req.session.learnerAuthenticated = true;
        req.session.learnerEmail         = user.email;
        req.session.learnerName          = `${contact.FirstName} ${contact.LastName}`.trim();
        req.session.learnerContactId     = contact.Id;
        req.session.learnerTrail         = contact.Penny_Trail__c;
        req.session.save(() => {
          // Fire-and-forget audit log write — do not block the redirect
          const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
                   ?? req.socket.remoteAddress
                   ?? null;
          db.insert(trailOsAuditLogTable).values({
            eventType:  'login',
            actorEmail: (user.email ?? '').toLowerCase(),
            audience:   'learner',
            ipAddress:  ip,
            metadata:   { source: 'learner_google_oauth', sfContactId: contact.Id },
          }).catch(dbErr => logger.error({ dbErr }, 'learnerAuth: audit log write failed'));

          res.redirect("/learner/dashboard");
        });
      } catch (e) {
        logger.warn({ e }, "Learner auth: SF lookup error");
        res.redirect("/learner/login?error=not_enrolled");
      }
    }
  )(req, res, next);
});

router.get("/learner/auth/status", (req, res) => {
  res.json({
    authenticated: req.session.learnerAuthenticated === true,
    name:          req.session.learnerName  ?? null,
    trail:         req.session.learnerTrail ?? null,
  });
});

router.get("/learner/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/learner/login");
  });
});

export default router;
