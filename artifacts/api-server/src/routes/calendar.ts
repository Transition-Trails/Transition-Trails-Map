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

// ─── Fetch primary calendar metadata (with 5-min in-memory cache) ─────────────

interface CalendarMeta { timeZone: string }
let cachedCalMeta: { value: CalendarMeta; expiresAt: number } | null = null;

async function getPrimaryCalendarMeta(token: string): Promise<CalendarMeta> {
  if (cachedCalMeta && Date.now() < cachedCalMeta.expiresAt) {
    return cachedCalMeta.value;
  }
  try {
    const resp = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary?fields=timeZone",
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) },
    );
    if (resp.ok) {
      const data = await resp.json() as { timeZone?: string };
      const meta: CalendarMeta = { timeZone: data.timeZone ?? "UTC" };
      cachedCalMeta = { value: meta, expiresAt: Date.now() + 5 * 60 * 1000 };
      return meta;
    }
  } catch { /* fall through to UTC fallback */ }
  return { timeZone: "UTC" };
}

// ─── Timezone-aware week-boundary helper ─────────────────────────────────────
//
// Returns UTC Date objects for Monday 00:00:00 and Sunday 23:59:59.999 of the
// week containing `now`, expressed in the given IANA timezone.
//
// Algorithm — "sv-SE offset probe":
//   1. Use Intl.DateTimeFormat to extract the calendar date and weekday of
//      `now` in the target timezone.
//   2. Compute the calendar dates of Monday and Sunday for that week.
//   3. For each boundary, find the UTC offset at noon on that date using the
//      sv-SE locale trick (sv-SE always produces "YYYY-MM-DD HH:mm:ss").
//   4. Subtract the offset from the local-midnight UTC representation to get
//      the true UTC instant for 00:00:00 / 23:59:59.999 in the target tz.

function currentWeekBoundsInTz(tz: string, now: Date): { timeMin: Date; timeMax: Date } {
  const dtfParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric", weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => dtfParts.find(p => p.type === type)?.value ?? "";
  const year  = parseInt(get("year"),  10);
  const month = parseInt(get("month"), 10) - 1;  // 0-indexed
  const day   = parseInt(get("day"),   10);

  const DOW_SHORT: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = DOW_SHORT[get("weekday")] ?? 0;

  const diffToMon = (dow + 6) % 7;   // 0 on Mon, 1 on Tue … 6 on Sun
  const monDay    = day - diffToMon;

  // Convert "YYYY-MM-DD 00:00:00 in tz" → UTC Date using a noon probe.
  const localMidnightAsUtc = (lYear: number, lMonth0: number, lDay: number): Date => {
    const probeUtc = new Date(Date.UTC(lYear, lMonth0, lDay, 12, 0, 0));
    const localStr = new Intl.DateTimeFormat("sv-SE", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(probeUtc);
    const localAsUtcMs = Date.parse(localStr.replace(" ", "T") + "Z");
    const offsetMs = localAsUtcMs - probeUtc.getTime();
    const midnightLocalAsUtcMs = Date.UTC(lYear, lMonth0, lDay, 0, 0, 0);
    return new Date(midnightLocalAsUtcMs - offsetMs);
  };

  const timeMin = localMidnightAsUtc(year, month, monDay);
  // End of Sunday = start of next Monday − 1 ms
  const nextMonMin = localMidnightAsUtc(year, month, monDay + 7);
  const timeMax = new Date(nextMonMin.getTime() - 1);

  return { timeMin, timeMax };
}

// ─── GET /api/calendar/events ─────────────────────────────────────────────────
// Returns calendar events from the primary calendar.
// ?week=true  → timeMin = Monday 00:00:00 in the calendar owner's timezone,
//               timeMax = Sunday 23:59:59.999 in the same timezone.
// ?from=<iso> → timeMin = browser-supplied local midnight (today view);
//               timeMax = timeMin + 7 days.
// default     → timeMin = now; timeMax = now + 7 days (upcoming only).

router.get("/calendar/events", async (req, res) => {
  try {
    const token = await getAccessToken();

    const now = new Date();
    let timeMin: Date;
    let timeMax: Date;

    if (req.query["week"] === "true") {
      // Fetch the calendar's configured timezone so week boundaries are correct
      // regardless of the API server's timezone (UTC on Replit).
      const meta = await getPrimaryCalendarMeta(token);
      ({ timeMin, timeMax } = currentWeekBoundsInTz(meta.timeZone, now));
    } else {
      // Accept a browser-supplied local midnight (?from=) so the today view
      // starts at the correct day boundary even when the server is in UTC.
      const fromParam = (req.query as Record<string, string>)["from"];
      const fromDate  = fromParam ? new Date(fromParam) : null;
      timeMin = (fromDate && !isNaN(fromDate.getTime())) ? fromDate : now;
      timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Allow more results for the full-week view so earlier-in-week events
    // are not silently truncated.
    const maxResults = req.query["week"] === "true" ? "50" : "25";

    const params = new URLSearchParams({
      timeMin:       timeMin.toISOString(),
      timeMax:       timeMax.toISOString(),
      singleEvents:  "true",
      orderBy:       "startTime",
      maxResults,
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
