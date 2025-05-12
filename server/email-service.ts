import { ServerClient } from "postmark";
import { randomUUID } from "crypto";
import { log } from "./vite";
import { storage } from "./storage";
import { Device, NotificationContact } from "@shared/schema";
import { NotificationTokenInfo } from "@shared/types";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@heighttec.app";
const NOTIFICATION_COOLDOWN_MINUTES = 60; // 60 minutes (1 hour) between notifications for the same device

export class EmailService {
  private client: ServerClient;

  constructor() {
    if (!process.env.POSTMARK_API_KEY) {
      log("Warning: Postmark API key not set. Email notifications will not be sent.", "email");
    }
    this.client = new ServerClient(process.env.POSTMARK_API_KEY || "");
  }
  
  /**
   * Generates a sample email template for preview purposes using the actual email template
   * @returns HTML string of the email template
   */
  generateSampleEmailTemplate(): string {
    // Create sample data for the template to match what would be in a real alert
    const sampleDevice = {
      deviceId: "HT-ANEM-001",
      deviceName: "Sample Tower (HT-ANEM-001)",
      location: "Site 1 - North Tower",
    } as Device;
    
    const sampleParameters = {
      deviceName: sampleDevice.deviceName,
      locationText: sampleDevice.location || "Unknown Location",
      windSpeed: 42.0,
      alertLevel: "red" as "red" | "amber",
      formattedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      snooze3hUrl: "#sample-snooze-3h-link",
      snoozeTodayUrl: "#sample-snooze-today-link",
      unsubscribeUrl: "#sample-unsubscribe-link",
    };
    
    // Use the actual email template with sample data
    return this.generateEmailTemplate(sampleParameters);
  }
  
  /**
   * Shared method to generate the email HTML template
   * Used by both the sample template generator and the actual email sender
   */
  private generateEmailTemplate(params: {
    deviceName: string;
    locationText: string;
    windSpeed: number;
    alertLevel: "amber" | "red";
    formattedDate: string;
    snooze3hUrl: string;
    snoozeTodayUrl: string;
    unsubscribeUrl: string;
  }): string {
    const { deviceName, locationText, windSpeed, alertLevel, formattedDate, 
           snooze3hUrl, snoozeTodayUrl, unsubscribeUrl } = params;
    
    // This is the actual email template used for all wind notifications
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wind Speed Notification</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f0f0f0;">
  <!-- Main Container -->
  <div style="max-width: 600px; margin: 20px auto; background-color: #f0f0f0;">
    <!-- Logo Header -->
    <div style="text-align: center; padding: 20px 0;">
      <img src="${BASE_URL}/height-tec-logo.png" alt="Height-Tec Logo" style="height: 50px;">
    </div>
    
    <!-- Content Card -->
    <div style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
      <!-- Alert Header -->
      <div style="background-color: ${alertLevel === 'red' ? '#FF4444' : '#FFAA00'}; padding: 15px; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${alertLevel.toUpperCase()} ALERT: High Wind Speed</h1>
      </div>
      
      <!-- Alert Content -->
      <div style="padding: 25px;">
        <p style="margin-top: 0; margin-bottom: 20px; font-size: 16px;">A high wind speed alert has been triggered:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #eaeaea;">
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea; font-weight: 600;">Device:</td>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea;">${deviceName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea; font-weight: 600;">Location:</td>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea;">${locationText}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea; font-weight: 600;">Wind Speed:</td>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea;">${windSpeed.toFixed(1)} m/s</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea; font-weight: 600;">Alert Level:</td>
            <td style="padding: 12px; border-bottom: 1px solid #eaeaea;">${alertLevel.toUpperCase()}</td>
          </tr>
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px; font-weight: 600;">Time:</td>
            <td style="padding: 12px;">${formattedDate}</td>
          </tr>
        </table>
        
        <!-- Action Buttons -->
        <div style="text-align: center; margin-top: 30px;">
          <a href="${snooze3hUrl}" style="background-color: #0d6efd; background-image: linear-gradient(to bottom, #0d8ffd, #0d6efd); color: white; padding: 12px 24px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 6px; font-weight: 500; font-size: 14px; text-align: center;">
            Acknowledge & Snooze for 3 hours
          </a>
          
          <a href="${snoozeTodayUrl}" style="background-color: #0197c6; background-image: linear-gradient(to bottom, #0cacdd, #0197c6); color: white; padding: 12px 24px; text-decoration: none; margin: 5px; display: inline-block; border-radius: 6px; font-weight: 500; font-size: 14px; text-align: center;">
            Acknowledge & Snooze for the rest of the day
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px; background-color: #f9f9f9; border-top: 1px solid #eaeaea; text-align: center;">
        <p style="font-size: 14px; color: #555; margin-bottom: 15px;">
          <a href="${unsubscribeUrl}" style="color: #0d6efd; text-decoration: underline;">Click here to unsubscribe or manage your notification settings</a> for this device.
        </p>
        <p style="font-size: 12px; color: #888; margin: 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
      snooze3h: NotificationTokenInfo;
      snoozeToday: NotificationTokenInfo;
    };
  }): Promise<boolean> {
    const { device, contact, windSpeed, alertLevel, timestamp, tokens } = params;

    // Generate links with tokens
    const snooze3hUrl = `${BASE_URL}/alert/acknowledge/${tokens.snooze3h.id}?action=snooze_3h`;
    const snoozeTodayUrl = `${BASE_URL}/alert/acknowledge/${tokens.snoozeToday.id}?action=snooze_today`;

    // Format date for display with dd/mm/yyyy format
    const formattedDate = timestamp.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '');

    // Set email subject based on alert level
    const subject = `${alertLevel.toUpperCase()} ALERT: High Wind Speed Detected at ${device.deviceName}`;

    const locationText = device.location ? `${device.location}` : "Unknown Location";

    // Create unsubscribe link - direct to GET endpoint which handles unsubscribe and redirects to success page
    const unsubscribeUrl = `${BASE_URL}/api/alerts/unsubscribe/${contact.id}/${device.deviceId}`;
    
    // Create HTML email content using the shared template generator
    const htmlContent = this.generateEmailTemplate({
      deviceName: device.deviceName,
      locationText,
      windSpeed,
      alertLevel,
      formattedDate,
      snooze3hUrl,
      snoozeTodayUrl,
      unsubscribeUrl
    });

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
   * Checks if a notification should be sent based on cooldown period, snooze settings, and unacknowledged notification count
   */
  async shouldSendNotification(deviceId: string, notificationContactId: number, currentAlertLevel: "amber" | "red"): Promise<boolean> {
    // Check if contact has an active snooze
    const activeSnooze = await storage.getActiveSnoozeByDeviceAndContact(deviceId, notificationContactId);
    if (activeSnooze) {
      // Get latest notification for this device and contact to check its alert level
      const latestNotification = await storage.getLatestNotificationByDeviceAndContact(deviceId, notificationContactId);
      
      // Allow red alerts to override amber snoozes
      if (currentAlertLevel === "red" && latestNotification && latestNotification.alertLevel === "amber") {
        log(`Override snooze: Red alert overrides amber snooze for device ${deviceId}`, "email");
        return true;
      }
      
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
    
    // Check for maximum notification limit (3 unacknowledged notifications)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get recent unacknowledged notifications within the past 24 hours
    const recentUnacknowledgedCount = await storage.getRecentUnacknowledgedNotificationsCount(
      deviceId, 
      notificationContactId,
      dayAgo
    );
    
    // If 3 or more unacknowledged notifications, don't send another one
    if (recentUnacknowledgedCount >= 3) {
      log(`Notification skipped due to reaching maximum consecutive notifications (${recentUnacknowledgedCount}) for contact ${notificationContactId}`, "email");
      return false;
    }
    
    return true;
  }

  /**
   * Creates unique tokens for the notification acknowledgment actions
   */
  async createNotificationTokens(deviceId: string, notificationContactId: number): Promise<{
    snooze3h: NotificationTokenInfo;
    snoozeToday: NotificationTokenInfo;
  }> {
    const createToken = async (action: "snooze_3h" | "snooze_today"): Promise<NotificationTokenInfo> => {
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
      snooze3h: await createToken("snooze_3h"),
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
          tokens: {
            snooze3h: tokens.snooze3h,
            snoozeToday: tokens.snoozeToday
          }
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