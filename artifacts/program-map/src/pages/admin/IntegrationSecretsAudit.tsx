import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Key, RefreshCw, CheckCircle, XCircle, AlertTriangle, Shield,
  ChevronDown, ChevronRight, ExternalLink, Zap, Brain, Globe,
  Lock, Wifi, WifiOff, ArrowRight, Database,
} from 'lucide-react';
import { useLocation } from 'wouter';

// ── Types — Audit ─────────────────────────────────────────────────────────────

type SecretStatus = 'present' | 'missing' | 'found-alternate';

interface FormatResult { checked: boolean; plausible?: boolean; hint?: string; }

interface SecretEntry {
  id: string; name: string; foundName?: string; alternateNames: string[];
  status: SecretStatus; format: FormatResult;
  integration: string; category: string; purpose: string; required: boolean; nextFix?: string;
}

interface IntegrationSummary {
  id: string; label: string; colorCls: string;
  totalRequired: number; presentCount: number; missingRequired: number;
  overallStatus: 'ready' | 'partial' | 'missing' | 'configured';
}

interface AuditResponse {
  timestamp: string;
  summary: { totalSecrets: number; totalPresent: number; totalRequired: number; presentRequired: number; missingRequired: number; formatIssues: number; };
  summaries: IntegrationSummary[];
  entries: SecretEntry[];
}

// ── Types — Live Validation ───────────────────────────────────────────────────

type GeminiStatus = 'key_missing' | 'format_invalid' | 'auth_error' | 'quota_exceeded' | 'api_error' | 'network_error' | 'valid';

interface GeminiResult {
  timestamp: string; keyPresent: boolean; formatValid: boolean;
  apiReachable: boolean; authValid: boolean;
  modelCount: number; modelSample: string[];
  status: GeminiStatus; errorCode: string | null; errorMessage: string | null;
  permissionsReady: boolean; integrationReady: boolean; nextStep: string; durationMs: number;
}

type CredentialTier = 'not_configured' | 'format_invalid' | 'credentials_ready' | 'oauth_incomplete' | 'api_ready';

interface ServiceReadiness {
  secretPresent: boolean; formatValid: boolean; refreshTokenPresent: boolean;
  tier: CredentialTier; label: string; nextStep: string;
}

interface GoogleResult {
  timestamp: string; googleReachable: boolean; reachabilityMs: number | null;
  clientId:     { present: boolean; formatValid: boolean; foundName?: string };
  clientSecret: { present: boolean; formatValid: boolean; foundName?: string };
  drive: ServiceReadiness; calendar: ServiceReadiness;
  sharedOAuth: { ready: boolean; tier: CredentialTier; label: string; details: string };
  nextSteps: string[]; durationMs: number;
}

// ── Types — Salesforce ────────────────────────────────────────────────────────

interface SalesforceCheck {
  id: string; category: string; label: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  detail: string; meta?: Record<string, unknown>;
}

interface SalesforceResult {
  checks: SalesforceCheck[];
  orgInfo: { name: string | null; id: string | null; edition: string | null; sandboxType: string | null } | null;
  objects: { object: string; accessible: boolean; count: number; error?: string }[];
  npspDetected: boolean;
  identity: { username: string | null; displayName: string | null; email: string | null } | null;
  durationMs: number;
  timestamp: string;
}

type LiveStatus = 'idle' | 'loading' | 'done' | 'error';

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_STEPS = [
  { key: 'present',     label: 'Secret present' },
  { key: 'format',      label: 'Credential valid' },
  { key: 'reachable',   label: 'API reachable' },
  { key: 'auth',        label: 'Auth valid' },
  { key: 'integration', label: 'Integration ready' },
] as const;

function TierBar({ tiers }: { tiers: Record<string, boolean | undefined> }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TIER_STEPS.map((step, i) => {
        const val = tiers[step.key];
        const cls = val === true  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : val === false ? 'bg-rose-400 border-rose-400 text-white'
                  : 'bg-muted border-border text-muted-foreground';
        const icon = val === true ? '✓' : val === false ? '✗' : '—';
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && <div className="w-3 h-px bg-border" />}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${cls}`}>
              <span>{icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Gemini Validation Card ────────────────────────────────────────────────────

function GeminiCard({ result, loading }: { result: GeminiResult | null; loading: boolean }) {
  const tiers = result ? {
    present:     result.keyPresent,
    format:      result.formatValid,
    reachable:   result.apiReachable,
    auth:        result.authValid,
    integration: result.integrationReady,
  } : {};

  const statusCfg: Record<GeminiStatus, { cls: string; label: string }> = {
    valid:         { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Valid — API responding' },
    quota_exceeded:{ cls: 'border-amber-200 bg-amber-50 text-amber-700',   label: 'Quota limit — key valid' },
    auth_error:    { cls: 'border-rose-200 bg-rose-50 text-rose-700',       label: 'Auth error — key rejected' },
    format_invalid:{ cls: 'border-amber-200 bg-amber-50 text-amber-700',   label: 'Format invalid' },
    key_missing:   { cls: 'border-rose-200 bg-rose-50 text-rose-700',       label: 'Key missing' },
    api_error:     { cls: 'border-amber-200 bg-amber-50 text-amber-700',   label: 'API error' },
    network_error: { cls: 'border-slate-200 bg-slate-50 text-slate-600',   label: 'Network unreachable' },
  };

  const cfg = result ? statusCfg[result.status] : null;

  return (
    <div className="rounded-lg border border-violet-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-200">
        <Brain className="w-4 h-4 text-violet-600" />
        <span className="text-[12px] font-bold text-violet-800">Gemini / Penny AI</span>
        <code className="text-[10px] font-mono text-violet-600 ml-1">GEMINI_API_KEY</code>
        {result && cfg && (
          <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.cls}`}>{cfg.label}</span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading && <p className="text-[11px] text-muted-foreground italic">Calling Generative Language API…</p>}
        {result && (
          <>
            <TierBar tiers={tiers} />
            {result.status === 'valid' && (
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] font-bold text-emerald-800 mb-1">
                  API key valid — {result.modelCount} models available ({result.durationMs}ms)
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.modelSample.map(m => (
                    <span key={m} className="text-[10px] font-mono bg-white border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {result.status !== 'valid' && result.errorMessage && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-800 mb-0.5 uppercase">
                  {result.errorCode ? `Error ${result.errorCode}` : 'Issue'}
                </p>
                <p className="text-[11px] text-amber-700">{result.errorMessage}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-snug">{result.nextStep}</p>
            <p className="text-[10px] text-muted-foreground/60">
              Validated at {new Date(result.timestamp).toLocaleTimeString()} · {result.durationMs}ms
            </p>
          </>
        )}
        {!result && !loading && (
          <p className="text-[11px] text-muted-foreground italic">Click "Run Live Checks" to validate the Gemini API key.</p>
        )}
      </div>
    </div>
  );
}

// ── Google Validation Card ────────────────────────────────────────────────────

function GoogleServiceRow({ name, svc, reachable }: { name: string; svc: ServiceReadiness; reachable: boolean }) {
  const tiers = {
    present:     svc.secretPresent || true,   // client creds counted at group level
    format:      svc.formatValid || svc.secretPresent,
    reachable,
    auth:        svc.tier === 'api_ready',
    integration: svc.tier === 'api_ready',
  };
  const tierCls = svc.tier === 'api_ready' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : svc.tier === 'oauth_incomplete' ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <div className="border-t border-border/30 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-[11px] font-semibold text-foreground w-28 shrink-0">{name}</span>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${tierCls}`}>{svc.label}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug mb-1">{svc.nextStep}</p>
    </div>
  );
}

function GoogleCard({ result, loading }: { result: GoogleResult | null; loading: boolean }) {
  const sharedReady = result?.sharedOAuth.ready ?? false;

  const sharedTiers = result ? {
    present:   result.clientId.present && result.clientSecret.present,
    format:    result.clientId.formatValid && result.clientSecret.formatValid,
    reachable: result.googleReachable,
    auth:      sharedReady,
    integration: false, // requires refresh tokens
  } : {};

  return (
    <div className="rounded-lg border border-sky-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 border-b border-sky-200">
        <Globe className="w-4 h-4 text-sky-600" />
        <span className="text-[12px] font-bold text-sky-800">Google Workspace</span>
        <span className="text-[10px] text-sky-600 ml-1">Drive + Calendar</span>
        {result && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${result.googleReachable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {result.googleReachable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {result.googleReachable ? `Reachable ${result.reachabilityMs}ms` : 'Unreachable'}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        {loading && <p className="text-[11px] text-muted-foreground italic">Checking Google OAuth credentials…</p>}
        {result && (
          <>
            {/* Shared OAuth tier */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">Shared OAuth Credentials</p>
              <TierBar tiers={sharedTiers} />
              <div className={`rounded border px-3 py-2 ${sharedReady ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`text-[11px] font-semibold mb-0.5 ${sharedReady ? 'text-emerald-800' : 'text-amber-800'}`}>{result.sharedOAuth.label}</p>
                <p className={`text-[11px] leading-snug ${sharedReady ? 'text-emerald-700' : 'text-amber-700'}`}>{result.sharedOAuth.details}</p>
              </div>
            </div>

            {/* Per-service */}
            {sharedReady && (
              <>
                <GoogleServiceRow name="Google Drive" svc={result.drive} reachable={result.googleReachable} />
                <GoogleServiceRow name="Google Calendar" svc={result.calendar} reachable={result.googleReachable} />
              </>
            )}

            {/* Next steps */}
            {result.nextSteps.length > 0 && (
              <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2">
                <p className="text-[10px] font-bold text-sky-800 mb-1 uppercase">Next steps</p>
                <ol className="space-y-0.5">
                  {result.nextSteps.map((s, i) => (
                    <li key={i} className="text-[11px] text-sky-800 flex gap-1.5">
                      <span className="shrink-0 font-bold">{i + 1}.</span>
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/60">
              Validated at {new Date(result.timestamp).toLocaleTimeString()} · {result.durationMs}ms
            </p>
          </>
        )}
        {!result && !loading && (
          <p className="text-[11px] text-muted-foreground italic">Click "Run Live Checks" to validate Google credentials.</p>
        )}
      </div>
    </div>
  );
}

// ── Salesforce Validation Card ────────────────────────────────────────────────

function SalesforceCard({ result, loading }: { result: SalesforceResult | null; loading: boolean }) {
  const passCount   = result?.checks.filter(c => c.status === 'pass').length ?? 0;
  const failCount   = result?.checks.filter(c => c.status === 'fail').length ?? 0;
  const warnCount   = result?.checks.filter(c => c.status === 'warning').length ?? 0;
  const totalChecks = result?.checks.length ?? 0;
  const connected   = result !== null && failCount === 0 && passCount > 0;

  const headerCls = connected
    ? 'border-emerald-200 bg-emerald-50'
    : result ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50';

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${connected ? 'border-emerald-200' : result ? 'border-rose-200' : 'border-teal-200'}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerCls}`}>
        <Database className={`w-4 h-4 ${connected ? 'text-emerald-600' : 'text-teal-600'}`} />
        <span className={`text-[12px] font-bold ${connected ? 'text-emerald-800' : 'text-teal-800'}`}>Salesforce</span>
        <span className="text-[10px] text-teal-600 ml-1">via Replit Connector</span>
        {result && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
            connected
              ? 'border-emerald-300 bg-white text-emerald-700'
              : 'border-rose-300 bg-white text-rose-700'
          }`}>
            {connected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {connected ? 'Connected' : 'Connection failed'}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading && <p className="text-[11px] text-muted-foreground italic">Calling Salesforce REST API via Replit Connector…</p>}

        {result && connected && (
          <>
            {/* Org + identity banner */}
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-1">
              <p className="text-[11px] font-bold text-emerald-800">
                {result.orgInfo?.name ?? 'Org'} · {result.orgInfo?.edition} · {result.orgInfo?.sandboxType}
              </p>
              {result.identity && (
                <p className="text-[11px] text-emerald-700">
                  Authenticated as <strong>{result.identity.displayName ?? result.identity.username}</strong>
                  {result.identity.email ? ` (${result.identity.email})` : ''}
                </p>
              )}
              <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                {result.objects.map(o => (
                  <span key={o.object} className={`inline-flex items-center gap-1 text-[10px] font-bold ${o.accessible ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {o.accessible ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {o.object}: {o.accessible ? `${o.count.toLocaleString()} records` : 'no access'}
                  </span>
                ))}
                {result.npspDetected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
                    <CheckCircle className="w-3 h-3" /> NPSP detected
                  </span>
                )}
              </div>
            </div>

            {/* Check list */}
            <div className="space-y-1">
              {result.checks.map(c => {
                const icon = c.status === 'pass'
                  ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  : c.status === 'warning'
                  ? <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  : <XCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />;
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    {icon}
                    <div>
                      <span className="text-[11px] font-semibold text-foreground">{c.label}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5 leading-snug">{c.detail.slice(0, 120)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] text-muted-foreground/60">
                {passCount}/{totalChecks} checks passed · {warnCount} warnings · {result.durationMs}ms
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                Validated at {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}

        {result && !connected && (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 space-y-1">
            {result.checks.filter(c => c.status === 'fail').map(c => (
              <p key={c.id} className="text-[11px] text-rose-800"><strong>{c.label}:</strong> {c.detail.slice(0, 150)}</p>
            ))}
          </div>
        )}

        {!result && !loading && (
          <p className="text-[11px] text-muted-foreground italic">
            Click "Run Live Checks" to test the Salesforce connector (Replit Connector — no API keys needed).
          </p>
        )}
      </div>
    </div>
  );
}

// ── Audit helpers ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SecretStatus }) {
  if (status === 'present') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
      <CheckCircle className="w-3 h-3" /> PRESENT
    </span>
  );
  if (status === 'found-alternate') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700">
      <CheckCircle className="w-3 h-3" /> ALT NAME
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-700">
      <XCircle className="w-3 h-3" /> MISSING
    </span>
  );
}

function FormatBadge({ format }: { format: FormatResult }) {
  if (!format.checked) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border border-border bg-muted text-muted-foreground">UNCHECKED</span>;
  if (format.plausible) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-teal-200 bg-teal-50 text-teal-700"><CheckCircle className="w-3 h-3" /> FORMAT ✓</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700"><AlertTriangle className="w-3 h-3" /> FORMAT ?</span>;
}

function RequiredBadge({ required }: { required: boolean }) {
  return required
    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border border-rose-100 bg-rose-50 text-rose-600 uppercase">Required</span>
    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border border-border bg-muted text-muted-foreground uppercase">Optional</span>;
}

function IntegrationStatusBadge({ status }: { status: IntegrationSummary['overallStatus'] }) {
  const cfg = { configured: 'border-emerald-200 bg-emerald-50 text-emerald-700', ready: 'border-blue-200 bg-blue-50 text-blue-700', partial: 'border-amber-200 bg-amber-50 text-amber-700', missing: 'border-rose-200 bg-rose-50 text-rose-700' }[status];
  const label = { configured: 'Configured', ready: 'Partial', partial: 'Partial', missing: 'Missing' }[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${cfg}`}>{label}</span>;
}

// ── Secret Row ────────────────────────────────────────────────────────────────

function SecretRow({ entry }: { entry: SecretEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasFormatIssue = entry.format.checked && entry.format.plausible === false;
  const hasAlternate = entry.status === 'found-alternate';
  return (
    <div className={`border-b border-border/30 ${entry.status === 'missing' && entry.required ? 'bg-rose-50/30' : ''}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
        <div className="pt-0.5 shrink-0">
          {entry.status !== 'missing' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <code className="text-[12px] font-mono font-semibold text-foreground">{entry.name}</code>
            {hasAlternate && entry.foundName && <span className="text-[10px] text-blue-600 font-mono">→ found as {entry.foundName}</span>}
            <RequiredBadge required={entry.required} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate pr-4">{entry.purpose}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <StatusBadge status={entry.status} />
          <FormatBadge format={entry.format} />
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 ml-7 space-y-2">
          <div className="rounded-lg border border-border bg-white p-3 space-y-1.5 text-[11px]">
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Category</span><span className="font-medium">{entry.category}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Primary name</span><code className="font-mono">{entry.name}</code></div>
            {entry.alternateNames.length > 0 && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Alternates checked</span>
                <div className="flex flex-wrap gap-1">{entry.alternateNames.map(a => <code key={a} className="font-mono text-muted-foreground">{a}</code>)}</div>
              </div>
            )}
            {entry.format.checked && <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Format check</span><span className={entry.format.plausible ? 'text-emerald-700' : 'text-amber-700'}>{entry.format.hint}</span></div>}
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Purpose</span><span className="leading-snug">{entry.purpose}</span></div>
            {entry.status === 'missing' && entry.nextFix && (
              <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="text-[10px] font-bold text-amber-800 mb-0.5 uppercase">Next fix</p>
                <p className="text-[11px] text-amber-700 leading-snug">{entry.nextFix}</p>
              </div>
            )}
            {hasFormatIssue && (
              <div className="mt-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="text-[10px] font-bold text-amber-800 mb-0.5 uppercase">Format warning</p>
                <p className="text-[11px] text-amber-700 leading-snug">{entry.format.hint}</p>
                {entry.nextFix && <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">{entry.nextFix}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Integration Group ─────────────────────────────────────────────────────────

function IntegrationGroup({ summary, entries }: { summary: IntegrationSummary; entries: SecretEntry[] }) {
  const [open, setOpen] = useState(summary.overallStatus !== 'configured');
  const present = entries.filter(e => e.status !== 'missing').length;
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${summary.colorCls}`}>{summary.label}</span>
          <IntegrationStatusBadge status={summary.overallStatus} />
          <span className="text-[11px] text-muted-foreground">{present}/{entries.length} secrets present</span>
          {summary.missingRequired > 0 && <span className="text-[11px] font-semibold text-rose-600">{summary.missingRequired} required missing</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="border-t border-border/40 divide-y divide-border/20">{entries.map(e => <SecretRow key={e.id} entry={e} />)}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IntegrationSecretsAudit() {
  const [, navigate] = useLocation();
  const [auditData, setAuditData]   = useState<AuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [geminiResult, setGeminiResult]         = useState<GeminiResult | null>(null);
  const [googleResult, setGoogleResult]         = useState<GoogleResult | null>(null);
  const [salesforceResult, setSalesforceResult] = useState<SalesforceResult | null>(null);
  const [liveStatus, setLiveStatus]             = useState<LiveStatus>('idle');

  const runAudit = useCallback(() => {
    setAuditLoading(true);
    setAuditError(null);
    fetch('/api/secrets/audit')
      .then(r => r.json() as Promise<AuditResponse>)
      .then(d => { setAuditData(d); setAuditLoading(false); })
      .catch(e => { setAuditError(String(e)); setAuditLoading(false); });
  }, []);

  const runLiveChecks = useCallback(() => {
    setLiveStatus('loading');
    Promise.all([
      fetch('/api/gemini/validate').then(r => r.json() as Promise<GeminiResult>),
      fetch('/api/google/validate').then(r => r.json() as Promise<GoogleResult>),
      fetch('/api/salesforce/validate').then(r => r.json() as Promise<SalesforceResult>),
    ])
      .then(([gem, goog, sf]) => {
        setGeminiResult(gem);
        setGoogleResult(goog);
        setSalesforceResult(sf);
        setLiveStatus('done');
      })
      .catch(() => setLiveStatus('error'));
  }, []);

  useEffect(() => { runAudit(); }, [runAudit]);

  const integrations = auditData ? [...new Set(auditData.entries.map(e => e.integration))] : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Shield className="w-4 h-4 text-primary" />
          <h1 className="text-[15px] font-semibold text-foreground">Integration Secrets Audit</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border border-primary/20 bg-primary/5 text-primary uppercase">Live</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Two-layer audit: <strong>Presence &amp; Format</strong> (instant, all integrations) and <strong>Live Validation</strong> (on-demand API calls to Gemini and Google). Secret <strong>values are never transmitted</strong>.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20 shrink-0 flex-wrap">
        <button onClick={runAudit} disabled={auditLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
          {auditLoading ? 'Auditing…' : 'Refresh Audit'}
        </button>

        <button onClick={runLiveChecks} disabled={liveStatus === 'loading'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50">
          <Zap className={`w-3.5 h-3.5 ${liveStatus === 'loading' ? 'animate-pulse' : ''}`} />
          {liveStatus === 'loading' ? 'Calling APIs…' : 'Run Live Checks'}
        </button>

        {auditData && (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" />{auditData.summary.totalPresent} present
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-700">
              <XCircle className="w-3.5 h-3.5" />{auditData.summary.missingRequired} required missing
            </div>
            {auditData.summary.formatIssues > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5" />{auditData.summary.formatIssues} format {auditData.summary.formatIssues === 1 ? 'issue' : 'issues'}
              </div>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground">Last checked {new Date(auditData.timestamp).toLocaleTimeString()}</span>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-4xl">

          {/* Security notice */}
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 flex gap-3">
            <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-teal-800 mb-0.5">Security — No Secret Values Exposed</p>
              <p className="text-[12px] text-teal-900 leading-relaxed">
                Presence checks and format checks run server-side (no value ever sent to the client).
                Live validation calls external APIs using secrets held only in server memory — the
                API response (model list, error code) is what's returned, never the key itself.
              </p>
            </div>
          </div>

          {/* ── Live Validation Panel ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-violet-500" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">Live API Validation</p>
              <span className="text-[10px] text-muted-foreground">— 5-tier readiness: Secret present → Format valid → API reachable → Auth valid → Integration ready</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <SalesforceCard result={salesforceResult} loading={liveStatus === 'loading'} />
              <GeminiCard result={geminiResult} loading={liveStatus === 'loading'} />
              <GoogleCard result={googleResult} loading={liveStatus === 'loading'} />
            </div>
            {liveStatus === 'error' && (
              <p className="mt-2 text-[11px] text-rose-600">Live check failed — ensure the API server is running and try again.</p>
            )}
          </div>

          {/* ── Presence & Format Audit ───────────────────────────────────── */}
          {(auditLoading && !auditData) && (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <RefreshCw className="w-6 h-6 text-muted-foreground/40 animate-spin mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Running secrets audit…</p>
            </div>
          )}
          {auditError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-[12px] font-semibold text-rose-700">Audit failed: {auditError}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Check the API server is running, then click Refresh Audit.</p>
            </div>
          )}

          {auditData && (
            <>
              {/* Overview grid */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Integration Overview — Presence &amp; Format</p>
                <div className="grid grid-cols-2 gap-2">
                  {auditData.summaries.map(s => {
                    const bg = { configured: 'border-emerald-200 bg-emerald-50', ready: 'border-blue-200 bg-blue-50', partial: 'border-amber-200 bg-amber-50', missing: 'border-rose-200 bg-rose-50' }[s.overallStatus];
                    return (
                      <div key={s.id} className={`rounded-lg border p-3 ${bg}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[12px] font-bold text-foreground">{s.label}</p>
                          <IntegrationStatusBadge status={s.overallStatus} />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{s.presentCount}</span>
                          <span>present</span>
                          {s.missingRequired > 0 && <span className="ml-1 font-semibold text-rose-600">· {s.missingRequired} required missing</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-integration detail */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Secret Detail by Integration</p>
                <div className="space-y-2">
                  {integrations.map(intg => {
                    const summary = auditData.summaries.find(s => s.label === intg)!;
                    const entries = auditData.entries.filter(e => e.integration === intg);
                    return <IntegrationGroup key={intg} summary={summary} entries={entries} />;
                  })}
                </div>
              </div>

              {/* Priority actions */}
              {auditData.summary.missingRequired > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-foreground mb-2">Highest Priority Missing Secrets</p>
                  <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
                    {auditData.entries.filter(e => e.required && e.status === 'missing').map(e => (
                      <div key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <code className="text-[12px] font-mono font-semibold text-foreground">{e.name}</code>
                            <span className="text-[10px] text-muted-foreground">({e.integration})</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{e.nextFix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google OAuth action card */}
              {auditData.entries.some(e => e.integration.startsWith('Google') && e.status === 'missing') && (
                <div className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <p className="text-[12px] font-bold text-sky-800">Google OAuth — Authorization Flow Available</p>
                        {auditData.entries.filter(e => e.integration === 'Google' && e.status !== 'missing').length >= 2 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> Client credentials ready
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-sky-900 leading-relaxed mb-3">
                        GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured. The built-in OAuth flow will authorize Drive and Calendar together,
                        display the refresh token once for copying into Replit Secrets, and guide you through every step.
                      </p>
                      <button
                        onClick={() => navigate('/admin/google-oauth')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Open Google Authorization Flow
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Already authorized confirmation */}
              {auditData.entries.filter(e => (e.id === 'google-drive-refresh' || e.id === 'google-cal-refresh') && e.status !== 'missing').length === 2 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-emerald-800">Google Drive + Calendar: Refresh tokens configured</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Run Live Checks above to confirm the tokens are valid and API-ready.</p>
                  </div>
                  <button onClick={() => navigate('/admin/google-oauth')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-300 bg-white text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                    Re-authorize <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
