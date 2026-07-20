// ── useHealthScores ──────────────────────────────────────────────────────────
// Returns a computed version of domainHealthData where scores and indicator
// statuses are derived from live data sources (AppContext programs/roles,
// readinessState integration health) rather than hardcoded numbers.
//
// Domains wired to live data:
//   dh-programs      — pennyActive count from AppContext programs
//   dh-people        — unowned role count from AppContext platformRoles
//   dh-penny         — penny-admin owner + agentforce live status
//   dh-integration   — INTEGRATION_STATUS health flags
//   dh-communications— Slack adapter live status
//
// Domains still static (no live source in Phase 1):
//   dh-curriculum    — Standards Studio has no live data feed
//   dh-knowledge     — Knowledge source registry is prototype-only
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  domainHealthData as STATIC_DATA,
  type DomainHealth,
  type HealthIndicator,
  type HealthLevel,
} from '@/data/operationalIntelligenceData';
import { INTEGRATION_STATUS } from '@/data/readinessState';

const INDICATOR_PTS: Record<HealthLevel, number> = {
  strong:       100,
  good:          80,
  'needs-work':  50,
  'at-risk':     20,
};

function scoreAndLevel(indicators: HealthIndicator[]): { score: number; level: HealthLevel } {
  const avg = Math.round(
    indicators.reduce((sum, i) => sum + INDICATOR_PTS[i.status], 0) / indicators.length,
  );
  const level: HealthLevel =
    avg >= 80 ? 'strong' : avg >= 65 ? 'good' : avg >= 45 ? 'needs-work' : 'at-risk';
  return { score: avg, level };
}

function patch(
  indicators: HealthIndicator[],
  patches: Record<string, Partial<HealthIndicator>>,
): HealthIndicator[] {
  return indicators.map(i => (patches[i.id] ? { ...i, ...patches[i.id] } : i));
}

function intHealth(key: string): HealthLevel {
  return INTEGRATION_STATUS[key]?.health === 'live' ? 'good' : 'needs-work';
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ComputedHealth {
  domainHealthData: DomainHealth[];
  overallHealthScore: number;
  overallHealthLevel: HealthLevel;
}

export function useHealthScores(): ComputedHealth {
  const { programs, platformRoles } = useAppContext();

  return useMemo(() => {
    const computed = STATIC_DATA.map((domain): DomainHealth => {
      switch (domain.id) {

        // ── Programs: Penny coverage driven by program.pennyActive flags ──────
        case 'dh-programs': {
          const total          = programs.length || 5;
          const pennyActive    = programs.filter(p => p.pennyActive).length;
          const pct            = pennyActive / total;
          const prog4Status: HealthLevel =
            pct >= 1 ? 'strong' : pct >= 0.5 ? 'needs-work' : 'at-risk';
          const indicators = patch(domain.indicators, {
            'prog-4': {
              status: prog4Status,
              detail: `${pennyActive} of ${total} programs have active Penny coverage.`,
            },
          });
          return { ...domain, ...scoreAndLevel(indicators), indicators };
        }

        // ── People & Roles: unowned count from AppContext platformRoles ────────
        case 'dh-people': {
          const total   = platformRoles.length;
          const unowned = platformRoles.filter(r => !r.owner.trim()).length;
          const owned   = total - unowned;
          const people1Status: HealthLevel =
            unowned === 0 ? 'strong'
            : unowned <= 2 ? 'good'
            : unowned <= 5 ? 'needs-work'
            : 'at-risk';
          const indicators = patch(domain.indicators, {
            'people-1': {
              status: people1Status,
              detail: `${owned} of ${total} roles have assigned owners. ${unowned} unassigned.`,
            },
          });
          return { ...domain, ...scoreAndLevel(indicators), indicators };
        }

        // ── Penny AI: governance from role ownership; integration from readinessState
        case 'dh-penny': {
          const pennyAdminOwner = platformRoles
            .find(r => r.id === 'penny-admin')
            ?.owner.trim();
          const agentLive = INTEGRATION_STATUS.agentforce?.health === 'live';
          const indicators = patch(domain.indicators, {
            'penny-3': {
              status: pennyAdminOwner ? 'needs-work' : 'at-risk',
              detail: pennyAdminOwner
                ? `Penny Admin assigned to ${pennyAdminOwner}. Prompt governance SLA still undefined.`
                : 'No formal Penny Admin assigned. Prompt governance SLA not defined.',
            },
            'penny-6': {
              status: agentLive ? 'good' : 'needs-work',
              detail: agentLive
                ? 'Agentforce live — dual-AI coaching wired on Assessment page via Sessions API.'
                : 'Agentforce integration is planned; current Penny is standalone.',
            },
          });
          return { ...domain, ...scoreAndLevel(indicators), indicators };
        }

        // ── Integrations: each indicator status derived from readinessState ───
        case 'dh-integration': {
          const driveStatus    = intHealth('googleDrive');
          const agentStatus    = intHealth('agentforce');
          const indicators = patch(domain.indicators, {
            'int-1': { status: intHealth('salesforce') },
            'int-2': {
              status: driveStatus,
              detail: driveStatus === 'good'
                ? 'Google Drive live — Penny Asset Library reads files from TT Content Shared Drive.'
                : 'Drive as content repository defined in prototype. Live sync not configured.',
            },
            'int-4': { status: intHealth('slack') },
            'int-6': {
              status: agentStatus,
              detail: agentStatus === 'good'
                ? 'Agentforce live — Sessions API wired; dual-AI coaching active on Assessment page.'
                : 'No auth or readiness work started. Agentforce context handoff is a future milestone.',
            },
          });
          return { ...domain, ...scoreAndLevel(indicators), indicators };
        }

        // ── Communications: Slack adapter status from readinessState ──────────
        case 'dh-communications': {
          const slackStatus = intHealth('slack');
          const indicators = patch(domain.indicators, {
            'comm-4': {
              status: slackStatus,
              detail: slackStatus === 'good'
                ? 'Penny Slack Adapter MVP live — @penny responds to mentions in-thread via Gemini 2.5 Flash.'
                : 'Penny-to-Slack adapter not yet built. Message routing and API auth pending.',
            },
          });
          return { ...domain, ...scoreAndLevel(indicators), indicators };
        }

        default:
          return domain;
      }
    });

    const overallHealthScore = Math.round(
      computed.reduce((sum, d) => sum + d.score, 0) / computed.length,
    );
    const overallHealthLevel: HealthLevel =
      overallHealthScore >= 80 ? 'strong'
      : overallHealthScore >= 65 ? 'good'
      : overallHealthScore >= 50 ? 'needs-work'
      : 'at-risk';

    return { domainHealthData: computed, overallHealthScore, overallHealthLevel };
  }, [programs, platformRoles]);
}
