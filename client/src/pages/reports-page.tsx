import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { useLocation } from "wouter";

export default function ReportsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user exists and direct to auth page if not
  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        <div className="flex-1 flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-heading font-semibold text-neutral-800">Wind Reports</h1>
          </div>
          
          <div className="bg-white border border-neutral-300 rounded-lg p-8 shadow-sm flex flex-col items-center">
            <p className="text-center text-neutral-600 mb-4">
              Report generation feature will be implemented soon...
            </p>
            <Button 
              className="bg-yellow-400 text-black hover:bg-yellow-500"
            >
              Generate Report
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}