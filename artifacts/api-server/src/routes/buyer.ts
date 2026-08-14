/**
 * buyer.ts
 *
 * Routes for the standalone Buyer Kit Page — a magic-link surface for buyers
 * of Trail Kits.  No user session required to read kit data; the token itself
 * is the credential.
 *
 * GET  /buyer/page/:token   — public; validate token, return mock page data
 * POST /buyer/asset/:assetId/link — staff-only; generate a magic link
 *
 * Token validity rules (all invalid states return 404, never 400, so callers
 * cannot distinguish between non-existent, expired, revoked, or malformed):
 *   • Token missing from the database              → 404
 *   • Token found but revokedAt is non-null        → 404
 *   • Token found but expiresAt is in the past     → 404
 *   • Token format is obviously wrong (< 8 chars)  → 404
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { buyerTokensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireStaff } from "../middlewares/requireAuth.js";
import type { RequestHandler } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Shared invalid-token response ──────────────────────────────────────────────
// Always 404 — never reveal whether a token was expired, revoked, or never issued.

const INVALID_TOKEN_RESPONSE = {
  error:   "token_not_found",
  message: "This link is invalid or has been removed.  Please check your receipt email for the correct link.",
} as const;

// ── Mock data shape ────────────────────────────────────────────────────────────
//
// In Phase 1 the Salesforce Asset fetch is not yet wired.  The route returns
// a mock payload that matches the real schema so the frontend can be built
// against it without waiting for the Salesforce integration task.

interface KitPageData {
  assetId:     string;
  seriesLabel: string;
  kitTitle:    string;
  editionName: string;
  contentTypes: string[];
}

function buildMockKitData(assetId: string): KitPageData {
  return {
    assetId,
    seriesLabel:  "Transition Trails Series",
    kitTitle:     "Your Transition Trail Kit",
    editionName:  "Spring 2025 Edition",
    contentTypes: ["Videos", "Articles", "Worksheets", "Audio Guides"],
  };
}

// ── GET /buyer/page/:token ─────────────────────────────────────────────────────
//
// Public endpoint (added to PUBLIC_PATHS in routes/index.ts).
// Returns 404 for any invalid token scenario: not found, expired, revoked,
// or malformed.  Never 400 — callers must not be able to distinguish states.

router.get("/buyer/page/:token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params as { token: string };

  // Malformed token (too short to be a real slug) → 404, not 400.
  if (!token || token.length < 8) {
    res.status(404).json(INVALID_TOKEN_RESPONSE);
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(buyerTokensTable)
      .where(eq(buyerTokensTable.id, token))
      .limit(1);

    // Not found.
    if (!row) {
      res.status(404).json(INVALID_TOKEN_RESPONSE);
      return;
    }

    // Revoked tokens are always rejected, regardless of expiry.
    if (row.revokedAt !== null && row.revokedAt !== undefined) {
      res.status(404).json(INVALID_TOKEN_RESPONSE);
      return;
    }

    // Expired tokens are rejected (expiresAt null means no expiry).
    if (row.expiresAt !== null && row.expiresAt !== undefined && row.expiresAt < new Date()) {
      res.status(404).json(INVALID_TOKEN_RESPONSE);
      return;
    }

    const pageData = buildMockKitData(row.assetId);
    res.json({ ok: true, data: pageData });
  } catch (err) {
    logger.error({ err }, "buyer: failed to look up token");
    res.status(500).json({ error: "internal_error", message: "Something went wrong.  Please try again later." });
  }
});

// ── POST /buyer/asset/:assetId/link ───────────────────────────────────────────
//
// Staff-only endpoint.  Generates a new magic-link token for a given Salesforce
// Asset ID and returns the full buyer-kit URL so staff can paste it into the
// receipt email.
//
// requireStaff is applied inline — the global PUBLIC_PATHS list does NOT cover
// this path, so it is already protected by the default staffAuthGate.  The
// explicit middleware here is defensive-in-depth.

router.post(
  "/buyer/asset/:assetId/link",
  requireStaff as RequestHandler,
  async (req: Request, res: Response): Promise<void> => {
    const { assetId } = req.params as { assetId: string };

    if (!assetId || assetId.trim() === "") {
      res.status(400).json({ error: "invalid_asset_id", message: "assetId is required." });
      return;
    }

    // Generate a cryptographically random 32-char URL-safe token.
    const token = randomBytes(24).toString("base64url").slice(0, 32);

    const staffEmail = req.session.googleEmail ?? "unknown";

    try {
      await db.insert(buyerTokensTable).values({
        id:        token,
        assetId:   assetId.trim(),
        createdBy: staffEmail,
        // expiresAt: not set in Phase 1 — no automatic expiry policy yet.
      });

      // Build the full buyer-kit URL.  In production this uses the APP_BASE_URL
      // env var so the correct domain is used; in development it falls back to
      // the local dev domain.
      const baseUrl = (process.env["APP_BASE_URL"] ?? "").replace(/\/$/, "");
      const url = `${baseUrl}/buyer-kit/${token}`;

      res.json({ ok: true, url, token });
    } catch (err) {
      logger.error({ err }, "buyer: failed to generate token");
      res.status(500).json({ error: "internal_error", message: "Failed to generate link." });
    }
  },
);

export default router;
