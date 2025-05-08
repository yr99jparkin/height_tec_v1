/**
 * This script is used to test the notification cleanup functions.
 * It creates some test tokens and snoozes, then runs the cleanup functions.
 * Run with: npx tsx server/scripts/test-cleanup.ts
 */

import { storage } from '../storage';
import { log } from '../logger';
import { randomUUID } from 'crypto';

async function setupTestData() {
  // Get a device ID for testing
  const devices = await storage.getDevicesByUserId(1);
  if (devices.length === 0) {
    log('No devices found for user 1, cannot run test', 'cleanup-test');
    return false;
  }
  
  const deviceId = devices[0].deviceId;
  log(`Using device ${deviceId} for cleanup test`, 'cleanup-test');
  
  // Get notification contacts for the device
  const contacts = await storage.getNotificationContactsByDeviceId(deviceId);
  if (contacts.length === 0) {
    log('No notification contacts found for device, cannot run test', 'cleanup-test');
    return false;
  }
  
  const contactId = contacts[0].id;
  log(`Using notification contact ${contactId} for cleanup test`, 'cleanup-test');
  
  // Create an expired token (1 hour ago)
  const expiredToken = await storage.createNotificationToken(
    deviceId,
    contactId,
    'test_expired'
  );
  
  // Update the token to make it expired
  const expiredDate = new Date();
  expiredDate.setHours(expiredDate.getHours() - 1);
  
  await db.update(notificationTokens)
    .set({ expiresAt: expiredDate })
    .where(eq(notificationTokens.id, expiredToken.id));
  
  log('Created expired token', 'cleanup-test');
  
  // Create a used token
  const usedToken = await storage.createNotificationToken(
    deviceId,
    contactId,
    'test_used'
  );
  
  // Mark it as used
  await storage.markTokenAsUsed(usedToken.id);
  log('Created used token', 'cleanup-test');
  
  // Create an active token (should not be deleted)
  await storage.createNotificationToken(
    deviceId,
    contactId,
    'test_active'
  );
  log('Created active token', 'cleanup-test');
  
  // Create an expired snooze
  const expiredSnoozeDate = new Date();
  expiredSnoozeDate.setHours(expiredSnoozeDate.getHours() - 1);
  
  await storage.createNotificationSnooze({
    deviceId,
    notificationContactId: contactId,
    snoozedUntil: expiredSnoozeDate
  });
  log('Created expired snooze', 'cleanup-test');
  
  // Create an active snooze (should not be deleted)
  const activeSnoozeDate = new Date();
  activeSnoozeDate.setHours(activeSnoozeDate.getHours() + 1);
  
  await storage.createNotificationSnooze({
    deviceId,
    notificationContactId: contactId,
    snoozedUntil: activeSnoozeDate
  });
  log('Created active snooze', 'cleanup-test');
  
  return true;
}

async function runTest() {
  log('Starting cleanup test', 'cleanup-test');
  
  const success = await setupTestData();
  if (!success) {
    return;
  }
  
  // Count before cleanup
  log('Running token cleanup...', 'cleanup-test');
  const deletedTokensCount = await storage.deleteExpiredAndUsedTokens();
  log(`Deleted ${deletedTokensCount} tokens`, 'cleanup-test');
  
  log('Running snooze cleanup...', 'cleanup-test');
  const deletedSnoozesCount = await storage.deleteExpiredSnoozes();
  log(`Deleted ${deletedSnoozesCount} snoozes`, 'cleanup-test');
  
  log('Cleanup test completed', 'cleanup-test');
}

// Run the test
runTest().catch(error => {
  log(`Error in cleanup test: ${error}`, 'cleanup-test');
});