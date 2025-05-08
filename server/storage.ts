import { users, devices, deviceStock, windAlertThresholds, windData, windDataHistorical, 
  notificationContacts, notificationHistory, notificationTokens, notificationSnoozeStatus } from "@shared/schema";
import type { User, InsertUser, Device, InsertDevice, DeviceStock, InsertDeviceStock, 
  WindAlertThreshold, InsertWindAlertThreshold, WindData, InsertWindData, 
  WindDataHistorical, InsertWindDataHistorical,
  NotificationContact, InsertNotificationContact,
  NotificationHistory, InsertNotificationHistory,
  NotificationToken, InsertNotificationToken,
  NotificationSnoozeStatus, InsertNotificationSnoozeStatus } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, or, desc, lte, gte, lt, gt, sql, max, avg, inArray, sum } from "drizzle-orm";
import { WindStatsResponse, DeviceWithLatestData } from "@shared/types";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Define Store type from express-session
type SessionStore = session.Store;

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

  // Notification contacts operations
  getNotificationContactsByDeviceId(deviceId: string): Promise<NotificationContact[]>;
  createNotificationContact(contact: InsertNotificationContact): Promise<NotificationContact>;
  updateNotificationContact(id: number, contact: Partial<InsertNotificationContact>): Promise<NotificationContact>;
  deleteNotificationContact(id: number): Promise<void>;
  
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
  getTotalDowntimeForDevice(deviceId: string, startTime: Date, endTime: Date): Promise<number>;
  
  // Historical wind data operations
  insertWindDataHistorical(data: InsertWindDataHistorical): Promise<WindDataHistorical>;
  getHistoricalWindDataByDeviceIdAndRange(deviceId: string, startTime: Date, endTime: Date): Promise<WindDataHistorical[]>;
  getHistoricalWindStatsForDevice(deviceId: string, days: number): Promise<WindStatsResponse>;
  aggregateWindData(intervalMinutes: number): Promise<void>;
  purgeOldWindData(olderThanMinutes: number): Promise<void>;
  getLastProcessedInterval(): Promise<Date | null>;

  // Email notification operations
  createNotificationToken(deviceId: string, notificationContactId: number, action: string): Promise<NotificationToken>;
  getNotificationToken(tokenId: string): Promise<NotificationToken | undefined>;
  markTokenAsUsed(tokenId: string): Promise<void>;
  createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory>;
  getNotificationHistory(deviceId: string, notificationContactId: number, startTime: Date, endTime: Date): Promise<NotificationHistory[]>;
  updateNotificationAcknowledgement(notificationId: number, action: string): Promise<void>;
  getLatestNotificationByDeviceAndContact(deviceId: string, notificationContactId: number): Promise<NotificationHistory | undefined>;
  
  // Notification snooze operations
  createNotificationSnooze(snooze: InsertNotificationSnoozeStatus): Promise<NotificationSnoozeStatus>;
  getActiveSnoozeByDeviceAndContact(deviceId: string, notificationContactId: number): Promise<NotificationSnoozeStatus | undefined>;
  deleteExpiredSnoozes(): Promise<number>;
  
  // Cleanup operations
  deleteExpiredAndUsedTokens(): Promise<number>;
  archiveOldNotificationHistory?(days: number): Promise<number>; // Optional method for archiving old history

  sessionStore: SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
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

    // Delete related data first due to foreign key constraints
    await db.delete(windAlertThresholds).where(eq(windAlertThresholds.deviceId, device.deviceId));
    
    // Delete wind data from both tables
    await db.delete(windData).where(eq(windData.deviceId, device.deviceId));
    await db.delete(windDataHistorical).where(eq(windDataHistorical.deviceId, device.deviceId));
    
    // Delete notification contacts
    await db.delete(notificationContacts).where(eq(notificationContacts.deviceId, device.deviceId));
    
    // Finally delete the device
    await db.delete(devices).where(eq(devices.id, id));
  }
  
  // Notification contact operations
  async getNotificationContactsByDeviceId(deviceId: string): Promise<NotificationContact[]> {
    return await db.select().from(notificationContacts)
      .where(eq(notificationContacts.deviceId, deviceId));
  }

  async createNotificationContact(contact: InsertNotificationContact): Promise<NotificationContact> {
    const [newContact] = await db.insert(notificationContacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateNotificationContact(id: number, contact: Partial<InsertNotificationContact>): Promise<NotificationContact> {
    const [updatedContact] = await db.update(notificationContacts)
      .set(contact)
      .where(eq(notificationContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteNotificationContact(id: number): Promise<void> {
    await db.delete(notificationContacts)
      .where(eq(notificationContacts.id, id));
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
      avgWindSpeed: Number(stats?.avgWindSpeed || 0),
      maxWindSpeed: Number(stats?.maxWindSpeed || 0),
      currentWindSpeed: Number(currentStats?.currentWindSpeed || 0),
      alertState: latestData?.alertState || false,
      timestamp: latestData?.timestamp?.toISOString() || new Date().toISOString()
    };
  }

  async getTotalDowntimeForDevice(deviceId: string, startTime: Date, endTime: Date): Promise<number> {
    // For the reports page, use direct SQL to query the sum of downtime_seconds
    // This avoids any issues with TypeScript operators
    const result = await db.execute(
      sql`SELECT SUM(downtime_seconds) as total_downtime
          FROM wind_data_historical
          WHERE device_id = ${deviceId}
          AND interval_start >= ${startTime}
          AND interval_end <= ${endTime}`
    );
    
    // Get the value from the result
    const totalDowntime = result.rows[0]?.total_downtime;
    return Number(totalDowntime || 0);
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

    return result.rows as unknown as DeviceWithLatestData[];
  }

  // Historical wind data operations
  async insertWindDataHistorical(data: InsertWindDataHistorical): Promise<WindDataHistorical> {
    const [newWindDataHistorical] = await db.insert(windDataHistorical).values(data).returning();
    return newWindDataHistorical;
  }

  async getHistoricalWindDataByDeviceIdAndRange(deviceId: string, startTime: Date, endTime: Date): Promise<WindDataHistorical[]> {
    return await db.select().from(windDataHistorical)
      .where(
        and(
          eq(windDataHistorical.deviceId, deviceId),
          gte(windDataHistorical.intervalStart, startTime),
          lte(windDataHistorical.intervalEnd, endTime)
        )
      )
      .orderBy(windDataHistorical.intervalStart);
  }

  async getHistoricalWindStatsForDevice(deviceId: string, days: number): Promise<WindStatsResponse> {
    const timeThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // For historical data, we use the aggregated stats directly
    const [stats] = await db
      .select({
        avgWindSpeed: avg(windDataHistorical.avgWindSpeed).as("avgWindSpeed"),
        maxWindSpeed: max(windDataHistorical.maxWindSpeed).as("maxWindSpeed"),
      })
      .from(windDataHistorical)
      .where(
        and(
          eq(windDataHistorical.deviceId, deviceId),
          gte(windDataHistorical.intervalStart, timeThreshold)
        )
      );

    // Get the latest record to determine alert state
    const [latestData] = await db
      .select()
      .from(windDataHistorical)
      .where(eq(windDataHistorical.deviceId, deviceId))
      .orderBy(desc(windDataHistorical.intervalEnd))
      .limit(1);

    // For current wind speed, we always use the real-time data
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

    return {
      avgWindSpeed: Number(stats?.avgWindSpeed || 0),
      maxWindSpeed: Number(stats?.maxWindSpeed || 0),
      currentWindSpeed: Number(currentStats?.currentWindSpeed || 0),
      alertState: latestData?.alertTriggered || false,
      timestamp: latestData?.intervalEnd?.toISOString() || new Date().toISOString()
    };
  }

  async aggregateWindData(intervalMinutes: number): Promise<void> {
    // Get the last processed timestamp or default to 180 minutes ago
    const lastProcessed = await this.getLastProcessedInterval();
    const startTime = lastProcessed || new Date(Date.now() - 180 * 60 * 1000);
    
    // Determine the end time for this aggregation (current time minus 10 minutes to ensure complete data)
    const safeBuffer = 10; // minutes
    const endTime = new Date(Date.now() - safeBuffer * 60 * 1000);
    
    // Round the end time to the nearest intervalMinutes boundary
    const roundedEndTime = new Date(
      Math.floor(endTime.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000)
    );

    // Get all device IDs that have data in the time range
    const deviceIdsResult = await db
      .selectDistinct({ deviceId: windData.deviceId })
      .from(windData)
      .where(
        and(
          gte(windData.timestamp, startTime),
          lte(windData.timestamp, roundedEndTime),
          eq(windData.processed, false)
        )
      );

    const deviceIds = deviceIdsResult.map(row => row.deviceId);

    for (const deviceId of deviceIds) {
      // Process each interval within the time range
      let intervalStart = new Date(startTime);
      
      while (intervalStart < roundedEndTime) {
        const intervalEnd = new Date(intervalStart.getTime() + intervalMinutes * 60 * 1000);
        
        // Fetch data for this interval
        const intervalData = await db
          .select()
          .from(windData)
          .where(
            and(
              eq(windData.deviceId, deviceId),
              gte(windData.timestamp, intervalStart),
              lt(windData.timestamp, intervalEnd),
              eq(windData.processed, false)
            )
          );
        
        if (intervalData.length > 0) {
          // Calculate aggregated metrics
          const windSpeeds = intervalData.map(d => d.windSpeed);
          const avgWindSpeed = windSpeeds.reduce((sum, speed) => sum + speed, 0) / windSpeeds.length;
          const maxWindSpeed = Math.max(...windSpeeds);
          
          // Calculate standard deviation
          const variance = windSpeeds.reduce((sum, speed) => sum + Math.pow(speed - avgWindSpeed, 2), 0) / windSpeeds.length;
          const stdDeviation = Math.sqrt(variance);
          
          // Determine if alerts were triggered
          const alertTriggered = intervalData.some(d => d.alertState);
          const amberAlertTriggered = intervalData.some(d => d.amberAlert);
          const redAlertTriggered = intervalData.some(d => d.redAlert);
          
          // Calculate total downtime
          const downtimeSeconds = intervalData.reduce((sum, d) => sum + (d.downtimeSeconds || 0), 0);
          
          // Insert historical record
          await this.insertWindDataHistorical({
            deviceId,
            intervalStart,
            intervalEnd,
            avgWindSpeed,
            maxWindSpeed,
            stdDeviation,
            alertTriggered,
            amberAlertTriggered,
            redAlertTriggered,
            downtimeSeconds,
            sampleCount: intervalData.length
          });
          
          // Mark data as processed
          await db
            .update(windData)
            .set({ processed: true })
            .where(
              and(
                eq(windData.deviceId, deviceId),
                gte(windData.timestamp, intervalStart),
                lt(windData.timestamp, intervalEnd)
              )
            );
        }
        
        // Move to next interval
        intervalStart = intervalEnd;
      }
    }
  }

  async purgeOldWindData(olderThanMinutes: number): Promise<void> {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    // Ensure we only delete processed data
    await db
      .delete(windData)
      .where(
        and(
          lte(windData.timestamp, cutoffTime),
          eq(windData.processed, true)
        )
      );
  }

  async getLastProcessedInterval(): Promise<Date | null> {
    // Find the most recent interval end time in the historical data
    const [result] = await db
      .select({ maxIntervalEnd: max(windDataHistorical.intervalEnd) })
      .from(windDataHistorical);
    
    return result?.maxIntervalEnd || null;
  }

  // Email notification operations
  async createNotificationToken(deviceId: string, notificationContactId: number, action: string): Promise<NotificationToken> {
    // Generate a UUID for the token ID
    const id = require('uuid').v4();
    
    // Create a token that expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    const [token] = await db.insert(notificationTokens).values({
      id,
      deviceId,
      notificationContactId,
      action,
      expiresAt,
      used: false
    }).returning();
    
    return token;
  }
  
  async getNotificationToken(tokenId: string): Promise<NotificationToken | undefined> {
    const [token] = await db.select().from(notificationTokens)
      .where(eq(notificationTokens.id, tokenId));
    return token;
  }
  
  async markTokenAsUsed(tokenId: string): Promise<void> {
    await db.update(notificationTokens)
      .set({ used: true })
      .where(eq(notificationTokens.id, tokenId));
  }
  
  async createNotificationHistory(history: InsertNotificationHistory): Promise<NotificationHistory> {
    const [newHistory] = await db.insert(notificationHistory)
      .values(history)
      .returning();
    return newHistory;
  }
  
  async getNotificationHistory(
    deviceId: string,
    notificationContactId: number, 
    startTime: Date, 
    endTime: Date
  ): Promise<NotificationHistory[]> {
    return await db.select().from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.deviceId, deviceId),
          eq(notificationHistory.notificationContactId, notificationContactId),
          gte(notificationHistory.sentAt, startTime),
          lte(notificationHistory.sentAt, endTime)
        )
      )
      .orderBy(desc(notificationHistory.sentAt));
  }
  
  async updateNotificationAcknowledgement(notificationId: number, action: string): Promise<void> {
    await db.update(notificationHistory)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedAction: action
      })
      .where(eq(notificationHistory.id, notificationId));
  }
  
  async getLatestNotificationByDeviceAndContact(
    deviceId: string, 
    notificationContactId: number
  ): Promise<NotificationHistory | undefined> {
    const [notification] = await db.select().from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.deviceId, deviceId),
          eq(notificationHistory.notificationContactId, notificationContactId)
        )
      )
      .orderBy(desc(notificationHistory.sentAt))
      .limit(1);
    
    return notification;
  }
  
  // Notification snooze operations
  async createNotificationSnooze(snooze: InsertNotificationSnoozeStatus): Promise<NotificationSnoozeStatus> {
    const [newSnooze] = await db.insert(notificationSnoozeStatus)
      .values(snooze)
      .returning();
    return newSnooze;
  }
  
  async getActiveSnoozeByDeviceAndContact(
    deviceId: string, 
    notificationContactId: number
  ): Promise<NotificationSnoozeStatus | undefined> {
    // Only get active snoozes (snoozedUntil > current time)
    const now = new Date();
    
    const [snooze] = await db.select().from(notificationSnoozeStatus)
      .where(
        and(
          eq(notificationSnoozeStatus.deviceId, deviceId),
          eq(notificationSnoozeStatus.notificationContactId, notificationContactId),
          gt(notificationSnoozeStatus.snoozedUntil, now)
        )
      )
      .orderBy(desc(notificationSnoozeStatus.createdAt))
      .limit(1);
    
    return snooze;
  }
  
  async deleteExpiredSnoozes(): Promise<number> {
    // Delete all snoozes that have expired
    const now = new Date();
    
    const result = await db.delete(notificationSnoozeStatus)
      .where(lt(notificationSnoozeStatus.snoozedUntil, now))
      .returning();
    
    return result.length;
  }
  
  async deleteExpiredAndUsedTokens(): Promise<number> {
    // Delete tokens that are:
    // 1. Already used (used = true)
    // 2. Expired (expiresAt < current time)
    const now = new Date();
    
    const result = await db.delete(notificationTokens)
      .where(
        or(
          eq(notificationTokens.used, true),
          lt(notificationTokens.expiresAt, now)
        )
      )
      .returning();
    
    return result.length;
  }
  
  async archiveOldNotificationHistory(days: number): Promise<number> {
    // Optional method to archive notification history older than X days
    // In a real production system, we might move this to an archive table
    // For now, we'll just return a count of records that would be archived
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const oldRecords = await db.select({ count: sql<number>`count(*)` })
      .from(notificationHistory)
      .where(lt(notificationHistory.sentAt, cutoffDate));
    
    return oldRecords[0]?.count || 0;
  }
}

export const storage = new DatabaseStorage();