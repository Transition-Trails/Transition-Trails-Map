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

interface ChangeEntry {
  date:        string;
  reason:      string;
  description: string;
}

interface BundleKit {
  assetId:       string;
  title:         string;
  downloadUrl:   string;
  status:        "available" | "pending";
  expectedMonth?: string;
}

interface Beat {
  name:      string;
  pageCount: number;
}

interface SharedInsert {
  title: string;
}

interface QREntry {
  title:      string;
  code:       string;
  scanStatus: "pending" | "passed";
}

interface TestDataFile {
  filename:  string;
  edgeCase:  string;
}

interface KitPageData {
  assetId:       string;
  seriesLabel:   string;
  kitTitle:      string;
  editionName:   string;
  contentTypes:  string[];
  purchaseDate:  string;
  audienceType:  "nonprofit" | "learner";
  changeLog:     ChangeEntry[];
  bundle:        BundleKit[] | null;
  beats:         Beat[];
  sharedInserts: SharedInsert[];
  qrCodes:       QREntry[];
  testDataFiles: TestDataFile[];
  licenseTerms:  string[];
}

function buildMockKitData(assetId: string): KitPageData {
  return {
    assetId,
    seriesLabel:  "Transition Trails Series",
    kitTitle:     "Nonprofit Leadership Transition Trail Kit",
    editionName:  "Spring 2025 Edition",
    contentTypes: ["Workbook", "Video Scripts", "Facilitator Guide", "Build With Me Sessions"],
    purchaseDate: "2025-02-14",
    audienceType: "nonprofit",
    changeLog: [
      {
        date:        "2025-04-10",
        reason:      "Corrected worksheet exercise numbering that caused confusion in group sessions",
        description: "Exercises 4 and 5 in the Decide section were out of order.  The content itself was not changed — only the numbering and the cross-references on pages 38 and 42.",
      },
      {
        date:        "2025-03-22",
        reason:      "Added a missing note about board approval timelines to the Launch section",
        description: "Several facilitated sessions surfaced a common question about how long board sign-off typically takes.  A one-page reference note has been added as a shared insert.",
      },
      {
        date:        "2025-03-05",
        reason:      "Replaced two broken Build With Me video links",
        description: "The QR codes for sessions 2 and 4 now point to the correct short links.  The videos themselves have not changed.",
      },
    ],
    bundle: [
      {
        assetId:     assetId,
        title:       "Nonprofit Leadership Transition Trail Kit",
        downloadUrl: "#",
        status:      "available",
      },
      {
        assetId:     "asset-companion-001",
        title:       "Board Readiness Companion Kit",
        downloadUrl: "#",
        status:      "available",
      },
      {
        assetId:     "asset-future-001",
        title:       "Digital Compass Workbook",
        downloadUrl: "#",
        status:      "pending",
        expectedMonth: "September 2025",
      },
    ],
    beats: [
      { name: "Why",       pageCount: 12 },
      { name: "Decide",    pageCount: 24 },
      { name: "Build",     pageCount: 38 },
      { name: "Verify",    pageCount: 16 },
      { name: "Next Step", pageCount: 10 },
    ],
    sharedInserts: [
      { title: "Board Approval Timeline Reference" },
      { title: "Stakeholder Communication Templates" },
      { title: "Legal Checklist for Nonprofit Transitions" },
      { title: "Glossary of Transition Terms" },
    ],
    qrCodes: [
      { title: "Build With Me — Session 1: Framing Your Why",     code: "bwm-nlt-s1", scanStatus: "passed" },
      { title: "Build With Me — Session 2: Mapping Stakeholders", code: "bwm-nlt-s2", scanStatus: "passed" },
      { title: "Build With Me — Session 3: Building the Plan",    code: "bwm-nlt-s3", scanStatus: "pending" },
      { title: "Build With Me — Session 4: Verifying Readiness",  code: "bwm-nlt-s4", scanStatus: "pending" },
    ],
    testDataFiles: [
      {
        filename: "test-small-org.csv",
        edgeCase: "Organisation with fewer than 5 staff — exercises that assume a full leadership team are flagged for adaptation",
      },
      {
        filename: "test-board-led.csv",
        edgeCase: "Board-led transition where no executive director is involved — decision authority rows are remapped to committee chairs",
      },
      {
        filename: "test-multi-site.csv",
        edgeCase: "Multi-site nonprofit where each location follows a different timeline — the shared Verify section is duplicated per site",
      },
    ],
    licenseTerms: [
      "Use this kit for one organisation's transition process",
      "Print and distribute copies to your board, staff, and facilitation team",
      "Use the workbook exercises in facilitated sessions you lead",
      "Adapt the templates with your organization's name and context",
      "Store digital copies on your organisation's internal systems",
    ],
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
