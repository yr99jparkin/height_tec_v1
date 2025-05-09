import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Redirect } from "wouter";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  // Mutation to trigger data simulation
  const simulateDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/simulate-data");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Simulation started",
        description: `Successfully triggered ${data.count} data points for simulation.`,
      });
      setIsSimulating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Simulation failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSimulating(false);
    },
  });

  const handleSimulateData = () => {
    setIsSimulating(true);
    simulateDataMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Settings className="mr-2 h-8 w-8" />
        Admin Dashboard
      </h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Simulation</CardTitle>
          <CardDescription>
            Generate simulated wind data for testing purposes.
            This will send UDP packets to port 8125.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleSimulateData} 
            disabled={isSimulating}
            className="w-full md:w-auto"
          >
            {isSimulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Simulating...
              </>
            ) : (
              "Simulate Wind Data"
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Additional admin features can be added here */}
    </div>
  );
}