import { log } from './logger';
import { storage } from './storage';

/**
 * Cleans up notification-related tables:
 * 1. Deletes used and expired notification tokens
 * 2. Deletes expired notification snooze statuses
 * 3. Archives old notification history records (optional)
 */
export async function runCleanupJob() {
  try {
    log('Starting notification tables cleanup job', 'cleanup');
    
    // 1. Delete expired and used notification tokens
    const deletedTokensCount = await storage.deleteExpiredAndUsedTokens();
    log(`Deleted ${deletedTokensCount} expired/used notification tokens`, 'cleanup');
    
    // 2. Delete expired notification snooze statuses
    const deletedSnoozesCount = await storage.deleteExpiredSnoozes();
    log(`Deleted ${deletedSnoozesCount} expired notification snooze statuses`, 'cleanup');
    
    // 3. Archive old notification history (optional, if we want to keep history for a limited time)
    // This is commented out as we may want to keep the history for reporting/auditing
    // We can uncomment and implement if needed in the future
    /*
    const archivedCount = await storage.archiveOldNotificationHistory(30); // 30 days
    log(`Archived ${archivedCount} old notification history records`, 'cleanup');
    */
    
    log('Notification tables cleanup job completed successfully', 'cleanup');
  } catch (error) {
    log(`Error in notification tables cleanup job: ${error}`, 'cleanup');
  }
}

/**
 * Sets up a scheduled job to clean up notification tables
 * Default: runs every 6 hours
 */
export function setupCleanupJob() {
  // Schedule the first run in 30 minutes
  const initialDelay = 30 * 60 * 1000;
  
  // Schedule subsequent runs every 6 hours
  const interval = 6 * 60 * 60 * 1000;
  
  log(`Scheduling first notification tables cleanup in 30 minutes`, 'cleanup');
  
  setTimeout(() => {
    runCleanupJob();
    
    // Setup interval for regular runs
    setInterval(runCleanupJob, interval);
    log(`Notification tables cleanup job scheduled to run every 6 hours`, 'cleanup');
  }, initialDelay);
}