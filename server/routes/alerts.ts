import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { log } from '../logger';
import { z } from 'zod';

const router = Router();

// Schema for acknowledgment action
const acknowledgeSchema = z.object({
  action: z.enum(['acknowledge', 'snooze_1h', 'snooze_today']),
});

// Get token details
router.get('/token/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    
    // Get token from database
    const token = await storage.getNotificationToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: 'Token not found or expired' });
    }
    
    // Check if token is already used
    if (token.used) {
      return res.status(400).json({ error: 'Token has already been used' });
    }
    
    // Check if token is expired
    if (new Date() > token.expiresAt) {
      return res.status(400).json({ error: 'Token has expired' });
    }
    
    // Get device details
    const device = await storage.getDeviceByDeviceId(token.deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Get latest notification history for this device and notification contact
    const notification = await storage.getLatestNotificationByDeviceAndContact(
      token.deviceId,
      token.notificationContactId
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Return token details along with device and alert info
    return res.json({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      location: device.location,
      tokenId: token.id,
      action: token.action,
      alertLevel: notification.alertLevel,
      windSpeed: notification.windSpeed,
      notificationContact: token.notificationContactId,
      notificationId: notification.id
    });
  } catch (error) {
    log(`Error getting token details: ${error}`, 'alerts');
    return res.status(500).json({ error: 'Server error' });
  }
});

// Acknowledge alert action
router.post('/acknowledge/:tokenId', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    
    // Validate request body
    const result = acknowledgeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const { action } = result.data;
    
    // Get token from database
    const token = await storage.getNotificationToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: 'Token not found or expired' });
    }
    
    // Check if token is already used
    if (token.used) {
      return res.status(400).json({ error: 'Token has already been used' });
    }
    
    // Check if token is expired
    if (new Date() > token.expiresAt) {
      return res.status(400).json({ error: 'Token has expired' });
    }
    
    // Mark token as used
    await storage.markTokenAsUsed(tokenId);
    
    // Get the latest notification for the device and contact
    const notification = await storage.getLatestNotificationByDeviceAndContact(
      token.deviceId,
      token.notificationContactId
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Update notification as acknowledged with the action taken
    await storage.updateNotificationAcknowledgement(notification.id, action);
    
    // If the action includes snoozing, create a snooze record
    if (action === 'snooze_1h' || action === 'snooze_today') {
      // Calculate snooze end time
      let snoozedUntil: Date;
      
      if (action === 'snooze_1h') {
        // Snooze for 1 hour from now
        snoozedUntil = new Date(Date.now() + 60 * 60 * 1000);
      } else {
        // Snooze until the end of the day (11:59:59 PM)
        const today = new Date();
        snoozedUntil = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23, 59, 59, 999
        );
      }
      
      // Create snooze record
      await storage.createNotificationSnooze({
        deviceId: token.deviceId,
        notificationContactId: token.notificationContactId,
        snoozedUntil
      });
      
      log(`Created snooze for device ${token.deviceId}, contact ${token.notificationContactId} until ${snoozedUntil}`, 'alerts');
    }
    
    // Return success response
    return res.json({
      success: true,
      action,
      message: `Alert ${action === 'acknowledge' ? 'acknowledged' : 'snoozed'} successfully`
    });
  } catch (error) {
    log(`Error acknowledging alert: ${error}`, 'alerts');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;