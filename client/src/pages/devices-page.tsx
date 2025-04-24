import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DeviceCard } from "@/components/ui/device-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeviceWithLatestData } from "@shared/types";
import { DeviceDetailModal } from "@/components/modals/device-detail-modal";
import { AddDeviceModal } from "@/components/modals/add-device-modal";
import { GoogleMap } from "@/components/ui/google-map";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function DevicesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);

  // Fetch devices
  const { data: devices = [], isLoading } = useQuery<DeviceWithLatestData[]>({
    queryKey: ["/api/devices"],
    refetchInterval: 30000, // Refresh every 30 seconds
    onSuccess: (data) => {
      console.log("Devices data with alert states:", data.map(d => ({
        deviceId: d.deviceId,
        alertState: d.alertState,
        amberAlert: d.amberAlert,
        redAlert: d.redAlert
      })));
    }
  });

  // Check if user exists and direct to auth page if not
  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Filter devices based on search query
  const filteredDevices = devices.filter(
    (device) =>
      device.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (device.location && device.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (device.project && device.project.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeviceClick = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        {/* Sidebar component removed - uncomment when adding more functionality
        <Sidebar /> 
        */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel (Device List) */}
          <div className="lg:w-1/2 overflow-y-auto p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-heading font-semibold text-neutral-800">Devices</h1>
              <Button
                onClick={() => setAddDeviceModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Device
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="bg-white p-3 rounded-lg shadow-sm mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search devices and projects..."
                  className="pl-10 bg-neutral-100 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Device Cards */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-white animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : filteredDevices.length > 0 ? (
              <div className="space-y-4">
                {filteredDevices.map((device) => (
                  <DeviceCard
                    key={device.deviceId}
                    device={device}
                    onDeviceClick={handleDeviceClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-neutral-500">No devices found</p>
                {devices.length > 0 && searchQuery && (
                  <p className="text-sm text-neutral-400 mt-1">Try a different search term</p>
                )}
                {devices.length === 0 && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => setAddDeviceModalOpen(true)}
                      variant="outline"
                    >
                      Add your first device
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel (Map View) */}
          <div className="lg:w-1/2 bg-neutral-100 p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-neutral-300">
            <h2 className="text-xl font-heading font-semibold text-neutral-800 mb-4">Device Locations</h2>
            <div className="bg-white rounded-lg shadow-sm h-[calc(100%-3rem)] overflow-hidden relative">
              {devices.length > 0 && devices.some(d => d.latitude && d.longitude) ? (
                <GoogleMap 
                  devices={devices.filter(d => d.latitude && d.longitude)} 
                  onDeviceClick={handleDeviceClick} 
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                  <p className="text-neutral-500">No device locations available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Modals */}
      <DeviceDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        deviceId={selectedDeviceId}
      />
      
      <AddDeviceModal
        open={addDeviceModalOpen}
        onOpenChange={setAddDeviceModalOpen}
      />
    </div>
  );
}
