import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeProxyFetch() {
  const connectors = new ReplitConnectors();
  return connectors.createProxyFetch("salesforce");
}

/**
 * Resolve the Agentforce agent ID.
 * AGENTFORCE_API_KEY holds the Salesforce Record ID of the agent (0Xx… prefix).
 * AGENTFORCE_AGENT_ID can override it if set separately.
 */
function resolveAgentId(): string | undefined {
  return (
    process.env["AGENTFORCE_AGENT_ID"] ??
    process.env["AGENTFORCE_API_KEY"] ??
    undefined
  );
}

// ─── Response types ────────────────────────────────────────────────────────────

interface AgentSessionResponse {
  sessionId?: string;
  id?: string;
  error?: string;
  [key: string]: unknown;
}

interface AgentMessageResponse {
  messages?: AgentMessage[];
  error?: string;
  [key: string]: unknown;
}

interface AgentMessage {
  type?: string;
  text?: string;
  feedbackId?: string;
  [key: string]: unknown;
}

// ─── GET /api/agentforce/status ────────────────────────────────────────────────
// Quick readiness check — no SF call, just config inspection.

router.get("/agentforce/status", (req, res) => {
  const agentId  = resolveAgentId();
  const hasKey   = !!process.env["AGENTFORCE_API_KEY"];
  const hasAgent = !!agentId;

  res.json({
    ok: hasAgent,
    hasKey,
    hasAgentId: hasAgent,
    agentIdPrefix: agentId ? agentId.slice(0, 4) : null,
    detail: hasAgent
      ? `Agent ID resolved (${agentId!.slice(0, 6)}…). Salesforce Connector handles auth.`
      : "AGENTFORCE_API_KEY or AGENTFORCE_AGENT_ID must be set.",
    authMethod: "Salesforce Replit Connector (proxyFetch)",
  });
});

// ─── POST /api/agentforce/invoke ───────────────────────────────────────────────
// Creates an Agentforce session, sends one message, returns the response,
// then closes the session. Stateless from the Trail OS side.
//
// Body: {
//   message:    string           — learner or coach message to the agent
//   learnerId?: string           — Salesforce Contact ID, included in context
//   programId?: string           — Salesforce Program__c ID
//   context?:   Record<…>        — any extra key/value pairs for the agent
// }

router.post("/agentforce/invoke", async (req, res) => {
  const agentId = resolveAgentId();
  if (!agentId) {
    res.status(503).json({
      ok: false,
      error: "no_agent_id",
      detail: "Set AGENTFORCE_API_KEY (or AGENTFORCE_AGENT_ID) in Replit Secrets.",
    });
    return;
  }

  const body = req.body as {
    message?: unknown;
    learnerId?: unknown;
    programId?: unknown;
    context?: unknown;
  };

  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    res.status(400).json({ ok: false, error: "message is required and must be a non-empty string" });
    return;
  }

  const message   = body.message.trim();
  const learnerId = typeof body.learnerId === "string" ? body.learnerId : undefined;
  const programId = typeof body.programId === "string" ? body.programId : undefined;

  // Build context variables for the agent
  const variables: Array<{ name: string; type: string; value: string }> = [];
  if (learnerId) variables.push({ name: "learnerId",  type: "Text", value: learnerId });
  if (programId) variables.push({ name: "programId",  type: "Text", value: programId });

  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    proxyFetch = makeProxyFetch();
  } catch (err) {
    req.log.error({ err }, "agentforce: Salesforce connector init failed");
    res.status(503).json({
      ok: false,
      error: "connector_unavailable",
      detail: "Salesforce Replit Connector is not initialised. Check connection in Admin Setup.",
    });
    return;
  }

  // ── 1. Create session ────────────────────────────────────────────────────────
  const externalSessionKey = `trail-os-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let sessionId: string;
  try {
    const sessionRes = await proxyFetch(
      `/einstein/ai-assist/v1/agents/${agentId}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalSessionKey,
          instanceConfig: { endpoint: "" }, // connector resolves base URL
          streamingCapabilities: { chunkTypes: ["Text"] },
          bypassUser: true,
        }),
      }
    );

    if (!sessionRes.ok) {
      const text = await sessionRes.text().catch(() => `HTTP ${sessionRes.status}`);
      req.log.error({ status: sessionRes.status, body: text }, "agentforce: session create failed");
      res.status(sessionRes.status === 401 ? 401 : 502).json({
        ok: false,
        error: "session_create_failed",
        detail: `Agentforce session creation failed (${sessionRes.status}): ${text.slice(0, 300)}`,
        hint: sessionRes.status === 401
          ? "Auth failed — ensure the Salesforce Connector has einstein_api scope and the agent is deployed."
          : undefined,
      });
      return;
    }

    const sessionData = (await sessionRes.json()) as AgentSessionResponse;
    sessionId = (sessionData.sessionId ?? sessionData.id ?? "") as string;

    if (!sessionId) {
      res.status(502).json({
        ok: false,
        error: "session_no_id",
        detail: "Agentforce returned a session response with no sessionId.",
        raw: sessionData,
      });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "agentforce: session create network error");
    res.status(502).json({
      ok: false,
      error: "session_network_error",
      detail: "Could not reach Salesforce Agentforce API. Check Salesforce Connector connectivity.",
    });
    return;
  }

  // ── 2. Send message ──────────────────────────────────────────────────────────
  let agentResponse: string;
  let rawMessageData: AgentMessageResponse;
  try {
    const msgRes = await proxyFetch(
      `/einstein/ai-assist/v1/agents/${agentId}/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            sequenceId: 1,
            type: "Text",
            text: message,
          },
          variables,
        }),
      }
    );

    if (!msgRes.ok) {
      const text = await msgRes.text().catch(() => `HTTP ${msgRes.status}`);
      req.log.error({ status: msgRes.status, body: text }, "agentforce: message send failed");
      // Session was created — close it before returning error
      void closeSession(proxyFetch, agentId, sessionId).catch(() => undefined);
      res.status(502).json({
        ok: false,
        error: "message_send_failed",
        detail: `Agentforce message failed (${msgRes.status}): ${text.slice(0, 300)}`,
      });
      return;
    }

    rawMessageData = (await msgRes.json()) as AgentMessageResponse;

    // Extract text from the response message array
    const textMessages = (rawMessageData.messages ?? []).filter(
      (m: AgentMessage) => m.type === "Text" || m.type === "Inform"
    );
    agentResponse = textMessages.map((m: AgentMessage) => m.text ?? "").join("\n").trim();

    if (!agentResponse) {
      agentResponse = "[Agentforce responded but returned no text content]";
    }
  } catch (err) {
    req.log.error({ err }, "agentforce: message send network error");
    void closeSession(proxyFetch, agentId, sessionId).catch(() => undefined);
    res.status(502).json({
      ok: false,
      error: "message_network_error",
      detail: "Network error while sending message to Agentforce.",
    });
    return;
  }

  // ── 3. Close session ──────────────────────────────────────────────────────────
  void closeSession(proxyFetch, agentId, sessionId).catch((err: unknown) => {
    req.log.warn({ err }, "agentforce: session close failed (non-fatal)");
  });

  // ── 4. Return ─────────────────────────────────────────────────────────────────
  res.json({
    ok: true,
    response: agentResponse,
    sessionId,
    agentId,
    raw: rawMessageData,
  });
});

// ─── POST /api/agentforce/test ─────────────────────────────────────────────────
// Smoke-test: create a session, send a fixed greeting, close, return result.

router.post("/agentforce/test", async (req, res) => {
  const agentId = resolveAgentId();
  if (!agentId) {
    res.status(503).json({ ok: false, error: "no_agent_id" });
    return;
  }

  let proxyFetch: (url: string, init?: RequestInit) => Promise<Response>;
  try {
    proxyFetch = makeProxyFetch();
  } catch {
    res.status(503).json({ ok: false, error: "connector_unavailable" });
    return;
  }

  const externalSessionKey = `trail-os-test-${Date.now()}`;

  try {
    // Create
    const sessionRes = await proxyFetch(
      `/einstein/ai-assist/v1/agents/${agentId}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalSessionKey,
          instanceConfig: { endpoint: "" },
          streamingCapabilities: { chunkTypes: ["Text"] },
          bypassUser: true,
        }),
      }
    );

    if (!sessionRes.ok) {
      const text = await sessionRes.text().catch(() => "");
      res.status(sessionRes.status === 401 ? 401 : 502).json({
        ok: false,
        error: "session_failed",
        status: sessionRes.status,
        detail: text.slice(0, 300),
        hint: sessionRes.status === 401
          ? "Auth scope missing — add einstein_api to the Salesforce Connected App and reconnect."
          : "Agentforce API unreachable. Confirm agent is deployed and Active.",
      });
      return;
    }

    const sessionData = (await sessionRes.json()) as AgentSessionResponse;
    const sessionId   = (sessionData.sessionId ?? sessionData.id ?? "") as string;

    if (!sessionId) {
      res.status(502).json({ ok: false, error: "no_session_id", raw: sessionData });
      return;
    }

    // Message
    const msgRes = await proxyFetch(
      `/einstein/ai-assist/v1/agents/${agentId}/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { sequenceId: 1, type: "Text", text: "Hello from Trail OS — connection test." },
          variables: [],
        }),
      }
    );

    const msgData = (await msgRes.json()) as AgentMessageResponse;

    // Close
    void closeSession(proxyFetch, agentId, sessionId).catch(() => undefined);

    const textMsgs = (msgData.messages ?? []).filter(
      (m: AgentMessage) => m.type === "Text" || m.type === "Inform"
    );
    const preview = textMsgs.map((m: AgentMessage) => m.text ?? "").join(" ").slice(0, 200);

    res.json({
      ok: msgRes.ok,
      sessionId,
      agentId,
      responsePreview: preview || "[no text in response]",
      messageStatus: msgRes.status,
    });
  } catch (err) {
    req.log.error({ err }, "agentforce: test failed");
    res.status(502).json({ ok: false, error: "network_error", detail: String(err) });
  }
});

// ─── Helper ────────────────────────────────────────────────────────────────────

async function closeSession(
  proxyFetch: (url: string, init?: RequestInit) => Promise<Response>,
  agentId: string,
  sessionId: string
): Promise<void> {
  await proxyFetch(
    `/einstein/ai-assist/v1/agents/${agentId}/sessions/${sessionId}`,
    { method: "DELETE" }
  );
}

export default router;
