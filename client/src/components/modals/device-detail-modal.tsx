import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WindChart } from "@/components/ui/wind-chart";
import { Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WindData, Device } from "@shared/schema";
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
  const [avgThreshold, setAvgThreshold] = useState<number>(20);
  const [maxThreshold, setMaxThreshold] = useState<number>(30);
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
      if ('avgWindSpeedThreshold' in thresholds && typeof thresholds.avgWindSpeedThreshold === 'number') {
        setAvgThreshold(thresholds.avgWindSpeedThreshold);
      }
      if ('maxWindSpeedThreshold' in thresholds && typeof thresholds.maxWindSpeedThreshold === 'number') {
        setMaxThreshold(thresholds.maxWindSpeedThreshold);
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
        avgWindSpeedThreshold: avgThreshold,
        maxWindSpeedThreshold: maxThreshold,
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

  // Helper function to determine alert status
  const getAlertClass = (value: number, threshold: number) => {
    if (value > threshold) return "text-destructive";
    if (value > threshold * 0.75) return "text-[hsl(var(--warning))]";
    return "text-[hsl(var(--safe))]";
  };

  return (
    <>
      <Dialog open={open && !!deviceId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
          <div className="flex items-center justify-between border-b border-neutral-300 p-4">
            <div>
              <DialogTitle className="text-2xl">{device?.deviceName}</DialogTitle>
              <p className="text-neutral-500">Device ID: {device?.deviceId}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => setRemoveModalOpen(true)}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4">
            <div className="space-y-6">
              {/* Wind Speed Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Current Wind Speed</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass((windStats as any).windSpeed || 0, maxThreshold) + " text-3xl font-mono font-medium"}>
                      {(windStats as any).windSpeed?.toFixed(1) || "0.0"}
                    </p>
                    <p className={getAlertClass((windStats as any).windSpeed || 0, maxThreshold) + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass((windStats as any).windSpeed || 0, maxThreshold).replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, (((windStats as any).windSpeed || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>Threshold: {maxThreshold} km/h</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Avg. Wind Speed (10m)</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass(Number((windStats as any).avgWindSpeed) || 0, avgThreshold) + " text-3xl font-mono font-medium"}>
                      {(Number((windStats as any).avgWindSpeed) || 0).toFixed(1)}
                    </p>
                    <p className={getAlertClass((windStats as any).avgWindSpeed || 0, avgThreshold) + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass((windStats as any).avgWindSpeed || 0, avgThreshold).replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, (((windStats as any).avgWindSpeed || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>Threshold: {avgThreshold} km/h</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <p className="text-sm uppercase font-medium text-neutral-500">Max Wind Speed (10m)</p>
                  <div className="flex items-baseline mt-2">
                    <p className={getAlertClass((windStats as any).maxWindSpeed || 0, maxThreshold) + " text-3xl font-mono font-medium"}>
                      {(windStats as any).maxWindSpeed?.toFixed(1) || "0.0"}
                    </p>
                    <p className={getAlertClass((windStats as any).maxWindSpeed || 0, maxThreshold) + " ml-1"}>km/h</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1 bg-neutral-200 rounded-full">
                      <div 
                        className={`h-1 ${getAlertClass((windStats as any).maxWindSpeed || 0, maxThreshold).replace('text-', 'bg-')} rounded-full`} 
                        style={{ width: `${Math.min(100, (((windStats as any).maxWindSpeed || 0) / 40) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0</span>
                      <span>Threshold: {maxThreshold} km/h</span>
                      <span>40</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Wind Chart and Map Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Wind Speed Chart */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Wind Speed Trend</h3>
                    <div className="flex space-x-2">
                      <Button 
                        variant={timeRange === "1h" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setTimeRange("1h")}
                      >
                        1H
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
                  <div className="h-64">
                    {windData && windData.length > 0 ? (
                      <WindChart data={windData} timeRange={timeRange} />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
                        <p className="text-neutral-500">No wind data available for this period</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Location Map */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium mb-4">Device Location</h3>
                  <div className="h-64 bg-neutral-200 rounded relative">
                    {device?.latitude && device?.longitude ? (
                      <>
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0, borderRadius: "0.25rem" }}
                          src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${device.latitude},${device.longitude}&zoom=15`}
                          allowFullScreen
                        />
                        <div className="mt-3">
                          <p className="text-sm text-neutral-600">
                            {device.location || "Location not specified"}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Coordinates: {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                          </p>
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
              
              {/* Alert Thresholds */}
              <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                <h3 className="font-medium mb-4">Wind Alert Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">Average Wind Speed Threshold</p>
                      <p className="font-mono">{avgThreshold} km/h</p>
                    </div>
                    <Slider 
                      value={[avgThreshold]} 
                      min={5} 
                      max={40} 
                      step={1} 
                      onValueChange={(values) => setAvgThreshold(values[0])} 
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      Alerts will trigger when the 10-minute average exceeds this value
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">Maximum Wind Speed Threshold</p>
                      <p className="font-mono">{maxThreshold} km/h</p>
                    </div>
                    <Slider 
                      value={[maxThreshold]} 
                      min={10} 
                      max={50} 
                      step={1} 
                      onValueChange={(values) => setMaxThreshold(values[0])} 
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      Alerts will trigger when any gust exceeds this value
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => updateThresholdsMutation.mutate()}>
                    {updateThresholdsMutation.isPending ? "Saving..." : "Save Thresholds"}
                  </Button>
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