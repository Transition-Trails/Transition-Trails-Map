import { useState, useMemo, useEffect } from 'react';
import {
  Users as UsersIcon, Search, X, ChevronRight,
  Clock, Shield, Star,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

type Role   = 'Learner' | 'Coach' | 'Volunteer' | 'Staff';
type Status = 'active' | 'inactive' | 'never';

interface UserEntry {
  email:       string;
  name:        string;
  role:        Role;
  status:      Status;
  tier:        string | null;
  coachLevel:  string | null;
  sfContactId: string | null;
  lastLoginAt: string | null;
}

interface AuditRow {
  id:          number;
  eventType:   string;
  actorEmail:  string;
  targetEmail: string | null;
  audience:    string | null;
  ipAddress:   string | null;
  metadata:    Record<string, unknown> | null;
  createdAt:   string;
}

type RoleFilter   = 'all' | Role;
type StatusFilter = 'all' | Status;

// ── Style maps ────────────────────────────────────────────────────────────────

const ROLE_STYLE: Record<Role, string> = {
  Staff:     'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',
  Coach:     'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',
  Volunteer: 'bg-[#F3EEF8] border-[#C4A8E0] text-[#6B3FA0]',
  Learner:   'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]',
};

const STATUS_STYLE: Record<Status, string> = {
  active:   'bg-[#E6F0EA] border-[#9FC3AE] text-[#2F6B3F]',
  inactive: 'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',
  never:    'bg-muted border-border text-muted-foreground',
};

const STATUS_LABEL: Record<Status, string> = {
  active:   'Active',
  inactive: 'Inactive',
  never:    'Never',
};

const TIER_STYLE: Record<string, string> = {
  superadmin: 'bg-primary/10 border-primary/20 text-primary',
  admin:      'bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400]',
  power:      'bg-[#EDF5F8] border-[#7FAFC6] text-[#2F6F7E]',
  everyday:   'bg-muted border-border text-muted-foreground',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, role }: { name: string; role: Role }) {
  const colors: Record<Role, string> = {
    Staff:     'bg-[#D5E8EF] text-[#2F6F7E]',
    Coach:     'bg-[#FFF3E0] text-[#CC8400]',
    Volunteer: 'bg-[#F3EEF8] text-[#6B3FA0]',
    Learner:   'bg-[#E6F0EA] text-[#2F6B3F]',
  };
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${colors[role]}`}>
      {initials(name)}
    </div>
  );
}

function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-muted-foreground/50 text-[13px]">—</span>;
  try {
    return (
      <span className="text-[13px] text-foreground" title={new Date(iso).toLocaleString()}>
        {formatDistanceToNow(new Date(iso), { addSuffix: true })}
      </span>
    );
  } catch {
    return <span className="text-[13px] text-muted-foreground">{iso}</span>;
  }
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  onClose,
}: {
  user: UserEntry;
  onClose: () => void;
}) {
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/audit-log?actorEmail=${encodeURIComponent(user.email)}&limit=20`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { rows: AuditRow[] }) => setAuditRows(data.rows))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [user.email]);

  return (
    <div className="w-80 border-l border-border flex flex-col bg-card flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-[13px] font-semibold text-foreground">User Detail</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <Avatar name={user.name} role={user.role} />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[12px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${ROLE_STYLE[user.role]}`}>
              {user.role}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${STATUS_STYLE[user.status]}`}>
              {STATUS_LABEL[user.status]}
            </span>
            {user.tier && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${TIER_STYLE[user.tier] ?? 'bg-muted border-border text-muted-foreground'}`}>
                {user.tier}
              </span>
            )}
            {user.coachLevel && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-[#FFF3E0] border-[#FFD08A] text-[#CC8400] capitalize">
                {user.coachLevel}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-1.5 text-[13px]">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">Last login:</span>
              <RelativeTime iso={user.lastLoginAt} />
            </div>
            {user.sfContactId && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">SF Contact:</span>
                <span className="font-mono text-[11px] text-foreground">{user.sfContactId}</span>
              </div>
            )}
          </div>

          {/* Audit log */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide mb-2">
              Recent Activity
            </p>
            {loading && (
              <p className="text-[13px] text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p className="text-[13px] text-destructive">{error}</p>
            )}
            {!loading && !error && auditRows.length === 0 && (
              <p className="text-[13px] text-muted-foreground/60">No activity recorded yet.</p>
            )}
            {!loading && !error && auditRows.length > 0 && (
              <div className="space-y-1.5">
                {auditRows.map(row => (
                  <div key={row.id} className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground capitalize">
                        {row.eventType.replace(/_/g, ' ')}
                      </p>
                      {row.audience && (
                        <p className="text-[11px] text-muted-foreground capitalize">{row.audience}</p>
                      )}
                    </div>
                    <RelativeTime iso={row.createdAt} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,      setUsers]      = useState<UserEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [syncedAt,   setSyncedAt]   = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected,   setSelected]   = useState<UserEntry | null>(null);

  function loadUsers() {
    setLoading(true);
    setError(null);
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { users: UserEntry[]; syncedAt: string }) => {
        setUsers(data.users);
        setSyncedAt(data.syncedAt);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    let rows = users;
    if (roleFilter !== 'all')   rows = rows.filter(u => u.role   === roleFilter);
    if (statusFilter !== 'all') rows = rows.filter(u => u.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [users, roleFilter, statusFilter, search]);

  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    never:    users.filter(u => u.status === 'never').length,
    staff:    users.filter(u => u.role === 'Staff').length,
    coaches:  users.filter(u => u.role === 'Coach').length,
    volunteers: users.filter(u => u.role === 'Volunteer').length,
    learners: users.filter(u => u.role === 'Learner').length,
  }), [users]);

  const hasFilters = roleFilter !== 'all' || statusFilter !== 'all' || search.trim() !== '';

  const ROLE_OPTIONS: { key: RoleFilter; label: string }[] = [
    { key: 'all',       label: 'All roles' },
    { key: 'Staff',     label: 'Staff' },
    { key: 'Coach',     label: 'Coach' },
    { key: 'Volunteer', label: 'Volunteer' },
    { key: 'Learner',   label: 'Learner' },
  ];

  const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: 'All status' },
    { key: 'active',   label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'never',    label: 'Never signed in' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Administration</span>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <h1 className="text-base font-semibold text-foreground mt-0.5">User Directory</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          All Trail OS users — staff, coaches, volunteers, and learners — with last login status.
          {syncedAt && (
            <span className="ml-2 text-muted-foreground/50">
              Synced <RelativeTime iso={syncedAt} />
            </span>
          )}
        </p>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { label: 'Total',     value: stats.total,     cls: '' },
            { label: 'Active',    value: stats.active,    cls: 'text-[#2F6B3F]' },
            { label: 'Inactive',  value: stats.inactive,  cls: 'text-[#CC8400]' },
            { label: 'Never',     value: stats.never,     cls: 'text-muted-foreground' },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${s.cls || 'text-foreground'}`}>{s.value}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
          <div className="w-px h-4 bg-border/60 mx-1" />
          {[
            { label: 'Staff',     value: stats.staff     },
            { label: 'Coaches',   value: stats.coaches   },
            { label: 'Volunteers',value: stats.volunteers },
            { label: 'Learners',  value: stats.learners  },
          ].map(s => (
            <div key={s.label} className="flex items-baseline gap-1">
              <span className="text-base font-semibold text-foreground">{s.value}</span>
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter toolbar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-card px-5 py-2">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-6 pr-2 py-1 text-[13px] rounded-md border border-border bg-background text-foreground placeholder-muted-foreground/50 outline-none focus:border-ring w-52"
            />
          </div>

          {/* Role pills */}
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-muted-foreground/50 mr-0.5">Role</span>
            {ROLE_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setRoleFilter(o.key)}
                className={`px-2 py-0.5 rounded-full border text-[12px] font-semibold transition-all ${
                  roleFilter === o.key
                    ? 'bg-foreground border-foreground text-background'
                    : 'bg-card border-border text-muted-foreground hover:border-ring/50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Status select */}
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-muted-foreground/50">Status</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="text-[12px] rounded-md border border-border bg-background text-foreground px-1.5 py-0.5 outline-none focus:border-ring"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Row count + clear */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              {filtered.length === users.length
                ? `${users.length} users`
                : `${filtered.length} / ${users.length}`}
            </span>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
                className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table + detail panel ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-[14px] text-muted-foreground">
              Loading users…
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-32 text-[14px] text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && (
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-card border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70 w-56">Name</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70 w-56">Email</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70 w-28">Role</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70 w-24">Status</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70 w-36">Permissions</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold text-muted-foreground/70">Last Login</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-12 text-center text-[14px] text-muted-foreground">
                      No users match the current filters.
                    </td>
                  </tr>
                )}
                {filtered.map((user, i) => {
                  const isActive = selected?.email === user.email;
                  return (
                    <tr
                      key={user.email}
                      onClick={() => setSelected(isActive ? null : user)}
                      className={`border-b border-border/60 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-foreground text-background'
                          : i % 2 === 0
                          ? 'bg-card hover:bg-muted/30'
                          : 'bg-muted/20 hover:bg-muted/40'
                      }`}
                    >
                      {/* Name + avatar */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={user.name} role={user.role} />
                          <span className={`font-medium truncate max-w-[160px] ${isActive ? 'text-background' : 'text-foreground'}`}>
                            {user.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-2.5">
                        <span className={`truncate max-w-[200px] block ${isActive ? 'text-background/80' : 'text-muted-foreground'}`}>
                          {user.email}
                        </span>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                          isActive ? 'bg-background/20 border-background/30 text-background' : ROLE_STYLE[user.role]
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status chip */}
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                          isActive ? 'bg-background/20 border-background/30 text-background' : STATUS_STYLE[user.status]
                        }`}>
                          {STATUS_LABEL[user.status]}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {user.tier && (
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border capitalize ${
                              isActive ? 'bg-background/20 border-background/30 text-background' : (TIER_STYLE[user.tier] ?? 'bg-muted border-border text-muted-foreground')
                            }`}>
                              {user.tier === 'superadmin' ? <Star className="w-3 h-3 inline mr-0.5" /> : null}
                              {user.tier}
                            </span>
                          )}
                          {user.coachLevel && (
                            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border capitalize ${
                              isActive ? 'bg-background/20 border-background/30 text-background' : 'bg-muted border-border text-muted-foreground'
                            }`}>
                              {user.coachLevel}
                            </span>
                          )}
                          {!user.tier && !user.coachLevel && (
                            <span className={`text-[12px] ${isActive ? 'text-background/50' : 'text-muted-foreground/40'}`}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-2.5">
                        {user.lastLoginAt ? (
                          <span className={`text-[13px] ${isActive ? 'text-background/80' : 'text-foreground'}`}
                                title={new Date(user.lastLoginAt).toLocaleString()}>
                            {(() => {
                              try { return formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }); }
                              catch { return user.lastLoginAt; }
                            })()}
                          </span>
                        ) : (
                          <span className={`text-[13px] ${isActive ? 'text-background/50' : 'text-muted-foreground/40'}`}>—</span>
                        )}
                      </td>

                      {/* Chevron */}
                      <td className="px-2 py-2.5">
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-background/50' : 'text-muted-foreground/30'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <UserDetailPanel user={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  );
}
