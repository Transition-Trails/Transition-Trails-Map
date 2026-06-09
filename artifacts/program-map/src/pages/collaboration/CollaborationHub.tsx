import { MessageSquare, Hash, Calendar, FileText, BookOpen, Bell } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import CommChannels        from '@/pages/communications/CommChannels';
import CommCalendar        from '@/pages/communications/CommCalendar';
import CommMessageTemplates from '@/pages/communications/MessageTemplates';
import WeeklyBriefs        from '@/pages/communications/WeeklyBriefs';
import CommNotifications   from '@/pages/communications/CommNotifications';
import CommOverview        from '@/pages/communications/CommOverview';

export default function CollaborationHub() {
  return (
    <HubShell
      title="Collaboration"
      icon={MessageSquare}
      description="Communication channels, calendar readiness, message templates, weekly briefs, and notification management for Slack, Google Chat, and Calendar."
      tabs={[
        { id: 'overview',      label: 'Overview',         path: '/collaboration',               icon: MessageSquare,content: <CommOverview /> },
        { id: 'channels',      label: 'Channels',         path: '/collaboration/channels',      icon: Hash,         content: <CommChannels /> },
        { id: 'calendar',      label: 'Calendar',         path: '/collaboration/calendar',      icon: Calendar,     content: <CommCalendar /> },
        { id: 'templates',     label: 'Templates',        path: '/collaboration/templates',     icon: FileText,     content: <CommMessageTemplates /> },
        { id: 'briefs',        label: 'Weekly Briefs',    path: '/collaboration/briefs',        icon: BookOpen,     content: <WeeklyBriefs /> },
        { id: 'notifications', label: 'Notifications',    path: '/collaboration/notifications', icon: Bell,         content: <CommNotifications /> },
      ]}
    />
  );
}
