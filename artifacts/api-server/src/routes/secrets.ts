import { Router } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type SecretStatus = "present" | "missing" | "found-alternate";

interface FormatResult {
  checked: boolean;
  plausible?: boolean;
  hint?: string;
}

interface SecretEntry {
  id: string;
  name: string;
  foundName?: string;
  alternateNames: string[];
  status: SecretStatus;
  format: FormatResult;
  integration: string;
  category: string;
  purpose: string;
  required: boolean;
  nextFix?: string;
}

interface IntegrationSummary {
  id: string;
  label: string;
  colorCls: string;
  totalRequired: number;
  presentCount: number;
  missingRequired: number;
  overallStatus: "ready" | "partial" | "missing" | "configured";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve an env var checking primary name then alternates. Never returns the value. */
function resolveSecret(
  primary: string,
  alternates: string[] = []
): { present: boolean; foundName?: string } {
  if (process.env[primary] !== undefined && process.env[primary] !== "") {
    return { present: true, foundName: primary };
  }
  for (const alt of alternates) {
    if (process.env[alt] !== undefined && process.env[alt] !== "") {
      return { present: true, foundName: alt };
    }
  }
  return { present: false };
}

/** Check format WITHOUT returning or logging the value. */
function checkFormat(name: string, check: (v: string) => { plausible: boolean; hint: string }): FormatResult {
  const v = process.env[name];
  if (!v) return { checked: false };
  try {
    const result = check(v);
    return { checked: true, plausible: result.plausible, hint: result.hint };
  } catch {
    return { checked: true, plausible: false, hint: "Format check error." };
  }
}

function slackBotTokenFormat(v: string) {
  return { plausible: v.startsWith("xoxb-") && v.length > 40, hint: v.startsWith("xoxb-") ? "xoxb- prefix ✓" : "Expected xoxb- prefix." };
}
function slackAppTokenFormat(v: string) {
  return { plausible: v.startsWith("xapp-") && v.length > 20, hint: v.startsWith("xapp-") ? "xapp- prefix ✓" : "Expected xapp- prefix." };
}
function slackSigningSecretFormat(v: string) {
  return { plausible: /^[a-f0-9]{32}$/.test(v), hint: /^[a-f0-9]{32}$/.test(v) ? "32-char hex ✓" : "Expected 32-char lowercase hex." };
}
function slackChannelIdFormat(v: string) {
  const norm = v.includes("/") ? v.slice(v.lastIndexOf("/") + 1) : v;
  const ok = /^[CG][A-Z0-9]{8,12}$/.test(norm);
  return { plausible: ok, hint: ok ? `${norm} — C/G prefix ✓` : `Value "${norm.slice(0, 4)}…" does not match Slack channel ID format (C.../G...).` };
}
function geminiKeyFormat(v: string) {
  const legacy = v.startsWith("AIza") && v.length >= 35;
  const newFmt  = v.startsWith("AQ.")  && v.length >= 35;
  const plausible = legacy || newFmt;
  const hint = legacy  ? "AIza prefix ✓ (legacy format)"
             : newFmt  ? "AQ. prefix ✓ (new secure auth key format)"
             : "Expected AIza… (legacy) or AQ.… (new Google AI Studio secure auth key).";
  return { plausible, hint };
}
function githubPatFormat(v: string) {
  const ok = v.startsWith("ghp_") || v.startsWith("github_pat_") || v.startsWith("gho_");
  return { plausible: ok, hint: ok ? "GitHub token prefix ✓" : "Expected ghp_/ github_pat_/ gho_ prefix." };
}
function webhookSecretFormat(v: string) {
  return { plausible: v.length >= 8, hint: v.length >= 8 ? `${v.length}-char secret ✓` : "Secret appears very short — consider using a longer value." };
}
function sessionSecretFormat(v: string) {
  return { plausible: v.length >= 16, hint: v.length >= 16 ? `${v.length}-char secret ✓` : "Session secret should be at least 16 characters." };
}
function googleClientIdFormat(v: string) {
  return { plausible: v.endsWith(".apps.googleusercontent.com"), hint: v.endsWith(".apps.googleusercontent.com") ? ".apps.googleusercontent.com ✓" : "Expected Google OAuth client ID ending in .apps.googleusercontent.com." };
}
function googleClientSecretFormat(v: string) {
  const ok = v.startsWith("GOCSPX-") || /^[A-Za-z0-9_-]{24,40}$/.test(v);
  return { plausible: ok, hint: ok ? "Format plausible ✓" : "Unexpected format for Google OAuth client secret." };
}
function googleRefreshTokenFormat(v: string) {
  return { plausible: v.startsWith("1//") || v.length > 40, hint: v.startsWith("1//") ? "1// prefix ✓" : v.length > 40 ? "Token length plausible ✓" : "Unexpected refresh token format." };
}
function googleServiceAccountFormat(v: string) {
  try {
    const key = JSON.parse(v) as { type?: string; private_key?: string; client_email?: string };
    if (key.type !== "service_account") return { plausible: false, hint: 'JSON parsed but "type" is not "service_account".' };
    if (!key.private_key?.includes("BEGIN")) return { plausible: false, hint: "Missing or malformed private_key field." };
    if (!key.client_email?.includes(".iam.gserviceaccount.com")) return { plausible: false, hint: `client_email "${(key.client_email ?? "").slice(0, 20)}…" does not look like a service account address.` };
    return { plausible: true, hint: `service_account ✓ · ${key.client_email}` };
  } catch {
    return { plausible: false, hint: "Not valid JSON — paste the full service account key JSON from Google Cloud Console." };
  }
}
function googleAdminEmailFormat(v: string) {
  const ok = v.includes("@") && v.endsWith("@transitiontrails.org");
  return { plausible: ok, hint: ok ? `${v} ✓` : "Should be a Workspace admin email ending in @transitiontrails.org." };
}

// ─── Secret Catalog ──────────────────────────────────────────────────────────

interface SecretSpec {
  id: string;
  primary: string;
  alts?: string[];
  fmtCheck?: (v: string) => { plausible: boolean; hint: string };
  integration: string;
  category: string;
  purpose: string;
  required: boolean;
  nextFix?: string;
}

function buildCatalog(): SecretEntry[] {
  const entries: SecretSpec[] = [
    // ── Slack ──────────────────────────────────────────────────────────────
    { id: "slack-bot-token",      primary: "SLACK_BOT_TOKEN",           alts: ["SLACK_BOT_USER_OAUTH_TOKEN"], integration: "Slack", category: "Bot Token",      required: true,  purpose: "Authenticates all Slack API calls — messages, channel reads, member checks.", nextFix: "Slack App dashboard → OAuth & Permissions → Bot User OAuth Token (xoxb-).", fmtCheck: slackBotTokenFormat },
    { id: "slack-app-token",      primary: "SLACK_APP_TOKEN",           alts: [],                            integration: "Slack", category: "App Token",       required: false, purpose: "Required for Socket Mode real-time event processing.", nextFix: "Slack App → Basic Information → App-Level Tokens → Generate (xapp-).", fmtCheck: slackAppTokenFormat },
    { id: "slack-signing-secret", primary: "SLACK_SIGNING_SECRET",      alts: [],                            integration: "Slack", category: "Signing Secret",  required: true,  purpose: "Verifies incoming Slack event payloads — prevents spoofed webhook calls.", nextFix: "Slack App → Basic Information → App Credentials → Signing Secret.", fmtCheck: slackSigningSecretFormat },
    { id: "slack-client-id",      primary: "SLACK_CLIENT_ID",           alts: [],                            integration: "Slack", category: "OAuth Client",    required: false, purpose: "Required for OAuth 2.0 app installation flow.", nextFix: "Slack App → Basic Information → App Credentials → Client ID." },
    { id: "slack-client-secret",  primary: "SLACK_CLIENT_SECRET",       alts: [],                            integration: "Slack", category: "OAuth Client",    required: false, purpose: "Required for OAuth 2.0 token exchange during app installation.", nextFix: "Slack App → Basic Information → App Credentials → Client Secret." },
    { id: "slack-channel-id",     primary: "SLACK_CHANNEL_ID",          alts: [],                            integration: "Slack", category: "Channel ID",      required: false, purpose: "Default Slack channel for Trail OS message delivery.", nextFix: "Right-click any Slack channel → View channel details → copy ID at bottom.", fmtCheck: slackChannelIdFormat },
    { id: "slack-penny-channel",  primary: "SLACK_PENNY_CHANNEL_ID",    alts: [],                            integration: "Slack", category: "Channel ID",      required: true,  purpose: "Penny AI channel — where Penny (Gemini) and Agentforce both respond. Confirmed working in POC.", nextFix: "Set to the Penny AI channel ID from the POC.", fmtCheck: slackChannelIdFormat },
    { id: "slack-admin-channel",  primary: "SLACK_ADMIN_CHANNEL_ID",    alts: [],                            integration: "Slack", category: "Channel ID",      required: true,  purpose: "Admin/ops channel for Trail OS operational notifications and escalations.", nextFix: "Set to the admin/ops channel ID from the POC.", fmtCheck: slackChannelIdFormat },

    // ── Google shared OAuth ────────────────────────────────────────────────
    { id: "google-client-id",     primary: "GOOGLE_CLIENT_ID",          alts: ["GDRIVE_CLIENT_ID", "GCAL_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID"], integration: "Google", category: "OAuth Client", required: true,  purpose: "Shared Google OAuth 2.0 client ID — used by both Drive and Calendar integrations.", nextFix: "Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web App).", fmtCheck: googleClientIdFormat },
    { id: "google-client-secret", primary: "GOOGLE_CLIENT_SECRET",      alts: ["GDRIVE_CLIENT_SECRET", "GCAL_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET"], integration: "Google", category: "OAuth Client", required: true,  purpose: "Shared Google OAuth 2.0 client secret — paired with GOOGLE_CLIENT_ID.", nextFix: "Google Cloud Console → Credentials → Download OAuth client JSON → copy client_secret.", fmtCheck: googleClientSecretFormat },

    // ── Google Drive ───────────────────────────────────────────────────────
    { id: "google-drive-refresh",      primary: "GOOGLE_DRIVE_REFRESH_TOKEN",   alts: ["GDRIVE_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN"], integration: "Google Drive", category: "OAuth Token",   required: true,  purpose: "Persistent access token for Google Drive API — program folders, curriculum files, Penny sources.", nextFix: "Complete Google OAuth flow with drive, drive.readonly, drive.file scopes. Store result as GOOGLE_DRIVE_REFRESH_TOKEN.", fmtCheck: googleRefreshTokenFormat },
    { id: "google-drive-penny-folder", primary: "GOOGLE_DRIVE_PENNY_FOLDER_ID", alts: [],                                              integration: "Google Drive", category: "Folder Config", required: false, purpose: "Root Google Drive folder ID for the Penny Asset Library — images, voice scripts, and media organised by Penny state (coaching/, trail-talk/, resume-review/, etc.).", nextFix: "1. Create a folder named 'Penny Assets' in Google Drive. 2. Open it and copy the folder ID from the URL (the long string after /folders/). 3. Add it as GOOGLE_DRIVE_PENNY_FOLDER_ID in Replit Secrets (Tools → Secrets). 4. Create subfolders: coaching, trail-talk, resume-review, interview-prep, confidence-builder, quest-debrief." },

    // ── Google Calendar ────────────────────────────────────────────────────
    { id: "google-cal-refresh",   primary: "GOOGLE_CALENDAR_REFRESH_TOKEN", alts: ["GCAL_REFRESH_TOKEN", "GOOGLE_CAL_REFRESH_TOKEN"], integration: "Google Calendar", category: "OAuth Token", required: true,  purpose: "Persistent access token for Google Calendar API — cohort sessions, coaching events, Penny reminders.", nextFix: "Complete Calendar OAuth flow with calendar.readonly, calendar.events scopes. Store as GOOGLE_CALENDAR_REFRESH_TOKEN.", fmtCheck: googleRefreshTokenFormat },

    // ── Gmail ──────────────────────────────────────────────────────────────
    { id: "google-gmail-refresh", primary: "GOOGLE_GMAIL_REFRESH_TOKEN", alts: [], integration: "Gmail", category: "OAuth Token", required: true, purpose: "Persistent access token for Gmail API — inbox read (gmail.readonly) and send (gmail.send) for the Mail action panel in Trail OS.", nextFix: "Re-run the Google OAuth wizard at /admin/google-oauth — scopes now include gmail.readonly + gmail.send. Store the new refresh token as GOOGLE_GMAIL_REFRESH_TOKEN in Replit Secrets.", fmtCheck: googleRefreshTokenFormat },

    // ── Gemini / Penny AI ──────────────────────────────────────────────────
    { id: "gemini-api-key",       primary: "GEMINI_API_KEY",            alts: ["GOOGLE_AI_API_KEY", "GOOGLE_AI_KEY", "PALM_API_KEY", "VERTEX_AI_API_KEY"], integration: "Gemini / Penny AI", category: "API Key", required: true,  purpose: "Authenticates all Penny (Gemini) AI requests — capability responses, assessments, coaching prompts, Trail Quests.", nextFix: "Google AI Studio (aistudio.google.com) → Get API Key. New keys start with AQ. (secure auth key format); legacy keys start with AIza. Both formats are accepted.", fmtCheck: geminiKeyFormat },

    // ── Salesforce ─────────────────────────────────────────────────────────
    // Auth is managed via Replit Connectors SDK (proxyFetch) — no client ID/secret/instance URL env vars needed.
    { id: "sf-webhook-secret",    primary: "SALESFORCE_WEBHOOK_SECRET",  alts: ["SF_WEBHOOK_SECRET"],         integration: "Salesforce", category: "Webhook Secret", required: true,  purpose: "Verifies incoming Salesforce event notifications and webhook payloads. REST API auth is handled by the Replit Connector — no SALESFORCE_CLIENT_ID or instance URL needed.", nextFix: "Generate and set in Salesforce Connected App or outbound message configuration.", fmtCheck: webhookSecretFormat },
    { id: "sf-client-id",         primary: "SALESFORCE_CLIENT_ID",       alts: ["SF_CLIENT_ID", "SFDC_CLIENT_ID"], integration: "Salesforce", category: "Connected App", required: false, purpose: "Not required — Salesforce REST API auth is managed via the Replit Connector (proxyFetch). Only needed if switching to a self-managed OAuth Connected App in future.", nextFix: "Not required for current connector-based integration. Leave unset." },
    { id: "sf-client-secret",     primary: "SALESFORCE_CLIENT_SECRET",   alts: ["SF_CLIENT_SECRET", "SFDC_CLIENT_SECRET"], integration: "Salesforce", category: "Connected App", required: false, purpose: "Not required — Salesforce REST API auth is managed via the Replit Connector (proxyFetch). Only needed if switching to a self-managed OAuth Connected App in future.", nextFix: "Not required for current connector-based integration. Leave unset." },
    { id: "sf-instance-url",      primary: "SALESFORCE_INSTANCE_URL",    alts: ["SF_INSTANCE_URL", "SFDC_INSTANCE_URL"], integration: "Salesforce", category: "Instance URL", required: false, purpose: "Not required — the Replit Connector resolves the org URL automatically from the active connection. Only needed if switching away from the Replit Connector.", nextFix: "Not required for current connector-based integration. Leave unset." },

    // ── Agentforce ─────────────────────────────────────────────────────────
    { id: "agentforce-key",       primary: "AGENTFORCE_API_KEY",         alts: ["AGENTFORCE_CLIENT_ID", "AGENTFORCE_TOKEN"], integration: "Agentforce", category: "API Key", required: false, purpose: "Agentforce (Penny–Transition Trails Assistant) API credentials for the Salesforce-backed AI bot.", nextFix: "Configure via Salesforce Agentforce setup — retrieve from your Agentforce project." },

    // ── GitHub ─────────────────────────────────────────────────────────────
    { id: "github-pat",           primary: "GITHUB_PERSONAL_ACCESS_TOKEN", alts: ["GH_TOKEN", "GITHUB_TOKEN"], integration: "GitHub", category: "Personal Access Token", required: false, purpose: "GitHub API access for repository operations, workflow triggers, and content management.", nextFix: "GitHub → Settings → Developer settings → Personal access tokens → Generate new token.", fmtCheck: githubPatFormat },
    { id: "github-webhook",       primary: "GITHUB_WEBHOOK_SECRET",     alts: ["GH_WEBHOOK_SECRET"],          integration: "GitHub", category: "Webhook Secret", required: false, purpose: "Verifies incoming GitHub webhook payloads for repository event processing.", nextFix: "Set a strong random string in GitHub repo → Settings → Webhooks → Secret.", fmtCheck: webhookSecretFormat },

    // ── Google Admin SDK (Directory API — Google Groups auto-tier) ───────────
    { id: "google-admin-creds",   primary: "GOOGLE_ADMIN_CREDENTIALS",       alts: [], integration: "Google Admin SDK", category: "Service Account", required: true,  purpose: "Service account JSON key with Google Admin SDK Directory API + domain-wide delegation — enables Google Groups auto-tier assignment on sign-in.", nextFix: "GCP Console → IAM & Admin → Service Accounts → Create → Keys → JSON. Enable domain-wide delegation. In Workspace Admin → Security → API Controls → Domain-wide delegation, add the service account client ID with scope https://www.googleapis.com/auth/admin.directory.group.member.readonly. Paste the full JSON here.", fmtCheck: googleServiceAccountFormat },
    { id: "google-admin-email",   primary: "GOOGLE_ADMIN_IMPERSONATE_EMAIL",  alts: [], integration: "Google Admin SDK", category: "Impersonate Email", required: true, purpose: "A Google Workspace admin email the service account impersonates to read group membership from the Directory API.", nextFix: "Set to any @transitiontrails.org admin account (e.g. admin@transitiontrails.org). The impersonated account must have access to the Admin SDK.", fmtCheck: googleAdminEmailFormat },

    // ── Session / Security ─────────────────────────────────────────────────
    { id: "session-secret",       primary: "SESSION_SECRET",             alts: [],                             integration: "Session", category: "Session Security", required: true,  purpose: "Signs and verifies Trail OS user sessions — required for secure auth state management.", nextFix: "Generate with: openssl rand -hex 32. Add as SESSION_SECRET in Replit Secrets.", fmtCheck: sessionSecretFormat },
  ];

  return entries.map(({ primary, alts = [], fmtCheck, ...rest }) => {
    const { present, foundName } = resolveSecret(primary, alts);

    let format: FormatResult = { checked: false };
    if (present && foundName && fmtCheck) {
      format = checkFormat(foundName, fmtCheck);
    }

    const status: SecretStatus = !present
      ? "missing"
      : foundName !== primary
      ? "found-alternate"
      : "present";

    return {
      ...rest,
      name: primary,
      alternateNames: alts,
      foundName,
      status,
      format,
    } as SecretEntry;
  });
}

function buildSummaries(entries: SecretEntry[]): IntegrationSummary[] {
  const integrations = [...new Set(entries.map(e => e.integration))];
  const colorMap: Record<string, string> = {
    "Slack": "border-pink-200 bg-pink-50 text-pink-800",
    "Google": "border-sky-200 bg-sky-50 text-sky-800",
    "Google Drive": "border-blue-200 bg-blue-50 text-blue-800",
    "Google Calendar": "border-indigo-200 bg-indigo-50 text-indigo-800",
    "Gmail": "border-rose-200 bg-rose-50 text-rose-800",
    "Gemini / Penny AI": "border-violet-200 bg-violet-50 text-violet-800",
    "Salesforce": "border-teal-200 bg-teal-50 text-teal-800",
    "Agentforce": "border-cyan-200 bg-cyan-50 text-cyan-800",
    "GitHub": "border-slate-200 bg-slate-50 text-slate-800",
    "Google Admin SDK": "border-green-200 bg-green-50 text-green-800",
    "Session": "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return integrations.map(intg => {
    const group = entries.filter(e => e.integration === intg);
    const required = group.filter(e => e.required);
    const presentCount = group.filter(e => e.status !== "missing").length;
    const missingRequired = required.filter(e => e.status === "missing").length;
    const allRequiredPresent = missingRequired === 0;
    const anyPresent = presentCount > 0;

    const overallStatus = allRequiredPresent
      ? presentCount === group.length ? "configured" : "ready"
      : anyPresent ? "partial" : "missing";

    return {
      id: intg.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      label: intg,
      colorCls: colorMap[intg] ?? "border-border bg-muted text-muted-foreground",
      totalRequired: required.length,
      presentCount,
      missingRequired,
      overallStatus,
    };
  });
}

// ─── GET /secrets/audit ───────────────────────────────────────────────────────

router.get("/secrets/audit", (_req, res) => {
  const entries  = buildCatalog();
  const summaries = buildSummaries(entries);

  const totalRequired = entries.filter(e => e.required).length;
  const presentRequired = entries.filter(e => e.required && e.status !== "missing").length;
  const missingRequired = totalRequired - presentRequired;
  const totalPresent = entries.filter(e => e.status !== "missing").length;
  const formatIssues = entries.filter(e => e.format.checked && e.format.plausible === false).length;

  res.json({
    timestamp: new Date().toISOString(),
    summary: { totalSecrets: entries.length, totalPresent, totalRequired, presentRequired, missingRequired, formatIssues },
    summaries,
    entries,
  });
});

export default router;
