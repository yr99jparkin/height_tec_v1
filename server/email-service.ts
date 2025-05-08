import * as postmark from "postmark";
const { ServerClient } = postmark;
import { v4 as uuidv4 } from "uuid";
import { log } from "./vite";
import { storage } from "./storage";
import { Device, NotificationContact } from "@shared/schema";
import { NotificationTokenInfo } from "@shared/types";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@heighttec.app";
const NOTIFICATION_COOLDOWN_MINUTES = 15; // 15 minutes between notifications for the same device

export class EmailService {
  private client: ServerClient;

  constructor() {
    if (!process.env.POSTMARK_API_KEY) {
      log("Warning: Postmark API key not set. Email notifications will not be sent.", "email");
    }
    this.client = new ServerClient(process.env.POSTMARK_API_KEY || "");
  }

  /**
   * Sends an alert email for a device that has exceeded a wind speed threshold
   */
  async sendAlertEmail(params: {
    device: Device;
    contact: NotificationContact;
    windSpeed: number;
    alertLevel: "amber" | "red";
    timestamp: Date;
    tokens: {
      acknowledge: NotificationTokenInfo;
      snooze1h: NotificationTokenInfo;
      snoozeToday: NotificationTokenInfo;
    };
  }): Promise<boolean> {
    const { device, contact, windSpeed, alertLevel, timestamp, tokens } = params;

    // Generate links with tokens
    const acknowledgeUrl = `${BASE_URL}/alert/acknowledge/${tokens.acknowledge.id}`;
    const snooze1hUrl = `${BASE_URL}/alert/acknowledge/${tokens.snooze1h.id}?action=snooze_1h`;
    const snoozeTodayUrl = `${BASE_URL}/alert/acknowledge/${tokens.snoozeToday.id}?action=snooze_today`;

    // Format date for display
    const formattedDate = timestamp.toLocaleString();

    // Set email subject based on alert level
    const subject = `${alertLevel.toUpperCase()} ALERT: High Wind Speed Detected at ${device.deviceName}`;

    const locationText = device.location ? `${device.location}` : "Unknown Location";

    // Create HTML email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${alertLevel === 'red' ? '#FF4444' : '#FFAA00'}; padding: 15px; color: white; text-align: center;">
          <h1 style="margin: 0;">${alertLevel.toUpperCase()} ALERT: High Wind Speed</h1>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
          <p>A high wind speed alert has been triggered:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Device:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${device.deviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${locationText}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Wind Speed:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${windSpeed.toFixed(1)} m/s</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Alert Level:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${alertLevel.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Time:</strong></td>
              <td style="padding: 8px;">${formattedDate}</td>
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
      // Check if Postmark API key is set
      if (!process.env.POSTMARK_API_KEY) {
        log("Cannot send email: Postmark API key not set", "email");
        return false;
      }

      // Send the email via Postmark
      const response = await this.client.sendEmail({
        From: EMAIL_FROM,
        To: contact.email,
        Subject: subject,
        HtmlBody: htmlContent,
        MessageStream: "outbound"
      });

      log(`Alert email sent to ${contact.email} for device ${device.deviceName}`, "email");
      return true;
    } catch (error) {
      log(`Error sending alert email: ${error}`, "email");
      return false;
    }
  }

  /**
   * Checks if a notification should be sent based on cooldown period and snooze settings
   */
  async shouldSendNotification(deviceId: string, notificationContactId: number, currentAlertLevel: "amber" | "red"): Promise<boolean> {
    // Check if contact has an active snooze
    const activeSnooze = await storage.getActiveSnoozeByDeviceAndContact(deviceId, notificationContactId);
    if (activeSnooze) {
      log(`Notification skipped due to active snooze until ${activeSnooze.snoozedUntil.toLocaleString()} for contact ${notificationContactId}`, "email");
      return false;
    }

    // Check cooldown period
    const now = new Date();
    const cooldownThreshold = new Date(now.getTime() - NOTIFICATION_COOLDOWN_MINUTES * 60 * 1000);
    
    // Get latest notification for this device and contact
    const latestNotification = await storage.getLatestNotificationByDeviceAndContact(deviceId, notificationContactId);
    
    if (!latestNotification) {
      // No previous notification, should send
      return true;
    }
    
    // If latest notification is within cooldown period
    if (latestNotification.sentAt > cooldownThreshold) {
      // But allow if current alert is red and previous was amber
      if (currentAlertLevel === "red" && latestNotification.alertLevel === "amber") {
        log(`Override cooldown: Red alert overrides amber cooldown for device ${deviceId}`, "email");
        return true;
      }
      
      log(`Notification skipped due to cooldown period (last sent: ${latestNotification.sentAt.toLocaleString()})`, "email");
      return false;
    }
    
    return true;
  }

  /**
   * Creates unique tokens for the notification acknowledgment actions
   */
  async createNotificationTokens(deviceId: string, notificationContactId: number): Promise<{
    acknowledge: NotificationTokenInfo;
    snooze1h: NotificationTokenInfo;
    snoozeToday: NotificationTokenInfo;
  }> {
    const createToken = async (action: "acknowledge" | "snooze_1h" | "snooze_today"): Promise<NotificationTokenInfo> => {
      // Create the token and get the generated UUID
      const token = await storage.createNotificationToken(deviceId, notificationContactId, action);
      
      return {
        id: token.id,
        deviceId,
        notificationContactId,
        action,
        expiresAt: token.expiresAt.toISOString()
      };
    };
    
    return {
      acknowledge: await createToken("acknowledge"),
      snooze1h: await createToken("snooze_1h"),
      snoozeToday: await createToken("snooze_today")
    };
  }

  /**
   * Processes a wind alert and sends emails to all notification contacts if needed
   */
  async processWindAlert(params: {
    deviceId: string;
    windSpeed: number;
    alertLevel: "amber" | "red";
    timestamp: Date;
  }): Promise<void> {
    const { deviceId, windSpeed, alertLevel, timestamp } = params;
    
    try {
      // Get device details
      const device = await storage.getDeviceByDeviceId(deviceId);
      if (!device) {
        log(`Cannot send alert: Device ${deviceId} not found`, "email");
        return;
      }
      
      // Get notification contacts for this device
      const contacts = await storage.getNotificationContactsByDeviceId(deviceId);
      if (contacts.length === 0) {
        log(`No notification contacts configured for device ${deviceId}`, "email");
        return;
      }
      
      // Process each contact
      for (const contact of contacts) {
        // Check if we should send a notification based on cooldown and snooze settings
        const shouldSend = await this.shouldSendNotification(deviceId, contact.id, alertLevel);
        if (!shouldSend) {
          continue;
        }
        
        // Create tokens for the notification actions
        const tokens = await this.createNotificationTokens(deviceId, contact.id);
        
        // Send the alert email
        const emailSent = await this.sendAlertEmail({
          device,
          contact,
          windSpeed,
          alertLevel,
          timestamp,
          tokens
        });
        
        if (emailSent) {
          // Record the notification in history
          await storage.createNotificationHistory({
            deviceId,
            notificationContactId: contact.id,
            alertLevel,
            windSpeed,
            sentAt: new Date(),
            acknowledged: false
          });
          
          log(`Alert notification sent for device ${deviceId} to ${contact.email}`, "email");
        }
      }
    } catch (error) {
      log(`Error processing wind alert: ${error}`, "email");
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();