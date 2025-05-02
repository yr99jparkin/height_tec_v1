import { storage } from "./storage";
import { log } from "./vite";

// Constants
const AGGREGATION_INTERVAL_MINUTES = 10; // Run aggregation every 10 minutes
const DATA_RETENTION_MINUTES = 180;      // Keep 3 hours of data in wind_data table

/**
 * Scheduled job to aggregate wind data and purge old records
 * This function:
 * 1. Aggregates wind_data records into 10-minute intervals in wind_data_historical
 * 2. Marks processed records in wind_data
 * 3. Purges old data (older than 180 minutes) from wind_data
 */
export async function runAggregationJob() {
  try {
    log("Starting wind data aggregation job", "aggregation");
    
    // Aggregate data
    await storage.aggregateWindData(AGGREGATION_INTERVAL_MINUTES);
    log(`Aggregated wind data into ${AGGREGATION_INTERVAL_MINUTES}-minute intervals`, "aggregation");
    
    // Purge old data
    await storage.purgeOldWindData(DATA_RETENTION_MINUTES);
    log(`Purged wind data older than ${DATA_RETENTION_MINUTES} minutes`, "aggregation");
    
    log("Wind data aggregation job completed successfully", "aggregation");
  } catch (error) {
    log(`Error in wind data aggregation job: ${error}`, "aggregation");
  }
}

/**
 * Setup scheduled aggregation job
 */
export function setupAggregationJob() {
  // Run aggregation job every 10 minutes
  // We offset by 5 minutes to avoid running at exactly :00, :10, etc.
  const INTERVAL_MS = AGGREGATION_INTERVAL_MINUTES * 60 * 1000;
  
  // Calculate initial delay to align with 10-minute boundaries (at :05, :15, :25, etc.)
  const now = new Date();
  const minutesIntoCurrentInterval = (now.getMinutes() % AGGREGATION_INTERVAL_MINUTES);
  const targetMinute = (minutesIntoCurrentInterval < 5) 
    ? 5 
    : (AGGREGATION_INTERVAL_MINUTES + 5 - minutesIntoCurrentInterval);
  
  const initialDelayMs = (targetMinute * 60 - now.getSeconds()) * 1000;
  
  log(`Scheduling first aggregation run in ${Math.round(initialDelayMs/1000/60)} minutes`, "aggregation");
  
  // Schedule first run
  setTimeout(() => {
    // Run the job
    runAggregationJob();
    
    // Then schedule it to run at regular intervals
    setInterval(runAggregationJob, INTERVAL_MS);
  }, initialDelayMs);
  
  log(`Wind data aggregation job scheduled to run every ${AGGREGATION_INTERVAL_MINUTES} minutes`, "aggregation");
}