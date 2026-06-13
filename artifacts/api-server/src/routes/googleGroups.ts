import { Router } from "express";
import { getAdminAccessToken, getAdminDirectoryStatus } from "../lib/googleAdmin";

const router = Router();

const TRAIL_OS_GROUPS = [
  { tier: 'admin',    email: 'trailosadmin@transitiontrails.org',      label: 'Trail OS Admin' },
  { tier: 'power',    email: 'trailospennyadmin@transitiontrails.org',  label: 'Trail OS Penny Admin' },
  { tier: 'everyday', email: 'trailosusers@transitiontrails.org',        label: 'Trail OS Users' },
] as const;

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
  const status = getAdminDirectoryStatus();

  if (!status.configured) {
    res.json({
      configured: false,
      method: status.method,
      message: 'Google Admin Directory not configured. Set GOOGLE_ADMIN_CREDENTIALS (service account JSON key) and GOOGLE_ADMIN_IMPERSONATE_EMAIL in Replit Secrets, then restart the API server.',
      setupSteps: [
        'GCP Console → IAM & Admin → Service Accounts → Create service account',
        'Enable domain-wide delegation on the service account',
        'Enable "Admin SDK API" in GCP Console → APIs & Services → Library',
        'In Google Workspace Admin → Security → API controls → Domain-wide delegation: add service account client ID with scope https://www.googleapis.com/auth/admin.directory.group.member.readonly',
        'Download the service account JSON key and set it as GOOGLE_ADMIN_CREDENTIALS in Replit Secrets',
        'Set GOOGLE_ADMIN_IMPERSONATE_EMAIL to a Google Workspace admin email (e.g. admin@transitiontrails.org)',
      ],
      groups: [],
    });
    return;
  }

  const accessToken = await getAdminAccessToken();

  if (!accessToken) {
    res.json({
      configured: false,
      method: status.method,
      message: 'Directory credentials found but token exchange failed — check that the service account has domain-wide delegation enabled and the correct scope.',
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
        members: members.map(m => ({ email: m.email, role: m.role })),
        count:   members.length,
      };
    })
  );

  res.json({
    configured:  true,
    method:      status.method,
    serviceAccountEmail: status.serviceAccountEmail,
    groups:      results,
    syncedAt:    new Date().toISOString(),
  });
});

export default router;
