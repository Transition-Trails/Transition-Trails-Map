import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useAppContext } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import SignInPage from "@/pages/SignIn";
import { Map, ShieldOff } from "lucide-react";

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

// ── Global API error interceptor ──────────────────────────────────────────────
// Wraps window.fetch once at module load so 401/403 responses from our own API
// are caught regardless of which hook makes the call.
//   401 → session gone  → re-check /me (which returns authenticated:false) →
//          InnerApp shows the sign-in page automatically.
//   403 → signed in but not permitted → dispatch event so UI can show a clear
//          "ask your administrator" message rather than a silent failure.
const _origFetch = window.fetch.bind(window);
const queryClient = new QueryClient();

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const res = await _origFetch(input, init);
  const url  = typeof input === 'string' ? input
             : input instanceof URL      ? input.href
             : (input as Request).url;

  // Only intercept calls to our own API (not Google, Slack, etc.)
  if (url.startsWith('/api/') || url.includes('/api/')) {
    if (res.status === 401) {
      // Re-check auth — the /me endpoint returns authenticated:false if the
      // session is gone, which causes InnerApp to show the sign-in page.
      void queryClient.invalidateQueries({ queryKey: ['google-auth-me'] });
    } else if (res.status === 403) {
      window.dispatchEvent(new CustomEvent('trail-os-forbidden'));
    }
  }

  return res;
};

import Home                from "@/pages/Home";
import TrailOSOverview     from "@/pages/TrailOSOverview";
import SalesforceMapping            from "@/pages/curriculum/SalesforceMapping";
import SalesforceValidationCenter  from "@/pages/curriculum/SalesforceValidationCenter";
import ProgramResources             from "@/pages/admin/ProgramResources";
import IntegrationReadinessCenter   from "@/pages/admin/IntegrationReadinessCenter";
import PeopleAccess               from "@/pages/admin/PeopleAccess";
import Admin   from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import Phase1ReadinessDashboard from "@/pages/admin/Phase1ReadinessDashboard";
import Phase1UXStandards        from "@/pages/admin/Phase1UXStandards";
import IntegrationSecretsAudit  from "@/pages/admin/IntegrationSecretsAudit";
import GoogleOAuthFlow           from "@/pages/admin/GoogleOAuthFlow";
import GoogleDriveIntegrationCenter    from "@/pages/collaboration/GoogleDriveIntegrationCenter";
import GoogleCalendarIntegrationCenter from "@/pages/collaboration/GoogleCalendarIntegrationCenter";
import IntegrationHub            from "@/pages/admin/IntegrationHub";
import CreateAudit               from "@/pages/admin/CreateAudit";

import Phase1CompletionAudit    from "@/pages/admin/Phase1CompletionAudit";

import DigitalTwin      from "@/pages/twin/DigitalTwin";
import OperationsHub    from "@/pages/ops/OperationsHub";
import ProgramHub       from "@/pages/program/ProgramHub";
import PennyCommandCenter      from "@/pages/penny/PennyCommandCenter";
import PennyCapabilityRegistry from "@/pages/penny/PennyCapabilityRegistry";
import PennyPromptStudio       from "@/pages/penny/PennyPromptStudio";
import Learners                from "@/pages/penny/Learners";
import SessionLog              from "@/pages/penny/SessionLog";
import TrailQuests             from "@/pages/penny/TrailQuests";
import Intelligence            from "@/pages/penny/Intelligence";
import Assessments             from "@/pages/penny/Assessments";
import AgentforceCenter        from "@/pages/penny/AgentforceCenter";
import PennyHealth             from "@/pages/operations/PennyHealth";
import PennyAssetLibrary       from "@/pages/penny/PennyAssetLibrary";
import PennyLogs               from "@/pages/penny/PennyLogs";
import VideoProduction         from "@/pages/penny/VideoProduction";
import TestPenny               from "@/pages/penny/TestPenny";
import LearnerDetail           from "@/pages/penny/LearnerDetail";
import TrailConfigs            from "@/pages/penny/TrailConfigs";
import { PennyPageShell }      from "@/components/penny/PennyPageShell";
import KnowledgeOverview      from "@/pages/knowledge/KnowledgeOverview";
import KnowledgeSourcesAdmin  from "@/pages/knowledge/KnowledgeSourcesAdmin";
import SfKnowledgeArticles    from "@/pages/knowledge/SfKnowledgeArticles";
import KnowledgeReviewQueue   from "@/pages/knowledge/KnowledgeReviewQueue";
import LibraryDocuments   from "@/pages/library/LibraryDocuments";
import OrgMemory          from "@/pages/knowledge/OrgMemory";
import CollaborationWorkspace from "@/pages/collaboration/CollaborationWorkspace";
import MyTrailSignals         from "@/pages/collaboration/MyTrailSignals";
import CalendarPanel          from "@/pages/collaboration/CalendarPanel";
import GmailCenter            from "@/pages/collaboration/GmailCenter";
import SlackIntegrationCenter from "@/pages/collaboration/SlackIntegrationCenter";
import CommChannels           from "@/pages/communications/CommChannels";
import CommMessageTemplates   from "@/pages/communications/MessageTemplates";
import WeeklyBriefs           from "@/pages/communications/WeeklyBriefs";
import CommNotifications      from "@/pages/communications/CommNotifications";
import PeopleRolesStudio  from "@/pages/people/PeopleRolesStudio";
import PeopleWorkspace    from "@/pages/people/PeopleWorkspace";
import UnifiedObjectModel from "@/pages/uom/UnifiedObjectModel";
import GovernanceHub      from "@/pages/governance/GovernanceHub";
import GlobalSearch       from "@/pages/search/GlobalSearch";
import ContextHub         from "@/pages/context/ContextHub";
import LearnerLogin       from "@/pages/learner/LearnerLogin";
import LearnerDashboard   from "@/pages/learner/LearnerDashboard";
import LearnerPenny       from "@/pages/learner/LearnerPenny";
import LearnerQuest       from "@/pages/learner/LearnerQuest";
import LearnerProgress    from "@/pages/learner/LearnerProgress";

// queryClient is declared at module level above (next to the fetch interceptor)

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
      <Route path="/penny/prompt-library">      <Redirect to="/penny/prompts" /></Route>
      <Route path="/penny/response-quality">    <Redirect to="/penny/intelligence" /></Route>
      <Route path="/penny/integrations">        <Redirect to="/admin/integrations" /></Route>
      <Route path="/penny/integration-layer">   <Redirect to="/admin/integrations" /></Route>
      {/* Old paths → direct nav items */}
      <Route path="/penny/test-penny">          <Redirect to="/penny/penny-sandbox" /></Route>
      <Route path="/penny/test">                <Redirect to="/penny/penny-sandbox" /></Route>
      <Route path="/penny/trails">              <Redirect to="/penny/trail-configs" /></Route>
      <Route path="/penny/quest-templates">     <Redirect to="/penny/quest-library" /></Route>
      <Route path="/penny/weekly-reports">      <Redirect to="/penny/intelligence" /></Route>
      <Route path="/penny/logs">                <Redirect to="/penny/penny-logs" /></Route>
      <Route path="/penny/admin-center">        <Redirect to="/penny" /></Route>
      {/* Quest Activity is redundant — content lives in Learner Detail quest history tab */}
      <Route path="/penny/quest-activity">      <Redirect to="/penny/learners" /></Route>

      {/* Old collaboration config tabs → Integration Hub */}
      <Route path="/collaboration/drive/:sub">   <Redirect to="/admin/integrations/google-drive" /></Route>
      <Route path="/collaboration/drive">        <Redirect to="/admin/integrations/google-drive" /></Route>
      <Route path="/collaboration/calendar/:sub"><Redirect to="/admin/integrations/google-calendar" /></Route>
      <Route path="/collaboration/calendar">     <Redirect to="/admin/integrations/google-calendar" /></Route>

      {/* Old standalone admin pages → Integration Hub */}
      <Route path="/admin/google-oauth">  <Redirect to="/admin/integrations/google-auth" /></Route>
      <Route path="/admin/secrets-audit"> <Redirect to="/admin/integrations/secrets" /></Route>

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
      <Route path="/operations/integrations">      <Redirect to="/admin/integrations" /></Route>
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
      <Route path="/operations">          <Redirect to="/operations/health" /></Route>

      <Route path="/program/config/:id"   component={ProgramHub} />
      <Route path="/program/:tab"         component={ProgramHub} />
      <Route path="/program"              component={ProgramHub} />

      <Route path="/penny/learner/:contactId"  component={LearnerDetail} />
      <Route path="/penny/trail-configs"       component={TrailConfigs} />
      <Route path="/penny/capabilities">       <PennyPageShell><PennyCapabilityRegistry /></PennyPageShell></Route>
      <Route path="/penny/prompts">            <PennyPageShell><PennyPromptStudio /></PennyPageShell></Route>
      <Route path="/penny/learners">           <PennyPageShell><Learners /></PennyPageShell></Route>
      <Route path="/penny/session-log">        <PennyPageShell><SessionLog /></PennyPageShell></Route>
      <Route path="/penny/trail-quests">       <PennyPageShell><TrailQuests /></PennyPageShell></Route>
      <Route path="/penny/intelligence">       <PennyPageShell><Intelligence /></PennyPageShell></Route>
      <Route path="/penny/assessments">        <PennyPageShell><Assessments /></PennyPageShell></Route>
      <Route path="/penny/agentforce">         <PennyPageShell><AgentforceCenter /></PennyPageShell></Route>
      <Route path="/penny/health">             <PennyPageShell><PennyHealth /></PennyPageShell></Route>
      <Route path="/penny/asset-library">      <PennyPageShell><PennyAssetLibrary /></PennyPageShell></Route>
      <Route path="/penny/quest-library">      <PennyPageShell><TrailQuests /></PennyPageShell></Route>
      <Route path="/penny/penny-logs">         <PennyPageShell><PennyLogs /></PennyPageShell></Route>
      <Route path="/penny/penny-sandbox">      <PennyPageShell><TestPenny /></PennyPageShell></Route>
      <Route path="/penny/video-production">   <PennyPageShell><VideoProduction /></PennyPageShell></Route>
      <Route path="/penny">                    <PennyPageShell><PennyCommandCenter /></PennyPageShell></Route>

      <Route path="/knowledge/sources"       component={KnowledgeSourcesAdmin} />
      <Route path="/knowledge/sf-articles"  component={SfKnowledgeArticles} />
      <Route path="/knowledge/review-queue" component={KnowledgeReviewQueue} />
      <Route path="/knowledge/library" component={LibraryDocuments} />
      <Route path="/knowledge/memory"  component={OrgMemory} />
      <Route path="/knowledge"         component={KnowledgeOverview} />

      <Route path="/collaboration/my-signals"    component={MyTrailSignals} />
      <Route path="/collaboration/channels"      component={CommChannels} />
      <Route path="/collaboration/templates"     component={CommMessageTemplates} />
      <Route path="/collaboration/briefs"        component={WeeklyBriefs} />
      <Route path="/collaboration/notifications" component={CommNotifications} />
      <Route path="/collaboration/calendar-live" component={CalendarPanel} />
      <Route path="/collaboration/gmail"         component={GmailCenter} />
      <Route path="/collaboration/slack/:tab"     component={SlackIntegrationCenter} />
      <Route path="/collaboration/slack"          component={SlackIntegrationCenter} />
      <Route path="/collaboration">              <Redirect to="/collaboration/my-signals" /></Route>

      {/* Governance + Search + Context Engine */}
      <Route path="/governance/:tab"      component={GovernanceHub} />
      <Route path="/governance"           component={GovernanceHub} />
      <Route path="/search"               component={GlobalSearch} />
      <Route path="/context/:tab"         component={ContextHub} />
      <Route path="/context"              component={ContextHub} />

      {/* Standalone platform pages */}
      <Route path="/trail-os-overview"       component={TrailOSOverview} />

      {/* Administration */}
      <Route path="/admin/setup">             <Redirect to="/admin/integrations" /></Route>
      <Route path="/admin/people-access"     component={PeopleAccess} />
      <Route path="/admin/salesforce-arch"   component={SalesforceMapping} />
      <Route path="/admin/sf-validation"    component={SalesforceValidationCenter} />
      <Route path="/admin/people">           <Redirect to="/admin/people-access" /></Route>
      <Route path="/admin/phase1-readiness"  component={Phase1ReadinessDashboard} />
      <Route path="/admin/ux-standards"     component={Phase1UXStandards} />
      <Route path="/admin/create-audit"      component={CreateAudit} />

      <Route path="/admin/phase1-audit"     component={Phase1CompletionAudit} />
      <Route path="/admin/program-config">   <Redirect to="/program/config" /></Route>

      {/* Integration Hub — unified setup center */}
      <Route path="/admin/integrations/google-auth"          component={GoogleOAuthFlow} />
      <Route path="/admin/integrations/google-drive/:tab"    component={GoogleDriveIntegrationCenter} />
      <Route path="/admin/integrations/google-drive"         component={GoogleDriveIntegrationCenter} />
      <Route path="/admin/integrations/google-calendar/:tab" component={GoogleCalendarIntegrationCenter} />
      <Route path="/admin/integrations/google-calendar"      component={GoogleCalendarIntegrationCenter} />
      <Route path="/admin/integrations/secrets"         component={IntegrationSecretsAudit} />
      <Route path="/admin/integrations"                 component={IntegrationHub} />

      <Route path="/admin/:section"          component={Admin} />
      <Route path="/admin">               <Redirect to="/admin/integrations" /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

// ── Learner route guard ───────────────────────────────────────────────────────
function LearnerRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok'>('loading');
  const [, navigate]        = useLocation();

  useEffect(() => {
    fetch('/api/learner/auth/status')
      .then(r => r.ok ? r.json() as Promise<{ authenticated: boolean }> : Promise.reject())
      .then((data: { authenticated: boolean }) => {
        if (data.authenticated) setStatus('ok');
        else navigate('/learner/login');
      })
      .catch(() => navigate('/learner/login'));
  }, []);

  if (status === 'loading') return <div className="min-h-screen" style={{ background: '#FAFAF7' }} />;
  return <>{children}</>;
}

// ── Sign-in landing for "/" when not authenticated ────────────────────────────
function SignInLanding() {
  const params    = new URLSearchParams(window.location.search);
  const errorCode  = params.get('sign_in_error');
  const errorEmail = params.get('email');
  const [, setLocation] = useLocation();

  // Delegate detailed error display to SignInPage if there's an error param
  if (errorCode) {
    return <SignInPage />;
  }

  return (
    <div className="min-h-screen bg-[hsl(40_30%_94%)] flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <Map className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">Trail OS</h1>
        <p className="text-sm text-muted-foreground">Internal platform · Transition Trails Academy</p>
      </div>
      <button
        onClick={() => setLocation('/sign-in')}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
      >
        Sign in with Google
      </button>
      <p className="text-[14px] text-muted-foreground/60">@transitiontrails.org accounts only</p>
    </div>
  );
}

// ── Inner app — inside WouterRouter and QueryClientProvider ──────────────────
function InnerApp() {
  const auth = useGoogleAuth();
  const { setUserTier } = useAppContext();
  const { toast } = useToast();

  // Apply tier from session on sign-in (server computed it from the group set)
  useEffect(() => {
    if (!auth.isLoading && auth.isSignedIn && auth.user) {
      setUserTier(auth.user.tier);
    }
  }, [auth.isLoading, auth.isSignedIn, auth.user?.email]);

  // 403 handler — fired by the module-level fetch interceptor above.
  // Shows a clear "ask your administrator" message rather than a silent failure.
  useEffect(() => {
    function handleForbidden() {
      toast({
        variant:     'destructive',
        title:       'Access denied',
        description: 'Your account does not have permission for this resource. Ask your administrator to check your Trail OS group membership.',
      });
    }
    window.addEventListener('trail-os-forbidden', handleForbidden);
    return () => window.removeEventListener('trail-os-forbidden', handleForbidden);
  }, [toast]);

  // Full-page loading state while session check is in flight
  if (auth.isLoading) {
    return <div className="min-h-screen" style={{ background: '#FAFAF7' }} />;
  }

  return (
    <Switch>
      {/* Auth page — accessible whether signed in or not */}
      <Route path="/sign-in/*?" component={SignInPage} />

      {/* Learner surface — no staff auth required */}
      <Route path="/learner/login"    component={LearnerLogin} />
      <Route path="/learner/dashboard">
        <LearnerRoute><LearnerDashboard /></LearnerRoute>
      </Route>
      <Route path="/learner/penny">
        <LearnerRoute><LearnerPenny /></LearnerRoute>
      </Route>
      <Route path="/learner/quest">
        <LearnerRoute><LearnerQuest /></LearnerRoute>
      </Route>
      <Route path="/learner/progress">
        <LearnerRoute><LearnerProgress /></LearnerRoute>
      </Route>

      {/* Everything else — staff auth gated */}
      <Route>
        {auth.isSignedIn ? (
          <AppShell>
            <Router />
          </AppShell>
        ) : (
          <Switch>
            <Route path="/" component={SignInLanding} />
            <Route component={SignInPage} />
          </Switch>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppProvider>
            <InnerApp />
          </AppProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
