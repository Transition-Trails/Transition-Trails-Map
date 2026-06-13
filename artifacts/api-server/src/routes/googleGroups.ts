import { Router } from "express";

const router = Router();

const TRAIL_OS_GROUPS = [
  { tier: 'admin',    email: 'trailosadmin@transitiontrails.org',      label: 'Trail OS Admin' },
  { tier: 'power',    email: 'trailospennyadmin@transitiontrails.org',  label: 'Trail OS Penny Admin' },
  { tier: 'everyday', email: 'trailosusers@transitiontrails.org',        label: 'TRAIL OS Users' },
] as const;

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

async function getGroupMembers(groupEmail: string, accessToken: string) {
  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupEmail)}/members`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { members?: Array<{ email: string; role: string; type: string }> };
    return (data.members ?? []).filter(m => m.type === 'USER');
  } catch {
    return [];
  }
}

router.get('/admin/google-groups', async (_req, res) => {
  const accessToken = await getDirectoryAccessToken();

  if (!accessToken) {
    res.json({
      configured: false,
      message: 'GOOGLE_DIRECTORY_REFRESH_TOKEN not set. Authorize Google Directory access in Admin → Setup → Google Groups.',
      groups: [],
    });
    return;
  }

  const results = await Promise.all(
    TRAIL_OS_GROUPS.map(async g => {
      const members = await getGroupMembers(g.email, accessToken);
      return {
        tier:    g.tier,
        email:   g.email,
        label:   g.label,
        members: members.map(m => ({
          email: m.email,
          role:  m.role,
        })),
        count: members.length,
      };
    })
  );

  res.json({ configured: true, groups: results, syncedAt: new Date().toISOString() });
});

export default router;
