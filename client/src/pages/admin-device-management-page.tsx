import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Package, Users, Plus, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types
interface DeviceStock {
  id: number;
  deviceId: string;
  status: string;
  lastAllocatedTo: string;
  createdAt: string;
}

interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  userId: number | null;
  project: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  lastSeen: string | null;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  createdAt: string;
}

// DeviceStock Management Tab
function DeviceStockTab() {
  const { toast } = useToast();
  const [newDeviceId, setNewDeviceId] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Query device stock data
  const { data: deviceStock, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/device-stock"],
    retry: 1
  });

  // Mutation to add a device to stock
  const addDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => {
      return apiRequest("/api/admin/device-stock", "POST", { deviceId });
    },
    onSuccess: () => {
      toast({
        title: "Device added",
        description: "The device has been added to inventory.",
        variant: "default"
      });
      setNewDeviceId("");
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/device-stock"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding device",
        description: error.response?.data?.message || "Failed to add device to inventory.",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a device from stock
  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => {
      return apiRequest(`/api/admin/device-stock/${deviceId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Device removed",
        description: "The device has been removed from inventory.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/device-stock"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing device",
        description: error.response?.data?.message || "Failed to remove device from inventory.",
        variant: "destructive"
      });
    }
  });

  const handleAddDevice = () => {
    if (!newDeviceId.trim()) {
      toast({
        title: "Validation error",
        description: "Device ID is required.",
        variant: "destructive"
      });
      return;
    }
    
    addDeviceMutation.mutate(newDeviceId);
  };

  const handleDeleteDevice = (deviceId: string) => {
    deleteDeviceMutation.mutate(deviceId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading device inventory...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        <AlertTriangle className="h-8 w-8 mr-2" />
        <span>Error loading device inventory. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Device Inventory</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Add Device Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Device to Inventory</DialogTitle>
            <DialogDescription>
              Enter the device ID to add to the inventory. This ID will be used to identify the device.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="deviceId" className="mb-2 block">
              Device ID
            </Label>
            <Input
              id="deviceId"
              placeholder="e.g., HT-ANEM-001"
              value={newDeviceId}
              onChange={(e) => setNewDeviceId(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDevice} disabled={addDeviceMutation.isPending}>
              {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Stock Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Allocated To</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceStock && deviceStock.length > 0 ? (
                deviceStock.map((device: DeviceStock) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.deviceId}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={device.status === "Available" ? "outline" : "secondary"}
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{device.lastAllocatedTo}</TableCell>
                    <TableCell>
                      {new Date(device.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {device.status === "Available" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Device from Inventory</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {device.deviceId} from the inventory?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDevice(device.deviceId)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button variant="secondary" size="sm" disabled>
                          <Package className="h-4 w-4 mr-1" />
                          Allocated
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No devices in inventory. Add a device to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// User Devices Management Tab
function UserDevicesTab() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Query all users for dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: 1
  });

  // Query all devices
  const { data: allDevices, isLoading: isLoadingDevices, isError: isErrorDevices } = useQuery({
    queryKey: ["/api/admin/devices"],
    retry: 1
  });

  // Query devices for specific user if selected
  const { data: userDevices, isLoading: isLoadingUserDevices } = useQuery({
    queryKey: ["/api/admin/devices/user", selectedUserId],
    enabled: !!selectedUserId && selectedUserId !== "all",
    retry: 1
  });

  // Mutation to update device
  const updateDeviceMutation = useMutation({
    mutationFn: (data: {deviceId: string, updates: Partial<Device>}) => {
      return apiRequest(`/api/admin/devices/${data.deviceId}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Device updated",
        description: "The device has been updated successfully.",
        variant: "default"
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/devices"] });
      if (selectedUserId && selectedUserId !== "all") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/devices/user", selectedUserId] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error updating device",
        description: error.response?.data?.message || "Failed to update device.",
        variant: "destructive"
      });
    }
  });

  const handleUpdateDevice = (formData: FormData) => {
    if (!selectedDevice) return;

    const updates: Partial<Device> = {
      deviceName: formData.get("deviceName") as string,
      project: formData.get("project") as string,
      location: formData.get("location") as string,
      active: formData.get("active") === "true"
    };

    updateDeviceMutation.mutate({
      deviceId: selectedDevice.deviceId,
      updates
    });
  };

  // Display logic based on loading/error states and user selection
  const renderDevicesTable = () => {
    if (isLoadingDevices || (isLoadingUserDevices && selectedUserId && selectedUserId !== "all")) {
      return (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2">Loading devices...</span>
        </div>
      );
    }

    if (isErrorDevices) {
      return (
        <div className="flex justify-center items-center h-64 text-red-500">
          <AlertTriangle className="h-8 w-8 mr-2" />
          <span>Error loading devices. Please try again.</span>
        </div>
      );
    }

    // Determine which devices to show
    const devicesToDisplay = selectedUserId === "all" ? allDevices : userDevices;
    
    if (!devicesToDisplay || devicesToDisplay.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          {selectedUserId && selectedUserId !== "all" 
            ? "No devices found for this user." 
            : "No devices found."}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devicesToDisplay.map((device: Device) => (
            <TableRow key={device.id}>
              <TableCell className="font-medium">{device.deviceId}</TableCell>
              <TableCell>{device.deviceName}</TableCell>
              <TableCell>{device.project || "-"}</TableCell>
              <TableCell>{device.location || "-"}</TableCell>
              <TableCell>
                <Badge variant={device.active ? "outline" : "destructive"}>
                  {device.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {device.userId ? (
                  users?.find((u: User) => u.id === device.userId)?.username || device.userId
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsEditDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">User Devices</h2>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="user-filter" className="mr-2">Filter by User:</Label>
          <Select
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
          >
            <SelectTrigger className="w-[220px]" id="user-filter">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users?.map((user: User) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Devices Table */}
      <Card>
        <CardContent className="p-0">
          {renderDevicesTable()}
        </CardContent>
      </Card>

      {/* Edit Device Dialog */}
      {selectedDevice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device: {selectedDevice.deviceId}</DialogTitle>
              <DialogDescription>
                Update the device details and settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  name="deviceName"
                  defaultValue={selectedDevice.deviceName}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Input
                  id="project"
                  name="project"
                  defaultValue={selectedDevice.project || ""}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={selectedDevice.location || ""}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <Select defaultValue={selectedDevice.active ? "true" : "false"} name="active">
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                disabled={updateDeviceMutation.isPending}
                onClick={() => {
                  const deviceName = (document.getElementById('deviceName') as HTMLInputElement).value;
                  const project = (document.getElementById('project') as HTMLInputElement).value;
                  const location = (document.getElementById('location') as HTMLInputElement).value;
                  const activeSelect = document.querySelector('select[name="active"]') as HTMLSelectElement;
                  const active = activeSelect ? activeSelect.value === 'true' : selectedDevice.active;
                  
                  updateDeviceMutation.mutate({
                    deviceId: selectedDevice.deviceId,
                    updates: {
                      deviceName,
                      project,
                      location,
                      active
                    }
                  });
                }}
              >
                {updateDeviceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Main page component
export default function AdminDeviceManagementPage() {
  const { user } = useAuth();

  // If the user is not an admin, redirect to home
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6">
        <div className="flex items-center mb-6">
          <Server className="mr-2 h-6 w-6" />
          <h1 className="text-2xl font-heading font-semibold text-neutral-800">Device Management</h1>
        </div>
        
        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock" className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Device Stock
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Devices
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stock" className="space-y-4">
            <DeviceStockTab />
          </TabsContent>
          
          <TabsContent value="devices" className="space-y-4">
            <UserDevicesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}