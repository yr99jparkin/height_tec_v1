import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupUdpListener } from "./udp-listener";
import { eq } from "drizzle-orm";
import { AddDeviceRequest, ExportDataParams, UpdateThresholdsRequest } from "@shared/types";
import { z } from "zod";
import { format } from "date-fns";
import path from "path";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Create HTTP server for both Express and UDP listener
  const httpServer = createServer(app);
  
  // Setup UDP listener for device data
  setupUdpListener(httpServer);

  // API Routes
  // Get latest wind data for a specific device
  app.get("/api/wind/latest/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      const latestData = await storage.getLatestWindDataByDeviceId(deviceId);
      if (!latestData) {
        return res.status(404).json({ message: "No wind data found for device" });
      }

      res.json(latestData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching latest wind data" });
    }
  });

  // Get wind history for a specific device
  app.get("/api/wind/history/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const range = (req.query.range as string) || "1h";
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (range) {
        case "1h":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "24h":
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "custom":
          // Custom range needs start and end times
          const customStartStr = req.query.start as string;
          const customEndStr = req.query.end as string;
          
          if (!customStartStr || !customEndStr) {
            return res.status(400).json({ message: "Start and end dates required for custom range" });
          }
          
          startTime = new Date(customStartStr);
          const endTime = new Date(customEndStr);
          
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
          }
          
          const windData = await storage.getWindDataByDeviceIdAndRange(deviceId, startTime, endTime);
          return res.json(windData);
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000); // Default to 1h
      }

      const windData = await storage.getWindDataByDeviceIdAndRange(deviceId, startTime, now);
      res.json(windData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching wind data history" });
    }
  });

  // Get wind stats (average and max) for the last 10 minutes for a device
  app.get("/api/wind/stats/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      const stats = await storage.getWindStatsForDevice(deviceId, 10); // 10 minutes
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching wind stats" });
    }
  });

  // Get all devices for the logged-in user with latest data
  app.get("/api/devices", isAuthenticated, async (req, res) => {
    try {
      const devices = await storage.getDevicesByUserId(req.user.id);
      
      if (devices.length === 0) {
        return res.json([]);
      }
      
      const deviceIds = devices.map(device => device.deviceId);
      const devicesWithData = await storage.getDevicesWithLatestData(deviceIds);
      
      res.json(devicesWithData);
    } catch (error) {
      res.status(500).json({ message: "Error fetching devices" });
    }
  });

  // Get a specific device
  app.get("/api/devices/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Error fetching device" });
    }
  });

  // Add a new device
  app.post("/api/devices", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        deviceId: z.string().min(1),
        deviceName: z.string().min(1)
      });
      
      const data = schema.parse(req.body) as AddDeviceRequest;
      
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
        userId: req.user.id,
        active: true
      });
      
      // Create default thresholds
      await storage.createThresholds({
        deviceId: data.deviceId,
        avgWindSpeedThreshold: 20.0,
        maxWindSpeedThreshold: 30.0
      });
      
      // Update device stock status
      await storage.updateDeviceStockStatus(
        data.deviceId, 
        "Allocated", 
        req.user.username
      );
      
      res.status(201).json(newDevice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error adding device" });
    }
  });

  // Update device name
  app.patch("/api/devices/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const schema = z.object({
        deviceName: z.string().min(1).optional()
      });
      
      const data = schema.parse(req.body);
      
      if (!data.deviceName) {
        return res.status(400).json({ message: "No changes to make" });
      }
      
      const updatedDevice = await storage.updateDevice(device.id, {
        deviceName: data.deviceName
      });
      
      res.json(updatedDevice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating device" });
    }
  });

  // Remove a device
  app.delete("/api/devices/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Update device stock status to Available
      await storage.updateDeviceStockStatus(deviceId, "Available");
      
      // Delete the device
      await storage.deleteDevice(device.id);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error removing device" });
    }
  });

  // Get thresholds for a device
  app.get("/api/thresholds/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const thresholds = await storage.getThresholdsByDeviceId(deviceId);
      
      if (!thresholds) {
        return res.status(404).json({ message: "Thresholds not found" });
      }
      
      res.json(thresholds);
    } catch (error) {
      res.status(500).json({ message: "Error fetching thresholds" });
    }
  });

  // Update thresholds for a device
  app.patch("/api/thresholds/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const schema = z.object({
        avgWindSpeedThreshold: z.number().min(0),
        maxWindSpeedThreshold: z.number().min(0)
      });
      
      const data = schema.parse(req.body) as UpdateThresholdsRequest;
      
      // Ensure max threshold is greater than or equal to avg threshold
      if (data.maxWindSpeedThreshold < data.avgWindSpeedThreshold) {
        return res.status(400).json({ 
          message: "Maximum threshold must be greater than or equal to average threshold" 
        });
      }
      
      const updatedThresholds = await storage.updateThresholds(deviceId, data);
      
      res.json(updatedThresholds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating thresholds" });
    }
  });

  // Export wind data to CSV
  app.get("/api/export/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const startDate = req.query.start as string;
      const endDate = req.query.end as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const windData = await storage.getWindDataByDeviceIdAndRange(deviceId, start, end);
      
      if (windData.length === 0) {
        return res.status(404).json({ message: "No data found for the specified range" });
      }
      
      // Generate CSV content
      const headers = "Device ID,Timestamp,Wind Speed (km/h),Latitude,Longitude,Alert State\n";
      const rows = windData.map(data => {
        return `${data.deviceId},${data.timestamp},${data.windSpeed},${data.latitude || ''},${data.longitude || ''},${data.alertState}`;
      }).join("\n");
      
      const csv = headers + rows;
      
      // Set headers for file download
      const filename = `wind_data_${device.deviceName.replace(/\s+/g, '_')}_${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Error exporting data" });
    }
  });

  return httpServer;
}
