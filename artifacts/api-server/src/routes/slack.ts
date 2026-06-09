import { Router } from "express";

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

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── GET /slack/validate ──────────────────────────────────────────────────────

router.get("/slack/validate", async (req, res) => {
  const checks: CheckResult[] = [];

  const botToken     = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  const appToken     = process.env["SLACK_APP_TOKEN"];
  const signingSecret = process.env["SLACK_SIGNING_SECRET"];
  const channelId    = process.env["SLACK_CHANNEL_ID"];

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
      ? `SLACK_CHANNEL_ID is present (${channelId.length}-character ID).`
      : "SLACK_CHANNEL_ID is not set. Penny will not have a default delivery channel.",
    impact: "Default channel ID is required for Penny message delivery routing.",
    fix: channelId
      ? undefined
      : "Add SLACK_CHANNEL_ID in Replit Secrets. Right-click a channel in Slack → View channel details → scroll to bottom for the ID (starts with C or G).",
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
      fix: ok
        ? undefined
        : "Use the Bot User OAuth Token (xoxb-...) from OAuth & Permissions — not a user token or legacy token.",
    });
  }

  if (appToken) {
    const ok = appToken.startsWith("xapp-");
    checks.push({
      id: "format-app-token",
      category: "Token Format",
      label: "App Token Format (xapp- prefix)",
      status: ok ? "pass" : "warning",
      detail: ok
        ? 'App token has the correct "xapp-" prefix.'
        : 'App token does not start with "xapp-".',
      impact: ok ? "None." : "Wrong token type — xapp- prefix is required for app-level tokens.",
      fix: ok
        ? undefined
        : "Use the App-Level Token from Basic Information → App-Level Tokens in the Slack App dashboard.",
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
      fix: ok
        ? undefined
        : "Copy the Signing Secret exactly from Slack App dashboard → Basic Information → App Credentials.",
    });
  }

  if (channelId) {
    const ok = /^[CG][A-Z0-9]{8,10}$/.test(channelId);
    checks.push({
      id: "format-channel-id",
      category: "Token Format",
      label: "Channel ID Format (C.../G...)",
      status: ok ? "pass" : "warning",
      detail: ok
        ? "Channel ID has the correct format (starts with C or G, uppercase alphanumeric, 9–11 characters)."
        : "Channel ID does not match expected format and may not be a valid Slack channel ID.",
      impact: ok ? "None." : "Invalid channel ID format will cause conversations.info and message delivery to fail.",
      fix: ok
        ? undefined
        : "Get the channel ID from Slack: right-click channel → View channel details → scroll to bottom.",
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
      checks.push({
        id,
        category: "API",
        label,
        status: "skip",
        detail: "Skipped — SLACK_BOT_TOKEN is not set.",
        impact: "Cannot perform live API validation without bot token.",
      });
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
          id: "api-auth-test",
          category: "API Auth",
          label: "Slack auth.test",
          status: "pass",
          detail: `Token validated. Bot user: @${r["user"]}, workspace: ${r["team"]} (${r["team_id"]}).`,
          impact: "None — token is valid and the bot is authorised.",
          meta: {
            botUser:   String(r["user"]    ?? ""),
            workspace: String(r["team"]    ?? ""),
            teamId:    String(r["team_id"] ?? ""),
            userId:    String(r["user_id"] ?? ""),
          },
        });
      } else {
        const errCode = String(r["error"] ?? "unknown");
        const errMap: Record<string, { detail: string; fix: string }> = {
          invalid_auth:     { detail: "Token was rejected by Slack — it is invalid or has been revoked.",  fix: "Regenerate the Bot User OAuth Token in Slack App dashboard → OAuth & Permissions, and update SLACK_BOT_TOKEN." },
          token_revoked:    { detail: "Token has been explicitly revoked.",                                fix: "Reinstall the Slack App to the workspace to generate a new token." },
          not_authed:       { detail: "No token was recognised by the Slack API.",                        fix: "Check SLACK_BOT_TOKEN is set correctly with no extra whitespace." },
          account_inactive: { detail: "The workspace account associated with this token is inactive.",    fix: "Check workspace status in Slack Admin." },
        };
        const mapped = errMap[errCode];
        checks.push({
          id: "api-auth-test",
          category: "API Auth",
          label: "Slack auth.test",
          status: "fail",
          detail: mapped?.detail ?? `Slack API returned error: ${errCode}.`,
          impact: "Cannot make any Slack API calls. All channel and message operations will fail.",
          fix: mapped?.fix ?? `Slack error code: ${errCode}. Refer to api.slack.com/methods/auth.test.`,
        });
      }
    } catch {
      req.log.warn("slack auth.test network error");
      checks.push({
        id: "api-auth-test",
        category: "API Auth",
        label: "Slack auth.test",
        status: "fail",
        detail: "Network error — could not reach api.slack.com.",
        impact: "Slack API is unreachable from this environment.",
        fix: "Check network connectivity. Outbound requests to api.slack.com may be restricted.",
      });
    }

    // team.info (workspace metadata) -----------------------------------------
    if (authOk) {
      try {
        const r = await slackGet(botToken, "team.info");
        if (r["ok"] === true) {
          const team = r["team"] as Record<string, unknown> | undefined;
          checks.push({
            id: "api-workspace",
            category: "Workspace",
            label: "Workspace Metadata",
            status: "pass",
            detail: `Workspace: ${team?.["name"]} (${team?.["domain"]}.slack.com).`,
            impact: "None — workspace metadata retrieved successfully.",
            meta: {
              name:   String(team?.["name"]   ?? ""),
              domain: String(team?.["domain"] ?? ""),
            },
          });
        } else {
          checks.push({
            id: "api-workspace",
            category: "Workspace",
            label: "Workspace Metadata",
            status: "warning",
            detail: `team.info returned error: ${r["error"]}. Token is valid but workspace metadata is unavailable.`,
            impact: "Minor — workspace display info will be unavailable.",
            fix: `Ensure the bot has team:read scope. Slack error: ${r["error"]}.`,
          });
        }
      } catch {
        checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "warning", detail: "Network error retrieving workspace metadata.", impact: "Minor.", fix: "Check network connectivity." });
      }
    } else {
      checks.push({ id: "api-workspace", category: "Workspace", label: "Workspace Metadata", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot retrieve workspace info without valid token." });
    }

    // conversations.info (channel + bot membership) --------------------------
    if (authOk && channelId) {
      try {
        const r = await slackGet(botToken, "conversations.info", { channel: channelId });
        if (r["ok"] === true) {
          const ch = r["channel"] as Record<string, unknown>;
          checks.push({
            id: "api-channel-info",
            category: "Channel",
            label: "Default Channel Access",
            status: "pass",
            detail: `Channel found: #${ch["name"]} (${ch["is_private"] ? "private" : "public"}). ${ch["num_members"] ?? "?"} members.`,
            impact: "None — channel is accessible.",
            meta: {
              channelName: String(ch["name"]        ?? ""),
              isPrivate:   Boolean(ch["is_private"]),
              members:     Number(ch["num_members"] ?? 0),
            },
          });

          const isMember = ch["is_member"] === true;
          checks.push({
            id: "api-bot-member",
            category: "Bot Membership",
            label: "Bot in Default Channel",
            status: isMember ? "pass" : "warning",
            detail: isMember
              ? `Bot${botUserId ? ` (${botUserId})` : ""} is confirmed as a member of #${ch["name"]}.`
              : `Bot is NOT a member of #${ch["name"]}. Posting to public channels may still work, but private channel access and history reads will fail.`,
            impact: isMember ? "None." : "Bot cannot read message history or access private channels without explicit membership.",
            fix: isMember ? undefined : `Invite the bot to the channel in Slack: type /invite @trail-os-bot in #${ch["name"]}.`,
          });
        } else {
          const errCode = String(r["error"] ?? "unknown");
          const errMap: Record<string, { detail: string; fix: string }> = {
            channel_not_found: { detail: `Channel ID "${channelId}" was not found. It may be invalid or belong to a different workspace.`, fix: "Verify SLACK_CHANNEL_ID. Get the ID from Slack channel settings." },
            not_in_channel:    { detail: "Bot is not a member of this private channel.",                                                   fix: "Invite the bot to the channel using /invite @trail-os-bot." },
            is_archived:       { detail: "The channel has been archived.",                                                                  fix: "Choose a different active channel for SLACK_CHANNEL_ID." },
            missing_scope:     { detail: "Bot token is missing channels:read (or groups:read for private channels) scope.",                 fix: "Add channels:read scope to the Slack App manifest and reinstall the app." },
          };
          const mapped = errMap[errCode];
          checks.push({
            id: "api-channel-info",
            category: "Channel",
            label: "Default Channel Access",
            status: "fail",
            detail: mapped?.detail ?? `conversations.info returned: ${errCode}.`,
            impact: "Penny cannot post to the default channel.",
            fix: mapped?.fix ?? `Slack error: ${errCode}.`,
          });
          checks.push({ id: "api-bot-member", category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — channel access check failed.", impact: "Cannot verify bot membership." });
        }
      } catch {
        checks.push({ id: "api-channel-info", category: "Channel",       label: "Default Channel Access",   status: "fail",   detail: "Network error checking channel.",   impact: "Cannot verify channel access.", fix: "Check network." });
        checks.push({ id: "api-bot-member",   category: "Bot Membership", label: "Bot in Default Channel",   status: "skip",   detail: "Skipped — channel check failed.",   impact: "Unknown." });
      }
    } else if (!channelId) {
      checks.push({ id: "api-channel-info", category: "Channel",       label: "Default Channel Access", status: "skip", detail: "Skipped — SLACK_CHANNEL_ID not set.", impact: "No default channel to validate." });
      checks.push({ id: "api-bot-member",   category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — no channel ID.",             impact: "Cannot check membership without channel ID." });
    } else {
      checks.push({ id: "api-channel-info", category: "Channel",       label: "Default Channel Access", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot check channel without valid token." });
      checks.push({ id: "api-bot-member",   category: "Bot Membership", label: "Bot in Default Channel", status: "skip", detail: "Skipped — auth.test failed.", impact: "Cannot check membership without valid token." });
    }

    // post permission readiness ----------------------------------------------
    checks.push({
      id: "api-post-ready",
      category: "Post Permission",
      label: "Message Post Readiness",
      status: authOk ? "pass" : "skip",
      detail: authOk
        ? "Bot token is valid. Use the Send Test Message button to confirm chat:write permission by sending a labelled test message to the default channel."
        : "Skipped — auth.test failed.",
      impact: authOk
        ? "If chat:write scope is missing, all Penny message posting will fail at runtime."
        : "Cannot verify post permission without valid token.",
      fix: authOk ? undefined : "Ensure chat:write scope is in the app manifest and the app is reinstalled to the workspace.",
    });
  }

  res.json({ checks, timestamp: new Date().toISOString() });
});

// ─── POST /slack/validate/test-message ───────────────────────────────────────

router.post("/slack/validate/test-message", async (req, res) => {
  const botToken  = process.env["SLACK_BOT_TOKEN"] ?? process.env["SLACK_BOT_USER_OAUTH_TOKEN"];
  const channelId = process.env["SLACK_CHANNEL_ID"];

  if (!botToken || !channelId) {
    res.status(400).json({ ok: false, error: "SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must both be set to send a test message." });
    return;
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `🤖 *Trail OS — Slack Integration Validation Test* (${new Date().toISOString()})\nThis is a test message sent from the Trail OS Slack Integration Center. You can safely delete this message.`,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const result = (await response.json()) as {
      ok: boolean;
      error?: string;
      ts?: string;
      channel?: string;
    };

    if (result.ok) {
      res.json({ ok: true, messageTs: result.ts, channel: result.channel });
      return;
    }

    const errMap: Record<string, string> = {
      not_in_channel:    "Bot is not a member of the channel. Invite the bot with /invite @trail-os-bot.",
      channel_not_found: "Channel ID is invalid or does not exist in this workspace.",
      missing_scope:     "Bot token is missing the chat:write scope. Add it in the Slack App manifest and reinstall.",
      invalid_auth:      "Bot token is invalid or revoked.",
      is_archived:       "Channel is archived.",
      rate_limited:      "Rate limited — try again in a moment.",
    };

    res.status(400).json({
      ok: false,
      error: result.error ?? "unknown",
      detail: errMap[result.error ?? ""] ?? `Slack error: ${result.error}`,
    });
  } catch {
    req.log.error("slack test-message network error");
    res.status(500).json({ ok: false, error: "network_error", detail: "Could not reach Slack API." });
  }
});

export default router;
