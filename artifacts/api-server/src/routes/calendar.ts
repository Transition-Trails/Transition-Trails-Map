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

interface GCalConferenceEntryPoint {
  entryPointType: string; // "video" | "phone" | "sip" | "more"
  uri: string;
  label?: string;
}

interface GCalConferenceData {
  entryPoints?: GCalConferenceEntryPoint[];
  conferenceSolution?: { name?: string };
}

interface GCalEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: GCalDateTime;
  end:   GCalDateTime;
  attendees?: GCalAttendee[];
  htmlLink: string;
  hangoutLink?: string;           // legacy field — still populated by Google
  conferenceData?: GCalConferenceData;
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
  /** Google Meet join URL, if the event has one. Null otherwise. */
  meetLink: string | null;
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

    const now = new Date();
    // Use the browser-supplied local midnight if provided (avoids UTC/local
    // timezone mismatch where server midnight ≠ user's midnight).
    const fromParam   = (_req.query as Record<string, string>)["from"];
    const startOfDay  = fromParam ? new Date(fromParam) : (() => {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    })();
    const week = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin:       startOfDay.toISOString(),
      timeMax:       week.toISOString(),
      singleEvents:  "true",
      orderBy:       "startTime",
      maxResults:    "25",
      fields:        "items(id,summary,description,location,start,end,attendees,htmlLink,hangoutLink,conferenceData,status)",
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

      // Resolve Meet link: prefer conferenceData video entry point,
      // fall back to the legacy hangoutLink field.
      const videoEntry = ev.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === "video",
      );
      const meetLink: string | null = videoEntry?.uri ?? ev.hangoutLink ?? null;

      return {
        id:                ev.id,
        summary,
        description:       ev.description ?? "",
        location:          ev.location ?? "",
        start:             ev.start,
        end:               ev.end,
        attendees,
        htmlLink:          ev.htmlLink,
        meetLink,
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

// ─── PATCH /api/calendar/events/:eventId/rsvp ─────────────────────────────────
// Updates the current user's response status for a calendar event.
// Body: { status: "accepted" | "declined" | "tentative" }
// Uses the same shared refresh token (acts as calendar owner).

router.patch("/calendar/events/:eventId/rsvp", async (req, res) => {
  const userEmail = req.session?.googleEmail;
  if (!userEmail) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  const { eventId } = req.params;
  const { status } = req.body as { status?: string };

  const VALID = ["accepted", "declined", "tentative"] as const;
  type RsvpStatus = typeof VALID[number];
  if (!status || !VALID.includes(status as RsvpStatus)) {
    return res.status(400).json({ error: "status must be 'accepted', 'declined', or 'tentative'" });
  }

  try {
    const token = await getAccessToken();

    // 1. Fetch the current event to get the attendees array
    const getResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?fields=id,attendees`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!getResp.ok) {
      const body = await getResp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({ error: body.error?.message ?? `Google Calendar API returned HTTP ${getResp.status}` });
    }

    const evData = await getResp.json() as { id: string; attendees?: GCalAttendee[] };
    const attendees: GCalAttendee[] = evData.attendees ?? [];

    // 2. Find the attendee entry for the current user and update responseStatus
    const userLower = userEmail.toLowerCase();
    let matched = false;
    const updatedAttendees = attendees.map(a => {
      if (a.email.toLowerCase() === userLower || a.self) {
        matched = true;
        return { ...a, responseStatus: status as RsvpStatus };
      }
      return a;
    });

    if (!matched) {
      // User is not in the attendees list — still attempt the patch so the
      // calendar API can handle it gracefully.
      updatedAttendees.push({ email: userEmail, responseStatus: status as RsvpStatus });
    }

    // 3. PATCH the event with the updated attendees
    const patchResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attendees: updatedAttendees }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!patchResp.ok) {
      const body = await patchResp.json().catch(() => ({})) as { error?: { message?: string } };
      return res.status(502).json({ error: body.error?.message ?? `Google Calendar API returned HTTP ${patchResp.status}` });
    }

    const updated = await patchResp.json() as GCalEvent;
    const selfEntry = (updated.attendees ?? []).find(a => a.self || a.email.toLowerCase() === userLower);
    return res.json({ ok: true, responseStatus: selfEntry?.responseStatus ?? status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: msg });
  }
});

export default router;
