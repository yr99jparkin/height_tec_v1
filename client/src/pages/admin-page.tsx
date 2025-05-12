import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Redirect, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { 
  Activity, 
  BarChart, 
  Database, 
  FileText, 
  Settings, 
  Users, 
  Wind,
  AlertTriangle,
  ArrowRight
} from "lucide-react";

interface AdminAppCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

function AdminAppCard({ title, description, icon, href, color }: AdminAppCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <Card 
      className="cursor-pointer transition-transform hover:translate-y-[-5px] hover:shadow-md"
      onClick={() => setLocation(href)}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${color}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="mt-auto flex items-center text-sm font-medium">
          <span>Open</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user } = useAuth();

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  const adminApps = [
    {
      title: "Data Simulation",
      description: "Generate simulated data for testing and demos",
      icon: <Wind className="h-8 w-8 text-white" />,
      href: "/admin/simulation",
      color: "bg-blue-500"
    },
    {
      title: "System Logs",
      description: "View and search application logs",
      icon: <FileText className="h-8 w-8 text-white" />,
      href: "/admin/system-logs",
      color: "bg-green-500"
    },
    {
      title: "User Management",
      description: "Manage user accounts and permissions",
      icon: <Users className="h-8 w-8 text-white" />,
      href: "/admin/user-management",
      color: "bg-purple-500"
    },
    {
      title: "System Status",
      description: "Monitor system health and metrics",
      icon: <Activity className="h-8 w-8 text-white" />,
      href: "/admin/system-status",
      color: "bg-amber-500"
    },
    {
      title: "Database Management",
      description: "View and manage database operations",
      icon: <Database className="h-8 w-8 text-white" />,
      href: "/admin/database",
      color: "bg-red-500"
    },
    {
      title: "Analytics Dashboard",
      description: "View system analytics and reports",
      icon: <BarChart className="h-8 w-8 text-white" />,
      href: "/admin/analytics",
      color: "bg-indigo-500"
    },
    {
      title: "Alert Management",
      description: "Configure and manage alert thresholds",
      icon: <AlertTriangle className="h-8 w-8 text-white" />,
      href: "/admin/alerts",
      color: "bg-orange-500"
    },
    {
      title: "System Settings",
      description: "Configure global system settings",
      icon: <Settings className="h-8 w-8 text-white" />,
      href: "/admin/settings",
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-heading font-semibold text-neutral-800 mb-6 flex items-center">
          <Settings className="mr-2 h-6 w-6" />
          Admin Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminApps.map((app, index) => (
            <AdminAppCard 
              key={index}
              title={app.title}
              description={app.description}
              icon={app.icon}
              href={app.href}
              color={app.color}
            />
          ))}
        </div>
      </main>
    </div>
  );
}