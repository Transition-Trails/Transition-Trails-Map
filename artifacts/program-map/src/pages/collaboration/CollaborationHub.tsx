import { MessageSquare, Hash, CalendarDays, HardDrive, FileText, BookOpen, Bell } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import { useTierFlags } from '@/hooks/useTierFlags';
import CollaborationWorkspace          from '@/pages/collaboration/CollaborationWorkspace';
import CommChannels                    from '@/pages/communications/CommChannels';
import CommMessageTemplates            from '@/pages/communications/MessageTemplates';
import WeeklyBriefs                    from '@/pages/communications/WeeklyBriefs';
import CommNotifications               from '@/pages/communications/CommNotifications';
import SlackIntegrationCenter          from '@/pages/collaboration/SlackIntegrationCenter';
import GoogleDriveIntegrationCenter    from '@/pages/collaboration/GoogleDriveIntegrationCenter';
import GoogleCalendarIntegrationCenter from '@/pages/collaboration/GoogleCalendarIntegrationCenter';

// UI audit rule: Everyday User pages must not have multiple nav/action rows
// above content. Keep ≤ 1 tab row, no ActionBar, and plain-language labels.

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
      { id: 'channels',      label: 'Channels',      path: '/collaboration/channels',      icon: Hash,      content: <CommChannels /> },
      { id: 'templates',     label: 'Templates',     path: '/collaboration/templates',     icon: FileText,  content: <CommMessageTemplates /> },
      { id: 'briefs',        label: 'Weekly Briefs', path: '/collaboration/briefs',        icon: BookOpen,  content: <WeeklyBriefs /> },
      { id: 'notifications', label: 'Notifications', path: '/collaboration/notifications', icon: Bell,      content: <CommNotifications /> },
    ] : []),
    ...(isAdminOrAbove ? [
      { id: 'slack',    label: 'Slack Integration', path: '/collaboration/slack',    icon: Hash,         content: <SlackIntegrationCenter /> },
      { id: 'drive',    label: 'Google Drive',      path: '/collaboration/drive',    icon: HardDrive,    content: <GoogleDriveIntegrationCenter /> },
      { id: 'calendar', label: 'Google Calendar',   path: '/collaboration/calendar', icon: CalendarDays, content: <GoogleCalendarIntegrationCenter /> },
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
