import { Router } from "express";
import { randomBytes } from "crypto";
import {
  generatePKCE,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getUserIdentity,
} from "../lib/salesforceOAuth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const SF_TOKEN_TTL_MS = 7_200_000; // Salesforce access tokens expire in 2 hours

// ── GET /login ────────────────────────────────────────────────────────────────

router.get("/login", (req, res): void => {
  try {
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = randomBytes(16).toString("hex");

    req.session.codeVerifier = codeVerifier;
    req.session.state        = state;

    req.session.save((err) => {
      if (err) {
        logger.error({ err }, "Failed to save session before Salesforce redirect");
        res.status(500).json({ error: "Session error — could not initiate login." });
        return;
      }
      try {
        res.redirect(buildAuthorizationUrl(codeChallenge, state));
      } catch (buildErr) {
        logger.error({ err: buildErr }, "Salesforce OAuth configuration error in /login");
        res.status(500).json({
          error: "Salesforce OAuth configuration error",
          details: buildErr instanceof Error ? buildErr.message : String(buildErr),
        });
      }
    });
  } catch (err) {
    logger.error({ err }, "Salesforce OAuth configuration error in /login");
    res.status(500).json({
      error: "Salesforce OAuth configuration error",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ── GET /callback ─────────────────────────────────────────────────────────────

router.get("/callback", async (req, res): Promise<void> => {
  try {
    const { code, state, error: sfError, error_description } = req.query as Record<string, string | undefined>;

    // FIX 3 — reject duplicate / stale callback requests where the session
    // PKCE state has already been consumed or was never written.
    if (!req.session.state || !req.session.codeVerifier) {
      logger.warn("Salesforce callback arrived with no PKCE state in session — duplicate or expired request");
      res.status(400).json({ error: "Invalid or expired OAuth session. Please try logging in again." });
      return;
    }

    if (sfError) {
      logger.warn({ sfError, error_description }, "Salesforce OAuth error returned to callback");
      res.status(400).json({ error: sfError, description: error_description });
      return;
    }

    if (!state || state !== req.session.state) {
      logger.warn({ receivedState: state, sessionState: req.session.state }, "Salesforce OAuth state mismatch");
      res.status(403).json({ error: "State mismatch — possible CSRF attempt. Please restart the login flow." });
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Missing authorization code." });
      return;
    }

    // Capture verifier and immediately clear PKCE fields so any duplicate
    // callback request that arrives while this one is in-flight hits FIX 3.
    const codeVerifier = req.session.codeVerifier;
    delete req.session.codeVerifier;
    delete req.session.state;

    try {
      const tokens   = await exchangeCodeForTokens(code, codeVerifier);
      const identity = await getUserIdentity(tokens.accessToken, tokens.instanceUrl);

      // Resolve Contact ID (003xxx) — sfUserId is a User record (005xxx),
      // not usable for Contact-scoped Penny queries.
      let sfContactId: string | null = null;
      try {
        const soql = `SELECT Id FROM Contact WHERE Email = '${identity.email}' LIMIT 1`;
        const contactResp = await fetch(
          `${tokens.instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`,
          { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
        );
        if (contactResp.ok) {
          const contactData = await contactResp.json() as { records?: Array<{ Id: string }> };
          sfContactId = contactData.records?.[0]?.Id ?? null;
        } else {
          logger.warn({ status: contactResp.status }, 'Contact lookup returned non-OK — sfContactId will be null');
        }
      } catch (contactErr) {
        logger.warn({ contactErr }, 'Failed to resolve Contact ID during OAuth — Penny will use fallback');
      }

      req.session.sfAccessToken  = tokens.accessToken;
      req.session.sfRefreshToken = tokens.refreshToken;
      req.session.sfInstanceUrl  = tokens.instanceUrl;
      req.session.sfIssuedAt     = tokens.issuedAt;
      req.session.sfUserId       = identity.userId;
      req.session.sfUsername     = identity.username;
      req.session.sfEmail        = identity.email;
      req.session.sfOrgId        = identity.organizationId;
      req.session.sfContactId    = sfContactId;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr }, "Failed to save session after Salesforce callback");
          // FIX 1 — guard before responding; headers may already be sent
          if (!res.headersSent) {
            res.status(500).json({ error: "Session error after authentication." });
          } else {
            logger.warn("Headers already sent — skipping error response after session save failure");
          }
          return;
        }
        logger.info({ userId: identity.userId, username: identity.username, sfContactId }, "Salesforce OAuth complete");
        // FIX 1 — guard before redirect; a duplicate callback may have already responded
        if (!res.headersSent) {
          res.redirect("/");
        } else {
          logger.warn("Headers already sent — skipping redirect after session save");
        }
      });
    } catch (err) {
      logger.error({ err }, "Salesforce OAuth callback error");
      if (!res.headersSent) {
        res.status(502).json({ error: err instanceof Error ? err.message : "Salesforce authentication failed." });
      } else {
        logger.warn("Headers already sent — skipping 502 in OAuth callback catch");
      }
    }
  } catch (err) {
    // FIX 2 — outer safety net; guard in case inner handlers already responded
    logger.error({ err }, "Salesforce OAuth configuration error in /callback");
    if (!res.headersSent) {
      res.status(500).json({
        error: "Salesforce OAuth configuration error",
        details: err instanceof Error ? err.message : String(err),
      });
    } else {
      logger.warn("Headers already sent — skipping 500 in outer callback catch");
    }
  }
});

// ── GET /status ───────────────────────────────────────────────────────────────

router.get("/status", async (req, res): Promise<void> => {
  const { sfAccessToken, sfRefreshToken, sfIssuedAt, sfUserId, sfUsername, sfEmail } = req.session;

  if (!sfAccessToken) {
    res.json({ authenticated: false });
    return;
  }

  if (sfIssuedAt && sfRefreshToken) {
    const issuedAtMs = Number(sfIssuedAt);
    const ageMs      = Date.now() - issuedAtMs;

    if (ageMs >= SF_TOKEN_TTL_MS) {
      try {
        const refreshed = await refreshAccessToken(sfRefreshToken);
        req.session.sfAccessToken = refreshed.accessToken;
        req.session.sfIssuedAt    = refreshed.issuedAt;
        req.session.save((err) => {
          if (err) logger.warn({ err }, "Failed to persist refreshed Salesforce token");
        });
        logger.info({ userId: sfUserId }, "Salesforce access token silently refreshed");
      } catch (err) {
        logger.warn({ err }, "Salesforce token refresh failed — returning unauthenticated");
        res.json({ authenticated: false });
        return;
      }
    }
  }

  res.json({
    authenticated: true,
    contactId: sfUserId ?? null,
    user: {
      userId:   sfUserId,
      username: sfUsername,
      email:    sfEmail,
    },
  });
});

// ── GET /logout ───────────────────────────────────────────────────────────────

router.get("/logout", (req, res): void => {
  delete req.session.sfAccessToken;
  delete req.session.sfRefreshToken;
  delete req.session.sfInstanceUrl;
  delete req.session.sfIssuedAt;
  delete req.session.sfUserId;
  delete req.session.sfUsername;
  delete req.session.sfEmail;
  delete req.session.sfOrgId;
  delete req.session.sfContactId;

  req.session.save((err) => {
    if (err) {
      logger.warn({ err }, "Failed to save session on Salesforce logout");
    }
    res.json({ success: true });
  });
});

export default router;
