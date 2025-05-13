import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Package, Users, Plus, RefreshCw, AlertTriangle, Trash2, Filter } from "lucide-react";
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
import { useState, useEffect } from "react";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface ThresholdValues {
  id: number;
  deviceId: string;
  amberThreshold: number;
  redThreshold: number;
  createdAt: string;
  updatedAt: string;
}

interface NotificationContact {
  id: number;
  deviceId: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

// DeviceStock Management Tab
function DeviceStockTab() {
  const { toast } = useToast();
  const [newDeviceId, setNewDeviceId] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  // Query device stock data
  const { data: deviceStock = [], isLoading, isError } = useQuery<DeviceStock[]>({
    queryKey: ["/api/admin/device-stock"],
    retry: 1
  });

  // Filtered device stock based on status filter
  const filteredDeviceStock = deviceStock.filter(device => {
    if (statusFilter === "all") return true;
    return device.status === statusFilter;
  });

  // Mutation to add a device to stock
  const addDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch("/api/admin/device-stock", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add device");
      }
      
      return response.json();
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
        description: error.message || "Failed to add device to inventory.",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete a device from stock
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/admin/device-stock/${deviceId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete device");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device removed",
        description: "The device has been removed from inventory.",
        variant: "default"
      });
      setIsConfirmDialogOpen(false);
      setIsRemoveDialogOpen(false);
      setDeviceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/device-stock"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing device",
        description: error.message || "Failed to remove device from inventory.",
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

  const openRemoveDialog = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setIsRemoveDialogOpen(true);
  };

  const openConfirmDialog = () => {
    setIsRemoveDialogOpen(false);
    setIsConfirmDialogOpen(true);
  };

  const cancelRemoval = () => {
    setIsRemoveDialogOpen(false);
    setIsConfirmDialogOpen(false);
    setDeviceToDelete(null);
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

      {/* Status Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filter by status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Allocated">Allocated</SelectItem>
          </SelectContent>
        </Select>
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

      {/* First Remove Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl text-center mb-2">Remove Device from Inventory?</DialogTitle>
            <DialogDescription className="text-center mb-6">
              Are you sure you want to remove device "{deviceToDelete}" 
              from the inventory? This device will be made available for
              other users and all device data will be deleted.
            </DialogDescription>
            
            <div className="flex w-full space-x-2 justify-center">
              <Button variant="outline" onClick={cancelRemoval}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={openConfirmDialog}>
                Remove Device
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Second Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl text-center mb-2">Permanent Data Deletion!</DialogTitle>
            <DialogDescription className="text-center mb-6">
              All data associated with "{deviceToDelete}" will be 
              permanently deleted from the Height Tec system.
            </DialogDescription>
            
            <div className="flex w-full space-x-2 justify-center">
              <Button variant="outline" onClick={cancelRemoval}>
                Go Back
              </Button>
              <Button 
                variant="destructive"
                onClick={() => deviceToDelete && handleDeleteDevice(deviceToDelete)}
                disabled={deleteDeviceMutation.isPending}
              >
                {deleteDeviceMutation.isPending ? "Deleting..." : "Confirm Deletion"}
              </Button>
            </div>
          </div>
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
              {filteredDeviceStock && filteredDeviceStock.length > 0 ? (
                filteredDeviceStock.map((device: DeviceStock) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.deviceId}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={device.status === "Available" ? "outline" : "secondary"}
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{device.lastAllocatedTo || "-"}</TableCell>
                    <TableCell>
                      {new Date(device.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {device.status === "Available" ? (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => openRemoveDialog(device.deviceId)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
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
                    {statusFilter !== "all" 
                      ? `No devices with status "${statusFilter}" found.` 
                      : "No devices in inventory. Add a device to get started."}
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
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // Threshold states
  const [thresholds, setThresholds] = useState<ThresholdValues | null>(null);
  const [amberThreshold, setAmberThreshold] = useState<number>(25);
  const [redThreshold, setRedThreshold] = useState<number>(35);

  // Notification contacts state
  const [contacts, setContacts] = useState<NotificationContact[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  // Query all users for dropdown
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: 1
  });

  // Query all devices
  const { data: allDevices = [], isLoading: isLoadingDevices, isError: isErrorDevices } = useQuery<Device[]>({
    queryKey: ["/api/admin/devices"],
    retry: 1
  });

  // Query devices for specific user if selected
  const { data: userDevices = [], isLoading: isLoadingUserDevices } = useQuery<Device[]>({
    queryKey: ["/api/admin/devices/user", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId || selectedUserId === "all") return [];
      const response = await fetch(`/api/admin/devices/user/${selectedUserId}`);
      if (!response.ok) throw new Error('Failed to fetch user devices');
      return response.json();
    },
    enabled: !!selectedUserId && selectedUserId !== "all",
    retry: 1
  });

  // Load thresholds when a device is selected for editing
  useEffect(() => {
    if (selectedDevice && isEditDialogOpen) {
      // Fetch thresholds
      fetch(`/api/thresholds/${selectedDevice.deviceId}`)
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (data) {
            setThresholds(data);
            setAmberThreshold(data.amberThreshold);
            setRedThreshold(data.redThreshold);
          } else {
            setThresholds(null);
            setAmberThreshold(25);
            setRedThreshold(35);
          }
        })
        .catch(() => {
          setThresholds(null);
          setAmberThreshold(25);
          setRedThreshold(35);
        });
      
      // Fetch notification contacts
      fetch(`/api/devices/${selectedDevice.deviceId}/contacts`)
        .then(response => response.ok ? response.json() : [])
        .then(data => {
          setContacts(data || []);
        })
        .catch(() => {
          setContacts([]);
        });
    }
  }, [selectedDevice, isEditDialogOpen]);

  // Decide which devices to display based on user selection
  const devicesToDisplay = selectedUserId === "all" 
    ? allDevices 
    : userDevices;

  // Mutation to update device
  const updateDeviceMutation = useMutation({
    mutationFn: async (data: {
      deviceId: string, 
      updates: Partial<Device>,
      thresholds?: { amberThreshold: number, redThreshold: number },
      contacts?: { name: string, email: string }[]
    }) => {
      // Update device basic info
      const response = await fetch(`/api/admin/devices/${data.deviceId}`, {
        method: "PATCH",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update device");
      }

      // Update thresholds if provided
      if (data.thresholds) {
        const thresholdResponse = await fetch(`/api/thresholds/${data.deviceId}`, {
          method: "PUT",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.thresholds)
        });
        
        if (!thresholdResponse.ok) {
          throw new Error("Failed to update thresholds");
        }
      }

      // Handle contacts updates if needed (simplified - would need more complexity for real implementation)
      if (data.contacts && data.contacts.length > 0) {
        // For demo purposes only adding contacts, not removing existing ones
        for (const contact of data.contacts) {
          if (!contact.name || !contact.email) continue;
          
          await fetch(`/api/devices/${data.deviceId}/contacts`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contact)
          });
        }
      }
      
      return response.json();
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
        description: error.message || "Failed to update device.",
        variant: "destructive"
      });
    }
  });

  // Mutation to delete device
  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/admin/devices/${deviceId}`, {
        method: "DELETE",
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete device");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device deleted",
        description: "The device has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setIsConfirmDeleteDialogOpen(false);
      setDeviceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/devices"] });
      if (selectedUserId && selectedUserId !== "all") {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/devices/user", selectedUserId] 
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSaveDevice = () => {
    if (!selectedDevice) return;

    // Basic device data
    const updatedData = {
      deviceName: (document.getElementById("edit-deviceName") as HTMLInputElement)?.value || selectedDevice.deviceName,
      project: (document.getElementById("edit-project") as HTMLInputElement)?.value || null,
      active: (document.getElementById("edit-active") as HTMLSelectElement)?.value === "true"
    };

    // Prepare update data including thresholds and contacts
    const updateData = {
      deviceId: selectedDevice.deviceId,
      updates: updatedData,
      thresholds: {
        amberThreshold,
        redThreshold
      },
      contacts: newContactName && newContactEmail ? [
        { name: newContactName, email: newContactEmail }
      ] : undefined
    };

    updateDeviceMutation.mutate(updateData);
  };

  const openDeleteDialog = (device: Device) => {
    setDeviceToDelete(device);
    setIsDeleteDialogOpen(true);
  };

  const openConfirmDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setIsConfirmDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setIsConfirmDeleteDialogOpen(false);
    setDeviceToDelete(null);
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

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device Name</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devicesToDisplay && devicesToDisplay.length > 0 ? (
            devicesToDisplay.map((device: Device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.deviceName}</TableCell>
                <TableCell>{device.deviceId}</TableCell>
                <TableCell>
                  {users?.find((u: User) => u.id === device.userId)?.username || '-'}
                </TableCell>
                <TableCell>{device.project || '-'}</TableCell>
                <TableCell>
                  {device.lastSeen 
                    ? new Date(device.lastSeen).toLocaleString() 
                    : (
                      <span className="text-muted-foreground">-</span>
                    )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => openDeleteDialog(device)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                {selectedUserId !== "all" 
                  ? "This user has no devices. Allocate a device from inventory." 
                  : "No devices found."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  // First Delete Dialog
  const DeleteDialog = () => (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl text-center mb-2">Remove Device?</DialogTitle>
          <DialogDescription className="text-center mb-6">
            Are you sure you want to remove "{deviceToDelete?.deviceName}" 
            from the system? This device will be made available for 
            other users and all device data will be deleted.
          </DialogDescription>
          
          <div className="flex w-full space-x-2 justify-center">
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={openConfirmDeleteDialog}>
              Remove Device
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Second Confirm Delete Dialog
  const ConfirmDeleteDialog = () => (
    <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <DialogTitle className="text-xl text-center mb-2">Permanent Data Deletion!</DialogTitle>
          <DialogDescription className="text-center mb-6">
            All data associated with "{deviceToDelete?.deviceName}" will be 
            permanently deleted from the Height Tec system.
          </DialogDescription>
          
          <div className="flex w-full space-x-2 justify-center">
            <Button variant="outline" onClick={cancelDelete}>
              Go Back
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deviceToDelete && deleteDeviceMutation.mutate(deviceToDelete.deviceId)}
              disabled={deleteDeviceMutation.isPending}
            >
              {deleteDeviceMutation.isPending ? "Deleting..." : "Confirm Deletion"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">User Devices</h2>
        
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select user to view devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {users?.map((user: User) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.username} ({user.fullName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {renderDevicesTable()}
        </CardContent>
      </Card>

      {/* Edit Device Dialog */}
      {selectedDevice && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Device: {selectedDevice.deviceId}</DialogTitle>
              <DialogDescription>
                Update the device information and settings.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-deviceName" className="text-right">
                  Device Name
                </Label>
                <Input
                  id="edit-deviceName"
                  defaultValue={selectedDevice.deviceName}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-project" className="text-right">
                  Project
                </Label>
                <Input
                  id="edit-project"
                  defaultValue={selectedDevice.project || ''}
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-active" className="text-right">
                  Status
                </Label>
                <Select defaultValue={selectedDevice.active ? "true" : "false"}>
                  <SelectTrigger className="col-span-3" id="edit-active">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Thresholds Section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="font-medium mb-3">Wind Speed Thresholds</h3>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-amber" className="text-right">
                    Amber Alert (mph)
                  </Label>
                  <Input
                    id="edit-amber"
                    type="number"
                    value={amberThreshold}
                    onChange={(e) => setAmberThreshold(parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4 mt-2">
                  <Label htmlFor="edit-red" className="text-right">
                    Red Alert (mph)
                  </Label>
                  <Input
                    id="edit-red"
                    type="number"
                    value={redThreshold}
                    onChange={(e) => setRedThreshold(parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
              </div>

              {/* Notification Contacts Section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="font-medium mb-3">Notification Contacts</h3>
                
                {contacts.length > 0 ? (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Existing Contacts:</h4>
                    <ul className="text-sm space-y-1">
                      {contacts.map(contact => (
                        <li key={contact.id} className="flex justify-between">
                          <span>{contact.name}</span>
                          <span className="text-muted-foreground">{contact.email}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">No notification contacts configured.</p>
                )}
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New Contact:</h4>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contact-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="contact-name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="col-span-3"
                      placeholder="Contact name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contact-email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      className="col-span-3"
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveDevice}
                disabled={updateDeviceMutation.isPending}
              >
                {updateDeviceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <DeleteDialog />
      
      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog />
    </div>
  );
}

export default function AdminDeviceManagementPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !user.isAdmin) {
    return <Redirect to="/login" />;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Device Management</h1>
        
        <Tabs defaultValue="user-devices">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user-devices">User Devices</TabsTrigger>
            <TabsTrigger value="device-stock">Device Inventory</TabsTrigger>
          </TabsList>
          <TabsContent value="user-devices" className="mt-6">
            <UserDevicesTab />
          </TabsContent>
          <TabsContent value="device-stock" className="mt-6">
            <DeviceStockTab />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}