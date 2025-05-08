import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
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
  project: text("project"),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  active: boolean("active").default(true).notNull(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// Notification Contacts table
export const notificationContacts = pgTable("notification_contacts", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  email: text("email").notNull(),
  phoneNumber: text("phone_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationContactsRelations = relations(notificationContacts, ({ one }) => ({
  device: one(devices, {
    fields: [notificationContacts.deviceId],
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

// Wind Data table - short-term buffer that keeps the last 180 minutes of data
export const windData = pgTable("wind_data", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  timestamp: timestamp("timestamp").notNull(),
  windSpeed: doublePrecision("wind_speed").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  alertState: boolean("alert_state").default(false).notNull(),
  amberAlert: boolean("amber_alert").default(false).notNull(),
  redAlert: boolean("red_alert").default(false).notNull(),
  downtimeSeconds: doublePrecision("downtime_seconds").default(0),
  processed: boolean("processed").default(false).notNull(), // Flag to track which readings have been aggregated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const windDataRelations = relations(windData, ({ one }) => ({
  device: one(devices, {
    fields: [windData.deviceId],
    references: [devices.deviceId],
  }),
}));

// Wind Data Historical table - stores 10-minute aggregated data for long-term storage
export const windDataHistorical = pgTable("wind_data_historical", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  intervalStart: timestamp("interval_start").notNull(), // Start of the 10-minute interval
  intervalEnd: timestamp("interval_end").notNull(),     // End of the 10-minute interval
  avgWindSpeed: doublePrecision("avg_wind_speed").notNull(),
  maxWindSpeed: doublePrecision("max_wind_speed").notNull(),
  stdDeviation: doublePrecision("std_deviation"), // Standard deviation of wind speed
  alertTriggered: boolean("alert_triggered").default(false).notNull(),
  amberAlertTriggered: boolean("amber_alert_triggered").default(false).notNull(),
  redAlertTriggered: boolean("red_alert_triggered").default(false).notNull(),
  downtimeSeconds: doublePrecision("downtime_seconds").default(0),
  sampleCount: integer("sample_count").default(0).notNull(), // Number of data points in this interval
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const windDataHistoricalRelations = relations(windDataHistorical, ({ one }) => ({
  device: one(devices, {
    fields: [windDataHistorical.deviceId],
    references: [devices.deviceId],
  }),
}));

// Add device relations after all tables are defined
export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  windData: many(windData),
  windDataHistorical: many(windDataHistorical),
  windAlertThresholds: one(windAlertThresholds),
  notificationContacts: many(notificationContacts),
  notificationHistory: many(notificationHistory),
  notificationTokens: many(notificationTokens),
  notificationSnoozeStatus: many(notificationSnoozeStatus),
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
  project: true,
  location: true,
  latitude: true,
  longitude: true,
  active: true,
  lastSeen: true,
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
  amberAlert: true,
  redAlert: true,
  downtimeSeconds: true,
  processed: true,
});

export const insertWindDataHistoricalSchema = createInsertSchema(windDataHistorical).pick({
  deviceId: true,
  intervalStart: true,
  intervalEnd: true,
  avgWindSpeed: true,
  maxWindSpeed: true,
  stdDeviation: true,
  alertTriggered: true,
  amberAlertTriggered: true,
  redAlertTriggered: true,
  downtimeSeconds: true,
  sampleCount: true,
});

export const insertNotificationContactSchema = createInsertSchema(notificationContacts).pick({
  deviceId: true,
  email: true,
  phoneNumber: true,
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

export type WindDataHistorical = typeof windDataHistorical.$inferSelect;
export type InsertWindDataHistorical = z.infer<typeof insertWindDataHistoricalSchema>;

export type NotificationContact = typeof notificationContacts.$inferSelect;
export type InsertNotificationContact = z.infer<typeof insertNotificationContactSchema>;

// Notification History table
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  alertLevel: text("alert_level").notNull(), // "amber" or "red"
  windSpeed: doublePrecision("wind_speed").notNull(),
  sentAt: timestamp("sent_at").notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedAction: text("acknowledged_action"), // "acknowledge", "snooze_1h", "snooze_today"
});

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  device: one(devices, {
    fields: [notificationHistory.deviceId],
    references: [devices.deviceId],
  }),
  notificationContact: one(notificationContacts, {
    fields: [notificationHistory.notificationContactId],
    references: [notificationContacts.id],
  }),
}));

// Notification Tokens table
export const notificationTokens = pgTable("notification_tokens", {
  id: text("id").primaryKey(), // UUID
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  action: text("action").notNull(), // "acknowledge", "snooze_1h", "snooze_today"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

export const notificationTokensRelations = relations(notificationTokens, ({ one }) => ({
  device: one(devices, {
    fields: [notificationTokens.deviceId],
    references: [devices.deviceId],
  }),
  notificationContact: one(notificationContacts, {
    fields: [notificationTokens.notificationContactId],
    references: [notificationContacts.id],
  }),
}));

// Notification Snooze Status table
export const notificationSnoozeStatus = pgTable("notification_snooze_status", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  snoozedUntil: timestamp("snoozed_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Add a unique constraint to ensure only one active snooze per device+contact
    deviceContactIdx: uniqueIndex("notification_snooze_device_contact_idx")
      .on(table.deviceId, table.notificationContactId),
  };
});

export const notificationSnoozeStatusRelations = relations(notificationSnoozeStatus, ({ one }) => ({
  device: one(devices, {
    fields: [notificationSnoozeStatus.deviceId],
    references: [devices.deviceId],
  }),
  notificationContact: one(notificationContacts, {
    fields: [notificationSnoozeStatus.notificationContactId],
    references: [notificationContacts.id],
  }),
}));

// Insert schemas for notification-related tables
export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).pick({
  deviceId: true,
  notificationContactId: true,
  alertLevel: true,
  windSpeed: true,
  sentAt: true,
  acknowledged: true,
  acknowledgedAt: true,
  acknowledgedAction: true,
});

export const insertNotificationTokenSchema = createInsertSchema(notificationTokens).pick({
  id: true,
  deviceId: true,
  notificationContactId: true,
  action: true,
  expiresAt: true,
  used: true,
});

export const insertNotificationSnoozeStatusSchema = createInsertSchema(notificationSnoozeStatus).pick({
  deviceId: true,
  notificationContactId: true,
  snoozedUntil: true,
});

// Export types for the notification-related tables
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

export type NotificationToken = typeof notificationTokens.$inferSelect;
export type InsertNotificationToken = z.infer<typeof insertNotificationTokenSchema>;

export type NotificationSnoozeStatus = typeof notificationSnoozeStatus.$inferSelect;
export type InsertNotificationSnoozeStatus = z.infer<typeof insertNotificationSnoozeStatusSchema>;
