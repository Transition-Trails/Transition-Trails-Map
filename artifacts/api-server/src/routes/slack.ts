import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { alertSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth.js";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = "pass" | "fail" | "warning" | "skip";

interface CheckResult {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  impact: string;
  fix?: string;
  meta?: Record<string, string | boolean | number>;
}

interface ChannelResult {
  envVar: string;
  channelId: string;
  normalizedId: string;
  resolvedRole: "penny" | "admin" | "default" | "unknown";
  status: "pass" | "warning" | "fail" | "skip";
  name?: string;
  isPrivate?: boolean;
  isMember?: boolean;
  memberCount?: number;
  error?: string;
  scopeIssue?: boolean;
  fix?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function slackGet(
  token: string,
  method: string,
  params: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await res.json()) as Record<string, unknown>;
}

/**
 * Strip a workspace-prefixed channel ID like "T02JWAZ2A20/C099671TY6M"
 * down to just the channel part "C099671TY6M".
 */
function normalizeChannelId(raw: string): string {
  const slash = raw.lastIndexOf("/");
  return slash !== -1 ? raw.slice(slash + 1) : raw;
}

/** Guess a channel's functional role from its name when not explicit. */
function detectChannelRole(name: string): "penny" | "admin" | "default" {
  const l = name.toLowerCase();
  if (l.includes("penny") || l.includes("poc") || l.includes("gemini") || l.includes("ai")) return "penny";
  if (l.includes("admin") || l.includes("ops") || l.includes("leadership") || l.includes("operations")) return "admin";
  return "default";
}

// ─── GET /slack/status ────────────────────────────────────────────────────────
// Lightweight check — just reports whether the bot token is present.
// Used by the frontend to disable Slack-dependent UI before the user tries it.

router.get("/slack/status", (_req, res) => {
  const botToken = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  res.json({ configured: Boolean(botToken) });
});

// ─── GET /slack/validate ──────────────────────────────────────────────────────

router.get("/slack/validate", async (req, res) => {
  const checks: CheckResult[]  = [];
  const channels: ChannelResult[] = [];

  const botToken      = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  const appToken      = process.env["SLACK_APP_TOKEN"];
  const signingSecret = process.env["SLACK_SIGNING_SECRET"];
  const channelId     = process.env["SLACK_CHANNEL_ID"];

  // ── Secret presence ───────────────────────────────────────────────────────

  checks.push({
    id: "secret-bot-token",
    category: "Secret",
    label: "Bot Token (SLACK_BOT_TOKEN)",
    status: botToken ? "pass" : "fail",
    detail: botToken
      ? "SLACK_BOT_TOKEN is present in environment secrets."
      : "SLACK_BOT_TOKEN is not set (also checked SLACK_BOT_USER_OAUTH_TOKEN as fallback — neither is present).",
    impact: "Bot token is required for all Slack API calls, channel reads, and message delivery.",
    fix: botToken
      ? undefined
      : "Add SLACK_BOT_TOKEN in Replit Secrets. Find it at: Slack App dashboard → OAuth & Permissions → Bot User OAuth Token (starts with xoxb-).",
  });

  checks.push({
    id: "secret-app-token",
    category: "Secret",
    label: "App-Level Token (SLACK_APP_TOKEN)",
    status: appToken ? "pass" : "warning",
    detail: appToken
      ? "SLACK_APP_TOKEN is present in environment secrets."
      : "SLACK_APP_TOKEN is not set. Required for Socket Mode and real-time event processing.",
    impact: "App-level token is needed for Socket Mode. Not required for basic API calls or message posting.",
    fix: appToken
      ? undefined
      : "Add SLACK_APP_TOKEN in Replit Secrets. Find it at: Slack App dashboard → Basic Information → App-Level Tokens (starts with xapp-).",
  });

  checks.push({
    id: "secret-signing",
    category: "Secret",
    label: "Signing Secret (SLACK_SIGNING_SECRET)",
    status: signingSecret ? "pass" : "fail",
    detail: signingSecret
      ? "SLACK_SIGNING_SECRET is present and will be used to verify incoming Slack event payloads."
      : "SLACK_SIGNING_SECRET is not set. Cannot verify that incoming Slack events originate from Slack.",
    impact: "Without signing secret, webhook and event verification is impossible — security risk for production.",
    fix: signingSecret
      ? undefined
      : "Add SLACK_SIGNING_SECRET in Replit Secrets. Find it at: Slack App dashboard → Basic Information → App Credentials → Signing Secret.",
  });

  checks.push({
    id: "secret-channel-id",
    category: "Secret",
    label: "Default Channel ID (SLACK_CHANNEL_ID)",
    status: channelId ? "pass" : "warning",
    detail: channelId
      ? `SLACK_CHANNEL_ID is present (${channelId.length}-character ID). See Channel Map for role discovery.`
      : "SLACK_CHANNEL_ID is not set. Penny will not have a default delivery channel.",
    impact: "Default channel ID is required for Penny message delivery routing.",
    fix: channelId
      ? undefined
      : "Add SLACK_CHANNEL_ID in Replit Secrets. Right-click a channel in Slack → View channel details → scroll to bottom for the ID (starts with C or G).",
  });

  const pennyChannelId = process.env["SLACK_PENNY_CHANNEL_ID"];
  const adminChannelId = process.env["SLACK_ADMIN_CHANNEL_ID"];

  checks.push({
    id: "secret-penny-channel",
    category: "Secret",
    label: "Penny Channel ID (SLACK_PENNY_CHANNEL_ID)",
    status: pennyChannelId ? "pass" : "warning",
    detail: pennyChannelId
      ? "SLACK_PENNY_CHANNEL_ID is set — the Penny AI channel is explicitly configured."
      : "SLACK_PENNY_CHANNEL_ID is not set. Trail OS will fall back to SLACK_CHANNEL_ID for Penny delivery. Set this to explicitly target the Penny AI channel from the POC.",
    impact: pennyChannelId ? "None." : "Penny delivery will use the default channel. If SLACK_CHANNEL_ID is not the Penny AI channel, delivery routing will be incorrect.",
    fix: pennyChannelId ? undefined : "Add SLACK_PENNY_CHANNEL_ID with the channel ID of the Penny AI Slack channel used in the POC.",
  });

  checks.push({
    id: "secret-admin-channel",
    category: "Secret",
    label: "Admin Channel ID (SLACK_ADMIN_CHANNEL_ID)",
    status: adminChannelId ? "pass" : "warning",
    detail: adminChannelId
      ? "SLACK_ADMIN_CHANNEL_ID is set — the admin/ops channel is explicitly configured."
      : "SLACK_ADMIN_CHANNEL_ID is not set. Admin notifications and ops alerts will have no dedicated channel.",
    impact: adminChannelId ? "None." : "Admin/ops notifications will have no dedicated delivery channel.",
    fix: adminChannelId ? undefined : "Add SLACK_ADMIN_CHANNEL_ID with the channel ID of the admin/ops Slack channel used in the POC.",
  });

  // ── Token format validation ────────────────────────────────────────────────

  if (botToken) {
    const ok = botToken.startsWith("xoxb-");
    checks.push({
      id: "format-bot-token",
      category: "Token Format",
      label: "Bot Token Format (xoxb- prefix)",
      status: ok ? "pass" : "warning",
      detail: ok
        ? 'Bot token has the correct "xoxb-" prefix for a Bot User OAuth Token.'
        : 'Bot token does not start with "xoxb-". This may indicate the wrong token type.',
      impact: ok ? "None." : "Non-standard prefix may cause API authentication failures.",
      fix: ok ? undefined : "Use the Bot User OAuth Token (xoxb-...) from OAuth & Permissions.",
    });
  }

  if (appToken) {
    const ok = appToken.startsWith("xapp-");
    checks.push({
      id: "format-app-token",
      category: "Token Format",
      label: "App Token Format (xapp- prefix)",
      status: ok ? "pass" : "warning",
      detail: ok ? 'App token has the correct "xapp-" prefix.' : 'App token does not start with "xapp-".',
      impact: ok ? "None." : "Wrong token type — xapp- prefix is required for app-level tokens.",
      fix: ok ? undefined : "Use the App-Level Token from Basic Information → App-Level Tokens.",
    });
  }

  if (signingSecret) {
    const ok = /^[a-f0-9]{32}$/.test(signingSecret);
    checks.push({
      id: "format-signing",
      category: "Token Format",
      label: "Signing Secret Format",
      status: ok ? "pass" : "warning",
      detail: ok
        ? "Signing secret matches the expected 32-character lowercase hex format."
        : "Signing secret is present but does not match the typical 32-character hex format.",
      impact: ok ? "None." : "Signing secret format is unexpected — verify it was copied correctly.",
      fix: ok ? undefined : "Copy the Signing Secret exactly from Slack App dashboard → Basic Information.",
    });
  }

  if (channelId) {
    const ok = /^[CG][A-Z0-9]{8,10}$/.test(channelId);
    checks.push({
      id: "format-channel-id",
      category: "Token Format",
      label: "Default Channel ID Format (C.../G...)",
      status: ok ? "pass" : "warning",
      detail: ok
        ? "Default channel ID has the correct format (starts with C or G, uppercase alphanumeric, 9–11 characters)."
        : "Default channel ID does not match expected format.",
      impact: ok ? "None." : "Invalid channel ID format will cause conversations.info and message delivery to fail.",
      fix: ok ? undefined : "Get the channel ID from Slack: right-click channel → View channel details → scroll to bottom.",
    });
  }

  // ── Live Slack API calls ───────────────────────────────────────────────────

  if (!botToken) {
    for (const [id, label] of [
      ["api-auth-test",    "Slack auth.test"],
      ["api-workspace",    "Workspace Metadata"],
      ["api-channel-info", "Default Channel Access"],
      ["api-bot-member",   "Bot Channel Membership"],
      ["api-post-ready",   "Message Post Readiness"],
    ] as [string, string][]) {
      checks.push({ id, category: "API", label, status: "skip", detail: "Skipped — SLACK_BOT_TOKEN is not set.", impact: "Cannot perform live API validation without bot token." });
    }
  } else {
    // auth.test ---------------------------------------------------------------
    let authOk = false;
    let botUserId: string | undefined;

    try {
      const r = await slackGet(botToken, "auth.test");
      authOk = r["ok"] === true;

      if (authOk) {
        botUserId = r["user_id"] as string | undefined;
        checks.push({
          id: "api-auth-test", category: "API Auth", label: "Slack auth.test", status: "pass",
          detail: `Token validated. Bot user: @${r["user"]}, workspace: ${r["team"]} (${r["team_id"]}).`,
          impact: "None — token is valid and the bot is authorised.",
          meta: { botUser: String(r["user"] ?? ""), workspace: String(r["team"] ?? ""), teamId: String(r["team_id"] ?? ""), userId: String(r["user_id"] ?? "") },
        });
      } else {
        const errCode = String(r["error"] ?? "unknown");
        const errMap: Record<string, { detail: string; fix: string }> = {
          invalid_auth:     { detail: "Token was rejected by Slack — invalid or revoked.",      fix: "Regenerate the Bot User OAuth Token in Slack App dashboard → OAuth & Permissions." },
          token_revoked:    { detail: "Token has been explicitly revoked.",                    fix: "Reinstall the Slack App to the workspace to generate a new token." },
          not_authed:       { detail: "No token was recognised by the Slack API.",             fix: "Check SLACK_BOT_TOKEN is set correctly with no extra whitespace." },
          account_inactive: { detail: "The workspace account for this token is inactive.",     fix: "Check workspace status in Slack Admin." },
        };
        const mapped = errMap[errCode];
        checks.push({ id: "api-auth-test", category: "API Auth", label: "Slack auth.test", status: "fail", detail: mapped?.detail ?? `Slack API returned error: ${errCode}.`, impact: "Cannot make any Slack API calls.", fix: mapped?.fix ?? `Error: ${errCode}` });
      }
    } catch {
      req.log.warn("slack auth.test network error");
      checks.push({ id: "api-auth-test", category: "API Auth", label: "Slack auth.test", status: "fail", detail: "Network error — could not reach api.slack.com.", impact: "Slack API is unreachable.", fix: "Check network connectivity." });
    }

    // team.info ---------------------------------------------------------------
    if (authOk) {
      try {
        const r = await slackGet(botToken, "team.info");
        if (r["ok"] === true) {
          const team = r["team"] as Record<string, unknown> | undefined;
          checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "pass", detail: `Workspace: ${team?.["name"]} (${team?.["domain"]}.slack.com).`, impact: "None.", meta: { name: String(team?.["name"] ?? ""), domain: String(team?.["domain"] ?? "") } });
        } else {
          checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "warning", detail: `team.info returned: ${r["error"]}. Token valid but workspace metadata unavailable.`, impact: "Minor.", fix: `Add team:read scope. Error: ${r["error"]}.` });
        }
      } catch {
        checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "warning", detail: "Network error retrieving workspace metadata.", impact: "Minor.", fix: "Check network." });
      }
    } else {
      checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot retrieve workspace info." });
    }

    // conversations.info for SLACK_CHANNEL_ID ---------------------------------
    if (authOk && channelId) {
      const normalizedChannelId = normalizeChannelId(channelId);
      const hadPrefix = normalizedChannelId !== channelId;
      try {
        const r = await slackGet(botToken, "conversations.info", { channel: normalizedChannelId });
        if (r["ok"] === true) {
          const ch = r["channel"] as Record<string, unknown>;
          const note = hadPrefix ? ` (workspace prefix stripped from "${channelId}")` : "";
          checks.push({ id: "api-channel-info", category: "Channel", label: "Default Channel Access", status: "pass", detail: `Channel found: #${ch["name"]} (${ch["is_private"] ? "private" : "public"}). ${ch["num_members"] ?? "?"} members.${note}`, impact: "None.", meta: { channelName: String(ch["name"] ?? ""), isPrivate: Boolean(ch["is_private"]), members: Number(ch["num_members"] ?? 0) } });
          const isMember = ch["is_member"] === true;
          checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: isMember ? "pass" : "warning", detail: isMember ? `Bot${botUserId ? ` (${botUserId})` : ""} is confirmed as a member of #${ch["name"]}.` : `Bot is NOT a member of #${ch["name"]}.`, impact: isMember ? "None." : "Bot cannot read history or access private channels without membership.", fix: isMember ? undefined : `Invite the bot: /invite @trail-os-bot in #${ch["name"]}.` });
        } else {
          const errCode = String(r["error"] ?? "unknown");
          const errMap: Record<string, { detail: string; fix: string; status?: CheckStatus }> = {
            channel_not_found: { detail: hadPrefix ? `Channel ID "${normalizedChannelId}" (stripped from "${channelId}") not found. The stripped ID may still be wrong.` : `Channel ID "${channelId}" not found. Check if this is the Penny AI channel ID from the POC.`, fix: "Verify SLACK_CHANNEL_ID. Set SLACK_PENNY_CHANNEL_ID explicitly if this is the Penny AI channel." },
            not_in_channel:    { detail: "Bot is not a member of this private channel.",      fix: "Invite the bot: /invite @trail-os-bot." },
            is_archived:       { detail: "The channel has been archived.",                    fix: "Choose an active channel." },
            missing_scope:     { detail: "Bot token missing channels:read / groups:read scope. Token is valid — add the scope in Slack App → OAuth & Permissions and reinstall.", fix: "In Slack App dashboard → OAuth & Permissions → Scopes → Bot Token Scopes: add channels:read (public) and groups:read (private). Then reinstall the app to the workspace.", status: "warning" },
          };
          const mapped = errMap[errCode];
          const status: CheckStatus = (mapped?.status as CheckStatus) ?? "fail";
          checks.push({ id: "api-channel-info", category: "Channel", label: "Default Channel Access", status, detail: mapped?.detail ?? `conversations.info returned: ${errCode}.`, impact: status === "warning" ? "Channel metadata unavailable until scope is added — bot can still post if chat:write is present." : "Penny cannot post to the default channel.", fix: mapped?.fix ?? `Error: ${errCode}.` });
          if (errCode === "missing_scope") {
            checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "warning", detail: "Cannot verify membership — missing channels:read / groups:read scope. See Default Channel Access fix.", impact: "Minor — add scope to resolve.", fix: "Add channels:read and groups:read scopes in Slack App → OAuth & Permissions, then reinstall." });
          } else {
            checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — channel access check failed.", impact: "Cannot verify bot membership." });
          }
        }
      } catch {
        checks.push({ id: "api-channel-info", category: "Channel", label: "Default Channel Access", status: "fail", detail: "Network error checking channel.", impact: "Cannot verify channel.", fix: "Check network." });
        checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped.", impact: "Unknown." });
      }
    } else if (!channelId) {
      checks.push({ id: "api-channel-info", category: "Channel", label: "Default Channel Access", status: "skip", detail: "Skipped — SLACK_CHANNEL_ID not set.", impact: "No default channel." });
      checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — no channel ID.", impact: "Cannot check membership." });
    } else {
      checks.push({ id: "api-channel-info", category: "Channel", label: "Default Channel Access", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot check channel." });
      checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot check membership." });
    }

    // post permission readiness -----------------------------------------------
    checks.push({
      id: "api-post-ready", category: "Post Permission", label: "Message Post Readiness",
      status: authOk ? "pass" : "skip",
      detail: authOk ? "Bot token is valid. Use Send Test Message to confirm chat:write permission." : "Skipped — auth.test failed.",
      impact: authOk ? "If chat:write is missing, all Penny posting will fail at runtime." : "Cannot verify post permission.",
      fix: authOk ? undefined : "Ensure chat:write scope is in the app manifest and the app is reinstalled.",
    });

    // ── Multi-channel discovery (channels array) ──────────────────────────────

    if (authOk) {
      const channelTargets: { envVar: string; explicitRole?: "penny" | "admin" }[] = [
        { envVar: "SLACK_CHANNEL_ID" },
        { envVar: "SLACK_PENNY_CHANNEL_ID", explicitRole: "penny" },
        { envVar: "SLACK_ADMIN_CHANNEL_ID", explicitRole: "admin" },
      ];

      // Deduplicate by normalized channel ID to avoid calling the same channel twice
      const seen = new Set<string>();

      for (const target of channelTargets) {
        const rawId = process.env[target.envVar];
        if (!rawId) continue;
        const normId = normalizeChannelId(rawId);
        if (seen.has(normId)) continue;
        seen.add(normId);

        try {
          const r = await slackGet(botToken, "conversations.info", { channel: normId });
          if (r["ok"] === true) {
            const ch = r["channel"] as Record<string, unknown>;
            const name = String(ch["name"] ?? "");
            const resolvedRole = target.explicitRole ?? detectChannelRole(name);
            const isMember = ch["is_member"] === true;
            channels.push({
              envVar: target.envVar, channelId: rawId, normalizedId: normId, resolvedRole,
              status: "pass", name,
              isPrivate: Boolean(ch["is_private"]),
              isMember,
              memberCount: Number(ch["num_members"] ?? 0),
              fix: isMember ? undefined : `Run /invite @penny in #${name} to add the bot.`,
            });
          } else {
            const errCode = String(r["error"] ?? "unknown");
            const isScopeIssue = errCode === "missing_scope";
            const fixMap: Record<string, string> = {
              missing_scope:     "Add channels:read (public) and groups:read (private) scopes in Slack App → OAuth & Permissions → Bot Token Scopes, then reinstall the app to the workspace.",
              channel_not_found: "Verify the channel ID in Replit Secrets. Right-click the channel in Slack → View channel details → copy the ID at the bottom.",
              not_in_channel:    "Invite the bot to this channel: run /invite @penny inside the channel.",
              is_archived:       "Un-archive the channel or use a different active channel.",
            };
            channels.push({
              envVar: target.envVar, channelId: rawId, normalizedId: normId,
              resolvedRole: target.explicitRole ?? "unknown",
              status: isScopeIssue ? "warning" : "fail",
              error: errCode,
              scopeIssue: isScopeIssue,
              fix: fixMap[errCode] ?? `Slack error: ${errCode}.`,
            });
          }
        } catch {
          channels.push({ envVar: target.envVar, channelId: rawId, normalizedId: normId, resolvedRole: target.explicitRole ?? "unknown", status: "fail", error: "network_error", fix: "Check network connectivity." });
        }
      }
    }
  }

  res.json({ checks, channels, timestamp: new Date().toISOString() });
});

// ─── POST /slack/validate/test-message ───────────────────────────────────────
// Body: { target?: "penny" | "admin" | "default" }
// Resolves the channel ID from env based on target, normalises it, then posts.

router.post("/slack/validate/test-message", async (req, res) => {
  const botToken = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  if (!botToken) {
    res.status(400).json({ ok: false, error: "no_token", detail: "SLACK_BOT_TOKEN is not set." });
    return;
  }

  const target = (req.body as { target?: string })?.target ?? "penny";

  let rawChannelId: string | undefined;
  let targetLabel: string;
  if (target === "admin") {
    rawChannelId = process.env["SLACK_ADMIN_CHANNEL_ID"];
    targetLabel  = "Admin Channel";
  } else if (target === "default") {
    rawChannelId = process.env["SLACK_CHANNEL_ID"];
    targetLabel  = "Default Channel";
  } else {
    rawChannelId = process.env["SLACK_PENNY_CHANNEL_ID"] ?? process.env["SLACK_CHANNEL_ID"];
    targetLabel  = "Penny AI Channel";
  }

  if (!rawChannelId) {
    const envVar = target === "admin" ? "SLACK_ADMIN_CHANNEL_ID" : target === "default" ? "SLACK_CHANNEL_ID" : "SLACK_PENNY_CHANNEL_ID";
    res.status(400).json({ ok: false, error: "no_channel", detail: `${envVar} is not set. Configure this secret first.` });
    return;
  }

  const channelId = normalizeChannelId(rawChannelId);

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: channelId,
        text: `🤖 *Trail OS — Slack Integration Validation Test* (${new Date().toISOString()})\nSent to: *${targetLabel}*. This is a test message from the Trail OS Slack Integration Center. You can safely delete this message.`,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const result = (await response.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };

    if (result.ok) {
      res.json({ ok: true, messageTs: result.ts, channel: result.channel, targetLabel });
      return;
    }

    const errMap: Record<string, string> = {
      not_in_channel:    `Bot is not a member of the ${targetLabel}. Run /invite @penny in that channel.`,
      channel_not_found: "Channel ID is invalid or was not found in this workspace.",
      missing_scope:     "Bot token is missing chat:write scope. Add it in Slack App → OAuth & Permissions and reinstall.",
      invalid_auth:      "Bot token is invalid or revoked.",
      is_archived:       "Channel is archived — choose an active channel.",
      rate_limited:      "Rate limited — wait a moment and try again.",
    };

    res.status(400).json({ ok: false, error: result.error ?? "unknown", detail: errMap[result.error ?? ""] ?? `Slack error: ${result.error}` });
  } catch {
    req.log.error("slack test-message network error");
    res.status(500).json({ ok: false, error: "network_error", detail: "Could not reach Slack API." });
  }
});

// ─── Slack Events Adapter — Penny inbound handler ─────────────────────────────

// ── Event payload types ──────────────────────────────────────────────────────

interface SlackUrlVerification {
  type: 'url_verification';
  challenge: string;
}

interface SlackAppMentionEvent {
  type: 'app_mention';
  user: string;
  text: string;
  ts: string;
  channel: string;
  event_ts: string;
}

interface SlackEventCallback {
  type: 'event_callback';
  event: SlackAppMentionEvent;
  event_id: string;
  event_time: number;
}

type SlackPayload = SlackUrlVerification | SlackEventCallback | { type: string };

// ── Penny system prompt (Slack-tuned) ────────────────────────────────────────

const SLACK_PENNY_SYSTEM = `You are Penny, AI Chief of Staff for Transition Trails Academy — a career development and professional transitions training organisation.

You are responding inside the team's Slack workspace, so keep answers concise and readable:
- 2–4 sentences for simple questions; use bullet points for lists or multi-part answers.
- Use the team's language: programs, cohorts, trail quests, learners, capstones, blueprints, RESOLVE phases.
- If live data is needed, direct the user to the Trail OS platform rather than guessing.
- Never fabricate data or invent statistics. If uncertain, say so honestly.
- Do NOT include markdown route paths like "→ /admin/integrations" — users are in Slack, not the app.`;

// ── Gemini call (no SF context for MVP — falls back to base prompt) ──────────

async function callGeminiForSlack(query: string): Promise<string> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return 'Penny is not configured (GEMINI_API_KEY missing). Contact your admin.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SLACK_PENNY_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!resp.ok) {
      return `Penny hit an error (HTTP ${resp.status}). Try again in a moment.`;
    }

    const body = await resp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return body.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      ?? 'Penny returned an empty response. Try rephrasing your question.';
  } catch {
    return 'Penny timed out. Try a shorter question or check again in a moment.';
  }
}

// ── Post a threaded reply to Slack ───────────────────────────────────────────

async function postSlackReply(
  botToken: string,
  channel: string,
  text: string,
  threadTs: string,
): Promise<void> {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });
}

// ─── POST /slack/events ───────────────────────────────────────────────────────
// Receives Slack Events API webhooks (app_mention).
// Signature verification uses the raw request body — requires the rawBody
// property set by the express.json verify callback in app.ts.

router.post('/slack/events', async (req, res) => {
  const signingSecret = process.env['SLACK_SIGNING_SECRET'];
  const slackSig      = req.headers['x-slack-signature'] as string | undefined;
  const slackTs       = req.headers['x-slack-request-timestamp'] as string | undefined;
  const rawBody       = (req as typeof req & { rawBody?: Buffer }).rawBody;

  // ── Config guard ───────────────────────────────────────────────────────────
  if (!signingSecret) {
    req.log.warn('Slack events: SLACK_SIGNING_SECRET not configured');
    res.status(500).json({ error: 'adapter_not_configured' });
    return;
  }

  // ── Header guard ──────────────────────────────────────────────────────────
  if (!slackSig || !slackTs || !rawBody) {
    res.status(400).json({ error: 'missing_signature_headers' });
    return;
  }

  // ── Replay attack guard (5-minute window) ─────────────────────────────────
  const tsNum = parseInt(slackTs, 10);
  if (Number.isNaN(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    res.status(400).json({ error: 'timestamp_expired' });
    return;
  }

  // ── HMAC-SHA256 signature verification ────────────────────────────────────
  const sigBase  = `v0:${slackTs}:${rawBody.toString()}`;
  const computed = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex');
  let sigValid = false;
  try {
    // timingSafeEqual requires equal-length buffers — pad/truncate risk: compare UTF-8 bytes
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(slackSig, 'utf8');
    sigValid = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    sigValid = false;
  }
  if (!sigValid) {
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: SlackPayload;
  try {
    payload = JSON.parse(rawBody.toString()) as SlackPayload;
  } catch {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  // ── url_verification challenge (Slack sends this when you first configure the URL) ──
  if (payload.type === 'url_verification') {
    res.json({ challenge: (payload as SlackUrlVerification).challenge });
    return;
  }

  // ── Acknowledge immediately — Slack requires a 200 within 3 seconds ───────
  res.status(200).send();

  // ── Process app_mention in the background ─────────────────────────────────
  if (payload.type !== 'event_callback') return;

  const ep = payload as SlackEventCallback;
  if (ep.event?.type !== 'app_mention') return;

  const { text, channel, ts: threadTs, user } = ep.event;

  // Strip the @bot mention tag from the query text
  const query = text.replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!query) return;

  const botToken = process.env['SLACK_BOT_TOKEN'] ?? process.env['SLACK_BOT_USER_OAUTH_TOKEN'];
  if (!botToken) {
    req.log.warn('Slack events: SLACK_BOT_TOKEN not set — cannot reply');
    return;
  }

  req.log.info({ channel, user, queryPreview: query.slice(0, 80) }, 'Slack app_mention → Penny');

  callGeminiForSlack(query)
    .then(reply => postSlackReply(botToken, channel, reply, threadTs))
    .then(() => req.log.info({ channel, threadTs }, 'Penny reply posted to Slack'))
    .catch((err: unknown) => req.log.error({ err }, 'Slack adapter: Penny dispatch failed'));
});

// ─── GET /slack/alert-settings ───────────────────────────────────────────────
// Returns the current alert threshold and window, falling back to env/defaults.

router.get("/slack/alert-settings", async (req, res) => {
  const envThreshold = (() => {
    const raw = process.env["ERROR_ALERT_THRESHOLD"];
    if (!raw) return 10;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  })();

  const defaultPayload = {
    threshold:     envThreshold,
    windowMinutes: 15,
    updatedBy:     null as string | null,
    updatedAt:     null as string | null,
    source:        "default" as const,
    envFallback:   envThreshold,
  };

  try {
    const rows = await db
      .select()
      .from(alertSettingsTable)
      .where(eq(alertSettingsTable.id, "default"))
      .limit(1);

    if (rows.length > 0 && rows[0]) {
      res.json({
        threshold:     rows[0].threshold,
        windowMinutes: rows[0].windowMinutes,
        updatedBy:     rows[0].updatedBy ?? null,
        updatedAt:     rows[0].updatedAt?.toISOString() ?? null,
        source:        "db",
        envFallback:   envThreshold,
      });
      return;
    }

    res.json(defaultPayload);
  } catch (err) {
    req.log.warn({ err }, "alert-settings GET: DB error");
    res.json(defaultPayload);
  }
});

// ─── PATCH /slack/alert-settings ─────────────────────────────────────────────
// Body: { threshold?: number; windowMinutes?: number }
// Upserts the singleton alert_settings row.  Changes take effect on the next
// errorAlertJob polling cycle (≤60 s) without a server restart.
// Requires admin-group membership (requireAdmin).

router.patch("/slack/alert-settings", requireAdmin, async (req, res) => {
  const body = req.body as { threshold?: unknown; windowMinutes?: unknown };

  const threshold     = typeof body.threshold     === "number" ? Math.round(body.threshold)     : null;
  const windowMinutes = typeof body.windowMinutes === "number" ? Math.round(body.windowMinutes) : null;

  if (threshold !== null && (threshold < 1 || threshold > 10_000)) {
    res.status(400).json({ ok: false, error: "threshold must be between 1 and 10 000" });
    return;
  }
  if (windowMinutes !== null && (windowMinutes < 1 || windowMinutes > 1440)) {
    res.status(400).json({ ok: false, error: "windowMinutes must be between 1 and 1440" });
    return;
  }
  if (threshold === null && windowMinutes === null) {
    res.status(400).json({ ok: false, error: "provide threshold and/or windowMinutes" });
    return;
  }

  const updatedBy = req.session.googleEmail ?? null;

  try {
    // Read current values so we can merge the patch.
    const existing = await db
      .select()
      .from(alertSettingsTable)
      .where(eq(alertSettingsTable.id, "default"))
      .limit(1);

    const current = existing[0] ?? { threshold: 10, windowMinutes: 15 };

    const newThreshold     = threshold     ?? current.threshold;
    const newWindowMinutes = windowMinutes ?? current.windowMinutes;

    await db
      .insert(alertSettingsTable)
      .values({
        id:            "default",
        threshold:     newThreshold,
        windowMinutes: newWindowMinutes,
        updatedBy,
        updatedAt:     new Date(),
      })
      .onConflictDoUpdate({
        target: alertSettingsTable.id,
        set: {
          threshold:     newThreshold,
          windowMinutes: newWindowMinutes,
          updatedBy,
          updatedAt:     new Date(),
        },
      });

    res.json({ ok: true, threshold: newThreshold, windowMinutes: newWindowMinutes });
  } catch (err) {
    req.log.error({ err }, "alert-settings PATCH: DB error");
    res.status(500).json({ ok: false, error: "db_error" });
  }
});

// ─── POST /slack/notify-reviewer ─────────────────────────────────────────────
// Body: { submitterEmail: string; action: "Approved" | "Revision requested"; templateName: string }
// Resolves the submitter's email to a Slack user ID, opens a DM, and sends a
// notification. Falls back to a channel mention in the Penny channel if the DM
// lookup fails. Fails silently (returns ok: true) in all error cases so the
// approver's workflow is never blocked.

router.post('/slack/notify-reviewer', async (req, res) => {
  const botToken = process.env['SLACK_BOT_TOKEN'] ?? process.env['SLACK_BOT_USER_OAUTH_TOKEN'];

  // Always return 200 so the client never shows an error to the approver
  if (!botToken) {
    req.log.warn('notify-reviewer: SLACK_BOT_TOKEN not set — skipping DM');
    res.json({ ok: true, skipped: true, reason: 'no_token' });
    return;
  }

  const { submitterEmail, action, templateName } = req.body as {
    submitterEmail?: string;
    action?: string;
    templateName?: string;
  };

  if (!submitterEmail || !action) {
    res.json({ ok: true, skipped: true, reason: 'missing_params' });
    return;
  }

  const name = templateName ?? 'a prompt template';
  const emoji = action === 'Approved' ? '✅' : '🔄';
  const messageText = `${emoji} *${action}* — your prompt template *${name}* has been reviewed. Check the Prompt Studio in Trail OS for details.`;

  // ── Step 1: look up submitter's Slack user by email ──────────────────────

  let userId: string | null = null;

  try {
    const lookupUrl = new URL('https://slack.com/api/users.lookupByEmail');
    lookupUrl.searchParams.set('email', submitterEmail);
    const lookupRes = await fetch(lookupUrl.toString(), {
      headers: { Authorization: `Bearer ${botToken}` },
    });
    const lookupData = await lookupRes.json() as { ok: boolean; user?: { id: string } };
    if (lookupData.ok && lookupData.user?.id) {
      userId = lookupData.user.id;
    }
  } catch {
    req.log.warn({ submitterEmail }, 'notify-reviewer: users.lookupByEmail network error');
  }

  // ── Step 2a: DM the user if we found them ─────────────────────────────────

  if (userId) {
    try {
      // Open a DM channel with the user
      const openRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: userId }),
      });
      const openData = await openRes.json() as { ok: boolean; channel?: { id: string } };

      if (openData.ok && openData.channel?.id) {
        const dmChannelId = openData.channel.id;
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: dmChannelId,
            text: messageText,
            unfurl_links: false,
            unfurl_media: false,
          }),
        });
        req.log.info({ submitterEmail, action, templateName }, 'notify-reviewer: DM sent');
        res.json({ ok: true, method: 'dm' });
        return;
      }
    } catch {
      req.log.warn({ userId }, 'notify-reviewer: DM send failed — falling back to channel mention');
    }
  }

  // ── Step 2b: Fallback — mention in Penny channel ──────────────────────────

  const pennyChannelRaw = process.env['SLACK_PENNY_CHANNEL_ID'] ?? process.env['SLACK_CHANNEL_ID'];
  if (!pennyChannelRaw) {
    req.log.warn('notify-reviewer: no channel configured for fallback mention');
    res.json({ ok: true, skipped: true, reason: 'no_channel_for_fallback' });
    return;
  }

  const fallbackChannel = normalizeChannelId(pennyChannelRaw);
  // Build mention text: use <@userId> if we have it, otherwise just the email
  const mentionPart = userId ? `<@${userId}>` : submitterEmail;
  const fallbackText = `${emoji} ${mentionPart} — *${action}* — your prompt template *${name}* has been reviewed. Check the Prompt Studio in Trail OS for details.`;

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: fallbackChannel,
        text: fallbackText,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });
    req.log.info({ submitterEmail, action, templateName, fallbackChannel }, 'notify-reviewer: channel mention sent');
    res.json({ ok: true, method: 'channel_mention' });
  } catch {
    req.log.warn('notify-reviewer: fallback channel post failed — swallowed silently');
    res.json({ ok: true, skipped: true, reason: 'post_failed' });
  }
});

export default router;
