import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import ProgramMap from "@/pages/ProgramMap";
import TrailOSPenny from "@/pages/TrailOSPenny";
import ResolveDemand from "@/pages/ResolveDemand";
import SourceDocs from "@/pages/SourceDocs";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProgramMap} />
      <Route path="/trail-os-penny" component={TrailOSPenny} />
      <Route path="/resolve-demand" component={ResolveDemand} />
      <Route path="/source-docs" component={SourceDocs} />
      <Route path="/admin" component={Admin} />
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
