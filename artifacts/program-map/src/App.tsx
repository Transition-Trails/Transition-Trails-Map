import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";

import Home          from "@/pages/Home";
import ProgramMap    from "@/pages/ProgramMap";
import ResolveDemand from "@/pages/ResolveDemand";
import TrailOSPenny  from "@/pages/TrailOSPenny";
import Admin         from "@/pages/Admin";
import NotFound      from "@/pages/not-found";

import Roles                   from "@/pages/navigator/Roles";
import KnowledgeRelationships  from "@/pages/navigator/KnowledgeRelationships";

import ProgramHealth    from "@/pages/operations/ProgramHealth";
import SalesforceHealth from "@/pages/operations/SalesforceHealth";
import AutomationHealth from "@/pages/operations/AutomationHealth";
import WebsiteMarketing from "@/pages/operations/WebsiteMarketing";
import PennyHealth      from "@/pages/operations/PennyHealth";
import TrailOsHealth    from "@/pages/operations/TrailOsHealth";

import Intake         from "@/pages/demand/Intake";
import DemandCases    from "@/pages/demand/Cases";
import Epics          from "@/pages/demand/Epics";
import Features       from "@/pages/demand/Features";
import Stories        from "@/pages/demand/Stories";
import Roadmap        from "@/pages/demand/Roadmap";
import ChangeRequest  from "@/pages/demand/ChangeRequest";

import Learners        from "@/pages/penny/Learners";
import PennyLogs       from "@/pages/penny/PennyLogs";
import TrailQuests     from "@/pages/penny/TrailQuests";
import Assessments     from "@/pages/penny/Assessments";
import Intelligence    from "@/pages/penny/Intelligence";
import TestPenny       from "@/pages/penny/TestPenny";
import ResponseQuality from "@/pages/penny/ResponseQuality";
import PromptLibrary   from "@/pages/penny/PromptLibrary";
import PennyIntegrations from "@/pages/penny/PennyIntegrations";

import CommOverview        from "@/pages/communications/CommOverview";
import CommProviders       from "@/pages/communications/CommProviders";
import CommChannels        from "@/pages/communications/CommChannels";
import PennyBroadcasts     from "@/pages/communications/PennyBroadcasts";
import WeeklyBriefs        from "@/pages/communications/WeeklyBriefs";
import CommCalendar         from "@/pages/communications/CommCalendar";
import CommNotifications   from "@/pages/communications/CommNotifications";
import CommMessageTemplates from "@/pages/communications/MessageTemplates";

import LibraryDocuments from "@/pages/library/LibraryDocuments";
import Templates        from "@/pages/library/Templates";

import CommunicationChannels     from "@/pages/admin/CommunicationChannels";
import CommunicationRouting      from "@/pages/admin/CommunicationRouting";
import AdminMessageTemplates     from "@/pages/admin/MessageTemplates";
import OperationsCommunications from "@/pages/operations/Communications";
import SalesforceKB     from "@/pages/library/SalesforceKB";
import SourceMapping    from "@/pages/library/SourceMapping";
import LibrarySearch    from "@/pages/library/LibrarySearch";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, []);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/trail-os-penny"><Redirect to="/navigator/trail-os-map" /></Route>
      <Route path="/resolve-demand"><Redirect to="/navigator/resolve" /></Route>
      <Route path="/source-docs"><Redirect to="/library/documents" /></Route>

      <Route path="/navigator/program-map"            component={ProgramMap} />
      <Route path="/navigator/resolve"                component={ResolveDemand} />
      <Route path="/navigator/roles"                  component={Roles} />
      <Route path="/navigator/trail-os-map"           component={TrailOSPenny} />
      <Route path="/navigator/knowledge-relationships" component={KnowledgeRelationships} />

      <Route path="/operations/program-health"    component={ProgramHealth} />
      <Route path="/operations/salesforce-health" component={SalesforceHealth} />
      <Route path="/operations/automation-health" component={AutomationHealth} />
      <Route path="/operations/website-marketing" component={WebsiteMarketing} />
      <Route path="/operations/penny-health"      component={PennyHealth} />
      <Route path="/operations/trail-os-health"   component={TrailOsHealth} />
      <Route path="/operations/communications"    component={OperationsCommunications} />

      <Route path="/demand/intake"         component={Intake} />
      <Route path="/demand/cases"          component={DemandCases} />
      <Route path="/demand/epics"          component={Epics} />
      <Route path="/demand/features"       component={Features} />
      <Route path="/demand/stories"        component={Stories} />
      <Route path="/demand/roadmap"        component={Roadmap} />
      <Route path="/demand/change-request" component={ChangeRequest} />

      <Route path="/penny/learners"         component={Learners} />
      <Route path="/penny/logs"             component={PennyLogs} />
      <Route path="/penny/trail-quests"     component={TrailQuests} />
      <Route path="/penny/assessments"      component={Assessments} />
      <Route path="/penny/intelligence"     component={Intelligence} />
      <Route path="/penny/test-penny"       component={TestPenny} />
      <Route path="/penny/response-quality" component={ResponseQuality} />
      <Route path="/penny/prompt-library"   component={PromptLibrary} />
      <Route path="/penny/integrations"     component={PennyIntegrations} />

      <Route path="/communications/overview"          component={CommOverview} />
      <Route path="/communications/providers"         component={CommProviders} />
      <Route path="/communications/channels"          component={CommChannels} />
      <Route path="/communications/calendar"          component={CommCalendar} />
      <Route path="/communications/penny-broadcasts"  component={PennyBroadcasts} />
      <Route path="/communications/weekly-briefs"     component={WeeklyBriefs} />
      <Route path="/communications/notifications"     component={CommNotifications} />
      <Route path="/communications/message-templates" component={CommMessageTemplates} />

      <Route path="/library/documents"     component={LibraryDocuments} />
      <Route path="/library/templates"     component={Templates} />
      <Route path="/library/salesforce-kb" component={SalesforceKB} />
      <Route path="/library/source-mapping" component={SourceMapping} />
      <Route path="/library/search"        component={LibrarySearch} />

      <Route path="/admin/comm-channels"  component={CommunicationChannels} />
      <Route path="/admin/comm-routing"   component={CommunicationRouting} />
      <Route path="/admin/comm-templates" component={AdminMessageTemplates} />
      <Route path="/admin/:section" component={Admin} />
      <Route path="/admin"          component={Admin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell>
              <Router />
            </AppShell>
          </WouterRouter>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
