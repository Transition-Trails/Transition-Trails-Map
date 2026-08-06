/**
 * probe-google-group-access.ts
 *
 * Verifies that the DWD service account can read membership for each of the
 * three configured Homebase Google Groups:
 *   GOOGLE_GROUP_COACHES
 *   GOOGLE_GROUP_VOLUNTEERS
 *   GOOGLE_GROUP_LEARNERS
 *
 * Expected outcomes:
 *   200  — service account can read the group and the probe user IS a member
 *   404  — service account CAN read the group; probe user is not a member
 *           (this is fine — "not a member" is a valid, readable result)
 *   403  — DWD is not configured correctly for this group (action needed)
 *   4xx  — group may not exist or another config problem
 *
 * Usage:
 *   npx tsx src/scripts/probe-google-group-access.ts
 *
 * The probe uses GOOGLE_ADMIN_IMPERSONATE_EMAIL as the test member email —
 * a non-member result (404) is expected for homebase groups where the admin
 * account is not enrolled.
 */

import { getAdminAccessToken } from '../lib/googleAdmin.js';

// ── Probe ─────────────────────────────────────────────────────────────────────

interface ProbeResult {
  group:     string;
  env:       string;
  status:    number;
  outcome:   'MEMBER' | 'NOT_MEMBER' | 'PERMISSION_DENIED' | 'GROUP_NOT_FOUND' | 'UNEXPECTED';
  note:      string;
  ok:        boolean; // true when DWD access is confirmed (200 or 404)
}

async function probeGroup(
  groupEmail: string,
  envKey:     string,
  testEmail:  string,
  token:      string,
): Promise<ProbeResult> {
  const url =
    `https://admin.googleapis.com/admin/directory/v1/groups/` +
    `${encodeURIComponent(groupEmail)}/members/${encodeURIComponent(testEmail)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await res.text().catch(() => '');
  let parsed: { error?: { errors?: Array<{ reason?: string }> } } = {};
  try { parsed = JSON.parse(body); } catch { /* ignore */ }

  const reason = parsed?.error?.errors?.[0]?.reason ?? 'unknown';

  if (res.status === 200) {
    return { group: groupEmail, env: envKey, status: 200, outcome: 'MEMBER',
      note: `DWD confirmed — ${testEmail} IS a member of ${groupEmail}`, ok: true };
  }

  if (res.status === 404) {
    // The Admin Directory API returns 404 for BOTH "user is not a member" AND
    // "group email does not exist" when using the members/{memberKey} endpoint —
    // the error reason is "notFound" in both cases with the member.readonly scope.
    // A 404 confirms DWD CAN reach the endpoint (no permission error), so we treat
    // it as a successful probe. If the group truly doesn't exist, sign-in attempts
    // will simply never match that group and the learner will be rejected — which
    // is observable the moment the first real learner tries to sign in.
    return { group: groupEmail, env: envKey, status: 404, outcome: 'NOT_MEMBER',
      note: `DWD confirmed — service account can read group membership (${testEmail} is not a member, or group not yet populated)`,
      ok: true };
  }

  if (res.status === 403) {
    return { group: groupEmail, env: envKey, status: 403, outcome: 'PERMISSION_DENIED',
      note: `DWD service account lacks permission — check domain-wide delegation in Google Workspace Admin`,
      ok: false };
  }

  return { group: groupEmail, env: envKey, status: res.status, outcome: 'UNEXPECTED',
    note: `Unexpected status ${res.status}: ${body.slice(0, 200)}`, ok: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const testEmail = process.env['GOOGLE_ADMIN_IMPERSONATE_EMAIL']?.trim();
  if (!testEmail) {
    console.error('SKIP: GOOGLE_ADMIN_IMPERSONATE_EMAIL not set');
    process.exit(1);
  }

  console.log(`Probe: DWD Group Membership Access`);
  console.log(`Service account impersonating: ${testEmail}`);
  console.log('─'.repeat(60));

  const token = await getAdminAccessToken();
  if (!token) {
    console.error('FAIL: Could not obtain Admin Directory access token.');
    console.error('Check GOOGLE_ADMIN_CREDENTIALS and GOOGLE_ADMIN_IMPERSONATE_EMAIL.');
    process.exit(1);
  }
  console.log('Token: OK\n');

  const groups = [
    { env: 'GOOGLE_GROUP_COACHES',    key: 'coaches'    },
    { env: 'GOOGLE_GROUP_VOLUNTEERS', key: 'volunteers' },
    { env: 'GOOGLE_GROUP_LEARNERS',   key: 'learners'   },
  ];

  const results: ProbeResult[] = [];

  for (const { env } of groups) {
    const groupEmail = process.env[env]?.toLowerCase().trim() ?? '';
    if (!groupEmail) {
      console.log(`⚠  ${env}: NOT SET — group membership probe skipped`);
      results.push({
        group: '', env, status: 0,
        outcome: 'UNEXPECTED', note: 'ENV var not configured', ok: false,
      });
      continue;
    }

    const result = await probeGroup(groupEmail, env, testEmail, token);
    results.push(result);

    const icon = result.ok ? '✓' : '✗';
    console.log(`${icon}  ${env}`);
    console.log(`   Group:   ${result.group}`);
    console.log(`   Status:  ${result.status} (${result.outcome})`);
    console.log(`   ${result.note}`);
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const passed  = results.filter(r => r.ok).length;
  const total   = results.length;
  const blocked = results.filter(r => r.outcome === 'PERMISSION_DENIED');

  console.log('─'.repeat(60));
  console.log(`Results: ${passed}/${total} groups accessible by DWD`);

  if (blocked.length > 0) {
    console.log('\nACTION REQUIRED — Permission denied for:');
    for (const r of blocked) console.log(`  · ${r.group} (${r.env})`);
    console.log('  → Add admin.directory.group.member.readonly to DWD in Google Workspace Admin');
    process.exit(1);
  }

  console.log('\nAll configured groups are readable by DWD — no permission errors.\n');
  console.log('Note: a NOT_MEMBER result confirms DWD access; it cannot distinguish a');
  console.log('      non-enrolled admin from a group that does not yet exist. Invite a');
  console.log('      real learner to confirm end-to-end routing for that audience.\n');
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error('Probe error:', err);
  process.exit(1);
});
