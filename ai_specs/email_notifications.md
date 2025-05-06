# Email Notification System Plan

## High Level Objective

Implement an automated email notification system that alerts users when a wind speed threshold (amber or red) is breached for a device. The system will:
- Send notifications to contacts listed in the notification_contacts table for the affected device
- Enforce a 15-minute cooldown period between alerts to prevent notification spam
- Allow users to acknowledge alerts and optionally snooze further notifications
- Provide a secure one-time-use token for acknowledgment actions

## Type Changes

### Add to shared/types.ts:

```typescript
// Email notification types
export interface EmailNotificationRequest {
  deviceId: string;
  windSpeed: number;
  alertLevel: "amber" | "red";
  timestamp: string;
  notificationContactId: number;
}

export interface NotificationToken {
  id: string;
  deviceId: string;
  notificationContactId: number;
  action: "acknowledge" | "snooze_1h" | "snooze_today";
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface NotificationAcknowledgement {
  tokenId: string;
  action: "acknowledge" | "snooze_1h" | "snooze_today";
}

export interface NotificationSnoozeStatus {
  deviceId: string;
  notificationContactId: number;
  snoozedUntil: string;
  createdAt: string;
}
```

### Add to shared/schema.ts:

```typescript
// Notification tokens table for one-time use tokens
export const notificationTokens = pgTable("notification_tokens", {
  id: text("id").primaryKey(), // UUID
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  action: text("action").notNull(), // "acknowledge", "snooze_1h", "snooze_today"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
});

// Notification history table
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  alertLevel: text("alert_level").notNull(), // "amber" or "red"
  windSpeed: doublePrecision("wind_speed").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedAction: text("acknowledged_action"), // "acknowledge", "snooze_1h", "snooze_today"
});

// Notification snooze table
export const notificationSnooze = pgTable("notification_snooze", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.deviceId),
  notificationContactId: integer("notification_contact_id").notNull().references(() => notificationContacts.id),
  snoozedUntil: timestamp("snoozed_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add relations
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

export const notificationSnoozeRelations = relations(notificationSnooze, ({ one }) => ({
  device: one(devices, {
    fields: [notificationSnooze.deviceId],
    references: [devices.deviceId],
  }),
  notificationContact: one(notificationContacts, {
    fields: [notificationSnooze.notificationContactId],
    references: [notificationContacts.id],
  }),
}));
```

## Method Changes

### 1. Update server/udp-listener.ts:

Integrate email notification triggering into the listener when alerts are triggered by modifying the message handler:

```typescript
// After calculating alert state and inserting wind data
if ((amberAlert || redAlert) && device.active) {
  // Check if device has notification contacts
  const contacts = await storage.getNotificationContactsByDeviceId(data.deviceId);
  
  if (contacts.length > 0) {
    // Determine alert level for notification
    const alertLevel = redAlert ? "red" : "amber";
    
    // Trigger notification service
    await notificationService.processAlertNotification({
      deviceId: data.deviceId,
      windSpeed: data.windSpeed,
      alertLevel,
      timestamp: data.timestamp,
      contacts
    });
  }
}
```

### 2. Create server/notification-service.ts:

Create a new service to handle notifications:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { subMinutes, addMinutes, addHours, endOfDay } from 'date-fns';
import { db } from './db';
import { storage } from './storage';
import { devices, notificationHistory, notificationSnooze, notificationTokens } from '@shared/schema';
import { NotificationContact } from '@shared/schema';
import { emailService } from './email-service';
import { log } from './vite';

class NotificationService {
  // Process an alert notification
  async processAlertNotification({
    deviceId,
    windSpeed,
    alertLevel,
    timestamp,
    contacts
  }: {
    deviceId: string;
    windSpeed: number;
    alertLevel: 'amber' | 'red';
    timestamp: string;
    contacts: NotificationContact[];
  }) {
    try {
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device || !device.active) {
        return;
      }

      // Get device details for the notification
      const deviceName = device.deviceName;
      const location = device.location || 'Unknown location';
      
      // Process each contact
      for (const contact of contacts) {
        // Skip if this contact is snoozed
        const isSnoozeActive = await this.isContactSnoozed(deviceId, contact.id);
        if (isSnoozeActive) {
          log(`Notification skipped for device ${deviceId}, contact ${contact.id} due to active snooze`, 'notification');
          continue;
        }
        
        // Check cooldown period (15 minutes)
        // For red alerts, we need to check if there's been a red alert in the last 15 min
        // For amber alerts, check if any alert (amber or red) in the last 15 min
        const canSendNotification = await this.checkNotificationCooldown(
          deviceId, 
          contact.id, 
          alertLevel
        );
        
        if (!canSendNotification) {
          log(`Notification skipped for device ${deviceId}, contact ${contact.id} due to cooldown period`, 'notification');
          continue;
        }
        
        // Generate tokens for acknowledgment actions
        const acknowledgeToken = await this.createNotificationToken(deviceId, contact.id, 'acknowledge');
        const snooze1hToken = await this.createNotificationToken(deviceId, contact.id, 'snooze_1h');
        const snooze24hToken = await this.createNotificationToken(deviceId, contact.id, 'snooze_today');
        
        // Send email notification
        await emailService.sendAlertEmail({
          to: contact.email,
          deviceName,
          location,
          windSpeed,
          alertLevel,
          timestamp,
          acknowledgeToken,
          snooze1hToken,
          snooze24hToken
        });
        
        // Record notification in history
        await db.insert(notificationHistory).values({
          deviceId,
          notificationContactId: contact.id,
          alertLevel,
          windSpeed,
          sentAt: new Date(),
          acknowledged: false
        });
        
        log(`Alert notification sent for device ${deviceId} to ${contact.email}`, 'notification');
      }
    } catch (error) {
      log(`Error processing alert notification: ${error}`, 'notification');
    }
  }
  
  // Create a one-time token for notification acknowledgment
  async createNotificationToken(deviceId: string, notificationContactId: number, action: 'acknowledge' | 'snooze_1h' | 'snooze_today'): Promise<string> {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    
    await db.insert(notificationTokens).values({
      id: tokenId,
      deviceId,
      notificationContactId,
      action,
      expiresAt,
      used: false
    });
    
    return tokenId;
  }
  
  // Check if notification is within cooldown period
  async checkNotificationCooldown(
    deviceId: string, 
    notificationContactId: number,
    currentAlertLevel: 'amber' | 'red'
  ): Promise<boolean> {
    // Check if notification was sent in the last 15 minutes
    const cooldownTime = subMinutes(new Date(), 15);
    
    let query = db.select()
      .from(notificationHistory)
      .where(
        sql`device_id = ${deviceId} AND 
        notification_contact_id = ${notificationContactId} AND
        sent_at > ${cooldownTime}`
      );
    
    // For amber alerts, check any recent alert
    // For red alerts, only check recent red alerts (red alerts override amber cooldown)
    if (currentAlertLevel === 'red') {
      query = query.where(sql`alert_level = 'red'`);
    }
    
    const recentNotifications = await query.limit(1);
    
    return recentNotifications.length === 0;
  }
  
  // Check if contact has an active snooze
  async isContactSnoozed(deviceId: string, notificationContactId: number): Promise<boolean> {
    const now = new Date();
    
    const activeSnooze = await db.select()
      .from(notificationSnooze)
      .where(sql`
        device_id = ${deviceId} AND 
        notification_contact_id = ${notificationContactId} AND
        snoozed_until > ${now}
      `)
      .limit(1);
    
    return activeSnooze.length > 0;
  }
  
  // Process acknowledgment
  async processAcknowledgment(tokenId: string, action: 'acknowledge' | 'snooze_1h' | 'snooze_today'): Promise<{
    success: boolean;
    deviceName?: string;
    snoozedUntil?: Date;
    error?: string;
  }> {
    try {
      // Get and validate token
      const token = await db.select()
        .from(notificationTokens)
        .where(sql`id = ${tokenId} AND used = false AND expires_at > ${new Date()}`)
        .limit(1);
      
      if (token.length === 0) {
        return { success: false, error: 'Invalid or expired token' };
      }
      
      const { deviceId, notificationContactId } = token[0];
      
      // Mark token as used
      await db.update(notificationTokens)
        .set({ used: true })
        .where(sql`id = ${tokenId}`);
      
      // Get device info for response
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        return { success: false, error: 'Device not found' };
      }
      
      // Update notification history
      await db.update(notificationHistory)
        .set({
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedAction: action
        })
        .where(sql`
          device_id = ${deviceId} AND 
          notification_contact_id = ${notificationContactId} AND
          acknowledged = false
        `);
      
      // Process snooze if requested
      let snoozedUntil: Date | undefined;
      
      if (action === 'snooze_1h' || action === 'snooze_today') {
        // Calculate snooze end time
        snoozedUntil = action === 'snooze_1h' 
          ? addHours(new Date(), 1)
          : endOfDay(new Date());
        
        // Create or update snooze
        await db.insert(notificationSnooze)
          .values({
            deviceId,
            notificationContactId,
            snoozedUntil,
            createdAt: new Date()
          })
          .onConflictDoUpdate({
            target: [notificationSnooze.deviceId, notificationSnooze.notificationContactId],
            set: { snoozedUntil }
          });
      }
      
      return {
        success: true,
        deviceName: device.deviceName,
        snoozedUntil
      };
    } catch (error) {
      log(`Error processing acknowledgment: ${error}`, 'notification');
      return { success: false, error: 'Failed to process acknowledgment' };
    }
  }
}

export const notificationService = new NotificationService();
```

### 3. Create server/email-service.ts:

```typescript
import { createTransport } from 'nodemailer';
import { log } from './vite';

class EmailService {
  private transporter: any;
  
  constructor() {
    // Initialize email service based on env vars
    this.transporter = createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Send alert email
  async sendAlertEmail({
    to,
    deviceName,
    location,
    windSpeed,
    alertLevel,
    timestamp,
    acknowledgeToken,
    snooze1hToken,
    snooze24hToken
  }: {
    to: string;
    deviceName: string;
    location: string;
    windSpeed: number;
    alertLevel: 'amber' | 'red';
    timestamp: string;
    acknowledgeToken: string;
    snooze1hToken: string;
    snooze24hToken: string;
  }) {
    const appBaseUrl = process.env.APP_BASE_URL || 'https://www.heighttec.app';
    const date = new Date(timestamp).toLocaleString();
    
    const acknowledgeUrl = `${appBaseUrl}/acknowledge/${acknowledgeToken}`;
    const snooze1hUrl = `${appBaseUrl}/acknowledge/${snooze1hToken}?action=snooze_1h`;
    const snoozeTodayUrl = `${appBaseUrl}/acknowledge/${snooze24hToken}?action=snooze_today`;
    
    const subject = `${alertLevel.toUpperCase()} ALERT: High Wind Speed Detected at ${deviceName}`;
    
    // Construct email HTML body
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${alertLevel === 'red' ? '#FF4444' : '#FFAA00'}; padding: 15px; color: white; text-align: center;">
          <h1 style="margin: 0;">${alertLevel.toUpperCase()} ALERT: High Wind Speed</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
          <p>A high wind speed alert has been triggered:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Device:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${deviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Wind Speed:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${windSpeed} km/h</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Alert Level:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${alertLevel.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Time:</strong></td>
              <td style="padding: 8px;">${date}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${acknowledgeUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 4px;">
              Acknowledge
            </a>
            
            <a href="${snooze1hUrl}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 4px;">
              Acknowledge & Snooze 1h
            </a>
            
            <a href="${snoozeTodayUrl}" style="background-color: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 4px;">
              Acknowledge & Snooze Today
            </a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #777;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
    
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@heighttec.app',
        to,
        subject,
        html
      });
      
      log(`Alert email sent to ${to} for device ${deviceName}`, 'email');
      return true;
    } catch (error) {
      log(`Error sending alert email: ${error}`, 'email');
      return false;
    }
  }
}

export const emailService = new EmailService();
```

### 4. Add to server/routes.ts:

Add routes for acknowledgment handling:

```typescript
// Two-step acknowledgment process

// Step 1: Confirmation page
app.get("/acknowledge/:tokenId", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const action = req.query.action as string || 'acknowledge';
    
    if (!['acknowledge', 'snooze_1h', 'snooze_today'].includes(action)) {
      return res.status(400).render('acknowledge-error', { 
        error: 'Invalid action',
        appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
      });
    }
    
    // Validate token exists and is valid without marking as used yet
    const token = await db.select()
      .from(notificationTokens)
      .where(sql`id = ${tokenId} AND used = false AND expires_at > ${new Date()}`)
      .limit(1);
    
    if (token.length === 0) {
      return res.status(400).render('acknowledge-error', { 
        error: 'Invalid or expired token',
        appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
      });
    }
    
    // Get device info for confirmation
    const { deviceId } = token[0];
    const device = await storage.getDeviceByDeviceId(deviceId);
    
    if (!device) {
      return res.status(400).render('acknowledge-error', { 
        error: 'Device not found',
        appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
      });
    }
    
    // Render confirmation page
    res.render('acknowledge-confirm', {
      tokenId,
      action,
      deviceName: device.deviceName,
      actionText: action === 'acknowledge' 
        ? 'Acknowledge' 
        : action === 'snooze_1h' 
          ? 'Acknowledge & Snooze for 1 Hour' 
          : 'Acknowledge & Snooze for the rest of today',
      appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
    });
  } catch (error) {
    res.status(500).render('acknowledge-error', { 
      error: 'An error occurred. Please try again.',
      appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
    });
  }
});

// Step 2: Process acknowledgment
app.post("/acknowledge/:tokenId", async (req, res) => {
  try {
    const tokenId = req.params.tokenId;
    const action = req.body.action || 'acknowledge';
    
    if (!['acknowledge', 'snooze_1h', 'snooze_today'].includes(action)) {
      return res.status(400).render('acknowledge-error', { 
        error: 'Invalid action',
        appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
      });
    }
    
    const result = await notificationService.processAcknowledgment(tokenId, action as any);
    
    if (!result.success) {
      return res.status(400).render('acknowledge-error', { 
        error: result.error || 'Invalid or expired token',
        appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
      });
    }
    
    // Format snooze time if applicable
    let snoozeMessage = '';
    if (result.snoozedUntil) {
      const time = result.snoozedUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      snoozeMessage = `Notifications snoozed until ${time}`;
    }
    
    res.render('acknowledge-success', { 
      deviceName: result.deviceName,
      action,
      snoozeMessage,
      appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
    });
  } catch (error) {
    res.status(500).render('acknowledge-error', { 
      error: 'An error occurred. Please try again.',
      appBaseUrl: process.env.APP_BASE_URL || 'https://www.heighttec.app'
    });
  }
});

// API endpoint for acknowledge (for programmatic use)
app.post("/api/acknowledge", async (req, res) => {
  try {
    const { tokenId, action } = req.body;
    
    if (!tokenId || !action) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }
    
    if (!['acknowledge', 'snooze_1h', 'snooze_today'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    const result = await notificationService.processAcknowledgment(tokenId, action as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing acknowledgment' });
  }
});
```

### 5. Update storage.ts:

Add methods for notification management:

```typescript
// Get recent notifications for a device
async getRecentNotifications(deviceId: string, limit = 50) {
  return await db.select({
    id: notificationHistory.id,
    notificationContactId: notificationHistory.notificationContactId,
    contactEmail: notificationContacts.email,
    contactPhone: notificationContacts.phoneNumber,
    alertLevel: notificationHistory.alertLevel,
    windSpeed: notificationHistory.windSpeed,
    sentAt: notificationHistory.sentAt,
    acknowledged: notificationHistory.acknowledged,
    acknowledgedAt: notificationHistory.acknowledgedAt,
    acknowledgedAction: notificationHistory.acknowledgedAction
  })
  .from(notificationHistory)
  .innerJoin(notificationContacts, eq(notificationHistory.notificationContactId, notificationContacts.id))
  .where(eq(notificationHistory.deviceId, deviceId))
  .orderBy(desc(notificationHistory.sentAt))
  .limit(limit);
}

// Get active snoozes for a device
async getActiveSnoozes(deviceId: string) {
  const now = new Date();
  
  return await db.select({
    id: notificationSnooze.id,
    notificationContactId: notificationSnooze.notificationContactId,
    contactEmail: notificationContacts.email,
    contactPhone: notificationContacts.phoneNumber,
    snoozedUntil: notificationSnooze.snoozedUntil,
    createdAt: notificationSnooze.createdAt
  })
  .from(notificationSnooze)
  .innerJoin(notificationContacts, eq(notificationSnooze.notificationContactId, notificationContacts.id))
  .where(
    and(
      eq(notificationSnooze.deviceId, deviceId),
      gt(notificationSnooze.snoozedUntil, now)
    )
  );
}

// Remove active snooze
async removeSnooze(snoozeId: number) {
  return await db.delete(notificationSnooze)
    .where(eq(notificationSnooze.id, snoozeId));
}
```

## Test Changes

1. Create unit tests for the notification service:

```typescript
// tests/notification-service.test.ts
import { notificationService } from '../server/notification-service';
import { db } from '../server/db';
import { notificationHistory, notificationSnooze, notificationTokens } from '@shared/schema';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../server/db');
jest.mock('../server/storage');
jest.mock('../server/email-service', () => ({
  emailService: {
    sendAlertEmail: jest.fn().mockResolvedValue(true)
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkNotificationCooldown', () => {
    it('should return true if no recent notifications exist', async () => {
      // Mock db.select to return empty array
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      const result = await notificationService.checkNotificationCooldown('device-123', 1, 'amber');
      expect(result).toBe(true);
    });

    it('should return false if recent notifications exist', async () => {
      // Mock db.select to return notifications
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 1 }])
      });

      const result = await notificationService.checkNotificationCooldown('device-123', 1, 'amber');
      expect(result).toBe(false);
    });
    
    it('should only check red alerts when current alert is red', async () => {
      const mockWhere = jest.fn().mockReturnThis();
      
      // Mock db.select
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: mockWhere,
        limit: jest.fn().mockResolvedValue([])
      });

      await notificationService.checkNotificationCooldown('device-123', 1, 'red');
      
      // Check that the where was called with alert_level = 'red'
      expect(mockWhere).toHaveBeenCalledWith(expect.stringContaining('alert_level = \'red\''));
    });
  });

  // Add more tests for other notification service methods
});
```

2. Create integration tests:

```typescript
// tests/notification-integration.test.ts
import { setupTestDb } from './test-utils';
import { notificationService } from '../server/notification-service';
import { db } from '../server/db';
import { devices, notificationContacts, notificationHistory } from '@shared/schema';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';

describe('Notification Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    // Clear relevant tables
    await db.delete(notificationHistory);
  });

  it('should trigger notifications for alerts', async () => {
    // Set up test data
    const deviceId = 'test-device-1';
    const timestamp = new Date().toISOString();
    
    // Mock notification contacts
    const contacts = [
      { id: 1, deviceId, email: 'test1@example.com', phoneNumber: '1234567890' },
      { id: 2, deviceId, email: 'test2@example.com', phoneNumber: '0987654321' }
    ];

    // Test notification processing
    await notificationService.processAlertNotification({
      deviceId,
      windSpeed: 25.5,
      alertLevel: 'amber',
      timestamp,
      contacts
    });

    // Verify notifications were recorded
    const notifications = await db.select().from(notificationHistory);
    expect(notifications.length).toBe(2);
    expect(notifications[0].deviceId).toBe(deviceId);
    expect(notifications[0].alertLevel).toBe('amber');
  });
});
```

## Self Validation

Before deploying this feature, we should verify the following:

1. **Database Schema**:
   - Confirm all new tables have proper indexes for query performance
   - Ensure constraints are properly set up (foreign keys, unique constraints)
   - Verify migration scripts are reversible

2. **Email Delivery**:
   - Test email delivery with various email providers (Gmail, Outlook, etc.)
   - Check email rendering in different clients and devices
   - Verify SPF, DKIM, and DMARC settings to ensure deliverability

3. **Security**:
   - Validate token generation is cryptographically secure
   - Ensure tokens are properly expired after use
   - Check that acknowledgment endpoints are protected against enumeration attacks
   - Verify that sensitive data is not exposed in logs or error messages

4. **Performance**:
   - Measure impact on UDP listener processing time when notifications are triggered
   - Ensure notification sending is done asynchronously to not block data processing
   - Test system behavior under high alert volume conditions

5. **Monitoring and Logging**:
   - Add monitoring to track notification success and failure rates
   - Log appropriate information for debugging without exposing sensitive data
   - Create alerts for notification service failures

6. **User Experience**:
   - Test acknowledgment flow on various devices and browsers
   - Verify email format is responsive and readable on mobile
   - Ensure clear messaging when tokens expire or are invalid