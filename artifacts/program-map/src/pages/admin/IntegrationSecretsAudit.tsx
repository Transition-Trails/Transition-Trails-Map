import { useState, useEffect, useCallback } from 'react';
import { TERMS } from '@/config/terminology';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Key, RefreshCw, CheckCircle, XCircle, AlertTriangle, Shield,
  ChevronDown, ChevronRight, ExternalLink, Zap, Brain, Globe,
  Lock, Wifi, WifiOff, ArrowRight, Database, HelpCircle,
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

interface PmmObject {
  object: string; label: string; accessible: boolean; count: number; error?: string;
}

interface TtObjectResult {
  object: string; label: string;
  /** true = confirmed accessible; false = confirmed inaccessible; null = undetermined (throttled) */
  accessible: boolean | null;
  count: number; error?: string;
}

interface TtGroupResult {
  id: string; label: string;
  objects: TtObjectResult[];
  accessibleCount: number; inaccessibleCount: number; undeterminedCount: number; totalCount: number;
}

interface FieldCheckResult {
  id: string; object: string; label: string; description: string;
  ourFields: string[];
  requiredFieldsFound:   string[];
  requiredFieldsMissing: string[]; // always [] when describeError is non-null
  describeError:         string | null;
  describeUndetermined:  boolean;  // true = throttled; undetermined, not missing
}

interface SalesforceResult {
  checks: SalesforceCheck[];
  orgInfo: { name: string | null; id: string | null; edition: string | null; sandboxType: string | null } | null;
  objects: { object: string; accessible: boolean; count: number; error?: string }[];
  npspDetected: boolean;
  pmmDetected: boolean;
  pmmObjects: PmmObject[];
  ttCustomObjects: {
    groups: TtGroupResult[];
    totalAccessible: number; totalInaccessible: number; totalUndetermined: number; totalObjects: number;
  };
  customFieldChecks: FieldCheckResult[];
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
        const cls = val === true  ? 'bg-[#E6F0EA]0 border-[#E6F0EA]0 text-white'
                  : val === false ? 'bg-[#A93F2F] border-[#A93F2F] text-white'
                  : 'bg-muted border-border text-muted-foreground';
        const icon = val === true ? '✓' : val === false ? '✗' : '—';
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && <div className="w-3 h-px bg-border" />}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[14px] font-bold ${cls}`}>
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
    valid:         { cls: 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]', label: 'Valid — API responding' },
    quota_exceeded:{ cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]',   label: 'Quota limit — key valid' },
    auth_error:    { cls: 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]',       label: 'Auth error — key rejected' },
    format_invalid:{ cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]',   label: 'Format invalid' },
    key_missing:   { cls: 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]',       label: 'Key missing' },
    api_error:     { cls: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]',   label: 'API error' },
    network_error: { cls: 'border-slate-200 bg-slate-50 text-slate-600',   label: 'Network unreachable' },
  };

  const cfg = result ? statusCfg[result.status] : null;

  return (
    <div className="rounded-lg border border-[#7FAFC6] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#EDF5F8] border-b border-[#7FAFC6]">
        <Brain className="w-4 h-4 text-[#2F6F7E]" />
        <span className="text-[14px] font-bold text-[#2F6F7E]">Gemini / {TERMS.aiAssistant} AI</span>
        <code className="text-[14px] font-mono text-[#2F6F7E] ml-1">GEMINI_API_KEY</code>
        {result && cfg && (
          <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border ${cfg.cls}`}>{cfg.label}</span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading && <p className="text-[14px] text-muted-foreground italic">Calling Generative Language API…</p>}
        {result && (
          <>
            <TierBar tiers={tiers} />
            {result.status === 'valid' && (
              <div className="rounded border border-[#9FC3AE] bg-[#E6F0EA] px-3 py-2">
                <p className="text-[14px] font-bold text-[#245531] mb-1">
                  API key valid — {result.modelCount} models available ({result.durationMs}ms)
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.modelSample.map(m => (
                    <span key={m} className="text-[14px] font-mono bg-white border border-[#9FC3AE] text-[#2F6B3F] px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {result.status !== 'valid' && result.errorMessage && (
              <div className="rounded border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2">
                <p className="text-[14px] font-bold text-[#CC8400] mb-0.5 ">
                  {result.errorCode ? `Error ${result.errorCode}` : 'Issue'}
                </p>
                <p className="text-[14px] text-[#CC8400]">{result.errorMessage}</p>
              </div>
            )}
            <p className="text-[14px] text-muted-foreground leading-snug">{result.nextStep}</p>
            <p className="text-[14px] text-muted-foreground/60">
              Validated at {new Date(result.timestamp).toLocaleTimeString()} · {result.durationMs}ms
            </p>
          </>
        )}
        {!result && !loading && (
          <p className="text-[14px] text-muted-foreground italic">Click "Run Live Checks" to validate the Gemini API key.</p>
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
  const tierCls = svc.tier === 'api_ready' ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]'
    : svc.tier === 'oauth_incomplete' ? 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]'
    : 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]';

  return (
    <div className="border-t border-border/30 px-4 py-2.5">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-[14px] font-semibold text-foreground w-28 shrink-0">{name}</span>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border ${tierCls}`}>{svc.label}</span>
      </div>
      <p className="text-[14px] text-muted-foreground leading-snug mb-1">{svc.nextStep}</p>
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
    <div className="rounded-lg border border-[#7FAFC6] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#EDF5F8] border-b border-[#7FAFC6]">
        <Globe className="w-4 h-4 text-[#2F6F7E]" />
        <span className="text-[14px] font-bold text-[#2F6F7E]">Google Workspace</span>
        <span className="text-[14px] text-[#2F6F7E] ml-1">Drive + Calendar</span>
        {result && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border ${result.googleReachable ? 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {result.googleReachable ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {result.googleReachable ? `Reachable ${result.reachabilityMs}ms` : 'Unreachable'}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        {loading && <p className="text-[14px] text-muted-foreground italic">Checking Google OAuth credentials…</p>}
        {result && (
          <>
            {/* Shared OAuth tier */}
            <div className="space-y-1.5">
              <p className="text-[14px] font-bold  text-foreground">Shared OAuth Credentials</p>
              <TierBar tiers={sharedTiers} />
              <div className={`rounded border px-3 py-2 ${sharedReady ? 'border-[#9FC3AE] bg-[#E6F0EA]' : 'border-[#FFD08A] bg-[#FFF3E0]'}`}>
                <p className={`text-[14px] font-semibold mb-0.5 ${sharedReady ? 'text-[#245531]' : 'text-[#CC8400]'}`}>{result.sharedOAuth.label}</p>
                <p className={`text-[14px] leading-snug ${sharedReady ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>{result.sharedOAuth.details}</p>
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
              <div className="rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2">
                <p className="text-[14px] font-bold text-[#2F6F7E] mb-1 ">Next steps</p>
                <ol className="space-y-0.5">
                  {result.nextSteps.map((s, i) => (
                    <li key={i} className="text-[14px] text-[#2F6F7E] flex gap-1.5">
                      <span className="shrink-0 font-bold">{i + 1}.</span>
                      <span className="leading-snug">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-[14px] text-muted-foreground/60">
              Validated at {new Date(result.timestamp).toLocaleTimeString()} · {result.durationMs}ms
            </p>
          </>
        )}
        {!result && !loading && (
          <p className="text-[14px] text-muted-foreground italic">Click "Run Live Checks" to validate Google credentials.</p>
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
    ? 'border-[#9FC3AE] bg-[#E6F0EA]'
    : result ? 'border-[#E8B9B4] bg-[#FBEAE6]' : 'border-[#9FC3AE] bg-[#E6F0EA]';

  return (
    <div className={`rounded-lg border bg-white overflow-hidden ${connected ? 'border-[#9FC3AE]' : result ? 'border-[#E8B9B4]' : 'border-[#9FC3AE]'}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerCls}`}>
        <Database className={`w-4 h-4 ${connected ? 'text-[#2F6B3F]' : 'text-[#2F6B3F]'}`} />
        <span className={`text-[14px] font-bold ${connected ? 'text-[#245531]' : 'text-[#245531]'}`}>Salesforce</span>
        <span className="text-[14px] text-[#2F6B3F] ml-1">via Replit Connector</span>
        {result && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border ${
            connected
              ? 'border-[#9FC3AE] bg-white text-[#2F6B3F]'
              : 'border-[#E8B9B4] bg-white text-[#A93F2F]'
          }`}>
            {connected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {connected ? 'Connected' : 'Connection failed'}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {loading && <p className="text-[14px] text-muted-foreground italic">Calling Salesforce REST API via Replit Connector…</p>}

        {result && connected && (
          <>
            {/* Org + identity banner */}
            <div className="rounded border border-[#9FC3AE] bg-[#E6F0EA] px-3 py-2 space-y-1">
              <p className="text-[14px] font-bold text-[#245531]">
                {result.orgInfo?.name ?? 'Org'} · {result.orgInfo?.edition} · {result.orgInfo?.sandboxType}
              </p>
              {result.identity && (
                <p className="text-[14px] text-[#2F6B3F]">
                  Authenticated as <strong>{result.identity.displayName ?? result.identity.username}</strong>
                  {result.identity.email ? ` (${result.identity.email})` : ''}
                </p>
              )}
              <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                {result.objects.map(o => (
                  <span key={o.object} className={`inline-flex items-center gap-1 text-[14px] font-bold ${o.accessible ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}`}>
                    {o.accessible ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {o.object}: {o.accessible ? `${o.count.toLocaleString()} records` : 'no access'}
                  </span>
                ))}
                {result.npspDetected && (
                  <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#2F6B3F]">
                    <CheckCircle className="w-3 h-3" /> NPSP
                  </span>
                )}
                {result.pmmDetected && (
                  <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#2F6F7E]">
                    <CheckCircle className="w-3 h-3" /> PMM
                  </span>
                )}
              </div>
            </div>

            {/* PMM object breakdown */}
            {result.pmmObjects && result.pmmObjects.length > 0 && (
              <div className="rounded border border-[#7FAFC6] bg-[#EDF5F8] px-3 py-2 space-y-1.5">
                <p className="text-[14px] font-bold text-[#2F6F7E]">
                  Program Management Module (PMM)
                  {result.pmmDetected
                    ? ` · ${result.pmmObjects.filter(o => o.accessible).length}/${result.pmmObjects.length} objects accessible`
                    : ' · not detected'}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {result.pmmObjects.map(o => (
                    <div key={o.object} className="flex items-center gap-1.5">
                      {o.accessible
                        ? <CheckCircle className="w-3 h-3 text-[#2F6F7E] shrink-0" />
                        : <XCircle className="w-3 h-3 text-[#A93F2F] shrink-0" />}
                      <span className={`text-[14px] font-semibold ${o.accessible ? 'text-[#2F6F7E]' : 'text-[#A93F2F]'}`}>{o.label}</span>
                      {o.accessible && (
                        <span className="text-[14px] text-[#2F6F7E] ml-auto">{o.count.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
                {result.pmmDetected && (
                  <p className="text-[14px] text-[#2F6F7E] pt-0.5">
                    Total: {result.pmmObjects.filter(o => o.accessible).reduce((s, o) => s + o.count, 0).toLocaleString()} records across {result.pmmObjects.filter(o => o.accessible).length} PMM objects
                  </p>
                )}
              </div>
            )}

            {/* TT custom objects — 3 groups */}
            {result.ttCustomObjects && result.ttCustomObjects.groups.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[14px] font-bold text-foreground">
                  Transition Trails Custom Objects
                  <span className={`ml-1.5 font-normal ${
                    result.ttCustomObjects.totalInaccessible > 0 ? 'text-[#A93F2F]'
                    : result.ttCustomObjects.totalUndetermined > 0 ? 'text-[#CC8400]'
                    : 'text-[#2F6B3F]'
                  }`}>
                    · {result.ttCustomObjects.totalAccessible}/{result.ttCustomObjects.totalObjects} confirmed accessible
                    {result.ttCustomObjects.totalInaccessible > 0 && ` · ${result.ttCustomObjects.totalInaccessible} inaccessible`}
                    {result.ttCustomObjects.totalUndetermined > 0 && ` · ${result.ttCustomObjects.totalUndetermined} undetermined`}
                  </span>
                </p>
                {result.ttCustomObjects.groups.map(group => (
                  <div key={group.id} className={`rounded border px-3 py-2 space-y-1 ${
                    group.inaccessibleCount > 0 ? 'border-[#E8B9B4] bg-[#FBEAE6]/40'
                    : group.undeterminedCount > 0 ? 'border-[#FFD08A] bg-[#FFF3E0]/40'
                    : 'border-[#9FC3AE] bg-[#E6F0EA]/40'
                  }`}>
                    <p className={`text-[14px] font-semibold ${
                      group.inaccessibleCount > 0 ? 'text-[#A93F2F]'
                      : group.undeterminedCount > 0 ? 'text-[#CC8400]'
                      : 'text-[#245531]'
                    }`}>
                      {group.label}
                      <span className="font-normal ml-1.5">
                        · {group.accessibleCount} accessible
                        {group.inaccessibleCount > 0 && <span className="text-[#A93F2F]"> · {group.inaccessibleCount} inaccessible</span>}
                        {group.undeterminedCount > 0 && <span className="text-[#CC8400]"> · {group.undeterminedCount} undetermined</span>}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {group.objects.map(o => (
                        <div key={o.object} className="flex items-start gap-1.5 min-w-0">
                          {o.accessible === true
                            ? <CheckCircle className="w-3 h-3 text-[#2F6B3F] shrink-0 mt-0.5" />
                            : o.accessible === false
                              ? <XCircle className="w-3 h-3 text-[#A93F2F] shrink-0 mt-0.5" />
                              : <HelpCircle className="w-3 h-3 text-[#CC8400] shrink-0 mt-0.5" />}
                          <div className="min-w-0 flex-1">
                            <span className={`text-[14px] font-semibold ${
                              o.accessible === true ? 'text-foreground'
                              : o.accessible === false ? 'text-[#A93F2F]'
                              : 'text-[#CC8400]'
                            }`}>{o.label}</span>
                            {o.accessible === true
                              ? <span className="text-[14px] text-muted-foreground ml-1.5">{o.count.toLocaleString()}</span>
                              : o.accessible === false && o.error
                                ? <span className="text-[14px] text-[#A93F2F]/70 ml-1 truncate" title={o.error}>{o.error.slice(0, 30)}</span>
                                : <span className="text-[14px] text-[#CC8400]/80 ml-1">undetermined</span>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom field verification on reused objects */}
            {result.customFieldChecks && result.customFieldChecks.length > 0 && (() => {
              const allDescribesFailed = result.customFieldChecks.every(fc => !!fc.describeError);
              return (
              <div className="space-y-1.5">
                <p className="text-[14px] font-bold text-foreground">
                  Custom Fields on Reused Objects
                  {allDescribesFailed && (
                    <span className="ml-1.5 font-normal text-[#CC8400]">· all describes failed</span>
                  )}
                </p>
                {allDescribesFailed && (
                  <div className="flex items-start gap-2 rounded border border-[#FFD08A] bg-[#FFF3E0] px-3 py-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#CC8400] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#CC8400]">Field checks skipped — describe permission missing org-wide</p>
                      <p className="text-[14px] text-[#CC8400]/80 mt-0.5">
                        Every object describe call failed. This is <strong>not a pass</strong> — field presence could not be verified.
                        Grant the connected Salesforce user "View Setup and Configuration" or "Modify All Data" permission, then rerun validation.
                      </p>
                    </div>
                  </div>
                )}
                {result.customFieldChecks.map(fc => {
                  const isUndetermined = fc.describeUndetermined;
                  const hasError       = !!fc.describeError && !isUndetermined;
                  const allPresent     = !fc.describeError && fc.requiredFieldsMissing.length === 0;
                  const hasMissing     = !fc.describeError && fc.requiredFieldsMissing.length > 0;
                  return (
                    <div key={fc.id} className={`rounded border px-3 py-2 ${
                      isUndetermined ? 'border-[#FFD08A] bg-[#FFF3E0]/40'
                      : hasError     ? 'border-[#E8B9B4] bg-[#FBEAE6]/40'
                      : hasMissing   ? 'border-[#FFD08A] bg-[#FFF3E0]/40'
                      : 'border-[#9FC3AE] bg-[#E6F0EA]/40'
                    }`}>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {isUndetermined
                          ? <HelpCircle className="w-3 h-3 text-[#CC8400] shrink-0" />
                          : allPresent
                            ? <CheckCircle className="w-3 h-3 text-[#2F6B3F] shrink-0" />
                            : <AlertTriangle className="w-3 h-3 text-[#CC8400] shrink-0" />}
                        <span className="text-[14px] font-semibold text-foreground">{fc.label}</span>
                        <span className="text-[14px] text-muted-foreground">{fc.description}</span>
                        <span className={`ml-auto text-[14px] font-semibold ${
                          isUndetermined ? 'text-[#CC8400]'
                          : hasError     ? 'text-[#A93F2F]'
                          : hasMissing   ? 'text-[#CC8400]'
                          : 'text-[#2F6B3F]'
                        }`}>
                          {isUndetermined ? '? TT fields' : `${fc.ourFields.length} TT fields`}
                        </span>
                      </div>
                      {isUndetermined && (
                        <p className="text-[14px] text-[#CC8400] mt-0.5">
                          Describe rate-limited — field status undetermined. Rerun validation to confirm.
                        </p>
                      )}
                      {hasError && (
                        <p className="text-[14px] text-[#A93F2F] mt-0.5">Describe failed: {fc.describeError!.slice(0, 100)}</p>
                      )}
                      {hasMissing && (
                        <div className="mt-1">
                          <span className="text-[14px] text-[#CC8400] font-semibold">Missing required: </span>
                          <span className="text-[14px] text-[#CC8400] font-mono">{fc.requiredFieldsMissing.join(', ')}</span>
                        </div>
                      )}
                      {allPresent && fc.requiredFieldsFound.length > 0 && (
                        <p className="text-[14px] text-[#2F6B3F]/70 mt-0.5">
                          All {fc.requiredFieldsFound.length} required fields present.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              );})()}

            {/* Check list */}
            <div className="space-y-1">
              {result.checks.map(c => {
                const icon = c.status === 'pass'
                  ? <CheckCircle className="w-3 h-3 text-[#2F6B3F] shrink-0 mt-0.5" />
                  : c.status === 'warning'
                  ? <AlertTriangle className="w-3 h-3 text-[#CC8400] shrink-0 mt-0.5" />
                  : <XCircle className="w-3 h-3 text-[#A93F2F] shrink-0 mt-0.5" />;
                return (
                  <div key={c.id} className="flex items-start gap-2">
                    {icon}
                    <div>
                      <span className="text-[14px] font-semibold text-foreground">{c.label}</span>
                      <span className="text-[14px] text-muted-foreground ml-1.5 leading-snug">{c.detail.slice(0, 120)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-[14px] text-muted-foreground/60">
                {passCount}/{totalChecks} checks passed · {warnCount} warnings · {result.durationMs}ms
              </span>
              <span className="text-[14px] text-muted-foreground/60">
                Validated at {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </>
        )}

        {result && !connected && (
          <div className="rounded border border-[#E8B9B4] bg-[#FBEAE6] px-3 py-2 space-y-1">
            {result.checks.filter(c => c.status === 'fail').map(c => (
              <p key={c.id} className="text-[14px] text-[#A93F2F]"><strong>{c.label}:</strong> {c.detail.slice(0, 150)}</p>
            ))}
          </div>
        )}

        {!result && !loading && (
          <p className="text-[14px] text-muted-foreground italic">
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]">
      <CheckCircle className="w-3 h-3" /> PRESENT
    </span>
  );
  if (status === 'found-alternate') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]">
      <CheckCircle className="w-3 h-3" /> ALT NAME
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]">
      <XCircle className="w-3 h-3" /> MISSING
    </span>
  );
}

function FormatBadge({ format }: { format: FormatResult }) {
  if (!format.checked) return <span className="inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border border-border bg-muted text-muted-foreground">UNCHECKED</span>;
  if (format.plausible) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]"><CheckCircle className="w-3 h-3" /> FORMAT ✓</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[14px] font-bold border border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]"><AlertTriangle className="w-3 h-3" /> FORMAT ?</span>;
}

function RequiredBadge({ required }: { required: boolean }) {
  return required
    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border border-[#FBEAE6] bg-[#FBEAE6] text-[#A93F2F] ">Required</span>
    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[14px] font-bold border border-border bg-muted text-muted-foreground ">Optional</span>;
}

function IntegrationStatusBadge({ status }: { status: IntegrationSummary['overallStatus'] }) {
  const cfg = { configured: 'border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]', ready: 'border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E]', partial: 'border-[#FFD08A] bg-[#FFF3E0] text-[#CC8400]', missing: 'border-[#E8B9B4] bg-[#FBEAE6] text-[#A93F2F]' }[status];
  const label = { configured: 'Configured', ready: 'Partial', partial: 'Partial', missing: 'Missing' }[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border  ${cfg}`}>{label}</span>;
}

// ── Secret Row ────────────────────────────────────────────────────────────────

function SecretRow({ entry }: { entry: SecretEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasFormatIssue = entry.format.checked && entry.format.plausible === false;
  const hasAlternate = entry.status === 'found-alternate';
  return (
    <div className={`border-b border-border/30 ${entry.status === 'missing' && entry.required ? 'bg-[#FBEAE6]/30' : ''}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
        <div className="pt-0.5 shrink-0">
          {entry.status !== 'missing' ? <CheckCircle className="w-3.5 h-3.5 text-[#2F6B3F]" /> : <XCircle className="w-3.5 h-3.5 text-[#A93F2F]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <code className="text-[14px] font-mono font-semibold text-foreground">{entry.name}</code>
            {hasAlternate && entry.foundName && <span className="text-[14px] text-[#2F6F7E] font-mono">→ found as {entry.foundName}</span>}
            <RequiredBadge required={entry.required} />
          </div>
          <p className="text-[14px] text-muted-foreground truncate pr-4">{entry.purpose}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <StatusBadge status={entry.status} />
          <FormatBadge format={entry.format} />
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 ml-7 space-y-2">
          <div className="rounded-lg border border-border bg-white p-3 space-y-1.5 text-[14px]">
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Category</span><span className="font-medium">{entry.category}</span></div>
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Primary name</span><code className="font-mono">{entry.name}</code></div>
            {entry.alternateNames.length > 0 && (
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Alternates checked</span>
                <div className="flex flex-wrap gap-1">{entry.alternateNames.map(a => <code key={a} className="font-mono text-muted-foreground">{a}</code>)}</div>
              </div>
            )}
            {entry.format.checked && <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Format check</span><span className={entry.format.plausible ? 'text-[#2F6B3F]' : 'text-[#CC8400]'}>{entry.format.hint}</span></div>}
            <div className="flex gap-2"><span className="text-muted-foreground w-28 shrink-0">Purpose</span><span className="leading-snug">{entry.purpose}</span></div>
            {entry.status === 'missing' && entry.nextFix && (
              <div className="mt-1 rounded border border-[#FFD08A] bg-[#FFF3E0] px-2.5 py-1.5">
                <p className="text-[14px] font-bold text-[#CC8400] mb-0.5 ">Next fix</p>
                <p className="text-[14px] text-[#CC8400] leading-snug">{entry.nextFix}</p>
              </div>
            )}
            {hasFormatIssue && (
              <div className="mt-1 rounded border border-[#FFD08A] bg-[#FFF3E0] px-2.5 py-1.5">
                <p className="text-[14px] font-bold text-[#CC8400] mb-0.5 ">Format warning</p>
                <p className="text-[14px] text-[#CC8400] leading-snug">{entry.format.hint}</p>
                {entry.nextFix && <p className="text-[14px] text-[#CC8400] mt-0.5 leading-snug">{entry.nextFix}</p>}
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
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border shrink-0 ${summary.colorCls}`}>{summary.label}</span>
          <IntegrationStatusBadge status={summary.overallStatus} />
          <span className="text-[14px] text-muted-foreground">{present}/{entries.length} secrets present</span>
          {summary.missingRequired > 0 && <span className="text-[14px] font-semibold text-[#A93F2F]">{summary.missingRequired} required missing</span>}
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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[14px] font-bold border border-primary/20 bg-primary/5 text-primary ">Live</span>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Two-layer audit: <strong>Presence &amp; Format</strong> (instant, all integrations) and <strong>Live Validation</strong> (on-demand API calls to Gemini and Google). Secret <strong>values are never transmitted</strong>.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20 shrink-0 flex-wrap">
        <button onClick={runAudit} disabled={auditLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[14px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
          {auditLoading ? 'Auditing…' : 'Refresh Audit'}
        </button>

        <button onClick={runLiveChecks} disabled={liveStatus === 'loading'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[14px] font-semibold border border-[#7FAFC6] bg-[#EDF5F8] text-[#2F6F7E] hover:bg-[#EDF5F8] disabled:opacity-50">
          <Zap className={`w-3.5 h-3.5 ${liveStatus === 'loading' ? 'animate-pulse' : ''}`} />
          {liveStatus === 'loading' ? 'Calling APIs…' : 'Run Live Checks'}
        </button>

        {auditData && (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#9FC3AE] bg-[#E6F0EA] text-[14px] font-semibold text-[#2F6B3F]">
              <CheckCircle className="w-3.5 h-3.5" />{auditData.summary.totalPresent} present
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#E8B9B4] bg-[#FBEAE6] text-[14px] font-semibold text-[#A93F2F]">
              <XCircle className="w-3.5 h-3.5" />{auditData.summary.missingRequired} required missing
            </div>
            {auditData.summary.formatIssues > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#FFD08A] bg-[#FFF3E0] text-[14px] font-semibold text-[#CC8400]">
                <AlertTriangle className="w-3.5 h-3.5" />{auditData.summary.formatIssues} format {auditData.summary.formatIssues === 1 ? 'issue' : 'issues'}
              </div>
            )}
            <span className="ml-auto text-[14px] text-muted-foreground">Last checked {new Date(auditData.timestamp).toLocaleTimeString()}</span>
          </>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-4xl">

          {/* Security notice */}
          <div className="rounded-lg border border-[#9FC3AE] bg-[#E6F0EA] px-4 py-3 flex gap-3">
            <Lock className="w-4 h-4 text-[#2F6B3F] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-[#245531] mb-0.5">Security — No Secret Values Exposed</p>
              <p className="text-[14px] text-[#245531] leading-relaxed">
                Presence checks and format checks run server-side (no value ever sent to the client).
                Live validation calls external APIs using secrets held only in server memory — the
                API response (model list, error code) is what's returned, never the key itself.
              </p>
            </div>
          </div>

          {/* ── Live Validation Panel ─────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#2F6F7E]" />
              <p className="text-[14px] font-bold  text-foreground">Live API Validation</p>
              <span className="text-[14px] text-muted-foreground">— 5-tier readiness: Secret present → Format valid → API reachable → Auth valid → Integration ready</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <SalesforceCard result={salesforceResult} loading={liveStatus === 'loading'} />
              <GeminiCard result={geminiResult} loading={liveStatus === 'loading'} />
              <GoogleCard result={googleResult} loading={liveStatus === 'loading'} />
            </div>
            {liveStatus === 'error' && (
              <p className="mt-2 text-[14px] text-[#A93F2F]">Live check failed — ensure the API server is running and try again.</p>
            )}
          </div>

          {/* ── Presence & Format Audit ───────────────────────────────────── */}
          {(auditLoading && !auditData) && (
            <div className="rounded-lg border border-border bg-white p-8 text-center">
              <RefreshCw className="w-6 h-6 text-muted-foreground/40 animate-spin mx-auto mb-2" />
              <p className="text-[14px] text-muted-foreground">Running secrets audit…</p>
            </div>
          )}
          {auditError && (
            <div className="rounded-lg border border-[#E8B9B4] bg-[#FBEAE6] px-4 py-3">
              <p className="text-[14px] font-semibold text-[#A93F2F]">Audit failed: {auditError}</p>
              <p className="text-[14px] text-[#A93F2F] mt-0.5">Check the API server is running, then click Refresh Audit.</p>
            </div>
          )}

          {auditData && (
            <>
              {/* Overview grid */}
              <div>
                <p className="text-[14px] font-bold  text-foreground mb-2">Integration Overview — Presence &amp; Format</p>
                <div className="grid grid-cols-2 gap-2">
                  {auditData.summaries.map(s => {
                    const bg = { configured: 'border-[#9FC3AE] bg-[#E6F0EA]', ready: 'border-[#7FAFC6] bg-[#EDF5F8]', partial: 'border-[#FFD08A] bg-[#FFF3E0]', missing: 'border-[#E8B9B4] bg-[#FBEAE6]' }[s.overallStatus];
                    return (
                      <div key={s.id} className={`rounded-lg border p-3 ${bg}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[14px] font-bold text-foreground">{s.label}</p>
                          <IntegrationStatusBadge status={s.overallStatus} />
                        </div>
                        <div className="flex items-center gap-1 text-[14px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{s.presentCount}</span>
                          <span>present</span>
                          {s.missingRequired > 0 && <span className="ml-1 font-semibold text-[#A93F2F]">· {s.missingRequired} required missing</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Per-integration detail */}
              <div>
                <p className="text-[14px] font-bold  text-foreground mb-2">Secret Detail by Integration</p>
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
                  <p className="text-[14px] font-bold  text-foreground mb-2">Highest Priority Missing Secrets</p>
                  <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
                    {auditData.entries.filter(e => e.required && e.status === 'missing').map(e => (
                      <div key={e.id} className="flex items-start gap-3 px-4 py-2.5">
                        <XCircle className="w-3.5 h-3.5 text-[#A93F2F] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <code className="text-[14px] font-mono font-semibold text-foreground">{e.name}</code>
                            <span className="text-[14px] text-muted-foreground">({e.integration})</span>
                          </div>
                          <p className="text-[14px] text-muted-foreground">{e.nextFix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Google OAuth action card */}
              {auditData.entries.some(e => e.integration.startsWith('Google') && e.status === 'missing') && (
                <div className="rounded-lg border border-[#7FAFC6] bg-[#EDF5F8] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-[#2F6F7E] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <p className="text-[14px] font-bold text-[#2F6F7E]">Google OAuth — Authorization Flow Available</p>
                        {auditData.entries.filter(e => e.integration === 'Google' && e.status !== 'missing').length >= 2 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[14px] font-bold border border-[#9FC3AE] bg-[#E6F0EA] text-[#2F6B3F]">
                            <CheckCircle className="w-3 h-3" /> Client credentials ready
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-[#2F6F7E] leading-relaxed mb-3">
                        GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured. The built-in OAuth flow will authorize Drive, Calendar, and Gmail together,
                        display the refresh token once for copying into Replit Secrets as three separate secret names, and guide you through every step.
                      </p>
                      <button
                        onClick={() => navigate('/admin/google-oauth')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-bold bg-[#2F6F7E] text-white hover:bg-[#225968] transition-colors"
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
              {(() => {
                const googleTokenIds = ['google-drive-refresh', 'google-cal-refresh', 'google-gmail-refresh'];
                const presentCount = auditData.entries.filter(e => googleTokenIds.includes(e.id) && e.status !== 'missing').length;
                const missingGmail = auditData.entries.find(e => e.id === 'google-gmail-refresh' && e.status === 'missing');
                if (presentCount === 0) return null;
                return (
                  <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${presentCount === 3 ? 'border-[#9FC3AE] bg-[#E6F0EA]' : 'border-[#FFD08A] bg-[#FFF3E0]'}`}>
                    {presentCount === 3
                      ? <CheckCircle className="w-4 h-4 text-[#2F6B3F] shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-[#CC8400] shrink-0" />}
                    <div className="flex-1">
                      {presentCount === 3 ? (
                        <>
                          <p className="text-[14px] font-bold text-[#245531]">Google Drive + Calendar + Gmail: All refresh tokens configured</p>
                          <p className="text-[14px] text-[#2F6B3F] mt-0.5">Run Live Checks above to confirm the tokens are valid and API-ready.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[14px] font-bold text-[#CC8400]">Google OAuth: {presentCount}/3 refresh tokens configured</p>
                          <p className="text-[14px] text-[#CC8400] mt-0.5">
                            {missingGmail ? 'GOOGLE_GMAIL_REFRESH_TOKEN is missing — re-run the OAuth wizard and save the token under all three secret names.' : 'Re-run the OAuth wizard to authorize all three services.'}
                          </p>
                        </>
                      )}
                    </div>
                    <button onClick={() => navigate('/admin/integrations/google-auth')}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded border text-[14px] font-semibold ${presentCount === 3 ? 'border-[#9FC3AE] bg-white text-[#2F6B3F] hover:bg-[#E6F0EA]' : 'border-[#FFD08A] bg-white text-[#CC8400] hover:bg-[#FFF3E0]'}`}>
                      Re-authorize <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
