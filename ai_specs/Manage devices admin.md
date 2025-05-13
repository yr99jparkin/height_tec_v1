# Admin Device Management Feature

## Overview
This feature will allow admin users to manage devices through the admin dashboard. Administrators will be able to add devices to stock, delete unallocated devices from stock, and manage devices on behalf of other users.

## Current State Analysis

### Database Schema
The current schema contains the following relevant tables:

1. **Device Stock**:
   - Tracks inventory of devices (device_id, status, last_allocated_to)
   - Status values: "Available" or "Allocated"

2. **Devices**:
   - Represents active devices associated with users
   - Links to users by user_id
   - Contains device metadata (name, project, location, etc.)

3. **Wind Alert Thresholds**:
   - Configurable alert thresholds for each device
   - Linked to devices by device_id

4. **Notification Contacts**:
   - Contact information for device alerts
   - Linked to devices by device_id

### Existing Functionality

#### Storage Operations
- `getDeviceStockByDeviceId`: Retrieves a device from stock by ID
- `updateDeviceStockStatus`: Updates a device's status in stock
- Missing: Functions for creating new stock items, listing all stock devices, and deleting stock items

#### API Routes
- Regular user device management routes exist
- Missing: Admin-specific routes for device management

#### User Interface
- Admin dashboard exists with sections for:
  - Data Simulation
  - User Management
  - Email Templates
- Missing: Device Management section

## Gap Analysis

### Storage Interface
Need to add these functions to `IStorage` interface:
- `getAllDeviceStock`: Retrieve all devices in inventory
- `createDeviceStock`: Add a new device to inventory
- `deleteDeviceStock`: Remove a device from inventory (if unallocated)
- `getDevicesByUserId`: Already exists, needed for accessing other users' devices
- `getAllDevices`: Get all devices across all users

### API Routes
Need to add these admin-specific endpoints:
- `GET /api/admin/device-stock`: List all devices in stock
- `POST /api/admin/device-stock`: Add a new device to stock
- `DELETE /api/admin/device-stock/:deviceId`: Remove a device from stock
- `GET /api/admin/devices`: List all devices across all users
- `GET /api/admin/devices/user/:userId`: List all devices for a specific user
- `POST /api/admin/devices/user/:userId`: Add a device on behalf of a user
- `PATCH /api/admin/devices/:deviceId`: Update a device on behalf of a user
- `DELETE /api/admin/devices/:deviceId`: Delete a device on behalf of a user

### User Interface
Need to create:
- Device Management section in the admin dashboard
- Device Stock Management page
- Device Management page for managing user devices

## Implementation Plan

### 1. Extend Database Access Layer

#### Update `IStorage` Interface
```typescript
// Add to server/storage.ts - IStorage interface
interface IStorage {
  // ...existing methods...
  
  // Additional device stock operations
  getAllDeviceStock(): Promise<DeviceStock[]>;
  createDeviceStock(device: InsertDeviceStock): Promise<DeviceStock>;
  deleteDeviceStock(deviceId: string): Promise<void>;
  
  // Additional device operations for admins
  getAllDevices(): Promise<Device[]>;
}
```

#### Implement New Storage Methods in `DatabaseStorage` Class
```typescript
// Add to server/storage.ts - DatabaseStorage implementation

// Get all device stock
async getAllDeviceStock(): Promise<DeviceStock[]> {
  return await db.select().from(deviceStock).orderBy(deviceStock.deviceId);
}

// Create new device in stock
async createDeviceStock(device: InsertDeviceStock): Promise<DeviceStock> {
  const [newDevice] = await db.insert(deviceStock).values(device).returning();
  return newDevice;
}

// Delete device from stock (only if not allocated)
async deleteDeviceStock(deviceId: string): Promise<void> {
  const stock = await this.getDeviceStockByDeviceId(deviceId);
  
  if (!stock) {
    throw new Error("Device not found in inventory");
  }
  
  if (stock.status !== "Available") {
    throw new Error("Cannot delete allocated device from inventory");
  }
  
  await db.delete(deviceStock).where(eq(deviceStock.deviceId, deviceId));
}

// Get all devices (across all users)
async getAllDevices(): Promise<Device[]> {
  return await db.select().from(devices).orderBy(devices.deviceId);
}
```

### 2. Add Admin API Routes

#### Device Stock Management Routes
```typescript
// Add to server/routes.ts

// Admin - Get all device stock
app.get("/api/admin/device-stock", isAdmin, async (req, res) => {
  try {
    const deviceStockList = await storage.getAllDeviceStock();
    res.json(deviceStockList);
  } catch (error) {
    console.error("[admin] Error fetching device stock:", error);
    res.status(500).json({ 
      message: "Error fetching device stock",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Add device to stock
app.post("/api/admin/device-stock", isAdmin, async (req, res) => {
  try {
    const schema = z.object({
      deviceId: z.string().min(1)
    });
    
    const data = schema.parse(req.body);
    
    // Check if device already exists in stock
    const existingDevice = await storage.getDeviceStockByDeviceId(data.deviceId);
    if (existingDevice) {
      return res.status(400).json({ message: "Device already exists in inventory" });
    }
    
    // Create new device in stock
    const newDeviceStock = await storage.createDeviceStock({
      deviceId: data.deviceId,
      status: "Available"
    });
    
    res.status(201).json(newDeviceStock);
  } catch (error) {
    console.error("[admin] Error adding device to stock:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid device data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error adding device to stock",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Delete device from stock
app.delete("/api/admin/device-stock/:deviceId", isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    
    // Delete the device from stock
    await storage.deleteDeviceStock(deviceId);
    
    res.status(204).send();
  } catch (error) {
    console.error("[admin] Error deleting device from stock:", error);
    
    if (error instanceof Error && error.message === "Cannot delete allocated device from inventory") {
      return res.status(400).json({ message: error.message });
    }
    
    if (error instanceof Error && error.message === "Device not found in inventory") {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ 
      message: "Error deleting device from stock",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

#### Admin Device Management Routes
```typescript
// Add to server/routes.ts

// Admin - Get all devices across all users
app.get("/api/admin/devices", isAdmin, async (req, res) => {
  try {
    const allDevices = await storage.getAllDevices();
    res.json(allDevices);
  } catch (error) {
    console.error("[admin] Error fetching all devices:", error);
    res.status(500).json({ 
      message: "Error fetching all devices",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Get devices for specific user
app.get("/api/admin/devices/user/:userId", isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Validate that the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const userDevices = await storage.getDevicesByUserId(userId);
    res.json(userDevices);
  } catch (error) {
    console.error("[admin] Error fetching user devices:", error);
    res.status(500).json({ 
      message: "Error fetching user devices",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Add device on behalf of user
app.post("/api/admin/devices/user/:userId", isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Validate that the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const schema = z.object({
      deviceId: z.string().min(1),
      deviceName: z.string().min(1),
      project: z.string().optional()
    });
    
    const data = schema.parse(req.body);
    
    // Check if device exists in stock
    const deviceStock = await storage.getDeviceStockByDeviceId(data.deviceId);
    if (!deviceStock) {
      return res.status(404).json({ message: "Device not found in inventory" });
    }
    
    // Check if device is available
    if (deviceStock.status !== "Available") {
      return res.status(400).json({ message: "Device is not available" });
    }
    
    // Check if device name is already used
    const existingDevice = await storage.getDeviceByDeviceId(data.deviceId);
    if (existingDevice) {
      return res.status(400).json({ message: "Device is already registered" });
    }
    
    // Create device
    const newDevice = await storage.createDevice({
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      userId: userId,
      project: data.project,
      active: true
    });
    
    // Create default thresholds
    await storage.createThresholds({
      deviceId: data.deviceId,
      amberThreshold: 20.0,
      redThreshold: 30.0
    });
    
    // Update device stock status
    await storage.updateDeviceStockStatus(data.deviceId, "Allocated", user.username);
    
    res.status(201).json(newDevice);
  } catch (error) {
    console.error("[admin] Error adding device for user:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid device data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error adding device for user",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Delete device (regardless of owner)
app.delete("/api/admin/devices/:deviceId", isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await storage.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    // Update device stock status to Available
    await storage.updateDeviceStockStatus(deviceId, "Available");
    
    // Delete the device
    await storage.deleteDevice(device.id);
    
    res.status(204).send();
  } catch (error) {
    console.error("[admin] Error removing device:", error);
    res.status(500).json({ 
      message: "Error removing device",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Update device (regardless of owner)
app.patch("/api/admin/devices/:deviceId", isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await storage.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    const schema = z.object({
      deviceName: z.string().min(1).optional(),
      project: z.string().optional(),
      location: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      active: z.boolean().optional()
    });
    
    const data = schema.parse(req.body);
    
    // Update device
    const updatedDevice = await storage.updateDevice(device.id, data);
    
    res.json(updatedDevice);
  } catch (error) {
    console.error("[admin] Error updating device:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid device data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error updating device",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Admin - Update device thresholds (regardless of owner)
app.patch("/api/admin/thresholds/:deviceId", isAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await storage.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    const schema = z.object({
      amberThreshold: z.number().min(0),
      redThreshold: z.number().min(0)
    });
    
    const data = schema.parse(req.body);
    
    // Ensure red threshold is greater than or equal to amber threshold
    if (data.redThreshold < data.amberThreshold) {
      return res.status(400).json({ 
        message: "Red threshold must be greater than or equal to amber threshold" 
      });
    }
    
    const updatedThresholds = await storage.updateThresholds(deviceId, data);
    
    res.json(updatedThresholds);
  } catch (error) {
    console.error("[admin] Error updating thresholds:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid threshold data", 
        errors: error.errors 
      });
    }
    
    res.status(500).json({ 
      message: "Error updating thresholds",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

### 3. Frontend Implementation

#### Update Admin Dashboard
Add a new app card for Device Management to the admin dashboard:

```tsx
// Update in client/src/pages/admin-page.tsx
const adminApps = [
  // ... existing app cards
  {
    title: "Device Management",
    description: "Manage devices and device inventory",
    icon: <ServerIcon className="h-8 w-8 text-white" />,
    href: "/admin/device-management",
    color: "bg-amber-500"
  }
];
```

#### Device Management Page for Admin
Create a new page with tabs for "Device Stock" and "User Devices" in:
`client/src/pages/admin-device-management-page.tsx`

This page should have:
1. Device Stock tab:
   - Display all devices in stock with their status
   - Form to add new devices to stock
   - Ability to delete unallocated devices

2. User Devices tab:
   - List all devices across all users
   - Filter devices by user
   - Add devices on behalf of users
   - Edit device details (name, project, thresholds)
   - Remove devices from users

#### Register Route
Add the new admin route to the app:

```tsx
// Update in client/src/App.tsx
<AdminProtectedRoute 
  path="/admin/device-management" 
  component={AdminDeviceManagementPage} 
/>
```

## Database Migration
No direct schema changes are needed as the existing tables (device_stock, devices, wind_alert_thresholds, and notification_contacts) already have all the required fields.

## Testing Plan
1. Admin can view all devices in stock
2. Admin can add new devices to stock
3. Admin can delete unallocated devices from stock
4. Admin can view all devices across all users
5. Admin can add devices on behalf of users
6. Admin can edit device details for any user
7. Admin can remove devices from any user

## Security Considerations
- All endpoints use the `isAdmin` middleware to ensure only admin users can access these functions
- Input validation is performed on all routes
- Error handling includes appropriate status codes and doesn't leak sensitive information

## Implementation Timeline
1. Backend changes (storage interface and API routes): 1-2 days
2. Frontend implementation: 2-3 days
3. Testing and fixes: 1 day

Total estimated time: 4-6 days