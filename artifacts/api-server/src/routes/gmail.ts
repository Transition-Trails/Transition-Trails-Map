import { Router } from "express";

const router = Router();

// ─── Token cache ──────────────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  // Gmail-specific refresh token; fall back to calendar token if same grant covers all scopes
  const refreshToken =
    process.env["GOOGLE_GMAIL_REFRESH_TOKEN"] ??
    process.env["GOOGLE_CALENDAR_REFRESH_TOKEN"];

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_GMAIL_REFRESH_TOKEN. " +
      "Complete the Google OAuth flow with gmail.readonly and gmail.send scopes and store the refresh token as GOOGLE_GMAIL_REFRESH_TOKEN."
    );
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({})) as { error?: string; error_description?: string };
    throw new Error(body.error_description ?? body.error ?? `Token exchange failed: HTTP ${resp.status}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value:     data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GmailHeader { name: string; value: string; }

interface GmailMessageMeta {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: GmailHeader[];
  };
  internalDate: string;
}

interface GmailListItem { id: string; threadId: string; }

interface ThreadOut {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;        // ISO
  unread: boolean;
  starred: boolean;
  important: boolean;
  needsAction: boolean; // heuristic: unread + starred or important
}

function header(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFromHeader(raw: string): { name: string; email: string } {
  // "Display Name <email@example.com>" or just "email@example.com"
  const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: (match[1] ?? "").replace(/^"|"$/g, "").trim(), email: match[2] ?? raw };
  }
  return { name: raw, email: raw };
}

// ─── GET /api/gmail/validate ─────────────────────────────────────────────────
// Exchanges the refresh token and calls Google's tokeninfo endpoint so we can
// see exactly which scopes the stored token covers (diagnostic only).

router.get("/gmail/validate", async (req, res) => {
  try {
    const token = await getAccessToken();
    const infoResp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const info = await infoResp.json() as Record<string, unknown>;
    const scopeStr = typeof info["scope"] === "string" ? info["scope"] : "";
    const scopes = scopeStr.split(" ").filter(Boolean);
    return res.json({
      ok: infoResp.ok,
      scopes,
      hasGmailReadonly: scopes.some(s => s.includes("gmail.readonly") || s.includes("mail.google.com")),
      hasGmailSend:     scopes.some(s => s.includes("gmail.send")),
      tokenSource:      process.env["GOOGLE_GMAIL_REFRESH_TOKEN"] ? "GOOGLE_GMAIL_REFRESH_TOKEN" : "GOOGLE_CALENDAR_REFRESH_TOKEN (fallback)",
      raw: info,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
});

// ─── GET /api/gmail/threads ───────────────────────────────────────────────────
// Returns up to 15 inbox threads with sender, subject, snippet, unread flag.

router.get("/gmail/threads", async (req, res) => {
  try {
    const token = await getAccessToken();
    const maxResults = Math.min(Number(req.query["maxResults"] ?? 15), 30);

    // Step 1: list inbox message IDs
    const listParams = new URLSearchParams({
      labelIds:   "INBOX",
      maxResults: String(maxResults),
      fields:     "messages(id,threadId),nextPageToken",
    });

    const listResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }
    );

    if (!listResp.ok) {
      const body = await listResp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({ error: body.error?.message ?? `Gmail API HTTP ${listResp.status}` });
    }

    const listData = await listResp.json() as { messages?: GmailListItem[] };
    const messages = listData.messages ?? [];

    if (messages.length === 0) {
      return res.json({ threads: [], fetchedAt: new Date().toISOString() });
    }

    // Step 2: batch-fetch metadata for each message (parallel, max 15)
    const fetchOne = async (msgId: string): Promise<ThreadOut | null> => {
      try {
        const metaParams = new URLSearchParams({
          format:          "metadata",
          metadataHeaders: "From",
          fields:          "id,threadId,labelIds,snippet,payload/headers,internalDate",
        });
        // append repeated metadataHeaders
        metaParams.append("metadataHeaders", "Subject");
        metaParams.append("metadataHeaders", "Date");

        const msgResp = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?${metaParams}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) }
        );

        if (!msgResp.ok) return null;

        const msg = await msgResp.json() as GmailMessageMeta;
        const headers = msg.payload?.headers ?? [];
        const labels  = msg.labelIds ?? [];

        const fromRaw  = header(headers, "From");
        const { name: fromName, email: fromEmail } = parseFromHeader(fromRaw);
        const subject  = header(headers, "Subject") || "(no subject)";
        const unread   = labels.includes("UNREAD");
        const starred  = labels.includes("STARRED");
        const important = labels.includes("IMPORTANT");

        return {
          id:         msg.id,
          threadId:   msg.threadId,
          from:       fromName || fromEmail,
          fromEmail,
          subject,
          snippet:    msg.snippet ?? "",
          date:       msg.internalDate
            ? new Date(Number(msg.internalDate)).toISOString()
            : new Date().toISOString(),
          unread,
          starred,
          important,
          needsAction: unread && (starred || important),
        };
      } catch {
        return null;
      }
    };

    const results = await Promise.all(messages.slice(0, 15).map(m => fetchOne(m.id)));
    const threads = results.filter((t): t is ThreadOut => t !== null);

    return res.json({ threads, fetchedAt: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
});

// ─── POST /api/gmail/send ─────────────────────────────────────────────────────
// Sends an email via Gmail. Body: { to, subject, body, replyToMessageId? }

router.post("/gmail/send", async (req, res) => {
  const raw = req.body as Record<string, unknown>;
  const to               = typeof raw["to"]               === "string" ? raw["to"].trim()               : "";
  const subject          = typeof raw["subject"]          === "string" ? raw["subject"].trim()          : "";
  const body             = typeof raw["body"]             === "string" ? raw["body"].trim()             : "";
  const replyToMessageId = typeof raw["replyToMessageId"] === "string" ? raw["replyToMessageId"]        : undefined;
  const threadId         = typeof raw["threadId"]         === "string" ? raw["threadId"]                : undefined;

  const errors: string[] = [];
  if (!to || !to.includes("@"))  errors.push("Invalid recipient email address.");
  if (!subject)                   errors.push("Subject is required.");
  if (!body)                      errors.push("Message body is required.");
  if (errors.length > 0) return res.status(400).json({ error: errors.join(" ") });

  try {
    const token = await getAccessToken();

    // Build RFC 2822 message
    const rawLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      body,
    ];
    if (replyToMessageId) {
      rawLines.splice(2, 0, `In-Reply-To: ${replyToMessageId}`);
      rawLines.splice(3, 0, `References: ${replyToMessageId}`);
    }

    const raw = Buffer.from(rawLines.join("\r\n")).toString("base64url");

    const payload: Record<string, string> = { raw };
    if (threadId) payload["threadId"] = threadId;

    const sendResp = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body:   JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!sendResp.ok) {
      const errBody = await sendResp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({ error: errBody.error?.message ?? `Gmail send failed: HTTP ${sendResp.status}` });
    }

    const sent = await sendResp.json() as { id: string; threadId: string };
    return res.json({ ok: true, messageId: sent.id, threadId: sent.threadId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
});

export default router;
