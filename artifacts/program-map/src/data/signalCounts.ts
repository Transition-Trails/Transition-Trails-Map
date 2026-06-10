import type { SlackPanelContext, SlackPanelConfig } from '@/types/actionPanel';

export interface SignalCounts {
  total: number;
  urgent: number;
  sources: {
    slack: number;
    drive: number;
    email: number;
    calendar: number;
    salesforce: number;
  };
}

export const SIGNAL_COUNTS: Record<SlackPanelContext, SignalCounts> = {
  home: {
    total: 7, urgent: 2,
    sources: { slack: 3, drive: 1, email: 1, calendar: 1, salesforce: 1 },
  },
  operations: {
    total: 5, urgent: 1,
    sources: { slack: 2, drive: 1, email: 0, calendar: 1, salesforce: 1 },
  },
  program: {
    total: 4, urgent: 1,
    sources: { slack: 2, drive: 1, email: 0, calendar: 1, salesforce: 0 },
  },
  governance: {
    total: 3, urgent: 0,
    sources: { slack: 1, drive: 1, email: 0, calendar: 1, salesforce: 0 },
  },
  'digital-twin': {
    total: 3, urgent: 0,
    sources: { slack: 1, drive: 1, email: 0, calendar: 0, salesforce: 1 },
  },
  penny: {
    total: 5, urgent: 1,
    sources: { slack: 2, drive: 1, email: 0, calendar: 0, salesforce: 2 },
  },
  knowledge: {
    total: 4, urgent: 0,
    sources: { slack: 1, drive: 2, email: 0, calendar: 0, salesforce: 1 },
  },
  admin: {
    total: 3, urgent: 0,
    sources: { slack: 1, drive: 1, email: 0, calendar: 1, salesforce: 0 },
  },
  navigator: {
    total: 2, urgent: 0,
    sources: { slack: 1, drive: 1, email: 0, calendar: 0, salesforce: 0 },
  },
  slack: {
    total: 6, urgent: 1,
    sources: { slack: 5, drive: 1, email: 0, calendar: 0, salesforce: 0 },
  },
  cohort: {
    total: 3, urgent: 0,
    sources: { slack: 2, drive: 1, email: 0, calendar: 0, salesforce: 0 },
  },
  collaboration: {
    total: 4, urgent: 0,
    sources: { slack: 2, drive: 1, email: 1, calendar: 0, salesforce: 0 },
  },
  calendar: {
    total: 2, urgent: 0,
    sources: { slack: 0, drive: 0, email: 0, calendar: 2, salesforce: 0 },
  },
  people: {
    total: 2, urgent: 0,
    sources: { slack: 1, drive: 1, email: 0, calendar: 0, salesforce: 0 },
  },
};

const CONTEXT_PANEL_META: Record<SlackPanelContext, { title: string; subtitle: string }> = {
  home: {
    title: 'Mission Control',
    subtitle: 'Workspace signals across all active areas — flags, Drive updates, and Slack activity.',
  },
  operations: {
    title: 'Operations',
    subtitle: 'Operations signals — integration status, health flags, and demand pipeline activity.',
  },
  program: {
    title: 'Programs',
    subtitle: 'Program channels, cohort threads, and program workspace activity.',
  },
  governance: {
    title: 'Governance',
    subtitle: 'Governance signals — review cycles, doc updates, and approval threads.',
  },
  'digital-twin': {
    title: 'Digital Twin',
    subtitle: 'Workspace signals for the Digital Twin — object model and relationship updates.',
  },
  penny: {
    title: 'Penny Command',
    subtitle: 'Penny AI signals — capability flags, prompt reviews, and learner activity.',
  },
  knowledge: {
    title: 'Knowledge Library',
    subtitle: 'Workspace signals for the Knowledge Library — source doc updates and Drive activity.',
  },
  admin: {
    title: 'Administration',
    subtitle: 'Workspace signals for Knowledge Management — setup tasks and configuration updates.',
  },
  navigator: {
    title: 'Navigator',
    subtitle: 'Workspace signals for the Navigator — map updates and capability changes.',
  },
  slack: {
    title: 'Collaboration',
    subtitle: 'Workspace signals — channel activity, routing updates, and communication signals.',
  },
  cohort: {
    title: 'Cohort',
    subtitle: 'Cohort workspace signals — learner activity and program progress.',
  },
  collaboration: {
    title: 'Collaboration',
    subtitle: 'Workspace signals for Collaboration — comm routing and channel activity.',
  },
  calendar: {
    title: 'Calendar',
    subtitle: 'Calendar and scheduling workspace signals.',
  },
  people: {
    title: 'People',
    subtitle: 'People and roles workspace signals.',
  },
};

export function locationToContext(location: string): SlackPanelContext {
  if (location === '/' || location === '') return 'home';
  if (location.startsWith('/operations') || location.startsWith('/demand')) return 'operations';
  if (location.startsWith('/governance')) return 'governance';
  if (location.startsWith('/digital-twin') || location.startsWith('/uom')) return 'digital-twin';
  if (location.startsWith('/penny')) return 'penny';
  if (location.startsWith('/library') || location.startsWith('/knowledge')) return 'knowledge';
  if (location.startsWith('/admin')) return 'admin';
  if (location.startsWith('/navigator')) return 'navigator';
  if (location.startsWith('/collaboration') || location.startsWith('/slack')) return 'slack';
  if (location.startsWith('/program')) return 'program';
  return 'home';
}

export function getSignalPanelConfig(context: SlackPanelContext): SlackPanelConfig {
  const { title, subtitle } = CONTEXT_PANEL_META[context];
  return { context, title, subtitle };
}
