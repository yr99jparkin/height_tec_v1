import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Header } from "@/components/layout/header";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [windSpeed, setWindSpeed] = useState(35); // Default 35 knots

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  // Get a list of devices for the dropdown
  const { data: devices = [], isLoading: devicesLoading } = useQuery<any[]>({
    queryKey: ["/api/devices"],
    refetchOnWindowFocus: false,
  });

  // Mutation to trigger data simulation
  const simulateDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/simulate-data", {
        deviceId: selectedDeviceId || undefined,
        windSpeed,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Simulation started",
        description: `Successfully triggered ${data.count} data points for simulation.`,
      });
      setIsSimulating(false);
      
      // Refresh devices data after simulation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      }, 5000); // Give it a few seconds for the data to be processed
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
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-heading font-semibold text-neutral-800 mb-6 flex items-center">
            <Settings className="mr-2 h-6 w-6" />
            Admin Dashboard
          </h1>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Data Simulation</CardTitle>
              <CardDescription>
                Generate simulated wind data for testing purposes.
                This will send UDP packets to port 8125 (heighttec.app in production).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device-select">Device</Label>
                <Select
                  value={selectedDeviceId} 
                  onValueChange={setSelectedDeviceId}
                  disabled={devicesLoading || isSimulating}
                >
                  <SelectTrigger id="device-select" className="w-full">
                    <SelectValue placeholder="Select a device (or leave empty for default)" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device: any) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.deviceName} ({device.deviceId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="wind-speed">Wind Speed (knots)</Label>
                  <span className="text-sm font-medium">{windSpeed}</span>
                </div>
                <Slider
                  id="wind-speed"
                  min={0}
                  max={100}
                  step={1}
                  value={[windSpeed]}
                  onValueChange={(value) => setWindSpeed(value[0])}
                  disabled={isSimulating}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Calm (0)</span>
                  <span>Amber Alert (20)</span>
                  <span>Red Alert (30)</span>
                  <span>Storm (50+)</span>
                </div>
              </div>
              
              <Button 
                onClick={handleSimulateData} 
                disabled={isSimulating || (devicesLoading && selectedDeviceId !== "")}
                className="w-full mt-4"
              >
                {isSimulating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    Simulate Wind Data
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Admin Information</CardTitle>
              <CardDescription>
                Reference information for admin users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-medium">Simulation Process</h3>
                <p className="text-sm text-muted-foreground">
                  When you trigger a simulation, the system will send 5 UDP packets with 1-second intervals 
                  to the server. In production, these will be sent to heighttec.app on port 8125.
                </p>
                <h3 className="font-medium mt-4">Production Settings</h3>
                <p className="text-sm text-muted-foreground">
                  This feature checks the environment (NODE_ENV) to determine if it's running in production.
                  If so, it will direct UDP traffic to the production endpoint.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}