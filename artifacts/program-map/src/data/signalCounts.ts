import type { SlackPanelContext, SlackPanelConfig } from '@/types/actionPanel';
import { TERMS } from '@/config/terminology';

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
  home:            { title: TERMS.missionControl,  subtitle: TERMS.signalSubtitle(TERMS.missionControl) },
  operations:      { title: 'Operations',          subtitle: TERMS.signalSubtitle('Operations') },
  program:         { title: 'Programs',            subtitle: TERMS.signalSubtitle('Programs') },
  governance:      { title: 'Governance',          subtitle: TERMS.signalSubtitle('Governance') },
  'digital-twin':  { title: TERMS.digitalTwin,     subtitle: TERMS.signalSubtitle(TERMS.digitalTwin) },
  penny:           { title: TERMS.aiAssistant,     subtitle: TERMS.signalSubtitle(TERMS.aiAssistant) },
  knowledge:       { title: 'Knowledge Library',   subtitle: TERMS.signalSubtitle('Knowledge Library') },
  admin:           { title: 'Administration',      subtitle: TERMS.signalSubtitle('Administration') },
  navigator:       { title: 'Navigator',           subtitle: TERMS.signalSubtitle('Navigator') },
  slack:           { title: 'Collaboration',       subtitle: TERMS.signalSubtitle('Collaboration') },
  cohort:          { title: 'Cohort',              subtitle: TERMS.signalSubtitle('Cohort') },
  collaboration:   { title: 'Collaboration',       subtitle: TERMS.signalSubtitle('Collaboration') },
  calendar:        { title: 'Calendar',            subtitle: TERMS.signalSubtitle('Calendar') },
  people:          { title: 'People',              subtitle: TERMS.signalSubtitle('People') },
};

export function locationToContext(location: string): SlackPanelContext {
  if (location === '/' || location === '') return 'home';
  if (location.startsWith('/trail-os-overview')) return 'home';
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
