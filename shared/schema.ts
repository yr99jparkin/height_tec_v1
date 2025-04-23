import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, foreignKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
}));

// Devices table
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  deviceName: text("device_name").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  active: boolean("active").default(true).notNull(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  windData: many(windData),
  windAlertThresholds: one(windAlertThresholds),
}));

// Device Stock table
export const deviceStock = pgTable("device_stock", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  status: text("status").notNull().default("Available"), // Available or Allocated
  lastAllocatedTo: text("last_allocated_to").default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deviceStockRelations = relations(deviceStock, ({ one }) => ({
  device: one(devices, {
    fields: [deviceStock.deviceId],
    references: [devices.deviceId],
  }),
}));

// Wind Alert Thresholds table
export const windAlertThresholds = pgTable("wind_alert_thresholds", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique().references(() => devices.deviceId),
  amberThreshold: doublePrecision("amber_threshold").notNull().default(20.0),
  redThreshold: doublePrecision("red_threshold").notNull().default(30.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const windAlertThresholdsRelations = relations(windAlertThresholds, ({ one }) => ({
  device: one(devices, {
    fields: [windAlertThresholds.deviceId],
    references: [devices.deviceId],
  }),
}));

// Wind Data table
export const windData = pgTable("wind_data", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  timestamp: timestamp("timestamp").notNull(),
  windSpeed: doublePrecision("wind_speed").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  alertState: boolean("alert_state").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const windDataRelations = relations(windData, ({ one }) => ({
  device: one(devices, {
    fields: [windData.deviceId],
    references: [devices.deviceId],
  }),
}));

// Insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  deviceId: true,
  deviceName: true,
  userId: true,
  location: true,
  latitude: true,
  longitude: true,
  active: true,
});

export const insertDeviceStockSchema = createInsertSchema(deviceStock).pick({
  deviceId: true,
  status: true,
  lastAllocatedTo: true,
});

export const insertWindAlertThresholdsSchema = createInsertSchema(windAlertThresholds).pick({
  deviceId: true,
  amberThreshold: true,
  redThreshold: true,
});

export const insertWindDataSchema = createInsertSchema(windData).pick({
  deviceId: true,
  timestamp: true,
  windSpeed: true,
  latitude: true,
  longitude: true,
  alertState: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

export type DeviceStock = typeof deviceStock.$inferSelect;
export type InsertDeviceStock = z.infer<typeof insertDeviceStockSchema>;

export type WindAlertThreshold = typeof windAlertThresholds.$inferSelect;
export type InsertWindAlertThreshold = z.infer<typeof insertWindAlertThresholdsSchema>;

export type WindData = typeof windData.$inferSelect;
export type InsertWindData = z.infer<typeof insertWindDataSchema>;
