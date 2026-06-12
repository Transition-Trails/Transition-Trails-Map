export interface ActionField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
  rows?: number;
}

export interface ActionPanelConfig {
  title: string;
  objectType: string;
  subtitle?: string;
  fields: ActionField[];
  ownerLabel?: string;
  ownerHint?: string;
  showOwner?: boolean;
  slackContext?: string;
  onSaveDraft?: (data: Record<string, string>) => void;
  onSaveAndView?: (data: Record<string, string>) => void;
  onClose?: () => void;
}

export type SlackPanelContext =
  | 'penny'
  | 'program'
  | 'cohort'
  | 'slack'
  | 'governance'
  | 'calendar'
  | 'collaboration'
  | 'people'
  | 'digital-twin'
  | 'home'
  | 'operations'
  | 'demand'
  | 'knowledge'
  | 'admin'
  | 'navigator';

export interface SlackPanelConfig {
  context: SlackPanelContext;
  title: string;
  subtitle?: string;
  objectName?: string;
  channelIds?: string[];
}
