import { Router } from "express";
import { getAdminAccessToken, getAdminUserAccessToken, getAdminDirectoryStatus } from "../lib/googleAdmin";

const router = Router();

/** Returns the configured staff group descriptors at call time (reads ENV vars). */
function getTrailOsGroups() {
  return [
    {
      tier:  'admin',
      email: (process.env['GOOGLE_GROUP_ADMIN']    ?? 'trailosadmin@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Admin',
    },
    {
      tier:  'power',
      email: (process.env['GOOGLE_GROUP_POWER']    ?? 'trailospennyadmin@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Penny Admin',
    },
    {
      tier:  'everyday',
      email: (process.env['GOOGLE_GROUP_EVERYDAY'] ?? 'trailosusers@transitiontrails.org').toLowerCase().trim(),
      label: 'Trail OS Users',
    },
  ];
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
        'In Google Workspace Admin → Security → API controls → Domain-wide delegation: add service account Unique ID with scope https://www.googleapis.com/auth/admin.directory.group.member.readonly',
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
    getTrailOsGroups().map(async g => {
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

// ── GET /admin/staff-users ────────────────────────────────────────────────────
// Returns all org users with name + email.
// Tries admin.directory.user.readonly first (needs that scope in DWD);
// falls back to aggregating unique emails from all Trail OS groups.
router.get('/admin/staff-users', async (_req, res) => {
  const status = getAdminDirectoryStatus();

  if (!status.configured) {
    res.json({ users: [], source: 'none' });
    return;
  }

  // ── Attempt 1: full user list via user.readonly scope ──────────────────────
  try {
    const userToken = await getAdminUserAccessToken();
    if (userToken) {
      const impersonate = process.env.GOOGLE_ADMIN_IMPERSONATE_EMAIL?.trim() ?? '';
      const domain = impersonate.split('@')[1] ?? 'transitiontrails.org';
      const url = `https://admin.googleapis.com/admin/directory/v1/users?domain=${encodeURIComponent(domain)}&maxResults=200&orderBy=email`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` } });
      if (r.ok) {
        const data = await r.json() as {
          users?: Array<{ primaryEmail: string; name?: { fullName?: string; givenName?: string; familyName?: string } }>;
        };
        if (data.users?.length) {
          const users = data.users.map(u => ({
            name:  u.name?.fullName ?? `${u.name?.givenName ?? ''} ${u.name?.familyName ?? ''}`.trim() ?? '',
            email: u.primaryEmail,
          })).filter(u => u.email);
          res.json({ users, source: 'directory' });
          return;
        }
      }
    }
  } catch { /* fall through to group members */ }

  // ── Attempt 2: aggregate unique emails from group members ──────────────────
  try {
    const groupToken = await getAdminAccessToken();
    if (groupToken) {
      const allMembers = await Promise.all(
        getTrailOsGroups().map(g => getGroupMembers(g.email, groupToken)),
      );
      const seen = new Set<string>();
      const users: { name: string; email: string }[] = [];
      for (const members of allMembers) {
        for (const m of members) {
          if (!seen.has(m.email)) {
            seen.add(m.email);
            // Derive a display name from email local-part (angela.landrith → Angela Landrith)
            const local = m.email.split('@')[0] ?? '';
            const name  = local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            users.push({ name, email: m.email });
          }
        }
      }
      users.sort((a, b) => a.name.localeCompare(b.name));
      res.json({ users, source: 'groups' });
      return;
    }
  } catch { /* fall through */ }

  res.json({ users: [], source: 'none' });
});

// ── GET /google/directory/user?email=… ───────────────────────────────────────
// Resolves a single user's display name from the Google Admin Directory.
// Returns { email, displayName } on success, or { email, displayName: null }
// when the directory is not configured or the user cannot be found.
// Requires a valid staff session (protected by the global staffAuthGate).
router.get('/google/directory/user', async (req, res) => {
  const email = (typeof req.query.email === 'string' ? req.query.email : '').trim();
  if (!email) {
    res.status(400).json({ error: 'email query param is required' });
    return;
  }

  const userToken = await getAdminUserAccessToken().catch(() => null);
  if (!userToken) {
    // Directory not configured — return null gracefully so callers can fall back
    res.json({ email, displayName: null });
    return;
  }

  try {
    const url = `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(email)}?projection=basic`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` } });
    if (!r.ok) {
      res.json({ email, displayName: null });
      return;
    }
    const data = await r.json() as {
      name?: { fullName?: string; givenName?: string; familyName?: string };
    };
    const displayName =
      data.name?.fullName?.trim() ||
      `${data.name?.givenName ?? ''} ${data.name?.familyName ?? ''}`.trim() ||
      null;
    res.json({ email, displayName: displayName || null });
  } catch {
    res.json({ email, displayName: null });
  }
});

export default router;
