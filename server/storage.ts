import { users, devices, deviceStock, windAlertThresholds, windData, deviceDowntime } from "@shared/schema";
import type { User, InsertUser, Device, InsertDevice, DeviceStock, InsertDeviceStock, 
  WindAlertThreshold, InsertWindAlertThreshold, WindData, InsertWindData,
  DeviceDowntime, InsertDeviceDowntime } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, lte, gte, sql, max, avg, inArray, isNull, sum, count } from "drizzle-orm";
import { WindStatsResponse, DeviceWithLatestData, DeviceDowntimeStats, ProjectDowntimeStats, DowntimeResponse } from "@shared/types";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;

  // Device operations
  getDeviceById(id: number): Promise<Device | undefined>;
  getDeviceByDeviceId(deviceId: string): Promise<Device | undefined>;
  getDevicesByUserId(userId: number): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;

  // Device stock operations
  getDeviceStockByDeviceId(deviceId: string): Promise<DeviceStock | undefined>;
  updateDeviceStockStatus(deviceId: string, status: string, username?: string): Promise<void>;

  // Wind alert threshold operations
  getThresholdsByDeviceId(deviceId: string): Promise<WindAlertThreshold | undefined>;
  createThresholds(thresholds: InsertWindAlertThreshold): Promise<WindAlertThreshold>;
  updateThresholds(deviceId: string, thresholds: Partial<InsertWindAlertThreshold>): Promise<WindAlertThreshold>;

  // Wind data operations
  insertWindData(data: InsertWindData): Promise<WindData>;
  getLatestWindDataByDeviceId(deviceId: string): Promise<WindData | undefined>;
  getWindDataByDeviceIdAndRange(deviceId: string, startTime: Date, endTime: Date): Promise<WindData[]>;
  getWindStatsForDevice(deviceId: string, minutes: number): Promise<WindStatsResponse>;
  getDevicesWithLatestData(userDeviceIds: string[]): Promise<DeviceWithLatestData[]>;

  // Device downtime operations
  getActiveDowntimeByDeviceId(deviceId: string): Promise<DeviceDowntime | undefined>;
  startDeviceDowntime(deviceId: string, timestamp: Date): Promise<DeviceDowntime>;
  endDeviceDowntime(downtimeId: number, timestamp: Date): Promise<DeviceDowntime>;
  getDeviceDowntimePeriods(deviceId: string, startDate: Date, endDate: Date): Promise<DeviceDowntime[]>;
  getDowntimeStats(userId: number, startDate: Date, endDate: Date, deviceId?: string, project?: string): Promise<DowntimeResponse>;
  processDeviceRedAlertChange(deviceId: string, isRedAlert: boolean, timestamp: Date): Promise<void>;

  sessionStore: any; // Using 'any' for session store type
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using 'any' to fix the SessionStore type issue

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }
  
  // Helper function to format downtime duration
  private formatDowntimeDuration(seconds: number): string {
    if (seconds <= 0) return "0s";
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds -= days * 24 * 60 * 60;
    
    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * 60 * 60;
    
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${Math.floor(seconds)}s`);
    
    return parts.join(" ");
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId));
  }

  // Device operations
  async getDeviceById(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.deviceId, deviceId));
    return device;
  }

  async getDevicesByUserId(userId: number): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.userId, userId));
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<InsertDevice>): Promise<Device> {
    const [updatedDevice] = await db.update(devices)
      .set(device)
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<void> {
    const device = await this.getDeviceById(id);
    if (!device) return;

    try {
      // Start a transaction for safer deletion
      await db.transaction(async (tx) => {
        // Delete related data first due to foreign key constraints
        console.log(`Deleting wind alert thresholds for device ${device.deviceId}`);
        await tx.delete(windAlertThresholds).where(eq(windAlertThresholds.deviceId, device.deviceId));
        
        console.log(`Deleting wind data for device ${device.deviceId}`);
        await tx.delete(windData).where(eq(windData.deviceId, device.deviceId));
        
        console.log(`Deleting device downtime records for device ${device.deviceId}`);
        await tx.delete(deviceDowntime).where(eq(deviceDowntime.deviceId, device.deviceId));
        
        // Check for device stock records and delete them
        console.log(`Deleting device stock records for device ${device.deviceId}`);
        await tx.delete(deviceStock).where(eq(deviceStock.deviceId, device.deviceId));
        
        // Finally delete the device itself
        console.log(`Deleting device ${device.deviceId}`);
        await tx.delete(devices).where(eq(devices.id, id));
      });
    } catch (error) {
      console.error(`Error in deleteDevice transaction for device ${device.deviceId}:`, error);
      throw error; // Re-throw to be handled by the route
    }
  }

  // Device stock operations
  async getDeviceStockByDeviceId(deviceId: string): Promise<DeviceStock | undefined> {
    const [stock] = await db.select().from(deviceStock).where(eq(deviceStock.deviceId, deviceId));
    return stock;
  }

  async updateDeviceStockStatus(deviceId: string, status: string, username?: string): Promise<void> {
    const updateData: { status: string; lastAllocatedTo?: string } = { status };

    if (username) {
      updateData.lastAllocatedTo = username;
    }

    await db.update(deviceStock)
      .set(updateData)
      .where(eq(deviceStock.deviceId, deviceId));
  }

  // Wind alert threshold operations
  async getThresholdsByDeviceId(deviceId: string): Promise<WindAlertThreshold | undefined> {
    const [threshold] = await db.select().from(windAlertThresholds)
      .where(eq(windAlertThresholds.deviceId, deviceId));
    return threshold;
  }

  async createThresholds(thresholds: InsertWindAlertThreshold): Promise<WindAlertThreshold> {
    const [newThresholds] = await db.insert(windAlertThresholds)
      .values(thresholds)
      .returning();
    return newThresholds;
  }

  async updateThresholds(deviceId: string, thresholds: Partial<InsertWindAlertThreshold>): Promise<WindAlertThreshold> {
    // Create a new Date for updatedAt
    const updatedAt = new Date();

    const [updatedThresholds] = await db.update(windAlertThresholds)
      .set({
        ...thresholds,
        updatedAt
      })
      .where(eq(windAlertThresholds.deviceId, deviceId))
      .returning();
    return updatedThresholds;
  }

  // Wind data operations
  async insertWindData(data: InsertWindData): Promise<WindData> {
    const [newWindData] = await db.insert(windData).values(data).returning();
    return newWindData;
  }

  async getLatestWindDataByDeviceId(deviceId: string): Promise<WindData | undefined> {
    const [latestData] = await db.select().from(windData)
      .where(eq(windData.deviceId, deviceId))
      .orderBy(desc(windData.timestamp))
      .limit(1);
    return latestData;
  }

  async getWindDataByDeviceIdAndRange(deviceId: string, startTime: Date, endTime: Date): Promise<WindData[]> {
    return await db.select().from(windData)
      .where(
        and(
          eq(windData.deviceId, deviceId),
          gte(windData.timestamp, startTime),
          lte(windData.timestamp, endTime)
        )
      )
      .orderBy(windData.timestamp);
  }

  async getWindStatsForDevice(deviceId: string, minutes: number): Promise<WindStatsResponse> {
    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

    const [stats] = await db
      .select({
        avgWindSpeed: avg(windData.windSpeed).as("avgWindSpeed"),
        maxWindSpeed: max(windData.windSpeed).as("maxWindSpeed"),
      })
      .from(windData)
      .where(
        and(
          eq(windData.deviceId, deviceId),
          gte(windData.timestamp, timeThreshold)
        )
      );

    // Get average wind speed from last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const [currentStats] = await db
      .select({
        currentWindSpeed: avg(windData.windSpeed).as("currentWindSpeed"),
      })
      .from(windData)
      .where(
        and(
          eq(windData.deviceId, deviceId),
          gte(windData.timestamp, thirtySecondsAgo)
        )
      );

    const [latestData] = await db
      .select()
      .from(windData)
      .where(
        and(
          eq(windData.deviceId, deviceId),
          gte(windData.timestamp, timeThreshold)
        )
      )
      .orderBy(desc(windData.timestamp))
      .limit(1);

    return {
      avgWindSpeed: stats?.avgWindSpeed !== null ? Number(stats.avgWindSpeed) : 0,
      maxWindSpeed: stats?.maxWindSpeed !== null ? Number(stats.maxWindSpeed) : 0,
      currentWindSpeed: currentStats?.currentWindSpeed !== null ? Number(currentStats.currentWindSpeed) : 0,
      alertState: latestData?.alertState || false,
      timestamp: latestData?.timestamp?.toISOString() || new Date().toISOString()
    };
  }

  async getDevicesWithLatestData(userDeviceIds: string[]): Promise<DeviceWithLatestData[]> {
    if (userDeviceIds.length === 0) return [];

    const result = await db.execute(sql`
      WITH latest_timestamps AS (
        SELECT 
          device_id, 
          MAX(timestamp) as latest_timestamp
        FROM wind_data
        WHERE device_id IN (${sql.join(userDeviceIds, sql`, `)})
        GROUP BY device_id
      ),
      latest_wind_data AS (
        SELECT 
          wd.*
        FROM wind_data wd
        JOIN latest_timestamps lt
          ON wd.device_id = lt.device_id AND wd.timestamp = lt.latest_timestamp
      ),
      avg_wind_speeds AS (
        SELECT 
          device_id,
          AVG(wind_speed) as avg_wind_speed,
          MAX(wind_speed) as max_wind_speed
        FROM wind_data
        WHERE 
          device_id IN (${sql.join(userDeviceIds, sql`, `)})
          AND timestamp > NOW() - INTERVAL '10 minutes'
        GROUP BY device_id
      )
      SELECT 
        d.id,
        d.device_id as "deviceId",
        d.device_name as "deviceName",
        d.project,
        d.location,
        d.latitude,
        d.longitude,
        d.active,
        d.last_seen as "lastSeen",
        COALESCE(aws.avg_wind_speed, 0) as "avgWindSpeed",
        COALESCE(aws.max_wind_speed, 0) as "maxWindSpeed",
        COALESCE(lwd.alert_state, false) as "alertState"
      FROM devices d
      LEFT JOIN latest_wind_data lwd ON d.device_id = lwd.device_id
      LEFT JOIN avg_wind_speeds aws ON d.device_id = aws.device_id
      WHERE d.device_id IN (${sql.join(userDeviceIds, sql`, `)})
    `);

    // Convert the raw data to the proper type
    return result.rows.map((row: any) => ({
      id: Number(row.id),
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      project: row.project,
      location: row.location,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      active: Boolean(row.active),
      lastSeen: row.lastSeen,
      avgWindSpeed: Number(row.avgWindSpeed || 0),
      maxWindSpeed: Number(row.maxWindSpeed || 0),
      alertState: Boolean(row.alertState)
    })) as DeviceWithLatestData[];
  }

  // ======== Device Downtime Operations ========

  async getActiveDowntimeByDeviceId(deviceId: string): Promise<DeviceDowntime | undefined> {
    // Get the active downtime record for a device (where endTime is null)
    const [activeDowntime] = await db.select().from(deviceDowntime)
      .where(
        and(
          eq(deviceDowntime.deviceId, deviceId),
          isNull(deviceDowntime.endTime)
        )
      );
    return activeDowntime;
  }

  async startDeviceDowntime(deviceId: string, timestamp: Date): Promise<DeviceDowntime> {
    // Check if there's already an active downtime period for this device
    const existingDowntime = await this.getActiveDowntimeByDeviceId(deviceId);
    if (existingDowntime) {
      return existingDowntime; // Already in downtime
    }

    // Get the device to get the project for denormalization
    const device = await this.getDeviceByDeviceId(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Create a new downtime period
    const [newDowntime] = await db.insert(deviceDowntime).values({
      deviceId,
      startTime: timestamp,
      project: device.project || null,
    }).returning();

    return newDowntime;
  }

  async endDeviceDowntime(downtimeId: number, timestamp: Date): Promise<DeviceDowntime> {
    // Get the downtime record
    const [downtimeRecord] = await db.select().from(deviceDowntime)
      .where(eq(deviceDowntime.id, downtimeId));

    if (!downtimeRecord) {
      throw new Error(`Downtime record not found: ${downtimeId}`);
    }

    if (downtimeRecord.endTime) {
      return downtimeRecord; // Already ended
    }

    // Calculate duration in seconds
    const startTime = downtimeRecord.startTime;
    const durationSeconds = Math.floor((timestamp.getTime() - startTime.getTime()) / 1000);

    // Update the downtime record
    const [updatedDowntime] = await db.update(deviceDowntime)
      .set({
        endTime: timestamp,
        durationSeconds: durationSeconds,
      })
      .where(eq(deviceDowntime.id, downtimeId))
      .returning();

    return updatedDowntime;
  }

  async getDeviceDowntimePeriods(deviceId: string, startDate: Date, endDate: Date): Promise<DeviceDowntime[]> {
    return await db.select().from(deviceDowntime)
      .where(
        and(
          eq(deviceDowntime.deviceId, deviceId),
          or(
            // Periods that start within our date range
            and(
              gte(deviceDowntime.startTime, startDate),
              lte(deviceDowntime.startTime, endDate)
            ),
            // Periods that end within our date range
            and(
              gte(deviceDowntime.endTime, startDate),
              lte(deviceDowntime.endTime, endDate)
            ),
            // Periods that span our entire date range
            and(
              lte(deviceDowntime.startTime, startDate),
              or(
                gte(deviceDowntime.endTime, endDate),
                isNull(deviceDowntime.endTime)
              )
            )
          )
        )
      )
      .orderBy(deviceDowntime.startTime);
  }

  async getDowntimeStats(userId: number, startDate: Date, endDate: Date, deviceId?: string, project?: string): Promise<DowntimeResponse> {
    // Get all devices for this user
    const userDevices = await this.getDevicesByUserId(userId);
    
    if (userDevices.length === 0) {
      return {
        devices: [],
        projects: [],
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    }

    let deviceIds = userDevices.map(d => d.deviceId);
    
    // Filter by device ID if specified
    if (deviceId) {
      deviceIds = deviceIds.filter(id => id === deviceId);
    }
    
    // Filter by project if specified
    if (project) {
      deviceIds = userDevices
        .filter(d => d.project === project)
        .map(d => d.deviceId);
    }

    if (deviceIds.length === 0) {
      return {
        devices: [],
        projects: [],
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    }

    // Get device downtime data using a simpler query to avoid operator ambiguity
    const devicesQuery = await db.execute(sql`
      WITH device_downtimes AS (
        SELECT 
          dd.device_id,
          d.device_name,
          COALESCE(SUM(
            CASE
              WHEN dd.duration_seconds IS NOT NULL THEN dd.duration_seconds
              WHEN dd.end_time IS NULL THEN 
                EXTRACT(EPOCH FROM (NOW() - dd.start_time))
              ELSE 0
            END
          ), 0) AS total_downtime_seconds
        FROM device_downtime dd
        JOIN devices d ON dd.device_id = d.device_id
        WHERE 
          dd.device_id IN (${sql.join(deviceIds, sql`, `)})
          AND (
            (dd.start_time BETWEEN ${startDate} AND ${endDate})
            OR (dd.end_time BETWEEN ${startDate} AND ${endDate})
            OR (dd.start_time <= ${startDate} AND (dd.end_time >= ${endDate} OR dd.end_time IS NULL))
          )
        GROUP BY dd.device_id, d.device_name
      )
      SELECT * FROM device_downtimes
      ORDER BY total_downtime_seconds DESC
    `);

    // Get project statistics with a simplified query
    const projectsQuery = await db.execute(sql`
      WITH project_devices AS (
        SELECT 
          d.project,
          COUNT(DISTINCT d.device_id) AS device_count
        FROM devices d
        WHERE d.device_id IN (${sql.join(deviceIds, sql`, `)})
          AND d.project IS NOT NULL
        GROUP BY d.project
      ),
      project_downtimes AS (
        SELECT 
          dd.project,
          COALESCE(SUM(
            CASE
              WHEN dd.duration_seconds IS NOT NULL THEN dd.duration_seconds
              WHEN dd.end_time IS NULL THEN 
                EXTRACT(EPOCH FROM (NOW() - dd.start_time))
              ELSE 0
            END
          ), 0) AS total_downtime_seconds
        FROM device_downtime dd
        WHERE 
          dd.device_id IN (${sql.join(deviceIds, sql`, `)})
          AND dd.project IS NOT NULL
          AND (
            (dd.start_time BETWEEN ${startDate} AND ${endDate})
            OR (dd.end_time BETWEEN ${startDate} AND ${endDate})
            OR (dd.start_time <= ${startDate} AND (dd.end_time >= ${endDate} OR dd.end_time IS NULL))
          )
        GROUP BY dd.project
      )
      SELECT 
        pd.project,
        pd.device_count,
        COALESCE(pdt.total_downtime_seconds, 0) AS total_downtime_seconds
      FROM project_devices pd
      LEFT JOIN project_downtimes pdt ON pd.project = pdt.project
      ORDER BY total_downtime_seconds DESC
    `);

    // Format the devices response
    const devices = devicesQuery.rows.map((row: any) => {
      const totalSeconds = parseInt(row.total_downtime_seconds, 10);
      return {
        deviceId: row.device_id,
        deviceName: row.device_name,
        total: totalSeconds,
        hours: parseFloat((totalSeconds / 3600).toFixed(2)),
        formatted: this.formatDowntimeDuration(totalSeconds)
      };
    });

    // Format the projects response
    const projects = projectsQuery.rows.map((row: any) => {
      const totalSeconds = parseInt(row.total_downtime_seconds, 10);
      return {
        project: row.project,
        deviceCount: parseInt(row.device_count, 10),
        total: totalSeconds,
        hours: parseFloat((totalSeconds / 3600).toFixed(2)),
        formatted: this.formatDowntimeDuration(totalSeconds)
      };
    });

    return {
      devices,
      projects,
      timeframe: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  }

  async processDeviceRedAlertChange(deviceId: string, isRedAlert: boolean, timestamp: Date): Promise<void> {
    // Check if there's an active downtime record
    const activeDowntime = await this.getActiveDowntimeByDeviceId(deviceId);

    if (isRedAlert) {
      // Device has entered red alert state - start downtime if not already active
      if (!activeDowntime) {
        await this.startDeviceDowntime(deviceId, timestamp);
      }
    } else {
      // Device has exited red alert state - end downtime if active
      if (activeDowntime) {
        await this.endDeviceDowntime(activeDowntime.id, timestamp);
      }
    }
  }
}

export const storage = new DatabaseStorage();