import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface AdminProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function AdminProtectedRoute({ path, component: Component }: AdminProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        if (!user.isAdmin) {
          return <Redirect to="/" />;
        }

        return <Component />;
      }}
    </Route>
  );
}