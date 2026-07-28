import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const ELEVEN_BASE = "https://api.elevenlabs.io";

// ── GET /voiceover/voices ──────────────────────────────────────────────────────

interface ElevenVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

router.get("/voiceover/voices", async (_req, res) => {
  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "ELEVENLABS_API_KEY not configured — add it in Admin → Integrations." });
  }
  try {
    const resp = await fetch(`${ELEVEN_BASE}/v1/voices`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { detail?: string };
      return res.status(resp.status).json({ error: `ElevenLabs error ${resp.status}`, detail: body.detail ?? null });
    }
    const data = await resp.json() as { voices: ElevenVoice[] };
    const voices = (data.voices ?? []).map(v => ({
      voiceId:     v.voice_id,
      name:        v.name,
      category:    v.category ?? "premade",
      accent:      v.labels?.["accent"]      ?? null,
      description: v.labels?.["description"] ?? null,
      gender:      v.labels?.["gender"]      ?? null,
      age:         v.labels?.["age"]         ?? null,
      useCase:     v.labels?.["use case"]    ?? null,
      previewUrl:  v.preview_url             ?? null,
    }));
    return res.json({ voices });
  } catch (err) {
    logger.error({ err }, "Failed to fetch ElevenLabs voices");
    return res.status(502).json({ error: "Could not reach ElevenLabs" });
  }
});

// ── POST /voiceover/rewrite ────────────────────────────────────────────────────

const REWRITE_SYSTEM = `You are a professional learning content writer for Transition Trails Academy — a career development and workforce training organisation. You rewrite raw educational content into polished "Build with Me" voiceover scripts.

A "Build with Me" script:
- Opens with a warm, direct hook that names exactly what the learner will accomplish (e.g. "In this session, we're going to build your first...")
- Uses second-person ("you", "we", "let's") to feel like a live coaching conversation
- Breaks complex ideas into clear transitions: "First...", "Next...", "Now let's...", "Here's where it gets interesting..."
- Ends with a specific reflection prompt or clear next-action call to action
- Is written for spoken delivery — short punchy sentences, natural pauses, no jargon without a quick definition right after it
- Tone: professional but warm, energizing not dry, like a great coach walking you through something step by step
- Length: match the input length — don't pad or cut aggressively

Output ONLY the rewritten script. No preamble, no formatting labels, no markdown headers. Just the spoken words as they should be delivered.`;

router.post("/voiceover/rewrite", async (req, res) => {
  const { rawScript, programName, style = "build-with-me" } = req.body as {
    rawScript?: unknown;
    programName?: unknown;
    style?: unknown;
  };

  if (!rawScript || typeof rawScript !== "string" || !rawScript.trim()) {
    return res.status(400).json({ error: "rawScript is required" });
  }
  if (rawScript.length > 8_000) {
    return res.status(400).json({ error: "rawScript must be 8000 characters or fewer" });
  }

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "GEMINI_API_KEY not configured" });
  }

  const styleLabel = style === "build-with-me" ? '"Build with Me"'
    : style === "overview"   ? "program overview narration"
    : style === "coaching"   ? "one-on-one coaching session"
    : style === "reflection" ? "guided reflection"
    : '"Build with Me"';

  const userMsg = `Rewrite the following into a ${styleLabel} voiceover script${programName && typeof programName === "string" ? ` for the "${programName}" program` : ""}:\n\n${rawScript.trim()}`;

  try {
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: REWRITE_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({ error: body.error?.message ?? `Gemini error ${resp.status}` });
    }

    const body = await resp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const script = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!script) {
      return res.status(502).json({ error: "Gemini returned an empty script" });
    }

    return res.json({ script, durationMs: Date.now() - start });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return res.status(502).json({
      error: isTimeout
        ? "Script rewrite timed out (30s)"
        : `Gemini error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// ── POST /voiceover/tts ────────────────────────────────────────────────────────

router.post("/voiceover/tts", async (req, res) => {
  const {
    script,
    voiceId,
    modelId         = "eleven_multilingual_v2",
    stability       = 0.5,
    similarityBoost = 0.75,
  } = req.body as {
    script?:         unknown;
    voiceId?:        unknown;
    modelId?:        unknown;
    stability?:      unknown;
    similarityBoost?: unknown;
  };

  if (!script || typeof script !== "string" || !script.trim()) {
    return res.status(400).json({ error: "script is required" });
  }
  if (!voiceId || typeof voiceId !== "string") {
    return res.status(400).json({ error: "voiceId is required" });
  }
  if (script.length > 5_000) {
    return res.status(400).json({ error: "script must be 5000 characters or fewer for TTS" });
  }

  const apiKey = process.env["ELEVENLABS_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({ error: "ELEVENLABS_API_KEY not configured — add it in Admin → Integrations." });
  }

  try {
    const start = Date.now();
    const resp = await fetch(`${ELEVEN_BASE}/v1/text-to-speech/${voiceId}/with-timestamps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key":   apiKey,
      },
      body: JSON.stringify({
        text:     script.trim(),
        model_id: typeof modelId === "string" ? modelId : "eleven_multilingual_v2",
        voice_settings: {
          stability:        typeof stability       === "number" ? stability       : 0.5,
          similarity_boost: typeof similarityBoost === "number" ? similarityBoost : 0.75,
          style:            0.3,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({})) as { detail?: { message?: string } | string };
      const msg = typeof body.detail === "object"
        ? (body.detail?.message ?? `HTTP ${resp.status}`)
        : (body.detail ?? `ElevenLabs HTTP ${resp.status}`);
      return res.status(resp.status === 401 ? 503 : 502).json({ error: `ElevenLabs: ${msg}` });
    }

    const data = await resp.json() as { audio_base64?: string };
    if (!data.audio_base64) {
      return res.status(502).json({ error: "ElevenLabs returned no audio data" });
    }

    return res.json({
      audioBase64: data.audio_base64,
      mimeType:    "audio/mpeg",
      durationMs:  Date.now() - start,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    logger.error({ err }, "TTS generation failed");
    return res.status(502).json({
      error: isTimeout
        ? "TTS generation timed out (90s) — try a shorter script"
        : `TTS error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

export default router;
