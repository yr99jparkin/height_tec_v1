import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WindChart } from "@/components/ui/wind-chart";
import { GoogleMap } from "@/components/ui/google-map";
import { Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WindData, Device } from "@shared/schema";
import { DeviceWithLatestData } from "@shared/types";
import { RemoveDeviceModal } from "./remove-device-modal";
import { format } from "date-fns";

interface DeviceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
}

export function DeviceDetailModal({ open, onOpenChange, deviceId }: DeviceDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [amberThreshold, setAmberThreshold] = useState<number>(20);
  const [redThreshold, setRedThreshold] = useState<number>(30);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState<string>("24h");
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Get device data
  const { data: device } = useQuery<Device>({
    queryKey: ["/api/devices", deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error("No device ID provided");
      const response = await apiRequest("GET", `/api/devices/${deviceId}`);
      if (!response.ok) throw new Error("Failed to fetch device");
      const data = await response.json();
      console.log("Device data received:", data);
      return data;
    },
    enabled: !!deviceId && open,
  });

  // Get device thresholds
  const { data: thresholds } = useQuery({
    queryKey: ["/api/thresholds", deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error("No device ID provided");
      const response = await apiRequest("GET", `/api/thresholds/${deviceId}`);
      if (!response.ok) throw new Error("Failed to fetch thresholds");
      return await response.json();
    },
    enabled: !!deviceId && open,
  });

  // Update thresholds when data is loaded
  useEffect(() => {
    if (thresholds && typeof thresholds === 'object') {
      // Handle amber threshold (prioritize new field names)
      if ('amberThreshold' in thresholds && typeof thresholds.amberThreshold === 'number') {
        setAmberThreshold(thresholds.amberThreshold);
      } 
      // Fallback for backwards compatibility with old schema
      else if ('avgWindSpeedThreshold' in thresholds && typeof thresholds.avgWindSpeedThreshold === 'number') {
        setAmberThreshold(thresholds.avgWindSpeedThreshold);
        console.log("Using legacy avgWindSpeedThreshold field", thresholds.avgWindSpeedThreshold);
      }
      
      // Handle red threshold (prioritize new field names)
      if ('redThreshold' in thresholds && typeof thresholds.redThreshold === 'number') {
        setRedThreshold(thresholds.redThreshold);
      }
      // Fallback for backwards compatibility with old schema
      else if ('maxWindSpeedThreshold' in thresholds && typeof thresholds.maxWindSpeedThreshold === 'number') {
        setRedThreshold(thresholds.maxWindSpeedThreshold);
        console.log("Using legacy maxWindSpeedThreshold field", thresholds.maxWindSpeedThreshold);
      }
    }
  }, [thresholds]);

  // Get wind data history
  const { data: windData } = useQuery<WindData[]>({
    queryKey: ["/api/wind/history", deviceId, timeRange],
    queryFn: async () => {
      if (!deviceId) throw new Error("No device ID provided");
      const response = await apiRequest("GET", `/api/wind/history/${deviceId}?range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch wind history");
      return await response.json();
    },
    enabled: !!deviceId && open,
  });

  // Get wind stats
  const { data: windStats = {} } = useQuery({
    queryKey: ["/api/wind/stats", deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error("No device ID provided");
      const response = await apiRequest("GET", `/api/wind/stats/${deviceId}`);
      if (!response.ok) throw new Error("Failed to fetch wind stats");
      return await response.json();
    },
    enabled: !!deviceId && open,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update thresholds mutation
  const updateThresholdsMutation = useMutation({
    mutationFn: async () => {
      if (!deviceId) return;
      await apiRequest("PATCH", `/api/thresholds/${deviceId}`, {
        amberThreshold: amberThreshold,
        redThreshold: redThreshold,
      });
    },
    onSuccess: () => {
      toast({
        title: "Thresholds updated",
        description: "Wind alert thresholds have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/thresholds", deviceId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update thresholds",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportData = () => {
    if (!deviceId) return;

    let startDate: string;
    let endDate: string = new Date().toISOString();

    switch (exportRange) {
      case "1h":
        startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        break;
      case "24h":
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "7d":
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "30d":
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "custom":
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate).toISOString();
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }

    // Create a direct download link
    const downloadUrl = `/api/export/${deviceId}?start=${startDate}&end=${endDate}`;
    window.open(downloadUrl, '_blank');
  };

  // Helper function to determine alert status with amber and red thresholds
  const getAlertClass = (value: number, threshold: 'amber' | 'red') => {
    if (threshold === 'red') {
      if (value > redThreshold) return "text-destructive";
      if (value > amberThreshold) return "text-[hsl(var(--warning))]";
      return "text-[hsl(var(--safe))]";
    } else { // amber threshold
      if (value > amberThreshold) return "text-[hsl(var(--warning))]";
      return "text-[hsl(var(--safe))]";
    }
  };

  return (
    <>
      <Dialog open={open && !!deviceId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl w-[90vw] max-h-[90vh] flex flex-col p-0">
          <div className="flex items-center justify-between border-b border-neutral-300 p-4">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-2xl">{device?.deviceName}</DialogTitle>
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => setRemoveModalOpen(true)}
                className="h-8 w-8"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-neutral-500">Device ID: {device?.deviceId}</p>
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => onOpenChange(false)}
                className="ml-4"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4">
            <div className="space-y-6">
              {/* Wind Chart - Prominent section */}
              <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">Wind Speed Trend</h3>
                  <div className="flex space-x-2">
                    <Button 
                      variant={timeRange === "1h" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setTimeRange("1h")}
                    >
                      1H
                    </Button>
                    <Button 
                      variant={timeRange === "3h" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setTimeRange("3h")}
                    >
                      3H
                    </Button>
                    <Button 
                      variant={timeRange === "24h" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setTimeRange("24h")}
                    >
                      24H
                    </Button>
                    <Button 
                      variant={timeRange === "7d" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setTimeRange("7d")}
                    >
                      7D
                    </Button>
                  </div>
                </div>
                <div className="h-80">
                  {windData && windData.length > 0 ? (
                    <WindChart 
                      data={windData} 
                      timeRange={timeRange} 
                      amberThreshold={amberThreshold}
                      redThreshold={redThreshold}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
                      <p className="text-neutral-500">No wind data available for this period</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--safe))] mr-2"></div>
                    <span>Normal</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--warning))] mr-2"></div>
                    <span>Amber Alert (≥ {amberThreshold} km/h)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-destructive mr-2"></div>
                    <span>Red Alert (≥ {redThreshold} km/h)</span>
                  </div>
                </div>
              </div>

              {/* Wind Speed Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Current Wind Speed</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass(Number((windStats as any).currentWindSpeed) || 0, 'red') + " text-3xl font-mono font-medium"}>
                      {(Number((windStats as any).currentWindSpeed) || 0).toFixed(1)}
                    </p>
                    <p className={getAlertClass(Number((windStats as any).currentWindSpeed) || 0, 'red') + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass(Number((windStats as any).currentWindSpeed) || 0, 'red').replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, ((Number((windStats as any).currentWindSpeed) || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Avg. Wind Speed (10m)</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass(Number((windStats as any).avgWindSpeed) || 0, 'red') + " text-3xl font-mono font-medium"}>
                      {(Number((windStats as any).avgWindSpeed) || 0).toFixed(1)}
                    </p>
                    <p className={getAlertClass(Number((windStats as any).avgWindSpeed) || 0, 'red') + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass(Number((windStats as any).avgWindSpeed) || 0, 'red').replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, ((Number((windStats as any).avgWindSpeed) || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Max Wind Speed (10m)</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass(Number((windStats as any).maxWindSpeed) || 0, 'red') + " text-3xl font-mono font-medium"}>
                      {(Number((windStats as any).maxWindSpeed) || 0).toFixed(1)}
                    </p>
                    <p className={getAlertClass(Number((windStats as any).maxWindSpeed) || 0, 'red') + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass(Number((windStats as any).maxWindSpeed) || 0, 'red').replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, ((Number((windStats as any).maxWindSpeed) || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alert Thresholds */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium mb-4">Wind Alert Thresholds</h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm font-medium">Amber Alert Threshold</p>
                        <p className="font-mono text-[hsl(var(--warning))]">{amberThreshold} km/h</p>
                      </div>
                      <Slider 
                        value={[amberThreshold]} 
                        min={5} 
                        max={40} 
                        step={1} 
                        onValueChange={(values) => setAmberThreshold(values[0])} 
                      />
                      <p className="text-xs text-neutral-500 mt-2">
                        Amber alert when wind speed exceeds this value
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <p className="text-sm font-medium">Red Alert Threshold</p>
                        <p className="font-mono text-destructive">{redThreshold} km/h</p>
                      </div>
                      <Slider 
                        value={[redThreshold]} 
                        min={10} 
                        max={50} 
                        step={1} 
                        onValueChange={(values) => setRedThreshold(values[0])} 
                      />
                      <p className="text-xs text-neutral-500 mt-2">
                        Red alert when wind speed exceeds this value
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => updateThresholdsMutation.mutate()}>
                      {updateThresholdsMutation.isPending ? "Saving..." : "Save Thresholds"}
                    </Button>
                  </div>
                </div>
                
                {/* Location Map */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium mb-4">Device Location</h3>
                  <div className="h-64 bg-neutral-200 rounded relative">
                    {device?.latitude && device?.longitude ? (
                      <>
                        <div style={{ height: "100%", borderRadius: "0.25rem", overflow: "hidden" }}>
                          <GoogleMap 
                            devices={[{
                              id: device.id,
                              deviceId: device.deviceId,
                              deviceName: device.deviceName,
                              location: device.location,
                              latitude: device.latitude,
                              longitude: device.longitude,
                              active: device.active,
                              lastSeen: device.lastSeen ? new Date(device.lastSeen).toISOString() : undefined,
                              avgWindSpeed: (windStats as any).avgWindSpeed || 0,
                              maxWindSpeed: (windStats as any).maxWindSpeed || 0,
                              alertState: (windStats as any).alertState || false
                            } as unknown as DeviceWithLatestData]} 
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
                        <p className="text-neutral-500">Location data not available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {device && (
        <RemoveDeviceModal
          open={removeModalOpen}
          onOpenChange={setRemoveModalOpen}
          deviceId={device.deviceId}
          deviceName={device.deviceName}
          onDeviceRemoved={() => {
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
          }}
        />
      )}
    </>
  );
}