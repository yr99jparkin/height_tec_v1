import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DevicesPage from "@/pages/devices-page";
import ReportsPage from "@/pages/reports-page";
import AcknowledgePage from "@/pages/AcknowledgePage";
import UnsubscribePage from "@/pages/UnsubscribePage";
import UnsubscribeSuccessPage from "@/pages/UnsubscribeSuccessPage";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
// Sidebar components commented out for future use
// import { SidebarProvider } from "@/components/ui/sidebar";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DevicesPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <Route path="/auth" component={AuthPage} />
      {/* Alert acknowledgement route - publicly accessible with valid token */}
      <Route path="/alert/acknowledge/:tokenId" component={AcknowledgePage} />
      {/* Alert unsubscribe route - now directly processes the unsubscribe request */}
      <Route path="/alert/unsubscribe/:contactId/:deviceId" component={UnsubscribePage} />
      {/* Success page after unsubscribing */}
      <Route path="/alert/unsubscribe-success" component={UnsubscribeSuccessPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleMapsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </GoogleMapsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
