import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/slack/notify", async (req, res) => {
  const { objectType, fields, submittedBy } = req.body as {
    objectType?: string;
    fields?:     Record<string, string>;
    submittedBy?: string;
  };

  const webhookUrl = process.env["SLACK_WEBHOOK_URL"];
  if (!webhookUrl) {
    logger.warn("SLACK_WEBHOOK_URL not set — skipping Slack notification");
    res.json({ success: true, skipped: true });
    return;
  }

  const name        = fields?.["name"]    ?? "(unnamed)";
  const domain      = fields?.["domain"]  ?? "";
  const description = fields?.["description"] ?? fields?.["purpose"] ?? "";
  const type        = objectType ?? "Item";
  const by          = submittedBy ? `\n*Submitted by:* ${submittedBy}` : "";

  const lines: string[] = [
    `:new: *New ${type} Request*`,
    `Submitted from Trail OS${by}`,
    "",
    `*Name:* ${name}`,
  ];
  if (domain)      lines.push(`*Domain:* ${domain}`);
  if (description) lines.push(`*Description/Purpose:* ${description}`);
  lines.push("", `_Review and add to the codebase when ready._`);

  const text = lines.join("\n");

  try {
    const resp = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text }),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Slack webhook returned non-OK status");
    }
    res.json({ success: true });
  } catch (err) {
    logger.warn({ err }, "Slack webhook call failed");
    res.json({ success: true });
  }
});

export default router;
