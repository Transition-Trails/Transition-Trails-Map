import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink,
  RefreshCw, Lock, Key, ChevronRight, Eye, EyeOff, ArrowRight,
  Globe, HardDrive, Calendar, Mail, Zap, Info, TriangleAlert, Users,
  CircleAlert, Search, ChevronDown,
} from 'lucide-react';
import { useLocation } from 'wouter';

// ── Scope metadata — drives the Step 3 table from info.scopes ────────────────
// Keys are the full scope URLs returned by the API (plus 'openid' / 'email').
// If the server adds or removes a scope, this table will reflect it automatically.

const SCOPE_META: Record<string, { short: string; icon: React.ReactNode; label: string }> = {
  'https://www.googleapis.com/auth/drive.readonly':    { short: 'drive.readonly',    icon: <HardDrive className="w-3.5 h-3.5" />, label: 'Read program folders and documents' },
  'https://www.googleapis.com/auth/drive.file':        { short: 'drive.file',        icon: <HardDrive className="w-3.5 h-3.5" />, label: 'Create and write Penny source files' },
  'https://www.googleapis.com/auth/calendar.readonly': { short: 'calendar.readonly', icon: <Calendar  className="w-3.5 h-3.5" />, label: 'Read cohort and program calendars' },
  'https://www.googleapis.com/auth/calendar.events':   { short: 'calendar.events',   icon: <Calendar  className="w-3.5 h-3.5" />, label: 'Create Penny reminder events' },
  'https://www.googleapis.com/auth/gmail.send':        { short: 'gmail.send',        icon: <Mail      className="w-3.5 h-3.5" />, label: 'Send emails via Penny draft flow' },
  'openid':                                            { short: 'openid + email',    icon: <Shield    className="w-3.5 h-3.5" />, label: 'Identify the authorizing Google account' },
  'email':                                             { short: 'email',             icon: <Shield    className="w-3.5 h-3.5" />, label: '(grouped with openid)' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface OAuthInfo {
  redirectUri: string;
  scopes: string[];
  scopeDisplay: string;
  credentials: { clientId: boolean; clientSecret: boolean; ok: boolean };
  tokens: { drive: boolean; calendar: boolean; gmail: boolean };
  authUrl: string | null;
  status: 'credentials_missing' | 'awaiting_oauth' | 'partially_authorized' | 'fully_authorized';
}

interface TokenSession {
  refreshToken: string;
  scopesGranted: string;
  email: string;
  warning: string;
  instructions: { drive: string; calendar: string; restart: string };
}

// ── Status badge ──────────────────────────────────────────────────────────────

type AuthTier = 'not_configured' | 'credentials_ready' | 'oauth_complete' | 'token_present' | 'integration_ready';

const TIER_CONFIG: Record<AuthTier, { label: string; cls: string }> = {
  not_configured:    { label: 'Not Configured',    cls: 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]' },
  credentials_ready: { label: 'Credentials Ready', cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]' },
  oauth_complete:    { label: 'OAuth Complete',     cls: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]' },
  token_present:     { label: 'Refresh Token Set',  cls: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]' },
  integration_ready: { label: 'Integration Ready',  cls: 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]' },
};

function TierBadge({ tier }: { tier: AuthTier }) {
  const { label, cls } = TIER_CONFIG[tier];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border  ${cls}`}>{label}</span>;
}

// ── 5-step readiness ladder ───────────────────────────────────────────────────

interface StepDef { icon: React.ReactNode; label: string; sub: string; }
const STEPS: StepDef[] = [
  { icon: <Key className="w-4 h-4" />,        label: 'Secret Present',    sub: 'GOOGLE_CLIENT_ID + SECRET in Replit Secrets' },
  { icon: <Shield className="w-4 h-4" />,     label: 'Credential Valid',  sub: 'Format check passes, Google reachable' },
  { icon: <Globe className="w-4 h-4" />,      label: 'API Reachable',     sub: 'accounts.google.com responds' },
  { icon: <Lock className="w-4 h-4" />,       label: 'OAuth Complete',    sub: 'Authorization flow completed, refresh token obtained' },
  { icon: <CheckCircle className="w-4 h-4" />, label: 'Integration Ready', sub: 'Refresh token stored, API calls work' },
];

function ReadinessLadder({ step }: { step: number }) {
  return (
    <div className="flex items-start gap-0">
      {STEPS.map((s, i) => {
        const done   = i < step;
        const active = i === step;
        const cls = done   ? 'bg-[#E6F0EA]0 text-white border-[#E6F0EA]0'
                 : active  ? 'bg-primary text-primary-foreground border-primary'
                 :           'bg-white text-muted-foreground border-border';
        return (
          <div key={i} className="flex items-center">
            {i > 0 && <div className={`h-px w-6 ${done ? 'bg-[#2F6B3F]' : 'bg-border'}`} />}
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${cls}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s.icon}
              </div>
              <span className={`text-[14px] font-bold text-center leading-tight  ${done ? 'text-[#2F6B3F]' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              <span className="text-[14px] text-muted-foreground/70 text-center leading-tight hidden sm:block px-0.5">
                {s.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={doCopy}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[14px] font-semibold border transition-colors ${copied ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]' : 'border-border bg-white text-muted-foreground hover:bg-muted/40'}`}>
      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Masked token row ──────────────────────────────────────────────────────────

function TokenRow({ label, secretName, value }: { label: string; secretName: string; value: string }) {
  const [revealed, setRevealed] = useState(true);
  return (
    <div className="rounded-lg border border-[#FFD08A] bg-[#FFF3E0] p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Key className="w-3.5 h-3.5 text-[#CC8400] shrink-0" />
        <span className="text-[14px] font-bold text-[#CC8400]">{label}</span>
        <code className="text-[14px] font-mono bg-white border border-[#FFD08A] text-[#CC8400] px-1.5 py-0.5 rounded ml-auto">{secretName}</code>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[14px] font-mono bg-white border-2 border-[#FFD08A] rounded px-2 py-2 break-all select-all">
          {revealed ? value : '•'.repeat(Math.min(value.length, 48))}
        </code>
        <div className="flex flex-col gap-1 shrink-0">
          <CopyButton text={value} label="Copy" />
          <button onClick={() => setRevealed(r => !r)}
            className="flex items-center gap-1 px-2 py-1.5 rounded border border-[#FFD08A] bg-white text-[14px] font-semibold text-[#CC8400] hover:bg-[#FFF3E0]">
            {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {revealed ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <p className="text-[14px] text-[#CC8400] leading-snug font-medium">
        ① Click <strong>Copy</strong> above &nbsp;②&nbsp; Open Replit Secrets (🔒 lock in left sidebar) &nbsp;③&nbsp; Add secret name <strong>{secretName}</strong> and paste the value.
      </p>
    </div>
  );
}

// ── URL Inspector ─────────────────────────────────────────────────────────────

function UrlInspector({ authUrl }: { authUrl: string }) {
  const [open, setOpen] = useState(false);

  let parsed: Record<string, string> = {};
  let clientIdDisplay = '';
  try {
    const u = new URL(authUrl);
    u.searchParams.forEach((v, k) => { parsed[k] = v; });
    const cid = parsed['client_id'] ?? '';
    clientIdDisplay = cid.length > 12
      ? `${cid.slice(0, 6)}…${cid.slice(-6)}`
      : cid;
  } catch {
    clientIdDisplay = '(parse error)';
  }

  const checks: { key: string; expected: string; actual: string; ok: boolean }[] = [
    { key: 'response_type', expected: 'code',    actual: parsed['response_type'] ?? '—', ok: parsed['response_type'] === 'code' },
    { key: 'access_type',   expected: 'offline', actual: parsed['access_type'] ?? '—',   ok: parsed['access_type'] === 'offline' },
    { key: 'prompt',        expected: 'consent', actual: parsed['prompt'] ?? '—',         ok: parsed['prompt'] === 'consent' },
    { key: 'redirect_uri',  expected: '(your app URL)',   actual: parsed['redirect_uri'] ? '✓ present' : '—', ok: !!parsed['redirect_uri'] },
    { key: 'client_id',     expected: '(configured)',     actual: clientIdDisplay,         ok: !!parsed['client_id'] },
    { key: 'scope (drive)',     expected: 'drive scope present',     actual: (parsed['scope'] ?? '').includes('drive') ? '✓' : '✗',  ok: (parsed['scope'] ?? '').includes('drive') },
    { key: 'scope (calendar)',  expected: 'calendar scope present',  actual: (parsed['scope'] ?? '').includes('calendar') ? '✓' : '✗', ok: (parsed['scope'] ?? '').includes('calendar') },
  ];

  const allOk = checks.every(c => c.ok);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="text-[14px] font-bold text-slate-700 flex-1">Inspect Authorization URL</span>
        {allOk
          ? <span className="text-[14px] font-semibold text-[#2F6B3F] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> All parameters correct</span>
          : <span className="text-[14px] font-semibold text-[#A93F2F] flex items-center gap-1"><XCircle className="w-3 h-3" /> Parameter issue detected</span>
        }
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-2">
          <p className="text-[14px] text-slate-600 leading-snug mb-2">
            Verifying that the generated URL includes all required parameters for offline access and refresh token issuance.
            <span className="ml-1 text-slate-500">(client_id is public — it is safe to share; client_secret is never in the URL)</span>
          </p>
          <div className="space-y-1">
            {checks.map(c => (
              <div key={c.key} className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 bg-white text-[14px]">
                {c.ok
                  ? <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0" />
                  : <XCircle    className="w-3.5 h-3.5 text-[#A93F2F] shrink-0" />}
                <code className="font-mono text-slate-700 w-32 shrink-0">{c.key}</code>
                <span className={`font-semibold ${c.ok ? 'text-[#2F6B3F]' : 'text-[#A93F2F]'}`}>{c.actual}</span>
                {!c.ok && <span className="text-slate-400 ml-1">expected: {c.expected}</span>}
              </div>
            ))}
          </div>
          {!allOk && (
            <div className="rounded border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2 mt-1">
              <p className="text-[14px] text-[#A93F2F] leading-snug">
                One or more URL parameters are missing or incorrect. This can cause the flow to fail or not return a refresh token.
                Click <strong>Refresh Status</strong> above to reload, or contact support if the issue persists.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 403 / Access Denied Troubleshooter ───────────────────────────────────────

function AccessDeniedPanel({ forceOpen = false }: { forceOpen?: boolean }) {
  const [open, setOpen] = useState(forceOpen);

  const items = [
    {
      id: 'testing-mode',
      icon: <Users className="w-4 h-4" />,
      title: 'OAuth app is in "Testing" mode — your account must be a Test User',
      severity: 'critical' as const,
      detail: (
        <div className="space-y-2 text-[14px] text-slate-700 leading-snug">
          <p>
            <strong>This is the most common cause of "We're sorry, you do not have access."</strong>{' '}
            When the OAuth consent screen is in <em>Testing</em> publishing status, only Google accounts
            explicitly listed as test users are allowed to authorize.
          </p>
          <p className="font-semibold">Fix — two options:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>
              <strong>Add your account as a Test User (fastest):</strong>{' '}
              Go to{' '}
              <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer"
                className="text-[#2F6F7E] underline hover:text-[#2F6F7E] inline-flex items-center gap-0.5">
                OAuth Consent Screen <ExternalLink className="w-3 h-3" />
              </a>
              {' '}→ scroll to <em>Test users</em> → click <strong>+ Add Users</strong> → enter your Google account email → Save.
              Then retry the authorization.
            </li>
            <li>
              <strong>Publish the app (for production):</strong>{' '}
              On the same OAuth Consent Screen page, click <strong>Publish App</strong> under the Publishing Status section.
              Note: sensitive scopes (Drive, Calendar) will require Google verification for external users, but internal Google Workspace apps can publish without review.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'apis-not-enabled',
      icon: <Zap className="w-4 h-4" />,
      title: 'Google Drive API or Calendar API not enabled in the project',
      severity: 'critical' as const,
      detail: (
        <div className="space-y-2 text-[14px] text-slate-700 leading-snug">
          <p>
            Even if the OAuth client is configured, the APIs themselves must be enabled in the same GCP project.
            Missing API enablement can cause 403 access errors or silent failures after authorization.
          </p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>
              Go to{' '}
              <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer"
                className="text-[#2F6F7E] underline hover:text-[#2F6F7E] inline-flex items-center gap-0.5">
                Google Drive API <ExternalLink className="w-3 h-3" />
              </a>
              {' '}→ confirm it shows <strong>Enabled</strong>, or click Enable.
            </li>
            <li>
              Go to{' '}
              <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer"
                className="text-[#2F6F7E] underline hover:text-[#2F6F7E] inline-flex items-center gap-0.5">
                Google Calendar API <ExternalLink className="w-3 h-3" />
              </a>
              {' '}→ confirm it shows <strong>Enabled</strong>, or click Enable.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'redirect-uri',
      icon: <Globe className="w-4 h-4" />,
      title: 'Redirect URI not registered — causes redirect_uri_mismatch',
      severity: 'warning' as const,
      detail: (
        <div className="space-y-1 text-[14px] text-slate-700 leading-snug">
          <p>
            The exact redirect URI shown in Step 2 below must be registered under <em>Authorized redirect URIs</em> on your OAuth 2.0 Client ID.
            Even a trailing slash difference will cause a mismatch error.
          </p>
          <p>
            Go to{' '}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
              className="text-[#2F6F7E] underline hover:text-[#2F6F7E] inline-flex items-center gap-0.5">
              APIs &amp; Services → Credentials <ExternalLink className="w-3 h-3" />
            </a>
            {' '}→ click your OAuth 2.0 Client ID → under <em>Authorized redirect URIs</em>, add the URI from Step 2 exactly as shown.
          </p>
        </div>
      ),
    },
    {
      id: 'wrong-project',
      icon: <CircleAlert className="w-4 h-4" />,
      title: 'OAuth client is in the wrong GCP project or a different Google account',
      severity: 'warning' as const,
      detail: (
        <div className="space-y-1 text-[14px] text-slate-700 leading-snug">
          <p>
            The GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET stored in Replit Secrets must belong to the same GCP project that has
            Drive and Calendar APIs enabled. If you recently created a new OAuth client in a different project, update both secrets.
          </p>
          <p>
            Also confirm you are signing in with the Google account that <strong>owns or has access to</strong> the Workspace/Drive/Calendar
            you intend to authorize. Authorizing with a personal account when your files live in a Workspace org may restrict access.
          </p>
        </div>
      ),
    },
    {
      id: 'workspace-restriction',
      icon: <Shield className="w-4 h-4" />,
      title: 'Google Workspace admin has restricted third-party OAuth apps',
      severity: 'info' as const,
      detail: (
        <div className="space-y-1 text-[14px] text-slate-700 leading-snug">
          <p>
            Some Google Workspace organizations block OAuth authorization for unverified or non-allowlisted apps.
            If your Google account is a <em>@yourcompany.com</em> Workspace account, your admin may need to allowlist
            the OAuth client ID or mark the app as trusted in the{' '}
            <a href="https://admin.google.com/ac/owl/list?tab=apps" target="_blank" rel="noopener noreferrer"
              className="text-[#2F6F7E] underline hover:text-[#2F6F7E] inline-flex items-center gap-0.5">
              Google Admin Console <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
          <p>
            Alternatively, set the consent screen <em>User Type</em> to <strong>Internal</strong> (available for Google Workspace orgs) —
            this restricts usage to your org's accounts but removes the need for app verification and bypasses some restrictions.
          </p>
        </div>
      ),
    },
  ];

  const severityStyle = {
    critical: { badge: 'bg-[#FBEAE6] text-[#A93F2F] border-[#E8B9B4]', dot: 'bg-[#FBEAE6]0' },
    warning:  { badge: 'bg-[#FFF3E0] text-[#CC8400] border-[#FFD08A]', dot: 'bg-[#CC8400]' },
    info:     { badge: 'bg-[#EDF5F8] text-[#2F6F7E] border-[#7FAFC6]', dot: 'bg-[#2F6F7E]' },
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${forceOpen ? 'border-[#E8B9B4]' : 'border-[#FFD08A]'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors ${forceOpen ? 'bg-[#FBEAE6] hover:bg-[#FBEAE6]' : 'bg-[#FFF3E0] hover:bg-[#FFF3E0]'}`}
      >
        <TriangleAlert className={`w-4 h-4 shrink-0 ${forceOpen ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`} />
        <div className="flex-1">
          <p className={`text-[14px] font-bold ${forceOpen ? 'text-[#A93F2F]' : 'text-[#CC8400]'}`}>
            {forceOpen ? '403 Access Denied — Troubleshooting Checklist' : 'Pre-flight: Common 403 Causes — Review Before Authorizing'}
          </p>
          {forceOpen && (
            <p className="text-[14px] text-[#A93F2F] mt-0.5">
              Google returned "We're sorry, you do not have access." Check each item below — the most common cause is #1.
            </p>
          )}
        </div>
        <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border ${severityStyle.critical.badge}`}>{items.filter(i => i.severity === 'critical').length} Critical</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-[#CC8400] transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="border-t border-[#FFD08A] divide-y divide-slate-100">
          {items.map((item, idx) => (
            <ItemAccordion key={item.id} item={item} idx={idx} severityStyle={severityStyle} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemAccordion({
  item,
  idx,
  severityStyle,
}: {
  item: {
    id: string;
    icon: React.ReactNode;
    title: string;
    severity: 'critical' | 'warning' | 'info';
    detail: React.ReactNode;
  };
  idx: number;
  severityStyle: Record<string, { badge: string; dot: string }>;
}) {
  const [open, setOpen] = useState(idx < 2);
  return (
    <div className="bg-white">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityStyle[item.severity].dot}`} />
        <span className="text-slate-500 shrink-0">{item.icon}</span>
        <span className="text-[14px] font-semibold text-slate-800 flex-1 text-left leading-snug">{item.title}</span>
        <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border  shrink-0 ${severityStyle[item.severity].badge}`}>
          {item.severity}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0 ml-6 border-l-2 border-slate-100 ml-[18px]">
          {item.detail}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GoogleOAuthFlow() {
  const [, navigate] = useLocation();

  // URL state from OAuth redirect
  const params      = new URLSearchParams(window.location.search);
  const urlStatus   = params.get('status');
  const sessionId   = params.get('session');
  const urlError    = params.get('error');
  const is403       = urlError
    ? (decodeURIComponent(urlError).toLowerCase().includes('access') ||
       decodeURIComponent(urlError).toLowerCase().includes('403'))
    : false;

  const [info, setInfo]               = useState<OAuthInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [tokenSession, setTokenSession] = useState<TokenSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const loadInfo = useCallback(() => {
    setInfoLoading(true);
    fetch('/api/google/oauth/info')
      .then(r => r.json() as Promise<OAuthInfo>)
      .then(d => { setInfo(d); setInfoLoading(false); })
      .catch(() => setInfoLoading(false));
  }, []);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  // If returning from OAuth with a session ID — fetch the token (one-time)
  useEffect(() => {
    if (urlStatus === 'success' && sessionId && !tokenSession && !sessionLoading && !sessionError) {
      setSessionLoading(true);
      fetch(`/api/google/oauth/session/${encodeURIComponent(sessionId)}`)
        .then(r => r.json() as Promise<TokenSession & { error?: string }>)
        .then(d => {
          if (d.error) { setSessionError(d.error); }
          else         { setTokenSession(d); }
          setSessionLoading(false);
        })
        .catch(e => { setSessionError(String(e)); setSessionLoading(false); });
    }
  }, [urlStatus, sessionId, tokenSession, sessionLoading, sessionError]);

  // Current readiness step
  const step: number = !info ? 0
    : !info.credentials.ok ? 0
    : !info.tokens.drive && !info.tokens.calendar ? (urlStatus === 'success' || tokenSession ? 3 : 2)
    : info.tokens.drive && info.tokens.calendar ? 5
    : 4;  // partial — one token present

  const tier: AuthTier = step === 0 ? 'not_configured'
    : step <= 2 ? 'credentials_ready'
    : step === 3 ? 'oauth_complete'
    : step === 4 ? 'token_present'
    : 'integration_ready';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 text-[14px] text-muted-foreground mb-1.5">
          <button onClick={() => navigate('/admin/integrations/secrets')} className="hover:text-foreground">Integration Secrets Audit</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-semibold">Google Authorization</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-[#2F6F7E]" />
          <h1 className="text-[15px] font-semibold text-foreground">Google OAuth Authorization</h1>
          <TierBadge tier={tier} />
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Authorize Trail OS to access Google Drive and Google Calendar on behalf of your workspace.
          This generates a <strong>refresh token</strong> you'll store in Replit Secrets — no token values are ever logged or stored server-side.
        </p>
      </div>

      {/* ── Service-access notice ─────────────────────────────────────────────── */}
      <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2.5 shrink-0">
        <Info className="w-3.5 h-3.5 text-[#2F6F7E] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[14px] font-semibold text-[#2F6F7E]">This is service-level access — not how people sign in</p>
          <p className="text-[14px] text-[#2F6F7E]/80 mt-0.5 leading-snug">
            This wizard grants <strong>Trail OS the application</strong> access to Drive, Calendar, and Gmail so it can read documents and send notifications.
            It is a one-time administrator task. <strong>Staff sign in to Trail OS using the Google Sign-In button on the login page</strong>, which uses a separate per-user flow backed by Google Group membership.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
        <button onClick={loadInfo} disabled={infoLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[14px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${infoLoading ? 'animate-spin' : ''}`} />
          {infoLoading ? 'Checking…' : 'Refresh Status'}
        </button>
        <button onClick={() => navigate('/admin/integrations/secrets')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[14px] font-medium border border-border bg-white hover:bg-muted/30">
          ← Back to Secrets Audit
        </button>
        {info && (
          <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded border text-[14px] font-semibold ${info.tokens.drive && info.tokens.calendar && info.tokens.gmail ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]' : 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]'}`}>
            {info.tokens.drive && info.tokens.calendar && info.tokens.gmail ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Drive: {info.tokens.drive ? '✓' : '✗'} · Calendar: {info.tokens.calendar ? '✓' : '✗'} · Gmail: {info.tokens.gmail ? '✓' : '✗'}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-3xl">

          {/* 5-step readiness ladder */}
          <div className="rounded-lg border border-border bg-white p-5 overflow-x-auto">
            <p className="text-[14px] font-bold  text-foreground mb-4">Authorization Progress</p>
            <ReadinessLadder step={step} />
          </div>

          {/* ── 403 ERROR from OAuth redirect ───────────────────────────── */}
          {urlStatus === 'error' && urlError && (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3 space-y-3">
              <div className="flex gap-3">
                <XCircle className="w-4 h-4 text-[#A93F2F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-bold text-[#A93F2F] mb-1">Authorization Failed</p>
                  <code className="text-[14px] font-mono text-[#A93F2F] leading-snug break-all block bg-white border border-[#E8B9B4] rounded px-2 py-1">
                    {decodeURIComponent(urlError)}
                  </code>
                </div>
              </div>
              {is403 && (
                <div className="rounded border border-[#E8B9B4] bg-white px-3 py-2 space-y-1">
                  <p className="text-[14px] font-bold text-[#A93F2F]">This is a Google 403 "access denied" error — the troubleshooting checklist below covers the exact causes.</p>
                  <p className="text-[14px] text-[#A93F2F] leading-snug">
                    Scroll to the <strong>403 Access Denied Troubleshooting</strong> panel below (already expanded).
                    Fix #1 (Test User) first — it resolves the vast majority of these errors in under 2 minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SUCCESS: Token display ─────────────────────────────────────── */}
          {urlStatus === 'success' && (
            <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#2F6B3F]" />
                <p className="text-[14px] font-bold text-[#245531]">Authorization Successful</p>
                {tokenSession && <span className="text-[14px] text-[#2F6B3F]">· Authorized as {tokenSession.email}</span>}
              </div>

              {sessionLoading && (
                <p className="text-[14px] text-[#2F6B3F] italic">Retrieving refresh token (one-time)…</p>
              )}
              {sessionError && (
                <div className="rounded border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2">
                  <p className="text-[14px] font-bold text-[#CC8400] mb-0.5">Token retrieval failed</p>
                  <p className="text-[14px] text-[#CC8400]">{sessionError}</p>
                </div>
              )}

              {tokenSession && (
                <div className="space-y-3">
                  <div className="rounded border border-[#9FC3AE] bg-white px-3 py-2">
                    <p className="text-[14px] font-bold text-[#245531] mb-0.5">Scopes granted by Google</p>
                    <p className="text-[14px] font-mono text-foreground break-all leading-snug">{tokenSession.scopesGranted}</p>
                  </div>

                  <div className="rounded-lg border border-[#FFD08A] bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-[#CC8400]" />
                      <p className="text-[14px] font-bold text-[#CC8400]">One Refresh Token — Add to Three Secrets</p>
                    </div>
                    <p className="text-[14px] text-[#CC8400] leading-snug">
                      Google issued a single refresh token covering all authorized scopes (Drive, Calendar, <strong>Gmail</strong>).
                      Add the <strong>same value</strong> to all three secret names below in Replit Secrets.
                    </p>
                    <TokenRow label="Google Drive"    secretName="GOOGLE_DRIVE_REFRESH_TOKEN"    value={tokenSession.refreshToken} />
                    <TokenRow label="Google Calendar" secretName="GOOGLE_CALENDAR_REFRESH_TOKEN" value={tokenSession.refreshToken} />
                    <TokenRow label="Gmail (Mail panel)" secretName="GOOGLE_GMAIL_REFRESH_TOKEN" value={tokenSession.refreshToken} />
                  </div>

                  <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] p-4 space-y-2">
                    <p className="text-[14px] font-bold text-[#2F6F7E]">Next Steps — Store &amp; Activate</p>
                    <ol className="space-y-2">
                      {[
                        'Open the Replit Secrets panel (🔒 lock icon in the left sidebar of your Repl).',
                        'Add secret: GOOGLE_DRIVE_REFRESH_TOKEN = <paste the value above>.',
                        'Add secret: GOOGLE_CALENDAR_REFRESH_TOKEN = <paste the same value>.',
                        'Add secret: GOOGLE_GMAIL_REFRESH_TOKEN = <paste the same value> — this activates the Mail panel.',
                        'Restart the API server workflow so the new secrets load into the environment.',
                        'Return here and click Refresh Status — Drive, Calendar, and Gmail should all show as authorized.',
                      ].map((text, n) => (
                        <li key={n} className="flex gap-2 text-[14px] text-[#2F6F7E] leading-snug">
                          <span className="font-bold shrink-0 w-4">{n + 1}.</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-[14px] text-muted-foreground">
                    This token is only shown once and has already been cleared from server memory. If you need to get a new token, use "Authorize with Google" again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Credential check ───────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[14px] font-bold shrink-0">1</div>
              <span className="text-[14px] font-bold text-foreground">Verify OAuth Client Credentials</span>
              {info && (
                info.credentials.ok
                  ? <span className="ml-auto flex items-center gap-1 text-[14px] font-semibold text-[#2F6B3F]"><CheckCircle className="w-3.5 h-3.5" /> Both configured</span>
                  : <span className="ml-auto flex items-center gap-1 text-[14px] font-semibold text-[#A93F2F]"><XCircle className="w-3.5 h-3.5" /> Missing credentials</span>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              {info && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'clientId',     name: 'GOOGLE_CLIENT_ID',     ok: info.credentials.clientId },
                    { key: 'clientSecret', name: 'GOOGLE_CLIENT_SECRET', ok: info.credentials.clientSecret },
                  ].map(c => (
                    <div key={c.key} className={`rounded border px-3 py-2 flex items-center gap-2 ${c.ok ? 'border-[#9FC3AE] bg-[#E6F0EA]' : 'border-[#E8B9B4] bg-[#FBEAE6]'}`}>
                      {c.ok ? <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F]" /> : <XCircle className="w-3.5 h-3.5 text-[#A93F2F]" />}
                      <div>
                        <p className="text-[14px] font-bold text-foreground">{c.name}</p>
                        <p className="text-[14px] text-muted-foreground">{c.ok ? 'Present + format valid' : 'Missing — set in Replit Secrets'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {info && !info.credentials.ok && (
                <div className="rounded border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2">
                  <p className="text-[14px] text-[#A93F2F] leading-snug">
                    Configure OAuth 2.0 credentials in{' '}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                      Google Cloud Console → APIs &amp; Services → Credentials
                    </a>.
                    Create an "OAuth 2.0 Client ID" of type "Web application", then add the redirect URI shown in Step 2.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 2: Redirect URI ──────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[14px] font-bold shrink-0">2</div>
              <span className="text-[14px] font-bold text-foreground">Add Redirect URI to Google Cloud Console</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Google requires the <strong>exact redirect URI</strong> to be pre-registered. If this URI is not registered,
                you'll get a <code className="font-mono text-[14px]">redirect_uri_mismatch</code> error.
              </p>

              {info ? (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
                  <p className="text-[14px] font-bold  text-primary mb-1.5">Redirect URI — add this exactly to GCP Console</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[14px] font-mono font-semibold text-foreground bg-white border border-border rounded px-3 py-2 break-all">
                      {info.redirectUri}
                    </code>
                    <CopyButton text={info.redirectUri} label="Copy URI" />
                  </div>
                </div>
              ) : (
                <div className="h-12 rounded-lg border border-border bg-muted/30 animate-pulse" />
              )}

              <div className="rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2 space-y-1.5">
                <p className="text-[14px] font-bold text-[#2F6F7E]">How to register it</p>
                <ol className="space-y-0.5">
                  {[
                    'Go to Google Cloud Console → APIs & Services → Credentials',
                    'Click your OAuth 2.0 Client ID (Web application type)',
                    'Under "Authorized redirect URIs" click "+ Add URI"',
                    'Paste the exact URI above and click Save',
                    'Wait ~30 seconds for the change to propagate, then proceed',
                  ].map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-[14px] text-[#2F6F7E]">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ol>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[14px] font-semibold text-[#2F6F7E] hover:text-[#2F6F7E]">
                  Open Google Cloud Console → Credentials <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* ── STEP 3: Scopes ────────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[14px] font-bold shrink-0">3</div>
              <span className="text-[14px] font-bold text-foreground">Scopes Requested</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[14px] text-muted-foreground">
                Drive, Calendar, and Gmail are all authorized in one flow. All scopes below must be added to your OAuth Consent Screen in Google Cloud Console.
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {(info?.scopes ?? Object.keys(SCOPE_META))
                  .filter(s => s !== 'email')
                  .map(s => {
                    const meta = SCOPE_META[s];
                    const short = meta?.short ?? s.replace('https://www.googleapis.com/auth/', '');
                    return (
                      <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-muted/20">
                        <span className="text-muted-foreground">{meta?.icon ?? <Shield className="w-3.5 h-3.5" />}</span>
                        <code className="text-[14px] font-mono text-foreground w-36 shrink-0">{short}</code>
                        <span className="text-[14px] text-muted-foreground">{meta?.label ?? ''}</span>
                      </div>
                    );
                  })}
              </div>
              <div className="flex items-start gap-2 rounded border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2 mt-1">
                <Info className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                <p className="text-[14px] text-[#CC8400] leading-snug">
                  <strong>Drive and Calendar scopes must be added to your OAuth Consent Screen.</strong> <code className="font-mono bg-[#FFF3E0] px-1 rounded">gmail.send</code> is a sensitive scope that works in Testing mode.
                  Note: <code className="font-mono bg-[#FFF3E0] px-1 rounded">gmail.readonly</code> (inbox reading) is a <em>restricted</em> scope — Google requires a formal app security review before it works. Inbox reading is disabled in development; compose &amp; send work now.
                </p>
              </div>
            </div>
          </div>

          {/* ── 403 TROUBLESHOOTING PANEL ─────────────────────────────────── */}
          <AccessDeniedPanel forceOpen={!!is403 || urlStatus === 'error'} />

          {/* ── STEP 4: Authorize ─────────────────────────────────────────── */}
          <div className={`rounded-lg border bg-white overflow-hidden ${info?.credentials.ok ? 'border-primary/30' : 'border-border opacity-60'}`}>
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 ${info?.credentials.ok ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>4</div>
              <span className="text-[14px] font-bold text-foreground">Authorize Access</span>
            </div>
            <div className="px-4 py-4 space-y-3">

              {/* Status summary — shows which tokens are configured */}
              {info && (info.tokens.drive || info.tokens.calendar || info.tokens.gmail) && (
                <div className={`rounded border px-4 py-3 ${info.tokens.drive && info.tokens.calendar && info.tokens.gmail ? 'border-[#9FC3AE] bg-[#E6F0EA]' : 'border-[#FFD08A] bg-[#FFF3E0]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {info.tokens.drive && info.tokens.calendar && info.tokens.gmail
                      ? <CheckCircle className="w-4 h-4 text-[#2F6B3F] shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-[#CC8400] shrink-0" />}
                    <p className={`text-[14px] font-bold ${info.tokens.drive && info.tokens.calendar && info.tokens.gmail ? 'text-[#245531]' : 'text-[#CC8400]'}`}>
                      {info.tokens.drive && info.tokens.calendar && info.tokens.gmail
                        ? 'All three refresh tokens configured (Drive · Calendar · Gmail)'
                        : `${[info.tokens.drive && 'Drive', info.tokens.calendar && 'Calendar', info.tokens.gmail && 'Gmail'].filter(Boolean).join(' · ')} configured — ${[!info.tokens.drive && 'Drive', !info.tokens.calendar && 'Calendar', !info.tokens.gmail && 'Gmail'].filter(Boolean).join(' + ')} missing`}
                    </p>
                  </div>
                  {!(info.tokens.drive && info.tokens.calendar && info.tokens.gmail) && (
                    <p className="text-[14px] text-[#CC8400] ml-6">
                      Re-authorize below to get a token covering all three services. On the success screen, save the value as all three secret names.
                    </p>
                  )}
                </div>
              )}

              {/* Always-visible authorize button */}
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {info?.tokens.drive || info?.tokens.calendar || info?.tokens.gmail
                  ? 'Re-authorize to issue a fresh token. The success screen will show all three secret names to fill in. Accept every Google permission prompt — including the Gmail screen.'
                  : "Clicking the button below opens Google's consent screen. After approving, you'll be redirected back here with a refresh token to copy into Replit Secrets. Make sure you've completed Steps 2–3 before proceeding."}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href="/api/google/oauth/start"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-bold transition-colors ${info?.credentials.ok ? 'bg-[#2F6F7E] text-white hover:bg-[#225968]' : 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none'}`}
                >
                  <Globe className="w-4 h-4" />
                  {info?.tokens.drive || info?.tokens.calendar || info?.tokens.gmail ? 'Re-authorize with Google' : 'Authorize with Google'}
                  <ArrowRight className="w-4 h-4" />
                </a>
                <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Redirects to accounts.google.com — consent on Google's domain</span>
                </div>
              </div>
              {!info?.credentials.ok && (
                <p className="text-[14px] text-[#A93F2F] flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Configure client credentials first (Step 1).
                </p>
              )}

              {/* Authorization URL Inspector */}
              {info?.authUrl && (
                <UrlInspector authUrl={info.authUrl} />
              )}
            </div>
          </div>

          {/* ── STEP 5: Token status ──────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[14px] font-bold shrink-0">5</div>
              <span className="text-[14px] font-bold text-foreground">Token Status — After Storing in Secrets</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'GOOGLE_DRIVE_REFRESH_TOKEN',     present: info?.tokens.drive,    icon: <HardDrive className="w-3.5 h-3.5" />, service: 'Google Drive' },
                  { name: 'GOOGLE_CALENDAR_REFRESH_TOKEN',  present: info?.tokens.calendar, icon: <Calendar  className="w-3.5 h-3.5" />, service: 'Google Calendar' },
                  { name: 'GOOGLE_GMAIL_REFRESH_TOKEN',     present: info?.tokens.gmail,    icon: <Mail      className="w-3.5 h-3.5" />, service: 'Gmail (Mail panel)' },
                ].map(t => (
                  <div key={t.name} className={`rounded border px-3 py-2.5 flex items-start gap-2 ${t.present ? 'border-[#9FC3AE] bg-[#E6F0EA]' : 'border-[#FBEAE6] bg-[#FBEAE6]/60'}`}>
                    <span className={t.present ? 'text-[#2F6B3F]' : 'text-[#A93F2F]'}>{t.icon}</span>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{t.service}</p>
                      <code className="text-[14px] font-mono text-muted-foreground break-all">{t.name}</code>
                      <p className={`text-[14px] font-semibold mt-0.5 ${t.present ? 'text-[#2F6B3F]' : 'text-[#A93F2F]'}`}>
                        {t.present ? '✓ Present — API calls enabled' : '✗ Missing — complete OAuth + store token'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {info && (!info.tokens.drive || !info.tokens.calendar) && (
                <div className="flex items-start gap-2 rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2">
                  <Info className="w-3.5 h-3.5 text-[#2F6F7E] shrink-0 mt-0.5" />
                  <p className="text-[14px] text-[#2F6F7E] leading-snug">
                    After storing the tokens in Replit Secrets, restart the API server workflow. Then click "Refresh Status" above — the tokens should show as Present.
                    If they still show missing, verify the secret names are spelled exactly as shown.
                  </p>
                </div>
              )}

              {info?.tokens.drive && info?.tokens.calendar && (
                <div className="flex items-start gap-2 rounded border border-[#9FC3AE] bg-[#E6F0EA] px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-[#2F6B3F] shrink-0 mt-0.5" />
                  <p className="text-[14px] text-[#245531] leading-snug">
                    Both tokens are configured. Go to <strong>Integration Secrets Audit → Run Live Checks</strong> to confirm Drive and Calendar are fully authenticated.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
