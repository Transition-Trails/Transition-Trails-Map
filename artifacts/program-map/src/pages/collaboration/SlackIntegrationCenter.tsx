import { useState, useMemo } from 'react';
import { HubShell } from '@/components/layout/HubShell';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectWorkspace } from '@/components/workspace/ObjectWorkspace';
import { HealthDot } from '@/components/workspace/ObjectWorkspace';
import type { WorkspaceItem, WorkspaceTab } from '@/components/workspace/ObjectWorkspace';
import {
  Hash, Settings, Users, Brain, FileText, Activity, Shield, BarChart2, FlaskConical,
  CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import {
  SLACK_WORKSPACE, SLACK_CHANNELS, SLACK_USER_MAPPINGS, PENNY_SLACK_CAPABILITIES,
  SLACK_TEMPLATES, SLACK_ACTIVITY, SLACK_GOVERNANCE, SLACK_HEALTH_SCORES, SLACK_TESTS,
  getTestCategories, getOverallTestCoverage, getPennyEnabledChannels,
  type SlackChannel, type SlackUserMapping, type SlackHealthScore,
} from '@/data/slackIntegrationData';

// ── Shared utilities ──────────────────────────────────────────────────────────
function ReadinessBadge({ status }: { status: string }) {
  const cls =
    status === 'ready'     || status === 'operational' || status === 'passing' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    status === 'partial'   || status === 'in-development'                      ? 'bg-amber-50   text-amber-700   border-amber-200'  :
    status === 'not-ready' || status === 'pending' || status === 'failing'     ? 'bg-rose-50    text-rose-700    border-rose-200'   :
    status === 'planned'                                                        ? 'bg-sky-50     text-sky-700     border-sky-200'    :
                                                                                  'bg-muted       text-muted-foreground border-border';
  const label =
    status === 'ready'          ? 'Ready'         :
    status === 'partial'        ? 'Partial'       :
    status === 'not-ready'      ? 'Not Ready'     :
    status === 'planned'        ? 'Planned'       :
    status === 'operational'    ? 'Operational'   :
    status === 'in-development' ? 'In Dev'        :
    status === 'passing'        ? 'Passing'       :
    status === 'failing'        ? 'Failing'       :
    status === 'pending'        ? 'Pending'       : status;
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cls}`}>{label}</span>;
}

function ScoreGauge({ score, max, status }: { score: number; max: number; status: string }) {
  const pct = Math.round((score / max) * 100);
  const barCls = status === 'ready' ? 'bg-emerald-400' : status === 'partial' ? 'bg-amber-400' : 'bg-rose-400';
  const textCls = status === 'ready' ? 'text-emerald-600' : status === 'partial' ? 'text-amber-600' : 'text-rose-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[11px] font-bold tabular-nums shrink-0 ${textCls}`}>{pct}%</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 w-32 shrink-0 mt-0.5">{label}</span>
      <span className="text-[12px] text-foreground flex-1">{value}</span>
    </div>
  );
}

// ── Tab 1: Overview ───────────────────────────────────────────────────────────
function OverviewTab() {
  const productionScore = SLACK_HEALTH_SCORES.find(s => s.dimension === 'production');
  const pennyScore      = SLACK_HEALTH_SCORES.find(s => s.dimension === 'penny');
  const channelScore    = SLACK_HEALTH_SCORES.find(s => s.dimension === 'channels');
  const userScore       = SLACK_HEALTH_SCORES.find(s => s.dimension === 'users');
  const wsScore         = SLACK_HEALTH_SCORES.find(s => s.dimension === 'workspace');
  const pennyEnabled    = getPennyEnabledChannels();

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-5 max-w-4xl">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[11px] font-bold text-primary uppercase mb-1">Slack Integration Center — Phase 1</p>
          <p className="text-[12px] text-foreground leading-relaxed">
            The Slack Integration Center is the first production-focused integration module for Trail OS and the operational
            communications layer for Penny AI delivery. It connects Slack channels, users, and workspaces to the Unified Object Model,
            Context Engine, Digital Twin, and Global Search — enabling Penny to deliver coaching, briefs, quests, and alerts
            directly into the learner and coach communication flow.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:'Channels', value:String(SLACK_WORKSPACE.channelCount), sub:`${SLACK_WORKSPACE.activeChannels} active`, cls:'border-primary/20 bg-primary/5' },
            { label:'Members',  value:String(SLACK_WORKSPACE.memberCount),  sub:'Mapped to personas',                       cls:'border-blue-200 bg-blue-50' },
            { label:'Penny Enabled', value:String(pennyEnabled.length),    sub:'Active channels',                           cls:'border-pink-200 bg-pink-50' },
            { label:'Production', value:`${Math.round((productionScore?.score ?? 0) / (productionScore?.maxScore ?? 100) * 100)}%`, sub:'Readiness score', cls: wsScore?.status === 'ready' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.cls}`}>
              <p className="text-2xl font-bold font-serif text-foreground">{s.value}</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Workspace status */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700">OAuth Pending — Production Blockers</p>
          </div>
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Slack workspace architecture, channel registry, user-role mappings, and Penny integration configuration are
            all complete. <strong>Bot token, signing secret, and OAuth connection</strong> are required before live Penny delivery.
            All capabilities can be validated against mock data today.
          </p>
          <div className="flex gap-3 flex-wrap text-[10px] text-amber-700 font-semibold">
            <span>✗ Bot token not configured</span>
            <span>✗ Signing secret missing</span>
            <span>✗ OAuth pending admin approval</span>
          </div>
        </div>

        {/* Readiness overview */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-3">Integration Readiness by Dimension</p>
          <div className="space-y-2.5">
            {SLACK_HEALTH_SCORES.map(s => (
              <div key={s.dimension} className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-foreground w-40 shrink-0">{s.label}</span>
                <div className="flex-1">
                  <ScoreGauge score={s.score} max={s.maxScore} status={s.status} />
                </div>
                <ReadinessBadge status={s.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Penny delivery summary */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Active Penny Delivery</p>
          <div className="space-y-2">
            {PENNY_SLACK_CAPABILITIES.filter(c => c.readiness === 'operational').map(cap => (
              <div key={cap.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[12px] font-semibold text-foreground flex-1">{cap.capabilityName}</span>
                <span className="text-[10px] text-muted-foreground">{cap.enabledChannels.join(', ')}</span>
                {cap.qualityScore && <span className="text-[10px] font-bold text-emerald-600">{cap.qualityScore}%</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 2: Workspace Config ───────────────────────────────────────────────────
function WorkspaceConfigTab() {
  const ws = SLACK_WORKSPACE;
  const statusCls = ws.oauthStatus === 'connected' ? 'border-emerald-200 bg-emerald-50' :
                    ws.oauthStatus === 'pending'    ? 'border-amber-200 bg-amber-50'    :
                                                      'border-rose-200 bg-rose-50';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-3xl">
        {/* Connection status */}
        <div className={`rounded-lg border p-4 ${statusCls}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-bold text-foreground">Slack OAuth Status</p>
            <ReadinessBadge status={ws.oauthStatus} />
          </div>
          <p className="text-[11px] text-muted-foreground">{ws.validationNotes}</p>
        </div>

        {/* Workspace metadata */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Workspace Metadata</p>
          <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
            <InfoRow label="Display Name"   value={ws.displayName} />
            <InfoRow label="Domain"         value={`slack.com/T-${ws.domain}`} />
            <InfoRow label="Plan"           value={ws.plan} />
            <InfoRow label="Members"        value={`${ws.memberCount} members`} />
            <InfoRow label="Channels"       value={`${ws.channelCount} total, ${ws.activeChannels} active`} />
            <InfoRow label="Environment"    value={<ReadinessBadge status={ws.environment} />} />
            <InfoRow label="Bot User"       value={ws.botUser} />
            <InfoRow label="Last Synced"    value={ws.lastSynced} />
          </div>
        </div>

        {/* Credentials */}
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-2">Credentials & Security</p>
          <div className="space-y-2">
            {[
              { label:'Bot Token',      status: ws.botToken,      description:'Required for Penny to post messages to channels' },
              { label:'Signing Secret', status: ws.signingSecret, description:'Required for webhook signature validation' },
              { label:'User Token',     status: ws.userToken,     description:'Required for admin operations and channel management' },
            ].map(cred => (
              <div key={cred.label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cred.status === 'configured' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                {cred.status === 'configured' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-foreground">{cred.label}</p>
                  <p className="text-[11px] text-muted-foreground">{cred.description}</p>
                </div>
                <ReadinessBadge status={cred.status === 'configured' ? 'ready' : 'not-ready'} />
              </div>
            ))}
          </div>
        </div>

        {/* Permissions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-600 mb-2">Granted Permissions ({ws.permissionsGranted.length})</p>
            <div className="space-y-1">
              {ws.permissionsGranted.map(perm => (
                <div key={perm} className="flex items-center gap-2 text-[11px] text-foreground">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <code className="font-mono">{perm}</code>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-amber-600 mb-2">Missing Permissions ({ws.permissionsMissing.length})</p>
            <div className="space-y-1">
              {ws.permissionsMissing.map(perm => (
                <div key={perm} className="flex items-center gap-2 text-[11px] text-foreground">
                  <span className="text-amber-500 shrink-0">—</span>
                  <code className="font-mono">{perm}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Tab 3: Channel Registry (ObjectWorkspace) ─────────────────────────────────
function ChannelOverview({ ch }: { ch: SlackChannel }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <ReadinessBadge status={ch.lifecycle} />
          <ReadinessBadge status={ch.governanceStatus} />
          {ch.pennyEnabled && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-pink-50 text-pink-700 border border-pink-200">Penny Enabled</span>}
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-3">{ch.description}</p>
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Purpose"       value={ch.purpose} />
          <InfoRow label="Topic"         value={ch.topic} />
          <InfoRow label="Members"       value={`${ch.memberCount} members`} />
          <InfoRow label="Owner"         value={ch.owner} />
          <InfoRow label="Created"       value={ch.createdAt} />
          <InfoRow label="Archive Policy" value={ch.archivePolicy} />
          <InfoRow label="Message Rate"  value={ch.messageFrequency} />
          {ch.relatedProgram && <InfoRow label="Program" value={ch.relatedProgram} />}
          {ch.relatedCohort  && <InfoRow label="Cohort"  value={ch.relatedCohort} />}
          {ch.relatedRole    && <InfoRow label="Role"    value={ch.relatedRole} />}
        </div>
        <div className="flex items-center gap-2">
          <HealthDot health={ch.health} />
          <span className="text-[12px] text-muted-foreground">{ch.healthNote}</span>
        </div>
      </div>
    </ScrollArea>
  );
}

function ChannelPenny({ ch }: { ch: SlackChannel }) {
  const caps = PENNY_SLACK_CAPABILITIES.filter(cap => cap.enabledChannels.includes(ch.name));
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-2xl">
        {ch.pennyEnabled && caps.length > 0 ? (
          caps.map(cap => (
            <div key={cap.id} className="rounded-lg border border-pink-200 bg-pink-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-foreground">{cap.capabilityName}</p>
                <ReadinessBadge status={cap.readiness} />
              </div>
              <div className="rounded-lg border border-border bg-white divide-y divide-border/40 text-[11px]">
                <InfoRow label="Trigger"     value={cap.deliveryTrigger} />
                <InfoRow label="Condition"   value={cap.triggerCondition} />
                <InfoRow label="Format"      value={cap.outputFormat} />
                {cap.escalationChannel && <InfoRow label="Escalation" value={cap.escalationChannel} />}
                {cap.qualityScore !== undefined && <InfoRow label="Quality" value={`${cap.qualityScore}%`} />}
              </div>
            </div>
          ))
        ) : !ch.pennyEnabled ? (
          <div className="rounded-lg border border-muted bg-muted/30 p-4">
            <p className="text-[12px] text-muted-foreground">Penny is not enabled for <strong>{ch.name}</strong>.</p>
            {ch.lifecycle === 'active' && <p className="text-[11px] text-muted-foreground mt-1">To enable, assign Penny capabilities in the Penny Integration tab and ensure the bot is a channel member.</p>}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No Penny capabilities configured for this channel.</p>
        )}
      </div>
    </ScrollArea>
  );
}

function ChannelGovernance({ ch }: { ch: SlackChannel }) {
  const record = SLACK_GOVERNANCE.find(g => g.name === ch.name || g.name.includes(ch.name.replace('#','')));
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        {record ? (
          <>
            <div className={`rounded-lg border p-3 ${record.complianceStatus === 'compliant' ? 'border-emerald-200 bg-emerald-50' : record.complianceStatus === 'partial' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
              <p className="text-[11px] font-bold uppercase text-foreground/70 mb-0.5">Compliance Status</p>
              <p className="text-[12px] font-bold text-foreground capitalize">{record.complianceStatus}</p>
            </div>
            <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
              <InfoRow label="Owner"         value={record.owner} />
              <InfoRow label="Review Cadence" value={record.reviewCadence} />
              <InfoRow label="Last Review"   value={record.lastReview ?? '—'} />
              <InfoRow label="Next Review"   value={record.nextReview ?? '—'} />
              <InfoRow label="Archive Policy" value={ch.archivePolicy} />
            </div>
            {record.issues.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase text-amber-700 mb-1.5">Open Issues</p>
                {record.issues.map((issue, i) => (
                  <p key={i} className="text-[11px] text-amber-800 flex items-start gap-1.5"><span className="mt-0.5">⚠</span>{issue}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-[12px] font-bold text-rose-700 mb-1">Missing Governance Record</p>
            <p className="text-[11px] text-rose-700">No governance record found for {ch.name}. Owner, review cadence, and archive policy must be documented.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function ChannelRegistry() {
  const items = useMemo<WorkspaceItem[]>(() => SLACK_CHANNELS.map(ch => ({
    id: ch.id,
    name: ch.name,
    typeName: ch.purpose,
    typeColor: ch.purpose === 'cohort' ? 'text-emerald-700' : ch.purpose === 'coach' ? 'text-blue-700' : ch.purpose === 'penny' ? 'text-pink-700' : 'text-teal-700',
    typeBg:    ch.purpose === 'cohort' ? 'bg-emerald-50'    : ch.purpose === 'coach' ? 'bg-blue-50'    : ch.purpose === 'penny' ? 'bg-pink-50'    : 'bg-teal-50',
    status: ch.lifecycle,
    statusVariant: (ch.lifecycle === 'active' ? 'active' : ch.lifecycle === 'archived' ? 'inactive' : 'planning') as any,
    health: ch.health,
    secondary: `${ch.memberCount} members · ${ch.governanceStatus}`,
    owner: ch.owner,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'overview',    label:'Overview',    render:(item) => { const ch = SLACK_CHANNELS.find(c => c.id === item.id); return ch ? <ChannelOverview ch={ch} /> : null; } },
    { id:'penny',       label:'Penny',       render:(item) => { const ch = SLACK_CHANNELS.find(c => c.id === item.id); return ch ? <ChannelPenny ch={ch} /> : null; } },
    { id:'governance',  label:'Governance',  render:(item) => { const ch = SLACK_CHANNELS.find(c => c.id === item.id); return ch ? <ChannelGovernance ch={ch} /> : null; } },
    { id:'health',      label:'Health',      render:(item) => {
      const ch = SLACK_CHANNELS.find(c => c.id === item.id);
      if (!ch) return null;
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-3 max-w-2xl">
            {[
              { label:'Channel Lifecycle', health:ch.health, note:ch.healthNote },
              { label:'Governance',        health: (ch.governanceStatus === 'compliant' ? 'healthy' : ch.governanceStatus === 'needs-review' || ch.governanceStatus === 'missing-metadata' ? 'needs-attention' : 'incomplete') as any, note:ch.governanceStatus },
              { label:'Penny Integration', health: (ch.pennyEnabled ? 'healthy' : 'incomplete') as any, note: ch.pennyEnabled ? `${ch.pennyCapabilities.length} capabilities` : 'Not enabled' },
              { label:'UOM Mapping',       health: (ch.uomObjectId ? 'healthy' : 'needs-attention') as any, note: ch.uomObjectId ?? 'No UOM object ID' },
            ].map(ind => (
              <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5">
                  <HealthDot health={ind.health} />
                  <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{ind.note}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      );
    }},
  ], []);

  return <ObjectWorkspace icon={Hash} items={items} tabs={tabs} emptyTitle="Select a channel" emptyBody="Choose a Slack channel to view its configuration, Penny integration, governance, and health." />;
}

// ── Tab 4: User & Role Mapping (ObjectWorkspace) ──────────────────────────────
function UserMappingDetail({ mapping }: { mapping: SlackUserMapping }) {
  const roleColor = mapping.roleType === 'learner' ? 'text-emerald-700' : mapping.roleType === 'coach' ? 'text-blue-700' : mapping.roleType === 'executive-director' ? 'text-violet-700' : mapping.roleType === 'admin' ? 'text-orange-700' : 'text-muted-foreground';
  const roleBg    = mapping.roleType === 'learner' ? 'bg-emerald-50' : mapping.roleType === 'coach' ? 'bg-blue-50' : mapping.roleType === 'executive-director' ? 'bg-violet-50' : mapping.roleType === 'admin' ? 'bg-orange-50' : 'bg-muted';
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleBg} ${roleColor} border-border`}>{mapping.roleLabel}</span>
          <ReadinessBadge status={mapping.mappingStatus} />
        </div>
        <div className="rounded-lg border border-border bg-white divide-y divide-border/40">
          <InfoRow label="Slack Display"   value={mapping.slackDisplayName} />
          <InfoRow label="Slack User ID"   value={<code className="font-mono text-[11px]">{mapping.slackUserId}</code>} />
          <InfoRow label="Trail OS Persona" value={mapping.trailOsPersonaName} />
          <InfoRow label="Role Type"       value={mapping.roleLabel} />
          <InfoRow label="Mapping Status"  value={<ReadinessBadge status={mapping.mappingStatus} />} />
          <InfoRow label="Penny Enabled"   value={mapping.pennyEnabled ? <span className="text-emerald-600 font-semibold">Yes</span> : <span className="text-rose-600 font-semibold">No</span>} />
        </div>
        {mapping.relatedPrograms.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">Related Programs</p>
            <div className="flex flex-wrap gap-1">
              {mapping.relatedPrograms.map(p => <span key={p} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted border border-border text-foreground">{p}</span>)}
            </div>
          </div>
        )}
        {mapping.relatedCohorts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground/60 mb-1.5">Related Cohorts</p>
            <div className="flex flex-wrap gap-1">
              {mapping.relatedCohorts.map(c => <span key={c} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted border border-border text-foreground">{c}</span>)}
            </div>
          </div>
        )}
        {mapping.mappingStatus !== 'mapped' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-bold text-amber-700 mb-1">Mapping Issues</p>
            {mapping.mappingStatus === 'unmapped' ? (
              <p className="text-[11px] text-amber-800">This Slack user has no Trail OS persona assigned. Penny cannot deliver messages to unmapped users.</p>
            ) : (
              <p className="text-[11px] text-amber-800">Partial mapping — some fields are missing. Check Penny enablement and related programs.</p>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function UserRoleMapping() {
  const items = useMemo<WorkspaceItem[]>(() => SLACK_USER_MAPPINGS.map(m => ({
    id: m.id,
    name: m.slackDisplayName,
    typeName: m.roleLabel,
    typeColor: m.roleType === 'learner' ? 'text-emerald-700' : m.roleType === 'coach' ? 'text-blue-700' : 'text-muted-foreground',
    typeBg:    m.roleType === 'learner' ? 'bg-emerald-50'    : m.roleType === 'coach' ? 'bg-blue-50'    : 'bg-muted',
    status: m.mappingStatus,
    statusVariant: (m.mappingStatus === 'mapped' ? 'active' : m.mappingStatus === 'partial' ? 'planning' : 'draft') as any,
    health: m.healthStatus,
    secondary: m.trailOsPersonaName,
    owner: m.roleLabel,
  })), []);

  const tabs = useMemo<WorkspaceTab[]>(() => [
    { id:'detail', label:'Detail', render:(item) => { const m = SLACK_USER_MAPPINGS.find(x => x.id === item.id); return m ? <UserMappingDetail mapping={m} /> : null; } },
    { id:'health', label:'Health', render:(item) => {
      const m = SLACK_USER_MAPPINGS.find(x => x.id === item.id);
      if (!m) return null;
      return (
        <ScrollArea className="h-full">
          <div className="p-5 space-y-3 max-w-2xl">
            {[
              { label:'Mapping Status',    health:m.healthStatus, note:m.mappingStatus },
              { label:'Persona Assigned',  health: (m.trailOsPersonaId ? 'healthy' : 'incomplete') as any, note: m.trailOsPersonaName || '—' },
              { label:'Penny Enablement',  health: (m.pennyEnabled ? 'healthy' : 'incomplete') as any, note: m.pennyEnabled ? 'Enabled' : 'Not enabled' },
              { label:'Program Coverage',  health: (m.relatedPrograms.length > 0 ? 'healthy' : 'needs-attention') as any, note: m.relatedPrograms.join(', ') || 'No programs assigned' },
            ].map(ind => (
              <div key={ind.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2.5">
                  <HealthDot health={ind.health} />
                  <span className="text-[12px] font-medium text-foreground">{ind.label}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{ind.note}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      );
    }},
  ], []);

  return <ObjectWorkspace icon={Users} items={items} tabs={tabs} emptyTitle="Select a user" emptyBody="Choose a user mapping to view their persona assignment, Penny enablement, and program connections." />;
}

// ── Tab 5: Penny Integration ──────────────────────────────────────────────────
function PennyIntegrationTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">All Penny AI capabilities configured for Slack delivery. Operational capabilities require a connected bot token.</p>
        {PENNY_SLACK_CAPABILITIES.map(cap => (
          <div key={cap.id} className="rounded-lg border border-border bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold text-foreground">{cap.capabilityName}</p>
                <p className="text-[11px] text-muted-foreground">{cap.triggerCondition}</p>
              </div>
              <ReadinessBadge status={cap.readiness} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
              <div>
                <p className="text-[9px] font-bold uppercase text-muted-foreground/60 mb-1">Enabled Channels</p>
                {cap.enabledChannels.length > 0 ? (
                  cap.enabledChannels.map(ch => <p key={ch} className="text-foreground font-mono">{ch}</p>)
                ) : (
                  <p className="text-muted-foreground">Not yet configured</p>
                )}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-muted-foreground/60 mb-1">Output Format</p>
                <p className="text-foreground">{cap.outputFormat}</p>
              </div>
              {cap.escalationChannel && (
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground/60 mb-1">Escalation</p>
                  <p className="text-foreground font-mono">{cap.escalationChannel}</p>
                </div>
              )}
              {cap.qualityScore !== undefined && (
                <div>
                  <p className="text-[9px] font-bold uppercase text-muted-foreground/60 mb-1">Quality Score</p>
                  <p className={`font-bold ${cap.qualityScore >= 85 ? 'text-emerald-600' : cap.qualityScore >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>{cap.qualityScore}%</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Tab 6: Templates ──────────────────────────────────────────────────────────
function TemplatesTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Message templates for Penny-generated and manual Slack communications. Penny-generated templates link to Prompt Studio.</p>
        {SLACK_TEMPLATES.map(tpl => (
          <div key={tpl.id} className="rounded-lg border border-border bg-white p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  {tpl.pennyGenerated && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-pink-50 text-pink-700 border-pink-200">Penny</span>}
                  <p className="text-[12px] font-bold text-foreground">{tpl.name}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">{tpl.audience} · Trigger: {tpl.trigger}</p>
              </div>
              <ReadinessBadge status={tpl.readiness} />
            </div>
            <p className="text-[11px] text-muted-foreground font-mono border-l-2 border-primary/20 pl-2 italic">{tpl.previewText}</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Channel: <code className="font-mono">{tpl.channel}</code></span>
              <span>Updated: {tpl.lastUpdated}</span>
              {tpl.promptTemplateId && <span className="text-primary font-medium">→ {tpl.promptTemplateId}</span>}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Tab 7: Activity Feed ──────────────────────────────────────────────────────
function ActivityFeedTab() {
  const typeColors: Record<string, string> = {
    penny:'bg-pink-400', communication:'bg-blue-400', governance:'bg-orange-400',
    channel:'bg-teal-400', user:'bg-violet-400', system:'bg-primary',
  };
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-2 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">{SLACK_ACTIVITY.length} recent events across Penny delivery, governance, channel activity, and system updates.</p>
        {SLACK_ACTIVITY.map(ev => (
          <div key={ev.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${ev.severity === 'warning' ? 'border-amber-200 bg-amber-50/30' : ev.severity === 'success' ? 'border-emerald-200 bg-emerald-50/20' : 'border-border bg-white'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${typeColors[ev.type] ?? 'bg-gray-300'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground">{ev.summary}</p>
              {ev.channel && <p className="text-[10px] font-mono text-muted-foreground">{ev.channel}</p>}
              {ev.detail && <p className="text-[10px] text-muted-foreground">{ev.detail}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ev.actor} · {ev.type}</p>
            </div>
            <span className="text-[9px] text-muted-foreground/50 shrink-0 whitespace-nowrap">{ev.timestamp}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Tab 8: Governance ─────────────────────────────────────────────────────────
function GovernanceTab() {
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3 max-w-3xl">
        <p className="text-[12px] text-muted-foreground">Governance records for all Slack objects — workspace, channels, user mappings, and templates.</p>
        {SLACK_GOVERNANCE.map((rec, i) => (
          <div key={i} className={`rounded-lg border p-4 space-y-2 ${rec.complianceStatus === 'compliant' ? 'border-emerald-200 bg-white' : rec.complianceStatus === 'partial' ? 'border-amber-200 bg-amber-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[9px] font-bold uppercase text-muted-foreground/60 mr-2">{rec.objectType}</span>
                <p className="text-[12px] font-bold text-foreground">{rec.name}</p>
              </div>
              <ReadinessBadge status={rec.complianceStatus === 'compliant' ? 'ready' : rec.complianceStatus === 'partial' ? 'partial' : 'not-ready'} />
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
              <span>Owner: <strong className="text-foreground">{rec.owner}</strong></span>
              <span>Cadence: {rec.reviewCadence}</span>
              {rec.lastReview && <span>Last: {rec.lastReview}</span>}
              {rec.nextReview && <span>Next: {rec.nextReview}</span>}
            </div>
            {rec.issues.length > 0 && (
              <ul className="space-y-0.5">
                {rec.issues.map((issue, j) => (
                  <li key={j} className="text-[11px] text-amber-700 flex items-start gap-1.5"><span className="mt-0.5 shrink-0">⚠</span>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ── Tab 9: Integration Health ─────────────────────────────────────────────────
function IntegrationHealthTab() {
  const [selected, setSelected] = useState<SlackHealthScore | null>(null);
  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SLACK_HEALTH_SCORES.map(s => (
            <button
              key={s.dimension}
              onClick={() => setSelected(selected?.dimension === s.dimension ? null : s)}
              className={`text-left rounded-lg border p-4 transition-all ${selected?.dimension === s.dimension ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-white hover:bg-muted/20'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-foreground">{s.label}</p>
                <ReadinessBadge status={s.status} />
              </div>
              <ScoreGauge score={s.score} max={s.maxScore} status={s.status} />
              <p className="text-[10px] text-muted-foreground mt-2">{s.note}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="text-[11px] font-bold text-foreground">{selected.label} — Detail</p>
            {selected.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-primary/10 last:border-0">
                <div className="flex items-center gap-2">
                  {item.status === 'pass' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : item.status === 'partial' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="text-[11px] font-medium text-foreground">{item.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground text-right max-w-xs">{item.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Tab 10: Testing Readiness ─────────────────────────────────────────────────
function TestingReadinessTab() {
  const [catFilter, setCatFilter] = useState('All');
  const categories  = ['All', ...getTestCategories()];
  const filtered    = catFilter === 'All' ? SLACK_TESTS : SLACK_TESTS.filter(t => t.category === catFilter);
  const overall     = getOverallTestCoverage();
  const passing     = SLACK_TESTS.filter(t => t.status === 'passing').length;
  const partial     = SLACK_TESTS.filter(t => t.status === 'partial').length;
  const pending     = SLACK_TESTS.filter(t => t.status === 'pending').length;
  const critical    = SLACK_TESTS.filter(t => t.priority === 'critical').length;
  const critPassing = SLACK_TESTS.filter(t => t.priority === 'critical' && t.status === 'passing').length;

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5 max-w-4xl">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:'Total Scenarios',   value:String(SLACK_TESTS.length),   cls:'border-primary/20 bg-primary/5' },
            { label:'Passing',           value:String(passing),               cls:'border-emerald-200 bg-emerald-50' },
            { label:'Partial / Pending', value:`${partial}/${pending}`,       cls:'border-amber-200 bg-amber-50' },
            { label:'Avg Coverage',      value:`${overall}%`,                 cls:'border-border bg-muted/30' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 ${s.cls}`}>
              <p className="text-xl font-bold font-serif text-foreground">{s.value}</p>
              <p className="text-[10px] font-semibold text-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-lg border px-4 py-3 ${critPassing === critical ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className={`text-[11px] font-bold uppercase mb-1 ${critPassing === critical ? 'text-emerald-700' : 'text-rose-700'}`}>
            Critical Tests: {critPassing}/{critical} Passing
          </p>
          <p className={`text-[12px] leading-relaxed ${critPassing === critical ? 'text-emerald-800' : 'text-rose-800'}`}>
            {critPassing < critical
              ? `${critical - critPassing} critical test scenarios are not yet passing. OAuth connectivity and Penny delivery tests are the primary blockers.`
              : 'All critical test scenarios are passing.'}
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${catFilter === c ? 'bg-foreground text-background border-foreground' : 'bg-white border-border text-muted-foreground hover:border-foreground/30'}`}
            >{c}</button>
          ))}
        </div>

        {/* Test scenarios */}
        <div className="space-y-2">
          {filtered.map(test => (
            <div key={test.id} className={`rounded-lg border p-3 space-y-1 ${test.status === 'passing' ? 'border-emerald-200 bg-emerald-50/30' : test.status === 'partial' ? 'border-amber-200 bg-amber-50/30' : 'border-border bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {test.status === 'passing' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  ) : test.status === 'partial' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-[11px] font-bold text-foreground">{test.name}</p>
                    <p className="text-[10px] text-muted-foreground">{test.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {test.priority === 'critical' && (
                    <span className="text-[8px] font-bold bg-rose-100 text-rose-700 border border-rose-200 rounded px-1">CRITICAL</span>
                  )}
                  <ReadinessBadge status={test.status} />
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-5.5">
                <span>{test.type}</span>
                <span>{test.coverage}% coverage</span>
                {test.mockable && <span className="text-sky-600">Mockable</span>}
                {test.automatable && <span className="text-violet-600">Auto</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// ── SlackIntegrationCenter ────────────────────────────────────────────────────
export default function SlackIntegrationCenter() {
  return (
    <HubShell
      title="Slack Integration Center"
      icon={Hash}
      description="Production-focused Slack integration for Trail OS. Connects Slack workspace, channels, and users to Penny AI delivery, the Unified Object Model, Context Engine, and Operational Intelligence."
      badge="Phase 1 — OAuth Pending"
      tabs={[
        { id:'overview',   label:'Overview',          path:'/collaboration/slack',             icon:Hash,          content:<OverviewTab /> },
        { id:'workspace',  label:'Workspace Config',  path:'/collaboration/slack/workspace',   icon:Settings,      content:<WorkspaceConfigTab /> },
        { id:'channels',   label:'Channel Registry',  path:'/collaboration/slack/channels',    icon:Hash,          content:<ChannelRegistry /> },
        { id:'users',      label:'User & Role Map',   path:'/collaboration/slack/users',       icon:Users,         content:<UserRoleMapping /> },
        { id:'penny',      label:'Penny Integration', path:'/collaboration/slack/penny',       icon:Brain,         content:<PennyIntegrationTab /> },
        { id:'templates',  label:'Templates',         path:'/collaboration/slack/templates',   icon:FileText,      content:<TemplatesTab /> },
        { id:'activity',   label:'Activity Feed',     path:'/collaboration/slack/activity',    icon:Activity,      content:<ActivityFeedTab /> },
        { id:'governance', label:'Governance',        path:'/collaboration/slack/governance',  icon:Shield,        content:<GovernanceTab /> },
        { id:'health',     label:'Integration Health',path:'/collaboration/slack/health',      icon:BarChart2,     content:<IntegrationHealthTab /> },
        { id:'testing',    label:'Testing Readiness', path:'/collaboration/slack/testing',     icon:FlaskConical,  content:<TestingReadinessTab /> },
      ]}
    />
  );
}
