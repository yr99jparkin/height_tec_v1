import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { Users } from "lucide-react";

export default function AdminUserManagementPage() {
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
            <Users className="mr-2 h-6 w-6" />
            User Management
          </h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage system users and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature will allow administrators to manage users, roles, and permissions.
                Coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}