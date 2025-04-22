import { users, devices, deviceStock, windAlertThresholds, windData } from "@shared/schema";
import type { User, InsertUser, Device, InsertDevice, DeviceStock, InsertDeviceStock, 
  WindAlertThreshold, InsertWindAlertThreshold, WindData, InsertWindData } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, lte, gte, sql, max, avg, inArray } from "drizzle-orm";
import { WindStatsResponse, DeviceWithLatestData } from "@shared/types";
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

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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
    await db.delete(windData).where(eq(windData.deviceId, device.deviceId));
    await db.delete(devices).where(eq(devices.id, id));
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
      avgWindSpeed: stats?.avgWindSpeed || 0,
      maxWindSpeed: stats?.maxWindSpeed || 0,
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

    return result.rows as DeviceWithLatestData[];
  }
}

export const storage = new DatabaseStorage();