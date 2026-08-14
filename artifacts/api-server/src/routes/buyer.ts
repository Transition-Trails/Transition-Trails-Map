/**
 * buyer.ts
 *
 * Routes for the standalone Buyer Kit Page — a magic-link surface for buyers
 * of Trail Kits.  No user session required to read kit data; the token itself
 * is the credential.
 *
 * GET  /buyer/page/:token   — public; validate token, return SF Asset page data
 * POST /buyer/asset/:assetId/link — staff-only; generate a magic link
 *
 * Token validity rules (all invalid states return 404, never 400, so callers
 * cannot distinguish between non-existent, expired, revoked, or malformed):
 *   • Token missing from the database              → 404
 *   • Token found but revokedAt is non-null        → 404
 *   • Token found but expiresAt is in the past     → 404
 *   • Token format is obviously wrong (< 8 chars)  → 404
 *
 * Salesforce errors:
 *   • Asset record not found in SF (removed after token was issued) → 404
 *   • SF unavailable (network / rate-limit / auth)                  → 503
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
import { ConnectorSalesforceClient } from "../lib/connectorSalesforceClient.js";

const router = Router();

// ── Shared invalid-token response ──────────────────────────────────────────────
// Always 404 — never reveal whether a token was expired, revoked, or never issued.

const INVALID_TOKEN_RESPONSE = {
  error:   "token_not_found",
  message: "This link is invalid or has been removed.  Please check your receipt email for the correct link.",
} as const;

// ── KitPageData shape ──────────────────────────────────────────────────────────
//
// The canonical shape returned by GET /buyer/page/:token.
// Fields map to Salesforce Asset fields; see mapAssetToKitPageData() below.

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

// ── Salesforce Asset shape ─────────────────────────────────────────────────────

interface SfAssetRecord {
  Id:                       string;
  Name:                     string;
  PurchaseDate:             string | null;
  Status:                   string | null;
  Description:              string | null;
  Product2?:                { Name: string; Family?: string | null } | null;
  // Custom fields — null when the field exists but is empty.
  // May be absent from the response if the org has no such field.
  Kit_Edition__c?:          string | null;
  Series_Label__c?:         string | null;
  Content_Types__c?:        string | null;
  Audience_Type__c?:        string | null;
  License_Terms__c?:        string | null;
  Change_Log_JSON__c?:      string | null;
  Bundle_JSON__c?:          string | null;
  Beats_JSON__c?:           string | null;
  QR_Codes_JSON__c?:        string | null;
  Shared_Inserts_JSON__c?:  string | null;
  Test_Data_JSON__c?:       string | null;
}

// Full SOQL SELECT clause — includes custom fields.  Falls back to
// STANDARD_FIELDS if the org returns INVALID_FIELD.
const FULL_ASSET_SELECT =
  "Id, Name, PurchaseDate, Status, Description, " +
  "Product2.Name, Product2.Family, " +
  "Kit_Edition__c, Series_Label__c, Content_Types__c, Audience_Type__c, " +
  "License_Terms__c, Change_Log_JSON__c, Bundle_JSON__c, Beats_JSON__c, " +
  "QR_Codes_JSON__c, Shared_Inserts_JSON__c, Test_Data_JSON__c";

const STANDARD_ASSET_SELECT =
  "Id, Name, PurchaseDate, Status, Description, Product2.Name, Product2.Family";

// ── Field-parsing helpers ──────────────────────────────────────────────────────

function parseJsonField<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse a multi-value text field into a string array.
 * Tries JSON first, then newline-delimited, then semicolon-delimited.
 */
function parseStringList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    // ignore — not JSON
  }
  if (raw.includes("\n")) return raw.split("\n").map((s) => s.trim()).filter(Boolean);
  return raw.split(";").map((s) => s.trim()).filter(Boolean);
}

// ── Salesforce fetch ───────────────────────────────────────────────────────────

/**
 * Fetch the Salesforce Asset record for the given ID and map it to KitPageData.
 *
 * Tries a query with custom fields first.  If the org returns INVALID_FIELD
 * (custom fields not installed), retries with only standard Asset fields so
 * the page still loads — just with fewer richly-typed sections.
 *
 * Throws on network/auth/rate-limit failures — let the caller decide the HTTP
 * response.  Throws with code "ASSET_NOT_FOUND" when the record doesn't exist.
 */
export async function fetchKitDataFromSalesforce(assetId: string): Promise<KitPageData> {
  const sf = new ConnectorSalesforceClient();

  let asset: SfAssetRecord | null = null;

  for (const select of [FULL_ASSET_SELECT, STANDARD_ASSET_SELECT]) {
    try {
      const result = await sf.query<SfAssetRecord>(
        `SELECT ${select} FROM Asset WHERE Id = '${assetId}' LIMIT 1`
      );
      asset = result.records[0] ?? null;
      break; // query succeeded — exit the retry loop
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // If this was already the fallback (standard fields) query, re-throw.
      if (select === STANDARD_ASSET_SELECT) throw err;

      // If SF rejected a field name, retry with only standard fields.
      if (msg.includes("INVALID_FIELD") || msg.includes("No such column")) {
        logger.warn(
          { assetId },
          "buyer: custom Asset fields not found in SF org — retrying with standard fields only"
        );
        continue;
      }

      // Any other SF error (network, auth, rate-limit) — re-throw immediately.
      throw err;
    }
  }

  if (!asset) {
    const err = new Error(`Asset record not found in Salesforce: ${assetId}`);
    (err as Error & { code: string }).code = "ASSET_NOT_FOUND";
    throw err;
  }

  return mapAssetToKitPageData(asset);
}

function mapAssetToKitPageData(asset: SfAssetRecord): KitPageData {
  const seriesLabel =
    asset.Series_Label__c ??
    asset.Product2?.Family ??
    asset.Product2?.Name ??
    "Transition Trails Series";

  const editionName = asset.Kit_Edition__c ?? asset.Status ?? "";

  const contentTypes = parseStringList(asset.Content_Types__c);

  const purchaseDate =
    asset.PurchaseDate ?? new Date().toISOString().slice(0, 10);

  const rawAudience = (asset.Audience_Type__c ?? "").toLowerCase();
  const audienceType: "nonprofit" | "learner" =
    rawAudience === "learner" ? "learner" : "nonprofit";

  const licenseTerms  = parseStringList(asset.License_Terms__c);
  const changeLog     = parseJsonField<ChangeEntry[]>(asset.Change_Log_JSON__c, []);
  const bundle        = parseJsonField<BundleKit[] | null>(asset.Bundle_JSON__c, null);
  const beats         = parseJsonField<Beat[]>(asset.Beats_JSON__c, []);
  const qrCodes       = parseJsonField<QREntry[]>(asset.QR_Codes_JSON__c, []);
  const sharedInserts = parseJsonField<SharedInsert[]>(asset.Shared_Inserts_JSON__c, []);
  const testDataFiles = parseJsonField<TestDataFile[]>(asset.Test_Data_JSON__c, []);

  return {
    assetId:   asset.Id,
    seriesLabel,
    kitTitle:  asset.Name,
    editionName,
    contentTypes,
    purchaseDate,
    audienceType,
    changeLog,
    bundle,
    beats,
    sharedInserts,
    qrCodes,
    testDataFiles,
    licenseTerms,
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

  // ── Step 1: validate the token against the database ────────────────────────

  let assetId: string;

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

    assetId = row.assetId;
  } catch (err) {
    logger.error({ err }, "buyer: failed to look up token");
    res.status(500).json({ error: "internal_error", message: "Something went wrong.  Please try again later." });
    return;
  }

  // ── Step 2: fetch the Salesforce Asset record ──────────────────────────────

  try {
    const pageData = await fetchKitDataFromSalesforce(assetId);
    res.json({ ok: true, data: pageData });
  } catch (sfErr) {
    logger.error({ err: sfErr, assetId }, "buyer: Salesforce Asset fetch failed");

    // Asset record removed from SF after the token was issued.
    if ((sfErr as { code?: string }).code === "ASSET_NOT_FOUND") {
      res.status(404).json({
        error:   "asset_not_found",
        message: "The content for this link is no longer available.  Please contact support.",
      });
      return;
    }

    // SF connectivity / rate-limit / auth failure.
    res.status(503).json({
      error:   "sf_unavailable",
      message: "We were unable to load your kit details.  Please try again in a moment.",
    });
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
