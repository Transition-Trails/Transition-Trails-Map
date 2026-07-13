import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/slack/notify", async (req, res) => {
  const { objectType, fields, submittedBy } = req.body as {
    objectType?:  string;
    fields?:      Record<string, string>;
    submittedBy?: string;
  };

  const botToken = process.env["SLACK_BOT_TOKEN"];
  if (!botToken) {
    logger.warn("SLACK_BOT_TOKEN not set — skipping Slack notification");
    res.json({ success: true, skipped: true });
    return;
  }

  const channelId = process.env["SLACK_ADMIN_CHANNEL_ID"];
  if (!channelId) {
    logger.warn("SLACK_ADMIN_CHANNEL_ID not set — skipping Slack notification");
    res.json({ success: true, skipped: true });
    return;
  }

  const name        = fields?.["name"]        ?? "(unnamed)";
  const domain      = fields?.["domain"]      || "—";
  const description = fields?.["description"] ?? fields?.["purpose"] ?? "—";
  const type        = objectType ?? "Item";
  const byLine      = submittedBy ? ` · Submitted by ${submittedBy}` : "";

  const body = {
    channel: channelId,
    text:    `:new: *New ${type} Request from Trail OS*`,
    blocks:  [
      {
        type: "header",
        text: { type: "plain_text", text: `New ${type} Request`, emoji: true },
      },
      {
        type:   "section",
        fields: [
          { type: "mrkdwn", text: `*Name:*\n${name}`   },
          { type: "mrkdwn", text: `*Domain:*\n${domain}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Description/Purpose:*\n${description}` },
      },
      {
        type:     "context",
        elements: [
          { type: "mrkdwn", text: `Submitted from Trail OS Penny Admin${byLine} · Pending review · Not yet live` },
        ],
      },
    ],
  };

  try {
    const resp = await fetch("https://slack.com/api/chat.postMessage", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await resp.json() as { ok: boolean; error?: string };
    if (!json.ok) {
      logger.warn({ slackError: json.error }, "Slack chat.postMessage returned ok:false");
    }
    res.json({ success: true });
  } catch (err) {
    logger.warn({ err }, "Slack chat.postMessage call failed");
    res.json({ success: true });
  }
});

export default router;
