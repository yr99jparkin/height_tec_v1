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
  const [dataPointCount, setDataPointCount] = useState(5); // Default 5 data points
  const [delayMs, setDelayMs] = useState(1000); // Default 1 second delay

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
        count: dataPointCount,
        delayMs,
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
                This will directly inject data into the system for processing.
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
                  <Label htmlFor="wind-speed">Wind Speed (km/h)</Label>
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

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="data-points">Data Points</Label>
                  <span className="text-sm font-medium">{dataPointCount}</span>
                </div>
                <Slider
                  id="data-points"
                  min={1}
                  max={20}
                  step={1}
                  value={[dataPointCount]}
                  onValueChange={(value) => setDataPointCount(value[0])}
                  disabled={isSimulating}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Single (1)</span>
                  <span>Default (5)</span>
                  <span>Maximum (20)</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="delay-ms">Delay Between Points (ms)</Label>
                  <span className="text-sm font-medium">{delayMs}</span>
                </div>
                <Slider
                  id="delay-ms"
                  min={100}
                  max={5000}
                  step={100}
                  value={[delayMs]}
                  onValueChange={(value) => setDelayMs(value[0])}
                  disabled={isSimulating}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fast (100ms)</span>
                  <span>Default (1000ms)</span>
                  <span>Slow (5000ms)</span>
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
                  When you trigger a simulation, the system will process 5 simulated data points with customizable intervals
                  directly in the application. This bypasses the need for UDP ports and works in all environments.
                </p>
                <h3 className="font-medium mt-4">Advanced Settings</h3>
                <p className="text-sm text-muted-foreground">
                  You can customize the simulation by adjusting the device, wind speed, number of data points,
                  and delay between points. This provides flexible testing for various scenarios.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}