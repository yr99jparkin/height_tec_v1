import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [tab, setTab] = useState("overview");
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
    enabled: !!deviceId && open,
  });

  // Get device thresholds
  const { data: thresholds } = useQuery({
    queryKey: ["/api/thresholds", deviceId],
    enabled: !!deviceId && open,
    onSuccess: (data) => {
      if (data) {
        setAvgThreshold(data.avgWindSpeedThreshold);
        setMaxThreshold(data.maxWindSpeedThreshold);
      }
    },
  });

  // Get wind data history
  const { data: windData } = useQuery<WindData[]>({
    queryKey: ["/api/wind/history", deviceId, timeRange],
    enabled: !!deviceId && open && tab === "overview",
  });

  // Get wind stats
  const { data: windStats } = useQuery({
    queryKey: ["/api/wind/stats", deviceId],
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
            <Tabs defaultValue="overview" value={tab} onValueChange={setTab}>
              <TabsList className="border-b border-neutral-300 w-full justify-start mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="historical">Historical Data</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Wind Speed Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                    <p className="text-sm uppercase font-medium text-neutral-500">Current Wind Speed</p>
                    <div className="flex items-baseline mt-2">
                      <p className={getAlertClass(windStats?.windSpeed || 0, maxThreshold) + " text-3xl font-mono font-medium"}>
                        {windStats?.windSpeed?.toFixed(1) || "0.0"}
                      </p>
                      <p className={getAlertClass(windStats?.windSpeed || 0, maxThreshold) + " ml-1"}>km/h</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1 bg-neutral-200 rounded-full">
                        <div 
                          className={`h-1 ${getAlertClass(windStats?.windSpeed || 0, maxThreshold).replace('text-', 'bg-')} rounded-full`} 
                          style={{ width: `${Math.min(100, ((windStats?.windSpeed || 0) / 40) * 100)}%` }}
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
                      <p className={getAlertClass(windStats?.avgWindSpeed || 0, avgThreshold) + " text-3xl font-mono font-medium"}>
                        {windStats?.avgWindSpeed?.toFixed(1) || "0.0"}
                      </p>
                      <p className={getAlertClass(windStats?.avgWindSpeed || 0, avgThreshold) + " ml-1"}>km/h</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1 bg-neutral-200 rounded-full">
                        <div 
                          className={`h-1 ${getAlertClass(windStats?.avgWindSpeed || 0, avgThreshold).replace('text-', 'bg-')} rounded-full`} 
                          style={{ width: `${Math.min(100, ((windStats?.avgWindSpeed || 0) / 40) * 100)}%` }}
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
                      <p className={getAlertClass(windStats?.maxWindSpeed || 0, maxThreshold) + " text-3xl font-mono font-medium"}>
                        {windStats?.maxWindSpeed?.toFixed(1) || "0.0"}
                      </p>
                      <p className={getAlertClass(windStats?.maxWindSpeed || 0, maxThreshold) + " ml-1"}>km/h</p>
                    </div>
                    <div className="mt-3">
                      <div className="h-1 bg-neutral-200 rounded-full">
                        <div 
                          className={`h-1 ${getAlertClass(windStats?.maxWindSpeed || 0, maxThreshold).replace('text-', 'bg-')} rounded-full`} 
                          style={{ width: `${Math.min(100, ((windStats?.maxWindSpeed || 0) / 40) * 100)}%` }}
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
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0, borderRadius: "0.25rem" }}
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBUxvIhcqHLF_li7llmHlC9_XM0wQ9j_L0&q=${device.latitude},${device.longitude}&zoom=15`}
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-neutral-50 rounded-md">
                          <p className="text-neutral-500">Location data not available</p>
                        </div>
                      )}
                    </div>
                    {device?.latitude && device?.longitude && (
                      <div className="mt-3">
                        <p className="text-sm text-neutral-600">
                          <i className="fas fa-map-marker-alt mr-1 text-destructive"></i>
                          {device.location || "Location not specified"}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          <i className="fas fa-location-arrow mr-1"></i>
                          Coordinates: {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Alert Thresholds */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium mb-4">Alert Thresholds</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Average Wind Speed (10 min)</label>
                        <span className="text-sm font-mono">{avgThreshold} km/h</span>
                      </div>
                      <Slider 
                        value={[avgThreshold]} 
                        min={0} 
                        max={50} 
                        step={1} 
                        onValueChange={(value) => setAvgThreshold(value[0])}
                      />
                      <div className="flex justify-between text-xs text-neutral-500 mt-1">
                        <span>0 km/h</span>
                        <span>25 km/h</span>
                        <span>50 km/h</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Maximum Wind Speed (10 min)</label>
                        <span className="text-sm font-mono">{maxThreshold} km/h</span>
                      </div>
                      <Slider 
                        value={[maxThreshold]} 
                        min={0} 
                        max={50} 
                        step={1} 
                        onValueChange={(value) => setMaxThreshold(value[0])}
                      />
                      <div className="flex justify-between text-xs text-neutral-500 mt-1">
                        <span>0 km/h</span>
                        <span>25 km/h</span>
                        <span>50 km/h</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => updateThresholdsMutation.mutate()}
                      disabled={updateThresholdsMutation.isPending}
                    >
                      {updateThresholdsMutation.isPending ? "Saving..." : "Save Thresholds"}
                    </Button>
                  </div>
                </div>
                
                {/* Export Data */}
                <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium mb-4">Export Data</h3>
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-grow max-w-xs">
                      <label className="block text-sm font-medium mb-1">Date Range</label>
                      <Select 
                        value={exportRange} 
                        onValueChange={setExportRange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">Last 1 hour</SelectItem>
                          <SelectItem value="24h">Last 24 hours</SelectItem>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="custom">Custom range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {exportRange === "custom" && (
                      <div className="grid grid-cols-2 gap-2 flex-grow max-w-sm">
                        <div>
                          <label className="block text-sm font-medium mb-1">Start Date</label>
                          <input 
                            type="date" 
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full p-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">End Date</label>
                          <input 
                            type="date" 
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full p-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Button 
                        variant="secondary"
                        className="bg-neutral-800 hover:bg-neutral-900 text-white"
                        onClick={handleExportData}
                      >
                        <i className="fas fa-download mr-2"></i> Export CSV
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="historical">
                <div className="p-4 text-center">
                  <p>Historical data analysis will be implemented in a future update.</p>
                </div>
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="p-4 text-center">
                  <p>Device settings will be implemented in a future update.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      
      {deviceId && (
        <RemoveDeviceModal 
          open={removeModalOpen} 
          onOpenChange={setRemoveModalOpen} 
          deviceId={deviceId}
          deviceName={device?.deviceName || ""}
          onDeviceRemoved={() => {
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
