import { db } from "../db";
import { windDataHistorical } from "@shared/schema";
import { addHours, subMonths } from "date-fns";
import { randomBytes } from "crypto";

/**
 * Generate random wind speed that follows a realistic pattern:
 * - Daily fluctuations with higher speeds during mid-day
 * - Weekly patterns with slightly higher speeds on weekends
 * - Monthly variations with higher speeds during transition months (spring/fall)
 * - Random events for dramatic wind changes
 */
function generateWindSpeed(
  date: Date,
  baseSpeed: number = 15,
  amberThreshold: number = 20,
  redThreshold: number = 30
): {
  avgWindSpeed: number;
  maxWindSpeed: number;
  stdDeviation: number;
  alertTriggered: boolean;
  amberAlertTriggered: boolean;
  redAlertTriggered: boolean;
} {
  // Seasonal adjustment (higher in spring/fall)
  const month = date.getMonth();
  // Seasonal variation - higher in months 2-4 (spring) and 8-10 (fall)
  const seasonalVariation = 
    (month >= 2 && month <= 4) || (month >= 8 && month <= 10)
      ? 1.3
      : 1.0;
  
  // Time of day variation - higher during mid-day (hours 10-16)
  const hour = date.getHours();
  const timeOfDayVariation = 
    hour >= 10 && hour <= 16
      ? 1.2
      : (hour >= 0 && hour <= 5) || (hour >= 21 && hour <= 23)
        ? 0.7  // lower at night
        : 1.0;
  
  // Day of week variation - slightly higher on weekends
  const dayOfWeek = date.getDay();
  const dayOfWeekVariation = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0;
  
  // Random events - occasionally have storm-like conditions
  // Generate a number between 0 and 1
  const randomEvent = parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295;
  const stormEvent = randomEvent <= 0.05; // 5% chance of storm
  const stormMultiplier = stormEvent ? 1.5 + (randomEvent * 1.5) : 1.0;
  
  // Random variability (between 0.8 and 1.2)
  const randomVariation = 0.8 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.4;
  
  // Calculate average wind speed
  let avgWindSpeed = baseSpeed * seasonalVariation * timeOfDayVariation * 
                     dayOfWeekVariation * stormMultiplier * randomVariation;
  
  // Max wind speed is typically 20-50% higher than average
  const maxFactor = 1.2 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.3;
  const maxWindSpeed = avgWindSpeed * maxFactor;
  
  // Standard deviation is typically 10-30% of the average
  const stdFactor = 0.1 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.2;
  const stdDeviation = avgWindSpeed * stdFactor;
  
  // Determine if thresholds were exceeded
  const amberAlertTriggered = maxWindSpeed >= amberThreshold;
  const redAlertTriggered = maxWindSpeed >= redThreshold;
  const alertTriggered = amberAlertTriggered || redAlertTriggered;
  
  return {
    avgWindSpeed: parseFloat(avgWindSpeed.toFixed(2)),
    maxWindSpeed: parseFloat(maxWindSpeed.toFixed(2)),
    stdDeviation: parseFloat(stdDeviation.toFixed(2)),
    alertTriggered,
    amberAlertTriggered,
    redAlertTriggered
  };
}

/**
 * Generate downtime data with a realistic pattern
 * - Higher chance of downtime during alert states
 * - Occasional maintenance periods
 * - Random brief outages
 */
function generateDowntime(
  intervalDuration: number,
  alertTriggered: boolean,
  redAlertTriggered: boolean
): number {
  // Downtime in seconds
  let downtimeSeconds = 0;
  
  // Base probability of downtime (0.5%)
  const baseDowntimeProb = 0.005;
  
  // Increased probability during alerts (amber: 2%, red: 5%)
  const downtimeProbability = redAlertTriggered 
    ? 0.05 
    : (alertTriggered ? 0.02 : baseDowntimeProb);
  
  const random = parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295;
  
  if (random <= downtimeProbability) {
    // If downtime occurs, it's typically between 30 seconds and full interval
    // Higher probability of longer downtime during red alerts
    let downtimeFraction;
    
    if (redAlertTriggered) {
      // During red alerts, downtime tends to be longer (50-100% of interval)
      downtimeFraction = 0.5 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.5;
    } else if (alertTriggered) {
      // During amber alerts, moderate downtime (20-70% of interval)
      downtimeFraction = 0.2 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.5;
    } else {
      // During normal operation, brief downtime (5-30% of interval)
      downtimeFraction = 0.05 + (parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295) * 0.25;
    }
    
    downtimeSeconds = Math.round(intervalDuration * downtimeFraction);
  }
  
  // Occasional scheduled maintenance (about once every 2 weeks)
  // Each day has a 1/14 chance of maintenance
  const maintenanceRandom = parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295;
  if (maintenanceRandom <= 1/14) {
    // Maintenance typically lasts 30-120 minutes (1800-7200 seconds)
    const maintenanceDuration = 1800 + Math.round(parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295 * 5400);
    // But can't exceed the interval duration
    downtimeSeconds = Math.min(maintenanceDuration, intervalDuration);
  }
  
  return downtimeSeconds;
}

async function generateHistoricalData() {
  // Device configuration
  const deviceId = "HT-ANEM-002";
  const amberThreshold = 20;
  const redThreshold = 30;
  
  // Time settings
  const endDate = new Date();
  const startDate = subMonths(endDate, 3);
  const intervalHours = 1; // 1-hour intervals
  const intervalDuration = intervalHours * 60 * 60; // in seconds
  
  console.log(`Generating 3 months of data for ${deviceId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // Generate data for each interval
  let currentDate = new Date(startDate);
  let count = 0;
  const batchSize = 100;
  let batch = [];
  
  while (currentDate < endDate) {
    const intervalStart = new Date(currentDate);
    const intervalEnd = addHours(intervalStart, intervalHours);
    
    // Generate wind metrics
    const windMetrics = generateWindSpeed(
      currentDate,
      15, // base speed
      amberThreshold,
      redThreshold
    );
    
    // Generate sample count (typically 6-12 samples per hour)
    const sampleCount = 6 + Math.floor(parseFloat(randomBytes(4).readUInt32LE(0).toString()) / 4294967295 * 6);
    
    // Generate downtime
    const downtimeSeconds = generateDowntime(
      intervalDuration,
      windMetrics.alertTriggered,
      windMetrics.redAlertTriggered
    );
    
    // Create historical data record
    const historicalData = {
      deviceId,
      intervalStart,
      intervalEnd,
      avgWindSpeed: windMetrics.avgWindSpeed,
      maxWindSpeed: windMetrics.maxWindSpeed,
      stdDeviation: windMetrics.stdDeviation,
      alertTriggered: windMetrics.alertTriggered,
      amberAlertTriggered: windMetrics.amberAlertTriggered,
      redAlertTriggered: windMetrics.redAlertTriggered,
      downtimeSeconds,
      sampleCount
    };
    
    batch.push(historicalData);
    count++;
    
    // Insert in batches for better performance
    if (batch.length >= batchSize) {
      await db.insert(windDataHistorical).values(batch);
      console.log(`Inserted ${batch.length} records (total: ${count})`);
      batch = [];
    }
    
    currentDate = intervalEnd;
  }
  
  // Insert any remaining records
  if (batch.length > 0) {
    await db.insert(windDataHistorical).values(batch);
    console.log(`Inserted ${batch.length} records (total: ${count})`);
  }
  
  console.log(`Data generation complete: ${count} records created`);
}

// Execute the generator function
generateHistoricalData()
  .then(() => {
    console.log("Successfully generated historical data for HT-ANEM-002");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error generating data:", error);
    process.exit(1);
  });