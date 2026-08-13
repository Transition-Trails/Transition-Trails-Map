/**
 * errorAlertJob.ts
 *
 * Background job that periodically checks the audit log for 5xx error spikes
 * and posts a Slack alert to SLACK_ADMIN_CHANNEL_ID when the count in the
 * last 15 minutes exceeds ERROR_ALERT_THRESHOLD (default: 10).
 *
 * Rate-limits to one alert per hour per top-failing route so a sustained
 * outage does not spam the admin channel.
 */

import { db } from '@workspace/db';
import { trailOsAuditLogTable } from '@workspace/db/schema';
import { eq, gte, sql, and } from 'drizzle-orm';
import { logger } from './logger.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** How often the job polls (ms). Default: every 60 seconds. */
const POLL_INTERVAL_MS = 60_000;

/** Window over which errors are counted. */
const WINDOW_MINUTES = 15;

/** Default spike threshold — overridden by ERROR_ALERT_THRESHOLD env var. */
const DEFAULT_THRESHOLD = 10;

/** Minimum gap between alerts for the same top-failing route. */
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

// ── In-memory rate-limit map ──────────────────────────────────────────────────
// Key: top-failing route (or '__global__' when no route is known)
// Value: timestamp (ms) of last alert posted for that key

const lastAlertAt = new Map<string, number>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getThreshold(): number {
  const raw = process.env['ERROR_ALERT_THRESHOLD'];
  if (!raw) return DEFAULT_THRESHOLD;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD;
}

function getAdminChannelId(): string | null {
  const raw = process.env['SLACK_ADMIN_CHANNEL_ID'] ?? '';
  const slash = raw.lastIndexOf('/');
  const id = slash !== -1 ? raw.slice(slash + 1) : raw;
  return id.trim() || null;
}

function getBotToken(): string | null {
  return (
    process.env['SLACK_BOT_TOKEN'] ??
    process.env['SLACK_BOT_USER_OAUTH_TOKEN'] ??
    null
  );
}

function getDashboardUrl(): string {
  const base = (process.env['APP_BASE_URL'] ?? '').replace(/\/$/, '');
  return base ? `${base}/admin/adoption` : '/admin/adoption';
}

/** Extract the `route` field stored in metadata by errorLogger. */
function extractRoute(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  return typeof m['route'] === 'string' ? m['route'] : null;
}

/**
 * Post a Slack block-kit message to the admin channel.
 * Returns true on success, false otherwise (already logged).
 */
async function postSlackAlert(
  token: string,
  channelId: string,
  errorCount: number,
  topRoute: string,
  windowMinutes: number,
  threshold: number,
  dashboardUrl: string,
): Promise<boolean> {
  const text =
    `🚨 *Error spike detected* — ${errorCount} errors in the last ${windowMinutes} minutes ` +
    `(threshold: ${threshold}). Top failing route: \`${topRoute}\`. ` +
    `<${dashboardUrl}|View Adoption Dashboard>`;

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel:       channelId,
        text,
        unfurl_links:  false,
        unfurl_media:  false,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 Error Spike Detected', emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Errors (last ${windowMinutes} min):*\n${errorCount}` },
              { type: 'mrkdwn', text: `*Threshold:*\n${threshold}` },
              { type: 'mrkdwn', text: `*Top failing route:*\n\`${topRoute}\`` },
              { type: 'mrkdwn', text: `*Alerted at:*\n<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>` },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type:  'button',
                text:  { type: 'plain_text', text: 'View Adoption Dashboard', emoji: false },
                url:   dashboardUrl,
                style: 'danger',
              },
            ],
          },
        ],
      }),
    });

    const result = (await res.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      logger.warn({ slackError: result.error }, 'errorAlertJob: Slack postMessage failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, 'errorAlertJob: network error posting Slack alert');
    return false;
  }
}

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Run one alert-check cycle.
 * Exported for unit-testing; production code calls it via setInterval.
 */
export async function checkAndAlert(): Promise<void> {
  const token     = getBotToken();
  const channelId = getAdminChannelId();

  if (!token || !channelId) {
    // Silently skip — Slack is not configured yet.
    return;
  }

  const threshold   = getThreshold();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  try {
    // Fetch all error rows in the window so we can count and group by route.
    const rows = await db
      .select({
        metadata: trailOsAuditLogTable.metadata,
      })
      .from(trailOsAuditLogTable)
      .where(
        and(
          eq(trailOsAuditLogTable.eventType, 'error'),
          gte(trailOsAuditLogTable.createdAt, windowStart),
        ),
      );

    const errorCount = rows.length;

    if (errorCount <= threshold) {
      return; // At or below threshold — nothing to do; must strictly exceed to alert.
    }

    // Tally errors by route to find the top offender.
    const routeCounts = new Map<string, number>();
    for (const row of rows) {
      const route = extractRoute(row.metadata) ?? '(unknown)';
      routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
    }

    let topRoute = '(unknown)';
    let topCount = 0;
    for (const [route, count] of routeCounts) {
      if (count > topCount) { topCount = count; topRoute = route; }
    }

    // Rate-limit: only alert once per hour per top-failing route.
    const now         = Date.now();
    const lastAlerted = lastAlertAt.get(topRoute) ?? 0;
    if (now - lastAlerted < RATE_LIMIT_MS) {
      return; // Already alerted for this route recently.
    }

    const dashboardUrl = getDashboardUrl();
    const sent = await postSlackAlert(
      token,
      channelId,
      errorCount,
      topRoute,
      WINDOW_MINUTES,
      threshold,
      dashboardUrl,
    );

    if (sent) {
      lastAlertAt.set(topRoute, now);
      logger.info(
        { errorCount, topRoute, threshold, channelId },
        'errorAlertJob: spike alert posted to Slack',
      );
    }
  } catch (err) {
    // Never crash the server — just log and wait for next poll.
    logger.error({ err }, 'errorAlertJob: check threw unexpectedly');
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background error-spike alert job.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function startErrorAlertJob(): void {
  if (intervalHandle !== null) return;

  logger.info(
    { windowMinutes: WINDOW_MINUTES, threshold: getThreshold(), pollIntervalMs: POLL_INTERVAL_MS },
    'errorAlertJob: started',
  );

  intervalHandle = setInterval(() => {
    void checkAndAlert();
  }, POLL_INTERVAL_MS);

  // Prevent this timer from keeping the process alive during a graceful shutdown.
  if (intervalHandle.unref) intervalHandle.unref();
}

/**
 * Stop the background job (primarily for tests / graceful shutdown).
 */
export function stopErrorAlertJob(): void {
  if (intervalHandle === null) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

/**
 * Clear the in-memory rate-limit map.
 * Exported for unit tests only — do not call in production code.
 */
export function _resetRateLimitForTesting(): void {
  lastAlertAt.clear();
}
