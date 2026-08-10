import { Router } from "express";
import { getAdminAccessToken, getAdminDirectoryStatus } from "../lib/googleAdmin";

const router = Router();

/** Read staff group addresses from ENV vars at call time (with safe defaults). */
function getTrailOsGroups() {
  return {
    admin:    (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
    power:    (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
    everyday: (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
  };
}

const DOMAIN = 'transitiontrails.org';

function getSuperadminEmails(): string[] {
  return (process.env.TRAIL_OS_SUPERADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
}

/** Check group membership via members list (uses member.readonly scope only). */
async function getGroupMemberEmails(groupEmail: string, accessToken: string): Promise<string[]> {
  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const data = await res.json() as { members?: Array<{ email: string; type: string }> };
    return (data.members ?? []).filter(m => m.type === 'USER').map(m => m.email.toLowerCase());
  } catch {
    return [];
  }
}

router.get('/auth/tier', async (req, res) => {
  const email = (req.query.email as string | undefined)?.toLowerCase().trim();

  if (!email) {
    res.status(400).json({ error: 'email required' });
    return;
  }

  if (getSuperadminEmails().map(e => e.toLowerCase()).includes(email)) {
    res.json({ tier: 'superadmin', source: 'whitelist' });
    return;
  }

  const accessToken = await getAdminAccessToken();

  if (accessToken) {
    const groups = getTrailOsGroups();
    const [adminMembers, powerMembers, everydayMembers] = await Promise.all([
      getGroupMemberEmails(groups.admin,    accessToken),
      getGroupMemberEmails(groups.power,    accessToken),
      getGroupMemberEmails(groups.everyday, accessToken),
    ]);

    if (adminMembers.includes(email)) {
      res.json({ tier: 'admin', source: 'google-groups' });
      return;
    }
    if (powerMembers.includes(email)) {
      res.json({ tier: 'power', source: 'google-groups' });
      return;
    }
    if (everydayMembers.includes(email)) {
      res.json({ tier: 'everyday', source: 'google-groups' });
      return;
    }

    if (email.endsWith(`@${DOMAIN}`)) {
      res.json({
        tier: 'everyday',
        source: 'domain-fallback',
        note: `Not in any Trail OS group — defaulting to Everyday. Add ${email} to a Trail OS Google Group in Workspace Admin.`,
      });
      return;
    }

    res.status(403).json({ error: 'not-authorized', message: `Only @${DOMAIN} accounts can access Trail OS.` });
    return;
  }

  if (email.endsWith(`@${DOMAIN}`)) {
    res.json({
      tier: 'everyday',
      source: 'domain-fallback',
      note: 'Google Admin Directory not configured — group-based tier assignment unavailable. Set GOOGLE_ADMIN_CREDENTIALS + GOOGLE_ADMIN_IMPERSONATE_EMAIL in Replit Secrets.',
    });
    return;
  }

  res.status(403).json({ error: 'not-authorized', message: `Only @${DOMAIN} accounts can access Trail OS.` });
});

router.get('/auth/groups-status', (_req, res) => {
  const status = getAdminDirectoryStatus();
  res.json({
    directoryConfigured: status.configured,
    directoryMethod:     status.method,
    serviceAccountEmail: status.serviceAccountEmail,
    groups: Object.entries(getTrailOsGroups()).map(([tier, email]) => ({ tier, email })),
    domain: DOMAIN,
    superadminCount: getSuperadminEmails().length,
  });
});

export default router;
