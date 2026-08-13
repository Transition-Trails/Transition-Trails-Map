/**
 * buildErrorCaseService.ts
 *
 * Service that auto-creates a Salesforce case whenever a build-required error
 * is detected by the API server's global error handler.
 *
 * Flow:
 *  1. Compute fingerprint + dedupKey (fingerprint + 1-hour bucket).
 *  2. Atomically INSERT the log row with ON CONFLICT DO NOTHING on dedupKey.
 *     If 0 rows are inserted the same error was already handled this hour — return.
 *  3. Call the LLM router for a 3-bullet resolution plan.
 *  4. Create a Salesforce case via the Connector client.
 *  5. UPDATE the log row with SF case details and resolution plan.
 *  6. Post a Slack message to SLACK_ADMIN_CHANNEL_ID.
 *
 * The INSERT ON CONFLICT in step 2 is atomic — no SELECT is needed and
 * concurrent invocations for the same error cannot both proceed.
 *
 * All failures are logged but never re-thrown — this runs fire-and-forget
 * inside setImmediate so it must never crash the caller's request path.
 */

import { db }                     from '@workspace/db';
import { buildErrorLogsTable }    from '@workspace/db/schema';
import { eq }                     from 'drizzle-orm';
import { logger }                 from './logger.js';
import { buildErrorFingerprint, buildDedupKey } from './buildErrorClassifier.js';
import { callLLM }                from './llm/index.js';
import { ConnectorSalesforceClient } from './connectorSalesforceClient.js';

// ── Slack helper ──────────────────────────────────────────────────────────────

async function postSlackAlert(opts: {
  errorName:       string;
  sfCaseNumber:    string | null;
  sfCaseId:        string | null;
  orgBaseUrl:      string;
  resolutionHint:  string;
}): Promise<void> {
  const botToken  = process.env['SLACK_BOT_TOKEN'];
  const channelId = process.env['SLACK_ADMIN_CHANNEL_ID'];

  if (!botToken || !channelId) {
    logger.warn('buildErrorCaseService: SLACK_BOT_TOKEN or SLACK_ADMIN_CHANNEL_ID not set — skipping Slack alert');
    return;
  }

  const caseRef  = opts.sfCaseNumber ?? 'case pending';
  const caseLink = opts.sfCaseId && opts.orgBaseUrl
    ? `${opts.orgBaseUrl}/lightning/r/Case/${opts.sfCaseId}/view`
    : null;
  const caseLine = caseLink
    ? `*SF Case:* <${caseLink}|${caseRef}>`
    : `*SF Case:* ${caseRef}`;

  const body = {
    channel: channelId,
    text:    `🔴 Build error auto-case created: ${opts.errorName}`,
    blocks:  [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🔴 Build Error — Auto-Case Created', emoji: true },
      },
      {
        type:   'section',
        fields: [
          { type: 'mrkdwn', text: `*Error:*\n${opts.errorName}` },
          { type: 'mrkdwn', text: caseLine },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Resolution hint:*\n${opts.resolutionHint}` },
      },
      {
        type:     'context',
        elements: [
          { type: 'mrkdwn', text: 'Auto-filed by Trail OS · Priority: High · Origin: automated-log' },
        ],
      },
    ],
  };

  const resp = await fetch('https://slack.com/api/chat.postMessage', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json() as { ok: boolean; error?: string };
  if (!json.ok) {
    logger.warn({ slackError: json.error }, 'buildErrorCaseService: Slack postMessage returned ok:false');
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

export async function createBuildErrorCase(err: unknown): Promise<void> {
  const fingerprint = buildErrorFingerprint(err);
  const dedupKey    = buildDedupKey(fingerprint);
  const e           = (err && typeof err === 'object') ? (err as Record<string, unknown>) : {};
  const errorName   = typeof e['name']    === 'string' ? e['name']    : 'UnknownError';
  const errorMessage= typeof e['message'] === 'string' ? e['message'] : String(err ?? '');
  const stack       = typeof e['stack']   === 'string' ? e['stack'].slice(0, 2000) : null;

  try {
    // ── 1. Atomic dedup claim via INSERT ON CONFLICT DO NOTHING ────────────────
    //
    // The UNIQUE constraint on dedup_key ensures only one concurrent invocation
    // can proceed for a given fingerprint + 1-hour bucket.  If another call
    // already inserted this key (same error in the same clock-hour), the INSERT
    // returns 0 rows and we skip — no SELECT race condition.
    const claimed = await db
      .insert(buildErrorLogsTable)
      .values({
        fingerprint,
        dedupKey,
        errorName,
        errorMessage: errorMessage.slice(0, 1000),
        stackTrace:   stack,
      })
      .onConflictDoNothing({ target: buildErrorLogsTable.dedupKey })
      .returning({ id: buildErrorLogsTable.id });

    if (claimed.length === 0) {
      logger.info(
        { fingerprint, dedupKey },
        'buildErrorCaseService: duplicate within 60-min window (atomic dedup) — skipping case creation',
      );
      return;
    }

    const logId = claimed[0]!.id;

    // ── 2. LLM resolution plan ─────────────────────────────────────────────────
    let resolutionPlan: string | null = null;
    try {
      const llmResp = await callLLM('gemini', {
        systemPrompt: [
          'You are a senior DevOps engineer diagnosing a production runtime error.',
          'Respond with ONLY a numbered list of exactly 3 concise bullet points (no preamble, no headers).',
          'Each bullet must be an actionable resolution step specific to the error class provided.',
          'Keep each bullet under 120 characters.',
        ].join(' '),
        history:      [],
        userMessage:  `Error class: ${errorName}\nError message: ${errorMessage.slice(0, 500)}\n\nProvide a 3-step resolution plan.`,
        maxOutputTokens: 256,
        temperature:     0.2,
      });
      resolutionPlan = llmResp.text.trim();
    } catch (llmErr) {
      logger.warn({ err: llmErr }, 'buildErrorCaseService: LLM call failed — continuing without resolution plan');
    }

    // ── 3. Create Salesforce case ──────────────────────────────────────────────
    let sfCaseId:     string | null = null;
    let sfCaseNumber: string | null = null;
    let orgBaseUrl = '';

    try {
      const client = new ConnectorSalesforceClient();

      const descLines: string[] = [
        `Error Name: ${errorName}`,
        `Error Message: ${errorMessage.slice(0, 500)}`,
        '',
        'Stack Trace (first 2000 chars):',
        stack ?? '(not available)',
      ];

      if (resolutionPlan) {
        descLines.push('', 'AI-Generated Resolution Plan:', resolutionPlan);
      }

      const sfData: Record<string, unknown> = {
        Subject:     `🔴 Auto: ${errorName}`,
        Priority:    'High',
        Origin:      'Web',
        Status:      'New',
        Description: descLines.join('\n'),
      };

      const result = await client.createRecord('Case', sfData);
      sfCaseId = result.id;

      // Fetch case number and org URL — best-effort
      const [cqResult, baseUrlResult] = await Promise.allSettled([
        client.query<{ CaseNumber: string }>(
          `SELECT CaseNumber FROM Case WHERE Id = '${sfCaseId}' LIMIT 1`,
        ),
        client.getOrgBaseUrl(),
      ]);
      if (cqResult.status === 'fulfilled') {
        sfCaseNumber = cqResult.value.records[0]?.CaseNumber ?? null;
      }
      if (baseUrlResult.status === 'fulfilled') {
        orgBaseUrl = baseUrlResult.value;
      }
    } catch (sfErr) {
      logger.error({ err: sfErr }, 'buildErrorCaseService: Salesforce case creation failed');
    }

    // ── 4. Update DB row with SF case details ──────────────────────────────────
    await db
      .update(buildErrorLogsTable)
      .set({
        sfCaseId,
        sfCaseNumber,
        sfOrgBaseUrl:  orgBaseUrl || null,
        resolutionPlan,
      })
      .where(eq(buildErrorLogsTable.id, logId));

    // Log the outcome clearly — distinguish between a successful SF case and a
    // locally-logged row where SF creation failed (sfCaseId is null).
    if (sfCaseId) {
      logger.info(
        { errorName, sfCaseId, sfCaseNumber, fingerprint, logId },
        'buildErrorCaseService: build-error logged and SF case auto-created',
      );
    } else {
      logger.warn(
        { errorName, fingerprint, logId },
        'buildErrorCaseService: build-error logged but SF case creation failed — manual follow-up required',
      );
    }

    // ── 5. Slack notification (only when SF case was successfully created) ─────
    if (!sfCaseId) {
      // Skip Slack when we have no case number to link — posting a partial alert
      // would mislead the team into thinking the issue is tracked in SF.
      logger.warn(
        { errorName },
        'buildErrorCaseService: skipping Slack alert because SF case creation failed',
      );
      return;
    }

    const firstBullet = resolutionPlan
      ? (resolutionPlan.split('\n')[0] ?? resolutionPlan).slice(0, 120)
      : 'Review server logs and check for schema or environment issues.';

    await postSlackAlert({
      errorName,
      sfCaseNumber,
      sfCaseId,
      orgBaseUrl,
      resolutionHint: firstBullet,
    }).catch(slackErr => {
      logger.warn({ err: slackErr }, 'buildErrorCaseService: Slack notification failed');
    });
  } catch (outerErr) {
    // Never let the service crash the caller
    logger.error({ err: outerErr }, 'buildErrorCaseService: unexpected error in createBuildErrorCase');
  }
}
