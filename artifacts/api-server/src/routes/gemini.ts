import { Router } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type GeminiStatus =
  | "key_missing"
  | "format_invalid"
  | "auth_error"
  | "quota_exceeded"
  | "api_error"
  | "network_error"
  | "valid";

interface GeminiValidationResult {
  timestamp: string;
  keyPresent: boolean;
  formatValid: boolean;
  apiReachable: boolean;
  authValid: boolean;
  modelCount: number;
  modelSample: string[];
  status: GeminiStatus;
  errorCode: string | null;
  errorMessage: string | null;
  permissionsReady: boolean;
  integrationReady: boolean;
  nextStep: string;
  durationMs: number;
}

// ─── GET /gemini/validate ────────────────────────────────────────────────────

router.get("/gemini/validate", async (_req, res) => {
  const start = Date.now();
  const apiKey = process.env["GEMINI_API_KEY"];

  // ── Presence check ─────────────────────────────────────────────────────────
  if (!apiKey) {
    return res.json({
      timestamp: new Date().toISOString(),
      keyPresent: false,
      formatValid: false,
      apiReachable: false,
      authValid: false,
      modelCount: 0,
      modelSample: [],
      status: "key_missing" as GeminiStatus,
      errorCode: null,
      errorMessage: "GEMINI_API_KEY is not set in environment secrets.",
      permissionsReady: false,
      integrationReady: false,
      nextStep: "Set GEMINI_API_KEY from Google AI Studio (aistudio.google.com) → Get API Key.",
      durationMs: Date.now() - start,
    } satisfies GeminiValidationResult);
  }

  // ── Format check ───────────────────────────────────────────────────────────
  // Google AI Studio now issues keys in two formats:
  //   Legacy:  AIza…  (39 chars, still valid)
  //   New:     AQ.…   (new "secure auth key" format, ≥35 chars)
  const formatValid = (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) && apiKey.length >= 35;
  if (!formatValid) {
    return res.json({
      timestamp: new Date().toISOString(),
      keyPresent: true,
      formatValid: false,
      apiReachable: false,
      authValid: false,
      modelCount: 0,
      modelSample: [],
      status: "format_invalid" as GeminiStatus,
      errorCode: null,
      errorMessage: "GEMINI_API_KEY format not recognised. Expected AIza… (legacy) or AQ.… (new Google AI Studio secure auth key), min 35 characters.",
      permissionsReady: false,
      integrationReady: false,
      nextStep: "Get a fresh key from Google AI Studio (aistudio.google.com) — new keys start with AQ., legacy keys start with AIza. Both are accepted.",
      durationMs: Date.now() - start,
    } satisfies GeminiValidationResult);
  }

  // ── Live API call ──────────────────────────────────────────────────────────
  // Listing models is safe: no cost, no side-effects, just validates auth.
  let apiReachable = false;
  let authValid = false;
  let modelCount = 0;
  let modelSample: string[] = [];
  let status: GeminiStatus = "api_error";
  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    apiReachable = true;

    if (resp.ok) {
      const body = await resp.json() as { models?: { name: string; displayName?: string }[] };
      authValid = true;
      status = "valid";
      const models = body.models ?? [];
      modelCount = models.length;
      modelSample = models
        .slice(0, 6)
        .map(m => m.displayName ?? m.name.replace("models/", ""));
    } else {
      const body = await resp.json() as { error?: { code?: number; message?: string; status?: string } };
      const err = body.error ?? {};
      errorCode = String(err.status ?? resp.status);
      errorMessage = err.message ?? `HTTP ${resp.status}`;

      const isKeyRejected =
        err.status === "PERMISSION_DENIED" ||
        err.status === "UNAUTHENTICATED" ||
        err.status === "INVALID_ARGUMENT" ||
        resp.status === 400 ||
        resp.status === 401 ||
        resp.status === 403 ||
        (typeof err.message === "string" && err.message.toLowerCase().includes("api key"));

      if (isKeyRejected) {
        status = "auth_error";
      } else if (resp.status === 429 || err.status === "RESOURCE_EXHAUSTED") {
        // Quota exceeded still means the key is valid
        authValid = true;
        status = "quota_exceeded";
      } else {
        status = "api_error";
      }
    }
  } catch (e: unknown) {
    apiReachable = false;
    status = "network_error";
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  const permissionsReady = authValid || status === "quota_exceeded";
  const integrationReady = permissionsReady; // key works; Penny wiring is separate

  const nextStep = (() => {
    switch (status) {
      case "valid":         return "Gemini API key is valid and working. Wire first Penny capability call using GEMINI_API_KEY.";
      case "quota_exceeded": return "API key is valid but quota may be low. Check usage limits in Google AI Studio.";
      case "auth_error":    return "API key was rejected by Google (INVALID_ARGUMENT / key not valid). Verify the key in Google AI Studio (aistudio.google.com) — it may be from the wrong Google project, have the Generative Language API disabled, or be restricted to specific IPs/domains.";
      case "network_error": return "Could not reach Google APIs from this server. Check network connectivity.";
      default:              return "Unexpected error. Check the Gemini API status at status.cloud.google.com.";
    }
  })();

  return res.json({
    timestamp: new Date().toISOString(),
    keyPresent: true,
    formatValid,
    apiReachable,
    authValid,
    modelCount,
    modelSample,
    status,
    errorCode,
    errorMessage,
    permissionsReady,
    integrationReady,
    nextStep,
    durationMs: Date.now() - start,
  } satisfies GeminiValidationResult);
});

export default router;
