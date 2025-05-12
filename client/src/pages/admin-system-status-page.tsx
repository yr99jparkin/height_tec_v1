import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { Activity } from "lucide-react";

export default function AdminSystemStatusPage() {
  const { user } = useAuth();

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-heading font-semibold text-neutral-800 mb-6 flex items-center">
            <Activity className="mr-2 h-6 w-6" />
            System Status
          </h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Monitor system performance and health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature will provide real-time insights into system performance, database status,
                and other critical metrics. Coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}