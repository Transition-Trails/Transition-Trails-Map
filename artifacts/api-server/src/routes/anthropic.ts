import { Router } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type AnthropicStatus =
  | "key_missing"
  | "format_invalid"
  | "auth_error"
  | "quota_exceeded"
  | "api_error"
  | "network_error"
  | "valid";

interface AnthropicValidationResult {
  timestamp: string;
  keyPresent: boolean;
  formatValid: boolean;
  apiReachable: boolean;
  authValid: boolean;
  modelCount: number;
  modelSample: string[];
  status: AnthropicStatus;
  errorCode: string | null;
  errorMessage: string | null;
  permissionsReady: boolean;
  integrationReady: boolean;
  nextStep: string;
  durationMs: number;
}

// ─── GET /anthropic/validate ──────────────────────────────────────────────────

router.get("/anthropic/validate", async (_req, res) => {
  const start = Date.now();
  const apiKey = process.env["ANTHROPIC_API_KEY"];

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
      status: "key_missing" as AnthropicStatus,
      errorCode: null,
      errorMessage: "ANTHROPIC_API_KEY is not set in environment secrets.",
      permissionsReady: false,
      integrationReady: false,
      nextStep: "Set ANTHROPIC_API_KEY from console.anthropic.com → API Keys → Create Key.",
      durationMs: Date.now() - start,
    } satisfies AnthropicValidationResult);
  }

  // ── Format check ───────────────────────────────────────────────────────────
  // Anthropic API keys: sk-ant-api03-… (legacy) or sk-ant-… (all variants); ≥40 chars
  const formatValid = apiKey.startsWith("sk-ant-") && apiKey.length >= 40;
  if (!formatValid) {
    return res.json({
      timestamp: new Date().toISOString(),
      keyPresent: true,
      formatValid: false,
      apiReachable: false,
      authValid: false,
      modelCount: 0,
      modelSample: [],
      status: "format_invalid" as AnthropicStatus,
      errorCode: null,
      errorMessage: "ANTHROPIC_API_KEY format not recognised. Expected sk-ant-… (≥40 characters).",
      permissionsReady: false,
      integrationReady: false,
      nextStep: "Regenerate from console.anthropic.com → API Keys. Keys should start with sk-ant-.",
      durationMs: Date.now() - start,
    } satisfies AnthropicValidationResult);
  }

  // ── Live API call ──────────────────────────────────────────────────────────
  // GET /v1/models is a safe, read-only call that verifies auth with no cost.
  let apiReachable = false;
  let authValid = false;
  let modelCount = 0;
  let modelSample: string[] = [];
  let status: AnthropicStatus = "api_error";
  let errorCode: string | null = null;
  let errorMessage: string | null = null;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    apiReachable = true;

    if (resp.ok) {
      const body = await resp.json() as { data?: Array<{ id: string; display_name?: string }> };
      authValid = true;
      status = "valid";
      const models = body.data ?? [];
      modelCount = models.length;
      modelSample = models
        .slice(0, 6)
        .map(m => m.display_name ?? m.id);
    } else {
      const body = await resp.json() as { error?: { type?: string; message?: string } };
      const err = body.error ?? {};
      errorCode = err.type ?? String(resp.status);
      errorMessage = err.message ?? `HTTP ${resp.status}`;

      if (resp.status === 401 || err.type === "authentication_error") {
        status = "auth_error";
      } else if (resp.status === 429 || err.type === "rate_limit_error") {
        // Rate-limited — key is valid, just busy
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
  const integrationReady = permissionsReady;

  const nextStep = (() => {
    switch (status) {
      case "valid":          return "Anthropic API key valid — Claude Sonnet 4.6 available for quest generation (GET /api/learner/daily-quest).";
      case "quota_exceeded": return "API key valid but rate-limited. Check usage at console.anthropic.com → Usage.";
      case "auth_error":     return "API key rejected (authentication_error). Regenerate at console.anthropic.com → API Keys.";
      case "network_error":  return "Could not reach api.anthropic.com from this server. Check network connectivity.";
      default:               return "Unexpected error. Check Anthropic status at status.anthropic.com.";
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
  } satisfies AnthropicValidationResult);
});

export default router;
