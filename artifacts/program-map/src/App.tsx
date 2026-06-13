import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";

import Home                from "@/pages/Home";
import TrailOSOverview     from "@/pages/TrailOSOverview";
import SalesforceMapping            from "@/pages/curriculum/SalesforceMapping";
import SalesforceValidationCenter  from "@/pages/curriculum/SalesforceValidationCenter";
import ProgramResources             from "@/pages/admin/ProgramResources";
import IntegrationReadinessCenter   from "@/pages/admin/IntegrationReadinessCenter";
import AdminSetup                 from "@/pages/admin/AdminSetup";
import PeopleAccess               from "@/pages/admin/PeopleAccess";
import Admin   from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import Phase1ReadinessDashboard from "@/pages/admin/Phase1ReadinessDashboard";
import Phase1UXStandards        from "@/pages/admin/Phase1UXStandards";
import IntegrationSecretsAudit  from "@/pages/admin/IntegrationSecretsAudit";
import GoogleOAuthFlow           from "@/pages/admin/GoogleOAuthFlow";
import CreateAudit               from "@/pages/admin/CreateAudit";
import Phase2Backlog             from "@/pages/admin/Phase2Backlog";
import Phase1CompletionAudit    from "@/pages/admin/Phase1CompletionAudit";

import DigitalTwin      from "@/pages/twin/DigitalTwin";
import OperationsHub    from "@/pages/ops/OperationsHub";
import ProgramHub       from "@/pages/program/ProgramHub";
import PennyHub         from "@/pages/penny/PennyHub";
import KnowledgeHub     from "@/pages/knowledge/KnowledgeHub";
import CollaborationHub from "@/pages/collaboration/CollaborationHub";
import PeopleRolesStudio  from "@/pages/people/PeopleRolesStudio";
import PeopleWorkspace    from "@/pages/people/PeopleWorkspace";
import UnifiedObjectModel from "@/pages/uom/UnifiedObjectModel";
import GovernanceHub      from "@/pages/governance/GovernanceHub";
import GlobalSearch       from "@/pages/search/GlobalSearch";
import ContextHub         from "@/pages/context/ContextHub";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* ── Redirects (must precede hub wildcard routes) ── */}

      {/* Navigator → workspaces */}
      <Route path="/navigator/program-map">              <Redirect to="/program" /></Route>
      <Route path="/navigator/resolve">                  <Redirect to="/operations/demand" /></Route>
      <Route path="/navigator/roles">                    <Redirect to="/digital-twin" /></Route>
      <Route path="/navigator/trail-os-map">             <Redirect to="/trail-os-overview" /></Route>
      <Route path="/navigator/knowledge-relationships">  <Redirect to="/digital-twin" /></Route>

      {/* Old Digital Twin sub-routes → Explore */}
      <Route path="/digital-twin/org-graph">     <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/programs">      <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/knowledge">     <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/penny-network"> <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/people">        <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/relationships"> <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/map">           <Redirect to="/digital-twin" /></Route>
      <Route path="/digital-twin/impact">        <Redirect to="/digital-twin" /></Route>

      {/* Old operations sub-pages */}
      <Route path="/operations/program-health">    <Redirect to="/operations/health" /></Route>
      <Route path="/operations/salesforce-health"> <Redirect to="/operations/health" /></Route>
      <Route path="/operations/automation-health"> <Redirect to="/operations/health" /></Route>
      <Route path="/operations/website-marketing"> <Redirect to="/operations/health" /></Route>
      <Route path="/operations/penny-health">      <Redirect to="/penny/health" /></Route>
      <Route path="/operations/trail-os-health">   <Redirect to="/operations/health" /></Route>
      <Route path="/operations/communications">    <Redirect to="/collaboration" /></Route>

      {/* Demand → operations demand tab */}
      <Route path="/demand/intake">          <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/cases">           <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/epics">           <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/features">        <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/stories">         <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/roadmap">         <Redirect to="/operations/demand" /></Route>
      <Route path="/demand/change-request">  <Redirect to="/operations/demand" /></Route>
      <Route path="/demand">                 <Redirect to="/operations/demand" /></Route>

      {/* Old Penny paths → penny hub tabs */}
      <Route path="/penny/capability-registry"> <Redirect to="/penny" /></Route>
      <Route path="/penny/prompt-studio">       <Redirect to="/penny/prompts" /></Route>
      <Route path="/penny/test-penny">          <Redirect to="/penny/test" /></Route>
      <Route path="/penny/prompt-library">      <Redirect to="/penny/prompts" /></Route>
      <Route path="/penny/response-quality">    <Redirect to="/penny/intelligence" /></Route>
      <Route path="/penny/integrations">        <Redirect to="/admin/setup" /></Route>
      <Route path="/penny/integration-layer">   <Redirect to="/admin/setup" /></Route>
      {/* Trail Quests, Assessments, and Agentforce — now live tabs in PennyHub */}
      <Route path="/penny/logs">                <Redirect to="/penny/learners" /></Route>

      {/* Communications → collaboration */}
      <Route path="/communications/overview">          <Redirect to="/collaboration" /></Route>
      <Route path="/communications/providers">         <Redirect to="/collaboration" /></Route>
      <Route path="/communications/channels">          <Redirect to="/collaboration/channels" /></Route>
      <Route path="/communications/calendar">          <Redirect to="/collaboration/calendar" /></Route>
      <Route path="/communications/penny-broadcasts">  <Redirect to="/collaboration/channels" /></Route>
      <Route path="/communications/weekly-briefs">     <Redirect to="/collaboration/briefs" /></Route>
      <Route path="/communications/notifications">     <Redirect to="/collaboration/notifications" /></Route>
      <Route path="/communications/message-templates"> <Redirect to="/collaboration/templates" /></Route>
      <Route path="/communications">                   <Redirect to="/collaboration" /></Route>

      {/* Program sub-paths that moved to Administration */}
      <Route path="/program/sf-validation"> <Redirect to="/admin/sf-validation" /></Route>
      <Route path="/program/resources">     <Redirect to="/admin/program-resources" /></Route>

      {/* Curriculum → program hub */}
      <Route path="/curriculum/blueprint">           <Redirect to="/program/blueprint" /></Route>
      <Route path="/curriculum/standards">           <Redirect to="/program/standards" /></Route>
      <Route path="/curriculum/salesforce-mapping">  <Redirect to="/admin/salesforce-arch" /></Route>
      <Route path="/program/salesforce">             <Redirect to="/admin/salesforce-arch" /></Route>
      <Route path="/curriculum/overview">            <Redirect to="/program/curriculum" /></Route>
      <Route path="/curriculum/programs">            <Redirect to="/program/programs" /></Route>
      <Route path="/curriculum/:sub">                <Redirect to="/program/curriculum" /></Route>
      <Route path="/curriculum">                     <Redirect to="/program/curriculum" /></Route>

      {/* Library → knowledge hub */}
      <Route path="/library/knowledge-sources"> <Redirect to="/knowledge" /></Route>
      <Route path="/library/documents">         <Redirect to="/knowledge/library" /></Route>
      <Route path="/library/templates">         <Redirect to="/knowledge/library" /></Route>
      <Route path="/library/salesforce-kb">     <Redirect to="/knowledge/library" /></Route>
      <Route path="/library/source-mapping">    <Redirect to="/digital-twin" /></Route>
      <Route path="/knowledge/relationships">   <Redirect to="/digital-twin" /></Route>
      <Route path="/library/search">            <Redirect to="/search" /></Route>
      <Route path="/knowledge/search">          <Redirect to="/search" /></Route>
      <Route path="/library/:sub">              <Redirect to="/knowledge/library" /></Route>
      <Route path="/library">                   <Redirect to="/knowledge" /></Route>

      {/* Old admin sub-pages */}
      <Route path="/operations/integrations">      <Redirect to="/admin/integration-readiness" /></Route>
      <Route path="/admin/integration-readiness"  component={IntegrationReadinessCenter} />
      <Route path="/admin/comm-channels">         <Redirect to="/collaboration/channels" /></Route>
      <Route path="/admin/comm-routing">          <Redirect to="/collaboration/channels" /></Route>
      <Route path="/admin/comm-templates">        <Redirect to="/collaboration/templates" /></Route>
      <Route path="/admin/program-resources"     component={ProgramResources} />
      {/* Removed stub pages — redirect to canonical locations */}
      <Route path="/admin/roles">        <Redirect to="/admin/people-access" /></Route>
      <Route path="/admin/access-roles"> <Redirect to="/admin/people-access" /></Route>
      <Route path="/admin/penny">     <Redirect to="/penny" /></Route>
      <Route path="/admin/settings">  <Redirect to="/admin" /></Route>
      <Route path="/admin/templates"> <Redirect to="/knowledge/library" /></Route>

      {/* Root-level legacy aliases */}
      <Route path="/trail-os-penny">        <Redirect to="/trail-os-overview" /></Route>
      <Route path="/penny/trail-os-map">    <Redirect to="/trail-os-overview" /></Route>
      <Route path="/resolve-demand">  <Redirect to="/operations/demand" /></Route>
      <Route path="/source-docs">     <Redirect to="/knowledge/library" /></Route>

      {/* ── Hub routes ── */}
      <Route path="/uom/:tab"             component={UnifiedObjectModel} />
      <Route path="/uom"                  component={UnifiedObjectModel} />

      <Route path="/digital-twin/:tab"    component={DigitalTwin} />
      <Route path="/digital-twin"         component={DigitalTwin} />

      <Route path="/operations/:tab"      component={OperationsHub} />
      <Route path="/operations"           component={OperationsHub} />

      <Route path="/program/:tab"         component={ProgramHub} />
      <Route path="/program"              component={ProgramHub} />

      <Route path="/penny/:tab"           component={PennyHub} />
      <Route path="/penny"                component={PennyHub} />

      <Route path="/knowledge/:tab"       component={KnowledgeHub} />
      <Route path="/knowledge"            component={KnowledgeHub} />

      <Route path="/collaboration/slack/:subtab"     component={CollaborationHub} />
      <Route path="/collaboration/drive/:subtab"     component={CollaborationHub} />
      <Route path="/collaboration/calendar/:subtab"  component={CollaborationHub} />
      <Route path="/collaboration/:tab"              component={CollaborationHub} />
      <Route path="/collaboration"                   component={CollaborationHub} />

      {/* Governance + Search + Context Engine */}
      <Route path="/governance/:tab"      component={GovernanceHub} />
      <Route path="/governance"           component={GovernanceHub} />
      <Route path="/search"               component={GlobalSearch} />
      <Route path="/context/:tab"         component={ContextHub} />
      <Route path="/context"              component={ContextHub} />

      {/* Standalone platform pages */}
      <Route path="/trail-os-overview"       component={TrailOSOverview} />

      {/* Administration */}
      <Route path="/admin/setup"             component={AdminSetup} />
      <Route path="/admin/people-access"     component={PeopleAccess} />
      <Route path="/admin/salesforce-arch"   component={SalesforceMapping} />
      <Route path="/admin/sf-validation"    component={SalesforceValidationCenter} />
      <Route path="/admin/people">           <Redirect to="/admin/people-access" /></Route>
      <Route path="/admin/phase1-readiness"  component={Phase1ReadinessDashboard} />
      <Route path="/admin/ux-standards"     component={Phase1UXStandards} />
      <Route path="/admin/secrets-audit"     component={IntegrationSecretsAudit} />
      <Route path="/admin/google-oauth"      component={GoogleOAuthFlow} />
      <Route path="/admin/create-audit"      component={CreateAudit} />
      <Route path="/admin/phase2-backlog"    component={Phase2Backlog} />
      <Route path="/admin/phase1-audit"     component={Phase1CompletionAudit} />
      <Route path="/admin/:section"          component={Admin} />
      <Route path="/admin">               <Redirect to="/admin/setup" /></Route>

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
