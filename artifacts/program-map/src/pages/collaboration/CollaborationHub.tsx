import { MessageSquare, Hash, FileText, BookOpen, Bell, Zap, Mail, Activity } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { useTierFlags } from '@/hooks/useTierFlags';
import CollaborationWorkspace from '@/pages/collaboration/CollaborationWorkspace';
import MyTrailSignals         from '@/pages/collaboration/MyTrailSignals';
import CommChannels           from '@/pages/communications/CommChannels';
import CommMessageTemplates   from '@/pages/communications/MessageTemplates';
import WeeklyBriefs           from '@/pages/communications/WeeklyBriefs';
import CommNotifications      from '@/pages/communications/CommNotifications';
import SlackIntegrationCenter from '@/pages/collaboration/SlackIntegrationCenter';
import CalendarPanel          from '@/pages/collaboration/CalendarPanel';
import GmailCenter            from '@/pages/collaboration/GmailCenter';

// UI audit rule: Everyday User pages must not have multiple nav/action rows
// above content. Keep ≤ 1 tab row, no ActionBar, and plain-language labels.
// Integration config (Drive, Calendar setup) moved to Administration → Integrations.

export default function CollaborationHub() {
  const { isEveryday, isPowerOrAbove, isAdminOrAbove } = useTierFlags();

  const TABS = [
    {
      id: 'overview',
      label: isEveryday ? 'Overview' : 'Systems Overview',
      path: '/collaboration',
      icon: MessageSquare,
      content: <CollaborationWorkspace />,
    },
    ...(isPowerOrAbove ? [
      { id: 'my-signals',    label: 'My Trail Signals', path: '/collaboration/my-signals', icon: Activity,  content: <MyTrailSignals /> },
    ] : []),
    ...(isPowerOrAbove ? [
      { id: 'channels',      label: 'Channels',      path: '/collaboration/channels',      icon: Hash,      content: <CommChannels /> },
      { id: 'templates',     label: 'Templates',     path: '/collaboration/templates',     icon: FileText,  content: <CommMessageTemplates /> },
      { id: 'briefs',        label: 'Weekly Briefs', path: '/collaboration/briefs',        icon: BookOpen,  content: <WeeklyBriefs /> },
      { id: 'notifications', label: 'Notifications', path: '/collaboration/notifications', icon: Bell,      content: <CommNotifications /> },
    ] : []),
    ...(isPowerOrAbove ? [
      { id: 'calendar-live', label: 'Calendar', path: '/collaboration/calendar-live', icon: Zap, content: <CalendarPanel /> },
    ] : []),
    ...(isPowerOrAbove ? [
      { id: 'gmail', label: 'Gmail', path: '/collaboration/gmail', icon: Mail, content: <GmailCenter /> },
    ] : []),
    ...(isAdminOrAbove ? [
      { id: 'slack', label: 'Slack Integration', path: '/collaboration/slack', icon: Hash, content: <SlackIntegrationCenter /> },
    ] : []),
  ];

  return (
    <HubShell
      title="Collaboration"
      icon={MessageSquare}
      description={
        isEveryday
          ? 'Your upcoming sessions, events, and team communication channels.'
          : 'Manage communication channels, review Slack and Drive integrations, access templates, and configure notification workflows.'
      }
      tabs={TABS}
    />
  );
}
