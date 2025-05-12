import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { setupUdpListener } from "./udp-listener";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { devices, notificationContacts, windDataHistorical, users, insertUserSchema } from "@shared/schema";
import { AddDeviceRequest, ExportDataParams, NotificationContactRequest, UpdateDeviceRequest, UpdateThresholdsRequest } from "@shared/types";
import { z } from "zod";
import { format } from "date-fns";
import path from "path";
import alertsRouter from "./routes/alerts";
import { runSimulation } from "./scripts/run-simulation";
import { emailService } from "./email-service";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Access denied: Admin privileges required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Create HTTP server for both Express and UDP listener
  const httpServer = createServer(app);
  
  // Setup UDP listener for device data
  setupUdpListener(httpServer);

  // Register alert routes - these don't require authentication for token verification
  app.use('/api/alerts', alertsRouter);
  
  // Also register alerts router at a client-accessible path matching the client-side routes
  app.use('/alert', alertsRouter);
  
  // Development endpoint to test direct simulation
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/dev/test-simulate", isAuthenticated, async (req, res) => {
      try {
        // Extract simulation parameters with stronger typing
        const { 
          deviceId, 
          windSpeed: windSpeedRaw, 
          count: countRaw,
          delayMs: delayMsRaw,
          gpsCoordinates 
        } = req.body;
        
        // Parse numeric values
        const windSpeed = windSpeedRaw ? parseInt(windSpeedRaw) : undefined;
        const count = countRaw ? parseInt(countRaw) : undefined;
        const delayMs = delayMsRaw ? parseInt(delayMsRaw) : undefined;
        
        // Check if device exists and belongs to user
        if (deviceId) {
          const device = await storage.getDeviceByDeviceId(deviceId);
          if (!device || device.userId !== req.user.id) {
            return res.status(404).json({ message: "Device not found or you don't have permission to access it" });
          }
        }
        
        // Run simulation with direct function call injection
        const result = await runSimulation({
          deviceId,
          windSpeed,
          count,
          delayMs,
          gpsCoordinates
        });
        
        res.json(result);
      } catch (error) {
        console.error("[dev] Error testing simulation:", error);
        res.status(500).json({ 
          message: "Error testing simulation",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
  
  // Admin Routes
  
  // Email Templates - Get sample email template
  app.get("/api/admin/email-template", isAdmin, async (req, res) => {
    try {
      // Use the email service to generate a sample template
      const emailTemplate = emailService.generateSampleEmailTemplate();
      res.json({ template: emailTemplate });
    } catch (error) {
      console.error("[admin] Error generating email template:", error);
      res.status(500).json({ 
        message: "Error generating email template",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User Management - Get all users
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      // For security, don't return password hashes
      const usersWithoutPasswords = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("[admin] Error fetching users:", error);
      res.status(500).json({ 
        message: "Error fetching users",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User Management - Create user
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      // Validate request body
      const createUserSchema = insertUserSchema.extend({
        password: z.string().min(8, "Password must be at least 8 characters")
      });
      
      const validatedData = createUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create the user with the hashed password
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      // Return the user without the password hash
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("[admin] Error creating user:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Error creating user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User Management - Update user
  app.put("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate that the user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate request body
      const updateUserSchema = insertUserSchema
        .omit({ password: true })
        .partial();
      
      const validatedData = updateUserSchema.parse(req.body);
      
      // Check username uniqueness if it's being changed
      if (validatedData.username && validatedData.username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(validatedData.username);
        if (userWithSameUsername) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      // Return the user without the password hash
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("[admin] Error updating user:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Error updating user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User Management - Reset user password
  app.put("/api/admin/users/:userId/reset-password", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate that the user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate request body
      const resetPasswordSchema = z.object({
        password: z.string().min(8, "Password must be at least 8 characters")
      });
      
      const { password } = resetPasswordSchema.parse(req.body);
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update the password
      await storage.updateUserPassword(userId, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("[admin] Error resetting password:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Error resetting password",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // User Management - Delete user
  app.delete("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate that the user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if trying to delete self
      if (req.user && userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // Delete the user
      await storage.deleteUser(userId);
      
      res.status(204).send();
    } catch (error) {
      console.error("[admin] Error deleting user:", error);
      res.status(500).json({ 
        message: "Error deleting user",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Data Simulation
  app.post("/api/admin/simulate-data", isAdmin, async (req, res) => {
    try {
      // Extract simulation parameters with stronger typing
      const { 
        deviceId, 
        windSpeed: windSpeedRaw, 
        count: countRaw,
        delayMs: delayMsRaw,
        gpsCoordinates 
      } = req.body;
      
      // Parse numeric values
      const windSpeed = windSpeedRaw ? parseInt(windSpeedRaw) : undefined;
      const count = countRaw ? parseInt(countRaw) : undefined;
      const delayMs = delayMsRaw ? parseInt(delayMsRaw) : undefined;
      
      // Run simulation with direct function call injection
      const result = await runSimulation({
        deviceId,
        windSpeed,
        count,
        delayMs,
        gpsCoordinates
      });
      
      // Ensure we send the count properly to the client
      res.json({
        ...result,
        count: count || 5 // Use the requested count or default to 5
      });
    } catch (error) {
      console.error("[admin] Error running simulation:", error);
      res.status(500).json({ 
        message: "Error running simulation",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

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
        case "15m":
          startTime = new Date(now.getTime() - 15 * 60 * 1000);
          break;
        case "1h":
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "3h":
          startTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
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
  
  // Get historical wind data stats for a device
  app.get("/api/wind/historical/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const days = parseInt(req.query.days as string) || 7; // Default to 7 days
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      const stats = await storage.getHistoricalWindStatsForDevice(deviceId, days);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching historical wind stats" });
    }
  });
  
  // Get historical wind data for a specific time range
  app.get("/api/wind/historical/:deviceId/range", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      const data = await storage.getHistoricalWindDataByDeviceIdAndRange(deviceId, startDate, endDate);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Error fetching historical wind data" });
    }
  });
  
  // Get downtime information for a device
  app.get("/api/wind/downtime/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      console.log(`[downtime] Fetching downtime for ${deviceId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Check if device exists and belongs to user
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Let's skip the complex SQL debug for now to fix the error

      const downtimeSeconds = await storage.getTotalDowntimeForDevice(deviceId, startDate, endDate);
      console.log(`[downtime] Total downtime seconds: ${downtimeSeconds}`);
      
      // Convert seconds to hours and minutes
      const downtimeHours = Math.floor(downtimeSeconds / 3600);
      const downtimeMinutes = Math.floor((downtimeSeconds % 3600) / 60);
      
      res.json({
        deviceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        downtimeSeconds,
        downtimeHours,
        downtimeMinutes,
        formattedDowntime: `${downtimeHours}h ${downtimeMinutes}m`
      });
    } catch (error) {
      console.error(`[downtime] Error: ${error}`);
      res.status(500).json({ message: "Error fetching downtime data" });
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
        deviceName: z.string().min(1),
        project: z.string().optional()
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

  // Update device (name and project)
  app.patch("/api/devices/:deviceId", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const schema = z.object({
        deviceName: z.string().min(1).optional(),
        project: z.string().optional()
      });
      
      const data = schema.parse(req.body) as UpdateDeviceRequest;
      
      if (!data.deviceName && !data.project) {
        return res.status(400).json({ message: "No changes to make" });
      }
      
      const updatedDevice = await storage.updateDevice(device.id, {
        ...(data.deviceName && { deviceName: data.deviceName }),
        ...(data.project && { project: data.project })
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
        amberThreshold: z.number().min(0),
        redThreshold: z.number().min(0)
      });
      
      const data = schema.parse(req.body) as UpdateThresholdsRequest;
      
      // Ensure red threshold is greater than or equal to amber threshold
      if (data.redThreshold < data.amberThreshold) {
        return res.status(400).json({ 
          message: "Red threshold must be greater than or equal to amber threshold" 
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

  // Get notification contacts for a device
  app.get("/api/devices/:deviceId/contacts", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const contacts = await storage.getNotificationContactsByDeviceId(deviceId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching notification contacts" });
    }
  });
  
  // Get all user devices with their contacts
  app.get("/api/user/devices-with-contacts", isAuthenticated, async (req, res) => {
    try {
      const userDevices = await storage.getDevicesByUserId(req.user.id);
      
      if (userDevices.length === 0) {
        return res.json([]);
      }
      
      const devicesWithContacts = await Promise.all(
        userDevices.map(async device => {
          const contacts = await storage.getNotificationContactsByDeviceId(device.deviceId);
          return {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            contacts
          };
        })
      );
      
      res.json(devicesWithContacts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching devices with contacts" });
    }
  });
  
  // Add notification contact to a device
  app.post("/api/devices/:deviceId/contacts", isAuthenticated, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = await storage.getDeviceByDeviceId(deviceId);
      
      if (!device || device.userId !== req.user.id) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Check if maximum of 5 contacts already reached
      const existingContacts = await storage.getNotificationContactsByDeviceId(deviceId);
      if (existingContacts.length >= 5) {
        return res.status(400).json({ message: "Maximum of 5 notification contacts allowed per device" });
      }
      
      const schema = z.object({
        email: z.string().email(),
        phoneNumber: z.string().min(5)
      });
      
      const data = schema.parse(req.body) as NotificationContactRequest;
      
      const contact = await storage.createNotificationContact({
        deviceId,
        email: data.email,
        phoneNumber: data.phoneNumber
      });
      
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error adding notification contact" });
    }
  });
  
  // Update a notification contact
  app.patch("/api/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      // Get the contact and verify it belongs to user's device
      const contacts = await db.select()
        .from(notificationContacts)
        .innerJoin(devices, eq(notificationContacts.deviceId, devices.deviceId))
        .where(and(
          eq(notificationContacts.id, contactId),
          eq(devices.userId, req.user.id)
        ));
      
      if (contacts.length === 0) {
        return res.status(404).json({ message: "Notification contact not found" });
      }
      
      const schema = z.object({
        email: z.string().email().optional(),
        phoneNumber: z.string().min(5).optional()
      });
      
      const data = schema.parse(req.body);
      
      if (!data.email && !data.phoneNumber) {
        return res.status(400).json({ message: "No changes to make" });
      }
      
      const updatedContact = await storage.updateNotificationContact(contactId, {
        ...(data.email && { email: data.email }),
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber })
      });
      
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating notification contact" });
    }
  });
  
  // Delete a notification contact
  app.delete("/api/contacts/:contactId", isAuthenticated, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }
      
      // Get the contact and verify it belongs to user's device
      const contacts = await db.select()
        .from(notificationContacts)
        .innerJoin(devices, eq(notificationContacts.deviceId, devices.deviceId))
        .where(and(
          eq(notificationContacts.id, contactId),
          eq(devices.userId, req.user.id)
        ));
      
      if (contacts.length === 0) {
        return res.status(404).json({ message: "Notification contact not found" });
      }
      
      await storage.deleteNotificationContact(contactId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting notification contact" });
    }
  });
  
  // Get all unique projects for the current user
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userDevices = await storage.getDevicesByUserId(req.user.id);
      
      // Extract unique project names from devices
      const projects = [...new Set(
        userDevices
          .filter(device => device.project) // Filter out null/undefined projects
          .map(device => device.project)
      )];
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Error fetching projects" });
    }
  });



  return httpServer;
}
