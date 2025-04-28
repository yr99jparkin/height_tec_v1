import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DevicesPage from "@/pages/devices-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
// Marketing pages - relative imports until TypeScript can resolve them
import HomePage from "./pages/marketing/home-page";
import FeaturesPage from "./pages/marketing/features-page";
import PricingPage from "./pages/marketing/pricing-page";
// Sidebar components commented out for future use
// import { SidebarProvider } from "@/components/ui/sidebar";

function Router() {
  return (
    <Switch>
      {/* Marketing Pages */}
      <Route path="/" component={HomePage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/pricing" component={PricingPage} />
      
      {/* Authentication */}
      <Route path="/auth" component={AuthPage} />
      
      {/* App Routes - Now under /app path */}
      <ProtectedRoute path="/app" component={DevicesPage} />
      <ProtectedRoute path="/app/devices" component={DevicesPage} />
      
      {/* 404 */}
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
