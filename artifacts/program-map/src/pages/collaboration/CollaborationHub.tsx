import { MessageSquare, Hash, Calendar, FileText, BookOpen, Bell } from 'lucide-react';
import { HubShell } from '@/components/layout/HubShell';
import CollaborationWorkspace  from '@/pages/collaboration/CollaborationWorkspace';
import CommChannels             from '@/pages/communications/CommChannels';
import CommCalendar             from '@/pages/communications/CommCalendar';
import CommMessageTemplates     from '@/pages/communications/MessageTemplates';
import WeeklyBriefs             from '@/pages/communications/WeeklyBriefs';
import CommNotifications        from '@/pages/communications/CommNotifications';
import SlackIntegrationCenter   from '@/pages/collaboration/SlackIntegrationCenter';

export default function CollaborationHub() {
  return (
    <HubShell
      title="Collaboration"
      icon={MessageSquare}
      description="Communication systems, Slack integration, channels, templates, and notification management. Select a system from the Overview workspace to explore its readiness and configuration."
      tabs={[
        { id:'overview',       label:'Systems Overview',  path:'/collaboration',               icon:MessageSquare, content:<CollaborationWorkspace /> },
        { id:'slack',          label:'Slack Integration', path:'/collaboration/slack',         icon:Hash,          content:<SlackIntegrationCenter /> },
        { id:'channels',       label:'Channels',          path:'/collaboration/channels',      icon:Hash,          content:<CommChannels /> },
        { id:'calendar',       label:'Calendar',          path:'/collaboration/calendar',      icon:Calendar,      content:<CommCalendar /> },
        { id:'templates',      label:'Templates',         path:'/collaboration/templates',     icon:FileText,      content:<CommMessageTemplates /> },
        { id:'briefs',         label:'Weekly Briefs',     path:'/collaboration/briefs',        icon:BookOpen,      content:<WeeklyBriefs /> },
        { id:'notifications',  label:'Notifications',     path:'/collaboration/notifications', icon:Bell,          content:<CommNotifications /> },
      ]}
    />
  );
}
