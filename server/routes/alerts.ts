import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Simple logging function
function log(message: string, category: string = 'alerts') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${category}] ${message}`);
}

const router = Router();

// Base URL for redirects
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

// Schema for acknowledgment action
const acknowledgeSchema = z.object({
  action: z.enum(['snooze_3h', 'snooze_today']),
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
    if (action === 'snooze_3h' || action === 'snooze_today') {
      // Calculate snooze end time
      let snoozedUntil: Date;
      
      if (action === 'snooze_3h') {
        // Snooze for 3 hours from now
        snoozedUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
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
      message: `Alert acknowledged and snoozed successfully`
    });
  } catch (error) {
    log(`Error acknowledging alert: ${error}`, 'alerts');
    return res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe GET route (legacy) - redirects to the frontend unsubscribe page or handles direct unsubscribes
router.get('/unsubscribe/:contactId/:deviceId', async (req: Request, res: Response) => {
  try {
    const { contactId, deviceId } = req.params;
    const contactIdNum = parseInt(contactId, 10);
    
    if (isNaN(contactIdNum)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    // Verify the contact and device exist
    const contact = await storage.getNotificationContactsByDeviceId(deviceId)
      .then(contacts => contacts.find(c => c.id === contactIdNum));
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found for this device' });
    }
    
    // Check if this is an API request (not from a browser)
    const acceptHeader = req.headers.accept || '';
    const wantsJson = acceptHeader.includes('application/json');
    const isApiRequest = req.originalUrl?.includes('/api/') || req.path?.includes('/api/');
    
    // If client wants JSON and it's an API request, handle directly with a POST-like operation
    if (wantsJson && isApiRequest) {
      log(`Direct unsubscribe for API request: ${contactId}/${deviceId}`, 'alerts');
      
      // Delete the contact record
      await storage.deleteNotificationContact(contactIdNum);
      
      // Return success response
      return res.status(200).json({ 
        success: true, 
        message: 'Contact unsubscribed successfully' 
      });
    }
    
    // For browser requests, redirect to the frontend unsubscribe route
    const redirectUrl = `${BASE_URL}/alert/unsubscribe/${contactId}/${deviceId}?redirected=true`;
    log(`Redirecting to frontend: ${redirectUrl}`, 'alerts');
    
    // Add a custom header to track redirection
    res.setHeader('X-Redirected-From', 'server');
    res.redirect(redirectUrl);
    
    log(`Unsubscribe request initiated for contact ${contactId} (${contact.email}) from device ${deviceId}`, 'alerts');
  } catch (error) {
    log(`Error processing unsubscribe request: ${error}`, 'alerts');
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe POST route - handles actual unsubscribe actions
router.post('/unsubscribe/:contactId/:deviceId', async (req: Request, res: Response) => {
  try {
    const { contactId, deviceId } = req.params;
    const contactIdNum = parseInt(contactId, 10);
    
    if (isNaN(contactIdNum)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }
    
    // Verify the contact and device exist
    const contact = await storage.getNotificationContactsByDeviceId(deviceId)
      .then(contacts => contacts.find(c => c.id === contactIdNum));
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found for this device' });
    }
    
    // Delete the contact record
    await storage.deleteNotificationContact(contactIdNum);
    
    // Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Contact unsubscribed successfully' 
    });
    
    log(`Contact ${contactId} (${contact.email}) unsubscribed from device ${deviceId}`, 'alerts');
  } catch (error) {
    log(`Error processing unsubscribe action: ${error}`, 'alerts');
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

export default router;