import { Router } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type CredentialTier =
  | "not_configured"    // secret absent
  | "format_invalid"    // present but wrong format
  | "credentials_ready" // client ID + secret present + valid format
  | "oauth_incomplete"  // credentials ok, refresh token missing
  | "api_ready";        // has refresh token (could make API calls)

interface ServiceReadiness {
  secretPresent: boolean;
  formatValid: boolean;
  refreshTokenPresent: boolean;
  tier: CredentialTier;
  label: string;
  nextStep: string;
}

interface GoogleValidationResult {
  timestamp: string;
  googleReachable: boolean;
  reachabilityMs: number | null;
  clientId:     { present: boolean; formatValid: boolean; foundName?: string };
  clientSecret: { present: boolean; formatValid: boolean; foundName?: string };
  drive:     ServiceReadiness;
  calendar:  ServiceReadiness;
  sharedOAuth: {
    ready: boolean;
    tier: CredentialTier;
    label: string;
    details: string;
  };
  nextSteps: string[];
  durationMs: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveEnv(primary: string, alts: string[]): { value?: string; foundName?: string } {
  if (process.env[primary]) return { value: process.env[primary], foundName: primary };
  for (const alt of alts) {
    if (process.env[alt]) return { value: process.env[alt], foundName: alt };
  }
  return {};
}

function googleClientIdValid(v: string): boolean {
  return v.endsWith(".apps.googleusercontent.com");
}

function googleClientSecretValid(v: string): boolean {
  return v.startsWith("GOCSPX-") || /^[A-Za-z0-9_-]{24,40}$/.test(v);
}

function googleRefreshTokenValid(v: string): boolean {
  return v.startsWith("1//") || v.length > 40;
}

function buildServiceReadiness(
  secretName: string,
  alts: string[],
  fmtCheck: (v: string) => boolean,
  credentialsOk: boolean,
  serviceName: string,
  scopeHint: string
): ServiceReadiness {
  const { value, foundName } = resolveEnv(secretName, alts);
  const secretPresent = !!value;
  const formatValid = secretPresent && fmtCheck(value!);

  let tier: CredentialTier;
  let label: string;
  let nextStep: string;

  if (!credentialsOk) {
    tier = "not_configured";
    label = "Credentials missing";
    nextStep = "Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first.";
  } else if (!secretPresent) {
    tier = "oauth_incomplete";
    label = "OAuth flow incomplete";
    nextStep = `Complete the Google OAuth flow with ${scopeHint} scopes. Store the refresh token as ${secretName}.`;
  } else if (!formatValid) {
    tier = "format_invalid";
    label = "Refresh token format invalid";
    nextStep = `The value of ${foundName ?? secretName} does not look like a refresh token (should start with '1//'). Re-run the OAuth flow.`;
  } else {
    tier = "api_ready";
    label = `${serviceName} API access configured`;
    nextStep = `${serviceName} is ready for live API calls. Wire the first integration call.`;
  }

  return { secretPresent, formatValid, refreshTokenPresent: secretPresent && formatValid, tier, label, nextStep };
}

// ─── GET /google/validate ─────────────────────────────────────────────────────

router.get("/google/validate", async (_req, res) => {
  const start = Date.now();

  // ── Resolve shared OAuth credentials ───────────────────────────────────────
  const clientIdRes     = resolveEnv("GOOGLE_CLIENT_ID",     ["GDRIVE_CLIENT_ID", "GCAL_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"]);
  const clientSecretRes = resolveEnv("GOOGLE_CLIENT_SECRET", ["GDRIVE_CLIENT_SECRET", "GCAL_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"]);

  const clientIdPresent     = !!clientIdRes.value;
  const clientSecretPresent = !!clientSecretRes.value;
  const clientIdFmt         = clientIdPresent  && googleClientIdValid(clientIdRes.value!);
  const clientSecretFmt     = clientSecretPresent && googleClientSecretValid(clientSecretRes.value!);

  const credentialsOk = clientIdPresent && clientIdFmt && clientSecretPresent && clientSecretFmt;

  // ── Service-specific refresh tokens ────────────────────────────────────────
  const drive    = buildServiceReadiness(
    "GOOGLE_DRIVE_REFRESH_TOKEN",
    ["GDRIVE_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN"],
    googleRefreshTokenValid,
    credentialsOk,
    "Google Drive",
    "drive.readonly, drive.file"
  );

  const calendar = buildServiceReadiness(
    "GOOGLE_CALENDAR_REFRESH_TOKEN",
    ["GCAL_REFRESH_TOKEN", "GOOGLE_CAL_REFRESH_TOKEN"],
    googleRefreshTokenValid,
    credentialsOk,
    "Google Calendar",
    "calendar.readonly, calendar.events"
  );

  // ── Google API reachability ────────────────────────────────────────────────
  // Call a public Google endpoint that requires no auth — just proves network access.
  let googleReachable = false;
  let reachabilityMs: number | null = null;
  try {
    const t0 = Date.now();
    const resp = await fetch("https://accounts.google.com/.well-known/openid-configuration", {
      method: "GET",
      signal: AbortSignal.timeout(8_000),
    });
    reachabilityMs = Date.now() - t0;
    googleReachable = resp.ok;
  } catch {
    googleReachable = false;
  }

  // ── Shared OAuth tier ──────────────────────────────────────────────────────
  let sharedTier: CredentialTier;
  let sharedLabel: string;
  let sharedDetails: string;

  if (!clientIdPresent || !clientSecretPresent) {
    sharedTier = "not_configured";
    sharedLabel = "OAuth credentials absent";
    sharedDetails = "GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are not set.";
  } else if (!clientIdFmt || !clientSecretFmt) {
    sharedTier = "format_invalid";
    sharedLabel = "Format check failed";
    sharedDetails = `${!clientIdFmt ? "GOOGLE_CLIENT_ID format unexpected. " : ""}${!clientSecretFmt ? "GOOGLE_CLIENT_SECRET format unexpected." : ""}`;
  } else {
    sharedTier = "credentials_ready";
    sharedLabel = "OAuth client credentials ready";
    sharedDetails = `${clientIdRes.foundName ?? "GOOGLE_CLIENT_ID"} and ${clientSecretRes.foundName ?? "GOOGLE_CLIENT_SECRET"} are both present with valid format. Ready to run OAuth authorization flow.`;
  }

  // ── Next steps ─────────────────────────────────────────────────────────────
  const nextSteps: string[] = [];
  if (!credentialsOk) {
    nextSteps.push("Configure GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET from Google Cloud Console → APIs & Services → Credentials.");
  } else {
    if (!drive.refreshTokenPresent && !calendar.refreshTokenPresent) {
      nextSteps.push("Run the Google OAuth authorization flow. Both Drive and Calendar can be authorized in a single flow — request all required scopes together.");
      nextSteps.push("Scopes needed: drive.readonly, drive.file, calendar.readonly, calendar.events.");
      nextSteps.push("Store the resulting refresh token as GOOGLE_DRIVE_REFRESH_TOKEN and GOOGLE_CALENDAR_REFRESH_TOKEN (or use one token for both if using a single OAuth grant).");
    } else {
      if (!drive.refreshTokenPresent)    nextSteps.push(drive.nextStep);
      if (!calendar.refreshTokenPresent) nextSteps.push(calendar.nextStep);
    }
    if (!googleReachable) nextSteps.push("Google APIs could not be reached from this server — check network connectivity.");
  }

  return res.json({
    timestamp: new Date().toISOString(),
    googleReachable,
    reachabilityMs,
    clientId:     { present: clientIdPresent,     formatValid: clientIdFmt,     foundName: clientIdRes.foundName },
    clientSecret: { present: clientSecretPresent, formatValid: clientSecretFmt, foundName: clientSecretRes.foundName },
    drive,
    calendar,
    sharedOAuth: { ready: credentialsOk, tier: sharedTier, label: sharedLabel, details: sharedDetails },
    nextSteps,
    durationMs: Date.now() - start,
  } satisfies GoogleValidationResult);
});

export default router;
