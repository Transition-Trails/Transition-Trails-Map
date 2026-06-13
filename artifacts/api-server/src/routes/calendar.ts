import { Router } from "express";

const router = Router();

// ─── Simple access-token cache (1 token, valid ~55 min) ───────────────────────
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const refreshToken = process.env["GOOGLE_CALENDAR_REFRESH_TOKEN"];

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALENDAR_REFRESH_TOKEN");
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
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // 60s buffer
  };
  return cachedToken.value;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GCalAttendee {
  email: string;
  displayName?: string;
  responseStatus?: "accepted" | "needsAction" | "declined" | "tentative";
  self?: boolean;
  organizer?: boolean;
}

interface GCalDateTime { dateTime?: string; date?: string; timeZone?: string; }

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GCalDateTime;
  end:   GCalDateTime;
  attendees?: GCalAttendee[];
  htmlLink: string;
  status: string;
}

export interface CalendarEventOut {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: GCalDateTime;
  end:   GCalDateTime;
  attendees: GCalAttendee[];
  htmlLink: string;
  status: string;
  isTrailTalk: boolean;
  isPendingResponse: boolean;
  attendeeCount: number;
}

// ─── GET /api/calendar/events ─────────────────────────────────────────────────
// Returns the next 10 calendar events from the primary calendar.

router.get("/calendar/events", async (_req, res) => {
  try {
    const token = await getAccessToken();

    const now   = new Date();
    const week  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin:       now.toISOString(),
      timeMax:       week.toISOString(),
      singleEvents:  "true",
      orderBy:       "startTime",
      maxResults:    "10",
      fields:        "items(id,summary,description,location,start,end,attendees,htmlLink,status)",
    });

    const calResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!calResp.ok) {
      const body = await calResp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({
        error: body.error?.message ?? `Google Calendar API returned HTTP ${calResp.status}`,
      });
    }

    const data = await calResp.json() as { items?: GCalEvent[] };
    const items: GCalEvent[] = data.items ?? [];

    const events: CalendarEventOut[] = items.map(ev => {
      const summary   = ev.summary ?? "(No title)";
      const attendees = ev.attendees ?? [];
      const selfEntry = attendees.find(a => a.self);

      return {
        id:                ev.id,
        summary,
        description:       ev.description ?? "",
        location:          ev.location ?? "",
        start:             ev.start,
        end:               ev.end,
        attendees,
        htmlLink:          ev.htmlLink,
        status:            ev.status,
        isTrailTalk:       /trail\s*talk/i.test(summary),
        isPendingResponse: !!selfEntry && selfEntry.responseStatus === "needsAction",
        attendeeCount:     attendees.length,
      };
    });

    return res.json({ events, fetchedAt: now.toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
});

export default router;
