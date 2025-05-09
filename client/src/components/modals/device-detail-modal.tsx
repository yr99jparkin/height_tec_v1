import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WindChart } from "@/components/ui/wind-chart";
import { GoogleMap } from "@/components/ui/google-map";
import { Bell, Edit, Edit2, FolderClosed, Pencil, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WindData, Device, NotificationContact } from "@shared/schema";
import { DeviceWithLatestData, UpdateDeviceRequest } from "@shared/types";
import { RemoveDeviceModal } from "./remove-device-modal";
import { NotificationContactsModal } from "./notification-contacts-modal";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeviceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  openNotificationsTab?: boolean;
  focusedContactId?: number | null;
}

export function DeviceDetailModal({ 
  open, 
  onOpenChange, 
  deviceId, 
  openNotificationsTab = false, 
  focusedContactId = null 
}: DeviceDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<string>("3h");
  const [amberThreshold, setAmberThreshold] = useState<number>(20);
  const [redThreshold, setRedThreshold] = useState<number>(30);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [editingDeviceName, setEditingDeviceName] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isUpdatingDevice, setIsUpdatingDevice] = useState(false);
  const [notificationContacts, setNotificationContacts] = useState<NotificationContact[]>([]);
  const deviceNameInputRef = useRef<HTMLInputElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);

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

  // Update device state when data is loaded
  useEffect(() => {
    if (device) {
      setDeviceName(device.deviceName);
      setProjectName(device.project || "");
    }
  }, [device]);
  
  // Update thresholds when data is loaded
  useEffect(() => {
    if (thresholds && typeof thresholds === 'object') {
      if ('amberThreshold' in thresholds && typeof thresholds.amberThreshold === 'number') {
        setAmberThreshold(thresholds.amberThreshold);
      }
      if ('redThreshold' in thresholds && typeof thresholds.redThreshold === 'number') {
        setRedThreshold(thresholds.redThreshold);
      }
    }
  }, [thresholds]);
  
  // Get notification contacts for device
  const { data: contacts = [] } = useQuery<NotificationContact[]>({
    queryKey: [`/api/devices/${deviceId}/contacts`],
    queryFn: async () => {
      if (!deviceId) throw new Error("No device ID provided");
      const response = await apiRequest("GET", `/api/devices/${deviceId}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch notification contacts");
      return await response.json();
    },
    enabled: !!deviceId && open
  });
  
  // Update local state when contacts data changes
  useEffect(() => {
    console.log("Device detail modal - contacts data from API:", contacts);
    if (contacts) {
      setNotificationContacts(contacts);
      console.log("Device detail modal - updated notificationContacts state:", contacts);
    }
  }, [contacts]);
  
  // Open notifications tab when specified via props
  useEffect(() => {
    if (openNotificationsTab && device) {
      setNotificationsModalOpen(true);
    }
  }, [openNotificationsTab, device]);
  
  // Update device name/project mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async (data: UpdateDeviceRequest) => {
      if (!deviceId) return;
      const response = await apiRequest("PATCH", `/api/devices/${deviceId}`, data);
      if (!response.ok) throw new Error("Failed to update device");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device updated",
        description: "Device information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update device",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setEditingDeviceName(false);
      setEditingProject(false);
      setIsUpdatingDevice(false);
    }
  });
  
  // Start editing device name
  const startEditingDeviceName = () => {
    setEditingDeviceName(true);
    // Focus the input after render
    setTimeout(() => {
      if (deviceNameInputRef.current) {
        deviceNameInputRef.current.focus();
      }
    }, 0);
  };
  
  // Save device name
  const saveDeviceName = () => {
    if (!deviceId || !deviceName.trim() || deviceName === device?.deviceName) {
      setEditingDeviceName(false);
      return;
    }
    
    setIsUpdatingDevice(true);
    updateDeviceMutation.mutate({ deviceName });
  };
  
  // Start editing project
  const startEditingProject = () => {
    setEditingProject(true);
    // Focus the input after render
    setTimeout(() => {
      if (projectNameInputRef.current) {
        projectNameInputRef.current.focus();
      }
    }, 0);
  };
  
  // Save project
  const saveProject = () => {
    if (!deviceId || projectName === device?.project) {
      setEditingProject(false);
      return;
    }
    
    setIsUpdatingDevice(true);
    updateDeviceMutation.mutate({ project: projectName });
  };

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
  
  // We've moved the optimization logic to the GoogleMap component

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
              {editingDeviceName ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={deviceNameInputRef}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    onBlur={saveDeviceName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveDeviceName();
                      if (e.key === 'Escape') setEditingDeviceName(false);
                    }}
                    placeholder="Device Name"
                    className="text-2xl h-10 font-bold"
                    disabled={isUpdatingDevice}
                  />
                </div>
              ) : (
                <DialogTitle 
                  className="text-2xl cursor-pointer hover:text-primary flex items-center gap-1"
                  onClick={startEditingDeviceName}
                >
                  {device?.deviceName}
                  <Pencil className="h-4 w-4 opacity-50" />
                </DialogTitle>
              )}
              
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => setRemoveModalOpen(true)}
                className="h-8 w-8"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {editingProject ? (
                <div className="flex items-center">
                  <Input
                    ref={projectNameInputRef}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={saveProject}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveProject();
                      if (e.key === 'Escape') setEditingProject(false);
                    }}
                    placeholder="Project"
                    className="h-8 w-40 text-sm"
                    disabled={isUpdatingDevice}
                  />
                </div>
              ) : (
                <div 
                  className="inline-flex h-7 items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 cursor-pointer"
                  onClick={startEditingProject}
                >
                  <FolderClosed className="h-3.5 w-3.5 mr-1" />
                  {device?.project || "Add project"}
                </div>
              )}
              <p className="text-neutral-500">Device ID: {device?.deviceId}</p>
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
              {/* Wind Chart - Prominent section */}
              <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm">
                <div className="mb-4">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex space-x-2">
                      <Button 
                        variant={timeRange === "15m" ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setTimeRange("15m")}
                      >
                        15M
                      </Button>
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
                    </div>
                    <h3 className="text-xl font-medium">Wind Speed Trend</h3>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
                      onClick={() => {
                        onOpenChange(false); // Close the modal
                        window.location.href = '/reports'; // Navigate to reports page
                      }}
                    >
                      Generate Report
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
                  <p className="text-sm uppercase font-medium text-neutral-500">Avg. Wind Speed (10mins)</p>
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
                  <p className="text-sm uppercase font-medium text-neutral-500">Max Wind Speed (10mins)</p>
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
                  <div className="mt-4 flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => setNotificationsModalOpen(true)}
                      className="flex items-center"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications {notificationContacts.length > 0 && `(${notificationContacts.length})`}
                    </Button>
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
        <>
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
          
          <NotificationContactsModal
            open={notificationsModalOpen}
            onOpenChange={setNotificationsModalOpen}
            deviceId={device.deviceId}
            contacts={notificationContacts}
            focusedContactId={focusedContactId}
          />
        </>
      )}
    </>
  );
}