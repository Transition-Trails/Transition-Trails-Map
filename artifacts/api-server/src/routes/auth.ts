import { Router } from "express";

const router = Router();

const TRAIL_OS_GROUPS = {
  admin:    'trailosadmin@transitiontrails.org',
  power:    'trailospennyadmin@transitiontrails.org',
  everyday: 'trailosusers@transitiontrails.org',
} as const;

const DOMAIN = 'transitiontrails.org';

function getSuperadminEmails(): string[] {
  return (process.env.TRAIL_OS_SUPERADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);
}

async function getDirectoryAccessToken(): Promise<string | null> {
  const refreshToken = process.env.GOOGLE_DIRECTORY_REFRESH_TOKEN;
  if (!refreshToken) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID     || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

async function getUserGroupEmails(email: string, accessToken: string): Promise<string[]> {
  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/groups?userKey=${encodeURIComponent(email)}&domain=${DOMAIN}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { groups?: Array<{ email: string }> };
    return (data.groups ?? []).map(g => g.email.toLowerCase());
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

  const accessToken = await getDirectoryAccessToken();

  if (accessToken) {
    const groups = await getUserGroupEmails(email, accessToken);

    if (groups.includes(TRAIL_OS_GROUPS.admin)) {
      res.json({ tier: 'admin', source: 'google-groups', groups });
      return;
    }
    if (groups.includes(TRAIL_OS_GROUPS.power)) {
      res.json({ tier: 'power', source: 'google-groups', groups });
      return;
    }
    if (groups.includes(TRAIL_OS_GROUPS.everyday)) {
      res.json({ tier: 'everyday', source: 'google-groups', groups });
      return;
    }

    if (email.endsWith(`@${DOMAIN}`)) {
      res.json({ tier: 'everyday', source: 'domain-fallback', note: 'Not in any Trail OS group — defaulting to Everyday.' });
      return;
    }

    res.status(403).json({ error: 'not-authorized', message: `Only @${DOMAIN} accounts can access Trail OS.` });
    return;
  }

  if (email.endsWith(`@${DOMAIN}`)) {
    res.json({
      tier: 'everyday',
      source: 'domain-fallback',
      note: 'GOOGLE_DIRECTORY_REFRESH_TOKEN not set — group-based tier assignment unavailable. Configure it in Admin → Setup to enable Google Groups tier mapping.',
    });
    return;
  }

  res.status(403).json({ error: 'not-authorized', message: `Only @${DOMAIN} accounts can access Trail OS.` });
});

router.get('/auth/groups-status', (_req, res) => {
  const hasToken = !!process.env.GOOGLE_DIRECTORY_REFRESH_TOKEN;
  res.json({
    directoryConfigured: hasToken,
    groups: Object.entries(TRAIL_OS_GROUPS).map(([tier, email]) => ({ tier, email })),
    domain: DOMAIN,
    superadminCount: getSuperadminEmails().length,
  });
});

export default router;
