import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink,
  RefreshCw, Lock, Key, ChevronRight, Eye, EyeOff, ArrowRight,
  Globe, HardDrive, Calendar, Zap, Info,
} from 'lucide-react';
import { useLocation } from 'wouter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OAuthInfo {
  redirectUri: string;
  scopes: string[];
  scopeDisplay: string;
  credentials: { clientId: boolean; clientSecret: boolean; ok: boolean };
  tokens: { drive: boolean; calendar: boolean };
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
  not_configured:    { label: 'Not Configured',    cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  credentials_ready: { label: 'Credentials Ready', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  oauth_complete:    { label: 'OAuth Complete',     cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  token_present:     { label: 'Refresh Token Set',  cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  integration_ready: { label: 'Integration Ready',  cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
};

function TierBadge({ tier }: { tier: AuthTier }) {
  const { label, cls } = TIER_CONFIG[tier];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${cls}`}>{label}</span>;
}

// ── 5-step readiness ladder ───────────────────────────────────────────────────

interface StepDef { icon: React.ReactNode; label: string; sub: string; }
const STEPS: StepDef[] = [
  { icon: <Key className="w-4 h-4" />, label: 'Secret Present',    sub: 'GOOGLE_CLIENT_ID + SECRET in Replit Secrets' },
  { icon: <Shield className="w-4 h-4" />, label: 'Credential Valid', sub: 'Format check passes, Google reachable' },
  { icon: <Globe className="w-4 h-4" />, label: 'API Reachable',    sub: 'accounts.google.com responds' },
  { icon: <Lock className="w-4 h-4" />, label: 'OAuth Complete',   sub: 'Authorization flow completed, refresh token obtained' },
  { icon: <CheckCircle className="w-4 h-4" />, label: 'Integration Ready', sub: 'Refresh token stored, API calls work' },
];

function ReadinessLadder({ step }: { step: number }) {
  return (
    <div className="flex items-start gap-0">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        const cls = done    ? 'bg-emerald-500 text-white border-emerald-500'
                  : active  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white text-muted-foreground border-border';
        return (
          <div key={i} className="flex items-center">
            {i > 0 && <div className={`h-px w-6 ${done ? 'bg-emerald-400' : 'bg-border'}`} />}
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${cls}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : s.icon}
              </div>
              <span className={`text-[9px] font-bold text-center leading-tight uppercase tracking-wide ${done ? 'text-emerald-700' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              <span className="text-[8px] text-muted-foreground/70 text-center leading-tight hidden sm:block px-0.5">
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
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-border bg-white text-muted-foreground hover:bg-muted/40'}`}>
      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Masked token row ──────────────────────────────────────────────────────────

function TokenRow({ label, secretName, value }: { label: string; secretName: string; value: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = '•'.repeat(Math.min(value.length, 48));
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Key className="w-3.5 h-3.5 text-amber-700" />
        <span className="text-[11px] font-bold text-amber-800">{label}</span>
        <code className="text-[10px] font-mono bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded ml-auto">{secretName}</code>
      </div>
      <div className="flex items-center gap-2">
        <code className={`flex-1 text-[11px] font-mono bg-white border border-amber-200 rounded px-2 py-1.5 overflow-hidden text-ellipsis ${revealed ? 'text-foreground' : 'text-amber-300'}`}>
          {revealed ? value : masked}
        </code>
        <button onClick={() => setRevealed(r => !r)}
          className="flex items-center gap-1 px-2 py-1.5 rounded border border-amber-200 bg-white text-[10px] font-semibold text-amber-700 hover:bg-amber-50">
          {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        {revealed && <CopyButton text={value} label="Copy" />}
      </div>
      <p className="text-[10px] text-amber-600 leading-snug">
        Copy this value and add it as <strong>{secretName}</strong> in the Replit Secrets panel (click the lock icon in the left sidebar).
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GoogleOAuthFlow() {
  const [, navigate] = useLocation();

  // URL state from OAuth redirect
  const params = new URLSearchParams(window.location.search);
  const urlStatus = params.get('status');
  const sessionId  = params.get('session');
  const urlError   = params.get('error');

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

  // Current readiness step (typed as number to avoid literal-union narrowing issues)
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
      <div className="px-6 py-4 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          <button onClick={() => navigate('/admin/secrets-audit')} className="hover:text-foreground">Integration Secrets Audit</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-semibold">Google Authorization</span>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <Globe className="w-5 h-5 text-sky-600" />
          <h1 className="text-[18px] font-bold text-foreground">Google OAuth Authorization</h1>
          <TierBadge tier={tier} />
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Authorize Trail OS to access Google Drive and Google Calendar on behalf of your workspace.
          This generates a <strong>refresh token</strong> you'll store in Replit Secrets — no token values are ever logged or stored server-side.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border bg-muted/20 shrink-0">
        <button onClick={loadInfo} disabled={infoLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${infoLoading ? 'animate-spin' : ''}`} />
          {infoLoading ? 'Checking…' : 'Refresh Status'}
        </button>
        <button onClick={() => navigate('/admin/secrets-audit')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border border-border bg-white hover:bg-muted/30">
          ← Back to Secrets Audit
        </button>
        {info && (
          <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold ${info.tokens.drive && info.tokens.calendar ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {info.tokens.drive && info.tokens.calendar ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Drive: {info.tokens.drive ? 'token set' : 'not authorized'} · Calendar: {info.tokens.calendar ? 'token set' : 'not authorized'}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 max-w-3xl">

          {/* 5-step readiness ladder */}
          <div className="rounded-lg border border-border bg-white p-5 overflow-x-auto">
            <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-4">Authorization Progress</p>
            <ReadinessLadder step={step} />
          </div>

          {/* ── Error from OAuth redirect ───────────────────────────────────── */}
          {urlStatus === 'error' && urlError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 flex gap-3">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-rose-700 mb-1">Authorization Failed</p>
                <p className="text-[12px] text-rose-700 leading-snug">{decodeURIComponent(urlError)}</p>
                <p className="text-[11px] text-rose-600 mt-1.5">
                  If access was denied by the user, click "Start Authorization" again and allow access. If the error mentions "redirect_uri_mismatch", add the redirect URI shown below to Google Cloud Console.
                </p>
              </div>
            </div>
          )}

          {/* ── SUCCESS: Token display ─────────────────────────────────────── */}
          {(urlStatus === 'success') && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-[13px] font-bold text-emerald-800">Authorization Successful</p>
                {tokenSession && <span className="text-[11px] text-emerald-600">· Authorized as {tokenSession.email}</span>}
              </div>

              {sessionLoading && (
                <p className="text-[12px] text-emerald-700 italic">Retrieving refresh token (one-time)…</p>
              )}
              {sessionError && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-amber-800 mb-0.5">Token retrieval failed</p>
                  <p className="text-[11px] text-amber-700">{sessionError}</p>
                </div>
              )}

              {tokenSession && (
                <div className="space-y-3">
                  <div className="rounded border border-emerald-200 bg-white px-3 py-2">
                    <p className="text-[10px] font-bold text-emerald-800 mb-0.5">Scopes granted by Google</p>
                    <p className="text-[11px] font-mono text-foreground break-all leading-snug">{tokenSession.scopesGranted}</p>
                  </div>

                  {/* Single refresh token — same value goes in both secrets */}
                  <div className="rounded-lg border border-amber-300 bg-white p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <p className="text-[12px] font-bold text-amber-800">One Refresh Token — Add to Two Secrets</p>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-snug">
                      Google issued a single refresh token covering all authorized scopes. Add the <strong>same value</strong> as both
                      <code className="font-mono bg-amber-50 border border-amber-200 rounded px-1 mx-1">GOOGLE_DRIVE_REFRESH_TOKEN</code> and
                      <code className="font-mono bg-amber-50 border border-amber-200 rounded px-1 mx-1">GOOGLE_CALENDAR_REFRESH_TOKEN</code> in Replit Secrets.
                    </p>
                    <TokenRow
                      label="Refresh Token (Drive + Calendar)"
                      secretName="GOOGLE_DRIVE_REFRESH_TOKEN"
                      value={tokenSession.refreshToken}
                    />
                    <TokenRow
                      label="Same value for Calendar"
                      secretName="GOOGLE_CALENDAR_REFRESH_TOKEN"
                      value={tokenSession.refreshToken}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-2">
                    <p className="text-[12px] font-bold text-sky-800">Next Steps — Store & Activate</p>
                    <ol className="space-y-2">
                      {[
                        { n:1, text:'Open the Replit Secrets panel (🔒 lock icon in the left sidebar of your Repl).' },
                        { n:2, text:'Add secret: GOOGLE_DRIVE_REFRESH_TOKEN = <paste the value above>.' },
                        { n:3, text:'Add secret: GOOGLE_CALENDAR_REFRESH_TOKEN = <paste the same value>.' },
                        { n:4, text:'Restart the API server (the workflow named "API Server") so the new secrets load into the environment.' },
                        { n:5, text:'Return to Integration Secrets Audit → Run Live Checks to confirm Drive and Calendar show as API Ready.' },
                      ].map(({ n, text }) => (
                        <li key={n} className="flex gap-2 text-[11px] text-sky-800 leading-snug">
                          <span className="font-bold shrink-0 w-4">{n}.</span>
                          <span>{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    This token is only shown once and has already been cleared from server memory. If you need to get a new token, use the "Start Authorization" button again.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Credential check ──────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
              <span className="text-[12px] font-bold text-foreground">Verify OAuth Client Credentials</span>
              {info && (
                info.credentials.ok
                  ? <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle className="w-3.5 h-3.5" /> Both configured</span>
                  : <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-rose-600"><XCircle className="w-3.5 h-3.5" /> Missing credentials</span>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              {info && (
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded border px-3 py-2 flex items-center gap-2 ${info.credentials.clientId ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    {info.credentials.clientId ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    <div>
                      <p className="text-[10px] font-bold text-foreground">GOOGLE_CLIENT_ID</p>
                      <p className="text-[10px] text-muted-foreground">{info.credentials.clientId ? 'Present + format valid' : 'Missing — set in Replit Secrets'}</p>
                    </div>
                  </div>
                  <div className={`rounded border px-3 py-2 flex items-center gap-2 ${info.credentials.clientSecret ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    {info.credentials.clientSecret ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    <div>
                      <p className="text-[10px] font-bold text-foreground">GOOGLE_CLIENT_SECRET</p>
                      <p className="text-[10px] text-muted-foreground">{info.credentials.clientSecret ? 'Present + format valid' : 'Missing — set in Replit Secrets'}</p>
                    </div>
                  </div>
                </div>
              )}
              {info && !info.credentials.ok && (
                <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-[11px] text-rose-700 leading-snug">
                    Configure OAuth 2.0 credentials in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Google Cloud Console → APIs &amp; Services → Credentials</a>.
                    Create an "OAuth 2.0 Client ID" of type "Web application", then add the redirect URI shown in Step 2 to the Authorized Redirect URIs list.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── STEP 2: Redirect URI ──────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
              <span className="text-[12px] font-bold text-foreground">Add Redirect URI to Google Cloud Console</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Google requires the <strong>exact redirect URI</strong> to be pre-registered before the OAuth flow will work.
                If this URI is not registered, you'll get a <code className="font-mono text-[11px]">redirect_uri_mismatch</code> error.
              </p>

              {info ? (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1.5">Redirect URI — add this exactly to GCP Console</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[12px] font-mono font-semibold text-foreground bg-white border border-border rounded px-3 py-2 break-all">
                      {info.redirectUri}
                    </code>
                    <CopyButton text={info.redirectUri} label="Copy URI" />
                  </div>
                </div>
              ) : (
                <div className="h-12 rounded-lg border border-border bg-muted/30 animate-pulse" />
              )}

              <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 space-y-1.5">
                <p className="text-[11px] font-bold text-sky-800">How to add it to Google Cloud Console</p>
                <ol className="space-y-0.5">
                  {[
                    'Go to Google Cloud Console → APIs & Services → Credentials',
                    'Click your OAuth 2.0 Client ID (Web application type)',
                    'Under "Authorized redirect URIs" click "+ Add URI"',
                    'Paste the exact URI above and click Save',
                    'Wait ~30 seconds for the change to propagate, then proceed to Step 3',
                  ].map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-sky-800">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ol>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900">
                  Open Google Cloud Console → Credentials <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* ── STEP 3: Scopes ────────────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
              <span className="text-[12px] font-bold text-foreground">Scopes Requested</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-[12px] text-muted-foreground">
                The authorization will request the following scopes in one flow — Drive and Calendar authorized together:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { icon: <HardDrive className="w-3.5 h-3.5" />, scope: 'drive.readonly',          label: 'Read program folders and documents' },
                  { icon: <HardDrive className="w-3.5 h-3.5" />, scope: 'drive.file',              label: 'Create and write Penny source files' },
                  { icon: <Calendar className="w-3.5 h-3.5" />,  scope: 'calendar.readonly',      label: 'Read cohort and program calendars' },
                  { icon: <Calendar className="w-3.5 h-3.5" />,  scope: 'calendar.events',        label: 'Create Penny reminder events' },
                  { icon: <Shield className="w-3.5 h-3.5" />,    scope: 'openid + email',         label: 'Identify the authorizing Google account' },
                ].map(({ icon, scope, label }) => (
                  <div key={scope} className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-muted/20">
                    <span className="text-muted-foreground">{icon}</span>
                    <code className="text-[11px] font-mono text-foreground w-36 shrink-0">{scope}</code>
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── STEP 4: Authorize ─────────────────────────────────────────── */}
          <div className={`rounded-lg border bg-white overflow-hidden ${info?.credentials.ok ? 'border-primary/30' : 'border-border opacity-60'}`}>
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${info?.credentials.ok ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>4</div>
              <span className="text-[12px] font-bold text-foreground">Authorize Access</span>
            </div>
            <div className="px-4 py-4 space-y-3">

              {info?.tokens.drive && info?.tokens.calendar ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-[12px] font-bold text-emerald-800">Both refresh tokens are already configured</p>
                    <p className="text-[11px] text-emerald-700">Drive and Calendar are authorized. Re-authorize only if you need to refresh the tokens or change the scope.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Clicking the button below opens Google's consent screen. After approving, you'll be redirected back here with a refresh token to copy into Replit Secrets.
                    Make sure you've <strong>added the redirect URI to Google Cloud Console</strong> (Step 2) before proceeding.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href="/api/google/oauth/start"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold transition-colors ${info?.credentials.ok ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none'}`}
                    >
                      <Globe className="w-4 h-4" />
                      Authorize with Google
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Redirects to accounts.google.com — you'll consent on Google's domain</span>
                    </div>
                  </div>
                  {!info?.credentials.ok && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Configure client credentials first (Step 1) before authorizing.
                    </p>
                  )}
                </>
              )}

              {/* Re-authorize option if already set */}
              {info?.tokens.drive && info?.tokens.calendar && (
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Re-authorize (refresh or rotate tokens)</summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-muted-foreground leading-snug">
                      Re-authorizing will issue a new refresh token. You'll need to update the secrets and restart the server again.
                    </p>
                    <a href="/api/google/oauth/start"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-white text-[11px] font-semibold hover:bg-muted/30">
                      <RefreshCw className="w-3 h-3" /> Re-authorize with Google
                    </a>
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* ── STEP 5: Token status ──────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border-b border-border">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">5</div>
              <span className="text-[12px] font-bold text-foreground">Token Status — After Storing in Secrets</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'GOOGLE_DRIVE_REFRESH_TOKEN', present: info?.tokens.drive, icon: <HardDrive className="w-3.5 h-3.5" />, service: 'Google Drive' },
                  { name: 'GOOGLE_CALENDAR_REFRESH_TOKEN', present: info?.tokens.calendar, icon: <Calendar className="w-3.5 h-3.5" />, service: 'Google Calendar' },
                ].map(t => (
                  <div key={t.name} className={`rounded border px-3 py-2.5 flex items-start gap-2 ${t.present ? 'border-emerald-200 bg-emerald-50' : 'border-rose-100 bg-rose-50/60'}`}>
                    <span className={t.present ? 'text-emerald-600' : 'text-rose-400'}>{t.icon}</span>
                    <div>
                      <p className="text-[10px] font-bold text-foreground">{t.service}</p>
                      <code className="text-[9px] font-mono text-muted-foreground break-all">{t.name}</code>
                      <p className={`text-[10px] font-semibold mt-0.5 ${t.present ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {t.present ? '✓ Present — API calls enabled' : '✗ Missing — Complete OAuth + store token'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {info && (!info.tokens.drive || !info.tokens.calendar) && (
                <div className="flex items-start gap-2 rounded border border-sky-200 bg-sky-50 px-3 py-2">
                  <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-sky-800 leading-snug">
                    After storing the tokens in Replit Secrets, restart the API server workflow. Then click "Refresh Status" above — the tokens should show as Present.
                    If they still show missing, verify the secret names are spelled exactly as shown.
                  </p>
                </div>
              )}

              {info?.tokens.drive && info?.tokens.calendar && (
                <div className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-800 leading-snug">
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
