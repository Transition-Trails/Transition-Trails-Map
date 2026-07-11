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
    res.redirect(buildAuthorizationUrl(codeChallenge, state));
  });
});

// ── GET /callback ─────────────────────────────────────────────────────────────

router.get("/callback", async (req, res): Promise<void> => {
  const { code, state, error: sfError, error_description } = req.query as Record<string, string | undefined>;

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

  if (!code || !req.session.codeVerifier) {
    res.status(400).json({ error: "Missing authorization code or PKCE verifier." });
    return;
  }

  try {
    const tokens  = await exchangeCodeForTokens(code, req.session.codeVerifier);
    const identity = await getUserIdentity(tokens.accessToken, tokens.instanceUrl);

    req.session.sfAccessToken  = tokens.accessToken;
    req.session.sfRefreshToken = tokens.refreshToken;
    req.session.sfInstanceUrl  = tokens.instanceUrl;
    req.session.sfIssuedAt     = tokens.issuedAt;
    req.session.sfUserId       = identity.userId;
    req.session.sfUsername     = identity.username;
    req.session.sfEmail        = identity.email;
    req.session.sfOrgId        = identity.organizationId;

    delete req.session.codeVerifier;
    delete req.session.state;

    req.session.save((err) => {
      if (err) {
        logger.error({ err }, "Failed to save session after Salesforce callback");
        res.status(500).json({ error: "Session error after authentication." });
        return;
      }
      logger.info({ userId: identity.userId, username: identity.username }, "Salesforce OAuth complete");
      res.redirect("/");
    });
  } catch (err) {
    logger.error({ err }, "Salesforce OAuth callback error");
    res.status(502).json({ error: err instanceof Error ? err.message : "Salesforce authentication failed." });
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

  req.session.save((err) => {
    if (err) {
      logger.warn({ err }, "Failed to save session on Salesforce logout");
    }
    res.json({ success: true });
  });
});

export default router;
